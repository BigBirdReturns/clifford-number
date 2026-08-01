export const PREFERENCE_CUSTODY_MANIFEST_SCHEMA_VERSION = 'preference-custody-control-manifest@1';
export const PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-build@1';

const REQUIRED_CONTROL_IDS = [
  'PC-01',
  'PC-02',
  'PC-03',
  'PC-04',
  'PC-05',
  'PC-06',
  'PC-07',
  'PC-08',
  'PC-09',
  'PC-10'
];

const REQUIRED_FAILURE_CLASSES = [
  'agenda_formation_and_collective_option_generation',
  'attrition_and_refusal_censoring',
  'authority_laundering_and_nonbinding_consultation',
  'dynamic_preference_change_and_measurement_equifinality',
  'exposure_policy_confounding',
  'model_metric_policy_and_validation_succession',
  'negotiated_package_formation_and_collective_bargaining',
  'observational_equivalence',
  'option_set_starvation',
  'subgroup_response_capacity_and_burden'
];

const REQUIRED_IDENTIFICATION_STAGES = [
  'agenda_formation',
  'attrition_and_refusal',
  'dynamic_preference_change',
  'exposure_policy',
  'option_set',
  'package_formation_and_bargaining',
  'public_authorization',
  'response_mechanism',
  'subgroup_distribution',
  'system_succession_and_validation'
];

const EPSILON = 1e-12;

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(array(values).map(value => text(value)).filter(Boolean))];
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function sameMembers(left, right) {
  return JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
}

function close(left, right, tolerance = EPSILON) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function requireFalse(value, label, errors) {
  if (value !== false) errors.push(`${label} must remain false`);
}

function commonSummary(control, build) {
  return {
    control_id: control.control_id,
    fixture_id: control.fixture_id,
    failure_class: control.failure_class,
    source_fixture_path: control.source_fixture_path,
    build_artifact_path: control.build_artifact_path,
    build_schema_version: build.schema_version,
    graph_effect: build.graph_effect,
    counts_toward_thesis_evidence: build.counts_toward_thesis_evidence,
    conclusion_generated: build.conclusion_generated,
    real_world_effect_claimed: build.classification?.real_world_effect_claimed,
    preference_change_present: build.classification?.preference_change_present,
    manipulative_intent_inferable: build.classification?.manipulative_intent_inferable,
    required_refusal_rules: control.required_refusal_rules,
    observed_refusal_rules: array(build.refusal_rules)
  };
}

