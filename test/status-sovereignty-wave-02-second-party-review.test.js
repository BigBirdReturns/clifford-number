#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadW02SPR, validateW02SPR } from '../tools/validate-status-sovereignty-wave-02-second-party-review.mjs';

const base = loadW02SPR();
assert.deepEqual(validateW02SPR(base), []);
const cases = [
  ['campaign identity', (c) => { c.campaign.campaign_id = 'OTHER'; }],
  ['campaign status', (c) => { c.campaign.status = 'complete'; }],
  ['candidate count', (c) => { c.campaign.counts.reviewer_candidates = 7; }],
  ['ineligible count', (c) => { c.campaign.counts.ineligible = 1; }],
  ['invitation self-award', (c) => { c.campaign.counts.invitations = 1; }],
  ['review self-award', (c) => { c.campaign.counts.valid_reviews = 1; }],
  ['adjudication self-award', (c) => { c.campaign.counts.adjudicated_packets = 1; }],
  ['publication self-award', (c) => { c.campaign.counts.publication_clearances = 1; }],
  ['graph self-award', (c) => { c.campaign.counts.graph_effects = 1; }],
  ['packet removed', (c) => { c.packets.packets.pop(); }],
  ['packet assigned', (c) => { c.packets.packets[0].assignment_state = 'accepted'; }],
  ['packet candidate denominator', (c) => { c.packets.packets[0].candidate_count = 0; }],
  ['candidate removed', (c) => { c.candidates.records.pop(); }],
  ['candidate duplicated', (c) => { c.candidates.records[1].candidate_id = c.candidates.records[0].candidate_id; }],
  ['packet coverage duplicated', (c) => { c.candidates.records[1].packet_id = c.candidates.records[0].packet_id; }],
  ['candidate contacted', (c) => { c.candidates.records[0].candidate_state = 'invited'; }],
  ['eligibility self-award', (c) => { c.candidates.records[0].eligibility_state = 'eligible'; }],
  ['invitation authorized', (c) => { c.candidates.records[0].invitation_authorized = true; }],
  ['conflict disclosure invented', (c) => { c.candidates.records[0].conflict_disclosure_received = true; }],
  ['authenticity invented', (c) => { c.candidates.records[0].authenticity_receipt_received = true; }],
  ['candidate review invented', (c) => { c.candidates.records[0].valid_review_count = 1; }],
  ['profile receipt removed', (c) => { c.candidates.records[0].public_profile_receipt.url = ''; }],
  ['expertise removed', (c) => { c.candidates.records[0].expertise_fit = []; }],
  ['author screen promoted', (c) => { c.candidates.records[0].disqualifier_screen.packet_author_or_material_editor = 'cleared'; }],
  ['interest screen promoted', (c) => { c.candidates.records[0].disqualifier_screen.material_interest = 'none'; }],
  ['failure removed', (c) => { c.candidates.failure_denominator.pop(); }],
  ['failure wrong packet', (c) => { c.candidates.failure_denominator[0].packet_id = 'SSC-W02-PKT-0001'; }],
  ['failure laundered', (c) => { c.candidates.failure_denominator[0].reason = 'no_issue'; }],
  ['failure invited', (c) => { c.candidates.failure_denominator[0].invitation_state = 'sent'; }],
  ['response invented', (c) => { c.responses.records.push({}); }],
  ['candidate boundary', (c) => { c.campaign.boundaries.candidate_is_review = true; }],
  ['review rewrites disposition', (c) => { c.campaign.boundaries.valid_review_rewrites_disposition = true; }],
  ['review clears publication', (c) => { c.campaign.boundaries.valid_review_clears_publication = true; }],
  ['review creates graph', (c) => { c.campaign.boundaries.valid_review_creates_graph_edge = true; }],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = '0'.repeat(64); }],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = '0'.repeat(64); }],
  ['build report drift', (c) => { c.buildReport.status = 'other'; }],
  ['public report drift', (c) => { c.publicReport.release_manifest.combined_sha256 = '0'.repeat(64); }],
  ['banner removed', (c) => { c.html = ''; }]
];
for (const [name, mutate] of cases) {
  const context = structuredClone(base);
  mutate(context);
  assert.ok(validateW02SPR(context).length > 0, name);
}
console.log(`status-sovereignty-wave-02-second-party-review.test: ${cases.length} adversarial mutations PASS`);
