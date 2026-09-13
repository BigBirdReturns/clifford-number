import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { root, readJson } from '../tools/lib/ledger.mjs';
import { releaseDelta, summarizeDelta } from '../src/release-delta.js';

// ---- synthetic fixture builders --------------------------------------------
//
// Minimal atlas-projection.json-shaped fixtures covering every field this
// module actually reads. Every kind is exercised on at least one
// objectType; region additionally exercises the full non-window kind set
// so the taxonomy is easy to audit in one place.

function evidenceComposition(by_class_overrides) {
  const by_class = { official: 0, primary_public: 0, reported: 0, derived: 0, judgment: 0, open: 0, ...by_class_overrides };
  const population = Object.values(by_class).reduce((a, b) => a + b, 0);
  return { population, by_class, source_ids: [] };
}

function graphEffectComposition(effect_overrides) {
  return { 'hop-eligible': 0, 'context-only': 0, 'scout-only': 0, none: 0, ...effect_overrides };
}

function region(id, { surfaceCount = 1, evidence = { official: 1 }, graphEffect = { 'hop-eligible': 1 }, x = 0, y = 0 } = {}) {
  return {
    case_id: id,
    label: `Region ${id}`,
    surface_count: { metric: 'surfaces_in_region', count: surfaceCount, denominator: 10, source_ids: [] },
    evidence_composition: evidenceComposition(evidence),
    graph_effect_composition: graphEffectComposition(graphEffect),
    receipt_ids: [],
    position: { x, y },
  };
}

function machine(id, { surfaceCount = 1, evidence = { official: 1 }, graphEffect = { 'hop-eligible': 1 }, x = 0, y = 0 } = {}) {
  return {
    organization_id: id,
    label: `Machine ${id}`,
    surface_count: { metric: 'surfaces_generated', count: surfaceCount, denominator: 10, source_ids: [] },
    evidence_composition: evidenceComposition(evidence),
    graph_effect_composition: graphEffectComposition(graphEffect),
    receipt_ids: [],
    position: { x, y },
  };
}

function surfaceNode(id, { window = { time_start: '2020', time_end: '2021' }, evidence = { official: 1 }, graphEffect = 'hop-eligible', distinctActorCount = 1, status = 'seeded_from_master' } = {}) {
  return {
    surface_id: id,
    label: `Surface ${id}`,
    status,
    graph_effect: graphEffect,
    window,
    dense: false,
    distinct_actor_count: distinctActorCount,
    evidence_composition: evidenceComposition(evidence),
    receipt_ids: [],
    actor_ids: [],
    organization_ids: [],
  };
}

function actorBracket(id, { surfaceCount = 1, graphEffect = 'hop-eligible' } = {}) {
  return {
    actor_id: id,
    label: `Actor ${id}`,
    surface_count: surfaceCount,
    graph_effect: graphEffect,
    graph_effect_composition: graphEffectComposition({ [graphEffect]: surfaceCount }),
    dense_surface_ids: [],
    receipt_ids: [],
  };
}

function corridor(id, { chainLength = 3, surfaceIds = ['s1', 's2', 's3'], evidenceClass = 'reported', graphEffect = 'none' } = {}) {
  return {
    chain_id: id,
    label: `Corridor ${id}`,
    chain_length: chainLength,
    surface_ids: surfaceIds,
    receipt_ids: [],
    evidence_class: evidenceClass,
    graph_effect: graphEffect,
  };
}

function countMetric(name, count, denominator) {
  return { metric: name, count, denominator, source_ids: [] };
}

function baseArtifact(overrides = {}) {
  return {
    scheme: { schema_version: 'atlas-projection@1' },
    regions: [],
    machines: [],
    surface_nodes: [],
    actor_brackets: [],
    corridors: [],
    aggregate_metrics: {},
    ...overrides,
  };
}

// ---- baseline-null honesty --------------------------------------------------

