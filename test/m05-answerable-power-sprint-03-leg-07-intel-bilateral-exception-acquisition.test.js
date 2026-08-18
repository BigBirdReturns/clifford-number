#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.json'),
  historical:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.json'),
  monitor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  syri:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-bilateral-exception-'));
const runValidator=(env={})=>spawnSync(process.execPath,['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,...env}});
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);
assert.equal(data.acquisition.expected_result.historical_source_records,3);
assert.equal(data.acquisition.expected_result.historical_route_records,6);
assert.equal(data.acquisition.expected_result.recheck_routes_executed,3);
assert.equal(data.acquisition.expected_result.qualifying_early_realization_receipts,0);
assert.equal(data.acquisition.expected_result.ordinary_route_active,false);
assert.equal(data.acquisition.expected_result.effective_answers,0);
assert.equal(data.acquisition.expected_result.issue_345_may_close,false);

let mutationIndex=0;
const writeMutation=(value,label)=>{mutationIndex+=1;const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);return target};
const expectFailure=(label,envName,source,mutate)=>{const changed=clone(source);mutate(changed);const target=writeMutation(changed,label);const result=runValidator({[envName]:target});assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`)};
const expectAcquisitionFailure=(label,mutate)=>expectFailure(label,'M05_INTEL_BILATERAL_EXCEPTION_ACQUISITION_PATH',data.acquisition,mutate);

expectAcquisitionFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectAcquisitionFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectAcquisitionFailure('historical-blob-substitution',(row)=>{row.bindings.historical_pre_eligibility_record.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('monitor-blob-substitution',(row)=>{row.bindings.date_gate_monitor.blob_sha='0'.repeat(40)});
expectAcquisitionFailure('calendar-gate-drift',(row)=>{row.target.calendar_days_before_ordinary_gate=8});
expectAcquisitionFailure('ordinary-route-opened-early',(row)=>{row.acquisition_policy.ordinary_route_active=true});
expectAcquisitionFailure('exception-requirement-erased',(row)=>{row.acquisition_policy.earlier_activation_requires_source_addressed_bilateral_agreement=false});
expectAcquisitionFailure('search-exhaustiveness-overclaim',(row)=>{row.acquisition_policy.search_exhaustiveness_claimed=true});
expectAcquisitionFailure('nonexistence-overclaim',(row)=>{row.acquisition_policy.current_public_nonexistence_claimed=true});
expectAcquisitionFailure('downstream-route-inflation',(row)=>{row.acquisition_policy.downstream_fiscal_routes_deferred_without_upstream_transaction=false});
expectAcquisitionFailure('registration-sale-transfer',(row)=>{row.acquisition_policy.registration_counts_as_sale=true});
expectAcquisitionFailure('valuation-realization-transfer',(row)=>{row.acquisition_policy.mark_to_market_value_counts_as_realized_return=true});
expectAcquisitionFailure('historical-source-count-drift',(row)=>{row.historical_record_custody.source_records_carried_forward=2});
expectAcquisitionFailure('historical-route-id-deletion',(row)=>{row.historical_record_custody.route_ids.pop()});
expectAcquisitionFailure('recheck-route-deletion',(row)=>{row.recheck_routes.pop()});
expectAcquisitionFailure('recheck-route-order-drift',(row)=>{row.recheck_routes.reverse()});
expectAcquisitionFailure('recheck-host-substitution',(row)=>{row.recheck_routes[0].host='example.com'});
expectAcquisitionFailure('recheck-result-reclassification',(row)=>{row.recheck_routes[0].result_class='qualifying_exception'});
expectAcquisitionFailure('recheck-qualification-inflation',(row)=>{row.recheck_routes[1].qualifying_receipt_found=true});
expectAcquisitionFailure('recheck-hash-rewrite',(row)=>{row.recheck_routes[2].route_sha256='0'.repeat(64)});
expectAcquisitionFailure('bilateral-exception-overclaim',(row)=>{row.observed_state.bilateral_exception_publicly_evidenced=true});
expectAcquisitionFailure('sale-overclaim',(row)=>{row.observed_state.completed_sale_or_transfer_observed=true});
expectAcquisitionFailure('federal-receipt-overclaim',(row)=>{row.observed_state.identified_federal_cash_receipt=true});
expectAcquisitionFailure('public-account-overclaim',(row)=>{row.observed_state.public_account_booking_observed=true});
expectAcquisitionFailure('distribution-overclaim',(row)=>{row.observed_state.transparent_public_or_affected_party_distribution=true});
expectAcquisitionFailure('deficit-erasure',(row)=>{row.finding.deficits_preserved.pop()});
expectAcquisitionFailure('answer-authorization',(row)=>{row.finding.answer_changes_authorized=true});
expectAcquisitionFailure('answer-effectiveness',(row)=>{row.expected_result.answer_effectiveness=true});
expectAcquisitionFailure('cross-domain-completion',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectAcquisitionFailure('graph-effect',(row)=>{row.boundaries.graph_effect='candidate_graph'});
expectAcquisitionFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectAcquisitionFailure('project-completion',(row)=>{row.boundaries.project_complete=true});
expectAcquisitionFailure('checksum-rewrite',(row)=>{row.acquisition_sha256='0'.repeat(64)});

expectFailure('historical-source-substitution','M05_INTEL_PRE_ELIGIBILITY_MONITOR_PATH',data.historical,(row)=>{row.source_records[0].url='https://www.sec.gov/substituted'});
expectFailure('historical-route-promotion','M05_INTEL_PRE_ELIGIBILITY_MONITOR_PATH',data.historical,(row)=>{row.route_ledger[3].qualifying_receipt_found=true});
expectFailure('monitor-exception-overclaim','M05_INTEL_REALIZATION_MONITOR_PATH',data.monitor,(row)=>{row.target.bilateral_exception_receipt_located=true});
expectFailure('monitor-answer-promotion','M05_INTEL_REALIZATION_MONITOR_PATH',data.monitor,(row)=>{row.expected_result.effective_answers=1});
expectFailure('frontier-gate-inflation','M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',data.frontier,(row)=>{const target=row.frontiers.find((item)=>item.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION');target.time_gate.standard_sale_route_currently_eligible=true});
expectFailure('syri-closure-overclaim','M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',data.syri,(row)=>{row.boundaries.issue_345_may_close=true});

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.test: OK');
