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

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), stableJson(value));
}

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = String(row?.[field] ?? 'unspecified');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function rowPaths(row) {
  if (Array.isArray(row.paths)) return uniqueSorted(row.paths);
  if (Array.isArray(row.occurrences)) return uniqueSorted(row.occurrences.map(item => item.path));
  return [];
}

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-identifier-repair-wave-02-policy@1') throw new Error('unsupported Wave 02 policy schema');
for (const relative of policy.input_paths ?? []) if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 02 input: ${relative}`);

const inputs = [policyPath, ...(policy.input_paths ?? [])].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
const summary = readJson('build/lake-index/summary.json');
const priorQueue = readJson('build/lake-actions/identifier-repair-queue.json');
const targetKeys = new Set(policy.target_identifier_keys ?? []);
const localKeys = new Set(policy.local_only_identifier_keys ?? []);

const projectionGaps = idGaps.filter(row => row.gap_class === policy.target_gap_class);
const targetMap = new Map();
for (const row of projectionGaps.filter(row => targetKeys.has(row.id_key))) {
  const key = `${row.id_key}\0${row.id_value}`;
  if (!targetMap.has(key)) targetMap.set(key, {
    identifier_key: row.id_key,
    identifier_value: String(row.id_value),
    projection_paths: new Set()
  });
  for (const file of rowPaths(row)) targetMap.get(key).projection_paths.add(file);
}
const targetRows = [...targetMap.values()].map(row => ({
  ...row,
  projection_paths: [...row.projection_paths].sort()
})).sort((a, b) => `${a.identifier_key}:${a.identifier_value}`.localeCompare(`${b.identifier_key}:${b.identifier_value}`));
if (targetRows.length === 0) throw new Error('Wave 02 found no explicit projection identifiers to register');

function matchRule(row) {
  for (const rule of policy.registration_rules ?? []) {
    if (!(rule.identifier_keys ?? []).includes(row.identifier_key)) continue;
    if ((rule.path_equals ?? []).some(file => row.projection_paths.includes(file))) return rule;
    if ((rule.path_prefixes ?? []).some(prefix => row.projection_paths.some(file => file.startsWith(prefix)))) return rule;
  }
  return null;
}

const reviewDependency = {
  required_to_decide: false,
  effect: 'challenge_may_correct_lineage_or_status_but_does_not_block_reversible_registration'
};
const reversibility = {
  mode: 'append_preserving_supersession',
  correction_route: 'a_later_source_registration_may_supersede_this_row_without_deleting_the_prior_lineage_record'
};

const registrations = targetRows.map(row => {
  const rule = matchRule(row);
  const registration = rule ?? policy.fallback_registration;
  const sourceLocators = uniqueSorted(rule?.source_locators ?? row.projection_paths);
  const registrationKey = `IDREG-${sha256(Buffer.from(`${row.identifier_key}\0${row.identifier_value}`)).slice(0, 20)}`;
  return {
    schema_version: 'lake-identifier-source-registration@1',
    identifier_key: row.identifier_key,
    identifier_value: row.identifier_value,
    [row.identifier_key]: row.identifier_value,
    registration_key: registrationKey,
    matched_rule_key: rule?.rule_key ?? 'fallback-unresolved-registration',
    registration_status: registration.registration_status,
    lineage_status: registration.lineage_status,
    projection_paths: row.projection_paths,
    source_locators: sourceLocators,
    native_source_migration_required: registration.native_source_migration_required === true,
    confidence: registration.confidence,
    definition_scope: 'identifier_namespace_and_lineage_only_not_evidence_truth_or_identity_resolution',
    review_dependency: reviewDependency,
    reversibility,
    graph_effect: 'none'
  };
});

const localBaselineRows = (priorQueue.groups ?? [])
  .filter(group => group.gap_class === policy.target_gap_class && localKeys.has(group.id_key))
  .reduce((sum, group) => sum + Number(group.row_count ?? 0), 0);
const localValuesObserved = Number(summary.counts?.local_identifier_values_observed ?? 0);
const localOccurrencesObserved = Number(summary.counts?.local_identifier_occurrences_observed ?? 0);
const nativeMigrationRows = registrations.filter(row => row.native_source_migration_required);
const unresolvedRows = registrations.filter(row => row.registration_status === policy.fallback_registration.registration_status);

const migrationReceipt = {
  schema_version: 'lake-identifier-repair-wave-02@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  source_registry_path: policy.source_registry_path,
  registered_identifier_rows: registrations.length,
  registered_by_identifier_key: countBy(registrations, 'identifier_key'),
  registered_by_rule: countBy(registrations, 'matched_rule_key'),
  local_identifier_rows_removed_from_global_gap_queue: localBaselineRows,
  local_identifier_values_observed: localValuesObserved,
  local_identifier_occurrences_observed: localOccurrencesObserved,
  native_source_migrations_still_required: nativeMigrationRows.length,
  unresolved_registrations: unresolvedRows.length,
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};

const plan = {
  schema_version: 'lake-identifier-repair-wave-02-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    total_identifier_gap_rows: idGaps.length,
    projection_without_source_rows: projectionGaps.length,
    targeted_explicit_projection_rows: registrations.length,
    targeted_by_identifier_key: countBy(registrations, 'identifier_key'),
    prior_bare_local_projection_rows: localBaselineRows,
    local_identifier_values_observed: localValuesObserved,
    local_identifier_occurrences_observed: localOccurrencesObserved
  },
  registrations: {
    rows: registrations.length,
    by_rule: countBy(registrations, 'matched_rule_key'),
    by_status: countBy(registrations, 'registration_status'),
    native_source_migrations_still_required: nativeMigrationRows.length,
    unresolved_registrations: unresolvedRows.length,
    source_registry_path: policy.source_registry_path
  },
  decisions: [
    {
      decision_key: 'W02-LOCAL-ID-NAMESPACE',
      judgment: 'bare_id_is_a_document_local_field_not_a_global_machine_identifier',
      evidence_count: localOccurrencesObserved,
      action: 'exclude_bare_id_values_from_global_object_and_gap_joins_while_retaining_local_occurrence_telemetry',
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    },
    {
      decision_key: 'W02-EXPLICIT-SOURCE-REGISTRATION',
      judgment: 'explicit_projection_identifiers_require_a_typed_source_registration_even_when_native_lineage_remains_unresolved',
      evidence_count: registrations.length,
      action: `write:${policy.source_registry_path}`,
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    },
    {
      decision_key: 'W02-NATIVE-MIGRATION-DEBT',
      judgment: 'source_registration_closes_the_identifier_namespace_gap_but_does_not_erase_native_source_migration_debt',
      evidence_count: nativeMigrationRows.length,
      action: 'retain_native_source_migration_required_on_each_affected_registration',
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    }
  ],
  completion: {
    source_registry_built: true,
    bare_local_id_removed_from_global_join_semantics: true,
    explicit_target_rows_registered: registrations.length,
    native_source_migrations_complete: nativeMigrationRows.length === 0,
    unresolved_registrations_remaining: unresolvedRows.length,
    post_execution_reconciliation_complete: false,
    semantic_lake_complete: false,
    evidence_truth_determined: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# Evidence-lake identifier repair Wave 02\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Governing judgment\n\nA bare \`id\` field is document-local unless a schema declares a stronger namespace. It is retained as local telemetry and excluded from global joins. Explicit \`claim_id\`, \`event_id\`, \`object_id\`, and \`trail_id\` projection gaps receive typed source-registration rows. Registration closes the identifier-namespace defect; it does not prove evidence truth, resolve identity, or silently complete native case migration.\n\n\`\`\`text\nprojection-without-source rows observed:     ${projectionGaps.length}\nexplicit target rows registered:            ${registrations.length}\nprior bare local projection rows:            ${localBaselineRows}\nlocal-only identifier values observed:       ${localValuesObserved}\nlocal-only identifier occurrences observed:  ${localOccurrencesObserved}\nnative source migrations still required:     ${nativeMigrationRows.length}\nunresolved registrations:                    ${unresolvedRows.length}\ndecisions requiring human permission:        0\n\`\`\`\n\n## Registrations by identifier key\n\n| Identifier key | Rows |\n|---|---:|\n${Object.entries(countBy(registrations, 'identifier_key')).map(([key, count]) => `| ${key} | ${count} |`).join('\n')}\n\n## Registrations by rule\n\n| Rule | Rows |\n|---|---:|\n${Object.entries(countBy(registrations, 'matched_rule_key')).map(([key, count]) => `| ${key} | ${count} |`).join('\n')}\n\n## Boundary\n\nThe registry defines identifier namespace and declared lineage only. Same-string recurrence is not identity resolution. Generated lineage is not independent evidence. A legacy registration with \`native_source_migration_required: true\` remains an explicit migration debt. Independent challenge may correct any row; it is not permission required to create the reversible registration.\n`;

writeJsonl(policy.source_registry_path, registrations);
writeJson(policy.migration_receipt_path, migrationReceipt);
writeJson(policy.plan_path, plan);
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake identifier repair Wave 02 built');
console.log(`  explicit registrations: ${registrations.length}`);
console.log(`  local-only values excluded from global joins: ${localValuesObserved}`);
console.log(`  native source migrations still required: ${nativeMigrationRows.length}`);
console.log(`  unresolved registrations: ${unresolvedRows.length}`);
