import assert from 'node:assert/strict';
import fs from 'node:fs';

const m = JSON.parse(fs.readFileSync('data/research/nara-disclosure-locators.json', 'utf8'));
const ALLOWED = new Set(['archive_locator_required', 'unavailable_after_search', 'ingested_partial', 'blocked_requires_request']);

assert.equal(m.schema_version, 'nara-disclosure-locators@2');
assert.equal(m.graph_effect, 'none');
assert.equal(m.normalized_beneficial_interest_records, 0);
assert.equal(m.members.length, 8);
assert.equal(Object.hasOwn(m, 'cross_member_queries'), false, 'ambiguous query/locator field removed');
assert.ok(Array.isArray(m.cross_member_search_hits));
assert.ok(Array.isArray(m.downloaded_artifacts));

const RELEVANCE = new Set(['verified_on_topic', 'candidate', 'unrelated', 'unresolved']);
assert.deepEqual(new Set(m.relevance_vocabulary), RELEVANCE);
assert.ok(RELEVANCE.has(m.default_search_hit_relevance));
const relevanceOf = hit => hit.relevance ?? m.default_search_hit_relevance;

// A catalog search hit is not a verified disclosure locator: keyword_result_count must never be
// presented as a disclosure count, and the interpretation must say so.
assert.ok(m.interpretation.some(s => /keyword.*denominator|denominator.*NOT a count/i.test(s)), 'keyword-denominator caveat present');
assert.ok(m.interpretation.some(s => /search hit.*not a verified disclosure locator/i.test(s)), 'search-hit-not-locator caveat present');

let hashed = 0;
let emittedSearchHits = m.cross_member_search_hits.length;
const verifiedMembers = [];
const candidateMembers = [];
const nullMembers = [];
for (const member of m.members) {
  assert.ok(ALLOWED.has(member.coverage_state), `${member.person_id}: valid coverage state`);
  hashed += member.documents_hashed;
  assert.equal(Object.hasOwn(member, 'strongest_locators'), false, `${member.person_id}: search hits are not called strongest locators`);
  emittedSearchHits += member.search_hits.length;
  for (const hit of member.search_hits) {
    assert.ok(/^https?:\/\//.test(hit.url));
    assert.ok(RELEVANCE.has(relevanceOf(hit)), `${member.person_id}: classified relevance`);
    if (hit.relevance && hit.relevance !== 'unresolved') assert.ok(String(hit.relevance_basis ?? '').trim(), `${member.person_id}: classified hit has basis`);
    assert.ok(hit.keyword_result_count === null || Number.isInteger(hit.keyword_result_count));
  }
  if (member.search_hits.some(hit => relevanceOf(hit) === 'verified_on_topic')) verifiedMembers.push(member.person_id);
  if (member.search_hits.some(hit => relevanceOf(hit) === 'candidate')) candidateMembers.push(member.person_id);
  assert.equal(member.no_classified_on_topic_hit, !member.search_hits.some(hit => ['verified_on_topic', 'candidate'].includes(relevanceOf(hit))), `${member.person_id}: classified-hit absence reconciles`);
  if (member.no_classified_on_topic_hit) nullMembers.push(member.person_id);
}
assert.equal(hashed, m.totals.digitized_items_downloaded_and_hashed);
assert.equal(hashed, m.downloaded_artifacts.length, 'every claimed hash has a durable artifact receipt');
assert.equal(emittedSearchHits, m.totals.search_hits_durably_emitted, 'durable search-hit count reconciles');
assert.equal(m.blocked_requires_request.length, m.totals.blocked_requests_durably_emitted, 'blocked requests reconcile separately');
assert.deepEqual(m.totals.members_with_verified_on_topic_hits, verifiedMembers);
assert.deepEqual(m.totals.members_with_candidate_hits, candidateMembers);
assert.deepEqual(m.totals.members_without_classified_on_topic_hits, nullMembers);
for (const artifact of m.downloaded_artifacts) {
  assert.ok(/^https?:\/\//.test(artifact.artifact_url), 'artifact has direct URL');
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(artifact.bytes) && artifact.bytes > 0, 'artifact has positive byte count');
  assert.equal(Number.isNaN(Date.parse(artifact.retrieved_at)), false, 'artifact has retrieval timestamp');
  assert.ok(RELEVANCE.has(artifact.relevance));
}
for (const hit of [...m.cross_member_search_hits, ...m.blocked_requires_request]) {
  assert.ok(RELEVANCE.has(relevanceOf(hit)), 'cross-member/blocked search hit has classified relevance');
  if (hit.relevance && hit.relevance !== 'unresolved') assert.ok(String(hit.relevance_basis ?? '').trim(), 'classified search hit has basis');
}

// The previous run reported one hash only in an unavailable ignored input. It must remain a
// non-durable historical claim, never counted as an emitted receipt.
assert.equal(m.totals.digitized_items_downloaded_and_hashed, 0);
assert.equal(m.unavailable_run_claims?.digitized_items_reported_downloaded_and_hashed, 1);
assert.equal(m.unavailable_run_claims?.status, 'not_durably_reproducible');
assert.ok(m.unavailable_run_claims?.queries_reported > m.totals.search_hits_durably_emitted + m.totals.blocked_requests_durably_emitted, 'unavailable run count stays separate from durable records');

// zero-result queries must be preserved (unavailable_after_search), not dropped.
assert.ok(m.totals.members_without_classified_on_topic_hits.length >= 1, 'unresolved search coverage stays visible');

// blocked request must carry a drafted (not sent) request in its note.
if (m.blocked_requires_request.length) {
  assert.ok(m.blocked_requires_request.every(b => /request/i.test(b.note ?? '')), 'blocked items carry drafted-not-sent request');
}

console.log('nara-locators.test.js: OK');
