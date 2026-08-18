#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={
  contract:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.json'),
  acquisition:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-bilateral-exception-acquisition.json'),
  monitor:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-realization-date-gate-monitor.json'),
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  intel:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const semanticHash=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const data=Object.fromEntries(Object.entries(paths).map(([key,target])=>[key,read(target)]));
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-intel-realization-accounting-admission-'));

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.mjs'],
  {cwd:root,encoding:'utf8',env:{...process.env,...env}}
);
const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);
assert.equal(data.contract.expected_result.control_sources,4);
assert.equal(data.contract.expected_result.admission_stages,4);
assert.equal(data.contract.expected_result.observed_receipts,0);
assert.equal(data.contract.expected_result.transaction_admissible,false);
assert.equal(data.contract.expected_result.federal_cash_custody_admissible,false);
assert.equal(data.contract.expected_result.public_account_booking_admissible,false);
assert.equal(data.contract.expected_result.distribution_admissible,false);
assert.equal(data.contract.expected_result.issue_345_may_close,false);

let mutationIndex=0;
const writeRawMutation=(content,label)=>{
  mutationIndex+=1;
  const target=path.join(tempRoot,`${String(mutationIndex).padStart(2,'0')}-${label}.json`);
  fs.writeFileSync(target,content);
  return target;
};
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
const expectRawContractFailure=(label,content)=>{
  const target=writeRawMutation(content,label);
  const result=runValidator({M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_CONTRACT_PATH:target});
  assert.notEqual(result.status,0,`${label} unexpectedly passed\n${result.stdout}\n${result.stderr}`);
};
const expectContractFailure=(label,mutate)=>expectFailure(
  label,
  'M05_INTEL_REALIZATION_ACCOUNTING_ADMISSION_CONTRACT_PATH',
  data.contract,
  mutate
);

expectContractFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectContractFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectContractFailure('acquisition-binding-substitution',(row)=>{row.bindings.bilateral_exception_acquisition.blob_sha='0'.repeat(40)});
expectContractFailure('control-source-deletion',(row)=>{row.control_sources.pop()});
expectContractFailure('legal-source-substitution',(row)=>{row.control_sources[1].url='https://example.com/statute'});
expectContractFailure('gao-overclaim',(row)=>{row.control_sources[2].control_effect.analogy_is_intel_specific_legal_determination=true});
expectContractFailure('ordinary-gate-drift',(row)=>{row.activation.ordinary_gate_utc='2026-08-18T00:00:00Z'});
expectContractFailure('ordinary-route-opened-early',(row)=>{row.activation.ordinary_route_active_as_of_contract=true});
expectContractFailure('gate-is-transaction',(row)=>{row.activation.gate_open_is_transaction=true});
expectContractFailure('stage-order-drift',(row)=>{row.stage_order.reverse()});
expectContractFailure('transaction-field-deletion',(row)=>{row.admission_stages.transaction.required_fields.pop()});
expectContractFailure('registration-qualification',(row)=>{row.admission_stages.transaction.registration_or_eligibility_alone_qualifies=true});
expectContractFailure('gross-receipt-field-deletion',(row)=>{row.admission_stages.federal_cash_custody.required_fields=row.admission_stages.federal_cash_custody.required_fields.filter((key)=>key!=='gross_amount_received_for_government')});
expectContractFailure('silent-netting',(row)=>{row.admission_stages.federal_cash_custody.selling_costs_must_not_be_silently_netted=false});
expectContractFailure('tas-deletion',(row)=>{row.admission_stages.public_account_booking.required_fields=row.admission_stages.public_account_booking.required_fields.filter((key)=>key!=='treasury_account_symbol')});
expectContractFailure('betc-boundary-erasure',(row)=>{row.admission_stages.public_account_booking.tas_and_betc_required=false});
expectContractFailure('distribution-authority-deletion',(row)=>{row.admission_stages.distribution.required_fields=row.admission_stages.distribution.required_fields.filter((key)=>key!=='distribution_authority')});
expectContractFailure('general-fund-as-distribution',(row)=>{row.admission_stages.distribution.general_fund_deposit_alone_qualifies=true});
expectContractFailure('denominator-weakening',(row)=>{row.complete_denominator.opportunity_cost_required=false});
expectContractFailure('unadjudicated-receipt-injection',(row)=>{row.observed_receipts.push({event_type:'common_share_sale'})});
expectContractFailure('transaction-overclaim',(row)=>{row.observed_state.transaction_admissible=true});
expectContractFailure('federal-cash-overclaim',(row)=>{row.observed_state.federal_cash_custody_admissible=true});
expectContractFailure('public-account-overclaim',(row)=>{row.observed_state.public_account_booking_admissible=true});
expectContractFailure('distribution-overclaim',(row)=>{row.observed_state.distribution_admissible=true});
expectContractFailure('answer-authorization',(row)=>{row.observed_state.answer_change_authorized=true});
expectContractFailure('net-proceeds-complete',(row)=>{row.guardrails.net_proceeds_without_gross_ledger_are_complete=true});
expectContractFailure('treasury-without-classification',(row)=>{row.guardrails.treasury_deposit_without_tas_betc_is_complete_booking=true});
expectContractFailure('expected-answer-effectiveness',(row)=>{row.expected_result.answer_effectiveness=true});
expectContractFailure('graph-effect',(row)=>{row.boundaries.graph_effect='candidate_edge'});
expectContractFailure('issue-closure',(row)=>{row.boundaries.issue_345_may_close=true});
expectContractFailure('intel-specific-legal-conclusion',(row)=>{row.boundaries.claims_intel_specific_miscellaneous_receipts_determination=true});
expectContractFailure('coordinated-content-checksum-rewrite',(row)=>{
  row.control_sources[0].locator[0]='Mutated transaction control with a recomputed contract checksum.';
  const copy=clone(row);
  delete copy.contract_sha256;
  row.contract_sha256=semanticHash(copy);
});
expectContractFailure('checksum-rewrite',(row)=>{row.contract_sha256='0'.repeat(64)});
const semanticEquivalentContract=`${JSON.stringify(data.contract)}\n`;
assert.deepEqual(JSON.parse(semanticEquivalentContract),data.contract);
expectRawContractFailure('semantic-equivalent-byte-rewrite',semanticEquivalentContract);

expectFailure(
  'bilateral-acquisition-sale-overclaim',
  'M05_INTEL_BILATERAL_EXCEPTION_ACQUISITION_PATH',
  data.acquisition,
  (row)=>{row.expected_result.completed_sale_or_transfer_observed=true}
);
expectFailure(
  'monitor-gate-drift',
  'M05_INTEL_REALIZATION_MONITOR_PATH',
  data.monitor,
  (row)=>{row.target.ordinary_gate_utc='2026-08-18T00:00:00Z'}
);
expectFailure(
  'frontier-eligibility-inflation',
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  (row)=>{
    const target=row.frontiers.find((item)=>item.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION');
    target.time_gate.standard_sale_route_currently_eligible=true;
  }
);
expectFailure(
  'intel-federal-receipt-overclaim',
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  data.intel,
  (row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-intel-realization-accounting-admission-contract.test: OK');
