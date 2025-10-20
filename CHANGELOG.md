# Changelog

All notable changes to **Study Cards** will be documented in this file.

## [Unreleased]
### Added
-

### Changed
-

### Fixed
-

## [v1.2.1] — 2025-10-20
### Added
- Large Pause/Continue button in car mode session screen
- Consistent session restore on app reload

### Changed
- Removed support for File Sytem Access api (fs-driver) in favour of IndexedDB

### Fixed
- UI labelling/terminolgy inconsistencies

---
## [v1.1.2] — 2025-10-17
### Fixed
- **Folder reconnect** (FS driver): no longer re-opens the folder picker when permission is already granted; the previously granted `FileSystemDirectoryHandle` is reused.

### Notes
- No data migrations. Behavior unchanged except the reconnect UX.
- Consider bumping the service worker cache name in `sw.js` to force an immediate PWA update.

---

## [v1.1.1] — 2025-10-17
### Changed
- Hide **FS-only** hints/buttons when running in **IDB** mode.
- UI polish and minor consistency/accessibility tweaks.

### Removed
- Leftover debug/safety-net code and duplicate handlers.

### Notes
- No breaking changes; same behavior.
- SW cache bump recommended to propagate assets cleanly.

---

## [v1.1.0] — 2025-10-16
### Added
- **IndexedDB driver (read-only)** for environments without File System Access API (iOS/Safari, Fire/Silk).
- **Dual-driver selection**: auto-choose FS on Chrome/Android/Desktop and IDB elsewhere (override with `?driver=fs|idb`).
- **Library sync** from `library/index.json` into IDB (download/cached for offline).
- **PWA-ready**: installable; offline caching via service worker.

### Changed
- Home screen dynamically hides FS-only UI when in IDB mode.

### Known limitations (at 1.1.0)
- IDB path initially read-only (write/delete arrived later).
- Wake Lock unsupported on iOS/Safari.

---

## [v1.0.0] — 2025-10-16
### Added
- **Stable File System Access (FS) version** for Chrome/Android/Desktop:
  - Choose a **Library** folder and sync decks from `library/index.json`.
  - **Groups/Cards** selects (subfolders and `.data` files).
  - **Study session** mode with:
    - JP ⇄ EN prompt flips, shuffle, back, **timer** with countdown.
    - **Car mode**: larger fonts, single-panel behavior at large sizes, screen **Wake Lock** (where supported).
    - Swipe gestures (mobile) to **remove** current card or **mark as Difficult** and remove.
  - **Scroll** (marquee) mode:
    - Adjustable **font** and **speed**, previous/next, **A/B** range loop, per-item **repeat counter**, item **index** badge.
  - **Review** screen:
    - Shows saved **Difficult** cards; **Export** to clipboard in Study Cards format; **New Deck** builds a deck from Difficult.
  - **Multi-select Cards** on the home screen to combine multiple decks into a single session or scroll run.
  - **Explicit Save** button: save to existing file (unchanged header) or **Save As** (changed `NAME:` header → new file).
  - **Delete**: remove selected set files (FS driver) and clear saved state.

### Notes
- Baseline for subsequent IDB work and cross-platform PWA support.

---

## Versioning
This project uses **Semantic Versioning**: MAJOR.MINOR.PATCH.

[v1.2.1]: https://github.com/darrell-plant/study-cards/releases/tag/v1.2.1
[v1.1.2]: https://github.com/darrell-plant/study-cards/releases/tag/v1.1.2
[v1.1.1]: https://github.com/darrell-plant/study-cards/releases/tag/v1.1.1
[v1.1.0]: https://github.com/darrell-plant/study-cards/releases/tag/v1.1.0
[v1.0.0]: https://github.com/darrell-plant/study-cards/releases/tag/v1.0.0
