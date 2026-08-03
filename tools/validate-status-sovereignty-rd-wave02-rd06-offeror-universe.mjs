#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  MATRIX_PATH,
  PARENT_PATH,
  SEED_PATH,
  CONSTITUTION_PATH,
  EXECUTION_RECEIPT_PATH,
  CENSUS_ROOT,
  PRODUCT_ROOT,
  CLOSURE_REFERENCE_PATH,
  CURRENT_LEDGER_PATH,
  CLASS_LABEL,
  TERMINAL_STATE,
  CENSUS_MANIFEST_SHA256,
  CENSUS_ARTIFACT_SHA256,
  MATRIX_BLOB_SHA,
  RESEARCH_HEAD,
  deriveProduct
} from './build-status-sovereignty-rd-wave02-rd06-offeror-universe.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave02-rd06-offeror-universe.schema.json';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const same = (actual, expected, message) => ok(equal(actual, expected), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

export function readBundle(root = ROOT) {
  return {
    terminal: readJson(root, `${PRODUCT_ROOT}/terminal-field-matrix.json`),
    receipt: readJson(root, `${PRODUCT_ROOT}/class-receipt.json`),
    summary: readJson(root, `${PRODUCT_ROOT}/summary.json`),
    manifest: readJson(root, `${PRODUCT_ROOT}/manifest.json`),
    closure: readJson(root, CLOSURE_REFERENCE_PATH),
    execution: readJson(root, EXECUTION_RECEIPT_PATH),
    censusManifest: readJson(root, `${CENSUS_ROOT}/manifest.json`),
    censusSummary: readJson(root, `${CENSUS_ROOT}/summary.json`),
    parentMatrix: readJson(root, MATRIX_PATH),
    parent: readJson(root, PARENT_PATH),
    seed: readJson(root, SEED_PATH),
    constitution: readJson(root, CONSTITUTION_PATH)
  };
}

function exactKeys(value, keys, label) {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: object required`);
  same(Object.keys(value).sort(), [...keys].sort(), `${label}: keys changed`);
}

function allFalse(value, keys, label) {
  for (const key of keys) ok(value?.[key] === false, `${label}.${key} escalated`);
}

function allNone(value, keys, label) {
  for (const key of keys) ok(value?.[key] === 'none', `${label}.${key} escalated`);
}

function validateSchema(schema, terminal) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave02-rd06-offeror-universe.schema.json', 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === terminal.schema_version, 'schema version binding changed');
  ok(schema?.properties?.slots?.minItems === 8 && schema?.properties?.slots?.maxItems === 8, 'schema slot denominator changed');
  ok(schema?.properties?.counts?.properties?.proposal_slots?.const === 8, 'schema proposal denominator changed');
  ok(schema?.properties?.counts?.properties?.public_identity_source_restricted_slots?.const === 5, 'schema restricted-slot denominator changed');
  ok(schema?.properties?.counts?.properties?.fixed_protocol_completed_slots?.const === 8, 'schema protocol denominator changed');
  ok(schema?.properties?.current_result?.properties?.terminal_state?.const === TERMINAL_STATE, 'schema terminal state changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === true, 'schema class closure changed');
}

function validateCensusBytes(root, censusManifest) {
  ok(censusManifest?.entry_count === 329 && censusManifest?.entries?.length === 329, 'census manifest entry denominator changed');
  unique(censusManifest.entries.map((row) => row.path), 'duplicate census manifest path');
  for (const entry of censusManifest.entries) {
    ok(!path.isAbsolute(entry.path) && !entry.path.split('/').includes('..'), `${entry.path}: unsafe census path`);
    const bytes = readBytes(root, `${CENSUS_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: census byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: census digest changed`);
  }
  const combined = sha256(Buffer.from(censusManifest.entries.map((row) => `${row.sha256}  ${row.path}`).join('\n'), 'utf8'));
  ok(combined === censusManifest.combined_sha256, 'census manifest recomputation changed');
  ok(combined === CENSUS_MANIFEST_SHA256, 'census exact manifest binding changed');
}

function validateNamedSlot(slot, expectedIdentity, expectedState) {
  ok(slot.identity_state === 'publicly_named', `${slot.slot_id}: named identity state changed`);
  ok(slot.fields.legal_offeror_and_bidding_entity.state === 'observed', `${slot.slot_id}: named offeror lost`);
  ok(slot.fields.legal_offeror_and_bidding_entity.value === expectedIdentity, `${slot.slot_id}: named offeror changed`);
  ok(slot.fields.team_prime_subcontractor_and_architecture_identity_where_public.state === 'source_restricted', `${slot.slot_id}: team restriction changed`);
  ok(slot.fields.team_prime_subcontractor_and_architecture_identity_where_public.value === null, `${slot.slot_id}: team identity invented`);
  ok(slot.fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.state === 'observed', `${slot.slot_id}: disposition lost`);
  ok(slot.fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.value === expectedState, `${slot.slot_id}: disposition changed`);
  ok(slot.fields.terminal_proposal_slot_state.value === expectedState, `${slot.slot_id}: terminal state changed`);
  ok(slot.fields.public_restricted_or_unavailable_classification.value === 'public_identity_evaluation_and_disposition_observed_team_architecture_source_restricted_after_fixed_protocol', `${slot.slot_id}: public restriction classification changed`);
}

function validateRestrictedSlot(slot) {
  ok(slot.identity_state === 'public_identity_source_restricted', `${slot.slot_id}: restricted identity state changed`);
  for (const fieldName of [
    'legal_offeror_and_bidding_entity',
    'team_prime_subcontractor_and_architecture_identity_where_public',
    'award_rejection_withdrawal_nonresponsive_or_unresolved_state',
    'evaluation_or_protest_cross_reference',
    'identity_confidence_and_alternative_candidates'
  ]) {
    ok(slot.fields[fieldName].state === 'source_restricted', `${slot.slot_id}.${fieldName}: source restriction changed`);
    ok(slot.fields[fieldName].terminal_for_class_closure === true, `${slot.slot_id}.${fieldName}: not terminal`);
  }
  ok(slot.fields.legal_offeror_and_bidding_entity.value === null, `${slot.slot_id}: offeror invented`);
  ok(slot.fields.team_prime_subcontractor_and_architecture_identity_where_public.value === null, `${slot.slot_id}: team invented`);
  ok(slot.fields.evaluation_or_protest_cross_reference.value === null, `${slot.slot_id}: evaluation invented`);
  ok(slot.fields.award_rejection_withdrawal_nonresponsive_or_unresolved_state.value === 'not_among_two_public_awardees_specific_rejection_withdrawal_or_nonresponse_not_publicly_recovered', `${slot.slot_id}: nonaward laundered into disposition`);
  ok(slot.fields.identity_confidence_and_alternative_candidates.value.confidence === 'public_identity_source_restricted', `${slot.slot_id}: identity confidence changed`);
  same(slot.fields.identity_confidence_and_alternative_candidates.value.alternative_candidates, [], `${slot.slot_id}: alternative candidate invented`);
  ok(slot.fields.public_restricted_or_unavailable_classification.value === 'identity_team_architecture_evaluation_and_specific_disposition_source_restricted_after_fixed_protocol', `${slot.slot_id}: restriction classification changed`);
  ok(slot.fields.terminal_proposal_slot_state.value === 'identity_source_restricted', `${slot.slot_id}: terminal state changed`);
  ok(slot.slot_result.terminal_state === 'identity_source_restricted', `${slot.slot_id}: slot result changed`);
}

export function validateProductShape(bundle, schema) {
  const { terminal, receipt, summary, manifest, closure, execution, censusManifest, censusSummary, parentMatrix, parent, seed, constitution } = bundle;

  validateSchema(schema, terminal);
  validateCensusBytes(ROOT, censusManifest);

  ok(terminal?.schema_version === 'ssc-rd-wave02-rd06-offeror-universe-terminal-matrix@1', 'terminal matrix schema changed');
  ok(terminal?.wave_id === 'SSC-RD-W02' && terminal?.class_id === 'RD-06-C01' && terminal?.issue === 791, 'terminal matrix identity changed');
  ok(terminal?.as_of === '2026-08-03' && terminal?.status === 'eight_slot_public_offeror_universe_terminal_five_identity_slots_source_restricted', 'terminal matrix status changed');
  ok(terminal?.source_product?.research_head === RESEARCH_HEAD, 'terminal research head changed');
  ok(terminal?.source_product?.historical_field_matrix_git_blob_sha === MATRIX_BLOB_SHA, 'terminal matrix blob binding changed');
  ok(terminal?.source_product?.census_artifact_sha256 === CENSUS_ARTIFACT_SHA256, 'terminal census artifact changed');
  ok(terminal?.source_product?.census_manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'terminal census manifest changed');

  ok(Array.isArray(terminal.slots) && terminal.slots.length === 8, 'eight terminal slots required');
  unique(terminal.slots.map((row) => row.slot_id), 'duplicate terminal slot');
  same(terminal.slots.map((row) => row.slot_id), parentMatrix.slots.map((row) => row.slot_id), 'terminal slot order changed');
  ok(terminal.slots.every((slot) => Object.keys(slot.fields).length === 10), 'ten fields required per terminal slot');
  ok(terminal.slots.every((slot) => Object.values(slot.fields).every((field) => field.fixed_protocol_complete === true && field.terminal_for_class_closure === true)), 'all fields must be protocol-complete and terminal');
  ok(terminal.slots.every((slot) => slot.slot_result.fixed_protocol_executed === true && slot.slot_result.terminal_fields === 10 && slot.slot_result.required_fields === 10), 'slot result terminal accounting changed');
  ok(terminal.slots.every((slot) => slot.slot_result.slot_closed_for_identity_and_disposition === true && slot.slot_result.complete_offeror_team_architecture_record === false), 'slot closure boundary changed');

  const byId = new Map(terminal.slots.map((row) => [row.slot_id, row]));
  validateNamedSlot(byId.get('CD1-PROP-NAMED-RAYTHEON'), 'Raytheon', 'named_awardee');
  validateNamedSlot(byId.get('CD1-PROP-NAMED-PALANTIR'), 'Palantir', 'named_awardee');
  validateNamedSlot(byId.get('CD1-PROP-NAMED-GENERAL-DYNAMICS'), 'General Dynamics Mission Systems, Inc.', 'named_rejected_offeror');
  for (let index = 1; index <= 5; index += 1) validateRestrictedSlot(byId.get(`CD1-PROP-UNRESOLVED-0${index}`));

  exactKeys(terminal.counts, [
    'proposal_slots','publicly_named_offerors','public_identity_source_restricted_slots','named_awardees','named_rejected_offerors',
    'fixed_protocol_completed_slots','identity_and_disposition_terminal_slots','complete_offeror_team_architecture_records',
    'fixed_routes','route_attempts','http_success','terminal_non_success','candidate_result_rows','unique_candidate_urls',
    'official_candidate_urls','admitted_candidate_urls','result_spawned_requests','external_contacts','external_reviews','graph_effects'
  ], 'terminal counts');
  same(terminal.counts, {
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
  }, 'terminal counts changed');

  ok(terminal.current_result.terminal_state === TERMINAL_STATE && terminal.current_result.class_closed === true, 'terminal class state changed');
  ok(terminal.current_result.fixed_protocol_complete === true && terminal.current_result.unresolved_slots_terminally_classified === 5, 'terminal protocol completion changed');
  ok(terminal.current_result.complete_offeror_team_architecture_universe_observed === false && terminal.current_result.public_identity_restriction_preserved === true, 'restriction boundary changed');
  allFalse(terminal.current_result, ['technical_superiority_finding','favoritism_finding','foreclosure_finding','coordination_finding','common_purpose_finding','reviewed_disposition_changed','project_blocking'], 'terminal result');
  allNone(terminal.current_result, ['publication_effect','adoption_effect','graph_effect'], 'terminal result');
  for (const [key, value] of Object.entries(terminal.boundaries)) {
    if (key.endsWith('_effect')) ok(value === 'none', `${key} changed`);
    else ok(value === false, `${key} weakened`);
  }

  ok(receipt?.schema_version === 'ssc-rd-wave02-rd06-class-receipt@1', 'class receipt schema changed');
  ok(receipt?.wave_id === 'SSC-RD-W02' && receipt?.lane_id === 'RD-06' && receipt?.class_id === 'RD-06-C01' && receipt?.issue === 791, 'class receipt identity changed');
  ok(receipt?.class_label === CLASS_LABEL && receipt?.terminal_state === TERMINAL_STATE && receipt?.class_closed === true, 'class receipt result changed');
  ok(Array.isArray(receipt?.closure_basis) && receipt.closure_basis.length === 5, 'closure basis changed');
  same(receipt.counts, terminal.counts, 'class receipt counts changed');
  same(receipt.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, { canonical_classes: 42, open_before: 39, closed_before: 3, open_after: 38, closed_after: 4 }, 'class receipt atlas effect changed');
  allFalse(receipt.authority, ['outside_human_dependency','reviewed_disposition_changed','complete_compact_finding','technical_superiority_finding','favoritism_finding','foreclosure_finding','coordination_finding','common_purpose_finding'], 'class receipt authority');
  ok(receipt.authority.external_contacts === 0 && receipt.authority.external_reviews === 0, 'class receipt external activity changed');
  allNone(receipt.authority, ['graph_effect','publication_effect','adoption_effect'], 'class receipt authority');

  ok(summary?.schema_version === 'ssc-rd-wave02-rd06-offeror-universe-summary@1', 'summary schema changed');
  ok(summary?.class_id === 'RD-06-C01' && summary?.terminal_state === TERMINAL_STATE && summary?.class_closed === true, 'summary result changed');
  same(summary.counts, terminal.counts, 'summary counts changed');
  same(summary.current_result, terminal.current_result, 'summary current result changed');
  same(summary.boundaries, terminal.boundaries, 'summary boundaries changed');
  same(summary.authority, receipt.authority, 'summary authority changed');

  ok(manifest?.schema_version === 'ssc-rd-wave02-rd06-offeror-universe-manifest@1', 'product manifest schema changed');
  ok(Array.isArray(manifest?.entries) && manifest.entries.length === 3, 'product manifest denominator changed');
  same(manifest.entries.map((row) => row.path), ['class-receipt.json','summary.json','terminal-field-matrix.json'], 'product manifest paths changed');
  unique(manifest.entries.map((row) => row.path), 'duplicate product manifest path');
  for (const entry of manifest.entries) {
    const bytes = readBytes(ROOT, `${PRODUCT_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: product byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: product digest changed`);
  }
  const productCombined = sha256(Buffer.from(manifest.entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'));
  ok(productCombined === manifest.combined_sha256, 'product manifest recomputation changed');

  ok(closure?.schema_version === 'ssc-residual-denominator-wave02-class-closure-reference@1', 'closure reference schema changed');
  ok(closure?.wave_issue === 785 && closure?.child_issue === 791 && closure?.source_pr === 806, 'closure reference custody changed');
  ok(closure?.class_id === 'RD-06-C01' && closure?.lane_id === 'RD-06' && closure?.exact_label === CLASS_LABEL, 'closure reference identity changed');
  ok(closure?.terminal_state === TERMINAL_STATE && closure?.class_closed === true, 'closure reference result changed');
  same(closure.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, receipt.residual_atlas_effect_if_promoted_after_rd04_rd05_and_rd01, 'closure atlas effect changed');
  ok(closure?.product?.manifest_combined_sha256 === manifest.combined_sha256, 'closure product manifest changed');
  ok(closure?.execution?.workflow_run === 30841600477 && closure?.execution?.artifact_id === 8866994583, 'closure execution custody changed');
  ok(closure?.execution?.artifact_zip_sha256 === CENSUS_ARTIFACT_SHA256 && closure?.execution?.census_manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'closure census digest changed');
  same(closure.authority, receipt.authority, 'closure authority changed');

  ok(execution?.schema_version === 'ssc-rd06-wave02-public-record-census-execution-receipt@1', 'execution receipt schema changed');
  ok(execution?.wave_id === 'SSC-RD-W02' && execution?.class_id === 'RD-06-C01' && execution?.issue === 791, 'execution receipt identity changed');
  ok(execution?.research_head === RESEARCH_HEAD, 'execution receipt research head changed');
  ok(execution?.workflow_run === 30841600477 && execution?.job_id === 91779721380 && execution?.artifact_id === 8866994583, 'execution run custody changed');
  ok(execution?.artifact_zip_sha256 === CENSUS_ARTIFACT_SHA256 && execution?.manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'execution receipt exact digest changed');
  ok(execution?.counts?.fixed_routes === 40 && execution?.counts?.route_attempts === 40, 'execution route accounting changed');
  ok(execution?.counts?.candidate_result_rows === 280 && execution?.counts?.official_candidate_urls === 4, 'execution candidate accounting changed');
  ok(censusSummary?.fixed_routes === 40 && censusSummary?.route_attempts === 40 && censusSummary?.class_closed === false, 'census historical summary changed');
  ok(parent?.recovered_denominators?.later_procurement_proposals_received === 8, 'parent proposal denominator changed');
  ok(seed?.closure_target === CLASS_LABEL, 'seed label changed');
  const attempt = constitution.lane_attempts.find((row) => row.class_id === 'RD-06-C01');
  ok(attempt?.exact_label === CLASS_LABEL && attempt?.issue === 791, 'constitution label changed');

  return bundle;
}

export function validateCurrentAtlasCustody(current) {
  ok(current?.counts?.canonical_residual_classes === 42, 'current atlas canonical denominator changed');
  ok(Array.isArray(current?.promoted_class_receipts), 'current atlas promoted receipts missing');
  ok(Array.isArray(current?.selected_classes_open), 'current atlas open selected classes missing');

  const promotedIds = current.promoted_class_receipts.map((row) => row.class_id);
  const openIds = current.selected_classes_open.map((row) => row.class_id);
  const rd06Promoted = current.promoted_class_receipts.find((row) => row.class_id === 'RD-06-C01');
  const rd06Open = current.selected_classes_open.find((row) => row.class_id === 'RD-06-C01');

  for (const key of [
    'outside_human_dependencies',
    'external_contacts',
    'external_reviews',
    'reviewed_disposition_changes',
    'complete_compact_findings',
    'racial_order_findings',
    'prevalence_findings',
    'coordination_findings',
    'common_purpose_findings',
    'graph_effects',
    'publication_effects',
    'adoption_effects'
  ]) ok(current.counts[key] === 0, `current atlas ${key} changed`);
  ok(current?.current_result?.outside_human_dependency === false, 'current atlas outside-human dependency changed');
  ok(current?.current_result?.project_blocking === false, 'current atlas project-blocking state changed');
  for (const key of ['graph_effect','publication_effect','adoption_effect']) {
    ok(current.current_result[key] === 'none', `current atlas ${key} changed`);
  }

  const prePromotion =
    current.authority === 'three_terminal_class_receipts_promoted_without_cross_lane_empirical_authority' &&
    current.counts.terminal_class_receipts === 3 &&
    current.counts.classes_closed_this_wave === 3 &&
    current.counts.closed_residual_classes === 3 &&
    current.counts.open_residual_classes === 39 &&
    current.current_result.terminal_state === 'three_of_forty_two_residual_classes_closed_three_selected_attempts_open' &&
    current.current_result.classes_closed === 3 &&
    current.current_result.classes_open === 39 &&
    equal(promotedIds, ['RD-04-C01','RD-05-C03','RD-01-C03']) &&
    equal(openIds, ['RD-02-C04','RD-03-C04','RD-06-C01']) &&
    equal(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03']) &&
    equal(current.current_result.open_selected_class_ids, ['RD-02-C04','RD-03-C04','RD-06-C01']) &&
    rd06Promoted === undefined &&
    equal(rd06Open, {
      lane_id: 'RD-06',
      class_id: 'RD-06-C01',
      issue: 791,
      constitutional_exact_label: CLASS_LABEL,
      state: 'open',
      class_closed: false
    });

  const postPromotion =
    current.authority === 'four_terminal_class_receipts_promoted_without_cross_lane_empirical_authority' &&
    current.counts.terminal_class_receipts === 4 &&
    current.counts.classes_closed_this_wave === 4 &&
    current.counts.closed_residual_classes === 4 &&
    current.counts.open_residual_classes === 38 &&
    current.current_result.terminal_state === 'four_of_forty_two_residual_classes_closed_two_selected_attempts_open' &&
    current.current_result.classes_closed === 4 &&
    current.current_result.classes_open === 38 &&
    equal(promotedIds, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']) &&
    equal(openIds, ['RD-02-C04','RD-03-C04']) &&
    equal(current.current_result.closed_class_ids, ['RD-04-C01','RD-05-C03','RD-01-C03','RD-06-C01']) &&
    equal(current.current_result.open_selected_class_ids, ['RD-02-C04','RD-03-C04']) &&
    rd06Open === undefined &&
    equal(rd06Promoted, {
      lane_id: 'RD-06',
      class_id: 'RD-06-C01',
      issue: 791,
      source_pr: 806,
      merge_commit: 'd7983e19c0783a048afb19adde0fb65ccf94c726',
      constitutional_exact_label: CLASS_LABEL,
      receipt_class_label: CLASS_LABEL,
      labels_exact_match: true,
      label_reconciliation: 'none',
      terminal_state: TERMINAL_STATE,
      closure_reference_path: CLOSURE_REFERENCE_PATH,
      class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json`,
      manifest_combined_sha256: '2a17904180dac7b250e2b0ffb82e8124354e89c39be267b0f4c4ebe65c6516c5',
      class_closed: true
    });

  ok(prePromotion || postPromotion, 'current atlas is neither exact pre-promotion nor exact post-promotion RD-06 custody');
  return prePromotion ? 'pre_promotion' : 'post_promotion';
}

function validateGitCustody(root) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;
  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  ok(!tracked.some((rel) => rel.startsWith('.rd06-public-record-census/')), 'RD-06 transport plan retained in product branch');
  ok(!tracked.some((rel) => rel.includes('temporary-ssc-rd06-public-record-census')), 'RD-06 temporary workflow retained');
  const matrixBlob = spawnSync('git', ['rev-parse', `${RESEARCH_HEAD}:${MATRIX_PATH}`], { cwd: root, encoding: 'utf8' });
  ok(matrixBlob.status === 0 && matrixBlob.stdout.trim() === MATRIX_BLOB_SHA, 'historical field-matrix Git blob changed');
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', RESEARCH_HEAD, 'HEAD'], { cwd: root, encoding: 'utf8' });
  ok(ancestor.status === 0, 'research head is not an ancestor of product head');

  if (fs.existsSync(abs(root, CURRENT_LEDGER_PATH))) {
    validateCurrentAtlasCustody(readJson(root, CURRENT_LEDGER_PATH));
  }
}

export function validateProduct(root = ROOT) {
  const bundle = readBundle(root);
  const schema = readJson(root, SCHEMA_PATH);
  validateProductShape(bundle, schema);
  const derived = deriveProduct(root);
  same(bundle.terminal, derived.matrix, 'terminal matrix differs from deterministic derivation');
  same(bundle.receipt, derived.classReceipt, 'class receipt differs from deterministic derivation');
  same(bundle.summary, derived.summary, 'summary differs from deterministic derivation');
  validateGitCustody(root);
  return bundle;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundle = validateProduct(ROOT);
  console.log(`RD-06 terminal product validated: ${bundle.terminal.counts.proposal_slots}/8 slots terminal; ${bundle.terminal.counts.public_identity_source_restricted_slots} source restricted`);
}
