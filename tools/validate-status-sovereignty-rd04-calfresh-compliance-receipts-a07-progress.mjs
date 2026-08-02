#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateAcquisitionResult
} from './acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs';
import {
  validateRules
} from './ssc-rd04-a07-order-candidate-extractor.mjs';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');

export const progressPaths = Object.freeze({
  progress: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/progress.json',
  schema: 'schemas/status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress.schema.json',
  constitution: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/core.json',
  acquisitionLedger: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/a07-official-source-acquisition/source-acquisition-ledger.json',
  acquisitionRoot: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/source-custody/a07-official-source-acquisition',
  rules: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/candidate-extraction-rules.json',
  pilotReceipt: 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/pilot/shard-00-receipt.json',
  parentCore: 'data/intake/status-sovereignty-rd04-calfresh-decision-corpus-a06/core.json',
  parentReleaseLedger: 'data/intake/status-sovereignty-rd04-calfresh-decision-corpus-a06/release-assets.json',
  parentShard00: 'data/intake/status-sovereignty-rd04-calfresh-decision-corpus-a06/denominator-shards/00.json'
});

const EXPECTED_PROGRESS_KEYS = Object.freeze([
  'schema_version',
  'execution_id',
  'issue',
  'as_of',
  'status',
  'constitution',
  'parent_denominator',
  'official_source_acquisition',
  'content_neutral_extraction',
  'county_census',
  'current_counts',
  'authority',
  'next_transactions'
]);
const EXPECTED_ZERO_COUNTS = Object.freeze([
  'exact_public_case_receipts',
  'case_level_implementation_joins',
  'complete_restoration_chains',
  'remedy_timeliness_observations',
  'reviewed_disposition_changes',
  'residual_classes_closed',
  'external_contacts',
  'external_reviews'
]);
const EXPECTED_FALSE_AUTHORITY = Object.freeze([
  'pilot_candidate_is_ordered_relief',
  'pilot_candidate_authorizes_follow_up',
  'exact_policy_response_is_case_compliance',
  'source_unavailable_is_noncompliance',
  'case_level_implementation_supported',
  'complete_restoration_supported',
  'remedy_timeliness_supported',
  'prevalence_supported',
  'racial_order_supported',
  'coordination_supported',
  'common_purpose_supported'
]);
const EXPECTED_NEXT_TRANSACTIONS = Object.freeze([
  'materialize_all_58_county_agency_roots_from_exact_cdss_county_office_custody',
  'resolve_exact_mpp_22_078_authority_from_the_confidentiality_fraud_civil_rights_and_state_hearings_manual',
  'execute_all_64_content_neutral_parent_shards_before_any_case_follow_up'
]);
const EXPECTED_FIELD_COUNTS = Object.freeze({
  explicit_order_or_directed_action: 279,
  benefit_increase_or_decrease_language: 118,
  restoration_or_retroactive_benefit_language: 51,
  remand_or_rehearing_language: 24,
  compliance_report_language: 0,
  stated_amount_if_any: 9470,
  stated_period_if_any: 3918
});

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readBytes = (root, rel) => fs.readFileSync(path.join(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const sameArray = (actual, expected) => Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);

function exactKeys(value, expected) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && sameArray(Object.keys(value).sort(), [...expected].sort());
}

function findAsset(ledger, name) {
  const matches = (ledger.assets ?? []).filter((asset) => asset.name === name);
  if (matches.length !== 1) return null;
  return matches[0];
}

function loadContext(root) {
  return {
    progress: readJson(root, progressPaths.progress),
    schema: readJson(root, progressPaths.schema),
    constitution: readJson(root, progressPaths.constitution),
    acquisitionLedger: readJson(root, progressPaths.acquisitionLedger),
    rules: readJson(root, progressPaths.rules),
    rulesBytes: readBytes(root, progressPaths.rules),
    pilotReceipt: readJson(root, progressPaths.pilotReceipt),
    parentCore: readJson(root, progressPaths.parentCore),
    parentReleaseLedger: readJson(root, progressPaths.parentReleaseLedger),
    parentReleaseLedgerBytes: readBytes(root, progressPaths.parentReleaseLedger),
    parentShard00: readJson(root, progressPaths.parentShard00)
  };
}

