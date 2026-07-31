#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeSg09Manifest } from './build-project-stable-ground-sg09.mjs';
import { computeSecondPartyReviewManifest } from './build-status-sovereignty-wave-01-second-party-review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readBytes = (rel) => fs.readFileSync(path.join(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hex40 = /^[0-9a-f]{40}$/;
const hex64 = /^[0-9a-f]{64}$/;

function ensureCommit(sha, label, depth = 5) {
  if (!hex40.test(sha || '')) return [`${label} is not a full commit SHA`];
  const present = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (present.status === 0) return [];
  const fetched = spawnSync('git', ['fetch', '--no-tags', `--depth=${depth}`, 'origin', sha], { cwd: root, encoding: 'utf8' });
  if (fetched.status !== 0) return [`${label} cannot be acquired: ${(fetched.stderr || fetched.stdout || '').trim()}`];
  const retry = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return retry.status === 0 ? [] : [`${label} is unavailable after bounded acquisition`];
}

function showBytes(commit, rel, label, errors) {
  const result = spawnSync('git', ['show', `${commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    errors.push(`SG-09 transition cannot recover ${label}`);
    return null;
  }
  return result.stdout;
}

function showJson(commit, rel, label, errors) {
  const bytes = showBytes(commit, rel, label, errors);
  if (!bytes) return null;
  try { return JSON.parse(bytes.toString('utf8')); }
  catch {
    errors.push(`SG-09 transition ${label} is not valid JSON`);
    return null;
  }
}

function defaultTransitionVerifier(checkpoint) {
  const errors = [];
  const { transition_commit: transition, transition_base: base, transition_paths: declared } = checkpoint.trigger;
  errors.push(...ensureCommit(base, 'SG-09 transition base', 3));
  errors.push(...ensureCommit(transition, 'SG-09 transition commit', 6));
  if (errors.length) return errors;
  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, transition], { cwd: root, encoding: 'utf8' });
  if (ancestry.status !== 0) errors.push('SG-09 transition commit is not descended from its declared base');
  const changed = spawnSync('git', ['diff', '--name-only', base, transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (changed.status !== 0) errors.push('SG-09 transition path denominator cannot be recovered');
  else {
    const observed = changed.stdout.trim().split('\n').filter(Boolean).sort();
    const expected = [...declared].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push(`SG-09 transition path denominator drift: ${JSON.stringify(observed)}`);
    if (sha256(`${declared.join('\n')}\n`) !== checkpoint.trigger.transition_paths_sha256) errors.push('SG-09 transition path digest drift');
  }

  const campaignBytes = showBytes(transition, 'data/project/status-sovereignty-wave-01-second-party-review-campaign.json', 'campaign object', errors);
  const packetBytes = showBytes(transition, 'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json', 'packet registry', errors);
  const workflowBytes = showBytes(transition, '.github/workflows/status-sovereignty-wave-01-second-party-review.yml', 'campaign workflow', errors);
  const campaign = campaignBytes ? JSON.parse(campaignBytes.toString('utf8')) : null;
  const packets = packetBytes ? JSON.parse(packetBytes.toString('utf8')) : null;
  const release = showJson(transition, 'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json', 'campaign release manifest', errors);

  if (campaign && (
    campaign.campaign_id !== 'SSC-W01-SPR01' ||
    campaign.status !== 'campaign_infrastructure_complete_zero_external_receipts' ||
    campaign.counts?.wave_packets !== 14 ||
    campaign.counts?.maintainer_reviewed_packets !== 14 ||
    campaign.counts?.second_party_reviewed_packets !== 0 ||
    campaign.counts?.adjudicated_packets !== 0 ||
    campaign.counts?.reviewer_candidates !== 0 ||
    campaign.counts?.review_invitations !== 0 ||
    campaign.counts?.accepted_assignments !== 0 ||
    campaign.counts?.valid_reviews !== 0 ||
    campaign.counts?.publication_clearances !== 0 ||
    campaign.counts?.graph_effects !== 0
  )) errors.push('SG-09 transition campaign state drift');
  if (packets && (
    packets.counts?.packet_denominator !== 14 ||
    packets.counts?.unassigned_packets !== 14 ||
    packets.counts?.valid_second_party_reviews !== 0 ||
    packets.counts?.adjudicated_packets !== 0
  )) errors.push('SG-09 transition packet registry drift');
  if (release?.combined_sha256 !== checkpoint.trigger.campaign_release_sha256) errors.push('SG-09 transition campaign release digest drift');
  if (campaignBytes && sha256(campaignBytes) !== checkpoint.trigger.campaign_contract_sha256) errors.push('SG-09 transition campaign contract digest drift');
  if (packetBytes && sha256(packetBytes) !== checkpoint.trigger.packet_registry_sha256) errors.push('SG-09 transition packet registry digest drift');
  if (workflowBytes && sha256(workflowBytes) !== checkpoint.trigger.campaign_workflow_sha256) errors.push('SG-09 transition campaign workflow digest drift');

  const tree = spawnSync('git', ['ls-tree', '-r', '--name-only', transition], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (tree.status !== 0) errors.push('SG-09 transition tree cannot be enumerated');
  else if (tree.stdout.split('\n').some((rel) => rel.startsWith('.github/tmp/') || rel.includes('/temporary-') || rel.startsWith('.github/workflows/temporary-'))) {
    errors.push('SG-09 transition contains temporary transport files');
  }
  return errors;
}

function defaultHistoricalVerifier(row) {
  const errors = [];
  errors.push(...ensureCommit(row?.merge_commit, 'historical SG-08 merge receipt', 4));
  if (errors.length) return errors;
  for (const rel of [
    'data/project/project-stable-ground-sg08.json',
    'data/project/project-stable-ground-sg08-release-manifest.json',
    'reports/core-thesis/stable-ground/sg08/checkpoint.json',
    'reports/core-thesis/stable-ground/sg08/index.html'
  ]) {
    const committed = spawnSync('git', ['show', `${row.merge_commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
    if (committed.status !== 0) errors.push(`historical SG-08 merge receipt cannot recover ${rel}`);
    else if (!committed.stdout.equals(readBytes(rel))) errors.push(`historical SG-08 bytes drifted from merge receipt: ${rel}`);
  }
  return errors;
}

export function loadSg09Context({ transitionVerifier = defaultTransitionVerifier, historicalVerifier = defaultHistoricalVerifier } = {}) {
  return {
    checkpoint: read('data/project/project-stable-ground-sg09.json'),
    pointer: read('data/project/project-stable-ground-current.json'),
    governor: read('data/project/project-stable-ground-governor.json'),
    sg08: read('data/project/project-stable-ground-sg08.json'),
    sg08Manifest: read('data/project/project-stable-ground-sg08-release-manifest.json'),
    campaign: read('data/project/status-sovereignty-wave-01-second-party-review-campaign.json'),
    packets: read('data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json'),
    candidates: read('data/research/status-sovereignty-wave-01-second-party-review-candidates.json'),
    responses: read('data/research/status-sovereignty-wave-01-second-party-review-responses.json'),
    campaignManifest: read('data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json'),
    statusManifest: read('data/project/status-sovereignty-release-manifest.json'),
    manifest: read('data/project/project-stable-ground-sg09-release-manifest.json'),
    report: read('reports/core-thesis/stable-ground/sg09/checkpoint.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/stable-ground/sg09/index.html'), 'utf8'),
    transitionVerifier,
    historicalVerifier
  };
}

export function validateSg09(context = loadSg09Context()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const {
    checkpoint, pointer, governor, sg08, sg08Manifest,
    campaign, packets, candidates, responses, campaignManifest, statusManifest,
    manifest, report, html, transitionVerifier, historicalVerifier
  } = context;

  eq(checkpoint.schema_version, 'project-stable-ground-supersession@1', 'SG-09 schema');
  eq(checkpoint.checkpoint_id, 'SG-2026-07-31-09', 'SG-09 checkpoint identity');
  eq(checkpoint.as_of, '2026-07-31', 'SG-09 date');
  eq(checkpoint.supersedes?.checkpoint_id, 'SG-2026-07-30-08', 'SG-09 predecessor');
  eq(checkpoint.supersedes?.source_path, 'data/project/project-stable-ground-sg08.json', 'SG-09 predecessor path');
  eq(checkpoint.supersedes?.merge_commit, '0d0999b89196294ec6d8058b7f18e44360d2b6e6', 'SG-08 merge receipt');
  eq(checkpoint.supersedes?.release_sha256, '3aa05e1e56e9fb625b7d849bbc1e13d36d1974341cbcd425c234e5634fbeb512', 'SG-08 release receipt');
  eq(checkpoint.supersedes?.preserved_unchanged, true, 'SG-08 preservation');
  eq(sg08.checkpoint_id, checkpoint.supersedes.checkpoint_id, 'SG-08 source identity');
  eq(sg08Manifest.combined_sha256, checkpoint.supersedes.release_sha256, 'SG-08 manifest custody');

  const expectedHistory = [
    'SG-2026-07-29-01', 'SG-2026-07-29-02', 'SG-2026-07-29-03',
    'SG-2026-07-29-04', 'SG-2026-07-30-05', 'SG-2026-07-30-06',
    'SG-2026-07-30-07', 'SG-2026-07-30-08', 'SG-2026-07-31-09'
  ];
  eq(JSON.stringify(pointer.history?.map((row) => row.checkpoint_id)), JSON.stringify(expectedHistory), 'SG-09 pointer history order');
  eq(pointer.history?.filter((row) => row.status === 'current').length, 1, 'SG-09 pointer current-state denominator');
  eq(pointer.current_checkpoint_id, checkpoint.checkpoint_id, 'SG-09 current checkpoint');
  eq(pointer.current_checkpoint_path, 'data/project/project-stable-ground-sg09.json', 'SG-09 current path');
  eq(pointer.current_canonical_main_commit, checkpoint.trigger.transition_commit, 'SG-09 current transition commit');
  const sg08Row = pointer.history?.find((row) => row.checkpoint_id === 'SG-2026-07-30-08');
  eq(sg08Row?.status, 'superseded_preserved', 'SG-08 historical pointer status');
  eq(sg08Row?.merge_commit, checkpoint.supersedes.merge_commit, 'SG-08 historical pointer merge receipt');
  const currentRow = pointer.history?.find((row) => row.checkpoint_id === checkpoint.checkpoint_id);
  eq(currentRow?.status, 'current', 'SG-09 pointer status');
  eq(currentRow?.trigger_commit, checkpoint.trigger.transition_commit, 'SG-09 pointer trigger receipt');

  eq(governor.history_law?.append_only, true, 'governor append-only law');
  eq(governor.history_law?.historical_data_and_reports_rewritten, false, 'governor no-rewrite law');
  eq(governor.history_law?.historical_release_manifests_recomputed, false, 'governor historical manifest law');
  eq(governor.checkpoint_contract?.correction_mode, 'append_preserving_supersession', 'governor correction mode');

  eq(checkpoint.trigger?.type, 'canonical_status_for_sovereignty_wave_01_second_party_review_campaign_zero_state', 'SG-09 trigger type');
  eq(checkpoint.trigger?.issue, 507, 'SG-09 trigger issue');
  eq(checkpoint.trigger?.pull_request, 510, 'SG-09 trigger PR');
  eq(checkpoint.trigger?.campaign_id, 'SSC-W01-SPR01', 'SG-09 campaign identity');
  eq(checkpoint.trigger?.transition_base, '0d0999b89196294ec6d8058b7f18e44360d2b6e6', 'SG-09 transition base');
  eq(checkpoint.trigger?.transition_commit, '8615cb335d4b4ea6651f3ea381793f011da7d081', 'SG-09 transition commit');
  eq(checkpoint.trigger?.transition_paths?.length, 22, 'SG-09 transition path denominator');
  eq(sha256(`${checkpoint.trigger.transition_paths.join('\n')}\n`), checkpoint.trigger.transition_paths_sha256, 'SG-09 transition path digest');
  eq(checkpoint.trigger?.wave_packets, 14, 'SG-09 packet count');
  eq(checkpoint.trigger?.unassigned_packets, 14, 'SG-09 unassigned count');
  for (const key of ['reviewer_candidates', 'review_invitations', 'accepted_assignments', 'valid_reviews', 'adjudicated_packets', 'canonical_disposition_changes', 'publication_clearances', 'graph_effects']) {
    eq(checkpoint.trigger?.[key], 0, `SG-09 trigger ${key}`);
  }
  check(hex64.test(checkpoint.trigger?.campaign_release_sha256 || ''), 'SG-09 transition campaign release digest format');
  check(hex64.test(checkpoint.trigger?.campaign_contract_sha256 || ''), 'SG-09 transition campaign contract digest format');
  check(hex64.test(checkpoint.trigger?.packet_registry_sha256 || ''), 'SG-09 transition packet registry digest format');
  check(hex64.test(checkpoint.trigger?.campaign_workflow_sha256 || ''), 'SG-09 transition workflow digest format');
  for (const error of transitionVerifier(checkpoint)) errors.push(error);
  if (sg08Row) for (const error of historicalVerifier(sg08Row)) errors.push(error);

  eq(campaign.campaign_id, 'SSC-W01-SPR01', 'Live campaign identity');
  eq(campaign.status, 'campaign_infrastructure_complete_zero_external_receipts', 'Live campaign status');
  eq(campaign.counts?.wave_packets, 14, 'Live campaign packet count');
  eq(campaign.counts?.maintainer_reviewed_packets, 14, 'Live campaign maintainer count');
  eq(campaign.counts?.second_party_reviewed_packets, 0, 'Live campaign second-party count');
  eq(campaign.counts?.adjudicated_packets, 0, 'Live campaign adjudication count');
  eq(campaign.counts?.reviewer_candidates, 0, 'Live campaign candidate count');
  eq(campaign.counts?.review_invitations, 0, 'Live campaign invitation count');
  eq(campaign.counts?.accepted_assignments, 0, 'Live campaign accepted count');
  eq(campaign.counts?.valid_reviews, 0, 'Live campaign valid-review count');
  eq(campaign.counts?.canonical_disposition_changes, 0, 'Live campaign disposition-change count');
  eq(campaign.counts?.publication_clearances, 0, 'Live campaign publication count');
  eq(campaign.counts?.graph_effects, 0, 'Live campaign graph count');
  eq(campaign.current_result?.second_party_review_complete, false, 'Live campaign completion state');
  eq(campaign.current_result?.adjudication_complete, false, 'Live campaign adjudication state');
  eq(campaign.current_result?.publication_status, 'blocked_pending_valid_second_party_review_and_open_denominators', 'Live campaign publication state');
  eq(campaign.current_result?.graph_effect, 'none', 'Live campaign graph effect');

  eq(packets.counts?.packet_denominator, 14, 'Live packet denominator');
  eq(packets.counts?.unassigned_packets, 14, 'Live unassigned denominator');
  eq(packets.counts?.valid_second_party_reviews, 0, 'Live valid-review denominator');
  eq(packets.counts?.adjudicated_packets, 0, 'Live adjudication denominator');
  check(packets.packets?.every((row) => row.assignment?.state === 'unassigned' && row.assignment?.reviewer_id === null && row.assignment?.valid_review_id === null), 'Live packet assignment drift');
  eq(candidates.records?.length, 0, 'Live candidate registry zero state');
  eq(responses.records?.length, 0, 'Live response registry zero state');

  const expectedCampaignManifest = computeSecondPartyReviewManifest();
  eq(JSON.stringify(campaignManifest), JSON.stringify(expectedCampaignManifest), 'Live campaign exact-byte manifest');
  eq(checkpoint.authority_change?.campaign_release_sha256, campaignManifest.combined_sha256, 'SG-09 live campaign release custody');
  eq(checkpoint.authority_change?.status_release_sha256, statusManifest.combined_sha256, 'SG-09 frozen status release custody');
  eq(checkpoint.canonical_snapshot?.second_party_review_campaign?.valid_reviews, 0, 'SG-09 snapshot valid-review count');
  eq(checkpoint.canonical_snapshot?.second_party_review_campaign?.unassigned_packets, 14, 'SG-09 snapshot unassigned count');
  eq(checkpoint.canonical_snapshot?.status_sovereignty?.second_party_reviewed, 0, 'SG-09 snapshot SSC second-party count');
  eq(checkpoint.canonical_snapshot?.status_sovereignty?.adjudicated, 0, 'SG-09 snapshot SSC adjudication count');
  eq(checkpoint.canonical_snapshot?.status_sovereignty?.complete_compact_findings, 0, 'SG-09 snapshot complete compact count');
  eq(checkpoint.canonical_snapshot?.k0?.included_events, 0, 'SG-09 snapshot K0 events');
  eq(checkpoint.canonical_snapshot?.dca?.query_templates_executed, 0, 'SG-09 snapshot DCA execution');
  eq(checkpoint.canonical_snapshot?.poof?.deployed, false, 'SG-09 snapshot POOF deployment');
  eq(checkpoint.canonical_snapshot?.sprint_09?.maximum_verified_adoption_level, 'A0', 'SG-09 snapshot adoption ceiling');

  for (const [key, value] of Object.entries(checkpoint.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `SG-09 boundary ${key}`);
    else if (typeof value === 'boolean') eq(value, false, `SG-09 boundary ${key}`);
  }

  const expectedManifest = computeSg09Manifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'SG-09 exact-byte manifest');
  eq(report.schema_version, 'project-stable-ground-sg09-report@1', 'SG-09 report schema');
  eq(report.checkpoint_id, checkpoint.checkpoint_id, 'SG-09 report identity');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'SG-09 report release digest');
  eq(report.counts?.wave_packets, 14, 'SG-09 report packet count');
  eq(report.counts?.unassigned_packets, 14, 'SG-09 report unassigned count');
  eq(report.counts?.valid_reviews, 0, 'SG-09 report valid-review count');
  eq(report.counts?.adjudicated_packets, 0, 'SG-09 report adjudication count');
  eq(report.exact_custody?.transition_campaign_release_sha256, checkpoint.trigger.campaign_release_sha256, 'SG-09 report transition release custody');
  eq(report.exact_custody?.current_campaign_release_sha256, campaignManifest.combined_sha256, 'SG-09 report current release custody');
  eq(report.exact_custody?.sg08_release_sha256, checkpoint.supersedes.release_sha256, 'SG-09 report SG-08 custody');
  check(html.includes('14/14 PACKETS FROZEN · 14/14 UNASSIGNED · 0 CANDIDATES · 0 VALID REVIEWS · 0 ADJUDICATIONS · GRAPH EFFECT NONE · PUBLICATION BLOCKED'), 'SG-09 report boundary banner missing');
  check(html.includes(manifest.combined_sha256), 'SG-09 report release digest missing');
  check(html.includes(packets.packets?.[0]?.packet_sha256 ?? 'missing'), 'SG-09 first packet digest missing');
  check(html.includes(packets.packets?.[13]?.packet_sha256 ?? 'missing'), 'SG-09 final packet digest missing');
  return errors;
}

function main() {
  const errors = validateSg09();
  if (errors.length) {
    console.error(`validate-project-stable-ground-sg09: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-project-stable-ground-sg09: PASS');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
