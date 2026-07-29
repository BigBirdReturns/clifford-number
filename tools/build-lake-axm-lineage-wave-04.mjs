#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIdentityLayer, PARTICIPATES_IN } from './lib/axm-identity.mjs';
import { loadAll } from './lib/ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-axm-lineage-wave-04-policy.json';
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

function participantLocal(row) {
  return row.participant_type === 'actor' ? row.actor_id : row.organization_id;
}

function participationKey(row) {
  return `${participantLocal(row)}\0${row.surface_id}`;
}

function claimKey(claim) {
  return `${claim.subj_local_id}\0${claim.obj_local_id}`;
}

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-axm-lineage-wave-04-policy@1') throw new Error('unsupported Wave 04 policy schema');
for (const relative of policy.input_paths ?? []) if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 04 input: ${relative}`);
for (const relative of policy.builder_paths ?? []) if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 04 builder: ${relative}`);

const fingerprintPaths = [...new Set([policyPath, ...(policy.input_paths ?? []), ...(policy.builder_paths ?? [])])].sort();
const inputs = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const data = loadAll();
const identity = buildIdentityLayer({
  namespace: readJson('cases.json').default_case_id,
  actors: data.actors,
  organizations: data.organizations,
  surfaces: data.surfaces,
  participation: data.participation,
  aliases: data.aliases
});
const committedIdentity = readJson(policy.target_projection_path);
assert.deepEqual(committedIdentity.scheme, identity.scheme, 'committed AXM scheme drifted from the canonical builder');
assert.deepEqual(committedIdentity.entities, identity.entities, 'committed AXM entities drifted from the canonical builder');
assert.deepEqual(committedIdentity.claims, identity.claims, 'committed AXM claims drifted from the canonical builder');
assert.equal(identity.scheme.status, 'provisional', 'AXM scheme must remain provisional');
assert.equal(identity.claims.length, policy.expected.axm_participates_in_claims, 'unexpected AXM participates_in claim count');
assert.ok(identity.claims.every(claim => claim.predicate === PARTICIPATES_IN), 'AXM identity layer contains an unexpected predicate');

const priorRegistrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl')
  .filter(row => row.matched_rule_key === policy.target_prior_rule)
  .sort((a, b) => String(a.identifier_value).localeCompare(String(b.identifier_value)));
assert.equal(priorRegistrations.length, policy.expected.target_registrations, 'unexpected fallback registration count');
assert.ok(priorRegistrations.every(row => row.identifier_key === policy.target_identifier_key), 'fallback registration key drift');
assert.ok(priorRegistrations.every(row => row.projection_paths?.length === 1 && row.projection_paths[0] === policy.target_projection_path), 'fallback projection path drift');
assert.ok(priorRegistrations.every(row => row.native_source_migration_required === true), 'fallback registration lost its native-source debt');

const priorByClaim = new Map(priorRegistrations.map(row => [row.identifier_value, row]));
assert.deepEqual([...priorByClaim.keys()].sort(), identity.claims.map(claim => claim.claim_id).sort(), 'fallback registration IDs do not equal the AXM claim set');

const participationByPair = new Map();
for (const row of data.participation) {
  const key = participationKey(row);
  if (!participationByPair.has(key)) participationByPair.set(key, []);
  participationByPair.get(key).push(row);
}
for (const rows of participationByPair.values()) {
  rows.sort((a, b) => `${a.time_start ?? ''}\0${a.time_end ?? ''}\0${a.role ?? ''}`.localeCompare(`${b.time_start ?? ''}\0${b.time_end ?? ''}\0${b.role ?? ''}`));
}

const reviewDependency = {
  required_to_decide: false,
  effect: 'challenge_may_correct_the_lineage_mapping_but_does_not_block_the_reversible_supersession'
};
const reversibility = {
  mode: 'append_preserving_supersession',
  correction_route: 'a_later_axm_or_ledger_reconciliation_may_supersede_this_row_without_deleting_the_prior_registration_or_participation_rows'
};

