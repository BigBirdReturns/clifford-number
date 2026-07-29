#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCaseLedger } from './lib/case-ledger.mjs';
import { compileProductionCrossCaseDenominator } from './lib/cross-case-production-denominator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-cross-case-production-denominator-wave-08-policy.json';
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
const entityRegistry = readJsonl(policy.entity_registry_path);
const pairDenominator = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const buildInstructions = fs.existsSync(full('BUILD-INSTRUCTIONS.md')) ? fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8') : '';
const readme = fs.existsSync(full('README.md')) ? fs.readFileSync(full('README.md'), 'utf8') : '';

if (policy.schema_version !== 'lake-cross-case-production-denominator-wave-08-policy@1') fail('unexpected Wave 08 policy schema');
if (receipt?.schema_version !== 'lake-cross-case-production-denominator-wave-08@1') fail('unexpected Wave 08 receipt schema');
if (plan?.schema_version !== 'lake-cross-case-production-denominator-wave-08-plan@1') fail('unexpected Wave 08 plan schema');
if (reconciliation?.schema_version !== 'lake-cross-case-production-denominator-wave-08-reconciliation@1') fail('unexpected Wave 08 reconciliation schema');
if (decisionIndex?.schema_version !== 'cross-case-production-join-decision-index@1') fail('unexpected Wave 08 decision index schema');
if (receipt?.program_key !== policy.program_key || plan?.program_key !== policy.program_key || reconciliation?.program_key !== policy.program_key || decisionIndex?.program_key !== policy.program_key) fail('Wave 08 program keys disagree');
if (receipt?.source_fingerprint_sha256 !== manifestFingerprint(receipt?.input_manifest)) fail('Wave 08 receipt fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== manifestFingerprint(plan?.input_manifest)) fail('Wave 08 plan fingerprint mismatch');
if (receipt?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 08 receipt and plan source fingerprints disagree');
if (reconciliation?.source_fingerprint_sha256 !== manifestFingerprint(reconciliation?.input_manifest)) fail('Wave 08 reconciliation fingerprint mismatch');

const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
let recomputed = null;
try {
  const caseRoot = full('cases');
  const caseDirectories = fs.readdirSync(caseRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'case.json')))
    .map(entry => path.join(caseRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));
  const cases = caseDirectories.map(directory => {
    const data = loadCaseLedger(directory);
    return { case_id: data.case.case_id, title: data.case.title, claims: data.claims, receipts: data.receipts };
  });
  recomputed = compileProductionCrossCaseDenominator({
    policy,
    cases,
    canonicalActors: actorsDoc?.actors ?? actorsDoc ?? [],
    canonicalOrganizations: organizationsDoc?.organizations ?? organizationsDoc ?? [],
    canonicalAliases: aliasesDoc?.aliases ?? aliasesDoc ?? []
  });
  assert.deepEqual(entityRegistry, recomputed.entity_registry);
  assert.deepEqual(pairDenominator, recomputed.pair_denominator);
  assert.deepEqual(decisions, recomputed.decisions);
  assert.deepEqual(decisionIndex?.decisions, decisions);
  assert.deepEqual(decisionIndex?.counts, recomputed.counts);
  assert.deepEqual(receipt?.counts, recomputed.counts);
  assert.deepEqual(plan?.extraction?.counts, recomputed.counts);
} catch (error) {
  fail(`Wave 08 deterministic reconstruction failed: ${error.message}`);
}

if (recomputed) {
  if (recomputed.counts.native_cases < policy.expected.minimum_native_cases) fail('native case count below policy floor');
  if (recomputed.counts.case_pairs < policy.expected.minimum_case_pairs) fail('case pair count below policy floor');
  if (recomputed.counts.entity_occurrences < policy.expected.minimum_entity_occurrences) fail('entity occurrence count below policy floor');
  if (recomputed.counts.candidate_decisions < policy.expected.minimum_candidate_decisions) fail('candidate decision count below policy floor');
  if (recomputed.counts.case_pairs !== recomputed.counts.native_cases * (recomputed.counts.native_cases - 1) / 2) fail('case pair denominator is incomplete');
  if (pairDenominator.reduce((total, row) => total + row.candidate_pairs, 0) !== decisions.length) fail('pair candidate totals disagree with decision registry');
}

