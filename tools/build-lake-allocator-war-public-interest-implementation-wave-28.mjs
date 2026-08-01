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

export function buildImplementationQueues(
  policy,
  sourceProjection,
  sourceRows,
  estateRows,
  rawInputs
) {
  const contract = policy.source_contract;
  const sourceResults = sourceRows.filter(row => row.row_type === 'downstream_execution_result');
  const sourceByRef = new Map(sourceResults.map(row => [row.closure_ref, row]));
  const estateByConsumer = new Map(estateRows.map(row => [row.consumer_key, row]));
  const resultRowsByPath = {};
  const queues = [];

  for (const queue of policy.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence)) {
    const estate = estateByConsumer.get(queue.consumer_key);
    if (!estate) throw new Error(queue.queue_ref + ': estate consumer absent');
    const taskRows = queue.tasks
      .slice()
      .sort((a, b) => a.task_sequence - b.task_sequence)
      .map(task => {
        const sources = task.source_closure_refs.map(ref => {
          const row = sourceByRef.get(ref);
          if (!row) throw new Error(task.task_ref + ': source partial absent: ' + ref);
          return row;
        });
        const inheritedSourceRefs = [...new Set(sources.flatMap(row => row.source_refs))].sort();
        return {
          schema_version: 'lake-allocator-war-public-interest-implementation-task-wave-28@1',
          row_type: 'implementation_closure_task',
          program_ref: policy.program_ref,
          wave_ref: policy.wave_ref,
          queue_ref: queue.queue_ref,
          queue_sequence: queue.queue_sequence,
          consumer_key: queue.consumer_key,
          consumer_feed_ref: estate.allocator_estate_feed_id,
          source_route_authority: queue.source_route_authority,
          task_authority: contract.source_authority,
          task_ref: task.task_ref,
          task_sequence: task.task_sequence,
          task_class: task.task_class,
          priority_tier: task.priority_tier,
          source_closure_refs: task.source_closure_refs,
          source_result_states: [...new Set(sources.map(row => row.result_state))].sort(),
          source_result_paths: [policy.paths.source_public_ledger],
          inherited_source_refs: inheritedSourceRefs,
          inherited_source_receipt_count: inheritedSourceRefs.length,
          closure_target: task.closure_target,
          required_receipts: task.required_receipts,
          execution_state: policy.execution_law.task_state,
          controls_nulls_refusals_and_failed_paths_required: true,
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

    const sourcePartialRefs = [...new Set(taskRows.flatMap(row => row.source_closure_refs))].sort();
    const inheritedSourceRefs = [...new Set(taskRows.flatMap(row => row.inherited_source_refs))].sort();
    const summary = {
      schema_version: 'lake-allocator-war-public-interest-implementation-queue-wave-28@1',
      row_type: 'implementation_closure_queue',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      queue_ref: queue.queue_ref,
      queue_sequence: queue.queue_sequence,
      consumer_key: queue.consumer_key,
      consumer_feed_ref: estate.allocator_estate_feed_id,
      source_route_authority: queue.source_route_authority,
      source_partial_refs: sourcePartialRefs,
      inherited_source_refs: inheritedSourceRefs,
      inherited_source_receipt_count: inheritedSourceRefs.length,
      closure_task_count: taskRows.length,
      priority_tiers: countBy(taskRows, 'priority_tier'),
      task_classes: countBy(taskRows, 'task_class'),
      ready_task_count: taskRows.filter(row => row.execution_state === policy.execution_law.task_state).length,
      complete_denominators: 0,
      evidence_adjudicated: false,
      evidence_rows: 0,
      blocked_promotions: policy.blocked_promotions,
      estate_adopted: false,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
    const rows = [summary, ...taskRows];
    const resultPath = resultPathFor(queue.queue_ref, policy);
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[resultPath] = rows;
    queues.push({
      queue_ref: queue.queue_ref,
      queue_sequence: queue.queue_sequence,
      consumer_key: queue.consumer_key,
      consumer_feed_ref: estate.allocator_estate_feed_id,
      source_partial_refs: sourcePartialRefs,
      inherited_source_refs: inheritedSourceRefs,
      closure_task_count: taskRows.length,
      priority_tiers: summary.priority_tiers,
      task_classes: summary.task_classes,
      ready_task_count: summary.ready_task_count,
      result_path: resultPath,
      result_rows: rows.length,
      result_sha256: digestBytes(raw),
      complete_denominators: 0,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    });
  }

  const allRows = Object.values(resultRowsByPath).flat();
  const tasks = allRows.filter(row => row.row_type === 'implementation_closure_task');
  const projection = {
    schema_version: 'lake-allocator-war-public-interest-implementation-wave-28@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json',
      policy_bytes: Buffer.byteLength(rawInputs.policy),
      policy_sha256: digestBytes(rawInputs.policy),
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(rawInputs.sourceProjection),
      source_projection_sha256: digestBytes(rawInputs.sourceProjection),
      source_public_ledger_path: policy.paths.source_public_ledger,
      source_public_ledger_bytes: Buffer.byteLength(rawInputs.sourceLedger),
      source_public_ledger_sha256: digestBytes(rawInputs.sourceLedger),
      estate_registry_path: policy.paths.estate_registry,
      estate_registry_bytes: Buffer.byteLength(rawInputs.estateRegistry),
      estate_registry_sha256: digestBytes(rawInputs.estateRegistry)
    },
    counts: {
      source_partial_results: contract.required_partial_closure_refs.length,
      consumer_queues: queues.length,
      closure_tasks: tasks.length,
      queue_summary_rows: allRows.filter(row => row.row_type === 'implementation_closure_queue').length,
      closure_task_rows: tasks.length,
      execution_rows: allRows.length,
      ready_tasks: tasks.filter(row => row.execution_state === policy.execution_law.task_state).length,
      priority_tiers: countBy(tasks, 'priority_tier'),
      task_classes: countBy(tasks, 'task_class'),
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
  const lines = [
    '# Allocator-war public-interest implementation denominator Wave 28',
    '',
    '```text',
    'source partial results:             ' + projection.counts.source_partial_results,
    'consumer queues:                    ' + projection.counts.consumer_queues,
    'closure tasks:                      ' + projection.counts.closure_tasks,
    'queue summary / task rows:          ' + projection.counts.queue_summary_rows + ' / ' + projection.counts.closure_task_rows,
    'execution rows:                     ' + projection.counts.execution_rows,
    'ready tasks:                        ' + projection.counts.ready_tasks,
    'priority P0 / P1 / P2:              ' + (projection.counts.priority_tiers.P0 ?? 0) + ' / ' + (projection.counts.priority_tiers.P1 ?? 0) + ' / ' + (projection.counts.priority_tiers.P2 ?? 0),
    'complete denominators:              0',
    'evidence rows:                      0',
    'finding promotions:                 0',
    'graph effects:                      0',
    'publication clearances:             0',
    '```',
    '',
    '| Estate consumer | Queue | Tasks | Priority tiers | Task classes |',
    '|---|---|---:|---|---|'
  ];
  for (const queue of projection.queues) {
    lines.push(
      '| ' + queue.consumer_key + ' | ' + queue.queue_ref + ' | ' + queue.closure_task_count +
      ' | ' + JSON.stringify(queue.priority_tiers) + ' | ' + JSON.stringify(queue.task_classes) + ' |'
    );
  }
  lines.push(
    '',
    'Wave 28 converts the two partial Wave 27 public-interest results into twelve exact acquisition obligations across the public-interest, regulatory-markets, labor and workforce, public-money, and executive-accountability estates.',
    '',
    'Every task remains acquisition-only. Queue admission does not close either source partial, establish estate adoption, adjudicate evidence, create a finding or graph effect, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policyPath = 'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json';
  const policyRaw = fs.readFileSync(full(policyPath), 'utf8');
  const policy = JSON.parse(policyRaw);
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourceLedgerRaw = fs.readFileSync(full(policy.paths.source_public_ledger), 'utf8');
  const estateRegistryRaw = fs.readFileSync(full(policy.paths.estate_registry), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRows = sourceLedgerRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const estateRows = estateRegistryRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const { projection, resultRowsByPath } = buildImplementationQueues(
    policy,
    sourceProjection,
    sourceRows,
    estateRows,
    {
      policy: policyRaw,
      sourceProjection: sourceProjectionRaw,
      sourceLedger: sourceLedgerRaw,
      estateRegistry: estateRegistryRaw
    }
  );
  fs.rmSync(full(policy.paths.result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war public-interest implementation Wave 28 built');
  console.log('  partials / queues / tasks: ' + projection.counts.source_partial_results + ' / ' + projection.counts.consumer_queues + ' / ' + projection.counts.closure_tasks);
  console.log('  priorities: ' + JSON.stringify(projection.counts.priority_tiers));
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
