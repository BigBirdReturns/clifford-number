#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-identity-census-wave-09-policy.json';
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
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.census_receipt_path);
const reconciliation = readJson(policy.reconciliation_path);
const projection = readJson(policy.candidate_projection_path);
const mentions = readJsonl(policy.mention_registry_path);
const candidates = readJsonl(policy.candidate_registry_path);
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const report = fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = fs.existsSync(full(policy.reconciliation_report_path))
  ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';

if (policy.schema_version !== 'lake-canonical-identity-census-wave-09-policy@1') fail('unexpected Wave 09 policy schema');
if (plan?.schema_version !== 'lake-canonical-identity-census-wave-09-plan@1') fail('unexpected Wave 09 plan schema');
if (receipt?.schema_version !== 'lake-canonical-identity-census-wave-09@1') fail('unexpected Wave 09 receipt schema');
if (reconciliation?.schema_version !== 'lake-canonical-identity-census-wave-09-reconciliation@1') fail('unexpected Wave 09 reconciliation schema');
if (projection?.schema_version !== 'axm-canonical-identity-candidate-index-wave-09@1') fail('unexpected Wave 09 projection schema');
if (plan?.program_key !== policy.program_key || receipt?.program_key !== policy.program_key
  || reconciliation?.program_key !== policy.program_key || projection?.program_key !== policy.program_key) fail('Wave 09 program keys disagree');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 09 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 09 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 09 reconciliation fingerprint mismatch');

if (mentions.length !== policy.expected.distinct_case_local_identity_values) fail(`Wave 09 mention count drift: ${mentions.length}`);
if (receipt?.counts?.source_identity_occurrences !== policy.expected.source_identity_occurrences) fail('Wave 09 source occurrence count drift');
if (receipt?.counts?.distinct_case_local_identity_values !== mentions.length) fail('Wave 09 receipt mention count drift');
if (new Set(mentions.map(row => row.mention_id)).size !== mentions.length) fail('duplicate Wave 09 mention ID');
if (new Set(candidates.map(row => row.candidate_id)).size !== candidates.length) fail('duplicate Wave 09 candidate ID');

