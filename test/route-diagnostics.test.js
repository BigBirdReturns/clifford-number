import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { diagnosePathFilters, explainDiagnostics } from '../src/route-diagnostics.js';
import { asOfRoute, officialOnlyRoute } from '../src/route-projections.js';

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));

function totalBasesOf(graph) {
  return (graph.edges ?? []).reduce((sum, edge) => sum + (edge.surfaces ?? []).length, 0);
}

// ---------------------------------------------------------------------------
// Real build/hop-graph.json fixture

test('diagnosePathFilters with the weakest floor and no as-of blocks nothing', () => {
  const diagnostics = diagnosePathFilters(hopGraph, { evidenceFloor: 'open' });
  assert.equal(diagnostics.totalEdges, hopGraph.edges.length);
  assert.equal(diagnostics.traversableEdges, hopGraph.edges.length);
  assert.equal(diagnostics.evidenceBlockedBases, 0);
  assert.equal(diagnostics.timeBlockedBases, 0);
  assert.equal(diagnostics.undatedBlockedBases, 0);
});

test('diagnosePathFilters defaults match an explicit open/no-as-of call', () => {
  const withDefaults = diagnosePathFilters(hopGraph);
  const explicit = diagnosePathFilters(hopGraph, { evidenceFloor: 'open', asOf: '' });
  assert.deepEqual(withDefaults, explicit);
});

test('every basis lands in exactly one bucket per filter pass (real graph, several filter combinations)', () => {
  const total = totalBasesOf(hopGraph);
  const passes = [
    { evidenceFloor: 'open' },
    { evidenceFloor: 'official' },
    { evidenceFloor: 'reported' },
    { evidenceFloor: 'open', asOf: '2020' },
    { evidenceFloor: 'reported', asOf: '2016' },
    { evidenceFloor: 'primary_public', asOf: '2024-08' },
  ];
  for (const filters of passes) {
    const diagnostics = diagnosePathFilters(hopGraph, filters);
    // Every edge that isn't traversable has zero usable bases; every basis
    // that isn't traversable-contributing was blocked for exactly one
    // reason. We can't see "usable" directly, but we can bound it: usable
    // bases = total - blocked, and that must be >= traversableEdges (each
    // traversable edge needs at least one usable basis) and <= total.
    const blocked = diagnostics.evidenceBlockedBases + diagnostics.timeBlockedBases + diagnostics.undatedBlockedBases;
    const usable = total - blocked;
    assert.ok(usable >= diagnostics.traversableEdges, `filters=${JSON.stringify(filters)} usable=${usable} traversableEdges=${diagnostics.traversableEdges}`);
    assert.ok(usable >= 0 && usable <= total, `filters=${JSON.stringify(filters)} usable out of bounds: ${usable}`);
    assert.ok(diagnostics.traversableEdges <= diagnostics.totalEdges);
  }
});

test('diagnosePathFilters isolates evidence-blocked and time-blocked bases on a current multi-basis edge', () => {
  const edge = hopGraph.edges.find(item => (item.surfaces ?? []).some(s => s.evidence_class === 'official')
    && (item.surfaces ?? []).some(s => s.evidence_class === 'primary_public'));
  assert.ok(edge, 'expected a current edge with official and primary-public bases');
  const official = edge.surfaces.find(s => s.evidence_class === 'official');
  const weaker = edge.surfaces.find(s => s.evidence_class === 'primary_public');
  const weakerPeriod = String(weaker.valid_from).slice(0, 4);
  const officialPeriod = String(official.valid_from).slice(0, 4);
  const subGraph = { edges: [edge] };

  const blocked = diagnosePathFilters(subGraph, { evidenceFloor: 'official', asOf: weakerPeriod });
  assert.equal(blocked.evidenceBlockedBases, 1);
  assert.equal(blocked.timeBlockedBases, 1);
  assert.equal(blocked.undatedBlockedBases, 0);
  assert.equal(blocked.traversableEdges, 0);

  const admitted = diagnosePathFilters(subGraph, { evidenceFloor: 'official', asOf: officialPeriod });
  assert.equal(admitted.evidenceBlockedBases, 1);
  assert.equal(admitted.timeBlockedBases, 0);
  assert.equal(admitted.traversableEdges, 1);
});

