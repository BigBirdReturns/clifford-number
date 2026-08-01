#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const EXPECTED_COUNTS = {
  function_level_packets_audited: 5,
  source_records: 12,
  public_record_person_attributions: 4,
  person_trace_support_assignments: 9,
  aggregate_dimension_supports_added: 0,
  identity_blocked_function_packets: 2,
  external_review_packets_prepared: 6,
  external_review_requests_sent: 0,
  external_selector_reviews_executed: 0,
  open_exact_acquisition_lanes: 7,
  complete_operator_findings: 0,
  field_test_eligible_candidates: 0,
  contacts_authorized: 0,
  bounded_collaborations_authorized: 0,
  promotions: 0,
  person_rankings: 0,
  public_identity_profiles: 0,
  graph_effects: 0,
  adversarial_mutations: 40
};

export function validateContract(contract) {
  assert(contract.schema_version === 'counter-selector-function-attribution-fanout@1', 'schema version');
  assert(contract.program_id === 'counter-selector-v1', 'program');
  assert(contract.wave_id === 'CS-W17-FA-01', 'wave');
  assert(contract.status === 'four_public_record_person_traces_attributed_six_external_review_packets_prepared_zero_external_reviews', 'status');
  assert(contract.publication_status === 'staged_nonpublic_source_custody', 'publication status');
  assert(/^[0-9a-f]{40}$/.test(contract.parent_main_sha), 'parent main sha');
  assert(/^[0-9a-f]{64}$/.test(contract.parent_release_sha256), 'parent release sha');

  for (const [key, value] of Object.entries(EXPECTED_COUNTS)) {
    assert(contract.counts[key] === value, `count ${key}`);
  }

  assert(Array.isArray(contract.function_packets) && contract.function_packets.length === 5, 'five function packets');
  assert(Array.isArray(contract.person_traces) && contract.person_traces.length === 4, 'four person traces');
  assert(Array.isArray(contract.identity_blocks) && contract.identity_blocks.length === 2, 'two identity blocks');
  assert(Array.isArray(contract.external_review_packets) && contract.external_review_packets.length === 6, 'six review packets');
  assert(Array.isArray(contract.acquisition_lanes) && contract.acquisition_lanes.length === 7, 'seven acquisition lanes');
  assert(Array.isArray(contract.sources) && contract.sources.length === 12, 'twelve sources');

  const functionIds = contract.function_packets.map((row) => row.packet_id);
  assert(new Set(functionIds).size === 5, 'unique function packets');
  assert(functionIds.sort().join(',') === 'CS-BLIND-0003,CS-BLIND-0004,CS-BLIND-0012,CS-BLIND-0013,CS-BLIND-0017', 'function packet set');
  assert(contract.function_packets.every((row) => row.denominator_object_double_counted === false), 'no denominator double count');
  assert(contract.function_packets.every((row) => row.aggregate_support_added === 0), 'no aggregate supports added');

  const traceIds = contract.person_traces.map((row) => row.trace_id);
  assert(new Set(traceIds).size === 4, 'unique trace ids');
  assert(traceIds.sort().join(',') === 'CS-TRACE-W17-0001,CS-TRACE-W17-0002,CS-TRACE-W17-0003,CS-TRACE-W17-0004', 'trace set');
  const byTrace = Object.fromEntries(contract.person_traces.map((row) => [row.trace_id, row]));

  const boisjoly = byTrace['CS-TRACE-W17-0001'];
  assert(boisjoly.source_identity === 'Roger Boisjoly', 'boisjoly identity');
  assert(boisjoly.parent_packet_id === 'CS-BLIND-0003', 'boisjoly parent');
  assert(boisjoly.supported_dimensions.join(',') === 'exception_handling,model_elasticity,epistemic_restraint', 'boisjoly supports');
  assert(boisjoly.support_assignments.length === 3, 'boisjoly support assignments');
  assert(!boisjoly.supported_dimensions.includes('governed_capacity'), 'boisjoly no gate-control support');

  const mcdonald = byTrace['CS-TRACE-W17-0002'];
  assert(mcdonald.source_identity === 'Allan McDonald', 'mcdonald identity');
  assert(mcdonald.parent_packet_id === 'CS-BLIND-0003', 'mcdonald parent');
  assert(mcdonald.supported_dimensions.join(',') === 'governed_capacity,epistemic_restraint', 'mcdonald supports');
  assert(!mcdonald.supported_dimensions.includes('custody'), 'mcdonald no custody');

  const rocha = byTrace['CS-TRACE-W17-0003'];
  assert(rocha.source_identity === 'Rodney Rocha', 'rocha identity');
  assert(rocha.parent_packet_id === 'CS-BLIND-0012', 'rocha parent');
  assert(rocha.supported_dimensions.join(',') === 'exception_handling,epistemic_restraint', 'rocha supports');
  assert(!rocha.supported_dimensions.includes('model_elasticity'), 'rocha later lessons not elasticity');

  const febles = byTrace['CS-TRACE-W17-0004'];
  assert(febles.source_identity === 'Rene Febles', 'febles identity');
  assert(febles.parent_packet_id === 'CS-BLIND-0017', 'febles parent');
  assert(febles.supported_dimensions.join(',') === 'custody,governed_capacity', 'febles supports');
  assert(febles.sole_technical_authorship_claimed === false, 'febles sole authorship refused');

  const supportTotal = contract.person_traces.reduce((sum, row) => sum + row.supported_dimensions.length, 0);
  assert(supportTotal === 9, 'nine person-trace support assignments');
  for (const row of contract.person_traces) {
    assert(functionIds.includes(row.parent_packet_id), `${row.trace_id} parent in function set`);
    assert(row.support_assignments.length === row.supported_dimensions.length, `${row.trace_id} support assignment parity`);
    assert(row.support_assignments.every((finding) => finding.basis && finding.ceiling && finding.source_ids.length), `${row.trace_id} support receipts`);
    assert(row.external_review_ready === true, `${row.trace_id} review ready`);
    assert(row.complete_operator_finding === false, `${row.trace_id} no operator`);
    assert(row.field_test_eligible === false, `${row.trace_id} no field test`);
    assert(row.contact_authorized === false, `${row.trace_id} no contact`);
    assert(row.public_identity_profile_authorized === false, `${row.trace_id} no profile`);
    assert(row.graph_effect === 'none', `${row.trace_id} no graph`);
    assert(row.unresolved_dimensions.length > 0, `${row.trace_id} unresolved dimensions`);
  }

  const blocks = Object.fromEntries(contract.identity_blocks.map((row) => [row.identity_block_id, row]));
  assert(Object.keys(blocks).sort().join(',') === 'CS-IDBLOCK-W17-0004,CS-IDBLOCK-W17-0013', 'identity block set');
  assert(blocks['CS-IDBLOCK-W17-0013'].blocked_identity_label === 'unnamed third-party pressure-vessel consultant', 'ndk identity block');
  assert(blocks['CS-IDBLOCK-W17-0004'].blocked_identity_label === 'collective Liberty helicopter pilot warning function', 'liberty identity block');
  for (const row of contract.identity_blocks) {
    assert(row.named_person_inferred === false, `${row.identity_block_id} no inferred person`);
    assert(row.person_support_assigned === false, `${row.identity_block_id} no person support`);
    assert(row.graph_effect === 'none', `${row.identity_block_id} no graph`);
    assert(row.required_to_unblock.length > 0, `${row.identity_block_id} unblock requirements`);
  }

  const reviewIds = contract.external_review_packets.map((row) => row.review_packet_id);
  assert(new Set(reviewIds).size === 6, 'unique review packet ids');
  assert(contract.external_review_packets.some((row) => row.source_identity === 'Nancy Olivieri'), 'olivieri review packet');
  assert(contract.external_review_packets.some((row) => row.source_identity === 'Elliot Richardson'), 'richardson review packet');
  for (const row of contract.external_review_packets) {
    assert(row.supported_dimensions.length > 0, `${row.review_packet_id} supported dimensions`);
    assert(row.review_questions.length > 0, `${row.review_packet_id} review questions`);
    assert(row.falsifiers.length > 0, `${row.review_packet_id} falsifiers`);
    assert(row.missing_receipts.length > 0, `${row.review_packet_id} missing receipts`);
    assert(row.external_review_executed === false, `${row.review_packet_id} review not executed`);
    assert(row.contact_required === false, `${row.review_packet_id} no contact required`);
    assert(row.contact_authorized === false, `${row.review_packet_id} no contact`);
    assert(row.field_test_authorized === false, `${row.review_packet_id} no field test`);
    assert(row.public_identity_profile_authorized === false, `${row.review_packet_id} no profile`);
    assert(row.graph_effect === 'none', `${row.review_packet_id} no graph`);
  }

  const laneIds = contract.acquisition_lanes.map((row) => row.lane_id);
  assert(new Set(laneIds).size === 7, 'unique acquisition lanes');
  assert(contract.acquisition_lanes.every((row) => row.required_objects.length > 0), 'acquisition objects');
  assert(contract.acquisition_lanes.every((row) => row.contact_authorized === false), 'no acquisition contact');
  assert(contract.acquisition_lanes.every((row) => row.graph_effect === 'none'), 'no acquisition graph');

  const sourceIds = contract.sources.map((row) => row.source_id);
  assert(new Set(sourceIds).size === 12, 'unique source ids');
  assert(contract.sources.every((row) => row.subject_ids.length > 0), 'source subjects');
  assert(contract.sources.every((row) => row.supports.length > 0), 'source supports');
  assert(contract.sources.every((row) => row.limits.length > 0), 'source limits');
  assert(contract.sources.every((row) => /^https:\/\//.test(row.url)), 'source https');
  const knownSubjects = new Set([...traceIds, ...contract.identity_blocks.map((row) => row.identity_block_id)]);
  assert(contract.sources.every((row) => row.subject_ids.every((id) => knownSubjects.has(id))), 'source subject routes');

  const b = contract.boundaries;
  assert(b.function_packet_split_creates_new_denominator_object === false, 'function split boundary');
  assert(b.person_trace_support_assignment_adds_aggregate_support === false, 'aggregate support boundary');
  assert(b.source_identity_attribution_is_complete_operator === false, 'attribution operator boundary');
  assert(b.authored_warning_is_safe_handoff === false, 'warning handoff boundary');
  assert(b.refusal_to_sign_is_exception_repair === false, 'refusal repair boundary');
  assert(b.later_lessons_learned_authorship_is_in_flight_gate_control === false, 'later authorship boundary');
  assert(b.officeholder_publication_custody_is_sole_technical_authorship === false, 'officeholder authorship boundary');
  assert(b.congressional_attribution_is_retaliation_merits === false, 'congressional merits boundary');
  assert(b.anonymous_consultant_may_be_named_by_inference === false, 'anonymous identity boundary');
  assert(b.collective_pilot_warning_may_be_collapsed_to_one_person === false, 'collective pilot boundary');
  assert(b.external_review_packet_prepared_is_external_review_executed === false, 'review preparation boundary');
  assert(b.same_system_review_is_external_independence === false, 'external independence boundary');
  assert(b.supported_dimension_count_is_rank === false, 'rank boundary');
  assert(b.contact_authorized === false, 'contact boundary');
  assert(b.bounded_collaboration_authorized === false, 'collaboration boundary');
  assert(b.field_test_authorized === false, 'field test boundary');
  assert(b.promotion_authorized === false, 'promotion boundary');
  assert(b.person_ranking_authorized === false, 'person ranking boundary');
  assert(b.public_identity_profile_authorized === false, 'profile boundary');
  assert(b.graph_effect === 'none', 'graph boundary');
  return true;
}

export function validateProducts() {
  const contract = read('data/project/counter-selector-wave-17-function-attribution.json');
  validateContract(contract);
  const attribution = read('data/project/counter-selector-function-attribution-registry.json');
  const review = read('data/project/counter-selector-external-review-packet-registry.json');
  const report = read('reports/core-thesis/counter-selector-wave-17/data.json');
  const manifest = read('data/project/counter-selector-wave-17-release-manifest.json');
  assert(attribution.counts.public_record_person_attributions === 4, 'attribution count');
  assert(attribution.person_traces.length === 4, 'attribution registry traces');
  assert(attribution.identity_blocks.length === 2, 'attribution registry blocks');
  assert(review.counts.packets_prepared === 6, 'review packet count');
  assert(review.counts.external_reviews_executed === 0, 'review registry zero executed');
  assert(review.packets.every((row) => row.external_review_executed === false), 'review packets not executed');
  assert(report.counts.person_trace_support_assignments === 9, 'report support assignments');
  assert(report.counts.aggregate_dimension_supports_added === 0, 'report aggregate supports');
  assert(report.external_review.packets_prepared === 6, 'report review packets');
  assert(report.external_review.reviews_executed === 0, 'report external reviews');
  assert(report.release_manifest.combined_sha256 === manifest.combined_sha256, 'manifest link');
  assert(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'manifest digest');
  assert(manifest.entries.length === 8, 'manifest source entries');
  assert(manifest.boundaries.manifest_proves_external_review === false, 'manifest review boundary');
  assert(manifest.boundaries.manifest_authorizes_contact === false, 'manifest contact boundary');
  assert(manifest.boundaries.manifest_authorizes_field_test === false, 'manifest field-test boundary');
  assert(manifest.boundaries.manifest_authorizes_person_ranking === false, 'manifest rank boundary');
  assert(manifest.boundaries.manifest_authorizes_public_identity_profile === false, 'manifest profile boundary');
  assert(manifest.boundaries.manifest_authorizes_graph_edge === false, 'manifest graph boundary');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateProducts();
  console.log('validate-counter-selector-wave-17: contract and products valid');
}
