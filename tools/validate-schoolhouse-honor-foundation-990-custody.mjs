import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = 'data/intake/bvvc-defense-capital';
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const unique = values => new Set(values).size === values.length;

export function validateSchoolhouseHonorFoundation990Custody(dir = DEFAULT_DIR) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const manifest = readJson(path.join(dir, 'manifest.json'));
  const custody = readJson(path.join(dir, 'schoolhouse-honor-foundation-990-custody.json'));
  const attempts = readJsonl(path.join(dir, 'schoolhouse-honor-foundation-990-attempt-results.jsonl'));
  const indexes = readJsonl(path.join(dir, 'schoolhouse-honor-foundation-990-index-resolutions.jsonl'));
  const filings = readJsonl(path.join(dir, 'schoolhouse-honor-foundation-990-filing-results.jsonl'));
  const structural = readJsonl(path.join(dir, 'schoolhouse-honor-foundation-990-structural-signals.jsonl'));
  const terms = readJsonl(path.join(dir, 'schoolhouse-honor-foundation-990-term-hits.jsonl'));
  const sourceRows = readJsonl(path.join(dir, 'source-inventory-18.jsonl'));
  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));
  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));
  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));

  check(attempts.length === 16, 'Form 990 attempt denominator must be 16');
  check(indexes.length === 3 && indexes.every(row => row.exact_match_rows === 1), 'Form 990 exact-index denominator must be 3');
  check(filings.length === 3, 'Form 990 effective filing denominator must be 3');
  check(structural.length === 2, 'Form 990 structural denominator must be 2');
  check(terms.length === 0, 'Form 990 fixed term-hit denominator must remain zero');
  check(sourceRows.length === 16, 'Form 990 source inventory denominator must be 16');
  check(unique(attempts.map(row => row.attempt_custody_id)) && unique(attempts.map(row => row.attempt_receipt_id)), 'Form 990 attempt IDs and receipts must be unique');
  check(unique(sourceRows.map(row => row.receipt_id)), 'Form 990 source receipts must be unique');
  check(attempts.every(row => row.request_method === 'GET' && row.raw_source_retained === false && row.full_visible_text_retained === false && row.source_value_text_retained === false), 'Form 990 attempt request/privacy boundary drift');
  check(attempts.every(row => row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'Form 990 attempt retained-sensitive-row drift');
  check(attempts.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'Form 990 attempt authority drift');
  const officialSourceRows = sourceRows.filter(row => row.evidence_class === 'official');
  const primaryPublicSourceRows = sourceRows.filter(row => row.evidence_class === 'primary_public');
  check(officialSourceRows.length === 13 && primaryPublicSourceRows.length === 3, 'Form 990 source-inventory provenance denominator drift');
  check(primaryPublicSourceRows.every(row => row.locator_url.startsWith('https://projects.propublica.org/') && row.source_type === 'primary_public_form_990_object_route_attempt'), 'Form 990 primary-public bridge provenance drift');
  check(sourceRows.every(row => row.raw_source_retained === false && row.full_visible_text_retained === false && row.source_value_text_retained === false && row.street_address_retained === false && row.contact_details_retained === false), 'Form 990 source-inventory privacy drift');
  check(sourceRows.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'Form 990 source-inventory authority drift');

  check(indexes.reduce((sum, row) => sum + row.official_index_rows_scanned, 0) === 1831275, 'Form 990 official-index row denominator drift');
  check(indexes.every(row => row.expected_ein === '462952873' && row.taxpayer_name === 'THE HONOR FOUNDATION INC' && row.return_type === '990'), 'Form 990 exact index identity-routing drift');
  const success = filings.filter(row => row.state === 'terminal_official_xml_screen_zero_declared_term_hits_not_absence_evidence');
  const unavailable = filings.filter(row => row.state === 'terminal_exact_member_unavailable_after_one_replay_not_absence_evidence');
  check(success.length === 2 && unavailable.length === 1 && unavailable[0]?.processing_year === 2026, 'Form 990 effective filing state drift');
  check(success.every(row => row.filer_ein_verified_from_xml === true && row.taxpayer_name_verified_from_xml === true && row.return_type_verified_from_xml === true && row.tax_period_verified_from_xml === true), 'Form 990 successful XML verification drift');
  check(filings.reduce((sum, row) => sum + row.screened_text_characters, 0) === 8949, 'Form 990 screened-text denominator drift');
  check(filings.reduce((sum, row) => sum + row.total_xml_elements, 0) === 1511, 'Form 990 XML-element denominator drift');
  check(filings.reduce((sum, row) => sum + row.term_hit_rows, 0) === 0, 'Form 990 term-hit denominator drift');
  check(filings.every(row => row.raw_zip_retained === false && row.raw_xml_retained === false && row.full_visible_text_retained === false && row.source_value_text_retained === false && row.person_name_rows_retained === 0), 'Form 990 filing privacy drift');
  check(filings.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Form 990 filing authority drift');

  check(structural.filter(row => row.schedule_i_present).length === 1, 'Form 990 Schedule I structural count drift');
  check(structural.filter(row => row.schedule_l_present).length === 0, 'Form 990 Schedule L structural count drift');
  check(structural.filter(row => row.schedule_r_present).length === 2, 'Form 990 Schedule R structural count drift');
  check(structural.filter(row => row.schedule_o_present).length === 2, 'Form 990 Schedule O structural count drift');
  check(structural.every(row => row.structural_presence_is_not_relationship_evidence === true && row.identity_admitted === false && row.relationship_admitted === false && row.graph_effect === 'none'), 'Form 990 structural interpretation drift');

  check(custody.counts.total_public_requests === 16 && custody.counts.declared_filing_rows === 3 && custody.counts.exact_official_index_resolution_rows === 3 && custody.counts.successful_official_xml_screen_rows === 2 && custody.counts.source_unavailable_after_replay_rows === 1 && custody.counts.fixed_term_hit_rows === 0, 'Form 990 custody count drift');
  check(custody.candidate_filer.ein === '462952873' && custody.candidate_filer.relationship_to_schoolhouse_admitted === false, 'Form 990 candidate-filer boundary drift');
  check(custody.public_schoolhouse_identity_admitted === false && custody.fiscal_sponsor_relationship_admitted === false && custody.related_party_relationship_admitted === false && custody.negative_existence_claim_created === false && custody.outside_human_dependency === false && custody.graph_effect === 'none', 'Form 990 custody authority drift');

  check(manifest.counts.source_inventory_rows === 447 && manifest.counts.coverage_denominator_rows === 28 && manifest.counts.explicit_gap_rows === 16, 'Form 990 manifest headline denominator drift');
  check(manifest.source_inventory.evidence_class_counts.official === 222 && manifest.source_inventory.evidence_class_counts.primary_public === 54 && manifest.source_inventory.evidence_class_counts.primary_public_state_charity_registry_route_custody === 6, 'Form 990 manifest provenance count drift');
  check(manifest.counts.schoolhouse_honor_foundation_990_total_public_requests === 16 && manifest.counts.schoolhouse_honor_foundation_990_declared_filing_rows === 3 && manifest.counts.schoolhouse_honor_foundation_990_successful_xml_screen_rows === 2 && manifest.counts.schoolhouse_honor_foundation_990_source_unavailable_after_replay_rows === 1 && manifest.counts.schoolhouse_honor_foundation_990_fixed_term_hit_rows === 0, 'Form 990 manifest detail drift');
  check(manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-18.jsonl', 'Form 990 source inventory tail drift');
  check(manifest.storage_contract.schoolhouse_honor_foundation_990_custody === 'schoolhouse-honor-foundation-990-custody.json', 'Form 990 storage contract missing');
  for (const filename of ['schoolhouse-honor-foundation-990-custody.json','schoolhouse-honor-foundation-990-attempt-results.jsonl','schoolhouse-honor-foundation-990-index-resolutions.jsonl','schoolhouse-honor-foundation-990-filing-results.jsonl','schoolhouse-honor-foundation-990-structural-signals.jsonl','schoolhouse-honor-foundation-990-term-hits.jsonl','source-inventory-18.jsonl']) {
    const receipt = manifest.files[filename];
    const file = path.join(dir, filename);
    check(Boolean(receipt) && receipt.bytes === fs.statSync(file).size && receipt.sha256 === sha256(file), `Form 990 manifest file receipt drift: ${filename}`);
  }

  const projection = schoolhouse.state_registry_identity_census?.honor_foundation_990_candidate_screen;
  check(projection?.declared_filings === 3 && projection?.successful_xml_screens === 2 && projection?.source_unavailable_after_replay === 1 && projection?.fixed_term_hits === 0 && projection?.public_schoolhouse_identity_admitted === false, 'Form 990 School.House projection drift');
  const frontierProjection = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_honor_foundation_990_candidate_screen;
  check(frontierProjection?.declared_filings === 3 && frontierProjection?.successful_xml_screens === 2 && frontierProjection?.source_unavailable_after_replay === 1 && frontierProjection?.relationships_admitted === 0, 'Form 990 frontier projection drift');
  check(coverage.denominators.some(row => row.surface === 'School.House related-charity Form 990 candidate screen' && row.declared_total === 3 && row.successful_xml_screens === 2 && row.source_unavailable_after_replay === 1 && row.fixed_term_hit_rows === 0 && row.admitted_identities === 0 && row.admitted_relationships === 0), 'Form 990 coverage denominator missing');

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateSchoolhouseHonorFoundation990Custody(process.argv[2] || DEFAULT_DIR);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }
  console.log('School.House related-charity Form 990 custody: PASS');
}
