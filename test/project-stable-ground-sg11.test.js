#!/usr/bin/env node
import { loadSg11Context, validateSg11 } from '../tools/validate-project-stable-ground-sg11.mjs';

const base = loadSg11Context({ gitVerifier: () => [] });
const clone = () => {
  const { gitVerifier, ...data } = base;
  return { ...structuredClone(data), gitVerifier };
};
const cases = [
  ['identity', (c) => { c.checkpoint.checkpoint_id = 'OTHER'; }, 'SG-11 identity'],
  ['predecessor', (c) => { c.checkpoint.supersedes.checkpoint_id = 'OTHER'; }, 'SG-11 predecessor'],
  ['predecessor receipt', (c) => { c.checkpoint.supersedes.release_sha256 = 'f'.repeat(64); }, 'SG-10 release receipt'],
  ['history order', (c) => { c.pointer.history.pop(); }, 'SG-11 history order'],
  ['current pointer', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-10'; }, 'SG-11 current checkpoint'],
  ['current integration receipt', (c) => { c.pointer.current_canonical_main_commit = '0'.repeat(40); }, 'SG-11 current integration receipt'],
  ['SG-10 historical status', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-10').status = 'current'; }, 'SG-10 historical status'],
  ['SG-11 pointer status', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-11').status = 'superseded_preserved'; }, 'SG-11 pointer status'],
  ['pointer trigger', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-11').trigger_commit = '0'.repeat(40); }, 'SG-11 pointer trigger receipt'],
  ['append-only law', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['trigger type', (c) => { c.checkpoint.trigger.type = 'other'; }, 'SG-11 trigger type'],
  ['issue', (c) => { c.checkpoint.trigger.issue = 0; }, 'SG-11 trigger issue'],
  ['PR', (c) => { c.checkpoint.trigger.pull_request = 0; }, 'SG-11 trigger PR'],
  ['campaign identity', (c) => { c.checkpoint.trigger.campaign_id = 'OTHER'; }, 'SG-11 campaign identity'],
  ['transition base', (c) => { c.checkpoint.trigger.transition_base = '0'.repeat(40); }, 'SG-11 transition base'],
  ['transition commit', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }, 'SG-11 transition commit'],
  ['integration base', (c) => { c.checkpoint.trigger.integration_base = '0'.repeat(40); }, 'SG-11 integration base'],
  ['integration commit', (c) => { c.checkpoint.trigger.integration_commit = '0'.repeat(40); }, 'SG-11 integration commit'],
  ['integration tree', (c) => { c.checkpoint.trigger.integration_tree = '0'.repeat(40); }, 'SG-11 integration tree'],
  ['path count', (c) => { c.checkpoint.trigger.transition_paths.pop(); }, 'SG-11 transition path denominator'],
  ['path digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-11 transition path digest'],
  ['packet count', (c) => { c.checkpoint.trigger.wave_packets = 7; }, 'SG-11 trigger wave_packets'],
  ['unassigned count', (c) => { c.checkpoint.trigger.unassigned_packets = 7; }, 'SG-11 trigger unassigned_packets'],
  ['candidate self-award', (c) => { c.checkpoint.trigger.reviewer_candidates = 1; }, 'SG-11 trigger reviewer_candidates'],
  ['invitation self-award', (c) => { c.checkpoint.trigger.review_invitations = 1; }, 'SG-11 trigger review_invitations'],
  ['acceptance self-award', (c) => { c.checkpoint.trigger.accepted_assignments = 1; }, 'SG-11 trigger accepted_assignments'],
  ['review self-award', (c) => { c.checkpoint.trigger.valid_reviews = 1; }, 'SG-11 trigger valid_reviews'],
  ['second-party self-award', (c) => { c.checkpoint.trigger.second_party_reviewed_packets = 1; }, 'SG-11 trigger second_party_reviewed_packets'],
  ['adjudication self-award', (c) => { c.checkpoint.trigger.adjudicated_packets = 1; }, 'SG-11 trigger adjudicated_packets'],
  ['publication self-award', (c) => { c.checkpoint.trigger.publication_clearances = 1; }, 'SG-11 trigger publication_clearances'],
  ['graph self-award', (c) => { c.checkpoint.trigger.graph_effects = 1; }, 'SG-11 trigger graph_effects'],
  ['git receipt failure', (c) => { c.gitVerifier = () => ['integration path denominator drifted']; }, 'integration path denominator drifted'],
  ['live campaign status', (c) => { c.campaign.status = 'closed'; }, 'live campaign status'],
  ['live valid review', (c) => { c.campaign.counts.valid_reviews = 1; }, 'live campaign valid_reviews'],
  ['packet row removed', (c) => { c.packets.packets.pop(); }, 'packet registry denominator'],
  ['packet assigned', (c) => { c.packets.packets[0].assignment_state = 'accepted'; }, 'packet unassigned denominator'],
  ['candidate record', (c) => { c.candidates.records.push({}); }, 'candidate zero state'],
  ['response record', (c) => { c.responses.records.push({}); }, 'response zero state'],
  ['campaign digest', (c) => { c.campaignManifest.combined_sha256 = 'f'.repeat(64); }, 'campaign current release custody'],
  ['status digest', (c) => { c.statusManifest.combined_sha256 = 'f'.repeat(64); }, 'SSC current release custody'],
  ['POOF digest', (c) => { c.poofManifest.combined_sha256 = 'f'.repeat(64); }, 'POOF current release custody'],
  ['snapshot reviewed', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 21; }, 'SG-11 maintainer-reviewed count'],
  ['snapshot second-party', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.second_party_reviewed = 1; }, 'SG-11 second-party-reviewed count'],
  ['manifest drift', (c) => { c.manifest.entries[0].bytes += 1; }, 'SG-11 exact-byte manifest'],
  ['report identity', (c) => { c.report.checkpoint_id = 'OTHER'; }, 'SG-11 report identity'],
  ['report review count', (c) => { c.report.counts.valid_reviews = 1; }, 'SG-11 report valid-review count'],
  ['banner removed', (c) => { c.html = ''; }, 'SG-11 boundary banner missing'],
  ['boundary self-award', (c) => { c.checkpoint.boundaries.candidate_is_valid_review = true; }, 'SG-11 boundary candidate_is_valid_review'],
  ['adoption', (c) => { c.checkpoint.completion.maximum_verified_adoption = 'A1'; }, 'SG-11 adoption ceiling'],
  ['pilot', (c) => { c.checkpoint.completion.real_person_pilot_authorized = true; }, 'SG-11 pilot boundary'],
  ['completion', (c) => { c.checkpoint.completion.project_complete = true; }, 'SG-11 completion boundary']
];

const initial = validateSg11(base);
if (initial.length) {
  console.error(initial.join('\n'));
  process.exit(1);
}
for (const [name, mutate, expected] of cases) {
  const context = clone();
  mutate(context);
  const errors = validateSg11(context);
  if (!errors.some((error) => error.includes(expected))) {
    console.error(`${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
    process.exit(1);
  }
}
console.log(`project-stable-ground-sg11.test: ${cases.length} adversarial mutations PASS`);
