#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildExecution,
  collectWave30Rows,
  resultPathFor
} from './build-lake-allocator-war-public-route-execution-wave-31.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = values => new Set(values).size === values.length;
const fail = (errors, message) => errors.push(message);
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

function requiredBasinPaths(policy) {
  const ledgers = policy.route_plans
    .slice()
    .sort((a, b) => a.route_ref.localeCompare(b.route_ref))
    .map(route => resultPathFor(route.route_class, policy));
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json',
      policy.paths.source_plan,
      policy.paths.method,
      policy.paths.milestone,
      ...ledgers
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

export function validateArtifacts(state) {
  const {
    policy,
    sourcePlan,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy,
    lakeIndexPolicy,
    pkg,
    installerText
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-public-route-execution-wave-31-policy@1') fail(errors, 'Wave 31 policy schema drift');
  if (sourcePlan.schema_version !== 'lake-allocator-war-public-route-execution-wave-31-source-plan@1') fail(errors, 'Wave 31 source-plan schema drift');
  if (sourceProjection.schema_version !== policy.source_contract.required_source_schema) fail(errors, 'Wave 31 source is not sealed Wave 30');
  if (projection.schema_version !== 'lake-allocator-war-public-route-execution-wave-31@1') fail(errors, 'Wave 31 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 31 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 31 boundary drift');

  if (!unique(policy.route_plans.map(row => row.route_ref))) fail(errors, 'duplicate Wave 31 route reference');
  if (!unique(policy.route_plans.map(row => row.route_class))) fail(errors, 'duplicate Wave 31 route class');
  if (policy.route_plans.length !== expected.source_routes) fail(errors, 'Wave 31 route-plan denominator drift');
  if (policy.route_plans.filter(row => row.public_execution).length !== expected.public_routes) fail(errors, 'Wave 31 public-route denominator drift');
  if (policy.route_plans.filter(row => !row.public_execution).length !== expected.protected_routes) fail(errors, 'Wave 31 protected-route denominator drift');

  if (!Array.isArray(sourcePlan.sources) || sourcePlan.sources.length !== expected.official_source_receipts) {
    fail(errors, 'Wave 31 source-receipt denominator drift');
  }
  if (!unique(sourcePlan.sources.map(row => row.source_ref))) fail(errors, 'duplicate Wave 31 source receipt');
  const knownSources = new Set(sourcePlan.sources.map(row => row.source_ref));
  for (const source of sourcePlan.sources) {
    for (const key of ['source_ref', 'title', 'publisher', 'url', 'authority', 'retrieval_state', 'observed_on', 'coverage', 'limits']) {
      if (!source[key]) fail(errors, (source.source_ref ?? 'unknown source') + ': source field absent: ' + key);
    }
    if (!/^https:\/\//.test(source.url)) fail(errors, source.source_ref + ': source URL is not HTTPS');
  }

  const sourceSetByRoute = new Map(sourcePlan.route_source_sets.map(row => [row.route_class, row]));
  for (const routePlan of policy.route_plans) {
    const sourceSet = sourceSetByRoute.get(routePlan.route_class);
    if (!sourceSet) {
      fail(errors, routePlan.route_class + ': source set absent');
      continue;
    }
    if (sourceSet.route_ref !== routePlan.route_ref || sourceSet.public_execution !== routePlan.public_execution) {
      fail(errors, routePlan.route_class + ': source-set custody drift');
    }
    if (!same(sourceSet.source_refs, routePlan.source_refs)) fail(errors, routePlan.route_class + ': source-set references drift');
    if (routePlan.public_execution && routePlan.source_refs.length === 0) fail(errors, routePlan.route_class + ': public route has no source receipts');
    if (!routePlan.public_execution && routePlan.source_refs.length !== 0) fail(errors, routePlan.route_class + ': protected route received public source receipts');
    for (const sourceRef of routePlan.source_refs) {
      if (!knownSources.has(sourceRef)) fail(errors, routePlan.route_class + ': unknown source reference ' + sourceRef);
    }
    for (const key of ['default_result_state', 'coverage_statement']) {
      if (!routePlan[key]) fail(errors, routePlan.route_class + ': route plan field absent: ' + key);
    }
    for (const key of ['recovered_surfaces', 'remaining_limits', 'refused_substitutions', 'correction_route']) {
      if (!Array.isArray(routePlan[key]) || routePlan[key].length === 0) fail(errors, routePlan.route_class + ': route plan list absent: ' + key);
    }
  }

  let wave30 = { routeSummaries: [], tasks: [] };
  try {
    wave30 = collectWave30Rows(sourceProjection, sourceRowsByPath);
  } catch (error) {
    fail(errors, 'Wave 31 source collection failed: ' + error.message);
  }
  if (sourceProjection.routes.length !== expected.source_routes) fail(errors, 'Wave 31 source route count drift');
  if (wave30.tasks.length !== expected.source_tasks) fail(errors, 'Wave 31 source task count drift');
  if (!unique(wave30.tasks.map(row => row.task_ref))) fail(errors, 'Wave 30 source task references are not unique');

  for (const route of sourceProjection.routes) {
    const raw = sourceRawByPath[route.result_path];
    if (typeof raw !== 'string') {
      fail(errors, route.result_path + ': Wave 30 raw route ledger absent');
      continue;
    }
    if (digestBytes(raw) !== route.result_sha256) fail(errors, route.result_path + ': Wave 30 source hash differs from custody');
  }

  let expectedBuild = null;
  try {
    expectedBuild = buildExecution(
      policy,
      sourcePlan,
      sourceProjection,
      sourceProjectionRaw,
      sourceRowsByPath,
      sourceRawByPath
    );
  } catch (error) {
    fail(errors, 'Wave 31 deterministic build failed: ' + error.message);
  }
  if (expectedBuild) {
    if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 31 projection differs from deterministic build');
    if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 31 ledger-path denominator drift');
    for (const [relative, rows] of Object.entries(expectedBuild.resultRowsByPath)) {
      if (!same(resultRowsByPath[relative], rows)) fail(errors, relative + ': Wave 31 ledger differs from deterministic build');
    }
  }

  const allRows = Object.values(resultRowsByPath).flat();
  const summaries = allRows.filter(row => row.row_type === 'public_route_execution_summary');
  const results = allRows.filter(row => row.row_type === 'public_route_execution_result');
  if (summaries.length !== expected.route_summary_rows) fail(errors, 'Wave 31 route summary count drift');
  if (results.length !== expected.task_result_rows) fail(errors, 'Wave 31 task result count drift');
  if (allRows.length !== expected.execution_rows) fail(errors, 'Wave 31 execution row count drift');
  if (!unique(results.map(row => row.result_ref))) fail(errors, 'duplicate Wave 31 result reference');
  if (!unique(results.map(row => row.source_task_ref))) fail(errors, 'duplicate Wave 31 source-task result');
  if (!same(countBy(results, 'result_state'), expected.result_states)) fail(errors, 'Wave 31 result-state counts drift');

  const wave30TaskRefs = wave30.tasks.map(row => row.task_ref).sort();
  const wave31TaskRefs = results.map(row => row.source_task_ref).sort();
  if (!same(wave31TaskRefs, wave30TaskRefs)) fail(errors, 'Wave 31 did not preserve the exact Wave 30 task denominator');

  if (results.filter(row => row.executed_in_wave).length !== expected.executed_public_tasks) fail(errors, 'Wave 31 executed-public count drift');
  if (results.filter(row => !row.executed_in_wave).length !== expected.preserved_access_bounded_tasks) fail(errors, 'Wave 31 access-bounded count drift');

  for (const result of results) {
    const routePlan = policy.route_plans.find(row => row.route_class === result.source_route_class);
    if (!routePlan) {
      fail(errors, result.result_ref + ': route plan absent');
      continue;
    }
    if (result.public_execution !== routePlan.public_execution || result.executed_in_wave !== routePlan.public_execution) {
      fail(errors, result.result_ref + ': public-execution state drift');
    }
    if (result.access_bounded !== !routePlan.public_execution) fail(errors, result.result_ref + ': access boundary drift');
    if (routePlan.public_execution && !same(result.source_refs, routePlan.source_refs)) fail(errors, result.result_ref + ': route source references drift');
    if (!routePlan.public_execution && result.source_refs.length !== 0) fail(errors, result.result_ref + ': protected result received public sources');
    if (result.source_receipt_count !== result.source_refs.length) fail(errors, result.result_ref + ': source receipt count drift');
    for (const sourceRef of result.source_refs) if (!knownSources.has(sourceRef)) fail(errors, result.result_ref + ': unknown source reference ' + sourceRef);
    if (!result.coverage_statement || !Array.isArray(result.remaining_rows) || result.remaining_rows.length === 0) fail(errors, result.result_ref + ': coverage or remaining rows absent');
    if (!Array.isArray(result.refused_substitutions) || result.refused_substitutions.length === 0) fail(errors, result.result_ref + ': refused substitutions absent');
    if (!Array.isArray(result.correction_route) || result.correction_route.length === 0) fail(errors, result.result_ref + ': correction route absent');
    if (result.complete_denominator !== false || result.evidence_adjudicated !== false || result.evidence_rows !== 0 || result.estate_adopted !== false) {
      fail(errors, result.result_ref + ': denominator, evidence, or estate inflation');
    }
    if (!same(result.blocked_promotions, policy.blocked_promotions)) fail(errors, result.result_ref + ': blocked promotions drift');
    if (result.finding_promoted !== false || result.graph_effect !== 'none' || result.publication_status !== 'blocked') {
      fail(errors, result.result_ref + ': authority boundary drift');
    }
  }

  for (const summary of summaries) {
    const routeResults = results.filter(row => row.source_route_class === summary.route_class);
    if (summary.source_task_count !== routeResults.length) fail(errors, summary.route_class + ': summary task count drift');
    if (summary.executed_task_count !== routeResults.filter(row => row.executed_in_wave).length) fail(errors, summary.route_class + ': executed count drift');
    if (summary.preserved_task_count !== routeResults.filter(row => !row.executed_in_wave).length) fail(errors, summary.route_class + ': preserved count drift');
    if (!same(summary.result_states, countBy(routeResults, 'result_state'))) fail(errors, summary.route_class + ': result-state summary drift');
    if (summary.complete_denominators !== 0 || summary.evidence_rows !== 0 || summary.estate_adoptions !== 0 ||
        summary.finding_promotions !== 0 || summary.graph_effects !== 0 || summary.publication_clearances !== 0) {
      fail(errors, summary.route_class + ': summary authority inflation');
    }
  }

  const observedUses = results.reduce((sum, row) => sum + row.source_receipt_count, 0);
  if (observedUses !== expected.source_receipt_uses) fail(errors, 'Wave 31 source-receipt uses drift');
  const sourceUses = Object.fromEntries(sourcePlan.sources.map(source => [
    source.source_ref,
    results.filter(result => result.source_refs.includes(source.source_ref)).length
  ]));
  for (const [sourceRef, count] of Object.entries(sourceUses)) {
    if (count === 0) fail(errors, sourceRef + ': unused Wave 31 source receipt');
    const projected = projection.source_receipts.find(row => row.source_ref === sourceRef);
    if (!projected || projected.source_receipt_uses !== count) fail(errors, sourceRef + ': projected source-use count drift');
  }

  const scalarChecks = {
    source_routes: sourceProjection.routes.length,
    source_tasks: wave30.tasks.length,
    public_routes: policy.route_plans.filter(row => row.public_execution).length,
    protected_routes: policy.route_plans.filter(row => !row.public_execution).length,
    executed_public_tasks: results.filter(row => row.executed_in_wave).length,
    preserved_access_bounded_tasks: results.filter(row => !row.executed_in_wave).length,
    official_source_receipts: sourcePlan.sources.length,
    source_receipt_uses: observedUses,
    route_summary_rows: summaries.length,
    task_result_rows: results.length,
    execution_rows: allRows.length,
    complete_denominators: 0,
    evidence_rows: 0,
    estate_adoptions: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) {
    if (projection.counts[key] !== value || expected[key] !== value) fail(errors, key + ': Wave 31 count drift');
  }
  if (!same(projection.counts.result_states, expected.result_states)) fail(errors, 'Wave 31 projected result states drift');
  if (!same(projection.graph_digests, sourceProjection.graph_digests)) fail(errors, 'Wave 31 changed graph digests');
  if (projection.execution_contract?.manual_per_task_dispatch_required !== false) fail(errors, 'Wave 31 manual dispatch reintroduced');
  if (projection.execution_contract?.all_public_tasks_executed !== true) fail(errors, 'Wave 31 public execution contract absent');
  if (projection.execution_contract?.protected_tasks_preserved !== true) fail(errors, 'Wave 31 protected route preservation absent');

  for (const key of [
    'public_route_result_is_evidence_row',
    'public_route_execution_is_estate_adoption',
    'public_route_execution_closes_source_gap',
    'protected_route_is_publicly_executable',
    'protected_record_absence_is_substantive_inference',
    'public_base_universe_is_action_denominator',
    'published_action_is_complete_register',
    'formal_correction_is_effective_correction',
    'missing_join_is_completed_denominator',
    'shared_source_is_relationship',
    'source_recurrence_is_prevalence',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 31 authority inflation');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 31 graph boundary drift');

  const required = requiredBasinPaths(policy);
  for (const [basinId, paths] of Object.entries(required)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 31 path absent from ' + basinId);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 31 authoritative entrypoint absent from ' + basinId);
    }
  }
  for (const relative of [policy.paths.projection, ...Object.keys(resultRowsByPath)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 31 generated path absent from contract');
  }
  if (wave21Policy.boundaries.wave_31_public_route_result_is_evidence_row !== false) fail(errors, 'Wave 31 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_31_protected_route_is_publicly_executable !== false) fail(errors, 'Wave 31 protected-route boundary absent from Wave 21 policy');

  const rootPaths = [
    'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json',
    policy.paths.source_plan,
    policy.paths.method,
    policy.paths.milestone,
    policy.paths.projection,
    policy.paths.report,
    ...Object.keys(resultRowsByPath)
  ];
  for (const relative of rootPaths) {
    if (!lakeIndexPolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': Wave 31 authoritative root absent');
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 31 installer registration absent');
  }

  const validateScript = 'node tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs && node test/lake-allocator-war-public-route-execution-wave-31.test.js';
  if (pkg.scripts['validate:lake-allocator-war-public-route-execution-wave-31'] !== validateScript) fail(errors, 'Wave 31 package validator drift');
  if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-public-route-execution-wave-31')) fail(errors, 'Wave 31 absent from release gate');

  return errors;
}

export function loadState(root = defaultRoot) {
  const policy = readJson(root, 'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json');
  const sourcePlan = readJson(root, policy.paths.source_plan);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRowsByPath = {};
  const sourceRawByPath = {};
  for (const route of sourceProjection.routes) {
    const raw = fs.readFileSync(full(root, route.result_path), 'utf8');
    sourceRawByPath[route.result_path] = raw;
    sourceRowsByPath[route.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const projection = readJson(root, policy.paths.projection);
  const resultRowsByPath = Object.fromEntries(policy.route_plans.map(route => {
    const relative = resultPathFor(route.route_class, policy);
    return [relative, readJsonl(root, relative)];
  }));
  return {
    policy,
    sourcePlan,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy: readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json'),
    lakeIndexPolicy: readJson(root, 'data/project/lake-index-policy.json'),
    pkg: readJson(root, 'package.json'),
    installerText: fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8')
  };
}

function ensureAncestry(root, checkpoint) {
  if (process.env.LAW31_SKIP_GIT === '1') return;
  const run = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const hasCommit = ref => {
    try { run(['cat-file', '-e', ref + '^{commit}']); return true; } catch { return false; }
  };
  const isAncestor = (ancestor, target) => {
    try { run(['merge-base', '--is-ancestor', ancestor, target]); return true; } catch { return false; }
  };

  if (hasCommit(checkpoint) && isAncestor(checkpoint, 'HEAD')) return;

  const headRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
  if (process.env.GITHUB_ACTIONS === 'true' && headRef) {
    const remoteRef = 'refs/remotes/origin/' + headRef;
    try {
      run(['fetch', '--no-tags', '--prune', '--depth=1000000', 'origin',
        '+refs/heads/' + headRef + ':' + remoteRef]);
    } catch {
      throw new Error('Wave 31 ancestry recovery failed for ' + headRef);
    }
    if (!hasCommit(checkpoint)) throw new Error('Wave 31 base checkpoint remains unavailable after history recovery');
    if (!isAncestor(checkpoint, remoteRef)) throw new Error('Wave 31 base checkpoint is not an ancestor of recovered head');
    return;
  }

  if (!hasCommit(checkpoint)) throw new Error('Wave 31 base checkpoint object is unavailable');
  throw new Error('Wave 31 base checkpoint is not an ancestor of HEAD');
}

export function validateRepository(root = defaultRoot) {
  const state = loadState(root);
  ensureAncestry(root, state.policy.base_checkpoint.commit);
  const errors = validateArtifacts(state);
  if (errors.length) {
    for (const error of errors) console.error('- ' + error);
    throw new Error('Wave 31 validation failed with ' + errors.length + ' error(s)');
  }
  console.log('allocator-war public-route execution Wave 31 validation passed');
  console.log('  routes / tasks / executed / protected: ' +
    state.projection.counts.source_routes + ' / ' +
    state.projection.counts.source_tasks + ' / ' +
    state.projection.counts.executed_public_tasks + ' / ' +
    state.projection.counts.preserved_access_bounded_tasks);
  console.log('  receipts / uses: ' +
    state.projection.counts.official_source_receipts + ' / ' +
    state.projection.counts.source_receipt_uses);
  console.log('  result states: ' + JSON.stringify(state.projection.counts.result_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
  return state.projection;
}

if (import.meta.url === `file://${process.argv[1]}`) validateRepository();
