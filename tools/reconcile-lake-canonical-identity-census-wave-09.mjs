#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-identity-census-wave-09-policy.json';
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

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.census_receipt_path);
const mentions = readJsonl(policy.mention_registry_path);
const candidates = readJsonl(policy.candidate_registry_path);
const projection = readJson(policy.candidate_projection_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(policy.schema_version, 'lake-canonical-identity-census-wave-09-policy@1');
assert.equal(plan.schema_version, 'lake-canonical-identity-census-wave-09-plan@1');
assert.equal(receipt.schema_version, 'lake-canonical-identity-census-wave-09@1');
assert.equal(plan.program_key, policy.program_key);
assert.equal(receipt.program_key, policy.program_key);
assert.equal(plan.source_fingerprint_sha256, manifestFingerprint(plan.input_manifest), 'Wave 09 plan fingerprint mismatch');
assert.equal(receipt.source_fingerprint_sha256, plan.source_fingerprint_sha256, 'Wave 09 receipt and plan fingerprints disagree');

const orderedMentions = [...mentions].sort((left, right) => `${left.case_id}\0${left.normalized_identity_value}`.localeCompare(`${right.case_id}\0${right.normalized_identity_value}`));
const orderedCandidates = [...candidates].sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.basis_class}\0${left.basis_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.basis_class}\0${right.basis_value}`));
assert.equal(projection.schema_version, 'axm-canonical-identity-candidate-index-wave-09@1');
assert.equal(projection.program_key, policy.program_key);
assert.equal(projection.mention_registry_path, policy.mention_registry_path);
assert.equal(projection.candidate_registry_path, policy.candidate_registry_path);
assert.deepEqual(projection.mentions, orderedMentions, 'Wave 09 mention projection disagrees with source registry');
assert.deepEqual(projection.cross_case_candidates, orderedCandidates, 'Wave 09 candidate projection disagrees with source registry');
assert.equal(projection.counts.mentions, mentions.length);
assert.equal(projection.counts.cross_case_candidates, candidates.length);
assert.equal(projection.counts.accepted_production_identity_bridges, 0);

assert.equal(mentions.length, policy.expected.distinct_case_local_identity_values, 'Wave 09 mention count drift');
assert.equal(new Set(mentions.map(row => row.mention_id)).size, mentions.length, 'duplicate Wave 09 mention ID');
assert.equal(new Set(candidates.map(row => row.candidate_id)).size, candidates.length, 'duplicate Wave 09 candidate ID');

for (const row of mentions) {
  assert.ok(row.mention_id, 'Wave 09 mention missing ID');
  assert.equal(row.canonical_mapping_resolved, false, `${row.mention_id}: mapping was represented as resolved identity`);
  assert.equal(row.accepted_production_identity_bridge, false, `${row.mention_id}: production bridge accepted`);
  assert.ok(Array.isArray(row.blocking_conditions) && row.blocking_conditions.length >= 4, `${row.mention_id}: blockers missing`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${row.mention_id}: automatic join authorized`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${row.mention_id}: graph join authorized`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${row.mention_id}: hop creation authorized`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.mention_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.mention_id}: correction route missing`);
  assert.equal(row.graph_effect, 'none', `${row.mention_id}: graph effect created`);
  if (row.mapping_status.startsWith('ambiguous_')) assert.ok(row.canonical_candidate_ids.length > 1, `${row.mention_id}: ambiguous mapping lacks multiple candidates`);
  if (row.mapping_status === 'uncovered_name_like_identifier' || row.mapping_status === 'opaque_identifier') {
    assert.equal(row.canonical_candidate_ids.length, 0, `${row.mention_id}: uncovered/opaque mapping has canonical candidate`);
  }
  if (['exact_canonical_id', 'exact_declared_alias', 'exact_canonical_label', 'normalized_canonical_id', 'controlled_stem_candidate'].includes(row.mapping_status)) {
    assert.equal(row.canonical_candidate_ids.length, 1, `${row.mention_id}: singleton mapping class does not have one candidate`);
  }
}

for (const row of candidates) {
  assert.equal(row.status, 'candidate_only', `${row.candidate_id}: status escaped candidate_only`);
  assert.equal(row.accepted_production_identity_bridge, false, `${row.candidate_id}: production bridge accepted`);
  assert.ok(row.left_mention_ids.length > 0 && row.right_mention_ids.length > 0, `${row.candidate_id}: supporting mentions missing`);
  assert.ok(row.blocking_conditions.includes('explicit_same_entity_assertion_absent'), `${row.candidate_id}: assertion blocker missing`);
  assert.ok(row.blocking_conditions.includes('assertion_source_custody_absent'), `${row.candidate_id}: assertion-custody blocker missing`);
  assert.ok(row.blocking_conditions.includes('shared_identity_namespace_absent'), `${row.candidate_id}: namespace blocker missing`);
  assert.ok(row.blocking_conditions.includes('unambiguous_axm_token_overlap_absent'), `${row.candidate_id}: AXM-token blocker missing`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${row.candidate_id}: automatic join authorized`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${row.candidate_id}: graph join authorized`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${row.candidate_id}: hop creation authorized`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.candidate_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.candidate_id}: correction route missing`);
  assert.equal(row.graph_effect, 'none', `${row.candidate_id}: graph effect created`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourceControlPaths = [policy.mention_registry_path, policy.candidate_registry_path, policy.census_receipt_path];
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
assert.ok(sourceControlStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true),
  'Wave 09 source controls are not authoritative-reachable');
assert.equal(fileByPath.get(policy.mention_registry_path)?.index_file, true, 'Wave 09 mention registry is not an index surface');
assert.equal(fileByPath.get(policy.candidate_registry_path)?.index_file, true, 'Wave 09 candidate registry is not an index surface');
const projectionFile = fileByPath.get(policy.candidate_projection_path);
assert.ok(projectionFile, 'Wave 09 generated projection lake row missing');
assert.equal(projectionFile.generated, true, 'Wave 09 projection not marked generated');
assert.equal(projectionFile.index_file, true, 'Wave 09 projection is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
let mentionsObserved = 0;
for (const row of mentions) {
  const object = objectByKey.get(`mention_id:${row.mention_id}`);
  assert.ok(object, `${row.mention_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.mention_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.mention_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.mention_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.mention_registry_path && item.generated === false), `${row.mention_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true), `${row.mention_id}: generated projection occurrence missing`);
  mentionsObserved += 1;
}
let candidatesObserved = 0;
for (const row of candidates) {
  const object = objectByKey.get(`candidate_id:${row.candidate_id}`);
  assert.ok(object, `${row.candidate_id}: lake object missing`);
  assert.equal(object.source_occurrence, true, `${row.candidate_id}: source occurrence missing`);
  assert.equal(object.projection_occurrence, true, `${row.candidate_id}: projection occurrence missing`);
  assert.equal(object.indexed, true, `${row.candidate_id}: index occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_registry_path && item.generated === false), `${row.candidate_id}: source registry occurrence missing`);
  assert.ok(object.occurrences.some(item => item.path === policy.candidate_projection_path && item.generated === true), `${row.candidate_id}: generated projection occurrence missing`);
  candidatesObserved += 1;
}

