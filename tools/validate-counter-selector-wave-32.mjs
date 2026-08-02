#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, deriveManifest, deriveRegistry, deriveReport, renderHtml, stableJson } from './build-counter-selector-wave-32.mjs';

const ROOT = process.cwd();
const SOURCE_PATH = 'data/project/counter-selector-wave-32-candidate-handoff-application.json';
const REGISTRY_PATH = 'data/project/counter-selector-wave-32-handoff-registry.json';
const MANIFEST_PATH = 'data/project/counter-selector-wave-32-release-manifest.json';
const REPORT_PATH = 'reports/core-thesis/counter-selector-wave-32/data.json';
const HTML_PATH = 'reports/core-thesis/counter-selector-wave-32/index.html';
const DIMENSIONS = new Set(['support_adjusted_surplus','cross_domain_transfer','exception_handling','custody','model_elasticity','governed_capacity','non_zero_sum_orientation','epistemic_restraint']);

function readJson(relativePath) { return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')); }
function exact(relativePath, expected) { assert.equal(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), expected, `${relativePath} drift`); }

export function validateSource(source) {
  assert.equal(source.schema_version, 'counter-selector-candidate-handoff-application@1');
  assert.equal(source.program_id, 'counter-selector-v1');
  assert.equal(source.wave_id, 'CS-W32-CH-01');
  assert.equal(source.status, 'four_candidate_lanes_scored_one_bounded_incoming_custody_support_zero_complete_handoffs_zero_operator_findings');
  assert.equal(source.candidate_lanes.length, 4);
  assert.equal(source.counts.candidate_lanes_audited, 4);
  assert.equal(source.counts.public_source_records, 17);
  assert.equal(source.counts.prior_person_dimension_supports, 15);
  assert.equal(source.counts.person_dimension_supports_added, 1);
  assert.equal(source.counts.person_custody_supports_added, 1);
  assert.equal(source.counts.recipient_handover_acknowledgment_events, 1);
  assert.equal(source.counts.complete_outgoing_state_packages, 0);
  assert.equal(source.counts.recipient_acknowledged_state_packages, 0);
  assert.equal(source.counts.complete_direct_handoffs, 0);
  assert.equal(source.counts.external_independent_reviews, 0);
  assert.equal(source.counts.complete_operator_findings, 0);
  assert.equal(source.counts.field_test_eligible_candidates, 0);
  assert.equal(source.counts.contacts_authorized, 0);
  assert.equal(source.counts.bounded_collaborations_authorized, 0);
  assert.equal(source.counts.promotions, 0);
  assert.equal(source.counts.person_rankings, 0);
  assert.equal(source.counts.public_identity_profiles, 0);
  assert.equal(source.counts.graph_effects, 0);
  assert.equal(source.counts.adversarial_mutations, 80);
  assert.equal(source.review_independence.external_human_independence_claimed, false);
  assert.equal(source.review_independence.different_model_or_institution_claimed, false);
  assert.equal(source.review_independence.same_system_limitation_preserved, true);
  assert.equal(source.graph_effect, 'none');

  const laneIds = source.candidate_lanes.map(lane => lane.lane_id);
  assert.deepEqual(laneIds, ['CS-W32-CH-01','CS-W32-CH-02','CS-W32-CH-03','CS-W32-CH-04']);
  const sourceIds = source.candidate_lanes.flatMap(lane => lane.source_records.map(record => record.source_id));
  assert.equal(sourceIds.length, 17);
  assert.equal(new Set(sourceIds).size, 17);
  const identities = source.candidate_lanes.map(lane => lane.source_identity);
  assert.deepEqual(identities, ['Daniel Stenberg','Simon Willison','Troy Hunt','Elliot Richardson']);

  for (const lane of source.candidate_lanes) {
    assert.equal(Object.keys(lane.components).length, 9);
    assert.equal(lane.adjudication.complete_operator_finding, false);
    assert.equal(lane.adjudication.field_test_eligible, false);
    assert.equal(lane.adjudication.direct_state_handoff, 'not_established');
    assert.equal(lane.contact_authorized, false);
    assert.equal(lane.graph_effect, 'none');
    assert.equal(lane.review.external_independence_claimed, false);
    assert.equal(lane.counterevidence.length >= 4, true);
    assert.equal(lane.falsifiers.length >= 4, true);
    assert.equal(new Set(lane.prior_person_supports).size, lane.prior_person_supports.length);
    assert.equal(new Set(lane.current_person_supports).size, lane.current_person_supports.length);
    for (const dimension of lane.prior_person_supports) assert.equal(DIMENSIONS.has(dimension), true);
    for (const dimension of lane.current_person_supports) assert.equal(DIMENSIONS.has(dimension), true);
  }

  const daniel = source.candidate_lanes[0];
  assert.equal(daniel.recipient_acknowledgment_level, 'handover_event_acknowledged');
  assert.equal(daniel.adjudication.person_custody_support_added, true);
  assert.equal(daniel.adjudication.custody_state, 'bounded_observation');
  assert.deepEqual(daniel.prior_person_supports, ['model_elasticity','epistemic_restraint']);
  assert.deepEqual(daniel.current_person_supports, ['custody','model_elasticity','epistemic_restraint']);
  assert.match(daniel.components.successor_action, /successor_releases/);
  assert.match(daniel.components.open_decision_and_dependency_inventory, /complete_decision_and_dependency_inventory_absent/);

  const simon = source.candidate_lanes[1];
  const troy = source.candidate_lanes[2];
  const richardson = source.candidate_lanes[3];
  assert.equal(simon.adjudication.person_custody_support_added, false);
  assert.equal(troy.adjudication.person_custody_support_added, false);
  assert.equal(richardson.adjudication.person_custody_support_added, false);
  assert.deepEqual(simon.current_person_supports, simon.prior_person_supports);
  assert.deepEqual(troy.current_person_supports, troy.prior_person_supports);
  assert.deepEqual(richardson.current_person_supports, richardson.prior_person_supports);
  assert.match(simon.adjudication.classification, /collective_continuation/);
  assert.match(troy.adjudication.classification, /without_complete_service_state/);
  assert.match(richardson.adjudication.classification, /existing_custody_retained/);

  const falseBoundaryKeys = Object.keys(source.boundaries).filter(key => key !== 'graph_effect');
  for (const key of falseBoundaryKeys) assert.equal(source.boundaries[key], false, `${key} must remain false`);
  assert.equal(source.boundaries.graph_effect, 'none');
  assert.equal(source.handoff_contract.contact_required, false);
  assert.equal(source.handoff_contract.candidate_application_is_promotion, false);
  assert.equal(source.handoff_contract.component_order.length, 9);
  assert.equal(source.handoff_contract.recipient_acknowledgment_levels.length, 5);
  assert.equal(source.handoff_contract.complete_direct_handoff_requires.length, 6);
}