const supersessions = identity.claims.map(claim => {
  const prior = priorByClaim.get(claim.claim_id);
  assert.ok(prior, `missing prior registration for ${claim.claim_id}`);
  const rows = participationByPair.get(claimKey(claim)) ?? [];
  assert.ok(rows.length > 0, `missing canonical participation rows for ${claim.claim_id}`);
  const rowRecords = rows.map(row => ({
    source_row_sha256: stableDigest(row),
    participant_type: row.participant_type,
    participant_local_id: participantLocal(row),
    surface_id: row.surface_id,
    role: row.role ?? null,
    participation_type: row.participation_type ?? null,
    time_start: row.time_start ?? '',
    time_end: row.time_end ?? '',
    evidence_class: row.evidence_class ?? null,
    receipt_ids: uniqueSorted(row.receipt_ids)
  }));
  const evidenceClasses = uniqueSorted(rowRecords.map(row => row.evidence_class));
  const receiptIds = uniqueSorted(rowRecords.flatMap(row => row.receipt_ids));
  return {
    schema_version: 'lake-identifier-source-supersession@1',
    supersession_key: `IDSUP-${sha256(Buffer.from(`W04\0${claim.claim_id}`)).slice(0, 20)}`,
    prior_registration_key: prior.registration_key,
    identifier_key: policy.target_identifier_key,
    identifier_value: claim.claim_id,
    claim_id: claim.claim_id,
    supersession_status: 'native_participation_lineage_materialized',
    lineage_status: 'provisional_axm_claim_recomputes_from_canonical_participation_rows',
    predicate: claim.predicate,
    subject_axm_entity_id: claim.subj,
    subject_local_id: claim.subj_local_id,
    object_axm_entity_id: claim.obj,
    object_local_id: claim.obj_local_id,
    object_type: claim.obj_type,
    windows: claim.windows,
    canonical_participation_path: 'data/ledger/participation.jsonl',
    canonical_participation_rows: rowRecords,
    canonical_participation_row_count: rowRecords.length,
    canonical_participation_digest_sha256: stableDigest(rowRecords),
    evidence_classes: evidenceClasses,
    receipt_ids: receiptIds,
    prior_native_source_migration_required: true,
    current_native_source_migration_required: false,
    external_axm_reconciliation_required: true,
    cross_case_join_authorized: false,
    definition_scope: 'native_participation_lineage_for_a_provisional_generated_claim_not_evidence_truth_identity_resolution_or_cross_system_join_authority',
    review_dependency: reviewDependency,
    reversibility,
    graph_effect: 'none'
  };
}).sort((a, b) => a.claim_id.localeCompare(b.claim_id));
assert.equal(supersessions.length, policy.expected.target_registrations, 'Wave 04 supersession count drift');
writeJsonl(policy.supersession_ledger_path, supersessions);

const wave03 = readJson('build/lake-actions/native-source-migration-wave-03-reconciliation.json');
assert.equal(wave03.identifier_supersessions.current_native_source_migration_debt, policy.expected.remaining_native_source_debt_before, 'Wave 03 debt does not equal the Wave 04 input frontier');
const multiStintClaims = supersessions.filter(row => row.canonical_participation_row_count > 1).length;
const sourceRowsLinked = supersessions.reduce((total, row) => total + row.canonical_participation_row_count, 0);
const receiptIdsLinked = uniqueSorted(supersessions.flatMap(row => row.receipt_ids)).length;

const receipt = {
  schema_version: 'lake-axm-lineage-wave-04@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  axm_scheme_status: identity.scheme.status,
  axm_namespace: identity.scheme.namespace,
  provisional_axm_claims: identity.claims.length,
  superseded_identifier_registrations: supersessions.length,
  canonical_participation_rows_linked: sourceRowsLinked,
  multi_stint_claims: multiStintClaims,
  distinct_receipt_ids_linked: receiptIdsLinked,
  native_source_migration_debt_before: policy.expected.remaining_native_source_debt_before,
  native_source_migration_debt_after: policy.expected.remaining_native_source_debt_after,
  external_axm_reconciliation_complete: false,
  cross_case_join_authorized: false,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.migration_receipt_path, receipt);

