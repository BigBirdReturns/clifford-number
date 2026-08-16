#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  ANSWER_DIMENSIONS,
  ANSWER_SUFFICIENCY_GUARDS,
  EVIDENCE_BOOLEAN_GATES,
  EVIDENCE_SUFFICIENCY_GUARDS,
  evaluateObservation,
  evaluateRegression
} from './lib/m05-source-health-evidence-state-regression.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.isAbsolute(rel)?rel:path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const contract=read('data/project/m05-source-health-evidence-state-regression.json');
const audit=read(process.env.M05_REAL_RECEIPT_AUDIT_PATH||'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json');

if(contract.schema_version!=='m05-source-health-evidence-state-regression@1')fail('regression schema drift');
if(contract.object_class!=='bounded_cross_domain_evidence_state_regression')fail('object class drift');
if(contract.program_id!=='M-05'||contract.hydrology_program_id!=='M-04G'||contract.source_leg_id!=='S03-L7')fail('program binding drift');
if(contract.status!=='candidate_regression_contract')fail('status drift');
if(contract.canonical_base.sha!=='50a8590c1714ea8923a0b12a27ab8c14f40fbb81')fail('canonical base drift');
if(contract.canonical_base.merged_candidate_sha!=='f85e9dd684d5ead1c2ec643225947e9fe579de3c')fail('merged candidate drift');

const receipt=contract.source_health_receipt;
if(receipt.qualification_run!==31964583533)fail('qualification run drift');
if(receipt.artifact_sha256!=='5c4b0dd5f7cbb64bc4522851064f051d089c4a0494d877f8cbeb0abaa7b1f33e')fail('artifact digest drift');
if(receipt.candidate_receipt_sha256!=='e54605c2e7f9d3b2d9113e38a39eb6d50b6afc09a8443741056ba44d9a8dca33')fail('candidate receipt drift');
if(receipt.common_crawl_body_sha256!=='eac053eb9d810c1ca519c99e7fdcf3c24a8042809becbbf6c6854a5795c1d52a'||receipt.common_crawl_bytes!==34675)fail('Common Crawl receipt drift');
if(receipt.selected_official_fallbacks!==8)fail('official fallback count drift');
if(!same(receipt.changed_paths,[
  'data/project/m04g-source-ecology-v2-policy.json',
  'test/m05-answerable-power-sprint-03-leg-07.test.js',
  'tools/lib/m04g-source-ecology-v2.mjs'
]))fail('qualified three-file boundary drift');
if(!same(receipt.observed,{
  selected_routes:96,
  route_successes:76,
  content_successes:76,
  healthy_basins:12,
  unclassified_failures:0,
  route_healthy:true,
  content_healthy:true,
  coverage_healthy:true,
  evidentiary_sufficiency:false,
  answer_effectiveness:false
}))fail('qualified orbit observation drift');

const frozen=contract.frozen_transport_contract;
if(frozen.selected_routes!==96||frozen.basins!==12||frozen.routes_per_basin!==8)fail('frozen denominator drift');
if(frozen.minimum_route_success_rate!==0.75||frozen.minimum_content_success_rate!==0.65||frozen.required_healthy_basins!==12||frozen.maximum_unclassified_failures!==0)fail('frozen threshold drift');
if(frozen.route_identifiers_preserved!==true||frozen.basin_assignments_preserved!==true||frozen.failure_taxonomy_preserved!==true)fail('transport identity boundary weakened');
if(frozen.direct_voice_bulk_polling_allowed!==false||frozen.locator_only_receipts_may_promote_to_claim_evidence!==false)fail('access or promotion boundary weakened');

const evidenceContract=contract.evidence_admission_contract;
if(!same(evidenceContract.allowed_source_classes,[
  'official_primary_record',
  'official_adjudicative_record',
  'source_native_primary_record'
]))fail('evidence source-class contract drift');
if(!same(evidenceContract.required_boolean_gates,EVIDENCE_BOOLEAN_GATES))fail('evidence boolean-gate contract drift');
if(evidenceContract.required_promotion_ceiling!=='claim_evidence')fail('evidence promotion ceiling drift');
for(const guard of EVIDENCE_SUFFICIENCY_GUARDS){
  if(evidenceContract[guard]!==false)fail(`evidence sufficiency guard ${guard} weakened`);
}

