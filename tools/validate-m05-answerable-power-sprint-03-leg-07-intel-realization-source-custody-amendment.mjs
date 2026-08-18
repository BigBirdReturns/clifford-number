#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  amendment:resolvePath(
    'M05_INTEL_REALIZATION_SOURCE_CUSTODY_AMENDMENT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-source-custody-amendment.json'
  ),
  contract:resolvePath(
    'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_CONTRACT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.json'
  ),
  predecessorValidator:resolvePath(
    'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_VALIDATOR_PATH',
    'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.mjs'
  )
};

const EXPECTED_AMENDMENT_BLOB_SHA='592a2056e9682e410938f5007b27396b85424b5b';
const EXPECTED_AMENDMENT_SHA256='50083404a4380378faa0e3bf01368b8dcf5b88992a12c368ab1ad1caf9f88adc';
const EXPECTED_CONTRACT_BLOB_SHA='4d59d3e93af806e97fde862daadf7194d3498790';
const EXPECTED_CONTRACT_SHA256='3924a4bfd18e98cacbd4b551e2ec4816de57bfa6eb5afb39089980081f2ab6c6';
const EXPECTED_PREDECESSOR_VALIDATOR_BLOB_SHA='f61d464feec46fbd32ec6152ec83205ab2ee9b08';

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
const containsAll=(values,required)=>Array.isArray(values)&&required.every((value)=>values.includes(value));

const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,readRaw(target)]));
if(gitBlobSha(raw.amendment)!==EXPECTED_AMENDMENT_BLOB_SHA)fail('source-custody amendment Git object drift');
if(gitBlobSha(raw.contract)!==EXPECTED_CONTRACT_BLOB_SHA)fail('accounting admission contract Git object drift');
if(gitBlobSha(raw.predecessorValidator)!==EXPECTED_PREDECESSOR_VALIDATOR_BLOB_SHA)fail('predecessor accounting validator Git object drift');

const amendment=JSON.parse(raw.amendment.toString('utf8'));
const contract=JSON.parse(raw.contract.toString('utf8'));
const predecessorValidatorText=raw.predecessorValidator.toString('utf8');
const amendmentSnapshot=JSON.stringify(amendment);
const contractSnapshot=JSON.stringify(contract);

if(amendment.schema_version!=='m05-answerable-power-s03-l7-intel-realization-source-custody-amendment@1')fail('amendment schema drift');
if(amendment.object_class!=='bounded_admission_source_custody_amendment')fail('amendment object class drift');
if(amendment.program_id!=='M-05'||amendment.sprint_id!=='M05-SPRINT-03'||amendment.leg_id!=='S03-L7')fail('amendment program binding drift');
if(amendment.issue!==345||amendment.as_of!=='2026-08-18'||amendment.status!=='intel_realization_source_custody_amendment_frozen')fail('amendment identity drift');

const expectedBase={
  branch:'main',
  sha:'a63235f8642ae0e878cc36210779d8c1f8cf9233',
  tree_sha:'f5a72b563abb772086480c7aae936018aba3861d',
  preceding_pull_request:2181,
  preceding_merge_commit:'a63235f8642ae0e878cc36210779d8c1f8cf9233'
};
if(!same(amendment.canonical_base,expectedBase))fail('amendment canonical base drift');

const expectedBindings={
  realization_accounting_admission_contract:{
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.json',
    blob_sha:EXPECTED_CONTRACT_BLOB_SHA,
    semantic_sha256:EXPECTED_CONTRACT_SHA256,
    schema_version:'m05-answerable-power-s03-l7-intel-realization-accounting-admission-contract@1',
    pull_request:2180,
    merge_commit:'fc6303e1791904e6ad999f63b49030c083e1a94e'
  },
  realization_accounting_contract_validator:{
    path:'tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.mjs',
    blob_sha:EXPECTED_PREDECESSOR_VALIDATOR_BLOB_SHA,
    control_class:'independent_contract_git_blob_and_semantic_checksum_validator',
    pull_request:2181,
    merge_commit:'a63235f8642ae0e878cc36210779d8c1f8cf9233'
  }
};
if(!same(amendment.bindings,expectedBindings))fail('amendment predecessor binding drift');

if(contract.schema_version!=='m05-answerable-power-s03-l7-intel-realization-accounting-admission-contract@1')fail('predecessor contract schema drift');
if(contract.status!=='intel_realization_accounting_admission_contract_frozen')fail('predecessor contract status drift');
const contractCopy=clone(contract);
const declaredContractHash=contractCopy.contract_sha256;
delete contractCopy.contract_sha256;
if(declaredContractHash!==EXPECTED_CONTRACT_SHA256)fail('predecessor contract declared checksum drift');
if(semanticHash(contractCopy)!==EXPECTED_CONTRACT_SHA256)fail('predecessor contract semantic checksum drift');
for(const token of [EXPECTED_CONTRACT_BLOB_SHA,EXPECTED_CONTRACT_SHA256,'contract Git object drift']){
  if(!predecessorValidatorText.includes(token))fail(`predecessor validator control drift: ${token}`);
}

const stages=contract.admission_stages||{};
if(!containsAll(stages.transaction?.required_fields,['source_url','source_locator','source_body_sha256']))fail('transaction predecessor source custody drift');
for(const stageId of ['federal_cash_custody','public_account_booking','distribution']){
  if(!containsAll(stages[stageId]?.required_fields,['source_url','source_locator']))fail(`${stageId} predecessor source addressing drift`);
  if(stages[stageId].required_fields.includes('source_body_sha256'))fail(`${stageId} predecessor gap unexpectedly changed`);
}