test('baseline null/undefined returns baselineAbsent with an empty changes array, never fabricated additions', () => {
  const current = baseArtifact({ regions: [region('r1')], surface_nodes: [surfaceNode('s1')] });

  for (const missingBaseline of [null, undefined]) {
    const delta = releaseDelta(current, missingBaseline);
    assert.equal(delta.baselineAbsent, true);
    assert.deepEqual(delta.changes, []);
    assert.equal(delta.generatedFrom.baselineScheme, null);
    assert.equal(delta.generatedFrom.currentScheme, current.scheme);
  }
});

// ---- stable geography: position-only churn is invisible --------------------

test('x/y-only position changes produce zero changes (stable-geography rule)', () => {
  const baseline = baseArtifact({
    regions: [region('r1', { x: 10, y: 20 })],
    machines: [machine('m1', { x: 30, y: 40 })],
  });
  const current = baseArtifact({
    regions: [region('r1', { x: 999.99, y: -500 })],
    machines: [machine('m1', { x: 0, y: 0 })],
  });

  const delta = releaseDelta(current, baseline);
  assert.deepEqual(delta.changes, [], 'a layout rerun must never manufacture a reported change');
});

// ---- identical artifacts ----------------------------------------------------

test('identical artifacts produce zero changes', () => {
  const artifact = baseArtifact({
    regions: [region('r1')],
    machines: [machine('m1')],
    surface_nodes: [surfaceNode('s1')],
    actor_brackets: [actorBracket('a1')],
    corridors: [corridor('c1')],
    aggregate_metrics: { total_surfaces: countMetric('total_surfaces', 5, 5) },
  });
  // Deep-cloned, not the same reference, so this is a genuine structural
  // comparison rather than an identity shortcut.
  const clone = JSON.parse(JSON.stringify(artifact));

  const delta = releaseDelta(clone, artifact);
  assert.deepEqual(delta.changes, []);
  assert.equal(delta.baselineAbsent, false);
});

// ---- determinism -------------------------------------------------------------

test('releaseDelta is deterministic: running twice on the same inputs deep-equals', () => {
  const baseline = baseArtifact({
    regions: [region('r1', { surfaceCount: 1 })],
    surface_nodes: [surfaceNode('s1', { evidence: { official: 1 } })],
  });
  const current = baseArtifact({
    regions: [region('r1', { surfaceCount: 4 }), region('r2')],
    surface_nodes: [surfaceNode('s1', { evidence: { open: 1 } })],
  });

  const first = releaseDelta(current, baseline);
  const second = releaseDelta(current, baseline);
  assert.deepEqual(first, second);
  // releaseDelta must not mutate its inputs either.
  assert.equal(baseline.regions[0].surface_count.count, 1);
  assert.equal(current.regions[0].surface_count.count, 4);
});

// ---- taxonomy coverage: region exercises the full non-window kind set -----

test('region: added, removed, population-changed, evidence-upgraded, evidence-decayed, graph-effect-changed', () => {
  const baseline = baseArtifact({
    regions: [
      region('r-removed'),
      region('r-pop', { surfaceCount: 2 }),
      region('r-eupg', { evidence: { reported: 3 } }),
      region('r-edec', { evidence: { official: 3 } }),
      region('r-graph', { graphEffect: { none: 1 } }),
      region('r-stable', { x: 1, y: 1 }),
    ],
  });
  const current = baseArtifact({
    regions: [
      region('r-added'),
      region('r-pop', { surfaceCount: 5 }),
      region('r-eupg', { evidence: { official: 3 } }),   // reported -> official: stronger
      region('r-edec', { evidence: { open: 3 } }),        // official -> open: weaker
      region('r-graph', { graphEffect: { 'hop-eligible': 1 } }),
      region('r-stable', { x: 999, y: -999 }),            // position-only churn
    ],
  });

  const delta = releaseDelta(current, baseline);
  const byId = Object.fromEntries(delta.changes.map(c => [`${c.id}:${c.kind}`, c]));

  assert.ok(byId['r-added:added'], 'expected added');
  assert.equal(byId['r-added:added'].objectType, 'region');
  assert.ok(byId['r-removed:removed'], 'expected removed');
  assert.ok(byId['r-pop:population-changed'], 'expected population-changed');
  assert.ok(byId['r-eupg:evidence-upgraded'], 'expected evidence-upgraded');
  assert.ok(byId['r-edec:evidence-decayed'], 'expected evidence-decayed');
  assert.ok(byId['r-graph:graph-effect-changed'], 'expected graph-effect-changed');
  assert.ok(!Object.keys(byId).some(k => k.startsWith('r-stable:')), 'r-stable must produce no changes (position-only)');

  // Exactly these six regions' worth of changes -- nothing extra leaked in.
  assert.equal(new Set(delta.changes.map(c => c.id)).size, 6);
});

