// The offline Field layout: the contract in src/field-layout.js is the live
// renderer's, the seed and hash are faithful ports of the renderer's own
// functions, the builder is deterministic, and build/field-layout.json has the
// shape the explorer reads.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { root, readJson } from '../tools/lib/ledger.mjs';
import { buildLedgerFieldModel, buildFieldLedgerIndex, buildSocialFieldModel } from '../src/social-field.js';
import { FIELD_FORCES, FIELD_DENSE_ROSTER, fieldStableHash, seedFieldPositions, denseSurfaceIds, isDenseLink } from '../src/field-layout.js';

const BUILDER = path.join(root, 'tools', 'build-field-layout.mjs');
const ARTIFACT = 'build/field-layout.json';
const SOURCE = 'build/surface-graph.json';

// --- the contract is the renderer's -----------------------------------------------------------

assert.ok(Object.isFrozen(FIELD_FORCES) && Object.isFrozen(FIELD_FORCES.charge) && Object.isFrozen(FIELD_FORCES.link), 'FIELD_FORCES is frozen through');
assert.deepEqual(FIELD_FORCES, {
  charge: { strength: -18, distanceMax: 260 },
  link: { distance: 22, denseDistance: 6, strength: .5, denseStrength: .9 },
  denseRoster: 40,
  alphaDecay: .026,
  velocityDecay: .3,
  dimensions: 2,
  maxTicks: 300,
  alphaMin: .001
});
assert.equal(FIELD_DENSE_ROSTER, 40);

