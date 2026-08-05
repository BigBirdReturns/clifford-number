#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication';
export const DATA_DIR = path.join(ROOT, DATA_REL);
export const SOURCE_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-responsive-link-source-adjudication';
export const SOURCE_DIR = path.join(ROOT, SOURCE_REL);
export const MATRIX_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication';
export const MATRIX_DIR = path.join(ROOT, MATRIX_REL);

export const DISPOSITIONS = Object.freeze([
  'evidence_complete_bounded_finding',
  'partial_support_hold_open',
  'temporal_or_scope_ambiguity_hold_open',
  'no_relevant_support_hold_open',
]);
export const SUBSTANTIVE_FIELDS = Object.freeze([
  'operative_state_implementation_authority_and_version',
  'implementation_effective_date_or_typed_gap',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'discretionary_exemption_authority_and_reported_state_practice',
  'fitness_for_work_or_eligibility_screening_rule',
  'verification_evidence_and_staff_discretion_surface',
]);
export const EXPECTED_INPUT_SHA256 = Object.freeze({
  authored: '9a8082544c43851f0f8760b13cf2fc145f0bb63b48223cb6c994c2c2cb39e0e9',
  protocol: '4442656c9680df1af7aae7d2e6a92ee5cce2af523724c84a27b764e502e2bb11',
  sourceIndex: '01f55d50156bd627b6d833643f93413de59c1d80e916d58090d6390e32077df3',
  sourceDecisions: '879c2191ca0128dd09e02ef66c01c5ee7058545a28ad25683eafb23f72451857',
  captureRoutes: '7bc1db2b09372d2902a8a506a85a0d6022bb7a3cac86d3393c9d371b6da24161',
  partialMatrix: '93cd6840edfe329d4d49b715e5a981c8d390a2bb711cffbbd141e7f426ccbb41',
  matrixIndex: '28653369a3de5bf3067236a4c0b4fa4413a89eae383a8655c6310248011cc8cd',
});
const EXPECTED_COUNTS = Object.freeze({
  evidence_complete_bounded_finding: 38,
  partial_support_hold_open: 18,
  temporal_or_scope_ambiguity_hold_open: 19,
  no_relevant_support_hold_open: 52,
});
const EFFECT_KEYS = Object.freeze([
  'publication_effect', 'adoption_effect', 'graph_effect', 'national_prevalence_effect',
  'discrimination_effect', 'coordination_effect', 'common_purpose_effect', 'complete_compact_effect',
]);

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
export function stableJsonl(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function readBound(pathname, expected, label) {
  const bytes = fs.readFileSync(pathname);
  assert(sha256(bytes) === expected, `${label}: exact SHA-256 mismatch`);
  return JSON.parse(bytes.toString('utf8'));
}
function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
function nestedCount(rows, first, second) {
  const out = {};
  for (const row of rows) {
    out[row[first]] ??= {};
    out[row[first]][row[second]] = (out[row[first]][row[second]] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([name, counts]) => [name, Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))]));
}

export function loadInputs() {
  return {
    authored: readBound(path.join(DATA_DIR, 'authored-field-decisions.json'), EXPECTED_INPUT_SHA256.authored, 'authored decisions'),
    protocol: readBound(path.join(SOURCE_DIR, 'offline-field-review-protocol.json'), EXPECTED_INPUT_SHA256.protocol, 'offline review protocol'),
    sourceIndex: readBound(path.join(SOURCE_DIR, 'index.json'), EXPECTED_INPUT_SHA256.sourceIndex, 'source-adjudication index'),
    sourceDecisions: readBound(path.join(SOURCE_DIR, 'source-decisions.json'), EXPECTED_INPUT_SHA256.sourceDecisions, 'source decisions'),
    captureRoutes: readBound(path.join(SOURCE_DIR, 'capture-route-results.json'), EXPECTED_INPUT_SHA256.captureRoutes, 'capture route results'),
    partialMatrix: readBound(path.join(MATRIX_DIR, 'partial-field-matrix.json'), EXPECTED_INPUT_SHA256.partialMatrix, 'partial field matrix'),
    matrixIndex: readBound(path.join(MATRIX_DIR, 'source-adjudication-index.json'), EXPECTED_INPUT_SHA256.matrixIndex, 'matrix index'),
  };
}

