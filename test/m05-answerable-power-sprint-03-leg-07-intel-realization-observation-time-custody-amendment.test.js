#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validator=path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs');
const amendmentPath=path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json');
const predecessorPaths={
  connection:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.json'),
  connectionValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-connection-authentication-custody-amendment.mjs'),
  objectContract:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody-contract.json'),
  objectValidator:path.join(root,'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-provenance-object-custody.mjs'),
  registry:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-stage-receipt-registry.json')
};
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-observation-time-'));
const amendment=JSON.parse(fs.readFileSync(amendmentPath,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

const expectedStageFields=[
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

const validateAmendmentOnly=(row)=>{
  if(row.schema_version!=='m05-answerable-power-s03-l7-intel-realization-observation-time-custody-amendment@1')throw Error('schema drift');
  if(row.canonical_base?.sha!=='46b2cb3bcd611f85c49088acc453fe81c32699a0')throw Error('base drift');
  if(row.bindings?.connection_authentication_amendment?.blob_sha!=='3dc1b9dd8510ad5903f7a1e39abfe051dd36831a')throw Error('connection binding drift');
  if(row.bindings?.provenance_object_custody_contract?.blob_sha!=='d1dfb261ff027b624a1da25feb49bbc492fe8a4c')throw Error('object binding drift');
  if(row.predecessor_gap?.clock_offset_and_uncertainty_required!==false)throw Error('gap drift');
  for(const stageId of ['transaction','federal_cash_custody','public_account_booking','distribution']){
    const stage=row.effective_stage_observation_time_custody?.[stageId];
    if(!stage||!same(stage.required_fields,expectedStageFields))throw Error(`${stageId} field drift`);
    if(stage.trusted_clock_source_required!==true||stage.bounded_uncertainty_interval_required!==true||stage.freshness_result_must_be_pass!==true)throw Error(`${stageId} time rule weakened`);
    if(stage.point_timestamp_ordering_alone_qualifies!==false||stage.unsynchronized_local_wall_clock_qualifies!==false||stage.temporal_order_contradiction_qualifies!==false)throw Error(`${stageId} overclaim`);
  }
  const receipt=row.time_receipt_contract||{};
  if(receipt.clock_uncertainty_seconds_must_be_positive_finite!==true)throw Error('uncertainty drift');
  if(receipt.unsupported_zero_uncertainty_qualifies!==false)throw Error('zero uncertainty admitted');
  if(receipt.current_time_substitution_qualifies!==false)throw Error('current time substitution admitted');
  if(row.clock_source_profile_rules?.authenticated_nts_ntp_clock?.plain_unauthenticated_ntp_qualifies!==false)throw Error('plain NTP admitted');
  if(row.clock_source_profile_rules?.dual_independent_authenticated_clocks?.same_authority_twice_qualifies!==false)throw Error('same authority admitted');
  if(row.monotonic_mapping_rules?.wall_clock_rollback_without_adjustment_receipt_qualifies!==false)throw Error('rollback admitted');
  if(row.uncertainty_interval_rules?.point_string_comparison_may_establish_order!==false)throw Error('point ordering admitted');
  if(row.uncertainty_interval_rules?.overlapping_intervals_may_be_promoted_to_ordered!==false)throw Error('overlap promoted');
  if(row.temporal_reconciliation_rules?.ambiguous_or_overlapping_order_remains_indeterminate!==true)throw Error('ambiguous order promoted');
  if(row.freshness_policy_rules?.indeterminate_freshness_qualifies!==false)throw Error('indeterminate freshness admitted');
  if(row.freshness_policy_rules?.expired_dns_answer_qualifies!==false)throw Error('expired DNS admitted');
  if(row.freshness_policy_rules?.stale_revocation_or_ct_evidence_qualifies!==false)throw Error('stale revocation admitted');
  if(!Array.isArray(row.observed_receipts)||row.observed_receipts.length!==0)throw Error('receipt injected');
  if(row.observed_state?.answer_change_authorized!==false)throw Error('answer overclaim');
  if(row.boundaries?.issue_345_may_close!==false)throw Error('closure overclaim');
  for(const [key,value] of Object.entries(row.guardrails||{}))if(value!==false)throw Error(`guardrail weakened ${key}`);
  const copy=clone(row);
  const declared=copy.observation_time_amendment_sha256;
  delete copy.observation_time_amendment_sha256;
  if(declared!=='5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9'||semanticHash(copy)!==declared)throw Error('semantic drift');
};

validateAmendmentOnly(amendment);
const mutationCases=[
  ['schema-drift',(row)=>{row.schema_version='broken@1'}],
  ['base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)}],
  ['connection-binding-substitution',(row)=>{row.bindings.connection_authentication_amendment.blob_sha='0'.repeat(40)}],
  ['predecessor-gap-erasure',(row)=>{row.predecessor_gap.clock_offset_and_uncertainty_required=true}],
  ['stage-deletion',(row)=>{delete row.effective_stage_observation_time_custody.distribution}],
  ['uncertainty-field-deletion',(row)=>{row.effective_stage_observation_time_custody.transaction.required_fields=row.effective_stage_observation_time_custody.transaction.required_fields.filter((key)=>key!=='clock_uncertainty_seconds')}],
  ['zero-uncertainty-admission',(row)=>{row.time_receipt_contract.unsupported_zero_uncertainty_qualifies=true}],
  ['plain-ntp-admission',(row)=>{row.clock_source_profile_rules.authenticated_nts_ntp_clock.plain_unauthenticated_ntp_qualifies=true}],
  ['same-authority-dual-clock',(row)=>{row.clock_source_profile_rules.dual_independent_authenticated_clocks.same_authority_twice_qualifies=true}],
  ['rollback-without-receipt',(row)=>{row.monotonic_mapping_rules.wall_clock_rollback_without_adjustment_receipt_qualifies=true}],
  ['point-order-shortcut',(row)=>{row.uncertainty_interval_rules.point_string_comparison_may_establish_order=true}],
  ['overlap-promotion',(row)=>{row.uncertainty_interval_rules.overlapping_intervals_may_be_promoted_to_ordered=true}],
  ['ambiguous-order-promotion',(row)=>{row.temporal_reconciliation_rules.ambiguous_or_overlapping_order_remains_indeterminate=false}],
  ['expired-dns-admission',(row)=>{row.freshness_policy_rules.expired_dns_answer_qualifies=true}],
  ['stale-revocation-admission',(row)=>{row.freshness_policy_rules.stale_revocation_or_ct_evidence_qualifies=true}],
  ['current-time-substitution',(row)=>{row.time_receipt_contract.current_time_substitution_qualifies=true}],
  ['unknown-leap-admission',(row)=>{row.time_receipt_contract.leap_second_state_unknown_qualifies=true}],
  ['receipt-injection',(row)=>{row.observed_receipts.push({stage:'transaction'})}],
  ['answer-overclaim',(row)=>{row.observed_state.answer_change_authorized=true}],
  ['guardrail-weakening',(row)=>{row.guardrails.local_wall_clock_is_trusted_time=true}],
  ['issue-closure',(row)=>{row.boundaries.issue_345_may_close=true}],
  ['checksum-rewrite',(row)=>{row.observation_time_amendment_sha256='0'.repeat(64)}],
  ['coordinated-content-checksum-rewrite',(row)=>{row.freshness_policy_rules.indeterminate_freshness_qualifies=true;const copy=clone(row);delete copy.observation_time_amendment_sha256;row.observation_time_amendment_sha256=semanticHash(copy)}]
];
for(const [label,mutate] of mutationCases){
  const changed=clone(amendment);
  mutate(changed);
  assert.throws(()=>validateAmendmentOnly(changed),undefined,label);
}

const predecessorsPresent=Object.values(predecessorPaths).every((target)=>fs.existsSync(target));
if(predecessorsPresent){
  const runValidator=(env={})=>spawnSync(process.execPath,[validator],{cwd:root,env:{...process.env,...env},encoding:'utf8'});
  const baseline=runValidator();
  assert.equal(baseline.status,0,baseline.stderr||baseline.stdout);
  assert.deepEqual(JSON.parse(baseline.stdout),{
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
  });
  let index=0;
  const write=(label,content,extension='json')=>{
    index+=1;
    const target=path.join(tempRoot,`${String(index).padStart(2,'0')}-${label}.${extension}`);
    fs.writeFileSync(target,content);
    return target;
  };
  const expectFailure=(label,envName,target)=>{
    const result=runValidator({[envName]:target});
    assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
  };
  const semanticEquivalent=`${JSON.stringify(amendment)}\n`;
  assert.deepEqual(JSON.parse(semanticEquivalent),amendment);
  expectFailure('semantic-equivalent-amendment-byte-rewrite','M05_INTEL_REALIZATION_OBSERVATION_TIME_CUSTODY_AMENDMENT_PATH',write('amendment-rewrite',semanticEquivalent));
  for(const [key,envName,extension] of [
    ['connection','M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_AMENDMENT_PATH','json'],
    ['connectionValidator','M05_INTEL_REALIZATION_CONNECTION_AUTHENTICATION_CUSTODY_VALIDATOR_PATH','mjs'],
    ['objectContract','M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_CONTRACT_PATH','json'],
    ['objectValidator','M05_INTEL_REALIZATION_PROVENANCE_OBJECT_CUSTODY_VALIDATOR_PATH','mjs'],
    ['registry','M05_INTEL_REALIZATION_STAGE_RECEIPT_REGISTRY_PATH','json']
  ]){
    const raw=fs.readFileSync(predecessorPaths[key]);
    expectFailure(`${key}-byte-rewrite`,envName,write(`${key}-rewrite`,Buffer.concat([raw,Buffer.from('\n')]),extension));
  }
}

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test: OK');
