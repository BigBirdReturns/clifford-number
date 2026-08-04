import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_FIXTURE_SCHEMA_VERSION = "preference-linkage-event-estimand-scope-interpretation-assurance-fixture@1";
export const PREFERENCE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_BUILD_SCHEMA_VERSION = 'preference-linkage-event-estimand-scope-interpretation-assurance-build@1';
export const REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES = Object.freeze(["one_event_badge_is_not_a_defined_predicted_event_or_state_space","one_pair_label_is_not_a_positive_negative_competing_event_censoring_abstention_or_ambiguity_contract","one_estimand_label_is_not_a_frozen_estimand_formula_or_coverage_target","one_population_badge_is_not_a_target_population_sampling_frame_or_inclusion_rule","one_unit_label_is_not_analysis_repeated_observation_cluster_or_dependence_boundary_custody","one_horizon_label_is_not_prediction_horizon_time_origin_follow_up_or_temporal_alignment_custody","one_coverage_badge_is_not_support_tail_interval_type_subgroup_limit_or_coverage_meaning_custody","aggregate_coverage_is_not_semantic_validity_for_every_event_population_unit_horizon_support_or_tail","historical_semantic_assurance_is_not_current_after_event_estimand_population_unit_horizon_or_interpretation_succession","a_complete_public_surface_is_not_a_complete_event_estimand_scope_and_interpretation_chain","semantic_failure_is_not_proof_of_preference_change_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent","synthetic_burdens_are_not_real_world_error_prevalence_welfare_trajectory_or_causal_effect_estimates","binding_public_authority_requires_separate_current_public_authorization_receipts"]);
export const LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_FALSE_CLASSIFICATIONS = Object.freeze(["public_event_badge_identifies_defined_event","public_estimand_label_identifies_frozen_estimand_formula","public_population_badge_identifies_target_population_and_frame","public_unit_label_identifies_analysis_repeated_observation_and_cluster_unit","public_horizon_label_identifies_time_origin_and_follow_up","public_coverage_label_identifies_support_tail_interval_type_and_coverage_meaning","published_coverage_establishes_real_world_effect","graph_effect_present","binding_public_authority_present"]);
export const COMPLETE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_CLASSIFICATION = "complete_event_estimand_scope_interpretation_assurance_supported_in_at_least_one_world";
export const EXPECTED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_METRICS = Object.freeze({"worlds":8,"public_event_estimand_population_coverage_signatures":1,"semantic_governance_signatures":8,"complete_event_estimand_scope_interpretation_assurance_worlds":1,"undefined_event_pairs":100,"censoring_competing_event_ambiguous_pairs":90,"estimand_mismatched_pairs":80,"population_frame_mismatched_pairs":70,"unit_cluster_mismatched_pairs":60,"horizon_time_origin_mismatched_pairs":50,"support_tail_coverage_meaning_mismatched_pairs":40,"unsupported_interpretation_decisions":700,"binding_public_authority_worlds":0});

