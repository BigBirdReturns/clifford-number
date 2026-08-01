#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSbicctFirstPassManifest } from './build-status-sovereignty-sbicct-first-pass.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadSbicctFirstPassContext() {
  return {
    record: read('data/intake/status-sovereignty-sbicct-denominator-first-pass.json'),
    schema: read('schemas/status-sovereignty-sbicct-denominator-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-sbicct-denominator-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/sbicct-first-pass/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/sbicct-first-pass/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/sbicct-first-pass/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/sbicct-first-pass/index.html'), 'utf8')
  };
}

export function validateSbicctFirstPass(c = loadSbicctFirstPassContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-open-obligation-first-pass@1', 'Record schema');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 541, 'Issue identity');
  eq(r.observation_id, 'SSC-OBS-0008', 'Observation identity');
  eq(r.lane_id, 'SSC-F10', 'Lane identity');
  eq(r.status, 'application_and_first_cohort_checkpoints_recovered_fund_level_flow_and_recovery_open', 'Record status');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.parent_custody?.path, 'data/research/status-sovereignty-wave-01-targeted-acquisition.json', 'Parent custody path');
  eq(r.parent_custody?.state, 'partially_repaired_open', 'Parent custody state');

  eq(r.sources?.length, 3, 'Source count');
  const expectedSourceClasses = [
    'official_program_checkpoint',
    'official_first_cohort_checkpoint',
    'official_policy_and_governance_contract'
  ];
  const expectedFactCounts = [5, 4, 2];
  const sourceIds = new Set();
  const sourceUrls = new Set();
  for (const [index, source] of (r.sources ?? []).entries()) {
    eq(source.source_id, `SSC-SBICCT-FP-S${String(index + 1).padStart(3, '0')}`, `Source identity ${index + 1}`);
    eq(source.source_class, expectedSourceClasses[index], `Source class ${index + 1}`);
    check(source.url?.startsWith('https://'), `Source URL ${index + 1} must be HTTPS`);
    eq(source.retrieved_facts?.length, expectedFactCounts[index], `Recovered fact count ${index + 1}`);
    sourceIds.add(source.source_id);
    sourceUrls.add(source.url);
  }
  eq(sourceIds.size, 3, 'Source IDs must be unique');
  eq(sourceUrls.size, 3, 'Source URLs must be unique');

  const expectedCheckpoints = {
    expressions_of_interest_minimum: 100,
    formal_applications_as_of_2024_10_22: 22,
    approved_as_of_2024_10_22: 13,
    first_published_cohort: 18,
    publicly_named_first_cohort: 17,
    withheld_first_cohort: 1,
    fully_licensed_as_of_2025_01_17: 7
  };
  eq(JSON.stringify(r.recovered_checkpoints), JSON.stringify(expectedCheckpoints), 'Recovered checkpoints');

  const expectedStateDistinctions = [
    'interest_not_application',
    'application_not_approval',
    'green_light_not_license',
    'license_not_leverage_commitment',
    'commitment_not_draw',
    'fund_draw_not_portfolio_investment',
    'portfolio_investment_not_realized_performance',
    'projected_investment_not_public_benefit',
    'repayment_machinery_not_observed_public_recovery'
  ];
  eq(JSON.stringify(r.state_distinctions), JSON.stringify(expectedStateDistinctions), 'State distinctions');
  eq(new Set(r.state_distinctions ?? []).size, 9, 'State distinctions must be unique');
  eq(r.open_denominators?.length, 7, 'Open denominator count');
  eq(new Set(r.open_denominators ?? []).size, 7, 'Open denominators must be unique');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    reviewed_disposition_changed: false,
    complete_public_private_risk_and_recovery_chain: false,
    capital_conversion_finding: false,
    complete_compact_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  const expectedBoundaries = {
    program_membership_proves_favoritism: false,
    license_proves_leverage_draw: false,
    projected_portfolio_count_proves_realized_investment: false,
    private_return_proves_public_recovery: false,
    public_leverage_proves_extraction: false,
    shared_program_proves_coordination: false,
    graph_effect: 'none'
  };
  eq(JSON.stringify(r.boundaries), JSON.stringify(expectedBoundaries), 'Authority boundaries');

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-open-obligation-first-pass@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 541, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F10', 'Schema lane');
  eq(schema.properties?.sources?.minItems, 3, 'Schema source minimum');
  eq(schema.properties?.state_distinctions?.minItems, 9, 'Schema state distinction minimum');
  eq(schema.properties?.open_denominators?.minItems, 7, 'Schema open denominator minimum');

  const computed = computeSbicctFirstPassManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F10-SBICCT-01', 'Report identity');

  const fixedCounts = {
    source_records: 3,
    expressions_of_interest_minimum: 100,
    formal_applications_as_of_2024_10_22: 22,
    approved_as_of_2024_10_22: 13,
    first_published_cohort: 18,
    publicly_named_first_cohort: 17,
    withheld_first_cohort: 1,
    fully_licensed_as_of_2025_01_17: 7,
    state_distinctions: 9,
    open_denominators: 7,
    complete_applicant_denominators: 0,
    complete_fund_flow_denominators: 0,
    observed_public_recovery_denominators: 0,
    reviewed_disposition_changes: 0,
    complete_public_private_risk_and_recovery_chains: 0,
    capital_conversion_findings: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(buildReport.counts?.[key], value, `Report count ${key}`);
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('LICENSE NOT DRAW'), 'HTML license/draw boundary missing');
  check(html.includes('PROJECTED INVESTMENT NOT REALIZED PERFORMANCE'), 'HTML projection/performance boundary missing');
  check(html.includes('PUBLIC RECOVERY UNOBSERVED'), 'HTML public-recovery boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateSbicctFirstPass();
  if (errors.length) {
    console.error(`validate-status-sovereignty-sbicct-first-pass: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-sbicct-first-pass: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
