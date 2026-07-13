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
  selectionFile = 'data/canonical/corpus-selection.json',
  coverageFile = 'data/research/corpus-coverage.json',
  reviewsFile = 'data/research/selection-adversarial-reviews.json',
} = {}) {
  const errors = [];
  const cohort = readJson(root, cohortFile, errors);
  const registry = readJson(root, predicatesFile, errors);
  const selection = readJson(root, selectionFile, errors);
  const coverage = readJson(root, coverageFile, errors);
  const reviews = readJson(root, reviewsFile, errors);
  if (!cohort || !registry || !selection || !coverage || !reviews) return { ok: false, errors };

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
    || metric('live_cohort_candidate_resolutions')?.observed !== 0
    || metric('live_cohort_candidate_resolutions')?.expected !== 8) {
    errors.push(issue('dishonest-officeholder-coverage', coverageFile, 'Coverage must distinguish the complete design (8 members, 5 predicates) from zero live cohort resolutions.'));
  }
  const gapIds = new Set((coverageRow?.known_gaps ?? []).map(gap => gap.gap_id));
  for (const required of ['selection-gap-trump-fec-api-key', 'selection-gap-trump-historical-digitization']) {
    if (!gapIds.has(required)) errors.push(issue('missing-officeholder-source-gap', coverageFile, `Required gap ${required} is missing.`));
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
