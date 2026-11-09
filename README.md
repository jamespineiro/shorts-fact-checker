# Shorts Fact Checker

> ⚠️ **Heads up: this is kinda expensive. You probably shouldn't actually use it day to day.**
> Every Short you watch for more than 2 seconds is sent to Claude Opus 5.5 with web search.
> That's an estimated **5–15 cents per Short** (rough guess, not measured). Scroll through 100 Shorts and
> you could spend **$5–15**. Scrolling Shorts is basically designed to make you watch a lot of them, so
> the costs add up fast. If you try it anyway, set a spending cap in the Anthropic Console (see
> [Get an API key](#get-an-api-key)), switch to the cheaper Haiku model in settings, or turn off
> automatic checking.

A Chrome extension that fact-checks YouTube Shorts while you watch. It reads the Short's
auto-generated captions, has Claude (with live web search) check the claims, and shows a large
✅ / ⚠️ / ❌ panel in the top-left corner of the page. Warnings open on their own with a
plain-language explanation and links to sources.

It was built to help older viewers avoid misinformation, like miracle cures, scams, or
"the Earth is flat".

<!-- Optional: add a screenshot here, e.g. ![Screenshot](docs/screenshot.png) -->

## What you need

- **Google Chrome** (or another Chromium browser like Edge or Brave)
- **An Anthropic API key**: see [Get an API key](#get-an-api-key) below. Each check costs a
  few cents of API credit.

You do **not** need Node.js, npm, or any coding tools to use the extension.

## Install

### 1. Download the code

**Option A: download a ZIP (easiest)**
1. On this GitHub page, click the green **Code** button → **Download ZIP**.
2. Unzip it. You'll get a folder like `CS420Project-main`.
3. Put that folder somewhere permanent, like your Documents folder. Chrome loads the extension
   from that folder every time, so if you delete or move it, the extension stops working.

**Option B: git clone**
```bash
git clone https://github.com/<your-username>/<repo-name>.git
```

### 2. Load it into Chrome

1. Type `chrome://extensions` in the address bar and press Enter.
2. Turn on **Developer mode** (the switch in the top-right corner).
3. Click **Load unpacked**.
4. Select the **`extension`** folder *inside* the downloaded folder, not the top-level folder.
   The right folder is the one that contains `manifest.json`.
5. **Shorts Fact Checker** should now appear in your extensions list, and its settings page opens
   automatically.

**Tip:** click the puzzle-piece icon 🧩 in Chrome's toolbar and pin **Shorts Fact Checker** so its
icon is always visible. Clicking that icon opens the settings page.

### 3. Add your API key

1. On the settings page, paste your API key (it starts with `sk-ant-`) into **Anthropic API key**.
2. Click **Save**. You should see "Saved ✓".

### 4. Try it

1. Open any Short, for example https://www.youtube.com/shorts/gb24KAy_16I
   (refresh any YouTube tab that was already open before you installed).
2. After about 2 seconds a panel appears in the top-left saying **Checking facts…**, followed by the result.
3. Click the panel to show or hide the explanation and sources.

## Get an API key

1. Go to https://console.anthropic.com and sign in or create an account. This is separate from a
   Claude Pro/Max subscription.
2. Add credit under **Settings → Billing**. $5 covers a lot of Shorts.
3. Go to **Settings → API Keys** and click **Create Key**.
4. Copy the key right away, since it's only shown once.
5. Optional but recommended: set a monthly spending cap under **Settings → Limits**.

**Keep your key private.** Don't paste it into GitHub, Discord, or the group chat. Anyone who has
it can spend your credit. Everyone should use their own key.

## Settings

| Setting | What it does |
|---|---|
| AI model | Opus 5.5 is the most accurate (default). Sonnet 5.5 and Haiku 5.5 are faster and cheaper. |
| How hard to think | Low / Medium / High. Higher is more thorough but slower and costs more. |
| Check every Short automatically | If off, a **Check facts** button appears instead. |
| Only check after watching for | Skips Shorts you scroll past quickly (default 2 seconds), which saves money. |
| Clear saved results | Results are saved for 7 days so re-watching a Short is free. This clears them. |

## Updating

When new code is pushed:
1. Download the new ZIP (or run `git pull`) into the **same folder**.
2. Go to `chrome://extensions` and click the **↻ reload** icon on the Shorts Fact Checker card.
3. Refresh any open YouTube tabs.

Your API key and settings are kept.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Manifest file is missing or unreadable" | You picked the wrong folder. Select the `extension` folder that contains `manifest.json`. |
| No panel appears on Shorts | Refresh the YouTube tab. Make sure the URL contains `/shorts/`, since regular videos aren't checked. |
| "Add your Anthropic API key…" | Open the settings page, paste your key, and click **Save**. |
| "Your Anthropic API key was rejected" | The key was copied wrong or deleted. Create a new one in the Console. |
| "Fact-check service error (400)" | Often means your account is out of credit. Check **Billing** in the Console. |
| Stuck on "Checking facts…" | Click **Check again**. If it keeps happening, see the next row. |
| Something else is broken | On `chrome://extensions`, click **service worker** on the extension's card and check the Console for errors. Also check the YouTube tab's DevTools console (F12). Include those errors when you report the problem. |
| "No captions were available" | Some Shorts have no captions. Only the title and description get checked. |

## How it works

1. **`extension/inject.js`** runs inside the YouTube page and gets captions from YouTube's own
   player, so no yt-dlp or server is needed. It tries, in order: captions the player already
   downloaded → the caption track URL → turning captions on so the player fetches them →
   YouTube's internal API. If a Short has no captions, it uses the title and description.
2. **`extension/content.js`** notices when you move to a new Short, waits until you've watched for
   a couple of seconds, and draws the result panel.
3. **`src/background.js`** (built into `extension/background.js`) sends the captions to
   Claude Opus 5.5 with web search turned on. Claude returns a structured verdict through a
   `report_verdict` tool. Results are cached per video for 7 days.

Your API key is stored in Chrome's extension storage and sent only to `api.anthropic.com`.
Captions and video details are sent to Anthropic for checking.

## For developers

You only need this if you change `src/background.js`. The other files in `extension/` are plain
JavaScript, so you can edit them and reload the extension.

```bash
npm install
npm run build   # bundles src/background.js + the Anthropic SDK → extension/background.js
npm run watch   # rebuilds automatically on save
```

Commit the rebuilt `extension/background.js` so others can use the extension without building it.
After any change, click ↻ on the extension's card in `chrome://extensions` and refresh YouTube.

## Limitations

- AI can be wrong. The panel says so. Double-check anything important with a trusted source.
- YouTube changes its site often, which can break caption extraction.
- Auto-generated captions have transcription mistakes. The AI is told to read them charitably.
