#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const sourceFiles=[
  'data/project/m05-answerable-power-sprint-05-plan.json',
  'data/project/m05-answerable-power-sprint-05-leg-01-conformance.json',
  'data/project/m05-answerable-power-sprint-05-leg-02-threat-model.json',
  'data/project/m05-answerable-power-sprint-05-leg-03-entry-gate.json',
  'data/project/m05-answerable-power-sprint-05-leg-04-governance.json',
  'data/project/m05-answerable-power-sprint-05-leg-05-candidate-landscape.json',
  'data/project/m05-answerable-power-sprint-05-leg-06-preregistration.json',
  'data/project/m05-answerable-power-sprint-05-leg-07-registry.json'
];
const [plan,l1,l2,l3,l4,l5,l6,l7]=sourceFiles.map(read);
const report=read('reports/core-thesis/answerable-power/sprint-05.json');

if(plan.schema_version!=='m05-answerable-power-sprint-05-plan@1'||plan.sprint_id!=='M05-SPRINT-05')fail('Sprint 05 plan identity drift');
if(plan.status!=='reference_adoption_package_complete_at_a0')fail('Sprint 05 status drift');
if(plan.adoption_ladder.map((row)=>row.level).join(',')!=='A0,A1,A2,A3,A4,A5,A6')fail('adoption ladder drift');
if(plan.leg_registry.length!==7||new Set(plan.leg_registry.map((row)=>row.leg_id)).size!==7)fail('leg registry drift');
if(plan.leg_registry.some((row)=>row.protocol_complete!==true||row.external_effect_observed!==false))fail('leg protocol or external-effect boundary drift');
if(plan.reconstruction_receipt.historical_repository_merge_inferred!==false||plan.reconstruction_receipt.historical_terminal_receipts_verified!==false)fail('historical reconstruction boundary drift');
if(plan.current_state.maximum_verified_adoption_level!=='A0')fail('plan adoption ceiling drift');
for(const key of ['external_reproduction_observed','institutional_shadow_test_observed','real_decision_governed_by_apc_01','durable_adoption_observed','works_standard_met','project_complete']){
  if(plan.current_state[key]!==false)fail(`plan completion boundary drift: ${key}`);
}

if(l1.schema_version!=='m05-answerable-power-adoption-conformance@1'||l1.leg_id!=='S05-L1')fail('L1 identity drift');
if(l1.machine_rejection_rules.length!==10)fail('L1 rejection-rule count drift');
if(l1.truth_boundary.can_determine_uploaded_evidence_truthfulness!==false||l1.truth_boundary.can_determine_actual_independence!==false||l1.truth_boundary.can_determine_actual_stopping_power!==false)fail('L1 truth boundary drift');
if(!fs.existsSync(path.join(root,l1.cli.path)))fail('L1 CLI missing');

if(l2.schema_version!=='m05-answerable-power-adoption-threat-model@1'||l2.leg_id!=='S05-L2')fail('L2 identity drift');
if(l2.attack_classes.length!==20||new Set(l2.attack_classes.map((row)=>row.attack_id)).size!==20)fail('L2 attack denominator drift');
const machine=l2.attack_classes.filter((row)=>row.machine_detectable).length;
const human=l2.attack_classes.filter((row)=>!row.machine_detectable).length;
if(machine!==12||human!==8)fail(`L2 detectability drift: ${machine}/${human}`);
for(const name of ['reviewer_capture','representative_capture','emergency_laundering','silent_model_or_policy_update','stale_evidence','vendor_controlled_custody','retaliation','remedy_theater','exit_theater','valuation_theater','successor_system_relabeling','fabricated_evidence','jurisdiction_shopping','metric_gaming_or_denominator_suppression']){
  if(!l2.attack_classes.some((row)=>row.name===name))fail(`L2 missing attack ${name}`);
}

