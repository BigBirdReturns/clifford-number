#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { constructArtifacts } from './build-lake-allocator-war-residual-obligations-wave-37.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = 'data/project/lake-allocator-war-residual-obligations-wave-37-policy.json';
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const fail = (errors, message) => errors.push(message);

export function validateArtifacts(state) {
  const { policy, expectedProjection, expectedLedger, expectedReport, projection, ledger, report } = state;
  const errors = [];
  if (policy.schema_version !== 'lake-allocator-war-residual-obligations-wave-37-policy@1') fail(errors, 'policy schema drift');
  if (projection.schema_version !== 'lake-allocator-war-residual-obligations-wave-37@1') fail(errors, 'projection schema drift');
  if (!same(projection, expectedProjection)) fail(errors, 'projection differs from deterministic construction');
  if (!same(ledger, expectedLedger)) fail(errors, 'ledger differs from deterministic construction');
  if (report !== expectedReport) fail(errors, 'report differs from deterministic construction');

  const summaries = ledger.filter(row => row.row_type === 'residual_obligation_route_summary');
  const obligations = ledger.filter(row => row.row_type === 'residual_institutional_obligation');
  if (summaries.length !== policy.expected_counts.route_summaries) fail(errors, 'route-summary denominator drift');
  if (obligations.length !== policy.expected_counts.residual_obligations) fail(errors, 'residual-obligation denominator drift');
  if (new Set(obligations.map(row => row.obligation_ref)).size !== obligations.length) fail(errors, 'duplicate obligation reference');
  if (new Set(obligations.map(row => row.source_task_ref)).size !== obligations.length) fail(errors, 'duplicate source task reference');
  const prioritySequence = obligations.map(row => row.priority_sequence).sort((a, b) => a - b);
  if (!same(prioritySequence, Array.from({ length: obligations.length }, (_, index) => index + 1))) fail(errors, 'priority sequence is not a complete denominator');

  for (const row of summaries) {
    if (!row.obligation_class || !row.next_access_route) fail(errors, `${row.route_ref}: unclassified route`);
    if (row.residual_obligations !== row.task_count) fail(errors, `${row.route_ref}: residual task count drift`);
    if (row.unclassified_residual_obligations !== 0) fail(errors, `${row.route_ref}: unclassified residual obligation`);
    if (row.external_human_review_required_to_classify !== false) fail(errors, `${row.route_ref}: external review gate introduced`);
    for (const key of ['completion_tests_passed','requirements_satisfied','authorized_joins','complete_denominators','evidence_rows','finding_promotions','graph_effects','publication_clearances']) {
      if (Number(row[key]) !== 0) fail(errors, `${row.route_ref}: ${key} promoted`);
    }
    if (row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, `${row.route_ref}: graph or publication drift`);
  }

  for (const row of obligations) {
    for (const key of ['completion_test','completion_gap','refused_substitution','source_requirement_sha256','source_result_sha256','obligation_class','next_access_route']) {
      if (!row[key]) fail(errors, `${row.obligation_ref}: missing ${key}`);
    }
    if (row.residual_requirement_open !== true || row.completion_test_passed !== false) fail(errors, `${row.obligation_ref}: completion state drift`);
    if (row.external_human_review_required_to_classify !== false || row.magic_human_gate !== false || row.reversible_internal_classification !== true) {
      fail(errors, `${row.obligation_ref}: human gate or reversibility drift`);
    }
    if (row.priority_is_evidence_strength !== false) fail(errors, `${row.obligation_ref}: priority promoted to evidence strength`);
    if (row.requirement_satisfied !== false || row.task_execution_authorizes_join !== false || row.join_authorized !== false || row.joined_rows !== 0) {
      fail(errors, `${row.obligation_ref}: join authority inflated`);
    }
    if (row.complete_denominator !== false || row.evidence_adjudicated !== false || row.evidence_rows !== 0 || row.estate_adopted !== false || row.finding_promoted !== false) {
      fail(errors, `${row.obligation_ref}: evidentiary promotion inflated`);
    }
    if (row.graph_effect !== 'none' || row.publication_status !== 'blocked') fail(errors, `${row.obligation_ref}: graph or publication drift`);
    if (row.protected_lawful_access_only) {
      if (row.component_custody_state !== 'protected_access_not_attempted' || row.public_record_component_count !== 0) {
        fail(errors, `${row.obligation_ref}: protected access boundary violated`);
      }
    } else if (row.component_custody_state !== 'official_components_observed' || row.public_record_component_count < 1) {
      fail(errors, `${row.obligation_ref}: public component custody drift`);
    }
  }

  for (const [key, expected] of Object.entries(policy.expected_counts)) {
    if (projection.counts?.[key] !== expected) fail(errors, `projection count ${key} drift`);
  }
  for (const [key, expected] of Object.entries(policy.boundaries)) {
    if (!same(projection.boundaries?.[key], expected)) fail(errors, `projection boundary ${key} drift`);
  }
  return errors;
}

