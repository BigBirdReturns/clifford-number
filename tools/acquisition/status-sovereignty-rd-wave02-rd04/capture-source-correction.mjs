#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PLAN_ROOT = path.resolve(
  process.env.RD04_SOURCE_CORRECTION_PLAN || '/tmp/rd04-source-correction-plan'
);
export const V1_CAPTURE = path.resolve(
  process.env.RD04_SOURCE_CAPTURE_V1 || '/tmp/rd04-source-capture-v1'
);
export const OUTPUT = path.resolve(
  process.env.RD04_SOURCE_CORRECTION_OUTPUT || '/tmp/rd04-source-correction'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const now = () => new Date().toISOString();
const ensureFile = (target) => { if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.alloc(0)); };
const rel = (target) => path.relative(OUTPUT, target).split(path.sep).join('/');

function verifyInputs() {
  const planPath = path.join(PLAN_ROOT, 'correction-plan.json');
  const receiptPath = path.join(PLAN_ROOT, 'receipt.json');
  ok(fs.existsSync(planPath) && fs.existsSync(receiptPath), 'correction plan incomplete');
  const planBytes = fs.readFileSync(planPath);
  const receipt = readJson(receiptPath);
  ok(planBytes.length === receipt.product_bytes, 'correction-plan byte count changed');
  ok(sha256(planBytes) === receipt.product_sha256, 'correction-plan digest changed');
  const plan = JSON.parse(planBytes.toString('utf8'));
  ok(plan.schema_version === 'ssc-rd-wave02-rd04-source-route-correction-plan@1', 'correction-plan schema changed');
  ok(plan.counts.corrected_routes === 9 && plan.counts.affected_target_units === 10, 'correction denominator changed');
  ok(plan.correction_law.original_receipts_rewritten === false, 'original receipt rewrite authorized');
  ok(plan.correction_law.outcome_selected_retry === false, 'outcome-selected retry authorized');

  const originalSummary = readJson(path.join(V1_CAPTURE, 'summary.json'));
  const originalRoutes = readJson(path.join(V1_CAPTURE, 'route-ledger.json')).route_receipts;
  const originalUnits = readJson(path.join(V1_CAPTURE, 'unit-ledger.json')).execution_units;
  ok(originalSummary.counts.execution_units === 93, 'original execution-unit denominator changed');
  ok(originalSummary.counts.resolved_acquisition_target_units === 70, 'original resolved target count changed');
  ok(originalSummary.counts.unavailable_acquisition_target_units === 10, 'original unavailable target count changed');
  ok(originalSummary.counts.resolved_routes === 59 && originalSummary.counts.unresolved_routes === 9, 'original route state changed');
  ok(originalRoutes.length === 68 && originalUnits.length === 93, 'original ledgers incomplete');
  return { plan, receipt, planBytes, originalSummary, originalRoutes, originalUnits };
}

function captureAttempt(route, attempt, law, routeDir) {
  return new Promise((resolve) => {
    const attemptDir = path.join(routeDir, `attempt-${attempt}`);
    fs.mkdirSync(attemptDir, { recursive: true });
    const headersPath = path.join(attemptDir, 'headers.txt');
    const bodyPath = path.join(attemptDir, 'body.bin');
    const stderrPath = path.join(attemptDir, 'curl-stderr.txt');
    const metaPath = path.join(attemptDir, 'curl-meta.txt');
    const startedAt = now();
    const args = [
      '--location', '--silent', '--show-error', '--compressed',
      '--connect-timeout', String(law.connect_timeout_seconds),
      '--max-time', String(law.total_timeout_seconds),
      '--user-agent', 'clifford-number-rd04-route-correction/1.0',
      '--dump-header', headersPath,
      '--output', bodyPath,
      '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n%{num_redirects}\n',
      route.corrected_url
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
      ensureFile(headersPath);
      ensureFile(bodyPath);
      fs.writeFileSync(stderrPath, stderr, 'utf8');
      fs.writeFileSync(metaPath, stdout, 'utf8');
      const lines = stdout.split(/\r?\n/);
      const httpStatus = Number(lines[0] || 0);
      const finalUrl = lines[1] || route.corrected_url;
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
        finished_at: now(),
        request_url: route.corrected_url,
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
          /pdf/i.test(contentType) || body.subarray(0, 5).toString('ascii') === '%PDF-',
        resolved
      });
    });
  });
}

