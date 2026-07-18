import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('build/public-catalog.json', 'utf8'));
assert.equal(catalog.schema_version, 'public-catalog@1');
assert.equal(catalog.counts.tracks, catalog.tracks.length);
assert.equal(catalog.counts.cases, catalog.cases.length);
assert.equal(catalog.counts.claims, catalog.claims.length);
assert.equal(catalog.counts.declared_claims, catalog.cases.reduce((total, item) => total + item.counts.claims, 0));
assert.equal(catalog.counts.receipts, catalog.receipts.length);
assert.ok(catalog.tracks.length > 0);
assert.ok(catalog.cases.length > 0);

const ukAiEntry = catalog.cases.find(item => item.case_id === 'uk-ai-policy');
assert.ok(ukAiEntry, 'the legacy UK AI graph must cross the public-case boundary');
assert.deepEqual(ukAiEntry.source_counts, { nodes: 194, edges: 223, sources: 14 });
assert.equal(ukAiEntry.featured_priority, 100);
assert.equal(ukAiEntry.subtitle, 'Seven degrees of UK AI policy topology, with receipts.');
assert.match(ukAiEntry.featured_claim.plain, /all 50 recommendations/);
assert.equal(ukAiEntry.featured_claim.receipt_count, 2);
const ukAiCase = JSON.parse(readFileSync(ukAiEntry.href, 'utf8'));
assert.equal(ukAiCase.projection_version, 'legacy-uk-ai-policy@1');
assert.equal(ukAiCase.counts.events, 224);
assert.equal(ukAiCase.counts.claims, 224);
assert.equal(ukAiCase.sections[0].records[0].claims[0].receipt_ids.length, 2);
assert.equal(ukAiCase.relations.length, 0);
assert.equal(ukAiCase.beacons.length, 0);
assert.equal(
  ukAiCase.claim_status_counts.verified + ukAiCase.claim_status_counts.review_required,
  ukAiCase.counts.claims,
  'every projected UK AI claim must retain an explicit publication status'
);
const ukReceiptIds = new Set(ukAiCase.receipts.map(item => item.receipt_id));
for (const claim of ukAiCase.events.flatMap(event => event.claims)) {
  for (const receiptId of claim.receipt_ids) {
    assert.ok(ukReceiptIds.has(receiptId), `UK AI claim receipt must resolve: ${receiptId}`);
  }
}

for (const collection of [catalog.tracks, catalog.cases, catalog.claims, catalog.receipts]) {
  const keys = collection.map(item => item.key ?? item.track_id ?? item.case_id);
  assert.equal(new Set(keys).size, keys.length, 'catalog keys must be unique');
}
for (const item of [...catalog.tracks, ...catalog.cases]) {
  assert.ok(existsSync(item.href), `catalog target must exist: ${item.href}`);
}
const claimKeys = new Set(catalog.claims.map(item => item.key));
for (const receipt of catalog.receipts) {
  assert.equal(receipt.key, receipt.receipt_id, 'public receipt identity must be canonical across cases');
  assert.ok(receipt.case_ids.includes(receipt.case_id));
  for (const key of receipt.claim_ids) assert.ok(claimKeys.has(key), `receipt claim pointer must resolve: ${key}`);
}
assert.equal(new Set(catalog.receipts.map(item => item.receipt_id)).size, catalog.receipts.length,
  'public catalog must deduplicate receipts by receipt_id');
const fullBytes = [...catalog.cases.map(item => item.href), ...catalog.tracks.map(item => item.href)]
  .reduce((total, file) => total + statSync(file).size, 0);
assert.ok(statSync('build/public-catalog.json').size < fullBytes, 'catalog must be smaller than eagerly loading full cases and harnesses');

console.log('public-catalog.test.js: OK');
