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

import argparse
import sys, os, termios, tty
import random
from collections.abc import Iterable, Iterator


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="study_cards: flash card style study aid")
    parser.add_argument(
        "files",
        nargs="*",
        help="Files to read (if empty, read from stdin). Use -- to separate flags from filenames that start with -",
    )
    return parser.parse_args(argv)

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

# ---------- Parser ----------


def parse_pairs(lines: list[str]) -> tuple[list[tuple[str, str]], list[str]]:
    """
    Parse a list of alternating JA/EN lines, ignoring blank lines.
    Returns:
      pairs: list[tuple[japanese, english]]
      warnings: list[str]
    """
    warnings: list[str] = []
    pairs: list[tuple[str, str]] = []


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

def print_header(pairs_count: int, warnings: list[str], mode: str):
    mode_str = "EN→JA" if mode == "EN2JA" else "JA→EN"
    print("=" * 60)
    print("Study Cards (Japanese ↔ English)")
    print(f"File: ???")
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

def run_session(pairs: list[tuple[str, str]], warnings: list[str]):
    global USE_COLOUR

    if not pairs:
        print("No valid JA/EN pairs found. Exiting.")
        return

    order = list(range(len(pairs)))
    random.shuffle(order)

    mode = "EN2JA"  # default
    idx = 0
    state = "await_prompt"  # or "await_answer"

    print_header(len(pairs), warnings, mode)

    try:
        with RawTty() as kbd:
            while True:
                key = get_key(kbd)

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

def iter_files_lines(filenames: list[str]) -> Iterator[str]:
    """
    Yield lines from the given files (in order).
    Files that can't be opened are reported and skipped.
    """
    for fname in filenames:
        try:
            with open(fname, "r", encoding="utf-8") as f:
                for line in f:
                    yield line
        except FileNotFoundError:
            print(f"study-cards.py: {fname}: No such file", file=sys.stderr)
        except PermissionError:
            print(f"study-cards.py: {fname}: Permission denied", file=sys.stderr)
        except OSError as e:
            print(f"study-cards.py: {fname}: {e}", file=sys.stderr)


def read_initial_text() -> list[str]:
    if sys.stdin.isatty():
        return []
    text = sys.stdin.read()
    return text.splitlines(keepends=True)


class RawTty:
    def __enter__(self):
        self.tty = open("/dev/tty", "rb", buffering=0)
        self.fd = self.tty.fileno()
        self.old = termios.tcgetattr(self.fd)
        tty.setcbreak(self.fd)  # ← swap setraw → setcbreak
        return self.tty
    def __exit__(self, exc_type, exc, tb):
        termios.tcsetattr(self.fd, termios.TCSADRAIN, self.old)
        self.tty.close()

def get_key(tty_file) -> str:
    return tty_file.read(1).decode('utf-8', 'ignore')


def main():
    args = parse_args()

    if args.files:
        lines = list(iter_files_lines(args.files))
    else:
        lines = read_initial_text()

    pairs, warnings = parse_pairs(lines)
    run_session(pairs, warnings)

if __name__ == "__main__":
    main()
