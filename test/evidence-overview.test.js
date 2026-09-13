import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

/* Regression gate for docs/atlas-representation-ladder.md step 4: the
   permanent Evidence Overview. app.js is loaded the same way
   test/atlas-semantic.test.js loads it: strip the ES imports (not valid in
   a vm.Script) and the trailing init() call (needs a real DOM/fetch), then
   run the rest as a classic script so every top-level `function`
   declaration attaches to the vm context as a directly-callable global.

   Unlike the atlas ladder functions, evidenceOverviewModel(state, options)
   and sortOverviewRows(rows, sortKey, direction) take `state` as an
   explicit argument rather than reading the module-level `state` this file
   otherwise mutates directly â€” so this test builds its own plain fixture
   object from the real compiled datasets instead of poking the vm's
   internal `state`, and passes that fixture in directly. */

const raw = fs.readFileSync('app.js', 'utf8');
const withoutImports = raw.replace(/^import[^\n]*\n/gm, '');
const cutIndex = withoutImports.indexOf('\ninit().catch(');
assert.notEqual(cutIndex, -1, 'app.js must still end with the init().catch(...) bootstrap this test strips');
const source = withoutImports.slice(0, cutIndex);

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));
const publicCatalog = JSON.parse(fs.readFileSync('build/public-catalog.json', 'utf8'));

const context = {
  console, window: {}, structuredClone, URL, EVIDENCE_RANK,
  __input: { hopGraph, surfaceGraph, legacyGraph, scores }
};
vm.createContext(context);
// Populate the vm's own module-level `state` so functions like
// hopNetworkModel()/researchNetworkModel() (which still read that module
// state implicitly, exactly as in atlas-semantic.test.js) work when called
// below to build a realistic networkModel for the fixture.
vm.runInContext(`${source}
state.hopGraph = __input.hopGraph;
state.surfaceGraph = __input.surfaceGraph;
state.legacyGraph = __input.legacyGraph;
state.actors = new Map(__input.surfaceGraph.actors.map(a => [a.id, a]));
state.orgs = new Map(__input.surfaceGraph.organizations.map(o => [o.id, o]));
state.surfaces = new Map(__input.surfaceGraph.surfaces.map(s => [s.surface_id, s]));
state.actorScores = new Map(__input.scores.actors.map(a => [a.actor_id, a]));
globalThis.__denseThreshold = DENSE_SURFACE_PARTICIPANT_THRESHOLD;
`, context);

const {
  evidenceOverviewModel, sortOverviewRows, hopNetworkModel, researchNetworkModel
} = context;
const DENSE_SURFACE_PARTICIPANT_THRESHOLD = context.__denseThreshold;

for (const fn of [evidenceOverviewModel, sortOverviewRows, hopNetworkModel, researchNetworkModel]) {
  assert.equal(typeof fn, 'function', 'app.js must expose evidenceOverviewModel and sortOverviewRows as plain top-level function declarations');
}

const ROW_CLASSIFICATIONS = new Set(['actor', 'organization', 'surface', 'claim', 'hop']);
const TAB_IDS = ['visible', 'route', 'participants', 'rejected', 'warnings', 'gaps'];

// A fresh, independent fixture object shaped like the real module `state`,
// built straight from the compiled datasets â€” never the vm's internal
// `state` above. Rebuilt per-call so tests don't leak mutations at each other.
function buildFixtureState(overrides = {}) {
  const networkModel = overrides.mode === 'research' ? researchNetworkModel() : hopNetworkModel();
  return {
    networkModel,
    networkLevel: 'surface',
    networkSelectedId: null,
    networkSearchIds: new Set(),
    networkRouteIds: new Set(),
    networkPinned: new Set(),
    surfaceGraph,
    hopGraph,
    actors: new Map(surfaceGraph.actors.map(a => [a.id, a])),
    orgs: new Map(surfaceGraph.organizations.map(o => [o.id, o])),
    surfaces: new Map(surfaceGraph.surfaces.map(s => [s.surface_id, s])),
    receipts: new Map((receiptGraph.receipts ?? []).map(r => [r.receipt_id, r])),
    claimCatalog: new Map((publicCatalog.claims ?? []).map(c => [c.key, c])),
    tracks: new Map((publicCatalog.tracks ?? []).map(t => [t.track_id, t])),
    ...overrides
  };
}

console.log('evidence-overview.test.js: definitions loaded, node:test running');

/* ---------------- (a) shape and tab contract ---------------- */

