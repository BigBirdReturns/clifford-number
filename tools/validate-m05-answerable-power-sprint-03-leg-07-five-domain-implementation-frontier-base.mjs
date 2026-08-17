#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  IMPLEMENTATION_FRONTIER_IDS,
  IMPLEMENTATION_FRONTIER_RECEIPT_IDS,
  IMPLEMENTATION_FRONTIER_DOMAIN_IDS,
  IMPLEMENTATION_FRONTIER_JURISDICTIONS,
  IMPLEMENTATION_ROUTE_CLASSES,
  summarizeFiveDomainImplementationFrontier
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.mjs';
import {
  summarizeFiveDomainClaimEvidenceReconciliation
} from './lib/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resolvePath=(envName,fallback)=>path.resolve(root,process.env[envName]||fallback);
const paths={
  frontier:resolvePath(
    'M05_FIVE_DOMAIN_IMPLEMENTATION_FRONTIER_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-implementation-frontier.json'
  ),
  legacyLedger:resolvePath(
    'M05_IMPLEMENTATION_GAP_LEDGER_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json'
  ),
  reconciliation:resolvePath(
    'M05_FIVE_DOMAIN_RECONCILIATION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json'
  ),
  realReceiptAudit:resolvePath(
    'M05_REAL_RECEIPT_AUDIT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json'
  ),
  robodebtReceipt:resolvePath(
    'M05_ROBODEBT_IMPLEMENTATION_RECEIPT_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json'
  ),
  intelCandidate:resolvePath(
    'M05_INTEL_RECEIPT_CANDIDATE_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json'
  ),
  hfuCandidate:resolvePath(
    'M05_HFU_RECEIPT_CANDIDATE_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'
  ),
  officialPacket:resolvePath(
    'M05_OFFICIAL_RECEIPT_PACKET_PATH',
    'data/project/m05-cross-domain-official-receipt-candidates.json'
  ),
  priorAdjudication:resolvePath(
    'M05_PRIOR_CLAIM_PROMOTION_ADJUDICATION_PATH',
    'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json'
  ),
  contract:resolvePath(
    'M05_EVIDENCE_STATE_CONTRACT_PATH',
    'data/project/m05-source-health-evidence-state-regression.json'
  )
};

const readRaw=(target)=>fs.readFileSync(target);
const gitBlobSha=(buffer)=>crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${buffer.length}\0`,'utf8'))
  .update(buffer)
  .digest('hex');
const sha256Json=(value)=>crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const sorted=(values)=>[...values].sort();
const text=(value,min=1)=>typeof value==='string'&&value.trim().length>=min;
const fail=(message)=>{throw new Error(message)};
const dayDifference=(from,to)=>(
  Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`)
)/86400000;

const raw=Object.fromEntries(
  Object.entries(paths).map(([key,target])=>[key,readRaw(target)])
);
const data=Object.fromEntries(
  Object.entries(raw).map(([key,buffer])=>[key,JSON.parse(buffer.toString('utf8'))])
);
const {
  frontier,
  legacyLedger,
  reconciliation,
  realReceiptAudit,
  robodebtReceipt,
  intelCandidate,
  hfuCandidate,
  officialPacket,
  priorAdjudication,
  contract
}=data;
const sourceSnapshots=Object.fromEntries(
  Object.entries(data)
    .filter(([key])=>key!=='frontier')
    .map(([key,value])=>[key,JSON.stringify(value)])
);

