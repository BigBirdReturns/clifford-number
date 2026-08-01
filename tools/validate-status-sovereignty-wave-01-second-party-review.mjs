#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveSecondPartyPacketRegistry,
  sourcePaths
} from './build-status-sovereignty-wave-01-second-party-review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadSecondPartyReviewContext() {
  return {
    campaign: read(sourcePaths.campaign),
    candidates: read(sourcePaths.candidates),
    responses: read(sourcePaths.responses),
    review: read(sourcePaths.review),
    reviewSources: read(sourcePaths.reviewSources),
    reviewManifest: read(sourcePaths.reviewManifest),
    acquisition: read(sourcePaths.acquisition),
    acquisitionSources: read(sourcePaths.acquisitionSources),
    acquisitionManifest: read(sourcePaths.acquisitionManifest),
    campaignSchema: read(sourcePaths.campaignSchema),
    candidateSchema: read(sourcePaths.candidateSchema),
    receiptSchema: read(sourcePaths.receiptSchema),
    packetRegistry: read('data/project/status-sovereignty-wave-01-second-party-review-packet-registry.json'),
    manifest: read('data/project/status-sovereignty-wave-01-second-party-review-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/wave-01-second-party-review/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/wave-01-second-party-review/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/wave-01-second-party-review/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-01-second-party-review/index.html'), 'utf8'),
    intakeHtml: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-01-second-party-review/intake.html'), 'utf8')
  };
}

