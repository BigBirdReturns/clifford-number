#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  SYRI_ACCESS_FRONTIER_ID,
  SYRI_ACCESS_SOURCE_IDS,
  SYRI_ACCESS_ROUTE_IDS,
  summarizeSyriSubjectAccessPublicRecordAcquisition
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  gapLedger:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'),
  packet:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-syri-subject-access-acquisition-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const snapshots=Object.fromEntries(
  Object.entries(data).map(([key,value])=>[key,JSON.stringify(value)])
);
const summary=summarizeSyriSubjectAccessPublicRecordAcquisition(
  data.acquisition,
  data.frontier,
  data.gapLedger,
  data.packet
);
assert.equal(summary.source_records,5);
assert.equal(summary.new_source_records,4);
assert.equal(summary.routes_executed,6);
assert.equal(summary.routes_with_substantive_content,5);
assert.equal(summary.routes_with_qualifying_receipt,0);
assert.equal(summary.qualifying_evidence_access_receipts,0);
assert.equal(summary.syri_evidence_access,false);
assert.equal(summary.syri_composed_durable_answer,false);
assert.equal(summary.candidate_evidence_records,5);
assert.equal(summary.repository_promotions,5);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.issue_345_may_close,false);
assert.deepEqual(summary.source_records_detail.map((row)=>row.source_id),SYRI_ACCESS_SOURCE_IDS);
assert.deepEqual(summary.route_ledger.map((row)=>row.route_id),SYRI_ACCESS_ROUTE_IDS);
assert.equal(summary.target_frontier.frontier_id,SYRI_ACCESS_FRONTIER_ID);
assert.deepEqual(summary.deficits_preserved,['composed_durable_answer','dimension:evidence_access']);
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
  'M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',
  data.acquisition,
  mutate
);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('frontier-binding-drift',(row)=>{row.bindings.implementation_frontier.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('source-deletion',(row)=>{row.source_records.pop();row.finding.source_records=4;row.expected_result.source_records=4});
expectAcquisitionFailure('source-url-substitution',(row)=>{row.source_records[1].url='https://zoek.officielebekendmakingen.nl/stb-2014-321.html'});
expectAcquisitionFailure('source-locator-erasure',(row)=>{row.source_records[2].locators[0]='short'});
expectAcquisitionFailure('source-qualification-overclaim',(row)=>{row.source_records[3].qualifies_as_evidence_access_receipt=true});
expectAcquisitionFailure('source-hash-drift',(row)=>{row.source_records[4].source_sha256='0'.repeat(64)});
expectAcquisitionFailure('route-deletion',(row)=>{row.route_ledger.pop();row.finding.routes_executed=5;row.expected_result.routes_executed=5});
expectAcquisitionFailure('route-reclassification',(row)=>{row.route_ledger[1].result_class='fulfilled_subject_access'});
expectAcquisitionFailure('route-qualification',(row)=>{row.route_ledger[4].qualifying_receipt_found=true});
expectAcquisitionFailure('route-hash-drift',(row)=>{row.route_ledger[2].route_sha256='0'.repeat(64)});
expectAcquisitionFailure('formal-route-overclaim',(row)=>{row.acquisition_protocol.formal_access_route_counts_as_fulfilled_access=true});
expectAcquisitionFailure('destruction-overclaim',(row)=>{row.acquisition_protocol.data_destruction_counts_as_subject_explanation=true});
expectAcquisitionFailure('model-disclosure-overclaim',(row)=>{row.acquisition_protocol.system_level_disclosure_counts_as_person_level_join=true});
expectAcquisitionFailure('search-exhaustiveness',(row)=>{row.acquisition_protocol.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('public-nonexistence',(row)=>{row.acquisition_protocol.current_public_nonexistence_claimed=true});
expectAcquisitionFailure('access-control-bypass',(row)=>{row.acquisition_protocol.access_controls_bypassed=true});
expectAcquisitionFailure('direct-voice-polling',(row)=>{row.acquisition_protocol.direct_voice_bulk_polling_allowed=true});
expectAcquisitionFailure('fulfilled-request-overclaim',(row)=>{row.observed_state.fulfilled_subject_access_request_located=true});
expectAcquisitionFailure('inputs-overclaim',(row)=>{row.observed_state.identified_subject_inputs_disclosed=true});
expectAcquisitionFailure('reasoning-overclaim',(row)=>{row.observed_state.reasoning_disclosed_to_subject=true});
expectAcquisitionFailure('outcome-overclaim',(row)=>{row.observed_state.correction_or_contest_outcome_located=true});
expectAcquisitionFailure('evidence-access-promotion',(row)=>{row.target.after=true;row.expected_result.syri_evidence_access=true});
expectAcquisitionFailure('answer-authorization',(row)=>{row.finding.answer_changes_authorized=true});
expectAcquisitionFailure('graph-effect',(row)=>{row.finding.graph_effect='promote'});
expectAcquisitionFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectAcquisitionFailure('project-completion',(row)=>{row.boundaries.project_complete=true});

expectFailure(
  'frontier-source-mutation',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{row.frontiers.find((item)=>item.frontier_id===SYRI_ACCESS_FRONTIER_ID).current_dimension_state.evidence_access=true}
);
expectFailure(
  'gap-ledger-source-mutation',
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  data.gapLedger,
  (row)=>{row.probes.find((item)=>item.probe_id==='M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS').probe_result.answer_changes_authorized=true}
);
expectFailure(
  'packet-source-mutation',
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  data.packet,
  (row)=>{row.records.find((item)=>item.receipt_id==='M05-RC-COERCION-NL-SYRI').observation.answer.dimensions.evidence_access=true}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.test: OK');
