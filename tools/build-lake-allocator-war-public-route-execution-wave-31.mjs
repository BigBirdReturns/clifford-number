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
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))]
    .sort()
    .map(value => [value, rows.filter(row => row[key] === value).length])
);

export function resultPathFor(routeClass, policy) {
  return policy.paths.result_root + '/' + routeClass + '.jsonl';
}

export function collectWave30Rows(sourceProjection, sourceRowsByPath) {
  const routeSummaries = [];
  const tasks = [];
  for (const route of sourceProjection.routes.slice().sort((a, b) => a.route_sequence - b.route_sequence)) {
    const rows = sourceRowsByPath[route.result_path];
    if (!rows) throw new Error(route.route_ref + ': Wave 30 route ledger absent');
    const summary = rows.find(row => row.row_type === 'missing_row_route_summary');
    if (!summary) throw new Error(route.route_ref + ': Wave 30 route summary absent');
    routeSummaries.push(summary);
    tasks.push(...rows
      .filter(row => row.row_type === 'missing_row_closure_task')
      .sort((a, b) => a.task_sequence - b.task_sequence));
  }
  return { routeSummaries, tasks: tasks.sort((a, b) => a.task_sequence - b.task_sequence) };
}

function routePlanMap(policy) {
  return new Map(policy.route_plans.map(row => [row.route_class, row]));
}

function sourceMap(sourcePlan) {
  return new Map(sourcePlan.sources.map(row => [row.source_ref, row]));
}

function resultStateFor(task, routePlan) {
  return routePlan.task_overrides?.[task.task_ref] ?? routePlan.default_result_state;
}

