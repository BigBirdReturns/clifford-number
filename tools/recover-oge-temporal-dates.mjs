#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  analyzeInterestDateEvidence,
  applyDateRecovery,
  sha256,
  stableJson,
} from './lib/oge-date-recovery.mjs';
import { classifyTemporalCandidate } from './lib/oge-fec-temporal-screen.mjs';

const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = process.cwd();
const candidatesPath = path.resolve(root, arg('candidates', 'build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2/overlap-candidates.jsonl'));
const temporalPath = path.resolve(root, arg('temporal', 'build/oge-fec-temporal-screen/fec-oppexp-cohort-local-20260713-r2/temporal-dispositions.jsonl'));
const interestsPath = path.resolve(root, arg('interests', 'build/oge-beneficial-interests/interests.jsonl'));
const pagesDir = path.resolve(root, arg('pages-dir', 'build/oge-beneficial-interests/pages'));
const outputDir = path.resolve(root, arg('output-dir', 'build/oge-date-recovery/fec-oppexp-cohort-local-20260713-r2'));
const durableOutput = arg('durable-output', '');

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, rows.length ? `${rows.map(JSON.stringify).join('\n')}\n` : '');
  const bytes = fs.readFileSync(file);
  return { path: path.basename(file), bytes: bytes.length, sha256: sha256(bytes) };
}

