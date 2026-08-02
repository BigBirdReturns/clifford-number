#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
export const V1_CAPTURE = path.resolve(
  process.env.RD04_SOURCE_CAPTURE_V1 || '/tmp/rd04-source-capture-v1'
);
export const OUTPUT = path.resolve(
  process.env.RD04_SOURCE_CORRECTION_PLAN_OUTPUT || '/tmp/rd04-source-correction-plan'
);
export const V1_RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/source-capture-receipt-v1.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export const corrections = Object.freeze([
  {
    original_route_id: 'RD04-ROUTE-016',
    target_unit_ids: ['AUTH-CA-ACIN-I-88-16'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACIN/2016/I-88_16.pdf?ver=2019-06-07-100852-017',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2016-all-county-information-notices',
    identity_basis: 'exact ACIN I-88-16 entry and official PDF link on the 2016 CDSS ACIN archive'
  },
  {
    original_route_id: 'RD04-ROUTE-019',
    target_unit_ids: ['AUTH-CA-ACL-11-22'],
    corrected_url: 'https://www.cdss.ca.gov/lettersnotices/entres/getinfo/acl/2011/11-22.pdf',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2011-all-county-letters',
    identity_basis: 'exact ACL 11-22 entry and historical CDSS PDF link'
  },
  {
    original_route_id: 'RD04-ROUTE-020',
    target_unit_ids: ['AUTH-CA-ACL-15-08'],
    corrected_url: 'https://www.cdss.ca.gov/lettersnotices/entres/getinfo/acl/2015/15-08.pdf',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2015-all-county-letters',
    identity_basis: 'exact ACL 15-08 entry and historical CDSS PDF link'
  },
  {
    original_route_id: 'RD04-ROUTE-021',
    target_unit_ids: ['AUTH-CA-ACL-17-30'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACL/2017/17-30.pdf?ver=2019-06-25-140132-070',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2017-all-county-letters',
    identity_basis: 'exact ACL 17-30 entry and official PDF link on the 2017 CDSS ACL archive'
  },
  {
    original_route_id: 'RD04-ROUTE-022',
    target_unit_ids: ['AUTH-CA-ACL-18-94'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACL/2018/18-94.pdf?ver=2018-08-10-092105-913',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2018-all-county-letters',
    identity_basis: 'exact ACL 18-94 entry and official PDF link on the 2018 CDSS ACL archive'
  },
  {
    original_route_id: 'RD04-ROUTE-023',
    target_unit_ids: ['AUTH-CA-ACL-19-09'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACL/2019/19-09.pdf?ver=2019-01-29-135149-227',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2019-all-county-letters',
    identity_basis: 'exact ACL 19-09 entry and official PDF link on the 2019 CDSS ACL archive'
  },
  {
    original_route_id: 'RD04-ROUTE-024',
    target_unit_ids: ['AUTH-CA-ACL-19-45'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACL/2019/19-45.pdf?ver=2019-05-17-133754-090',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2019-all-county-letters',
    identity_basis: 'exact ACL 19-45 entry and official PDF link on the 2019 CDSS ACL archive'
  },
  {
    original_route_id: 'RD04-ROUTE-025',
    target_unit_ids: ['AUTH-CA-ACL-19-51'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/ACL/2019/19-51.pdf?ver=2019-05-24-140611-977',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2019-all-county-letters',
    identity_basis: 'exact ACL 19-51 entry and official PDF link on the 2019 CDSS ACL archive'
  },
  {
    original_route_id: 'RD04-ROUTE-026',
    target_unit_ids: ['AUTH-CA-ABAWD-HANDBOOK-2.0', 'AUTH-CA-ACL-19-93'],
    corrected_url: 'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2019/19-93_ES.pdf',
    archive_index_url: 'https://www.cdss.ca.gov/inforesources/2019-all-county-letters',
    identity_basis: 'exact ACL 19-93 archive link containing the letter and attached ABAWD Handbook Version 2.0'
  }
]);

function verifyV1Capture() {
  const receipt = readJson(V1_RECEIPT_PATH);
  const files = [
    ['source-plan.json', receipt.execution.source_plan_bytes, receipt.execution.source_plan_sha256],
    ['route-ledger.json', receipt.execution.route_ledger_bytes, receipt.execution.route_ledger_sha256],
    ['unit-ledger.json', receipt.execution.unit_ledger_bytes, receipt.execution.unit_ledger_sha256],
    ['summary.json', receipt.execution.summary_bytes, receipt.execution.summary_sha256]
  ];
  for (const [name, expectedBytes, expectedSha] of files) {
    const bytes = fs.readFileSync(path.join(V1_CAPTURE, name));
    ok(bytes.length === expectedBytes, `${name}: byte count changed`);
    ok(sha256(bytes) === expectedSha, `${name}: digest changed`);
  }
  const manifest = readJson(path.join(V1_CAPTURE, 'manifest.json'));
  ok(manifest.entries.length === receipt.execution.manifest_entries, 'manifest entry count changed');
  ok(manifest.combined_sha256 === receipt.execution.manifest_combined_sha256, 'manifest combined digest changed');
  for (const entry of manifest.entries) {
    const target = path.join(V1_CAPTURE, entry.path);
    const bytes = fs.readFileSync(target);
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const routes = readJson(path.join(V1_CAPTURE, 'route-ledger.json')).route_receipts;
  const units = readJson(path.join(V1_CAPTURE, 'unit-ledger.json')).execution_units;
  return { receipt, routes, units };
}

export function buildCorrectionPlan(routes, units) {
  const routeMap = new Map(routes.map((route) => [route.route_id, route]));
  const affectedUnits = new Set();
  const correctedRoutes = corrections.map((correction, index) => {
    const original = routeMap.get(correction.original_route_id);
    ok(original, `${correction.original_route_id}: original route missing`);
    ok(original.resolved === false, `${correction.original_route_id}: original route unexpectedly resolved`);
    ok(original.terminal_state === 'transport_failure_after_bounded_retry', `${correction.original_route_id}: terminal state changed`);
    ok(original.attempt_count === 2, `${correction.original_route_id}: attempt count changed`);
    ok(original.final_http_status === 302 && original.final_url === 'http://localhost/404', `${correction.original_route_id}: failure shape changed`);
    ok(original.final_body_bytes === 0 && original.final_body_sha256 === EMPTY_SHA256, `${correction.original_route_id}: failure body changed`);
    ok(JSON.stringify(original.target_unit_ids) === JSON.stringify(correction.target_unit_ids), `${correction.original_route_id}: target units changed`);
    ok(new URL(correction.corrected_url).hostname === 'www.cdss.ca.gov', `${correction.original_route_id}: non-CDSS correction`);
    ok(correction.corrected_url !== original.url, `${correction.original_route_id}: correction did not change locator`);
    for (const unitId of correction.target_unit_ids) affectedUnits.add(unitId);
    return {
      correction_route_id: `RD04-CORRECTION-${String(index + 1).padStart(2, '0')}`,
      original_route_id: original.route_id,
      original_url: original.url,
      original_terminal_state: original.terminal_state,
      original_attempt_count: original.attempt_count,
      original_final_http_status: original.final_http_status,
      original_final_url: original.final_url,
      original_body_bytes: original.final_body_bytes,
      original_body_sha256: original.final_body_sha256,
      target_unit_ids: correction.target_unit_ids,
      corrected_url: correction.corrected_url,
      official_host: 'www.cdss.ca.gov',
      expected_content_class: 'pdf',
      archive_index_url: correction.archive_index_url,
      identity_basis: correction.identity_basis,
      exact_url_frozen_before_retry: true,
      outcome_selected: false
    };
  });

  const unitMap = new Map(units.map((unit) => [unit.execution_unit_id, unit]));
  for (const unitId of affectedUnits) {
    const unit = unitMap.get(unitId);
    ok(unit, `${unitId}: affected unit missing`);
    ok(unit.unit_terminal_source_state.includes('source_unavailable'), `${unitId}: original unavailable state changed`);
  }
  ok(correctedRoutes.length === 9, 'corrected route denominator changed');
  ok(affectedUnits.size === 10, 'affected unit denominator changed');
  ok(new Set(correctedRoutes.map((route) => route.corrected_url)).size === 9, 'duplicate corrected URL');

  return {
    schema_version: 'ssc-rd-wave02-rd04-source-route-correction-plan@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    as_of: '2026-08-02',
    parent_capture: {
      workflow_run: 30768610215,
      artifact_id: 8839771818,
      artifact_zip_sha256: 'e5911751c8a68b779301eb72b67b0e28b6b314822923e783276d7c91a99ccc99',
      route_ledger_sha256: 'af641ff2d60a7c8484b693fa81053b34941613052dfebef74cb13418ad3bc1ef',
      unit_ledger_sha256: 'b9a5ee607bee2f8687961c7d8a676966b19676b00bffc9acadf93fb682042e89',
      resolved_target_units: 70,
      unavailable_target_units: 10
    },
    correction_law: {
      state: 'nine_historical_cdss_route_defects_corrected_before_retry',
      correction_basis: 'exact official CDSS annual archive entry and link identity',
      maximum_attempts_per_corrected_route: 2,
      connect_timeout_seconds: 15,
      total_timeout_seconds: 60,
      follow_redirects: true,
      concurrent_routes: 4,
      original_receipts_rewritten: false,
      already_resolved_routes_refetched: false,
      outcome_selected_retry: false,
      route_failure_is_record_absence: false,
      route_failure_is_noncompliance: false
    },
    corrected_routes: correctedRoutes,
    counts: {
      original_unresolved_routes: 9,
      corrected_routes: correctedRoutes.length,
      affected_target_units: affectedUnits.size,
      shared_route_target_units: 2,
      already_resolved_target_units_preserved: 70,
      reused_seed_units_preserved: 13,
      correction_requests_executed: 0,
      correction_requests_terminal: 0,
      source_identity_adjudications: 0,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    current_result: {
      terminal_state: 'nine_route_correction_plan_frozen_retry_pending',
      correction_plan_frozen: true,
      correction_capture_complete: false,
      combined_source_capture_complete: false,
      source_identity_adjudication_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      archive_entry_is_source_body: false,
      corrected_url_is_source_identity: false,
      successful_retry_is_version_edge: false,
      failed_retry_is_record_absence: false,
      failed_retry_is_noncompliance: false,
      correction_rewrites_original_receipt: false,
      correction_changes_reviewed_disposition: false,
      graph_effect: 'none'
    }
  };
}

export function main() {
  const { routes, units } = verifyV1Capture();
  const plan = buildCorrectionPlan(routes, units);
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  writeJson(path.join(OUTPUT, 'correction-plan.json'), plan);
  const bytes = fs.readFileSync(path.join(OUTPUT, 'correction-plan.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-source-route-correction-plan-receipt@1',
    product_path: 'correction-plan.json',
    product_bytes: bytes.length,
    product_sha256: sha256(bytes),
    counts: plan.counts,
    terminal_state: plan.current_result.terminal_state,
    correction_plan_frozen: true,
    class_closed: false,
    outside_human_dependency: false
  });
  console.log(`build-source-correction-plan: ${plan.counts.corrected_routes} routes, ${plan.counts.affected_target_units} affected units`);
  return plan;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try { main(); } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
