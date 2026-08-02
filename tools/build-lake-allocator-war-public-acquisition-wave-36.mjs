#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json';
const PLAN_PATH = 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readJsonl = (root, relative) => fs.readFileSync(path.join(root, relative), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = (root, relative, value) => {
  const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeJsonl = (root, relative, rows) => {
  const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};
const writeText = (root, relative, text) => {
  const target = path.join(root, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text.endsWith('\n') ? text : `${text}\n`);
};
const countBy = (rows, key) => Object.fromEntries([...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]));
const routeOutput = route => `${route}.jsonl`;
const ROUTE_ORDER = [
  'internal-authority-and-inventory',
  'public-award-and-contract-denominators',
  'published-enforcement-and-action-registers',
  'correction-dockets-and-outcomes',
  'protected-personnel-records',
  'affected-comparator-and-distributional-joins',
  'financial-recovery-and-continuity'
];

function loadWave35Tasks(root, policy, projection) {
  if (projection.schema_version !== 'lake-allocator-war-join-requirements-wave-35@1') throw new Error('Wave 35 projection schema mismatch');
  const files = fs.readdirSync(path.join(root, policy.paths.source_task_root)).filter(name => name.endsWith('.jsonl')).sort();
  const tasks = files.flatMap(name => readJsonl(root, `${policy.paths.source_task_root}/${name}`)).filter(row => row.row_type === 'lawful_join_requirement_acquisition_task');
  if (tasks.length !== 31) throw new Error(`Wave 35 task denominator mismatch: ${tasks.length}`);
  const projectionRefs = new Set(projection.tasks.map(row => row.task_ref));
  for (const task of tasks) if (!projectionRefs.has(task.task_ref)) throw new Error(`${task.task_ref}: absent from Wave 35 projection`);
  return tasks.sort((a, b) => a.task_sequence - b.task_sequence);
}

function captureUsable(row) {
  return Boolean(row.response_ok && row.response_body_path && row.response_body_sha256 && row.marker_audit?.passed && !['captured_marker_mismatch','response_refused_too_large'].includes(row.capture_state));
}

function makeRecord(policy, spec, capture, taskRefs, sequence) {
  const relay = capture.transport_mode === 'transparent_text_relay_of_official_pdf';
  return {
    schema_version: 'lake-allocator-war-institutional-record-wave-36@1', row_type: 'source_backed_institutional_component',
    program_ref: policy.program_ref, wave_ref: policy.wave_ref, record_ref: `LAW36-R${String(sequence).padStart(3, '0')}`,
    record_sequence: sequence, capture_ref: capture.capture_ref, source_ref: spec.source_ref, inherited_source_ref: spec.inherited_source_ref,
    stable_identifier: spec.stable_identifier, title: spec.title, publisher: spec.publisher, source_type: spec.source_type,
    action_class: spec.action_class, jurisdiction: spec.jurisdiction, issued_at: spec.issued_at, source_locator: spec.source_locator,
    official_origin_url: capture.official_origin_url, transport_mode: capture.transport_mode, transport_locator: capture.transport_locator,
    response_final_url: capture.response_final_url, response_status: capture.response_status, response_body_path: capture.response_body_path,
    response_body_bytes: capture.response_body_bytes, response_body_sha256: capture.response_body_sha256, observed_format: capture.observed_format,
    marker_audit: capture.marker_audit, represented_value: spec.represented_value, task_refs: taskRefs,
    component_state: relay ? 'captured_source_backed_official_record_text_render' : 'captured_source_backed_official_record',
    component_authority: relay ? 'official_record_text_render_component_acquisition_only' : 'official_record_component_acquisition_only',
    requirement_satisfied: false, authorized_join: false, joined_rows: 0, complete_denominator: false, evidence_adjudicated: false,
    evidence_rows: 0, estate_adopted: false, finding_promoted: false, graph_effect: 'none', publication_status: 'blocked'
  };
}

function renderReport(policy, plan, captures, records, taskResults, routeSummaries) {
  const counts = {
    source_specs: plan.source_specs.length,
    captures: captures.length,
    response_files: captures.filter(row => row.response_body_path).length,
    usable_official_records: records.length,
    transparent_text_relay_sources: captures.filter(row => row.transport_mode === 'transparent_text_relay_of_official_pdf').length,
    capture_states: countBy(captures, 'capture_state'),
    route_summaries: routeSummaries.length,
    task_results: taskResults.length,
    result_states: countBy(taskResults, 'result_state'),
    executed_public_or_lawful_tasks: taskResults.filter(row => row.executed_in_wave).length,
    protected_tasks: taskResults.filter(row => row.protected_lawful_access_only).length,
    requirements_satisfied: 0,
    authorized_joins: 0,
    complete_denominators: 0,
    evidence_rows: 0,
    finding_promotions: 0,
    graph_effects: 0,
    publication_clearances: 0
  };
  const lines = [
    '# Allocator-war official-record public acquisition execution Wave 36', '', '```text',
    `source specs / captures:               ${counts.source_specs} / ${counts.captures}`,
    `response files / institutional rows:  ${counts.response_files} / ${counts.usable_official_records}`,
    `transparent text renders:                ${counts.transparent_text_relay_sources}`,
    `capture states:                        ${JSON.stringify(counts.capture_states)}`,
    `route summaries / task results:        ${counts.route_summaries} / ${counts.task_results}`,
    `executed / protected tasks:            ${counts.executed_public_or_lawful_tasks} / ${counts.protected_tasks}`,
    `task result states:                     ${JSON.stringify(counts.result_states)}`,
    'requirements satisfied:                0', 'authorized joins / joined rows:         0 / 0',
    'complete denominators:                  0', 'evidence rows:                          0',
    'estate adoptions:                       0', 'finding promotions:                     0',
    'graph effects:                          0', 'publication clearances:                 0', '```', '',
    '| Route | Tasks | Executed | Protected | Component records | Result states |',
    '|---|---:|---:|---:|---:|---|'
  ];
  for (const row of routeSummaries) lines.push(`| ${row.route_class} | ${row.task_count} | ${row.executed_tasks} | ${row.protected_tasks} | ${row.public_record_component_uses} | ${JSON.stringify(row.result_states)} |`);
  lines.push('',
    'Wave 36 freezes a bounded cohort of official instruments, implementation guidance, public-money records, enforcement actions, adjudicative records, and correction-route documentation. Three GAO PDFs are preserved as hash-bound transparent text renders because the GAO edge rejects GitHub-hosted automation; their exact official origin URLs and relay transport remain separate. The wave then maps each captured component to every applicable Wave 35 task. A successful capture contributes a source-backed institutional component row only. It does not satisfy the task completion test or establish a complete action and no-action universe.', '',
    'The three protected-personnel tasks perform no network requests and remain in lawful-access-only custody. Public workforce, award, litigation, or enforcement records may not be used to manufacture protected personnel decisions, comparators, reasons, appeals, or outcomes.', '',
    'The controlling unresolved objects remain the complete internal implementation files, agency submissions, action and no-action registers, covered instrument universes, lawful entity joins, practical correction records, affected and comparator populations, realized payment and recovery ledgers, and protected personnel records named by Wave 35.'
  );
  return { text: `${lines.join('\n')}\n`, counts };
}

export function buildRepository(root = defaultRoot) {
  const policy = readJson(root, POLICY_PATH);
  const plan = readJson(root, PLAN_PATH);
  const sourceProjection = readJson(root, policy.paths.source_projection);
  const tasks = loadWave35Tasks(root, policy, sourceProjection);
  const captures = readJsonl(root, policy.paths.capture_ledger).sort((a, b) => a.capture_sequence - b.capture_sequence);
  if (captures.length !== plan.source_specs.length) throw new Error(`Wave 36 capture denominator mismatch: ${captures.length}`);

  const specByRef = new Map(plan.source_specs.map(row => [row.source_ref, row]));
  const captureByRef = new Map(captures.map(row => [row.source_ref, row]));
  const taskPlanByRef = new Map(plan.task_plans.map(row => [row.task_ref, row]));
  if (specByRef.size !== plan.source_specs.length || captureByRef.size !== captures.length || taskPlanByRef.size !== tasks.length) throw new Error('Wave 36 duplicate identity');
  for (const spec of plan.source_specs) if (!captureByRef.has(spec.source_ref)) throw new Error(`${spec.source_ref}: missing capture`);

  const taskRefsBySource = new Map(plan.source_specs.map(spec => [spec.source_ref, []]));
  for (const taskPlan of plan.task_plans) for (const sourceRef of taskPlan.source_refs) taskRefsBySource.get(sourceRef).push(taskPlan.task_ref);

  const records = [];
  for (const spec of plan.source_specs) {
    const capture = captureByRef.get(spec.source_ref);
    if (!captureUsable(capture)) continue;
    records.push(makeRecord(policy, spec, capture, taskRefsBySource.get(spec.source_ref), records.length + 1));
  }
  writeJsonl(root, policy.paths.record_ledger, records);
  const recordBySource = new Map(records.map(row => [row.source_ref, row]));

  const taskResults = [];
  const routeSummaries = [];
  for (let routeIndex = 0; routeIndex < ROUTE_ORDER.length; routeIndex += 1) {
    const route = ROUTE_ORDER[routeIndex];
    const routeTasks = tasks.filter(task => task.source_route_class === route);
    const routeResults = [];
    for (const task of routeTasks) {
      const taskPlan = taskPlanByRef.get(task.task_ref);
      if (!taskPlan) throw new Error(`${task.task_ref}: task plan missing`);
      const sourceCaptures = taskPlan.source_refs.map(ref => captureByRef.get(ref));
      const sourceRecords = taskPlan.source_refs.map(ref => recordBySource.get(ref)).filter(Boolean);
      const protectedTask = task.protected_lawful_access_only;
      const resultState = protectedTask
        ? 'preserved_authorized_lawful_access_only'
        : (sourceRecords.length ? 'source_backed_component_recovery' : 'bounded_public_acquisition_unavailable');
      const row = {
        schema_version: 'lake-allocator-war-public-acquisition-task-result-wave-36@1', row_type: 'public_acquisition_task_result',
        program_ref: policy.program_ref, wave_ref: policy.wave_ref, result_ref: `LAW36-${task.task_ref}`, result_sequence: task.task_sequence,
        source_task_ref: task.task_ref, source_task_sequence: task.task_sequence, source_queue_ref: task.queue_ref,
        source_join_ref: task.source_join_ref, source_requirement_ref: task.source_requirement_ref, route_class: task.source_route_class,
        route_owner: task.source_route_owner, access_class: task.access_class, target_row: task.target_row,
        protected_lawful_access_only: protectedTask, executed_in_wave: !protectedTask, network_requests_performed: protectedTask ? 0 : taskPlan.source_refs.length,
        source_refs: taskPlan.source_refs, capture_refs: sourceCaptures.map(row => row.capture_ref),
        capture_state_counts: countBy(sourceCaptures, 'capture_state'), response_file_count: sourceCaptures.filter(row => row.response_body_path).length,
        public_record_refs: sourceRecords.map(row => row.record_ref), public_record_component_count: sourceRecords.length,
        public_record_component_hashes: sourceRecords.map(row => row.response_body_sha256), result_state: resultState,
        completion_gap: taskPlan.completion_gap, completion_test: task.completion_test ?? null,
        refused_substitution: task.refused_substitution ?? null, source_join_row_sha256: task.source_join_row_sha256,
        source_requirement_sha256: task.source_requirement_sha256, result_authority: protectedTask ? 'preserved_authorized_lawful_access_only' : 'official_record_component_acquisition_only',
        requirement_satisfied: false, task_execution_authorizes_join: false, join_authorized: false, joined_rows: 0,
        complete_denominator: false, evidence_adjudicated: false, evidence_rows: 0, estate_adopted: false,
        finding_promoted: false, blocked_promotions: policy.blocked_promotions, graph_effect: 'none', publication_status: 'blocked'
      };
      routeResults.push(row); taskResults.push(row);
    }
    const summary = {
      schema_version: 'lake-allocator-war-public-acquisition-route-summary-wave-36@1', row_type: 'public_acquisition_route_summary',
      program_ref: policy.program_ref, wave_ref: policy.wave_ref, route_ref: `LAW36-Q${String(routeIndex + 1).padStart(3, '0')}`,
      route_sequence: routeIndex + 1, route_class: route, route_owner: routeTasks[0]?.source_route_owner ?? null, task_count: routeTasks.length,
      executed_tasks: routeResults.filter(row => row.executed_in_wave).length, protected_tasks: routeResults.filter(row => row.protected_lawful_access_only).length,
      source_uses: routeResults.reduce((sum, row) => sum + row.source_refs.length, 0), response_file_uses: routeResults.reduce((sum, row) => sum + row.response_file_count, 0),
      public_record_component_uses: routeResults.reduce((sum, row) => sum + row.public_record_component_count, 0), result_states: countBy(routeResults, 'result_state'),
      requirements_satisfied: 0, authorized_joins: 0, complete_denominators: 0, evidence_rows: 0, finding_promotions: 0,
      graph_effects: 0, publication_clearances: 0, graph_effect: 'none', publication_status: 'blocked'
    };
    routeSummaries.push(summary);
    writeJsonl(root, `${policy.paths.result_root}/${routeOutput(route)}`, [summary, ...routeResults]);
  }

  const report = renderReport(policy, plan, captures, records, taskResults, routeSummaries);
  writeText(root, policy.paths.report, report.text);
  const projection = {
    schema_version: 'lake-allocator-war-public-acquisition-wave-36@1', program_ref: policy.program_ref, wave_ref: policy.wave_ref,
    as_of: policy.as_of, title: policy.title, authority: 'official_record_component_and_transparent_text_render_acquisition_only',
    source_policy: POLICY_PATH, source_plan: PLAN_PATH, source_projection: policy.paths.source_projection,
    counts: report.counts, captures: captures.map(row => ({ capture_ref: row.capture_ref, source_ref: row.source_ref, transport_mode: row.transport_mode, official_origin_url: row.official_origin_url, capture_state: row.capture_state, response_status: row.response_status, response_body_path: row.response_body_path, response_body_sha256: row.response_body_sha256, marker_passed: row.marker_audit?.passed ?? false })),
    records: records.map(row => ({ record_ref: row.record_ref, source_ref: row.source_ref, action_class: row.action_class, response_body_sha256: row.response_body_sha256, task_refs: row.task_refs })),
    routes: routeSummaries, tasks: taskResults.map(row => ({ result_ref: row.result_ref, source_task_ref: row.source_task_ref, route_class: row.route_class, result_state: row.result_state, source_refs: row.source_refs, public_record_refs: row.public_record_refs, public_record_component_count: row.public_record_component_count, requirement_satisfied: false, join_authorized: false, complete_denominator: false, graph_effect: 'none', publication_status: 'blocked' })),
    boundaries: policy.boundaries, graph_effect: 'none', publication_status: 'blocked'
  };
  writeJson(root, policy.paths.projection, projection);
  console.log('allocator-war official-record public acquisition Wave 36 built');
  console.log(`  source specs / captures / records: ${plan.source_specs.length} / ${captures.length} / ${records.length}`);
  console.log(`  route summaries / task results: ${routeSummaries.length} / ${taskResults.length}`);
  console.log(`  executed / protected: ${taskResults.filter(row => row.executed_in_wave).length} / ${taskResults.filter(row => row.protected_lawful_access_only).length}`);
  console.log('  requirements / joins / evidence / findings / graph / publication: 0 / 0 / 0 / 0 / 0 / 0');
  return projection;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) buildRepository(defaultRoot);