const expectedGap={
  gap_class:'downstream_source_custody_asymmetry',
  transaction_already_requires_source_body_sha256:true,
  federal_cash_custody_requires_source_body_sha256:false,
  public_account_booking_requires_source_body_sha256:false,
  distribution_requires_source_body_sha256:false,
  source_url_and_locator_are_exact_body_custody:false
};
if(!same(amendment.predecessor_gap,expectedGap))fail('predecessor gap classification drift');

const commonFields=[
  'source_record_identifier',
  'source_observed_at_utc',
  'source_content_type',
  'source_custody_mode',
  'source_custody_locator'
];
const downstreamFields=[
  'source_record_identifier',
  'source_observed_at_utc',
  'source_content_type',
  'source_body_sha256',
  'source_custody_mode',
  'source_custody_locator'
];
const expectedStageFields={
  transaction:commonFields,
  federal_cash_custody:downstreamFields,
  public_account_booking:downstreamFields,
  distribution:downstreamFields
};
for(const stageId of ['transaction','federal_cash_custody','public_account_booking','distribution']){
  const stage=amendment.effective_stage_source_custody?.[stageId];
  if(!stage)fail(`missing amended stage ${stageId}`);
  if(stage.requires_contract_stage!==stageId)fail(`${stageId} contract-stage binding drift`);
  if(stage.source_body_sha256_inherited_from_predecessor!==(stageId==='transaction'))fail(`${stageId} source-body inheritance drift`);
  if(!same(stage.additional_required_fields,expectedStageFields[stageId]))fail(`${stageId} custody field drift`);
  if(stage.all_source_receipts_must_be_exact_body_addressed!==true)fail(`${stageId} exact-body requirement weakened`);
  if(stage.source_url_and_locator_only_qualifies!==false)fail(`${stageId} URL-only qualification enabled`);
  if(stage.unhashed_or_unarchived_source_qualifies!==false)fail(`${stageId} unhashed or unarchived source enabled`);
}

const expectedRules={
  hash_algorithm:'sha256',
  hash_encoding:'lowercase_hex',
  hash_length:64,
  hash_scope:'exact_source_body_bytes',
  allowed_custody_modes:[
    'source_native_immutable_record',
    'official_archive',
    'repository_blob',
    'dual_source_and_repository_custody'
  ],
  source_record_identifier_required:true,
  retrieval_timestamp_required:true,
  content_type_required:true,
  custody_locator_required:true,
  locator_must_resolve_within_hashed_body:true,
  multiple_source_bodies_each_require_independent_hash:true,
  mutable_live_url_without_hashed_body_is_admissible:false,
  source_excerpt_without_parent_body_hash_is_admissible:false,
  self_declared_hash_without_retrievable_or_repository_custody_is_admissible:false
};
if(!same(amendment.custody_rules,expectedRules))fail('source custody rules drift');

if(!Array.isArray(amendment.observed_receipts)||amendment.observed_receipts.length!==0)fail('unadjudicated source receipt injected');
const expectedObserved={
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  answer_change_authorized:false
};
if(!same(amendment.observed_state,expectedObserved))fail('amendment observed state drift');

for(const [key,value] of Object.entries(amendment.guardrails||{})){
  if(value!==false)fail(`source custody guardrail weakened: ${key}`);
}
const expectedResult={
  amended_stages:4,
  stages_requiring_exact_body_hash:4,
  downstream_stages_newly_requiring_source_body_sha256:3,
  observed_receipts:0,
  transaction_admissible:false,
  federal_cash_custody_admissible:false,
  public_account_booking_admissible:false,
  distribution_admissible:false,
  candidate_evidence_records:5,
  repository_promotions:5,
  advanced_answer_dimensions:1,
  effective_answers:0,
  qualifying_jurisdictions:0,
  answer_effectiveness:false,
  cross_domain_regression_completed:false,
  graph_effect:'none',
  issue_345_may_close:false
};
if(!same(amendment.expected_result,expectedResult))fail('amendment expected result drift');
for(const [key,value] of Object.entries(amendment.boundaries||{})){
  if(key==='graph_effect'){
    if(value!=='none')fail('amendment graph boundary drift');
  }else if(value!==false){
    fail(`unsafe amendment boundary: ${key}`);
  }
}

const amendmentCopy=clone(amendment);
const declaredAmendmentHash=amendmentCopy.amendment_sha256;
delete amendmentCopy.amendment_sha256;
if(declaredAmendmentHash!==EXPECTED_AMENDMENT_SHA256)fail('amendment declared checksum drift');
if(semanticHash(amendmentCopy)!==EXPECTED_AMENDMENT_SHA256)fail('amendment semantic checksum drift');

if(JSON.stringify(amendment)!==amendmentSnapshot)fail('validator mutated amendment');
if(JSON.stringify(contract)!==contractSnapshot)fail('validator mutated predecessor contract');

console.log(JSON.stringify({
  validator:'m05-intel-realization-source-custody-amendment',
  amended_stages:amendment.expected_result.amended_stages,
  stages_requiring_exact_body_hash:amendment.expected_result.stages_requiring_exact_body_hash,
  downstream_stages_newly_requiring_source_body_sha256:amendment.expected_result.downstream_stages_newly_requiring_source_body_sha256,
  observed_receipts:amendment.expected_result.observed_receipts,
  transaction_admissible:amendment.expected_result.transaction_admissible,
  federal_cash_custody_admissible:amendment.expected_result.federal_cash_custody_admissible,
  public_account_booking_admissible:amendment.expected_result.public_account_booking_admissible,
  distribution_admissible:amendment.expected_result.distribution_admissible,
  issue_345_may_close:amendment.expected_result.issue_345_may_close
},null,2));
