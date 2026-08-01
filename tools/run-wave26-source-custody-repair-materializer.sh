#!/usr/bin/env bash
set -euo pipefail

branch='agent/lake-allocator-war-wave26-source-custody-repair'
base='8f6fcf160d3c5ac0824263513337d21645cbd57f'
trigger='.github/tmp/wave26-source-custody-repair-trigger.json'
temporary_workflow='.github/workflows/temporary-wave26-source-custody-repair-materializer.yml'
runner='tools/run-wave26-source-custody-repair-materializer.sh'

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

const repairPolicyPath = 'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json';
const repair = readJson(repairPolicyPath);
const required = {
  'allocator-war-source': [repairPolicyPath, repair.paths.method, repair.paths.milestone],
  'allocator-war-lake-actions': [repair.paths.projection],
  'allocator-war-reports': [repair.paths.report]
};

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
addSorted(policy.projection_contract.allowed_generated_paths, repair.paths.projection);
policy.boundaries.wave_26_source_custody_repair_changes_result_state = false;
policy.boundaries.wave_26_research_sources_establish_public_interest_gate = false;
policy.boundaries.wave_26_source_custody_repair_is_evidence = false;
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
for (const relative of [repairPolicyPath, repair.paths.projection, repair.paths.report, repair.paths.method, repair.paths.milestone]) {
  addSorted(lakePolicy.authoritative_roots, relative);
}
lakePolicy.boundaries.wave_26_source_custody_repair_proves_evidence = false;
lakePolicy.boundaries.wave_26_research_sources_prove_public_interest_gate = false;
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-wave26-source-custody-repair'] = 'node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs';
pkg.scripts['validate:lake-allocator-war-wave26-source-custody-repair'] = 'node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs && node test/lake-allocator-war-wave26-source-custody-repair.test.js';
pkg.scripts['ci:lake-allocator-war-wave26-source-custody-repair'] = 'node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs && node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs && npm run build:lake-allocator-war-wave26-source-custody-repair && npm run validate:lake-allocator-war-wave26-source-custody-repair';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-wave26-source-custody-repair')) {
  const marker = 'npm run validate:lake-allocator-war-targeted-closure-wave-26';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 26 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, marker + ' && npm run validate:lake-allocator-war-wave26-source-custody-repair');
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(installerPath, 'utf8');
if (!installer.includes(repairPolicyPath)) {
  const marker = "  'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl'\n]) roots.add(relative);";
  if (!installer.includes(marker)) throw new Error('Wave 21 installer Wave 26 marker missing');
  const insertion = [repairPolicyPath, repair.paths.projection, repair.paths.report, repair.paths.method, repair.paths.milestone];
  installer = installer.replace(
    marker,
    "  'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',\n" +
    quotedLines(insertion, '  ') +
    "\n]) roots.add(relative);"
  );
}
fs.writeFileSync(installerPath, installer);