test('evidenceOverviewModel returns exactly the six ladder-mandated tabs, in order', () => {
  const model = evidenceOverviewModel(buildFixtureState(), {});
  // Rebuild via a host-realm array literal (spread) before comparing: model.tabs
  // was constructed inside the vm context, so a bare .map() on it stays a
  // cross-realm array, and assert.deepEqual treats that as non-equal to a
  // plain array literal even with identical contents.
  assert.deepEqual([...model.tabs.map(t => t.id)], TAB_IDS);
  assert.deepEqual([...model.tabs.map(t => t.label)], [
    'Visible objects', 'Active route', 'Surface participants', 'Rejected steps', 'Evidence warnings', 'Research gaps'
  ]);
  for (const tab of model.tabs) assert.ok(Number.isInteger(tab.count) && tab.count >= 0);
  assert.equal(model.activeTab, 'visible', 'defaults to the visible-objects tab when none is requested');
});

test('an unrecognized activeTab falls back to visible objects, never throws or renders nothing', () => {
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'not-a-real-tab' });
  assert.equal(model.activeTab, 'visible');
});

test('every row on every tab carries the required fields with legal values', () => {
  const fixture = buildFixtureState({ networkSelectedId: hopGraph.anchor_actor_id, networkLevel: 'evidence' });
  for (const tabId of TAB_IDS) {
    const model = evidenceOverviewModel(fixture, { activeTab: tabId, surfaceId: 'no10-digital-data-advisory-2019-2021' });
    for (const row of model.rows) {
      assert.equal(typeof row.key, 'string');
      assert.ok(row.key.length > 0, `${tabId} row must carry a non-empty stable identity key`);
      assert.ok(ROW_CLASSIFICATIONS.has(row.classification), `${tabId} row classification "${row.classification}" must be one of actor/organization/surface/claim/hop`);
      assert.equal(typeof row.label, 'string');
      assert.ok(Array.isArray(row.receiptIds));
      assert.equal(typeof row.receiptCount, 'number');
      assert.ok(row.receiptCount >= 0);
      assert.equal(typeof row.graphEffect, 'string');
    }
    // stable-identity requirement: no two rows on the same tab share a key
    const keys = model.rows.map(r => r.key);
    assert.equal(new Set(keys).size, keys.length, `${tabId} row keys must be unique`);
  }
});

/* ---------------- (b) Visible objects ---------------- */

test('visible objects: corpus level with no bypass renders zero individual rows, matching buildAtlasIndividualNodes', () => {
  const fixture = buildFixtureState({ networkLevel: 'corpus', networkSelectedId: null });
  const model = evidenceOverviewModel(fixture, { activeTab: 'visible' });
  assert.equal(model.rows.length, 0);
});

test('visible objects: a selection bypasses corpus suppression and appears as exactly one row', () => {
  const targetId = hopGraph.anchor_actor_id;
  const fixture = buildFixtureState({ networkLevel: 'corpus', networkSelectedId: targetId });
  const model = evidenceOverviewModel(fixture, { activeTab: 'visible' });
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].objectId, targetId);
  assert.equal(model.rows[0].objectKind, 'node');
  assert.equal(model.rows[0].classification, 'actor', 'every hops-mode node is a person, so classification must be actor');
});

test('visible objects: at surface level every hop-mode node renders, one row each', () => {
  const fixture = buildFixtureState({ networkLevel: 'surface' });
  const model = evidenceOverviewModel(fixture, { activeTab: 'visible' });
  assert.equal(model.rows.length, fixture.networkModel.nodes.length);
});

/* ---------------- (c) Active route ---------------- */

test('active route: empty in research mode (no hop route exists)', () => {
  const fixture = buildFixtureState({ mode: 'research', networkSelectedId: 'dialog' });
  const model = evidenceOverviewModel(fixture, { activeTab: 'route' });
  assert.equal(model.rows.length, 0);
});

test('active route: empty when nothing is selected, even in hops mode', () => {
  const fixture = buildFixtureState({ networkSelectedId: null });
  const model = evidenceOverviewModel(fixture, { activeTab: 'route' });
  assert.equal(model.rows.length, 0);
});

test('active route: alternates actor/surface rows and every surface basis is real', () => {
  const [routeId, path] = Object.entries(hopGraph.shortest_paths).find(([, p]) => p && p.number > 0);
  const fixture = buildFixtureState({ networkSelectedId: routeId });
  const model = evidenceOverviewModel(fixture, { activeTab: 'route' });
  assert.equal(model.rows.length, path.actor_path.length + path.hops.length, 'one row per actor step plus one per hop surface');
  path.actor_path.forEach((actorId, i) => {
    assert.equal(model.rows[i * 2].classification, 'actor');
    assert.equal(model.rows[i * 2].objectId, actorId);
    assert.equal(model.rows[i * 2].objectKind, 'node');
  });
  const surfaceRows = model.rows.filter(r => r.classification === 'surface');
  assert.equal(surfaceRows.length, path.hops.length);
  surfaceRows.forEach((row, i) => {
    const basis = path.hops[i].shared_surfaces[0];
    assert.equal(row.objectId, basis.surface_id);
    assert.equal(row.evidenceClass, basis.evidence_class);
    assert.deepEqual(row.receiptIds, basis.receipt_ids ?? []);
    assert.ok(row.inferenceBoundary && /does not establish/.test(row.inferenceBoundary), 'route surface rows must carry the compiler inference boundary');
  });
});

