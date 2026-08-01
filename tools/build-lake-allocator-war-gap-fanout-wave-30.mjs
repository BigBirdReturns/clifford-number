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

export function resultPathFor(routeClass, policy) {
  return policy.paths.result_root + '/' + routeClass + '.jsonl';
}

export function collectSourceResults(sourceProjection, sourceRowsByPath) {
  const results = [];
  for (const queue of sourceProjection.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence)) {
    const rows = sourceRowsByPath[queue.result_path];
    if (!rows) throw new Error(queue.queue_ref + ': Wave 29 source ledger absent');
    results.push(...rows
      .filter(row => row.row_type === 'implementation_execution_result')
      .sort((a, b) => a.task_sequence - b.task_sequence));
  }
  return results;
}

export function buildFanout(policy, sourceProjection, sourceProjectionRaw, sourceRowsByPath, sourceRawByPath) {
  const routeByClass = new Map(policy.route_classes.map(row => [row.route_class, row]));
  const assignments = new Map();
  for (const assignment of policy.assignments) {
    const key = assignment.source_task_ref + '#' + assignment.unavailable_row_index;
    if (assignments.has(key)) throw new Error(key + ': duplicate Wave 30 assignment');
    if (!routeByClass.has(assignment.route_class)) throw new Error(key + ': unknown Wave 30 route class');
    assignments.set(key, assignment.route_class);
  }

  const sourceResults = collectSourceResults(sourceProjection, sourceRowsByPath);
  const taskByRef = new Map(sourceResults.map(row => [row.source_task_ref, row]));
  const obligations = [];
  let globalSequence = 0;

  for (const result of sourceResults) {
    if (!Array.isArray(result.unavailable_rows) || result.unavailable_rows.length === 0) {
      throw new Error(result.source_task_ref + ': unavailable rows absent');
    }
    result.unavailable_rows.forEach((gapText, index) => {
      const key = result.source_task_ref + '#' + index;
      const routeClass = assignments.get(key);
      if (!routeClass) throw new Error(key + ': Wave 30 assignment absent');
      const route = routeByClass.get(routeClass);
      globalSequence += 1;
      obligations.push({
        schema_version: 'lake-allocator-war-gap-task-wave-30@1',
        row_type: 'missing_row_closure_task',
        program_ref: policy.program_ref,
        wave_ref: policy.wave_ref,
        task_ref: 'LAW30-G' + String(globalSequence).padStart(3, '0'),
        task_sequence: globalSequence,
        source_task_ref: result.source_task_ref,
        source_queue_ref: result.queue_ref,
        source_queue_sequence: result.queue_sequence,
        source_task_sequence: result.task_sequence,
        source_task_class: result.task_class,
        source_priority_tier: result.priority_tier,
        consumer_key: result.consumer_key,
        consumer_feed_ref: result.consumer_feed_ref,
        source_route_authority: result.source_route_authority,
        source_result_state: result.result_state,
        source_refs: result.source_refs,
        source_receipt_count: result.source_receipt_count,
        unavailable_row_index: index,
        unavailable_row: gapText,
        unavailable_row_sha256: digestBytes(gapText),
        route_class: route.route_class,
        route_sequence: route.route_sequence,
        route_owner: route.owner,
        execution_state: route.execution_state,
        publicly_executable: route.public_execution,
        access_bounded: !route.public_execution,
        route_objective: route.objective,
        required_receipts: route.required_receipts,
        stop_rule: route.stop_rule,
        closure_status: 'open_routed',
        same_wave_source_acquisition: false,
        same_wave_completion: false,
        complete_denominator: false,
        evidence_adjudicated: false,
        evidence_rows: 0,
        estate_adopted: false,
        finding_promoted: false,
        blocked_promotions: policy.blocked_promotions,
        graph_effect: 'none',
        publication_status: 'blocked'
      });
    });
  }

  if (assignments.size !== obligations.length) {
    const observed = new Set(obligations.map(row => row.source_task_ref + '#' + row.unavailable_row_index));
    const extras = [...assignments.keys()].filter(key => !observed.has(key));
    throw new Error('Wave 30 assignment denominator drift; unused assignments: ' + extras.join(', '));
  }

  const resultRowsByPath = {};
  const routes = [];
  for (const route of policy.route_classes.slice().sort((a, b) => a.route_sequence - b.route_sequence)) {
    const tasks = obligations.filter(row => row.route_class === route.route_class);
    const summary = {
      schema_version: 'lake-allocator-war-gap-route-wave-30@1',
      row_type: 'missing_row_route_summary',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      route_ref: 'LAW30-R' + String(route.route_sequence).padStart(2, '0'),
      route_class: route.route_class,
      route_sequence: route.route_sequence,
      route_owner: route.owner,
      execution_state: route.execution_state,
      publicly_executable: route.public_execution,
      task_count: tasks.length,
      source_task_count: new Set(tasks.map(row => row.source_task_ref)).size,
      estate_count: new Set(tasks.map(row => row.consumer_key)).size,
      task_classes: countBy(tasks, 'source_task_class'),
      priorities: countBy(tasks, 'source_priority_tier'),
      closure_statuses: countBy(tasks, 'closure_status'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    };
    const rows = [summary, ...tasks];
    const relative = resultPathFor(route.route_class, policy);
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[relative] = rows;
    routes.push({
      route_ref: summary.route_ref,
      route_class: route.route_class,
      route_sequence: route.route_sequence,
      route_owner: route.owner,
      execution_state: route.execution_state,
      publicly_executable: route.public_execution,
      task_count: tasks.length,
      source_task_count: summary.source_task_count,
      estate_count: summary.estate_count,
      result_path: relative,
      result_rows: rows.length,
      result_sha256: digestBytes(raw),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    });
  }

  const sourceLedgerCustody = Object.fromEntries(
    sourceProjection.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence).map(queue => {
      const raw = sourceRawByPath[queue.result_path];
      if (typeof raw !== 'string') throw new Error(queue.result_path + ': Wave 29 raw ledger absent');
      return [queue.result_path, {
        bytes: Buffer.byteLength(raw),
        sha256: digestBytes(raw),
        declared_sha256: queue.result_sha256
      }];
    })
  );

  const projection = {
    schema_version: 'lake-allocator-war-gap-fanout-wave-30@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json',
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      source_ledger_custody: sourceLedgerCustody
    },
    counts: {
      source_queues: sourceProjection.queues.length,
      source_tasks: sourceResults.length,
      source_missing_rows: obligations.length,
      route_classes: routes.length,
      route_ledgers: routes.length,
      route_summary_rows: routes.length,
      closure_task_rows: obligations.length,
      execution_rows: routes.length + obligations.length,
      publicly_executable_tasks: obligations.filter(row => row.publicly_executable).length,
      access_bounded_tasks: obligations.filter(row => row.access_bounded).length,
      route_task_counts: countBy(obligations, 'route_class'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: sourceProjection.graph_digests,
    routes,
    source_task_refs: [...taskByRef.keys()],
    amortization_contract: {
      one_build_emits_every_missing_row: true,
      manual_per_task_dispatch_required: false,
      source_change_replays_only_affected_route: true,
      route_class_replay_is_amortized: true,
      same_wave_completion: false
    },
    boundaries: policy.boundaries
  };

  return { projection, resultRowsByPath, obligations };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war missing-row observability and closure fan-out Wave 30',
    '',
    '```text',
    'source queues / tasks:              ' + projection.counts.source_queues + ' / ' + projection.counts.source_tasks,
    'explicit missing rows:              ' + projection.counts.source_missing_rows,
    'route classes / ledgers:            ' + projection.counts.route_classes + ' / ' + projection.counts.route_ledgers,
    'publicly executable / access bound: ' + projection.counts.publicly_executable_tasks + ' / ' + projection.counts.access_bounded_tasks,
    'complete denominators:              0',
    'evidence rows:                      0',
    'estate adoptions:                   0',
    'finding promotions:                 0',
    'graph effects:                      0',
    'publication clearances:             0',
    '```',
    '',
    '| Route class | Tasks | Public execution | Execution state | Owner |',
    '|---|---:|---|---|---|'
  ];
  for (const route of projection.routes) {
    lines.push('| ' + route.route_class + ' | ' + route.task_count + ' | ' +
      String(route.publicly_executable) + ' | ' + route.execution_state + ' | ' + route.route_owner + ' |');
  }
  lines.push(
    '',
    'Wave 30 assigns every explicit missing row retained by Wave 29 to exactly one reusable acquisition lane. Thirty-four tasks are publicly executable through agency records, public systems, published action registers, dockets, comparator joins, or financial recovery records. Four tasks require privacy-safe aggregate or otherwise lawful personnel-record access.',
    '',
    'Route assignment does not close a source gap, adjudicate evidence, establish estate adoption, promote a finding, modify the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-gap-fanout-wave-30-policy.json');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRowsByPath = {};
  const sourceRawByPath = {};
  for (const queue of sourceProjection.queues) {
    const raw = fs.readFileSync(full(queue.result_path), 'utf8');
    sourceRawByPath[queue.result_path] = raw;
    sourceRowsByPath[queue.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const { projection, resultRowsByPath } = buildFanout(
    policy,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath
  );
  fs.rmSync(full(policy.paths.result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war gap fan-out Wave 30 built');
  console.log('  source tasks / missing rows: ' + projection.counts.source_tasks + ' / ' + projection.counts.source_missing_rows);
  console.log('  route classes / public / access-bounded: ' + projection.counts.route_classes + ' / ' + projection.counts.publicly_executable_tasks + ' / ' + projection.counts.access_bounded_tasks);
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
