#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
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
  const participation = fs.readFileSync(full('data/ledger/participation.jsonl'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
  return {
    participation_sha256: digest(participation),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

const includesAny = (value, keywords) => keywords.some(keyword => value.includes(keyword.toLowerCase()));

export function classifyTarget(target, policy) {
  const normalized = String(target).toLowerCase();
  const law = policy.classification_law;
  if (includesAny(normalized, law.gate_identification_keywords)) return 'gate_identification';
  if (includesAny(normalized, law.denominator_keywords)) return 'denominator_closure';
  if (includesAny(normalized, law.instrument_keywords)) return 'instrument_rights_recovery';
  if (includesAny(normalized, law.entity_keywords)) return 'entity_resolution';
  return 'outcome_correction_recovery';
}

export function queuePathFor(sourceQueueRef, policy) {
  return policy.paths.queue_root + '/' + sourceQueueRef.toLowerCase() + '.jsonl';
}

export function buildClosureQueues(policy, sourcePlan, sourceProjection, sourcePlanRaw, sourceProjectionRaw) {
  const executionByPacket = new Map(sourceProjection.executions.map(row => [row.packet_ref, row]));
  const packetPlans = sourcePlan.packet_plans.slice().sort((a, b) => {
    const left = executionByPacket.get(a.packet_ref)?.packet_sequence ?? Number.MAX_SAFE_INTEGER;
    const right = executionByPacket.get(b.packet_ref)?.packet_sequence ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.packet_ref.localeCompare(b.packet_ref);
  });
  const queueRowsByPath = {};
  const queues = [];

  for (const plan of packetPlans) {
    const execution = executionByPacket.get(plan.packet_ref);
    if (!execution) throw new Error(plan.packet_ref + ': Wave 24 execution absent');
    const gateUnspecified = plan.acquisition_disposition === 'bounded_public_record_recovered_gate_unspecified';
    const tasks = plan.unavailable_rows.map((target, index) => {
      const taskClass = classifyTarget(target, policy);
      const gateTask = taskClass === 'gate_identification';
      const executionState = gateUnspecified && !gateTask
        ? policy.execution_law.downstream_gate_unspecified_state
        : policy.execution_law.other_task_state;
      const output = policy.output_law[taskClass];
      return {
        schema_version: 'lake-allocator-war-denominator-closure-task-wave-25@1',
        row_type: 'closure_task',
        closure_ref: 'LAW25-' + execution.source_queue_ref + '/C' + String(index + 1).padStart(2, '0'),
        closure_sequence: index + 1,
        packet_ref: plan.packet_ref,
        packet_sequence: execution.packet_sequence,
        source_queue_ref: execution.source_queue_ref,
        source_task_ref: execution.source_task_ref,
        consumer_key: execution.consumer_key,
        queue_class: execution.queue_class,
        source_route_authority: execution.source_route_authority,
        task_authority: execution.task_authority,
        source_acquisition_disposition: plan.acquisition_disposition,
        source_institutional_gate_state: plan.institutional_gate_state,
        bounded_window: plan.bounded_window,
        closure_target: target,
        task_class: taskClass,
        priority_tier: policy.priority_law[taskClass],
        execution_state: executionState,
        blocking_condition: executionState === policy.execution_law.downstream_gate_unspecified_state
          ? 'complete_or_terminal_gate_identification_task_in_same_queue'
          : null,
        required_output: output.required_output + ' Target: ' + target,
        closure_test: output.closure_test,
        allowed_results: policy.execution_law.task_result_states,
        source_refs: plan.source_refs,
        inherited_unavailable_rows: plan.unavailable_rows,
        inherited_refused_rows: plan.refused_rows,
        inherited_negative_search_statement: plan.negative_search_statement,
        controls_and_refusals_required: true,
        evidence_adjudicated: false,
        evidence_rows: 0,
        blocked_promotions: policy.blocked_promotions,
        finding_promoted: false,
        graph_effect: 'none',
        publication_status: 'blocked'
      };
    });
    const queueState = gateUnspecified
      ? policy.execution_law.gate_unspecified_queue_state
      : policy.execution_law.named_gate_queue_state;
    const queuePath = queuePathFor(execution.source_queue_ref, policy);
    const summary = {
      schema_version: 'lake-allocator-war-denominator-closure-queue-wave-25@1',
      row_type: 'closure_queue',
      queue_ref: 'LAW25-' + execution.source_queue_ref,
      queue_sequence: execution.packet_sequence,
      packet_ref: plan.packet_ref,
      source_queue_ref: execution.source_queue_ref,
      source_task_ref: execution.source_task_ref,
      consumer_key: execution.consumer_key,
      queue_class: execution.queue_class,
      source_route_authority: execution.source_route_authority,
      task_authority: execution.task_authority,
      source_acquisition_disposition: plan.acquisition_disposition,
      source_institutional_gate_state: plan.institutional_gate_state,
      bounded_window: plan.bounded_window,
      queue_state: queueState,
      closure_task_count: tasks.length,
      ready_task_count: tasks.filter(row => row.execution_state === policy.execution_law.other_task_state).length,
      blocked_task_count: tasks.filter(row => row.execution_state === policy.execution_law.downstream_gate_unspecified_state).length,
      gate_identification_task_count: tasks.filter(row => row.task_class === 'gate_identification').length,
      task_classes: countBy(tasks, 'task_class'),
      priorities: countBy(tasks, 'priority_tier'),
      source_refs: plan.source_refs,
      inherited_coverage_statement: plan.coverage_statement,
      inherited_unavailable_rows: plan.unavailable_rows,
      inherited_refused_rows: plan.refused_rows,
      inherited_negative_search_statement: plan.negative_search_statement,
      controls_and_refusals_required: true,
      evidence_adjudicated: false,
      evidence_rows: 0,
      blocked_promotions: policy.blocked_promotions,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
    const rows = [summary, ...tasks];
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    queueRowsByPath[queuePath] = rows;
    queues.push({
      queue_ref: summary.queue_ref,
      queue_sequence: summary.queue_sequence,
      packet_ref: summary.packet_ref,
      source_queue_ref: summary.source_queue_ref,
      source_task_ref: summary.source_task_ref,
      consumer_key: summary.consumer_key,
      queue_class: summary.queue_class,
      source_route_authority: summary.source_route_authority,
      task_authority: summary.task_authority,
      source_acquisition_disposition: summary.source_acquisition_disposition,
      source_institutional_gate_state: summary.source_institutional_gate_state,
      queue_state: summary.queue_state,
      closure_task_count: summary.closure_task_count,
      ready_task_count: summary.ready_task_count,
      blocked_task_count: summary.blocked_task_count,
      gate_identification_task_count: summary.gate_identification_task_count,
      task_classes: summary.task_classes,
      priorities: summary.priorities,
      source_refs: summary.source_refs,
      queue_path: queuePath,
      queue_rows: rows.length,
      queue_sha256: digestBytes(raw),
      evidence_adjudicated: false,
      evidence_rows: 0,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    });
  }

  const tasks = Object.values(queueRowsByPath).flat().filter(row => row.row_type === 'closure_task');
  const summaries = Object.values(queueRowsByPath).flat().filter(row => row.row_type === 'closure_queue');
  const projection = {
    schema_version: 'lake-allocator-war-denominator-closure-wave-25@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json',
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw),
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw)
    },
    counts: {
      source_packets: packetPlans.length,
      closure_queues: queues.length,
      closure_tasks: tasks.length,
      queue_summary_rows: summaries.length,
      closure_task_rows: tasks.length,
      closure_rows: summaries.length + tasks.length,
      named_gate_queues: queues.filter(row => row.queue_state === policy.execution_law.named_gate_queue_state).length,
      gate_unspecified_queues: queues.filter(row => row.queue_state === policy.execution_law.gate_unspecified_queue_state).length,
      ready_tasks: tasks.filter(row => row.execution_state === policy.execution_law.other_task_state).length,
      blocked_tasks: tasks.filter(row => row.execution_state === policy.execution_law.downstream_gate_unspecified_state).length,
      gate_identification_tasks: tasks.filter(row => row.task_class === 'gate_identification').length,
      task_classes: countBy(tasks, 'task_class'),
      priority_tiers: countBy(tasks, 'priority_tier'),
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigests(),
    queues,
    boundaries: policy.boundaries
  };
  return { projection, queueRowsByPath };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war denominator closure fan-out Wave 25',
    '',
    '```text',
    'source packets:             ' + projection.counts.source_packets,
    'closure queues:             ' + projection.counts.closure_queues,
    'closure tasks:              ' + projection.counts.closure_tasks,
    'closure rows:               ' + projection.counts.closure_rows,
    'named-gate queues:          ' + projection.counts.named_gate_queues,
    'gate-unspecified queues:    ' + projection.counts.gate_unspecified_queues,
    'ready tasks:                ' + projection.counts.ready_tasks,
    'blocked tasks:              ' + projection.counts.blocked_tasks,
    'gate-identification tasks:  ' + projection.counts.gate_identification_tasks,
    'evidence rows:              0',
    'finding promotions:         0',
    'graph effects:              0',
    'publication clearances:     0',
    '```',
    '',
    '| Estate consumer | Queue | State | Tasks | Ready | Blocked | Gate tasks |',
    '|---|---|---|---:|---:|---:|---:|'
  ];
  for (const queue of projection.queues) {
    lines.push(
      '| ' + queue.consumer_key + ' | ' + queue.queue_ref + ' | ' + queue.queue_state + ' | ' +
      queue.closure_task_count + ' | ' + queue.ready_task_count + ' | ' +
      queue.blocked_task_count + ' | ' + queue.gate_identification_task_count + ' |'
    );
  }
  lines.push(
    '',
    'Wave 25 converts every explicit Wave 24 unavailable obligation into an estate-owned closure task. Priority orders acquisition work and is not a truth, merit, guilt, or importance score.',
    '',
    'The two gate-unspecified packets must complete or terminally fail their gate-identification task before downstream denominator or consequence work may proceed. No queue or task is evidence; graph effect is none and publication remains blocked.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-denominator-closure-wave-25-policy.json');
  const sourcePlanRaw = fs.readFileSync(full(policy.paths.source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const { projection, queueRowsByPath } = buildClosureQueues(
    policy,
    sourcePlan,
    sourceProjection,
    sourcePlanRaw,
    sourceProjectionRaw
  );
  fs.rmSync(full(policy.paths.queue_root), { recursive: true, force: true });
  for (const [queuePath, rows] of Object.entries(queueRowsByPath)) writeJsonl(queuePath, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war denominator closure Wave 25 built');
  console.log(
    '  packets / queues / tasks / rows: ' +
    projection.counts.source_packets + ' / ' + projection.counts.closure_queues + ' / ' +
    projection.counts.closure_tasks + ' / ' + projection.counts.closure_rows
  );
  console.log(
    '  named / gate-unspecified queues: ' +
    projection.counts.named_gate_queues + ' / ' + projection.counts.gate_unspecified_queues
  );
  console.log(
    '  ready / blocked / gate tasks: ' +
    projection.counts.ready_tasks + ' / ' + projection.counts.blocked_tasks + ' / ' +
    projection.counts.gate_identification_tasks
  );
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