if(frontier.schema_version!=='m05-answerable-power-s03-l7-five-domain-implementation-frontier@1')fail('frontier schema drift');
if(frontier.object_class!=='bounded_five_domain_implementation_acquisition_frontier')fail('frontier object class drift');
if(frontier.program_id!=='M-05'||frontier.sprint_id!=='M05-SPRINT-03'||frontier.leg_id!=='S03-L7')fail('frontier program binding drift');
if(frontier.issue!==345)fail('frontier issue identity drift');
if(frontier.as_of!=='2026-08-17')fail('frontier as-of drift');
if(frontier.status!=='five_domain_implementation_frontier_frozen')fail('frontier status drift');
if(!text(frontier.title,40)||!text(frontier.question,180))fail('frontier title or question is under-specified');
if(frontier.canonical_base?.branch!=='main')fail('canonical branch drift');
if(frontier.canonical_base?.sha!=='f67ea1abd09f18f5e02dd1f8b34887a1f863aa0e')fail('canonical base drift');
if(frontier.canonical_base?.tree_sha!=='a2710a47a87241160c3692932348712fdb599446')fail('canonical tree drift');
if(frontier.canonical_base?.five_domain_reconciliation_pull_request!==2161)fail('canonical reconciliation PR drift');

const bindingDefinitions={
  legacy_implementation_gap_ledger:{
    dataKey:'legacyLedger',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-implementation-gap-probe-ledger.json',
    blob:'ec0f9e68804c54ad487eb08a8ec8691bbd4db2bf',
    schema:'m05-answerable-power-s03-l7-implementation-gap-probe-ledger@1'
  },
  five_domain_claim_evidence_reconciliation:{
    dataKey:'reconciliation',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-five-domain-claim-evidence-reconciliation.json',
    blob:'f2784666aa55fcf92d4523ee01765f1b623fcb35',
    schema:'m05-answerable-power-s03-l7-five-domain-claim-evidence-reconciliation@1'
  },
  real_receipt_admission_audit:{
    dataKey:'realReceiptAudit',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-real-receipt-admission-audit.json',
    blob:'4dce5e6d28c427a8c5fff3953c44d0e1e5a1f99f',
    schema:'m05-answerable-power-s03-l7-real-receipt-admission-audit@1'
  },
  robodebt_pre_action_implementation_receipt:{
    dataKey:'robodebtReceipt',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-robodebt-pre-action-implementation-receipt.json',
    blob:'a31d7ea7a1432a169de31035c153210b8975e217',
    schema:'m05-answerable-power-s03-l7-robodebt-pre-action-implementation-receipt@1'
  },
  intel_receipt_candidate:{
    dataKey:'intelCandidate',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-intel-chips-equity-receipt-candidate.json',
    blob:'ff88d6d3cd6ae021f7ecbbe596026b82f15ce58a',
    schema:'m05-answerable-power-s03-l7-intel-chips-equity-receipt-candidate@1'
  },
  hfu_receipt_candidate:{
    dataKey:'hfuCandidate',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json',
    blob:'8d864b004f3319dae39a5b74b746581d42d768d1',
    schema:'m05-answerable-power-s03-l7-hfu-share-exit-receipt-candidate@1'
  },
  official_receipt_packet:{
    dataKey:'officialPacket',
    path:'data/project/m05-cross-domain-official-receipt-candidates.json',
    blob:'1c17549a39b826853435d3726596bf41d0fc7de9',
    schema:'m05-cross-domain-official-receipt-candidates@1'
  },
  prior_promotion_adjudication:{
    dataKey:'priorAdjudication',
    path:'data/project/m05-answerable-power-sprint-03-leg-07-claim-evidence-promotion-adjudication.json',
    blob:'e64f24fb74094b99e717c2cd03af8e0620d23f15',
    schema:'m05-answerable-power-s03-l7-claim-evidence-promotion-adjudication@1'
  },
  evidence_state_contract:{
    dataKey:'contract',
    path:'data/project/m05-source-health-evidence-state-regression.json',
    blob:'72f7ce6c711e07c5f8c72355d2b2c491a4dc7a33',
    schema:'m05-source-health-evidence-state-regression@1'
  }
};
for(const [bindingId,definition] of Object.entries(bindingDefinitions)){
  const binding=frontier.bindings?.[bindingId];
  if(!binding)fail(`missing binding ${bindingId}`);
  if(binding.path!==definition.path)fail(`${bindingId} path drift`);
  if(binding.blob_sha!==definition.blob)fail(`${bindingId} declared blob drift`);
  if(gitBlobSha(raw[definition.dataKey])!==definition.blob)fail(`${bindingId} Git object drift`);
  if(binding.schema_version!==definition.schema)fail(`${bindingId} schema binding drift`);
  if(data[definition.dataKey].schema_version!==definition.schema)fail(`${bindingId} source schema drift`);
}
if(frontier.bindings.legacy_implementation_gap_ledger.commit!=='359caf0d3725bbbae570b11fa7f65fd553bf72f7')fail('legacy ledger commit drift');
if(frontier.bindings.legacy_implementation_gap_ledger.probe_count!==3)fail('legacy probe count binding drift');
if(frontier.bindings.five_domain_claim_evidence_reconciliation.pull_request!==2161||frontier.bindings.five_domain_claim_evidence_reconciliation.merge_commit!=='f67ea1abd09f18f5e02dd1f8b34887a1f863aa0e')fail('five-domain reconciliation publication drift');
if(frontier.bindings.real_receipt_admission_audit.pull_request!==2152||frontier.bindings.real_receipt_admission_audit.merge_commit!=='cc20bf5720ccb22036351e7aa009590cc6dc6081')fail('real-receipt audit publication drift');
if(frontier.bindings.robodebt_pre_action_implementation_receipt.pull_request!==2155||frontier.bindings.robodebt_pre_action_implementation_receipt.merge_commit!=='3e9132f1628fe96989b931f56a302bf69907ef99')fail('Robodebt implementation publication drift');
if(frontier.bindings.intel_receipt_candidate.pull_request!==2156||frontier.bindings.intel_receipt_candidate.merge_commit!=='3e13165dcd033f4c0b7a983af7b8a613622a1896')fail('Intel candidate publication drift');
if(frontier.bindings.hfu_receipt_candidate.pull_request!==2159||frontier.bindings.hfu_receipt_candidate.merge_commit!=='8ec1941ae75ff2df1b9ba0aa0219b38b75d255d6')fail('HFU candidate publication drift');

