import { createHash } from 'node:crypto';

export const PREFERENCE_SOURCE_POPULATION_RULE_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-source-population-rule-assurance-fixture@1';
export const PREFERENCE_SOURCE_POPULATION_RULE_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-source-population-rule-assurance-build@1';

const WORLD_IDS = [
  "complete-source-population-frame-rule-identity-appeal-imputation-boundary-and-current-lineage",
  "source-population-frame-omits-forty-operational-units",
  "proxy-rule-produces-thirty-false-exclusions-and-twenty-false-inclusions",
  "identity-collision-fragmentation-and-duplicate-records-corrupt-denominator",
  "exceptions-overrides-and-appeals-hidden-inaccessible-or-not-propagated",
  "model-imputed-eligibility-used-without-independent-validation",
  "geographic-temporal-population-and-policy-boundary-drift",
  "historical-source-population-rule-assurance-inherited-after-succession"
];
const FLAG_KEYS = [
  "complete_source_population_rule_assurance",
  "frame_undercoverage_present",
  "proxy_rule_failure_present",
  "identity_denominator_failure_present",
  "appeal_propagation_failure_present",
  "imputation_validation_failure_present",
  "boundary_drift_present",
  "stale_source_population_lineage_present",
  "frame_complete",
  "eligibility_rule_complete",
  "identity_linkage_complete",
  "appeal_correction_complete",
  "imputation_validation_complete",
  "boundary_current_complete",
  "current_lineage_complete",
  "monitoring_correction_complete"
];
export const EXPECTED_SOURCE_POPULATION_RULE_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_source_population_rule_governance_signatures": 8,
  "complete_source_population_rule_assurance_worlds": 1,
  "frame_undercoverage_worlds": 1,
  "proxy_rule_failure_worlds": 1,
  "identity_denominator_failure_worlds": 1,
  "appeal_propagation_failure_worlds": 1,
  "imputation_validation_failure_worlds": 1,
  "boundary_drift_worlds": 1,
  "stale_source_population_lineage_worlds": 1,
  "frame_complete_worlds": 7,
  "eligibility_rule_complete_worlds": 7,
  "identity_linkage_complete_worlds": 7,
  "appeal_correction_complete_worlds": 7,
  "imputation_validation_complete_worlds": 7,
  "boundary_current_complete_worlds": 7,
  "current_lineage_complete_worlds": 7,
  "monitoring_correction_complete_worlds": 8,
  "same_public_source_population_surface_worlds": 8,
  "total_omitted_source_population_unit_count": 40,
  "total_false_exclusion_count": 30,
  "total_false_inclusion_count": 20,
  "total_false_merged_unit_count": 20,
  "total_false_split_unit_count": 20,
  "total_duplicate_unit_count": 15,
  "total_unappealable_exclusion_count": 20,
  "total_pending_appeal_count": 15,
  "total_reversal_not_propagated_count": 10,
  "total_model_imputed_unit_count": 40,
  "total_unvalidated_proxy_imputation_unit_count": 40,
  "total_boundary_drifted_unit_count": 40,
  "total_stale_frame_unit_count": 60,
  "total_stale_source_population_decision_count": 100,
  "total_unsupported_source_population_rule_decisions": 700,
  "binding_public_authority_worlds": 0
};
export const FALSE_SOURCE_POPULATION_RULE_CLASSIFICATIONS = [
  "declared_source_population_identifies_operational_population_frame",
  "published_population_coverage_identifies_complete_frame_boundary_identity_linkage_and_missingness_custody",
  "published_inclusion_coverage_identifies_valid_direct_rule_proxy_exception_and_override_custody",
  "zero_published_exclusions_identifies_zero_true_exclusions",
  "zero_published_proxy_error_identifies_zero_false_inclusion_or_false_exclusion",
  "one_person_or_entity_label_identifies_one_resolved_population_unit",
  "record_deduplication_identifies_identity_resolution_and_boundary_custody",
  "zero_published_appeals_identifies_absence_of_appeal_need_or_suppression",
  "appeal_reversal_identifies_correction_without_propagation",
  "model_imputed_eligibility_identifies_observed_or_independently_validated_eligibility",
  "one_validation_sample_identifies_current_subgroup_complete_imputation_assurance",
  "historical_source_population_rule_assurance_identifies_current_assurance",
  "public_source_population_rule_verified_status_identifies_complete_current_frame_rule_identity_appeal_imputation_correctable_authorized_evidence",
  "source_population_rule_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed"
];
const REQUIRED_RULES = [
  "declared_source_population_units_are_not_the_operational_population_frame",
  "published_population_coverage_is_not_complete_frame_boundary_identity_linkage_or_missingness_custody",
  "published_inclusion_coverage_is_not_valid_eligibility_when_proxy_error_exceptions_and_overrides_are_unresolved",
  "zero_published_exclusions_is_not_zero_true_exclusion",
  "zero_published_proxy_error_is_not_absence_of_false_inclusion_or_false_exclusion",
  "one_person_or_entity_label_is_not_one_resolved_population_unit",
  "record_deduplication_is_not_identity_resolution_or_household_entity_boundary_custody",
  "zero_published_appeals_is_not_absence_of_appeal_need_inaccessibility_or_suppression",
  "appeal_reversal_is_not_correction_until_propagated_to_every_consequential_system",
  "model_imputed_eligibility_is_not_observed_or_independently_validated_eligibility",
  "one_validation_sample_is_not_current_subgroup_complete_imputation_assurance",
  "historical_source_population_rule_assurance_is_not_current_after_source_rule_identity_appeal_model_geography_population_policy_workflow_or_release_succession",
  "public_source_population_rule_verified_status_is_not_complete_current_frame_complete_identity_resolved_rule_valid_proxy_audited_appeal_complete_imputation_validated_correctable_or_authorized_evidence",
  "source_population_or_rule_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "source_population_rule_claim_requires_frame_boundary_identity_linkage_rule_proxy_exception_override_appeal_imputation_lineage_correction_and_authority_custody",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "declared_source_population_units": 100,
  "declared_eligible_units": 100,
  "public_source_population_status": "source_population_rule_verified",
  "published_population_coverage": 1,
  "published_inclusion_coverage": 1,
  "published_exclusion_count": 0,
  "published_proxy_error_rate": 0,
  "published_appeal_count": 0,
  "published_reversal_count": 0,
  "approved_use": "systemwide_release_policy",
  "reference_source_population_version": "SOURCE-POPULATION-V1",
  "reference_eligibility_rule_version": "ELIGIBILITY-RULE-V1",
  "reference_identity_version": "IDENTITY-FRAME-V1",
  "reference_appeal_version": "APPEAL-PROTOCOL-V1",
  "reference_imputation_version": "IMPUTATION-MODEL-V1",
  "binding_public_authority": false
};
const PUBLIC_KEYS = [
  "operative_release_id",
  "operative_release_version",
  "declared_source_population_units",
  "declared_eligible_units",
  "public_source_population_status",
  "published_population_coverage",
  "published_inclusion_coverage",
  "published_exclusion_count",
  "published_proxy_error_rate",
  "published_appeal_count",
  "published_reversal_count",
  "approved_use"
];
const COUNT_FIELDS = {
  population_frame: ['declared_source_population_count','operational_source_population_count','included_count','excluded_count','omitted_source_population_count','boundary_drifted_unit_count','stale_frame_unit_count'],
  eligibility_rule: ['classified_included_count','classified_excluded_count','false_inclusion_count','false_exclusion_count'],
  identity_linkage: ['resolved_unit_count','false_merged_unit_count','false_split_unit_count','duplicate_unit_count','unlinked_unit_count'],
  exception_appeal: ['exception_count','override_count','appeal_count','pending_appeal_count','reversal_count','unappealable_exclusion_count','reversal_not_propagated_count'],
  imputation: ['model_imputed_unit_count','unvalidated_proxy_imputation_unit_count','validation_sample_count'],
  lineage: ['stale_source_population_decision_count'],
  governance: ['unsupported_source_population_rule_decision_count']
};
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((a,b)=>String(a).localeCompare(String(b)));
const sameMembers = (a,b) => JSON.stringify(sorted(unique(a))) === JSON.stringify(sorted(unique(b)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value,label,errors)=>{ if(value!==false) errors.push(`${label} must remain false`); };
function deepMerge(base, override) {
  if (Array.isArray(override)) return override.map(canonical);
  if (!override || typeof override !== 'object') return override;
  const result = { ...object(base) };
  for (const [key,value] of Object.entries(override)) result[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(result[key],value) : canonical(value);
  return result;
}
function publicClaim(baseline){ return Object.fromEntries(PUBLIC_KEYS.map(key=>[key,baseline[key]])); }
function validateCounts(world, errors) {
  for (const [section,fields] of Object.entries(COUNT_FIELDS)) for (const field of fields) {
    const value = world?.[section]?.[field];
    if (!Number.isInteger(value) || value < 0 || value > 10000) errors.push(`${section}.${field} must be a non-negative bounded integer`);
  }
}
export function derivePreferenceSourcePopulationRuleFlags(world) {
  const frame = object(world.population_frame), rule = object(world.eligibility_rule), identity = object(world.identity_linkage), appeal = object(world.exception_appeal), imputation = object(world.imputation), lineage = object(world.lineage), governance = object(world.governance);
  const frameUnder = frame.omitted_source_population_count > 0 || frame.frame_complete !== true;
  const proxyFailure = rule.false_inclusion_count > 0 || rule.false_exclusion_count > 0 || rule.direct_measure_complete !== true || rule.proxy_audit_complete !== true;
  const identityFailure = identity.false_merged_unit_count > 0 || identity.false_split_unit_count > 0 || identity.duplicate_unit_count > 0 || identity.identity_resolution_complete !== true || identity.household_entity_boundary_complete !== true || identity.linkage_validation_complete !== true;
  const appealFailure = appeal.unappealable_exclusion_count > 0 || appeal.pending_appeal_count > 0 || appeal.reversal_not_propagated_count > 0 || appeal.appeal_access_complete !== true || appeal.appeal_disposition_complete !== true || appeal.reversal_propagation_complete !== true || governance.appeal_complete !== true || governance.correction_complete !== true;
  const imputationFailure = imputation.unvalidated_proxy_imputation_unit_count > 0 || (imputation.model_imputed_unit_count > 0 && imputation.independent_validation_complete !== true) || imputation.subgroup_validation_complete !== true || imputation.uncertainty_complete !== true;
  const boundaryFailure = frame.boundary_drifted_unit_count > 0 || frame.stale_frame_unit_count > 0 || lineage.boundary_current !== true || frame.refresh_complete !== true;
  const stale = lineage.current_source_population_rule_lineage !== true || lineage.stale_source_population_decision_count > 0;
  const monitoring = ['monitoring_complete','refresh_complete','drift_trigger_complete','correction_complete','appeal_complete','rollback_complete','certificate_withdrawal_complete','durability_complete'].every(key=>governance[key]===true);
  const flags = {
    complete_source_population_rule_assurance: !(frameUnder||proxyFailure||identityFailure||appealFailure||imputationFailure||boundaryFailure||stale) && monitoring,
    frame_undercoverage_present: frameUnder,
    proxy_rule_failure_present: proxyFailure,
    identity_denominator_failure_present: identityFailure,
    appeal_propagation_failure_present: appealFailure,
    imputation_validation_failure_present: imputationFailure,
    boundary_drift_present: boundaryFailure,
    stale_source_population_lineage_present: stale,
    frame_complete: !frameUnder,
    eligibility_rule_complete: !proxyFailure,
    identity_linkage_complete: !identityFailure,
    appeal_correction_complete: !appealFailure,
    imputation_validation_complete: !imputationFailure,
    boundary_current_complete: !boundaryFailure,
    current_lineage_complete: !stale,
    monitoring_correction_complete: monitoring
  };
  return flags;
}
function buildChain(world) {
  const stages = [
    ['public-surface',{public_claim:world.public_claim}],
    ['population-frame',{population_frame:world.population_frame}],
    ['eligibility-rule',{eligibility_rule:world.eligibility_rule}],
    ['identity-linkage',{identity_linkage:world.identity_linkage}],
    ['exception-appeal',{exception_appeal:world.exception_appeal}],
    ['imputation',{imputation:world.imputation}],
    ['boundary-lineage',{lineage:world.lineage,population_boundary:{boundary_drifted_unit_count:world.population_frame.boundary_drifted_unit_count,stale_frame_unit_count:world.population_frame.stale_frame_unit_count}}],
    ['governance',{governance:world.governance}],
    ['flags',{flags:world.flags}],
    ['interpretation',{world_id:world.world_id,mechanism:world.mechanism,public_status_signature:world.public_status_signature,governance_signature:world.governance_signature}]
  ];
  let previous = null;
  return stages.map(([stage,payload],index)=>{
    const unsigned={event_id:`${world.world_id}:event-${String(index+1).padStart(2,'0')}`,stage,source_event_ids:index? [`${world.world_id}:event-${String(index).padStart(2,'0')}`]:[],previous_event_sha256:previous,payload};
    const event={...unsigned,event_sha256:sha256(unsigned)}; previous=event.event_sha256; return event;
  });
}
function governanceSignature(world) {
  return sha256({population_frame:world.population_frame,eligibility_rule:world.eligibility_rule,identity_linkage:world.identity_linkage,exception_appeal:world.exception_appeal,imputation:world.imputation,lineage:world.lineage,governance:world.governance,flags:world.flags});
}
function sum(worlds, section, key){ return worlds.reduce((n,w)=>n+Number(w?.[section]?.[key]??0),0); }
function metrics(worlds){
  const countFlag = key => worlds.filter(world=>world.flags[key]===true).length;
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(w=>w.public_status_signature)).size,
    distinct_source_population_rule_governance_signatures: new Set(worlds.map(w=>w.governance_signature)).size,
    complete_source_population_rule_assurance_worlds: countFlag('complete_source_population_rule_assurance'),
    frame_undercoverage_worlds: countFlag('frame_undercoverage_present'),
    proxy_rule_failure_worlds: countFlag('proxy_rule_failure_present'),
    identity_denominator_failure_worlds: countFlag('identity_denominator_failure_present'),
    appeal_propagation_failure_worlds: countFlag('appeal_propagation_failure_present'),
    imputation_validation_failure_worlds: countFlag('imputation_validation_failure_present'),
    boundary_drift_worlds: countFlag('boundary_drift_present'),
    stale_source_population_lineage_worlds: countFlag('stale_source_population_lineage_present'),
    frame_complete_worlds: countFlag('frame_complete'), eligibility_rule_complete_worlds: countFlag('eligibility_rule_complete'), identity_linkage_complete_worlds: countFlag('identity_linkage_complete'), appeal_correction_complete_worlds: countFlag('appeal_correction_complete'), imputation_validation_complete_worlds: countFlag('imputation_validation_complete'), boundary_current_complete_worlds: countFlag('boundary_current_complete'), current_lineage_complete_worlds: countFlag('current_lineage_complete'), monitoring_correction_complete_worlds: countFlag('monitoring_correction_complete'),
    same_public_source_population_surface_worlds: worlds.filter(w=>w.public_status_signature===worlds[0].public_status_signature).length,
    total_omitted_source_population_unit_count:sum(worlds,'population_frame','omitted_source_population_count'), total_false_exclusion_count:sum(worlds,'eligibility_rule','false_exclusion_count'), total_false_inclusion_count:sum(worlds,'eligibility_rule','false_inclusion_count'), total_false_merged_unit_count:sum(worlds,'identity_linkage','false_merged_unit_count'), total_false_split_unit_count:sum(worlds,'identity_linkage','false_split_unit_count'), total_duplicate_unit_count:sum(worlds,'identity_linkage','duplicate_unit_count'), total_unappealable_exclusion_count:sum(worlds,'exception_appeal','unappealable_exclusion_count'), total_pending_appeal_count:sum(worlds,'exception_appeal','pending_appeal_count'), total_reversal_not_propagated_count:sum(worlds,'exception_appeal','reversal_not_propagated_count'), total_model_imputed_unit_count:sum(worlds,'imputation','model_imputed_unit_count'), total_unvalidated_proxy_imputation_unit_count:sum(worlds,'imputation','unvalidated_proxy_imputation_unit_count'), total_boundary_drifted_unit_count:sum(worlds,'population_frame','boundary_drifted_unit_count'), total_stale_frame_unit_count:sum(worlds,'population_frame','stale_frame_unit_count'), total_stale_source_population_decision_count:sum(worlds,'lineage','stale_source_population_decision_count'), total_unsupported_source_population_rule_decisions:sum(worlds,'governance','unsupported_source_population_rule_decision_count'), binding_public_authority_worlds:worlds.filter(w=>w.governance.binding_public_authority===true).length
  };
}
export function validatePreferenceSourcePopulationRuleAssuranceFixture(fixture) {
  const errors=[];
  if(fixture?.schema_version!==PREFERENCE_SOURCE_POPULATION_RULE_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('source-population-rule fixture schema mismatch');
  if(fixture?.fixture_id!=='same-source-population-rule-verified-status-different-operational-states-v1') errors.push('fixture_id mismatch');
  if(fixture?.issue!==836 || fixture?.parent_program_issue!==594) errors.push('issue custody mismatch');
  if(fixture?.status!=='synthetic_control') errors.push('fixture status must remain synthetic_control');
  if(fixture?.graph_effect!=='none') errors.push('graph_effect must remain none');
  requireFalse(fixture?.counts_toward_thesis_evidence,'counts_toward_thesis_evidence',errors);
  if(JSON.stringify(canonical(fixture?.baseline))!==JSON.stringify(canonical(BASELINE))) errors.push('baseline mismatch');
  if(JSON.stringify(canonical(fixture?.world_defaults?.public_claim))!==JSON.stringify(canonical(publicClaim(BASELINE)))) errors.push('world default public claim mismatch');
  if(!sameMembers(fixture?.required_refusal_rules,REQUIRED_RULES)) errors.push('required refusal rules mismatch');
  for(const key of FALSE_SOURCE_POPULATION_RULE_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key],`expected_classification.${key}`,errors);
  if(fixture?.expected_classification?.complete_source_population_rule_assurance_supported_in_at_least_one_world!==true) errors.push('complete path classification must be true');
  if(!text(fixture?.interpretation_contract?.contract_id)||!text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract incomplete');
  if(array(fixture?.prohibited_inferences).length<10) errors.push('prohibited inferences incomplete');
  const worlds=array(fixture?.worlds);
  if(worlds.length!==8) errors.push('fixture must contain eight worlds');
  if(!sameMembers(worlds.map(w=>w.world_id),WORLD_IDS)) errors.push('world IDs mismatch');
  for(const candidate of worlds){
    if(!text(candidate?.mechanism)) errors.push(`${candidate?.world_id} mechanism required`);
    const merged=deepMerge(fixture?.world_defaults,candidate?.overrides??{}); merged.public_claim=publicClaim(fixture.baseline); validateCounts(merged,errors);
    const derived=derivePreferenceSourcePopulationRuleFlags(merged);
    if(JSON.stringify(canonical(derived))!==JSON.stringify(canonical(candidate?.expected_flags))) errors.push(`${candidate?.world_id} expected flags mismatch`);
  }
  return errors;
}
export function compilePreferenceSourcePopulationRuleAssuranceFixture(fixture) {
  const errors=validatePreferenceSourcePopulationRuleAssuranceFixture(fixture); if(errors.length) throw new Error(`invalid source-population-rule fixture:\n- ${errors.join('\n- ')}`);
  const worlds=fixture.worlds.map(candidate=>{
    const merged=deepMerge(fixture.world_defaults,candidate.overrides??{}); merged.public_claim=publicClaim(fixture.baseline);
    const world={world_id:candidate.world_id,mechanism:candidate.mechanism,...merged}; world.flags=derivePreferenceSourcePopulationRuleFlags(world); world.public_status_signature=sha256(world.public_claim); world.governance_signature=governanceSignature(world); world.custody_chain=buildChain(world); world.custody_chain_head_sha256=world.custody_chain.at(-1).event_sha256; return world;
  });
  return {schema_version:PREFERENCE_SOURCE_POPULATION_RULE_ASSURANCE_BUILD_SCHEMA_VERSION,fixture_id:fixture.fixture_id,issue:fixture.issue,parent_program_issue:fixture.parent_program_issue,captured_at:fixture.captured_at,status:fixture.status,graph_effect:'none',counts_toward_thesis_evidence:false,conclusion_generated:false,preference_change_present:false,baseline:fixture.baseline,worlds,metrics:metrics(worlds),classification:fixture.expected_classification,refusal_rules:fixture.required_refusal_rules,prohibited_inferences:fixture.prohibited_inferences,interpretation_contract:fixture.interpretation_contract};
}
function validateChain(world,errors){ const chain=array(world?.custody_chain); if(chain.length!==10) errors.push(`${world?.world_id} custody chain must have ten events`); let previous=null; const seen=new Set(); for(const event of chain){ if(event.previous_event_sha256!==previous) errors.push(`${world?.world_id} custody previous hash mismatch`); for(const id of array(event.source_event_ids)) if(!seen.has(id)) errors.push(`${world?.world_id} custody source missing`); const unsigned={...event}; delete unsigned.event_sha256; if(event.event_sha256!==sha256(unsigned)) errors.push(`${world?.world_id} custody hash mismatch`); seen.add(event.event_id); previous=event.event_sha256; } if(previous!==world?.custody_chain_head_sha256) errors.push(`${world?.world_id} custody head mismatch`); }
export function validatePreferenceSourcePopulationRuleAssuranceBuild(compiled) {
  const errors=[];
  if(compiled?.schema_version!==PREFERENCE_SOURCE_POPULATION_RULE_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('source-population-rule build schema mismatch');
  if(compiled?.fixture_id!=='same-source-population-rule-verified-status-different-operational-states-v1') errors.push('compiled fixture_id mismatch');
  if(compiled?.issue!==836||compiled?.parent_program_issue!==594) errors.push('compiled issue custody mismatch');
  if(compiled?.graph_effect!=='none') errors.push('compiled graph_effect must remain none'); requireFalse(compiled?.counts_toward_thesis_evidence,'compiled counts_toward_thesis_evidence',errors); requireFalse(compiled?.conclusion_generated,'compiled conclusion_generated',errors); requireFalse(compiled?.preference_change_present,'compiled preference_change_present',errors);
  const worlds=array(compiled?.worlds); if(worlds.length!==8) errors.push('compiled build must contain eight worlds'); if(!sameMembers(worlds.map(w=>w.world_id),WORLD_IDS)) errors.push('compiled world IDs mismatch');
  for(const world of worlds){ if(JSON.stringify(canonical(world.public_claim))!==JSON.stringify(canonical(publicClaim(BASELINE)))) errors.push(`${world.world_id} public claim drift`); const derived=derivePreferenceSourcePopulationRuleFlags(world); if(JSON.stringify(canonical(derived))!==JSON.stringify(canonical(world.flags))) errors.push(`${world.world_id} flags drift`); if(world.public_status_signature!==sha256(world.public_claim)) errors.push(`${world.world_id} public signature mismatch`); if(world.governance_signature!==governanceSignature(world)) errors.push(`${world.world_id} governance signature mismatch`); validateChain(world,errors); }
  for(const [key,value] of Object.entries(EXPECTED_SOURCE_POPULATION_RULE_METRICS)) if(compiled?.metrics?.[key]!==value) errors.push(`${key} must equal ${value}`);
  for(const key of FALSE_SOURCE_POPULATION_RULE_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key],`classification.${key}`,errors);
  if(compiled?.classification?.complete_source_population_rule_assurance_supported_in_at_least_one_world!==true) errors.push('complete path must remain supported');
  if(!sameMembers(compiled?.refusal_rules,REQUIRED_RULES)) errors.push('compiled refusal rules mismatch');
  if(!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat required');
  return errors;
}
export function renderPreferenceSourcePopulationRuleAssuranceMarkdown(compiled){
  const lines=['# Preference Custody PC-34: source-population and rule assurance','',`**Fixture:** ${compiled.fixture_id}`,'',`**Status:** ${compiled.status}`,'',`**Graph effect:** ${compiled.graph_effect}`,'',`> ${compiled.interpretation_contract.copy_ready_caveat}`,'','## Frozen public surface',''];
  for(const [key,value] of Object.entries(publicClaim(compiled.baseline))) lines.push(`- ${key}: ${value}`);
  lines.push('','## Worlds',''); for(const world of compiled.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('','## Qualified metrics',''); for(const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Refusal rules',''); for(const rule of compiled.refusal_rules) lines.push(`- ${rule}`); lines.push(''); return lines.join('\n');
}
