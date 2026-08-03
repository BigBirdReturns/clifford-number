#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave02-rd06-offeror-universe/field-matrix.json';
export const PARENT_PATH = 'data/intake/status-sovereignty-rd06-dcgsa-support-exit.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-06-C01.json';
export const CONSTITUTION_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-constitution.json';
export const EXECUTION_RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd06-offeror-universe/public-record-census-execution-receipt.json';
export const CENSUS_ROOT = 'data/intake/status-sovereignty-rd-wave02-rd06-offeror-universe/source-custody/public-record-census-v1';
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave02-rd06-offeror-universe';
export const CLOSURE_REFERENCE_PATH = 'data/project/ssc-residual-wave02/closures/RD-06-C01.json';
export const CURRENT_LEDGER_PATH = 'data/research/status-sovereignty-residual-denominator-wave-02-current.json';

export const CLASS_LABEL = 'complete bidder, offeror, architecture, subcontractor, withdrawal, and nonresponsive universe';
export const TERMINAL_STATE = 'bounded_source_restricted';
export const CENSUS_MANIFEST_SHA256 = 'ad9f4275277e3d434f2bc772f3a2cfef01529ed6e747f3e18abc7e556c865ba6';
export const CENSUS_ARTIFACT_SHA256 = 'ecc0825cee7baa3eab942e670b11b898b2aa991c738a117a5900ff65289f111f';
export const MATRIX_BLOB_SHA = '4f0b53fc121633b86ae4dcc85ae1ed0e1c62f390';
export const RESEARCH_HEAD = '54854462decbf3b93ab9dd36a35fd4da00981081';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const writeJson = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const clone = (value) => structuredClone(value);

function readInputs(root) {
  return {
    matrix: readJson(root, MATRIX_PATH),
    parent: readJson(root, PARENT_PATH),
    seed: readJson(root, SEED_PATH),
    constitution: readJson(root, CONSTITUTION_PATH),
    execution: readJson(root, EXECUTION_RECEIPT_PATH),
    censusSummary: readJson(root, `${CENSUS_ROOT}/summary.json`),
    censusManifest: readJson(root, `${CENSUS_ROOT}/manifest.json`),
    restriction: readJson(root, `${CENSUS_ROOT}/restriction-ledger.json`),
    candidates: readJson(root, `${CENSUS_ROOT}/candidate-index.json`),
    officialCandidates: readJson(root, `${CENSUS_ROOT}/official-candidate-urls.json`),
    slotLedger: readJson(root, `${CENSUS_ROOT}/slot-terminal-ledger.json`)
  };
}

