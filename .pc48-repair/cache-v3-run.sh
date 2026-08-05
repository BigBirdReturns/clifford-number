#!/usr/bin/env bash
set -Eeuo pipefail

phase=initialize
trap 'status=$?; printf "status=%s\nphase=%s\ncommand=%s\n" "$status" "$phase" "$BASH_COMMAND" > /tmp/pc48-cache-v3-diagnostic.txt; exit "$status"' ERR

OLD_PARENT=61a33f5459e64f1978d9c55c1b7ea7f925358cd8
CURRENT_MAIN=416188eab90981d963a45de644beb9f6c5800f9b
INITIAL_CANDIDATE=517637995fcf44d3d099d15a23372da5e2fcb2b2
TARGET_BRANCH=agent/pc48-postmerge-cache-repair
TARGET_LEASE=d4d543d73ea9220bb3a1d26a182bff9798c1a64f
BASE_LIB_SHA256=d4a40d455032d6111e9883e789bfb82589b5ee0062a5851f4b7c06b61032b6c2
BASE_TEST_SHA256=4e073b395d18bc062d03c580e675343fc6c3088a52a17c91ba38172b9a2d6d20

cd "$GITHUB_WORKSPACE"
test "$(git rev-parse HEAD)" = "$INITIAL_CANDIDATE"
test "$(git rev-parse HEAD^)" = "$OLD_PARENT"
test -z "$(git status --porcelain)"
test "$(sha256sum tools/lib/preference-custody-manifest-v46.mjs | awk '{print $1}')" = "$BASE_LIB_SHA256"
test "$(sha256sum test/preference-custody-manifest-v46.test.js | awk '{print $1}')" = "$BASE_TEST_SHA256"
git fetch --no-tags origin "$CURRENT_MAIN"
git cat-file -e "$CURRENT_MAIN^{commit}"

phase=preserve_transitive_key_diagnostics
python3 - <<'PY'
from pathlib import Path

path = Path('/tmp/cache-v3.py')
text = path.read_text()
old = """  const snapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, keyErrors);
  if (!snapshot) return keyErrors;
  const cacheKey = sha256(snapshot);
"""
new = """  const snapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, keyErrors);
  if (!snapshot) return keyErrors;
  const transitiveKeyErrors = validateTransitiveSourceBundleKeys(snapshot.baseSources);
  if (transitiveKeyErrors.length) return transitiveKeyErrors;
  const cacheKey = sha256(snapshot);
"""
if text.count(old) != 1:
    raise SystemExit(f'unexpected recursive cache preflight anchor count: {text.count(old)}')
path.write_text(text.replace(old, new, 1))
PY

phase=preserve_chronology_diagnostics
python3 - <<'PY'
from pathlib import Path

path = Path('/tmp/cache-v3.py')
text = path.read_text()
old = '''build_source_replacement = """  if (!baseSources) errors.push('compiled v46 complete v45 source bundle is required');
  const qualifiedBaseErrors = baseBuild && baseSources ? validateQualifiedV45Base(baseBuild, baseSources) : [];
  if (qualifiedBaseErrors.length) errors.push(...qualifiedBaseErrors.map(error => `compiled v46 base invalid: ${error}`));
  if (manifest && !qualifiedBaseErrors.length) errors.push(...validateDirectSourceChronology(manifest.captured_at, baseBuild, targetBuild, targetFixture, baseSources));
  if (baseBuild && !qualifiedBaseErrors.length) {
"""
'''
new = '''build_source_replacement = """  if (!baseSources) errors.push('compiled v46 complete v45 source bundle is required');
  const cachePreflightErrors = [];
  let cacheSnapshot = null;
  if (baseBuild && baseSources) {
    requireExactKeys(baseBuild, EXPECTED_BUILD_KEYS, 'v46 v45 base build', cachePreflightErrors);
    requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', cachePreflightErrors);
    cacheSnapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, cachePreflightErrors);
  }
  if (cachePreflightErrors.length) errors.push(...cachePreflightErrors.map(error => `compiled v46 base invalid: ${error}`));
  if (manifest && cacheSnapshot) {
    errors.push(...validateDirectSourceChronology(
      manifest.captured_at,
      cacheSnapshot.baseBuild,
      targetBuild,
      targetFixture,
      cacheSnapshot.baseSources
    ));
  }
  const qualifiedBaseErrors = cacheSnapshot ? validateQualifiedV45Base(baseBuild, baseSources) : cachePreflightErrors;
  if (!cachePreflightErrors.length && qualifiedBaseErrors.length) {
    errors.push(...qualifiedBaseErrors.map(error => `compiled v46 base invalid: ${error}`));
  }
  if (baseBuild && cacheSnapshot && !qualifiedBaseErrors.length) {
"""
'''
if text.count(old) != 1:
    raise SystemExit(f'unexpected build chronology anchor count: {text.count(old)}')
