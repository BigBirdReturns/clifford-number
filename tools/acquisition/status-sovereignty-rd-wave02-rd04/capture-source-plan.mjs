#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PLAN_ROOT = path.resolve(
  process.env.RD04_SOURCE_PLAN || '/tmp/rd04-source-plan'
);
export const OUTPUT = path.resolve(
  process.env.RD04_SOURCE_CAPTURE_OUTPUT || '/tmp/rd04-source-capture'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const now = () => new Date().toISOString();
const ensureFile = (target) => { if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.alloc(0)); };
const rel = (target) => path.relative(OUTPUT, target).split(path.sep).join('/');

function verifyPlan() {
  const planPath = path.join(PLAN_ROOT, 'source-plan.json');
  const receiptPath = path.join(PLAN_ROOT, 'receipt.json');
  ok(fs.existsSync(planPath) && fs.existsSync(receiptPath), 'source plan artifact incomplete');
  const planBytes = fs.readFileSync(planPath);
  const receipt = readJson(receiptPath);
  ok(planBytes.length === receipt.product_bytes, 'source plan byte count changed');
  ok(sha256(planBytes) === receipt.product_sha256, 'source plan digest changed');
  const plan = JSON.parse(planBytes.toString('utf8'));
  ok(plan.schema_version === 'ssc-rd-wave02-rd04-fixed-source-plan@1', 'source plan schema changed');
  ok(plan.counts.execution_units === 93, 'execution-unit denominator changed');
  ok(plan.counts.reused_seed_units === 13, 'reused seed denominator changed');
  ok(plan.counts.acquisition_target_units === 80, 'target-unit denominator changed');
  ok(plan.counts.locator_candidates === 81 && plan.counts.unique_routes === 68, 'route denominator changed');
  ok(plan.protocol.fixed_before_fetch === true && plan.protocol.outcome_selected_retry === false, 'plan mutability changed');
  return { plan, receipt, planBytes };
}

function curlAttempt(route, attempt, protocol, routeDir) {
  return new Promise((resolve) => {
    const attemptDir = path.join(routeDir, `attempt-${attempt}`);
    fs.mkdirSync(attemptDir, { recursive: true });
    const headersPath = path.join(attemptDir, 'headers.txt');
    const bodyPath = path.join(attemptDir, 'body.bin');
    const stderrPath = path.join(attemptDir, 'curl-stderr.txt');
    const metaPath = path.join(attemptDir, 'curl-meta.txt');
    const startedAt = now();
    const args = [
      '--location',
      '--silent',
      '--show-error',
      '--compressed',
      '--connect-timeout', String(protocol.connect_timeout_seconds),
      '--max-time', String(protocol.total_timeout_seconds),
      '--user-agent', 'clifford-number-rd04-source-custody/1.0',
      '--dump-header', headersPath,
      '--output', bodyPath,
      '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{num_redirects}\n',
      route.url
    ];
    const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { stderr += `${error.stack || error.message}\n`; });
    child.on('close', (code, signal) => {
      const finishedAt = now();
      ensureFile(headersPath);
      ensureFile(bodyPath);
      fs.writeFileSync(stderrPath, stderr, 'utf8');
      fs.writeFileSync(metaPath, stdout, 'utf8');
      const lines = stdout.split(/\r?\n/);
      const httpStatus = Number(lines[0] || 0);
      const finalUrl = lines[1] || route.url;
      const contentType = lines[2] || '';
      const reportedBytes = Number(lines[3] || 0);
      const redirectCount = Number(lines[4] || 0);
      const body = fs.readFileSync(bodyPath);
      const headers = fs.readFileSync(headersPath);
      const curlExit = Number.isInteger(code) ? code : 255;
      const resolved = curlExit === 0 && httpStatus >= 200 && httpStatus < 300 && body.length > 0;
      resolve({
        attempt,
        started_at: startedAt,
        finished_at: finishedAt,
        request_url: route.url,
        final_url: finalUrl,
        curl_exit: curlExit,
        termination_signal: signal || null,
        http_status: httpStatus,
        content_type: contentType,
        reported_download_bytes: reportedBytes,
        redirect_count: redirectCount,
        headers_path: rel(headersPath),
        headers_bytes: headers.length,
        headers_sha256: sha256(headers),
        body_path: rel(bodyPath),
        body_bytes: body.length,
        body_sha256: sha256(body),
        stderr_path: rel(stderrPath),
        stderr_bytes: Buffer.byteLength(stderr),
        meta_path: rel(metaPath),
        expected_content_class: route.expected_content_class,
        content_type_matches_expectation:
          route.expected_content_class === 'html'
            ? /html|xhtml/i.test(contentType)
            : route.expected_content_class === 'pdf'
              ? /pdf/i.test(contentType) || body.subarray(0, 5).toString('ascii') === '%PDF-'
              : /officedocument|zip|octet-stream/i.test(contentType) ||
                body.subarray(0, 2).toString('hex') === '504b',
        resolved
      });
    });
  });
}

