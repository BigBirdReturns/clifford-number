#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-field-promotion';
export const DATA_DIR = path.join(ROOT, DATA_REL);
export const OFFICIAL_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication';
export const OFFICIAL_DIR = path.join(ROOT, OFFICIAL_REL);
export const FIELD_ADJ_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication';
export const FIELD_ADJ_DIR = path.join(ROOT, FIELD_ADJ_REL);

export const EXPECTED_SHA256 = Object.freeze({
  promotionDecisions: 'a9d8ccd2e4d08f614ae92c6dc2728ff5516973285c341626c2491cdbf5c8ba92',
  promotionCustody: 'a093371e4c50191716fe96a608d7aa0d0e104dde43179bb64514fe8a5e18ffa4',
  baseMatrix: '93cd6840edfe329d4d49b715e5a981c8d390a2bb711cffbbd141e7f426ccbb41',
  candidates: '26cb4a60c4d0a76cf87a39af5e5201abf2ac2f8767498f65bcc9e6ae77d177a4',
  fieldManifest: '4e229ecde58ff36ec931966d398a2731eacd32294a5969356d50562abeda184e',
  officialManifest: '1b7f1d2c453d8e90abbf022a87b6ff4206e8db3826fd71dfa77b90cdb6c1af08',
});

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

export const CANDIDATE_FIELDS = Object.freeze(FIELD_ORDER.slice(1, 7));
export const EXPECTED_STATES = Object.freeze([
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]);

export const EXPECTED_CANDIDATE_IDS = Object.freeze([
  'RD04-W03-FIELD-001',
  'RD04-W03-FIELD-002',
  'RD04-W03-FIELD-005',
  'RD04-W03-FIELD-007',
  'RD04-W03-FIELD-008',
  'RD04-W03-FIELD-009',
  'RD04-W03-FIELD-012',
  'RD04-W03-FIELD-013',
  'RD04-W03-FIELD-017',
  'RD04-W03-FIELD-018',
  'RD04-W03-FIELD-019',
  'RD04-W03-FIELD-022',
  'RD04-W03-FIELD-023',
  'RD04-W03-FIELD-026',
  'RD04-W03-FIELD-027',
  'RD04-W03-FIELD-028',
  'RD04-W03-FIELD-030',
  'RD04-W03-FIELD-034',
  'RD04-W03-FIELD-035',
  'RD04-W03-FIELD-038',
  'RD04-W03-FIELD-047',
  'RD04-W03-FIELD-050',
  'RD04-W03-FIELD-052',
  'RD04-W03-FIELD-055',
  'RD04-W03-FIELD-056',
  'RD04-W03-FIELD-059',
  'RD04-W03-FIELD-063',
  'RD04-W03-FIELD-064',
  'RD04-W03-FIELD-065',
  'RD04-W03-FIELD-067',
  'RD04-W03-FIELD-068',
  'RD04-W03-FIELD-071',
  'RD04-W03-FIELD-072',
  'RD04-W03-FIELD-073',
  'RD04-W03-FIELD-075',
  'RD04-W03-FIELD-077',
  'RD04-W03-FIELD-081',
  'RD04-W03-FIELD-085',
]);

export const HOLD_DECISIONS = Object.freeze({
  'RD04-W03-FIELD-001': ['hold_open_scope_insufficient','et_plan_not_complete_state_implementation_authority'],
  'RD04-W03-FIELD-002': ['hold_open_scope_insufficient','ffy_period_not_complete_state_implementation_effective_date'],
  'RD04-W03-FIELD-008': ['hold_open_scope_insufficient','et_plan_not_complete_state_implementation_authority'],
  'RD04-W03-FIELD-009': ['hold_open_scope_insufficient','ffy_period_not_complete_state_implementation_effective_date'],
  'RD04-W03-FIELD-065': ['hold_open_governing_period_incomplete','as_of_snapshot_lacks_complete_governing_period'],
  'RD04-W03-FIELD-073': ['hold_open_governing_period_incomplete','as_of_snapshot_lacks_complete_governing_period'],
});

