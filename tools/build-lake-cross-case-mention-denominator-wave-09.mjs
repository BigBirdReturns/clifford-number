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
function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function countBy(rows, field) {
  return Object.fromEntries([...new Set(rows.map(row => row[field]))].sort().map(value => [value, rows.filter(row => row[field] === value).length]));
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-cross-case-mention-denominator-wave-09-policy@1');
assert.equal(policy.text_scan.fuzzy_matching_authorized, false, 'Wave 09 fuzzy matching must remain disabled');
const baseline = readJson(policy.baseline_receipt_path);
assert.equal(baseline.counts?.candidate_decisions, 0, 'Wave 09 requires the Wave 08 zero-candidate structured baseline');
assert.equal(baseline.boundaries?.zero_exact_candidates_proves_no_real_overlap, false, 'Wave 08 zero-candidate boundary drift');

const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const actors = actorsDoc.actors ?? actorsDoc;
const organizations = organizationsDoc.organizations ?? organizationsDoc;
const aliases = aliasesDoc.aliases ?? aliasesDoc;

const caseRoot = full('cases');
const sourcePaths = [];
const cases = fs.readdirSync(caseRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'case.json')))
  .map(entry => {
    const caseId = entry.name;
    const caseConfig = readJson(`cases/${caseId}/case.json`);
    sourcePaths.push(`cases/${caseId}/case.json`);
    const recordsByType = {};
    for (const recordType of policy.source_record_types) {
      const relative = `cases/${caseId}/${recordType}.jsonl`;
      recordsByType[recordType] = readJsonl(relative);
      if (fs.existsSync(full(relative))) sourcePaths.push(relative);
    }
    return {
      case_id: caseConfig.case_id,
      title: caseConfig.title,
      records_by_type: recordsByType
    };
  })
  .sort((left, right) => left.case_id.localeCompare(right.case_id));

const implementationPaths = [
  'tools/lib/cross-case-mention-denominator.mjs',
  'tools/build-lake-cross-case-mention-denominator-wave-09.mjs',
  'tools/reconcile-lake-cross-case-mention-denominator-wave-09.mjs',
  'tools/validate-lake-cross-case-mention-denominator-wave-09.mjs',
  'test/lake-cross-case-mention-denominator-wave-09.test.js'
];
const inputPaths = [...new Set([
  policyPath,
  policy.baseline_receipt_path,
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'data/canonical/aliases.json',
  'BUILD-INSTRUCTIONS.md',
  'README.md',
  ...sourcePaths,
  ...implementationPaths
])].filter(relative => fs.existsSync(full(relative))).sort((left, right) => left.localeCompare(right));
const inputManifest = inputPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const result = compileCrossCaseMentionDenominator({
  policy,
  cases,
  actors,
  organizations,
  aliases,
  baseline
});

assert.ok(result.counts.native_cases >= policy.expected.minimum_native_cases, 'native case count below Wave 09 floor');
assert.ok(result.counts.case_pairs >= policy.expected.minimum_case_pairs, 'case pair count below Wave 09 floor');
assert.ok(result.counts.text_leaves_scanned >= policy.expected.minimum_text_leaves_scanned, 'text leaf count below Wave 09 floor');
assert.ok(result.counts.exact_mentions >= policy.expected.minimum_exact_mentions, 'exact mention count below Wave 09 floor');
assert.ok(result.counts.candidate_decisions >= policy.expected.minimum_candidate_decisions, 'candidate decision count below Wave 09 floor');
assert.equal(result.counts.case_pairs, result.counts.native_cases * (result.counts.native_cases - 1) / 2, 'case pair denominator incomplete');
assert.equal(result.baseline.structured_candidate_decisions, 0, 'Wave 08 structured baseline was not preserved');
assert.equal(result.baseline.structured_zero_candidate_silo_finding_preserved, true, 'Wave 08 silo finding missing');
assert.equal(new Set(result.mentions.map(row => row.mention_id)).size, result.mentions.length, 'duplicate Wave 09 mention IDs');
assert.equal(new Set(result.case_entity_registry.map(row => row.mentioned_entity_id)).size, result.case_entity_registry.length, 'duplicate mentioned-entity IDs');
assert.equal(new Set(result.pair_denominator.map(row => row.pair_id)).size, result.pair_denominator.length, 'duplicate mention-pair IDs');
assert.equal(new Set(result.decisions.map(row => row.decision_id)).size, result.decisions.length, 'duplicate mention-decision IDs');
assert.equal(result.pair_denominator.reduce((total, row) => total + row.candidate_canonical_entities, 0), result.decisions.length, 'pair candidates disagree with decision registry');
assert.equal(result.decisions.filter(row => row.status === 'accepted').length, result.counts.accepted_recurrences, 'accepted recurrence count drift');
assert.equal(result.decisions.filter(row => row.status === 'unresolved').length, result.counts.unresolved_recurrences, 'unresolved recurrence count drift');
assert.equal(result.decisions.filter(row => row.status === 'rejected').length, result.counts.rejected_recurrences, 'rejected recurrence count drift');
assert.ok(result.mentions.every(row => row.graph_effect === 'none'), 'Wave 09 mention created graph effect');
assert.ok(result.decisions.every(row => row.review_dependency?.required_to_decide === false), 'human-permission dependency entered Wave 09');
assert.ok(result.decisions.every(row => row.records_merged === false && row.relationship_created === false), 'Wave 09 decision merged records or created a relationship');
assert.ok(result.decisions.every(row => row.automatic_cross_case_join_authorized === false && row.cross_case_graph_join_authorized === false && row.cross_case_hop_creation_authorized === false), 'Wave 09 decision overclaimed join authority');
assert.ok(result.decisions.every(row => row.graph_effect === 'none'), 'Wave 09 decision created graph effect');

