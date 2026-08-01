#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-closure-execution-wave-26'
base='7ad3c012dd1dd441942fc1e6e71f147a9f63c949'
trigger='.github/tmp/wave26-targeted-closure-trigger.json'
temporary_workflow='.github/workflows/temporary-wave26-targeted-closure-materializer.yml'
runner='tools/run-wave26-targeted-closure-materializer.sh'

test -f "$trigger"
test ! -e "$temporary_workflow"
git merge-base --is-ancestor "$base" HEAD
original_sha="$(git rev-parse HEAD)"

node - <<'NODE'
const fs = require('node:fs');

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const writeJson = (path, value) => fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const addSorted = (array, value) => {
  if (!array.includes(value)) array.push(value);
  array.sort();
};
const quotedLines = (values, indent) => values
  .map((value, index) => indent + "'" + value + "'" + (index === values.length - 1 ? '' : ','))
  .join('\n');

const wave26PolicyPath = 'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json';
const wave26 = readJson(wave26PolicyPath);
const sourceProjection = readJson(wave26.paths.source_projection);
const resultPaths = sourceProjection.queues
  .slice()
  .sort((a, b) => a.queue_sequence - b.queue_sequence)
  .map(queue => wave26.paths.result_root + '/' + queue.source_queue_ref.toLowerCase() + '.jsonl');

const policyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const policy = readJson(policyPath);
const required = {
  'allocator-war-source': [
    wave26PolicyPath,
    wave26.paths.source_plan,
    wave26.paths.method,
    wave26.paths.milestone,
    ...resultPaths
  ],
  'allocator-war-lake-actions': [wave26.paths.projection],
  'allocator-war-reports': [wave26.paths.report]
};
for (const [basinId, paths] of Object.entries(required)) {
  const basin = policy.basin_contract.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(basinId + ': Wave 21 basin missing');
  for (const relative of paths) {
    addSorted(basin.path_prefixes, relative);
    addSorted(basin.authoritative_entrypoints, relative);
  }
}
for (const relative of [wave26.paths.projection, ...resultPaths]) {
  addSorted(policy.projection_contract.allowed_generated_paths, relative);
}
policy.boundaries.wave_26_closure_result_is_evidence_row = false;
policy.boundaries.wave_26_newly_unblocked_executes_same_wave = false;
policy.boundaries.wave_26_no_qualifying_gate_proves_no_future_gate = false;
writeJson(policyPath, policy);

const basinPath = 'data/project/lake-basin-registry.json';
const basinRegistry = readJson(basinPath);
const updatedById = new Map(policy.basin_contract.map(row => [row.basin_id, row]));
basinRegistry.basins = basinRegistry.basins.map(row => updatedById.get(row.basin_id) ?? row);
for (const basin of policy.basin_contract) {
  if (!basinRegistry.basins.some(row => row.basin_id === basin.basin_id)) basinRegistry.basins.push(basin);
}
basinRegistry.basins.sort((a, b) => a.basin_id.localeCompare(b.basin_id));
writeJson(basinPath, basinRegistry);

const roots = [
  wave26PolicyPath,
  wave26.paths.source_plan,
  wave26.paths.projection,
  wave26.paths.report,
  wave26.paths.method,
  wave26.paths.milestone,
  ...resultPaths
];
const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of roots) addSorted(lakePolicy.authoritative_roots, relative);
lakePolicy.boundaries.wave_26_closure_result_proves_evidence = false;
lakePolicy.boundaries.wave_26_newly_unblocked_executes_same_wave = false;
lakePolicy.boundaries.wave_26_no_gate_proves_no_future_gate = false;
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-targeted-closure-wave-26'] = 'node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs';
pkg.scripts['validate:lake-allocator-war-targeted-closure-wave-26'] = 'node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs && node test/lake-allocator-war-targeted-closure-wave-26.test.js';
pkg.scripts['ci:lake-allocator-war-targeted-closure-wave-26'] = 'npm run build:lake-allocator-war-targeted-closure-wave-26 && npm run validate:lake-allocator-war-targeted-closure-wave-26';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-targeted-closure-wave-26')) {
  const marker = 'npm run validate:lake-allocator-war-denominator-closure-wave-25';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 25 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, marker + ' && npm run validate:lake-allocator-war-targeted-closure-wave-26');
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(installerPath, 'utf8');
if (!installer.includes(wave26PolicyPath)) {
  const marker = "  'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl'\n]) roots.add(relative);";
  if (!installer.includes(marker)) throw new Error('Wave 21 installer Wave 25 marker missing');
  const insertion = [
    wave26PolicyPath,
    wave26.paths.source_plan,
    wave26.paths.projection,
    wave26.paths.report,
    wave26.paths.method,
    wave26.paths.milestone,
    ...resultPaths
  ];
  installer = installer.replace(
    marker,
    "  'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',\n" +
    quotedLines(insertion, '  ') +
    "\n]) roots.add(relative);"
  );
}
fs.writeFileSync(installerPath, installer);

