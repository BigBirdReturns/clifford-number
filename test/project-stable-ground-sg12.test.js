#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg12Context, validateSg12 } from '../tools/validate-project-stable-ground-sg12.mjs';
const base = loadSg12Context({ gitVerifier: () => [] });
const clone = () => {
  const { gitVerifier, ...data } = base;
  return { ...structuredClone(data), gitVerifier };
};
assert.deepEqual(validateSg12(base), []);
const cases = [
  ['identity', (c) => { c.checkpoint.checkpoint_id = 'OTHER'; }],
  ['predecessor', (c) => { c.checkpoint.supersedes.checkpoint_id = 'OTHER'; }],
  ['predecessor digest', (c) => { c.checkpoint.supersedes.release_sha256 = '0'.repeat(64); }],
  ['history', (c) => { c.pointer.history.pop(); }],
  ['current pointer', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-31-11'; }],
  ['canonical pointer', (c) => { c.pointer.current_canonical_main_commit = '0'.repeat(40); }],
  ['SG-11 historical state', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-07-31-11').status = 'current'; }],
  ['SG-12 state', (c) => { c.pointer.history.find((r) => r.checkpoint_id === 'SG-2026-08-01-12').status = 'superseded_preserved'; }],
  ['governor', (c) => { c.governor.history_law.append_only = false; }],
  ['trigger type', (c) => { c.checkpoint.trigger.type = 'other'; }],
  ['candidate wave', (c) => { c.checkpoint.trigger.candidate_wave_id = 'OTHER'; }],
  ['PR', (c) => { c.checkpoint.trigger.pull_request = 0; }],
  ['transition base', (c) => { c.checkpoint.trigger.transition_base = '0'.repeat(40); }],
  ['transition commit', (c) => { c.checkpoint.trigger.transition_commit = '0'.repeat(40); }],
  ['path digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = '0'.repeat(64); }],
  ['candidate count', (c) => { c.checkpoint.trigger.reviewer_candidates = 7; }],
  ['ineligible count', (c) => { c.checkpoint.trigger.screened_ineligible = 1; }],
  ['invitation self-award', (c) => { c.checkpoint.trigger.review_invitations = 1; }],
  ['review self-award', (c) => { c.checkpoint.trigger.valid_reviews = 1; }],
  ['git receipt', (c) => { c.gitVerifier = () => ['candidate transition path denominator drifted']; }],
  ['campaign status', (c) => { c.campaign.status = 'complete'; }],
  ['candidate removed', (c) => { c.candidates.records.pop(); }],
  ['candidate contacted', (c) => { c.candidates.records[0].candidate_state = 'invited'; }],
  ['candidate invitation authority', (c) => { c.candidates.records[0].invitation_authorized = true; }],
  ['failure removed', (c) => { c.candidates.failure_denominator.pop(); }],
  ['response invented', (c) => { c.responses.records.push({}); }],
  ['campaign digest', (c) => { c.campaignManifest.combined_sha256 = '0'.repeat(64); }],
  ['status digest', (c) => { c.statusManifest.combined_sha256 = '0'.repeat(64); }],
  ['historical status receipt', (c) => { c.checkpoint.trigger.checkpoint_status_release_sha256 = '0'.repeat(64); }],
  ['POOF digest', (c) => { c.poofManifest.combined_sha256 = '0'.repeat(64); }],
  ['snapshot candidate', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.wave_02_reviewer_candidates = 7; }],
  ['snapshot review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.wave_02_valid_reviews = 1; }],
  ['manifest drift', (c) => { c.manifest.entries[0].bytes += 1; }],
  ['report identity', (c) => { c.report.checkpoint_id = 'OTHER'; }],
  ['report count', (c) => { c.report.counts.reviewer_candidates = 7; }],
  ['banner', (c) => { c.html = ''; }],
  ['candidate boundary', (c) => { c.checkpoint.boundaries.candidate_is_valid_review = true; }],
  ['invitation boundary', (c) => { c.checkpoint.boundaries.checkpoint_authorizes_invitation = true; }],
  ['adoption', (c) => { c.checkpoint.completion.maximum_verified_adoption = 'A1'; }],
  ['completion', (c) => { c.checkpoint.completion.project_complete = true; }]
];
for (const [name, mutate] of cases) {
  const context = clone();
  mutate(context);
  assert.ok(validateSg12(context).length > 0, name);
}
console.log(`project-stable-ground-sg12.test: ${cases.length} adversarial mutations PASS`);
