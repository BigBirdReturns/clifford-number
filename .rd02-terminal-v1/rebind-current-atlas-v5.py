#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: rebind-current-atlas-v5.py ORIGINAL REBOUND')
original = Path(sys.argv[1])
rebound = Path(sys.argv[2])
text = original.read_text()
old_main = "EXPECTED_MAIN='ef70f7ad406c518f4b640ca4641c5a0f045a0d8d'"
new_main = "EXPECTED_MAIN='ea1776f7bba28b56fee9f3defb1940ef640517a2'"
if text.count(old_main) != 1:
    raise SystemExit(f'expected one old main lease, found {text.count(old_main)}')
text = text.replace(old_main, new_main, 1)
anchor = '(cd "$CARRIER_DIR/authored" && sha256sum --check "$CARRIER_DIR/authored-sha256.txt")\n'
if text.count(anchor) != 1:
    raise SystemExit(f'expected one authored-check anchor, found {text.count(anchor)}')
compatibility = r'''COMPATIBILITY_PATCH_SHA256='52650c04cd9cae860d1ccaf98fc11e4ded9e9e53dd0268e5687815aead4bc142'
CARRIER_DIR="$CARRIER_DIR" python - <<'PYCOMPAT'
from pathlib import Path
import os
root = Path(os.environ['CARRIER_DIR']) / 'authored'

def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    path.write_text(text.replace(old, new, 1))

validator = root / 'tools/validate-status-sovereignty-rd-wave02-rd02-license-leverage.mjs'
replace_once(validator, 'current.counts.label_reconciliations === 2 &&', 'current.counts.label_reconciliations === 1 &&', 'pre-promotion label count')
replace_once(validator, 'current.counts.label_reconciliations === 3 &&', 'current.counts.label_reconciliations === 2 &&', 'post-promotion label count')
test = root / 'test/status-sovereignty-rd-wave02-rd02-license-leverage.test.js'
replace_once(test, 'post.counts.label_reconciliations = 3;', 'post.counts.label_reconciliations = 2;', 'post-promotion fixture label count')
replace_once(test, "['pre label count', v => { v.counts.label_reconciliations = 3; }],", "['pre label count', v => { v.counts.label_reconciliations = 2; }],", 'pre-promotion mutation label count')
PYCOMPAT
test "$(sha256sum "$CARRIER_DIR/authored/tools/validate-status-sovereignty-rd-wave02-rd02-license-leverage.mjs" | awk '{print $1}')" = 'e57f296913ef2b8129836f416b38016d8a9a7909296219917d73197503a2f354'
test "$(sha256sum "$CARRIER_DIR/authored/test/status-sovereignty-rd-wave02-rd02-license-leverage.test.js" | awk '{print $1}')" = 'ff400d24b30bd5bf1878c80bddd556ef7fdd0d4ef55fa714d217b342716a09ff'
printf '%s\n' "$COMPATIBILITY_PATCH_SHA256" > "$RECEIPT_DIR/compatibility-patch-sha256.txt"
'''
text = text.replace(anchor, anchor + compatibility, 1)
rebound.write_text(text)
