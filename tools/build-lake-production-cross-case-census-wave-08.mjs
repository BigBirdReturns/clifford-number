#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-production-cross-case-census-wave-08-policy.json';
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

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function combinations(values) {
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) out.push([values[i], values[j]]);
  }
  return out;
}

function pointerToken(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function validIdentityValue(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/\s{3,}/.test(trimmed)) return false;
  return true;
}

function collectReceiptMap(value, map = new Map()) {
  if (Array.isArray(value)) {
    for (const item of value) collectReceiptMap(item, map);
    return map;
  }
  if (!value || typeof value !== 'object') return map;
  if (typeof value.receipt_id === 'string' && value.receipt_id) {
    if (!map.has(value.receipt_id)) map.set(value.receipt_id, value);
  }
  for (const child of Object.values(value)) collectReceiptMap(child, map);
  return map;
}

function receiptHasCustody(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  return Boolean(
    receipt.content_sha256
    || receipt.path
    || receipt.url
    || receipt.source_url
    || receipt.archive?.ref
    || receipt.locator
    || receipt.locator_status
  );
}

function receiptIsPubliclyInspectable(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (receipt.locator_status === 'private_local_artifact') return false;
  return Boolean(
    /^https?:\/\//i.test(String(receipt.path ?? ''))
    || /^https?:\/\//i.test(String(receipt.url ?? ''))
    || /^https?:\/\//i.test(String(receipt.source_url ?? ''))
    || receipt.archive?.ref
  );
}

function extractIdentityOccurrences(caseMeta, caseData, identityKeys) {
  const receiptMap = collectReceiptMap(caseData);
  const raw = [];

  function walk(value, pointer, inherited = {}) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${pointer}/${index}`, inherited));
      return;
    }
    if (!value || typeof value !== 'object') return;

    const receiptIds = Array.isArray(value.receipt_ids)
      ? uniqueSorted(value.receipt_ids)
      : inherited.receipt_ids ?? [];
    const recordId = [value.claim_id, value.event_id, value.relation_id, value.record_id, inherited.record_id]
      .find(item => typeof item === 'string' && item.length > 0) ?? null;
    const label = [value.label, value.name, value.title, inherited.label]
      .find(item => typeof item === 'string' && item.length > 0) ?? null;
    const context = {
      receipt_ids: receiptIds,
      record_id: recordId,
      label,
      claim_status: value.claim_status ?? inherited.claim_status ?? null,
      evidence_class: value.evidence_class ?? inherited.evidence_class ?? null
    };

    for (const [key, child] of Object.entries(value)) {
      if (identityKeys.has(key) && validIdentityValue(child)) {
        const identityValue = child.trim();
        const normalized = identityValue.toLowerCase();
        const resolvedReceipts = receiptIds.map(id => receiptMap.get(id)).filter(Boolean);
        raw.push({
          schema_version: 'production-cross-case-identity-occurrence@1',
          occurrence_id: stableId('XCMENTION', [caseMeta.case_id, key, normalized, recordId ?? pointer]),
          case_id: caseMeta.case_id,
          case_title: caseMeta.title,
          identity_namespace: caseMeta.case_id,
          namespace_source: 'derived_from_case_id_not_declared_shared_namespace',
          identity_key: key,
          identity_value: identityValue,
          normalized_identity_value: normalized,
          label_hint: label,
          record_id: recordId,
          json_pointer: `${pointer}/${pointerToken(key)}`,
          receipt_ids: receiptIds,
          resolved_receipt_ids: uniqueSorted(resolvedReceipts.map(receipt => receipt.receipt_id)),
          receipt_reference_present: receiptIds.length > 0,
          source_custody_present: resolvedReceipts.some(receiptHasCustody),
          publicly_inspectable_custody_present: resolvedReceipts.some(receiptIsPubliclyInspectable),
          claim_status: context.claim_status,
          evidence_class: context.evidence_class
        });
      }
      walk(child, `${pointer}/${pointerToken(key)}`, context);
    }
  }

  walk(caseData, '');
  const deduped = new Map();
  for (const row of raw) {
    const key = [row.case_id, row.identity_key, row.normalized_identity_value, row.record_id ?? row.json_pointer].join('\0');
    if (!deduped.has(key)) {
      deduped.set(key, { ...row, json_pointers: [row.json_pointer] });
      delete deduped.get(key).json_pointer;
      continue;
    }
    const prior = deduped.get(key);
    prior.json_pointers = uniqueSorted([...prior.json_pointers, row.json_pointer]);
    prior.receipt_ids = uniqueSorted([...prior.receipt_ids, ...row.receipt_ids]);
    prior.resolved_receipt_ids = uniqueSorted([...prior.resolved_receipt_ids, ...row.resolved_receipt_ids]);
    prior.receipt_reference_present ||= row.receipt_reference_present;
    prior.source_custody_present ||= row.source_custody_present;
    prior.publicly_inspectable_custody_present ||= row.publicly_inspectable_custody_present;
  }
  return [...deduped.values()].sort((left, right) =>
    `${left.normalized_identity_value}\0${left.identity_key}\0${left.record_id ?? ''}`
      .localeCompare(`${right.normalized_identity_value}\0${right.identity_key}\0${right.record_id ?? ''}`));
}

const implementationPaths = [
  'tools/build-lake-production-cross-case-census-wave-08.mjs',
  'tools/reconcile-lake-production-cross-case-census-wave-08.mjs',
  'tools/validate-lake-production-cross-case-census-wave-08.mjs',
  'test/lake-production-cross-case-census-wave-08.test.js'
];
const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-production-cross-case-census-wave-08-policy@1');
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 08 input: ${relative}`);
}

