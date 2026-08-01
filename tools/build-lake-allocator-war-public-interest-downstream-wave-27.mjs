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
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function graphDigests() {
  return {
    participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
    active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
    hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
    rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
    rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
  };
}

export function resultPathFor(sourceQueueRef, policy) {
  return policy.paths.result_root + '/' + sourceQueueRef.toLowerCase() + '.jsonl';
}

function planContent(task, policy) {
  const sourceRefs = policy.source_contract.institutional_source_refs;
  if (task.closure_ref === 'LAW25-LAW21-EST-05/C01') {
    return {
      closure_ref: task.closure_ref,
      result_state: policy.source_contract.result_state,
      source_refs: sourceRefs,
      coverage_statement: 'The exact institutional record set exposes formal federal categories and eligibility surfaces covering DEI, DEIA, environmental-justice programmes, federal employment and promotion criteria, contractors and subcontractors, grant and funding recipients, disparate-impact enforcement, and bounded correction controls. It does not expose the complete programme, office, entity, employee, beneficiary, or affected-person roster.',
      included_rows: [
        'DEI, DEIA, and environmental-justice programmes and initiatives named by EO 14151',
        'federal employment, promotion, and tenure criteria addressed by EO 14173 and the Foreign Service instruments',
        'federal contractors, subcontractors, grant recipients, and funding recipients addressed by the contracting and grant instruments',
        'disparate-impact enforcement categories addressed by EO 14281',
        'Ames and VMD as bounded correction controls'
      ],
      unavailable_rows: [
        'complete programme and office inventory with source-addressed dispositions',
        'complete contractor, subcontractor, grantee, funding-recipient, employee, beneficiary, and affected-person roster',
        'complete included, excluded, terminated, retained, appealed, corrected, and no-observed-effect rows'
      ],
      refused_rows: [
        'formal coverage language is not converted into an observed affected-row denominator',
        'named categories are not treated as a racial-order, prevalence, coordination, or common-purpose finding',
        'selected examples and correction controls are not substituted for the complete universe'
      ],
      negative_search_statement: 'The nine institutional records were checked for a complete category and affected-row ledger; they expose formal scope and selected controls, not the full roster required by the closure test.',
      correction_route: [
        'issuing agency programme, personnel, contracting, grant, and civil-rights offices',
        'FOIA or equivalent records request',
        'administrative, procurement, judicial, congressional, and inspector-general review'
      ],
      correction_outcome: 'formal_category_surface_recovered_complete_affected_roster_open'
    };
  }
  if (task.closure_ref === 'LAW25-LAW21-EST-05/C03') {
    return {
      closure_ref: task.closure_ref,
      result_state: policy.source_contract.result_state,
      source_refs: sourceRefs,
      coverage_statement: 'The exact institutional record set exposes formal consequence authority and two bounded correction controls: programme termination and inventory, personnel-criteria revision, compliance certification, records access, investigation, suspension, debarment, litigation exposure, disparate-impact enforcement deprioritization, judicial vacatur and remand, and procurement reevaluation. It does not expose the complete observed consequence, burden, collective-claim, appeal, remedy, or practical-correction ledger.',
      included_rows: [
        'programme termination and inventory authority under EO 14151',
        'employment, contracting, grant, and funding-recipient conditions under EO 14173',
        'disparate-impact enforcement deprioritization under EO 14281',
        'contractor certification, records, investigation, suspension, debarment, and litigation exposure under EO 14398',
        'Foreign Service promotion and tenure criteria revision',
        'Ames vacatur and remand as a judicial correction control',
        'VMD reevaluation recommendation as a procurement correction control'
      ],
      unavailable_rows: [
        'complete implementation, investigation, enforcement, personnel, appeal, litigation, settlement, remand, and remedy rows',
        'complete affected-person, contractor, grantee, beneficiary, burden, collective-claim, and no-observed-effect denominator',
        'practical correction timing, cost, access, recurrence, substitution, exit, and recovery outcomes'
      ],
      refused_rows: [
        'formal consequence authority is not treated as observed use against every covered actor',
        'two bounded correction controls are not treated as system-wide remedy adequacy',
        'consequence architecture is not converted into motive, racial order, prevalence, coordination, or common purpose'
      ],
      negative_search_statement: 'The nine institutional records were checked for observed consequences and practical correction; they expose formal powers and two bounded controls, not the complete longitudinal outcome ledger required by the closure test.',
      correction_route: [
        'agency appeal, grievance, contracting, grant, and civil-rights processes',
        'GAO and judicial review',
        'congressional oversight, inspector-general review, substitution, exit, and public-value recovery'
      ],
      correction_outcome: 'formal_consequence_and_bounded_controls_recovered_practical_outcomes_open'
    };
  }
  throw new Error(task.closure_ref + ': unexpected Wave 27 eligible task');
}