writeJson(policy.lexicon_path, result.lexicon);
writeJsonl(policy.mention_registry_path, result.mentions);
writeJsonl(policy.case_entity_registry_path, result.case_entity_registry);
writeJsonl(policy.pair_denominator_path, result.pair_denominator);
writeJsonl(policy.decision_registry_path, result.decisions);
writeJson(policy.decision_index_path, {
  schema_version: 'cross-case-mention-decision-index@1',
  program_key: policy.program_key,
  source_registry_path: policy.decision_registry_path,
  counts: result.counts,
  decisions: result.decisions
});

const receipt = {
  schema_version: 'lake-cross-case-mention-denominator-wave-09@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  baseline: result.baseline,
  case_scope: policy.case_scope,
  shared_identity_namespace: policy.shared_identity_namespace,
  counts: result.counts,
  scan_metrics: result.scan_metrics,
  lexicon_counts: result.lexicon.counts,
  lexicon_exclusion_reason_counts: countBy(result.lexicon.excluded, 'exclusion_reason'),
  mention_record_type_counts: countBy(result.mentions, 'record_type'),
  mention_match_kind_counts: countBy(result.mentions, 'lexeme_source'),
  decision_status_counts: countBy(result.decisions, 'status'),
  decision_reason_counts: countBy(result.decisions, 'reason'),
  decision_confidence_counts: countBy(result.decisions, 'confidence'),
  accepted_recurrence_keys: result.decisions.filter(row => row.status === 'accepted').map(row => row.recurrence_key),
  decisions_requiring_human_permission: 0,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  active_projection_cross_case_join_authorized: false,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.receipt_path, receipt);

