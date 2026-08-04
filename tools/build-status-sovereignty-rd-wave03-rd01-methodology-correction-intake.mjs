#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGE_PATH = 'data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/fixed-protocol-package.json';
export const PARENT_PATH = 'data/intake/status-sovereignty-rd01-natsec100-outcome-controls.json';
export const MATRIX_CONTRACT_PATH = 'data/intake/status-sovereignty-rd-wave03-rd01-methodology-correction/field-matrix-contract.json';
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-01-C06.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const CLASS_LABEL = 'methodology correction, appeal, and re-evaluation records';
export const FROZEN_EXECUTION_BASE = 'a69bffa4c7c6934432b2b93816f5b2b6a466a85b';
export const CONSTITUTION_MERGE = 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2';
export const SEED_BINDING_COMMIT = '956f2454813fed7a9666597b5953cc57b54e4666';
export const MATRIX_CONTRACT_BINDING_COMMIT = '43d735f93ff0171501c27890d297940e32a5e14f';
export const PARENT_BLOB_SHA = '6409c5ebd8de895517ece30ef651b8d15057fdae';
export const CONSTITUTION_BLOB_SHA = 'e924e816fec1962d5d63f1f5856f086bdeff8ad8';
export const SEED_BLOB_SHA = '7165b73bdf173720fc7ee887f70a211a48c4d6d1';
export const MATRIX_CONTRACT_BLOB_SHA = '097e17799cb733f71fe49efe45c66e66ef689216';
export const EDITIONS = Object.freeze([2024, 2025, 2026]);
export const SEARCH_TERMS = Object.freeze([
  'correction',
  'errata',
  'appeal',
  'challenge',
  're-evaluation',
  'reranking',
  'reconsideration',
  'override',
  'exception'
]);
export const FIELD_IDS = Object.freeze([
  'edition_identity_and_publication_cutoff',
  'methodology_identity_and_published_input_description',
  'published_correction_or_errata_record',
  'published_appeal_or_challenge_route',
  'published_re_evaluation_reranking_or_reconsideration_record',
  'version_exception_and_override_custody_where_public',
  'source_identities_and_exact_locators',
  'field_and_row_terminal_state'
]);
export const FIELD_TERMINAL_STATES = Object.freeze([
  'observed',
  'not_applicable_by_edition_state',
  'source_restricted',
  'source_unavailable_after_fixed_protocol',
  'not_publicly_recovered'
]);

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (value, message) => { if (!value) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);

const fieldQuestions = Object.freeze({
  edition_identity_and_publication_cutoff: 'What exact edition object and publication cutoff govern this row?',
  methodology_identity_and_published_input_description: 'What methodology identity, inputs, eligibility rules, weights, transformations, cautions, and version statements are publicly recoverable for this edition?',
  published_correction_or_errata_record: 'What published correction, errata, correction log, or superseding correction notice is publicly recoverable for this edition?',
  published_appeal_or_challenge_route: 'What published route allowed a ranked, omitted, ineligible, or otherwise assessed entity to challenge, appeal, or seek correction of this edition?',
  published_re_evaluation_reranking_or_reconsideration_record: 'What published re-evaluation, reranking, reconsideration, restored eligibility, or changed-disposition record is publicly recoverable for this edition?',
  version_exception_and_override_custody_where_public: 'What version history, exception, manual override, recusal, conflict, or departure from the published methodology is publicly recoverable for this edition?',
  source_identities_and_exact_locators: 'What exact first-party locators, capture receipts, and typed missing-record routes establish custody for every field in this edition row?',
  field_and_row_terminal_state: 'What permitted terminal state and row-level closure status are assigned after every other field has exact custody?'
});

