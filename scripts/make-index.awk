#!/usr/bin/env bash
# Usage: ./make-index.awk > index.json
#        ./make-index.awk library > library/index.json

root="${1:-.}"

echo '{'
echo '  "version": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",'
echo '  "files": ['

find "$root" -type f -name '*.data' | LC_ALL=C sort | \
awk -v root="$root" '
BEGIN { n = 0 }
{
  # strip leading "./" or "root/" for clean relative path
  gsub(/^[.]\//, "", $0)
  sub("^"root"/", "", $0)
  comma = (n++ ? "," : "")
  printf "    %s{ \"path\": \"%s\" }\n", comma, $0
}
END { print "  ]"; print "}" }
'