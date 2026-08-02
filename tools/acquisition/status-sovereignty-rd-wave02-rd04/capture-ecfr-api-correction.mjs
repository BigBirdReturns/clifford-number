#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PLAN_ROOT = path.resolve(
  process.env.RD04_ECFR_CORRECTION_PLAN || '/tmp/rd04-ecfr-correction-plan'
);
export const COMBINED_CAPTURE = path.resolve(
  process.env.RD04_SOURCE_ROUTE_CORRECTION || '/tmp/rd04-source-route-correction'
);
export const OUTPUT = path.resolve(
  process.env.RD04_ECFR_CORRECTION_OUTPUT || '/tmp/rd04-ecfr-correction'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const now = () => new Date().toISOString();
const ensureFile = (target) => { if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.alloc(0)); };
const rel = (target) => path.relative(OUTPUT, target).split(path.sep).join('/');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function verifyInputs() {
  const planPath = path.join(PLAN_ROOT, 'ecfr-api-correction-plan.json');
  const receiptPath = path.join(PLAN_ROOT, 'receipt.json');
  ok(fs.existsSync(planPath) && fs.existsSync(receiptPath), 'eCFR correction plan incomplete');
  const planBytes = fs.readFileSync(planPath);
  const receipt = readJson(receiptPath);
  ok(planBytes.length === receipt.product_bytes, 'eCFR plan byte count changed');
  ok(sha256(planBytes) === receipt.product_sha256, 'eCFR plan digest changed');
  const plan = JSON.parse(planBytes.toString('utf8'));
  ok(plan.schema_version === 'ssc-rd-wave02-rd04-ecfr-api-correction-plan@1', 'eCFR plan schema changed');
  ok(plan.counts.corrected_api_routes === 8 && plan.counts.affected_units === 8, 'eCFR correction denominator changed');
  ok(plan.official_api_contract.snapshot_date === '2026-07-30', 'eCFR snapshot date changed');
  ok(plan.correction_law.original_receipts_rewritten === false, 'original receipt rewrite authorized');
  ok(plan.correction_law.outcome_selected_retry === false, 'outcome-selected retry authorized');

  const combinedUnitPath = path.join(COMBINED_CAPTURE, 'combined-unit-ledger.json');
  const summaryPath = path.join(COMBINED_CAPTURE, 'summary.json');
  const combinedBytes = fs.readFileSync(combinedUnitPath);
  const summaryBytes = fs.readFileSync(summaryPath);
  ok(combinedBytes.length === 111271, 'combined unit ledger byte count changed');
  ok(sha256(combinedBytes) === 'e343a873dee43194a66d2efef0a515763fb00f1e69eab767cfb708e75a453760', 'combined unit ledger digest changed');
  ok(summaryBytes.length === 2981, 'combined summary byte count changed');
  ok(sha256(summaryBytes) === 'e6971ad43cca64c5efe0d5e2fa81e5a151155a47f1441483f89816ffbfe9be4a', 'combined summary digest changed');
  const combinedUnits = JSON.parse(combinedBytes.toString('utf8')).execution_units;
  const combinedSummary = JSON.parse(summaryBytes.toString('utf8'));
  ok(combinedUnits.length === 93, 'combined execution-unit denominator changed');
  ok(combinedSummary.counts.combined_resolved_acquisition_target_units === 80, 'combined target recovery changed');
  return { plan, receipt, planBytes, combinedUnits, combinedSummary };
}

