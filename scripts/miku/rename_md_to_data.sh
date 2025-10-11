#!/usr/bin/env bash
set -u
shopt -s nullglob

DRY_RUN=0  # set to 0 to actually rename

for f in *.md; do
  base="${f%.*}"

  # 1) spaces -> underscores
  base="${base// /_}"

  # 2) strip from first "(" to end
  base="${base%%(*}"

  # 3) compress multiple underscores
  base="$(printf '%s' "$base" | sed -E 's/_+/_/g')"

  # 4) trim leading/trailing junk
  base="$(printf '%s' "$base" | sed -E 's/^[[:space:]_.-,、。]+//; s/[[:space:]_.-,、。]+$//')"

  # 5) produce .data name
  [[ -z "$base" ]] && { echo "Skip: '$f' -> empty after cleaning"; continue; }
  new="${base}.data"

  # 6) avoid collisions
  target="$new"
  i=1
  while [[ -e "$target" ]]; do
    target="${base}_$i.data"
    ((i++))
  done

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "mv -- '$f' '$target'"
  else
    mv -v -- "$f" "$target"
  fi
done
