#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg11HistoricalContext, validateSg11 } from '../tools/validate-project-stable-ground-sg11.mjs';
const base = loadSg11HistoricalContext({ historicalVerifier: () => [] });
const clone = () => {
  const { historicalVerifier, ...data } = base;
  return { ...structuredClone(data), historicalVerifier };
};
assert.deepEqual(validateSg11(base), []);
const cases = [
  (c) => { c.checkpoint.checkpoint_id = 'OTHER'; },
  (c) => { c.checkpoint.trigger.campaign_id = 'OTHER'; },
  (c) => { c.checkpoint.trigger.reviewer_candidates = 1; },
  (c) => { c.checkpoint.trigger.valid_reviews = 1; },
  (c) => { c.manifest.combined_sha256 = '0'.repeat(64); },
  (c) => { c.report.counts.reviewer_candidates = 1; },
  (c) => { c.report.release_manifest.combined_sha256 = '0'.repeat(64); },
  (c) => { c.html = ''; },
  (c) => { c.governor.history_law.append_only = false; },
  (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-11'; },
  (c) => { c.pointer.history.find((row) => row.checkpoint_id === 'SG-2026-07-31-11').status = 'current'; },
  (c) => { c.pointer.history.find((row) => row.checkpoint_id === 'SG-2026-07-31-11').merge_commit = '0'.repeat(40); },
  (c) => { c.historicalVerifier = () => ['historical SG-11 bytes drifted']; }
];
for (const mutate of cases) {
  const context = clone();
  mutate(context);
  assert.ok(validateSg11(context).length > 0);
}
console.log(`project-stable-ground-sg11.test: ${cases.length} historical adversarial mutations PASS`);
