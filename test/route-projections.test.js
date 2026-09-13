import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

import {
  asOfRoute,
  bestDatedRoute,
  blockedSegments,
  officialOnlyRoute,
  routeProjections,
  shortestRoute,
  strongestEvidenceRoute,
} from '../src/route-projections.js';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

function runQueryHops(args) {
  const res = spawnSync(process.execPath, ['tools/query-hops.mjs', ...args, '--json'], { encoding: 'utf8' });
  assert.equal(res.status, 0, `tools/query-hops.mjs ${args.join(' ')} failed:\n${res.stderr}`);
  return JSON.parse(res.stdout);
}

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));

// ---------------------------------------------------------------------------
// Real build/hop-graph.json fixture

test('shortestRoute matches query-hops for a known two-hop pair (john-healey -> matt-clifford)', () => {
  const route = shortestRoute(hopGraph, 'john-healey', 'matt-clifford');
  assert.ok(route, 'expected a route');
  assert.equal(route.kind, 'clifford');
  assert.equal(route.canonical, true);
  assert.equal(route.hopCount, 2);
  assert.deepEqual(route.steps.map(s => [s.actorA, s.actorB]), [
    ['john-healey', 'keir-starmer'],
    ['keir-starmer', 'matt-clifford'],
  ]);

  const cli = runQueryHops(['--from', 'john-healey', '--to', 'matt-clifford']);
  assert.equal(cli.number, route.hopCount, 'tools/query-hops.mjs hop count must match shortestRoute');
});

test('shortestRoute is null exactly where query-hops finds no path (isolated actor)', () => {
  // Most actors in this ledger are not reachable from the anchor at all
  // (see build/hop-graph.json shortest_paths); pick one and confirm parity.
  const route = shortestRoute(hopGraph, 'peter-thiel', 'matt-clifford');
  const cli = runQueryHops(['--from', 'peter-thiel', '--to', 'matt-clifford']);
  assert.equal(cli.number, null);
  assert.equal(route, null);
});

test('shortestRoute picks the strongest basis and keeps all bases when a hop has more than one surface', () => {
  const edge = hopGraph.edges.find(item => (item.surfaces ?? []).length > 1);
  assert.ok(edge, 'current compiled graph must expose at least one multi-basis hop');
  const route = shortestRoute(hopGraph, edge.actor_a, edge.actor_b);
  assert.equal(route.hopCount, 1);
  const [step] = route.steps;
  const ordered = [...edge.surfaces].sort((a, b) =>
    (EVIDENCE_RANK[a.evidence_class] ?? 99) - (EVIDENCE_RANK[b.evidence_class] ?? 99)
    || String(a.surface_id).localeCompare(String(b.surface_id)));
  assert.equal(step.surfaceId, ordered[0].surface_id);
  assert.equal(step.evidenceClass, ordered[0].evidence_class);
  assert.equal(step.allBases.length, edge.surfaces.length);
  assert.deepEqual(step.allBases.map(b => b.surfaceId), ordered.map(b => b.surface_id));
});

test('blockedSegments mirrors the current compiler refusal ledger', () => {
  const pairs = hopGraph.rejected_hop_pairs ?? [];
  for (const pair of pairs) {
    const segments = blockedSegments(hopGraph, pair.actor_a, pair.actor_b);
    const segment = segments.find(item => item.surfaceId === pair.surface_id);
    assert.ok(segment, `missing blocked segment for ${pair.surface_id}`);
    assert.equal(segment.reason, pair.reason);
    assert.equal(segment.actorA.id, pair.actor_a);
    assert.equal(segment.actorB.id, pair.actor_b);
  }
  if (!pairs.length) {
    assert.deepEqual(blockedSegments(hopGraph, 'john-healey', 'matt-clifford'), []);
  }
});

