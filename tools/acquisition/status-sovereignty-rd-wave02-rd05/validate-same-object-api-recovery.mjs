import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildRecoveryIndex, CONSTANTS } from './build-same-object-api-recovery-index.mjs';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function stable(value) {
  return JSON.stringify(value);
}

export function validateRecovery({
  captureRoot = CONSTANTS.captureRoot,
  outputPath = CONSTANTS.outputPath
} = {}) {
  invariant(fs.existsSync(outputPath), 'recovery index missing');
  const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const expected = buildRecoveryIndex({ captureRoot });
  invariant(stable(actual) === stable(expected), 'recovery index differs from deterministic reconstruction');

  invariant(actual.schema_version === CONSTANTS.schemaVersion, 'index schema');
  invariant(actual.status === 'same_object_api_recovery_complete_semantic_reconciliation_pending', 'index status');
  invariant(actual.counts.frozen_object_denominator === 58, 'frozen denominator');
  invariant(actual.counts.frozen_object_denominator_changed === 0, 'frozen denominator changed');
  invariant(actual.counts.same_object_recoveries === 1, 'recovery count');
  invariant(actual.counts.retained_representations === 2, 'representation count');
  invariant(actual.counts.exact_custody_files === 14, 'custody file count');
  invariant(actual.counts.capture_manifest_entries === 13, 'manifest entry count');
  invariant(actual.counts.attempts_executed === 1, 'attempt count');
  invariant(actual.counts.linked_urls_discovered === 7, 'linked url denominator');
  invariant(actual.counts.linked_urls_fetched === 0 && actual.counts.links_admitted === 0, 'link boundary');
  invariant(actual.counts.completed_recommendation_objects_added === 0, 'recommendation inflation');
  invariant(actual.counts.agency_response_objects_added === 0, 'response inflation');
  invariant(actual.counts.adopted_or_rejected_objects_added === 0, 'disposition inflation');
  invariant(actual.counts.implementation_or_outcome_objects_added === 0, 'outcome inflation');
  invariant(actual.counts.external_contacts === 0 && actual.counts.external_reviews === 0, 'human boundary');
  invariant(actual.counts.graph_effects === 0, 'graph effect count');

  invariant(actual.recovery.object_id === CONSTANTS.objectId, 'object id');
  invariant(actual.recovery.document_number === CONSTANTS.documentNumber, 'document number');
  invariant(actual.recovery.original_representation.semantic_target_delivered === false, 'prior interstitial boundary');
  invariant(actual.recovery.official_api_representation.body.sha256 === '40d9942728b30ba2d1c372f752884823c20ab575d91d8b866cad619dac1d9b9a', 'API body sha');
  invariant(actual.recovery.official_api_representation.body.bytes === 3322, 'API body bytes');
  invariant(actual.recovery.official_api_representation.headers.sha256 === '4778bf0976fa9b083a559a1e264b4aff3a9344f25e6f09f78f14cdc33cffba74', 'headers sha');
  invariant(actual.recovery.same_object_binding.document_number_locator_match === true, 'locator binding');
  invariant(actual.recovery.same_object_binding.api_document_number_match === true, 'API document binding');
  invariant(actual.recovery.same_object_binding.frozen_url_html_url_match === true, 'HTML locator binding');
  invariant(actual.recovery.official_record.record_type === 'Notice', 'record type');
  invariant(actual.recovery.official_record.action === 'Solicitation of membership nominations.', 'record action');
  invariant(actual.recovery.official_record.publication_date === '2024-04-29', 'publication date');
  invariant(actual.recovery.official_record.nomination_deadline === '2024-05-29', 'nomination deadline');
  invariant(actual.recovery.official_record.citation === '89 FR 33332', 'citation');
  invariant(actual.recovery.official_record.agencies.map((agency) => agency.id).join(',') === '54,361', 'agency identities');
  invariant(actual.recovery.linked_urls.length === 7 && actual.recovery.linked_urls.every((entry) => entry.fetched === false && entry.admitted === false), 'nonadmitted links');

  invariant(actual.semantic_adjudication.source_access_gap_closed === true, 'source gap closure');
  invariant(actual.semantic_adjudication.completed_recommendation_observed === false, 'recommendation state');
  invariant(actual.semantic_adjudication.agency_response_observed === false, 'response state');
  invariant(actual.semantic_adjudication.adoption_or_rejection_observed === false, 'disposition state');
  invariant(actual.semantic_adjudication.implementation_or_outcome_observed === false, 'outcome state');
  invariant(actual.semantic_adjudication.object_successor_action_discharged === 'retrieve_same_object_via_federal_register_api', 'successor action');
  invariant(actual.semantic_adjudication.object_open_chain_can_close === true, 'chain closure eligibility');
  invariant(actual.semantic_adjudication.semantic_classification_update_required === true, 'semantic handoff');

  invariant(Object.values(actual.boundaries).every((value) => value === false || value === 'none'), 'boundary truth table');
  invariant(actual.authority.denominator_authority === 'unchanged_frozen_58_object_denominator', 'denominator authority');
  invariant(actual.authority.outside_human_dependency === false, 'outside human dependency');
  invariant(actual.authority.publication_effect === 'none' && actual.authority.adoption_effect === 'none' && actual.authority.graph_effect === 'none', 'authority effects');
  return actual;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const product = validateRecovery();
  console.log(`validate-rd05-same-object-api-recovery: PASS — ${product.counts.exact_custody_files} exact files, same object recovered, denominator unchanged`);
}
