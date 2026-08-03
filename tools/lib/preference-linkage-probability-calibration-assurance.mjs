import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_PROBABILITY_CALIBRATION_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-linkage-probability-calibration-assurance-fixture@1';
export const PREFERENCE_LINKAGE_PROBABILITY_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-linkage-probability-calibration-assurance-build@1';
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "source_systems": 4,
  "published_candidate_pairs": 100,
  "published_linked_pairs": 100,
  "published_calibrated_coverage_pct": 100,
  "published_mean_match_probability": 0.99,
  "published_brier_score": 0.0,
  "published_expected_calibration_error": 0.0,
  "published_uncertainty_coverage_pct": 100,
  "public_probability_status": "linkage_probabilities_validated",
  "approved_use": "longitudinal_exposure_estimation"
};
const CANONICAL_LINKAGE_PROBABILITY_REFUSAL_RULES = Object.freeze([
  "one_bounded_score_is_not_a_probability_without_an_explicit_probabilistic_target_and_calibration_receipt",
  "monotonic_score_ordering_is_not_probability_calibration",
  "one_hundred_percent_calibrated_coverage_is_not_complete_when_excluded_or_unscored_pairs_are_omitted",
  "mean_probability_near_one_is_not_correctness_or_low_error",
  "zero_published_brier_score_is_not_zero_true_brier_loss_without_complete_label_and_denominator_custody",
  "zero_expected_calibration_error_is_not_calibration_when_binning_sampling_or_empty_strata_conceal_error",
  "one_reliability_curve_is_not_out_of_sample_calibration",
  "training_or_tuning_performance_is_not_independent_validation",
  "random_pair_splitting_is_not_independent_when_entities_households_sources_time_or_linkage_clusters_cross_splits",
  "labels_derived_from_the_production_linkage_rule_are_not_independent_ground_truth",
  "aggregate_calibration_is_not_subgroup_source_geography_language_identifier_quality_missingness_or_time_specific_calibration",
  "calibration_under_one_class_prevalence_is_not_calibration_after_base_rate_or_population_shift",
  "case_control_calibration_is_not_deployment_calibration_without_prior_correction",
  "one_convenience_validation_sample_is_not_the_deployment_pair_universe",
  "absence_of_hard_negatives_is_not_evidence_of_low_false_match_probability",
  "numeric_confidence_interval_endpoints_are_not_valid_uncertainty_without_a_coverage_design",
  "nominal_uncertainty_coverage_is_not_empirical_coverage",
  "adaptive_model_or_threshold_selection_invalidates_naive_holdout_claims_without_selection_correction",
  "historical_probability_assurance_is_not_current_after_feature_model_label_validation_source_population_workflow_policy_or_release_succession",
  "public_linkage_probabilities_validated_status_is_not_complete_current_independently_labeled_representative_prevalence_adjusted_subgroup_calibrated_uncertainty_covered_correctable_or_authorized_evidence",
  "probability_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
]);
export const REQUIRED_LINKAGE_PROBABILITY_REFUSAL_RULES = Object.freeze([...CANONICAL_LINKAGE_PROBABILITY_REFUSAL_RULES]);
const REQUIRED_REFUSAL_RULES = CANONICAL_LINKAGE_PROBABILITY_REFUSAL_RULES;
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
const EXPECTED_CLASSIFICATION = {
  "one_score_identifies_calibrated_probability": false,
  "monotonic_ordering_identifies_probability_calibration": false,
  "full_calibrated_coverage_identifies_complete_pair_coverage": false,
  "mean_probability_identifies_correctness": false,
  "zero_brier_identifies_zero_true_brier_loss": false,
  "zero_ece_identifies_complete_calibration": false,
  "reliability_curve_identifies_out_of_sample_calibration": false,
  "train_or_tune_performance_identifies_independent_validation": false,
  "random_pair_split_identifies_entity_source_and_time_independence": false,
  "production_linkage_labels_identify_independent_ground_truth": false,
  "aggregate_calibration_identifies_subgroup_source_geography_language_identifier_quality_missingness_and_time_calibration": false,
  "calibration_prevalence_identifies_deployment_prevalence": false,
  "case_control_calibration_identifies_deployment_calibration_without_prior_correction": false,
  "convenience_validation_sample_identifies_deployment_pair_universe": false,
  "absence_of_hard_negatives_identifies_low_false_match_probability": false,
  "numeric_interval_endpoints_identify_valid_uncertainty": false,
  "nominal_coverage_identifies_empirical_coverage": false,
  "adaptive_selection_identifies_locked_validation": false,
  "historical_probability_assurance_identifies_current_assurance_after_succession": false,
  "public_linkage_probabilities_validated_status_identifies_complete_current_correctable_authorized_evidence": false,
  "probability_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent": false,
  "binding_public_authority_supported": false,
  "manipulative_intent_inferable": false,
  "real_world_effect_claimed": false,
  "graph_effect_present": false,
  "preference_change_present": false,
  "complete_linkage_probability_assurance_supported_in_at_least_one_world": true
};
const WORLD_EXPECTATIONS = Object.fromEntries([
  {
    "world_id": "complete_linkage_probability_assurance",
    "description": "Complete score-semantics, independent-label, representative-validation, prevalence, calibration, subgroup, uncertainty, correction, and current-lineage assurance.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "complete_linkage_probability_assurance",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": true
    }
  },
  {
    "world_id": "raw_score_published_as_probability",
    "description": "Raw similarity, margin, rank, or classifier scores are published as match probabilities without a supported probabilistic target or current calibration transform.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": false,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": false,
      "raw_score_as_probability_pairs": 40,
      "miscalibrated_pairs": 50
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "raw_score_published_as_probability",
    "expected_flags": {
      "complete_score_semantics_assurance": false,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "label_leakage_and_circular_validation",
    "description": "Training, tuning, validation, and ground-truth labels leak across splits or are circularly derived from the production linkage rule.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": false,
      "entity_cluster_split_safe": false,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": false,
      "label_leakage_audit_complete": false,
      "circularity_audit_complete": false,
      "leaked_label_pairs": 30,
      "circular_ground_truth_pairs": 25
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "label_leakage_and_circular_validation",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": false,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "validation_sample_exclusion_and_hard_negative_omission",
    "description": "Validation sampling excludes hard negatives, rare identifiers, weak-source pairs, and deployment strata while complete calibration is published.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": false,
      "hard_negatives_complete": false,
      "rare_identifier_strata_complete": false,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": false,
      "validation_sample_excluded_pairs": 40,
      "hard_negative_omissions": 30,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "validation_sample_exclusion_and_hard_negative_omission",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": false,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "prevalence_and_base_rate_shift",
    "description": "Class prevalence, source composition, population mix, and deployment base rates shift after calibration without prior correction.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": false,
      "prior_shift_adjusted": false,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 40
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "prevalence_and_base_rate_shift",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": false,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "subgroup_source_geography_language_time_miscalibration",
    "description": "Aggregate calibration masks subgroup, source, geography, language, identifier-quality, missingness, and time-specific error while controls and falsification fail.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": false,
      "falsification_complete": false,
      "subgroup_calibration_complete": false,
      "source_geography_language_time_calibration_complete": false,
      "subgroup_miscalibrated_pairs": 40,
      "source_geography_language_time_miscalibrated_pairs": 40,
      "negative_control_failures": 20,
      "falsification_failures": 20
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "subgroup_source_geography_language_time_miscalibration",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": false,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "uncertainty_undercoverage_and_adaptive_selection",
    "description": "Confidence intervals, predictive sets, empirical coverage, uncertainty propagation, and adaptive model-selection correction are absent or invalid.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": false,
      "empirical_coverage_complete": false,
      "adaptive_selection_accounted": false,
      "uncertainty_undercovered_pairs": 50,
      "adaptive_selection_contaminated_pairs": 30
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_calibration_decisions": 0,
      "unsupported_probability_decisions": 0
    },
    "expected_mechanism": "uncertainty_undercoverage_and_adaptive_selection",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": false,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
    }
  },
  {
    "world_id": "stale_probability_assurance_after_succession",
    "description": "Historical probability assurance is inherited after feature, model, label, validation, source, population, workflow, policy, and release succession.",
    "score_semantics": {
      "score_semantics_explicit": true,
      "probabilistic_target_explicit": true,
      "positive_event_explicit": true,
      "negative_event_explicit": true,
      "score_to_probability_transform_current": true,
      "raw_score_as_probability_pairs": 0,
      "miscalibrated_pairs": 0
    },
    "labels_validation": {
      "training_validation_separated": true,
      "entity_cluster_split_safe": true,
      "source_split_safe": true,
      "time_split_safe": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "prevalence_sampling": {
      "validation_frame_representative": true,
      "hard_negatives_complete": true,
      "rare_identifier_strata_complete": true,
      "deployment_prevalence_current": true,
      "prior_shift_adjusted": true,
      "sample_weighting_complete": true,
      "validation_sample_excluded_pairs": 0,
      "hard_negative_omissions": 0,
      "prevalence_shift_pairs": 0
    },
    "calibration_uncertainty": {
      "calibration_method_current": true,
      "proper_score_evidence_complete": true,
      "reliability_curve_complete": true,
      "out_of_sample_validation_complete": true,
      "uncertainty_method_current": true,
      "empirical_coverage_complete": true,
      "adaptive_selection_accounted": true,
      "uncertainty_undercovered_pairs": 0,
      "adaptive_selection_contaminated_pairs": 0
    },
    "controls_subgroups": {
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_geography_language_time_calibration_complete": true,
      "subgroup_miscalibrated_pairs": 0,
      "source_geography_language_time_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": false,
      "monitoring_complete": false,
      "recalibration_complete": false,
      "rollback_complete": false,
      "correction_complete": false,
      "certificate_history_complete": false,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_calibration_decisions": 100,
      "unsupported_probability_decisions": 700
    },
    "expected_mechanism": "stale_probability_assurance_after_succession",
    "expected_flags": {
      "complete_score_semantics_assurance": true,
      "complete_label_and_validation_assurance": true,
      "complete_prevalence_and_sampling_assurance": true,
      "complete_calibration_and_uncertainty_assurance": true,
      "complete_falsification_and_subgroup_assurance": true,
      "current_probability_lineage_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "complete_linkage_probability_assurance": false
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
  const score = object(world?.score_semantics);
  const labels = object(world?.labels_validation);
  const prevalence = object(world?.prevalence_sampling);
  const calibration = object(world?.calibration_uncertainty);
  const controls = object(world?.controls_subgroups);
  const governance = object(world?.governance);
  const flags = {
    complete_score_semantics_assurance: score.score_semantics_explicit === true && score.probabilistic_target_explicit === true && score.positive_event_explicit === true && score.negative_event_explicit === true && score.score_to_probability_transform_current === true && score.raw_score_as_probability_pairs === 0 && score.miscalibrated_pairs === 0,
    complete_label_and_validation_assurance: labels.training_validation_separated === true && labels.entity_cluster_split_safe === true && labels.source_split_safe === true && labels.time_split_safe === true && labels.ground_truth_independent === true && labels.label_leakage_audit_complete === true && labels.circularity_audit_complete === true && labels.leaked_label_pairs === 0 && labels.circular_ground_truth_pairs === 0,
    complete_prevalence_and_sampling_assurance: prevalence.validation_frame_representative === true && prevalence.hard_negatives_complete === true && prevalence.rare_identifier_strata_complete === true && prevalence.deployment_prevalence_current === true && prevalence.prior_shift_adjusted === true && prevalence.sample_weighting_complete === true && prevalence.validation_sample_excluded_pairs === 0 && prevalence.hard_negative_omissions === 0 && prevalence.prevalence_shift_pairs === 0,
    complete_calibration_and_uncertainty_assurance: calibration.calibration_method_current === true && calibration.proper_score_evidence_complete === true && calibration.reliability_curve_complete === true && calibration.out_of_sample_validation_complete === true && calibration.uncertainty_method_current === true && calibration.empirical_coverage_complete === true && calibration.adaptive_selection_accounted === true && calibration.uncertainty_undercovered_pairs === 0 && calibration.adaptive_selection_contaminated_pairs === 0,
    complete_falsification_and_subgroup_assurance: controls.negative_controls_complete === true && controls.falsification_complete === true && controls.subgroup_calibration_complete === true && controls.source_geography_language_time_calibration_complete === true && controls.subgroup_miscalibrated_pairs === 0 && controls.source_geography_language_time_miscalibrated_pairs === 0 && controls.negative_control_failures === 0 && controls.falsification_failures === 0,
    current_probability_lineage_assurance: governance.current_lineage === true && governance.monitoring_complete === true && governance.recalibration_complete === true && governance.rollback_complete === true && governance.correction_complete === true && governance.certificate_history_complete === true && governance.public_claim_supported === true && governance.stale_calibration_decisions === 0 && governance.unsupported_probability_decisions === 0,
    binding_public_authority_supported: governance.binding_public_authority === true,
    real_world_effect_claimed: false,
    graph_effect_present: false,
    preference_change_present: false
  };
  flags.complete_linkage_probability_assurance = flags.complete_score_semantics_assurance && flags.complete_label_and_validation_assurance && flags.complete_prevalence_and_sampling_assurance && flags.complete_calibration_and_uncertainty_assurance && flags.complete_falsification_and_subgroup_assurance && flags.current_probability_lineage_assurance && !flags.binding_public_authority_supported;
  return flags;
}

function custodyChain(fixture, world, flags, publicSignature, governanceSignature) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  const prefix = `${fixture.fixture_id}:${world.world_id}`;
  push({ event_id: `${prefix}:public`, event_type: 'linkage_probability_publication_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'pc43_fixture', source_event_ids: [], payload: { baseline: fixture.baseline, public_status_signature_sha256: publicSignature } });
  push({ event_id: `${prefix}:score`, event_type: 'score_semantics_and_probability_target_state', evidence_class: 'synthetic_provenance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:public`], payload: world.score_semantics });
  push({ event_id: `${prefix}:labels`, event_type: 'label_ground_truth_and_validation_split_state', evidence_class: 'synthetic_provenance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:score`], payload: world.labels_validation });
  push({ event_id: `${prefix}:sampling`, event_type: 'validation_sampling_prevalence_and_base_rate_state', evidence_class: 'synthetic_provenance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:labels`], payload: world.prevalence_sampling });
  push({ event_id: `${prefix}:calibration`, event_type: 'calibration_uncertainty_and_adaptive_selection_state', evidence_class: 'synthetic_provenance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:sampling`], payload: world.calibration_uncertainty });
  push({ event_id: `${prefix}:controls`, event_type: 'negative_control_falsification_and_subgroup_state', evidence_class: 'synthetic_provenance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:calibration`], payload: world.controls_subgroups });
  push({ event_id: `${prefix}:governance`, event_type: 'probability_lineage_monitoring_recalibration_correction_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'pc43_compiler', source_event_ids: [`${prefix}:controls`], payload: world.governance });
  push({ event_id: `${prefix}:derived`, event_type: 'linkage_probability_assurance_flags_derived', evidence_class: 'synthetic_derivation', authority: 'pc43_compiler', source_event_ids: [`${prefix}:governance`], payload: { flags, probability_governance_signature_sha256: governanceSignature } });
  push({ event_id: `${prefix}:mechanism`, event_type: 'linkage_probability_governance_mechanism_classified', evidence_class: 'synthetic_classification', authority: 'pc43_compiler', source_event_ids: [`${prefix}:derived`], payload: { mechanism: world.expected_mechanism } });
  return events;
}

export const EXPECTED_LINKAGE_PROBABILITY_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_probability_governance_signatures: 8,
  complete_linkage_probability_assurance_worlds: 1,
  total_miscalibrated_pairs: 50,
  total_raw_score_as_probability_pairs: 40,
  total_leaked_label_pairs: 30,
  total_circular_ground_truth_pairs: 25,
  total_validation_sample_excluded_pairs: 40,
  total_hard_negative_omissions: 30,
  total_prevalence_shift_pairs: 40,
  total_subgroup_miscalibrated_pairs: 40,
  total_source_geography_language_time_miscalibrated_pairs: 40,
  total_uncertainty_undercovered_pairs: 50,
  total_adaptive_selection_contaminated_pairs: 30,
  total_negative_control_failures: 20,
  total_falsification_failures: 20,
  total_stale_calibration_decisions: 100,
  total_unsupported_probability_decisions: 700,
  binding_public_authority_worlds: 0
};

function metricsFor(worlds) {
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature_sha256)).size,
    distinct_probability_governance_signatures: new Set(worlds.map(world => world.probability_governance_signature_sha256)).size,
    complete_linkage_probability_assurance_worlds: worlds.filter(world => world.flags.complete_linkage_probability_assurance).length,
    total_miscalibrated_pairs: sum(worlds, 'score_semantics', 'miscalibrated_pairs'),
    total_raw_score_as_probability_pairs: sum(worlds, 'score_semantics', 'raw_score_as_probability_pairs'),
    total_leaked_label_pairs: sum(worlds, 'labels_validation', 'leaked_label_pairs'),
    total_circular_ground_truth_pairs: sum(worlds, 'labels_validation', 'circular_ground_truth_pairs'),
    total_validation_sample_excluded_pairs: sum(worlds, 'prevalence_sampling', 'validation_sample_excluded_pairs'),
    total_hard_negative_omissions: sum(worlds, 'prevalence_sampling', 'hard_negative_omissions'),
    total_prevalence_shift_pairs: sum(worlds, 'prevalence_sampling', 'prevalence_shift_pairs'),
    total_subgroup_miscalibrated_pairs: sum(worlds, 'controls_subgroups', 'subgroup_miscalibrated_pairs'),
    total_source_geography_language_time_miscalibrated_pairs: sum(worlds, 'controls_subgroups', 'source_geography_language_time_miscalibrated_pairs'),
    total_uncertainty_undercovered_pairs: sum(worlds, 'calibration_uncertainty', 'uncertainty_undercovered_pairs'),
    total_adaptive_selection_contaminated_pairs: sum(worlds, 'calibration_uncertainty', 'adaptive_selection_contaminated_pairs'),
    total_negative_control_failures: sum(worlds, 'controls_subgroups', 'negative_control_failures'),
    total_falsification_failures: sum(worlds, 'controls_subgroups', 'falsification_failures'),
    total_stale_calibration_decisions: sum(worlds, 'governance', 'stale_calibration_decisions'),
    total_unsupported_probability_decisions: sum(worlds, 'governance', 'unsupported_probability_decisions'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
}

export function validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_LINKAGE_PROBABILITY_CALIBRATION_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-linkage-probabilities-validated-status-different-operational-states-v1') errors.push('fixture identity mismatch');
  if (fixture?.issue !== 928 || fixture?.parent_program_issue !== 594) errors.push('fixture issue lineage mismatch');
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
    if (world?.governance?.binding_public_authority !== false) errors.push(`${id} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_linkage_probability_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete linkage-probability assurance world is required');
  return errors;
}

export function compilePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid linkage-probability fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = { score_semantics: world.score_semantics, labels_validation: world.labels_validation, prevalence_sampling: world.prevalence_sampling, calibration_uncertainty: world.calibration_uncertainty, controls_subgroups: world.controls_subgroups, governance: world.governance };
    const governanceSignature = sha256(provenance);
    const chain = custodyChain(fixture, world, flags, publicSignature, governanceSignature);
    return {
      world_id: world.world_id,
      description: world.description,
      score_semantics: world.score_semantics,
      labels_validation: world.labels_validation,
      prevalence_sampling: world.prevalence_sampling,
      calibration_uncertainty: world.calibration_uncertainty,
      controls_subgroups: world.controls_subgroups,
      governance: world.governance,
      flags,
      mechanism: world.expected_mechanism,
      public_status_signature_sha256: publicSignature,
      probability_governance_signature_sha256: governanceSignature,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1).event_sha256
    };
  });
  return {
    schema_version: PREFERENCE_LINKAGE_PROBABILITY_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_linkage_probability_calibration_control_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    baseline: canonical(fixture.baseline),
    required_refusal_rules: [...fixture.required_refusal_rules],
    fixture_sha256: sha256(fixture),
    worlds,
    metrics: metricsFor(worlds),
    classification: { ...fixture.expected_classification }
  };
}

function validateChain(world, errors) {
  const expectedTypes = ['linkage_probability_publication_surface_frozen','score_semantics_and_probability_target_state','label_ground_truth_and_validation_split_state','validation_sampling_prevalence_and_base_rate_state','calibration_uncertainty_and_adaptive_selection_state','negative_control_falsification_and_subgroup_state','probability_lineage_monitoring_recalibration_correction_and_authority_state','linkage_probability_assurance_flags_derived','linkage_probability_governance_mechanism_classified'];
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

export function validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_LINKAGE_PROBABILITY_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== 'same-linkage-probabilities-validated-status-different-operational-states-v1' || build?.issue !== 928 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_linkage_probability_calibration_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors);
  requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const expected = WORLD_EXPECTATIONS[text(world?.world_id)];
    if (!expected) { errors.push(`build unexpected world: ${text(world?.world_id) || '<blank>'}`); continue; }
    for (const section of ['score_semantics','labels_validation','prevalence_sampling','calibration_uncertainty','controls_subgroups','governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${world.world_id} build ${section} mismatch`);
    const flags = deriveFlags(world);
    if (stable(world?.flags) !== stable(flags)) errors.push(`${world.world_id} build flags mismatch`);
    if (world?.mechanism !== expected.expected_mechanism) errors.push(`${world.world_id} mechanism mismatch`);
    if (world?.public_status_signature_sha256 !== sha256(BASELINE)) errors.push(`${world.world_id} public signature mismatch`);
    const provenance = { score_semantics: world.score_semantics, labels_validation: world.labels_validation, prevalence_sampling: world.prevalence_sampling, calibration_uncertainty: world.calibration_uncertainty, controls_subgroups: world.controls_subgroups, governance: world.governance };
    if (world?.probability_governance_signature_sha256 !== sha256(provenance)) errors.push(`${world.world_id} governance signature mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${world.world_id} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_PROBABILITY_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.[TRUE_CLASSIFICATION] !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceLinkageProbabilityCalibrationAssuranceMarkdown(build) {
  const lines = ['# Linkage-probability calibration, validation design, and uncertainty custody','',`**Status:** ${build.status}`,'',`**Worlds:** ${build.metrics.world_count}`,'',`**Public status signatures:** ${build.metrics.distinct_public_status_signatures}`,'',`**Governance signatures:** ${build.metrics.distinct_probability_governance_signatures}`,'','> A complete-looking probability publication does not identify probability semantics, independent labels, representative validation, deployment prevalence, subgroup calibration, empirical uncertainty coverage, locked selection, current correction, or authority custody.','','## Deterministic burden surface',''];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, match probability, calibration or uncertainty estimate, subgroup burden, exposure trajectory, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
