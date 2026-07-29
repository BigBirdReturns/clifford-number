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

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  if (!fs.existsSync(full(relative))) return [];
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
const baseline = readJson(policy.baseline_receipt_path);
const lexicon = readJson(policy.lexicon_path);
const mentions = readJsonl(policy.mention_registry_path);
const caseEntities = readJsonl(policy.case_entity_registry_path);
const pairDenominator = readJsonl(policy.pair_denominator_path);
const decisions = readJsonl(policy.decision_registry_path);
const decisionIndex = readJson(policy.decision_index_path);
const receipt = readJson(policy.receipt_path);
const plan = readJson(policy.plan_path);
const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const readme = fs.readFileSync(full('README.md'), 'utf8');

const cases = fs.readdirSync(full('cases'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(full(`cases/${entry.name}/case.json`)))
  .map(entry => {
    const caseId = entry.name;
    const caseConfig = readJson(`cases/${caseId}/case.json`);
    const recordsByType = Object.fromEntries(policy.source_record_types.map(recordType => [recordType, readJsonl(`cases/${caseId}/${recordType}.jsonl`)]));
    return { case_id: caseConfig.case_id, title: caseConfig.title, records_by_type: recordsByType };
  })
  .sort((left, right) => left.case_id.localeCompare(right.case_id));

const recomputed = compileCrossCaseMentionDenominator({
  policy,
  cases,
  actors: actorsDoc.actors ?? actorsDoc,
  organizations: organizationsDoc.organizations ?? organizationsDoc,
  aliases: aliasesDoc.aliases ?? aliasesDoc,
  baseline
});
assert.deepEqual(lexicon, recomputed.lexicon, 'Wave 09 lexicon is not deterministic');
assert.deepEqual(mentions, recomputed.mentions, 'Wave 09 mention registry is not deterministic');
assert.deepEqual(caseEntities, recomputed.case_entity_registry, 'Wave 09 mentioned-entity registry is not deterministic');
assert.deepEqual(pairDenominator, recomputed.pair_denominator, 'Wave 09 pair denominator is not deterministic');
assert.deepEqual(decisions, recomputed.decisions, 'Wave 09 decision registry is not deterministic');
assert.deepEqual(decisionIndex.decisions, decisions, 'Wave 09 decision index does not mirror the source registry');
assert.deepEqual(decisionIndex.counts, recomputed.counts, 'Wave 09 decision index counts drifted');
assert.deepEqual(receipt.counts, recomputed.counts, 'Wave 09 receipt counts drifted');
assert.deepEqual(plan.extraction.counts, recomputed.counts, 'Wave 09 plan counts drifted');

const inputPaths = [
  policyPath,
  policy.baseline_receipt_path,
  policy.lexicon_path,
  policy.mention_registry_path,
  policy.case_entity_registry_path,
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
const sourceControlPaths = [
  policy.mention_registry_path,
  policy.case_entity_registry_path,
  policy.pair_denominator_path,
  policy.decision_registry_path,
  policy.receipt_path
];
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
const lexiconState = fileByPath.get(policy.lexicon_path);
const decisionIndexState = fileByPath.get(policy.decision_index_path);
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true), 'Wave 09 source controls are not authoritative-reachable');
assert.ok(lexiconState && lexiconState.generated === true, 'Wave 09 lexicon is not a generated projection');
assert.equal(fileByPath.get(policy.mention_registry_path)?.index_file, true, 'Wave 09 mention registry is not an index surface');
assert.equal(fileByPath.get(policy.case_entity_registry_path)?.index_file, true, 'Wave 09 mentioned-entity registry is not an index surface');
assert.equal(fileByPath.get(policy.decision_registry_path)?.index_file, true, 'Wave 09 decision registry is not an index surface');
assert.ok(decisionIndexState && decisionIndexState.generated === true && decisionIndexState.index_file === true, 'Wave 09 generated decision index state drift');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let mentionIdsObserved = 0;
for (const row of mentions) {
  const object = objectByKey.get(`mention_id:${row.mention_id}`);
  assert.ok(object, `${row.mention_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.mention_id}: source occurrence missing`);
  assert.equal(object.indexed, true, `${row.mention_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.mention_registry_path && item.generated === false), `${row.mention_id}: source registry occurrence missing`);
  mentionIdsObserved += 1;
}
let mentionedEntityIdsObserved = 0;
for (const row of caseEntities) {
  const object = objectByKey.get(`mentioned_entity_id:${row.mentioned_entity_id}`);
  assert.ok(object, `${row.mentioned_entity_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.mentioned_entity_id}: source occurrence missing`);
  assert.equal(object.indexed, true, `${row.mentioned_entity_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.case_entity_registry_path && item.generated === false), `${row.mentioned_entity_id}: registry occurrence missing`);
  mentionedEntityIdsObserved += 1;
}
let pairIdsObserved = 0;
for (const row of pairDenominator) {
  const object = objectByKey.get(`pair_id:${row.pair_id}`);
  assert.ok(object, `${row.pair_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.pair_id}: source occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.pair_denominator_path && item.generated === false), `${row.pair_id}: pair denominator occurrence missing`);
  pairIdsObserved += 1;
}
let decisionIdsObserved = 0;
for (const row of decisions) {
  const object = objectByKey.get(`decision_id:${row.decision_id}`);
  assert.ok(object, `${row.decision_id}: missing from lake object index`);
  assert.equal(object.source_occurrence, true, `${row.decision_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.decision_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.decision_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_registry_path && item.generated === false), `${row.decision_id}: source decision occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.decision_index_path && item.generated === true), `${row.decision_id}: generated decision occurrence missing`);
  decisionIdsObserved += 1;
}

const accepted = decisions.filter(row => row.status === 'accepted');
const unresolved = decisions.filter(row => row.status === 'unresolved');
const rejected = decisions.filter(row => row.status === 'rejected');
const acceptedIndependent = accepted.filter(row => row.bilateral_independent_source_family_corroboration);
const activeGraphText = JSON.stringify(hopGraph);
const recurrenceTokensInHopGraph = accepted.filter(row => row.recurrence_key && activeGraphText.includes(row.recurrence_key)).length;
const decisionTokensInHopGraph = decisions.filter(row => activeGraphText.includes(row.decision_id)).length;
assert.equal(recurrenceTokensInHopGraph, 0, 'Wave 09 recurrence key leaked into active hop graph');
assert.equal(decisionTokensInHopGraph, 0, 'Wave 09 decision ID leaked into active hop graph');
assert.equal(activeIdentity.scheme?.cross_case_join_authorized, false, 'active projection broad cross-case join flag changed');
assert.match(buildInstructions, /exact cross-case mention denominator/i, 'BUILD-INSTRUCTIONS lacks the Wave 09 contract');
assert.match(readme, /exact cross-case mention recurrence/i, 'README lacks the Wave 09 lane');

const reconciliation = {
  schema_version: 'lake-cross-case-mention-denominator-wave-09-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputPaths,
  before: plan.before,
  after: {
    baseline: recomputed.baseline,
    counts: recomputed.counts,
    case_ids: recomputed.case_ids,
    source_control_states: sourceControlStates,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    lexicon_generated_projection_ready: Boolean(lexiconState?.generated),
    generated_decision_index_ready: Boolean(decisionIndexState?.generated && decisionIndexState?.index_file),
    mention_ids_source_and_index_observed: mentionIdsObserved,
    mentioned_entity_ids_source_and_index_observed: mentionedEntityIdsObserved,
    pair_ids_source_observed: pairIdsObserved,
    decision_ids_source_projection_and_index_observed: decisionIdsObserved,
    accepted_recurrences: accepted.length,
    accepted_independent_recurrences: acceptedIndependent.length,
    unresolved_recurrences: unresolved.length,
    rejected_recurrences: rejected.length,
    recurrence_tokens_in_active_hop_graph: recurrenceTokensInHopGraph,
    decision_tokens_in_active_hop_graph: decisionTokensInHopGraph,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: activeIdentity.scheme.cross_case_join_authorized,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    exact_mentions_recovered_beyond_structured_layer: recomputed.counts.exact_mentions,
    case_local_mentioned_entities_recovered: recomputed.counts.mentioned_case_entities,
    cross_case_recurrence_candidates_executed: decisions.length,
    graph_inert_recurrences_accepted: accepted.length,
    independently_corroborated_recurrences: acceptedIndependent.length,
    unresolved_recurrences_preserved: unresolved.length,
    rejected_recurrences_preserved: rejected.length,
    graph_effects_created: 0,
    automatic_join_authorizations_created: 0,
    cross_case_graph_join_authorizations_created: 0,
    cross_case_hop_authorizations_created: 0
  },
  decisions: [
    {
      decision_key: 'W09-RECONCILE-EXACT-MENTION-DENOMINATOR',
      judgment: 'the_declared_native_case_text_surface_is_scanned_under_one_exact_unambiguous_lexicon_and_every_mention_is_source_observed',
      action: 'retain_the_mention_and_case_entity_registries_as_the_current_exact_text_waterline',
      evidence_count: mentions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-RECONCILE-RECURRENCE-JUDGMENTS',
      judgment: 'bilaterally_custodied_same_canonical_entity_mentions_support_bounded_graph_inert_recurrence_judgments_and_missing_custody_remains_named_unresolved_debt',
      action: 'retain_accepted_unresolved_and_rejected_recurrences_with_source_family_confidence',
      evidence_count: decisions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-RECONCILE-GRAPH-BOUNDARY',
      judgment: 'no_exact_mention_or_recurrence_decision_enters_the_active_hop_graph_or_enables_automatic_joining',
      action: 'keep_all_graph_and_automatic_join_flags_false',
      evidence_count: mentions.length + decisions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    structured_zero_candidate_baseline_preserved: recomputed.baseline.structured_zero_candidate_silo_finding_preserved,
    deterministic_reconstruction_complete: true,
    exact_mention_lexicon_reproduced: true,
    every_mention_source_and_index_observed: mentionIdsObserved === mentions.length,
    every_mentioned_entity_source_and_index_observed: mentionedEntityIdsObserved === caseEntities.length,
    every_case_pair_source_observed: pairIdsObserved === pairDenominator.length,
    every_decision_source_projection_and_index_observed: decisionIdsObserved === decisions.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    independent_source_family_support_measured: true,
    accepted_recurrences_are_graph_inert: recurrenceTokensInHopGraph === 0 && decisionTokensInHopGraph === 0,
    unresolved_and_rejected_recurrences_preserved: unresolved.length + rejected.length === decisions.length - accepted.length,
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

const report = `# Exact cross-case mention denominator Wave 09 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nWave 08 structured candidates preserved:       ${recomputed.baseline.structured_candidate_decisions}\nsource records scanned:                        ${recomputed.counts.source_records_scanned}\ntext leaves scanned:                           ${recomputed.counts.text_leaves_scanned}\ntext characters scanned:                       ${recomputed.counts.text_characters_scanned}\nexact mentions recovered:                      ${mentions.length}\nrecurrence-eligible mentions:                  ${recomputed.counts.eligible_mentions}\ncase-local mentioned entities:                 ${caseEntities.length}\ncross-case recurrence decisions:               ${decisions.length}\naccepted graph-inert recurrences:               ${accepted.length}\naccepted with independent source families:     ${acceptedIndependent.length}\nunresolved recurrences:                         ${unresolved.length}\nrejected recurrences:                           ${rejected.length}\nmention IDs source/index observed:              ${mentionIdsObserved} / ${mentions.length}\nmentioned-entity IDs source/index observed:     ${mentionedEntityIdsObserved} / ${caseEntities.length}\ncase-pair IDs source observed:                  ${pairIdsObserved} / ${pairDenominator.length}\ndecision IDs source/projection/index observed:  ${decisionIdsObserved} / ${decisions.length}\nsource controls authoritative-reachable:        ${sourceControlStates.every(row => row.authoritative_reachable)}\nrecurrence tokens in active hop graph:          ${recurrenceTokensInHopGraph}\ndecision tokens in active hop graph:            ${decisionTokensInHopGraph}\nautomatic cross-case join authorized:           false\ncross-case graph join authorized:               false\ncross-case hop creation authorized:             false\nactive projection broad join flag:              false\ndecisions requiring human permission:           0\n\`\`\`\n\n## Judgment\n\nThe exact mention layer is now independently addressable from the structured-ID layer. It shows which canonical entities recur in source-bearing text across cases and which recurrences have bilateral public custody. Those judgments are made now, with confidence and correction routes attached; no hypothetical reviewer supplies permission to read the evidence.\n\n## Boundary\n\nA repeated exact mention is not a relationship, coordination, common purpose, graph edge, or hop. Fuzzy and ambiguous matching remain prohibited. The result is complete only for the declared exact lexicon and current source record types, not for the whole semantic lake.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('exact cross-case mention denominator Wave 09 reconciled');
console.log(`  exact mentions / case entities: ${mentions.length} / ${caseEntities.length}`);
console.log(`  decisions accepted / unresolved / rejected: ${accepted.length} / ${unresolved.length} / ${rejected.length}`);
console.log(`  accepted with independent source families: ${acceptedIndependent.length}`);
console.log(`  mention IDs observed: ${mentionIdsObserved}/${mentions.length}`);
console.log(`  decision IDs observed: ${decisionIdsObserved}/${decisions.length}`);
console.log('  automatic, graph, and hop joins authorized: false');
