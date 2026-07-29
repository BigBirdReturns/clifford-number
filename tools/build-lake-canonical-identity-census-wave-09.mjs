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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[’']/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

function labelVariants(label) {
  const raw = String(label ?? '').trim();
  if (!raw) return [];
  const values = new Set([raw]);
  for (const part of raw.split('/')) if (part.trim()) values.add(part.trim());
  const parenthetical = [...raw.matchAll(/\(([^)]+)\)/g)].map(match => match[1].trim()).filter(Boolean);
  for (const part of parenthetical) values.add(part);
  const withoutParenthetical = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutParenthetical) values.add(withoutParenthetical);
  return [...values];
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-canonical-identity-census-wave-09-policy@1');
const titleTokens = new Set(policy.controlled_normalization.edge_title_tokens);
const suffixTokens = new Set(policy.controlled_normalization.edge_suffix_tokens);

function controlledStem(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  const tokens = normalized.split(' ').filter(Boolean);
  while (tokens.length && titleTokens.has(tokens[0])) tokens.shift();
  while (tokens.length && suffixTokens.has(tokens[tokens.length - 1])) tokens.pop();
  const stem = tokens.join(' ');
  return stem.length >= policy.controlled_normalization.minimum_stem_characters ? stem : '';
}

function identifierShape(value) {
  const compact = String(value ?? '').replace(/[^\p{L}\p{N}]/gu, '');
  if (!compact) return 'empty';
  if (/^[0-9a-f]{12,}$/i.test(compact)) return 'opaque_hex_or_award_identifier';
  if (!/\p{L}/u.test(compact)) return 'opaque_numeric_identifier';
  return 'name_like';
}

