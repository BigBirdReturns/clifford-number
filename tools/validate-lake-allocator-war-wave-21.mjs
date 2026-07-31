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
  const { policy, observations, waterline, estates, programs, receipt, projection, reconciliation } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-wave-21-policy@1') fail(errors, 'policy schema drift');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'policy graph effect drift');
  if (observations.length !== expected.total_observations) fail(errors, `observation count ${observations.length}`);
  if (waterline.length !== expected.wave_01_finding_classes + expected.wave_02_unreviewed_observations) fail(errors, `waterline count ${waterline.length}`);
  if (estates.length !== expected.estate_consumers_after) fail(errors, `estate count ${estates.length}`);
  if (programs.length !== expected.program_consumers_after) fail(errors, `program count ${programs.length}`);

  const recordIds = observations.map(row => row.allocator_record_id);
  const classIds = waterline.map(row => row.allocator_class_id);
  const estateIds = estates.map(row => row.allocator_estate_feed_id);
  const programIds = programs.map(row => row.allocator_program_feed_id);
  if (![recordIds, classIds, estateIds, programIds].every(unique)) fail(errors, 'duplicate Wave 21 identifier');

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
  const errors = validateArtifacts({ policy, observations, waterline, estates, programs, receipt, projection, reconciliation });

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
  for (const relative of [
    'data/project/lake-allocator-war-wave-21-policy.json',
    policy.paths.observation_registry,
    policy.paths.waterline_registry,
    policy.paths.estate_registry,
    policy.paths.program_registry,
    policy.paths.receipt,
    policy.paths.projection,
    policy.paths.reconciliation,
    policy.paths.report
  ]) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, `${relative}: missing authoritative root`);

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['validate:lake-allocator-war-wave-21']) fail(errors, 'Wave 21 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-wave-21')) fail(errors, 'Wave 21 absent from complete release gate');

  if (reconciliation) {
    if (JSON.stringify(graphDigests(root)) !== JSON.stringify(receipt.graph_digests)) fail(errors, 'graph digest changed after Wave 21');
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    const basinMembershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, summaryPath))) {
      const summary = readJson(root, summaryPath);
      if (summary.counts?.allocator_war_wave_21_source_rows !== 53) fail(errors, 'sharded summary Wave 21 source count drift');
      if (summary.counts?.allocator_war_wave_21_complete_findings !== 0) fail(errors, 'sharded summary finding inflation');
    }
    if (fs.existsSync(full(root, gapsPath))) {
      const gaps = readJson(root, gapsPath);
      if (gaps.allocator_war_wave_21?.unresolved_identifier_divergence !== 0) fail(errors, 'Wave 21 unresolved identifier divergence');
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
        policy.paths.receipt
      ]) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, `${relative}: wrong source basin`);
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'projection wrong basin');
      if (byPath.get(policy.paths.reconciliation)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'reconciliation wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'report wrong basin');
    }
  }

  for (const temporary of [
    '.github/tmp/lake-allocator-war-wave-21-trigger.json',
    '.github/workflows/temporary-lake-allocator-war-wave-21-materializer.yml'
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
