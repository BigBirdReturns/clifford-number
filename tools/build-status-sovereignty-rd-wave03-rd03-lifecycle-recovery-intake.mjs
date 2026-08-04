#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGE_PATH = 'data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/fixed-protocol-package.json';
export const PARENT_PATH = 'data/intake/status-sovereignty-rd03-osc-instrument-lifecycle.json';
export const MATRIX_CONTRACT_PATH = 'data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/field-matrix-contract.json';
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-03-C05.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const PARENT_MATRIX_PATH = 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/terminal-field-matrix.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd03-negotiated-terms/class-receipt.json';
export const PARENT_CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-03-C04.json';
export const CLASS_LABEL = 'commitment, closing, draw, disbursement, amendment, waiver, default, cure, repayment, and recovery chronology';
export const FROZEN_EXECUTION_BASE = 'a69bffa4c7c6934432b2b93816f5b2b6a466a85b';
export const CONSTITUTION_MERGE = 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2';
export const PARENT_PROMOTION_MERGE = '2af6bb7819a37e51c7198fb48da894445a29e494';

export const SOURCE_SHA256 = Object.freeze({
  parent: '3bd111cc56eb5046ed5ba2aa8a8dfdecaec9d37bbb273e6c75b695e6ae1e05a0',
  parent_matrix: '37ae1ffafc3a1f89ffb7210d7601890d71263c2edb2a363732726f77df676cb9',
  parent_receipt: '0fdefe05d54a5eaf9a6cdf6e5db0f45439ba9a5679f23d83843ea90d3227bc99',
  parent_closure: '0b34d7d113406786d0f94f73462017576785957ee19fe7f069393d81cff9a35a',
  constitution: '25cc75ce1026e5b397d00f2da310d2bcdaf12507858c573b936345ebd51c8c5b'
});

export const FIELD_IDS = Object.freeze([
  'canonical_instrument_identity',
  'commitment_state_and_governing_date',
  'financial_close_and_executed_agreement_state_and_date',
  'draw_or_cash_disbursement_state_and_date',
  'amendment_and_waiver_chronology',
  'default_cure_acceleration_or_enforcement_chronology',
  'interest_payment_chronology',
  'principal_repayment_chronology',
  'public_recovery_or_unresolved_exposure_state',
  'source_identities_and_exact_custody',
  'field_and_instrument_terminal_state'
]);

export const FIELD_TERMINAL_STATES = Object.freeze([
  'observed',
  'inherited_observed',
  'not_applicable_by_instrument_state',
  'source_restricted',
  'source_unavailable_after_fixed_protocol',
  'not_publicly_recovered'
]);

export const SEARCH_TERMS = Object.freeze([
  'financial close',
  'disbursement',
  'amendment waiver',
  'default cure',
  'repayment recovery'
]);

export const INSTRUMENTS = Object.freeze([
  {
    unit_ordinal: 1,
    unit_id: 'OSC-MP-MATERIALS-150M',
    borrower: 'MP Materials Corp.',
    search_name: 'MP Materials',
    inherited_parent_state: 'executed_and_cash_disbursed_terms_recovered_performance_and_recovery_open',
    parent_source_ids: ['SSC-RD03-S001','SSC-RD03-S002','SSC-RD03-S003','SSC-RD03-S004']
  },
  {
    unit_ordinal: 2,
    unit_id: 'OSC-VULCAN-620M',
    borrower: 'Vulcan Elements',
    search_name: 'Vulcan Elements',
    inherited_parent_state: 'conditional_pre_close',
    parent_source_ids: ['SSC-RD03-S005']
  },
  {
    unit_ordinal: 3,
    unit_id: 'OSC-REELEMENT-80M',
    borrower: 'ReElement Technologies',
    search_name: 'ReElement Technologies',
    inherited_parent_state: 'conditional_pre_close',
    parent_source_ids: ['SSC-RD03-S005','SSC-RD03-S006']
  },
  {
    unit_ordinal: 4,
    unit_id: 'OSC-PHOENIX-500M',
    borrower: 'Phoenix Tailings',
    search_name: 'Phoenix Tailings',
    inherited_parent_state: 'conditional_pre_close',
    parent_source_ids: ['SSC-RD03-S007']
  },
  {
    unit_ordinal: 5,
    unit_id: 'OSC-ENERGY-FUELS-725M',
    borrower: 'Energy Fuels',
    search_name: 'Energy Fuels',
    inherited_parent_state: 'conditional_pre_close',
    parent_source_ids: ['SSC-RD03-S008','SSC-RD03-S009']
  }
]);

