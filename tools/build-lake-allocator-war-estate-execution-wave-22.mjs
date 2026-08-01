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
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
};
const digest = value => digestBytes(JSON.stringify(stable(value)));
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);

export function priorityFor(target, policy) {
  const normalized = String(target).toLowerCase();
  for (const tier of ['P0', 'P1']) {
    if (policy.priority_law.keywords[tier].some(keyword => normalized.includes(keyword))) return tier;
  }
  return 'P2';
}

function graphDigests() {
  return {
    participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

export function buildProjection(policy, sourceRows, sourceRaw) {
  const queues = sourceRows
    .slice()
    .sort((a, b) => a.allocator_estate_feed_id.localeCompare(b.allocator_estate_feed_id))
    .map(source => {
      const authority = policy.authority_law[source.route_authority];
      if (!authority) throw new Error(source.allocator_estate_feed_id + ': unknown route authority');
      const tasks = source.next_acquisition.map((target, index) => {
        const priority = priorityFor(target, policy);
        return {
          task_ref: source.allocator_estate_feed_id + '/T' + String(index + 1).padStart(2, '0'),
          sequence: index + 1,
          acquisition_target: target,
          priority_tier: priority,
          task_authority: authority.task_authority,
          required_output: policy.priority_law.outputs[priority] + ' Target: ' + target,
          closure_test: policy.priority_law.closure_tests[priority],
          allowed_results: policy.task_contract.allowed_results,
          controls_and_refusals_required: source.controls_and_refusals_required === true,
          blocked_promotions: policy.task_contract.blocked_promotions,
          finding_promoted: false,
          graph_effect: 'none',
          publication_status: 'blocked'
        };
      });
      return {
        allocator_estate_feed_id: source.allocator_estate_feed_id,
        consumer_key: source.consumer_key,
        source_route_authority: source.route_authority,
        queue_class: authority.queue_class,
        task_authority: authority.task_authority,
        consumer_question: source.consumer_question,
        reviewed_source_finding_refs: source.reviewed_source_finding_refs,
        reviewed_source_observation_refs: source.reviewed_source_observation_refs,
        unreviewed_intake_observation_refs: source.unreviewed_intake_observation_refs,
        supplies: source.supplies,
        controls_and_refusals_required: source.controls_and_refusals_required === true,
        task_count: tasks.length,
        tasks,
        finding_promoted: false,
        graph_effect: 'none',
        publication_status: 'blocked'
      };
    });

  const tasks = queues.flatMap(queue => queue.tasks);
  return {
    schema_version: 'lake-allocator-war-estate-execution-wave-22@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
      source_registry_path: policy.paths.source_estate_registry,
      source_registry_bytes: Buffer.byteLength(sourceRaw),
      source_registry_sha256: digestBytes(sourceRaw)
    },
    counts: {
      estate_queues: queues.length,
      acquisition_tasks: tasks.length,
      authority_classes: countBy(queues, 'queue_class'),
      priority_tiers: countBy(tasks, 'priority_tier'),
      reviewed_only_queues: queues.filter(row => row.queue_class === 'reviewed_execution_queue').length,
      split_authority_queues: queues.filter(row => row.queue_class === 'split_authority_execution_queue').length,
      unreviewed_only_queues: queues.filter(row => row.queue_class === 'unreviewed_acquisition_queue').length,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigests(),
    queues,
    boundaries: policy.boundaries
  };
}

function renderReport(projection) {
  const lines = [
    '# Allocator-war estate execution Wave 22',
    '',
    '```text',
    'estate queues:              ' + projection.counts.estate_queues,
    'acquisition tasks:          ' + projection.counts.acquisition_tasks,
    'reviewed-only queues:       ' + projection.counts.reviewed_only_queues,
    'split-authority queues:     ' + projection.counts.split_authority_queues,
    'unreviewed-only queues:     ' + projection.counts.unreviewed_only_queues,
    'finding promotions:         0',
    'graph effects:              0',
    'publication clearances:     0',
    '```',
    '',
    '| Estate consumer | Feed | Authority | Tasks | P0 | P1 | P2 |',
    '|---|---|---|---:|---:|---:|---:|'
  ];
  for (const queue of projection.queues) {
    const priorities = {
      P0: queue.tasks.filter(task => task.priority_tier === 'P0').length,
      P1: queue.tasks.filter(task => task.priority_tier === 'P1').length,
      P2: queue.tasks.filter(task => task.priority_tier === 'P2').length
    };
    lines.push(
      '| ' + queue.consumer_key + ' | ' + queue.allocator_estate_feed_id + ' | ' +
      queue.queue_class + ' | ' + queue.task_count + ' | ' +
      priorities.P0 + ' | ' + priorities.P1 + ' | ' + priorities.P2 + ' |'
    );
  }
  lines.push(
    '',
    'Priority orders acquisition work. It is not a truth, merit, guilt, risk, or importance score.',
    '',
    'Every queue remains below estate adoption. Unreviewed intake remains acquisition-only; controls, nulls, refusals, and failed paths remain mandatory. Graph effect is none and publication remains blocked.',
    ''
  );
  return lines.join('\n');
}

export function buildRepository() {
  const policyPath = 'data/project/lake-allocator-war-estate-execution-wave-22-policy.json';
  const policy = readJson(policyPath);
  const sourceRaw = fs.readFileSync(full(policy.paths.source_estate_registry), 'utf8');
  const sourceRows = sourceRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const projection = buildProjection(policy, sourceRows, sourceRaw);
  writeJson(policy.paths.projection, projection);
  fs.mkdirSync(path.dirname(full(policy.paths.report)), { recursive: true });
  fs.writeFileSync(full(policy.paths.report), renderReport(projection));
  console.log('allocator-war estate execution Wave 22 built');
  console.log('  estate queues / acquisition tasks: ' + projection.counts.estate_queues + ' / ' + projection.counts.acquisition_tasks);
  console.log('  reviewed / split / unreviewed queues: ' + projection.counts.reviewed_only_queues + ' / ' + projection.counts.split_authority_queues + ' / ' + projection.counts.unreviewed_only_queues);
  console.log('  graph/publication findings: 0/0');
  return projection;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildRepository();
}