if(l3.schema_version!=='m05-answerable-power-real-person-entry-gate@1'||l3.leg_id!=='S05-L3')fail('L3 identity drift');
if(l3.gate_sections.length!==13||new Set(l3.gate_sections.map((row)=>row.section_id)).size!==13)fail('L3 gate denominator drift');
if(l3.entry_decision.protocol_complete!==true||l3.entry_decision.real_person_pilot_authorized!==false||l3.entry_decision.eligible_real_person_pilots!==0||l3.entry_decision.decision!=='blocked_at_a0')fail('L3 entry decision drift');
for(const key of ['external_legal_approval_observed','ethics_approval_observed','privacy_approval_observed','affected_party_approval_observed','independent_stop_authority_observed']){
  if(l3.entry_decision[key]!==false)fail(`L3 approval boundary drift: ${key}`);
}

if(l4.schema_version!=='m05-answerable-power-affected-party-governance@1'||l4.leg_id!=='S05-L4')fail('L4 identity drift');
if(l4.constitutional_roles.length!==8||l4.formation_rules.length!==14||l4.machine_tested_properties.length!==14||l4.synthetic_scenarios.length!==12)fail('L4 constitutional denominator drift');
const outcomes=l4.synthetic_scenarios.reduce((acc,row)=>{acc[row.expected_outcome]=(acc[row.expected_outcome]||0)+1;return acc},{});
if(outcomes.conformant!==1||outcomes.blocked!==9||outcomes.mandatory_pause!==2)fail('L4 scenario outcome drift');
for(const name of ['institution_appointed_majority','vendor_voting_conflict','missing_minority_trigger','disabled_recall','waiver_of_direct_r1_r4_rights','operator_controlled_stop_authority','silent_cloud_update','uncompensated_participation','missing_retaliation_protection','material_contest','emergency_claim_without_independent_authorization']){
  if(!l4.synthetic_scenarios.some((row)=>row.name===name))fail(`L4 missing scenario ${name}`);
}
if(l4.current_result.real_affected_party_representation_observed!==false||l4.current_result.real_independent_stop_authority_observed!==false)fail('L4 real-governance boundary drift');

if(l5.schema_version!=='m05-answerable-power-adoption-candidate-landscape@1'||l5.leg_id!=='S05-L5')fail('L5 identity drift');
if(l5.candidates.length!==7||new Set(l5.candidates.map((row)=>row.candidate_id)).size!==7)fail('L5 candidate denominator drift');
for(const row of l5.candidates){
  for(const key of ['exact_system_state','legal_authority_surface','affected_party_body','independent_stop_authority','no_adverse_shadow_feasibility','data_sensitivity','public_capacity_surface','r7_instrument','lawful_outreach_route','disqualifiers']){
    if(row[key]===undefined)fail(`${row.candidate_id}: missing ${key}`);
  }
}
const exact=l5.candidates.filter((row)=>row.exact_system_state==='exact_operating_system_bounded');
if(exact.length!==1||exact[0].label!=='Homes for Ukraine Share')fail('L5 exact-system boundary drift');
for(const key of ['outreach_started','institutional_willingness_observed','external_legal_approval_observed','affected_party_approval_observed']){
  if(l5.current_result[key]!==false)fail(`L5 external-state drift: ${key}`);
}
if(l5.current_result.eligible_real_person_pilots!==0||l5.current_result.maximum_verified_adoption_level!=='A0')fail('L5 ceiling drift');

