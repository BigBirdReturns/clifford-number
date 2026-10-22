import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import {
  shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections
} from '../src/route-projections.js';
import { releaseDelta, summarizeDelta } from '../src/release-delta.js';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';

/* Regression gate for the live Connection desk's route projections, blocked
   segments, and the release-delta strip. app.js is loaded by stripping the ES
   imports (not valid in a vm.Script) and the trailing init() call (needs a
   real DOM/fetch), then running the rest as a classic script so every
   top-level `function` declaration attaches to the vm context as a
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

const { routeModesModel, releaseStripModel } = context;

for (const fn of [routeModesModel, releaseStripModel]) {
  assert.equal(typeof fn, 'function', 'app.js must expose the desk route-projection functions as plain top-level function declarations');
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
  const graph = { edges: [{
    actor_a: 'reported-a', actor_b: 'reported-b',
    surfaces: [{
      surface_id: 'reported-only-surface', surface_label: 'Reported-only surface',
      evidence_class: 'reported', temporal_status: 'dated',
      valid_from: '2020-01-01', valid_until: '2020-12-31', receipt_ids: []
    }]
  }], rejected_hop_pairs: [] };
  const model = routeModesModel({ hopGraph: graph }, {
    fromId: 'reported-a', toId: 'reported-b', selectedProjection: 'official-only'
  });
  assert.equal(model.secondary.isNull, true);
  assert.equal(model.secondary.route, null);
  assert.match(model.secondary.absenceMessage, /official-only route/i);
  assert.ok(model.canonical.route);
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
  const graph = {
    edges: [],
    rejected_hop_pairs: [{
      surface_id: 'blocked-surface', actor_a: 'blocked-a', actor_b: 'blocked-b',
      reason: 'no_temporal_overlap',
      actor_a_window: { valid_from: '2020-01-01', valid_until: '2020-06-30', dated: true },
      actor_b_window: { valid_from: '2021-01-01', valid_until: '2021-06-30', dated: true },
      surface_window: { valid_from: '2020-01-01', valid_until: '2021-06-30', dated: true },
      actor_a_receipt_ids: [], actor_b_receipt_ids: [], surface_receipt_ids: [], receipt_ids: [],
      evidence_class: 'official', publication_status: 'verified'
    }]
  };
  const model = routeModesModel({ hopGraph: graph }, {
    fromId: 'blocked-a', toId: 'blocked-b', selectedProjection: 'clifford'
  });
  assert.equal(model.blocked.length, 1);
  const [segment] = model.blocked;
  assert.equal(segment.surfaceId, 'blocked-surface');
  assert.equal(segment.reason, 'no_temporal_overlap');
  assert.equal(segment.actorA.id, 'blocked-a');
  assert.deepEqual(segment.actorA.window, { validFrom: '2020-01-01', validUntil: '2020-06-30', dated: true });
  assert.equal(segment.actorB.id, 'blocked-b');
  assert.deepEqual(segment.actorB.window, { validFrom: '2021-01-01', validUntil: '2021-06-30', dated: true });
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
// (e) delta strip model: honest on null baseline

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

console.log('route-modes.test.js: OK');
