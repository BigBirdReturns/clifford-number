#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-identifier-topology-wave-18-policy.json';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
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
function topRows(map, limit = 60) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
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
  if (file.startsWith('data/intake/')) return `data/intake/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research-tracks/')) return `data/research-tracks/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research/')) return 'data/research';
  if (file.startsWith('data/project/')) return 'data/project';
  if (file.startsWith('data/canonical/')) return 'data/canonical';
  if (file.startsWith('data/ledger/')) return 'data/ledger';
  if (file.startsWith('cases/')) return `cases/${parts[1] ?? 'root'}`;
  if (file.startsWith('reports/')) return `reports/${parts[1] ?? 'root'}`;
  if (file.startsWith('docs/')) return `docs/${parts[1] ?? 'root'}`;
  if (file.startsWith('estates/')) return 'estates';
  if (file.startsWith('gametrails/')) return 'gametrails';
  if (file.startsWith('briefs/')) return 'briefs';
  return parts[0] || 'root';
}
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function sourceOccurrence(occurrence) {
  return !projectionOccurrence(occurrence)
    && !['documentation', 'report_product', 'briefing_product'].includes(occurrence.role);
}

const controlKeyPattern = /(?:^|_)(?:action|adjudication|candidate|decision|gap|issue|observation|queue|registry|resolution|route|routing|supersession|task|validation|work_item|workstream)_id$/;
const domainKeys = new Set([
  'actor_id', 'case_id', 'claim_id', 'event_id', 'organization_id', 'participant_id',
  'program_id', 'receipt_id', 'report_id', 'source_id', 'surface_id'
]);
const estateKeys = new Set(['estate_id', 'from_estate_id', 'origin_estate_id', 'target_estate_id', 'to_estate_id']);

function classifySourceOnly(object, sourceFamilies, sourceRoles) {
  if (!object.source_without_projection) return null;
  if (controlKeyPattern.test(object.id_key)) return {
    classification: 'intentional_source_only_control_identifier',
    projection_disposition: 'retain_source_only_unless_a_named_consumer_contract_is_added',
    confidence: 'high'
  };
  if (estateKeys.has(object.id_key)) return {
    classification: 'estate_identifier_projection_candidate',
    projection_disposition: 'adjudicate_against_estate_and_gametrail_projection_contracts',
    confidence: 'moderate'
  };
  if (domainKeys.has(object.id_key)) return {
    classification: 'domain_identifier_projection_candidate',
    projection_disposition: 'adjudicate_named_consumer_or_preserve_explicit_source_only_state',
    confidence: 'moderate'
  };
  if (sourceFamilies.every(family => family.startsWith('data/intake/'))) return {
    classification: 'intake_source_identifier_not_yet_promoted',
    projection_disposition: 'retain_intake_only_until_promotion_or_explicit_nonpromotion_decision',
    confidence: 'high'
  };
  if (sourceFamilies.every(family => family.startsWith('cases/'))) return {
    classification: 'case_local_source_identifier_without_global_projection',
    projection_disposition: 'retain_case_scoped_unless_a_typed_cross_case_contract_exists',
    confidence: 'high'
  };
  if (sourceRoles.every(role => ['project_governance', 'method_and_fixture', 'repository_root'].includes(role))) return {
    classification: 'governance_or_fixture_identifier_source_only',
    projection_disposition: 'retain_source_only_as_control_plane_identifier',
    confidence: 'moderate'
  };
  return {
    classification: 'source_only_family_adjudication_required',
    projection_disposition: 'inspect_identifier_family_and_named_consumers_before_projecting',
    confidence: 'low'
  };
}

