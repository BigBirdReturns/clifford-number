#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
export const V1_CAPTURE = path.resolve(
  process.env.RD04_SOURCE_CAPTURE_V1 || '/tmp/rd04-source-capture-v1'
);
export const COMBINED_CAPTURE = path.resolve(
  process.env.RD04_SOURCE_ROUTE_CORRECTION || '/tmp/rd04-source-route-correction'
);
export const OUTPUT = path.resolve(
  process.env.RD04_ECFR_CORRECTION_PLAN_OUTPUT || '/tmp/rd04-ecfr-correction-plan'
);
export const ANTIBOT_RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/ecfr-antibot-receipt.json'
);
export const COMBINED_RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/source-route-correction-receipt.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };

export const SNAPSHOT_DATE = '2026-07-30';

export const corrections = Object.freeze([
  { original_route_id: 'RD04-ROUTE-052', unit_id: 'AUTH-45-CFR-164.502', title: 45, part: '164', section: '164.502' },
  { original_route_id: 'RD04-ROUTE-053', unit_id: 'AUTH-7-CFR-271.2', title: 7, part: '271', section: '271.2' },
  { original_route_id: 'RD04-ROUTE-054', unit_id: 'AUTH-7-CFR-273.1', title: 7, part: '273', section: '273.1' },
  { original_route_id: 'RD04-ROUTE-055', unit_id: 'AUTH-7-CFR-273.10', title: 7, part: '273', section: '273.10' },
  { original_route_id: 'RD04-ROUTE-056', unit_id: 'AUTH-7-CFR-273.12', title: 7, part: '273', section: '273.12' },
  { original_route_id: 'RD04-ROUTE-057', unit_id: 'AUTH-7-CFR-273.2', title: 7, part: '273', section: '273.2' },
  { original_route_id: 'RD04-ROUTE-058', unit_id: 'AUTH-7-CFR-273.24', title: 7, part: '273', section: '273.24' },
  { original_route_id: 'RD04-ROUTE-059', unit_id: 'AUTH-7-CFR-273.7', title: 7, part: '273', section: '273.7' }
]);

export function apiUrl({ title, part, section }, date = SNAPSHOT_DATE) {
  const query = new URLSearchParams({ part, section });
  return `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${title}.xml?${query.toString()}`;
}

function verifyArtifacts() {
  const antibot = readJson(ANTIBOT_RECEIPT_PATH);
  const combinedReceipt = readJson(COMBINED_RECEIPT_PATH);
  ok(antibot.counts?.affected_routes === 8 && antibot.counts?.affected_units === 8, 'anti-bot denominator changed');
  ok(antibot.correction_basis?.snapshot_date === SNAPSHOT_DATE, 'snapshot date changed');
  ok(antibot.current_result?.anti_bot_identity_adjudication_complete === true, 'anti-bot adjudication incomplete');
  ok(combinedReceipt.counts?.execution_units === 93, 'combined execution-unit denominator changed');
  ok(combinedReceipt.counts?.combined_resolved_acquisition_target_units === 80, 'combined target recovery changed');

  const routePath = path.join(V1_CAPTURE, 'route-ledger.json');
  const unitPath = path.join(V1_CAPTURE, 'unit-ledger.json');
  const combinedUnitPath = path.join(COMBINED_CAPTURE, 'combined-unit-ledger.json');
  const correctionSummaryPath = path.join(COMBINED_CAPTURE, 'summary.json');
  const expected = [
    [routePath, 164968, 'af641ff2d60a7c8484b693fa81053b34941613052dfebef74cb13418ad3bc1ef'],
    [unitPath, 115311, 'b9a5ee607bee2f8687961c7d8a676966b19676b00bffc9acadf93fb682042e89'],
    [combinedUnitPath, 111271, 'e343a873dee43194a66d2efef0a515763fb00f1e69eab767cfb708e75a453760'],
    [correctionSummaryPath, 2981, 'e6971ad43cca64c5efe0d5e2fa81e5a151155a47f1441483f89816ffbfe9be4a']
  ];
  for (const [target, bytesExpected, shaExpected] of expected) {
    const bytes = fs.readFileSync(target);
    ok(bytes.length === bytesExpected, `${path.basename(target)}: byte count changed`);
    ok(sha256(bytes) === shaExpected, `${path.basename(target)}: digest changed`);
  }
  const routes = readJson(routePath).route_receipts;
  const originalUnits = readJson(unitPath).execution_units;
  const combinedUnits = readJson(combinedUnitPath).execution_units;
  const correctionSummary = readJson(correctionSummaryPath);
  ok(routes.length === 68 && originalUnits.length === 93 && combinedUnits.length === 93, 'artifact ledger denominator changed');
  ok(correctionSummary.counts?.combined_resolved_acquisition_target_units === 80, 'combined capture state changed');
  return { antibot, routes, originalUnits, combinedUnits };
}

