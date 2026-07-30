#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-unresolved-subject-adjudication-wave-15-policy.json';
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}

function readJsonl(relative) {
  try {
    return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`line ${index + 1}: ${error.message}`); }
    });
  } catch (error) {
    fail(`${relative}: ${error.message}`);
    return [];
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function validateManifest(rows, label) {
  for (const row of rows ?? []) {
    if (!fs.existsSync(full(row.path))) { fail(`${label}: ${row.path} missing`); continue; }
    const bytes = fs.readFileSync(full(row.path));
    if (bytes.length !== row.bytes) fail(`${label}: ${row.path} byte length drift`);
    if (sha256(bytes) !== row.sha256) fail(`${label}: ${row.path} hash drift`);
  }
}

function lakeRows() {
  if (fs.existsSync(full('build/lake-index.json'))) {
    return {
      files: readJson('build/lake-index.json')?.files ?? [],
      objects: readJson('build/lake-object-index.json')?.objects ?? []
    };
  }
  return {
    files: readJsonl('build/lake-index/files.jsonl'),
    objects: readJsonl('build/lake-index/objects.jsonl')
  };
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const registryRows = readJsonl(policy.registry_path);
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');
const { files, objects } = lakeRows();

if (policy.schema_version !== 'lake-unresolved-subject-adjudication-wave-15-policy@1') fail('unexpected Wave 15 policy schema');
if (projection?.schema_version !== 'unresolved-subject-adjudication-wave-15@1') fail('unexpected Wave 15 projection schema');
if (plan?.schema_version !== 'unresolved-subject-adjudication-wave-15-plan@1') fail('unexpected Wave 15 plan schema');
if (receipt?.schema_version !== 'lake-unresolved-subject-adjudication-wave-15@1') fail('unexpected Wave 15 receipt schema');
if (reconciliation?.schema_version !== 'lake-unresolved-subject-adjudication-wave-15-reconciliation@1') fail('unexpected Wave 15 reconciliation schema');
for (const artifact of [projection, plan, receipt, reconciliation]) {
  if (artifact?.program_key !== policy.program_key) fail('Wave 15 program key drift');
}
for (const [label, artifact] of [['projection', projection], ['receipt', receipt], ['reconciliation', reconciliation]]) {
  if (artifact?.source_fingerprint_sha256 !== manifestFingerprint(artifact?.input_manifest)) fail(`${label} fingerprint mismatch`);
  validateManifest(artifact?.input_manifest, `${label} manifest`);
}

const expectedCounts = {
  subject_rows: policy.expected.subject_rows,
  claim_references: policy.expected.claim_references,
  existing_provenance_identity_decisions: policy.expected.existing_provenance_identity_decisions,
  existing_controlled_identity_decisions: policy.expected.existing_controlled_identity_decisions,
  planned_new_canonical_records: policy.expected.planned_new_canonical_records,
  identity_decisions: policy.expected.identity_decisions,
  nonidentity_object_decisions: policy.expected.nonidentity_object_decisions,
  generic_unadjudicated_rows: 0,
  canonical_mutations_applied: 0,
  case_projection_changes: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0,
  accepted_cross_case_identity_bridges: 0,
  decisions_requiring_human_permission: 0
};
for (const [field, expected] of Object.entries(expectedCounts)) {
  if (projection?.counts?.[field] !== expected) fail(`Wave 15 projection count ${field} drift`);
}
if (registryRows.length !== policy.expected.subject_rows) fail('Wave 15 registry denominator drift');
if (JSON.stringify(registryRows) !== JSON.stringify(projection?.decisions)) fail('Wave 15 registry/projection decision drift');
if (projection?.identity_decisions?.length !== policy.expected.identity_decisions) fail('Wave 15 identity decision denominator drift');
if (projection?.nonidentity_objects?.length !== policy.expected.nonidentity_object_decisions) fail('Wave 15 nonidentity denominator drift');

const decisionIds = new Set();
const subjectObjectIds = new Set();
let provenanceCount = 0;
let controlledCount = 0;
let plannedCount = 0;
let nonidentityCount = 0;
for (const row of registryRows) {
  if (!row.adjudication_id || decisionIds.has(row.adjudication_id)) fail(`${row.adjudication_id ?? 'missing'}: duplicate or missing adjudication ID`);
  decisionIds.add(row.adjudication_id);
  if (!(row.source_claim_ids?.length > 0) || row.claim_count !== row.source_claim_ids.length) fail(`${row.adjudication_id}: claim denominator drift`);
  if (!row.evidence_basis?.length || !row.counterevidence?.length || !row.uncertainty?.length || !row.next_action) fail(`${row.adjudication_id}: judgment payload incomplete`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.adjudication_id}: reviewer permission dependency`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.adjudication_id}: reversibility drift`);
  if (row.canonical_mutation_applied !== false || row.case_projection_applied !== false) fail(`${row.adjudication_id}: Wave 15 applied an integration mutation`);
  if (row.source_records_mutated !== false || row.source_records_merged !== false || row.relationship_created !== false || row.participation_created !== false) fail(`${row.adjudication_id}: semantic effect overclaim`);
  if (row.accepted_cross_case_identity_bridge !== false || row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false || row.cross_case_hop_creation_authorized !== false || row.graph_effect !== 'none') fail(`${row.adjudication_id}: graph boundary drift`);
  if (row.evidence_truth_determined !== false || row.publication_cleared !== false) fail(`${row.adjudication_id}: epistemic or publication overclaim`);

  if (row.disposition === 'identity_existing_provenance') provenanceCount += 1;
  else if (row.disposition === 'identity_existing_controlled') controlledCount += 1;
  else if (row.disposition === 'identity_new_canonical_plan') plannedCount += 1;
  else if (row.disposition === 'bounded_nonidentity_object') {
    nonidentityCount += 1;
    if (!row.subject_object_id || !row.object_kind) fail(`${row.adjudication_id}: nonidentity object payload missing`);
    if (row.canonical_target !== null) fail(`${row.adjudication_id}: nonidentity row has canonical target`);
    if (subjectObjectIds.has(row.subject_object_id)) fail(`${row.subject_object_id}: duplicate subject-object ID`);
    subjectObjectIds.add(row.subject_object_id);
  } else fail(`${row.adjudication_id}: unknown disposition ${row.disposition}`);
}
if (provenanceCount !== policy.expected.existing_provenance_identity_decisions) fail('Wave 15 provenance decision count drift');
if (controlledCount !== policy.expected.existing_controlled_identity_decisions) fail('Wave 15 controlled decision count drift');
if (plannedCount !== policy.expected.planned_new_canonical_records) fail('Wave 15 planned-record count drift');
if (nonidentityCount !== policy.expected.nonidentity_object_decisions) fail('Wave 15 nonidentity count drift');

if (stableDigest(participation) !== projection?.graph_digests?.participation_sha256) fail('Wave 15 participation payload changed');
if (stableDigest(activeIdentity?.claims) !== projection?.graph_digests?.active_claims_sha256) fail('Wave 15 active claim payload changed');
if (stableDigest(hopGraph?.edges) !== projection?.graph_digests?.hop_edges_sha256) fail('Wave 15 hop edge payload changed');
if (stableDigest(hopGraph?.rejected_hop_surfaces) !== projection?.graph_digests?.rejected_hop_surfaces_sha256) fail('Wave 15 rejected hop surface payload changed');
if (stableDigest(hopGraph?.rejected_hop_pairs) !== projection?.graph_digests?.rejected_hop_pairs_sha256) fail('Wave 15 rejected hop pair payload changed');
const hopGraphText = JSON.stringify(hopGraph);
if ([...decisionIds, ...subjectObjectIds].some(token => hopGraphText.includes(token))) fail('Wave 15 control ID leaked into hop graph');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policyPath, policy.registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== false || row.authoritative_reachable !== true) fail(`${relative}: source-control state drift`);
}
if (fileByPath.get(policy.registry_path)?.index_file !== true) fail('Wave 15 decision registry is not an index surface');
for (const relative of [policy.projection_path, policy.plan_path, policy.reconciliation_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else if (row.generated !== true || row.authoritative_reachable !== true) fail(`${relative}: generated authoritative state drift`);
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionsObserved = 0;
let subjectObjectsObserved = 0;
for (const row of registryRows) {
  const decisionObject = objectByKey.get(`adjudication_id:${row.adjudication_id}`);
  if (!decisionObject) fail(`${row.adjudication_id}: lake object missing`);
  else {
    if (decisionObject.source_occurrence !== true || decisionObject.projection_occurrence !== true || decisionObject.indexed !== true) fail(`${row.adjudication_id}: source/projection/index state drift`);
    if (!decisionObject.occurrences.some(item => item.path === policy.registry_path && item.generated === false)) fail(`${row.adjudication_id}: source registry occurrence missing`);
    if (!decisionObject.occurrences.some(item => item.path === policy.projection_path && item.generated === true)) fail(`${row.adjudication_id}: generated projection occurrence missing`);
    decisionsObserved += 1;
  }
  if (row.subject_object_id) {
    const subjectObject = objectByKey.get(`subject_object_id:${row.subject_object_id}`);
    if (!subjectObject) fail(`${row.subject_object_id}: lake object missing`);
    else {
      if (subjectObject.source_occurrence !== true || subjectObject.projection_occurrence !== true || subjectObject.indexed !== true) fail(`${row.subject_object_id}: source/projection/index state drift`);
      if (!subjectObject.occurrences.some(item => item.path === policy.registry_path && item.generated === false)) fail(`${row.subject_object_id}: source registry occurrence missing`);
      if (!subjectObject.occurrences.some(item => item.path === policy.projection_path && item.generated === true)) fail(`${row.subject_object_id}: generated projection occurrence missing`);
      subjectObjectsObserved += 1;
    }
  }
}
if (decisionsObserved !== policy.expected.decision_ids_source_projection_and_index_observed) fail('Wave 15 decision lake observation count drift');
if (subjectObjectsObserved !== policy.expected.subject_object_ids_source_projection_and_index_observed) fail('Wave 15 subject-object lake observation count drift');

if (receipt?.post_execution_reconciliation_complete !== true) fail('Wave 15 receipt is not complete');
if (receipt?.counts?.decision_ids_source_projection_and_index_observed !== policy.expected.decision_ids_source_projection_and_index_observed) fail('Wave 15 receipt decision observation drift');
if (receipt?.counts?.subject_object_ids_source_projection_and_index_observed !== policy.expected.subject_object_ids_source_projection_and_index_observed) fail('Wave 15 receipt subject-object observation drift');
for (const field of [
  'complete_wave_14_unresolved_denominator_recomputed',
  'every_row_received_exactly_one_disposition',
  'every_decision_id_source_projection_and_index_observed',
  'every_subject_object_id_source_projection_and_index_observed',
  'provenance_backed_identity_decisions_complete',
  'controlled_identity_decisions_complete',
  'new_canonical_plans_complete',
  'nonidentity_object_typing_complete',
  'participation_payload_unchanged',
  'active_claim_payload_unchanged',
  'hop_edge_payload_unchanged',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 15 completion ${field} missing`);
for (const field of [
  'source_records_mutated',
  'source_records_merged',
  'relationship_created',
  'participation_created',
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 15 completion ${field} boundary drift`);
if (reconciliation?.completion?.generic_unadjudicated_rows !== 0 || reconciliation?.completion?.generic_wait_states !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.graph_effect !== 'none') fail('Wave 15 completion count or graph drift');

if (!/Unresolved subject adjudication/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 15 contract');
if (!/Unresolved subject adjudication/i.test(readme)) fail('README lacks Wave 15 contract');
if (!report.includes('subject rows:                               57')) fail('Wave 15 report lacks subject denominator');
if (!reconciliationReport.includes('decision IDs source/projected/indexed:             57')) fail('Wave 15 reconciliation report lacks decision observation denominator');

if (errors.length) {
  console.error(`lake unresolved subject adjudication Wave 15 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('lake unresolved subject adjudication Wave 15 validation: OK');
console.log(`  subject rows / claim references: ${policy.expected.subject_rows} / ${policy.expected.claim_references}`);
console.log(`  identity / nonidentity decisions: ${policy.expected.identity_decisions} / ${policy.expected.nonidentity_object_decisions}`);
console.log(`  decision IDs source/projected/indexed: ${decisionsObserved}/${registryRows.length}`);
console.log(`  subject-object IDs source/projected/indexed: ${subjectObjectsObserved}/${subjectObjectIds.size}`);
console.log('  generic waits, graph effects, and human-permission dependencies: 0');
