#!/usr/bin/env bash
set -euo pipefail

SELF_PATH='.github/tmp/wave36-finalize-v10.sh'
REPAIR_PATH='.github/tmp/wave36-wave21-membership-repair.mjs'
ENGINE_PATH='.github/tmp/wave36-finalize-v9.sh'
TOPOLOGY_PATH='.github/tmp/wave36-topology-extension.mjs'

for required in "$SELF_PATH" "$REPAIR_PATH" "$ENGINE_PATH" "$TOPOLOGY_PATH"; do
  test -f "$required"
done

node "$REPAIR_PATH"
node - <<'NODE'
const fs = require('fs');
const file = 'test/lake-allocator-war-wave-21.test.js';
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').trimEnd() + '\n');
NODE
node --check tools/validate-lake-allocator-war-wave-21.mjs
node --check test/lake-allocator-war-wave-21.test.js
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
git diff --check

changed="$(git diff --name-only | sort)"
expected=$'package.json\ntest/lake-allocator-war-wave-21.test.js\ntools/validate-lake-allocator-war-wave-21.mjs'
test "$changed" = "$expected"

rm -f "$REPAIR_PATH" "$SELF_PATH"
test ! -e "$REPAIR_PATH"
test ! -e "$SELF_PATH"

exec bash "$ENGINE_PATH"
