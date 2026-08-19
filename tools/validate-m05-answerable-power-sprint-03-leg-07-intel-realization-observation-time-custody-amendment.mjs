#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  amendment:resolvePath(
    'M05_INTEL_REALIZATION_OBSERVATION_TIME_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json'
  ),
  connection:resolvePath(
    'M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json'
  ),
  connectionValidator:resolvePath(
    'M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs'
  ),
  objectContract:resolvePath(
    'M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json'
  ),
  objectValidator:resolvePath(
    'M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs'
  ),
  registry:resolvePath(
    'M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json'
  )
};

const EXPECTED={
  amendmentBlob:'817f2b571c5f5feb755c6ac97226567630de5c38',
  amendmentSemantic:'5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9',
  connectionBlob:'3dc1b9dd8510ad5903f7a1e39abfe051dd36831a',
  connectionSemantic:'50a923f64324ddc23cf99d0c98dfec1b3707cd2db701b49c82f45faeafa4dda7',
  connectionValidatorBlob:'3dba5e6bcfef164489d630ee3cd5ccaee89ea83f',
  objectContractBlob:'d1dfb261ff027b624a1da25feb49bbc492fe8a4c',
  objectContractSemantic:'b775a0253219f33fd5fc04ff79088a178577ea264ee7fa6af38a717d99c8ec74',
  objectValidatorBlob:'09fd1fb7a89840ae5f5189b6c50b5f45fdbdfd14',
  registryBlob:'e8ff7438814f79309964b75805d5f945bd0bcbd8'
};

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=(value)=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=(message)=>{throw new Error(message)};
const requireTrue=(value,message)=>{if(value!==true)fail(message)};
const requireFalse=(value,message)=>{if(value!==false)fail(message)};

const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
for(const [key,expected] of [
  ['amendment',EXPECTED.amendmentBlob],
  ['connection',EXPECTED.connectionBlob],
  ['connectionValidator',EXPECTED.connectionValidatorBlob],
  ['objectContract',EXPECTED.objectContractBlob],
  ['objectValidator',EXPECTED.objectValidatorBlob],
  ['registry',EXPECTED.registryBlob]
]){
  if(gitBlobSha(raw[key])!==expected)fail(`${key} Git object drift`);
}

const amendment=JSON.parse(raw.amendment.toString('utf8'));
const connection=JSON.parse(raw.connection.toString('utf8'));
const objectContract=JSON.parse(raw.objectContract.toString('utf8'));
const registry=JSON.parse(raw.registry.toString('utf8'));
const snapshots={
  amendment:JSON.stringify(amendment),
  connection:JSON.stringify(connection),
  objectContract:JSON.stringify(objectContract),
  registry:JSON.stringify(registry)
};

const checkSemantic=(value,field,expected,label)=>{
  const copy=clone(value);
  const declared=copy[field];
  delete copy[field];
  if(declared!==expected)fail(`${label} declared semantic checksum drift`);
  if(semanticHash(copy)!==expected)fail(`${label} semantic checksum drift`);
};
checkSemantic(amendment,'observation_time_amendment_sha256',EXPECTED.amendmentSemantic,'observation-time amendment');
checkSemantic(connection,'connection_authentication_amendment_sha256',EXPECTED.connectionSemantic,'connection-authentication amendment');
checkSemantic(objectContract,'contract_sha256',EXPECTED.objectContractSemantic,'provenance-object contract');

if(amendment.schema_version!=='m05-answerable-power-s03-l7-intel-realization-observation-time-custody-amendment@1')fail('amendment schema drift');
if(amendment.object_class!=='bounded_admission_trusted_observation_time_custody_amendment')fail('amendment object class drift');
if(amendment.program_id!=='M-05'||amendment.sprint_id!=='M05-SPRINT-03'||amendment.leg_id!=='S03-L7')fail('amendment program binding drift');
if(amendment.issue!==345||amendment.as_of!=='2026-08-19'||amendment.status!=='intel_realization_observation_time_custody_amendment_frozen')fail('amendment identity drift');

