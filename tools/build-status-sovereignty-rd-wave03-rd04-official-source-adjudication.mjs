#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = 'data/intake/status-sovereignty-rd-wave03-rd04-official-source-adjudication';
export const REPLAY_RECEIPT_PATH = `${DATA_DIR}/replay-execution-receipt.json`;
export const FEDERAL_CONTEXT_PATH = `${DATA_DIR}/federal-context-sources.json`;
export const STATE_SOURCES_PATH = `${DATA_DIR}/state-directory-sources.jsonl`;
export const INDEX_PATH = `${DATA_DIR}/source-adjudication-index.json`;
export const MATRIX_PATH = `${DATA_DIR}/partial-field-matrix.json`;
export const NEXT_PROTOCOL_PATH = `${DATA_DIR}/next-source-protocol.json`;
export const PRODUCT_MANIFEST_PATH = `${DATA_DIR}/product-manifest.json`;
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave03-rd04-official-source-adjudication.schema.json';
export const TEST_PATH = 'test/status-sovereignty-rd-wave03-rd04-official-source-adjudication.test.js';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs';
export const RUNNER_PATH = 'tools/acquisition/status-sovereignty-rd-wave03-rd04/run-state-source-protocol.py';
export const MILESTONE_PATH = 'docs/milestones/ssc-rd-wave03-rd04-official-source-adjudication.md';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd-wave03-rd04-official-source-adjudication.yml';
export const SUCCESSOR_TRIGGER_PATH = '.ssc-rd04-wave03-state-source-trigger/EXECUTE';
export const PRODUCT_PATHS = Object.freeze([
  WORKFLOW_PATH,
  FEDERAL_CONTEXT_PATH,
  INDEX_PATH,
  MATRIX_PATH,
  NEXT_PROTOCOL_PATH,
  PRODUCT_MANIFEST_PATH,
  REPLAY_RECEIPT_PATH,
  STATE_SOURCES_PATH,
  MILESTONE_PATH,
  SCHEMA_PATH,
  TEST_PATH,
  RUNNER_PATH,
  'tools/build-status-sovereignty-rd-wave03-rd04-official-source-adjudication.mjs',
  VALIDATOR_PATH
].sort());

export const FIELD_ORDER = Object.freeze([
  'canonical_state_identity',
  'operative_state_implementation_authority_and_version',
  'implementation_effective_date_or_typed_gap',
  'abawd_or_work_requirement_waiver_state_and_governing_period',
  'discretionary_exemption_authority_and_reported_state_practice',
  'fitness_for_work_or_eligibility_screening_rule',
  'verification_evidence_and_staff_discretion_surface',
  'source_identities_and_exact_custody',
  'field_and_row_terminal_state'
]);
export const TERMINAL_FIELDS = Object.freeze(['canonical_state_identity', 'source_identities_and_exact_custody']);
export const OPEN_FIELDS = Object.freeze(FIELD_ORDER.filter((field) => !TERMINAL_FIELDS.includes(field)));