export const EXACT_ROUTES = Object.freeze([
  ['https://www.defense.gov/News/Releases/Release/Article/4270722/office-of-strategic-capital-announces-first-loan-through-dod-agreement-with-mp/',['OSC-MP-MATERIALS-150M'],'official MP Materials executed-loan announcement'],
  ['https://www.sec.gov/Archives/edgar/data/1801368/000180136826000008/mp-20251231.htm',['OSC-MP-MATERIALS-150M'],'MP Materials 2025 Form 10-K'],
  ['https://www.sec.gov/Archives/edgar/data/1801368/000180136826000029/mp-20260331.htm',['OSC-MP-MATERIALS-150M'],'MP Materials March 2026 filing'],
  ['https://www.sec.gov/Archives/edgar/data/1801368/000119312525157310/d43796dex101.htm',['OSC-MP-MATERIALS-150M'],'MP Materials transaction agreement'],
  ['https://www.sec.gov/Archives/edgar/data/1801368/000119312525157310/0001193125-25-157310-index.html',['OSC-MP-MATERIALS-150M'],'MP Materials accession index'],
  ['https://www.war.gov/News/Releases/Release/Article/4339788/office-of-strategic-capital-agrees-to-joint-700m-conditional-loan-commitment-wi/',['OSC-VULCAN-620M','OSC-REELEMENT-80M'],'Vulcan and ReElement conditional commitments'],
  ['https://www.sec.gov/Archives/edgar/data/1590715/000165495425012526/arec_8k.htm',['OSC-VULCAN-620M','OSC-REELEMENT-80M'],'American Resources ReElement filing'],
  ['https://www.sec.gov/Archives/edgar/data/1590715/000165495425012526/0001654954-25-012526-index.html',['OSC-VULCAN-620M','OSC-REELEMENT-80M'],'American Resources accession index'],
  ['https://www.war.gov/News/Releases/Release/Article/4517853/office-of-strategic-capital-signs-500-million-conditional-loan-commitment-with/',['OSC-PHOENIX-500M'],'Phoenix Tailings conditional commitment'],
  ['https://www.war.gov/News/Releases/Release/Article/4520819/the-department-of-wars-office-of-strategic-capital-signs-725-million-conditiona/',['OSC-ENERGY-FUELS-725M'],'Energy Fuels conditional commitment'],
  ['https://www.sec.gov/Archives/edgar/data/1385849/000106299326003385/form8k.htm',['OSC-ENERGY-FUELS-725M'],'Energy Fuels OSC filing'],
  ['https://www.sec.gov/Archives/edgar/data/1385849/000106299326003385/0001062993-26-003385-index.html',['OSC-ENERGY-FUELS-725M'],'Energy Fuels accession index'],
  ['https://data.sec.gov/submissions/CIK0001801368.json',['OSC-MP-MATERIALS-150M'],'MP Materials SEC submissions index'],
  ['https://data.sec.gov/submissions/CIK0001590715.json',['OSC-VULCAN-620M','OSC-REELEMENT-80M'],'American Resources SEC submissions index'],
  ['https://data.sec.gov/submissions/CIK0001385849.json',['OSC-ENERGY-FUELS-725M'],'Energy Fuels SEC submissions index'],
  ['https://data.sec.gov/api/xbrl/companyfacts/CIK0001801368.json',['OSC-MP-MATERIALS-150M'],'MP Materials SEC company facts'],
  ['https://data.sec.gov/api/xbrl/companyfacts/CIK0001590715.json',['OSC-VULCAN-620M','OSC-REELEMENT-80M'],'American Resources SEC company facts'],
  ['https://data.sec.gov/api/xbrl/companyfacts/CIK0001385849.json',['OSC-ENERGY-FUELS-725M'],'Energy Fuels SEC company facts']
]);

