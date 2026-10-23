import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APERTURE_QUERY_KEYS,
  APERTURE_STATE_VERSION,
  APERTURE_TIMELINE_QUERY_KEYS,
  buildApertureUrl,
  dayWindow,
  isoDay,
  laneList,
  readApertureState,
  writeApertureState
} from '../src/visual-aperture-state.mjs';

const snapshot = {
  mode: 'surface',
  overview: {
    page: 4,
    pageSize: 100
  },
  map: {
    scale: 4.35,
    level: 'evidence',
    clusterId: 'forums',
    typeId: 'directory_surface',
    surfaceId: 'dialog-roster-2026',
    actorId: 'actor-a'
  },
  route: {
    fromId: 'actor-a',
    toId: 'anchor',
    asOf: '2024-06',
    evidenceFloor: 'primary_public',
    selectedStep: 126,
    windowStart: 120,
    actorId: 'actor-b'
  },
  surface: {
    surfaceId: 'dialog-roster-2026',
    query: 'public official',
    asOf: '2026',
    evidenceFloor: 'reported',
    budget: 18,
    pins: ['actor-c', 'actor-a', 'actor-c'],
    actorId: 'actor-a'
  },
  timeline: {
    by: 'organization',
    from: '2024-01-01',
    to: '2024-12-31',
    cursor: '2024-07-01..2024-07-31',
    lanes: ['electric-twin', 'mod', 'electric-twin'],
    selectedKey: 'electric-twin-seed-round-2026-02-11::organization::electric-twin',
    evidenceFloor: 'primary_public',
    hop: 'hop'
  }
};

const built = buildApertureUrl(snapshot, 'https://example.test/clifford-number/?lang=fr#actor/example');
const url = new URL(built);
assert.equal(url.searchParams.get('lang'), 'fr', 'unrelated query parameters must survive');
assert.equal(url.hash, '#actor/example', 'the existing hash router must survive');
assert.equal(url.searchParams.get('ap_v'), APERTURE_STATE_VERSION);
assert.equal(url.searchParams.get('ap_mode'), 'surface');
assert.equal(url.searchParams.get('ap_overview_page'), '4');
assert.equal(url.searchParams.get('ap_overview_size'), '100');
assert.equal(url.searchParams.get('ap_route_window'), '120');
assert.equal(url.searchParams.get('ap_surface_pins'), 'actor-a,actor-c');
assert.equal(url.searchParams.get('ap_time_by'), 'organization');
assert.equal(url.searchParams.get('ap_time_cursor'), '2024-07-01..2024-07-31');
assert.equal(url.searchParams.get('ap_time_lanes'), 'electric-twin,mod', 'lanes keep insertion order and drop duplicates');

const decoded = readApertureState(url.search);
assert.deepEqual(decoded, {
  version: '1',
  mode: 'surface',
  overview: {
    page: 4,
    pageSize: 100
  },
  map: {
    scale: 4.35,
    level: 'evidence',
    clusterId: 'forums',
    typeId: 'directory_surface',
    surfaceId: 'dialog-roster-2026',
    actorId: 'actor-a'
  },
  route: {
    fromId: 'actor-a',
    toId: 'anchor',
    asOf: '2024-06',
    evidenceFloor: 'primary_public',
    selectedStep: 126,
    windowStart: 120,
    actorId: 'actor-b'
  },
  surface: {
    surfaceId: 'dialog-roster-2026',
    query: 'public official',
    asOf: '2026',
    evidenceFloor: 'reported',
    budget: 18,
    pins: ['actor-a', 'actor-c'],
    actorId: 'actor-a'
  },
  timeline: {
    by: 'organization',
    from: '2024-01-01',
    to: '2024-12-31',
    cursor: '2024-07-01..2024-07-31',
    lanes: ['electric-twin', 'mod'],
    selectedKey: 'electric-twin-seed-round-2026-02-11::organization::electric-twin',
    evidenceFloor: 'primary_public',
    hop: 'hop'
  }
});

assert.equal(readApertureState('?ap_v=2&ap_mode=map'), null, 'unknown URL-state versions must be declined');
assert.equal(readApertureState('?ap_v=1&ap_mode=unknown'), null, 'unknown modes must be declined');
assert.equal(readApertureState('?ap_v=1&ap_mode=timeline').mode, 'timeline', 'timeline is a mode');

