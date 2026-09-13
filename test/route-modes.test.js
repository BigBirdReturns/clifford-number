import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import {
  shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections
} from '../src/route-projections.js';
import { releaseDelta, summarizeDelta } from '../src/release-delta.js';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

/* Regression gate for docs/atlas-representation-ladder.md steps 5-6: route
   projections, blocked segments, the corridor overlay, the release-delta
   strip, and route subordination. app.js is loaded the same way
   test/atlas-semantic.test.js and test/evidence-overview.test.js load it:
   strip the ES imports (not valid in a vm.Script) and the trailing init()
   call (needs a real DOM/fetch), then run the rest as a classic script so
   every top-level `function` declaration attaches to the vm context as a
   directly-callable global. app.js now imports the route-projections.js and
   release-delta.js engines by name, so those exact bindings are injected
   into the vm context here -- the same mechanism the vm already relies on
   for `structuredClone`/`URL`.

   Every function under test here is pure and takes its `state`/data
   explicitly as an argument rather than reading the module-level `state`
   this file otherwise mutates directly, so this test never needs to poke
   the vm's internal state -- a plain host-realm fixture object is enough. */

const raw = fs.readFileSync('app.js', 'utf8');
const withoutImports = raw.replace(/^import[^\n]*\n/gm, '');
const cutIndex = withoutImports.indexOf('\ninit().catch(');
assert.notEqual(cutIndex, -1, 'app.js must still end with the init().catch(...) bootstrap this test strips');
const source = withoutImports.slice(0, cutIndex);

const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const atlasProjection = JSON.parse(fs.readFileSync('build/atlas-projection.json', 'utf8'));

const context = {
  console, window: {}, structuredClone, URL, EVIDENCE_RANK,
  shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections,
  releaseDelta, summarizeDelta
};
vm.createContext(context);
vm.runInContext(source, context);

const {
  routeModesModel, buildCorridorLayerModel, releaseStripModel,
  computeRouteSubordinationClasses, routeMemberIdsForSelection
} = context;

for (const fn of [routeModesModel, buildCorridorLayerModel, releaseStripModel, computeRouteSubordinationClasses, routeMemberIdsForSelection]) {
  assert.equal(typeof fn, 'function', 'app.js must expose the route-modes ladder functions as plain top-level function declarations');
}

console.log('route-modes.test.js: definitions loaded, node:test running');

// ---------------------------------------------------------------------------
// (a) routeModesModel: canonical-first ordering and labeling

test('routeModesModel: the canonical entry is always first, kind "clifford", labeled as The Clifford Number', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'john-healey', toId: 'matt-clifford', selectedProjection: 'clifford' });
  assert.equal(model.entries[0].kind, 'clifford');
  assert.equal(model.entries[0].canonical, true);
  assert.match(model.entries[0].label, /Clifford Number/);
  assert.equal(model.entries.length, 1, 'selecting the canonical projection itself renders no separate secondary section');
  assert.equal(model.canonical.route.hopCount, shortestRoute(hopGraph, 'john-healey', 'matt-clifford').hopCount);
});

test('routeModesModel: selecting a secondary projection keeps the canonical entry first and labels the secondary explicitly', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'john-healey', toId: 'matt-clifford', selectedProjection: 'official-only' });
  assert.equal(model.entries.length, 2);
  assert.equal(model.entries[0].kind, 'clifford');
  assert.equal(model.entries[0].canonical, true);
  assert.equal(model.entries[1].kind, 'official-only');
  assert.equal(model.entries[1].canonical, false);
  assert.equal(model.entries[1].secondaryNotice, 'secondary projection — does not redefine the Clifford Number');
});

test('routeModesModel: an unrecognized selectedProjection defaults to clifford, never throws', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'john-healey', toId: 'matt-clifford', selectedProjection: 'not-a-real-projection' });
  assert.equal(model.selectedProjection, 'clifford');
  assert.equal(model.secondary, null);
});

// ---------------------------------------------------------------------------
// (b) secondary-null honesty: absence is explicit, never a silent fallback

