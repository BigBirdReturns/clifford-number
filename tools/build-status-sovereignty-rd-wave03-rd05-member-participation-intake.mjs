#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEED_PATH = 'data/project/ssc-residual-wave03/seeds/RD-05-C02.json';
export const MATRIX_PATH = 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/field-matrix-contract.json';
export const PROTOCOL_PATH = 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/source-census-protocol.json';
export const MANIFEST_PATH = 'data/intake/status-sovereignty-rd-wave03-rd05-member-participation/intake-product-manifest.json';
export const FIRST_PASS_PATH = 'data/intake/status-sovereignty-f04-aces-governance-first-pass.json';
export const AUTHORITY_CONTROL_PATH = 'data/intake/status-sovereignty-rd05-aces-authority-control.json';
export const PARENT_RECEIPT_PATH = 'data/research/status-sovereignty-rd-wave02-rd05-recommendation-disposition/class-receipt.json';
export const PARENT_CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-05-C03.json';
export const ROSTER_CAPTURE_PATH = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/initial-surface-capture/sources/SSC-RD05-S003/attempt-1.body';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd05-member-participation-intake.schema.json';
export const TEST_PATH = 'test/status-sovereignty-rd-wave03-rd05-member-participation-intake.test.js';
export const RUNNER_PATH = 'tools/acquisition/status-sovereignty-rd-wave03-rd05/run-source-census.py';
export const MILESTONE_PATH = 'docs/milestones/ssc-rd-wave03-rd05-member-participation-intake.md';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd-wave03-rd05-member-participation-intake.yml';
export const BUILDER_PATH = 'tools/build-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs';

export const CONSTITUTION_MERGE = 'dc47681a9ad43e1c64c86e3d823dbb7c203a18c2';
export const WAVE03_LEDGER_PROMOTION = '2374980372d98e7f9ca68fe373d25c9bb812c374';
export const PARENT_TERMINAL_MERGE = '209c30585301a1069507d2e6b16db62ff4ffe1bd';
export const SEED_SHA256 = '846d12a60ea44c374b227570bf241fa15c8a9e4de7fb56633ee84e94d6a214b1';
export const MATRIX_SHA256 = '690f6614e71493037e7ee3d14350857c238382db2a65aae45bad804eea89ab42';
export const FIRST_PASS_SHA256 = '78d6872f42c2bd3b9f81d984df24b5b8f44a0cd9298bf78d6a0f41c8213d454b';
export const AUTHORITY_CONTROL_SHA256 = '923fb60d3f569cb011899e43212469b870c31a0bb6590bd1710272cbf9e0c4a2';
export const PARENT_RECEIPT_SHA256 = 'f548c3df75cd40dfc63925194a8c8f66b6b1eaa056d06a6a69b068c95d9b8183';
export const PARENT_CLOSURE_SHA256 = 'f05e28b033107adeeee95ee2b9d8063db3d7ce9a74f81839245c902082ab214b';
export const ROSTER_CAPTURE_SHA256 = '0df0862566091adfb350a0e52ea32702e00aad88114b17de84c64c48d1e83d50';
export const ROSTER_CAPTURE_BYTES = 319973;

export const MANIFEST_INPUTS = Object.freeze([
  WORKFLOW_PATH,
  MATRIX_PATH,
  PROTOCOL_PATH,
  SEED_PATH,
  MILESTONE_PATH,
  SCHEMA_PATH,
  TEST_PATH,
  RUNNER_PATH,
  BUILDER_PATH,
  VALIDATOR_PATH
]);
export const PERMANENT_PATHS = Object.freeze([...MANIFEST_INPUTS, MANIFEST_PATH].sort());

