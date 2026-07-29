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

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const policy = readJson(policyPath);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const entityRegistry = readJsonl(policy.entity_registry_path);
const pairDenominator = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const caseRoot = full('cases');
const caseDirectories = fs.readdirSync(caseRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'case.json')))
  .map(entry => path.join(caseRoot, entry.name))
  .sort((left, right) => left.localeCompare(right));
const cases = caseDirectories.map(directory => {
  const data = loadCaseLedger(directory);
  return { case_id: data.case.case_id, title: data.case.title, claims: data.claims, receipts: data.receipts };
});
const recomputed = compileProductionCrossCaseDenominator({
  policy,
  cases,
  canonicalActors: actorsDoc.actors ?? actorsDoc,
  canonicalOrganizations: organizationsDoc.organizations ?? organizationsDoc,
  canonicalAliases: aliasesDoc.aliases ?? aliasesDoc
});
assert.deepEqual(entityRegistry, recomputed.entity_registry, 'Wave 08 entity registry is not deterministic');
assert.deepEqual(pairDenominator, recomputed.pair_denominator, 'Wave 08 pair denominator is not deterministic');
assert.deepEqual(decisions, recomputed.decisions, 'Wave 08 decision registry is not deterministic');
assert.deepEqual(decisionIndex.decisions, decisions, 'Wave 08 generated decision index does not mirror the source registry');
assert.deepEqual(decisionIndex.counts, recomputed.counts, 'Wave 08 decision index counts drifted');
assert.deepEqual(receipt.counts, recomputed.counts, 'Wave 08 receipt counts drifted');
assert.deepEqual(plan.extraction.counts, recomputed.counts, 'Wave 08 plan counts drifted');

const inputPaths = [
  policyPath,
  policy.entity_registry_path,
  policy.pair_denominator_path,
  policy.decision_registry_path,
  policy.decision_index_path,
  policy.receipt_path,
  policy.plan_path,
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json',
  'BUILD-INSTRUCTIONS.md',
  'README.md'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const sourceFingerprint = sha256(Buffer.from(inputPaths.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourceControlPaths = [policy.entity_registry_path, policy.pair_denominator_path, policy.decision_registry_path, policy.receipt_path];
const sourceControlStates = sourceControlPaths.map(relative => {
  const row = fileByPath.get(relative);
  return {
    path: relative,
    present: Boolean(row),
    generated: row?.generated ?? null,
    index_file: row?.index_file ?? false,
    authoritative_reachable: row?.authoritative_reachable ?? false,
    public_reachable: row?.public_reachable ?? false
  };
});
const decisionIndexState = fileByPath.get(policy.decision_index_path);
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true), 'Wave 08 source controls are not authoritative-reachable');
assert.equal(fileByPath.get(policy.entity_registry_path)?.index_file, true, 'Wave 08 entity registry is not an index surface');
assert.equal(fileByPath.get(policy.decision_registry_path)?.index_file, true, 'Wave 08 decision registry is not an index surface');
assert.ok(decisionIndexState && decisionIndexState.generated === true && decisionIndexState.index_file === true, 'Wave 08 generated decision index is not a generated index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let decisionsObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  assert.ok(object, `${row.decision_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.decision_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.decision_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.decision_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false), `${row.decision_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_index_path && item.generated === true), `${row.decision_id}: generated index occurrence missing`);
  decisionsObserved += 1;
}
let occurrencesObserved = 0;
for (const row of entityRegistry) {
  const object = objectByKey.get(`occurrence_id:${row.occurrence_id}`);
  assert.ok(object, `${row.occurrence_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.occurrence_id}: source occurrence missing`);
  assert.equal(object.indexed, true, `${row.occurrence_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.entity_registry_path && item.generated === false), `${row.occurrence_id}: entity registry occurrence missing`);
  occurrencesObserved += 1;
}
let pairsObserved = 0;
for (const row of pairDenominator) {
  const object = objectByKey.get(`pair_id:${row.pair_id}`);
  assert.ok(object, `${row.pair_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.pair_id}: source occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.pair_denominator_path && item.generated === false), `${row.pair_id}: pair denominator occurrence missing`);
  pairsObserved += 1;
}

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
const acceptedIndependent = accepted.filter(row => row.independent_source_family_corroboration);
const activeGraphText = JSON.stringify(hopGraph);
const bridgeTokensInHopGraph = accepted.filter(row => row.identity_bridge_key && activeGraphText.includes(row.identity_bridge_key)).length;
const decisionTokensInHopGraph = decisions.filter(row => activeGraphText.includes(row.decision_id)).length;
assert.equal(bridgeTokensInHopGraph, 0, 'Wave 08 identity bridge leaked into active hop graph');
assert.equal(decisionTokensInHopGraph, 0, 'Wave 08 decision ID leaked into active hop graph');
assert.equal(activeIdentity.scheme?.cross_case_join_authorized, false, 'active projection broad cross-case join flag changed');
assert.match(buildInstructions, /production cross-case identity denominator/i, 'BUILD-INSTRUCTIONS lacks the Wave 08 production denominator contract');
assert.match(readme, /production cross-case identity decisions/i, 'README lacks the Wave 08 production identity lane');

