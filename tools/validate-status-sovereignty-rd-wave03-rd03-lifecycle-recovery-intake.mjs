#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ROOT,
  PACKAGE_PATH,
  PARENT_PATH,
  MATRIX_CONTRACT_PATH,
  SEED_PATH,
  CONSTITUTION_PATH,
  PARENT_MATRIX_PATH,
  PARENT_RECEIPT_PATH,
  PARENT_CLOSURE_PATH,
  FIELD_IDS,
  FIELD_TERMINAL_STATES,
  SEARCH_TERMS,
  INSTRUMENTS,
  EXACT_ROUTES,
  derivePackage
} from './build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.mjs';

export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.schema.json';
export const DESIGN_BASE = '150f1693c70ce3699428c58c2687851a1ced39f7';

const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);

export function readBundle(root = ROOT) {
  return {
    package: read(root, PACKAGE_PATH),
    schema: read(root, SCHEMA_PATH),
    parent: read(root, PARENT_PATH),
    matrixContract: read(root, MATRIX_CONTRACT_PATH),
    seed: read(root, SEED_PATH),
    constitution: read(root, CONSTITUTION_PATH),
    parentMatrix: read(root, PARENT_MATRIX_PATH),
    parentReceipt: read(root, PARENT_RECEIPT_PATH),
    parentClosure: read(root, PARENT_CLOSURE_PATH)
  };
}

export function validateSchemaShape(schema) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://clifford-number.local/schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.schema.json', 'schema ID changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema top-level closure changed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd-wave03-rd03-lifecycle-recovery-fixed-protocol@1', 'schema version contract changed');
  ok(schema?.properties?.class_id?.const === 'RD-03-C05' && schema?.properties?.issue?.const === 1016, 'schema class identity changed');
  ok(schema?.properties?.required_fields?.minItems === 11 && schema?.properties?.required_fields?.maxItems === 11, 'schema field denominator changed');
  ok(schema?.properties?.instruments?.minItems === 5 && schema?.properties?.instruments?.maxItems === 5, 'schema instrument denominator changed');
  ok(schema?.properties?.routes?.minItems === 43 && schema?.properties?.routes?.maxItems === 43, 'schema route denominator changed');
  ok(schema?.properties?.counts?.properties?.required_field_slots?.const === 55, 'schema field slot count changed');
  ok(schema?.properties?.counts?.properties?.fixed_routes?.const === 43, 'schema route count changed');
  ok(schema?.properties?.counts?.properties?.acquisition_attempts?.const === 0, 'schema acquisition state changed');
  ok(schema?.properties?.current_result?.properties?.class_closed?.const === false, 'schema class closure state changed');
  ok(schema?.properties?.boundaries?.properties?.candidate_query_result_is_admitted_source?.const === false, 'schema candidate-source boundary changed');
  ok(schema?.properties?.boundaries?.properties?.intake_protocol_is_class_closure?.const === false, 'schema intake-closure boundary changed');
  return true;
}

