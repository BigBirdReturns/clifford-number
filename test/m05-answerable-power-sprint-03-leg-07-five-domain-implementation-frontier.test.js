#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  IMPLEMENTATION_FRONTIER_IDS,
  IMPLEMENTATION_ROUTE_CLASSES,
  applyFiveDomainImplementationFrontier,
  summarizeFiveDomainImplementationFrontier
} from '../tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const filePaths={
  frontier:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'),
  legacyLedger:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'),
  reconciliation:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'),
  realReceiptAudit:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'),
  robodebtReceipt:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'),
  intelCandidate:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'),
  hfuCandidate:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'),
  officialPacket:path.join(root,'data/project/m05-cross-domain-official-receipt-candidates.json'),
  priorAdjudication:path.join(root,'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'),
  contract:path.join(root,'data/project/m05-source-health-evidence-state-regression.json')
};
const read=(target)=>JSON.parse(fs.readFileSync(target,'utf8'));
const clone=(value)=>JSON.parse(JSON.stringify(value));
const data=Object.fromEntries(
  Object.entries(filePaths).map(([key,target])=>[key,read(target)])
);
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'m05-five-domain-implementation-frontier-'));

const inputs=()=>({
  officialPacket:data.officialPacket,
  priorAdjudication:data.priorAdjudication,
  contract:data.contract,
  intelCandidate:data.intelCandidate,
  hfuCandidate:data.hfuCandidate,
  reconciliation:data.reconciliation,
  robodebtReceipt:data.robodebtReceipt,
  legacyLedger:data.legacyLedger,
  frontier:data.frontier
});

const runValidator=(env={})=>spawnSync(
  process.execPath,
  ['tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.mjs'],
  {
    cwd:root,
    encoding:'utf8',
    env:{...process.env,...env}
  }
);

const baseRun=runValidator();
assert.equal(baseRun.status,0,`${baseRun.stdout}\n${baseRun.stderr}`);

const snapshots=Object.fromEntries(
  Object.entries(data)
    .filter(([key])=>key!=='frontier')
    .map(([key,value])=>[key,JSON.stringify(value)])
);
const summary=summarizeFiveDomainImplementationFrontier(inputs());
assert.equal(summary.frontier_records,5);
assert.equal(summary.inherited_probe_records,3);
assert.equal(summary.new_frontier_records,2);
assert.equal(summary.route_control_sources,1);
assert.equal(summary.active_public_record_frontiers,3);
assert.equal(summary.controlled_subject_or_archival_frontiers,1);
assert.equal(summary.future_time_gated_frontiers,1);
assert.equal(summary.candidate_evidence_records,5);
assert.equal(summary.repository_promotion_allowed,5);
assert.equal(summary.advanced_answer_dimensions,1);
assert.equal(summary.effective_answers,0);
assert.equal(summary.qualifying_jurisdictions,0);
assert.equal(summary.evidentiary_sufficiency,true);
assert.equal(summary.answer_effectiveness,false);
assert.equal(summary.cross_domain_regression_completed,false);
assert.deepEqual(summary.frontiers.map((row)=>row.frontier_id),IMPLEMENTATION_FRONTIER_IDS);
assert.deepEqual(Object.keys(summary.route_counts),IMPLEMENTATION_ROUTE_CLASSES);
assert.equal(summary.frontiers.every((row)=>row.evaluation.claim_evidence_admissible),true);
assert.equal(summary.frontiers.every((row)=>row.evaluation.repository_promotion_allowed),true);
assert.equal(summary.frontiers.every((row)=>!row.evaluation.answer_effective),true);
assert.equal(summary.applied.before_robodebt_observation.answer.dimensions.pre_action_timing,false);
assert.equal(summary.applied.after_robodebt_observation.answer.dimensions.pre_action_timing,true);
assert.equal(summary.applied.after_robodebt_observation.answer.dimensions.durability,false);
assert.equal(summary.regression.domain_observations_evaluated,5);
assert.equal(summary.regression.admissible_domain_evidence_records,5);
assert.equal(summary.regression.effective_domain_answers,0);

const byId=new Map(summary.frontiers.map((row)=>[row.frontier_id,row]));
const robodebt=byId.get('M05-IF-ADMIN-AU-ROBODEBT-DURABILITY');
assert.equal(robodebt.route_class,'active_public_record_acquisition');
assert.equal(robodebt.observation.answer.dimensions.pre_action_timing,true);
assert.equal(robodebt.observation.answer.dimensions.durability,false);
assert.deepEqual(robodebt.preserved_deficits,[
  'composed_durable_answer',
  'dimension:durability'
]);

