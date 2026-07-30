#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) { return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function writeJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }
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
const index = readJson('build/lake-index.json');
const objectIndex = readJson('build/lake-object-index.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(registry.schema_version, 'lake-generator-contract-registry-wave-19@1');
assert.equal(projection.schema_version, 'lake-generator-contracts-wave-19@1');
assert.equal(registry.contracts.length, registry.counts.generator_contracts);
assert.equal(registry.action_closures.length, registry.counts.generator_action_closures);
assert.equal(registry.counts.open_generator_actions_after, 0);
assert.equal(projection.registry_sha256, digest(registry));

const graphDigests = {
  participation_sha256: digest(participation),
  active_claims_sha256: digest(activeIdentity.claims),
  hop_edges_sha256: digest(hopGraph.edges),
  rejected_hop_surfaces_sha256: digest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(hopGraph.rejected_hop_pairs)
};
assert.deepEqual(graphDigests, registry.graph_digests, 'Wave 19 graph or participation payload changed');

const fileByPath = new Map((index.files ?? []).map(file => [file.path, file]));
for (const relative of ['data/project/lake-generator-contracts-wave-19-policy.json', policy.paths.registry, policy.paths.receipt]) {
  const row = fileByPath.get(relative);
  assert.ok(row, `${relative}: lake source row missing`);
  assert.equal(row.generated, false, `${relative}: source row marked generated`);
  assert.equal(row.authoritative_reachable, true, `${relative}: source row not authoritative reachable`);
}
for (const relative of [policy.paths.projection, policy.paths.reconciliation]) {
  const row = fileByPath.get(relative);
  if (relative === policy.paths.reconciliation && !row) continue;
  assert.ok(row, `${relative}: generated row missing`);
  assert.equal(row.generated, true, `${relative}: generated row marked source`);
  assert.equal(row.authoritative_reachable, true, `${relative}: generated row not authoritative reachable`);
}

const objectByCompound = new Map((objectIndex.objects ?? []).map(object => [`${object.id_key}:${object.id_value}`, object]));
let closedActionsObserved = 0;
for (const action of registry.action_closures) {
  const object = objectByCompound.get(`${action.id_key}:${action.id_value}`);
  assert.ok(object, `${action.id_key}:${action.id_value}: target object missing`);
  assert.equal(object.generator_contract_action_raw, true, `${action.id_key}:${action.id_value}: raw action marker missing`);
  assert.equal(object.generator_contract_action_open, false, `${action.id_key}:${action.id_value}: action remains open`);
  assert.equal(object.generator_action_key, action.generator_action_key, `${action.id_key}:${action.id_value}: action key drift`);
  assert.deepEqual(object.generator_contract_keys, action.generator_contract_keys, `${action.id_key}:${action.id_value}: contract closure drift`);
  closedActionsObserved += 1;
}
assert.equal(closedActionsObserved, registry.action_closures.length);

let variantsObserved = 0;
const contractObservations = [];
for (const contract of registry.contracts) {
  const objectHashEnforced = contract.serialization_contract.object_hash_enforced === true;
  const currentCounts = new Map();
  for (const compound of contract.action_compounds) {
    const object = objectByCompound.get(compound);
    assert.ok(object, `${contract.generator_contract_key}: ${compound}: object missing`);
    const projections = (object.occurrences ?? []).filter(projectionOccurrence).filter(occurrence =>
      contract.scope_type === 'exact_projection_path'
        ? occurrence.path === contract.scope_value
        : pathFamily(occurrence.path) === contract.scope_value
    );
    assert.ok(projections.length > 0, `${contract.generator_contract_key}: ${compound}: scoped projection missing`);
    for (const occurrence of projections) {
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
  assert.equal(contract.serialization_contract.object_hash_enforced, objectHashEnforced, `${contract.generator_contract_key}: hash-enforcement mode drift`);
  assert.ok(contract.variants.every(variant => variant.object_hash_enforced === objectHashEnforced), `${contract.generator_contract_key}: variant hash-enforcement drift`);
  assert.deepEqual([...currentCounts.entries()].sort(), [...registeredCounts.entries()].sort(), `${contract.generator_contract_key}: registered variants drift`);
  variantsObserved += contract.variants.length;
  contractObservations.push({
    generator_contract_key: contract.generator_contract_key,
    scope_type: contract.scope_type,
    scope_value: contract.scope_value,
    action_row_count: contract.action_row_count,
    variant_count: contract.variant_count,
    current_variant_match: true,
    object_hash_enforced: objectHashEnforced,
    graph_effect: 'none'
  });
}
assert.equal(variantsObserved, registry.counts.registered_variants);

const afterCounts = {
  tracked_files_indexed: index.summary.counts.tracked_files_indexed,
  evidence_bearing_files: index.summary.counts.evidence_bearing_files,
  distinct_machine_ids: index.summary.counts.distinct_machine_ids,
  raw_generator_actions: index.summary.counts.identifier_topology_generator_contract_actions_raw,
  open_generator_actions: index.summary.counts.identifier_topology_generator_contract_actions_open,
  generator_contracts: index.summary.counts.generator_contract_registry_contracts,
  registered_variants: index.summary.counts.generator_contract_registry_variants,
  action_closures: index.summary.counts.generator_contract_action_closures,
  action_to_contract_links: index.summary.counts.generator_contract_action_to_contract_links
};
assert.equal(afterCounts.raw_generator_actions, policy.baseline.generator_contract_actions);
assert.equal(afterCounts.open_generator_actions, 0);
assert.equal(afterCounts.generator_contracts, registry.counts.generator_contracts);
assert.equal(afterCounts.registered_variants, registry.counts.registered_variants);
assert.equal(afterCounts.action_closures, registry.counts.generator_action_closures);
assert.equal(afterCounts.action_to_contract_links, registry.counts.action_to_contract_links);

const counts = {
  baseline: {
    wave_18_topology_records: policy.baseline.wave_18_topology_records,
    open_generator_actions: policy.baseline.generator_contract_actions,
    same_path_generator_contract_candidates: policy.baseline.same_path_generator_contract_candidates,
    single_family_schema_or_version_variants: policy.baseline.single_family_schema_or_version_variants,
    mixed_typed_views_and_intra_family_variants: policy.baseline.mixed_typed_views_and_intra_family_variants
  },
  after: afterCounts,
  contracts_observed: contractObservations.length,
  action_closures_observed: closedActionsObserved,
  registered_variants_observed: variantsObserved,
  decisions_requiring_human_permission: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0
};

const receipt = {
  schema_version: 'lake-generator-contracts-wave-19-receipt@1',
  program_key: policy.program_id,
  registry_sha256: digest(registry),
  graph_digests: graphDigests,
  counts,
  post_execution_reconciliation_complete: true,
  all_frozen_generator_actions_closed: true,
  all_registered_variants_match_current_outputs: true,
  raw_divergence_forced_to_zero: false,
  correction_mode: policy.decision_law.correction_mode,
  boundaries: policy.boundaries
};
const reconciliation = {
  schema_version: 'lake-generator-contracts-wave-19-reconciliation@1',
  program_key: policy.program_id,
  registry_sha256: receipt.registry_sha256,
  counts,
  contract_observations: contractObservations,
  completion: {
    all_contracts_observed: contractObservations.length === registry.contracts.length,
    all_frozen_actions_closed: closedActionsObserved === registry.action_closures.length,
    all_variants_registered: variantsObserved === registry.counts.registered_variants,
    final_open_generator_actions: afterCounts.open_generator_actions,
    source_truth_determined: false,
    semantic_completeness_claimed: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.reconciliation, reconciliation);

const report = `# Generator contracts — Wave 19\n\n\`\`\`text\nWave 18 open generator actions:       ${policy.baseline.generator_contract_actions} -> ${afterCounts.open_generator_actions}\nactive generator contracts:          ${afterCounts.generator_contracts}\naction-to-contract links:            ${afterCounts.action_to_contract_links}\nregistered current variants:         ${afterCounts.registered_variants}\ncontracts observed:                   ${contractObservations.length}/${registry.contracts.length}\naction closures observed:             ${closedActionsObserved}/${registry.action_closures.length}\nregistered variants observed:         ${variantsObserved}/${registry.counts.registered_variants}\nhuman-permission dependencies:        0\nrelationship / participation / graph: 0 / 0 / 0\n\`\`\`\n\nThe 411 frozen generator actions are closed by 18 named sidecar contracts. Raw projection divergence remains visible where typed views or declared versions differ. Exact-path variants are registered by path, pointer template, and object hash. Projection-family variants are registered structurally by path and pointer template, so payload-hash changes inside a declared family boundary do not create a recursive self-hash. New exact-path hashes or family structural variants require append-preserving supersession before release. No contract establishes identity, evidence truth, publication clearance, a cross-key join, or graph semantics.\n`;
fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
fs.writeFileSync(full(policy.paths.report), report);

console.log('generator contracts Wave 19 reconciled');
console.log(`  open actions: ${policy.baseline.generator_contract_actions} -> ${afterCounts.open_generator_actions}`);
console.log(`  contracts / actions / variants observed: ${contractObservations.length} / ${closedActionsObserved} / ${variantsObserved}`);
console.log('  review dependencies / graph effects: 0 / 0');