const validator21Path = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator21 = fs.readFileSync(validator21Path, 'utf8');
if (!validator21.includes(repairPolicyPath)) {
  const sourceMarker = "      'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl'\n    ]],";
  if (!validator21.includes(sourceMarker)) throw new Error('Wave 21 validator source basin Wave 26 marker missing');
  validator21 = validator21.replace(
    sourceMarker,
    "      'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',\n" +
    quotedLines([repairPolicyPath, repair.paths.method, repair.paths.milestone], '      ') +
    "\n    ]],"
  );

  const actionMarker = "'build/lake-actions/allocator-war-targeted-closure-wave-26.json']],";
  const actionReplacement = "'build/lake-actions/allocator-war-targeted-closure-wave-26.json', '" + repair.paths.projection + "']],";
  if (!validator21.includes(actionMarker)) throw new Error('Wave 21 validator Wave 26 action marker missing');
  validator21 = validator21.replace(actionMarker, actionReplacement);

  const reportMarker = "'reports/lake-allocator-war-targeted-closure-wave-26.md']]";
  const reportReplacement = "'reports/lake-allocator-war-targeted-closure-wave-26.md', '" + repair.paths.report + "']]";
  if (!validator21.includes(reportMarker)) throw new Error('Wave 21 validator Wave 26 report marker missing');
  validator21 = validator21.replace(reportMarker, reportReplacement);

  const rootMarker = "    'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl'\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))";
  if (!validator21.includes(rootMarker)) throw new Error('Wave 21 validator authoritative-root Wave 26 marker missing');
  validator21 = validator21.replace(
    rootMarker,
    "    'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',\n" +
    quotedLines([repairPolicyPath, repair.paths.projection, repair.paths.report, repair.paths.method, repair.paths.milestone], '    ') +
    "\n  ]) if (!lakePolicy.authoritative_roots.includes(relative))"
  );
}
fs.writeFileSync(validator21Path, validator21);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(buildInstructionsPath, 'utf8');
const buildMarker = '3.26.1 **Allocator-war Wave 26 source-custody repair.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nThe public-interest institutional-gate result must cite the exact executive, Foreign Service, judicial, and procurement-control records that establish the gate. Status, hierarchy, demographic, electorate, and representation research may not substitute for institutional decision instruments.\n\nThe repair changes source custody and generated hashes only. It does not change a result state, execute downstream work, close a denominator, adjudicate evidence, create a finding, alter the graph, or clear publication.\n`;
}
fs.writeFileSync(buildInstructionsPath, buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeMarker = '## Wave 26 public-interest gate source custody';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nThe Wave 26 public-interest gate is bound to nine exact executive, Foreign Service, judicial, and procurement-control sources. Research sources remain confined to the separate legislative no-gate search. The source-custody repair preserves both result states, two downstream public-interest tasks, two blocked legislative-finance tasks, and zero evidence, finding, graph, or publication effect. See \`reports/lake-allocator-war-wave26-source-custody-repair.md\`.\n`;
}
fs.writeFileSync(readmePath, readme);
NODE

node --check tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
node --check tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
node --check tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
node --check test/lake-allocator-war-wave26-source-custody-repair.test.js

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
first_plan="$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
test "$first_plan" = "$(sha256sum data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
first_wave26="$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
first_wave26_results="$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
test "$first_wave26" = "$(sha256sum build/lake-actions/allocator-war-targeted-closure-wave-26.json | cut -d' ' -f1)"
test "$first_wave26_results" = "$(find data/acquisition/lake-allocator-war-wave-26 -type f -name '*.jsonl' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
first_repair="$(sha256sum build/lake-actions/allocator-war-wave26-source-custody-repair.json | cut -d' ' -f1)"
first_report="$(sha256sum reports/lake-allocator-war-wave26-source-custody-repair.md | cut -d' ' -f1)"
node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
test "$first_repair" = "$(sha256sum build/lake-actions/allocator-war-wave26-source-custody-repair.json | cut -d' ' -f1)"
test "$first_report" = "$(sha256sum reports/lake-allocator-war-wave26-source-custody-repair.md | cut -d' ' -f1)"
git add -A
git diff --check

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}" node tools/build-lake-open-pr-shadow.mjs

fixed_point_pass() {
  local label="$1"
  echo "$label"
  node tools/build-lake-allocator-war-targeted-closure-wave-26-source-plan.mjs
  node tools/build-lake-allocator-war-targeted-closure-wave-26.mjs
  node tools/build-lake-allocator-war-wave26-source-custody-repair.mjs
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
  LAW26_SC_SKIP_GIT=1 node tools/validate-lake-allocator-war-wave26-source-custody-repair.mjs
  git add -A
}

for pass in 1 2 3; do
  fixed_point_pass "Wave 26 source-custody repair fixed-point pass $pass"
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
  git add -A
  git diff --cached --check
}

validate_epoch
npm run release:check
for pass in 1 2 3; do
  fixed_point_pass "Wave 26 source-custody repair post-release seal pass $pass"
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
git commit -m 'Repair Wave 26 public-interest gate source custody'
git fetch origin "$branch"
test "$(git rev-parse "origin/$branch")" = "$original_sha"
git push origin "HEAD:$branch"