const answerContract=contract.answer_effectiveness_contract;
if(answerContract.minimum_observed_domains!==3||answerContract.minimum_observed_jurisdictions!==2)fail('answer denominator drift');
if(!same(answerContract.required_dimensions,ANSWER_DIMENSIONS))fail('answer dimension contract drift');
if(answerContract.observed_outcome_required!==true||answerContract.composed_durable_answer_required!==true)fail('answer outcome or composition gate weakened');
for(const guard of ANSWER_SUFFICIENCY_GUARDS){
  if(answerContract[guard]!==false)fail(`answer sufficiency guard ${guard} weakened`);
}

const domainIds=contract.domain_observations.map((row)=>row.domain_id);
if(!same(domainIds,['APC-ADMIN-01','APC-COERCION-01','APC-WORK-01','APC-EXIT-01','APC-VALUE-01']))fail('cross-domain denominator drift');
if(new Set(domainIds).size!==5)fail('duplicate domain identifiers');
if(contract.controls.length!==4)fail('control count drift');

for(const row of [...contract.domain_observations,...contract.controls]){
  const evaluated=evaluateObservation(row,contract);
  if(evaluated.claim_evidence_admissible!==row.expected.claim_evidence_admissible)fail(`${evaluated.id} evidence expectation drift`);
  if(evaluated.answer_effective!==row.expected.answer_effective)fail(`${evaluated.id} answer expectation drift`);
  if(evaluated.repository_promotion_allowed!==false)fail(`${evaluated.id} escaped candidate-only boundary`);
}

const locator=contract.controls.find((row)=>row.control_id==='NC-LOCATOR-ONLY');
const repository=contract.controls.find((row)=>row.control_id==='NC-REPOSITORY-CONTENT');
const evidencePositive=contract.controls.find((row)=>row.control_id==='PC-CLAIM-BOUND-PRIMARY');
const answerPositive=contract.controls.find((row)=>row.control_id==='PC-OBSERVED-DURABLE-ANSWER');
if(!locator||!repository||!evidencePositive||!answerPositive)fail('required control missing');
if(evaluateObservation(locator,contract).claim_evidence_admissible)fail('locator-only negative control promoted');
if(evaluateObservation(repository,contract).claim_evidence_admissible)fail('repository-content negative control promoted');
if(!evaluateObservation(evidencePositive,contract).claim_evidence_admissible||evaluateObservation(evidencePositive,contract).answer_effective)fail('claim-evidence positive control lost discrimination');
if(!evaluateObservation(answerPositive,contract).claim_evidence_admissible||!evaluateObservation(answerPositive,contract).answer_effective)fail('answer positive control lost discrimination');

const result=evaluateRegression(contract);
for(const [key,value] of Object.entries(contract.expected_repository_state)){
  if(result[key]!==value)fail(`repository state ${key} drift`);
}
for(const [key,value] of Object.entries(contract.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`boundary ${key} must remain false`);
}
if(contract.boundaries.promotes_to!=='candidate_only'||contract.boundaries.graph_effect!=='none')fail('promotion boundary drift');