test('asOfRoute matches query-hops for every dated basis on a real multi-basis edge', () => {
  const edge = hopGraph.edges.find(item => (item.surfaces ?? []).length > 1);
  assert.ok(edge);
  const periods = [...new Set(edge.surfaces.map(item => String(item.valid_from ?? '').slice(0, 4)).filter(Boolean))];
  assert.ok(periods.length > 0);
  for (const period of periods) {
    const route = asOfRoute(hopGraph, edge.actor_a, edge.actor_b, period);
    const cli = runQueryHops(['--from', edge.actor_a, '--to', edge.actor_b, '--as-of', period]);
    assert.equal(route?.hopCount ?? null, cli.number, `as-of parity failed for ${period}`);
    if (route) assert.equal(route.steps[0].surfaceId, cli.hops[0].shared_surfaces[0].surface_id);
  }
});

test('asOfRoute returns an honest absence outside every dated basis window', () => {
  const edge = hopGraph.edges.find(item => (item.surfaces ?? []).length > 1);
  assert.ok(edge);
  const route = asOfRoute(hopGraph, edge.actor_a, edge.actor_b, '1900');
  const cli = runQueryHops(['--from', edge.actor_a, '--to', edge.actor_b, '--as-of', '1900']);
  assert.equal(route, null);
  assert.equal(cli.number, null);
});

test('officialOnlyRoute finds the all-official john-healey -> matt-clifford chain', () => {
  const route = officialOnlyRoute(hopGraph, 'john-healey', 'matt-clifford');
  assert.ok(route);
  assert.equal(route.projection, 'official-only');
  assert.equal(route.hopCount, 2);
  for (const step of route.steps) assert.equal(step.evidenceClass, 'official');
});

test('officialOnlyRoute agrees with official-basis availability on each isolated real edge', () => {
  for (const edge of hopGraph.edges) {
    const subGraph = { edges: [edge], rejected_hop_pairs: [] };
    const route = officialOnlyRoute(subGraph, edge.actor_a, edge.actor_b);
    const hasOfficial = (edge.surfaces ?? []).some(surface => (EVIDENCE_RANK[surface.evidence_class] ?? 99) <= EVIDENCE_RANK.official);
    assert.equal(route !== null, hasOfficial, `official-only mismatch for ${edge.actor_a}<->${edge.actor_b}`);
  }
});

test('routeProjections keys every projection with the canonical route first', () => {
  const projections = routeProjections(hopGraph, 'john-healey', 'matt-clifford', { asOf: '2024-08' });
  assert.deepEqual(Object.keys(projections), ['clifford', 'strongestEvidence', 'bestDated', 'officialOnly', 'asOf', 'blocked']);
  assert.equal(projections.clifford.canonical, true);
  assert.equal(projections.clifford.hopCount, 2);
});

test('real-graph determinism: shortestRoute and strongestEvidenceRoute are stable across repeat calls', () => {
  const a1 = shortestRoute(hopGraph, 'john-healey', 'matt-clifford');
  const a2 = shortestRoute(hopGraph, 'john-healey', 'matt-clifford');
  assert.deepEqual(a1, a2);

  const b1 = strongestEvidenceRoute(hopGraph, 'ben-warner', 'dominic-cummings');
  const b2 = strongestEvidenceRoute(hopGraph, 'ben-warner', 'dominic-cummings');
  assert.deepEqual(b1, b2);

  const c1 = blockedSegments(hopGraph, 'dan-rosenfield', 'dominic-cummings');
  const c2 = blockedSegments(hopGraph, 'dan-rosenfield', 'dominic-cummings');
  assert.deepEqual(c1, c2);
});

test('shortestRoute never mutates its input hop graph', () => {
  const before = JSON.stringify(hopGraph);
  shortestRoute(hopGraph, 'john-healey', 'matt-clifford');
  strongestEvidenceRoute(hopGraph, 'ben-warner', 'dominic-cummings');
  bestDatedRoute(hopGraph, 'ben-warner', 'dominic-cummings');
  officialOnlyRoute(hopGraph, 'john-healey', 'matt-clifford');
  asOfRoute(hopGraph, 'ben-warner', 'dominic-cummings', '2020');
  blockedSegments(hopGraph, 'dan-rosenfield', 'dominic-cummings');
  assert.equal(JSON.stringify(hopGraph), before);
});