const NONE_EFFECT_KEYS = Object.freeze([
  'reviewed_disposition_effect','publication_effect','adoption_effect','graph_effect','prevalence_effect',
  'discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect','complete_compact_effect',
]);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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
function exactObject(actual, expected, label) {
  const a = Object.fromEntries(Object.entries(actual).sort(([x],[y]) => x.localeCompare(y)));
  const e = Object.fromEntries(Object.entries(expected).sort(([x],[y]) => x.localeCompare(y)));
  assert(JSON.stringify(a) === JSON.stringify(e), `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}
function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}
function readBytes(dir, rel) {
  return fs.readFileSync(path.join(dir, rel));
}
function clone(value) {
  return structuredClone(value);
}
function countBy(rows, getter) {
  const out = {};
  for (const row of rows) {
    const key = getter(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a],[b]) => a.localeCompare(b)));
}
function unique(values) {
  return [...new Set(values)];
}
function cellKey(unitId, fieldId) {
  return `${unitId}\u0000${fieldId}`;
}


export function loadInputs() {
  const paths = {
    promotionDecisions: [DATA_DIR, 'promotion-decisions.json'],
    promotionCustody: [DATA_DIR, 'promotion-input-custody.json'],
    baseMatrix: [OFFICIAL_DIR, 'partial-field-matrix.json'],
    candidates: [FIELD_ADJ_DIR, 'promotion-candidate-protocol.json'],
    fieldManifest: [FIELD_ADJ_DIR, 'product-manifest.json'],
    officialManifest: [OFFICIAL_DIR, 'product-manifest.json'],
  };
  const parsed = {};
  for (const [name, [dir, rel]] of Object.entries(paths)) {
    const data = readBytes(dir, rel);
    assert(sha256(data) === EXPECTED_SHA256[name], `${name}: exact SHA-256 mismatch`);
    parsed[name] = JSON.parse(data);
  }
  return parsed;
}

function normalizedCandidates(candidates, promotionDecisions) {
  const decisionById = new Map(promotionDecisions.decisions.map((row) => [row.candidate_decision_id, row]));
  return candidates.rows.map((row) => {
    const decision = decisionById.get(row.source_decision_id);
    assert(decision, `${row.source_decision_id}: promotion decision missing`);
    return {
      decision_id: row.source_decision_id,
      route_id: row.route_id,
      unit_id: row.unit_id,
      candidate_field: row.field_id,
      finding_code: decision.finding_code,
      finding_summary: row.candidate_bounded_finding,
      source_body_sha256: row.source_locator.body_sha256,
      evidence_locators: clone(decision.evidence_locators),
      promotion_state: 'awaiting_independent_matrix_promotion_validation',
    };
  });
}

export function validateInputs(inputs) {
  const { promotionDecisions, promotionCustody, baseMatrix, candidates, fieldManifest, officialManifest } = inputs;
  assert(sha256(stableJson(promotionDecisions)) === EXPECTED_SHA256.promotionDecisions, 'promotion decisions exact object SHA');
  assert(sha256(stableJson(promotionCustody)) === EXPECTED_SHA256.promotionCustody, 'promotion custody exact object SHA');
  assert(sha256(stableJson(baseMatrix)) === EXPECTED_SHA256.baseMatrix, 'base matrix exact object SHA');
  assert(sha256(stableJson(candidates)) === EXPECTED_SHA256.candidates, 'candidate protocol exact object SHA');
  assert(sha256(stableJson(fieldManifest)) === EXPECTED_SHA256.fieldManifest, 'field manifest exact object SHA');
  assert(sha256(stableJson(officialManifest)) === EXPECTED_SHA256.officialManifest, 'official manifest exact object SHA');

  exactKeys(promotionCustody, [
    'schema_version','wave_id','lane_id','class_id','issue','observed_main_at_authoring','main_reconciliation',
    'official_source_adjudication_merge','responsive_source_adjudication_merge','responsive_field_adjudication_merge',
    'base_matrix','official_product_manifest','promotion_candidate_protocol','field_adjudication_manifest',
    'promotion_decisions','empirical_requests','result_spawned_requests','external_contacts','external_reviews',
    'outside_human_dependency',
  ], 'promotion custody');
  exactKeys(promotionDecisions, ['schema_version','wave_id','lane_id','class_id','issue','decision_outcomes','decisions'], 'promotion decisions');
  exactKeys(candidates, [
    'schema_version','wave_id','lane_id','class_id','issue','predecessor_partial_matrix_path',
    'predecessor_partial_matrix_sha256','candidate_rows','matrix_updates_authorized',
    'field_terminalizations_authorized','rule','rows','current_result',
  ], 'candidate protocol');
  exactKeys(baseMatrix, ['schema_version','wave_id','lane_id','class_id','issue','field_order','counts','rows','current_result'], 'base matrix');

  for (const object of [promotionCustody, promotionDecisions, candidates, baseMatrix]) {
    assert(object.wave_id === 'SSC-RD-W03', 'wave identity');
    assert(object.lane_id === 'RD-04', 'lane identity');
    assert(object.class_id === 'RD-04-C02', 'class identity');
    assert(object.issue === 1017, 'issue identity');
  }
  assert(promotionCustody.schema_version === 'ssc-rd04-wave03-field-promotion-input-custody@1', 'custody schema');
  assert(promotionDecisions.schema_version === 'ssc-rd04-wave03-field-promotion-decisions@1', 'decision schema');
  assert(candidates.schema_version === 'ssc-rd04-wave03-responsive-link-promotion-candidate-protocol@1', 'candidate schema');
  assert(baseMatrix.schema_version === 'ssc-rd04-wave03-official-source-partial-field-matrix@1', 'base matrix schema');
  assert(fieldManifest.schema_version === 'ssc-rd04-wave03-responsive-link-field-adjudication-manifest@1', 'field manifest schema');
  assert(officialManifest.schema_version === 'ssc-rd04-wave03-official-source-adjudication-product-manifest@1', 'official manifest schema');

  const currentMain = '1f04c0abbf89f1529dfd428389392b3425499bc3';
  assert(promotionCustody.observed_main_at_authoring === currentMain, 'observed main custody');
  exactKeys(promotionCustody.main_reconciliation, ['comparison_base','observed_main','commits_ahead','changed_paths','overlapping_permanent_paths','overlap_status'], 'main reconciliation');
  assert(promotionCustody.main_reconciliation.comparison_base === currentMain, 'main reconciliation base');
  assert(promotionCustody.main_reconciliation.observed_main === currentMain, 'main reconciliation head');
  assert(promotionCustody.main_reconciliation.commits_ahead === 0 && promotionCustody.main_reconciliation.changed_paths === 0, 'main reconciliation denominator');
  assert(promotionCustody.main_reconciliation.overlapping_permanent_paths === 0 && promotionCustody.main_reconciliation.overlap_status === 'identical', 'main reconciliation overlap');
  assert(promotionCustody.official_source_adjudication_merge === '854d3fec35e57c0a0f0d06448146c99e5053dacf', 'official merge custody');
  assert(promotionCustody.responsive_source_adjudication_merge === '890bfd5d2a100c3fc934f7c68bfe348a3625d7da', 'responsive source merge custody');
  assert(promotionCustody.responsive_field_adjudication_merge === currentMain, 'responsive field merge custody');
  assert(promotionCustody.empirical_requests === 0 && promotionCustody.result_spawned_requests === 0, 'request boundary');
  assert(promotionCustody.external_contacts === 0 && promotionCustody.external_reviews === 0, 'external-human boundary');
  assert(promotionCustody.outside_human_dependency === false, 'outside-human boundary');

  exactKeys(promotionCustody.base_matrix, ['path','sha256','materialized_cells','terminal_cells','still_open_cells'], 'custody base matrix');
  exactKeys(promotionCustody.official_product_manifest, ['path','sha256','combined_sha256'], 'custody official manifest');
  exactKeys(promotionCustody.promotion_candidate_protocol, ['path','sha256','git_blob_sha','candidate_findings','unique_candidate_cells','promotion_authority'], 'custody candidates');
  exactKeys(promotionCustody.field_adjudication_manifest, ['path','sha256','git_blob_sha','combined_sha256'], 'custody field manifest');
  exactKeys(promotionCustody.promotion_decisions, ['path','sha256','candidate_decisions'], 'custody decisions');
  assert(promotionCustody.base_matrix.path === '../status-sovereignty-rd-wave03-rd04-official-source-adjudication/partial-field-matrix.json', 'base path');
  assert(promotionCustody.base_matrix.sha256 === EXPECTED_SHA256.baseMatrix, 'base SHA custody');
  assert(promotionCustody.base_matrix.materialized_cells === 450 && promotionCustody.base_matrix.terminal_cells === 100 && promotionCustody.base_matrix.still_open_cells === 350, 'base counts custody');
  assert(promotionCustody.official_product_manifest.sha256 === EXPECTED_SHA256.officialManifest, 'official manifest SHA custody');
  assert(promotionCustody.official_product_manifest.combined_sha256 === officialManifest.combined_sha256, 'official manifest combined custody');
  assert(promotionCustody.promotion_candidate_protocol.sha256 === EXPECTED_SHA256.candidates, 'candidate SHA custody');
  assert(promotionCustody.promotion_candidate_protocol.git_blob_sha === 'c89497be03adc76038b2e929ac07197072422743', 'candidate Git blob custody');
  assert(promotionCustody.promotion_candidate_protocol.candidate_findings === 38 && promotionCustody.promotion_candidate_protocol.unique_candidate_cells === 37, 'candidate counts custody');
  assert(promotionCustody.promotion_candidate_protocol.promotion_authority === false, 'candidate authority withheld');
  assert(promotionCustody.field_adjudication_manifest.sha256 === EXPECTED_SHA256.fieldManifest, 'field manifest SHA custody');
  assert(promotionCustody.field_adjudication_manifest.git_blob_sha === '1bdcbf67983d902cb9db9c9e29b24478ddb8898a', 'field manifest Git blob custody');
  assert(promotionCustody.field_adjudication_manifest.combined_sha256 === fieldManifest.combined_sha256, 'field manifest combined custody');
  assert(promotionCustody.promotion_decisions.sha256 === EXPECTED_SHA256.promotionDecisions && promotionCustody.promotion_decisions.candidate_decisions === 38, 'promotion decision custody');

  assert(candidates.predecessor_partial_matrix_path === 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication/partial-field-matrix.json', 'candidate predecessor path');
  assert(candidates.predecessor_partial_matrix_sha256 === EXPECTED_SHA256.baseMatrix, 'candidate predecessor SHA');
  assert(candidates.candidate_rows === 38 && candidates.matrix_updates_authorized === 0 && candidates.field_terminalizations_authorized === 0, 'candidate protocol boundary');
  assert(Array.isArray(candidates.rows) && candidates.rows.length === 38, '38 candidates required');
  exactArray(candidates.rows.map((row) => row.source_decision_id), EXPECTED_CANDIDATE_IDS, 'candidate ID order');

  exactArray(promotionDecisions.decision_outcomes, [
    'promote_bounded_finding','hold_open_scope_insufficient','hold_open_governing_period_incomplete',
  ], 'decision outcome vocabulary');
  assert(Array.isArray(promotionDecisions.decisions) && promotionDecisions.decisions.length === 38, '38 promotion decisions required');
  exactArray(promotionDecisions.decisions.map((row) => row.candidate_decision_id), EXPECTED_CANDIDATE_IDS, 'promotion decision ID order');

  const candidateKeys = [
    'promotion_ordinal','promotion_candidate_id','source_decision_id','route_id','unit_id','postal_code','state_name',
    'field_id','current_matrix_cell','candidate_bounded_finding','evidence_basis','counterevidence_or_limitation',
    'source_locator','promotion_authority','matrix_effect','terminalization_effect','class_closure_effect',
    'outside_human_dependency','publication_effect','adoption_effect','graph_effect','national_prevalence_effect',
    'discrimination_effect','coordination_effect','common_purpose_effect','complete_compact_effect',
  ];
  const sourceLocatorKeys = [
    'capture_artifact_id','capture_artifact_zip_sha256','body_path_in_capture_artifact','body_sha256','final_url',
    'review_text_path_not_retained','review_text_sha256','review_text_bytes','review_text_lines','extraction_method',
    'main_selector','locator_kind','line_start','line_end','page_start','page_end',
  ];
  const decisionKeys = [
    'promotion_decision_ordinal','candidate_decision_id','route_id','unit_id','candidate_field',
    'finding_code','source_body_sha256','evidence_locators','field_cell_state_before',
    'reviewed_disposition_effect','publication_effect','adoption_effect','graph_effect','prevalence_effect',
    'discrimination_effect','coordination_effect','common_purpose_effect','racial_order_effect',
    'complete_compact_effect','outside_human_dependency','promotion_outcome','promotion_reason_code',
    'promotion_reason_summary','field_cell_state_after','field_terminalization_effect',
  ];
  for (let index = 0; index < candidates.rows.length; index += 1) {
    const candidate = candidates.rows[index];
    const decision = promotionDecisions.decisions[index];
    exactKeys(candidate, candidateKeys, `candidate ${index + 1}`);
    exactKeys(candidate.current_matrix_cell, ['state','terminal','value','typed_gap','authority_effect'], `candidate ${index + 1} current cell`);
    exactKeys(candidate.source_locator, sourceLocatorKeys, `candidate ${index + 1} source locator`);
    exactKeys(decision, decisionKeys, `promotion decision ${index + 1}`);
    const expectedId = EXPECTED_CANDIDATE_IDS[index];
    assert(candidate.promotion_ordinal === index + 1, `candidate ${index + 1}: ordinal`);
    assert(candidate.promotion_candidate_id === `RD04-W03-PROMOTION-${String(index + 1).padStart(3, '0')}`, `candidate ${index + 1}: promotion ID`);
    assert(candidate.source_decision_id === expectedId, `candidate ${index + 1}: source ID`);
    assert(decision.promotion_decision_ordinal === index + 1, `decision ${index + 1}: ordinal`);
    assert(decision.candidate_decision_id === expectedId, `decision ${index + 1}: candidate binding`);
    assert(decision.route_id === candidate.route_id && decision.unit_id === candidate.unit_id && decision.candidate_field === candidate.field_id, `decision ${index + 1}: identity binding`);
    assert(decision.source_body_sha256 === candidate.source_locator.body_sha256, `decision ${index + 1}: source SHA binding`);
    assert(/^RD04-W03-LINK-[0-9]{3}$/.test(candidate.route_id), `candidate ${index + 1}: route ID`);
    assert(/^US-STATE-[A-Z]{2}$/.test(candidate.unit_id), `candidate ${index + 1}: unit ID`);
    assert(candidate.postal_code === candidate.unit_id.slice(-2), `candidate ${index + 1}: postal binding`);
    assert(CANDIDATE_FIELDS.includes(candidate.field_id), `candidate ${index + 1}: candidate field`);
    assert(candidate.current_matrix_cell.state === 'still_open' && candidate.current_matrix_cell.terminal === false && candidate.current_matrix_cell.value === null, `candidate ${index + 1}: open target`);
    assert(typeof candidate.current_matrix_cell.typed_gap === 'string' && candidate.current_matrix_cell.authority_effect === 'none', `candidate ${index + 1}: target gap`);
    assert(typeof candidate.candidate_bounded_finding === 'string' && candidate.candidate_bounded_finding.length >= 20, `candidate ${index + 1}: finding summary`);
    assert(typeof candidate.evidence_basis === 'string' && candidate.evidence_basis.length >= 20, `candidate ${index + 1}: evidence basis`);
    assert(typeof candidate.counterevidence_or_limitation === 'string' && candidate.counterevidence_or_limitation.length >= 20, `candidate ${index + 1}: limitation`);
    assert(isSha(candidate.source_locator.capture_artifact_zip_sha256) && isSha(candidate.source_locator.body_sha256) && isSha(candidate.source_locator.review_text_sha256), `candidate ${index + 1}: source digests`);
    assert(candidate.source_locator.capture_artifact_id === 8936867721, `candidate ${index + 1}: artifact identity`);
    assert(candidate.source_locator.review_text_bytes > 0 && candidate.source_locator.review_text_lines > 0, `candidate ${index + 1}: review denominator`);
    assert(candidate.promotion_authority === false && candidate.matrix_effect === 'none' && candidate.terminalization_effect === 'none' && candidate.class_closure_effect === 'none', `candidate ${index + 1}: authority withheld`);
    assert(candidate.outside_human_dependency === false, `candidate ${index + 1}: outside-human boundary`);
    for (const key of ['publication_effect','adoption_effect','graph_effect','national_prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','complete_compact_effect']) assert(candidate[key] === 'none', `candidate ${index + 1}: ${key}`);
    assert(typeof decision.finding_code === 'string' && decision.finding_code.length > 0, `decision ${index + 1}: finding code`);
    assert(Array.isArray(decision.evidence_locators) && decision.evidence_locators.length > 0 && decision.evidence_locators.every((x) => typeof x === 'string' && x.length > 0), `decision ${index + 1}: evidence locators`);
    assert(decision.field_cell_state_before === 'still_open', `decision ${index + 1}: before state`);
    assert(decision.outside_human_dependency === false, `decision ${index + 1}: outside-human boundary`);
    for (const key of NONE_EFFECT_KEYS) assert(decision[key] === 'none', `decision ${index + 1}: ${key}`);

    const hold = HOLD_DECISIONS[expectedId];
    if (hold) {
      assert(decision.promotion_outcome === hold[0], `decision ${index + 1}: hold outcome`);
      assert(decision.promotion_reason_code === hold[1], `decision ${index + 1}: hold reason code`);
      assert(decision.field_cell_state_after === 'still_open' && decision.field_terminalization_effect === 'none', `decision ${index + 1}: held state`);
    } else {
      assert(decision.promotion_outcome === 'promote_bounded_finding', `decision ${index + 1}: promotion outcome`);
      assert(decision.promotion_reason_code === 'exact_official_field_specific_observation', `decision ${index + 1}: promotion reason code`);
      assert(decision.field_cell_state_after === 'evidence_complete' && decision.field_terminalization_effect === 'observed', `decision ${index + 1}: promoted state`);
    }
    assert(typeof decision.promotion_reason_summary === 'string' && decision.promotion_reason_summary.length >= 40, `decision ${index + 1}: reason summary`);
  }

  exactArray(baseMatrix.field_order, FIELD_ORDER, 'base matrix field order');
  exactKeys(baseMatrix.counts, ['units','required_fields_per_unit','materialized_cells','evidence_complete_cells','still_open_cells','terminal_cells','terminal_units','class_closed'], 'base matrix counts');
  assert(baseMatrix.counts.units === 50 && baseMatrix.counts.required_fields_per_unit === 9 && baseMatrix.counts.materialized_cells === 450, 'base matrix denominator');
  assert(baseMatrix.counts.evidence_complete_cells === 100 && baseMatrix.counts.still_open_cells === 350 && baseMatrix.counts.terminal_cells === 100, 'base matrix states');
  assert(baseMatrix.counts.terminal_units === 0 && baseMatrix.counts.class_closed === false, 'base matrix class state');
  assert(Array.isArray(baseMatrix.rows) && baseMatrix.rows.length === 50, '50 base rows required');
  let terminalCount = 0;
  for (let index = 0; index < baseMatrix.rows.length; index += 1) {
    const row = baseMatrix.rows[index];
    const [code, name] = EXPECTED_STATES[index];
    exactKeys(row, ['unit_ordinal','unit_id','postal_code','state_name','row_state','terminal_fields','open_fields','cells'], `base row ${index + 1}`);
    assert(row.unit_ordinal === index + 1, `base row ${index + 1}: ordinal`);
    assert(row.unit_id === `US-STATE-${code}` && row.postal_code === code && row.state_name === name, `base row ${index + 1}: identity`);
    assert(row.row_state === 'still_open' && row.terminal_fields === 2 && row.open_fields === 7, `base row ${index + 1}: state counts`);
    assert(Array.isArray(row.cells) && row.cells.length === 9, `base row ${index + 1}: cells`);
    exactArray(row.cells.map((cell) => cell.field_id), FIELD_ORDER, `base row ${index + 1}: field order`);
    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex];
      exactKeys(cell, ['field_ordinal','field_id','state','terminal','value','evidence_source_ids','typed_gap','authority_effect'], `base row ${index + 1} cell ${cellIndex + 1}`);
      assert(cell.field_ordinal === cellIndex + 1, `base row ${index + 1} cell ${cellIndex + 1}: ordinal`);
      if (cellIndex === 0 || cellIndex === 7) {
        assert(cell.state === 'evidence_complete' && cell.terminal === true && cell.typed_gap === null, `base row ${index + 1} cell ${cellIndex + 1}: terminal state`);
        terminalCount += 1;
      } else assert(cell.state === 'still_open' && cell.terminal === false && cell.value === null && typeof cell.typed_gap === 'string', `base row ${index + 1} cell ${cellIndex + 1}: open state`);
    }
  }
  assert(terminalCount === 100, 'base terminal cell count');
  assert(baseMatrix.current_result.class_closed === false && baseMatrix.current_result.field_matrix_terminal === false, 'base current result');
  assert(fieldManifest.combined_sha256 === 'c5c2eebd8ced3c9c33a36f6ebdcd0848804d8ca91e41d86bf951a8538043eb10', 'field manifest combined SHA');
  assert(officialManifest.combined_sha256 === '2370fe654dae12b0b873e89589175f5947a731f5cb00128649b313c8f63c4fb8', 'official manifest combined SHA');
  return true;
}

export function deriveProducts(inputs) {
  validateInputs(inputs);
  const { promotionDecisions, baseMatrix, candidates } = inputs;
  const candidateRows = normalizedCandidates(candidates, promotionDecisions);
  const decisionById = new Map(promotionDecisions.decisions.map((row) => [row.candidate_decision_id, row]));
  const groups = new Map();
  for (const candidate of candidateRows) {
    const key = cellKey(candidate.unit_id, candidate.candidate_field);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ candidate, decision: decisionById.get(candidate.decision_id) });
  }
  assert(groups.size === 37, '37 unique candidate cells required');

  const promotedMatrix = clone(baseMatrix);
  promotedMatrix.schema_version = 'ssc-rd04-wave03-field-promoted-partial-field-matrix@1';
  const rowByUnit = new Map(promotedMatrix.rows.map((row) => [row.unit_id, row]));
  const ledgerCells = [];

  for (const row of promotedMatrix.rows) {
    for (const fieldId of CANDIDATE_FIELDS) {
      const entries = groups.get(cellKey(row.unit_id, fieldId));
      if (!entries) continue;
      const cell = row.cells.find((item) => item.field_id === fieldId);
      assert(cell && cell.state === 'still_open' && cell.terminal === false, `${row.unit_id}/${fieldId}: target cell must be open`);
      const promoted = entries.filter(({ decision }) => decision.promotion_outcome === 'promote_bounded_finding');
      const held = entries.filter(({ decision }) => decision.promotion_outcome !== 'promote_bounded_finding');
      assert(promoted.length === 0 || held.length === 0, `${row.unit_id}/${fieldId}: mixed promotion group forbidden`);
      const findingRows = entries.map(({ candidate, decision }) => ({
        candidate_decision_id: candidate.decision_id,
        route_id: candidate.route_id,
        finding_code: candidate.finding_code,
        finding_summary: candidate.finding_summary,
        source_body_sha256: candidate.source_body_sha256,
        evidence_locators: clone(candidate.evidence_locators),
        promotion_outcome: decision.promotion_outcome,
        promotion_reason_code: decision.promotion_reason_code,
        promotion_reason_summary: decision.promotion_reason_summary,
      }));
      const promotedState = promoted.length > 0;
      let valueAfter = null;
      if (promotedState) {
        valueAfter = {
          terminal_classification: 'observed',
          finding_scope: 'bounded_official_state_field_observation',
          findings: findingRows.map(({ promotion_outcome, promotion_reason_code, promotion_reason_summary, ...finding }) => finding),
          prohibited_inferences: [
            'do_not_infer_uniform_frontline_practice',
            'do_not_infer_person_level_outcome',
            'do_not_infer_statewide_fact_beyond_the_exact_finding_scope',
            'do_not_infer_national_prevalence',
            'do_not_infer_discrimination_coordination_common_purpose_or_racial_order',
            'do_not_infer_complete_compact',
          ],
        };
        cell.state = 'evidence_complete';
        cell.terminal = true;
        cell.value = valueAfter;
        cell.evidence_source_ids = unique(promoted.map(({ candidate }) => candidate.route_id));
        cell.typed_gap = null;
        cell.authority_effect = 'bounded_official_state_field_observation_only';
      }
      ledgerCells.push({
        cell_ordinal: ledgerCells.length + 1,
        unit_id: row.unit_id,
        postal_code: row.postal_code,
        state_name: row.state_name,
        field_id: fieldId,
        field_ordinal: FIELD_ORDER.indexOf(fieldId) + 1,
        candidate_count: entries.length,
        candidate_decision_ids: entries.map(({ candidate }) => candidate.decision_id),
        candidate_finding_codes: entries.map(({ candidate }) => candidate.finding_code),
        promotion_outcome: promotedState ? 'promoted_to_evidence_complete' : 'held_still_open',
        promoted_finding_count: promoted.length,
        held_finding_count: held.length,
        state_before: 'still_open',
        state_after: promotedState ? 'evidence_complete' : 'still_open',
        terminal_before: false,
        terminal_after: promotedState,
        value_after: valueAfter,
        evidence_route_ids: unique(entries.map(({ candidate }) => candidate.route_id)),
        source_body_sha256s: unique(entries.map(({ candidate }) => candidate.source_body_sha256)),
        findings: findingRows,
        authority_effect: promotedState ? 'one_bounded_matrix_cell_terminalized' : 'none',
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
        outside_human_dependency: false,
      });
    }
  }

  for (const row of promotedMatrix.rows) {
    const terminalFields = row.cells.filter((cell) => cell.terminal).length;
    const openFields = 9 - terminalFields;
    row.terminal_fields = terminalFields;
    row.open_fields = openFields;
    row.row_state = 'still_open';
    const terminalStateCell = row.cells[8];
    terminalStateCell.typed_gap = `row_remains_open_because_${openFields}_required_cells_are_unresolved`;
  }

  const terminalCells = promotedMatrix.rows.flatMap((row) => row.cells).filter((cell) => cell.terminal).length;
  const openCells = 450 - terminalCells;
  const promotedLedgerCells = ledgerCells.filter((cell) => cell.terminal_after);
  const heldLedgerCells = ledgerCells.filter((cell) => !cell.terminal_after);
  const promotedCandidateFindings = promotedLedgerCells.reduce((sum, cell) => sum + cell.promoted_finding_count, 0);
  const heldCandidateFindings = heldLedgerCells.reduce((sum, cell) => sum + cell.held_finding_count, 0);
  const affectedStates = unique(promotedLedgerCells.map((cell) => cell.postal_code));
  assert(terminalCells === 131 && openCells === 319, 'derived matrix cell counts');
  assert(promotedLedgerCells.length === 31 && heldLedgerCells.length === 6, 'derived promotion cell counts');
  assert(promotedCandidateFindings === 32 && heldCandidateFindings === 6, 'derived candidate finding counts');
  assert(affectedStates.length === 18, '18 affected states required');

  promotedMatrix.counts = {
    units: 50,
    required_fields_per_unit: 9,
    materialized_cells: 450,
    evidence_complete_cells: 131,
    still_open_cells: 319,
    terminal_cells: 131,
    newly_terminalized_cells: 31,
    candidate_findings_promoted: 32,
    candidate_findings_held: 6,
    terminal_units: 0,
    class_closed: false,
  };
  promotedMatrix.current_result = {
    canonical_state_identity_terminal: '50/50',
    source_identities_and_exact_custody_terminal: '50/50',
    independently_promoted_substantive_cells: 31,
    terminal_cells: '131/450',
    still_open_cells: '319/450',
    still_open_substantive_cells: 269,
    row_terminal_state_cells_open: 50,
    terminal_units: 0,
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

  const fieldPromotionCounts = Object.fromEntries(CANDIDATE_FIELDS.map((field) => [
    field,
    promotedLedgerCells.filter((cell) => cell.field_id === field).length,
  ]));
  exactObject(fieldPromotionCounts, {
    operative_state_implementation_authority_and_version: 1,
    implementation_effective_date_or_typed_gap: 9,
    abawd_or_work_requirement_waiver_state_and_governing_period: 1,
    discretionary_exemption_authority_and_reported_state_practice: 0,
    fitness_for_work_or_eligibility_screening_rule: 15,
    verification_evidence_and_staff_discretion_surface: 5,
  }, 'field promotion counts');

  const openFields = FIELD_ORDER.map((fieldId, index) => ({
    field_ordinal: index + 1,
    field_id: fieldId,
    still_open_cells: promotedMatrix.rows.filter((row) => row.cells[index].state === 'still_open').length,
    evidence_complete_cells: promotedMatrix.rows.filter((row) => row.cells[index].state === 'evidence_complete').length,
  })).filter((row) => row.still_open_cells > 0);
  exactObject(Object.fromEntries(openFields.map((row) => [row.field_id, row.still_open_cells])), {
    operative_state_implementation_authority_and_version: 49,
    implementation_effective_date_or_typed_gap: 41,
    abawd_or_work_requirement_waiver_state_and_governing_period: 49,
    discretionary_exemption_authority_and_reported_state_practice: 50,
    fitness_for_work_or_eligibility_screening_rule: 35,
    verification_evidence_and_staff_discretion_surface: 45,
    field_and_row_terminal_state: 50,
  }, 'remaining open field counts');

  const stateRows = promotedMatrix.rows.map((row) => ({
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
    schema_version: 'ssc-rd04-wave03-cell-promotion-ledger@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor_matrix_path: '../status-sovereignty-rd-wave03-rd04-official-source-adjudication/partial-field-matrix.json',
    promotion_decisions_path: 'promotion-decisions.json',
    counts: {
      candidate_findings: 38,
      unique_candidate_cells: 37,
      promoted_candidate_findings: 32,
      held_candidate_findings: 6,
      promoted_cells: 31,
      held_cells: 6,
      affected_states: 18,
      terminal_cells_before: 100,
      terminal_cells_after: 131,
      still_open_cells_after: 319,
      terminal_units_after: 0,
    },
    field_promotion_counts: fieldPromotionCounts,
    hold_outcome_counts: countBy(promotionDecisions.decisions.filter((row) => row.promotion_outcome !== 'promote_bounded_finding'), (row) => row.promotion_outcome),
    cells: ledgerCells,
    current_result: {
      cell_promotion_complete: true,
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
    schema_version: 'ssc-rd04-wave03-remaining-open-field-census@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    matrix_path: 'promoted-partial-field-matrix.json',
    counts: {
      states: 50,
      materialized_cells: 450,
      terminal_cells: 131,
      still_open_cells: 319,
      substantive_fields_total: 300,
      substantive_fields_terminal: 31,
      substantive_fields_still_open: 269,
      row_terminal_state_cells_still_open: 50,
      terminal_units: 0,
      class_closed: false,
    },
    field_census: openFields,
    state_rows: stateRows,
    authority: {
      missing_record_is_not_nonexistence: true,
      state_policy_is_not_uniform_frontline_practice: true,
      one_state_is_not_national_prevalence: true,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };

  const promotionSummary = {
    schema_version: 'ssc-rd04-wave03-field-promotion-summary@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    input_counts: {
      bounded_finding_candidates: 38,
      unique_candidate_cells: 37,
      states_with_candidates: 18,
    },
    promotion_counts: {
      candidate_findings_promoted: 32,
      candidate_findings_held: 6,
      unique_cells_terminalized: 31,
      unique_cells_held_open: 6,
      states_with_terminalizations: 18,
    },
    field_promotion_counts: fieldPromotionCounts,
    hold_reason_counts: countBy(promotionDecisions.decisions.filter((row) => row.promotion_outcome !== 'promote_bounded_finding'), (row) => row.promotion_reason_code),
    matrix_transition: {
      terminal_cells_before: 100,
      terminal_cells_after: 131,
      still_open_cells_before: 350,
      still_open_cells_after: 319,
      substantive_fields_still_open_after: 269,
      terminal_units_before: 0,
      terminal_units_after: 0,
      class_closed_before: false,
      class_closed_after: false,
    },
    affected_states: affectedStates,
    current_result: {
      promotion_adjudication_complete: true,
      independently_supported_cells_promoted: 31,
      unsupported_or_incomplete_candidates_held: 6,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      reviewed_disposition_changes: 0,
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
    next_bounded_operation: 'continue fixed-source acquisition and adjudication for the 269 still-open substantive state fields, preserving typed source gaps and refusing any inference from one state to national prevalence',
  };

  const index = {
    schema_version: 'ssc-rd04-wave03-field-promotion-index@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    promotion_input_custody_path: 'promotion-input-custody.json',
    promotion_decisions_path: 'promotion-decisions.json',
    cell_promotion_ledger_path: 'cell-promotion-ledger.json',
    promoted_partial_field_matrix_path: 'promoted-partial-field-matrix.json',
    remaining_open_field_census_path: 'remaining-open-field-census.json',
    promotion_summary_path: 'promotion-summary.json',
    counts: {
      candidate_findings: 38,
      candidate_findings_promoted: 32,
      candidate_findings_held: 6,
      unique_candidate_cells: 37,
      unique_cells_terminalized: 31,
      terminal_cells_before: 100,
      terminal_cells_after: 131,
      still_open_cells_after: 319,
      still_open_substantive_fields_after: 269,
      terminal_units: 0,
      result_spawned_requests: 0,
    },
    current_result: {
      independent_promotion_validation_complete: true,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      reviewed_disposition_changes: 0,
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
    next_bounded_operation: promotionSummary.next_bounded_operation,
  };

  const productFiles = [
    ['promotion-input-custody.json', inputs.promotionCustody],
    ['promotion-decisions.json', inputs.promotionDecisions],
    ['cell-promotion-ledger.json', cellPromotionLedger],
    ['promoted-partial-field-matrix.json', promotedMatrix],
    ['remaining-open-field-census.json', remainingOpenFieldCensus],
    ['promotion-summary.json', promotionSummary],
    ['index.json', index],
  ];
  const entries = productFiles.map(([rel, object]) => {
    const data = stableJson(object);
    return { path: rel, bytes: Buffer.byteLength(data), sha256: sha256(data) };
  });
  const productManifest = {
    schema_version: 'ssc-rd04-wave03-field-promotion-manifest@1',
    permanent_data_files: 8,
    entries,
    combined_sha256: sha256(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}\n`).join('')),
  };

  return {
    'cell-promotion-ledger.json': cellPromotionLedger,
    'promoted-partial-field-matrix.json': promotedMatrix,
    'remaining-open-field-census.json': remainingOpenFieldCensus,
    'promotion-summary.json': promotionSummary,
    'index.json': index,
    'product-manifest.json': productManifest,
  };
}

