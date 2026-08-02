#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeInternalAdversarialReviewManifest } from './build-status-sovereignty-wave-02-internal-adversarial-review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadInternalAdversarialReviewContext() {
  return {
    review: read('data/research/status-sovereignty-wave-02-internal-adversarial-review.json'),
    parent: read('data/research/status-sovereignty-wave-02-maintainer-review.json'),
    packets: read('data/project/status-sovereignty-wave-02-second-party-review-packet-registry.json'),
    policy: read('data/project/no-magic-human-gate.json'),
    manifest: read('data/project/status-sovereignty-wave-02-internal-adversarial-review-release-manifest.json'),
    report: read('reports/core-thesis/status-sovereignty/wave-02-internal-adversarial-review/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-02-internal-adversarial-review/index.html'), 'utf8')
  };
}

export function validateInternalAdversarialReview(context = loadInternalAdversarialReviewContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  const { review, parent, packets, policy, manifest, report, html } = context;
  const contract = review.review_contract ?? {};

  eq(review.schema_version, 'status-sovereignty-wave-02-internal-adversarial-review@1', 'review schema');
  eq(review.hypothesis_id, 'SSC-H01', 'hypothesis identity');
  eq(review.wave_id, 'SSC-W02', 'wave identity');
  eq(review.review_id, 'SSC-W02-IAR01', 'review identity');
  eq(review.status, 'complete_internal_adversarial_counterreview_zero_external_authority', 'review status');
  eq(review.parent_review?.review_id, parent.review_id, 'parent review identity');
  eq(review.parent_review?.path, 'data/research/status-sovereignty-wave-02-maintainer-review.json', 'parent review path');
  eq(review.parent_review?.packets, 8, 'parent packet denominator');
  eq(review.parent_review?.release_sha256, packets.parent_review_release_sha256, 'parent review release custody');

  eq(contract.authority, 'internal_machine_assisted_adversarial_counterreview', 'review authority');
  eq(contract.roles?.length, 3, 'adversarial role denominator');
  eq(new Set(contract.roles ?? []).size, 3, 'adversarial roles must be unique');
  eq(contract.is_external_review, false, 'external-review boundary');
  eq(contract.counts_as_second_party_review, false, 'second-party boundary');
  eq(contract.counts_as_adjudication, false, 'adjudication boundary');
  eq(contract.may_recommend_authority_narrowing, true, 'authority-narrowing permission');
  eq(contract.may_recommend_taxonomy_change, true, 'taxonomy recommendation permission');
  eq(contract.may_change_canonical_disposition, false, 'canonical disposition authority');
  eq(contract.may_clear_publication, false, 'publication authority');
  eq(contract.may_create_graph_effect, false, 'graph authority');
  eq(contract.may_advance_adoption, false, 'adoption authority');
  eq(contract.continues_without_external_participation, true, 'nonblocking continuation');

  const expectedCounts = {
    packets: 8,
    internal_counterreviews: 8,
    canonical_disposition_changes: 0,
    authority_narrowing_recommendations: 1,
    taxonomy_change_recommendations: 1,
    high_priority_acquisition_designs: 3,
    bounded_non_link_controls: 1,
    bounded_counterpower_controls: 1,
    external_contacts: 0,
    external_reviews: 0,
    adjudications: 0,
    publication_clearances: 0,
    graph_effects: 0
  };
  for (const [key, value] of Object.entries(expectedCounts)) eq(review.counts?.[key], value, `count ${key}`);

  eq(review.records?.length, 8, 'counter-review record denominator');
  const parentByObservation = new Map((parent.reviewed_observations ?? []).map((row) => [row.observation_id, row]));
  const packetById = new Map((packets.packets ?? []).map((row) => [row.packet_id, row]));
  const recordIds = new Set();
  const packetIds = new Set();
  const observationIds = new Set();

  for (const row of review.records ?? []) {
    check(/^SSC-W02-IAR-\d{4}$/.test(row.counterreview_id ?? ''), `invalid counter-review id: ${row.counterreview_id}`);
    check(!recordIds.has(row.counterreview_id), `duplicate counter-review id: ${row.counterreview_id}`);
    recordIds.add(row.counterreview_id);
    check(!packetIds.has(row.packet_id), `duplicate packet counter-review: ${row.packet_id}`);
    packetIds.add(row.packet_id);
    check(!observationIds.has(row.observation_id), `duplicate observation counter-review: ${row.observation_id}`);
    observationIds.add(row.observation_id);

    const packet = packetById.get(row.packet_id);
    const parentRow = parentByObservation.get(row.observation_id);
    check(Boolean(packet), `packet missing from registry: ${row.packet_id}`);
    check(Boolean(parentRow), `observation missing from maintainer review: ${row.observation_id}`);
    if (packet) {
      eq(row.observation_id, packet.observation_id, `${row.packet_id} observation custody`);
      eq(row.lane_id, packet.lane_id, `${row.packet_id} lane custody`);
      eq(row.packet_sha256, packet.review_packet_sha256, `${row.packet_id} packet digest`);
      eq(packet.valid_review_count, 0, `${row.packet_id} external review zero`);
    }
    if (parentRow) eq(row.canonical_disposition, parentRow.reviewed_disposition, `${row.observation_id} canonical disposition custody`);

    check(typeof row.strongest_null === 'string' && row.strongest_null.length >= 60, `${row.counterreview_id} strongest-null attack is underdeveloped`);
    check(typeof row.overclaim_attack === 'string' && row.overclaim_attack.length >= 60, `${row.counterreview_id} overclaim attack is underdeveloped`);
    check(typeof row.decisive_discriminator === 'string' && row.decisive_discriminator.length >= 60, `${row.counterreview_id} discriminator is underdeveloped`);
    check(typeof row.counterreview_finding === 'string' && row.counterreview_finding.length >= 60, `${row.counterreview_id} finding is underdeveloped`);
    check(['none_for_current_disposition', 'medium', 'high'].includes(row.acquisition_priority), `${row.counterreview_id} acquisition priority is invalid`);

    eq(row.canonical_change_authorized, false, `${row.counterreview_id} canonical-change authority`);
    eq(row.counts_as_external_review, false, `${row.counterreview_id} external-review authority`);
    eq(row.publication_effect, 'none', `${row.counterreview_id} publication effect`);
    eq(row.graph_effect, 'none', `${row.counterreview_id} graph effect`);
    eq(row.adoption_effect, 'none', `${row.counterreview_id} adoption effect`);
  }

  eq(review.records?.filter((row) => row.acquisition_priority === 'high').length, 3, 'high-priority acquisition denominator');
  eq(review.records?.filter((row) => row.adversarial_result === 'authority_narrowing_recommended').length, 1, 'authority-narrowing denominator');
  eq(review.records?.filter((row) => row.adversarial_result === 'taxonomy_change_recommended').length, 1, 'taxonomy-change denominator');
  eq(review.records?.find((row) => row.observation_id === 'SSC-OBS-0020')?.adversarial_result, 'affirmed_strong_negative_control', 'negative-control custody');
  eq(review.records?.find((row) => row.observation_id === 'SSC-OBS-0022')?.recommended_disposition, 'bounded_counterpower_control', 'counterpower taxonomy recommendation');

  eq(review.recommendations?.canonical_disposition_changes_now, 0, 'recommended canonical changes');
  eq(review.recommendations?.external_participation_dependency, false, 'external participation dependency');
  check(review.recommendations?.next_internal_actions?.length >= 4, 'internal action queue is incomplete');

  for (const [key, value] of Object.entries(review.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `review boundary ${key}`);
    else eq(value, false, `review boundary ${key}`);
  }

  eq(policy.laws?.stranger_recruitment_is_project_dependency, false, 'no-magic-human dependency law');
  eq(policy.laws?.external_participation_is_optional_evidence_lane, true, 'optional external evidence law');
  eq(policy.laws?.absence_must_not_suspend_project_work, true, 'non-suspension law');
  eq(policy.operator_contract?.on_absence, 'record zero and proceed', 'absence handling law');
  eq(policy.operator_contract?.may_ask_user_to_find_strangers_as_a_project_gate, false, 'user recruitment prohibition');

  const expectedManifest = computeInternalAdversarialReviewManifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'exact-byte release manifest');
  eq(report.schema_version, 'status-sovereignty-wave-02-internal-adversarial-review-report@1', 'report schema');
  eq(report.review?.review_id, review.review_id, 'report review identity');
  eq(report.parent_review?.second_party_reviewed, 0, 'report external review zero');
  eq(report.no_magic_human_gate?.absence_must_not_suspend_project_work, true, 'report nonblocking law');
  eq(report.release_manifest?.combined_sha256, manifest.combined_sha256, 'report release digest');
  check(html.includes('8 PACKETS · 8 INTERNAL COUNTER-REVIEWS · 0 EXTERNAL REVIEWS · 0 CANONICAL CHANGES'), 'HTML boundary banner missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');

  return errors;
}

function main() {
  const errors = validateInternalAdversarialReview();
  if (errors.length) {
    console.error(`validate-status-sovereignty-wave-02-internal-adversarial-review: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-wave-02-internal-adversarial-review: PASS — 8 internal counter-reviews, 0 external authority');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main();