const validator21Path = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator21 = fs.readFileSync(validator21Path, 'utf8');
if (!validator21.includes(wave26PolicyPath)) {
  const sourceMarker = "      'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl'\n    ]],";
  if (!validator21.includes(sourceMarker)) throw new Error('Wave 21 validator source basin Wave 25 marker missing');
  const sourceInsertion = [
    wave26PolicyPath,
    wave26.paths.source_plan,
    wave26.paths.method,
    wave26.paths.milestone,
    ...resultPaths
  ];
  validator21 = validator21.replace(
    sourceMarker,
    "      'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',\n" +
    quotedLines(sourceInsertion, '      ') +
    "\n    ]],"
  );

  const actionsMarker = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json', 'build/lake-actions/allocator-war-lead-execution-wave-24.json', 'build/lake-actions/allocator-war-denominator-closure-wave-25.json']],";
  const actionsReplacement = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json', 'build/lake-actions/allocator-war-lead-execution-wave-24.json', 'build/lake-actions/allocator-war-denominator-closure-wave-25.json', '" + wave26.paths.projection + "']],";
  if (!validator21.includes(actionsMarker)) throw new Error('Wave 21 validator action basin Wave 25 marker missing');
  validator21 = validator21.replace(actionsMarker, actionsReplacement);

  const reportsMarker = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md', 'reports/lake-allocator-war-lead-execution-wave-24.md', 'reports/lake-allocator-war-denominator-closure-wave-25.md']]";
  const reportsReplacement = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md', 'reports/lake-allocator-war-lead-execution-wave-24.md', 'reports/lake-allocator-war-denominator-closure-wave-25.md', '" + wave26.paths.report + "']]";
  if (!validator21.includes(reportsMarker)) throw new Error('Wave 21 validator report basin Wave 25 marker missing');
  validator21 = validator21.replace(reportsMarker, reportsReplacement);

  const rootMarker = "    'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl'\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))";
  if (!validator21.includes(rootMarker)) throw new Error('Wave 21 validator authoritative-root Wave 25 marker missing');
  const rootInsertion = [
    wave26PolicyPath,
    wave26.paths.source_plan,
    wave26.paths.projection,
    wave26.paths.report,
    wave26.paths.method,
    wave26.paths.milestone,
    ...resultPaths
  ];
  validator21 = validator21.replace(
    rootMarker,
    "    'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',\n" +
    quotedLines(rootInsertion, '    ') +
    "\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))"
  );
}
fs.writeFileSync(validator21Path, validator21);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(buildInstructionsPath, 'utf8');
const buildMarker = '3.26 **Allocator-war targeted closure execution — Wave 26.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nWave 26 executes only Wave 25 tasks already marked ready, records bounded source outcomes, preserves all blocked tasks, and moves newly eligible downstream work into a later-wave state rather than executing it immediately.\n\nExecution results remain acquisition records. Partial does not mean complete; unavailable-after-search is not null; a completed gate-identification task does not close its downstream denominator; a no-gate result does not foreclose future source-addressed gates. Evidence, findings, graph effects, and publication authority remain zero.\n`;
}
fs.writeFileSync(buildInstructionsPath, buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeMarker = '## Allocator-war targeted closure execution';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 26 executes thirty-six ready closure tasks, preserves four blocked tasks, identifies one bounded public-interest institutional gate, and records one no-qualifying-gate result for the legislative-political-finance lane. Two downstream tasks become eligible only for a later wave. Complete denominators, evidence rows, findings, graph effects, and publication clearances remain zero. See \`reports/lake-allocator-war-targeted-closure-wave-26.md\`.\n`;
}
fs.writeFileSync(readmePath, readme);
NODE

