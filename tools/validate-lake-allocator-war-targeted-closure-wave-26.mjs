#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

function expectedResultPath(sourceQueueRef, policy) {
  return policy.paths.result_root + '/' + sourceQueueRef.toLowerCase() + '.jsonl';
}

function requiredBasinPaths(policy, sourceProjection) {
  const results = sourceProjection.queues
    .slice()
    .sort((a, b) => a.queue_sequence - b.queue_sequence)
    .map(queue => expectedResultPath(queue.source_queue_ref, policy));
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json',
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
    sourcePlan,
    sourceProjectionRaw,
    sourcePlanRaw,
    projection,
    queueRowsByPath,
    resultRowsByPath,
    wave21Policy
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-targeted-closure-wave-26-policy@1') fail(errors, 'Wave 26 policy schema drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-denominator-closure-wave-25@1') fail(errors, 'Wave 26 source is not Wave 25');
  if (sourcePlan.schema_version !== 'lake-allocator-war-targeted-closure-wave-26-source-plan@1') fail(errors, 'Wave 26 source-plan schema drift');
  if (projection.schema_version !== 'lake-allocator-war-targeted-closure-wave-26@1') fail(errors, 'Wave 26 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 26 program or wave drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 26 projected boundaries drift');
  if (policy.boundaries.graph_effect !== 'none' || policy.boundaries.publication_cleared !== false) fail(errors, 'Wave 26 graph or publication boundary drift');
  if (policy.execution_law.same_wave_downstream_execution !== false) fail(errors, 'Wave 26 same-wave downstream execution enabled');
  if (policy.execution_law.task_plan_for_blocked_task !== false) fail(errors, 'Wave 26 blocked-task planning enabled');

  const sources = sourcePlan.source_registry;
  const plans = sourcePlan.task_plans;
  if (!unique(sources.map(row => row.source_ref))) fail(errors, 'duplicate Wave 26 source reference');
  if (!unique(plans.map(row => row.closure_ref))) fail(errors, 'duplicate Wave 26 task plan');
  const sourceByRef = new Map(sources.map(row => [row.source_ref, row]));
  for (const source of sources) {
    if (!source.source_locator || !source.issuing_body || !source.source_type || !source.jurisdiction) fail(errors, source.source_ref + ': incomplete source receipt');
    if (source.source_bytes_preserved !== false) fail(errors, source.source_ref + ': false source-byte custody claim');
  }

  const sourceTasks = [];
  const sourceTasksByQueue = new Map();
  for (const queue of sourceProjection.queues) {
    const rows = queueRowsByPath[queue.queue_path];
    if (!rows) {
      fail(errors, queue.queue_ref + ': Wave 25 queue rows absent');
      continue;
    }
    const summary = rows.find(row => row.row_type === 'closure_queue');
    const tasks = rows.filter(row => row.row_type === 'closure_task').sort((a, b) => a.closure_sequence - b.closure_sequence);
    if (!summary) fail(errors, queue.queue_ref + ': Wave 25 queue summary absent');
    sourceTasksByQueue.set(queue.source_queue_ref, tasks);
    sourceTasks.push(...tasks);
  }
  const readyTasks = sourceTasks.filter(row => row.execution_state === policy.execution_law.ready_source_state);
  const blockedTasks = sourceTasks.filter(row => row.execution_state === policy.execution_law.blocked_source_state);
  const readyRefs = readyTasks.map(row => row.closure_ref).sort();
  const blockedRefs = blockedTasks.map(row => row.closure_ref).sort();
  if (!same(plans.map(row => row.closure_ref).sort(), readyRefs)) fail(errors, 'Wave 26 task-plan denominator differs from ready Wave 25 tasks');
  for (const blockedRef of blockedRefs) if (plans.some(row => row.closure_ref === blockedRef)) fail(errors, blockedRef + ': blocked task received a plan');
  for (const plan of plans) {
    if (!policy.execution_law.result_states.includes(plan.result_state)) fail(errors, plan.closure_ref + ': invalid result state');
    if (!Array.isArray(plan.source_refs) || plan.source_refs.length === 0) fail(errors, plan.closure_ref + ': source refs absent');
    for (const sourceRef of plan.source_refs) if (!sourceByRef.has(sourceRef)) fail(errors, plan.closure_ref + ': unknown source ' + sourceRef);
    for (const key of ['coverage_statement','included_rows','unavailable_rows','refused_rows','negative_search_statement','correction_route','correction_outcome']) {
      if (!(key in plan)) fail(errors, plan.closure_ref + ': result field absent: ' + key);
    }
  }

  if (projection.generated_from?.source_projection_path !== policy.paths.source_projection) fail(errors, 'Wave 26 source projection path drift');
  if (projection.generated_from?.source_projection_bytes !== Buffer.byteLength(sourceProjectionRaw)) fail(errors, 'Wave 26 source projection byte drift');
  if (projection.generated_from?.source_projection_sha256 !== digestBytes(sourceProjectionRaw)) fail(errors, 'Wave 26 source projection hash drift');
  if (projection.generated_from?.source_plan_path !== policy.paths.source_plan) fail(errors, 'Wave 26 source-plan path drift');
  if (projection.generated_from?.source_plan_bytes !== Buffer.byteLength(sourcePlanRaw)) fail(errors, 'Wave 26 source-plan byte drift');
  if (projection.generated_from?.source_plan_sha256 !== digestBytes(sourcePlanRaw)) fail(errors, 'Wave 26 source-plan hash drift');

  if (projection.queues.length !== expected.source_queues) fail(errors, 'Wave 26 queue denominator drift');
  if (!unique(projection.queues.map(row => row.queue_ref))) fail(errors, 'duplicate Wave 26 queue reference');
  if (!unique(projection.queues.map(row => row.source_queue_ref))) fail(errors, 'duplicate Wave 26 source queue');

  const planByRef = new Map(plans.map(row => [row.closure_ref, row]));
  const projectionBySourceQueue = new Map(projection.queues.map(row => [row.source_queue_ref, row]));
  const allResults = [];
  const allSummaries = [];

  for (const sourceQueue of sourceProjection.queues) {
    const projectedQueue = projectionBySourceQueue.get(sourceQueue.source_queue_ref);
    if (!projectedQueue) {
      fail(errors, sourceQueue.source_queue_ref + ': Wave 26 queue absent');
      continue;
    }
    const resultPath = expectedResultPath(sourceQueue.source_queue_ref, policy);
    const rows = resultRowsByPath[resultPath];
    if (!rows) {
      fail(errors, resultPath + ': Wave 26 result ledger absent');
      continue;
    }
    const summary = rows.find(row => row.row_type === 'closure_execution_queue');
    const results = rows.filter(row => row.row_type === 'closure_execution_result').sort((a, b) => a.closure_sequence - b.closure_sequence);
    const sourceRows = sourceTasksByQueue.get(sourceQueue.source_queue_ref) ?? [];
    if (!summary) fail(errors, resultPath + ': queue summary absent');
    allSummaries.push(summary);
    allResults.push(...results);
    if (results.length !== sourceRows.length) fail(errors, sourceQueue.source_queue_ref + ': result task denominator drift');
    if (projectedQueue.result_path !== resultPath) fail(errors, sourceQueue.source_queue_ref + ': result path drift');
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    if (projectedQueue.result_rows !== rows.length || projectedQueue.result_sha256 !== digestBytes(raw)) fail(errors, sourceQueue.source_queue_ref + ': result ledger custody drift');

    for (const [index, sourceTask] of sourceRows.entries()) {
      const result = results[index];
      if (!result || result.closure_ref !== sourceTask.closure_ref || result.closure_sequence !== sourceTask.closure_sequence) {
        fail(errors, sourceTask.closure_ref + ': result ordering drift');
        continue;
      }
      for (const key of ['packet_ref','source_queue_ref','source_task_ref','consumer_key','queue_class','source_route_authority','task_authority','task_class','priority_tier','closure_target']) {
        if (!same(result[key], sourceTask[key])) fail(errors, sourceTask.closure_ref + ': source task field drift: ' + key);
      }
      if (sourceTask.execution_state === policy.execution_law.ready_source_state) {
        const plan = planByRef.get(sourceTask.closure_ref);
        if (!plan) {
          fail(errors, sourceTask.closure_ref + ': ready result plan absent');
          continue;
        }
        if (result.executed_in_wave !== true || result.execution_state !== policy.execution_law.executed_state) fail(errors, sourceTask.closure_ref + ': ready task not executed');
        if (result.result_state !== plan.result_state) fail(errors, sourceTask.closure_ref + ': result state drift');
        for (const key of ['source_refs','coverage_statement','included_rows','unavailable_rows','refused_rows','negative_search_statement','correction_route','correction_outcome']) {
          if (!same(result[key], plan[key])) fail(errors, sourceTask.closure_ref + ': planned result drift: ' + key);
        }
        if (result.source_receipt_count !== plan.source_refs.length) fail(errors, sourceTask.closure_ref + ': source receipt count drift');
      } else {
        if (result.executed_in_wave !== false || result.result_state !== null || result.source_refs.length !== 0) fail(errors, sourceTask.closure_ref + ': blocked task received execution result');
        const gate = sourceRows.find(row => row.task_class === 'gate_identification');
        const gatePlan = gate ? planByRef.get(gate.closure_ref) : null;
        if (!gatePlan) {
          fail(errors, sourceTask.closure_ref + ': gate plan absent for blocked transition');
        } else if (gatePlan.result_state === 'complete') {
          if (result.execution_state !== policy.execution_law.unblocked_next_wave_state) fail(errors, sourceTask.closure_ref + ': completed gate did not unblock next wave');
        } else if (gatePlan.result_state === 'no_qualifying_gate') {
          if (result.execution_state !== policy.execution_law.blocked_no_gate_state) fail(errors, sourceTask.closure_ref + ': no-gate result did not preserve block');
        } else if (result.execution_state !== policy.execution_law.blocked_source_state) {
          fail(errors, sourceTask.closure_ref + ': blocked transition drift');
        }
      }
      if (result.complete_denominator !== false || result.evidence_adjudicated !== false || result.evidence_rows !== 0) fail(errors, sourceTask.closure_ref + ': evidence or denominator inflation');
      if (!same(result.blocked_promotions, policy.blocked_promotions)) fail(errors, sourceTask.closure_ref + ': blocked promotions drift');
      if (result.finding_promoted !== false || result.graph_effect !== 'none' || result.publication_status !== 'blocked') fail(errors, sourceTask.closure_ref + ': authority boundary drift');
    }
  }

  const executed = allResults.filter(row => row.executed_in_wave);
  const preserved = allResults.filter(row => !row.executed_in_wave);
  const actualResultStates = countBy(executed, 'result_state');
  const actualDownstreamStates = countBy(preserved, 'execution_state');
  if (!same(projection.counts.result_states, actualResultStates)) fail(errors, 'Wave 26 result-state count drift');
  if (!same(projection.counts.downstream_states, actualDownstreamStates)) fail(errors, 'Wave 26 downstream-state count drift');

  const scalarChecks = {
    source_queues: sourceProjection.queues.length,
    source_closure_tasks: sourceTasks.length,
    source_ready_tasks: readyTasks.length,
    source_blocked_tasks: blockedTasks.length,
    execution_ledgers: projection.queues.length,
    queue_summary_rows: allSummaries.length,
    execution_result_rows: allResults.length,
    execution_rows: allSummaries.length + allResults.length,
    executed_tasks: executed.length,
    preserved_blocked_tasks: preserved.length,
    source_receipts: sources.length,
    source_receipt_uses: executed.reduce((sum, row) => sum + row.source_receipt_count, 0),
    complete_denominators: 0,
    evidence_rows: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(scalarChecks)) if (projection.counts[key] !== value) fail(errors, key + ': Wave 26 count drift');

  const expectedResultCounts = {
    complete: expected.result_complete,
    partial: expected.result_partial,
    unavailable_after_search: expected.result_unavailable_after_search,
    no_qualifying_gate: expected.result_no_qualifying_gate
  };
  for (const [key, value] of Object.entries(expectedResultCounts)) if ((actualResultStates[key] ?? 0) !== value) fail(errors, key + ': Wave 26 expected result count drift');
  if ((actualDownstreamStates[policy.execution_law.unblocked_next_wave_state] ?? 0) !== expected.downstream_unblocked_for_next_wave) fail(errors, 'Wave 26 unblocked-next-wave count drift');
  if ((actualDownstreamStates[policy.execution_law.blocked_no_gate_state] ?? 0) !== expected.downstream_blocked_no_qualifying_gate) fail(errors, 'Wave 26 blocked-no-gate count drift');

  const gate05 = planByRef.get('LAW25-LAW21-EST-05/C02');
  const gate11 = planByRef.get('LAW25-LAW21-EST-11/C02');
  if (gate05?.result_state !== 'complete') fail(errors, 'public-interest G0 gate result drift');
  if (gate11?.result_state !== 'no_qualifying_gate') fail(errors, 'legislative-political-finance G0 result drift');

  const required = requiredBasinPaths(policy, sourceProjection);
  for (const [basinRef, paths] of Object.entries(required)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinRef);
    if (!basin) {
      fail(errors, basinRef + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 26 path absent from ' + basinRef);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 26 authoritative entrypoint absent from ' + basinRef);
    }
  }
  for (const relative of [policy.paths.projection, ...Object.keys(resultRowsByPath)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 26 generated path absent from contract');
  }
  if (wave21Policy.boundaries.wave_26_closure_result_is_evidence_row !== false) fail(errors, 'Wave 26 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_26_newly_unblocked_executes_same_wave !== false) fail(errors, 'Wave 26 same-wave boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json';
  const policy = readJson(root, policyPath);
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourcePlanRaw = fs.readFileSync(full(root, policy.paths.source_plan), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const projection = readJson(root, policy.paths.projection);
  const queueRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => [queue.queue_path, readJsonl(root, queue.queue_path)])
  );
  const resultRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => {
      const relative = expectedResultPath(queue.source_queue_ref, policy);
      return [relative, readJsonl(root, relative)];
    })
  );
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourceProjection,
    sourcePlan,
    sourceProjectionRaw,
    sourcePlanRaw,
    projection,
    queueRowsByPath,
    resultRowsByPath,
    wave21Policy
  });

  if (process.env.LAW26_SKIP_GIT !== '1') {
    const baseCommit = policy.base_checkpoint.commit;
    const quietGit = args => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    const hasCommit = commitish => {
      try {
        quietGit(['cat-file', '-e', commitish + '^{commit}']);
        return true;
      } catch {
        return false;
      }
    };
    const isAncestor = (ancestor, target) => {
      try {
        quietGit(['merge-base', '--is-ancestor', ancestor, target]);
        return true;
      } catch {
        return false;
      }
    };
    const githubHeadRef = String(process.env.GITHUB_HEAD_REF ?? '').trim();
    const remoteHeadRef = githubHeadRef ? 'refs/remotes/origin/' + githubHeadRef : null;
    let ancestryTarget = 'HEAD';
    let baseAvailable = hasCommit(baseCommit);
    let ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    if (!ancestrySatisfied && process.env.GITHUB_ACTIONS === 'true' && remoteHeadRef) {
      try {
        quietGit(['fetch','--no-tags','--depth=1000000','origin','+refs/heads/' + githubHeadRef + ':' + remoteHeadRef]);
      } catch {
        // Bounded recovery failure is reported below.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
      ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    }
    if (!baseAvailable) fail(errors, 'Wave 26 base checkpoint unavailable after targeted history recovery');
    else if (!ancestrySatisfied) fail(errors, 'Wave 26 base checkpoint is not an ancestor');
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 26 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('executed ready tasks:                ' + policy.expected_counts.executed_tasks)) fail(errors, 'Wave 26 report executed count drift');
    if (!report.includes('complete denominators:               0')) fail(errors, 'Wave 26 report denominator boundary drift');
    if (!report.includes('graph effects:                       0')) fail(errors, 'Wave 26 report graph boundary drift');
  }

  if (!same(projection.graph_digests, graphDigests(root))) fail(errors, 'Wave 26 changed participation, claims, hop edges, or rejected-hop controls');

  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  const requiredRoots = Object.values(requiredBasinPaths(policy, sourceProjection)).flat();
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 26 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source','allocator-war-lake-actions','allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) {
      fail(errors, basin.basin_id + ': installed Wave 26 basin contract drift');
    }
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-targeted-closure-wave-26']) fail(errors, 'Wave 26 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-targeted-closure-wave-26']) fail(errors, 'Wave 26 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-targeted-closure-wave-26')) fail(errors, 'Wave 26 absent from complete release gate');

  for (const temporary of [
    '.github/tmp/wave26-targeted-closure-trigger.json',
    '.github/workflows/temporary-wave26-targeted-closure-materializer.yml',
    'tools/run-wave26-targeted-closure-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary Wave 26 transport retained');

  if (process.env.LAW26_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      const required = requiredBasinPaths(policy, sourceProjection);
      for (const relative of required['allocator-war-source']) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong source basin');
      for (const relative of required['allocator-war-lake-actions']) if (byPath.get(relative)?.basin_id !== 'allocator-war-lake-actions') fail(errors, relative + ': wrong action basin');
      for (const relative of required['allocator-war-reports']) if (byPath.get(relative)?.basin_id !== 'allocator-war-reports') fail(errors, relative + ': wrong report basin');
    }
  }

  if (errors.length) throw new Error('allocator-war targeted closure Wave 26 validation failed:\n- ' + errors.join('\n- '));
  return {
    queues: projection.counts.source_queues,
    tasks: projection.counts.source_closure_tasks,
    executed: projection.counts.executed_tasks,
    blocked: projection.counts.preserved_blocked_tasks,
    resultStates: projection.counts.result_states,
    downstreamStates: projection.counts.downstream_states
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war targeted closure Wave 26 validation passed');
  console.log('  queues / tasks / executed / blocked: ' + result.queues + ' / ' + result.tasks + ' / ' + result.executed + ' / ' + result.blocked);
  console.log('  result states: ' + JSON.stringify(result.resultStates));
  console.log('  downstream states: ' + JSON.stringify(result.downstreamStates));
  console.log('  findings / graph / publication: 0 / 0 / 0');
}
