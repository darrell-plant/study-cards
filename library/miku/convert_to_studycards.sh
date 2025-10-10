#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

for f in *.data; do
  out="${f}.out"

  awk '
    # --- 1️⃣ Remove YAML front matter ---
    /^---$/ { in_yaml = !in_yaml; next }
    in_yaml { next }

    # --- 2️⃣ Skip markdown headers (# ...) ---
    /^# / { next }

    # --- 3️⃣ Skip lines that are entirely blank ---
    /^[[:space:]　]*$/ { next }

    # --- 4️⃣ Clean and capture English/Japanese pairs ---
    {
      line = $0

      if (pending_eng == "") {
        # remove numeric prefixes like 1. or (２)
        sub(/^[[:space:]　]*[0-9０-９]+[[:space:]　]*[.．、。,)]*[[:space:]　]*/, "", line)
        pending_eng = line      # first nonblank -> English
      } else {
        jp = line               # second nonblank -> Japanese
        # remove spaces globally in Japanese line
        gsub(/[[:space:]　]/, "", jp)
        outpairs[++n] = jp "\n" pending_eng
        pending_eng = ""
      }
    }

    END {
      # print all pairs with exactly ONE blank line between
      for (i = 1; i <= n; i++) {
        print outpairs[i]
        if (i < n) print ""     # ensure exactly one blank line between pairs
      }
      # if file ends with a dangling English line, output it anyway
      if (pending_eng != "") print pending_eng "\n"
    }
  ' "$f" > "$out"

  echo "Converted: $f → $out"
done