const syri=byId.get('M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS');
assert.equal(syri.route_class,'controlled_subject_or_archival_acquisition');
assert.equal(syri.observation.answer.dimensions.evidence_access,false);

const foodinho=byId.get('M05-IF-WORK-IT-FOODINHO-COMPLIANCE');
assert.equal(foodinho.route_class,'active_public_record_acquisition');
assert.equal(foodinho.observation.answer.dimensions.pre_action_timing,false);
assert.equal(foodinho.observation.answer.dimensions.durability,false);

const hfu=byId.get('M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY');
assert.equal(hfu.route_class,'active_public_record_acquisition');
assert.equal(hfu.observation.answer.dimensions.practical_exit_or_governance,true);
assert.equal(hfu.observation.answer.dimensions.durability,false);
assert.equal(hfu.observation.answer.dimensions.independent_authority,false);
assert.equal(hfu.observation.answer.dimensions.effective_remedy,false);

const intel=byId.get('M05-IF-VALUE-US-INTEL-REALIZATION');
assert.equal(intel.route_class,'future_time_gated_monitoring');
assert.equal(intel.observation.answer.dimensions.practical_exit_or_governance,false);
assert.equal(intel.observation.answer.dimensions.durability,false);
assert.equal(data.frontier.frontiers.find((row)=>row.frontier_id===intel.frontier_id).time_gate.days_until_standard_eligibility,10);
assert.equal(data.frontier.frontiers.find((row)=>row.frontier_id===intel.frontier_id).time_gate.standard_sale_route_currently_eligible,false);
assert.equal(data.frontier.route_control_sources[0].control_effect.registration_is_sale,false);
assert.equal(data.frontier.route_control_sources[0].control_effect.exception_requires_bilateral_agreement,true);

for(const [key,snapshot] of Object.entries(snapshots)){
  assert.equal(JSON.stringify(data[key]),snapshot);
}

const appliedAgain=applyFiveDomainImplementationFrontier(inputs());
assert.deepEqual(appliedAgain.derived_contract.domain_observations.map((row)=>row.domain_id),[
  'APC-ADMIN-01',
  'APC-COERCION-01',
  'APC-WORK-01',
  'APC-EXIT-01',
  'APC-VALUE-01'
]);
assert.equal(appliedAgain.derived_contract.domain_observations.every((row)=>row.promotes_to==='candidate_evidence'),true);
assert.equal(appliedAgain.derived_contract.domain_observations.every((row)=>row.evidence.promotion_authority===true),true);
assert.equal(appliedAgain.derived_contract.domain_observations.every((row)=>row.answer.composed_durable_answer===false),true);

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
const expectFrontierFailure=(label,mutate)=>expectFailure(
  label,
  'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
  data.frontier,
  mutate
);

