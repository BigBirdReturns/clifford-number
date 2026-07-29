#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCaseLedger, validateCaseLedger } from './lib/case-ledger.mjs';

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

function semanticDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-native-source-migration-wave-03-policy@1') throw new Error('unsupported Wave 03 policy schema');
for (const relative of policy.input_paths ?? []) if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 03 input: ${relative}`);

const inputs = [policyPath, ...(policy.input_paths ?? [])].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
const legacyCompiledBytes = fs.readFileSync(full(policy.legacy_compiled_path));
const legacyCompiled = JSON.parse(legacyCompiledBytes.toString('utf8'));

function receiptEvidenceClass(receipt, claimsByReceipt) {
  if (receipt.evidence_class) return receipt.evidence_class;
  const sourceType = String(receipt.source_type ?? '').toLowerCase();
  if (sourceType.includes('official') || sourceType.includes('government')) return 'official';
  if (sourceType.includes('primary')) return 'primary_public';
  if (sourceType.includes('report') || sourceType.includes('news')) return 'reported';
  const order = ['official', 'confirmed', 'primary_public', 'reported', 'derived', 'open'];
  const candidates = [...(claimsByReceipt.get(receipt.receipt_id) ?? [])];
  if (candidates.length === 0) return 'open';
  return candidates.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? 'open';
}

function extractNativeSource(compiled) {
  const claims = (compiled.claims ?? []).map(claim => {
    const { value, receipts, ...source } = claim;
    return source;
  });
  const claimsByReceipt = new Map();
  for (const claim of claims) {
    for (const receiptId of claim.receipt_ids ?? []) {
      if (!claimsByReceipt.has(receiptId)) claimsByReceipt.set(receiptId, new Set());
      claimsByReceipt.get(receiptId).add(claim.evidence_class);
    }
  }
  let receiptEvidenceClassesFilled = 0;
  const receipts = (compiled.receipts ?? []).map(receipt => {
    if (receipt.evidence_class) return { ...receipt };
    receiptEvidenceClassesFilled += 1;
    return { ...receipt, evidence_class: receiptEvidenceClass(receipt, claimsByReceipt) };
  });
  const events = (compiled.events ?? []).map(event => {
    const { claims: hydratedClaims, ...source } = event;
    return source;
  });
  const beacons = (compiled.beacons ?? []).map(beacon => {
    const { evidence_coverage, inputs: hydratedInputs, ...source } = beacon;
    return source;
  });
  const derivedTopLevel = new Set([
    'counts',
    'claim_status_counts',
    'claims',
    'unsequenced_claim_ids',
    'events',
    'relations',
    'receipts',
    'beacons',
    'trails'
  ]);
  const caseItem = Object.fromEntries(Object.entries(compiled).filter(([key]) => !derivedTopLevel.has(key)));
  caseItem.sections = (compiled.sections ?? []).map(section => {
    const { records, ...source } = section;
    return source;
  });
  return {
    data: {
      case: caseItem,
      receipts,
      claims,
      events,
      relations: compiled.relations ?? [],
      beacons,
      trails: compiled.trails ?? []
    },
    receiptEvidenceClassesFilled
  };
}

const extracted = extractNativeSource(legacyCompiled);
const sourceData = extracted.data;
const errors = validateCaseLedger(sourceData);
if (errors.length) throw new Error(`native UK-AI source validation failed:\n${errors.join('\n')}`);
const recompiled = compileCaseLedger(sourceData);
const reExtracted = extractNativeSource(recompiled).data;
assert.deepEqual(canonical(reExtracted), canonical(sourceData), 'native compiler changed source-level claim/event/receipt semantics');
const sourceSemanticDigest = semanticDigest(sourceData);
const recompiledSemanticDigest = semanticDigest(reExtracted);
assert.equal(recompiledSemanticDigest, sourceSemanticDigest, 'native compiler semantic digest mismatch');

const expected = policy.expected;
for (const [field, rows] of [
  ['claims', sourceData.claims],
  ['events', sourceData.events],
  ['receipts', sourceData.receipts],
  ['relations', sourceData.relations],
  ['beacons', sourceData.beacons],
  ['trails', sourceData.trails]
]) assert.equal(rows.length, expected[field], `unexpected native ${field} count`);

writeJson(`${policy.native_case_directory}/case.json`, sourceData.case);
writeJsonl(`${policy.native_case_directory}/receipts.jsonl`, sourceData.receipts);
writeJsonl(`${policy.native_case_directory}/claims.jsonl`, sourceData.claims);
writeJsonl(`${policy.native_case_directory}/events.jsonl`, sourceData.events);
writeJsonl(`${policy.native_case_directory}/relations.jsonl`, sourceData.relations);
writeJsonl(`${policy.native_case_directory}/beacons.jsonl`, sourceData.beacons);
writeJsonl(`${policy.native_case_directory}/trails.jsonl`, sourceData.trails);

const priorRegistrations = readJsonl('data/project/lake-identifier-source-registry-wave-02.jsonl')
  .filter(row => row.matched_rule_key === policy.target_prior_rule)
  .sort((a, b) => `${a.identifier_key}:${a.identifier_value}`.localeCompare(`${b.identifier_key}:${b.identifier_value}`));
assert.equal(priorRegistrations.length, expected.superseded_identifier_registrations, 'unexpected UK-AI prior registration count');
const claimIds = new Set(sourceData.claims.map(row => row.claim_id));
const eventIds = new Set(sourceData.events.map(row => row.event_id));
const reviewDependency = {
  required_to_decide: false,
  effect: 'challenge_may_correct_the_native_lineage_but_does_not_block_the_reversible_migration'
};
const reversibility = {
  mode: 'append_preserving_supersession',
  correction_route: 'a_later_native_source_migration_may_supersede_this_record_without_deleting_the_prior_registration_or_source_rows'
};
const supersessions = priorRegistrations.map(row => {
  const sourceSet = row.identifier_key === 'claim_id' ? claimIds : eventIds;
  assert.ok(sourceSet.has(row.identifier_value), `native source missing ${row.identifier_key}:${row.identifier_value}`);
  return {
    schema_version: 'lake-identifier-source-supersession@1',
    supersession_key: `IDSUP-${sha256(Buffer.from(`${row.identifier_key}\0${row.identifier_value}`)).slice(0, 20)}`,
    prior_registration_key: row.registration_key,
    identifier_key: row.identifier_key,
    identifier_value: row.identifier_value,
    supersession_status: 'native_source_materialized',
    native_source_record_path: row.identifier_key === 'claim_id'
      ? `${policy.native_case_directory}/claims.jsonl`
      : `${policy.native_case_directory}/events.jsonl`,
    prior_native_source_migration_required: true,
    current_native_source_migration_required: false,
    source_semantic_digest_sha256: sourceSemanticDigest,
    review_dependency: reviewDependency,
    reversibility,
    graph_effect: 'none'
  };
});
writeJsonl(policy.supersession_ledger_path, supersessions);

const sourceFiles = policy.native_source_paths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const migrationReceipt = {
  schema_version: 'lake-native-source-migration-wave-03@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  legacy_compiled_sha256: sha256(legacyCompiledBytes),
  source_semantic_digest_sha256: sourceSemanticDigest,
  recompiled_semantic_digest_sha256: recompiledSemanticDigest,
  native_case_key: legacyCompiled.case_id,
  native_source_files: sourceFiles,
  counts: {
    claims: sourceData.claims.length,
    events: sourceData.events.length,
    receipts: sourceData.receipts.length,
    relations: sourceData.relations.length,
    beacons: sourceData.beacons.length,
    trails: sourceData.trails.length,
    superseded_identifier_registrations: supersessions.length,
    receipt_evidence_classes_filled: extracted.receiptEvidenceClassesFilled
  },
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.migration_receipt_path, migrationReceipt);

const plan = {
  schema_version: 'lake-native-source-migration-wave-03-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  legacy_projection: {
    path: policy.legacy_compiled_path,
    sha256: migrationReceipt.legacy_compiled_sha256,
    claims: legacyCompiled.counts.claims,
    events: legacyCompiled.counts.events,
    receipts: legacyCompiled.counts.receipts,
    claim_status_counts: legacyCompiled.claim_status_counts
  },
  native_source: {
    directory: policy.native_case_directory,
    source_files: sourceFiles,
    source_semantic_digest_sha256: sourceSemanticDigest,
    receipt_evidence_classes_filled: extracted.receiptEvidenceClassesFilled,
    validation_errors: 0
  },
  supersessions: {
    rows: supersessions.length,
    ledger_path: policy.supersession_ledger_path,
    prior_rule: policy.target_prior_rule,
    by_identifier_key: Object.fromEntries([...policy.target_identifier_keys].sort().map(key => [key, supersessions.filter(row => row.identifier_key === key).length]))
  },
  decisions: [
    {
      decision_key: 'W03-NATIVE-CASE-SOURCE',
      judgment: 'the_deterministic_legacy_projection_can_be_losslessly_represented_at_the_source_semantic_level_as_a_native_case_ledger',
      action: `write:${policy.native_case_directory}`,
      evidence_count: sourceData.claims.length + sourceData.events.length + sourceData.receipts.length,
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    },
    {
      decision_key: 'W03-REGISTRATION-SUPERSESSION',
      judgment: 'the_448_legacy_uk_ai_identifier_registrations_now_have_native_case_source_rows',
      action: `write:${policy.supersession_ledger_path}`,
      evidence_count: supersessions.length,
      review_dependency: reviewDependency,
      reversibility,
      graph_effect: 'none'
    }
  ],
  completion: {
    native_source_files_written: sourceFiles.length,
    source_semantic_equivalence_proved: true,
    targeted_identifier_supersessions_written: supersessions.length,
    native_case_compiled_and_catalogued: false,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# Evidence-lake native source migration Wave 03\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Governing judgment\n\nThe legacy UK-AI public projection contains a complete deterministic case surface: 224 claims, 224 events, 15 receipts, explicit claim status, and no relations, beacons, or trails. Those rows can be migrated into the native case-ledger source contract without inventing a claim, changing an identifier, or requiring an unspecified reviewer to grant permission.\n\n\`\`\`text\nclaims migrated:                         ${sourceData.claims.length}\nevents migrated:                         ${sourceData.events.length}\nreceipts migrated:                       ${sourceData.receipts.length}\nreceipt evidence classes completed:      ${extracted.receiptEvidenceClassesFilled}\nidentifier registrations superseded:     ${supersessions.length}\nsource semantic equivalence:              true\ndecisions requiring human permission:    0\n\`\`\`\n\n## Boundary\n\nNative source custody improves reproducibility and machine addressability. It does not prove evidence truth, resolve identity, convert a graph edge into coordination or causation, allege wrongdoing, or grant publication clearance. The prior Wave 02 registrations remain in history and are superseded rather than deleted.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('lake native source migration Wave 03 built');
console.log(`  claims: ${sourceData.claims.length}`);
console.log(`  events: ${sourceData.events.length}`);
console.log(`  receipts: ${sourceData.receipts.length}`);
console.log(`  identifier supersessions: ${supersessions.length}`);
console.log(`  receipt evidence classes completed: ${extracted.receiptEvidenceClassesFilled}`);
