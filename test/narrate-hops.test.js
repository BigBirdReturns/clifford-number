import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { narrationBasesForSlice, narrationWindowText, selectNarrationBasis } from '../tools/lib/narration.mjs';

const edge = {
  actor_a: 'ben-warner',
  actor_b: 'dominic-cummings',
  surfaces: [
    {
      surface_id: 'bounded-policy-session-2020',
      temporal_status: 'dated',
      valid_from: '2019-12-01',
      valid_until: '2020-12-31',
      evidence_class: 'official',
    },
    {
      surface_id: 'vote-leave-data-science-2016',
      temporal_status: 'dated',
      valid_from: '2016-01-01',
      valid_until: '2016-12-31',
      evidence_class: 'reported',
    },
  ],
};

// Vote Leave is the smaller surface, so an all-time narration may prefer it.
// A time-sliced narration must first exclude bases outside the requested slice.
const populations = new Map([
  ['bounded-policy-session-2020', 5],
  ['vote-leave-data-science-2016', 3],
]);
const populationOf = id => populations.get(id) ?? 0;

assert.equal(selectNarrationBasis(edge, { populationOf }).surface_id, 'vote-leave-data-science-2016');
assert.equal(selectNarrationBasis(edge, { asOf: '2020', populationOf }).surface_id,
  'bounded-policy-session-2020',
  '2020 narration must not substitute the smaller 2016 surface');
assert.equal(selectNarrationBasis(edge, { asOf: '2016', populationOf }).surface_id,
  'vote-leave-data-science-2016',
  '2016 narration must not substitute the later No. 10 surface');
assert.equal(narrationBasesForSlice(edge, '2020').length, 1,
  'out-of-slice bases must not count as additional contemporaneous surfaces');

const partiallyDated = {
  temporal_status: 'partially_dated',
  valid_from: '2015-01-01',
  valid_until: '2019-12-31',
};
assert.equal(narrationWindowText(partiallyDated), '(co-presence dates not fully documented)');
assert.doesNotMatch(narrationWindowText(partiallyDated), /2015|2019/,
  'a surface or one participant\'s bounds must not be rendered as shared co-presence dates');


const actorRegistry = JSON.parse(readFileSync('data/canonical/actors.json', 'utf8')).actors;
const actorById = new Map(actorRegistry.map(actor => [actor.id, actor]));
const receiptRows = readFileSync('data/ledger/receipts.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(line => JSON.parse(line));
const receiptIds = new Set(receiptRows.map(row => row.receipt_id));
const participationRows = readFileSync('data/ledger/participation.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(line => JSON.parse(line));
const currentHopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const relatedReceiptIds = new Map(actorRegistry.map(actor => [actor.id, new Set()]));
for (const row of participationRows.filter(row => row.participant_type === 'actor')) {
  for (const receiptId of row.receipt_ids ?? []) relatedReceiptIds.get(row.actor_id)?.add(receiptId);
}
for (const hop of currentHopGraph.edges) {
  for (const basis of hop.surfaces ?? []) {
    for (const actorId of [hop.actor_a, hop.actor_b]) {
      for (const receiptId of basis.receipt_ids ?? []) relatedReceiptIds.get(actorId)?.add(receiptId);
    }
  }
}

for (const actor of actorRegistry.filter(row => row.plain)) {
  assert.equal(typeof actor.plain.who, 'string', `${actor.id} plain.who must be text`);
  assert.equal(typeof actor.plain.why_here, 'string', `${actor.id} plain.why_here must be text`);
  assert.ok(Array.isArray(actor.plain.receipt_ids), `${actor.id} plain.receipt_ids must be an array`);
  assert.ok(actor.plain.who.trim().length >= 30, `${actor.id} plain.who is too thin to orient a cold reader`);
  assert.ok(actor.plain.why_here.trim().length >= 30, `${actor.id} plain.why_here is too thin to explain case relevance`);
  assert.ok(actor.plain.receipt_ids.length > 0, `${actor.id} plain block must cite at least one receipt`);
  assert.equal(new Set(actor.plain.receipt_ids).size, actor.plain.receipt_ids.length,
    `${actor.id} plain block must not duplicate receipt IDs`);
  for (const receiptId of actor.plain.receipt_ids) {
    assert.ok(receiptIds.has(receiptId), `${actor.id} plain block cites missing receipt ${receiptId}`);
    assert.ok(relatedReceiptIds.get(actor.id)?.has(receiptId),
      `${actor.id} plain block cites receipt ${receiptId} outside that actor's participations or hop bases`);
  }
}

const anchorId = currentHopGraph.anchor_actor_id;
const adjacency = new Map();
for (const hop of currentHopGraph.edges) {
  if (!adjacency.has(hop.actor_a)) adjacency.set(hop.actor_a, new Set());
  if (!adjacency.has(hop.actor_b)) adjacency.set(hop.actor_b, new Set());
  adjacency.get(hop.actor_a).add(hop.actor_b);
  adjacency.get(hop.actor_b).add(hop.actor_a);
}
const distance = new Map([[anchorId, 0]]);
const queue = [anchorId];
for (let index = 0; index < queue.length; index += 1) {
  const current = queue[index];
  if (distance.get(current) >= 2) continue;
  for (const next of adjacency.get(current) ?? []) {
    if (distance.has(next)) continue;
    distance.set(next, distance.get(current) + 1);
    queue.push(next);
  }
}
const narrationCoverageIds = [...distance]
  .filter(([, value]) => value <= 2)
  .map(([id]) => id)
  .sort();
const missingProfiles = narrationCoverageIds.filter(id => !actorById.get(id)?.plain?.who || !actorById.get(id)?.plain?.why_here);
assert.deepEqual(missingProfiles, [],
  `anchor and Clifford Number 1-2 actors require receipt-backed editorial profiles: ${missingProfiles.join(', ')}`);

for (const actorId of narrationCoverageIds) {
  const narration = spawnSync(process.execPath, [
    'tools/narrate-hops.mjs', '--from', actorId, '--to', anchorId, '--legible', '--md'
  ], { encoding: 'utf8' });
  assert.equal(narration.status, 0, `${actorId}: ${narration.stderr}`);
  assert.doesNotMatch(narration.stdout, /machine-derived from ledger/,
    `${actorId} to ${anchorId} must not fall back to a mechanical actor introduction`);
}

const workedNarration = spawnSync(process.execPath, [
  'tools/narrate-hops.mjs', '--from', 'keir-starmer', '--to', 'matt-clifford', '--as-of', '2025', '--md'
], { encoding: 'utf8' });
assert.equal(workedNarration.status, 0, workedNarration.stderr);
assert.match(workedNarration.stdout, /gov-ai-opportunities-action-plan/);
assert.match(workedNarration.stdout, /gov-pm-ai-blueprint-2025/);
assert.match(workedNarration.stdout, /receipt-backed canonical profiles or case-ledger rows/);

console.log('narrate-hops.test: OK');
