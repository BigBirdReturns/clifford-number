#!/usr/bin/env node
import { loadSg10HistoricalContext, validateSg10 } from '../tools/validate-project-stable-ground-sg10.mjs';

const base = loadSg10HistoricalContext({ historicalVerifier: () => [] });
const clone = () => {
  const { historicalVerifier, ...data } = base;
  return { ...structuredClone(data), historicalVerifier };
};
const cases = [
  ['identity', (c) => { c.checkpoint.checkpoint_id = 'OTHER'; }, 'SG-10 identity'],
  ['review identity', (c) => { c.checkpoint.trigger.review_id = 'OTHER'; }, 'SG-10 review identity'],
  ['review count', (c) => { c.checkpoint.trigger.wave_02_maintainer_reviewed = 7; }, 'SG-10 reviewed count'],
  ['second-party self-award', (c) => { c.checkpoint.trigger.wave_02_second_party_reviewed = 1; }, 'SG-10 second-party zero'],
  ['adjudication self-award', (c) => { c.checkpoint.trigger.wave_02_adjudicated = 1; }, 'SG-10 adjudication zero'],
  ['obligation drift', (c) => { c.checkpoint.trigger.global_open_acquisition_obligations = 3; }, 'SG-10 open-acquisition denominator'],
  ['complete compact self-award', (c) => { c.checkpoint.trigger.complete_compact_findings = 1; }, 'SG-10 complete-compact zero'],
  ['publication self-award', (c) => { c.checkpoint.trigger.publication_clearances = 1; }, 'SG-10 publication zero'],
  ['graph self-award', (c) => { c.checkpoint.trigger.graph_effects = 1; }, 'SG-10 graph zero'],
  ['manifest schema', (c) => { c.manifest.schema_version = 'other'; }, 'SG-10 manifest schema'],
  ['manifest digest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'SG-10 frozen release digest'],
  ['report identity', (c) => { c.report.checkpoint_id = 'OTHER'; }, 'SG-10 report identity'],
  ['report digest', (c) => { c.report.release_manifest.combined_sha256 = 'f'.repeat(64); }, 'SG-10 report release digest'],
  ['report count', (c) => { c.report.counts.maintainer_reviewed = 21; }, 'SG-10 report reviewed count'],
  ['banner removed', (c) => { c.html = ''; }, 'SG-10 historical banner missing'],
  ['append-only disabled', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['history row removed', (c) => { c.pointer.history = c.pointer.history.filter((r) => r.checkpoint_id !== 'SG-2026-07-31-10'); }, 'SG-10 history row missing'],
  ['history status', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').status = 'current'; }, 'SG-10 historical status'],
  ['trigger receipt', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').trigger_commit = '0'.repeat(40); }, 'SG-10 trigger receipt'],
  ['merge receipt', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').merge_commit = '0'.repeat(40); }, 'SG-10 merge receipt'],
  ['pointer rollback', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-10'; }, 'SG-10 incorrectly remains current'],
  ['historical byte drift', (c) => { c.historicalVerifier = () => ['historical SG-10 bytes drifted']; }, 'historical SG-10 bytes drifted']
];

const initial = validateSg10(base);
if (initial.length) {
  console.error(initial.join('\n'));
  process.exit(1);
}
for (const [name, mutate, expected] of cases) {
  const context = clone();
  mutate(context);
  const errors = validateSg10(context);
  if (!errors.some((error) => error.includes(expected))) {
    console.error(`${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
    process.exit(1);
  }
}
console.log(`project-stable-ground-sg10.test: ${cases.length} historical adversarial mutations PASS`);
