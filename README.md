# Nihongo Study Cards

This folder contains two simple tools for practicing Japanese ↔ English sentence pairs.  
Both follow the same data format:  

```
NAME: Set Name (this header is optional; if omitted a new **Unnamed N** deck is created.)

JP text
EN text

JP text
EN text

...
```

(one pair = Japanese line, English line, then one or more empty lines)

---


## `study-cards.html`

# Study Cards — Offline Web App

A tiny single-file SPA for quickly preparing and practising JP⇄EN line-pair “study cards”. Optimised for fast, offline use.

## What’s in this build (v2.8)

- **Named decks** with **case‑insensitive** canonical keys; display names are **Title‑Case** (e.g. `miXed CaSe` → **Mixed Case**).
- **Natural‑sorted** deck selector (so “Unnamed 2” comes before “Unnamed 10”). “(none)” is always first.
- **Delete** button (🗑) removes the selected deck.
- **Japanese → English** is the default prompt side, with a **Reverse** toggle (or **R**).
- **Go / Back** flow with **Back half‑step**: if an answer is visible, **Back** re‑blurs the answer instead of moving to the previous pair.
- **Shuffle** button (or **S**) plus a tiny toast (“Shuffled!” / “Deleted set …”).
- **Progress persistence** per deck (resume where you left off).
- `NAME:` header is **case‑insensitive on input**, but always **saved/shown as uppercase** `NAME: …`.
- **Unnamed decks** auto‑number from **Unnamed 1**, **Unnamed 2**, …
- Accent **colour** updated to `#3dba50`.

## Quick start

1. Open the HTML file in your browser.
2. Paste pairs using this format (one blank line between each pair):
   ```
   NAME: BJJ Grading Phrases
   受け身は大丈夫ですか？
   Are your breakfalls okay?

   技の流れを確認しましょう。
   Let’s check the sequence of the technique.
   ```
   - `NAME:` header is optional; if omitted a new **Unnamed N** deck is created.
3. Press **Start session**.
4. Use **Go** to reveal answers and advance; **Back** to re‑blur or step back; **Shuffle** to reshuffle the deck.

## Keyboard shortcuts (during a session)

- **→** Go
- **←** Back (half‑step behaviour)
- **R** Reverse prompt/answer sides
- **S** Shuffle

## Deck management

- Use the **Saved sets** selector to load a deck (lists Title‑Case names in natural order).
- Click **🗑** to delete the selected deck (no confirmation).
- “Load new set” returns to the start page (does **not** delete anything).

## Persistence & privacy

- Decks and progress are stored in your browser’s **localStorage** (per device and browser profile).
- Clearing site data or using a different browser/device will remove/lose decks.
- No network requests; everything runs locally.

## Notes for future tweaks (optional ideas)

- Import/Export decks as JSON for backup.
- Small “Resumed X / N” toast on session start.
- Visible JP→EN / EN→JP indicator near the title.

---

**Built for quick rehearsal of everyday scenarios (BJJ grading, dentist chat, dog‑walk small talk, etc.)**


---

## `study-cards.py`

A **Python CLI app** that lets you paste in line pairs and step through them interactively at the terminal.  
- Keyboard shortcuts for show/next, mark correct/wrong, and reshuffle.  
- Good for quick desktop practice.  
- Run with:  
  ```bash
  python3 study-cards.py < your-file.txt
  ```

---