export function validateRepository(root = defaultRoot) {
  const expected = constructArtifacts(root);
  const policy = readJson(root, POLICY_PATH);
  for (const relative of [policy.paths.ledger, policy.paths.projection, policy.paths.report]) {
    if (!fs.existsSync(full(root, relative))) throw new Error(`missing Wave 37 product: ${relative}`);
  }
  const projection = readJson(root, policy.paths.projection);
  const ledger = readJsonl(root, policy.paths.ledger);
  const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
  const errors = validateArtifacts({
    policy,
    expectedProjection: expected.projection,
    expectedLedger: expected.ledger,
    expectedReport: expected.report,
    projection,
    ledger,
    report
  });

  const permanentAuthorityPaths = [
    POLICY_PATH,
    policy.paths.ledger,
    policy.paths.projection,
    policy.paths.report,
    policy.paths.method,
    policy.paths.milestone
  ];
  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const relative of permanentAuthorityPaths) {
    if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, `${relative}: missing authoritative root`);
  }
  for (const [key, expectedValue] of Object.entries({
    allocator_war_wave_37_component_count_is_completion: false,
    allocator_war_wave_37_partial_register_is_complete_denominator: false,
    allocator_war_wave_37_priority_is_evidence_strength: false,
    allocator_war_wave_37_external_review_required_to_classify: false
  })) {
    if (lakePolicy.boundaries?.[key] !== expectedValue) fail(errors, `lake-index boundary ${key} drift`);
  }

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const basinPathChecks = new Map([
    ['allocator-war-source', [POLICY_PATH, policy.paths.ledger, policy.paths.method, policy.paths.milestone]],
    ['allocator-war-lake-actions', [policy.paths.projection]],
    ['allocator-war-reports', [policy.paths.report]]
  ]);
  for (const [basinId, paths] of basinPathChecks) {
    const basin = basinRegistry.basins.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, `${basinId}: basin absent`);
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, `${relative}: missing ${basinId} prefix`);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, `${relative}: missing ${basinId} entrypoint`);
    }
  }
  for (const [key, expectedValue] of Object.entries({
    allocator_war_wave_37_component_is_requirement_satisfaction: false,
    allocator_war_wave_37_priority_is_evidence_strength: false,
    allocator_war_wave_37_external_review_required_to_classify: false
  })) {
    if (basinRegistry.boundaries?.[key] !== expectedValue) fail(errors, `basin boundary ${key} drift`);
  }

  const membershipPath = 'build/lake-index/basin-membership.jsonl';
  if (fs.existsSync(full(root, membershipPath))) {
    const membership = new Map(readJsonl(root, membershipPath).map(row => [row.path, row.basin_id]));
    for (const [basinId, paths] of basinPathChecks) {
      for (const relative of paths) if (membership.get(relative) !== basinId) fail(errors, `${relative}: wrong built basin membership`);
    }
  }

  const pkg = readJson(root, 'package.json');
  for (const key of [
    'build:lake-allocator-war-residual-obligations-wave-37',
    'validate:lake-allocator-war-residual-obligations-wave-37',
    'ci:lake-allocator-war-residual-obligations-wave-37'
  ]) if (!pkg.scripts?.[key]) fail(errors, `${key}: package script absent`);
  if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-residual-obligations-wave-37')) fail(errors, 'Wave 37 absent from complete release gate');

  for (const temporary of [
    '.github/workflows/temporary-wave37-materializer.yml',
    '.github/tmp/wave37-materialize.sh',
    '.github/tmp/wave37-trigger.json'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, `${temporary}: temporary transport retained`);

  if (errors.length) throw new Error(`allocator-war residual obligations Wave 37 validation failed:\n- ${errors.join('\n- ')}`);
  return {
    route_summaries: projection.counts.route_summaries,
    residual_obligations: projection.counts.residual_obligations,
    component_observed: projection.counts.component_observed_obligations,
    protected: projection.counts.protected_access_obligations
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war residual institutional obligations Wave 37 validation passed');
  console.log(`  route summaries / obligations: ${result.route_summaries} / ${result.residual_obligations}`);
  console.log(`  component observed / protected: ${result.component_observed} / ${result.protected}`);
  console.log('  requirements / joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0 / 0');
}