assert.equal(activeIdentity.scheme?.cross_case_join_authorized, false, 'active identity broad join flag opened');
assert.ok(!/CANMENTION-|CANCROSS-|canonical-cross-case-identity-candidate/i.test(JSON.stringify(hopGraph)), 'Wave 09 identifiers leaked into active topology');

const reconciliationInputs = [
  policyPath,
  policy.mention_registry_path,
  policy.candidate_registry_path,
  policy.census_receipt_path,
  policy.candidate_projection_path,
  policy.plan_path,
  'build/axm-identity.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const reconciliationFingerprint = manifestFingerprint(reconciliationInputs);
const statusCounts = {};
for (const mention of mentions) statusCounts[mention.mapping_status] = (statusCounts[mention.mapping_status] ?? 0) + 1;
const candidateBasisCounts = {};
for (const candidate of candidates) candidateBasisCounts[candidate.basis_class] = (candidateBasisCounts[candidate.basis_class] ?? 0) + 1;
const bothSidesCustodied = candidates.filter(row => row.source_custody_on_both_sides).length;
const bothSidesPublic = candidates.filter(row => row.publicly_inspectable_custody_on_both_sides).length;

const reconciliation = {
  schema_version: 'lake-canonical-identity-census-wave-09-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: reconciliationFingerprint,
  input_manifest: reconciliationInputs,
  before: plan.before,
  after: {
    native_cases: policy.expected.native_cases,
    source_identity_occurrences: policy.expected.source_identity_occurrences,
    distinct_mentions_classified: mentions.length,
    mapping_status_counts: Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right))),
    cross_case_candidate_rows: candidates.length,
    candidate_basis_counts: Object.fromEntries(Object.entries(candidateBasisCounts).sort(([left], [right]) => left.localeCompare(right))),
    candidates_with_source_custody_on_both_sides: bothSidesCustodied,
    candidates_with_publicly_inspectable_custody_on_both_sides: bothSidesPublic,
    mention_ids_source_projection_and_index_observed: mentionsObserved,
    candidate_ids_source_projection_and_index_observed: candidatesObserved,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    source_control_states: sourceControlStates,
    candidate_projection_indexed: projectionFile.index_file,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: activeIdentity.scheme.cross_case_join_authorized,
    census_tokens_in_active_hop_graph: 0,
    global_machine_ids: summary.counts.distinct_machine_ids,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids,
    exact_orphan_evidence_files: summary.counts.exact_orphan_evidence_files
  },
  deltas: {
    canonical_identity_mentions_classified: mentions.length,
    canonical_cross_case_candidates_measured: candidates.length,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorizations: 0,
    cross_case_graph_join_authorizations: 0,
    cross_case_hop_creation_authorizations: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W09-RECONCILE-CLASSIFICATION',
      judgment: 'all_distinct_case_local_identity_values_have_source_and_projection_observed_mapping_classes',
      action: 'retain_exact_controlled_ambiguous_uncovered_and_opaque_rows',
      evidence_count: mentions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-RECONCILE-CANDIDATES',
      judgment: 'canonical_or_controlled_lexical_candidates_are_measured_without_becoming_identity_findings',
      action: 'retain_candidate_rows_and_material_blockers',
      evidence_count: candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-RECONCILE-JOIN-GATE',
      judgment: 'no_canonical_or_lexical_candidate_satisfies_the_complete_wave_07_bridge_contract',
      action: 'keep_all_automatic_graph_and_hop_join_authorizations_false',
      evidence_count: mentions.length + candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_case_local_identity_value_classified: mentions.length === policy.expected.distinct_case_local_identity_values,
    ambiguous_and_uncovered_mentions_preserved: true,
    generated_candidate_projection_built_and_indexed: true,
    every_mention_id_source_projection_and_index_observed: mentionsObserved === mentions.length,
    every_candidate_id_source_projection_and_index_observed: candidatesObserved === candidates.length,
    source_controls_authoritative_reachable: sourceControlStates.every(row => row.authoritative_reachable),
    cross_case_candidate_denominator_measured: true,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.reconciliation_path, reconciliation);

