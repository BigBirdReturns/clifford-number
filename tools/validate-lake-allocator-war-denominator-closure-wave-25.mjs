#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  classifyTarget,
  queuePathFor
} from './build-lake-allocator-war-denominator-closure-wave-25.mjs';

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

function expectedQueuePaths(sourceProjection, policy) {
  return sourceProjection.executions
    .slice()
    .sort((a, b) => a.queue_sequence - b.queue_sequence || a.packet_sequence - b.packet_sequence)
    .map(execution => queuePathFor(execution.source_queue_ref, policy));
}

function requiredBasinPaths(policy, sourceProjection) {
  return {
    'allocator-war-source': [
      'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json',
      policy.paths.method,
      policy.paths.milestone,
      ...expectedQueuePaths(sourceProjection, policy)
    ],
    'allocator-war-lake-actions': [policy.paths.projection],
    'allocator-war-reports': [policy.paths.report]
  };
}

export function validateArtifacts(state) {
  const {
    policy,
    sourcePlan,
    sourcePlanRaw,
    sourceProjection,
    sourceProjectionRaw,
    projection,
    queueRowsByPath,
    queueRawByPath,
    wave21Policy
  } = state;
  const errors = [];
  const expected = policy.expected_counts;

  if (policy.schema_version !== 'lake-allocator-war-denominator-closure-wave-25-policy@1') fail(errors, 'Wave 25 policy schema drift');
  if (sourcePlan.schema_version !== 'lake-allocator-war-lead-execution-wave-24-source-plan@1') fail(errors, 'Wave 25 source plan schema drift');
  if (sourceProjection.schema_version !== 'lake-allocator-war-lead-execution-wave-24@1') fail(errors, 'Wave 25 source projection schema drift');
  if (projection.schema_version !== 'lake-allocator-war-denominator-closure-wave-25@1') fail(errors, 'Wave 25 projection schema drift');
  if (projection.program_ref !== policy.program_ref || projection.wave_ref !== policy.wave_ref) fail(errors, 'Wave 25 program or wave reference drift');
  if (!same(projection.boundaries, policy.boundaries)) fail(errors, 'Wave 25 boundary projection drift');
  if (policy.boundaries.graph_effect !== 'none' || policy.boundaries.evidence_adjudicated !== false || policy.boundaries.finding_promoted !== false || policy.boundaries.publication_cleared !== false) fail(errors, 'Wave 25 authority boundary drift');

  if (projection.generated_from?.source_plan_path !== policy.paths.source_plan) fail(errors, 'Wave 25 source-plan path drift');
  if (projection.generated_from?.source_plan_bytes !== Buffer.byteLength(sourcePlanRaw)) fail(errors, 'Wave 25 source-plan byte count drift');
  if (projection.generated_from?.source_plan_sha256 !== digestBytes(sourcePlanRaw)) fail(errors, 'Wave 25 source-plan sha256 drift');
  if (projection.generated_from?.source_projection_path !== policy.paths.source_projection) fail(errors, 'Wave 25 source-projection path drift');
  if (projection.generated_from?.source_projection_bytes !== Buffer.byteLength(sourceProjectionRaw)) fail(errors, 'Wave 25 source-projection byte count drift');
  if (projection.generated_from?.source_projection_sha256 !== digestBytes(sourceProjectionRaw)) fail(errors, 'Wave 25 source-projection sha256 drift');

  if (sourcePlan.packet_plans.length !== expected.source_packets) fail(errors, 'Wave 25 source packet denominator drift');
  if (sourceProjection.executions.length !== expected.source_packets) fail(errors, 'Wave 25 execution packet denominator drift');
  if (!unique(sourcePlan.packet_plans.map(row => row.packet_ref))) fail(errors, 'duplicate Wave 25 source packet plan');
  if (!unique(sourceProjection.executions.map(row => row.packet_ref))) fail(errors, 'duplicate Wave 25 source execution packet');
  const executionByPacket = new Map(sourceProjection.executions.map(row => [row.packet_ref, row]));
  const planByPacket = new Map(sourcePlan.packet_plans.map(row => [row.packet_ref, row]));
  for (const plan of sourcePlan.packet_plans) if (!executionByPacket.has(plan.packet_ref)) fail(errors, plan.packet_ref + ': Wave 24 execution absent');
  for (const execution of sourceProjection.executions) if (!planByPacket.has(execution.packet_ref)) fail(errors, execution.packet_ref + ': Wave 24 source plan absent');
  const unavailableCount = sourcePlan.packet_plans.reduce((sum, row) => sum + row.unavailable_rows.length, 0);
  if (unavailableCount !== expected.closure_tasks) fail(errors, 'Wave 25 unavailable-obligation denominator drift');

  if (projection.queues.length !== expected.closure_queues) fail(errors, 'Wave 25 projection queue count drift');
  if (!unique(projection.queues.map(row => row.queue_ref))) fail(errors, 'duplicate Wave 25 queue reference');
  if (!unique(projection.queues.map(row => row.queue_path))) fail(errors, 'duplicate Wave 25 queue path');
  const projectionByPacket = new Map(projection.queues.map(row => [row.packet_ref, row]));
  const allSummaryRows = [];
  const allTaskRows = [];

  for (const plan of sourcePlan.packet_plans) {
    const execution = executionByPacket.get(plan.packet_ref);
    const queue = projectionByPacket.get(plan.packet_ref);
    if (!execution || !queue) {
      if (!queue) fail(errors, plan.packet_ref + ': Wave 25 queue absent');
      continue;
    }
    const expectedPath = queuePathFor(execution.source_queue_ref, policy);
    const rows = queueRowsByPath[expectedPath];
    const raw = queueRawByPath[expectedPath];
    if (!Array.isArray(rows)) {
      fail(errors, plan.packet_ref + ': Wave 25 queue ledger absent');
      continue;
    }
    if (typeof raw !== 'string') fail(errors, plan.packet_ref + ': Wave 25 queue raw bytes absent');
    if (rows.length !== plan.unavailable_rows.length + 1) fail(errors, plan.packet_ref + ': Wave 25 queue row count drift');
    const summary = rows[0];
    const tasks = rows.slice(1);
    allSummaryRows.push(summary);
    allTaskRows.push(...tasks);
    const gateUnspecified = plan.acquisition_disposition === 'bounded_public_record_recovered_gate_unspecified';
    const expectedQueueState = gateUnspecified
      ? policy.execution_law.gate_unspecified_queue_state
      : policy.execution_law.named_gate_queue_state;

    if (summary.schema_version !== 'lake-allocator-war-denominator-closure-queue-wave-25@1' || summary.row_type !== 'closure_queue') fail(errors, plan.packet_ref + ': queue summary schema drift');
    if (summary.queue_ref !== 'LAW25-' + execution.source_queue_ref) fail(errors, plan.packet_ref + ': queue reference drift');
    if (summary.queue_sequence !== execution.packet_sequence) fail(errors, plan.packet_ref + ': queue sequence drift');
    for (const key of ['packet_ref', 'source_queue_ref', 'source_task_ref', 'consumer_key', 'queue_class', 'source_route_authority', 'task_authority']) {
      if (summary[key] !== execution[key]) fail(errors, plan.packet_ref + ': queue execution custody drift: ' + key);
    }
    for (const key of ['acquisition_disposition', 'institutional_gate_state', 'bounded_window', 'source_refs', 'coverage_statement', 'unavailable_rows', 'refused_rows', 'negative_search_statement']) {
      const summaryKey = {
        acquisition_disposition: 'source_acquisition_disposition',
        institutional_gate_state: 'source_institutional_gate_state',
        coverage_statement: 'inherited_coverage_statement',
        unavailable_rows: 'inherited_unavailable_rows',
        refused_rows: 'inherited_refused_rows',
        negative_search_statement: 'inherited_negative_search_statement'
      }[key] ?? key;
      if (!same(summary[summaryKey], plan[key])) fail(errors, plan.packet_ref + ': queue source-plan custody drift: ' + key);
    }
    if (summary.queue_state !== expectedQueueState) fail(errors, plan.packet_ref + ': queue state drift');
    if (summary.closure_task_count !== tasks.length) fail(errors, plan.packet_ref + ': queue task count drift');
    if (summary.ready_task_count !== tasks.filter(row => row.execution_state === policy.execution_law.other_task_state).length) fail(errors, plan.packet_ref + ': ready task count drift');
    if (summary.blocked_task_count !== tasks.filter(row => row.execution_state === policy.execution_law.downstream_gate_unspecified_state).length) fail(errors, plan.packet_ref + ': blocked task count drift');
    if (summary.gate_identification_task_count !== tasks.filter(row => row.task_class === 'gate_identification').length) fail(errors, plan.packet_ref + ': gate task count drift');
    if (!same(summary.task_classes, countBy(tasks, 'task_class'))) fail(errors, plan.packet_ref + ': task class summary drift');
    if (!same(summary.priorities, countBy(tasks, 'priority_tier'))) fail(errors, plan.packet_ref + ': priority summary drift');
    if (summary.controls_and_refusals_required !== true || summary.evidence_adjudicated !== false || summary.evidence_rows !== 0 || summary.finding_promoted !== false || summary.graph_effect !== 'none' || summary.publication_status !== 'blocked') fail(errors, plan.packet_ref + ': queue summary authority drift');
    if (!same(summary.blocked_promotions, policy.blocked_promotions)) fail(errors, plan.packet_ref + ': queue blocked-promotion drift');

    for (const [index, task] of tasks.entries()) {
      const target = plan.unavailable_rows[index];
      const expectedClass = classifyTarget(target, policy);
      const gateTask = expectedClass === 'gate_identification';
      const expectedState = gateUnspecified && !gateTask
        ? policy.execution_law.downstream_gate_unspecified_state
        : policy.execution_law.other_task_state;
      const output = policy.output_law[expectedClass];
      if (task.schema_version !== 'lake-allocator-war-denominator-closure-task-wave-25@1' || task.row_type !== 'closure_task') fail(errors, plan.packet_ref + ': closure task schema drift');
      if (task.closure_ref !== 'LAW25-' + execution.source_queue_ref + '/C' + String(index + 1).padStart(2, '0')) fail(errors, plan.packet_ref + ': closure reference drift');
      if (task.closure_sequence !== index + 1) fail(errors, plan.packet_ref + ': closure sequence drift');
      for (const key of ['packet_ref', 'source_queue_ref', 'source_task_ref', 'consumer_key', 'queue_class', 'source_route_authority', 'task_authority']) {
        if (task[key] !== execution[key]) fail(errors, plan.packet_ref + ': task execution custody drift: ' + key);
      }
      if (task.packet_sequence !== execution.packet_sequence) fail(errors, plan.packet_ref + ': task packet sequence drift');
      if (task.source_acquisition_disposition !== plan.acquisition_disposition || task.source_institutional_gate_state !== plan.institutional_gate_state) fail(errors, plan.packet_ref + ': task acquisition custody drift');
      if (!same(task.bounded_window, plan.bounded_window)) fail(errors, plan.packet_ref + ': task bounded-window drift');
      if (task.closure_target !== target) fail(errors, plan.packet_ref + ': closure target drift');
      if (task.task_class !== expectedClass) fail(errors, plan.packet_ref + ': task classification drift');
      if (task.priority_tier !== policy.priority_law[expectedClass]) fail(errors, plan.packet_ref + ': task priority drift');
      if (task.execution_state !== expectedState) fail(errors, plan.packet_ref + ': task execution-state drift');
      const expectedBlocking = expectedState === policy.execution_law.downstream_gate_unspecified_state
        ? 'complete_or_terminal_gate_identification_task_in_same_queue'
        : null;
      if (task.blocking_condition !== expectedBlocking) fail(errors, plan.packet_ref + ': task blocking-condition drift');
      if (task.required_output !== output.required_output + ' Target: ' + target) fail(errors, plan.packet_ref + ': required output drift');
      if (task.closure_test !== output.closure_test) fail(errors, plan.packet_ref + ': closure test drift');
      if (!same(task.allowed_results, policy.execution_law.task_result_states)) fail(errors, plan.packet_ref + ': allowed result drift');
      if (!same(task.source_refs, plan.source_refs)) fail(errors, plan.packet_ref + ': task source-reference drift');
      if (!same(task.inherited_unavailable_rows, plan.unavailable_rows)) fail(errors, plan.packet_ref + ': task unavailable-row custody drift');
      if (!same(task.inherited_refused_rows, plan.refused_rows)) fail(errors, plan.packet_ref + ': task refused-row custody drift');
      if (task.inherited_negative_search_statement !== plan.negative_search_statement) fail(errors, plan.packet_ref + ': task negative-search custody drift');
      if (task.controls_and_refusals_required !== true || task.evidence_adjudicated !== false || task.evidence_rows !== 0 || task.finding_promoted !== false || task.graph_effect !== 'none' || task.publication_status !== 'blocked') fail(errors, plan.packet_ref + ': task authority drift');
      if (!same(task.blocked_promotions, policy.blocked_promotions)) fail(errors, plan.packet_ref + ': task blocked-promotion drift');
    }

    if (gateUnspecified) {
      if (tasks.filter(row => row.task_class === 'gate_identification').length !== 1) fail(errors, plan.packet_ref + ': gate-unspecified queue must contain exactly one gate task');
      if (tasks.some(row => row.task_class !== 'gate_identification' && row.execution_state !== policy.execution_law.downstream_gate_unspecified_state)) fail(errors, plan.packet_ref + ': downstream task bypassed gate identification');
    } else if (tasks.some(row => row.execution_state !== policy.execution_law.other_task_state)) {
      fail(errors, plan.packet_ref + ': named-gate queue contains blocked task');
    }

    if (queue.queue_path !== expectedPath || queue.queue_rows !== rows.length || queue.queue_sha256 !== digestBytes(raw)) fail(errors, plan.packet_ref + ': queue projection ledger drift');
    for (const key of ['queue_ref', 'queue_sequence', 'packet_ref', 'source_queue_ref', 'source_task_ref', 'consumer_key', 'queue_class', 'source_route_authority', 'task_authority', 'source_acquisition_disposition', 'source_institutional_gate_state', 'queue_state', 'closure_task_count', 'ready_task_count', 'blocked_task_count', 'gate_identification_task_count', 'task_classes', 'priorities', 'source_refs']) {
      if (!same(queue[key], summary[key])) fail(errors, plan.packet_ref + ': queue projection summary drift: ' + key);
    }
    if (queue.evidence_adjudicated !== false || queue.evidence_rows !== 0 || queue.finding_promoted !== false || queue.graph_effect !== 'none' || queue.publication_status !== 'blocked') fail(errors, plan.packet_ref + ': queue projection authority drift');
  }

  if (allSummaryRows.length !== expected.queue_summary_rows) fail(errors, 'Wave 25 queue-summary row count drift');
  if (allTaskRows.length !== expected.closure_task_rows) fail(errors, 'Wave 25 closure-task row count drift');
  const actualCounts = {
    source_packets: sourcePlan.packet_plans.length,
    closure_queues: projection.queues.length,
    closure_tasks: allTaskRows.length,
    queue_summary_rows: allSummaryRows.length,
    closure_task_rows: allTaskRows.length,
    closure_rows: allSummaryRows.length + allTaskRows.length,
    named_gate_queues: projection.queues.filter(row => row.queue_state === policy.execution_law.named_gate_queue_state).length,
    gate_unspecified_queues: projection.queues.filter(row => row.queue_state === policy.execution_law.gate_unspecified_queue_state).length,
    ready_tasks: allTaskRows.filter(row => row.execution_state === policy.execution_law.other_task_state).length,
    blocked_tasks: allTaskRows.filter(row => row.execution_state === policy.execution_law.downstream_gate_unspecified_state).length,
    gate_identification_tasks: allTaskRows.filter(row => row.task_class === 'gate_identification').length,
    evidence_rows: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  for (const [key, value] of Object.entries(actualCounts)) {
    if (expected[key] !== value) fail(errors, key + ': Wave 25 policy count drift');
    if (projection.counts[key] !== value) fail(errors, key + ': Wave 25 projection count drift');
  }
  if (!same(projection.counts.task_classes, countBy(allTaskRows, 'task_class'))) fail(errors, 'Wave 25 task-class count projection drift');
  if (!same(projection.counts.priority_tiers, countBy(allTaskRows, 'priority_tier'))) fail(errors, 'Wave 25 priority count projection drift');

  const basinPaths = requiredBasinPaths(policy, sourceProjection);
  for (const [basinId, paths] of Object.entries(basinPaths)) {
    const basin = wave21Policy.basin_contract.find(row => row.basin_id === basinId);
    if (!basin) {
      fail(errors, basinId + ': Wave 21 basin absent');
      continue;
    }
    for (const relative of paths) {
      if (!basin.path_prefixes.includes(relative)) fail(errors, relative + ': Wave 25 path absent from ' + basinId);
      if (!basin.authoritative_entrypoints.includes(relative)) fail(errors, relative + ': Wave 25 authoritative entrypoint absent from ' + basinId);
    }
  }
  for (const relative of [policy.paths.projection, ...expectedQueuePaths(sourceProjection, policy)]) {
    if (!wave21Policy.projection_contract.allowed_generated_paths.includes(relative)) fail(errors, relative + ': Wave 25 generated path absent from Wave 21 projection contract');
  }
  if (wave21Policy.boundaries.wave_25_closure_task_is_evidence_row !== false) fail(errors, 'Wave 25 evidence boundary absent from Wave 21 policy');
  if (wave21Policy.boundaries.wave_25_downstream_task_may_bypass_gate_identification !== false) fail(errors, 'Wave 25 gate-first boundary absent from Wave 21 policy');

  return errors;
}

export function validateRepository(root = defaultRoot) {
  const policyPath = 'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json';
  const policy = readJson(root, policyPath);
  const sourcePlanRaw = fs.readFileSync(full(root, policy.paths.source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(root, policy.paths.source_projection), 'utf8');
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const projection = readJson(root, policy.paths.projection);
  const queueRowsByPath = {};
  const queueRawByPath = {};
  for (const queue of projection.queues ?? []) {
    if (!fs.existsSync(full(root, queue.queue_path))) continue;
    queueRawByPath[queue.queue_path] = fs.readFileSync(full(root, queue.queue_path), 'utf8');
    queueRowsByPath[queue.queue_path] = readJsonl(root, queue.queue_path);
  }
  const wave21Policy = readJson(root, 'data/project/lake-allocator-war-wave-21-policy.json');
  const errors = validateArtifacts({
    policy,
    sourcePlan,
    sourcePlanRaw,
    sourceProjection,
    sourceProjectionRaw,
    projection,
    queueRowsByPath,
    queueRawByPath,
    wave21Policy
  });

  if (process.env.LAW25_SKIP_GIT !== '1') {
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
        quietGit([
          'fetch',
          '--no-tags',
          '--depth=1000000',
          'origin',
          '+refs/heads/' + githubHeadRef + ':' + remoteHeadRef
        ]);
      } catch {
        // Bounded availability and ancestry checks below retain recovery failure.
      }
      if (hasCommit(remoteHeadRef)) ancestryTarget = remoteHeadRef;
      baseAvailable = hasCommit(baseCommit);
      ancestrySatisfied = baseAvailable && isAncestor(baseCommit, ancestryTarget);
    }
    if (!baseAvailable) fail(errors, 'Wave 25 base checkpoint unavailable after targeted deep-history recovery');
    else if (!ancestrySatisfied) fail(errors, 'Wave 25 base checkpoint is not an ancestor');
  }

  for (const relative of [policy.paths.report, policy.paths.method, policy.paths.milestone]) {
    if (!fs.existsSync(full(root, relative))) fail(errors, relative + ': required Wave 25 artifact absent');
  }
  if (fs.existsSync(full(root, policy.paths.report))) {
    const report = fs.readFileSync(full(root, policy.paths.report), 'utf8');
    if (!report.includes('closure queues:             ' + policy.expected_counts.closure_queues)) fail(errors, 'Wave 25 report queue count drift');
    if (!report.includes('closure tasks:              ' + policy.expected_counts.closure_tasks)) fail(errors, 'Wave 25 report task count drift');
    if (!report.includes('blocked tasks:              ' + policy.expected_counts.blocked_tasks)) fail(errors, 'Wave 25 report blocked-task count drift');
    if (!report.includes('evidence rows:              0')) fail(errors, 'Wave 25 report evidence boundary drift');
    if (!report.includes('graph effects:              0')) fail(errors, 'Wave 25 report graph boundary drift');
  }
  if (!same(projection.graph_digests, graphDigests(root))) fail(errors, 'Wave 25 changed participation, active claims, hop edges, or rejected-hop controls');

  const requiredRoots = [
    policyPath,
    policy.paths.projection,
    policy.paths.report,
    policy.paths.method,
    policy.paths.milestone,
    ...expectedQueuePaths(sourceProjection, policy)
  ];
  const lakePolicy = readJson(root, 'data/project/lake-index-policy.json');
  for (const relative of requiredRoots) if (!lakePolicy.authoritative_roots.includes(relative)) fail(errors, relative + ': missing Wave 25 authoritative root');

  const basinRegistry = readJson(root, 'data/project/lake-basin-registry.json');
  const registryByRef = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
  for (const basin of wave21Policy.basin_contract) {
    if (['allocator-war-source', 'allocator-war-lake-actions', 'allocator-war-reports'].includes(basin.basin_id) && !same(registryByRef.get(basin.basin_id), basin)) fail(errors, basin.basin_id + ': installed Wave 25 basin contract drift');
  }

  const pkg = readJson(root, 'package.json');
  if (!pkg.scripts['build:lake-allocator-war-denominator-closure-wave-25']) fail(errors, 'Wave 25 builder script absent');
  if (!pkg.scripts['validate:lake-allocator-war-denominator-closure-wave-25']) fail(errors, 'Wave 25 validator script absent');
  if (!pkg.scripts.check.includes('validate:lake-allocator-war-denominator-closure-wave-25')) fail(errors, 'Wave 25 absent from complete release gate');

  const installerText = fs.readFileSync(full(root, 'tools/install-lake-allocator-war-wave-21.mjs'), 'utf8');
  const wave21ValidatorText = fs.readFileSync(full(root, 'tools/validate-lake-allocator-war-wave-21.mjs'), 'utf8');
  for (const relative of requiredRoots) {
    if (!installerText.includes(relative)) fail(errors, relative + ': Wave 21 installer does not preserve Wave 25 root');
    if (!wave21ValidatorText.includes(relative)) fail(errors, relative + ': Wave 21 validator does not preserve Wave 25 root');
  }

  if (process.env.LAW25_SKIP_SHARDS !== '1') {
    const membershipPath = 'build/lake-index/basin-membership.jsonl';
    const summaryPath = 'build/lake-index/summary.json';
    const gapsPath = 'build/lake-index/gap-summary.json';
    if (fs.existsSync(full(root, membershipPath))) {
      const membership = readJsonl(root, membershipPath);
      const byPath = new Map(membership.map(row => [row.path, row]));
      for (const relative of [policyPath, policy.paths.method, policy.paths.milestone, ...expectedQueuePaths(sourceProjection, policy)]) {
        if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, relative + ': wrong Wave 25 source basin');
      }
      if (byPath.get(policy.paths.projection)?.basin_id !== 'allocator-war-lake-actions') fail(errors, 'Wave 25 projection wrong basin');
      if (byPath.get(policy.paths.report)?.basin_id !== 'allocator-war-reports') fail(errors, 'Wave 25 report wrong basin');
    }
    for (const relative of [summaryPath, gapsPath]) {
      if (!fs.existsSync(full(root, relative))) continue;
      const summary = readJson(root, relative);
      for (const key of ['unindexed_machine_ids_unadjudicated', 'source_ids_without_projection_unadjudicated', 'divergent_identifier_projections_unadjudicated']) {
        if (summary.counts?.[key] !== 0) fail(errors, relative + ': ' + key + ' reopened');
      }
    }
  }

  for (const temporary of [
    '.github/tmp/wave25-denominator-closure-trigger.json',
    '.github/workflows/temporary-wave25-denominator-closure-materializer.yml',
    'tools/run-wave25-denominator-closure-materializer.sh'
  ]) if (fs.existsSync(full(root, temporary))) fail(errors, temporary + ': temporary transport retained');

  if (errors.length) throw new Error('allocator-war denominator closure Wave 25 validation failed:\n- ' + errors.join('\n- '));
  return {
    packets: projection.counts.source_packets,
    queues: projection.counts.closure_queues,
    tasks: projection.counts.closure_tasks,
    rows: projection.counts.closure_rows,
    ready: projection.counts.ready_tasks,
    blocked: projection.counts.blocked_tasks,
    gateTasks: projection.counts.gate_identification_tasks
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = validateRepository(defaultRoot);
  console.log('allocator-war denominator closure Wave 25 validation passed');
  console.log('  packets / queues / tasks / rows: ' + result.packets + ' / ' + result.queues + ' / ' + result.tasks + ' / ' + result.rows);
  console.log('  ready / blocked / gate tasks: ' + result.ready + ' / ' + result.blocked + ' / ' + result.gateTasks);
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
