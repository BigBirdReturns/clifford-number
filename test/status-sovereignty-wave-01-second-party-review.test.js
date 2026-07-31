#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadSecondPartyReviewContext,
  validateSecondPartyReview
} from '../tools/validate-status-sovereignty-wave-01-second-party-review.mjs';

const clean = loadSecondPartyReviewContext();
assert.deepEqual(validateSecondPartyReview(clean), [], 'clean second-party campaign must validate');

const clone = () => Object.fromEntries(
  Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)])
);

const mutations = [
  ['campaign identity', (c) => { c.campaign.campaign_id = 'OTHER'; }, 'Campaign identity'],
  ['campaign status', (c) => { c.campaign.status = 'draft'; }, 'Campaign status'],
  ['reasoning permission gate', (c) => { c.campaign.authority_contract.external_participation_is_permission_to_reason = true; }, 'external_participation_is_permission_to_reason'],
  ['missing reviewer erases evidence', (c) => { c.campaign.authority_contract.missing_reviewer_erases_internal_evidence = true; }, 'missing_reviewer_erases_internal_evidence'],
  ['invitation promoted', (c) => { c.campaign.authority_contract.invitation_counts_as_review = true; }, 'invitation_counts_as_review'],
  ['valid review rewrites disposition', (c) => { c.campaign.authority_contract.valid_review_rewrites_canonical_disposition = true; }, 'valid_review_rewrites_canonical_disposition'],
  ['publication cleared by review', (c) => { c.campaign.authority_contract.valid_review_clears_publication = true; }, 'valid_review_clears_publication'],
  ['packet denominator changed', (c) => { c.campaign.packet_ids.pop(); }, 'Campaign packet denominator'],
  ['packet count drift', (c) => { c.campaign.counts.packet_registry_rows = 13; }, 'Campaign count packet_registry_rows'],
  ['review count invented', (c) => { c.campaign.counts.valid_reviews = 1; }, 'Campaign count valid_reviews'],
  ['campaign result incomplete', (c) => { c.campaign.current_result.campaign_infrastructure_complete = false; }, 'Campaign current result'],
  ['campaign graph effect', (c) => { c.campaign.boundaries.graph_effect = 'edge'; }, 'Campaign boundary graph_effect'],
  ['parent review count drift', (c) => { c.review.counts.maintainer_reviewed = 13; }, 'Parent maintainer-reviewed count'],
  ['parent second party invented', (c) => { c.review.counts.second_party_reviewed = 1; }, 'Parent second-party count'],
  ['candidate row invented', (c) => { c.candidates.records.push({ state: 'candidate_only' }); }, 'Candidate registry zero state'],
  ['candidate count invented', (c) => { c.candidates.counts.candidate_records = 1; }, 'Candidate count candidate_records'],
  ['candidate title proves independence', (c) => { c.candidates.boundaries.institutional_title_proves_independence = true; }, 'Candidate boundary institutional_title_proves_independence'],
  ['response row invented', (c) => { c.responses.records.push({ state: 'valid_review' }); }, 'Response registry zero state'],
  ['valid response count invented', (c) => { c.responses.counts.valid_reviews = 1; }, 'Response count valid_reviews'],
  ['response graph effect', (c) => { c.responses.boundaries.graph_effect = 'edge'; }, 'Response boundary graph_effect'],
  ['packet removed', (c) => { c.packetRegistry.packets.pop(); }, 'Packet registry row count'],
  ['packet order drift', (c) => { c.packetRegistry.packets.reverse(); }, 'Packet registry order'],
  ['packet digest drift', (c) => { c.packetRegistry.packets[0].packet_sha256 = 'f'.repeat(64); }, 'Packet registry deterministic reconstruction'],
  ['packet assigned without receipt', (c) => { c.packetRegistry.packets[0].assignment.state = 'accepted'; }, 'assignment state'],
  ['packet reviewer invented', (c) => { c.packetRegistry.packets[0].assignment.reviewer_id = 'SSC-REVIEWER-0001'; }, 'reviewer assignment'],
  ['packet publication effect', (c) => { c.packetRegistry.packets[0].publication_effect = 'clear'; }, 'publication_effect'],
  ['parent source orphaned', (c) => { c.packetRegistry.packets[0].packet_material.parent_source_records[0].source_id = 'MISSING'; }, 'orphan parent source'],
  ['targeted packet removed', (c) => { c.packetRegistry.packets[6].targeted_acquisition_status = 'not_applicable'; }, 'Targeted packet identities'],
  ['acquisition source orphaned', (c) => { c.packetRegistry.packets[6].packet_material.targeted_source_records[0].source_id = 'MISSING'; }, 'orphan acquisition source'],
  ['review source content drift', (c) => { c.reviewSources.records[0].title = 'drift'; }, 'Packet registry deterministic reconstruction'],
  ['acquisition obligation drift', (c) => { c.acquisition.obligations[0].status = 'closed'; }, 'Packet registry deterministic reconstruction'],
  ['campaign schema status drift', (c) => { c.campaignSchema.properties.status.const = 'draft'; }, 'Campaign schema status'],
  ['candidate schema identity drift', (c) => { c.candidateSchema.properties.campaign_id.const = 'OTHER'; }, 'Candidate schema identity'],
  ['receipt publication ceiling removed', (c) => { c.receiptSchema.properties.publication_effect.const = 'clear'; }, 'Receipt publication ceiling'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Second-party exact-byte manifest'],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Second-party build manifest drift'],
  ['public report drift', (c) => { c.publicReport.counts.valid_reviews = 1; }, 'Second-party build/public report drift'],
  ['html zero state removed', (c) => { c.html = c.html.replace('0/14 VALID SECOND-PARTY REVIEWS', '1/14 VALID SECOND-PARTY REVIEWS'); }, 'zero-state banner missing'],
  ['intake counting law removed', (c) => { c.intakeHtml = c.intakeHtml.replace('No invitation, nonresponse, refusal, acceptance, or unvalidated submission counts as second-party review.', 'Invitations may count.'); }, 'Reviewer intake counting law missing'],
  ['intake leaks held field', (c) => { c.intakeHtml += 'normalized_fact_record'; }, 'Reviewer intake exposes normalized fact records']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateSecondPartyReview(context);
  assert(
    errors.some((error) => error.includes(expected)),
    `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`
  );
}

console.log(`status-sovereignty-wave-01-second-party-review.test: ${mutations.length} adversarial mutations PASS`);
