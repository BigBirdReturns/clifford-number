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
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

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

function resultCounts(plan) {
  const rows = plan.task_plans;
  return Object.fromEntries(
    [...new Set(rows.map(row => row.result_state))]
      .sort()
      .map(state => [state, rows.filter(row => row.result_state === state).length])
  );
}

export function buildRepairReceipt(policy, sourcePlan, sourceProjection, publicRows, legislativeRows, sourcePlanRaw, sourceProjectionRaw) {
  const publicGate = sourcePlan.task_plans.find(row => row.closure_ref === policy.public_interest_gate.closure_ref);
  const legislativeGate = sourcePlan.task_plans.find(row => row.closure_ref === policy.legislative_no_gate.closure_ref);
  if (!publicGate) throw new Error('public-interest gate plan absent');
  if (!legislativeGate) throw new Error('legislative no-gate plan absent');
  if (!same(publicGate.source_refs, policy.public_interest_gate.required_source_refs)) {
    throw new Error('public-interest gate source custody differs from repair policy');
  }
  if (publicGate.source_refs.some(ref => policy.public_interest_gate.prohibited_source_refs.includes(ref))) {
    throw new Error('research source retained on public-interest institutional gate');
  }
  if (!same(legislativeGate.source_refs, policy.legislative_no_gate.required_source_refs)) {
    throw new Error('legislative no-gate source custody differs from repair policy');
  }

  const publicResult = publicRows.find(row => row.closure_ref === policy.public_interest_gate.closure_ref);
  const legislativeResult = legislativeRows.find(row => row.closure_ref === policy.legislative_no_gate.closure_ref);
  if (!publicResult || publicResult.result_state !== policy.public_interest_gate.result_state) {
    throw new Error('public-interest gate result state drift');
  }
  if (!legislativeResult || legislativeResult.result_state !== policy.legislative_no_gate.result_state) {
    throw new Error('legislative no-gate result state drift');
  }
  if (!same(publicResult.source_refs, policy.public_interest_gate.required_source_refs)) {
    throw new Error('public-interest result ledger source custody drift');
  }
  if (!same(legislativeResult.source_refs, policy.legislative_no_gate.required_source_refs)) {
    throw new Error('legislative result ledger source custody drift');
  }

  const publicDownstream = publicRows.filter(row =>
    row.row_type === 'closure_execution_result' &&
    row.execution_state === policy.public_interest_gate.expected_downstream_state
  );
  const legislativeDownstream = legislativeRows.filter(row =>
    row.row_type === 'closure_execution_result' &&
    row.execution_state === policy.legislative_no_gate.expected_downstream_state
  );
  if (publicDownstream.length !== policy.public_interest_gate.expected_downstream_tasks) {
    throw new Error('public-interest downstream denominator drift');
  }
  if (legislativeDownstream.length !== policy.legislative_no_gate.expected_downstream_tasks) {
    throw new Error('legislative downstream denominator drift');
  }

  const sources = new Map(sourcePlan.source_registry.map(row => [row.source_ref, row]));
  const sourceView = refs => refs.map(ref => {
    const row = sources.get(ref);
    if (!row) throw new Error(ref + ': source registry row absent');
    return {
      source_ref: ref,
      title: row.title,
      issuing_body: row.issuing_body,
      source_type: row.source_type,
      jurisdiction: row.jurisdiction,
      stable_identifier: row.stable_identifier,
      retrieval_status: row.retrieval_status,
      source_bytes_preserved: row.source_bytes_preserved
    };
  });

  const counts = resultCounts(sourcePlan);
  return {
    schema_version: 'lake-allocator-war-wave26-source-custody-repair@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json',
      source_plan_path: policy.paths.wave26_source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw),
      source_projection_path: policy.paths.wave26_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      public_interest_ledger_path: policy.paths.public_interest_ledger,
      legislative_finance_ledger_path: policy.paths.legislative_finance_ledger
    },
    counts: {
      source_tasks: sourcePlan.counts.source_tasks,
      ready_task_plans: sourcePlan.counts.ready_task_plans,
      blocked_tasks_without_plans: sourcePlan.counts.blocked_tasks_without_plans,
      result_states: counts,
      public_interest_gate_sources: publicGate.source_refs.length,
      legislative_no_gate_sources: legislativeGate.source_refs.length,
      public_interest_unblocked_tasks: publicDownstream.length,
      legislative_blocked_tasks: legislativeDownstream.length,
      complete_denominators: sourceProjection.counts.complete_denominators,
      evidence_rows: sourceProjection.counts.evidence_rows,
      finding_promotions: sourceProjection.counts.finding_promotions,
      graph_effects: sourceProjection.counts.graph_effects,
      publication_clearances: sourceProjection.counts.publication_clearances
    },
    public_interest_gate: {
      closure_ref: publicGate.closure_ref,
      result_state: publicGate.result_state,
      source_refs: publicGate.source_refs,
      sources: sourceView(publicGate.source_refs),
      prohibited_source_refs_present: publicGate.source_refs.filter(ref =>
        policy.public_interest_gate.prohibited_source_refs.includes(ref)
      ),
      downstream_refs: publicDownstream.map(row => row.closure_ref).sort(),
      downstream_state: policy.public_interest_gate.expected_downstream_state,
      complete_denominator: publicResult.complete_denominator,
      evidence_adjudicated: publicResult.evidence_adjudicated,
      finding_promoted: publicResult.finding_promoted,
      graph_effect: publicResult.graph_effect,
      publication_status: publicResult.publication_status
    },
    legislative_no_gate: {
      closure_ref: legislativeGate.closure_ref,
      result_state: legislativeGate.result_state,
      source_refs: legislativeGate.source_refs,
      sources: sourceView(legislativeGate.source_refs),
      downstream_refs: legislativeDownstream.map(row => row.closure_ref).sort(),
      downstream_state: policy.legislative_no_gate.expected_downstream_state,
      complete_denominator: legislativeResult.complete_denominator,
      evidence_adjudicated: legislativeResult.evidence_adjudicated,
      finding_promoted: legislativeResult.finding_promoted,
      graph_effect: legislativeResult.graph_effect,
      publication_status: legislativeResult.publication_status
    },
    graph_digests: graphDigests(),
    boundaries: policy.boundaries
  };
}

