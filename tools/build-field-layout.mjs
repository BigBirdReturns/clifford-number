#!/usr/bin/env node
// Builds build/field-layout.json: the Field tab's force layout, run once here
// instead of on every arrival. The node and link model is built exactly as the
// explorer runtime builds it (buildLedgerFieldModel -> buildFieldLedgerIndex ->
// buildSocialFieldModel, see ensureFieldModel in
// src/visual-aperture-field-runtime.js), so every id in the artifact is an id
// the page already has. The forces, the seed and the dense-roster rule come
// from src/field-layout.js, the renderer's own contract.
//
// Determinism contract: the layout is seeded by hashed ids and the simulation's
// random source is mulberry32 seeded from the source file's SHA-256, so two
// runs against the same build/surface-graph.json write identical bytes. The
// timestamp is the admitted build clock, never wall time.
//
// Usage: node tools/build-field-layout.mjs [--extrapolate=<factor>]
//   --extrapolate=10 (default) also times the same layout on a synthetic model
//   with the nodes and links duplicated <factor> times, printed and never
//   written; 0 skips it.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d';
import { root } from './lib/ledger.mjs';
import { buildTimestamp } from './lib/build-clock.mjs';
import { buildLedgerFieldModel, buildFieldLedgerIndex, buildSocialFieldModel } from '../src/social-field.js';
import { FIELD_FORCES, seedFieldPositions, denseSurfaceIds, isDenseLink } from '../src/field-layout.js';

const SOURCE = 'build/surface-graph.json';
const TARGET = 'build/field-layout.json';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--([^=]+)(?:=(.*))?$/u.exec(arg);
  if (!match) throw new Error(`unexpected argument ${arg}`);
  return [match[1], match[2] ?? 'true'];
}));
const extrapolate = args.extrapolate === undefined ? 10 : Number(args.extrapolate);
if (!Number.isInteger(extrapolate) || extrapolate < 0) throw new Error(`--extrapolate must be a non-negative integer, got ${args.extrapolate}`);

// mulberry32: a 32-bit PRNG with one word of state, in [0, 1). The simulation
// draws from it only to break exact overlaps (d3's jiggle), so the seed decides
// those ties the same way on every run.
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// Runs the live renderer's forces to rest. Nodes must carry seed positions;
// links are copied so the model's own links keep their id endpoints.
function runFieldLayout(field, random) {
  const dense = denseSurfaceIds(field);
  const links = field.links.map(link => ({ id: link.id, source: link.source, target: link.target, dense: isDenseLink(link, dense) }));
  const { charge, link: linkForce } = FIELD_FORCES;
  const simulation = forceSimulation(undefined, FIELD_FORCES.dimensions).stop();
  if (typeof simulation.numDimensions === 'function') simulation.numDimensions(FIELD_FORCES.dimensions);
  simulation
    .randomSource(random)
    .alphaDecay(FIELD_FORCES.alphaDecay)
    .velocityDecay(FIELD_FORCES.velocityDecay)
    .alphaMin(FIELD_FORCES.alphaMin)
    .nodes(field.nodes)
    .force('link', forceLink(links)
      .id(node => node.id)
      .distance(link => (link.dense ? linkForce.denseDistance : linkForce.distance))
      .strength(link => (link.dense ? linkForce.denseStrength : linkForce.strength)))
    .force('charge', forceManyBody().strength(charge.strength).distanceMax(charge.distanceMax))
    .force('center', forceCenter());
  let ticks = 0;
  while (ticks < FIELD_FORCES.maxTicks && simulation.alpha() >= FIELD_FORCES.alphaMin) {
    simulation.tick();
    ticks += 1;
  }
  return { ticks, alpha: simulation.alpha(), dense: dense.size };
}

// The field model, built the way the runtime builds it (ensureFieldModel).
function buildFieldModelLikeRuntime(surfaceGraph) {
  const model = buildLedgerFieldModel(surfaceGraph);
  const ledger = buildFieldLedgerIndex(surfaceGraph, model);
  return buildSocialFieldModel(model, { ledger, atDay: ledger.range?.last_day ?? null, reinforcement: false });
}

// The same field with its nodes and links repeated `factor` times (ids
// suffixed), for timing how the layout scales. Never written.
function syntheticField(field, factor) {
  const nodes = [], links = [];
  for (let copy = 0; copy < factor; copy += 1) {
    const suffix = `~${copy}`;
    for (const node of field.nodes) nodes.push({ id: `${node.id}${suffix}`, ontology: node.ontology, participant_count: node.participant_count });
    for (const link of field.links) links.push({ id: `${link.id}${suffix}`, source: `${link.source}${suffix}`, target: `${link.target}${suffix}` });
  }
  return { nodes, links };
}

const sourceBytes = fs.readFileSync(path.join(root, ...SOURCE.split('/')));
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
const seed = parseInt(sourceSha256.slice(0, 8), 16);
const surfaceGraph = JSON.parse(sourceBytes.toString('utf8'));

const modelStart = performance.now();
const field = buildFieldModelLikeRuntime(surfaceGraph);
seedFieldPositions(field);
const modelMs = performance.now() - modelStart;

const layoutStart = performance.now();
const result = runFieldLayout(field, mulberry32(seed));
const layoutMs = performance.now() - layoutStart;

// One node per line: the header pretty-printed, each position one short row,
// so the artifact diffs by node and stays a fraction of the four-line form.
const nodeLines = [];
for (const node of field.nodes) {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error(`layout left ${node.id} at a non-finite position`);
  nodeLines.push(`    ${JSON.stringify(node.id)}: [${round2(node.x)}, ${round2(node.y)}]`);
}
const header = JSON.stringify({
  generated: buildTimestamp(),
  source: SOURCE,
  source_sha256: sourceSha256,
  node_count: field.nodes.length,
  link_count: field.links.length,
  ticks: result.ticks,
  alpha: Number(result.alpha.toPrecision(4)),
  forces: FIELD_FORCES,
  timing_ms: { model: round2(modelMs), layout: round2(layoutMs) }
}, null, 2);
const targetPath = path.join(root, ...TARGET.split('/'));
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, [`${header.slice(0, -2)},`, '  "nodes": {', nodeLines.join(',\n'), '  }', '}', ''].join('\n'));
console.log(`build-field-layout: ${field.nodes.length} nodes, ${field.links.length} links (${result.dense} dense rosters), ${result.ticks} ticks, alpha ${result.alpha.toExponential(3)}; model ${modelMs.toFixed(1)} ms, layout ${layoutMs.toFixed(1)} ms -> ${TARGET}`);

if (extrapolate > 0) {
  const synthetic = syntheticField(field, extrapolate);
  seedFieldPositions(synthetic);
  const start = performance.now();
  const scaled = runFieldLayout(synthetic, mulberry32(seed));
  const ms = performance.now() - start;
  console.log(`build-field-layout: extrapolation at ${extrapolate}x (${synthetic.nodes.length} nodes, ${synthetic.links.length} links): ${scaled.ticks} ticks, layout ${ms.toFixed(1)} ms (${(ms / layoutMs).toFixed(1)}x the real layout); not written`);
}
