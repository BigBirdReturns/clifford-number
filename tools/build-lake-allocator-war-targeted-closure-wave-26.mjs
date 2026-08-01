#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), JSON.stringify(value, null, 2) + '\n');
};
const writeJsonl = (relative, rows) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
};
const writeText = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), value);
};
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => digestBytes(JSON.stringify(stable(value)));
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

function graphDigests() {
  const participation = readJsonl('data/ledger/participation.jsonl');
  return {
    participation_sha256: digest(participation),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

export function resultPathFor(sourceQueueRef, policy) {
  return policy.paths.result_root + '/' + sourceQueueRef.toLowerCase() + '.jsonl';
}

function blockedTransition(task, tasks, planByRef, policy) {
  const gate = tasks.find(row => row.task_class === 'gate_identification');
  if (!gate) throw new Error(task.closure_ref + ': blocked task has no gate task in queue');
  const gatePlan = planByRef.get(gate.closure_ref);
  if (!gatePlan) throw new Error(task.closure_ref + ': gate task plan absent');
  if (gatePlan.result_state === 'complete') {
    return {
      execution_state: policy.execution_law.unblocked_next_wave_state,
      transition_reason: gate.closure_ref + ':complete'
    };
  }
  if (gatePlan.result_state === 'no_qualifying_gate') {
    return {
      execution_state: policy.execution_law.blocked_no_gate_state,
      transition_reason: gate.closure_ref + ':no_qualifying_gate'
    };
  }
  return {
    execution_state: policy.execution_law.blocked_source_state,
    transition_reason: gate.closure_ref + ':' + gatePlan.result_state
  };
}

export function buildTargetedExecution(
  policy,
  sourceProjection,
  sourcePlan,
  sourceProjectionRaw,
  sourcePlanRaw,
  queueRowsByPath
) {
  const planByRef = new Map(sourcePlan.task_plans.map(row => [row.closure_ref, row]));
  const sourceByRef = new Map(sourcePlan.source_registry.map(row => [row.source_ref, row]));
  const resultRowsByPath = {};
  const queues = [];

  for (const sourceQueue of sourceProjection.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence)) {
    const sourceRows = queueRowsByPath[sourceQueue.queue_path];
    if (!sourceRows) throw new Error(sourceQueue.queue_ref + ': Wave 25 queue rows absent');
    const sourceSummary = sourceRows.find(row => row.row_type === 'closure_queue');
    const sourceTasks = sourceRows
      .filter(row => row.row_type === 'closure_task')
      .sort((a, b) => a.closure_sequence - b.closure_sequence);
    if (!sourceSummary) throw new Error(sourceQueue.queue_ref + ': Wave 25 queue summary absent');

    const resultRows = sourceTasks.map(task => {
      const ready = task.execution_state === policy.execution_law.ready_source_state;
      if (ready) {
        const plan = planByRef.get(task.closure_ref);
        if (!plan) throw new Error(task.closure_ref + ': ready task plan absent');
        for (const sourceRef of plan.source_refs) {
          if (!sourceByRef.has(sourceRef)) throw new Error(task.closure_ref + ': unknown Wave 26 source ' + sourceRef);
        }
        return {
          schema_version: 'lake-allocator-war-targeted-closure-result-wave-26@1',
          row_type: 'closure_execution_result',
          closure_ref: task.closure_ref,
          closure_sequence: task.closure_sequence,
          queue_ref: sourceSummary.queue_ref,
          queue_sequence: sourceSummary.queue_sequence,
          packet_ref: task.packet_ref,
          source_queue_ref: task.source_queue_ref,
          source_task_ref: task.source_task_ref,
          consumer_key: task.consumer_key,
          queue_class: task.queue_class,
          source_route_authority: task.source_route_authority,
          task_authority: task.task_authority,
          task_class: task.task_class,
          priority_tier: task.priority_tier,
          closure_target: task.closure_target,
          source_execution_state: task.execution_state,
          execution_state: policy.execution_law.executed_state,
          executed_in_wave: true,
          result_state: plan.result_state,
          source_refs: plan.source_refs,
          source_receipt_count: plan.source_refs.length,
          coverage_statement: plan.coverage_statement,
          included_rows: plan.included_rows,
          unavailable_rows: plan.unavailable_rows,
          refused_rows: plan.refused_rows,
          negative_search_statement: plan.negative_search_statement,
          correction_route: plan.correction_route,
          correction_outcome: plan.correction_outcome,
          complete_denominator: false,
          evidence_adjudicated: false,
          evidence_rows: 0,
          blocked_promotions: policy.blocked_promotions,
          finding_promoted: false,
          graph_effect: 'none',
          publication_status: 'blocked'
        };
      }

      const transition = blockedTransition(task, sourceTasks, planByRef, policy);
      return {
        schema_version: 'lake-allocator-war-targeted-closure-result-wave-26@1',
        row_type: 'closure_execution_result',
        closure_ref: task.closure_ref,
        closure_sequence: task.closure_sequence,
        queue_ref: sourceSummary.queue_ref,
        queue_sequence: sourceSummary.queue_sequence,
        packet_ref: task.packet_ref,
        source_queue_ref: task.source_queue_ref,
        source_task_ref: task.source_task_ref,
        consumer_key: task.consumer_key,
        queue_class: task.queue_class,
        source_route_authority: task.source_route_authority,
        task_authority: task.task_authority,
        task_class: task.task_class,
        priority_tier: task.priority_tier,
        closure_target: task.closure_target,
        source_execution_state: task.execution_state,
        execution_state: transition.execution_state,
        transition_reason: transition.transition_reason,
        executed_in_wave: false,
        result_state: null,
        source_refs: [],
        source_receipt_count: 0,
        coverage_statement: 'Wave 25 blocked task preserved; no same-wave acquisition executed.',
        included_rows: [],
        unavailable_rows: task.inherited_unavailable_rows,
        refused_rows: [
          ...task.inherited_refused_rows,
          'newly unblocked downstream work is not executed in Wave 26',
          'blocked work receives no synthetic source result'
        ],
        negative_search_statement: task.inherited_negative_search_statement,
        correction_route: [],
        correction_outcome: transition.execution_state,
        complete_denominator: false,
        evidence_adjudicated: false,
        evidence_rows: 0,
        blocked_promotions: policy.blocked_promotions,
        finding_promoted: false,
        graph_effect: 'none',
        publication_status: 'blocked'
      };
    });

    const resultPath = resultPathFor(sourceQueue.source_queue_ref, policy);
    const summary = {
      schema_version: 'lake-allocator-war-targeted-closure-queue-wave-26@1',
      row_type: 'closure_execution_queue',
      queue_ref: 'LAW26-' + sourceQueue.source_queue_ref,
      queue_sequence: sourceQueue.queue_sequence,
      source_queue_ref: sourceQueue.source_queue_ref,
      source_wave_25_queue_ref: sourceQueue.queue_ref,
      packet_ref: sourceQueue.packet_ref,
      consumer_key: sourceQueue.consumer_key,
      queue_class: sourceQueue.queue_class,
      source_route_authority: sourceQueue.source_route_authority,
      task_authority: sourceQueue.task_authority,
      source_task_count: sourceTasks.length,
      executed_task_count: resultRows.filter(row => row.executed_in_wave).length,
      preserved_blocked_task_count: resultRows.filter(row => !row.executed_in_wave).length,
      result_states: countBy(resultRows.filter(row => row.executed_in_wave), 'result_state'),
      downstream_states: countBy(resultRows.filter(row => !row.executed_in_wave), 'execution_state'),
      source_receipt_uses: resultRows.reduce((sum, row) => sum + row.source_receipt_count, 0),
      complete_denominators: 0,
      evidence_adjudicated: false,
      evidence_rows: 0,
      blocked_promotions: policy.blocked_promotions,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
    const rows = [summary, ...resultRows];
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[resultPath] = rows;
    queues.push({
      queue_ref: summary.queue_ref,
      queue_sequence: summary.queue_sequence,
      source_queue_ref: summary.source_queue_ref,
      source_wave_25_queue_ref: summary.source_wave_25_queue_ref,
      packet_ref: summary.packet_ref,
      consumer_key: summary.consumer_key,
      queue_class: summary.queue_class,
      executed_task_count: summary.executed_task_count,
      preserved_blocked_task_count: summary.preserved_blocked_task_count,
      result_states: summary.result_states,
      downstream_states: summary.downstream_states,
      source_receipt_uses: summary.source_receipt_uses,
      result_path: resultPath,
      result_rows: rows.length,
      result_sha256: digestBytes(raw),
      evidence_adjudicated: false,
      evidence_rows: 0,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    });
  }

  const allRows = Object.values(resultRowsByPath).flat();
  const results = allRows.filter(row => row.row_type === 'closure_execution_result');
  const executed = results.filter(row => row.executed_in_wave);
  const blocked = results.filter(row => !row.executed_in_wave);
  const projection = {
    schema_version: 'lake-allocator-war-targeted-closure-wave-26@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json',
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw)
    },
    counts: {
      source_queues: sourceProjection.queues.length,
      source_closure_tasks: results.length,
      source_ready_tasks: executed.length,
      source_blocked_tasks: blocked.length,
      execution_ledgers: queues.length,
      queue_summary_rows: allRows.filter(row => row.row_type === 'closure_execution_queue').length,
      execution_result_rows: results.length,
      execution_rows: allRows.length,
      executed_tasks: executed.length,
      preserved_blocked_tasks: blocked.length,
      result_states: countBy(executed, 'result_state'),
      downstream_states: countBy(blocked, 'execution_state'),
      source_receipts: sourcePlan.source_registry.length,
      source_receipt_uses: executed.reduce((sum, row) => sum + row.source_receipt_count, 0),
      complete_denominators: 0,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigests(),
    queues,
    boundaries: policy.boundaries
  };
  return { projection, resultRowsByPath };
}

export function renderReport(projection) {
  const states = projection.counts.result_states;
  const downstream = projection.counts.downstream_states;
  const lines = [
    '# Allocator-war targeted closure execution Wave 26',
    '',
    '```text',
    'source queues:                       ' + projection.counts.source_queues,
    'source closure tasks:                ' + projection.counts.source_closure_tasks,
    'executed ready tasks:                ' + projection.counts.executed_tasks,
    'preserved blocked tasks:             ' + projection.counts.preserved_blocked_tasks,
    'execution ledgers:                   ' + projection.counts.execution_ledgers,
    'execution rows:                      ' + projection.counts.execution_rows,
    'result complete / partial:           ' + (states.complete ?? 0) + ' / ' + (states.partial ?? 0),
    'unavailable / no qualifying gate:    ' + (states.unavailable_after_search ?? 0) + ' / ' + (states.no_qualifying_gate ?? 0),
    'unblocked next wave / blocked no gate:' + ' ' + (downstream.unblocked_for_next_wave ?? 0) + ' / ' + (downstream.blocked_no_qualifying_gate ?? 0),
    'source receipts / uses:              ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses,
    'complete denominators:               0',
    'evidence rows:                       0',
    'finding promotions:                  0',
    'graph effects:                       0',
    'publication clearances:              0',
    '```',
    '',
    '| Estate consumer | Queue | Executed | Preserved blocked | Result states | Downstream states |',
    '|---|---|---:|---:|---|---|'
  ];
  for (const queue of projection.queues) {
    lines.push(
      '| ' + queue.consumer_key + ' | ' + queue.queue_ref + ' | ' +
      queue.executed_task_count + ' | ' + queue.preserved_blocked_task_count + ' | ' +
      JSON.stringify(queue.result_states) + ' | ' + JSON.stringify(queue.downstream_states) + ' |'
    );
  }
  lines.push(
    '',
    'Wave 26 executes only the thirty-six tasks already ready in Wave 25. It records one complete gate identification, one bounded no-qualifying-gate result, twenty-six partial recoveries, and eight unavailable-after-search results.',
    '',
    'The public-interest downstream tasks are unblocked for the next wave but are not executed here. The legislative and political-finance downstream tasks remain blocked because the bounded G0 search identified no qualifying gate. Every result remains acquisition-only; complete denominators, evidence findings, graph effects, and publication authority remain zero.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-targeted-closure-wave-26-policy.json');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourcePlanRaw = fs.readFileSync(full(policy.paths.source_plan), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const queueRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => [queue.queue_path, readJsonl(queue.queue_path)])
  );
  const { projection, resultRowsByPath } = buildTargetedExecution(
    policy,
    sourceProjection,
    sourcePlan,
    sourceProjectionRaw,
    sourcePlanRaw,
    queueRowsByPath
  );
  fs.rmSync(full(policy.paths.result_root), { recursive: true, force: true });
  for (const [resultPath, rows] of Object.entries(resultRowsByPath)) writeJsonl(resultPath, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war targeted closure Wave 26 built');
  console.log(
    '  queues / tasks / executed / blocked: ' +
    projection.counts.source_queues + ' / ' + projection.counts.source_closure_tasks + ' / ' +
    projection.counts.executed_tasks + ' / ' + projection.counts.preserved_blocked_tasks
  );
  console.log('  result states: ' + JSON.stringify(projection.counts.result_states));
  console.log('  downstream states: ' + JSON.stringify(projection.counts.downstream_states));
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
