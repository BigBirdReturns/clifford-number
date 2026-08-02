#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadInternalAdversarialReviewContext,
  validateInternalAdversarialReview
} from '../tools/validate-status-sovereignty-wave-02-internal-adversarial-review.mjs';

const base = loadInternalAdversarialReviewContext();
assert.deepEqual(validateInternalAdversarialReview(base), [], 'canonical internal adversarial review must validate');

const mutations = [
  ['claim external review authority', (c) => { c.review.review_contract.is_external_review = true; }],
  ['count as second-party review', (c) => { c.review.review_contract.counts_as_second_party_review = true; }],
  ['grant canonical-change authority', (c) => { c.review.review_contract.may_change_canonical_disposition = true; }],
  ['disable nonblocking continuation', (c) => { c.review.review_contract.continues_without_external_participation = false; }],
  ['manufacture one external review', (c) => { c.review.counts.external_reviews = 1; }],
  ['manufacture one canonical change', (c) => { c.review.counts.canonical_disposition_changes = 1; }],
  ['drop one packet', (c) => { c.review.records.pop(); }],
  ['duplicate one packet', (c) => { c.review.records[1].packet_id = c.review.records[0].packet_id; }],
  ['drift a packet digest', (c) => { c.review.records[0].packet_sha256 = '0'.repeat(64); }],
  ['drift a canonical disposition', (c) => { c.review.records[0].canonical_disposition = 'supported_bounded_compact'; }],
  ['erase the strongest null', (c) => { c.review.records[0].strongest_null = 'weak'; }],
  ['erase the overclaim attack', (c) => { c.review.records[0].overclaim_attack = 'weak'; }],
  ['erase the decisive discriminator', (c) => { c.review.records[0].decisive_discriminator = 'weak'; }],
  ['authorize a record-level canonical change', (c) => { c.review.records[0].canonical_change_authorized = true; }],
  ['count a record as external review', (c) => { c.review.records[0].counts_as_external_review = true; }],
  ['clear publication', (c) => { c.review.records[0].publication_effect = 'cleared'; }],
  ['create a graph effect', (c) => { c.review.records[0].graph_effect = 'edge_created'; }],
  ['advance adoption', (c) => { c.review.records[0].adoption_effect = 'A1'; }],
  ['inflate high-priority acquisition count', (c) => { c.review.records[0].acquisition_priority = 'high'; }],
  ['erase the taxonomy recommendation', (c) => { c.review.records[7].recommended_disposition = 'ordinary_patriotic_or_industrial_policy'; }],
  ['erase the negative control', (c) => { c.review.records[5].adversarial_result = 'affirmed_with_existing_ceiling'; }],
  ['make external participation a dependency', (c) => { c.review.recommendations.external_participation_dependency = true; }],
  ['let recommendations rewrite canon', (c) => { c.review.boundaries.recommendation_rewrites_canonical_disposition = true; }],
  ['turn stranger recruitment into project dependency', (c) => { c.policy.laws.stranger_recruitment_is_project_dependency = true; }],
  ['allow absence to suspend work', (c) => { c.policy.laws.absence_must_not_suspend_project_work = false; }],
  ['allow asking the user to find strangers', (c) => { c.policy.operator_contract.may_ask_user_to_find_strangers_as_a_project_gate = true; }],
  ['drift the release digest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }],
  ['manufacture report-level external review', (c) => { c.report.parent_review.second_party_reviewed = 1; }],
  ['erase the HTML boundary banner', (c) => { c.html = c.html.replace('0 EXTERNAL REVIEWS', '1 EXTERNAL REVIEW'); }],
  ['drift parent release custody', (c) => { c.review.parent_review.release_sha256 = 'a'.repeat(64); }]
];

for (const [label, mutate] of mutations) {
  const candidate = structuredClone(base);
  mutate(candidate);
  const errors = validateInternalAdversarialReview(candidate);
  assert.ok(errors.length > 0, `mutation should fail closed: ${label}`);
}

console.log(`status-sovereignty-wave-02-internal-adversarial-review.test: ${mutations.length} adversarial mutations PASS`);