if (new Set(entityRegistry.map(row => row.occurrence_id)).size !== entityRegistry.length) fail('duplicate Wave 08 occurrence IDs');
if (new Set(pairDenominator.map(row => row.pair_id)).size !== pairDenominator.length) fail('duplicate Wave 08 pair IDs');
if (new Set(decisions.map(row => row.decision_id)).size !== decisions.length) fail('duplicate Wave 08 decision IDs');
if (!entityRegistry.every(row => row.schema_version === 'cross-case-production-entity-occurrence@1')) fail('entity registry schema drift');
if (!pairDenominator.every(row => row.schema_version === 'cross-case-production-pair-denominator@1')) fail('pair denominator schema drift');
if (!decisions.every(row => row.schema_version === 'cross-case-production-join-decision@1')) fail('decision registry schema drift');
if (!entityRegistry.every(row => row.graph_effect === 'none')) fail('entity occurrence graph effect drift');
if (!pairDenominator.every(row => row.graph_effect === 'none' && row.review_dependency?.required_to_decide === false)) fail('pair denominator judgment boundary drift');

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
if (!decisions.every(row => ['accepted', 'unresolved', 'rejected'].includes(row.status))) fail('invalid Wave 08 decision status');
if (!decisions.every(row => row.review_dependency?.required_to_decide === false)) fail('human-permission dependency entered Wave 08');
if (!decisions.every(row => row.correction_mode === 'append_preserving_supersession')) fail('Wave 08 correction mode drift');
if (!decisions.every(row => row.entities_merged === false && row.relationship_created === false)) fail('Wave 08 decision merged entities or created relationship');
if (!decisions.every(row => row.automatic_cross_case_join_authorized === false && row.cross_case_graph_join_authorized === false && row.cross_case_hop_creation_authorized === false && row.active_projection_cross_case_join_authorized === false)) fail('Wave 08 decision overclaimed join authority');
if (!decisions.every(row => row.graph_effect === 'none')) fail('Wave 08 decision created graph effect');
for (const row of accepted) {
  if (row.reason !== 'same_canonical_id_with_bilateral_public_identity_custody') fail(`${row.decision_id}: accepted reason drift`);
  if (row.asserted_same_entity !== true) fail(`${row.decision_id}: accepted decision lacks explicit same-entity judgment`);
  if (!/^AXMPROD-[a-f0-9]{24}$/.test(row.identity_bridge_key ?? '')) fail(`${row.decision_id}: accepted bridge key malformed`);
  if (!row.left_canonical_id || row.left_canonical_id !== row.right_canonical_id) fail(`${row.decision_id}: accepted canonical identity mismatch`);
  if (!(row.left_identity_eligible_claim_count > 0 && row.right_identity_eligible_claim_count > 0)) fail(`${row.decision_id}: accepted decision lacks bilateral eligible claims`);
  if (!(row.left_public_receipt_ids?.length > 0 && row.right_public_receipt_ids?.length > 0)) fail(`${row.decision_id}: accepted decision lacks bilateral public receipt custody`);
  if (row.authorized_scope !== 'explicit_source_custodied_graph_inert_identity_resolution_only') fail(`${row.decision_id}: accepted scope drift`);
}
if (!unresolved.every(row => row.asserted_same_entity === false && row.identity_bridge_key === null)) fail('unresolved decision impersonates accepted identity judgment');
if (!rejected.every(row => row.asserted_same_entity === false && row.identity_bridge_key === null)) fail('rejected decision impersonates accepted identity judgment');