// ---- surface: window-changed, plus the rest of the taxonomy ---------------

test('surface: added, removed, window-changed, population-changed, evidence shifts, graph-effect-changed', () => {
  const baseline = baseArtifact({
    surface_nodes: [
      surfaceNode('s-removed'),
      surfaceNode('s-window', { window: { time_start: '2020-01', time_end: '2020-06' } }),
      surfaceNode('s-pop', { distinctActorCount: 2, evidence: { official: 2 } }),
      surfaceNode('s-graph', { graphEffect: 'context-only' }),
      surfaceNode('s-stable'),
    ],
  });
  const current = baseArtifact({
    surface_nodes: [
      surfaceNode('s-added'),
      surfaceNode('s-window', { window: { time_start: '2020-01', time_end: '2020-09' } }),
      surfaceNode('s-pop', { distinctActorCount: 5, evidence: { official: 5 } }),
      surfaceNode('s-graph', { graphEffect: 'hop-eligible' }),
      surfaceNode('s-stable'),
    ],
  });

  const delta = releaseDelta(current, baseline);
  const kindsById = {};
  for (const c of delta.changes) (kindsById[c.id] ??= new Set()).add(c.kind);

  assert.ok(kindsById['s-added']?.has('added'));
  assert.ok(kindsById['s-removed']?.has('removed'));
  assert.ok(kindsById['s-window']?.has('window-changed'));
  assert.ok(kindsById['s-pop']?.has('population-changed'));
  assert.ok(kindsById['s-graph']?.has('graph-effect-changed'));
  assert.equal(kindsById['s-stable'], undefined, 'unchanged surface must produce no changes');

  for (const c of delta.changes) assert.equal(c.objectType, 'surface');
});

// ---- actor: population-changed + graph-effect-changed, no evidence kinds --

test('actor: added, removed, population-changed, graph-effect-changed; no evidence kinds (schema has no per-actor evidence)', () => {
  const baseline = baseArtifact({
    actor_brackets: [
      actorBracket('a-removed'),
      actorBracket('a-pop', { surfaceCount: 1 }),
      actorBracket('a-graph', { graphEffect: 'context-only' }),
    ],
  });
  const current = baseArtifact({
    actor_brackets: [
      actorBracket('a-added'),
      actorBracket('a-pop', { surfaceCount: 3 }),
      actorBracket('a-graph', { graphEffect: 'hop-eligible' }),
    ],
  });

  const delta = releaseDelta(current, baseline);
  const kinds = delta.changes.map(c => c.kind);
  assert.ok(kinds.includes('added'));
  assert.ok(kinds.includes('removed'));
  assert.ok(kinds.includes('population-changed'));
  assert.ok(kinds.includes('graph-effect-changed'));
  assert.ok(!kinds.includes('evidence-upgraded') && !kinds.includes('evidence-decayed'));
});

// ---- corridor: population-changed + single-evidence-class shift -----------

