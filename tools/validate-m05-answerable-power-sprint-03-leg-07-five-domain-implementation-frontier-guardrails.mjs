#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frontierPath=path.resolve(
  root,
  process.env.M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH||
    'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
);
const frontier=JSON.parse(fs.readFileSync(frontierPath,'utf8'));
const fail=(message)=>{throw new Error(message)};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

const expectedGuardrails={
  'M05-IF-ADMIN-AU-ROBODEBT-DURABILITY':{
    implementation_statement_is_independent_assurance_result:false,
    requestable_pause_is_observed_pause:false,
    adjacent_case_is_robodebt_subject_case:false,
    pre_action_timing_is_durability:false
  },
  'M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS':{
    formal_access_route_is_fulfilled_access:false,
    data_destruction_is_subject_level_explanation:false,
    register_queryability_is_disclosed_reasoning:false
  },
  'M05-IF-WORK-IT-FOODINHO-COMPLIANCE':{
    compliance_intention_is_completed_compliance:false,
    implementation_extension_is_closure:false,
    corrective_order_is_operated_safeguard:false,
    later_sanction_is_recurrence_free_durability:false
  },
  'M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY':{
    supplier_contract_exit_is_residual_custody_reconciliation:false,
    public_source_code_is_supplier_free_operation:false,
    official_savings_claim_is_independent_reconciliation:false,
    operating_guidance_is_affected_party_governance:false,
    active_maintenance_is_cloud_independence:false
  },
  'M05-IF-VALUE-US-INTEL-REALIZATION':{
    registration_is_completed_sale:false,
    escrow_release_is_federal_cash_receipt:false,
    mark_to_market_value_is_realized_return:false,
    issuer_receives_no_proceeds_means_federal_receives_no_proceeds:false,
    government_ownership_is_public_distribution:false
  }
};

const frontiers=Array.isArray(frontier.frontiers)?frontier.frontiers:[];
if(frontiers.length!==Object.keys(expectedGuardrails).length){
  fail('guardrail frontier denominator drift');
}
const actualIds=frontiers.map((row)=>row.frontier_id);
const expectedIds=Object.keys(expectedGuardrails);
if(!same(actualIds,expectedIds))fail('guardrail frontier identity or order drift');

for(const row of frontiers){
  if(!Object.hasOwn(row,'route_guardrails')){
    fail(`${row.frontier_id} route_guardrails missing`);
  }
  const actual=row.route_guardrails;
  if(actual===null||Array.isArray(actual)||typeof actual!=='object'){
    fail(`${row.frontier_id} route_guardrails is not an object`);
  }
  const expected=expectedGuardrails[row.frontier_id];
  const actualKeys=Object.keys(actual);
  const expectedKeys=Object.keys(expected);
  if(!same(actualKeys,expectedKeys)){
    fail(`${row.frontier_id} route_guardrail key set or order drift`);
  }
  for(const key of expectedKeys){
    if(!Object.hasOwn(actual,key))fail(`${row.frontier_id} guardrail ${key} missing`);
    if(actual[key]!==false)fail(`${row.frontier_id} guardrail ${key} weakened`);
  }
}

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-five-domain-implementation-frontier-guardrails',
  frontier_records:frontiers.length,
  guardrail_records:frontiers.reduce((sum,row)=>sum+Object.keys(row.route_guardrails).length,0),
  exact_guardrail_contract:true
},null,2));