function matrixCellMap(partialMatrix) {
  const out = new Map();
  for (const row of partialMatrix.rows ?? []) {
    for (const cell of row.cells ?? []) out.set(`${row.unit_id}\t${cell.field_id}`, { row, cell });
  }
  return out;
}

export function validateInputs(inputs) {
  const { authored, protocol, sourceIndex, sourceDecisions, captureRoutes, partialMatrix, matrixIndex } = inputs;
  assert(authored.schema_version === 'ssc-rd04-wave03-responsive-link-authored-field-decisions@1', 'authored schema');
  assert(authored.wave_id === 'SSC-RD-W03' && authored.lane_id === 'RD-04' && authored.class_id === 'RD-04-C02' && authored.issue === 1017, 'authored identity');
  assert(authored.predecessor_source_adjudication_merge === '890bfd5d2a100c3fc934f7c68bfe348a3625d7da', 'predecessor merge identity');
  assert(protocol.schema_version === 'ssc-rd04-wave03-responsive-link-offline-field-review-protocol@1', 'protocol schema');
  assert(sourceIndex.schema_version === 'ssc-rd04-wave03-responsive-link-source-adjudication-index@1', 'source index schema');
  assert(sourceDecisions.schema_version === 'ssc-rd04-wave03-responsive-link-source-decisions@1', 'source decisions schema');
  assert(captureRoutes.schema_version === 'ssc-rd04-wave03-responsive-link-route-results@2', 'capture route schema');
  assert(partialMatrix.schema_version === 'ssc-rd04-wave03-official-source-partial-field-matrix@1', 'partial matrix schema');
  assert(matrixIndex.schema_version === 'ssc-rd04-wave03-official-source-adjudication-index@1', 'matrix index schema');

  assert(Array.isArray(authored.review_sources) && authored.review_sources.length === 36, '36 review sources required');
  assert(Array.isArray(authored.decisions) && authored.decisions.length === 127, '127 candidate source-field decisions required');
  assert(protocol.fixed_source_rows === 36 && protocol.review_rows?.length === 36, 'protocol review denominator');
  assert(sourceIndex.counts?.offline_field_review_sources === 36, 'source-index review denominator');
  assert(sourceIndex.counts?.substantive_field_classifications === 0 && sourceIndex.counts?.substantive_field_terminalizations === 0, 'predecessor field effects');
  assert(partialMatrix.counts?.units === 50 && partialMatrix.counts?.materialized_cells === 450, 'matrix denominator');
  assert(partialMatrix.counts?.terminal_cells === 100 && partialMatrix.counts?.still_open_cells === 350 && partialMatrix.counts?.terminal_units === 0 && partialMatrix.counts?.class_closed === false, 'matrix state');
  assert(matrixIndex.derived_products?.partial_field_matrix_sha256 === EXPECTED_INPUT_SHA256.partialMatrix, 'matrix-index binding');

  const routeById = new Map(captureRoutes.routes.map((row) => [row.route_id, row]));
  const sourceDecisionById = new Map(sourceDecisions.decisions.map((row) => [row.route_id, row]));
  assert(routeById.size === 62 && sourceDecisionById.size === 62, 'source route denominators');
  const protocolIds = protocol.review_rows.map((row) => row.route_id);
  assert(new Set(protocolIds).size === 36, 'protocol review IDs unique');
  assert(JSON.stringify(authored.review_sources.map((row) => row.route_id)) === JSON.stringify(protocolIds), 'review-source order must equal protocol order');

  const reviewByRoute = new Map();
  for (let i = 0; i < authored.review_sources.length; i += 1) {
    const row = authored.review_sources[i];
    const protocolRow = protocol.review_rows[i];
    const route = routeById.get(row.route_id);
    const source = sourceDecisionById.get(row.route_id);
    assert(row.review_ordinal === i + 1 && row.review_ordinal === protocolRow.review_ordinal, `${row.route_id}: review ordinal`);
    for (const key of ['route_id','unit_id','postal_code','state_name','source_class','selection_category','document_identity','document_title','body_path_in_capture_artifact','body_bytes','body_sha256']) {
      assert(row[key] === protocolRow[key], `${row.route_id}: review/protocol ${key}`);
    }
    assert(route && source, `${row.route_id}: missing predecessor route/decision`);
    assert(route.final_url === row.final_url && route.body_sha256 === row.body_sha256 && route.body_bytes === row.body_bytes, `${row.route_id}: capture binding`);
    assert(source.source_admitted === true && source.field_review_selected === true, `${row.route_id}: predecessor source admission`);
    assert(JSON.stringify(row.candidate_fields) === JSON.stringify(protocolRow.candidate_fields), `${row.route_id}: candidate fields`);
    assert(row.complete_extracted_text_review === true && row.raw_review_body_retained_in_product === false, `${row.route_id}: offline review boundary`);
    assert(/^[a-f0-9]{64}$/.test(row.review_text_sha256) && row.review_text_bytes > 0 && row.review_text_lines > 0, `${row.route_id}: review text custody`);
    assert(row.empirical_requests === 0 && row.result_spawned_requests === 0 && row.outside_human_dependency === false, `${row.route_id}: request/human boundary`);
    assert(row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none', `${row.route_id}: authority effect`);
    reviewByRoute.set(row.route_id, row);
  }
  assert(new Set(authored.review_sources.map((row) => row.postal_code)).size === 24, '24 states represented');

  const expectedPairs = [];
  for (const row of protocol.review_rows) for (let j = 0; j < row.candidate_fields.length; j += 1) expectedPairs.push([row.route_id, row.candidate_fields[j], j + 1]);
  const decisionIds = new Set();
  for (let i = 0; i < authored.decisions.length; i += 1) {
    const decision = authored.decisions[i];
    const [routeId, fieldId, fieldOrdinal] = expectedPairs[i];
    const review = reviewByRoute.get(routeId);
    assert(decision.decision_ordinal === i + 1 && decision.decision_id === `RD04-W03-FIELD-${String(i + 1).padStart(3, '0')}`, `${decision.decision_id}: decision identity`);
    assert(!decisionIds.has(decision.decision_id), `${decision.decision_id}: duplicate decision ID`);
    decisionIds.add(decision.decision_id);
    assert(decision.route_id === routeId && decision.field_id === fieldId && decision.field_ordinal_within_source === fieldOrdinal, `${decision.decision_id}: protocol pair order`);
    for (const key of ['review_ordinal','unit_id','postal_code','state_name','source_class','document_identity','document_title','final_url']) assert(decision[key] === review[key], `${decision.decision_id}: review ${key}`);
    assert(SUBSTANTIVE_FIELDS.includes(decision.field_id), `${decision.decision_id}: invalid field`);
    assert(DISPOSITIONS.includes(decision.disposition), `${decision.decision_id}: invalid disposition`);
    assert(typeof decision.evidence_basis === 'string' && decision.evidence_basis.length >= 24, `${decision.decision_id}: evidence basis`);
    assert(typeof decision.counterevidence_or_limitation === 'string' && decision.counterevidence_or_limitation.length >= 24, `${decision.decision_id}: limitation`);
    assert(decision.complete_source_reviewed === true && decision.source_scope_only === true, `${decision.decision_id}: review scope`);
    const loc = decision.source_locator;
    assert(loc?.capture_artifact_id === protocol.capture_artifact_id && loc?.capture_artifact_zip_sha256 === protocol.capture_artifact_zip_sha256, `${decision.decision_id}: capture artifact custody`);
    assert(loc?.body_path_in_capture_artifact === review.body_path_in_capture_artifact && loc?.body_sha256 === review.body_sha256 && loc?.final_url === review.final_url, `${decision.decision_id}: source locator binding`);
    assert(loc?.review_text_sha256 === review.review_text_sha256 && loc?.review_text_bytes === review.review_text_bytes && loc?.review_text_lines === review.review_text_lines, `${decision.decision_id}: review text binding`);
    assert(Number.isInteger(loc.line_start) && Number.isInteger(loc.line_end) && loc.line_start >= 1 && loc.line_end >= loc.line_start && loc.line_end <= review.review_text_lines, `${decision.decision_id}: line span`);
    if (decision.disposition === 'no_relevant_support_hold_open') {
      assert(decision.bounded_finding === null && decision.supporting_text_fragment === null, `${decision.decision_id}: no-support finding/fragment`);
      assert(loc.locator_kind === 'complete_extracted_text_review' && loc.line_start === 1 && loc.line_end === review.review_text_lines, `${decision.decision_id}: no-support review span`);
    } else {
      assert(typeof decision.bounded_finding === 'string' && decision.bounded_finding.length >= 20, `${decision.decision_id}: bounded finding`);
      assert(typeof decision.supporting_text_fragment === 'string' && decision.supporting_text_fragment.length > 0, `${decision.decision_id}: supporting fragment`);
      assert(loc.locator_kind === 'bounded_text_span', `${decision.decision_id}: bounded locator`);
    }
    assert(decision.promotion_candidate === (decision.disposition === 'evidence_complete_bounded_finding'), `${decision.decision_id}: promotion candidate rule`);
    assert(decision.promotion_authority === false && decision.matrix_effect === 'none' && decision.field_terminalization_effect === 'none' && decision.class_closure_effect === 'none', `${decision.decision_id}: matrix/closure authority`);
    assert(decision.result_spawned_requests === 0 && decision.outside_human_dependency === false && decision.reviewed_disposition_change === false, `${decision.decision_id}: request/human/disposition boundary`);
    for (const key of EFFECT_KEYS) assert(decision[key] === 'none', `${decision.decision_id}: ${key}`);
  }

  const dispositionCounts = countBy(authored.decisions, 'disposition');
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) assert(dispositionCounts[key] === expected, `${key}: ${dispositionCounts[key]} != ${expected}`);
  assert(Object.keys(dispositionCounts).length === 4, 'unexpected disposition');
  assert(authored.counts?.review_sources === 36 && authored.counts?.states_represented === 24 && authored.counts?.candidate_source_field_pairs === 127, 'authored counts denominator');
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) assert(authored.counts?.[key] === expected, `authored count ${key}`);
  assert(authored.counts?.matrix_updates === 0 && authored.counts?.field_terminalizations === 0 && authored.counts?.result_spawned_requests === 0, 'authored effect counts');
  assert(authored.authority?.matrix_update_authority === false && authored.authority?.field_terminalization_authority === false && authored.authority?.class_closure_authority === false, 'authored authority');
  assert(authored.authority?.outside_human_dependency === false && authored.authority?.reviewed_disposition_changes === 0, 'authored human/disposition boundary');
  for (const key of EFFECT_KEYS) assert(authored.authority?.[key] === 'none', `authored authority ${key}`);

  const cells = matrixCellMap(partialMatrix);
  assert(cells.size === 450, '450 unique matrix cells required');
  for (const decision of authored.decisions.filter((row) => row.promotion_candidate)) {
    const target = cells.get(`${decision.unit_id}\t${decision.field_id}`);
    assert(target, `${decision.decision_id}: target matrix cell missing`);
    assert(target.cell.state === 'still_open' && target.cell.terminal === false && target.cell.value === null, `${decision.decision_id}: promotion target must remain open`);
  }
  return { dispositionCounts, cells };
}

