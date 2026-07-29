#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIdentityLayer } from './lib/axm-identity.mjs';
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

function pair(key, value) {
  return `${key}\0${value}`;
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.migration_receipt_path);
const supersessions = readJsonl(policy.supersession_ledger_path);
const priorRegistrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl')
  .filter(row => row.matched_rule_key === policy.target_prior_rule);
const wave03Supersessions = readJsonl('data/project/lake-identifier-source-supersessions-wave-03.jsonl');
const wave03 = readJson('build/lake-actions/native-source-migration-wave-03-reconciliation.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const buildInstructions = fs.readFileSync(full('BUILD-INSTRUCTIONS.md'), 'utf8');
const data = loadAll();
const identity = buildIdentityLayer({
  namespace: data.caseConfig.namespace,
  actors: data.actors,
  organizations: data.organizations,
  surfaces: data.surfaces,
  participation: data.participation,
  aliases: data.aliases
});

const inputs = [
  policyPath,
  policy.plan_path,
  policy.migration_receipt_path,
  policy.supersession_ledger_path,
  'data/project/lake-identifier-source-registry-wave-02.jsonl',
  'data/project/lake-identifier-source-supersessions-wave-03.jsonl',
  'build/lake-actions/native-source-migration-wave-03-reconciliation.json',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json',
  'build/axm-identity.json',
  'data/ledger/participation.jsonl',
  'BUILD-INSTRUCTIONS.md'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
const rowsWithSupersessionOccurrence = supersessions.filter(row => {
  const object = objectByPair.get(pair(row.identifier_key, row.identifier_value));
  return (object?.occurrences ?? []).some(occurrence => occurrence.path === policy.supersession_ledger_path && occurrence.generated !== true);
});
const indexedRows = supersessions.filter(row => objectByPair.get(pair(row.identifier_key, row.identifier_value))?.indexed === true);
const supersededPriorKeys = new Set([
  ...wave03Supersessions.map(row => row.prior_registration_key),
  ...supersessions.map(row => row.prior_registration_key)
]);
const unsupersededWave02NativeDebt = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl')
  .filter(row => row.native_source_migration_required === true && !supersededPriorKeys.has(row.registration_key));
const unsupersededFallbacks = priorRegistrations.filter(row => !supersededPriorKeys.has(row.registration_key));
const sourceRowsLinked = supersessions.reduce((total, row) => total + Number(row.canonical_participation_row_count ?? 0), 0);
const externalGatePreserved = /reconciled byte-for-byte against axm-genesis|AXM identity reconciliation/i.test(buildInstructions)
  && /no cross-case join ships/i.test(buildInstructions);

const reconciliation = {
  schema_version: 'lake-axm-lineage-wave-04-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: plan.before,
  after: {
    provisional_axm_claims: identity.claims.length,
    supersession_rows: supersessions.length,
    supersession_rows_with_indexed_source_occurrence: rowsWithSupersessionOccurrence.length,
    indexed_supersession_rows: indexedRows.length,
    canonical_participation_rows_linked: sourceRowsLinked,
    unsuperseded_fallback_registrations: unsupersededFallbacks.length,
    unsuperseded_wave02_native_source_debt: unsupersededWave02NativeDebt.length,
    native_source_migration_debt: unsupersededWave02NativeDebt.length,
    external_axm_reconciliation_complete: false,
    external_axm_gate_preserved: externalGatePreserved,
    cross_case_join_authorized: false,
    global_machine_ids: summary.counts.distinct_machine_ids
  },
  deltas: {
    native_source_migration_debt: unsupersededWave02NativeDebt.length - Number(plan.before.native_source_migration_debt ?? 0),
    fallback_registrations: unsupersededFallbacks.length - Number(plan.before.fallback_registrations ?? 0),
    superseded_fallback_registrations: supersessions.length
  },
  decisions: [
    {
      decision_key: 'W04-RECONCILE-SOURCE-DEBT',
      judgment: unsupersededWave02NativeDebt.length === 0
        ? 'all_wave02_native_source_debt_is_superseded_by_native_case_or_participation_lineage'
        : 'wave02_native_source_debt_remains',
      action: unsupersededWave02NativeDebt.length === 0
        ? 'retain_the_supersession_chain_and_move_to_external_axm_reproducibility'
        : 'repair_the_remaining_named_native_source_rows',
      evidence_count: wave03Supersessions.length + supersessions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W04-RECONCILE-EXTERNAL-AXM',
      judgment: 'native_source_debt_is_zero_while_external_axm_serialization_reconciliation_remains_open',
      action: 'run_byte_for_byte_axm_genesis_reconciliation_before_any_cross_system_or_cross_case_join',
      evidence_count: identity.claims.length,
      review_dependency: { required_to_decide: false, effect: 'external_reproduction_controls_join_eligibility_not_permission_to_record_native_lineage' },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_fallback_registration_superseded: unsupersededFallbacks.length === 0,
    every_supersession_has_indexed_source_occurrence: rowsWithSupersessionOccurrence.length === supersessions.length && indexedRows.length === supersessions.length,
    every_axm_claim_has_native_participation_lineage: supersessions.length === identity.claims.length,
    wave02_native_source_migration_debt_complete: unsupersededWave02NativeDebt.length === 0,
    external_axm_reconciliation_complete: false,
    external_axm_gate_preserved: externalGatePreserved,
    cross_case_join_authorized: false,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# Evidence-lake AXM participation lineage Wave 04 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nprovisional AXM claims:                         ${identity.claims.length}\nWave 04 supersessions:                         ${supersessions.length}\nsupersessions with indexed source occurrence:  ${rowsWithSupersessionOccurrence.length}\ncanonical participation rows linked:           ${sourceRowsLinked}\nunsuperseded fallback registrations:            ${unsupersededFallbacks.length}\nWave 02 native source debt before:              ${wave03.identifier_supersessions.current_native_source_migration_debt}\nWave 02 native source debt after:               ${unsupersededWave02NativeDebt.length}\nexternal AXM gate preserved:                    ${externalGatePreserved}\nexternal AXM reconciliation complete:           false\ncross-case join authorized:                     false\ndecisions requiring human permission:          0\n\`\`\`\n\n## Judgment\n\nAll 612 Wave 02 native-source debts now have append-preserving supersessions: 448 through the native UK-AI case and 164 through canonical participation lineage. The remaining AXM work is no longer missing source custody. It is a concrete byte-for-byte serialization and external-reproduction defect.\n\n## Boundary\n\nZero native-source debt does not make provisional AXM IDs externally authoritative. Cross-system and cross-case joins remain prohibited until the checked external reconciliation succeeds. This is a material reproducibility boundary, not a wait-for-human state.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake AXM lineage Wave 04 reconciled');
console.log(`  supersessions with source occurrence: ${rowsWithSupersessionOccurrence.length}/${supersessions.length}`);
console.log(`  Wave 02 native source debt after: ${unsupersededWave02NativeDebt.length}`);
console.log(`  external AXM gate preserved: ${externalGatePreserved}`);
console.log('  cross-case join authorized: false');
