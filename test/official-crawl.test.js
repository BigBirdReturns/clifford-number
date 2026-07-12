import assert from 'node:assert/strict';
import fs from 'node:fs';
import { candidateFromObservation, containsPrivateContact, observationFromRecord, recordMatchBasis, recordMatchesTerm, sha256, stableJson } from '../tools/lib/official-crawl.mjs';

const fixture = name => JSON.parse(fs.readFileSync(`test/fixtures/crawl/${name}.json`, 'utf8'));
const retrievedAt = '2026-07-12T12:00:00Z';
const definitions = [
  ['sam', { id: 'sam-opportunities', adapter: 'sam_opportunities', authority: 'GSA / SAM.gov' }, 'Example Systems', 'procurement_notice'],
  ['usaspending', { id: 'usaspending-awards', adapter: 'usaspending_awards', authority: 'U.S. Treasury' }, 'Example Systems', 'capital_flow'],
  ['sec', { id: 'sec-form-d', adapter: 'sec_form_d', authority: 'SEC' }, 'Example Capital', 'corporate_filing'],
  ['federal-register', { id: 'federal-register', adapter: 'federal_register', authority: 'OFR / GPO' }, 'advisory committee', 'regulatory_notice'],
  ['govuk', { id: 'govuk-search', adapter: 'govuk_search', authority: 'GDS' }, 'AI implementation', 'policy_publication']
];

for (const [name, source, term, eventHint] of definitions) {
  const observation = observationFromRecord(source, term, fixture(name), retrievedAt);
  assert.match(observation.observation_id, /^obs_[a-f0-9]{24}$/);
  assert.match(observation.candidate_id, /^candidate_[a-f0-9]{24}$/);
  assert.equal(observation.graph_effect, 'none');
  assert.equal(observation.causal_status, 'not_established');
  assert.ok(observation.event_hints.includes(eventHint));
  assert.equal(containsPrivateContact(observation), false, `${name} normalization must discard private contact fields`);
  assert.equal(sha256(observation.snapshot), observation.snapshot_sha256);
  assert.equal(JSON.parse(stableJson(observation.snapshot)).source_id, source.id);
}

const samSource = definitions[0][1];
const first = observationFromRecord(samSource, 'Example Systems', fixture('sam'), retrievedAt);
const revisedRaw = { ...fixture('sam'), modifiedDate: '2026-07-03', description: 'Revised public notice.' };
const revision = observationFromRecord(samSource, 'Example Systems', revisedRaw, '2026-07-13T12:00:00Z');
assert.notEqual(first.observation_id, revision.observation_id, 'a source revision must create a new immutable observation');
assert.equal(first.candidate_id, revision.candidate_id, 'revisions of one official record must join one candidate');
const merged = candidateFromObservation(revision, candidateFromObservation(first));
assert.deepEqual(merged.observation_ids, [first.observation_id, revision.observation_id]);
assert.equal(merged.first_seen, retrievedAt);
assert.equal(merged.last_seen, '2026-07-13T12:00:00Z');

const spending = observationFromRecord(definitions[1][1], 'Example Systems', fixture('usaspending'), retrievedAt);
assert.equal(spending.amounts[0].amount_kind, 'obligated');
const sam = observationFromRecord(samSource, 'Example Systems', fixture('sam'), retrievedAt);
assert.equal(sam.amounts[0].amount_kind, 'ceiling');
assert.equal(containsPrivateContact({ email: 'x@example.com' }), true);
assert.equal(recordMatchesTerm('federal_register', fixture('federal-register'), 'advisory committee'), true);
assert.equal(recordMatchesTerm('federal_register', fixture('federal-register'), 'Palantir Technologies'), false);
assert.equal(recordMatchesTerm('usaspending_awards', fixture('usaspending'), 'Example Systems'), true);
assert.equal(recordMatchesTerm('govuk_search', fixture('govuk'), 'AI implementation'), true);
assert.equal(recordMatchBasis('federal_register', fixture('federal-register'), 'advisory committee'), 'title');
assert.equal(candidateFromObservation(observationFromRecord(definitions[3][1], 'advisory committee', fixture('federal-register'), retrievedAt)).priority, 'high');

const workflow = fs.readFileSync('.github/workflows/crawl-official.yml', 'utf8');
assert.match(workflow, /schedule:\s*[\s\S]*cron:/, 'official intake must run on a schedule');
assert.match(workflow, /secrets\.SAM_API_KEY/, 'SAM authentication must come from a repository secret');
assert.match(workflow, /git add data\/crawl receipts\/crawl/, 'the intake commit must stage only crawler-owned paths');
for (const forbidden of ['data/ledger', 'data/canonical', 'cases/', 'build/', 'dist/']) {
  assert.doesNotMatch(workflow, new RegExp(`git add[^\\n]*${forbidden.replace('/', '\\\/')}`), `intake must not stage ${forbidden}`);
}

console.log('official-crawl.test.js: OK');
