#!/usr/bin/env awk -f
# Validate Study Cards format:
# - Optional first line: NAME: ...   (case-insensitive)
# - After header: 0 or 1 blank lines (no more)
# - Then repeated blocks:
#     JP line (must contain kana/kanji)
#     EN line (must NOT contain kana/kanji)
#     exactly 1 blank line separator
# - File may end after an EN line (no trailing blank) or with exactly one trailing blank.
#
# Exit code: 0 if all files valid, 1 if any file has errors.
#
# NOTE: For best Unicode behavior, use gawk with a UTF-8 locale.

function is_blank(s)       { return s ~ /^[[:space:]　]*$/ }      # include ideographic space U+3000
function ltrim(s)          { sub(/^[[:space:]　]+/,"",s); return s }
function header_p(s,  t)   { t = tolower(ltrim(s)); return t ~ /^name[[:space:]]*:/ }

# JP if it contains any Hiragana, Katakana, Kanji, long mark, iteration mark.
# (You can extend ranges if desired.)
function is_jp(s){
  return s ~ /[ぁ-んァ-ン一-龯ー々〆〇]/
}
function is_en(s){
  return !is_jp(s)
}

# error helper
function err(msg){ errs[FILENAME] = 1; print FILENAME ":" FNR ": " msg > "/dev/stderr" }

# per-file reset
function reset_state(){
  state = "start"            # start | after_header | expect_jpn | expect_eng | expect_sep
  saw_any_pair = 0
  blanks_after_header = 0
}

BEGIN { had_any_error = 0 }

FNR==1 {
  delete errs[FILENAME]
  reset_state()
}

{
  line = $0

  # ---------- state machine ----------
  if (state == "start") {
    if (header_p(line)) { state = "after_header"; next }

    if (is_blank(line)) { err("unexpected blank before content (no header)"); next }

    # first nonblank must be JP
    if (!is_jp(line)) err("expected JP line (kana/kanji) but found EN")
    state = "expect_eng"; saw_any_pair = 1
    next
  }

  else if (state == "after_header") {
    if (is_blank(line)) {
      blanks_after_header++
      if (blanks_after_header > 1) err("more than one blank line after header")
      next
    }
    # first nonblank after header must be JP
    if (!is_jp(line)) err("expected JP line (kana/kanji) after header but found EN")
    state = "expect_eng"; saw_any_pair = 1
    next
  }

  else if (state == "expect_jpn") {
    if (is_blank(line)) { err("missing JP line (got blank)"); next }
    if (!is_jp(line))  { err("expected JP line (kana/kanji) but found EN") }
    state = "expect_eng"; saw_any_pair = 1
    next
  }

  else if (state == "expect_eng") {
    if (is_blank(line)) { err("missing EN line (got blank)"); state = "expect_jpn"; next }
    if (!is_en(line))  { err("expected EN line (no kana/kanji) but found JP") }
    state = "expect_sep"
    next
  }

  else if (state == "expect_sep") {
    if (is_blank(line)) {            # exactly one blank allowed here
      state = "expect_jpn"
      next
    }
    # nonblank immediately after ENG ⇒ missing separator blank
    err("missing blank separator before this line (must be exactly one blank between pairs)")
    # treat this as next JP
    if (!is_jp(line)) err("expected JP line (kana/kanji) but found EN")
    state = "expect_eng"; saw_any_pair = 1
    next
  }
}

END {
  # header with no content
  if (state == "after_header" && !saw_any_pair) {
    print FILENAME ": 1: header present but no content" > "/dev/stderr"
    had_any_error = 1
  }
  # ended after JP (ENG missing)
  if (state == "expect_eng") {
    print FILENAME ":" NR ": file ends after a JP line (missing EN line)" > "/dev/stderr"
    had_any_error = 1
  }
  # ended in expect_sep (after ENG) => OK (no trailing blank)
  # ended in expect_jpn => OK (exactly one trailing blank)
  for (k in errs) had_any_error = 1
  exit had_any_error ? 1 : 0
}