function summarizeControl(control, build) {
  const common = commonSummary(control, build);
  switch (control.control_id) {
    case 'PC-01':
      return {
        ...common,
        proof_summary: {
          maximum_naive_drift: build.metrics?.max_naive_absolute_drift_from_latent,
          maximum_corrected_drift: build.metrics?.max_propensity_corrected_absolute_drift_from_latent,
          exposure_confounding_supported: build.classification?.exposure_confounding_supported,
          preference_identification_without_propensity: build.classification?.preference_identification_without_propensity
        }
      };
    case 'PC-02':
      return {
        ...common,
        proof_summary: {
          distinct_observation_signatures: build.metrics?.distinct_observation_signatures,
          same_population_distinct_observations: build.metrics?.same_population_distinct_observations,
          maximum_naive_full_vector_drift: build.metrics?.max_unsupported_naive_full_vector_absolute_drift,
          first_choice_identification: build.classification?.first_choice_identification_from_raw_choices
        }
      };
    case 'PC-03':
      return {
        ...common,
        proof_summary: {
          distinct_latent_world_signatures: build.metrics?.distinct_latent_world_signatures,
          distinct_observation_signatures: build.metrics?.distinct_observation_signatures,
          maximum_pairwise_latent_total_variation: build.metrics?.maximum_pairwise_latent_total_variation,
          latent_first_choice_identification: build.classification?.latent_first_choice_identification,
          response_mechanism_identification: build.classification?.response_mechanism_identification
        }
      };
    case 'PC-04':
      return {
        ...common,
        proof_summary: {
          distinct_headline_signatures: build.metrics?.distinct_headline_signatures,
          distinct_full_outcome_signatures: build.metrics?.distinct_full_outcome_signatures,
          distinct_mechanism_signatures: build.metrics?.distinct_mechanism_signatures,
          observed_total_range: build.metrics?.observed_total_range,
          exit_total_range: build.metrics?.exit_total_range,
          nonresponse_total_range: build.metrics?.nonresponse_total_range,
          preference_change_identification: build.classification?.preference_change_identification_from_headline,
          strategic_refusal_identification: build.classification?.strategic_refusal_identification_from_headline,
          population_support_identification: build.classification?.population_support_identification_from_headline
        }
      };
    case 'PC-05':
      return {
        ...common,
        proof_summary: {
          distinct_aggregate_headline_signatures: build.metrics?.distinct_aggregate_headline_signatures,
          distinct_subgroup_outcome_signatures: build.metrics?.distinct_subgroup_outcome_signatures,
          distinct_burden_signatures: build.metrics?.distinct_burden_signatures,
          maximum_subgroup_success_rate_gap: build.metrics?.maximum_subgroup_success_rate_gap,
          maximum_adaptation_cost_ratio: build.metrics?.maximum_adaptation_cost_ratio,
          aggregate_success_rate: build.metrics?.aggregate_success_rate,
          subgroup_outcome_identification: build.classification?.subgroup_outcome_identification_from_aggregate,
          adaptation_burden_identification: build.classification?.adaptation_burden_identification_from_aggregate,
          willingness_identification: build.classification?.willingness_identification_from_adaptation
        }
      };
    case 'PC-06':
      return {
        ...common,
        proof_summary: {
          distinct_aggregate_headline_signatures: build.metrics?.distinct_aggregate_headline_signatures,
          distinct_support_evidence_classes: build.metrics?.distinct_support_evidence_classes,
          distinct_authority_classes: build.metrics?.distinct_authority_classes,
          distinct_authority_resolution_signatures: build.metrics?.distinct_authority_resolution_signatures,
          public_authorized_worlds: build.metrics?.public_authorized_worlds,
          institutionally_approved_without_public_authorization_worlds: build.metrics?.institutionally_approved_without_public_authorization_worlds,
          binding_public_rejection_worlds: build.metrics?.binding_public_rejection_worlds,
          aggregate_support_rate: build.metrics?.aggregate_support_rate,
          modeled_support_confers_authorization: build.classification?.modeled_support_confers_authorization,
          advisory_feedback_confers_authorization: build.classification?.advisory_feedback_confers_authorization,
          institutional_approval_is_public_authorization: build.classification?.institutional_approval_is_public_authorization,
          aggregate_support_identifies_authorization: build.classification?.aggregate_support_identifies_authorization
        }
      };
    case 'PC-07':
      return {
        ...common,
        proof_summary: {
          distinct_preliminary_headline_signatures: build.metrics?.distinct_preliminary_headline_signatures,
          distinct_final_option_set_signatures: build.metrics?.distinct_final_option_set_signatures,
          distinct_agenda_resolution_signatures: build.metrics?.distinct_agenda_resolution_signatures,
          institutionally_controlled_agenda_worlds: build.metrics?.institutionally_controlled_agenda_worlds,
          public_agenda_authority_worlds: build.metrics?.public_agenda_authority_worlds,
          binding_collective_option_generation_worlds: build.metrics?.binding_collective_option_generation_worlds,
          binding_objective_rejection_worlds: build.metrics?.binding_objective_rejection_worlds,
          preliminary_A_share: build.metrics?.preliminary_A_share,
          latent_C_first_choice_share: build.metrics?.latent_C_first_choice_share,
          objective_reject_share: build.metrics?.objective_reject_share,
          winner_changed_by_binding_amendment: build.metrics?.winner_changed_by_binding_amendment,
          forced_choice_identifies_complete_agenda: build.classification?.forced_choice_identifies_complete_agenda,
          advisory_proposal_confers_agenda_authority: build.classification?.advisory_proposal_confers_agenda_authority,
          forced_choice_support_identifies_objective_acceptance: build.classification?.forced_choice_support_identifies_objective_acceptance
        }
      };
    case 'PC-08':
      return {
        ...common,
        proof_summary: {
          distinct_component_poll_signatures: build.metrics?.distinct_component_poll_signatures,
          distinct_package_signatures: build.metrics?.distinct_package_signatures,
          distinct_package_support_signatures: build.metrics?.distinct_package_support_signatures,
          marginal_majority_package_support_share: build.metrics?.marginal_majority_package_support_share,
          protected_package_support_share: build.metrics?.protected_package_support_share,
          package_support_gap: build.metrics?.package_support_gap,
          high_support_nonagreement_worlds: build.metrics?.high_support_nonagreement_worlds,
          binding_collective_agreement_worlds: build.metrics?.binding_collective_agreement_worlds,
          binding_impasse_worlds: build.metrics?.binding_impasse_worlds,
          institutionally_approved_without_collective_agreement_worlds: build.metrics?.institutionally_approved_without_collective_agreement_worlds,
          synthetic_candidate_worlds: build.metrics?.synthetic_candidate_worlds,
          maximum_one_sided_group_ratification_gap: build.metrics?.maximum_one_sided_group_ratification_gap,
          component_marginals_identify_package_acceptance: build.classification?.component_marginals_identify_package_acceptance,
          high_package_support_is_collective_agreement: build.classification?.high_package_support_is_collective_agreement,
          synthetic_candidate_can_bind_representatives: build.classification?.synthetic_candidate_can_bind_representatives,
          advisory_co_design_is_collective_agreement: build.classification?.advisory_co_design_is_collective_agreement,
          bargaining_impasse_is_missing_preference_data: build.classification?.bargaining_impasse_is_missing_preference_data
        }
      };
    case 'PC-09':
      return {
        ...common,
        proof_summary: {
          distinct_public_headline_signatures: build.metrics?.distinct_public_headline_signatures,
          distinct_successor_artifact_signatures: build.metrics?.distinct_successor_artifact_signatures,
          distinct_successor_metric_signatures: build.metrics?.distinct_successor_metric_signatures,
          distinct_successor_policy_signatures: build.metrics?.distinct_successor_policy_signatures,
          distinct_resolution_signatures: build.metrics?.distinct_resolution_signatures,
          exact_inheritance_worlds: build.metrics?.exact_inheritance_worlds,
          unvalidated_runtime_successor_worlds: build.metrics?.unvalidated_runtime_successor_worlds,
          current_noncomparable_metric_worlds: build.metrics?.current_noncomparable_metric_worlds,
          policy_validation_required_worlds: build.metrics?.policy_validation_required_worlds,
          revalidated_successor_worlds: build.metrics?.revalidated_successor_worlds,
          failed_revalidation_worlds: build.metrics?.failed_revalidation_worlds,
          current_predictive_claim_worlds: build.metrics?.current_predictive_claim_worlds,
          continuity_claim_worlds: build.metrics?.continuity_claim_worlds,
          deployment_allowed_worlds: build.metrics?.deployment_allowed_worlds,
          deployment_blocked_worlds: build.metrics?.deployment_blocked_worlds,
          public_badge_unbound_worlds: build.metrics?.public_badge_unbound_worlds,
          shared_headline_but_deployment_blocked_worlds: build.metrics?.shared_headline_but_deployment_blocked_worlds,
          rollback_required_worlds: build.metrics?.rollback_required_worlds,
          prior_validation_transfers_across_runtime_change: build.classification?.prior_validation_transfers_across_runtime_change,
          same_score_under_changed_metric_is_comparable: build.classification?.same_score_under_changed_metric_is_comparable,
          predictive_validation_authorizes_changed_policy: build.classification?.predictive_validation_authorizes_changed_policy,
          public_badge_identifies_current_artifact: build.classification?.public_badge_identifies_current_artifact
        }
      };
    case 'PC-10':
      return {
        ...common,
        proof_summary: {
          world_count: build.metrics?.world_count,
          distinct_observed_headline_signatures: build.metrics?.distinct_observed_headline_signatures,
          distinct_latent_headline_signatures: build.metrics?.distinct_latent_headline_signatures,
          distinct_mechanism_signatures: build.metrics?.distinct_mechanism_signatures,
          worlds_with_individual_conversion: build.metrics?.worlds_with_individual_conversion,
          worlds_without_individual_conversion: build.metrics?.worlds_without_individual_conversion,
          worlds_with_stable_panel_identity: build.metrics?.worlds_with_stable_panel_identity,
          worlds_with_composition_change: build.metrics?.worlds_with_composition_change,
          worlds_with_instrument_drift: build.metrics?.worlds_with_instrument_drift,
          worlds_with_strategic_compliance: build.metrics?.worlds_with_strategic_compliance,
          worlds_with_imputation: build.metrics?.worlds_with_imputation,
          worlds_with_targeted_performative_path: build.metrics?.worlds_with_targeted_performative_path,
          maximum_observed_latent_total_variation: build.metrics?.maximum_observed_latent_total_variation,
          baseline_A_share: build.metrics?.baseline_A_share,
          post_A_share: build.metrics?.post_A_share,
          observed_A_share_shift: build.metrics?.observed_A_share_shift,
          aggregate_shift_identifies_individual_preference_change: build.classification?.aggregate_shift_identifies_individual_preference_change,
          stable_panel_identity_alone_is_sufficient: build.classification?.stable_panel_identity_alone_is_sufficient,
          instrument_invariance_or_crosswalk_required: build.classification?.instrument_invariance_or_crosswalk_required,
          reported_choice_always_equals_latent_preference: build.classification?.reported_choice_always_equals_latent_preference,
          targeted_exposure_conversion_supports_performative_path: build.classification?.targeted_exposure_conversion_supports_performative_path,
          targeted_exposure_conversion_establishes_manipulation: build.classification?.targeted_exposure_conversion_establishes_manipulation,
          binding_public_authority_supported: build.classification?.binding_public_authority_supported
        }
      };
    default:
      throw new Error(`unsupported preference custody control ${control.control_id}`);
  }
}

