import assert from 'node:assert/strict';
import fs from 'node:fs';

const m = JSON.parse(fs.readFileSync('data/research/oge-disclosure-locators.json', 'utf8'));
const ALLOWED = new Set(['available_not_ingested', 'ingested_partial', 'archive_locator_required', 'blocked_requires_request', 'unavailable_after_search', 'official_index_query_required']);
const PRIVATE = /"(address|street|ssn|dob|phone|email|holdings)"\s*:/i;

assert.equal(m.schema_version, 'oge-disclosure-locators@1');
assert.equal(m.graph_effect, 'none');
assert.equal(m.normalized_beneficial_interest_records, 0, 'custody artifact must not assert beneficial interests');
assert.equal(m.members.length, 8, 'all eight cohort members represented');

let hashed = 0, locators = 0;
for (const member of m.members) {
  assert.ok(ALLOWED.has(member.coverage_state), `${member.person_id}: valid coverage state`);
  for (const loc of member.locators) {
    locators += 1;
    assert.ok(/^https?:\/\//.test(loc.url), `${member.person_id}: locator has URL`);
    if (loc.sha256) { assert.match(loc.sha256, /^[a-f0-9]{64}$/); hashed += 1; }
    assert.ok(ALLOWED.has(loc.coverage_state));
  }
}
assert.equal(locators, m.totals.locators_recorded, 'locator count reconciles');
assert.equal(hashed, m.totals.documents_downloaded_and_hashed, 'hashed count reconciles');

// members outside the online retention window must be routed to archive, not called "no record".
for (const id of ['jimmy-carter', 'ronald-reagan', 'george-h-w-bush', 'bill-clinton', 'george-w-bush']) {
  const member = m.members.find(x => x.person_id === id);
  assert.equal(member.coverage_state, 'archive_locator_required', `${id} routed to archive`);
}

// No private holdings/fields anywhere in the serialized custody artifact.
assert.doesNotMatch(JSON.stringify(m), PRIVATE, 'no private fields in OGE custody artifact');

console.log('oge-locators.test.js: OK');
