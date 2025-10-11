# Study Cards

An offline-first Progressive Web App (PWA) for practising Japanese–English sentence pairs.

## ✨ Features
- 📱 **Installable PWA**: Works offline on mobile and desktop via Chrome.
- 📂 **Folder access**: Choose a local folder to store your `.data` files (plain text sentence pairs).
- 🔌 **Reconnect**: Reconnect to a previously chosen folder after restart.
- 🔄 **Sync library**: Download/update sets from the online `library/` hosted in this repo.
- 🗑 **Delete state**: Clear saved progress for a set (localStorage only).
- 💀 **Delete set**: Remove the `.data` file from the chosen folder (with confirmation).
- 🔀 **Shuffle, Select, Reverse, Back step** controls during practice.
- 🚗 **Car Mode**: Larger fonts, timed reveal, and hands-free operation.
- 🎞 **Scroll Mode**: Continuous large-text marquee display for reading or group viewing.
- 📊 **Progress tracking**: Saves your place and which side (JP/EN) is prompt.

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
- Each file listed in the manifest is downloaded into the chosen folder.
- Sync policies: add new only, overwrite if changed, or force overwrite all.
- Default is **overwrite if changed**.
- Folder hierarchy (Groups) is now supported and the `Groups` dropdown filters Sets by subfolder.

## 🔐 Permissions
- Chrome will prompt to grant folder access.
- On Android, reconnecting may require tapping the 🔌 icon due to stricter permission rules.
- On desktop, folder permission is usually remembered.

## 🛠 Development
- Built as a single-page HTML/JS app (`study_cards.html`).
- Uses:
  - File System Access API (Chrome)
  - IndexedDB for persisting folder handles
  - localStorage for saving progress
  - Service Worker for offline caching
  - Wake Lock API for car and scroll modes
- No build step required.

## 🚀 Installation
- Open [GitHub Pages link](https://darrell-plant.github.io/study-cards/study_cards.html).
- In Chrome desktop: **Install app** option appears in the address bar.
- In Chrome Android: menu → *Open in Chrome Browser* -> *Add to home screen* -> *Install app*.

## 🎨 Icons
- `icon-192.png` and `icon-512.png` generated with ImageMagick for PWA manifest.

## 📄 Usage tips
- Tap JP area to increase font, EN area to decrease.
- In Scroll mode, use arrows to move between items, and A/B/R to loop range.
- Car Mode toggled via 🚗/🏠 icon.

## 📄 License
MIT License © 2025