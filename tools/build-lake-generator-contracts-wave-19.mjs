#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-generator-contracts-wave-19-policy.json';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function stableId(prefix, parts) {
  return `${prefix}-${crypto.createHash('sha256').update(Buffer.from(parts.join('\0'))).digest('hex').slice(0, 24)}`;
}
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined).map(String))]
    .sort((left, right) => left.localeCompare(right));
}
function increment(map, key, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}
function asObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}
function topRows(map, limit = 80) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function pointerTemplate(pointer) {
  return String(pointer ?? '')
    .replace(/\/line-\d+(?=\/|$)/g, '/line-*')
    .replace(/\/\d+(?=\/|$)/g, '/*');
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

const policy = readJson(policyPath);
const receipt = readJson('data/project/lake-identifier-topology-wave-18.json');
const registry = readJson('data/project/lake-identifier-topology-registry-wave-18.json');
const objectIndex = readJson('build/lake-object-index.json');

assert.equal(policy.schema_version, 'lake-generator-contracts-wave-19-policy@1');
assert.equal(receipt.schema_version, 'lake-identifier-topology-wave-18-receipt@1');
assert.equal(registry.schema_version, 'lake-identifier-topology-registry-wave-18@1');
assert.equal(receipt.post_execution_reconciliation_complete, true, 'Wave 18 receipt is not complete');
assert.equal(receipt.registry_sha256, policy.baseline.wave_18_registry_sha256, 'Wave 18 registry receipt drift');
assert.equal(digest(registry), policy.baseline.wave_18_registry_sha256, 'Wave 18 registry bytes do not match the pinned semantic digest');
assert.equal(registry.records.length, policy.baseline.wave_18_topology_records, 'Wave 18 topology denominator drift');
assert.equal(registry.counts.generator_contract_actions, policy.baseline.generator_contract_actions, 'Wave 18 generator-action denominator drift');

const objectByCompound = new Map((objectIndex.objects ?? []).map(object => [`${object.id_key}:${object.id_value}`, object]));
const openRows = registry.records
  .filter(row => row.divergence?.generator_contract_action_open === true)
  .sort((left, right) => `${left.id_key}:${left.id_value}`.localeCompare(`${right.id_key}:${right.id_value}`));
assert.equal(openRows.length, policy.baseline.generator_contract_actions, 'open generator-action row drift');

const expectedClasses = new Map([
  ['same_path_generator_contract_candidates', policy.baseline.same_path_generator_contract_candidates],
  ['single_family_schema_or_version_variants', policy.baseline.single_family_schema_or_version_variants],
  ['mixed_typed_views_and_intra_family_variants', policy.baseline.mixed_typed_views_and_intra_family_variants]
]);
const classCounts = new Map();
for (const row of openRows) increment(classCounts, row.divergence.final_classification);
assert.deepEqual(asObject(classCounts), asObject(expectedClasses), 'Wave 18 generator-action class drift');

const contracts = new Map();
const actionRows = [];
const familyCounts = new Map();
const pathCounts = new Map();
const keyCounts = new Map();
const contractScopeCounts = new Map();
let contractLinks = 0;

function ensureContract(scopeType, scopeValue, contractKind) {
  const contractId = stableId('LAKEW19CONTRACT', [policy.program_id, scopeType, scopeValue, contractKind]);
  if (!contracts.has(contractId)) {
    contracts.set(contractId, {
      generator_contract_id: contractId,
      scope_type: scopeType,
      scope_value: scopeValue,
      contract_kind: contractKind,
      action_rows: [],
      topology_decision_ids: [],
      identifier_keys: [],
      projection_families: [],
      projection_paths: [],
      pointer_templates: [],
      required_declaration: contractKind === 'exact_path_uniqueness_or_version'
        ? 'declare the repeated-row uniqueness key, contextual key, or version discriminator for this exact generated path'
        : 'declare the generator schema or version boundary that distinguishes valid variants inside this projection family',
      forbidden_shortcut: 'do_not_force_cross_family_hash_equality_or_infer_identity_truth_or_join_authority',
      review_required_to_decide: false,
      graph_effect: 'none'
    });
  }
  return contracts.get(contractId);
}

for (const row of openRows) {
  const compound = `${row.id_key}:${row.id_value}`;
  const object = objectByCompound.get(compound);
  assert.ok(object, `${compound}: live lake object missing`);
  const projections = (object.occurrences ?? []).filter(projectionOccurrence);
  assert.ok(projections.length > 1, `${compound}: generator action lacks multiple projection occurrences`);

  const byFamily = new Map();
  const byPath = new Map();
  for (const occurrence of projections) {
    const family = pathFamily(occurrence.path);
    const familyRows = byFamily.get(family) ?? [];
    familyRows.push(occurrence);
    byFamily.set(family, familyRows);
    const pathRows = byPath.get(occurrence.path) ?? [];
    pathRows.push(occurrence);
    byPath.set(occurrence.path, pathRows);
  }

  const familyDiagnostics = [...byFamily.entries()].map(([family, occurrences]) => ({
    family,
    occurrence_count: occurrences.length,
    hash_count: new Set(occurrences.map(item => item.object_hash)).size,
    paths: uniqueSorted(occurrences.map(item => item.path))
  })).sort((left, right) => left.family.localeCompare(right.family));
  const pathDiagnostics = [...byPath.entries()].map(([file, occurrences]) => ({
    path: file,
    family: pathFamily(file),
    occurrence_count: occurrences.length,
    hash_count: new Set(occurrences.map(item => item.object_hash)).size,
    pointer_templates: uniqueSorted(occurrences.map(item => pointerTemplate(item.pointer)))
  })).sort((left, right) => left.path.localeCompare(right.path));
  const conflictingFamilies = familyDiagnostics.filter(item => item.hash_count > 1);
  const conflictingPaths = pathDiagnostics.filter(item => item.hash_count > 1);
  const classification = row.divergence.final_classification;
  const targets = [];

  if (classification === 'same_path_generator_contract_candidates') {
    assert.ok(conflictingPaths.length > 0, `${compound}: same-path action lacks a conflicting path`);
    for (const item of conflictingPaths) {
      targets.push({
        scope_type: 'exact_projection_path',
        scope_value: item.path,
        contract_kind: 'exact_path_uniqueness_or_version',
        family: item.family,
        paths: [item.path],
        pointer_templates: item.pointer_templates
      });
    }
  } else if (classification === 'single_family_schema_or_version_variants') {
    assert.equal(byFamily.size, 1, `${compound}: single-family action spans ${byFamily.size} families`);
    assert.equal(conflictingFamilies.length, 1, `${compound}: single-family action lacks one conflicting family`);
    const item = conflictingFamilies[0];
    targets.push({
      scope_type: 'projection_family',
      scope_value: item.family,
      contract_kind: 'family_schema_or_version',
      family: item.family,
      paths: item.paths,
      pointer_templates: uniqueSorted(item.paths.flatMap(file => pathDiagnostics.find(pathRow => pathRow.path === file)?.pointer_templates ?? []))
    });
  } else if (classification === 'mixed_typed_views_and_intra_family_variants') {
    assert.ok(byFamily.size > 1, `${compound}: mixed action does not span multiple families`);
    assert.ok(conflictingFamilies.length > 0, `${compound}: mixed action lacks an intra-family conflict`);
    for (const item of conflictingFamilies) {
      targets.push({
        scope_type: 'projection_family',
        scope_value: item.family,
        contract_kind: 'family_schema_or_version',
        family: item.family,
        paths: item.paths,
        pointer_templates: uniqueSorted(item.paths.flatMap(file => pathDiagnostics.find(pathRow => pathRow.path === file)?.pointer_templates ?? []))
      });
    }
  } else {
    assert.fail(`${compound}: unexpected generator-action class ${classification}`);
  }

  assert.ok(targets.length > 0, `${compound}: no generator contract target`);
  const contractIds = [];
  for (const target of targets) {
    const contract = ensureContract(target.scope_type, target.scope_value, target.contract_kind);
    contract.action_rows.push(compound);
    contract.topology_decision_ids.push(row.topology_decision_id);
    contract.identifier_keys.push(row.id_key);
    contract.projection_families.push(target.family);
    contract.projection_paths.push(...target.paths);
    contract.pointer_templates.push(...target.pointer_templates);
    contractIds.push(contract.generator_contract_id);
    contractLinks += 1;
    increment(contractScopeCounts, `${target.scope_type}:${target.scope_value}`);
  }

  for (const family of byFamily.keys()) increment(familyCounts, family);
  for (const file of byPath.keys()) increment(pathCounts, file);
  increment(keyCounts, row.id_key);
  actionRows.push({
    generator_action_id: stableId('LAKEW19ACTION', [policy.program_id, row.topology_decision_id]),
    topology_decision_id: row.topology_decision_id,
    id_key: row.id_key,
    id_value: row.id_value,
    divergence_classification: classification,
    projection_family_count: byFamily.size,
    projection_path_count: byPath.size,
    conflicting_families: conflictingFamilies,
    conflicting_paths: conflictingPaths,
    generator_contract_ids: uniqueSorted(contractIds),
    next_action: classification === 'same_path_generator_contract_candidates'
      ? 'declare_exact_path_uniqueness_or_version_contract'
      : 'declare_projection_family_schema_or_version_contract',
    review_required_to_decide: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  });
}

const contractRows = [...contracts.values()].map(contract => ({
  ...contract,
  action_rows: uniqueSorted(contract.action_rows),
  topology_decision_ids: uniqueSorted(contract.topology_decision_ids),
  identifier_keys: uniqueSorted(contract.identifier_keys),
  projection_families: uniqueSorted(contract.projection_families),
  projection_paths: uniqueSorted(contract.projection_paths),
  pointer_templates: uniqueSorted(contract.pointer_templates),
  action_row_count: new Set(contract.action_rows).size
})).sort((left, right) => left.generator_contract_id.localeCompare(right.generator_contract_id));

const preflight = {
  schema_version: 'lake-generator-contracts-wave-19-preflight@1',
  program_id: policy.program_id,
  wave_18_registry_sha256: digest(registry),
  counts: {
    wave_18_topology_records: registry.records.length,
    generator_action_rows: actionRows.length,
    generator_action_classifications: asObject(classCounts),
    distinct_generator_contracts: contractRows.length,
    generator_contract_links: contractLinks,
    exact_path_contracts: contractRows.filter(row => row.scope_type === 'exact_projection_path').length,
    projection_family_contracts: contractRows.filter(row => row.scope_type === 'projection_family').length,
    unresolved_generator_scope_rows: actionRows.filter(row => row.generator_contract_ids.length === 0).length,
    decisions_requiring_human_permission: 0
  },
  contracts: contractRows,
  actions: actionRows,
  completion: {
    all_411_actions_have_named_contracts: actionRows.length === policy.baseline.generator_contract_actions && actionRows.every(row => row.generator_contract_ids.length > 0),
    cross_family_views_preserved: true,
    raw_divergence_forced_to_zero: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};

const diagnostics = {
  schema_version: 'lake-generator-contracts-wave-19-diagnostics@1',
  program_id: policy.program_id,
  counts: preflight.counts,
  top_identifier_keys: topRows(keyCounts),
  top_projection_families: topRows(familyCounts),
  top_projection_paths: topRows(pathCounts),
  top_contract_scopes: topRows(contractScopeCounts),
  contracts_by_kind: Object.fromEntries(['exact_path_uniqueness_or_version', 'family_schema_or_version'].map(kind => [kind, contractRows.filter(row => row.contract_kind === kind)])),
  boundaries: policy.boundaries
};

assert.equal(preflight.counts.unresolved_generator_scope_rows, 0);
assert.equal(preflight.counts.generator_action_rows, policy.baseline.generator_contract_actions);
assert.equal(new Set(actionRows.map(row => row.generator_action_id)).size, actionRows.length);
assert.equal(new Set(contractRows.map(row => row.generator_contract_id)).size, contractRows.length);
assert.ok(contractRows.length > 0 && contractRows.length <= contractLinks);

writeJson(policy.paths.preflight, preflight);
writeJson(policy.paths.diagnostics, diagnostics);

const lines = ['# Generator contracts — Wave 19 preflight', '', '```text',
  `Wave 18 topology records:        ${preflight.counts.wave_18_topology_records}`,
  `open generator-action rows:      ${preflight.counts.generator_action_rows}`,
  `distinct generator contracts:    ${preflight.counts.distinct_generator_contracts}`,
  `action-to-contract links:         ${preflight.counts.generator_contract_links}`,
  `exact-path contracts:             ${preflight.counts.exact_path_contracts}`,
  `projection-family contracts:      ${preflight.counts.projection_family_contracts}`,
  `unresolved generator scopes:      ${preflight.counts.unresolved_generator_scope_rows}`,
  'review required to decide:        false',
  'graph effect:                     none',
  '```', '', '## Action classifications', ''];
for (const [key, count] of Object.entries(preflight.counts.generator_action_classifications)) lines.push(`- ${key}: ${count}`);
lines.push('', '## Contract rule', '', 'Cross-family typed views remain distinct. Wave 19 names only the exact path or projection family whose repeated template, schema, or version boundary is unresolved. A generator contract is an executable serialization rule; it is not evidence of identity, truth, publication status, or a graph relationship.');
fs.mkdirSync(path.dirname(full(policy.paths.preflight_report)), { recursive: true });
fs.writeFileSync(full(policy.paths.preflight_report), `${lines.join('\n')}\n`);

const diagnosticLines = ['# Generator contracts — Wave 19 diagnostics', '', '## Top projection families', ''];
for (const row of diagnostics.top_projection_families) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Top exact paths', '');
for (const row of diagnostics.top_projection_paths.slice(0, 80)) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Top identifier keys', '');
for (const row of diagnostics.top_identifier_keys) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Boundary', '', 'These diagnostics isolate generator contracts. They do not require cross-family byte equality, authorize cross-key joins, create relationships, or claim semantic completeness.');
fs.writeFileSync(full(policy.paths.diagnostics_report), `${diagnosticLines.join('\n')}\n`);

console.log('generator contracts Wave 19 preflight built');
console.log(`  action rows / distinct contracts / links: ${actionRows.length} / ${contractRows.length} / ${contractLinks}`);
console.log(`  exact-path / family contracts: ${preflight.counts.exact_path_contracts} / ${preflight.counts.projection_family_contracts}`);
console.log('  unresolved scopes / review dependencies / graph effects: 0 / 0 / 0');
