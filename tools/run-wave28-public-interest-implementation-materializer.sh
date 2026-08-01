#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-public-interest-implementation-wave-28'
base='edc3543a97441cd03c0fa4afa24512d6d49083f3'
trigger='.github/tmp/wave28-public-interest-implementation-trigger.json'
temporary_workflow='.github/workflows/temporary-wave28-public-interest-implementation-materializer.yml'
runner='tools/run-wave28-public-interest-implementation-materializer.sh'

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

function insertQuotedValuesBeforeEnd(text, endMarker, values) {
  const lines = text.split('\n');
  const end = lines.findIndex(line => line.includes(endMarker));
  if (end < 0) throw new Error('end marker absent: ' + endMarker);
  let start = end - 1;
  while (start >= 0 && !lines[start].includes('for (const relative of [')) start -= 1;
  if (start < 0) throw new Error('array start absent before: ' + endMarker);
  const existing = new Set();
  for (let i = start + 1; i < end; i += 1) {
    const matches = [...lines[i].matchAll(/['"]([^'"]+)['"]/g)];
    for (const match of matches) existing.add(match[1]);
  }
  const missing = values.filter(value => !existing.has(value));
  if (!missing.length) return text;
  let last = end - 1;
  while (last > start && !lines[last].trim()) last -= 1;
  if (!lines[last].trim().endsWith(',')) lines[last] += ',';
  const indent = (lines[last].match(/^\s*/) || ['  '])[0];
  lines.splice(end, 0, ...missing.map((value, index) => indent + "'" + value + "'" + (index === missing.length - 1 ? '' : ',')));
  return lines.join('\n');
}

function insertIntoNamedExactArray(text, basinId, values) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.includes("['" + basinId + "', ["));
  if (start < 0) throw new Error(basinId + ': exact basin array start absent');
  const inlineClose = lines[start].lastIndexOf(']]');
  if (inlineClose > lines[start].indexOf("['" + basinId + "', [")) {
    const missing = values.filter(value => !lines[start].includes("'" + value + "'"));
    if (!missing.length) return text;
    const prefix = lines[start].slice(0, inlineClose);
    const suffix = lines[start].slice(inlineClose);
    const separator = prefix.trim().endsWith('[') ? '' : ', ';
    lines[start] = prefix + separator + missing.map(value => "'" + value + "'").join(', ') + suffix;
    return lines.join('\n');
  }
  let end = start + 1;
  while (end < lines.length && !/^\s*\]\],?\s*$/.test(lines[end])) end += 1;
  if (end >= lines.length) throw new Error(basinId + ': exact basin array end absent');
  const existing = new Set();
  for (let i = start + 1; i < end; i += 1) {
    const matches = [...lines[i].matchAll(/['"]([^'"]+)['"]/g)];
    for (const match of matches) existing.add(match[1]);
  }
  const missing = values.filter(value => !existing.has(value));
  if (!missing.length) return text;
  let last = end - 1;
  while (last > start && !lines[last].trim()) last -= 1;
  if (!lines[last].trim().endsWith(',')) lines[last] += ',';
  const indent = (lines[last].match(/^\s*/) || ['      '])[0];
  lines.splice(end, 0, ...missing.map((value, index) => indent + "'" + value + "'" + (index === missing.length - 1 ? '' : ',')));
  return lines.join('\n');
}

const wave28PolicyPath = 'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json';
const wave28 = readJson(wave28PolicyPath);
const resultPaths = wave28.queues
  .slice()
  .sort((a, b) => a.queue_sequence - b.queue_sequence)
  .map(queue => wave28.paths.result_root + '/' + queue.queue_ref.toLowerCase() + '.jsonl');
const required = {
  'allocator-war-source': [wave28PolicyPath, wave28.paths.method, wave28.paths.milestone, ...resultPaths],
  'allocator-war-lake-actions': [wave28.paths.projection],
  'allocator-war-reports': [wave28.paths.report]
};
const allRoots = Object.values(required).flat();

const policyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const policy = readJson(policyPath);
for (const [basinId, paths] of Object.entries(required)) {
  const basin = policy.basin_contract.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(basinId + ': Wave 21 basin missing');
  for (const relative of paths) {
    addSorted(basin.path_prefixes, relative);
    addSorted(basin.authoritative_entrypoints, relative);
  }
}
for (const relative of [wave28.paths.projection, ...resultPaths]) {
  addSorted(policy.projection_contract.allowed_generated_paths, relative);
}
policy.boundaries.wave_28_implementation_task_is_evidence_row = false;
policy.boundaries.wave_28_queue_admission_is_estate_adoption = false;
policy.boundaries.wave_28_queue_admission_closes_source_partial = false;
policy.boundaries.wave_28_formal_scope_is_complete_affected_roster = false;
policy.boundaries.wave_28_formal_authority_is_observed_use = false;
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

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of allRoots) addSorted(lakePolicy.authoritative_roots, relative);
lakePolicy.boundaries.wave_28_implementation_task_proves_evidence = false;
lakePolicy.boundaries.wave_28_queue_admission_proves_estate_adoption = false;
lakePolicy.boundaries.wave_28_queue_admission_closes_source_partial = false;
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-public-interest-implementation-wave-28'] = 'node tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs';
pkg.scripts['validate:lake-allocator-war-public-interest-implementation-wave-28'] = 'node tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs && node test/lake-allocator-war-public-interest-implementation-wave-28.test.js';
pkg.scripts['ci:lake-allocator-war-public-interest-implementation-wave-28'] = 'npm run build:lake-allocator-war-public-interest-implementation-wave-28 && npm run validate:lake-allocator-war-public-interest-implementation-wave-28';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-interest-implementation-wave-28')) {
  const marker = 'npm run validate:lake-allocator-war-public-interest-downstream-wave-27';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 27 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, marker + ' && npm run validate:lake-allocator-war-public-interest-implementation-wave-28');
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(installerPath, 'utf8');
installer = insertQuotedValuesBeforeEnd(installer, ']) roots.add(relative);', allRoots);
fs.writeFileSync(installerPath, installer);

const validator21Path = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator21 = fs.readFileSync(validator21Path, 'utf8');
validator21 = insertIntoNamedExactArray(validator21, 'allocator-war-source', required['allocator-war-source']);
validator21 = insertIntoNamedExactArray(validator21, 'allocator-war-lake-actions', required['allocator-war-lake-actions']);
validator21 = insertIntoNamedExactArray(validator21, 'allocator-war-reports', required['allocator-war-reports']);
validator21 = insertQuotedValuesBeforeEnd(validator21, ']) if (!lakePolicy.authoritative_roots.includes(relative))', allRoots);
fs.writeFileSync(validator21Path, validator21);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(buildInstructionsPath, 'utf8');
const buildMarker = '3.28 **Allocator-war public-interest implementation denominator — Wave 28.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nThe two partial Wave 27 public-interest results are decomposed into twelve exact acquisition obligations owned by five estates. Each obligation preserves the repaired nine-source institutional custody, defines a receipt-complete closure target, and requires controls, nulls, refusals, failed paths, no-action rows, comparators, and no-observed-effect rows where applicable.\n\nQueue admission is acquisition routing only. It does not close a source partial, establish estate adoption, adjudicate evidence, create a complete denominator or finding, modify the graph, or clear publication.\n`;
}
fs.writeFileSync(buildInstructionsPath, buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeMarker = '## Allocator-war public-interest implementation Wave 28';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 28 converts the two partial public-interest results into twelve exact implementation acquisition tasks across five estate owners. The queues preserve zero evidence, estate adoption, findings, graph effects, and publication authority. See \`reports/lake-allocator-war-public-interest-implementation-wave-28.md\`.\n`;
}
fs.writeFileSync(readmePath, readme);
NODE

node --check tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs
node --check tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs
node --check test/lake-allocator-war-public-interest-implementation-wave-28.test.js

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
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
node tools/build-lake-allocator-war-public-interest-downstream-wave-27.mjs
node tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs
first_projection="$(sha256sum build/lake-actions/allocator-war-public-interest-implementation-wave-28.json | cut -d' ' -f1)"
first_results="$(find data/acquisition/lake-allocator-war-wave-28 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-public-interest-implementation-wave-28.md | cut -d' ' -f1)"
node tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs
test "$first_projection" = "$(sha256sum build/lake-actions/allocator-war-public-interest-implementation-wave-28.json | cut -d' ' -f1)"
test "$first_results" = "$(find data/acquisition/lake-allocator-war-wave-28 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-public-interest-implementation-wave-28.md | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
  node tools/build-lake-allocator-war-public-interest-downstream-wave-27.mjs
  node tools/build-lake-allocator-war-public-interest-implementation-wave-28.mjs
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
  LAW28_SKIP_GIT=1 LAW28_SKIP_SHARDS=1 node tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 28 public-interest implementation fixed-point pass $pass"
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
  node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
  node test/lake-allocator-war-wave26-source-custody-repair.test.js
  node tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs
  node test/lake-allocator-war-public-interest-downstream-wave-27.test.js
  node tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs
  node test/lake-allocator-war-public-interest-implementation-wave-28.test.js
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 28 public-interest implementation post-release seal pass $pass"
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
node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
node test/lake-allocator-war-wave26-source-custody-repair.test.js
node tools/validate-lake-allocator-war-public-interest-downstream-wave-27.mjs
node test/lake-allocator-war-public-interest-downstream-wave-27.test.js
node tools/validate-lake-allocator-war-public-interest-implementation-wave-28.mjs
node test/lake-allocator-war-public-interest-implementation-wave-28.test.js
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
git commit -m 'Materialize allocator-war public-interest implementation Wave 28'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
