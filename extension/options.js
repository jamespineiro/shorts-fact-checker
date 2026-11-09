const DEFAULTS = { apiKey: "", model: "claude-opus-5-5", effort: "medium", autoCheck: true, dwellSeconds: 2 };
const $ = (id) => document.getElementById(id);
const status = (text) => {
  $("status").textContent = text;
  setTimeout(() => ($("status").textContent = ""), 2500);
};

chrome.storage.sync.get(DEFAULTS).then((s) => {
  $("apiKey").value = s.apiKey;
  $("model").value = s.model;
  $("effort").value = s.effort;
  $("autoCheck").checked = s.autoCheck;
  $("dwellSeconds").value = s.dwellSeconds;
});

$("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    apiKey: $("apiKey").value.trim(),
    model: $("model").value,
    effort: $("effort").value,
    autoCheck: $("autoCheck").checked,
    dwellSeconds: Math.min(30, Math.max(0, Number($("dwellSeconds").value) || 0)),
  });
  status("Saved ✓");
});

$("clear").addEventListener("click", async () => {
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith("fc:")));
  status("Cleared ✓");
});
