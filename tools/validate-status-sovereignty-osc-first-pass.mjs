#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeOscFirstPassManifest } from './build-status-sovereignty-osc-first-pass.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadOscFirstPassContext() {
  return {
    record: read('data/intake/status-sovereignty-osc-denominator-first-pass.json'),
    schema: read('schemas/status-sovereignty-osc-denominator-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-osc-denominator-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/osc-first-pass/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/osc-first-pass/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/osc-first-pass/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/osc-first-pass/index.html'), 'utf8')
  };
}

export function validateOscFirstPass(c = loadOscFirstPassContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-open-obligation-first-pass@1', 'Record schema');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 542, 'Issue identity');
  eq(r.observation_id, 'SSC-OBS-0009', 'Observation identity');
  eq(r.lane_id, 'SSC-F10', 'Lane identity');
  eq(r.status, 'published_program_and_named_instrument_checkpoints_recovered_complete_cohort_and_recovery_open', 'Record status');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.parent_custody?.path, 'data/research/status-sovereignty-wave-01-targeted-acquisition.json', 'Parent custody path');
  eq(r.parent_custody?.state, 'partially_repaired_open', 'Parent custody state');

  eq(r.sources?.length, 6, 'Source count');
  const expectedSourceClasses = [
    'official_program_instrument',
    'official_application_checkpoint',
    'official_executed_loan_checkpoint',
    'official_conditional_commitment_checkpoint',
    'official_conditional_commitment_checkpoint',
    'official_conditional_commitment_checkpoint'
  ];
  const expectedFactCounts = [3, 4, 2, 2, 2, 2];
  const sourceIds = new Set();
  const sourceUrls = new Set();
  for (const [index, source] of (r.sources ?? []).entries()) {
    eq(source.source_id, `SSC-OSC-FP-S${String(index + 1).padStart(3, '0')}`, `Source identity ${index + 1}`);
    eq(source.source_class, expectedSourceClasses[index], `Source class ${index + 1}`);
    check(source.url?.startsWith('https://'), `Source URL ${index + 1} must be HTTPS`);
    eq(source.retrieved_facts?.length, expectedFactCounts[index], `Recovered fact count ${index + 1}`);
    sourceIds.add(source.source_id);
    sourceUrls.add(source.url);
  }
  eq(sourceIds.size, 6, 'Source IDs must be unique');
  eq(sourceUrls.size, 6, 'Source URLs must be unique');

  const expectedProgram = {
    applications_minimum: 200,
    requested_usd: 8900000000,
    initial_capacity_usd: 984000000,
    states_represented: 38,
    request_minimum_usd: 10000000,
    request_maximum_usd: 150000000,
    complete_applicant_identities_published: false,
    complete_selected_and_rejected_rows_published: false
  };
  eq(JSON.stringify(r.published_program_denominator), JSON.stringify(expectedProgram), 'Published program denominator');
  const expectedInstruments = {
    executed_direct_loans: 1,
    conditional_commitments: 4,
    named_amounts_usd: 2075000000,
    reconciled_to_inaugural_NOFA: false,
    complete_current_OSC_commitment_denominator: false
  };
  eq(JSON.stringify(r.named_instrument_subset), JSON.stringify(expectedInstruments), 'Named instrument subset');
  eq((r.named_instrument_subset?.executed_direct_loans ?? 0) + (r.named_instrument_subset?.conditional_commitments ?? 0), 5, 'Named instrument count');

  const expectedStateDistinctions = [
    'application_not_Part_2_invitation',
    'requested_amount_not_approved_amount',
    'selection_not_conditional_commitment',
    'conditional_commitment_not_executed_loan',
    'executed_loan_not_disbursement',
    'announced_warrant_not_issued_public_right',
    'repayment_terms_not_observed_repayment',
    'named_transactions_not_complete_cohort'
  ];
  eq(JSON.stringify(r.state_distinctions), JSON.stringify(expectedStateDistinctions), 'State distinctions');
  eq(new Set(r.state_distinctions ?? []).size, 8, 'State distinctions must be unique');
  eq(r.open_denominators?.length, 8, 'Open denominator count');
  eq(new Set(r.open_denominators ?? []).size, 8, 'Open denominators must be unique');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    reviewed_disposition_changed: false,
    complete_underwriting_to_recovery_chain: false,
    favoritism_finding: false,
    extraction_finding: false,
    complete_compact_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  const expectedBoundaries = {
    application_volume_proves_selection_quality: false,
    strategic_financing_proves_favoritism: false,
    conditional_commitment_is_executed_loan: false,
    executed_loan_is_disbursed_and_repaid: false,
    named_subset_is_complete_cohort: false,
    private_capacity_proves_extraction: false,
    graph_effect: 'none'
  };
  eq(JSON.stringify(r.boundaries), JSON.stringify(expectedBoundaries), 'Authority boundaries');

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-open-obligation-first-pass@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 542, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F10', 'Schema lane');
  eq(schema.properties?.sources?.minItems, 6, 'Schema source minimum');
  eq(schema.properties?.state_distinctions?.minItems, 8, 'Schema state distinction minimum');
  eq(schema.properties?.open_denominators?.minItems, 8, 'Schema open denominator minimum');

  const computed = computeOscFirstPassManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F10-OSC-01', 'Report identity');

  const fixedCounts = {
    source_records: 6,
    applications_minimum: 200,
    requested_usd: 8900000000,
    initial_capacity_usd: 984000000,
    states_represented: 38,
    request_minimum_usd: 10000000,
    request_maximum_usd: 150000000,
    complete_applicant_identity_denominators: 0,
    complete_selected_rejected_denominators: 0,
    named_instruments: 5,
    executed_direct_loans: 1,
    conditional_commitments: 4,
    named_amounts_usd: 2075000000,
    reconciled_inaugural_NOFA_denominators: 0,
    complete_current_commitment_denominators: 0,
    state_distinctions: 8,
    open_denominators: 8,
    observed_disbursement_denominators: 0,
    observed_repayment_denominators: 0,
    observed_public_recovery_denominators: 0,
    reviewed_disposition_changes: 0,
    complete_underwriting_to_recovery_chains: 0,
    favoritism_findings: 0,
    extraction_findings: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(buildReport.counts?.[key], value, `Report count ${key}`);
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('APPLICATION DENOMINATOR OPEN'), 'HTML applicant-denominator boundary missing');
  check(html.includes('CONDITIONAL COMMITMENT NOT EXECUTED LOAN'), 'HTML commitment/loan boundary missing');
  check(html.includes('EXECUTED LOAN NOT DISBURSEMENT'), 'HTML loan/disbursement boundary missing');
  check(html.includes('PUBLIC RECOVERY UNOBSERVED'), 'HTML public-recovery boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateOscFirstPass();
  if (errors.length) {
    console.error(`validate-status-sovereignty-osc-first-pass: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-osc-first-pass: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