for (const row of pairDenominator) {
  if (row.cartesian_entity_pairs !== row.candidate_pairs + row.noncandidate_pairs) fail(`${row.pair_id}: pair denominator arithmetic drift`);
  if (row.candidate_pairs !== row.accepted_decisions + row.unresolved_decisions + row.rejected_decisions) fail(`${row.pair_id}: decision disposition arithmetic drift`);
  if (row.accepted_decisions !== row.accepted_independent_decisions + row.accepted_shared_source_family_decisions) fail(`${row.pair_id}: accepted confidence arithmetic drift`);
  if (row.denominator_complete_for_current_extraction_rules !== true) fail(`${row.pair_id}: denominator completion marker missing`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
for (const relative of [policy.entity_registry_path, policy.pair_denominator_path, policy.decision_registry_path, policy.receipt_path]) {
  const row = fileByPath.get(relative);
  if (!row) fail(`${relative}: lake file row missing`);
  else {
    if (row.generated !== false) fail(`${relative}: source control marked generated`);
    if (row.authoritative_reachable !== true) fail(`${relative}: source control not authoritative-reachable`);
  }
}
if (fileByPath.get(policy.entity_registry_path)?.index_file !== true) fail('Wave 08 entity registry is not an index surface');
if (fileByPath.get(policy.decision_registry_path)?.index_file !== true) fail('Wave 08 decision registry is not an index surface');
if (fileByPath.get(policy.decision_index_path)?.generated !== true || fileByPath.get(policy.decision_index_path)?.index_file !== true) fail('Wave 08 generated decision index state drift');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  if (!object) fail(`${row.decision_id}: lake decision object missing`);
  else {
    if (object.source_occurrence !== true || object.projection_occurrence !== true || object.indexed !== true) fail(`${row.decision_id}: source/projection/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false)) fail(`${row.decision_id}: source registry occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.decision_index_path && item.generated === true)) fail(`${row.decision_id}: generated index occurrence missing`);
    decisionObserved += 1;
  }
}
let occurrenceObserved = 0;
for (const row of entityRegistry) {
  const object = objectByKey.get(`occurrence_id:${row.occurrence_id}`);
  if (!object) fail(`${row.occurrence_id}: lake entity occurrence missing`);
  else {
    if (object.source_occurrence !== true || object.indexed !== true) fail(`${row.occurrence_id}: source/index state drift`);
    if (!object.occurrences.some(item => item.path === policy.entity_registry_path && item.generated === false)) fail(`${row.occurrence_id}: entity registry occurrence missing`);
    occurrenceObserved += 1;
  }
}
let pairObserved = 0;
for (const row of pairDenominator) {
  const object = objectByKey.get(`pair_id:${row.pair_id}`);
  if (!object) fail(`${row.pair_id}: lake pair object missing`);
  else {
    if (object.source_occurrence !== true) fail(`${row.pair_id}: pair source occurrence missing`);
    if (!object.occurrences.some(item => item.path === policy.pair_denominator_path && item.generated === false)) fail(`${row.pair_id}: pair denominator occurrence missing`);
    pairObserved += 1;
  }
}

if (activeIdentity?.scheme?.status !== 'reconciled_genesis_v1' || activeIdentity?.scheme?.external_axm_gate_complete !== true) fail('active AXM identity state drift');
if (activeIdentity?.scheme?.cross_case_join_authorized !== false) fail('active broad cross-case join flag changed');
const graphText = JSON.stringify(hopGraph ?? {});
if (accepted.some(row => row.identity_bridge_key && graphText.includes(row.identity_bridge_key))) fail('Wave 08 identity bridge leaked into active hop graph');
if (decisions.some(row => graphText.includes(row.decision_id))) fail('Wave 08 decision ID leaked into active hop graph');
if (!/production cross-case identity denominator/i.test(buildInstructions)) fail('BUILD-INSTRUCTIONS lacks Wave 08 production denominator contract');
if (!/production cross-case identity decisions/i.test(readme)) fail('README lacks Wave 08 production identity lane');

