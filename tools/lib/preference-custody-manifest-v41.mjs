import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV40Build } from './preference-custody-manifest-v40.mjs';
import { EXPECTED_LINKAGE_PROBABILITY_METRICS, REQUIRED_LINKAGE_PROBABILITY_REFUSAL_RULES, validatePreferenceLinkageProbabilityCalibrationAssuranceBuild } from './preference-linkage-probability-calibration-assurance.mjs';
export const PREFERENCE_CUSTODY_MANIFEST_V41_SCHEMA_VERSION = 'preference-custody-control-manifest-v41@1';
export const PREFERENCE_CUSTODY_MANIFEST_V41_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v41-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 43 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'linkage_score_probability_calibration_validation_design_and_uncertainty_assurance';
const REQUIRED_SUCCESSORS = ['linkage_probability_calibration_base_rate_shift_validation_sampling_and_out_of_sample_assurance','linkage_uncertainty_interval_coverage_subgroup_drift_monitoring_and_recalibration_governance'];
const FALSE_CLASSIFICATIONS = [
  "one_score_identifies_calibrated_probability",
  "monotonic_ordering_identifies_probability_calibration",
  "full_calibrated_coverage_identifies_complete_pair_coverage",
  "mean_probability_identifies_correctness",
  "zero_brier_identifies_zero_true_brier_loss",
  "zero_ece_identifies_complete_calibration",
  "reliability_curve_identifies_out_of_sample_calibration",
  "train_or_tune_performance_identifies_independent_validation",
  "random_pair_split_identifies_entity_source_and_time_independence",
  "production_linkage_labels_identify_independent_ground_truth",
  "aggregate_calibration_identifies_subgroup_source_geography_language_identifier_quality_missingness_and_time_calibration",
  "calibration_prevalence_identifies_deployment_prevalence",
  "case_control_calibration_identifies_deployment_calibration_without_prior_correction",
  "convenience_validation_sample_identifies_deployment_pair_universe",
  "absence_of_hard_negatives_identifies_low_false_match_probability",
  "numeric_interval_endpoints_identify_valid_uncertainty",
  "nominal_coverage_identifies_empirical_coverage",
  "adaptive_selection_identifies_locked_validation",
  "historical_probability_assurance_identifies_current_assurance_after_succession",
  "public_linkage_probabilities_validated_status_identifies_complete_current_correctable_authorized_evidence",
  "probability_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = "complete_linkage_probability_assurance_supported_in_at_least_one_world";
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sameMembers = (left, right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }
function chain(manifest, base, control, openFrontiers, requirements) {
  const events = []; let previous = null; const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_v40_floor_snapshot', evidence_class: 'compiled_synthetic_control_floor', authority: 'preference_custody_v40_compiler', source_event_ids: [], payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) } });
  push({ event_id: `${manifest.manifest_id}:pc43`, event_type: 'pc43_linkage_probability_calibration_validation_and_uncertainty_control_admitted', evidence_class: 'compiled_synthetic_control', authority: 'linkage_probability_calibration_compiler', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control, snapshot_sha256: sha256(control) } });
  push({ event_id: `${manifest.manifest_id}:frontier`, event_type: 'linkage_probability_calibration_frontier_transition_sealed', evidence_class: 'laboratory_frontier_contract', authority: 'preference_custody_v41_compiler', source_event_ids: [`${manifest.manifest_id}:pc43`], payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers } });
  push({ event_id: `${manifest.manifest_id}:promotion`, event_type: 'linkage_probability_real_case_promotion_boundary_sealed', evidence_class: 'laboratory_promotion_contract', authority: 'preference_custody_v41_compiler', source_event_ids: [`${manifest.manifest_id}:frontier`], payload: { identification_requirement: manifest.identification_requirement, real_case_requires: requirements } });
  push({ event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'preference_custody_v41_analyst', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified forty-three-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}
export function validatePreferenceCustodyManifestV41(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V41_SCHEMA_VERSION) errors.push('v41 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v41') errors.push('v41 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 928) errors.push('v41 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v41 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v41 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v40' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v40.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v40-build@1' || base.expected_control_count !== 42) errors.push('v41 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-43' || extension.fixture_id !== 'same-linkage-probabilities-validated-status-different-operational-states-v1' || extension.failure_class !== 'linkage_score_probability_calibration_validation_sampling_prevalence_shift_uncertainty_subgroup_error_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-linkage-probability-calibration-assurance.json' || extension.expected_build_schema !== 'preference-linkage-probability-calibration-assurance-build@1') errors.push('v41 extension contract mismatch');
  if (!sameMembers(extension.required_refusal_rules, REQUIRED_LINKAGE_PROBABILITY_REFUSAL_RULES) || array(extension.required_refusal_rules).length !== REQUIRED_LINKAGE_PROBABILITY_REFUSAL_RULES.length) errors.push('v41 refusal-rule contract must match the exact PC-43 ledger');
  if (manifest?.identification_requirement?.stage !== 'score_semantics_label_validation_sampling_prevalence_calibration_subgroup_uncertainty_selection_and_lineage') errors.push('v41 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v41 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS)) errors.push('v41 successor frontier mismatch');
  if (unique(manifest?.real_case_requirements_added).length !== 48) errors.push('v41 must add exactly forty-eight unique real-case requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v41 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 18) errors.push('v41 prohibited-inference ledger incomplete');
  if (manifest?.interpretation_contract?.contract_id !== PREFERENCE_CUSTODY_MANIFEST_V41_SCHEMA_VERSION || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v41 interpretation contract incomplete');
  return errors;
}
function validateBaseSources(baseBuild, baseSources) {
  if (!baseSources) return ['v41 base source bundle is required'];
  return validatePreferenceCustodyManifestV40Build(baseBuild, baseSources.manifest, baseSources.baseBuild, baseSources.scoreBuild, baseSources.scoreFixture, baseSources.baseSources);
}
export function compilePreferenceCustodyManifestV41(manifest, baseBuild, probabilityBuild, probabilityFixture, baseSources) {
  const errors = validatePreferenceCustodyManifestV41(manifest); if (errors.length) throw new Error(`invalid v41 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validateBaseSources(baseBuild, baseSources); if (baseErrors.length) throw new Error(`invalid v40 base:\n- ${baseErrors.join('\n- ')}`);
  const probabilityErrors = validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(probabilityBuild, probabilityFixture); if (probabilityErrors.length) throw new Error(`invalid PC-43 build:\n- ${probabilityErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 42 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v40') throw new Error('v41 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers); if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v41 base does not contain the resolved probability-calibration frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = { control_id:'PC-43', fixture_id:probabilityBuild.fixture_id, failure_class:manifest.extension_control.failure_class, source_fixture_path:manifest.extension_control.source_fixture_path, build_artifact_path:manifest.extension_control.build_artifact_path, graph_effect:'none', counts_toward_thesis_evidence:false, conclusion_generated:false, real_world_effect_claimed:false, preference_change_present:false, manipulative_intent_inferable:false, required_refusal_rules:[...requiredRules], observed_refusal_rules:[...probabilityBuild.required_refusal_rules], proof_summary:{...probabilityBuild.metrics, ...probabilityBuild.classification} };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires); const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 48) throw new Error('v41 requirement extension is not exactly forty-eight');
  const controls = [...baseBuild.controls, control]; const custody = chain(manifest, baseBuild, control, openFrontiers, requirements);
  return { schema_version:PREFERENCE_CUSTODY_MANIFEST_V41_BUILD_SCHEMA_VERSION, manifest_id:manifest.manifest_id, issue:manifest.issue, control_issue:manifest.control_issue, captured_at:manifest.captured_at, status:'laboratory_floor_v41_qualified', graph_effect:'none', counts_toward_thesis_evidence:false, conclusion_generated:false, real_world_evidence_state:'none', control_count:controls.length, controls,
    composition:{base_manifest_id:baseBuild.manifest_id,base_schema_version:baseBuild.schema_version,base_control_count:baseBuild.control_count,extension_control_id:'PC-43',manifest_snapshot_sha256:sha256(manifest),base_floor_snapshot_sha256:sha256(baseBuild),extension_snapshot_sha256:sha256(probabilityBuild),base_controls_sha256:sha256(baseBuild.controls),base_promotion_requirements_sha256:sha256(baseRequirements),base_promotion_requirement_count:baseRequirements.length,added_promotion_requirement_count:requirements.length-baseRequirements.length,final_promotion_requirement_count:requirements.length,base_open_frontiers:[...baseOpen]},
    control_integrity:{base_floor_qualified:true,base_integrity_preserved:Object.values(baseBuild.control_integrity).every(Boolean),all_graph_effect_none:controls.every(item=>item.graph_effect==='none'),no_thesis_evidence_consumption:controls.every(item=>item.counts_toward_thesis_evidence===false),no_real_world_conclusion:true,no_preference_change_claim:true,no_intent_inference:true,all_required_pc43_refusal_rules_present:requiredRules.every(rule=>probabilityBuild.required_refusal_rules.includes(rule)),complete_linkage_probability_assurance_path_preserved:probabilityBuild.metrics.complete_linkage_probability_assurance_worlds===1},
    identification_requirements:[...baseBuild.identification_requirements,manifest.identification_requirement],refusal_rule_union:unique([...baseBuild.refusal_rule_union,...probabilityBuild.required_refusal_rules]),open_frontiers:openFrontiers,frontier_transition:manifest.frontier_transition,promotion_boundary:{...baseBuild.promotion_boundary,promotion_requirement_count:requirements.length,real_case_requires:requirements,laboratory_controls_are_real_world_evidence:false},custody_chain:custody,custody_chain_head_sha256:custody.at(-1).event_sha256,prohibited_inferences:[...baseBuild.prohibited_inferences,...manifest.prohibited_inferences],interpretation_contract:manifest.interpretation_contract };
}
function validateChain(compiled, errors) { const events=array(compiled?.custody_chain); if(events.length!==5) errors.push('compiled v41 custody chain must contain five events'); let previous=null; const seen=new Set(); for(const event of events){ if(event?.previous_event_sha256!==previous) errors.push('compiled v41 custody previous hash mismatch'); for(const sourceId of array(event?.source_event_ids)) if(!seen.has(sourceId)) errors.push('compiled v41 custody source missing'); const unsigned={...event}; delete unsigned.event_sha256; if(event?.event_sha256!==sha256(unsigned)) errors.push('compiled v41 custody event hash mismatch'); if(text(event?.event_id)) seen.add(event.event_id); previous=event?.event_sha256; } if(previous!==compiled?.custody_chain_head_sha256) errors.push('compiled v41 custody head mismatch'); }
export function validatePreferenceCustodyManifestV41Build(compiled, manifest, baseBuild, probabilityBuild, probabilityFixture, baseSources) {
  const errors=[];
  if(compiled?.schema_version!==PREFERENCE_CUSTODY_MANIFEST_V41_BUILD_SCHEMA_VERSION) errors.push('compiled v41 schema mismatch');
  if(compiled?.manifest_id!=='preference-custody-laboratory-floor-v41'||compiled?.control_issue!==928) errors.push('compiled v41 identity mismatch');
  if(compiled?.status!=='laboratory_floor_v41_qualified'||compiled?.graph_effect!=='none'||compiled?.real_world_evidence_state!=='none') errors.push('compiled v41 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence,'compiled v41 thesis evidence',errors); requireFalse(compiled?.conclusion_generated,'compiled v41 conclusion',errors);
  if(compiled?.control_count!==43||array(compiled?.controls).length!==43||!sameMembers(array(compiled?.controls).map(control=>control?.control_id),REQUIRED_CONTROL_IDS)) errors.push('compiled v41 must preserve forty-three exact controls');
  const composition=object(compiled?.composition);
  if(composition.base_manifest_id!=='preference-custody-laboratory-floor-v40'||composition.base_schema_version!=='preference-custody-control-manifest-v40-build@1'||composition.base_control_count!==42||composition.extension_control_id!=='PC-43') errors.push('compiled v41 composition identity mismatch');
  if(composition.base_promotion_requirement_count!==1581||composition.added_promotion_requirement_count!==48||composition.final_promotion_requirement_count!==1629) errors.push('compiled v41 promotion counts mismatch');
  for(const key of ['manifest_snapshot_sha256','base_floor_snapshot_sha256','extension_snapshot_sha256','base_controls_sha256','base_promotion_requirements_sha256']) if(!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v41 invalid hash: ${key}`);
  if(!manifest) errors.push('compiled v41 manifest source is required'); if(!baseBuild) errors.push('compiled v41 base source is required'); if(!probabilityBuild) errors.push('compiled v41 PC-43 source is required'); if(!probabilityFixture) errors.push('compiled v41 PC-43 fixture source is required'); if(!baseSources) errors.push('compiled v41 transitive base source bundle is required');
  if(manifest&&baseBuild&&probabilityBuild&&probabilityFixture&&baseSources){ const manifestErrors=validatePreferenceCustodyManifestV41(manifest); const baseErrors=validateBaseSources(baseBuild,baseSources); const probabilityErrors=validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(probabilityBuild,probabilityFixture); if(manifestErrors.length) errors.push(...manifestErrors.map(error=>`compiled v41 manifest source invalid: ${error}`)); if(baseErrors.length) errors.push(...baseErrors.map(error=>`compiled v41 base source invalid: ${error}`)); if(probabilityErrors.length) errors.push(...probabilityErrors.map(error=>`compiled v41 PC-43 source invalid: ${error}`)); if(!manifestErrors.length&&!baseErrors.length&&!probabilityErrors.length){ try{ const expected=compilePreferenceCustodyManifestV41(manifest,baseBuild,probabilityBuild,probabilityFixture,baseSources); if(composition.manifest_snapshot_sha256!==sha256(manifest)) errors.push('compiled v41 manifest snapshot hash mismatch'); if(composition.base_floor_snapshot_sha256!==sha256(baseBuild)) errors.push('compiled v41 base floor snapshot hash mismatch'); if(composition.extension_snapshot_sha256!==sha256(probabilityBuild)) errors.push('compiled v41 extension snapshot hash mismatch'); if(stable(compiled)!==stable(expected)) errors.push('compiled v41 build does not deterministically reconstruct from supplied sources'); }catch(error){errors.push(`compiled v41 source reconstruction failed: ${error instanceof Error?error.message:String(error)}`);} } }
  const controls=array(compiled?.controls); if(baseBuild&&stable(controls.slice(0,42))!==stable(baseBuild.controls)) errors.push('compiled v41 preserved base controls mismatch'); const pc43=controls.at(-1); if(pc43?.control_id!=='PC-43'||pc43?.fixture_id!=='same-linkage-probabilities-validated-status-different-operational-states-v1') errors.push('compiled v41 PC-43 identity mismatch');
  if(probabilityBuild&&stable(pc43?.proof_summary)!==stable({...probabilityBuild.metrics,...probabilityBuild.classification})) errors.push('compiled v41 PC-43 proof summary mismatch');
  if(!sameMembers(compiled?.frontier_transition?.successor_frontiers,REQUIRED_SUCCESSORS)||compiled?.frontier_transition?.resolved_base_frontier!==RESOLVED_FRONTIER) errors.push('compiled v41 frontier transition mismatch');
  if(array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v41 resolved frontier remains open'); for(const successor of REQUIRED_SUCCESSORS) if(!array(compiled?.open_frontiers).includes(successor)) errors.push(`compiled v41 missing successor: ${successor}`);
  if(baseBuild) for(const frontier of array(baseBuild.open_frontiers).filter(item=>item!==RESOLVED_FRONTIER)) if(!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v41 lost base frontier: ${frontier}`);
  if(compiled?.promotion_boundary?.promotion_requirement_count!==1629||unique(compiled?.promotion_boundary?.real_case_requires).length!==1629) errors.push('compiled v41 promotion boundary mismatch'); requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence,'compiled v41 laboratory evidence',errors);
  for(const key of Object.keys(object(compiled?.control_integrity))) if(compiled.control_integrity[key]!==true) errors.push(`compiled v41 integrity flag false: ${key}`);
  if(pc43){ for(const key of Object.keys(EXPECTED_LINKAGE_PROBABILITY_METRICS)) if(pc43?.proof_summary?.[key]!==EXPECTED_LINKAGE_PROBABILITY_METRICS[key]) errors.push(`compiled v41 PC-43 metric mismatch: ${key}`); for(const key of FALSE_CLASSIFICATIONS) requireFalse(pc43?.proof_summary?.[key],`compiled v41 PC-43 classification.${key}`,errors); if(pc43?.proof_summary?.[TRUE_CLASSIFICATION]!==true) errors.push('compiled v41 complete probability path missing'); }
  validateChain(compiled,errors); return errors;
}
export function renderPreferenceCustodyManifestV41Markdown(compiled) { const lines=['# Preference Custody laboratory floor v41','',`**Status:** ${compiled.status}`,'',`**Controls:** ${compiled.control_count}`,'',`**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`,'','> Floor v41 preserves the qualified forty-two-control base and adds PC-43 linkage-probability calibration, validation-design, prevalence, subgroup, uncertainty, adaptive-selection, correction, and lineage custody.','','## PC-43 proof summary','']; const control=compiled.controls.at(-1); for(const [key,value] of Object.entries(control.proof_summary)) lines.push(`- ${key}: ${value}`); lines.push('','## Claim boundary','','This is a synthetic compositional control floor, not a real identity map, match probability, calibration or uncertainty estimate, subgroup burden, causal conclusion, graph fact, or public-authority verdict.'); return `${lines.join('\n')}\n`; }