const expectedAuditBindings={
  'APC-ADMIN-01':{
    leg_id:'S03-L2',issue:340,pull_request:348,merge_commit:'34a6fbb9e93ed869907d038e47261e9d1e14ca65',
    pilot_ceiling:'R4_bounded_administrative_control',
    project_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-02-administrative-benefits.json',blob_sha:'3eff4c1adf9269ee552797b046718e371a56c2d2'},
    report_binding:{path:'reports/core-thesis/answerable-power/sprint-03-leg-02.json',blob_sha:'45af1cba753b1a4f48e5ad205a0085436a4d324d',fingerprint:'cd33225ff94dbfc56cc75e2de86ba4b4601401a71f20cfdacc5e73eba2f2c737'}
  },
  'APC-COERCION-01':{
    leg_id:'S03-L3',issue:341,pull_request:349,merge_commit:'697bf8f5a31742638daa6c110e4069d84132d407',
    pilot_ceiling:'R4_bounded_person_and_system_control',
    project_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-03-surveillance-enforcement.json',blob_sha:'d9ff5559b8c3bdcc876ab48dc61ca757b0122ef9'},
    report_binding:{path:'reports/core-thesis/answerable-power/sprint-03-leg-03.json',blob_sha:'7e07000d7adab233195066e24034033b64423fd5',fingerprint:'03acd073c89fabb98c2616f574a101b5d613efa10435e974894cec5fefac9db3'}
  },
  'APC-WORK-01':{
    leg_id:'S03-L4',issue:342,pull_request:350,merge_commit:'ad9f5c31da06d47e7ce4bc6d1105720f39e6598d',
    pilot_ceiling:'R6_bounded_collective_co_governance_control',
    project_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-04-workplace-co-governance.json',blob_sha:'986a50d42d61e1942d89c90e65c36d08bab2b058'},
    report_binding:{path:'reports/core-thesis/answerable-power/sprint-03-leg-04.json',blob_sha:'5b2106d1c4fd152a4263f8e7ab81b13c4a61e064',fingerprint:'bc2b1a5fb5b60ab12eae8b34848bedda343909568f406ae3891f8a00e20bcf25'}
  },
  'APC-EXIT-01':{
    leg_id:'S03-L5',issue:343,pull_request:351,merge_commit:'60aa6cbd4b7096903ce68e8fea9830098d3dd6a1',
    pilot_ceiling:'R5_bounded_public_substitution_control',
    project_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-05-public-platform-exit.json',blob_sha:'e0002da8f65c46acd00a84251a6d141487daf8b8'},
    report_binding:{path:'reports/core-thesis/answerable-power/sprint-03-leg-05.json',blob_sha:'79641e8393b04bbe00f6fed12458c91d1eb14a29',fingerprint:'47b225e03c49a4b7f66312540ec1bf882d8aff54da73c05e613f643d68c8495b'}
  },
  'APC-VALUE-01':{
    leg_id:'S03-L6',issue:344,pull_request:353,merge_commit:'960c51d11b3210d2b1083fce6a49c5ad5fc6ca86',
    pilot_ceiling:'R7_architecture_transfer_candidate_with_TARP_control',
    project_binding:{path:'data/project/m05-answerable-power-sprint-03-leg-06-value-recovery-transfer.json',blob_sha:'4cbe648c7d5b03e020e7f87aff7b9f4f3f11a076'},
    report_binding:{path:'reports/core-thesis/answerable-power/sprint-03-leg-06.json',blob_sha:'83d1d62c9ad9c20cada0614bf4e838990999d73d',fingerprint:'1ccba692fe3bc0d748fd4a46d933f72a58c9d75a6d52e2481545455b909f470c'}
  }
};

if(audit.schema_version!=='m05-answerable-power-s03-l7-real-receipt-admission-audit@1')fail('audit schema drift');
if(audit.object_class!=='bounded_real_receipt_admission_audit')fail('audit object class drift');
if(audit.program_id!=='M-05'||audit.hydrology_program_id!=='M-04G'||audit.sprint_id!=='M05-SPRINT-03'||audit.leg_id!=='S03-L7'||audit.issue!==345)fail('audit program binding drift');
if(audit.status!=='real_receipt_admission_audit_frozen')fail('audit status drift');
if(!same(audit.canonical_base,{
  branch:'main',
  sha:'cb528c25deef376995123e1c6a35455568b90ec3',
  source_health_regression_pull_request:2150,
  source_health_regression_candidate_sha:'074233c8890d6b4b18a613aa4905eedf1def1218',
  source_health_regression_merge_sha:'cb528c25deef376995123e1c6a35455568b90ec3'
}))fail('audit canonical base drift');

