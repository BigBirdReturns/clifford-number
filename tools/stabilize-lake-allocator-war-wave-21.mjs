#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (relative, value) => fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function unique(values) { return [...new Set(values.filter(Boolean))].sort(); }

const policy = readJson('data/project/lake-allocator-war-wave-21-policy.json');
const observations = readJsonl(policy.paths.observation_registry);
const waterline = readJsonl(policy.paths.waterline_registry);
const estates = readJsonl(policy.paths.estate_registry);
const programs = readJsonl(policy.paths.program_registry);
const receipt = readJson(policy.paths.receipt);
const index = readJson('build/lake-index.json');
const objects = readJson('build/lake-object-index.json');
const gaps = readJson('build/lake-index-gaps.json');

const authorityByCompound = new Map();
for (const row of observations) authorityByCompound.set(`allocator_record_id:${row.allocator_record_id}`, {
  object_type: 'observation', authority_state: row.authority_state, review_state: row.review_state,
  source_wave_key: row.source_wave_key, source_observation_ref: row.source_observation_ref,
  acquisition_open: row.authority_state === 'unreviewed_intake_only' || row.next_required_records.length > 0
});
for (const row of waterline) authorityByCompound.set(`allocator_class_id:${row.allocator_class_id}`, {
  object_type: 'waterline_class', authority_state: row.authority_state,
  source_wave_key: row.source_wave_key, source_observation_refs: row.source_observation_refs,
  acquisition_open: row.next_required_records.length > 0
});
for (const row of estates) authorityByCompound.set(`allocator_estate_feed_id:${row.allocator_estate_feed_id}`, {
  object_type: 'estate_acquisition_route', authority_state: row.route_authority,
  consumer_key: row.consumer_key, acquisition_open: row.next_acquisition.length > 0
});
for (const row of programs) authorityByCompound.set(`allocator_program_feed_id:${row.allocator_program_feed_id}`, {
  object_type: 'program_feed', authority_state: row.route_authority,
  consumer_key: row.consumer_key, acquisition_open: row.next_acquisition.length > 0
});

const gateIds = unique(observations.flatMap(row =>
  (row.four_gate_assessment ?? []).map(gate => gate.gate_id)
));
assert(gateIds.length === 4, `allocator-war Wave 21 gate identifiers ${gateIds.length}/4`);
const projectionTargets = new Map([
  [`program_id:${policy.program_id}`, { object_type: 'program_identity' }],
  [`owner_program_id:${policy.program_id}`, { object_type: 'program_owner_reference' }],
  [`wave_id:${policy.wave_id}`, { object_type: 'wave_identity' }],
  ...gateIds.map(gateId => [`gate_id:${gateId}`, { object_type: 'four_gate_dimension_reference', consumer_key: gateId }]),
  ...policy.basin_contract.map(row => [`basin_id:${row.basin_id}`, { object_type: 'semantic_basin_identity', consumer_key: row.basin_id }]),
  ...[...authorityByCompound.entries()]
]);
const allowedGeneratedPaths = new Set(policy.projection_contract.allowed_generated_paths);
let observed = 0;
let typedDivergence = 0;
let typedSourceOnly = 0;
let typedUnindexed = 0;

for (const object of objects.objects ?? []) {
  const compound = `${object.id_key}:${object.id_value}`;
  const contract = projectionTargets.get(compound);
  if (!contract) continue;
  const generatedPaths = unique((object.occurrences ?? [])
    .filter(projectionOccurrence)
    .map(occurrence => occurrence.path));
  object.allocator_war_wave_21 = {
    ...contract,
    ...(authorityByCompound.get(compound) ?? {}),
    projection_contract: policy.projection_contract.contract_name,
    generated_paths: generatedPaths,
    projection_hash_equality_required: false,
    cross_key_join_authorized: false,
    graph_effect: 'none',
    finding_promoted: false,
    publication_cleared: false
  };
  observed += 1;

  if (object.unindexed_identifier) {
    object.topology_unindexed_classification = 'wave21_declared_source_projection_identifier';
    object.topology_unindexed_disposition = 'indexed_by_declared_wave21_registry_or_projection';
    object.topology_unindexed_action = 'retain_declared_wave21_identifier';
    typedUnindexed += 1;
  }
  if (object.source_only_identifier) {
    object.topology_source_only_classification = policy.projection_contract.source_only_classification;
    object.topology_source_only_disposition = policy.projection_contract.source_only_disposition;
    object.topology_source_only_action = 'retain_declared_wave21_identifier';
    typedSourceOnly += 1;
  }
  if (object.divergent_projections) {
    assert(generatedPaths.length > 0, `${compound}: divergent Wave 21 object has no generated path`);
    assert(generatedPaths.every(relative => allowedGeneratedPaths.has(relative)), `${compound}: undeclared Wave 21 generated view`);
    object.topology_divergence_classification = policy.projection_contract.divergence_classification;
    object.topology_divergence_disposition = policy.projection_contract.divergence_disposition;
    object.topology_generator_contract_action_open = false;
    object.divergent_projections_unadjudicated = false;
    typedDivergence += 1;
  }
}

assert(observed === projectionTargets.size, `allocator-war Wave 21 contract objects ${observed}/${projectionTargets.size}`);
const remainingDivergence = (objects.objects ?? []).filter(object => object.divergent_projections && !object.topology_divergence_disposition);
const remainingSourceOnly = (objects.objects ?? []).filter(object => object.source_only_identifier && !object.topology_source_only_disposition);
const remainingUnindexed = (objects.objects ?? []).filter(object => object.unindexed_identifier && !object.topology_unindexed_disposition);

