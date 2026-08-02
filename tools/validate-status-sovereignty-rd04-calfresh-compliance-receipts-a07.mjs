#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');

export const paths = Object.freeze({
  core: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/core.json',
  sourceLedger: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/source-ledger.json',
  schema: 'schemas/status-sovereignty-rd04-calfresh-compliance-receipts-a07.schema.json',
  milestone: 'docs/milestones/ssc-rd04-calfresh-compliance-receipts-a07.md',
  parentCore: 'data/intake/status-sovereignty-rd04-calfresh-decision-corpus-a06/core.json',
  parentManifest: 'data/project/status-sovereignty-rd04-calfresh-decision-corpus-a06-release-manifest.json',
  parentMilestone: 'docs/milestones/ssc-rd04-a06-full-corpus.md'
});

const EXPECTED_PARENT_MAIN = 'd1597233110715e58e76e3b50b6792c226d9f7e8';

const EXPECTED_COUNTIES = Object.freeze([
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa',
  'Contra Costa', 'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt',
  'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono',
  'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside',
  'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco',
  'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara',
  'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano',
  'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare',
  'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
]);

const EXPECTED_SOURCE_IDS = Object.freeze([
  'A06-CORE',
  'A06-RELEASE-MANIFEST',
  'CDSS-STATE-HEARINGS',
  'CDSS-HEARING-REQUESTS',
  'CDSS-REGULATIONS-HOME',
  'CDSS-SOCIAL-SERVICE-STANDARDS-MANUAL-LETTERS',
  'CDSS-COUNTY-OFFICES',
  'CDSS-CALFRESH-DASHBOARD',
  'CDSS-CALFRESH-DATA-TABLES',
  'LAC-DPSS-ASH-001',
  'LAC-DPSS-ASH-008'
]);

const EXPECTED_SOURCE_CLASSES = Object.freeze([
  'merged_a06_custody',
  'official_state_rule_and_process_surfaces',
  'complete_58_county_public_source_census',
  'official_adjudicative_and_enforcement_surfaces',
  'official_aggregate_controls'
]);

const EXPECTED_TAXONOMY = Object.freeze([
  'exact_public_case_receipt',
  'public_official_aggregate_only',
  'public_policy_only',
  'public_decision_only',
  'authenticated_or_claimant_only',
  'public_index_without_retrievable_record',
  'zero_result_with_exact_query_receipt',
  'source_restricted',
  'source_unavailable',
  'malformed_or_conflicting'
]);

const EXPECTED_TERMINAL_RECEIPTS = Object.freeze([
  'complete_public_compliance_and_restoration_chain',
  'partial_public_compliance_chain',
  'public_compliance_report_without_issuance_receipt',
  'public_issuance_receipt_without_complete_chain',
  'public_official_aggregate_only',
  'public_policy_only',
  'decision_only_no_separate_public_receipt',
  'authenticated_or_claimant_only',
  'source_restricted',
  'source_unavailable',
  'requires_additional_acquisition'
]);

const EXPECTED_RECEIPT_CHAIN = Object.freeze([
  'a06_decision_identity',
  'ordered_relief',
  'county_compliance_report_or_equivalent_official_receipt',
  'implementation_action',
  'issuance_or_restoration_amount',
  'issuance_or_restoration_date',
  'shd_approval_or_corrective_instruction',
  'later_complaint_correction_or_residual_harm'
]);

const EXPECTED_EXTRACTION_FIELDS = Object.freeze([
  'explicit_order_or_directed_action',
  'benefit_increase_or_decrease_language',
  'restoration_or_retroactive_benefit_language',
  'remand_or_rehearing_language',
  'compliance_report_language',
  'responsible_agency_or_county',
  'release_or_adoption_date',
  'shn_number',
  'registry_id',
  'decision_id',
  'stated_amount_if_any',
  'stated_period_if_any'
]);

