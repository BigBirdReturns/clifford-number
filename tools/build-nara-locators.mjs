#!/usr/bin/env node
// Build a durable NARA catalog custody/locator artifact from an acquisition run's
// nara-locators.jsonl. A catalog hit is a LOCATOR, not an ingested disclosure; result_count is a
// loose keyword denominator, not a count of disclosure records. Only one digitized item was
// downloaded + hashed. No private content is recorded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const runId = process.argv.find(a => a.startsWith('--run-id='))?.slice(9) ?? 'fec-oppexp-cohort-v1';
const src = path.join(repoRoot, 'build', 'source-acquisition', runId, 'normalized', 'nara-locators.jsonl');
const outFile = path.join(repoRoot, 'data/research/nara-disclosure-locators.json');

const MEMBERS = ['jimmy-carter', 'ronald-reagan', 'george-h-w-bush', 'bill-clinton', 'george-w-bush', 'barack-obama', 'donald-trump', 'joe-biden'];
const ALLOWED_STATES = new Set(['archive_locator_required', 'unavailable_after_search', 'ingested_partial', 'blocked_requires_request']);

const rows = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const shaOf = note => (String(note ?? '').match(/[a-f0-9]{64}/) ?? [null])[0];

const toLocator = r => ({
  person_id: r.person_id ?? null,
  query: r.query,
  url: r.url,
  naid: r.naid ?? null,
  keyword_result_count: Number.isFinite(r.result_count) ? r.result_count : null,
  collection_hierarchy: r.collection_hierarchy ?? null,
  date_span: r.date_span ?? null,
  digitized: r.digitized ?? null,
  sha256: shaOf(r.note),
  coverage_state: r.coverage_state,
  note: r.note ?? null,
});

for (const r of rows) if (!ALLOWED_STATES.has(r.coverage_state)) throw new Error(`invalid NARA coverage_state: ${r.coverage_state}`);

const members = MEMBERS.map(person_id => {
  const own = rows.filter(r => r.person_id === person_id);
  const hashed = own.filter(r => shaOf(r.note));
  const digitizedLocators = own.filter(r => r.digitized && r.naid);
  const rollup = hashed.length ? 'ingested_partial'
    : digitizedLocators.length ? 'archive_locator_required'
      : own.some(r => r.coverage_state === 'blocked_requires_request') ? 'blocked_requires_request'
        : own.every(r => r.coverage_state === 'unavailable_after_search') && own.length ? 'unavailable_after_search'
          : 'archive_locator_required';
  return {
    person_id,
    coverage_state: rollup,
    documents_hashed: hashed.length,
    strongest_locators: own.filter(r => r.naid).slice(0, 6).map(toLocator),
    on_topic_null: own.some(r => r.coverage_state === 'unavailable_after_search'),
  };
});

const crossMember = rows.filter(r => !r.person_id).map(toLocator);
const blocked = rows.filter(r => r.coverage_state === 'blocked_requires_request').map(toLocator);

const manifest = {
  schema_version: 'nara-disclosure-locators@1',
  cohort_id: 'us-presidents-eiga-era-1979-present',
  source_id: 'nara-presidential-records',
  official_url: 'https://www.archives.gov/presidential-libraries',
  catalog_endpoint: 'https://catalog.archives.gov/proxy/records/search',
  access_mode: 'public_catalog_and_archival_request',
  generated_at: new Date().toISOString(),
  members,
  cross_member_queries: crossMember,
  blocked_requires_request: blocked,
  totals: {
    queries_recorded: rows.length,
    digitized_items_downloaded_and_hashed: rows.filter(r => shaOf(r.note)).length,
    members_with_archive_locators: members.filter(m => m.strongest_locators.length > 0).map(m => m.person_id),
    members_with_on_topic_null: members.filter(m => m.on_topic_null).map(m => m.person_id),
    blocked_requires_request: blocked.length,
  },
  interpretation: [
    'A catalog hit (NAID) is a LOCATOR, not an ingested disclosure; only downloaded + hashed items count as acquired.',
    'keyword_result_count is a loose OR-keyword denominator over the whole catalog, NOT a count of disclosure records; top hits can be unrelated collections.',
    'Zero on-topic results are preserved as unavailable_after_search with the exact query, never rewritten as "no record existed."',
    'Modern presidents (Trump, Biden, and most personal SF-278 for Obama/G.W. Bush) are not in NARA as presidential financial-disclosure records; that material lives in OGE\'s online window.',
  ],
  consumption: {
    contract_id: 'public-topology-map@1',
    what_this_is: 'A catalog locator index (NAIDs, URLs, keyword denominators) plus one hashed digitized disclosure, for the archival route to older-era records.',
    what_this_is_not: 'A verified disclosure set, a holdings extract, a crossing, or evidence of absence.',
    copy_ready_caveat: 'A NAID locates candidate material; it does not verify a disclosure, and a keyword denominator is not evidence that responsive records exist.',
  },
  normalized_beneficial_interest_records: 0,
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`nara-disclosure-locators: ${manifest.totals.queries_recorded} queries, ${manifest.totals.digitized_items_downloaded_and_hashed} hashed, archive locators for [${manifest.totals.members_with_archive_locators.join(', ')}]`);
