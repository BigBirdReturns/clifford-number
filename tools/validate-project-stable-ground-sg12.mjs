#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg12Manifest } from './build-project-stable-ground-sg12.mjs';
import { computeReleaseManifest as computeStatusSovereigntyManifest } from './build-status-sovereignty-compact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function commitPresent(sha) {
  return spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root }).status === 0;
}
function ensureCommits(entries, depth = 128) {
  const errors = [];
  const valid = [];
  for (const [sha, label] of entries) {
    if (!hex40.test(sha || '')) errors.push(`${label} is not a full commit SHA`);
    else valid.push([sha, label]);
  }
  const missing = [...new Set(valid.filter(([sha]) => !commitPresent(sha)).map(([sha]) => sha))];
  if (missing.length) {
    const refspecs = missing.map((sha) => `${sha}:refs/sg12-verify/${sha}`);
    const args = ['fetch', '--no-tags', '--no-write-fetch-head', `--depth=${depth}`, 'origin', ...refspecs];
    let fetched = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const firstDetail = (fetched.stderr || fetched.stdout || '').trim();
    if (fetched.status !== 0 && /shallow file has changed since we read it/i.test(firstDetail)) fetched = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (fetched.status !== 0) {
      const detail = (fetched.stderr || fetched.stdout || '').trim();
      for (const [sha, label] of valid) if (!commitPresent(sha)) errors.push(`${label} cannot be acquired: ${detail}`);
      return errors;
    }
  }
  for (const [sha, label] of valid) if (!commitPresent(sha)) errors.push(`${label} is unavailable after bounded acquisition`);
  return errors;
}
function gitText(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result.status === 0 ? result.stdout.trim() : null;
}
function defaultGitVerifier(trigger) {
  const errors = ensureCommits([
    [trigger.transition_base, 'candidate transition base'],
    [trigger.transition_commit, 'candidate transition commit']
  ]);
  if (errors.length) return errors;
  if (spawnSync('git', ['merge-base', '--is-ancestor', trigger.transition_base, trigger.transition_commit], { cwd: root }).status !== 0) errors.push('candidate transition is not descended from its declared base');
  const paths = (gitText(['diff', '--name-only', trigger.transition_base, trigger.transition_commit]) || '').split(/\n/).filter(Boolean).sort();
  if (JSON.stringify(paths) !== JSON.stringify([...trigger.transition_paths].sort())) errors.push('candidate transition path denominator drifted');
  const transitionManifestText = gitText(['show', `${trigger.transition_commit}:data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json`]);
  if (!transitionManifestText) errors.push('candidate transition campaign manifest unavailable');
  else {
    try {
      const transitionManifest = JSON.parse(transitionManifestText);
      if (transitionManifest.combined_sha256 !== trigger.transition_campaign_release_sha256) errors.push('candidate transition campaign digest drifted');
    } catch { errors.push('candidate transition campaign manifest is invalid JSON'); }
  }
  return errors;
}

export function loadSg12Context({ gitVerifier = defaultGitVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg12.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg11: read('data/project/project-stable-ground-sg11.json'),
    sg11Manifest: read('data/project/project-stable-ground-sg11-release-manifest.json'),
    campaign: read('data/project/status-sovereignty-wave-02-second-party-review-campaign.json'),
    packets: read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json'),
    candidates: read('data/research/status-sovereignty-wave-02-second-party-review-candidates.json'),
    responses: read('data/research/status-sovereignty-wave-02-second-party-review-responses.json'),
    campaignManifest: read('data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json'),
    statusManifest: read('data/project/status-sovereignty-release-manifest.json'),
    poofManifest: read('data/project/poof-clifford-ecology-release-manifest.json'),
    manifest: read('data/project/project-stable-ground-sg12-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg12/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg12/index.html'), 'utf8'),
    gitVerifier
  };
}