export function buildWave27(
  policy,
  wave26Projection,
  repairProjection,
  wave26Plan,
  publicRows,
  legislativeRows,
  rawInputs
) {
  if (!same(repairProjection.public_interest_gate.source_refs, policy.source_contract.institutional_source_refs)) {
    throw new Error('Wave 27 institutional source custody differs from repaired Wave 26');
  }
  if (repairProjection.public_interest_gate.prohibited_source_refs_present.length !== 0) {
    throw new Error('Wave 27 public-interest gate retains prohibited research source');
  }
  const publicGate = publicRows.find(row => row.closure_ref === policy.source_contract.public_interest_gate_ref);
  if (!publicGate || publicGate.result_state !== 'complete') throw new Error('Wave 27 public-interest gate prerequisite absent');
  if (!same(publicGate.source_refs, policy.source_contract.institutional_source_refs)) throw new Error('Wave 27 public-interest gate ledger custody drift');

  const eligible = publicRows
    .filter(row => policy.source_contract.public_interest_eligible_refs.includes(row.closure_ref))
    .sort((a, b) => a.closure_sequence - b.closure_sequence);
  const blocked = legislativeRows
    .filter(row => policy.source_contract.legislative_blocked_refs.includes(row.closure_ref))
    .sort((a, b) => a.closure_sequence - b.closure_sequence);
  if (eligible.length !== policy.expected_counts.eligible_tasks) throw new Error('Wave 27 eligible task denominator drift');
  if (blocked.length !== policy.expected_counts.preserved_blocked_tasks) throw new Error('Wave 27 blocked task denominator drift');
  if (eligible.some(row => row.execution_state !== policy.source_contract.eligible_source_state || row.executed_in_wave !== false || row.result_state !== null)) {
    throw new Error('Wave 27 eligible source state drift');
  }
  if (blocked.some(row => row.execution_state !== policy.source_contract.blocked_source_state || row.executed_in_wave !== false || row.result_state !== null)) {
    throw new Error('Wave 27 blocked source state drift');
  }

  const sourceByRef = new Map(wave26Plan.source_registry.map(row => [row.source_ref, row]));
  const sourceRegistry = policy.source_contract.institutional_source_refs.map(sourceRef => {
    const row = sourceByRef.get(sourceRef);
    if (!row) throw new Error(sourceRef + ': Wave 27 inherited source absent');
    return row;
  });
  const taskPlans = eligible.map(task => planContent(task, policy));
  const executionPlan = {
    schema_version: 'lake-allocator-war-public-interest-downstream-wave-27-source-plan@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    purpose: 'Bind exactly the two Wave 26 public-interest tasks marked unblocked for a later wave to the repaired nine-source institutional chain, while assigning no plan to the two legislative and political-finance tasks blocked after no qualifying gate.',
    source_registry: sourceRegistry,
    task_plans: taskPlans,
    preserved_blocked_refs: blocked.map(row => row.closure_ref),
    counts: {
      source_receipts: sourceRegistry.length,
      source_receipt_uses: taskPlans.reduce((sum, row) => sum + row.source_refs.length, 0),
      eligible_task_plans: taskPlans.length,
      blocked_tasks_without_plans: blocked.length,
      partial_results: taskPlans.filter(row => row.result_state === 'partial').length,
      complete_denominators: 0,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    boundaries: policy.boundaries
  };

  const publicResults = eligible.map(task => {
    const plan = taskPlans.find(row => row.closure_ref === task.closure_ref);
    return {
      schema_version: 'lake-allocator-war-public-interest-downstream-result-wave-27@1',
      row_type: 'downstream_execution_result',
      closure_ref: task.closure_ref,
      closure_sequence: task.closure_sequence,
      queue_ref: 'LAW27-LAW21-EST-05',
      queue_sequence: 5,
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
      execution_state: policy.source_contract.executed_state,
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
  });
  const blockedResults = blocked.map(task => ({
    schema_version: 'lake-allocator-war-public-interest-downstream-result-wave-27@1',
    row_type: 'downstream_execution_result',
    closure_ref: task.closure_ref,
    closure_sequence: task.closure_sequence,
    queue_ref: 'LAW27-LAW21-EST-11',
    queue_sequence: 11,
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
    execution_state: policy.source_contract.preserved_blocked_state,
    transition_reason: task.transition_reason,
    executed_in_wave: false,
    result_state: null,
    source_refs: [],
    source_receipt_count: 0,
    coverage_statement: 'Wave 26 blocked-no-qualifying-gate task preserved; Wave 27 assigns no plan and executes no search.',
    included_rows: [],
    unavailable_rows: task.unavailable_rows,
    refused_rows: [
      ...task.refused_rows,
      'Wave 27 public-interest execution does not reopen the legislative and political-finance gate search',
      'blocked work receives no synthetic source result or downstream inference'
    ],
    negative_search_statement: task.negative_search_statement,
    correction_route: [],
    correction_outcome: policy.source_contract.preserved_blocked_state,
    complete_denominator: false,
    evidence_adjudicated: false,
    evidence_rows: 0,
    blocked_promotions: policy.blocked_promotions,
    finding_promoted: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  }));

  const publicSummary = {
    schema_version: 'lake-allocator-war-public-interest-downstream-queue-wave-27@1',
    row_type: 'downstream_execution_queue',
    queue_ref: 'LAW27-LAW21-EST-05',
    queue_sequence: 5,
    source_queue_ref: 'LAW21-EST-05',
    consumer_key: 'public-interest-crossing-estate',
    source_candidate_rows: eligible.length,
    executed_task_count: publicResults.length,
    preserved_blocked_task_count: 0,
    result_states: { partial: publicResults.length },
    source_receipt_uses: publicResults.reduce((sum, row) => sum + row.source_receipt_count, 0),
    complete_denominators: 0,
    evidence_adjudicated: false,
    evidence_rows: 0,
    blocked_promotions: policy.blocked_promotions,
    finding_promoted: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
  const legislativeSummary = {
    schema_version: 'lake-allocator-war-public-interest-downstream-queue-wave-27@1',
    row_type: 'downstream_execution_queue',
    queue_ref: 'LAW27-LAW21-EST-11',
    queue_sequence: 11,
    source_queue_ref: 'LAW21-EST-11',
    consumer_key: 'us-legislative-political-finance-estate',
    source_candidate_rows: blocked.length,
    executed_task_count: 0,
    preserved_blocked_task_count: blockedResults.length,
    result_states: {},
    downstream_states: { preserved_blocked_no_qualifying_gate: blockedResults.length },
    source_receipt_uses: 0,
    complete_denominators: 0,
    evidence_adjudicated: false,
    evidence_rows: 0,
    blocked_promotions: policy.blocked_promotions,
    finding_promoted: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  };

  const resultRowsByPath = {
    [resultPathFor('LAW21-EST-05', policy)]: [publicSummary, ...publicResults],
    [resultPathFor('LAW21-EST-11', policy)]: [legislativeSummary, ...blockedResults]
  };
  const queueViews = Object.entries(resultRowsByPath).map(([resultPath, rows]) => {
    const summary = rows[0];
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    return {
      queue_ref: summary.queue_ref,
      queue_sequence: summary.queue_sequence,
      source_queue_ref: summary.source_queue_ref,
      consumer_key: summary.consumer_key,
      source_candidate_rows: summary.source_candidate_rows,
      executed_task_count: summary.executed_task_count,
      preserved_blocked_task_count: summary.preserved_blocked_task_count,
      result_states: summary.result_states,
      downstream_states: summary.downstream_states ?? {},
      source_receipt_uses: summary.source_receipt_uses,
      result_path: resultPath,
      result_rows: rows.length,
      result_sha256: digestBytes(raw),
      evidence_adjudicated: false,
      evidence_rows: 0,
      finding_promoted: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    };
  }).sort((a, b) => a.queue_sequence - b.queue_sequence);

  const projection = {
    schema_version: 'lake-allocator-war-public-interest-downstream-wave-27@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json',
      source_wave26_projection_path: policy.paths.source_wave26_projection,
      source_wave26_projection_bytes: Buffer.byteLength(rawInputs.wave26ProjectionRaw),
      source_wave26_projection_sha256: digestBytes(rawInputs.wave26ProjectionRaw),
      source_repair_projection_path: policy.paths.source_repair_projection,
      source_repair_projection_bytes: Buffer.byteLength(rawInputs.repairProjectionRaw),
      source_repair_projection_sha256: digestBytes(rawInputs.repairProjectionRaw),
      source_wave26_plan_path: policy.paths.source_wave26_plan,
      source_wave26_plan_bytes: Buffer.byteLength(rawInputs.wave26PlanRaw),
      source_wave26_plan_sha256: digestBytes(rawInputs.wave26PlanRaw),
      execution_plan_path: policy.paths.execution_plan
    },
    counts: {
      source_queues: 2,
      source_candidate_rows: eligible.length + blocked.length,
      eligible_tasks: eligible.length,
      preserved_blocked_tasks: blocked.length,
      execution_plans: taskPlans.length,
      source_receipts: sourceRegistry.length,
      source_receipt_uses: taskPlans.reduce((sum, row) => sum + row.source_refs.length, 0),
      execution_ledgers: queueViews.length,
      queue_summary_rows: 2,
      execution_result_rows: publicResults.length + blockedResults.length,
      execution_rows: Object.values(resultRowsByPath).flat().length,
      executed_tasks: publicResults.length,
      partial_results: publicResults.filter(row => row.result_state === 'partial').length,
      blocked_results: blockedResults.length,
      complete_denominators: 0,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: graphDigests(),
    queues: queueViews,
    boundaries: policy.boundaries
  };
  return { executionPlan, projection, resultRowsByPath };
}

export function renderReport(projection) {
  return [
    '# Allocator-war public-interest downstream execution Wave 27',
    '',
    '```text',
    'source queues:                         ' + projection.counts.source_queues,
    'source candidate rows:                 ' + projection.counts.source_candidate_rows,
    'eligible tasks executed:               ' + projection.counts.executed_tasks,
    'legislative-finance tasks preserved:   ' + projection.counts.preserved_blocked_tasks,
    'execution plans:                       ' + projection.counts.execution_plans,
    'source receipts / uses:                ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses,
    'execution ledgers / rows:              ' + projection.counts.execution_ledgers + ' / ' + projection.counts.execution_rows,
    'partial results:                       ' + projection.counts.partial_results,
    'complete denominators:                 0',
    'evidence rows:                         0',
    'finding promotions:                    0',
    'graph effects:                         0',
    'publication clearances:                0',
    '```',
    '',
    'Wave 27 executes only the two public-interest rows that Wave 26 marked unblocked after exact institutional-gate identification. The first recovers formal category and eligibility surfaces without a complete affected roster. The second recovers formal consequence authority and two bounded correction controls without the complete observed consequence and practical-remedy ledger.',
    '',
    'The two legislative and political-finance tasks remain blocked after the bounded no-qualifying-gate result. They receive no Wave 27 plan, source references, or synthetic result. No Wave 27 row is evidence adjudication or finding promotion.',
    ''
  ].join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json');
  const wave26ProjectionRaw = fs.readFileSync(full(policy.paths.source_wave26_projection), 'utf8');
  const repairProjectionRaw = fs.readFileSync(full(policy.paths.source_repair_projection), 'utf8');
  const wave26PlanRaw = fs.readFileSync(full(policy.paths.source_wave26_plan), 'utf8');
  const { executionPlan, projection, resultRowsByPath } = buildWave27(
    policy,
    JSON.parse(wave26ProjectionRaw),
    JSON.parse(repairProjectionRaw),
    JSON.parse(wave26PlanRaw),
    readJsonl(policy.paths.source_public_ledger),
    readJsonl(policy.paths.source_legislative_ledger),
    { wave26ProjectionRaw, repairProjectionRaw, wave26PlanRaw }
  );
  fs.rmSync(full(policy.paths.result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(policy.paths.execution_plan, executionPlan);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war public-interest downstream Wave 27 built');
  console.log('  eligible / executed / blocked: ' + projection.counts.eligible_tasks + ' / ' + projection.counts.executed_tasks + ' / ' + projection.counts.preserved_blocked_tasks);
  console.log('  source receipts / uses: ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses);
  console.log('  partial / complete denominators: ' + projection.counts.partial_results + ' / 0');
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