path.write_text(text.replace(old, new, 1))
PY

phase=apply_recursive_cache_safety
python3 /tmp/cache-v3.py

phase=reject_cross_root_aliases
python3 - <<'PY'
from pathlib import Path

lib_path = Path('tools/lib/preference-custody-manifest-v46.mjs')
test_path = Path('test/preference-custody-manifest-v46.test.js')
lib = lib_path.read_text()
test = test_path.read_text()

old = """function validateCacheSafeJsonTree(value, label, errors) {
  const seen = new WeakSet();
"""
new = """function validateCacheSafeJsonTree(value, label, errors, seen = new WeakSet()) {
"""
if lib.count(old) != 1:
    raise SystemExit(f'unexpected cache-tree signature anchor count: {lib.count(old)}')
lib = lib.replace(old, new, 1)

old = """function snapshotCacheSafeV45Inputs(baseBuild, baseSources, errors) {
  validateCacheSafeJsonTree(baseBuild, 'v46 v45 base build cache input', errors);
  validateCacheSafeJsonTree(baseSources, 'v46 v45 source bundle cache input', errors);
  if (errors.length) return null;
  let snapshot;
  try {
    snapshot = structuredClone({ baseBuild, baseSources });
  } catch {
    errors.push('v46 v45 cache inputs must be structured-cloneable canonical JSON data');
    return null;
  }
  const snapshotErrors = [];
  validateCacheSafeJsonTree(snapshot.baseBuild, 'v46 v45 base build cache snapshot', snapshotErrors);
  validateCacheSafeJsonTree(snapshot.baseSources, 'v46 v45 source bundle cache snapshot', snapshotErrors);
  errors.push(...snapshotErrors);
  return errors.length ? null : snapshot;
}
"""
new = """function snapshotCacheSafeV45Inputs(baseBuild, baseSources, errors) {
  const inputSeen = new WeakSet();
  validateCacheSafeJsonTree(baseBuild, 'v46 v45 base build cache input', errors, inputSeen);
  validateCacheSafeJsonTree(baseSources, 'v46 v45 source bundle cache input', errors, inputSeen);
  if (errors.length) return null;
  let snapshot;
  try {
    snapshot = structuredClone({ baseBuild, baseSources });
  } catch {
    errors.push('v46 v45 cache inputs must be structured-cloneable canonical JSON data');
    return null;
  }
  const snapshotErrors = [];
  const snapshotSeen = new WeakSet();
  validateCacheSafeJsonTree(snapshot.baseBuild, 'v46 v45 base build cache snapshot', snapshotErrors, snapshotSeen);
  validateCacheSafeJsonTree(snapshot.baseSources, 'v46 v45 source bundle cache snapshot', snapshotErrors, snapshotSeen);
  errors.push(...snapshotErrors);
  return errors.length ? null : snapshot;
}
"""
if lib.count(old) != 1:
    raise SystemExit(f'unexpected cache snapshot anchor count: {lib.count(old)}')
lib = lib.replace(old, new, 1)

anchor = """const deepExtraKeyBaseSources = clone(baseSources);
"""
insertion = """const crossRootAliasBaseSourcesAfterCacheWarmup = clone(baseSources);
crossRootAliasBaseSourcesAfterCacheWarmup.manifest.frontier_transition = baseBuild.frontier_transition;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, crossRootAliasBaseSourcesAfterCacheWarmup),
  /repeated or cyclic object/,
  'cross-root v45 base/source alias reused cached validation'
);
const crossRootAliasBuildErrors = validatePreferenceCustodyManifestV46Build(
  build,
  manifest,
  baseBuild,
  targetBuild,
  targetFixture,
  crossRootAliasBaseSourcesAfterCacheWarmup
);
assert.ok(
  crossRootAliasBuildErrors.some(error => error.includes('repeated or cyclic object')),
  'cross-root v45 base/source alias escaped build validation'
);

const deepExtraKeyBaseSources = clone(baseSources);
"""
if test.count(anchor) != 1:
    raise SystemExit(f'unexpected cross-root explicit-test anchor count: {test.count(anchor)}')
test = test.replace(anchor, insertion, 1)

old = """  ['nested source accessor after cache warmup', x => Object.defineProperty(x.baseBuild.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true })],
  ['nested source cycle after cache warmup', x => x.baseBuild.controls[0].cycle = x.baseBuild.controls[0]],
  ['deep extra manifest field', x => x.baseSources.baseSources.manifest.controller = 'external'],
"""
new = """  ['nested source accessor after cache warmup', x => Object.defineProperty(x.baseBuild.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true })],
  ['nested source cycle after cache warmup', x => x.baseBuild.controls[0].cycle = x.baseBuild.controls[0]],
  ['cross-root source/build alias after cache warmup', x => x.manifest.frontier_transition = baseBuild.frontier_transition],
  ['deep extra manifest field', x => x.baseSources.baseSources.manifest.controller = 'external'],
"""
if test.count(old) != 1:
    raise SystemExit(f'unexpected cross-root mutation anchor count: {test.count(old)}')
