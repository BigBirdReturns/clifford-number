#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  classifyIntelOfferingRecord,
  summarizeIntelIssuerOfferingDisambiguation
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.json'),
  monitor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  intel:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  syri:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-issuer-offering-disambiguation-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeIntelIssuerOfferingDisambiguation(data.acquisition,data.monitor,data.frontier,data.intel);
assert.equal(summary.official_source_records,4);
assert.equal(summary.executed_routes,5);
assert.equal(summary.substantive_nonqualifying_routes,3);
assert.equal(summary.bounded_search_routes_without_qualifier,2);
assert.equal(summary.issuer_offering_sources,2);
assert.equal(summary.issuer_offering_total_shares,242105262);
assert.equal(summary.qualifying_commerce_realization_receipts,0);
assert.equal(summary.commerce_disposition_supported,false);
assert.equal(summary.federal_receipt_supported,false);
assert.equal(summary.public_account_booking_supported,false);
assert.equal(summary.distribution_supported,false);
assert.equal(summary.answer_changes_authorized,false);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.graph_effect,'none');
assert.equal(summary.issue_345_may_close,false);

assert.equal(classifyIntelOfferingRecord(data.acquisition.source_records[1]),'issuer_primary_offering');
assert.equal(classifyIntelOfferingRecord(data.acquisition.source_records[2]),'issuer_underwriting_and_option_exercise');
assert.equal(classifyIntelOfferingRecord(data.acquisition.source_records[0]),'nonqualifying_or_incomplete_record');

const syntheticComplete=clone(data.acquisition);
syntheticComplete.source_records[0].qualifies_as_commerce_realization_receipt=true;
syntheticComplete.source_records[0].facts.commerce_selling_securityholder=true;
syntheticComplete.source_records[0].facts.federal_cash_receipt_recorded=true;
syntheticComplete.source_records[0].facts.public_distribution_recorded=true;
for(const key of Object.keys(syntheticComplete.required_event_chain))syntheticComplete.required_event_chain[key]=true;
assert.equal(classifyIntelOfferingRecord(syntheticComplete.source_records[0]),'qualifying_commerce_realization_chain');
const syntheticSummary=summarizeIntelIssuerOfferingDisambiguation(syntheticComplete,data.monitor,data.frontier,data.intel);
assert.equal(syntheticSummary.commerce_disposition_supported,true);
assert.equal(syntheticSummary.federal_receipt_supported,true);
assert.equal(syntheticSummary.public_account_booking_supported,true);
assert.equal(syntheticSummary.distribution_supported,true);
assert.equal(syntheticSummary.issue_345_may_close,false);

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
  'M05_INTEL_ISSUER_OFFERING_DISAMBIGUATION_PATH',
  data.acquisition,
  mutate
);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('monitor-binding-drift',(row)=>{row.bindings.date_gate_monitor.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('protocol-host-deletion',(row)=>{row.acquisition_protocol.official_hosts.pop()});
expectAcquisitionFailure('search-exhaustiveness',(row)=>{row.acquisition_protocol.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('issuer-transfer-at-protocol',(row)=>{row.acquisition_protocol.issuer_offering_counts_as_commerce_disposition=true});
expectAcquisitionFailure('source-deletion',(row)=>{row.source_records.pop()});
expectAcquisitionFailure('source-url-substitution',(row)=>{row.source_records[1].url='https://www.intc.com/'});
expectAcquisitionFailure('source-checksum-substitution',(row)=>{row.source_records[1].source_sha256='0'.repeat(64)});
expectAcquisitionFailure('base-share-drift',(row)=>{row.source_records[1].facts.base_shares+=1});
expectAcquisitionFailure('proceeds-recipient-transfer',(row)=>{row.source_records[1].facts.proceeds_recipient='United States Department of Commerce'});
expectAcquisitionFailure('commerce-seller-transfer',(row)=>{row.source_records[2].facts.commerce_selling_securityholder=true});
expectAcquisitionFailure('option-exercise-deletion',(row)=>{row.source_records[2].facts.option_exercised_in_full=false});
expectAcquisitionFailure('valuation-to-sale-transfer',(row)=>{row.source_records[3].facts.sale_recorded=true});
expectAcquisitionFailure('route-deletion',(row)=>{row.route_ledger.pop()});
expectAcquisitionFailure('route-class-transfer',(row)=>{row.route_ledger[0].result_class='qualifying_commerce_realization'});
expectAcquisitionFailure('route-qualification',(row)=>{row.route_ledger[0].qualifying_receipt_found=true});
expectAcquisitionFailure('instrument-total-drift',(row)=>{row.instrument_disambiguation.issuer_offering_total_shares+=1});
expectAcquisitionFailure('closing-overclaim',(row)=>{row.instrument_disambiguation.offering_closing_confirmed_by_frozen_records=true});
expectAcquisitionFailure('disposition-overclaim',(row)=>{row.instrument_disambiguation.commerce_disposition_record_located=true});
expectAcquisitionFailure('dilution-overclaim',(row)=>{row.instrument_disambiguation.dilution_effect_quantified=true});
expectAcquisitionFailure('event-chain-sale-overclaim',(row)=>{row.required_event_chain.source_addressed_commerce_sale_transfer_dividend_or_warrant_exercise=true});
expectAcquisitionFailure('event-chain-receipt-overclaim',(row)=>{row.required_event_chain.identified_federal_cash_receipt=true});
expectAcquisitionFailure('event-chain-distribution-overclaim',(row)=>{row.required_event_chain.transparent_public_or_affected_party_distribution=true});
expectAcquisitionFailure('issuer-offering-transfer',(row)=>{row.guardrails.issuer_primary_offering_is_commerce_disposition=true});
expectAcquisitionFailure('issuer-proceeds-transfer',(row)=>{row.guardrails.issuer_proceeds_are_federal_cash_receipt=true});
expectAcquisitionFailure('valuation-transfer',(row)=>{row.guardrails.commerce_market_valuation_is_realized_return=true});
expectAcquisitionFailure('expected-disposition-overclaim',(row)=>{row.expected_result.commerce_disposition_supported=true});
expectAcquisitionFailure('expected-answer-overclaim',(row)=>{row.expected_result.effective_answers=1});
expectAcquisitionFailure('answer-authorization',(row)=>{row.boundaries.answer_changes_authorized=true});
expectAcquisitionFailure('graph-effect',(row)=>{row.boundaries.graph_effect='candidate_edge'});
expectAcquisitionFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});

expectFailure('monitor-exception-overclaim','M05_INTEL_REALIZATION_MONITOR_PATH',data.monitor,(row)=>{row.target.bilateral_exception_receipt_located=true});
expectFailure('monitor-gate-drift','M05_INTEL_REALIZATION_MONITOR_PATH',data.monitor,(row)=>{row.target.ordinary_gate_utc='2026-08-18T00:00:00Z'});
expectFailure(
  'frontier-registration-transfer',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{
    row.route_control_sources.find((entry)=>entry.source_id==='US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS').control_effect.registration_is_sale=true;
  }
);
expectFailure(
  'intel-candidate-realization-overclaim',
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  data.intel,
  (row)=>{row.receipt.instrument_chain.realized_sale_dividend_or_warrant_exercise=true}
);
expectFailure('syri-predecessor-drift','M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',data.syri,(row)=>{row.status='mutated'});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-issuer-offering-disambiguation.test: OK');
