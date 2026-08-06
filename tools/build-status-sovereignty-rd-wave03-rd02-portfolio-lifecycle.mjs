#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WAVE_ID = 'SSC-RD-W03';
export const LANE_ID = 'RD-02';
export const CLASS_ID = 'RD-02-C05';
export const ISSUE = 1015;
export const SOURCE_PR = 1098;
export const CLASS_LABEL = 'complete portfolio investment, follow-on, exit, write-off, default, return, and repayment ledger';
export const TERMINAL_STATE = 'bounded_source_unavailable';
export const CANONICAL_SOURCE_MERGE = '41a1e46f8981001aeaf027662ed2f16ad9468d99';
export const PROMOTION_MERGE = '61a33f5459e64f1978d9c55c1b7ea7f925358cd8';
export const PROMOTION_MANIFEST_SHA256 = '068330d24a8bc378964cee2d88c3ebe1c5b48b36154f58636e72d78d40e71e82';
export const CURRENT_LEDGER_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-current.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-03-constitution.json';
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-02-C05.json';
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json';
export const PARENT_CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-02-C04.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/class-receipt.json';
export const PARENT_MATRIX_PATH = 'data/research/status-sovereignty-rd-wave02-rd02-license-leverage/terminal-field-matrix.json';
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle';
export const CLOSURE_PATH = 'data/project/ssc-residual-wave03/closures/RD-02-C05.json';
export const SOURCE_2024_PATH = `${PRODUCT_ROOT}/sources/stifel-am-forward-2024-final-approval.json`;
export const SOURCE_2021_PATH = `${PRODUCT_ROOT}/sources/stifel-north-atlantic-2021-manager-lineage.json`;
export const REQUIRED_FIELDS = [
  'canonical_cohort_row_and_legal_vehicle_or_withheld_state_label',
  'publicly_identified_portfolio_investments',
  'publicly_identified_follow_on_investments',
  'publicly_identified_exits',
  'publicly_identified_write_offs_or_realized_losses',
  'publicly_identified_defaults_or_cures',
  'publicly_identified_realized_fund_returns',
  'sba_guaranteed_leverage_repayment_or_loss_allocation',
  'source_identities_and_exact_custody',
  'field_and_row_terminal_state'
];

export const INPUT_SHA256 = Object.freeze({
  [SEED_PATH]: 'af1dfe80da4ac4d4e3c58a670636b89d39c35a440ebca79b6d5a9e3e8236b58e',
  [MATRIX_PATH]: '933a16c6f945e2a7392e3919bbd6e238486fe45092350681a975f8a83a252dfc',
  [CONSTITUTION_PATH]: '25cc75ce1026e5b397d00f2da310d2bcdaf12507858c573b936345ebd51c8c5b',
  [PARENT_CLOSURE_PATH]: '0b7ee20eff46e47a1c245593448f3a52ae5040aa642f95eddf70391038008f29',
  [PARENT_RECEIPT_PATH]: 'fa458685c500e14f437b207d1105fc579565e057b030344749e88e1e5e44efbf',
  [PARENT_MATRIX_PATH]: 'e359e4e738e6ab771953ee5ef7b9a62abaee36e43009976510e213cb8e9b4998',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-protocol.json': '9c1822d5b59dc3b15d107afd462b43174961de8f98941697cbc72849a0dd10f2',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-execution-receipt.json': '362a5a2fefe944aff9895a74dd2ced528bcb90356cb2b4691f67b781fa728312',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-adjudication/index.json': 'd6f5ff837956d176a41834b3a2b00a722eb92743ae4c761f44a9d2f2ece5eaf3',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-followup-protocol.json': '78f87ea8b147c1a304eec9dacf548c5975cc9197254957b18ee59d0fa97043ca',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-followup-execution-receipt.json': '58311cbd71fde4fab63728e0768cd6452a3616957c95ac14a3036ea916cc2236',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/same-host-link-adjudication.json': '11cbd1821ce1c3464d07433fba5ca97ca5577b1bd42adaaf71fc7253efaff62b',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/same-host-followup-protocol.json': 'b358e3901b8cc053e1f967daef96448f3cb2b7b6c3a00b50af688527dacbcc4e',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/same-host-followup-execution-receipt.json': 'bf2274209916a69577799d297ed873dabc92f0cf6aef28c4308fd7fbdff13a49',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/disclosure-leaf-adjudication.json': '9dfcc33ca9221239dc61349af7a5b73b5a3debed241f5f6e79eae95e6c87ce4d',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/disclosure-leaf-followup-protocol.json': 'a0d61f48e4e976234f30b091f18192b0fe82fd54d9048f82938a43de80ec583b',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/disclosure-leaf-execution-receipt.json': '0025483d156fe787d1256bb0f32c710bd7fffbdb5cce08eacfd3a812f2fbf5a3',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-protocol.json': '7d68466b80f8fbabb67e488e0f7ff1ce6225938909f9b7982a364a7906ad9425',
  'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-execution-receipt.json': 'c46b51863709d3bf2191d11cfb61ad242a1d146b3701a98b0fdc25489a349e1c',
  [`${PRODUCT_ROOT}/manager-lineage-replay-summary.json`]: 'db808f3c0842fe2c9a38a645c8423c93d8a4d003258282d0d153fc9696f5b78b',
  [`${PRODUCT_ROOT}/manager-lineage-replay-manifest.json`]: '6e3ce909a033cdecc51a62bc718e85a992f16e128be9b703ca81f91cde306ae1',
  [SOURCE_2024_PATH]: '76fbb6c70f495a68e8f12fb227e7df9410635a5a0af1b9ada8f39d82eaceb4e2',
  [SOURCE_2021_PATH]: '109173a0b9c4b5657f9e90b4644d40bc409312cb128e5ccea73e70ce6a66dd14'
});

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);