const orderedMentions = [...mentions].sort((left, right) => `${left.case_id}\0${left.normalized_identity_value}`.localeCompare(`${right.case_id}\0${right.normalized_identity_value}`));
const orderedCandidates = [...candidates].sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.basis_class}\0${left.basis_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.basis_class}\0${right.basis_value}`));
try { assert.deepEqual(projection?.mentions, orderedMentions); } catch { fail('Wave 09 mention projection disagrees with source registry'); }
try { assert.deepEqual(projection?.cross_case_candidates, orderedCandidates); } catch { fail('Wave 09 candidate projection disagrees with source registry'); }
if (projection?.mention_registry_path !== policy.mention_registry_path) fail('Wave 09 mention projection source path drift');
if (projection?.candidate_registry_path !== policy.candidate_registry_path) fail('Wave 09 candidate projection source path drift');
if (projection?.counts?.mentions !== mentions.length) fail('Wave 09 projected mention count drift');
if (projection?.counts?.cross_case_candidates !== candidates.length) fail('Wave 09 projected candidate count drift');
if (projection?.counts?.accepted_production_identity_bridges !== 0) fail('Wave 09 projection accepted a production bridge');

const allowedStatuses = new Set([
  'exact_canonical_id',
  'exact_declared_alias',
  'exact_canonical_label',
  'normalized_canonical_id',
  'controlled_stem_candidate',
  'ambiguous_exact_term',
  'ambiguous_controlled_stem',
  'uncovered_name_like_identifier',
  'opaque_identifier'
]);
const statusCounts = {};
for (const row of mentions) {
  statusCounts[row.mapping_status] = (statusCounts[row.mapping_status] ?? 0) + 1;
  if (!row.mention_id) fail('Wave 09 mention missing ID');
  if (!allowedStatuses.has(row.mapping_status)) fail(`${row.mention_id}: unknown mapping status ${row.mapping_status}`);
  if (row.canonical_mapping_resolved !== false) fail(`${row.mention_id}: mapping represented as resolved identity`);
  if (row.accepted_production_identity_bridge !== false) fail(`${row.mention_id}: production bridge accepted`);
  if (!(Array.isArray(row.blocking_conditions) && row.blocking_conditions.length >= 4)) fail(`${row.mention_id}: blockers missing`);
  for (const blocker of [
    'explicit_same_entity_assertion_absent',
    'assertion_source_custody_absent',
    'shared_identity_namespace_absent',
    'unambiguous_axm_token_overlap_absent'
  ]) if (!row.blocking_conditions.includes(blocker)) fail(`${row.mention_id}: required blocker ${blocker} missing`);
  if (row.mapping_status.startsWith('ambiguous_')) {
    if (!(row.canonical_candidate_ids.length > 1)) fail(`${row.mention_id}: ambiguous mapping lacks multiple candidates`);
    if (!row.blocking_conditions.includes('canonical_mapping_ambiguous')) fail(`${row.mention_id}: ambiguity blocker missing`);
  }
  if (row.mapping_status === 'controlled_stem_candidate') {
    if (row.canonical_candidate_ids.length !== 1) fail(`${row.mention_id}: controlled candidate does not have one canonical candidate`);
    if (!row.blocking_conditions.includes('controlled_normalization_is_not_identity_proof')) fail(`${row.mention_id}: controlled-normalization blocker missing`);
  }
  if (row.mapping_status === 'uncovered_name_like_identifier') {
    if (row.canonical_candidate_ids.length !== 0) fail(`${row.mention_id}: uncovered mention has canonical candidate`);
    if (!row.blocking_conditions.includes('canonical_registry_coverage_absent')) fail(`${row.mention_id}: coverage blocker missing`);
  }
  if (row.mapping_status === 'opaque_identifier') {
    if (row.canonical_candidate_ids.length !== 0) fail(`${row.mention_id}: opaque identifier has canonical candidate`);
    if (!row.blocking_conditions.includes('identifier_is_not_name_like')) fail(`${row.mention_id}: opaque-identifier blocker missing`);
  }
  if (['exact_canonical_id', 'exact_declared_alias', 'exact_canonical_label', 'normalized_canonical_id'].includes(row.mapping_status)
    && row.canonical_candidate_ids.length !== 1) fail(`${row.mention_id}: exact registry class lacks one candidate`);
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false) fail(`${row.mention_id}: join boundary drift`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.mention_id}: human-permission dependency remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.mention_id}: correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.mention_id}: graph effect created`);
}

for (const row of candidates) {
  if (row.status !== 'candidate_only') fail(`${row.candidate_id}: status escaped candidate_only`);
  if (!['shared_canonical_registry_candidate', 'shared_uncovered_controlled_stem'].includes(row.basis_class)) fail(`${row.candidate_id}: unknown basis class`);
  if (!(row.left_mention_ids?.length > 0 && row.right_mention_ids?.length > 0)) fail(`${row.candidate_id}: supporting mentions missing`);
  if (row.accepted_production_identity_bridge !== false) fail(`${row.candidate_id}: production bridge accepted`);
  for (const blocker of [
    'explicit_same_entity_assertion_absent',
    'assertion_source_custody_absent',
    'shared_identity_namespace_absent',
    'unambiguous_axm_token_overlap_absent'
  ]) if (!row.blocking_conditions.includes(blocker)) fail(`${row.candidate_id}: required blocker ${blocker} missing`);
  if (row.basis_class === 'shared_canonical_registry_candidate') {
    if (!row.canonical_candidate_id) fail(`${row.candidate_id}: canonical candidate ID missing`);
    if (!row.blocking_conditions.includes('canonical_registry_candidate_is_not_identity_proof')) fail(`${row.candidate_id}: canonical-candidate boundary missing`);
  }
  if (row.basis_class === 'shared_uncovered_controlled_stem') {
    if (row.canonical_candidate_id !== null) fail(`${row.candidate_id}: uncovered stem unexpectedly has canonical ID`);
    if (!row.blocking_conditions.includes('controlled_stem_match_is_not_identity_proof')) fail(`${row.candidate_id}: lexical boundary missing`);
    if (!row.blocking_conditions.includes('canonical_registry_coverage_absent')) fail(`${row.candidate_id}: registry-coverage blocker missing`);
  }
  if (row.automatic_cross_case_join_authorized !== false || row.cross_case_graph_join_authorized !== false
    || row.cross_case_hop_creation_authorized !== false) fail(`${row.candidate_id}: join boundary drift`);
  if (row.review_dependency?.required_to_decide !== false) fail(`${row.candidate_id}: human-permission dependency remains`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') fail(`${row.candidate_id}: correction route missing`);
  if (row.graph_effect !== 'none') fail(`${row.candidate_id}: graph effect created`);
}

const sortedStatusCounts = Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right)));
try { assert.deepEqual(receipt?.mapping_status_counts, sortedStatusCounts); } catch { fail('Wave 09 receipt mapping-status counts drift'); }
if (receipt?.counts?.cross_case_candidate_rows !== candidates.length) fail('Wave 09 receipt candidate count drift');
if (receipt?.counts?.accepted_production_identity_bridges !== 0) fail('Wave 09 receipt accepted a production bridge');
if (receipt?.automatic_cross_case_join_authorized !== false || receipt?.cross_case_graph_join_authorized !== false
  || receipt?.cross_case_hop_creation_authorized !== false || receipt?.active_projection_cross_case_join_authorized !== false) fail('Wave 09 receipt overclaims join authority');