function makeSearchUrl(edition, term) {
  const query = `site:natsec100.org \"NatSec100 ${edition}\" \"${term}\"`;
  return `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
}

export function derivePackage(root = ROOT) {
  const parent = read(root, PARENT_PATH);
  const matrixContract = read(root, MATRIX_CONTRACT_PATH);
  const seed = read(root, SEED_PATH);
  const constitution = read(root, CONSTITUTION_PATH);

  ok(parent?.schema_version === 'status-sovereignty-residual-execution@1', 'parent schema changed');
  ok(parent?.execution_id === 'SSC-RD01-NATSEC100-01', 'parent identity changed');
  ok(parent?.as_of === '2026-08-01', 'parent cutoff changed');
  ok(Array.isArray(parent?.edition_controls) && parent.edition_controls.length === 3, 'three parent edition controls required');
  same(parent.edition_controls.map((row) => row.edition), EDITIONS, 'parent edition order changed');
  ok(Array.isArray(parent?.sources) && parent.sources.length === 3, 'three parent sources required');

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

  ok(seed?.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_id === 'SSC-RD-W03' && seed?.wave_issue === 1013 && seed?.child_issue === 1014, 'seed issue custody changed');
  ok(seed?.class_id === 'RD-01-C06' && seed?.closure_target === CLASS_LABEL, 'seed class identity changed');
  ok(seed?.frozen_execution_base === FROZEN_EXECUTION_BASE, 'seed frozen base changed');
  ok(seed?.denominator_contract?.unit_count === 3, 'seed denominator changed');
  same(seed.denominator_contract.ordered_units, ['2024', '2025', '2026'], 'seed edition order changed');
  ok(seed?.class_state === 'still_open' && seed?.class_closed === false, 'seed overclosed');

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-03-constitution@1', 'constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W03' && constitution?.issue === 1013, 'constitution identity changed');
  ok(constitution?.parent_custody?.frozen_execution_base === FROZEN_EXECUTION_BASE, 'constitution frozen base changed');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-01-C06');
  ok(attempt?.lane_id === 'RD-01' && attempt?.issue === 1014, 'constitution RD-01 binding changed');
  ok(attempt?.exact_label === CLASS_LABEL && attempt?.initial_unit_count === 3, 'constitution RD-01 denominator changed');
  ok(attempt?.execution_state === 'not_executed' && attempt?.class_closed === false, 'constitution RD-01 overclosed');

  const sourceById = new Map(parent.sources.map((source) => [source.source_id, source]));
  const editions = parent.edition_controls.map((control) => {
    ok(control.source_ids.length === 1, `${control.edition}: exactly one parent source required`);
    const source = sourceById.get(control.source_ids[0]);
    ok(source, `${control.edition}: parent source missing`);
    return {
      edition: control.edition,
      source_id: source.source_id,
      exact_url: source.url,
      parent_baseline: {
        direct_contracting_input: control.direct_contracting_input,
        government_contract_eligibility_floor: control.government_contract_eligibility_floor,
        direct_operational_impact_measure: control.direct_operational_impact_measure,
        longitudinally_comparable_to_2026_without_adjustment: control.longitudinally_comparable_to_2026_without_adjustment
      },
      required_field_ids: [...FIELD_IDS],
      protocol_state: 'not_executed',
      terminal_fields: 0,
      required_fields: FIELD_IDS.length,
      row_closed: false
    };
  });

  const directRoutes = editions.map((row) => ({
    route_id: `RD01-W03-E${row.edition}-DIRECT`,
    edition: row.edition,
    route_type: 'exact_first_party_get',
    request_url: row.exact_url,
    admission_state: 'predeclared_first_party_source',
    automatic_result_followups: 0
  }));
  const searchRoutes = EDITIONS.flatMap((edition) => SEARCH_TERMS.map((term, index) => ({
    route_id: `RD01-W03-E${edition}-Q${String(index + 1).padStart(2, '0')}`,
    edition,
    route_type: 'fixed_candidate_query_bing_rss',
    request_url: makeSearchUrl(edition, term),
    search_term: term,
    admission_state: 'candidate_census_only_not_admitted_source',
    automatic_result_followups: 0
  })));
  const routes = [...directRoutes, ...searchRoutes];

  return {
    schema_version: 'ssc-rd-wave03-rd01-methodology-correction-fixed-protocol@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-01',
    class_id: 'RD-01-C06',
    issue: 1014,
    as_of: '2026-08-04',
    class_label: CLASS_LABEL,
    status: 'three_edition_twenty_four_cell_denominator_frozen_protocol_not_executed',
    authority: 'fixed_protocol_design_only_not_acquisition_or_class_receipt',
    source_custody: {
      constitution_path: CONSTITUTION_PATH,
      constitution_merge: CONSTITUTION_MERGE,
      constitution_blob_sha: CONSTITUTION_BLOB_SHA,
      frozen_execution_base: FROZEN_EXECUTION_BASE,
      seed_path: SEED_PATH,
      seed_binding_commit: SEED_BINDING_COMMIT,
      seed_blob_sha: SEED_BLOB_SHA,
      field_matrix_contract_path: MATRIX_CONTRACT_PATH,
      field_matrix_contract_binding_commit: MATRIX_CONTRACT_BINDING_COMMIT,
      field_matrix_contract_blob_sha: MATRIX_CONTRACT_BLOB_SHA,
      parent_path: PARENT_PATH,
      parent_blob_sha: PARENT_BLOB_SHA,
      prior_class_receipt_path: seed.reused_parent_custody.class_receipt_path,
      prior_closure_reference_path: seed.reused_parent_custody.closure_reference_path,
      prior_receipt_reopened_or_double_counted: false
    },
    denominator: {
      unit_type: 'NatSec100 edition',
      edition_count: 3,
      ordered_editions: [...EDITIONS],
      required_fields_per_edition: FIELD_IDS.length,
      required_field_slots: EDITIONS.length * FIELD_IDS.length,
      immutable_before_source_execution: true,
      source_count_is_unit_denominator: false,
      later_edition_may_rewrite_earlier_edition: false
    },
    required_fields: FIELD_IDS.map((fieldId) => ({
      field_id: fieldId,
      question: fieldQuestions[fieldId],
      permitted_terminal_states: [...FIELD_TERMINAL_STATES]
    })),
    editions,
    routes,
    transport_contract: {
      request_method: 'GET',
      maximum_attempts_per_route: 1,
      timeout_ms: 45000,
      maximum_body_bytes: 5242880,
      concurrency: 2,
      connection_header: 'close',
      result_spawned_requests: 0,
      external_contacts: 0,
      external_reviews: 0,
      automatic_second_pass_authorized: false
    },
    admission_rules: [
      'A direct route is admissible only as the exact predeclared first-party edition page.',
      'A candidate-query response is a candidate census, not an admitted evidentiary source.',
      'A candidate URL may be admitted only in a separate exact-capture transaction after HTTPS host, path, edition identity, and first-party custody are fixed.',
      'Redirects outside natsec100.org are not silently admitted.',
      'A later edition, commentary, news item, or list turnover may not be substituted for an edition-specific correction, appeal, re-evaluation, exception, or override record.'
    ],
    terminal_rules: [
      'Every one of the twenty-four matrix cells must receive a permitted terminal state before class closure.',
      'A candidate hit blocks source-unavailable classification until the exact candidate is separately captured or terminally excluded.',
      'No candidate hit is not proof that no correction, appeal, challenge, exception, override, or re-evaluation occurred.',
      'Methodology change is not a correction unless an exact source identifies it as correction, errata, or supersession.',
      'A new edition is not re-evaluation of prior rows unless an exact source identifies reconsideration of the prior disposition.',
      'Class closure remains a separate terminal transaction and cannot be created by this intake package.'
    ],
    counts: {
      edition_rows: 3,
      required_fields_per_edition: FIELD_IDS.length,
      required_field_slots: EDITIONS.length * FIELD_IDS.length,
      exact_first_party_routes: directRoutes.length,
      fixed_candidate_query_routes: searchRoutes.length,
      fixed_routes: routes.length,
      acquisition_attempts: 0,
      terminal_fields: 0,
      closed_edition_rows: 0,
      admitted_candidate_sources: 0,
      result_spawned_requests: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    current_result: {
      terminal_state: 'fixed_protocol_designed_not_executed',
      denominator_frozen: true,
      fixed_protocol_designed: true,
      fixed_protocol_executed: false,
      class_closed: false,
      selector_accuracy_finding: false,
      technical_superiority_finding: false,
      reviewed_disposition_changed: false,
      outside_human_dependency: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      methodology_change_is_correction: false,
      new_edition_is_prior_edition_reevaluation: false,
      no_public_appeal_route_is_no_appeal_or_challenge: false,
      no_public_override_record_is_no_override: false,
      rank_turnover_is_methodology_defect: false,
      published_ranking_is_technical_superiority_or_causal_treatment: false,
      candidate_query_result_is_admitted_source: false,
      intake_protocol_is_class_closure: false,
      one_class_closure_closes_lane: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
}

export function checkPackage(root = ROOT) {
  const expected = derivePackage(root);
  const observed = read(root, PACKAGE_PATH);
  same(observed, expected, 'committed RD-01 Wave-03 fixed-protocol package drifted from deterministic derivation');
  return observed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    write(ROOT, PACKAGE_PATH, derivePackage(ROOT));
    console.log(`wrote ${PACKAGE_PATH}`);
  } else if (mode === '--check') {
    const value = checkPackage(ROOT);
    console.log(`RD-01 Wave-03 fixed protocol: ${value.counts.edition_rows} editions / ${value.counts.required_field_slots} field slots / ${value.counts.fixed_routes} fixed routes`);
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
