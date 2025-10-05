for f in *.canvas; do
  jq -r --arg f "$f" '
    .nodes
    | sort_by(.y)[]
    | select(.color == "2" and .text)
    | .text
    | sub("[\r\n]+$"; "")        # drop trailing real CR/LF
    | sub("[ \t\u3000]+$"; "")   # drop trailing spaces (incl. full-width)
    | sub("^[ \t\u3000]+"; "")   # optional: trim leading spaces
    | gsub("\r"; "\\\\r")        # escape remaining CR
    | gsub("\n"; "\\\\n")        # escape remaining LF
    | "\($f): " + .
  ' "$f"
done