function classifyDivergence(object, projectionOccurrences) {
  if (!object.divergent_projections) return null;
  const hashesByFamily = new Map();
  const hashesByPath = new Map();
  for (const occurrence of projectionOccurrences) {
    const family = pathFamily(occurrence.path);
    const familyHashes = hashesByFamily.get(family) ?? new Set();
    familyHashes.add(occurrence.object_hash);
    hashesByFamily.set(family, familyHashes);
    const pathHashes = hashesByPath.get(occurrence.path) ?? new Set();
    pathHashes.add(occurrence.object_hash);
    hashesByPath.set(occurrence.path, pathHashes);
  }
  const conflictingFamilies = [...hashesByFamily.entries()]
    .filter(([, hashes]) => hashes.size > 1)
    .map(([family, hashes]) => ({ family, hash_count: hashes.size }))
    .sort((left, right) => left.family.localeCompare(right.family));
  const conflictingPaths = [...hashesByPath.entries()]
    .filter(([, hashes]) => hashes.size > 1)
    .map(([file, hashes]) => ({ path: file, hash_count: hashes.size }))
    .sort((left, right) => left.path.localeCompare(right.path));
  let classification;
  let disposition;
  let confidence;
  if (conflictingPaths.length) {
    classification = 'same_path_projection_variants';
    disposition = 'repair_or_version_same_path_object_variants_before_join';
    confidence = 'high';
  } else if (conflictingFamilies.length && hashesByFamily.size === 1) {
    classification = 'single_family_projection_variants';
    disposition = 'adjudicate_intra_family_schema_or_version_boundary';
    confidence = 'high';
  } else if (conflictingFamilies.length) {
    classification = 'mixed_cross_family_and_intra_family_variants';
    disposition = 'separate_valid_cross_family_views_from_intra_family_conflicts';
    confidence = 'high';
  } else {
    classification = 'cross_family_projection_views';
    disposition = 'retain_as_typed_views_and_forbid_hash_equality_as_a_join_requirement';
    confidence = 'high';
  }
  return {
    classification,
    divergence_disposition: disposition,
    confidence,
    projection_family_count: hashesByFamily.size,
    conflicting_families: conflictingFamilies,
    conflicting_paths: conflictingPaths,
    projection_hashes_by_family: Object.fromEntries([...hashesByFamily.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([family, hashes]) => [family, [...hashes].sort()]))
  };
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-identifier-topology-wave-18-policy@1');
const summary = readJson('build/lake-index/summary.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
assert.equal(summary.source_fingerprint_sha256, policy.baseline.lake_source_fingerprint_sha256, 'Wave 18 baseline fingerprint drift');
assert.equal(objects.length, policy.baseline.distinct_machine_ids, 'Wave 18 machine-ID denominator drift');

const unindexed = objects.filter(object => !object.indexed);
const sourceOnly = objects.filter(object => object.source_without_projection);
const divergent = objects.filter(object => object.divergent_projections);
const projectionWithoutSource = objects.filter(object => object.projection_without_source);
assert.equal(unindexed.length, policy.baseline.unindexed_machine_ids);
assert.equal(sourceOnly.length, policy.baseline.source_ids_without_projection);
assert.equal(divergent.length, policy.baseline.divergent_identifier_projections);
assert.equal(projectionWithoutSource.length, policy.baseline.projection_ids_without_source);

const frozen = objects.filter(object => !object.indexed || object.source_without_projection || object.divergent_projections)
  .map(object => {
    const sourceOccurrences = object.occurrences.filter(sourceOccurrence);
    const projectionOccurrences = object.occurrences.filter(projectionOccurrence);
    const sourceFamilies = uniqueSorted(sourceOccurrences.map(row => pathFamily(row.path)));
    const projectionFamilies = uniqueSorted(projectionOccurrences.map(row => pathFamily(row.path)));
    const sourceRoles = uniqueSorted(sourceOccurrences.map(row => row.role));
    const projectionRoles = uniqueSorted(projectionOccurrences.map(row => row.role));
    const states = [];
    if (!object.indexed) states.push('unindexed');
    if (object.source_without_projection) states.push('source_without_projection');
    if (object.divergent_projections) states.push('divergent_projections');
    return {
      topology_decision_id: stableId('LAKEW18TOPO', [policy.program_id, object.id_key, object.id_value]),
      id_key: object.id_key,
      id_value: object.id_value,
      states,
      occurrence_count: object.occurrence_count,
      distinct_object_hashes: object.distinct_object_hashes,
      distinct_source_hashes: object.distinct_source_hashes,
      distinct_projection_hashes: object.distinct_projection_hashes,
      indexed: object.indexed,
      source_occurrence: object.source_occurrence,
      projection_occurrence: object.projection_occurrence,
      source_families: sourceFamilies,
      projection_families: projectionFamilies,
      source_roles: sourceRoles,
      projection_roles: projectionRoles,
      source_paths: uniqueSorted(sourceOccurrences.map(row => row.path)),
      projection_paths: uniqueSorted(projectionOccurrences.map(row => row.path)),
      indexing_disposition: object.indexed
        ? 'already_indexed'
        : 'index_in_wave_18_topology_registry_without_asserting_identity_or_truth',
      source_only: classifySourceOnly(object, sourceFamilies, sourceRoles),
      divergence: classifyDivergence(object, projectionOccurrences),
      review_dependency: { required_to_decide: false },
      correction_mode: policy.decision_law.correction_mode,
      cross_key_join_authorized: false,
      graph_effect: 'none'
    };
  })
  .sort((left, right) => `${left.id_key}:${left.id_value}`.localeCompare(`${right.id_key}:${right.id_value}`));

const overlapCounts = new Map();
const keyCounts = new Map();
const unindexedKeyCounts = new Map();
const sourceOnlyClassCounts = new Map();
const divergentClassCounts = new Map();
const sourceFamilyCounts = new Map();
const projectionFamilyCounts = new Map();
for (const row of frozen) {
  increment(overlapCounts, row.states.join('+'));
  increment(keyCounts, row.id_key);
  if (row.states.includes('unindexed')) increment(unindexedKeyCounts, row.id_key);
  if (row.source_only) increment(sourceOnlyClassCounts, row.source_only.classification);
  if (row.divergence) increment(divergentClassCounts, row.divergence.classification);
  for (const family of row.source_families) increment(sourceFamilyCounts, family);
  for (const family of row.projection_families) increment(projectionFamilyCounts, family);
}

const diagnostics = {
  schema_version: 'lake-identifier-topology-wave-18-diagnostics@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: summary.source_fingerprint_sha256,
  counts: {
    distinct_machine_ids: objects.length,
    frozen_union: frozen.length,
    unindexed_machine_ids: unindexed.length,
    source_ids_without_projection: sourceOnly.length,
    divergent_identifier_projections: divergent.length,
    projection_ids_without_source: projectionWithoutSource.length,
    overlap_counts: asObject(overlapCounts),
    source_only_classification_counts: asObject(sourceOnlyClassCounts),
    divergence_classification_counts: asObject(divergentClassCounts)
  },
  top_identifier_keys: topRows(keyCounts),
  top_unindexed_identifier_keys: topRows(unindexedKeyCounts),
  top_source_families: topRows(sourceFamilyCounts),
  top_projection_families: topRows(projectionFamilyCounts),
  topology_rows: frozen,
  completion: {
    every_frozen_identifier_classified: frozen.every(row => row.indexing_disposition && (!row.states.includes('source_without_projection') || row.source_only) && (!row.states.includes('divergent_projections') || row.divergence)),
    unclassified_source_only_rows: frozen.filter(row => row.source_only?.classification === 'source_only_family_adjudication_required').length,
    same_path_projection_variant_rows: frozen.filter(row => row.divergence?.classification === 'same_path_projection_variants').length,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.preflight, diagnostics);
writeJson(policy.paths.diagnostics, {
  schema_version: 'lake-identifier-topology-wave-18-diagnostic-summary@1',
  program_id: policy.program_id,
  counts: diagnostics.counts,
  top_identifier_keys: diagnostics.top_identifier_keys,
  top_unindexed_identifier_keys: diagnostics.top_unindexed_identifier_keys,
  top_source_families: diagnostics.top_source_families,
  top_projection_families: diagnostics.top_projection_families,
  source_only_samples: Object.fromEntries([...sourceOnlyClassCounts.keys()].sort().map(classification => [classification, frozen
    .filter(row => row.source_only?.classification === classification)
    .slice(0, 12)
    .map(row => ({ id_key: row.id_key, id_value: row.id_value, source_families: row.source_families, source_paths: row.source_paths.slice(0, 4) }))])),
  divergence_samples: Object.fromEntries([...divergentClassCounts.keys()].sort().map(classification => [classification, frozen
    .filter(row => row.divergence?.classification === classification)
    .slice(0, 12)
    .map(row => ({ id_key: row.id_key, id_value: row.id_value, projection_families: row.projection_families, projection_paths: row.projection_paths.slice(0, 4), conflicting_families: row.divergence.conflicting_families, conflicting_paths: row.divergence.conflicting_paths }))])),
  boundaries: policy.boundaries
});

const lines = [];
lines.push('# Identifier topology — Wave 18 preflight', '');
lines.push('```text');
lines.push(`distinct machine identifiers:       ${objects.length}`);
lines.push(`frozen union:                       ${frozen.length}`);
lines.push(`unindexed machine identifiers:      ${unindexed.length}`);
lines.push(`source IDs without projection:      ${sourceOnly.length}`);
lines.push(`divergent identifier projections:   ${divergent.length}`);
lines.push(`projection IDs without source:      ${projectionWithoutSource.length}`);
lines.push(`unclassified source-only rows:       ${diagnostics.completion.unclassified_source_only_rows}`);
lines.push(`same-path projection variants:       ${diagnostics.completion.same_path_projection_variant_rows}`);
lines.push('review required to decide:           false');
lines.push('graph effect:                        none');
lines.push('```', '');
lines.push('## Overlap classes', '');
for (const [key, count] of Object.entries(diagnostics.counts.overlap_counts)) lines.push(`- ${key}: ${count}`);
lines.push('', '## Source-only dispositions', '');
for (const [key, count] of Object.entries(diagnostics.counts.source_only_classification_counts)) lines.push(`- ${key}: ${count}`);
lines.push('', '## Projection divergence classes', '');
for (const [key, count] of Object.entries(diagnostics.counts.divergence_classification_counts)) lines.push(`- ${key}: ${count}`);
lines.push('', '## Top identifier keys', '');
for (const row of diagnostics.top_identifier_keys.slice(0, 40)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Boundary', '', 'This census classifies identifier topology. It does not infer identity, evidence truth, publication clearance, or a graph relationship. Unindexed and source-only states may be intentional; divergent projections may be valid typed views. Each requires an explicit bounded disposition rather than automatic promotion or forced equality.');
fs.mkdirSync(path.dirname(full(policy.paths.preflight_report)), { recursive: true });
fs.writeFileSync(full(policy.paths.preflight_report), `${lines.join('\n')}\n`);

const diagnosticLines = [];
diagnosticLines.push('# Identifier topology — Wave 18 diagnostics', '');
diagnosticLines.push('## Top unindexed keys', '');
for (const row of diagnostics.top_unindexed_identifier_keys) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Top source families', '');
for (const row of diagnostics.top_source_families) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Top projection families', '');
for (const row of diagnostics.top_projection_families) diagnosticLines.push(`- ${row.key}: ${row.count}`);
diagnosticLines.push('', '## Boundary', '', 'These diagnostics identify high-volume families and conflict shapes for bounded execution. They do not authorize automatic cross-key joins or require every source identifier to receive a public projection.');
fs.writeFileSync(full(policy.paths.diagnostics_report), `${diagnosticLines.join('\n')}\n`);

console.log('identifier topology Wave 18 preflight built');
console.log(`  frozen union / unindexed / source-only / divergent: ${frozen.length} / ${unindexed.length} / ${sourceOnly.length} / ${divergent.length}`);
console.log(`  source-only undecided / same-path variants: ${diagnostics.completion.unclassified_source_only_rows} / ${diagnostics.completion.same_path_projection_variant_rows}`);
console.log('  review dependencies / graph effects: 0 / 0');
