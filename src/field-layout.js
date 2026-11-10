// The Field tab's layout contract, outside the renderer: the force constants
// the live engine runs, the deterministic seed positions it starts from, and
// the dense-roster rule that shortens a roster's rows. Pure: no DOM, no
// three.js, no d3. tools/build-field-layout.mjs runs the same forces offline
// against this contract and writes build/field-layout.json, so an arrival
// reads positions instead of computing them, and the geography is the same
// on every visit.
//
// The constants must stay byte-equal to the live renderer's (src/atlas-webgl.js,
// the force wiring under "The forces open the field"); the seed and hash are
// ports of galaxyStableHash and galaxySeedPositions there, guarded by
// test/field-layout.test.js against the renderer's own source.

// A surface with this many participants or more is a dense roster: its rows
// get a short rest length in the layout so the roster stays one object.
export const FIELD_DENSE_ROSTER = 40;

export const FIELD_FORCES = Object.freeze({
  charge: Object.freeze({ strength: -18, distanceMax: 260 }),
  link: Object.freeze({ distance: 22, denseDistance: 6, strength: .5, denseStrength: .9 }),
  denseRoster: FIELD_DENSE_ROSTER,
  alphaDecay: .026,
  velocityDecay: .3,
  dimensions: 2,
  maxTicks: 300,
  alphaMin: .001
});

function endpointId(value) { return typeof value === 'object' && value ? value.id : value; }

// FNV-1a over the UTF-16 code units, mapped to [0, 1]. Same bytes in, same
// number out, on every host.
export function fieldStableHash(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

// Deterministic starting positions for the layout: surfaces on a disc, each
// participant at the mean of its surfaces plus a small offset. The forces take
// it from here; the seed only makes the arrival reproducible. Writes x, y, z
// onto the field's nodes and returns the field.
export function seedFieldPositions(field) {
  const radius = 40 + Math.sqrt(field.nodes.length) * 7;
  const surfacePosition = new Map();
  for (const node of field.nodes) {
    if (node.ontology !== 'surface') continue;
    const angle = fieldStableHash(`${node.id}:a`) * Math.PI * 2;
    const r = Math.sqrt(fieldStableHash(`${node.id}:r`)) * radius;
    node.x = Math.cos(angle) * r;
    node.y = Math.sin(angle) * r;
    node.z = 0;
    surfacePosition.set(node.id, node);
  }
  const sums = new Map();
  for (const link of field.links) {
    const source = endpointId(link.source), target = endpointId(link.target);
    const surface = surfacePosition.get(target) ?? surfacePosition.get(source);
    const member = surface && surface.id === target ? source : target;
    if (!surface || member === surface.id) continue;
    const sum = sums.get(member) ?? { x: 0, y: 0, n: 0 };
    sum.x += surface.x; sum.y += surface.y; sum.n += 1;
    sums.set(member, sum);
  }
  for (const node of field.nodes) {
    if (node.ontology === 'surface') continue;
    const sum = sums.get(node.id);
    const angle = fieldStableHash(`${node.id}:a`) * Math.PI * 2;
    const jitter = 6 + fieldStableHash(`${node.id}:j`) * 10;
    if (sum) {
      node.x = sum.x / sum.n + Math.cos(angle) * jitter;
      node.y = sum.y / sum.n + Math.sin(angle) * jitter;
    } else {
      const r = radius * (1.05 + fieldStableHash(`${node.id}:r`) * .15);
      node.x = Math.cos(angle) * r;
      node.y = Math.sin(angle) * r;
    }
    node.z = 0;
  }
  return field;
}

// The surface node ids whose roster is dense: a row into one of these gets the
// short rest length and the firm strength.
export function denseSurfaceIds(field) {
  return new Set(field.nodes
    .filter(node => node.ontology === 'surface' && (node.participant_count ?? 0) >= FIELD_DENSE_ROSTER)
    .map(node => node.id));
}

// Whether a participation row lands in a dense roster: the row's target is
// the surface, as buildLedgerFieldModel draws it (participant -> surface).
export function isDenseLink(link, dense) {
  return dense.has(endpointId(link.target));
}
