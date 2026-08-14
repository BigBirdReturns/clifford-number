#!/usr/bin/env bash
set -euo pipefail

ORIGINAL=/tmp/materialize-rd01-wave03-promotion-original.sh
PATCHED=/tmp/materialize-rd01-wave03-promotion-current-main.sh
SOURCE_COMMIT="${GITHUB_HEAD_SHA:-}"

if [[ -z "$SOURCE_COMMIT" ]]; then
  SOURCE_COMMIT="$(git rev-parse HEAD)"
fi

git show "${SOURCE_COMMIT}^:.github/tmp/materialize-rd01-wave03-promotion.sh" > "$ORIGINAL"

python3 - "$ORIGINAL" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text()

old_base = 'export EXPECTED_BASE=fd34ca0a2726ff6972ccbc32ea7e5e13101b161b'
new_base = 'export EXPECTED_BASE=c95d225ce313215fdeec62263bf985546b7bcee1'
if text.count(old_base) != 1:
    raise SystemExit('expected exactly one stale base pin')
text = text.replace(old_base, new_base)

start_marker = 'base64 -d .github/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs.gz.b64'
end_marker = "echo '4ed77e65c75fd05b940298e5e921a3655c7ac5636bc59d7b1bf992e742a6ef12  /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs'"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('gzip decode block could not be located')

decoder = r'''python3 - <<'PY_GZIP'
import base64
from pathlib import Path
import zlib

source = Path('.github/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs.gz.b64')
target = Path('/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs')
data = base64.b64decode(source.read_text())
if len(data) < 18 or data[:2] != b'\x1f\x8b' or data[2] != 8:
    raise SystemExit('payload is not a supported gzip member')
flags = data[3]
pos = 10
if flags & 0x04:
    if pos + 2 > len(data):
        raise SystemExit('truncated gzip extra header')
    extra_len = int.from_bytes(data[pos:pos + 2], 'little')
    pos += 2 + extra_len
for bit in (0x08, 0x10):
    if flags & bit:
        try:
            pos = data.index(0, pos) + 1
        except ValueError as exc:
            raise SystemExit('truncated gzip string header') from exc
if flags & 0x02:
    pos += 2
if pos >= len(data) - 8:
    raise SystemExit('gzip payload is truncated')
output = zlib.decompress(data[pos:-8], -zlib.MAX_WBITS)
target.write_bytes(output)
print(f'raw-deflate recovery wrote {len(output)} bytes; gzip footer CRC intentionally ignored')
PY_GZIP
'''
text = text[:start] + decoder + text[end:]
target_path.write_text(text)
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