test('corridor: added, removed, population-changed, evidence-upgraded/decayed via single evidence_class', () => {
  const baseline = baseArtifact({
    corridors: [
      corridor('c-removed'),
      corridor('c-pop', { chainLength: 3, surfaceIds: ['a', 'b', 'c'] }),
      corridor('c-eupg', { evidenceClass: 'judgment' }),
      corridor('c-edec', { evidenceClass: 'official' }),
    ],
  });
  const current = baseArtifact({
    corridors: [
      corridor('c-added'),
      corridor('c-pop', { chainLength: 4, surfaceIds: ['a', 'b', 'c', 'd'] }),
      corridor('c-eupg', { evidenceClass: 'reported' }), // judgment -> reported: stronger
      corridor('c-edec', { evidenceClass: 'derived' }),  // official -> derived: weaker
    ],
  });

  const delta = releaseDelta(current, baseline);
  const kindsById = {};
  for (const c of delta.changes) (kindsById[c.id] ??= new Set()).add(c.kind);

  assert.ok(kindsById['c-added']?.has('added'));
  assert.ok(kindsById['c-removed']?.has('removed'));
  assert.ok(kindsById['c-pop']?.has('population-changed'));
  assert.ok(kindsById['c-eupg']?.has('evidence-upgraded'));
  assert.ok(kindsById['c-edec']?.has('evidence-decayed'));
});

// ---- metric: both countMetric and evidence-composition shapes --------------

test('metric: population-changed for countMetric shape, evidence shift for corpus_evidence_composition shape', () => {
  const baseline = baseArtifact({
    aggregate_metrics: {
      total_surfaces: countMetric('total_surfaces', 10, 10),
      corpus_evidence_composition: evidenceComposition({ official: 5, reported: 5 }),
    },
  });
  const current = baseArtifact({
    aggregate_metrics: {
      total_surfaces: countMetric('total_surfaces', 12, 12),
      corpus_evidence_composition: evidenceComposition({ official: 2, reported: 5 }), // net weaker mix
    },
  });

  const delta = releaseDelta(current, baseline);
  const kindsById = {};
  for (const c of delta.changes) (kindsById[c.id] ??= new Set()).add(c.kind);

  assert.ok(kindsById['total_surfaces']?.has('population-changed'));
  assert.ok(kindsById['corpus_evidence_composition']?.has('evidence-decayed'));
  for (const c of delta.changes) assert.equal(c.objectType, 'metric');
});

// ---- deterministic ordering: objectType, then id, then kind ----------------

test('changes are ordered by objectType, then id, then kind', () => {
  const baseline = baseArtifact({
    regions: [region('r2', { surfaceCount: 1 }), region('r1', { surfaceCount: 1 })],
    machines: [machine('m1', { surfaceCount: 1 })],
  });
  const current = baseArtifact({
    // r1/r2 both change population, plus an added region "r0" and a removed
    // machine, so multiple objectTypes + multiple ids + multiple kinds mix.
    regions: [region('r2', { surfaceCount: 9 }), region('r1', { surfaceCount: 9 }), region('r0')],
    machines: [],
  });

  const delta = releaseDelta(current, baseline);
  const objectTypeIndex = { region: 0, machine: 1, surface: 2, actor: 3, corridor: 4, metric: 5 };
  for (let i = 1; i < delta.changes.length; i++) {
    const prev = delta.changes[i - 1];
    const next = delta.changes[i];
    const prevKey = [objectTypeIndex[prev.objectType], prev.id];
    const nextKey = [objectTypeIndex[next.objectType], next.id];
    assert.ok(
      prevKey[0] < nextKey[0] || (prevKey[0] === nextKey[0] && prevKey[1] <= nextKey[1]),
      `changes must be sorted by objectType then id: ${JSON.stringify(prev)} before ${JSON.stringify(next)}`
    );
  }
});

// ---- summarizeDelta: honest counts naming their denominators --------------