function validateInputs(inputs) {
  const { matrix, parent, seed, constitution, execution, censusSummary, censusManifest, restriction, candidates, officialCandidates, slotLedger } = inputs;

  ok(matrix?.schema_version === 'ssc-rd-wave02-rd06-offeror-universe-field-matrix@1', 'parent matrix schema changed');
  ok(matrix?.wave_id === 'SSC-RD-W02' && matrix?.class_id === 'RD-06-C01' && matrix?.issue === 791, 'parent matrix identity changed');
  ok(matrix?.denominator_contract?.proposal_slots === 8, 'eight-slot denominator changed');
  ok(matrix?.denominator_contract?.publicly_named_offerors === 3 && matrix?.denominator_contract?.unresolved_offeror_identities === 5, 'named/unresolved denominator changed');
  ok(Array.isArray(matrix?.slots) && matrix.slots.length === 8, 'eight matrix slots required');
  same(matrix.slots.map((row) => row.slot_id), [
    'CD1-PROP-NAMED-RAYTHEON',
    'CD1-PROP-NAMED-PALANTIR',
    'CD1-PROP-NAMED-GENERAL-DYNAMICS',
    'CD1-PROP-UNRESOLVED-01',
    'CD1-PROP-UNRESOLVED-02',
    'CD1-PROP-UNRESOLVED-03',
    'CD1-PROP-UNRESOLVED-04',
    'CD1-PROP-UNRESOLVED-05'
  ], 'slot identities changed');
  ok(matrix?.counts?.proposal_slots === 8 && matrix?.counts?.publicly_named_offerors === 3 && matrix?.counts?.unresolved_offeror_identities === 5, 'parent matrix counts changed');
  ok(matrix?.current_result?.class_closed === false && matrix?.current_result?.fixed_protocol_complete === false, 'parent matrix historical state changed');

  ok(parent?.schema_version === 'status-sovereignty-residual-execution@1' && parent?.execution_id === 'SSC-RD06-DCGSA-01', 'parent execution identity changed');
  ok(parent?.recovered_denominators?.later_procurement_proposals_received === 8, 'parent eight-proposal denominator changed');
  ok(parent?.recovered_denominators?.publicly_named_offerors === 3 && parent?.recovered_denominators?.publicly_unresolved_offeror_identities === 5, 'parent public identity denominator changed');
  ok(parent?.recovered_denominators?.awardees === 2 && parent?.recovered_denominators?.named_rejected_offerors === 1, 'parent award/rejection denominator changed');
  const s004 = parent.sources.find((row) => row.source_id === 'SSC-RD06-S004');
  ok(s004?.source_class === 'official_later_competition_evaluation_and_protest_decision', 'S004 source class changed');
  ok(s004?.supports?.some((value) => value.includes('received eight proposals')), 'S004 no longer supports eight proposals');
  ok(s004?.does_not_support?.includes('the identities or dispositions of all eight offerors'), 'S004 public-record limitation changed');

  ok(seed?.schema_version === 'ssc-residual-denominator-wave02-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_issue === 785 && seed?.child_issue === 791 && seed?.class_id === 'RD-06-C01', 'seed identity changed');
  ok(seed?.closure_target === CLASS_LABEL, 'seed closure target changed');

  ok(constitution?.schema_version === 'status-sovereignty-residual-denominator-wave-02-constitution@1', 'constitution schema changed');
  ok(constitution?.wave_id === 'SSC-RD-W02' && constitution?.issue === 785, 'constitution identity changed');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-06-C01');
  ok(attempt?.lane_id === 'RD-06' && attempt?.issue === 791 && attempt?.exact_label === CLASS_LABEL, 'constitution RD-06 binding changed');

  ok(execution?.schema_version === 'ssc-rd06-wave02-public-record-census-execution-receipt@1', 'execution receipt schema changed');
  ok(execution?.wave_id === 'SSC-RD-W02' && execution?.class_id === 'RD-06-C01' && execution?.issue === 791, 'execution receipt identity changed');
  ok(execution?.research_head === RESEARCH_HEAD, 'execution research head changed');
  ok(execution?.workflow_run === 30841600477 && execution?.job_id === 91779721380 && execution?.artifact_id === 8866994583, 'execution run custody changed');
  ok(execution?.artifact_zip_sha256 === CENSUS_ARTIFACT_SHA256, 'execution artifact digest changed');
  ok(execution?.manifest_entry_count === 329 && execution?.manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'execution manifest custody changed');
  ok(execution?.first_attempt?.workflow_run === 30841458045 && execution?.first_attempt?.state === 'failed_after_capture_before_artifact_missing_pdftotext', 'first-attempt receipt changed');
  ok(execution?.first_attempt?.artifact_created === false && execution?.first_attempt?.research_branch_changed === false, 'first attempt acquired authority');
  ok(execution?.counts?.fixed_routes === 40 && execution?.counts?.route_attempts === 40, 'execution route denominator changed');
  ok(execution?.counts?.http_success === 37 && execution?.counts?.terminal_non_success === 3, 'execution transport counts changed');
  ok(execution?.counts?.candidate_result_rows === 280 && execution?.counts?.official_candidate_urls === 4, 'execution candidate counts changed');
  ok(execution?.counts?.result_spawned_requests === 0, 'result-spawned request appeared');

  ok(censusSummary?.schema_version === 'ssc-rd06-wave02-public-record-census-summary@1', 'census summary schema changed');
  ok(censusSummary?.research_head === RESEARCH_HEAD && censusSummary?.fixed_routes === 40, 'census summary identity changed');
  ok(censusSummary?.exact_get_routes === 10 && censusSummary?.bing_rss_routes === 30 && censusSummary?.route_attempts === 40, 'census route accounting changed');
  ok(censusSummary?.terminal_transport_states?.http_success === 37 && censusSummary?.terminal_transport_states?.http_terminal_non_success === 3, 'census transport states changed');
  ok(censusSummary?.candidate_rows === 280 && censusSummary?.official_candidate_urls === 4, 'census candidate accounting changed');
  ok(censusSummary?.result_spawned_requests === 0 && censusSummary?.transport_census_complete === true, 'census completion changed');
  ok(censusSummary?.substantive_adjudication_complete === false && censusSummary?.class_closed === false, 'transport census promoted itself');

  ok(censusManifest?.schema_version === 'ssc-rd06-wave02-public-record-census-manifest@1', 'census manifest schema changed');
  ok(censusManifest?.entry_count === 329 && censusManifest?.entries?.length === 329, 'census manifest entry denominator changed');
  ok(censusManifest?.combined_sha256 === CENSUS_MANIFEST_SHA256, 'census manifest combined digest changed');

  ok(restriction?.schema_version === 'ssc-rd06-wave02-public-record-restriction-ledger@1', 'restriction ledger schema changed');
  ok(restriction?.five_unnamed_slots_are_proven_nonexistent === false, 'unnamed slots erased');
  ok(restriction?.restriction_is_nonresponsiveness_or_withdrawal === false, 'restriction laundered into disposition');
  ok(restriction?.substantive_identity_adjudication_complete === false, 'transport restriction ledger promoted itself');

  ok(candidates?.schema_version === 'ssc-rd06-wave02-public-record-candidate-index@1', 'candidate index schema changed');
  ok(candidates?.candidate_rows === 280 && candidates?.unique_candidate_urls === 270 && candidates?.official_candidate_urls === 4, 'candidate index counts changed');
  ok(candidates?.authority?.candidate_hit_is_offeror_identity === false && candidates?.authority?.search_result_is_denominator_admission === false, 'candidate authority escalated');
  ok(candidates?.authority?.result_spawned_requests === 0, 'candidate recursion appeared');

  ok(officialCandidates?.schema_version === 'ssc-rd06-wave02-official-candidate-url-ledger@1', 'official candidate ledger schema changed');
  ok(officialCandidates?.count === 4 && officialCandidates?.urls?.length === 4, 'official candidate denominator changed');
  ok(officialCandidates?.admitted_into_offeror_denominator === 0 && officialCandidates?.followup_requests_executed === 0, 'official candidates were silently admitted');
  ok(officialCandidates.urls.every((url) => /fleet|transportation-operations/.test(url)), 'official candidate set changed from unrelated fleet/transport records');

  ok(slotLedger?.schema_version === 'ssc-rd06-wave02-public-record-slot-ledger@1', 'slot census ledger schema changed');
  ok(slotLedger?.proposal_slots === 8 && slotLedger?.named_slots === 3 && slotLedger?.unresolved_slots === 5, 'slot census denominator changed');
  ok(slotLedger?.transport_census_complete === true && slotLedger?.substantive_adjudication_complete === false && slotLedger?.class_closed === false, 'slot census authority changed');
  ok(slotLedger.slots.every((row) => row.transport_protocol_terminal === true && row.candidate_hit_is_identity === false), 'slot transport state changed');

  return attempt;
}

function sourceIds() {
  return ['SSC-RD06-S004', 'SSC-RD06-CENSUS-V1'];
}

function terminalizeNamed(slot) {
  const row = clone(slot);
  for (const field of Object.values(row.fields)) field.fixed_protocol_complete = true;

  row.fields.team_prime_subcontractor_and_architecture_identity_where_public = {
    state: 'source_restricted',
    value: null,
    source_ids: sourceIds(),
    note: 'The fixed public-record protocol recovered no source-addressable proposal team, subcontractor, or architecture record. Offeror identity, later product references, and award continuity are not substituted.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.public_restricted_or_unavailable_classification = {
    state: 'observed',
    value: 'public_identity_evaluation_and_disposition_observed_team_architecture_source_restricted_after_fixed_protocol',
    source_ids: sourceIds(),
    note: 'Named offeror identity and bounded public evaluation remain observed while team and architecture identity terminate as source restricted.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.slot_result = {
    fixed_protocol_executed: true,
    terminal_fields: 10,
    required_fields: 10,
    slot_closed_for_identity_and_disposition: true,
    complete_offeror_team_architecture_record: false,
    terminal_state: row.fields.terminal_proposal_slot_state.value
  };
  return row;
}

function terminalizeUnresolved(slot) {
  const row = clone(slot);
  row.identity_state = 'public_identity_source_restricted';
  const ids = sourceIds();

  row.fields.stable_proposal_slot.fixed_protocol_complete = true;
  row.fields.proposal_status.fixed_protocol_complete = true;
  row.fields.source_identity_and_exact_custody.fixed_protocol_complete = true;

  row.fields.legal_offeror_and_bidding_entity = {
    state: 'source_restricted',
    value: null,
    source_ids: ids,
    note: 'The eight-proposal denominator affirmatively preserves this slot, but the redacted/protected public source-selection record and fixed public census do not expose its legal offeror identity.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.team_prime_subcontractor_and_architecture_identity_where_public = {
    state: 'source_restricted',
    value: null,
    source_ids: ids,
    note: 'No proposal team, subcontractor, architecture, or product identity is assigned to an unidentified offeror slot.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state = {
    state: 'source_restricted',
    value: 'not_among_two_public_awardees_specific_rejection_withdrawal_or_nonresponse_not_publicly_recovered',
    source_ids: ids,
    note: 'The public award record identifies two awardees; it does not permit the remaining slot to be classified as rejected, withdrawn, or nonresponsive.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.evaluation_or_protest_cross_reference = {
    state: 'source_restricted',
    value: null,
    source_ids: ids,
    note: 'The named public evaluation table is not copied onto an unidentified proposal slot; any slot-specific evaluation remains within the restricted source-selection record.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.source_identity_and_exact_custody = {
    state: 'observed',
    value: {
      ...row.fields.source_identity_and_exact_custody.value,
      census_execution_receipt_path: EXECUTION_RECEIPT_PATH,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
      custody_scope: 'eight_proposal_denominator_and_terminal_fixed_public_record_protocol_not_offeror_identity'
    },
    source_ids: ids,
    note: 'Exact custody proves the unresolved denominator member and completed public protocol, not a hidden identity or disposition.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.identity_confidence_and_alternative_candidates = {
    state: 'source_restricted',
    value: {
      confidence: 'public_identity_source_restricted',
      alternative_candidates: []
    },
    source_ids: ids,
    note: 'No admissible public identity candidate was recovered. An empty alternative list is not nonexistence.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.public_restricted_or_unavailable_classification = {
    state: 'observed',
    value: 'identity_team_architecture_evaluation_and_specific_disposition_source_restricted_after_fixed_protocol',
    source_ids: ids,
    note: 'The slot is terminal because the immutable denominator and fixed public protocol are complete and the remaining fields belong to the restricted source-selection record.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };
  row.fields.terminal_proposal_slot_state = {
    state: 'observed',
    value: 'identity_source_restricted',
    source_ids: ids,
    note: 'This terminal state closes the public acquisition obligation only; it does not identify the offeror or establish rejection, withdrawal, or nonresponsiveness.',
    fixed_protocol_complete: true,
    terminal_for_class_closure: true
  };

  row.slot_result = {
    fixed_protocol_executed: true,
    terminal_fields: 10,
    required_fields: 10,
    slot_closed_for_identity_and_disposition: true,
    complete_offeror_team_architecture_record: false,
    terminal_state: 'identity_source_restricted'
  };
  return row;
}

function buildTerminalMatrix(inputs) {
  const { matrix } = inputs;
  const slots = matrix.slots.map((slot) => slot.slot_id.startsWith('CD1-PROP-NAMED-') ? terminalizeNamed(slot) : terminalizeUnresolved(slot));

  return {
    schema_version: 'ssc-rd-wave02-rd06-offeror-universe-terminal-matrix@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-06-C01',
    issue: 791,
    as_of: '2026-08-03',
    status: 'eight_slot_public_offeror_universe_terminal_five_identity_slots_source_restricted',
    source_product: {
      research_head: RESEARCH_HEAD,
      historical_field_matrix_path: MATRIX_PATH,
      historical_field_matrix_git_blob_sha: MATRIX_BLOB_SHA,
      parent_execution_path: PARENT_PATH,
      execution_receipt_path: EXECUTION_RECEIPT_PATH,
      census_root: CENSUS_ROOT,
      census_artifact_sha256: CENSUS_ARTIFACT_SHA256,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256
    },
    denominator_contract: {
      ...matrix.denominator_contract,
      fixed_public_record_protocol_complete: true,
      public_identity_and_disposition_terminal_slots: 8,
      complete_offeror_team_architecture_records: 0
    },
    required_fields: [...matrix.required_fields],
    permitted_field_states: [...matrix.permitted_field_states],
    permitted_terminal_slot_states: [...new Set([...matrix.permitted_terminal_slot_states, 'identity_source_restricted'])],
    slots,
    counts: {
      proposal_slots: 8,
      publicly_named_offerors: 3,
      public_identity_source_restricted_slots: 5,
      named_awardees: 2,
      named_rejected_offerors: 1,
      fixed_protocol_completed_slots: 8,
      identity_and_disposition_terminal_slots: 8,
      complete_offeror_team_architecture_records: 0,
      fixed_routes: 40,
      route_attempts: 40,
      http_success: 37,
      terminal_non_success: 3,
      candidate_result_rows: 280,
      unique_candidate_urls: 270,
      official_candidate_urls: 4,
      admitted_candidate_urls: 0,
      result_spawned_requests: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    current_result: {
      terminal_state: TERMINAL_STATE,
      exact_eight_slot_denominator_bound: true,
      named_public_identities_reconciled: 3,
      unresolved_slots_terminally_classified: 5,
      fixed_protocol_complete: true,
      class_closed: true,
      complete_offeror_team_architecture_universe_observed: false,
      public_identity_restriction_preserved: true,
      technical_superiority_finding: false,
      favoritism_finding: false,
      foreclosure_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      reviewed_disposition_changed: false,
      project_blocking: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    boundaries: {
      proposal_count_is_complete_named_offeror_universe: false,
      named_offeror_is_named_architecture: false,
      award_is_technical_superiority: false,
      rejection_is_absence_of_viable_counterfactual: false,
      nonaward_is_rejection_withdrawal_or_nonresponsiveness: false,
      protective_order_is_no_proposal: false,
      no_public_result_is_no_proposal: false,
      public_competition_is_equal_support: false,
      protest_denial_is_complete_fairness: false,
      unresolved_identity_is_nonexistent_offeror: false,
      Palantir_presence_is_coordination_or_common_purpose: false,
      matrix_completion_is_complete_compact: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

function authority() {
  return {
    outside_human_dependency: false,
    external_contacts: 0,
    external_reviews: 0,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    technical_superiority_finding: false,
    favoritism_finding: false,
    foreclosure_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    graph_effect: 'none',
    publication_effect: 'none',
    adoption_effect: 'none'
  };
}

export function deriveProduct(root = ROOT) {
  const inputs = readInputs(root);
  const attempt = validateInputs(inputs);
  const matrix = buildTerminalMatrix(inputs);

  const classReceipt = {
    schema_version: 'ssc-rd-wave02-rd06-class-receipt@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-06',
    class_id: 'RD-06-C01',
    issue: 791,
    class_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    closure_basis: [
      'the eight-proposal denominator is immutable and all eight analytical slots remain represented',
      'three public offeror identities and bounded dispositions remain observed without architecture substitution',
      'the same fixed forty-route public-record protocol is terminal across all five unnamed slots',
      'the retained public source-selection record is redacted or protected and the census recovered no admissible identity, team, architecture, or slot-specific disposition candidate',
      'the five unnamed slots terminate as identity_source_restricted rather than guessed offerors, silent rows, rejections, withdrawals, or nonresponses'
    ],
    counts: matrix.counts,
    residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01: {
      canonical_classes: 42,
      open_before: 39,
      closed_before: 3,
      open_after: 38,
      closed_after: 4
    },
    source_custody: {
      historical_field_matrix_path: MATRIX_PATH,
      historical_field_matrix_git_blob_sha: MATRIX_BLOB_SHA,
      execution_receipt_path: EXECUTION_RECEIPT_PATH,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
      census_artifact_sha256: CENSUS_ARTIFACT_SHA256
    },
    authority: authority()
  };

  const summary = {
    schema_version: 'ssc-rd-wave02-rd06-offeror-universe-summary@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-06',
    class_id: 'RD-06-C01',
    issue: 791,
    class_label: CLASS_LABEL,
    counts: matrix.counts,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    current_result: matrix.current_result,
    boundaries: matrix.boundaries,
    authority: authority()
  };

  return { attempt, matrix, classReceipt, summary };
}

function generatedPaths() {
  return [
    `${PRODUCT_ROOT}/class-receipt.json`,
    `${PRODUCT_ROOT}/summary.json`,
    `${PRODUCT_ROOT}/terminal-field-matrix.json`
  ];
}

export function writeProduct(root = ROOT) {
  const { matrix, classReceipt, summary } = deriveProduct(root);
  writeJson(root, `${PRODUCT_ROOT}/terminal-field-matrix.json`, matrix);
  writeJson(root, `${PRODUCT_ROOT}/class-receipt.json`, classReceipt);
  writeJson(root, `${PRODUCT_ROOT}/summary.json`, summary);

  const entries = generatedPaths().map((rel) => {
    const bytes = readBytes(root, rel);
    return { path: path.basename(rel), bytes: bytes.length, sha256: sha256(bytes) };
  });
  const combined = sha256(Buffer.from(entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'));
  const manifest = {
    schema_version: 'ssc-rd-wave02-rd06-offeror-universe-manifest@1',
    entries,
    combined_sha256: combined
  };
  writeJson(root, `${PRODUCT_ROOT}/manifest.json`, manifest);

  const closure = {
    schema_version: 'ssc-residual-denominator-wave02-class-closure-reference@1',
    wave_issue: 785,
    child_issue: 791,
    source_pr: 806,
    class_id: 'RD-06-C01',
    lane_id: 'RD-06',
    exact_label: CLASS_LABEL,
    terminal_state: TERMINAL_STATE,
    class_closed: true,
    residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01: classReceipt.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01,
    product: {
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      terminal_field_matrix_path: `${PRODUCT_ROOT}/terminal-field-matrix.json`,
      summary_path: `${PRODUCT_ROOT}/summary.json`,
      manifest_path: `${PRODUCT_ROOT}/manifest.json`,
      manifest_combined_sha256: combined
    },
    execution: {
      workflow_run: 30841600477,
      job_id: 91779721380,
      artifact_id: 8866994583,
      artifact_zip_sha256: CENSUS_ARTIFACT_SHA256,
      manifest_entry_count: 329,
      census_manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
      execution_receipt_path: EXECUTION_RECEIPT_PATH
    },
    authority: authority()
  };
  writeJson(root, CLOSURE_REFERENCE_PATH, closure);
  return { matrix, classReceipt, summary, manifest, closure };
}

export function checkProduct(root = ROOT) {
  const temp = fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(abs(root, PRODUCT_ROOT))), '.rd06-check-'));
  try {
    for (const rel of [
      MATRIX_PATH, PARENT_PATH, SEED_PATH, CONSTITUTION_PATH, EXECUTION_RECEIPT_PATH,
      `${CENSUS_ROOT}/summary.json`, `${CENSUS_ROOT}/manifest.json`, `${CENSUS_ROOT}/restriction-ledger.json`,
      `${CENSUS_ROOT}/candidate-index.json`, `${CENSUS_ROOT}/official-candidate-urls.json`,
      `${CENSUS_ROOT}/slot-terminal-ledger.json`
    ]) {
      const target = abs(temp, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(abs(root, rel), target);
    }
    writeProduct(temp);
    for (const rel of [...generatedPaths(), `${PRODUCT_ROOT}/manifest.json`, CLOSURE_REFERENCE_PATH]) {
      const actual = readBytes(root, rel);
      const expected = readBytes(temp, rel);
      ok(actual.equals(expected), `${rel}: deterministic drift`);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    const product = writeProduct(ROOT);
    console.log(`wrote RD-06 terminal product: ${product.matrix.counts.proposal_slots} slots; ${product.matrix.counts.public_identity_source_restricted_slots} source restricted`);
  } else if (mode === '--check') {
    checkProduct(ROOT);
    console.log('RD-06 terminal product deterministic: bounded_source_restricted; 8/8 slots terminal');
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
