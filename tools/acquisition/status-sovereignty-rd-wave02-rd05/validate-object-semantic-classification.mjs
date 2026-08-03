import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { buildSemanticClassification } from './build-object-semantic-classification.mjs';

const ROOT = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition';
const OUTPUT_PATH = process.env.RD05_SEMANTIC_OUTPUT || `${ROOT}/object-semantic-classification.json`;

const EXPECTED_RECORD_CLASS_COUNTS = {
  agency_accomplishments_report_post: 1,
  agency_congressional_testimony_post: 1,
  agency_forum_announcement: 1,
  agency_legal_authority_reference_page: 1,
  agency_mission_authorization_briefing_pdf: 1,
  agency_overview_briefing_pdf: 1,
  agency_policy_announcement_post: 1,
  agency_policy_proposal_landing_page: 1,
  agency_procurement_pathfinder_announcement: 1,
  agency_regulatory_briefing_pdf: 1,
  agency_regulatory_meeting_record: 1,
  agency_resource_index: 1,
  agency_stakeholder_intake_page: 1,
  agency_tag_archive: 1,
  committee_charter_pdf: 1,
  committee_landing_and_lifecycle_page: 1,
  committee_meeting_announcement_post: 1,
  committee_meeting_event_page: 1,
  committee_meeting_index: 1,
  committee_meeting_recap_and_materials_page: 1,
  committee_member_profile: 17,
  committee_membership_appointment_announcement: 1,
  committee_membership_directory: 1,
  committee_membership_solicitation_announcement: 1,
  committee_subcommittee_scope_page: 3,
  federal_register_access_interstitial: 1,
  image_asset: 1,
  matched_control_board_landing_page: 1,
  matched_control_closed_meeting_event_page: 1,
  matched_control_committee_directory: 1,
  matched_control_documents_reports_index: 1,
  matched_control_meeting_guidance_page: 1,
  matched_control_nomination_process_page: 1,
  matched_control_outcome_reporting_guidance_page: 1,
  oembed_representation: 6
};

const EMBED_PRIMARY = {
  'RD05-OBJ-045': 'RD05-OBJ-002',
  'RD05-OBJ-046': 'RD05-OBJ-004',
  'RD05-OBJ-047': 'RD05-OBJ-005',
  'RD05-OBJ-048': 'RD05-OBJ-025',
  'RD05-OBJ-049': 'RD05-OBJ-029',
  'RD05-OBJ-050': 'RD05-OBJ-033'
};

const OPEN_CHAIN_IDS = ['RD05-OBJ-023', 'RD05-OBJ-024', 'RD05-OBJ-025', 'RD05-OBJ-029', 'RD05-OBJ-051'];
const ACTIVITY_ONLY_IDS = ['RD05-OBJ-004', 'RD05-OBJ-023', 'RD05-OBJ-024', 'RD05-OBJ-025', 'RD05-OBJ-029'];
const CONTROL_IDS = Array.from({ length: 7 }, (_, i) => `RD05-OBJ-${String(52 + i).padStart(3, '0')}`);

