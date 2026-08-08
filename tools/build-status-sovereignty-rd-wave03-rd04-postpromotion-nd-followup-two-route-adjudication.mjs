import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_REL = "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication";
const DATA = path.join(ROOT, DATA_REL);
const WRITE = process.argv.includes('--write');
export const SCHEMA_VERSION = "ssc-rd04-postpromotion-nd-followup-two-route-adjudication@1";
export const PERMANENT_PATHS = [
  ".github/workflows/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.yml",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/capture-custody.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/field-adjudications.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/html-review-receipts.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/index.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/product-manifest.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/promotion-candidate-protocol.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/source-adjudications.json",
  "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication/transport-duplication-ledger.json",
  "docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.md",
  "schemas/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.schema.json",
  "test/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.test.js",
  "tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs",
  "tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-two-route-adjudication.mjs"
];
const PRIMARY_NAMES = ['capture-custody.json','field-adjudications.json','html-review-receipts.json','source-adjudications.json','transport-duplication-ledger.json'];

function canonical(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function readJson(name) { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); }
function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
function gitBlob(data) { return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${data.length}\0`), data])).digest('hex'); }
function writeOrCheck(name, value) {
  const text = canonical(value);
  const target = path.join(DATA, name);
  if (WRITE) fs.writeFileSync(target, text);
  else if (fs.readFileSync(target, 'utf8') !== text) throw new Error(`${name} is not the deterministic canonical product`);
}

export function deriveCandidateProtocol(field) {
  const candidates = field.decisions.filter((d) => d.promotion_candidate).map((d, i) => ({
    bounded_finding: d.bounded_finding,
    candidate_id: 'RD04-PPN-ND-FU-CANDIDATE-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION',
    candidate_ordinal: i + 1,
    class_closed: false,
    cumulative_ledger_effect: 'none',
    current_cell_canonical_sha256: field.frontier.target_cell_canonical_sha256[d.field_id],
    current_cell_requirement: 'must_remain_still_open_on_exact_promotion_parent',
    decision_id: d.decision_id,
    evidence_locators: d.evidence_locators,
    field_id: d.field_id,
    postal_code: d.postal_code,
    promotion_effect_authorized_here: 'none',
    row_state_effect: 'none',
    source_route_ids: d.source_route_ids,
    state_name: d.state_name,
    unit_id: d.unit_id,
  }));
  return {
    adoption_effect: 'none', candidate_count: candidates.length, candidates, class_closed: false,
    class_id: 'RD-04-C02', cumulative_ledger_effect: 'none', field_terminalizations: 0,
    graph_effect: 'none', held_cell_count: field.decisions.filter((d) => !d.promotion_candidate).length,
    issue: 1017, lane_id: 'RD-04', matrix_updates: 0, object_type: 'promotion_candidate_protocol',
    outside_human_dependency: false, promotion_parent: "048e9d13a2555d8e6fabdbee5f45aea858f919b7", promotion_parent_tree: "d354309d6b936b499c78f3d0ff47d20f69abda78",
    promotion_preconditions: [
      'exact canonical parent and current matrix blob are reauthenticated',
      'candidate cell remains still_open with the exact canonical cell hash',
      'candidate decision, authoritative artifact, source body, and HTML review identities remain unchanged',
      'duplicate transport artifacts retain zero additional substantive weight',
      'promotion occurs in a separate permanent product',
      'the held waiver-state cell does not enter the promotion denominator',
    ],
    publication_effect: 'none', row_state_mutations: 0, schema_version: SCHEMA_VERSION,
    unique_candidate_cell_count: candidates.length, wave_id: 'SSC-RD-W03',
  };
}

export function deriveIndex(capture, source, field) {
  return {
    authority_boundary: field.authority_boundary,
    candidate_summary: {candidate_cells: 1, held_open_cells: 1, matrix_updates: 0},
    capture_summary: {artifacts: 3, authoritative_artifacts: 1, duplicate_artifacts: 2, physical_requests_across_all_artifacts: 6, unique_body_identities: 2},
    class_id: 'RD-04-C02',
    field_summary: {field_adjudications: field.summary.field_adjudications, held_open: field.summary.held_open_fields, promotion_candidates: field.summary.evidence_complete_candidates},
    issue: 1017, lane_id: 'RD-04',
    matrix_summary: {class_closed: false, matrix_updates: 0, open_cells: field.frontier.open_matrix_cells_before, open_substantive_cells: field.frontier.open_substantive_cells_before, row_state_mutations: 0, terminal_cells: field.frontier.terminal_matrix_cells_before},
    object_paths: ['capture-custody.json','source-adjudications.json','field-adjudications.json','html-review-receipts.json','promotion-candidate-protocol.json','transport-duplication-ledger.json','product-manifest.json'],
    object_type: 'index', schema_version: SCHEMA_VERSION,
    source_summary: {field_review_sources: source.summary.field_review_sources, narrow_source_admissions: source.summary.narrow_source_admissions, source_decisions: source.summary.unique_body_decisions},
    wave_id: 'SSC-RD-W03',
  };
}

export function deriveManifest() {
  const hashedFiles = PERMANENT_PATHS.filter((p) => p !== `${DATA_REL}/product-manifest.json`).map((relative) => {
    const data = fs.readFileSync(path.join(ROOT, relative));
    return {bytes: data.length, git_blob: gitBlob(data), path: relative, sha256: sha256(data)};
  });
  const combined = Buffer.from(hashedFiles.map((r) => `${r.path}\0${r.bytes}\0${r.sha256}\0${r.git_blob}\n`).join(''));
  const field = readJson('field-adjudications.json');
  return {authority_boundary: field.authority_boundary, combined_sha256: sha256(combined), hashed_file_count: hashedFiles.length, hashed_files: hashedFiles, issue: 1017, object_type: 'product_manifest', permanent_path_count: PERMANENT_PATHS.length, permanent_paths: PERMANENT_PATHS, schema_version: SCHEMA_VERSION};
}

export function build() {
  for (const name of PRIMARY_NAMES) writeOrCheck(name, readJson(name));
  const capture = readJson('capture-custody.json');
  const source = readJson('source-adjudications.json');
  const field = readJson('field-adjudications.json');
  writeOrCheck('promotion-candidate-protocol.json', deriveCandidateProtocol(field));
  writeOrCheck('index.json', deriveIndex(capture, source, field));
  writeOrCheck('product-manifest.json', deriveManifest());
  return {candidate_count: 1, field_decision_count: 2, held_field_count: 1, permanent_path_count: PERMANENT_PATHS.length, source_decision_count: 2, transport_observations: 6, unique_body_count: 2};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(build()));