// The renderer's own wiring, read from its source: a drift on either side fails
// here. Once the renderer imports the contract from src/field-layout.js the two
// are equal by construction and the source guard has nothing left to check.
const rendererPath = path.join(root, 'src', 'atlas-webgl.js');
const renderer = readFileSync(rendererPath, 'utf8');
const rendererSharesContract = /from\s+['"]\.\/field-layout\.js['"]/u.test(renderer);
if (!rendererSharesContract) {
  const charge = /d3Force\('charge'\)\s*\.strength\((-?[\d.]+)\)\s*\.distanceMax\((-?[\d.]+)\)/u.exec(renderer);
  assert.ok(charge, 'the renderer wires its charge force inline');
  assert.equal(Number(charge[1]), FIELD_FORCES.charge.strength);
  assert.equal(Number(charge[2]), FIELD_FORCES.charge.distanceMax);
  const link = /\.distance\(link => denseLink\(link\) \? (-?[\d.]+) : (-?[\d.]+)\)\s*\.strength\(link => denseLink\(link\) \? (-?[\d.]+) : (-?[\d.]+)\)/u.exec(renderer);
  assert.ok(link, 'the renderer wires its link force inline');
  assert.equal(Number(link[1]), FIELD_FORCES.link.denseDistance);
  assert.equal(Number(link[2]), FIELD_FORCES.link.distance);
  assert.equal(Number(link[3]), FIELD_FORCES.link.denseStrength);
  assert.equal(Number(link[4]), FIELD_FORCES.link.strength);
  assert.equal(Number(/\.d3AlphaDecay\((-?[\d.]+)\)/u.exec(renderer)?.[1]), FIELD_FORCES.alphaDecay);
  assert.equal(Number(/\.d3VelocityDecay\((-?[\d.]+)\)/u.exec(renderer)?.[1]), FIELD_FORCES.velocityDecay);
  assert.equal(Number(/const GALAXY_DENSE_ROSTER = (\d+);/u.exec(renderer)?.[1]), FIELD_FORCES.denseRoster);
  assert.match(renderer, /\.numDimensions\(2\)/u);
}

// --- the seed and hash are ports of the renderer's functions -----------------------------------

function rendererFunction(name) {
  const start = renderer.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const end = renderer.indexOf('\n}\n', start);
  assert.ok(end > start, `${name} ends at column 0`);
  return renderer.slice(start, end + 2);
}
const hashSource = rendererFunction('galaxyStableHash');
const seedSource = rendererFunction('galaxySeedPositions');
const smallField = () => ({
  nodes: [
    { id: 'surface-one', ontology: 'surface', participant_count: 2 },
    { id: 'surface-two', ontology: 'surface', participant_count: 41 },
    { id: 'person-a', ontology: 'person' },
    { id: 'person-b', ontology: 'person' },
    { id: 'org-x', ontology: 'organization' },
    { id: 'person-alone', ontology: 'person' }
  ],
  links: [
    { id: 'row-0', source: 'person-a', target: 'surface-one' },
    { id: 'row-1', source: 'person-a', target: 'surface-two' },
    { id: 'row-2', source: 'person-b', target: 'surface-two' },
    { id: 'row-3', source: 'org-x', target: 'surface-one' },
    // Object endpoints, as d3 leaves them after a run, resolve the same way.
    { id: 'row-4', source: { id: 'org-x' }, target: { id: 'surface-two' } }
  ]
});
if (hashSource && seedSource) {
  const theirs = vm.runInNewContext(`
    function endpointId(value) { return typeof value === 'object' && value ? value.id : value; }
    ${hashSource}
    ${seedSource}
    ({ galaxyStableHash, galaxySeedPositions });`, {});
  const samples = ['', 'a', 'matt-clifford', 'surface-uk-ai-safety-institute:a', 'surface-1:r', 'ünïcödé:j', '\u{1F600}', ...Array.from({ length: 64 }, (_, index) => `node-${index}:${'arj'[index % 3]}`)];
  for (const sample of samples) assert.equal(fieldStableHash(sample), theirs.galaxyStableHash(sample), `hash of ${JSON.stringify(sample)}`);
  const ours = seedFieldPositions(smallField());
  const reference = smallField();
  theirs.galaxySeedPositions(reference);
  for (const [index, node] of ours.nodes.entries()) {
    const other = reference.nodes[index];
    assert.deepEqual([node.x, node.y, node.z], [other.x, other.y, other.z], `seed of ${node.id}`);
  }
}
for (const sample of ['a', 'b', 'surface-x:a']) {
  const value = fieldStableHash(sample);
  assert.ok(value >= 0 && value <= 1 && value === fieldStableHash(sample), 'hash is stable and in [0, 1]');
}
{
  const seeded = seedFieldPositions(smallField());
  const byId = new Map(seeded.nodes.map(node => [node.id, node]));
  for (const node of seeded.nodes) assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y) && node.z === 0, `${node.id} is placed on the plane`);
  const one = byId.get('surface-one'), two = byId.get('surface-two'), a = byId.get('person-a');
  const mean = { x: (one.x + two.x) / 2, y: (one.y + two.y) / 2 };
  assert.ok(Math.hypot(a.x - mean.x, a.y - mean.y) <= 16 + 1e-9, 'a participant sits at the mean of its surfaces plus at most the 6..16 jitter');
  const radius = 40 + Math.sqrt(seeded.nodes.length) * 7;
  const alone = byId.get('person-alone');
  assert.ok(Math.hypot(alone.x, alone.y) >= radius * 1.05 - 1e-9 && Math.hypot(alone.x, alone.y) <= radius * 1.2 + 1e-9, 'a participant without surfaces sits just outside the disc');
}

// --- the dense-roster rule -----------------------------------------------------------------------

{
  const field = {
    nodes: [
      { id: 'surface-39', ontology: 'surface', participant_count: 39 },
      { id: 'surface-40', ontology: 'surface', participant_count: 40 },
      { id: 'surface-41', ontology: 'surface', participant_count: 41 },
      { id: 'surface-none', ontology: 'surface' },
      { id: 'org-big', ontology: 'organization', participant_count: 100 }
    ],
    links: []
  };
  const dense = denseSurfaceIds(field);
  assert.deepEqual([...dense].sort(), ['surface-40', 'surface-41'], 'surfaces with 40 or more participants are dense; others and non-surfaces are not');
  assert.equal(isDenseLink({ source: 'p', target: 'surface-40' }, dense), true);
  assert.equal(isDenseLink({ source: 'p', target: { id: 'surface-41' } }, dense), true);
  assert.equal(isDenseLink({ source: 'p', target: 'surface-39' }, dense), false);
  assert.equal(isDenseLink({ source: 'surface-40', target: 'p' }, dense), false, 'only the target end names the roster');
}

