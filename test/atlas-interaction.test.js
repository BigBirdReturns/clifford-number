import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

/* Regression gate for docs/atlas-interaction-contract.md (operator design
   review round 3). Same vm-loading pattern as test/atlas-semantic.test.js:
   strip the ES imports and the trailing init().catch(...) bootstrap, then run
   the rest as a classic script so every top-level `function` declaration in
   app.js attaches to the vm context as a directly-callable global. Every
   function exercised below is therefore a plain top-level function
   declaration in app.js, never a const arrow -- consistent with the rest of
   the atlas ladder's pure helpers. */

const raw = fs.readFileSync('app.js', 'utf8');
const withoutImports = raw.replace(/^import[^\n]*\n/gm, '');
const cutIndex = withoutImports.indexOf('\ninit().catch(');
assert.notEqual(cutIndex, -1, 'app.js must still end with the init().catch(...) bootstrap this test strips');
const source = withoutImports.slice(0, cutIndex);

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));

const context = {
  console, window: {}, structuredClone, URL, EVIDENCE_RANK,
  __input: { hopGraph, surfaceGraph, legacyGraph, scores }
};
vm.createContext(context);
vm.runInContext(`${source}
state.hopGraph = __input.hopGraph;
state.surfaceGraph = __input.surfaceGraph;
state.legacyGraph = __input.legacyGraph;
state.actors = new Map(__input.surfaceGraph.actors.map(a => [a.id, a]));
state.surfaces = new Map(__input.surfaceGraph.surfaces.map(s => [s.surface_id, s]));
state.actorScores = new Map(__input.scores.actors.map(a => [a.actor_id, a]));
`, context);

const {
  hopNetworkModel, researchNetworkModel,
  zoomViewAboutPoint,
  buildMachineEdgeBands, machineEdgeBandLabel,
  buildEdgeLocalityModel, isPointInView, buildOffscreenChips,
  computeAtlasSelectionModel, computeSelectionSubordinationClasses,
  inspectorBreadcrumbModel,
  computeOrientationStripState
} = context;

for (const fn of [
  hopNetworkModel, researchNetworkModel, zoomViewAboutPoint,
  buildMachineEdgeBands, machineEdgeBandLabel,
  buildEdgeLocalityModel, isPointInView, buildOffscreenChips,
  computeAtlasSelectionModel, computeSelectionSubordinationClasses,
  inspectorBreadcrumbModel, computeOrientationStripState
]) {
  assert.equal(typeof fn, 'function', 'app.js must expose the interaction-contract functions as plain top-level function declarations');
}

/* ---------------- (1) Camera: cursor-anchored zoom (contract Section 1) ---------------- */

function driftForAnchor(view, factor, worldX, worldY) {
  const fx = (worldX - view.x) / view.width;
  const fy = (worldY - view.y) / view.height;
  const next = zoomViewAboutPoint(view, factor, worldX, worldY);
  const worldXAfter = next.x + fx * next.width;
  const worldYAfter = next.y + fy * next.height;
  return { drift: Math.hypot(worldXAfter - worldX, worldYAfter - worldY), next };
}

test('zoomViewAboutPoint keeps the world point under the pointer fixed (<2 world units drift) at all four canvas corners, zooming in and out', () => {
  const fullView = { x: 0, y: 0, width: 1400, height: 900 };
  const corners = [[0, 0], [1400, 0], [0, 900], [1400, 900]];
  for (const [wx, wy] of corners) {
    for (const factor of [0.5, 2, 0.72, 1.28]) {
      const { drift } = driftForAnchor(fullView, factor, wx, wy);
      assert.ok(drift < 2, `corner (${wx},${wy}) factor ${factor}: drift ${drift} must be < 2 world units`);
    }
  }
});

test('zoomViewAboutPoint keeps an interior anchor fixed too, not just corners', () => {
  const view = { x: 200, y: 150, width: 700, height: 450 };
  const { drift } = driftForAnchor(view, 0.6, 550, 400);
  assert.ok(drift < 2);
});