const EXPECTED_SURFACE_TYPES = Object.freeze([
  'official_agency_root',
  'state_hearings_or_appeals_policy',
  'public_document_search',
  'board_agenda_or_minutes_archive',
  'audit_or_corrective_action_repository',
  'open_data_or_report_portal',
  'published_compliance_or_restoration_records',
  'public_authentication_and_privacy_boundary'
]);

const EXPECTED_ANTI_LAUNDERING = Object.freeze([
  'legal_duty_to_comply_is_not_a_submitted_compliance_report',
  'submitted_compliance_report_is_not_shd_approval',
  'shd_approval_is_not_actual_benefit_issuance',
  'ordered_restoration_is_not_observed_restoration',
  'observed_issuance_is_not_complete_restoration_without_amount_period_and_scope',
  'complete_restoration_is_not_timely_material_recovery_without_exact_dates',
  'absence_of_a_public_receipt_is_not_evidence_of_noncompliance',
  'aggregate_county_performance_is_not_a_case_level_join'
]);

const EXPECTED_CURRENT_ZERO_KEYS = Object.freeze([
  'source_bytes_newly_preserved',
  'parent_documents_processed',
  'ordered_relief_candidates',
  'counties_censused',
  'exact_public_search_receipts',
  'exact_public_case_receipts',
  'case_level_implementation_joins',
  'complete_restoration_chains',
  'remedy_timeliness_observations',
  'reviewed_disposition_changes',
  'residual_classes_closed'
]);

const EXPECTED_AUTHORITY_ZERO_KEYS = Object.freeze([
  'external_contacts',
  'external_reviews',
  'case_level_implementation_joins',
  'complete_restoration_findings',
  'remedy_timeliness_findings',
  'residual_class_closures',
  'reviewed_disposition_changes',
  'prevalence_findings',
  'racial_order_findings',
  'coordination_findings',
  'common_purpose_findings'
]);

const stableArray = (value) => JSON.stringify(value);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function sameArray(actual, expected) {
  return Array.isArray(actual) && stableArray(actual) === stableArray(expected);
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return sameArray(Object.keys(value).sort(), [...expected].sort());
}

function loadContext(root) {
  return {
    core: readJson(root, paths.core),
    sourceLedger: readJson(root, paths.sourceLedger),
    schema: readJson(root, paths.schema),
    milestone: readText(root, paths.milestone),
    parentCore: readJson(root, paths.parentCore),
    parentManifest: readJson(root, paths.parentManifest),
    parentMilestone: readText(root, paths.parentMilestone)
  };
}

