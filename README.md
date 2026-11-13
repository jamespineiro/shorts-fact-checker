# Shorts Fact Checker

A free Chrome extension that fact-checks YouTube Shorts while you watch. It reads the Short's
auto-generated captions, checks the claims with Google's Gemini AI and Wikipedia, and shows a
large ✅ / ⚠️ / ❌ panel in the top-left corner of the page. Warnings open on their own with a
plain-language explanation and links to sources.

It was built to help older viewers avoid misinformation, like miracle cures, scams, or
"the Earth is flat".

> **It's free, but there's a daily limit.** It runs on Gemini's free tier, which has a daily
> request limit shared by everyone using the same key. Each Short uses 2 requests. If the limit runs
> out, the panel says "Today's free fact-checks are used up", and it resets the next day.

## How it works

It doesn't use yt-dlp or any server. Everything happens in your browser:

1. When you're watching a Short, YouTube's video player already has the subtitles (the words people say), so the extension just quietly asks the player for them, like peeking at the script.
2. If the player hasn't loaded the subtitles yet, the extension briefly turns captions on so the player fetches them, then grabs them.
3. Once you've watched for 2 seconds, it sends those words to Gemini and asks, "What facts does this video claim?"
4. The extension looks each claim up on Wikipedia, and Gemini compares them, then answers with ✅ true, ⚠️ misleading, or ❌ false, plus a simple explanation and links.
5. The extension shows that answer in a big box in the corner and remembers it, so the same Short is never checked twice.

## Install

There are two ways to get it. If you have the download link from the project submission, use the first one. It's ready to go with no key needed.

### If you have the download link (no setup)

1. Open the download link from the project submission and download `shorts-fact-checker.zip`,
   then unzip it. You'll get a folder called `shorts-fact-checker`.
   Put it somewhere permanent, like Documents. Chrome loads the extension from that folder every
   time, so if you delete or move it, the extension stops working.
2. Type `chrome://extensions` in Chrome's address bar and press Enter.
3. Turn on **Developer mode** (the switch in the top-right corner).
4. Click **Load unpacked** and select the `shorts-fact-checker` folder.
5. Open any Short, for example https://www.youtube.com/shorts/gb24KAy_16I. Refresh any YouTube tab
   that was already open. After about 2 seconds a panel appears in the top-left.

The same steps are in `INSTALL.txt` inside the folder. Please don't post the ZIP or its link publicly, because it contains my free API key.

### If you're downloading from GitHub (needs a free key)

The API key isn't on GitHub, so you need your own. It's free and takes a minute:

1. Click **Code → Download ZIP** on this page and unzip it, or `git clone` it.
2. Get a free key at https://aistudio.google.com/apikey (sign in with Google, then **Create API key**).
   No credit card is needed.
3. In the `extension` folder, make a copy of `config.example.json` named `config.json` and paste
   your key in place of `PASTE_YOUR_FREE_GEMINI_KEY_HERE`.
4. Follow steps 2–5 above, but select the **`extension`** folder (the one containing `manifest.json`).

**Tip:** click the puzzle-piece icon 🧩 in Chrome's toolbar and pin **Shorts Fact Checker**.
Clicking its icon opens the settings page.

## Settings

| Setting | What it does |
|---|---|
| Check every Short automatically | If off, a **Check facts** button appears instead. |
| Only check after watching for | Skips Shorts you scroll past quickly (default 2 seconds), so the daily limit lasts longer. |
| Advanced: use your own Gemini key | Optional. Overrides the key in `config.json`, for example if the shared daily limit keeps running out. |
| Advanced: Gemini model name | Default `gemini-3.5-flash-lite`. If it's busy or out of quota, the extension automatically retries on `gemini-3.6-flash`. Change it only if Google retires that model. |
| Clear saved results | Results are saved for 7 days so re-watching a Short is free. This clears them. |

## Updating

1. Get the new code into the **same folder** (download the new ZIP or run `git pull`).
2. On `chrome://extensions`, click the **↻ reload** icon on the Shorts Fact Checker card.
3. Refresh any open YouTube tabs.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | You picked the wrong folder. Select the `extension` folder that contains `manifest.json`. |
| No panel appears on Shorts | Refresh the YouTube tab. Make sure the URL contains `/shorts/`, since regular videos aren't checked. |
| "No Gemini API key is set up" | There's no `config.json`. Get the ZIP from me, or make your own `config.json` (see Install). Then click ↻ on `chrome://extensions`. |
| "The fact-checking service rejected the request" | The key was probably turned off, or the model was retired. Ask me for a new ZIP, or add your own free key from https://aistudio.google.com/apikey under Advanced settings. |
| "Today's free fact-checks are used up" | The free daily limit ran out. Wait until tomorrow, or add your own key under Advanced settings. |
| "No captions were available" | Some Shorts have no captions. Only the title and description get checked. |
| Something else is broken | On `chrome://extensions`, click **service worker** on the extension's card and check the Console. Also check the YouTube tab's DevTools console (F12). |

## Files

| File | What it is |
|---|---|
| `extension/manifest.json` | Tells Chrome what the extension is and what it's allowed to access. |
| `extension/inject.js` | Runs inside the YouTube page and gets the captions from YouTube's player. |
| `extension/content.js` | Notices when you move to a new Short and draws the result panel. |
| `extension/background.js` | Asks Gemini for the claims, looks them up on Wikipedia, asks Gemini for verdicts, and caches results. |
| `extension/options.html`, `options.js` | The settings page. |
| `extension/config.json` | The Gemini key. Not on GitHub; it's only in the ZIP. |
| `extension/config.example.json` | Template for making your own `config.json`. |
| `make-zip.sh` | Builds the ready-to-use ZIP (with the key) to send to people. |
| `extension/INSTALL.txt` | Short install steps included in the ZIP. |

There's no build step. Edit any file, then click ↻ on `chrome://extensions` and refresh YouTube.

## Sharing it (for me, the repo owner)

The key lives only in `extension/config.json` on my computer, which is in `.gitignore`. Google
automatically deletes Gemini keys it finds on public GitHub, so it must never be committed.
To give someone a working copy:

```bash
./make-zip.sh   # builds dist/shorts-fact-checker.zip with the key included
```

Upload that ZIP to Google Drive, set sharing to **Anyone with the link**, and give the link to
people directly (for example in the project submission). Never put the ZIP or its link on GitHub.

## Privacy

Captions, titles and descriptions of the Shorts you watch are sent to Google's Gemini API, and
search terms are sent to Wikipedia. On Gemini's free tier, Google may use that content to improve
its products. Nothing else is collected.

## Limitations

- AI can be wrong. The panel says so. Double-check anything important with a trusted source.
- Evidence comes only from Wikipedia article intros, so very recent news often comes back "Can't be confirmed".
- YouTube changes its site often, which can break caption extraction.
- Auto-generated captions have transcription mistakes. The AI is told to read them charitably.
