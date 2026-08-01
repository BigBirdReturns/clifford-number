#!/usr/bin/env node
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
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const unavailableRefs = new Set([
  'LAW25-LAW21-EST-01/C02',
  'LAW25-LAW21-EST-01/C03',
  'LAW25-LAW21-EST-01/C04',
  'LAW25-LAW21-EST-02/C01',
  'LAW25-LAW21-EST-02/C02',
  'LAW25-LAW21-EST-02/C03',
  'LAW25-LAW21-EST-03/C03',
  'LAW25-LAW21-EST-06/C04'
]);
const completeGateRef = 'LAW25-LAW21-EST-05/C02';
const noGateRef = 'LAW25-LAW21-EST-11/C02';
const publicInterestGateSourceRefs = [
  'LAW24-S012',
  'LAW24-S013',
  'LAW24-S014',
  'LAW24-S015',
  'LAW24-S019',
  'LAW24-S020',
  'LAW24-S021',
  'LAW24-S022',
  'LAW24-S023'
];
const legislativeNoGateSourceRefs = [
  'LAW24-S016',
  'LAW24-S017',
  'LAW24-S018',
  'LAW24-S028'
];

function resultStateFor(task) {
  if (task.closure_ref === completeGateRef) return 'complete';
  if (task.closure_ref === noGateRef) return 'no_qualifying_gate';
  if (unavailableRefs.has(task.closure_ref)) return 'unavailable_after_search';
  return 'partial';
}

function correctionRoute(task) {
  if (task.task_class === 'gate_identification') {
    return [
      'issuing institution records and implementation offices',
      'administrative, judicial, legislative, or electoral correction appropriate to the identified gate'
    ];
  }
  if (task.task_class === 'denominator_closure') {
    return [
      'issuing programme or decision office',
      'FOIA or equivalent records request',
      'independent audit, adjudication, or oversight'
    ];
  }
  if (task.task_class === 'instrument_rights_recovery') {
    return [
      'contracting, lending, grant, personnel, or programme office',
      'FOIA or equivalent instrument request',
      'inspector-general, audit, protest, or judicial review'
    ];
  }
  if (task.task_class === 'entity_resolution') {
    return [
      'official corporate and programme registries',
      'publisher, fund, award, or contracting-office correction'
    ];
  }
  return [
    'agency appeal, grievance, protest, or correction process',
    'judicial review',
    'audit, oversight, substitution, exit, or public-value recovery'
  ];
}

