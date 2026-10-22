import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync('home.js', 'utf8').replace(/\ninit\(\);\s*$/, '');
const researchGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));

const OVERLAY_LAYER = 'canonical_surface_overlay';
const overlayEdges = researchGraph.edges.filter(edge => edge.projection_layer === OVERLAY_LAYER);
const documentedEdges = researchGraph.edges.filter(edge => edge.projection_layer !== OVERLAY_LAYER);

const context = {
  console,
  structuredClone,
  URL,
  location: { href: 'https://clifford.test/home' },
  CLIFFORD_GRAPH_CONFIG: {},
  __input: { researchGraph, receiptGraph }
};

vm.createContext(context);
vm.runInContext(`${source}
state.researchGraph = __input.researchGraph;
state.receiptGraph = __input.receiptGraph;
state.receiptById = new Map((__input.receiptGraph.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
globalThis.__contract = {
  homepage: typeof homepageModel === 'function' ? homepageModel() : null,
  buildLaneModel: typeof buildLaneModel === 'function' ? buildLaneModel : null,
  inspection: typeof evidenceInspectionModel === 'function' ? evidenceInspectionModel() : null
};`, context);

const { homepage, buildLaneModel, inspection } = context.__contract;
const sourceIds = new Set((researchGraph.sources ?? []).map(source => source.id));

function requireHomepage() {
  assert.ok(homepage, 'home.js must provide homepageModel() as the pure, testable homepage boundary');
  return homepage;
}

function allMarks(model) {
  return model.lanes.flatMap(lane => lane.marks ?? []);
}

test('every published research edge resolves to its exact authorized receipts', () => {
  for (const edge of researchGraph.edges) {
    assert.ok(edge.id, 'every edge needs a stable id');
    assert.ok(edge.from && edge.to, `${edge.id} must name both path endpoints`);
    assert.ok(edge.type, `${edge.id} must retain its typed path step`);
    assert.ok(edge.source_ids?.length, `${edge.id} must expose at least one receipt`);
    for (const receiptId of edge.source_ids) {
      assert.ok(sourceIds.has(receiptId), `${edge.id} cites unknown receipt ${receiptId}`);
    }
  }
});

test('the homepage model contains exactly four stable causal lanes', () => {
  const model = requireHomepage();
  assert.equal(model.interactionMode, 'homepage-summary');
  assert.deepEqual(
    Array.from(model.lanes, lane => lane.id),
    ['model-production', 'workflow-admission', 'activation-spend', 'measurement-feedback']
  );
  assert.ok(model.lanes.every(lane => lane.projection === 'face-on'));
  assert.ok(model.lanes.every(lane => Number.isFinite(lane.x) && Number.isFinite(lane.y)));
});

test('every displayed edge and number carries direct receipt access', () => {
  const model = requireHomepage();
  for (const edge of model.edges) {
    assert.ok(edge.pathStepId, `${edge.id} must resolve to an exact authorized path step`);
    assert.ok(edge.receiptIds?.length, `${edge.id} must provide direct receipt access`);
  }
  for (const number of model.displayedNumbers) {
    assert.ok(Number.isFinite(number.value), `${number.id} must expose its numeric value`);
    assert.ok(number.receiptIds?.length, `${number.id} must provide direct receipt access`);
  }
});

test('visible counts are derived from the documented aggregate marks', () => {
  const model = requireHomepage();
  const marks = allMarks(model);
  assert.equal(model.visibleCounts.marks, marks.length);
  assert.equal(
    model.visibleCounts.documentedRecords,
    marks.reduce((sum, mark) => sum + mark.documentedCount, 0)
  );
  assert.ok(marks.every(mark => Number.isInteger(mark.documentedCount) && mark.documentedCount >= 0));
  assert.ok(marks.every(mark => mark.receiptIds?.length), 'every aggregate mark must expose the receipts behind its count');
});

test('canonical surface overlay rows are excluded from every lane and from documented records', () => {
  const model = requireHomepage();
  assert.ok(overlayEdges.length > 0, 'graph.json is expected to carry topology-only overlay rows; retire this guard deliberately if that changes');
  assert.equal(model.visibleCounts.overlayEdgesExcluded, overlayEdges.length, 'the model must report how many overlay rows it set aside');
  assert.equal(model.visibleCounts.documentedRecords, documentedEdges.length, 'documented records must count only research edges');
  const totalNumber = model.displayedNumbers.find(number => number.id === 'total-documented-records');
  assert.equal(totalNumber?.value, documentedEdges.length);
  const overlayIds = new Set(overlayEdges.map(edge => edge.id));
  assert.ok(model.edges.every(edge => !overlayIds.has(edge.pathStepId)), 'no overlay row may appear as a displayed edge');
  assert.ok(allMarks(model).every(mark => !/topology/i.test(mark.label)), 'no lane may carry a mark made of overlay rows');
});

test('an unmapped research edge type is reported, never absorbed into a lane by default', () => {
  assert.equal(typeof buildLaneModel, 'function', 'home.js must expose buildLaneModel as a top-level function');
  const unmapped = { id: 'edge-unmapped', from: 'a', to: 'b', type: 'not-a-lane-type', source_ids: ['src-1'] };
  assert.throws(() => buildLaneModel({ edges: [unmapped] }), /Unmapped research edge type "not-a-lane-type"/);
  // The same type as an overlay row is set aside before classification, so it
  // neither throws nor lands in a lane.
  const overlayOnly = buildLaneModel({ edges: [{ ...unmapped, type: 'topology', projection_layer: OVERLAY_LAYER }] });
  assert.equal(overlayOnly.flatMap(lane => lane.marks).length, 0);
});

test('the joined causal-receipt aperture stays physically open', () => {
  const model = requireHomepage();
  assert.deepEqual(
    {
      state: model.aperture.state,
      afterLane: model.aperture.afterLane,
      beforeLane: model.aperture.beforeLane,
      joinedReceiptIds: model.aperture.joinedReceiptIds
    },
    {
      state: 'open',
      afterLane: 'activation-spend',
      beforeLane: 'measurement-feedback',
      joinedReceiptIds: []
    }
  );
  assert.equal(
    model.edges.some(edge => edge.fromLane === 'activation-spend' && edge.toLane === 'measurement-feedback'),
    false,
    'no speculative edge may bridge spend to measured outcome without the joined receipt'
  );
});

test('the homepage carries no depth planes and no stub provenance inspector', () => {
  const model = requireHomepage();
  assert.equal(model.provenancePlates, undefined, 'the homepage must not distribute the research across depth planes');
  assert.equal(inspection, null, 'the Plate A/B/C evidence inspector (three identical dot grids) is retired');
});