test('the current accepted hop graph contains only dated bases; synthetic tests cover undated refusal semantics', () => {
  const bases = hopGraph.edges.flatMap(edge => edge.surfaces ?? []);
  assert.ok(bases.length > 0);
  assert.ok(bases.every(basis => basis.temporal_status === 'dated'));
  const diagnostics = diagnosePathFilters(hopGraph, { evidenceFloor: 'open', asOf: '1900' });
  assert.equal(diagnostics.undatedBlockedBases, 0);
  assert.equal(diagnostics.timeBlockedBases, bases.length);
  assert.equal(diagnostics.traversableEdges, 0);
});

// ---------------------------------------------------------------------------
// Cross-check against src/route-projections.js on the same real edges: a
// basis (or edge) route-projections excludes must be non-traversable here,
// and vice versa.

test('evidence floor semantics match officialOnlyRoute for every real edge (floor = official)', () => {
  for (const edge of hopGraph.edges) {
    const subGraph = { edges: [edge] };
    const route = officialOnlyRoute(subGraph, edge.actor_a, edge.actor_b);
    const diagnostics = diagnosePathFilters(subGraph, { evidenceFloor: 'official' });
    assert.equal(
      diagnostics.traversableEdges === 1,
      route !== null,
      `edge ${edge.actor_a}<->${edge.actor_b}: officialOnlyRoute=${route ? 'found' : 'null'} but diagnostics traversableEdges=${diagnostics.traversableEdges}`
    );
  }
});