const plan = {
  schema_version: 'lake-axm-lineage-wave-04-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    fallback_registrations: priorRegistrations.length,
    native_source_migration_debt: policy.expected.remaining_native_source_debt_before,
    provisional_axm_claims: identity.claims.length,
    external_axm_reconciliation_complete: false,
    cross_case_join_authorized: false
  },
  lineage: {
    supersession_rows: supersessions.length,
    canonical_participation_rows_linked: sourceRowsLinked,
    multi_stint_claims: multiStintClaims,
    distinct_receipt_ids_linked: receiptIdsLinked,
    supersession_ledger_path: policy.supersession_ledger_path,
    canonical_participation_path: 'data/ledger/participation.jsonl'
  },
  decisions: [
    {
      decision_key: 'W04-AXM-NATIVE-LINEAGE',
      judgment: 'all_164_provisional_axm_participates_in_claims_recompute_from_canonical_participation_rows',
      action: `write:${policy.supersession_ledger_path}`,
      evidence_count: sourceRowsLinked,
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    },
    {
      decision_key: 'W04-AXM-EXTERNAL-BOUNDARY',
      judgment: 'native_lineage_closes_source_debt_but_does_not_close_external_axm_serialization_reconciliation',
      action: 'retain_provisional_scheme_and_cross_case_join_prohibition_until_byte_for_byte_axm_genesis_reconciliation',
      evidence_count: identity.claims.length,
      review_dependency: { required_to_decide: false, effect: 'external_reproduction_controls_cross_system_use_not_permission_to_record_current_native_lineage' },
      reversibility,
      graph_effect: 'none'
    }
  ],
  completion: {
    every_fallback_registration_superseded: true,
    every_axm_claim_has_canonical_participation_lineage: true,
    native_source_migration_debt_after_wave: 0,
    external_axm_reconciliation_complete: false,
    cross_case_join_authorized: false,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# Evidence-lake AXM participation lineage Wave 04\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Governing judgment\n\nThe remaining 164 Wave 02 fallback registrations are the complete provisional AXM \`participates_in\` claim layer. Every claim recomputes from one or more canonical rows in \`data/ledger/participation.jsonl\`; no additional factual claim or native case source is missing. The source-lineage debt can therefore close without pretending that the provisional AXM serialization is externally reconciled.\n\n\`\`\`text\nprovisional AXM claims:                 ${identity.claims.length}\nfallback registrations superseded:     ${supersessions.length}\ncanonical participation rows linked:   ${sourceRowsLinked}\nmulti-stint claims:                     ${multiStintClaims}\ndistinct receipt IDs linked:            ${receiptIdsLinked}\nnative source migration debt:           164 -> 0\nexternal AXM reconciliation complete:   false\ncross-case join authorized:             false\ndecisions requiring human permission:  0\n\`\`\`\n\n## Boundary\n\nA canonical participation lineage is not evidence truth, identity resolution, coordination, causation, or pairwise-hop authority. The AXM envelope remains provisional and may not be used as a cross-system or cross-case join key until byte-for-byte reconciliation against \`axm-genesis\` succeeds. That material reproducibility defect controls cross-system use; it does not create a human-permission gate for recording the native lineage already present.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake AXM lineage Wave 04 built');
console.log(`  provisional AXM claims: ${identity.claims.length}`);
console.log(`  fallback registrations superseded: ${supersessions.length}`);
console.log(`  canonical participation rows linked: ${sourceRowsLinked}`);
console.log('  native source migration debt after: 0');
console.log('  external AXM reconciliation complete: false');