export function classifyCurrentLedgerCustody(current, manifestCombined = PROMOTION_MANIFEST_SHA256) {
  const counts = current?.counts ?? {};
  const result = current?.current_result ?? {};
  const prePromotion =
    counts.closed_residual_classes === 8 &&
    counts.open_residual_classes === 34 &&
    result.open_selected_class_ids?.includes(CLASS_ID) &&
    !result.closed_class_ids?.includes(CLASS_ID);
  if (prePromotion) return 'pre_promotion';

  const promoted = Array.isArray(current?.promoted_class_receipts) ? current.promoted_class_receipts : [];
  const selectedOpen = Array.isArray(current?.selected_classes_open) ? current.selected_classes_open : [];
  const promotedIds = promoted.map((row) => row.class_id);
  const closedIds = Array.isArray(result.closed_class_ids) ? result.closed_class_ids : [];
  const selectedOpenIds = selectedOpen.map((row) => row.class_id);
  const openSelectedIds = Array.isArray(result.open_selected_class_ids) ? result.open_selected_class_ids : [];
  const terminalReceipts = counts.wave_03_terminal_class_receipts;
  const postRow = promoted.find((row) => row.class_id === CLASS_ID);
  const sourceSnapshots = current?.source_snapshots ?? {};

  const arithmetic =
    current?.schema_version === 'status-sovereignty-residual-denominator-wave-03-current@1' &&
    current?.wave_id === WAVE_ID &&
    current?.issue === 1013 &&
    counts.canonical_residual_classes === 42 &&
    counts.classes_closed_before_wave === 6 &&
    counts.wave_03_selected_class_attempts === 6 &&
    Number.isInteger(terminalReceipts) &&
    terminalReceipts >= 3 &&
    terminalReceipts <= 6 &&
    counts.classes_closed_this_wave === terminalReceipts &&
    counts.closed_residual_classes === 6 + terminalReceipts &&
    counts.open_residual_classes === 42 - counts.closed_residual_classes &&
    promoted.length === counts.closed_residual_classes &&
    new Set(promotedIds).size === promotedIds.length &&
    JSON.stringify(closedIds) === JSON.stringify(promotedIds) &&
    result.classes_closed === counts.closed_residual_classes &&
    result.classes_open === counts.open_residual_classes &&
    result.wave_03_selected_attempts_terminal === terminalReceipts &&
    selectedOpen.length === 6 - terminalReceipts &&
    JSON.stringify(openSelectedIds) === JSON.stringify(selectedOpenIds) &&
    !openSelectedIds.includes(CLASS_ID) &&
    closedIds.includes(CLASS_ID);

  const exactRow =
    postRow?.lane_id === LANE_ID &&
    postRow?.issue === ISSUE &&
    postRow?.source_pr === SOURCE_PR &&
    postRow?.merge_commit === PROMOTION_MERGE &&
    postRow?.constitutional_exact_label === CLASS_LABEL &&
    postRow?.receipt_class_label === CLASS_LABEL &&
    postRow?.labels_exact_match === true &&
    postRow?.label_reconciliation === 'none' &&
    postRow?.terminal_state === TERMINAL_STATE &&
    postRow?.closure_reference_path === CLOSURE_PATH &&
    postRow?.class_receipt_path === `${PRODUCT_ROOT}/class-receipt.json` &&
    postRow?.manifest_combined_sha256 === manifestCombined &&
    postRow?.class_closed === true;

  const exactSourceSnapshot =
    sourceSnapshots.rd02_closure_reference_path === CLOSURE_PATH &&
    sourceSnapshots.rd02_class_receipt_path === `${PRODUCT_ROOT}/class-receipt.json` &&
    sourceSnapshots.rd02_merge_commit === PROMOTION_MERGE;

  ok(arithmetic && exactRow && exactSourceSnapshot,
    'current cumulative ledger does not preserve monotonic RD-02 promotion custody');
  return 'forward_post_promotion';
}