export function validateSemanticClassification(value) {
  const expected = buildSemanticClassification();
  assert.deepEqual(value, expected, 'deterministic semantic product');

  assert.equal(value.schema_version, 'ssc-rd05-wave02-object-semantic-classification@1');
  assert.equal(value.wave_id, 'SSC-RD-W02');
  assert.equal(value.class_id, 'RD-05-C03');
  assert.equal(value.issue, 790);
  assert.equal(value.status, 'all_frozen_objects_semantically_classified_successor_protocols_open');
  assert.equal(value.source_product.research_head, '74dc76adee359b7f4c6b58fa898d2ecf3c2c0222');
  assert.equal(value.source_product.capture_index_sha256, '01c4ca54b5bd82777d71984054b1a27418ce89bb484478c13456a05d1f2ba508');

  const contract = value.classification_contract;
  assert.equal(contract.all_frozen_objects_retained, true);
  assert.equal(contract.semantic_classification_does_not_expand_denominator, true);
  assert.equal(contract.representation_rows_remain_separate, true);
  assert.equal(contract.agenda_language_is_not_completed_recommendation, true);
  assert.equal(contract.drafting_mandate_is_not_completed_recommendation, true);
  assert.equal(contract.agency_material_is_not_committee_recommendation, true);
  assert.equal(contract.committee_termination_is_not_rejection_or_suppression, true);
  assert.equal(contract.successful_http_request_is_not_semantic_target_delivery, true);
  assert.equal(contract.matched_control_is_not_target_evidence, true);
  assert.equal(contract.missing_public_output_is_not_no_influence, true);
  assert.equal(contract.outside_human_dependency, false);

  const counts = value.counts;
  assert.equal(counts.object_denominator, 58);
  assert.equal(counts.aces_target_objects, 51);
  assert.equal(counts.matched_control_objects, 7);
  assert.equal(counts.semantic_classifications_complete, 58);
  assert.deepEqual(counts.record_class_counts, EXPECTED_RECORD_CLASS_COUNTS);
  assert.equal(counts.member_profile_rows, 17);
  assert.equal(counts.oembed_representation_rows, 6);
  assert.equal(counts.recommendation_activity_only_rows, 5);
  assert.equal(counts.completed_recommendation_objects, 0);
  assert.equal(counts.agency_response_objects, 0);
  assert.equal(counts.adopted_or_rejected_objects, 0);
  assert.equal(counts.implementation_or_outcome_objects, 0);
  assert.equal(counts.open_recommendation_disposition_chains, 5);
  assert.equal(counts.source_access_interstitial_rows, 1);
  assert.equal(counts.successor_action_rows, 8);
  assert.equal(counts.new_official_links_not_admitted, 495);
  assert.equal(counts.new_relevance_candidates_not_admitted, 76);

  const expectedIds = Array.from({ length: 58 }, (_, i) => `RD05-OBJ-${String(i + 1).padStart(3, '0')}`);
  assert.deepEqual(value.objects.map((o) => o.object_id), expectedIds);
  assert.equal(new Set(value.objects.map((o) => o.frozen_url)).size, 58);
  assert.equal(new Set(value.objects.map((o) => o.evidence.exact_body_sha256)).size, 58);

  for (const object of value.objects) {
    assert.deepEqual(Object.keys(object.fields), value.required_fields, `required fields ${object.object_id}`);
    assert.equal(object.fields.record_class_and_issuing_authority.terminal, true);
    assert.equal(object.fields.meeting_or_workstream_identity.terminal, true);
    assert.equal(object.fields.publication_and_operative_dates.terminal, true);
    assert.equal(object.fields.member_or_subcommittee_authorship.terminal, true);
    assert.equal(object.fields.exact_source_locator_and_byte_custody.terminal, true);
    assert.equal(object.fields.duplicate_supersession_or_archive_relationship.terminal, true);
    assert.equal(object.fields.terminal_record_state.terminal, true);
    assert.equal(object.fields.terminal_record_state.value.semantic_classification_complete, true);
    assert.equal(object.fields.recommendation_state.value.completed_recommendation_observed, false);
    assert.equal(object.fields.exact_source_locator_and_byte_custody.value.body_sha256, object.evidence.exact_body_sha256);
    assert.equal(object.fields.exact_source_locator_and_byte_custody.value.frozen_url, object.frozen_url);
  }

  const openIds = value.objects.filter((o) =>
    ['recommendation_state', 'agency_response_state', 'adoption_or_rejection_state', 'implementation_and_outcome_state']
      .some((field) => o.fields[field].terminal === false)
  ).map((o) => o.object_id);
  assert.deepEqual(openIds, OPEN_CHAIN_IDS);

  const activityIds = value.objects.filter((o) =>
    ['agenda_activity_only_canceled_before_event', 'agenda_activity_only_no_recommendation_text', 'drafting_mandate_only_no_work_product']
      .includes(o.fields.recommendation_state.value.status)
  ).map((o) => o.object_id);
  assert.deepEqual(activityIds, ACTIVITY_ONLY_IDS);

  const controls = value.objects.filter((o) => o.source_scope === 'matched_nsb_control');
  assert.deepEqual(controls.map((o) => o.object_id), CONTROL_IDS);
  for (const control of controls) {
    assert.equal(control.fields.recommendation_state.value.status, 'matched_control_not_target_evidence');
    assert.equal(control.fields.agency_response_state.state, 'matched_control_not_target_evidence');
  }

  const representations = value.objects.filter((o) => o.record_class === 'oembed_representation');
  assert.deepEqual(representations.map((o) => o.object_id), Object.keys(EMBED_PRIMARY));
  for (const representation of representations) {
    const relationship = representation.fields.duplicate_supersession_or_archive_relationship.value;
    assert.equal(relationship.relationship_type, 'oembed_representation');
    assert.equal(relationship.primary_object_id, EMBED_PRIMARY[representation.object_id]);
    assert.notEqual(relationship.primary_object_id, representation.object_id);
  }

  const canceledMeeting = value.objects.find((o) => o.object_id === 'RD05-OBJ-004');
  assert.equal(canceledMeeting.fields.recommendation_state.value.status, 'agenda_activity_only_canceled_before_event');
  assert.equal(canceledMeeting.fields.agency_response_state.state, 'not_applicable_canceled_event_no_completed_recommendation_object');
  assert.equal(canceledMeeting.fields.recommendation_state.note.includes('appears only as an agenda item'), true);

  const firstMeeting = value.objects.find((o) => o.object_id === 'RD05-OBJ-029');
  assert.equal(firstMeeting.fields.recommendation_state.value.status, 'agenda_activity_only_no_recommendation_text');
  assert.equal(firstMeeting.fields.recommendation_state.terminal, false);

  const interstitial = value.objects.find((o) => o.object_id === 'RD05-OBJ-051');
  assert.equal(interstitial.record_class, 'federal_register_access_interstitial');
  assert.equal(interstitial.fields.exact_source_locator_and_byte_custody.value.final_url, 'https://unblock.federalregister.gov/');
  assert.equal(interstitial.fields.recommendation_state.terminal, false);
  assert.equal(interstitial.successor_actions[0].action_type, 'retrieve_same_object_via_federal_register_api');

  const queue = value.successor_work_queues;
  assert.equal(queue.object_actions.length, 8);
  assert.deepEqual(
    queue.object_actions.map((a) => a.object_id),
    ['RD05-OBJ-001', 'RD05-OBJ-002', 'RD05-OBJ-023', 'RD05-OBJ-024', 'RD05-OBJ-025', 'RD05-OBJ-029', 'RD05-OBJ-040', 'RD05-OBJ-051']
  );
  assert.equal(queue.object_actions.every((a) => a.blocking === false), true);
  assert.equal(queue.nonadmitted_link_frontier.extraction_is_denominator_admission, false);
  assert.equal(queue.nonadmitted_link_frontier.new_official_links, 495);
  assert.equal(queue.nonadmitted_link_frontier.new_relevance_candidates, 76);

  assert.equal(value.current_result.all_frozen_objects_semantically_classified, true);
  assert.equal(value.current_result.recommendation_disposition_protocol_complete, false);
  assert.equal(value.current_result.complete_official_object_universe_frozen, false);
  assert.equal(value.current_result.class_closed, false);
  assert.equal(value.current_result.project_blocking, false);

  const authority = value.authority;
  assert.equal(authority.exact_byte_custody_complete, true);
  assert.equal(authority.semantic_classification_complete_for_frozen_objects, true);
  assert.equal(authority.completed_recommendations_observed, 0);
  assert.equal(authority.agency_responses_observed, 0);
  assert.equal(authority.adoptions_or_rejections_observed, 0);
  assert.equal(authority.implementations_or_outcomes_observed, 0);
  assert.equal(authority.external_contacts, 0);
  assert.equal(authority.external_reviews, 0);
  assert.equal(authority.outside_human_dependency, false);
  assert.equal(authority.publication_effect, 'none');
  assert.equal(authority.adoption_effect, 'none');
  assert.equal(authority.graph_effect, 'none');
  return true;
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
  const value = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  validateSemanticClassification(value);
  console.log('validate-rd05-object-semantics: PASS — 58 classified objects, 5 open chains, zero completed recommendations');
}
