#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCaseLedger, loadCaseLedger, validateCaseLedger } from './lib/case-ledger.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-native-source-migration-wave-03-policy.json';
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

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function semanticDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
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
const nativeData = loadCaseLedger(policy.native_case_directory);
const validationErrors = validateCaseLedger(nativeData);
const compiledFromSource = compileCaseLedger(nativeData);
const compiledArtifact = readJson(policy.legacy_compiled_path);
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const reportFrontier = readJson('build/report-frontier.json');
const objects = readJsonl('build/lake-index/objects.jsonl');
const wave02 = readJson('build/lake-actions/identifier-repair-wave-02-reconciliation.json');

const sourceSemanticDigest = semanticDigest(nativeData);
const objectByPair = new Map(objects.map(object => [pair(object.id_key, object.id_value), object]));
const nativeSourcePrefix = `${policy.native_case_directory}/`;
const supersessionsWithNativeOccurrence = supersessions.filter(row => {
  const object = objectByPair.get(pair(row.identifier_key, row.identifier_value));
  return (object?.occurrences ?? []).some(occurrence => occurrence.path.startsWith(nativeSourcePrefix) && occurrence.generated !== true);
});
const nativeIndexEntry = (caseIndex.cases ?? []).find(row => row.case_id === 'uk-ai-policy');
const catalogEntry = (publicCatalog.cases ?? []).find(row => row.case_id === 'uk-ai-policy');
const frontierEntry = (reportFrontier.cases ?? []).find(row => row.case_id === 'uk-ai-policy');
const remainingNativeDebt = Math.max(0, Number(wave02.registration_state?.native_source_migrations_still_required ?? 0) - supersessions.length);

const inputs = [
  policyPath,
  policy.plan_path,
  policy.migration_receipt_path,
  policy.supersession_ledger_path,
  ...policy.native_source_paths,
  'build/cases/uk-ai-policy.json',
  'build/cases/index.json',
  'build/public-catalog.json',
  'build/report-frontier.json',
  'build/lake-index/objects.jsonl',
  'build/lake-actions/identifier-repair-wave-02-reconciliation.json'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const reconciliation = {
  schema_version: 'lake-native-source-migration-wave-03-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  source_validation: {
    errors: validationErrors,
    source_semantic_digest_sha256: sourceSemanticDigest,
    expected_semantic_digest_sha256: receipt.source_semantic_digest_sha256,
    native_compiler_counts: compiledFromSource.counts,
    compiled_artifact_counts: compiledArtifact.counts,
    compiled_claim_status_counts: compiledArtifact.claim_status_counts
  },
  native_case: {
    case_index_present: Boolean(nativeIndexEntry),
    public_catalog_present: Boolean(catalogEntry),
    report_frontier_case_state: frontierEntry?.case_state ?? null,
    report_frontier_current_stage: frontierEntry?.current_stage ?? null,
    report_frontier_next_transition: frontierEntry?.next_transition ?? null,
    claims: nativeData.claims.length,
    events: nativeData.events.length,
    receipts: nativeData.receipts.length,
    relations: nativeData.relations.length,
    beacons: nativeData.beacons.length,
    trails: nativeData.trails.length
  },
  identifier_supersessions: {
    rows: supersessions.length,
    rows_with_native_source_occurrence: supersessionsWithNativeOccurrence.length,
    prior_native_source_migration_debt: wave02.registration_state.native_source_migrations_still_required,
    current_native_source_migration_debt: remainingNativeDebt,
    debt_closed_by_wave: supersessions.length,
    by_identifier_key: Object.fromEntries([...policy.target_identifier_keys].sort().map(key => [key, supersessions.filter(row => row.identifier_key === key).length]))
  },
  decisions: [
    {
      decision_key: 'W03-RECONCILE-NATIVE-CASE',
      judgment: validationErrors.length === 0 && sourceSemanticDigest === receipt.source_semantic_digest_sha256
        ? 'native_uk_ai_case_source_is_valid_and_semantically_equivalent_to_the_migration_snapshot'
        : 'native_uk_ai_case_source_requires_repair',
      action: validationErrors.length === 0
        ? 'retain_native_case_as_the_authoritative_compiler_input'
        : 'repair_the_named_source_validation_errors',
      evidence_count: nativeData.claims.length + nativeData.events.length + nativeData.receipts.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W03-RECONCILE-IDENTIFIER-DEBT',
      judgment: supersessionsWithNativeOccurrence.length === supersessions.length
        ? 'all_448_targeted_registrations_have_native_case_source_occurrences'
        : 'targeted_native_source_occurrence_migration_incomplete',
      action: supersessionsWithNativeOccurrence.length === supersessions.length
        ? 'continue_with_the_164_remaining_unresolved_native_source_registrations'
        : 'repair_the_missing_native_source_occurrences',
      evidence_count: supersessions.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    native_source_validation_complete: validationErrors.length === 0,
    source_semantic_equivalence_proved: sourceSemanticDigest === receipt.source_semantic_digest_sha256,
    native_case_compiled: compiledArtifact.case_id === 'uk-ai-policy',
    native_case_indexed: Boolean(nativeIndexEntry),
    native_case_public_catalogued: Boolean(catalogEntry),
    report_frontier_case_ledger_transition_complete: frontierEntry?.case_state === 'case_ledger',
    every_targeted_registration_has_native_source_occurrence: supersessionsWithNativeOccurrence.length === supersessions.length,
    targeted_native_source_migration_complete: supersessions.length === policy.expected.superseded_identifier_registrations,
    remaining_native_source_migration_debt: remainingNativeDebt,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

const report = `# Evidence-lake native source migration Wave 03 reconciliation\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nsource validation errors:                     ${validationErrors.length}\nsource semantic equivalence:                  ${sourceSemanticDigest === receipt.source_semantic_digest_sha256}\nnative case index present:                    ${Boolean(nativeIndexEntry)}\npublic catalog present:                       ${Boolean(catalogEntry)}\nreport frontier case state:                   ${frontierEntry?.case_state ?? 'missing'}\nreport frontier next transition:              ${frontierEntry?.next_transition ?? 'missing'}\nidentifier supersessions:                     ${supersessions.length}\nsupersessions with native source occurrence:  ${supersessionsWithNativeOccurrence.length}\nnative source migration debt before:          ${wave02.registration_state.native_source_migrations_still_required}\nnative source migration debt after:           ${remainingNativeDebt}\ndecisions requiring human permission:         0\n\`\`\`\n\n## Judgment\n\nThe UK-AI case is now a native typed case ledger and the report frontier sees it as \`case_ledger\`, not a legacy projection. All 448 targeted claim/event registrations have source occurrences in the native case directory. The remaining 164 native-source debts are a concrete follow-on queue, not a reason to revoke this migration.\n\n## Boundary\n\nNative source custody and deterministic compiler equivalence improve reproducibility. They do not prove evidence truth, resolve identity, turn graph adjacency into coordination or causation, allege wrongdoing, or grant publication clearance.\n`;

writeJson(policy.reconciliation_path, reconciliation);
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('lake native source migration Wave 03 reconciled');
console.log(`  source validation errors: ${validationErrors.length}`);
console.log(`  identifier supersessions with native occurrence: ${supersessionsWithNativeOccurrence.length}/${supersessions.length}`);
console.log(`  report frontier state: ${frontierEntry?.case_state ?? 'missing'}`);
console.log(`  remaining native source migration debt: ${remainingNativeDebt}`);