const plan = {
  schema_version: 'lake-cross-case-mention-denominator-wave-09-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: {
    structured_native_cases: result.baseline.native_cases,
    structured_case_pairs: result.baseline.case_pairs,
    structured_entity_occurrences: result.baseline.structured_entity_occurrences,
    structured_candidate_decisions: result.baseline.structured_candidate_decisions,
    exact_text_mention_registry_present: false,
    exact_text_recurrence_decisions_present: false,
    active_projection_cross_case_join_authorized: false
  },
  extraction: {
    case_ids: result.case_ids,
    lexicon_path: policy.lexicon_path,
    mention_registry_path: policy.mention_registry_path,
    case_entity_registry_path: policy.case_entity_registry_path,
    pair_denominator_path: policy.pair_denominator_path,
    decision_registry_path: policy.decision_registry_path,
    decision_index_path: policy.decision_index_path,
    counts: result.counts,
    scan_metrics: result.scan_metrics,
    lexicon_counts: result.lexicon.counts
  },
  pair_denominator: result.pair_denominator,
  decisions: [
    {
      decision_key: 'W09-EXACT-SOURCE-BOUND-MENTION-DENOMINATOR',
      judgment: 'every_declared_source_text_leaf_is_scanned_against_the_same_exact_unambiguous_canonical_and_alias_lexicon',
      action: `retain:${policy.mention_registry_path}`,
      evidence_count: result.counts.text_leaves_scanned,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-EXECUTE-BOUNDED-MENTION-RECURRENCE-JUDGMENTS',
      judgment: 'exact_same_canonical_entity_mentions_with_bilateral_public_custody_support_a_graph_inert_recurrence_judgment_while_missing_custody_remains_unresolved',
      action: `retain:${policy.decision_registry_path}`,
      evidence_count: result.counts.candidate_decisions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-PRESERVE-WAVE08-AND-GRAPH-BOUNDARIES',
      judgment: 'textual_recurrence_expands_the_search_surface_without_rewriting_the_zero_candidate_structured_layer_or_creating_relationships_edges_or_hops',
      action: 'retain_wave08_as_the_structured_baseline_and_keep_all_automatic_and_graph_join_flags_false',
      evidence_count: result.counts.exact_mentions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    structured_zero_candidate_baseline_preserved: true,
    exact_mention_lexicon_built: true,
    all_declared_source_record_types_scanned: true,
    exact_mentions_materialized: true,
    current_case_pair_mention_denominator_complete: true,
    current_recurrence_decisions_executed: true,
    ambiguous_and_unsafe_lexemes_preserved_in_lexicon: true,
    independent_source_family_support_measured: true,
    accepted_recurrences_are_graph_inert: true,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: false,
    semantic_lake_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# Exact cross-case mention denominator Wave 09\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Expansion beyond the structured silo\n\n\`\`\`text\nWave 08 structured candidates:              ${result.baseline.structured_candidate_decisions}\nnative cases:                                ${result.counts.native_cases}\ncase pairs:                                  ${result.counts.case_pairs}\nactive exact lexemes:                        ${result.counts.active_lexemes}\nexcluded or ambiguous lexemes:               ${result.counts.excluded_lexemes}\nsource records scanned:                      ${result.counts.source_records_scanned}\ntext leaves scanned:                         ${result.counts.text_leaves_scanned}\ntext characters scanned:                     ${result.counts.text_characters_scanned}\nexact canonical/alias mentions:              ${result.counts.exact_mentions}\nrecurrence-eligible mentions:                ${result.counts.eligible_mentions}\ncase-local mentioned canonical entities:     ${result.counts.mentioned_case_entities}\ncross-case recurrence candidates:            ${result.counts.candidate_decisions}\naccepted graph-inert recurrences:             ${result.counts.accepted_recurrences}\naccepted with independent source families:   ${result.counts.accepted_independent_recurrences}\naccepted with shared source family only:      ${result.counts.accepted_shared_source_family_recurrences}\nunresolved recurrences:                       ${result.counts.unresolved_recurrences}\nrejected recurrences:                         ${result.counts.rejected_recurrences}\ndecisions requiring human permission:        0\n\`\`\`\n\n## Governing judgment\n\nThe native case ledgers are structurally siloed at their machine-ID layer, but their source-bearing prose and metadata may still name the same canonical entities. Wave 09 recovers that exact mention layer under one neutral lexicon. It records every span, source record, claim and receipt attachment, and source-family state before deciding whether a cross-case recurrence has bilateral public custody.\n\n## Boundary\n\nRepeated exact mention is not a relationship, coordination, causation, common purpose, or hop. Accepted rows are graph-inert source-custodied recurrence judgments. Ambiguous, unsafe-short, and generic lexemes remain excluded controls; fuzzy matching is prohibited.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('exact cross-case mention denominator Wave 09 built');
console.log(`  native cases / pairs: ${result.counts.native_cases} / ${result.counts.case_pairs}`);
console.log(`  source records / text leaves: ${result.counts.source_records_scanned} / ${result.counts.text_leaves_scanned}`);
console.log(`  exact / eligible mentions: ${result.counts.exact_mentions} / ${result.counts.eligible_mentions}`);
console.log(`  recurrence candidates: ${result.counts.candidate_decisions}`);
console.log(`  accepted / unresolved / rejected: ${result.counts.accepted_recurrences} / ${result.counts.unresolved_recurrences} / ${result.counts.rejected_recurrences}`);
console.log('  automatic, graph, and hop joins authorized: false');
