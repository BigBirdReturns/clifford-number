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
const writeJsonl = (relative, rows) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
};
const writeText = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), value);
};
const digestBytes = value => crypto.createHash('sha256').update(value).digest('hex');
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);
const unique = values => [...new Set(values)];

export function resultPathFor(routeClass, policy) {
  return policy.paths.route_result_root + '/' + routeClass + '.jsonl';
}

export function collectWave31Rows(sourceProjection, rowsByPath) {
  const summaries = [];
  const results = [];
  for (const route of sourceProjection.routes.slice().sort((a, b) => a.route_sequence - b.route_sequence)) {
    const rows = rowsByPath[route.result_path];
    if (!rows) throw new Error(route.route_ref + ': Wave 31 route ledger absent');
    const summary = rows.find(row => row.row_type === 'public_route_execution_summary');
    if (!summary) throw new Error(route.route_ref + ': Wave 31 route summary absent');
    summaries.push(summary);
    results.push(...rows.filter(row => row.row_type === 'public_route_execution_result'));
  }
  return { summaries, results: results.sort((a, b) => a.result_sequence - b.result_sequence) };
}

function snapshotMap(snapshotRows) {
  return new Map(snapshotRows.map(row => [row.source_ref, row]));
}

function captureCounts(rows) {
  return rows.length ? countBy(rows, 'capture_state') : {};
}

function mappedResultState(sourceState, policy) {
  const value = policy.state_mapping[sourceState];
  if (!value) throw new Error('unmapped Wave 31 result state: ' + sourceState);
  return value;
}

