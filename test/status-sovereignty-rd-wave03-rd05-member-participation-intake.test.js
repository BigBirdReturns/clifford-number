#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  MATRIX_PATH,
  PROTOCOL_PATH,
  MANIFEST_PATH,
  SCHEMA_PATH,
  deriveProtocol,
  deriveManifest
} from '../tools/build-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs';
import { validatePackageData } from '../tools/validate-status-sovereignty-rd-wave03-rd05-member-participation-intake.mjs';

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = read(PROTOCOL_PATH);
const schema = read(SCHEMA_PATH);
const manifest = read(MANIFEST_PATH);
const matrix = read(MATRIX_PATH);
const expected = deriveProtocol(ROOT);
const expectedManifest = deriveManifest(ROOT);
const clone = (value) => structuredClone(value);
const fail = (message) => { throw new Error(message); };

function expectProtocol(name, mutate, pattern) {
  const value = clone(base);
  mutate(value);
  try {
    validatePackageData(value, clone(schema), clone(manifest), clone(matrix), expected, expectedManifest, ROOT);
    fail(`${name}: mutation passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error: ${error.message}`);
  }
}

function expectMatrix(name, mutate, pattern) {
  const value = clone(matrix);
  mutate(value);
  try {
    validatePackageData(clone(base), clone(schema), clone(manifest), value, expected, expectedManifest, ROOT);
    fail(`${name}: mutation passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error: ${error.message}`);
  }
}

function expectSchema(name, mutate, pattern) {
  const value = clone(schema);
  mutate(value);
  try {
    validatePackageData(clone(base), value, clone(manifest), clone(matrix), expected, expectedManifest, ROOT);
    fail(`${name}: mutation passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error: ${error.message}`);
  }
}

function expectManifest(name, mutate, pattern) {
  const value = clone(manifest);
  mutate(value);
  try {
    validatePackageData(clone(base), clone(schema), value, clone(matrix), expected, expectedManifest, ROOT);
    fail(`${name}: mutation passed`);
  } catch (error) {
    if (!pattern.test(error.message)) fail(`${name}: unexpected error: ${error.message}`);
  }
}

validatePackageData(base, schema, manifest, matrix, expected, expectedManifest, ROOT);

