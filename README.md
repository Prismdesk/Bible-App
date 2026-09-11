# Bible — personal PWA

A small, installable, offline-first Bible reader. No backend, no accounts,
no analytics — everything (highlights, notes, favorites) is stored on your
device with IndexedDB.

## 1. Add your Bible text

Bible text lives in one file per book at the **root of the project** —
`gen.js` for Genesis, `exo.js` for Exodus, and so on — plus `meta.js`
for the list of versions. (Everything is flat, no subfolder — browser
uploads to GitHub/Netlify often drop folder structure when files are
selected individually instead of dragged in as a whole folder, so this
keeps things simple.) Open the file
for whichever book you want in any text editor; the comments at the top
of each file explain the format for chapters, verses, section titles and
footnotes, and a sample of Genesis 1 and John 3 (World English Bible +
King James Version, both public domain) is already filled in so you can
see it working and try every feature immediately.

You do not need any build tools — it's plain JavaScript. Just save the
file after editing.

### Section headings per version

Section headings (the bold titles like "The Creation" above a group of
verses) can have different wording per version, the same way verse text
does:

```json
{
  "beforeVerse": 1,
  "title": { "web": "The Creation", "kjv": "The Beginning" },
  "reference": "John 1:1–5; Hebrews 11:1–3"
}
```

You don't have to fill in every version — if the version you're reading
in doesn't have its own title, the app falls back to whichever one is
listed first. `reference` (the cross-reference line) isn't per-version.

## 2. Try it locally

Because the app uses a service worker, it needs to be served over
`http://` or `https://` rather than opened directly as a `file://` — most
phone/desktop browsers block service workers on `file://`.

The easiest way, from inside this folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000` (or `http://<your-computer's-LAN-IP>:8000`
from your phone, while on the same Wi-Fi).

Any other static file server works too (e.g. `npx serve`).

## 3. Install it

**Android (Chrome):** open the site, tap the menu (⋮) → **Install app** /
**Add to Home screen**.

**iOS/iPadOS (Safari):** open the site, tap the Share icon → **Add to Home
Screen**. Safari is required — installing from Chrome on iOS isn't
supported by iOS itself.

**Desktop (Chrome/Edge):** an install icon appears in the address bar.

Once installed it opens full-screen with the icon you provided, and keeps
working offline (the app shell and your Bible text are cached by the
service worker on first load).

## 4. Using the app

- **Read tab** — pick a testament, book and chapter, and switch versions
  with the pill row.
- **Highlight** — tap a verse number to cycle it through gold → green →
  blue → pink → off. Select any run of text (even across two verses) to
  bring up the same color picker for just that phrase.
- **Notes** — tap "Note" on the selection popup to write a note linked to
  that verse/phrase, or use the **+** button on the Notes tab for a
  free-standing note (e.g. sermon notes) with basic formatting: heading,
  bold, italic, bullets. Pin important notes to keep them at the top;
  otherwise notes sort by newest first.
- **Favorites** — tap "Favorite" on the selection popup to save a verse or
  phrase; the Favorites tab jumps you back to it in context.
- **Settings** — switch Light/Dark/System theme, set your default
  version, and there's a one-tap way to erase all your highlights/notes/
  favorites if you ever want a clean slate.

## 5. Updating your Bible text later

Just edit the relevant book file(s) again and refresh the app
(pull down to refresh, or close and reopen it). No need to reinstall.

## File overview

```
.nojekyll                  Tells GitHub Pages to skip Jekyll processing (required)
index.html                 App shell / markup
styles.css                 All styling, incl. light & dark themes
db.js                      IndexedDB wrapper (highlights, notes, favorites, settings)
data-loader.js             Loads the book files in order, then app.js
meta.js                     List of versions + canonical book order
<bookId>.js                <-- YOU EDIT THESE to add Bible text (one file per book, e.g. gen.js)
app.js                     App logic
manifest.json              PWA install metadata
service-worker.js          Offline caching
icon-192.png / icon-512.png            App icon (from your logo)
icon-maskable-192.png / -512.png       Android adaptive-icon safe versions
apple-touch-icon.png                   iOS home screen icon
favicon-16.png / favicon-32.png        Browser tab icon
```