const expectedBase={
  branch:'main',
  sha:'46b2cb3bcd611f85c49088acc453fe81c32699a0',
  tree_sha:'dff78bb3d2b1c681bb8f4ea487e6be1d203b91d3',
  latest_connection_authentication_pull_request:2195,
  latest_connection_authentication_merge_commit:'80b0b81ffd5152c54e768c23a083f23ba5bfe3be',
  latest_provenance_object_pull_request:2186,
  latest_provenance_object_merge_commit:'f0eab9ff81378fe3578d35a84e395ee17bcfeb07'
};
if(!same(amendment.canonical_base,expectedBase))fail('canonical base drift');

const bindings=amendment.bindings||{};
if(bindings.connection_authentication_amendment?.blob_sha!==EXPECTED.connectionBlob||
   bindings.connection_authentication_amendment?.semantic_sha256!==EXPECTED.connectionSemantic||
   bindings.connection_authentication_amendment?.pull_request!==2195||
   bindings.connection_authentication_amendment?.merge_commit!=='80b0b81ffd5152c54e768c23a083f23ba5bfe3be')fail('connection-amendment binding drift');
if(bindings.connection_authentication_validator?.blob_sha!==EXPECTED.connectionValidatorBlob||
   bindings.connection_authentication_validator?.pull_request!==2195)fail('connection-validator binding drift');
if(bindings.provenance_object_custody_contract?.blob_sha!==EXPECTED.objectContractBlob||
   bindings.provenance_object_custody_contract?.semantic_sha256!==EXPECTED.objectContractSemantic||
   bindings.provenance_object_custody_contract?.pull_request!==2186||
   bindings.provenance_object_custody_contract?.merge_commit!=='f0eab9ff81378fe3578d35a84e395ee17bcfeb07')fail('provenance-object binding drift');
if(bindings.provenance_object_custody_validator?.blob_sha!==EXPECTED.objectValidatorBlob||
   bindings.provenance_object_custody_validator?.pull_request!==2186)fail('provenance-validator binding drift');
if(bindings.stage_receipt_registry?.blob_sha!==EXPECTED.registryBlob||bindings.stage_receipt_registry?.pull_request!==2186)fail('stage-registry binding drift');

