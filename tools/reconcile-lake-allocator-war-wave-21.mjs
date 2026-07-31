#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
};
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digest = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function graphDigests() {
  return {
    participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

const policy = readJson('data/project/lake-allocator-war-wave-21-policy.json');
const observations = readJsonl(policy.paths.observation_registry);
const waterline = readJsonl(policy.paths.waterline_registry);
const estates = readJsonl(policy.paths.estate_registry);
const programs = readJsonl(policy.paths.program_registry);
const receipt = readJson(policy.paths.receipt);
const projection = readJson(policy.paths.projection);
const index = readJson('build/lake-index.json');
const objectIndex = readJson('build/lake-object-index.json');

const rows = [
  ...observations.map(row => ({ key: 'allocator_record_id', value: row.allocator_record_id, sourcePath: policy.paths.observation_registry, authority: row.authority_state })),
  ...waterline.map(row => ({ key: 'allocator_class_id', value: row.allocator_class_id, sourcePath: policy.paths.waterline_registry, authority: row.authority_state })),
  ...estates.map(row => ({ key: 'allocator_estate_feed_id', value: row.allocator_estate_feed_id, sourcePath: policy.paths.estate_registry, authority: row.route_authority })),
  ...programs.map(row => ({ key: 'allocator_program_feed_id', value: row.allocator_program_feed_id, sourcePath: policy.paths.program_registry, authority: row.route_authority }))
];
const objectByCompound = new Map((objectIndex.objects ?? []).map(object => [`${object.id_key}:${object.id_value}`, object]));
const fileByPath = new Map((index.files ?? []).map(file => [file.path, file]));

let sourceObserved = 0;
let projectionObserved = 0;
let indexObserved = 0;
let authoritativeReachable = 0;
const missing = [];
for (const row of rows) {
  const object = objectByCompound.get(`${row.key}:${row.value}`);
  if (!object) {
    missing.push({ ...row, missing: 'index_object' });
    continue;
  }
  indexObserved += 1;
  const source = (object.occurrences ?? []).some(occurrence =>
    occurrence.path === row.sourcePath
  );
  const generated = (object.occurrences ?? []).some(occurrence =>
    occurrence.path === policy.paths.projection
  );
  if (source) sourceObserved += 1;
  else missing.push({ ...row, missing: 'source_occurrence' });
  if (generated) projectionObserved += 1;
  else missing.push({ ...row, missing: 'projection_occurrence' });
  const sourceFile = fileByPath.get(row.sourcePath);
  const projectionFile = fileByPath.get(policy.paths.projection);
  if (sourceFile?.authoritative_reachable && projectionFile?.authoritative_reachable) authoritativeReachable += 1;
}

assert(missing.length === 0, `allocator-war Wave 21 source/projection/index gaps: ${JSON.stringify(missing)}`);
assert(sourceObserved === rows.length, 'not every Wave 21 row is source-observed');
assert(projectionObserved === rows.length, 'not every Wave 21 row is projection-observed');
assert(indexObserved === rows.length, 'not every Wave 21 row is index-observed');
assert(authoritativeReachable === rows.length, 'not every Wave 21 row is authoritatively reachable');

for (const relative of [
  'data/project/lake-allocator-war-wave-21-policy.json',
  policy.paths.observation_registry,
  policy.paths.waterline_registry,
  policy.paths.estate_registry,
  policy.paths.program_registry,
  policy.paths.receipt,
  policy.paths.projection,
  policy.paths.report
]) {
  assert(fileByPath.get(relative)?.authoritative_reachable === true, `${relative}: not authoritative reachable`);
}

const afterGraphDigests = graphDigests();
assert(JSON.stringify(afterGraphDigests) === JSON.stringify(receipt.graph_digests), 'graph or participation payload changed');

const counts = {
  source_rows: rows.length,
  observation_rows: observations.length,
  waterline_rows: waterline.length,
  estate_rows: estates.length,
  program_rows: programs.length,
  source_ids_source_observed: sourceObserved,
  source_ids_projection_observed: projectionObserved,
  source_ids_index_observed: indexObserved,
  source_ids_authoritative_reachable: authoritativeReachable,
  estate_ids_index_observed: estates.length,
  program_ids_index_observed: programs.length,
  reviewed_observations: observations.filter(row => row.authority_state === 'maintainer_reviewed_below_second_party_review').length,
  unreviewed_intake_observations: observations.filter(row => row.authority_state === 'unreviewed_intake_only').length,
  complete_compact_findings: 0,
  racial_order_findings: 0,
  prevalence_findings: 0,
  coordination_findings: 0,
  common_purpose_findings: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0,
  publication_clearances: 0
};

const reconciliation = {
  schema_version: 'lake-allocator-war-wave-21-reconciliation@1',
  program_id: policy.program_id,
  wave_id: policy.wave_id,
  as_of: policy.as_of,
  projection_contract: policy.projection_contract,
  source_registry_digests: receipt.source_registry_digests,
  import_digests: receipt.import_digests,
  graph_digests: afterGraphDigests,
  counts,
  missing_rows: missing,
  current_state: {
    source_projection_index_complete: true,
    post_execution_reconciliation_complete: true,
    wave_01_authority: 'maintainer_reviewed_below_second_party_review',
    wave_02_authority: 'unreviewed_intake_only',
    complete_compact_generated: false,
    racial_order_generated: false,
    prevalence_generated: false,
    coordination_generated: false,
    common_purpose_generated: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  },
  boundaries: policy.boundaries
};

receipt.status = 'materialized_source_projection_index_complete';
receipt.counts.source_ids_index_observed = indexObserved;
receipt.counts.source_ids_projection_observed = projectionObserved;
receipt.counts.source_ids_authoritative_reachable = authoritativeReachable;
receipt.counts.estate_ids_index_observed = estates.length;
receipt.counts.program_ids_index_observed = programs.length;
receipt.post_execution_reconciliation_complete = true;
receipt.source_projection_index_complete = true;
receipt.reconciliation_sha256 = digest(reconciliation);
receipt.graph_digests = afterGraphDigests;

projection.counts = receipt.counts;
projection.reconciliation = {
  state: 'complete',
  reconciliation_path: policy.paths.reconciliation,
  reconciliation_sha256: digest(reconciliation)
};

writeJson(policy.paths.reconciliation, reconciliation);
writeJson(policy.paths.receipt, receipt);
writeJson(policy.paths.projection, projection);

console.log('allocator-war Wave 21 reconciled');
console.log(`  source/projection/index/reachable: ${sourceObserved}/${projectionObserved}/${indexObserved}/${authoritativeReachable}`);
console.log(`  observations reviewed/intake: ${counts.reviewed_observations}/${counts.unreviewed_intake_observations}`);
console.log(`  estate/program routes: ${estates.length}/${programs.length}`);
console.log('  graph/publication findings: 0/0');