const admissionBinding=audit.admission_contract_binding;
if(admissionBinding.path!=='data/project/m05-source-health-evidence-state-regression.json'||admissionBinding.schema_version!==contract.schema_version)fail('audit admission contract binding drift');
if(admissionBinding.evaluator!=='tools/lib/m05-source-health-evidence-state-regression.mjs'||admissionBinding.validator!=='tools/validate-m05-source-health-evidence-state-regression.mjs')fail('audit evaluator or validator binding drift');
if(admissionBinding.minimum_domains!==answerContract.minimum_observed_domains||admissionBinding.minimum_jurisdictions!==answerContract.minimum_observed_jurisdictions)fail('audit answer denominator drift');
if(admissionBinding.source_health_can_promote_claim_evidence!==false||admissionBinding.control_evidence_can_transfer_to_target_domain!==false)fail('audit admission boundary weakened');

const auditDomainIds=audit.domain_audits.map((row)=>row.domain_id);
if(!same(auditDomainIds,domainIds)||new Set(auditDomainIds).size!==5)fail('audit domain denominator drift');
if(new Set(audit.domain_audits.map((row)=>row.issue)).size!==5||new Set(audit.domain_audits.map((row)=>row.pull_request)).size!==5)fail('audit issue or pull-request identity drift');
const requiredRealReceiptFields=[
  'subject_identity',
  'decision_system',
  'decision_time',
  'consequence_predicate',
  'source_addressed_primary_record',
  'independent_authority',
  'observed_outcome',
  'remedy',
  'durability',
  'practical_exit_or_governance'
];
if(!same(audit.required_real_receipt_fields,requiredRealReceiptFields))fail('audit real-receipt field contract drift');
for(const field of requiredRealReceiptFields){
  if(typeof audit.real_receipt_field_meanings?.[field]!=='string'||audit.real_receipt_field_meanings[field].trim().length<16)fail(`audit real-receipt meaning ${field} incomplete`);
}
if(!same(Object.keys(audit.real_receipt_field_meanings),requiredRealReceiptFields))fail('audit real-receipt meaning field drift');
const falseAuditStateFields=[
  'claim_evidence_admissible',
  'answer_effective',
  'jurisdiction_contributes_to_answer',
  'pilot_promoted',
  'control_transfer_allowed'
];

for(const row of audit.domain_audits){
  const expected=expectedAuditBindings[row.domain_id];
  if(!expected)fail(`${row.domain_id} unexpected audit domain`);
  if(row.leg_id!==expected.leg_id||row.issue!==expected.issue||row.pull_request!==expected.pull_request||row.merge_commit!==expected.merge_commit)fail(`${row.domain_id} pilot identity drift`);
  if(!same(row.project_binding,expected.project_binding))fail(`${row.domain_id} project binding drift`);
  if(row.report_binding.path!==expected.report_binding.path||row.report_binding.blob_sha!==expected.report_binding.blob_sha)fail(`${row.domain_id} report binding drift`);
  if(row.report_binding.fingerprint!==expected.report_binding.fingerprint)fail(`${row.domain_id} report fingerprint drift`);
  if(row.pilot_ceiling!==expected.pilot_ceiling)fail(`${row.domain_id} pilot ceiling drift`);
  if(!Array.isArray(row.support_surfaces)||row.support_surfaces.length<3||new Set(row.support_surfaces).size!==row.support_surfaces.length)fail(`${row.domain_id} support surface ledger incomplete`);
  if(!Array.isArray(row.observed_controls)||row.observed_controls.length<1)fail(`${row.domain_id} observed control ledger missing`);
  if(!Array.isArray(row.missing_evidence_receipts)||row.missing_evidence_receipts.length<1)fail(`${row.domain_id} missing evidence receipt ledger`);
  if(!Array.isArray(row.missing_answer_dimensions)||row.missing_answer_dimensions.length<1)fail(`${row.domain_id} missing answer dimension ledger`);
  if(!Array.isArray(row.next_receipt_focus)||row.next_receipt_focus.length<3||new Set(row.next_receipt_focus).size!==row.next_receipt_focus.length)fail(`${row.domain_id} next receipt focus incomplete`);
  if(row.next_receipt_focus.some((value)=>typeof value!=='string'||value.trim().length<16))fail(`${row.domain_id} next receipt focus entry incomplete`);
  for(const field of falseAuditStateFields){
    if(row.current_state?.[field]!==false)fail(`${row.domain_id} audit state ${field} must remain false`);
  }
  if(row.source_observation_id!==row.domain_id)fail(`${row.domain_id} source observation binding drift`);
  const observation=contract.domain_observations.find((candidate)=>candidate.domain_id===row.source_observation_id);
  if(!observation||observation.fixture_only!==false||observation.promotes_to!=='none')fail(`${row.domain_id} audit observation identity or promotion drift`);
  const evaluated=evaluateObservation(observation,contract);
  if(evaluated.claim_evidence_admissible!==false||evaluated.answer_effective!==false||evaluated.repository_promotion_allowed!==false)fail(`${row.domain_id} canonical pilot escaped the real-receipt gate`);
  if(observation.expected?.claim_evidence_admissible!==false||observation.expected?.answer_effective!==false)fail(`${row.domain_id} audit observation expectation drift`);
}