const clamped = readApertureState('?ap_v=1&ap_mode=surface&ap_overview_page=0&ap_overview_size=73&ap_map_scale=99&ap_map_level=surface&ap_route_step=9999999&ap_route_window=-2&ap_route_evidence=bogus&ap_surface_budget=2&ap_surface_pins=b,a,b');
assert.equal(clamped.overview.page, 1);
assert.equal(clamped.overview.pageSize, null);
assert.equal(clamped.map.scale, 5.4);
assert.equal(clamped.route.selectedStep, 999999);
assert.equal(clamped.route.windowStart, 0);
assert.equal(clamped.route.evidenceFloor, null);
assert.equal(clamped.surface.budget, 6);
assert.deepEqual(clamped.surface.pins, ['a', 'b']);

// --- timeline keys: defaults are omitted, invalid values fall back, clamps are deterministic
const timelineDefaults = { by: 'actor', from: '', to: '', cursor: '', lanes: [], selectedKey: null, evidenceFloor: 'open', hop: 'all' };
const defaultParams = writeApertureState({ mode: 'timeline', timeline: timelineDefaults });
for (const key of APERTURE_TIMELINE_QUERY_KEYS) assert.equal(defaultParams.has(key), false, `${key} must be omitted at its default`);
assert.equal(defaultParams.get('ap_mode'), 'timeline');
assert.deepEqual(readApertureState(defaultParams).timeline, timelineDefaults, 'a default timeline view reads back as its defaults');
assert.equal(writeApertureState({}).get('ap_mode'), 'map', 'the network is the fallback mode');
for (const key of APERTURE_QUERY_KEYS.filter(item => !APERTURE_TIMELINE_QUERY_KEYS.includes(item))) assert.ok(defaultParams.has(key), `${key} keeps its always-serialized contract`);
assert.equal(APERTURE_QUERY_KEYS.length, 32);

const twentyLanes = Array.from({ length: 20 }, (_, index) => `lane-${String(index).padStart(2, '0')}`);
const timelineClamped = readApertureState(`?ap_v=1&ap_mode=timeline&ap_time_by=bogus&ap_time_from=2024-13-40&ap_time_to=2024-02-30&ap_time_cursor=2025-12-31..2025-01-01&ap_time_lanes=${twentyLanes.join(',')}&ap_time_evidence=bogus&ap_time_hop=bogus&ap_time_sel=${'x'.repeat(500)}`);
assert.equal(timelineClamped.timeline.by, 'actor', 'unknown by falls back to People');
assert.equal(timelineClamped.timeline.from, '', 'an impossible day decodes as auto');
assert.equal(timelineClamped.timeline.to, '', '2024-02-30 does not exist');
assert.equal(timelineClamped.timeline.cursor, '2025-01-01..2025-12-31', 'a reversed window is reordered');
assert.deepEqual(timelineClamped.timeline.lanes, twentyLanes.slice(0, 18), '20 lanes clamp to the first 18 in insertion order');
assert.equal(timelineClamped.timeline.evidenceFloor, 'open');
assert.equal(timelineClamped.timeline.hop, 'all');
assert.equal(timelineClamped.timeline.selectedKey.length, 400, 'row keys are bounded');
assert.equal(readApertureState('?ap_v=1&ap_mode=timeline&ap_time_cursor=2025-06-13').timeline.cursor, '2025-06-13..2025-06-13', 'a bare day is a one-day window');
assert.equal(readApertureState('?ap_v=1&ap_mode=timeline&ap_time_cursor=2025-06-13..nonsense').timeline.cursor, '', 'a half-valid window is no window');
assert.equal(isoDay('2024-02-29'), '2024-02-29');
assert.equal(isoDay('2023-02-29'), '');
assert.equal(isoDay('2024'), '');
assert.equal(dayWindow(' 2024-01-05..2024-01-02 '), '2024-01-02..2024-01-05');
assert.deepEqual(laneList(['b', 'a', 'b', '', ' c ']), ['b', 'a', 'c']);
const roundTrip = readApertureState(writeApertureState({ mode: 'map', timeline: { ...timelineDefaults, hop: 'context', lanes: ['x', 'y'] } }));
assert.deepEqual(roundTrip.timeline, { ...timelineDefaults, hop: 'context', lanes: ['x', 'y'] }, 'non-default timeline keys travel with every mode');
const twice = writeApertureState(readApertureState(url.search));
assert.equal(twice.toString(), writeApertureState(snapshot).toString(), 'serialization is deterministic across a read/write cycle');