const FIELD_QUESTIONS = Object.freeze({
  canonical_instrument_identity: 'What exact named OSC instrument and borrower identity govern this row?',
  commitment_state_and_governing_date: 'What public commitment state and governing date are recoverable for this instrument?',
  financial_close_and_executed_agreement_state_and_date: 'What public record establishes financial close or an executed agreement and its date?',
  draw_or_cash_disbursement_state_and_date: 'What public record establishes an actual draw or cash disbursement and its date?',
  amendment_and_waiver_chronology: 'What public amendment, waiver, modification, or supersession chronology is recoverable?',
  default_cure_acceleration_or_enforcement_chronology: 'What public default, cure, acceleration, enforcement, or comparable adverse-event chronology is recoverable?',
  interest_payment_chronology: 'What public record establishes actual interest payments rather than scheduled interest?',
  principal_repayment_chronology: 'What public record establishes actual principal repayment rather than maturity or scheduled payment?',
  public_recovery_or_unresolved_exposure_state: 'What public record establishes recovery, retained value, or unresolved exposure without combining companion instruments?',
  source_identities_and_exact_custody: 'What exact source locators and capture receipts support every classified lifecycle field?',
  field_and_instrument_terminal_state: 'What permitted terminal state applies after the exact fixed protocol is exhausted?'
});

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const bytes = (root, rel) => fs.readFileSync(abs(root, rel));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

