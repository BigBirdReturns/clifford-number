import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = 'data/intake/bvvc-defense-capital';
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function validateSchoolhouseNcStaticNonprofitAnchorCustody(dir = DEFAULT_DIR) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const manifest = readJson(path.join(dir, 'manifest.json'));
  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));
  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));
  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));
  const pages = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-page-receipts.jsonl'));
  const links = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-link-observations.jsonl'));
  const successors = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-successor-routes.jsonl'));
  const fixed = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-fixed-term-observations.jsonl'));
  const forms = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-form-observations.jsonl'));
  const scripts = readJsonl(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-script-route-observations.jsonl'));
  const policy = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-route-policy.json'));
  const adjudication = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-adjudication.json'));
  const custody = readJson(path.join(dir, 'schoolhouse-nc-static-nonprofit-anchor-census-custody.json'));
  const sourceRows = readJsonl(path.join(dir, 'source-inventory-21.jsonl'));

  check(manifest.counts.source_inventory_rows === 482, 'source inventory denominator');
  check(manifest.counts.coverage_denominator_rows === 31, 'coverage denominator');
  check(manifest.counts.explicit_gap_rows === 16, 'gap denominator');
  check(manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl', 'source inventory tail');
  check(manifest.source_inventory.evidence_class_counts.official === 257, 'official evidence count');
  check(manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_anchor_denominator === 2, 'anchor source-state count');
  check(coverage.denominators.length === 31, 'coverage length');
  check(coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit current-anchor denominator' && row.current_anchor_rows === 1552 && row.prior_anchor_rows === 1552 && row.query_bearing_report_routes === 0 && row.entity_detail_candidate_routes === 0 && row.admitted_identities === 0), 'coverage projection');

  check(pages.length === 2 && pages.reduce((sum, row) => sum + row.observed_anchor_rows, 0) === 1552, 'page/anchor denominator');
  check(pages.every(row => row.body_changed_since_permanent_custody === true && row.anchor_count_changed_since_permanent_custody === false && row.http_status === 200 && row.request_method === 'GET'), 'page state');
  check(links.length === 1552 && new Set(links.map(row => row.source_route_id + '\u0000' + row.anchor_ordinal)).size === 1552, 'link denominator');
  check(successors.length === 2 && successors.every(row => row.route_class === 'report_or_listing_route' && row.query_pair_count === 0 && row.fetch_executed === false), 'successor denominator');
  check(fixed.length === 70 && fixed.every(row => row.fixed_term_matches.subject.length === 0 && row.fixed_term_matches.person.length === 0 && row.fixed_term_matches.location.length > 0), 'fixed-term denominator');
  check(forms.length === 0 && scripts.length === 78, 'form/script denominator');
  check(policy.request_bounds.maximum_total_requests === 2 && policy.request_bounds.successor_fetches === 0 && policy.outside_human_dependency === false && policy.graph_effect === 'none', 'policy boundary');
  check(adjudication.counts.current_anchor_rows === 1552 && adjudication.counts.entity_detail_candidate_routes === 0 && adjudication.identity_decision.public_schoolhouse_identity_admitted === false && adjudication.identity_decision.negative_existence_claim_created === false, 'adjudication');
  check(custody.canonical_parent.commit === 'fc4864a32b9469313c18095e86192716a4fa1b6e' && custody.canonical_parent.tree === '1664393f0f054e6749096893f315bbafdf08dff5', 'parent custody');
  check(custody.acquisition.workflow_run_id === 31071324356 && custody.acquisition.artifact_id === 8955740770 && custody.acquisition.artifact_digest === 'sha256:7df4b608694beb278c0accd8708b202de7de03ffff80411f83a2b5ae034d40cd', 'acquisition custody');
  check(custody.counts.current_anchor_rows === 1552 && custody.counts.prior_anchor_rows === 1552 && custody.counts.body_changed_routes === 2 && custody.counts.anchor_count_changed_routes === 0 && custody.counts.entity_detail_candidate_routes === 0, 'custody counts');
  check(custody.terminal_frontier.current_two_route_anchor_denominator_terminal === true && custody.terminal_frontier.generic_successor_route_dispositions_terminal === true && custody.terminal_frontier.outside_human_dependency === false, 'terminal frontier');
  check(custody.public_schoolhouse_identity_admitted === false && custody.relationship_admitted === false && custody.negative_existence_claim_created === false && custody.outside_human_dependency === false && custody.graph_effect === 'none', 'custody authority');
  check(sourceRows.length === 2 && new Set(sourceRows.map(row => row.receipt_id)).size === 2, 'source inventory rows');
  check(sourceRows.every(row => row.evidence_class === 'official' && row.source_state === 'captured_nc_static_nonprofit_anchor_denominator' && row.observed_anchor_rows > 0 && row.source_rows_acquired === 0 && row.candidate_rows === 0), 'source inventory semantics');
  check(sourceRows.every(row => row.query_submitted === false && row.form_submitted === false && row.successor_fetches_executed === 0 && row.raw_source_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'source inventory privacy');
  check(sourceRows.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'source inventory authority');
  const projection = schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_anchor_census;
  check(projection?.current_anchor_rows === 1552 && projection?.query_bearing_report_routes === 0 && projection?.entity_detail_candidate_routes === 0 && projection?.public_schoolhouse_identity_admitted === false, 'School.House projection');
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_nc_static_nonprofit_anchor_census;
  check(task?.current_anchor_rows === 1552 && task?.query_bearing_report_routes === 0 && task?.entity_detail_candidate_routes === 0 && task?.admitted_identities === 0, 'frontier projection');
  for (const filename of ['schoolhouse-nc-static-nonprofit-anchor-census-page-receipts.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-link-observations.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-successor-routes.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-fixed-term-observations.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-form-observations.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-script-route-observations.jsonl','schoolhouse-nc-static-nonprofit-anchor-census-route-policy.json','schoolhouse-nc-static-nonprofit-anchor-census-adjudication.json','schoolhouse-nc-static-nonprofit-anchor-census-custody.json','source-inventory-21.jsonl']) {
    const expected = manifest.files[filename];
    const file = path.join(dir, filename);
    check(Boolean(expected) && fs.existsSync(file), 'manifest-bound file missing: ' + filename);
    if (expected && fs.existsSync(file)) { check(fs.statSync(file).size === expected.bytes, 'byte drift: ' + filename); check(sha256(file) === expected.sha256, 'hash drift: ' + filename); }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateSchoolhouseNcStaticNonprofitAnchorCustody(process.argv[2] || DEFAULT_DIR);
  if (errors.length) { for (const error of errors) console.error('ERROR: ' + error); process.exit(1); }
  console.log('School.House NC static nonprofit anchor custody: PASS');
}
