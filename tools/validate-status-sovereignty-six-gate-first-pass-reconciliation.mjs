#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSixGateFirstPassManifest } from './build-status-sovereignty-six-gate-first-pass-reconciliation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const expectedReceipts = [
  {
    gate_id: 'SSC-F09-NATSEC100-01', issue: 540, pr: 554, lane_id: 'SSC-F09', observation_id: 'SSC-OBS-0007', first_pass_id: 'SSC-F09-NS100-01',
    review_head: '4096a3e9b8b726387305dec07a43a2036e5f50bd', merge_commit: '2362f4357bf58d388dad11f38bcac62f580ce89b',
    source_path: 'data/intake/status-sovereignty-natsec100-denominator-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-natsec100-denominator-first-pass-release-manifest.json',
    release_sha256: '84f9d42f54b362a12df84b1ad711f48925c9604f43c06e76e5110666f28137bb', source_records: 1,
    residual_field: 'next_acquisitions', residual_denominator_classes: 6, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: []
  },
  {
    gate_id: 'SSC-F10-SBICCT-01', issue: 541, pr: 555, lane_id: 'SSC-F10', observation_id: 'SSC-OBS-0008', first_pass_id: 'SSC-F10-SBICCT-01',
    review_head: '6c7bd2cc89554e4fa005e5cced7bb374a7a0e61b', merge_commit: '97c895626179a0442b084ca423f222ad57d9dcee',
    source_path: 'data/intake/status-sovereignty-sbicct-denominator-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-sbicct-denominator-first-pass-release-manifest.json',
    release_sha256: '3196cf619a67c8e95e89ee28376bc79c42b039efa469089fa982bc79785ddd1d', source_records: 3,
    residual_field: 'open_denominators', residual_denominator_classes: 7, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: []
  },
  {
    gate_id: 'SSC-F10-OSC-01', issue: 542, pr: 556, lane_id: 'SSC-F10', observation_id: 'SSC-OBS-0009', first_pass_id: 'SSC-F10-OSC-01',
    review_head: '3af1d26741ff6cb38a172d662fbaf56ddef56906', merge_commit: '3c1d87c946364a528f924f2f0d340b1528da1b50',
    source_path: 'data/intake/status-sovereignty-osc-denominator-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-osc-denominator-first-pass-release-manifest.json',
    release_sha256: '64f0767bde63e2f73f827803b0c548accff9571d9c9495cd8b530303b210adc0', source_records: 6,
    residual_field: 'open_denominators', residual_denominator_classes: 8, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: []
  },
  {
    gate_id: 'SSC-F02-SNAP-01', issue: 543, pr: 557, lane_id: 'SSC-F02', observation_id: 'SSC-OBS-0016', first_pass_id: 'SSC-F02-SNAP-01',
    review_head: 'acfd5a55c97cb3299d86c88ae3569cf8fb607212', merge_commit: 'ae330857de6ab9871969bc3daa97a9294f70057c',
    source_path: 'data/intake/status-sovereignty-f02-snap-gate-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-f02-snap-gate-first-pass-release-manifest.json',
    release_sha256: 'c412e2732d39a57b38311e68318199f6d8206e048d237987828a64f7f7b6c15e', source_records: 7,
    residual_field: 'open_denominators', residual_denominator_classes: 7, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: []
  },
  {
    gate_id: 'SSC-F04-ACES-01', issue: 544, pr: 558, lane_id: 'SSC-F04', observation_id: 'SSC-OBS-0018', first_pass_id: 'SSC-F04-ACES-01',
    review_head: '60c5f74c7650e8494ffb979da46f5b4d713b457a', merge_commit: 'b1d289c7b90b4635b5f2005683c0a0cf267202ba',
    source_path: 'data/intake/status-sovereignty-f04-aces-governance-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-f04-aces-governance-first-pass-release-manifest.json',
    release_sha256: 'f13e69e86317733d50e4e5fe41fbfa804d80b7ee3170b0a89d6d564cf78a4e66', source_records: 4,
    residual_field: 'open_denominators', residual_denominator_classes: 6, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: ['bounded_non_link_observed']
  },
  {
    gate_id: 'SSC-F13-DCGSA-01', issue: 545, pr: 559, lane_id: 'SSC-F13', observation_id: 'SSC-OBS-0021', first_pass_id: 'SSC-F13-DCGSA-01',
    review_head: 'ab4e5bac9dfaa61c8f75a4b455ac04df0f146a45', merge_commit: '20845b8ce0ee610db302ecb0ef8d37a053771bf6',
    source_path: 'data/intake/status-sovereignty-f13-dcgsa-first-pass.json',
    release_manifest_path: 'data/project/status-sovereignty-f13-dcgsa-first-pass-release-manifest.json',
    release_sha256: '4fc7b373b8af9304015d2173370e7ed14d268960de2533d211a6b877362555e8', source_records: 4,
    residual_field: 'open_denominators', residual_denominator_classes: 8, terminal_state: 'requires_additional_acquisition', allowed_true_result_fields: ['external_correction_control_retained']
  }
];

