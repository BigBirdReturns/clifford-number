#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCrossCaseAcceptance } from './lib/axm-cross-case-join.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-cross-case-acceptance-wave-07-policy.json';
const full = relative => path.join(root, relative);
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

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const fixture = readJson(policy.fixture_path);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.acceptance_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const active = readJson('build/axm-identity.json');
const registry = readJsonl(policy.decision_registry_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const hopGraph = readJson('build/hop-graph.json');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

if (policy.schema_version !== 'lake-axm-cross-case-acceptance-wave-07-policy@1') fail('unexpected Wave 07 policy schema');
if (fixture?.schema_version !== 'axm-cross-case-acceptance-fixture@1') fail('unexpected Wave 07 fixture schema');
if (plan?.schema_version !== 'lake-axm-cross-case-acceptance-wave-07-plan@1') fail('unexpected Wave 07 plan schema');
if (receipt?.schema_version !== 'lake-axm-cross-case-acceptance-wave-07@1') fail('unexpected Wave 07 receipt schema');
if (reconciliation?.schema_version !== 'lake-axm-cross-case-acceptance-wave-07-reconciliation@1') fail('unexpected Wave 07 reconciliation schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key) fail('Wave 07 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 07 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 07 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 07 reconciliation fingerprint mismatch');

let recomputed = null;
try {
  recomputed = compileCrossCaseAcceptance(fixture);
  assert.deepEqual(recomputed, plan.fixture_result);
} catch (error) {
  fail(`Wave 07 deterministic fixture reconstruction failed: ${error.message}`);
}

const expectedRows = recomputed ? [
  ...recomputed.assertion_decisions,
  ...recomputed.unasserted_decisions,
  ...recomputed.temporal_decisions,
  recomputed.hop_decision
].sort((left, right) => `${left.row_type}:${left.decision_id}`.localeCompare(`${right.row_type}:${right.decision_id}`)) : [];
try { assert.deepEqual(registry, expectedRows); } catch (error) { fail(`Wave 07 registry drift: ${error.message}`); }

if (registry.length !== policy.expected.decision_registry_rows) fail('decision registry row count drift');
if (new Set(registry.map(row => row.decision_id)).size !== registry.length) fail('duplicate Wave 07 decision ID');
const assertions = registry.filter(row => row.row_type === 'join_assertion');
const accepted = assertions.filter(row => row.status === 'accepted');
const rejected = assertions.filter(row => row.status === 'rejected');
const unasserted = registry.filter(row => row.row_type === 'unasserted_overlap_control');
const temporal = registry.filter(row => row.row_type === 'temporal_claim_control');
const hopControls = registry.filter(row => row.row_type === 'hop_control_summary');
if (assertions.length !== policy.expected.join_assertions) fail('join assertion count drift');
if (accepted.length !== policy.expected.accepted_join_assertions) fail('accepted assertion count drift');
if (rejected.length !== policy.expected.rejected_join_assertions) fail('rejected assertion count drift');
if (unasserted.length !== policy.expected.unasserted_overlap_controls) fail('unasserted control count drift');
if (temporal.length !== policy.expected.temporal_claim_controls) fail('temporal control count drift');
if (hopControls.length !== 1) fail('hop control summary count drift');

const expectedReasons = new Map((fixture?.join_assertions ?? []).map(row => [row.assertion_id, { status: row.expected_status, reason: row.expected_reason }]));
for (const row of assertions) {
  const expected = expectedReasons.get(row.decision_id);
  if (!expected) fail(`${row.decision_id}: fixture expectation missing`);
  else {
    if (row.status !== expected.status) fail(`${row.decision_id}: status drift`);
    if (row.reason !== expected.reason) fail(`${row.decision_id}: reason drift`);
  }
}
if (accepted.length === 1) {
  const row = accepted[0];
  if (row.authorized_scope !== policy.authorized_scope) fail('accepted join scope drift');
  if (!/^AXMBRIDGE-[a-f0-9]{24}$/.test(row.identity_bridge_key)) fail('accepted bridge key malformed');
  if (row.entities_merged !== false) fail('accepted resolution merged entities');
  if (!(row.left_source_custody?.length > 0 && row.right_source_custody?.length > 0 && row.assertion_custody?.length > 0)) fail('accepted resolution lacks source custody');
  if (!(row.overlapping_identity_tokens?.length > 0)) fail('accepted resolution lacks token overlap');
  if (row.explicit_cross_case_identity_resolution_authorized !== true) fail('accepted resolution authorization missing');
}

for (const row of registry) {
  if (row.automatic_cross_case_join_authorized !== false) fail(`${row.decision_id}: automatic join boundary drift`);
  if (row.cross_case_graph_join_authorized !== false) fail(`${row.decision_id}: graph join boundary drift`);
  if (row.cross_case_hop_creation_authorized !== false) fail(`${row.decision_id}: hop creation boundary drift`);
  if (row.graph_effect !== 'none') fail(`${row.decision_id}: graph effect drift`);
}
if (!unasserted.every(row => row.token_overlap_observed === true && row.reason === 'explicit_assertion_missing' && row.explicit_cross_case_identity_resolution_authorized === false)) fail('unasserted same-label control drift');
const temporalById = new Map(temporal.map(row => [row.decision_id, row]));
if (temporalById.get('fixture-temporal-disjoint')?.claim_identity_equal !== true
  || temporalById.get('fixture-temporal-disjoint')?.temporal_overlap !== false
  || temporalById.get('fixture-temporal-disjoint')?.hop_basis_candidate !== false) fail('disjoint temporal control drift');
if (temporalById.get('fixture-temporal-overlap')?.claim_identity_equal !== true
  || temporalById.get('fixture-temporal-overlap')?.temporal_overlap !== true
  || temporalById.get('fixture-temporal-overlap')?.hop_basis_candidate !== true) fail('overlapping temporal control drift');
if (hopControls.length === 1) {
  const hop = hopControls[0];
  if (hop.edges.length !== policy.expected.hop_control_edges) fail('hop edge positive-control drift');
  if (hop.rejected_surfaces.length !== policy.expected.hop_control_rejected_surfaces) fail('hop rejected-surface drift');
  if (hop.rejected_pairs.length !== policy.expected.hop_control_rejected_pairs) fail('hop rejected-pair drift');
  const surfaceReasons = hop.rejected_surfaces.map(row => row.reason).sort();
  const pairReasons = hop.rejected_pairs.map(row => row.reason).sort();
  try { assert.deepEqual(surfaceReasons, [...fixture.hop_controls.expected.rejected_surface_reasons].sort()); } catch { fail('hop rejected-surface reasons drift'); }
  try { assert.deepEqual(pairReasons, [...fixture.hop_controls.expected.rejected_pair_reasons].sort()); } catch { fail('hop rejected-pair reasons drift'); }
}

if (active?.scheme?.status !== 'reconciled_genesis_v1' || active?.scheme?.external_axm_gate_complete !== true) fail('active identity migration state drift');
if (active?.scheme?.cross_case_join_authorized !== false) fail('active projection broad join flag must remain false');
if (/AXMBRIDGE-|fixture-join-accept-reciprocal-alias/.test(JSON.stringify(hopGraph))) fail('synthetic bridge leaked into active hop graph');

if (receipt?.authorized_scope !== policy.authorized_scope) fail('receipt authorized scope drift');
if (receipt?.explicit_cross_case_identity_resolution_authorized !== true) fail('receipt explicit-resolution authorization missing');
if (receipt?.automatic_cross_case_join_authorized !== false || receipt?.cross_case_graph_join_authorized !== false || receipt?.cross_case_hop_creation_authorized !== false) fail('receipt overclaims automatic, graph, or hop authority');
if (receipt?.active_projection_cross_case_join_authorized !== false) fail('receipt broad active join boundary drift');
if (receipt?.synthetic_fixture_only !== true) fail('receipt synthetic-fixture boundary missing');
if (receipt?.decisions_requiring_human_permission !== 0) fail('receipt human-permission count drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.fixture_path, policy.decision_registry_path, policy.acceptance_receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.decision_registry_path)?.index_file !== true) fail('Wave 07 registry is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let observed = 0;
for (const row of registry) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  if (!object) fail(`${row.decision_id}: lake decision object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.decision_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false)) fail(`${row.decision_id}: registry occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.plan_path && item.generated === true)) fail(`${row.decision_id}: plan occurrence missing`);
    observed += 1;
  }
}