export function validateSg12(context = loadSg12Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg11, sg11Manifest, campaign, packets, candidates, responses, campaignManifest, statusManifest, poofManifest, manifest, report, html, gitVerifier } = context;
  const trigger = checkpoint.trigger;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-12 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-08-01-12', 'SG-12 identity');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-31-11', 'SG-12 predecessor');
  eq(checkpoint.supersedes?.merge_commit, '974b7a70cdc46828805f38bb4abe46aacd94380c', 'SG-11 merge receipt');
  eq(checkpoint.supersedes?.release_sha256, 'bd559144b5b12743312a2cc6fa233492542175b90be1a7f3e083e0156b4db9f2', 'SG-11 release receipt');
  eq(sg11.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-11 source identity');
  eq(sg11Manifest.combined_sha256, checkpoint.supersedes.release_sha256, 'SG-11 source custody');

  const expectedHistory = [
    'SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03', 'SG-2026-07-29-04',
    'SG-2026-07-30-05', 'SG-2026-07-30-06', 'SG-2026-07-30-07', 'SG-2026-07-30-08',
    'SG-2026-07-31-09', 'SG-2026-07-31-10', 'SG-2026-07-31-11', 'SG-2026-08-01-12'
  ];
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'SG-12 history order');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'SG-12 current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'SG-12 current checkpoint');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg12.json', 'SG-12 current path');
  eq(pointer.current_canonical_main_commit, trigger.transition_commit, 'SG-12 canonical transition pointer');
  const sg11Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-31-11');
  eq(sg11Row?.status, 'superseded_preserved', 'SG-11 historical status');
  eq(sg11Row?.merge_commit, checkpoint.supersedes.merge_commit, 'SG-11 historical merge receipt');
  const currentRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  eq(currentRow?.status, 'current', 'SG-12 pointer status');
  eq(currentRow?.trigger_commit, trigger.transition_commit, 'SG-12 pointer trigger receipt');
