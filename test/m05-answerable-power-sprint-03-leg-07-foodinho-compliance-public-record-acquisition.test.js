#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  FOODINHO_COMPLIANCE_SOURCE_IDS,
  FOODINHO_COMPLIANCE_ROUTE_IDS,
  summarizeFoodinhoCompliancePublicRecordAcquisition
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  gapLedger:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'),
  packet:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-foodinho-compliance-acquisition-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeFoodinhoCompliancePublicRecordAcquisition(
  data.acquisition,
  data.frontier,
  data.gapLedger,
  data.packet
);
assert.equal(summary.source_records,3);
assert.equal(summary.new_source_records,1);
assert.equal(summary.qualifying_compliance_receipts,0);
assert.equal(summary.routes_executed,5);
assert.equal(summary.routes_with_substantive_content,4);
assert.equal(summary.routes_with_qualifying_receipt,0);
assert.equal(summary.foodinho_pre_action_timing,false);
assert.equal(summary.foodinho_durability,false);
assert.equal(summary.deficits_closed,0);
assert.equal(summary.deficits_preserved,3);
assert.equal(summary.candidate_evidence_records,5);
assert.equal(summary.repository_promotion_allowed,5);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.deepEqual(summary.source_records_detail.map((row)=>row.source_id),FOODINHO_COMPLIANCE_SOURCE_IDS);
assert.deepEqual(summary.route_ledger.map((row)=>row.route_id),FOODINHO_COMPLIANCE_ROUTE_IDS);
assert.equal(summary.target_frontier.current_dimension_state.pre_action_timing,false);
assert.equal(summary.target_frontier.current_dimension_state.durability,false);
assert.equal(summary.target_probe.probe_result.answer_changes_authorized,false);
assert.equal(summary.target_record.observation.answer.dimensions.pre_action_timing,false);
assert.equal(summary.target_record.observation.answer.dimensions.durability,false);

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
  assert.notEqual(
    result.status,
    0,
    `${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`
  );
};
const expectAcquisitionFailure=(label,mutate)=>expectFailure(
  label,
  'M05_FOODINHO_COMPLIANCE_ACQUISITION_PATH',
  data.acquisition,
  mutate
);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('frontier-blob-drift',(row)=>{row.bindings.implementation_frontier.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('source-mutation',(row)=>{row.source_records[0].locators[0]+=' mutated'});
expectAcquisitionFailure('source-denominator-reduction',(row)=>{row.source_records.pop();row.expected_result.source_records=2});
expectAcquisitionFailure('source-qualification-overclaim',(row)=>{row.source_records[1].qualifies_as_compliance_receipt=true});
expectAcquisitionFailure('annual-report-name-overclaim',(row)=>{row.observed_state.foodinho_named_in_annual_report_2025=true});
expectAcquisitionFailure('closure-overclaim',(row)=>{row.observed_state.published_foodinho_specific_closure_located=true});
expectAcquisitionFailure('documented-response-overclaim',(row)=>{row.observed_state.documented_foodinho_compliance_response_located=true});
expectAcquisitionFailure('technical-audit-overclaim',(row)=>{row.observed_state.independent_technical_compliance_audit_located=true});
expectAcquisitionFailure('rider-outcome-overclaim',(row)=>{row.observed_state.rider_level_pre_action_human_review_outcome_located=true});
expectAcquisitionFailure('nonrecurrence-overclaim',(row)=>{row.observed_state.recurrence_free_post_change_denominator_located=true});
expectAcquisitionFailure('pre-action-overclaim',(row)=>{row.target.dimensions.pre_action_timing.after=true});
expectAcquisitionFailure('durability-overclaim',(row)=>{row.target.dimensions.durability.after=true});
expectAcquisitionFailure('route-qualification-overclaim',(row)=>{row.route_ledger[0].qualifying_receipt_found=true});
expectAcquisitionFailure('route-denominator-reduction',(row)=>{row.route_ledger.pop();row.expected_result.routes_executed=4});
expectAcquisitionFailure('search-exhaustiveness-overclaim',(row)=>{row.acquisition_protocol.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('current-nonexistence-overclaim',(row)=>{row.acquisition_protocol.current_public_nonexistence_claimed=true});
expectAcquisitionFailure('annual-silence-compliance-overclaim',(row)=>{row.acquisition_protocol.annual_report_silence_counts_as_compliance=true});
expectAcquisitionFailure('annual-silence-noncompliance-overclaim',(row)=>{row.boundaries.annual_report_silence_is_noncompliance=true});
expectAcquisitionFailure('extension-closure-overclaim',(row)=>{row.boundaries.implementation_extension_is_closure=true});
expectAcquisitionFailure('order-operation-overclaim',(row)=>{row.boundaries.corrective_order_is_operated_safeguard=true});
expectAcquisitionFailure('answer-authorization-overclaim',(row)=>{row.finding.answer_changes_authorized=true});
expectAcquisitionFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectAcquisitionFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectAcquisitionFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectAcquisitionFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});

expectFailure(
  'frontier-target-mutation',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{
    const target=row.frontiers.find((entry)=>entry.frontier_id==='M05-IF-WORK-IT-FOODINHO-COMPLIANCE');
    target.current_dimension_state.pre_action_timing=true;
  }
);
expectFailure(
  'gap-ledger-mutation',
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  data.gapLedger,
  (row)=>{
    const target=row.probes.find((entry)=>entry.receipt_id==='M05-RC-WORK-IT-FOODINHO');
    target.probe_result.answer_changes_authorized=true;
  }
);
expectFailure(
  'packet-answer-mutation',
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  data.packet,
  (row)=>{
    const target=row.records.find((entry)=>entry.receipt_id==='M05-RC-WORK-IT-FOODINHO');
    target.observation.answer.dimensions.durability=true;
  }
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-foodinho-compliance-public-record-acquisition.test: OK');