function taskResult(task, routePlan, policy) {
  const publicExecution = routePlan.public_execution === true;
  const resultState = resultStateFor(task, routePlan);
  return {
    schema_version: 'lake-allocator-war-public-route-result-wave-31@1',
    row_type: 'public_route_execution_result',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    result_ref: 'LAW31-' + task.task_ref,
    result_sequence: task.task_sequence,
    source_task_ref: task.task_ref,
    source_route_ref: 'LAW30-R' + String(task.route_sequence).padStart(2, '0'),
    source_route_class: task.route_class,
    source_route_owner: task.route_owner,
    source_consumer_key: task.consumer_key,
    source_consumer_feed_ref: task.consumer_feed_ref,
    source_task_class: task.source_task_class,
    source_priority_tier: task.source_priority_tier,
    source_unavailable_row: task.unavailable_row,
    source_unavailable_row_sha256: task.unavailable_row_sha256,
    source_result_state: task.source_result_state,
    public_execution: publicExecution,
    executed_in_wave: publicExecution,
    access_bounded: !publicExecution,
    result_state: resultState,
    source_refs: publicExecution ? routePlan.source_refs : [],
    source_receipt_count: publicExecution ? routePlan.source_refs.length : 0,
    coverage_statement: routePlan.coverage_statement,
    recovered_surfaces: routePlan.recovered_surfaces,
    remaining_rows: [task.unavailable_row, ...routePlan.remaining_limits],
    refused_substitutions: routePlan.refused_substitutions,
    correction_route: routePlan.correction_route,
    result_authority: publicExecution
      ? 'official_source_system_acquisition_only'
      : 'preserved_lawful_access_boundary',
    complete_denominator: false,
    evidence_adjudicated: false,
    evidence_rows: 0,
    estate_adopted: false,
    finding_promoted: false,
    blocked_promotions: policy.blocked_promotions,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

export function buildExecution(policy, sourcePlan, sourceProjection, sourceProjectionRaw, sourceRowsByPath, sourceRawByPath) {
  const routePlans = routePlanMap(policy);
  const sources = sourceMap(sourcePlan);
  const { routeSummaries: wave30RouteSummaries, tasks: wave30Tasks } =
    collectWave30Rows(sourceProjection, sourceRowsByPath);

  const sourceUseCounts = new Map(sourcePlan.sources.map(row => [row.source_ref, 0]));
  const resultRowsByPath = {};
  const routeResults = [];
  const allTaskResults = [];

  for (const sourceRoute of sourceProjection.routes.slice().sort((a, b) => a.route_sequence - b.route_sequence)) {
    const routePlan = routePlans.get(sourceRoute.route_class);
    if (!routePlan) throw new Error(sourceRoute.route_class + ': Wave 31 route plan absent');
    if (routePlan.route_ref !== sourceRoute.route_ref) {
      throw new Error(sourceRoute.route_class + ': Wave 31 route reference drift');
    }
    for (const sourceRef of routePlan.source_refs) {
      if (!sources.has(sourceRef)) throw new Error(sourceRoute.route_class + ': unknown Wave 31 source ' + sourceRef);
    }

    const routeTasks = wave30Tasks.filter(task => task.route_class === sourceRoute.route_class);
    const taskResults = routeTasks.map(task => taskResult(task, routePlan, policy));
    for (const result of taskResults) {
      for (const sourceRef of result.source_refs) {
        sourceUseCounts.set(sourceRef, (sourceUseCounts.get(sourceRef) ?? 0) + 1);
      }
    }
    allTaskResults.push(...taskResults);

    const summary = {
      schema_version: 'lake-allocator-war-public-route-summary-wave-31@1',
      row_type: 'public_route_execution_summary',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      route_ref: sourceRoute.route_ref,
      route_class: sourceRoute.route_class,
      route_sequence: sourceRoute.route_sequence,
      route_owner: sourceRoute.route_owner,
      public_execution: routePlan.public_execution,
      source_task_count: routeTasks.length,
      executed_task_count: taskResults.filter(row => row.executed_in_wave).length,
      preserved_task_count: taskResults.filter(row => !row.executed_in_wave).length,
      source_refs: routePlan.source_refs,
      source_receipt_count: routePlan.source_refs.length,
      source_receipt_uses: taskResults.reduce((sum, row) => sum + row.source_receipt_count, 0),
      result_states: countBy(taskResults, 'result_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    };
    const rows = [summary, ...taskResults];
    const relative = resultPathFor(sourceRoute.route_class, policy);
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[relative] = rows;
    routeResults.push({
      route_ref: sourceRoute.route_ref,
      route_class: sourceRoute.route_class,
      route_sequence: sourceRoute.route_sequence,
      route_owner: sourceRoute.route_owner,
      public_execution: routePlan.public_execution,
      source_task_count: routeTasks.length,
      executed_task_count: summary.executed_task_count,
      preserved_task_count: summary.preserved_task_count,
      source_refs: routePlan.source_refs,
      source_receipt_count: routePlan.source_refs.length,
      source_receipt_uses: summary.source_receipt_uses,
      result_states: summary.result_states,
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

  const unusedSources = [...sourceUseCounts.entries()]
    .filter(([, count]) => count === 0)
    .map(([sourceRef]) => sourceRef);
  if (unusedSources.length) throw new Error('unused Wave 31 source receipts: ' + unusedSources.join(', '));

  const sourceLedgerCustody = Object.fromEntries(
    sourceProjection.routes.slice().sort((a, b) => a.route_sequence - b.route_sequence).map(route => {
      const raw = sourceRawByPath[route.result_path];
      if (typeof raw !== 'string') throw new Error(route.result_path + ': Wave 30 raw route ledger absent');
      return [route.result_path, {
        bytes: Buffer.byteLength(raw),
        sha256: digestBytes(raw),
        declared_sha256: route.result_sha256
      }];
    })
  );

  const sourcePlanRaw = JSON.stringify(sourcePlan, null, 2) + '\n';
  const resultStates = countBy(allTaskResults, 'result_state');
  const projection = {
    schema_version: 'lake-allocator-war-public-route-execution-wave-31@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json',
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw),
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      source_ledger_custody: sourceLedgerCustody
    },
    counts: {
      source_routes: sourceProjection.routes.length,
      source_tasks: wave30Tasks.length,
      public_routes: routeResults.filter(row => row.public_execution).length,
      protected_routes: routeResults.filter(row => !row.public_execution).length,
      executed_public_tasks: allTaskResults.filter(row => row.executed_in_wave).length,
      preserved_access_bounded_tasks: allTaskResults.filter(row => !row.executed_in_wave).length,
      official_source_receipts: sourcePlan.sources.length,
      source_receipt_uses: [...sourceUseCounts.values()].reduce((sum, value) => sum + value, 0),
      route_summary_rows: routeResults.length,
      task_result_rows: allTaskResults.length,
      execution_rows: routeResults.length + allTaskResults.length,
      result_states: resultStates,
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: sourceProjection.graph_digests,
    routes: routeResults,
    source_receipts: sourcePlan.sources.map(source => ({
      source_ref: source.source_ref,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      authority: source.authority,
      retrieval_state: source.retrieval_state,
      observed_on: source.observed_on,
      source_receipt_uses: sourceUseCounts.get(source.source_ref)
    })),
    execution_contract: {
      all_public_tasks_executed: true,
      protected_tasks_preserved: true,
      source_sets_reused_by_route: true,
      manual_per_task_dispatch_required: false,
      source_change_replays_only_affected_route: true,
      complete_denominator_created: false
    },
    boundaries: policy.boundaries
  };

  return {
    projection,
    resultRowsByPath,
    taskResults: allTaskResults,
    wave30RouteSummaries
  };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war public-route execution Wave 31',
    '',
    '```text',
    'source routes / tasks:               ' + projection.counts.source_routes + ' / ' + projection.counts.source_tasks,
    'public / protected routes:           ' + projection.counts.public_routes + ' / ' + projection.counts.protected_routes,
    'executed / access-bounded tasks:     ' + projection.counts.executed_public_tasks + ' / ' + projection.counts.preserved_access_bounded_tasks,
    'official receipts / uses:            ' + projection.counts.official_source_receipts + ' / ' + projection.counts.source_receipt_uses,
    'result states:                       ' + JSON.stringify(projection.counts.result_states),
    'complete denominators:               0',
    'evidence rows:                       0',
    'estate adoptions:                    0',
    'finding promotions:                  0',
    'graph effects:                       0',
    'publication clearances:              0',
    '```',
    '',
    '| Route class | Tasks | Executed | Preserved | Sources | Result states |',
    '|---|---:|---:|---:|---:|---|'
  ];
  for (const route of projection.routes) {
    lines.push('| ' + route.route_class + ' | ' + route.source_task_count + ' | ' +
      route.executed_task_count + ' | ' + route.preserved_task_count + ' | ' +
      route.source_receipt_count + ' | ' + JSON.stringify(route.result_states) + ' |');
  }
  lines.push(
    '',
    'Wave 31 executes every publicly executable Wave 30 obligation through six reusable official-source lanes and preserves the four protected-personnel obligations without public substitution. The recovered systems establish addressable workforce, award, contract, assistance, action, docket, adjudication, and audit surfaces. They do not complete condition-specific action denominators, protected personnel rosters, no-action registers, affected-comparator joins, practical correction, or realized public-value recovery.',
    '',
    'A public-route result remains acquisition-only. It does not adjudicate evidence, establish estate adoption, promote a finding, modify the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-public-route-execution-wave-31-policy.json');
  const sourcePlan = readJson(policy.paths.source_plan);
  const sourceProjectionRaw = fs.readFileSync(full(policy.paths.source_projection), 'utf8');
  const sourceProjection = JSON.parse(sourceProjectionRaw);
  const sourceRowsByPath = {};
  const sourceRawByPath = {};
  for (const route of sourceProjection.routes) {
    const raw = fs.readFileSync(full(route.result_path), 'utf8');
    sourceRawByPath[route.result_path] = raw;
    sourceRowsByPath[route.result_path] = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  }
  const { projection, resultRowsByPath } = buildExecution(
    policy,
    sourcePlan,
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
  console.log('allocator-war public-route execution Wave 31 built');
  console.log('  routes / tasks / executed / protected: ' +
    projection.counts.source_routes + ' / ' +
    projection.counts.source_tasks + ' / ' +
    projection.counts.executed_public_tasks + ' / ' +
    projection.counts.preserved_access_bounded_tasks);
  console.log('  receipts / uses: ' +
    projection.counts.official_source_receipts + ' / ' +
    projection.counts.source_receipt_uses);
  console.log('  result states: ' + JSON.stringify(projection.counts.result_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