if(l6.schema_version!=='m05-answerable-power-preregistered-evaluation@1'||l6.leg_id!=='S05-L6')fail('L6 identity drift');
if(Object.keys(l6.required_design).length!==8)fail('L6 required-design denominator drift');
if(l6.metric_families.length!==15||new Set(l6.metric_families.map((row)=>row.metric_id)).size!==15)fail('L6 metric denominator drift');
if(l6.constitutional_stop_thresholds.length!==8||new Set(l6.constitutional_stop_thresholds.map((row)=>row.threshold_id)).size!==8)fail('L6 stop-threshold denominator drift');
for(const row of l6.metric_families){
  for(const key of ['purpose','numerator_or_measure','denominator','direction','required_disaggregation','missing_data_rule','pilot_specific_threshold_required_before_a3']){
    if(row[key]===undefined)fail(`${row.metric_id}: missing ${key}`);
  }
  if(row.pilot_specific_threshold_required_before_a3!==true)fail(`${row.metric_id}: pilot threshold may not be optional`);
}
if(l6.current_result.evaluation_template_complete!==true||l6.current_result.pilot_specific_values_frozen!==false||l6.current_result.real_person_telemetry_collected!==false)fail('L6 preregistration boundary drift');

if(l7.schema_version!=='m05-answerable-power-adoption-registry@1'||l7.leg_id!=='S05-L7')fail('L7 identity drift');
if(l7.required_registry_fields.length!==18||new Set(l7.required_registry_fields).size!==18)fail('L7 registry field drift');
if(l7.level_requirements.map((row)=>row.level).join(',')!=='A0,A1,A2,A3,A4,A5,A6')fail('L7 level requirement drift');
if(l7.reconciliation_rules.length!==12||l7.registry.length!==1)fail('L7 reconciliation denominator drift');
if(l7.registry[0].requested_level!=='A0'||l7.registry[0].computed_maximum_level!=='A0')fail('L7 registry level drift');
if(l7.current_result.A0_achieved!==true||l7.current_result.maximum_verified_adoption_level!=='A0')fail('L7 A0 boundary drift');
for(const key of ['A1_independent_reproduction_observed','A2_independent_review_and_affected_party_approval_observed','A3_lawful_shadow_mode_observed','A4_prospective_parallel_operation_observed','A5_observed_rights_bearing_use','A6_durable_adoption_observed','works_standard_met','project_complete']){
  if(l7.current_result[key]!==false)fail(`L7 unsupported promotion: ${key}`);
}

for(const doc of [plan,l1,l2,l3,l4,l5,l6,l7]){
  if(doc.current_result?.maximum_verified_adoption_level&&doc.current_result.maximum_verified_adoption_level!=='A0')fail(`${doc.leg_id||'plan'} adoption ceiling drift`);
  for(const [key,value] of Object.entries(doc.boundaries||{})){
    if(['promotes_to','graph_effect'].includes(key))continue;
    if(typeof value==='boolean'&&value!==false)fail(`${doc.leg_id||'plan'} boundary ${key} must remain false`);
  }
}

const expectedFingerprints=Object.fromEntries(sourceFiles.map((rel)=>[rel,crypto.createHash('sha256').update(JSON.stringify(read(rel))).digest('hex')]));
const expectedCombined=crypto.createHash('sha256').update(JSON.stringify(expectedFingerprints)).digest('hex');
if(report.combined_fingerprint!==expectedCombined)fail('report combined fingerprint drift');
if(JSON.stringify(report.fingerprints)!==JSON.stringify(expectedFingerprints))fail('report source fingerprint drift');
const expectedCounts={adoption_levels:7,legs:7,conformance_rejection_rules:10,attack_classes:20,machine_detectable_attacks:12,human_investigation_attacks:8,entry_gate_sections:13,governance_roles:8,governance_formation_rules:14,governance_properties:14,governance_scenarios:12,candidate_surfaces:7,exact_operating_systems:1,metric_families:15,constitutional_stop_thresholds:8,registry_entries:1,reconciliation_rules:12};
for(const [key,value] of Object.entries(expectedCounts))if(report.counts[key]!==value)fail(`report count drift: ${key}`);
if(report.current_adoption_result.maximum_verified_adoption_level!=='A0'||report.current_adoption_result.project_complete!==false)fail('report adoption boundary drift');
console.log('validate-m05-answerable-power-sprint-05: OK');
