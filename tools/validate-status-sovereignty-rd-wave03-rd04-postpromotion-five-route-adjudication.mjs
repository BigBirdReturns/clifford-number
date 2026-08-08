import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { PERMANENT_PATHS, deriveCandidateProtocol, deriveIndex } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs';

const ROOT = process.cwd();
const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication';
const DATA = path.join(ROOT, DATA_REL);

function fail(message) {
  throw new Error(message);
}
function equal(actual, expected, label) {
  if (actual !== expected) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function truth(value, label) {
  if (!value) fail(label);
}
function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
function gitBlob(data) {
  const header = Buffer.from(`blob ${data.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, data])).digest('hex');
}
function stable(value) {
  return JSON.stringify(value);
}
function readJson(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

export function loadProduct(root = DATA) {
  return {
    capture: readJson(root, 'capture-custody.json'),
    source: readJson(root, 'source-adjudications.json'),
    field: readJson(root, 'field-adjudications.json'),
    pdf: readJson(root, 'pdf-review-receipts.json'),
    candidate: readJson(root, 'promotion-candidate-protocol.json'),
    followup: readJson(root, 'selected-followup-protocol.json'),
    index: readJson(root, 'index.json'),
    manifest: readJson(root, 'product-manifest.json'),
  };
}

function assertAuthority(boundary, label, expectedAdmissions = 4) {
  equal(boundary.source_requests_executed_by_adjudication, 0, `${label}.source_requests`);
  equal(boundary.source_admissions_created, expectedAdmissions, `${label}.source_admissions`);
  equal(boundary.field_classifications_created, 0, `${label}.field_classifications`);
  equal(boundary.field_terminalizations_created, 0, `${label}.field_terminalizations`);
  equal(boundary.matrix_updates, 0, `${label}.matrix_updates`);
  equal(boundary.row_state_mutations, 0, `${label}.row_state_mutations`);
  equal(boundary.class_closed, false, `${label}.class_closed`);
  equal(boundary.cumulative_ledger_effect, 'none', `${label}.cumulative`);
  equal(boundary.outside_human_dependency, false, `${label}.outside_human`);
  for (const key of ['publication_effect','adoption_effect','graph_effect','national_prevalence_effect','discrimination_effect','racial_order_effect','coordination_effect','common_purpose_effect','complete_compact_effect']) {
    equal(boundary[key], 'none', `${label}.${key}`);
  }
}

export function validateProduct(product, options = {}) {
  const verifyFiles = options.verifyFiles ?? false;
  const root = options.root ?? ROOT;
  const { capture, source, field, pdf, candidate, followup, index, manifest } = product;

  equal(capture.canonical_protocol_merge, '91b386df809079884825b19a6b5d864b6e739172', 'canonical protocol');
  equal(capture.successful_executions.length, 2, 'successful executions');
  equal(capture.transport_ledger.total_http_attempts, 10, 'total attempts');
  equal(capture.transport_ledger.unique_route_count, 5, 'unique routes');
  equal(capture.transport_ledger.unique_body_identity_count, 5, 'unique bodies');
  equal(capture.transport_ledger.body_changes_between_runs, 0, 'body changes');
  equal(capture.failed_zero_request_execution.request_attempts, 0, 'failed carrier requests');
  equal(capture.failed_zero_request_execution.capture_directory_present, false, 'failed carrier capture');
  assertAuthority(capture.authority_boundary, 'capture authority', 0);

  equal(source.decisions.length, 5, 'source decisions');
  equal(source.summary.narrow_source_admissions, 4, 'source admissions');
  equal(source.summary.nonadmitted_runtime_shells, 1, 'runtime shells');
  equal(source.summary.transport_observations, 10, 'source transport observations');
  const bodySet = new Set();
  for (const decision of source.decisions) {
    equal(decision.transport_observations.length, 2, `${decision.route_id} observations`);
    const [first, second] = decision.transport_observations;
    truth(first.response_date !== second.response_date, `${decision.route_id} distinct transport dates`);
    equal(first.body_sha256, decision.body_sha256, `${decision.route_id} first body`);
    equal(second.body_sha256, decision.body_sha256, `${decision.route_id} second body`);
    equal(first.response_receipt_sha256, decision.response_receipt_sha256, `${decision.route_id} first receipt`);
    equal(second.response_receipt_sha256, decision.response_receipt_sha256, `${decision.route_id} second receipt`);
    equal(decision.substantive_weight_count, decision.source_admitted_for_narrow_scope ? 1 : 0, `${decision.route_id} weight`);
    bodySet.add(decision.body_sha256);
  }
  equal(bodySet.size, 5, 'source unique bodies');
  const ndShell = source.decisions.find((decision) => decision.route_id === 'RD04-W03-PPN-ND-001');
  equal(ndShell.source_admitted_for_narrow_scope, false, 'ND shell admission');
  equal(ndShell.html_review.visible_text_characters, 0, 'ND shell visible text');
  equal(ndShell.candidate_fields_for_offline_review.length, 0, 'ND shell fields');
  assertAuthority(source.authority_boundary, 'source authority');

  equal(pdf.receipts.length, 3, 'PDF receipts');
  equal(pdf.rendering.rendered_page_count, 8, 'rendered pages');
  equal(pdf.rendering.all_pages_visually_reviewed, true, 'all PDFs reviewed');
  for (const receipt of pdf.receipts) {
    equal(receipt.page_reviews.length, receipt.page_count, `${receipt.route_id} page denominator`);
    truth(receipt.page_reviews.every((page) => page.visually_reviewed), `${receipt.route_id} page review`);
    truth(receipt.page_reviews.every((page) => /^[0-9a-f]{64}$/.test(page.render_sha256)), `${receipt.route_id} render hashes`);
  }
  assertAuthority(pdf.authority_boundary, 'pdf authority', 3);

  equal(field.decisions.length, 6, 'field decisions');
  equal(field.summary.evidence_complete_candidates, 4, 'field candidates');
  equal(field.summary.held_open_fields, 2, 'field holds');
  equal(field.frontier.terminal_matrix_cells_before, 222, 'terminal cells');
  equal(field.frontier.open_substantive_cells_before, 188, 'open substantive cells');
  const expectedCandidates = [
    'US-STATE-MT|operative_state_implementation_authority_and_version',
    'US-STATE-MT|implementation_effective_date_or_typed_gap',
    'US-STATE-MT|abawd_or_work_requirement_waiver_state_and_governing_period',
    'US-STATE-ND|implementation_effective_date_or_typed_gap',
  ].sort();
  const actualCandidates = field.decisions
    .filter((decision) => decision.promotion_candidate)
    .map((decision) => `${decision.unit_id}|${decision.field_id}`)
    .sort();
  equal(stable(actualCandidates), stable(expectedCandidates), 'candidate cells');
  const ndAuthority = field.decisions.find((decision) => decision.decision_id === 'RD04-PPN-ND-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION');
  equal(ndAuthority.disposition, 'no_relevant_support_hold_open', 'ND authority disposition');
  equal(ndAuthority.promotion_candidate, false, 'ND authority candidate');
  const ndWaiver = field.decisions.find((decision) => decision.decision_id === 'RD04-PPN-ND-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD');
  equal(ndWaiver.disposition, 'temporal_or_scope_ambiguity_hold_open', 'ND waiver disposition');
  equal(ndWaiver.bounded_finding.current_post_period_state, 'not_expressly_stated_in_captured_body', 'ND current waiver gap');
  equal(ndWaiver.promotion_candidate, false, 'ND waiver candidate');
  truth(field.decisions.every((decision) => decision.field_classification_effect === 'none'), 'field product does not classify matrix');
  truth(field.decisions.every((decision) => decision.substantive_field_terminalizations === 0), 'field product does not terminalize');
  assertAuthority(field.authority_boundary, 'field authority');

  equal(candidate.candidate_count, 4, 'candidate protocol count');
  equal(candidate.unique_candidate_cell_count, 4, 'candidate unique cells');
  equal(stable(candidate), stable(deriveCandidateProtocol(field)), 'derived candidate protocol');

  equal(followup.fixed_route_count, 2, 'followup routes');
  equal(followup.maximum_total_requests_in_later_separate_execution, 2, 'followup max requests');
  equal(followup.url_exclusion_custody.selected_exact_overlap_count, 0, 'exact URL overlap');
  equal(followup.url_exclusion_custody.selected_normalized_overlap_count, 0, 'normalized URL overlap');
  const expectedFollowups = [
    'https://www.nd.gov/dhs/policymanuals/SNAP/Content/Release%20Log.htm',
    'https://www.nd.gov/dhs/policymanuals/SNAP/Content/History/403%20Geographic%20Waiver/403%20History%20Log.htm',
  ];
  equal(stable(followup.routes.map((route) => route.requested_url)), stable(expectedFollowups), 'followup URLs');
  truth(followup.routes.every((route) => route.expected_host === 'www.nd.gov'), 'followup hosts');
  truth(followup.routes.every((route) => route.maximum_attempts === 1), 'followup attempts');
  truth(followup.routes.every((route) => route.result_spawned_requests === 0), 'followup spawned requests');
  truth(followup.routes.every((route) => route.source_route_id === 'RD04-W03-PPN-ND-002'), 'followup source provenance');
  equal(stable(followup.routes.map((route) => route.target_decision_id).sort()), stable([
    'RD04-PPN-ND-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD',
    'RD04-PPN-ND-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION',
  ]), 'followup held decisions');
  truth(followup.routes.every((route) => route.selection_scope === 'new_followup_protocol_explicitly_targets_held_cell'), 'followup scope');
  assertAuthority(followup.authority_boundary, 'followup authority', 0);

  equal(stable(index), stable(deriveIndex(capture, source, field, followup)), 'derived index');
  equal(index.matrix_summary.matrix_updates, 0, 'index matrix updates');

  equal(manifest.permanent_path_count, 14, 'manifest permanent paths');
  equal(manifest.hashed_file_count, 13, 'manifest hashed files');
  equal(stable(manifest.permanent_paths), stable(PERMANENT_PATHS), 'manifest path denominator');
  equal(stable(manifest.hashed_files.map((row) => row.path).sort()), stable(PERMANENT_PATHS.filter((relative) => relative !== `${DATA_REL}/product-manifest.json`)), 'manifest hashed path denominator');
  truth(manifest.hashed_files.every((row) => /^[0-9a-f]{64}$/.test(row.sha256)), 'manifest sha256 rows');
  truth(manifest.hashed_files.every((row) => /^[0-9a-f]{40}$/.test(row.git_blob)), 'manifest git blob rows');
  assertAuthority(manifest.authority_boundary, 'manifest authority');

  if (verifyFiles) {
    const rows = [];
    for (const row of manifest.hashed_files) {
      const data = fs.readFileSync(path.join(root, row.path));
      equal(data.length, row.bytes, `${row.path} bytes`);
      equal(sha256(data), row.sha256, `${row.path} sha256`);
      equal(gitBlob(data), row.git_blob, `${row.path} git blob`);
      rows.push(`${row.path}\0${row.bytes}\0${row.sha256}\0${row.git_blob}\n`);
    }
    equal(sha256(Buffer.from(rows.join(''))), manifest.combined_sha256, 'manifest combined identity');
    for (const name of ['capture-custody.json','field-adjudications.json','index.json','pdf-review-receipts.json','promotion-candidate-protocol.json','selected-followup-protocol.json','source-adjudications.json']) {
      const value = JSON.parse(fs.readFileSync(path.join(root, DATA_REL, name), 'utf8'));
      equal(fs.readFileSync(path.join(root, DATA_REL, name), 'utf8'), canonical(value), `${name} canonical JSON`);
    }
  }

  return {
    candidate_count: candidate.candidate_count,
    field_decisions: field.decisions.length,
    followup_routes: followup.routes.length,
    held_fields: field.summary.held_open_fields,
    narrow_source_admissions: source.summary.narrow_source_admissions,
    source_decisions: source.decisions.length,
    transport_attempts: capture.transport_ledger.total_http_attempts,
    unique_bodies: capture.transport_ledger.unique_body_identity_count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(validateProduct(loadProduct(), { verifyFiles: true, root: ROOT })));
}
