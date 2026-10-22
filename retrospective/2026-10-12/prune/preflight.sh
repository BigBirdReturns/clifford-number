#!/usr/bin/env bash
# READ-ONLY checks to run immediately before any deletion. Needs a clone whose `origin` is
# https://github.com/BigBirdReturns/clifford-number. Prints nothing under the two "must be empty" headings when safe.
#
#   bash preflight.sh
set -euo pipefail
cd "$(dirname "$0")"
export LC_ALL=C
tab="$(printf '\t')"

git ls-remote --heads origin | sed "s#${tab}refs/heads/#${tab}#" | sort > /tmp/live-heads.tsv   # sha<TAB>name
awk -F'\t' 'NR > 1 { print $2 "\t" $1 }' branches.tsv | sort > /tmp/analysed-heads.tsv          # sha<TAB>name

echo "branches on origin now: $(wc -l < /tmp/live-heads.tsv); analysed in branches.tsv: $(wc -l < /tmp/analysed-heads.tsv)"
echo "--- on origin but new or moved since the analysis (must be empty; re-run the analysis for these):"
comm -23 /tmp/live-heads.tsv /tmp/analysed-heads.tsv
echo "--- analysed but moved or gone since (must be empty):"
comm -13 /tmp/live-heads.tsv /tmp/analysed-heads.tsv

# Bundle check (do once, before the first batch). The 4 parts live on branch archive/retrospective-2026-10-12:
#   git fetch origin archive/retrospective-2026-10-12
#   for i in 0 1 2 3; do git show origin/archive/retrospective-2026-10-12:retrospective/2026-10-12/git-bundle/clifford-number-all-refs.bundle.part0$i; done > /tmp/all-refs.bundle
#   sha256sum /tmp/all-refs.bundle     # expect 55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42
#   git bundle verify /tmp/all-refs.bundle
echo "(bundle check: see the comments in this file)"
