#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDcgsAFirstPassManifest } from './build-status-sovereignty-f13-dcgsa.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadDcgsAFirstPassContext() {
  return {
    record: read('data/intake/status-sovereignty-f13-dcgsa-first-pass.json'),
    schema: read('schemas/status-sovereignty-counterfactual-foreclosure-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-f13-dcgsa-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/f13-dcgsa/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/f13-dcgsa/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/f13-dcgsa/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/f13-dcgsa/index.html'), 'utf8')
  };
}

export function validateDcgsAFirstPass(c = loadDcgsAFirstPassContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-counterfactual-foreclosure-first-pass@1', 'Record schema');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 545, 'Issue identity');
  eq(r.observation_id, 'SSC-OBS-0021', 'Observation identity');
  eq(r.lane_id, 'SSC-F13', 'Lane identity');
  eq(r.status, 'multi_architecture_and_correction_chronology_recovered_foreclosure_not_established', 'Record status');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');

  eq(r.sources?.length, 4, 'Source count');
  check(new Set(r.sources?.map((row) => row.source_id)).size === 4, 'Source IDs must be unique');
  check(new Set(r.sources?.map((row) => row.url)).size === 4, 'Source URLs must be unique');
  const expectedSourceClasses = [
    'official_requirement_and_market_research_claim',
    'official_preaward_protest_decision',
    'official_judicial_correction_record',
    'official_later_competition_and_evaluation_decision'
  ];
  eq(JSON.stringify(r.sources?.map((row) => row.source_class)), JSON.stringify(expectedSourceClasses), 'Source class order');
  for (const source of r.sources ?? []) {
    check(source.retrieved_facts?.length >= 3, `${source.source_id}: recovered facts missing`);
    check(source.url?.startsWith('https://'), `${source.source_id}: source URL must be HTTPS`);
  }

  const expectedDates = ['2015-12-23', '2016-05-18', '2016-10-31', '2018-03-08', '2018-07-02', '2018-09-13'];
  eq(r.chronology?.length, 6, 'Chronology count');
  eq(JSON.stringify(r.chronology?.map((row) => row.date)), JSON.stringify(expectedDates), 'Chronology order');
  check(r.chronology?.every((row) => row.event?.length > 20), 'Chronology events must remain substantive');

  const expectedFindings = {
    multiple_architectures_and_offerors_observed: true,
    commercial_item_question_was_contested: true,
    external_judicial_correction_observed: true,
    later_competition_and_evaluation_observed: true,
    complete_initial_option_universe: false,
    comparable_data_and_test_access: false,
    public_support_differential_recovered: false,
    complete_performance_and_failure_ledger: false,
    later_necessity_or_no_alternative_claim_recovered: false,
    practical_substitution_and_exit_denominator: false,
    counterfactual_foreclosure_supported: false
  };
  eq(JSON.stringify(r.first_pass_findings), JSON.stringify(expectedFindings), 'First-pass findings');
  eq(r.open_denominators?.length, 8, 'Open denominator count');
  check(new Set(r.open_denominators).size === 8, 'Open denominators must be unique');
  check(r.candidate_terminal_states?.includes('open_competition_and_effective_review_control'), 'External-review control terminal state missing');
  check(r.candidate_terminal_states?.includes('requires_additional_acquisition'), 'Open acquisition terminal state missing');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    external_correction_control_retained: true,
    foreclosure_finding: false,
    technical_superiority_finding: false,
    favoritism_finding: false,
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

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-counterfactual-foreclosure-first-pass@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 545, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F13', 'Schema lane');

  const computed = computeDcgsAFirstPassManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F13-DCGSA-01', 'Report identity');
  eq(buildReport.counts?.source_records, 4, 'Report source count');
  eq(buildReport.counts?.chronology_events, 6, 'Report chronology count');
  eq(buildReport.counts?.open_denominators, 8, 'Report open denominator count');
  eq(buildReport.counts?.external_correction_controls, 1, 'Report external correction count');
  eq(buildReport.counts?.later_competition_controls, 1, 'Report later competition count');
  for (const key of ['foreclosure_findings', 'technical_superiority_findings', 'favoritism_findings', 'coordination_findings', 'common_purpose_findings', 'complete_compact_findings', 'graph_effects', 'publication_effects']) {
    eq(buildReport.counts?.[key], 0, `Report count ${key}`);
  }
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('FORECLOSURE NOT ESTABLISHED'), 'HTML foreclosure boundary missing');
  check(html.includes('JUDICIAL CORRECTION RETAINED'), 'HTML correction control missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateDcgsAFirstPass();
  if (errors.length) {
    console.error(`validate-status-sovereignty-f13-dcgsa: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-f13-dcgsa: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
