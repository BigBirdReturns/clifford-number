import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { PERMANENT_PATHS, SCHEMA_VERSION, deriveCandidateProtocol, deriveIndex } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs';

const ROOT = process.cwd();
const DATA_REL = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication";
const DATA = path.join(ROOT, DATA_REL);
const MATRIX_PATH = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promoted-partial-field-matrix.json";
const ROUTE_TARGET_FIELDS = new Map([
  ['RD04-W03-PPN-ND-FU-001', ['operative_state_implementation_authority_and_version']],
  ['RD04-W03-PPN-ND-FU-002', ['abawd_or_work_requirement_waiver_state_and_governing_period']],
]);
function fail(message) { throw new Error(message); }
function equal(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
function truth(value, label) { if (!value) fail(label); }
function canonical(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function stable(value) { if (Array.isArray(value)) return value.map(stable); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])])); return value; }
function canonicalSha(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function gitBlob(data) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex'); }
function readJson(root, name) { return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')); }

export function loadProduct(root = DATA) {
  return {capture: readJson(root,'capture-custody.json'), field: readJson(root,'field-adjudications.json'), html: readJson(root,'html-review-receipts.json'), index: readJson(root,'index.json'), manifest: readJson(root,'product-manifest.json'), candidate: readJson(root,'promotion-candidate-protocol.json'), source: readJson(root,'source-adjudications.json'), duplication: readJson(root,'transport-duplication-ledger.json')};
}
function assertAuthority(boundary, label, admissions) {
  equal(boundary.source_requests_executed_by_adjudication, 0, `${label}.source_requests`);
  equal(boundary.source_admissions_created, admissions, `${label}.source_admissions`);
  equal(boundary.field_classifications_created, 0, `${label}.field_classifications`);
  equal(boundary.field_terminalizations_created, 0, `${label}.field_terminalizations`);
  equal(boundary.matrix_updates, 0, `${label}.matrix_updates`);
  equal(boundary.row_state_mutations, 0, `${label}.row_state_mutations`);
  equal(boundary.class_closed, false, `${label}.class_closed`);
  equal(boundary.cumulative_ledger_effect, 'none', `${label}.cumulative`);
  equal(boundary.outside_human_dependency, false, `${label}.outside_human`);
  for (const key of ['publication_effect','adoption_effect','graph_effect','national_prevalence_effect','discrimination_effect','racial_order_effect','coordination_effect','common_purpose_effect','complete_compact_effect']) equal(boundary[key], 'none', `${label}.${key}`);
}

export function validateProduct(product, options = {}) {
  const verifyFiles = options.verifyFiles ?? false;
  const root = options.root ?? ROOT;
  const {capture, field, html, index, manifest, candidate, source, duplication} = product;
  equal(capture.schema_version, SCHEMA_VERSION, 'capture schema');
  equal(capture.canonical_parent, "048e9d13a2555d8e6fabdbee5f45aea858f919b7", 'canonical parent');
  equal(capture.canonical_parent_tree, "d354309d6b936b499c78f3d0ff47d20f69abda78", 'canonical tree');
  equal(capture.artifacts.length, 3, 'artifact denominator');
  equal(capture.artifacts.filter((a) => a.artifact_role === 'authoritative_semantic_transport_custody').length, 1, 'authoritative artifact denominator');
  equal(capture.transport_ledger.physical_requests_across_all_artifacts, 6, 'physical request observations');
  equal(capture.transport_ledger.authoritative_execution_physical_requests, 2, 'authoritative requests');
  equal(capture.transport_ledger.unique_body_identity_count, 2, 'unique bodies');
  equal(capture.transport_ledger.body_changes_across_executions, 0, 'body changes');
  equal(capture.additional_execution_authorized, false, 'execution ceiling');
  equal(capture.input_custody.current_matrix.git_blob, "66896190dd575f9867f1e121d845acfb4d27f56f", 'matrix blob');
  equal(capture.input_custody.selected_followup_protocol.git_blob, "7bbafd8f8c6c915442770ebbeca85b37afba8047", 'protocol blob');
  equal(capture.route_bodies.map((r) => r.body_sha256), ['b67637ce96affea164d2a467bae37327eeb9141e15d824ab092e017364595d8d','30268733f0aa5e2f1e3d7ce4aa0b3c748c0394afc5a0b860327ad64c19bdb81a'], 'route body identities');
  assertAuthority(capture.authority_boundary, 'capture authority', 0);

  equal(duplication.summary.artifact_count, 3, 'dup artifacts');
  equal(duplication.summary.duplicate_artifacts, 2, 'duplicate artifacts');
  equal(duplication.summary.unique_body_identities, 2, 'dup unique bodies');
  equal(duplication.summary.body_changes, 0, 'dup body changes');
  truth(duplication.route_body_identity.every((r) => r.artifact_body_identity_count === 3 && r.substantive_weight_count === 1), 'dedup weight');
  equal(duplication.additional_execution_authorized, false, 'dup execution ceiling');
  assertAuthority(duplication.authority_boundary, 'dup authority', 0);

  equal(html.receipts.length, 2, 'html receipts');
  equal(html.summary.all_visible_text_reviewed, true, 'html review complete');
  equal(html.summary.total_visible_text_characters, 7863, 'visible text total');
  const releaseReview = html.receipts.find((r) => r.route_id === 'RD04-W03-PPN-ND-FU-001');
  equal(releaseReview.document_title, 'Release Log', 'release title');
  equal(releaseReview.visible_text_sha256, '0db5be97b1050b9ee8e96d3384d4b37a44ce113681d4a6b651c83666561713cb', 'release visible text');
  equal(releaseReview.evidence_locators.length, 4, 'release locators');
  const historyReview = html.receipts.find((r) => r.route_id === 'RD04-W03-PPN-ND-FU-002');
  equal(historyReview.document_title, '403 Geographic Waiver History Log', 'history title');
  equal(historyReview.visible_text_sha256, 'db5643487b2ab859d628c30e0937e48a2599714a21fe66abe96e71671a3c027b', 'history visible text');
  equal(historyReview.evidence_locators.length, 3, 'history locators');
  truth(html.receipts.every((r) => r.all_visible_text_reviewed && r.result_spawned_requests === 0), 'html review boundary');
  assertAuthority(html.authority_boundary, 'html authority', 2);

  equal(source.decisions.length, 2, 'source decisions');
  equal(source.summary.narrow_source_admissions, 2, 'source admissions');
  equal(source.summary.transport_observations, 6, 'source transport observations');
  const bodySet = new Set();
  for (const decision of source.decisions) {
    equal(decision.source_admitted_for_narrow_scope, true, `${decision.route_id} admission`);
    equal(decision.substantive_weight_count, 1, `${decision.route_id} substantive weight`);
    equal(decision.transport_observations.length, 3, `${decision.route_id} observations`);
    truth(decision.transport_observations.every((o) => o.body_sha256 === decision.body_sha256), `${decision.route_id} body identity`);
    equal(decision.transport_observations.filter((o) => o.artifact_role === 'authoritative_semantic_transport_custody').length, 1, `${decision.route_id} authoritative observation`);
    const allowed = ROUTE_TARGET_FIELDS.get(decision.route_id);
    truth(decision.candidate_fields_for_offline_review.every((fieldId) => allowed.includes(fieldId)), `${decision.route_id} frozen target`);
    bodySet.add(decision.body_sha256);
  }
  equal(bodySet.size, 2, 'source unique bodies');
  assertAuthority(source.authority_boundary, 'source authority', 2);

  equal(field.decisions.length, 2, 'field decisions');
  equal(field.summary.evidence_complete_candidates, 1, 'field candidates');
  equal(field.summary.held_open_fields, 1, 'field holds');
  equal(field.frontier.terminal_matrix_cells_before, 226, 'terminal cells');
  equal(field.frontier.open_matrix_cells_before, 224, 'open cells');
  equal(field.frontier.open_substantive_cells_before, 184, 'open substantive');
  const authorityDecision = field.decisions.find((d) => d.field_id === 'operative_state_implementation_authority_and_version');
  equal(authorityDecision.disposition, 'evidence_complete_bounded_finding', 'authority disposition');
  equal(authorityDecision.promotion_candidate, true, 'authority candidate');
  equal(authorityDecision.bounded_finding.current_public_release_identifier, '26.5', 'current public release');
  equal(authorityDecision.bounded_finding.work_registration_release_sequence.length, 3, 'section 301 sequence');
  const waiverDecision = field.decisions.find((d) => d.field_id === 'abawd_or_work_requirement_waiver_state_and_governing_period');
  equal(waiverDecision.disposition, 'temporal_or_scope_ambiguity_hold_open', 'waiver disposition');
  equal(waiverDecision.promotion_candidate, false, 'waiver candidate');
  equal(waiverDecision.bounded_finding.current_post_2025_10_31_state, 'not_expressly_stated_in_captured_history_log', 'current waiver gap');
  truth(field.decisions.every((d) => d.substantive_field_terminalizations === 0 && d.field_classification_effect === 'none' && d.row_state_effect === 'none'), 'field no direct mutation');
  for (const decision of field.decisions) {
    for (const routeId of decision.source_route_ids) truth(ROUTE_TARGET_FIELDS.get(routeId).includes(decision.field_id), `${decision.decision_id} source route target`);
    for (const locator of decision.evidence_locators) truth(ROUTE_TARGET_FIELDS.get(locator.route_id).includes(decision.field_id), `${decision.decision_id} locator route target`);
  }
  assertAuthority(field.authority_boundary, 'field authority', 2);

  const matrix = JSON.parse(fs.readFileSync(path.join(root, MATRIX_PATH), 'utf8'));
  const nd = matrix.rows.find((row) => row.unit_id === 'US-STATE-ND');
  equal(nd.row_state, 'still_open', 'ND row state');
  equal(nd.terminal_fields, 6, 'ND terminal fields');
  equal(nd.open_fields, 3, 'ND open fields');
  for (const fieldId of ['operative_state_implementation_authority_and_version','abawd_or_work_requirement_waiver_state_and_governing_period']) {
    const cell = nd.cells.find((c) => c.field_id === fieldId);
    equal(cell.state, 'still_open', `${fieldId} current state`);
    equal(cell.terminal, false, `${fieldId} current terminal`);
    equal(canonicalSha(cell), field.frontier.target_cell_canonical_sha256[fieldId], `${fieldId} current hash`);
  }

  equal(candidate.candidate_count, 1, 'candidate count');
  equal(candidate.unique_candidate_cell_count, 1, 'candidate unique count');
  equal(candidate.held_cell_count, 1, 'candidate held count');
  equal(candidate.candidates.length, 1, 'candidate rows');
  equal(candidate.candidates[0].field_id, 'operative_state_implementation_authority_and_version', 'candidate field');
  equal(candidate.candidates[0].current_cell_canonical_sha256, '1e857cb90de38207a82ca2f844083ea56ef8d616c0aa229d135b0bb53f0cc382', 'candidate cell hash');
  equal(candidate, deriveCandidateProtocol(field), 'derived candidate protocol');

  equal(index, deriveIndex(capture, source, field), 'derived index');
  equal(manifest.permanent_path_count, 14, 'manifest path count');
  equal(manifest.hashed_file_count, 13, 'manifest hash count');
  equal(manifest.permanent_paths, PERMANENT_PATHS, 'manifest paths');
  equal(manifest.hashed_files.map((r) => r.path).sort(), PERMANENT_PATHS.filter((p) => p !== `${DATA_REL}/product-manifest.json`), 'manifest hashed paths');
  assertAuthority(manifest.authority_boundary, 'manifest authority', 2);

  if (verifyFiles) {
    const rows = [];
    for (const row of manifest.hashed_files) {
      const data = fs.readFileSync(path.join(root, row.path));
      equal(data.length, row.bytes, `${row.path} bytes`);
      equal(sha256(data), row.sha256, `${row.path} sha256`);
      equal(gitBlob(data), row.git_blob, `${row.path} git blob`);
      rows.push(`${row.path}\0${row.bytes}\0${row.sha256}\0${row.git_blob}\n`);
    }
    equal(sha256(Buffer.from(rows.join(''))), manifest.combined_sha256, 'manifest combined');
    for (const name of ['capture-custody.json','field-adjudications.json','html-review-receipts.json','index.json','promotion-candidate-protocol.json','source-adjudications.json','transport-duplication-ledger.json']) {
      const p = path.join(root, DATA_REL, name); const value = JSON.parse(fs.readFileSync(p, 'utf8')); equal(fs.readFileSync(p, 'utf8'), canonical(value), `${name} canonical JSON`);
    }
  }
  return {candidate_count: 1, field_decisions: 2, held_fields: 1, narrow_source_admissions: 2, source_decisions: 2, transport_observations: 6, unique_bodies: 2};
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(validateProduct(loadProduct(), {verifyFiles: true, root: ROOT})));