const expectedAtlas = [
  ['selector_candidate_rejection_and_downstream_outcomes', 'SSC-F09-NATSEC100-01', 6],
  ['fund_applicant_leverage_performance_and_public_recovery', 'SSC-F10-SBICCT-01', 7],
  ['applicant_underwriting_instrument_disbursement_and_recovery', 'SSC-F10-OSC-01', 8],
  ['affected_person_implementation_outcomes_and_practical_correction', 'SSC-F02-SNAP-01', 7],
  ['roster_authority_outputs_affected_parties_and_remedies', 'SSC-F04-ACES-01', 6],
  ['option_support_evaluation_performance_substitution_and_exit', 'SSC-F13-DCGSA-01', 8]
].map(([class_id, gate_id, count]) => ({ class_id, gate_id, count }));

export function loadSixGateFirstPassContext() {
  const record = read('data/intake/status-sovereignty-six-gate-first-pass-reconciliation.json');
  const laneSources = {};
  const laneManifests = {};
  for (const receipt of record.gate_receipts) {
    laneSources[receipt.gate_id] = read(receipt.source_path);
    laneManifests[receipt.gate_id] = read(receipt.release_manifest_path);
  }
  return {
    record,
    schema: read('schemas/status-sovereignty-six-gate-first-pass-reconciliation.schema.json'),
    manifest: read('data/project/status-sovereignty-six-gate-first-pass-reconciliation-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/six-gate-first-pass/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/six-gate-first-pass/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/six-gate-first-pass/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/six-gate-first-pass/index.html'), 'utf8'),
    laneSources,
    laneManifests
  };
}