test('zoomViewAboutPoint clamps width to [260, 1400] and the view rect to the 1400x900 canvas bounds', () => {
  const fullView = { x: 0, y: 0, width: 1400, height: 900 };
  // Zooming "in" by a huge factor must not go narrower than the 260 floor.
  const zoomedInFar = zoomViewAboutPoint(fullView, 0.001, 700, 450);
  assert.equal(zoomedInFar.width, 260);
  assert.ok(zoomedInFar.x >= 0 && zoomedInFar.x <= 1400 - zoomedInFar.width);
  assert.ok(zoomedInFar.y >= 0 && zoomedInFar.y <= 900 - zoomedInFar.height);
  // Zooming "out" from an already-minimal view must not exceed the full width, and must stay canvas-bounded.
  const narrowView = { x: 1140, y: 733, width: 260, height: 167 };
  const zoomedOutFar = zoomViewAboutPoint(narrowView, 1000, 1400, 900);
  assert.equal(zoomedOutFar.width, 1400);
  assert.equal(zoomedOutFar.x, 0);
  assert.equal(zoomedOutFar.y, 0);
  // A clamp-triggering zoom near an edge still keeps the view fully inside the canvas.
  const nearEdge = { x: 1300, y: 800, width: 100, height: 64 };
  const clamped = zoomViewAboutPoint(nearEdge, 5, 1350, 830);
  assert.ok(clamped.x >= 0 && clamped.x + clamped.width <= 1400 + 1e-6, 'clamped view must stay within canvas x bounds');
  assert.ok(clamped.y >= 0 && clamped.y + clamped.height <= 900 + 1e-6, 'clamped view must stay within canvas y bounds');
});

/* ---------------- (2) Machine-level edge banding (contract Section 3) ---------------- */

test('buildMachineEdgeBands: with nothing selected, individual on-screen edges are 0 (<=30 acceptance check) and every edge lands in exactly one named-count band', () => {
  const model = hopNetworkModel();
  assert.ok(model.edges.length > 0, 'fixture must carry real edges to make this a meaningful test');
  const bandModel = buildMachineEdgeBands(model, null);
  assert.equal(bandModel.individualEdgeIds.size, 0, 'no selection means no selection neighborhood to keep individual');
  assert.ok(bandModel.individualEdgeIds.size <= 30, 'machine level with nothing selected must keep individual edges <= 30');
  const bandedTotal = bandModel.bands.reduce((sum, band) => sum + band.count, 0);
  assert.equal(bandedTotal, model.edges.length, 'every edge must be accounted for in exactly one band when nothing is selected');
  for (const band of bandModel.bands) {
    assert.ok(band.count > 0);
    assert.match(machineEdgeBandLabel(band), /^\d+ documented edges?$/, 'a band must carry a named, counted label, never a bare number');
  }
});

test('buildMachineEdgeBands: selecting a node keeps only its own edges individual, and the remainder still bands honestly', () => {
  const model = hopNetworkModel();
  const target = model.nodes.find(node => model.edges.some(edge => edge.from === node.id || edge.to === node.id));
  assert.ok(target, 'fixture must carry at least one node with an edge');
  const expectedIndividual = model.edges.filter(edge => edge.from === target.id || edge.to === target.id).length;
  const bandModel = buildMachineEdgeBands(model, target.id);
  assert.equal(bandModel.individualEdgeIds.size, expectedIndividual, 'only the selection neighborhood stays individual');
  const bandedTotal = bandModel.bands.reduce((sum, band) => sum + band.count, 0);
  assert.equal(bandedTotal + bandModel.individualEdgeIds.size, model.edges.length, 'every edge is either individual (selection) or counted in exactly one band, never both, never dropped');
});

/* ---------------- (3) Edge locality at surface/evidence levels (contract Section 4) ---------------- */