const SHARED_ROUTES = Object.freeze([
  {
    route_id: 'RD05-W03-SHARED-APPOINTMENT',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_appointment_representation_and_authority_claim',
    purpose: 'official inaugural appointment and advisory-authority surface',
    requested_url: 'https://space.commerce.gov/noaa-appoints-members-to-new-advisory-committee-on-space-commerce/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-ROSTER',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_roster_term_and_balance_contract',
    purpose: 'official seventeen-member roster and profile-link denominator',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-membership/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-LANDING',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_authority_and_termination_record',
    purpose: 'official committee authority, lifecycle, and subcommittee index',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-MEETING-2024-10-03',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_meeting_agenda_and_public_participation_record',
    purpose: 'official first held public-meeting surface',
    requested_url: 'https://space.commerce.gov/first-aces-public-meeting-set-for-october-3/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-MEETING-2025-03',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_canceled_second_meeting_record',
    purpose: 'official canceled second-meeting surface',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-meetings/march-2025-meeting/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-SUBCOMMITTEE-REMOTE-SENSING',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_subcommittee_assignment_surface',
    purpose: 'official licensing of private remote sensing space systems subcommittee surface',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-subcommittee-on-licensing-of-private-remote-sensing-space-systems/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-SUBCOMMITTEE-MISSION-AUTHORIZATION',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_subcommittee_assignment_surface',
    purpose: 'official commercial space mission authorization subcommittee surface',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-subcommittee-on-commercial-space-mission-authorization/',
    allowed_final_host_suffix: 'space.commerce.gov'
  },
  {
    route_id: 'RD05-W03-SHARED-SUBCOMMITTEE-SUSTAINABILITY',
    route_type: 'exact_official_get',
    scope: 'shared_aces',
    source_class: 'official_subcommittee_assignment_surface',
    purpose: 'official space sustainability and space situational awareness subcommittee surface',
    requested_url: 'https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-subcommittee-on-space-sustainability/',
    allowed_final_host_suffix: 'space.commerce.gov'
  }
]);

export const QUERY_SPECS = Object.freeze([
  { query_class: 'attendance', order: 1, terms: 'ACES (attendance OR attended OR meeting)' },
  { query_class: 'vote', order: 2, terms: 'ACES (vote OR voted OR "roll call")' },
  { query_class: 'dissent', order: 3, terms: 'ACES (dissent OR concurrence OR "separate statement")' },
  { query_class: 'subcommittee', order: 4, terms: 'ACES subcommittee' },
  { query_class: 'agenda_authority', order: 5, terms: 'ACES (agenda OR chair OR "vice chair")' },
  { query_class: 'information_access', order: 6, terms: 'ACES (briefing OR access OR webinar OR presentation)' },
  { query_class: 'authorship', order: 7, terms: 'ACES (author OR authored OR drafted OR recommendation)' },
  { query_class: 'minutes_statement', order: 8, terms: 'ACES (minutes OR transcript OR statement)' }
]);

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function rfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function routeBase(row) {
  return {
    ...row,
    maximum_attempts: 1,
    maximum_body_bytes: row.route_type === 'candidate_census_rss' ? 2097152 : 10485760,
    timeout_ms: 45000,
    maximum_candidate_rows: row.route_type === 'candidate_census_rss' ? 10 : 0,
    candidate_rows_are_admitted_sources: false,
    evidence_admission_authorized: false,
    result_spawned_requests: 0
  };
}

function routeLine(row) {
  return [
    row.ordinal,
    row.route_id,
    row.route_type,
    row.scope,
    row.unit_ordinal ?? '',
    row.unit_id ?? '',
    row.query_class ?? '',
    row.canonical_name ?? '',
    row.query ?? '',
    row.requested_url,
    row.allowed_final_host_suffix,
    row.maximum_attempts,
    row.maximum_body_bytes,
    row.maximum_candidate_rows,
    String(row.candidate_rows_are_admitted_sources),
    String(row.evidence_admission_authorized),
    row.result_spawned_requests
  ].join('\t') + '\n';
}

function assertHash(root, rel, expected, label) {
  const actual = sha256(readBytes(root, rel));
  ok(actual === expected, `${label} bytes changed: ${actual}`);
}