const EXPECTED_BASELINE = Object.freeze({"operative_release":"RELEASE-INCIDENT-V1@1","published_candidate_pairs":100,"published_interval_bearing_pairs":100,"published_nominal_coverage":0.95,"published_empirical_coverage":0.95,"published_interval_misses":5,"published_mean_interval_width":0.02,"public_event_status":"linkage_interval_event_verified","public_estimand_status":"linkage_interval_estimand_defined","public_population_status":"target_population_represented","public_coverage_status":"empirical_coverage_validated","approved_use":"longitudinal_exposure_estimation"});
const EXPECTED_INTERPRETATION_CONTRACT = Object.freeze({"what_this_is":"A synthetic semantic-custody control separating one complete-looking linkage-interval publication surface from eight incompatible event, estimand, scope, and interpretation states.","what_this_is_not":"A real identity map, predicted event, estimand, target population, interval validity finding, empirical coverage claim, causal effect, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"A verified-looking event, estimand, population, and coverage surface does not establish defined event semantics, a frozen estimand, the target population and unit, the prediction horizon, support and tail meaning, or a current authorized interpretation."});
const EXPECTED_CLASSIFICATION = Object.freeze({"public_event_badge_identifies_defined_event":false,"public_estimand_label_identifies_frozen_estimand_formula":false,"public_population_badge_identifies_target_population_and_frame":false,"public_unit_label_identifies_analysis_repeated_observation_and_cluster_unit":false,"public_horizon_label_identifies_time_origin_and_follow_up":false,"public_coverage_label_identifies_support_tail_interval_type_and_coverage_meaning":false,"published_coverage_establishes_real_world_effect":false,"graph_effect_present":false,"binding_public_authority_present":false,"complete_event_estimand_scope_interpretation_assurance_supported_in_at_least_one_world":true});
const EXPECTED_WORLD_IDS = Object.freeze(["complete_semantic_assurance","undefined_or_substituted_event_state","censoring_competing_event_or_abstention_ambiguity","estimand_or_coverage_target_mismatch","target_population_sampling_frame_or_inclusion_mismatch","analysis_repeated_observation_or_cluster_unit_mismatch","prediction_horizon_time_origin_or_follow_up_mismatch","support_tail_interval_type_or_coverage_meaning_mismatch"]);
const EXPECTED_WORLD_SNAPSHOT_SHA256 = Object.freeze({"complete_semantic_assurance":"838eea9ad691b4cf4029d1edce58db3010766cf7e5abe1900ef7178753c16f06","undefined_or_substituted_event_state":"8589ff56b2812bee491632210e2306913d99d0df7817d54a6e3cb5ffe5070d44","censoring_competing_event_or_abstention_ambiguity":"b35d1bfdacad4da27c05f3b2a616ea37e4d016fa00f72edab8921f663da29d4d","estimand_or_coverage_target_mismatch":"7e84a4aae675a0c30a38ee96bff1ab46f855a3ceea20a698fe06dedb3a40f613","target_population_sampling_frame_or_inclusion_mismatch":"9b5868bba17ad7b9f3a1e6a9be88a15cec9e0ebd787e04016d72cf2a3729a8a8","analysis_repeated_observation_or_cluster_unit_mismatch":"d9df618421f7a18a0a15ec28e9189ac4e28bb9d7146597c5041a26f101a03670","prediction_horizon_time_origin_or_follow_up_mismatch":"27e1bf6bfcd0abb7363d13e3183250973aea42ccd76fab36c7d07d4f8e52756c","support_tail_interval_type_or_coverage_meaning_mismatch":"474fc51c876d4c203da397de4ebd2dc73a13f8e590f6aed9b9b47419746fd408"});
const EXPECTED_WORLD_BURDENS = Object.freeze({"complete_semantic_assurance":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":0},"undefined_or_substituted_event_state":{"undefined_event_pairs":100,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"censoring_competing_event_or_abstention_ambiguity":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":90,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"estimand_or_coverage_target_mismatch":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":80,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"target_population_sampling_frame_or_inclusion_mismatch":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":70,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"analysis_repeated_observation_or_cluster_unit_mismatch":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":60,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"prediction_horizon_time_origin_or_follow_up_mismatch":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":50,"support_tail_coverage_meaning_mismatched_pairs":0,"unsupported_interpretation_decisions":100},"support_tail_interval_type_or_coverage_meaning_mismatch":{"undefined_event_pairs":0,"censoring_competing_event_ambiguous_pairs":0,"estimand_mismatched_pairs":0,"population_frame_mismatched_pairs":0,"unit_cluster_mismatched_pairs":0,"horizon_time_origin_mismatched_pairs":0,"support_tail_coverage_meaning_mismatched_pairs":40,"unsupported_interpretation_decisions":100}});
const EXPECTED_MECHANISMS = Object.freeze({"complete_semantic_assurance":"complete_event_estimand_scope_interpretation_assurance","undefined_or_substituted_event_state":"undefined_or_substituted_event_state","censoring_competing_event_or_abstention_ambiguity":"censoring_competing_event_or_abstention_ambiguity","estimand_or_coverage_target_mismatch":"estimand_or_coverage_target_mismatch","target_population_sampling_frame_or_inclusion_mismatch":"target_population_sampling_frame_or_inclusion_mismatch","analysis_repeated_observation_or_cluster_unit_mismatch":"analysis_repeated_observation_or_cluster_unit_mismatch","prediction_horizon_time_origin_or_follow_up_mismatch":"prediction_horizon_time_origin_or_follow_up_mismatch","support_tail_interval_type_or_coverage_meaning_mismatch":"support_tail_interval_type_or_coverage_meaning_mismatch"});
const EXPECTED_FIXTURE_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_event_status","public_estimand_status","public_population_status","public_coverage_status","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","event_semantics","estimand","population_scope","unit_scope","horizon_scope","support_interpretation","governance","expected_mechanism","expected_flags"]);
const EXPECTED_COMPILED_WORLD_KEYS = Object.freeze(["world_id","description","event_semantics","estimand","population_scope","unit_scope","horizon_scope","support_interpretation","governance","expected_mechanism","expected_flags","public_surface","public_signature_sha256","semantic_governance_signature_sha256","observed_flags","burdens"]);
const EXPECTED_EVENT_KEYS = Object.freeze(["event_defined","state_space_defined","positive_negative_definition_complete","competing_events_resolved","censoring_semantics_defined","abstention_and_ambiguity_defined","undefined_event_pairs","censoring_competing_event_ambiguous_pairs"]);
const EXPECTED_ESTIMAND_KEYS = Object.freeze(["estimand_defined","estimand_formula_frozen","target_event_matches_estimand","coverage_target_defined","estimand_mismatched_pairs"]);
const EXPECTED_POPULATION_KEYS = Object.freeze(["target_population_defined","sampling_frame_defined","inclusion_exclusion_frozen","source_population_mapping_complete","population_frame_mismatched_pairs"]);
const EXPECTED_UNIT_KEYS = Object.freeze(["analysis_unit_defined","repeated_observation_unit_defined","cluster_unit_defined","dependence_boundary_defined","unit_cluster_mismatched_pairs"]);
const EXPECTED_HORIZON_KEYS = Object.freeze(["prediction_horizon_defined","time_origin_defined","follow_up_window_defined","temporal_alignment_complete","horizon_time_origin_mismatched_pairs"]);
const EXPECTED_SUPPORT_KEYS = Object.freeze(["support_defined","tails_defined","interval_type_defined","coverage_meaning_defined","subgroup_and_tail_limits_stated","support_tail_coverage_meaning_mismatched_pairs"]);
const EXPECTED_GOVERNANCE_KEYS = Object.freeze(["interpretation_current","supersession_defined","safe_decline_available","binding_public_authority","unsupported_interpretation_decisions"]);
const EXPECTED_FLAG_KEYS = Object.freeze(["complete_event_semantics","complete_estimand","complete_population_scope","complete_unit_scope","complete_horizon_scope","complete_support_interpretation","complete_event_estimand_scope_interpretation_assurance"]);
const BURDEN_KEYS = Object.freeze(["undefined_event_pairs","censoring_competing_event_ambiguous_pairs","estimand_mismatched_pairs","population_frame_mismatched_pairs","unit_cluster_mismatched_pairs","horizon_time_origin_mismatched_pairs","support_tail_coverage_meaning_mismatched_pairs","unsupported_interpretation_decisions"]);
const EXPECTED_BUILD_KEYS = Object.freeze(['schema_version','fixture_id','issue','parent_program_issue','captured_at','status','graph_effect','counts_toward_thesis_evidence','conclusion_generated','real_world_evidence_state','source_fixture_sha256','required_refusal_rules','baseline','worlds','metrics','classification','custody_chain','custody_chain_head_sha256','interpretation_contract']);
const EXPECTED_CUSTODY_EVENT_KEYS = Object.freeze(['authority','event_id','event_sha256','event_type','evidence_class','payload','previous_event_sha256','source_event_ids']);

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left,right)=>String(left).localeCompare(String(right)));
const sameMembers = (left,right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const nonnegative = value => Number.isInteger(value) && value >= 0;
const isoDate = value => { if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed=new Date(`${value}T00:00:00Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===value; };
const requireFalse = (value,label,errors) => { if(value!==false) errors.push(`${label} must remain false`); };
function requireExactKeys(value, expected, label, errors) { const keys=Object.keys(object(value)); if(stable(sorted(keys))!==stable(sorted(expected)) || keys.length!==expected.length) errors.push(`${label} key ledger mismatch`); }
function seal(event, previous) { const unsigned={...canonical(event),previous_event_sha256:previous}; return {...unsigned,event_sha256:sha256(unsigned)}; }

function projectWorld(world) {
  return {
    world_id:world?.world_id,
    description:world?.description,
    event_semantics:canonical(world?.event_semantics),
    estimand:canonical(world?.estimand),
    population_scope:canonical(world?.population_scope),
    unit_scope:canonical(world?.unit_scope),
    horizon_scope:canonical(world?.horizon_scope),
    support_interpretation:canonical(world?.support_interpretation),
    governance:canonical(world?.governance),
    expected_mechanism:world?.expected_mechanism,
    expected_flags:canonical(world?.expected_flags)
  };
}

function classifyWorld(world) {
  const event=object(world?.event_semantics), estimand=object(world?.estimand), population=object(world?.population_scope), unit=object(world?.unit_scope), horizon=object(world?.horizon_scope), support=object(world?.support_interpretation), governance=object(world?.governance);
  const flags={
    complete_event_semantics:['event_defined','state_space_defined','positive_negative_definition_complete','competing_events_resolved','censoring_semantics_defined','abstention_and_ambiguity_defined'].every(key=>event[key]===true),
    complete_estimand:['estimand_defined','estimand_formula_frozen','target_event_matches_estimand','coverage_target_defined'].every(key=>estimand[key]===true),
    complete_population_scope:['target_population_defined','sampling_frame_defined','inclusion_exclusion_frozen','source_population_mapping_complete'].every(key=>population[key]===true),
    complete_unit_scope:['analysis_unit_defined','repeated_observation_unit_defined','cluster_unit_defined','dependence_boundary_defined'].every(key=>unit[key]===true),
    complete_horizon_scope:['prediction_horizon_defined','time_origin_defined','follow_up_window_defined','temporal_alignment_complete'].every(key=>horizon[key]===true),
    complete_support_interpretation:['support_defined','tails_defined','interval_type_defined','coverage_meaning_defined','subgroup_and_tail_limits_stated'].every(key=>support[key]===true) && ['interpretation_current','supersession_defined','safe_decline_available'].every(key=>governance[key]===true)
  };
  flags.complete_event_estimand_scope_interpretation_assurance=Object.values(flags).every(Boolean);
  return flags;
}

function numericBurden(world) {
  return {
    undefined_event_pairs:world?.event_semantics?.undefined_event_pairs,
    censoring_competing_event_ambiguous_pairs:world?.event_semantics?.censoring_competing_event_ambiguous_pairs,
    estimand_mismatched_pairs:world?.estimand?.estimand_mismatched_pairs,
    population_frame_mismatched_pairs:world?.population_scope?.population_frame_mismatched_pairs,
    unit_cluster_mismatched_pairs:world?.unit_scope?.unit_cluster_mismatched_pairs,
    horizon_time_origin_mismatched_pairs:world?.horizon_scope?.horizon_time_origin_mismatched_pairs,
    support_tail_coverage_meaning_mismatched_pairs:world?.support_interpretation?.support_tail_coverage_meaning_mismatched_pairs,
    unsupported_interpretation_decisions:world?.governance?.unsupported_interpretation_decisions
  };
}

function governancePayload(world) { const approved=projectWorld(world); return {event_semantics:approved.event_semantics,estimand:approved.estimand,population_scope:approved.population_scope,unit_scope:approved.unit_scope,horizon_scope:approved.horizon_scope,support_interpretation:approved.support_interpretation,governance:approved.governance}; }
function fixtureSnapshot(fixture) { return sha256(fixture); }

export function validatePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture) {
  const errors=[];
  requireExactKeys(fixture,EXPECTED_FIXTURE_KEYS,'fixture',errors);
  if(fixture?.schema_version!==PREFERENCE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if(fixture?.fixture_id!=='same-linkage-event-estimand-population-coverage-status-different-semantic-states-v1') errors.push('fixture identity mismatch');
  if(fixture?.issue!==1036 || fixture?.parent_program_issue!==594) errors.push('fixture issue custody mismatch');
  if(!isoDate(fixture?.captured_at)) errors.push('fixture captured_at must be an exact ISO date');
  if(fixture?.status!=='synthetic_control' || fixture?.graph_effect!=='none') errors.push('fixture status or graph effect mismatch');
  requireFalse(fixture?.counts_toward_thesis_evidence,'fixture thesis evidence',errors);
  requireExactKeys(fixture?.baseline,EXPECTED_BASELINE_KEYS,'fixture baseline',errors);
  if(stable(fixture?.baseline)!==stable(EXPECTED_BASELINE)) errors.push('fixture frozen public surface mismatch');
  requireExactKeys(fixture?.interpretation_contract,EXPECTED_INTERPRETATION_KEYS,'fixture interpretation contract',errors);
  if(stable(fixture?.interpretation_contract)!==stable(EXPECTED_INTERPRETATION_CONTRACT)) errors.push('fixture interpretation contract mismatch');
  if(!sameMembers(fixture?.required_refusal_rules,REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES) || array(fixture?.required_refusal_rules).length!==REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES.length) errors.push('fixture refusal-rule ledger mismatch');
  requireExactKeys(fixture?.expected_classification,Object.keys(EXPECTED_CLASSIFICATION),'fixture classification',errors);
  if(stable(fixture?.expected_classification)!==stable(EXPECTED_CLASSIFICATION)) errors.push('fixture classification mismatch');
  const worlds=array(fixture?.worlds);
  if(worlds.length!==8 || stable(worlds.map(world=>world?.world_id))!==stable(EXPECTED_WORLD_IDS)) errors.push('fixture must contain the eight exact ordered worlds');
  let complete=0; const aggregate=Object.fromEntries(BURDEN_KEYS.map(key=>[key,0]));
  for(const world of worlds) {
    const id=text(world?.world_id);
    requireExactKeys(world,EXPECTED_WORLD_KEYS,`world ${id}`,errors);
    requireExactKeys(world?.event_semantics,EXPECTED_EVENT_KEYS,`world ${id} event_semantics`,errors);
    requireExactKeys(world?.estimand,EXPECTED_ESTIMAND_KEYS,`world ${id} estimand`,errors);
    requireExactKeys(world?.population_scope,EXPECTED_POPULATION_KEYS,`world ${id} population_scope`,errors);
    requireExactKeys(world?.unit_scope,EXPECTED_UNIT_KEYS,`world ${id} unit_scope`,errors);
    requireExactKeys(world?.horizon_scope,EXPECTED_HORIZON_KEYS,`world ${id} horizon_scope`,errors);
    requireExactKeys(world?.support_interpretation,EXPECTED_SUPPORT_KEYS,`world ${id} support_interpretation`,errors);
    requireExactKeys(world?.governance,EXPECTED_GOVERNANCE_KEYS,`world ${id} governance`,errors);
    requireExactKeys(world?.expected_flags,EXPECTED_FLAG_KEYS,`world ${id} expected_flags`,errors);
    if(!text(world?.description)) errors.push(`world ${id} description is required`);
    if(world?.expected_mechanism!==EXPECTED_MECHANISMS[id]) errors.push(`world ${id} mechanism mismatch`);
    if(sha256(projectWorld(world))!==EXPECTED_WORLD_SNAPSHOT_SHA256[id]) errors.push(`world ${id} snapshot mismatch`);
    const observedFlags=classifyWorld(world);
    if(stable(world?.expected_flags)!==stable(observedFlags)) errors.push(`world ${id} expected flags mismatch`);
    if(observedFlags.complete_event_estimand_scope_interpretation_assurance) complete+=1;
    if(world?.governance?.binding_public_authority!==false) errors.push(`world ${id} binding authority must remain false`);
    const observedBurden=numericBurden(world), expectedBurden=EXPECTED_WORLD_BURDENS[id];
    if(!expectedBurden || stable(observedBurden)!==stable(expectedBurden)) errors.push(`world ${id} burden-state mismatch`);
    for(const [key,value] of Object.entries(observedBurden)) { if(!nonnegative(value)) errors.push(`world ${id} ${key} must be a nonnegative integer`); else aggregate[key]+=value; }
  }
  if(complete!==1) errors.push('fixture must preserve exactly one complete event/estimand/scope/interpretation world');
  for(const [key,expected] of Object.entries(EXPECTED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_METRICS)) if(key in aggregate && aggregate[key]!==expected) errors.push(`fixture aggregate mismatch: ${key}`);
  return errors;
}

function custodyChain(fixture,compiledWorlds,metrics,classification) {
  const events=[]; let previous=null; const push=event=>{const sealed=seal(event,previous);events.push(sealed);previous=sealed.event_sha256;};
  push({event_id:`${fixture.fixture_id}:publication`,event_type:'frozen_public_event_estimand_population_coverage_surface_observed',evidence_class:'synthetic_publication_surface',authority:'pc47_fixture',source_event_ids:[],payload:{public_surface:canonical(EXPECTED_BASELINE),public_signature_sha256:sha256(EXPECTED_BASELINE)}});
  push({event_id:`${fixture.fixture_id}:event`,event_type:'event_and_censoring_semantics_sealed',evidence_class:'synthetic_control_state',authority:'pc47_compiler',source_event_ids:[`${fixture.fixture_id}:publication`],payload:{worlds:compiledWorlds.map(world=>({world_id:world.world_id,event_semantics:world.event_semantics}))}});
  push({event_id:`${fixture.fixture_id}:scope`,event_type:'estimand_population_unit_horizon_and_support_states_sealed',evidence_class:'synthetic_control_state',authority:'pc47_compiler',source_event_ids:[`${fixture.fixture_id}:event`],payload:{worlds:compiledWorlds.map(world=>({world_id:world.world_id,estimand:world.estimand,population_scope:world.population_scope,unit_scope:world.unit_scope,horizon_scope:world.horizon_scope,support_interpretation:world.support_interpretation}))}});
  push({event_id:`${fixture.fixture_id}:governance`,event_type:'interpretation_governance_states_sealed',evidence_class:'synthetic_control_state',authority:'pc47_compiler',source_event_ids:[`${fixture.fixture_id}:scope`],payload:{worlds:compiledWorlds.map(world=>({world_id:world.world_id,governance:world.governance}))}});
  push({event_id:`${fixture.fixture_id}:metrics`,event_type:'bounded_semantic_burdens_sealed',evidence_class:'synthetic_aggregate',authority:'pc47_compiler',source_event_ids:[`${fixture.fixture_id}:governance`],payload:{metrics}});
  push({event_id:`${fixture.fixture_id}:interpretation`,event_type:'interpretation_boundary_sealed',evidence_class:'candidate_inference',authority:'pc47_analyst',source_event_ids:[`${fixture.fixture_id}:metrics`],payload:{classification,interpretation_contract:canonical(EXPECTED_INTERPRETATION_CONTRACT),graph_effect:'none',real_world_evidence_state:'none'}});
  return events;
}

export function compilePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture) {
  const errors=validatePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture); if(errors.length) throw new Error(`invalid PC-47 fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature=sha256(EXPECTED_BASELINE);
  const compiledWorlds=fixture.worlds.map(sourceWorld=>{const world=projectWorld(sourceWorld);return {...canonical(world),public_surface:canonical(EXPECTED_BASELINE),public_signature_sha256:publicSignature,semantic_governance_signature_sha256:sha256(governancePayload(world)),observed_flags:classifyWorld(world),burdens:numericBurden(world)};});
  const metrics={worlds:compiledWorlds.length,public_event_estimand_population_coverage_signatures:unique(compiledWorlds.map(world=>world.public_signature_sha256)).length,semantic_governance_signatures:unique(compiledWorlds.map(world=>world.semantic_governance_signature_sha256)).length,complete_event_estimand_scope_interpretation_assurance_worlds:compiledWorlds.filter(world=>world.observed_flags.complete_event_estimand_scope_interpretation_assurance).length,...Object.fromEntries(BURDEN_KEYS.map(key=>[key,compiledWorlds.reduce((sum,world)=>sum+world.burdens[key],0)])),binding_public_authority_worlds:compiledWorlds.filter(world=>world.governance.binding_public_authority===true).length};
  const classification=canonical(EXPECTED_CLASSIFICATION); const custody=custodyChain(fixture,compiledWorlds,metrics,classification);
  return {schema_version:PREFERENCE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_BUILD_SCHEMA_VERSION,fixture_id:fixture.fixture_id,issue:fixture.issue,parent_program_issue:fixture.parent_program_issue,captured_at:fixture.captured_at,status:'synthetic_linkage_event_estimand_scope_interpretation_control_compiled',graph_effect:'none',counts_toward_thesis_evidence:false,conclusion_generated:false,real_world_evidence_state:'none',source_fixture_sha256:fixtureSnapshot(fixture),required_refusal_rules:[...REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES],baseline:canonical(EXPECTED_BASELINE),worlds:compiledWorlds,metrics,classification,custody_chain:custody,custody_chain_head_sha256:custody.at(-1).event_sha256,interpretation_contract:canonical(EXPECTED_INTERPRETATION_CONTRACT)};
}

function validateChain(compiled,errors) { const events=array(compiled?.custody_chain); if(events.length!==6) errors.push('compiled PC-47 custody chain must contain six events'); let previous=null; const seen=new Set(); for(const event of events) { requireExactKeys(event,EXPECTED_CUSTODY_EVENT_KEYS,'compiled PC-47 custody event',errors); if(event?.previous_event_sha256!==previous) errors.push('compiled PC-47 custody previous hash mismatch'); for(const sourceId of array(event?.source_event_ids)) if(!seen.has(sourceId)) errors.push('compiled PC-47 custody source missing'); const unsigned={...event}; delete unsigned.event_sha256; if(event?.event_sha256!==sha256(unsigned)) errors.push('compiled PC-47 custody event hash mismatch'); if(text(event?.event_id)) seen.add(event.event_id); previous=event?.event_sha256; } if(previous!==compiled?.custody_chain_head_sha256) errors.push('compiled PC-47 custody head mismatch'); }

export function validatePreferenceLinkageEventEstimandScopeInterpretationBuild(compiled,fixture) {
  const errors=[];
  requireExactKeys(compiled,EXPECTED_BUILD_KEYS,'compiled PC-47',errors);
  if(compiled?.schema_version!==PREFERENCE_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_BUILD_SCHEMA_VERSION) errors.push('compiled PC-47 schema mismatch');
  if(compiled?.fixture_id!=='same-linkage-event-estimand-population-coverage-status-different-semantic-states-v1' || compiled?.issue!==1036 || compiled?.parent_program_issue!==594) errors.push('compiled PC-47 identity mismatch');
  if(!isoDate(compiled?.captured_at)) errors.push('compiled PC-47 captured_at must be an exact ISO date');
  if(compiled?.status!=='synthetic_linkage_event_estimand_scope_interpretation_control_compiled' || compiled?.graph_effect!=='none' || compiled?.real_world_evidence_state!=='none') errors.push('compiled PC-47 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence,'compiled PC-47 thesis evidence',errors); requireFalse(compiled?.conclusion_generated,'compiled PC-47 conclusion',errors);
  if(!fixture) errors.push('compiled PC-47 fixture source is required');
  if(!/^[0-9a-f]{64}$/.test(text(compiled?.source_fixture_sha256))) errors.push('compiled PC-47 source hash invalid');
  if(fixture && compiled?.source_fixture_sha256!==fixtureSnapshot(fixture)) errors.push('compiled PC-47 source fixture hash mismatch');
  requireExactKeys(compiled?.baseline,EXPECTED_BASELINE_KEYS,'compiled PC-47 baseline',errors); if(stable(compiled?.baseline)!==stable(EXPECTED_BASELINE)) errors.push('compiled PC-47 baseline mismatch');
  requireExactKeys(compiled?.interpretation_contract,EXPECTED_INTERPRETATION_KEYS,'compiled PC-47 interpretation contract',errors); if(stable(compiled?.interpretation_contract)!==stable(EXPECTED_INTERPRETATION_CONTRACT)) errors.push('compiled PC-47 interpretation contract mismatch');
  if(!sameMembers(compiled?.required_refusal_rules,REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES) || array(compiled?.required_refusal_rules).length!==REQUIRED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_REFUSAL_RULES.length) errors.push('compiled PC-47 refusal ledger mismatch');
  requireExactKeys(compiled?.metrics,Object.keys(EXPECTED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_METRICS),'compiled PC-47 metrics',errors);
  requireExactKeys(compiled?.classification,Object.keys(EXPECTED_CLASSIFICATION),'compiled PC-47 classification',errors);
  if(stable(compiled?.classification)!==stable(EXPECTED_CLASSIFICATION)) errors.push('compiled PC-47 classification mismatch');
  const worlds=array(compiled?.worlds); if(worlds.length!==8 || stable(worlds.map(world=>world?.world_id))!==stable(EXPECTED_WORLD_IDS)) errors.push('compiled PC-47 world ledger mismatch');
  if(unique(worlds.map(world=>world?.public_signature_sha256)).length!==1) errors.push('compiled PC-47 must preserve one public signature');
  if(unique(worlds.map(world=>world?.semantic_governance_signature_sha256)).length!==8) errors.push('compiled PC-47 must preserve eight semantic governance signatures');
  for(const world of worlds) {
    const id=text(world?.world_id);
    requireExactKeys(world,EXPECTED_COMPILED_WORLD_KEYS,`compiled PC-47 world ${id}`,errors);
    requireExactKeys(world?.event_semantics,EXPECTED_EVENT_KEYS,`compiled PC-47 world ${id} event_semantics`,errors);
    requireExactKeys(world?.estimand,EXPECTED_ESTIMAND_KEYS,`compiled PC-47 world ${id} estimand`,errors);
    requireExactKeys(world?.population_scope,EXPECTED_POPULATION_KEYS,`compiled PC-47 world ${id} population_scope`,errors);
    requireExactKeys(world?.unit_scope,EXPECTED_UNIT_KEYS,`compiled PC-47 world ${id} unit_scope`,errors);
    requireExactKeys(world?.horizon_scope,EXPECTED_HORIZON_KEYS,`compiled PC-47 world ${id} horizon_scope`,errors);
    requireExactKeys(world?.support_interpretation,EXPECTED_SUPPORT_KEYS,`compiled PC-47 world ${id} support_interpretation`,errors);
    requireExactKeys(world?.governance,EXPECTED_GOVERNANCE_KEYS,`compiled PC-47 world ${id} governance`,errors);
    requireExactKeys(world?.expected_flags,EXPECTED_FLAG_KEYS,`compiled PC-47 world ${id} expected_flags`,errors);
    requireExactKeys(world?.observed_flags,EXPECTED_FLAG_KEYS,`compiled PC-47 world ${id} observed_flags`,errors);
    requireExactKeys(world?.burdens,BURDEN_KEYS,`compiled PC-47 world ${id} burdens`,errors);
    requireExactKeys(world?.public_surface,EXPECTED_BASELINE_KEYS,`compiled PC-47 world ${id} public_surface`,errors);
    if(stable(world?.public_surface)!==stable(EXPECTED_BASELINE)) errors.push(`compiled PC-47 world ${id} public surface mismatch`);
    if(world?.public_signature_sha256!==sha256(EXPECTED_BASELINE)) errors.push(`compiled PC-47 world ${id} public signature mismatch`);
    if(world?.semantic_governance_signature_sha256!==sha256(governancePayload(world))) errors.push(`compiled PC-47 world ${id} governance signature mismatch`);
    if(world?.expected_mechanism!==EXPECTED_MECHANISMS[id]) errors.push(`compiled PC-47 world ${id} mechanism mismatch`);
    if(sha256(projectWorld(world))!==EXPECTED_WORLD_SNAPSHOT_SHA256[id]) errors.push(`compiled PC-47 world ${id} snapshot mismatch`);
    const expectedFlags=classifyWorld(world); if(stable(world?.expected_flags)!==stable(expectedFlags) || stable(world?.observed_flags)!==stable(expectedFlags)) errors.push(`compiled PC-47 world ${id} flag mismatch`);
    const observedBurden=numericBurden(world), expectedBurden=EXPECTED_WORLD_BURDENS[id];
    if(stable(world?.burdens)!==stable(observedBurden)) errors.push(`compiled PC-47 world ${id} burden mismatch`);
    if(!expectedBurden || stable(observedBurden)!==stable(expectedBurden) || stable(world?.burdens)!==stable(expectedBurden)) errors.push(`compiled PC-47 world ${id} burden-state mismatch`);
    if(world?.governance?.binding_public_authority!==false) errors.push(`compiled PC-47 world ${id} binding authority must remain false`);
  }
  for(const [key,expected] of Object.entries(EXPECTED_LINKAGE_EVENT_ESTIMAND_SCOPE_INTERPRETATION_METRICS)) if(compiled?.metrics?.[key]!==expected) errors.push(`compiled PC-47 metric mismatch: ${key}`);
  validateChain(compiled,errors);
  if(fixture && !errors.length) { const fixtureErrors=validatePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture); if(fixtureErrors.length) errors.push(...fixtureErrors.map(error=>`compiled PC-47 fixture invalid: ${error}`)); else { try { const expected=compilePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture); if(stable(compiled)!==stable(expected)) errors.push('compiled PC-47 build does not deterministically reconstruct from fixture'); } catch(error) { errors.push(`compiled PC-47 reconstruction failed: ${error instanceof Error ? error.message : String(error)}`); } } }
  return errors;
}

export function renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown(compiled) { const lines=['# Preference linkage event, estimand, scope, and interpretation assurance','',`**Status:** ${compiled.status}`,'',`**Worlds:** ${compiled.metrics.worlds}`,'',`**Complete semantic-assurance worlds:** ${compiled.metrics.complete_event_estimand_scope_interpretation_assurance_worlds}`,'','## Frozen public surface','']; for(const [key,value] of Object.entries(compiled.baseline)) lines.push(`- ${key}: ${value}`); lines.push('','## Bounded synthetic burdens',''); for(const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`); lines.push('','## Claim boundary','','This synthetic control does not establish a real predicted event, estimand, target population, unit, horizon, support, tail, interval validity, empirical coverage, causal effect, graph fact, allegation, or public-authority verdict.'); return `${lines.join('\n')}\n`; }