if (receipt?.decisions_requiring_human_permission !== 0) fail('Wave 09 receipt human-permission count drift');

if (plan?.classification?.mention_registry_path !== policy.mention_registry_path) fail('Wave 09 plan mention path drift');
if (plan?.classification?.candidate_registry_path !== policy.candidate_registry_path) fail('Wave 09 plan candidate path drift');
if (plan?.completion?.every_case_local_identity_value_classified !== true) fail('Wave 09 plan classification completion missing');
if (plan?.completion?.ambiguous_and_uncovered_mentions_preserved !== true) fail('Wave 09 plan preservation completion missing');
if (plan?.completion?.cross_case_candidate_denominator_measured !== true) fail('Wave 09 plan candidate denominator missing');
if (plan?.completion?.accepted_production_identity_bridges !== 0) fail('Wave 09 plan accepted a production bridge');
if (plan?.completion?.automatic_cross_case_join_authorized !== false || plan?.completion?.cross_case_graph_join_authorized !== false
  || plan?.completion?.cross_case_hop_creation_authorized !== false || plan?.completion?.active_projection_cross_case_join_authorized !== false) fail('Wave 09 plan overclaims join authority');
if (plan?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 09 plan human-permission count drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.mention_registry_path, policy.candidate_registry_path, policy.census_receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.mention_registry_path)?.index_file !== true) fail('Wave 09 mention registry is not an index surface');
if (fileByPath.get(policy.candidate_registry_path)?.index_file !== true) fail('Wave 09 candidate registry is not an index surface');
const projectionFile = fileByPath.get(policy.candidate_projection_path);
if (!projectionFile) fail('Wave 09 generated projection lake row missing');
else {
  if (projectionFile.generated !== true) fail('Wave 09 projection not marked generated');
  if (projectionFile.index_file !== true) fail('Wave 09 projection is not an index surface');
}

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let mentionsObserved = 0;
for (const row of mentions) {
  const object = objectByKey.get(`mention_id:${row.mention_id}`);
  if (!object) fail(`${row.mention_id}: lake object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.mention_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.mention_registry_path && item.generated === false)) fail(`${row.mention_id}: source occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true)) fail(`${row.mention_id}: generated projection occurrence missing`);
    mentionsObserved += 1;
  }
}
let candidatesObserved = 0;
for (const row of candidates) {
  const object = objectByKey.get(`candidate_id:${row.candidate_id}`);
  if (!object) fail(`${row.candidate_id}: lake object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.candidate_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.candidate_registry_path && item.generated === false)) fail(`${row.candidate_id}: source occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true)) fail(`${row.candidate_id}: generated projection occurrence missing`);
    candidatesObserved += 1;
  }
}

if (activeIdentity?.scheme?.cross_case_join_authorized !== false) fail('active identity broad join flag opened');
if (/CANMENTION-|CANCROSS-|canonical-cross-case-identity-candidate/i.test(JSON.stringify(hopGraph))) fail('Wave 09 identifiers leaked into active topology');