if(realReceiptAudit.issue!==345||realReceiptAudit.status!=='real_receipt_admission_audit_frozen')fail('real-receipt audit identity drift');
if(legacyLedger.issue!==345||legacyLedger.status!=='implementation_gaps_researched_no_answer_promotion')fail('legacy implementation ledger identity drift');
if(legacyLedger.probe_count!==3||(legacyLedger.probes||[]).length!==3)fail('legacy implementation denominator drift');
const expectedLegacyProbeIds=[
  'M05-IP-ADMIN-AU-ROBODEBT-PRE-ACTION-DURABILITY',
  'M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS',
  'M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY'
];
if(!same(legacyLedger.probes.map((row)=>row.probe_id),expectedLegacyProbeIds))fail('legacy probe identity or order drift');
if(legacyLedger.probes.some((row)=>row.probe_result?.answer_changes_authorized!==false||row.probe_result?.promotion_changes_authorized!==false))fail('legacy implementation boundary drift');

const reconciliationSummary=summarizeFiveDomainClaimEvidenceReconciliation({
  officialPacket,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation
});
if(reconciliationSummary.audited_domains!==5||reconciliationSummary.total_claim_evidence_admissible!==5||reconciliationSummary.total_repository_promotion_allowed!==5)fail('five-domain evidence denominator drift');
if(reconciliationSummary.effective_answers!==0||reconciliationSummary.answer_effectiveness!==false||reconciliationSummary.cross_domain_regression_completed!==false)fail('five-domain answer boundary drift');

