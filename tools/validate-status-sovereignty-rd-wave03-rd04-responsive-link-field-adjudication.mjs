#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, DATA_DIR, DATA_REL, DISPOSITIONS, SUBSTANTIVE_FIELDS, EXPECTED_INPUT_SHA256,
  loadInputs, validateInputs, deriveProduct, sha256,
} from './build-status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), 'utf8'));
}
function readJsonl(rel) {
  return fs.readFileSync(path.join(DATA_DIR, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}
function countBy(rows, key) {
  const out = {};
  for (const row of rows) out[row[key]] = (out[row[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function validateProduct({ root = ROOT } = {}) {
  assert(root === ROOT, 'custom roots are not authorized for permanent validation');
  const inputs = loadInputs();
  const validated = validateInputs(inputs);
  const expected = deriveProduct(inputs);
  for (const [name, content] of Object.entries(expected)) {
    const pathname = path.join(DATA_DIR, name);
    assert(fs.existsSync(pathname), `${name}: missing`);
    assert(fs.readFileSync(pathname, 'utf8') === content, `${name}: deterministic mismatch`);
  }

  const authored = readJson('authored-field-decisions.json');
  const rows = readJsonl('field-adjudications.jsonl');
  const promotion = readJson('promotion-candidate-protocol.json');
  const index = readJson('index.json');
  const manifest = readJson('product-manifest.json');

  assert(rows.length === 127 && authored.decisions.length === 127, '127-row adjudication denominator');
  assert(JSON.stringify(rows) === JSON.stringify(authored.decisions), 'JSONL must be exact authored-decision projection');
  assert(new Set(rows.map((row) => row.decision_id)).size === 127, 'decision IDs unique');
  assert(rows.every((row, i) => row.decision_ordinal === i + 1), 'decision order');
  assert(rows.every((row) => SUBSTANTIVE_FIELDS.includes(row.field_id) && DISPOSITIONS.includes(row.disposition)), 'field/disposition vocabulary');
  const counts = countBy(rows, 'disposition');
  assert(counts.evidence_complete_bounded_finding === 38, '38 evidence-complete rows');
  assert(counts.partial_support_hold_open === 18, '18 partial rows');
  assert(counts.temporal_or_scope_ambiguity_hold_open === 19, '19 ambiguity rows');
  assert(counts.no_relevant_support_hold_open === 52, '52 no-support rows');

  const complete = rows.filter((row) => row.disposition === 'evidence_complete_bounded_finding');
  assert(complete.length === 38 && complete.every((row) => row.promotion_candidate === true), '38 promotion candidates');
  assert(rows.filter((row) => row.promotion_candidate).length === 38, 'only evidence-complete rows promote to candidate protocol');
  assert(rows.every((row) => row.promotion_authority === false && row.matrix_effect === 'none' && row.field_terminalization_effect === 'none' && row.class_closure_effect === 'none'), 'no matrix/terminalization/closure authority');
  assert(rows.every((row) => row.complete_source_reviewed === true && row.source_scope_only === true), 'complete fixed-source review boundary');
  assert(rows.every((row) => row.result_spawned_requests === 0 && row.outside_human_dependency === false && row.reviewed_disposition_change === false), 'no requests/human/disposition effects');
  const effectKeys = ['publication_effect','adoption_effect','graph_effect','national_prevalence_effect','discrimination_effect','coordination_effect','common_purpose_effect','complete_compact_effect'];
  assert(rows.every((row) => effectKeys.every((key) => row[key] === 'none')), 'no publication/graph/inference effects');

  assert(promotion.schema_version === 'ssc-rd04-wave03-responsive-link-promotion-candidate-protocol@1', 'promotion protocol schema');
  assert(promotion.predecessor_partial_matrix_sha256 === EXPECTED_INPUT_SHA256.partialMatrix, 'promotion matrix SHA');
  assert(promotion.candidate_rows === 38 && promotion.rows.length === 38, 'promotion denominator');
  assert(promotion.matrix_updates_authorized === 0 && promotion.field_terminalizations_authorized === 0, 'promotion authority withheld');
  assert(new Set(promotion.rows.map((row) => row.source_decision_id)).size === 38, 'promotion source decisions unique');
  assert(JSON.stringify(promotion.rows.map((row) => row.source_decision_id)) === JSON.stringify(complete.map((row) => row.decision_id)), 'promotion order/source binding');
  for (const row of promotion.rows) {
    const source = complete.find((item) => item.decision_id === row.source_decision_id);
    assert(source, `${row.promotion_candidate_id}: missing source decision`);
    assert(row.route_id === source.route_id && row.unit_id === source.unit_id && row.field_id === source.field_id, `${row.promotion_candidate_id}: source identity`);
    assert(row.candidate_bounded_finding === source.bounded_finding && row.evidence_basis === source.evidence_basis && row.counterevidence_or_limitation === source.counterevidence_or_limitation, `${row.promotion_candidate_id}: finding/counterevidence`);
    assert(row.current_matrix_cell.state === 'still_open' && row.current_matrix_cell.terminal === false && row.current_matrix_cell.value === null, `${row.promotion_candidate_id}: target cell must remain open`);
    assert(row.promotion_authority === false && row.matrix_effect === 'none' && row.terminalization_effect === 'none' && row.class_closure_effect === 'none', `${row.promotion_candidate_id}: effect boundary`);
    assert(row.outside_human_dependency === false && effectKeys.every((key) => row[key] === 'none'), `${row.promotion_candidate_id}: authority boundary`);
  }
  assert(promotion.current_result.matrix_changed === false && promotion.current_result.terminal_cells_before === 100 && promotion.current_result.terminal_cells_after === 100 && promotion.current_result.still_open_cells_after === 350, 'promotion protocol matrix unchanged');
  assert(promotion.current_result.class_closed === false && promotion.current_result.outside_human_dependency === false, 'promotion protocol class/human boundary');

  assert(index.schema_version === 'ssc-rd04-wave03-responsive-link-field-adjudication-index@1', 'index schema');
  assert(index.predecessor_source_protocol_sha256 === EXPECTED_INPUT_SHA256.protocol, 'index source protocol SHA');
  assert(index.predecessor_partial_matrix_sha256 === EXPECTED_INPUT_SHA256.partialMatrix, 'index matrix SHA');
  const expectedIndexCounts = {
    review_sources: 36, states_represented: 24, candidate_source_field_pairs: 127,
    evidence_complete_bounded_finding: 38, partial_support_hold_open: 18,
    temporal_or_scope_ambiguity_hold_open: 19, no_relevant_support_hold_open: 52,
    promotion_candidates: 38, matrix_updates: 0, substantive_field_terminalizations: 0,
    terminal_field_cells_before: 100, terminal_field_cells_after: 100, still_open_field_cells_after: 350,
    terminal_units_after: 0, result_spawned_requests: 0, remedy_field_terminalizations: 0,
  };
  for (const [key, value] of Object.entries(expectedIndexCounts)) assert(index.counts?.[key] === value, `${key}: ${index.counts?.[key]} != ${value}`);
  assert(Object.keys(index.field_disposition_counts).sort().join('|') === [...SUBSTANTIVE_FIELDS].sort().join('|'), 'field disposition denominator');
  assert(Object.keys(index.state_disposition_counts).length === 24, 'state disposition denominator');
  assert(index.current_result.offline_field_adjudication_complete === true && index.current_result.every_frozen_source_reviewed === true && index.current_result.every_candidate_source_field_pair_adjudicated === true, 'adjudication completion');
  assert(index.current_result.promotion_candidates_frozen_without_promotion === true && index.current_result.field_matrix_changed === false, 'freeze without promotion');
  assert(index.current_result.class_state === 'still_open' && index.current_result.class_closed === false && index.current_result.reviewed_disposition_changes === 0, 'class/disposition state');
  assert(index.current_result.outside_human_dependency === false && effectKeys.every((key) => index.current_result[key] === 'none'), 'index authority boundary');
  assert(index.next_bounded_operation.includes('sanction, notice, hearing, stay, reversal, and restoration'), 'remedy frontier must remain explicit');
  assert(index.next_bounded_operation.includes('neither operation may infer national prevalence from one-state evidence'), 'one-state prevalence boundary');

  assert(manifest.schema_version === 'ssc-rd04-wave03-responsive-link-field-adjudication-manifest@1', 'manifest schema');
  assert(manifest.permanent_data_files === 5 && manifest.entries.length === 4 && manifest.self_included === false, 'manifest counts');
  const expectedPaths = ['authored-field-decisions.json','field-adjudications.jsonl','promotion-candidate-protocol.json','index.json'];
  assert(JSON.stringify(manifest.entries.map((row) => row.path)) === JSON.stringify(expectedPaths), 'manifest path order');
  for (const entry of manifest.entries) {
    const bytes = fs.readFileSync(path.join(DATA_DIR, entry.path));
    assert(bytes.length === entry.bytes, `${entry.path}: manifest bytes`);
    assert(sha256(bytes) === entry.sha256, `${entry.path}: manifest SHA`);
  }
  const combined = sha256(manifest.entries.map((row) => `${row.path}\t${row.bytes}\t${row.sha256}\n`).join(''));
  assert(combined === manifest.combined_sha256, 'manifest combined SHA');
  assert(Object.values(manifest.boundaries).every((value) => value === false), 'manifest boundaries');

  const permanentPaths = [
    '.github/workflows/status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.yml',
    `${DATA_REL}/authored-field-decisions.json`,
    `${DATA_REL}/field-adjudications.jsonl`,
    `${DATA_REL}/promotion-candidate-protocol.json`,
    `${DATA_REL}/index.json`,
    `${DATA_REL}/product-manifest.json`,
    'docs/milestones/ssc-rd-wave03-rd04-responsive-link-field-adjudication.md',
    'schemas/status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.schema.json',
    'test/status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.test.js',
    'tools/build-status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.mjs',
    'tools/validate-status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.mjs',
  ];
  assert(permanentPaths.length === 11 && new Set(permanentPaths).size === 11, 'permanent path denominator');
  assert(permanentPaths.every((pathname) => fs.existsSync(path.join(ROOT, pathname))), 'every permanent path must exist');
  assert(permanentPaths.every((pathname) => !/(^|\/)(tmp|transport|carrier|materializer|trigger)(\/|$)/.test(pathname)), 'transport path prohibited');

  return { authored, rows, promotion, index, manifest, validated };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { index, manifest } = validateProduct();
  console.log('responsive_link_field_adjudication_validation=pass');
  console.log(`review_sources=${index.counts.review_sources}`);
  console.log(`candidate_source_field_pairs=${index.counts.candidate_source_field_pairs}`);
  console.log(`promotion_candidates=${index.counts.promotion_candidates}`);
  console.log(`matrix_updates=${index.counts.matrix_updates}`);
  console.log(`terminal_cells_after=${index.counts.terminal_field_cells_after}`);
  console.log(`manifest_combined_sha256=${manifest.combined_sha256}`);
}