function taskResult(sourceResult, routeSnapshots, policy) {
  const snapshots = sourceResult.source_refs.map(sourceRef => {
    const row = routeSnapshots.get(sourceRef);
    if (!row) throw new Error(sourceResult.result_ref + ': snapshot absent for ' + sourceRef);
    return row;
  });
  const successful = snapshots.filter(row => row.response_ok === true && ['captured_json_response', 'captured_html_response'].includes(row.capture_state));
  const credential = snapshots.filter(row => row.capture_state === 'credential_boundary_preserved');
  const failed = snapshots.filter(row => ['captured_http_error_response', 'network_error_after_retry', 'response_oversize_refused', 'captured_unparsed_response'].includes(row.capture_state));
  return {
    schema_version: 'lake-allocator-war-bounded-source-snapshot-result-wave-32@1',
    row_type: 'bounded_source_snapshot_task_result',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    result_ref: 'LAW32-' + sourceResult.source_task_ref,
    result_sequence: sourceResult.result_sequence,
    source_result_ref: sourceResult.result_ref,
    source_task_ref: sourceResult.source_task_ref,
    source_route_ref: sourceResult.source_route_ref,
    source_route_class: sourceResult.source_route_class,
    source_route_owner: sourceResult.source_route_owner,
    source_consumer_key: sourceResult.source_consumer_key,
    source_consumer_feed_ref: sourceResult.source_consumer_feed_ref,
    source_task_class: sourceResult.source_task_class,
    source_priority_tier: sourceResult.source_priority_tier,
    source_result_state: sourceResult.result_state,
    result_state: mappedResultState(sourceResult.result_state, policy),
    public_execution: sourceResult.public_execution,
    access_bounded: sourceResult.access_bounded,
    source_refs: sourceResult.source_refs,
    snapshot_refs: snapshots.map(row => row.snapshot_ref),
    snapshot_capture_states: captureCounts(snapshots),
    successful_snapshot_count: successful.length,
    response_snapshot_count: snapshots.filter(row => row.response_body_path).length,
    credential_boundary_count: credential.length,
    failed_snapshot_count: failed.length,
    snapshot_response_sha256: snapshots.filter(row => row.response_body_sha256).map(row => row.response_body_sha256),
    source_remaining_rows: sourceResult.remaining_rows,
    snapshot_limits: unique(snapshots.map(row => row.limits)),
    refused_substitutions: sourceResult.refused_substitutions,
    correction_route: sourceResult.correction_route,
    result_authority: sourceResult.access_bounded
      ? 'preserved_lawful_access_boundary'
      : 'frozen_official_source_snapshot_acquisition_only',
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

export function buildSnapshots(
  policy,
  snapshotPlan,
  sourcePlan,
  sourceProjection,
  sourceProjectionRaw,
  sourceRowsByPath,
  sourceRawByPath,
  snapshotRows,
  snapshotLedgerRaw,
  snapshotRawByPath
) {
  const map = snapshotMap(snapshotRows);
  const { summaries: sourceSummaries, results: sourceResults } = collectWave31Rows(sourceProjection, sourceRowsByPath);
  const routeResults = [];
  const resultRowsByPath = {};
  const allTaskResults = [];

  for (const route of sourceProjection.routes.slice().sort((a, b) => a.route_sequence - b.route_sequence)) {
    const sourceSummary = sourceSummaries.find(row => row.route_ref === route.route_ref);
    const routeSourceResults = sourceResults.filter(row => row.source_route_ref === route.route_ref);
    const routeSnapshotMap = new Map(sourceSummary.source_refs.map(sourceRef => [sourceRef, map.get(sourceRef)]));
    if ([...routeSnapshotMap.values()].some(value => !value)) throw new Error(route.route_ref + ': route snapshot set incomplete');
    const taskResults = routeSourceResults.map(row => taskResult(row, routeSnapshotMap, policy));
    allTaskResults.push(...taskResults);
    const snapshots = [...routeSnapshotMap.values()];
    const summary = {
      schema_version: 'lake-allocator-war-bounded-source-snapshot-summary-wave-32@1',
      row_type: 'bounded_source_snapshot_route_summary',
      program_ref: policy.program_ref,
      wave_ref: policy.wave_ref,
      route_ref: route.route_ref,
      route_class: route.route_class,
      route_sequence: route.route_sequence,
      route_owner: route.route_owner,
      source_task_count: taskResults.length,
      public_execution: route.public_execution,
      source_refs: sourceSummary.source_refs,
      snapshot_refs: snapshots.map(row => row.snapshot_ref),
      snapshot_count: snapshots.length,
      snapshot_capture_states: captureCounts(snapshots),
      response_snapshot_count: snapshots.filter(row => row.response_body_path).length,
      credential_boundary_count: snapshots.filter(row => row.capture_state === 'credential_boundary_preserved').length,
      task_result_states: countBy(taskResults, 'result_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    };
    const rows = [summary, ...taskResults];
    const relative = resultPathFor(route.route_class, policy);
    const raw = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    resultRowsByPath[relative] = rows;
    routeResults.push({
      route_ref: route.route_ref,
      route_class: route.route_class,
      route_sequence: route.route_sequence,
      route_owner: route.route_owner,
      public_execution: route.public_execution,
      source_task_count: taskResults.length,
      source_refs: sourceSummary.source_refs,
      snapshot_refs: snapshots.map(row => row.snapshot_ref),
      snapshot_count: snapshots.length,
      snapshot_capture_states: summary.snapshot_capture_states,
      response_snapshot_count: summary.response_snapshot_count,
      credential_boundary_count: summary.credential_boundary_count,
      task_result_states: summary.task_result_states,
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

  const sourceLedgerCustody = Object.fromEntries(sourceProjection.routes.map(route => {
    const raw = sourceRawByPath[route.result_path];
    if (typeof raw !== 'string') throw new Error(route.result_path + ': Wave 31 raw route ledger absent');
    return [route.result_path, { bytes: Buffer.byteLength(raw), sha256: digestBytes(raw), declared_sha256: route.result_sha256 }];
  }));

  const snapshotResponseCustody = Object.fromEntries(snapshotRows.filter(row => row.response_body_path).map(row => {
    const raw = snapshotRawByPath[row.response_body_path];
    if (!Buffer.isBuffer(raw)) throw new Error(row.snapshot_ref + ': snapshot response body absent');
    return [row.response_body_path, {
      bytes: raw.length,
      sha256: digestBytes(raw),
      declared_bytes: row.response_body_bytes,
      declared_sha256: row.response_body_sha256
    }];
  }));

  const snapshotPlanRaw = JSON.stringify(snapshotPlan, null, 2) + '\n';
  const sourcePlanRaw = JSON.stringify(sourcePlan, null, 2) + '\n';
  const captureStateCounts = captureCounts(snapshotRows);
  const requiredSuccess = new Set(snapshotPlan.required_success_snapshot_refs);
  const requiredSuccessCaptured = snapshotRows.filter(row => requiredSuccess.has(row.snapshot_ref) && row.response_ok === true && row.capture_state === 'captured_json_response').length;
  const projection = {
    schema_version: 'lake-allocator-war-bounded-source-snapshots-wave-32@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
      snapshot_plan_path: policy.paths.snapshot_plan,
      snapshot_plan_bytes: Buffer.byteLength(snapshotPlanRaw),
      snapshot_plan_sha256: digestBytes(snapshotPlanRaw),
      source_plan_path: policy.paths.source_plan,
      source_plan_bytes: Buffer.byteLength(sourcePlanRaw),
      source_plan_sha256: digestBytes(sourcePlanRaw),
      source_projection_path: policy.paths.source_projection,
      source_projection_bytes: Buffer.byteLength(sourceProjectionRaw),
      source_projection_sha256: digestBytes(sourceProjectionRaw),
      snapshot_ledger_path: policy.paths.snapshot_ledger,
      snapshot_ledger_bytes: Buffer.byteLength(snapshotLedgerRaw),
      snapshot_ledger_sha256: digestBytes(snapshotLedgerRaw),
      source_ledger_custody: sourceLedgerCustody,
      snapshot_response_custody: snapshotResponseCustody
    },
    counts: {
      source_routes: sourceProjection.routes.length,
      source_tasks: sourceResults.length,
      source_receipts: sourceProjection.source_receipts.length,
      source_receipt_uses: sourceProjection.counts.source_receipt_uses,
      snapshot_specs: snapshotPlan.snapshot_specs.length,
      snapshot_rows: snapshotRows.length,
      public_http_specs: snapshotPlan.snapshot_specs.filter(row => row.capture_mode === 'public_http').length,
      credential_boundary_specs: snapshotPlan.snapshot_specs.filter(row => row.capture_mode === 'credential_boundary').length,
      json_specs: snapshotPlan.snapshot_specs.filter(row => row.expected_format === 'json').length,
      html_specs: snapshotPlan.snapshot_specs.filter(row => row.expected_format === 'html').length,
      required_success_specs: requiredSuccess.size,
      required_success_captured: requiredSuccessCaptured,
      response_snapshot_files: Object.keys(snapshotResponseCustody).length,
      response_snapshot_bytes: Object.values(snapshotResponseCustody).reduce((sum, row) => sum + row.bytes, 0),
      capture_states: captureStateCounts,
      route_summary_rows: routeResults.length,
      task_result_rows: allTaskResults.length,
      execution_rows: routeResults.length + allTaskResults.length,
      task_result_states: countBy(allTaskResults, 'result_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    graph_digests: sourceProjection.graph_digests,
    snapshots: snapshotRows.map(row => ({
      snapshot_ref: row.snapshot_ref,
      source_ref: row.source_ref,
      capture_mode: row.capture_mode,
      expected_format: row.expected_format,
      required_success: row.required_success,
      observed_at: row.observed_at,
      capture_state: row.capture_state,
      request_fingerprint_sha256: row.request?.fingerprint_sha256 ?? null,
      response_status: row.response_status,
      response_final_url: row.response_final_url,
      response_body_path: row.response_body_path,
      response_body_bytes: row.response_body_bytes,
      response_body_sha256: row.response_body_sha256,
      parsed_summary: row.parsed_summary,
      complete_denominator: false,
      evidence_adjudicated: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    })),
    routes: routeResults,
    execution_contract: {
      one_snapshot_per_source_receipt: true,
      public_http_requests_attempted_once_per_source_spec: true,
      credential_boundaries_preserved_without_secret_use: true,
      source_snapshots_reused_by_route: true,
      manual_per_task_network_dispatch_required: false,
      release_validation_refetches_network: false,
      complete_denominator_created: false
    },
    boundaries: policy.boundaries
  };
  return { projection, resultRowsByPath, taskResults: allTaskResults, sourceResults };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war bounded source snapshots Wave 32',
    '',
    '```text',
    'source routes / tasks:              ' + projection.counts.source_routes + ' / ' + projection.counts.source_tasks,
    'source receipts / uses:             ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses,
    'snapshot specs / rows:              ' + projection.counts.snapshot_specs + ' / ' + projection.counts.snapshot_rows,
    'public HTTP / credential boundary:  ' + projection.counts.public_http_specs + ' / ' + projection.counts.credential_boundary_specs,
    'JSON / HTML specifications:         ' + projection.counts.json_specs + ' / ' + projection.counts.html_specs,
    'required JSON controls captured:    ' + projection.counts.required_success_captured + ' / ' + projection.counts.required_success_specs,
    'response files / bytes:             ' + projection.counts.response_snapshot_files + ' / ' + projection.counts.response_snapshot_bytes,
    'capture states:                     ' + JSON.stringify(projection.counts.capture_states),
    'task result states:                 ' + JSON.stringify(projection.counts.task_result_states),
    'complete denominators:              0',
    'evidence rows:                      0',
    'estate adoptions:                   0',
    'finding promotions:                 0',
    'graph effects:                      0',
    'publication clearances:             0',
    '```',
    '',
    '| Route class | Tasks | Snapshots | Responses | Credentials | Task states |',
    '|---|---:|---:|---:|---:|---|'
  ];
  for (const route of projection.routes) {
    lines.push('| ' + route.route_class + ' | ' + route.source_task_count + ' | ' + route.snapshot_count + ' | ' +
      route.response_snapshot_count + ' | ' + route.credential_boundary_count + ' | ' + JSON.stringify(route.task_result_states) + ' |');
  }
  lines.push(
    '',
    'Wave 32 freezes each Wave 31 source locator as one exact request-response object or one explicit credential boundary. The nineteen source objects are reused across all route consumers, so one source change replays the affected source and routes rather than dispatching thirty-eight independent searches.',
    '',
    'A captured response establishes only what the bounded request returned at the recorded time. It does not complete a contested action denominator, prove that an unavailable row does not exist, substitute a public catalogue for credentialed data, establish estate adoption, promote a finding, alter the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function runBuild() {
  const policy = readJson('data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json');
  const snapshotPlan = readJson(policy.paths.snapshot_plan);
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
  const snapshotLedgerRaw = fs.readFileSync(full(policy.paths.snapshot_ledger), 'utf8');
  const snapshotRows = snapshotLedgerRaw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const snapshotRawByPath = {};
  for (const row of snapshotRows) {
    if (row.response_body_path) snapshotRawByPath[row.response_body_path] = fs.readFileSync(full(row.response_body_path));
  }
  const { projection, resultRowsByPath } = buildSnapshots(
    policy,
    snapshotPlan,
    sourcePlan,
    sourceProjection,
    sourceProjectionRaw,
    sourceRowsByPath,
    sourceRawByPath,
    snapshotRows,
    snapshotLedgerRaw,
    snapshotRawByPath
  );
  fs.rmSync(full(policy.paths.route_result_root), { recursive: true, force: true });
  for (const [relative, rows] of Object.entries(resultRowsByPath)) writeJsonl(relative, rows);
  writeJson(policy.paths.projection, projection);
  writeText(policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war bounded source snapshots Wave 32 built');
  console.log('  routes / tasks / sources / snapshots: ' + projection.counts.source_routes + ' / ' + projection.counts.source_tasks + ' / ' + projection.counts.source_receipts + ' / ' + projection.counts.snapshot_rows);
  console.log('  public / credential / response files: ' + projection.counts.public_http_specs + ' / ' + projection.counts.credential_boundary_specs + ' / ' + projection.counts.response_snapshot_files);
  console.log('  capture states: ' + JSON.stringify(projection.counts.capture_states));
  console.log('  task states: ' + JSON.stringify(projection.counts.task_result_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