if(
  robodebtReceipt.target?.receipt_id!=='M05-RC-ADMIN-AU-ROBODEBT'||
  robodebtReceipt.target?.domain_id!=='APC-ADMIN-01'||
  robodebtReceipt.target?.jurisdiction!=='AU'||
  robodebtReceipt.target?.dimension!=='pre_action_timing'||
  robodebtReceipt.target?.before!==false||
  robodebtReceipt.target?.after!==true
)fail('Robodebt implementation target drift');
if(!same(robodebtReceipt.retained_deficits,[
  'composed_durable_answer',
  'dimension:durability'
]))fail('Robodebt retained deficit drift');
if(robodebtReceipt.dimension_adjudication?.changes_other_answer_dimensions!==false||robodebtReceipt.dimension_adjudication?.claims_answer_effectiveness!==false)fail('Robodebt answer-scope boundary drift');

const policy=frontier.execution_policy||{};
if(policy.denominator_frozen!==5)fail('execution denominator drift');
if(!same(policy.route_classes,IMPLEMENTATION_ROUTE_CLASSES))fail('route-class registry drift');
if(policy.priority_is_operational_not_epistemic!==true)fail('route priority semantics drift');
if(!text(policy.priority_rule,180))fail('route priority rule is under-specified');
if(policy.active_routes_may_execute_in_parallel!==true)fail('active route execution policy drift');
for(const key of [
  'direct_voice_bulk_polling_allowed',
  'access_controls_bypassed',
  'metadata_counts_as_substantive_content',
  'adjacent_case_transfer_allowed',
  'claim_admission_counts_as_answer'
]){
  if(policy[key]!==false)fail(`unsafe execution policy ${key}`);
}
if(policy.failed_routes_preserved!==true||policy.non_transfer_results_preserved!==true)fail('execution preservation policy drift');

const routeControlSources=Array.isArray(frontier.route_control_sources)?frontier.route_control_sources:[];
if(routeControlSources.length!==1)fail('route-control source denominator drift');
const intelControl=routeControlSources[0];
if(intelControl.source_id!=='US-INTEL-CHIPS-2026-RESALE-TIMING-PROSPECTUS')fail('Intel route-control source identity drift');
if(intelControl.authority!=='Intel Corporation, filed with the United States Securities and Exchange Commission')fail('Intel route-control authority drift');
if(intelControl.record_type!=='source_native_primary_record'||intelControl.published_at!=='2026-01-23')fail('Intel route-control source class or date drift');
let intelControlUrl;
try{intelControlUrl=new URL(intelControl.url)}catch{fail('Intel route-control URL is invalid')}
if(intelControlUrl.protocol!=='https:'||intelControlUrl.hostname!=='www.sec.gov'||intelControlUrl.pathname!=='/Archives/edgar/data/50863/000005086326000027/a01232026424b7.htm')fail('Intel route-control source boundary drift');
if(!Array.isArray(intelControl.locator)||intelControl.locator.length!==3||intelControl.locator.some((row)=>!text(row,100)))fail('Intel route-control locator drift');
const expectedControlEffect={
  standard_sale_route_eligible_as_of:'2026-08-27',
  exception_requires_bilateral_agreement:true,
  registration_is_sale:false,
  issuer_receives_sale_proceeds:false,
  federal_cash_receipt_established:false,
  public_distribution_established:false
};
if(!same(intelControl.control_effect,expectedControlEffect))fail('Intel route-control effect drift');
const expectedIntelControlSha256='8c55b72d127b19ee23d3b8d75e904470850cdb9872c00e8c4eb3f1023a026fe0';
if(sha256Json(intelControl)!==expectedIntelControlSha256)fail('Intel route-control record custody drift');

const frontiers=Array.isArray(frontier.frontiers)?frontier.frontiers:[];
if(frontier.frontier_count!==5||frontiers.length!==5)fail('implementation frontier denominator drift');
if(!same(frontiers.map((row)=>row.frontier_id),IMPLEMENTATION_FRONTIER_IDS))fail('frontier identity or order drift');
if(!same(frontiers.map((row)=>row.receipt_id),IMPLEMENTATION_FRONTIER_RECEIPT_IDS))fail('frontier receipt identity or order drift');
if(!same(frontiers.map((row)=>row.domain_id),IMPLEMENTATION_FRONTIER_DOMAIN_IDS))fail('frontier domain identity or order drift');
if(!same(frontiers.map((row)=>row.jurisdiction),IMPLEMENTATION_FRONTIER_JURISDICTIONS))fail('frontier jurisdiction identity or order drift');
if(new Set(frontiers.map((row)=>row.frontier_id)).size!==5)fail('duplicate frontier identity');

