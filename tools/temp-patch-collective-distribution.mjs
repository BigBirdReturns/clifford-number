import { readFileSync, writeFileSync } from 'node:fs';

const path = 'data/research/preference-custody/collective-distribution.fixture.json';
let source = readFileSync(path, 'utf8');

function patchWorld(worldId, replacements) {
  const marker = `"world_id": "${worldId}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`world not found: ${worldId}`);
  const nextWorld = source.indexOf('\n    {\n      "world_id":', start + marker.length);
  const end = nextWorld >= 0 ? nextWorld : source.indexOf('\n  ],', start + marker.length);
  if (end < 0) throw new Error(`world boundary not found: ${worldId}`);
  let segment = source.slice(start, end);
  for (const [before, after] of replacements) {
    if (!segment.includes(before)) throw new Error(`expected text not found in ${worldId}: ${before}`);
    if (segment.includes(after)) throw new Error(`replacement already present in ${worldId}: ${after}`);
    segment = segment.replace(before, after);
  }
  source = source.slice(0, start) + segment + source.slice(end);
}

patchWorld('representative-conflict-side-payment-skew', [
  ['"acknowledged_count": 90', '"acknowledged_count": 100'],
  ['"comprehended_count": 80', '"comprehended_count": 100'],
  ['"language_and_accessibility_state": "nominal"', '"language_and_accessibility_state": "complete"']
]);
patchWorld('claims-made-high-burden-low-takeup-reversion', [
  ['"acknowledged_count": 80', '"acknowledged_count": 100'],
  ['"comprehended_count": 70', '"comprehended_count": 100']
]);
patchWorld('cy-pres-diversion-away-from-affected-population', [
  ['"acknowledged_count": 80', '"acknowledged_count": 100'],
  ['"comprehended_count": 70', '"comprehended_count": 100']
]);

writeFileSync(path, source);
console.log('isolated representation, claims-burden, and cy-pres worlds from notice failure');
