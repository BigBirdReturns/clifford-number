#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-unresolved-subject-adjudication-wave-15-policy.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
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

function dispositionKey(sourceCaseId, localSubjectId) {
  return `${sourceCaseId}\0${localSubjectId}`;
}

function inputManifest(paths) {
  return uniqueSorted(paths).map(relative => {
    const bytes = fs.readFileSync(full(relative));
    return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
  });
}

function fingerprint(rows) {
  return sha256(Buffer.from(rows.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-unresolved-subject-adjudication-wave-15-policy@1');
assert.equal(policy.decision_law.review_required_to_decide, false);
assert.equal(policy.decision_law.missing_reviewer_blocks_adjudication, false);

const implementationPaths = [
  'tools/build-lake-unresolved-subject-adjudication-wave-15.mjs',
  'tools/apply-lake-unresolved-subject-adjudication-wave-15.mjs',
  'tools/reconcile-lake-unresolved-subject-adjudication-wave-15.mjs',
  'tools/validate-lake-unresolved-subject-adjudication-wave-15.mjs',
  'test/lake-unresolved-subject-adjudication-wave-15.test.js'
];
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  assert.ok(fs.existsSync(full(relative)), `missing Wave 15 input: ${relative}`);
}

const wave14Receipt = readJson(policy.baseline.wave_14_receipt_path);
const unresolvedRows = readJsonl(policy.baseline.unresolved_registry_path);
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const participation = readJsonl('data/ledger/participation.jsonl');
const activeIdentity = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(wave14Receipt.counts.unresolved_subject_references, policy.baseline.unresolved_subject_references);
assert.equal(wave14Receipt.counts.unresolved_distinct_subjects, policy.baseline.unresolved_distinct_subjects);
assert.equal(unresolvedRows.length, policy.expected.subject_rows, 'Wave 15 unresolved denominator drift');
assert.equal(unresolvedRows.reduce((total, row) => total + row.claim_count, 0), policy.expected.claim_references, 'Wave 15 claim-reference denominator drift');

const claimsByCase = new Map();
for (const relative of policy.input_paths.filter(item => /^cases\/[^/]+\/claims\.jsonl$/.test(item))) {
  const sourceCaseId = relative.split('/')[1];
  const rows = readJsonl(relative);
  claimsByCase.set(sourceCaseId, new Map(rows.map(row => [row.claim_id, row])));
}

const canonicalByKey = new Map([
  ...actors.map(row => [`actor:${row.id}`, row]),
  ...organizations.map(row => [`organization:${row.id}`, row])
]);
assert.equal(canonicalByKey.size, actors.length + organizations.length, 'canonical actor/organization ID collision');

const dispositionByKey = new Map();
function addDisposition(kind, spec) {
  const key = dispositionKey(spec.source_case_id, spec.local_subject_id);
  assert.ok(!dispositionByKey.has(key), `${key}: duplicate Wave 15 disposition`);
  dispositionByKey.set(key, { kind, ...spec });
}
for (const spec of policy.identity_existing_provenance) addDisposition('identity_existing_provenance', spec);
for (const spec of policy.identity_existing_controlled) addDisposition('identity_existing_controlled', spec);
for (const spec of policy.identity_new_canonical_plans) addDisposition('identity_new_canonical_plan', spec);
for (const spec of policy.nonidentity_objects) addDisposition('bounded_nonidentity_object', spec);
assert.equal(dispositionByKey.size, policy.expected.subject_rows, 'Wave 15 policy disposition denominator drift');

const baselineKeySet = new Set(unresolvedRows.map(row => dispositionKey(row.source_case_id, row.local_subject_id)));
assert.equal(baselineKeySet.size, unresolvedRows.length, 'duplicate Wave 14 unresolved case/subject key');
assert.deepEqual([...dispositionByKey.keys()].sort(), [...baselineKeySet].sort(), 'Wave 15 dispositions do not exactly cover Wave 14 unresolved rows');

function claimsFor(row) {
  const caseClaims = claimsByCase.get(row.source_case_id);
  assert.ok(caseClaims, `${row.source_case_id}: claim source missing`);
  return row.claim_ids.map(claimId => {
    const claim = caseClaims.get(claimId);
    assert.ok(claim, `${row.source_case_id}/${claimId}: claim missing`);
    assert.equal(claim.subject_id, row.local_subject_id, `${row.source_case_id}/${claimId}: subject drift`);
    return claim;
  });
}

const decisions = [];
for (const unresolved of unresolvedRows) {
  const disposition = dispositionByKey.get(dispositionKey(unresolved.source_case_id, unresolved.local_subject_id));
  assert.ok(disposition, `${unresolved.unresolved_subject_id}: disposition missing`);
  const claims = claimsFor(unresolved);
  assert.equal(claims.length, unresolved.claim_count, `${unresolved.unresolved_subject_id}: claim count drift`);
  const receiptIds = uniqueSorted(claims.flatMap(claim => claim.receipt_ids ?? []));
  const predicates = uniqueSorted(claims.map(claim => claim.predicate));
  const claimStates = uniqueSorted(claims.map(claim => claim.claim_status));
  const evidenceStates = uniqueSorted(claims.map(claim => claim.evidence_state));
  const evidenceClasses = uniqueSorted(claims.map(claim => claim.evidence_class));
  const requiredReceipts = uniqueSorted(disposition.required_receipt_ids ?? []);
  for (const receiptId of requiredReceipts) {
    assert.ok(receiptIds.includes(receiptId), `${unresolved.unresolved_subject_id}: required receipt ${receiptId} absent from source claims`);
  }

  let canonicalRecord = null;
  let canonicalTarget = null;
  let subjectObjectId = null;
  let evidenceBasis;
  let counterevidence;
  let uncertainty;
  let nextAction;

  if (disposition.kind === 'identity_existing_provenance') {
    canonicalRecord = canonicalByKey.get(`${disposition.canonical_kind}:${disposition.canonical_id}`);
    assert.ok(canonicalRecord, `${unresolved.unresolved_subject_id}: provenance-backed canonical record missing`);
    const unresolvedDigest = unresolved.unresolved_subject_id.replace(/^UNRESOLVEDSUBJECT-/, '');
    assert.equal(canonicalRecord.source_routing_id, `SUBJROUTE-${unresolvedDigest}`, `${unresolved.unresolved_subject_id}: canonical source-routing provenance mismatch`);
    assert.equal(canonicalRecord.source_case_id, unresolved.source_case_id, `${unresolved.unresolved_subject_id}: canonical source-case provenance mismatch`);
    canonicalTarget = {
      canonical_id: disposition.canonical_id,
      canonical_kind: disposition.canonical_kind,
      canonical_label: canonicalRecord.label,
      canonical_status: canonicalRecord.canonical_status ?? null,
      source_routing_id: canonicalRecord.source_routing_id,
      receipt_ids: uniqueSorted(canonicalRecord.receipt_ids ?? [])
    };
    evidenceBasis = [
      'the existing canonical record explicitly preserves the matching Wave 11 source-routing provenance',
      'the canonical record and unresolved row share the same source case',
      'the underlying claim and receipt custody remains attached'
    ];
    counterevidence = ['the local subject ID did not exactly equal the canonical ID and therefore remained unresolved in Wave 14'];
    uncertainty = ['this decision resolves local identity only; it does not validate every attached claim'];
    nextAction = 'integrate_graph_inert_local_to_canonical_resolution_without_rewriting_source_claims';
  } else if (disposition.kind === 'identity_existing_controlled') {
    canonicalRecord = canonicalByKey.get(`${disposition.canonical_kind}:${disposition.canonical_id}`);
    assert.ok(canonicalRecord, `${unresolved.unresolved_subject_id}: controlled canonical record missing`);
    canonicalTarget = {
      canonical_id: disposition.canonical_id,
      canonical_kind: disposition.canonical_kind,
      canonical_label: canonicalRecord.label,
      canonical_status: canonicalRecord.canonical_status ?? null,
      source_routing_id: canonicalRecord.source_routing_id ?? null,
      receipt_ids: uniqueSorted(canonicalRecord.receipt_ids ?? [])
    };
    evidenceBasis = [disposition.same_entity_basis, `required source receipts present: ${requiredReceipts.join(', ')}`];
    counterevidence = ['this is a named controlled mapping, not authorization for normalized-name or alias matching elsewhere'];
    uncertainty = ['the mapping establishes identity for this case-local subject only'];
    nextAction = 'integrate_named_graph_inert_local_to_canonical_resolution';
  } else if (disposition.kind === 'identity_new_canonical_plan') {
    assert.ok(!canonicalByKey.has(`${disposition.canonical_kind}:${disposition.canonical_id}`), `${unresolved.unresolved_subject_id}: planned canonical ID already exists`);
    canonicalTarget = {
      canonical_id: disposition.canonical_id,
      canonical_kind: disposition.canonical_kind,
      canonical_label: disposition.canonical_label,
      planned_kind: disposition.planned_kind,
      required_receipt_ids: requiredReceipts
    };
    evidenceBasis = [`source claims carry every required receipt: ${requiredReceipts.join(', ')}`, 'the subject is explicitly named in the source claim'];
    counterevidence = ['no canonical record exists yet'];
    uncertainty = ['canonical mutation is deferred to the next integration wave'];
    nextAction = 'materialize_bounded_canonical_record_then_attach_graph_inert_case_resolution';
  } else {
    assert.equal(disposition.kind, 'bounded_nonidentity_object');
    assert.ok(disposition.object_kind, `${unresolved.unresolved_subject_id}: nonidentity object kind missing`);
    subjectObjectId = stableId('SUBJECTOBJECT', [unresolved.source_case_id, unresolved.local_subject_id, disposition.object_kind]);
    evidenceBasis = ['the case-local identifier and attached predicates describe a bounded nonidentity object', `typed object kind: ${disposition.object_kind}`];
    counterevidence = ['the row has no accepted actor or organization identity decision'];
    uncertainty = ['object-specific ontology and projection integration remains a separate operation'];
    nextAction = 'integrate_into_typed_subject_object_registry_without_actor_or_organization_join';
  }

  const adjudicationId = stableId('SUBJDEC', [
    unresolved.unresolved_subject_id,
    disposition.kind,
    disposition.canonical_id ?? '',
    disposition.object_kind ?? ''
  ]);

  decisions.push({
    schema_version: 'unresolved-subject-adjudication@1',
    adjudication_id: adjudicationId,
    unresolved_subject_id: unresolved.unresolved_subject_id,
    source_case_id: unresolved.source_case_id,
    case_title: unresolved.case_title,
    local_subject_id: unresolved.local_subject_id,
    source_claim_ids: uniqueSorted(unresolved.claim_ids),
    claim_count: unresolved.claim_count,
    predicates,
    receipt_ids: receiptIds,
    claim_statuses: claimStates,
    evidence_states: evidenceStates,
    evidence_classes: evidenceClasses,
    disposition: disposition.kind,
    canonical_target: canonicalTarget,
    subject_object_id: subjectObjectId,
    object_kind: disposition.object_kind ?? null,
    evidence_basis: evidenceBasis,
    counterevidence,
    uncertainty,
    next_action: nextAction,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_wave_15_adjudication_or_wave_16_integration_record_without_deleting_this_decision'
    },
    canonical_mutation_applied: false,
    case_projection_applied: false,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    graph_effect: 'none'
  });
}

decisions.sort((left, right) => left.adjudication_id.localeCompare(right.adjudication_id));
const identityDecisions = decisions.filter(row => row.disposition !== 'bounded_nonidentity_object');
const nonidentityDecisions = decisions.filter(row => row.disposition === 'bounded_nonidentity_object');
const provenanceDecisions = decisions.filter(row => row.disposition === 'identity_existing_provenance');
const controlledDecisions = decisions.filter(row => row.disposition === 'identity_existing_controlled');
const plannedDecisions = decisions.filter(row => row.disposition === 'identity_new_canonical_plan');

const counts = {
  subject_rows: decisions.length,
  claim_references: decisions.reduce((total, row) => total + row.claim_count, 0),
  existing_provenance_identity_decisions: provenanceDecisions.length,
  existing_controlled_identity_decisions: controlledDecisions.length,
  planned_new_canonical_records: plannedDecisions.length,
  identity_decisions: identityDecisions.length,
  nonidentity_object_decisions: nonidentityDecisions.length,
  generic_unadjudicated_rows: 0,
  canonical_mutations_applied: 0,
  case_projection_changes: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0,
  accepted_cross_case_identity_bridges: 0,
  decisions_requiring_human_permission: 0
};
for (const [field, expected] of Object.entries(policy.expected)) {
  if (field.endsWith('_source_projection_and_index_observed')) continue;
  assert.equal(counts[field], expected, `Wave 15 count ${field} drift`);
}

const manifest = inputManifest([...policy.input_paths, ...implementationPaths, policyPath]);
const sourceFingerprint = fingerprint(manifest);
const graphDigests = {
  participation_sha256: stableDigest(participation),
  active_claims_sha256: stableDigest(activeIdentity.claims),
  hop_edges_sha256: stableDigest(hopGraph.edges),
  rejected_hop_surfaces_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
  rejected_hop_pairs_sha256: stableDigest(hopGraph.rejected_hop_pairs)
};

const projection = {
  schema_version: 'unresolved-subject-adjudication-wave-15@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: manifest,
  counts,
  graph_digests: graphDigests,
  decisions,
  identity_decisions: identityDecisions,
  nonidentity_objects: nonidentityDecisions,
  completion: {
    complete_wave_14_unresolved_denominator_recomputed: true,
    every_row_received_exactly_one_disposition: true,
    provenance_backed_identity_decisions_complete: true,
    controlled_identity_decisions_complete: true,
    new_canonical_plans_complete: true,
    nonidentity_object_typing_complete: true,
    generic_unadjudicated_rows: 0,
    canonical_mutations_applied: 0,
    case_projection_changes: 0,
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
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
  schema_version: 'unresolved-subject-adjudication-wave-15-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  counts,
  integration_frontier: {
    existing_identity_resolutions_to_integrate: provenanceDecisions.length + controlledDecisions.length,
    new_canonical_records_to_materialize: plannedDecisions.length,
    typed_nonidentity_objects_to_integrate: nonidentityDecisions.length,
    generic_wait_states: 0,
    next_wave: 'lake-subject-integration-wave-16'
  },
  mutation_boundaries: {
    canonical_mutation_authorized_in_wave_15: false,
    case_projection_authorized_in_wave_15: false,
    graph_or_hop_effect_authorized: false
  },
  graph_effect: 'none'
};

const report = `# Unresolved subject adjudication — Wave 15\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nsubject rows:                               ${counts.subject_rows}\nclaim references:                          ${counts.claim_references}\nexisting provenance identity decisions:    ${counts.existing_provenance_identity_decisions}\nexisting controlled identity decisions:    ${counts.existing_controlled_identity_decisions}\nplanned new canonical records:              ${counts.planned_new_canonical_records}\nidentity decisions:                         ${counts.identity_decisions}\nnonidentity object decisions:               ${counts.nonidentity_object_decisions}\ngeneric unadjudicated rows:                 ${counts.generic_unadjudicated_rows}\ncanonical mutations applied:                ${counts.canonical_mutations_applied}\ncase projection changes:                    ${counts.case_projection_changes}\nparticipation / active claim / graph delta:  0 / 0 / 0\naccepted cross-case identity bridges:       0\nhuman-permission dependencies:              0\ngraph effect:                               none\n\`\`\`\n\nEvery Wave 14 unresolved row now has one bounded disposition. Identity decisions remain integration-ready but graph-inert; planned records are not yet materialized; nonidentity rows are typed objects rather than failed actor or organization matches.\n`;

writeJsonl(policy.registry_path, decisions);
writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

let keepCompletedReceipt = false;
if (fs.existsSync(full(policy.receipt_path))) {
  try {
    const existing = readJson(policy.receipt_path);
    keepCompletedReceipt = existing.schema_version === 'lake-unresolved-subject-adjudication-wave-15@1'
      && existing.post_execution_reconciliation_complete === true;
  } catch {
    keepCompletedReceipt = false;
  }
}
if (!keepCompletedReceipt) {
  writeJson(policy.receipt_path, {
    schema_version: 'lake-unresolved-subject-adjudication-wave-15@1',
    program_key: policy.program_key,
    as_of: policy.as_of,
    source_fingerprint_sha256: sourceFingerprint,
    input_manifest: manifest,
    counts: {
      ...counts,
      decision_ids_source_projection_and_index_observed: 0,
      subject_object_ids_source_projection_and_index_observed: 0
    },
    post_execution_reconciliation_complete: false,
    correction_mode: policy.decision_law.correction_mode,
    boundaries: policy.boundaries
  });
}

console.log('unresolved subject adjudication Wave 15 built');
console.log(`  decisions / claim references: ${counts.subject_rows} / ${counts.claim_references}`);
console.log(`  identity / nonidentity: ${counts.identity_decisions} / ${counts.nonidentity_object_decisions}`);
console.log('  generic wait states, graph effects, and human-permission dependencies: 0');
