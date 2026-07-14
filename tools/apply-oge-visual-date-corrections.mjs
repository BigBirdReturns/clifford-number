#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { classifyTemporalCandidate } from './lib/oge-fec-temporal-screen.mjs';

const root = process.cwd();
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const candidatesPath = path.resolve(root, arg('candidates', 'build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2/overlap-candidates.jsonl'));
const temporalPath = path.resolve(root, arg('temporal', 'build/oge-fec-temporal-screen/fec-oppexp-cohort-local-20260713-r2/temporal-dispositions.jsonl'));
const interestsPath = path.resolve(root, arg('interests', 'build/oge-beneficial-interests/interests.jsonl'));
const auditPath = path.resolve(root, arg('audit', 'test/audits/oge-fec-temporal-frontier-audit.json'));
const outputDir = path.resolve(root, arg('output-dir', 'build/oge-visual-date-corrections/fec-oppexp-cohort-local-20260713-r2'));
const durableOutput = arg('durable-output', '');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = file => fs.readFileSync(file);
const readJsonl = file => readBytes(file).toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const countBy = (rows, key) => Object.fromEntries([...rows.reduce((counts, row) => {
  const value = row[key]; counts.set(value, (counts.get(value) ?? 0) + 1); return counts;
}, new Map())]);
const writeJsonl = (file, rows) => {
  const body = rows.length ? `${rows.map(JSON.stringify).join('\n')}\n` : '';
  fs.writeFileSync(file, body);
  return { path: path.basename(file), bytes: Buffer.byteLength(body), sha256: sha256(body) };
};
const visibleDate = iso => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${month}/${day}/${year}`;
};

const candidateBytes = readBytes(candidatesPath);
const temporalBytes = readBytes(temporalPath);
const interestBytes = readBytes(interestsPath);
const auditBytes = readBytes(auditPath);
const candidates = new Map(readJsonl(candidatesPath).map(row => [row.overlap_candidate_id, row]));
const temporal = readJsonl(temporalPath);
const interests = readJsonl(interestsPath);
const audit = JSON.parse(auditBytes);
const dateMap = audit.visual_date_recovery.text_layer_to_visible_date;
const reviewedPages = new Set(audit.visual_date_recovery.source_pages_reviewed);
const corrections = new Map();
const dispositions = [];

for (const prior of temporal.filter(row => row.temporal_relation === 'temporally_unknown')) {
  const candidate = candidates.get(prior.overlap_candidate_id);
  if (!candidate || candidate?.holder?.record_kind !== 'reported_transaction') continue;
  const reported = candidate?.interest_dates?.transaction_date_as_reported;
  const normalized = dateMap[reported];
  if (!normalized) continue;
  const inputLine = candidate?.oge_interest_ref?.input_line;
  const interest = interests[inputLine - 1];
  if (!interest
    || interest.source_sha256 !== candidate.oge_interest_ref.source_sha256
    || interest.source_page !== candidate.oge_interest_ref.source_page
    || interest.source_row_label !== candidate.oge_interest_ref.source_row_label) {
    throw new Error(`source receipt mismatch for ${candidate.overlap_candidate_id}`);
  }
  const pageRef = `${interest.source_sha256}#page=${interest.source_page}`;
  if (!reviewedPages.has(pageRef)) throw new Error(`visual-review page missing from audit: ${pageRef}`);
  const correctionId = `oge-visual-date-correction:${sha256(`${interest.source_sha256}\0${interest.source_page}\0${interest.source_row_label}`).slice(0, 32)}`;
  if (!corrections.has(correctionId)) {
    corrections.set(correctionId, {
      schema_version: 'oge-visual-date-correction@1',
      correction_id: correctionId,
      interest_id: candidate.oge_interest_ref.interest_id,
      source_receipt: {
        source_url: candidate.oge_interest_ref.source_url,
        source_sha256: interest.source_sha256,
        source_page: interest.source_page,
        source_row_label: interest.source_row_label,
        raw_text_sha256: interest.raw_text_sha256,
      },
      extracted_text_token: reported,
      visible_source_token: visibleDate(normalized),
      normalized_date: normalized,
      method: 'source_page_visual_review',
      audit_ref: path.relative(root, auditPath).replaceAll('\\', '/'),
      verification_status: 'source_page_visually_reviewed',
      graph_effect: 'none',
    });
  }
  const screened = classifyTemporalCandidate({
    ...candidate,
    interest_dates: { ...candidate.interest_dates, valid_from: normalized, valid_until: normalized },
  });
  if (screened.temporal_relation !== 'non_overlapping') {
    throw new Error(`visual correction did not produce safe non-overlap: ${candidate.overlap_candidate_id}`);
  }
  dispositions.push({
    schema_version: 'oge-visual-date-candidate-disposition@1',
    overlap_candidate_id: candidate.overlap_candidate_id,
    correction_id: correctionId,
    prior_temporal_relation: prior.temporal_relation,
    corrected_temporal_relation: screened.temporal_relation,
    reason: screened.reason,
    eligible_for_identity_review: false,
    graph_effect: 'none',
  });
}

