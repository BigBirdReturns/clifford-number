#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  INTEL_REALIZATION_ORDINARY_GATE,
  shouldActivateIntelRealizationAcquisition,
  summarizeIntelRealizationDateGateMonitor
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  monitor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  intel:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  syri:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-syri-subject-access-public-record-acquisition.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-date-gate-monitor-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const summary=summarizeIntelRealizationDateGateMonitor(
  data.monitor,
  data.frontier,
  data.intel
);
assert.equal(summary.official_routes,5);
assert.equal(summary.qualifying_receipts,0);
assert.equal(summary.ordinary_gate_open_as_of_reference,false);
assert.equal(summary.monitor_state,'waiting_for_gate');
assert.equal(summary.realization_supported,false);
assert.equal(summary.federal_receipt_supported,false);
assert.equal(summary.distribution_supported,false);
assert.equal(summary.answer_changes_authorized,false);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.cross_domain_regression_completed,false);
assert.equal(summary.graph_effect,'none');
assert.equal(summary.issue_345_may_close,false);

assert.equal(
  shouldActivateIntelRealizationAcquisition(data.monitor,'2026-08-26T23:59:59Z'),
  false
);
assert.equal(
  shouldActivateIntelRealizationAcquisition(data.monitor,INTEL_REALIZATION_ORDINARY_GATE),
  true
);
const opened=summarizeIntelRealizationDateGateMonitor(
  data.monitor,
  data.frontier,
  data.intel,
  INTEL_REALIZATION_ORDINARY_GATE
);
assert.equal(opened.monitor_state,'gate_open_requires_acquisition');
assert.equal(opened.realization_supported,false);
assert.equal(opened.federal_receipt_supported,false);
assert.equal(opened.distribution_supported,false);

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
const expectMonitorFailure=(label,mutate)=>expectFailure(
  label,
  'M05_INTEL_REALIZATION_MONITOR_PATH',
  data.monitor,
  mutate
);

expectMonitorFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectMonitorFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectMonitorFailure('ordinary-date-drift',(row)=>{row.target.ordinary_gate_utc='2026-08-18T00:00:00Z'});
expectMonitorFailure('ordinary-route-open-overclaim',(row)=>{row.target.ordinary_route_open_as_of_record=true});
expectMonitorFailure('exception-overclaim',(row)=>{row.target.bilateral_exception_receipt_located=true});
expectMonitorFailure('route-deletion',(row)=>{row.official_routes.pop()});
expectMonitorFailure('route-host-substitution',(row)=>{row.official_routes[0].host='example.com'});
expectMonitorFailure('route-qualification',(row)=>{row.official_routes[0].qualifying_receipt_found=true});
expectMonitorFailure('unadjudicated-receipt-injection',(row)=>{row.observed_receipts.push({qualifying_receipt:true})});
expectMonitorFailure('sale-overclaim',(row)=>{row.required_event_chain.source_addressed_sale_transfer_dividend_or_warrant_exercise=true});
expectMonitorFailure('federal-receipt-overclaim',(row)=>{row.required_event_chain.identified_federal_cash_receipt=true});
expectMonitorFailure('distribution-overclaim',(row)=>{row.required_event_chain.transparent_public_or_affected_party_distribution=true});
expectMonitorFailure('registration-transfer',(row)=>{row.guardrails.registration_is_completed_sale=true});
expectMonitorFailure('escrow-transfer',(row)=>{row.guardrails.escrow_release_is_federal_cash_receipt=true});
expectMonitorFailure('valuation-transfer',(row)=>{row.guardrails.mark_to_market_value_is_realized_return=true});
expectMonitorFailure('date-transfer',(row)=>{row.guardrails.elapsed_date_is_distribution=true});
expectMonitorFailure('search-exhaustiveness',(row)=>{row.boundaries.search_exhaustiveness_claimed=true});
expectMonitorFailure('public-nonexistence',(row)=>{row.boundaries.current_public_nonexistence_claimed=true});
expectMonitorFailure('answer-authorization',(row)=>{row.boundaries.answer_changes_authorized=true});
expectMonitorFailure('graph-effect',(row)=>{row.boundaries.graph_effect='candidate_edge'});
expectMonitorFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectMonitorFailure('expected-realization-overclaim',(row)=>{row.expected_result.realization_supported=true});

expectFailure(
  'frontier-date-drift',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{row.route_control_sources[0].control_effect.standard_sale_route_eligible_as_of='2026-08-18'}
);
expectFailure(
  'frontier-route-class-drift',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{
    row.frontiers.find((entry)=>entry.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION').route_class='active_public_record_acquisition';
  }
);
expectFailure(
  'syri-custody-drift',
  'M05_SYRI_SUBJECT_ACCESS_ACQUISITION_PATH',
  data.syri,
  (row)=>{row.status='mutated'}
);
expectFailure(
  'intel-realization-overclaim',
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  data.intel,
  (row)=>{row.receipt.instrument_chain.realized_sale_dividend_or_warrant_exercise=true}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.test: OK');
