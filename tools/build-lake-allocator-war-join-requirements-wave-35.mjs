#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
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
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

export function resultPathFor(routeClass, policy) {
  return `${policy.paths.result_root}/${routeClass}.jsonl`;
}

function boundary(policy) {
  return {
    same_wave_acquisition_result: false,
    requirement_satisfied: false,
    task_admission_authorizes_join: false,
    join_authorized: false,
    joined_rows: 0,
    complete_denominator: false,
    evidence_adjudicated: false,
    evidence_rows: 0,
    estate_adopted: false,
    finding_promoted: false,
    blocked_promotions: policy.blocked_promotions,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function buildRequirementFanout(inputs) {
  const {
    policy,
    sourcePolicy,
    sourceProjection,
    sourceJoinRows,
    sourceJoinRaw,
    implementationFingerprint
  } = inputs;

  const lanes = new Map(policy.access_lanes.map(row => [row.access_class, row]));
  if (lanes.size !== policy.access_lanes.length) throw new Error('Wave 35 access lane classes must be unique');
  const sourceProjectionByJoin = new Map(sourceProjection.lawful_join_contracts.map(row => [row.join_ref, row]));
  const sourceRows = sourceJoinRows.slice().sort((a, b) => a.join_sequence - b.join_sequence);
  const tasks = [];
  const queues = [];
  const resultRowsByPath = {};
  let taskSequence = 0;

  for (const join of sourceRows) {
    if (join.schema_version !== policy.source_contract.required_join_row_schema || join.row_type !== 'lawful_join_contract') {
      throw new Error(`${join.join_ref ?? 'unknown join'}: Wave 34 join-row schema drift`);
    }
    if (join.join_authorized !== false || join.joined_rows !== 0 || join.complete_denominator !== false) {
      throw new Error(`${join.join_ref}: source join authority inflation`);
    }
    if (!Array.isArray(join.missing_requirements) || join.missing_requirements.length === 0) {
      throw new Error(`${join.join_ref}: source requirements absent`);
    }
    if (join.missing_requirements.some(row => row.satisfied !== false)) {
      throw new Error(`${join.join_ref}: source requirement already satisfied`);
    }

    const projected = sourceProjectionByJoin.get(join.join_ref);
    if (!projected) throw new Error(`${join.join_ref}: source projection join absent`);
    for (const key of ['join_sequence', 'route_ref', 'route_class', 'route_owner', 'join_state']) {
      if (projected[key] !== join[key]) throw new Error(`${join.join_ref}: source projection ${key} drift`);
    }
    for (const key of ['source_refs', 'adapter_refs', 'candidate_key_classes', 'missing_requirements']) {
      if (!same(projected[key], join[key])) throw new Error(`${join.join_ref}: source projection ${key} drift`);
    }

    const queueRef = `LAW35-Q${String(join.join_sequence).padStart(3, '0')}`;
    const joinSha = sha256(canonicalJson(join));
    const queueTasks = join.missing_requirements.map((requirement, index) => {
      const lane = lanes.get(requirement.access_class);
      if (!lane) throw new Error(`${requirement.requirement_ref}: Wave 35 access lane absent`);
      taskSequence += 1;
      const task = {
        schema_version: 'lake-allocator-war-join-requirement-task-wave-35@1',
        row_type: 'lawful_join_requirement_acquisition_task',
        program_ref: policy.program_ref,
        wave_ref: policy.wave_ref,
        task_ref: `LAW35-T${String(taskSequence).padStart(3, '0')}`,
        task_sequence: taskSequence,
        queue_ref: queueRef,
        queue_sequence: join.join_sequence,
        source_join_ref: join.join_ref,
        source_join_sequence: join.join_sequence,
        source_route_ref: join.route_ref,
        source_route_class: join.route_class,
        source_route_owner: join.route_owner,
        source_join_state: join.join_state,
        source_requirement_ref: requirement.requirement_ref,
        requirement_sequence: index + 1,
        access_class: requirement.access_class,
        execution_lane_ref: lane.lane_ref,
        execution_lane_sequence: lane.lane_sequence,
        execution_state: lane.execution_state,
        execution_ready: lane.execution_ready,
        access_bounded: lane.access_bounded,
        protected_lawful_access_only: lane.protected_lawful_access_only,
        target_row: requirement.target_row,
        completion_test: requirement.completion_test,
        refused_substitution: requirement.refused_substitution,
        source_refs: join.source_refs,
        adapter_refs: join.adapter_refs,
        candidate_key_classes: join.candidate_key_classes,
        source_receipt_use_count: join.source_refs.length,
        schema_adapter_use_count: join.adapter_refs.length,
        candidate_key_class_use_count: join.candidate_key_classes.length,
        source_join_row_sha256: joinSha,
        source_requirement_sha256: sha256(canonicalJson(requirement)),
        task_state: lane.access_bounded ? 'open_access_bounded_requirement' : 'open_execution_ready_requirement',
        ...boundary(policy)
      };
      tasks.push(task);
      return task;
    });

    const relative = resultPathFor(join.route_class, policy);
    const queue = {
      schema_version: 'lake-allocator-war-join-requirement-queue-wave-35@1',
      row_type: 'lawful_join_requirement_queue',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      queue_ref: queueRef,
      queue_sequence: join.join_sequence,
      source_join_ref: join.join_ref,
      source_join_sequence: join.join_sequence,
      source_route_ref: join.route_ref,
      source_route_class: join.route_class,
      source_route_owner: join.route_owner,
      source_join_state: join.join_state,
      source_join_row_sha256: joinSha,
      source_refs: join.source_refs,
      adapter_refs: join.adapter_refs,
      candidate_key_classes: join.candidate_key_classes,
      requirement_refs: queueTasks.map(row => row.source_requirement_ref),
      task_count: queueTasks.length,
      requirement_access_classes: countBy(queueTasks, 'access_class'),
      execution_ready_tasks: queueTasks.filter(row => row.execution_ready).length,
      access_bounded_tasks: queueTasks.filter(row => row.access_bounded).length,
      source_receipt_uses: queueTasks.reduce((sum, row) => sum + row.source_receipt_use_count, 0),
      schema_adapter_uses: queueTasks.reduce((sum, row) => sum + row.schema_adapter_use_count, 0),
      candidate_key_class_uses: queueTasks.reduce((sum, row) => sum + row.candidate_key_class_use_count, 0),
      result_path: relative,
      queue_state: 'open_requirement_acquisition_queue',
      ...boundary(policy)
    };
    const rows = [queue, ...queueTasks];
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[relative] = rows;
    queues.push({
      queue_ref: queue.queue_ref,
      queue_sequence: queue.queue_sequence,
      source_join_ref: queue.source_join_ref,
      source_route_ref: queue.source_route_ref,
      route_class: queue.source_route_class,
      route_owner: queue.source_route_owner,
      task_count: queue.task_count,
      requirement_access_classes: queue.requirement_access_classes,
      execution_ready_tasks: queue.execution_ready_tasks,
      access_bounded_tasks: queue.access_bounded_tasks,
      source_receipt_uses: queue.source_receipt_uses,
      schema_adapter_uses: queue.schema_adapter_uses,
      candidate_key_class_uses: queue.candidate_key_class_uses,
      result_path: relative,
      result_rows: rows.length,
      result_sha256: sha256(raw),
      same_wave_acquisition_results: 0,
      requirements_satisfied: 0,
      authorized_joins: 0,
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    });
  }

  const sourceRequirementCount = sourceRows.reduce((sum, row) => sum + row.missing_requirements.length, 0);
  const projection = {
    schema_version: 'lake-allocator-war-join-requirements-wave-35@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
      policy_sha256: sha256(JSON.stringify(policy, null, 2) + '\n'),
      source_policy_path: policy.paths.source_policy,
      source_policy_sha256: sha256(JSON.stringify(sourcePolicy, null, 2) + '\n'),
      source_projection_path: policy.paths.source_projection,
      source_projection_sha256: sha256(JSON.stringify(sourceProjection, null, 2) + '\n'),
      source_join_ledger_path: policy.paths.source_join_ledger,
      source_join_ledger_bytes: Buffer.byteLength(sourceJoinRaw),
      source_join_ledger_sha256: sha256(sourceJoinRaw),
      builder_implementation_path: implementationFingerprint.path,
      builder_implementation_sha256: implementationFingerprint.sha256
    },
    counts: {
      source_join_contracts: sourceRows.length,
      source_requirements: sourceRequirementCount,
      join_queues: queues.length,
      acquisition_tasks: tasks.length,
      access_classes: countBy(tasks, 'access_class'),
      execution_ready_tasks: tasks.filter(row => row.execution_ready).length,
      access_bounded_tasks: tasks.filter(row => row.access_bounded).length,
      source_receipt_uses: tasks.reduce((sum, row) => sum + row.source_receipt_use_count, 0),
      schema_adapter_uses: tasks.reduce((sum, row) => sum + row.schema_adapter_use_count, 0),
      candidate_key_class_uses: tasks.reduce((sum, row) => sum + row.candidate_key_class_use_count, 0),
      same_wave_acquisition_results: 0,
      requirements_satisfied: 0,
      authorized_joins: 0,
      joined_rows: 0,
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: sourceProjection.graph_digests,
    access_lanes: policy.access_lanes,
    queues,
    tasks: tasks.map(row => ({
      task_ref: row.task_ref,
      task_sequence: row.task_sequence,
      queue_ref: row.queue_ref,
      source_join_ref: row.source_join_ref,
      source_requirement_ref: row.source_requirement_ref,
      route_class: row.source_route_class,
      route_owner: row.source_route_owner,
      access_class: row.access_class,
      execution_lane_ref: row.execution_lane_ref,
      execution_state: row.execution_state,
      execution_ready: row.execution_ready,
      access_bounded: row.access_bounded,
      protected_lawful_access_only: row.protected_lawful_access_only,
      target_row: row.target_row,
      source_refs: row.source_refs,
      adapter_refs: row.adapter_refs,
      candidate_key_classes: row.candidate_key_classes,
      source_join_row_sha256: row.source_join_row_sha256,
      source_requirement_sha256: row.source_requirement_sha256,
      task_state: row.task_state,
      same_wave_acquisition_result: false,
      requirement_satisfied: false,
      join_authorized: false,
      complete_denominator: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    })),
    amortization_contract: {
      one_build_emits_every_requirement: true,
      one_queue_per_source_join: true,
      one_task_per_unsatisfied_requirement: true,
      manual_per_task_dispatch_required: false,
      source_change_replays_only_affected_queue: true,
      same_wave_acquisition_results: 0
    },
    execution_contract: {
      network_requests_performed: 0,
      source_join_rows_reused: true,
      source_join_order_preserved: true,
      source_requirement_order_preserved: true,
      source_and_adapter_sets_inherited: true,
      candidate_key_classes_inherited: true,
      public_and_protected_lanes_separated: true,
      protected_tasks_publicly_executable: false,
      task_admission_executes_acquisition: false,
      task_admission_authorizes_join: false,
      authorized_join_created: false
    },
    boundaries: policy.boundaries
  };

  return { projection, resultRowsByPath, queues, tasks };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war lawful join requirement fan-out Wave 35',
    '',
    '```text',
    `source join contracts / requirements: ${projection.counts.source_join_contracts} / ${projection.counts.source_requirements}`,
    `join queues / acquisition tasks:      ${projection.counts.join_queues} / ${projection.counts.acquisition_tasks}`,
    `requirement access classes:           ${JSON.stringify(projection.counts.access_classes)}`,
    `execution-ready / access-bounded:     ${projection.counts.execution_ready_tasks} / ${projection.counts.access_bounded_tasks}`,
    `source receipt / adapter uses:        ${projection.counts.source_receipt_uses} / ${projection.counts.schema_adapter_uses}`,
    `candidate-key-class uses:             ${projection.counts.candidate_key_class_uses}`,
    'same-wave acquisition results:        0',
    'requirements satisfied:               0',
    'authorized joins / joined rows:       0 / 0',
    'complete denominators:                0',
    'evidence rows:                        0',
    'estate adoptions:                     0',
    'finding promotions:                   0',
    'graph effects:                        0',
    'publication clearances:               0',
    '```',
    '',
    '| Queue | Join | Route class | Owner | Tasks | Access classes | Ready | Bounded | Receipt uses |',
    '|---|---|---|---|---:|---|---:|---:|---:|'
  ];
  for (const row of projection.queues) {
    lines.push(`| ${row.queue_ref} | ${row.source_join_ref} | ${row.route_class} | ${row.route_owner} | ${row.task_count} | ${JSON.stringify(row.requirement_access_classes)} | ${row.execution_ready_tasks} | ${row.access_bounded_tasks} | ${row.source_receipt_uses} |`);
  }
  lines.push(
    '',
    'Wave 35 emits one queue per permanent Wave 34 join contract and one task per unsatisfied institutional requirement. Twenty-eight tasks enter public, separately authorized, or lawful-case acquisition lanes. Three protected-personnel tasks remain bounded to authorized lawful access.',
    '',
    'A task identifies the required record, completion test, and refused substitution. Task admission does not execute acquisition, satisfy a requirement, authorize a join, complete a denominator, adjudicate evidence, promote a finding, alter the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function loadInputs() {
  const policyPath = 'data/project/lake-allocator-war-join-requirements-wave-35-policy.json';
  const policy = readJson(policyPath);
  const sourcePolicy = readJson(policy.paths.source_policy);
  const sourceProjection = readJson(policy.paths.source_projection);
  const sourceJoinRaw = fs.readFileSync(full(policy.paths.source_join_ledger), 'utf8');
  const sourceJoinRows = readJsonl(policy.paths.source_join_ledger);
  const implementationPath = 'tools/build-lake-allocator-war-join-requirements-wave-35.mjs';
  const implementationFingerprint = {
    path: implementationPath,
    sha256: sha256(fs.readFileSync(full(implementationPath)))
  };
  return { policy, sourcePolicy, sourceProjection, sourceJoinRows, sourceJoinRaw, implementationFingerprint };
}

export function runBuild() {
  const inputs = loadInputs();
  const { projection, resultRowsByPath } = buildRequirementFanout(inputs);
  fs.rmSync(full(inputs.policy.paths.result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(inputs.policy.paths.projection, projection);
  writeText(inputs.policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war lawful join requirement fan-out Wave 35 built');
  console.log(`  source joins / requirements: ${projection.counts.source_join_contracts} / ${projection.counts.source_requirements}`);
  console.log(`  queues / tasks / ready / bounded: ${projection.counts.join_queues} / ${projection.counts.acquisition_tasks} / ${projection.counts.execution_ready_tasks} / ${projection.counts.access_bounded_tasks}`);
  console.log(`  receipt / adapter / key uses: ${projection.counts.source_receipt_uses} / ${projection.counts.schema_adapter_uses} / ${projection.counts.candidate_key_class_uses}`);
  console.log('  acquisition results / joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0 / 0');
}