const protocolCases = [
  ['protocol identity', (v) => { v.class_id = 'RD-05-C03'; }, /protocol identity/],
  ['protocol authority', (v) => { v.authority = 'member_participation_receipt'; }, /status or authority/],
  ['constitution merge', (v) => { v.source_custody.constitution_merge = '0'.repeat(40); }, /source custody/],
  ['ledger merge', (v) => { v.source_custody.wave03_current_ledger_merge_at_design = '0'.repeat(40); }, /source custody/],
  ['parent merge', (v) => { v.source_custody.parent_terminal_merge = '0'.repeat(40); }, /source custody/],
  ['seed hash', (v) => { v.source_custody.seed_sha256 = '0'.repeat(64); }, /source custody/],
  ['matrix hash', (v) => { v.source_custody.matrix_sha256 = '0'.repeat(64); }, /source custody/],
  ['roster hash', (v) => { v.source_custody.roster_capture_sha256 = '0'.repeat(64); }, /source custody/],
  ['member count', (v) => { v.denominator.published_member_rows = 16; }, /denominator/],
  ['field count', (v) => { v.denominator.required_fields_per_member = 9; }, /denominator/],
  ['cell count', (v) => { v.denominator.required_cells = 169; }, /denominator/],
  ['shared routes', (v) => { v.denominator.shared_exact_official_routes = 7; }, /denominator/],
  ['profile routes', (v) => { v.denominator.member_profile_exact_official_routes = 16; }, /denominator/],
  ['query classes', (v) => { v.denominator.candidate_query_classes_per_member = 7; }, /denominator/],
  ['candidate routes', (v) => { v.denominator.candidate_census_routes = 135; }, /denominator/],
  ['fixed routes', (v) => { v.denominator.fixed_routes = 160; }, /denominator/],
  ['parent state', (v) => { v.inherited_source_custody.wave02_terminal_state = 'evidence_complete'; }, /parent terminal/],
  ['roster authority', (v) => { v.inherited_source_custody.inherited_roster_is_identity_and_affiliation_custody_only = false; }, /roster authority/],
  ['agenda authority', (v) => { v.inherited_source_custody.inherited_agenda_or_subcommittee_surface_is_not_member_participation = false; }, /agenda\/subcommittee authority/],
  ['query order', (v) => { [v.query_specs[0], v.query_specs[1]] = [v.query_specs[1], v.query_specs[0]]; }, /query specification/],
  ['route removed', (v) => { v.fixed_routes.pop(); }, /fixed route count/],
  ['route duplicate', (v) => { v.fixed_routes[1].route_id = v.fixed_routes[0].route_id; }, /duplicate route/],
  ['route ordinal', (v) => { v.fixed_routes[0].ordinal = 2; }, /ordinal/],
  ['shared scope', (v) => { v.fixed_routes[0].scope = 'member'; }, /shared route prefix/],
  ['official host', (v) => { v.fixed_routes[0].allowed_final_host_suffix = 'example.com'; }, /official host/],
  ['official url', (v) => { v.fixed_routes[0].requested_url = 'https://example.com/'; }, /exact route left official host|official route/],
  ['attempt inflation', (v) => { v.fixed_routes[0].maximum_attempts = 2; }, /bounded attempt/],
  ['timeout', (v) => { v.fixed_routes[0].timeout_ms = 1; }, /bounded attempt/],
  ['candidate admitted', (v) => { v.fixed_routes[25].candidate_rows_are_admitted_sources = true; }, /evidence authority/],
  ['evidence admitted', (v) => { v.fixed_routes[25].evidence_admission_authorized = true; }, /evidence authority/],
  ['result spawn', (v) => { v.fixed_routes[25].result_spawned_requests = 1; }, /result-spawned/],
  ['candidate host', (v) => { v.fixed_routes[25].allowed_final_host_suffix = 'space.commerce.gov'; }, /candidate host/],
  ['candidate query', (v) => { v.fixed_routes[25].query = 'unbounded query'; }, /site-bound query/],
  ['profile join', (v) => { v.fixed_routes[8].unit_id = 'ACES-MEMBER-02'; }, /profile route|route\/member join/],
  ['query route order', (v) => { [v.fixed_routes[9], v.fixed_routes[10]] = [v.fixed_routes[10], v.fixed_routes[9]]; }, /query route order|ordinal/],
  ['not fixed', (v) => { v.execution_contract.fixed_before_results = false; }, /execution contract/],
  ['automatic followup', (v) => { v.execution_contract.automatic_candidate_followup_authorized = true; }, /execution contract/],
  ['automatic second pass', (v) => { v.execution_contract.automatic_second_pass_authorized = true; }, /execution contract/],
  ['search evidence', (v) => { v.candidate_law.search_result_is_evidence = true; }, /search result/],
  ['domain support', (v) => { v.candidate_law.official_domain_is_substantive_support = true; }, /domain promoted/],
  ['lexical identity', (v) => { v.candidate_law.lexical_member_match_is_identity_resolution = true; }, /lexical or rank/],
  ['rank authority', (v) => { v.candidate_law.result_rank_is_authority = true; }, /lexical or rank/],
  ['profile participation', (v) => { v.candidate_law.member_profile_is_attendance_vote_dissent_access_or_authorship = true; }, /profile promoted/],
  ['successor weakened', (v) => { v.candidate_law.candidate_url_followup_requires_separate_frozen_successor = false; }, /successor law/],
  ['admission weakened', (v) => { v.candidate_law.candidate_admission_requires_page_level_member_event_and_source_custody = false; }, /successor law/],
  ['terminal authorized', (v) => { v.next_stage.terminal_product_authorized_now = true; }, /terminal authority/],
  ['closure authorized', (v) => { v.next_stage.class_closure_authorized_now = true; }, /terminal authority/],
  ['ledger authorized', (v) => { v.next_stage.cumulative_ledger_promotion_authorized_now = true; }, /terminal authority/],
  ['request count', (v) => { v.current_counts.request_attempts = 1; }, /current counts/],
  ['candidate count', (v) => { v.current_counts.candidate_rows = 1; }, /current counts/],
  ['terminal cell', (v) => { v.current_counts.terminal_cells = 1; }, /current counts/],
  ['human gate', (v) => { v.boundaries.outside_human_dependency = true; }, /outside_human_dependency/],
  ['roster attendance', (v) => { v.boundaries.roster_membership_is_meeting_attendance = true; }, /roster_membership/],
  ['silence unanimity', (v) => { v.boundaries.no_recorded_dissent_is_unanimity = true; }, /no_recorded_dissent/],
  ['termination suppression', (v) => { v.boundaries.committee_termination_is_suppression = true; }, /committee_termination/],
  ['publication effect', (v) => { v.boundaries.publication_effect = 'added'; }, /publication_effect/],
  ['graph effect', (v) => { v.boundaries.graph_effect = 'added'; }, /graph_effect/]
];
for (const [name, mutate, pattern] of protocolCases) expectProtocol(name, mutate, pattern);

