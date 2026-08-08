#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const STEM = 'status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-field-promotion';
export const DATA_REL = `data/intake/${STEM}`;
export const DATA_DIR = path.join(ROOT, DATA_REL);
export const PREDECESSOR_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication';
export const SOURCE_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication';

export const FIELD_ORDER = Object.freeze([
  'canonical_state_identity',
  'operative_state_implementation_authority_and_version',
  'implementation_effective_date_or_typed_gap',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'discretionary_exemption_authority_and_reported_state_practice',
  'fitness_for_work_or_eligibility_screening_rule',
  'verification_evidence_and_staff_discretion_surface',
  'source_identities_and_exact_custody',
  'field_and_row_terminal_state',
]);

export const EXPECTED_SHA256 = Object.freeze({
  promotionCustody: '17b1309cd18f44eee882238ba152f31219cc1c852ba47bd1bbe7ad3422de70bf',
  promotionDecisions: '2e5fc9e8ed3fe8346680c37e2d85f763602c4e0bf9bdb4b2b3c7744b79b87e91',
  baseMatrix: 'a23febb325b1ac2224ad357225ffa22166223c24c7296d09551eb181269821e1',
  candidateProtocol: '4e0807ad813d3619b0ab4056813794f35db9ddcaca4c7c39882b29f8458fd3a7',
  fieldAdjudications: '970435624b358361faf0b921ca9e5adbfced970bc0ee29780f00520602c20c19',
  sourceAdjudications: '84bdc0a364b937ec221b9ca8c8cf1741154f07b07f739f72fa3e6530482d21a9',
  captureCustody: '4b62f1a251694996aed981c793609909f782d6e17c6d17cff42550bb993333e4',
});

export const EXPECTED_GIT_BLOBS = Object.freeze({
  baseMatrix: 'ab5f136d887aa6f21edc793e7394fee38b8ad6f6',
  candidateProtocol: '30705b3d0f74d1b75f81175c2e9ca3fa9bf76c4a',
  fieldAdjudications: 'ca0be819a522532ecc7b0ee07909382ece6a8329',
  sourceAdjudications: '53f378c9c4a56ca4aab0312bba38150b071786af',
  captureCustody: '863ab334d4f5a4a77003a9d39383ded489ab412e',
});

const EXPECTED_TARGETS = Object.freeze([
  ['RD04-NF-PC-01', 'US-STATE-MT', 'MT', 'verification_evidence_and_staff_discretion_surface'],
  ['RD04-NF-PC-02', 'US-STATE-ND', 'ND', 'verification_evidence_and_staff_discretion_surface'],
  ['RD04-NF-PC-03', 'US-STATE-OR', 'OR', 'implementation_effective_date_or_typed_gap'],
  ['RD04-NF-PC-04', 'US-STATE-WI', 'WI', 'implementation_effective_date_or_typed_gap'],
]);

const NONE_EFFECT_KEYS = Object.freeze([
  'publication_effect', 'adoption_effect', 'graph_effect', 'national_prevalence_effect',
  'discrimination_effect', 'coordination_effect', 'common_purpose_effect',
  'racial_order_effect', 'complete_compact_effect',
]);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortedDeep(value) {
  if (Array.isArray(value)) return value.map(sortedDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortedDeep(value[key])]));
  }
  return value;
}