export function validateAll() {
  const source = readJson(SOURCE_PATH);
  validateSource(source);
  const expectedRegistry = deriveRegistry(source);
  const expectedManifest = deriveManifest(source);
  const expectedReport = deriveReport(source, expectedRegistry, expectedManifest);
  exact(REGISTRY_PATH, stableJson(expectedRegistry));
  exact(MANIFEST_PATH, stableJson(expectedManifest));
  exact(REPORT_PATH, stableJson(expectedReport));
  exact(HTML_PATH, renderHtml(expectedReport));
  const registry = readJson(REGISTRY_PATH);
  assert.equal(registry.candidate_lanes.length, 4);
  assert.equal(registry.candidate_lanes.filter(lane => lane.person_custody_support_added).length, 1);
  assert.equal(registry.candidate_lanes.every(lane => lane.complete_operator_finding === false), true);
  assert.equal(registry.candidate_lanes.every(lane => lane.field_test_eligible === false), true);
  assert.equal(registry.candidate_lanes.every(lane => lane.contact_authorized === false), true);
  const manifest = readJson(MANIFEST_PATH);
  assert.equal(manifest.entries.length, 8);
  assert.match(manifest.combined_sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.boundaries.manifest_authorizes_contact, false);
  assert.equal(manifest.boundaries.manifest_authorizes_field_test, false);
  assert.equal(manifest.boundaries.manifest_authorizes_graph_edge, false);
  const rebuilt = buildAll();
  assert.equal(rebuilt.source.wave_id, 'CS-W32-CH-01');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateAll();
  console.log('validate-counter-selector-wave-32: contract and products valid');
}
