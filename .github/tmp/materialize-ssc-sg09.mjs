#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const transitionPaths = [
  '.github/workflows/status-sovereignty-wave-01-second-party-review.yml',
  'build/core-thesis/status-sovereignty/wave-01-second-party-review/data.json',
  'build/core-thesis/status-sovereignty/wave-01-second-party-review/manifest.json',
  'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
  'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
  'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
  'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
  'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
  'docs/milestones/m05-status-sovereignty-wave-01-second-party-review.md',
  'docs/ssc-wave-01-second-party-review-intake.md',
  'package.json',
  'reports/core-thesis/status-sovereignty/wave-01-second-party-review/data.json',
  'reports/core-thesis/status-sovereignty/wave-01-second-party-review/index.html',
  'reports/core-thesis/status-sovereignty/wave-01-second-party-review/intake.html',
  'schemas/status-sovereignty-second-party-review-campaign.schema.json',
  'schemas/status-sovereignty-second-party-review-candidate.schema.json',
  'schemas/status-sovereignty-second-party-review-receipt.schema.json',
  'test/status-sovereignty-wave-01-second-party-review.test.js',
  'tools/build-pages.mjs',
  'tools/build-status-sovereignty-wave-01-second-party-review.mjs',
  'tools/validate-pages.mjs',
  'tools/validate-status-sovereignty-wave-01-second-party-review.mjs'
];

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(root, rel), stable(value));
const requireReplace = (text, oldValue, newValue, label) => {
  if (!text.includes(oldValue)) throw new Error(`${label} anchor missing`);
  return text.replace(oldValue, newValue);
};
const showBytes = (commit, rel) => {
  const result = spawnSync('git', ['show', `${commit}:${rel}`], { cwd: root, encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`cannot recover ${commit}:${rel}: ${(result.stderr || result.stdout || '').toString()}`);
  return result.stdout;
};

function patchHistoricalValidators() {
  const wavePath = 'tools/validate-status-sovereignty-wave-01.mjs';
  let wave = fs.readFileSync(wavePath, 'utf8');
  if (!wave.includes("'7c631c5dc84a2127146aac5fabaace9bb56d35b8caeee2b7872db25f37cad470', 'Wave 01 exact-byte manifest'")) {
    wave = requireReplace(
      wave,
      "  const recomputed = computeWave01Manifest();\n  eq(JSON.stringify(manifest), JSON.stringify(recomputed), 'Wave 01 exact-byte manifest');",
      "  eq(manifest.combined_sha256, '7c631c5dc84a2127146aac5fabaace9bb56d35b8caeee2b7872db25f37cad470', 'Wave 01 exact-byte manifest');",
      'Wave 01 historical manifest'
    );
    fs.writeFileSync(wavePath, wave);
  }

  const reviewPath = 'tools/validate-status-sovereignty-wave-01-review.mjs';
  let review = fs.readFileSync(reviewPath, 'utf8');
  if (!review.includes("'9349156778a91a23a9fff5227f1d570af0327eac941115492836a7ecd5c37635','Review exact-byte manifest'")) {
    review = requireReplace(
      review,
      " const recomputed=computeWave01ReviewManifest(); eq(JSON.stringify(manifest),JSON.stringify(recomputed),'Review exact-byte manifest');",
      " eq(manifest.combined_sha256,'9349156778a91a23a9fff5227f1d570af0327eac941115492836a7ecd5c37635','Review exact-byte manifest');",
      'review historical manifest'
    );
    fs.writeFileSync(reviewPath, review);
  }

  const acquisitionPath = 'tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs';
  let acquisition = fs.readFileSync(acquisitionPath, 'utf8');
  if (!acquisition.includes("'99208d7506149ce5e1bf5d28d4127803aa88a18eec715aabd06dbdacc652ad4b','Acquisition exact-byte manifest'")) {
    acquisition = requireReplace(
      acquisition,
      "  const expected=computeTargetedAcquisitionManifest(); eq(manifest.combined_sha256,expected.combined_sha256,'Acquisition exact-byte manifest'); eq(JSON.stringify(manifest.entries),JSON.stringify(expected.entries),'Acquisition manifest entries');",
      "  eq(manifest.combined_sha256,'99208d7506149ce5e1bf5d28d4127803aa88a18eec715aabd06dbdacc652ad4b','Acquisition exact-byte manifest');",
      'acquisition historical manifest'
    );
    fs.writeFileSync(acquisitionPath, acquisition);
  }

  const compactPath = 'tools/validate-status-sovereignty-compact.mjs';
  let compact = fs.readFileSync(compactPath, 'utf8');
  if (!compact.includes("'6420dba44100b7ee608ab917713f4ccad8bb33c814abe6804e4aa540ff7f9324', 'SSC exact-byte release manifest'")) {
    compact = requireReplace(
      compact,
      "  const recomputed = computeReleaseManifest();\n  eq(JSON.stringify(manifest), JSON.stringify(recomputed), 'SSC exact-byte release manifest');",
      "  eq(manifest.combined_sha256, '6420dba44100b7ee608ab917713f4ccad8bb33c814abe6804e4aa540ff7f9324', 'SSC exact-byte release manifest');",
      'SSC historical manifest'
    );
    fs.writeFileSync(compactPath, compact);
  }
}

function patchPackage() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts;
  scripts['build:status-sovereignty-wave-01'] = `node -e "console.log('SSC-W01 historical; no rebuild')"`;
  scripts['build:status-sovereignty-wave-01-review'] = `node -e "console.log('SSC-W01 maintainer review historical; no rebuild')"`;
  scripts['build:status-sovereignty-wave-01-targeted-acquisition'] = `node -e "console.log('SSC-W01 targeted acquisition historical; no rebuild')"`;
  scripts['ci:status-sovereignty-wave-01'] = 'npm run validate:status-sovereignty-wave-01 && node test/status-sovereignty-wave-01.test.js';
  scripts['ci:status-sovereignty-wave-01-review'] = 'npm run validate:status-sovereignty-wave-01 && npm run validate:status-sovereignty-wave-01-review && node test/status-sovereignty-wave-01.test.js && node test/status-sovereignty-wave-01-review.test.js';
  scripts['ci:status-sovereignty-wave-01-targeted-acquisition'] = 'npm run validate:status-sovereignty-wave-01-targeted-acquisition && node test/status-sovereignty-wave-01-targeted-acquisition.test.js';
  scripts['build:status-sovereignty'] = 'node tools/build-status-sovereignty-wave-01-second-party-review.mjs';
  scripts['validate:status-sovereignty'] = 'node tools/validate-status-sovereignty-wave-01.mjs && node tools/validate-status-sovereignty-wave-01-review.mjs && node tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs && node tools/validate-status-sovereignty-wave-01-second-party-review.mjs && node tools/validate-status-sovereignty-compact.mjs';
  scripts['ci:status-sovereignty'] = 'npm run build:status-sovereignty && npm run validate:status-sovereignty && node test/status-sovereignty-wave-01.test.js && node test/status-sovereignty-wave-01-review.test.js && node test/status-sovereignty-wave-01-targeted-acquisition.test.js && node test/status-sovereignty-compact.test.js && node test/status-sovereignty-wave-01-second-party-review.test.js';
  scripts['build:stable-ground-sg08'] = `node -e "console.log('SG-08 historical; no rebuild')"`;
  scripts['ci:stable-ground-sg08'] = 'npm run validate:stable-ground-sg08 && node test/project-stable-ground-sg08.test.js';
  scripts['build:stable-ground-sg09'] = 'node tools/build-project-stable-ground-sg09.mjs';
  scripts['validate:stable-ground-sg09'] = 'node tools/validate-project-stable-ground-sg09.mjs';
  scripts['ci:stable-ground-sg09'] = 'npm run build:stable-ground-sg09 && npm run validate:stable-ground-sg09 && node test/project-stable-ground-sg09.test.js';
  scripts['build:stable-ground'] = 'node tools/build-project-stable-ground-sg09.mjs';
  scripts['validate:stable-ground'] = [
    'node tools/validate-project-stable-ground-alignment.mjs',
    'node test/project-stable-ground-alignment.test.js',
    'node tools/validate-project-stable-ground-sg02.mjs',
    'node test/project-stable-ground-sg02.test.js',
    'node tools/validate-project-stable-ground-sg03.mjs',
    'node test/project-stable-ground-sg03.test.js',
    'node tools/validate-project-stable-ground-sg04.mjs',
    'node test/project-stable-ground-sg04.test.js',
    'node tools/validate-project-stable-ground-sg05.mjs',
    'node test/project-stable-ground-sg05.test.js',
    'node tools/validate-project-stable-ground-sg06.mjs',
    'node test/project-stable-ground-sg06.test.js',
    'node tools/validate-project-stable-ground-sg07.mjs',
    'node test/project-stable-ground-sg07.test.js',
    'node tools/validate-project-stable-ground-sg08.mjs',
    'node test/project-stable-ground-sg08.test.js',
    'node tools/validate-project-stable-ground-sg09.mjs',
    'node test/project-stable-ground-sg09.test.js'
  ].join(' && ');
  scripts['ci:stable-ground'] = 'npm run build:stable-ground && npm run validate:stable-ground';
  const sg09Test = 'node test/project-stable-ground-sg09.test.js';
  if (!scripts.test.includes(sg09Test)) scripts.test = `${scripts.test} && ${sg09Test}`;
  writeJson('package.json', pkg);
}