export function validateA07(root = DEFAULT_ROOT, { checkFiles = true } = {}) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  if (checkFiles) {
    for (const rel of Object.values(paths)) {
      if (!fs.existsSync(path.join(root, rel))) errors.push(`required file missing: ${rel}`);
    }
  }
  if (errors.length) return errors;

  let context;
  try {
    context = loadContext(root);
  } catch (error) {
    return [`load failure: ${error.message}`];
  }

  const {
    core,
    sourceLedger,
    schema,
    milestone,
    parentCore,
    parentManifest,
    parentMilestone
  } = context;

  const topLevelKeys = [
    'schema_version', 'hypothesis_id', 'lane_id', 'execution_id', 'issue',
    'as_of', 'title', 'status', 'parent', 'frozen_parent_denominator',
    'unit_contract', 'anti_laundering_law', 'governing_rule_contract',
    'source_universe_order', 'source_state_taxonomy',
    'candidate_extraction_contract', 'required_receipt_chain',
    'required_products', 'current_state', 'terminal_receipts',
    'authority_ceiling'
  ];
  check(exactKeys(core, topLevelKeys), 'core top-level closed shape');
  eq(core.schema_version, 'ssc-rd04-a07-core@1', 'core schema version');
  eq(core.hypothesis_id, 'SSC-H01', 'hypothesis identity');
  eq(core.lane_id, 'SSC-RD04', 'lane identity');
  eq(core.execution_id, 'SSC-RD04-SNAP-A07', 'execution identity');
  eq(core.issue, 741, 'issue receipt');
  eq(core.as_of, '2026-08-02', 'as-of date');
  eq(core.status, 'constitution_frozen_acquisition_not_yet_executed', 'execution status');

  eq(core.parent?.execution_id, 'SSC-RD04-SNAP-A06', 'parent execution identity');
  eq(core.parent?.issue, 721, 'parent issue');
  eq(core.parent?.pull_request, 732, 'parent pull request');
  eq(core.parent?.main_commit, EXPECTED_PARENT_MAIN, 'parent main custody');
  eq(core.parent?.terminal_receipt, 'bounded_registry_denominator_orders_without_compliance_join', 'parent terminal receipt');
  eq(core.parent?.core_path, paths.parentCore, 'parent core path');
  eq(core.parent?.release_manifest_path, paths.parentManifest, 'parent manifest path');
  eq(core.parent?.milestone_path, paths.parentMilestone, 'parent milestone path');

  eq(parentCore.execution_id, 'SSC-RD04-SNAP-A06', 'loaded parent execution identity');
  eq(parentCore.issue, 721, 'loaded parent issue');
  eq(parentCore.counts?.registry_rows, 12282, 'loaded parent registry rows');
  eq(parentCore.counts?.unique_documents, 11672, 'loaded parent document count');
  eq(parentCore.counts?.exact_pdf_documents, 11672, 'loaded parent PDF count');
  eq(parentCore.counts?.exact_text_documents, 11672, 'loaded parent text count');
  eq(parentCore.counts?.missing_or_non_pdf_documents, 0, 'loaded parent missing count');
  eq(parentCore.counts?.shared_document_groups, 530, 'loaded parent shared groups');
  eq(parentCore.counts?.shared_document_excess_registry_rows, 610, 'loaded parent shared-row excess');
  eq(parentCore.counts?.maximum_registry_rows_per_document, 7, 'loaded parent maximum multiplicity');
  eq(parentCore.current_result?.terminal_state, 'bounded_registry_denominator_orders_without_compliance_join', 'loaded parent terminal receipt');
  eq(parentCore.counts?.case_level_implementation_joins, 0, 'loaded parent case-level joins');
  eq(parentCore.counts?.complete_restorations_observed, 0, 'loaded parent restorations');
  eq(parentCore.counts?.remedy_timeliness_observed, 0, 'loaded parent timeliness');

  eq(parentManifest.schema_version, 'ssc-rd04-a06-full-corpus-release-manifest@1', 'parent manifest schema');
  eq(parentManifest.execution_id, 'SSC-RD04-SNAP-A06', 'parent manifest execution');
  eq(parentManifest.issue, 721, 'parent manifest issue');
  eq(parentManifest.hash_mode, 'sha256_exact_bytes', 'parent manifest hash mode');
  eq(parentManifest.scope_ordered, true, 'parent manifest scope order');
  eq(parentManifest.self_included, false, 'parent manifest self-inclusion boundary');
  check(Array.isArray(parentManifest.entries) && parentManifest.entries.length >= 140, 'parent manifest entry denominator');
  check(parentManifest.entries?.some((entry) => entry.path === paths.parentCore), 'parent manifest core custody');
  check(parentManifest.entries?.some((entry) => entry.path === paths.parentMilestone), 'parent manifest milestone custody');

  const frozen = core.frozen_parent_denominator ?? {};
  eq(frozen.date_interval, '2025-07-01/2026-06-30', 'frozen interval');
  eq(frozen.program, 'CalFresh', 'frozen program');
  eq(frozen.registry_rows, parentCore.counts?.registry_rows, 'frozen registry rows');
  eq(frozen.unique_registry_ids, 12282, 'frozen registry identities');
  eq(frozen.unique_current_decision_documents, parentCore.counts?.unique_documents, 'frozen document count');
  eq(frozen.exact_pdf_documents, parentCore.counts?.exact_pdf_documents, 'frozen PDF count');
  eq(frozen.exact_text_documents, parentCore.counts?.exact_text_documents, 'frozen text count');
  eq(frozen.missing_or_non_pdf_documents, parentCore.counts?.missing_or_non_pdf_documents, 'frozen missing count');
  eq(frozen.row_to_document_links, 12282, 'frozen row-document links');
  eq(frozen.shared_document_groups, parentCore.counts?.shared_document_groups, 'frozen shared groups');
  eq(frozen.excess_rows_sharing_documents, parentCore.counts?.shared_document_excess_registry_rows, 'frozen shared-row excess');
  eq(frozen.maximum_rows_per_document, parentCore.counts?.maximum_registry_rows_per_document, 'frozen maximum multiplicity');
  eq(frozen.denominator_reopened, false, 'parent denominator reopening');

  const unit = core.unit_contract ?? {};
  eq(unit.state, 'CA', 'state unit');
  eq(unit.program, 'CalFresh', 'program unit');
  check(typeof unit.unit === 'string' && unit.unit.includes('separately sourced public'), 'unit requires separate public receipt');
  eq(unit.all_parent_rows_in_scope, true, 'all parent rows in scope');
  eq(unit.all_parent_documents_processed_before_follow_up_selection, true, 'complete parent pass before follow-up');
  eq(unit.county_census_count, 58, 'county census denominator');
  eq(unit.outcome_selected_sampling_allowed, false, 'outcome-selected sampling boundary');
  eq(unit.claimant_or_representative_contact_allowed, false, 'claimant contact boundary');
  eq(unit.agency_or_county_contact_allowed, false, 'agency contact boundary');
  eq(unit.outside_human_dependency, false, 'outside-human dependency');

  check(sameArray(core.anti_laundering_law, EXPECTED_ANTI_LAUNDERING), 'anti-laundering law');
  eq(core.governing_rule_contract?.target, 'MPP 22-078 and official county implementations', 'governing rule target');
  eq(core.governing_rule_contract?.exact_state_rule_custody, 'pending', 'governing rule custody state');
  check(Array.isArray(core.governing_rule_contract?.mechanical_chain_to_test)
    && core.governing_rule_contract.mechanical_chain_to_test.length === 6,
    'governing rule mechanical chain');
  for (const key of ['rule_proves_case_compliance', 'rule_proves_issuance', 'rule_proves_restoration']) {
    eq(core.governing_rule_contract?.[key], false, `governing rule boundary ${key}`);
  }

  check(Array.isArray(core.source_universe_order) && core.source_universe_order.length === 5, 'source universe denominator');
  check(sameArray(core.source_universe_order?.map((row) => row.ordinal), [1, 2, 3, 4, 5]), 'source universe order');
  check(sameArray(core.source_universe_order?.map((row) => row.source_class), EXPECTED_SOURCE_CLASSES), 'source universe classes');
  for (const row of core.source_universe_order ?? []) {
    check(typeof row.purpose === 'string' && row.purpose.length >= 40, `source universe purpose ${row.ordinal}`);
  }

  check(sameArray(core.source_state_taxonomy, EXPECTED_TAXONOMY), 'core source-state taxonomy');
  check(sameArray(core.required_receipt_chain, EXPECTED_RECEIPT_CHAIN), 'required receipt chain');
  check(sameArray(core.terminal_receipts, EXPECTED_TERMINAL_RECEIPTS), 'terminal receipt vocabulary');

  const extraction = core.candidate_extraction_contract ?? {};
  eq(extraction.population, 'all_11672_parent_document_texts', 'candidate population');
  eq(extraction.processing_order, 'ascending_document_identity', 'candidate processing order');
  eq(extraction.dictionary_and_rule_version_required, true, 'versioned extraction dictionary');
  eq(extraction.positive_and_negative_matches_preserved, true, 'positive and negative match custody');
  eq(extraction.substantive_ranking_before_complete_pass, false, 'pre-pass substantive ranking boundary');
  check(sameArray(extraction.fields, EXPECTED_EXTRACTION_FIELDS), 'candidate extraction fields');
  eq(extraction.disposition_label_alone_authorizes_follow_up, false, 'disposition follow-up boundary');
  eq(extraction.ambiguous_identity_fails_closed, true, 'ambiguous identity boundary');
  check(Array.isArray(core.required_products) && core.required_products.length >= 8, 'required product denominator');
  check(core.required_products?.includes('58_county_public_source_availability_matrix'), 'county matrix product');
  check(core.required_products?.includes('complete_a06_ordered_relief_candidate_ledger'), 'complete candidate ledger product');
  check(core.required_products?.some((value) => value.includes('schema_builder_validator_adversarial_suite')), 'deterministic machinery product');

  check(exactKeys(core.current_state, EXPECTED_CURRENT_ZERO_KEYS), 'current-state closed shape');
  for (const key of EXPECTED_CURRENT_ZERO_KEYS) eq(core.current_state?.[key], 0, `current-state zero ${key}`);

  eq(core.authority_ceiling?.outside_human_dependency, false, 'authority outside-human dependency');
  for (const key of EXPECTED_AUTHORITY_ZERO_KEYS) eq(core.authority_ceiling?.[key], 0, `authority zero ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(core.authority_ceiling?.[key], 'none', `authority effect ${key}`);
  }

  eq(sourceLedger.schema_version, 'ssc-rd04-a07-source-ledger@1', 'source-ledger schema');
  eq(sourceLedger.acquisition_id, core.execution_id, 'source-ledger acquisition identity');
  eq(sourceLedger.issue, core.issue, 'source-ledger issue');
  eq(sourceLedger.as_of, core.as_of, 'source-ledger as-of');
  eq(sourceLedger.state, 'source_universe_frozen_no_new_source_bytes_preserved', 'source-ledger state');
  eq(sourceLedger.parent_custody?.main_commit, EXPECTED_PARENT_MAIN, 'source-ledger parent main');
  eq(sourceLedger.parent_custody?.registry_rows, 12282, 'source-ledger parent rows');
  eq(sourceLedger.parent_custody?.documents, 11672, 'source-ledger parent documents');
  eq(sourceLedger.parent_custody?.parent_sources_reused, 2, 'parent source reuse denominator');
  eq(sourceLedger.parent_custody?.new_sources_preserved, 0, 'new source preservation count');
  check(Array.isArray(sourceLedger.sources) && sourceLedger.sources.length === EXPECTED_SOURCE_IDS.length, 'source target denominator');
  check(sameArray(sourceLedger.sources?.map((source) => source.source_id), EXPECTED_SOURCE_IDS), 'source target identities');
  check(new Set(sourceLedger.sources?.map((source) => source.source_id)).size === EXPECTED_SOURCE_IDS.length, 'duplicate source identities');

  for (const [index, source] of (sourceLedger.sources ?? []).entries()) {
    eq(source.source_bytes_preserved_in_a07, false, `source byte custody ${source.source_id}`);
    eq(source.eligible_for_case_level_implementation_join, false, `source case-join eligibility ${source.source_id}`);
    check(typeof source.expected_use === 'string' && source.expected_use.length >= 20, `source expected use ${source.source_id}`);
    if (index < 2) {
      eq(source.source_class, 'merged_a06_custody', `parent source class ${source.source_id}`);
      eq(source.custody_state, 'parent_exact_custody_reused', `parent source custody ${source.source_id}`);
      check(typeof source.repository_path === 'string' && source.repository_path.length > 10, `parent source path ${source.source_id}`);
    } else {
      check(['pending_exact_custody', 'pending_exact_locator_resolution'].includes(source.custody_state), `pending source custody ${source.source_id}`);
      check(typeof source.requested_url === 'string' && source.requested_url.startsWith('https://'), `official source URL ${source.source_id}`);
      let host = '';
      try { host = new URL(source.requested_url).hostname; } catch {}
      eq(host, source.official_host, `official source host ${source.source_id}`);
    }
  }

  eq(sourceLedger.county_census?.expected_count, 58, 'county-census expected count');
  eq(sourceLedger.county_census?.master_source_id, 'CDSS-COUNTY-OFFICES', 'county-census master source');
  eq(sourceLedger.county_census?.processing_order, 'alphabetical_county_name', 'county-census processing order');
  eq(sourceLedger.county_census?.selection_before_complete_census, false, 'county preselection boundary');
  eq(sourceLedger.county_census?.counties_censused, 0, 'county census current count');
  check(sameArray(sourceLedger.county_census?.ordered_counties, EXPECTED_COUNTIES), 'county denominator and order');
  check(new Set(sourceLedger.county_census?.ordered_counties).size === 58, 'county denominator uniqueness');
  check(sameArray(sourceLedger.county_census?.required_surface_types, EXPECTED_SURFACE_TYPES), 'county required surface types');
  check(sameArray(sourceLedger.source_state_taxonomy, EXPECTED_TAXONOMY), 'source-ledger taxonomy parity');

  const searchContract = sourceLedger.exact_search_receipt_contract ?? {};
  for (const key of [
    'preserve_requested_url', 'preserve_ordered_query', 'preserve_request_headers',
    'preserve_response_headers', 'preserve_redirects', 'preserve_http_status',
    'preserve_content_type', 'preserve_exact_body', 'preserve_body_sha256',
    'preserve_zero_result_body', 'preserve_timestamp'
  ]) eq(searchContract[key], true, `exact-search receipt contract ${key}`);
  eq(searchContract.retry_limit, 2, 'exact-search retry limit');
  eq(searchContract.query_expansion_after_result_inspection, false, 'post-result query expansion boundary');

  for (const key of [
    'policy_proves_case_compliance',
    'aggregate_proves_case_compliance',
    'decision_order_proves_implementation',
    'submitted_report_proves_issuance',
    'absence_of_public_receipt_proves_noncompliance',
    'one_county_proves_statewide_prevalence',
    'outside_human_dependency'
  ]) eq(sourceLedger.boundaries?.[key], false, `source-ledger boundary ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(sourceLedger.boundaries?.[key], 'none', `source-ledger effect ${key}`);
  }

  eq(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', 'schema dialect');
  eq(schema.additionalProperties, false, 'schema top-level closed shape');
  eq(schema.properties?.schema_version?.const, 'ssc-rd04-a07-core@1', 'schema core identity');
  eq(schema.properties?.status?.const, 'constitution_frozen_acquisition_not_yet_executed', 'schema status ceiling');
  eq(schema.properties?.frozen_parent_denominator?.properties?.registry_rows?.const, 12282, 'schema registry denominator');
  eq(schema.properties?.frozen_parent_denominator?.properties?.unique_current_decision_documents?.const, 11672, 'schema document denominator');
  eq(schema.properties?.unit_contract?.properties?.outside_human_dependency?.const, false, 'schema no-human contract');
  for (const key of EXPECTED_CURRENT_ZERO_KEYS) {
    eq(schema.properties?.current_state?.properties?.[key]?.const, 0, `schema current-state zero ${key}`);
  }
  for (const key of EXPECTED_AUTHORITY_ZERO_KEYS) {
    eq(schema.properties?.authority_ceiling?.properties?.[key]?.const, 0, `schema authority zero ${key}`);
  }

  for (const token of [
    'legal duty to comply',
    '11,672',
    '58 California counties',
    'Every missing link remains an explicit null',
    'A justified result of zero exact public joins is a valid completed census',
    'No county or case follow-up may begin before those denominators are terminal'
  ]) check(milestone.includes(token), `milestone token missing: ${token}`);
  for (const token of [
    'complete mechanical registry denominator: yes',
    'case-level implementation joins:            0',
    'A07 may search separately'
  ]) check(parentMilestone.includes(token), `parent milestone boundary missing: ${token}`);

  return errors;
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const errors = validateA07(root, { checkFiles: true });
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07: PASS — 12,282 rows, 11,672 documents, 58 counties, zero joins, zero authority escalation');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) main();
