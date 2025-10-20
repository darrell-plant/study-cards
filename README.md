# Study Cards

An offline-first Progressive Web App (PWA) for practising Japanese–English sentence pairs.

## ✨ Features
- 📱 **Installable PWA**: Works offline on mobile (Android/Chrome and iOS/Safari) and desktop via Chrome/Safari (maybe other browsers).
- 🗑 **Delete state**: Clear saved progress for a set (localStorage only).
- 🔀 **Shuffle, Select, Reverse, Back step** controls during practice.
- 🚗 **Car Mode**: Larger fonts, timed reveal, and hands-free operation.
- 🎞 **Scroll Mode**: Continuous large-text marquee display for reading or group viewing.
- 📊 **Progress & Save system**: Tracks your current progress and direction (JP→EN / EN→JP). Explicit Save (💾) allows overwriting or creating new combined sets.
- 👆 **Swipe actions**: Swipe left to remove a card from the current session, swipe right to mark it as *Difficult* (and remove it).
- 🧠 **Review system**: Difficult cards are stored for later review. Access them via the *Review* button on the Home screen.
- 💾 **Export & New Deck**: On the Review screen, use **Export** to copy Difficult cards to the clipboard in Study Cards format, or **New Deck** to instantly create a new deck in memory from Difficult cards.
- 🔄 **Sync library**: Download/update sets from the online `library/` hosted in this repo.
- 💀 **Delete set**: Remove the `.data` file from the chosen folder (with confirmation).
- 💾 **IndexedDB storage**: All decks, groups, and saved progress are stored in browser IndexedDB. No folder access required; works fully offline on all platforms.

## 📝 Deck file format
Each set is a plain text file with extension `.data`:

```text
NAME: Greetings

こんにちは
Hello

ありがとうございます
Thank you

すみません
Excuse me
```

- First line optional `NAME:` header defines the display name.
- Then pairs of lines: **JP line** then **EN line**.
- Separate pairs with one or more blank lines.

## 📚 Library sync
- The app fetches `library/index.json` from GitHub Pages.
- Each file listed in the manifest is downloaded into the browser's IndexedDB.
- Sync policies: add new only, overwrite if changed, or force overwrite all.
- Default is **overwrite if changed**.
- Folder hierarchy (Groups) is now supported and the `Groups` dropdown filters Sets by subfolder.
- Multi-select Cards: select multiple Sets to study or combine; the textarea and session work with all selected files.

## 🛠 Development
- Built as a single-page HTML/JS app (`study_cards.html`).
- Uses:
  - IndexedDB for persistent storage and offline library sync
  - localStorage for progress and session state
  - Service Worker for offline caching
  - Wake Lock API for car and scroll modes
- No build step required.

## 🚀 Installation
- Open [GitHub Pages link](https://darrell-plant.github.io/study-cards).
- In Chrome desktop: **Install app** option appears in the address bar.
- In Chrome Android: menu → *Open in Chrome Browser* -> *Add to home screen* -> *Install app*.

## 🎨 Icons
- `icon-192.png` and `icon-512.png` generated with ImageMagick for PWA manifest.

## 📄 Usage tips
- Tap JP area to increase font, EN area to decrease.
- In Scroll mode, use arrows to move between items, and A/B/R to loop range.
- Car Mode toggled via 🚗/🏠 icon.
- Multi-select Cards via the dropdown to study combined Sets; the header shows combined count (e.g. Combined (2 / 20)).
- Swipe left ⬅️ remove card; Swipe right ➡️ add to Difficult list and remove from session.
- Review Difficult cards anytime: Home → Review → (Export or New Deck).

## 💾 Saving
- Use the 💾 Save button to write changes explicitly.
- Save works for single or multiple selected Sets.
- When combining multiple Sets, Save creates a new file in the current Group.
- When editing a single Set, Save overwrites if the NAME header is unchanged, or creates a new file if renamed.

## 📄 License
MIT License © 2025

Version v1.2.0