const pipelinePaths = Object.keys(INPUT_SHA256).filter((rel) => rel.includes('rd-wave03-rd02-portfolio-lifecycle'));
const lifecycleFields = REQUIRED_FIELDS.slice(1, 8);
const sourceIds = ['STIFEL-AM-FORWARD-2024-FINAL-APPROVAL', 'STIFEL-NORTH-ATLANTIC-2021-MANAGER-LINEAGE'];
const routeIdsFor = (ordinal) => ordinal === 18 ? [] : ['PORTFOLIO', 'DISPOSITION', 'RECOVERY'].map((kind) => `RD02-W03-R${String(ordinal).padStart(2, '0')}-${kind}`);
const field = (state, value, sources, custodyPaths, note) => ({
  state,
  value,
  source_ids: [...sources],
  custody_paths: [...custodyPaths],
  note,
  fixed_protocol_complete: true,
  terminal_for_class_closure: true
});

function verifyInputs(root) {
  for (const [rel, expected] of Object.entries(INPUT_SHA256)) {
    const actual = sha256(readBytes(root, rel));
    ok(actual === expected, `${rel}: source bytes changed`);
  }
}

function sourceProduct(root) {
  const search = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-execution-receipt.json');
  const candidates = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-adjudication/index.json');
  const candidateFollowup = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/candidate-followup-execution-receipt.json');
  const sameHost = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/same-host-followup-execution-receipt.json');
  const disclosure = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/disclosure-leaf-execution-receipt.json');
  const replay = read(root, 'data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/manager-lineage-replay-execution-receipt.json');
  const sourceSummary = read(root, `${PRODUCT_ROOT}/manager-lineage-replay-summary.json`);
  const sourceManifest = read(root, `${PRODUCT_ROOT}/manager-lineage-replay-manifest.json`);
  ok(search.counts.fixed_routes === 51 && search.counts.terminal_routes === 51 && search.counts.unique_candidate_urls === 210, 'search census denominator changed');
  ok(candidates.counts.unique_candidate_urls === 210 && candidates.counts.fixed_followup_routes === 10, 'candidate adjudication denominator changed');
  ok(candidateFollowup.counts.fixed_followup_routes === 10 && candidateFollowup.counts.terminal_routes === 10 && candidateFollowup.counts.same_host_link_candidates === 11, 'candidate followup denominator changed');
  ok(sameHost.counts.fixed_routes === 5 && sameHost.counts.terminal_routes === 5 && sameHost.counts.same_host_link_candidates === 457, 'same-host denominator changed');
  ok(disclosure.counts.fixed_routes === 2 && disclosure.counts.terminal_routes === 2 && disclosure.counts.http_success_pdf_captured === 1 && disclosure.counts.pretransport_failures === 1, 'disclosure-leaf denominator changed');
  ok(replay.counts.fixed_replay_routes === 1 && replay.counts.terminal_replay_routes === 1 && replay.counts.http_success_pdf_captured === 1, 'manager-lineage replay denominator changed');
  ok(sourceSummary.counts.admitted_leaf_sources === 2 && sourceSummary.counts.admitted_bounded_observations === 11 && sourceSummary.counts.lifecycle_events_observed === 0, 'admitted source summary changed');
  ok(sourceManifest.entry_count === 3 && sourceManifest.combined_sha256 === 'e96286ac8b7863da128ec1183e018048582377aaa07edc1e7f303eda75509cff', 'source manifest changed');
  return {
    canonical_source_merge: CANONICAL_SOURCE_MERGE,
    input_sha256: INPUT_SHA256,
    parent_wave02_custody: {
      closure_path: PARENT_CLOSURE_PATH,
      class_receipt_path: PARENT_RECEIPT_PATH,
      terminal_matrix_path: PARENT_MATRIX_PATH,
      row_membership_reused_without_reopening_parent_class: true
    },
    acquisition: {
      search_census: {
        workflow_run: 30941752301,
        artifact_id: 8905467301,
        artifact_zip_sha256: '6842a094437246095ac69c51dc4813c5e21a6298a60e81648f136485c6fc318a',
        fixed_routes: 51,
        terminal_routes: 51,
        candidate_rows: 480,
        unique_candidate_urls: 210
      },
      candidate_adjudication: {
        terminal_candidate_urls: 210,
        fixed_followup_routes: 10,
        admitted_sources: 0,
        lifecycle_events_observed: 0
      },
      candidate_followups: {
        workflow_run: 30945963570,
        artifact_id: 8907118043,
        artifact_zip_sha256: '4a4a3317c032fca5db026614a7304d6f9d79c0dff30bb1d9e46876fa05149e9f',
        fixed_routes: 10,
        terminal_routes: 10,
        same_host_link_candidates: 11
      },
      same_host_followups: {
        workflow_run: 30949324081,
        artifact_id: 8908442108,
        artifact_zip_sha256: '5d4924bf616cf65f93430a570580e5144359bcc6acb0c55b33161d2563e58364',
        fixed_routes: 5,
        terminal_routes: 5,
        terminal_candidate_urls: 457,
        frozen_leaf_routes: 2
      },
      disclosure_leaves: {
        workflow_run: 30952281385,
        artifact_id: 8909616198,
        artifact_zip_sha256: '711296d8a951c60191abc9dba2301d37de6d9f40f9b51694374198d229ed23d5',
        fixed_routes: 2,
        terminal_routes: 2,
        captured_pdfs: 1,
        pretransport_failures: 1
      },
      manager_lineage_replay: {
        workflow_run: 30953678041,
        artifact_id: 8910162314,
        artifact_zip_sha256: 'ce479d1defb29c6fd07f7981730a8d11d5784d698fd51ead23f38bbed29c7cd7',
        fixed_routes: 1,
        terminal_routes: 1,
        captured_pdfs: 1
      },
      result_spawned_requests: 0,
      automatic_additional_search_pass_authorized: false
    },
    admitted_leaf_sources: [
      {
        source_id: sourceIds[0],
        path: SOURCE_2024_PATH,
        body_sha256: 'a5de66bc80db12ca7fc70de0bc41214cd3e0925c10d7139ede9ea6426fa3028d',
        bounded_observations: 7,
        lifecycle_events_observed: 0
      },
      {
        source_id: sourceIds[1],
        path: SOURCE_2021_PATH,
        body_sha256: '23fbef23cb77df6a6933bafd273b65ea034f14d10ff4ef40c05775a73fde67cf',
        bounded_observations: 4,
        lifecycle_events_observed: 0
      }
    ],
    source_manifest_path: `${PRODUCT_ROOT}/manager-lineage-replay-manifest.json`,
    source_manifest_combined_sha256: sourceManifest.combined_sha256
  };
}

