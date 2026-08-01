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

export function ledgerPathFor(packet, policy) {
  return policy.paths.ledger_root + '/' + packet.source_queue_ref.toLowerCase() + '.jsonl';
}

export function buildExecution(policy, sourcePlan, sourceProjection, sourcePlanRaw, sourceProjectionRaw) {
  const sourceByRef = new Map(sourcePlan.source_registry.map(row => [row.id, row]));
  const planByPacket = new Map(sourcePlan.packet_plans.map(row => [row.packet_ref, row]));
  const packets = sourceProjection.packets.slice().sort((a, b) => a.packet_sequence - b.packet_sequence);
  const ledgerRowsByPath = {};
  const executions = [];

  for (const packet of packets) {
    const plan = planByPacket.get(packet.packet_ref);
    if (!plan) throw new Error(packet.packet_ref + ': Wave 24 packet plan absent');
    const sources = plan.source_refs.map(sourceRef => {
      const source = sourceByRef.get(sourceRef);
      if (!source) throw new Error(packet.packet_ref + ': source plan reference absent: ' + sourceRef);
      return source;
    });
    const ledgerPath = ledgerPathFor(packet, policy);
    const packetRow = {
      schema_version: policy.execution_contract.packet_summary_schema,
      row_type: 'packet_execution',
      packet_ref: packet.packet_ref,
      packet_sequence: packet.packet_sequence,
      source_queue_ref: packet.source_queue_ref,
      source_task_ref: packet.source_task_ref,
      source_task_sequence: packet.source_task_sequence,
      consumer_key: packet.consumer_key,
      queue_class: packet.queue_class,
      source_route_authority: packet.source_route_authority,
      task_authority: packet.task_authority,
      selection_priority: packet.selection_priority,
      acquisition_target: packet.acquisition_target,
      required_output: packet.required_output,
      closure_test: packet.closure_test,
      allowed_results: packet.allowed_results,
      reviewed_source_finding_refs: packet.reviewed_source_finding_refs,
      reviewed_source_observation_refs: packet.reviewed_source_observation_refs,
      unreviewed_intake_observation_refs: packet.unreviewed_intake_observation_refs,
      bounded_window: plan.bounded_window,
      acquisition_disposition: plan.acquisition_disposition,
      institutional_gate_state: plan.institutional_gate_state,
      coverage_statement: plan.coverage_statement,
      included_rows: plan.included_rows,
      excluded_rows: plan.excluded_rows,
      null_rows: plan.null_rows,
      unavailable_rows: plan.unavailable_rows,
      refused_rows: plan.refused_rows,
      negative_search_statement: plan.negative_search_statement,
      correction_route: plan.correction_route,
      correction_outcome: plan.correction_outcome,
      source_refs: plan.source_refs,
      source_receipt_rows: sources.length,
      complete_denominator: false,
      execution_state: policy.execution_contract.execution_state,
      evidence_adjudicated: false,
      evidence_rows: 0,
      controls_and_refusals_required: true,
      blocked_promotions: policy.blocked_promotions,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
    const sourceRows = sources.map((source, index) => ({
      schema_version: policy.execution_contract.source_receipt_schema,
      row_type: 'source_receipt',
      packet_ref: packet.packet_ref,
      source_queue_ref: packet.source_queue_ref,
      receipt_sequence: index + 1,
      source_ref: source.id,
      source_locator: source.source_locator,
      resolved_locator: source.resolved_locator,
      stable_identifier: source.stable_identifier,
      content_sha256_or_stable_official_identifier: source.stable_identifier,
      issuing_body: source.issuing_body,
      source_type: source.source_type,
      jurisdiction: source.jurisdiction,
      issued_at: source.issued_at,
      retrieved_at: source.retrieved_at,
      retrieval_status: source.retrieval_status,
      custody_refs: source.custody_refs,
      source_bytes_preserved: false,
      complete_denominator: false,
      acquisition_recorded: true,
      evidence_adjudicated: false,
      evidence_rows: 0,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    }));
    const rows = [packetRow, ...sourceRows];
    const ledgerRaw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    ledgerRowsByPath[ledgerPath] = rows;
    executions.push({
      packet_ref: packet.packet_ref,
      packet_sequence: packet.packet_sequence,
      source_queue_ref: packet.source_queue_ref,
      source_task_ref: packet.source_task_ref,
      consumer_key: packet.consumer_key,
      queue_class: packet.queue_class,
      source_route_authority: packet.source_route_authority,
      task_authority: packet.task_authority,
      selection_priority: packet.selection_priority,
      acquisition_target: packet.acquisition_target,
      acquisition_disposition: plan.acquisition_disposition,
      institutional_gate_state: plan.institutional_gate_state,
      bounded_window: plan.bounded_window,
      coverage_statement: plan.coverage_statement,
      source_refs: plan.source_refs,
      source_receipt_rows: sources.length,
      ledger_path: ledgerPath,
      ledger_rows: rows.length,
      ledger_sha256: digestBytes(ledgerRaw),
      complete_denominator: false,
      execution_state: policy.execution_contract.execution_state,
      evidence_adjudicated: false,
      evidence_rows: 0,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    });
  }

  const sourceReceiptRows = Object.values(ledgerRowsByPath)
    .flat()
    .filter(row => row.row_type === 'source_receipt');
  const packetSummaryRows = Object.values(ledgerRowsByPath)
    .flat()
    .filter(row => row.row_type === 'packet_execution');

  const projection = {
    schema_version: 'lake-allocator-war-lead-execution-wave-24@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-lead-execution-wave-24-policy.json',
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw),
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw)
    },
    counts: {
      source_packets: packets.length,
      acquisition_ledgers: executions.length,
      unique_source_receipts: sourcePlan.source_registry.length,
      source_receipt_uses: sourceReceiptRows.length,
      packet_summary_rows: packetSummaryRows.length,
      source_receipt_rows: sourceReceiptRows.length,
      acquisition_rows: packetSummaryRows.length + sourceReceiptRows.length,
      acquisition_dispositions: countBy(executions, 'acquisition_disposition'),
      source_registry_retrieval_statuses: countBy(sourcePlan.source_registry, 'retrieval_status'),
      source_use_retrieval_statuses: countBy(sourceReceiptRows, 'retrieval_status'),
      complete_denominators: executions.filter(row => row.complete_denominator === true).length,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigestsSafe(),
    executions,
    boundaries: policy.boundaries
  };

  return { projection, ledgerRowsByPath };
}

