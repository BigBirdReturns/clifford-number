import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths, validateA07 } from '../tools/validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const positive = validateA07(ROOT, { checkFiles: true });
if (positive.length) throw new Error(`positive A07 constitution failed:\n${positive.join('\n')}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd04-a07-test-'));
for (const rel of Object.values(paths)) {
  const source = path.join(ROOT, rel);
  const target = path.join(temp, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(temp, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(temp, rel), `${JSON.stringify(value, null, 2)}\n`);
const readText = (rel) => fs.readFileSync(path.join(temp, rel), 'utf8');
const writeText = (rel, value) => fs.writeFileSync(path.join(temp, rel), value);

const C = paths.core;
const S = paths.sourceLedger;
const J = paths.schema;
const P = paths.parentCore;
const M = paths.parentManifest;
const D = paths.milestone;

const jsonCases = [
  ['core schema identity', C, (d) => { d.schema_version = 'bad'; }, 'core schema version'],
  ['execution identity', C, (d) => { d.execution_id = 'OTHER'; }, 'execution identity'],
  ['issue receipt', C, (d) => { d.issue = 0; }, 'issue receipt'],
  ['status inflation', C, (d) => { d.status = 'complete'; }, 'execution status'],
  ['parent main custody', C, (d) => { d.parent.main_commit = '0'.repeat(40); }, 'parent main custody'],
  ['parent terminal receipt', C, (d) => { d.parent.terminal_receipt = 'complete'; }, 'parent terminal receipt'],
  ['registry denominator', C, (d) => { d.frozen_parent_denominator.registry_rows = 1; }, 'frozen registry rows'],
  ['document denominator', C, (d) => { d.frozen_parent_denominator.unique_current_decision_documents = 1; }, 'frozen document count'],
  ['text denominator', C, (d) => { d.frozen_parent_denominator.exact_text_documents = 1; }, 'frozen text count'],
  ['missing denominator', C, (d) => { d.frozen_parent_denominator.missing_or_non_pdf_documents = 1; }, 'frozen missing count'],
  ['row link denominator', C, (d) => { d.frozen_parent_denominator.row_to_document_links = 1; }, 'frozen row-document links'],
  ['denominator reopening', C, (d) => { d.frozen_parent_denominator.denominator_reopened = true; }, 'parent denominator reopening'],
  ['parent pass reversal', C, (d) => { d.unit_contract.all_parent_documents_processed_before_follow_up_selection = false; }, 'complete parent pass before follow-up'],
  ['outcome sampling authorization', C, (d) => { d.unit_contract.outcome_selected_sampling_allowed = true; }, 'outcome-selected sampling boundary'],
  ['claimant contact authorization', C, (d) => { d.unit_contract.claimant_or_representative_contact_allowed = true; }, 'claimant contact boundary'],
  ['agency contact authorization', C, (d) => { d.unit_contract.agency_or_county_contact_allowed = true; }, 'agency contact boundary'],
  ['outside-human dependency', C, (d) => { d.unit_contract.outside_human_dependency = true; }, 'outside-human dependency'],
  ['anti-laundering deletion', C, (d) => { d.anti_laundering_law.pop(); }, 'anti-laundering law'],
  ['rule custody invention', C, (d) => { d.governing_rule_contract.exact_state_rule_custody = 'complete'; }, 'governing rule custody state'],
  ['rule proves compliance', C, (d) => { d.governing_rule_contract.rule_proves_case_compliance = true; }, 'governing rule boundary rule_proves_case_compliance'],
  ['source order mutation', C, (d) => { d.source_universe_order.reverse(); }, 'source universe order'],
  ['source class mutation', C, (d) => { d.source_universe_order[0].source_class = 'selected_cases'; }, 'source universe classes'],
  ['taxonomy mutation', C, (d) => { d.source_state_taxonomy[0] = 'observed_noncompliance'; }, 'core source-state taxonomy'],
  ['candidate population mutation', C, (d) => { d.candidate_extraction_contract.population = 'grants_only'; }, 'candidate population'],
  ['candidate order mutation', C, (d) => { d.candidate_extraction_contract.processing_order = 'outcome_rank'; }, 'candidate processing order'],
  ['positive-only extraction', C, (d) => { d.candidate_extraction_contract.positive_and_negative_matches_preserved = false; }, 'positive and negative match custody'],
  ['pre-pass ranking', C, (d) => { d.candidate_extraction_contract.substantive_ranking_before_complete_pass = true; }, 'pre-pass substantive ranking boundary'],
  ['disposition follow-up', C, (d) => { d.candidate_extraction_contract.disposition_label_alone_authorizes_follow_up = true; }, 'disposition follow-up boundary'],
  ['ambiguous identity promotion', C, (d) => { d.candidate_extraction_contract.ambiguous_identity_fails_closed = false; }, 'ambiguous identity boundary'],
  ['receipt chain collapse', C, (d) => { d.required_receipt_chain.splice(2, 3); }, 'required receipt chain'],
  ['terminal vocabulary inflation', C, (d) => { d.terminal_receipts[0] = 'noncompliance_proven'; }, 'terminal receipt vocabulary'],
  ['source bytes inflation', C, (d) => { d.current_state.source_bytes_newly_preserved = 1; }, 'current-state zero source_bytes_newly_preserved'],
  ['processed denominator inflation', C, (d) => { d.current_state.parent_documents_processed = 1; }, 'current-state zero parent_documents_processed'],
  ['candidate inflation', C, (d) => { d.current_state.ordered_relief_candidates = 1; }, 'current-state zero ordered_relief_candidates'],
  ['county census inflation', C, (d) => { d.current_state.counties_censused = 1; }, 'current-state zero counties_censused'],
  ['case receipt inflation', C, (d) => { d.current_state.exact_public_case_receipts = 1; }, 'current-state zero exact_public_case_receipts'],
  ['case join inflation', C, (d) => { d.current_state.case_level_implementation_joins = 1; }, 'current-state zero case_level_implementation_joins'],
  ['restoration inflation', C, (d) => { d.current_state.complete_restoration_chains = 1; }, 'current-state zero complete_restoration_chains'],
  ['timeliness inflation', C, (d) => { d.current_state.remedy_timeliness_observations = 1; }, 'current-state zero remedy_timeliness_observations'],
  ['residual closure inflation', C, (d) => { d.current_state.residual_classes_closed = 1; }, 'current-state zero residual_classes_closed'],
  ['authority external contact', C, (d) => { d.authority_ceiling.external_contacts = 1; }, 'authority zero external_contacts'],
  ['authority prevalence', C, (d) => { d.authority_ceiling.prevalence_findings = 1; }, 'authority zero prevalence_findings'],
  ['authority coordination', C, (d) => { d.authority_ceiling.coordination_findings = 1; }, 'authority zero coordination_findings'],
  ['graph effect', C, (d) => { d.authority_ceiling.graph_effect = 'add'; }, 'authority effect graph_effect'],
  ['core extra property', C, (d) => { d.result = 'confirmed'; }, 'core top-level closed shape'],

  ['source-ledger identity', S, (d) => { d.acquisition_id = 'OTHER'; }, 'source-ledger acquisition identity'],
  ['source-ledger state', S, (d) => { d.state = 'complete'; }, 'source-ledger state'],
  ['new source preservation', S, (d) => { d.parent_custody.new_sources_preserved = 1; }, 'new source preservation count'],
  ['source target removal', S, (d) => { d.sources.pop(); }, 'source target denominator'],
  ['source identity mutation', S, (d) => { d.sources[2].source_id = 'SELECTED-FAVORABLE'; }, 'source target identities'],
  ['source byte invention', S, (d) => { d.sources[2].source_bytes_preserved_in_a07 = true; }, 'source byte custody CDSS-STATE-HEARINGS'],
  ['case eligibility invention', S, (d) => { d.sources[9].eligible_for_case_level_implementation_join = true; }, 'source case-join eligibility LAC-DPSS-ASH-001'],
  ['custody invention', S, (d) => { d.sources[3].custody_state = 'exact_public_case_receipt'; }, 'pending source custody CDSS-HEARING-REQUESTS'],
  ['host mutation', S, (d) => { d.sources[2].official_host = 'example.com'; }, 'official source host CDSS-STATE-HEARINGS'],
  ['county denominator mutation', S, (d) => { d.county_census.expected_count = 57; }, 'county-census expected count'],
  ['county preselection', S, (d) => { d.county_census.selection_before_complete_census = true; }, 'county preselection boundary'],
  ['county list removal', S, (d) => { d.county_census.ordered_counties.pop(); }, 'county denominator and order'],
  ['county order mutation', S, (d) => { d.county_census.ordered_counties.reverse(); }, 'county denominator and order'],
  ['surface deletion', S, (d) => { d.county_census.required_surface_types.pop(); }, 'county required surface types'],
  ['taxonomy parity mutation', S, (d) => { d.source_state_taxonomy[0] = 'noncompliance'; }, 'source-ledger taxonomy parity'],
  ['retry inflation', S, (d) => { d.exact_search_receipt_contract.retry_limit = 99; }, 'exact-search retry limit'],
  ['query shopping', S, (d) => { d.exact_search_receipt_contract.query_expansion_after_result_inspection = true; }, 'post-result query expansion boundary'],
  ['zero result body discarded', S, (d) => { d.exact_search_receipt_contract.preserve_zero_result_body = false; }, 'exact-search receipt contract preserve_zero_result_body'],
  ['policy implementation laundering', S, (d) => { d.boundaries.policy_proves_case_compliance = true; }, 'source-ledger boundary policy_proves_case_compliance'],
  ['absence laundering', S, (d) => { d.boundaries.absence_of_public_receipt_proves_noncompliance = true; }, 'source-ledger boundary absence_of_public_receipt_proves_noncompliance'],
  ['county prevalence laundering', S, (d) => { d.boundaries.one_county_proves_statewide_prevalence = true; }, 'source-ledger boundary one_county_proves_statewide_prevalence'],

  ['schema opening', J, (d) => { d.additionalProperties = true; }, 'schema top-level closed shape'],
  ['schema status weakening', J, (d) => { d.properties.status.const = 'complete'; }, 'schema status ceiling'],
  ['schema source-byte weakening', J, (d) => { d.properties.current_state.properties.source_bytes_newly_preserved.const = 1; }, 'schema current-state zero source_bytes_newly_preserved'],
  ['schema authority weakening', J, (d) => { d.properties.authority_ceiling.properties.external_contacts.const = 1; }, 'schema authority zero external_contacts'],

  ['parent registry mutation', P, (d) => { d.counts.registry_rows = 1; }, 'loaded parent registry rows'],
  ['parent join inflation', P, (d) => { d.counts.case_level_implementation_joins = 1; }, 'loaded parent case-level joins'],
  ['parent manifest mode', M, (d) => { d.hash_mode = 'names_only'; }, 'parent manifest hash mode']
];

for (const [name, rel, mutate, expected] of jsonCases) {
  const original = readJson(rel);
  const changed = structuredClone(original);
  mutate(changed);
  writeJson(rel, changed);
  const errors = validateA07(temp, { checkFiles: false });
  writeJson(rel, original);
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors.slice(0, 25))}`);
  }
}

const originalMilestone = readText(D);
writeText(D, originalMilestone.replace('Every missing link remains an explicit null.', 'Missing links may be inferred.'));
const milestoneErrors = validateA07(temp, { checkFiles: false });
writeText(D, originalMilestone);
if (!milestoneErrors.some((error) => error.includes('milestone token missing: Every missing link remains an explicit null'))) {
  throw new Error(`milestone anti-inference mutation was not refused: ${JSON.stringify(milestoneErrors.slice(0, 25))}`);
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(`status-sovereignty-rd04-calfresh-compliance-receipts-a07.test: 1 positive + ${jsonCases.length + 1} adversarial mutations PASS`);
