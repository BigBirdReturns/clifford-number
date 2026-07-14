#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANE_ID = 'trump-office-business-capital';
const EXPECTED_MEMBERS = [
  'barack-obama',
  'bill-clinton',
  'donald-trump',
  'george-h-w-bush',
  'george-w-bush',
  'jimmy-carter',
  'joe-biden',
  'ronald-reagan',
];
const TARGET_SHAPED = /\b(donald|trump|tmtg|crypto|hotel)\b/i;

function issue(code, file, message) {
  return { code, file: file.replaceAll('\\', '/'), message };
}

function readJson(root, relativePath, errors) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')); }
  catch (error) {
    errors.push(issue('unreadable-officeholder-file', relativePath, error.message));
    return null;
  }
}

function sameMembers(members) {
  return JSON.stringify([...members].sort()) === JSON.stringify(EXPECTED_MEMBERS);
}

export function validateOfficeholderCohort({
  root = process.cwd(),
  cohortFile = 'data/canonical/us-presidential-officeholder-cohort.json',
  predicatesFile = 'data/canonical/officeholder-crossing-predicates.json',
  identifiersFile = 'data/research/openfec-presidential-identifiers.json',
  disclosuresFile = 'data/research/presidential-disclosure-source-coverage.json',
  selectionFile = 'data/canonical/corpus-selection.json',
  coverageFile = 'data/research/corpus-coverage.json',
  reviewsFile = 'data/research/selection-adversarial-reviews.json',
} = {}) {
  const errors = [];
  const cohort = readJson(root, cohortFile, errors);
  const registry = readJson(root, predicatesFile, errors);
  const identifiers = readJson(root, identifiersFile, errors);
  const disclosures = readJson(root, disclosuresFile, errors);
  const selection = readJson(root, selectionFile, errors);
  const coverage = readJson(root, coverageFile, errors);
  const reviews = readJson(root, reviewsFile, errors);
  if (!cohort || !registry || !identifiers || !disclosures || !selection || !coverage || !reviews) return { ok: false, errors };

  if (cohort.schema_version !== 'officeholder-cohort@1'
    || cohort.cohort_id !== 'us-presidents-eiga-era-1979-present'
    || cohort.enumeration_status !== 'source_complete_as_of_capture') {
    errors.push(issue('invalid-officeholder-cohort', cohortFile, 'Expected the dated, source-complete EIGA-era presidential cohort.'));
  }
  if (cohort.selection_rule?.office !== 'President of the United States'
    || cohort.selection_rule?.window_start !== '1979-01-01'
    || cohort.selection_rule?.unit !== 'distinct_person') {
    errors.push(issue('target-first-cohort-rule', cohortFile, 'Cohort membership must be determined by office, dated window, and distinct person before entity queries.'));
  }
  if (TARGET_SHAPED.test(JSON.stringify(cohort.selection_rule ?? {}))) {
    errors.push(issue('target-first-cohort-rule', cohortFile, 'The cohort selection rule contains a target-shaped term.'));
  }
  const memberIds = (cohort.members ?? []).map(member => member.person_id);
  if (cohort.expected_member_count !== 8 || cohort.members?.length !== 8
    || new Set(memberIds).size !== memberIds.length || !sameMembers(memberIds)) {
    errors.push(issue('incomplete-officeholder-cohort', cohortFile, 'The 2026-07-13 snapshot must enumerate all eight distinct presidents whose service intersects the window.'));
  }
  for (const member of cohort.members ?? []) {
    if (!Array.isArray(member.service_windows) || member.service_windows.length === 0
      || member.cohort_basis !== 'service_intersects_window') {
      errors.push(issue('invalid-cohort-member', cohortFile, `${member.person_id}: service window and cohort basis are required.`));
    }
  }
  if (!Array.isArray(cohort.sources) || cohort.sources.length < 3
    || !cohort.sources.some(source => source.source_id === 'nara-us-presidents-service-dates')
    || !cohort.sources.some(source => source.source_id === 'usc-5-13103')) {
    errors.push(issue('missing-cohort-authorities', cohortFile, 'Official service-roster and financial-disclosure authorities must be attached.'));
  }

  if (registry.schema_version !== 'officeholder-crossing-predicates@1'
    || registry.registry_id !== 'us-presidential-office-business-crossings@1'
    || registry.cohort_id !== cohort.cohort_id || registry.frozen_before_entity_queries !== true) {
    errors.push(issue('invalid-officeholder-predicate-registry', predicatesFile, 'Predicate registry must be frozen before entity queries and bound to the cohort.'));
  }
  const predicateIds = new Set();
  if (registry.predicates?.length !== 5) errors.push(issue('incomplete-officeholder-predicate-battery', predicatesFile, 'Exactly five role-neutral predicates are required.'));
  for (const predicate of registry.predicates ?? []) {
    if (!predicate.predicate_id || predicateIds.has(predicate.predicate_id)) errors.push(issue('duplicate-officeholder-predicate', predicatesFile, `Missing or duplicate predicate_id ${predicate.predicate_id}.`));
    predicateIds.add(predicate.predicate_id);
    if (predicate.application_scope !== 'every_cohort_member') errors.push(issue('asymmetric-officeholder-predicate', predicatesFile, `${predicate.predicate_id}: must apply to every cohort member.`));
    if (predicate.graph_effect !== 'none') errors.push(issue('officeholder-predicate-graph-effect', predicatesFile, `${predicate.predicate_id}: discovery predicate must have graph_effect none.`));
    if (TARGET_SHAPED.test(JSON.stringify(predicate))) errors.push(issue('target-shaped-officeholder-predicate', predicatesFile, `${predicate.predicate_id}: contains a target-specific instance instead of a role-neutral type.`));
    if (!Array.isArray(predicate.forbidden_inferences) || predicate.forbidden_inferences.length < 3) errors.push(issue('weak-officeholder-predicate-boundary', predicatesFile, `${predicate.predicate_id}: at least three forbidden inferences are required.`));
  }

  const resolvedPersonIds = (identifiers.identities ?? []).map(identity => identity.person_id);
  const candidateIds = (identifiers.identities ?? []).map(identity => identity.candidate_id);
  const committees = (identifiers.identities ?? []).flatMap(identity => identity.authorized_committees ?? []);
  const committeeIds = committees.map(committee => committee.committee_id);
  if (identifiers.schema_version !== 'openfec-presidential-identifiers@1'
    || identifiers.cohort_id !== cohort.cohort_id
    || identifiers.resolution_status !== 'source_resolved_pending_canonical_promotion'
    || identifiers.graph_effect !== 'none'
    || identifiers.evidence_state !== 'observed') {
    errors.push(issue('invalid-openfec-identifier-spine', identifiersFile, 'FEC identifier intake must remain observed, non-graph, and pending canonical promotion.'));
  }
  if (!sameMembers(resolvedPersonIds) || resolvedPersonIds.length !== 8
    || new Set(candidateIds).size !== 8 || !candidateIds.every(id => /^P\d{8}$/.test(id))) {
    errors.push(issue('incomplete-openfec-candidate-identifiers', identifiersFile, 'Exactly one official presidential candidate ID is required for every cohort member.'));
  }
  if (committees.length !== 37 || new Set(committeeIds).size !== 37 || !committeeIds.every(id => /^C\d{8}$/.test(id))) {
    errors.push(issue('incomplete-openfec-committee-identifiers', identifiersFile, 'The dated identifier snapshot must preserve all 37 authorized presidential campaign committee IDs observed on the cycle-specific official profiles.'));
  }
  for (const identity of identifiers.identities ?? []) {
    if (identity.official_profile_url !== `https://www.fec.gov/data/candidate/${identity.candidate_id}/`
      || !identity.authorized_committees?.length) {
      errors.push(issue('unreceipted-openfec-identity', identifiersFile, `${identity.person_id}: official candidate profile and at least one authorized committee are required.`));
    }
  }
  if (identifiers.coverage?.candidate_ids_observed !== 8
    || identifiers.coverage?.authorized_committee_ids_observed !== 37
    || identifiers.coverage?.schedule_b_queries_executed !== 0
    || identifiers.consumption?.contract_id !== 'public-topology-map@1') {
    errors.push(issue('dishonest-openfec-identifier-coverage', identifiersFile, 'Identifier coverage must report 8 candidates, 37 authorized presidential campaign committees, zero Schedule B queries, and the public consumption contract.'));
  }

  if (disclosures.schema_version !== 'presidential-disclosure-source-coverage@1'
    || disclosures.cohort_id !== cohort.cohort_id
    || disclosures.source_families?.length !== 4
    || disclosures.coverage?.member_source_cells !== 32
    || disclosures.coverage?.hashed_fec_cycle_archives !== 11
    || disclosures.coverage?.hashed_oge_documents !== 26
    || disclosures.coverage?.bulk_cycle_files_ingested !== 11
    || disclosures.coverage?.normalized_transaction_records !== 588535
    || disclosures.coverage?.unresolved_payee_candidates !== 46926
    || disclosures.coverage?.normalized_beneficial_interest_records !== 5945
    || disclosures.coverage?.transaction_dates_ocr_ambiguous !== 400
    || disclosures.coverage?.transaction_types_ocr_ambiguous !== 1107
    || disclosures.coverage?.unresolved_lexical_overlap_candidates !== 1172
    || disclosures.coverage?.temporal_candidates_overlapping !== 0
    || disclosures.coverage?.temporal_candidates_non_overlapping !== 132
    || disclosures.coverage?.temporal_candidates_unknown !== 1040
    || disclosures.coverage?.identity_review_queue !== 0
    || disclosures.coverage?.crossing_matches !== 0
    || disclosures.workflow_contract?.discovery_may_continue_with_pending_selection_review !== true
    || disclosures.workflow_contract?.intake_may_continue_without_openfec_api_key !== true
    || !disclosures.source_families?.some(source => source.source_id === 'fec-schedule-database-dumps' && source.access_mode === 'public_bulk_download_no_api_key')) {
    errors.push(issue('invalid-disclosure-source-spine', disclosuresFile, 'The 4-family/32-cell source matrix must preserve current FEC, OGE, payee, overlap, and zero-crossing counts while keeping discovery open when review or an API key is absent.'));
  }

  const lane = selection.lanes?.find(item => item.lane_id === LANE_ID);
  if (!lane || lane.neutral_universe?.cohort_id !== cohort.cohort_id
    || lane.neutral_universe?.predicate_registry_id !== registry.registry_id
    || lane.neutral_universe?.target_seed_effect !== 'routing_only'
    || lane.neutral_universe?.null_result_policy !== 'preserve_as_control_outcome') {
    errors.push(issue('lane-not-bound-to-neutral-universe', selectionFile, 'Officeholder lane must bind to the cohort and predicate registry; the named seed may only route discovery.'));
  }
  if (TARGET_SHAPED.test(lane?.selection_universe ?? '') || /declared candidate|declared.*identifiers/i.test(lane?.selection_universe ?? '')) {
    errors.push(issue('target-first-lane-universe', selectionFile, 'Lane selection universe remains target-first.'));
  }

  const review = reviews.reviews?.find(item => item.lane_id === LANE_ID);
  if (!review || review.status !== 'pending_second_party' || review.publication_status !== 'blocked' || review.reviewer_id !== null) {
    errors.push(issue('fabricated-independent-clearance', reviewsFile, 'AI-assisted attack must populate the review without clearing it or naming an independent reviewer.'));
  }
  if (review?.review_assistance?.independence_effect !== 'does_not_satisfy_second_party_clearance'
    || review?.boundary_attacks?.length < 2
    || !review.boundary_attacks.every(attack => attack.status === 'failed_current_definition')
    || !review?.alternative_universes?.some(alternative => alternative.alternative_id === 'office-defined-eiga-era-presidents')
    || !review?.comparator_tests?.some(test => test.status === 'specified_not_executed')) {
    errors.push(issue('incomplete-target-first-audit', reviewsFile, 'The two failed attacks, adopted alternative, unexecuted comparator test, and non-independence label must remain explicit.'));
  }

  const coverageRow = coverage.lanes?.find(item => item.lane_id === LANE_ID);
  const metric = id => coverageRow?.metrics?.find(item => item.metric_id === id);
  if (metric('neutral_presidential_cohort')?.observed !== 8
    || metric('role_neutral_crossing_predicates')?.observed !== 5
    || metric('source_resolved_candidate_identifiers')?.observed !== 8
    || metric('source_resolved_candidate_identifiers')?.expected !== 8
    || metric('source_resolved_authorized_committees')?.observed !== 37
    || metric('openfec_schedule_b_queries')?.observed !== 0
    || metric('openfec_schedule_b_queries')?.expected !== 37
    || metric('no_key_fec_bulk_source_routes')?.observed !== 2
    || metric('fec_bulk_cycle_files_ingested')?.observed !== 11
    || metric('fec_bulk_reported_rows_observed')?.observed !== 588535
    || metric('fec_bulk_cohort_committees_observed')?.observed !== 11
    || metric('fec_bulk_transaction_report_keys_spanning_files')?.observed !== 0
    || metric('disclosure_source_member_cells')?.observed !== 32
    || metric('unresolved_fec_payee_candidates')?.observed !== 46926
    || metric('normalized_beneficial_interest_records')?.observed !== 5945
    || metric('oge_transaction_dates_ocr_ambiguous')?.observed !== 400
    || metric('oge_transaction_types_ocr_ambiguous')?.observed !== 1107
    || metric('unresolved_oge_fec_lexical_overlap_candidates')?.observed !== 1172
    || metric('oge_fec_temporal_candidates_overlapping')?.observed !== 0
    || metric('oge_fec_temporal_candidates_non_overlapping')?.observed !== 132
    || metric('oge_fec_temporal_candidates_unknown')?.observed !== 1040
    || metric('oge_fec_identity_review_queue')?.observed !== 0
    || metric('resolved_officeholder_crossings')?.observed !== 0) {
    errors.push(issue('dishonest-officeholder-coverage', coverageFile, 'Coverage must distinguish 8 source-resolved candidates and 37 authorized presidential campaign committees from zero Schedule B transaction queries.'));
  }
  const gapIds = new Set((coverageRow?.known_gaps ?? []).map(gap => gap.gap_id));
  for (const required of ['selection-gap-trump-schedule-b-api-key', 'selection-gap-trump-historical-digitization']) {
    if (!gapIds.has(required)) errors.push(issue('missing-officeholder-source-gap', coverageFile, `Required gap ${required} is missing.`));
  }
  const credentialGap = coverageRow?.known_gaps?.find(gap => gap.gap_id === 'selection-gap-trump-schedule-b-api-key');
  if (credentialGap?.status === 'blocking' || !/not a discovery blocker/i.test(credentialGap?.description ?? '')) {
    errors.push(issue('credential-misrepresented-as-discovery-blocker', coverageFile, 'The missing OpenFEC API key must route intake to official bulk data, not stop discovery.'));
  }

  return { ok: errors.length === 0, errors };
}

export function formatOfficeholderErrors(errors) {
  return errors.map(error => `- [${error.code}] ${error.file}: ${error.message}`).join('\n');
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = validateOfficeholderCohort({ root });
  if (!result.ok) {
    console.error(`Officeholder cohort contract failed with ${result.errors.length} error(s):\n${formatOfficeholderErrors(result.errors)}`);
    process.exitCode = 1;
  } else {
    console.log('Officeholder cohort contract: OK');
  }
}
