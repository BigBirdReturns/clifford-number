#!/usr/bin/env node
// Validate the additive multi-cycle FEC operating-expenditure cohort manifest.
// Guards: 2004 stays the frozen reference (identical to the guarded 2004 manifest); every scanned
// cycle preserves corrected amendment semantics (distinct keys == matched rows, none span files);
// beneficial-interest and crossing counts stay honestly zero; graph_effect stays none.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateFecOppexpCohort(manifest, frozen2004) {
  const errors = [];
  const push = m => errors.push(m);
  if (manifest?.schema_version !== 'fec-bulk-oppexp-cohort-manifest@1') push('invalid schema_version');
  if (manifest?.cohort_id !== 'us-presidents-eiga-era-1979-present') push('invalid cohort_id');
  if (manifest?.graph_effect !== 'none') push('graph_effect must be none');
  if (manifest?.verification_status !== 'machine_proposed_unverified') push('verification_status must be machine_proposed_unverified');
  if (manifest?.causal_status !== 'not_established') push('causal_status must be not_established');
  if (manifest?.normalized_beneficial_interest_records !== 0) push('beneficial-interest records must remain 0 until disclosures are parsed');
  if (manifest?.crossing_matches !== 0) push('crossing matches must remain 0 until the crossing gate is run');
  if (manifest?.access_mode !== 'public_bulk_download_no_api_key') push('access mode must be the no-key bulk route');

  const cycles = Array.isArray(manifest?.cycles) ? manifest.cycles : [];
  if (!cycles.length) push('no scanned cycles present');
  const seen = new Set();
  let personTally = {};
  const committees = new Set();
  for (const c of cycles) {
    if (seen.has(c.cycle)) push(`duplicate cycle ${c.cycle}`);
    seen.add(c.cycle);
    if (!/^https?:\/\//.test(c.resolved_url ?? '')) push(`cycle ${c.cycle}: missing resolved_url`);
    if (!/^[a-f0-9]{64}$/.test(c.extracted_sha256 ?? '')) push(`cycle ${c.cycle}: missing extracted_sha256`);
    if (!Number.isInteger(c.source_rows_scanned) || c.source_rows_scanned <= 0) push(`cycle ${c.cycle}: invalid source_rows_scanned`);
    // corrected amendment semantics must hold in every cycle
    if (c.matched_reported_rows !== c.distinct_transaction_report_keys) push(`cycle ${c.cycle}: matched rows != distinct transaction/report keys (regressed amendment semantics)`);
    if (c.transaction_report_keys_spanning_multiple_file_numbers !== 0) push(`cycle ${c.cycle}: unexpected key spanning multiple file numbers`);
    if (c.duplicate_transaction_report_file_keys !== 0) push(`cycle ${c.cycle}: unexpected duplicate transaction/report/file keys`);
    if (c.matched_reported_rows < 0) push(`cycle ${c.cycle}: negative matched rows`);
    for (const [p, n] of Object.entries(c.per_person ?? {})) personTally[p] = (personTally[p] ?? 0) + n;
    for (const id of c.committees_observed ?? []) committees.add(id);
  }

  // 2004 frozen-reference consistency: the cohort manifest must re-derive it identically.
  const c2004 = cycles.find(c => c.cycle === 2004);
  if (!c2004) push('2004 frozen reference cycle missing from cohort manifest');
  else if (c2004.source_rows_scanned !== 954706 || c2004.matched_reported_rows !== 27862 || c2004.distinct_transaction_report_keys !== 27862) {
    push('2004 cycle regressed away from the frozen 954706/27862 baseline');
  }
  if (frozen2004) {
    if (frozen2004.source_rows_scanned !== c2004?.source_rows_scanned || frozen2004.matched_reported_rows_observed !== c2004?.matched_reported_rows) {
      push('cohort manifest 2004 cycle disagrees with the guarded frozen 2004 manifest');
    }
    if (frozen2004.extracted_source_sha256 !== c2004?.extracted_sha256) push('cohort manifest 2004 extracted hash disagrees with the frozen manifest');
  }

  // totals reconcile with per-cycle sums
  const totalMatched = cycles.reduce((n, c) => n + c.matched_reported_rows, 0);
  if (manifest?.totals?.total_matched_reported_rows !== totalMatched) push('totals.total_matched_reported_rows does not reconcile with per-cycle sums');
  for (const [p, n] of Object.entries(manifest?.totals?.per_person_matched_rows ?? {})) {
    if (personTally[p] !== n) push(`per-person total mismatch for ${p}`);
  }
  if ((manifest?.totals?.committees_with_rows ?? []).length !== committees.size) push('committees_with_rows does not reconcile');
  if (!Array.isArray(manifest?.interpretation) || !manifest.interpretation.some(s => /not.*unique payment/i.test(s))) push('missing unique-payment interpretation guardrail');
  if (!manifest?.interpretation?.some(s => /cross-era/i.test(s))) push('missing cross-era comparability guardrail');
  if (manifest?.consumption?.selection_review_status !== 'pending_second_party') push('consumption must keep review status pending_second_party');
  return errors;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/research/fec-bulk-oppexp-cohort-manifest.json'), 'utf8'));
  const frozen2004 = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/research/fec-bulk-oppexp-2004-manifest.json'), 'utf8'));
  const errors = validateFecOppexpCohort(manifest, frozen2004);
  if (errors.length) {
    console.error('validate-fec-oppexp-cohort failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`validate-fec-oppexp-cohort: OK (${manifest.cycles.length} cycles, ${manifest.totals.total_matched_reported_rows} matched rows, beneficial ${manifest.normalized_beneficial_interest_records}, crossings ${manifest.crossing_matches})`);
}