export function validatePreferenceCustodyManifest(manifest) {
  const errors = [];
  const controls = array(manifest?.controls);
  const requirements = array(manifest?.identification_requirements);

  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_SCHEMA_VERSION) errors.push('preference custody manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v8') errors.push('manifest_id must remain preference-custody-laboratory-floor-v8');
  if (manifest?.status !== 'synthetic_control_floor') errors.push('manifest status must remain synthetic_control_floor');
  if (manifest?.graph_effect !== 'none') errors.push('manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'manifest counts_toward_thesis_evidence', errors);
  if (!sameMembers(controls.map(control => control.control_id), REQUIRED_CONTROL_IDS)) {
    errors.push('manifest must contain exactly PC-01 through PC-10');
  }
  if (!sameMembers(controls.map(control => control.failure_class), REQUIRED_FAILURE_CLASSES)) errors.push('manifest failure-class coverage is incomplete');

  const fixtureIds = controls.map(control => text(control?.fixture_id));
  if (unique(fixtureIds).length !== controls.length) errors.push('control fixture IDs must be unique');
  for (const control of controls) {
    const id = text(control?.control_id) || '(missing control ID)';
    if (!text(control?.fixture_id) || !text(control?.failure_class)) errors.push(`control ${id} lacks fixture or failure-class identity`);
    if (!text(control?.source_fixture_path) || !text(control?.build_artifact_path)) errors.push(`control ${id} lacks source or build path`);
    if (!text(control?.expected_build_schema)) errors.push(`control ${id} lacks expected build schema`);
    if (!array(control?.required_refusal_rules).length) errors.push(`control ${id} requires refusal rules`);
  }

  if (!sameMembers(requirements.map(item => item.stage), REQUIRED_IDENTIFICATION_STAGES)) errors.push('identification requirement stages are incomplete');
  for (const requirement of requirements) {
    if (!text(requirement?.required_state) || !text(requirement?.refused_inference)) errors.push(`identification stage ${requirement?.stage} lacks state or refusal`);
  }
  if (unique(manifest?.open_frontiers).length < 5) errors.push('manifest must preserve at least five open frontiers');
  if (array(manifest?.open_frontiers).includes('dynamic_preference_change')) errors.push('dynamic_preference_change must be removed from open frontiers after PC-10 admission');
  requireFalse(manifest?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'laboratory_controls_are_real_world_evidence', errors);
  if (unique(manifest?.promotion_boundary?.real_case_requires).length < 36) errors.push('real-case promotion requirements are incomplete');
  if (!text(manifest?.promotion_boundary?.promotion_authority)) errors.push('promotion authority is required');
  if (!array(manifest?.prohibited_inferences).length) errors.push('prohibited inferences are required');
  if (!text(manifest?.interpretation_contract?.contract_id)) errors.push('interpretation contract ID is required');
  if (!text(manifest?.interpretation_contract?.what_this_is)) errors.push('interpretation contract what_this_is is required');
  if (!text(manifest?.interpretation_contract?.what_this_is_not)) errors.push('interpretation contract what_this_is_not is required');
  if (!text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('copy-ready caveat is required');
  return errors;
}

export function compilePreferenceCustodyManifest(manifest, buildsByPath) {
  const errors = validatePreferenceCustodyManifest(manifest);
  if (errors.length) throw new Error(`invalid preference custody manifest:\n- ${errors.join('\n- ')}`);

  const controls = manifest.controls.map(control => {
    const build = buildsByPath[control.build_artifact_path];
    if (!build) throw new Error(`missing build artifact for ${control.control_id}: ${control.build_artifact_path}`);
    if (build.schema_version !== control.expected_build_schema) throw new Error(`build schema mismatch for ${control.control_id}`);
    if (build.fixture_id !== control.fixture_id) throw new Error(`fixture identity mismatch for ${control.control_id}`);
    return summarizeControl(control, build);
  });

  const refusalRules = unique(controls.flatMap(control => control.observed_refusal_rules));
  const allRequiredRulesPresent = controls.every(control => (
    control.required_refusal_rules.every(rule => control.observed_refusal_rules.includes(rule))
  ));

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    failure_classes: sorted(controls.map(control => control.failure_class)),
    controls,
    control_integrity: {
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_refusal_rules_present: allRequiredRulesPresent
    },
    identification_requirements: manifest.identification_requirements,
    refusal_rule_union: refusalRules,
    open_frontiers: manifest.open_frontiers,
    promotion_boundary: manifest.promotion_boundary,
    prohibited_inferences: manifest.prohibited_inferences,
    interpretation_contract: manifest.interpretation_contract
  };
}

