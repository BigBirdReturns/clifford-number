import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APERTURE_QUERY_KEYS,
  APERTURE_STATE_VERSION,
  buildApertureUrl,
  readApertureState,
  writeApertureState
} from '../src/visual-aperture-state.mjs';

const snapshot = {
  mode: 'surface',
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
    selectedStep: 1,
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
  }
};

const built = buildApertureUrl(snapshot, 'https://example.test/clifford-number/?lang=fr#actor/example');
const url = new URL(built);
assert.equal(url.searchParams.get('lang'), 'fr', 'unrelated query parameters must survive');
assert.equal(url.hash, '#actor/example', 'the existing hash router must survive');
assert.equal(url.searchParams.get('ap_v'), APERTURE_STATE_VERSION);
assert.equal(url.searchParams.get('ap_mode'), 'surface');
assert.equal(url.searchParams.get('ap_surface_pins'), 'actor-a,actor-c');

const decoded = readApertureState(url.search);
assert.deepEqual(decoded, {
  version: '1',
  mode: 'surface',
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
    selectedStep: 1,
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
  }
});

assert.equal(readApertureState('?ap_v=2&ap_mode=map'), null, 'unknown URL-state versions must be declined');
assert.equal(readApertureState('?ap_v=1&ap_mode=unknown'), null, 'unknown modes must be declined');

const clamped = readApertureState('?ap_v=1&ap_mode=surface&ap_map_scale=99&ap_map_level=surface&ap_route_evidence=bogus&ap_surface_budget=2&ap_surface_pins=b,a,b');
assert.equal(clamped.map.scale, 5.4);
assert.equal(clamped.route.evidenceFloor, null);
assert.equal(clamped.surface.budget, 6);
assert.deepEqual(clamped.surface.pins, ['a', 'b']);

const manyPins = Array.from({ length: 50 }, (_, index) => `actor-${String(49 - index).padStart(2, '0')}`);
const limitedUrl = new URL(buildApertureUrl({ ...snapshot, surface: { ...snapshot.surface, pins: manyPins } }, 'https://example.test/'));
const limited = readApertureState(limitedUrl.search);
assert.equal(limited.surface.pins.length, 36, 'shared URLs must enforce the public bracket-pin bound');
assert.deepEqual(limited.surface.pins, [...manyPins].sort().slice(0, 36), 'pin truncation must be deterministic before publication');

const existing = new URLSearchParams('keep=1&ap_v=old&ap_mode=route&ap_route_from=stale');
const serialized = writeApertureState(snapshot, existing);
assert.equal(serialized.get('keep'), '1');
assert.equal(serialized.getAll('ap_v').length, 1);
assert.equal(serialized.get('ap_route_from'), 'actor-a');
for (const key of APERTURE_QUERY_KEYS) assert.ok(serialized.has(key), `${key} must have a deterministic serialized value`);

const moduleFiles = ['src/visual-aperture-core.mjs', 'src/visual-aperture-state.mjs'];
const moduleRecords = moduleFiles.map(file => {
  const source = readFileSync(file, 'utf8');
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  return { names, body: source.replace(/^export\s+/gm, '') };
});
const names = [...new Set(moduleRecords.flatMap(record => record.names))];
const modules = moduleRecords.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
const runtime = Array.from({ length: 11 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8')).join('\n\n');
const standaloneShape = `(function visualApertureBundle() {\n${modules}\n(function visualApertureRuntime() {\nconst { ${names.join(', ')} } = globalThis;\n${runtime}\n})();\n})();`;
assert.doesNotThrow(() => new Function(standaloneShape), 'the exact standalone-style bundle must parse without top-level declaration collisions');

console.log('visual-aperture-state.test.js: OK');