export function validateProducts(products, inputs) {
  const expected = deriveProducts(inputs);
  for (const [rel, expectedObject] of Object.entries(expected)) {
    assert(products[rel], `${rel}: missing product`);
    assert(stableJson(products[rel]) === stableJson(expectedObject), `${rel}: derived product mismatch`);
  }
  const matrix = products['promoted-partial-field-matrix.json'];
  const ledger = products['cell-promotion-ledger.json'];
  const census = products['remaining-open-field-census.json'];
  const summary = products['promotion-summary.json'];
  const index = products['index.json'];
  assert(matrix.counts.terminal_cells === 131 && matrix.counts.still_open_cells === 319 && matrix.counts.newly_terminalized_cells === 31, 'matrix transition');
  assert(matrix.counts.terminal_units === 0 && matrix.counts.class_closed === false, 'matrix class state');
  assert(ledger.counts.promoted_cells === 31 && ledger.counts.held_cells === 6, 'ledger cell counts');
  assert(ledger.counts.promoted_candidate_findings === 32 && ledger.counts.held_candidate_findings === 6, 'ledger finding counts');
  assert(census.counts.substantive_fields_still_open === 269 && census.counts.row_terminal_state_cells_still_open === 50, 'remaining census');
  assert(summary.current_result.reviewed_disposition_changes === 0 && summary.current_result.class_closed === false, 'summary authority');
  assert(index.current_result.prevalence_effect === 'none' && index.current_result.complete_compact_effect === 'none', 'index authority');
  return true;
}

