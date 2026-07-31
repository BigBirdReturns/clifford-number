#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg07Context, validateSg07 } from '../tools/validate-project-stable-ground-sg07.mjs';

const clean = loadSg07Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg07(clean), [], 'clean current SG-07 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)])
);

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[6].checkpoint_id = 'SG-2026-07-30-06'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove source-review trigger', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('source-review')); }, 'governor missing source-review trigger'],
  ['rewrite correction mode', (c) => { c.governor.checkpoint_contract.correction_mode = 'overwrite'; }, 'governor correction mode'],
  ['rewrite SG-06 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-06 preservation'],
  ['rewrite SG-06 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-06 merge receipt'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-07 transition path denominator'],
  ['rewrite transition digest', (c) => { c.checkpoint.trigger.transition_paths_sha256 = 'f'.repeat(64); }, 'SG-07 transition path digest'],
  ['rewrite review identity', (c) => { c.checkpoint.trigger.review_id = 'SSC-W01-MR99'; }, 'SG-07 review identity'],
  ['inflate trigger maintainer review', (c) => { c.checkpoint.trigger.maintainer_reviewed = 15; }, 'SG-07 maintainer review count'],
  ['self-award trigger second-party review', (c) => { c.checkpoint.trigger.second_party_reviewed = 14; }, 'SG-07 second-party review count'],
  ['self-award trigger adjudication', (c) => { c.checkpoint.trigger.adjudicated = 14; }, 'SG-07 adjudication count'],
  ['change trigger dispositions', (c) => { c.checkpoint.trigger.disposition_changes = 1; }, 'SG-07 disposition-change count'],
  ['rewrite current pointer', (c) => { c.pointer.current_checkpoint_id = 'SG-2026-07-30-06'; }, 'current checkpoint after SG-06'],
  ['rewrite current path', (c) => { c.pointer.current_checkpoint_path = 'data/project/project-stable-ground-sg06.json'; }, 'pointer current path'],
  ['rewrite historical SG-06 status', (c) => { c.pointer.history[5].status = 'current'; c.pointer.history[6].status = 'superseded_preserved'; }, 'historical SG-06 pointer status'],
  ['rewrite historical SG-06 receipt', (c) => { c.pointer.history[5].merge_commit = 'f'.repeat(40); }, 'historical SG-06 pointer merge receipt'],
  ['inflate frozen observations', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.records_retained = 15; }, 'frozen SSC retained count'],
  ['erase frozen maintainer review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.maintainer_reviewed = 0; }, 'frozen maintainer review count'],
  ['self-award frozen second-party review', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.second_party_reviewed = 14; }, 'frozen second-party review count'],
  ['self-award frozen adjudication', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.adjudicated = 14; }, 'frozen adjudication count'],
  ['promote frozen complete compact', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.complete_compact_findings = 1; }, 'frozen complete compact count'],
  ['erase effective counterpower controls', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.dispositions.effective_counterpower_controls = 0; }, 'frozen effective-counterpower control count'],
  ['erase industrial policy controls', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.dispositions.ordinary_industrial_policy_controls = 0; }, 'frozen industrial-policy control count'],
  ['erase open acquisitions', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.dispositions.requires_additional_acquisition = 0; }, 'frozen acquisition count'],
  ['promote frozen prevalence', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.prevalence_finding_generated = true; }, 'frozen SSC prevalence_finding_generated'],
  ['promote frozen racial order', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.racial_order_finding_generated = true; }, 'frozen SSC racial_order_finding_generated'],
  ['promote frozen coordination', (c) => { c.checkpoint.canonical_snapshot.status_sovereignty.coordination_finding_generated = true; }, 'frozen SSC coordination_finding_generated'],
  ['deploy frozen POOF', (c) => { c.checkpoint.canonical_snapshot.poof.deployed = true; }, 'frozen POOF deployment'],
  ['advance frozen adoption', (c) => { c.checkpoint.canonical_snapshot.sprint_09.maximum_verified_adoption_level = 'A1'; }, 'frozen adoption ceiling'],
  ['authorize frozen pilot', (c) => { c.checkpoint.canonical_snapshot.sprint_09.real_person_pilot_authorized = true; }, 'frozen pilot state'],
  ['create graph effect', (c) => { c.checkpoint.boundaries.graph_effect = 'edge'; }, 'SG-07 boundary graph_effect'],
  ['drop lane review count', (c) => { c.checkpoint.fanout_state.ssc_lanes.find((row) => row.lane_id === 'SSC-F05').maintainer_reviewed_records = 0; }, 'SG-07 lane maintainer-review denominator'],
  ['promote lane second party', (c) => { c.checkpoint.fanout_state.ssc_lanes.find((row) => row.lane_id === 'SSC-F05').second_party_reviewed_records = 1; }, 'SG-07 lane second-party denominator'],
  ['drift FAN-07 state', (c) => { c.checkpoint.fanout_state.owner_lanes.find((row) => row.lane_id === 'FAN-07').state = 'complete'; }, 'FAN-07 state'],
  ['change review dispositions', (c) => { c.checkpoint.fanout_state.maintainer_review.disposition_changes = 1; }, 'SG-07 review disposition changes'],
  ['erase live maintainer review', (c) => { c.status.current_state.maintainer_reviewed_observations = 0; }, 'live SSC maintainer review count'],
  ['self-award live second party', (c) => { c.status.current_state.second_party_reviewed_observations = 14; }, 'live SSC second-party review count'],
  ['self-award live adjudication', (c) => { c.review.counts.adjudicated = 14; }, 'live review adjudication count'],
  ['drift live effective control count', (c) => { c.review.counts.effective_counterpower_controls = 1; }, 'live review effective-counterpower controls'],
  ['drift Wave release digest', (c) => { c.waveRelease.combined_sha256 = 'f'.repeat(64); }, 'live Wave 01 release digest'],
  ['drift review release digest', (c) => { c.reviewRelease.combined_sha256 = 'f'.repeat(64); }, 'live maintainer-review release digest'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-07 exact-byte manifest'],
  ['fail transition custody', (c) => { c.transitionVerifier = () => ['SG-07 transition path denominator drift']; }, 'SG-07 transition path denominator drift'],
  ['fail historical custody', (c) => { c.historicalVerifier = () => ['historical SG-06 bytes drifted from merge receipt']; }, 'historical SG-06 bytes drifted']
];

for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg07(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg07.test: ${mutations.length} adversarial mutations PASS`);
