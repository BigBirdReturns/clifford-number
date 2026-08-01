#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildSourcePlan,
  buildExecution,
  resultPathFor
} from './build-lake-allocator-war-public-interest-execution-wave-29.mjs';

const defaultRoot = process.cwd();
const full = (root, relative) => path.join(root, relative);
const readJson = (root, relative) => JSON.parse(fs.readFileSync(full(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(full(root, relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => digestBytes(JSON.stringify(stable(value)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = values => new Set(values).size === values.length;
const fail = (errors, message) => errors.push(message);
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

function graphDigests(root) {
  return {
    participation_sha256: digest(readJsonl(root, 'data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson(root, 'build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson(root, 'build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson(root, 'build/hop-graph.json').rejected_hop_pairs)
  };
}

function requiredBasinPaths(policy, sourceProjection) {
  const results = sourceProjection.queues
    .slice()
    .sort((a, b) => a.queue_sequence - b.queue_sequence)
    .map(queue => resultPathFor(queue.queue_ref, policy));
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json',
      policy.paths.source_plan,
      policy.paths.method,
      policy.paths.milestone,
      ...results
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
    sourcePlan,
    sourcePlanRaw,
    inheritedRegistry,
    queueRowsByPath,
    projection,
    resultRowsByPath,
    wave21Policy,
    graphDigestView
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-public-interest-execution-wave-29-policy@1') fail(errors, 'Wave 29 policy schema drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-public-interest-implementation-wave-28@1') fail(errors, 'Wave 29 source is not Wave 28');
  if (sourcePlan.schema_version !== 'lake-allocator-war-public-interest-execution-wave-29-source-plan@1') fail(errors, 'Wave 29 source-plan schema drift');
  if (projection.schema_version !== 'lake-allocator-war-public-interest-execution-wave-29@1') fail(errors, 'Wave 29 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 29 program or wave drift');
  if (!same(sourcePlan.boundaries, policy.boundaries) || !same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 29 boundaries drift');
  if (policy.execution_law.complete_result_permitted !== false) fail(errors, 'Wave 29 complete result enabled');
  for (const key of [
    'execution_result_is_evidence_row',
    'bounded_source_search_is_adjudication',
    'partial_is_complete',
    'unavailable_after_search_is_null',
    'formal_scope_is_complete_affected_roster',
    'formal_authority_is_observed_use',
    'bounded_control_is_systemwide_remedy_adequacy',
    'shared_source_is_relationship',
    'source_recurrence_is_prevalence',
    'unreviewed_route_may_promote_finding',
    'queue_execution_is_estate_adoption',
    'identity_created',
    'relationship_created',
    'participation_created',
    'active_claim_created',
    'hop_created',
    'evidence_adjudicated',
    'finding_promoted',
    'publication_cleared'
  ]) if (policy.boundaries[key] !== false) fail(errors, key + ': Wave 29 authority inflation');
  if (policy.boundaries.graph_effect !== 'none') fail(errors, 'Wave 29 graph boundary drift');

  const inheritedByRef = new Map(inheritedRegistry.source_registry.map(row => [row.source_ref, row]));
  const expectedInherited = policy.source_contract.inherited_source_refs.map(ref => inheritedByRef.get(ref));
  if (expectedInherited.some(row => !row)) fail(errors, 'Wave 29 inherited source absent');
  const expectedSourcePlan = buildSourcePlan(policy, inheritedRegistry);
  if (!same(sourcePlan, expectedSourcePlan)) fail(errors, 'Wave 29 source plan differs from deterministic build');
  const sources = sourcePlan.source_registry;
  const plans = sourcePlan.task_plans;
  if (!unique(sources.map(row => row.source_ref))) fail(errors, 'duplicate Wave 29 source reference');
  if (!unique(plans.map(row => row.task_ref))) fail(errors, 'duplicate Wave 29 task plan');
  if (sources.length !== expected.source_receipts) fail(errors, 'Wave 29 source receipt count drift');
  if (plans.length !== expected.source_tasks) fail(errors, 'Wave 29 plan count drift');
  for (const source of sources) {
    if (!source.source_locator || !source.resolved_locator || !source.stable_identifier || !source.issuing_body || !source.source_type || !source.jurisdiction) {
      fail(errors, source.source_ref + ': incomplete source receipt');
    }
    if (source.source_bytes_preserved !== false) fail(errors, source.source_ref + ': false source-byte custody claim');
  }
  const sourceByRef = new Map(sources.map(row => [row.source_ref, row]));
  for (const plan of plans) {
    if (!policy.execution_law.result_states.includes(plan.result_state)) fail(errors, plan.task_ref + ': invalid Wave 29 result state');
    if (!Array.isArray(plan.source_refs) || plan.source_refs.length === 0) fail(errors, plan.task_ref + ': source refs absent');
    for (const ref of plan.source_refs) if (!sourceByRef.has(ref)) fail(errors, plan.task_ref + ': unknown source ' + ref);
    for (const key of [
      'coverage_statement',
      'included_rows',
      'unavailable_rows',
      'refused_rows',
      'negative_search_statement',
      'correction_route',
      'correction_outcome'
    ]) if (!(key in plan)) fail(errors, plan.task_ref + ': result field absent: ' + key);
  }
  if (!same(countBy(plans, 'result_state'), expected.result_states)) fail(errors, 'Wave 29 policy result-state denominator drift');
  if (plans.reduce((sum, row) => sum + row.source_refs.length, 0) !== expected.source_receipt_uses) fail(errors, 'Wave 29 source-use denominator drift');

  const sourceTasks = [];
  const sourceTasksByQueue = new Map();
  for (const queue of sourceProjection.queues) {
    const rows = queueRowsByPath[queue.result_path];
    if (!rows) {
      fail(errors, queue.queue_ref + ': Wave 28 queue rows absent');
      continue;
    }
    const tasks = rows
      .filter(row => row.row_type === 'implementation_closure_task')
      .sort((a, b) => a.task_sequence - b.task_sequence);
    sourceTasksByQueue.set(queue.queue_ref, tasks);
    sourceTasks.push(...tasks);
  }
  if (sourceTasks.length !== expected.source_tasks) fail(errors, 'Wave 29 source-task denominator drift');
  if (!same(sourceTasks.map(row => row.task_ref).sort(), plans.map(row => row.task_ref).sort())) fail(errors, 'Wave 29 task-plan denominator differs from Wave 28 tasks');
  for (const task of sourceTasks) {
    if (task.execution_state !== policy.execution_law.source_task_state) fail(errors, task.task_ref + ': Wave 28 task is not executable');
    if (task.complete_denominator !== false || task.evidence_adjudicated !== false || task.estate_adopted !== false || task.finding_promoted !== false || task.graph_effect !== 'none') {
      fail(errors, task.task_ref + ': Wave 28 source authority inflation');
    }
  }

  if (projection.generated_from?.source_projection_path !== policy.paths.source_projection) fail(errors, 'Wave 29 source projection path drift');
  if (projection.generated_from?.source_projection_bytes !== Buffer.byteLength(sourceProjectionRaw)) fail(errors, 'Wave 29 source projection byte drift');
  if (projection.generated_from?.source_projection_sha256 !== digestBytes(sourceProjectionRaw)) fail(errors, 'Wave 29 source projection hash drift');
  if (projection.generated_from?.source_plan_path !== policy.paths.source_plan) fail(errors, 'Wave 29 source-plan path drift');
  if (projection.generated_from?.source_plan_bytes !== Buffer.byteLength(sourcePlanRaw)) fail(errors, 'Wave 29 source-plan byte drift');
  if (projection.generated_from?.source_plan_sha256 !== digestBytes(sourcePlanRaw)) fail(errors, 'Wave 29 source-plan hash drift');

  let expectedBuild = null;
  try {
    expectedBuild = buildExecution(
      policy,
      sourceProjection,
      sourcePlan,
      sourceProjectionRaw,
      sourcePlanRaw,
      queueRowsByPath
    );
  } catch (error) {
    fail(errors, 'Wave 29 deterministic execution build failed: ' + error.message);
  }
  if (expectedBuild) {
    if (!same(projection, expectedBuild.projection)) fail(errors, 'Wave 29 projection differs from deterministic build');
    for (const [relative, rows] of Object.entries(expectedBuild.resultRowsByPath)) {
      if (!same(resultRowsByPath[relative], rows)) fail(errors, relative + ': Wave 29 ledger differs from deterministic build');
    }
    if (Object.keys(resultRowsByPath).length !== Object.keys(expectedBuild.resultRowsByPath).length) fail(errors, 'Wave 29 result-ledger path denominator drift');
  }

  const planByRef = new Map(plans.map(row => [row.task_ref, row]));
  const projectedBySourceQueue = new Map(projection.queues.map(row => [row.source_queue_ref, row]));
  const allRows = [];
  const summaries = [];
  const results = [];

  for (const sourceQueue of sourceProjection.queues) {
    const projectedQueue = projectedBySourceQueue.get(sourceQueue.queue_ref);
    if (!projectedQueue) {
      fail(errors, sourceQueue.queue_ref + ': projected Wave 29 queue absent');
      continue;
    }
    const relative = resultPathFor(sourceQueue.queue_ref, policy);
    const rows = resultRowsByPath[relative];
    if (!rows) {
      fail(errors, relative + ': Wave 29 result ledger absent');
      continue;
    }
    const summary = rows.find(row => row.row_type === 'implementation_execution_queue');
    const taskResults = rows
      .filter(row => row.row_type === 'implementation_execution_result')
      .sort((a, b) => a.task_sequence - b.task_sequence);
    const sourceQueueTasks = sourceTasksByQueue.get(sourceQueue.queue_ref) ?? [];
    if (!summary) fail(errors, relative + ': Wave 29 queue summary absent');
    summaries.push(summary);
    results.push(...taskResults);
    allRows.push(...rows);
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    if (projectedQueue.result_path !== relative || projectedQueue.result_rows !== rows.length || projectedQueue.result_sha256 !== digestBytes(raw)) {
      fail(errors, sourceQueue.queue_ref + ': Wave 29 ledger custody drift');
    }
    if (taskResults.length !== sourceQueueTasks.length) fail(errors, sourceQueue.queue_ref + ': Wave 29 task result denominator drift');

    for (const [index, sourceTask] of sourceQueueTasks.entries()) {
      const result = taskResults[index];
      if (!result || result.source_task_ref !== sourceTask.task_ref || result.task_sequence !== sourceTask.task_sequence) {
        fail(errors, sourceTask.task_ref + ': Wave 29 result ordering drift');
        continue;
      }
      const plan = planByRef.get(sourceTask.task_ref);
      if (!plan) {
        fail(errors, sourceTask.task_ref + ': Wave 29 plan absent');
        continue;
      }
      for (const key of [
        'queue_ref',
        'queue_sequence',
        'consumer_key',
        'consumer_feed_ref',
        'source_route_authority',
        'task_authority',
        'task_sequence',
        'task_class',
        'priority_tier',
        'source_closure_refs',
        'closure_target'
      ]) {
        const sourceKey = key === 'source_task_ref' ? 'task_ref' : key;
        if (!same(result[key], sourceTask[sourceKey])) fail(errors, sourceTask.task_ref + ': source task field drift: ' + key);
      }
      if (result.execution_state !== policy.execution_law.executed_state || result.executed_in_wave !== true) fail(errors, sourceTask.task_ref + ': Wave 29 task not executed');
      if (result.result_state !== plan.result_state) fail(errors, sourceTask.task_ref + ': Wave 29 result state drift');
      for (const key of [
        'source_refs',
        'coverage_statement',
        'included_rows',
        'unavailable_rows',
        'refused_rows',
        'negative_search_statement',
        'correction_route',
        'correction_outcome'
      ]) if (!same(result[key], plan[key])) fail(errors, sourceTask.task_ref + ': Wave 29 planned result drift: ' + key);
      if (result.source_receipt_count !== plan.source_refs.length) fail(errors, sourceTask.task_ref + ': Wave 29 source count drift');
      if (result.complete_denominator !== false || result.evidence_adjudicated !== false || result.evidence_rows !== 0 || result.estate_adopted !== false) {
        fail(errors, sourceTask.task_ref + ': Wave 29 denominator, evidence, or estate-adoption inflation');
      }
      if (!same(result.blocked_promotions, policy.blocked_promotions)) fail(errors, sourceTask.task_ref + ': Wave 29 blocked promotions drift');
      if (result.finding_promoted !== false || result.graph_effect !== 'none' || result.publication_status !== 'blocked') {
        fail(errors, sourceTask.task_ref + ': Wave 29 authority boundary drift');
      }
    }
  }

  const scalarChecks = {
    source_queues: sourceProjection.queues.length,
    source_tasks: sourceTasks.length,
    execution_ledgers: projection.queues.length,
    queue_summary_rows: summaries.length,
    execution_result_rows: results.length,
    execution_rows: allRows.length,
    executed_tasks: results.length,
    inherited_source_receipts: sourcePlan.counts.inherited_source_receipts,
    new_source_receipts: sourcePlan.counts.new_source_receipts,
    source_receipts: sourcePlan.counts.source_receipts,
    source_receipt_uses: results.reduce((sum, row) => sum + row.source_receipt_count, 0),
    complete_denominators: 0,
    evidence_rows: 0,
    estate_adoptions: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) {
    if (projection.counts[key] !== value || expected[key] !== value) fail(errors, key + ': Wave 29 count drift');
  }
  const actualStates = countBy(results, 'result_state');
  if (!same(projection.counts.result_states, actualStates) || !same(actualStates, expected.result_states)) fail(errors, 'Wave 29 result-state count drift');
  if (!same(projection.graph_digests, graphDigestView)) fail(errors, 'Wave 29 changed participation, claims, hop edges, or rejected-hop controls');

  const required = requiredBasinPaths(policy, sourceProjection);
  for (const [basinId, paths] of Object.entries(required)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 29 path absent from ' + basinId);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 29 authoritative entrypoint absent from ' + basinId);
    }
  }
  for (const relative of [policy.paths.projection, policy.paths.source_plan, ...Object.keys(resultRowsByPath)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 29 generated path absent from contract');
  }
  if (wave21Policy.boundaries.wave_29_execution_result_is_evidence_row !== false) fail(errors, 'Wave 29 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_29_queue_execution_is_estate_adoption !== false) fail(errors, 'Wave 29 estate-adoption boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json';
  const policy = readJson(root, policyPath);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourcePlanRaw = fs.readFileSync(full(root, policy.paths.source_plan), 'utf8');
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const inheritedRegistry = readJson(root, policy.paths.inherited_source_registry);
  const queueRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => [queue.result_path, readJsonl(root, queue.result_path)])
  );
  const projection = readJson(root, policy.paths.projection);
  const resultRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => {
      const relative = resultPathFor(queue.queue_ref, policy);
      return [relative, readJsonl(root, relative)];
    })
  );
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourceProjection,
    sourceProjectionRaw,
    sourcePlan,
    sourcePlanRaw,
    inheritedRegistry,
    queueRowsByPath,
    projection,
    resultRowsByPath,
    wave21Policy,
    graphDigestView: graphDigests(root)
  });

  if (process.env.LAW29_SKIP_GIT !== '1') {
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
        // The unchanged ancestry predicate is evaluated again below.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      checkpointAvailable = hasCommit(checkpoint);
      ancestrySatisfied = checkpointAvailable && isAncestor(checkpoint, ancestryTarget);
    }
    if (!checkpointAvailable) fail(errors, 'Wave 29 base checkpoint unavailable after targeted history recovery');
    else if (!ancestrySatisfied) fail(errors, 'Wave 29 base checkpoint is not an ancestor');
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 29 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('executed tasks:                      ' + policy.expected_counts.executed_tasks)) fail(errors, 'Wave 29 report executed count drift');
    if (!report.includes('complete denominators:               0')) fail(errors, 'Wave 29 report denominator boundary drift');
    if (!report.includes('graph effects:                       0')) fail(errors, 'Wave 29 report graph boundary drift');
  }

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = Object.values(requiredBasinPaths(policy, sourceProjection)).flat();
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 29 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) {
      fail(errors, basin.basin_id + ': installed Wave 29 basin contract drift');
    }
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-public-interest-execution-wave-29']) fail(errors, 'Wave 29 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-public-interest-execution-wave-29']) fail(errors, 'Wave 29 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-public-interest-execution-wave-29')) fail(errors, 'Wave 29 absent from complete release gate');

  for (const temporary of [
    '.github/tmp/wave29-public-interest-execution-trigger.json',
    '.github/workflows/temporary-wave29-public-interest-execution-materializer.yml',
    'tools/run-wave29-public-interest-execution-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary Wave 29 transport retained');

  if (process.env.LAW29_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      const required = requiredBasinPaths(policy, sourceProjection);
      for (const relative of required['allocator-war-source']) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 29 source basin');
      for (const relative of required['allocator-war-lake-actions']) if (byPath.get(relative)?.basin_id !== 'allocator-war-lake-actions') fail(errors, relative + ': wrong Wave 29 action basin');
      for (const relative of required['allocator-war-reports']) if (byPath.get(relative)?.basin_id !== 'allocator-war-reports') fail(errors, relative + ': wrong Wave 29 report basin');
    }
  }

  if (errors.length) throw new Error('allocator-war public-interest execution Wave 29 validation failed:\n- ' + errors.join('\n- '));
  return {
    queues: projection.counts.source_queues,
    tasks: projection.counts.source_tasks,
    receipts: projection.counts.source_receipts,
    uses: projection.counts.source_receipt_uses,
    resultStates: projection.counts.result_states
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war public-interest execution Wave 29 validation passed');
  console.log('  queues / tasks / receipts / uses: ' + result.queues + ' / ' + result.tasks + ' / ' + result.receipts + ' / ' + result.uses);
  console.log('  result states: ' + JSON.stringify(result.resultStates));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