test('summarizeDelta names a denominator for every kind and objectType bucket, and is honest on baselineAbsent', () => {
  const baseline = baseArtifact({ regions: [region('r1'), region('r2')] });
  const current = baseArtifact({ regions: [region('r1', { surfaceCount: 9 }), region('r3')] });

  const delta = releaseDelta(current, baseline);
  const summary = summarizeDelta(delta);

  assert.equal(summary.baselineAbsent, false);
  assert.equal(summary.totalChanges, delta.changes.length);
  assert.equal(summary.byObjectType.region.denominator, 3); // r1, r2, r3 union
  assert.equal(summary.byObjectType.region.byKind.added, 1);
  assert.equal(summary.byObjectType.region.byKind.removed, 1);
  assert.equal(summary.byObjectType.region.byKind['population-changed'], 1);
  for (const kind of Object.keys(summary.byKind)) {
    assert.equal(typeof summary.byKind[kind].denominator, 'number');
    assert.ok(summary.byKind[kind].denominator >= 0);
  }

  const absentSummary = summarizeDelta(releaseDelta(current, null));
  assert.equal(absentSummary.baselineAbsent, true);
  assert.equal(absentSummary.totalChanges, 0);
});

// ---- self-test against the real compiled artifact --------------------------

test('self-test: real build/atlas-projection.json diffed against a structurally-modified clone reports exactly the real changes', () => {
  const BUILDER = path.join(root, 'tools', 'build-atlas-projection.mjs');
  execFileSync(process.execPath, [BUILDER], { cwd: root, stdio: 'inherit' });

  const original = readJson('build/atlas-projection.json');
  const clone = JSON.parse(JSON.stringify(original));

  // 1) Move every x/y on every region and machine -- pure layout noise that
  //    must never be reported.
  for (const r of clone.regions) { r.position.x += 137.5; r.position.y -= 42.25; }
  for (const m of clone.machines) { m.position.x -= 300; m.position.y += 88.8; }

  // 2) Add a surface with no referential ties to any other collection (a
  //    hand-inserted node, not a full rebuild) -- exercises "added" in
  //    isolation from any cascading region/machine population change.
  const template = original.surface_nodes[0];
  const addedSurfaceId = 'zz-synthetic-self-test-surface';
  clone.surface_nodes.push({
    ...JSON.parse(JSON.stringify(template)),
    surface_id: addedSurfaceId,
    label: 'Synthetic Self-Test Surface',
    actor_ids: [],
    organization_ids: [],
    receipt_ids: [],
    evidence_composition: evidenceComposition({ reported: 1 }),
  });

  // 3) Decay one evidence class on an existing surface: shift one unit from
  //    a stronger class to a weaker one, holding population constant.
  const decaySurface = clone.surface_nodes.find(s => s.surface_id === template.surface_id);
  const strongClass = Object.keys(decaySurface.evidence_composition.by_class)
    .find(cls => cls !== 'open' && decaySurface.evidence_composition.by_class[cls] > 0);
  assert.ok(strongClass, 'fixture requires a real surface with at least one non-open evidence unit');
  decaySurface.evidence_composition.by_class[strongClass] -= 1;
  decaySurface.evidence_composition.by_class.open += 1;

  const delta = releaseDelta(clone, original);

  assert.equal(delta.changes.length, 2, `expected exactly 2 real changes, got: ${JSON.stringify(delta.changes, null, 2)}`);

  const added = delta.changes.find(c => c.kind === 'added');
  assert.ok(added, 'expected the added surface to be reported');
  assert.equal(added.objectType, 'surface');
  assert.equal(added.id, addedSurfaceId);

  const decayed = delta.changes.find(c => c.kind === 'evidence-decayed');
  assert.ok(decayed, 'expected the evidence decay to be reported');
  assert.equal(decayed.objectType, 'surface');
  assert.equal(decayed.id, template.surface_id);
});

test('release-delta.test.js: OK', () => {});
