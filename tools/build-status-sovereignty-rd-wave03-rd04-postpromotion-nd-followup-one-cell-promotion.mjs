import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = process.cwd();
export const SLUG = 'status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion';
export const OUTPUT_DIR = `data/intake/${SLUG}`;
export const SCHEMA_PATH = `schemas/${SLUG}.schema.json`;
export const CANONICAL_PARENT = '79a7e18bfd45f1b1d893fa8b9683710891d4bbca';
export const CANONICAL_PARENT_TREE = 'de7b86fbc9caa247bfa2a960f190626e22f1c4b6';
export const VALIDATION_PARENT = '30e151b3ff4aeb5e6353d443fab1c535bc6d7b69';
export const VALIDATION_PARENT_TREE = '9d5b15d4b78e3027a316f507e46692e215f7e5a8';
export const INTERVENING_MAIN_PATHS = Object.freeze([
  '.github/workflows/preference-custody-v55.yml',
  '.github/workflows/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.yml',
  'data/research/preference-custody/control-manifest-v55.json',
  'data/research/preference-custody/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.fixture.json',
  'docs/preference-custody-laboratory-floor-v55.md',
  'docs/preference-custody-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.md',
  'test/preference-custody-manifest-v55.test.js',
  'test/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.test.js',
  'tools/compile-preference-custody-manifest-v55.mjs',
  'tools/compile-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs',
  'tools/lib/preference-custody-manifest-v55.mjs',
  'tools/lib/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs',
  'tools/validate-preference-custody-manifest-v55.mjs',
  'tools/validate-preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs',
]);
export const INTERVENING_MAIN_PATHS_SHA256 = '766f152f69abddb8acfe01db6199de92b984a2fdba85a885ad476b42ca2cb624';
export const TARGET = Object.freeze({
  candidateId: 'RD04-PPN-ND-FU-CANDIDATE-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION',
  decisionId: 'RD04-PPN-ND-FU-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION',
  unitId: 'US-STATE-ND',
  postalCode: 'ND',
  stateName: 'North Dakota',
  fieldId: 'operative_state_implementation_authority_and_version',
  routeId: 'RD04-W03-PPN-ND-FU-001',
  beforeCellSha256: '1e857cb90de38207a82ca2f844083ea56ef8d616c0aa229d135b0bb53f0cc382',
});
export const HELD = Object.freeze({
  decisionId: 'RD04-PPN-ND-FU-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD',
  unitId: 'US-STATE-ND',
  fieldId: 'abawd_or_work_requirement_waiver_state_and_governing_period',
  routeId: 'RD04-W03-PPN-ND-FU-002',
  disposition: 'temporal_or_scope_ambiguity_hold_open',
  cellSha256: 'cbaabfa791f02aa4f17bc1b5b31e28775368b125a4b658cb216c22cd90a26dfe',
});
export const INPUTS = Object.freeze({
  matrix: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/promoted-partial-field-matrix.json',bytes:477363,sha256:'0e61600064296e14176b5cd43bb9e4e1d52b9f435d40ca4888175f98ca087182',gitBlob:'66896190dd575f9867f1e121d845acfb4d27f56f'}),
  protocol: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/promotion-candidate-protocol.json',bytes:3748,sha256:'4d255c0b0ca2409d37c65c0043d67234dd344201063e9869f7c0468c661a5314',gitBlob:'a93c685b47f2678e39bba8fb395fc5fdfdbee7ff'}),
  fieldAdjudications: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/field-adjudications.json',bytes:9644,sha256:'4e7605ae48540291cc8a8f700ae8cb83251ed39100604f2bf2ac583a1e3252bd',gitBlob:'11875231a4b074ea2ec4125cfbf0d27fcde44222'}),
  captureCustody: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/capture-custody.json',bytes:7197,sha256:'1c3303eab1b4458ee30a7ce39f212cf8b38013535b5794d236d23f474ba2305d',gitBlob:'c53688f9540033383594863cfec2dc932a515146'}),
  sourceAdjudications: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/source-adjudications.json',bytes:8138,sha256:'6277d64e9db7e93f857358e2dd90c969cc19ae68308bc98f6d79dfe6b876fa2f',gitBlob:'c46480e360d4302ec3e1846e43097d163c7d3c88'}),
  htmlReviewReceipts: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/html-review-receipts.json',bytes:4221,sha256:'41462501bcddc15af1d25257ea07c028d5dad5315d0cabafc06ac720f3c19852',gitBlob:'a9e82f717fe9293aaa588940b0974ffc095e7cfd'}),
  transportDuplicationLedger: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/transport-duplication-ledger.json',bytes:3899,sha256:'ee6af539f76a842aeedd5036678eaafc52e320955b772e98ceadda1bc933a223',gitBlob:'6d3efcbd5137e6e94229cebd57a79f5a80c95467'}),
  adjudicationManifest: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/product-manifest.json',bytes:6702,sha256:'6323bd5270be9b56f38639b8c8b5ccadbd986ee585f7f73ec7871a119134a98a',gitBlob:'4378b0f723a5705f80476af8dad3c197fc597bff'}),
  adjudicationValidator: Object.freeze({path:'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs',bytes:13290,sha256:'45c1116f7e20cbf9e0128923cde2ef9ce7cd3b4a3924d1bbb0ee38349a40e7a2',gitBlob:'fce38f5d25d8a69673f1c7144c6cb0cbf5c9df1f'}),
  adjudicationAdversarialTest: Object.freeze({path:'test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.test.js',bytes:5659,sha256:'1e7b1d9aa0a41107a5b1c90c54c93b897f7ab093012a27a53ad5f39086f4fbca',gitBlob:'5511a1c17ca6d010df1b568e7ccfcf258895e9cb'}),
});
export const VALIDATION = Object.freeze({
  pullRequest: 1585,
  workflowRun: 31277994050,
  head: '7f087930c47147fb097a719891f2d5f902b5025b',
  artifactId: 9027574937,
  artifactBytes: 10681,
  artifactZipSha256: 'c12b2bb95dcedb9b02aee4282835548d72a08a72f3488568c4966adb0b2aedfb',
  receiptSha256: '7b6fd6a65c9592445054379c0f1142bad02141a620e0855f6100ad49d486c5dc',
  ledgerSha256: '6200f25adc6216c2718371b7b4e1ee7e79cee661d9f7d47cc2b4efc5f7728d5f',
  inputInventorySha256: '72cdabf3cbbfb8cfcc1541ef715f5797ff53d184632550b6785cad21c911ddfc',
  postReleaseStatusSha256: '11366f8f20f7ac4a353fd5d68a2fbba76de492d17025e7b15e87c0d29e395901',
  state: 'candidate_validated',
  candidateCount: 1,
  admissibleCandidateCount: 1,
  heldCellCount: 1,
  routeTargetChecks: 1,
  locatorTargetChecks: 3,
});
export const ROUTE_TARGET_FIELDS = Object.freeze({
  'RD04-W03-PPN-ND-FU-001': Object.freeze(['operative_state_implementation_authority_and_version']),
  'RD04-W03-PPN-ND-FU-002': Object.freeze(['abawd_or_work_requirement_waiver_state_and_governing_period']),
});
export const OUTPUT_NAMES = Object.freeze([
  'promotion-input-custody.json',
  'promotion-decisions.json',
  'cell-promotion-ledger.json',
  'promoted-partial-field-matrix.json',
  'remaining-open-field-census.json',
  'promotion-summary.json',
  'index.json',
  'product-manifest.json',
]);
export const PERMANENT_PATHS = Object.freeze([
  `.github/workflows/${SLUG}.yml`,
  ...OUTPUT_NAMES.map((name) => `${OUTPUT_DIR}/${name}`),
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.md',
  SCHEMA_PATH,
  `test/${SLUG}.test.js`,
  `tools/build-${SLUG}.mjs`,
  `tools/validate-${SLUG}.mjs`,
]);
export const MANIFEST_PATH = `${OUTPUT_DIR}/product-manifest.json`;
export const PROHIBITED = Object.freeze([
  'do_not_count_duplicate_transport_as_independent_substantive_support',
  'do_not_infer_uniform_frontline_practice',
  'do_not_infer_person_level_outcome',
  'do_not_infer_statewide_fact_beyond_the_exact_finding_scope',
  'do_not_infer_national_prevalence',
  'do_not_infer_discrimination_or_racial_order',
  'do_not_infer_coordination_or_common_purpose',
  'do_not_infer_complete_compact',
  'do_not_close_rd04_c02',
]);
const AUTHORITY = Object.freeze({
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

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
export function gitBlob(bytes) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
export function canonicalSha(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(stable(value))));
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function readBoundJson(spec) {
  const bytes = fs.readFileSync(path.join(ROOT, spec.path));
  assert(bytes.length === spec.bytes, `input byte count differs: ${spec.path}`);
  assert(sha256Bytes(bytes) === spec.sha256, `input sha256 differs: ${spec.path}`);
  assert(gitBlob(bytes) === spec.gitBlob, `input git blob differs: ${spec.path}`);
  return JSON.parse(bytes.toString('utf8'));
}
function readBoundBytes(spec) {
  const bytes = fs.readFileSync(path.join(ROOT, spec.path));
  assert(bytes.length === spec.bytes, `input byte count differs: ${spec.path}`);
  assert(sha256Bytes(bytes) === spec.sha256, `input sha256 differs: ${spec.path}`);
  assert(gitBlob(bytes) === spec.gitBlob, `input git blob differs: ${spec.path}`);
  return bytes;
}
function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(target, text);
  return { path: relative, bytes: Buffer.byteLength(text), sha256: sha256Bytes(Buffer.from(text)), git_blob: gitBlob(Buffer.from(text)) };
}
function findRow(matrix, unitId) {
  const row = matrix.rows.find((candidate) => candidate.unit_id === unitId);
  assert(row, `row missing: ${unitId}`);
  return row;
}
function findCell(row, fieldId) {
  const cell = row.cells.find((candidate) => candidate.field_id === fieldId);
  assert(cell, `cell missing: ${row.unit_id}:${fieldId}`);
  return cell;
}
function primitiveSchema(value) {
  if (value === null) return {type:'null'};
  if (typeof value === 'boolean') return {type:'boolean'};
  if (typeof value === 'number') return Number.isInteger(value) ? {type:'integer'} : {type:'number'};
  if (typeof value === 'string') {
    if (/^[0-9a-f]{64}$/.test(value)) return {type:'string',pattern:'^[0-9a-f]{64}$'};
    if (/^[0-9a-f]{40}$/.test(value)) return {type:'string',pattern:'^[0-9a-f]{40}$'};
    return {type:'string'};
  }
  throw new Error(`unsupported schema primitive: ${typeof value}`);
}
function shapeSchema(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return {type:'array',maxItems:0};
    const itemSchemas = value.map(shapeSchema);
    const first = JSON.stringify(itemSchemas[0]);
    if (itemSchemas.every((schema) => JSON.stringify(schema) === first)) {
      return {type:'array',minItems:value.length,maxItems:value.length,items:itemSchemas[0]};
    }
    return {type:'array',minItems:value.length,maxItems:value.length,prefixItems:itemSchemas,items:false};
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return {
      type:'object',
      required:keys,
      properties:Object.fromEntries(keys.map((key) => [key, shapeSchema(value[key])])),
      additionalProperties:false,
    };
  }
  return primitiveSchema(value);
}
function buildClosedSchema(objects) {
  const variants = Object.values(objects).map((object) => {
    const schema = shapeSchema(object);
    schema.properties.schema_version = {const:object.schema_version};
    return schema;
  });
  return {
    $schema:'https://json-schema.org/draft/2020-12/schema',
    $id:`https://bigbirdreturns.github.io/clifford-number/schemas/${SLUG}.schema.json`,
    title:'RD-04 North Dakota follow-up one-cell promotion product',
    oneOf:variants,
  };
}
function recalcMatrix(matrix, predecessor) {
  const cells = matrix.rows.flatMap((row) => row.cells);
  const substantive = cells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  const rowState = cells.filter((cell) => cell.field_id === 'field_and_row_terminal_state');
  const terminalUnits = matrix.rows.filter((row) => findCell(row, 'field_and_row_terminal_state').terminal).map((row) => row.unit_id);
  Object.assign(matrix.counts, {
    units:matrix.rows.length,
    required_fields_per_unit:matrix.field_order.length,
    materialized_cells:cells.length,
    evidence_complete_cells:cells.filter((cell) => cell.state === 'evidence_complete').length,
    observed_cells:cells.filter((cell) => cell.state === 'observed').length,
    not_publicly_recovered_cells:cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    still_open_cells:cells.filter((cell) => !cell.terminal).length,
    terminal_cells:cells.filter((cell) => cell.terminal).length,
    terminal_substantive_cells:substantive.filter((cell) => cell.terminal).length,
    still_open_substantive_cells:substantive.filter((cell) => !cell.terminal).length,
    row_terminal_state_cells_terminal:rowState.filter((cell) => cell.terminal).length,
    row_terminal_state_cells_open:rowState.filter((cell) => !cell.terminal).length,
    terminal_units:terminalUnits.length,
    class_closed:false,
    postpromotion_candidate_cells:(predecessor.counts.postpromotion_candidate_cells ?? 0) + 1,
    newly_terminalized_postpromotion_cells:(predecessor.counts.newly_terminalized_postpromotion_cells ?? 0) + 1,
    postpromotion_nd_followup_candidate_cells:1,
    newly_terminalized_postpromotion_nd_followup_cells:1,
  });
  Object.assign(matrix.current_result, {
    terminal_cells:`${matrix.counts.terminal_cells}/450`,
    still_open_cells:`${matrix.counts.still_open_cells}/450`,
    terminal_substantive_cells:matrix.counts.terminal_substantive_cells,
    still_open_substantive_cells:matrix.counts.still_open_substantive_cells,
    row_terminal_state_cells_terminal:matrix.counts.row_terminal_state_cells_terminal,
    row_terminal_state_cells_open:matrix.counts.row_terminal_state_cells_open,
    terminal_units:terminalUnits.length,
    terminal_unit_ids:terminalUnits,
    field_matrix_terminal:false,
    class_state:'still_open',
    class_closed:false,
    outside_human_dependency:false,
    reviewed_disposition_effect:'none',
    publication_effect:'none',
    adoption_effect:'none',
    graph_effect:'none',
    prevalence_effect:'none',
    discrimination_effect:'none',
    coordination_effect:'none',
    common_purpose_effect:'none',
    racial_order_effect:'none',
    complete_compact_effect:'none',
  });
}
function buildCensus(matrix) {
  const substantiveIds = matrix.field_order.filter((_, index) => index >= 1 && index <= 6);
  const fieldCensus = [...substantiveIds, 'field_and_row_terminal_state'].map((fieldId) => {
    const cells = matrix.rows.map((row) => findCell(row, fieldId));
    return {
      field_ordinal:cells[0].field_ordinal,
      field_id:fieldId,
      still_open_cells:cells.filter((cell) => !cell.terminal).length,
      evidence_complete_cells:cells.filter((cell) => cell.state === 'evidence_complete').length,
      observed_cells:cells.filter((cell) => cell.state === 'observed').length,
      not_publicly_recovered_cells:cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    };
  });
  return {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-remaining-open-field-census@1',
    wave_id:'SSC-RD-W03',
    lane_id:'RD-04',
    class_id:'RD-04-C02',
    issue:1017,
    matrix_path:'promoted-partial-field-matrix.json',
    counts:{
      states:matrix.rows.length,
      materialized_cells:matrix.counts.materialized_cells,
      terminal_cells:matrix.counts.terminal_cells,
      still_open_cells:matrix.counts.still_open_cells,
      substantive_fields_total:300,
      substantive_fields_terminal:matrix.counts.terminal_substantive_cells,
      substantive_fields_still_open:matrix.counts.still_open_substantive_cells,
      row_terminal_state_cells_still_open:matrix.counts.row_terminal_state_cells_open,
      terminal_units:matrix.counts.terminal_units,
      class_closed:false,
    },
    field_census:fieldCensus,
    state_rows:matrix.rows.map((row) => ({
      unit_ordinal:row.unit_ordinal,
      unit_id:row.unit_id,
      postal_code:row.postal_code,
      state_name:row.state_name,
      terminal_fields:row.terminal_fields,
      open_fields:row.open_fields,
      still_open_field_ids:row.cells.filter((cell) => !cell.terminal).map((cell) => cell.field_id),
      row_state:row.row_state,
    })),
    authority_boundary:{matrix_updates:1,field_terminalizations:1,row_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
}
function manifestRows() {
  const rows = [];
  for (const relative of PERMANENT_PATHS) {
    if (relative === MANIFEST_PATH) continue;
    const bytes = fs.readFileSync(path.join(ROOT, relative));
    rows.push({path:relative,bytes:bytes.length,sha256:sha256Bytes(bytes),git_blob:gitBlob(bytes)});
  }
  return rows;
}
function provisionalManifest() {
  return {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-manifest@1',
    permanent_path_count:14,
    hashed_file_count:13,
    permanent_paths:[...PERMANENT_PATHS],
    hashed_files:PERMANENT_PATHS.filter((relative) => relative !== MANIFEST_PATH).map((relative) => ({path:relative,bytes:0,sha256:'0'.repeat(64),git_blob:'0'.repeat(40)})),
    combined_sha256:'0'.repeat(64),
    authority_boundary:{matrix_updates:1,field_terminalizations:1,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
}

export function buildProduct() {
  const predecessor = readBoundJson(INPUTS.matrix);
  const protocol = readBoundJson(INPUTS.protocol);
  const fields = readBoundJson(INPUTS.fieldAdjudications);
  const capture = readBoundJson(INPUTS.captureCustody);
  const sources = readBoundJson(INPUTS.sourceAdjudications);
  const html = readBoundJson(INPUTS.htmlReviewReceipts);
  const duplication = readBoundJson(INPUTS.transportDuplicationLedger);
  const adjudicationManifest = readBoundJson(INPUTS.adjudicationManifest);
  readBoundBytes(INPUTS.adjudicationValidator);
  readBoundBytes(INPUTS.adjudicationAdversarialTest);

  assert(predecessor.counts.materialized_cells === 450, 'predecessor matrix denominator differs');
  assert(predecessor.counts.terminal_cells === 226, 'predecessor terminal denominator differs');
  assert(predecessor.counts.still_open_cells === 224, 'predecessor open denominator differs');
  assert(predecessor.counts.still_open_substantive_cells === 184, 'predecessor substantive denominator differs');
  assert(predecessor.counts.terminal_units === 10, 'predecessor terminal-unit denominator differs');
  assert(predecessor.current_result.class_closed === false, 'predecessor class state differs');
  assert(protocol.candidate_count === 1 && protocol.unique_candidate_cell_count === 1 && protocol.held_cell_count === 1, 'candidate denominator differs');
  assert(fields.summary.evidence_complete_candidates === 1 && fields.summary.held_open_fields === 1, 'field denominator differs');
  assert(capture.transport_ledger.route_count === 2 && capture.transport_ledger.unique_body_identity_count === 2, 'capture denominator differs');
  assert(sources.summary.narrow_source_admissions === 2, 'source-admission denominator differs');
  assert(html.summary.html_documents === 2 && html.summary.all_visible_text_reviewed === true, 'HTML review denominator differs');
  assert(duplication.summary.unique_body_identities === 2 && duplication.summary.body_changes === 0, 'duplication denominator differs');
  assert(adjudicationManifest.permanent_path_count === 14 && adjudicationManifest.authority_boundary.matrix_updates === 0, 'adjudication manifest boundary differs');

  const candidate = protocol.candidates[0];
  equal([candidate.candidate_id,candidate.decision_id,candidate.unit_id,candidate.field_id,candidate.source_route_ids], [TARGET.candidateId,TARGET.decisionId,TARGET.unitId,TARGET.fieldId,[TARGET.routeId]], 'candidate identity differs');
  assert(candidate.current_cell_requirement === 'must_remain_still_open_on_exact_promotion_parent', 'candidate current-cell contract differs');
  assert(candidate.current_cell_canonical_sha256 === TARGET.beforeCellSha256, 'candidate current-cell hash differs');
  assert(candidate.promotion_effect_authorized_here === 'none' && candidate.row_state_effect === 'none', 'candidate authority boundary differs');

  const decision = fields.decisions.find((row) => row.decision_id === TARGET.decisionId);
  const heldDecision = fields.decisions.find((row) => row.decision_id === HELD.decisionId);
  assert(decision?.promotion_candidate === true && decision.disposition === 'evidence_complete_bounded_finding', 'candidate decision differs');
  assert(heldDecision?.promotion_candidate === false && heldDecision.disposition === HELD.disposition, 'held decision differs');
  equal(decision.bounded_finding, candidate.bounded_finding, 'bounded finding differs');
  equal(decision.source_route_ids, candidate.source_route_ids, 'source-route custody differs');
  equal(decision.evidence_locators, candidate.evidence_locators, 'evidence-locator custody differs');
  equal(heldDecision.source_route_ids, [HELD.routeId], 'held source route differs');

  const matrix = structuredClone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promoted-partial-field-matrix@1';
  const row = findRow(matrix, TARGET.unitId);
  const before = structuredClone(findCell(row, TARGET.fieldId));
  const heldBefore = structuredClone(findCell(row, HELD.fieldId));
  assert(before.state === 'still_open' && before.terminal === false, 'target cell is not still open');
  assert(canonicalSha(before) === TARGET.beforeCellSha256, 'target cell canonical hash differs');
  assert(heldBefore.state === 'still_open' && heldBefore.terminal === false, 'held cell is not still open');
  assert(canonicalSha(heldBefore) === HELD.cellSha256, 'held cell canonical hash differs');

  const source = sources.decisions.find((item) => item.route_id === TARGET.routeId);
  const routeBody = capture.route_bodies.find((item) => item.route_id === TARGET.routeId);
  const htmlReceipt = html.receipts.find((item) => item.route_id === TARGET.routeId);
  const duplicateIdentity = duplication.route_body_identity.find((item) => item.route_id === TARGET.routeId);
  assert(source?.source_admitted_for_narrow_scope === true, 'target source is not admitted');
  equal(source.candidate_fields_for_offline_review, [TARGET.fieldId], 'target source field scope differs');
  assert(source.substantive_weight_count === 1 && source.transport_observations.length === 3 && source.duplicate_transport_observations === 2, 'source duplicate-weight custody differs');
  assert(routeBody?.target_field_ids.length === 1 && routeBody.target_field_ids[0] === TARGET.fieldId, 'capture route target differs');
  assert(routeBody.body_sha256 === source.body_sha256 && routeBody.body_bytes === source.body_bytes && routeBody.unique_substantive_weight === 1, 'capture/source identity differs');
  assert(htmlReceipt?.all_visible_text_reviewed === true && htmlReceipt.body_sha256 === source.body_sha256 && htmlReceipt.body_bytes === source.body_bytes, 'HTML review custody differs');
  assert(duplicateIdentity?.body_sha256 === source.body_sha256 && duplicateIdentity.artifact_body_identity_count === 3 && duplicateIdentity.substantive_weight_count === 1, 'duplicate identity differs');
  assert(ROUTE_TARGET_FIELDS[TARGET.routeId].includes(TARGET.fieldId), 'target route does not authorize target field');
  for (const locator of candidate.evidence_locators) assert(locator.route_id === TARGET.routeId && ROUTE_TARGET_FIELDS[locator.route_id].includes(TARGET.fieldId), 'locator route target differs');

  const sourceCustody = {
    route_id:source.route_id,
    source_decision_id:source.source_decision_id,
    source_class:source.source_class,
    document_title:source.document_title,
    requested_url:source.requested_url,
    final_url:source.final_url,
    final_host:new URL(source.final_url).host,
    content_type:source.content_type,
    body_bytes:source.body_bytes,
    body_sha256:source.body_sha256,
    authoritative_route_receipt_sha256:routeBody.authoritative_route_receipt_sha256,
    html_review_receipt_id:source.html_review_receipt_id,
    visible_text_sha256:htmlReceipt.visible_text_sha256,
    all_visible_text_reviewed:htmlReceipt.all_visible_text_reviewed,
    transport_observation_count:source.transport_observations.length,
    duplicate_transport_observations:source.duplicate_transport_observations,
    substantive_weight_count:source.substantive_weight_count,
  };
  const finding = {
    candidate_id:candidate.candidate_id,
    candidate_decision_id:decision.decision_id,
    finding_code:candidate.bounded_finding.finding_code,
    finding_scope:candidate.bounded_finding.finding_scope,
    finding_summary:candidate.bounded_finding.finding_summary,
    bounded_finding:candidate.bounded_finding,
    source_routes:[sourceCustody],
    evidence_locators:candidate.evidence_locators,
    limitations:decision.limitations,
    promotion_validation:{
      pull_request:VALIDATION.pullRequest,
      workflow_run:VALIDATION.workflowRun,
      head:VALIDATION.head,
      artifact_id:VALIDATION.artifactId,
      artifact_bytes:VALIDATION.artifactBytes,
      artifact_zip_sha256:VALIDATION.artifactZipSha256,
      receipt_sha256:VALIDATION.receiptSha256,
      ledger_sha256:VALIDATION.ledgerSha256,
      exact_current_cell:'pass',
      candidate_and_source_identity:'pass',
      route_target_subset:'pass',
      html_review_custody:'pass',
      duplicate_weight_custody:'pass',
      held_cell_exclusion:'pass',
    },
  };
  const after = {
    ...before,
    state:'evidence_complete',
    terminal:true,
    value:{
      terminal_classification:'observed',
      finding_scope:'bounded_official_state_field_observation',
      findings:[finding],
      prohibited_inferences:[...new Set([...PROHIBITED,...decision.prohibited_inferences])],
    },
    evidence_source_ids:[TARGET.routeId],
    typed_gap:null,
    authority_effect:'bounded_official_state_field_observation_only',
  };
  const targetIndex = row.cells.findIndex((cell) => cell.field_id === TARGET.fieldId);
  row.cells[targetIndex] = after;
  row.terminal_fields += 1;
  row.open_fields -= 1;
  assert(row.terminal_fields === 7 && row.open_fields === 2 && row.row_state === 'still_open', 'North Dakota row transition differs');
  const rowState = findCell(row, 'field_and_row_terminal_state');
  assert(rowState.state === 'still_open' && rowState.terminal === false, 'North Dakota row-state cell changed');
  rowState.typed_gap = 'row_remains_open_because_2_required_cells_are_unresolved';

  recalcMatrix(matrix, predecessor);
  matrix.postpromotion_nd_followup_one_cell_promotion_product = {
    predecessor_matrix_path:INPUTS.matrix.path,
    predecessor_matrix_sha256:INPUTS.matrix.sha256,
    predecessor_matrix_git_blob:INPUTS.matrix.gitBlob,
    candidate_protocol_path:INPUTS.protocol.path,
    candidate_protocol_sha256:INPUTS.protocol.sha256,
    candidate_protocol_git_blob:INPUTS.protocol.gitBlob,
    validation_pull_request:VALIDATION.pullRequest,
    validation_workflow_run:VALIDATION.workflowRun,
    validation_head:VALIDATION.head,
    validation_artifact_id:VALIDATION.artifactId,
    validation_artifact_bytes:VALIDATION.artifactBytes,
    validation_artifact_zip_sha256:VALIDATION.artifactZipSha256,
    validation_receipt_sha256:VALIDATION.receiptSha256,
    validation_ledger_sha256:VALIDATION.ledgerSha256,
    canonical_parent:CANONICAL_PARENT,
    canonical_parent_tree:CANONICAL_PARENT_TREE,
    validation_parent:VALIDATION_PARENT,
    validation_parent_tree:VALIDATION_PARENT_TREE,
    main_reconciliation_status:'nonoverlapping_current_main_rebind',
    main_reconciliation_changed_paths_sha256:INTERVENING_MAIN_PATHS_SHA256,
    composition_rule:'terminalize_only_the_single_exactly_validated_north_dakota_operative_authority_cell_exclude_the_waiver_period_hold_and_leave_the_row_and_class_open',
  };
  assert(matrix.counts.terminal_cells === 227, 'derived terminal-cell count differs');
  assert(matrix.counts.still_open_cells === 223, 'derived open-cell count differs');
  assert(matrix.counts.terminal_substantive_cells === 117, 'derived substantive terminal count differs');
  assert(matrix.counts.still_open_substantive_cells === 183, 'derived substantive open count differs');
  assert(matrix.counts.terminal_units === 10, 'derived terminal-unit count differs');
  assert(findCell(row, HELD.fieldId).terminal === false && canonicalSha(findCell(row, HELD.fieldId)) === HELD.cellSha256, 'held cell changed');

  const custody = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-input-custody@1',
    wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    canonical_parent:CANONICAL_PARENT,
    canonical_parent_tree:CANONICAL_PARENT_TREE,
    main_reconciliation:{comparison_base:VALIDATION_PARENT,comparison_base_tree:VALIDATION_PARENT_TREE,observed_main:CANONICAL_PARENT,observed_main_tree:CANONICAL_PARENT_TREE,commits_ahead:2,changed_paths:[...INTERVENING_MAIN_PATHS],changed_paths_sha256:INTERVENING_MAIN_PATHS_SHA256,overlapping_input_paths:[],overlapping_permanent_paths:[],overlap_status:'nonoverlapping_current_main_rebind'},
    inputs:Object.fromEntries(Object.entries(INPUTS).map(([key,spec]) => [key,{path:spec.path,bytes:spec.bytes,sha256:spec.sha256,git_blob_sha:spec.gitBlob}])),
    validation_receipt:{
      validation_parent:VALIDATION_PARENT,validation_parent_tree:VALIDATION_PARENT_TREE,
      pull_request:VALIDATION.pullRequest,workflow_run:VALIDATION.workflowRun,head:VALIDATION.head,
      artifact_id:VALIDATION.artifactId,artifact_bytes:VALIDATION.artifactBytes,artifact_zip_sha256:VALIDATION.artifactZipSha256,
      receipt_sha256:VALIDATION.receiptSha256,ledger_sha256:VALIDATION.ledgerSha256,input_inventory_sha256:VALIDATION.inputInventorySha256,post_release_status_sha256:VALIDATION.postReleaseStatusSha256,
      state:VALIDATION.state,candidate_count:1,admissible_candidate_count:1,held_cell_count:1,route_target_checks:1,locator_target_checks:3,
      promotion_authority_created:false,separate_promotion_product_required:true,
    },
    target_cell:{unit_id:TARGET.unitId,field_id:TARGET.fieldId,state:'still_open',terminal:false,canonical_sha256:TARGET.beforeCellSha256},
    excluded_held_cell:{unit_id:HELD.unitId,field_id:HELD.fieldId,state:'still_open',terminal:false,canonical_sha256:HELD.cellSha256,disposition:HELD.disposition,excluded_from_candidate_denominator:true},
    source_requests:0,route_executions:0,new_source_admissions:0,result_spawned_requests:0,external_contacts:0,external_reviews:0,
    outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none',
  };
  const promotionDecision = {
    promotion_decision_ordinal:1,
    promotion_candidate_id:candidate.candidate_id,
    candidate_decision_id:decision.decision_id,
    unit_id:TARGET.unitId,postal_code:TARGET.postalCode,state_name:TARGET.stateName,candidate_field:TARGET.fieldId,
    source_route_ids:[TARGET.routeId],source_body_sha256s:[source.body_sha256],authoritative_route_receipt_sha256s:[routeBody.authoritative_route_receipt_sha256],
    evidence_locators:candidate.evidence_locators,bounded_finding:candidate.bounded_finding,
    field_cell_state_before:before.state,promotion_outcome:'promote_bounded_finding',
    promotion_reason_code:'exact_current_cell_candidate_source_html_duplicate_weight_and_hold_exclusion_validation_passed',
    promotion_reason_summary:'The exact canonical cell remained open, the candidate and field decision matched, the frozen route and all three locators remained within the operative-authority target, visible HTML review was complete, duplicate transport retained one substantive weight, and the waiver-period cell remained separately held.',
    field_cell_state_after:'evidence_complete',field_terminalization_effect:'observed',route_target_source_checks:1,route_target_locator_checks:3,
    ...AUTHORITY,
  };
  const decisionObject = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-decisions@1',
    wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    decision_outcomes:['promote_bounded_finding'],candidate_count:1,admissible_candidate_count:1,scope_held_candidate_count:0,
    excluded_held_decisions:[{decision_id:heldDecision.decision_id,unit_id:HELD.unitId,field_id:HELD.fieldId,disposition:heldDecision.disposition,source_route_ids:[HELD.routeId],current_cell_state:heldBefore.state,current_cell_terminal:heldBefore.terminal,current_cell_canonical_sha256:HELD.cellSha256,excluded_from_candidate_denominator:true}],
    decisions:[promotionDecision],
    authority_boundary:{matrix_updates:1,field_terminalizations:1,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
  const cellLedger = {
    cell_ordinal:1,unit_id:TARGET.unitId,postal_code:TARGET.postalCode,state_name:TARGET.stateName,field_id:TARGET.fieldId,field_ordinal:before.field_ordinal,
    candidate_count:1,promotion_candidate_ids:[candidate.candidate_id],candidate_decision_ids:[decision.decision_id],promotion_outcome:'promoted_to_evidence_complete',promoted_finding_count:1,held_finding_count:0,
    state_before:before.state,state_after:after.state,terminal_before:false,terminal_after:true,before_cell_sha256:canonicalSha(before),after_cell_sha256:canonicalSha(after),
    value_after:after.value,evidence_route_ids:[TARGET.routeId],source_body_sha256s:[source.body_sha256],authoritative_route_receipt_sha256s:[routeBody.authoritative_route_receipt_sha256],
    findings:[{...finding,promotion_outcome:'promote_bounded_finding',promotion_reason_code:promotionDecision.promotion_reason_code,promotion_reason_summary:promotionDecision.promotion_reason_summary}],
    authority_effect:'one_bounded_matrix_cell_terminalized',...AUTHORITY,
  };
  const fieldPromotionCounts = {
    operative_state_implementation_authority_and_version:1,
    implementation_effective_date_or_typed_gap:0,
    abawd_or_work_requirement_waiver_state_and_governing_period:0,
    discretionary_exemption_authority_and_reported_state_practice:0,
    fitness_for_work_or_eligibility_screening_rule:0,
    verification_evidence_and_staff_discretion_surface:0,
  };
  const ledger = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-cell-promotion-ledger@1',
    wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    predecessor_matrix_path:INPUTS.matrix.path,promotion_decisions_path:'promotion-decisions.json',
    counts:{candidate_findings:1,unique_candidate_cells:1,promoted_candidate_findings:1,scope_held_candidate_findings:0,excluded_held_decisions:1,promoted_cells:1,affected_states:1,terminal_cells_before:226,terminal_cells_after:227,still_open_cells_before:224,still_open_cells_after:223,open_substantive_cells_before:184,open_substantive_cells_after:183,terminal_units_after:10,route_target_source_checks:1,route_target_locator_checks:3},
    field_promotion_counts:fieldPromotionCounts,cells:[cellLedger],
    authority_boundary:{matrix_updates:1,field_terminalizations:1,row_terminalizations:0,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
  const census = buildCensus(matrix);
  const nextOperation = 'return the remaining North Dakota waiver-period hold to a separately authorized current-period source acquisition and adjudication transaction; no later result may create automatic row, class, cumulative-ledger, publication, adoption, or graph authority';
  const summary = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-summary@1',
    wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    input_counts:{bounded_finding_candidates:1,unique_candidate_cells:1,states_with_candidates:1,held_decisions_excluded:1},
    promotion_counts:{candidate_findings_promoted:1,candidate_findings_scope_held:0,unique_cells_terminalized:1,states_with_terminalizations:1},
    field_promotion_counts:fieldPromotionCounts,route_target_checks:{candidate_to_source_routes:1,candidate_to_evidence_locators:3},
    matrix_transition:{terminal_cells_before:226,terminal_cells_after:227,still_open_cells_before:224,still_open_cells_after:223,substantive_fields_still_open_before:184,substantive_fields_still_open_after:183,terminal_units_before:10,terminal_units_after:10,north_dakota_terminal_fields_before:6,north_dakota_terminal_fields_after:7,north_dakota_open_fields_before:3,north_dakota_open_fields_after:2,north_dakota_row_state_before:'still_open',north_dakota_row_state_after:'still_open',class_closed_before:false,class_closed_after:false},
    affected_states:['ND'],
    current_result:{promotion_adjudication_complete:true,independently_supported_cells_promoted:1,scope_held_candidates:0,held_north_dakota_cells_remaining:1,field_matrix_terminal:false,class_state:'still_open',class_closed:false,outside_human_dependency:false,external_contacts:0,external_reviews:0,reviewed_disposition_changes:0,publication_effect:'none',adoption_effect:'none',graph_effect:'none',prevalence_effect:'none',discrimination_effect:'none',coordination_effect:'none',common_purpose_effect:'none',racial_order_effect:'none',complete_compact_effect:'none'},
    next_bounded_operation:nextOperation,
  };
  const index = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-index@1',
    wave_id:'SSC-RD-W03',lane_id:'RD-04',class_id:'RD-04-C02',issue:1017,
    promotion_input_custody_path:'promotion-input-custody.json',promotion_decisions_path:'promotion-decisions.json',cell_promotion_ledger_path:'cell-promotion-ledger.json',promoted_partial_field_matrix_path:'promoted-partial-field-matrix.json',remaining_open_field_census_path:'remaining-open-field-census.json',promotion_summary_path:'promotion-summary.json',
    counts:{candidate_findings:1,candidate_findings_promoted:1,candidate_findings_scope_held:0,excluded_held_decisions:1,unique_candidate_cells:1,unique_cells_terminalized:1,terminal_cells_before:226,terminal_cells_after:227,still_open_cells_after:223,still_open_substantive_fields_after:183,terminal_units:10,result_spawned_requests:0},
    current_result:{independent_promotion_validation_complete:true,field_matrix_terminal:false,class_state:'still_open',class_closed:false,outside_human_dependency:false,reviewed_disposition_changes:0,publication_effect:'none',adoption_effect:'none',graph_effect:'none',prevalence_effect:'none',discrimination_effect:'none',coordination_effect:'none',common_purpose_effect:'none',racial_order_effect:'none',complete_compact_effect:'none'},
    next_bounded_operation:nextOperation,
  };

  const objects = {custody,decisions:decisionObject,ledger,matrix,census,summary,index};
  writeJson(`${OUTPUT_DIR}/promotion-input-custody.json`, custody);
  writeJson(`${OUTPUT_DIR}/promotion-decisions.json`, decisionObject);
  writeJson(`${OUTPUT_DIR}/cell-promotion-ledger.json`, ledger);
  writeJson(`${OUTPUT_DIR}/promoted-partial-field-matrix.json`, matrix);
  writeJson(`${OUTPUT_DIR}/remaining-open-field-census.json`, census);
  writeJson(`${OUTPUT_DIR}/promotion-summary.json`, summary);
  writeJson(`${OUTPUT_DIR}/index.json`, index);

  const schema = buildClosedSchema({...objects,manifest:provisionalManifest()});
  writeJson(SCHEMA_PATH, schema);
  const hashedFiles = manifestRows();
  assert(hashedFiles.length === 13, 'manifest hashed-file denominator differs');
  const combinedSha256 = sha256Bytes(Buffer.from(hashedFiles.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\0${item.git_blob}\n`).join('')));
  const manifest = {
    schema_version:'ssc-rd04-wave03-postpromotion-nd-followup-one-cell-promotion-manifest@1',
    permanent_path_count:14,hashed_file_count:13,permanent_paths:[...PERMANENT_PATHS],hashed_files:hashedFiles,combined_sha256:combinedSha256,
    authority_boundary:{matrix_updates:1,field_terminalizations:1,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
  writeJson(MANIFEST_PATH, manifest);
  return {custody,decisionObject,ledger,matrix,census,summary,index,manifest,schema};
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const product = buildProduct();
  console.log(`rd04_nd_followup_one_cell_promotion=built candidates=${product.decisionObject.decisions.length} terminal_cells=${product.matrix.counts.terminal_cells} open_substantive=${product.matrix.counts.still_open_substantive_cells}`);
}