const residualViews = [
  ['unindexed', remainingUnindexed, 'unindexed_machine_ids_unadjudicated'],
  ['source-only', remainingSourceOnly, 'source_ids_without_projection_unadjudicated'],
  ['divergence', remainingDivergence, 'divergent_identifier_projections_unadjudicated']
];
for (const [label, rows, summaryKey] of residualViews) {
  index.summary.counts[summaryKey] = rows.length;
  gaps[summaryKey] = rows;
  assert(index.summary.counts[summaryKey] === gaps[summaryKey].length, label + ' residual summary drift');
}
if (gaps.identifier_topology) {
  gaps.identifier_topology.unindexed_unadjudicated = remainingUnindexed.length;
  gaps.identifier_topology.source_only_unadjudicated = remainingSourceOnly.length;
  gaps.identifier_topology.divergence_unadjudicated = remainingDivergence.length;
}

index.summary.counts.allocator_war_wave_21_source_rows = authorityByCompound.size;
index.summary.counts.allocator_war_wave_21_contract_objects = projectionTargets.size;
index.summary.counts.allocator_war_wave_21_typed_divergent_views = typedDivergence;
index.summary.counts.allocator_war_wave_21_typed_source_only_identifiers = typedSourceOnly;
index.summary.counts.allocator_war_wave_21_typed_unindexed_identifiers = typedUnindexed;
index.summary.counts.allocator_war_wave_21_reviewed_observations = observations.filter(row => row.authority_state === 'maintainer_reviewed_below_second_party_review').length;
index.summary.counts.allocator_war_wave_21_unreviewed_intake_observations = observations.filter(row => row.authority_state === 'unreviewed_intake_only').length;
index.summary.counts.allocator_war_wave_21_estate_consumers = estates.length;
index.summary.counts.allocator_war_wave_21_program_consumers = programs.length;
index.summary.counts.allocator_war_wave_21_complete_findings = 0;
index.summary.boundaries.allocator_war_wave_21_estate_route_is_finding = false;
index.summary.boundaries.allocator_war_wave_21_intake_is_reviewed = false;
index.summary.boundaries.allocator_war_wave_21_typed_view_proves_identity_or_truth = false;
index.summary.boundaries.allocator_war_wave_21_graph_effect = 'none';

objects.allocator_war_wave_21 = {
  schema_version: 'lake-allocator-war-semantics-wave-21@1',
  policy_path: 'data/project/lake-allocator-war-wave-21-policy.json',
  observation_registry_path: policy.paths.observation_registry,
  waterline_registry_path: policy.paths.waterline_registry,
  estate_registry_path: policy.paths.estate_registry,
  program_registry_path: policy.paths.program_registry,
  source_rows: authorityByCompound.size,
  contract_objects: projectionTargets.size,
  typed_divergent_views: typedDivergence,
  typed_source_only_identifiers: typedSourceOnly,
  typed_unindexed_identifiers: typedUnindexed,
  reviewed_observations: receipt.counts.wave_01_reviewed_observations,
  unreviewed_intake_observations: receipt.counts.wave_02_unreviewed_observations,
  estate_consumers: estates.length,
  program_consumers: programs.length,
  graph_effect: 'none',
  boundaries: policy.boundaries
};

gaps.allocator_war_wave_21 = {
  source_rows: authorityByCompound.size,
  contract_objects: projectionTargets.size,
  indexed_objects: observed,
  typed_divergent_views: typedDivergence,
  typed_source_only_identifiers: typedSourceOnly,
  typed_unindexed_identifiers: typedUnindexed,
  remaining_unadjudicated_divergence: remainingDivergence.length,
  remaining_unadjudicated_source_only: remainingSourceOnly.length,
  remaining_unadjudicated_unindexed: remainingUnindexed.length,
  reviewed_observations: receipt.counts.wave_01_reviewed_observations,
  unreviewed_intake_observations: receipt.counts.wave_02_unreviewed_observations,
  estate_acquisition_routes_open: estates.filter(row => row.next_acquisition.length > 0).length,
  program_acquisition_routes_open: programs.filter(row => row.next_acquisition.length > 0).length,
  complete_findings: 0,
  graph_effect: 'none',
  review_required_to_route: false,
  publication_cleared: false
};

writeJson('build/lake-index.json', index);
writeJson('build/lake-object-index.json', objects);
writeJson('build/lake-index-gaps.json', gaps);

console.log('allocator-war Wave 21 overlay stabilized');
console.log(`  source rows / contract objects: ${authorityByCompound.size}/${projectionTargets.size}`);
console.log(`  typed divergence/source-only/unindexed: ${typedDivergence}/${typedSourceOnly}/${typedUnindexed}`);
console.log(`  remaining global unadjudicated divergence/source-only/unindexed: ${remainingDivergence.length}/${remainingSourceOnly.length}/${remainingUnindexed.length}`);
console.log(`  reviewed/intake observations: ${receipt.counts.wave_01_reviewed_observations}/${receipt.counts.wave_02_unreviewed_observations}`);
console.log(`  estate/program consumers: ${estates.length}/${programs.length}`);
console.log('  graph/publication findings: 0/0');
