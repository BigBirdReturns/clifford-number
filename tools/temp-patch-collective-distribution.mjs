import { readFileSync, writeFileSync } from 'node:fs';

const fixturePath = 'data/research/preference-custody/collective-distribution.fixture.json';
let fixtureSource = readFileSync(fixturePath, 'utf8');

function patchWorld(worldId, replacements) {
  const marker = `"world_id": "${worldId}"`;
  const start = fixtureSource.indexOf(marker);
  if (start < 0) throw new Error(`world not found: ${worldId}`);
  const nextWorld = fixtureSource.indexOf('\n    {\n      "world_id":', start + marker.length);
  const end = nextWorld >= 0 ? nextWorld : fixtureSource.indexOf('\n  ],', start + marker.length);
  if (end < 0) throw new Error(`world boundary not found: ${worldId}`);
  let segment = fixtureSource.slice(start, end);
  for (const [before, after] of replacements) {
    if (!segment.includes(before)) throw new Error(`expected text not found in ${worldId}: ${before}`);
    if (segment.includes(after)) throw new Error(`replacement already present in ${worldId}: ${after}`);
    segment = segment.replace(before, after);
  }
  fixtureSource = fixtureSource.slice(0, start) + segment + fixtureSource.slice(end);
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
  ['"comprehended_count": 70', '"comprehended_count": 100'],
  ['"consideration_match": false', '"consideration_match": true'],
  ['"overbroad": true', '"overbroad": false'],
  ['"overbroad_release_present": true', '"overbroad_release_present": false']
]);
writeFileSync(fixturePath, fixtureSource);

const testPath = 'test/preference-collective-distribution.test.js';
let testSource = readFileSync(testPath, 'utf8');
const testBefore = "const falseNoticeWorld = falseNoticeRecovery.worlds.find(world => world.world_id === 'notice-failure-binds-unnotified-population');\nfalseNoticeWorld.notice.delivered_count = 100;";
const testAfter = "const falseNoticeWorld = falseNoticeRecovery.worlds.find(world => world.world_id === 'notice-failure-binds-unnotified-population');\nfalseNoticeWorld.notice.sent_count = 100;\nfalseNoticeWorld.notice.delivered_count = 100;";
if (!testSource.includes(testBefore)) throw new Error('expected false-notice mutation source text not found');
if (testSource.includes(testAfter)) throw new Error('false-notice mutation repair already applied');
testSource = testSource.replace(testBefore, testAfter);
writeFileSync(testPath, testSource);

console.log('isolated notice, release, claims-burden, cy-pres, and formula mechanisms and repaired the notice counterfactual');