export function validateSixGateFirstPass(c = loadSixGateFirstPassContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const { record: r, schema, manifest, buildManifest, buildReport, publicReport, html, laneSources, laneManifests } = c;

  eq(r.schema_version, 'status-sovereignty-six-gate-first-pass-reconciliation@1', 'Record schema');
  eq(r.reconciliation_id, 'SSC-FANOUT-R01', 'Reconciliation identity');
  eq(r.hypothesis_id, 'SSC-H01', 'Hypothesis identity');
  eq(r.issue, 607, 'Issue identity');
  eq(r.as_of, '2026-08-01', 'Reconciliation date');
  eq(r.authority, 'cross_lane_source_acquisition_reconciliation_not_review_or_adjudication', 'Authority ceiling');
  eq(JSON.stringify(r.parent_program), JSON.stringify({ program_issue: 468, wave_issue: 508, first_pass_issue_range: '540-545' }), 'Parent program');

  eq(r.gate_receipts?.length, 6, 'Gate receipt count');
  const uniquenessFields = ['gate_id', 'issue', 'pr', 'review_head', 'merge_commit', 'source_path', 'release_manifest_path', 'release_sha256'];
  for (const field of uniquenessFields) eq(new Set((r.gate_receipts ?? []).map((row) => row[field])).size, 6, `Gate receipt ${field} uniqueness`);

  for (const [index, expected] of expectedReceipts.entries()) {
    const receipt = r.gate_receipts?.[index] ?? {};
    for (const [key, value] of Object.entries(expected)) eq(JSON.stringify(receipt[key]), JSON.stringify(value), `Gate ${index + 1} ${key}`);
    check(Array.isArray(receipt.retained_controls) && receipt.retained_controls.length > 0, `Gate ${index + 1} retained controls missing`);
    const source = laneSources?.[expected.gate_id] ?? {};
    const laneManifest = laneManifests?.[expected.gate_id] ?? {};
    eq(source.sources?.length, expected.source_records, `Gate ${index + 1} observed source count`);
    eq(source.current_result?.terminal_state, expected.terminal_state, `Gate ${index + 1} observed terminal state`);
    eq(source.current_result?.graph_effect, 'none', `Gate ${index + 1} observed graph effect`);
    eq(source.current_result?.publication_effect, 'none', `Gate ${index + 1} observed publication effect`);
    const residual = source[expected.residual_field];
    eq(Array.isArray(residual) ? residual.length : null, expected.residual_denominator_classes, `Gate ${index + 1} observed residual count`);
    eq(laneManifest.combined_sha256, expected.release_sha256, `Gate ${index + 1} release digest`);
    eq(laneManifest.hypothesis_id, 'SSC-H01', `Gate ${index + 1} manifest hypothesis`);
    eq(laneManifest.first_pass_id, expected.first_pass_id, `Gate ${index + 1} manifest first-pass identity`);
    const observedTrueFields = Object.entries(source.current_result ?? {})
      .filter(([, value]) => value === true)
      .map(([key]) => key)
      .sort();
    eq(JSON.stringify(observedTrueFields), JSON.stringify([...expected.allowed_true_result_fields].sort()), `Gate ${index + 1} allowed true result fields`);
  }

  eq(JSON.stringify(r.residual_denominator_atlas), JSON.stringify(expectedAtlas), 'Residual denominator atlas');
  eq(new Set((r.residual_denominator_atlas ?? []).map((row) => row.class_id)).size, 6, 'Residual atlas class uniqueness');
  eq(new Set((r.residual_denominator_atlas ?? []).map((row) => row.gate_id)).size, 6, 'Residual atlas gate uniqueness');
  eq((r.residual_denominator_atlas ?? []).reduce((sum, row) => sum + row.count, 0), 42, 'Residual atlas total');

  const expectedCounts = {
    first_pass_lanes_completed: 6,
    first_pass_issues_closed_completed: 6,
    source_records: 25,
    terminal_requires_additional_acquisition: 6,
    residual_denominator_classes: 42,
    residual_evidence_obligations_closed: 0,
    reviewed_disposition_changes: 0,
    complete_compact_findings: 0,
    racial_order_findings: 0,
    prevalence_findings: 0,
    coordination_findings: 0,
    common_purpose_findings: 0,
    personal_hostility_findings: 0,
    graph_effects: 0,
    publication_effects: 0
  };
  eq(JSON.stringify(r.counts), JSON.stringify(expectedCounts), 'Reconciliation counts');
  eq((r.gate_receipts ?? []).reduce((sum, row) => sum + row.source_records, 0), 25, 'Gate source total');
  eq((r.gate_receipts ?? []).reduce((sum, row) => sum + row.residual_denominator_classes, 0), 42, 'Gate residual total');

  const expectedResult = {
    terminal_state: 'six_first_pass_transactions_complete_residual_denominators_open',
    all_six_first_pass_receipts_present: true,
    cross_lane_empirical_authority_shared: false,
    reviewed_disposition_changed: false,
    complete_compact_finding: false,
    racial_order_finding: false,
    prevalence_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    personal_hostility_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(r.current_result), JSON.stringify(expectedResult), 'Current result');
  for (const [key, value] of Object.entries(r.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `Boundary ${key}`);
    else eq(value, false, `Boundary ${key}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-six-gate-first-pass-reconciliation@1', 'Schema identity');
  eq(schema.properties?.issue?.const, 607, 'Schema issue');
  eq(schema.properties?.gate_receipts?.minItems, 6, 'Schema gate minimum');
  eq(schema.properties?.residual_denominator_atlas?.minItems, 6, 'Schema atlas minimum');
  eq(schema.properties?.counts?.properties?.residual_denominator_classes?.const, 42, 'Schema residual total');

  const computed = computeSixGateFirstPassManifest();
  eq(JSON.stringify(manifest), JSON.stringify(computed), 'Exact-byte reconciliation manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'Build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'Build/public report drift');
  eq(buildReport.reconciliation_id, 'SSC-FANOUT-R01', 'Report identity');
  eq(buildReport.counts?.first_pass_lanes_completed, 6, 'Report completed lanes');
  eq(buildReport.counts?.source_records, 25, 'Report source count');
  eq(buildReport.counts?.residual_denominator_classes, 42, 'Report residual count');
  eq(buildReport.counts?.residual_evidence_obligations_closed, 0, 'Report residual closure count');
  eq(buildReport.counts?.retained_control_statements, 14, 'Report retained-control count');
  eq(buildReport.counts?.exact_lane_release_receipts, 6, 'Report exact lane receipt count');
  eq(buildReport.counts?.intake_source_receipts, 6, 'Report intake receipt count');
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'Report release digest');

  check(html.includes('6/6 FIRST-PASS RECEIPTS'), 'HTML gate receipt boundary missing');
  check(html.includes('42 RESIDUAL CLASSES'), 'HTML residual denominator boundary missing');
  check(html.includes('0 RESIDUAL OBLIGATIONS CLOSED'), 'HTML residual closure boundary missing');
  check(html.includes('0 COMPLETE-COMPACT FINDINGS'), 'HTML compact boundary missing');
  check(html.includes(manifest.combined_sha256), 'HTML release digest missing');
  check(html.includes('noindex,nofollow'), 'HTML noindex boundary missing');
  return errors;
}

function main() {
  const errors = validateSixGateFirstPass();
  if (errors.length) {
    console.error(`validate-status-sovereignty-six-gate-first-pass-reconciliation: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-six-gate-first-pass-reconciliation: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
