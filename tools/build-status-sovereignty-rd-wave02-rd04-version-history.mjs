#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave02-rd04-version-history';
export const EXECUTION_RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd04-version-history/terminal-chronology-execution-receipt.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const WAVE01_PATH = 'data/research/status-sovereignty-residual-denominator-wave-01.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-04-C01.json';
export const CLOSURE_REFERENCE_PATH = 'data/project/ssc-residual-wave02/closures/RD-04-C01.json';
export const WAVE02_PROGRESS_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-progress.json';
export const PROVENANCE_INDEX_PATH = 'data/intake/status-sovereignty-rd-wave02-rd04-version-history/provenance-index.json';

const PRODUCT_INPUTS = Object.freeze([
  'instrument-date-ledger.json',
  'operative-interval-ledger.json',
  'relationship-edge-ledger.json',
  'source-gap-ledger.json'
]);


const PROVENANCE_RECEIPTS = Object.freeze([
  ['authority-unit-receipt.json', '9740d0aae59c8a5cb9f4f839e14b4fb0f1d0d12b', 'authority_unit_denominator'],
  ['chronology-context-execution-receipt.json', '3c6b555ceeb7e403433a2c22c18c720ceee3a9f6', 'chronology_context_denominator'],
  ['context-adjudication-execution-receipt.json', 'd3859358349a7bf6db8f9c5743497b1380e9128b', 'candidate_adjudication'],
  ['cross-reference-parser-repair.json', 'f4fad3aa3e5028d1f8c1fed77cbf41d3e5176ef1', 'parser_repair'],
  ['cross-reference-receipt-v1.json', '5b428c0aab76da284b80738995617b3317943fe8', 'underinclusive_parser_receipt'],
  ['cross-reference-receipt-v3.json', 'cb7b7cb3a0ef7c503645b19ef1e43139935dd943', 'corrected_parser_receipt'],
  ['cross-reference-receipt.json', 'e324c0666aecad8f18347976119018f2a4a907ff', 'page_scoped_parser_receipt'],
  ['ecfr-antibot-receipt.json', '75c149f84322c4f5c3303e8a04845a18d29b4895', 'anti_bot_adjudication'],
  ['ecfr-api-correction-execution-receipt.json', 'ebd9e9c854436fc2b8ec37fddbc5370bafbd5fcc', 'ecfr_source_correction'],
  ['predecessor-source-execution-receipt.json', 'e01396adf92f78883af5f9c39da8e20755d057c2', 'bounded_predecessor_source_gap'],
  ['seed-capture-receipt.json', 'ae33a484d278530339797fee2dc454cf4781932f', 'seed_capture'],
  ['seed-universe.json', 'c4e4a0e784b060c8ddfaf0dd8db13d8e24f32c63', 'seed_source_universe'],
  ['source-capture-receipt-v1.json', '79813f30d5e78db167a5c99af798b1fc8559e564', 'initial_source_capture'],
  ['source-capture-receipt.json', 'af1aea341147e214c8edf359574f82e4eb9b9b17', 'corrected_source_capture'],
  ['source-identity-execution-receipt.json', '696f651a0ea92937f4541d04a425ef776be1004c', 'source_identity_census'],
  ['source-route-correction-receipt.json', '73161c77a62256f2d4d40b5d0cd13de764fd4e0f', 'historical_route_correction'],
  ['supplemental-acl-execution-receipt.json', 'ac57757dca3103766b8b52085df13d1467a3a9c2', 'three_digit_acl_repair'],
  ['terminal-chronology-execution-receipt.json', 'ab40c663dd8a8028f74f77190515b024662de151', 'terminal_chronology_closure']
]);

const CLASS_LABEL = 'current statutory, regulatory, and guidance version history after the 2025 law';
const CLOSURE_BASIS = Object.freeze([
  'immutable candidate and source-unit denominators are terminal',
  'all 683 relationship, interval, and second-order candidates are terminally classified',
  'all eight relationship event groups and six operative-interval event groups are terminal',
  'the only two predecessor source identities exhausted their predeclared official route and remain bounded unavailable',
  'the source gaps are preserved rather than converted into absent instruments, noncompliance, or erased edges'
]);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const writeJson = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

