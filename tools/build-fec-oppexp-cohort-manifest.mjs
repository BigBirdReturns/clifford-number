#!/usr/bin/env node
// Build the durable, additive multi-cycle FEC operating-expenditure manifest from a completed
// acquisition run. The 2004 cycle remains the FROZEN reference baseline (held separately in
// data/research/fec-bulk-oppexp-2004-manifest.json and guarded by validate:disclosures); this
// manifest records the cohort-wide extension (2004 through the latest completed cycle) as
// reproducible metadata (hashes + counts), never the normalized rows.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const runId = process.argv.find(a => a.startsWith('--run-id='))?.slice(9) ?? 'fec-oppexp-cohort-v1';
const manifestsDir = path.join(repoRoot, 'build', 'source-acquisition', runId, 'manifests');
const outFile = path.join(repoRoot, 'data/research/fec-bulk-oppexp-cohort-manifest.json');

const cycleFiles = fs.readdirSync(manifestsDir).filter(f => /^oppexp-\d{4}\.json$/.test(f)).sort();
const cycles = cycleFiles.map(f => JSON.parse(fs.readFileSync(path.join(manifestsDir, f), 'utf8')))
  .filter(m => m.terminal_state === 'scanned')
  .sort((a, b) => a.cycle - b.cycle);

const perPersonTotals = {};
const committeesWithRows = new Set();
for (const c of cycles) {
  for (const [person, n] of Object.entries(c.per_person)) perPersonTotals[person] = (perPersonTotals[person] ?? 0) + n;
  for (const id of c.committees_observed) committeesWithRows.add(id);
}
const cycle2004 = cycles.find(c => c.cycle === 2004);

const manifest = {
  schema_version: 'fec-bulk-oppexp-cohort-manifest@1',
  run_id: runId,
  cohort_id: 'us-presidents-eiga-era-1979-present',
  generated_at: new Date().toISOString(),
  official_index_url: 'https://www.fec.gov/data/browse-data/?tab=bulk-data',
  documentation_url: 'https://www.fec.gov/campaign-finance-data/operating-expenditures-file-description/',
  access_mode: 'public_bulk_download_no_api_key',
  enumeration_method: 'confirmed_by_head_against_documented_pattern',
  parser_version: cycles[0]?.parser_version ?? null,
  frozen_reference_2004: {
    manifest: 'data/research/fec-bulk-oppexp-2004-manifest.json',
    note: 'The 2004 cycle is the frozen reference baseline guarded by validate:disclosures; this manifest re-derives it identically for internal consistency and must match.',
    source_rows_scanned: cycle2004?.source_rows_scanned ?? null,
    matched_reported_rows_observed: cycle2004?.matched_rows ?? null,
  },
  cycles: cycles.map(c => ({
    cycle: c.cycle,
    resolved_url: c.resolved_url,
    zip_bytes: c.zip_bytes,
    zip_sha256: c.zip_sha256,
    extracted_bytes: c.extracted_bytes,
    extracted_sha256: c.extracted_sha256,
    source_rows_scanned: c.source_rows_scanned,
    matched_reported_rows: c.matched_rows,
    distinct_transaction_report_keys: c.amendment_audit.distinct_transaction_report_keys,
    transaction_report_keys_spanning_multiple_file_numbers: c.amendment_audit.transaction_report_keys_spanning_multiple_file_numbers,
    duplicate_transaction_report_file_keys: c.amendment_audit.duplicate_transaction_report_file_keys,
    report_filing_indicator_counts: c.amendment_audit.report_filing_indicator_counts,
    committees_observed: c.committees_observed,
    per_person: c.per_person,
    per_committee: c.per_committee,
  })),
  totals: {
    cycles_scanned: cycles.map(c => c.cycle),
    total_source_rows_scanned: cycles.reduce((n, c) => n + c.source_rows_scanned, 0),
    total_matched_reported_rows: cycles.reduce((n, c) => n + c.matched_rows, 0),
    per_person_matched_rows: perPersonTotals,
    committees_with_rows: [...committeesWithRows].sort(),
    committees_expected: cycles[0]?.cohort_committees_expected ?? null,
  },
  normalized_beneficial_interest_records: 0,
  crossing_matches: 0,
  interpretation: [
    'Matched rows are reported itemization rows filtered by official committee ID; they are NOT deduplicated unique payments and NOT beneficial-interest findings.',
    'AMNDT_IND is the containing report filing status, not a duplicate-row flag; in every scanned cycle distinct transaction/report keys equal matched rows and none span multiple file numbers.',
    'Cross-era RAW row counts are not comparable as conduct: operating-expenditure cycle files begin with 2003-2004, so pre-2004 members are outside this source window, not clean.',
  ],
  consumption: {
    contract_id: 'public-topology-map@1',
    selection_review_id: 'selection-review-trump-office-business-capital',
    selection_review_status: 'pending_second_party',
    what_this_is: 'A reproducible multi-cycle hash-and-count manifest of official FEC operating-expenditure rows filtered to resolved cohort committees.',
    what_this_is_not: 'A unique-payment count, a beneficial-interest finding, a crossing, a cross-era comparison, or evidence of wrongdoing.',
    copy_ready_caveat: 'Reported itemizations are not unique payments; a committee disbursement is not a beneficial interest; source coverage differs by era. Follow each row to its receipted source file, hash, and evidence state.',
  },
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`fec-oppexp-cohort manifest: ${manifest.cycles.length} cycles, ${manifest.totals.total_matched_reported_rows} matched rows across ${manifest.totals.committees_with_rows.length} committee(s)`);
