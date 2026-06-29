#!/usr/bin/env bash
set -euo pipefail

BASE="https://apps.irs.gov/pub/epostcard/990/xml"
if [ "$#" -gt 0 ]; then
  YEARS=("$@")
else
  YEARS=(2023 2024)
fi
MONTHS=(01A 01B 02A 02B 03A 03B 04A 04B 05A 05B 06A 06B 07A 07B 08A 08B 09A 09B 10A 10B 11A 11B 12A 12B)

for year in "${YEARS[@]}"; do
  curl --fail --location --continue-at - \
    "$BASE/$year/index_$year.csv" \
    --output "index_$year.csv"

  for month in "${MONTHS[@]}"; do
    url="$BASE/$year/${year}_TEOS_XML_${month}.zip"
    echo "Downloading $url"
    curl --fail --location --continue-at - "$url" --output "${year}_TEOS_XML_${month}.zip" || \
      echo "warning: skipped unavailable $url" >&2
  done
done
