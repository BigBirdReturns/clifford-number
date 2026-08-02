#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  SNAPSHOT_DATE,
  apiUrl,
  buildPlan,
  corrections
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/build-ecfr-api-correction-plan.mjs';
import {
  classifyEcfrBody
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/capture-ecfr-api-correction.mjs';

const bodyHashes = [
  'f9d47e12805011e2fac2d04968cf4a2914181b576d5ea7d3e1c1e42aaa6ae8fb',
  'db00b976c95658e434b01d3a3701cd2b45c646a68ae2f863bab2370fe6eb1992',
  'db00b976c95658e434b01d3a3701cd2b45c646a68ae2f863bab2370fe6eb1992',
  '69fa13193e7b1b31f4a00667a85deadb464dd279c6d9323ca3efe5bcd6cad123',
  '69fa13193e7b1b31f4a00667a85deadb464dd279c6d9323ca3efe5bcd6cad123',
  '69fa13193e7b1b31f4a00667a85deadb464dd279c6d9323ca3efe5bcd6cad123',
  'db00b976c95658e434b01d3a3701cd2b45c646a68ae2f863bab2370fe6eb1992',
  'db00b976c95658e434b01d3a3701cd2b45c646a68ae2f863bab2370fe6eb1992'
];

const antibot = {
  affected_routes: corrections.map((correction, index) => ({
    route_id: correction.original_route_id,
    target_unit_id: correction.unit_id,
    body_bytes: 10596,
    body_sha256: bodyHashes[index]
  }))
};
const routes = corrections.map((correction, index) => ({
  route_id: correction.original_route_id,
  target_unit_ids: [correction.unit_id],
  url: `https://www.ecfr.gov/current/title-${correction.title}/part-${correction.part}/section-${correction.section}`,
  resolved: true,
  terminal_state: 'http_success',
  final_http_status: 200,
  final_url: 'https://unblock.federalregister.gov/',
  final_content_type: 'text/html; charset=utf-8',
  final_body_bytes: 10596,
  final_body_sha256: bodyHashes[index]
}));
const originalUnits = corrections.map((correction, index) => ({
  execution_unit_id: correction.unit_id,
  selected_route_id: correction.original_route_id,
  selected_body_sha256: bodyHashes[index]
}));
const combinedUnits = corrections.map((correction, index) => ({
  execution_unit_id: correction.unit_id,
  selected_body_sha256: bodyHashes[index]
}));

const plan = buildPlan(antibot, routes, originalUnits, combinedUnits);
assert.equal(plan.corrected_routes.length, 8);
assert.equal(plan.counts.affected_units, 8);
assert.equal(plan.counts.preserved_non_ecfr_execution_units, 85);
assert.equal(plan.official_api_contract.snapshot_date, SNAPSHOT_DATE);
assert.equal(plan.correction_law.original_receipts_rewritten, false);
assert.equal(plan.correction_law.already_valid_non_ecfr_units_refetched, false);
assert.equal(plan.correction_law.outcome_selected_retry, false);
assert.equal(plan.current_result.api_capture_complete, false);
assert.equal(plan.current_result.version_edge_adjudication_complete, false);
assert.equal(plan.current_result.class_closed, false);
assert.equal(plan.boundaries.anti_bot_receipt_erased, false);

assert.equal(
  apiUrl({ title: 7, part: '273', section: '273.24' }),
  'https://www.ecfr.gov/api/versioner/v1/full/2026-07-30/title-7.xml?part=273&section=273.24'
);
assert.equal(
  apiUrl({ title: 45, part: '164', section: '164.502' }),
  'https://www.ecfr.gov/api/versioner/v1/full/2026-07-30/title-45.xml?part=164&section=164.502'
);
assert(plan.corrected_routes.every((route) => route.exact_url_frozen_before_fetch && !route.outcome_selected));
assert.equal(new Set(plan.corrected_routes.map((route) => route.corrected_url)).size, 8);

const positiveRoute = { section: '273.24' };
const positive = classifyEcfrBody(
  Buffer.from('<?xml version="1.0"?><DIV5 TYPE="PART"><DIV8 TYPE="SECTION"><HEAD>§ 273.24 Time limit for able-bodied adults.</HEAD><P>(a) General.</P></DIV8></DIV5>'),
  'https://www.ecfr.gov/api/versioner/v1/full/2026-07-30/title-7.xml?part=273&section=273.24',
  'application/xml',
  positiveRoute
);
assert.equal(positive.api_host_observed, true);
assert.equal(positive.api_path_observed, true);
assert.equal(positive.xml_observed, true);
assert.equal(positive.request_access_observed, false);
assert.equal(positive.exact_section_observed, true);
assert.equal(positive.exact_identity_observed, true);
assert.equal(positive.identity_state, 'exact_requested_section_identity_observed');

const antiBot = classifyEcfrBody(
  Buffer.from('<!DOCTYPE html><html><h1>Request Access</h1><p>aggressive automated scraping</p></html>'),
  'https://unblock.federalregister.gov/',
  'text/html; charset=utf-8',
  positiveRoute
);
assert.equal(antiBot.request_access_observed, true);
assert.equal(antiBot.exact_identity_observed, false);
assert.equal(antiBot.identity_state, 'automated_request_access_body_observed');

const wrongSection = classifyEcfrBody(
  Buffer.from('<?xml version="1.0"?><DIV8 TYPE="SECTION"><HEAD>§ 273.7 Work provisions.</HEAD></DIV8>'),
  'https://www.ecfr.gov/api/versioner/v1/full/2026-07-30/title-7.xml?part=273&section=273.24',
  'application/xml',
  positiveRoute
);
assert.equal(wrongSection.xml_observed, true);
assert.equal(wrongSection.exact_section_observed, false);
assert.equal(wrongSection.exact_identity_observed, false);
assert.equal(wrongSection.identity_state, 'xml_body_recovered_exact_section_identity_not_observed');

const sectno = classifyEcfrBody(
  Buffer.from('<?xml version="1.0"?><DIV8 TYPE="SECTION"><SECTNO>§ 164.502</SECTNO><SUBJECT>Uses and disclosures.</SUBJECT></DIV8>'),
  'https://www.ecfr.gov/api/versioner/v1/full/2026-07-30/title-45.xml?part=164&section=164.502',
  'text/xml',
  { section: '164.502' }
);
assert.equal(sectno.exact_identity_observed, true);

console.log('status-sovereignty-rd-wave02-rd04-ecfr-api-correction.test: eight frozen API routes, exact section identity, anti-bot refusal, wrong-section refusal, and authority ceilings passed');
