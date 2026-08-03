import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV35Build } from './preference-custody-manifest-v35.mjs';
import { validatePreferenceIdentityBoundaryAssuranceBuild } from './preference-identity-boundary-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V36_SCHEMA_VERSION = 'preference-custody-control-manifest-v36@1';
export const PREFERENCE_CUSTODY_MANIFEST_V36_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v36-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 38 }, (_, i) => `PC-${String(i + 1).padStart(2, '0')}`);
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'record_linkage_namespace_temporal_identity_and_succession_assurance',
  'population_eligibility_membership_denominator_and_operational_frame_governance'
];
const EXPECTED_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_identity_boundary_provenance_signatures": 8,
  "complete_identity_boundary_assurance_worlds": 1,
  "false_merge_worlds": 1,
  "false_split_worlds": 1,
  "recycled_identifier_worlds": 1,
  "boundary_truncation_worlds": 1,
  "ineligible_inclusion_worlds": 1,
  "frame_mismatch_worlds": 1,
  "membership_drift_worlds": 1,
  "one_to_one_identity_complete_worlds": 6,
  "temporal_identity_complete_worlds": 7,
  "boundary_coverage_complete_worlds": 7,
  "frame_alignment_complete_worlds": 7,
  "eligibility_complete_worlds": 7,
  "membership_current_worlds": 7,
  "denominator_valid_worlds": 5,
  "current_identity_boundary_lineage_complete_worlds": 6,
  "total_false_merged_entities": 20,
  "total_false_split_entities": 20,
  "total_recycled_identifiers": 15,
  "total_omitted_external_entities": 30,
  "total_omitted_bridge_entities": 15,
  "total_ineligible_included_entities": 25,
  "total_frame_misclassified_entities": 40,
  "total_entered_entities": 20,
  "total_exited_entities": 15,
  "total_churned_entities": 35,
  "total_stale_memberships": 35,
  "total_denominator_drift": 35,
  "total_unsupported_identity_boundary_decisions": 700,
  "binding_public_authority_worlds": 0
};
const FALSE_CLASSIFICATIONS = [
  "one_hundred_resolved_records_identifies_one_hundred_true_entities",
  "one_hundred_percent_identity_coverage_identifies_one_to_one_entity_resolution",
  "stable_node_count_identifies_stable_entity_identity_or_membership",
  "zero_published_duplicates_identifies_zero_false_merges",
  "zero_published_unresolved_identities_identifies_zero_false_splits_or_recycled_identifiers",
  "declared_operational_boundary_identifies_observed_operative_system_boundary",
  "administrative_roster_identifies_communication_exposure_market_household_or_institutional_population",
  "included_node_identifies_eligible_target_entity",
  "omitted_external_node_identifies_irrelevant_entity",
  "current_identifier_identifies_persistent_entity_across_succession",
  "frozen_denominator_identifies_current_population_under_entry_exit_churn_or_role_change",
  "public_identity_verified_status_identifies_complete_one_to_one_boundary_valid_frame_valid_current_correctable_authorized_evidence",
  "identity_or_boundary_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "preference_change_present"
];
const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const array = v => Array.isArray(v) ? v : [];
const text = v => String(v ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((a,b)=>String(a).localeCompare(String(b)));
const sameMembers = (a,b) => JSON.stringify(sorted(unique(a))) === JSON.stringify(sorted(unique(b)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])) : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (v,label,errors) => { if (v !== false) errors.push(`${label} must remain false`); };
function seal(event, previous) { const unsigned={...canonical(event),previous_event_sha256:previous}; return {...unsigned,event_sha256:sha256(unsigned)}; }
function chain(manifest, base, control, openFrontiers, requirements) {
  const events=[]; let previous=null; const push=e=>{const s=seal(e,previous);events.push(s);previous=s.event_sha256;};
  push({event_id:`${manifest.manifest_id}:base`,event_type:'qualified_v35_floor_snapshot',evidence_class:'compiled_synthetic_control_floor',authority:'preference_custody_v35_compiler',source_event_ids:[],payload:{manifest_id:base.manifest_id,schema_version:base.schema_version,control_count:base.control_count,snapshot_sha256:sha256(base)}});
  push({event_id:`${manifest.manifest_id}:pc38`,event_type:'pc38_record_identity_entity_boundary_frame_membership_and_denominator_control_admitted',evidence_class:'compiled_synthetic_control',authority:'identity_boundary_assurance_compiler',source_event_ids:[`${manifest.manifest_id}:base`],payload:{control,snapshot_sha256:sha256(control)}});
  push({event_id:`${manifest.manifest_id}:frontier`,event_type:'identity_boundary_frontier_transition_sealed',evidence_class:'laboratory_frontier_contract',authority:'preference_custody_v36_compiler',source_event_ids:[`${manifest.manifest_id}:pc38`],payload:{transition:manifest.frontier_transition,open_frontiers:openFrontiers}});
  push({event_id:`${manifest.manifest_id}:promotion`,event_type:'identity_boundary_real_case_promotion_boundary_sealed',evidence_class:'laboratory_promotion_contract',authority:'preference_custody_v36_compiler',source_event_ids:[`${manifest.manifest_id}:frontier`],payload:{identification_requirement:manifest.identification_requirement,real_case_requires:requirements}});
  push({event_id:`${manifest.manifest_id}:interpretation`,event_type:'interpretation_sealed',evidence_class:'candidate_inference',authority:'preference_custody_v36_analyst',source_event_ids:[`${manifest.manifest_id}:promotion`],payload:{allowed_interpretation:'qualified thirty-eight-control synthetic Preference Custody floor',graph_effect:'none',real_world_evidence_state:'none'}});
  return events;
}
export function validatePreferenceCustodyManifestV36(manifest) {
  const errors=[];
  if(manifest?.schema_version!==PREFERENCE_CUSTODY_MANIFEST_V36_SCHEMA_VERSION) errors.push('v36 schema mismatch');
  if(manifest?.manifest_id!=='preference-custody-laboratory-floor-v36') errors.push('v36 manifest_id mismatch');
  if(manifest?.issue!==594||manifest?.control_issue!==780) errors.push('v36 issue custody mismatch');
  if(manifest?.status!=='synthetic_control_floor_extension') errors.push('v36 status mismatch');
  if(manifest?.graph_effect!=='none') errors.push('v36 graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence,'v36 thesis evidence',errors);
  const base=object(manifest?.base_floor);
  if(base.manifest_id!=='preference-custody-laboratory-floor-v35'||base.source_manifest_path!=='data/research/preference-custody/control-manifest-v35.json'||base.expected_build_schema!=='preference-custody-control-manifest-v35-build@1'||base.expected_control_count!==37) errors.push('v36 base floor contract mismatch');
  const ext=object(manifest?.extension_control);
  if(ext.control_id!=='PC-38'||ext.fixture_id!=='same-identity-verified-status-different-provenance-v1'||ext.failure_class!=='identity_resolution_entity_boundary_network_frame_population_denominator_and_membership_succession_equifinality'||ext.expected_build_schema!=='preference-identity-boundary-assurance-build@1') errors.push('v36 extension contract mismatch');
  if(unique(ext.required_refusal_rules).length!==15) errors.push('v36 refusal-rule contract must contain fifteen unique rules');
  if(manifest?.identification_requirement?.stage!=='record_identity_entity_boundary_frame_membership_and_population_denominator') errors.push('v36 identification stage mismatch');
  if(manifest?.frontier_transition?.resolved_base_frontier!=='identity_resolution_entity_boundary_and_network_frame_assurance') errors.push('v36 resolved frontier mismatch');
  if(!sameMembers(manifest?.frontier_transition?.successor_frontiers,REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v36 successor frontiers mismatch');
  if(unique(manifest?.real_case_requirements_added).length!==48) errors.push('v36 must add exactly forty-eight unique real-case requirements');
  for(const item of array(manifest?.real_case_requirements_added)) if(!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v36 requirement: ${item}`);
  if(array(manifest?.prohibited_inferences).length<15) errors.push('v36 prohibited-inference ledger incomplete');
  if(!text(manifest?.interpretation_contract?.contract_id)||!text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v36 interpretation contract incomplete');
  return errors;
}
export function compilePreferenceCustodyManifestV36(manifest, baseBuild, identityBuild) {
  const errors=validatePreferenceCustodyManifestV36(manifest); if(errors.length) throw new Error(`invalid v36 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors=validatePreferenceCustodyManifestV35Build(baseBuild); if(baseErrors.length) throw new Error(`invalid v35 base:\n- ${baseErrors.join('\n- ')}`);
  const identityErrors=validatePreferenceIdentityBoundaryAssuranceBuild(identityBuild); if(identityErrors.length) throw new Error(`invalid PC-38 build:\n- ${identityErrors.join('\n- ')}`);
  if(baseBuild.control_count!==37||baseBuild.manifest_id!=='preference-custody-laboratory-floor-v35') throw new Error('v36 base identity mismatch');
  const required=manifest.extension_control.required_refusal_rules;
  const control={control_id:'PC-38',fixture_id:identityBuild.fixture_id,failure_class:manifest.extension_control.failure_class,source_fixture_path:manifest.extension_control.source_fixture_path,build_artifact_path:manifest.extension_control.build_artifact_path,build_schema_version:identityBuild.schema_version,graph_effect:'none',counts_toward_thesis_evidence:false,conclusion_generated:false,real_world_effect_claimed:false,preference_change_present:false,manipulative_intent_inferable:false,required_refusal_rules:[...required],observed_refusal_rules:[...identityBuild.required_refusal_rules],proof_summary:{...identityBuild.metrics,...identityBuild.classification}};
  const baseOpen=unique(baseBuild.open_frontiers);
  const openFrontiers=unique([...baseOpen.filter(x=>x!==manifest.frontier_transition.resolved_base_frontier),...manifest.frontier_transition.successor_frontiers]);
  const baseReq=unique(baseBuild.promotion_boundary.real_case_requires); const requirements=unique([...baseReq,...manifest.real_case_requirements_added]);
  const controls=[...baseBuild.controls,control]; const custody=chain(manifest,baseBuild,control,openFrontiers,requirements);
  return {schema_version:PREFERENCE_CUSTODY_MANIFEST_V36_BUILD_SCHEMA_VERSION,manifest_id:manifest.manifest_id,issue:manifest.issue,control_issue:manifest.control_issue,captured_at:manifest.captured_at,status:'laboratory_floor_v36_qualified',graph_effect:'none',counts_toward_thesis_evidence:false,conclusion_generated:false,real_world_evidence_state:'none',control_count:controls.length,controls,composition:{base_manifest_id:baseBuild.manifest_id,base_schema_version:baseBuild.schema_version,base_control_count:baseBuild.control_count,extension_control_id:'PC-38',base_floor_snapshot_sha256:sha256(baseBuild),extension_snapshot_sha256:sha256(identityBuild),base_promotion_requirement_count:baseReq.length,added_promotion_requirement_count:requirements.length-baseReq.length,final_promotion_requirement_count:requirements.length,base_open_frontiers:[...baseOpen]},control_integrity:{base_floor_qualified:true,base_integrity_preserved:Object.values(baseBuild.control_integrity).every(Boolean),all_graph_effect_none:controls.every(c=>c.graph_effect==='none'),no_thesis_evidence_consumption:controls.every(c=>c.counts_toward_thesis_evidence===false),no_real_world_conclusion:true,no_preference_change_claim:true,no_intent_inference:true,all_required_pc38_refusal_rules_present:required.every(r=>identityBuild.required_refusal_rules.includes(r)),complete_identity_boundary_assurance_path_preserved:identityBuild.metrics.complete_identity_boundary_assurance_worlds===1},identification_requirements:[...baseBuild.identification_requirements,manifest.identification_requirement],refusal_rule_union:unique([...baseBuild.refusal_rule_union,...identityBuild.required_refusal_rules]),open_frontiers:openFrontiers,frontier_transition:manifest.frontier_transition,promotion_boundary:{...baseBuild.promotion_boundary,promotion_requirement_count:requirements.length,real_case_requires:requirements,laboratory_controls_are_real_world_evidence:false},custody_chain:custody,custody_chain_head_sha256:custody.at(-1).event_sha256,prohibited_inferences:[...baseBuild.prohibited_inferences,...manifest.prohibited_inferences],interpretation_contract:manifest.interpretation_contract};
}
function validateChain(compiled,errors) { const events=array(compiled?.custody_chain); if(events.length!==5) errors.push('compiled v36 custody chain must contain five events'); let prev=null; const seen=new Set(); for(const event of events){if(event.previous_event_sha256!==prev)errors.push('compiled v36 custody previous hash mismatch');for(const id of array(event.source_event_ids))if(!seen.has(id))errors.push('compiled v36 custody source missing');const unsigned={...event};delete unsigned.event_sha256;if(event.event_sha256!==sha256(unsigned))errors.push('compiled v36 custody event hash mismatch');seen.add(event.event_id);prev=event.event_sha256;} if(prev!==compiled?.custody_chain_head_sha256)errors.push('compiled v36 custody head mismatch'); }
export function validatePreferenceCustodyManifestV36Build(compiled) {
  const errors=[];
  if(compiled?.schema_version!==PREFERENCE_CUSTODY_MANIFEST_V36_BUILD_SCHEMA_VERSION) errors.push('compiled v36 schema mismatch');
  if(compiled?.manifest_id!=='preference-custody-laboratory-floor-v36'||compiled?.control_issue!==780) errors.push('compiled v36 identity mismatch');
  if(compiled?.status!=='laboratory_floor_v36_qualified'||compiled?.graph_effect!=='none'||compiled?.real_world_evidence_state!=='none') errors.push('compiled v36 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence,'compiled v36 thesis evidence',errors); requireFalse(compiled?.conclusion_generated,'compiled v36 conclusion',errors);
  if(compiled?.control_count!==38||array(compiled?.controls).length!==38||!sameMembers(array(compiled?.controls).map(c=>c.control_id),REQUIRED_CONTROL_IDS)) errors.push('compiled v36 must preserve thirty-eight exact controls');
  const comp=object(compiled?.composition);
  if(comp.base_manifest_id!=='preference-custody-laboratory-floor-v35'||comp.base_schema_version!=='preference-custody-control-manifest-v35-build@1'||comp.base_control_count!==37||comp.extension_control_id!=='PC-38') errors.push('compiled v36 composition identity mismatch');
  if(comp.base_promotion_requirement_count!==1341||comp.added_promotion_requirement_count!==48||comp.final_promotion_requirement_count!==1389) errors.push('compiled v36 promotion counts mismatch');
  if(!/^[0-9a-f]{64}$/.test(text(comp.base_floor_snapshot_sha256))||!/^[0-9a-f]{64}$/.test(text(comp.extension_snapshot_sha256))) errors.push('compiled v36 snapshot hash invalid');
  const expectedOpen=unique([...array(comp.base_open_frontiers).filter(x=>x!=='identity_resolution_entity_boundary_and_network_frame_assurance'),...REQUIRED_SUCCESSOR_FRONTIERS]);
  if(!sameMembers(compiled?.open_frontiers,expectedOpen)) errors.push('compiled v36 open-frontier preservation mismatch');
  if(array(compiled?.open_frontiers).includes('identity_resolution_entity_boundary_and_network_frame_assurance')) errors.push('compiled v36 retained resolved identity frontier');
  const integrity=object(compiled?.control_integrity); for(const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc38_refusal_rules_present','complete_identity_boundary_assurance_path_preserved']) if(integrity[key]!==true) errors.push(`compiled v36 integrity failed: ${key}`);
  const control=array(compiled?.controls).find(c=>c.control_id==='PC-38'); if(!control) errors.push('compiled v36 PC-38 missing'); else {for(const [k,v] of Object.entries(EXPECTED_METRICS))if(control.proof_summary?.[k]!==v)errors.push(`PC-38 metric mismatch: ${k}`);for(const k of FALSE_CLASSIFICATIONS)requireFalse(control.proof_summary?.[k],`PC-38 classification.${k}`,errors);if(control.proof_summary?.complete_identity_boundary_assurance_supported_in_at_least_one_world!==true)errors.push('PC-38 complete path missing');}
  if(compiled?.promotion_boundary?.promotion_requirement_count!==1389||unique(compiled?.promotion_boundary?.real_case_requires).length!==1389||compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence!==false) errors.push('compiled v36 promotion boundary mismatch');
  validateChain(compiled,errors); if(!text(compiled?.interpretation_contract?.copy_ready_caveat))errors.push('compiled v36 caveat missing'); return errors;
}
export function renderPreferenceCustodyManifestV36Markdown(compiled) { const control=compiled.controls.find(c=>c.control_id==='PC-38'); const lines=['# Preference Custody laboratory floor v36','',`**Status:** ${compiled.status}`,'',`**Controls:** ${compiled.control_count}`,'',`**Graph effect:** ${compiled.graph_effect}`,'',`> ${compiled.interpretation_contract.copy_ready_caveat}`,'','## PC-38 proof summary','']; for(const [k,v] of Object.entries(control.proof_summary))if(typeof v!=='object')lines.push(`- ${k}: ${v}`); lines.push('','## Open frontiers',''); for(const f of compiled.open_frontiers)lines.push(`- ${f}`); return `${lines.join('\n')}\n`; }
