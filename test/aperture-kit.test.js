import assert from 'node:assert/strict';
import {
  normalizedPins,
  selectBudgetedItems,
  semanticLevelForScale,
  stableRingPosition
} from '../src/aperture-kit-core.mjs';
import {
  buildApertureKitUrl,
  readApertureKitState,
  writeApertureKitState
} from '../src/aperture-kit-state.mjs';

let level = 'corpus';
level = semanticLevelForScale(1.46, level);
assert.equal(level, 'corpus');
level = semanticLevelForScale(1.7, level);
assert.equal(level, 'machine');
level = semanticLevelForScale(1.43, level);
assert.equal(level, 'machine');
assert.equal(semanticLevelForScale(4.4, 'surface'), 'evidence');

assert.deepEqual(normalizedPins(['z', 'a', 'z', '', 'b'], 2), ['a', 'b']);
const items = Array.from({ length: 10 }, (_, index) => ({ id: `item-${index}`, label: `Record ${index}` }));
const bounded = selectBudgetedItems(items, {
  query: 'Record',
  budget: 3,
  pinnedIds: ['item-9'],
  idFor: item => item.id,
  textFor: item => item.label
});
assert.equal(bounded.visible.length, 3);
assert.equal(bounded.visible[0].id, 'item-9');
assert.equal(bounded.hiddenByBudget, 7);
assert.deepEqual(stableRingPosition(0, 4, 50, 50, 20), { x: 50, y: 30, angle: -Math.PI / 2 });

const state = {
  mode: 'surface', scale: 4.3, level: 'evidence', focus: 'contract-1',
  query: 'receipt', budget: 12, pins: ['b', 'a', 'b']
};
const built = new URL(buildApertureKitUrl(state, 'https://example.test/?keep=1#receipt', 'rodoh_ap_'));
assert.equal(built.searchParams.get('keep'), '1');
assert.equal(built.hash, '#receipt');
assert.deepEqual(readApertureKitState(built.search, 'rodoh_ap_'), {
  version: '1', mode: 'surface', scale: 4.3, level: 'evidence', focus: 'contract-1',
  query: 'receipt', budget: 12, pins: ['a', 'b']
});
const rewritten = writeApertureKitState(state, '?rodoh_ap_v=old&keep=1', 'rodoh_ap_');
assert.equal(rewritten.get('keep'), '1');
assert.equal(rewritten.getAll('rodoh_ap_v').length, 1);

console.log('aperture-kit.test.js: OK');