if (reconciliation?.after?.distinct_mentions_classified !== mentions.length) fail('Wave 09 reconciliation mention count drift');
try { assert.deepEqual(reconciliation?.after?.mapping_status_counts, sortedStatusCounts); } catch { fail('Wave 09 reconciliation status counts drift'); }
if (reconciliation?.after?.cross_case_candidate_rows !== candidates.length) fail('Wave 09 reconciliation candidate count drift');
if (reconciliation?.after?.mention_ids_source_projection_and_index_observed !== mentions.length) fail('Wave 09 reconciliation mention observation drift');
if (reconciliation?.after?.candidate_ids_source_projection_and_index_observed !== candidates.length) fail('Wave 09 reconciliation candidate observation drift');
if (reconciliation?.after?.accepted_production_identity_bridges !== 0) fail('Wave 09 reconciliation accepted a production bridge');
if (reconciliation?.after?.automatic_cross_case_join_authorized !== false
  || reconciliation?.after?.cross_case_graph_join_authorized !== false
  || reconciliation?.after?.cross_case_hop_creation_authorized !== false
  || reconciliation?.after?.active_projection_cross_case_join_authorized !== false) fail('Wave 09 reconciliation overclaims join authority');
if (reconciliation?.after?.census_tokens_in_active_hop_graph !== 0) fail('Wave 09 census tokens leaked into topology');

for (const field of [
  'every_case_local_identity_value_classified',
  'ambiguous_and_uncovered_mentions_preserved',
  'generated_candidate_projection_built_and_indexed',
  'every_mention_id_source_projection_and_index_observed',
  'every_candidate_id_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'cross_case_candidate_denominator_measured',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 09 completion ${field} missing`);
if (reconciliation?.completion?.accepted_production_identity_bridges !== 0) fail('Wave 09 completion accepted a production bridge');
for (const field of [
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'active_projection_cross_case_join_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 09 completion ${field} boundary drift`);
if (reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 09 completion human-permission count drift');

for (const [name, boundaries] of [['policy', policy.boundaries], ['plan', plan?.boundaries], ['receipt', receipt?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.canonical_registry_match_proves_real_world_identity !== false) fail(`${name}: canonical identity boundary missing`);
  if (boundaries?.exact_label_match_proves_same_entity !== false) fail(`${name}: label boundary missing`);
  if (boundaries?.alias_match_proves_same_entity !== false) fail(`${name}: alias boundary missing`);
  if (boundaries?.controlled_stem_match_proves_same_entity !== false) fail(`${name}: controlled-stem boundary missing`);
  if (boundaries?.canonical_candidate_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.canonical_candidate_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.uncovered_name_proves_distinct_entity !== false) fail(`${name}: uncovered-name boundary missing`);
  if (boundaries?.zero_cross_case_candidates_proves_disjointness !== false) fail(`${name}: disjointness boundary missing`);
  if (boundaries?.automatic_cross_case_join_authorized !== false
    || boundaries?.cross_case_graph_join_authorized !== false
    || boundaries?.cross_case_hop_creation_authorized !== false
    || boundaries?.active_projection_cross_case_join_authorized !== false) fail(`${name}: join boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph effect boundary drift`);
}

if (!report.includes('accepted production identity bridges:     0')) fail('Wave 09 report lacks zero-bridge result');
if (!report.includes('automatic cross-case join authorized:     false')) fail('Wave 09 report lacks automatic-join boundary');
if (!reconciliationReport.includes(`mentions source/projection/indexed:             ${mentions.length}`)) fail('Wave 09 reconciliation report lacks mention observation count');
if (!reconciliationReport.includes('cross-case graph join authorized:               false')) fail('Wave 09 reconciliation report lacks graph boundary');

if (errors.length) {
  console.error(`canonical identity census Wave 09 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('canonical identity census Wave 09 validation: OK');
console.log(`  mentions / candidates: ${mentions.length} / ${candidates.length}`);
console.log(`  mentions / candidates observed: ${mentionsObserved}/${mentions.length} / ${candidatesObserved}/${candidates.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