function planFor(task) {
  const resultState = resultStateFor(task);
  if (resultState === 'complete') {
    return {
      closure_ref: task.closure_ref,
      result_state: resultState,
      source_refs: publicInterestGateSourceRefs,
      coverage_statement: 'The exact executive, Foreign Service, judicial, and procurement-control records identify a bounded selector spanning federal employment, programme administration, contracting, grants, funding recipients, civil-rights enforcement, and formal correction routes. This completes only institutional-gate identification; the affected-row and consequence denominators remain open.',
      included_rows: [
        'EO 14151 programme termination and inventory surface',
        'EO 14173 federal employment, contracting, grant, and funding-recipient conditions',
        'EO 14281 disparate-impact enforcement reclassification',
        'EO 14398 contractor compliance, records, suspension, debarment, and litigation surface',
        'Foreign Service promotion and tenure criteria and operative personnel manual',
        'Ames judicial correction control and docket',
        'VMD procurement correction control'
      ],
      unavailable_rows: [
        'complete programme, office, contractor, grantee, employee, beneficiary, enforcement, and remedy rosters',
        'complete observed consequence and correction denominator'
      ],
      refused_rows: [
        'status, hierarchy, demographic, and electorate research is not used to establish this institutional gate',
        'gate identification is not treated as a complete deservingness denominator',
        'formal authority is not treated as proof of use, motive, prevalence, racial order, coordination, or remedy adequacy'
      ],
      negative_search_statement: 'The exact institutional records identify the bounded federal gate, but do not expose the complete affected-row, burden, consequence, appeal, and remedy denominator.',
      correction_route: correctionRoute(task),
      correction_outcome: 'bounded_institutional_gate_identified_downstream_denominators_open'
    };
  }
  if (resultState === 'no_qualifying_gate') {
    return {
      closure_ref: task.closure_ref,
      result_state: resultState,
      source_refs: legislativeNoGateSourceRefs,
      coverage_statement: 'The bounded status, hierarchy, demographic, representation, and public-record source set did not identify a source-complete legislative or political-finance selector with an executed decision instrument, affected rows, material consequence, and correction chain.',
      included_rows: [
        'bounded status and hierarchy research',
        'electorate and representation records',
        'public legislative and political context contained in the inherited source set'
      ],
      unavailable_rows: [
        'executed legislative or political-finance selector instrument',
        'complete decision roster, authority, veto, budget, burden, outcome, and correction denominator'
      ],
      refused_rows: [
        'voter composition is not converted into an institutional gate',
        'attitude association is not converted into individual motive, allocation, racial order, coordination, or common purpose',
        'a bounded negative result does not prove that no future qualifying gate can be identified'
      ],
      negative_search_statement: 'Within the declared source and time boundary, no qualifying executed legislative or political-finance gate was identified.',
      correction_route: correctionRoute(task),
      correction_outcome: 'bounded_search_terminated_no_qualifying_gate'
    };
  }
  if (resultState === 'unavailable_after_search') {
    return {
      closure_ref: task.closure_ref,
      result_state: resultState,
      source_refs: task.source_refs,
      coverage_statement: 'The inherited official and first-party record set was searched for ' + task.closure_target + ', but exposed only announcements, summaries, selected rows, aggregate counts, or litigated fragments rather than the requested operative record.',
      included_rows: [
        'source-addressed public announcements, summaries, selected rows, aggregate counts, or litigated fragments relevant to the target'
      ],
      unavailable_rows: [
        task.closure_target,
        'complete contrary, excluded, failed, appealed, substituted, corrected, and recovery rows required by the closure test'
      ],
      refused_rows: [
        'a public announcement or summary is not substituted for the missing operative record',
        'unavailable after search is not encoded as null, complete, contradiction, or proof of secrecy or misconduct'
      ],
      negative_search_statement: 'No source-addressed public record satisfying the exact target was exposed within the bounded inherited source set.',
      correction_route: correctionRoute(task),
      correction_outcome: 'unavailable_after_bounded_search'
    };
  }
  return {
    closure_ref: task.closure_ref,
    result_state: resultState,
    source_refs: task.source_refs,
    coverage_statement: 'The inherited official, judicial, programme, ranking, personnel, regulatory, or research records expose bounded rows relevant to ' + task.closure_target + ', but they do not satisfy the complete closure test.',
    included_rows: [
      'source-addressed selected, aggregate, formal, litigated, or correction rows relevant to the target',
      'explicit limits, negative findings, and known correction routes retained from the inherited record'
    ],
    unavailable_rows: [
      task.closure_target + ' as a complete source-addressed ledger',
      'complete excluded, rejected, failed, nonselected, appealed, corrected, substituted, exited, and recovered rows where applicable'
    ],
    refused_rows: [
      'partial recovery is not treated as complete',
      'selected or aggregate rows are not treated as the full option or affected universe',
      'shared sources and recurrence do not establish relationship, prevalence, coordination, or common purpose'
    ],
    negative_search_statement: 'The bounded inherited source set did not expose every row required by the declared closure test for ' + task.closure_target + '.',
    correction_route: correctionRoute(task),
    correction_outcome: 'partial_recovery_target_remains_open'
  };
}