expectFrontierFailure('schema-drift',(row)=>{row.schema_version='m05-broken@1'});
expectFrontierFailure('canonical-base-drift',(row)=>{row.canonical_base.sha='0'.repeat(40)});
expectFrontierFailure('legacy-ledger-blob-drift',(row)=>{row.bindings.legacy_implementation_gap_ledger.blob_sha='0'.repeat(40)});
expectFrontierFailure('five-domain-blob-drift',(row)=>{row.bindings.five_domain_claim_evidence_reconciliation.blob_sha='0'.repeat(40)});
expectFrontierFailure('denominator-reduction',(row)=>{row.frontiers.pop();row.frontier_count=4});
expectFrontierFailure('frontier-reordering',(row)=>{row.frontiers.reverse()});
expectFrontierFailure('route-class-drift',(row)=>{row.frontiers[0].route_class='future_time_gated_monitoring'});
expectFrontierFailure('wave-drift',(row)=>{row.frontiers[0].execution_wave=2});
expectFrontierFailure('robodebt-durability-overclaim',(row)=>{row.frontiers[0].current_dimension_state.durability=true});
expectFrontierFailure('robodebt-deficit-erasure',(row)=>{row.frontiers[0].preserved_deficits=[]});
expectFrontierFailure('syri-access-overclaim',(row)=>{row.frontiers[1].current_dimension_state.evidence_access=true});
expectFrontierFailure('syri-bulk-polling',(row)=>{row.frontiers[1].access_boundary.direct_voice_bulk_polling_allowed=true});
expectFrontierFailure('foodinho-compliance-overclaim',(row)=>{row.frontiers[2].route_guardrails.compliance_intention_is_completed_compliance=true});
expectFrontierFailure('hfu-sovereignty-overclaim',(row)=>{row.frontiers[3].current_dimension_state.durability=true});
expectFrontierFailure('hfu-public-code-overclaim',(row)=>{row.frontiers[3].route_guardrails.public_source_code_is_supplier_free_operation=true});
expectFrontierFailure('intel-early-eligibility',(row)=>{row.frontiers[4].time_gate.standard_sale_route_currently_eligible=true});
expectFrontierFailure('intel-date-drift',(row)=>{row.frontiers[4].time_gate.standard_sale_route_eligible_as_of='2026-08-17'});
expectFrontierFailure('intel-exception-overclaim',(row)=>{row.frontiers[4].time_gate.exception_agreement_observed=true});
expectFrontierFailure('intel-registration-overclaim',(row)=>{row.frontiers[4].route_guardrails.registration_is_completed_sale=true});
expectFrontierFailure('intel-control-source-mutation',(row)=>{row.route_control_sources[0].locator[0]+=' mutated'});
expectFrontierFailure('public-route-count-inflation',(row)=>{row.expected_result.active_public_record_frontiers=4});
expectFrontierFailure('answer-effectiveness-overclaim',(row)=>{row.expected_result.answer_effectiveness=true});
expectFrontierFailure('cross-domain-overclaim',(row)=>{row.expected_result.cross_domain_regression_completed=true});
expectFrontierFailure('issue-closure-overclaim',(row)=>{row.boundaries.issue_345_may_close=true});
expectFrontierFailure('search-exhaustiveness-overclaim',(row)=>{row.boundaries.claims_bounded_search_exhaustiveness=true});
expectFrontierFailure('graph-effect-overclaim',(row)=>{row.boundaries.graph_effect='promote'});
expectFrontierFailure('claim-admission-answer-overclaim',(row)=>{row.execution_policy.claim_admission_counts_as_answer=true});
expectFrontierFailure('failed-route-deletion',(row)=>{row.execution_policy.failed_routes_preserved=false});
expectFrontierFailure('wave-partition-drift',(row)=>{row.execution_waves[0].frontier_ids.pop()});

expectFailure(
  'legacy-probe-mutation',
  'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
  data.legacyLedger,
  (row)=>{row.probes[0].probe_result.answer_changes_authorized=true}
);
expectFailure(
  'reconciliation-mutation',
  'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
  data.reconciliation,
  (row)=>{row.expected_result.total_claim_evidence_admissible=4}
);
expectFailure(
  'robodebt-target-mutation',
  'M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',
  data.robodebtReceipt,
  (row)=>{row.target.after=false}
);
expectFailure(
  'intel-realization-source-mutation',
  'M05_INTEL_RECEIPT_CANDIDATE_PATH',
  data.intelCandidate,
  (row)=>{row.receipt.instrument_chain.identified_federal_cash_receipt=true}
);
expectFailure(
  'hfu-custody-source-mutation',
  'M05_HFU_RECEIPT_CANDIDATE_PATH',
  data.hfuCandidate,
  (row)=>{row.receipt.transition_chain.former_supplier_deletion_certificate=true}
);
expectFailure(
  'packet-mutation',
  'M05_OFFICIAL_RECEIPT_PACKET_PATH',
  data.officialPacket,
  (row)=>{row.records[0].claim_binding.claim+=' mutated'}
);
expectFailure(
  'prior-adjudication-mutation',
  'M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',
  data.priorAdjudication,
  (row)=>{row.adjudications[0].promotion_authority=false}
);
expectFailure(
  'contract-answer-guard-mutation',
  'M05_EVIDENCE_STATE_CONTRACT_PATH',
  data.contract,
  (row)=>{row.answer_effectiveness_contract.human_in_loop_alone_is_sufficient=true}
);
expectFailure(
  'real-receipt-audit-mutation',
  'M05_REAL_RECEIPT_AUDIT_PATH',
  data.realReceiptAudit,
  (row)=>{row.required_real_receipt_fields=[]}
);

fs.rmSync(tempRoot,{recursive:true,force:true});
console.log('m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.test: OK');
