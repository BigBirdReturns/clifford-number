#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeOscLifecycleManifest, locateOscLifecycleSource } from './build-status-sovereignty-rd03-osc-lifecycle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadOscLifecycleContext() {
  const sourcePath = locateOscLifecycleSource();
  return {
    sourcePath,
    source: read(sourcePath),
    schema: read('schemas/status-sovereignty-rd03-osc-lifecycle.schema.json'),
    manifest: read('data/project/status-sovereignty-rd03-osc-lifecycle-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/rd03-osc-lifecycle/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/rd03-osc-lifecycle/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/rd03-osc-lifecycle/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/rd03-osc-lifecycle/index.html'), 'utf8')
  };
}

export function validateOscLifecycle(c = loadOscLifecycleContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { sourcePath, source, schema, manifest, buildManifest, buildReport, publicReport, html } = c;
  const sourceText = JSON.stringify(source);

  check(/data\/(intake|research)\//.test(sourcePath), 'Source ledger must remain in intake or research custody');
  for (const token of ['MP Materials', 'Vulcan Elements', 'ReElement Technologies', 'Phoenix Tailings', 'Energy Fuels']) {
    check(sourceText.includes(token), `Source ledger missing ${token}`);
  }
  for (const amount of ['150000000', '620000000', '80000000', '500000000', '725000000']) {
    check(sourceText.includes(amount) || sourceText.includes(Number(amount).toLocaleString('en-US')), `Source ledger missing amount ${amount}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-rd03-osc-lifecycle@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 619, 'Schema issue');
  eq(schema.properties?.parent_issue?.const, 615, 'Schema parent issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F10', 'Schema lane');

  const computed = computeOscLifecycleManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/report drift');

  const r = buildReport;
  eq(r.schema_version, 'status-sovereignty-rd03-osc-lifecycle@1', 'Report schema');
  eq(r.execution_id, 'SSC-RD03-OSC-LIFECYCLE-01', 'Execution identity');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 619, 'Issue identity');
  eq(r.parent_issue, 615, 'Parent issue identity');
  eq(r.lane_id, 'SSC-F10', 'Lane identity');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.source_ledger_path, sourcePath, 'Source ledger path');

  const expectedCounts = {
    source_records: 9,
    named_instruments: 5,
    executed_loans: 1,
    cash_disbursements_observed: 1,
    conditional_preclose_commitments: 4,
    milestone_records_observed: 0,
    repayments_observed: 0,
    public_recoveries_observed: 0,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  eq(JSON.stringify(r.counts), JSON.stringify(expectedCounts), 'Report counts');

  eq(r.instrument_states?.length, 5, 'Instrument-state denominator');
  const names = r.instrument_states?.map((row) => row.name) ?? [];
  eq(new Set(names).size, 5, 'Instrument names must be unique');
  const mp = r.instrument_states?.find((row) => row.name === 'MP Materials');
  check(Boolean(mp), 'MP Materials state missing');
  eq(mp?.legal_state, 'executed_direct_loan', 'MP Materials legal state');
  eq(mp?.cash_disbursement_observed, true, 'MP Materials cash state');
  const conditional = r.instrument_states?.filter((row) => row.legal_state === 'conditional_preclose_commitment') ?? [];
  eq(conditional.length, 4, 'Conditional commitment denominator');
  check(conditional.every((row) => row.cash_disbursement_observed === false), 'Conditional commitments may not claim cash disbursement');
  check(r.instrument_states?.every((row) => row.repayment_observed === false), 'Repayment must remain unobserved');
  check(r.instrument_states?.every((row) => row.public_recovery_observed === false), 'Public recovery must remain unobserved');

  const expectedResult = {
    terminal_state: 'partial_lifecycle_one_disbursed_four_preclose_recovery_open',
    reviewed_disposition_changed: false,
    complete_underwriting_to_recovery_chain: false,
    favoritism_finding: false,
    extraction_finding: false,
    complete_compact_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  for (const [key, value] of Object.entries(r.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Boundary ${key}`);
    else eq(value, false, `Boundary ${key}`);
  }

  eq(r.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('ONE EXECUTED AND CASH-DISBURSED LOAN'), 'HTML executed-loan boundary missing');
  check(html.includes('FOUR CONDITIONAL PRE-CLOSE COMMITMENTS'), 'HTML conditional-state boundary missing');
  check(html.includes('REPAYMENT AND PUBLIC RECOVERY UNOBSERVED'), 'HTML recovery boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateOscLifecycle();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd03-osc-lifecycle: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd03-osc-lifecycle: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
