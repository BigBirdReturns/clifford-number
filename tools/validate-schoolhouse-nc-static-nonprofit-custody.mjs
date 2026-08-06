import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = 'data/intake/bvvc-defense-capital';
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function validateSchoolhouseNcStaticNonprofitCustody(dir = DEFAULT_DIR) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const manifest = readJson(path.join(dir, 'manifest.json'));
  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));
  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));
  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));
  const source = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-source-receipt.json'));
  const routes = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-route-results.jsonl'));
  const targets = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-target-matrix.json'));
  const adjudication = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-adjudication.json'));
  const candidates = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-candidate-rows.jsonl'));
  const blockHits = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-block-hit-receipts.jsonl'));
  const custody = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-census-custody.json'));
  const sourceRows = readJsonl(path.join(dir, 'source-inventory-20.jsonl'));

  check(manifest.counts.source_inventory_rows === 482, 'source inventory denominator');
  check(manifest.counts.coverage_denominator_rows === 31, 'coverage denominator');
  check(manifest.counts.explicit_gap_rows === 16, 'gap denominator');
  check(manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl', 'source inventory tail');
  check(manifest.source_inventory.evidence_class_counts.official === 257, 'official evidence count');
  check(manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_html_surface === 2, 'NC source state count');
  check(coverage.denominators.length === 31, 'coverage row length');
  check(coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit report custody' && row.enumerated_total === 2 && row.body_bytes_screened === 1040288 && row.table_data_rows_screened === 0 && row.candidate_total === 0 && row.admitted_identities === 0), 'coverage projection');

  check(source.schema_version === 'schoolhouse-nc-static-nonprofit-source-receipt@1' && source.routes.length === 2, 'source receipt');
  check(routes.length === 2 && new Set(routes.map(row => row.route_id)).size === 2, 'route denominator');
  check(routes.reduce((sum, row) => sum + row.body_bytes, 0) === 1040288, 'route byte total');
  check(routes.reduce((sum, row) => sum + row.visible_text_chars_screened, 0) === 58971, 'visible text total');
  check(routes.reduce((sum, row) => sum + row.script_text_chars_screened, 0) === 4044, 'script text total');
  check(routes.every(row => row.method === 'GET' && row.http_status === 200 && row.state === 'accessible_static_html' && row.table_count === 0 && row.table_rows_total === 0 && row.table_data_rows === 0 && row.candidate_rows === 0 && row.candidate_block_hits === 0), 'route terminal state');
  check(routes.every(row => row.query_submitted === false && row.form_submitted === false && row.raw_source_retained === false && row.raw_html_retained === false && row.raw_visible_text_retained === false && row.raw_script_text_retained === false), 'route acquisition boundary');
  check(routes.every(row => row.street_address_rows_retained === 0 && row.mailing_address_rows_retained === 0 && row.postal_code_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'route privacy boundary');
  check(routes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'route authority boundary');
  check(targets.routes.length === 2 && targets.person_targets.map(row => row.public_label).join('|') === 'Joe Musselman|Alex Martin|Leyla Gladish|Nicole Nsam' && targets.interactive_search_prohibited === true, 'target matrix');
  check(candidates.length === 0 && blockHits.length === 0, 'candidate/block-hit denominator');
  check(adjudication.public_schoolhouse_identity_admitted === false && adjudication.negative_existence_claim_created === false && adjudication.outside_human_dependency === false && adjudication.graph_effect === 'none', 'adjudication authority');
  check(custody.canonical_parent.commit === 'b6d69b5502e4429e3769591b5ebd88555aad62be' && custody.canonical_parent.tree === 'f3d6a9f856dd22833f11847ae4b18bdbd4151890', 'parent custody');
  check(custody.acquisition.workflow_run_id === 31065319021 && custody.acquisition.artifact_id === 8953623153 && custody.acquisition.artifact_digest === 'sha256:f1462cc30b2f34d56ab59d0711d88e4ef4017a8eded51406b511c6cbc84210cc', 'acquisition custody');
  check(custody.counts.declared_static_routes === 2 && custody.counts.body_bytes_screened === 1040288 && custody.counts.table_data_rows_screened === 0 && custody.counts.candidate_rows === 0 && custody.counts.identity_admitted_rows === 0, 'custody counts');
  check(custody.interpretation.zero_rendered_table_rows_are_not_zero_records === true && custody.interpretation.zero_candidate_rows_are_not_absence_evidence === true, 'custody interpretation');
  check(custody.public_schoolhouse_identity_admitted === false && custody.relationship_admitted === false && custody.negative_existence_claim_created === false && custody.outside_human_dependency === false && custody.graph_effect === 'none', 'custody authority');
  check(sourceRows.length === 2 && new Set(sourceRows.map(row => row.receipt_id)).size === 2, 'source inventory rows');
  check(sourceRows.every(row => row.evidence_class === 'official' && row.source_state === 'captured_nc_static_nonprofit_html_surface' && row.request_method === 'GET' && row.http_status === 200 && row.source_rows_acquired === 0 && row.candidate_rows === 0), 'source inventory semantics');
  check(sourceRows.every(row => row.query_submitted === false && row.form_submitted === false && row.raw_source_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'source inventory privacy');
  check(sourceRows.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'source inventory authority');
  const projection = schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_census;
  check(projection?.declared_static_routes === 2 && projection?.table_data_rows_screened === 0 && projection?.candidate_rows === 0 && projection?.public_schoolhouse_identity_admitted === false, 'School.House projection');
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_nc_static_nonprofit_census;
  check(task?.declared_static_routes === 2 && task?.table_data_rows_screened === 0 && task?.candidate_rows === 0 && task?.admitted_identities === 0, 'frontier projection');
  for (const filename of ['schoolhouse-nc-static-nonprofit-census-source-receipt.json','schoolhouse-nc-static-nonprofit-census-route-results.jsonl','schoolhouse-nc-static-nonprofit-census-target-matrix.json','schoolhouse-nc-static-nonprofit-census-adjudication.json','schoolhouse-nc-static-nonprofit-census-candidate-rows.jsonl','schoolhouse-nc-static-nonprofit-census-block-hit-receipts.jsonl','schoolhouse-nc-static-nonprofit-census-custody.json','source-inventory-20.jsonl']) {
    const expected = manifest.files[filename];
    const file = path.join(dir, filename);
    check(Boolean(expected) && fs.existsSync(file), `manifest-bound file missing: ${filename}`);
    if (expected && fs.existsSync(file)) { check(fs.statSync(file).size === expected.bytes, `byte drift: ${filename}`); check(sha256(file) === expected.sha256, `hash drift: ${filename}`); }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateSchoolhouseNcStaticNonprofitCustody(process.argv[2] || DEFAULT_DIR);
  if (errors.length) { for (const error of errors) console.error(`ERROR: ${error}`); process.exit(1); }
  console.log('School.House NC static nonprofit custody: PASS');
}