function lifecycleNote(fieldName, row, restricted) {
  if (restricted) return `The eighteenth cohort identity remains withheld under policy, so no exact-name ${fieldName} acquisition was possible. This is source restriction, not nonparticipation or event absence.`;
  const shared = {
    publicly_identified_portfolio_investments: 'No vehicle-bound public portfolio-investment event was admitted after the complete fixed protocol. Program projections, manager-level portfolio history, commitments, and search candidates are not substituted.',
    publicly_identified_follow_on_investments: 'No vehicle-bound public follow-on investment event was admitted after the complete fixed protocol. A portfolio claim or initial commitment is not a follow-on.',
    publicly_identified_exits: 'No vehicle-bound public exit event was admitted after the complete fixed protocol. Acquisition language about a manager or parent is not a frozen-vehicle portfolio exit.',
    publicly_identified_write_offs_or_realized_losses: 'No vehicle-bound public write-off or realized-loss event was admitted after the complete fixed protocol. Missing public loss records are not encoded as zero loss.',
    publicly_identified_defaults_or_cures: 'No vehicle-bound public default or cure event was admitted after the complete fixed protocol. Public silence is not a no-default finding.',
    publicly_identified_realized_fund_returns: 'No vehicle-bound public realized-return event was admitted after the complete fixed protocol. Private capital commitments and manager history are not fund returns.',
    sba_guaranteed_leverage_repayment_or_loss_allocation: 'No vehicle-bound SBA-guaranteed leverage repayment, recovery, or loss-allocation event was admitted after the complete fixed protocol. License and leverage eligibility are not commitment, draw, repayment, or recovery.'
  };
  return shared[fieldName];
}