if (reconciliation?.after?.authorized_scope !== policy.authorized_scope) fail('reconciliation authorized scope drift');
if (reconciliation?.after?.accepted_explicit_assertions !== policy.expected.accepted_join_assertions) fail('reconciliation accepted count drift');
if (reconciliation?.after?.rejected_assertions !== policy.expected.rejected_join_assertions) fail('reconciliation rejected count drift');
if (reconciliation?.after?.decision_registry_rows !== policy.expected.decision_registry_rows) fail('reconciliation registry count drift');
if (reconciliation?.after?.decision_ids_source_projection_and_index_observed !== policy.expected.decision_registry_rows) fail('reconciliation observed-decision count drift');
if (reconciliation?.after?.source_controls_authoritative_reachable !== true) fail('reconciliation source-control reachability missing');
if (reconciliation?.after?.explicit_cross_case_identity_resolution_authorized !== true) fail('reconciliation explicit-resolution authorization missing');
if (reconciliation?.after?.automatic_cross_case_join_authorized !== false
  || reconciliation?.after?.cross_case_graph_join_authorized !== false
  || reconciliation?.after?.cross_case_hop_creation_authorized !== false
  || reconciliation?.after?.active_projection_cross_case_join_authorized !== false) fail('reconciliation overclaims join authority');