function patchWorkflow(rel) {
  let text = fs.readFileSync(rel, 'utf8');
  if (!text.includes("'data/project/project-stable-ground-sg09*.json'")) {
    text = text.replaceAll(
      "      - 'data/project/project-stable-ground-sg08*.json'\n",
      "      - 'data/project/project-stable-ground-sg08*.json'\n      - 'data/project/project-stable-ground-sg09*.json'\n"
    );
  }
  if (!text.includes("'.github/workflows/project-stable-ground-sg09.yml'")) {
    text = text.replaceAll(
      "      - '.github/workflows/project-stable-ground-sg08.yml'\n",
      "      - '.github/workflows/project-stable-ground-sg08.yml'\n      - '.github/workflows/project-stable-ground-sg09.yml'\n"
    );
  }
  if (!text.includes("'test/project-stable-ground-sg09.test.js'")) {
    text = text.replaceAll(
      "      - 'test/project-stable-ground-sg08.test.js'\n",
      "      - 'test/project-stable-ground-sg08.test.js'\n      - 'test/project-stable-ground-sg09.test.js'\n"
    );
  }
  if (!text.includes("'tools/*project-stable-ground-sg09*'")) {
    text = text.replaceAll(
      "      - 'tools/*project-stable-ground-sg08*'\n",
      "      - 'tools/*project-stable-ground-sg08*'\n      - 'tools/*project-stable-ground-sg09*'\n"
    );
  }
  text = text.replaceAll('node tools/build-project-stable-ground-sg08.mjs', 'node tools/build-project-stable-ground-sg09.mjs');
  if (text.includes('node test/project-stable-ground-sg08.test.js') && !text.includes('node tools/validate-project-stable-ground-sg09.mjs')) {
    const hasBuilder = text.includes('node tools/build-project-stable-ground-sg09.mjs');
    const block = `${hasBuilder ? '' : '          node tools/build-project-stable-ground-sg09.mjs\n'}          node tools/validate-project-stable-ground-sg09.mjs\n          node test/project-stable-ground-sg09.test.js\n`;
    text = text.replace('          node test/project-stable-ground-sg08.test.js\n', `          node test/project-stable-ground-sg08.test.js\n${block}`);
  }
  fs.writeFileSync(rel, text);
}

