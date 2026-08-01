#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-denominator-closure-wave-25'
base='5911e735a2e14cccea2d64b8c9f7328d142dae3a'
trigger='.github/tmp/wave25-denominator-closure-trigger.json'
temporary_workflow='.github/workflows/temporary-wave25-denominator-closure-materializer.yml'
runner='tools/run-wave25-denominator-closure-materializer.sh'

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

const wave25PolicyPath = 'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json';
const wave25 = readJson(wave25PolicyPath);
const wave24Projection = readJson(wave25.paths.source_projection);
const queuePaths = wave24Projection.executions
  .slice()
  .sort((a, b) => a.packet_sequence - b.packet_sequence)
  .map(execution => wave25.paths.queue_root + '/' + execution.source_queue_ref.toLowerCase() + '.jsonl');

const policyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const policy = readJson(policyPath);
const required = {
  'allocator-war-source': [
    wave25PolicyPath,
    wave25.paths.method,
    wave25.paths.milestone,
    ...queuePaths
  ],
  'allocator-war-lake-actions': [wave25.paths.projection],
  'allocator-war-reports': [wave25.paths.report]
};
for (const [basinId, paths] of Object.entries(required)) {
  const basin = policy.basin_contract.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(basinId + ': Wave 21 basin missing');
  for (const relative of paths) {
    addSorted(basin.path_prefixes, relative);
    addSorted(basin.authoritative_entrypoints, relative);
  }
}
for (const relative of [wave25.paths.projection, ...queuePaths]) {
  addSorted(policy.projection_contract.allowed_generated_paths, relative);
}
policy.boundaries.wave_25_closure_task_is_evidence_row = false;
policy.boundaries.wave_25_downstream_task_may_bypass_gate_identification = false;
policy.boundaries.wave_25_priority_is_truth_or_merit_score = false;
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
  wave25PolicyPath,
  wave25.paths.projection,
  wave25.paths.report,
  wave25.paths.method,
  wave25.paths.milestone,
  ...queuePaths
];
const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of roots) addSorted(lakePolicy.authoritative_roots, relative);
lakePolicy.boundaries.wave_25_closure_task_proves_evidence = false;
lakePolicy.boundaries.wave_25_gate_unspecified_allows_downstream_bypass = false;
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-denominator-closure-wave-25'] = 'node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs';
pkg.scripts['validate:lake-allocator-war-denominator-closure-wave-25'] = 'node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs && node test/lake-allocator-war-denominator-closure-wave-25.test.js';
pkg.scripts['ci:lake-allocator-war-denominator-closure-wave-25'] = 'npm run build:lake-allocator-war-denominator-closure-wave-25 && npm run validate:lake-allocator-war-denominator-closure-wave-25';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-denominator-closure-wave-25')) {
  const marker = 'npm run validate:lake-allocator-war-lead-execution-wave-24';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 24 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, marker + ' && npm run validate:lake-allocator-war-denominator-closure-wave-25');
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(installerPath, 'utf8');
if (!installer.includes(wave25PolicyPath)) {
  const marker = "  'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl'\n]) roots.add(relative);";
  if (!installer.includes(marker)) throw new Error('Wave 21 installer Wave 24 marker missing');
  const insertion = [
    wave25PolicyPath,
    wave25.paths.projection,
    wave25.paths.report,
    wave25.paths.method,
    wave25.paths.milestone,
    ...queuePaths
  ];
  installer = installer.replace(
    marker,
    "  'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',\n" +
    quotedLines(insertion, '  ') +
    "\n]) roots.add(relative);"
  );
}
fs.writeFileSync(installerPath, installer);

const validator21Path = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator21 = fs.readFileSync(validator21Path, 'utf8');
if (!validator21.includes(wave25PolicyPath)) {
  const sourceMarker = "      'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl'\n    ]],";
  if (!validator21.includes(sourceMarker)) throw new Error('Wave 21 validator source basin marker missing');
  const sourceInsertion = [
    wave25PolicyPath,
    wave25.paths.method,
    wave25.paths.milestone,
    ...queuePaths
  ];
  validator21 = validator21.replace(
    sourceMarker,
    "      'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',\n" +
    quotedLines(sourceInsertion, '      ') +
    "\n    ]],"
  );

  const actionsMarker = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json', 'build/lake-actions/allocator-war-lead-execution-wave-24.json']],";
  const actionsReplacement = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json', 'build/lake-actions/allocator-war-lead-execution-wave-24.json', '" + wave25.paths.projection + "']],";
  if (!validator21.includes(actionsMarker)) throw new Error('Wave 21 validator action basin marker missing');
  validator21 = validator21.replace(actionsMarker, actionsReplacement);

  const reportsMarker = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md', 'reports/lake-allocator-war-lead-execution-wave-24.md']]";
  const reportsReplacement = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md', 'reports/lake-allocator-war-lead-execution-wave-24.md', '" + wave25.paths.report + "']]";
  if (!validator21.includes(reportsMarker)) throw new Error('Wave 21 validator report basin marker missing');
  validator21 = validator21.replace(reportsMarker, reportsReplacement);

  const rootMarker = "    'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl'\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))";
  if (!validator21.includes(rootMarker)) throw new Error('Wave 21 validator authoritative-root marker missing');
  const rootInsertion = [
    wave25PolicyPath,
    wave25.paths.projection,
    wave25.paths.report,
    wave25.paths.method,
    wave25.paths.milestone,
    ...queuePaths
  ];
  validator21 = validator21.replace(
    rootMarker,
    "    'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',\n" +
    quotedLines(rootInsertion, '    ') +
    "\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))"
  );
}
fs.writeFileSync(validator21Path, validator21);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(buildInstructionsPath, 'utf8');
const buildMarker = '3.25 **Allocator-war denominator closure fan-out — Wave 25.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nWave 25 converts each explicit Wave 24 unavailable obligation into one deterministic estate-owned closure task. Gate-unspecified packets receive one G0 gate-identification task, and all downstream tasks remain blocked until that task terminates.\n\nClosure queues are work-ordering surfaces, not evidence. Priority is not truth or merit; unavailable rows are not nulls; repeated tasks do not establish prevalence or relationship; graph effect and publication authority remain zero.\n`;
}
fs.writeFileSync(buildInstructionsPath, buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeMarker = '## Allocator-war denominator closure fan-out';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 25 converts forty explicit missing-record obligations into eleven estate-owned closure queues. Thirty-six tasks are ready for targeted acquisition, while four downstream tasks remain blocked behind two gate-identification tasks. Evidence rows, findings, graph effects, and publication clearances remain zero. See \`reports/lake-allocator-war-denominator-closure-wave-25.md\`.\n`;
}
fs.writeFileSync(readmePath, readme);
NODE

node --check tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
node --check tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
node --check test/lake-allocator-war-denominator-closure-wave-25.test.js

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
first_projection="$(sha256sum build/lake-actions/allocator-war-denominator-closure-wave-25.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-denominator-closure-wave-25.md | cut -d' ' -f1)"
first_queues="$(find data/acquisition/lake-allocator-war-wave-25 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-denominator-closure-wave-25.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-denominator-closure-wave-25.md | cut -d' ' -f1)"
test "$first_queues" = "$(find data/acquisition/lake-allocator-war-wave-25 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-denominator-closure-wave-25.mjs
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
  LAW25_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-denominator-closure-wave-25.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 25 fixed-point pass $pass"
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
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 25 post-release seal pass $pass"
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
git commit -m 'Fan out allocator-war denominator closure Wave 25'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
