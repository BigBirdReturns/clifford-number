#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(name,fallback)=>path.resolve(root,process.env[name]||fallback);
const paths={
  amendment:resolvePath('M05_INTEL_TEMPORAL_RECONCILIATION_ADMISSION_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-temporal-reconciliation-admission-amendment.json'),
  predecessorContract:resolvePath('M05_INTEL_OBSERVATION_TIME_CUSTODY_AMENDMENT_PATH','data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.json'),
  predecessorValidator:resolvePath('M05_INTEL_OBSERVATION_TIME_CUSTODY_VALIDATOR_PATH','tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.mjs'),
  predecessorTest:resolvePath('M05_INTEL_OBSERVATION_TIME_CUSTODY_TEST_PATH','test/m05-answerable-power-sprint-03-leg-07-intel-realization-observation-time-custody-amendment.test.js'),
  predecessorWorkflow:resolvePath('M05_INTEL_OBSERVATION_TIME_CUSTODY_WORKFLOW_PATH','.github/workflows/m05-intel-realization-observation-time-custody-amendment.yml')
};
const EXPECTED={
  amendmentBlob:'6ea434ab5101e6a0ce0fc1f924eccc5d5225bbf7',amendmentSemantic:'5a0830c77da3b443a8aff7a121fde3b051fc526a72fa5d48f14870a3d4a145c8',
  predecessorContractBlob:'817f2b571c5f5feb755c6ac97226567630de5c38',
  predecessorContractSemantic:'5a334376ca80ce4171f127bc7b357a179cdb824b92a411685b1c55df91a423e9',
  predecessorValidatorBlob:'e5c2afe704f1589816c6c242ba096430aac38d91',
  predecessorTestBlob:'e04c076b0a764b77053db504b94606f3ced44c98',
  predecessorWorkflowBlob:'d77e5a1a6a0bc2b22801d15850da5de177795641'
};
const raw=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,fs.readFileSync(target)]));
const gitBlob=(buffer)=>crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(message)=>{throw new Error(message)};
const requireTrue=(value,message)=>{if(value!==true)fail(message)};
const requireFalse=(value,message)=>{if(value!==false)fail(message)};
for(const [key,expected] of [
  ['amendment',EXPECTED.amendmentBlob],['predecessorContract',EXPECTED.predecessorContractBlob],
  ['predecessorValidator',EXPECTED.predecessorValidatorBlob],['predecessorTest',EXPECTED.predecessorTestBlob],
  ['predecessorWorkflow',EXPECTED.predecessorWorkflowBlob]
])if(gitBlob(raw[key])!==expected)fail(`${key} Git object drift`);
const amendment=JSON.parse(raw.amendment);
const predecessor=JSON.parse(raw.predecessorContract);
const copy=JSON.parse(JSON.stringify(amendment));
const declared=copy.temporal_reconciliation_admission_amendment_sha256;
delete copy.temporal_reconciliation_admission_amendment_sha256;
if(declared!==EXPECTED.amendmentSemantic||semanticHash(copy)!==EXPECTED.amendmentSemantic)fail('successor semantic checksum drift');
const predecessorCopy=JSON.parse(JSON.stringify(predecessor));
const predecessorDeclared=predecessorCopy.observation_time_amendment_sha256;
delete predecessorCopy.observation_time_amendment_sha256;
if(predecessorDeclared!==EXPECTED.predecessorContractSemantic||semanticHash(predecessorCopy)!==EXPECTED.predecessorContractSemantic)fail('predecessor semantic checksum drift');
if(amendment.schema_version!=='m05-answerable-power-s03-l7-intel-realization-temporal-reconciliation-admission-amendment@1'||amendment.status!=='intel_realization_temporal_reconciliation_admission_amendment_frozen')fail('successor identity drift');
if(amendment.predecessor?.head_commit!=='f97e8ee7e5c9cbba5d0d45ab79e0e6cc003d5f5e'||amendment.predecessor?.pull_request!==2200)fail('predecessor transaction drift');
if(amendment.predecessor?.contract?.blob_sha!==EXPECTED.predecessorContractBlob||amendment.predecessor?.contract?.semantic_sha256!==EXPECTED.predecessorContractSemantic)fail('predecessor contract binding drift');
if(amendment.predecessor?.validator?.blob_sha!==EXPECTED.predecessorValidatorBlob||amendment.predecessor?.adversarial_test?.blob_sha!==EXPECTED.predecessorTestBlob||amendment.predecessor?.focused_workflow?.blob_sha!==EXPECTED.predecessorWorkflowBlob)fail('predecessor control binding drift');
const stages=['transaction','federal_cash_custody','public_account_booking','distribution'];
if(JSON.stringify(amendment.stage_order)!==JSON.stringify(stages))fail('stage order drift');
for(const stage of stages){
  const row=amendment.effective_stage_temporal_reconciliation?.[stage];
  if(!row||row.requires_observation_time_stage!==stage||row.required_field!=='temporal_order_reconciliation')fail(`${stage} reconciliation binding drift`);
  if(JSON.stringify(row.allowed_results)!==JSON.stringify(['pass','fail','indeterminate']))fail(`${stage} result denominator drift`);
  requireTrue(row.temporal_reconciliation_result_must_be_pass,`${stage} pass requirement weakened`);
  for(const key of ['failed_result_qualifies','indeterminate_result_qualifies','omitted_result_qualifies','definite_contradiction_qualifies'])requireFalse(row[key],`${stage} ${key} weakened`);
}
for(const key of ['predecessor_contract_bytes_remain_frozen','predecessor_validator_bytes_remain_frozen','predecessor_test_bytes_remain_frozen','predecessor_workflow_bytes_remain_frozen','successor_rule_controls_stage_admission','temporal_reconciliation_field_must_resolve_to_named_result','one_result_may_not_stand_for_distinct_stage_reconciliations'])requireTrue(amendment.cross_object_rules?.[key],`${key} weakened`);
requireFalse(amendment.cross_object_rules?.temporal_reconciliation_admission_is_empirical_stage_receipt,'successor promoted to empirical receipt');
if(!Array.isArray(amendment.observed_receipts)||amendment.observed_receipts.length!==0)fail('unadjudicated reconciliation receipt injected');
const state=amendment.observed_state||{};
if(state.registered_temporal_reconciliations!==0||state.passing_temporal_reconciliations!==0)fail('reconciliation denominator inflation');
for(const key of ['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_change_authorized'])requireFalse(state[key],`${key} overclaim`);
for(const [key,value] of Object.entries(amendment.guardrails||{}))requireFalse(value,`guardrail weakened: ${key}`);
for(const [key,value] of Object.entries(amendment.boundaries||{})){if(key==='graph_effect'){if(value!=='none')fail('graph boundary drift')}else requireFalse(value,`unsafe boundary: ${key}`)}
const result=amendment.expected_result||{};
if(result.amended_stages!==4||result.stages_requiring_passing_temporal_reconciliation!==4||result.registered_temporal_reconciliations!==0||result.passing_temporal_reconciliations!==0||result.graph_effect!=='none')fail('expected-result denominator drift');
for(const key of ['transaction_admissible','federal_cash_custody_admissible','public_account_booking_admissible','distribution_admissible','answer_effectiveness','cross_domain_regression_completed','issue_345_may_close'])requireFalse(result[key],`${key} result overclaim`);
console.log(JSON.stringify({validator:'m05-intel-temporal-reconciliation-admission-amendment',amended_stages:4,stages_requiring_pass:4,registered_temporal_reconciliations:0,passing_temporal_reconciliations:0,issue_345_may_close:false},null,2));
