const DEFAULTS = { geminiKey: "", geminiModel: "gemini-3.8-flash", autoCheck: true, dwellSeconds: 2 };
const $ = (id) => document.getElementById(id);
const status = (text) => {
  $("status").textContent = text;
  setTimeout(() => ($("status").textContent = ""), 2500);
};

chrome.storage.sync.get(DEFAULTS).then((s) => {
  $("geminiKey").value = s.geminiKey;
  $("geminiModel").value = s.geminiModel;
  $("autoCheck").checked = s.autoCheck;
  $("dwellSeconds").value = s.dwellSeconds;
});

$("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    geminiKey: $("geminiKey").value.trim(),
    geminiModel: $("geminiModel").value.trim() || DEFAULTS.geminiModel,
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