export function classifyEcfrBody(body, finalUrl, contentType, route) {
  const text = body.toString('utf8');
  let finalHost = '';
  let finalPath = '';
  try {
    const parsed = new URL(finalUrl);
    finalHost = parsed.hostname.toLowerCase();
    finalPath = parsed.pathname;
  } catch {}
  const apiHostObserved = finalHost === 'www.ecfr.gov';
  const apiPathObserved = finalPath.startsWith('/api/versioner/v1/full/');
  const requestAccessObserved = /request\s+access|aggressive\s+automated\s+scraping|unblock\.federalregister\.gov/i.test(text);
  const xmlObserved = /(?:application|text)\/xml/i.test(contentType) || /^\s*<\?xml\b/i.test(text) || /^\s*<(?:ECFR|DIV\d)\b/i.test(text);
  const section = escapeRegex(route.section);
  const sectionPatterns = [
    new RegExp(`<SECTNO[^>]*>[\\s\\S]{0,120}?(?:§|&#167;|&sect;)?\\s*${section}(?=\\s|<|$)`, 'i'),
    new RegExp(`<HEAD[^>]*>[\\s\\S]{0,160}?(?:§|&#167;|&sect;)?\\s*${section}(?=\\s|<|$)`, 'i'),
    new RegExp(`\\bSECTION\\s*=\\s*["']${section}["']`, 'i')
  ];
  const exactSectionObserved = sectionPatterns.some((pattern) => pattern.test(text));
  const exactIdentityObserved =
    apiHostObserved &&
    apiPathObserved &&
    xmlObserved &&
    !requestAccessObserved &&
    exactSectionObserved;
  return {
    api_host_observed: apiHostObserved,
    api_path_observed: apiPathObserved,
    xml_observed: xmlObserved,
    request_access_observed: requestAccessObserved,
    exact_section_observed: exactSectionObserved,
    exact_identity_observed: exactIdentityObserved,
    identity_state: exactIdentityObserved
      ? 'exact_requested_section_identity_observed'
      : requestAccessObserved
        ? 'automated_request_access_body_observed'
        : !apiHostObserved || !apiPathObserved
          ? 'wrong_final_target_observed'
          : !xmlObserved
            ? 'non_xml_body_observed'
            : 'xml_body_recovered_exact_section_identity_not_observed'
  };
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
      '--user-agent', 'clifford-number-rd04-ecfr-api/1.0',
      '--header', 'Accept: application/xml',
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
      const transportResolved = curlExit === 0 && httpStatus >= 200 && httpStatus < 300 && body.length > 0;
      const identity = classifyEcfrBody(body, finalUrl, contentType, route);
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
        transport_resolved: transportResolved,
        ...identity
      });
    });
  });
}

function routeTerminalState(attempts) {
  const last = attempts.at(-1);
  if (last.exact_identity_observed) return 'exact_requested_section_identity_observed';
  if (last.transport_resolved) return last.identity_state;
  if (last.curl_exit !== 0) return 'transport_failure_after_bounded_retry';
  if (!(last.http_status >= 200 && last.http_status < 300)) return 'http_non_success_after_bounded_retry';
  return 'empty_body_after_bounded_retry';
}

