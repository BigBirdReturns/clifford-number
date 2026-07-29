#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-production-cross-case-census-wave-08-policy.json';
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

function pairKey(left, right) {
  return [left, right].sort().join('\0');
}

const policy = readJson(policyPath);
if (!policy) process.exit(1);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.census_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const projection = readJson(policy.candidate_projection_path);
const candidates = readJsonl(policy.candidate_registry_path);
const casePairs = readJsonl(policy.case_pair_denominator_path);
const caseIndex = readJson('build/cases/index.json');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path))
  ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';

if (policy.schema_version !== 'lake-production-cross-case-census-wave-08-policy@1') fail('unexpected Wave 08 policy schema');
if (plan?.schema_version !== 'lake-production-cross-case-census-wave-08-plan@1') fail('unexpected Wave 08 plan schema');
if (receipt?.schema_version !== 'lake-production-cross-case-census-wave-08@1') fail('unexpected Wave 08 receipt schema');
if (reconciliation?.schema_version !== 'lake-production-cross-case-census-wave-08-reconciliation@1') fail('unexpected Wave 08 reconciliation schema');
if (projection?.schema_version !== 'axm-production-cross-case-candidate-index-wave-08@1') fail('unexpected Wave 08 projection schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key
  || reconciliation?.program_key !== policy.program_key || projection?.program_key !== policy.program_key) fail('Wave 08 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 08 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 08 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 08 reconciliation fingerprint mismatch');

const cases = [...(caseIndex?.cases ?? [])].sort((left, right) => left.case_id.localeCompare(right.case_id));
if (cases.length !== policy.expected.native_cases) fail(`native case count drift: ${cases.length}`);
const expectedPairKeys = new Set();
for (let i = 0; i < cases.length; i += 1) {
  for (let j = i + 1; j < cases.length; j += 1) expectedPairKeys.add(pairKey(cases[i].case_id, cases[j].case_id));
}
if (casePairs.length !== policy.expected.case_pairs) fail(`case-pair denominator count drift: ${casePairs.length}`);
if (new Set(casePairs.map(row => row.case_pair_id)).size !== casePairs.length) fail('duplicate Wave 08 case-pair ID');
try { assert.deepEqual(new Set(casePairs.map(row => pairKey(row.left_case_id, row.right_case_id))), expectedPairKeys); }
catch { fail('Wave 08 denominator does not cover every native case pair'); }

const orderedCandidates = [...candidates].sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.normalized_identity_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.normalized_identity_value}`));
const orderedPairs = [...casePairs].sort((left, right) => left.case_pair_id.localeCompare(right.case_pair_id));
try { assert.deepEqual(projection?.candidates, orderedCandidates); } catch { fail('Wave 08 generated candidate projection disagrees with source registry'); }
try { assert.deepEqual(projection?.case_pairs, orderedPairs); } catch { fail('Wave 08 generated pair projection disagrees with source denominator'); }
if (projection?.candidate_registry_path !== policy.candidate_registry_path) fail('Wave 08 candidate projection source path drift');
if (projection?.case_pair_denominator_path !== policy.case_pair_denominator_path) fail('Wave 08 pair projection source path drift');
if (projection?.counts?.candidates !== candidates.length) fail('Wave 08 projected candidate count drift');
if (projection?.counts?.case_pairs !== casePairs.length) fail('Wave 08 projected pair count drift');
if (projection?.counts?.accepted_production_identity_bridges !== 0) fail('Wave 08 projection accepted a production bridge');

if (new Set(candidates.map(row => row.candidate_id)).size !== candidates.length) fail('duplicate Wave 08 candidate ID');
for (const row of candidates) {
  if (!row.candidate_id) fail('Wave 08 candidate missing ID');
  if (row.status !== 'candidate_only') fail(`${row.candidate_id}: status escaped candidate_only`);
  if (row.reason !== 'wave_07_acceptance_conditions_not_met') fail(`${row.candidate_id}: reason drift`);
  if (!(Array.isArray(row.blocking_conditions) && row.blocking_conditions.length > 0)) fail(`${row.candidate_id}: material blockers missing`);
  for (const blocker of [
    'explicit_same_entity_assertion_absent',
    'assertion_source_custody_absent',
    'shared_identity_namespace_absent',
    'unambiguous_identity_token_overlap_absent'
  ]) if (!row.blocking_conditions.includes(blocker)) fail(`${row.candidate_id}: required blocker ${blocker} missing`);
  if (row.explicit_same_entity_assertion_present !== false) fail(`${row.candidate_id}: production assertion overclaimed`);
  if (row.assertion_source_custody_present !== false) fail(`${row.candidate_id}: assertion custody overclaimed`);
  if (row.shared_identity_namespace_present !== false) fail(`${row.candidate_id}: shared namespace overclaimed`);
  if (row.unambiguous_identity_token_overlap_present !== false) fail(`${row.candidate_id}: AXM token overlap overclaimed`);
  if (row.accepted_production_identity_bridge !== false) fail(`${row.candidate_id}: production bridge accepted`);
  if (row.automatic_cross_case_join_authorized !== false) fail(`${row.candidate_id}: automatic join authorized`);
  if (row.cross_case_graph_join_authorized !== false) fail(`${row.candidate_id}: graph join authorized`);
  if (row.cross_case_hop_creation_authorized !== false) fail(`${row.candidate_id}: hop creation authorized`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.candidate_id}: human-permission dependency remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.candidate_id}: correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.candidate_id}: graph effect created`);
}

