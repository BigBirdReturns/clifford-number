#!/usr/bin/env node
import { loadSg10Context, validateSg10 } from '../tools/validate-project-stable-ground-sg10.mjs';

const base = loadSg10Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
const clone = () => {
  const { transitionVerifier, historicalVerifier, ...data } = base;
  return { ...structuredClone(data), transitionVerifier, historicalVerifier };
};

const cases = [
  ['checkpoint schema', (c) => { c.checkpoint.schema_version = 'other'; }, 'SG-10 schema'],
  ['checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'OTHER'; }, 'SG-10 identity'],
  ['checkpoint date', (c) => { c.checkpoint.as_of = '2026-08-01'; }, 'SG-10 date'],
  ['predecessor identity', (c) => { c.checkpoint.supersedes.checkpoint_id = 'OTHER'; }, 'SG-10 predecessor'],
  ['predecessor path', (c) => { c.checkpoint.supersedes.source_path = 'other.json'; }, 'SG-10 predecessor path'],
  ['predecessor merge receipt', (c) => { c.checkpoint.supersedes.merge_commit = '0'.repeat(40); }, 'SG-09 merge receipt'],
  ['predecessor release receipt', (c) => { c.checkpoint.supersedes.release_sha256 = 'f'.repeat(64); }, 'SG-09 release receipt'],
  ['predecessor preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-09 preservation'],
  ['history order', (c) => { c.pointer.history.reverse(); }, 'SG-10 history order'],
  ['multiple current checkpoints', (c) => { c.pointer.history[0].status = 'current'; }, 'SG-10 current-state denominator'],
  ['current checkpoint pointer', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-09'; }, 'SG-10 current checkpoint'],
  ['current checkpoint path', (c) => { c.pointer.current_checkpoint_path = 'other.json'; }, 'SG-10 current path'],
  ['current transition receipt', (c) => { c.pointer.current_canonical_main_commit = '0'.repeat(40); }, 'SG-10 current transition receipt'],
  ['historical SG09 status', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-09').status = 'current'; }, 'SG-09 historical status'],
  ['historical SG09 merge receipt', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-09').merge_commit = '0'.repeat(40); }, 'SG-09 historical merge receipt'],
  ['current row status', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').status = 'superseded_preserved'; }, 'SG-10 pointer status'],
  ['current row receipt', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').trigger_commit = '0'.repeat(40); }, 'SG-10 pointer trigger receipt'],
  ['append-only law', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['historical rewrite law', (c) => { c.governor.history_law.historical_data_and_reports_rewritten = true; }, 'governor historical no-rewrite law'],
  ['historical manifest law', (c) => { c.governor.history_law.historical_release_manifests_recomputed = true; }, 'governor historical manifest law'],
  ['correction mode', (c) => { c.governor.checkpoint_contract.correction_mode = 'rewrite'; }, 'governor correction mode'],
  ['trigger type', (c) => { c.checkpoint.trigger.type = 'other'; }, 'SG-10 trigger type'],
  ['trigger issue', (c) => { c.checkpoint.trigger.issue = 0; }, 'SG-10 trigger issue'],
  ['trigger PR', (c) => { c.checkpoint.trigger.pull_request = 0; }, 'SG-10 trigger PR'],
  ['review identity', (c) => { c.checkpoint.trigger.review_id = 'OTHER'; }, 'SG-10 review identity'],
  ['transition base', (c) => { c.checkpoint.trigger.transition_base = '0'.repeat(40); }, 'SG-10 transition base'],
  ['transition commit', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }, 'SG-10 transition commit'],
  ['transition path count', (c) => { c.checkpoint.trigger.transition_paths.pop(); }, 'SG-10 transition path denominator'],
  ['transition path digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-10 transition path digest'],
  ['Wave 02 review count', (c) => { c.checkpoint.trigger.wave_02_maintainer_reviewed = 7; }, 'SG-10 Wave 02 review count'],
  ['self-award second party', (c) => { c.checkpoint.trigger.wave_02_second_party_reviewed = 1; }, 'SG-10 Wave 02 second-party count'],
  ['self-award adjudication', (c) => { c.checkpoint.trigger.wave_02_adjudicated = 1; }, 'SG-10 Wave 02 adjudication count'],
  ['Wave 02 obligation drift', (c) => { c.checkpoint.trigger.wave_02_open_acquisition_obligations = 2; }, 'SG-10 Wave 02 acquisition count'],
  ['global obligation drift', (c) => { c.checkpoint.trigger.global_open_acquisition_obligations = 3; }, 'SG-10 global acquisition count'],
  ['complete compact self-award', (c) => { c.checkpoint.trigger.complete_compact_findings = 1; }, 'SG-10 trigger complete_compact_findings'],
  ['racial-order self-award', (c) => { c.checkpoint.trigger.racial_order_findings = 1; }, 'SG-10 trigger racial_order_findings'],
  ['publication self-award', (c) => { c.checkpoint.trigger.publication_clearances = 1; }, 'SG-10 trigger publication_clearances'],
  ['graph mutation', (c) => { c.checkpoint.trigger.graph_effects = 1; }, 'SG-10 trigger graph_effects'],
  ['live Wave 02 review count', (c) => { c.review.counts.maintainer_reviewed = 7; }, 'live Wave 02 maintainer count'],
  ['live Wave 02 acquisition count', (c) => { c.review.counts.requires_additional_acquisition = 2; }, 'live Wave 02 acquisition count'],
  ['live Wave 02 publication state', (c) => { c.review.current_result.publication_status = 'cleared'; }, 'live Wave 02 publication state'],
  ['live Wave 02 graph state', (c) => { c.review.current_result.graph_effect = 'edge'; }, 'live Wave 02 graph state'],
  ['global reviewed count', (c) => { c.compact.current_state.maintainer_reviewed_observations = 21; }, 'SSC maintainer-reviewed count'],
  ['global obligation count', (c) => { c.compact.current_state.open_acquisition_obligations = 3; }, 'SSC global open-acquisition count'],
  ['Wave 01 obligation count', (c) => { c.compact.current_state.wave_01_open_acquisition_obligations = 2; }, 'SSC Wave 01 open-acquisition count'],
  ['Wave 02 obligation count', (c) => { c.compact.current_state.wave_02_open_acquisition_obligations = 2; }, 'SSC Wave 02 open-acquisition count'],
  ['review registry denominator', (c) => { c.compact.maintainer_reviews.pop(); }, 'SSC review registry denominator'],
  ['checkpoint status digest', (c) => { c.checkpoint.authority_change.checkpoint_status_release_sha256 = 'f'.repeat(64); }, 'SG-10 checkpoint status release custody'],
  ['checkpoint POOF digest', (c) => { c.checkpoint.authority_change.checkpoint_poof_release_sha256 = 'f'.repeat(64); }, 'SG-10 checkpoint POOF release custody'],
  ['release manifest drift', (c) => { c.manifest.entries[0].bytes += 1; }, 'SG-10 exact-byte manifest'],
  ['report identity', (c) => { c.report.checkpoint_id = 'OTHER'; }, 'SG-10 report identity'],
  ['report acquisition count', (c) => { c.report.counts.global_open_acquisition_obligations = 3; }, 'SG-10 report acquisition count'],
  ['banner removed', (c) => { c.html = ''; }, 'SG-10 boundary banner missing'],
  ['transition verification failure', (c) => { c.transitionVerifier = () => ['transition verifier failed']; }, 'transition verifier failed'],
  ['historical verification failure', (c) => { c.historicalVerifier = () => ['historical verifier failed']; }, 'historical verifier failed']
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

console.log(`project-stable-ground-sg10.test: ${cases.length} adversarial mutations PASS`);
