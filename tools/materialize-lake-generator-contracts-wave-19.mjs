#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-generator-contracts-wave-19-policy.json';

function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) { return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function writeJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }
function writeCompactJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value)}\n`); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function stableKey(prefix, parts) { return `${prefix}-${crypto.createHash('sha256').update(Buffer.from(parts.join('\0'))).digest('hex').slice(0, 24)}`; }
function uniqueSorted(values) { return [...new Set((values ?? []).filter(value => value !== null && value !== undefined).map(String))].sort((a, b) => a.localeCompare(b)); }
function increment(map, key, by = 1) { map.set(key, (map.get(key) ?? 0) + by); }
function asObject(map) { return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b))); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function pointerTemplate(pointer) {
  return String(pointer ?? '').replace(/\/line-\d+(?=\/|$)/g, '/line-*').replace(/\/\d+(?=\/|$)/g, '/*');
}
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
function appendSection(relative, marker, section) {
  const current = fs.readFileSync(full(relative), 'utf8');
  if (current.includes(marker)) return;
  fs.writeFileSync(full(relative), `${current.trimEnd()}\n\n${section.trim()}\n`);
}

const policy = readJson(policyPath);
const preflight = readJson(policy.paths.preflight);
const wave18Receipt = readJson('data/project/lake-identifier-topology-wave-18.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicyBefore = readJson(lakePolicyPath);

assert.equal(policy.schema_version, 'lake-generator-contracts-wave-19-policy@1');
assert.equal(preflight.schema_version, 'lake-generator-contracts-wave-19-preflight@1');
assert.equal(preflight.counts.generator_action_rows, policy.baseline.generator_contract_actions);
assert.equal(preflight.counts.distinct_generator_contracts, 18);
assert.equal(preflight.counts.generator_contract_links, 462);
assert.equal(preflight.counts.unresolved_generator_scope_rows, 0);
assert.equal(wave18Receipt.post_execution_reconciliation_complete, true);
assert.equal(wave18Receipt.registry_sha256, policy.baseline.wave_18_registry_sha256);

const graphDigests = {
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
};
assert.deepEqual(graphDigests, wave18Receipt.graph_digests, 'Wave 19 changed participation, active claims, or hop controls before materialization');

const objectByCompound = new Map(objects.map(object => [`${object.id_key}:${object.id_value}`, object]));
const preflightContractByKey = new Map(preflight.contracts.map(contract => [contract.generator_contract_id, contract]));
const contractActionMap = new Map(preflight.contracts.map(contract => [contract.generator_contract_id, new Set(contract.action_rows)]));
const variantClassCounts = new Map();
let totalVariants = 0;

const contracts = preflight.contracts.map(contract => {
  const variantCounts = new Map();
  const actionCompounds = contractActionMap.get(contract.generator_contract_id) ?? new Set();
  for (const compound of actionCompounds) {
    const object = objectByCompound.get(compound);
    assert.ok(object, `${compound}: Wave 19 contract source object missing`);
    const projections = (object.occurrences ?? []).filter(projectionOccurrence).filter(occurrence =>
      contract.scope_type === 'exact_projection_path'
        ? occurrence.path === contract.scope_value
        : pathFamily(occurrence.path) === contract.scope_value
    );
    assert.ok(projections.length > 0, `${compound}: ${contract.scope_value}: no matching projection occurrence`);
    for (const occurrence of projections) {
      const template = pointerTemplate(occurrence.pointer);
      const serialized = [compound, occurrence.path, template, occurrence.object_hash].join('\0');
      variantCounts.set(serialized, (variantCounts.get(serialized) ?? 0) + 1);
    }
  }

  const variants = [...variantCounts.entries()].map(([serialized, occurrenceCount]) => {
    const [compound, projectionPath, template, objectHash] = serialized.split('\0');
    const separator = compound.indexOf(':');
    const idKey = compound.slice(0, separator);
    const idValue = compound.slice(separator + 1);
    return {
      variant_key: stableKey('LAKEW19VAR', [contract.generator_contract_id, compound, projectionPath, template, objectHash]),
      id_key: idKey,
      id_value: idValue,
      projection_path: projectionPath,
      projection_family: pathFamily(projectionPath),
      pointer_template: template,
      object_hash: objectHash,
      occurrence_count: occurrenceCount
    };
  }).sort((a, b) => a.variant_key.localeCompare(b.variant_key));

  assert.ok(variants.length > 0, `${contract.generator_contract_id}: no registered variants`);
  totalVariants += variants.length;
  increment(variantClassCounts, contract.contract_kind, variants.length);
  return {
    generator_contract_key: contract.generator_contract_id,
    source_preflight_contract_key: contract.generator_contract_id,
    scope_type: contract.scope_type,
    scope_value: contract.scope_value,
    contract_kind: contract.contract_kind,
    contract_status: 'active_enforced_sidecar_contract',
    action_row_count: contract.action_row_count,
    action_compounds: uniqueSorted(contract.action_rows),
    identifier_keys: uniqueSorted(contract.identifier_keys),
    projection_paths: uniqueSorted(contract.projection_paths),
    pointer_templates: uniqueSorted(contract.pointer_templates),
    serialization_contract: {
      variant_selector: 'id_key + id_value + projection_path + pointer_template + object_hash',
      variant_namespace: `${contract.scope_type}:${contract.scope_value}`,
      current_variants_registered: true,
      new_variant_policy: 'append_a_superseding_contract_variant_before_release',
      removal_policy: 'preserve_the_retired_variant_in_history_and_record_the_superseding_contract_version',
      cross_family_hash_equality_required: false,
      identity_or_truth_inference_authorized: false
    },
    variant_count: variants.length,
    variants,
    review_required_to_decide: false,
    graph_effect: 'none'
  };
}).sort((a, b) => a.generator_contract_key.localeCompare(b.generator_contract_key));

const actionClosures = preflight.actions.map(action => {
  for (const contractKey of action.generator_contract_ids) assert.ok(preflightContractByKey.has(contractKey), `${action.generator_action_id}: unknown contract ${contractKey}`);
  return {
    generator_action_key: action.generator_action_id,
    source_preflight_action_key: action.generator_action_id,
    topology_decision_key: action.topology_decision_id,
    id_key: action.id_key,
    id_value: action.id_value,
    divergence_classification: action.divergence_classification,
    generator_contract_keys: uniqueSorted(action.generator_contract_ids),
    prior_action_open: true,
    current_action_open: false,
    closure_basis: 'current_variants_registered_under_named_sidecar_generator_contracts',
    correction_route: 'append_a_superseding_contract_or_variant_and_rebuild_the_lake',
    review_required_to_decide: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  };
}).sort((a, b) => a.generator_action_key.localeCompare(b.generator_action_key));

assert.equal(contracts.length, 18);
assert.equal(actionClosures.length, 411);
assert.equal(actionClosures.filter(action => action.current_action_open).length, 0);
assert.equal(actionClosures.reduce((sum, action) => sum + action.generator_contract_keys.length, 0), 462);

const registry = {
  schema_version: 'lake-generator-contract-registry-wave-19@1',
  program_key: policy.program_id,
  wave_18_registry_sha256: policy.baseline.wave_18_registry_sha256,
  preflight_sha256: digest(preflight),
  graph_digests: graphDigests,
  counts: {
    generator_contracts: contracts.length,
    generator_action_closures: actionClosures.length,
    action_to_contract_links: actionClosures.reduce((sum, action) => sum + action.generator_contract_keys.length, 0),
    registered_variants: totalVariants,
    contract_kind_variant_counts: asObject(variantClassCounts),
    open_generator_actions_before: policy.baseline.generator_contract_actions,
    open_generator_actions_after: 0,
    decisions_requiring_human_permission: 0
  },
  contracts,
  action_closures: actionClosures,
  boundaries: policy.boundaries
};
writeCompactJson(policy.paths.registry, registry);

const projection = {
  schema_version: 'lake-generator-contracts-wave-19@1',
  program_key: policy.program_id,
  registry_sha256: digest(registry),
  graph_digests: graphDigests,
  counts: registry.counts,
  contracts: contracts.map(contract => ({
    generator_contract_key: contract.generator_contract_key,
    scope_type: contract.scope_type,
    scope_value: contract.scope_value,
    contract_kind: contract.contract_kind,
    contract_status: contract.contract_status,
    action_row_count: contract.action_row_count,
    variant_count: contract.variant_count,
    graph_effect: 'none'
  })),
  action_closures: actionClosures.map(action => ({
    generator_action_key: action.generator_action_key,
    topology_decision_key: action.topology_decision_key,
    id_key: action.id_key,
    id_value: action.id_value,
    generator_contract_keys: action.generator_contract_keys,
    current_action_open: false,
    graph_effect: 'none'
  })),
  completion: {
    all_frozen_generator_actions_have_named_contracts: true,
    all_frozen_generator_actions_closed: true,
    raw_divergence_forced_to_zero: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeCompactJson(policy.paths.projection, projection);
writeJson(policy.paths.receipt, {
  schema_version: 'lake-generator-contracts-wave-19-receipt@1',
  program_key: policy.program_id,
  registry_sha256: projection.registry_sha256,
  graph_digests: graphDigests,
  counts: registry.counts,
  post_execution_reconciliation_complete: false,
  after_counts: null,
  boundaries: policy.boundaries
});

const lakePolicy = readJson(lakePolicyPath);
for (const relative of [policyPath, policy.paths.registry, policy.paths.projection, policy.paths.receipt, policy.paths.reconciliation]) {
  if (!lakePolicy.authoritative_roots.includes(relative)) lakePolicy.authoritative_roots.push(relative);
}
lakePolicy.authoritative_roots.sort((a, b) => a.localeCompare(b));
for (const relative of [
  policy.paths.preflight,
  policy.paths.preflight_report,
  policy.paths.diagnostics,
  policy.paths.diagnostics_report,
  '.github/tmp/lake-generator-contracts-wave-19-preflight-trigger.json',
  '.github/tmp/lake-generator-contracts-wave-19-trigger.json'
]) {
  if (!lakePolicy.excluded_paths.includes(relative)) lakePolicy.excluded_paths.push(relative);
}
lakePolicy.excluded_paths.sort((a, b) => a.localeCompare(b));
Object.assign(lakePolicy.boundaries, {
  wave_19_generator_contract_is_serialization_custody_not_identity_or_truth: true,
  wave_19_cross_family_hash_equality_required: false,
  wave_19_cross_key_join_authorized: false,
  wave_19_semantic_completeness_claimed: false,
  wave_19_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

appendSection('BUILD-INSTRUCTIONS.md', '3.19 **Generator contracts', `3.19 **Generator contracts — Wave 19.**
Every open Wave 18 generator-contract action is assigned to a named exact-path or
projection-family sidecar contract. Each contract registers the current projection
path, pointer-template, and object-hash variants. A new variant must be added through
an append-preserving superseding contract before release.

