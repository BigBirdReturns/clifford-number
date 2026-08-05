#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE='.transport/ssc-rd-wave03-five-lane-intake-v1/materialize.sh'
PATCHED="$RUNNER_TEMP/ssc-rd-wave03-three-lane-materialize-v2.sh"

test -f "$SOURCE"

python - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
source = source_path.read_text()
start_marker = "expected_shas=(\n"
end_marker = 'echo "$BASE64_SHA256  $WORK/product.b64" | sha256sum -c -\n'

if source.count(start_marker) != 1 or source.count(end_marker) != 1:
    raise SystemExit("materializer source block changed; refusing wrapper patch")

head, remainder = source.split(start_marker, 1)
_, tail = remainder.split(end_marker, 1)
replacement = r'''# V2 carrier law: the first split recorded one incorrect redundant shard
# digest. Exact shard names and byte counts remain enforced, while the
# authoritative combined base64 digest, decoded archive digest, exact path
# denominator, and path-list digest below continue to bind every package byte.
expected_sizes=(4096 4096 4096 4096 4096 4096 4096 3712)
test "$(find "$TRANSPORT" -maxdepth 1 -type f -name 'part-*.b64' | wc -l | tr -d ' ')" -eq 8
: > "$WORK/product.b64"
: > "$WORK/carrier-sha256.txt"
for i in $(seq 0 7); do
  p=$(printf '%02d' "$i")
  src="$TRANSPORT/part-$p.b64"
  normalized="$WORK/carrier/part-$p.b64"
  test -f "$src"
  tr -d '\r\n' < "$src" > "$normalized"
  test "$(wc -c < "$normalized")" -eq "${expected_sizes[$i]}"
  sha256sum "$normalized" >> "$WORK/carrier-sha256.txt"
  cat "$normalized" >> "$WORK/product.b64"
done
'''

out_path.write_text(head + replacement + end_marker + tail)
PY

chmod 0700 "$PATCHED"
exec bash "$PATCHED"
