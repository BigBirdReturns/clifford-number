#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-identifier-repair-wave-02-policy.json';
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

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = String(row?.[field] ?? 'unspecified');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function pair(key, value) {
  return `${key}\0${value}`;
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const registrations = readJsonl(policy.source_registry_path);
const summary = readJson('build/lake-index/summary.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
const targetKeys = new Set(policy.target_identifier_keys ?? []);
const localKeys = new Set(policy.local_only_identifier_keys ?? []);

const inputs = [
  policyPath,
  policy.plan_path,
  policy.source_registry_path,
  policy.migration_receipt_path,
  'build/lake-index/summary.json',
  'build/lake-index/objects.jsonl',
  'build/lake-index/id-gaps.jsonl'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
const postProjectionGaps = idGaps.filter(row => row.gap_class === policy.target_gap_class);
const targetedRemaining = postProjectionGaps.filter(row => targetKeys.has(row.id_key));
const localObjects = objects.filter(object => localKeys.has(object.id_key));
const localGaps = idGaps.filter(row => localKeys.has(row.id_key));
const registeredObjects = registrations.map(row => objectByPair.get(pair(row.identifier_key, row.identifier_value))).filter(Boolean);
const registeredWithSourceOccurrence = registrations.filter(row => objectByPair.get(pair(row.identifier_key, row.identifier_value))?.source_occurrence === true);
const registeredIndexed = registrations.filter(row => objectByPair.get(pair(row.identifier_key, row.identifier_value))?.indexed === true);
const nativeMigrationRows = registrations.filter(row => row.native_source_migration_required === true);
const unresolvedRows = registrations.filter(row => row.registration_status === policy.fallback_registration.registration_status);

const reconciliation = {
  schema_version: 'lake-identifier-repair-wave-02-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: plan.before,
  after: {
    global_machine_ids: summary.counts.distinct_machine_ids,
    local_identifier_values_observed: summary.counts.local_identifier_values_observed,
    local_identifier_occurrences_observed: summary.counts.local_identifier_occurrences_observed,
    local_identifier_objects_in_global_index: localObjects.length,
    local_identifier_rows_in_global_gap_queue: localGaps.length,
    projection_without_source_rows: postProjectionGaps.length,
    targeted_explicit_projection_rows_remaining: targetedRemaining.length,
    registered_rows_with_source_occurrence: registeredWithSourceOccurrence.length,
    registered_rows_indexed: registeredIndexed.length,
    registered_object_rows_observed: registeredObjects.length,
    native_source_migrations_still_required: nativeMigrationRows.length,
    unresolved_registrations: unresolvedRows.length,
    divergent_identifier_projections: summary.counts.divergent_identifier_projections,
    source_ids_without_projection: summary.counts.source_ids_without_projection,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids
  },
  deltas: {
    projection_without_source_rows: postProjectionGaps.length - Number(plan.before.projection_without_source_rows ?? 0),
    targeted_explicit_projection_rows: targetedRemaining.length - Number(plan.before.targeted_explicit_projection_rows ?? 0),
    registered_rows_closed: registrations.length - targetedRemaining.length,
    prior_bare_local_projection_rows_removed: Number(plan.before.prior_bare_local_projection_rows ?? 0)
  },
  registration_state: {
    rows: registrations.length,
    by_identifier_key: countBy(registrations, 'identifier_key'),
    by_rule: countBy(registrations, 'matched_rule_key'),
    by_status: countBy(registrations, 'registration_status'),
    native_source_migrations_still_required: nativeMigrationRows.length,
    unresolved_registrations: unresolvedRows.length
  },
  decisions: [
    {
      decision_key: 'W02-RECONCILE-NAMESPACE',
      judgment: localObjects.length === 0 && localGaps.length === 0
        ? 'bare_local_ids_are_excluded_from_global_identifier_and_gap_joins'
        : 'bare_local_identifier_repair_incomplete',
      action: localObjects.length === 0 && localGaps.length === 0
        ? 'retain_local_occurrence_telemetry_without_global_identity_semantics'
        : 'repair_the_remaining_local_identifier_global_join_rows',
      evidence_count: Number(summary.counts.local_identifier_occurrences_observed ?? 0),
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W02-RECONCILE-REGISTRATIONS',
      judgment: targetedRemaining.length === 0
        ? 'all_targeted_explicit_projection_identifiers_have_source_registrations'
        : 'targeted_explicit_projection_identifier_registration_incomplete',
      action: targetedRemaining.length === 0
        ? 'continue_with_native_source_migration_debt_and_the_next_identifier_family'
        : 'register_the_remaining_targeted_identifier_pairs',
      evidence_count: registrations.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W02-RECONCILE-NATIVE-DEBT',
      judgment: 'native_source_migration_debt_remains_explicit_after_identifier_registration',
      action: 'migrate_legacy_native_case_sources_without_revoking_the_current_identifier_registrations',
      evidence_count: nativeMigrationRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    bare_local_id_removed_from_global_join_semantics: localObjects.length === 0 && localGaps.length === 0,
    all_targeted_explicit_projection_rows_registered: targetedRemaining.length === 0,
    every_registration_has_source_occurrence: registeredWithSourceOccurrence.length === registrations.length,
    every_registration_is_indexed: registeredIndexed.length === registrations.length,
    native_source_migrations_complete: nativeMigrationRows.length === 0,
    unresolved_registrations_remaining: unresolvedRows.length,
    post_execution_reconciliation_complete: true,
    semantic_lake_complete: false,
    evidence_truth_determined: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# Evidence-lake identifier repair Wave 02 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\ntargeted explicit projection rows before:  ${plan.before.targeted_explicit_projection_rows}\ntargeted explicit projection rows after:   ${targetedRemaining.length}\nregistered rows with source occurrence:    ${registeredWithSourceOccurrence.length}\nregistered rows indexed:                   ${registeredIndexed.length}\nlocal IDs in global object index:          ${localObjects.length}\nlocal IDs in global gap queue:             ${localGaps.length}\nprojection-without-source rows before:     ${plan.before.projection_without_source_rows}\nprojection-without-source rows after:      ${postProjectionGaps.length}\nnative source migrations still required:  ${nativeMigrationRows.length}\nunresolved registrations:                 ${unresolvedRows.length}\ndecisions requiring human permission:     0\n\`\`\`\n\n## Judgment\n\nThe explicit Wave 02 identifier pairs are registered as source objects and are index-addressable. Bare local \`id\` values remain observable but do not enter global joins. Registration does not convert generated products into independent evidence and does not complete native legacy-case migration.\n\n## Boundary\n\nSame-string recurrence is not identity resolution. Source registration is lineage metadata, not evidence truth. Native migration debt remains executable work rather than a wait state.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake identifier repair Wave 02 reconciled');
console.log(`  targeted gaps remaining: ${targetedRemaining.length}`);
console.log(`  registered source occurrences: ${registeredWithSourceOccurrence.length}/${registrations.length}`);
console.log(`  local IDs in global index: ${localObjects.length}`);
console.log(`  native source migrations still required: ${nativeMigrationRows.length}`);
