import assert from 'node:assert/strict';
import fs from 'node:fs';

const m = JSON.parse(fs.readFileSync('data/research/nara-disclosure-locators.json', 'utf8'));
const ALLOWED = new Set(['archive_locator_required', 'unavailable_after_search', 'ingested_partial', 'blocked_requires_request']);

assert.equal(m.schema_version, 'nara-disclosure-locators@1');
assert.equal(m.graph_effect, 'none');
assert.equal(m.normalized_beneficial_interest_records, 0);
assert.equal(m.members.length, 8);

// A catalog hit is a locator, not an ingestion: keyword_result_count must never be presented as a
// disclosure count, and the interpretation must say so.
assert.ok(m.interpretation.some(s => /keyword.*denominator|denominator.*NOT a count/i.test(s)), 'keyword-denominator caveat present');
assert.ok(m.interpretation.some(s => /LOCATOR, not an ingested disclosure/i.test(s)), 'locator-not-ingestion caveat present');

let hashed = 0;
for (const member of m.members) {
  assert.ok(ALLOWED.has(member.coverage_state), `${member.person_id}: valid coverage state`);
  hashed += member.documents_hashed;
  for (const loc of member.strongest_locators) {
    assert.ok(/^https?:\/\//.test(loc.url));
    if (loc.sha256) assert.match(loc.sha256, /^[a-f0-9]{64}$/);
    assert.ok(loc.keyword_result_count === null || Number.isInteger(loc.keyword_result_count));
  }
}
assert.equal(hashed, m.totals.digitized_items_downloaded_and_hashed);

// zero-result queries must be preserved (unavailable_after_search), not dropped.
assert.ok(m.totals.members_with_on_topic_null.length >= 1, 'on-topic nulls preserved');

// blocked request must carry a drafted (not sent) request in its note.
if (m.blocked_requires_request.length) {
  assert.ok(m.blocked_requires_request.every(b => /request/i.test(b.note ?? '')), 'blocked items carry drafted-not-sent request');
}

console.log('nara-locators.test.js: OK');