const legacyProbeById=new Map(legacyLedger.probes.map((row)=>[row.probe_id,row]));
const reconciliationDecisionByReceipt=new Map(
  reconciliation.adjudications.map((row)=>[row.receipt_id,row])
);
const frontierDefinitions={
  'M05-IF-ADMIN-AU-ROBODEBT-DURABILITY':{
    inherited:'M05-IP-ADMIN-AU-ROBODEBT-PRE-ACTION-DURABILITY',
    route:'active_public_record_acquisition',
    activation:'active_now',
    wave:1,
    dimensions:{pre_action_timing:true,durability:false,composed_durable_answer:false},
    deficits:robodebtReceipt.retained_deficits
  },
  'M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS':{
    inherited:'M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS',
    route:'controlled_subject_or_archival_acquisition',
    activation:'active_access_bounded',
    wave:2,
    dimensions:{evidence_access:false,composed_durable_answer:false},
    deficits:legacyProbeById.get('M05-IP-COERCION-NL-SYRI-EVIDENCE-ACCESS').target_deficits
  },
  'M05-IF-WORK-IT-FOODINHO-COMPLIANCE':{
    inherited:'M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY',
    route:'active_public_record_acquisition',
    activation:'active_now',
    wave:1,
    dimensions:{pre_action_timing:false,durability:false,composed_durable_answer:false},
    deficits:legacyProbeById.get('M05-IP-WORK-IT-FOODINHO-PRE-ACTION-DURABILITY').target_deficits
  },
  'M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY':{
    inherited:null,
    route:'active_public_record_acquisition',
    activation:'active_now',
    wave:1,
    dimensions:{
      independent_authority:false,
      effective_remedy:false,
      durability:false,
      practical_exit_or_governance:true,
      composed_durable_answer:false
    },
    deficits:reconciliationDecisionByReceipt.get('M05-RC-EXIT-UK-HFU-SHARE').preserved_deficits
  },
  'M05-IF-VALUE-US-INTEL-REALIZATION':{
    inherited:null,
    route:'future_time_gated_monitoring',
    activation:'monitor_not_before_date_unless_exception_recorded',
    wave:3,
    dimensions:{
      independent_authority:false,
      effective_remedy:false,
      durability:false,
      practical_exit_or_governance:false,
      composed_durable_answer:false
    },
    deficits:reconciliationDecisionByReceipt.get('M05-RC-VALUE-US-INTEL-CHIPS-EQUITY').preserved_deficits
  }
};

for(const row of frontiers){
  const expected=frontierDefinitions[row.frontier_id];
  if(!expected)fail(`unexpected frontier ${row.frontier_id}`);
  if(row.inherited_probe_id!==expected.inherited)fail(`${row.frontier_id} inherited probe drift`);
  if(row.inherited_probe_id&&!legacyProbeById.has(row.inherited_probe_id))fail(`${row.frontier_id} missing inherited probe`);
  if(row.route_class!==expected.route||row.activation_state!==expected.activation||row.execution_wave!==expected.wave)fail(`${row.frontier_id} routing state drift`);
  if(!same(row.current_dimension_state,expected.dimensions))fail(`${row.frontier_id} dimension-state declaration drift`);
  if(!same(sorted(row.preserved_deficits||[]),sorted(expected.deficits||[])))fail(`${row.frontier_id} preserved deficit drift`);
  if(!Array.isArray(row.required_receipts)||row.required_receipts.length<1||row.required_receipts.some((value)=>!text(value,100)))fail(`${row.frontier_id} required-receipt definition drift`);
  if(!Array.isArray(row.allowed_source_classes)||row.allowed_source_classes.length<3||new Set(row.allowed_source_classes).size!==row.allowed_source_classes.length)fail(`${row.frontier_id} allowed source-class drift`);
  if(row.answer_changes_authorized!==false)fail(`${row.frontier_id} authorizes answer changes`);
  for(const [key,value] of Object.entries(row.route_guardrails||{})){
    if(value!==false)fail(`${row.frontier_id} guardrail ${key} weakened`);
  }
}