for (const row of casePairs) {
  const rows = candidates.filter(candidate => pairKey(candidate.left_case_id, candidate.right_case_id) === pairKey(row.left_case_id, row.right_case_id));
  if (row.exact_local_identifier_recurrences !== rows.length) fail(`${row.case_pair_id}: recurrence count drift`);
  if (row.distinct_identity_values !== new Set(rows.map(candidate => candidate.normalized_identity_value)).size) fail(`${row.case_pair_id}: distinct value count drift`);
  if (row.candidates_with_source_custody_on_both_sides !== rows.filter(candidate => candidate.left_source_custody_present && candidate.right_source_custody_present).length) fail(`${row.case_pair_id}: custody count drift`);
  if (row.accepted_production_identity_bridges !== 0) fail(`${row.case_pair_id}: production bridge accepted`);
  if (row.case_pair_measured !== true) fail(`${row.case_pair_id}: pair not measured`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false) fail(`${row.case_pair_id}: join boundary drift`);
  if (row.graph_effect !== 'none') fail(`${row.case_pair_id}: graph effect created`);
}

if (receipt?.counts?.native_cases !== cases.length) fail('Wave 08 receipt native-case count drift');
if (receipt?.counts?.case_pairs !== casePairs.length) fail('Wave 08 receipt case-pair count drift');
if (receipt?.counts?.candidate_pair_rows !== candidates.length) fail('Wave 08 receipt candidate count drift');
if (receipt?.counts?.accepted_production_identity_bridges !== 0) fail('Wave 08 receipt accepted a production bridge');
if (receipt?.explicit_cross_case_identity_resolution_lane_available !== true) fail('Wave 08 receipt lost the bounded resolution lane');
if (receipt?.automatic_cross_case_join_authorized !== false || receipt?.cross_case_graph_join_authorized !== false
  || receipt?.cross_case_hop_creation_authorized !== false || receipt?.active_projection_cross_case_join_authorized !== false) fail('Wave 08 receipt overclaims join authority');
if (receipt?.decisions_requiring_human_permission !== 0) fail('Wave 08 receipt human-permission count drift');

if (plan?.census?.counts?.candidate_pair_rows !== candidates.length) fail('Wave 08 plan candidate count drift');
if (plan?.completion?.native_case_pair_denominator_measured !== true) fail('Wave 08 plan denominator completion missing');
if (plan?.completion?.production_candidate_registry_present !== true) fail('Wave 08 plan registry completion missing');
if (plan?.completion?.every_candidate_has_explicit_blocking_conditions !== true) fail('Wave 08 plan blocker completion missing');
if (plan?.completion?.accepted_production_identity_bridges !== 0) fail('Wave 08 plan accepted a production bridge');
if (plan?.completion?.automatic_cross_case_join_authorized !== false || plan?.completion?.cross_case_graph_join_authorized !== false
  || plan?.completion?.cross_case_hop_creation_authorized !== false || plan?.completion?.active_projection_cross_case_join_authorized !== false) fail('Wave 08 plan overclaims join authority');
if (plan?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 08 plan human-permission count drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.candidate_registry_path, policy.case_pair_denominator_path, policy.census_receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.candidate_registry_path)?.index_file !== true) fail('Wave 08 candidate registry is not an index surface');
if (fileByPath.get(policy.case_pair_denominator_path)?.index_file !== true) fail('Wave 08 pair denominator is not an index surface');
const projectionFile = fileByPath.get(policy.candidate_projection_path);
if (!projectionFile) fail('Wave 08 generated candidate projection lake row missing');
else {
  if (projectionFile.generated !== true) fail('Wave 08 generated candidate projection not marked generated');
  if (projectionFile.index_file !== true) fail('Wave 08 generated candidate projection is not an index surface');
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let candidatesObserved = 0;
for (const row of candidates) {
  const object = objectByKey.get(`candidate_id:${row.candidate_id}`);
  if (!object) fail(`${row.candidate_id}: lake object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.candidate_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.candidate_registry_path && item.generated === false)) fail(`${row.candidate_id}: source registry occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true)) fail(`${row.candidate_id}: generated projection occurrence missing`);
    candidatesObserved += 1;
  }
}
let pairsObserved = 0;
for (const row of casePairs) {
  const object = objectByKey.get(`case_pair_id:${row.case_pair_id}`);
  if (!object) fail(`${row.case_pair_id}: lake object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.case_pair_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.case_pair_denominator_path && item.generated === false)) fail(`${row.case_pair_id}: source denominator occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true)) fail(`${row.case_pair_id}: generated projection occurrence missing`);
    pairsObserved += 1;
  }
}

