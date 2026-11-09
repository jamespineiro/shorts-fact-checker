// Runs in the page's own JavaScript context (MAIN world) so it can talk to
// YouTube's player object. It gets the current Short's captions without any
// external tool (replacing yt-dlp), trying these strategies in order:
//   1. Captions the player itself already downloaded (captured by hooking fetch/XHR).
//   2. Fetching the caption track URL listed in the player response.
//   3. Asking the player to turn captions on, which makes it download them
//      with whatever tokens YouTube requires, then capturing that download.
//   4. Asking YouTube's internal API (Android client) for caption URLs.
(() => {
  if (window.__shortsFactCheckInjected) return;
  window.__shortsFactCheckInjected = true;

  const CS_SOURCE = "shorts-factcheck-cs";
  const MAIN_SOURCE = "shorts-factcheck-main";
  const captured = new Map(); // videoId -> raw caption body
  const waiters = new Map(); // videoId -> [resolve]

  // ---- 1. Capture caption downloads the player makes on its own ----
  function recordCaption(url, body) {
    try {
      if (!body || body.length < 20) return;
      const videoId = new URL(url, location.origin).searchParams.get("v");
      if (!videoId) return;
      captured.set(videoId, body);
      (waiters.get(videoId) || []).forEach((resolve) => resolve(body));
      waiters.delete(videoId);
    } catch {}
  }

  const isTimedText = (url) => typeof url === "string" && url.includes("/api/timedtext");

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const promise = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (isTimedText(url)) {
        promise.then((res) => res.clone().text().then((t) => recordCaption(url, t))).catch(() => {});
      }
    } catch {}
    return promise;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (isTimedText(String(url))) {
      this.addEventListener("load", () => {
        try {
          const body = this.responseType === "" || this.responseType === "text" ? this.responseText : null;
          if (body) recordCaption(String(url), body);
        } catch {}
      });
    }
    return origOpen.apply(this, arguments);
  };

  function waitForCapture(videoId, timeoutMs) {
    if (captured.has(videoId)) return Promise.resolve(captured.get(videoId));
    return new Promise((resolve) => {
      const list = waiters.get(videoId) || [];
      list.push(resolve);
      waiters.set(videoId, list);
      setTimeout(() => resolve(null), timeoutMs);
    });
  }

  // ---- Caption parsing (json3 or XML formats) ----
  function decodeEntities(text) {
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  }

  function parseCaptions(body) {
    if (!body) return "";
    const trimmed = body.trim();
    let parts = [];
    if (trimmed.startsWith("{")) {
      try {
        const data = JSON.parse(trimmed);
        for (const ev of data.events || []) {
          if (!ev.segs) continue;
          parts.push(ev.segs.map((s) => s.utf8 || "").join(""));
        }
      } catch {}
    } else if (trimmed.startsWith("<")) {
      const doc = new DOMParser().parseFromString(trimmed, "text/xml");
      const nodes = doc.querySelectorAll("text, p");
      nodes.forEach((n) => parts.push(decodeEntities(n.textContent || "")));
    }
    return parts
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p && p !== "[Music]")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ---- Player helpers ----
  function findPlayer(videoId) {
    const players = document.querySelectorAll("#shorts-player, .html5-video-player");
    for (const p of players) {
      try {
        if (p.getVideoData?.().video_id === videoId) return p;
      } catch {}
    }
    return null;
  }

  async function waitForPlayer(videoId, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const p = findPlayer(videoId);
      if (p?.getPlayerResponse?.()?.videoDetails?.videoId === videoId) return p;
      await new Promise((r) => setTimeout(r, 250));
    }
    return findPlayer(videoId);
  }

  function pickTrack(tracks) {
    if (!tracks?.length) return null;
    const asr = tracks.find((t) => t.kind === "asr");
    const spokenLang = asr?.languageCode;
    // A human-made track in the spoken language beats auto-captions.
    return (
      tracks.find((t) => t.kind !== "asr" && t.languageCode === spokenLang) ||
      asr ||
      tracks.find((t) => t.languageCode?.startsWith("en")) ||
      tracks[0]
    );
  }

  async function fetchTrack(baseUrl) {
    try {
      const url = new URL(baseUrl, location.origin);
      url.searchParams.set("fmt", "json3");
      const res = await origFetch(url.toString(), { credentials: "include" });
      if (!res.ok) return "";
      return parseCaptions(await res.text());
    } catch {
      return "";
    }
  }

  async function triggerPlayerCaptions(player, track, videoId) {
    try {
      const before = player.getOption?.("captions", "track");
      const wasOn = before && Object.keys(before).length > 0;
      player.loadModule?.("captions");
      player.setOption?.("captions", "track", { languageCode: track.languageCode, kind: track.kind });
      const body = await waitForCapture(videoId, 5000);
      if (!wasOn) {
        player.setOption?.("captions", "track", {});
        player.unloadModule?.("captions");
      }
      return parseCaptions(body);
    } catch {
      return "";
    }
  }

  async function innertubeTracks(videoId) {
    try {
      const key = window.ytcfg?.get?.("INNERTUBE_API_KEY");
      const res = await origFetch(`/youtubei/v1/player?prettyPrint=false${key ? `&key=${key}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "en" } },
          videoId,
        }),
      });
      const data = await res.json();
      return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    } catch {
      return [];
    }
  }

  async function getTranscript(videoId) {
    const player = await waitForPlayer(videoId, 6000);
    const response = player?.getPlayerResponse?.();
    const details = response?.videoDetails?.videoId === videoId ? response.videoDetails : {};
    const meta = {
      title: details.title || document.title.replace(/ - YouTube$/, ""),
      description: details.shortDescription || "",
      channel: details.author || "",
    };

    // 1. Already captured
    let text = parseCaptions(captured.get(videoId));
    if (text) return { ...meta, transcript: text, transcriptSource: "captions" };

    const tracks = details.videoId
      ? response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
      : [];
    const track = pickTrack(tracks);

    // 2. Direct fetch of the listed track
    if (track?.baseUrl) {
      text = await fetchTrack(track.baseUrl);
      if (text) return { ...meta, transcript: text, transcriptSource: "captions" };
    }

    // 3. Let the player download captions itself
    if (player && track) {
      text = await triggerPlayerCaptions(player, track, videoId);
      if (text) return { ...meta, transcript: text, transcriptSource: "captions" };
    }

    // 4. Internal API fallback
    const altTrack = pickTrack(await innertubeTracks(videoId));
    if (altTrack?.baseUrl) {
      text = await fetchTrack(altTrack.baseUrl);
      if (text) return { ...meta, transcript: text, transcriptSource: "captions" };
    }

    return { ...meta, transcript: "", transcriptSource: "none" };
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data?.source !== CS_SOURCE) return;
    const { type, videoId, reqId } = event.data;
    if (type !== "getTranscript" || !/^[\w-]{6,20}$/.test(videoId || "")) return;
    let data;
    try {
      data = await getTranscript(videoId);
    } catch (e) {
      data = { transcript: "", transcriptSource: "none", error: String(e) };
    }
    window.postMessage({ source: MAIN_SOURCE, reqId, videoId, data }, "*");
  });
})();
