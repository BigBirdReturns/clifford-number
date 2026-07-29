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

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-cross-case-production-denominator-wave-08-policy@1');
const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const activeIdentity = readJson('build/axm-identity.json');
const wave07 = readJson('build/lake-actions/axm-cross-case-acceptance-wave-07-reconciliation.json');
assert.equal(activeIdentity.scheme?.status, 'reconciled_genesis_v1', 'Wave 08 requires the reconciled AXM Genesis v1 projection');
assert.equal(activeIdentity.scheme?.external_axm_gate_complete, true, 'Wave 08 requires completed external AXM reconciliation');
assert.equal(activeIdentity.scheme?.cross_case_join_authorized, false, 'Wave 08 must begin with the broad active join flag closed');
assert.equal(wave07.completion?.explicit_cross_case_identity_resolution_authorized, true, 'Wave 07 bounded identity lane is not complete');
assert.equal(wave07.completion?.automatic_cross_case_join_authorized, false, 'Wave 07 automatic join boundary drift');

const caseRoot = full('cases');
const caseDirectories = fs.readdirSync(caseRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'case.json')))
  .map(entry => path.join(caseRoot, entry.name))
  .sort((left, right) => left.localeCompare(right));

const caseSourcePaths = [];
const cases = caseDirectories.map(directory => {
  const rel = path.relative(root, directory).replaceAll('\\', '/');
  for (const name of ['case.json', 'claims.jsonl', 'receipts.jsonl', 'events.jsonl', 'relations.jsonl', 'beacons.jsonl', 'trails.jsonl']) {
    const candidate = `${rel}/${name}`;
    if (fs.existsSync(full(candidate))) caseSourcePaths.push(candidate);
  }
  const data = loadCaseLedger(directory);
  return {
    case_id: data.case.case_id,
    title: data.case.title,
    claims: data.claims,
    receipts: data.receipts
  };
});

const implementationPaths = [
  'tools/lib/cross-case-production-denominator.mjs',
  'tools/build-lake-cross-case-production-denominator-wave-08.mjs',
  'tools/reconcile-lake-cross-case-production-denominator-wave-08.mjs',
  'tools/validate-lake-cross-case-production-denominator-wave-08.mjs',
  'test/lake-cross-case-production-denominator-wave-08.test.js'
];
const fingerprintPaths = [...new Set([
  policyPath,
  ...(policy.input_paths ?? []),
  ...caseSourcePaths,
  ...implementationPaths
])].filter(relative => fs.existsSync(full(relative))).sort((left, right) => left.localeCompare(right));
const inputManifest = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const result = compileProductionCrossCaseDenominator({
  policy,
  cases,
  canonicalActors: actorsDoc.actors ?? actorsDoc,
  canonicalOrganizations: organizationsDoc.organizations ?? organizationsDoc,
  canonicalAliases: aliasesDoc.aliases ?? aliasesDoc
});

assert.ok(result.counts.native_cases >= policy.expected.minimum_native_cases, 'native case count below Wave 08 floor');
assert.ok(result.counts.case_pairs >= policy.expected.minimum_case_pairs, 'case pair count below Wave 08 floor');
assert.ok(result.counts.entity_occurrences >= policy.expected.minimum_entity_occurrences, 'entity occurrence count below Wave 08 floor');
assert.ok(result.counts.candidate_decisions >= policy.expected.minimum_candidate_decisions, 'candidate decision count below Wave 08 floor');
assert.equal(result.counts.case_pairs, result.counts.native_cases * (result.counts.native_cases - 1) / 2, 'case-pair denominator is incomplete');
assert.equal(result.pair_denominator.reduce((total, row) => total + row.candidate_pairs, 0), result.counts.candidate_decisions, 'pair candidate totals disagree');
assert.equal(result.decisions.filter(row => row.status === 'accepted').length, result.counts.accepted_decisions, 'accepted decision count drift');
assert.equal(result.decisions.filter(row => row.status === 'unresolved').length, result.counts.unresolved_decisions, 'unresolved decision count drift');
assert.equal(result.decisions.filter(row => row.status === 'rejected').length, result.counts.rejected_decisions, 'rejected decision count drift');
assert.ok(result.decisions.every(row => row.review_dependency?.required_to_decide === false), 'human-permission dependency entered Wave 08 decisions');
assert.ok(result.decisions.every(row => row.graph_effect === 'none'), 'Wave 08 decision created graph effect');
assert.ok(result.decisions.every(row => row.automatic_cross_case_join_authorized === false && row.cross_case_graph_join_authorized === false && row.cross_case_hop_creation_authorized === false), 'Wave 08 decision overclaimed join authority');

writeJsonl(policy.entity_registry_path, result.entity_registry);
writeJsonl(policy.pair_denominator_path, result.pair_denominator);
writeJsonl(policy.decision_registry_path, result.decisions);
writeJson(policy.decision_index_path, {
  schema_version: 'cross-case-production-join-decision-index@1',
  program_key: policy.program_key,
  source_registry_path: policy.decision_registry_path,
  counts: result.counts,
  decisions: result.decisions
});

