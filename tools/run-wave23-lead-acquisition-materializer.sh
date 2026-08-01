#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-lead-acquisition-wave-23'
base='28328956d9b0d413555629aaafa093a2c6a83195'
trigger='.github/tmp/wave23-lead-acquisition-trigger.json'
temporary_workflow='.github/workflows/temporary-wave23-lead-acquisition-materializer.yml'
runner='tools/run-wave23-lead-acquisition-materializer.sh'

# The connector removes the temporary workflow before checkout.
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

const policyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const policy = readJson(policyPath);
const wave23 = readJson('data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json');
const required = {
  'allocator-war-source': [
    'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
    wave23.paths.method,
    wave23.paths.milestone
  ],
  'allocator-war-lake-actions': [wave23.paths.projection],
  'allocator-war-reports': [wave23.paths.report]
};
for (const [basinId, paths] of Object.entries(required)) {
  const basin = policy.basin_contract.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(basinId + ': Wave 21 basin missing');
  for (const relative of paths) {
    addSorted(basin.path_prefixes, relative);
    addSorted(basin.authoritative_entrypoints, relative);
  }
}
addSorted(policy.projection_contract.allowed_generated_paths, wave23.paths.projection);
policy.boundaries.wave_23_lead_selection_is_evidence_acquisition = false;
policy.boundaries.wave_23_ready_for_acquisition_is_execution_complete = false;
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
  'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
  wave23.paths.projection,
  wave23.paths.report,
  wave23.paths.method,
  wave23.paths.milestone
];
const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of roots) addSorted(lakePolicy.authoritative_roots, relative);
lakePolicy.boundaries.wave_23_lead_selection_proves_evidence = false;
lakePolicy.boundaries.wave_23_ready_for_acquisition_proves_execution = false;
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-lead-acquisition-wave-23'] = 'node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs';
pkg.scripts['validate:lake-allocator-war-lead-acquisition-wave-23'] = 'node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs && node test/lake-allocator-war-lead-acquisition-wave-23.test.js';
pkg.scripts['ci:lake-allocator-war-lead-acquisition-wave-23'] = 'npm run build:lake-allocator-war-lead-acquisition-wave-23 && npm run validate:lake-allocator-war-lead-acquisition-wave-23';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-lead-acquisition-wave-23')) {
  const marker = 'npm run validate:lake-allocator-war-estate-execution-wave-22';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 22 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, marker + ' && npm run validate:lake-allocator-war-lead-acquisition-wave-23');
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(installerPath, 'utf8');
const installerMarker = "  'docs/milestones/lake-allocator-war-estate-execution-wave-22.md'\n";
if (!installer.includes("lake-allocator-war-lead-acquisition-wave-23-policy.json")) {
  if (!installer.includes(installerMarker)) throw new Error('Wave 21 installer Wave 22 marker missing');
  installer = installer.replace(installerMarker,
    "  'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',\n" +
    "  'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',\n" +
    "  'build/lake-actions/allocator-war-lead-acquisition-wave-23.json',\n" +
    "  'reports/lake-allocator-war-lead-acquisition-wave-23.md',\n" +
    "  'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',\n" +
    "  'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md'\n"
  );
}
fs.writeFileSync(installerPath, installer);

const validator21Path = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator21 = fs.readFileSync(validator21Path, 'utf8');
if (!validator21.includes('lake-allocator-war-lead-acquisition-wave-23-policy.json')) {
  const sourceMarker = "      'docs/milestones/lake-allocator-war-estate-execution-wave-22.md'\n    ]],";
  const sourceReplacement = "      'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',\n" +
    "      'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',\n" +
    "      'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',\n" +
    "      'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md'\n    ]],";
  if (!validator21.includes(sourceMarker)) throw new Error('Wave 21 validator source basin marker missing');
  validator21 = validator21.replace(sourceMarker, sourceReplacement);

  const actionsMarker = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json']],";
  const actionsReplacement = "['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json']],";
  if (!validator21.includes(actionsMarker)) throw new Error('Wave 21 validator action basin marker missing');
  validator21 = validator21.replace(actionsMarker, actionsReplacement);

  const reportsMarker = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md']]";
  const reportsReplacement = "['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md']]";
  if (!validator21.includes(reportsMarker)) throw new Error('Wave 21 validator report basin marker missing');
  validator21 = validator21.replace(reportsMarker, reportsReplacement);

  const rootMarker = "    'docs/milestones/lake-allocator-war-estate-execution-wave-22.md'\n  ])";
  const rootReplacement = "    'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',\n" +
    "    'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',\n" +
    "    'build/lake-actions/allocator-war-lead-acquisition-wave-23.json',\n" +
    "    'reports/lake-allocator-war-lead-acquisition-wave-23.md',\n" +
    "    'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',\n" +
    "    'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md'\n  ])";
  if (!validator21.includes(rootMarker)) throw new Error('Wave 21 validator authoritative-root marker missing');
  validator21 = validator21.replace(rootMarker, rootReplacement);
}
fs.writeFileSync(validator21Path, validator21);

const builderPath = 'tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs';
let builder = fs.readFileSync(builderPath, 'utf8');
builder = builder.replace(/\nfunction graphDigests\(\) \{[\s\S]*?\n\}\n\nfunction graphDigestsSafe\(\)/, '\nfunction graphDigestsSafe()');
fs.writeFileSync(builderPath, builder);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(buildInstructionsPath, 'utf8');
const buildMarker = '3.23 **Allocator-war lead acquisition launch — Wave 23.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nOne lead task per Wave 22 estate queue is selected by declared priority and source sequence, then equipped with an official-first retrieval contract and estate-specific source families. Lead selection is work ordering, not acquisition, review, truth, merit, prevalence, relationship, or estate adoption.\n\nEvery packet retains authority state, controls, refusals, negative search, exact receipt fields, a separate future result-ledger path, zero evidence rows, zero graph effect, and blocked publication.\n`;
}
fs.writeFileSync(buildInstructionsPath, buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeMarker = '## Allocator-war lead acquisition launch';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 23 selects one lead acquisition packet from each of the eleven Wave 22 estate queues and attaches official-first source families, exact receipt requirements, negative-search duties, and packet-specific future result ledgers. No evidence rows, findings, graph effects, or publication clearances are created. See \`reports/lake-allocator-war-lead-acquisition-wave-23.md\`.\n`;
}
fs.writeFileSync(readmePath, readme);
NODE

node --check tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
node --check tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
node --check test/lake-allocator-war-lead-acquisition-wave-23.test.js

rm -f "$trigger" "$temporary_workflow" "$runner"

node tools/install-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-wave-21.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-estate-execution-wave-22.mjs
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
first_projection="$(sha256sum build/lake-actions/allocator-war-lead-acquisition-wave-23.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-lead-acquisition-wave-23.md | cut -d' ' -f1)"
node tools/build-lake-allocator-war-lead-acquisition-wave-23.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-lead-acquisition-wave-23.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-lead-acquisition-wave-23.md | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
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
  LAW23_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-lead-acquisition-wave-23.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 23 fixed-point pass $pass"
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
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 23 post-release seal pass $pass"
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
git commit -m 'Launch allocator-war lead acquisition Wave 23'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
