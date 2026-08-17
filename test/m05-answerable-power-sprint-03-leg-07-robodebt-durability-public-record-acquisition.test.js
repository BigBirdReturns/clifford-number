#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  ROBODEBT_DURABILITY_SOURCE_IDS,
  ROBODEBT_DURABILITY_ROUTE_IDS,
  summarizeRobodebtDurabilityPublicRecordAcquisition
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  priorReceipt:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(
  Object.entries(paths).map(([key,target])=>[key,read(target)])
);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-robodebt-durability-acquisition-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const snapshots=Object.fromEntries(
  Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)])
);
const summary=summarizeRobodebtDurabilityPublicRecordAcquisition(
  data.acquisition,
  data.frontier,
  data.priorReceipt
);
assert.equal(summary.source_records,3);
assert.equal(summary.new_source_records,2);
assert.equal(summary.qualifying_durability_receipts,0);
assert.equal(summary.routes_executed,6);
assert.equal(summary.routes_with_substantive_content,4);
assert.equal(summary.routes_with_qualifying_receipt,0);
assert.equal(summary.robodebt_pre_action_timing,true);
assert.equal(summary.robodebt_durability,false);
assert.deepEqual(summary.deficits_closed,[]);
assert.deepEqual(summary.deficits_preserved,[
  'composed_durable_answer',
  'dimension:durability'
]);
assert.equal(summary.answer_changes_authorized,false);
assert.equal(summary.repository_effect,'repository_content_only');
assert.equal(summary.issue_345_may_close,false);
assert.deepEqual(summary.source_records_detail.map((row)=>row.source_id),ROBODEBT_DURABILITY_SOURCE_IDS);
assert.deepEqual(summary.route_ledger.map((row)=>row.route_id),ROBODEBT_DURABILITY_ROUTE_IDS);
for(const [key,snapshot] of Object.entries(snapshots)){
  assert.equal(JSON.stringify(data[key]),snapshot);
}

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
  'M05_ROBODEBT_DURABILITY_ACQUISITION_PATH',
  data.acquisition,
  mutate
);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('frontier-binding-drift',(row)=>{row.bindings.implementation_frontier.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('target-route-drift',(row)=>{row.target.route_class='future_time_gated_monitoring'});
expectAcquisitionFailure('target-dimension-drift',(row)=>{row.target.dimension='pre_action_timing'});
expectAcquisitionFailure('durability-overclaim',(row)=>{row.target.after=true});
expectAcquisitionFailure('search-exhaustiveness-overclaim',(row)=>{row.acquisition_protocol.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('host-denominator-deletion',(row)=>{row.acquisition_protocol.official_hosts.pop()});
expectAcquisitionFailure('query-denominator-deletion',(row)=>{row.acquisition_protocol.query_families.pop()});
expectAcquisitionFailure('source-deletion',(row)=>{row.source_records.pop()});
expectAcquisitionFailure('source-duplication',(row)=>{row.source_records[2]=clone(row.source_records[1])});
expectAcquisitionFailure('source-http-drift',(row)=>{row.source_records[0].url=row.source_records[0].url.replace('https:','http:')});
expectAcquisitionFailure('source-host-drift',(row)=>{row.source_records[1].url='https://example.com/audit'});
expectAcquisitionFailure('source-locator-mutation',(row)=>{row.source_records[0].locators[0]+=' mutated'});
expectAcquisitionFailure('source-qualification-overclaim',(row)=>{row.source_records[1].qualifies_as_durability_receipt=true});
expectAcquisitionFailure('route-deletion',(row)=>{row.route_ledger.pop()});
expectAcquisitionFailure('route-reordering',(row)=>{row.route_ledger.reverse()});
expectAcquisitionFailure('route-state-mutation',(row)=>{row.route_ledger[1].result_class='completed_audit'});
expectAcquisitionFailure('route-reason-mutation',(row)=>{row.route_ledger[2].preserved_reason+=' mutated'});
expectAcquisitionFailure('route-qualification-overclaim',(row)=>{row.route_ledger[0].qualifying_receipt_found=true});
expectAcquisitionFailure('annual-review-result-overclaim',(row)=>{row.observed_state.published_annual_review_result_located=true});
expectAcquisitionFailure('assurance-result-overclaim',(row)=>{row.observed_state.published_external_assurance_result_located=true});
expectAcquisitionFailure('subject-chain-overclaim',(row)=>{row.observed_state.source_addressed_subject_level_pause_and_remedy_chain_located=true});
expectAcquisitionFailure('nonrecurrence-overclaim',(row)=>{row.observed_state.successor_system_nonrecurrence_denominator_located=true});
expectAcquisitionFailure('observed-durability-overclaim',(row)=>{row.observed_state.durability_supported=true});
expectAcquisitionFailure('deficit-closure-overclaim',(row)=>{row.finding.deficits_closed=['dimension:durability']});
expectAcquisitionFailure('deficit-erasure',(row)=>{row.finding.deficits_preserved=[]});
expectAcquisitionFailure('answer-change-overclaim',(row)=>{row.finding.answer_changes_authorized=true});
expectAcquisitionFailure('repository-effect-overclaim',(row)=>{row.finding.repository_effect='candidate_answer_dimension'});
expectAcquisitionFailure('expected-durability-overclaim',(row)=>{row.expected_state.robodebt_durability=true});
expectAcquisitionFailure('effective-answer-overclaim',(row)=>{row.expected_state.effective_answers=1});
expectAcquisitionFailure('cross-domain-overclaim',(row)=>{row.expected_state.cross_domain_regression_completed=true});
expectAcquisitionFailure('expected-issue-closure-overclaim',(row)=>{row.expected_state.issue_345_may_close=true});
expectAcquisitionFailure('annual-review-boundary-overclaim',(row)=>{row.boundaries.annual_review_commitment_is_review_result=true});
expectAcquisitionFailure('future-audit-boundary-overclaim',(row)=>{row.boundaries.future_audit_topic_is_completed_audit=true});
expectAcquisitionFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectAcquisitionFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectFailure(
  'bound-frontier-mutation',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{row.frontiers[0].current_dimension_state.durability=true}
);
expectFailure(
  'prior-receipt-mutation',
  'M05_ROBODEBT_PRE_ACTION_IMPLEMENTATION_RECEIPT_PATH',
  data.priorReceipt,
  (row)=>{row.target.after=false}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-robodebt-durability-public-record-acquisition.test: OK');