// ---------------------------------------------------------------------------
// Synthetic mini-graph fixture — exercises shapes the real ledger does not
// currently contain (or does not isolate cleanly): a maximin route that
// beats the shortest one on evidence strength, an official-only dead end,
// year/month as-of precision, and an undated basis.

function basis({
  surfaceId, surfaceLabel = `${surfaceId} label`, evidenceClass, temporalStatus,
  validFrom = null, validUntil = null, actorARole = 'role a', actorBRole = 'role b', receiptIds = [],
}) {
  return {
    surface_id: surfaceId,
    surface_label: surfaceLabel,
    surface_type: 'test_surface',
    secondary_surface_types: [],
    actor_a_role: actorARole,
    actor_b_role: actorBRole,
    evidence_class: evidenceClass,
    receipt_ids: receiptIds,
    valid_from: validFrom,
    valid_until: validUntil,
    temporal_status: temporalStatus,
  };
}

function edge(actorA, actorB, surfaces) {
  return { actor_a: actorA, actor_b: actorB, surfaces, evidence_weight: 0, surface_count: surfaces.length };
}

const miniGraph = {
  edges: [
    // Maximin fixture: a-b is one weak hop; a-c-b is two strong hops.
    edge('mx-a', 'mx-b', [basis({ surfaceId: 'mx-ab', evidenceClass: 'judgment', temporalStatus: 'dated', validFrom: '2020-01-01', validUntil: '2020-12-31' })]),
    edge('mx-a', 'mx-c', [basis({ surfaceId: 'mx-ac', evidenceClass: 'official', temporalStatus: 'dated', validFrom: '2020-01-01', validUntil: '2020-12-31' })]),
    edge('mx-c', 'mx-b', [basis({ surfaceId: 'mx-cb', evidenceClass: 'official', temporalStatus: 'dated', validFrom: '2020-01-01', validUntil: '2020-12-31' })]),

    // Official-only dead end: only a 'reported' basis exists, no official path at all.
    edge('off-p', 'off-q', [basis({ surfaceId: 'off-pq', evidenceClass: 'reported', temporalStatus: 'dated', validFrom: '2018-01-01', validUntil: '2018-12-31' })]),

    // As-of precision: a single basis dated to March 2019 exactly.
    edge('d1', 'd2', [basis({ surfaceId: 'd1-d2-march', evidenceClass: 'reported', temporalStatus: 'dated', validFrom: '2019-03-01', validUntil: '2019-03-31' })]),

    // Undated basis: usable for all-time topology, never for a time slice.
    edge('u1', 'u2', [basis({ surfaceId: 'u1-u2', evidenceClass: 'primary_public', temporalStatus: 'undated', validFrom: null, validUntil: null })]),
  ],
  rejected_hop_pairs: [
    {
      surface_id: 'blk-surface',
      actor_a: 'off-p',
      actor_b: 'blk-x',
      reason: 'no_temporal_overlap',
      actor_a_window: { valid_from: '2020-01-01', valid_until: '2020-06-30', dated: true },
      actor_b_window: { valid_from: '2021-01-01', valid_until: '2021-06-30', dated: true },
      surface_window: { valid_from: '2020-01-01', valid_until: '2021-06-30', dated: true },
      actor_a_receipt_ids: [], actor_b_receipt_ids: [], surface_receipt_ids: [], receipt_ids: [],
      evidence_class: 'judgment',
      actor_a_window_reverifiable: false, actor_b_window_reverifiable: false,
      publication_status: 'review_required', publication_reason: 'actor_window_receipts_not_publicly_reverifiable',
    },
  ],
};

