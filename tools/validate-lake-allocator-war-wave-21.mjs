#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digest = value => crypto.createHash('sha256').update(
  Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))
).digest('hex');
const unique = values => new Set(values).size === values.length;
const WAVE36_ROUTES = [
  'internal-authority-and-inventory',
  'public-award-and-contract-denominators',
  'published-enforcement-and-action-registers',
  'correction-dockets-and-outcomes',
  'protected-personnel-records',
  'affected-comparator-and-distributional-joins',
  'financial-recovery-and-continuity'
];
function wave36PathContract(wave36Policy, wave36Plan) {
  const routePaths = WAVE36_ROUTES.map(route => `${wave36Policy.paths.result_root}/${route}.jsonl`);
  const snapshotPaths = wave36Plan.source_specs.map(row => row.storage_path);
  const sourcePaths = [
    'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json',
    'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json',
    wave36Policy.paths.capture_ledger,
    wave36Policy.paths.record_ledger,
    ...routePaths,
    ...snapshotPaths,
    wave36Policy.paths.method,
    wave36Policy.paths.milestone
  ];
  return { routePaths, snapshotPaths, sourcePaths, permanentPaths: [...sourcePaths, wave36Policy.paths.projection, wave36Policy.paths.report] };
}
function ensureCommit(root, commit) {
  if (process.env.LAW_SKIP_GIT === '1') return;
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root, stdio: 'ignore' });
  } catch {
    execFileSync('git', ['fetch', 'origin', commit, '--depth=1'], { cwd: root, stdio: 'ignore' });
  }
}
function gitShow(root, commit, relative) {
  ensureCommit(root, commit);
  return execFileSync('git', ['show', `${commit}:${relative}`], {
    cwd: root,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024
  });
}
function graphDigests(root) {
  return {
    participation_sha256: digest(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}
function fail(errors, message) {
  errors.push(message);
}
export function validateArtifacts(state) {
  const { policy, observations, waterline, estates, programs, receipt, projection, reconciliation, wave36Policy, wave36Plan } = state;
  const errors = [];
  const expected = policy.expected_counts;
  const { sourcePaths: wave36SourcePaths, permanentPaths: wave36PermanentPaths } = wave36PathContract(wave36Policy, wave36Plan);

  if (policy.schema_version !== 'lake-allocator-war-wave-21-policy@1') fail(errors, 'policy schema drift');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'policy graph effect drift');
  if (policy.projection_contract.graph_effect !== 'none') fail(errors, 'projection contract graph effect drift');
  if (policy.projection_contract.cross_key_join_authorized !== false) fail(errors, 'projection contract cross-key join drift');
  if (policy.projection_contract.projection_hash_equality_required !== false) fail(errors, 'projection contract hash-equality drift');
  for (const key of ['gate_id', 'owner_program_id']) {
    if (!policy.projection_contract.target_identifier_keys.includes(key)) fail(errors, `${key}: projection contract target missing`);
  }
  if (policy.boundaries.repeated_gate_id_is_identical_assessment !== false) fail(errors, 'gate reference boundary drift');
  if (policy.boundaries.repeated_owner_program_id_is_graph_or_common_purpose !== false) fail(errors, 'owner reference boundary drift');
  if (policy.boundaries.wave_21_basin_paths_are_exact !== true) fail(errors, 'exact basin path boundary drift');
  const exactBasinPaths = new Map([
    ['allocator-war-source', [
      'data/project/lake-allocator-war-wave-21-policy.json',
      policy.paths.observation_registry,
      policy.paths.waterline_registry,
      policy.paths.estate_registry,
      policy.paths.program_registry,
      policy.paths.receipt,
      'docs/methods/lake-allocator-war-wave-21.md',
      'docs/milestones/lake-allocator-war-wave-21.md',
      'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
      'docs/methods/lake-allocator-war-estate-execution-wave-22.md',
      'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',
      'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
      'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',
      'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md',
      'data/project/lake-allocator-war-lead-execution-wave-24-policy.json',
      'data/project/lake-allocator-war-lead-execution-wave-24-source-plan.json',
      'docs/methods/lake-allocator-war-lead-execution-wave-24.md',
      'docs/milestones/lake-allocator-war-lead-execution-wave-24.md',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-01.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-02.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-03.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-04.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-06.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-07.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-08.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-09.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-10.jsonl',
      'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',
      'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json',
      'docs/methods/lake-allocator-war-denominator-closure-wave-25.md',
      'docs/milestones/lake-allocator-war-denominator-closure-wave-25.md',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-01.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-02.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-03.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-04.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-06.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-07.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-08.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-09.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-10.jsonl',
      'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',
      'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json',
      'data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json',
      'docs/methods/lake-allocator-war-targeted-closure-wave-26.md',
      'docs/milestones/lake-allocator-war-targeted-closure-wave-26.md',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-01.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-02.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-03.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-04.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-06.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-07.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-08.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-09.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-10.jsonl',
      'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',
      'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json',
      'docs/methods/lake-allocator-war-wave26-source-custody-repair.md',
      'docs/milestones/lake-allocator-war-wave26-source-custody-repair.md',
      'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json',
      'docs/methods/lake-allocator-war-public-interest-downstream-wave-27.md',
      'docs/milestones/lake-allocator-war-public-interest-downstream-wave-27.md',
      'data/acquisition/lake-allocator-war-wave-27/law21-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-27/law21-est-11.jsonl',
      'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json',
      'docs/methods/lake-allocator-war-public-interest-implementation-wave-28.md',
      'docs/milestones/lake-allocator-war-public-interest-implementation-wave-28.md',
      'data/acquisition/lake-allocator-war-wave-28/law28-est-04.jsonl',
      'data/acquisition/lake-allocator-war-wave-28/law28-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-28/law28-est-06.jsonl',
      'data/acquisition/lake-allocator-war-wave-28/law28-est-07.jsonl',
      'data/acquisition/lake-allocator-war-wave-28/law28-est-10.jsonl',
      'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json',
      'data/project/lake-allocator-war-public-interest-execution-wave-29-source-plan.json',
      'docs/methods/lake-allocator-war-public-interest-execution-wave-29.md',
      'docs/milestones/lake-allocator-war-public-interest-execution-wave-29.md',
      'data/acquisition/lake-allocator-war-wave-29/law28-est-04.jsonl',
      'data/acquisition/lake-allocator-war-wave-29/law28-est-05.jsonl',
      'data/acquisition/lake-allocator-war-wave-29/law28-est-06.jsonl',
      'data/acquisition/lake-allocator-war-wave-29/law28-est-07.jsonl',
      'data/acquisition/lake-allocator-war-wave-29/law28-est-10.jsonl',
      'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json',
      'docs/methods/lake-allocator-war-gap-fanout-wave-30.md',
      'docs/milestones/lake-allocator-war-gap-fanout-wave-30.md',
      'data/acquisition/lake-allocator-war-wave-30/protected-personnel-records.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/internal-authority-and-inventory.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/public-award-and-contract-denominators.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/published-enforcement-and-action-registers.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/correction-dockets-and-outcomes.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/affected-comparator-and-distributional-joins.jsonl',
      'data/acquisition/lake-allocator-war-wave-30/financial-recovery-and-continuity.jsonl',
      'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json',
      'data/project/lake-allocator-war-public-route-execution-wave-31-source-plan.json',
      'docs/methods/lake-allocator-war-public-route-execution-wave-31.md',
      'docs/milestones/lake-allocator-war-public-route-execution-wave-31.md',
      'data/acquisition/lake-allocator-war-wave-31/affected-comparator-and-distributional-joins.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/correction-dockets-and-outcomes.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/financial-recovery-and-continuity.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/internal-authority-and-inventory.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/protected-personnel-records.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/public-award-and-contract-denominators.jsonl',
      'data/acquisition/lake-allocator-war-wave-31/published-enforcement-and-action-registers.jsonl',
      'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
      'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-plan.json',
      'data/acquisition/lake-allocator-war-wave-32/snapshot-ledger.jsonl',
      'data/acquisition/lake-allocator-war-wave-32/snapshots/',
      'data/acquisition/lake-allocator-war-wave-32/routes/',
      'docs/methods/lake-allocator-war-bounded-source-snapshots-wave-32.md',
      'docs/milestones/lake-allocator-war-bounded-source-snapshots-wave-32.md',
      'data/project/lake-allocator-war-structural-parses-wave-33-policy.json',
      'data/project/lake-allocator-war-structural-parses-wave-33-plan.json',
      'data/acquisition/lake-allocator-war-wave-33/parse-ledger.jsonl',
      'docs/methods/lake-allocator-war-structural-parses-wave-33.md',
      'docs/milestones/lake-allocator-war-structural-parses-wave-33.md',
      'data/project/lake-allocator-war-schema-joins-wave-34-policy.json',
      'data/project/lake-allocator-war-schema-joins-wave-34-plan.json',
      'data/acquisition/lake-allocator-war-wave-34/schema-adapter-ledger.jsonl',
      'data/acquisition/lake-allocator-war-wave-34/lawful-join-contract-ledger.jsonl',
      'docs/methods/lake-allocator-war-schema-joins-wave-34.md',
      'docs/milestones/lake-allocator-war-schema-joins-wave-34.md',
      'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
      'data/acquisition/lake-allocator-war-wave-35/internal-authority-and-inventory.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/public-award-and-contract-denominators.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/published-enforcement-and-action-registers.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/correction-dockets-and-outcomes.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/protected-personnel-records.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/affected-comparator-and-distributional-joins.jsonl',
      'data/acquisition/lake-allocator-war-wave-35/financial-recovery-and-continuity.jsonl',
      'docs/methods/lake-allocator-war-join-requirements-wave-35.md',
      'docs/milestones/lake-allocator-war-join-requirements-wave-35.md',
      ...wave36SourcePaths,
      "data/project/lake-allocator-war-residual-obligations-wave-37-manifest.json",
      "data/project/lake-allocator-war-residual-obligations-wave-37-policy.json",
      "data/acquisition/lake-allocator-war-wave-37/residual-obligation-ledger.jsonl",
      "docs/methods/lake-allocator-war-residual-obligations-wave-37.md",
      "docs/milestones/lake-allocator-war-residual-obligations-wave-37.md"
    ]],
    ['allocator-war-lake-actions', [policy.paths.projection, policy.paths.reconciliation, 'build/lake-actions/allocator-war-estate-execution-wave-22.json', 'build/lake-actions/allocator-war-lead-acquisition-wave-23.json', 'build/lake-actions/allocator-war-lead-execution-wave-24.json', 'build/lake-actions/allocator-war-denominator-closure-wave-25.json', 'build/lake-actions/allocator-war-targeted-closure-wave-26.json', 'build/lake-actions/allocator-war-wave26-source-custody-repair.json', 'build/lake-actions/allocator-war-public-interest-downstream-wave-27-source-plan.json', 'build/lake-actions/allocator-war-public-interest-downstream-wave-27.json', 'build/lake-actions/allocator-war-public-interest-implementation-wave-28.json', 'build/lake-actions/allocator-war-public-interest-execution-wave-29.json', 'build/lake-actions/allocator-war-gap-fanout-wave-30.json', 'build/lake-actions/allocator-war-public-route-execution-wave-31.json', 'build/lake-actions/allocator-war-bounded-source-snapshots-wave-32.json', 'build/lake-actions/allocator-war-structural-parses-wave-33.json', 'build/lake-actions/allocator-war-schema-joins-wave-34.json', 'build/lake-actions/allocator-war-join-requirements-wave-35.json', wave36Policy.paths.projection, "build/lake-actions/allocator-war-residual-obligations-wave-37.json"]],
    ['allocator-war-reports', [policy.paths.report, 'reports/lake-allocator-war-estate-execution-wave-22.md', 'reports/lake-allocator-war-lead-acquisition-wave-23.md', 'reports/lake-allocator-war-lead-execution-wave-24.md', 'reports/lake-allocator-war-denominator-closure-wave-25.md', 'reports/lake-allocator-war-targeted-closure-wave-26.md', 'reports/lake-allocator-war-wave26-source-custody-repair.md', 'reports/lake-allocator-war-public-interest-downstream-wave-27.md', 'reports/lake-allocator-war-public-interest-implementation-wave-28.md', 'reports/lake-allocator-war-public-interest-execution-wave-29.md', 'reports/lake-allocator-war-gap-fanout-wave-30.md', 'reports/lake-allocator-war-public-route-execution-wave-31.md', 'reports/lake-allocator-war-bounded-source-snapshots-wave-32.md', 'reports/lake-allocator-war-structural-parses-wave-33.md', 'reports/lake-allocator-war-schema-joins-wave-34.md', 'reports/lake-allocator-war-join-requirements-wave-35.md', wave36Policy.paths.report, "reports/lake-allocator-war-residual-obligations-wave-37.md"]]
  ]);
  for (const [basinId, expectedPaths] of exactBasinPaths) {
    const basin = policy.basin_contract.find(row => row.basin_id === basinId);
    const actual = [...(basin?.path_prefixes ?? [])].sort();
    const expected = [...expectedPaths].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(errors, `${basinId}: exact basin path contract drift`);
  }
  if (observations.length !== expected.total_observations) fail(errors, `observation count ${observations.length}`);
  if (waterline.length !== expected.wave_01_finding_classes + expected.wave_02_unreviewed_observations) fail(errors, `waterline count ${waterline.length}`);
  if (estates.length !== expected.estate_consumers_after) fail(errors, `estate count ${estates.length}`);
  if (programs.length !== expected.program_consumers_after) fail(errors, `program count ${programs.length}`);

  const recordIds = observations.map(row => row.allocator_record_id);
  const classIds = waterline.map(row => row.allocator_class_id);
  const estateIds = estates.map(row => row.allocator_estate_feed_id);
  const programIds = programs.map(row => row.allocator_program_feed_id);
  if (![recordIds, classIds, estateIds, programIds].every(unique)) fail(errors, 'duplicate Wave 21 identifier');
  const gateIds = [...new Set(observations.flatMap(row =>
    (row.four_gate_assessment ?? []).map(gate => gate.gate_id)
  ))].sort();
  if (gateIds.length !== 4) fail(errors, `four-gate identifier count ${gateIds.length}`);
  for (const row of [...observations, ...waterline, ...estates, ...programs]) {
    if (row.program_id !== policy.program_id) fail(errors, 'row program identity drift');
    if (row.wave_id !== policy.wave_id) fail(errors, 'row wave identity drift');
  }
  if (receipt.program_id !== policy.program_id || receipt.wave_id !== policy.wave_id) fail(errors, 'receipt program or wave identity drift');
  if (projection.program_id !== policy.program_id || projection.wave_id !== policy.wave_id) fail(errors, 'projection program or wave identity drift');
  const basinIds = new Set((projection.basins ?? []).map(row => row.basin_id));
  for (const basin of policy.basin_contract) if (!basinIds.has(basin.basin_id)) fail(errors, `${basin.basin_id}: projection basin view missing`);

  const reviewed = observations.filter(row => row.source_wave_key === 'SSC-W01');
  const intake = observations.filter(row => row.source_wave_key === 'SSC-W02');
  if (reviewed.length !== expected.wave_01_reviewed_observations) fail(errors, `reviewed observation count ${reviewed.length}`);
  if (intake.length !== expected.wave_02_unreviewed_observations) fail(errors, `intake observation count ${intake.length}`);
  if (reviewed.some(row => row.authority_state !== 'maintainer_reviewed_below_second_party_review' || row.review_state !== 'maintainer_reviewed')) fail(errors, 'Wave 01 authority inflation or loss');
  if (intake.some(row => row.authority_state !== 'unreviewed_intake_only' || row.review_state !== 'unreviewed')) fail(errors, 'Wave 02 review laundering');
  if (intake.some(row => row.source_finding_ref !== null || row.complete_compact_supported !== false)) fail(errors, 'Wave 02 finding laundering');
  if (observations.some(row => row.graph_effect !== 'none')) fail(errors, 'observation graph effect');

  const reviewedClasses = waterline.filter(row => row.source_wave_key === 'SSC-W01');
  const frontierClasses = waterline.filter(row => row.source_wave_key === 'SSC-W02');
  if (reviewedClasses.length !== expected.wave_01_finding_classes) fail(errors, `reviewed class count ${reviewedClasses.length}`);
  if (frontierClasses.length !== expected.wave_02_unreviewed_observations) fail(errors, `frontier class count ${frontierClasses.length}`);
  if (frontierClasses.some(row => row.classification !== 'unreviewed_candidate_frontier' || row.finding_generated !== false)) fail(errors, 'Wave 02 waterline promotion');
  if (waterline.some(row => row.graph_effect !== 'none')) fail(errors, 'waterline graph effect');

  const observationRefs = new Set(observations.map(row => row.source_observation_ref));
  for (const row of [...waterline, ...estates, ...programs]) {
    for (const ref of [
      ...(row.source_observation_refs ?? []),
      ...(row.reviewed_source_observation_refs ?? []),
      ...(row.unreviewed_intake_observation_refs ?? [])
    ]) if (!observationRefs.has(ref)) fail(errors, `${ref}: routed observation absent`);
  }
  if (estates.some(row => row.finding_promoted !== false || row.graph_effect !== 'none')) fail(errors, 'estate finding promotion');
  if (programs.some(row => row.authority_transferred !== false || row.prevalence_or_recurrence_generated !== false || row.graph_effect !== 'none')) fail(errors, 'program authority promotion');

  const expectedPrograms = new Set(['K0-epistemic-admissibility', 'DCA-H01', 'M-05-Answerable-Power', 'POOF-Clifford-ecology', 'counter-selector-v1', 'core-thesis-C1-C7']);
  if (programs.length !== expectedPrograms.size || programs.some(row => !expectedPrograms.has(row.consumer_key))) fail(errors, 'program consumer set drift');

  for (const key of ['complete_compact_findings', 'racial_order_findings', 'prevalence_findings', 'coordination_findings', 'common_purpose_findings', 'graph_effects', 'publication_clearances']) {
    if (receipt.counts[key] !== 0) fail(errors, `${key} is not zero`);
  }
  if (receipt.source_mutations !== 0 || receipt.boundaries.graph_effect !== 'none') fail(errors, 'receipt authority drift');
  if (JSON.stringify(projection.observations) !== JSON.stringify(observations)) fail(errors, 'observation projection drift');
  if (JSON.stringify(projection.waterline_classes) !== JSON.stringify(waterline)) fail(errors, 'waterline projection drift');
  if (JSON.stringify(projection.estate_acquisition_routes) !== JSON.stringify(estates)) fail(errors, 'estate projection drift');
  if (JSON.stringify(projection.program_feeds) !== JSON.stringify(programs)) fail(errors, 'program projection drift');

  if (reconciliation) {
    if (reconciliation.program_id !== policy.program_id || reconciliation.wave_id !== policy.wave_id) fail(errors, 'reconciliation program or wave identity drift');
    if (!reconciliation.current_state?.source_projection_index_complete) fail(errors, 'reconciliation not source/projection/index complete');
    if (reconciliation.current_state?.graph_effect !== 'none') fail(errors, 'reconciliation graph effect');
    if (reconciliation.counts?.source_ids_source_observed !== recordIds.length + classIds.length + estateIds.length + programIds.length) fail(errors, 'reconciliation source count drift');
    if (reconciliation.counts?.source_ids_projection_observed !== reconciliation.counts?.source_ids_source_observed) fail(errors, 'reconciliation projection count drift');
    if (reconciliation.counts?.source_ids_index_observed !== reconciliation.counts?.source_ids_source_observed) fail(errors, 'reconciliation index count drift');
  }
  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const observations = readJsonl(root, policy.paths.observation_registry);
  const waterline = readJsonl(root, policy.paths.waterline_registry);
  const estates = readJsonl(root, policy.paths.estate_registry);
  const programs = readJsonl(root, policy.paths.program_registry);
  const receipt = readJson(root, policy.paths.receipt);
  const projection = readJson(root, policy.paths.projection);
  const reconciliation = fs.existsSync(full(root, policy.paths.reconciliation))
    ? readJson(root, policy.paths.reconciliation)
    : null;
  const wave36Policy = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json');
  const wave36Plan = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json');
  const {
    sourcePaths: wave36SourcePaths,
    snapshotPaths: wave36SnapshotPaths,
    permanentPaths: wave36PermanentPaths
  } = wave36PathContract(wave36Policy, wave36Plan);
  const errors = validateArtifacts({ policy, observations, waterline, estates, programs, receipt, projection, reconciliation, wave36Policy, wave36Plan });
  const wave36MembershipSourcePaths = wave36SourcePaths.filter(relative => fs.existsSync(full(root, relative)));
  const wave36CaptureLedgerExists = fs.existsSync(full(root, wave36Policy.paths.capture_ledger));
  if (wave36CaptureLedgerExists) {
    const wave36Captures = readJsonl(root, wave36Policy.paths.capture_ledger);
    const captureBySourceRef = new Map(wave36Captures.map(row => [row.source_ref, row]));
    const snapshotSpecByPath = new Map(wave36Plan.source_specs.map(row => [row.storage_path, row]));
    const snapshotPathSet = new Set(wave36SnapshotPaths);
    for (const relative of wave36SourcePaths) {
      if (fs.existsSync(full(root, relative))) continue;
      if (!snapshotPathSet.has(relative)) {
        fail(errors, relative + ': missing permanent Wave 36 source path');
        continue;
      }
      const spec = snapshotSpecByPath.get(relative);
      const capture = spec ? captureBySourceRef.get(spec.source_ref) : null;
      if (!spec || !capture) {
        fail(errors, relative + ': missing Wave 36 failed-capture custody');
        continue;
      }
      if (spec.required_success !== false || capture.required_success !== false) {
        fail(errors, relative + ': required Wave 36 snapshot is absent');
      }
      if (capture.response_ok !== false) fail(errors, relative + ': absent snapshot claims a successful response');
      if (capture.response_body_path !== null || capture.response_body_bytes !== 0 || capture.response_body_sha256 !== null) {
        fail(errors, relative + ': absent snapshot claims retained response bytes');
      }
      if (!['request_failed', 'response_refused_too_large'].includes(capture.capture_state)) {
        fail(errors, relative + ': absent snapshot has unsupported capture state ' + capture.capture_state);
      }
    }
  }

  if (process.env.LAW_SKIP_GIT !== '1') {
    for (const imported of receipt.import_digests) {
      const bytes = gitShow(root, imported.source_commit, imported.source_path);
      if (digest(bytes) !== imported.source_sha256) fail(errors, `${imported.source_commit}:${imported.source_path}: import digest drift`);
      if (bytes.length !== imported.source_bytes) fail(errors, `${imported.source_commit}:${imported.source_path}: import byte count drift`);
    }
  }

  const alignment = readJson(root, 'data/project/estate-thesis-alignment.json');
  const estateKeys = new Set(alignment.estates.map(row => row.estate_id));
  for (const row of estates) if (!estateKeys.has(row.consumer_key)) fail(errors, `${row.consumer_key}: unknown estate consumer`);

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const basinKeys = new Set(basinRegistry.basins.map(row => row.basin_id));
  for (const basin of policy.basin_contract) if (!basinKeys.has(basin.basin_id)) fail(errors, `${basin.basin_id}: basin contract not installed`);

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const key of [
    'wave_35_requirement_task_is_evidence_row',
    'wave_35_task_admission_authorizes_join',
    'wave_35_protected_task_is_publicly_executable',
    'wave_35_same_wave_acquisition_result_created'
  ]) if (policy.boundaries[key] !== false) fail(errors, `${key}: Wave 35 boundary missing`);
  if (lakePolicy.boundaries.allocator_war_wave_35_requirement_task_is_evidence !== false) fail(errors, 'Wave 35 lake-index boundary missing');
  if (basinRegistry.boundaries.allocator_war_wave_35_task_is_join_authority !== false) fail(errors, 'Wave 35 basin boundary missing');
  for (const key of [
    'wave_36_official_record_component_is_requirement_satisfaction',
    'wave_36_capture_authorizes_join',
    'wave_36_public_record_completes_no_action_denominator',
    'wave_36_public_record_authorizes_protected_personnel_access',
    'wave_36_announced_amount_is_realized_payment',
    'wave_36_docket_presence_is_practical_correction'
  ]) if (policy.boundaries[key] !== false) fail(errors, `${key}: Wave 36 boundary missing`);
  for (const key of [
    'allocator_war_wave_36_official_record_component_is_requirement',
    'allocator_war_wave_36_capture_authorizes_join',
    'allocator_war_wave_36_public_record_authorizes_protected_access',
    'allocator_war_wave_36_announced_amount_is_realized_recovery'
  ]) if (lakePolicy.boundaries[key] !== false) fail(errors, `${key}: Wave 36 lake-index boundary missing`);
  for (const key of [
    'allocator_war_wave_36_component_is_requirement_satisfaction',
    'allocator_war_wave_36_capture_authorizes_join',
    'allocator_war_wave_36_public_record_completes_denominator',
    'allocator_war_wave_36_public_record_authorizes_protected_access'
  ]) if (basinRegistry.boundaries[key] !== false) fail(errors, `${key}: Wave 36 basin boundary missing`);
  for (const relative of [
    'data/project/lake-allocator-war-wave-21-policy.json',
    policy.paths.observation_registry,
    policy.paths.waterline_registry,
    policy.paths.estate_registry,
    policy.paths.program_registry,
    policy.paths.receipt,
    policy.paths.projection,
    policy.paths.reconciliation,
    policy.paths.report,
    'docs/methods/lake-allocator-war-wave-21.md',
    'docs/milestones/lake-allocator-war-wave-21.md',
    'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
    'build/lake-actions/allocator-war-estate-execution-wave-22.json',
    'reports/lake-allocator-war-estate-execution-wave-22.md',
    'docs/methods/lake-allocator-war-estate-execution-wave-22.md',
    'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',
    'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
    'build/lake-actions/allocator-war-lead-acquisition-wave-23.json',
    'reports/lake-allocator-war-lead-acquisition-wave-23.md',
    'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',
    'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md',
    'data/project/lake-allocator-war-lead-execution-wave-24-policy.json',
    'data/project/lake-allocator-war-lead-execution-wave-24-source-plan.json',
    'build/lake-actions/allocator-war-lead-execution-wave-24.json',
    'reports/lake-allocator-war-lead-execution-wave-24.md',
    'docs/methods/lake-allocator-war-lead-execution-wave-24.md',
    'docs/milestones/lake-allocator-war-lead-execution-wave-24.md',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-01.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-02.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-03.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-04.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-06.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-07.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-08.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-09.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-10.jsonl',
    'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',
    'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json',
    'build/lake-actions/allocator-war-denominator-closure-wave-25.json',
    'reports/lake-allocator-war-denominator-closure-wave-25.md',
    'docs/methods/lake-allocator-war-denominator-closure-wave-25.md',
    'docs/milestones/lake-allocator-war-denominator-closure-wave-25.md',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-01.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-02.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-03.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-04.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-06.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-07.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-08.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-09.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-10.jsonl',
    'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',
    'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json',
    'data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json',
    'build/lake-actions/allocator-war-targeted-closure-wave-26.json',
    'reports/lake-allocator-war-targeted-closure-wave-26.md',
    'docs/methods/lake-allocator-war-targeted-closure-wave-26.md',
    'docs/milestones/lake-allocator-war-targeted-closure-wave-26.md',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-01.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-02.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-03.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-04.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-06.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-07.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-08.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-09.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-10.jsonl',
    'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',
    'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json',
    'build/lake-actions/allocator-war-wave26-source-custody-repair.json',
    'reports/lake-allocator-war-wave26-source-custody-repair.md',
    'docs/methods/lake-allocator-war-wave26-source-custody-repair.md',
    'docs/milestones/lake-allocator-war-wave26-source-custody-repair.md',
    'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json',
    'docs/methods/lake-allocator-war-public-interest-downstream-wave-27.md',
    'docs/milestones/lake-allocator-war-public-interest-downstream-wave-27.md',
    'data/acquisition/lake-allocator-war-wave-27/law21-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-27/law21-est-11.jsonl',
    'build/lake-actions/allocator-war-public-interest-downstream-wave-27-source-plan.json',
    'build/lake-actions/allocator-war-public-interest-downstream-wave-27.json',
    'reports/lake-allocator-war-public-interest-downstream-wave-27.md',
    'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json',
    'docs/methods/lake-allocator-war-public-interest-implementation-wave-28.md',
    'docs/milestones/lake-allocator-war-public-interest-implementation-wave-28.md',
    'data/acquisition/lake-allocator-war-wave-28/law28-est-04.jsonl',
    'data/acquisition/lake-allocator-war-wave-28/law28-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-28/law28-est-06.jsonl',
    'data/acquisition/lake-allocator-war-wave-28/law28-est-07.jsonl',
    'data/acquisition/lake-allocator-war-wave-28/law28-est-10.jsonl',
    'build/lake-actions/allocator-war-public-interest-implementation-wave-28.json',
    'reports/lake-allocator-war-public-interest-implementation-wave-28.md',
    'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json',
    'data/project/lake-allocator-war-public-interest-execution-wave-29-source-plan.json',
    'docs/methods/lake-allocator-war-public-interest-execution-wave-29.md',
    'docs/milestones/lake-allocator-war-public-interest-execution-wave-29.md',
    'data/acquisition/lake-allocator-war-wave-29/law28-est-04.jsonl',
    'data/acquisition/lake-allocator-war-wave-29/law28-est-05.jsonl',
    'data/acquisition/lake-allocator-war-wave-29/law28-est-06.jsonl',
    'data/acquisition/lake-allocator-war-wave-29/law28-est-07.jsonl',
    'data/acquisition/lake-allocator-war-wave-29/law28-est-10.jsonl',
    'build/lake-actions/allocator-war-public-interest-execution-wave-29.json',
    'reports/lake-allocator-war-public-interest-execution-wave-29.md',
    'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json',
    'docs/methods/lake-allocator-war-gap-fanout-wave-30.md',
    'docs/milestones/lake-allocator-war-gap-fanout-wave-30.md',
    'data/acquisition/lake-allocator-war-wave-30/protected-personnel-records.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/internal-authority-and-inventory.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/public-award-and-contract-denominators.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/published-enforcement-and-action-registers.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/correction-dockets-and-outcomes.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/affected-comparator-and-distributional-joins.jsonl',
    'data/acquisition/lake-allocator-war-wave-30/financial-recovery-and-continuity.jsonl',
    'build/lake-actions/allocator-war-gap-fanout-wave-30.json',
    'reports/lake-allocator-war-gap-fanout-wave-30.md',
    'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
    'data/acquisition/lake-allocator-war-wave-35/internal-authority-and-inventory.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/public-award-and-contract-denominators.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/published-enforcement-and-action-registers.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/correction-dockets-and-outcomes.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/protected-personnel-records.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/affected-comparator-and-distributional-joins.jsonl',
    'data/acquisition/lake-allocator-war-wave-35/financial-recovery-and-continuity.jsonl',
    'docs/methods/lake-allocator-war-join-requirements-wave-35.md',
    'docs/milestones/lake-allocator-war-join-requirements-wave-35.md',
    'build/lake-actions/allocator-war-join-requirements-wave-35.json',
    'reports/lake-allocator-war-join-requirements-wave-35.md',
    ...wave36PermanentPaths
  ]) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, `${relative}: missing authoritative root`);

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['validate:lake-allocator-war-wave-21']) fail(errors, 'Wave 21 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-wave-21')) fail(errors, 'Wave 21 absent from complete release gate');
  for (const key of [
    'acquire:lake-allocator-war-public-acquisition-wave-36',
    'build:lake-allocator-war-public-acquisition-wave-36',
    'validate:lake-allocator-war-public-acquisition-wave-36',
    'ci:lake-allocator-war-public-acquisition-wave-36'
  ]) if (!pkg.scripts[key]) fail(errors, `${key}: Wave 36 script absent`);
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-acquisition-wave-36')) fail(errors, 'Wave 36 absent from complete release gate');

  if (reconciliation) {
    if (JSON.stringify(graphDigests(root)) !== JSON.stringify(receipt.graph_digests)) fail(errors, 'graph digest changed after Wave 21');
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    const basinMembershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, summaryPath))) {
      const summary = readJson(root, summaryPath);
      const expectedSourceRows = observations.length + waterline.length + estates.length + programs.length;
      const expectedGateIds = new Set(observations.flatMap(row =>
        (row.four_gate_assessment ?? []).map(gate => gate.gate_id)
      )).size;
      const expectedContractObjects = expectedSourceRows + policy.basin_contract.length + expectedGateIds + 3;
      if (summary.counts?.allocator_war_wave_21_source_rows !== expectedSourceRows) fail(errors, 'sharded summary Wave 21 source count drift');
      if (summary.counts?.allocator_war_wave_21_contract_objects !== expectedContractObjects) fail(errors, 'sharded summary Wave 21 contract-object count drift');
      if (summary.counts?.allocator_war_wave_21_complete_findings !== 0) fail(errors, 'sharded summary finding inflation');
      for (const [key, label] of [
        ['divergent_identifier_projections_unadjudicated', 'divergence'],
        ['source_ids_without_projection_unadjudicated', 'source-only'],
        ['unindexed_machine_ids_unadjudicated', 'unindexed']
      ]) if (summary.counts?.[key] !== 0) fail(errors, `Wave 21 sharded summary unresolved identifier ${label}`);
    }
    if (fs.existsSync(full(root, gapsPath))) {
      const gaps = readJson(root, gapsPath);
      for (const [key, label] of [
        ['divergent_identifier_projections_unadjudicated', 'divergence'],
        ['source_ids_without_projection_unadjudicated', 'source-only'],
        ['unindexed_machine_ids_unadjudicated', 'unindexed']
      ]) if (gaps.counts?.[key] !== 0) fail(errors, `Wave 21 sharded gap summary unresolved identifier ${label}`);
    }
    if (fs.existsSync(full(root, basinMembershipPath))) {
      const membership = readJsonl(root, basinMembershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      for (const relative of [
        'data/project/lake-allocator-war-wave-21-policy.json',
        policy.paths.observation_registry,
        policy.paths.waterline_registry,
        policy.paths.estate_registry,
        policy.paths.program_registry,
        policy.paths.receipt,
        'docs/methods/lake-allocator-war-wave-21.md',
        'docs/milestones/lake-allocator-war-wave-21.md',
        'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
        'docs/methods/lake-allocator-war-estate-execution-wave-22.md',
        'docs/milestones/lake-allocator-war-estate-execution-wave-22.md'
      ]) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, `${relative}: wrong source basin`);
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'projection wrong basin');
      if (byPath.get(policy.paths.reconciliation)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'reconciliation wrong basin');
      if (byPath.get('build/lake-actions/allocator-war-estate-execution-wave-22.json')?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 22 projection wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'report wrong basin');
      if (byPath.get('reports/lake-allocator-war-estate-execution-wave-22.md')?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 22 report wrong basin');
      for (const relative of wave36MembershipSourcePaths) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, `${relative}: wrong Wave 36 source basin`);
      if (byPath.get(wave36Policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 36 projection wrong basin');
      if (byPath.get(wave36Policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 36 report wrong basin');
    }
  }

  for (const temporary of [
    '.github/tmp/lake-allocator-war-wave-21-trigger.json',
    '.github/workflows/temporary-lake-allocator-war-wave-21-materializer.yml',
    '.github/tmp/wave36-materialize-trigger.json',
    '.github/workflows/temporary-wave36-materializer.yml',
    'tools/run-wave36-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, `${temporary}: temporary transport retained`);

  if (errors.length) throw new Error(`allocator-war Wave 21 validation failed:\n- ${errors.join('\n- ')}`);
  return {
    observations: observations.length,
    reviewed: observations.filter(row => row.review_state === 'maintainer_reviewed').length,
    intake: observations.filter(row => row.review_state === 'unreviewed').length,
    waterline: waterline.length,
    estates: estates.length,
    programs: programs.length,
    reconciled: Boolean(reconciliation)
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war Wave 21 validation passed');
  console.log(`  observations reviewed/intake/total: ${result.reviewed}/${result.intake}/${result.observations}`);
  console.log(`  waterline/estate/program rows: ${result.waterline}/${result.estates}/${result.programs}`);
  console.log(`  reconciliation complete: ${result.reconciled}`);
  console.log('  graph/publication findings: 0/0');
}
