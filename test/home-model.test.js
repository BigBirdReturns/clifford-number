import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync('home.js', 'utf8').replace(/\ninit\(\);\s*$/, '');
const researchGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));

const context = {
  console,
  structuredClone,
  URL,
  location: { href: 'https://clifford.test/home' },
  CLIFFORD_GRAPH_CONFIG: {},
  __input: { researchGraph, hopGraph, surfaceGraph, receiptGraph }
};

vm.createContext(context);
vm.runInContext(`${source}
state.researchGraph = __input.researchGraph;
state.hopGraph = __input.hopGraph;
state.surfaceGraph = __input.surfaceGraph;
state.receiptGraph = __input.receiptGraph;
state.receiptById = new Map((__input.receiptGraph.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
globalThis.__contract = {
  homepage: typeof homepageModel === 'function' ? homepageModel() : null,
  inspection: typeof evidenceInspectionModel === 'function' ? evidenceInspectionModel() : null
};`, context);

const { homepage, inspection } = context.__contract;
const sourceIds = new Set((researchGraph.sources ?? []).map(source => source.id));

function requireHomepage() {
  assert.ok(homepage, 'home.js must provide homepageModel() as the pure, testable homepage boundary');
  return homepage;
}

function requireInspection() {
  assert.ok(inspection, 'home.js must provide evidenceInspectionModel() separately from the homepage model');
  return inspection;
}

function allMarks(model) {
  return model.lanes.flatMap(lane => lane.marks ?? []);
}

function coordinateMap(plate) {
  return new Map((plate.marks ?? []).map(mark => [mark.id, [mark.x, mark.y]]));
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

test('provenance A/B/C is an aligned inspection view, not homepage depth', () => {
  const home = requireHomepage();
  const evidence = requireInspection();
  assert.equal(home.provenancePlates, undefined, 'the homepage must not distribute the research across depth planes');
  assert.equal(evidence.interactionMode, 'evidence-inspection');
  assert.deepEqual(evidence.visibleCounts, home.visibleCounts, 'counts must agree between homepage and evidence inspection');
  assert.deepEqual(Array.from(evidence.plates, plate => plate.id), ['A', 'B', 'C']);

  const [reference, ...others] = evidence.plates.map(coordinateMap);
  for (const plate of others) {
    assert.deepEqual(Array.from(plate.keys()), Array.from(reference.keys()), 'every provenance plate must carry the same marks');
    for (const [id, coordinates] of reference) {
      assert.deepEqual(plate.get(id), coordinates, `${id} must keep shared X/Y coordinates across A/B/C`);
    }
  }
});

test('persistent provenance labels remain outside the projection', () => {
  const evidence = requireInspection();
  assert.ok(evidence.labels?.length, 'inspection needs persistent semantic labels');
  assert.ok(evidence.labels.every(label => label.persistent === true));
  assert.ok(evidence.labels.every(label => label.location === 'outside-projection'));
  assert.ok(evidence.plates.every(plate => (plate.labels ?? []).every(label => ['A', 'B', 'C'].includes(label))));
});