/* ---------------- (d) Surface participants ---------------- */

test('surface participants: no surfaceId means an honestly empty tab, not a crash', () => {
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'participants' });
  assert.equal(model.rows.length, 0);
});

test('surface participants: a real non-dense surface renders one row per participant', () => {
  const surface = surfaceGraph.surfaces.find(s =>
    (s.participants ?? []).filter(p => p.participant_type === 'actor').length < DENSE_SURFACE_PARTICIPANT_THRESHOLD && (s.participants ?? []).length > 0);
  assert.ok(surface, 'fixture corpus must contain at least one non-dense surface with participants');
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'participants', surfaceId: surface.surface_id });
  assert.equal(model.rows.length, surface.participants.length);
  surface.participants.forEach((participant, i) => {
    const row = model.rows[i];
    const isActor = participant.participant_type === 'actor';
    assert.equal(row.classification, isActor ? 'actor' : 'organization');
    assert.equal(row.objectId, isActor ? participant.actor_id : participant.organization_id);
    assert.deepEqual(row.receiptIds, participant.receipt_ids ?? []);
  });
});

test('surface participants: a dense/roster surface collapses to one honest aggregate row, never pairwise rows', () => {
  const denseSurfaceId = '__test-dense-surface';
  const fixture = buildFixtureState();
  fixture.surfaces = new Map(fixture.surfaces);
  fixture.surfaces.set(denseSurfaceId, {
    surface_id: denseSurfaceId,
    surface_label: 'Synthetic dense forum',
    receipt_ids: ['r-1'],
    participants: Array.from({ length: 25 }, (_, i) => ({
      participant_type: 'actor', actor_id: `synthetic-${i}`, participation_type: i % 2 ? 'member' : 'guest'
    }))
  });
  const model = evidenceOverviewModel(fixture, { activeTab: 'participants', surfaceId: denseSurfaceId });
  assert.equal(model.rows.length, 1, 'a dense surface must never expand into 25 pairwise rows');
  const [row] = model.rows;
  assert.equal(row.classification, 'surface');
  assert.equal(row.objectId, denseSurfaceId);
  assert.match(row.graphEffect, /25 documented participants/);
  assert.ok(row.rosterCategories.length > 0);
  const totalFromCategories = row.rosterCategories.reduce((sum, c) => sum + c.count, 0);
  assert.equal(totalFromCategories, 25, 'roster categories must honestly sum to the full suppressed population, never omitted');
  assert.match(row.inferenceBoundary, /never expanded into person-to-person adjacency/);
});

/* ---------------- (e) Rejected steps ---------------- */

test('rejected steps: one row per rejected_hop_pairs entry plus one per rejected_hop_surfaces entry', () => {
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'rejected' });
  assert.equal(model.rows.length, (hopGraph.rejected_hop_pairs?.length ?? 0) + (hopGraph.rejected_hop_surfaces?.length ?? 0));
  const pairRows = model.rows.filter(r => r.classification === 'hop');
  assert.equal(pairRows.length, hopGraph.rejected_hop_pairs.length);
  pairRows.forEach((row, i) => {
    const pair = hopGraph.rejected_hop_pairs[i];
    assert.equal(row.publicationStatus, pair.publication_status);
    assert.equal(row.objectId, pair.surface_id);
    if (pair.publication_status === 'verified') {
      assert.match(row.inferenceBoundary, /does not overlap/);
    } else {
      assert.match(row.inferenceBoundary, /not publicly re-verifiable/);
    }
  });
});

/* ---------------- (f) Evidence warnings ---------------- */

test('evidence warnings: surfaces receipts with archival distress and review-required claims', () => {
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'warnings' });
  const lostReceipts = [...receiptGraph.receipts].filter(r => r.archive?.method === 'unrecoverable_local_paste');
  assert.ok(lostReceipts.length > 0, 'fixture corpus must contain at least one unrecoverable receipt to exercise this tab');
  for (const receipt of lostReceipts) {
    const row = model.rows.find(r => r.objectId === receipt.receipt_id);
    assert.ok(row, `warning row must exist for unrecoverable receipt ${receipt.receipt_id}`);
    assert.equal(row.severity, 'lost');
    assert.equal(row.inferenceBoundary, receipt.archive.note ?? null);
  }
  const reviewClaims = publicCatalog.claims.filter(c => c.claim_status === 'review_required');
  for (const claim of reviewClaims) {
    const row = model.rows.find(r => r.objectId === claim.key);
    assert.ok(row, `warning row must exist for review-required claim ${claim.key}`);
    assert.equal(row.severity, 'review');
  }
  // a fully healthy receipt (recorded archive.ref, no note) must not appear
  const healthy = receiptGraph.receipts.find(r => r.archive?.ref && !r.archive?.note);
  if (healthy) assert.ok(!model.rows.some(r => r.objectId === healthy.receipt_id), 'a receipt with a recorded archive reference and no note is not a warning');
});