function countBy(rows, key) {
  return Object.fromEntries([...rows.reduce((counts, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => String(a).localeCompare(String(b))));
}

const candidateBytes = fs.readFileSync(candidatesPath);
const temporalBytes = fs.readFileSync(temporalPath);
const interestBytes = fs.readFileSync(interestsPath);
const candidates = readJsonl(candidatesPath);
const temporal = readJsonl(temporalPath);
const interests = readJsonl(interestsPath);
const temporalById = new Map(temporal.map(row => [row.overlap_candidate_id, row]));
const unknown = candidates.filter(candidate => temporalById.get(candidate.overlap_candidate_id)?.temporal_relation === 'temporally_unknown');

const pageCache = new Map();
function pageFor(record) {
  if (!record?.source_sha256 || !Number.isInteger(record?.source_page)) return null;
  if (!pageCache.has(record.source_sha256)) {
    const file = path.join(pagesDir, `${record.source_sha256}.jsonl`);
    pageCache.set(record.source_sha256, fs.existsSync(file) ? readJsonl(file) : []);
  }
  return pageCache.get(record.source_sha256)[record.source_page - 1] ?? null;
}

const evidenceByInputLine = new Map();
for (const candidate of unknown) {
  const inputLine = candidate?.oge_interest_ref?.input_line;
  if (!Number.isInteger(inputLine) || inputLine < 1 || inputLine > interests.length) {
    throw new Error(`invalid OGE interest input line for ${candidate.overlap_candidate_id}`);
  }
  if (!evidenceByInputLine.has(inputLine)) {
    const record = interests[inputLine - 1];
    if (record.source_sha256 !== candidate.oge_interest_ref.source_sha256
      || record.source_page !== candidate.oge_interest_ref.source_page
      || record.source_row_label !== candidate.oge_interest_ref.source_row_label) {
      throw new Error(`OGE interest reference mismatch on line ${inputLine}`);
    }
    const evidence = analyzeInterestDateEvidence(record, pageFor(record));
    evidence.oge_interest_input_line = inputLine;
    evidenceByInputLine.set(inputLine, evidence);
  }
}

const evidenceRows = [...evidenceByInputLine.values()].sort((a, b) => a.oge_interest_input_line - b.oge_interest_input_line);
const dispositions = [];
const overlays = [];
for (const candidate of unknown) {
  const inputLine = candidate.oge_interest_ref.input_line;
  const evidence = evidenceByInputLine.get(inputLine);
  const patched = applyDateRecovery(candidate, evidence);
  const screened = classifyTemporalCandidate(patched);
  const row = {
    schema_version: 'oge-date-recovery-disposition@1',
    overlap_candidate_id: candidate.overlap_candidate_id,
    oge_interest_input_line: inputLine,
    source_evidence_id: evidence.source_evidence_id,
    original_temporal_relation: 'temporally_unknown',
    original_temporal_reason: temporalById.get(candidate.overlap_candidate_id)?.reason ?? null,
    original_interest_dates: candidate.interest_dates,
    recovery_status: evidence.recovery_status,
    recovery_reason: evidence.reason,
    recovered_date: evidence.recovered_date,
    post_recovery_interest_dates: patched.interest_dates,
    post_recovery_temporal_relation: screened.temporal_relation,
    eligible_for_identity_review: screened.eligible_for_identity_review,
    verification_status: 'machine_generated_unreviewed',
    causal_status: 'not_established',
    graph_effect: 'none',
  };
  dispositions.push(row);
  if (evidence.recovery_status === 'recovered') {
    overlays.push({
      schema_version: 'oge-date-recovery-overlay@1',
      overlap_candidate_id: candidate.overlap_candidate_id,
      source_evidence_id: evidence.source_evidence_id,
      valid_from: evidence.recovered_date,
      valid_until: evidence.recovered_date,
      recovery_rule: evidence.recovery_rule,
      verification_status: 'machine_generated_unreviewed',
      causal_status: 'not_established',
      graph_effect: 'none',
    });
  }
}

fs.mkdirSync(outputDir, { recursive: true });
const outputs = {
  source_date_evidence: writeJsonl(path.join(outputDir, 'source-date-evidence.jsonl'), evidenceRows),
  candidate_dispositions: writeJsonl(path.join(outputDir, 'date-recovery-dispositions.jsonl'), dispositions),
  recovered_date_overlays: writeJsonl(path.join(outputDir, 'recovered-date-overlays.jsonl'), overlays),
};

const relationKeys = ['overlapping', 'non_overlapping', 'temporally_unknown'];
const observedBaselineCounts = countBy(temporal, 'temporal_relation');
const baselineCounts = Object.fromEntries(relationKeys.map(key => [key, observedBaselineCounts[key] ?? 0]));
const postRecoveryUnknownCounts = countBy(dispositions, 'post_recovery_temporal_relation');
const postRecoveryCounts = { ...baselineCounts };
postRecoveryCounts.temporally_unknown = 0;
for (const [relation, count] of Object.entries(postRecoveryUnknownCounts)) {
  postRecoveryCounts[relation] = (postRecoveryCounts[relation] ?? 0) + count;
}
const pageEvidence = [...new Map(evidenceRows.map(row => [
  `${row.source_sha256}:${row.source_page}`,
  { source_sha256: row.source_sha256, source_page: row.source_page, page_text_sha256: row.page_text_sha256 },
])).values()].sort((a, b) => `${a.source_sha256}:${a.source_page}`.localeCompare(`${b.source_sha256}:${b.source_page}`));

const manifest = {
  schema_version: 'oge-date-recovery-manifest@1',
  recovery_rule: {
    id: 'oge-source-page-date-recovery@1',
    accepted: 'One unambiguous, calendar-valid M/D/YYYY, MM/DD/YYYY, M-D-YYYY, MM-DD-YYYY, or YYYY-MM-DD token literally present in the located OGE transaction-date column.',
    rejected: 'No slash insertion, digit reinterpretation, filing-year substitution, report-date substitution, or inferred interest start date is permitted.',
  },
  inputs: {
    candidates: { path: path.relative(root, candidatesPath).replaceAll('\\', '/'), bytes: candidateBytes.length, sha256: sha256(candidateBytes) },
    temporal_dispositions: { path: path.relative(root, temporalPath).replaceAll('\\', '/'), bytes: temporalBytes.length, sha256: sha256(temporalBytes) },
    interests: { path: path.relative(root, interestsPath).replaceAll('\\', '/'), bytes: interestBytes.length, sha256: sha256(interestBytes) },
    page_evidence_set: { unique_pages: pageEvidence.length, sha256: sha256(stableJson(pageEvidence)) },
  },
  candidates_total: candidates.length,
  temporally_unknown_candidates_analyzed: unknown.length,
  unique_oge_interest_rows_analyzed: evidenceRows.length,
  unique_source_documents: new Set(evidenceRows.map(row => row.source_sha256)).size,
  unique_source_pages: pageEvidence.length,
  source_row_hashes_verified: evidenceRows.filter(row => row.raw_text_sha256_verified).length,
  recovery_statuses_by_candidate: countBy(dispositions, 'recovery_status'),
  exact_reasons_by_candidate: countBy(dispositions, 'recovery_reason'),
  exact_reasons_by_unique_oge_interest: countBy(evidenceRows, 'reason'),
  raw_transaction_date_tokens_by_candidate: countBy(
    unknown.filter(row => row.holder?.record_kind === 'reported_transaction'),
    row => row.interest_dates?.transaction_date_as_reported ?? 'null',
  ),
  dates_recovered: overlays.length,
  baseline_dispositions: baselineCounts,
  post_recovery_dispositions: postRecoveryCounts,
  disposition_delta: Object.fromEntries(relationKeys.map(key => [key, postRecoveryCounts[key] - baselineCounts[key]])),
  outputs,
  interpretation: 'This layer tests only whether missing OGE interval endpoints can be recovered from literal, source-page date tokens under the pinned strict rule. It does not repair OCR by intuition, infer an ownership period from a report date, resolve entity identity, establish beneficial ownership, or create a crossing.',
  verification_status: 'machine_generated_unreviewed',
  causal_status: 'not_established',
  graph_effect: 'none',
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestText);
if (durableOutput) {
  const target = path.resolve(root, durableOutput);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, manifestText);
}
console.log(`oge-date-recovery: OK (${unknown.length} unknown candidates; ${overlays.length} dates recovered; ${evidenceRows.length} unique source rows audited)`);
