#!/usr/bin/env bash
# Split a state handbook PDF into one text file per page: work/pages/p001.txt ...
# Needs poppler-utils (pdftotext, pdfinfo).  Usage: pipeline/split-pages.sh handbook.pdf work/
set -euo pipefail
pdf=$1; out=${2:-work}
mkdir -p "$out/pages" "$out/manual" "$out/facts"
cp "$pdf" "$out/manual/m.pdf"
n=$(pdfinfo "$pdf" | awk '/^Pages:/{print $2}')
for p in $(seq 1 "$n"); do pdftotext -layout -f "$p" -l "$p" "$pdf" "$out/pages/p$(printf %03d "$p").txt"; done
echo "Wrote $n pages to $out/pages. Check whether printed page numbers match PDF pages; if not, set handbook.pageOffset in state.json."