test('strongestEvidenceRoute may be longer than shortestRoute but never redefines either hop count', () => {
  const shortest = shortestRoute(miniGraph, 'mx-a', 'mx-b');
  assert.equal(shortest.hopCount, 1);
  assert.equal(shortest.steps[0].evidenceClass, 'judgment');

  const strongest = strongestEvidenceRoute(miniGraph, 'mx-a', 'mx-b');
  assert.equal(strongest.kind, 'secondary');
  assert.equal(strongest.projection, 'strongest-evidence');
  assert.equal(strongest.hopCount, 2);
  assert.deepEqual(strongest.steps.map(s => [s.actorA, s.actorB]), [['mx-a', 'mx-c'], ['mx-c', 'mx-b']]);
  for (const step of strongest.steps) assert.equal(step.evidenceClass, 'official');

  // Neither projection has touched the other's hop count.
  assert.equal(shortest.hopCount, 1);
});

test('officialOnlyRoute returns null on the synthetic dead end where the only basis is reported, not official', () => {
  assert.equal(shortestRoute(miniGraph, 'off-p', 'off-q').hopCount, 1);
  assert.equal(officialOnlyRoute(miniGraph, 'off-p', 'off-q'), null);
});

test('blockedSegments orients actorA/actorB to the requested fromId regardless of storage order', () => {
  const forward = blockedSegments(miniGraph, 'off-p', 'blk-x');
  assert.equal(forward.length, 1);
  assert.equal(forward[0].actorA.id, 'off-p');
  assert.equal(forward[0].actorB.id, 'blk-x');
  assert.equal(forward[0].surfaceLabel, null, 'no accepted edge in this fixture carries a label for blk-surface');

  const reversed = blockedSegments(miniGraph, 'blk-x', 'off-p');
  assert.equal(reversed[0].actorA.id, 'blk-x');
  assert.equal(reversed[0].actorB.id, 'off-p');
  assert.deepEqual(reversed[0].actorA.window, { validFrom: '2021-01-01', validUntil: '2021-06-30', dated: true });
});

test('asOfRoute widens a year query to cover a month-precision basis, and rejects a non-overlapping month', () => {
  const yearQuery = asOfRoute(miniGraph, 'd1', 'd2', '2019');
  assert.ok(yearQuery, 'a 2019 as-of query must cover a basis dated to March 2019');
  assert.equal(yearQuery.steps[0].surfaceId, 'd1-d2-march');

  const matchingMonth = asOfRoute(miniGraph, 'd1', 'd2', '2019-03');
  assert.ok(matchingMonth);

  const nonOverlappingMonth = asOfRoute(miniGraph, 'd1', 'd2', '2019-04');
  assert.equal(nonOverlappingMonth, null);
});

test('an undated basis supports all-time topology but never a time slice', () => {
  const allTime = shortestRoute(miniGraph, 'u1', 'u2');
  assert.equal(allTime.hopCount, 1);
  assert.equal(allTime.steps[0].temporalPrecision, 'undated');
  assert.equal(allTime.steps[0].supportsTimeSlice, false);

  assert.equal(bestDatedRoute(miniGraph, 'u1', 'u2'), null);
  assert.equal(asOfRoute(miniGraph, 'u1', 'u2', '2020'), null);
});

test('synthetic-graph determinism: same input produces deep-equal output twice', () => {
  const runs = () => ({
    shortest: shortestRoute(miniGraph, 'mx-a', 'mx-b'),
    strongest: strongestEvidenceRoute(miniGraph, 'mx-a', 'mx-b'),
    asOf: asOfRoute(miniGraph, 'd1', 'd2', '2019'),
    blocked: blockedSegments(miniGraph, 'off-p', 'blk-x'),
    projections: routeProjections(miniGraph, 'mx-a', 'mx-b', { asOf: '2020' }),
  });
  assert.deepEqual(runs(), runs());
});

console.log('route-projections.test.js: OK');