test('routeModesModel: official-only absent is an explicit, honest absence -- never a silent fallback to a weaker route', () => {
  // ben-warner <-> dominic-cummings carries only 'reported'/'judgment' bases
  // in the real graph -- no official-tier basis at all (see route-projections.test.js).
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'ben-warner', toId: 'dominic-cummings', selectedProjection: 'official-only' });
  assert.equal(model.secondary.isNull, true);
  assert.equal(model.secondary.route, null);
  assert.ok(model.secondary.absenceMessage, 'an absent secondary projection must carry an explicit absence message');
  assert.match(model.secondary.absenceMessage, /official-only route/i);
  // The canonical route must still be present and completely unaffected by the secondary's absence.
  assert.ok(model.canonical.route);
  assert.equal(model.canonical.isNull, false);
  assert.equal(model.canonical.route.hopCount, 1);
});

test('routeModesModel: no fromId/toId returns an honestly empty model, never throws', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, {});
  assert.equal(model.canonical, null);
  assert.equal(model.secondary, null);
  assert.equal(model.entries.length, 0);
  assert.equal(model.blocked.length, 0);
});

test('routeModesModel: an isolated pair reports the canonical projection itself as an honest absence', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'peter-thiel', toId: 'matt-clifford', selectedProjection: 'clifford' });
  assert.equal(model.canonical.isNull, true);
  assert.equal(model.canonical.route, null);
  assert.ok(model.canonical.absenceMessage);
});

// ---------------------------------------------------------------------------
// (c) blocked-segment rows carry both windows + surface + reason

test('routeModesModel: blocked segments carry both actor windows, the surface, and the reason', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'dan-rosenfield', toId: 'dominic-cummings', selectedProjection: 'clifford' });
  assert.equal(model.blocked.length, 1);
  const [segment] = model.blocked;
  assert.equal(segment.surfaceId, 'no10-digital-data-advisory-2019-2021');
  assert.equal(segment.reason, 'no_temporal_overlap');
  assert.equal(segment.actorA.id, 'dan-rosenfield');
  assert.deepEqual(segment.actorA.window, { validFrom: '2021-01-01', validUntil: '2021-12-31', dated: true });
  assert.equal(segment.actorB.id, 'dominic-cummings');
  assert.deepEqual(segment.actorB.window, { validFrom: '2019-01-01', validUntil: '2020-12-31', dated: true });
});

// ---------------------------------------------------------------------------
// (d) as-of applies alongside whichever projection is selected

test('routeModesModel: an as-of period adds its own labeled secondary entry alongside the selected projection', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'ben-warner', toId: 'dominic-cummings', asOf: '2020', selectedProjection: 'clifford' });
  assert.equal(model.entries.length, 2);
  assert.equal(model.entries[1].kind, 'as-of');
  assert.equal(model.entries[1].period, '2020');
  assert.equal(model.entries[1].secondaryNotice, 'secondary projection — does not redefine the Clifford Number');
  assert.equal(model.asOfEntry.isNull, false);
  assert.equal(model.asOfEntry.route.hopCount, 1);
});

test('routeModesModel: a non-overlapping as-of period is an honest absence, not a fallback to the all-time route', () => {
  const state = { hopGraph };
  const model = routeModesModel(state, { fromId: 'dan-rosenfield', toId: 'dominic-cummings', asOf: '2020', selectedProjection: 'clifford' });
  assert.equal(model.asOfEntry.isNull, true);
  assert.equal(model.asOfEntry.route, null);
  assert.match(model.asOfEntry.absenceMessage, /2020/);
});

// ---------------------------------------------------------------------------
// (e) corridor mount model: every corridor graph_effect 'none', invalid ones excluded

test('buildCorridorLayerModel: only graph_effect "none" corridors render; any other graph_effect is excluded', () => {
  const machines = [
    { organization_id: 'org-a', position: { x: 10, y: 20 } },
    { organization_id: 'org-b', position: { x: 90, y: 40 } }
  ];
  const atlas = {
    machines,
    corridors: [
      { chain_id: 'c-ok', label: 'Legit corridor', graph_effect: 'none', chain_length: 2, stages: [{ organization_id: 'org-a' }, { organization_id: 'org-b' }] },
      { chain_id: 'c-bad', label: 'Should never render', graph_effect: 'hop-eligible', chain_length: 2, stages: [{ organization_id: 'org-a' }, { organization_id: 'org-b' }] }
    ]
  };
  const model = buildCorridorLayerModel(atlas);
  assert.equal(model.corridors.length, 1);
  assert.equal(model.corridors[0].id, 'c-ok');
  assert.equal(model.corridors[0].graphEffect, 'none');
  assert.equal(model.excludedCount, 1);
  assert.equal(model.corridors[0].anchors.length, 2);
  assert.equal(model.corridors[0].anchors[0].id, 'org-a');
  assert.equal(model.corridors[0].anchors[0].x, 10);
  assert.equal(model.corridors[0].anchors[0].y, 20);
});

