import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'data', 'research', 'public-interest-discovery-seeds.jsonl');
const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ids = new Set();
const allowedTopics = new Set(['epstein', 'trump', 'panama-papers']);
const allowedPriority = new Set(['high', 'medium', 'low']);
const allowedAvailability = new Set(['available', 'unknown', 'partial', 'unavailable', 'not_observed']);

assert.ok(rows.length >= 24, 'expected at least eight bounded seeds per topic');
for (const row of rows) {
  assert.equal(row.schema_version, 'public-interest-discovery-seed@1');
  assert.ok(row.seed_id && !ids.has(row.seed_id), `duplicate or missing seed_id: ${row.seed_id}`);
  ids.add(row.seed_id);
  assert.ok(allowedTopics.has(row.topic), `${row.seed_id}: unsupported topic`);
  assert.ok(/^https:\/\//.test(row.source_url), `${row.seed_id}: source_url must be HTTPS`);
  assert.ok(row.source_id && row.source_class && row.query_kind, `${row.seed_id}: incomplete source routing`);
  assert.ok(allowedPriority.has(row.priority), `${row.seed_id}: invalid priority`);
  assert.ok(allowedAvailability.has(row.source_availability), `${row.seed_id}: invalid source availability`);
  assert.ok(row.bounded_action?.length > 40, `${row.seed_id}: bounded action is too weak`);
  assert.ok(Array.isArray(row.allowed_predicates) && row.allowed_predicates.length > 0, `${row.seed_id}: predicates required`);
  assert.ok(Array.isArray(row.forbidden_inferences) && row.forbidden_inferences.length > 0, `${row.seed_id}: inference firewall required`);
  assert.ok(row.privacy_handling?.length > 20, `${row.seed_id}: privacy handling required`);
  assert.equal(row.graph_effect, 'none', `${row.seed_id}: source seed cannot affect graph`);
}

const topicCounts = Object.fromEntries([...allowedTopics].map(topic => [topic, rows.filter(row => row.topic === topic).length]));
assert.deepEqual(topicCounts, { epstein: 8, trump: 8, 'panama-papers': 8 });
console.log(`public-interest-discovery.test.js: OK (${rows.length} seeds)`);