const abs = (root, rel) => path.join(root, rel);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const readJsonl = (root, rel) => fs.readFileSync(abs(root, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const ok = (value, message) => { if (!value) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const exactKeys = (value, keys, message) => same(Object.keys(value), keys, message);
const fileEntry = (root, rel) => {
  const bytes = fs.readFileSync(abs(root, rel));
  return { path: rel.replace(`${DATA_DIR}/`, ''), bytes: bytes.length, sha256: sha(bytes) };
};
const sortedPaths = (paths) => [...paths].filter(Boolean).sort();
const samePathSet = (actual, expected) => JSON.stringify(sortedPaths(actual)) === JSON.stringify(sortedPaths(expected));

export function allowedFinalHostSuffix(url) {
  const host = new URL(url).hostname.toLowerCase();
  const labels = host.split('.');
  if (host.endsWith('.us') && labels.length >= 3) return labels.slice(-3).join('.');
  if (labels.length >= 2) return labels.slice(-2).join('.');
  return host;
}

export function validateStateSource(row, expectedOrdinal) {
  const keys = [
    'source_id','replay_route_id','source_route_id','unit_ordinal','unit_id','postal_code','state_name',
    'source_type','source_scope','source_admitted','admitted_for','not_admitted_for','directory_url',
    'program_name','ebt_card_name','state_snap_website','state_snap_website_host',
    'state_snap_allowed_final_host_suffix','local_office_locations','benefit_issuance_schedule',
    'employment_training_program','apply_for_benefits','state_ebt_website','state_phones','ebt_phones',
    'page_updated','body_bytes','body_sha256','headers_sha256','field_effects','next_route_selected',
    'result_spawned_requests'
  ];
  exactKeys(row, keys, `state source ${expectedOrdinal}: key order or set changed`);
  ok(row.unit_ordinal === expectedOrdinal, `state source ${expectedOrdinal}: unit ordinal changed`);
  ok(row.source_id === `RD04-SOURCE-STATE-${row.postal_code}`, `state source ${expectedOrdinal}: source identity changed`);
  ok(row.unit_id === `US-STATE-${row.postal_code}`, `state source ${expectedOrdinal}: unit identity changed`);
  ok(row.replay_route_id === `RD04-W03-FNA-${String(expectedOrdinal + 4).padStart(3, '0')}`, `state source ${expectedOrdinal}: replay route changed`);
  ok(row.source_route_id === `RD04-W03-${String(expectedOrdinal).padStart(2, '0')}-DIRECTORY`, `state source ${expectedOrdinal}: source route changed`);
  ok(row.source_type === 'official_federal_state_directory_entry', `state source ${expectedOrdinal}: source type changed`);
  ok(row.source_scope === 'state_identity_exact_custody_and_state_agency_locator_only', `state source ${expectedOrdinal}: source scope changed`);
  ok(row.source_admitted === true, `state source ${expectedOrdinal}: scoped source admission changed`);
  same(row.admitted_for, ['canonical_state_identity','source_identities_and_exact_custody','next_state_agency_route_selection'], `state source ${expectedOrdinal}: admission scope changed`);
  same(row.not_admitted_for, OPEN_FIELDS, `state source ${expectedOrdinal}: refusal scope changed`);
  ok(new URL(row.directory_url).hostname === 'www.fna.usda.gov', `state source ${expectedOrdinal}: directory host changed`);
  const stateHost = new URL(row.state_snap_website).hostname.toLowerCase();
  ok(row.state_snap_website_host === stateHost, `state source ${expectedOrdinal}: state route host changed`);
  ok(row.state_snap_allowed_final_host_suffix === allowedFinalHostSuffix(row.state_snap_website), `state source ${expectedOrdinal}: allowed host suffix changed`);
  ok(typeof row.program_name === 'string' && row.program_name.length > 0, `state source ${expectedOrdinal}: program name missing`);
  ok(typeof row.ebt_card_name === 'string' && row.ebt_card_name.length > 0, `state source ${expectedOrdinal}: EBT card name missing`);
  ok(Number.isInteger(row.body_bytes) && row.body_bytes > 0, `state source ${expectedOrdinal}: body byte count changed`);
  ok(/^[0-9a-f]{64}$/.test(row.body_sha256) && /^[0-9a-f]{64}$/.test(row.headers_sha256), `state source ${expectedOrdinal}: hash custody changed`);
  same(Object.keys(row.field_effects), FIELD_ORDER, `state source ${expectedOrdinal}: field-effect order changed`);
  for (const field of FIELD_ORDER) {
    const expected = TERMINAL_FIELDS.includes(field) ? 'evidence_complete' : 'none';
    ok(row.field_effects[field] === expected, `state source ${expectedOrdinal}: ${field} authority changed`);
  }
  ok(row.next_route_selected === true && row.result_spawned_requests === 0, `state source ${expectedOrdinal}: next-route authority changed`);
  return true;
}

export function validateFederalSource(row, expectedIndex) {
  const keys = [
    'source_id','replay_route_id','source_route_id','source_type','source_scope','source_admitted',
    'admitted_for','not_admitted_for_state_fields','title','final_url','page_updated','body_bytes',
    'body_sha256','headers_sha256','field_classification_effect','successor_routes','result_spawned_requests'
  ];
  exactKeys(row, keys, `federal source ${expectedIndex}: key order or set changed`);
  const expected = [
    ['RD04-SOURCE-FED-STATE-DIRECTORY','RD04-W03-FNA-001','RD04-W03-FED-STATE-DIRECTORY','official_federal_state_directory_index',0],
    ['RD04-SOURCE-FED-STATE-OPTIONS','RD04-W03-FNA-002','RD04-W03-FED-STATE-OPTIONS','official_federal_state_options_index',1],
    ['RD04-SOURCE-FED-FITNESS-WORK','RD04-W03-FNA-003','RD04-W03-FED-FITNESS-WORK','official_cross_state_fitness_for_work_research_index',3],
    ['RD04-SOURCE-FED-WORK-REQUIREMENTS','RD04-W03-FNA-004','RD04-W03-FED-WORK-REQUIREMENTS','official_current_federal_work_requirement_context',0]
  ][expectedIndex - 1];
  ok(expected, `federal source ${expectedIndex}: unexpected ordinal`);
  same([row.source_id,row.replay_route_id,row.source_route_id,row.source_type,row.successor_routes.length], expected, `federal source ${expectedIndex}: identity or successor denominator changed`);
  ok(row.source_admitted === true, `federal source ${expectedIndex}: scoped source admission changed`);
  same(row.not_admitted_for_state_fields, FIELD_ORDER, `federal source ${expectedIndex}: state-field refusal changed`);
  ok(new URL(row.final_url).hostname === 'www.fna.usda.gov', `federal source ${expectedIndex}: final host changed`);
  ok(Number.isInteger(row.body_bytes) && row.body_bytes > 0, `federal source ${expectedIndex}: body bytes changed`);
  ok(/^[0-9a-f]{64}$/.test(row.body_sha256) && /^[0-9a-f]{64}$/.test(row.headers_sha256), `federal source ${expectedIndex}: hash custody changed`);
  ok(row.field_classification_effect === 'none' && row.result_spawned_requests === 0, `federal source ${expectedIndex}: field or request authority changed`);
  row.successor_routes.forEach((route) => {
    exactKeys(route, ['route_id','purpose','label','requested_url','allowed_final_host_suffix','maximum_attempts','maximum_body_bytes','result_spawned_requests'], `${route.route_id}: successor keys changed`);
    ok(new URL(route.requested_url).hostname === 'www.fna.usda.gov', `${route.route_id}: successor host changed`);
    ok(route.allowed_final_host_suffix === 'fna.usda.gov' && route.maximum_attempts === 1 && route.result_spawned_requests === 0, `${route.route_id}: successor request contract changed`);
  });
  return true;
}

export function makeMatrixCell(source, fieldId, fieldOrdinal) {
  const terminal = TERMINAL_FIELDS.includes(fieldId);
  let value = null;
  let typedGap = 'no_admitted_state_implementation_source_yet';
  let authorityEffect = 'none';
  let evidence = [];
  if (fieldId === 'canonical_state_identity') {
    value = { unit_id: source.unit_id, postal_code: source.postal_code, state_name: source.state_name };
    typedGap = null;
    authorityEffect = 'canonical_state_identity_only';
    evidence = [source.source_id];
  } else if (fieldId === 'source_identities_and_exact_custody') {
    value = {
      directory_url: source.directory_url,
      state_snap_website: source.state_snap_website,
      replay_route_id: source.replay_route_id,
      body_sha256: source.body_sha256,
      headers_sha256: source.headers_sha256,
      page_updated: source.page_updated
    };
    typedGap = null;
    authorityEffect = 'exact_locator_and_response_custody_only';
    evidence = [source.source_id];
  } else if (fieldId === 'field_and_row_terminal_state') {
    typedGap = 'row_remains_open_because_seven_substantive_fields_are_unresolved';
  }
  return {
    field_ordinal: fieldOrdinal,
    field_id: fieldId,
    state: terminal ? 'evidence_complete' : 'still_open',
    terminal,
    value,
    evidence_source_ids: evidence,
    typed_gap: typedGap,
    authority_effect: authorityEffect
  };
}

export function validateMatrixCell(cell, source, fieldId, fieldOrdinal) {
  same(cell, makeMatrixCell(source, fieldId, fieldOrdinal), `${source.postal_code}/${fieldId}: matrix cell changed`);
  return true;
}

export function derivePartialFieldMatrix(stateSources) {
  const rows = stateSources.map((source, index) => {
    validateStateSource(source, index + 1);
    const cells = FIELD_ORDER.map((fieldId, fieldIndex) => makeMatrixCell(source, fieldId, fieldIndex + 1));
    return {
      unit_ordinal: source.unit_ordinal,
      unit_id: source.unit_id,
      postal_code: source.postal_code,
      state_name: source.state_name,
      row_state: 'still_open',
      terminal_fields: 2,
      open_fields: 7,
      cells
    };
  });
  return {
    schema_version: 'ssc-rd04-wave03-official-source-partial-field-matrix@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    field_order: [...FIELD_ORDER],
    counts: {
      units: 50, required_fields_per_unit: 9, materialized_cells: 450,
      evidence_complete_cells: 100, still_open_cells: 350, terminal_cells: 100,
      terminal_units: 0, class_closed: false
    },
    rows,
    current_result: {
      canonical_state_identity_terminal: '50/50',
      source_identities_and_exact_custody_terminal: '50/50',
      operative_state_implementation_authority_terminal: '0/50',
      substantive_state_fields_open: 350,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false
    }
  };
}

export function makeNextRouteFromFederal(successor, routeOrdinal) {
  return {
    route_ordinal: routeOrdinal,
    route_id: successor.route_id,
    route_type: 'exact_official_pdf_get',
    scope: 'shared_federal',
    purpose: successor.purpose,
    source_id: successor.route_id.startsWith('RD04-W03-NEXT-FED-001') ? 'RD04-SOURCE-FED-STATE-OPTIONS' : 'RD04-SOURCE-FED-FITNESS-WORK',
    requested_url: successor.requested_url,
    allowed_final_host_suffix: successor.allowed_final_host_suffix,
    maximum_attempts: 1,
    maximum_body_bytes: successor.maximum_body_bytes,
    automatic_source_admission: false,
    automatic_field_classification: false,
    automatic_class_closure: false,
    result_spawned_requests: 0
  };
}

export function makeNextRouteFromState(source, routeOrdinal) {
  return {
    route_ordinal: routeOrdinal,
    route_id: `RD04-W03-NEXT-STATE-${String(source.unit_ordinal).padStart(2, '0')}`,
    route_type: 'exact_state_agency_get',
    scope: 'state',
    unit_ordinal: source.unit_ordinal,
    unit_id: source.unit_id,
    postal_code: source.postal_code,
    state_name: source.state_name,
    purpose: 'acquire the exact state SNAP program root selected by the official federal state-directory entry',
    source_id: source.source_id,
    requested_url: source.state_snap_website,
    allowed_final_host_suffix: source.state_snap_allowed_final_host_suffix,
    maximum_attempts: 1,
    maximum_body_bytes: 16777216,
    automatic_source_admission: false,
    automatic_field_classification: false,
    automatic_class_closure: false,
    result_spawned_requests: 0
  };
}

export function validateNextRoute(route, expectedOrdinal) {
  ok(route.route_ordinal === expectedOrdinal, `next route ${expectedOrdinal}: ordinal changed`);
  ok(route.maximum_attempts === 1 && route.result_spawned_requests === 0, `next route ${expectedOrdinal}: request ceiling changed`);
  ok(route.automatic_source_admission === false && route.automatic_field_classification === false && route.automatic_class_closure === false, `next route ${expectedOrdinal}: automatic authority changed`);
  const host = new URL(route.requested_url).hostname.toLowerCase();
  ok(host === route.allowed_final_host_suffix || host.endsWith(`.${route.allowed_final_host_suffix}`), `next route ${expectedOrdinal}: requested host outside declared suffix`);
  if (expectedOrdinal <= 4) {
    ok(route.scope === 'shared_federal' && route.route_id === `RD04-W03-NEXT-FED-${String(expectedOrdinal).padStart(3, '0')}`, `next route ${expectedOrdinal}: federal identity changed`);
  } else {
    const unitOrdinal = expectedOrdinal - 4;
    ok(route.scope === 'state' && route.unit_ordinal === unitOrdinal, `next route ${expectedOrdinal}: state ordinal changed`);
    ok(route.route_id === `RD04-W03-NEXT-STATE-${String(unitOrdinal).padStart(2, '0')}`, `next route ${expectedOrdinal}: state route identity changed`);
  }
  return true;
}

export function deriveNextSourceProtocol(federalSources, stateSources) {
  const routes = [];
  for (const source of federalSources) {
    for (const successor of source.successor_routes) routes.push(makeNextRouteFromFederal(successor, routes.length + 1));
  }
  ok(routes.length === 4, 'federal successor denominator changed');
  for (const source of stateSources) routes.push(makeNextRouteFromState(source, routes.length + 1));
  ok(routes.length === 54, 'next-route denominator changed');
  routes.forEach((route, index) => validateNextRoute(route, index + 1));
  return {
    schema_version: 'ssc-rd04-wave03-state-source-protocol@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    title: 'RD-04 exact state SNAP roots and decisive federal document capture',
    authority: 'fixed_source_acquisition_not_source_admission_or_field_classification',
    execution_trigger_path: SUCCESSOR_TRIGGER_PATH,
    denominator: {
      federal_document_routes: 4, state_agency_root_routes: 50, fixed_routes: 54,
      maximum_attempts_per_route: 1, maximum_parallel_workers: 6, result_spawned_requests: 0
    },
    route_order: 'four decisive federal PDFs followed by fifty states in frozen unit order',
    routes,
    boundaries: {
      state_agency_root_is_operative_implementation_authority: false,
      federal_report_is_current_state_practice: false,
      federal_rule_is_state_implementation: false,
      waiver_authority_is_requested_approved_or_current_waiver: false,
      exemption_authority_is_observed_use: false,
      screening_research_is_uniform_staff_practice: false,
      http_success_is_source_admission: false,
      automatic_source_admission: false,
      automatic_field_classification: false,
      automatic_class_closure: false,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    }
  };
}

export function deriveSourceAdjudicationIndex(root = ROOT, federalSources, stateSources, matrix, protocol) {
  const receipt = readJson(root, REPLAY_RECEIPT_PATH);
  const matrixHash = sha(jsonBytes(matrix));
  const protocolHash = sha(jsonBytes(protocol));
  return {
    schema_version: 'ssc-rd04-wave03-official-source-adjudication-index@1',
    wave_id: 'SSC-RD-W03', lane_id: 'RD-04', class_id: 'RD-04-C02', issue: 1017,
    replay_execution_receipt_path: 'replay-execution-receipt.json',
    replay_artifact_id: receipt.artifact_id,
    replay_artifact_zip_sha256: receipt.artifact_zip_sha256,
    source_classes: {
      official_federal_context_sources: 4,
      official_federal_state_directory_locator_sources: 50,
      state_implementation_sources_admitted: 0
    },
    counts: {
      replay_routes_adjudicated: 54,
      scoped_source_decisions: 54,
      scoped_sources_admitted: 54,
      state_locator_sources: 50,
      federal_context_sources: 4,
      state_implementation_sources_admitted: 0,
      materialized_field_cells: 450,
      terminal_field_cells: 100,
      still_open_field_cells: 350,
      terminal_units: 0,
      next_fixed_routes: 54,
      result_spawned_requests: 0
    },
    derived_products: {
      partial_field_matrix_path: 'partial-field-matrix.json',
      partial_field_matrix_sha256: matrixHash,
      next_source_protocol_path: 'next-source-protocol.json',
      next_source_protocol_sha256: protocolHash
    },
    current_result: {
      replay_source_adjudication_complete: true,
      canonical_state_identity_terminal: '50/50',
      source_identity_and_custody_terminal: '50/50',
      state_implementation_universe_complete: false,
      field_matrix_terminal: false,
      class_state: 'still_open',
      class_closed: false,
      outside_human_dependency: false,
      publication_effect: 'none', adoption_effect: 'none', graph_effect: 'none'
    },
    next_bounded_operation: 'execute exactly the 54-route state-source protocol, retain every response, and separately adjudicate source and field authority'
  };
}

export function deriveProductManifest(root = ROOT) {
  const paths = [REPLAY_RECEIPT_PATH, FEDERAL_CONTEXT_PATH, STATE_SOURCES_PATH, INDEX_PATH, MATRIX_PATH, NEXT_PROTOCOL_PATH];
  const entries = paths.map((rel) => fileEntry(root, rel));
  const combined = sha(Buffer.from(entries.map((entry) => `${entry.path}\t${entry.bytes}\t${entry.sha256}`).join('\n') + '\n'));
  return { schema_version: 'ssc-rd04-wave03-official-source-adjudication-product-manifest@1', entries, combined_sha256: combined };
}

export function expectedSuccessorTriggerText(root = ROOT) {
  const digest = sha(fs.readFileSync(abs(root, NEXT_PROTOCOL_PATH)));
  return [
    'source_adjudication_schema=ssc-rd04-wave03-official-source-adjudication-index@1',
    `protocol_path=${NEXT_PROTOCOL_PATH}`,
    `protocol_sha256=${digest}`,
    'fixed_routes=54',
    'maximum_attempts_per_route=1',
    'maximum_parallel_workers=6',
    'result_spawned_requests=0',
    'automatic_source_admission=false',
    'automatic_field_classification=false',
    'automatic_class_closure=false',
    'outside_human_dependency=false'
  ].join('\n') + '\n';
}

export function validateSuccessorTriggerText(value, root = ROOT) {
  ok(value === expectedSuccessorTriggerText(root), 'state-source trigger content changed');
  return true;
}

export function classifyChangedPathSurface(changed) {
  if (samePathSet(changed, [])) return 'canonical_main';
  if (samePathSet(changed, PRODUCT_PATHS)) return 'permanent_product';
  if (samePathSet(changed, [SUCCESSOR_TRIGGER_PATH])) return 'state_source_trigger';
  throw new Error(`unauthorized changed path surface: ${sortedPaths(changed).join(',') || '<empty>'}`);
}

function writeJson(root, rel, value) {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), jsonBytes(value));
}

function run() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check') || !write;
  const stateSources = readJsonl(ROOT, STATE_SOURCES_PATH);
  const federalBundle = readJson(ROOT, FEDERAL_CONTEXT_PATH);
  ok(federalBundle.schema_version === 'ssc-rd04-wave03-federal-context-source-adjudication@1', 'federal context schema changed');
  const federalSources = federalBundle.sources;
  ok(stateSources.length === 50 && federalSources.length === 4, 'source denominator changed');
  stateSources.forEach((row, index) => validateStateSource(row, index + 1));
  federalSources.forEach((row, index) => validateFederalSource(row, index + 1));
  ok(new Set(stateSources.map((row) => row.postal_code)).size === 50, 'state postal codes are not unique');
  ok(new Set(stateSources.map((row) => row.state_snap_website)).size === 50, 'state SNAP roots are not unique');
  const matrix = derivePartialFieldMatrix(stateSources);
  const protocol = deriveNextSourceProtocol(federalSources, stateSources);
  const index = deriveSourceAdjudicationIndex(ROOT, federalSources, stateSources, matrix, protocol);
  for (const [rel, value] of [[MATRIX_PATH, matrix], [NEXT_PROTOCOL_PATH, protocol], [INDEX_PATH, index]]) {
    if (write) writeJson(ROOT, rel, value);
    if (check) same(readJson(ROOT, rel), value, `${rel}: differs from deterministic derivation`);
  }
  const manifest = deriveProductManifest(ROOT);
  if (write) writeJson(ROOT, PRODUCT_MANIFEST_PATH, manifest);
  if (check) same(readJson(ROOT, PRODUCT_MANIFEST_PATH), manifest, 'product manifest differs from deterministic derivation');
  console.log('RD-04 official source adjudication built: 54 scoped sources, 100/450 terminal cells, 54 fixed successor routes, class still open');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) run();