// --- the real model, built as the runtime builds it ---------------------------------------------

const surfaceGraph = readJson(SOURCE);
const model = buildLedgerFieldModel(surfaceGraph);
const ledger = buildFieldLedgerIndex(surfaceGraph, model);
const field = buildSocialFieldModel(model, { ledger, atDay: ledger.range?.last_day ?? null, reinforcement: false });
const expectedDense = new Set(surfaceGraph.surfaces.filter(surface => (surface.participants ?? []).length >= 40).map(surface => `surface-${surface.surface_id}`));
assert.ok(expectedDense.size > 0, 'the ledger has at least one dense roster');
assert.deepEqual(denseSurfaceIds(field), expectedDense, 'the dense rule picks exactly the surfaces with 40+ participants');

// --- the builder: deterministic, and the artifact has the shape the explorer reads --------------

const build = extrapolate => {
  execFileSync(process.execPath, [BUILDER, `--extrapolate=${extrapolate}`], { cwd: root, stdio: 'inherit' });
  return readFileSync(path.join(root, ...ARTIFACT.split('/')), 'utf8');
};
const first = build(2);
const second = build(0);
// Every byte is the same between runs: the gate rebuilds this tracked artifact.
assert.equal(first, second, 'two runs write byte-identical artifacts');
const layout = JSON.parse(first);
assert.ok(JSON.stringify(layout.nodes) === JSON.stringify(JSON.parse(second).nodes), 'two runs give byte-identical node maps');

assert.deepEqual(Object.keys(layout), ['generated', 'source', 'source_sha256', 'node_count', 'link_count', 'ticks', 'alpha', 'forces', 'nodes'], 'the artifact has exactly the agreed keys, in order');
assert.equal(new Date(layout.generated).toISOString(), layout.generated, 'generated is an ISO timestamp');
assert.equal(layout.source, SOURCE);
assert.equal(layout.source_sha256, crypto.createHash('sha256').update(readFileSync(path.join(root, ...SOURCE.split('/')))).digest('hex'), 'source_sha256 is the SHA-256 of the source file');
assert.equal(layout.node_count, field.nodes.length);
assert.equal(layout.link_count, field.links.length);
assert.ok(Number.isInteger(layout.ticks) && layout.ticks >= 1 && layout.ticks <= FIELD_FORCES.maxTicks, `ticks within 1..${FIELD_FORCES.maxTicks}`);
assert.ok(Number.isFinite(layout.alpha) && layout.alpha >= 0 && layout.alpha < 1, 'alpha is a finite fraction');
assert.ok(layout.alpha < FIELD_FORCES.alphaMin || layout.ticks === FIELD_FORCES.maxTicks, 'the layout ran to rest or to the tick cap');
assert.deepEqual(layout.forces, JSON.parse(JSON.stringify(FIELD_FORCES)), 'the artifact records the forces it ran');
assert.ok(!('timing_ms' in layout), 'timings stay on stdout, never in the tracked artifact');

const ids = Object.keys(layout.nodes);
assert.equal(ids.length, field.nodes.length, 'one position per node');
assert.deepEqual(ids, field.nodes.map(node => node.id), 'positions follow the model order and cover every node id');
for (const id of ids) {
  const position = layout.nodes[id];
  assert.ok(Array.isArray(position) && position.length === 2, `${id} is an [x, y] pair`);
  for (const value of position) {
    assert.ok(Number.isFinite(value), `${id} is finite`);
    assert.equal(Math.round(value * 100) / 100, value, `${id} is rounded to 2 decimals`);
  }
}
const spread = ids.map(id => Math.hypot(...layout.nodes[id]));
assert.ok(Math.max(...spread) > 100, 'the field opened up beyond the seed disc');

console.log(`field-layout.test: OK (${layout.node_count} nodes, ${layout.link_count} links, ${layout.ticks} ticks, alpha ${layout.alpha}, ${expectedDense.size} dense rosters, deterministic)`);
