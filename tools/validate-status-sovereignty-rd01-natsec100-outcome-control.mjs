#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeNatSecOutcomeManifest } from './build-status-sovereignty-rd01-natsec100-outcome-control.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadNatSecOutcomeContext() {
  return {
    record: read('data/intake/status-sovereignty-rd01-natsec100-outcome-control.json'),
    schema: read('schemas/status-sovereignty-rd01-natsec100-outcome-control.schema.json'),
    manifest: read('data/project/status-sovereignty-rd01-natsec100-outcome-control-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/rd01-natsec100-outcome-control/index.html'), 'utf8')
  };
}

export function validateNatSecOutcomeControl(c = loadNatSecOutcomeContext()) {
  const errors = [];
  const eq = (actual, expected, label) => { if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`); };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;
  eq(r.schema_version, 'status-sovereignty-rd01-natsec100-outcome-control@1', 'Record schema');
  eq(r.execution_id, 'SSC-RD01-NATSEC100-OUTCOME-01', 'Execution identity');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 617, 'Issue identity');
  eq(r.parent_issue, 615, 'Parent issue identity');
  eq(r.lane_id, 'SSC-F09', 'Lane identity');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.parent_receipts?.length, 2, 'Parent receipt count');
  eq(JSON.stringify(r.selection_contract?.selected_rank_positions), JSON.stringify([1, 50, 100]), 'Selected rank positions');
  eq(r.selection_contract?.selected_sample_rule, 'fixed_rank_positions_top_middle_bottom', 'Sample selection rule');
  eq(r.selection_contract?.all_explicit_assessed_nonselection_examples_included, true, 'Nonselection inclusion');
  eq(r.selection_contract?.selected_because_expected_result, false, 'Expected-result selection boundary');
  eq(r.selection_contract?.post_publication_window_declared_sufficient_for_causal_inference, false, 'Post-publication window boundary');
  eq(r.sample?.length, 5, 'Sample row count');
  check(new Set(r.sample?.map((row) => row.sample_id)).size === 5, 'Sample IDs must be unique');
  check(new Set(r.sample?.map((row) => row.published_name)).size === 5, 'Sample names must be unique');
  const selected = r.sample?.filter((row) => row.selection_state === 'selected') ?? [];
  const nonselected = r.sample?.filter((row) => row.selection_state !== 'selected') ?? [];
  eq(selected.length, 3, 'Selected row count');
  eq(nonselected.length, 2, 'Nonselection row count');
  eq(JSON.stringify(selected.map((row) => row.rank)), JSON.stringify([1, 50, 100]), 'Selected rank order');
  eq(JSON.stringify(selected.map((row) => row.published_name)), JSON.stringify(['Anduril', 'Divergent', 'Harmonic']), 'Selected name order');
  eq(JSON.stringify(nonselected.map((row) => row.published_name)), JSON.stringify(['SpaceX', 'Anthropic']), 'Nonselection name order');
  check(selected.every((row) => row.prepublication_contracting_or_capital_is_scoring_input === true), 'Selected rows must preserve selector-input endogeneity');
  check(r.sample.every((row) => row.postpublication_capital_join === 'not_acquired'), 'Capital joins must remain open');
  check(r.sample.every((row) => row.postpublication_award_nonaward_join === 'not_acquired'), 'Award/nonaward joins must remain open');
  check(r.sample.every((row) => row.deployment_failure_exit_join === 'not_acquired'), 'Deployment/failure/exit joins must remain open');
  check(r.sample.every((row) => row.causal_effect_of_rank_identified === false), 'Rank causal effect must remain unidentified');
  eq(r.identification_limits?.length, 5, 'Identification-limit count');
  eq(new Set(r.identification_limits).size, 5, 'Identification limits must be unique');
  eq(r.open_denominators?.length, 6, 'Open denominator count');
  eq(new Set(r.open_denominators).size, 6, 'Open denominators must be unique');
  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    sample_denominator_frozen: true,
    matched_outcome_control_complete: false,
    selection_causation_supported: false,
    technical_superiority_finding: false,
    procurement_causation_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
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
  eq(schema.properties?.schema_version?.const, 'status-sovereignty-rd01-natsec100-outcome-control@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 617, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F09', 'Schema lane');
  const computed = computeNatSecOutcomeManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/report drift');
  const fixedCounts = {
    sample_rows: 5,
    selected_rows: 3,
    explicit_nonselection_rows: 2,
    exact_legal_entities_complete: 0,
    postpublication_capital_joins_complete: 0,
    postpublication_award_nonaward_joins_complete: 0,
    deployment_failure_exit_joins_complete: 0,
    matched_outcome_controls_complete: 0,
    identification_limits: 5,
    open_denominators: 6,
    selection_causation_findings: 0,
    technical_superiority_findings: 0,
    procurement_causation_findings: 0,
    coordination_findings: 0,
    common_purpose_findings: 0,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  for (const [key, value] of Object.entries(fixedCounts)) eq(buildReport.counts?.[key], value, `Report count ${key}`);
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('FIXED TOP–MIDDLE–BOTTOM SAMPLE'), 'HTML selection boundary missing');
  check(html.includes('ALL EXPLICIT NONSELECTION EXAMPLES INCLUDED'), 'HTML nonselection boundary missing');
  check(html.includes('POST-PUBLICATION OUTCOMES OPEN'), 'HTML outcome boundary missing');
  check(html.includes('RANKING CAUSATION NOT IDENTIFIED'), 'HTML causal boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateNatSecOutcomeControl();
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd01-natsec100-outcome-control: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd01-natsec100-outcome-control: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
