#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeNatSec100FirstPassManifest } from './build-status-sovereignty-natsec100-first-pass.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadNatSec100FirstPassContext() {
  return {
    record: read('data/intake/status-sovereignty-natsec100-denominator-first-pass.json'),
    schema: read('schemas/status-sovereignty-natsec100-denominator-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-natsec100-denominator-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/natsec100-first-pass/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/natsec100-first-pass/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/natsec100-first-pass/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/natsec100-first-pass/index.html'), 'utf8')
  };
}

export function validateNatSec100FirstPass(c = loadNatSec100FirstPassContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-open-obligation-first-pass@1', 'Record schema');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 540, 'Issue identity');
  eq(r.observation_id, 'SSC-OBS-0007', 'Observation identity');
  eq(r.lane_id, 'SSC-F09', 'Lane identity');
  eq(r.status, 'published_selected_denominator_recovered_candidate_and_causal_denominators_open', 'Record status');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.parent_custody?.path, 'data/research/status-sovereignty-wave-01-targeted-acquisition.json', 'Parent custody path');
  eq(r.parent_custody?.state, 'partially_repaired_open', 'Parent custody state');

  eq(r.sources?.length, 1, 'Source count');
  const source = r.sources?.[0] ?? {};
  eq(source.source_id, 'SSC-NS100-FP-S001', 'Source identity');
  eq(source.source_class, 'first_party_methodology_and_selected_roster', 'Source class');
  check(source.url?.startsWith('https://'), 'Source URL must be HTTPS');
  eq(source.retrieved_facts?.length, 5, 'Recovered fact count');
  eq(source.does_not_support?.length, 8, 'Source-limit count');
  check(new Set(source.does_not_support).size === 8, 'Source limits must be unique');

  const expectedRecovered = {
    published_selected_rows: 100,
    explicit_assessed_nonselection_examples: 2,
    complete_candidate_rows: null,
    complete_rejected_rows: null,
    exact_weights_published: false,
    reproducible_scoring_data_published: false,
    FOCI_decision_records_published: false
  };
  eq(JSON.stringify(r.recovered_denominator), JSON.stringify(expectedRecovered), 'Recovered denominator');
  const expectedDownstream = {
    capital_denominator_complete: false,
    award_and_nonaward_denominator_complete: false,
    deployment_and_failure_denominator_complete: false,
    exit_denominator_complete: false,
    matched_nonselected_controls_complete: false,
    causal_join_generated: false
  };
  eq(JSON.stringify(r.downstream_join_state), JSON.stringify(expectedDownstream), 'Downstream join state');
  eq(r.next_acquisitions?.length, 6, 'Next-acquisition count');
  check(new Set(r.next_acquisitions).size === 6, 'Next acquisitions must be unique');
  check(r.allowed_terminal_states?.includes('ordinary_recognition_or_market_explanation'), 'Ordinary-recognition control state missing');
  check(r.allowed_terminal_states?.includes('selection_causation_unsupported'), 'Unsupported-causation state missing');
  check(r.allowed_terminal_states?.includes('requires_additional_acquisition'), 'Open acquisition state missing');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    racial_order_finding: false,
    prevalence_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  for (const [key, value] of Object.entries(r.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Boundary ${key}`);
    else eq(value, false, `Boundary ${key}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-open-obligation-first-pass@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 540, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F09', 'Schema lane');

  const computed = computeNatSec100FirstPassManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F09-NS100-01', 'Report identity');
  const fixedCounts = {
    source_records: 1,
    published_selected_rows: 100,
    explicit_assessed_nonselection_examples: 2,
    complete_candidate_denominators: 0,
    complete_rejected_denominators: 0,
    exact_weights_published: 0,
    reproducible_scoring_data_published: 0,
    FOCI_decision_records_published: 0,
    capital_denominators_complete: 0,
    award_nonaward_denominators_complete: 0,
    deployment_failure_denominators_complete: 0,
    exit_denominators_complete: 0,
    matched_nonselected_controls_complete: 0,
    causal_joins_generated: 0,
    next_acquisitions: 6,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    racial_order_findings: 0,
    prevalence_findings: 0,
    coordination_findings: 0,
    common_purpose_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(buildReport.counts?.[key], value, `Report count ${key}`);
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('CANDIDATE UNIVERSE OPEN'), 'HTML candidate-denominator boundary missing');
  check(html.includes('CAUSAL JOINS ZERO'), 'HTML causal boundary missing');
  check(html.includes('TECHNICAL SUPERIORITY NOT ESTABLISHED'), 'HTML superiority boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateNatSec100FirstPass();
  if (errors.length) {
    console.error(`validate-status-sovereignty-natsec100-first-pass: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-natsec100-first-pass: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