function searchUrl(instrument, term) {
  const query = `"Office of Strategic Capital" "${instrument.search_name}" "${term}"`;
  return `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
}

function assertSourceHashes(root) {
  for (const [key, rel] of Object.entries({
    parent: PARENT_PATH,
    parent_matrix: PARENT_MATRIX_PATH,
    parent_receipt: PARENT_RECEIPT_PATH,
    parent_closure: PARENT_CLOSURE_PATH,
    constitution: CONSTITUTION_PATH
  })) {
    ok(sha256(bytes(root, rel)) === SOURCE_SHA256[key], `${key} source SHA-256 changed`);
  }
}

export function derivePackage(root = ROOT) {
  assertSourceHashes(root);
  const parent = read(root, PARENT_PATH);
  const matrix = read(root, MATRIX_CONTRACT_PATH);
  const seed = read(root, SEED_PATH);
  const constitution = read(root, CONSTITUTION_PATH);
  const parentReceipt = read(root, PARENT_RECEIPT_PATH);
  const parentClosure = read(root, PARENT_CLOSURE_PATH);

  ok(parent?.schema_version === 'status-sovereignty-residual-execution@1' && parent?.execution_id === 'SSC-RD03-OSC-01', 'parent lifecycle identity changed');
  ok(parent?.as_of === '2026-08-01', 'parent lifecycle cutoff changed');
  same(parent.instruments.map((row) => row.instrument_id), INSTRUMENTS.map((row) => row.unit_id), 'parent instrument order changed');
  ok(parent.counts.named_instruments === 5 && parent.counts.executed_loans === 1 && parent.counts.conditional_pre_close_commitments === 4, 'parent state denominator changed');

  ok(matrix?.schema_version === 'ssc-rd-wave03-rd03-lifecycle-recovery-field-matrix-contract@1', 'matrix contract schema changed');
  ok(matrix?.wave_id === 'SSC-RD-W03' && matrix?.lane_id === 'RD-03' && matrix?.class_id === 'RD-03-C05' && matrix?.issue === 1016, 'matrix contract identity changed');
  ok(matrix?.constitution_head === CONSTITUTION_MERGE && matrix?.frozen_execution_base === FROZEN_EXECUTION_BASE, 'matrix contract ancestry changed');
  same(matrix.units.map((row) => row.unit_id), INSTRUMENTS.map((row) => row.unit_id), 'matrix instrument order changed');
  same(matrix.required_fields, FIELD_IDS, 'matrix field order changed');
  ok(matrix.expansion_contract.required_cells === 55 && matrix.expansion_contract.required_fields_per_unit === 11, 'matrix cell denominator changed');
  same(matrix.current_counts, {materialized_cells:0,terminal_cells:0,terminal_units:0,class_closed:false}, 'matrix current state changed');

  ok(seed?.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_id === 'SSC-RD-W03' && seed?.wave_issue === 1013 && seed?.child_issue === 1016, 'seed issue custody changed');
  ok(seed?.class_id === 'RD-03-C05' && seed?.closure_target === CLASS_LABEL, 'seed class identity changed');
  ok(seed?.frozen_execution_base === FROZEN_EXECUTION_BASE && seed?.class_state === 'still_open' && seed?.class_closed === false, 'seed state changed');
  ok(seed?.denominator_contract?.unit_count === 5, 'seed denominator changed');

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-03-constitution@1', 'constitution schema changed');
  ok(constitution?.parent_custody?.wave_02_promotion_merge === PARENT_PROMOTION_MERGE, 'constitution parent promotion changed');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-03-C05');
  ok(attempt?.lane_id === 'RD-03' && attempt?.issue === 1016 && attempt?.exact_label === CLASS_LABEL, 'constitution RD-03 binding changed');
  ok(attempt?.initial_unit_count === 5 && attempt?.execution_state === 'not_executed' && attempt?.class_closed === false, 'constitution RD-03 denominator or state changed');

  ok(parentReceipt?.class_id === 'RD-03-C04' && parentReceipt?.class_closed === true, 'parent receipt reopened');
  ok(parentClosure?.class_id === 'RD-03-C04' && parentClosure?.class_closed === true, 'parent closure reopened');

  const exactRoutes = EXACT_ROUTES.map(([request_url, instrument_ids, purpose], index) => ({
    route_id: `RD03-W03-R${String(index + 1).padStart(3, '0')}`,
    route_type: 'exact_predeclared_get',
    request_url,
    purpose,
    instrument_ids,
    admission_state: 'predeclared_official_or_regulatory_source',
    maximum_attempts: 1,
    automatic_result_followups: 0
  }));
  const searchRoutes = [];
  let ordinal = exactRoutes.length + 1;
  for (const instrument of INSTRUMENTS) {
    for (const term of SEARCH_TERMS) {
      searchRoutes.push({
        route_id: `RD03-W03-R${String(ordinal).padStart(3, '0')}`,
        route_type: 'fixed_candidate_query_bing_rss',
        request_url: searchUrl(instrument, term),
        purpose: `candidate census for ${instrument.search_name}: ${term}`,
        instrument_ids: [instrument.unit_id],
        search_term: term,
        admission_state: 'candidate_census_only_not_admitted_source',
        maximum_attempts: 1,
        automatic_result_followups: 0
      });
      ordinal += 1;
    }
  }
  const routes = [...exactRoutes, ...searchRoutes];
  ok(routes.length === 43, 'fixed route denominator must be 43');
  ok(new Set(routes.map((row) => row.route_id)).size === 43, 'route IDs must be unique');
  ok(new Set(routes.map((row) => row.request_url)).size === 43, 'route URLs must be unique');

  return {
    schema_version: 'ssc-rd-wave03-rd03-lifecycle-recovery-fixed-protocol@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-03',
    class_id: 'RD-03-C05',
    issue: 1016,
    as_of: '2026-08-04',
    class_label: CLASS_LABEL,
    status: 'five_instrument_fifty_five_cell_denominator_frozen_protocol_not_executed',
    authority: 'fixed_protocol_design_only_not_acquisition_or_class_receipt',
    source_custody: {
      constitution_path: CONSTITUTION_PATH,
      constitution_merge: CONSTITUTION_MERGE,
      frozen_execution_base: FROZEN_EXECUTION_BASE,
      parent_promotion_merge: PARENT_PROMOTION_MERGE,
      seed_path: SEED_PATH,
      field_matrix_contract_path: MATRIX_CONTRACT_PATH,
      parent_lifecycle_path: PARENT_PATH,
      parent_terminal_matrix_path: PARENT_MATRIX_PATH,
      parent_class_receipt_path: PARENT_RECEIPT_PATH,
      parent_closure_reference_path: PARENT_CLOSURE_PATH,
      source_sha256: {...SOURCE_SHA256},
      parent_receipt_reopened_or_double_counted: false
    },
    denominator: {
      unit_type: 'named OSC instrument',
      instrument_count: 5,
      executed_and_cash_disbursed_parent_units: 1,
      conditional_pre_close_parent_units: 4,
      required_fields_per_instrument: 11,
      required_field_slots: 55,
      immutable_before_source_execution: true,
      source_count_is_unit_denominator: false,
      later_announcement_may_substitute_instrument: false,
      five_instruments_are_complete_osc_cohort: false
    },
    required_fields: FIELD_IDS.map((field_id) => ({
      field_id,
      question: FIELD_QUESTIONS[field_id],
      permitted_terminal_states: [...FIELD_TERMINAL_STATES]
    })),
    instruments: INSTRUMENTS.map((row) => ({
      ...row,
      required_field_ids: [...FIELD_IDS],
      protocol_state: 'not_executed',
      terminal_fields: 0,
      required_fields: FIELD_IDS.length,
      row_closed: false
    })),
    routes,
    transport_contract: {
      maximum_attempts_per_route: 1,
      timeout_ms: 30000,
      maximum_body_bytes: 10485760,
      concurrency: 4,
      bing_result_depth: 10,
      result_spawned_requests: 0,
      automatic_second_pass_authorized: false,
      external_contacts: 0,
      external_reviews: 0,
      outside_human_dependency: false
    },
    admission_rules: [
      'exact predeclared routes retain their declared official or regulatory source identity only',
      'Bing RSS results are candidate census rows and are not admitted sources',
      'no result-spawned URL may be fetched or promoted by this protocol',
      'transport success does not establish field truth without explicit content classification',
      'HTTP or transport failure is typed source custody and is not event absence'
    ],
    terminal_rules: [
      'all five instrument rows and all fifty-five field cells must be materialized',
      'conditional commitment remains distinct from financial close, execution, draw, and disbursement',
      'scheduled interest remains distinct from observed payment',
      'outstanding obligation remains distinct from default, acceleration, or enforcement',
      'maturity remains distinct from principal repayment',
      'companion equity, warrant, price support, or offtake remains distinct from loan recovery',
      'a record not publicly recovered after the fixed protocol is not event absence',
      'one terminal class receipt does not close RD-03, Wave 03, or the residual denominator'
    ],
    counts: {
      instruments: 5,
      required_fields_per_instrument: 11,
      required_field_slots: 55,
      fixed_routes: 43,
      exact_predeclared_routes: 18,
      candidate_census_routes: 25,
      acquisition_attempts: 0,
      terminal_fields: 0,
      terminal_instruments: 0,
      admitted_candidate_sources: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    current_result: {
      terminal_state: 'protocol_frozen_acquisition_not_executed',
      fixed_protocol_executed: false,
      class_closed: false,
      complete_lifecycle_chronology_observed: false,
      public_recovery_observed: false,
      favoritism_finding: false,
      extraction_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      reviewed_disposition_changed: false,
      outside_human_dependency: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      conditional_commitment_is_financial_close: false,
      financial_close_is_cash_disbursement: false,
      executed_loan_is_full_draw: false,
      scheduled_interest_is_observed_payment: false,
      outstanding_obligation_is_default: false,
      maturity_term_is_repayment: false,
      companion_public_right_is_loan_recovery: false,
      candidate_query_result_is_admitted_source: false,
      no_public_record_is_event_absence: false,
      five_named_instruments_are_complete_osc_cohort: false,
      intake_protocol_is_class_closure: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

function run() {
  const mode = process.argv[2] ?? '--check';
  const derived = derivePackage(ROOT);
  if (mode === '--write') {
    write(ROOT, PACKAGE_PATH, derived);
    console.log(`RD-03 Wave-03 fixed protocol written: ${derived.counts.required_field_slots} cells / ${derived.counts.fixed_routes} routes`);
    return;
  }
  if (mode !== '--check') throw new Error(`unsupported mode: ${mode}`);
  const committed = read(ROOT, PACKAGE_PATH);
  same(committed, derived, 'committed RD-03 Wave-03 fixed protocol differs from deterministic derivation');
  console.log(`RD-03 Wave-03 fixed protocol: ${derived.counts.required_field_slots} cells / ${derived.counts.fixed_routes} routes`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
