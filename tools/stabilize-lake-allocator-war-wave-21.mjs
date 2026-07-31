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
  object_type: 'observation',
  authority_state: row.authority_state,
  review_state: row.review_state,
  source_wave_key: row.source_wave_key,
  source_observation_ref: row.source_observation_ref,
  acquisition_open: row.authority_state === 'unreviewed_intake_only' || row.next_required_records.length > 0
});
for (const row of waterline) authorityByCompound.set(`allocator_class_id:${row.allocator_class_id}`, {
  object_type: 'waterline_class',
  authority_state: row.authority_state,
  source_wave_key: row.source_wave_key,
  source_observation_refs: row.source_observation_refs,
  acquisition_open: row.next_required_records.length > 0
});
for (const row of estates) authorityByCompound.set(`allocator_estate_feed_id:${row.allocator_estate_feed_id}`, {
  object_type: 'estate_acquisition_route',
  authority_state: row.route_authority,
  consumer_key: row.consumer_key,
  acquisition_open: row.next_acquisition.length > 0
});
for (const row of programs) authorityByCompound.set(`allocator_program_feed_id:${row.allocator_program_feed_id}`, {
  object_type: 'program_feed',
  authority_state: row.route_authority,
  consumer_key: row.consumer_key,
  acquisition_open: row.next_acquisition.length > 0
});

let observed = 0;
let divergent = 0;
for (const object of objects.objects ?? []) {
  const contract = authorityByCompound.get(`${object.id_key}:${object.id_value}`);
  if (!contract) continue;
  object.allocator_war_wave_21 = {
    ...contract,
    graph_effect: 'none',
    finding_promoted: false,
    publication_cleared: false
  };
  observed += 1;
  if (object.divergent_projections_unadjudicated) divergent += 1;
}
assert(observed === authorityByCompound.size, `allocator-war Wave 21 indexed objects ${observed}/${authorityByCompound.size}`);
assert(divergent === 0, `allocator-war Wave 21 row identifiers have ${divergent} unresolved divergent projections`);

index.summary.counts.allocator_war_wave_21_source_rows = authorityByCompound.size;
index.summary.counts.allocator_war_wave_21_reviewed_observations = observations.filter(row => row.authority_state === 'maintainer_reviewed_below_second_party_review').length;
index.summary.counts.allocator_war_wave_21_unreviewed_intake_observations = observations.filter(row => row.authority_state === 'unreviewed_intake_only').length;
index.summary.counts.allocator_war_wave_21_estate_consumers = estates.length;
index.summary.counts.allocator_war_wave_21_program_consumers = programs.length;
index.summary.counts.allocator_war_wave_21_complete_findings = 0;
index.summary.boundaries.allocator_war_wave_21_estate_route_is_finding = false;
index.summary.boundaries.allocator_war_wave_21_intake_is_reviewed = false;
index.summary.boundaries.allocator_war_wave_21_graph_effect = 'none';

objects.allocator_war_wave_21 = {
  schema_version: 'lake-allocator-war-semantics-wave-21@1',
  policy_path: 'data/project/lake-allocator-war-wave-21-policy.json',
  observation_registry_path: policy.paths.observation_registry,
  waterline_registry_path: policy.paths.waterline_registry,
  estate_registry_path: policy.paths.estate_registry,
  program_registry_path: policy.paths.program_registry,
  source_rows: authorityByCompound.size,
  reviewed_observations: receipt.counts.wave_01_reviewed_observations,
  unreviewed_intake_observations: receipt.counts.wave_02_unreviewed_observations,
  estate_consumers: estates.length,
  program_consumers: programs.length,
  graph_effect: 'none',
  boundaries: policy.boundaries
};

gaps.allocator_war_wave_21 = {
  source_rows: authorityByCompound.size,
  indexed_objects: observed,
  unresolved_identifier_divergence: divergent,
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
console.log(`  indexed source rows: ${observed}/${authorityByCompound.size}`);
console.log(`  reviewed/intake observations: ${receipt.counts.wave_01_reviewed_observations}/${receipt.counts.wave_02_unreviewed_observations}`);
console.log(`  estate/program consumers: ${estates.length}/${programs.length}`);
console.log('  unresolved row divergence / graph effect: 0 / none');
