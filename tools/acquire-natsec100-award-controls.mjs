#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateGenericCrossing } from './lib/generic-crossing.mjs';
import { diagnoseAwardSearch } from './lib/award-search-evidence.mjs';

const root = process.cwd();
const outputDir = path.resolve(root, 'build/source-acquisition/natsec100-award-controls');
const durableOutput = path.resolve(root, 'data/research/natsec100-award-control-manifest.json');
const endpoint = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const leads = [
  { company_id: 'sierra_space', query: 'SIERRA SPACE', reported_amount: 175000000, reported_program: 'Tranche 2 Tracking Layer' },
  { company_id: 'x_bow_systems', query: 'X-BOW LAUNCH SYSTEMS', reported_amount: 129000000, reported_program: 'Advanced Integrated Motor Manufacturing' },
  { company_id: 'jetzero', query: 'JETZERO', reported_amount: 81000000, reported_program: 'Blended Wing Body Prototype' },
  { company_id: 'dataminr', query: 'DATAMINR', reported_amount: 70000000, reported_program: 'PADELS' },
  { company_id: 'castelion', query: 'CASTELION', reported_amount: 40000000, reported_program: 'Low-Cost Highly Manufacturable Weapon Production' },
];
const fields = ['Award ID','Recipient Name','Recipient UEI','Awarding Agency','Award Amount','Start Date','End Date','Description','Award Type'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const overlapsFy25 = row => String(row['Start Date'] ?? '') <= '2025-09-30' && String(row['End Date'] ?? '') >= '2024-10-01';

fs.mkdirSync(outputDir, { recursive: true });
const allRows = [];
const queryRuns = [];
for (const lead of leads) {
  const body = {
    filters: {
      award_type_codes: ['A','B','C','D'], recipient_search_text: [lead.query],
      time_period: [{ start_date: '2024-10-01', end_date: '2025-09-30' }],
    },
    fields, limit: 100, page: 1, sort: 'Award Amount', order: 'desc',
  };
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`USAspending ${lead.company_id}: HTTP ${response.status}: ${responseText.slice(0, 200)}`);
  const payload = JSON.parse(responseText);
  const rows = (payload.results ?? []).map(row => ({
    company_id: lead.company_id, query: lead.query, award_id: row['Award ID'], recipient_name: row['Recipient Name'],
    recipient_uei: row['Recipient UEI'], awarding_agency: row['Awarding Agency'], awarding_agency_id: row.awarding_agency_id,
    award_amount: row['Award Amount'], start_date: row['Start Date'], end_date: row['End Date'], description: row.Description,
    exact_lead_name_candidate: normalize(row['Recipient Name']).startsWith(normalize(lead.query)),
    fy2025_period_overlap: overlapsFy25(row), graph_effect: 'none',
  }));
  allRows.push(...rows);
  const summaryDiagnostics = diagnoseAwardSearch(rows, lead);
  queryRuns.push({
    ...lead, request_body: body, response_sha256: sha256(responseText), response_bytes: Buffer.byteLength(responseText),
    result_rows: rows.length, distinct_recipient_ueis: [...new Set(rows.map(row => row.recipient_uei).filter(Boolean))].sort(),
    ...summaryDiagnostics,
  });
  fs.writeFileSync(path.join(outputDir, `${lead.company_id}.response.json`), responseText);
}
const rowsText = allRows.map(JSON.stringify).join('\n') + (allRows.length ? '\n' : '');
fs.writeFileSync(path.join(outputDir, 'award-rows.jsonl'), rowsText);

const positiveRow = allRows.find(row => row.award_id && row.recipient_uei && row.awarding_agency_id
  && row.awarding_agency === 'Department of Defense' && row.fy2025_period_overlap);
if (!positiveRow) throw new Error('no source-native USAspending award positive found');
const positiveRun = queryRuns.find(run => run.company_id === positiveRow.company_id);
const positive = evaluateGenericCrossing({
  predicate: 'reports_award_to', allowed_predicates: ['reports_award_to'],
  endpoints: [
    { role: 'agency', resolution: { disposition: 'accepted', accepted_entity_id: `usaspending-agency:${positiveRow.awarding_agency_id}` } },
    { role: 'recipient', resolution: { disposition: 'accepted', accepted_entity_id: `uei:${positiveRow.recipient_uei}` } },
  ],
  receipts: [{
    role: 'award_record', content_sha256: positiveRun.response_sha256, locator_url: endpoint,
    provenance_chain_id: `usaspending-query:${positiveRun.company_id}:fy2025`, evidence_class: 'official', locator_status: 'public',
  }],
  required_receipt_roles: ['award_record'], manifest_hashes: queryRuns.map(run => run.response_sha256),
  interval_a: { valid_from: positiveRow.start_date, valid_until: positiveRow.end_date },
  interval_b: { valid_from: '2024-10-01', valid_until: '2025-09-30' },
});
if (positive.gate !== 'pass') throw new Error(`USAspending source-native positive held: ${positive.failures.join(', ')}`);

const manifest = {
  schema_version: 'natsec100-award-control-manifest@1',
  source: { provider: 'USAspending.gov', endpoint, access_mode: 'official_public_no_key_api', fields },
  selection: {
    basis: 'All five medium-confidence FY2025 Air Force award leads already frozen in NatSec100 chunk1 CE0363-CE0367; no new person or company was selected.',
    lead_count: leads.length,
  },
  queries: queryRuns,
  coverage: {
    leads_queried: leads.length, official_award_rows_observed: allRows.length,
    leads_with_official_rows: queryRuns.filter(run => run.result_rows > 0).length,
    trade_summaries_exactly_verified: queryRuns.filter(run => run.trade_summary_exactly_verified).length,
  },
  source_native_real_positive: {
    award: positiveRow, gate: positive,
    establishes: 'USAspending reports the identified award from the source-native agency ID to the source-native recipient UEI for a period overlapping FY2025.',
    does_not_establish: ['identity with the NatSec100 company row', 'the separate trade-summary amount or program description', 'favoritism', 'wrongdoing'],
  },
  cross_corpus_join_status: 'held_identity_unresolved',
  cross_corpus_identity_gap: 'NatSec100 identifies the company by reported name and website; USAspending identifies the recipient by UEI. No shared source-native identifier has yet been acquired, so name similarity cannot merge them.',
  outputs: { award_rows: { path: 'build/source-acquisition/natsec100-award-controls/award-rows.jsonl', bytes: Buffer.byteLength(rowsText), sha256: sha256(rowsText) } },
  interpretation: 'Official award rows upgrade the source plane. They do not automatically validate the five summarized FY2025 amounts, resolve roster-to-UEI identity, or establish an investor/company/award crossing.',
  verification_status: 'machine_reproduced_from_official_api', causal_status: 'not_established', graph_effect: 'none',
};
fs.writeFileSync(durableOutput, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`natsec100-award-controls: ${allRows.length} official rows across ${manifest.coverage.leads_with_official_rows}/${leads.length} leads; source-native positive ${positive.gate}; cross-corpus join held`);
