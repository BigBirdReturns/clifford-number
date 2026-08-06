#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_PR = 1227;
export const PATHS = Object.freeze({
  fieldContract: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/field-matrix-contract.json',
  intakeManifest: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/intake-product-manifest.json',
  sourceProtocol: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/source-census-protocol.json',
  sourceReceipt: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/source-census-execution-receipt.json',
  candidateIndex: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/candidate-adjudication/index.json',
  candidateDir: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/candidate-adjudication',
  officialProtocol: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/official-body-observation-protocol.json',
  officialObservations: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/official-body-observations.jsonl',
  sourceManifest: 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/candidate-and-official-observation-manifest.json',
  matrix: 'data/research/status-sovereignty-rd-wave03-rd05-member-participation/terminal-field-matrix.json',
  summary: 'data/research/status-sovereignty-rd-wave03-rd05-member-participation/summary.json',
  classReceipt: 'data/research/status-sovereignty-rd-wave03-rd05-member-participation/class-receipt.json',
  manifest: 'data/research/status-sovereignty-rd-wave03-rd05-member-participation/manifest.json',
  closure: 'data/project/ssc-residual-wave03/closures/RD-05-C02.json',
});

export const REQUIRED_FIELDS = Object.freeze([
  'canonical_member_identity_and_affiliation',
  'meeting_attendance_state',
  'recorded_vote_state_and_vote_identity',
  'dissent_concurrence_or_separate_statement_state',
  'subcommittee_assignment_and_role',
  'agenda_setting_or_chair_authority',
  'information_access_or_briefing_custody_where_public',
  'recommendation_drafting_or_authorship_custody',
  'source_identities_and_exact_custody',
  'field_and_member_terminal_state',
]);

