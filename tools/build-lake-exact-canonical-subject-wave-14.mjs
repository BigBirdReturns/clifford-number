#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';
import {
  EXPLICIT_SUBJECT_RESOLUTION_BASIS,
  EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS,
  isResolvedSubjectIdentity,
  loadLocalCanonicalResolutionIndex
} from './lib/local-canonical-resolution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-exact-canonical-subject-wave-14-policy.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}
function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}
function manifest(paths) {
  return uniqueSorted(paths).map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
function manifestFingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function classifyUnresolved(localSubjectId, claims) {
  const local = String(localSubjectId);
  const text = `${local} ${claims.map(claim => `${claim.predicate ?? ''} ${claim.plain ?? ''}`).join(' ')}`.toLowerCase();
  if (/^(?:site|infra|geo)-/.test(local)) {
    return {
      classification: 'place_or_infrastructure_identifier',
      basis: 'subject_id_prefix',
      next_action: 'route_to_bounded_place_infrastructure_or_geography_registry_without_person_or_organization_join'
    };
  }
  if (/^case-/.test(local) || claims.every(claim => claim.claim_kind === 'expression')) {
    return {
      classification: 'case_or_analytic_identifier',
      basis: 'case_prefix_or_expression_only_claims',
      next_action: 'retain_as_nonidentity_case_or_analytic_subject'
    };
  }
  if (/^(?:p|org)-/.test(local)) {
    return {
      classification: 'actor_or_organization_candidate',
      basis: 'typed_local_subject_prefix',
      next_action: 'compare_against_canonical_and_candidate_registries_with_explicit_source_custody'
    };
  }
  if (/(?:program|contract|solicitation|order|award|agreement|vehicle|account|project|plan|request|gao-|fa\d|nato-|dod-|army-|navy-|air-force|space-force)/.test(text)) {
    return {
      classification: 'program_contract_or_record_identifier',
      basis: 'identifier_or_claim_semantics',
      next_action: 'route_to_program_contract_record_or_decision-object_registry_without_entity_join'
    };
  }
  if (/^[a-z][a-z0-9]+(?:-[a-z0-9]+){1,5}$/.test(local)) {
    return {
      classification: 'untyped_identity_or_named_object_candidate',
      basis: 'stable_kebab_identifier_without_canonical_exact_match',
      next_action: 'adjudicate_actor_organization_named_object_or_nonidentity_using_case_receipts_and_existing_candidate_ledgers'
    };
  }
  return {
    classification: 'unclassified_subject_identifier',
    basis: 'no_safe_type_rule_matched',
    next_action: 'retain_unresolved_and_acquire_type_or_identity_evidence'
  };
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-exact-canonical-subject-wave-14-policy@1');
const wave13 = readJson(policy.baseline.wave_13_projection_path);
assert.equal(wave13.counts.case_claim_subject_references, policy.baseline.claim_subject_references);
assert.equal(wave13.counts.resolved_case_claim_subject_references, policy.baseline.explicitly_resolved_references);
assert.equal(wave13.counts.unresolved_case_claim_subject_references, policy.baseline.unresolved_references);
assert.equal(wave13.counts.distinct_case_local_subjects, policy.baseline.distinct_case_local_subjects);

const resolutionIndex = loadLocalCanonicalResolutionIndex({ refresh: true });
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const briefingIndex = readJson('build/briefings/index.json');
const hopGraph = readJson('build/hop-graph.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const sourceClaimManifest = [];
const compiledClaims = [];
let sourceSubjectIdChanges = 0;
let sourceClaimTextChanges = 0;

for (const entry of caseIndex.cases) {
  const compiled = readJson(entry.href);
  const sourcePath = `cases/${entry.case_id}/claims.jsonl`;
  const sourceClaims = readJsonl(sourcePath);
  const sourceById = new Map(sourceClaims.map(claim => [claim.claim_id, claim]));
  assert.equal(compiled.claims.length, sourceClaims.length, `${entry.case_id}: source/compiled claim denominator drift`);
  for (const claim of compiled.claims) {
    const source = sourceById.get(claim.claim_id);
    assert.ok(source, `${entry.case_id}/${claim.claim_id}: source claim missing`);
    if (claim.subject_id !== source.subject_id) sourceSubjectIdChanges += 1;
    if (claim.plain !== source.plain) sourceClaimTextChanges += 1;
    assert.ok(claim.subject_identity, `${entry.case_id}/${claim.claim_id}: subject identity missing`);
    compiledClaims.push({ case_id: entry.case_id, case_title: compiled.title, claim, source });
  }
  const bytes = fs.readFileSync(full(sourcePath));
  sourceClaimManifest.push({ path: sourcePath, bytes: bytes.length, sha256: sha256(bytes) });
}

assert.equal(compiledClaims.length, policy.expected.claim_subject_references);
assert.equal(sourceSubjectIdChanges, policy.expected.source_subject_id_changes);
assert.equal(sourceClaimTextChanges, policy.expected.source_claim_text_changes);

const explicitClaims = compiledClaims.filter(item => item.claim.subject_identity.resolution_basis === EXPLICIT_SUBJECT_RESOLUTION_BASIS);
const exactClaims = compiledClaims.filter(item => item.claim.subject_identity.resolution_basis === EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS);
const unresolvedClaims = compiledClaims.filter(item => !isResolvedSubjectIdentity(item.claim.subject_identity));
assert.equal(explicitClaims.length, policy.expected.explicitly_resolved_references, 'explicit Wave 12 projection count drift');
assert.ok(exactClaims.length >= policy.expected.minimum_exact_canonical_references, 'no exact canonical subject references were resolved');
assert.equal(explicitClaims.length + exactClaims.length + unresolvedClaims.length, compiledClaims.length);

const catalogClaimByKey = new Map(publicCatalog.claims.map(claim => [claim.key, claim]));
const exactByCanonical = new Map();
for (const item of exactClaims) {
  const identity = item.claim.subject_identity;
  assert.equal(item.claim.subject_id, identity.local_subject_id);
  assert.equal(identity.local_subject_id, identity.canonical_subject_id, `${item.case_id}/${item.claim.claim_id}: exact canonical ID inequality`);
  assert.equal(identity.resolution_id, null, `${item.case_id}/${item.claim.claim_id}: exact match manufactured a decision ID`);
  assert.equal(identity.resolution_basis, EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS);
  assert.equal(identity.source_records_mutated, false);
  assert.equal(identity.source_records_merged, false);
  assert.equal(identity.relationship_created, false);
  assert.equal(identity.participation_created, false);
  assert.equal(identity.graph_effect, 'none');
  const canonical = resolutionIndex.canonical_by_id.get(identity.canonical_subject_id);
  assert.ok(canonical, `${identity.canonical_subject_id}: canonical record missing`);
  assert.equal(canonical.kind, identity.canonical_kind);
  const catalogClaim = catalogClaimByKey.get(`${item.case_id}::${item.claim.claim_id}`);
  assert.ok(catalogClaim, `${item.case_id}/${item.claim.claim_id}: catalog claim missing`);
  assert.equal(catalogClaim.canonical_subject_id, identity.canonical_subject_id);
  assert.equal(catalogClaim.subject_identity.resolution_basis, EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS);
  if (!exactByCanonical.has(identity.canonical_subject_id)) {
    exactByCanonical.set(identity.canonical_subject_id, {
      canonical_subject_id: identity.canonical_subject_id,
      canonical_kind: identity.canonical_kind,
      canonical_label: identity.canonical_label,
      canonical_aliases: identity.canonical_aliases,
      case_ids: [],
      local_subject_ids: [],
      claim_ids: [],
      catalog_claim_ids: []
    });
  }
  const row = exactByCanonical.get(identity.canonical_subject_id);
  row.case_ids.push(item.case_id);
  row.local_subject_ids.push(identity.local_subject_id);
  row.claim_ids.push(`${item.case_id}::${item.claim.claim_id}`);
  row.catalog_claim_ids.push(catalogClaim.key);
}

const exactSubjects = [...exactByCanonical.values()].map(row => ({
  ...row,
  case_ids: uniqueSorted(row.case_ids),
  local_subject_ids: uniqueSorted(row.local_subject_ids),
  claim_ids: uniqueSorted(row.claim_ids),
  catalog_claim_ids: uniqueSorted(row.catalog_claim_ids),
  exact_string_equality: true,
  explicit_case_resolution_used: false,
  normalized_name_match_used: false,
  alias_match_used: false,
  source_records_mutated: false,
  source_records_merged: false,
  relationship_created: false,
  participation_created: false,
  accepted_cross_case_identity_bridge: false,
  automatic_cross_case_join_authorized: false,
  graph_effect: 'none'
})).sort((left, right) => left.canonical_subject_id.localeCompare(right.canonical_subject_id));
assert.ok(exactSubjects.length >= policy.expected.minimum_exact_canonical_subjects);

const explicitExactEquality = [];
for (const item of explicitClaims) {
  const identity = item.claim.subject_identity;
  if (item.claim.subject_id !== identity.canonical_subject_id) continue;
  explicitExactEquality.push({
    case_id: item.case_id,
    claim_id: item.claim.claim_id,
    local_subject_id: item.claim.subject_id,
    canonical_subject_id: identity.canonical_subject_id,
    resolution_id: identity.resolution_id,
    precedence: 'explicit_case_resolution_retained',
    graph_effect: 'none'
  });
}

const unresolvedByKey = new Map();
for (const item of unresolvedClaims) {
  const key = `${item.case_id}\0${item.claim.subject_id}`;
  if (!unresolvedByKey.has(key)) unresolvedByKey.set(key, { case_id: item.case_id, case_title: item.case_title, local_subject_id: item.claim.subject_id, claims: [] });
  unresolvedByKey.get(key).claims.push(item.claim);
}
const unresolvedRows = [...unresolvedByKey.values()].map(item => {
  const classification = classifyUnresolved(item.local_subject_id, item.claims);
  return {
    schema_version: 'unresolved-subject-routing@1',
    unresolved_subject_id: stableId('UNRESOLVEDSUBJECT', [item.case_id, item.local_subject_id]),
    source_case_id: item.case_id,
    case_title: item.case_title,
    local_subject_id: item.local_subject_id,
    claim_ids: uniqueSorted(item.claims.map(claim => claim.claim_id)),
    claim_count: item.claims.length,
    predicates: uniqueSorted(item.claims.map(claim => claim.predicate)),
    classification: classification.classification,
    classification_basis: classification.basis,
    next_action: classification.next_action,
    exact_canonical_id_match: false,
    explicit_resolution_present: false,
    normalized_name_match_attempted: false,
    alias_match_attempted: false,
    fuzzy_match_attempted: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_an_explicit_case_scoped_resolution_or_superseding_routing_row_without_deleting_this_observation'
    },
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}).sort((left, right) => `${left.source_case_id}\0${left.local_subject_id}`.localeCompare(`${right.source_case_id}\0${right.local_subject_id}`));
writeJsonl(policy.unresolved_registry_path, unresolvedRows);

const classificationCounts = Object.fromEntries([...new Set(unresolvedRows.map(row => row.classification))]
  .sort()
  .map(classification => [classification, unresolvedRows.filter(row => row.classification === classification).length]));
const briefingManifests = briefingIndex.briefings.map(entry => readJson(`build/briefings/${entry.case_id}.json`));
const briefingClaims = briefingManifests.flatMap(manifest => (manifest.claim_ids ?? []).map(claimId => ({ case_id: manifest.case_id, claim_id: claimId, manifest })));
const briefingExactReferences = briefingClaims.filter(item => {
  const compiled = compiledClaims.find(row => row.case_id === item.case_id && row.claim.claim_id === item.claim_id);
  return compiled?.claim.subject_identity?.resolution_basis === EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS;
}).length;

const sourcePaths = [
  policyPath,
  ...policy.input_paths,
  ...sourceClaimManifest.map(row => row.path),
  'tools/build-lake-exact-canonical-subject-wave-14.mjs'
].filter(relative => fs.existsSync(full(relative)));
const inputManifest = manifest(sourcePaths);
const sourceFingerprint = manifestFingerprint(inputManifest);
const counts = {
  claim_subject_references: compiledClaims.length,
  explicit_resolution_references: explicitClaims.length,
  exact_canonical_id_references: exactClaims.length,
  exact_canonical_subjects: exactSubjects.length,
  unresolved_subject_references: unresolvedClaims.length,
  unresolved_distinct_subjects: unresolvedRows.length,
  explicit_exact_equality_references: explicitExactEquality.length,
  public_catalog_resolved_subject_references: publicCatalog.counts.resolved_subject_references,
  public_catalog_unresolved_subject_references: publicCatalog.counts.unresolved_subject_references,
  public_catalog_canonical_subjects: publicCatalog.counts.canonical_subjects,
  briefing_subject_references: briefingIndex.counts.subject_references,
  briefing_exact_canonical_references: briefingExactReferences,
  source_subject_id_changes: sourceSubjectIdChanges,
  source_claim_text_changes: sourceClaimTextChanges,
  accepted_cross_case_identity_bridges: 0,
  decisions_requiring_human_permission: 0
};
assert.equal(counts.public_catalog_resolved_subject_references, explicitClaims.length + exactClaims.length);
assert.equal(counts.public_catalog_unresolved_subject_references, unresolvedClaims.length);

const graphDigests = {
  participation_sha256: stableDigest(participation),
  active_claims_sha256: stableDigest(activeIdentity.claims),
  hop_edges_sha256: stableDigest(hopGraph.edges),
  rejected_hop_surfaces_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: stableDigest(hopGraph.rejected_hop_pairs)
};
const projection = {
  schema_version: 'exact-canonical-subject-projection-wave-14@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  source_claim_manifest: sourceClaimManifest,
  counts,
  unresolved_classification_counts: classificationCounts,
  exact_subjects: exactSubjects,
  explicit_exact_equality_references: explicitExactEquality,
  graph_digests: graphDigests,
  completion: {
    complete_wave13_subject_denominator_recomputed: compiledClaims.length === policy.baseline.claim_subject_references,
    explicit_wave12_resolutions_preserved: explicitClaims.length === policy.baseline.explicitly_resolved_references,
    exact_canonical_id_lane_executed: exactClaims.length > 0,
    exact_string_equality_only: exactSubjects.every(row => row.exact_string_equality && !row.normalized_name_match_used && !row.alias_match_used),
    unresolved_denominator_routed: unresolvedRows.length > 0 && unresolvedRows.every(row => row.next_action),
    source_subject_ids_preserved: sourceSubjectIdChanges === 0,
    source_claim_text_preserved: sourceClaimTextChanges === 0,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
const plan = {
  schema_version: 'exact-canonical-subject-wave-14-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  counts,
  actions: [
    {
      action_id: 'W14-ACT-EXACT-CANONICAL-ID',
      judgment: 'case_subject_ids_that_exactly_equal_existing_canonical_ids_may_receive_generated_canonical_metadata',
      consequence: 'retain_exact_identity_projection_with_source_subject_and_claim_text_unchanged',
      reversible: true,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      action_id: 'W14-ACT-ROUTE-REMAINDER',
      judgment: 'all_nonexact_remaining_subjects_require_typed_routing_not_guessing',
      consequence: 'retain_complete_unresolved_registry_with_named_next_action',
      reversible: true,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  boundaries: policy.boundaries
};
writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);
const report = `# Exact canonical subject Wave 14\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nclaim-subject references:              ${counts.claim_subject_references}\nexplicit Wave 12 references:           ${counts.explicit_resolution_references}\nexact canonical-ID references:         ${counts.exact_canonical_id_references}\nexact canonical subjects:              ${counts.exact_canonical_subjects}\nremaining unresolved references:       ${counts.unresolved_subject_references}\nremaining distinct unresolved subjects:${counts.unresolved_distinct_subjects}\nbriefing exact references:             ${counts.briefing_exact_canonical_references}\nsource subject/text changes:           0 / 0\nrelationship/participation/graph/hop:   0 / 0 / 0 / 0\nhuman-permission dependencies:         0\n\`\`\`\n\nExact byte equality with a canonical actor or organization ID now resolves generated subject metadata. Explicit case-scoped resolutions retain precedence. No normalized-name, alias, fuzzy, object-side, or contextual join was attempted. The remaining denominator is retained in a typed, reversible routing registry rather than discarded or deferred to an unspecified reviewer.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);
console.log('exact canonical subject Wave 14 built');
console.log(`  total / explicit / exact / unresolved references: ${compiledClaims.length} / ${explicitClaims.length} / ${exactClaims.length} / ${unresolvedClaims.length}`);
console.log(`  exact canonical subjects / unresolved distinct subjects: ${exactSubjects.length} / ${unresolvedRows.length}`);
console.log(`  unresolved classes: ${JSON.stringify(classificationCounts)}`);
console.log('  source mutation, relationship, participation, graph, hop, and human-permission effects: 0');