export function readProducts() {
  const out = {};
  for (const rel of [
    'cell-promotion-ledger.json','promoted-partial-field-matrix.json','remaining-open-field-census.json',
    'promotion-summary.json','index.json','product-manifest.json',
  ]) out[rel] = JSON.parse(readBytes(DATA_DIR, rel));
  return out;
}

export function writeProducts(inputs = loadInputs()) {
  const products = deriveProducts(inputs);
  for (const [rel, object] of Object.entries(products)) fs.writeFileSync(path.join(DATA_DIR, rel), stableJson(object));
  return products;
}

export function checkProducts(inputs = loadInputs()) {
  const expected = deriveProducts(inputs);
  for (const [rel, object] of Object.entries(expected)) {
    const actual = readBytes(DATA_DIR, rel);
    const wanted = Buffer.from(stableJson(object));
    assert(actual.equals(wanted), `${rel}: deterministic output mismatch`);
  }
  validateProducts(readProducts(), inputs);
  return true;
}

export function cloneInputs(inputs) {
  return clone(inputs);
}

function main() {
  const mode = process.argv[2] ?? '--check';
  if (mode === '--write') writeProducts();
  else if (mode === '--check') checkProducts();
  else throw new Error(`unknown mode: ${mode}`);
  const products = readProducts();
  console.log(`rd04_field_promotion=${mode === '--write' ? 'written' : 'valid'}`);
  console.log(`candidate_findings=${products['cell-promotion-ledger.json'].counts.candidate_findings}`);
  console.log(`promoted_candidate_findings=${products['cell-promotion-ledger.json'].counts.promoted_candidate_findings}`);
  console.log(`held_candidate_findings=${products['cell-promotion-ledger.json'].counts.held_candidate_findings}`);
  console.log(`unique_cells_terminalized=${products['cell-promotion-ledger.json'].counts.promoted_cells}`);
  console.log(`terminal_cells=${products['promoted-partial-field-matrix.json'].counts.terminal_cells}/450`);
  console.log(`still_open_substantive_fields=${products['remaining-open-field-census.json'].counts.substantive_fields_still_open}`);
  console.log('class_closed=false');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