export function deriveProduct(root = ROOT) {
  verifyInputs(root);
  const matrix = read(root, MATRIX_PATH);
  const seed = read(root, SEED_PATH);
  const constitution = read(root, CONSTITUTION_PATH);
  const current = read(root, CURRENT_LEDGER_PATH);
  const parentClosure = read(root, PARENT_CLOSURE_PATH);
  const parentMatrix = read(root, PARENT_MATRIX_PATH);
  const source2024 = read(root, SOURCE_2024_PATH);
  const source2021 = read(root, SOURCE_2021_PATH);
  ok(matrix.class_id === CLASS_ID && matrix.issue === ISSUE && matrix.units.length === 18, 'matrix identity changed');
  same(matrix.required_fields, REQUIRED_FIELDS, 'required field order changed');
  ok(seed.closure_target === CLASS_LABEL && seed.class_closed === false, 'seed custody changed');
  const lane = constitution.lane_attempts.find((row) => row.class_id === CLASS_ID);
  ok(lane?.issue === ISSUE && lane?.exact_label === CLASS_LABEL, 'constitution lane changed');
  classifyCurrentLedgerCustody(current);
  ok(parentClosure.class_id === 'RD-02-C04' && parentClosure.class_closed === true && parentMatrix.rows.length === 18, 'parent row custody changed');
  ok(source2024.source_disposition.admitted_source === true && source2024.source_disposition.lifecycle_events_for_rd02_c05_observed === 0, '2024 source disposition changed');
  ok(source2021.source_disposition.admitted_source === true && source2021.source_disposition.lifecycle_events_for_rd02_c05_observed === 0, '2021 source disposition changed');

  const source_product = sourceProduct(root);
  const rows = matrix.units.map((unit) => {
    const restricted = unit.identity_state === 'identity_withheld_under_policy';
    const ordinal = unit.unit_ordinal;
    const rowSourceIds = ordinal === 15 ? sourceIds : [];
    const rowCustody = ordinal === 15 ? [SOURCE_2024_PATH, SOURCE_2021_PATH] : [];
    const identity = restricted
      ? field('identity_withheld_under_policy', {
          unit_id: unit.unit_id,
          withheld_state_label: unit.withheld_state_label,
          identity_publicly_disclosed: false
        }, [], [MATRIX_PATH, PARENT_MATRIX_PATH], 'The affirmative eighteenth denominator row is preserved with its exact withheld-state label; no identity is guessed or replaced.')
      : field('observed', {
          unit_id: unit.unit_id,
          legal_vehicle: unit.legal_vehicle,
          identity_publicly_disclosed: true,
          inherited_parent_row_ordinal: ordinal
        }, rowSourceIds, [MATRIX_PATH, PARENT_MATRIX_PATH, ...rowCustody], ordinal === 15
          ? 'The exact cohort legal-vehicle label is retained from immutable parent custody. Two Stifel sources corroborate public fund and manager lineage without printing the exact LP suffix or creating a lifecycle event.'
          : 'The exact legal-vehicle label is retained from the immutable eighteen-row parent denominator.');
    const fields = {
      canonical_cohort_row_and_legal_vehicle_or_withheld_state_label: identity
    };
    for (const fieldName of lifecycleFields) {
      fields[fieldName] = field(
        restricted ? 'source_restricted' : 'not_publicly_recovered',
        ordinal === 15 ? {
          admitted_non_lifecycle_source_ids: sourceIds,
          admitted_bounded_observations: 11,
          lifecycle_events_observed: 0
        } : null,
        rowSourceIds,
        pipelinePaths,
        lifecycleNote(fieldName, ordinal, restricted)
      );
    }
    fields.source_identities_and_exact_custody = field('observed', {
      source_product_ref: '#/source_product',
      unit_search_route_ids: routeIdsFor(ordinal),
      admitted_leaf_source_ids: rowSourceIds,
      result_spawned_requests: 0
    }, rowSourceIds, pipelinePaths, restricted
      ? 'Exact withheld-row and zero-route custody is retained alongside the complete global protocol; no identity-based request was manufactured.'
      : 'Exact source, route, artifact, adjudication, and manifest custody is retained without promoting search candidates or non-lifecycle observations.');
    const rowTerminalState = restricted ? 'bounded_source_restricted' : TERMINAL_STATE;
    fields.field_and_row_terminal_state = field('observed', {
      required_fields: 10,
      terminal_fields: 10,
      row_terminal_state: rowTerminalState,
      row_closed: true,
      class_terminal_state: TERMINAL_STATE
    }, rowSourceIds, [MATRIX_PATH, `${PRODUCT_ROOT}/manager-lineage-replay-summary.json`], 'All ten required fields are explicitly typed. Row closure records the fixed public-record boundary and does not assert event nonoccurrence.');
    same(Object.keys(fields), REQUIRED_FIELDS, `${ordinal}: field order changed`);
    const state_counts = Object.values(fields).reduce((acc, value) => {
      acc[value.state] = (acc[value.state] || 0) + 1;
      return acc;
    }, {});
    return {
      unit_ordinal: ordinal,
      unit_id: unit.unit_id,
      legal_vehicle: unit.legal_vehicle ?? null,
      withheld_state_label: unit.withheld_state_label ?? null,
      identity_state: unit.identity_state,
      fields,
      row_result: {
        fixed_protocol_executed: true,
        required_fields: 10,
        terminal_fields: 10,
        state_counts,
        lifecycle_events_observed: 0,
        row_terminal_state: rowTerminalState,
        row_closed: true
      }
    };
  });

  const flat = rows.flatMap((row) => Object.values(row.fields));
  const counts = {
    cohort_rows: 18,
    publicly_named_rows: 17,
    identity_withheld_rows: 1,
    required_fields_per_row: 10,
    required_fields: 180,
    observed_fields: flat.filter((value) => value.state === 'observed').length,
    identity_withheld_under_policy_fields: flat.filter((value) => value.state === 'identity_withheld_under_policy').length,
    source_restricted_fields: flat.filter((value) => value.state === 'source_restricted').length,
    not_publicly_recovered_fields: flat.filter((value) => value.state === 'not_publicly_recovered').length,
    terminal_fields: flat.length,
    bounded_source_unavailable_rows: rows.filter((row) => row.row_result.row_terminal_state === TERMINAL_STATE).length,
    bounded_source_restricted_rows: rows.filter((row) => row.row_result.row_terminal_state === 'bounded_source_restricted').length,
    search_routes: 51,
    unique_search_candidates: 210,
    candidate_followup_routes: 10,
    same_host_followup_routes: 5,
    disclosure_leaf_routes: 2,
    failed_route_replays: 1,
    admitted_leaf_sources: 2,
    admitted_bounded_observations: 11,
    lifecycle_events_observed: 0,
    publicly_identified_portfolio_investments_observed: 0,
    publicly_identified_follow_on_investments_observed: 0,
    publicly_identified_exits_observed: 0,
    publicly_identified_write_offs_or_realized_losses_observed: 0,
    publicly_identified_defaults_or_cures_observed: 0,
    publicly_identified_realized_fund_returns_observed: 0,
    sba_repayment_or_loss_allocation_events_observed: 0,
    result_spawned_requests: 0,
    external_contacts: 0,
    external_reviews: 0
  };
  same({ observed: counts.observed_fields, withheld: counts.identity_withheld_under_policy_fields, restricted: counts.source_restricted_fields, unrecovered: counts.not_publicly_recovered_fields, terminal: counts.terminal_fields }, { observed: 53, withheld: 1, restricted: 7, unrecovered: 119, terminal: 180 }, 'terminal state arithmetic changed');

  const current_result = {
    terminal_state: TERMINAL_STATE,
    fixed_protocol_complete: true,
    automatic_additional_search_pass_authorized: false,
    all_eighteen_rows_preserved: true,
    all_one_hundred_eighty_fields_terminal: true,
    complete_portfolio_lifecycle_ledger_observed: false,
    admitted_leaf_sources: 2,
    admitted_bounded_observations: 11,
    lifecycle_events_observed: 0,
    class_closed: true,
    capital_conversion_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    racial_order_finding: false,
    prevalence_finding: false,
    outside_human_dependency: false,
    project_blocking: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };
  const boundaries = {
    program_projection_is_fund_investment: false,
    private_capital_commitment_is_portfolio_investment: false,
    manager_lineage_is_vehicle_lifecycle: false,
    fund_investment_is_follow_on_or_exit: false,
    exit_is_positive_realized_return: false,
    missing_public_write_off_is_no_loss: false,
    missing_public_default_is_no_default: false,
    missing_public_return_is_zero_return: false,
    private_return_is_sba_repayment_or_public_recovery: false,
    license_or_leverage_eligibility_is_sba_repayment: false,
    search_candidate_is_admitted_source: false,
    search_silence_is_event_absence: false,
    not_publicly_recovered_is_event_nonoccurrence: false,
    source_restricted_is_nonparticipation: false,
    withheld_identity_is_nonparticipation: false,
    class_closure_is_complete_compact: false,
    capital_conversion_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    racial_order_finding: false,
    prevalence_finding: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };
  const authority = {
    outside_human_dependency: false,
    external_contacts: 0,
    external_reviews: 0,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    capital_conversion_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    racial_order_finding: false,
    prevalence_finding: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  };

  const terminal = {
    schema_version: 'ssc-rd-wave03-rd02-portfolio-lifecycle-terminal-matrix@1',
    wave_id: WAVE_ID,
    lane_id: LANE_ID,
    class_id: CLASS_ID,
    issue: ISSUE,
    as_of: '2026-08-04',
    class_label: CLASS_LABEL,
    status: 'eighteen_row_portfolio_lifecycle_terminal_bounded_source_unavailable',
    required_fields: REQUIRED_FIELDS,
    source_product,
    rows,
    counts,
    current_result,
    boundaries
  };
  const receipt = {
    schema_version: 'ssc-rd-wave03-rd02-portfolio-lifecycle-class-receipt@1',
    wave_id: WAVE_ID,
    lane_id: LANE_ID,
    class_id: CLASS_ID,
    issue: ISSUE,
    class_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    label_custody: {
      constitutional_class_label: CLASS_LABEL,
      seed_closure_target: seed.closure_target,
      labels_exact_match: true,
      reconciliation: 'none'
    },
    counts,
    residual_atlas_effect_if_promoted: {
      canonical_classes: 42,
      open_before: 34,
      closed_before: 8,
      open_after: 33,
      closed_after: 9
    },
    current_result,
    boundaries,
    authority
  };
  const summary = {
    schema_version: 'ssc-rd-wave03-rd02-portfolio-lifecycle-summary@1',
    wave_id: WAVE_ID,
    lane_id: LANE_ID,
    class_id: CLASS_ID,
    issue: ISSUE,
    class_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    counts,
    current_result,
    boundaries,
    authority
  };
  const productFiles = [
    ['class-receipt.json', encode(receipt)],
    ['summary.json', encode(summary)],
    ['terminal-field-matrix.json', encode(terminal)]
  ];
  const entries = productFiles.map(([rel, bytes]) => ({ path: rel, bytes: bytes.length, sha256: sha256(bytes) }));
  const combined_sha256 = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''), 'utf8'));
  const manifest = {
    schema_version: 'ssc-rd-wave03-rd02-portfolio-lifecycle-manifest@1',
    entries,
    combined_sha256
  };
  const closure = {
    schema_version: 'ssc-residual-denominator-wave03-class-closure-reference@1',
    wave_issue: 1013,
    child_issue: ISSUE,
    source_pr: SOURCE_PR,
    class_id: CLASS_ID,
    lane_id: LANE_ID,
    exact_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    label_custody: receipt.label_custody,
    residual_atlas_effect_if_promoted: receipt.residual_atlas_effect_if_promoted,
    product: {
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      terminal_field_matrix_path: `${PRODUCT_ROOT}/terminal-field-matrix.json`,
      summary_path: `${PRODUCT_ROOT}/summary.json`,
      manifest_path: `${PRODUCT_ROOT}/manifest.json`,
      manifest_combined_sha256: combined_sha256
    },
    source_custody: {
      canonical_source_merge: CANONICAL_SOURCE_MERGE,
      admitted_leaf_sources: 2,
      admitted_bounded_observations: 11,
      lifecycle_events_observed: 0,
      fixed_protocol_complete: true,
      automatic_additional_search_pass_authorized: false
    },
    authority
  };
  return { terminal, receipt, summary, manifest, closure, productFiles };
}

