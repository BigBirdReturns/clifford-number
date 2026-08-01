from pathlib import Path

target = Path('/tmp/materialize-sg12-candidate-wave.mjs')
source = target.read_text()

replacements = [
  (
    """const EXPECTED_MAIN = process.env.EXPECTED_MAIN;
if (!/^[0-9a-f]{40}$/.test(EXPECTED_MAIN || '')) throw new Error('EXPECTED_MAIN must be a full commit SHA');
const FINAL_PR_NUMBER = Number(process.env.FINAL_PR_NUMBER);
if (!Number.isInteger(FINAL_PR_NUMBER) || FINAL_PR_NUMBER <= 0) throw new Error('FINAL_PR_NUMBER must be a positive integer');
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['fetch', '--no-tags', 'origin', 'main']);
const liveMain = capture('git', ['rev-parse', 'origin/main']);
if (liveMain !== EXPECTED_MAIN) throw new Error(`main lease mismatch before materialization: ${EXPECTED_MAIN} -> ${liveMain}`);
run('git', ['checkout', '-B', 'agent/ssc-wave02-candidate-discovery-sg12', liveMain]);
""",
    """const MINIMUM_MAIN = process.env.MINIMUM_MAIN;
if (!/^[0-9a-f]{40}$/.test(MINIMUM_MAIN || '')) throw new Error('MINIMUM_MAIN must be a full commit SHA');
const FINAL_PR_NUMBER = Number(process.env.FINAL_PR_NUMBER);
if (!Number.isInteger(FINAL_PR_NUMBER) || FINAL_PR_NUMBER <= 0) throw new Error('FINAL_PR_NUMBER must be a positive integer');
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['fetch', '--no-tags', 'origin', 'main']);
const liveMain = capture('git', ['rev-parse', 'origin/main']);
const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', MINIMUM_MAIN, liveMain], { cwd: root });
if (ancestry.status !== 0) throw new Error(`live main ${liveMain} is not descended from certified minimum ${MINIMUM_MAIN}`);
const interveningMainPaths = liveMain === MINIMUM_MAIN
  ? []
  : capture('git', ['diff', '--name-only', MINIMUM_MAIN, liveMain]).split(/\\n/).filter(Boolean).sort();
const protectedStartPatterns = [
  /^package\\.json$/,
  /^\\.github\\/workflows\\/(project-stable-ground-sg1[12]|status-sovereignty-wave-02-second-party-review)\\.yml$/,
  /^data\\/project\\/project-stable-ground-/,
  /^data\\/project\\/status-sovereignty-/,
  /^data\\/research\\/status-sovereignty-wave-02-second-party-review-/,
  /^schemas\\/status-sovereignty-wave-02-second-party-review-/,
  /^docs\\/(ssc-wave-02-second-party-review-intake|milestones\\/(m05-status-sovereignty-wave-02-second-party-review|project-stable-ground-sg1[12]))\\.md$/,
  /^tools\\/(build|validate)-(status-sovereignty-wave-02-second-party-review|project-stable-ground-sg1[12])\\.mjs$/,
  /^test\\/(status-sovereignty-wave-02-second-party-review|project-stable-ground-sg1[12])\\.test\\.js$/,
  /^build\\/core-thesis\\/status-sovereignty\\//,
  /^reports\\/core-thesis\\/status-sovereignty\\//,
  /^reports\\/core-thesis\\/stable-ground\\/sg1[12]\\//,
  /^build\\/core-thesis\\/poof-clifford-ecology\\//,
  /^reports\\/core-thesis\\/poof-clifford-ecology\\//,
  /^data\\/project\\/poof-clifford-ecology-release-manifest\\.json$/,
  /^tools\\/build-pages\\.mjs$/
];
const interveningProtectedOverlap = interveningMainPaths.filter((rel) =>
  protectedStartPatterns.some((pattern) => pattern.test(rel))
);
if (interveningProtectedOverlap.length) {
  throw new Error(`main advanced across protected SG-12 paths:\\n${interveningProtectedOverlap.join('\\n')}`);
}
console.log(`certified dynamic start: ${MINIMUM_MAIN} -> ${liveMain}; ${interveningMainPaths.length} intervening paths; 0 protected overlaps`);
run('git', ['checkout', '-B', 'agent/ssc-wave02-candidate-discovery-sg12', liveMain]);
"""
  ),
  (
    """  `main=${liveMain}`,
  `final_pr=${FINAL_PR_NUMBER}`,
""",
    """  `minimum_main=${MINIMUM_MAIN}`,
  `main=${liveMain}`,
  `intervening_main_paths=${interveningMainPaths.length}`,
  'intervening_protected_overlap=0',
  `final_pr=${FINAL_PR_NUMBER}`,
"""
  ),
  (
    "const base = loadSg11HistoricalContext({ historicalVerifier: () => [] });\\nassert.deepEqual(validateSg11(base), []);",
    "const base = loadSg11HistoricalContext({ historicalVerifier: () => [] });\\nconst clone = () => {\\n  const { historicalVerifier, ...data } = base;\\n  return { ...structuredClone(data), historicalVerifier };\\n};\\nassert.deepEqual(validateSg11(base), []);"
  ),
  (
    "for (const mutate of cases) {\\n  const context = structuredClone(base);\\n  mutate(context);\\n  assert.ok(validateSg11(context).length > 0);\\n}",
    "for (const mutate of cases) {\\n  const context = clone();\\n  mutate(context);\\n  assert.ok(validateSg11(context).length > 0);\\n}"
  ),
  (
    "const base = loadSg12Context({ gitVerifier: () => [] });\\nassert.deepEqual(validateSg12(base), []);",
    "const base = loadSg12Context({ gitVerifier: () => [] });\\nconst clone = () => {\\n  const { gitVerifier, ...data } = base;\\n  return { ...structuredClone(data), gitVerifier };\\n};\\nassert.deepEqual(validateSg12(base), []);"
  ),
  (
    "for (const [name, mutate] of cases) {\\n  const context = structuredClone(base);\\n  mutate(context);\\n  assert.ok(validateSg12(context).length > 0, name);\\n}",
    "for (const [name, mutate] of cases) {\\n  const context = clone();\\n  mutate(context);\\n  assert.ok(validateSg12(context).length > 0, name);\\n}"
  )
]

for index, (old, new) in enumerate(replacements, start=1):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'materializer repair {index} expected once, observed {count}')
    source = source.replace(old, new, 1)

target.write_text(source)
