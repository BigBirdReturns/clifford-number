#!/usr/bin/env bash
set -euo pipefail

ORIGINAL=/tmp/materialize-rd01-wave03-promotion-original.sh
PATCHED=/tmp/materialize-rd01-wave03-promotion-current-main.sh
CANDIDATE=/tmp/materialize-rd01-wave03-promotion-candidate.sh
OLD_BASE_LINE='export EXPECTED_BASE=fd34ca0a2726ff6972ccbc32ea7e5e13101b161b'

if git cat-file -e 'HEAD^2^{commit}' 2>/dev/null; then
  BRANCH_HEAD="$(git rev-parse HEAD^2)"
else
  BRANCH_HEAD="$(git rev-parse HEAD)"
fi

ORIGINAL_COMMIT=''
while IFS= read -r commit; do
  if git show "${commit}:.github/tmp/materialize-rd01-wave03-promotion.sh" > "$CANDIDATE" 2>/dev/null \
    && grep -Fxq "$OLD_BASE_LINE" "$CANDIDATE"; then
    ORIGINAL_COMMIT="$commit"
    mv "$CANDIDATE" "$ORIGINAL"
    break
  fi
done < <(git rev-list --first-parent "$BRANCH_HEAD")

if [[ -z "$ORIGINAL_COMMIT" ]]; then
  echo 'original materializer with stale base pin was not found in branch ancestry' >&2
  exit 1
fi

echo "replaying original materializer from $ORIGINAL_COMMIT"
git fetch --no-tags origin main
CURRENT_BASE="$(git rev-parse origin/main)"
echo "binding materializer to canonical main $CURRENT_BASE"

python3 - "$ORIGINAL" "$PATCHED" "$CURRENT_BASE" <<'PY'
from pathlib import Path
import re
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
current_base = sys.argv[3]
if not re.fullmatch(r'[0-9a-f]{40}', current_base):
    raise SystemExit(f'invalid canonical base SHA: {current_base!r}')
text = source_path.read_text()

old_base = 'export EXPECTED_BASE=fd34ca0a2726ff6972ccbc32ea7e5e13101b161b'
new_base = f'export EXPECTED_BASE={current_base}'
if text.count(old_base) != 1:
    raise SystemExit('expected exactly one stale base pin')
text = text.replace(old_base, new_base)

old_path_boundary = 'build/surface-graph.json\ndata/canonical/actors.json'
new_path_boundary = 'build/surface-graph.json\nbuild/topology-admission-frontier.json\ndata/canonical/actors.json'
if text.count(old_path_boundary) != 1:
    raise SystemExit('expected exactly one stale product-path boundary')
text = text.replace(old_path_boundary, new_path_boundary)

start_marker = 'base64 -d .github/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs.gz.b64'
end_marker = "echo '4ed77e65c75fd05b940298e5e921a3655c7ac5636bc59d7b1bf992e742a6ef12  /tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs'"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('gzip decode block could not be located')

decoder = r'''python3 - <<'PY_GZIP'
import base64
import hashlib
import json
from pathlib import Path
import zlib

source = Path('.github/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs.gz.b64')
target = Path('/tmp/apply-newsuk-times-exploraition-launch-principals-v1.mjs')
receipt = Path('/tmp/ssc-rd01-wave03-promotion-materializer-receipt')
expected_sha = '4ed77e65c75fd05b940298e5e921a3655c7ac5636bc59d7b1bf992e742a6ef12'
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
for flag in (0x08, 0x10):
    if flags & flag:
        try:
            pos = data.index(0, pos) + 1
        except ValueError as exc:
            raise SystemExit('truncated gzip string header') from exc
if flags & 0x02:
    pos += 2
if pos >= len(data) - 8:
    raise SystemExit('gzip payload is truncated')

compressed = data[pos:-8]
raw = zlib.decompress(compressed, -zlib.MAX_WBITS)
raw_sha = hashlib.sha256(raw).hexdigest()
corrupt_token = b'phfsical'
correct_token = b'physical'
occurrences = raw.count(corrupt_token)
if occurrences != 12:
    raise SystemExit(f'expected 12 propagated corrupt tokens, found {occurrences}')
repaired = raw.replace(corrupt_token, correct_token)
repaired_sha = hashlib.sha256(repaired).hexdigest()
if repaired_sha != expected_sha:
    raise SystemExit(f'deterministic repair did not recover expected source SHA: {repaired_sha}')
if len(repaired) != int.from_bytes(data[-4:], 'little'):
    raise SystemExit('repaired source size diverged from gzip ISIZE')

target.write_bytes(repaired)
receipt.mkdir(parents=True, exist_ok=True)
(receipt / 'corrupt-apply-script.mjs').write_bytes(raw)
(receipt / 'apply-script-recovery.json').write_text(json.dumps({
    'schema_version': 'newsuk-times-apply-script-recovery@1',
    'carrier_path': str(source),
    'compressed_bytes': len(compressed),
    'source_bytes': len(repaired),
    'raw_sha256': raw_sha,
    'corrupt_token': corrupt_token.decode(),
    'replacement_token': correct_token.decode(),
    'replacement_count': occurrences,
    'repaired_sha256': repaired_sha,
    'expected_sha256': expected_sha,
    'exact_sha_match': True,
    'admission_effect': 'none'
}, indent=2) + '\n')
print(f'deterministic source repair: {occurrences} tokens, sha256={repaired_sha}')
PY_GZIP
'''
text = text[:start] + decoder + text[end:]
target_path.write_text(text)
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