if(audit.synthetic_complete_receipt_control_id!=='PC-OBSERVED-DURABLE-ANSWER')fail('synthetic complete receipt control identity drift');
const syntheticControl=contract.controls.find((row)=>row.control_id===audit.synthetic_complete_receipt_control_id);
if(!syntheticControl)fail('synthetic complete receipt control missing');
const synthetic=evaluateObservation(syntheticControl,contract);
if(syntheticControl.fixture_only!==true||syntheticControl.promotes_to!=='none')fail('synthetic complete receipt control identity drift');
if(synthetic.claim_evidence_admissible!==true||synthetic.answer_effective!==true||synthetic.repository_promotion_allowed!==false)fail('synthetic complete receipt control lost discrimination');
if(syntheticControl.expected?.claim_evidence_admissible!==true||syntheticControl.expected?.answer_effective!==true)fail('synthetic complete receipt expectation drift');

const auditObservations=audit.domain_audits.map((row)=>contract.domain_observations.find((candidate)=>candidate.domain_id===row.source_observation_id));
const auditContract={...contract,domain_observations:auditObservations};
const auditResult=evaluateRegression(auditContract);
const qualifyingJurisdictions=new Set(audit.domain_audits
  .filter((row)=>row.current_state.answer_effective===true&&row.current_state.jurisdiction_contributes_to_answer===true)
  .map((row)=>contract.domain_observations.find((candidate)=>candidate.domain_id===row.source_observation_id)?.jurisdiction)
  .filter((value)=>value&&value!=='unassigned')).size;
const expectedAuditResult={
  audited_domains:auditResult.domain_observations_evaluated,
  claim_admissible_domains:auditResult.admissible_domain_evidence_records,
  answer_effective_domains:auditResult.effective_domain_answers,
  qualifying_jurisdictions:qualifyingJurisdictions,
  cross_domain_regression_completed:auditResult.cross_domain_regression_completed,
  evidentiary_sufficiency:auditResult.evidentiary_sufficiency,
  answer_effectiveness:auditResult.answer_effectiveness,
  issue_345_may_close:false
};
for(const [key,value] of Object.entries(expectedAuditResult)){
  if(audit.current_result?.[key]!==value)fail(`audit current result ${key} drift`);
}
if(!same(Object.keys(audit.current_result),Object.keys(expectedAuditResult)))fail('audit current result field drift');

for(const [key,value] of Object.entries(audit.boundaries)){
  if(['promotes_to','graph_effect'].includes(key))continue;
  if(typeof value==='boolean'&&value!==false)fail(`audit boundary ${key} must remain false`);
}
if(audit.boundaries.promotes_to!=='candidate_only'||audit.boundaries.graph_effect!=='none')fail('audit promotion boundary drift');

console.log('validate-m05-source-health-evidence-state-regression: OK (5 source-health observations and 5 canonical pilot bindings remain below claim admission; the synthetic complete receipt remains discriminating; issue #345 remains open)');
