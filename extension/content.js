// Content script (isolated world): watches for the Short being viewed, gets
// its captions from inject.js, asks the background worker for a fact-check,
// and shows the result in a large, easy-to-read panel.
(() => {
  const CS_SOURCE = "shorts-factcheck-cs";
  const MAIN_SOURCE = "shorts-factcheck-main";

  const VERDICTS = {
    accurate: { icon: "✅", label: "Looks accurate", tone: "good" },
    mostly_accurate: { icon: "✅", label: "Mostly accurate", tone: "good" },
    misleading: { icon: "⚠️", label: "Misleading", tone: "warn" },
    false: { icon: "❌", label: "False information", tone: "bad" },
    unverifiable: { icon: "❔", label: "Can't be confirmed", tone: "neutral" },
    no_claims: { icon: "💬", label: "No facts to check", tone: "neutral" },
  };
  const CLAIM_VERDICTS = {
    true: { icon: "✅", label: "True" },
    mostly_true: { icon: "✅", label: "Mostly true" },
    misleading: { icon: "⚠️", label: "Misleading" },
    false: { icon: "❌", label: "False" },
    unverifiable: { icon: "❔", label: "Unconfirmed" },
  };

  let currentVideoId = null;
  let dwellTimer = null;
  let settings = { autoCheck: true, dwellSeconds: 2 };
  let expanded = false;

  // ---------- UI ----------
  const host = document.createElement("div");
  host.id = "shorts-factcheck-host";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed; top: 72px; left: 16px; z-index: 2147483647;
        width: min(380px, calc(100vw - 32px)); max-height: calc(100vh - 96px); overflow: auto;
        font: 17px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: #111; background: #fff; border-radius: 14px; border: 3px solid #999;
        box-shadow: 0 6px 24px rgba(0,0,0,.35);
      }
      .panel[hidden] { display: none; }
      .panel.good { border-color: #1e8e3e; }
      .panel.warn { border-color: #e37400; }
      .panel.bad { border-color: #d93025; }
      .head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; }
      .icon { font-size: 30px; line-height: 1; }
      .title { font-weight: 700; font-size: 20px; }
      .good .title { color: #137333; } .warn .title { color: #b06000; } .bad .title { color: #c5221f; }
      .headline { font-size: 16px; color: #333; }
      .grow { flex: 1; min-width: 0; }
      .toggle { font-size: 14px; color: #1a73e8; white-space: nowrap; }
      .body { padding: 0 14px 14px; border-top: 1px solid #eee; }
      .body[hidden] { display: none; }
      .summary { margin: 12px 0; }
      .claim { margin: 10px 0; padding: 10px; background: #f6f6f6; border-radius: 10px; }
      .claim-v { font-weight: 700; }
      .claim-text { font-style: italic; }
      .sources { margin: 6px 0 0; padding-left: 20px; font-size: 15px; }
      a { color: #1a73e8; }
      .note { font-size: 13px; color: #666; margin-top: 10px; }
      button {
        font: inherit; font-size: 16px; padding: 8px 14px; margin-top: 8px; margin-right: 6px;
        border-radius: 8px; border: 1px solid #1a73e8; background: #1a73e8; color: #fff; cursor: pointer;
      }
      button.secondary { background: #fff; color: #1a73e8; }
      .spinner {
        width: 26px; height: 26px; border: 4px solid #ddd; border-top-color: #1a73e8;
        border-radius: 50%; animation: spin 1s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-color-scheme: dark) {
        .panel { background: #202124; color: #e8eaed; }
        .headline { color: #ccc; } .claim { background: #2d2e31; } .note { color: #aaa; }
        .body { border-top-color: #3c4043; } a, .toggle { color: #8ab4f8; }
        .good .title { color: #81c995; } .warn .title { color: #fdd663; } .bad .title { color: #f28b82; }
        button.secondary { background: #202124; color: #8ab4f8; border-color: #8ab4f8; }
      }
    </style>
    <div class="panel" hidden role="status" aria-live="polite">
      <div class="head"></div>
      <div class="body" hidden></div>
    </div>`;
  const panel = shadow.querySelector(".panel");
  const head = shadow.querySelector(".head");
  const body = shadow.querySelector(".body");

  head.addEventListener("click", () => {
    if (!head.dataset.expandable) return;
    expanded = !expanded;
    body.hidden = !expanded;
    const t = head.querySelector(".toggle");
    if (t) t.textContent = expanded ? "Hide ▲" : "Why? ▼";
  });

  function mount() {
    if (!host.isConnected && document.documentElement) document.documentElement.appendChild(host);
  }

  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const safeUrl = (u) => {
    try {
      const url = new URL(u);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  };

  function show({ tone = "", headHtml, bodyHtml = "", expandable = false, open = false }) {
    mount();
    panel.hidden = false;
    panel.className = `panel ${tone}`;
    head.innerHTML = headHtml + (expandable ? `<span class="toggle">${open ? "Hide ▲" : "Why? ▼"}</span>` : "");
    head.dataset.expandable = expandable ? "1" : "";
    body.innerHTML = bodyHtml;
    expanded = expandable && open;
    body.hidden = !expanded && expandable;
    if (!expandable) body.hidden = !bodyHtml;
    body.querySelectorAll("[data-action]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "recheck") checkVideo(currentVideoId, true);
        if (action === "check") checkVideo(currentVideoId, false);
        if (action === "options") chrome.runtime.sendMessage({ type: "openOptions" });
        if (action === "dismiss") panel.hidden = true;
      })
    );
  }

  const hide = () => (panel.hidden = true);

  function showChecking() {
    show({
      headHtml: `<div class="spinner"></div><div class="grow"><div class="title">Checking facts…</div>
        <div class="headline">Listening to what this video claims.</div></div>`,
    });
  }

  function showManualPrompt() {
    show({
      headHtml: `<div class="icon">🔎</div><div class="grow"><div class="title">Fact-check this video?</div></div>`,
      bodyHtml: `<button data-action="check">Check facts</button>`,
    });
  }

  function showError(error) {
    const needsSetup = error?.code === "SETUP";
    show({
      tone: "neutral",
      headHtml: `<div class="icon">ℹ️</div><div class="grow"><div class="title">Couldn't check this video</div></div>`,
      bodyHtml: `<p>${escapeHtml(error?.message || "Something went wrong.")}</p>
        ${needsSetup ? `<button data-action="options">Open settings</button>` : `<button data-action="recheck">Try again</button>`}`,
    });
  }

  function showResult(result) {
    const v = VERDICTS[result.overall] || VERDICTS.unverifiable;
    const claimsHtml = (result.claims || [])
      .map((c) => {
        const cv = CLAIM_VERDICTS[c.verdict] || CLAIM_VERDICTS.unverifiable;
        const sources = (c.sources || [])
          .map((s) => ({ ...s, url: safeUrl(s.url) }))
          .filter((s) => s.url)
          .map((s) => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title || s.url)}</a></li>`)
          .join("");
        return `<div class="claim">
          <div class="claim-v">${cv.icon} ${cv.label}</div>
          <div class="claim-text">“${escapeHtml(c.claim)}”</div>
          <div>${escapeHtml(c.explanation)}</div>
          ${sources ? `<ul class="sources">${sources}</ul>` : ""}
        </div>`;
      })
      .join("");
    const noTranscript =
      result.transcriptSource === "none"
        ? `<div class="note">No captions were available, so only the title and description were checked.</div>`
        : "";
    const warn = v.tone === "warn" || v.tone === "bad";
    show({
      tone: v.tone,
      headHtml: `<div class="icon">${v.icon}</div><div class="grow"><div class="title">${v.label}</div>
        <div class="headline">${escapeHtml(result.headline)}</div></div>`,
      bodyHtml: `<p class="summary">${escapeHtml(result.summary)}</p>${claimsHtml}${noTranscript}
        <div class="note">Checked automatically by Google's Gemini AI against Wikipedia. AI can make mistakes — when something matters, check with a trusted source.</div>
        <button class="secondary" data-action="recheck">Check again</button>
        <button class="secondary" data-action="dismiss">Close</button>`,
      expandable: true,
      open: warn, // warnings open automatically so they can't be missed
    });
  }

  // ---------- Transcript request to inject.js ----------
  function requestTranscript(videoId) {
    return new Promise((resolve) => {
      const reqId = Math.random().toString(36).slice(2);
      const onMsg = (event) => {
        if (event.source !== window || event.data?.source !== MAIN_SOURCE || event.data.reqId !== reqId) return;
        window.removeEventListener("message", onMsg);
        clearTimeout(timer);
        resolve(event.data.data);
      };
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMsg);
        resolve({ transcript: "", transcriptSource: "none", title: document.title.replace(/ - YouTube$/, "") });
      }, 20000);
      window.addEventListener("message", onMsg);
      window.postMessage({ source: CS_SOURCE, type: "getTranscript", videoId, reqId }, "*");
    });
  }

  // ---------- Main flow ----------
  async function checkVideo(videoId, force) {
    if (!videoId) return;
    showChecking();
    const t = await requestTranscript(videoId);
    if (videoId !== currentVideoId) return;
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: "factCheck",
        force,
        language: (navigator.language || "en").split("-")[0],
        payload: { videoId, ...t },
      });
    } catch (e) {
      response = { ok: false, error: { message: "The extension was updated. Please reload this page." } };
    }
    if (videoId !== currentVideoId) return; // user scrolled on; result is cached for later
    if (response?.ok) showResult(response.result);
    else showError(response?.error);
  }

  function shortsIdFromUrl() {
    const m = location.pathname.match(/^\/shorts\/([\w-]{6,20})/);
    return m ? m[1] : null;
  }

  async function onLocationChange() {
    const id = shortsIdFromUrl();
    if (id === currentVideoId) return;
    currentVideoId = id;
    clearTimeout(dwellTimer);
    if (!id) return hide();

    try {
      settings = await chrome.runtime.sendMessage({ type: "getSettings" });
    } catch {}
    if (!settings.autoCheck) return showManualPrompt();

    hide();
    // Wait until the viewer actually stays on a Short before spending an API call.
    dwellTimer = setTimeout(() => {
      if (shortsIdFromUrl() === id) checkVideo(id, false);
    }, Math.max(0, Number(settings.dwellSeconds) || 0) * 1000);
  }

  // YouTube is a single-page app: watch both its navigation event and the URL.
  document.addEventListener("yt-navigate-finish", onLocationChange);
  setInterval(onLocationChange, 700);
  onLocationChange();
})();
