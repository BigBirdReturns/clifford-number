#!/usr/bin/env node
// Build a durable OGE public financial-disclosure custody artifact from an acquisition run's
// oge-locators.jsonl. Records only public metadata (URL, document type, dates, bytes, SHA-256,
// coverage state) — never disclosure holdings or private fields. The hashed PDFs themselves live
// in the run's gitignored raw/oge cache, reproducible from these URLs + hashes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const runId = process.argv.find(a => a.startsWith('--run-id='))?.slice(9) ?? 'fec-oppexp-cohort-v1';
const src = path.join(repoRoot, 'build', 'source-acquisition', runId, 'normalized', 'oge-locators.jsonl');
const outFile = path.join(repoRoot, 'data/research/oge-disclosure-locators.json');

const MEMBERS = ['jimmy-carter', 'ronald-reagan', 'george-h-w-bush', 'bill-clinton', 'george-w-bush', 'barack-obama', 'donald-trump', 'joe-biden'];
const ALLOWED_STATES = new Set(['available_not_ingested', 'ingested_partial', 'archive_locator_required', 'blocked_requires_request', 'unavailable_after_search', 'official_index_query_required']);
const PRIVATE_KEYS = new Set(['address', 'street', 'ssn', 'dob', 'date_of_birth', 'phone', 'email', 'holdings', 'asset', 'value']);

const rows = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
for (const r of rows) {
  for (const k of Object.keys(r)) if (PRIVATE_KEYS.has(k.toLowerCase())) throw new Error(`private field leaked into OGE locator: ${k}`);
  if (!ALLOWED_STATES.has(r.coverage_state)) throw new Error(`invalid coverage_state: ${r.coverage_state}`);
}

const members = MEMBERS.map(person_id => {
  const own = rows.filter(r => r.person_id === person_id);
  const hashed = own.filter(r => r.sha256);
  const blocked = own.filter(r => r.coverage_state === 'blocked_requires_request');
  const rollup = hashed.length ? 'ingested_partial'
    : blocked.length ? 'blocked_requires_request'
      : own.some(r => r.coverage_state === 'archive_locator_required') ? 'archive_locator_required'
        : own[0]?.coverage_state ?? 'available_not_ingested';
  return {
    person_id,
    coverage_state: rollup,
    documents_hashed: hashed.length,
    locators: own.map(r => ({
      url: r.url, document_type: r.document_type ?? null, reporting_period: r.reporting_period ?? null,
      filing_date: r.filing_date ?? null, bytes: r.bytes ?? null, sha256: r.sha256 ?? null,
      page_count: r.page_count ?? null, coverage_state: r.coverage_state, retrieved_at: r.retrieved_at ?? null,
      note: r.note ?? null,
    })),
  };
});

const manifest = {
  schema_version: 'oge-disclosure-locators@1',
  cohort_id: 'us-presidents-eiga-era-1979-present',
  source_id: 'oge-officials-individual-disclosures',
  official_url: 'https://www.oge.gov/web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection',
  documentation_url: 'https://www.oge.gov/Web/OGE.nsf/publicresources_disclosure-quickstart?OpenForm=&Seq=1',
  access_mode: 'public_index_or_statutory_request',
  generated_at: new Date().toISOString(),
  members,
  totals: {
    locators_recorded: rows.length,
    documents_downloaded_and_hashed: rows.filter(r => r.sha256).length,
    distinct_sha256: new Set(rows.filter(r => r.sha256).map(r => r.sha256)).size,
    blocked_requires_request: rows.filter(r => r.coverage_state === 'blocked_requires_request').length,
    members_with_online_documents: members.filter(m => m.documents_hashed > 0).map(m => m.person_id),
    members_routed_to_archive: members.filter(m => m.coverage_state === 'archive_locator_required').map(m => m.person_id),
  },
  interpretation: [
    'A downloaded disclosure PDF is primary evidence of what the filer reported; holdings are NOT parsed here (acquisition/custody only).',
    'An absent current OGE result reflects statutory retention/destruction, not evidence that no report or interest existed; those members are routed to NARA as archive_locator_required.',
    'Candidate reports gated behind the OGE "201 Request" form are marked blocked_requires_request; no request was submitted.',
    'Filer, spouse, joint, and dependent-child scopes are not merged and holdings are not asserted.',
  ],
  consumption: {
    contract_id: 'public-topology-map@1',
    what_this_is: 'A custody index of public presidential/candidate financial-disclosure documents (URLs + hashes + coverage states).',
    what_this_is_not: 'A beneficial-interest finding, a holdings extract, a crossing, or evidence of absence for members outside the online window.',
    copy_ready_caveat: 'Custody is not content. A hashed document establishes what was published where; it does not resolve any asset, entity, ownership scope, or crossing.',
  },
  normalized_beneficial_interest_records: 0,
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`oge-disclosure-locators: ${manifest.totals.locators_recorded} locators, ${manifest.totals.documents_downloaded_and_hashed} hashed, online docs for [${manifest.totals.members_with_online_documents.join(', ')}]`);
