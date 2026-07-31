#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg09Context, validateSg09 } from '../tools/validate-project-stable-ground-sg09.mjs';

const clean = loadSg09Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg09(clean), [], 'clean SG-09 checkpoint must validate under injected transition custody');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['checkpoint identity', (c) => { c.checkpoint.checkpoint_id = 'SG-OTHER'; }, 'SG-09 checkpoint identity'],
  ['predecessor identity', (c) => { c.checkpoint.supersedes.checkpoint_id = 'SG-2026-07-30-07'; }, 'SG-09 predecessor'],
  ['predecessor merge receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-08 merge receipt'],
  ['predecessor release receipt', (c) => { c.checkpoint.supersedes.release_sha256 = 'f'.repeat(64); }, 'SG-08 release receipt'],
  ['predecessor preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-08 preservation'],
  ['pointer history reorder', (c) => { c.pointer.history.reverse(); }, 'SG-09 pointer history order'],
  ['pointer duplicate', (c) => { c.pointer.history[8].checkpoint_id = 'SG-2026-07-30-08'; }, 'SG-09 pointer history order'],
  ['pointer current count', (c) => { c.pointer.history[7].status = 'current'; }, 'SG-09 pointer current-state denominator'],
  ['pointer current checkpoint', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-30-08'; }, 'SG-09 current checkpoint'],
  ['pointer SG08 status', (c) => { c.pointer.history[7].status = 'current'; c.pointer.history[8].status = 'superseded_preserved'; }, 'SG-08 historical pointer status'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['allow history rewrite', (c) => { c.governor.history_law.historical_data_and_reports_rewritten = true; }, 'governor no-rewrite law'],
  ['allow manifest recompute', (c) => { c.governor.history_law.historical_release_manifests_recomputed = true; }, 'governor historical manifest law'],
  ['trigger type', (c) => { c.checkpoint.trigger.type = 'publication'; }, 'SG-09 trigger type'],
  ['trigger issue', (c) => { c.checkpoint.trigger.issue = 999; }, 'SG-09 trigger issue'],
  ['trigger campaign', (c) => { c.checkpoint.trigger.campaign_id = 'OTHER'; }, 'SG-09 campaign identity'],
  ['transition base', (c) => { c.checkpoint.trigger.transition_base = 'f'.repeat(40); }, 'SG-09 transition base'],
  ['transition commit', (c) => { c.checkpoint.trigger.transition_commit = 'e'.repeat(40); }, 'SG-09 transition commit'],
  ['transition paths removed', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-09 transition path denominator'],
  ['transition path digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-09 transition path digest'],
  ['trigger packet count', (c) => { c.checkpoint.trigger.wave_packets = 13; }, 'SG-09 packet count'],
  ['trigger assignment invented', (c) => { c.checkpoint.trigger.unassigned_packets = 13; }, 'SG-09 unassigned count'],
  ['trigger candidate invented', (c) => { c.checkpoint.trigger.reviewer_candidates = 1; }, 'SG-09 trigger reviewer_candidates'],
  ['trigger review invented', (c) => { c.checkpoint.trigger.valid_reviews = 1; }, 'SG-09 trigger valid_reviews'],
  ['transition custody failure', (c) => { c.transitionVerifier = () => ['SG-09 transition campaign state drift']; }, 'transition campaign state drift'],
  ['historical custody failure', (c) => { c.historicalVerifier = () => ['historical SG-08 bytes drifted from merge receipt: checkpoint']; }, 'historical SG-08 bytes drifted'],
  ['live campaign identity', (c) => { c.campaign.campaign_id = 'OTHER'; }, 'Live campaign identity'],
  ['live campaign candidate', (c) => { c.campaign.counts.reviewer_candidates = 1; }, 'Live campaign candidate count'],
  ['live campaign review', (c) => { c.campaign.counts.valid_reviews = 1; }, 'Live campaign valid-review count'],
  ['live campaign adjudication', (c) => { c.campaign.counts.adjudicated_packets = 1; }, 'Live campaign adjudication count'],
  ['live campaign publication', (c) => { c.campaign.counts.publication_clearances = 1; }, 'Live campaign publication count'],
  ['live packet denominator', (c) => { c.packets.counts.packet_denominator = 13; }, 'Live packet denominator'],
  ['live packet assigned', (c) => { c.packets.packets[0].assignment.state = 'accepted'; }, 'Live packet assignment drift'],
  ['candidate row invented', (c) => { c.candidates.records.push({ candidate_id: 'SSC-REVIEWER-0001' }); }, 'Live candidate registry zero state'],
  ['response row invented', (c) => { c.responses.records.push({ review_id: 'SSC-REVIEW-0001' }); }, 'Live response registry zero state'],
  ['campaign manifest drift', (c) => { c.campaignManifest.combined_sha256 = 'f'.repeat(64); }, 'Live campaign exact-byte manifest'],
  ['live campaign custody drift', (c) => { c.checkpoint.authority_change.campaign_release_sha256 = 'f'.repeat(64); }, 'SG-09 live campaign release custody'],
  ['snapshot review invented', (c) => { c.checkpoint.canonical_snapshot.second_party_review_campaign.valid_reviews = 1; }, 'SG-09 snapshot valid-review count'],
  ['snapshot SSC review invented', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.second_party_reviewed = 1; }, 'SG-09 snapshot SSC second-party count'],
  ['snapshot K0 event invented', (c) => { c.checkpoint.canonical_snapshot.k0.included_events = 1; }, 'SG-09 snapshot K0 events'],
  ['snapshot POOF deployed', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'SG-09 snapshot POOF deployment'],
  ['boundary graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-09 boundary graph_effect'],
  ['SG09 manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'SG-09 exact-byte manifest'],
  ['report count drift', (c) => { c.report.counts.valid_reviews = 1; }, 'SG-09 report valid-review count'],
  ['report banner removed', (c) => { c.html = c.html.replace('0 VALID REVIEWS', '1 VALID REVIEW'); }, 'SG-09 report boundary banner missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg09(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}

console.log(`project-stable-ground-sg09.test: ${mutations.length} adversarial mutations PASS`);