test('as-of semantics match asOfRoute for every real edge, at several periods (floor = open)', () => {
  const periods = ['2016', '2019', '2020', '2021', '2024', '2024-08', '2025-06-30'];
  for (const period of periods) {
    for (const edge of hopGraph.edges) {
      const subGraph = { edges: [edge] };
      const route = asOfRoute(subGraph, edge.actor_a, edge.actor_b, period);
      const diagnostics = diagnosePathFilters(subGraph, { evidenceFloor: 'open', asOf: period });
      assert.equal(
        diagnostics.traversableEdges === 1,
        route !== null,
        `edge ${edge.actor_a}<->${edge.actor_b} at ${period}: asOfRoute=${route ? 'found' : 'null'} but diagnostics traversableEdges=${diagnostics.traversableEdges}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Small synthetic fixtures

function makeSyntheticGraph() {
  return {
    edges: [
      {
        // Fully open: one strong, dated basis.
        actor_a: 'a1', actor_b: 'a2',
        surfaces: [
          { evidence_class: 'confirmed', temporal_status: 'dated', valid_from: '2020-01-01', valid_until: '2020-12-31' },
        ],
      },
      {
        // Weak evidence only.
        actor_a: 'a2', actor_b: 'a3',
        surfaces: [
          { evidence_class: 'judgment', temporal_status: 'dated', valid_from: '2020-01-01', valid_until: '2020-12-31' },
        ],
      },
      {
        // Strong evidence, undated.
        actor_a: 'a3', actor_b: 'a4',
        surfaces: [
          { evidence_class: 'official', temporal_status: 'undated', valid_from: null, valid_until: null },
        ],
      },
      {
        // Strong evidence, dated but outside 2020.
        actor_a: 'a4', actor_b: 'a5',
        surfaces: [
          { evidence_class: 'official', temporal_status: 'dated', valid_from: '2018-01-01', valid_until: '2018-12-31' },
        ],
      },
      {
        // No surfaces at all.
        actor_a: 'a5', actor_b: 'a6',
        surfaces: [],
      },
    ],
  };
}

test('synthetic fixture: totals and per-bucket counts with no filters', () => {
  const graph = makeSyntheticGraph();
  const diagnostics = diagnosePathFilters(graph);
  assert.equal(diagnostics.totalEdges, 5);
  // Every edge with at least one surface is traversable under 'open'/no as-of.
  assert.equal(diagnostics.traversableEdges, 4);
  assert.equal(diagnostics.evidenceBlockedBases, 0);
  assert.equal(diagnostics.timeBlockedBases, 0);
  assert.equal(diagnostics.undatedBlockedBases, 0);
});

test('synthetic fixture: evidence floor blocks the judgment-only edge', () => {
  const graph = makeSyntheticGraph();
  const diagnostics = diagnosePathFilters(graph, { evidenceFloor: 'primary_public' });
  assert.equal(diagnostics.evidenceBlockedBases, 1);
  // a1<->a2 (confirmed), a3<->a4 (official, undated), a4<->a5 (official, dated 2018) still pass evidence.
  assert.equal(diagnostics.traversableEdges, 3);
});

test('synthetic fixture: as-of blocks the undated edge and the out-of-window edge, and counts are consistent', () => {
  const graph = makeSyntheticGraph();
  const diagnostics = diagnosePathFilters(graph, { evidenceFloor: 'open', asOf: '2020' });
  // a1<->a2: dated, overlaps 2020 -> traversable.
  // a2<->a3: dated, overlaps 2020, weak evidence but floor is 'open' -> traversable.
  // a3<->a4: undated -> undatedBlockedBases += 1, not traversable.
  // a4<->a5: dated but 2018, no overlap with 2020 -> timeBlockedBases += 1, not traversable.
  // a5<->a6: no surfaces -> not traversable, contributes nothing to any bucket.
  assert.equal(diagnostics.undatedBlockedBases, 1);
  assert.equal(diagnostics.timeBlockedBases, 1);
  assert.equal(diagnostics.evidenceBlockedBases, 0);
  assert.equal(diagnostics.traversableEdges, 2);
  assert.equal(diagnostics.totalEdges, 5);
});

test('synthetic fixture: an edge with no surfaces at all is never traversable and never blocks a basis', () => {
  const graph = { edges: [{ actor_a: 'x', actor_b: 'y', surfaces: [] }] };
  const diagnostics = diagnosePathFilters(graph, { evidenceFloor: 'open', asOf: '2020' });
  assert.equal(diagnostics.totalEdges, 1);
  assert.equal(diagnostics.traversableEdges, 0);
  assert.equal(diagnostics.evidenceBlockedBases, 0);
  assert.equal(diagnostics.timeBlockedBases, 0);
  assert.equal(diagnostics.undatedBlockedBases, 0);
});

test('diagnosePathFilters tolerates a missing/empty hop graph', () => {
  assert.deepEqual(diagnosePathFilters(undefined), {
    totalEdges: 0,
    traversableEdges: 0,
    evidenceBlockedBases: 0,
    timeBlockedBases: 0,
    undatedBlockedBases: 0,
  });
  assert.deepEqual(diagnosePathFilters({}), {
    totalEdges: 0,
    traversableEdges: 0,
    evidenceBlockedBases: 0,
    timeBlockedBases: 0,
    undatedBlockedBases: 0,
  });
});

// ---------------------------------------------------------------------------
// explainDiagnostics

test('explainDiagnostics names its denominators when nothing is blocked', () => {
  const summary = explainDiagnostics({ totalEdges: 31, traversableEdges: 31, evidenceBlockedBases: 0, timeBlockedBases: 0, undatedBlockedBases: 0 });
  assert.equal(summary, '31 of 31 edges are traversable under the current filters.');
});

test('explainDiagnostics reports zero traversable edges and names every blocked reason', () => {
  const summary = explainDiagnostics({ totalEdges: 31, traversableEdges: 0, evidenceBlockedBases: 4, timeBlockedBases: 2, undatedBlockedBases: 1 });
  assert.equal(summary, '0 of 31 edges are traversable under the current filters. 4 bases fell below the evidence floor, 2 bases fell outside the as-of time slice, and 1 basis was undated and excluded by the as-of filter.');
});

test('explainDiagnostics on the real graph is a non-empty string that mentions the total edge count', () => {
  const diagnostics = diagnosePathFilters(hopGraph, { evidenceFloor: 'official', asOf: '2016' });
  const summary = explainDiagnostics(diagnostics);
  assert.ok(summary.includes(String(hopGraph.edges.length)));
  assert.ok(summary.length > 0);
});
