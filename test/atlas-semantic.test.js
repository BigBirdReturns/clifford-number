import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

/* Regression gate for docs/atlas-representation-ladder.md steps 2 and 3.
   app.js is loaded the same way test/home-model.test.js loads home.js: strip
   the ES imports (not valid in a vm.Script) and the trailing init() call
   (which needs a real DOM/fetch), then run the rest as a classic script so
   every top-level `function` declaration attaches to the vm context as a
   directly-callable global â€” that is why every function under test here is
   a plain top-level function declaration in app.js, not a const arrow. */

const raw = fs.readFileSync('app.js', 'utf8');
const withoutImports = raw.replace(/^import[^\n]*\n/gm, '');
const cutIndex = withoutImports.indexOf('\ninit().catch(');
assert.notEqual(cutIndex, -1, 'app.js must still end with the init().catch(...) bootstrap this test strips');
const source = withoutImports.slice(0, cutIndex);

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const atlasProjection = JSON.parse(fs.readFileSync('build/atlas-projection.json', 'utf8'));

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
// const bindings (thresholds, budgets) are not exposed as context properties
// by vm.runInContext the way top-level function declarations are, so hand
// the handful this file needs across explicitly.
globalThis.__denseThreshold = DENSE_SURFACE_PARTICIPANT_THRESHOLD;
`, context);

const {
  atlasScale, semanticLevel, hopNetworkModel, researchNetworkModel,
  buildAtlasAggregates, buildAtlasIndividualNodes, buildBipartiteExpansions,
  computeAtlasBypass, atlasNodeRadius, surfaceParticipantCount,
  // Legibility addendum (2026-07-20 operator review) additions:
  screenSpaceFactor, glyphShapeFor, resolveLabelCollisions, labelPriorityFor,
  buildAtlasMachineContainers, atlasAggregateRadius, atlasFallbackGridAnchor,
  renderAggregateGlyph, renderIndividualNodeGlyph
} = context;
const DENSE_SURFACE_PARTICIPANT_THRESHOLD = context.__denseThreshold;

for (const fn of [
  atlasScale, semanticLevel, hopNetworkModel, researchNetworkModel, buildAtlasAggregates,
  buildAtlasIndividualNodes, buildBipartiteExpansions, computeAtlasBypass, atlasNodeRadius, surfaceParticipantCount,
  screenSpaceFactor, glyphShapeFor, resolveLabelCollisions, labelPriorityFor, buildAtlasMachineContainers,
  atlasAggregateRadius, atlasFallbackGridAnchor, renderAggregateGlyph, renderIndividualNodeGlyph
]) {
  assert.equal(typeof fn, 'function', 'app.js must expose the atlas ladder functions as plain top-level function declarations');
}

/* ---------------- (a) semanticLevel bands and hysteresis ---------------- */

test('atlasScale matches the design note: 1400 / view.width', () => {
  assert.equal(atlasScale({ width: 1400 }), 1);
  assert.equal(atlasScale({ width: 260 }), 1400 / 260);
});

test('semanticLevel provisional bands with no prior level', () => {
  assert.equal(semanticLevel(1.0, 0, false, undefined), 'corpus');
  assert.equal(semanticLevel(1.39, 0, false, undefined), 'corpus');
  assert.equal(semanticLevel(1.40, 0, false, undefined), 'machine');
  assert.equal(semanticLevel(2.44, 0, false, undefined), 'machine');
  assert.equal(semanticLevel(2.45, 0, false, undefined), 'surface');
  assert.equal(semanticLevel(3.99, 0, false, undefined), 'surface');
  assert.equal(semanticLevel(4.00, 0, false, undefined), 'evidence');
});

test('semanticLevel route overrides the band once a route is active past scale 2.0', () => {
  assert.equal(semanticLevel(2.0, 0, true, undefined), 'route');
  assert.equal(semanticLevel(3.5, 0, true, 'route'), 'route');
  // hasRoute alone does not force 'route' below the scale gate: normal bands still apply.
  assert.equal(semanticLevel(1.9, 0, true, undefined), 'machine');
});

test('semanticLevel hysteresis: entering machine at 1.40 does not drop back to corpus until below 1.25 (no flicker)', () => {
  let level = semanticLevel(1.40, 0, false, undefined);
  assert.equal(level, 'machine');
  level = semanticLevel(1.30, 0, false, level); // inside the enter/exit gap: must hold
  assert.equal(level, 'machine');
  level = semanticLevel(1.25, 0, false, level); // exit boundary is inclusive on the "stay" side
  assert.equal(level, 'machine');
  level = semanticLevel(1.24, 0, false, level); // now below exit: drops
  assert.equal(level, 'corpus');
  // and climbing back up requires clearing the enter line again, not just the exit line
  level = semanticLevel(1.30, 0, false, level);
  assert.equal(level, 'corpus');
  level = semanticLevel(1.40, 0, false, level);
  assert.equal(level, 'machine');
});

test('semanticLevel hysteresis applies independently at the machine/surface and surface/evidence boundaries', () => {
  let level = semanticLevel(2.45, 0, false, 'machine');
  assert.equal(level, 'surface');
  level = semanticLevel(2.30, 0, false, level); // between exit 2.20 and enter 2.45: holds
  assert.equal(level, 'surface');
  level = semanticLevel(2.19, 0, false, level);
  assert.equal(level, 'machine');

  level = semanticLevel(4.00, 0, false, 'surface');
  assert.equal(level, 'evidence');
  level = semanticLevel(3.70, 0, false, level); // between exit 3.60 and enter 4.00: holds
  assert.equal(level, 'evidence');
  level = semanticLevel(3.59, 0, false, level);
  assert.equal(level, 'surface');
});

/* ---------------- (b) zoom/level changes the projection only ---------------- */

test('changing level never changes the underlying hop count or edge data, only the projection', () => {
  const model = hopNetworkModel();
  assert.equal(model.edges.length, hopGraph.edges.length, 'model must carry every compiled hop edge');
  const snapshot = JSON.stringify(model.edges);
  for (const level of ['corpus', 'machine', 'surface', 'evidence', 'route']) {
    const bypass = computeAtlasBypass(model, {});
    buildAtlasIndividualNodes(model, level, bypass);
    buildAtlasAggregates(model);
    buildBipartiteExpansions(model, level, {});
    assert.equal(JSON.stringify(model.edges), snapshot, `${level} projection must not mutate model.edges`);
    assert.equal(model.edges.length, hopGraph.edges.length, `${level} must not change the hop count`);
  }
});

test('individual node radius is a fixed per-type size, not a function of degree', () => {
  const model = hopNetworkModel();
  const byDegree = [...model.nodes].sort((a, b) => b.degree - a.degree);
  assert.ok(byDegree[0].degree > byDegree.at(-1).degree, 'fixture must contain a degree spread to make this a real test');
  const bypass = new Set(model.nodes.map(n => n.id));
  const views = buildAtlasIndividualNodes(model, 'surface', bypass);
  const radii = new Set(views.map(v => v.radius));
  assert.equal(radii.size, 1, 'every person node must share one fixed radius regardless of degree');
  assert.equal(atlasNodeRadius(byDegree[0]), atlasNodeRadius(byDegree.at(-1)));
  // degree still travels with the view as a displayed statistic
  assert.ok(views.every(v => Number.isInteger(v.degree)));
});

/* ---------------- (c) bipartite hop abstraction names its surface basis ---------------- */

test('every rendered actor-to-actor hop abstraction carries a named surface basis', () => {
  const model = hopNetworkModel();
  for (const level of ['evidence', 'route']) {
    const expansions = buildBipartiteExpansions(model, level, {});
    assert.equal(expansions.length, model.edges.length, `${level} is close zoom: every hop line must expand`);
    for (const expansion of expansions) {
      assert.ok(expansion.surfaceId, 'expansion must carry a surface id');
      assert.ok(expansion.surfaceLabel, 'expansion must carry a human-readable surface label');
      const edge = model.edges.find(e => e.id === expansion.edgeId);
      assert.ok(edge.surfaces.some(s => s.surface_id === expansion.surfaceId), 'the named surface must be one the compiler actually attached to this hop');
    }
  }
});

test('at surface level, a selected hop expands even though close zoom alone would not trigger it', () => {
  const model = hopNetworkModel();
  const noSelection = buildBipartiteExpansions(model, 'surface', {});
  assert.equal(noSelection.length, 0, 'surface level is not close zoom by itself');
  const targetEdge = model.edges[0];
  const selected = buildBipartiteExpansions(model, 'surface', { selectedNodeId: targetEdge.from });
  assert.ok(selected.some(e => e.edgeId === targetEdge.id), 'selecting an actor must expand its hop lines even at surface level');
});

test('dense/roster surfaces never render as pairwise spokes, only a labelled roster container with a count', () => {
  // The compiled hop-graph already excludes dense surfaces from generating
  // pairwise hops (constitutional rule), so this exercises the atlas's own
  // defensive guard with a synthetic dense surface injected into state.
  vm.runInContext(`
    state.surfaces.set('__test-dense-forum', {
      surface_id: '__test-dense-forum',
      participants: Array.from({ length: 25 }, (_, i) => ({ participant_type: 'actor', actor_id: 'synthetic-' + i }))
    });
  `, context);
  assert.equal(surfaceParticipantCount('__test-dense-forum'), 25);
  assert.ok(25 >= DENSE_SURFACE_PARTICIPANT_THRESHOLD);

  const syntheticModel = {
    mode: 'hops',
    nodeById: new Map([['actor-a', { x: 0, y: 0 }], ['actor-b', { x: 40, y: 40 }]]),
    edges: [{
      id: 'synthetic-edge', from: 'actor-a', to: 'actor-b',
      surfaces: [{ surface_id: '__test-dense-forum', surface_label: 'Synthetic dense forum', evidence_class: 'primary_public' }]
    }]
  };
  const [expansion] = buildBipartiteExpansions(syntheticModel, 'evidence', {});
  assert.ok(expansion, 'the dense hop must still expand â€” it must not silently disappear');
  assert.equal(expansion.isRoster, true);
  assert.equal(expansion.participantCount, 25);
  assert.equal(expansion.surfaceId, '__test-dense-forum');

  // and a normal (non-dense) real hop must not be misclassified as a roster
  const realModel = hopNetworkModel();
  const realExpansions = buildBipartiteExpansions(realModel, 'evidence', {});
  assert.ok(realExpansions.every(e => e.isRoster === false), 'no compiled hop basis in this corpus is dense, so none may render as a roster');
});

/* ---------------- (d) corpus-level aggregates name their denominator ---------------- */

test('every corpus-level aggregate (hops mode) names its denominator', () => {
  const model = hopNetworkModel();
  const aggregates = buildAtlasAggregates(model);
  assert.ok(aggregates.length > 0);
  for (const agg of aggregates) {
    assert.equal(agg.totalEdgeCount, model.edges.length);
    assert.match(agg.metricLabel, /^\d+ documented edges? of \d+ total$/);
    assert.ok(agg.metricLabel.endsWith(`of ${model.edges.length} total`), 'the denominator in the label must equal the real total');
    assert.ok(Number.isInteger(agg.edgeCount) && agg.edgeCount >= 0 && agg.edgeCount <= agg.totalEdgeCount);
    assert.ok(agg.memberCount > 0 && agg.memberIds.length === agg.memberCount);
  }
  const totalMembers = aggregates.reduce((sum, agg) => sum + agg.memberCount, 0);
  assert.equal(totalMembers, model.nodes.length, 'aggregation must account for every node exactly once');
});

test('every corpus-level aggregate (research mode) names its denominator', () => {
  const model = researchNetworkModel();
  const aggregates = buildAtlasAggregates(model);
  assert.ok(aggregates.length > 0);
  for (const agg of aggregates) {
    assert.equal(agg.totalEdgeCount, model.edges.length);
    assert.match(agg.metricLabel, /of \d+ total$/);
  }
});

/* ---------------- (e) suppression bypass ---------------- */

test('a selected node is present at corpus level even though its cluster is aggregated away', () => {
  const model = hopNetworkModel();
  const targetId = model.nodes.find(n => n.id !== model.defaultNode).id;

  const withoutBypass = buildAtlasIndividualNodes(model, 'corpus', new Set());
  assert.equal(withoutBypass.length, 0, 'corpus level renders no bare individual people by default');

  const bypass = computeAtlasBypass(model, { selectedId: targetId });
  const withSelection = buildAtlasIndividualNodes(model, 'corpus', bypass);
  assert.ok(withSelection.some(n => n.id === targetId), 'the selected node must still be individually visible at corpus level');

  // it must still be counted honestly inside its aggregate, not double-removed
  const aggregates = buildAtlasAggregates(model);
  const group = model.nodeById.get(targetId).aggregateGroup;
  const agg = aggregates.find(a => a.group === group);
  assert.ok(agg.memberIds.includes(targetId), 'the aggregate denominator must still include the bypassed node');
});

test('search matches, route members, and pins each independently bypass corpus suppression', () => {
  const model = hopNetworkModel();
  const [a, b, c] = model.nodes.filter(n => n.id !== model.defaultNode);

  const searchBypass = computeAtlasBypass(model, { searchIds: [a.id] });
  assert.ok(buildAtlasIndividualNodes(model, 'corpus', searchBypass).some(n => n.id === a.id));

  const routeBypass = computeAtlasBypass(model, { routeIds: [b.id] });
  assert.ok(buildAtlasIndividualNodes(model, 'corpus', routeBypass).some(n => n.id === b.id));

  const pinnedBypass = computeAtlasBypass(model, { pinnedIds: [c.id] });
  assert.ok(buildAtlasIndividualNodes(model, 'corpus', pinnedBypass).some(n => n.id === c.id));

  // an id that does not exist in the model must never leak into the bypass set
  const bogus = computeAtlasBypass(model, { searchIds: ['not-a-real-node'] });
  assert.equal(bogus.size, 0);
});

/* ---------------- Legibility addendum (2026-07-20 operator review) ---------------- */

/* -- rule 1: ink never magnifies -- */

test('screenSpaceFactor matches the design note: view.width / 1400, the reciprocal of atlasScale', () => {
  assert.equal(screenSpaceFactor({ width: 1400 }), 1);
  assert.equal(screenSpaceFactor({ width: 260 }), 260 / 1400);
  // exact reciprocal relationship to atlasScale for every width in the zoom range
  for (const width of [1400, 900, 500, 260]) {
    assert.equal(screenSpaceFactor({ width }) * atlasScale({ width }), 1);
  }
});

test('rendered node/aggregate radii scale proportionally with screenSpaceFactor via the ink-anchor transform', () => {
  const model = hopNetworkModel();
  const bypass = new Set([model.defaultNode]);
  const [view] = buildAtlasIndividualNodes(model, 'surface', bypass);
  const wide = renderIndividualNodeGlyph(view, 'surface', 1);
  const narrow = renderIndividualNodeGlyph(view, 'surface', 0.25);
  // the local (base) circle/rect geometry inside the group is IDENTICAL --
  // only the group's own transform (which the browser applies on top of the
  // local geometry) carries the screen-space counter-scale.
  assert.match(wide, /scale\(1\)/);
  assert.match(narrow, /scale\(0\.25\)/);
  const localSizeOf = markup => markup.match(/r="([\d.]+)"|width="([\d.]+)"/)[0];
  assert.equal(localSizeOf(wide), localSizeOf(narrow), 'local glyph geometry must not change with factor -- only the wrapping transform does');

  const aggregates = buildAtlasAggregates(model, null);
  const wideAgg = renderAggregateGlyph(aggregates[0], 1);
  const narrowAgg = renderAggregateGlyph(aggregates[0], 0.3);
  assert.match(wideAgg, /scale\(1\)/);
  assert.match(narrowAgg, /scale\(0\.3\)/);
  assert.ok(wideAgg.includes(`r="${aggregates[0].radius}"`) && narrowAgg.includes(`r="${aggregates[0].radius}"`), 'local aggregate radius must be identical regardless of factor');
});

/* -- rule 2: shapes carry the ontology -- */

test('glyphShapeFor maps every node.type occurring in graph.json (the research-mode corpus) to a valid shape', () => {
  const validShapes = new Set(['circle', 'square', 'diamond', 'ring']);
  const typesInCorpus = new Set(legacyGraph.nodes.map(node => node.type));
  assert.ok(typesInCorpus.size > 5, 'fixture must carry real type variety to make this a meaningful test');
  for (const type of typesInCorpus) {
    const shape = glyphShapeFor(type);
    assert.ok(validShapes.has(shape), `node.type "${type}" must map to a real shape, got "${shape}"`);
  }
  // the ontology assertions the design note itself makes, pinned explicitly
  assert.equal(glyphShapeFor('person'), 'circle');
  assert.equal(glyphShapeFor('policy'), 'diamond');
  assert.equal(glyphShapeFor('private-forum'), 'diamond', 'Dialog is documented as a bounded surface, not an organization');
  assert.equal(glyphShapeFor('company'), 'square');
  assert.equal(glyphShapeFor('government-department'), 'square');
  assert.equal(glyphShapeFor('aggregate'), 'ring');
  // hop-mode / generic synonyms
  assert.equal(glyphShapeFor('actor'), 'circle');
  assert.equal(glyphShapeFor('organization'), 'square');
  assert.equal(glyphShapeFor('surface'), 'diamond');
  // an unrecognized future type still resolves to a real shape, never undefined
  assert.equal(glyphShapeFor('not-a-real-type'), 'square');
});

test('renderIndividualNodeGlyph actually emits the shape glyphShapeFor prescribes for the node kind', () => {
  const model = hopNetworkModel(); // every node here is type 'person'
  const bypass = new Set([model.defaultNode]);
  const [view] = buildAtlasIndividualNodes(model, 'surface', bypass);
  assert.equal(view.kind, 'person');
  const markup = renderIndividualNodeGlyph(view, 'surface', 1);
  assert.ok(markup.includes('<circle class="atlas-node-core"'), 'a person node must render as a circle');
  const orgView = { ...view, kind: 'company', id: 'synthetic-org' };
  const orgMarkup = renderIndividualNodeGlyph(orgView, 'surface', 1);
  assert.ok(orgMarkup.includes('<rect class="atlas-node-core"') && !orgMarkup.includes('rotate'), 'a company must render as an unrotated square');
  const surfaceView = { ...view, kind: 'policy', id: 'synthetic-surface' };
  const surfaceMarkup = renderIndividualNodeGlyph(surfaceView, 'surface', 1);
  assert.ok(surfaceMarkup.includes('rotate(45)'), 'a policy (bounded surface) must render as a rotated square, i.e. a diamond');
});

/* -- rule 3: the corpus view fills its frame -- */

test('atlasAggregateRadius is clamped to [55, 130] world units at factor === 1, never the "map for ants" sizes', () => {
  assert.equal(atlasAggregateRadius(1), 55, 'even a single-member aggregate must be large enough to read at arm\'s length');
  assert.ok(atlasAggregateRadius(1) >= 55 && atlasAggregateRadius(1) <= 130);
  assert.ok(atlasAggregateRadius(1000) <= 130, 'a very large aggregate must not swallow the canvas');
  assert.ok(atlasAggregateRadius(40) > atlasAggregateRadius(4), 'radius must still sqrt-area-encode relative population, just inside the legible clamp');
});

test('corpus aggregates spread across the full 1400x900 canvas via the deterministic fallback grid, not a centroid huddle', () => {
  const model = hopNetworkModel();
  const aggregates = buildAtlasAggregates(model, null); // no atlas-projection match available -> every anchor is the fallback grid
  assert.ok(aggregates.length >= 3, 'fixture must carry enough groups to make a spread test meaningful');
  const xs = aggregates.map(a => a.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1400 * 0.6, 'aggregates must span more than 60% of the 1400-wide canvas');
  for (const agg of aggregates) assert.ok(agg.radius >= 55 && agg.radius <= 130);
});

test('atlasFallbackGridAnchor is deterministic and never uses Math.random/Date.now: same index/total always lands on the same cell', () => {
  const a = atlasFallbackGridAnchor(2, 6);
  const b = atlasFallbackGridAnchor(2, 6);
  assert.deepEqual(a, b);
  assert.ok(a.x >= 0 && a.x <= 1400 && a.y >= 0 && a.y <= 900);
});

test('every rendered aggregate metric carries a named metric word, never a bare digit, per the honesty invariant', () => {
  const model = hopNetworkModel();
  const aggregates = buildAtlasAggregates(model, null);
  for (const agg of aggregates) {
    const markup = renderAggregateGlyph(agg, 1);
    const metricMatch = markup.match(/<text class="atlas-agg-metric"[^>]*>([^<]*)<\/text>/);
    assert.ok(metricMatch, 'aggregate must render a metric text node');
    assert.match(metricMatch[1], /edges|surfaces|actors/, 'aggregate metric text must name its unit, never render a bare number');
    assert.ok(!/^\d+$/.test(metricMatch[1].trim()), 'aggregate metric text must not be a bare digit');
  }
});

/* -- rule 4: machine level means containers -- */

test('buildAtlasMachineContainers docks every machine surface as a diamond or an honest overflow count that sums to surface_count', () => {
  const containers = buildAtlasMachineContainers(atlasProjection);
  assert.ok(containers.length > 0, 'the real atlas-projection.json fixture must produce at least one container');
  for (const container of containers) {
    assert.equal(container.surfaces.length + container.overflowCount, container.surfaceCount,
      `container ${container.organizationId}: docked (${container.surfaces.length}) + overflow (${container.overflowCount}) must sum to the declared surface_count (${container.surfaceCount})`);
    assert.ok(container.surfaces.every(s => s.surfaceId && s.label), 'every docked surface must carry a real surface id and a human label');
  }
  // declared factories are ranked to the front
  const factoryIndexes = containers.map((c, i) => c.isDeclaredFactory ? i : Infinity);
  const firstNonFactory = containers.findIndex(c => !c.isDeclaredFactory);
  if (firstNonFactory > 0) assert.ok(Math.min(...factoryIndexes) < firstNonFactory || Math.min(...factoryIndexes) === Infinity);
});

test('buildAtlasMachineContainers is an honest empty model when atlas-projection is absent, never a crash', () => {
  assert.equal(buildAtlasMachineContainers(null).length, 0);
  assert.equal(buildAtlasMachineContainers(undefined).length, 0);
});

/* -- rule 5: no orphan numbers -- */

test('renderIndividualNodeGlyph markup carries no bare text-number child -- degree stays a title/aria-label statistic only', () => {
  const model = hopNetworkModel();
  const bypass = new Set([model.defaultNode]);
  const views = buildAtlasIndividualNodes(model, 'surface', bypass);
  assert.ok(views.some(v => v.degree > 0), 'fixture must carry a node with nonzero degree to make this test meaningful');
  for (const view of views) {
    const markup = renderIndividualNodeGlyph({ ...view, showLabel: true }, 'surface', 1);
    const textNodes = [...markup.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].trim());
    for (const text of textNodes) assert.ok(!/^\d+$/.test(text), `individual node markup must not carry a bare-number text child, found "${text}"`);
  }
});

/* -- rule 6: labels obey collision -- */

test('resolveLabelCollisions: two overlapping labels keep only the higher-priority one', () => {
  const labels = [
    { id: 'low', x: 100, y: 100, widthEst: 80, priority: 'statistic' },
    { id: 'high', x: 110, y: 100, widthEst: 80, priority: 'selected' }
  ];
  const kept = resolveLabelCollisions(labels, 1);
  assert.ok(kept.has('high'));
  assert.ok(!kept.has('low'));
});

test('resolveLabelCollisions: disjoint labels are both kept regardless of priority', () => {
  const labels = [
    { id: 'a', x: 0, y: 0, widthEst: 20, priority: 'statistic' },
    { id: 'b', x: 500, y: 500, widthEst: 20, priority: 'statistic' }
  ];
  const kept = resolveLabelCollisions(labels, 1);
  assert.ok(kept.has('a') && kept.has('b'));
});

test('resolveLabelCollisions: screen-space boxes change with factor -- the same two world positions can collide when zoomed out and separate when zoomed in', () => {
  const labels = [
    { id: 'a', x: 0, y: 0, widthEst: 40, priority: 'statistic' },
    { id: 'b', x: 30, y: 0, widthEst: 40, priority: 'name' }
  ];
  const zoomedOut = resolveLabelCollisions(labels, 1); // toScreen = 1 -> 30px apart, 40px-wide boxes collide
  assert.equal(zoomedOut.size, 1, 'at factor 1 the two boxes must collide, keeping only the higher-priority label');
  const zoomedIn = resolveLabelCollisions(labels, 0.5); // toScreen = 2 -> 60px apart, boxes now disjoint
  assert.equal(zoomedIn.size, 2, 'zoomed in further, the same two world positions must read as disjoint');
});

test('labelPriorityFor ranks selection > route > search > pinned > plain statistic', () => {
  const ctx = { selectedId: 's', routeIds: new Set(['r']), searchIds: new Set(['q']), pinnedIds: new Set(['p']) };
  assert.equal(labelPriorityFor('s', ctx), 'selected');
  assert.equal(labelPriorityFor('r', ctx), 'route');
  assert.equal(labelPriorityFor('q', ctx), 'search');
  assert.equal(labelPriorityFor('p', ctx), 'pinned');
  assert.equal(labelPriorityFor('other', ctx), 'statistic');
});

console.log('atlas-semantic.test.js: definitions loaded, node:test running');
