import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_UNCERTAINTY_MONITORING_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-linkage-uncertainty-monitoring-assurance-fixture@1';
export const PREFERENCE_LINKAGE_UNCERTAINTY_MONITORING_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-linkage-uncertainty-monitoring-assurance-build@1';
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "source_systems": 4,
  "published_candidate_pairs": 100,
  "published_linked_pairs": 100,
  "published_interval_coverage_pct": 100,
  "published_mean_interval_width": 0.02,
  "published_interval_misses": 0,
  "published_subgroup_drift_alerts": 0,
  "published_recalibration_status": "current",
  "public_uncertainty_status": "linkage_uncertainty_verified",
  "approved_use": "longitudinal_exposure_estimation"
};
const CANONICAL_LINKAGE_UNCERTAINTY_REFUSAL_RULES = Object.freeze([
  "numeric_lower_and_upper_bounds_are_not_valid_uncertainty_intervals_without_a_defined_target_and_coverage_meaning",
  "one_narrow_interval_is_not_precise_evidence_when_empirical_coverage_is_unknown",
  "one_hundred_percent_published_interval_coverage_is_not_complete_empirical_coverage_when_excluded_or_unlabeled_pairs_are_omitted",
  "zero_published_interval_misses_is_not_zero_true_misses_without_complete_independent_label_and_denominator_custody",
  "in_sample_residual_intervals_are_not_out_of_sample_uncertainty_assurance",
  "heuristic_score_margins_are_not_probability_or_predictive_intervals",
  "random_pair_splitting_is_not_independent_when_entities_households_sources_clusters_or_time_cross_splits",
  "nominal_coverage_is_not_empirical_coverage_under_unaccounted_dependence",
  "pairwise_coverage_is_not_entity_cluster_or_longitudinal_trajectory_coverage",
  "one_bootstrap_is_not_valid_when_the_resampling_unit_ignores_dependence",
  "one_conformal_guarantee_is_not_deployment_coverage_after_exchangeability_or_distribution_shift_fails",
  "aggregate_coverage_is_not_source_subgroup_geography_language_identifier_quality_missingness_or_time_specific_coverage",
  "one_coverage_level_is_not_simultaneous_coverage_across_adaptively_selected_models_thresholds_subgroups_or_monitoring_windows",
  "uncorrected_repeated_monitoring_is_not_a_predeclared_drift_test",
  "zero_published_drift_alerts_is_not_absence_of_drift_when_denominators_are_incomplete_thresholds_are_stale_or_alerts_are_suppressed",
  "one_current_calibration_certificate_is_not_current_uncertainty_assurance_after_source_feature_model_population_or_workflow_drift",
  "one_recalibration_trigger_is_not_governance_when_it_is_discretionary_unexecuted_or_reversible_without_receipt",
  "recalibration_is_not_correction_without_independent_validation_safe_deployment_rollback_and_corrected_republication",
  "absence_of_rollback_use_is_not_proof_rollback_was_available",
  "historical_uncertainty_assurance_is_not_current_after_feature_model_label_interval_monitor_source_population_workflow_policy_or_release_succession",
  "public_linkage_uncertainty_verified_status_is_not_complete_current_out_of_sample_dependence_aware_multiplicity_adjusted_subgroup_covered_drift_monitored_recalibrated_rollback_capable_correctable_or_authorized_evidence",
  "uncertainty_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
]);
export const REQUIRED_LINKAGE_UNCERTAINTY_REFUSAL_RULES = Object.freeze([...CANONICAL_LINKAGE_UNCERTAINTY_REFUSAL_RULES]);
const REQUIRED_REFUSAL_RULES = CANONICAL_LINKAGE_UNCERTAINTY_REFUSAL_RULES;
const FALSE_CLASSIFICATIONS = [
  "numeric_bounds_identify_valid_uncertainty_interval",
  "narrow_intervals_identify_precision",
  "full_published_coverage_identifies_complete_empirical_coverage",
  "zero_interval_misses_identify_zero_true_misses",
  "in_sample_residual_intervals_identify_out_of_sample_assurance",
  "heuristic_margins_identify_probability_or_predictive_intervals",
  "random_pair_split_identifies_dependence_independence",
  "nominal_coverage_identifies_dependence_aware_empirical_coverage",
  "pairwise_coverage_identifies_cluster_or_trajectory_coverage",
  "bootstrap_identifies_valid_dependence_resampling",
  "conformal_guarantee_identifies_shift_robust_deployment_coverage",
  "aggregate_coverage_identifies_subgroup_source_geography_language_identifier_quality_missingness_and_time_coverage",
  "one_coverage_level_identifies_simultaneous_adaptive_coverage",
  "uncorrected_repeated_monitoring_identifies_predeclared_drift_test",
  "zero_drift_alerts_identify_absence_of_drift",
  "current_calibration_certificate_identifies_current_uncertainty_assurance",
  "recalibration_trigger_identifies_executed_governance",
  "recalibration_identifies_independently_validated_correction",
  "absence_of_rollback_use_identifies_rollback_availability",
  "historical_uncertainty_assurance_identifies_current_assurance_after_succession",
  "public_linkage_uncertainty_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "uncertainty_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = "complete_linkage_uncertainty_assurance_supported_in_at_least_one_world";
const EXPECTED_CLASSIFICATION = {
  "numeric_bounds_identify_valid_uncertainty_interval": false,
  "narrow_intervals_identify_precision": false,
  "full_published_coverage_identifies_complete_empirical_coverage": false,
  "zero_interval_misses_identify_zero_true_misses": false,
  "in_sample_residual_intervals_identify_out_of_sample_assurance": false,
  "heuristic_margins_identify_probability_or_predictive_intervals": false,
  "random_pair_split_identifies_dependence_independence": false,
  "nominal_coverage_identifies_dependence_aware_empirical_coverage": false,
  "pairwise_coverage_identifies_cluster_or_trajectory_coverage": false,
  "bootstrap_identifies_valid_dependence_resampling": false,
  "conformal_guarantee_identifies_shift_robust_deployment_coverage": false,
  "aggregate_coverage_identifies_subgroup_source_geography_language_identifier_quality_missingness_and_time_coverage": false,
  "one_coverage_level_identifies_simultaneous_adaptive_coverage": false,
  "uncorrected_repeated_monitoring_identifies_predeclared_drift_test": false,
  "zero_drift_alerts_identify_absence_of_drift": false,
  "current_calibration_certificate_identifies_current_uncertainty_assurance": false,
  "recalibration_trigger_identifies_executed_governance": false,
  "recalibration_identifies_independently_validated_correction": false,
  "absence_of_rollback_use_identifies_rollback_availability": false,
  "historical_uncertainty_assurance_identifies_current_assurance_after_succession": false,
  "public_linkage_uncertainty_verified_status_identifies_complete_current_correctable_authorized_evidence": false,
  "uncertainty_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent": false,
  "binding_public_authority_supported": false,
  "manipulative_intent_inferable": false,
  "real_world_effect_claimed": false,
  "graph_effect_present": false,
  "preference_change_present": false,
  "complete_linkage_uncertainty_assurance_supported_in_at_least_one_world": true
};
const WORLD_EXPECTATIONS = Object.fromEntries([
  {
    "world_id": "complete_linkage_uncertainty_assurance",
    "description": "Complete interval-target, out-of-sample construction, dependence, multiplicity, subgroup coverage, drift monitoring, recalibration, rollback, correction, and current-lineage assurance.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "complete_linkage_uncertainty_assurance",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": true
    }
  },
  {
    "world_id": "heuristic_or_in_sample_intervals_without_empirical_coverage",
    "description": "In-sample residuals, score bands, or heuristic margins are published as uncertainty intervals without a supported target or empirical out-of-sample coverage.",
    "interval_semantics": {
      "uncertainty_target_explicit": false,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": false,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": false,
      "heuristic_interval_pairs": 40,
      "in_sample_interval_pairs": 40,
      "undercovered_pairs": 50
    },
    "dependence_design": {
      "out_of_sample_construction": false,
      "construction_validation_separated": false,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "heuristic_or_in_sample_intervals_without_empirical_coverage",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": false,
      "complete_dependence_assurance": false,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "dependence_and_cluster_leakage",
    "description": "Pair, entity, household, source, temporal, and cluster dependence leaks across construction and validation and invalidates nominal coverage.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": false,
      "household_split_safe": false,
      "source_split_safe": false,
      "time_split_safe": false,
      "resampling_unit_valid": false,
      "covariance_modeled": false,
      "effective_sample_size_current": false,
      "dependence_invalidated_pairs": 40,
      "cluster_leaked_pairs": 30
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "dependence_and_cluster_leakage",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": false,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "multiplicity_adaptive_selection_and_optional_stopping",
    "description": "Multiplicity, adaptive model or threshold selection, repeated monitoring, optional stopping, and winner's-curse effects are ignored.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": false,
      "simultaneous_coverage_adjusted": false,
      "adaptive_selection_accounted": false,
      "repeated_monitoring_accounted": false,
      "optional_stopping_accounted": false,
      "winner_curse_accounted": false,
      "multiplicity_uncorrected_pairs": 40,
      "adaptive_monitoring_contaminated_pairs": 30
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "multiplicity_adaptive_selection_and_optional_stopping",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": false,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "aggregate_coverage_masks_subgroup_undercoverage",
    "description": "Aggregate coverage masks source, subgroup, geography, language, identifier-quality, missingness, and time-specific undercoverage while controls fail.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": false,
      "source_geography_language_time_coverage_complete": false,
      "identifier_quality_missingness_coverage_complete": false,
      "negative_controls_complete": false,
      "falsification_complete": false,
      "subgroup_undercovered_pairs": 40,
      "source_geography_language_time_undercovered_pairs": 40,
      "negative_control_failures": 20,
      "falsification_failures": 20
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "aggregate_coverage_masks_subgroup_undercoverage",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": false,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "incomplete_drift_monitoring_and_alert_suppression",
    "description": "Calibration, prevalence, source, feature, population, and workflow drift are incompletely monitored, denominator-truncated, stale, or alert-suppressing.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": false,
      "denominator_complete": false,
      "drift_threshold_predeclared": false,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": false,
      "alerts_unsuppressed": false,
      "escalation_complete": false,
      "drift_undetected_pairs": 50,
      "suppressed_drift_alerts": 30
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "incomplete_drift_monitoring_and_alert_suppression",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": false,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "discretionary_recalibration_without_rollback_or_withdrawal",
    "description": "Recalibration triggers are discretionary or unexecuted and rollback, safe decline, certificate withdrawal, corrected republication, and appeal are absent.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": false,
      "trigger_executed": false,
      "independent_validation_complete": false,
      "safe_deployment_complete": false,
      "rollback_available": false,
      "certificate_withdrawal_available": false,
      "corrected_republication_complete": false,
      "appeal_complete": false,
      "failed_recalibration_pairs": 30,
      "rollback_unavailable_decisions": 25,
      "certificates_not_withdrawn": 20
    },
    "lineage_authority": {
      "current_lineage": true,
      "certificate_history_complete": true,
      "supersession_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 0,
      "unsupported_uncertainty_decisions": 0
    },
    "expected_mechanism": "discretionary_recalibration_without_rollback_or_withdrawal",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": false,
      "current_uncertainty_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  },
  {
    "world_id": "stale_uncertainty_assurance_after_succession",
    "description": "Historical uncertainty assurance is inherited after feature, model, label, interval, monitor, source, population, workflow, policy, or release succession.",
    "interval_semantics": {
      "uncertainty_target_explicit": true,
      "event_explicit": true,
      "estimand_explicit": true,
      "interval_type_explicit": true,
      "coverage_level_explicit": true,
      "bounds_semantics_explicit": true,
      "empirical_coverage_target_current": true,
      "heuristic_interval_pairs": 0,
      "in_sample_interval_pairs": 0,
      "undercovered_pairs": 0
    },
    "dependence_design": {
      "out_of_sample_construction": true,
      "construction_validation_separated": true,
      "entity_cluster_split_safe": true,
      "household_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "resampling_unit_valid": true,
      "covariance_modeled": true,
      "effective_sample_size_current": true,
      "dependence_invalidated_pairs": 0,
      "cluster_leaked_pairs": 0
    },
    "multiplicity_selection": {
      "multiplicity_family_complete": true,
      "simultaneous_coverage_adjusted": true,
      "adaptive_selection_accounted": true,
      "repeated_monitoring_accounted": true,
      "optional_stopping_accounted": true,
      "winner_curse_accounted": true,
      "multiplicity_uncorrected_pairs": 0,
      "adaptive_monitoring_contaminated_pairs": 0
    },
    "subgroup_coverage": {
      "subgroup_coverage_complete": true,
      "source_geography_language_time_coverage_complete": true,
      "identifier_quality_missingness_coverage_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_undercovered_pairs": 0,
      "source_geography_language_time_undercovered_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "monitoring_drift": {
      "monitoring_current": true,
      "denominator_complete": true,
      "drift_threshold_predeclared": true,
      "source_feature_prevalence_calibration_population_workflow_drift_complete": true,
      "alerts_unsuppressed": true,
      "escalation_complete": true,
      "drift_undetected_pairs": 0,
      "suppressed_drift_alerts": 0
    },
    "recalibration_governance": {
      "recalibration_trigger_predeclared": true,
      "trigger_executed": true,
      "independent_validation_complete": true,
      "safe_deployment_complete": true,
      "rollback_available": true,
      "certificate_withdrawal_available": true,
      "corrected_republication_complete": true,
      "appeal_complete": true,
      "failed_recalibration_pairs": 0,
      "rollback_unavailable_decisions": 0,
      "certificates_not_withdrawn": 0
    },
    "lineage_authority": {
      "current_lineage": false,
      "certificate_history_complete": false,
      "supersession_complete": false,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_uncertainty_decisions": 100,
      "unsupported_uncertainty_decisions": 700
    },
    "expected_mechanism": "stale_uncertainty_assurance_after_succession",
    "expected_flags": {
      "complete_interval_target_and_construction_assurance": true,
      "complete_dependence_assurance": true,
      "complete_multiplicity_and_selection_assurance": true,
      "complete_subgroup_coverage_and_falsification_assurance": true,
      "complete_drift_monitoring_assurance": true,
      "complete_recalibration_rollback_and_correction_assurance": true,
      "current_uncertainty_lineage_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_uncertainty_assurance": false
    }
  }
].map(world => [world.world_id, world]));
const EXPECTED_WORLD_IDS = Object.keys(WORLD_EXPECTATIONS);
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
const sum = (worlds, section, key) => worlds.reduce((total, world) => total + Number(world?.[section]?.[key] ?? 0), 0);
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function deriveFlags(world) {
  const interval = object(world?.interval_semantics);
  const dependence = object(world?.dependence_design);
  const multiplicity = object(world?.multiplicity_selection);
  const subgroup = object(world?.subgroup_coverage);
  const monitoring = object(world?.monitoring_drift);
  const recalibration = object(world?.recalibration_governance);
  const lineage = object(world?.lineage_authority);
  const flags = {
    complete_interval_target_and_construction_assurance: interval.uncertainty_target_explicit === true && interval.event_explicit === true && interval.estimand_explicit === true && interval.interval_type_explicit === true && interval.coverage_level_explicit === true && interval.bounds_semantics_explicit === true && interval.empirical_coverage_target_current === true && interval.heuristic_interval_pairs === 0 && interval.in_sample_interval_pairs === 0 && interval.undercovered_pairs === 0,
    complete_dependence_assurance: dependence.out_of_sample_construction === true && dependence.construction_validation_separated === true && dependence.entity_cluster_split_safe === true && dependence.household_split_safe === true && dependence.source_split_safe === true && dependence.time_split_safe === true && dependence.resampling_unit_valid === true && dependence.covariance_modeled === true && dependence.effective_sample_size_current === true && dependence.dependence_invalidated_pairs === 0 && dependence.cluster_leaked_pairs === 0,
    complete_multiplicity_and_selection_assurance: multiplicity.multiplicity_family_complete === true && multiplicity.simultaneous_coverage_adjusted === true && multiplicity.adaptive_selection_accounted === true && multiplicity.repeated_monitoring_accounted === true && multiplicity.optional_stopping_accounted === true && multiplicity.winner_curse_accounted === true && multiplicity.multiplicity_uncorrected_pairs === 0 && multiplicity.adaptive_monitoring_contaminated_pairs === 0,
    complete_subgroup_coverage_and_falsification_assurance: subgroup.subgroup_coverage_complete === true && subgroup.source_geography_language_time_coverage_complete === true && subgroup.identifier_quality_missingness_coverage_complete === true && subgroup.negative_controls_complete === true && subgroup.falsification_complete === true && subgroup.subgroup_undercovered_pairs === 0 && subgroup.source_geography_language_time_undercovered_pairs === 0 && subgroup.negative_control_failures === 0 && subgroup.falsification_failures === 0,
    complete_drift_monitoring_assurance: monitoring.monitoring_current === true && monitoring.denominator_complete === true && monitoring.drift_threshold_predeclared === true && monitoring.source_feature_prevalence_calibration_population_workflow_drift_complete === true && monitoring.alerts_unsuppressed === true && monitoring.escalation_complete === true && monitoring.drift_undetected_pairs === 0 && monitoring.suppressed_drift_alerts === 0,
    complete_recalibration_rollback_and_correction_assurance: recalibration.recalibration_trigger_predeclared === true && recalibration.trigger_executed === true && recalibration.independent_validation_complete === true && recalibration.safe_deployment_complete === true && recalibration.rollback_available === true && recalibration.certificate_withdrawal_available === true && recalibration.corrected_republication_complete === true && recalibration.appeal_complete === true && recalibration.failed_recalibration_pairs === 0 && recalibration.rollback_unavailable_decisions === 0 && recalibration.certificates_not_withdrawn === 0,
    current_uncertainty_lineage_assurance: lineage.current_lineage === true && lineage.certificate_history_complete === true && lineage.supersession_complete === true && lineage.public_claim_supported === true && lineage.stale_uncertainty_decisions === 0 && lineage.unsupported_uncertainty_decisions === 0,
    binding_public_authority_supported: lineage.binding_public_authority === true,
    real_world_effect_claimed: false,
    graph_effect_present: false,
    preference_change_present: false
  };
  flags.complete_linkage_uncertainty_assurance = flags.complete_interval_target_and_construction_assurance && flags.complete_dependence_assurance && flags.complete_multiplicity_and_selection_assurance && flags.complete_subgroup_coverage_and_falsification_assurance && flags.complete_drift_monitoring_assurance && flags.complete_recalibration_rollback_and_correction_assurance && flags.current_uncertainty_lineage_assurance && !flags.binding_public_authority_supported;
  return flags;
}

function custodyChain(fixture, world, flags, publicSignature, governanceSignature) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  const prefix = `${fixture.fixture_id}:${world.world_id}`;
  push({ event_id: `${prefix}:public`, event_type: 'linkage_uncertainty_publication_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'pc44_fixture', source_event_ids: [], payload: { baseline: fixture.baseline, public_uncertainty_signature_sha256: publicSignature } });
  push({ event_id: `${prefix}:interval`, event_type: 'uncertainty_target_interval_construction_and_empirical_coverage_state', evidence_class: 'synthetic_provenance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:public`], payload: world.interval_semantics });
  push({ event_id: `${prefix}:dependence`, event_type: 'dependence_split_resampling_and_effective_sample_size_state', evidence_class: 'synthetic_provenance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:interval`], payload: world.dependence_design });
  push({ event_id: `${prefix}:multiplicity`, event_type: 'multiplicity_adaptive_selection_and_optional_stopping_state', evidence_class: 'synthetic_provenance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:dependence`], payload: world.multiplicity_selection });
  push({ event_id: `${prefix}:subgroup`, event_type: 'subgroup_coverage_negative_control_and_falsification_state', evidence_class: 'synthetic_provenance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:multiplicity`], payload: world.subgroup_coverage });
  push({ event_id: `${prefix}:monitor`, event_type: 'drift_monitor_denominator_alert_suppression_and_escalation_state', evidence_class: 'synthetic_provenance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:subgroup`], payload: world.monitoring_drift });
  push({ event_id: `${prefix}:recalibration`, event_type: 'recalibration_trigger_rollback_certificate_withdrawal_and_correction_state', evidence_class: 'synthetic_governance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:monitor`], payload: world.recalibration_governance });
  push({ event_id: `${prefix}:lineage`, event_type: 'uncertainty_lineage_certificate_history_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'pc44_compiler', source_event_ids: [`${prefix}:recalibration`], payload: world.lineage_authority });
  push({ event_id: `${prefix}:derived`, event_type: 'linkage_uncertainty_assurance_flags_derived', evidence_class: 'synthetic_derivation', authority: 'pc44_compiler', source_event_ids: [`${prefix}:lineage`], payload: { flags, uncertainty_governance_signature_sha256: governanceSignature } });
  push({ event_id: `${prefix}:mechanism`, event_type: 'linkage_uncertainty_governance_mechanism_classified', evidence_class: 'synthetic_classification', authority: 'pc44_compiler', source_event_ids: [`${prefix}:derived`], payload: { mechanism: world.expected_mechanism } });
  return events;
}

export const EXPECTED_LINKAGE_UNCERTAINTY_METRICS = {
  world_count: 8,
  distinct_public_uncertainty_signatures: 1,
  distinct_uncertainty_governance_signatures: 8,
  complete_linkage_uncertainty_assurance_worlds: 1,
  total_undercovered_pairs: 50,
  total_in_sample_interval_pairs: 40,
  total_heuristic_interval_pairs: 40,
  total_dependence_invalidated_pairs: 40,
  total_cluster_leaked_pairs: 30,
  total_multiplicity_uncorrected_pairs: 40,
  total_adaptive_monitoring_contaminated_pairs: 30,
  total_subgroup_undercovered_pairs: 40,
  total_source_geography_language_time_undercovered_pairs: 40,
  total_drift_undetected_pairs: 50,
  total_suppressed_drift_alerts: 30,
  total_failed_recalibration_pairs: 30,
  total_rollback_unavailable_decisions: 25,
  total_certificates_not_withdrawn: 20,
  total_negative_control_failures: 20,
  total_falsification_failures: 20,
  total_stale_uncertainty_decisions: 100,
  total_unsupported_uncertainty_decisions: 700,
  binding_public_authority_worlds: 0
};

function metricsFor(worlds) {
  return {
    world_count: worlds.length,
    distinct_public_uncertainty_signatures: new Set(worlds.map(world => world.public_uncertainty_signature_sha256)).size,
    distinct_uncertainty_governance_signatures: new Set(worlds.map(world => world.uncertainty_governance_signature_sha256)).size,
    complete_linkage_uncertainty_assurance_worlds: worlds.filter(world => world.flags.complete_linkage_uncertainty_assurance).length,
    total_undercovered_pairs: sum(worlds, 'interval_semantics', 'undercovered_pairs'),
    total_in_sample_interval_pairs: sum(worlds, 'interval_semantics', 'in_sample_interval_pairs'),
    total_heuristic_interval_pairs: sum(worlds, 'interval_semantics', 'heuristic_interval_pairs'),
    total_dependence_invalidated_pairs: sum(worlds, 'dependence_design', 'dependence_invalidated_pairs'),
    total_cluster_leaked_pairs: sum(worlds, 'dependence_design', 'cluster_leaked_pairs'),
    total_multiplicity_uncorrected_pairs: sum(worlds, 'multiplicity_selection', 'multiplicity_uncorrected_pairs'),
    total_adaptive_monitoring_contaminated_pairs: sum(worlds, 'multiplicity_selection', 'adaptive_monitoring_contaminated_pairs'),
    total_subgroup_undercovered_pairs: sum(worlds, 'subgroup_coverage', 'subgroup_undercovered_pairs'),
    total_source_geography_language_time_undercovered_pairs: sum(worlds, 'subgroup_coverage', 'source_geography_language_time_undercovered_pairs'),
    total_drift_undetected_pairs: sum(worlds, 'monitoring_drift', 'drift_undetected_pairs'),
    total_suppressed_drift_alerts: sum(worlds, 'monitoring_drift', 'suppressed_drift_alerts'),
    total_failed_recalibration_pairs: sum(worlds, 'recalibration_governance', 'failed_recalibration_pairs'),
    total_rollback_unavailable_decisions: sum(worlds, 'recalibration_governance', 'rollback_unavailable_decisions'),
    total_certificates_not_withdrawn: sum(worlds, 'recalibration_governance', 'certificates_not_withdrawn'),
    total_negative_control_failures: sum(worlds, 'subgroup_coverage', 'negative_control_failures'),
    total_falsification_failures: sum(worlds, 'subgroup_coverage', 'falsification_failures'),
    total_stale_uncertainty_decisions: sum(worlds, 'lineage_authority', 'stale_uncertainty_decisions'),
    total_unsupported_uncertainty_decisions: sum(worlds, 'lineage_authority', 'unsupported_uncertainty_decisions'),
    binding_public_authority_worlds: worlds.filter(world => world.lineage_authority.binding_public_authority === true).length
  };
}

export function validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_LINKAGE_UNCERTAINTY_MONITORING_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-linkage-uncertainty-verified-status-different-operational-states-v1') errors.push('fixture identity mismatch');
  if (fixture?.issue !== 954 || fixture?.parent_program_issue !== 594) errors.push('fixture issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('fixture status or graph effect mismatch');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture thesis evidence', errors);
  if (stable(fixture?.baseline) !== stable(BASELINE)) errors.push('fixture public surface mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(fixture?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('fixture refusal-rule ledger mismatch');
  if (stable(fixture?.expected_classification) !== stable(EXPECTED_CLASSIFICATION)) errors.push('fixture classification contract mismatch');
  const worlds = array(fixture?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture world denominator mismatch');
  for (const world of worlds) {
    const id = text(world?.world_id); const expected = WORLD_EXPECTATIONS[id];
    if (!expected) { errors.push(`unexpected world: ${id || '<blank>'}`); continue; }
    if (stable(world) !== stable(expected)) errors.push(`${id} world contract mismatch`);
    const flags = deriveFlags(world);
    if (stable(flags) !== stable(world.expected_flags)) errors.push(`${id} expected flags mismatch`);
    if (world?.lineage_authority?.binding_public_authority !== false) errors.push(`${id} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_linkage_uncertainty_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete linkage-uncertainty assurance world is required');
  return errors;
}

export function compilePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid linkage-uncertainty fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = { interval_semantics: world.interval_semantics, dependence_design: world.dependence_design, multiplicity_selection: world.multiplicity_selection, subgroup_coverage: world.subgroup_coverage, monitoring_drift: world.monitoring_drift, recalibration_governance: world.recalibration_governance, lineage_authority: world.lineage_authority };
    const governanceSignature = sha256(provenance);
    const chain = custodyChain(fixture, world, flags, publicSignature, governanceSignature);
    return { world_id: world.world_id, description: world.description, interval_semantics: world.interval_semantics, dependence_design: world.dependence_design, multiplicity_selection: world.multiplicity_selection, subgroup_coverage: world.subgroup_coverage, monitoring_drift: world.monitoring_drift, recalibration_governance: world.recalibration_governance, lineage_authority: world.lineage_authority, flags, mechanism: world.expected_mechanism, public_uncertainty_signature_sha256: publicSignature, uncertainty_governance_signature_sha256: governanceSignature, custody_chain: chain, custody_chain_head_sha256: chain.at(-1).event_sha256 };
  });
  return { schema_version: PREFERENCE_LINKAGE_UNCERTAINTY_MONITORING_ASSURANCE_BUILD_SCHEMA_VERSION, fixture_id: fixture.fixture_id, issue: fixture.issue, parent_program_issue: fixture.parent_program_issue, captured_at: fixture.captured_at, status: 'synthetic_linkage_uncertainty_monitoring_control_qualified', graph_effect: 'none', counts_toward_thesis_evidence: false, conclusion_generated: false, baseline: canonical(fixture.baseline), required_refusal_rules: [...fixture.required_refusal_rules], fixture_sha256: sha256(fixture), worlds, metrics: metricsFor(worlds), classification: { ...fixture.expected_classification } };
}

function validateChain(world, errors) {
  const expectedTypes = ['linkage_uncertainty_publication_surface_frozen','uncertainty_target_interval_construction_and_empirical_coverage_state','dependence_split_resampling_and_effective_sample_size_state','multiplicity_adaptive_selection_and_optional_stopping_state','subgroup_coverage_negative_control_and_falsification_state','drift_monitor_denominator_alert_suppression_and_escalation_state','recalibration_trigger_rollback_certificate_withdrawal_and_correction_state','uncertainty_lineage_certificate_history_and_authority_state','linkage_uncertainty_assurance_flags_derived','linkage_uncertainty_governance_mechanism_classified'];
  const chain = array(world?.custody_chain);
  if (chain.length !== expectedTypes.length) errors.push(`${world?.world_id} custody chain length mismatch`);
  let previous = null; const seen = new Set();
  for (let index = 0; index < chain.length; index += 1) {
    const event = chain[index];
    if (event?.event_type !== expectedTypes[index]) errors.push(`${world?.world_id} custody event type mismatch at ${index}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`${world?.world_id} custody previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`${world?.world_id} custody source missing: ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`${world?.world_id} custody hash mismatch`);
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== world?.custody_chain_head_sha256) errors.push(`${world?.world_id} custody head mismatch`);
}

export function validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_LINKAGE_UNCERTAINTY_MONITORING_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== 'same-linkage-uncertainty-verified-status-different-operational-states-v1' || build?.issue !== 954 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_linkage_uncertainty_monitoring_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors); requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const expected = WORLD_EXPECTATIONS[text(world?.world_id)];
    if (!expected) { errors.push(`build unexpected world: ${text(world?.world_id) || '<blank>'}`); continue; }
    for (const section of ['interval_semantics','dependence_design','multiplicity_selection','subgroup_coverage','monitoring_drift','recalibration_governance','lineage_authority']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${world.world_id} build ${section} mismatch`);
    const flags = deriveFlags(world); if (stable(world?.flags) !== stable(flags)) errors.push(`${world.world_id} build flags mismatch`);
    if (world?.mechanism !== expected.expected_mechanism) errors.push(`${world.world_id} mechanism mismatch`);
    if (world?.public_uncertainty_signature_sha256 !== sha256(BASELINE)) errors.push(`${world.world_id} public signature mismatch`);
    const provenance = { interval_semantics: world.interval_semantics, dependence_design: world.dependence_design, multiplicity_selection: world.multiplicity_selection, subgroup_coverage: world.subgroup_coverage, monitoring_drift: world.monitoring_drift, recalibration_governance: world.recalibration_governance, lineage_authority: world.lineage_authority };
    if (world?.uncertainty_governance_signature_sha256 !== sha256(provenance)) errors.push(`${world.world_id} governance signature mismatch`);
    if (world?.lineage_authority?.binding_public_authority !== false) errors.push(`${world.world_id} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_UNCERTAINTY_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.[TRUE_CLASSIFICATION] !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceLinkageUncertaintyMonitoringAssuranceMarkdown(build) {
  const lines = ['# Linkage-uncertainty coverage, subgroup drift, monitoring, and recalibration custody','',`**Status:** ${build.status}`,'',`**Worlds:** ${build.metrics.world_count}`,'',`**Public uncertainty signatures:** ${build.metrics.distinct_public_uncertainty_signatures}`,'',`**Uncertainty-governance signatures:** ${build.metrics.distinct_uncertainty_governance_signatures}`,'','> A complete-looking uncertainty publication does not identify interval semantics, out-of-sample construction, dependence correction, simultaneous coverage, subgroup validity, drift monitoring, recalibration execution, rollback, certificate withdrawal, correction, current lineage, or authority custody.','','## Deterministic burden surface',''];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', ''); for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, uncertainty interval, empirical coverage estimate, subgroup burden, drift event, recalibration success, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