const manyPins = Array.from({ length: 50 }, (_, index) => `actor-${String(49 - index).padStart(2, '0')}`);
const limitedUrl = new URL(buildApertureUrl({ ...snapshot, surface: { ...snapshot.surface, pins: manyPins } }, 'https://example.test/'));
const limited = readApertureState(limitedUrl.search);
assert.equal(limited.surface.pins.length, 36, 'shared URLs must enforce the public bracket-pin bound');
assert.deepEqual(limited.surface.pins, [...manyPins].sort().slice(0, 36), 'pin truncation must be deterministic before publication');

const existing = new URLSearchParams('keep=1&ap_v=old&ap_mode=route&ap_route_from=stale&ap_time_by=stale');
const serialized = writeApertureState(snapshot, existing);
assert.equal(serialized.get('keep'), '1');
assert.equal(serialized.getAll('ap_v').length, 1);
assert.equal(serialized.get('ap_route_from'), 'actor-a');
assert.equal(serialized.getAll('ap_time_by').length, 1);
for (const key of APERTURE_QUERY_KEYS) assert.ok(serialized.has(key), `${key} must have a deterministic serialized value when it is not at its default`);

// --- the exact standalone shape: six flattened modules (the timeline model goes through
// isolateModule because it imports core.mjs) and the eighteen runtime files in loader order.
function isolateModule(moduleSource) {
  const exportedNames = [...moduleSource.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  const body = moduleSource.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}
const moduleFiles = [
  'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs',
  'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs',
  'src/visual-aperture-windowing.mjs',
  'src/visual-aperture-timeline.mjs'
];
const moduleRecords = moduleFiles.map(file => {
  const source = readFileSync(file, 'utf8');
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  const body = /^import\s/m.test(source) ? `const { ${names.join(', ')} } = ${isolateModule(source)};` : source.replace(/^export\s+/gm, '');
  return { names, body };
});
const names = [...new Set(moduleRecords.flatMap(record => record.names))];
const modules = moduleRecords.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
const runtimeFiles = [
  'src/visual-aperture-workspace-runtime.js',
  'src/visual-aperture-export-runtime.js',
  ...Array.from({ length: 10 }, (_, index) => `src/visual-aperture-part-${index + 1}.js`),
  'src/visual-aperture-timeline-runtime.js',
  'src/visual-aperture-social-field-runtime.js',
  'src/visual-aperture-bounded-runtime.js',
  'src/visual-aperture-export-preview-runtime.js',
  'src/visual-aperture-part-11.js',
  'src/visual-aperture-bounded-address-runtime.js'
];
assert.equal(runtimeFiles.length, 18);
// Parts 1-10 come from one template entry in the loader; every other file is listed literally.
const loader = readFileSync('src/visual-aperture.js', 'utf8');
const loaderToken = file => (/part-(?:[1-9]|10)\.js$/.test(file) ? 'visual-aperture-part-${index + 1}.js' : file.replace('src/', ''));
const loaderOrder = runtimeFiles.map(file => loader.indexOf(loaderToken(file)));
assert.ok(loaderOrder.every(index => index >= 0), 'every runtime file is in the loader');
assert.deepEqual(loaderOrder, [...loaderOrder].sort((a, b) => a - b), 'the test lists the runtime files in loader order');
const runtime = runtimeFiles.map(file => readFileSync(file, 'utf8')).join('\n\n');
const standaloneShape = `(function visualApertureBundle() {\n${modules}\n(function visualApertureRuntime() {\nconst { ${names.join(', ')} } = globalThis;\n${runtime}\n})();\n})();`;
assert.doesNotMatch(standaloneShape, /^import\s/m, 'no import statement survives into the classic bundle');
assert.doesNotThrow(() => new Function(standaloneShape), 'the exact standalone-style bundle must parse without top-level declaration collisions');

console.log('visual-aperture-state.test.js: OK');