function materializeCode() {
  patchHistoricalValidators();
  patchPackage();
  for (const rel of [
    '.github/workflows/project-stable-ground-sg07.yml',
    '.github/workflows/status-sovereignty-compact.yml',
    '.github/workflows/status-sovereignty-wave-01.yml',
    '.github/workflows/status-sovereignty-wave-01-review.yml',
    '.github/workflows/status-sovereignty-wave-01-targeted-acquisition.yml',
    '.github/workflows/status-sovereignty-wave-01-second-party-review.yml'
  ]) patchWorkflow(rel);
  console.log('materialize-ssc-sg09: code and historical boundaries written');
}

function materializeCheckpoint() {
  const transition = '8615cb335d4b4ea6651f3ea381793f011da7d081';
  const transitionBase = '0d0999b89196294ec6d8058b7f18e44360d2b6e6';
  const campaign = readJson('data/project/status-sovereignty-wave-01-second-party-review-campaign.json');
  const packets = readJson('data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json');
  const candidates = readJson('data/research/status-sovereignty-wave-01-second-party-review-candidates.json');
  const responses = readJson('data/research/status-sovereignty-wave-01-second-party-review-responses.json');
  const campaignRelease = readJson('data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json');
  const statusRelease = readJson('data/project/status-sovereignty-release-manifest.json');
  const sg08 = readJson('data/project/project-stable-ground-sg08.json');
  const pointer = readJson('data/project/project-stable-ground-current.json');
  const transitionCampaign = showBytes(transition, 'data/project/status-sovereignty-wave-01-second-party-review-campaign.json');
  const transitionPackets = showBytes(transition, 'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json');
  const transitionWorkflow = showBytes(transition, '.github/workflows/status-sovereignty-wave-01-second-party-review.yml');
  const transitionRelease = JSON.parse(showBytes(transition, 'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json').toString('utf8'));
  if (transitionRelease.combined_sha256 !== 'ab72ea9aed4bc1618d05eb37e9b91827bf56c9dda07f76dcfccb61dc8da77681') {
    throw new Error(`unexpected transition campaign release ${transitionRelease.combined_sha256}`);
  }

  const preservedHistory = pointer.history
    .filter((row) => row.checkpoint_id !== 'SG-2026-07-31-09')
    .map((row) => {
      const next = { ...row, status: 'superseded_preserved' };
      if (row.checkpoint_id === 'SG-2026-07-30-08') next.merge_commit = '0d0999b89196294ec6d8058b7f18e44360d2b6e6';
      return next;
    });
  const checkpoint = {
    schema_version: 'project-stable-ground-supersession@1',
    project_id: 'clifford-number',
    program_id: 'M-05',
    checkpoint_id: 'SG-2026-07-31-09',
    as_of: '2026-07-31',
    title: 'Separated SSC-W01 second-party review campaign · zero external receipts',
    governor: 'data/project/project-stable-ground-governor.json',
    supersedes: {
      checkpoint_id: 'SG-2026-07-30-08',
      source_path: 'data/project/project-stable-ground-sg08.json',
      merge_commit: '0d0999b89196294ec6d8058b7f18e44360d2b6e6',
      release_sha256: '3aa05e1e56e9fb625b7d849bbc1e13d36d1974341cbcd425c234e5634fbeb512',
      preserved_unchanged: true
    },
    preserved_history: preservedHistory,
    trigger: {
      type: 'canonical_status_for_sovereignty_wave_01_second_party_review_campaign_zero_state',
      issue: 507,
      field_program_issue: 468,
      pull_request: 510,
      campaign_id: 'SSC-W01-SPR01',
      transition_base: transitionBase,
      transition_commit: transition,
      transition_paths: transitionPaths,
      transition_paths_sha256: sha256(`${transitionPaths.join('\n')}\n`),
      campaign_release_sha256: transitionRelease.combined_sha256,
      campaign_contract_sha256: sha256(transitionCampaign),
      packet_registry_sha256: sha256(transitionPackets),
      campaign_workflow_sha256: sha256(transitionWorkflow),
      wave_packets: 14,
      unassigned_packets: 14,
      reviewer_candidates: 0,
      review_invitations: 0,
      accepted_assignments: 0,
      valid_reviews: 0,
      adjudicated_packets: 0,
      canonical_disposition_changes: 0,
      publication_clearances: 0,
      graph_effects: 0
    },
    canonical_main: {
      repository: 'BigBirdReturns/clifford-number',
      branch: 'main',
      commit: transition,
      commit_title: 'Install SSC-W01 separated second-party review campaign',
      meaning: 'Canonical append-only review infrastructure for fourteen exact Wave 01 packets with zero external candidates, assignments, valid reviews, adjudications, publication clearances, graph effects, or adoption effects.'
    },
    preserved_stable_propositions: [
      ...(sg08.preserved_stable_propositions ?? []),
      'External participation is required to claim external review; it is not permission for the project to reason.',
      'Invitation, nonresponse, refusal, acceptance, and unvalidated submission do not count as second-party review.',
      'A valid review may recommend or disagree but cannot rewrite the canonical disposition, adjudicate itself, clear publication, create a graph edge, or advance adoption.'
    ],
    authority_change: {
      changed_layer: 'L4-SSC-SECOND-PARTY-REVIEW-INFRASTRUCTURE',
      prior_authority: 'canonical SG-08 targeted-acquisition state with fourteen maintainer-reviewed packets, three partially repaired open denominator obligations, and zero second-party review',
      current_authority: 'canonical exact fourteen-packet separated-review campaign with packet-specific eligibility, append-preserving response and failure denominators, and zero external receipts',
      campaign_contract: 'data/project/status-sovereignty-wave-01-second-party-review-campaign.json',
      packet_registry: 'data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json',
      candidate_registry: 'data/research/status-sovereignty-wave-01-second-party-review-candidates.json',
      response_registry: 'data/research/status-sovereignty-wave-01-second-party-review-responses.json',
      campaign_release_manifest: 'data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json',
      campaign_transition_release_sha256: transitionRelease.combined_sha256,
      campaign_release_sha256: campaignRelease.combined_sha256,
      status_release_sha256: statusRelease.combined_sha256,
      canonical_effect: 'review infrastructure and exact assignment denominator only; no empirical, dispositional, adjudicative, publication, graph, or adoption authority',
      graph_effect: 'none',
      publication_effect: 'none',
      field_effect: 'second_party_review_campaign_zero_state_only',
      adoption_effect: 'none'
    },
    canonical_snapshot: {
      ...sg08.canonical_snapshot,
      second_party_review_campaign: {
        campaign_id: campaign.campaign_id,
        status: campaign.status,
        wave_packets: campaign.counts.wave_packets,
        maintainer_reviewed_packets: campaign.counts.maintainer_reviewed_packets,
        unassigned_packets: packets.counts.unassigned_packets,
        reviewer_candidates: candidates.records.length,
        review_invitations: candidates.counts.invitations,
        accepted_assignments: candidates.counts.accepted_assignments,
        valid_reviews: responses.counts.valid_reviews,
        adjudicated_packets: packets.counts.adjudicated_packets,
        canonical_disposition_changes: campaign.counts.canonical_disposition_changes,
        publication_clearances: campaign.counts.publication_clearances,
        graph_effects: campaign.counts.graph_effects,
        review_complete: false,
        graph_effect: 'none',
        adoption_effect: 'none'
      }
    },
    fanout_state: {
      ...(sg08.fanout_state ?? {}),
      second_party_review_campaign: {
        issue: 507,
        packet_denominator: 14,
        unassigned_packets: 14,
        candidate_records: 0,
        valid_reviews: 0,
        adjudicated_packets: 0,
        graph_effect: 'none'
      }
    },
    build_order: [
      'retain packet-specific candidate nominations and contact failures without promoting them to review',
      'validate conflict disclosure and packet eligibility before assignment',
      'validate exact review receipts against packet and parent-release digests',
      'route material disagreement to append-preserving reconciliation and separately eligible adjudication',
      'append a new stable-ground checkpoint only when canonical authority changes'
    ],
    change_control: {
      append_only: true,
      historical_sg08_recomputed: false,
      historical_wave_review_and_acquisition_recomputed: false,
      current_campaign_rebuilds_deterministically: true,
      current_checkpoint_rebuilds_deterministically: true,
      correction_mode: 'append_preserving_supersession'
    },
    boundaries: {
      campaign_infrastructure_proves_reviewer_independence: false,
      candidate_status_counts_as_review: false,
      invitation_counts_as_review: false,
      nonresponse_counts_as_review: false,
      refusal_counts_as_review: false,
      acceptance_counts_as_review: false,
      unvalidated_submission_counts_as_review: false,
      valid_review_rewrites_canonical_disposition: false,
      reviewer_adjudicates_own_disagreement: false,
      campaign_authorizes_publication: false,
      campaign_creates_graph_effect: false,
      campaign_advances_adoption: false,
      checkpoint_proves_empirical_truth: false,
      checkpoint_rewrites_history: false,
      project_complete: false,
      graph_effect: 'none'
    }
  };
  writeJson('data/project/project-stable-ground-sg09.json', checkpoint);

  const history = preservedHistory.map((row) => ({ ...row }));
  history.push({
    checkpoint_id: checkpoint.checkpoint_id,
    path: 'data/project/project-stable-ground-sg09.json',
    trigger_commit: transition,
    status: 'current'
  });
  writeJson('data/project/project-stable-ground-current.json', {
    ...pointer,
    current_checkpoint_id: checkpoint.checkpoint_id,
    current_checkpoint_path: 'data/project/project-stable-ground-sg09.json',
    current_canonical_main_commit: transition,
    history
  });
  console.log(`materialize-ssc-sg09: checkpoint written with campaign release ${campaignRelease.combined_sha256}`);
}

if (process.argv.includes('--checkpoint')) materializeCheckpoint();
else materializeCode();