if (reconciliation?.after?.synthetic_bridge_tokens_in_active_hop_graph !== 0) fail('synthetic bridge leaked into active hop graph');

for (const field of [
  'synthetic_fixture_complete',
  'deterministic_fixture_reconstruction_complete',
  'positive_identity_resolution_control_passed',
  'all_negative_controls_passed',
  'all_decision_ids_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'explicit_cross_case_identity_resolution_authorized',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`completion ${field} missing`);
for (const field of [
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'active_projection_cross_case_join_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`completion ${field} boundary drift`);
if (reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('completion human-permission count drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.synthetic_fixture_proves_real_world_identity !== false) fail(`${name}: synthetic identity boundary missing`);
  if (boundaries?.same_label_proves_same_entity !== false) fail(`${name}: same-label boundary missing`);
  if (boundaries?.declared_alias_alone_proves_same_entity !== false) fail(`${name}: alias boundary missing`);
  if (boundaries?.explicit_identity_resolution_merges_entities !== false) fail(`${name}: merge boundary missing`);
  if (boundaries?.explicit_identity_resolution_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.explicit_identity_resolution_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.explicit_cross_case_identity_resolution_authorized !== true) fail(`${name}: explicit-resolution authorization drift`);
  if (boundaries?.automatic_cross_case_join_authorized !== false || boundaries?.cross_case_graph_join_authorized !== false || boundaries?.cross_case_hop_creation_authorized !== false) fail(`${name}: automatic/graph/hop boundary drift`);
  if (boundaries?.active_projection_cross_case_join_authorized !== false || boundaries?.graph_effect !== 'none') fail(`${name}: active/graph boundary drift`);
}

if (!/explicit, source-custodied, graph-inert cross-case identity resolution/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 07 contract');
if (!/automatic same-label joins remain prohibited/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks automatic join prohibition');
if (!/explicit cross-case identity resolution/i.test(readme)) fail('README lacks Wave 07 lane');
if (!/does not create a graph edge or hop/i.test(readme)) fail('README lacks graph/hop boundary');
if (!report.includes('explicit identity resolution authorized:       true')) fail('Wave 07 report lacks explicit authorization');
if (!report.includes('automatic cross-case join authorized:          false')) fail('Wave 07 report lacks automatic-join boundary');
if (!reconciliationReport.includes('decision IDs source/projection/indexed:      9')) fail('Wave 07 reconciliation report lacks decision observation');
if (!reconciliationReport.includes('cross-case graph join authorized:            false')) fail('Wave 07 reconciliation report lacks graph boundary');

if (errors.length) {
  console.error(`lake AXM cross-case acceptance Wave 07 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake AXM cross-case acceptance Wave 07 validation: OK');
console.log(`  accepted / rejected assertions: ${accepted.length} / ${rejected.length}`);
console.log(`  decision IDs observed: ${observed}/${registry.length}`);
console.log('  explicit graph-inert identity resolution authorized: true');
console.log('  automatic, graph, and hop joins authorized: false');