export const SUBCOMMITTEES = Object.freeze({"ACES-MEMBER-03": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-04": [{"role": "chair", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}], "ACES-MEMBER-05": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}], "ACES-MEMBER-06": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-07": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-08": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}], "ACES-MEMBER-09": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}], "ACES-MEMBER-10": [{"representative": "Amber Charlesworth", "role": "represented_member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}, {"representative": "Josef Koller", "role": "represented_member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-11": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-12": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-13": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-14": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-15": [{"role": "chair", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}], "ACES-MEMBER-16": [{"role": "chair", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY", "subcommittee_id": "space_sustainability"}], "ACES-MEMBER-17": [{"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING", "subcommittee_id": "private_remote_sensing_licensing"}, {"role": "member", "source_route_id": "RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION", "subcommittee_id": "commercial_space_mission_authorization"}]});
export const CHAIR_AUTHORITIES = Object.freeze({"ACES-MEMBER-01": {"role": "chair", "scope": "committee", "source_route_ids": ["RD05-W03-SHARED-APPOINTMENT", "RD05-W03-SHARED-ROSTER", "RD05-W03-SHARED-MEETING-2024-10-03"]}, "ACES-MEMBER-02": {"role": "vice_chair", "scope": "committee", "source_route_ids": ["RD05-W03-SHARED-APPOINTMENT", "RD05-W03-SHARED-ROSTER", "RD05-W03-SHARED-MEETING-2024-10-03"]}, "ACES-MEMBER-04": {"role": "chair", "scope": "commercial_space_mission_authorization_subcommittee", "source_route_ids": ["RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION"]}, "ACES-MEMBER-15": {"role": "chair", "scope": "private_remote_sensing_licensing_subcommittee", "source_route_ids": ["RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING"]}, "ACES-MEMBER-16": {"role": "chair", "scope": "space_sustainability_subcommittee", "source_route_ids": ["RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY"]}});

const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readJsonl = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\n/).filter(Boolean).map(line => JSON.parse(line));
const canonical = value => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const fileReceipt = (base, rel) => {
  const data = fs.readFileSync(path.join(base, rel));
  return { path: rel, bytes: data.length, sha256: sha256(data) };
};
const candidateRoute = (unitOrdinal, queryClass) => `RD05-W03-${String(unitOrdinal).padStart(2, '0')}-${({
  meeting_attendance_state: 'ATTENDANCE',
  recorded_vote_state_and_vote_identity: 'VOTE',
  dissent_concurrence_or_separate_statement_state: 'DISSENT',
  subcommittee_assignment_and_role: 'SUBCOMMITTEE',
  agenda_setting_or_chair_authority: 'AGENDA-AUTHORITY',
  information_access_or_briefing_custody_where_public: 'INFORMATION-ACCESS',
  recommendation_drafting_or_authorship_custody: 'AUTHORSHIP',
}[queryClass])}`;

function observed(value, sourceIds, note, custodyPaths = []) {
  return { state: 'observed', value, source_ids: sourceIds, custody_paths: custodyPaths, note, fixed_protocol_complete: true, terminal_for_class_closure: true };
}
function missing(field, unit, sourceIds, note) {
  return {
    state: 'not_publicly_recovered',
    value: {
      public_record_state: 'not_publicly_recovered_after_fixed_protocol',
      searched_candidate_route_id: candidateRoute(unit.unit_ordinal, field),
      event_absence_inferred: false,
      nonparticipation_inferred: false,
    },
    source_ids: sourceIds,
    custody_paths: [PATHS.sourceReceipt, PATHS.candidateIndex, PATHS.officialObservations],
    note,
    fixed_protocol_complete: true,
    terminal_for_class_closure: true,
  };
}

export function buildAll() {
  const contract = readJson(PATHS.fieldContract);
  const intakeManifest = readJson(PATHS.intakeManifest);
  const sourceProtocol = readJson(PATHS.sourceProtocol);
  const sourceReceipt = readJson(PATHS.sourceReceipt);
  const candidateIndex = readJson(PATHS.candidateIndex);
  const officialProtocol = readJson(PATHS.officialProtocol);
  const observations = readJsonl(PATHS.officialObservations);
  assert.deepEqual(contract.required_fields, REQUIRED_FIELDS);
  assert.equal(contract.units.length, 17);
  assert.equal(sourceReceipt.fixed_routes, 161);
  assert.equal(sourceReceipt.candidate_rows, 1351);
  assert.equal(candidateIndex.counts.terminal_candidate_dispositions, 1351);
  assert.equal(candidateIndex.counts.selected_candidate_followups, 0);
  assert.equal(officialProtocol.declared_official_body_rows, 25);
  assert.equal(observations.length, 25);

  const sourceBase = path.join(ROOT, 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation');
  const sourceEntries = [
    fileReceipt(sourceBase, 'source-census-execution-receipt.json'),
    fileReceipt(sourceBase, 'candidate-adjudication/index.json'),
    ...candidateIndex.candidate_parts.map(part => fileReceipt(sourceBase, `candidate-adjudication/${part.path}`)),
    fileReceipt(sourceBase, 'official-body-observation-protocol.json'),
    fileReceipt(sourceBase, 'official-body-observations.jsonl'),
  ];
  const sourceManifest = {
    schema_version: 'ssc-rd05-wave03-candidate-and-official-observation-manifest@1',
    entries: sourceEntries,
    entry_count: sourceEntries.length,
    combined_sha256: sha256(Buffer.from(sourceEntries.map(row => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n'))),
    candidate_rows: 1351,
    terminal_candidate_dispositions: 1351,
    selected_candidate_followups: 0,
    official_body_observations: 25,
    admitted_candidate_sources: 0,
    result_spawned_requests: 0,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };

  const rows = contract.units.map(unit => {
    const profileRoute = `RD05-W03-${String(unit.unit_ordinal).padStart(2, '0')}-PROFILE`;
    const fields = {};
    fields.canonical_member_identity_and_affiliation = observed({
      unit_id: unit.unit_id,
      canonical_name: unit.canonical_name,
      display_name: unit.display_name,
      affiliation: unit.affiliation,
      appointment_capacity: unit.appointment_capacity,
      leadership_role: unit.leadership_role,
      term_end: unit.term_end,
      profile_url: unit.profile_url,
      identity_state: unit.identity_state,
    }, ['RD05-W03-SHARED-ROSTER', profileRoute], 'The exact official roster and member profile establish the published member identity, affiliation, capacity, term, and leadership label only.');
    fields.meeting_attendance_state = missing('meeting_attendance_state', unit, ['RD05-W03-SHARED-MEETING-2024-10-03', 'RD05-W03-SHARED-MEETING-2025-03'], 'A call-to-order or roll-call agenda item and a generic statement that committee members met in person do not establish this member’s attendance.');
    fields.recorded_vote_state_and_vote_identity = missing('recorded_vote_state_and_vote_identity', unit, [], 'No member-specific roll-call vote or vote identity was publicly recovered. Attendance would not establish a vote.');
    fields.dissent_concurrence_or_separate_statement_state = missing('dissent_concurrence_or_separate_statement_state', unit, [], 'No member-specific dissent, concurrence, or separate statement was publicly recovered. No recorded dissent is not unanimity.');
    if (SUBCOMMITTEES[unit.unit_id]) {
      const assignments = SUBCOMMITTEES[unit.unit_id];
      fields.subcommittee_assignment_and_role = observed({ assignments }, [...new Set(assignments.map(row => row.source_route_id))], 'The exact official subcommittee membership lists establish assignment and published role only; assignment does not establish attendance, vote, or recommendation authorship.');
    } else {
      fields.subcommittee_assignment_and_role = missing('subcommittee_assignment_and_role', unit, ['RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING', 'RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION', 'RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY'], 'The three exact official subcommittee lists do not publicly recover a member-specific assignment for this unit; this is not proof that no informal work occurred.');
    }
    if (CHAIR_AUTHORITIES[unit.unit_id]) {
      fields.agenda_setting_or_chair_authority = observed(CHAIR_AUTHORITIES[unit.unit_id], CHAIR_AUTHORITIES[unit.unit_id].source_route_ids, 'The published committee or subcommittee chair label establishes the bounded chair-authority surface only; it does not establish unilateral agenda control, adoption, or authorship.');
    } else {
      fields.agenda_setting_or_chair_authority = missing('agenda_setting_or_chair_authority', unit, ['RD05-W03-SHARED-MEETING-2024-10-03'], 'No member-specific chair or agenda-setting authority was publicly recovered. An agenda item does not identify who authored or controlled it.');
    }
    fields.information_access_or_briefing_custody_where_public = missing('information_access_or_briefing_custody_where_public', unit, ['RD05-W03-SHARED-MEETING-2024-10-03', 'RD05-W03-SHARED-MEETING-2025-03'], 'Public webinar access, presentation links, or a planned briefing do not establish this member’s receipt of equal or particular information.');
    fields.recommendation_drafting_or_authorship_custody = missing('recommendation_drafting_or_authorship_custody', unit, ['RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING', 'RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION', 'RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY'], 'A subcommittee mandate to research and draft recommendations and a member assignment do not establish individual drafting or authorship.');
    fields.source_identities_and_exact_custody = observed({
      source_census_workflow_run: sourceReceipt.workflow_run,
      source_census_artifact_id: sourceReceipt.artifact_id,
      source_census_artifact_zip_sha256: sourceReceipt.artifact_zip_sha256,
      profile_route_id: profileRoute,
      profile_url: unit.profile_url,
      fixed_routes: sourceReceipt.fixed_routes,
      candidate_rows: sourceReceipt.candidate_rows,
      selected_candidate_followups: 0,
    }, [profileRoute], 'Exact route, body, header, artifact, candidate-disposition, and official-observation custody is retained without committing raw bodies or admitting search-result rows.', [PATHS.sourceReceipt, PATHS.sourceManifest]);
    const preTerminalStates = Object.values(fields).map(field => field.state);
    const preObserved = preTerminalStates.filter(state => state === 'observed').length;
    const preMissing = preTerminalStates.filter(state => state === 'not_publicly_recovered').length;
    assert.equal(preObserved + preMissing, 9);
    fields.field_and_member_terminal_state = observed({
      required_fields: 10,
      terminal_fields: 10,
      observed_fields: preObserved + 1,
      not_publicly_recovered_fields: preMissing,
      member_terminal_state: 'bounded_source_unavailable',
      member_closed: true,
      class_terminal_state: 'bounded_source_unavailable',
    }, [], 'All ten required fields are explicitly typed. Member closure records the fixed public-record acquisition boundary and does not assert event nonoccurrence.', [PATHS.fieldContract, PATHS.sourceManifest]);
    const stateCounts = Object.values(fields).reduce((acc, field) => ((acc[field.state] = (acc[field.state] ?? 0) + 1), acc), {});
    return {
      unit_id: unit.unit_id,
      unit_ordinal: unit.unit_ordinal,
      canonical_name: unit.canonical_name,
      fields,
      member_result: {
        fixed_protocol_executed: true,
        required_fields: 10,
        terminal_fields: 10,
        state_counts: stateCounts,
        member_terminal_state: 'bounded_source_unavailable',
        member_closed: true,
      },
    };
  });
  const states = rows.flatMap(row => Object.values(row.fields).map(field => field.state));
  const observedFields = states.filter(state => state === 'observed').length;
  const missingFields = states.filter(state => state === 'not_publicly_recovered').length;
  assert.equal(rows.length, 17);
  assert.equal(states.length, 170);
  assert.equal(observedFields, 71);
  assert.equal(missingFields, 99);

  const counts = {
    member_rows: 17,
    required_fields_per_member: 10,
    required_fields: 170,
    terminal_fields: 170,
    observed_fields: 71,
    not_publicly_recovered_fields: 99,
    closed_members: 17,
    fixed_routes: 161,
    route_attempts: 161,
    http_success_routes: 161,
    exact_official_routes: 25,
    official_body_observations: 25,
    candidate_census_routes: 136,
    candidate_rows: 1351,
    terminal_candidate_dispositions: 1351,
    selected_candidate_followups: 0,
    admitted_candidate_sources: 0,
    observed_identity_fields: 17,
    observed_subcommittee_fields: 15,
    observed_chair_authority_fields: 5,
    observed_source_custody_fields: 17,
    observed_terminal_state_fields: 17,
    observed_attendance_fields: 0,
    observed_vote_fields: 0,
    observed_dissent_fields: 0,
    observed_information_access_fields: 0,
    observed_authorship_fields: 0,
    external_contacts: 0,
    external_reviews: 0,
  };
  const currentResult = {
    terminal_state: 'bounded_source_unavailable',
    fixed_protocol_complete: true,
    class_closed: true,
    all_seventeen_members_preserved: true,
    all_one_hundred_seventy_fields_terminal: true,
    candidate_results_admitted: 0,
    missing_records_are_event_absence: false,
    roster_membership_is_attendance: false,
    attendance_is_vote: false,
    subcommittee_assignment_is_authorship: false,
    no_recorded_dissent_is_unanimity: false,
    reviewed_disposition_changed: false,
    outside_human_dependency: false,
    project_blocking: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
  const authority = {
    outside_human_dependency: false,
    external_contacts: 0,
    external_reviews: 0,
    denominator_widened: false,
    reviewed_disposition_changed: false,
    participation_finding: false,
    vote_finding: false,
    dissent_or_unanimity_finding: false,
    information_asymmetry_finding: false,
    recommendation_authorship_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
  const matrix = {
    schema_version: 'ssc-rd05-wave03-member-participation-terminal-matrix@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-05', class_id: 'RD-05-C02', issue: 1018,
    class_label: 'member-specific votes, dissents, subcommittee assignments, agenda control, information access, and recommendation authorship',
    status: 'seventeen_member_one_hundred_seventy_cell_matrix_terminal_bounded_source_unavailable',
    as_of: '2026-08-05',
    source_product: {
      constitution_merge: contract.constitution_merge,
      wave03_current_ledger_merge_at_design: contract.wave03_current_ledger_merge_at_design,
      intake_head: 'bc9800dcd3a3768288a5dfeaf0f7144969994ffa',
      field_matrix_contract_path: PATHS.fieldContract,
      intake_manifest_path: PATHS.intakeManifest,
      source_protocol_path: PATHS.sourceProtocol,
      source_census_receipt_path: PATHS.sourceReceipt,
      source_census_artifact_zip_sha256: sourceReceipt.artifact_zip_sha256,
      candidate_and_observation_manifest_path: PATHS.sourceManifest,
      candidate_and_observation_manifest_combined_sha256: sourceManifest.combined_sha256,
    },
    permitted_field_states: ['observed', 'not_publicly_recovered'],
    required_fields: REQUIRED_FIELDS,
    members: rows,
    counts,
    current_result: currentResult,
    boundaries: {
      roster_membership_is_meeting_attendance: false,
      attendance_is_recorded_vote: false,
      agenda_item_is_adopted_recommendation: false,
      subcommittee_assignment_is_recommendation_authorship: false,
      no_recorded_dissent_is_unanimity: false,
      public_webinar_is_equal_information_access: false,
      committee_termination_is_suppression: false,
      representation_is_neutrality_tokenism_or_effective_counterpower: false,
      missing_public_record_is_nonoccurrence: false,
      search_result_is_evidence: false,
      class_closure_is_lane_or_wave_completion: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
    },
    authority,
  };
  const summary = {
    schema_version: 'ssc-rd05-wave03-member-participation-summary@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-05', class_id: 'RD-05-C02', issue: 1018,
    terminal_state: 'bounded_source_unavailable', class_closed: true, counts, current_result: currentResult, authority,
  };
  const classReceipt = {
    schema_version: 'ssc-rd05-wave03-class-receipt@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-05', class_id: 'RD-05-C02', issue: 1018,
    source_pr: SOURCE_PR,
    class_label: 'member-specific votes, dissents, subcommittee assignments, agenda control, information access, and recommendation authorship',
    terminal_state: 'bounded_source_unavailable', class_closed: true,
    closure_basis: [
      'the immutable denominator preserves all seventeen published ACES member rows and ten non-collapsible required fields per member',
      'the fixed 161-route source census completed once, preserving 1,351 candidate rows and twenty-five exact official bodies with zero result-spawned requests',
      'all 1,351 search-result candidates are terminally disposed because none contains the exact normalized member name in title, description, or URL; no candidate page was requested or admitted',
      'the exact official roster, profiles, and subcommittee lists support seventy-one bounded observed cells: seventeen identity, fifteen subcommittee-assignment, five chair-authority, seventeen source-custody, and seventeen terminal-state cells',
      'the remaining ninety-nine cells are explicitly not publicly recovered rather than converted into nonparticipation, no vote, no dissent, equal access, or no authorship findings',
      'all one hundred seventy cells are terminally typed and all seventeen members are closed only for the declared fixed public-record acquisition obligation',
    ],
    counts,
    source_custody: {
      intake_head: 'bc9800dcd3a3768288a5dfeaf0f7144969994ffa',
      source_census_workflow_run: sourceReceipt.workflow_run,
      source_census_artifact_id: sourceReceipt.artifact_id,
      source_census_artifact_zip_sha256: sourceReceipt.artifact_zip_sha256,
      source_census_capture_manifest_sha256: sourceReceipt.capture_manifest_combined_sha256,
      candidate_and_observation_manifest_path: PATHS.sourceManifest,
      candidate_and_observation_manifest_combined_sha256: sourceManifest.combined_sha256,
    },
    unresolved_limit: {
      not_publicly_recovered_fields: 99,
      selected_candidate_followups: 0,
      candidate_page_requests: 0,
      missing_records_are_not_event_absence: true,
      no_recorded_dissent_is_not_unanimity: true,
      subcommittee_assignment_is_not_authorship: true,
      automatic_additional_search_pass_authorized: false,
    },
    authority,
  };
  const researchBase = path.join(ROOT, 'data/research/status-sovereignty-rd-wave03-rd05-member-participation');
  const matrixBytes = Buffer.from(canonical(matrix));
  const summaryBytes = Buffer.from(canonical(summary));
  const receiptBytes = Buffer.from(canonical(classReceipt));
  const manifestEntries = [
    { path: 'terminal-field-matrix.json', bytes: matrixBytes.length, sha256: sha256(matrixBytes) },
    { path: 'summary.json', bytes: summaryBytes.length, sha256: sha256(summaryBytes) },
    { path: 'class-receipt.json', bytes: receiptBytes.length, sha256: sha256(receiptBytes) },
  ];
  const manifest = {
    schema_version: 'ssc-rd05-wave03-terminal-product-manifest@1',
    entries: manifestEntries,
    entry_count: manifestEntries.length,
    combined_sha256: sha256(Buffer.from(manifestEntries.map(row => `${row.path}\0${row.bytes}\0${row.sha256}`).join('\n'))),
  };
  const closure = {
    schema_version: 'ssc-residual-denominator-wave03-class-closure-reference@1',
    wave_issue: 1013, child_issue: 1018, source_pr: SOURCE_PR,
    lane_id: 'RD-05', class_id: 'RD-05-C02',
    exact_label: 'member-specific votes, dissents, subcommittee assignments, agenda control, information access, and recommendation authorship',
    terminal_state: 'bounded_source_unavailable', class_closed: true,
    product: {
      root: 'data/research/status-sovereignty-rd-wave03-rd05-member-participation',
      manifest_path: PATHS.manifest,
      manifest_combined_sha256: manifest.combined_sha256,
      class_receipt_path: PATHS.classReceipt,
    },
    source_custody: {
      source_census_receipt_path: PATHS.sourceReceipt,
      source_census_artifact_id: sourceReceipt.artifact_id,
      source_census_artifact_zip_sha256: sourceReceipt.artifact_zip_sha256,
      candidate_and_observation_manifest_path: PATHS.sourceManifest,
      candidate_and_observation_manifest_combined_sha256: sourceManifest.combined_sha256,
      fixed_routes: 161, candidate_rows: 1351, official_body_observations: 25,
    },
    authority,
    residual_atlas_effect_if_promoted: {
      canonical_classes: 42, open_before: 33, closed_before: 9, open_after: 32, closed_after: 10,
      wave03_selected_attempts_terminal_after_promotion: 4, wave_complete: false,
    },
  };
  return { sourceManifest, matrix, summary, classReceipt, manifest, closure };
}

const OUTPUTS = {
  sourceManifest: PATHS.sourceManifest,
  matrix: PATHS.matrix,
  summary: PATHS.summary,
  classReceipt: PATHS.classReceipt,
  manifest: PATHS.manifest,
  closure: PATHS.closure,
};
export function writeAll() {
  const built = buildAll();
  for (const [key, rel] of Object.entries(OUTPUTS)) {
    const target = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, canonical(built[key]));
  }
}
export function checkAll() {
  const built = buildAll();
  for (const [key, rel] of Object.entries(OUTPUTS)) {
    assert.equal(fs.readFileSync(path.join(ROOT, rel), 'utf8'), canonical(built[key]), `${rel}: deterministic drift`);
  }
  return built;
}
if (process.argv.includes('--write')) writeAll();
else if (process.argv.includes('--check')) checkAll();
else console.log(JSON.stringify(buildAll().summary, null, 2));
