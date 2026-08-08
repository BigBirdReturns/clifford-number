import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = process.cwd();
export const OUTPUT_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion';
export const CANONICAL_PARENT = 'd35deab5ef1e255e5957f29e11fe53fcf74e1cfd';
export const CANONICAL_PARENT_TREE = 'cb129c2c7297ef5aa2dc0076030f8d2eb5440860';
export const INPUTS = Object.freeze({
  matrix: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-five-state-promotion/promoted-partial-field-matrix.json',bytes:456588,sha256:'46885a3fedfabb0fb6154500982d8234dc4fa67834f8d000f5749ec15914705c',gitBlob:'42361e559db90777e1d60aea5530df5694c86dc6'}),
  protocol: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/promotion-candidate-protocol.json',bytes:7509,sha256:'262e6069926b941d0ca82ca573b055a1331bce1e848b4eed50777931aca65030',gitBlob:'518cd7b836290baa9ef825410d973116d6b825cb'}),
  fieldAdjudications: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/field-adjudications.json',bytes:19476,sha256:'09cc77b74c3ed0c63f4c99f57df84bd9a8069f7f0ab72d10c0cdd202e5ff93fc',gitBlob:'522ec8503299c0458d45f43f23512c8ff90ac0f2'}),
  captureCustody: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/capture-custody.json',bytes:7001,sha256:'bf8bd475a06a4d814d457a5c3545f78c3ca604ddd9159c9c10cafdfdd52e189d',gitBlob:'c44f1dc9bafa1736ae67aeb3f596cd5df73c9739'}),
  sourceAdjudications: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/source-adjudications.json',bytes:21649,sha256:'cbd69bb511268b9b6882b4eb359d92f61ac03ace468f8b4ee3de4693f3202eaf',gitBlob:'3b8e43073f9828d80d39a9dd2baadea471d7a301'}),
  pdfReviewReceipts: Object.freeze({path:'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/pdf-review-receipts.json',bytes:10644,sha256:'060f27fd02b31fa492cd2aa2b9e35595b29e04c8e608e36581927c39c7b6683e',gitBlob:'5f63ae64257bac655e219211930af60f2713f8a4'}),
  productValidator: Object.freeze({path:'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs',bytes:14318,sha256:'5af4962c8e73777cca8efd83d66368facbbae8da7c51ddaa1bb7f6c740b5663d',gitBlob:'194f52ac592bf8d629abea3e0e838b007bea31f9'}),
  productAdversarialTest: Object.freeze({path:'test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js',bytes:7820,sha256:'fc0100c764c916df98708a10cf91fd96f74463b698a5c1eb21113daaf528bc72',gitBlob:'155334d2b5d28cea1f962bb16e08f05aabf1a0be'}),
});
export const VALIDATION = Object.freeze({
  pullRequest: 1552,
  workflowRun: 31271574125,
  head: 'ab045a446edf1078e87460e24af83fb5b8f4cd27',
  artifactId: 9025762366,
  artifactZipSha256: '83796ff8344ee3c638a27aea41f129f76004160fedb6d64954855f3a737cc819',
  receiptSha256: '42186deaef7bc5e687ce6cf9fa0e1c93f17ad8064d88e1680471824dcda6ff2a',
  candidateCount: 4,
  admissibleCandidateCount: 4,
  scopeHeldCandidateCount: 0,
  heldCellCount: 2,
  sourceTargetChecks: 6,
  locatorTargetChecks: 8,
});
export const ROUTE_TARGET_FIELDS = Object.freeze({
  'RD04-W03-PPN-MT-001': Object.freeze(['operative_state_implementation_authority_and_version','implementation_effective_date_or_typed_gap']),
  'RD04-W03-PPN-MT-002': Object.freeze(['operative_state_implementation_authority_and_version','implementation_effective_date_or_typed_gap']),
  'RD04-W03-PPN-MT-003': Object.freeze(['abawd_or_work_requirement_waiver_state_and_governing_period','implementation_effective_date_or_typed_gap']),
  'RD04-W03-PPN-ND-001': Object.freeze(['operative_state_implementation_authority_and_version','implementation_effective_date_or_typed_gap']),
  'RD04-W03-PPN-ND-002': Object.freeze(['abawd_or_work_requirement_waiver_state_and_governing_period','implementation_effective_date_or_typed_gap']),
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
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.yml',
  ...OUTPUT_NAMES.map((name) => `${OUTPUT_DIR}/${name}`),
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-four-cell-promotion.md',
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.schema.json',
  'test/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.test.js',
  'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs',
  'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion.mjs',
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
function writeJson(name, value) {
  const target = path.join(ROOT, OUTPUT_DIR, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(target, text);
  return { path: name, bytes: Buffer.byteLength(text), sha256: sha256Bytes(Buffer.from(text)), git_blob: gitBlob(Buffer.from(text)) };
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
function sourceCustody(source) {
  return {
    route_id: source.route_id,
    source_decision_id: source.source_decision_id,
    source_class: source.source_class,
    document_title: source.document_title,
    requested_url: source.requested_url,
    final_url: source.final_url,
    final_host: new URL(source.final_url).host,
    content_type: source.content_type,
    body_bytes: source.body_bytes,
    body_sha256: source.body_sha256,
    response_receipt_sha256: source.response_receipt_sha256,
    pdf_review_receipt_id: source.pdf_review_receipt_id ?? null,
    substantive_weight_count: source.substantive_weight_count,
  };
}
function buildFinding(candidate, decision, sources) {
  return {
    candidate_id: candidate.candidate_id,
    candidate_decision_id: decision.decision_id,
    finding_code: candidate.bounded_finding.finding_code,
    finding_scope: candidate.bounded_finding.finding_scope,
    finding_summary: candidate.bounded_finding.finding_summary,
    bounded_finding: candidate.bounded_finding,
    source_routes: sources.map(sourceCustody),
    evidence_locators: candidate.evidence_locators,
    limitations: decision.limitations,
    promotion_validation: {
      pull_request: VALIDATION.pullRequest,
      workflow_run: VALIDATION.workflowRun,
      artifact_id: VALIDATION.artifactId,
      receipt_sha256: VALIDATION.receiptSha256,
      exact_current_cell: 'pass',
      candidate_and_source_identity: 'pass',
      route_target_subset: 'pass',
    },
  };
}
function cellValue(finding, decision) {
  return {
    terminal_classification: 'observed',
    finding_scope: 'bounded_official_state_field_observation',
    findings: [finding],
    prohibited_inferences: [...new Set([...PROHIBITED, ...decision.prohibited_inferences])],
  };
}
function recalcMatrix(matrix) {
  const cells = matrix.rows.flatMap((row) => row.cells);
  const substantive = cells.filter((cell) => cell.field_ordinal >= 2 && cell.field_ordinal <= 7);
  const rowState = cells.filter((cell) => cell.field_id === 'field_and_row_terminal_state');
  const terminalUnits = matrix.rows.filter((row) => findCell(row, 'field_and_row_terminal_state').terminal).map((row) => row.unit_id);
  Object.assign(matrix.counts, {
    units: matrix.rows.length,
    required_fields_per_unit: matrix.field_order.length,
    materialized_cells: cells.length,
    evidence_complete_cells: cells.filter((cell) => cell.state === 'evidence_complete').length,
    observed_cells: cells.filter((cell) => cell.state === 'observed').length,
    not_publicly_recovered_cells: cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    still_open_cells: cells.filter((cell) => !cell.terminal).length,
    terminal_cells: cells.filter((cell) => cell.terminal).length,
    terminal_substantive_cells: substantive.filter((cell) => cell.terminal).length,
    still_open_substantive_cells: substantive.filter((cell) => !cell.terminal).length,
    row_terminal_state_cells_terminal: rowState.filter((cell) => cell.terminal).length,
    row_terminal_state_cells_open: rowState.filter((cell) => !cell.terminal).length,
    terminal_units: terminalUnits.length,
    class_closed: false,
    postpromotion_candidate_cells: 4,
    newly_terminalized_postpromotion_cells: 4,
  });
  Object.assign(matrix.current_result, {
    terminal_cells: `${matrix.counts.terminal_cells}/450`,
    still_open_cells: `${matrix.counts.still_open_cells}/450`,
    terminal_substantive_cells: matrix.counts.terminal_substantive_cells,
    still_open_substantive_cells: matrix.counts.still_open_substantive_cells,
    row_terminal_state_cells_terminal: matrix.counts.row_terminal_state_cells_terminal,
    row_terminal_state_cells_open: matrix.counts.row_terminal_state_cells_open,
    terminal_units: terminalUnits.length,
    terminal_unit_ids: terminalUnits,
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
  });
}
function buildCensus(matrix) {
  const substantiveIds = matrix.field_order.filter((_, index) => index >= 1 && index <= 6);
  const fieldCensus = [...substantiveIds, 'field_and_row_terminal_state'].map((fieldId) => {
    const cells = matrix.rows.map((row) => findCell(row, fieldId));
    return {
      field_ordinal: cells[0].field_ordinal,
      field_id: fieldId,
      still_open_cells: cells.filter((cell) => !cell.terminal).length,
      evidence_complete_cells: cells.filter((cell) => cell.state === 'evidence_complete').length,
      observed_cells: cells.filter((cell) => cell.state === 'observed').length,
      not_publicly_recovered_cells: cells.filter((cell) => cell.state === 'not_publicly_recovered').length,
    };
  });
  return {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-remaining-open-field-census@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    matrix_path: 'promoted-partial-field-matrix.json',
    counts: {
      states: matrix.rows.length,
      materialized_cells: matrix.counts.materialized_cells,
      terminal_cells: matrix.counts.terminal_cells,
      still_open_cells: matrix.counts.still_open_cells,
      substantive_fields_total: 300,
      substantive_fields_terminal: matrix.counts.terminal_substantive_cells,
      substantive_fields_still_open: matrix.counts.still_open_substantive_cells,
      row_terminal_state_cells_still_open: matrix.counts.row_terminal_state_cells_open,
      terminal_units: matrix.counts.terminal_units,
      class_closed: false,
    },
    field_census: fieldCensus,
    state_rows: matrix.rows.map((row) => ({
      unit_ordinal: row.unit_ordinal,
      unit_id: row.unit_id,
      postal_code: row.postal_code,
      state_name: row.state_name,
      terminal_fields: row.terminal_fields,
      open_fields: row.open_fields,
      still_open_field_ids: row.cells.filter((cell) => !cell.terminal).map((cell) => cell.field_id),
      row_state: row.row_state,
    })),
    authority_boundary: {
      row_terminalizations: 0,
      class_closed: false,
      cumulative_ledger_effect: 'none',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };
}
function manifestRows() {
  const rows = [];
  for (const relative of PERMANENT_PATHS) {
    if (relative === MANIFEST_PATH) continue;
    const bytes = fs.readFileSync(path.join(ROOT, relative));
    rows.push({ path: relative, bytes: bytes.length, sha256: sha256Bytes(bytes), git_blob: gitBlob(bytes) });
  }
  return rows;
}

export function buildProduct() {
  const predecessor = readBoundJson(INPUTS.matrix);
  const protocol = readBoundJson(INPUTS.protocol);
  const fieldAdjudications = readBoundJson(INPUTS.fieldAdjudications);
  const captureCustody = readBoundJson(INPUTS.captureCustody);
  const sourceAdjudications = readBoundJson(INPUTS.sourceAdjudications);
  const pdfReviewReceipts = readBoundJson(INPUTS.pdfReviewReceipts);
  readBoundBytes(INPUTS.productValidator);
  readBoundBytes(INPUTS.productAdversarialTest);

  assert(predecessor.counts.materialized_cells === 450, 'predecessor matrix denominator differs');
  assert(predecessor.counts.terminal_cells === 222, 'predecessor terminal denominator differs');
  assert(predecessor.counts.still_open_cells === 228, 'predecessor open denominator differs');
  assert(predecessor.counts.still_open_substantive_cells === 188, 'predecessor substantive denominator differs');
  assert(predecessor.counts.terminal_units === 10, 'predecessor terminal-unit denominator differs');
  assert(predecessor.current_result.class_closed === false, 'predecessor class state differs');
  assert(protocol.candidate_count === 4 && protocol.unique_candidate_cell_count === 4 && protocol.held_cell_count === 2, 'candidate denominator differs');
  assert(fieldAdjudications.summary.evidence_complete_candidates === 4 && fieldAdjudications.summary.held_open_fields === 2, 'field denominator differs');
  assert(captureCustody.transport_ledger.unique_route_count === 5 && captureCustody.transport_ledger.unique_body_identity_count === 5, 'capture denominator differs');
  assert(sourceAdjudications.summary.narrow_source_admissions === 4, 'source-admission denominator differs');
  assert(pdfReviewReceipts.receipts.length === 3 && pdfReviewReceipts.rendering.all_pages_visually_reviewed === true, 'PDF review denominator differs');

  const expectedCandidates = [
    ['MT','operative_state_implementation_authority_and_version','RD04-PPN-CANDIDATE-MT-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION'],
    ['MT','implementation_effective_date_or_typed_gap','RD04-PPN-CANDIDATE-MT-IMPLEMENTATION-EFFECTIVE-DATE-OR-TYPED-GAP'],
    ['MT','abawd_or_work_requirement_waiver_state_and_governing_period','RD04-PPN-CANDIDATE-MT-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD'],
    ['ND','implementation_effective_date_or_typed_gap','RD04-PPN-CANDIDATE-ND-IMPLEMENTATION-EFFECTIVE-DATE-OR-TYPED-GAP'],
  ];
  equal(protocol.candidates.map((candidate) => [candidate.postal_code,candidate.field_id,candidate.candidate_id]), expectedCandidates, 'candidate identities differ');

  const matrix = structuredClone(predecessor);
  matrix.schema_version = 'ssc-rd04-wave03-postpromotion-four-cell-promoted-partial-field-matrix@1';
  const fieldById = new Map(fieldAdjudications.decisions.map((decision) => [decision.decision_id, decision]));
  const sourceByRoute = new Map(sourceAdjudications.decisions.map((decision) => [decision.route_id, decision]));
  const bodyByRoute = new Map(captureCustody.unique_bodies.map((body) => [body.route_id, body]));
  const pdfByRoute = new Map(pdfReviewReceipts.receipts.map((receipt) => [receipt.route_id, receipt]));
  const decisions = [];
  const cells = [];
  let sourceTargetChecks = 0;
  let locatorTargetChecks = 0;

  for (const [index, candidate] of protocol.candidates.entries()) {
    assert(candidate.candidate_ordinal === index + 1, 'candidate ordinal differs');
    assert(candidate.current_cell_requirement === 'must_remain_still_open_on_exact_promotion_parent', 'candidate current-cell contract differs');
    assert(candidate.promotion_effect_authorized_here === 'none' && candidate.row_state_effect === 'none', 'candidate authority boundary differs');
    const row = findRow(matrix, candidate.unit_id);
    const before = structuredClone(findCell(row, candidate.field_id));
    assert(before.state === 'still_open' && before.terminal === false, `target cell is not open: ${candidate.candidate_id}`);
    const fieldDecision = fieldById.get(candidate.decision_id);
    assert(fieldDecision?.promotion_candidate === true && fieldDecision.disposition === 'evidence_complete_bounded_finding', `field candidate mismatch: ${candidate.candidate_id}`);
    equal(fieldDecision.bounded_finding, candidate.bounded_finding, 'bounded finding differs');
    equal(fieldDecision.source_route_ids, candidate.source_route_ids, 'source-route custody differs');
    equal(fieldDecision.evidence_locators, candidate.evidence_locators, 'evidence-locator custody differs');

    const sources = candidate.source_route_ids.map((routeId) => {
      sourceTargetChecks += 1;
      const allowed = ROUTE_TARGET_FIELDS[routeId];
      assert(allowed?.includes(candidate.field_id), `route target excludes candidate field: ${routeId}:${candidate.field_id}`);
      const source = sourceByRoute.get(routeId);
      const body = bodyByRoute.get(routeId);
      assert(source?.source_admitted_for_narrow_scope === true && source.substantive_weight_count === 1, `source not admitted: ${routeId}`);
      assert(source.candidate_fields_for_offline_review.includes(candidate.field_id), `source candidate fields exclude target: ${routeId}`);
      assert(body && body.body_sha256 === source.body_sha256 && body.body_bytes === source.body_bytes && body.final_url === source.final_url, `capture/source identity differs: ${routeId}`);
      if (String(source.content_type).startsWith('application/pdf')) {
        const receipt = pdfByRoute.get(routeId);
        assert(receipt?.all_pages_rendered === true && receipt.all_pages_visually_reviewed === true, `PDF review incomplete: ${routeId}`);
        assert(receipt.body_sha256 === source.body_sha256 && receipt.body_bytes === source.body_bytes, `PDF/source identity differs: ${routeId}`);
      }
      return source;
    });
    for (const locator of candidate.evidence_locators) {
      locatorTargetChecks += 1;
      assert(ROUTE_TARGET_FIELDS[locator.route_id]?.includes(candidate.field_id), `locator target excludes candidate field: ${locator.route_id}:${candidate.field_id}`);
    }

    const finding = buildFinding(candidate, fieldDecision, sources);
    const after = {
      ...before,
      state: 'evidence_complete',
      terminal: true,
      value: cellValue(finding, fieldDecision),
      evidence_source_ids: [...candidate.source_route_ids],
      typed_gap: null,
      authority_effect: 'bounded_official_state_field_observation_only',
    };
    const targetIndex = row.cells.findIndex((cell) => cell.field_id === candidate.field_id);
    row.cells[targetIndex] = after;
    row.terminal_fields += 1;
    row.open_fields -= 1;
    assert(row.open_fields > 0, 'promotion unexpectedly terminalized row');
    const rowState = findCell(row, 'field_and_row_terminal_state');
    assert(rowState.terminal === false, 'row-state cell unexpectedly terminal');
    rowState.typed_gap = `row_remains_open_because_${row.open_fields}_required_cells_are_unresolved`;

    const decision = {
      promotion_decision_ordinal: index + 1,
      promotion_candidate_id: candidate.candidate_id,
      candidate_decision_id: fieldDecision.decision_id,
      unit_id: candidate.unit_id,
      postal_code: candidate.postal_code,
      state_name: candidate.state_name,
      candidate_field: candidate.field_id,
      source_route_ids: [...candidate.source_route_ids],
      source_body_sha256s: sources.map((source) => source.body_sha256),
      response_receipt_sha256s: sources.map((source) => source.response_receipt_sha256),
      evidence_locators: candidate.evidence_locators,
      bounded_finding: candidate.bounded_finding,
      field_cell_state_before: before.state,
      promotion_outcome: 'promote_bounded_finding',
      promotion_reason_code: 'scope_repaired_exact_current_cell_source_pdf_and_route_target_validation_passed',
      promotion_reason_summary: 'The exact current cell remained open after target-scope repair, every candidate and source identity matched, required PDF review remained complete, and every source route and locator stayed inside its frozen field target.',
      field_cell_state_after: 'evidence_complete',
      field_terminalization_effect: 'observed',
      route_target_source_checks: candidate.source_route_ids.length,
      route_target_locator_checks: candidate.evidence_locators.length,
      ...AUTHORITY,
    };
    decisions.push(decision);
    cells.push({
      cell_ordinal: index + 1,
      unit_id: candidate.unit_id,
      postal_code: candidate.postal_code,
      state_name: candidate.state_name,
      field_id: candidate.field_id,
      field_ordinal: before.field_ordinal,
      candidate_count: 1,
      promotion_candidate_ids: [candidate.candidate_id],
      candidate_decision_ids: [fieldDecision.decision_id],
      promotion_outcome: 'promoted_to_evidence_complete',
      promoted_finding_count: 1,
      held_finding_count: 0,
      state_before: before.state,
      state_after: after.state,
      terminal_before: false,
      terminal_after: true,
      before_cell_sha256: canonicalSha(before),
      after_cell_sha256: canonicalSha(after),
      value_after: after.value,
      evidence_route_ids: [...candidate.source_route_ids],
      source_body_sha256s: sources.map((source) => source.body_sha256),
      response_receipt_sha256s: sources.map((source) => source.response_receipt_sha256),
      findings: [{...finding,promotion_outcome:'promote_bounded_finding',promotion_reason_code:decision.promotion_reason_code,promotion_reason_summary:decision.promotion_reason_summary}],
      authority_effect: 'one_bounded_matrix_cell_terminalized',
      ...AUTHORITY,
    });
  }

  assert(sourceTargetChecks === 6, 'candidate-to-source target denominator differs');
  assert(locatorTargetChecks === 8, 'candidate-to-locator target denominator differs');
  recalcMatrix(matrix);
  matrix.postpromotion_four_cell_promotion_product = {
    predecessor_matrix_path: INPUTS.matrix.path,
    predecessor_matrix_sha256: INPUTS.matrix.sha256,
    predecessor_matrix_git_blob: INPUTS.matrix.gitBlob,
    candidate_protocol_path: INPUTS.protocol.path,
    candidate_protocol_sha256: INPUTS.protocol.sha256,
    candidate_protocol_git_blob: INPUTS.protocol.gitBlob,
    validation_pull_request: VALIDATION.pullRequest,
    validation_workflow_run: VALIDATION.workflowRun,
    validation_head: VALIDATION.head,
    validation_artifact_id: VALIDATION.artifactId,
    validation_artifact_zip_sha256: VALIDATION.artifactZipSha256,
    validation_receipt_sha256: VALIDATION.receiptSha256,
    composition_rule: 'terminalize_only_the_four_scope_repaired_independently_validated_open_candidate_cells_exclude_both_held_north_dakota_cells_and_leave_every_row_state_open',
  };
  assert(matrix.counts.terminal_cells === 226, 'derived terminal-cell count differs');
  assert(matrix.counts.still_open_cells === 224, 'derived open-cell count differs');
  assert(matrix.counts.terminal_substantive_cells === 116, 'derived substantive terminal count differs');
  assert(matrix.counts.still_open_substantive_cells === 184, 'derived substantive open count differs');
  assert(matrix.counts.terminal_units === 10, 'derived terminal-unit count differs');
  const mt = findRow(matrix, 'US-STATE-MT');
  const nd = findRow(matrix, 'US-STATE-ND');
  assert(mt.open_fields === 1 && nd.open_fields === 3, 'affected row open-field counts differ');
  assert(findCell(mt, 'field_and_row_terminal_state').terminal === false && findCell(nd, 'field_and_row_terminal_state').terminal === false, 'affected row-state cells changed');

  const custody = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-promotion-input-custody@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    canonical_parent: CANONICAL_PARENT,
    canonical_parent_tree: CANONICAL_PARENT_TREE,
    main_reconciliation: {
      comparison_base: CANONICAL_PARENT,
      observed_main: CANONICAL_PARENT,
      commits_ahead: 0,
      changed_paths: 0,
      overlapping_permanent_paths: 0,
      overlap_status: 'exact_current_main',
    },
    inputs: Object.fromEntries(Object.entries(INPUTS).map(([key, spec]) => [key, {path:spec.path,bytes:spec.bytes,sha256:spec.sha256,git_blob_sha:spec.gitBlob}])),
    validation_receipt: {
      pull_request: VALIDATION.pullRequest,
      workflow_run: VALIDATION.workflowRun,
      head: VALIDATION.head,
      artifact_id: VALIDATION.artifactId,
      artifact_zip_sha256: VALIDATION.artifactZipSha256,
      receipt_sha256: VALIDATION.receiptSha256,
      candidate_count: VALIDATION.candidateCount,
      admissible_candidate_count: VALIDATION.admissibleCandidateCount,
      scope_held_candidate_count: VALIDATION.scopeHeldCandidateCount,
      held_cell_count: VALIDATION.heldCellCount,
      route_target_source_checks: VALIDATION.sourceTargetChecks,
      route_target_locator_checks: VALIDATION.locatorTargetChecks,
      promotion_authority_created: false,
    },
    empirical_requests: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
  const decisionObject = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-promotion-decisions@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    decision_outcomes: ['promote_bounded_finding'],
    candidate_count: 4,
    admissible_candidate_count: 4,
    scope_held_candidate_count: 0,
    excluded_held_decisions: fieldAdjudications.decisions.filter((decision) => !decision.promotion_candidate).map((decision) => ({decision_id:decision.decision_id,disposition:decision.disposition,selected_followup_route_ids:decision.selected_followup_route_ids})),
    decisions,
    authority_boundary: {
      matrix_updates: 4,
      field_terminalizations: 4,
      row_state_mutations: 0,
      class_closed: false,
      cumulative_ledger_effect: 'none',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };
  const fieldPromotionCounts = {
    operative_state_implementation_authority_and_version: 1,
    implementation_effective_date_or_typed_gap: 2,
    abawd_or_work_requirement_waiver_state_and_governing_period: 1,
    discretionary_exemption_authority_and_reported_state_practice: 0,
    fitness_for_work_or_eligibility_screening_rule: 0,
    verification_evidence_and_staff_discretion_surface: 0,
  };
  const ledger = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-cell-promotion-ledger@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    predecessor_matrix_path: INPUTS.matrix.path,
    promotion_decisions_path: 'promotion-decisions.json',
    counts: {
      candidate_findings: 4,
      unique_candidate_cells: 4,
      promoted_candidate_findings: 4,
      scope_held_candidate_findings: 0,
      excluded_held_decisions: 2,
      promoted_cells: 4,
      affected_states: 2,
      terminal_cells_before: 222,
      terminal_cells_after: 226,
      still_open_cells_before: 228,
      still_open_cells_after: 224,
      open_substantive_cells_before: 188,
      open_substantive_cells_after: 184,
      terminal_units_after: 10,
      route_target_source_checks: sourceTargetChecks,
      route_target_locator_checks: locatorTargetChecks,
    },
    field_promotion_counts: fieldPromotionCounts,
    cells,
    authority_boundary: {
      row_terminalizations: 0,
      class_closed: false,
      cumulative_ledger_effect: 'none',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };
  const census = buildCensus(matrix);
  const nextOperation = 'execute or otherwise adjudicate the already-selected two-route North Dakota follow-up protocol only in a separate request-bounded transaction; no follow-up result may create automatic source, field, row, class, publication, adoption, or graph authority';
  const summary = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-promotion-summary@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-04',
    class_id: 'RD-04-C02',
    issue: 1017,
    input_counts: {bounded_finding_candidates:4,unique_candidate_cells:4,states_with_candidates:2,held_decisions_excluded:2},
    promotion_counts: {candidate_findings_promoted:4,candidate_findings_scope_held:0,unique_cells_terminalized:4,states_with_terminalizations:2},
    field_promotion_counts: fieldPromotionCounts,
    route_target_checks: {candidate_to_source_routes:sourceTargetChecks,candidate_to_evidence_locators:locatorTargetChecks},
    matrix_transition: {terminal_cells_before:222,terminal_cells_after:226,still_open_cells_before:228,still_open_cells_after:224,substantive_fields_still_open_before:188,substantive_fields_still_open_after:184,terminal_units_before:10,terminal_units_after:10,class_closed_before:false,class_closed_after:false},
    affected_states: ['MT','ND'],
    current_result: {promotion_adjudication_complete:true,independently_supported_cells_promoted:4,scope_held_candidates:0,held_north_dakota_cells_remaining:2,field_matrix_terminal:false,class_state:'still_open',class_closed:false,outside_human_dependency:false,external_contacts:0,external_reviews:0,reviewed_disposition_changes:0,publication_effect:'none',adoption_effect:'none',graph_effect:'none',prevalence_effect:'none',discrimination_effect:'none',coordination_effect:'none',common_purpose_effect:'none',racial_order_effect:'none',complete_compact_effect:'none'},
    next_bounded_operation: nextOperation,
  };
  const index = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-promotion-index@1',
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
    counts: {candidate_findings:4,candidate_findings_promoted:4,candidate_findings_scope_held:0,excluded_held_decisions:2,unique_candidate_cells:4,unique_cells_terminalized:4,terminal_cells_before:222,terminal_cells_after:226,still_open_cells_after:224,still_open_substantive_fields_after:184,terminal_units:10,result_spawned_requests:0},
    current_result: {independent_promotion_validation_complete:true,field_matrix_terminal:false,class_state:'still_open',class_closed:false,outside_human_dependency:false,reviewed_disposition_changes:0,publication_effect:'none',adoption_effect:'none',graph_effect:'none',prevalence_effect:'none',discrimination_effect:'none',coordination_effect:'none',common_purpose_effect:'none',racial_order_effect:'none',complete_compact_effect:'none'},
    next_bounded_operation: nextOperation,
  };

  writeJson('promotion-input-custody.json', custody);
  writeJson('promotion-decisions.json', decisionObject);
  writeJson('cell-promotion-ledger.json', ledger);
  writeJson('promoted-partial-field-matrix.json', matrix);
  writeJson('remaining-open-field-census.json', census);
  writeJson('promotion-summary.json', summary);
  writeJson('index.json', index);

  const hashedFiles = manifestRows();
  assert(hashedFiles.length === 13, 'manifest hashed-file denominator differs');
  const combinedSha256 = sha256Bytes(Buffer.from(hashedFiles.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\0${row.git_blob}\n`).join('')));
  const manifest = {
    schema_version: 'ssc-rd04-wave03-postpromotion-four-cell-promotion-manifest@1',
    permanent_path_count: 14,
    hashed_file_count: 13,
    permanent_paths: [...PERMANENT_PATHS],
    hashed_files: hashedFiles,
    combined_sha256: combinedSha256,
    authority_boundary: {matrix_updates:4,field_terminalizations:4,row_state_mutations:0,class_closed:false,cumulative_ledger_effect:'none',outside_human_dependency:false,publication_effect:'none',adoption_effect:'none',graph_effect:'none'},
  };
  writeJson('product-manifest.json', manifest);
  return {custody,decisionObject,ledger,matrix,census,summary,index,manifest};
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const product = buildProduct();
  console.log(`rd04_postpromotion_four_cell_promotion=built candidates=${product.decisionObject.decisions.length} terminal_cells=${product.matrix.counts.terminal_cells} open_substantive=${product.matrix.counts.still_open_substantive_cells}`);
}