if (receipt?.decisions_requiring_human_permission !== 0 || plan?.completion?.decisions_requiring_human_permission !== 0 || reconciliation?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 08 human-permission count drift');
if (receipt?.automatic_cross_case_join_authorized !== false || receipt?.cross_case_graph_join_authorized !== false || receipt?.cross_case_hop_creation_authorized !== false || receipt?.active_projection_cross_case_join_authorized !== false) fail('Wave 08 receipt overclaims join authority');
if (plan?.completion?.current_native_case_pair_denominator_complete !== true || plan?.completion?.current_candidate_decisions_executed !== true) fail('Wave 08 plan completion missing');
if (reconciliation?.after?.decision_ids_source_projection_and_index_observed !== decisions.length || reconciliation?.after?.entity_occurrence_ids_source_and_index_observed !== entityRegistry.length || reconciliation?.after?.pair_ids_source_observed !== pairDenominator.length) fail('Wave 08 reconciliation observation counts drift');
if (reconciliation?.after?.accepted_decisions !== accepted.length || reconciliation?.after?.unresolved_decisions !== unresolved.length || reconciliation?.after?.rejected_decisions !== rejected.length) fail('Wave 08 reconciliation disposition counts drift');
if (reconciliation?.after?.identity_bridge_tokens_in_active_hop_graph !== 0 || reconciliation?.after?.decision_tokens_in_active_hop_graph !== 0) fail('Wave 08 reconciliation graph boundary drift');

for (const field of [
  'current_native_case_pair_denominator_complete',
  'deterministic_reconstruction_complete',
  'every_decision_source_projection_and_index_observed',
  'every_entity_occurrence_source_and_index_observed',
  'every_case_pair_source_observed',
  'source_controls_authoritative_reachable',
  'independent_source_family_support_measured',
  'accepted_decisions_are_graph_inert',
  'unresolved_and_rejected_candidates_preserved',
  'post_execution_reconciliation_complete'
]) if (reconciliation?.completion?.[field] !== true) fail(`Wave 08 completion ${field} missing`);
for (const field of [
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'active_projection_cross_case_join_authorized',
  'semantic_lake_complete',
  'evidence_truth_determined',
  'publication_cleared'
]) if (reconciliation?.completion?.[field] !== false) fail(`Wave 08 completion ${field} boundary drift`);

for (const [name, boundaries] of [['policy', policy.boundaries], ['receipt', receipt?.boundaries], ['plan', plan?.boundaries], ['reconciliation', reconciliation?.boundaries]]) {
  if (boundaries?.candidate_recurrence_proves_same_entity !== false) fail(`${name}: candidate recurrence boundary missing`);
  if (boundaries?.accepted_identity_resolution_merges_entities !== false) fail(`${name}: entity merge boundary missing`);
  if (boundaries?.accepted_identity_resolution_creates_relationship !== false) fail(`${name}: relationship boundary missing`);
  if (boundaries?.accepted_identity_resolution_creates_graph_edge !== false) fail(`${name}: graph-edge boundary missing`);
  if (boundaries?.accepted_identity_resolution_creates_hop !== false) fail(`${name}: hop boundary missing`);
  if (boundaries?.automatic_cross_case_join_authorized !== false || boundaries?.cross_case_graph_join_authorized !== false || boundaries?.cross_case_hop_creation_authorized !== false || boundaries?.active_projection_cross_case_join_authorized !== false) fail(`${name}: join authorization boundary drift`);
  if (boundaries?.graph_effect !== 'none') fail(`${name}: graph effect boundary drift`);
}

if (errors.length) {
  console.error(`production cross-case denominator Wave 08 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('production cross-case denominator Wave 08 validation: OK');
console.log(`  cases / pairs / entity occurrences: ${recomputed.counts.native_cases} / ${recomputed.counts.case_pairs} / ${entityRegistry.length}`);
console.log(`  accepted / unresolved / rejected: ${accepted.length} / ${unresolved.length} / ${rejected.length}`);
console.log(`  decisions observed: ${decisionObserved}/${decisions.length}`);
console.log(`  entity occurrences observed: ${occurrenceObserved}/${entityRegistry.length}`);
console.log(`  case pairs observed: ${pairObserved}/${pairDenominator.length}`);
console.log('  automatic, graph, and hop joins authorized: false');
