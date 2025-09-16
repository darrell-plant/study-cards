#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Terminal flashcard app for JA↔EN sentence pairs (with colours).

Usage:
  python study_cards.py /path/to/sentences.txt
  ./study_cards.py /path/to/sentences.txt

Controls:
  Space : show prompt → show answer → next prompt
  e     : switch to EN→JA mode (default)
  j     : switch to JA→EN mode
  r     : reshuffle order
  c     : toggle colours on/off
  h     : show help
  q     : quit
"""

import sys
import os
import random
import termios
import tty
from typing import List, Tuple

# ---------- ANSI colours ----------
RESET = "\033[0m"
BOLD = "\033[1m"
FG_YELLOW = "\033[33m"
FG_GREEN = "\033[32m"
FG_DIM = "\033[2m"

def supports_color() -> bool:
    return sys.stdout.isatty() and os.environ.get("TERM") not in (None, "dumb")

USE_COLOUR = supports_color()

def colour(text: str, *styles: str) -> str:
    if not USE_COLOUR:
        return text
    return "".join(styles) + text + RESET

# ---------- Heuristics for language detection ----------

def contains_japanese(s: str) -> bool:
    """Return True if s contains any Hiragana, Katakana, Kanji, or halfwidth Kana."""
    for ch in s:
        code = ord(ch)
        if (
            0x3040 <= code <= 0x309F  # Hiragana
            or 0x30A0 <= code <= 0x30FF  # Katakana
            or 0x4E00 <= code <= 0x9FFF  # CJK Unified Ideographs (Kanji)
            or 0xFF66 <= code <= 0xFF9D  # Halfwidth Katakana
        ):
            return True
    return False

def looks_english(s: str) -> bool:
    """Loose check: English if it has Latin letters and no Japanese chars."""
    if contains_japanese(s):
        return False
    return any("A" <= c <= "Z" or "a" <= c <= "z" for c in s)

# ---------- Raw key reader (macOS/Linux) ----------

def read_key() -> str:
    """
    Read a single keypress (no Enter needed).
    Returns a one-character string (space, letters, etc.).
    """
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)

# ---------- Parser ----------

def parse_pairs(path: str):
    """
    Parse a file containing alternating JA/EN lines, ignoring blank lines.
    Returns:
      pairs: List[Tuple[japanese, english]]
      warnings: List[str]
    """
    warnings: List[str] = []
    pairs: List[Tuple[str, str]] = []

    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: File not found: {path}")
        sys.exit(1)

    stripped = [(i + 1, ln.strip()) for i, ln in enumerate(lines)]

    i = 0
    n = len(stripped)

    while i < n:
        while i < n and stripped[i][1] == "":
            i += 1
        if i >= n:
            break

        ja_lineno, ja_line = stripped[i]
        if not contains_japanese(ja_line):
            warnings.append(f"[Line {ja_lineno}] Expected Japanese but got: {ja_line!r}")
            i += 1
            continue

        i += 1
        while i < n and stripped[i][1] == "":
            i += 1
        if i >= n:
            warnings.append(
                f"[After line {ja_lineno}] Reached EOF; missing English line for Japanese: {ja_line!r}"
            )
            break

        en_lineno, en_line = stripped[i]
        if not looks_english(en_line):
            warnings.append(
                f"[Line {en_lineno}] Expected English but got: {en_line!r} (JP above on line {ja_lineno})"
            )
            i += 1
            continue

        pairs.append((ja_line, en_line))
        i += 1

    return pairs, warnings

# ---------- Flashcard loop ----------

HELP_TEXT = """Controls:
  Space : show prompt → show answer → next prompt
  e     : switch to EN→JA mode (default)
  j     : switch to JA→EN mode
  r     : reshuffle order
  c     : toggle colours on/off
  h     : show this help
  q     : quit
"""

def print_header(pairs_count: int, warnings: List[str], filepath: str, mode: str):
    mode_str = "EN→JA" if mode == "EN2JA" else "JA→EN"
    print("=" * 60)
    print("Study Cards (Japanese ↔ English)")
    print(f"File: {filepath}")
    print(f"Parsed pairs: {pairs_count}")
    print("=" * 60)
    if warnings:
        print("Warnings (clean your file as needed):")
        for w in warnings:
            print("  - " + w)
        print("-" * 60)
    print(HELP_TEXT.strip())
    print("-" * 60)
    print(f"Mode: {mode_str} (press 'j' or 'e' to switch). Press Space to begin.")
    if USE_COLOUR:
        print(colour("Colour key: ", BOLD) + 
              f"{colour('JA', BOLD, FG_GREEN)} / {colour('EN', BOLD, FG_YELLOW)}")
    else:
        print("(Colours off; press 'c' to toggle if supported.)")
    print()

def show_prompt(ja: str, en: str, mode: str):
    if mode == "EN2JA":
        print(colour(en, BOLD, FG_YELLOW))
    else:
        print(colour(ja, BOLD, FG_GREEN))

def show_answer(ja: str, en: str, mode: str):
    if mode == "EN2JA":
        print(colour(ja, FG_GREEN))
    else:
        print(colour(en, FG_YELLOW))

def run_session(pairs: List[Tuple[str, str]], filepath: str, warnings: List[str]):
    global USE_COLOUR

    if not pairs:
        print("No valid JA/EN pairs found. Exiting.")
        return

    order = list(range(len(pairs)))
    random.shuffle(order)

    mode = "EN2JA"  # default
    idx = 0
    state = "await_prompt"  # or "await_answer"

    print_header(len(pairs), warnings, filepath, mode)

    try:
        while True:
            key = read_key()

            if key == "q":
                print("\nQuitting. おつかれさまでした！")
                break
            elif key in ("h", "?"):
                print()
                print(HELP_TEXT.strip())
                print()
            elif key == "e":
                mode = "EN2JA"
                print("Mode → EN→JA")
            elif key == "j":
                mode = "JA2EN"
                print("Mode → JA→EN")
            elif key == "r":
                random.shuffle(order)
                idx = 0
                state = "await_prompt"
                print("Shuffled. Back to start.")
            elif key == "c":
                USE_COLOUR = not USE_COLOUR
                print(f"Colours {'ON' if USE_COLOUR else 'OFF'}.")
            elif key == " ":
                pair = pairs[order[idx]]
                ja, en = pair

                if state == "await_prompt":
                    show_prompt(ja, en, mode)
                    state = "await_answer"
                else:
                    show_answer(ja, en, mode)
                    print()  # blank line after full pair
                    idx += 1
                    if idx >= len(order):
                        random.shuffle(order)
                        idx = 0
                        print("(Reached end. Reshuffled.)")
                    state = "await_prompt"
            else:
                # ignore others
                pass
    except KeyboardInterrupt:
        print("\nInterrupted. Bye!")

# ---------- Entry ----------

def main():
    if len(sys.argv) < 2:
        print("Usage: study_cards.py /path/to/sentences.txt")
        sys.exit(2)

    path = sys.argv[1]
    pairs, warnings = parse_pairs(path)
    run_session(pairs, path, warnings)

if __name__ == "__main__":
    main()