function validateInputs(root, seed, matrix, firstPass, authority, parentReceipt, parentClosure) {
  assertHash(root, SEED_PATH, SEED_SHA256, 'seed');
  assertHash(root, MATRIX_PATH, MATRIX_SHA256, 'matrix');
  assertHash(root, FIRST_PASS_PATH, FIRST_PASS_SHA256, 'first pass');
  assertHash(root, AUTHORITY_CONTROL_PATH, AUTHORITY_CONTROL_SHA256, 'authority control');
  assertHash(root, PARENT_RECEIPT_PATH, PARENT_RECEIPT_SHA256, 'parent receipt');
  assertHash(root, PARENT_CLOSURE_PATH, PARENT_CLOSURE_SHA256, 'parent closure');
  assertHash(root, ROSTER_CAPTURE_PATH, ROSTER_CAPTURE_SHA256, 'roster capture');
  ok(readBytes(root, ROSTER_CAPTURE_PATH).length === ROSTER_CAPTURE_BYTES, 'roster capture byte count changed');

  ok(seed?.schema_version === 'ssc-residual-denominator-wave03-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_id === 'SSC-RD-W03' && seed?.child_issue === 1018, 'seed identity changed');
  ok(seed?.class_id === 'RD-05-C02' && seed?.class_state === 'still_open' && seed?.class_closed === false, 'seed class boundary changed');
  ok(seed?.denominator_contract?.unit_count === 17 && seed?.denominator_contract?.public_meetings_held_at_parent_cutoff === 1 && seed?.denominator_contract?.published_subcommittees === 3, 'seed denominator changed');
  ok(seed?.authority?.outside_human_dependency === false && seed?.authority?.external_contacts === 0 && seed?.authority?.external_reviews === 0, 'seed human boundary changed');
  for (const key of ['publication_effect', 'adoption_effect', 'graph_effect']) ok(seed?.authority?.[key] === 'none', `seed ${key} changed`);

  ok(matrix?.schema_version === 'ssc-rd-wave03-rd05-member-participation-field-matrix-contract@1', 'matrix schema changed');
  ok(matrix?.wave_id === 'SSC-RD-W03' && matrix?.lane_id === 'RD-05' && matrix?.class_id === 'RD-05-C02' && matrix?.issue === 1018, 'matrix identity changed');
  ok(Array.isArray(matrix?.units) && matrix.units.length === 17, 'matrix member denominator changed');
  ok(Array.isArray(matrix?.required_fields) && matrix.required_fields.length === 10, 'matrix field denominator changed');
  ok(matrix?.expansion_contract?.required_cells === 170, 'matrix cell denominator changed');
  ok(matrix?.current_counts?.materialized_cells === 0 && matrix?.current_counts?.terminal_cells === 0 && matrix?.current_counts?.class_closed === false, 'matrix pre-execution state changed');
  same(matrix.units.map((row) => row.unit_ordinal), Array.from({ length: 17 }, (_, index) => index + 1), 'member ordinal order changed');
  same(matrix.units.map((row) => row.unit_id), Array.from({ length: 17 }, (_, index) => `ACES-MEMBER-${String(index + 1).padStart(2, '0')}`), 'member ids changed');
  ok(new Set(matrix.units.map((row) => row.canonical_name)).size === 17, 'member names must be unique');
  ok(new Set(matrix.units.map((row) => row.profile_url)).size === 17, 'member profile urls must be unique');
  ok(matrix.units.filter((row) => row.leadership_role === 'chair').length === 1, 'chair denominator changed');
  ok(matrix.units.filter((row) => row.leadership_role === 'vice_chair').length === 1, 'vice-chair denominator changed');
  ok(matrix.units.filter((row) => row.appointment_capacity === 'Special Government Employee').length === 3, 'special-government-employee count changed');
  ok(matrix.units.every((row) => row.profile_url.startsWith('https://space.commerce.gov/advisory-committee-on-excellence-in-space-aces/aces-membership/')), 'member profile host/path changed');

  ok(firstPass?.governance_denominator?.published_inaugural_members === 17, 'first-pass published roster count changed');
  ok(firstPass?.governance_denominator?.member_specific_exercised_authority_denominator === false, 'first pass already claims member-specific authority denominator');
  ok(firstPass?.open_denominators?.includes('member-specific votes, dissents, subcommittee assignments, agenda control, information access, and recommendation authorship'), 'first-pass open denominator changed');

  ok(authority?.execution_id === 'SSC-RD05-ACES-01' && authority?.counts?.source_records === 10, 'authority-control identity or source count changed');
  ok(authority?.counts?.ACES_public_meetings_held === 1 && authority?.counts?.ACES_canceled_meetings === 1 && authority?.counts?.ACES_subcommittees === 3, 'authority-control meeting/subcommittee counts changed');
  ok(authority?.counts?.ACES_completed_recommendations_recovered === 0 && authority?.counts?.ACES_agency_dispositions_recovered === 0, 'authority-control outcome boundary changed');

  ok(parentReceipt?.class_id === 'RD-05-C03' && parentReceipt?.terminal_state === 'bounded_non_link' && parentReceipt?.class_closed === true, 'parent receipt changed');
  ok(parentReceipt?.counts?.frozen_objects === 58 && parentReceipt?.counts?.fixed_routes === 49, 'parent receipt denominator changed');
  ok(parentClosure?.class_id === 'RD-05-C03' && parentClosure?.terminal_state === 'bounded_non_link' && parentClosure?.class_closed === true, 'parent closure changed');
  ok(parentClosure?.product?.manifest_combined_sha256 === 'd9fcb123ad57bf86b355920702aa961e32c95a6a3b3237eb8ece91e863baca11', 'parent manifest custody changed');
}

export function deriveProtocol(root = ROOT) {
  const seed = read(root, SEED_PATH);
  const matrix = read(root, MATRIX_PATH);
  const firstPass = read(root, FIRST_PASS_PATH);
  const authority = read(root, AUTHORITY_CONTROL_PATH);
  const parentReceipt = read(root, PARENT_RECEIPT_PATH);
  const parentClosure = read(root, PARENT_CLOSURE_PATH);
  validateInputs(root, seed, matrix, firstPass, authority, parentReceipt, parentClosure);

  const routes = SHARED_ROUTES.map((row) => routeBase({ ...row }));
  for (const member of matrix.units) {
    routes.push(routeBase({
      route_id: `RD05-W03-${String(member.unit_ordinal).padStart(2, '0')}-PROFILE`,
      route_type: 'exact_official_get',
      scope: 'member',
      source_class: 'official_member_profile',
      unit_ordinal: member.unit_ordinal,
      unit_id: member.unit_id,
      canonical_name: member.canonical_name,
      query_class: 'profile',
      purpose: 'official member profile and any member-specific role or biography surface',
      requested_url: member.profile_url,
      allowed_final_host_suffix: 'space.commerce.gov'
    }));
    for (const spec of QUERY_SPECS) {
      const query = `"${member.canonical_name}" ${spec.terms} site:space.commerce.gov`;
      routes.push(routeBase({
        route_id: `RD05-W03-${String(member.unit_ordinal).padStart(2, '0')}-${spec.query_class.toUpperCase().replaceAll('_', '-')}`,
        route_type: 'candidate_census_rss',
        scope: 'member',
        source_class: 'fixed_candidate_census_route',
        unit_ordinal: member.unit_ordinal,
        unit_id: member.unit_id,
        canonical_name: member.canonical_name,
        query_class: spec.query_class,
        purpose: `bounded ${spec.query_class.replaceAll('_', ' ')} source discovery for the frozen member row`,
        query,
        requested_url: `https://www.bing.com/search?format=rss&q=${rfc3986(query)}`,
        allowed_final_host_suffix: 'bing.com'
      }));
    }
  }
  routes.forEach((row, index) => { row.ordinal = index + 1; });
  ok(routes.length === 161, `fixed route count changed: ${routes.length}`);
  ok(routes.filter((row) => row.route_type === 'exact_official_get').length === 25, 'exact official route count changed');
  ok(routes.filter((row) => row.route_type === 'candidate_census_rss').length === 136, 'candidate route count changed');
  ok(new Set(routes.map((row) => row.route_id)).size === 161, 'duplicate route id');
  same(routes.map((row) => row.ordinal), Array.from({ length: 161 }, (_, index) => index + 1), 'route ordinal order changed');
  const routeLedger = routes.map(routeLine).join('');

  return {
    schema_version: 'ssc-rd-wave03-rd05-member-participation-source-census-protocol@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-05',
    class_id: 'RD-05-C02',
    issue: 1018,
    as_of: '2026-08-05',
    title: 'RD-05 Wave 03 fixed ACES member participation, vote, dissent, access, and authorship source census',
    authority: 'fixed_source_availability_census_not_member_participation_or_class_receipt',
    source_custody: {
      constitution_merge: CONSTITUTION_MERGE,
      wave03_current_ledger_merge_at_design: WAVE03_LEDGER_PROMOTION,
      parent_terminal_merge: PARENT_TERMINAL_MERGE,
      seed_path: SEED_PATH,
      seed_sha256: SEED_SHA256,
      matrix_path: MATRIX_PATH,
      matrix_sha256: MATRIX_SHA256,
      first_pass_path: FIRST_PASS_PATH,
      first_pass_sha256: FIRST_PASS_SHA256,
      authority_control_path: AUTHORITY_CONTROL_PATH,
      authority_control_sha256: AUTHORITY_CONTROL_SHA256,
      parent_class_receipt_path: PARENT_RECEIPT_PATH,
      parent_class_receipt_sha256: PARENT_RECEIPT_SHA256,
      parent_closure_reference_path: PARENT_CLOSURE_PATH,
      parent_closure_reference_sha256: PARENT_CLOSURE_SHA256,
      roster_capture_path: ROSTER_CAPTURE_PATH,
      roster_capture_sha256: ROSTER_CAPTURE_SHA256,
      roster_capture_bytes: ROSTER_CAPTURE_BYTES,
      intake_product_manifest_path: MANIFEST_PATH
    },
    denominator: {
      published_member_rows: 17,
      required_fields_per_member: 10,
      required_cells: 170,
      shared_exact_official_routes: 8,
      member_profile_exact_official_routes: 17,
      candidate_query_classes_per_member: 8,
      candidate_census_routes: 136,
      fixed_routes: 161,
      maximum_candidate_rows: 1360,
      public_meetings_held_at_parent_cutoff: 1,
      canceled_public_meetings_at_parent_cutoff: 1,
      published_subcommittees: 3
    },
    inherited_source_custody: {
      first_pass_official_sources: 4,
      authority_control_sources: 10,
      wave02_frozen_objects: 58,
      wave02_fixed_routes: 49,
      wave02_terminal_state: 'bounded_non_link',
      inherited_roster_is_identity_and_affiliation_custody_only: true,
      inherited_agenda_or_subcommittee_surface_is_not_member_participation: true,
      inherited_sources_are_not_reopened_or_rewritten: true
    },
    query_specs: QUERY_SPECS.map((row) => ({ ...row })),
    route_derivation: {
      shared_route_order: SHARED_ROUTES.map((row) => row.route_id),
      member_order: 'matrix.units ascending unit_ordinal',
      per_member_route_order: ['profile', ...QUERY_SPECS.map((row) => row.query_class)],
      candidate_query_template: '"{canonical_name}" {terms} site:space.commerce.gov',
      candidate_search_base_url: 'https://www.bing.com/search?format=rss&q=',
      url_encoding: 'RFC3986 percent encoding with no additional safe characters',
      route_ledger_columns: [
        'ordinal', 'route_id', 'route_type', 'scope', 'unit_ordinal', 'unit_id', 'query_class',
        'canonical_name', 'query', 'requested_url', 'allowed_final_host_suffix', 'maximum_attempts',
        'maximum_body_bytes', 'maximum_candidate_rows', 'candidate_rows_are_admitted_sources',
        'evidence_admission_authorized', 'result_spawned_requests'
      ],
      route_ledger_bytes: Buffer.byteLength(routeLedger),
      route_ledger_sha256: sha256(routeLedger)
    },
    fixed_routes: routes,
    execution_contract: {
      fixed_before_results: true,
      maximum_attempts_per_route: 1,
      timeout_ms: 45000,
      concurrency: 2,
      connection_header: 'close',
      raw_request_response_and_hash_custody_required: true,
      automatic_candidate_followup_authorized: false,
      automatic_second_pass_authorized: false,
      terminal_http_non_success_is_typed_not_fatal: true,
      transport_failure_is_typed_not_absence: true,
      result_spawned_requests: 0
    },
    candidate_law: {
      search_result_is_evidence: false,
      official_domain_is_substantive_support: false,
      first_party_domain_is_substantive_support: false,
      lexical_member_match_is_identity_resolution: false,
      result_rank_is_authority: false,
      member_profile_is_attendance_vote_dissent_access_or_authorship: false,
      candidate_url_followup_requires_separate_frozen_successor: true,
      candidate_admission_requires_page_level_member_event_and_source_custody: true
    },
    next_stage: {
      exact_action: 'execute all 161 fixed routes once, preserve every terminal receipt and candidate row, then freeze a separate page-level candidate-adjudication denominator before any member-field classification',
      terminal_product_authorized_now: false,
      class_closure_authorized_now: false,
      cumulative_ledger_promotion_authorized_now: false
    },
    current_counts: {
      fixed_routes: 161,
      exact_official_routes: 25,
      candidate_census_routes: 136,
      request_attempts: 0,
      terminal_route_receipts: 0,
      candidate_rows: 0,
      admitted_evidence_sources: 0,
      materialized_cells: 0,
      terminal_cells: 0,
      terminal_members: 0,
      external_contacts: 0,
      external_reviews: 0
    },
    boundaries: {
      roster_membership_is_meeting_attendance: false,
      attendance_is_recorded_vote: false,
      agenda_item_is_adopted_recommendation: false,
      subcommittee_assignment_is_recommendation_authorship: false,
      no_recorded_dissent_is_unanimity: false,
      public_webinar_is_equal_information_access: false,
      committee_termination_is_suppression: false,
      representation_is_neutrality_tokenism_or_effective_counterpower: false,
      missing_public_record_is_nonoccurrence: false,
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

export function deriveSchema(value) {
  const keys = Object.keys(value);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave03-rd05-member-participation-intake.schema.json',
    title: 'SSC RD-05 Wave 03 member participation fixed source census',
    type: 'object',
    additionalProperties: false,
    required: keys,
    properties: Object.fromEntries(keys.map((key) => [key, { const: value[key] }]))
  };
}

export function deriveManifest(root = ROOT) {
  const entries = MANIFEST_INPUTS.map((rel) => {
    const bytes = readBytes(root, rel);
    return { path: rel, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return {
    schema_version: 'ssc-rd-wave03-rd05-member-participation-intake-product-manifest@1',
    wave_id: 'SSC-RD-W03',
    lane_id: 'RD-05',
    class_id: 'RD-05-C02',
    issue: 1018,
    as_of: '2026-08-05',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    manifest_path: MANIFEST_PATH,
    permanent_paths: PERMANENT_PATHS,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    counts: {
      permanent_paths: PERMANENT_PATHS.length,
      manifest_entries: entries.length,
      member_rows: 17,
      required_cells: 170,
      fixed_routes: 161,
      request_attempts: 0,
      terminal_cells: 0
    },
    boundaries: {
      exact_bytes_prove_source_truth: false,
      manifest_proves_member_participation: false,
      manifest_proves_class_closure: false,
      manifest_changes_reviewed_disposition: false,
      manifest_authorizes_publication: false,
      outside_human_dependency: false,
      graph_effect: 'none'
    }
  };
}

export function writeGenerated(root = ROOT) {
  const protocol = deriveProtocol(root);
  write(root, PROTOCOL_PATH, protocol);
  write(root, SCHEMA_PATH, deriveSchema(protocol));
  write(root, MANIFEST_PATH, deriveManifest(root));
  return protocol;
}

export function checkGenerated(root = ROOT) {
  const protocol = deriveProtocol(root);
  same(read(root, PROTOCOL_PATH), protocol, 'source census protocol drifted');
  same(read(root, SCHEMA_PATH), deriveSchema(protocol), 'closed protocol schema drifted');
  same(read(root, MANIFEST_PATH), deriveManifest(root), 'intake product manifest drifted');
  return protocol;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const mode = process.argv[2] || '--write';
  if (mode === '--write') {
    const value = writeGenerated(ROOT);
    console.log(`wrote RD-05 Wave-03 intake: ${value.denominator.published_member_rows} members, ${value.denominator.required_cells} cells, ${value.denominator.fixed_routes} fixed routes`);
  } else if (mode === '--check') {
    const value = checkGenerated(ROOT);
    console.log(`RD-05 Wave-03 intake check: ${value.denominator.published_member_rows} members, ${value.denominator.required_cells} cells, ${value.denominator.fixed_routes} fixed routes, acquisition not executed`);
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}
