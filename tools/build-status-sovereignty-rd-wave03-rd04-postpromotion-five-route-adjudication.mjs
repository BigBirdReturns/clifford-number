import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_REL = 'data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication';
const DATA = path.join(ROOT, DATA_REL);
const WRITE = process.argv.includes('--write');

export const PERMANENT_PATHS = [
  '.github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.yml',
  `${DATA_REL}/capture-custody.json`,
  `${DATA_REL}/field-adjudications.json`,
  `${DATA_REL}/index.json`,
  `${DATA_REL}/pdf-review-receipts.json`,
  `${DATA_REL}/product-manifest.json`,
  `${DATA_REL}/promotion-candidate-protocol.json`,
  `${DATA_REL}/selected-followup-protocol.json`,
  `${DATA_REL}/source-adjudications.json`,
  'docs/milestones/ssc-rd-wave03-rd04-postpromotion-five-route-adjudication.md',
  'schemas/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.schema.json',
  'test/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.test.js',
  'tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs',
  'tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs',
].sort();

const PRIMARY_NAMES = [
  'capture-custody.json',
  'field-adjudications.json',
  'pdf-review-receipts.json',
  'selected-followup-protocol.json',
  'source-adjudications.json',
];

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function gitBlob(data) {
  const header = Buffer.from(`blob ${data.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, data])).digest('hex');
}

function assertSame(name, expectedText) {
  const actual = fs.readFileSync(path.join(DATA, name), 'utf8');
  if (actual !== expectedText) {
    throw new Error(`${name} is not the deterministic canonical product`);
  }
}

function writeOrCheck(name, value) {
  const text = canonical(value);
  if (WRITE) {
    fs.writeFileSync(path.join(DATA, name), text);
  } else {
    assertSame(name, text);
  }
}

export function deriveCandidateProtocol(field) {
  const candidates = field.decisions
    .filter((decision) => decision.promotion_candidate)
    .map((decision, index) => ({
      bounded_finding: decision.bounded_finding,
      candidate_id: decision.decision_id.replace('RD04-PPN-', 'RD04-PPN-CANDIDATE-'),
      candidate_ordinal: index + 1,
      class_closed: false,
      cumulative_ledger_effect: 'none',
      current_cell_requirement: 'must_remain_still_open_on_exact_promotion_parent',
      decision_id: decision.decision_id,
      evidence_locators: decision.evidence_locators,
      field_id: decision.field_id,
      postal_code: decision.postal_code,
      promotion_effect_authorized_here: 'none',
      row_state_effect: 'none',
      source_route_ids: decision.source_route_ids,
      state_name: decision.state_name,
      unit_id: decision.unit_id,
    }));
  return {
    adoption_effect: 'none',
    candidate_count: candidates.length,
    candidates,
    class_closed: false,
    class_id: 'RD-04-C02',
    cumulative_ledger_effect: 'none',
    field_terminalizations: 0,
    graph_effect: 'none',
    held_cell_count: field.decisions.filter((decision) => !decision.promotion_candidate).length,
    issue: 1017,
    lane_id: 'RD-04',
    matrix_updates: 0,
    object_type: 'promotion_candidate_protocol',
    outside_human_dependency: false,
    promotion_preconditions: [
      'exact matrix parent and selected cells are reauthenticated',
      'each candidate cell remains still_open',
      'candidate decision and source body identities remain unchanged',
      'promotion occurs in a separate permanent product',
      'no held cell enters the promotion denominator',
    ],
    publication_effect: 'none',
    row_state_mutations: 0,
    schema_version: 'ssc-rd04-postpromotion-five-route-adjudication@1',
    unique_candidate_cell_count: candidates.length,
    wave_id: 'SSC-RD-W03',
  };
}

export function deriveIndex(capture, source, field, followup) {
  return {
    authority_boundary: field.authority_boundary,
    class_id: 'RD-04-C02',
    field_summary: {
      field_adjudications: field.summary.field_adjudications,
      held_open: field.summary.held_open_fields,
      promotion_candidates: field.summary.evidence_complete_candidates,
    },
    followup_summary: {
      fixed_routes: followup.fixed_route_count,
      maximum_later_requests: followup.maximum_total_requests_in_later_separate_execution,
      requests_executed: 0,
    },
    issue: 1017,
    lane_id: 'RD-04',
    matrix_summary: {
      class_closed: false,
      matrix_updates: 0,
      open_cells: field.frontier.open_matrix_cells_before,
      open_substantive_cells: field.frontier.open_substantive_cells_before,
      row_state_mutations: 0,
      terminal_cells: field.frontier.terminal_matrix_cells_before,
    },
    object_paths: [
      'capture-custody.json',
      'source-adjudications.json',
      'field-adjudications.json',
      'pdf-review-receipts.json',
      'promotion-candidate-protocol.json',
      'selected-followup-protocol.json',
      'product-manifest.json',
    ],
    object_type: 'index',
    schema_version: 'ssc-rd04-postpromotion-five-route-adjudication@1',
    source_summary: {
      field_review_sources: source.summary.field_review_sources,
      narrow_source_admissions: source.summary.narrow_source_admissions,
      source_decisions: source.summary.unique_body_decisions,
    },
    transport_summary: {
      http_attempts: capture.transport_ledger.total_http_attempts,
      successful_execution_count: capture.transport_ledger.successful_execution_count,
      unique_body_identities: capture.transport_ledger.unique_body_identity_count,
    },
    wave_id: 'SSC-RD-W03',
  };
}

export function deriveManifest() {
  const hashedFiles = PERMANENT_PATHS
    .filter((relative) => relative !== `${DATA_REL}/product-manifest.json`)
    .map((relative) => {
      const data = fs.readFileSync(path.join(ROOT, relative));
      return {
        bytes: data.length,
        git_blob: gitBlob(data),
        path: relative,
        sha256: sha256(data),
      };
    });
  const combined = Buffer.from(
    hashedFiles.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\0${row.git_blob}\n`).join(''),
  );
  const field = readJson('field-adjudications.json');
  return {
    authority_boundary: field.authority_boundary,
    combined_sha256: sha256(combined),
    hashed_file_count: hashedFiles.length,
    hashed_files: hashedFiles,
    issue: 1017,
    object_type: 'product_manifest',
    permanent_path_count: PERMANENT_PATHS.length,
    permanent_paths: PERMANENT_PATHS,
    schema_version: 'ssc-rd04-postpromotion-five-route-adjudication@1',
  };
}

export function build() {
  fs.mkdirSync(DATA, { recursive: true });
  for (const name of PRIMARY_NAMES) {
    const value = readJson(name);
    writeOrCheck(name, value);
  }
  const capture = readJson('capture-custody.json');
  const source = readJson('source-adjudications.json');
  const field = readJson('field-adjudications.json');
  const followup = readJson('selected-followup-protocol.json');
  writeOrCheck('promotion-candidate-protocol.json', deriveCandidateProtocol(field));
  writeOrCheck('index.json', deriveIndex(capture, source, field, followup));
  writeOrCheck('product-manifest.json', deriveManifest());
  return {
    candidate_count: deriveCandidateProtocol(field).candidate_count,
    field_decision_count: field.decisions.length,
    followup_route_count: followup.routes.length,
    permanent_path_count: PERMANENT_PATHS.length,
    source_decision_count: source.decisions.length,
    transport_attempts: capture.transport_ledger.total_http_attempts,
    unique_body_count: capture.transport_ledger.unique_body_identity_count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(build()));
}