node --check tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
node --check tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
node --check test/lake-allocator-war-targeted-closure-wave-26.test.js

rm -f "$trigger" "$temporary_workflow" "$runner"

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-lead-execution-wave-24.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
first_projection="$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-targeted-closure-wave-26.md | cut -d' ' -f1)"
first_results="$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-targeted-closure-wave-26.md | cut -d' ' -f1)"
test "$first_results" = "$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-index.mjs
  node tools/stabilize-lake-index.mjs
  node tools/stabilize-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-semantics.mjs
  node tools/stabilize-lake-receipt-custody-wave-20.mjs
  node tools/stabilize-lake-allocator-war-wave-21.mjs
  node tools/build-lake-gap-summary.mjs
  node tools/validate-lake-index.mjs
  node tools/validate-lake-receipt-semantics.mjs
  node tools/validate-lake-gap-summary.mjs
  node tools/reconcile-lake-identifier-topology-wave-18.mjs
  node tools/reconcile-lake-generator-contracts-wave-19.mjs
  node tools/reconcile-lake-receipt-custody-wave-20.mjs
  node tools/reconcile-lake-allocator-war-wave-21.mjs
  LAW26_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 26 fixed-point pass $pass"
done

validate_epoch() {
  node tools/shard-lake-index.mjs
  node tools/validate-lake-index-shards.mjs
  node tools/build-lake-basin-index.mjs
  node tools/validate-lake-basin-index.mjs
  node tools/validate-lake-residual-frontier-wave-17.mjs
  node test/lake-residual-frontier-wave-17.test.js
  node tools/validate-lake-identifier-topology-wave-18.mjs
  node test/lake-identifier-topology-wave-18.test.js
  node tools/validate-lake-generator-contracts-wave-19.mjs
  node test/lake-generator-contracts-wave-19.test.js
  node tools/validate-lake-receipt-custody-wave-20.mjs
  node test/lake-receipt-custody-wave-20.test.js
  node tools/validate-lake-allocator-war-wave-21.mjs
  node test/lake-allocator-war-wave-21.test.js
  node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
  node test/lake-allocator-war-estate-execution-wave-22.test.js
  node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  node test/lake-allocator-war-lead-acquisition-wave-23.test.js
  node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
  node test/lake-allocator-war-lead-execution-wave-24.test.js
  node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
  node test/lake-allocator-war-denominator-closure-wave-25.test.js
  node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
  node test/lake-allocator-war-targeted-closure-wave-26.test.js
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 26 post-release seal pass $pass"
done
validate_epoch

staged_tree="$(git write-tree)"
git restore --worktree .
git clean -fd
node tools/validate-lake-index-shards.mjs
node tools/validate-lake-basin-index.mjs
node tools/validate-lake-residual-frontier-wave-17.mjs
node tools/validate-lake-identifier-topology-wave-18.mjs
node tools/validate-lake-generator-contracts-wave-19.mjs
node tools/validate-lake-receipt-custody-wave-20.mjs
node tools/validate-lake-allocator-war-wave-21.mjs
node test/lake-allocator-war-wave-21.test.js
node tools/validate-lake-allocator-war-estate-execution-wave-22.mjs
node test/lake-allocator-war-estate-execution-wave-22.test.js
node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node test/lake-allocator-war-lead-acquisition-wave-23.test.js
node tools/validate-lake-allocator-war-lead-execution-wave-24.mjs
node test/lake-allocator-war-lead-execution-wave-24.test.js
node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
node test/lake-allocator-war-denominator-closure-wave-25.test.js
node tools/validate-lake-allocator-war-targeted-closure-wave-26.mjs
node test/lake-allocator-war-targeted-closure-wave-26.test.js
git add -A
git diff --cached --check
git diff --quiet
current_tree="$(git write-tree)"
if [[ "$current_tree" != "$staged_tree" ]]; then
  git diff --name-status "$staged_tree" "$current_tree"
  exit 1
fi

test ! -e "$trigger"
test ! -e "$temporary_workflow"
test ! -e "$runner"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git diff --cached --check
test "$(git write-tree)" = "$staged_tree"
git commit -m 'Execute allocator-war targeted closure Wave 26'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
