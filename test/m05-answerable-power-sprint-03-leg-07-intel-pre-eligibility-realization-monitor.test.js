#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  INTEL_PRE_ELIGIBILITY_SOURCE_IDS,
  INTEL_PRE_ELIGIBILITY_ROUTE_IDS,
  summarizeIntelPreEligibilityRealizationMonitor
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  monitor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  intelCandidate:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  syriAcquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-pre-eligibility-monitor-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}
${baseRun.stderr}`);

const summary=summarizeIntelPreEligibilityRealizationMonitor(
  data.monitor,
  data.frontier,
  data.intelCandidate,
  data.syriAcquisition
);
assert.equal(summary.source_records,3);
assert.equal(summary.new_source_records,0);
assert.equal(summary.routes_executed,6);
assert.equal(summary.routes_with_substantive_nonqualifying_content,3);
assert.equal(summary.bounded_search_routes_without_qualifier,3);
assert.equal(summary.routes_with_qualifying_receipt,0);
assert.equal(summary.standard_route_active,false);
assert.equal(summary.bilateral_exception_public_record_located,false);
assert.equal(summary.completed_sale_observed,false);
assert.equal(summary.identified_federal_cash_receipt,false);
assert.equal(summary.transparent_public_or_affected_party_distribution,false);
assert.equal(summary.next_standard_scan_date,'2026-08-27');
assert.equal(summary.issue_345_may_close,false);
assert.deepEqual(
  summary.source_records_detail.map((row)=>row.source_id),
  INTEL_PRE_ELIGIBILITY_SOURCE_IDS
);
assert.deepEqual(
  summary.route_ledger.map((row)=>row.route_id),
  INTEL_PRE_ELIGIBILITY_ROUTE_IDS
);

let mutationIndex=0;
const writeMutation=(value,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}
`);
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
    `${label} unexpectedly passed
${result.stdout}
${result.stderr}`
  );
};
const expectMonitorFailure=(label,mutate)=>expectFailure(
  label,
  'M05_INTEL_PRE_ELIGIBILITY_MONITOR_PATH',
  data.monitor,
  mutate
);

expectMonitorFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectMonitorFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectMonitorFailure('calendar-gate-drift',(row)=>{row.target.calendar_days_before_standard_window=9});
expectMonitorFailure('standard-window-opened-early',(row)=>{row.monitoring_policy.standard_route_active=true});
expectMonitorFailure('exception-overclaim',(row)=>{row.monitoring_policy.bilateral_exception_public_record_located=true});
expectMonitorFailure('search-exhaustiveness-overclaim',(row)=>{row.monitoring_policy.search_exhaustiveness_claimed=true});
expectMonitorFailure('nonexistence-overclaim',(row)=>{row.monitoring_policy.current_public_nonexistence_claimed=true});
expectMonitorFailure('source-deletion',(row)=>{row.source_records.pop()});
expectMonitorFailure('source-order-drift',(row)=>{row.source_records.reverse()});
expectMonitorFailure('source-url-substitution',(row)=>{row.source_records[0].url='https://www.sec.gov/Archives/edgar/data/50863/substituted.htm'});
expectMonitorFailure('source-locator-substitution',(row)=>{row.source_records[1].locators[0]+=' changed'});
expectMonitorFailure('source-qualification-inflation',(row)=>{row.source_records[2].qualifies_as_realization_receipt=true});
expectMonitorFailure('source-hash-rewrite',(row)=>{row.source_records[0].source_sha256='0'.repeat(64)});
expectMonitorFailure('route-deletion',(row)=>{row.route_ledger.pop()});
expectMonitorFailure('route-reclassification',(row)=>{row.route_ledger[0].result_class='completed_sale'});
expectMonitorFailure('route-qualification-inflation',(row)=>{row.route_ledger[3].qualifying_receipt_found=true});
expectMonitorFailure('route-reason-erasure',(row)=>{row.route_ledger[4].preserved_reason='short'});
expectMonitorFailure('route-hash-rewrite',(row)=>{row.route_ledger[1].route_sha256='0'.repeat(64)});
expectMonitorFailure('sale-overclaim',(row)=>{row.observed_state.completed_sale_observed=true});
expectMonitorFailure('dividend-overclaim',(row)=>{row.observed_state.dividend_to_commerce_observed=true});
expectMonitorFailure('warrant-overclaim',(row)=>{row.observed_state.warrant_exercise_observed=true});
expectMonitorFailure('federal-receipt-overclaim',(row)=>{row.observed_state.identified_federal_cash_receipt=true});
expectMonitorFailure('public-account-overclaim',(row)=>{row.observed_state.public_account_booking_observed=true});
expectMonitorFailure('distribution-overclaim',(row)=>{row.observed_state.transparent_public_or_affected_party_distribution=true});
expectMonitorFailure('date-gate-erasure',(row)=>{row.finding.date_gate_preserved=false});
expectMonitorFailure('deficit-erasure',(row)=>{row.finding.deficits_preserved.pop()});
expectMonitorFailure('answer-authorization',(row)=>{row.finding.answer_changes_authorized=true});
expectMonitorFailure('graph-effect',(row)=>{row.boundaries.graph_effect='candidate_graph'});
expectMonitorFailure('answer-effectiveness',(row)=>{row.boundaries.claims_answer_effectiveness=true});
expectMonitorFailure('cross-domain-completion',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectMonitorFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectMonitorFailure('project-completion',(row)=>{row.boundaries.project_complete=true});

expectFailure(
  'frontier-time-gate-drift',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{
    const target=row.frontiers.find((item)=>item.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION');
    target.time_gate.standard_sale_route_currently_eligible=true;
  }
);
expectFailure(
  'intel-candidate-realization-overclaim',
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  data.intelCandidate,
  (row)=>{row.receipt.instrument_chain.realized_sale_dividend_or_warrant_exercise=true}
);
expectFailure(
  'syri-predecessor-closure-overclaim',
  'M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',
  data.syriAcquisition,
  (row)=>{row.boundaries.issue_345_may_close=true}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-pre-eligibility-realization-monitor.test: OK');