function terminalState(attempts) {
  const last = attempts.at(-1);
  if (last.resolved) return 'http_success';
  if (last.curl_exit !== 0) return 'transport_failure_after_bounded_retry';
  if (!(last.http_status >= 200 && last.http_status < 300)) {
    return 'http_non_success_after_bounded_retry';
  }
  return 'empty_body_after_bounded_retry';
}

async function captureRoute(route, protocol) {
  const routeDir = path.join(OUTPUT, 'routes', route.route_id);
  fs.mkdirSync(routeDir, { recursive: true });
  const attempts = [];
  for (let attempt = 1; attempt <= protocol.maximum_attempts_per_route; attempt += 1) {
    const receipt = await curlAttempt(route, attempt, protocol, routeDir);
    attempts.push(receipt);
    if (receipt.resolved) break;
  }
  const terminal = terminalState(attempts);
  const final = attempts.at(-1);
  return {
    ...route,
    attempts,
    attempt_count: attempts.length,
    terminal_state: terminal,
    resolved: terminal === 'http_success',
    final_http_status: final.http_status,
    final_url: final.final_url,
    final_content_type: final.content_type,
    final_body_bytes: final.body_bytes,
    final_body_sha256: final.body_sha256,
    source_identity_adjudicated: false,
    version_edges_adjudicated: 0,
    class_effect: 'none'
  };
}