export function validateA07Progress(root = DEFAULT_ROOT, { checkFiles = true } = {}) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  if (checkFiles) {
    for (const rel of Object.values(progressPaths)) {
      if (!fs.existsSync(path.join(root, rel))) errors.push(`required progress file missing: ${rel}`);
    }
  }
  if (errors.length) return errors;

  let context;
  try {
    context = loadContext(root);
  } catch (error) {
    return [`A07 progress load failure: ${error.message}`];
  }
  const {
    progress,
    schema,
    constitution,
    acquisitionLedger,
    rules,
    rulesBytes,
    pilotReceipt,
    parentCore,
    parentReleaseLedger,
    parentReleaseLedgerBytes,
    parentShard00
  } = context;

  check(exactKeys(progress, EXPECTED_PROGRESS_KEYS), 'progress top-level closed shape');
  eq(progress.schema_version, 'ssc-rd04-a07-progress@1', 'progress schema version');
  eq(progress.execution_id, 'SSC-RD04-SNAP-A07', 'progress execution identity');
  eq(progress.issue, 741, 'progress issue receipt');
  eq(progress.as_of, '2026-08-02', 'progress as-of');
  eq(progress.status, 'initial_official_source_custody_and_content_neutral_pilot_complete', 'progress status');

  eq(progress.constitution?.path, progressPaths.constitution, 'constitution path');
  eq(progress.constitution?.phase_zero_snapshot, true, 'phase-zero snapshot boundary');
  eq(progress.constitution?.current_authoritative_state_path, progressPaths.progress, 'authoritative progress path');
  eq(progress.constitution?.denominator_reopened, false, 'denominator reopening boundary');
  eq(progress.constitution?.selection_rules_changed_after_result_inspection, false, 'post-result rule-change boundary');
  eq(constitution.schema_version, 'ssc-rd04-a07-core@1', 'constitution schema identity');
  eq(constitution.execution_id, 'SSC-RD04-SNAP-A07', 'constitution execution identity');
  eq(constitution.status, 'constitution_frozen_acquisition_not_yet_executed', 'constitution phase-zero status');
  eq(constitution.parent?.main_commit, 'd1597233110715e58e76e3b50b6792c226d9f7e8', 'constitution parent main');
  eq(constitution.frozen_parent_denominator?.denominator_reopened, false, 'constitution denominator boundary');
  eq(constitution.unit_contract?.outcome_selected_sampling_allowed, false, 'constitution outcome-selection boundary');
  eq(constitution.unit_contract?.outside_human_dependency, false, 'constitution no-human boundary');
  for (const [key, value] of Object.entries(constitution.current_state ?? {})) {
    eq(value, 0, `constitution phase-zero current state ${key}`);
  }

  eq(parentCore.execution_id, 'SSC-RD04-SNAP-A06', 'parent execution');
  eq(parentCore.issue, 721, 'parent issue');
  eq(parentCore.counts?.registry_rows, 12282, 'parent registry rows');
  eq(parentCore.counts?.unique_documents, 11672, 'parent documents');
  eq(parentCore.counts?.exact_pdf_documents, 11672, 'parent exact PDFs');
  eq(parentCore.counts?.exact_text_documents, 11672, 'parent exact texts');
  eq(parentCore.counts?.missing_or_non_pdf_documents, 0, 'parent missing documents');
  eq(parentCore.sharding?.shard_count, 64, 'parent shard count');
  eq(parentCore.current_result?.terminal_state, 'bounded_registry_denominator_orders_without_compliance_join', 'parent terminal receipt');
  eq(parentCore.counts?.case_level_implementation_joins, 0, 'parent case joins');

  const parent = progress.parent_denominator ?? {};
  eq(parent.registry_rows, parentCore.counts?.registry_rows, 'progress parent registry rows');
  eq(parent.documents, parentCore.counts?.unique_documents, 'progress parent documents');
  eq(parent.exact_pdf_documents, parentCore.counts?.exact_pdf_documents, 'progress parent exact PDFs');
  eq(parent.exact_text_documents, parentCore.counts?.exact_text_documents, 'progress parent exact texts');
  eq(parent.missing_documents, parentCore.counts?.missing_or_non_pdf_documents, 'progress parent missing documents');
  eq(parent.shards, parentCore.sharding?.shard_count, 'progress parent shards');

  eq(progress.official_source_acquisition?.ledger_path, progressPaths.acquisitionLedger, 'acquisition ledger path');
  eq(progress.official_source_acquisition?.workflow_run, 30736660191, 'acquisition workflow run');
  eq(progress.official_source_acquisition?.source_head, '835b51072ef48d6bb36e504e79e3de32031a8e33', 'acquisition source head');
  eq(progress.official_source_acquisition?.product_head, 'd1ae04f1504d725609a4177b31f1b0c35c170502', 'acquisition product head');
  eq(acquisitionLedger.schema_version, 'ssc-rd04-a07-official-source-acquisition@1', 'acquisition schema');
  eq(acquisitionLedger.execution_id, progress.execution_id, 'acquisition execution parity');
  eq(acquisitionLedger.issue, progress.issue, 'acquisition issue parity');
  eq(acquisitionLedger.counts?.frozen_sources, 9, 'acquisition frozen sources');
  eq(acquisitionLedger.counts?.terminal_sources, 9, 'acquisition terminal sources');
  eq(acquisitionLedger.counts?.exact_responses_preserved, 9, 'acquisition exact responses');
  eq(acquisitionLedger.counts?.exact_successful_bodies, 8, 'acquisition successful bodies');
  eq(acquisitionLedger.counts?.terminal_states?.exact_response_preserved_pending_semantic_classification, 8, 'acquisition successful state count');
  eq(acquisitionLedger.counts?.terminal_states?.source_unavailable, 1, 'acquisition unavailable state count');
  eq(acquisitionLedger.counts?.semantic_classifications_complete, 0, 'acquisition semantic ceiling');
  eq(acquisitionLedger.counts?.case_level_implementation_joins, 0, 'acquisition join ceiling');
  eq(acquisitionLedger.counts?.complete_restorations_observed, 0, 'acquisition restoration ceiling');
  eq(acquisitionLedger.counts?.remedy_timeliness_observed, 0, 'acquisition timeliness ceiling');
  eq(acquisitionLedger.sources?.length, 9, 'acquisition source rows');
  const unavailable = (acquisitionLedger.sources ?? []).filter((source) => source.terminal_state === 'source_unavailable');
  eq(unavailable.length, 1, 'unavailable source denominator');
  eq(unavailable[0]?.source_id, 'LAC-DPSS-ASH-008', 'unavailable source identity');
  eq(unavailable[0]?.attempts, 2, 'unavailable source bounded attempts');
  eq(unavailable[0]?.http_status, 503, 'unavailable source terminal status');
  for (const source of acquisitionLedger.sources ?? []) {
    eq(source.semantic_classification_complete, false, `source semantic ceiling ${source.source_id}`);
    eq(source.eligible_for_case_level_implementation_join, false, `source join ceiling ${source.source_id}`);
    eq(source.implementation_observed, false, `source implementation ceiling ${source.source_id}`);
    eq(source.separate_public_compliance_receipt_observed, false, `source compliance ceiling ${source.source_id}`);
    eq(source.complete_restoration_observed, false, `source restoration ceiling ${source.source_id}`);
    eq(source.remedy_timeliness_observed, false, `source timeliness ceiling ${source.source_id}`);
  }
  const acquisitionFileErrors = validateAcquisitionResult(
    path.join(root, progressPaths.acquisitionRoot),
    { expectedSources: 9 }
  );
  for (const error of acquisitionFileErrors) errors.push(`acquisition file custody: ${error}`);
  const progressAcquisition = progress.official_source_acquisition ?? {};
  eq(progressAcquisition.frozen_sources, acquisitionLedger.counts?.frozen_sources, 'progress acquisition source denominator');
  eq(progressAcquisition.terminal_sources, acquisitionLedger.counts?.terminal_sources, 'progress acquisition terminal denominator');
  eq(progressAcquisition.exact_responses_preserved, acquisitionLedger.counts?.exact_responses_preserved, 'progress acquisition response count');
  eq(progressAcquisition.exact_successful_bodies, acquisitionLedger.counts?.exact_successful_bodies, 'progress acquisition success count');
  eq(progressAcquisition.source_unavailable_receipts, acquisitionLedger.counts?.terminal_states?.source_unavailable, 'progress acquisition unavailable count');
  eq(progressAcquisition.semantic_classifications_complete, acquisitionLedger.counts?.semantic_classifications_complete, 'progress acquisition semantic count');
  eq(progressAcquisition.case_level_receipts, 0, 'progress acquisition case receipts');

  const ruleErrors = validateRules(rules);
  for (const error of ruleErrors) errors.push(`extraction rules: ${error}`);
  const observedRulesSha = sha256(rulesBytes);
  eq(observedRulesSha, '0c3825e76582d464ad62cdeafa8df42faaf70a7e297813f85ffd1e899f99ba29', 'rules exact SHA-256');
  eq(rules.dictionary_version, 'a07-order-candidate-v1', 'rules dictionary version');
  eq(rules.text_rules?.reduce((sum, row) => sum + (row.patterns?.length ?? 0), 0), 19, 'rules pattern denominator');

  eq(parentReleaseLedger.schema_version, 'ssc-rd04-a06-draft-release-ledger@1', 'parent release-ledger schema');
  eq(parentReleaseLedger.release_id, 363688049, 'parent draft release ID');
  eq(parentReleaseLedger.tag, 'ssc-rd04-a06-fy2025-26-corpus-v1', 'parent release tag');
  eq(parentReleaseLedger.draft, true, 'parent draft release state');
  eq(parentReleaseLedger.published_at, null, 'parent release publication state');
  eq(parentReleaseLedger.expected_assets, 132, 'parent expected release assets');
  eq(parentReleaseLedger.observed_assets, 132, 'parent observed release assets');
  const archiveAsset = findAsset(parentReleaseLedger, 'ssc-rd04-a06-pdf-shard-00.tar.zst');
  const hashAsset = findAsset(parentReleaseLedger, 'ssc-rd04-a06-pdf-shard-00.tar.zst.sha256');
  check(Boolean(archiveAsset), 'parent shard-00 archive asset');
  check(Boolean(hashAsset), 'parent shard-00 checksum asset');
  eq(archiveAsset?.id, 498543437, 'parent shard-00 archive ID');
  eq(archiveAsset?.size, 21339450, 'parent shard-00 archive bytes');
  eq(archiveAsset?.sha256, '37d07a030e07857db758b96f8d2ef878a98bd413f1e987623d019fc835ed2ebc', 'parent shard-00 archive SHA-256');
  eq(hashAsset?.id, 498543438, 'parent shard-00 checksum ID');
  eq(hashAsset?.size, 100, 'parent shard-00 checksum bytes');

  eq(parentShard00.schema_version, 'ssc-rd04-a06-document-shard-plan@1', 'parent shard-plan schema');
  eq(parentShard00.execution_id, 'SSC-RD04-SNAP-A06', 'parent shard-plan execution');
  eq(parentShard00.shard, '00', 'parent shard identity');
  eq(parentShard00.assignment, 'sha256_document_identity_mod_64', 'parent shard assignment');
  eq(parentShard00.counts?.documents, 192, 'parent shard documents');
  eq(parentShard00.counts?.registry_rows, 212, 'parent shard registry rows');
  eq(parentShard00.documents?.length, 192, 'parent shard document rows');
  eq(new Set((parentShard00.documents ?? []).map((row) => row.document_identity)).size, 192, 'parent shard document identity uniqueness');
  eq((parentShard00.documents ?? []).reduce((sum, row) => sum + Number(row.registry_row_count ?? 0), 0), 212, 'parent shard registry-row reconciliation');

  eq(pilotReceipt.schema_version, 'ssc-rd04-a07-shard00-pilot-receipt@1', 'pilot receipt schema');
  eq(pilotReceipt.execution_id, progress.execution_id, 'pilot execution parity');
  eq(pilotReceipt.issue, progress.issue, 'pilot issue parity');
  eq(pilotReceipt.workflow_run, 30736912580, 'pilot workflow run');
  eq(pilotReceipt.workflow_head, 'c54e35a9aa24768cac5c16664226c43a2e0b8006', 'pilot workflow head');
  eq(pilotReceipt.source?.release_id, parentReleaseLedger.release_id, 'pilot release ID');
  eq(pilotReceipt.source?.release_asset_count, parentReleaseLedger.observed_assets, 'pilot release-asset denominator');
  eq(pilotReceipt.source?.release_ledger_path, progressPaths.parentReleaseLedger, 'pilot release-ledger path');
  eq(pilotReceipt.source?.release_ledger_bytes, parentReleaseLedgerBytes.length, 'pilot release-ledger bytes');
  eq(pilotReceipt.source?.release_ledger_sha256, sha256(parentReleaseLedgerBytes), 'pilot release-ledger hash');
  eq(pilotReceipt.source?.archive_asset_id, archiveAsset?.id, 'pilot archive asset ID');
  eq(pilotReceipt.source?.archive_bytes, archiveAsset?.size, 'pilot archive bytes');
  eq(pilotReceipt.source?.archive_sha256, archiveAsset?.sha256, 'pilot archive SHA-256');
  eq(pilotReceipt.source?.archive_transport, 'asset_api', 'pilot archive transport');
  eq(pilotReceipt.source?.checksum_asset_id, hashAsset?.id, 'pilot checksum asset ID');
  eq(pilotReceipt.source?.checksum_bytes, hashAsset?.size, 'pilot checksum bytes');
  eq(pilotReceipt.rules?.dictionary_version, rules.dictionary_version, 'pilot dictionary version');
  eq(pilotReceipt.rules?.exact_bytes, rulesBytes.length, 'pilot rules bytes');
  eq(pilotReceipt.rules?.sha256, observedRulesSha, 'pilot rules SHA-256');
  eq(pilotReceipt.rules?.pattern_count, 19, 'pilot pattern count');
  eq(pilotReceipt.denominator?.shard, parentShard00.shard, 'pilot shard identity');
  eq(pilotReceipt.denominator?.assignment, parentShard00.assignment, 'pilot shard assignment');
  eq(pilotReceipt.denominator?.documents, parentShard00.counts?.documents, 'pilot document denominator');
  eq(pilotReceipt.denominator?.registry_rows, parentShard00.counts?.registry_rows, 'pilot registry-row denominator');
  eq(pilotReceipt.denominator?.document_identity_match, true, 'pilot document identity match');
  eq(pilotReceipt.denominator?.registry_identity_match, true, 'pilot registry identity match');
  eq(pilotReceipt.extraction?.candidate_documents, 131, 'pilot candidate documents');
  eq(pilotReceipt.extraction?.support_only_documents, 50, 'pilot support-only documents');
  eq(pilotReceipt.extraction?.negative_documents, 61, 'pilot negative documents');
  eq(pilotReceipt.extraction?.candidate_documents + pilotReceipt.extraction?.negative_documents, 192, 'pilot candidate/negative partition');
  check(pilotReceipt.extraction?.support_only_documents <= pilotReceipt.extraction?.negative_documents, 'pilot support-only subset boundary');
  eq(pilotReceipt.extraction?.total_matches, 13860, 'pilot total matches');
  eq(pilotReceipt.extraction?.ledger_bytes, 6321181, 'pilot ledger bytes');
  eq(pilotReceipt.extraction?.ledger_sha256, '7d77c0a72715e2bfa3ed451d30f34ae1fcac83eb06756144eed6c19f95e1ee74', 'pilot ledger SHA-256');
  eq(pilotReceipt.extraction?.population_complete, false, 'pilot population-complete boundary');
  eq(JSON.stringify(pilotReceipt.extraction?.field_match_counts), JSON.stringify(EXPECTED_FIELD_COUNTS), 'pilot field-match counts');
  eq(pilotReceipt.artifact?.id, 8829896177, 'pilot artifact ID');
  eq(pilotReceipt.artifact?.digest, '26cf6e9f532a1f7f475ad7595b315d0c251b2e462a098475b960595d60ec94e1', 'pilot artifact digest');
  eq(pilotReceipt.artifact?.retention_days, 90, 'pilot artifact retention');
  for (const key of [
    'follow_up_selection_authorized',
    'ordered_relief_observed',
    'implementation_observed',
    'separate_public_compliance_receipt_observed',
    'complete_restoration_observed',
    'remedy_timeliness_observed',
    'prevalence_supported',
    'racial_order_supported',
    'coordination_supported',
    'common_purpose_supported'
  ]) eq(pilotReceipt.authority?.[key], false, `pilot authority ${key}`);
  for (const key of [
    'rule_change_authorized',
    'follow_up_authorized',
    'ordered_relief_observed',
    'source_receipt_observed',
    'implementation_observed',
    'restoration_observed',
    'remedy_timeliness_observed'
  ]) eq(pilotReceipt.boundaries?.[key], false, `pilot boundary ${key}`);
  eq(pilotReceipt.boundaries?.content_neutral_preassigned_shard, true, 'pilot content-neutral boundary');
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(pilotReceipt.authority?.[key], 'none', `pilot authority effect ${key}`);
    eq(pilotReceipt.boundaries?.[key], 'none', `pilot boundary effect ${key}`);
  }

  const extraction = progress.content_neutral_extraction ?? {};
  eq(extraction.rules_path, progressPaths.rules, 'progress rules path');
  eq(extraction.dictionary_version, rules.dictionary_version, 'progress dictionary version');
  eq(extraction.rules_sha256, observedRulesSha, 'progress rules SHA-256');
  eq(extraction.pattern_count, pilotReceipt.rules?.pattern_count, 'progress pattern count');
  eq(extraction.pilot_receipt_path, progressPaths.pilotReceipt, 'progress pilot path');
  eq(extraction.workflow_run, pilotReceipt.workflow_run, 'progress pilot workflow run');
  eq(extraction.workflow_head, pilotReceipt.workflow_head, 'progress pilot workflow head');
  eq(extraction.product_head, 'a916d86382c9faa4f5e915399ca6ecb3b6c2be0d', 'progress pilot product head');
  eq(extraction.artifact_id, pilotReceipt.artifact?.id, 'progress pilot artifact ID');
  eq(extraction.artifact_digest, pilotReceipt.artifact?.digest, 'progress pilot artifact digest');
  eq(extraction.pilot_shard, pilotReceipt.denominator?.shard, 'progress pilot shard');
  eq(extraction.pilot_documents_processed, pilotReceipt.denominator?.documents, 'progress pilot documents');
  eq(extraction.pilot_registry_rows_represented, pilotReceipt.denominator?.registry_rows, 'progress pilot registry rows');
  eq(extraction.candidate_documents, pilotReceipt.extraction?.candidate_documents, 'progress candidate documents');
  eq(extraction.support_only_documents, pilotReceipt.extraction?.support_only_documents, 'progress support-only documents');
  eq(extraction.negative_documents, pilotReceipt.extraction?.negative_documents, 'progress negative documents');
  eq(extraction.total_matches, pilotReceipt.extraction?.total_matches, 'progress total matches');
  eq(extraction.pilot_population_complete, false, 'progress pilot-complete boundary');
  eq(extraction.full_population_documents_processed, 0, 'full population document progress');
  eq(extraction.full_population_registry_rows_represented, 0, 'full population registry-row progress');
  eq(extraction.full_population_complete, false, 'full population complete boundary');
  eq(extraction.follow_up_authorized, false, 'full population follow-up boundary');

  eq(progress.county_census?.expected_counties, 58, 'county denominator');
  eq(progress.county_census?.agency_roots_materialized, 0, 'county root materialization state');
  eq(progress.county_census?.counties_censused, 0, 'county census state');
  eq(progress.county_census?.complete, false, 'county census completion boundary');
  eq(progress.county_census?.county_selection_authorized, false, 'county selection boundary');

  check(exactKeys(progress.current_counts, EXPECTED_ZERO_COUNTS), 'current-count closed shape');
  for (const key of EXPECTED_ZERO_COUNTS) eq(progress.current_counts?.[key], 0, `current-count zero ${key}`);
  for (const key of EXPECTED_FALSE_AUTHORITY) eq(progress.authority?.[key], false, `progress authority ${key}`);
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) {
    eq(progress.authority?.[key], 'none', `progress effect ${key}`);
  }
  check(sameArray(progress.next_transactions, EXPECTED_NEXT_TRANSACTIONS), 'next transaction order');

  eq(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', 'progress schema dialect');
  eq(schema.additionalProperties, false, 'progress schema closed shape');
  eq(schema.properties?.schema_version?.const, 'ssc-rd04-a07-progress@1', 'progress schema identity');
  eq(schema.properties?.status?.const, progress.status, 'progress schema status');
  eq(schema.properties?.official_source_acquisition?.properties?.frozen_sources?.const, 9, 'progress schema source denominator');
  eq(schema.properties?.official_source_acquisition?.properties?.semantic_classifications_complete?.const, 0, 'progress schema semantic ceiling');
  eq(schema.properties?.content_neutral_extraction?.properties?.pilot_documents_processed?.const, 192, 'progress schema pilot denominator');
  eq(schema.properties?.content_neutral_extraction?.properties?.full_population_documents_processed?.const, 0, 'progress schema full-population ceiling');
  eq(schema.properties?.county_census?.properties?.counties_censused?.const, 0, 'progress schema county-census ceiling');
  for (const key of EXPECTED_ZERO_COUNTS) {
    eq(schema.properties?.current_counts?.properties?.[key]?.const, 0, `progress schema zero ${key}`);
  }
  for (const key of EXPECTED_FALSE_AUTHORITY) {
    eq(schema.properties?.authority?.properties?.[key]?.const, false, `progress schema authority ${key}`);
  }

  return errors;
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const errors = validateA07Progress(root, { checkFiles: true });
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress: PASS — 9 source receipts, 192-document pilot, 0 full-population documents, 0 county census, 0 joins');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) main();