const caseIndex = readJson('build/cases/index.json');
const cases = [...caseIndex.cases].sort((left, right) => left.case_id.localeCompare(right.case_id));
assert.equal(cases.length, policy.expected.native_cases, 'native case count drift');
for (const caseMeta of cases) {
  if (!fs.existsSync(full(caseMeta.href))) throw new Error(`missing compiled case: ${caseMeta.href}`);
}

const fingerprintPaths = [...new Set([
  policyPath,
  ...policy.input_paths,
  ...implementationPaths,
  ...cases.map(caseMeta => caseMeta.href)
])].sort();
const inputs = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const identityKeys = new Set(policy.identity_keys);
const occurrences = [];
for (const caseMeta of cases) {
  occurrences.push(...extractIdentityOccurrences(caseMeta, readJson(caseMeta.href), identityKeys));
}

const occurrencesByValue = new Map();
for (const row of occurrences) {
  if (!occurrencesByValue.has(row.normalized_identity_value)) occurrencesByValue.set(row.normalized_identity_value, []);
  occurrencesByValue.get(row.normalized_identity_value).push(row);
}

const wave07Decisions = readJsonl('data/project/lake-axm-cross-case-join-registry-wave-07.jsonl');
const productionAssertions = wave07Decisions.filter(row => row.row_type === 'join_assertion'
  && !String(row.left_case_id ?? '').startsWith('fixture-')
  && !String(row.right_case_id ?? '').startsWith('fixture-'));