function asciiEscape(value) {
  return value.replace(/[\u007f-\uffff]/g, (character) => {
    const code = character.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}

export function canonicalSha256(value) {
  const payload = `${asciiEscape(JSON.stringify(sortedDeep(value)))}\n`;
  return sha256(Buffer.from(payload));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: keys ${actual.join(',')} != ${expected.join(',')}`);
}

function exactArray(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isGitBlob(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function clone(value) {
  return structuredClone(value);
}

function readExactJson(filePath, expectedSha, label) {
  const bytes = fs.readFileSync(filePath);
  assert(sha256(bytes) === expectedSha, `${label}: exact SHA-256 mismatch`);
  const value = JSON.parse(bytes);
  assert(sha256(Buffer.from(stableJson(value))) === expectedSha, `${label}: canonical serialization mismatch`);
  return value;
}

function countBy(rows, getter) {
  const result = {};
  for (const row of rows) {
    const key = getter(row);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function loadInputs() {
  return {
    promotionCustody: readExactJson(path.join(DATA_DIR, 'promotion-input-custody.json'), EXPECTED_SHA256.promotionCustody, 'promotion custody'),
    promotionDecisions: readExactJson(path.join(DATA_DIR, 'promotion-decisions.json'), EXPECTED_SHA256.promotionDecisions, 'promotion decisions'),
    baseMatrix: readExactJson(path.join(ROOT, PREDECESSOR_REL, 'promoted-partial-field-matrix.json'), EXPECTED_SHA256.baseMatrix, 'base matrix'),
    candidateProtocol: readExactJson(path.join(ROOT, SOURCE_REL, 'promotion-candidate-protocol.json'), EXPECTED_SHA256.candidateProtocol, 'candidate protocol'),
    fieldAdjudications: readExactJson(path.join(ROOT, SOURCE_REL, 'field-adjudications.json'), EXPECTED_SHA256.fieldAdjudications, 'field adjudications'),
    sourceAdjudications: readExactJson(path.join(ROOT, SOURCE_REL, 'source-adjudications.json'), EXPECTED_SHA256.sourceAdjudications, 'source adjudications'),
    captureCustody: readExactJson(path.join(ROOT, SOURCE_REL, 'capture-custody.json'), EXPECTED_SHA256.captureCustody, 'capture custody'),
  };
}

function validateCommonIdentity(value, label) {
  assert(value.wave_id === 'SSC-RD-W03', `${label}: wave`);
  assert(value.lane_id === 'RD-04', `${label}: lane`);
  assert(value.class_id === 'RD-04-C02', `${label}: class`);
  assert(value.issue === 1017, `${label}: issue`);
}

export function validateInputs(inputs) {
  const {
    promotionCustody, promotionDecisions, baseMatrix, candidateProtocol,
    fieldAdjudications, sourceAdjudications, captureCustody,
  } = inputs;

  for (const [value, label] of [
    [promotionCustody, 'promotion custody'], [promotionDecisions, 'promotion decisions'],
    [baseMatrix, 'base matrix'], [candidateProtocol, 'candidate protocol'],
    [fieldAdjudications, 'field adjudications'], [sourceAdjudications, 'source adjudications'],
    [captureCustody, 'capture custody'],
  ]) validateCommonIdentity(value, label);

  exactKeys(promotionCustody, [
    'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'canonical_parent',
    'promotion_input_export', 'candidate_validation', 'current_main_reconciliation', 'authority_boundary',
  ], 'promotion custody');
  assert(promotionCustody.schema_version === 'ssc-rd04-wave03-five-state-field-promotion-input-custody@1', 'custody schema');
  exactKeys(promotionCustody.canonical_parent, [
    'commit', 'tree', 'source_export_workflow_run', 'source_export_artifact_id',
    'source_export_artifact_zip_bytes', 'source_export_artifact_zip_sha256',
    'repository_archive_bytes', 'repository_archive_sha256', 'reconstructed_tree',
  ], 'canonical parent custody');
  assert(promotionCustody.canonical_parent.commit === '1e52a58be874538509d6c0d3c06adc12fc53cad7', 'canonical parent commit');
  assert(promotionCustody.canonical_parent.tree === 'f2b948e6ff29779accb3dea8ceed143775237d28', 'canonical parent tree');
  assert(promotionCustody.canonical_parent.reconstructed_tree === promotionCustody.canonical_parent.tree, 'reconstructed tree identity');
  assert(promotionCustody.canonical_parent.source_export_workflow_run === 31225903715, 'source export run');
  assert(promotionCustody.canonical_parent.source_export_artifact_id === 9012124121, 'source export artifact');
  assert(promotionCustody.canonical_parent.source_export_artifact_zip_bytes === 258883145, 'source export ZIP bytes');
  assert(promotionCustody.canonical_parent.source_export_artifact_zip_sha256 === 'b5071a946440b130ffb54ea765a3b265a14e5355e174393387517722b137d11b', 'source export ZIP digest');
  assert(promotionCustody.canonical_parent.repository_archive_bytes === 258849952, 'repository archive bytes');
  assert(promotionCustody.canonical_parent.repository_archive_sha256 === '3fc46a1dbbbbc4649679940162d192bd13716ae35f9b813607f7da9ad32c0c84', 'repository archive digest');

  exactKeys(promotionCustody.promotion_input_export, [
    'pull_request', 'base_commit', 'head_commit', 'pull_request_merge_ref', 'workflow_run',
    'artifact_id', 'artifact_name', 'artifact_zip_bytes', 'artifact_zip_sha256',
    'receipt_schema', 'receipt_sha256', 'files',
  ], 'input export custody');
  const inputExport = promotionCustody.promotion_input_export;
  assert(inputExport.pull_request === 1416 && inputExport.base_commit === '46036c01eaba31bdb18045307fe3ebcb67d576a6', 'input export PR and base');
  assert(inputExport.head_commit === '65a3f2cf23793d7b982a2cde91cb0a56f19f0ec5', 'input export head');
  assert(inputExport.pull_request_merge_ref === '9c199130566af9362ddf2fd356217bb500019ad1', 'input export merge ref');
  assert(inputExport.workflow_run === 31222590200 && inputExport.artifact_id === 9010915522, 'input export run and artifact');
  assert(inputExport.artifact_name === 'ssc-rd04-five-state-promotion-input-export-v2', 'input export artifact name');
  assert(inputExport.artifact_zip_bytes === 52938 && inputExport.artifact_zip_sha256 === '1775158f98a2f1ad7becda70330d372907d1ab1472b64a5f0d6439f65fbe3102', 'input export artifact identity');
  assert(inputExport.receipt_schema === 'ssc-rd04-wave03-five-state-promotion-input-export@2', 'input export receipt schema');
  assert(inputExport.receipt_sha256 === '72d9c44fe6b18be3924a3843f8ef2842d62dcdb4677825b2039f0c9de4e3fa0e', 'input export receipt digest');
  assert(Array.isArray(inputExport.files) && inputExport.files.length === 5, 'five input files');

  const inputDescriptors = [
    ['captureCustody', `${SOURCE_REL}/capture-custody.json`, 'input/capture-custody.json', 2051],
    ['fieldAdjudications', `${SOURCE_REL}/field-adjudications.json`, 'input/field-adjudications.json', 33838],
    ['baseMatrix', `${PREDECESSOR_REL}/promoted-partial-field-matrix.json`, 'input/promoted-partial-field-matrix.json', 447445],
    ['candidateProtocol', `${SOURCE_REL}/promotion-candidate-protocol.json`, 'input/promotion-candidate-protocol.json', 5297],
    ['sourceAdjudications', `${SOURCE_REL}/source-adjudications.json`, 'input/source-adjudications.json', 38249],
  ];
  for (let index = 0; index < inputDescriptors.length; index += 1) {
    const [key, repositoryPath, artifactPath, bytes] = inputDescriptors[index];
    const descriptor = inputExport.files[index];
    exactKeys(descriptor, ['bytes', 'git_blob', 'path', 'repository_path', 'sha256'], `input file ${index + 1}`);
    assert(descriptor.repository_path === repositoryPath && descriptor.path === artifactPath, `input file ${index + 1}: path`);
    assert(descriptor.bytes === bytes, `input file ${index + 1}: bytes`);
    assert(descriptor.sha256 === EXPECTED_SHA256[key], `input file ${index + 1}: SHA`);
    assert(descriptor.git_blob === EXPECTED_GIT_BLOBS[key], `input file ${index + 1}: Git blob`);
    assert(isSha(descriptor.sha256) && isGitBlob(descriptor.git_blob), `input file ${index + 1}: digest shape`);
  }

  exactKeys(promotionCustody.candidate_validation, [
    'pull_request', 'base_commit', 'head_commit', 'pull_request_merge_ref', 'workflow_run',
    'artifact_id', 'artifact_name', 'artifact_zip_bytes', 'artifact_zip_sha256',
    'receipt_schema', 'receipt_bytes', 'receipt_sha256', 'validated_open_cell_count', 'validations',
  ], 'candidate validation custody');
  const validation = promotionCustody.candidate_validation;
  assert(validation.pull_request === 1414 && validation.base_commit === '46036c01eaba31bdb18045307fe3ebcb67d576a6', 'validation PR and base');
  assert(validation.head_commit === 'a5468eee718497e7af923fd5fe6369a8816fa214', 'validation head');
  assert(validation.pull_request_merge_ref === '95556151308f5e2ccaa9ef7b4246cff91e4d2974', 'validation merge ref');
  assert(validation.workflow_run === 31221041143 && validation.artifact_id === 9010373617, 'validation run and artifact');
  assert(validation.artifact_name === 'ssc-rd04-five-state-promotion-validation-v3', 'validation artifact name');
  assert(validation.artifact_zip_bytes === 2107 && validation.artifact_zip_sha256 === '7e09893969571d86fe49625f6f82b6d6f0230fcb5936156979b60dedf90f9e31', 'validation artifact identity');
  assert(validation.receipt_schema === 'ssc-rd04-wave03-five-state-promotion-validation@3', 'validation receipt schema');
  assert(validation.receipt_bytes === 5839 && validation.receipt_sha256 === '0b49a5d8626e624d5fa27d2725f4f823b424fd5adbb3956d66251b5c5d878643', 'validation receipt identity');
  assert(validation.validated_open_cell_count === 4 && validation.validations.length === 4, 'validation denominator');

  exactKeys(promotionCustody.current_main_reconciliation, [
    'comparison_base', 'observed_main', 'observed_tree', 'commits_ahead', 'changed_paths',
    'overlapping_input_paths', 'exact_input_git_blobs_unchanged', 'status',
  ], 'current main reconciliation');
  const reconciliation = promotionCustody.current_main_reconciliation;
  assert(reconciliation.comparison_base === '46036c01eaba31bdb18045307fe3ebcb67d576a6', 'reconciliation base');
  assert(reconciliation.observed_main === promotionCustody.canonical_parent.commit, 'reconciliation main');
  assert(reconciliation.observed_tree === promotionCustody.canonical_parent.tree, 'reconciliation tree');
  assert(reconciliation.commits_ahead === 2 && reconciliation.changed_paths === 14, 'reconciliation denominator');
  assert(reconciliation.overlapping_input_paths === 0 && reconciliation.exact_input_git_blobs_unchanged === 5, 'reconciliation path and blob boundary');
  assert(reconciliation.status === 'path_disjoint_and_input_identical', 'reconciliation status');

  exactKeys(promotionCustody.authority_boundary, [
    'source_requests', 'new_source_admissions', 'matrix_updates_before_product',
    'field_terminalizations_before_product', 'row_state_transitions_before_product',
    'class_closed_before_product', 'outside_human_dependency', 'external_contacts',
    'external_reviews', 'publication_effect', 'adoption_effect', 'graph_effect',
  ], 'custody authority boundary');
  const custodyBoundary = promotionCustody.authority_boundary;
  assert(custodyBoundary.source_requests === 0 && custodyBoundary.new_source_admissions === 0, 'custody request and source boundary');
  assert(custodyBoundary.matrix_updates_before_product === 0 && custodyBoundary.field_terminalizations_before_product === 0, 'custody pre-product matrix boundary');
  assert(custodyBoundary.row_state_transitions_before_product === 0 && custodyBoundary.class_closed_before_product === false, 'custody row and class boundary');
  assert(custodyBoundary.outside_human_dependency === false && custodyBoundary.external_contacts === 0 && custodyBoundary.external_reviews === 0, 'custody human boundary');
  assert(custodyBoundary.publication_effect === 'none' && custodyBoundary.adoption_effect === 'none' && custodyBoundary.graph_effect === 'none', 'custody effect boundary');

  exactKeys(promotionDecisions, [
    'schema_version', 'wave_id', 'lane_id', 'class_id', 'issue', 'decision_outcomes',
    'decision_count', 'decisions', 'authority_boundary',
  ], 'promotion decisions');
  assert(promotionDecisions.schema_version === 'ssc-rd04-wave03-five-state-field-promotion-decisions@1', 'decision schema');
  exactArray(promotionDecisions.decision_outcomes, ['promote_bounded_finding'], 'decision outcomes');
  assert(promotionDecisions.decision_count === 4 && promotionDecisions.decisions.length === 4, 'decision denominator');
  exactKeys(promotionDecisions.authority_boundary, [
    'new_source_admissions', 'authorized_matrix_updates', 'authorized_field_terminalizations',
    'authorized_row_state_transitions', 'authorized_class_closures', 'outside_human_dependency',
    'publication_effect', 'adoption_effect', 'graph_effect',
  ], 'decision authority boundary');
  assert(promotionDecisions.authority_boundary.new_source_admissions === 0, 'decision source boundary');
  assert(promotionDecisions.authority_boundary.authorized_matrix_updates === 4 && promotionDecisions.authority_boundary.authorized_field_terminalizations === 4, 'decision promotion authority');
  assert(promotionDecisions.authority_boundary.authorized_row_state_transitions === 0 && promotionDecisions.authority_boundary.authorized_class_closures === 0, 'decision row and class boundary');
  assert(promotionDecisions.authority_boundary.outside_human_dependency === false, 'decision outside-human boundary');
  assert(promotionDecisions.authority_boundary.publication_effect === 'none' && promotionDecisions.authority_boundary.adoption_effect === 'none' && promotionDecisions.authority_boundary.graph_effect === 'none', 'decision effect boundary');

  assert(baseMatrix.schema_version === 'ssc-rd04-wave03-mf7-row-state-promoted-partial-field-matrix@1', 'base matrix schema');
  exactArray(baseMatrix.field_order, FIELD_ORDER, 'base field order');
  assert(baseMatrix.rows.length === 50 && baseMatrix.counts.materialized_cells === 450, 'base matrix denominator');
  assert(baseMatrix.counts.terminal_cells === 218 && baseMatrix.counts.still_open_cells === 232, 'base matrix state denominator');
  assert(baseMatrix.counts.terminal_substantive_cells === 108 && baseMatrix.counts.still_open_substantive_cells === 192, 'base substantive denominator');
  assert(baseMatrix.counts.row_terminal_state_cells_terminal === 10 && baseMatrix.counts.row_terminal_state_cells_open === 40, 'base row-state denominator');
  assert(baseMatrix.counts.terminal_units === 10 && baseMatrix.counts.class_closed === false, 'base class boundary');

  assert(candidateProtocol.schema_version === 'ssc-rd04-wave03-five-state-promotion-candidate-protocol@1', 'candidate protocol schema');
  assert(candidateProtocol.candidate_count === 4 && candidateProtocol.candidates.length === 4, 'candidate denominator');
  assert(candidateProtocol.current_result.matrix_updates === 0 && candidateProtocol.current_result.field_terminalizations === 0, 'candidate authority withheld');
  assert(candidateProtocol.current_result.row_state_mutations === 0 && candidateProtocol.current_result.class_closed === false, 'candidate row and class authority withheld');
  assert(fieldAdjudications.schema_version === 'ssc-rd04-wave03-five-state-field-adjudications@1', 'field adjudication schema');
  assert(fieldAdjudications.decisions.length === 20, 'field decision denominator');
  assert(sourceAdjudications.schema_version === 'ssc-rd04-wave03-five-state-source-adjudications@1', 'source adjudication schema');
  assert(sourceAdjudications.decisions.length === 27, 'source decision denominator');
  assert(captureCustody.schema_version === 'ssc-rd04-wave03-five-state-route-discovery-capture-custody@1', 'capture custody schema');

  const fieldByIdentity = new Map(fieldAdjudications.decisions.map((row) => [`${row.unit_id}\0${row.field_id}`, row]));
  const sourceByRequest = new Map(sourceAdjudications.decisions.map((row) => [row.request_id, row]));
  const validationById = new Map(validation.validations.map((row) => [row.promotion_candidate_id, row]));

  for (let index = 0; index < 4; index += 1) {
    const candidate = candidateProtocol.candidates[index];
    const decision = promotionDecisions.decisions[index];
    const [candidateId, unitId, postalCode, fieldId] = EXPECTED_TARGETS[index];
    assert(candidate.promotion_ordinal === index + 1 && decision.promotion_decision_ordinal === index + 1, `target ${index + 1}: ordinal`);
    assert(candidate.promotion_candidate_id === candidateId && decision.promotion_candidate_id === candidateId, `target ${index + 1}: candidate ID`);
    assert(candidate.unit_id === unitId && decision.unit_id === unitId, `target ${index + 1}: unit`);
    assert(candidate.postal_code === postalCode && decision.postal_code === postalCode, `target ${index + 1}: postal`);
    assert(candidate.field_id === fieldId && decision.field_id === fieldId, `target ${index + 1}: field`);
    assert(candidate.state_name === decision.state_name, `target ${index + 1}: state name`);
    assert(candidate.disposition === 'evidence_complete_bounded_finding' && candidate.candidate_only === true, `target ${index + 1}: candidate classification`);
    assert(candidate.matrix_update_authority === false && candidate.field_terminalization_authority === false, `target ${index + 1}: predecessor authority withheld`);
    assert(candidate.required_predecessor_cell_state === 'still_open', `target ${index + 1}: required predecessor state`);
    assert(decision.state_before === 'still_open' && decision.terminal_before === false, `target ${index + 1}: decision before`);
    assert(decision.promotion_outcome === 'promote_bounded_finding', `target ${index + 1}: outcome`);
    assert(decision.promotion_reason_code === 'exact_current_cell_validated_and_bounded_official_finding_complete', `target ${index + 1}: reason`);
    assert(decision.state_after === 'evidence_complete' && decision.terminal_after === true, `target ${index + 1}: decision after`);
    assert(decision.authority_effect === 'one_bounded_matrix_cell_terminalized', `target ${index + 1}: authority effect`);
    assert(decision.row_state_transition === 'none' && decision.class_closure_effect === 'none', `target ${index + 1}: row and class effect`);
    assert(decision.outside_human_dependency === false, `target ${index + 1}: outside human`);
    for (const key of NONE_EFFECT_KEYS) assert(decision[key] === 'none', `target ${index + 1}: ${key}`);
    assert(decision.bounded_finding === candidate.bounded_finding, `target ${index + 1}: finding`);
    exactArray(decision.source_request_ids, candidate.source_request_ids, `target ${index + 1}: request IDs`);
    exactArray(decision.evidence_locators, candidate.evidence_locators, `target ${index + 1}: evidence locators`);

    const fieldDecision = fieldByIdentity.get(`${unitId}\0${fieldId}`);
    assert(fieldDecision && fieldDecision.decision_id === decision.field_decision_id, `target ${index + 1}: field decision binding`);
    assert(fieldDecision.disposition === 'evidence_complete_bounded_finding' && fieldDecision.promotion_candidate === true, `target ${index + 1}: field decision disposition`);
    assert(fieldDecision.bounded_finding === decision.bounded_finding, `target ${index + 1}: field finding binding`);
    assert(fieldDecision.rationale_code.length > 0, `target ${index + 1}: rationale`);

    const expectedBodyHashes = decision.source_request_ids.map((requestId) => {
      const source = sourceByRequest.get(requestId);
      assert(source && source.source_admitted_for_narrow_scope === true, `target ${index + 1}: admitted source ${requestId}`);
      assert(source.terminal_state === 'http_success' && source.http_status === 200, `target ${index + 1}: source response ${requestId}`);
      assert(source.body_bytes > 0 && isSha(source.body_sha256), `target ${index + 1}: source body ${requestId}`);
      return source.body_sha256;
    });
    exactArray(decision.source_body_sha256s, expectedBodyHashes, `target ${index + 1}: source body SHA`);

    const row = baseMatrix.rows.find((candidateRow) => candidateRow.unit_id === unitId);
    assert(row && row.postal_code === postalCode, `target ${index + 1}: current row`);
    const cell = row.cells.find((candidateCell) => candidateCell.field_id === fieldId);
    assert(cell && cell.state === 'still_open' && cell.terminal === false, `target ${index + 1}: current open cell`);
    assert(cell.value === null && cell.evidence_source_ids.length === 0 && cell.authority_effect === 'none', `target ${index + 1}: empty current cell`);
    assert(canonicalSha256(cell) === decision.exact_current_cell_canonical_sha256, `target ${index + 1}: current cell canonical SHA`);
    assert(canonicalSha256(row) === decision.exact_current_row_canonical_sha256, `target ${index + 1}: current row canonical SHA`);

    const validationRow = validationById.get(candidateId);
    assert(validationRow && validationRow.exact_current_cell_validation === 'pass', `target ${index + 1}: validation pass`);
    assert(validationRow.current_cell_canonical_sha256 === decision.exact_current_cell_canonical_sha256, `target ${index + 1}: validation cell SHA`);
    assert(validationRow.current_row_canonical_sha256 === decision.exact_current_row_canonical_sha256, `target ${index + 1}: validation row SHA`);
    assert(validationRow.current_cell_state === 'still_open' && validationRow.current_cell_terminal === false, `target ${index + 1}: validation current state`);
    assert(validationRow.promotion_authority_created === false, `target ${index + 1}: validation authority withheld`);
  }
}

function deriveMatrix(inputs) {
  const { baseMatrix, promotionDecisions, fieldAdjudications } = inputs;
  const matrix = clone(baseMatrix);
  matrix.schema_version = 'ssc-rd04-wave03-five-state-field-promoted-partial-field-matrix@1';
  matrix.five_state_field_promotion_product = {
    predecessor_matrix_path: `../status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication/promoted-partial-field-matrix.json`,
    predecessor_matrix_sha256: EXPECTED_SHA256.baseMatrix,
    candidate_protocol_path: `../status-sovereignty-rd-wave03-rd04-fl-mt-nd-or-wi-source-field-adjudication/promotion-candidate-protocol.json`,
    candidate_protocol_sha256: EXPECTED_SHA256.candidateProtocol,
    promotion_decisions_path: 'promotion-decisions.json',
    promotion_decisions_sha256: EXPECTED_SHA256.promotionDecisions,
    promotion_input_custody_path: 'promotion-input-custody.json',
    promotion_input_custody_sha256: EXPECTED_SHA256.promotionCustody,
    promoted_cell_count: 4,
  };

  const fieldByIdentity = new Map(fieldAdjudications.decisions.map((row) => [`${row.unit_id}\0${row.field_id}`, row]));
  const ledgerCells = [];
  for (const decision of promotionDecisions.decisions) {
    const row = matrix.rows.find((candidateRow) => candidateRow.unit_id === decision.unit_id);
    const cell = row.cells.find((candidateCell) => candidateCell.field_id === decision.field_id);
    const fieldDecision = fieldByIdentity.get(`${decision.unit_id}\0${decision.field_id}`);
    const stateBefore = clone(cell);
    const valueAfter = {
      terminal_classification: 'observed',
      finding_scope: 'bounded_official_state_field_observation',
      findings: [{
        promotion_candidate_id: decision.promotion_candidate_id,
        field_decision_id: decision.field_decision_id,
        rationale_code: fieldDecision.rationale_code,
        finding_summary: decision.bounded_finding,
        source_request_ids: clone(decision.source_request_ids),
        source_body_sha256s: clone(decision.source_body_sha256s),
        evidence_locators: clone(decision.evidence_locators),
      }],
      prohibited_inferences: clone(fieldDecision.prohibited_inferences),
    };
    cell.state = 'evidence_complete';
    cell.terminal = true;
    cell.value = valueAfter;
    cell.evidence_source_ids = clone(decision.source_request_ids);
    cell.typed_gap = null;
    cell.authority_effect = 'bounded_official_state_field_observation_only';
    ledgerCells.push({
      promotion_ordinal: ledgerCells.length + 1,
      promotion_candidate_id: decision.promotion_candidate_id,
      field_decision_id: decision.field_decision_id,
      unit_id: row.unit_id,
      postal_code: row.postal_code,
      state_name: row.state_name,
      field_id: decision.field_id,
      field_ordinal: FIELD_ORDER.indexOf(decision.field_id) + 1,
      current_cell_canonical_sha256: decision.exact_current_cell_canonical_sha256,
      current_row_canonical_sha256: decision.exact_current_row_canonical_sha256,
      state_before: stateBefore.state,
      terminal_before: stateBefore.terminal,
      typed_gap_before: stateBefore.typed_gap,
      state_after: cell.state,
      terminal_after: cell.terminal,
      value_after: clone(valueAfter),
      evidence_source_ids_after: clone(cell.evidence_source_ids),
      authority_effect: decision.authority_effect,
      row_state_transition: 'none',
      class_closure_effect: 'none',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    });
  }

  const affectedUnits = new Set(promotionDecisions.decisions.map((row) => row.unit_id));
  const derivedRowStateRefreshes = [];
  for (const row of matrix.rows) {
    const terminalFields = row.cells.filter((cell) => cell.terminal).length;
    const openFields = 9 - terminalFields;
    row.terminal_fields = terminalFields;
    row.open_fields = openFields;
    if (affectedUnits.has(row.unit_id)) {
      assert(row.row_state === 'still_open', `${row.unit_id}: promotion cannot terminalize row`);
      const terminalStateCell = row.cells[8];
      assert(terminalStateCell.state === 'still_open' && terminalStateCell.terminal === false, `${row.unit_id}: row-state cell remains open`);
      const typedGapBefore = terminalStateCell.typed_gap;
      terminalStateCell.typed_gap = `row_remains_open_because_${openFields}_required_cells_are_unresolved`;
      derivedRowStateRefreshes.push({
        unit_id: row.unit_id,
        postal_code: row.postal_code,
        row_state_before: row.row_state,
        row_state_after: row.row_state,
        terminal_fields_after: terminalFields,
        open_fields_after: openFields,
        typed_gap_before: typedGapBefore,
        typed_gap_after: terminalStateCell.typed_gap,
        transition_authority: 'derived_open_count_refresh_only',
      });
    }
  }

  const cells = matrix.rows.flatMap((row) => row.cells);
  const terminalCells = cells.filter((cell) => cell.terminal).length;
  const evidenceCompleteCells = cells.filter((cell) => cell.state === 'evidence_complete').length;
  const observedCells = cells.filter((cell) => cell.state === 'observed').length;
  const notPubliclyRecoveredCells = cells.filter((cell) => cell.state === 'not_publicly_recovered').length;
  const stillOpenCells = cells.filter((cell) => cell.state === 'still_open').length;
  const terminalSubstantiveCells = matrix.rows.reduce((sum, row) => sum + row.cells.slice(1, 7).filter((cell) => cell.terminal).length, 0);
  const stillOpenSubstantiveCells = matrix.rows.reduce((sum, row) => sum + row.cells.slice(1, 7).filter((cell) => !cell.terminal).length, 0);
  const terminalUnits = matrix.rows.filter((row) => row.row_state === 'terminal_fixed_public_record_obligation_complete').length;
  const terminalUnitIds = matrix.rows.filter((row) => row.row_state === 'terminal_fixed_public_record_obligation_complete').map((row) => row.unit_id);

  assert(terminalCells === 222 && stillOpenCells === 228, 'derived matrix terminal/open counts');
  assert(evidenceCompleteCells === 192 && observedCells === 17 && notPubliclyRecoveredCells === 13, 'derived matrix terminal state counts');
  assert(terminalSubstantiveCells === 112 && stillOpenSubstantiveCells === 188, 'derived substantive counts');
  assert(terminalUnits === 10 && terminalUnitIds.length === 10, 'derived terminal units');
  assert(ledgerCells.length === 4 && derivedRowStateRefreshes.length === 4, 'derived promotion denominator');

  matrix.counts = {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    inherited_terminal_cells: 218,
    promotion_target_cells: 4,
    newly_terminalized_promotion_cells: 4,
    evidence_complete_cells: evidenceCompleteCells,
    observed_cells: observedCells,
    not_publicly_recovered_cells: notPubliclyRecoveredCells,
    still_open_cells: stillOpenCells,
    terminal_cells: terminalCells,
    source_rows_promoted: 50,
    reported_use_rows: 37,
    reported_no_use_rows: 13,
    terminal_substantive_cells: terminalSubstantiveCells,
    still_open_substantive_cells: stillOpenSubstantiveCells,
    row_terminal_state_cells_terminal: terminalUnits,
    row_terminal_state_cells_open: 50 - terminalUnits,
    terminal_units: terminalUnits,
    class_closed: false,
  };
  matrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    discretionary_exemption_field_terminal: '50/50',
    minimum_frontier_target_cells_adjudicated: '21/21',
    minimum_frontier_row_state_cells_adjudicated: '7/7',
    five_state_promotion_candidates_promoted: '4/4',
    terminal_cells: '222/450',
    still_open_cells: '228/450',
    terminal_substantive_cells: 112,
    still_open_substantive_cells: 188,
    row_terminal_state_cells_terminal: 10,
    row_terminal_state_cells_open: 40,
    terminal_units: 10,
    terminal_unit_ids: terminalUnitIds,
    field_matrix_terminal: false,
    class_state: 'still_open',
    class_closed: false,
    outside_human_dependency: false,
    reviewed_disposition_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    prevalence_effect: 'none',
    discrimination_effect: 'none',
    coordination_effect: 'none',
    common_purpose_effect: 'none',
    racial_order_effect: 'none',
    complete_compact_effect: 'none',
  };

  return { matrix, ledgerCells, derivedRowStateRefreshes };
}

export function deriveProducts(inputs) {
  const { matrix, ledgerCells, derivedRowStateRefreshes } = deriveMatrix(inputs);
  const { promotionCustody, promotionDecisions } = inputs;

  const fieldCounts = FIELD_ORDER.map((fieldId, index) => {
    const cells = matrix.rows.map((row) => row.cells[index]);
    return {
      field_ordinal: index + 1,
      field_id: fieldId,
      evidence_complete_cells: cells.filter((cell) => cell.state === 'evidence_complete').length,
      observed_cells: cells.filter((cell) => cell.state === 'observed').length,
      not_publicly_recovered_cells: cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
      still_open_cells: cells.filter((cell) => cell.state === 'still_open').length,
      terminal_cells: cells.filter((cell) => cell.terminal).length,
    };
  });
  const stateRows = matrix.rows.map((row) => ({
    unit_ordinal: row.unit_ordinal,
    unit_id: row.unit_id,
    postal_code: row.postal_code,
    state_name: row.state_name,
    terminal_fields: row.terminal_fields,
    open_fields: row.open_fields,
    still_open_field_ids: row.cells.filter((cell) => !cell.terminal).map((cell) => cell.field_id),
    row_state: row.row_state,
  }));

  const cellPromotionLedger = {
    schema_version: 'ssc-rd04-wave03-five-state-cell-promotion-ledger@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor_matrix_path: `../status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-row-state-adjudication/promoted-partial-field-matrix.json`,
    predecessor_matrix_sha256: EXPECTED_SHA256.baseMatrix,
    promotion_decisions_path: 'promotion-decisions.json',
    promotion_decisions_sha256: EXPECTED_SHA256.promotionDecisions,
    counts: {
      promotion_candidates: 4,
      promoted_cells: 4,
      held_cells: 0,
      affected_states: 4,
      terminal_cells_before: 218,
      terminal_cells_after: 222,
      still_open_cells_before: 232,
      still_open_cells_after: 228,
      terminal_substantive_cells_before: 108,
      terminal_substantive_cells_after: 112,
      still_open_substantive_cells_before: 192,
      still_open_substantive_cells_after: 188,
      row_state_transitions: 0,
      derived_row_state_gap_refreshes: 4,
      terminal_units_after: 10,
    },
    field_promotion_counts: {
      implementation_effective_date_or_typed_gap: 2,
      verification_evidence_and_staff_discretion_surface: 2,
    },
    cells: ledgerCells,
    derived_row_state_refreshes: derivedRowStateRefreshes,
    current_result: {
      cell_promotion_complete: true,
      promoted_cells: '4/4',
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };

  const remainingOpenFieldCensus = {
    schema_version: 'ssc-rd04-wave03-five-state-remaining-open-field-census@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    matrix_path: 'promoted-partial-field-matrix.json',
    counts: {
      states: 50,
      materialized_cells: 450,
      terminal_cells: 222,
      still_open_cells: 228,
      terminal_substantive_cells: 112,
      substantive_fields_still_open: 188,
      row_terminal_state_cells_open: 40,
      terminal_units: 10,
      open_units: 40,
      class_closed: false,
    },
    field_counts: fieldCounts,
    rows: stateRows,
    next_bounded_operation: 'freeze a genuinely new fixed official-route protocol against the 188 still-open substantive state fields without reusing previously frozen URLs',
    authority_boundary: {
      public_silence_is_not_policy_absence: true,
      one_state_is_not_national_prevalence: true,
      source_admission_is_not_field_classification: true,
      bounded_field_promotion_is_not_row_or_class_closure: true,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };

  const promotionSummary = {
    schema_version: 'ssc-rd04-wave03-five-state-field-promotion-summary@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    input_counts: {
      predecessor_terminal_cells: 218,
      predecessor_still_open_cells: 232,
      predecessor_terminal_substantive_cells: 108,
      predecessor_still_open_substantive_cells: 192,
      promotion_candidates: 4,
      exact_current_cell_validations: 4,
    },
    promotion_counts: {
      candidates_promoted: 4,
      candidates_held: 0,
      unique_cells_terminalized: 4,
      affected_states: 4,
      row_state_transitions: 0,
      derived_row_state_gap_refreshes: 4,
    },
    field_promotion_counts: {
      implementation_effective_date_or_typed_gap: 2,
      verification_evidence_and_staff_discretion_surface: 2,
    },
    matrix_transition: {
      terminal_cells_before: 218,
      terminal_cells_after: 222,
      still_open_cells_before: 232,
      still_open_cells_after: 228,
      terminal_substantive_cells_before: 108,
      terminal_substantive_cells_after: 112,
      still_open_substantive_cells_before: 192,
      still_open_substantive_cells_after: 188,
      terminal_units_before: 10,
      terminal_units_after: 10,
      class_closed_before: false,
      class_closed_after: false,
    },
    affected_states: ['MT', 'ND', 'OR', 'WI'],
    current_result: {
      promotion_adjudication_complete: true,
      independently_supported_cells_promoted: 4,
      unsupported_or_incomplete_candidates_held: 0,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      new_source_admissions: 0,
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      racial_order_effect: 'none',
      complete_compact_effect: 'none',
    },
    next_bounded_operation: 'canonicalize and execute a new fixed-route protocol only after excluding every previously frozen URL and preserving zero automatic source, field, row, or class effects',
  };

  const index = {
    schema_version: 'ssc-rd04-wave03-five-state-field-promotion-index@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    status: 'complete',
    product: {
      product_id: 'ssc-rd04-wave03-fl-mt-nd-or-wi-field-promotion',
      permanent_paths: 14,
      data_files: 8,
      addition_only: true,
      transport_paths: 0,
    },
    custody: {
      canonical_parent: promotionCustody.canonical_parent.commit,
      canonical_parent_tree: promotionCustody.canonical_parent.tree,
      promotion_input_export_workflow_run: promotionCustody.promotion_input_export.workflow_run,
      promotion_input_export_artifact_id: promotionCustody.promotion_input_export.artifact_id,
      promotion_validation_workflow_run: promotionCustody.candidate_validation.workflow_run,
      promotion_validation_artifact_id: promotionCustody.candidate_validation.artifact_id,
      exact_input_files: 5,
      exact_current_cell_validations: 4,
    },
    counts: {
      promotion_candidates: 4,
      matrix_updates: 4,
      field_terminalizations: 4,
      row_state_transitions: 0,
      class_closures: 0,
      terminal_cells_after: 222,
      still_open_cells_after: 228,
      terminal_substantive_cells_after: 112,
      still_open_substantive_cells_after: 188,
      terminal_units_after: 10,
    },
    files: [
      'promotion-input-custody.json', 'promotion-decisions.json', 'cell-promotion-ledger.json',
      'promoted-partial-field-matrix.json', 'remaining-open-field-census.json',
      'promotion-summary.json', 'index.json', 'product-manifest.json',
    ],
    current_result: {
      product_complete: true,
      deterministic_replay: true,
      sources_admitted: 0,
      field_classifications: 4,
      row_state_transitions: 0,
      class_closed: false,
      cumulative_ledger_effect: 'four_bounded_field_promotions_only',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };

  return {
    'promotion-input-custody.json': clone(promotionCustody),
    'promotion-decisions.json': clone(promotionDecisions),
    'cell-promotion-ledger.json': cellPromotionLedger,
    'promoted-partial-field-matrix.json': matrix,
    'remaining-open-field-census.json': remainingOpenFieldCensus,
    'promotion-summary.json': promotionSummary,
    'index.json': index,
  };
}

export function buildManifest(products) {
  const entries = Object.entries(products).map(([relativePath, value]) => {
    const bytes = Buffer.from(stableJson(value));
    return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const combined = entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('');
  return {
    schema_version: 'ssc-rd04-wave03-five-state-field-promotion-manifest@1',
    permanent_data_files: 8,
    entries,
    combined_sha256: sha256(Buffer.from(combined)),
  };
}

export function expectedProducts(inputs) {
  const products = deriveProducts(inputs);
  return { ...products, 'product-manifest.json': buildManifest(products) };
}

export function readProducts() {
  const names = [
    'promotion-input-custody.json', 'promotion-decisions.json', 'cell-promotion-ledger.json',
    'promoted-partial-field-matrix.json', 'remaining-open-field-census.json',
    'promotion-summary.json', 'index.json', 'product-manifest.json',
  ];
  return Object.fromEntries(names.map((name) => [name, JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'))]));
}

export function validateProducts(products, inputs) {
  const expected = expectedProducts(inputs);
  exactArray(Object.keys(products), Object.keys(expected), 'product path order');
  for (const [name, expectedValue] of Object.entries(expected)) {
    assert(stableJson(products[name]) === stableJson(expectedValue), `${name}: deterministic derivation mismatch`);
  }

  const matrix = products['promoted-partial-field-matrix.json'];
  const ledger = products['cell-promotion-ledger.json'];
  const census = products['remaining-open-field-census.json'];
  const summary = products['promotion-summary.json'];
  const index = products['index.json'];
  const manifest = products['product-manifest.json'];

  assert(matrix.rows.length === 50 && matrix.rows.flatMap((row) => row.cells).length === 450, 'matrix denominator');
  assert(matrix.counts.terminal_cells === 222 && matrix.counts.still_open_cells === 228, 'matrix terminal/open counts');
  assert(matrix.counts.terminal_substantive_cells === 112 && matrix.counts.still_open_substantive_cells === 188, 'matrix substantive counts');
  assert(matrix.counts.terminal_units === 10 && matrix.counts.class_closed === false, 'matrix row/class boundary');
  assert(ledger.cells.length === 4 && ledger.derived_row_state_refreshes.length === 4, 'ledger denominator');
  assert(ledger.counts.row_state_transitions === 0 && ledger.counts.terminal_units_after === 10, 'ledger row boundary');
  assert(census.counts.substantive_fields_still_open === 188 && census.counts.class_closed === false, 'census boundary');
  assert(summary.matrix_transition.terminal_cells_after === 222 && summary.current_result.class_closed === false, 'summary boundary');
  assert(index.product.permanent_paths === 14 && index.product.data_files === 8 && index.product.transport_paths === 0, 'index path boundary');
  assert(index.counts.matrix_updates === 4 && index.counts.field_terminalizations === 4, 'index promotion counts');
  assert(index.current_result.outside_human_dependency === false && index.current_result.publication_effect === 'none', 'index authority boundary');
  assert(manifest.permanent_data_files === 8 && manifest.entries.length === 7, 'manifest denominator');
  assert(isSha(manifest.combined_sha256), 'manifest combined SHA');

  const targetCells = ledger.cells.map((entry) => {
    const row = matrix.rows.find((candidateRow) => candidateRow.unit_id === entry.unit_id);
    return row.cells.find((candidateCell) => candidateCell.field_id === entry.field_id);
  });
  assert(targetCells.every((cell) => cell.state === 'evidence_complete' && cell.terminal === true), 'all target cells terminalized');
  assert(targetCells.every((cell) => cell.authority_effect === 'bounded_official_state_field_observation_only'), 'target authority effect');
  assert(targetCells.every((cell) => cell.evidence_source_ids.length === 1), 'target evidence denominator');
  for (const postalCode of ['MT', 'ND', 'OR', 'WI']) {
    const row = matrix.rows.find((candidateRow) => candidateRow.postal_code === postalCode);
    assert(row.terminal_fields === 5 && row.open_fields === 4 && row.row_state === 'still_open', `${postalCode}: row state`);
    assert(row.cells[8].typed_gap === 'row_remains_open_because_4_required_cells_are_unresolved', `${postalCode}: row-state typed gap`);
  }
}

export function checkProducts(inputs) {
  const before = Object.fromEntries(fs.readdirSync(DATA_DIR).filter((name) => name.endsWith('.json')).sort().map((name) => [name, fs.readFileSync(path.join(DATA_DIR, name))]));
  const expected = expectedProducts(inputs);
  for (const [name, value] of Object.entries(expected)) {
    const bytes = Buffer.from(stableJson(value));
    assert(before[name] && before[name].equals(bytes), `${name}: on-disk bytes mismatch`);
  }
  assert(Object.keys(before).length === 8, 'exactly eight permanent data files required');
}

export function writeProducts(inputs) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const products = expectedProducts(inputs);
  for (const [name, value] of Object.entries(products)) fs.writeFileSync(path.join(DATA_DIR, name), stableJson(value));
  return products;
}

function main() {
  const inputs = loadInputs();
  validateInputs(inputs);
  const checkOnly = process.argv.includes('--check');
  if (checkOnly) {
    const products = readProducts();
    validateProducts(products, inputs);
    checkProducts(inputs);
  } else {
    const products = writeProducts(inputs);
    validateProducts(products, inputs);
  }
  const products = readProducts();
  console.log('rd04_five_state_field_promotion=pass');
  console.log('promotion_candidates=4');
  console.log('field_terminalizations=4');
  console.log('terminal_cells=222/450');
  console.log('still_open_substantive_fields=188');
  console.log('row_state_transitions=0');
  console.log('terminal_units=10');
  console.log('class_closed=false');
  console.log('outside_human_dependency=false');
  console.log(`manifest_combined_sha256=${products['product-manifest.json'].combined_sha256}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
