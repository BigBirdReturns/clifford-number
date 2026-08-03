import { createHash } from 'node:crypto';
export const PREFERENCE_POPULATION_FRAME_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-population-frame-assurance-fixture@1';
export const PREFERENCE_POPULATION_FRAME_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-population-frame-assurance-build@1';
const WORLD_IDS = [
  "complete-population-frame-boundary-identity-linkage-turnover-and-current-lineage",
  "population-frame-omits-forty-operational-units",
  "identity-collision-falsely-merges-twenty-units",
  "identity-fragmentation-falsely-splits-twenty-units-and-retains-duplicates",
  "person-household-account-organization-facility-and-entity-boundaries-collapsed",
  "cross-source-linkage-has-false-positive-false-negative-orphan-and-ambiguous-records",
  "population-turnover-and-boundary-drift-omit-entrants-and-retain-exits",
  "historical-population-frame-assurance-inherited-after-succession"
];
const FLAG_KEYS = [
  "complete_population_frame_assurance",
  "frame_undercoverage_present",
  "identity_collision_present",
  "identity_fragmentation_present",
  "unit_boundary_failure_present",
  "linkage_failure_present",
  "turnover_boundary_drift_present",
  "stale_population_frame_lineage_present",
  "frame_complete",
  "identity_resolution_complete",
  "unit_boundary_complete",
  "linkage_validation_complete",
  "turnover_current_complete",
  "current_lineage_complete",
  "monitoring_correction_complete"
];
export const EXPECTED_POPULATION_FRAME_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_population_frame_governance_signatures": 8,
  "complete_population_frame_assurance_worlds": 1,
  "frame_undercoverage_worlds": 1,
  "identity_collision_worlds": 1,
  "identity_fragmentation_worlds": 1,
  "unit_boundary_failure_worlds": 1,
  "linkage_failure_worlds": 1,
  "turnover_boundary_drift_worlds": 1,
  "stale_population_frame_lineage_worlds": 1,
  "frame_complete_worlds": 7,
  "identity_resolution_complete_worlds": 6,
  "unit_boundary_complete_worlds": 7,
  "linkage_validation_complete_worlds": 7,
  "turnover_current_complete_worlds": 7,
  "current_lineage_complete_worlds": 7,
  "monitoring_correction_complete_worlds": 8,
  "same_public_population_frame_surface_worlds": 8,
  "total_omitted_population_unit_count": 40,
  "total_false_merged_unit_count": 20,
  "total_false_split_unit_count": 20,
  "total_duplicate_unit_count": 15,
  "total_collision_contaminated_linked_record_count": 30,
  "total_household_boundary_misclassified_count": 25,
  "total_entity_boundary_misclassified_count": 20,
  "total_false_positive_link_count": 30,
  "total_false_negative_link_count": 40,
  "total_orphan_record_count": 30,
  "total_ambiguous_link_count": 20,
  "total_missing_entrant_count": 30,
  "total_retained_exit_count": 20,
  "total_migration_merger_misclassification_count": 20,
  "total_stale_frame_unit_count": 40,
  "total_stale_population_frame_decision_count": 100,
  "total_unsupported_population_frame_decisions": 700,
  "binding_public_authority_worlds": 0
};
export const FALSE_POPULATION_FRAME_CLASSIFICATIONS = [
  "declared_population_identifies_operational_population_universe",
  "published_frame_coverage_identifies_complete_enumeration_missingness_and_uncertainty_custody",
  "published_unique_identity_count_identifies_resolved_identity_custody",
  "stable_unique_identity_count_identifies_stable_identity",
  "record_deduplication_identifies_identity_resolution_and_unit_boundary_custody",
  "shared_identifier_identifies_valid_cross_source_link",
  "published_linkage_coverage_identifies_zero_linkage_error",
  "analytic_unit_substitution_identifies_operational_unit_equivalence",
  "boundary_label_identifies_preserved_operational_boundaries",
  "current_records_identify_current_turnover_complete_denominator",
  "population_snapshot_identifies_period_aligned_denominator",
  "historical_population_frame_assurance_identifies_current_assurance",
  "public_population_frame_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "population_frame_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed"
];
const REQUIRED_RULES = [
  "declared_population_units_are_not_the_operational_population_universe",
  "published_frame_coverage_is_not_complete_enumeration_hard_to_enumerate_missingness_or_uncertainty_custody",
  "published_unique_identity_count_is_not_resolved_identity_custody",
  "stable_unique_identity_count_is_not_stable_identity_when_collision_and_fragmentation_offset",
  "record_deduplication_is_not_identity_resolution_or_unit_boundary_custody",
  "one_identifier_shared_across_sources_is_not_a_valid_cross_source_link",
  "published_linkage_coverage_is_not_absence_of_false_positive_false_negative_orphan_or_ambiguous_links",
  "analytic_unit_substitution_is_not_operational_unit_equivalence",
  "one_boundary_label_is_not_preservation_of_person_household_account_organization_facility_and_legal_entity_boundaries",
  "current_records_are_not_a_current_denominator_when_turnover_events_are_unresolved",
  "one_population_snapshot_is_not_period_aligned_turnover_and_boundary_custody",
  "historical_population_frame_assurance_is_not_current_after_source_identity_linkage_boundary_population_workflow_policy_or_release_succession",
  "public_population_frame_verified_status_is_not_complete_current_frame_identity_boundary_linkage_turnover_correctable_or_authorized_evidence",
  "population_frame_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "population_frame_claim_requires_frame_boundary_identity_duplicate_linkage_turnover_lineage_correction_and_authority_custody",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "declared_population_units": 100,
  "published_unique_identities": 100,
  "public_population_frame_status": "population_frame_verified",
  "published_frame_coverage": 1,
  "published_boundary_coverage": 1,
  "published_linkage_coverage": 1,
  "published_duplicate_count": 0,
  "published_missing_unit_count": 0,
  "approved_use": "systemwide_release_policy",
  "reference_frame_version": "POPULATION-FRAME-V1",
  "reference_identity_version": "IDENTITY-V1",
  "reference_boundary_version": "UNIT-BOUNDARY-V1",
  "reference_linkage_version": "LINKAGE-V1",
  "reference_population_version": "POPULATION-V1",
  "binding_public_authority": false
};
const PUBLIC_KEYS = [
  "operative_release_id",
  "operative_release_version",
  "declared_population_units",
  "published_unique_identities",
  "public_population_frame_status",
  "published_frame_coverage",
  "published_boundary_coverage",
  "published_linkage_coverage",
  "published_duplicate_count",
  "published_missing_unit_count",
  "approved_use"
];
const COUNT_FIELDS = {
  population_frame: ['declared_population_count','operational_population_count','enumerated_count','omitted_population_unit_count','hard_to_enumerate_unit_count','external_population_unit_count','transient_population_unit_count'],
  identity_resolution: ['published_unique_identity_count','resolved_identity_count','false_merged_unit_count','false_split_unit_count','duplicate_unit_count','alias_unresolved_count','collision_contaminated_linked_record_count'],
  unit_boundary: ['household_boundary_misclassified_count','entity_boundary_misclassified_count','analytic_operational_substitution_count'],
  linkage: ['linked_record_count','false_positive_link_count','false_negative_link_count','orphan_record_count','ambiguous_link_count'],
  turnover_lineage: ['missing_entrant_count','retained_exit_count','migration_merger_misclassification_count','stale_frame_unit_count','stale_population_frame_decision_count'],
  governance: ['unsupported_population_frame_decision_count']
};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const array=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const unique=values=>[...new Set(array(values).map(v=>text(v)).filter(Boolean))];
const sorted=values=>[...values].sort((a,b)=>String(a).localeCompare(String(b)));
const sameMembers=(a,b)=>JSON.stringify(sorted(unique(a)))===JSON.stringify(sorted(unique(b)));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const sha256=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse=(v,l,e)=>{if(v!==false)e.push(`${l} must remain false`);};
function deepMerge(base,override){if(Array.isArray(override))return override.map(canonical);if(!override||typeof override!=='object')return override;const result={...object(base)};for(const [k,v] of Object.entries(override))result[k]=v&&typeof v==='object'&&!Array.isArray(v)?deepMerge(result[k],v):canonical(v);return result;}
function publicClaim(baseline){return Object.fromEntries(PUBLIC_KEYS.map(k=>[k,baseline[k]]));}
function validateCounts(world,errors){for(const [section,fields] of Object.entries(COUNT_FIELDS))for(const field of fields){const value=world?.[section]?.[field];if(!Number.isInteger(value)||value<0)errors.push(`${section}.${field} must be a non-negative integer`);}}
function deriveFlags(world){
 const frame=object(world.population_frame),identity=object(world.identity_resolution),boundary=object(world.unit_boundary),linkage=object(world.linkage),turnover=object(world.turnover_lineage),monitoring=object(world.monitoring_correction);
 const frameComplete=frame.frame_complete===true&&frame.hard_to_enumerate_complete===true&&frame.missingness_complete===true&&frame.snapshot_current===true;
 const identityComplete=identity.identity_resolution_complete===true&&identity.duplicate_suppression_complete===true&&identity.alias_survivorship_complete===true;
 const boundaryComplete=boundary.person_boundary_complete===true&&boundary.household_boundary_complete===true&&boundary.account_boundary_complete===true&&boundary.organization_boundary_complete===true&&boundary.facility_boundary_complete===true&&boundary.legal_entity_boundary_complete===true&&boundary.operational_analytic_crosswalk_complete===true;
 const linkageComplete=linkage.independent_validation_complete===true&&linkage.clerical_review_complete===true&&linkage.false_rate_audit_complete===true&&linkage.source_independence_complete===true;
 const turnoverComplete=turnover.turnover_event_complete===true&&turnover.denominator_propagation_complete===true;
 const lineageComplete=turnover.current_population_frame_lineage===true;
 const monitoringComplete=['monitoring_complete','frame_refresh_complete','identity_drift_complete','linkage_drift_complete','turnover_trigger_complete','rollback_complete','correction_complete','appeal_complete','certificate_withdrawal_complete','durability_complete'].every(k=>monitoring[k]===true);
 const flags={
  frame_undercoverage_present:frame.omitted_population_unit_count>0||!frameComplete,
  identity_collision_present:identity.false_merged_unit_count>0||identity.collision_contaminated_linked_record_count>0,
  identity_fragmentation_present:identity.false_split_unit_count>0||identity.duplicate_unit_count>0||identity.alias_unresolved_count>0,
  unit_boundary_failure_present:boundary.household_boundary_misclassified_count>0||boundary.entity_boundary_misclassified_count>0||boundary.analytic_operational_substitution_count>0||!boundaryComplete,
  linkage_failure_present:linkage.false_positive_link_count>0||linkage.false_negative_link_count>0||linkage.orphan_record_count>0||linkage.ambiguous_link_count>0||!linkageComplete,
  turnover_boundary_drift_present:turnover.missing_entrant_count>0||turnover.retained_exit_count>0||turnover.migration_merger_misclassification_count>0||turnover.stale_frame_unit_count>0||!turnoverComplete,
  stale_population_frame_lineage_present:turnover.current_population_frame_lineage!==true||turnover.stale_population_frame_decision_count>0,
  frame_complete:frameComplete,identity_resolution_complete:identityComplete,unit_boundary_complete:boundaryComplete,linkage_validation_complete:linkageComplete,turnover_current_complete:turnoverComplete,current_lineage_complete:lineageComplete,monitoring_correction_complete:monitoringComplete
 };
 flags.complete_population_frame_assurance=['frame_complete','identity_resolution_complete','unit_boundary_complete','linkage_validation_complete','turnover_current_complete','current_lineage_complete','monitoring_correction_complete'].every(k=>flags[k]);return flags;
}
function chain(world,flags){const stages=[['PUBLIC','public-surface',world.public_claim],['FRAME','population-frame',world.population_frame],['IDENTITY','identity',world.identity_resolution],['BOUNDARY','unit-boundary',world.unit_boundary],['LINKAGE','cross-source-linkage',world.linkage],['TURNOVER','turnover-lineage',world.turnover_lineage],['MONITOR','monitoring-correction',world.monitoring_correction],['GOVERNANCE','governance',world.governance],['FLAGS','classification',flags],['INTERPRETATION','interpretation',{mechanism:world.mechanism,graph_effect:'none'}]];let previous=null;return stages.map(([suffix,stage,payload],index)=>{const unsigned={event_id:`${world.world_id}-${suffix}`,stage,source_event_ids:index?[`${world.world_id}-${stages[index-1][0]}`]:[],previous_event_sha256:previous,payload};const event={...unsigned,event_sha256:sha256(unsigned)};previous=event.event_sha256;return event;});}
function publicSignature(world){return sha256(world.public_claim);}
function governanceSignature(world,flags){return sha256({population_frame:world.population_frame,identity_resolution:world.identity_resolution,unit_boundary:world.unit_boundary,linkage:world.linkage,turnover_lineage:world.turnover_lineage,monitoring_correction:world.monitoring_correction,governance:world.governance,flags});}
function metrics(worlds){const sum=path=>worlds.reduce((t,w)=>t+path.split('.').reduce((v,k)=>v?.[k],w),0);const count=f=>worlds.filter(w=>w.flags[f]).length;return {
 world_count:worlds.length,distinct_public_status_signatures:new Set(worlds.map(w=>w.public_status_signature)).size,distinct_population_frame_governance_signatures:new Set(worlds.map(w=>w.governance_signature)).size,complete_population_frame_assurance_worlds:count('complete_population_frame_assurance'),frame_undercoverage_worlds:count('frame_undercoverage_present'),identity_collision_worlds:count('identity_collision_present'),identity_fragmentation_worlds:count('identity_fragmentation_present'),unit_boundary_failure_worlds:count('unit_boundary_failure_present'),linkage_failure_worlds:count('linkage_failure_present'),turnover_boundary_drift_worlds:count('turnover_boundary_drift_present'),stale_population_frame_lineage_worlds:count('stale_population_frame_lineage_present'),frame_complete_worlds:count('frame_complete'),identity_resolution_complete_worlds:count('identity_resolution_complete'),unit_boundary_complete_worlds:count('unit_boundary_complete'),linkage_validation_complete_worlds:count('linkage_validation_complete'),turnover_current_complete_worlds:count('turnover_current_complete'),current_lineage_complete_worlds:count('current_lineage_complete'),monitoring_correction_complete_worlds:count('monitoring_correction_complete'),same_public_population_frame_surface_worlds:worlds.filter(w=>w.public_status_signature===worlds[0].public_status_signature).length,
 total_omitted_population_unit_count:sum('population_frame.omitted_population_unit_count'),total_false_merged_unit_count:sum('identity_resolution.false_merged_unit_count'),total_false_split_unit_count:sum('identity_resolution.false_split_unit_count'),total_duplicate_unit_count:sum('identity_resolution.duplicate_unit_count'),total_collision_contaminated_linked_record_count:sum('identity_resolution.collision_contaminated_linked_record_count'),total_household_boundary_misclassified_count:sum('unit_boundary.household_boundary_misclassified_count'),total_entity_boundary_misclassified_count:sum('unit_boundary.entity_boundary_misclassified_count'),total_false_positive_link_count:sum('linkage.false_positive_link_count'),total_false_negative_link_count:sum('linkage.false_negative_link_count'),total_orphan_record_count:sum('linkage.orphan_record_count'),total_ambiguous_link_count:sum('linkage.ambiguous_link_count'),total_missing_entrant_count:sum('turnover_lineage.missing_entrant_count'),total_retained_exit_count:sum('turnover_lineage.retained_exit_count'),total_migration_merger_misclassification_count:sum('turnover_lineage.migration_merger_misclassification_count'),total_stale_frame_unit_count:sum('turnover_lineage.stale_frame_unit_count'),total_stale_population_frame_decision_count:sum('turnover_lineage.stale_population_frame_decision_count'),total_unsupported_population_frame_decisions:sum('governance.unsupported_population_frame_decision_count'),binding_public_authority_worlds:worlds.filter(w=>w.governance.binding_public_authority===true).length
 };}