const implementationPaths = [
  'tools/build-lake-canonical-identity-census-wave-09.mjs',
  'tools/reconcile-lake-canonical-identity-census-wave-09.mjs',
  'tools/validate-lake-canonical-identity-census-wave-09.mjs',
  'test/lake-canonical-identity-census-wave-09.test.js'
];
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 09 input: ${relative}`);
}

const wave08Plan = readJson('build/lake-actions/production-cross-case-census-wave-08.json');
const wave08Reconciliation = readJson('build/lake-actions/production-cross-case-census-wave-08-reconciliation.json');
assert.equal(wave08Plan.schema_version, 'lake-production-cross-case-census-wave-08-plan@1');
assert.equal(wave08Reconciliation.completion?.native_case_pair_denominator_measured, true);
assert.equal(wave08Reconciliation.after?.candidate_rows, 0, 'Wave 09 expects the exact-ID candidate frontier to be zero');
const occurrences = wave08Plan.census?.identity_occurrences ?? [];
assert.equal(occurrences.length, policy.expected.source_identity_occurrences, 'Wave 09 source occurrence count drift');

const actors = readJson('data/canonical/actors.json').actors ?? [];
const organizations = readJson('data/canonical/organizations.json').organizations ?? [];
const aliases = readJson('data/canonical/aliases.json').aliases ?? [];
const canonicalRecords = [
  ...actors.map(row => ({ ...row, canonical_kind: 'actor' })),
  ...organizations.map(row => ({ ...row, canonical_kind: 'organization' }))
].sort((left, right) => left.id.localeCompare(right.id));
const canonicalById = new Map(canonicalRecords.map(row => [row.id, row]));
for (const alias of aliases) {
  assert.ok(canonicalById.has(alias.canonical_id), `canonical alias ${alias.alias} references missing ${alias.canonical_id}`);
}

const exactTermIndex = new Map();
const stemIndex = new Map();
function addIndex(index, key, row) {
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  const signature = `${row.canonical_id}\0${row.term_origin}\0${row.term}`;
  if (!index.get(key).some(existing => `${existing.canonical_id}\0${existing.term_origin}\0${existing.term}` === signature)) {
    index.get(key).push(row);
  }
}

for (const record of canonicalRecords) {
  addIndex(exactTermIndex, normalizeText(record.id), {
    canonical_id: record.id,
    canonical_kind: record.canonical_kind,
    canonical_label: record.label,
    term: record.id,
    term_origin: 'canonical_id'
  });
  for (const variant of labelVariants(record.label)) {
    const row = {
      canonical_id: record.id,
      canonical_kind: record.canonical_kind,
      canonical_label: record.label,
      term: variant,
      term_origin: 'canonical_label'
    };
    addIndex(exactTermIndex, normalizeText(variant), row);
    addIndex(stemIndex, controlledStem(variant), row);
  }
  addIndex(stemIndex, controlledStem(record.id), {
    canonical_id: record.id,
    canonical_kind: record.canonical_kind,
    canonical_label: record.label,
    term: record.id,
    term_origin: 'canonical_id'
  });
}
for (const alias of aliases) {
  const record = canonicalById.get(alias.canonical_id);
  const row = {
    canonical_id: alias.canonical_id,
    canonical_kind: record.canonical_kind,
    canonical_label: record.label,
    term: alias.alias,
    term_origin: 'declared_alias'
  };
  addIndex(exactTermIndex, normalizeText(alias.alias), row);
  addIndex(stemIndex, controlledStem(alias.alias), row);
}
for (const values of exactTermIndex.values()) values.sort((a, b) => `${a.canonical_id}\0${a.term_origin}\0${a.term}`.localeCompare(`${b.canonical_id}\0${b.term_origin}\0${b.term}`));
for (const values of stemIndex.values()) values.sort((a, b) => `${a.canonical_id}\0${a.term_origin}\0${a.term}`.localeCompare(`${b.canonical_id}\0${b.term_origin}\0${b.term}`));

const occurrenceGroups = new Map();
for (const occurrence of occurrences) {
  const key = `${occurrence.case_id}\0${occurrence.normalized_identity_value}`;
  if (!occurrenceGroups.has(key)) occurrenceGroups.set(key, []);
  occurrenceGroups.get(key).push(occurrence);
}
assert.equal(occurrenceGroups.size, policy.expected.distinct_case_local_identity_values, 'Wave 09 distinct case-local identity count drift');

function uniqueCanonicalRows(rows) {
  const byId = new Map();
  for (const row of rows ?? []) {
    if (!byId.has(row.canonical_id)) byId.set(row.canonical_id, { ...row, matching_terms: [] });
    const target = byId.get(row.canonical_id);
    target.matching_terms.push({ term: row.term, term_origin: row.term_origin });
  }
  return [...byId.values()].map(row => ({
    ...row,
    matching_terms: row.matching_terms
      .sort((a, b) => `${a.term_origin}\0${a.term}`.localeCompare(`${b.term_origin}\0${b.term}`))
  })).sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
}

function classifyMention(identityValue) {
  const normalized = normalizeText(identityValue);
  const stem = controlledStem(identityValue);
  const shape = identifierShape(identityValue);
  if (canonicalById.has(identityValue)) {
    const record = canonicalById.get(identityValue);
    return {
      mapping_status: 'exact_canonical_id',
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: stem,
      canonical_candidates: [{
        canonical_id: record.id,
        canonical_kind: record.canonical_kind,
        canonical_label: record.label,
        matching_terms: [{ term: record.id, term_origin: 'canonical_id' }]
      }]
    };
  }
  if (shape !== 'name_like') {
    return {
      mapping_status: 'opaque_identifier',
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: '',
      canonical_candidates: []
    };
  }

  const exactRows = uniqueCanonicalRows(exactTermIndex.get(normalized) ?? []);
  if (exactRows.length === 1) {
    const origins = new Set(exactRows[0].matching_terms.map(row => row.term_origin));
    const status = origins.has('declared_alias')
      ? 'exact_declared_alias'
      : origins.has('canonical_label')
        ? 'exact_canonical_label'
        : 'normalized_canonical_id';
    return {
      mapping_status: status,
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: stem,
      canonical_candidates: exactRows
    };
  }
  if (exactRows.length > 1) {
    return {
      mapping_status: 'ambiguous_exact_term',
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: stem,
      canonical_candidates: exactRows
    };
  }

  const stemRows = uniqueCanonicalRows(stemIndex.get(stem) ?? []);
  if (stem && stemRows.length === 1) {
    return {
      mapping_status: 'controlled_stem_candidate',
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: stem,
      canonical_candidates: stemRows
    };
  }
  if (stem && stemRows.length > 1) {
    return {
      mapping_status: 'ambiguous_controlled_stem',
      identifier_shape: shape,
      normalized_term: normalized,
      controlled_stem: stem,
      canonical_candidates: stemRows
    };
  }
  return {
    mapping_status: 'uncovered_name_like_identifier',
    identifier_shape: shape,
    normalized_term: normalized,
    controlled_stem: stem,
    canonical_candidates: []
  };
}

const mentionRows = [];
for (const [groupKey, rows] of [...occurrenceGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const [caseId, normalizedIdentityValue] = groupKey.split('\0');
  const identityValues = uniqueSorted(rows.map(row => row.identity_value));
  assert.equal(identityValues.length, 1, `${groupKey}: normalized identity group contains multiple raw values`);
  const identityValue = identityValues[0];
  const classification = classifyMention(identityValue);
  const canonicalCandidateIds = classification.canonical_candidates.map(row => row.canonical_id);
  const blockers = [
    'explicit_same_entity_assertion_absent',
    'assertion_source_custody_absent',
    'shared_identity_namespace_absent',
    'unambiguous_axm_token_overlap_absent'
  ];
  if (classification.mapping_status.startsWith('ambiguous_')) blockers.push('canonical_mapping_ambiguous');
  if (classification.mapping_status === 'controlled_stem_candidate') blockers.push('controlled_normalization_is_not_identity_proof');
  if (classification.mapping_status === 'uncovered_name_like_identifier') blockers.push('canonical_registry_coverage_absent');
  if (classification.mapping_status === 'opaque_identifier') blockers.push('identifier_is_not_name_like');
  mentionRows.push({
    schema_version: 'canonical-identity-mention-classification@1',
    mention_id: stableId('CANMENTION', [caseId, normalizedIdentityValue]),
    case_id: caseId,
    case_title: rows[0].case_title,
    identity_value: identityValue,
    normalized_identity_value: normalizedIdentityValue,
    identity_keys: uniqueSorted(rows.map(row => row.identity_key)),
    occurrence_ids: rows.map(row => row.occurrence_id).sort(),
    record_ids: uniqueSorted(rows.map(row => row.record_id)),
    receipt_ids: uniqueSorted(rows.flatMap(row => row.receipt_ids)),
    source_custody_present: rows.some(row => row.source_custody_present),
    publicly_inspectable_custody_present: rows.some(row => row.publicly_inspectable_custody_present),
    claim_statuses: uniqueSorted(rows.map(row => row.claim_status)),
    evidence_classes: uniqueSorted(rows.map(row => row.evidence_class)),
    identifier_shape: classification.identifier_shape,
    normalized_term: classification.normalized_term,
    controlled_stem: classification.controlled_stem,
    mapping_status: classification.mapping_status,
    canonical_candidate_ids: canonicalCandidateIds,
    canonical_candidates: classification.canonical_candidates,
    canonical_mapping_resolved: false,
    accepted_production_identity_bridge: false,
    blocking_conditions: uniqueSorted(blockers),
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    review_dependency: {
      required_to_decide: false,
      effect: 'new_custodied_identity_evidence_may_supersede_this_classification_but_missing_review_does_not_block_the_current_bounded_candidate_or_rejection'
    },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'a_later_explicit_source_custodied_identity_assertion_may_supersede_this_row_without_deleting_the_original_case_local_value'
    },
    graph_effect: 'none'
  });
}
mentionRows.sort((left, right) => `${left.case_id}\0${left.normalized_identity_value}`.localeCompare(`${right.case_id}\0${right.normalized_identity_value}`));
assert.equal(mentionRows.length, policy.expected.distinct_case_local_identity_values);

const candidateRows = [];
const candidateKeys = new Set();
function addCandidate(row) {
  const key = `${row.basis_class}\0${row.basis_value}\0${row.left_case_id}\0${row.right_case_id}`;
  if (candidateKeys.has(key)) return;
  candidateKeys.add(key);
  candidateRows.push(row);
}

const canonicalGroups = new Map();
for (const mention of mentionRows) {
  if (mention.canonical_candidate_ids.length !== 1 || mention.mapping_status.startsWith('ambiguous_')) continue;
  const canonicalId = mention.canonical_candidate_ids[0];
  if (!canonicalGroups.has(canonicalId)) canonicalGroups.set(canonicalId, []);
  canonicalGroups.get(canonicalId).push(mention);
}
for (const [canonicalId, mentions] of [...canonicalGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const caseIds = uniqueSorted(mentions.map(row => row.case_id));
  if (caseIds.length < 2) continue;
  for (const [leftCaseId, rightCaseId] of combinations(caseIds)) {
    const leftMentions = mentions.filter(row => row.case_id === leftCaseId);
    const rightMentions = mentions.filter(row => row.case_id === rightCaseId);
    addCandidate({
      schema_version: 'canonical-cross-case-identity-candidate@1',
      candidate_id: stableId('CANCROSS', ['canonical', canonicalId, leftCaseId, rightCaseId]),
      status: 'candidate_only',
      basis_class: 'shared_canonical_registry_candidate',
      basis_value: canonicalId,
      canonical_candidate_id: canonicalId,
      canonical_label: canonicalById.get(canonicalId)?.label ?? null,
      left_case_id: leftCaseId,
      right_case_id: rightCaseId,
      left_mention_ids: leftMentions.map(row => row.mention_id).sort(),
      right_mention_ids: rightMentions.map(row => row.mention_id).sort(),
      mapping_statuses: uniqueSorted([...leftMentions, ...rightMentions].map(row => row.mapping_status)),
      source_custody_on_both_sides: leftMentions.some(row => row.source_custody_present) && rightMentions.some(row => row.source_custody_present),
      publicly_inspectable_custody_on_both_sides: leftMentions.some(row => row.publicly_inspectable_custody_present)
        && rightMentions.some(row => row.publicly_inspectable_custody_present),
      accepted_production_identity_bridge: false,
      blocking_conditions: [
        'canonical_registry_candidate_is_not_identity_proof',
        'explicit_same_entity_assertion_absent',
        'assertion_source_custody_absent',
        'shared_identity_namespace_absent',
        'unambiguous_axm_token_overlap_absent'
      ],
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      review_dependency: { required_to_decide: false },
      reversibility: { mode: 'append_preserving_supersession' },
      graph_effect: 'none'
    });
  }
}

const uncoveredStemGroups = new Map();
for (const mention of mentionRows) {
  if (mention.mapping_status !== 'uncovered_name_like_identifier' || !mention.controlled_stem) continue;
  if (!uncoveredStemGroups.has(mention.controlled_stem)) uncoveredStemGroups.set(mention.controlled_stem, []);
  uncoveredStemGroups.get(mention.controlled_stem).push(mention);
}
for (const [stem, mentions] of [...uncoveredStemGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const caseIds = uniqueSorted(mentions.map(row => row.case_id));
  if (caseIds.length < 2) continue;
  for (const [leftCaseId, rightCaseId] of combinations(caseIds)) {
    const leftMentions = mentions.filter(row => row.case_id === leftCaseId);
    const rightMentions = mentions.filter(row => row.case_id === rightCaseId);
    addCandidate({
      schema_version: 'canonical-cross-case-identity-candidate@1',
      candidate_id: stableId('CANCROSS', ['uncovered-stem', stem, leftCaseId, rightCaseId]),
      status: 'candidate_only',
      basis_class: 'shared_uncovered_controlled_stem',
      basis_value: stem,
      canonical_candidate_id: null,
      canonical_label: null,
      left_case_id: leftCaseId,
      right_case_id: rightCaseId,
      left_mention_ids: leftMentions.map(row => row.mention_id).sort(),
      right_mention_ids: rightMentions.map(row => row.mention_id).sort(),
      mapping_statuses: ['uncovered_name_like_identifier'],
      source_custody_on_both_sides: leftMentions.some(row => row.source_custody_present) && rightMentions.some(row => row.source_custody_present),
      publicly_inspectable_custody_on_both_sides: leftMentions.some(row => row.publicly_inspectable_custody_present)
        && rightMentions.some(row => row.publicly_inspectable_custody_present),
      accepted_production_identity_bridge: false,
      blocking_conditions: [
        'controlled_stem_match_is_not_identity_proof',
        'canonical_registry_coverage_absent',
        'explicit_same_entity_assertion_absent',
        'assertion_source_custody_absent',
        'shared_identity_namespace_absent',
        'unambiguous_axm_token_overlap_absent'
      ],
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      review_dependency: { required_to_decide: false },
      reversibility: { mode: 'append_preserving_supersession' },
      graph_effect: 'none'
    });
  }
}
candidateRows.sort((left, right) => `${left.left_case_id}\0${left.right_case_id}\0${left.basis_class}\0${left.basis_value}`
  .localeCompare(`${right.left_case_id}\0${right.right_case_id}\0${right.basis_class}\0${right.basis_value}`));
assert.ok(candidateRows.every(row => row.accepted_production_identity_bridge === false));

const statusCounts = {};
for (const mention of mentionRows) statusCounts[mention.mapping_status] = (statusCounts[mention.mapping_status] ?? 0) + 1;
const canonicalCandidateIds = uniqueSorted(mentionRows.flatMap(row => row.canonical_candidate_ids));
const canonicalRecordsUnmentioned = canonicalRecords.filter(row => !canonicalCandidateIds.includes(row.id)).map(row => row.id);
const ambiguousMentions = mentionRows.filter(row => row.mapping_status.startsWith('ambiguous_')).length;
const uncoveredMentions = mentionRows.filter(row => row.mapping_status === 'uncovered_name_like_identifier').length;
const opaqueMentions = mentionRows.filter(row => row.mapping_status === 'opaque_identifier').length;
const controlledStemMentions = mentionRows.filter(row => row.mapping_status === 'controlled_stem_candidate').length;
const exactRegistryMentions = mentionRows.filter(row => ['exact_canonical_id', 'exact_declared_alias', 'exact_canonical_label', 'normalized_canonical_id'].includes(row.mapping_status)).length;
const bothSidesCustodiedCandidates = candidateRows.filter(row => row.source_custody_on_both_sides).length;

const fingerprintPaths = [...new Set([policyPath, ...policy.input_paths, ...implementationPaths])].sort();
const inputs = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

writeJsonl(policy.mention_registry_path, mentionRows);
writeJsonl(policy.candidate_registry_path, candidateRows);

const projection = {
  schema_version: 'axm-canonical-identity-candidate-index-wave-09@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  mention_registry_path: policy.mention_registry_path,
  candidate_registry_path: policy.candidate_registry_path,
  counts: {
    mentions: mentionRows.length,
    cross_case_candidates: candidateRows.length,
    accepted_production_identity_bridges: 0
  },
  mentions: mentionRows,
  cross_case_candidates: candidateRows,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  graph_effect: 'none'
};
writeJson(policy.candidate_projection_path, projection);

const receipt = {
  schema_version: 'lake-canonical-identity-census-wave-09@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  counts: {
    native_cases: wave08Plan.census.cases.length,
    source_identity_occurrences: occurrences.length,
    distinct_case_local_identity_values: mentionRows.length,
    canonical_actor_records: actors.length,
    canonical_organization_records: organizations.length,
    declared_alias_records: aliases.length,
    exact_registry_mentions: exactRegistryMentions,
    controlled_stem_candidate_mentions: controlledStemMentions,
    ambiguous_mentions: ambiguousMentions,
    uncovered_name_like_mentions: uncoveredMentions,
    opaque_identifier_mentions: opaqueMentions,
    canonical_candidate_ids_referenced: canonicalCandidateIds.length,
    canonical_records_unmentioned: canonicalRecordsUnmentioned.length,
    cross_case_candidate_rows: candidateRows.length,
    candidates_with_source_custody_on_both_sides: bothSidesCustodiedCandidates,
    accepted_production_identity_bridges: 0
  },
  mapping_status_counts: Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => left.localeCompare(right))),
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
  schema_version: 'lake-canonical-identity-census-wave-09-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    exact_cross_case_local_identifier_values: wave08Reconciliation.after.candidate_rows,
    canonical_identity_mentions_classified: false,
    canonical_cross_case_candidates_measured: false,
    accepted_production_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false
  },
  canonical_registry: {
    actors: actors.length,
    organizations: organizations.length,
    aliases: aliases.length,
    canonical_ids: canonicalRecords.length,
    canonical_records_unmentioned: canonicalRecordsUnmentioned
  },
  classification: {
    status_counts: receipt.mapping_status_counts,
    mention_registry_path: policy.mention_registry_path,
    candidate_registry_path: policy.candidate_registry_path,
    candidate_projection_path: policy.candidate_projection_path
  },
  decisions: [
    {
      decision_key: 'W09-CANONICAL-COVERAGE',
      judgment: 'every_distinct_production_case_local_identity_value_has_an_explicit_canonical_mapping_class',
      action: `retain:${policy.mention_registry_path}`,
      evidence_count: mentionRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-CONTROLLED-NORMALIZATION',
      judgment: 'controlled_suffix_stripping_may_generate_candidates_but_never_identity_findings',
      action: 'retain_exact_controlled_ambiguous_uncovered_and_opaque_classes_separately',
      evidence_count: controlledStemMentions + ambiguousMentions + uncoveredMentions,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W09-CROSS-CASE-CANDIDATES',
      judgment: 'shared_canonical_candidates_or_uncovered_stems_remain_graph_inert_until_the_full_wave_07_contract_is_satisfied',
      action: `retain:${policy.candidate_registry_path}`,
      evidence_count: candidateRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_case_local_identity_value_classified: mentionRows.length === policy.expected.distinct_case_local_identity_values,
    ambiguous_and_uncovered_mentions_preserved: true,
    cross_case_candidate_denominator_measured: true,
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

const report = `# Canonical identity census Wave 09\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nnative cases:                              ${wave08Plan.census.cases.length}\nsource identity occurrences:              ${occurrences.length}\ndistinct case-local identity values:      ${mentionRows.length}\ncanonical actors / organizations:         ${actors.length} / ${organizations.length}\ndeclared aliases:                         ${aliases.length}\nexact registry mentions:                  ${exactRegistryMentions}\ncontrolled-stem candidate mentions:       ${controlledStemMentions}\nambiguous mentions:                       ${ambiguousMentions}\nuncovered name-like mentions:             ${uncoveredMentions}\nopaque identifier mentions:               ${opaqueMentions}\ncanonical IDs referenced:                 ${canonicalCandidateIds.length}\ncross-case candidate rows:                ${candidateRows.length}\ncandidates custodied on both sides:       ${bothSidesCustodiedCandidates}\naccepted production identity bridges:     0\nautomatic cross-case join authorized:     false\ncross-case graph join authorized:         false\ncross-case hop creation authorized:       false\ndecisions requiring human permission:     0\n\`\`\`\n\n## Judgment\n\nEvery production case-local identity value now has a checked mapping class. Exact canonical IDs, exact labels, and declared aliases establish registry coverage only. Controlled suffix stripping generates candidate work. Ambiguity is rejected, and uncovered names remain explicit acquisition targets. None of these classes is a same-entity finding.\n\n## Boundary\n\nNo mapping row merges entities, creates a relationship, enters the graph, or creates a hop. A production bridge still requires the full Wave 07 assertion, custody, namespace, and unambiguous AXM-token contract.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('canonical identity census Wave 09 built');
console.log(`  mentions classified: ${mentionRows.length}`);
console.log(`  exact / controlled / ambiguous / uncovered / opaque: ${exactRegistryMentions} / ${controlledStemMentions} / ${ambiguousMentions} / ${uncoveredMentions} / ${opaqueMentions}`);
console.log(`  cross-case candidates: ${candidateRows.length}`);
console.log('  accepted production identity bridges: 0');
console.log('  automatic, graph, and hop joins authorized: false');