function readInputs(root) {
  const receipt = readJson(root, EXECUTION_RECEIPT_PATH);
  const constitution = readJson(root, CONSTITUTION_PATH);
  const wave01 = readJson(root, WAVE01_PATH);
  const seed = readJson(root, SEED_PATH);
  const product = Object.fromEntries(PRODUCT_INPUTS.map((name) => [name, readJson(root, `${PRODUCT_ROOT}/${name}`)]));
  return { receipt, constitution, wave01, seed, product };
}

export function validateInputs({ receipt, constitution, wave01, seed, product }) {
  ok(receipt?.schema_version === 'ssc-rd-wave02-rd04-terminal-chronology-execution-receipt@1', 'terminal execution receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W02' && receipt?.lane_id === 'RD-04' && receipt?.class_id === 'RD-04-C01', 'terminal execution identity changed');
  ok(receipt?.issue === 789 && receipt?.as_of === '2026-08-02', 'terminal issue or cutoff changed');
  ok(receipt?.execution?.workflow_run === 30789080350 && receipt?.execution?.artifact_id === 8846348281, 'terminal hosted custody changed');
  ok(receipt?.execution?.artifact_zip_sha256 === 'bb23c4b9be34f280f1dfba852a7002d827a6070be6f082a06988127e2a07e291', 'terminal artifact digest changed');
  ok(receipt?.execution?.manifest_combined_sha256 === 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b', 'terminal manifest digest changed');
  ok(receipt?.current_result?.terminal_state === 'bounded_source_unavailable' && receipt?.current_result?.class_closed === true, 'terminal class state changed');
  ok(receipt?.current_result?.residual_atlas_open_after_promotion === 41 && receipt?.current_result?.residual_atlas_closed_after_promotion === 1, 'terminal atlas effect changed');

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-02-constitution@1', 'Wave 02 constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W02' && constitution?.issue === 785, 'Wave 02 constitution identity changed');
  ok(constitution?.parent_custody?.canonical_residual_classes === 42, 'canonical residual denominator changed');
  ok(Array.isArray(constitution?.lane_attempts) && constitution.lane_attempts.length === 6, 'six Wave 02 attempts required');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-04-C01');
  ok(attempt?.lane_id === 'RD-04' && attempt?.issue === 789, 'RD-04 constitution binding changed');
  ok(attempt?.exact_label === CLASS_LABEL, 'RD-04 class label changed');

  ok(wave01?.schema_version === 'status-sovereignty-residual-denominator-wave-01@1', 'Wave 01 registry schema changed');
  ok(wave01?.counts?.canonical_residual_classes === 42, 'Wave 01 denominator changed');
  ok(wave01?.counts?.closed_residual_classes === 0 && wave01?.counts?.open_residual_classes === 42, 'Wave 01 historical state changed');

  ok(seed?.schema_version === 'ssc-residual-denominator-wave02-lane-seed-reference@1', 'RD-04 seed schema changed');
  ok(seed?.wave_issue === 785 && seed?.child_issue === 789 && seed?.class_id === 'RD-04-C01', 'RD-04 seed identity changed');
  ok(seed?.input_manifest?.entry_count === 1349, 'RD-04 seed input denominator changed');
  ok(seed?.input_manifest?.combined_sha256 === '0cfc6385687780db6c594f086a9ea2a0da81ba004bf6487afd5614f2f2fbb147', 'RD-04 seed input digest changed');

  const relation = product['relationship-edge-ledger.json'];
  ok(relation?.schema_version === 'ssc-rd-wave02-rd04-terminal-relationship-ledger@1', 'relationship ledger schema changed');
  ok(Array.isArray(relation?.events) && relation.events.length === 8, 'eight relationship event groups required');
  unique(relation.events.map((row) => row.event_id), 'duplicate relationship event id');
  ok(relation.events.filter((row) => row.version_edge_observed === true).length === 7, 'seven version-edge groups required');
  ok(relation.events.filter((row) => row.version_edge_observed === false).length === 1, 'one non-edge temporal group required');
  ok(relation.events.every((row) => row.relationship_adjudicated === true && row.edge_direction_adjudicated === true && row.version_edge_adjudicated === true), 'relationship adjudication incomplete');
  ok(relation.events.every((row) => row.implementation_observed === false && row.class_effect === 'none'), 'relationship authority escalated');
  const handbookV2 = relation.events.find((row) => row.event_id === 'RD04-EVT-HANDBOOK-V2-SUPERSEDES-V1');
  same(handbookV2?.source_gap_unit_ids, ['AUTH-CA-ACL-18-08', 'AUTH-CA-ABAWD-HANDBOOK-1.0'], 'bounded predecessor edge changed');
  const partial = relation.events.find((row) => row.event_id === 'RD04-EVT-ACL-26-43-VUR-PARTIAL-SUPERSESSION');
  ok(partial?.relation_type === 'partial_supersession' && partial?.terminal_state === 'explicit_partial_list_supersession_not_total_document_supersession', 'partial supersession scope changed');
  const compilation = relation.events.find((row) => row.event_id === 'RD04-EVT-FNA-CURRENT-THROUGH-PL119-21');
  ok(compilation?.version_edge_observed === false && compilation?.relation_type === 'compilation_currency', 'compilation currency promoted to edge');

  const intervals = product['operative-interval-ledger.json'];
  ok(intervals?.schema_version === 'ssc-rd-wave02-rd04-terminal-interval-ledger@1', 'interval ledger schema changed');
  ok(Array.isArray(intervals?.events) && intervals.events.length === 6, 'six interval event groups required');
  unique(intervals.events.map((row) => row.event_id), 'duplicate interval event id');
  const intervalRecords = intervals.events.reduce((sum, row) => sum + (Array.isArray(row.interval_records) ? row.interval_records.length : 0), 0);
  ok(intervalRecords === 7, 'seven operative interval records required');
  ok(intervals.events.every((row) => row.operative_interval_adjudicated === true && row.version_edge_adjudicated === true), 'interval adjudication incomplete');
  ok(intervals.events.every((row) => row.implementation_observed === false && row.class_effect === 'none'), 'interval authority escalated');

  const gaps = product['source-gap-ledger.json'];
  ok(gaps?.schema_version === 'ssc-rd-wave02-rd04-terminal-source-gap-ledger@1', 'source-gap ledger schema changed');
  ok(Array.isArray(gaps?.source_gaps) && gaps.source_gaps.length === 2, 'two bounded source gaps required');
  same(gaps.source_gaps.map((row) => row.execution_unit_id), ['AUTH-CA-ABAWD-HANDBOOK-1.0', 'AUTH-CA-ACL-18-08'], 'bounded source-gap identities changed');
  ok(gaps.source_gaps.every((row) => row.source_identity_state === 'source_unavailable_after_bounded_retry'), 'source-gap state changed');
  ok(gaps.source_gaps.every((row) => row.bounded_attempts === 2 && JSON.stringify(row.http_statuses) === '[404,404]' && JSON.stringify(row.body_bytes) === '[0,0]'), 'bounded retry custody changed');
  ok(gaps.source_gaps.every((row) => row.source_identity_adjudicated === true && row.exact_source_identity_observed === false), 'source identity state changed');
  ok(gaps.source_gaps.every((row) => row.record_absence_inferred === false && row.noncompliance_inferred === false && row.version_edge_erased === false), 'source gap laundered into substantive claim');

  const dates = product['instrument-date-ledger.json'];
  ok(dates?.schema_version === 'ssc-rd-wave02-rd04-instrument-date-ledger@1', 'instrument-date ledger schema changed');
  ok(Object.keys(dates?.exact_seed_dates || {}).length === 14, 'fourteen seed dates required');
  ok(dates?.boundary === 'publication_date_is_not_implementation_and_null_effective_date_is_preserved', 'date boundary changed');

  const counts = receipt.counts;
  ok(counts?.relationship_event_groups === relation.events.length && counts?.version_edge_event_groups === 7 && counts?.non_edge_temporal_state_groups === 1, 'relationship count binding changed');
  ok(counts?.operative_interval_event_groups === intervals.events.length && counts?.operative_interval_records === intervalRecords, 'interval count binding changed');
  ok(counts?.bounded_source_unavailable_identities === gaps.source_gaps.length, 'source-gap count binding changed');
  ok(counts?.candidate_records_total === 683 && counts?.candidate_records_terminal === 683 && counts?.unresolved_instruments_or_edges === 0, 'candidate terminality changed');
  return { attempt, intervalRecords };
}

export function deriveProduct(root = ROOT) {
  const inputs = readInputs(root);
  validateInputs(inputs);
  const { receipt, constitution, seed, product } = inputs;
  const gaps = product['source-gap-ledger.json'].source_gaps;

  const classReceipt = {
    schema_version: 'ssc-rd-wave02-rd04-class-receipt@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    class_label: CLASS_LABEL,
    terminal_state: 'bounded_source_unavailable',
    class_closed: true,
    closure_basis: [...CLOSURE_BASIS],
    bounded_source_gaps: gaps.map((row) => row.execution_unit_id),
    residual_atlas_effect_if_promoted: {
      canonical_classes_before: 42,
      open_before: 42,
      closed_before: 0,
      open_after: receipt.current_result.residual_atlas_open_after_promotion,
      closed_after: receipt.current_result.residual_atlas_closed_after_promotion
    },
    counts: receipt.counts,
    authority: receipt.authority
  };

  const summary = {
    schema_version: 'ssc-rd-wave02-rd04-terminal-chronology@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    counts: receipt.counts,
    current_result: {
      terminal_state: receipt.current_result.terminal_state,
      candidate_universe_frozen: receipt.current_result.candidate_universe_frozen,
      source_identity_adjudication_complete: receipt.current_result.source_identity_adjudication_complete,
      relationship_event_adjudication_complete: receipt.current_result.relationship_event_adjudication_complete,
      operative_interval_adjudication_complete: receipt.current_result.operative_interval_adjudication_complete,
      second_order_reference_triage_complete: receipt.current_result.second_order_reference_triage_complete,
      version_edge_adjudication_complete: receipt.current_result.version_edge_adjudication_complete,
      class_closed: receipt.current_result.class_closed,
      outside_human_dependency: receipt.current_result.outside_human_dependency,
      project_blocking: receipt.current_result.project_blocking,
      graph_effect: receipt.current_result.graph_effect,
      publication_effect: receipt.current_result.publication_effect,
      adoption_effect: receipt.current_result.adoption_effect
    },
    boundaries: receipt.authority
  };

  const closureReference = {
    schema_version: 'ssc-residual-denominator-wave02-class-closure-reference@1',
    wave_issue: 785,
    child_issue: 789,
    source_pr: 804,
    class_id: 'RD-04-C01',
    lane_id: 'RD-04',
    source_branch: 'agent/ssc-rd-wave02-rd04-version-history',
    constitution: {
      merge_commit: '69c06a2cc552a09588b2657e247b301468ccae87',
      path: CONSTITUTION_PATH
    },
    seed: {
      path: SEED_PATH,
      frozen_execution_base: seed.frozen_execution_base,
      canonical_input_surfaces: seed.input_manifest.entry_count,
      input_manifest_sha256: seed.input_manifest.combined_sha256
    },
    product: {
      root: PRODUCT_ROOT,
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      summary_path: `${PRODUCT_ROOT}/summary.json`,
      manifest_path: `${PRODUCT_ROOT}/manifest.json`,
      manifest_combined_sha256: receipt.execution.manifest_combined_sha256
    },
    terminal_execution: {
      receipt_path: EXECUTION_RECEIPT_PATH,
      provenance_index_path: PROVENANCE_INDEX_PATH,
      workflow_run: receipt.execution.workflow_run,
      artifact_id: receipt.execution.artifact_id,
      artifact_zip_sha256: receipt.execution.artifact_zip_sha256
    },
    terminal_state: classReceipt.terminal_state,
    class_closed: true,
    residual_atlas_effect: classReceipt.residual_atlas_effect_if_promoted,
    authority: classReceipt.authority
  };

  const unpromoted = constitution.lane_attempts
    .filter((row) => row.class_id !== 'RD-04-C01')
    .map((row) => ({
      lane_id: row.lane_id,
      class_id: row.class_id,
      issue: row.issue,
      exact_label: row.exact_label,
      state_in_this_progress_object: 'not_adjudicated_by_rd04_receipt',
      class_closed_by_this_progress_object: false
    }));

  const progress = {
    schema_version: 'status-sovereignty-residual-denominator-wave-02-progress@1',
    wave_id: 'SSC-RD-W02',
    hypothesis_id: 'SSC-H01',
    issue: 785,
    as_of: '2026-08-02',
    authority: 'one_terminal_class_receipt_promoted_without_cross_lane_empirical_authority',
    parent_custody: {
      constitution_path: CONSTITUTION_PATH,
      constitution_issue: 785,
      wave_01_registry_path: WAVE01_PATH,
      canonical_residual_classes: 42,
      open_before: 42,
      closed_before: 0
    },
    promoted_class_receipts: [{
      lane_id: 'RD-04',
      class_id: 'RD-04-C01',
      issue: 789,
      source_pr: 804,
      exact_label: CLASS_LABEL,
      terminal_state: classReceipt.terminal_state,
      class_closed: true,
      closure_reference_path: CLOSURE_REFERENCE_PATH,
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      manifest_combined_sha256: receipt.execution.manifest_combined_sha256
    }],
    selected_classes_not_adjudicated_by_this_receipt: unpromoted,
    counts: {
      execution_lanes: 6,
      selected_class_attempts: 6,
      promoted_terminal_class_receipts: 1,
      classes_closed_this_wave: 1,
      closed_residual_classes: 1,
      open_residual_classes: 41,
      outside_human_dependencies: 0,
      external_contacts: 0,
      external_reviews: 0,
      reviewed_disposition_changes: 0,
      complete_compact_findings: 0,
      racial_order_findings: 0,
      prevalence_findings: 0,
      coordination_findings: 0,
      common_purpose_findings: 0,
      graph_effects: 0,
      publication_effects: 0,
      adoption_effects: 0
    },
    current_result: {
      terminal_state: 'one_of_forty_two_residual_classes_closed_five_selected_attempts_unadjudicated_here',
      classes_closed: 1,
      classes_open: 41,
      rd04_class_closed: true,
      all_six_selected_classes_closed: false,
      wave_complete: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      one_class_closure_closes_lane: false,
      one_class_closure_closes_wave: false,
      source_unavailability_is_event_absence: false,
      source_unavailability_is_noncompliance: false,
      publication_is_observed_implementation: false,
      california_chronology_is_national_prevalence: false,
      class_closure_is_complete_compact: false,
      functional_convergence_is_coordination_or_common_purpose: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };

  return { classReceipt, summary, closureReference, progress };
}

export function buildProduct(root = ROOT) {
  const derived = deriveProduct(root);
  writeJson(root, `${PRODUCT_ROOT}/class-receipt.json`, derived.classReceipt);
  writeJson(root, `${PRODUCT_ROOT}/summary.json`, derived.summary);

  const manifestEntries = fs.readdirSync(abs(root, PRODUCT_ROOT))
    .filter((name) => name !== 'manifest.json')
    .sort()
    .map((name) => {
      const bytes = readBytes(root, `${PRODUCT_ROOT}/${name}`);
      return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
    });
  const combined = sha256(Buffer.from(manifestEntries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'));
  const manifest = {
    schema_version: 'ssc-rd-wave02-rd04-terminal-chronology-manifest@1',
    entries: manifestEntries,
    combined_sha256: combined
  };
  writeJson(root, `${PRODUCT_ROOT}/manifest.json`, manifest);
  const provenanceIndex = {
    schema_version: 'ssc-rd-wave02-rd04-provenance-index@1',
    branch: 'agent/ssc-rd-wave02-rd04-version-history',
    receipt_root: 'data/intake/status-sovereignty-rd-wave02-rd04-version-history',
    receipts: PROVENANCE_RECEIPTS.map(([name, git_blob_sha, custody_role]) => ({
      path: `data/intake/status-sovereignty-rd-wave02-rd04-version-history/${name}`,
      git_blob_sha,
      custody_role
    })),
    seed: {
      path: SEED_PATH,
      git_blob_sha: 'da55972dafee4417b9e492e64b4cd86633ee9396',
      custody_role: 'canonical_lane_seed'
    },
    temporary_workflows_retained: 0,
    transport_carriers_retained: 0
  };
  writeJson(root, PROVENANCE_INDEX_PATH, provenanceIndex);
  writeJson(root, CLOSURE_REFERENCE_PATH, derived.closureReference);
  writeJson(root, WAVE02_PROGRESS_PATH, derived.progress);

  ok(combined === 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b', 'terminal product manifest drifted');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/class-receipt.json`)) === '6897518575cecddc88b60f3b7416f18fe75bb5c48238de952010ddcf0acfdef3', 'class receipt drifted');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/summary.json`)) === '91730b5969a2658c6c5153aef2dc714a516269a7caf5c9a788410ab4b6dd8963', 'summary drifted');
  console.log('build-status-sovereignty-rd-wave02-rd04-version-history: 7 terminal products, 1 class closure, atlas 41 open / 1 closed');
  return { ...derived, manifest, provenanceIndex };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    buildProduct();
  } catch (error) {
    console.error(`build-status-sovereignty-rd-wave02-rd04-version-history: ${error.message}`);
    process.exit(1);
  }
}
