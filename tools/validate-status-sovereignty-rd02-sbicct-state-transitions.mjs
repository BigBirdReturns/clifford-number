#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSbicTransitionsManifest } from './build-status-sovereignty-rd02-sbicct-state-transitions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadSbicTransitionsContext() {
  return {
    record: read('data/intake/status-sovereignty-rd02-sbicct-state-transitions.json'),
    schema: read('schemas/status-sovereignty-rd02-sbicct-state-transitions.schema.json'),
    manifest: read('data/project/status-sovereignty-rd02-sbicct-state-transitions-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/rd02-sbicct-state-transitions/index.html'), 'utf8')
  };
}

export function validateSbicTransitions(c = loadSbicTransitionsContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-rd02-sbicct-state-transitions@1', 'Record schema');
  eq(r.execution_id, 'SSC-RD02-SBICCT-TRANSITIONS-01', 'Execution identity');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 618, 'Issue identity');
  eq(r.parent_issue, 615, 'Parent issue identity');
  eq(r.lane_id, 'SSC-F10', 'Lane identity');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.parent_receipts?.length, 2, 'Parent receipt count');

  const expectedCohort = {
    published_first_cohort: 18,
    publicly_named_rows: 17,
    withheld_rows: 1,
    fully_licensed_rows_at_2025_01_17: 7,
    all_eighteen_slots_preserved: true,
    withheld_row_dropped: false,
    fund_specific_license_mapping_recovered: false,
    selected_because_expected_result: false
  };
  eq(JSON.stringify(r.cohort_contract), JSON.stringify(expectedCohort), 'Cohort contract');
  eq(r.cohort_slots?.length, 18, 'Cohort slot denominator');
  eq(new Set(r.cohort_slots?.map((row) => row.slot)).size, 18, 'Cohort slots must be unique');
  eq(JSON.stringify(r.cohort_slots?.map((row) => row.slot)), JSON.stringify(Array.from({ length: 18 }, (_, i) => i + 1)), 'Cohort slot order');
  const published = r.cohort_slots?.filter((row) => row.identity_state === 'published_identity_requires_source_transcription') ?? [];
  const withheld = r.cohort_slots?.filter((row) => row.identity_state === 'withheld_under_sba_policy') ?? [];
  eq(published.length, 17, 'Published identity slot count');
  eq(withheld.length, 1, 'Withheld identity slot count');
  eq(withheld[0]?.slot, 18, 'Withheld row position');
  for (const row of r.cohort_slots ?? []) {
    eq(row.fund_specific_license_state, 'unresolved', `Slot ${row.slot} license state`);
    eq(row.leverage_commitment, 'unresolved', `Slot ${row.slot} leverage commitment`);
    eq(row.leverage_draw, 'unresolved', `Slot ${row.slot} leverage draw`);
    eq(row.portfolio_investment, 'unresolved', `Slot ${row.slot} portfolio investment`);
    eq(row.realized_performance, 'unresolved', `Slot ${row.slot} realized performance`);
    eq(row.repayment_or_loss, 'unresolved', `Slot ${row.slot} repayment or loss`);
    eq(row.public_recovery, 'unresolved', `Slot ${row.slot} public recovery`);
  }

  const expectedAggregate = {
    expressions_of_interest_minimum: 100,
    formal_applications_as_of_2024_10_22: 22,
    approved_as_of_2024_10_22: 13,
    published_first_cohort: 18,
    fully_licensed_as_of_2025_01_17: 7,
    fund_specific_leverage_commitments_recovered: 0,
    fund_specific_leverage_draws_recovered: 0,
    portfolio_investment_ledgers_recovered: 0,
    realized_performance_ledgers_recovered: 0,
    repayment_or_loss_ledgers_recovered: 0,
    public_recovery_ledgers_recovered: 0
  };
  eq(JSON.stringify(r.aggregate_states), JSON.stringify(expectedAggregate), 'Aggregate state denominator');
  eq(r.open_denominators?.length, 7, 'Open denominator count');
  eq(new Set(r.open_denominators).size, 7, 'Open denominators must be unique');

  const expectedResult = {
    terminal_state: 'source_restricted_fund_specific_transition_mapping_unavailable',
    all_eighteen_slots_preserved: true,
    fund_specific_transition_chain_complete: false,
    lawful_industrial_policy_control_complete: false,
    capital_conversion_finding: false,
    favoritism_finding: false,
    extraction_finding: false,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  for (const [key, value] of Object.entries(r.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Boundary ${key}`);
    else eq(value, false, `Boundary ${key}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-rd02-sbicct-state-transitions@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 618, 'Schema issue');
  eq(schema.properties?.parent_issue?.const, 615, 'Schema parent issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F10', 'Schema lane');

  const computed = computeSbicTransitionsManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/report drift');

  const fixedCounts = {
    cohort_slots: 18,
    published_identity_slots: 17,
    withheld_slots: 1,
    fully_licensed_aggregate: 7,
    fund_specific_license_mappings: 0,
    fund_specific_leverage_commitments: 0,
    fund_specific_leverage_draws: 0,
    portfolio_investment_ledgers: 0,
    realized_performance_ledgers: 0,
    repayment_or_loss_ledgers: 0,
    public_recovery_ledgers: 0,
    open_denominators: 7,
    capital_conversion_findings: 0,
    favoritism_findings: 0,
    extraction_findings: 0,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(buildReport.counts?.[key], value, `Report count ${key}`);
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('ALL EIGHTEEN SLOTS PRESERVED'), 'HTML cohort denominator missing');
  check(html.includes('ONE WITHHELD ROW RETAINED'), 'HTML withheld-row boundary missing');
  check(html.includes('SEVEN AGGREGATE LICENSES NOT ASSIGNED TO FUNDS'), 'HTML aggregate-to-fund boundary missing');
  check(html.includes('DRAW, PERFORMANCE, REPAYMENT, AND PUBLIC RECOVERY UNRESOLVED'), 'HTML state-transition boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateSbicTransitions();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd02-sbicct-state-transitions: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd02-sbicct-state-transitions: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