export function writeProduct(root = ROOT) {
  const product = deriveProduct(root);
  fs.mkdirSync(abs(root, PRODUCT_ROOT), { recursive: true });
  fs.mkdirSync(path.dirname(abs(root, CLOSURE_PATH)), { recursive: true });
  fs.writeFileSync(abs(root, `${PRODUCT_ROOT}/terminal-field-matrix.json`), encode(product.terminal));
  fs.writeFileSync(abs(root, `${PRODUCT_ROOT}/class-receipt.json`), encode(product.receipt));
  fs.writeFileSync(abs(root, `${PRODUCT_ROOT}/summary.json`), encode(product.summary));
  fs.writeFileSync(abs(root, `${PRODUCT_ROOT}/manifest.json`), encode(product.manifest));
  fs.writeFileSync(abs(root, CLOSURE_PATH), encode(product.closure));
  return product;
}

export function checkProduct(root = ROOT) {
  const product = deriveProduct(root);
  const expected = new Map([
    [`${PRODUCT_ROOT}/terminal-field-matrix.json`, encode(product.terminal)],
    [`${PRODUCT_ROOT}/class-receipt.json`, encode(product.receipt)],
    [`${PRODUCT_ROOT}/summary.json`, encode(product.summary)],
    [`${PRODUCT_ROOT}/manifest.json`, encode(product.manifest)],
    [CLOSURE_PATH, encode(product.closure)]
  ]);
  for (const [rel, bytes] of expected) {
    ok(fs.existsSync(abs(root, rel)), `${rel}: missing`);
    ok(readBytes(root, rel).equals(bytes), `${rel}: differs from deterministic derivation`);
  }
  return product;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes('--write');
  const product = write ? writeProduct(ROOT) : checkProduct(ROOT);
  console.log(`RD-02 Wave-03 portfolio lifecycle: ${product.terminal.counts.terminal_fields}/180 terminal; ${product.terminal.counts.lifecycle_events_observed} lifecycle events; ${product.terminal.current_result.terminal_state}`);
}
