#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

let failures = 0;
function fail(message) { console.error(`- ${message}`); failures += 1; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function pointerTemplate(pointer) { return String(pointer ?? '').replace(/\/line-\d+(?=\/|$)/g, '/line-*').replace(/\/\d+(?=\/|$)/g, '/*'); }
function pathFamily(file) {
  const parts = String(file).split('/');
  if (file.startsWith('build/lake-index/')) return 'build/lake-index';
  if (file.startsWith('build/lake-actions/')) return 'build/lake-actions';
  if (file.startsWith('build/cases/')) return 'build/cases';
  if (file.startsWith('build/briefings/')) return 'build/briefings';
  if (file.startsWith('build/core-thesis/')) return 'build/core-thesis';
  if (file.startsWith('build/estate-game-trails/')) return 'build/estate-game-trails';
  if (file.startsWith('build/estate-frontier/')) return 'build/estate-frontier';
  if (file.startsWith('build/estate-closures/')) return 'build/estate-closures';
  if (file.startsWith('build/')) return `build/${parts[1] ?? 'root'}`;
  if (file.startsWith('reports/core-thesis/')) return 'reports/core-thesis';
  if (file.startsWith('reports/')) return `reports/${parts[1] ?? 'root'}`;
  if (file.startsWith('estates/')) return 'estates';
  if (file.startsWith('gametrails/')) return 'gametrails';
  if (file.startsWith('briefs/')) return 'briefs';
  return parts[0] || 'root';
}

const policy = readJson('data/project/lake-generator-contracts-wave-19-policy.json');
const registry = readJson(policy.paths.registry);
const projection = readJson(policy.paths.projection);
const receipt = readJson(policy.paths.receipt);
const reconciliation = readJson(policy.paths.reconciliation);
const summary = readJson('build/lake-index/summary.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

for (const [artifact, schema] of [
  [policy, 'lake-generator-contracts-wave-19-policy@1'],
  [registry, 'lake-generator-contract-registry-wave-19@1'],
  [projection, 'lake-generator-contracts-wave-19@1'],
  [receipt, 'lake-generator-contracts-wave-19-receipt@1'],
  [reconciliation, 'lake-generator-contracts-wave-19-reconciliation@1']
]) if (artifact.schema_version !== schema) fail(`schema drift: ${schema}`);

if (!receipt.post_execution_reconciliation_complete) fail('Wave 19 receipt is not complete');
if (registry.contracts.length !== 18) fail(`contract denominator is ${registry.contracts.length}`);
if (registry.action_closures.length !== 411) fail(`action denominator is ${registry.action_closures.length}`);
if (registry.counts.action_to_contract_links !== 462) fail(`action-to-contract denominator is ${registry.counts.action_to_contract_links}`);
if (registry.counts.open_generator_actions_after !== 0) fail('generator actions remain open in registry');
if (new Set(registry.contracts.map(row => row.generator_contract_key)).size !== registry.contracts.length) fail('duplicate generator contract key');
if (new Set(registry.action_closures.map(row => row.generator_action_key)).size !== registry.action_closures.length) fail('duplicate generator action key');
if (registry.action_closures.some(row => row.current_action_open)) fail('an action closure remains open');
if (registry.action_closures.some(row => row.review_required_to_decide)) fail('human-permission dependency introduced');
if (registry.action_closures.some(row => row.cross_key_join_authorized)) fail('cross-key join authorized');
if (registry.action_closures.some(row => row.graph_effect !== 'none')) fail('action graph effect introduced');
if (registry.contracts.some(row => row.review_required_to_decide)) fail('contract review dependency introduced');
if (registry.contracts.some(row => row.graph_effect !== 'none')) fail('contract graph effect introduced');
if (projection.registry_sha256 !== digest(registry)) fail('projection registry digest drift');
if (receipt.registry_sha256 !== digest(registry)) fail('receipt registry digest drift');
if (reconciliation.registry_sha256 !== digest(registry)) fail('reconciliation registry digest drift');

const c = summary.counts;
if (c.identifier_topology_generator_contract_actions_raw !== 411) fail('summary raw generator-action count drift');
if (c.identifier_topology_generator_contract_actions_open !== 0) fail('summary open generator-action count is not zero');
if (c.generator_contract_registry_contracts !== 18) fail('summary generator-contract count drift');
if (c.generator_contract_action_closures !== 411) fail('summary generator-action closure count drift');
if (c.generator_contract_action_to_contract_links !== 462) fail('summary action-to-contract link count drift');
if (c.generator_contract_registry_variants !== registry.counts.registered_variants) fail('summary variant count drift');
if (receipt.counts.after.open_generator_actions !== 0) fail('receipt open generator-action count drift');
if (receipt.counts.after.generator_contracts !== 18) fail('receipt contract count drift');
if (receipt.counts.action_closures_observed !== 411) fail('receipt closure observation drift');
if (receipt.counts.registered_variants_observed !== registry.counts.registered_variants) fail('receipt variant observation drift');

const graphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
if (JSON.stringify(graphDigests) !== JSON.stringify(receipt.graph_digests)) fail('graph or participation payload changed');

const fileByPath = new Map(files.map(file => [file.path, file]));
for (const relative of ['data/project/lake-generator-contracts-wave-19-policy.json', policy.paths.registry, policy.paths.receipt]) {
  const row = fileByPath.get(relative);
  if (!row) { fail(`${relative}: source row missing`); continue; }
  if (row.generated) fail(`${relative}: source row marked generated`);
  if (!row.authoritative_reachable) fail(`${relative}: source row not authoritative reachable`);
}
for (const relative of [policy.paths.projection, policy.paths.reconciliation]) {
  const row = fileByPath.get(relative);
  if (!row) { fail(`${relative}: generated row missing`); continue; }
  if (!row.generated) fail(`${relative}: generated row marked source`);
  if (!row.authoritative_reachable) fail(`${relative}: generated row not authoritative reachable`);
}

const objectByCompound = new Map(objects.map(object => [`${object.id_key}:${object.id_value}`, object]));
for (const action of registry.action_closures) {
  const object = objectByCompound.get(`${action.id_key}:${action.id_value}`);
  if (!object) { fail(`${action.id_key}:${action.id_value}: target object missing`); continue; }
  if (object.generator_contract_action_raw !== true) fail(`${action.id_key}:${action.id_value}: raw action marker missing`);
  if (object.generator_contract_action_open !== false) fail(`${action.id_key}:${action.id_value}: action remains open`);
  if (object.generator_action_key !== action.generator_action_key) fail(`${action.id_key}:${action.id_value}: action key drift`);
  if (JSON.stringify(object.generator_contract_keys) !== JSON.stringify(action.generator_contract_keys)) fail(`${action.id_key}:${action.id_value}: contract-key overlay drift`);
}

for (const contract of registry.contracts) {
  const objectHashEnforced = contract.serialization_contract.object_hash_enforced === true;
  const currentCounts = new Map();
  for (const compound of contract.action_compounds) {
    const object = objectByCompound.get(compound);
    if (!object) { fail(`${contract.generator_contract_key}: ${compound}: object missing`); continue; }
    const scoped = (object.occurrences ?? []).filter(projectionOccurrence).filter(occurrence =>
      contract.scope_type === 'exact_projection_path'
        ? occurrence.path === contract.scope_value
        : pathFamily(occurrence.path) === contract.scope_value
    );
    if (!scoped.length) fail(`${contract.generator_contract_key}: ${compound}: scoped occurrence missing`);
    for (const occurrence of scoped) {
      const template = pointerTemplate(occurrence.pointer);
      const serialized = objectHashEnforced
        ? [compound, occurrence.path, template, occurrence.object_hash].join('\0')
        : [compound, occurrence.path, template].join('\0');
      currentCounts.set(serialized, (currentCounts.get(serialized) ?? 0) + 1);
    }
  }
  const registeredCounts = new Map(contract.variants.map(variant => [
    objectHashEnforced
      ? [`${variant.id_key}:${variant.id_value}`, variant.projection_path, variant.pointer_template, variant.object_hash].join('\0')
      : [`${variant.id_key}:${variant.id_value}`, variant.projection_path, variant.pointer_template].join('\0'),
    variant.occurrence_count
  ]));
  if (JSON.stringify([...currentCounts.entries()].sort()) !== JSON.stringify([...registeredCounts.entries()].sort())) fail(`${contract.generator_contract_key}: registered variant drift`);
  if (contract.variants.some(variant => variant.object_hash_enforced !== objectHashEnforced)) fail(`${contract.generator_contract_key}: variant hash-enforcement mode drift`);
  if (!objectHashEnforced && contract.variants.some(variant => Object.hasOwn(variant, 'object_hash'))) fail(`${contract.generator_contract_key}: family contract retained payload hash enforcement`);
  if (contract.serialization_contract.cross_family_hash_equality_required !== false) fail(`${contract.generator_contract_key}: cross-family equality boundary drift`);
  if (contract.serialization_contract.identity_or_truth_inference_authorized !== false) fail(`${contract.generator_contract_key}: identity/truth inference boundary drift`);
}

if (!fs.readFileSync('BUILD-INSTRUCTIONS.md', 'utf8').includes('3.19 **Generator contracts')) fail('build instruction contract missing');
if (!fs.readFileSync('README.md', 'utf8').includes('## Generator contracts')) fail('README contract missing');
if (fs.existsSync('.github/tmp/lake-generator-contracts-wave-19-trigger.json')) fail('temporary Wave 19 trigger remains');
if (receipt.boundaries.generator_contract_proves_identity !== false) fail('identity boundary drift');
if (receipt.boundaries.generator_contract_proves_evidence_truth !== false) fail('truth boundary drift');
if (receipt.boundaries.cross_family_hash_equality_required !== false) fail('cross-family equality boundary drift');
if (receipt.boundaries.cross_key_join_authorized !== false) fail('cross-key boundary drift');
if (receipt.boundaries.graph_effect !== 'none') fail('graph boundary drift');

if (failures) {
  console.error(`validate-lake-generator-contracts-wave-19: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`validate-lake-generator-contracts-wave-19: OK (${registry.contracts.length} contracts, ${registry.action_closures.length} actions closed, ${registry.counts.registered_variants} variants registered, graph effect none)`);
