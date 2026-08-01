#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg11Manifest } from './build-project-stable-ground-sg11.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;

function ensureCommit(sha, label, depth = 128) {
  if (!hex40.test(sha || '')) return [`${label} is not a full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', `--depth=${depth}`, 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function gitText(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result.status === 0 ? result.stdout.trim() : null;
}

function defaultGitVerifier(trigger) {
  const errors = [];
  for (const [sha, label] of [
    [trigger.transition_base, 'campaign transition base'],
    [trigger.transition_commit, 'campaign transition commit'],
    [trigger.integration_base, 'integration base'],
    [trigger.integration_commit, 'integration commit']
  ]) errors.push(...ensureCommit(sha, label));
  if (errors.length) return errors;

  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', trigger.transition_base, trigger.transition_commit], { cwd: root });
  if (ancestry.status !== 0) errors.push('campaign transition is not descended from its declared base');
  const parents = gitText(['show', '-s', '--format=%P', trigger.integration_commit]);
  if (parents !== `${trigger.integration_base} ${trigger.transition_commit}`) errors.push(`integration parents drifted: ${parents}`);
  const tree = gitText(['show', '-s', '--format=%T', trigger.integration_commit]);
  if (tree !== trigger.integration_tree) errors.push(`integration tree drifted: ${tree}`);
  const transitionPaths = (gitText(['diff', '--name-only', trigger.transition_base, trigger.transition_commit]) || '').split(/\n/).filter(Boolean).sort();
  if (JSON.stringify(transitionPaths) !== JSON.stringify([...trigger.transition_paths].sort())) errors.push('campaign transition path denominator drifted');
  const integrationPaths = (gitText(['diff', '--name-only', trigger.integration_base, trigger.integration_commit]) || '').split(/\n/).filter(Boolean).sort();
  if (JSON.stringify(integrationPaths) !== JSON.stringify([...trigger.transition_paths].sort())) errors.push('integration path denominator drifted');
  const transitionManifestText = gitText(['show', `${trigger.transition_commit}:data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json`]);
  if (!transitionManifestText) errors.push('campaign transition release manifest unavailable');
  else {
    try {
      const transitionManifest = JSON.parse(transitionManifestText);
      if (transitionManifest.combined_sha256 !== trigger.transition_campaign_release_sha256) errors.push('campaign transition release digest drifted');
    } catch { errors.push('campaign transition release manifest is not valid JSON'); }
  }
  return errors;
}

export function loadSg11Context({ gitVerifier = defaultGitVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg11.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg10: read('data/project/project-stable-ground-sg10.json'),
    sg10Manifest: read('data/project/project-stable-ground-sg10-release-manifest.json'),
    campaign: read('data/project/status-sovereignty-wave-02-second-party-review-campaign.json'),
    packets: read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json'),
    candidates: read('data/research/status-sovereignty-wave-02-second-party-review-candidates.json'),
    responses: read('data/research/status-sovereignty-wave-02-second-party-review-responses.json'),
    campaignManifest: read('data/project/status-sovereignty-wave-02-second-party-review-release-manifest.json'),
    statusManifest: read('data/project/status-sovereignty-release-manifest.json'),
    poofManifest: read('data/project/poof-clifford-ecology-release-manifest.json'),
    manifest: read('data/project/project-stable-ground-sg11-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg11/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg11/index.html'), 'utf8'),
    gitVerifier
  };
}

export function validateSg11(context = loadSg11Context()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { checkpoint, pointer, governor, sg10, sg10Manifest, campaign, packets, candidates, responses, campaignManifest, statusManifest, poofManifest, manifest, report, html, gitVerifier } = context;
  const trigger = checkpoint.trigger;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-11 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-11', 'SG-11 identity');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-31-10', 'SG-11 predecessor');
  eq(checkpoint.supersedes?.merge_commit, 'b952da00932012be409c63554d6c81f8367723cb', 'SG-10 merge receipt');
  eq(checkpoint.supersedes?.release_sha256, '33e94ab2d918a2338f61e3b921052aae133726a3d86c7cab81411f14b9ac6c53', 'SG-10 release receipt');
  eq(sg10.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-10 source identity');
  eq(sg10Manifest.combined_sha256, checkpoint.supersedes.release_sha256, 'SG-10 source custody');

  const expectedHistory = [
    'SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03', 'SG-2026-07-29-04',
    'SG-2026-07-30-05', 'SG-2026-07-30-06', 'SG-2026-07-30-07', 'SG-2026-07-30-08',
    'SG-2026-07-31-09', 'SG-2026-07-31-10', 'SG-2026-07-31-11'
  ];
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'SG-11 history order');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'SG-11 current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'SG-11 current checkpoint');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg11.json', 'SG-11 current path');
  eq(pointer.current_canonical_main_commit, trigger.integration_commit, 'SG-11 current integration receipt');
  const sg10Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-31-10');
  eq(sg10Row?.status, 'superseded_preserved', 'SG-10 historical status');
  eq(sg10Row?.merge_commit, checkpoint.supersedes.merge_commit, 'SG-10 historical merge receipt');
  const currentRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  eq(currentRow?.status, 'current', 'SG-11 pointer status');
  eq(currentRow?.trigger_commit, trigger.transition_commit, 'SG-11 pointer trigger receipt');
  eq(currentRow?.integration_commit, trigger.integration_commit, 'SG-11 pointer integration receipt');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor historical no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  eq(trigger.type, 'canonical_status_for_sovereignty_wave_02_second_party_review_campaign_zero_state', 'SG-11 trigger type');
  eq(trigger.issue, 571, 'SG-11 trigger issue');
  eq(trigger.pull_request, 576, 'SG-11 trigger PR');
  eq(trigger.campaign_id, 'SSC-W02-SPR01', 'SG-11 campaign identity');
  eq(trigger.transition_base, 'b952da00932012be409c63554d6c81f8367723cb', 'SG-11 transition base');
  eq(trigger.transition_commit, '04649fafcc517c0d7eef6279818dd309366eb49b', 'SG-11 transition commit');
  eq(trigger.integration_base, 'd2645764bf8a6cd3bd1cd9572ecc7c78bb2795eb', 'SG-11 integration base');
  eq(trigger.integration_commit, '1116ca68fe79c7b6605dee491877a3c733da5e36', 'SG-11 integration commit');
  eq(trigger.integration_tree, 'dae51a75a74047f994ac9f823c269aee5dec5b2f', 'SG-11 integration tree');
  eq(trigger.transition_paths?.length, 20, 'SG-11 transition path denominator');
  eq(trigger.transition_paths_sha256, '71e00e76d3a183d3fd35224ec115832eec00563c2dcacc934b7e5a6a72509797', 'SG-11 transition path digest');

  for (const [key, expected] of Object.entries({
    wave_packets: 8,
    maintainer_reviewed_packets: 8,
    unassigned_packets: 8,
    reviewer_candidates: 0,
    review_invitations: 0,
    accepted_assignments: 0,
    valid_reviews: 0,
    second_party_reviewed_packets: 0,
    adjudicated_packets: 0,
    canonical_disposition_changes: 0,
    publication_clearances: 0,
    graph_effects: 0
  })) eq(trigger[key], expected, `SG-11 trigger ${key}`);
  for (const key of ['transition_campaign_release_sha256', 'checkpoint_campaign_release_sha256', 'checkpoint_status_release_sha256', 'checkpoint_poof_release_sha256', 'packet_registry_sha256']) check(hex64.test(trigger[key] || ''), `SG-11 ${key} format`);
  for (const error of gitVerifier(trigger)) errors.push(error);

  eq(campaign.campaign_id, 'SSC-W02-SPR01', 'live campaign identity');
  eq(campaign.issue, 571, 'live campaign issue');
  eq(campaign.status, 'open_zero_external_receipts', 'live campaign status');
  for (const [key, expected] of Object.entries({
    wave_packets: 8,
    maintainer_reviewed_packets: 8,
    unassigned_packets: 8,
    reviewer_candidates: 0,
    invitations: 0,
    accepted_assignments: 0,
    valid_reviews: 0,
    second_party_reviewed_packets: 0,
    adjudicated_packets: 0,
    canonical_disposition_changes: 0,
    publication_clearances: 0,
    graph_effects: 0
  })) eq(campaign.counts?.[key], expected, `live campaign ${key}`);
  eq(packets.packets?.length, 8, 'packet registry denominator');
  eq(packets.packets?.filter((row) => row.assignment_state === 'unassigned').length, 8, 'packet unassigned denominator');
  eq(packets.packets?.filter((row) => row.valid_review_count === 0).length, 8, 'packet zero-review denominator');
  eq(candidates.records?.length, 0, 'candidate zero state');
  eq(responses.records?.length, 0, 'response zero state');
  eq(campaignManifest.combined_sha256, trigger.checkpoint_campaign_release_sha256, 'campaign current release custody');
  eq(statusManifest.combined_sha256, trigger.checkpoint_status_release_sha256, 'SSC current release custody');
  eq(poofManifest.combined_sha256, trigger.checkpoint_poof_release_sha256, 'POOF current release custody');
  eq(checkpoint.authority_change?.campaign_release_sha256, campaignManifest.combined_sha256, 'authority campaign custody');
  eq(checkpoint.authority_change?.status_release_sha256, statusManifest.combined_sha256, 'authority status custody');
  eq(checkpoint.authority_change?.poof_release_sha256, poofManifest.combined_sha256, 'authority POOF custody');
  eq(checkpoint.canonical_main?.commit, trigger.integration_commit, 'SG-11 canonical integration commit');

  const snapshot = checkpoint.canonical_snapshot?.status_sovereignty;
  eq(snapshot?.records_retained, 22, 'SG-11 retained observation count');
  eq(snapshot?.maintainer_reviewed, 22, 'SG-11 maintainer-reviewed count');
  eq(snapshot?.second_party_reviewed, 0, 'SG-11 second-party-reviewed count');
  eq(snapshot?.adjudicated, 0, 'SG-11 adjudicated count');
  eq(snapshot?.open_acquisition_obligations, 6, 'SG-11 acquisition denominator');
  eq(snapshot?.wave_02_external_review_packets, 8, 'SG-11 campaign packet count');
  eq(snapshot?.wave_02_unassigned_packets, 8, 'SG-11 campaign unassigned count');
  eq(snapshot?.wave_02_valid_reviews, 0, 'SG-11 campaign valid-review count');
  eq(snapshot?.graph_effect, 'none', 'SG-11 snapshot graph state');

  const expectedManifest = computeSg11Manifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'SG-11 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg11-report@1', 'SG-11 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-11 report identity');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-11 report release digest');
  eq(report.counts?.wave_packets, 8, 'SG-11 report packet count');
  eq(report.counts?.unassigned_packets, 8, 'SG-11 report unassigned count');
  eq(report.counts?.valid_reviews, 0, 'SG-11 report valid-review count');
  eq(report.counts?.adjudicated_packets, 0, 'SG-11 report adjudication count');
  check(html.includes('8/8 PACKETS FROZEN · 8/8 UNASSIGNED · 0 CANDIDATES · 0 INVITATIONS · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · ADOPTION A0'), 'SG-11 boundary banner missing');
  check(html.includes(manifest.combined_sha256), 'SG-11 release digest missing from HTML');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-11 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-11 boundary ${key}`);
  }
  eq(checkpoint.completion?.valid_external_reviews, 0, 'SG-11 completion review count');
  eq(checkpoint.completion?.adjudications, 0, 'SG-11 completion adjudication count');
  eq(checkpoint.completion?.maximum_verified_adoption, 'A0', 'SG-11 adoption ceiling');
  eq(checkpoint.completion?.real_person_pilot_authorized, false, 'SG-11 pilot boundary');
  eq(checkpoint.completion?.project_complete, false, 'SG-11 completion boundary');
  return errors;
}

function main() {
  const errors = validateSg11();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg11: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg11: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