const report = `# Canonical identity census Wave 09 reconciliation\n\nSource fingerprint: \`${reconciliationFingerprint}\`\n\n## Result\n\n\`\`\`text\ndistinct mentions classified:                  ${mentions.length}\ncross-case candidate rows:                     ${candidates.length}\nmentions source/projection/indexed:             ${mentionsObserved}\ncandidates source/projection/indexed:           ${candidatesObserved}\ncandidates custodied on both sides:             ${bothSidesCustodied}\ncandidates publicly inspectable on both sides:  ${bothSidesPublic}\naccepted production identity bridges:           0\nautomatic cross-case join authorized:           false\ncross-case graph join authorized:               false\ncross-case hop creation authorized:             false\nactive broad join flag:                         false\ncensus tokens in active hop graph:              0\ndecisions requiring human permission:           0\n\`\`\`\n\n## Judgment\n\nThe canonicalization layer now exposes what the exact-ID census could not: registry-covered names, controlled lexical candidates, ambiguities, opaque identifiers, and uncovered names. These are operational acquisition classes, not identity findings. Every row is source-observed, projection-observed, and index-addressable.\n\n## Boundary\n\nNo canonical or lexical candidate merges entities, creates a relationship, or enters topology. A production bridge still requires an explicit same-entity assertion, custody on both local records and the assertion, a shared identity namespace, and unambiguous AXM token overlap.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('canonical identity census Wave 09 reconciled');
console.log(`  mentions / candidates: ${mentions.length} / ${candidates.length}`);
console.log(`  mentions / candidates observed: ${mentionsObserved}/${mentions.length} / ${candidatesObserved}/${candidates.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