test = test.replace(old, new, 1)

lib_path.write_text(lib)
test_path.write_text(test)
PY

cat > /tmp/pc48-cache-v3-expected-paths.txt <<'PATHS'
test/preference-custody-manifest-v46.test.js
tools/lib/preference-custody-manifest-v46.mjs
PATHS
git diff --name-only | sort > /tmp/pc48-cache-v3-actual-paths.txt
diff -u /tmp/pc48-cache-v3-expected-paths.txt /tmp/pc48-cache-v3-actual-paths.txt

phase=amend_and_rebind
repaired_lib_sha256="$(sha256sum tools/lib/preference-custody-manifest-v46.mjs | awk '{print $1}')"
repaired_test_sha256="$(sha256sum test/preference-custody-manifest-v46.test.js | awk '{print $1}')"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git switch -c pc48-cache-v3-candidate
git add --pathspec-from-file=/tmp/pc48-cache-v3-expected-paths.txt
git commit --amend -m 'Reject non-canonical and aliased v45 cache inputs'
test "$(git rev-parse HEAD^)" = "$OLD_PARENT"
test "$(git rev-list --count "$OLD_PARENT"..HEAD)" -eq 1
test "$(git diff --name-only "$OLD_PARENT"..HEAD | wc -l)" -eq 2
git rebase --onto "$CURRENT_MAIN" "$OLD_PARENT"
candidate_commit="$(git rev-parse HEAD)"
candidate_tree="$(git rev-parse HEAD^{tree})"
test "$(git rev-parse HEAD^)" = "$CURRENT_MAIN"
test "$(git rev-list --count "$CURRENT_MAIN"..HEAD)" -eq 1
test "$(git diff --name-only "$CURRENT_MAIN"..HEAD | wc -l)" -eq 2
test "$(git diff --name-status "$CURRENT_MAIN"..HEAD | awk '$1 != "M" {count++} END {print count+0}')" -eq 0
test -z "$(git status --porcelain)"

phase=qualify_exact_candidate
node tools/compile-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs
node tools/validate-preference-linkage-interval-method-partition-replication-deployment-assurance.mjs
node test/preference-linkage-interval-method-partition-replication-deployment-assurance.test.js
node tools/compile-preference-custody-manifest-v46.mjs
node tools/validate-preference-custody-manifest-v46.mjs
node test/preference-custody-manifest-v46.test.js 2>&1 | tee /tmp/pc48-cache-v3-test.log
grep -F 'PASS (180 mutations' /tmp/pc48-cache-v3-test.log
node tools/validate-no-magic-human-gate.mjs
node test/no-magic-human-gate.test.js
npm run release:check

phase=normalize_generated_volatility
git restore --source=HEAD --staged --worktree -- build 2>/dev/null || true
git clean -fd -- build
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$candidate_commit"
test "$(git rev-parse HEAD^{tree})" = "$candidate_tree"

phase=publish_candidate
git push --force-with-lease="refs/heads/$TARGET_BRANCH:$TARGET_LEASE" origin "HEAD:refs/heads/$TARGET_BRANCH" > /tmp/pc48-cache-v3-push.log 2>&1
cat /tmp/pc48-cache-v3-push.log

phase=complete
cat > /tmp/pc48-cache-v3-receipt.txt <<RECEIPT
current_main=$CURRENT_MAIN
repaired_commit=$candidate_commit
repaired_tree=$candidate_tree
changed_paths=2
repaired_lib_sha256=$repaired_lib_sha256
repaired_test_sha256=$repaired_test_sha256
recursive_cache_safe_json_preflight=pass
shared_cross_root_identity_ledger=pass
cross_root_base_source_alias=refused
transitive_key_diagnostics_before_full_v45_validation=pass
chronology_diagnostics_before_full_v45_validation=pass
compile_preflight_before_base_or_chronology_validation=pass
build_validation_preflight_before_source_hashing=pass
structured_clone_snapshot=pass
pre_and_post_validation_digest_stability=pass
top_level_undefined_function_non_enumerable_symbol=refused
nested_base_undefined_function_non_enumerable_symbol_accessor_prototype_cycle_sparse=refused
nested_source_undefined_function_non_enumerable_symbol_accessor_cycle=refused
floor_v46_mutations=180
focused_pc48=pass
floor_v46=pass
no_magic_human=pass
release_check=pass
outside_human_dependency=false
graph_effect=none
RECEIPT
printf 'status=success\nphase=%s\nrepaired_commit=%s\nrepaired_tree=%s\n' "$phase" "$candidate_commit" "$candidate_tree" > /tmp/pc48-cache-v3-diagnostic.txt
cat /tmp/pc48-cache-v3-receipt.txt