export function validatePreferencePopulationFrameAssuranceFixture(fixture){const errors=[];if(fixture?.schema_version!==PREFERENCE_POPULATION_FRAME_ASSURANCE_FIXTURE_SCHEMA_VERSION)errors.push('population-frame fixture schema mismatch');if(fixture?.fixture_id!=='same-population-frame-verified-status-different-operational-states-v1')errors.push('population-frame fixture_id mismatch');if(fixture?.issue!==841||fixture?.parent_program_issue!==594)errors.push('population-frame issue custody mismatch');if(fixture?.status!=='synthetic_control')errors.push('population-frame status mismatch');if(fixture?.graph_effect!=='none')errors.push('population-frame graph effect must remain none');requireFalse(fixture?.counts_toward_thesis_evidence,'population-frame thesis evidence',errors);if(JSON.stringify(fixture?.baseline)!==JSON.stringify(BASELINE))errors.push('population-frame baseline mismatch');if(JSON.stringify(fixture?.world_defaults?.public_claim)!==JSON.stringify(publicClaim(fixture.baseline)))errors.push('population-frame world-default public claim mismatch');if(!sameMembers(fixture?.required_refusal_rules,REQUIRED_RULES))errors.push('population-frame refusal rules mismatch');for(const key of FALSE_POPULATION_FRAME_CLASSIFICATIONS)requireFalse(fixture?.expected_classification?.[key],`expected_classification.${key}`,errors);if(fixture?.expected_classification?.complete_population_frame_assurance_supported_in_at_least_one_world!==true)errors.push('complete population-frame assurance support must remain true');if(array(fixture?.prohibited_inferences).length<12)errors.push('population-frame prohibited inferences incomplete');if(!text(fixture?.interpretation_contract?.contract_id)||!text(fixture?.interpretation_contract?.copy_ready_caveat))errors.push('population-frame interpretation contract incomplete');const worlds=array(fixture?.worlds);if(worlds.length!==8)errors.push('population-frame fixture must contain eight worlds');if(JSON.stringify(worlds.map(w=>w.world_id))!==JSON.stringify(WORLD_IDS))errors.push('population-frame world IDs/order mismatch');for(const worldSpec of worlds){if(!text(worldSpec.mechanism))errors.push(`mechanism missing for ${worldSpec.world_id}`);const merged=deepMerge(fixture.world_defaults,worldSpec.overrides||{});validateCounts(merged,errors);const derived=deriveFlags(merged);for(const key of FLAG_KEYS)if(worldSpec?.expected_flags?.[key]!==derived[key])errors.push(`expected flag mismatch ${worldSpec.world_id}.${key}`);}return errors;}
export function compilePreferencePopulationFrameAssuranceFixture(fixture){const errors=validatePreferencePopulationFrameAssuranceFixture(fixture);if(errors.length)throw new Error(`invalid population-frame fixture:
- ${errors.join('\n- ')}`);const worlds=fixture.worlds.map(spec=>{const merged=deepMerge(fixture.world_defaults,spec.overrides||{});const world={world_id:spec.world_id,mechanism:spec.mechanism,...merged,public_claim:publicClaim(fixture.baseline)};const flags=deriveFlags(world);const custody=chain(world,flags);return{...world,flags,public_status_signature:publicSignature(world),governance_signature:governanceSignature(world,flags),custody_chain:custody,custody_chain_head_sha256:custody.at(-1).event_sha256};});return{schema_version:PREFERENCE_POPULATION_FRAME_ASSURANCE_BUILD_SCHEMA_VERSION,fixture_id:fixture.fixture_id,issue:fixture.issue,parent_program_issue:fixture.parent_program_issue,captured_at:fixture.captured_at,status:fixture.status,graph_effect:'none',counts_toward_thesis_evidence:false,conclusion_generated:false,preference_change_present:false,baseline:fixture.baseline,worlds,metrics:metrics(worlds),classification:fixture.expected_classification,refusal_rules:fixture.required_refusal_rules,prohibited_inferences:fixture.prohibited_inferences,interpretation_contract:fixture.interpretation_contract};}
function validateChain(world,errors){if(array(world?.custody_chain).length!==10)errors.push(`custody chain must contain ten events for ${world?.world_id}`);let previous=null;const seen=new Set();for(const event of array(world?.custody_chain)){if(event.previous_event_sha256!==previous)errors.push(`custody previous hash mismatch for ${world?.world_id}`);for(const id of array(event.source_event_ids))if(!seen.has(id))errors.push(`custody source missing for ${world?.world_id}`);const unsigned={...event};delete unsigned.event_sha256;if(event.event_sha256!==sha256(unsigned))errors.push(`custody event hash mismatch for ${world?.world_id}`);seen.add(event.event_id);previous=event.event_sha256;}if(previous!==world?.custody_chain_head_sha256)errors.push(`custody head mismatch for ${world?.world_id}`);}
export function validatePreferencePopulationFrameAssuranceBuild(compiled){const errors=[];if(compiled?.schema_version!==PREFERENCE_POPULATION_FRAME_ASSURANCE_BUILD_SCHEMA_VERSION)errors.push('population-frame build schema mismatch');if(compiled?.fixture_id!=='same-population-frame-verified-status-different-operational-states-v1')errors.push('population-frame build fixture_id mismatch');if(compiled?.issue!==841||compiled?.parent_program_issue!==594)errors.push('population-frame build issue mismatch');if(compiled?.graph_effect!=='none')errors.push('population-frame build graph effect must remain none');requireFalse(compiled?.counts_toward_thesis_evidence,'population-frame build thesis evidence',errors);requireFalse(compiled?.conclusion_generated,'population-frame conclusion',errors);requireFalse(compiled?.preference_change_present,'population-frame preference change',errors);if(JSON.stringify(compiled?.baseline)!==JSON.stringify(BASELINE))errors.push('population-frame build baseline mismatch');const worlds=array(compiled?.worlds);if(worlds.length!==8)errors.push('population-frame build must contain eight worlds');if(JSON.stringify(worlds.map(w=>w.world_id))!==JSON.stringify(WORLD_IDS))errors.push('population-frame build world IDs/order mismatch');for(const world of worlds){validateCounts(world,errors);const flags=deriveFlags(world);for(const key of FLAG_KEYS)if(world?.flags?.[key]!==flags[key])errors.push(`build flag mismatch ${world?.world_id}.${key}`);if(world.public_status_signature!==publicSignature(world))errors.push(`public signature mismatch ${world?.world_id}`);if(world.governance_signature!==governanceSignature(world,flags))errors.push(`governance signature mismatch ${world?.world_id}`);validateChain(world,errors);}if(JSON.stringify(compiled?.metrics)!==JSON.stringify(EXPECTED_POPULATION_FRAME_METRICS))errors.push('population-frame metrics mismatch');for(const key of FALSE_POPULATION_FRAME_CLASSIFICATIONS)requireFalse(compiled?.classification?.[key],`classification.${key}`,errors);if(compiled?.classification?.complete_population_frame_assurance_supported_in_at_least_one_world!==true)errors.push('population-frame complete support mismatch');if(!sameMembers(compiled?.refusal_rules,REQUIRED_RULES))errors.push('population-frame build refusal rules mismatch');if(array(compiled?.prohibited_inferences).length<12)errors.push('population-frame build prohibited inferences incomplete');if(!text(compiled?.interpretation_contract?.copy_ready_caveat))errors.push('population-frame build caveat missing');return errors;}
export function renderPreferencePopulationFrameAssuranceMarkdown(compiled){const lines=['# Preference Custody PC-35: population-frame assurance','',`**Fixture:** ${compiled.fixture_id}`,'',`**Status:** ${compiled.status}`,'',`**Graph effect:** ${compiled.graph_effect}`,'',`> ${compiled.interpretation_contract.copy_ready_caveat}`,'','## Frozen public surface',''];for(const [k,v] of Object.entries(compiled.worlds[0].public_claim))lines.push(`- ${k}: ${v}`);lines.push('','## Worlds','');for(const world of compiled.worlds)lines.push(`- **${world.world_id}** — ${world.mechanism}`);lines.push('','## Aggregate metrics','');for(const [k,v] of Object.entries(compiled.metrics))lines.push(`- ${k}: ${v}`);lines.push('','## Refusal rules','');for(const rule of compiled.refusal_rules)lines.push(`- ${rule}`);return lines.join('\n')+'\n';}