const matrixCases = [
  ['matrix identity', (v) => { v.class_id = 'RD-05-C03'; }, /matrix identity/],
  ['matrix unit removed', (v) => { v.units.pop(); }, /17x10/],
  ['matrix field removed', (v) => { v.required_fields.pop(); }, /17x10/],
  ['matrix reorder', (v) => { [v.units[0], v.units[1]] = [v.units[1], v.units[0]]; }, /member order/],
  ['matrix duplicate name', (v) => { v.units[1].canonical_name = v.units[0].canonical_name; }, /duplicate member/],
  ['matrix duplicate profile', (v) => { v.units[1].profile_url = v.units[0].profile_url; }, /duplicate member profile/],
  ['matrix chair count', (v) => { v.units[1].leadership_role = 'chair'; }, /chair count/],
  ['matrix SGE count', (v) => { v.units[7].appointment_capacity = 'Representative'; }, /special-government-employee/],
  ['matrix invented affiliation', (v) => { v.units[10].affiliation = 'Invented'; }, /unaffiliated/],
  ['matrix Unicode identity', (v) => { v.units[14].canonical_name = 'Danielle Pineres'; }, /Unicode/],
  ['matrix roster hash', (v) => { v.source_anchors.roster_capture_sha256 = '0'.repeat(64); }, /roster custody/],
  ['matrix cell count', (v) => { v.expansion_contract.required_cells = 169; }, /expansion contract/],
  ['matrix terminal advance', (v) => { v.current_counts.terminal_cells = 1; }, /pre-execution counts/],
  ['matrix attendance inference', (v) => { v.boundaries.roster_membership_is_meeting_attendance = true; }, /roster_membership/],
  ['matrix graph effect', (v) => { v.boundaries.graph_effect = 'added'; }, /graph_effect/]
];
for (const [name, mutate, pattern] of matrixCases) expectMatrix(name, mutate, pattern);

const schemaCases = [
  ['schema open', (v) => { v.additionalProperties = true; }, /schema root/],
  ['schema required', (v) => { v.required.pop(); }, /required keys/],
  ['schema property', (v) => { v.properties.extra = { const: true }; }, /schema properties/],
  ['schema route binding', (v) => { v.properties.fixed_routes.const.pop(); }, /schema fixed_routes binding/]
];
for (const [name, mutate, pattern] of schemaCases) expectSchema(name, mutate, pattern);

const manifestCases = [
  ['manifest identity', (v) => { v.class_id = 'RD-05-C03'; }, /manifest identity/],
  ['manifest self include', (v) => { v.self_included = true; }, /hash contract/],
  ['manifest path removed', (v) => { v.permanent_paths.pop(); }, /permanent path denominator/],
  ['manifest entry removed', (v) => { v.entries.pop(); }, /manifest input order/],
  ['manifest digest', (v) => { v.entries[0].sha256 = '0'.repeat(64); }, /manifest digest/],
  ['manifest bytes', (v) => { v.entries[0].bytes += 1; }, /manifest byte count/],
  ['manifest route count', (v) => { v.counts.fixed_routes = 160; }, /manifest counts/],
  ['manifest request advance', (v) => { v.counts.request_attempts = 1; }, /advanced execution/],
  ['manifest publication', (v) => { v.boundaries.manifest_authorizes_publication = true; }, /manifest_authorizes_publication/],
  ['manifest graph', (v) => { v.boundaries.graph_effect = 'added'; }, /graph effect/]
];
for (const [name, mutate, pattern] of manifestCases) expectManifest(name, mutate, pattern);

console.log(`status-sovereignty-rd-wave03-rd05-member-participation-intake.test: positive plus ${protocolCases.length + matrixCases.length + schemaCases.length + manifestCases.length} adversarial mutations passed`);
