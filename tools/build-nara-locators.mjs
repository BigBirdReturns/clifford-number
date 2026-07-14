#!/usr/bin/env node
// Build a durable NARA catalog search/custody artifact from an acquisition run's
// nara-locators.jsonl. A catalog hit is not a verified disclosure locator; result_count is a
// loose keyword denominator, not a count of disclosure records. Search hits stay explicitly
// classified and do not become locators merely because they have a NAID. A downloaded artifact
// counts only when its direct URL and SHA-256 are both durably emitted. No private content is
// recorded.
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
const RELEVANCE_STATES = new Set(['verified_on_topic', 'candidate', 'unrelated', 'unresolved']);

const rows = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const shaOf = row => /^[a-f0-9]{64}$/.test(row?.sha256 ?? '') ? row.sha256 : null;
const relevanceOf = row => RELEVANCE_STATES.has(row?.relevance) ? row.relevance : 'unresolved';

const toSearchHit = r => ({
  person_id: r.person_id ?? null,
  query: r.query,
  url: r.url,
  naid: r.naid ?? null,
  keyword_result_count: Number.isFinite(r.result_count) ? r.result_count : null,
  collection_hierarchy: r.collection_hierarchy ?? null,
  date_span: r.date_span ?? null,
  digitized: r.digitized ?? null,
  relevance: relevanceOf(r),
  relevance_basis: r.relevance_basis ?? null,
  coverage_state: r.coverage_state,
  note: r.note ?? null,
});

for (const r of rows) {
  if (!ALLOWED_STATES.has(r.coverage_state)) throw new Error(`invalid NARA coverage_state: ${r.coverage_state}`);
  if (r.relevance != null && !RELEVANCE_STATES.has(r.relevance)) throw new Error(`invalid NARA relevance: ${r.relevance}`);
  if (r.relevance != null && r.relevance !== 'unresolved' && !String(r.relevance_basis ?? '').trim()) {
    throw new Error(`classified NARA search hit lacks relevance_basis: ${r.naid ?? r.query ?? 'unknown'}`);
  }
  if (shaOf(r) && !/^https?:\/\//.test(r.artifact_url ?? '')) {
    throw new Error(`hashed NARA artifact lacks direct artifact_url: ${r.naid ?? r.query ?? 'unknown'}`);
  }
  if (shaOf(r) && (!Number.isInteger(r.bytes) || r.bytes <= 0)) {
    throw new Error(`hashed NARA artifact lacks positive byte count: ${r.naid ?? r.query ?? 'unknown'}`);
  }
  if (shaOf(r) && Number.isNaN(Date.parse(r.retrieved_at ?? ''))) {
    throw new Error(`hashed NARA artifact lacks retrieved_at: ${r.naid ?? r.query ?? 'unknown'}`);
  }
}

const downloadedArtifacts = rows.filter(r => shaOf(r)).map(r => ({
  person_id: r.person_id ?? null,
  query: r.query ?? null,
  naid: r.naid ?? null,
  artifact_url: r.artifact_url,
  bytes: Number.isInteger(r.bytes) ? r.bytes : null,
  sha256: shaOf(r),
  retrieved_at: r.retrieved_at ?? null,
  relevance: relevanceOf(r),
}));

const members = MEMBERS.map(person_id => {
  const own = rows.filter(r => r.person_id === person_id);
  const artifacts = downloadedArtifacts.filter(r => r.person_id === person_id);
  const searchHits = own.filter(r => r.naid).map(toSearchHit);
  const candidateHits = searchHits.filter(r => r.relevance === 'verified_on_topic' || r.relevance === 'candidate');
  const rollup = artifacts.length ? 'ingested_partial'
    : searchHits.length ? 'archive_locator_required'
      : own.some(r => r.coverage_state === 'blocked_requires_request') ? 'blocked_requires_request'
        : own.every(r => r.coverage_state === 'unavailable_after_search') && own.length ? 'unavailable_after_search'
          : 'archive_locator_required';
  return {
    person_id,
    coverage_state: rollup,
    documents_hashed: artifacts.length,
    search_hits: searchHits,
    no_classified_on_topic_hit: candidateHits.length === 0,
  };
});

const crossMember = rows.filter(r => !r.person_id && r.naid).map(toSearchHit);
const blocked = rows.filter(r => r.coverage_state === 'blocked_requires_request').map(toSearchHit);
const durableSearchHitCount = members.reduce((n, m) => n + m.search_hits.length, 0) + crossMember.length;

const manifest = {
  schema_version: 'nara-disclosure-locators@2',
  cohort_id: 'us-presidents-eiga-era-1979-present',
  source_id: 'nara-presidential-records',
  official_url: 'https://www.archives.gov/presidential-libraries',
  catalog_endpoint: 'https://catalog.archives.gov/proxy/records/search',
  access_mode: 'public_catalog_and_archival_request',
  generated_at: new Date().toISOString(),
  relevance_vocabulary: [...RELEVANCE_STATES],
  default_search_hit_relevance: 'unresolved',
  classification_status: rows.every(r => RELEVANCE_STATES.has(r.relevance)) ? 'source_explicit' : 'unclassified_hits_default_to_unresolved',
  members,
  cross_member_search_hits: crossMember,
  blocked_requires_request: blocked,
  downloaded_artifacts: downloadedArtifacts,
  totals: {
    search_hits_durably_emitted: durableSearchHitCount,
    blocked_requests_durably_emitted: blocked.length,
    digitized_items_downloaded_and_hashed: downloadedArtifacts.length,
    members_with_search_hits: members.filter(m => m.search_hits.length > 0).map(m => m.person_id),
    members_with_verified_on_topic_hits: members.filter(m => m.search_hits.some(h => h.relevance === 'verified_on_topic')).map(m => m.person_id),
    members_with_candidate_hits: members.filter(m => m.search_hits.some(h => h.relevance === 'candidate')).map(m => m.person_id),
    members_without_classified_on_topic_hits: members.filter(m => m.no_classified_on_topic_hit).map(m => m.person_id),
    blocked_requires_request: blocked.length,
  },
  interpretation: [
    'A catalog search hit (NAID) is not a verified disclosure locator; relevance is explicit and defaults conservatively to unresolved.',
    'Only artifacts whose direct artifact URL and SHA-256 are emitted in downloaded_artifacts count as acquired.',
    'keyword_result_count is a loose OR-keyword denominator over the whole catalog, NOT a count of disclosure records; top hits can be unrelated collections.',
    'An unavailable_after_search record is a bounded search null with the exact query, never evidence that no record existed.',
    'The presidential disclosure source plan routes current-window material to OGE; this NARA search-hit artifact does not establish absence from NARA.',
  ],
  consumption: {
    contract_id: 'public-topology-map@1',
    what_this_is: 'A catalog search-hit index (queries, NAIDs, URLs, keyword denominators, and explicit relevance) for the archival route to older-era records.',
    what_this_is_not: 'A verified disclosure set, a holdings extract, a crossing, or evidence of absence.',
    copy_ready_caveat: 'A search result with a NAID is not a verified disclosure locator; only a verified_on_topic classification supports that narrower description, and a keyword denominator is not evidence that responsive records exist.',
  },
  normalized_beneficial_interest_records: 0,
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`nara-disclosure-locators: ${manifest.totals.search_hits_durably_emitted} durable search hits, ${manifest.totals.digitized_items_downloaded_and_hashed} hashed artifact(s), verified-on-topic members [${manifest.totals.members_with_verified_on_topic_hits.join(', ')}]`);
