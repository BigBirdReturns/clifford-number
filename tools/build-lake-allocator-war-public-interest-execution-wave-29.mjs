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
  return {
    participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

export function resultPathFor(queueRef, policy) {
  return policy.paths.result_root + '/' + queueRef.toLowerCase() + '.jsonl';
}

export function buildSourcePlan(policy, inheritedRegistry) {
  const inheritedByRef = new Map(inheritedRegistry.source_registry.map(row => [row.source_ref, row]));
  const inherited = policy.source_contract.inherited_source_refs.map(sourceRef => {
    const source = inheritedByRef.get(sourceRef);
    if (!source) throw new Error(sourceRef + ': inherited source absent');
    return source;
  });
  const sources = [...inherited, ...policy.source_contract.new_source_registry];
  const plans = policy.source_contract.task_plans;
  return {
    schema_version: 'lake-allocator-war-public-interest-execution-wave-29-source-plan@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    purpose: 'Bind all twelve Wave 28 implementation tasks to exact inherited and newly acquired official source receipts and bounded acquisition outcomes.',
    source_registry: sources,
    task_plans: plans,
    counts: {
      inherited_source_receipts: inherited.length,
      new_source_receipts: policy.source_contract.new_source_registry.length,
      source_receipts: sources.length,
      source_receipt_uses: plans.reduce((sum, row) => sum + row.source_refs.length, 0),
      task_plans: plans.length,
      result_states: countBy(plans, 'result_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    boundaries: policy.boundaries
  };
}

export function buildExecution(
  policy,
  sourceProjection,
  sourcePlan,
  sourceProjectionRaw,
  sourcePlanRaw,
  queueRowsByPath
) {
  const planByRef = new Map(sourcePlan.task_plans.map(row => [row.task_ref, row]));
  const sourceByRef = new Map(sourcePlan.source_registry.map(row => [row.source_ref, row]));
  const resultRowsByPath = {};
  const queues = [];

  for (const sourceQueue of sourceProjection.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence)) {
    const sourceRows = queueRowsByPath[sourceQueue.result_path];
    if (!sourceRows) throw new Error(sourceQueue.queue_ref + ': Wave 28 queue rows absent');
    const sourceSummary = sourceRows.find(row => row.row_type === 'implementation_closure_queue');
    const sourceTasks = sourceRows
      .filter(row => row.row_type === 'implementation_closure_task')
      .sort((a, b) => a.task_sequence - b.task_sequence);
    if (!sourceSummary) throw new Error(sourceQueue.queue_ref + ': Wave 28 queue summary absent');

    const resultRows = sourceTasks.map(task => {
      const plan = planByRef.get(task.task_ref);
      if (!plan) throw new Error(task.task_ref + ': Wave 29 task plan absent');
      for (const sourceRef of plan.source_refs) {
        if (!sourceByRef.has(sourceRef)) throw new Error(task.task_ref + ': unknown Wave 29 source ' + sourceRef);
      }
      return {
        schema_version: 'lake-allocator-war-public-interest-execution-result-wave-29@1',
        row_type: 'implementation_execution_result',
        program_ref: policy.program_ref,
        wave_ref: policy.wave_ref,
        queue_ref: task.queue_ref,
        queue_sequence: task.queue_sequence,
        consumer_key: task.consumer_key,
        consumer_feed_ref: task.consumer_feed_ref,
        source_route_authority: task.source_route_authority,
        task_authority: task.task_authority,
        source_task_ref: task.task_ref,
        task_sequence: task.task_sequence,
        task_class: task.task_class,
        priority_tier: task.priority_tier,
        source_closure_refs: task.source_closure_refs,
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
        estate_adopted: false,
        finding_promoted: false,
        graph_effect: 'none',
        publication_status: 'blocked'
      };
    });

    const resultPath = resultPathFor(sourceQueue.queue_ref, policy);
    const summary = {
      schema_version: 'lake-allocator-war-public-interest-execution-queue-wave-29@1',
      row_type: 'implementation_execution_queue',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      queue_ref: 'LAW29-' + sourceQueue.queue_ref,
      queue_sequence: sourceQueue.queue_sequence,
      source_queue_ref: sourceQueue.queue_ref,
      consumer_key: sourceQueue.consumer_key,
      consumer_feed_ref: sourceQueue.consumer_feed_ref,
      source_route_authority: sourceSummary.source_route_authority,
      source_task_count: sourceTasks.length,
      executed_task_count: resultRows.length,
      result_states: countBy(resultRows, 'result_state'),
      source_receipt_uses: resultRows.reduce((sum, row) => sum + row.source_receipt_count, 0),
      complete_denominators: 0,
      evidence_adjudicated: false,
      evidence_rows: 0,
      blocked_promotions: policy.blocked_promotions,
      estate_adopted: false,
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
      consumer_key: summary.consumer_key,
      consumer_feed_ref: summary.consumer_feed_ref,
      executed_task_count: summary.executed_task_count,
      result_states: summary.result_states,
      source_receipt_uses: summary.source_receipt_uses,
      result_path: resultPath,
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

  const allRows = Object.values(resultRowsByPath).flat();
  const results = allRows.filter(row => row.row_type === 'implementation_execution_result');
  const projection = {
    schema_version: 'lake-allocator-war-public-interest-execution-wave-29@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json',
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw)
    },
    counts: {
      source_queues: sourceProjection.queues.length,
      source_tasks: results.length,
      execution_ledgers: queues.length,
      queue_summary_rows: allRows.filter(row => row.row_type === 'implementation_execution_queue').length,
      execution_result_rows: results.length,
      execution_rows: allRows.length,
      executed_tasks: results.length,
      inherited_source_receipts: sourcePlan.counts.inherited_source_receipts,
      new_source_receipts: sourcePlan.counts.new_source_receipts,
      source_receipts: sourcePlan.counts.source_receipts,
      source_receipt_uses: results.reduce((sum, row) => sum + row.source_receipt_count, 0),
      result_states: countBy(results, 'result_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
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
  const lines = [
    '# Allocator-war public-interest implementation execution Wave 29',
    '',
    '```text',
    'source queues / tasks:               ' + projection.counts.source_queues + ' / ' + projection.counts.source_tasks,
    'execution ledgers / rows:            ' + projection.counts.execution_ledgers + ' / ' + projection.counts.execution_rows,
    'executed tasks:                      ' + projection.counts.executed_tasks,
    'inherited / new / total receipts:    ' + projection.counts.inherited_source_receipts + ' / ' + projection.counts.new_source_receipts + ' / ' + projection.counts.source_receipts,
    'source receipt uses:                 ' + projection.counts.source_receipt_uses,
    'partial / unavailable results:       ' + (states.partial ?? 0) + ' / ' + (states.unavailable_after_search ?? 0),
    'complete denominators:               0',
    'evidence rows:                       0',
    'estate adoptions:                    0',
    'finding promotions:                  0',
    'graph effects:                       0',
    'publication clearances:              0',
    '```',
    '',
    '| Estate consumer | Queue | Tasks | Result states | Source uses |',
    '|---|---|---:|---|---:|'
  ];
  for (const queue of projection.queues) {
    lines.push(
      '| ' + queue.consumer_key + ' | ' + queue.queue_ref + ' | ' +
      queue.executed_task_count + ' | ' + JSON.stringify(queue.result_states) +
      ' | ' + queue.source_receipt_uses + ' |'
    );
  }
  lines.push(
    '',
    'Wave 29 executes all twelve Wave 28 tasks against thirty-four exact official source receipts. Eleven tasks retain bounded partial recoveries. The person-level personnel-decision ledger terminates as unavailable after search because only governing criteria and litigation, rather than a source-complete decision roster, were exposed.',
    '',
    'No execution result is evidence adjudication, estate adoption, a complete denominator, a finding, a graph effect, or publication authority.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const inheritedRegistry = readJson(policy.paths.inherited_source_registry);
  const sourcePlan = buildSourcePlan(policy, inheritedRegistry);
  writeJson(policy.paths.source_plan, sourcePlan);
  const sourcePlanRaw = fs.readFileSync(full(policy.paths.source_plan), 'utf8');
  const queueRowsByPath = Object.fromEntries(
    sourceProjection.queues.map(queue => [queue.result_path, readJsonl(queue.result_path)])
  );
  const { projection, resultRowsByPath } = buildExecution(
    policy,
    sourceProjection,
    sourcePlan,
    sourceProjectionRaw,
    sourcePlanRaw,
    queueRowsByPath
  );
  fs.rmSync(full(policy.paths.result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war public-interest execution Wave 29 built');
  console.log('  queues / tasks / rows: ' + projection.counts.source_queues + ' / ' + projection.counts.source_tasks + ' / ' + projection.counts.execution_rows);
  console.log('  receipts / uses: ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses);
  console.log('  result states: ' + JSON.stringify(projection.counts.result_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
