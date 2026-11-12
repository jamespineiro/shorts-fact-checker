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

## One-time setup (the person who owns the repo)

The extension needs one free Gemini API key. You add it once and anyone who installs your copy
never has to deal with keys.

1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key** and copy it (it starts with `AIza`). No credit card is needed.
   Don't turn on billing for that Google project, so the key can never cost money.
3. Open `extension/config.json` and paste the key in place of `PASTE_YOUR_FREE_GEMINI_KEY_HERE`:
   ```json
   {
     "geminiApiKey": "AIza..."
   }
   ```

`extension/config.json` is in `.gitignore`, so your key is **not** uploaded to GitHub. Anyone who
downloads the repo gets `config.example.json` instead and needs to add their own key the same way.

## Install in Chrome

1. Get the code: on the GitHub page click **Code → Download ZIP** and unzip it, or `git clone` it.
   Put the folder somewhere permanent. Chrome loads the extension from it every time, so if you
   delete or move it, the extension stops working.
2. Type `chrome://extensions` in the address bar and press Enter.
3. Turn on **Developer mode** (the switch in the top-right corner).
4. Click **Load unpacked** and select the **`extension`** folder, which is the one containing `manifest.json`.
5. Open any Short, for example https://www.youtube.com/shorts/gb24KAy_16I. Refresh any YouTube tab
   that was already open. After about 2 seconds a panel appears in the top-left.

**Tip:** click the puzzle-piece icon 🧩 in Chrome's toolbar and pin **Shorts Fact Checker**.
Clicking its icon opens the settings page.

## Settings

| Setting | What it does |
|---|---|
| Check every Short automatically | If off, a **Check facts** button appears instead. |
| Only check after watching for | Skips Shorts you scroll past quickly (default 2 seconds), so the daily limit lasts longer. |
| Advanced: use your own Gemini key | Overrides the key in `config.json`, for example if the shared daily limit keeps running out. |
| Advanced: Gemini model name | Default `gemini-3.8-flash`. Change it only if Google retires that model. |
| Clear saved results | Results are saved for 7 days so re-watching a Short is free. This clears them. |

## Updating

1. Get the new code into the **same folder** (download the new ZIP or run `git pull`).
   Your `config.json` isn't touched by `git pull`.
2. On `chrome://extensions`, click the **↻ reload** icon on the Shorts Fact Checker card.
3. Refresh any open YouTube tabs.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | You picked the wrong folder. Select the `extension` folder that contains `manifest.json`. |
| No panel appears on Shorts | Refresh the YouTube tab. Make sure the URL contains `/shorts/`, since regular videos aren't checked. |
| "No Gemini API key is set up" | Paste a key into `extension/config.json` (see setup), then click ↻ on `chrome://extensions`. |
| "The fact-checking service rejected the request" | The key is wrong or deleted, or the model name was retired. Check the key, or change the model under Advanced settings. |
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
| `extension/config.json` | Your Gemini key (not uploaded to GitHub). |

There's no build step. Edit any file, then click ↻ on `chrome://extensions` and refresh YouTube.

## Privacy

Captions, titles and descriptions of the Shorts you watch are sent to Google's Gemini API, and
search terms are sent to Wikipedia. On Gemini's free tier, Google may use that content to improve
its products. Nothing else is collected.

## Limitations

- AI can be wrong. The panel says so. Double-check anything important with a trusted source.
- Evidence comes only from Wikipedia article intros, so very recent news often comes back "Can't be confirmed".
- YouTube changes its site often, which can break caption extraction.
- Auto-generated captions have transcription mistakes. The AI is told to read them charitably.
