#!/usr/bin/env node
import { loadSg09Context, validateSg09 } from '../tools/validate-project-stable-ground-sg09.mjs';

const base = loadSg09Context({ historicalVerifier: () => [] });
const clone = () => {
  const { historicalVerifier, ...data } = base;
  return { ...structuredClone(data), historicalVerifier };
};
const cases = [
  ['checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'OTHER'; }, 'SG-09 identity'],
  ['campaign identity', (c) => { c.checkpoint.trigger.campaign_id = 'OTHER'; }, 'SG-09 campaign identity'],
  ['packet denominator', (c) => { c.checkpoint.trigger.wave_packets = 13; }, 'SG-09 packet denominator'],
  ['self-award review', (c) => { c.checkpoint.trigger.valid_reviews = 1; }, 'SG-09 valid-review zero state'],
  ['self-award adjudication', (c) => { c.checkpoint.trigger.adjudicated_packets = 1; }, 'SG-09 adjudication zero state'],
  ['graph mutation', (c) => { c.checkpoint.trigger.graph_effects = 1; }, 'SG-09 graph zero state'],
  ['predecessor drift', (c) => { c.checkpoint.supersedes.checkpoint_id = 'OTHER'; }, 'SG-09 predecessor'],
  ['predecessor digest drift', (c) => { c.checkpoint.supersedes.release_sha256 = 'f'.repeat(64); }, 'SG-09 predecessor release'],
  ['manifest schema drift', (c) => { c.manifest.schema_version = 'other'; }, 'SG-09 manifest schema'],
  ['manifest digest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'SG-09 release digest'],
  ['report identity drift', (c) => { c.report.checkpoint_id = 'OTHER'; }, 'SG-09 report identity'],
  ['banner removed', (c) => { c.html = ''; }, 'SG-09 historical banner missing'],
  ['governor append-only disabled', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['history row removed', (c) => { c.pointer.history = c.pointer.history.filter((r) => r.checkpoint_id !== 'SG-2026-07-31-09'); }, 'SG-09 history row missing'],
  ['historical status made current', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-09').status = 'current'; }, 'SG-09 historical status'],
  ['merge receipt drift', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-09').merge_commit = '0'.repeat(40); }, 'SG-09 merge receipt'],
  ['current pointer rollback', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-09'; }, 'SG-09 incorrectly remains current'],
  ['historical bytes drift', (c) => { c.historicalVerifier = () => ['historical SG-09 bytes drifted']; }, 'historical SG-09 bytes drifted']
];

const initial = validateSg09(base);
if (initial.length) {
  console.error(initial.join('\n'));
  process.exit(1);
}
for (const [name, mutate, expected] of cases) {
  const context = clone();
  context.historicalVerifier = base.historicalVerifier;
  mutate(context);
  const errors = validateSg09(context);
  if (!errors.some((error) => error.includes(expected))) {
    console.error(`${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
    process.exit(1);
  }
}
console.log(`project-stable-ground-sg09.test: ${cases.length} historical adversarial mutations PASS`);
