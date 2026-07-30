#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function writeJson(relative, value) { fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }

const policy = readJson('data/project/lake-generator-contracts-wave-19-policy.json');
const registry = readJson(policy.paths.registry);
const index = readJson('build/lake-index.json');
const objects = readJson('build/lake-object-index.json');
const gaps = readJson('build/lake-index-gaps.json');
const reportPath = 'reports/lake-index-census.md';

assert.equal(registry.schema_version, 'lake-generator-contract-registry-wave-19@1');
assert.equal(registry.action_closures.length, registry.counts.generator_action_closures);
assert.equal(registry.counts.open_generator_actions_after, 0);

const closureByCompound = new Map(registry.action_closures.map(action => [`${action.id_key}:${action.id_value}`, action]));
let observed = 0;
for (const object of objects.objects ?? []) {
  const action = closureByCompound.get(`${object.id_key}:${object.id_value}`);
  if (!action) continue;
  object.generator_contract_action_raw = true;
  object.generator_contract_action_open = false;
  object.generator_action_key = action.generator_action_key;
  object.generator_contract_keys = action.generator_contract_keys;
  object.generator_contract_closure_basis = action.closure_basis;
  observed += 1;
}
assert.equal(observed, registry.action_closures.length, `Wave 19 target objects observed ${observed}/${registry.action_closures.length}`);

const counts = index.summary.counts;
counts.identifier_topology_generator_contract_actions_raw = registry.counts.open_generator_actions_before;
counts.identifier_topology_generator_contract_actions_open = registry.counts.open_generator_actions_after;
counts.generator_contract_registry_contracts = registry.counts.generator_contracts;
counts.generator_contract_registry_variants = registry.counts.registered_variants;
counts.generator_contract_action_closures = registry.counts.generator_action_closures;
counts.generator_contract_action_to_contract_links = registry.counts.action_to_contract_links;
index.summary.boundaries.generator_contract_closure_proves_identity = false;
index.summary.boundaries.generator_contract_closure_proves_truth = false;
index.summary.boundaries.generator_contract_cross_key_join_authorized = false;
index.summary.boundaries.generator_contract_graph_effect = 'none';

objects.generator_contract_semantics = {
  schema_version: 'lake-generator-contract-semantics@1',
  registry_path: policy.paths.registry,
  contracts: registry.counts.generator_contracts,
  action_closures: registry.counts.generator_action_closures,
  registered_variants: registry.counts.registered_variants,
  open_actions: 0,
  boundaries: policy.boundaries
};

gaps.generator_contracts = {
  registry_path: policy.paths.registry,
  raw_actions: registry.counts.open_generator_actions_before,
  open_actions: 0,
  closed_actions: registry.counts.generator_action_closures,
  contract_count: registry.counts.generator_contracts,
  registered_variants: registry.counts.registered_variants,
  open_action_rows: [],
  review_required_to_decide: false,
  graph_effect: 'none'
};

writeJson('build/lake-index.json', index);
writeJson('build/lake-object-index.json', objects);
writeJson('build/lake-index-gaps.json', gaps);

const start = '<!-- WAVE19-GENERATOR-CONTRACTS:START -->';
const end = '<!-- WAVE19-GENERATOR-CONTRACTS:END -->';
const block = `${start}\n## Generator contracts — Wave 19\n\n\`\`\`text\nraw generator actions:       ${registry.counts.open_generator_actions_before}\nopen generator actions:      0\nactive generator contracts:  ${registry.counts.generator_contracts}\nregistered variants:         ${registry.counts.registered_variants}\naction-to-contract links:    ${registry.counts.action_to_contract_links}\nreview required to decide:   false\ngraph effect:                none\n\`\`\`\n\nThe raw Wave 18 action denominator remains visible. Wave 19 closes those actions through named exact-path and projection-family serialization contracts; it does not force valid cross-family projections into byte equality or infer identity, truth, publication status, or graph semantics.\n${end}`;
let report = fs.readFileSync(full(reportPath), 'utf8');
const existing = new RegExp(`${start}[\\s\\S]*?${end}`, 'm');
report = existing.test(report) ? report.replace(existing, block) : `${report.trimEnd()}\n\n${block}\n`;
fs.writeFileSync(full(reportPath), report);

console.log('lake generator-contract Wave 19 overlay stabilized');
console.log(`  actions observed / open: ${observed} / 0`);
console.log(`  contracts / variants / links: ${registry.counts.generator_contracts} / ${registry.counts.registered_variants} / ${registry.counts.action_to_contract_links}`);