test('buildEdgeLocalityModel drops an edge whose both endpoints are off-screen, and keeps an edge whose both endpoints are in view', () => {
  const model = {
    mode: 'hops',
    nodeById: new Map([
      ['a', { x: 100, y: 100 }], ['b', { x: 120, y: 120 }],
      ['c', { x: 1300, y: 800 }], ['d', { x: 1350, y: 850 }]
    ]),
    edges: [
      { id: 'in-view', from: 'a', to: 'b', evidence_class: 'primary_public' },
      { id: 'both-offscreen', from: 'c', to: 'd', evidence_class: 'primary_public' }
    ]
  };
  const view = { x: 0, y: 0, width: 260, height: 167 };
  const { rendered, stubs } = buildEdgeLocalityModel(model, view, 40);
  assert.ok(rendered.some(edge => edge.id === 'in-view'));
  assert.ok(!rendered.some(edge => edge.id === 'both-offscreen'), 'a fully off-screen edge must never render as a full line');
  assert.ok(!stubs.some(stub => stub.edgeId === 'both-offscreen'), 'a fully off-screen edge must never render as a stub either -- it is dropped, not through-traffic');
});

test('buildEdgeLocalityModel stubs a one-endpoint-offscreen edge toward its partner at the fixed ~60 world-unit stub length', () => {
  const model = {
    mode: 'hops',
    nodeById: new Map([['near', { id: 'near', x: 50, y: 50 }], ['far', { id: 'far', x: 900, y: 50 }]]),
    edges: [{ id: 'e1', from: 'near', to: 'far', evidence_class: 'primary_public' }]
  };
  const view = { x: 0, y: 0, width: 260, height: 167 };
  const { rendered, stubs } = buildEdgeLocalityModel(model, view, 40);
  assert.equal(rendered.length, 0, 'this edge has exactly one endpoint in view, so it must not render as a full line');
  assert.equal(stubs.length, 1);
  const [stub] = stubs;
  assert.equal(stub.nodeId, 'near');
  assert.equal(stub.partnerId, 'far');
  const length = Math.hypot(stub.x2 - stub.x1, stub.y2 - stub.y1);
  assert.ok(Math.abs(length - 60) < 0.5, `stub length should be ~60 world units, got ${length}`);
  assert.ok(stub.x2 > stub.x1, 'the stub must point from the visible node TOWARD the off-screen partner');
});

test('buildOffscreenChips only surfaces a chip once a node accumulates >=3 offscreen partners -- an honest count, not per-edge noise', () => {
  const nodeById = new Map([['hub', { x: 50, y: 50 }]]);
  assert.equal(buildOffscreenChips(new Map([['hub', 2]]), nodeById).length, 0, 'below the threshold, no chip');
  const chips = buildOffscreenChips(new Map([['hub', 3]]), nodeById);
  assert.equal(chips.length, 1);
  assert.equal(chips[0].count, 3);
  assert.equal(chips[0].nodeId, 'hub');
});

test('against the real compiled hop corpus, buildEdgeLocalityModel never renders (as a line or a stub) an edge with both endpoints off-screen', () => {
  const model = hopNetworkModel();
  const view = { x: 500, y: 300, width: 260, height: 167 };
  const margin = 40;
  const { rendered, stubs } = buildEdgeLocalityModel(model, view, margin);
  for (const edge of rendered) {
    const from = model.nodeById.get(edge.from), to = model.nodeById.get(edge.to);
    assert.ok(isPointInView(from.x, from.y, view, margin) || isPointInView(to.x, to.y, view, margin), `rendered edge ${edge.id} must have at least one endpoint in view`);
  }
  for (const stub of stubs) {
    const node = model.nodeById.get(stub.nodeId);
    assert.ok(isPointInView(node.x, node.y, view, margin), `stub origin node ${stub.nodeId} must itself be the visible endpoint`);
  }
});

/* ---------------- (4) Unmistakable selection (contract Section 4) ---------------- */

test('computeAtlasSelectionModel: adjacent edges, adjacent nodes, and everything else in the dim set', () => {
  const model = {
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    edges: [{ id: 'e1', from: 'a', to: 'b' }, { id: 'e2', from: 'b', to: 'c' }]
  };
  const selection = computeAtlasSelectionModel(model, 'b');
  assert.deepEqual([...selection.adjacentEdgeIds].sort(), ['e1', 'e2']);
  assert.deepEqual([...selection.adjacentNodeIds].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...selection.dimNodeIds].sort(), ['d']);
});