const syri=frontiers.find((row)=>row.frontier_id==='M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS');
if(!same(syri.access_boundary,{
  subject_consent_or_lawful_public_record_required:true,
  direct_voice_bulk_polling_allowed:false,
  access_controls_bypassed:false,
  person_level_record_may_be_inferred_from_formal_route:false
}))fail('SyRI access boundary drift');

const intel=frontiers.find((row)=>row.frontier_id==='M05-IF-VALUE-US-INTEL-REALIZATION');
if(intel.route_control_source_id!==intelControl.source_id)fail('Intel route-control join drift');
const expectedTimeGate={
  as_of:'2026-08-17',
  standard_sale_route_eligible_as_of:'2026-08-27',
  days_until_standard_eligibility:10,
  standard_sale_route_currently_eligible:false,
  exception_requires_bilateral_agreement:true,
  exception_agreement_observed:false
};
if(!same(intel.time_gate,expectedTimeGate))fail('Intel time-gate state drift');
if(dayDifference(intel.time_gate.as_of,intel.time_gate.standard_sale_route_eligible_as_of)!==intel.time_gate.days_until_standard_eligibility)fail('Intel time-gate arithmetic drift');
if(Date.parse(`${intel.time_gate.as_of}T00:00:00Z`)>=Date.parse(`${intel.time_gate.standard_sale_route_eligible_as_of}T00:00:00Z`))fail('Intel route is not future-gated');
if(intelCandidate.receipt?.instrument_chain?.realized_sale_dividend_or_warrant_exercise!==false||intelCandidate.receipt?.instrument_chain?.identified_federal_cash_receipt!==false||intelCandidate.receipt?.instrument_chain?.transparent_public_or_affected_party_distribution!==false)fail('Intel source nonfinding drift');
if(hfuCandidate.receipt?.transition_chain?.independent_end_to_end_migration_assurance!==false||hfuCandidate.receipt?.transition_chain?.former_supplier_deletion_certificate!==false||hfuCandidate.receipt?.transition_chain?.affected_party_post_exit_governance!==false)fail('HFU source nonfinding drift');

const waves=Array.isArray(frontier.execution_waves)?frontier.execution_waves:[];
const expectedWaves=[
  {
    wave:1,
    route_class:'active_public_record_acquisition',
    frontier_ids:[
      'M05-IF-ADMIN-AU-ROBODEBT-DURABILITY',
      'M05-IF-WORK-IT-FOODINHO-COMPLIANCE',
      'M05-IF-EXIT-UK-HFU-ASSURANCE-CUSTODY'
    ],
    parallel_eligible:true
  },
  {
    wave:2,
    route_class:'controlled_subject_or_archival_acquisition',
    frontier_ids:['M05-IF-COERCION-NL-SYRI-SUBJECT-ACCESS'],
    parallel_eligible:false
  },
  {
    wave:3,
    route_class:'future_time_gated_monitoring',
    frontier_ids:['M05-IF-VALUE-US-INTEL-REALIZATION'],
    parallel_eligible:false
  }
];
if(!same(waves,expectedWaves))fail('execution-wave registry drift');
const waveMembers=waves.flatMap((row)=>row.frontier_ids);
if(!same(sorted(waveMembers),sorted(IMPLEMENTATION_FRONTIER_IDS)))fail('execution waves do not partition the frontier');