const candidates = [];
for (const [normalizedIdentityValue, rows] of [...occurrencesByValue.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const caseIds = uniqueSorted(rows.map(row => row.case_id));
  if (caseIds.length < 2) continue;
  for (const [leftCaseId, rightCaseId] of combinations(caseIds)) {
    const leftMentions = rows.filter(row => row.case_id === leftCaseId);
    const rightMentions = rows.filter(row => row.case_id === rightCaseId);
    const matchedAssertion = productionAssertions.find(row => {
      const pair = [[row.left_case_id, row.right_case_id], [row.right_case_id, row.left_case_id]];
      return pair.some(([left, right]) => left === leftCaseId && right === rightCaseId)
        && (row.left_entity_key === normalizedIdentityValue || row.right_entity_key === normalizedIdentityValue);
    }) ?? null;
    const leftCustody = leftMentions.some(row => row.source_custody_present);
    const rightCustody = rightMentions.some(row => row.source_custody_present);
    const explicitAssertion = Boolean(matchedAssertion);
    const assertionCustody = Boolean(matchedAssertion?.assertion_custody?.length);
    const sharedNamespace = false;
    const unambiguousTokenOverlap = false;
    const blockers = [];
    if (!leftCustody) blockers.push('left_source_custody_absent');
    if (!rightCustody) blockers.push('right_source_custody_absent');
    if (!explicitAssertion) blockers.push('explicit_same_entity_assertion_absent');
    if (!assertionCustody) blockers.push('assertion_source_custody_absent');
    if (!sharedNamespace) blockers.push('shared_identity_namespace_absent');
    if (!unambiguousTokenOverlap) blockers.push('unambiguous_identity_token_overlap_absent');
    candidates.push({
      schema_version: 'production-cross-case-identity-candidate@1',
      candidate_id: stableId('XCCAND', [normalizedIdentityValue, leftCaseId, rightCaseId]),
      status: 'candidate_only',
      reason: 'wave_07_acceptance_conditions_not_met',
      normalized_identity_value: normalizedIdentityValue,
      observed_identity_values: uniqueSorted([...leftMentions, ...rightMentions].map(row => row.identity_value)),
      identity_keys: uniqueSorted([...leftMentions, ...rightMentions].map(row => row.identity_key)),
      left_case_id: leftCaseId,
      right_case_id: rightCaseId,
      left_identity_namespace: leftCaseId,
      right_identity_namespace: rightCaseId,
      left_occurrence_ids: leftMentions.map(row => row.occurrence_id).sort(),
      right_occurrence_ids: rightMentions.map(row => row.occurrence_id).sort(),
      left_source_custody_present: leftCustody,
      right_source_custody_present: rightCustody,
      left_publicly_inspectable_custody_present: leftMentions.some(row => row.publicly_inspectable_custody_present),
      right_publicly_inspectable_custody_present: rightMentions.some(row => row.publicly_inspectable_custody_present),
      explicit_same_entity_assertion_present: explicitAssertion,
      assertion_source_custody_present: assertionCustody,
      shared_identity_namespace_present: sharedNamespace,
      unambiguous_identity_token_overlap_present: unambiguousTokenOverlap,
      blocking_conditions: blockers,
      accepted_production_identity_bridge: false,
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      review_dependency: {
        required_to_decide: false,
        effect: 'new_evidence_may_supersede_this_candidate_but_missing_review_does_not_block_the_current_bounded_non_join_decision'
      },
      reversibility: {
        mode: 'append_preserving_supersession',
        correction_route: 'a_later_source_custodied_explicit_identity_assertion_may_supersede_this_candidate_without_deleting_the_denominator'
      },
      graph_effect: 'none'
    });
  }
}
candidates.sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.normalized_identity_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.normalized_identity_value}`));

const casePairs = combinations(cases.map(caseMeta => caseMeta.case_id)).map(([leftCaseId, rightCaseId]) => {
  const rows = candidates.filter(row => row.left_case_id === leftCaseId && row.right_case_id === rightCaseId);
  return {
    schema_version: 'production-cross-case-pair-denominator@1',
    case_pair_id: stableId('XCPAIR', [leftCaseId, rightCaseId]),
    left_case_id: leftCaseId,
    right_case_id: rightCaseId,
    exact_local_identifier_recurrences: rows.length,
    distinct_identity_values: uniqueSorted(rows.map(row => row.normalized_identity_value)).length,
    candidates_with_source_custody_on_both_sides: rows.filter(row => row.left_source_custody_present && row.right_source_custody_present).length,
    accepted_production_identity_bridges: 0,
    case_pair_measured: true,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}).sort((left, right) => left.case_pair_id.localeCompare(right.case_pair_id));
assert.equal(casePairs.length, policy.expected.case_pairs, 'case-pair denominator drift');
assert.ok(candidates.every(row => row.accepted_production_identity_bridge === false), 'Wave 08 may not accept a production bridge');

writeJsonl(policy.candidate_registry_path, candidates);
writeJsonl(policy.case_pair_denominator_path, casePairs);

const projection = {
  schema_version: 'axm-production-cross-case-candidate-index-wave-08@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  candidate_registry_path: policy.candidate_registry_path,
  case_pair_denominator_path: policy.case_pair_denominator_path,
  counts: {
    candidates: candidates.length,
    case_pairs: casePairs.length,
    accepted_production_identity_bridges: 0
  },
  candidates,
  case_pairs: casePairs,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  graph_effect: 'none'
};
writeJson(policy.candidate_projection_path, projection);

const crossCaseValues = [...occurrencesByValue.entries()].filter(([, rows]) => new Set(rows.map(row => row.case_id)).size >= 2).length;
const bothSidesCustodied = candidates.filter(row => row.left_source_custody_present && row.right_source_custody_present).length;
const receipt = {
  schema_version: 'lake-production-cross-case-census-wave-08@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  counts: {
    native_cases: cases.length,
    case_pairs: casePairs.length,
    identity_occurrences: occurrences.length,
    distinct_identity_values: occurrencesByValue.size,
    cross_case_identity_values: crossCaseValues,
    candidate_pair_rows: candidates.length,
    candidates_with_source_custody_on_both_sides: bothSidesCustodied,
    accepted_production_identity_bridges: 0
  },
  explicit_cross_case_identity_resolution_lane_available: true,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  active_projection_cross_case_join_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.census_receipt_path, receipt);

const plan = {
  schema_version: 'lake-production-cross-case-census-wave-08-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    native_case_pair_denominator_measured: false,
    production_candidate_registry_present: false,
    explicit_cross_case_identity_resolution_lane_available: true,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false
  },
  census: {
    cases: cases.map(caseMeta => ({ case_id: caseMeta.case_id, title: caseMeta.title, href: caseMeta.href })),
    identity_keys: [...identityKeys].sort(),
    identity_occurrences: occurrences,
    candidate_registry_path: policy.candidate_registry_path,
    case_pair_denominator_path: policy.case_pair_denominator_path,
    candidate_projection_path: policy.candidate_projection_path,
    counts: receipt.counts
  },
  decisions: [
    {
      decision_key: 'W08-PRODUCTION-DENOMINATOR',
      judgment: 'all_current_native_case_pairs_are_measured_for_exact_identity_like_local_identifier_recurrence',
      action: `retain:${policy.case_pair_denominator_path}`,
      evidence_count: casePairs.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-PRODUCTION-CANDIDATES',
      judgment: 'exact_local_identifier_recurrence_is_candidate_generation_not_identity_resolution',
      action: `retain:${policy.candidate_registry_path}`,
      evidence_count: candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W08-PRODUCTION-JOIN-GATE',
      judgment: 'no_current_production_candidate_satisfies_the_full_wave_07_acceptance_contract',
      action: 'keep_all_automatic_graph_and_hop_join_authorizations_false',
      evidence_count: candidates.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    native_case_pair_denominator_measured: true,
    production_candidate_registry_present: true,
    every_candidate_has_explicit_blocking_conditions: candidates.every(row => row.blocking_conditions.length > 0),
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# Production cross-case identity census Wave 08\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nnative cases:                               ${cases.length}\ncase-pair denominator rows:                 ${casePairs.length}\nidentity occurrences:                      ${occurrences.length}\ndistinct identity-like values:             ${occurrencesByValue.size}\ncross-case recurring identity-like values: ${crossCaseValues}\ncandidate pair rows:                       ${candidates.length}\ncandidates custodied on both sides:        ${bothSidesCustodied}\naccepted production identity bridges:      0\nautomatic cross-case join authorized:      false\ncross-case graph join authorized:          false\ncross-case hop creation authorized:        false\ndecisions requiring human permission:      0\n\`\`\`\n\n## Judgment\n\nExact local identifier recurrence across two case projections is useful for finding work, but it is not a same-entity finding. Every current recurrence remains a bounded candidate because the production corpus does not carry the complete Wave 07 combination of an explicit same-entity assertion, assertion custody, a declared shared identity namespace, and an unambiguous shared AXM token.\n\n## Boundary\n\nThis census creates no entity merge, relationship, graph edge, hop, allegation, or publication clearance. Missing review is not the blocker. The blockers are named evidence and identity-contract defects attached to each candidate.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('production cross-case identity census Wave 08 built');
console.log(`  native cases / case pairs: ${cases.length} / ${casePairs.length}`);
console.log(`  identity occurrences / distinct values: ${occurrences.length} / ${occurrencesByValue.size}`);
console.log(`  cross-case values / candidate pairs: ${crossCaseValues} / ${candidates.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