test('computeAtlasSelectionModel with no selection returns empty, never throws on a model with no edges', () => {
  const selection = computeAtlasSelectionModel({ nodes: [{ id: 'a' }], edges: [] }, null);
  assert.equal(selection.selectedId, null);
  assert.equal(selection.adjacentEdgeIds.size, 0);
  assert.equal(selection.dimNodeIds.size, 0);
});

test('computeSelectionSubordinationClasses: the glyph and its adjacent edges/nodes stay bright, non-adjacent content dims -- same shape as route subordination', () => {
  const model = { nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], edges: [{ id: 'e1', from: 'a', to: 'b' }] };
  const selection = computeAtlasSelectionModel(model, 'a');
  const classes = computeSelectionSubordinationClasses(['a', 'b', 'c', 'd'], selection);
  assert.equal(classes.get('a'), 'is-selection-adjacent');
  assert.equal(classes.get('b'), 'is-selection-adjacent');
  assert.equal(classes.get('c'), 'is-selection-dim');
  assert.equal(classes.get('d'), 'is-selection-dim');
});

test('computeSelectionSubordinationClasses returns an empty map when there is no selection -- nothing gets forced dim', () => {
  const classes = computeSelectionSubordinationClasses(['a', 'b'], { selectedId: null });
  assert.equal(classes.size, 0);
});

/* ---------------- (5) Record inspector breadcrumb (contract Section 5) ---------------- */

// NOTE: inspectorBreadcrumbModel runs inside the vm context, so its return
// value is an array/objects from that context's OWN realm. node:assert's
// strict deepEqual treats same-shaped-but-cross-realm arrays/objects as not
// equal, so comparisons below check field-by-field (via .join/.map to a
// plain string, or direct property access) rather than deepEqual against an
// outer-realm array/object literal.

test('inspectorBreadcrumbModel builds mode -> object -> claim in that fixed order, from whichever fields are provided', () => {
  const full = inspectorBreadcrumbModel({ mode: 'Research network', objectLabel: 'Dialog', objectId: 'dialog', claimLabel: 'Peter Thiel co-founder claim' });
  assert.equal(full.length, 3);
  assert.equal(full.map(crumb => crumb.kind).join(','), 'mode,object,claim');
  assert.equal(full[0].label, 'Research network');
  assert.equal(full[1].label, 'Dialog');
  assert.equal(full[1].objectId, 'dialog');
  assert.equal(full[2].label, 'Peter Thiel co-founder claim');
});

test('inspectorBreadcrumbModel omits crumbs for fields not provided, and is empty (never throws) with nothing at all', () => {
  const noClaim = inspectorBreadcrumbModel({ mode: 'Research network', objectLabel: 'Dialog' });
  assert.equal(noClaim.map(crumb => crumb.kind).join(','), 'mode,object');
  const claimOnly = inspectorBreadcrumbModel({ claimLabel: 'Some claim' });
  assert.equal(claimOnly.map(crumb => crumb.kind).join(','), 'claim');
  assert.equal(inspectorBreadcrumbModel({}).length, 0);
  assert.equal(inspectorBreadcrumbModel().length, 0);
});

/* ---------------- (6) First three minutes orientation strip (contract Section 6) ---------------- */

function assertStripState(actual, dismissed, visible) {
  assert.equal(actual.dismissed, dismissed);
  assert.equal(actual.visible, visible);
}

test('computeOrientationStripState: visible until a zoom or select event, then permanently dismissed regardless of further events', () => {
  assertStripState(computeOrientationStripState(false, null), false, true);
  assertStripState(computeOrientationStripState(false, 'zoom'), true, false);
  assertStripState(computeOrientationStripState(false, 'select'), true, false);
  assertStripState(computeOrientationStripState(false, 'dismiss'), true, false);
  // an unrelated/unknown event does not dismiss it
  assertStripState(computeOrientationStripState(false, 'pan'), false, true);
  // once dismissed, it is a one-way door -- stays dismissed no matter what event comes next
  assertStripState(computeOrientationStripState(true, null), true, false);
  assertStripState(computeOrientationStripState(true, 'zoom'), true, false);
});

console.log('atlas-interaction.test.js: definitions loaded, node:test running');