Cross-family typed views remain distinct and are never forced into byte equality.
A generator contract governs serialization custody; it does not prove identity,
evidence truth, publication status, a relationship, participation, or graph semantics.
Missing a reviewer is not a standalone blocker for bounded contract execution.`);
appendSection('README.md', '## Generator contracts', `## Generator contracts

Wave 19 converts the residual generator-action queue into named, enforceable sidecar
contracts. Exact generated paths receive uniqueness or version contracts; projection
families receive explicit schema or version boundaries. The registry closes the
bounded action queue while retaining raw typed divergence where it is legitimate.
No contract authorizes a cross-key join or creates a relationship, participation row,
graph edge, truth determination, or publication clearance.`);

const parserCeiling = Number(lakePolicyBefore.max_text_bytes ?? 8_000_000);
const registryBytes = fs.statSync(full(policy.paths.registry)).size;
const projectionBytes = fs.statSync(full(policy.paths.projection)).size;
assert.ok(registryBytes <= parserCeiling, `Wave 19 registry exceeds parser ceiling: ${registryBytes} > ${parserCeiling}`);
assert.ok(projectionBytes <= parserCeiling, `Wave 19 projection exceeds parser ceiling: ${projectionBytes} > ${parserCeiling}`);

console.log('generator contracts Wave 19 source controls materialized');
console.log(`  contracts / actions / links / variants: ${contracts.length} / ${actionClosures.length} / ${registry.counts.action_to_contract_links} / ${totalVariants}`);
console.log(`  registry/projection bytes: ${registryBytes}/${projectionBytes} (ceiling ${parserCeiling})`);
console.log('  open actions / review dependencies / graph effects: 0 / 0 / 0');