function check(condition, message, errors) {
  if (!condition) errors.push(message);
}

export function validatePreferenceCustodyManifestBuild(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_BUILD_SCHEMA_VERSION) errors.push('preference custody manifest build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v8') errors.push('compiled manifest_id must remain preference-custody-laboratory-floor-v8');
  if (compiled?.status !== 'laboratory_floor_qualified') errors.push('compiled manifest status must be laboratory_floor_qualified');
  if (compiled?.graph_effect !== 'none') errors.push('compiled manifest graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled manifest must preserve real_world_evidence_state none');
  if (compiled?.control_count !== 10) errors.push('compiled manifest must contain ten controls');
  if (!sameMembers(compiled?.failure_classes, REQUIRED_FAILURE_CLASSES)) errors.push('compiled failure-class coverage is incomplete');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled control IDs are incomplete');

  const integrity = object(compiled?.control_integrity);
  for (const key of [
    'all_graph_effect_none',
    'no_thesis_evidence_consumption',
    'no_real_world_conclusion',
    'no_preference_change_claim',
    'no_intent_inference',
    'all_required_refusal_rules_present'
  ]) {
    if (integrity[key] !== true) errors.push(`control_integrity.${key} must be true`);
  }

  const controls = Object.fromEntries(array(compiled?.controls).map(control => [control.control_id, control]));
  const pc1 = controls['PC-01'];
  const pc2 = controls['PC-02'];
  const pc3 = controls['PC-03'];
  const pc4 = controls['PC-04'];
  const pc5 = controls['PC-05'];
  const pc6 = controls['PC-06'];
  const pc7 = controls['PC-07'];
  const pc8 = controls['PC-08'];
  const pc9 = controls['PC-09'];
  const pc10 = controls['PC-10'];

  check(pc1?.proof_summary?.maximum_naive_drift > 0.3, 'PC-01 must demonstrate material exposure drift', errors);
  check(pc1?.proof_summary?.maximum_corrected_drift <= 1e-12, 'PC-01 corrected drift must recover the frozen distribution', errors);
  check(pc2?.proof_summary?.distinct_observation_signatures >= 2, 'PC-02 must demonstrate distinct observations from one population', errors);
  check(pc2?.proof_summary?.maximum_naive_full_vector_drift >= 0.3, 'PC-02 must demonstrate material option-set drift', errors);
  check(pc3?.proof_summary?.distinct_latent_world_signatures >= 3, 'PC-03 must preserve at least three latent worlds', errors);
  check(pc3?.proof_summary?.distinct_observation_signatures === 1, 'PC-03 must preserve one shared observation signature', errors);
  check(pc3?.proof_summary?.maximum_pairwise_latent_total_variation >= 0.3, 'PC-03 must preserve material latent separation', errors);
  check(pc4?.proof_summary?.distinct_headline_signatures === 1, 'PC-04 must preserve one shared normalized headline', errors);
  check(pc4?.proof_summary?.distinct_full_outcome_signatures >= 3, 'PC-04 must preserve at least three distinct full outcomes', errors);
  check(pc4?.proof_summary?.distinct_mechanism_signatures >= 3, 'PC-04 must preserve at least three distinct disposition mechanisms', errors);
  check(pc4?.proof_summary?.observed_total_range >= 250, 'PC-04 must preserve material denominator variation', errors);
  check(pc4?.proof_summary?.exit_total_range >= 250, 'PC-04 must preserve material exit variation', errors);
  check(pc4?.proof_summary?.nonresponse_total_range >= 250, 'PC-04 must preserve material nonresponse variation', errors);
  check(pc5?.proof_summary?.distinct_aggregate_headline_signatures === 1, 'PC-05 must preserve one shared aggregate headline', errors);
  check(pc5?.proof_summary?.distinct_subgroup_outcome_signatures >= 3, 'PC-05 must preserve at least three subgroup outcomes', errors);
  check(pc5?.proof_summary?.distinct_burden_signatures >= 3, 'PC-05 must preserve at least three burden distributions', errors);
  check(pc5?.proof_summary?.maximum_subgroup_success_rate_gap >= 0.4, 'PC-05 must preserve a material subgroup success-rate gap', errors);
  check(pc5?.proof_summary?.maximum_adaptation_cost_ratio >= 15, 'PC-05 must preserve material adaptation-cost inequality', errors);
  check(pc5?.proof_summary?.aggregate_success_rate === 0.8, 'PC-05 must preserve the frozen 80 percent aggregate success rate', errors);
  check(pc6?.proof_summary?.distinct_aggregate_headline_signatures === 1, 'PC-06 must preserve one shared support headline', errors);
  check(pc6?.proof_summary?.distinct_support_evidence_classes >= 3, 'PC-06 must preserve at least three support-evidence classes', errors);
  check(pc6?.proof_summary?.distinct_authority_classes >= 3, 'PC-06 must preserve at least three authority classes', errors);
  check(pc6?.proof_summary?.distinct_authority_resolution_signatures >= 3, 'PC-06 must preserve at least three authority consequences', errors);
  check(pc6?.proof_summary?.public_authorized_worlds === 1, 'PC-06 must preserve exactly one publicly authorized world', errors);
  check(pc6?.proof_summary?.institutionally_approved_without_public_authorization_worlds === 2, 'PC-06 must preserve two institutional-only approval worlds', errors);
  check(pc6?.proof_summary?.binding_public_rejection_worlds === 1, 'PC-06 must preserve one binding public rejection', errors);
  check(pc6?.proof_summary?.aggregate_support_rate === 0.8, 'PC-06 must preserve the frozen 80 percent support rate', errors);
  check(pc6?.proof_summary?.modeled_support_confers_authorization === false, 'PC-06 must refuse modeled support as authorization', errors);
  check(pc6?.proof_summary?.advisory_feedback_confers_authorization === false, 'PC-06 must refuse advisory feedback as authorization', errors);
  check(pc6?.proof_summary?.institutional_approval_is_public_authorization === false, 'PC-06 must separate institutional approval from public authorization', errors);
  check(pc6?.proof_summary?.aggregate_support_identifies_authorization === false, 'PC-06 must refuse aggregate support as authorization', errors);
  check(pc7?.proof_summary?.distinct_preliminary_headline_signatures === 1, 'PC-07 must preserve one preliminary forced-choice headline', errors);
  check(pc7?.proof_summary?.distinct_final_option_set_signatures === 2, 'PC-07 must preserve two final option-set states', errors);
  check(pc7?.proof_summary?.distinct_agenda_resolution_signatures === 4, 'PC-07 must preserve four agenda consequences', errors);
  check(pc7?.proof_summary?.institutionally_controlled_agenda_worlds === 2, 'PC-07 must preserve two institutionally controlled agenda worlds', errors);
  check(pc7?.proof_summary?.public_agenda_authority_worlds === 2, 'PC-07 must preserve two public agenda-authority worlds', errors);
  check(pc7?.proof_summary?.binding_collective_option_generation_worlds === 1, 'PC-07 must preserve one binding collective option-generation world', errors);
  check(pc7?.proof_summary?.binding_objective_rejection_worlds === 1, 'PC-07 must preserve one binding objective rejection', errors);
  check(pc7?.proof_summary?.preliminary_A_share === 0.8, 'PC-07 must preserve the frozen 80 percent preliminary A share', errors);
  check(pc7?.proof_summary?.latent_C_first_choice_share === 0.8, 'PC-07 must preserve the frozen 80 percent C first-choice share', errors);
  check(pc7?.proof_summary?.objective_reject_share === 0.6, 'PC-07 must preserve the frozen 60 percent objective-rejection share', errors);
  check(pc7?.proof_summary?.winner_changed_by_binding_amendment === true, 'PC-07 binding amendment must change the winner', errors);
  check(pc7?.proof_summary?.forced_choice_identifies_complete_agenda === false, 'PC-07 must refuse forced choice as the complete agenda', errors);
  check(pc7?.proof_summary?.advisory_proposal_confers_agenda_authority === false, 'PC-07 must refuse advisory proposal as agenda authority', errors);
  check(pc7?.proof_summary?.forced_choice_support_identifies_objective_acceptance === false, 'PC-07 must separate option preference from objective acceptance', errors);
  check(pc8?.proof_summary?.distinct_component_poll_signatures === 1, 'PC-08 must preserve one component poll', errors);
  check(pc8?.proof_summary?.distinct_package_signatures === 3, 'PC-08 must preserve three package versions', errors);
  check(pc8?.proof_summary?.distinct_package_support_signatures === 3, 'PC-08 must preserve three package-support states', errors);
  check(pc8?.proof_summary?.marginal_majority_package_support_share === 0.2, 'PC-08 must preserve 20 percent support for the marginal-majority package', errors);
  check(pc8?.proof_summary?.protected_package_support_share === 1, 'PC-08 must preserve complete support for the protected package', errors);
  check(pc8?.proof_summary?.package_support_gap === 0.8, 'PC-08 must preserve the 80-point package support gap', errors);
  check(pc8?.proof_summary?.high_support_nonagreement_worlds === 2, 'PC-08 must preserve two high-support nonagreement worlds', errors);
  check(pc8?.proof_summary?.binding_collective_agreement_worlds === 1, 'PC-08 must preserve one binding collective agreement', errors);
  check(pc8?.proof_summary?.binding_impasse_worlds === 1, 'PC-08 must preserve one binding impasse', errors);
  check(pc8?.proof_summary?.institutionally_approved_without_collective_agreement_worlds === 2, 'PC-08 must preserve two institutional approvals without collective agreement', errors);
  check(pc8?.proof_summary?.synthetic_candidate_worlds === 1, 'PC-08 must preserve one synthetic package candidate', errors);
  check(pc8?.proof_summary?.maximum_one_sided_group_ratification_gap === 0.8, 'PC-08 must preserve the 80-point one-sided ratification gap', errors);
  check(pc8?.proof_summary?.component_marginals_identify_package_acceptance === false, 'PC-08 must refuse component marginals as package acceptance', errors);
  check(pc8?.proof_summary?.high_package_support_is_collective_agreement === false, 'PC-08 must refuse package support as collective agreement', errors);
  check(pc8?.proof_summary?.synthetic_candidate_can_bind_representatives === false, 'PC-08 must refuse synthetic candidate authority over representatives', errors);
  check(pc8?.proof_summary?.advisory_co_design_is_collective_agreement === false, 'PC-08 must refuse advisory co-design as collective agreement', errors);
  check(pc8?.proof_summary?.bargaining_impasse_is_missing_preference_data === false, 'PC-08 must preserve bargaining impasse as a disposition', errors);
  check(pc9?.proof_summary?.distinct_public_headline_signatures === 1, 'PC-09 must preserve one public validation headline', errors);
  check(pc9?.proof_summary?.distinct_successor_artifact_signatures === 4, 'PC-09 must preserve four runtime artifact identities', errors);
  check(pc9?.proof_summary?.distinct_successor_metric_signatures === 2, 'PC-09 must preserve two metric identities', errors);
  check(pc9?.proof_summary?.distinct_successor_policy_signatures === 2, 'PC-09 must preserve two policy identities', errors);
  check(pc9?.proof_summary?.distinct_resolution_signatures === 6, 'PC-09 must preserve six succession consequences', errors);
  check(pc9?.proof_summary?.exact_inheritance_worlds === 1, 'PC-09 must preserve one exact inheritance world', errors);
  check(pc9?.proof_summary?.unvalidated_runtime_successor_worlds === 1, 'PC-09 must preserve one unvalidated runtime successor', errors);
  check(pc9?.proof_summary?.current_noncomparable_metric_worlds === 1, 'PC-09 must preserve one noncomparable metric world', errors);
  check(pc9?.proof_summary?.policy_validation_required_worlds === 1, 'PC-09 must preserve one changed-policy validation gap', errors);
  check(pc9?.proof_summary?.revalidated_successor_worlds === 1, 'PC-09 must preserve one fully revalidated successor', errors);
  check(pc9?.proof_summary?.failed_revalidation_worlds === 1, 'PC-09 must preserve one failed revalidation', errors);
  check(pc9?.proof_summary?.current_predictive_claim_worlds === 4, 'PC-09 must preserve four current predictive claim worlds', errors);
  check(pc9?.proof_summary?.continuity_claim_worlds === 2, 'PC-09 must preserve two continuity claim worlds', errors);
  check(pc9?.proof_summary?.deployment_allowed_worlds === 3, 'PC-09 must preserve three deployable worlds', errors);
  check(pc9?.proof_summary?.deployment_blocked_worlds === 3, 'PC-09 must preserve three blocked worlds', errors);
  check(pc9?.proof_summary?.public_badge_unbound_worlds === 2, 'PC-09 must preserve two unbound public badge worlds', errors);
  check(pc9?.proof_summary?.shared_headline_but_deployment_blocked_worlds === 3, 'PC-09 must preserve three shared-headline blocked worlds', errors);
  check(pc9?.proof_summary?.rollback_required_worlds === 1, 'PC-09 must preserve one rollback requirement', errors);
  check(pc9?.proof_summary?.prior_validation_transfers_across_runtime_change === false, 'PC-09 must refuse validation transfer across runtime change', errors);
  check(pc9?.proof_summary?.same_score_under_changed_metric_is_comparable === false, 'PC-09 must refuse same score as metric comparability', errors);
  check(pc9?.proof_summary?.predictive_validation_authorizes_changed_policy === false, 'PC-09 must refuse predictive validation as changed-policy authority', errors);
  check(pc9?.proof_summary?.public_badge_identifies_current_artifact === false, 'PC-09 must refuse badge as current artifact identity', errors);

  check(pc10?.proof_summary?.world_count === 6, 'PC-10 must preserve six dynamic worlds', errors);
  check(pc10?.proof_summary?.distinct_observed_headline_signatures === 1, 'PC-10 must preserve one shared observed headline', errors);
  check(pc10?.proof_summary?.distinct_latent_headline_signatures === 2, 'PC-10 must preserve two latent headline states', errors);
  check(pc10?.proof_summary?.distinct_mechanism_signatures === 6, 'PC-10 must preserve six distinct mechanisms', errors);
  check(pc10?.proof_summary?.worlds_with_individual_conversion === 2, 'PC-10 must preserve two conversion worlds', errors);
  check(pc10?.proof_summary?.worlds_without_individual_conversion === 4, 'PC-10 must preserve four nonconversion worlds', errors);
  check(pc10?.proof_summary?.worlds_with_stable_panel_identity === 5, 'PC-10 must preserve five stable-panel worlds', errors);
  check(pc10?.proof_summary?.worlds_with_composition_change === 1, 'PC-10 must preserve one composition-change world', errors);
  check(pc10?.proof_summary?.worlds_with_instrument_drift === 1, 'PC-10 must preserve one instrument-drift world', errors);
  check(pc10?.proof_summary?.worlds_with_strategic_compliance === 1, 'PC-10 must preserve one strategic-compliance world', errors);
  check(pc10?.proof_summary?.worlds_with_imputation === 1, 'PC-10 must preserve one imputation world', errors);
  check(pc10?.proof_summary?.worlds_with_targeted_performative_path === 1, 'PC-10 must preserve one targeted performative-path world', errors);
  check(close(pc10?.proof_summary?.maximum_observed_latent_total_variation, 0.2), 'PC-10 must preserve 20 percent maximum observed-latent separation', errors);
  check(close(pc10?.proof_summary?.baseline_A_share, 0.6), 'PC-10 must preserve the 60 percent baseline A share', errors);
  check(close(pc10?.proof_summary?.post_A_share, 0.8), 'PC-10 must preserve the 80 percent post-period A share', errors);
  check(close(pc10?.proof_summary?.observed_A_share_shift, 0.2), 'PC-10 must preserve the 20-point observed A shift', errors);
  check(pc10?.proof_summary?.aggregate_shift_identifies_individual_preference_change === false, 'PC-10 must refuse aggregate shift as individual preference change', errors);
  check(pc10?.proof_summary?.stable_panel_identity_alone_is_sufficient === false, 'PC-10 must refuse stable panel identity as sufficient', errors);
  check(pc10?.proof_summary?.instrument_invariance_or_crosswalk_required === true, 'PC-10 must require instrument invariance or crosswalk', errors);
  check(pc10?.proof_summary?.reported_choice_always_equals_latent_preference === false, 'PC-10 must separate reported and latent preference', errors);
  check(pc10?.proof_summary?.targeted_exposure_conversion_supports_performative_path === true, 'PC-10 must preserve one bounded targeted performative path', errors);
  check(pc10?.proof_summary?.targeted_exposure_conversion_establishes_manipulation === false, 'PC-10 must refuse performative path as manipulation', errors);
  check(pc10?.proof_summary?.binding_public_authority_supported === false, 'PC-10 must refuse dynamic change as public authority', errors);

  if (!sameMembers(array(compiled?.identification_requirements).map(item => item.stage), REQUIRED_IDENTIFICATION_STAGES)) errors.push('compiled identification stages are incomplete');
  if (unique(compiled?.open_frontiers).length < 5) errors.push('compiled manifest must preserve open frontiers');
  if (array(compiled?.open_frontiers).includes('dynamic_preference_change')) errors.push('compiled open frontiers must not retain dynamic_preference_change');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled laboratory_controls_are_real_world_evidence', errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat is required');
  return errors;
}