eq(currentRow?.transition_base, trigger.transition_base, 'SG-12 pointer transition base receipt');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor historical no-rewrite law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  eq(trigger.type, 'canonical_status_for_sovereignty_wave_02_candidate_discovery_wave_01', 'SG-12 trigger type');
  eq(trigger.issue, 571, 'SG-12 trigger issue');
  check(Number.isInteger(trigger.pull_request) && trigger.pull_request > 0, 'SG-12 trigger PR');
  eq(trigger.campaign_id, 'SSC-W02-SPR01', 'SG-12 campaign identity');
  eq(trigger.candidate_wave_id, 'SSC-W02-CD01', 'SG-12 candidate wave identity');
  check(hex40.test(trigger.transition_base || ''), 'SG-12 transition base format');
  check(hex40.test(trigger.transition_commit || ''), 'SG-12 transition commit format');
  eq(trigger.transition_paths_sha256, sha256(`${trigger.transition_paths.join('\n')}\n`), 'SG-12 transition path digest');
  for (const [key, expected] of Object.entries({
    wave_packets: 8,
    maintainer_reviewed_packets: 8,
    unassigned_packets: 8,
    reviewer_candidates: 8,
    screened_ineligible: 2,
    review_invitations: 0,
    accepted_assignments: 0,
    valid_reviews: 0,
    second_party_reviewed_packets: 0,
    adjudicated_packets: 0,
    publication_clearances: 0,
    graph_effects: 0
  })) eq(trigger[key], expected, `SG-12 trigger ${key}`);
  for (const key of ['transition_campaign_release_sha256', 'checkpoint_campaign_release_sha256', 'checkpoint_status_release_sha256', 'checkpoint_poof_release_sha256', 'candidate_registry_sha256']) check(hex64.test(trigger[key] || ''), `SG-12 ${key} format`);
  for (const error of gitVerifier(trigger)) errors.push(error);

  eq(campaign.status, 'open_candidate_discovery_wave_01_eight_uncontacted_zero_external_receipts', 'live campaign status');
  eq(campaign.counts?.reviewer_candidates, 8, 'live campaign candidate count');
  eq(campaign.counts?.ineligible, 2, 'live campaign ineligible count');
  eq(campaign.counts?.invitations, 0, 'live campaign invitation zero');
  eq(campaign.counts?.valid_reviews, 0, 'live campaign review zero');
  eq(packets.packets?.length, 8, 'packet registry denominator');
  eq(packets.packets?.filter((row) => row.assignment_state === 'unassigned').length, 8, 'packet unassigned denominator');
  eq(candidates.records?.length, 8, 'candidate record denominator');
  eq(candidates.failure_denominator?.length, 2, 'candidate failure denominator');
  eq(candidates.records?.filter((row) => row.candidate_state === 'candidate_only_uncontacted').length, 8, 'candidate-only denominator');
  eq(candidates.records?.filter((row) => row.invitation_authorized === false).length, 8, 'candidate invitation hold');
  eq(responses.records?.length, 0, 'response zero state');
  eq(campaignManifest.combined_sha256, trigger.checkpoint_campaign_release_sha256, 'campaign current release custody');
  eq(trigger.checkpoint_status_release_sha256, checkpoint.authority_change?.status_release_sha256, 'SSC historical checkpoint custody');
  eq(JSON.stringify(statusManifest), JSON.stringify(computeStatusSovereigntyManifest()), 'SSC current release exact-byte manifest');
  eq(poofManifest.combined_sha256, trigger.checkpoint_poof_release_sha256, 'POOF current release custody');
  eq(sha256(fs.readFileSync(path.join(root, 'data/research/status-sovereignty-wave-02-second-party-review-candidates.json'))), trigger.candidate_registry_sha256, 'candidate registry exact-byte custody');
  eq(checkpoint.canonical_main?.commit, trigger.transition_commit, 'SG-12 canonical transition commit');

  const snapshot = checkpoint.canonical_snapshot?.status_sovereignty;
  eq(snapshot?.wave_02_reviewer_candidates, 8, 'SG-12 snapshot candidate count');
  eq(snapshot?.wave_02_screened_ineligible, 2, 'SG-12 snapshot ineligible count');
  eq(snapshot?.wave_02_review_invitations, 0, 'SG-12 snapshot invitation zero');
  eq(snapshot?.wave_02_valid_reviews, 0, 'SG-12 snapshot review zero');
  eq(snapshot?.second_party_reviewed, 0, 'SG-12 second-party-reviewed zero');
  eq(snapshot?.adjudicated, 0, 'SG-12 adjudication zero');
  eq(snapshot?.graph_effect, 'none', 'SG-12 snapshot graph state');

  const expectedManifest = computeSg12Manifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'SG-12 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg12-report@1', 'SG-12 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-12 report identity');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-12 report release digest');
  eq(report.counts?.reviewer_candidates, 8, 'SG-12 report candidate count');
  eq(report.counts?.screened_ineligible, 2, 'SG-12 report ineligible count');
  eq(report.counts?.valid_reviews, 0, 'SG-12 report review zero');
  check(html.includes('8/8 PACKETS FROZEN · 8 CANDIDATE-ONLY · 2 SCREENED INELIGIBLE · 0 INVITATIONS · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · ADOPTION A0'), 'SG-12 boundary banner missing');
  check(html.includes(manifest.combined_sha256), 'SG-12 release digest missing from HTML');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-12 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-12 boundary ${key}`);
  }
  eq(checkpoint.completion?.valid_external_reviews, 0, 'SG-12 completion review zero');
  eq(checkpoint.completion?.invitations_sent, 0, 'SG-12 completion invitation zero');
  eq(checkpoint.completion?.maximum_verified_adoption, 'A0', 'SG-12 adoption ceiling');
  eq(checkpoint.completion?.project_complete, false, 'SG-12 project completion boundary');
  return errors;
}

function main() {
  const errors = validateSg12();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg12: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg12: PASS');
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