const summary=summarizeFiveDomainImplementationFrontier({
  officialPacket,
  priorAdjudication,
  contract,
  intelCandidate,
  hfuCandidate,
  reconciliation,
  robodebtReceipt,
  legacyLedger,
  frontier
});
for(const [key,snapshot] of Object.entries(sourceSnapshots)){
  if(JSON.stringify(data[key])!==snapshot)fail(`frontier evaluation mutated source object ${key}`);
}
for(const row of summary.frontiers){
  if(row.evaluation.claim_evidence_admissible!==true||row.evaluation.repository_promotion_allowed!==true)fail(`${row.frontier_id} lost candidate-evidence admission`);
  if(row.evaluation.answer_effective!==false)fail(`${row.frontier_id} escaped answer-effectiveness boundary`);
  for(const [dimension,value] of Object.entries(row.current_dimension_state)){
    const observed=dimension==='composed_durable_answer'
      ?row.observation.answer.composed_durable_answer
      :row.observation.answer.dimensions[dimension];
    if(observed!==value)fail(`${row.frontier_id} computed dimension ${dimension} drift`);
  }
}
if(summary.applied.before_robodebt_observation.answer.dimensions.pre_action_timing!==false||summary.applied.after_robodebt_observation.answer.dimensions.pre_action_timing!==true)fail('Robodebt chronology reconciliation drift');
if(summary.regression.domain_observations_evaluated!==5||summary.regression.admissible_domain_evidence_records!==5)fail('computed five-domain denominator drift');
if(summary.regression.effective_domain_answers!==0||summary.regression.answer_effectiveness!==false||summary.regression.cross_domain_regression_completed!==false)fail('computed answer boundary drift');

const computed={
  frontier_records:summary.frontier_records,
  inherited_probe_records:summary.inherited_probe_records,
  new_frontier_records:summary.new_frontier_records,
  route_control_sources:summary.route_control_sources,
  active_public_record_frontiers:summary.active_public_record_frontiers,
  controlled_subject_or_archival_frontiers:summary.controlled_subject_or_archival_frontiers,
  future_time_gated_frontiers:summary.future_time_gated_frontiers,
  candidate_evidence_records:summary.candidate_evidence_records,
  repository_promotion_allowed:summary.repository_promotion_allowed,
  advanced_answer_dimensions:summary.advanced_answer_dimensions,
  effective_answers:summary.effective_answers,
  qualifying_jurisdictions:summary.qualifying_jurisdictions,
  evidentiary_sufficiency:summary.evidentiary_sufficiency,
  answer_effectiveness:summary.answer_effectiveness,
  cross_domain_regression_completed:summary.cross_domain_regression_completed,
  issue_345_may_close:false
};
if(!same(computed,frontier.expected_result))fail('expected frontier result drift');
if(!text(frontier.scope_note,300))fail('frontier scope note is under-specified');

const boundaries=frontier.boundaries||{};
for(const key of [
  'changes_legacy_probe_ledger',
  'changes_five_domain_reconciliation',
  'changes_robodebt_implementation_receipt',
  'changes_intel_candidate',
  'changes_hfu_candidate',
  'creates_new_empirical_answer_receipt',
  'claims_bounded_search_exhaustiveness',
  'claims_current_public_nonexistence',
  'claim_admission_is_answer_effectiveness',
  'robodebt_pre_action_is_durability',
  'formal_access_route_is_fulfilled_access',
  'foodinho_extension_is_compliance',
  'hfu_supplier_exit_is_complete_sovereignty',
  'intel_registration_is_sale',
  'intel_time_gate_proves_no_exception',
  'claims_independent_external_review',
  'claims_human_review',
  'claims_answer_effectiveness',
  'claims_cross_domain_completion',
  'issue_345_may_close',
  'conclusion_generated',
  'project_complete'
]){
  if(boundaries[key]!==false)fail(`frontier boundary ${key} weakened`);
}
if(boundaries.promotes_to!=='candidate_only'||boundaries.graph_effect!=='none')fail('frontier repository boundary drift');

console.log(JSON.stringify({
  validator:'m05-answerable-power-s03-l7-five-domain-implementation-frontier',
  ...computed
},null,2));