export function deriveProduct(inputs) {
  const { dispositionCounts, cells } = validateInputs(inputs);
  const { authored, partialMatrix } = inputs;
  const fieldDispositionCounts = nestedCount(authored.decisions, 'field_id', 'disposition');
  const stateDispositionCounts = nestedCount(authored.decisions, 'postal_code', 'disposition');
  const promotionRows = authored.decisions.filter((row) => row.promotion_candidate).map((decision, index) => {
    const target = cells.get(`${decision.unit_id}\t${decision.field_id}`);
    return {
      promotion_ordinal: index + 1,
      promotion_candidate_id: `RD04-W03-PROMOTION-${String(index + 1).padStart(3, '0')}`,
      source_decision_id: decision.decision_id,
      route_id: decision.route_id,
      unit_id: decision.unit_id,
      postal_code: decision.postal_code,
      state_name: decision.state_name,
      field_id: decision.field_id,
      current_matrix_cell: {
        state: target.cell.state,
        terminal: target.cell.terminal,
        value: target.cell.value,
        typed_gap: target.cell.typed_gap,
        authority_effect: target.cell.authority_effect,
      },
      candidate_bounded_finding: decision.bounded_finding,
      evidence_basis: decision.evidence_basis,
      counterevidence_or_limitation: decision.counterevidence_or_limitation,
      source_locator: decision.source_locator,
      promotion_authority: false,
      matrix_effect: 'none',
      terminalization_effect: 'none',
      class_closure_effect: 'none',
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      national_prevalence_effect: 'none',
      discrimination_effect: 'none',
      coordination_effect: 'none',
      common_purpose_effect: 'none',
      complete_compact_effect: 'none',
    };
  });
  const promotionProtocol = {
    schema_version: 'ssc-rd04-wave03-responsive-link-promotion-candidate-protocol@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    predecessor_partial_matrix_path: `${MATRIX_REL}/partial-field-matrix.json`,
    predecessor_partial_matrix_sha256: EXPECTED_INPUT_SHA256.partialMatrix,
    candidate_rows: promotionRows.length,
    matrix_updates_authorized: 0,
    field_terminalizations_authorized: 0,
    rule: 'Each row is a bounded candidate for a separate successor validation. This protocol changes no matrix cell, terminal state, class state, publication state, or graph.',
    rows: promotionRows,
    current_result: {
      promotion_candidates_frozen: true,
      matrix_changed: false,
      terminal_cells_before: partialMatrix.counts.terminal_cells,
      terminal_cells_after: partialMatrix.counts.terminal_cells,
      still_open_cells_after: partialMatrix.counts.still_open_cells,
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
    },
  };
  const index = {
    schema_version: 'ssc-rd04-wave03-responsive-link-field-adjudication-index@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    authored_field_decisions_path: 'authored-field-decisions.json',
    field_adjudications_path: 'field-adjudications.jsonl',
    promotion_candidate_protocol_path: 'promotion-candidate-protocol.json',
    predecessor_source_protocol_path: `${SOURCE_REL}/offline-field-review-protocol.json`,
    predecessor_source_protocol_sha256: EXPECTED_INPUT_SHA256.protocol,
    predecessor_partial_matrix_path: `${MATRIX_REL}/partial-field-matrix.json`,
    predecessor_partial_matrix_sha256: EXPECTED_INPUT_SHA256.partialMatrix,
    counts: {
      review_sources: 36,
      states_represented: 24,
      candidate_source_field_pairs: 127,
      ...dispositionCounts,
      promotion_candidates: promotionRows.length,
      matrix_updates: 0,
      substantive_field_terminalizations: 0,
      terminal_field_cells_before: 100,
      terminal_field_cells_after: 100,
      still_open_field_cells_after: 350,
      terminal_units_after: 0,
      result_spawned_requests: 0,
      remedy_field_terminalizations: 0,
    },
    field_disposition_counts: fieldDispositionCounts,
    state_disposition_counts: stateDispositionCounts,
    current_result: {
      offline_field_adjudication_complete: true,
      every_frozen_source_reviewed: true,
      every_candidate_source_field_pair_adjudicated: true,
      promotion_candidates_frozen_without_promotion: true,
      field_matrix_changed: false,
      class_state: 'still_open',
      class_closed: false,
      reviewed_disposition_changes: 0,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none',
      national_prevalence_effect: 'none', discrimination_effect: 'none', coordination_effect: 'none',
      common_purpose_effect: 'none', complete_compact_effect: 'none',
    },
    next_bounded_operation: 'validate the 38 promotion candidates against exact target cells and then separately acquire sanction, notice, hearing, stay, reversal, and restoration evidence; neither operation may infer national prevalence from one-state evidence',
  };

  const base = {
    'authored-field-decisions.json': fs.readFileSync(path.join(DATA_DIR, 'authored-field-decisions.json')),
    'field-adjudications.jsonl': Buffer.from(stableJsonl(authored.decisions)),
    'promotion-candidate-protocol.json': Buffer.from(stableJson(promotionProtocol)),
    'index.json': Buffer.from(stableJson(index)),
  };
  const order = ['authored-field-decisions.json','field-adjudications.jsonl','promotion-candidate-protocol.json','index.json'];
  const entries = order.map((pathname) => ({ path: pathname, bytes: base[pathname].length, sha256: sha256(base[pathname]) }));
  const manifest = {
    schema_version: 'ssc-rd04-wave03-responsive-link-field-adjudication-manifest@1',
    permanent_data_files: 5,
    hash_mode: 'sha256_exact_utf8_bytes',
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\t${row.bytes}\t${row.sha256}\n`).join('')),
    boundaries: {
      exact_bytes_promote_matrix_cells: false,
      evidence_complete_disposition_is_terminal_field_value: false,
      one_state_evidence_establishes_national_prevalence: false,
      field_adjudication_establishes_discrimination: false,
      field_adjudication_establishes_coordination: false,
      field_adjudication_establishes_common_purpose: false,
      field_adjudication_completes_compact: false,
      manifest_creates_graph_effect: false,
    },
  };
  return {
    'field-adjudications.jsonl': base['field-adjudications.jsonl'].toString('utf8'),
    'promotion-candidate-protocol.json': base['promotion-candidate-protocol.json'].toString('utf8'),
    'index.json': base['index.json'].toString('utf8'),
    'product-manifest.json': stableJson(manifest),
  };
}

export function writeProduct(product) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const [name, content] of Object.entries(product)) fs.writeFileSync(path.join(DATA_DIR, name), content);
}
export function checkProduct(product) {
  for (const [name, expected] of Object.entries(product)) {
    const pathname = path.join(DATA_DIR, name);
    assert(fs.existsSync(pathname), `${name}: missing derived product`);
    assert(fs.readFileSync(pathname, 'utf8') === expected, `${name}: deterministic product mismatch`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--write') ? 'write' : 'check';
  const product = deriveProduct(loadInputs());
  if (mode === 'write') writeProduct(product); else checkProduct(product);
  const index = JSON.parse(product['index.json']);
  const manifest = JSON.parse(product['product-manifest.json']);
  console.log(`responsive_link_field_adjudication_build=${mode}_pass`);
  console.log(`candidate_source_field_pairs=${index.counts.candidate_source_field_pairs}`);
  console.log(`evidence_complete_bounded_finding=${index.counts.evidence_complete_bounded_finding}`);
  console.log(`promotion_candidates=${index.counts.promotion_candidates}`);
  console.log(`matrix_updates=${index.counts.matrix_updates}`);
  console.log(`manifest_combined_sha256=${manifest.combined_sha256}`);
}