if(connection.schema_version!=='m05-answerable-power-s03-l7-intel-realization-connection-authentication-custody-amendment@1'||connection.status!=='intel_realization_connection_authentication_custody_amendment_frozen')fail('connection predecessor identity drift');
if(objectContract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-provenance-object-custody-contract@1'||objectContract.status!=='intel_realization_provenance_object_custody_contract_frozen')fail('object predecessor identity drift');
if(registry.schema_version!=='m05-answerable-power-s03-l7-intel-realization-stage-receipt-registry@1'||registry.status!=='intel_realization_stage_receipt_registry_waiting_for_ordinary_gate')fail('registry identity drift');
if(!Array.isArray(connection.observed_receipts)||connection.observed_receipts.length!==0)fail('connection predecessor receipt inflation');
if(!Array.isArray(registry.receipts)||registry.receipts.length!==0)fail('registry receipt inflation');

const stages=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(!same(amendment.stage_order,stages))fail('stage order drift');
const stageFields=[
  'observation_time_receipt_id','observation_time_observed_at_utc','clock_source_class','clock_source_identifier',
  'clock_source_authority','clock_source_authority_identifier','clock_source_receipt_sha256','clock_source_custody_locator',
  'clock_source_repository_blob_sha_if_used','synchronization_state','synchronization_observed_at_utc',
  'synchronization_receipt_sha256','synchronization_custody_locator','clock_resolution_seconds','clock_offset_seconds',
  'clock_uncertainty_seconds','clock_drift_bound_ppm','holdover_started_at_utc','monotonic_clock_identifier',
  'monotonic_sample_start','monotonic_sample_end','wall_clock_start_utc','wall_clock_end_utc',
  'wall_to_monotonic_mapping_sha256','wall_to_monotonic_mapping_custody_locator','clock_adjustment_events',
  'leap_second_state','leap_smear_policy','time_receipt_sha256','time_receipt_custody_locator',
  'time_receipt_repository_blob_sha_if_used','freshness_policy_identifier','freshness_policy_sha256',
  'freshness_policy_custody_locator','freshness_evaluation_observed_at_utc','freshness_result','temporal_order_reconciliation'
];
for(const stageId of stages){
  const row=amendment.effective_stage_observation_time_custody?.[stageId];
  if(!row)fail(`missing stage ${stageId}`);
  if(row.requires_connection_authentication_stage!==stageId)fail(`${stageId} predecessor-stage drift`);
  if(!same(row.required_fields,stageFields))fail(`${stageId} required-field drift`);
  for(const key of ['trusted_clock_source_required','bounded_uncertainty_interval_required','wall_and_monotonic_mapping_required','clock_adjustment_history_required','freshness_policy_and_result_required','freshness_result_must_be_pass'])requireTrue(row[key],`${stageId} ${key} weakened`);
  for(const key of ['point_timestamp_ordering_alone_qualifies','unsynchronized_local_wall_clock_qualifies','temporal_order_contradiction_qualifies'])requireFalse(row[key],`${stageId} ${key} weakened`);
}

const gap=amendment.predecessor_gap||{};
if(gap.gap_class!=='authenticated_request_response_without_trusted_time_basis'||gap.utc_timestamp_fields_present!==true)fail('predecessor gap classification drift');
for(const key of ['trusted_clock_source_receipt_required','clock_synchronization_state_required','clock_offset_and_uncertainty_required','wall_to_monotonic_mapping_required','clock_step_slew_leap_history_required','interval_safe_chronology_required','dns_certificate_revocation_ct_and_response_freshness_policy_required','timestamp_string_alone_is_reproducible_time_judgment'])requireFalse(gap[key],`predecessor gap drift: ${key}`);

const receipt=amendment.time_receipt_contract||{};
if(receipt.schema_version!=='m05-answerable-power-s03-l7-intel-observation-time-receipt@1'||receipt.object_class!=='trusted_observation_time_receipt')fail('time receipt identity drift');
if(receipt.rfc3339_utc_pattern!=='^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?Z$')fail('UTC timestamp pattern drift');
if(!same(receipt.allowed_clock_source_classes,['authenticated_nts_ntp_clock','trusted_hardware_clock_attestation','source_native_signed_timestamp','rfc3161_trusted_timestamp_authority','dual_independent_authenticated_clocks']))fail('clock source denominator drift');
if(!same(receipt.allowed_synchronization_states,['synchronized','bounded_holdover','source_native_time','dual_clock_consensus']))fail('synchronization denominator drift');
for(const key of ['all_wall_times_must_be_rfc3339_utc','clock_resolution_seconds_must_be_positive_finite','clock_uncertainty_seconds_must_be_positive_finite','clock_drift_bound_ppm_must_be_nonnegative_finite','clock_offset_seconds_must_be_finite'])requireTrue(receipt[key],`${key} weakened`);
for(const key of ['unsupported_zero_uncertainty_qualifies','unsynchronized_local_wall_clock_qualifies','repository_commit_time_qualifies_as_source_observation','workflow_start_time_qualifies_as_source_observation','filesystem_mtime_qualifies_as_source_observation','current_time_substitution_qualifies','leap_second_state_unknown_qualifies'])requireFalse(receipt[key],`${key} weakened`);

const profiles=amendment.clock_source_profile_rules||{};
for(const key of receipt.allowed_clock_source_classes)if(!profiles[key])fail(`missing clock source profile ${key}`);
requireFalse(profiles.authenticated_nts_ntp_clock?.plain_unauthenticated_ntp_qualifies,'plain NTP admitted');
requireFalse(profiles.trusted_hardware_clock_attestation?.unattested_rtc_qualifies,'unattested RTC admitted');
requireFalse(profiles.source_native_signed_timestamp?.unsigned_page_date_qualifies,'unsigned page date admitted');
requireFalse(profiles.rfc3161_trusted_timestamp_authority?.token_without_certificate_validation_qualifies,'unvalidated TSA token admitted');
requireFalse(profiles.dual_independent_authenticated_clocks?.same_authority_twice_qualifies,'same authority dual-clock admission');

const mapping=amendment.monotonic_mapping_rules||{};
for(const key of ['monotonic_samples_must_be_non_decreasing','wall_interval_must_cover_monotonic_interval','clock_adjustment_events_inside_interval_must_be_preserved'])requireTrue(mapping[key],`${key} weakened`);
requireFalse(mapping.wall_clock_rollback_without_adjustment_receipt_qualifies,'unreceipted rollback admitted');
requireFalse(mapping.monotonic_counter_reset_without_epoch_receipt_qualifies,'unreceipted monotonic reset admitted');

const interval=amendment.uncertainty_interval_rules||{};
if(interval.definitely_before_rule!=='upper_bound_a < lower_bound_b'||interval.definitely_after_rule!=='lower_bound_a > upper_bound_b')fail('interval ordering rule drift');
requireFalse(interval.point_string_comparison_may_establish_order,'point comparison admitted');
requireFalse(interval.overlapping_intervals_may_be_promoted_to_ordered,'overlap promoted to order');
requireTrue(interval.uncertainty_may_not_be_dropped_after_conversion,'uncertainty dropping enabled');

const temporal=amendment.temporal_reconciliation_rules||{};
for(const key of ['each_time_role_requires_receipt_binding','request_must_not_be_definitely_before_connection_established','response_must_not_be_definitely_before_request','body_completion_must_not_be_definitely_before_response_headers','connection_close_must_not_be_definitely_before_body_completion','tls_validation_time_must_reconcile_to_authenticated_tls_receipt','source_native_timestamp_must_reconcile_to_exact_source_body','ambiguous_or_overlapping_order_remains_indeterminate'])requireTrue(temporal[key],`${key} weakened`);

const freshness=amendment.freshness_policy_rules||{};
if(!same(freshness.allowed_results,['pass','fail','indeterminate']))fail('freshness result denominator drift');
for(const key of ['dns_must_be_definitely_unexpired_at_request','certificate_validation_interval_must_be_definitely_inside_certificate_validity','revocation_and_ct_evidence_must_meet_named_policy','source_record_freshness_must_meet_named_policy_if_claimed_current'])requireTrue(freshness[key],`${key} weakened`);
for(const key of ['indeterminate_freshness_qualifies','expired_dns_answer_qualifies','stale_revocation_or_ct_evidence_qualifies','certificate_check_without_uncertainty_qualifies'])requireFalse(freshness[key],`${key} weakened`);

const cross=amendment.cross_object_rules||{};
for(const key of ['declared_time_receipt_sha256_must_equal_exact_file_bytes','declared_time_receipt_blob_sha_must_equal_exact_git_blob','clock_source_and_synchronization_receipts_must_be_retrievable','time_receipt_stage_and_event_chain_must_match_stage_registry','connection_times_must_cross_bind_connection_authentication_receipt','source_observation_time_must_cross_bind_origin_or_acquisition_receipt','freshness_policy_and_evaluation_objects_must_be_retrievable','one_digest_may_not_stand_for_distinct_time_objects'])requireTrue(cross[key],`${key} weakened`);
requireFalse(cross.trusted_time_custody_is_empirical_stage_admission,'time custody promoted to empirical stage');

if(!Array.isArray(amendment.observed_receipts)||amendment.observed_receipts.length!==0)fail('unadjudicated time receipt injected');
const state=amendment.observed_state||{};
if(state.registered_time_receipts!==0||state.trusted_clock_source_receipts!==0||state.freshness_evaluations!==0)fail('time receipt denominator inflation');
for(const key of ['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_change_authorized'])requireFalse(state[key],`${key} overclaim`);
for(const [key,value] of Object.entries(amendment.guardrails||{}))requireFalse(value,`guardrail weakened: ${key}`);
for(const [key,value] of Object.entries(amendment.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('graph boundary drift');
  }else requireFalse(value,`unsafe boundary: ${key}`);
}
const result=amendment.expected_result||{};
if(result.amended_stages!==4||result.stages_requiring_trusted_time_receipts!==4||result.stages_requiring_interval_safe_chronology!==4||result.stages_requiring_named_freshness_policy!==4||result.registered_time_receipts!==0||result.freshness_evaluations!==0||result.graph_effect!=='none')fail('expected result denominator drift');
for(const key of ['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_effectiveness','cross_domain_regression_completed','issue_345_may_close'])requireFalse(result[key],`${key} result overclaim`);

for(const [key,value] of Object.entries({amendment,connection,objectContract,registry})){
  if(JSON.stringify(value)!==snapshots[key])fail(`validator mutated ${key}`);
}

console.log(JSON.stringify({
  validator:'m05-intel-realization-observation-time-custody-amendment',
  amended_stages:4,
  stages_requiring_trusted_time_receipts:4,
  stages_requiring_interval_safe_chronology:4,
  stages_requiring_named_freshness_policy:4,
  registered_time_receipts:0,
  freshness_evaluations:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  issue_345_may_close:false
},null,2));
