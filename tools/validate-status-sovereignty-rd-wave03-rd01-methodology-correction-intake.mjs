#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT,
  PACKAGE_PATH,
  PARENT_PATH,
  MATRIX_CONTRACT_PATH,
  SEED_PATH,
  CONSTITUTION_PATH,
  CLASS_LABEL,
  FROZEN_EXECUTION_BASE,
  CONSTITUTION_MERGE,
  SEED_BINDING_COMMIT,
  MATRIX_CONTRACT_BINDING_COMMIT,
  PARENT_BLOB_SHA,
  CONSTITUTION_BLOB_SHA,
  SEED_BLOB_SHA,
  MATRIX_CONTRACT_BLOB_SHA,
  EDITIONS,
  SEARCH_TERMS,
  FIELD_IDS,
  FIELD_TERMINAL_STATES,
  derivePackage
} from './build-status-sovereignty-rd-wave03-rd01-methodology-correction-intake.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd01-methodology-correction-intake.schema.json';
const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (value, message) => { if (!value) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

function exactKeys(value, expected, label) {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be object`);
  same(Object.keys(value).sort(), [...expected].sort(), `${label} keys changed`);
}

function makeSearchUrl(edition, term) {
  const query = `site:natsec100.org \"NatSec100 ${edition}\" \"${term}\"`;
  return `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
}

export function readBundle(root = ROOT) {
  return {
    package: read(root, PACKAGE_PATH),
    schema: read(root, SCHEMA_PATH),
    seed: read(root, SEED_PATH),
    constitution: read(root, CONSTITUTION_PATH),
    parent: read(root, PARENT_PATH),
    matrixContract: read(root, MATRIX_CONTRACT_PATH)
  };
}

export function validatePackageShape(value, schema, seed, constitution, parent, matrixContract) {
  exactKeys(value, [
    'schema_version','wave_id','lane_id','class_id','issue','as_of','class_label','status','authority',
    'source_custody','denominator','required_fields','editions','routes','transport_contract',
    'admission_rules','terminal_rules','counts','current_result','boundaries'
  ], 'fixed-protocol package');
  ok(value.schema_version === 'ssc-rd-wave03-rd01-methodology-correction-fixed-protocol@1', 'package schema changed');
  ok(value.wave_id === 'SSC-RD-W03' && value.lane_id === 'RD-01' && value.class_id === 'RD-01-C06' && value.issue === 1014, 'package identity changed');
  ok(value.as_of === '2026-08-04' && value.class_label === CLASS_LABEL, 'package cutoff or class label changed');
  ok(value.status === 'three_edition_twenty_four_cell_denominator_frozen_protocol_not_executed', 'package status changed');
  ok(value.authority === 'fixed_protocol_design_only_not_acquisition_or_class_receipt', 'package authority changed');

  exactKeys(value.source_custody, [
    'constitution_path','constitution_merge','constitution_blob_sha','frozen_execution_base','seed_path',
    'seed_binding_commit','seed_blob_sha','field_matrix_contract_path','field_matrix_contract_binding_commit',
    'field_matrix_contract_blob_sha','parent_path','parent_blob_sha','prior_class_receipt_path',
    'prior_closure_reference_path','prior_receipt_reopened_or_double_counted'
  ], 'source custody');
  ok(value.source_custody.constitution_path === CONSTITUTION_PATH, 'constitution path changed');
  ok(value.source_custody.constitution_merge === CONSTITUTION_MERGE, 'constitution merge changed');
  ok(value.source_custody.constitution_blob_sha === CONSTITUTION_BLOB_SHA, 'constitution blob changed');
  ok(value.source_custody.frozen_execution_base === FROZEN_EXECUTION_BASE, 'frozen base changed');
  ok(value.source_custody.seed_path === SEED_PATH, 'seed path changed');
  ok(value.source_custody.seed_binding_commit === SEED_BINDING_COMMIT, 'seed binding commit changed');
  ok(value.source_custody.seed_blob_sha === SEED_BLOB_SHA, 'seed blob changed');
  ok(value.source_custody.field_matrix_contract_path === MATRIX_CONTRACT_PATH, 'matrix contract path changed');
  ok(value.source_custody.field_matrix_contract_binding_commit === MATRIX_CONTRACT_BINDING_COMMIT, 'matrix contract binding commit changed');
  ok(value.source_custody.field_matrix_contract_blob_sha === MATRIX_CONTRACT_BLOB_SHA, 'matrix contract blob changed');
  ok(value.source_custody.parent_path === PARENT_PATH && value.source_custody.parent_blob_sha === PARENT_BLOB_SHA, 'parent custody changed');
  ok(value.source_custody.prior_class_receipt_path === 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity/class-receipt.json', 'prior receipt path changed');
  ok(value.source_custody.prior_closure_reference_path === 'data/project/ssc-residual-wave02/closures/RD-01-C03.json', 'prior closure path changed');
  ok(value.source_custody.prior_receipt_reopened_or_double_counted === false, 'prior receipt reopened or double counted');

  exactKeys(value.denominator, [
    'unit_type','edition_count','ordered_editions','required_fields_per_edition','required_field_slots',
    'immutable_before_source_execution','source_count_is_unit_denominator','later_edition_may_rewrite_earlier_edition'
  ], 'denominator');
  ok(value.denominator.unit_type === 'NatSec100 edition' && value.denominator.edition_count === 3, 'edition denominator changed');
  same(value.denominator.ordered_editions, EDITIONS, 'edition order changed');
  ok(value.denominator.required_fields_per_edition === 8 && value.denominator.required_field_slots === 24, 'field denominator changed');
  ok(value.denominator.immutable_before_source_execution === true, 'denominator no longer frozen');
  ok(value.denominator.source_count_is_unit_denominator === false, 'source-count denominator introduced');
  ok(value.denominator.later_edition_may_rewrite_earlier_edition === false, 'historical edition rewrite allowed');

  ok(Array.isArray(value.required_fields) && value.required_fields.length === FIELD_IDS.length, 'eight required fields required');
  same(value.required_fields.map((row) => row.field_id), FIELD_IDS, 'required field order changed');
  unique(value.required_fields.map((row) => row.field_id), 'duplicate required field');
  for (const row of value.required_fields) {
    exactKeys(row, ['field_id','question','permitted_terminal_states'], `${row.field_id} field`);
    ok(typeof row.question === 'string' && row.question.length > 20, `${row.field_id}: question weakened`);
    same(row.permitted_terminal_states, FIELD_TERMINAL_STATES, `${row.field_id}: terminal-state vocabulary changed`);
  }

  ok(Array.isArray(parent.edition_controls) && parent.edition_controls.length === 3, 'parent edition-control denominator changed');
  same(parent.edition_controls.map((row) => row.edition), EDITIONS, 'parent edition order changed');
  ok(Array.isArray(parent.sources) && parent.sources.length === 3, 'parent source denominator changed');
  same(parent.sources.map((row) => row.source_id), ['SSC-RD01-S001','SSC-RD01-S002','SSC-RD01-S003'], 'parent source order changed');
  unique(parent.sources.map((row) => row.source_id), 'duplicate parent source id');

  ok(matrixContract?.schema_version === 'ssc-rd-wave03-rd01-methodology-correction-field-matrix-contract@1', 'matrix contract schema changed');
  ok(matrixContract?.wave_id === 'SSC-RD-W03' && matrixContract?.lane_id === 'RD-01' && matrixContract?.class_id === 'RD-01-C06' && matrixContract?.issue === 1014, 'matrix contract identity changed');
  ok(matrixContract?.constitution_head === CONSTITUTION_MERGE && matrixContract?.frozen_execution_base === FROZEN_EXECUTION_BASE, 'matrix contract ancestry changed');
  ok(matrixContract?.seed_path === SEED_PATH && matrixContract?.status === 'unit_and_field_contract_frozen_acquisition_not_executed', 'matrix contract state changed');
  ok(Array.isArray(matrixContract?.units) && matrixContract.units.length === 3, 'matrix contract unit denominator changed');
  same(matrixContract.units.map((row) => row.edition_year), EDITIONS, 'matrix contract edition order changed');
  same(matrixContract.required_fields, FIELD_IDS, 'matrix contract field order changed');
  same(matrixContract.expansion_contract, {
    matrix_shape: 'cartesian_product_of_frozen_units_and_required_fields',
    unit_count: 3,
    required_fields_per_unit: 8,
    required_cells: 24,
    initial_cell_state: 'unclassified',
    all_cells_must_be_materialized: true,
    silent_unit_or_field_removal_allowed: false,
    padding_rows_allowed: false,
    source_count_is_unit_denominator: false,
    outcome_based_unit_selection_allowed: false
  }, 'matrix expansion contract changed');
  same(matrixContract.current_counts, {materialized_cells:0,terminal_cells:0,terminal_units:0,class_closed:false}, 'matrix current counts changed');

  ok(Array.isArray(value.editions) && value.editions.length === 3, 'three edition rows required');
  same(value.editions.map((row) => row.edition), EDITIONS, 'edition row order changed');
  unique(value.editions.map((row) => row.source_id), 'duplicate edition source id');
  const controlByEdition = new Map(parent.edition_controls.map((row) => [row.edition, row]));
  const sourceById = new Map(parent.sources.map((row) => [row.source_id, row]));
  for (const row of value.editions) {
    exactKeys(row, ['edition','source_id','exact_url','parent_baseline','required_field_ids','protocol_state','terminal_fields','required_fields','row_closed'], `${row.edition} edition row`);
    const control = controlByEdition.get(row.edition);
    ok(control && control.source_ids.length === 1 && row.source_id === control.source_ids[0], `${row.edition}: source binding changed`);
    ok(row.exact_url === sourceById.get(row.source_id)?.url, `${row.edition}: exact URL changed`);
    same(row.parent_baseline, {
      direct_contracting_input: control.direct_contracting_input,
      government_contract_eligibility_floor: control.government_contract_eligibility_floor,
      direct_operational_impact_measure: control.direct_operational_impact_measure,
      longitudinally_comparable_to_2026_without_adjustment: control.longitudinally_comparable_to_2026_without_adjustment
    }, `${row.edition}: parent baseline changed`);
    same(row.required_field_ids, FIELD_IDS, `${row.edition}: required fields changed`);
    ok(row.protocol_state === 'not_executed' && row.terminal_fields === 0 && row.required_fields === 8 && row.row_closed === false, `${row.edition}: row overpromoted`);
  }

  ok(Array.isArray(value.routes) && value.routes.length === 30, 'thirty fixed routes required');
  unique(value.routes.map((row) => row.route_id), 'duplicate fixed route id');
  unique(value.routes.map((row) => row.request_url), 'duplicate fixed request URL');
  const direct = value.routes.slice(0, 3);
  same(direct.map((row) => row.route_id), EDITIONS.map((edition) => `RD01-W03-E${edition}-DIRECT`), 'direct route order changed');
  for (const [index, row] of direct.entries()) {
    exactKeys(row, ['route_id','edition','route_type','request_url','admission_state','automatic_result_followups'], `${row.route_id} route`);
    const edition = value.editions[index];
    ok(row.edition === edition.edition && row.route_type === 'exact_first_party_get', `${row.route_id}: route identity changed`);
    ok(row.request_url === edition.exact_url && row.admission_state === 'predeclared_first_party_source', `${row.route_id}: direct source admission changed`);
    ok(row.automatic_result_followups === 0, `${row.route_id}: automatic follow-up introduced`);
  }
  const search = value.routes.slice(3);
  ok(search.length === 27, 'twenty-seven candidate-query routes required');
  let cursor = 0;
  for (const edition of EDITIONS) {
    for (const [termIndex, term] of SEARCH_TERMS.entries()) {
      const row = search[cursor++];
      const expectedId = `RD01-W03-E${edition}-Q${String(termIndex + 1).padStart(2, '0')}`;
      exactKeys(row, ['route_id','edition','route_type','request_url','search_term','admission_state','automatic_result_followups'], `${expectedId} route`);
      ok(row.route_id === expectedId && row.edition === edition, `${expectedId}: route identity changed`);
      ok(row.route_type === 'fixed_candidate_query_bing_rss' && row.search_term === term, `${expectedId}: query class changed`);
      ok(row.request_url === makeSearchUrl(edition, term), `${expectedId}: request URL changed`);
      ok(row.admission_state === 'candidate_census_only_not_admitted_source', `${expectedId}: candidate promoted to source`);
      ok(row.automatic_result_followups === 0, `${expectedId}: automatic follow-up introduced`);
    }
  }

  exactKeys(value.transport_contract, [
    'request_method','maximum_attempts_per_route','timeout_ms','maximum_body_bytes','concurrency',
    'connection_header','result_spawned_requests','external_contacts','external_reviews','automatic_second_pass_authorized'
  ], 'transport contract');
  same(value.transport_contract, {
    request_method: 'GET', maximum_attempts_per_route: 1, timeout_ms: 45000,
    maximum_body_bytes: 5242880, concurrency: 2, connection_header: 'close',
    result_spawned_requests: 0, external_contacts: 0, external_reviews: 0,
    automatic_second_pass_authorized: false
  }, 'transport contract changed');
  ok(Array.isArray(value.admission_rules) && value.admission_rules.length === 5, 'five admission rules required');
  ok(Array.isArray(value.terminal_rules) && value.terminal_rules.length === 6, 'six terminal rules required');
  ok(value.admission_rules.every((row) => typeof row === 'string' && row.length > 20), 'admission rule weakened');
  ok(value.terminal_rules.every((row) => typeof row === 'string' && row.length > 20), 'terminal rule weakened');

  exactKeys(value.counts, [
    'edition_rows','required_fields_per_edition','required_field_slots','exact_first_party_routes',
    'fixed_candidate_query_routes','fixed_routes','acquisition_attempts','terminal_fields','closed_edition_rows',
    'admitted_candidate_sources','result_spawned_requests','external_contacts','external_reviews'
  ], 'counts');
  same(value.counts, {
    edition_rows: 3, required_fields_per_edition: 8, required_field_slots: 24,
    exact_first_party_routes: 3, fixed_candidate_query_routes: 27, fixed_routes: 30,
    acquisition_attempts: 0, terminal_fields: 0, closed_edition_rows: 0,
    admitted_candidate_sources: 0, result_spawned_requests: 0, external_contacts: 0, external_reviews: 0
  }, 'counts changed');

  exactKeys(value.current_result, [
    'terminal_state','denominator_frozen','fixed_protocol_designed','fixed_protocol_executed','class_closed',
    'selector_accuracy_finding','technical_superiority_finding','reviewed_disposition_changed',
    'outside_human_dependency','project_blocking','publication_effect','adoption_effect','graph_effect'
  ], 'current result');
  ok(value.current_result.terminal_state === 'fixed_protocol_designed_not_executed', 'current terminal state changed');
  ok(value.current_result.denominator_frozen === true && value.current_result.fixed_protocol_designed === true, 'protocol design state changed');
  for (const key of ['fixed_protocol_executed','class_closed','selector_accuracy_finding','technical_superiority_finding','reviewed_disposition_changed','outside_human_dependency','project_blocking']) {
    ok(value.current_result[key] === false, `${key} escalated`);
  }
  for (const key of ['publication_effect','adoption_effect','graph_effect']) ok(value.current_result[key] === 'none', `${key} changed`);

  exactKeys(value.boundaries, [
    'methodology_change_is_correction','new_edition_is_prior_edition_reevaluation',
    'no_public_appeal_route_is_no_appeal_or_challenge','no_public_override_record_is_no_override',
    'rank_turnover_is_methodology_defect','published_ranking_is_technical_superiority_or_causal_treatment',
    'candidate_query_result_is_admitted_source','intake_protocol_is_class_closure','one_class_closure_closes_lane',
    'graph_effect','publication_effect','adoption_effect'
  ], 'boundaries');
  for (const [key, entry] of Object.entries(value.boundaries)) {
    if (key.endsWith('_effect')) ok(entry === 'none', `${key} changed`);
    else ok(entry === false, `${key} weakened`);
  }

  ok(seed.class_id === 'RD-01-C06' && seed.frozen_execution_base === FROZEN_EXECUTION_BASE, 'seed binding changed');
  ok(seed.class_state === 'still_open' && seed.class_closed === false, 'seed overclosed');
  ok(constitution.parent_custody.frozen_execution_base === FROZEN_EXECUTION_BASE, 'constitution binding changed');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-01-C06');
  ok(attempt?.exact_label === CLASS_LABEL && attempt?.initial_unit_count === 3, 'constitution attempt changed');

  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd01-methodology-correction-intake.schema.json', 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root opened');
  ok(schema?.properties?.schema_version?.const === value.schema_version, 'schema version binding changed');
  ok(schema?.properties?.required_fields?.minItems === 8 && schema?.properties?.required_fields?.maxItems === 8, 'schema field denominator changed');
  ok(schema?.properties?.editions?.minItems === 3 && schema?.properties?.editions?.maxItems === 3, 'schema edition denominator changed');
  ok(schema?.properties?.routes?.minItems === 30 && schema?.properties?.routes?.maxItems === 30, 'schema route denominator changed');
  ok(schema?.properties?.counts?.properties?.required_field_slots?.const === 24, 'schema field slot count changed');
  ok(schema?.properties?.counts?.properties?.fixed_routes?.const === 30, 'schema route count changed');
  return value;
}

function validateGitCustody(root) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  for (const commit of [FROZEN_EXECUTION_BASE, CONSTITUTION_MERGE, SEED_BINDING_COMMIT, MATRIX_CONTRACT_BINDING_COMMIT]) {
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root, encoding: 'utf8' });
    ok(ancestor.status === 0, `${commit}: required ancestor missing`);
  }
  for (const [rel, expected] of [[PARENT_PATH,PARENT_BLOB_SHA],[CONSTITUTION_PATH,CONSTITUTION_BLOB_SHA],[SEED_PATH,SEED_BLOB_SHA],[MATRIX_CONTRACT_PATH,MATRIX_CONTRACT_BLOB_SHA]]) {
    const blob = spawnSync('git', ['rev-parse', `HEAD:${rel}`], { cwd: root, encoding: 'utf8' });
    ok(blob.status === 0 && blob.stdout.trim() === expected, `${rel}: Git blob changed`);
  }
  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  ok(!tracked.some((rel) => rel.includes('temporary-ssc-rd-wave03-rd01') || rel.startsWith('.rd01-wave03/')), 'temporary RD-01 Wave-03 transport retained');
}

export function validatePackage(root = ROOT) {
  const bundle = readBundle(root);
  validatePackageShape(bundle.package, bundle.schema, bundle.seed, bundle.constitution, bundle.parent, bundle.matrixContract);
  same(bundle.package, derivePackage(root), 'committed package differs from deterministic derivation');
  validateGitCustody(root);
  return bundle.package;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const value = validatePackage(ROOT);
  console.log(`RD-01 Wave-03 intake validated: ${value.counts.edition_rows} editions / ${value.counts.required_field_slots} cells / ${value.counts.fixed_routes} routes; execution not started`);
}