function terminalState(attempts) {
  const last = attempts.at(-1);
  if (last.resolved) return 'http_success';
  if (last.curl_exit !== 0) return 'transport_failure_after_bounded_retry';
  if (!(last.http_status >= 200 && last.http_status < 300)) return 'http_non_success_after_bounded_retry';
  return 'empty_body_after_bounded_retry';
}

async function captureRoute(route, law) {
  const routeDir = path.join(OUTPUT, 'routes', route.correction_route_id);
  fs.mkdirSync(routeDir, { recursive: true });
  const attempts = [];
  for (let attempt = 1; attempt <= law.maximum_attempts_per_corrected_route; attempt += 1) {
    const receipt = await captureAttempt(route, attempt, law, routeDir);
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

async function captureRoutes(routes, law) {
  const results = new Array(routes.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= routes.length) return;
      results[index] = await captureRoute(routes[index], law);
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(law.concurrent_routes, routes.length) },
    () => worker()
  ));
  return results;
}

function buildCorrectionUnits(routes) {
  return routes.flatMap((route) => route.target_unit_ids.map((unitId) => ({
    execution_unit_id: unitId,
    correction_route_id: route.correction_route_id,
    original_route_id: route.original_route_id,
    original_terminal_state: route.original_terminal_state,
    corrected_url: route.corrected_url,
    correction_terminal_state: route.terminal_state,
    source_capture_terminal: true,
    unit_terminal_source_state: route.resolved
      ? 'source_body_recovered_by_archive_route_correction_identity_pending'
      : 'source_unavailable_after_archive_route_correction',
    selected_body_sha256: route.resolved ? route.final_body_sha256 : null,
    source_identity_adjudicated: false,
    chronology_state: 'not_adjudicated',
    version_edges_adjudicated: 0,
    class_effect: 'none'
  })));
}

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export async function main() {
  const { plan, receipt, planBytes, originalSummary, originalRoutes, originalUnits } = verifyInputs();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.copyFileSync(path.join(PLAN_ROOT, 'correction-plan.json'), path.join(OUTPUT, 'correction-plan.json'));
  fs.copyFileSync(path.join(PLAN_ROOT, 'receipt.json'), path.join(OUTPUT, 'correction-plan-receipt.json'));

  const correctionRoutes = await captureRoutes(plan.corrected_routes, plan.correction_law);
  const correctionUnits = buildCorrectionUnits(correctionRoutes);
  const resolvedRoutes = correctionRoutes.filter((route) => route.resolved).length;
  const unresolvedRoutes = correctionRoutes.length - resolvedRoutes;
  const totalAttempts = correctionRoutes.reduce((sum, route) => sum + route.attempt_count, 0);
  const resolvedUnits = correctionUnits.filter((unit) => unit.unit_terminal_source_state.includes('source_body_recovered')).length;
  const unresolvedUnits = correctionUnits.length - resolvedUnits;
  ok(correctionRoutes.length === 9 && correctionUnits.length === 10, 'correction denominator changed');
  ok(new Set(correctionUnits.map((unit) => unit.execution_unit_id)).size === 10, 'duplicate corrected unit');
  ok(totalAttempts >= 9 && totalAttempts <= 18, 'correction attempts escaped bound');
  ok(correctionRoutes.every((route) => route.attempt_count >= 1 && route.attempt_count <= 2), 'route attempt count invalid');
  ok(correctionUnits.every((unit) => unit.source_capture_terminal === true), 'unterminated corrected unit');

  const correctedIds = new Set(correctionUnits.map((unit) => unit.execution_unit_id));
  const combinedUnits = originalUnits.map((unit) => {
    if (!correctedIds.has(unit.execution_unit_id)) return unit;
    return correctionUnits.find((row) => row.execution_unit_id === unit.execution_unit_id);
  });
  ok(combinedUnits.length === 93 && new Set(combinedUnits.map((unit) => unit.execution_unit_id)).size === 93, 'combined unit ledger changed');
  const combinedResolvedTargets = 70 + resolvedUnits;
  const combinedUnavailableTargets = 10 - resolvedUnits;
  ok(combinedResolvedTargets + combinedUnavailableTargets === 80, 'combined target accounting changed');

  writeJson(path.join(OUTPUT, 'correction-route-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-route-correction-ledger@1',
    correction_routes: correctionRoutes
  });
  writeJson(path.join(OUTPUT, 'correction-unit-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-unit-correction-ledger@1',
    correction_units: correctionUnits
  });
  writeJson(path.join(OUTPUT, 'combined-unit-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-combined-source-unit-ledger@1',
    execution_units: combinedUnits
  });

  const summary = {
    schema_version: 'ssc-rd-wave02-rd04-source-route-correction@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    captured_at: now(),
    correction_plan: {
      product_bytes: planBytes.length,
      product_sha256: receipt.product_sha256,
      corrected_routes: 9,
      affected_target_units: 10
    },
    original_capture: {
      workflow_run: 30768610215,
      artifact_id: 8839771818,
      artifact_zip_sha256: 'e5911751c8a68b779301eb72b67b0e28b6b314822923e783276d7c91a99ccc99',
      original_route_receipts_preserved: originalRoutes.length,
      original_attempts_preserved: originalSummary.counts.total_attempts,
      original_resolved_target_units: 70,
      original_unavailable_target_units: 10
    },
    counts: {
      execution_units: 93,
      reused_seed_units: 13,
      acquisition_target_units: 80,
      correction_routes: 9,
      terminal_correction_routes: 9,
      resolved_correction_routes: resolvedRoutes,
      unresolved_correction_routes: unresolvedRoutes,
      correction_attempts: totalAttempts,
      correction_target_units: 10,
      resolved_correction_target_units: resolvedUnits,
      unresolved_correction_target_units: unresolvedUnits,
      combined_resolved_acquisition_target_units: combinedResolvedTargets,
      combined_unavailable_acquisition_target_units: combinedUnavailableTargets,
      combined_terminal_acquisition_target_units: 80,
      original_route_receipts: 68,
      combined_route_execution_receipts: 77,
      source_identity_adjudications: 0,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: combinedUnavailableTargets === 0
        ? 'source_route_correction_complete_all_target_units_recovered_identity_adjudication_pending'
        : 'source_route_correction_complete_with_typed_unavailable_units_identity_adjudication_pending',
      correction_capture_complete: true,
      combined_source_capture_complete: true,
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
      stage: 'adjudicate_exact_source_identity_and_content_for_all_ninety_three_execution_units',
      successful_retry_is_source_identity: false,
      unresolved_retry_is_record_absence: false,
      unresolved_retry_is_noncompliance: false,
      outside_human_dependency: false
    },
    boundaries: {
      correction_rewrites_original_receipt: false,
      archive_entry_is_source_body: false,
      corrected_route_success_is_source_identity: false,
      source_body_is_controlling_authority: false,
      source_body_is_version_edge: false,
      unresolved_retry_is_record_absence: false,
      unresolved_retry_is_noncompliance: false,
      correction_changes_reviewed_disposition: false,
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
    schema_version: 'ssc-rd-wave02-rd04-source-route-correction-manifest@1',
    hash_mode: 'sha256_exact_bytes',
    self_included: false,
    entries,
    combined_sha256: combined
  });

  console.log(`capture-source-correction: ${resolvedRoutes}/9 routes resolved, ${resolvedUnits}/10 units recovered, ${totalAttempts} attempts`);
  console.log(`capture-source-correction: combined targets ${combinedResolvedTargets} recovered, ${combinedUnavailableTargets} unavailable`);
  console.log(`capture-source-correction: manifest ${entries.length} entries ${combined}`);
  return summary;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