export function validateSecondPartyReview(c = loadSecondPartyReviewContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };
  const {
    campaign, candidates, responses, review, reviewSources, reviewManifest,
    acquisition, acquisitionSources, acquisitionManifest,
    campaignSchema, candidateSchema, receiptSchema,
    packetRegistry, manifest, buildManifest, buildReport, publicReport,
    html, intakeHtml
  } = c;

  eq(campaign.schema_version, 'status-sovereignty-second-party-review-campaign@1', 'Campaign schema');
  eq(campaign.campaign_id, 'SSC-W01-SPR01', 'Campaign identity');
  eq(campaign.status, 'campaign_infrastructure_complete_zero_external_receipts', 'Campaign status');
  eq(campaign.authority_tier, 'AT-2', 'Campaign authority tier');
  eq(campaign.parent_checkpoint?.checkpoint_id, 'SG-2026-07-30-08', 'Campaign parent checkpoint');
  eq(campaign.parent_checkpoint?.merge_commit, '0d0999b89196294ec6d8058b7f18e44360d2b6e6', 'Campaign parent merge receipt');

  const expectedPacketIds = Array.from({ length: 14 }, (_, index) => `SSC-OBS-${String(index + 1).padStart(4, '0')}`);
  eq(JSON.stringify(campaign.packet_ids), JSON.stringify(expectedPacketIds), 'Campaign packet denominator');
  eq(campaign.state_model?.length, 11, 'Campaign state model count');
  eq(new Set(campaign.state_model ?? []).size, 11, 'Campaign state model uniqueness');

  const authorityFalse = [
    'external_participation_is_permission_to_reason',
    'missing_reviewer_erases_internal_evidence',
    'invitation_counts_as_review',
    'nonresponse_counts_as_review',
    'refusal_counts_as_review',
    'acceptance_counts_as_review',
    'unvalidated_submission_counts_as_review',
    'valid_review_rewrites_canonical_disposition',
    'reviewer_may_adjudicate_own_disagreement',
    'valid_review_clears_publication',
    'valid_review_creates_graph_effect',
    'valid_review_advances_adoption'
  ];
  eq(campaign.authority_contract?.external_participation_required_to_claim_second_party_review, true, 'Campaign external-review claim law');
  for (const key of authorityFalse) eq(campaign.authority_contract?.[key], false, `Campaign authority ${key}`);

  const fixedCampaignCounts = {
    wave_packets: 14,
    packet_registry_rows: 14,
    unassigned_packets: 14,
    maintainer_reviewed_packets: 14,
    second_party_reviewed_packets: 0,
    adjudicated_packets: 0,
    reviewer_candidates: 0,
    review_invitations: 0,
    nonresponses: 0,
    refusals: 0,
    conflicts_disclosed: 0,
    ineligible_candidates: 0,
    accepted_assignments: 0,
    submitted_unvalidated_reviews: 0,
    valid_reviews: 0,
    withdrawn_reviews: 0,
    review_disagreements: 0,
    canonical_disposition_changes: 0,
    publication_clearances: 0,
    graph_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCampaignCounts)) {
    eq(campaign.counts?.[key], value, `Campaign count ${key}`);
  }

  const expectedResult = {
    campaign_infrastructure_complete: true,
    packet_registry_complete: true,
    candidate_registry_open: true,
    second_party_review_complete: false,
    adjudication_complete: false,
    publication_status: 'blocked_pending_valid_second_party_review_and_open_denominators',
    graph_effect: 'none',
    adoption_effect: 'none'
  };
  eq(JSON.stringify(campaign.current_result), JSON.stringify(expectedResult), 'Campaign current result');
  for (const [key, value] of Object.entries(campaign.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Campaign boundary ${key}`);
    else eq(value, false, `Campaign boundary ${key}`);
  }

  eq(review.review_id, 'SSC-W01-MR01', 'Parent review identity');
  eq(review.counts?.observations, 14, 'Parent review observation count');
  eq(review.counts?.maintainer_reviewed, 14, 'Parent maintainer-reviewed count');
  eq(review.counts?.second_party_reviewed, 0, 'Parent second-party count');
  eq(review.counts?.adjudicated, 0, 'Parent adjudication count');
  eq(reviewManifest.combined_sha256, packetRegistry.parent_review?.release_sha256, 'Parent review release binding');
  eq(acquisition.acquisition_id, 'SSC-W01-TA01', 'Parent acquisition identity');
  eq(acquisition.counts?.obligations, 3, 'Parent acquisition obligation count');
  eq(acquisition.counts?.second_party_reviews, 0, 'Parent acquisition second-party count');
  eq(acquisition.counts?.adjudications, 0, 'Parent acquisition adjudication count');
  eq(acquisitionManifest.combined_sha256, packetRegistry.targeted_acquisition?.release_sha256, 'Parent acquisition release binding');

  eq(candidates.schema_version, 'status-sovereignty-second-party-review-candidates@1', 'Candidate registry schema');
  eq(candidates.status, 'zero_state_no_candidates_contacted', 'Candidate registry status');
  eq(candidates.records?.length, 0, 'Candidate registry zero state');
  eq(candidates.failure_denominator?.length, 0, 'Candidate failure denominator zero state');
  for (const [key, value] of Object.entries(candidates.counts ?? {})) eq(value, 0, `Candidate count ${key}`);
  for (const [key, value] of Object.entries(candidates.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Candidate boundary ${key}`);
    else eq(value, false, `Candidate boundary ${key}`);
  }

  eq(responses.schema_version, 'status-sovereignty-second-party-review-responses@1', 'Response registry schema');
  eq(responses.status, 'zero_state_no_review_receipts', 'Response registry status');
  eq(responses.records?.length, 0, 'Response registry zero state');
  eq(responses.invalid_submission_denominator?.length, 0, 'Invalid response denominator zero state');
  for (const [key, value] of Object.entries(responses.counts ?? {})) eq(value, 0, `Response count ${key}`);
  for (const [key, value] of Object.entries(responses.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Response boundary ${key}`);
    else eq(value, false, `Response boundary ${key}`);
  }

  eq(packetRegistry.schema_version, 'status-sovereignty-second-party-review-packet-registry@1', 'Packet registry schema');
  eq(packetRegistry.status, 'complete_fourteen_packet_denominator_zero_assignments', 'Packet registry status');
  eq(packetRegistry.packets?.length, 14, 'Packet registry row count');
  eq(JSON.stringify(packetRegistry.packets?.map((row) => row.packet_id)), JSON.stringify(expectedPacketIds), 'Packet registry order');
  eq(new Set(packetRegistry.packets?.map((row) => row.packet_id)).size, 14, 'Packet registry identity uniqueness');
  eq(packetRegistry.counts?.packet_denominator, 14, 'Packet denominator count');
  eq(packetRegistry.counts?.packets_with_targeted_acquisition, 3, 'Packet targeted-acquisition count');
  eq(packetRegistry.counts?.assigned_packets, 0, 'Packet assigned count');
  eq(packetRegistry.counts?.unassigned_packets, 14, 'Packet unassigned count');
  eq(packetRegistry.counts?.valid_second_party_reviews, 0, 'Packet valid-review count');
  eq(packetRegistry.counts?.adjudicated_packets, 0, 'Packet adjudicated count');

  const reviewSourceIds = new Set(reviewSources.records.map((row) => row.source_id));
  const acquisitionSourceIds = new Set(acquisitionSources.records.map((row) => row.source_id));
  const targetedPacketIds = [];
  for (const row of packetRegistry.packets ?? []) {
    check(/^[0-9a-f]{64}$/.test(row.packet_sha256 ?? ''), `${row.packet_id}: packet digest format`);
    eq(row.maintainer_review_state, 'maintainer_reviewed', `${row.packet_id}: maintainer review state`);
    eq(row.second_party_review_state, 'pending', `${row.packet_id}: second-party state`);
    eq(row.adjudication_state, 'not_started', `${row.packet_id}: adjudication state`);
    eq(row.assignment?.state, 'unassigned', `${row.packet_id}: assignment state`);
    eq(row.assignment?.reviewer_id, null, `${row.packet_id}: reviewer assignment`);
    eq(row.assignment?.valid_review_id, null, `${row.packet_id}: valid-review assignment`);
    for (const effect of ['review_effect', 'publication_effect', 'graph_effect', 'adoption_effect']) {
      eq(row[effect], 'none', `${row.packet_id}: ${effect}`);
    }
    check(row.packet_material?.parent_source_records?.length > 0, `${row.packet_id}: parent source denominator empty`);
    for (const source of row.packet_material?.parent_source_records ?? []) {
      check(reviewSourceIds.has(source.source_id), `${row.packet_id}: orphan parent source ${source.source_id}`);
      eq(source.present, true, `${row.packet_id}: parent source presence ${source.source_id}`);
      check(/^[0-9a-f]{64}$/.test(source.record_sha256 ?? ''), `${row.packet_id}: parent source digest ${source.source_id}`);
    }
    if (row.targeted_acquisition_status !== 'not_applicable') {
      targetedPacketIds.push(row.packet_id);
      check(/^[0-9a-f]{64}$/.test(row.packet_material?.targeted_acquisition_obligation_sha256 ?? ''), `${row.packet_id}: acquisition obligation digest`);
      check((row.packet_material?.targeted_source_records?.length ?? 0) > 0, `${row.packet_id}: acquisition source denominator empty`);
      for (const source of row.packet_material?.targeted_source_records ?? []) {
        check(acquisitionSourceIds.has(source.source_id), `${row.packet_id}: orphan acquisition source ${source.source_id}`);
        eq(source.present, true, `${row.packet_id}: acquisition source presence ${source.source_id}`);
        check(/^[0-9a-f]{64}$/.test(source.record_sha256 ?? ''), `${row.packet_id}: acquisition source digest ${source.source_id}`);
      }
    } else {
      eq(row.packet_material?.targeted_acquisition_release_sha256, null, `${row.packet_id}: non-targeted release binding`);
      eq(row.packet_material?.targeted_acquisition_obligation_sha256, null, `${row.packet_id}: non-targeted obligation binding`);
      eq(row.packet_material?.targeted_source_records?.length, 0, `${row.packet_id}: non-targeted source denominator`);
    }
  }
  eq(JSON.stringify(targetedPacketIds), JSON.stringify(['SSC-OBS-0007', 'SSC-OBS-0008', 'SSC-OBS-0009']), 'Targeted packet identities');

  for (const [key, value] of Object.entries(packetRegistry.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Packet boundary ${key}`);
    else eq(value, false, `Packet boundary ${key}`);
  }

  eq(campaignSchema.properties?.campaign_id?.const, 'SSC-W01-SPR01', 'Campaign schema identity');
  eq(campaignSchema.properties?.status?.const, 'campaign_infrastructure_complete_zero_external_receipts', 'Campaign schema status');
  eq(candidateSchema.properties?.campaign_id?.const, 'SSC-W01-SPR01', 'Candidate schema identity');
  eq(receiptSchema.properties?.campaign_id?.const, 'SSC-W01-SPR01', 'Receipt schema identity');
  eq(receiptSchema.properties?.publication_effect?.const, 'none', 'Receipt publication ceiling');
  eq(receiptSchema.properties?.graph_effect?.const, 'none', 'Receipt graph ceiling');
  eq(receiptSchema.properties?.adoption_effect?.const, 'none', 'Receipt adoption ceiling');

  const recomputedRegistry = deriveSecondPartyPacketRegistry({
    campaign, candidates, responses, review, reviewSources, reviewManifest,
    acquisition, acquisitionSources, acquisitionManifest
  });
  eq(JSON.stringify(packetRegistry), JSON.stringify(recomputedRegistry), 'Packet registry deterministic reconstruction');

  eq(manifest.schema_version, 'status-sovereignty-second-party-review-release-manifest@1', 'Second-party manifest schema');
  eq(manifest.combined_sha256, '53e85226f7193932d3d9288bad0666290e1169a9507e1c5464bd80a64f2f1b8b', 'Second-party exact-byte manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Second-party build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Second-party build/public report drift');
  eq(JSON.stringify(buildReport.packet_registry), JSON.stringify(packetRegistry), 'Second-party report packet registry drift');
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Second-party report release digest');

  check(html.includes('0/14 VALID SECOND-PARTY REVIEWS'), 'Second-party HTML zero-state banner missing');
  check(html.includes('14/14 UNASSIGNED'), 'Second-party HTML assignment boundary missing');
  check(html.includes(manifest.combined_sha256), 'Second-party HTML release digest missing');
  check(html.includes(packetRegistry.packets?.[0]?.packet_sha256 ?? 'missing'), 'Second-party HTML first packet digest missing');
  check(html.includes(packetRegistry.packets?.[13]?.packet_sha256 ?? 'missing'), 'Second-party HTML final packet digest missing');

  check(intakeHtml.includes('No invitation, nonresponse, refusal, acceptance, or unvalidated submission counts as second-party review.'), 'Reviewer intake counting law missing');
  check(intakeHtml.includes('publication clearance: none'), 'Reviewer intake publication ceiling missing');
  check(intakeHtml.includes('graph effect: none'), 'Reviewer intake graph ceiling missing');
  check(intakeHtml.includes(manifest.combined_sha256), 'Reviewer intake release digest missing');
  check(!intakeHtml.includes('normalized_fact_record'), 'Reviewer intake exposes normalized fact records');
  check(!intakeHtml.includes('selected_roster'), 'Reviewer intake exposes held denominator content');

  return errors;
}

function main() {
  const errors = validateSecondPartyReview();
  if (errors.length) {
    console.error(`validate-status-sovereignty-wave-01-second-party-review: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-wave-01-second-party-review: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