if (activeIdentity?.scheme?.status !== 'reconciled_genesis_v1') fail('active identity scheme drift');
if (activeIdentity?.scheme?.external_axm_gate_complete !== true) fail('external AXM gate drift');
if (activeIdentity?.scheme?.cross_case_join_authorized !== false) fail('active projection broad join flag opened');
if (/XCCAND-|XCPAIR-|production-cross-case/i.test(JSON.stringify(hopGraph))) fail('Wave 08 census leaked into active hop graph');

if (reconciliation?.after?.native_cases !== cases.length) fail('Wave 08 reconciliation native-case count drift');
if (reconciliation?.after?.case_pair_denominator_rows !== casePairs.length) fail('Wave 08 reconciliation pair count drift');
if (reconciliation?.after?.candidate_rows !== candidates.length || reconciliation?.after?.candidate_projection_rows !== candidates.length) fail('Wave 08 reconciliation candidate count drift');
if (reconciliation?.after?.pair_projection_rows !== casePairs.length) fail('Wave 08 reconciliation pair projection count drift');
if (reconciliation?.after?.candidate_ids_source_projection_and_index_observed !== candidates.length) fail('Wave 08 reconciliation candidate observation drift');
if (reconciliation?.after?.case_pair_ids_source_projection_and_index_observed !== casePairs.length) fail('Wave 08 reconciliation pair observation drift');
if (reconciliation?.after?.accepted_production_identity_bridges !== 0) fail('Wave 08 reconciliation accepted a production bridge');
if (reconciliation?.after?.automatic_cross_case_join_authorized !== false
  || reconciliation?.after?.cross_case_graph_join_authorized !== false
  || reconciliation?.after?.cross_case_hop_creation_authorized !== false
  || reconciliation?.after?.active_projection_cross_case_join_authorized !== false) fail('Wave 08 reconciliation overclaims join authority');
if (reconciliation?.after?.census_tokens_in_active_hop_graph !== 0) fail('Wave 08 reconciliation leaked census tokens into topology');

for (const field of [
  'native_case_pair_denominator_measured',
  'production_candidate_registry_present',
  'generated_candidate_projection_built_and_indexed',
  'every_candidate_has_material_blockers',
  'every_candidate_id_source_projection_and_index_observed',
  'every_case_pair_id_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 08 completion ${field} missing`);
if (reconciliation?.completion?.accepted_production_identity_bridges !== 0) fail('Wave 08 completion accepted a production bridge');
for (const field of [
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'active_projection_cross_case_join_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 08 completion ${field} boundary drift`);
if (reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 08 completion human-permission count drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.exact_local_identifier_recurrence_proves_same_entity !== false) fail(`${name}: exact-recurrence identity boundary missing`);
  if (boundaries?.receipt_reference_proves_source_custody !== false) fail(`${name}: receipt-reference custody boundary missing`);
  if (boundaries?.case_id_is_shared_identity_namespace !== false) fail(`${name}: namespace boundary missing`);
  if (boundaries?.candidate_status_is_identity_finding !== false) fail(`${name}: candidate identity boundary missing`);
  if (boundaries?.candidate_status_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.candidate_status_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.automatic_cross_case_join_authorized !== false
    || boundaries?.cross_case_graph_join_authorized !== false
    || boundaries?.cross_case_hop_creation_authorized !== false
    || boundaries?.active_projection_cross_case_join_authorized !== false) fail(`${name}: join boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph effect boundary drift`);
}

if (!report.includes('accepted production identity bridges:      0')) fail('Wave 08 report lacks zero-bridge result');
if (!report.includes('automatic cross-case join authorized:      false')) fail('Wave 08 report lacks automatic-join boundary');
if (!reconciliationReport.includes(`candidate IDs source/projection/indexed:           ${candidates.length}`)) fail('Wave 08 reconciliation report lacks candidate observation count');
if (!reconciliationReport.includes('cross-case graph join authorized:                  false')) fail('Wave 08 reconciliation report lacks graph boundary');

if (errors.length) {
  console.error(`production cross-case identity census Wave 08 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('production cross-case identity census Wave 08 validation: OK');
console.log(`  native cases / case pairs: ${cases.length} / ${casePairs.length}`);
console.log(`  production candidates: ${candidates.length}`);
console.log(`  candidates / pairs observed: ${candidatesObserved}/${candidates.length} / ${pairsObserved}/${casePairs.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