const correctionRows = [...corrections.values()].sort((a, b) => a.correction_id.localeCompare(b.correction_id));
dispositions.sort((a, b) => a.overlap_candidate_id.localeCompare(b.overlap_candidate_id));
if (correctionRows.length !== audit.visual_date_recovery.distinct_interest_rows_with_visually_recovered_dates
  || dispositions.length !== audit.visual_date_recovery.candidate_pairs_with_visually_recovered_dates) {
  throw new Error('visual correction totals do not reconcile to durable audit');
}
fs.mkdirSync(outputDir, { recursive: true });
const outputs = {
  corrections: writeJsonl(path.join(outputDir, 'visual-date-corrections.jsonl'), correctionRows),
  dispositions: writeJsonl(path.join(outputDir, 'visual-date-candidate-dispositions.jsonl'), dispositions),
};
const baseline = countBy(temporal, 'temporal_relation');
const finalDispositions = {
  overlapping: baseline.overlapping ?? 0,
  non_overlapping: (baseline.non_overlapping ?? 0) + dispositions.length,
  temporally_unknown: (baseline.temporally_unknown ?? 0) - dispositions.length,
};
const projected = audit.visual_date_recovery.projected_current_screen_after_source_page_corrections;
for (const key of ['overlapping', 'non_overlapping', 'temporally_unknown']) {
  if (finalDispositions[key] !== projected[key]) throw new Error(`audit reconciliation failed for ${key}`);
}
const manifest = {
  schema_version: 'oge-visual-date-correction-manifest@1',
  inputs: {
    overlap_candidates: { path: path.relative(root, candidatesPath).replaceAll('\\', '/'), bytes: candidateBytes.length, sha256: sha256(candidateBytes) },
    temporal_dispositions: { path: path.relative(root, temporalPath).replaceAll('\\', '/'), bytes: temporalBytes.length, sha256: sha256(temporalBytes) },
    oge_interests: { path: path.relative(root, interestsPath).replaceAll('\\', '/'), bytes: interestBytes.length, sha256: sha256(interestBytes) },
    visual_audit: { path: path.relative(root, auditPath).replaceAll('\\', '/'), bytes: auditBytes.length, sha256: sha256(auditBytes) },
  },
  source_rows_corrected: correctionRows.length,
  candidate_pairs_reclassified: dispositions.length,
  baseline_dispositions: baseline,
  post_visual_review_dispositions: finalDispositions,
  outputs,
  corrections: correctionRows,
  interpretation: 'Rendered source-page review repairs only visibly legible transaction dates. It does not invent dates for structurally undated interests, establish a same-entity link, prove ownership, characterize payment semantics, or create a crossing.',
  verification_status: 'source_page_visual_review_reconciled_to_hash_pinned_inputs',
  graph_effect: 'none',
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestText);
if (durableOutput) {
  const target = path.resolve(root, durableOutput);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, manifestText);
}
console.log(`oge-visual-date-corrections: OK (${correctionRows.length} rows; ${dispositions.length} pairs; ${finalDispositions.non_overlapping} non-overlapping; ${finalDispositions.temporally_unknown} unknown)`);
