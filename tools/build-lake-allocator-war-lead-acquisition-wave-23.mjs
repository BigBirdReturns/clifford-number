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
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);

export function priorityRank(priority, policy) {
  const rank = policy.selection_law.priority_order.indexOf(priority);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

export function selectLeadTask(queue, policy) {
  if (!Array.isArray(queue.tasks) || queue.tasks.length === 0) {
    throw new Error(queue.allocator_estate_feed_id + ': empty Wave 22 queue');
  }
  return queue.tasks
    .slice()
    .sort((left, right) => {
      const priorityDelta = priorityRank(left.priority_tier, policy) - priorityRank(right.priority_tier, policy);
      if (priorityDelta !== 0) return priorityDelta;
      const sequenceDelta = left.sequence - right.sequence;
      if (sequenceDelta !== 0) return sequenceDelta;
      return left.task_ref.localeCompare(right.task_ref);
    })[0];
}

function graphDigestsSafe() {
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

export function buildProjection(policy, sourceProjection, sourceRaw) {
  const queues = sourceProjection.queues.slice().sort((a, b) =>
    a.allocator_estate_feed_id.localeCompare(b.allocator_estate_feed_id)
  );
  const packets = queues.map((queue, index) => {
    const task = selectLeadTask(queue, policy);
    const sourceFamilies = policy.consumer_source_families[queue.consumer_key];
    if (!sourceFamilies) throw new Error(queue.consumer_key + ': source-family contract missing');
    return {
      packet_ref: 'LAW23-' + queue.allocator_estate_feed_id,
      packet_sequence: index + 1,
      source_queue_ref: queue.allocator_estate_feed_id,
      source_task_ref: task.task_ref,
      source_task_sequence: task.sequence,
      consumer_key: queue.consumer_key,
      queue_class: queue.queue_class,
      source_route_authority: queue.source_route_authority,
      task_authority: task.task_authority,
      selection_priority: task.priority_tier,
      selection_rule: 'highest_priority_then_lowest_source_task_sequence',
      acquisition_target: task.acquisition_target,
      required_output: task.required_output,
      closure_test: task.closure_test,
      allowed_results: task.allowed_results,
      reviewed_source_finding_refs: queue.reviewed_source_finding_refs,
      reviewed_source_observation_refs: queue.reviewed_source_observation_refs,
      unreviewed_intake_observation_refs: queue.unreviewed_intake_observation_refs,
      source_families: sourceFamilies,
      query_seed: queue.consumer_key + ' :: ' + task.acquisition_target,
      search_protocol: {
        source_scope: policy.retrieval_contract.source_scope,
        primary_source_required: policy.retrieval_contract.primary_source_required,
        negative_search_required: policy.retrieval_contract.negative_search_required,
        controls_nulls_refusals_and_failed_paths_required: policy.retrieval_contract.controls_nulls_refusals_and_failed_paths_required,
        cross_estate_join_authorized: policy.retrieval_contract.cross_estate_join_authorized
      },
      receipt_contract: {
        exact_source_locator_required: policy.retrieval_contract.exact_source_locator_required,
        source_bytes_or_stable_official_identifier_required: policy.retrieval_contract.source_bytes_or_stable_official_identifier_required,
        required_fields: policy.retrieval_contract.required_receipt_fields
      },
      result_ledger_path: policy.paths.result_ledger_root + '/' + queue.allocator_estate_feed_id.toLowerCase() + '.jsonl',
      execution_state: policy.retrieval_contract.execution_state,
      result_rows: 0,
      evidence_adjudicated: false,
      controls_and_refusals_required: true,
      blocked_promotions: policy.blocked_promotions,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
  });

  return {
    schema_version: 'lake-allocator-war-lead-acquisition-wave-23@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceRaw),
      source_projection_sha256: digestBytes(sourceRaw)
    },
    counts: {
      estate_queues: queues.length,
      lead_packets: packets.length,
      selected_priorities: countBy(packets, 'selection_priority'),
      authority_classes: countBy(packets, 'queue_class'),
      reviewed_only_packets: packets.filter(row => row.queue_class === 'reviewed_execution_queue').length,
      split_authority_packets: packets.filter(row => row.queue_class === 'split_authority_execution_queue').length,
      unreviewed_only_packets: packets.filter(row => row.queue_class === 'unreviewed_acquisition_queue').length,
      execution_ready_packets: packets.filter(row => row.execution_state === policy.retrieval_contract.execution_state).length,
      evidence_rows: packets.reduce((sum, row) => sum + row.result_rows, 0),
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigestsSafe(),
    packets,
    boundaries: policy.boundaries
  };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war lead acquisition launch Wave 23',
    '',
    '```text',
    'estate queues:              ' + projection.counts.estate_queues,
    'lead acquisition packets:   ' + projection.counts.lead_packets,
    'selected P0 / P1 / P2:      ' +
      (projection.counts.selected_priorities.P0 ?? 0) + ' / ' +
      (projection.counts.selected_priorities.P1 ?? 0) + ' / ' +
      (projection.counts.selected_priorities.P2 ?? 0),
    'execution-ready packets:    ' + projection.counts.execution_ready_packets,
    'evidence rows:              ' + projection.counts.evidence_rows,
    'finding promotions:         0',
    'graph effects:              0',
    'publication clearances:     0',
    '```',
    '',
    '| Estate consumer | Packet | Source task | Priority | Authority | Target |',
    '|---|---|---|---|---|---|'
  ];
  for (const packet of projection.packets) {
    lines.push(
      '| ' + packet.consumer_key + ' | ' + packet.packet_ref + ' | ' + packet.source_task_ref + ' | ' +
      packet.selection_priority + ' | ' + packet.queue_class + ' | ' + packet.acquisition_target + ' |'
    );
  }
  lines.push(
    '',
    'Wave 23 admits one lead packet per estate by priority and source sequence. Admission is not retrieval, review, truth, merit, prevalence, relationship, or estate adoption.',
    '',
    'Each packet requires official-first retrieval, exact source custody, negative search, explicit null and refusal rows, and a separate result ledger. No evidence rows are created in this wave; graph effect is none and publication remains blocked.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json');
  const sourceRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceRaw);
  const projection = buildProjection(policy, sourceProjection, sourceRaw);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war lead acquisition Wave 23 built');
  console.log('  estate queues / lead packets: ' + projection.counts.estate_queues + ' / ' + projection.counts.lead_packets);
  console.log('  selected priorities: ' + JSON.stringify(projection.counts.selected_priorities));
  console.log('  evidence / graph / publication: ' + projection.counts.evidence_rows + ' / 0 / 0');
}