const reconciliation = {
  schema_version: 'lake-cross-case-production-denominator-wave-08-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputPaths,
  before: plan.before,
  after: {
    counts: recomputed.counts,
    case_ids: recomputed.case_ids,
    source_control_states: sourceControlStates,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    generated_decision_index_ready: Boolean(decisionIndexState?.generated && decisionIndexState?.index_file),
    decision_ids_source_projection_and_index_observed: decisionsObserved,
    entity_occurrence_ids_source_and_index_observed: occurrencesObserved,
    pair_ids_source_observed: pairsObserved,
    accepted_decisions: accepted.length,
    accepted_independent_decisions: acceptedIndependent.length,
    unresolved_decisions: unresolved.length,
    rejected_decisions: rejected.length,
    identity_bridge_tokens_in_active_hop_graph: bridgeTokensInHopGraph,
    decision_tokens_in_active_hop_graph: decisionTokensInHopGraph,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: activeIdentity.scheme.cross_case_join_authorized,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    current_native_case_pair_denominator: pairDenominator.length,
    candidate_decisions_executed: decisions.length,
    graph_inert_identity_resolutions: accepted.length,
    independently_corroborated_identity_resolutions: acceptedIndependent.length,
    unresolved_candidates_preserved: unresolved.length,
    rejected_candidates_preserved: rejected.length,
    graph_effects_created: 0,
    automatic_join_authorizations_created: 0,
    cross_case_graph_join_authorizations_created: 0,
    cross_case_hop_authorizations_created: 0
  },
  decisions: [
    {
      decision_key: 'W08-RECONCILE-CURRENT-DENOMINATOR',
      judgment: 'the_complete_current_native_case_pair_denominator_and_all_candidate_decisions_are_source_observed_and_reproducible',
      action: 'retain_the_entity_pair_and_decision_registries_as_the_current_production_cross_case_waterline',
      evidence_count: pairDenominator.length + decisions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-RECONCILE-INDEPENDENT-CUSTODY',
      judgment: 'independent_source_family_support_is_measured_for_every_accepted_identity_resolution_and_changes_confidence_not_permission_to_decide',
      action: 'prioritize_missing_custody_and_unresolved_identity_rows_by_named_reason',
      evidence_count: accepted.length + unresolved.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-RECONCILE-GRAPH-BOUNDARY',
      judgment: 'no_production_identity_decision_or_bridge_enters_the_active_hop_graph_or_enables_automatic_joining',
      action: 'keep_all_graph_and_automatic_join_flags_false',
      evidence_count: decisions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    current_native_case_pair_denominator_complete: true,
    deterministic_reconstruction_complete: true,
    every_decision_source_projection_and_index_observed: decisionsObserved === decisions.length,
    every_entity_occurrence_source_and_index_observed: occurrencesObserved === entityRegistry.length,
    every_case_pair_source_observed: pairsObserved === pairDenominator.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    independent_source_family_support_measured: true,
    accepted_decisions_are_graph_inert: bridgeTokensInHopGraph === 0 && decisionTokensInHopGraph === 0,
    unresolved_and_rejected_candidates_preserved: unresolved.length + rejected.length === decisions.length - accepted.length,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    semantic_lake_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.reconciliation_path, reconciliation);

const report = `# Production cross-case identity denominator Wave 08 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nnative cases:                                     ${recomputed.counts.native_cases}\ncase pairs:                                       ${recomputed.counts.case_pairs}\nentity occurrences:                              ${entityRegistry.length}\ncandidate decisions:                              ${decisions.length}\naccepted graph-inert resolutions:                 ${accepted.length}\naccepted with independent source families:        ${acceptedIndependent.length}\nunresolved candidates:                            ${unresolved.length}\nrejected candidates:                              ${rejected.length}\ndecision IDs source/projection/index observed:     ${decisionsObserved} / ${decisions.length}\nentity occurrence IDs source/index observed:       ${occurrencesObserved} / ${entityRegistry.length}\ncase-pair IDs source observed:                     ${pairsObserved} / ${pairDenominator.length}\nsource controls authoritative-reachable:           ${sourceControlStates.every(row => row.authoritative_reachable)}\nidentity bridge tokens in active hop graph:        ${bridgeTokensInHopGraph}\ndecision tokens in active hop graph:               ${decisionTokensInHopGraph}\nautomatic cross-case join authorized:              false\ncross-case graph join authorized:                  false\ncross-case hop creation authorized:                false\nactive projection broad join flag:                 false\ndecisions requiring human permission:              0\n\`\`\`\n\n## Judgment\n\nThe current production cross-case candidate universe is measured rather than inferred from salient names. The accepted rows are bounded identity resolutions supported by the shared canonical registry and public custody in both cases. Independent source families are reported as confidence, not as an excuse to postpone judgment. Every unresolved and rejected row remains attached to a named defect and correction route.\n\n## Boundary\n\nNo identity decision merges records, creates a relationship, enters the hop graph, or enables automatic joining. This is the complete current denominator for the declared extraction rules and current native cases, not a claim that the lake is semantically complete.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('production cross-case denominator Wave 08 reconciled');
console.log(`  cases / pairs / occurrences: ${recomputed.counts.native_cases} / ${recomputed.counts.case_pairs} / ${entityRegistry.length}`);
console.log(`  decisions accepted / unresolved / rejected: ${accepted.length} / ${unresolved.length} / ${rejected.length}`);
console.log(`  accepted with independent source families: ${acceptedIndependent.length}`);
console.log(`  decision IDs observed: ${decisionsObserved}/${decisions.length}`);
console.log('  automatic, graph, and hop joins authorized: false');
