#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildCorrectionPlan,
  corrections
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/build-source-correction-plan.mjs';

const emptySha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const routes = corrections.map((correction) => ({
  route_id: correction.original_route_id,
  url: `https://www.cdss.ca.gov/bad/${correction.original_route_id}.pdf`,
  target_unit_ids: correction.target_unit_ids,
  resolved: false,
  terminal_state: 'transport_failure_after_bounded_retry',
  attempt_count: 2,
  final_http_status: 302,
  final_url: 'http://localhost/404',
  final_body_bytes: 0,
  final_body_sha256: emptySha
}));
const units = [...new Set(corrections.flatMap((row) => row.target_unit_ids))].map((unitId) => ({
  execution_unit_id: unitId,
  unit_terminal_source_state: 'source_unavailable_after_fixed_protocol'
}));

const plan = buildCorrectionPlan(routes, units);
assert.equal(plan.corrected_routes.length, 9);
assert.equal(plan.counts.affected_target_units, 10);
assert.equal(plan.counts.shared_route_target_units, 2);
assert.equal(plan.counts.already_resolved_target_units_preserved, 70);
assert.equal(plan.counts.reused_seed_units_preserved, 13);
assert.equal(plan.correction_law.original_receipts_rewritten, false);
assert.equal(plan.correction_law.already_resolved_routes_refetched, false);
assert.equal(plan.correction_law.outcome_selected_retry, false);
assert.equal(plan.current_result.correction_capture_complete, false);
assert.equal(plan.current_result.source_identity_adjudication_complete, false);
assert.equal(plan.current_result.version_edge_adjudication_complete, false);
assert.equal(plan.current_result.class_closed, false);
assert.equal(plan.boundaries.archive_entry_is_source_body, false);
assert.equal(plan.boundaries.corrected_url_is_source_identity, false);
assert.equal(plan.boundaries.failed_retry_is_noncompliance, false);

const urls = new Set(plan.corrected_routes.map((row) => row.corrected_url));
assert.equal(urls.size, 9);
for (const row of plan.corrected_routes) {
  assert.equal(new URL(row.corrected_url).hostname, 'www.cdss.ca.gov');
  assert.notEqual(row.corrected_url, row.original_url);
  assert.equal(row.original_attempt_count, 2);
  assert.equal(row.original_final_http_status, 302);
  assert.equal(row.original_final_url, 'http://localhost/404');
  assert.equal(row.original_body_sha256, emptySha);
  assert.equal(row.exact_url_frozen_before_retry, true);
  assert.equal(row.outcome_selected, false);
}
assert(urls.has('https://www.cdss.ca.gov/lettersnotices/entres/getinfo/acl/2011/11-22.pdf'));
assert(urls.has('https://www.cdss.ca.gov/lettersnotices/entres/getinfo/acl/2015/15-08.pdf'));
assert(urls.has('https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2019/19-93_ES.pdf'));

console.log('status-sovereignty-rd-wave02-rd04-source-correction.test: nine routes, ten units, immutable failures, archive identities, and authority boundaries passed');
