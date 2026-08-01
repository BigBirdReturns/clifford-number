#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSnapGateManifest } from './build-status-sovereignty-f02-snap.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadSnapGateContext() {
  return {
    record: read('data/intake/status-sovereignty-f02-snap-gate-first-pass.json'),
    schema: read('schemas/status-sovereignty-institutional-gate-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-f02-snap-gate-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/f02-snap/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/f02-snap/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/f02-snap/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/f02-snap/index.html'), 'utf8')
  };
}

export function validateSnapGate(c = loadSnapGateContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(r.schema_version, 'status-sovereignty-institutional-gate-first-pass@1', 'Record schema');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 543, 'Issue identity');
  eq(r.observation_id, 'SSC-OBS-0016', 'Observation identity');
  eq(r.lane_id, 'SSC-F02', 'Lane identity');
  eq(r.status, 'candidate_institutional_gate_selected_source_denominator_incomplete', 'Record status');
  eq(r.authority, 'source_acquisition_only_not_review_or_adjudication', 'Authority ceiling');
  eq(r.selection_contract?.selected_because_expected_to_confirm_hypothesis, false, 'Selection expectation boundary');
  check(r.selection_contract?.declared_universe?.includes('Federal SNAP'), 'Declared selection universe missing');

  eq(r.sources?.length, 7, 'Source count');
  check(new Set(r.sources?.map((row) => row.source_id)).size === 7, 'Source IDs must be unique');
  check(new Set(r.sources?.map((row) => row.url)).size === 7, 'Source URLs must be unique');
  const expectedSourceClasses = [
    'official_current_implementation_index',
    'official_program_and_population_synthesis',
    'official_deservingness_and_program_frame',
    'official_selector_and_consequence_description',
    'official_formal_correction_route',
    'official_program_evaluation_and_counterevidence',
    'official_selector_variation_study'
  ];
  eq(JSON.stringify(r.sources?.map((row) => row.source_class)), JSON.stringify(expectedSourceClasses), 'Source class order');
  for (const source of r.sources ?? []) {
    check(source.retrieved_facts?.length >= 2, `${source.source_id}: recovered facts missing`);
    check(source.url?.startsWith('https://'), `${source.source_id}: source URL must be HTTPS`);
  }

  const expectedGates = {
    'SSC-G1_status_and_deservingness': 'supported_bounded_frame',
    'SSC-G2_epistemic_admissibility': 'candidate_selector_variation_observed',
    'SSC-G3_material_conversion': 'benefit_time_limit_and_disqualification_instrument_observed',
    'SSC-G4_correction_monopoly': 'formal_fair_hearing_observed_practical_effectiveness_unresolved'
  };
  eq(JSON.stringify(r.four_gate_first_pass), JSON.stringify(expectedGates), 'Four-gate first pass');
  eq(r.open_denominators?.length, 7, 'Open denominator count');
  check(new Set(r.open_denominators).size === 7, 'Open denominators must be unique');
  check(r.candidate_terminal_states?.includes('ordinary_lawful_policy_explanation'), 'Ordinary-policy control state missing');
  check(r.candidate_terminal_states?.includes('racial_hierarchy_unsupported'), 'Unsupported racial-hierarchy state missing');
  check(r.candidate_terminal_states?.includes('requires_additional_acquisition'), 'Open acquisition state missing');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    racial_hierarchy_finding: false,
    unlawful_discrimination_finding: false,
    complete_compact_finding: false,
    prevalence_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  for (const [key, value] of Object.entries(r.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Boundary ${key}`);
    else eq(value, false, `Boundary ${key}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-institutional-gate-first-pass@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 543, 'Schema issue');
  eq(schema.properties?.lane_id?.const, 'SSC-F02', 'Schema lane');

  const computed = computeSnapGateManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte release manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F02-SNAP-01', 'Report identity');
  eq(buildReport.counts?.source_records, 7, 'Report source count');
  eq(buildReport.counts?.gate_states, 4, 'Report gate count');
  eq(buildReport.counts?.open_denominators, 7, 'Report open denominator count');
  eq(buildReport.counts?.bounded_status_frames, 1, 'Report status-frame count');
  eq(buildReport.counts?.selector_variation_controls, 1, 'Report selector-variation count');
  eq(buildReport.counts?.material_benefit_gates, 1, 'Report material-gate count');
  eq(buildReport.counts?.formal_correction_routes, 1, 'Report formal correction count');
  eq(buildReport.counts?.practical_correction_effectiveness_complete, 0, 'Report practical correction completion');
  eq(buildReport.counts?.program_evaluation_counterevidence, 1, 'Report counterevidence count');
  for (const key of ['racial_hierarchy_findings', 'unlawful_discrimination_findings', 'complete_compact_findings', 'prevalence_findings', 'graph_effects', 'publication_effects']) {
    eq(buildReport.counts?.[key], 0, `Report count ${key}`);
  }
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');
  check(html.includes('PRACTICAL CORRECTION UNRESOLVED'), 'HTML correction boundary missing');
  check(html.includes('RACIAL HIERARCHY NOT ESTABLISHED'), 'HTML racial-hierarchy boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateSnapGate();
  if (errors.length) {
    console.error(`validate-status-sovereignty-f02-snap: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-f02-snap: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
