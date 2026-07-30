#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function run(file) {
  const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  }
  assert.equal(result.status, 0, `${file} failed`);
}

const builder = 'tools/build-lake-unresolved-subject-adjudication-wave-15.mjs';
run(builder);
const policy = readJson('data/project/lake-unresolved-subject-adjudication-wave-15-policy.json');
const deterministicPaths = [policy.registry_path, policy.projection_path, policy.plan_path, policy.report_path];
const firstHashes = Object.fromEntries(deterministicPaths.map(file => [file, sha256(file)]));
run(builder);
for (const file of deterministicPaths) assert.equal(sha256(file), firstHashes[file], `${file}: Wave 15 build is not deterministic`);

const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const registry = readJsonl(policy.registry_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const hopGraphText = fs.readFileSync('build/hop-graph.json', 'utf8');

assert.equal(projection.schema_version, 'unresolved-subject-adjudication-wave-15@1');
assert.equal(plan.schema_version, 'unresolved-subject-adjudication-wave-15-plan@1');
assert.equal(projection.counts.subject_rows, policy.expected.subject_rows);
assert.equal(projection.counts.claim_references, policy.expected.claim_references);
assert.equal(projection.counts.existing_provenance_identity_decisions, policy.expected.existing_provenance_identity_decisions);
assert.equal(projection.counts.existing_controlled_identity_decisions, policy.expected.existing_controlled_identity_decisions);
assert.equal(projection.counts.planned_new_canonical_records, policy.expected.planned_new_canonical_records);
assert.equal(projection.counts.identity_decisions, policy.expected.identity_decisions);
assert.equal(projection.counts.nonidentity_object_decisions, policy.expected.nonidentity_object_decisions);
assert.equal(projection.counts.generic_unadjudicated_rows, 0);
assert.equal(projection.counts.canonical_mutations_applied, 0);
assert.equal(projection.counts.case_projection_changes, 0);
assert.equal(projection.counts.decisions_requiring_human_permission, 0);
assert.deepEqual(registry, projection.decisions);
assert.equal(registry.length, policy.expected.subject_rows);
assert.equal(registry.reduce((total, row) => total + row.claim_count, 0), policy.expected.claim_references);

const decisionByKey = new Map(registry.map(row => [`${row.source_case_id}\0${row.local_subject_id}`, row]));
function decision(caseId, localSubjectId) {
  const row = decisionByKey.get(`${caseId}\0${localSubjectId}`);
  assert.ok(row, `${caseId}/${localSubjectId}: Wave 15 decision missing`);
  return row;
}

const anduril = decision('anduril-access-ownership', 'anduril-industries');
assert.equal(anduril.disposition, 'identity_existing_provenance');
assert.equal(anduril.canonical_target.canonical_id, 'anduril');
assert.equal(anduril.canonical_target.source_routing_id, 'SUBJROUTE-174d3559818ce58fe4531011');

const successorAgency = decision('arcadia-field-autopsy', 'org-arcadia-successor-agency');
assert.equal(successorAgency.disposition, 'identity_existing_provenance');
assert.equal(successorAgency.canonical_target.canonical_id, 'arcadia-successor-agency');
assert.equal(successorAgency.canonical_target.source_routing_id, 'SUBJROUTE-67bd3a34271ad4052ee7b379');

const safetyInstitute = decision('uk-ai-policy', 'ai-safety-institute');
assert.equal(safetyInstitute.disposition, 'identity_existing_controlled');
assert.equal(safetyInstitute.canonical_target.canonical_id, 'aisi');
assert.ok(safetyInstitute.receipt_ids.includes('gov-ai-action-plan'));

const no10 = decision('uk-ai-policy', 'no10');
assert.equal(no10.disposition, 'identity_existing_controlled');
assert.equal(no10.canonical_target.canonical_id, 'no-10');
assert.ok(no10.receipt_ids.includes('guardian-clifford-stepdown'));

for (const [localSubjectId, canonicalId, receiptId] of [
  ['code-first-girls', 'code-first-girls', 'guardian-clifford-stepdown'],
  ['detachment-201', 'detachment-201', 's-army-det201'],
  ['frontier-ai-taskforce', 'frontier-ai-taskforce', 'guardian-clifford-stepdown']
]) {
  const row = decision('uk-ai-policy', localSubjectId);
  assert.equal(row.disposition, 'identity_new_canonical_plan');
  assert.equal(row.canonical_target.canonical_id, canonicalId);
  assert.ok(row.receipt_ids.includes(receiptId));
  assert.equal(row.canonical_mutation_applied, false);
}

const contractOrder = decision('anduril-access-ownership', '70b02c26f00000035');
assert.equal(contractOrder.disposition, 'bounded_nonidentity_object');
assert.equal(contractOrder.object_kind, 'contract_order_identifier');
assert.ok(contractOrder.subject_object_id.startsWith('SUBJECTOBJECT-'));
assert.equal(contractOrder.canonical_target, null);

const noCanonicalMutationIds = new Set([...actors.map(row => row.id), ...organizations.map(row => row.id)]);
for (const row of registry.filter(item => item.disposition === 'identity_new_canonical_plan')) {
  assert.equal(noCanonicalMutationIds.has(row.canonical_target.canonical_id), false, `${row.canonical_target.canonical_id}: planned record already materialized`);
}

const subjectObjectIds = registry.filter(row => row.subject_object_id).map(row => row.subject_object_id);
assert.equal(subjectObjectIds.length, policy.expected.nonidentity_object_decisions);
assert.equal(new Set(subjectObjectIds).size, subjectObjectIds.length);
assert.equal(new Set(registry.map(row => row.adjudication_id)).size, registry.length);

for (const row of registry) {
  assert.ok(row.adjudication_id.startsWith('SUBJDEC-'));
  assert.ok(row.source_claim_ids.length > 0);
  assert.equal(row.claim_count, row.source_claim_ids.length);
  assert.ok(row.evidence_basis.length > 0);
  assert.ok(row.counterevidence.length > 0);
  assert.ok(row.uncertainty.length > 0);
  assert.ok(row.next_action);
  assert.equal(row.review_dependency.required_to_decide, false);
  assert.equal(row.reversibility.mode, 'append_preserving_supersession');
  assert.equal(row.canonical_mutation_applied, false);
  assert.equal(row.case_projection_applied, false);
  assert.equal(row.source_records_mutated, false);
  assert.equal(row.source_records_merged, false);
  assert.equal(row.relationship_created, false);
  assert.equal(row.participation_created, false);
  assert.equal(row.accepted_cross_case_identity_bridge, false);
  assert.equal(row.automatic_cross_case_join_authorized, false);
  assert.equal(row.cross_case_graph_join_authorized, false);
  assert.equal(row.cross_case_hop_creation_authorized, false);
  assert.equal(row.evidence_truth_determined, false);
  assert.equal(row.publication_cleared, false);
  assert.equal(row.graph_effect, 'none');
  assert.doesNotMatch(hopGraphText, new RegExp(row.adjudication_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  if (row.subject_object_id) assert.doesNotMatch(hopGraphText, new RegExp(row.subject_object_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.equal(plan.integration_frontier.existing_identity_resolutions_to_integrate, 14);
assert.equal(plan.integration_frontier.new_canonical_records_to_materialize, 3);
assert.equal(plan.integration_frontier.typed_nonidentity_objects_to_integrate, 40);
assert.equal(plan.integration_frontier.generic_wait_states, 0);
assert.equal(plan.integration_frontier.next_wave, 'lake-subject-integration-wave-16');
assert.equal(projection.completion.every_row_received_exactly_one_disposition, true);
assert.equal(projection.completion.generic_unadjudicated_rows, 0);
assert.equal(projection.completion.decisions_requiring_human_permission, 0);
assert.equal(projection.completion.graph_effect, 'none');

console.log('lake-unresolved-subject-adjudication-wave-15.test: OK (57/57 adjudicated; 17 identity decisions; 40 typed nonidentity objects; graph effect none)');
