# Study Cards (Offline Web App)

**Study Cards** is a lightweight, offline-first flashcard web app designed for studying Japanese ↔ English sentence pairs (or any two-line Q/A pairs).  
It runs entirely in the browser with no server or database, using the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for smooth local file handling.

---

## ✨ Features
- **Offline ready**: Installable as a Progressive Web App (PWA) on desktop or Android Chrome.
- **File-based decks**: Each set is a plain `.data` text file stored in a chosen `sentences/` folder.
- **Two-line format**: Each pair is `JP line` + `EN line`, separated by newlines; blank lines separate pairs.
- **Flexible start**: Paste raw pairs into the text box to create a new set on the fly.
- **Progress tracking**: Session state (index, side shown, JP→EN or EN→JP) is saved in `localStorage`.
- **Keyboard shortcuts** (desktop): → Go/reveal, ← Back, R Reverse, S Shuffle.
- **Mobile friendly**: Thumb-sized buttons; works fullscreen when installed as a PWA.

---

## 📂 Folder structure
- `study_cards.html` — the app itself (single-file).
- `sentences/` — folder containing `.data` deck files.
- `manifest.webmanifest` — PWA manifest.
- `sw.js` — service worker for offline caching.

---

## 🚀 Usage

### Desktop (Chrome/Edge)
1. Open `study_cards.html` in your browser.
2. Pick the `sentences/` folder (one-time).
3. Choose a set from the dropdown or paste a new one.
4. Use the toolbar buttons or keyboard shortcuts to study.

### Android (Chrome)
1. Visit the hosted app at `https://<your-username>.github.io/study-cards/`.
2. In the Chrome menu (**⋮**), select **Install app** (or **Add to Home screen**).
3. Launch the installed app; pick your `sentences/` folder once.
4. Study offline thereafter; progress is saved locally.

---

## 📝 Deck file format
Example `.data` file:

```text
NAME: Travel Phrases

おはようございます
Good morning

すみません、道に迷いました
Excuse me, I’m lost

明日の電車は何時ですか
What time is tomorrow’s train?
```

- First line may optionally be `NAME: ...` (used for display).
- Otherwise the filename slug is used.

---

## 🛠 Development
- Pure HTML/CSS/JS (no build system).
- Uses modern browser APIs:
  - File System Access API
  - IndexedDB (to persist folder handle)
  - localStorage (for progress only)
- Service Worker caches static assets for offline use.

---

## ⚠️ Limitations
- Works best on **Chrome/Edge** (desktop + Android). Safari support is limited.
- Folder access must be granted once; Android may sometimes prompt again.
- This is a single-user, local-only app — no sync between devices.

---

## 📄 License
MIT License © 2025