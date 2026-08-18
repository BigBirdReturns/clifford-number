#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  HFU_ASSURANCE_FRONTIER_ID,
  summarizeHfuAssuranceCustodyAcquisition
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  hfuCandidate:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'),
  foodinhoAcquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-hfu-assurance-custody-acquisition-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeHfuAssuranceCustodyAcquisition(data);
assert.equal(summary.source_records,6);
assert.equal(summary.new_source_records,4);
assert.equal(summary.qualifying_assurance_or_custody_receipts,0);
assert.equal(summary.routes_executed,8);
assert.equal(summary.routes_with_substantive_content,6);
assert.equal(summary.routes_with_qualifying_receipt,0);
assert.equal(summary.hfu_independent_authority,false);
assert.equal(summary.hfu_effective_remedy,false);
assert.equal(summary.hfu_durability,false);
assert.equal(summary.hfu_practical_exit_or_governance,true);
assert.equal(summary.deficits_closed,0);
assert.equal(summary.deficits_preserved,13);
assert.equal(summary.candidate_evidence_records,5);
assert.equal(summary.repository_promotion_allowed,5);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.frontier_row.frontier_id,HFU_ASSURANCE_FRONTIER_ID);
assert.equal(summary.transition_chain.former_supplier_deletion_certificate,false);
assert.equal(summary.transition_chain.independent_end_to_end_migration_assurance,false);
assert.equal(summary.transition_chain.affected_party_post_exit_governance,false);

let mutationIndex=0;
const writeMutation=(value,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);
  return target;
};
const expectFailure=(label,envName,source,mutate)=>{
  const changed=clone(source);
  mutate(changed);
  const target=writeMutation(changed,label);
  const result=runValidator({[envName]:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectAcquisitionFailure=(label,mutate)=>expectFailure(
  label,
  'M05_HFU_ASSURANCE_CUSTODY_ACQUISITION_PATH',
  data.acquisition,
  mutate
);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('frontier-blob-drift',(row)=>{row.bindings.implementation_frontier.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('source-denominator-reduction',(row)=>{row.source_records.pop();row.expected_result.source_records=5});
expectAcquisitionFailure('source-url-substitution',(row)=>{row.source_records[1].url='https://consult.communities.gov.uk/digital-delivery/other/'});
expectAcquisitionFailure('source-locator-mutation',(row)=>{row.source_records[0].locators[0]+=' mutated'});
expectAcquisitionFailure('source-role-mutation',(row)=>{row.source_records[4].source_role='central_share_assurance'});
expectAcquisitionFailure('source-qualification',(row)=>{row.source_records[1].qualifies_as_assurance_or_custody_receipt=true});
expectAcquisitionFailure('route-denominator-reduction',(row)=>{row.route_ledger.pop();row.expected_result.routes_executed=7});
expectAcquisitionFailure('route-host-substitution',(row)=>{row.route_ledger[0].host='example.com'});
expectAcquisitionFailure('route-qualification',(row)=>{row.route_ledger[0].qualifying_receipt_found=true});
expectAcquisitionFailure('route-source-join-drift',(row)=>{row.route_ledger[0].observed_source_ids=['UNKNOWN']});
expectAcquisitionFailure('survey-assurance-overclaim',(row)=>{row.route_guardrails.migration_survey_is_assurance_result=true});
expectAcquisitionFailure('planned-assessment-overclaim',(row)=>{row.route_guardrails.planned_live_service_assessment_is_completed_assessment=true});
expectAcquisitionFailure('local-audit-transfer',(row)=>{row.route_guardrails.adjacent_local_audit_transfers_to_central_share=true});
expectAcquisitionFailure('privacy-remedy-overclaim',(row)=>{row.route_guardrails.privacy_rights_route_is_observed_remedy=true});
expectAcquisitionFailure('supplier-exit-custody-overclaim',(row)=>{row.route_guardrails.supplier_exit_is_residual_custody_reconciliation=true});
expectAcquisitionFailure('continued-operation-durability-overclaim',(row)=>{row.route_guardrails.continued_operation_is_durability=true});
expectAcquisitionFailure('guardrail-object-removal',(row)=>{delete row.route_guardrails});
expectAcquisitionFailure('guardrail-key-removal',(row)=>{delete row.route_guardrails.migration_survey_is_assurance_result});
expectAcquisitionFailure('independent-authority-overclaim',(row)=>{row.target.dimensions.independent_authority.after=true});
expectAcquisitionFailure('remedy-overclaim',(row)=>{row.target.dimensions.effective_remedy.after=true});
expectAcquisitionFailure('durability-overclaim',(row)=>{row.target.dimensions.durability.after=true});
expectAcquisitionFailure('deficit-erasure',(row)=>{row.finding.deficits_preserved=[]});
expectAcquisitionFailure('search-exhaustiveness-overclaim',(row)=>{row.acquisition_protocol.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('public-nonexistence-overclaim',(row)=>{row.acquisition_protocol.current_public_nonexistence_claimed=true});
expectAcquisitionFailure('expected-count-inflation',(row)=>{row.expected_result.routes_with_substantive_content=8});
expectAcquisitionFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectAcquisitionFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectAcquisitionFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectAcquisitionFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});
expectAcquisitionFailure('boundary-key-removal',(row)=>{delete row.boundaries.claims_durability});

expectFailure(
  'frontier-source-mutation',
  'M05_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{row.expected_result.candidate_evidence_records=4}
);
expectFailure(
  'hfu-source-mutation',
  'M05_HFU_RECEIPT_CANDIDATE_PATH',
  data.hfuCandidate,
  (row)=>{row.receipt.transition_chain.former_supplier_deletion_certificate=true}
);
expectFailure(
  'foodinho-source-mutation',
  'M05_FOODINHO_ACQUISITION_PATH',
  data.foodinhoAcquisition,
  (row)=>{row.expected_result.foodinho_durability=true}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-hfu-assurance-custody-public-record-acquisition.test: OK');