const receipt = {
  schema_version: 'lake-cross-case-production-denominator-wave-08@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  case_scope: policy.case_scope,
  shared_identity_namespace: policy.shared_identity_namespace,
  counts: result.counts,
  status_counts: {
    accepted: result.counts.accepted_decisions,
    unresolved: result.counts.unresolved_decisions,
    rejected: result.counts.rejected_decisions
  },
  reason_counts: Object.fromEntries([...new Set(result.decisions.map(row => row.reason))].sort().map(reason => [reason, result.decisions.filter(row => row.reason === reason).length])),
  confidence_counts: Object.fromEntries([...new Set(result.decisions.map(row => row.confidence))].sort().map(confidence => [confidence, result.decisions.filter(row => row.confidence === confidence).length])),
  accepted_identity_bridge_keys: result.decisions.filter(row => row.status === 'accepted').map(row => row.identity_bridge_key),
  canonical_index_conflicts: result.canonical_index_conflicts,
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
  schema_version: 'lake-cross-case-production-denominator-wave-08-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: {
    production_case_pair_denominator_present: false,
    production_identity_decision_registry_present: false,
    active_projection_cross_case_join_authorized: activeIdentity.scheme.cross_case_join_authorized,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false
  },
  extraction: {
    case_ids: result.case_ids,
    entity_registry_path: policy.entity_registry_path,
    pair_denominator_path: policy.pair_denominator_path,
    decision_registry_path: policy.decision_registry_path,
    decision_index_path: policy.decision_index_path,
    counts: result.counts,
    canonical_index_conflicts: result.canonical_index_conflicts
  },
  pair_denominator: result.pair_denominator,
  decisions: [
    {
      decision_key: 'W08-COMPLETE-CURRENT-CASE-PAIR-DENOMINATOR',
      judgment: 'every_current_native_case_pair_is_measured_under_the_same_identity_candidate_rules',
      action: `retain:${policy.pair_denominator_path}`,
      evidence_count: result.counts.case_pairs,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-EXECUTE-BOUNDED-PRODUCTION-IDENTITY-JUDGMENTS',
      judgment: 'same_canonical_identity_with_bilateral_public_custody_supports_a_graph_inert_identity_resolution_while_missing_or_conflicting_identity_remains_unresolved_or_rejected',
      action: `retain:${policy.decision_registry_path}`,
      evidence_count: result.counts.candidate_decisions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-PRESERVE-GRAPH-AND-AUTOMATIC-JOIN-GATES',
      judgment: 'production_identity_resolution_does_not_create_relationships_graph_edges_or_hops_and_does_not_enable_automatic_cross_case_joining',
      action: 'keep_all_graph_and_automatic_join_flags_false',
      evidence_count: result.counts.accepted_decisions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    current_native_case_pair_denominator_complete: true,
    current_candidate_decisions_executed: true,
    accepted_decisions_are_graph_inert: true,
    unresolved_and_rejected_candidates_preserved: true,
    independent_source_family_support_measured: true,
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

const report = `# Production cross-case identity denominator Wave 08\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Current denominator\n\n\`\`\`text\nnative cases:                              ${result.counts.native_cases}\ncase pairs:                                ${result.counts.case_pairs}\nentity occurrences:                       ${result.counts.entity_occurrences}\ncanonical-resolved occurrences:           ${result.counts.canonical_resolved_occurrences}\nunresolved occurrences:                   ${result.counts.unresolved_occurrences}\ncartesian entity pairs measured:           ${result.counts.cartesian_entity_pairs}\nnoncandidate pairs retained in denominator:${result.counts.noncandidate_pairs}\ncandidate decisions:                       ${result.counts.candidate_decisions}\naccepted graph-inert resolutions:          ${result.counts.accepted_decisions}\naccepted with independent source families: ${result.counts.accepted_independent_decisions}\naccepted with shared source family only:    ${result.counts.accepted_shared_source_family_decisions}\nunresolved candidates:                     ${result.counts.unresolved_decisions}\nrejected candidates:                       ${result.counts.rejected_decisions}\ncanonical index conflicts:                 ${result.counts.canonical_index_conflicts}\ndecisions requiring human permission:      0\n\`\`\`\n\n## Governing judgment\n\nThe current native-case lake is no longer represented by a handful of salient overlaps. Every case pair has a measured entity denominator. Exact canonical identity plus public custody on both case occurrences supports a bounded, graph-inert identity resolution; independent source families raise confidence but are not permission to think. Matching slugs, labels, or AXM tokens without canonical identity remain unresolved, and conflicting canonical identity or kind is rejected.\n\n## Boundary\n\nAn accepted identity bridge merges no records, creates no relationship, changes no claim, creates no graph edge or hop, and does not enable automatic cross-case joining. The denominator is complete only for the current case set and the declared extraction rules; it is not semantic lake completeness or evidence truth.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('production cross-case denominator Wave 08 built');
console.log(`  native cases / pairs: ${result.counts.native_cases} / ${result.counts.case_pairs}`);
console.log(`  entity occurrences: ${result.counts.entity_occurrences}`);
console.log(`  candidate decisions: ${result.counts.candidate_decisions}`);
console.log(`  accepted / unresolved / rejected: ${result.counts.accepted_decisions} / ${result.counts.unresolved_decisions} / ${result.counts.rejected_decisions}`);
console.log(`  accepted with independent source families: ${result.counts.accepted_independent_decisions}`);
console.log('  automatic, graph, and hop joins authorized: false');
