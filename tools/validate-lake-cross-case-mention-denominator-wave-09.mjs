#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCrossCaseMentionDenominator } from './lib/cross-case-mention-denominator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-cross-case-mention-denominator-wave-09-policy.json';
const full = relative => path.join(root, relative);
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}
function readJsonl(relative) {
  try {
    if (!fs.existsSync(full(relative))) return [];
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
const baseline = readJson(policy.baseline_receipt_path);
const lexicon = readJson(policy.lexicon_path);
const mentions = readJsonl(policy.mention_registry_path);
const caseEntities = readJsonl(policy.case_entity_registry_path);
const pairs = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const buildInstructions = fs.existsSync(full('BUILD-INSTRUCTIONS.md')) ? fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8') : '';
const readme = fs.existsSync(full('README.md')) ? fs.readFileSync(full('README.md'), 'utf8') : '';

if (policy.schema_version !== 'lake-cross-case-mention-denominator-wave-09-policy@1') fail('unexpected Wave 09 policy schema');
if (lexicon?.schema_version !== 'cross-case-mention-lexicon@1') fail('unexpected Wave 09 lexicon schema');
if (receipt?.schema_version !== 'lake-cross-case-mention-denominator-wave-09@1') fail('unexpected Wave 09 receipt schema');
if (plan?.schema_version !== 'lake-cross-case-mention-denominator-wave-09-plan@1') fail('unexpected Wave 09 plan schema');
if (reconciliation?.schema_version !== 'lake-cross-case-mention-denominator-wave-09-reconciliation@1') fail('unexpected Wave 09 reconciliation schema');
if (decisionIndex?.schema_version !== 'cross-case-mention-decision-index@1') fail('unexpected Wave 09 decision index schema');
if (receipt?.program_key !== policy.program_key || plan?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key || decisionIndex?.program_key !== policy.program_key) fail('Wave 09 program keys disagree');
if (receipt?.source_fingerprint_sha256 !== manifestFingerprint(receipt?.input_manifest)) fail('Wave 09 receipt fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 09 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 09 receipt and plan fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 09 reconciliation fingerprint mismatch');
if (policy.text_scan?.fuzzy_matching_authorized !== false) fail('fuzzy matching was enabled');
if (baseline?.counts?.candidate_decisions !== 0 || baseline?.boundaries?.zero_exact_candidates_proves_no_real_overlap !== false) fail('Wave 08 structured zero-candidate boundary drift');

let recomputed = null;
try {
  const cases = fs.readdirSync(full('cases'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(full(`cases/${entry.name}/case.json`)))
    .map(entry => {
      const caseId = entry.name;
      const caseConfig = readJson(`cases/${caseId}/case.json`);
      const recordsByType = Object.fromEntries(policy.source_record_types.map(recordType => [recordType, readJsonl(`cases/${caseId}/${recordType}.jsonl`)]));
      return { case_id: caseConfig.case_id, title: caseConfig.title, records_by_type: recordsByType };
    })
    .sort((left, right) => left.case_id.localeCompare(right.case_id));
  recomputed = compileCrossCaseMentionDenominator({
    policy,
    cases,
    actors: actorsDoc?.actors ?? actorsDoc ?? [],
    organizations: organizationsDoc?.organizations ?? organizationsDoc ?? [],
    aliases: aliasesDoc?.aliases ?? aliasesDoc ?? [],
    baseline
  });
  assert.deepEqual(lexicon, recomputed.lexicon);
  assert.deepEqual(mentions, recomputed.mentions);
  assert.deepEqual(caseEntities, recomputed.case_entity_registry);
  assert.deepEqual(pairs, recomputed.pair_denominator);
  assert.deepEqual(decisions, recomputed.decisions);
  assert.deepEqual(decisionIndex?.decisions, decisions);
  assert.deepEqual(decisionIndex?.counts, recomputed.counts);
  assert.deepEqual(receipt?.counts, recomputed.counts);
  assert.deepEqual(plan?.extraction?.counts, recomputed.counts);
} catch (error) {
  fail(`Wave 09 deterministic reconstruction failed: ${error.message}`);
}

if (recomputed) {
  if (recomputed.counts.native_cases < policy.expected.minimum_native_cases) fail('native case count below policy floor');
  if (recomputed.counts.case_pairs < policy.expected.minimum_case_pairs) fail('case pair count below policy floor');
  if (recomputed.counts.text_leaves_scanned < policy.expected.minimum_text_leaves_scanned) fail('text leaf count below policy floor');
  if (recomputed.counts.exact_mentions < policy.expected.minimum_exact_mentions) fail('exact mention count below policy floor');
  if (recomputed.counts.candidate_decisions < policy.expected.minimum_candidate_decisions) fail('candidate count below policy floor');
  if (recomputed.counts.case_pairs !== recomputed.counts.native_cases * (recomputed.counts.native_cases - 1) / 2) fail('case pair denominator incomplete');
  if (recomputed.baseline.structured_candidate_decisions !== 0 || recomputed.baseline.structured_zero_candidate_silo_finding_preserved !== true) fail('structured baseline not preserved');
}

if (new Set(mentions.map(row => row.mention_id)).size !== mentions.length) fail('duplicate mention IDs');
if (new Set(caseEntities.map(row => row.mentioned_entity_id)).size !== caseEntities.length) fail('duplicate mentioned-entity IDs');
if (new Set(pairs.map(row => row.pair_id)).size !== pairs.length) fail('duplicate pair IDs');
if (new Set(decisions.map(row => row.decision_id)).size !== decisions.length) fail('duplicate decision IDs');
if (!mentions.every(row => row.schema_version === 'cross-case-exact-mention@1')) fail('mention schema drift');
if (!caseEntities.every(row => row.schema_version === 'cross-case-mentioned-entity@1')) fail('mentioned-entity schema drift');
if (!pairs.every(row => row.schema_version === 'cross-case-mention-pair-denominator@1')) fail('pair schema drift');
if (!decisions.every(row => row.schema_version === 'cross-case-mention-recurrence-decision@1')) fail('decision schema drift');
if (!mentions.every(row => /^CCMENT-[a-f0-9]{24}$/.test(row.mention_id))) fail('malformed mention ID');
if (!caseEntities.every(row => /^CCMEntity-[a-f0-9]{24}$/.test(row.mentioned_entity_id))) fail('malformed mentioned-entity ID');
if (!pairs.every(row => /^CCMPAIR-[a-f0-9]{20}$/.test(row.pair_id))) fail('malformed mention pair ID');
if (!decisions.every(row => /^CCMDEC-[a-f0-9]{24}$/.test(row.decision_id))) fail('malformed mention decision ID');
if (!mentions.every(row => row.graph_effect === 'none')) fail('mention graph effect drift');
if (!caseEntities.every(row => row.graph_effect === 'none')) fail('mentioned-entity graph effect drift');
if (!pairs.every(row => row.graph_effect === 'none' && row.review_dependency?.required_to_decide === false)) fail('pair denominator boundary drift');
if (!lexicon.active.every(row => row.active === true && row.exclusion_reason === null && row.match_mode)) fail('active lexicon row drift');
if (!lexicon.excluded.every(row => row.active === false && row.exclusion_reason)) fail('excluded lexicon row drift');
if (lexicon.active.some(row => row.owner_canonical_ids?.length !== 1)) fail('ambiguous lexeme entered active lexicon');
if (lexicon.active.some(row => row.match_mode.includes('fuzzy'))) fail('fuzzy match mode entered lexicon');

for (const mention of mentions) {
  if (!policy.source_record_types.includes(mention.record_type)) fail(`${mention.mention_id}: undeclared record type`);
  if (!mention.canonical_id || !mention.canonical_label || !mention.axm_entity_id) fail(`${mention.mention_id}: canonical identity fields missing`);
  if (!(mention.span_start >= 0 && mention.span_end > mention.span_start && mention.span_end <= mention.source_text_length)) fail(`${mention.mention_id}: span bounds invalid`);
  if (!mention.source_path.startsWith(`cases/${mention.case_id}/`)) fail(`${mention.mention_id}: source path/case mismatch`);
  if (!mention.matched_text || !mention.lexeme || !mention.match_mode) fail(`${mention.mention_id}: match details missing`);
  if (!Array.isArray(mention.claim_ids) || !Array.isArray(mention.receipt_ids) || !Array.isArray(mention.public_receipt_ids) || !Array.isArray(mention.public_source_families)) fail(`${mention.mention_id}: custody arrays missing`);
  if (mention.recurrence_eligible && mention.public_receipt_ids.length === 0) fail(`${mention.mention_id}: eligible mention lacks public receipt`);
}

for (const entity of caseEntities) {
  if (entity.mention_count !== entity.mention_ids.length) fail(`${entity.mentioned_entity_id}: mention count drift`);
  if (entity.eligible_mention_count !== entity.eligible_mention_ids.length) fail(`${entity.mentioned_entity_id}: eligible mention count drift`);
  if (entity.source_record_count !== entity.source_record_ids.length) fail(`${entity.mentioned_entity_id}: source record count drift`);
  if (entity.bilateral_recurrence_custody_eligible !== (entity.eligible_mention_count > 0 && entity.public_receipt_ids.length > 0)) fail(`${entity.mentioned_entity_id}: custody eligibility drift`);
}

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
if (!decisions.every(row => ['accepted', 'unresolved', 'rejected'].includes(row.status))) fail('invalid decision status');
if (!decisions.every(row => row.review_dependency?.required_to_decide === false)) fail('human-permission dependency entered Wave 09');
if (!decisions.every(row => row.correction_mode === 'append_preserving_supersession')) fail('correction mode drift');
if (!decisions.every(row => row.records_merged === false && row.relationship_created === false)) fail('decision merged records or created relationship');
if (!decisions.every(row => row.automatic_cross_case_join_authorized === false && row.cross_case_graph_join_authorized === false && row.cross_case_hop_creation_authorized === false && row.active_projection_cross_case_join_authorized === false)) fail('decision overclaimed join authority');
if (!decisions.every(row => row.graph_effect === 'none')) fail('decision graph effect drift');
for (const row of accepted) {
  if (row.reason !== 'same_canonical_entity_exactly_mentioned_with_bilateral_public_custody') fail(`${row.decision_id}: accepted reason drift`);
  if (!/^CCMREC-[a-f0-9]{24}$/.test(row.recurrence_key ?? '')) fail(`${row.decision_id}: recurrence key malformed`);
  if (!(row.left_eligible_mention_count > 0 && row.right_eligible_mention_count > 0)) fail(`${row.decision_id}: bilateral eligible mentions missing`);
  if (!(row.left_public_receipt_ids.length > 0 && row.right_public_receipt_ids.length > 0)) fail(`${row.decision_id}: bilateral public custody missing`);
  if (row.authorized_scope !== 'exact_source_custodied_graph_inert_cross_case_mention_recurrence_only') fail(`${row.decision_id}: authorized scope drift`);
}
if (!unresolved.every(row => row.recurrence_key === null && row.authorized_scope === null)) fail('unresolved row impersonates accepted recurrence');
if (!rejected.every(row => row.recurrence_key === null && row.authorized_scope === null)) fail('rejected row impersonates accepted recurrence');

for (const pair of pairs) {
  if (pair.candidate_canonical_entities !== pair.accepted_recurrences + pair.unresolved_recurrences + pair.rejected_recurrences) fail(`${pair.pair_id}: disposition arithmetic drift`);
  if (pair.accepted_recurrences !== pair.accepted_independent_recurrences + pair.accepted_shared_source_family_recurrences) fail(`${pair.pair_id}: accepted confidence arithmetic drift`);
  if (pair.denominator_complete_for_declared_exact_lexicon !== true) fail(`${pair.pair_id}: denominator completion marker missing`);
}
if (pairs.reduce((total, row) => total + row.candidate_canonical_entities, 0) !== decisions.length) fail('pair candidate totals disagree with decisions');
if (accepted.length !== receipt?.counts?.accepted_recurrences || unresolved.length !== receipt?.counts?.unresolved_recurrences || rejected.length !== receipt?.counts?.rejected_recurrences) fail('receipt disposition counts drift');

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.mention_registry_path, policy.case_entity_registry_path, policy.pair_denominator_path, policy.decision_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.mention_registry_path)?.index_file !== true) fail('mention registry is not an index surface');
if (fileByPath.get(policy.case_entity_registry_path)?.index_file !== true) fail('mentioned-entity registry is not an index surface');
if (fileByPath.get(policy.decision_registry_path)?.index_file !== true) fail('decision registry is not an index surface');
if (fileByPath.get(policy.lexicon_path)?.generated !== true) fail('lexicon is not marked generated');
if (fileByPath.get(policy.decision_index_path)?.generated !== true || fileByPath.get(policy.decision_index_path)?.index_file !== true) fail('generated decision index state drift');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let mentionObserved = 0;
for (const row of mentions) {
  const object = objectByKey.get(`mention_id:${row.mention_id}`);
  if (!object) fail(`${row.mention_id}: lake mention object missing`);
  else {
    if (object.source_occurrence !== true || object.indexed !== true) fail(`${row.mention_id}: source/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.mention_registry_path && item.generated === false)) fail(`${row.mention_id}: source mention occurrence missing`);
    mentionObserved += 1;
  }
}
let entityObserved = 0;
for (const row of caseEntities) {
  const object = objectByKey.get(`mentioned_entity_id:${row.mentioned_entity_id}`);
  if (!object) fail(`${row.mentioned_entity_id}: lake mentioned-entity object missing`);
  else {
    if (object.source_occurrence !== true || object.indexed !== true) fail(`${row.mentioned_entity_id}: source/index state drift`);
    entityObserved += 1;
  }
}
let pairObserved = 0;
for (const row of pairs) {
  const object = objectByKey.get(`pair_id:${row.pair_id}`);
  if (!object) fail(`${row.pair_id}: lake pair object missing`);
  else {
    if (object.source_occurrence !== true) fail(`${row.pair_id}: pair source occurrence missing`);
    pairObserved += 1;
  }
}
let decisionObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  if (!object) fail(`${row.decision_id}: lake decision object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.decision_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false)) fail(`${row.decision_id}: source decision occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.decision_index_path && item.generated === true)) fail(`${row.decision_id}: generated decision occurrence missing`);
    decisionObserved += 1;
  }
}

if (activeIdentity?.scheme?.status !== 'reconciled_genesis_v1' || activeIdentity?.scheme?.external_axm_gate_complete !== true) fail('active AXM identity state drift');
if (activeIdentity?.scheme?.cross_case_join_authorized !== false) fail('active broad join flag changed');
const graphText = JSON.stringify(hopGraph ?? {});
if (accepted.some(row => row.recurrence_key && graphText.includes(row.recurrence_key))) fail('recurrence key leaked into active hop graph');
if (decisions.some(row => graphText.includes(row.decision_id))) fail('decision ID leaked into active hop graph');
if (!/exact cross-case mention denominator/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 09 contract');
if (!/exact cross-case mention recurrence/i.test(readme)) fail('README lacks Wave 09 lane');

if (receipt?.decisions_requiring_human_permission !== 0 || plan?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('human-permission count drift');
if (receipt?.automatic_cross_case_join_authorized !== false || receipt?.cross_case_graph_join_authorized !== false || receipt?.cross_case_hop_creation_authorized !== false || receipt?.active_projection_cross_case_join_authorized !== false) fail('receipt overclaims join authority');
if (plan?.completion?.structured_zero_candidate_baseline_preserved !== true || plan?.completion?.exact_mention_lexicon_built !== true || plan?.completion?.current_case_pair_mention_denominator_complete !== true) fail('plan completion missing');
if (reconciliation?.after?.mention_ids_source_and_index_observed !== mentions.length || reconciliation?.after?.mentioned_entity_ids_source_and_index_observed !== caseEntities.length || reconciliation?.after?.pair_ids_source_observed !== pairs.length || reconciliation?.after?.decision_ids_source_projection_and_index_observed !== decisions.length) fail('reconciliation observation counts drift');
if (reconciliation?.after?.accepted_recurrences !== accepted.length || reconciliation?.after?.unresolved_recurrences !== unresolved.length || reconciliation?.after?.rejected_recurrences !== rejected.length) fail('reconciliation disposition counts drift');
if (reconciliation?.after?.recurrence_tokens_in_active_hop_graph !== 0 || reconciliation?.after?.decision_tokens_in_active_hop_graph !== 0) fail('reconciliation graph boundary drift');

for (const field of [
  'structured_zero_candidate_baseline_preserved',
  'deterministic_reconstruction_complete',
  'exact_mention_lexicon_reproduced',
  'every_mention_source_and_index_observed',
  'every_mentioned_entity_source_and_index_observed',
  'every_case_pair_source_observed',
  'every_decision_source_projection_and_index_observed',
  'source_controls_authoritative_reachable',
  'independent_source_family_support_measured',
  'accepted_recurrences_are_graph_inert',
  'unresolved_and_rejected_recurrences_preserved',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`completion ${field} missing`);
for (const field of [
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'active_projection_cross_case_join_authorized',
  'semantic_lake_complete',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`completion ${field} boundary drift`);

for (const [name, boundaries] of [['policy', policy.boundaries], ['receipt', receipt?.boundaries], ['plan', plan?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.exact_mention_proves_relationship !== false) fail(`${name}: exact-mention relationship boundary missing`);
  if (boundaries?.repeated_mention_proves_coordination !== false) fail(`${name}: coordination boundary missing`);
  if (boundaries?.repeated_mention_proves_common_purpose !== false) fail(`${name}: common-purpose boundary missing`);
  if (boundaries?.zero_exact_mentions_proves_no_real_overlap !== false) fail(`${name}: zero-mention boundary missing`);
  if (boundaries?.accepted_recurrence_merges_records !== false) fail(`${name}: record-merge boundary missing`);
  if (boundaries?.accepted_recurrence_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.accepted_recurrence_creates_graph_edge !== false) fail(`${name}: graph-edge boundary missing`);
  if (boundaries?.accepted_recurrence_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.automatic_cross_case_join_authorized !== false || boundaries?.cross_case_graph_join_authorized !== false || boundaries?.cross_case_hop_creation_authorized !== false || boundaries?.active_projection_cross_case_join_authorized !== false) fail(`${name}: join boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph-effect boundary drift`);
}

if (errors.length) {
  console.error(`exact cross-case mention denominator Wave 09 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('exact cross-case mention denominator Wave 09 validation: OK');
console.log(`  source records / text leaves: ${recomputed.counts.source_records_scanned} / ${recomputed.counts.text_leaves_scanned}`);
console.log(`  exact mentions / case entities: ${mentions.length} / ${caseEntities.length}`);
console.log(`  accepted / unresolved / rejected: ${accepted.length} / ${unresolved.length} / ${rejected.length}`);
console.log(`  mention IDs observed: ${mentionObserved}/${mentions.length}`);
console.log(`  entity IDs observed: ${entityObserved}/${caseEntities.length}`);
console.log(`  pair IDs observed: ${pairObserved}/${pairs.length}`);
console.log(`  decision IDs observed: ${decisionObserved}/${decisions.length}`);
console.log('  automatic, graph, and hop joins authorized: false');
