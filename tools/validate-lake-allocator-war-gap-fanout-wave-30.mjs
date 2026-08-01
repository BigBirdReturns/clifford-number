#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildFanout,
  collectSourceResults,
  resultPathFor
} from './build-lake-allocator-war-gap-fanout-wave-30.mjs';

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
  const ledgers = policy.route_classes
    .slice()
    .sort((a, b) => a.route_sequence - b.route_sequence)
    .map(route => resultPathFor(route.route_class, policy));
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json',
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
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-gap-fanout-wave-30-policy@1') fail(errors, 'Wave 30 policy schema drift');
  if (sourceProjection.schema_version !== policy.source_contract.required_source_schema) fail(errors, 'Wave 30 source is not sealed Wave 29');
  if (projection.schema_version !== 'lake-allocator-war-gap-fanout-wave-30@1') fail(errors, 'Wave 30 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 30 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 30 boundary drift');

  if (!unique(policy.route_classes.map(row => row.route_class))) fail(errors, 'duplicate Wave 30 route class');
  if (!unique(policy.route_classes.map(row => row.route_sequence))) fail(errors, 'duplicate Wave 30 route sequence');
  if (policy.route_classes.length !== expected.route_classes) fail(errors, 'Wave 30 route-class denominator drift');
  for (const route of policy.route_classes) {
    for (const key of ['route_class', 'owner', 'execution_state', 'objective', 'stop_rule']) {
      if (!route[key]) fail(errors, route.route_class + ': route field absent: ' + key);
    }
    if (!Array.isArray(route.required_receipts) || route.required_receipts.length === 0) fail(errors, route.route_class + ': required receipts absent');
    if (typeof route.public_execution !== 'boolean') fail(errors, route.route_class + ': public execution flag absent');
  }

  const assignmentKeys = policy.assignments.map(row => row.source_task_ref + '#' + row.unavailable_row_index);
  if (!unique(assignmentKeys)) fail(errors, 'duplicate Wave 30 gap assignment');
  if (policy.assignments.length !== expected.source_missing_rows) fail(errors, 'Wave 30 assignment denominator drift');
  const routeClasses = new Set(policy.route_classes.map(row => row.route_class));
  for (const assignment of policy.assignments) {
    if (!routeClasses.has(assignment.route_class)) fail(errors, assignment.source_task_ref + ': unknown Wave 30 route assignment');
    if (!Number.isInteger(assignment.unavailable_row_index) || assignment.unavailable_row_index < 0) fail(errors, assignment.source_task_ref + ': invalid unavailable-row index');
  }

  let sourceResults = [];
  try {
    sourceResults = collectSourceResults(sourceProjection, sourceRowsByPath);
  } catch (error) {
    fail(errors, 'Wave 30 source collection failed: ' + error.message);
  }
  if (sourceProjection.queues.length !== expected.source_queues) fail(errors, 'Wave 30 source queue count drift');
  if (sourceResults.length !== expected.source_tasks) fail(errors, 'Wave 30 source task count drift');
  for (const result of sourceResults) {
    if (result.schema_version !== policy.source_contract.required_source_result_schema) fail(errors, result.source_task_ref + ': source result schema drift');
    if (!policy.source_contract.required_result_states.includes(result.result_state)) fail(errors, result.source_task_ref + ': source result state not routable');
    if (result.complete_denominator !== false || result.evidence_rows !== 0 || result.finding_promoted !== false || result.graph_effect !== 'none' || result.publication_status !== 'blocked') {
      fail(errors, result.source_task_ref + ': Wave 29 source authority inflation');
    }
    if (!Array.isArray(result.unavailable_rows) || result.unavailable_rows.length === 0) fail(errors, result.source_task_ref + ': missing-row denominator absent');
  }
  const sourceMissingRows = sourceResults.reduce((sum, row) => sum + (row.unavailable_rows?.length ?? 0), 0);
  if (sourceMissingRows !== expected.source_missing_rows) fail(errors, 'Wave 30 source missing-row count drift');

  for (const queue of sourceProjection.queues) {
    const raw = sourceRawByPath[queue.result_path];
    if (typeof raw !== 'string') {
      fail(errors, queue.result_path + ': source raw bytes absent');
      continue;
    }
    if (digestBytes(raw) !== queue.result_sha256) fail(errors, queue.result_path + ': source ledger hash differs from Wave 29 custody');
  }

  let expectedBuild = null;
  try {
    expectedBuild = buildFanout(
      policy,
      sourceProjection,
      sourceProjectionRaw,
      sourceRowsByPath,
      sourceRawByPath
    );
  } catch (error) {
    fail(errors, 'Wave 30 deterministic build failed: ' + error.message);
  }
  if (expectedBuild) {
    if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 30 projection differs from deterministic build');
    if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 30 ledger-path denominator drift');
    for (const [relative, rows] of Object.entries(expectedBuild.resultRowsByPath)) {
      if (!same(resultRowsByPath[relative], rows)) fail(errors, relative + ': Wave 30 ledger differs from deterministic build');
    }
  }

  const allRows = Object.values(resultRowsByPath).flat();
  const summaries = allRows.filter(row => row.row_type === 'missing_row_route_summary');
  const tasks = allRows.filter(row => row.row_type === 'missing_row_closure_task');
  if (summaries.length !== expected.route_summary_rows) fail(errors, 'Wave 30 route summary count drift');
  if (tasks.length !== expected.closure_task_rows) fail(errors, 'Wave 30 closure task count drift');
  if (allRows.length !== expected.execution_rows) fail(errors, 'Wave 30 execution row count drift');
  if (!unique(tasks.map(row => row.task_ref))) fail(errors, 'duplicate Wave 30 closure task reference');
  if (!unique(tasks.map(row => row.source_task_ref + '#' + row.unavailable_row_index))) fail(errors, 'duplicate Wave 30 source-gap task');
  if (!same(countBy(tasks, 'route_class'), expected.route_task_counts)) fail(errors, 'Wave 30 route-task counts drift');
  if (tasks.filter(row => row.publicly_executable).length !== expected.publicly_executable_tasks) fail(errors, 'Wave 30 publicly executable count drift');
  if (tasks.filter(row => row.access_bounded).length !== expected.access_bounded_tasks) fail(errors, 'Wave 30 access-bounded count drift');

  for (const task of tasks) {
    const route = policy.route_classes.find(row => row.route_class === task.route_class);
    if (!route) {
      fail(errors, task.task_ref + ': route class absent');
      continue;
    }
    if (task.execution_state !== route.execution_state || task.route_owner !== route.owner) fail(errors, task.task_ref + ': route custody drift');
    if (task.publicly_executable !== route.public_execution || task.access_bounded !== !route.public_execution) fail(errors, task.task_ref + ': access classification drift');
    if (task.unavailable_row_sha256 !== digestBytes(task.unavailable_row)) fail(errors, task.task_ref + ': missing-row hash drift');
    if (task.closure_status !== 'open_routed' || task.same_wave_source_acquisition !== false || task.same_wave_completion !== false) fail(errors, task.task_ref + ': same-wave closure inflation');
    if (task.complete_denominator !== false || task.evidence_adjudicated !== false || task.evidence_rows !== 0 || task.estate_adopted !== false) fail(errors, task.task_ref + ': denominator, evidence, or estate inflation');
    if (!same(task.blocked_promotions, policy.blocked_promotions)) fail(errors, task.task_ref + ': blocked promotions drift');
    if (task.finding_promoted !== false || task.graph_effect !== 'none' || task.publication_status !== 'blocked') fail(errors, task.task_ref + ': authority boundary drift');
  }
  for (const summary of summaries) {
    const routeTasks = tasks.filter(row => row.route_class === summary.route_class);
    if (summary.task_count !== routeTasks.length) fail(errors, summary.route_class + ': summary task count drift');
    if (summary.complete_denominators !== 0 || summary.evidence_rows !== 0 || summary.estate_adoptions !== 0 || summary.finding_promotions !== 0 || summary.graph_effects !== 0 || summary.publication_clearances !== 0) {
      fail(errors, summary.route_class + ': summary authority inflation');
    }
  }

  const scalarChecks = {
    source_queues: sourceProjection.queues.length,
    source_tasks: sourceResults.length,
    source_missing_rows: tasks.length,
    route_classes: policy.route_classes.length,
    route_ledgers: projection.routes.length,
    route_summary_rows: summaries.length,
    closure_task_rows: tasks.length,
    execution_rows: allRows.length,
    publicly_executable_tasks: tasks.filter(row => row.publicly_executable).length,
    access_bounded_tasks: tasks.filter(row => row.access_bounded).length,
    complete_denominators: 0,
    evidence_rows: 0,
    estate_adoptions: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) {
    if (projection.counts[key] !== value || expected[key] !== value) fail(errors, key + ': Wave 30 count drift');
  }
  if (!same(projection.counts.route_task_counts, expected.route_task_counts)) fail(errors, 'Wave 30 projected route counts drift');
  if (!same(projection.graph_digests, sourceProjection.graph_digests)) fail(errors, 'Wave 30 changed graph digests');
  if (projection.amortization_contract?.manual_per_task_dispatch_required !== false) fail(errors, 'Wave 30 manual dispatch reintroduced');
  if (projection.amortization_contract?.one_build_emits_every_missing_row !== true) fail(errors, 'Wave 30 full fan-out contract absent');

  for (const key of [
    'gap_task_is_evidence_row',
    'route_assignment_is_estate_adoption',
    'route_assignment_closes_source_gap',
    'protected_record_absence_is_substantive_inference',
    'public_base_universe_is_action_denominator',
    'published_action_is_complete_register',
    'formal_correction_is_effective_correction',
    'category_is_person_level_denominator',
    'shared_route_is_relationship',
    'route_recurrence_is_prevalence',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 30 authority inflation');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 30 graph boundary drift');

  const required = requiredBasinPaths(policy);
  for (const [basinId, paths] of Object.entries(required)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 30 path absent from ' + basinId);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 30 authoritative entrypoint absent from ' + basinId);
    }
  }
  for (const relative of [policy.paths.projection, ...Object.keys(resultRowsByPath)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 30 generated path absent from contract');
  }
  if (wave21Policy.boundaries.wave_30_gap_task_is_evidence_row !== false) fail(errors, 'Wave 30 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_30_route_assignment_is_estate_adoption !== false) fail(errors, 'Wave 30 estate-adoption boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json';
  const policy = readJson(root, policyPath);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRowsByPath = {};
  const sourceRawByPath = {};
  for (const queue of sourceProjection.queues) {
    const raw = fs.readFileSync(full(root, queue.result_path), 'utf8');
    sourceRawByPath[queue.result_path] = raw;
    sourceRowsByPath[queue.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const projection = readJson(root, policy.paths.projection);
  const resultRowsByPath = Object.fromEntries(policy.route_classes.map(route => {
    const relative = resultPathFor(route.route_class, policy);
    return [relative, readJsonl(root, relative)];
  }));
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    projection,
    resultRowsByPath,
    wave21Policy
  });

  if (process.env.LAW30_SKIP_GIT !== '1') {
    const checkpoint = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasCommit = commitish => {
      try { quietGit(['cat-file', '-e', commitish + '^{commit}']); return true; } catch { return false; }
    };
    const isAncestor = (ancestor, target) => {
      try { quietGit(['merge-base', '--is-ancestor', ancestor, target]); return true; } catch { return false; }
    };
    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let checkpointAvailable = hasCommit(checkpoint);
    let ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
    if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit(['fetch', '--no-tags', '--depth=1000000', 'origin', '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef]);
      } catch {
        // The same ancestry predicate is evaluated again below.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      checkpointAvailable = hasCommit(checkpoint);
      ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
    }
    if (!checkpointAvailable) fail(errors, 'Wave 30 base checkpoint unavailable after targeted history recovery');
    else if (!ancestrySatisfied) fail(errors, 'Wave 30 base checkpoint is not an ancestor');
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 30 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('explicit missing rows:              ' + policy.expected_counts.source_missing_rows)) fail(errors, 'Wave 30 report missing-row count drift');
    if (!report.includes('complete denominators:              0')) fail(errors, 'Wave 30 report denominator boundary drift');
    if (!report.includes('graph effects:                      0')) fail(errors, 'Wave 30 report graph boundary drift');
  }

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = Object.values(requiredBasinPaths(policy)).flat();
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 30 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) {
      fail(errors, basin.basin_id + ': installed Wave 30 basin contract drift');
    }
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-gap-fanout-wave-30']) fail(errors, 'Wave 30 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-gap-fanout-wave-30']) fail(errors, 'Wave 30 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-gap-fanout-wave-30')) fail(errors, 'Wave 30 absent from complete release gate');

  for (const temporary of [
    '.github/tmp/wave30-gap-fanout-trigger.json',
    '.github/workflows/temporary-wave30-gap-fanout-materializer.yml',
    'tools/run-wave30-gap-fanout-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary Wave 30 transport retained');

  if (process.env.LAW30_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      const required = requiredBasinPaths(policy);
      for (const relative of required['allocator-war-source']) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 30 source basin');
      for (const relative of required['allocator-war-lake-actions']) if (byPath.get(relative)?.basin_id !== 'allocator-war-lake-actions') fail(errors, relative + ': wrong Wave 30 action basin');
      for (const relative of required['allocator-war-reports']) if (byPath.get(relative)?.basin_id !== 'allocator-war-reports') fail(errors, relative + ': wrong Wave 30 report basin');
    }
  }

  if (errors.length) throw new Error('allocator-war gap fan-out Wave 30 validation failed:\n- ' + errors.join('\n- '));
  return {
    sourceTasks: projection.counts.source_tasks,
    missingRows: projection.counts.source_missing_rows,
    routes: projection.counts.route_classes,
    publicTasks: projection.counts.publicly_executable_tasks,
    accessBounded: projection.counts.access_bounded_tasks
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war gap fan-out Wave 30 validation passed');
  console.log('  source tasks / missing rows / routes: ' + result.sourceTasks + ' / ' + result.missingRows + ' / ' + result.routes);
  console.log('  publicly executable / access bounded: ' + result.publicTasks + ' / ' + result.accessBounded);
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
