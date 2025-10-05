split_cards() {
  local infile="$1"
  local outdir="${2:-split_out}"

  if [[ -z "$infile" || ! -f "$infile" ]]; then
    echo "Usage: split_cards <input-file> [output-dir]" >&2
    return 1
  fi

  mkdir -p "$outdir" || { echo "Could not create output dir: $outdir" >&2; return 1; }

  awk -v dir="$outdir" '
    # Slugify a title to a safe filename base (spaces -> _, collapse repeats, trim)
    # Keep leading digits (e.g., "01." / "007."), then slugify the remainder.
    function slugify(s,   num, rest) {
        # 1) Capture leading digits with optional dot (e.g., "01.", "007.", or just "01")
        if (match(s, /^[0-9]+\.?[[:space:]]*/)) {
            num  = substr(s, 1, RLENGTH)                # e.g., "01. "  (may include spaces)
            # Normalise the numeric prefix to "<digits>." (keep leading zeros)
            sub(/[[:space:]]+$/, "", num)               # trim trailing spaces after number/dot
            if (num !~ /\.$/ && match(num, /^[0-9]+$/)) # if it was just digits, add a dot
            num = num "."
            # remove the captured prefix from s for further processing
            rest = substr(s, RLENGTH + 1)
        } else {
            num  = ""
            rest = s
        }

        # 2) Slugify the remainder safely (lowercase, underscores, keep dots and hyphens)
        gsub(/^[ \t\u3000]+|[ \t\u3000]+$/, "", rest)
        gsub(/[^[:alnum:].-]+/, "_", rest)
        gsub(/_+/, "_", rest)
        sub(/^_+/, "", rest); sub(/_+$/, "", rest)
        rest = tolower(rest)

        # 3) Reattach preserved numeric prefix exactly (keeps leading zeros)
        return num "_" rest
    }

    /^NAME:[[:space:]]*/ {
      title = $0
      sub(/^NAME:[[:space:]]*/, "", title)

      base = slugify(title)                           # e.g. "filename_1"
      idx  = ++seen[base]                             # de-duplicate if same name repeats
      outfile = dir "/" base ((idx>1) ? "_" idx : "") ".data"

      if (current_out != "") close(current_out)       # close previous file
      current_out = outfile
      next
    }

    # Append all non-NAME lines to the current file verbatim
    {
      if (current_out != "")
        print $0 >> current_out
    }
  ' "$infile"

  echo "Done. Files written to: $outdir"
}