async function captureRoutes(routes, protocol) {
  const results = new Array(routes.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= routes.length) return;
      results[index] = await captureRoute(routes[index], protocol);
    }
  }
  const workers = Array.from(
    { length: Math.min(protocol.concurrent_routes, routes.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function buildUnitLedger(plan, routeReceipts) {
  const routeByUrl = new Map(routeReceipts.map((route) => [route.url, route]));
  const reused = plan.reused_seed_units.map((unit) => ({
    ...unit,
    unit_terminal_source_state: 'reused_terminal_seed_source_receipt',
    source_capture_terminal: true,
    selected_route_id: null,
    source_identity_adjudicated: false,
    chronology_state: 'not_adjudicated',
    version_edges_adjudicated: 0,
    class_effect: 'none'
  }));
  const targets = plan.target_units.map((unit) => {
    const candidates = unit.locator_candidates.map((candidate) => {
      const route = routeByUrl.get(candidate.url);
      ok(route, `${unit.execution_unit_id}: route receipt missing for ${candidate.url}`);
      return {
        priority: candidate.priority,
        route_id: route.route_id,
        url: candidate.url,
        terminal_state: route.terminal_state,
        resolved: route.resolved,
        final_http_status: route.final_http_status,
        final_url: route.final_url,
        final_content_type: route.final_content_type,
        final_body_bytes: route.final_body_bytes,
        final_body_sha256: route.final_body_sha256
      };
    });
    const selected = candidates.find((candidate) => candidate.resolved) || null;
    const identityAmbiguous = unit.execution_unit_id === 'AUTH-CA-HSC-1231110';
    const terminalState = selected
      ? identityAmbiguous
        ? 'source_body_recovered_identity_ambiguous'
        : 'source_body_recovered_identity_pending'
      : identityAmbiguous
        ? 'source_unavailable_identity_ambiguous_after_fixed_protocol'
        : 'source_unavailable_after_fixed_protocol';
    return {
      execution_unit_id: unit.execution_unit_id,
      unit_origin: unit.unit_origin,
      authority_class: unit.authority_class,
      reference_ids: unit.reference_ids,
      locator_receipts: candidates,
      unit_terminal_source_state: terminalState,
      source_capture_terminal: true,
      selected_route_id: selected?.route_id || null,
      selected_body_sha256: selected?.final_body_sha256 || null,
      source_identity_adjudicated: false,
      chronology_state: 'not_adjudicated',
      version_edges_adjudicated: 0,
      class_effect: 'none'
    };
  });
  return [...reused, ...targets];
}

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export async function main() {
  const { plan, receipt, planBytes } = verifyPlan();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.copyFileSync(path.join(PLAN_ROOT, 'source-plan.json'), path.join(OUTPUT, 'source-plan.json'));
  fs.copyFileSync(path.join(PLAN_ROOT, 'receipt.json'), path.join(OUTPUT, 'source-plan-receipt.json'));

  const routeReceipts = await captureRoutes(plan.routes, plan.protocol);
  const unitLedger = buildUnitLedger(plan, routeReceipts);
  const resolvedRoutes = routeReceipts.filter((route) => route.resolved).length;
  const unresolvedRoutes = routeReceipts.length - resolvedRoutes;
  const totalAttempts = routeReceipts.reduce((sum, route) => sum + route.attempt_count, 0);
  const resolvedTargetUnits = unitLedger.filter(
    (unit) => unit.unit_terminal_source_state.includes('source_body_recovered')
  ).length;
  const unavailableTargetUnits = unitLedger.filter(
    (unit) => unit.unit_terminal_source_state.includes('source_unavailable')
  ).length;
  const reusedSeedUnits = unitLedger.filter(
    (unit) => unit.unit_terminal_source_state === 'reused_terminal_seed_source_receipt'
  ).length;

  ok(routeReceipts.length === 68, 'route receipt denominator changed');
  ok(unitLedger.length === 93, 'execution-unit ledger denominator changed');
  ok(new Set(unitLedger.map((unit) => unit.execution_unit_id)).size === 93, 'duplicate execution unit');
  ok(unitLedger.every((unit) => unit.source_capture_terminal === true), 'unterminated source unit');
  ok(reusedSeedUnits === 13, 'reused seed unit count changed');
  ok(resolvedTargetUnits + unavailableTargetUnits === 80, 'target terminal accounting changed');
  ok(totalAttempts >= 68 && totalAttempts <= 136, 'attempt count outside bounded protocol');

  writeJson(path.join(OUTPUT, 'route-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-route-ledger@1',
    route_receipts: routeReceipts
  });
  writeJson(path.join(OUTPUT, 'unit-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-unit-ledger@1',
    execution_units: unitLedger
  });

  const summary = {
    schema_version: 'ssc-rd-wave02-rd04-fixed-source-capture@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    captured_at: now(),
    source_plan: {
      product_sha256: receipt.product_sha256,
      product_bytes: planBytes.length,
      execution_units: plan.counts.execution_units,
      locator_candidates: plan.counts.locator_candidates,
      unique_routes: plan.counts.unique_routes
    },
    counts: {
      execution_units: unitLedger.length,
      reused_seed_units: reusedSeedUnits,
      acquisition_target_units: 80,
      terminal_acquisition_target_units: resolvedTargetUnits + unavailableTargetUnits,
      resolved_acquisition_target_units: resolvedTargetUnits,
      unavailable_acquisition_target_units: unavailableTargetUnits,
      unique_routes: routeReceipts.length,
      terminal_routes: routeReceipts.length,
      resolved_routes: resolvedRoutes,
      unresolved_routes: unresolvedRoutes,
      total_attempts: totalAttempts,
      routes_with_content_type_mismatch: routeReceipts.filter(
        (route) => route.resolved && !route.attempts.at(-1).content_type_matches_expectation
      ).length,
      source_identity_adjudications: 0,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state:
        unavailableTargetUnits === 0
          ? 'fixed_source_protocol_complete_all_target_units_recovered_identity_adjudication_pending'
          : 'fixed_source_protocol_complete_with_typed_unavailable_units_identity_adjudication_pending',
      source_capture_complete: true,
      all_execution_units_terminal: true,
      all_target_units_terminal: true,
      source_identity_adjudication_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      stage: 'adjudicate_exact_source_identity_and_content_for_all_target_units_without_changing_the_fixed_denominator',
      source_identity_is_route_success: false,
      unavailable_source_is_record_absence: false,
      unavailable_source_is_noncompliance: false,
      outside_human_dependency: false
    },
    boundaries: {
      source_body_is_controlling_authority: false,
      source_body_is_version_edge: false,
      current_body_is_historical_version: false,
      shared_route_merges_authority_units: false,
      unavailable_route_is_record_absence: false,
      unavailable_route_is_noncompliance: false,
      content_type_match_is_source_identity: false,
      source_capture_changes_reviewed_disposition: false,
      graph_effect: 'none'
    }
  };
  writeJson(path.join(OUTPUT, 'summary.json'), summary);

  const entries = walk(OUTPUT)
    .filter((target) => path.basename(target) !== 'manifest.json')
    .sort()
    .map((target) => {
      const bytes = fs.readFileSync(target);
      return { path: rel(target), bytes: bytes.length, sha256: sha256(bytes) };
    });
  const combined = sha256(Buffer.from(
    entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''),
    'utf8'
  ));
  writeJson(path.join(OUTPUT, 'manifest.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-capture-manifest@1',
    hash_mode: 'sha256_exact_bytes',
    self_included: false,
    entries,
    combined_sha256: combined
  });

  console.log(
    `capture-source-plan: ${routeReceipts.length} routes, ${resolvedRoutes} resolved, ` +
      `${unresolvedRoutes} unresolved, ${totalAttempts} attempts`
  );
  console.log(
    `capture-source-plan: ${resolvedTargetUnits} target units recovered, ` +
      `${unavailableTargetUnits} unavailable, ${reusedSeedUnits} seed units reused`
  );
  console.log(`capture-source-plan: manifest ${entries.length} entries ${combined}`);
  return summary;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