async function captureRoute(route, law) {
  const routeDir = path.join(OUTPUT, 'routes', route.correction_route_id);
  fs.mkdirSync(routeDir, { recursive: true });
  const attempts = [];
  for (let attempt = 1; attempt <= law.maximum_attempts_per_route; attempt += 1) {
    const receipt = await captureAttempt(route, attempt, law, routeDir);
    attempts.push(receipt);
    if (receipt.transport_resolved) break;
  }
  const terminalState = routeTerminalState(attempts);
  const final = attempts.at(-1);
  return {
    ...route,
    attempts,
    attempt_count: attempts.length,
    terminal_state: terminalState,
    transport_resolved: final.transport_resolved,
    exact_identity_observed: final.exact_identity_observed,
    final_http_status: final.http_status,
    final_url: final.final_url,
    final_content_type: final.content_type,
    final_body_bytes: final.body_bytes,
    final_body_sha256: final.body_sha256,
    identity_state: final.identity_state,
    source_identity_adjudicated: true,
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
  return routes.map((route) => ({
    execution_unit_id: route.target_unit_id,
    unit_origin: 'ecfr_api_source_identity_correction',
    original_route_id: route.original_route_id,
    original_body_sha256: route.original_body_sha256,
    original_identity_state: 'wrong_final_host_automated_request_access_body',
    correction_route_id: route.correction_route_id,
    snapshot_date: route.snapshot_date,
    title: route.title,
    part: route.part,
    section: route.section,
    correction_terminal_state: route.terminal_state,
    source_capture_terminal: true,
    source_body_custody_preserved: true,
    selected_body_sha256: route.transport_resolved ? route.final_body_sha256 : null,
    source_identity_adjudicated: true,
    source_identity_state: route.exact_identity_observed
      ? 'exact_requested_section_identity_observed'
      : route.terminal_state,
    exact_section_identity_observed: route.exact_identity_observed,
    chronology_state: 'not_adjudicated',
    version_edges_adjudicated: 0,
    class_effect: 'none'
  }));
}

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export async function main() {
  const { plan, receipt, planBytes, combinedUnits, combinedSummary } = verifyInputs();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.copyFileSync(path.join(PLAN_ROOT, 'ecfr-api-correction-plan.json'), path.join(OUTPUT, 'ecfr-api-correction-plan.json'));
  fs.copyFileSync(path.join(PLAN_ROOT, 'receipt.json'), path.join(OUTPUT, 'ecfr-api-correction-plan-receipt.json'));

  const routes = await captureRoutes(plan.corrected_routes, plan.correction_law);
  const correctionUnits = buildCorrectionUnits(routes);
  const correctedIds = new Set(correctionUnits.map((unit) => unit.execution_unit_id));
  const combined = combinedUnits.map((unit) =>
    correctedIds.has(unit.execution_unit_id)
      ? correctionUnits.find((row) => row.execution_unit_id === unit.execution_unit_id)
      : unit
  );
  const exactIdentities = routes.filter((route) => route.exact_identity_observed).length;
  const identityFailures = routes.length - exactIdentities;
  const transportResolved = routes.filter((route) => route.transport_resolved).length;
  const transportUnavailable = routes.length - transportResolved;
  const totalAttempts = routes.reduce((sum, route) => sum + route.attempt_count, 0);

  ok(routes.length === 8 && correctionUnits.length === 8, 'eCFR correction denominator changed');
  ok(new Set(correctionUnits.map((unit) => unit.execution_unit_id)).size === 8, 'duplicate eCFR correction unit');
  ok(combined.length === 93 && new Set(combined.map((unit) => unit.execution_unit_id)).size === 93, 'combined ledger changed');
  ok(totalAttempts >= 8 && totalAttempts <= 16, 'eCFR attempts escaped bound');
  ok(routes.every((route) => route.attempt_count >= 1 && route.attempt_count <= 2), 'invalid eCFR attempt count');
  ok(correctionUnits.every((unit) => unit.source_capture_terminal && unit.source_identity_adjudicated), 'unterminated eCFR unit');
  ok(combinedSummary.counts.combined_resolved_acquisition_target_units === 80, 'source-body denominator changed');

  writeJson(path.join(OUTPUT, 'ecfr-api-route-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-route-ledger@1',
    routes
  });
  writeJson(path.join(OUTPUT, 'ecfr-api-unit-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-unit-ledger@1',
    execution_units: correctionUnits
  });
  writeJson(path.join(OUTPUT, 'combined-unit-ledger.json'), {
    schema_version: 'ssc-rd-wave02-rd04-combined-source-identity-unit-ledger@1',
    execution_units: combined
  });

  const summary = {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-correction@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    captured_at: now(),
    correction_plan: {
      product_bytes: planBytes.length,
      product_sha256: receipt.product_sha256,
      corrected_routes: 8,
      affected_units: 8,
      snapshot_date: plan.official_api_contract.snapshot_date
    },
    original_antibot_custody: {
      workflow_run: 30768610215,
      artifact_id: 8839771818,
      preserved_route_receipts: 8,
      preserved_body_receipts: 8,
      original_receipts_rewritten: false
    },
    combined_source_custody: {
      workflow_run: 30769105132,
      artifact_id: 8839928888,
      execution_units: 93,
      units_with_any_body_custody: 93
    },
    counts: {
      execution_units: 93,
      affected_ecfr_units: 8,
      preserved_non_ecfr_units: 85,
      corrected_api_routes: 8,
      terminal_api_routes: 8,
      transport_resolved_api_routes: transportResolved,
      transport_unavailable_api_routes: transportUnavailable,
      exact_section_identities_observed: exactIdentities,
      identity_failures_or_unavailable: identityFailures,
      api_attempts: totalAttempts,
      source_identity_adjudications_this_stage: 8,
      combined_source_identity_adjudications: 8,
      combined_source_identity_pending_units: 85,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: exactIdentities === 8
        ? 'ecfr_api_correction_complete_eight_exact_section_identities_observed_remaining_identity_adjudication_pending'
        : 'ecfr_api_correction_complete_with_typed_identity_failures_remaining_identity_adjudication_pending',
      api_capture_complete: true,
      affected_unit_identity_adjudication_complete: true,
      affected_unit_exact_identity_complete: exactIdentities === 8,
      combined_source_identity_adjudication_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    next_handoff: {
      stage: 'adjudicate_source_identity_for_the_remaining_eighty_five_execution_units',
      exact_section_identity_is_version_edge: false,
      exact_section_identity_is_controlling_interpretation: false,
      outside_human_dependency: false
    },
    boundaries: {
      api_route_is_source_identity: false,
      exact_section_identity_is_version_edge: false,
      exact_section_identity_is_controlling_interpretation: false,
      anti_bot_receipts_erased: false,
      unavailable_api_route_is_record_absence: false,
      unavailable_api_route_is_noncompliance: false,
      source_identity_adjudication_changes_reviewed_disposition: false,
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
  const combinedSha = sha256(Buffer.from(
    entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''),
    'utf8'
  ));
  writeJson(path.join(OUTPUT, 'manifest.json'), {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-correction-manifest@1',
    hash_mode: 'sha256_exact_bytes',
    self_included: false,
    entries,
    combined_sha256: combinedSha
  });

  console.log(`capture-ecfr-api-correction: ${transportResolved}/8 transport resolved, ${exactIdentities}/8 exact identities, ${totalAttempts} attempts`);
  console.log(`capture-ecfr-api-correction: combined 93 units, 8 identity adjudicated, 85 pending`);
  console.log(`capture-ecfr-api-correction: manifest ${entries.length} entries ${combinedSha}`);
  return summary;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