export function renderReport(receipt) {
  return [
    '# Allocator-war Wave 26 source-custody repair',
    '',
    '```text',
    'public-interest gate sources:       ' + receipt.counts.public_interest_gate_sources,
    'legislative no-gate sources:        ' + receipt.counts.legislative_no_gate_sources,
    'public-interest tasks unblocked:    ' + receipt.counts.public_interest_unblocked_tasks,
    'legislative-finance tasks blocked:  ' + receipt.counts.legislative_blocked_tasks,
    'complete denominators:              ' + receipt.counts.complete_denominators,
    'evidence rows:                      ' + receipt.counts.evidence_rows,
    'finding promotions:                 ' + receipt.counts.finding_promotions,
    'graph effects:                      ' + receipt.counts.graph_effects,
    'publication clearances:             ' + receipt.counts.publication_clearances,
    '```',
    '',
    'The completed public-interest gate now cites only the nine executive, Foreign Service, judicial, and procurement-control records that establish the bounded institutional selector. The three status, hierarchy, and electorate research sources are prohibited from serving as gate evidence and remain confined to the separate legislative and political-finance no-gate search.',
    '',
    'The repair changes source custody, source-use counts, generated hashes, and lake projections. It does not change either gate result, execute downstream work, close a denominator, adjudicate evidence, create a finding, alter the graph, or clear publication.',
    ''
  ].join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-wave26-source-custody-repair-policy.json');
  const sourcePlanRaw = fs.readFileSync(full(policy.paths.wave26_source_plan), 'utf8');
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.wave26_projection), 'utf8');
  const receipt = buildRepairReceipt(
    policy,
    JSON.parse(sourcePlanRaw),
    JSON.parse(sourceProjectionRaw),
    readJsonl(policy.paths.public_interest_ledger),
    readJsonl(policy.paths.legislative_finance_ledger),
    sourcePlanRaw,
    sourceProjectionRaw
  );
  writeJson(policy.paths.projection, receipt);
  writeText(policy.paths.report, renderReport(receipt));
  return receipt;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const receipt = runBuild();
  console.log('allocator-war Wave 26 source-custody repair built');
  console.log('  public-interest / legislative sources: ' + receipt.counts.public_interest_gate_sources + ' / ' + receipt.counts.legislative_no_gate_sources);
  console.log('  downstream unblocked / blocked: ' + receipt.counts.public_interest_unblocked_tasks + ' / ' + receipt.counts.legislative_blocked_tasks);
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