export function buildPlan(antibot, routes, originalUnits, combinedUnits) {
  const routeMap = new Map(routes.map((route) => [route.route_id, route]));
  const originalUnitMap = new Map(originalUnits.map((unit) => [unit.execution_unit_id, unit]));
  const combinedUnitMap = new Map(combinedUnits.map((unit) => [unit.execution_unit_id, unit]));
  const receiptMap = new Map(antibot.affected_routes.map((route) => [route.route_id, route]));

  const correctedRoutes = corrections.map((correction, index) => {
    const originalRoute = routeMap.get(correction.original_route_id);
    const originalUnit = originalUnitMap.get(correction.unit_id);
    const combinedUnit = combinedUnitMap.get(correction.unit_id);
    const receipt = receiptMap.get(correction.original_route_id);
    ok(originalRoute && originalUnit && combinedUnit && receipt, `${correction.unit_id}: source lineage missing`);
    ok(originalRoute.resolved === true && originalRoute.terminal_state === 'http_success', `${correction.original_route_id}: original route state changed`);
    ok(originalRoute.final_http_status === 200, `${correction.original_route_id}: original HTTP state changed`);
    ok(new URL(originalRoute.final_url).hostname === 'unblock.federalregister.gov', `${correction.original_route_id}: final host changed`);
    ok(originalRoute.final_content_type.startsWith('text/html'), `${correction.original_route_id}: content type changed`);
    ok(originalRoute.final_body_bytes === receipt.body_bytes && originalRoute.final_body_sha256 === receipt.body_sha256, `${correction.original_route_id}: body receipt changed`);
    ok(originalUnit.selected_route_id === correction.original_route_id, `${correction.unit_id}: original selected route changed`);
    ok(originalUnit.selected_body_sha256 === receipt.body_sha256, `${correction.unit_id}: original body selection changed`);
    ok(combinedUnit.execution_unit_id === correction.unit_id, `${correction.unit_id}: combined unit missing`);
    ok(combinedUnit.selected_body_sha256 === receipt.body_sha256, `${correction.unit_id}: combined body changed`);
    const url = apiUrl(correction);
    ok(new URL(url).hostname === 'www.ecfr.gov', `${correction.unit_id}: API host changed`);
    return {
      correction_route_id: `RD04-ECFR-API-${String(index + 1).padStart(2, '0')}`,
      original_route_id: correction.original_route_id,
      target_unit_id: correction.unit_id,
      title: correction.title,
      part: correction.part,
      section: correction.section,
      snapshot_date: SNAPSHOT_DATE,
      original_url: originalRoute.url,
      original_http_status: originalRoute.final_http_status,
      original_final_url: originalRoute.final_url,
      original_content_type: originalRoute.final_content_type,
      original_body_bytes: originalRoute.final_body_bytes,
      original_body_sha256: originalRoute.final_body_sha256,
      corrected_url: url,
      official_host: 'www.ecfr.gov',
      expected_content_class: 'application_xml',
      identity_rule: 'exact_requested_section_observed_in_eCFR_section_XML',
      exact_url_frozen_before_fetch: true,
      outcome_selected: false
    };
  });

  ok(correctedRoutes.length === 8, 'eCFR route denominator changed');
  ok(new Set(correctedRoutes.map((route) => route.target_unit_id)).size === 8, 'duplicate eCFR unit');
  ok(new Set(correctedRoutes.map((route) => route.corrected_url)).size === 8, 'duplicate eCFR URL');

  return {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-correction-plan@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    as_of: '2026-08-02',
    parent_capture: {
      workflow_run: 30768610215,
      artifact_id: 8839771818,
      artifact_zip_sha256: 'e5911751c8a68b779301eb72b67b0e28b6b314822923e783276d7c91a99ccc99',
      anti_bot_route_receipts: 8,
      anti_bot_unit_receipts: 8
    },
    combined_capture: {
      workflow_run: 30769105132,
      artifact_id: 8839928888,
      artifact_zip_sha256: '981fd8d78dc02f09760a4b75c79ae56b23dc4d13312a4a876aa3c46046f2563b',
      execution_units: 93,
      units_with_source_body: 93
    },
    official_api_contract: {
      documentation_url: 'https://www.ecfr.gov/developers/documentation/api/v1',
      titles_metadata_url: 'https://www.ecfr.gov/api/versioner/v1/titles.json',
      base_url: 'https://www.ecfr.gov',
      versioner_path: '/api/versioner/v1/full/{date}/title-{title}.xml',
      snapshot_date: SNAPSHOT_DATE,
      snapshot_date_basis: 'official_titles_metadata_up_to_date_as_of_observed_through_2026_08_02_cutoff',
      section_requires_part: true,
      response_content_class: 'application_xml'
    },
    correction_law: {
      maximum_attempts_per_route: 2,
      connect_timeout_seconds: 15,
      total_timeout_seconds: 60,
      follow_redirects: true,
      concurrent_routes: 4,
      original_receipts_rewritten: false,
      already_valid_non_ecfr_units_refetched: false,
      outcome_selected_retry: false,
      http_success_is_source_identity: false,
      wrong_final_host_is_source_identity: false,
      api_body_without_exact_section_is_source_identity: false,
      failed_api_route_is_record_absence: false,
      failed_api_route_is_noncompliance: false
    },
    corrected_routes: correctedRoutes,
    counts: {
      original_antibot_routes: 8,
      corrected_api_routes: 8,
      affected_units: 8,
      preserved_non_ecfr_execution_units: 85,
      combined_execution_units: 93,
      correction_requests_executed: 0,
      correction_requests_terminal: 0,
      exact_section_identities_observed: 0,
      source_identity_adjudications: 8,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: 'eight_ecfr_api_routes_frozen_capture_pending',
      correction_plan_frozen: true,
      api_capture_complete: false,
      affected_unit_identity_adjudication_complete: false,
      combined_source_identity_adjudication_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      api_route_is_source_identity: false,
      api_xml_is_version_edge: false,
      exact_section_identity_is_controlling_interpretation: false,
      anti_bot_receipt_erased: false,
      corrected_route_rewrites_original_receipt: false,
      unavailable_api_route_is_record_absence: false,
      unavailable_api_route_is_noncompliance: false,
      correction_changes_reviewed_disposition: false,
      graph_effect: 'none'
    }
  };
}

export function main() {
  const { antibot, routes, originalUnits, combinedUnits } = verifyArtifacts();
  const plan = buildPlan(antibot, routes, originalUnits, combinedUnits);
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  writeJson(path.join(OUTPUT, 'ecfr-api-correction-plan.json'), plan);
  const bytes = fs.readFileSync(path.join(OUTPUT, 'ecfr-api-correction-plan.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-ecfr-api-correction-plan-receipt@1',
    product_path: 'ecfr-api-correction-plan.json',
    product_bytes: bytes.length,
    product_sha256: sha256(bytes),
    counts: plan.counts,
    terminal_state: plan.current_result.terminal_state,
    correction_plan_frozen: true,
    class_closed: false,
    outside_human_dependency: false
  });
  console.log(`build-ecfr-api-correction-plan: ${plan.counts.corrected_api_routes} routes, ${plan.counts.affected_units} units, snapshot ${SNAPSHOT_DATE}`);
  return plan;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { main(); } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