test('buildCorridorLayerModel: an absent atlasProjection is an honest empty model, never a crash', () => {
  for (const empty of [buildCorridorLayerModel(null), buildCorridorLayerModel(undefined)]) {
    assert.equal(empty.corridors.length, 0);
    assert.equal(empty.excludedCount, 0);
  }
});

test('buildCorridorLayerModel: the real build/atlas-projection.json never contains a corridor with a graph_effect other than "none"', () => {
  const model = buildCorridorLayerModel(atlasProjection);
  assert.equal(model.excludedCount, 0);
  assert.equal(model.corridors.length, (atlasProjection.corridors ?? []).length);
  for (const corridor of model.corridors) assert.equal(corridor.graphEffect, 'none');
});

// ---------------------------------------------------------------------------
// (f) delta strip model: honest on null baseline

test('releaseStripModel: a null baseline reports the honest absent-baseline one-liner', () => {
  const model = releaseStripModel(atlasProjection, null);
  assert.equal(model.baselineAbsent, true);
  assert.equal(model.message, 'release delta: no baseline artifact in this release');
});

test('releaseStripModel: undefined current and baseline still returns an honest model, never throws', () => {
  const model = releaseStripModel(undefined, undefined);
  assert.equal(model.baselineAbsent, true);
  assert.equal(model.message, 'release delta: no baseline artifact in this release');
});

test('releaseStripModel: a real baseline names counts with their denominators', () => {
  const baseline = JSON.parse(JSON.stringify(atlasProjection));
  baseline.surface_nodes = baseline.surface_nodes.slice(1); // current carries one surface baseline lacks -> "added"
  const model = releaseStripModel(atlasProjection, baseline);
  assert.equal(model.baselineAbsent, false);
  assert.match(model.message, /release delta: \d+ Added of \d+/);
});

test('releaseStripModel: an identical baseline reports honestly that nothing changed', () => {
  const baseline = JSON.parse(JSON.stringify(atlasProjection));
  const model = releaseStripModel(atlasProjection, baseline);
  assert.equal(model.baselineAbsent, false);
  assert.match(model.message, /no changes across \d+ compared objects/);
});

// ---------------------------------------------------------------------------
// (g) route subordination class assignment (pure function)

test('computeRouteSubordinationClasses: route members get is-route-member, everyone else gets is-route-dimmed', () => {
  const classes = computeRouteSubordinationClasses(['a', 'b', 'c'], new Set(['a', 'b']));
  assert.equal(classes.get('a'), 'is-route-member');
  assert.equal(classes.get('b'), 'is-route-member');
  assert.equal(classes.get('c'), 'is-route-dimmed');
});

test('computeRouteSubordinationClasses: empty route membership dims everyone, never throws', () => {
  const classes = computeRouteSubordinationClasses(['a', 'b'], new Set());
  assert.equal(classes.get('a'), 'is-route-dimmed');
  assert.equal(classes.get('b'), 'is-route-dimmed');
});

test('routeMemberIdsForSelection: research mode never yields route members (hop routes only exist in hops mode)', () => {
  assert.equal(routeMemberIdsForSelection(hopGraph, 'research', 'dialog').size, 0);
});

test('routeMemberIdsForSelection: no selection yields no route members', () => {
  assert.equal(routeMemberIdsForSelection(hopGraph, 'hops', null).size, 0);
});

test('routeMemberIdsForSelection: hops mode returns exactly the actor path of the selected route', () => {
  const [routeId, path] = Object.entries(hopGraph.shortest_paths).find(([, p]) => p && p.number > 0);
  const ids = routeMemberIdsForSelection(hopGraph, 'hops', routeId);
  assert.deepEqual([...ids].sort(), [...new Set(path.actor_path)].sort());
});

console.log('route-modes.test.js: OK');
