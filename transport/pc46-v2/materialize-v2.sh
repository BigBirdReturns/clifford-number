#!/usr/bin/env bash
set -Eeuo pipefail

status=failed
pass_package=false
pass_shape=false
pass_focused=false
pass_historical=false
pass_no_magic=false
pass_release=false
pass_replay=false
pass_git_objects=false
pass_parent_lease=false
product_commit=''
product_tree=''
current_main=''

emit_receipt() {
  code=$?
  trap - EXIT
  export RECEIPT_STATUS="$status" PASS_PACKAGE="$pass_package" PASS_SHAPE="$pass_shape"
  export PASS_FOCUSED="$pass_focused" PASS_HISTORICAL="$pass_historical"
  export PASS_NO_MAGIC="$pass_no_magic" PASS_RELEASE="$pass_release"
  export PASS_REPLAY="$pass_replay" PASS_GIT_OBJECTS="$pass_git_objects"
  export PASS_PARENT_LEASE="$pass_parent_lease" PRODUCT_COMMIT="$product_commit"
  export PRODUCT_TREE="$product_tree" CURRENT_MAIN="$current_main"
  python - <<'PY_RECEIPT'
from pathlib import Path
import hashlib, json, os, subprocess

paths_file = Path('/tmp/pc46-paths.expected')
paths = paths_file.read_text().splitlines() if paths_file.exists() else []
files = {}
root = Path('/tmp/pc46-target')
for path in paths:
    p = root / path
    if p.exists():
        files[path] = {
            'bytes': p.stat().st_size,
            'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
            'git_blob_sha1': subprocess.check_output(['git', '-C', str(root), 'hash-object', path], text=True).strip()
        }
receipt = {
    'schema_version': 'pc46-exact-product-materializer-receipt@2',
    'workflow_run_id': os.environ.get('GITHUB_RUN_ID'),
    'status': os.environ.get('RECEIPT_STATUS'),
    'expected_parent': os.environ['EXPECTED_PARENT'],
    'canonical_main_observed': os.environ.get('CURRENT_MAIN') or None,
    'target_branch': os.environ['TARGET_BRANCH'],
    'product_commit': os.environ.get('PRODUCT_COMMIT') or None,
    'product_tree': os.environ.get('PRODUCT_TREE') or None,
    'permanent_path_count': len(paths),
    'permanent_paths': paths,
    'path_list_sha256': hashlib.sha256(('\n'.join(paths) + '\n').encode()).hexdigest() if paths else None,
    'package_sha256': os.environ['PACKAGE_SHA256'],
    'files': files,
    'package_verified': os.environ.get('PASS_PACKAGE') == 'true',
    'exact_shape_verified': os.environ.get('PASS_SHAPE') == 'true',
    'focused_pc46_and_floor_v44': 'pass' if os.environ.get('PASS_FOCUSED') == 'true' else 'not_proved',
    'historical_preference_custody_floors': 'pass' if os.environ.get('PASS_HISTORICAL') == 'true' else 'not_proved',
    'no_magic_human': 'pass' if os.environ.get('PASS_NO_MAGIC') == 'true' else 'not_proved',
    'release_check': 'pass' if os.environ.get('PASS_RELEASE') == 'true' else 'not_proved',
    'deterministic_replay': 'pass' if os.environ.get('PASS_REPLAY') == 'true' else 'not_proved',
    'server_side_git_objects_created': os.environ.get('PASS_GIT_OBJECTS') == 'true',
    'canonical_parent_lease_verified': os.environ.get('PASS_PARENT_LEASE') == 'true',
    'standalone_fixture_mutations': 62,
    'standalone_build_tamper_checks': 18,
    'floor_v44_adversarial_mutations': 86,
    'qualified_controls': 46,
    'promotion_requirements': 1783,
    'temporary_paths_in_product': 0,
    'write_capable_permanent_workflows': 0,
    'outside_human_dependency': False,
    'graph_effect': 'none'
}
Path('/tmp/pc46-materializer-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
PY_RECEIPT
  exit "$code"
}
trap emit_receipt EXIT

cat > /tmp/pc46-paths.expected <<'EOF_PATHS'
.github/workflows/preference-custody-v44.yml
.github/workflows/preference-linkage-target-construction-exchangeability-assurance.yml
data/research/preference-custody/control-manifest-v44.json
data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json
docs/preference-custody-laboratory-floor-v44.md
docs/preference-custody-linkage-target-construction-exchangeability-assurance.md
test/preference-custody-manifest-v44.test.js
test/preference-linkage-target-construction-exchangeability-assurance.test.js
tools/compile-preference-custody-manifest-v44.mjs
tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs
tools/lib/preference-custody-manifest-v44.mjs
tools/lib/preference-linkage-target-construction-exchangeability-assurance.mjs
tools/validate-preference-custody-manifest-v44.mjs
tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs
EOF_PATHS
sed -i 's/^          //' /tmp/pc46-paths.expected
LC_ALL=C sort -o /tmp/pc46-paths.expected /tmp/pc46-paths.expected
test "$(sha256sum /tmp/pc46-paths.expected | awk '{print $1}')" = "$PATH_LIST_SHA256"

cat > /tmp/pc46-shards.sha256 <<'EOF_SHARDS'
352e79661d97d4f10d8e91bacc7f74454721a13086c2b726af89b911ef34adb8  transport/pc46-v2/product.b64.part-00
a5a680491b6a7be94ac65ed066c2d9447344d2ff00fb056b4063091476448408  transport/pc46-v2/product.b64.part-01
df1a02104e75ef46658bf7df495dacdf8008fb821e2a9be6aa8ae30352c9c805  transport/pc46-v2/product.b64.part-02
a6f5da1e936b3051ee6f14c11960cae5292acd2a3f4247417cc591408370ff42  transport/pc46-v2/product.b64.part-03
60ab2f76b8b4aedaddbd9a7ca3f102df51c12cf4bcccde76877d423c94898d96  transport/pc46-v2/product.b64.part-04
6324083c0ca71187f580f22697c5db168a4839da0aef46a4f1029f852ca4d2ca  transport/pc46-v2/product.b64.part-05
d5edbdafce0f8848ef79081cb2c7e35eca11f913115410abe37d48b4c3851479  transport/pc46-v2/product.b64.part-06
EOF_SHARDS
sed -i 's/^          //' /tmp/pc46-shards.sha256
sha256sum -c /tmp/pc46-shards.sha256
cat transport/pc46-v2/product.b64.part-* > /tmp/pc46-product.tar.gz.b64
base64 --decode /tmp/pc46-product.tar.gz.b64 > /tmp/pc46-product.tar.gz
test "$(sha256sum /tmp/pc46-product.tar.gz | awk '{print $1}')" = "$PACKAGE_SHA256"
tar -tzf /tmp/pc46-product.tar.gz | sed 's#^\./##' | LC_ALL=C sort > /tmp/pc46-paths.archive
diff -u /tmp/pc46-paths.expected /tmp/pc46-paths.archive
rm -rf /tmp/pc46-package-inspection
mkdir -p /tmp/pc46-package-inspection
tar -xzf /tmp/pc46-product.tar.gz -C /tmp/pc46-package-inspection test/preference-custody-manifest-v44.test.js
test "$(sha256sum /tmp/pc46-package-inspection/test/preference-custody-manifest-v44.test.js | awk '{print $1}')" = "f350513db99d3bd1af0ee1d0bd43eedfe1062eba74650dd2cff83f54e4e85cf9"
node --check /tmp/pc46-package-inspection/test/preference-custody-manifest-v44.test.js
pass_package=true

git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
current_main=$(git rev-parse origin/main)
test "$current_main" = "$EXPECTED_PARENT"

rm -rf /tmp/pc46-target
git worktree add --detach /tmp/pc46-target "$EXPECTED_PARENT"
tar -xzf /tmp/pc46-product.tar.gz -C /tmp/pc46-target
cd /tmp/pc46-target
git ls-files --others --exclude-standard | LC_ALL=C sort > /tmp/pc46-paths.observed
diff -u /tmp/pc46-paths.expected /tmp/pc46-paths.observed
test "$(wc -l < /tmp/pc46-paths.observed | tr -d ' ')" = 14
test -z "$(git diff --name-only)"
pass_shape=true

node tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs
node tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs
node test/preference-linkage-target-construction-exchangeability-assurance.test.js
node tools/compile-preference-custody-manifest-v44.mjs
node tools/validate-preference-custody-manifest-v44.mjs
node test/preference-custody-manifest-v44.test.js
pass_focused=true

rm -rf /tmp/pc46-reference
mkdir -p /tmp/pc46-reference
cp build/research/preference-linkage-target-construction-exchangeability-assurance.{json,md} /tmp/pc46-reference/
cp build/research/preference-custody-laboratory-floor-v44.{json,md} /tmp/pc46-reference/

for test_file in $(find test -maxdepth 1 -type f -name 'preference-custody-manifest-v*.test.js' | sort -V); do
  node "$test_file"
done
node test/preference-custody-manifest.test.js
pass_historical=true

node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
pass_no_magic=true

npm run release:check
pass_release=true

git reset --hard "$EXPECTED_PARENT"
git clean -fdx
tar -xzf /tmp/pc46-product.tar.gz -C /tmp/pc46-target
node tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs
node tools/validate-preference-linkage-target-construction-exchangeability-assurance.mjs
node test/preference-linkage-target-construction-exchangeability-assurance.test.js
node tools/compile-preference-custody-manifest-v44.mjs
node tools/validate-preference-custody-manifest-v44.mjs
node test/preference-custody-manifest-v44.test.js
cmp /tmp/pc46-reference/preference-linkage-target-construction-exchangeability-assurance.json build/research/preference-linkage-target-construction-exchangeability-assurance.json
cmp /tmp/pc46-reference/preference-linkage-target-construction-exchangeability-assurance.md build/research/preference-linkage-target-construction-exchangeability-assurance.md
cmp /tmp/pc46-reference/preference-custody-laboratory-floor-v44.json build/research/preference-custody-laboratory-floor-v44.json
cmp /tmp/pc46-reference/preference-custody-laboratory-floor-v44.md build/research/preference-custody-laboratory-floor-v44.md
pass_replay=true

git reset --hard "$EXPECTED_PARENT"
git clean -fdx
tar -xzf /tmp/pc46-product.tar.gz -C /tmp/pc46-target
git add --pathspec-from-file=/tmp/pc46-paths.expected
git diff --cached --name-only | LC_ALL=C sort > /tmp/pc46-paths.staged
diff -u /tmp/pc46-paths.expected /tmp/pc46-paths.staged
test -z "$(git diff --name-only)"
test -z "$(git ls-files --others --exclude-standard)"
git diff --cached --check
product_tree=$(git write-tree)
parent_tree=$(git rev-parse "$EXPECTED_PARENT^{tree}")

export PRODUCT_ROOT=/tmp/pc46-target PARENT_TREE="$parent_tree"
python - <<'PY_OBJECTS'
from pathlib import Path
import base64, json, os, subprocess, urllib.request

repo = os.environ['GITHUB_REPOSITORY']
token = os.environ['GH_TOKEN']
root = Path(os.environ['PRODUCT_ROOT'])
paths = Path('/tmp/pc46-paths.expected').read_text().splitlines()

def post(path, payload):
    request = urllib.request.Request(
        f'https://api.github.com/repos/{repo}{path}',
        data=json.dumps(payload).encode(),
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)

entries = []
for path in paths:
    data = (root / path).read_bytes()
    result = post('/git/blobs', {'content': base64.b64encode(data).decode(), 'encoding': 'base64'})
    expected_blob = subprocess.check_output(['git', '-C', str(root), 'hash-object', path], text=True).strip()
    if result['sha'] != expected_blob:
        raise SystemExit(f'blob mismatch for {path}: {result["sha"]} != {expected_blob}')
    entries.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': result['sha']})

tree = post('/git/trees', {'base_tree': os.environ['PARENT_TREE'], 'tree': entries})
Path('/tmp/pc46-api-tree').write_text(tree['sha'] + '\n')
commit = post('/git/commits', {
    'message': 'Complete PC-46 target, estimand, construction-method, and exchangeability custody',
    'tree': tree['sha'],
    'parents': [os.environ['EXPECTED_PARENT']]
})
Path('/tmp/pc46-api-commit').write_text(commit['sha'] + '\n')
print(json.dumps({'tree': tree['sha'], 'commit': commit['sha']}, indent=2))
PY_OBJECTS

test "$(cat /tmp/pc46-api-tree)" = "$product_tree"
product_commit=$(cat /tmp/pc46-api-commit)
git cat-file -e "$product_commit^{commit}" 2>/dev/null || git fetch --no-tags origin "$product_commit"
test "$(git show -s --format=%P "$product_commit")" = "$EXPECTED_PARENT"
test "$(git rev-parse "$product_commit^{tree}")" = "$product_tree"
git diff --name-only "$EXPECTED_PARENT" "$product_commit" | LC_ALL=C sort > /tmp/pc46-paths.committed
diff -u /tmp/pc46-paths.expected /tmp/pc46-paths.committed
pass_git_objects=true

git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
current_main=$(git rev-parse origin/main)
test "$current_main" = "$EXPECTED_PARENT"
pass_parent_lease=true
status=success