function percentage(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

export function renderPreferenceCustodyManifestMarkdown(compiled) {
  const lines = [
    '# Preference custody laboratory floor v8',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,
    '',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,
    '',
    '## Control floor',
    ''
  ];

  for (const control of compiled.controls) {
    lines.push(`### ${control.control_id}: ${control.failure_class}`, '');
    lines.push(`- Fixture: ${control.fixture_id}`);
    switch (control.control_id) {
      case 'PC-01':
        lines.push(`- Maximum naive drift: ${percentage(control.proof_summary.maximum_naive_drift)}`);
        lines.push(`- Maximum corrected drift: ${percentage(control.proof_summary.maximum_corrected_drift)}`);
        break;
      case 'PC-02':
        lines.push(`- Distinct observations from one population: ${control.proof_summary.distinct_observation_signatures}`);
        lines.push(`- Maximum inadmissible full-vector drift: ${percentage(control.proof_summary.maximum_naive_full_vector_drift)}`);
        break;
      case 'PC-03':
        lines.push(`- Distinct latent worlds: ${control.proof_summary.distinct_latent_world_signatures}`);
        lines.push(`- Distinct observation signatures: ${control.proof_summary.distinct_observation_signatures}`);
        lines.push(`- Maximum pairwise latent total variation: ${percentage(control.proof_summary.maximum_pairwise_latent_total_variation)}`);
        break;
      case 'PC-04':
        lines.push(`- Distinct normalized headline signatures: ${control.proof_summary.distinct_headline_signatures}`);
        lines.push(`- Distinct full outcomes: ${control.proof_summary.distinct_full_outcome_signatures}`);
        lines.push(`- Observed denominator range: ${control.proof_summary.observed_total_range}`);
        lines.push(`- Exit range: ${control.proof_summary.exit_total_range}`);
        lines.push(`- Nonresponse range: ${control.proof_summary.nonresponse_total_range}`);
        break;
      case 'PC-05':
        lines.push(`- Distinct aggregate headline signatures: ${control.proof_summary.distinct_aggregate_headline_signatures}`);
        lines.push(`- Distinct subgroup outcomes: ${control.proof_summary.distinct_subgroup_outcome_signatures}`);
        lines.push(`- Distinct burden distributions: ${control.proof_summary.distinct_burden_signatures}`);
        lines.push(`- Maximum subgroup success-rate gap: ${percentage(control.proof_summary.maximum_subgroup_success_rate_gap)}`);
        lines.push(`- Maximum adaptation-cost ratio: ${Number(control.proof_summary.maximum_adaptation_cost_ratio).toFixed(2)}×`);
        break;
      case 'PC-06':
        lines.push(`- Distinct support-evidence classes: ${control.proof_summary.distinct_support_evidence_classes}`);
        lines.push(`- Distinct authority classes: ${control.proof_summary.distinct_authority_classes}`);
        lines.push(`- Distinct authority consequences: ${control.proof_summary.distinct_authority_resolution_signatures}`);
        lines.push(`- Publicly authorized worlds: ${control.proof_summary.public_authorized_worlds}`);
        lines.push(`- Institutional-only approval worlds: ${control.proof_summary.institutionally_approved_without_public_authorization_worlds}`);
        lines.push(`- Binding public rejection worlds: ${control.proof_summary.binding_public_rejection_worlds}`);
        break;
      case 'PC-07':
        lines.push(`- Distinct preliminary headline signatures: ${control.proof_summary.distinct_preliminary_headline_signatures}`);
        lines.push(`- Distinct final option sets: ${control.proof_summary.distinct_final_option_set_signatures}`);
        lines.push(`- Distinct agenda consequences: ${control.proof_summary.distinct_agenda_resolution_signatures}`);
        lines.push(`- Public agenda-authority worlds: ${control.proof_summary.public_agenda_authority_worlds}`);
        lines.push(`- Binding option-generation worlds: ${control.proof_summary.binding_collective_option_generation_worlds}`);
        lines.push(`- Binding objective-rejection worlds: ${control.proof_summary.binding_objective_rejection_worlds}`);
        break;
      case 'PC-08':
        lines.push(`- Distinct package versions: ${control.proof_summary.distinct_package_signatures}`);
        lines.push(`- Distinct package-support states: ${control.proof_summary.distinct_package_support_signatures}`);
        lines.push(`- Marginal-majority package support: ${percentage(control.proof_summary.marginal_majority_package_support_share)}`);
        lines.push(`- Protected package support: ${percentage(control.proof_summary.protected_package_support_share)}`);
        lines.push(`- High-support nonagreement worlds: ${control.proof_summary.high_support_nonagreement_worlds}`);
        lines.push(`- Binding collective-agreement worlds: ${control.proof_summary.binding_collective_agreement_worlds}`);
        lines.push(`- Binding impasse worlds: ${control.proof_summary.binding_impasse_worlds}`);
        break;
      case 'PC-09':
        lines.push(`- Exact inheritance worlds: ${control.proof_summary.exact_inheritance_worlds}`);
        lines.push(`- Unvalidated runtime successors: ${control.proof_summary.unvalidated_runtime_successor_worlds}`);
        lines.push(`- Noncomparable metric worlds: ${control.proof_summary.current_noncomparable_metric_worlds}`);
        lines.push(`- Changed-policy validation gaps: ${control.proof_summary.policy_validation_required_worlds}`);
        lines.push(`- Fully revalidated successors: ${control.proof_summary.revalidated_successor_worlds}`);
        lines.push(`- Failed revalidations: ${control.proof_summary.failed_revalidation_worlds}`);
        lines.push(`- Shared-headline blocked worlds: ${control.proof_summary.shared_headline_but_deployment_blocked_worlds}`);
        break;
      case 'PC-10':
        lines.push(`- Dynamic worlds: ${control.proof_summary.world_count}`);
        lines.push(`- Distinct observed headlines: ${control.proof_summary.distinct_observed_headline_signatures}`);
        lines.push(`- Distinct latent headlines: ${control.proof_summary.distinct_latent_headline_signatures}`);
        lines.push(`- Distinct mechanisms: ${control.proof_summary.distinct_mechanism_signatures}`);
        lines.push(`- Individual-conversion worlds: ${control.proof_summary.worlds_with_individual_conversion}`);
        lines.push(`- Nonconversion worlds: ${control.proof_summary.worlds_without_individual_conversion}`);
        lines.push(`- Composition-change worlds: ${control.proof_summary.worlds_with_composition_change}`);
        lines.push(`- Instrument-drift worlds: ${control.proof_summary.worlds_with_instrument_drift}`);
        lines.push(`- Strategic-compliance worlds: ${control.proof_summary.worlds_with_strategic_compliance}`);
        lines.push(`- Imputation worlds: ${control.proof_summary.worlds_with_imputation}`);
        lines.push(`- Targeted performative-path worlds: ${control.proof_summary.worlds_with_targeted_performative_path}`);
        lines.push(`- Frozen observed A shift: ${percentage(control.proof_summary.observed_A_share_shift)}`);
        lines.push(`- Maximum observed-latent separation: ${percentage(control.proof_summary.maximum_observed_latent_total_variation)}`);
        break;
      default:
        break;
    }
    lines.push(`- Graph effect: ${control.graph_effect}`);
    lines.push(`- Counts toward thesis evidence: ${control.counts_toward_thesis_evidence}`);
    lines.push(`- Real-world effect claimed: ${control.real_world_effect_claimed}`);
    lines.push('');
  }

  lines.push('## Control integrity', '');
  for (const [key, value] of Object.entries(compiled.control_integrity)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Identification requirements', '');
  for (const requirement of compiled.identification_requirements) {
    lines.push(`### ${requirement.stage}`, '');
    lines.push(`- Required state: ${requirement.required_state}`);
    lines.push(`- Refusal: ${requirement.refused_inference}`, '');
  }
  lines.push('## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push(
    '',
    '## Promotion boundary',
    '',
    `- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`,
    `- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`,
    '',
    '### Required real-case evidence',
    ''
  );
  for (const item of compiled.promotion_boundary.real_case_requires) lines.push(`- ${item}`);
  lines.push('', '## Prohibited inferences', '');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}