export function buildSourcePlan() {
  const wave26Policy = readJson('data/project/lake-allocator-war-targeted-closure-wave-26-policy.json');
  const wave25 = readJson(wave26Policy.paths.source_projection);
  const wave24 = readJson('data/project/lake-allocator-war-lead-execution-wave-24-source-plan.json');
  const sourceByRef = new Map(wave24.source_registry.map(row => [row.id ?? row.source_ref, row]));

  const tasks = [];
  for (const queue of wave25.queues.slice().sort((a, b) => a.queue_sequence - b.queue_sequence)) {
    const rows = readJsonl(queue.queue_path);
    tasks.push(...rows
      .filter(row => row.row_type === 'closure_task')
      .sort((a, b) => a.closure_sequence - b.closure_sequence));
  }
  const ready = tasks.filter(row => row.execution_state === 'ready_for_targeted_acquisition');
  const blocked = tasks.filter(row => row.execution_state === 'blocked_pending_gate_identification');
  if (tasks.length !== 40 || ready.length !== 36 || blocked.length !== 4) {
    throw new Error('Wave 25 task denominator drift while building Wave 26 source plan');
  }

  const taskPlans = ready.map(planFor);
  const publicInterestGate = taskPlans.find(row => row.closure_ref === completeGateRef);
  const legislativeNoGate = taskPlans.find(row => row.closure_ref === noGateRef);
  if (!publicInterestGate || !same(publicInterestGate.source_refs, publicInterestGateSourceRefs)) {
    throw new Error('Wave 26 public-interest gate source custody drift');
  }
  if (!legislativeNoGate || !same(legislativeNoGate.source_refs, legislativeNoGateSourceRefs)) {
    throw new Error('Wave 26 legislative no-gate source custody drift');
  }

  const usedSourceRefs = [...new Set(taskPlans.flatMap(row => row.source_refs))].sort();
  const sourceRegistry = usedSourceRefs.map(sourceRef => {
    const prior = sourceByRef.get(sourceRef);
    if (!prior) throw new Error(sourceRef + ': inherited Wave 24 source absent');
    return {
      source_ref: sourceRef,
      inherited_source_ref: sourceRef,
      title: prior.title,
      source_locator: prior.source_locator,
      resolved_locator: prior.resolved_locator ?? prior.source_locator,
      stable_identifier: prior.stable_identifier,
      issuing_body: prior.issuing_body,
      source_type: prior.source_type,
      jurisdiction: prior.jurisdiction,
      issued_at: prior.issued_at,
      retrieved_at: prior.retrieved_at,
      retrieval_status: prior.retrieval_status,
      custody_refs: prior.custody_refs ?? [],
      source_bytes_preserved: false
    };
  });

  const resultStates = countBy(taskPlans, 'result_state');
  const expectedStates = {
    complete: 1,
    no_qualifying_gate: 1,
    partial: 26,
    unavailable_after_search: 8
  };
  if (!same(resultStates, expectedStates)) {
    throw new Error('Wave 26 result-state denominator drift: ' + JSON.stringify(resultStates));
  }

  return {
    schema_version: 'lake-allocator-war-targeted-closure-wave-26-source-plan@1',
    program_ref: wave26Policy.program_ref,
    wave_ref: wave26Policy.wave_ref,
    as_of: wave26Policy.as_of,
    purpose: 'Bind every Wave 25 ready closure task to exact inherited source-addressed receipts and a bounded acquisition outcome while preserving all four blocked tasks outside the execution plan. The public-interest institutional gate uses only the executive, Foreign Service, judicial, and procurement-control records that establish that gate; research sources remain confined to the separate legislative no-gate search.',
    source_registry: sourceRegistry,
    task_plans: taskPlans,
    counts: {
      source_receipts: sourceRegistry.length,
      source_receipt_uses: taskPlans.reduce((sum, row) => sum + row.source_refs.length, 0),
      source_tasks: tasks.length,
      ready_task_plans: taskPlans.length,
      blocked_tasks_without_plans: blocked.length,
      result_states: resultStates,
      evidence_rows: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    custody_contract: {
      public_interest_gate_ref: completeGateRef,
      public_interest_gate_source_refs: publicInterestGateSourceRefs,
      legislative_no_gate_ref: noGateRef,
      legislative_no_gate_source_refs: legislativeNoGateSourceRefs,
      research_sources_establish_public_interest_gate: false
    },
    boundaries: wave26Policy.boundaries
  };
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-targeted-closure-wave-26-policy.json');
  const plan = buildSourcePlan();
  writeJson(policy.paths.source_plan, plan);
  return plan;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const plan = runBuild();
  console.log('allocator-war targeted closure Wave 26 source plan built');
  console.log('  source receipts / uses: ' + plan.counts.source_receipts + ' / ' + plan.counts.source_receipt_uses);
  console.log('  ready plans / blocked tasks: ' + plan.counts.ready_task_plans + ' / ' + plan.counts.blocked_tasks_without_plans);
  console.log('  result states: ' + JSON.stringify(plan.counts.result_states));
  console.log('  evidence / findings / graph / publication: 0 / 0 / 0 / 0');
}