/* ---------------- (g) Research gaps ---------------- */

test('research gaps: undated-participation aggregate names its real denominator', () => {
  let undated = 0, total = 0;
  for (const s of surfaceGraph.surfaces) for (const p of s.participants ?? []) { total++; if (!p.time_start && !p.time_end) undated++; }
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'gaps' });
  const row = model.rows.find(r => r.key === 'gap:undated-participations');
  assert.ok(row);
  assert.equal(row.graphEffect, `${undated} of ${total} documented participations carry no date and support no time-sliced ("as of") query.`);
});

test('research gaps: every gap row names an honest denominator matching the real corpus', () => {
  const model = evidenceOverviewModel(buildFixtureState(), { activeTab: 'gaps' });
  for (const row of model.rows) {
    assert.match(row.graphEffect, /\d+ (of|declared)/, `gap row "${row.key}" must name a denominator`);
  }
});

/* ---------------- (h) sortOverviewRows: stability is constitutional ---------------- */

test('sortOverviewRows: stable tie-break preserves original relative order for equal keys', () => {
  const rows = [
    { key: 'a', label: 'x', receiptCount: 1 },
    { key: 'b', label: 'x', receiptCount: 1 },
    { key: 'c', label: 'x', receiptCount: 1 },
    { key: 'd', label: 'x', receiptCount: 1 }
  ];
  const sorted = sortOverviewRows(rows, 'label', 'asc');
  assert.deepEqual(sorted.map(r => r.key), ['a', 'b', 'c', 'd'], 'equal sort values must never reorder relative to input order');
});

test('sortOverviewRows: sorts correctly by receiptCount in both directions', () => {
  const rows = [
    { key: 'low', receiptCount: 1, label: 'Low' },
    { key: 'high', receiptCount: 9, label: 'High' },
    { key: 'mid', receiptCount: 4, label: 'Mid' }
  ];
  assert.deepEqual(sortOverviewRows(rows, 'receiptCount', 'asc').map(r => r.key), ['low', 'mid', 'high']);
  assert.deepEqual(sortOverviewRows(rows, 'receiptCount', 'desc').map(r => r.key), ['high', 'mid', 'low']);
});

test('sortOverviewRows: applying a filter after sorting preserves the relative order of surviving rows', () => {
  const rows = [
    { key: 'a', receiptCount: 3, label: 'A' },
    { key: 'b', receiptCount: 1, label: 'B' },
    { key: 'c', receiptCount: 2, label: 'C' },
    { key: 'd', receiptCount: 5, label: 'D' },
    { key: 'e', receiptCount: 4, label: 'E' }
  ];
  const sorted = sortOverviewRows(rows, 'receiptCount', 'asc'); // b, c, a, e, d
  const filtered = sorted.filter(r => r.receiptCount >= 2); // c, a, e, d
  assert.deepEqual(filtered.map(r => r.key), ['c', 'a', 'e', 'd'], 'filtering the already-sorted rows must not disturb their relative order');
});

test('evidenceOverviewModel: re-rendering with an unchanged model produces identical row order', () => {
  const fixture = buildFixtureState({ networkLevel: 'evidence', networkSelectedId: hopGraph.anchor_actor_id });
  const options = { activeTab: 'visible', sortKey: 'label', sortDirection: 'asc' };
  const first = evidenceOverviewModel(fixture, options);
  const second = evidenceOverviewModel(fixture, options);
  assert.deepEqual(first.rows.map(r => r.key), second.rows.map(r => r.key));
  assert.deepEqual(first, second, 'identical inputs must produce a structurally identical model â€” no hidden nondeterminism');
});

test('evidenceOverviewModel: without an explicit sortKey, row order is the stable builder order (hover/hash changes never implicitly sort)', () => {
  const fixture = buildFixtureState({ networkLevel: 'evidence' });
  const unsorted1 = evidenceOverviewModel(fixture, { activeTab: 'rejected' });
  const unsorted2 = evidenceOverviewModel(fixture, { activeTab: 'rejected' });
  assert.deepEqual(unsorted1.rows.map(r => r.key), unsorted2.rows.map(r => r.key));
  assert.equal(unsorted1.sortKey, null);
});

console.log('evidence-overview.test.js: all suites registered');
