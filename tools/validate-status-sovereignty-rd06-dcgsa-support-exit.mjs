#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDcgsaSupportManifest, locateDcgsaSupportSource } from './build-status-sovereignty-rd06-dcgsa-support-exit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadDcgsaSupportContext() {
  const sourcePath = locateDcgsaSupportSource();
  return {
    sourcePath,
    source: read(sourcePath),
    schema: read('schemas/status-sovereignty-rd06-dcgsa-support-exit.schema.json'),
    manifest: read('data/project/status-sovereignty-rd06-dcgsa-support-exit-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/rd06-dcgsa-support-exit/index.html'), 'utf8')
  };
}

export function validateDcgsaSupportExit(c = loadDcgsaSupportContext()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { sourcePath, source, schema, manifest, buildManifest, buildReport, publicReport, html } = c;
  const text = JSON.stringify(source);
  check(/data\/(intake|research)\//.test(sourcePath), 'Source ledger must remain in intake or research custody');
  for (const token of ['Palantir', 'Raytheon', 'General Dynamics']) check(text.includes(token), `Source ledger missing ${token}`);
  eq(schema.properties?.schema_version?.const, 'status-sovereignty-rd06-dcgsa-support-exit@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 622, 'Schema issue');
  eq(schema.properties?.parent_issue?.const, 615, 'Schema parent issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F13', 'Schema lane');

  const computed = computeDcgsaSupportManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/report drift');
  const r = buildReport;
  eq(r.schema_version, 'status-sovereignty-rd06-dcgsa-support-exit@1', 'Report schema');
  eq(r.execution_id, 'SSC-RD06-DCGSA-SUPPORT-EXIT-01', 'Execution identity');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 622, 'Issue identity');
  eq(r.parent_issue, 615, 'Parent issue identity');
  eq(r.lane_id, 'SSC-F13', 'Lane identity');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.source_ledger_path, sourcePath, 'Source ledger path');
  eq(r.counts?.source_records, Array.isArray(source.sources) ? source.sources.length : 1, 'Source record count');
  const fixedCounts = {
    later_proposals_received: 8,
    publicly_named_offerors: 3,
    unresolved_offeror_identities: 5,
    awardees: 2,
    named_rejected_offerors: 1,
    live_demonstration_tasks: 32,
    approximate_performance_requirements: 70,
    external_judicial_corrections: 1,
    fielded_systems_fy2021: 879,
    fielded_maneuver_battalions: 402,
    published_operational_test_result_sets: 0,
    complete_support_differentials: 0,
    complete_data_rights_records: 0,
    complete_substitution_or_exit_records: 0,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(r.counts?.[key], value, `Report count ${key}`);
  for (const [key, value] of Object.entries(r.identification_floor ?? {})) eq(value, false, `Identification floor ${key}`);
  const expectedResult = {
    terminal_state: 'partial_option_universe_and_continuity_recovered_foreclosure_unresolved',
    external_correction_control_retained: true,
    later_competition_control_retained: true,
    support_asymmetry_finding: false,
    counterfactual_foreclosure_finding: false,
    technical_superiority_finding: false,
    favoritism_finding: false,
    unavoidable_dependency_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
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
  check(html.includes('EIGHT PROPOSALS'), 'HTML proposal denominator missing');
  check(html.includes('FIVE OFFEROR IDENTITIES UNRESOLVED'), 'HTML offeror-identity boundary missing');
  check(html.includes('EXTERNAL CORRECTION RETAINED'), 'HTML correction control missing');
  check(html.includes('OPERATIONAL TEST RESULTS, SUPPORT DIFFERENTIALS, DATA RIGHTS, SUBSTITUTION, AND EXIT OPEN'), 'HTML open-denominator boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateDcgsaSupportExit();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd06-dcgsa-support-exit: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd06-dcgsa-support-exit: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