export function validatePackageShape(value, schema, seed, constitution, parent, matrixContract, parentMatrix, parentReceipt, parentClosure, root = ROOT) {
  same(value, derivePackage(root), 'package differs from deterministic derivation');
  validateSchemaShape(schema);

  ok(value?.schema_version === 'ssc-rd-wave03-rd03-lifecycle-recovery-fixed-protocol@1', 'package schema changed');
  ok(value?.wave_id === 'SSC-RD-W03' && value?.lane_id === 'RD-03' && value?.class_id === 'RD-03-C05' && value?.issue === 1016, 'package identity changed');
  ok(value?.authority === 'fixed_protocol_design_only_not_acquisition_or_class_receipt', 'package authority changed');
  ok(value?.source_custody?.parent_receipt_reopened_or_double_counted === false, 'parent receipt reopened');
  ok(value?.denominator?.instrument_count === 5 && value?.denominator?.required_field_slots === 55, 'package denominator changed');
  ok(value?.denominator?.executed_and_cash_disbursed_parent_units === 1 && value?.denominator?.conditional_pre_close_parent_units === 4, 'parent state split changed');
  ok(value?.denominator?.source_count_is_unit_denominator === false, 'source count became denominator');
  ok(value?.denominator?.later_announcement_may_substitute_instrument === false, 'instrument substitution enabled');
  ok(value?.denominator?.five_instruments_are_complete_osc_cohort === false, 'complete cohort overclaim');

  same(value.required_fields.map((row) => row.field_id), FIELD_IDS, 'field order changed');
  for (const row of value.required_fields) {
    ok(typeof row.question === 'string' && row.question.length >= 20, `${row.field_id}: question weakened`);
    same(row.permitted_terminal_states, FIELD_TERMINAL_STATES, `${row.field_id}: terminal states changed`);
  }

  same(value.instruments.map((row) => row.unit_id), INSTRUMENTS.map((row) => row.unit_id), 'instrument order changed');
  ok(value.instruments.every((row) => row.protocol_state === 'not_executed' && row.terminal_fields === 0 && row.required_fields === 11 && row.row_closed === false), 'instrument execution state changed');
  ok(value.instruments.every((row) => JSON.stringify(row.required_field_ids) === JSON.stringify(FIELD_IDS)), 'instrument field denominator changed');

  ok(value.routes.length === 43, 'route denominator changed');
  same(value.routes.map((row) => row.route_id), Array.from({length:43},(_,i)=>`RD03-W03-R${String(i+1).padStart(3,'0')}`), 'route order changed');
  ok(new Set(value.routes.map((row) => row.route_id)).size === 43, 'route IDs not unique');
  ok(new Set(value.routes.map((row) => row.request_url)).size === 43, 'route URLs not unique');
  ok(value.routes.slice(0,18).every((row) => row.route_type === 'exact_predeclared_get' && row.admission_state === 'predeclared_official_or_regulatory_source'), 'exact route contract changed');
  ok(value.routes.slice(18).every((row) => row.route_type === 'fixed_candidate_query_bing_rss' && row.admission_state === 'candidate_census_only_not_admitted_source'), 'candidate route contract changed');
  ok(value.routes.every((row) => row.maximum_attempts === 1 && row.automatic_result_followups === 0), 'route attempt or follow-up contract changed');
  same(value.routes.slice(0,18).map((row) => row.request_url), EXACT_ROUTES.map((row) => row[0]), 'exact route URL order changed');
  same(value.routes.slice(18).map((row) => row.search_term), INSTRUMENTS.flatMap(() => SEARCH_TERMS), 'candidate search-term order changed');

  same(value.transport_contract, {
    maximum_attempts_per_route:1,
    timeout_ms:30000,
    maximum_body_bytes:10485760,
    concurrency:4,
    bing_result_depth:10,
    result_spawned_requests:0,
    automatic_second_pass_authorized:false,
    external_contacts:0,
    external_reviews:0,
    outside_human_dependency:false
  }, 'transport contract changed');
  ok(value.admission_rules.length === 5 && value.terminal_rules.length === 8, 'decision rule denominator changed');
  same(value.counts, {
    instruments:5,required_fields_per_instrument:11,required_field_slots:55,fixed_routes:43,
    exact_predeclared_routes:18,candidate_census_routes:25,acquisition_attempts:0,terminal_fields:0,
    terminal_instruments:0,admitted_candidate_sources:0,external_contacts:0,external_reviews:0
  }, 'package counts changed');
  ok(value.current_result.terminal_state === 'protocol_frozen_acquisition_not_executed', 'terminal state changed');
  ok(value.current_result.fixed_protocol_executed === false && value.current_result.class_closed === false, 'protocol overexecuted or class overclosed');
  for (const key of ['complete_lifecycle_chronology_observed','public_recovery_observed','favoritism_finding','extraction_finding','coordination_finding','common_purpose_finding','reviewed_disposition_changed','outside_human_dependency','project_blocking']) {
    ok(value.current_result[key] === false, `current result ${key} changed`);
  }
  for (const key of ['publication_effect','adoption_effect','graph_effect']) ok(value.current_result[key] === 'none', `current result ${key} changed`);

  for (const key of ['conditional_commitment_is_financial_close','financial_close_is_cash_disbursement','executed_loan_is_full_draw','scheduled_interest_is_observed_payment','outstanding_obligation_is_default','maturity_term_is_repayment','companion_public_right_is_loan_recovery','candidate_query_result_is_admitted_source','no_public_record_is_event_absence','five_named_instruments_are_complete_osc_cohort','intake_protocol_is_class_closure','outside_human_dependency']) {
    ok(value.boundaries[key] === false, `boundary ${key} changed`);
  }
  for (const key of ['publication_effect','adoption_effect','graph_effect']) ok(value.boundaries[key] === 'none', `boundary ${key} changed`);

  ok(seed.class_id === 'RD-03-C05' && seed.class_closed === false, 'seed custody changed');
  ok(constitution.lane_attempts.find((row) => row.class_id === 'RD-03-C05')?.class_closed === false, 'constitution launch state changed');
  same(parent.instruments.map((row) => row.instrument_id), INSTRUMENTS.map((row) => row.unit_id), 'parent instruments changed');
  same(matrixContract.required_fields, FIELD_IDS, 'matrix contract fields changed');
  ok(matrixContract.expansion_contract.required_cells === 55, 'matrix contract cell count changed');
  ok(parentMatrix.class_id === 'RD-03-C04' && parentMatrix.current_result?.class_closed === true && parentMatrix.counts?.terminal_fields === 70, 'parent matrix custody changed');
  ok(parentReceipt.class_id === 'RD-03-C04' && parentReceipt.class_closed === true, 'parent receipt custody changed');
  ok(parentClosure.class_id === 'RD-03-C04' && parentClosure.class_closed === true, 'parent closure custody changed');
  return true;
}

function validateGitCustody(root) {
  const inside = spawnSync('git', ['rev-parse','--is-inside-work-tree'], {cwd:root,encoding:'utf8'});
  if (inside.status !== 0) return;
  for (const commit of [DESIGN_BASE,'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2','2af6bb7819a37e51c7198fb48da894445a29e494']) {
    const result = spawnSync('git', ['merge-base','--is-ancestor',commit,'HEAD'], {cwd:root,encoding:'utf8'});
    ok(result.status === 0, `${commit}: required ancestor missing`);
  }
}

export function validatePackage(root = ROOT) {
  const bundle = readBundle(root);
  validatePackageShape(bundle.package,bundle.schema,bundle.seed,bundle.constitution,bundle.parent,bundle.matrixContract,bundle.parentMatrix,bundle.parentReceipt,bundle.parentClosure,root);
  validateGitCustody(root);
  return true;
}

function run() {
  validatePackage(ROOT);
  console.log('RD-03 Wave-03 fixed protocol validated: 55 cells / 43 routes / class still open');
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