export function renderReport(projection) {
  const disposition = projection.counts.acquisition_dispositions;
  const lines = [
    '# Allocator-war lead acquisition execution Wave 24',
    '',
    '```text',
    'source packets:             ' + projection.counts.source_packets,
    'acquisition ledgers:        ' + projection.counts.acquisition_ledgers,
    'unique source receipts:     ' + projection.counts.unique_source_receipts,
    'source receipt uses:        ' + projection.counts.source_receipt_uses,
    'acquisition rows:           ' + projection.counts.acquisition_rows,
    'partial source recoveries:  ' + (disposition.partial_source_recovery ?? 0),
    'gate-unspecified recoveries:' + '  ' + (disposition.bounded_public_record_recovered_gate_unspecified ?? 0),
    'complete denominators:      ' + projection.counts.complete_denominators,
    'evidence rows:              0',
    'finding promotions:         0',
    'graph effects:              0',
    'publication clearances:     0',
    '```',
    '',
    '| Estate consumer | Packet | Disposition | Gate state | Sources | Ledger rows |',
    '|---|---|---|---|---:|---:|'
  ];
  for (const execution of projection.executions) {
    lines.push(
      '| ' + execution.consumer_key + ' | ' + execution.packet_ref + ' | ' +
      execution.acquisition_disposition + ' | ' + execution.institutional_gate_state + ' | ' +
      execution.source_receipt_rows + ' | ' + execution.ledger_rows + ' |'
    );
  }
  lines.push(
    '',
    'Wave 24 records bounded acquisition results. Nine packets retain named institutional surfaces with incomplete denominators. Two packets retain bounded public records while refusing to invent an institutional gate.',
    '',
    'Acquisition rows remain below evidence review. Missing, excluded, unavailable, refused, and gate-unspecified states remain explicit; graph effect is none and publication remains blocked.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-lead-execution-wave-24-policy.json');
  const sourcePlanRaw = fs.readFileSync(full(policy.paths.source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourcePlan = JSON.parse(sourcePlanRaw);
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const { projection, ledgerRowsByPath } = buildExecution(
    policy,
    sourcePlan,
    sourceProjection,
    sourcePlanRaw,
    sourceProjectionRaw
  );

  fs.rmSync(full(policy.paths.ledger_root), { recursive: true, force: true });
  for (const [ledgerPath, rows] of Object.entries(ledgerRowsByPath)) writeJsonl(ledgerPath, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war lead execution Wave 24 built');
  console.log(
    '  packets / ledgers / acquisition rows: ' +
    projection.counts.source_packets + ' / ' +
    projection.counts.acquisition_ledgers + ' / ' +
    projection.counts.acquisition_rows
  );
  console.log('  dispositions: ' + JSON.stringify(projection.counts.acquisition_dispositions));
  console.log('  complete denominators / evidence / graph / publication: 0 / 0 / 0 / 0');
}
