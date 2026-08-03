import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_SCORE_CALIBRATION_ASSURANCE_FIXTURE_SCHEMA_VERSION = "preference-linkage-score-calibration-assurance-fixture@1";
export const PREFERENCE_LINKAGE_SCORE_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION = "preference-linkage-score-calibration-assurance-build@1";
export const EXPECTED_LINKAGE_SCORE_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_linkage_score_governance_signatures": 8,
  "complete_linkage_score_assurance_worlds": 1,
  "total_miscalibrated_pairs": 50,
  "total_overconfident_pairs": 40,
  "total_underconfident_pairs": 30,
  "total_threshold_sensitive_pairs": 50,
  "total_hidden_ambiguous_pairs": 40,
  "total_force_resolved_pairs": 40,
  "total_unreviewed_pairs": 30,
  "total_reviewer_disagreements": 20,
  "total_reviewer_conflicted_pairs": 15,
  "total_false_positive_links": 30,
  "total_false_negative_links": 25,
  "total_leaked_label_pairs": 30,
  "total_circular_ground_truth_pairs": 25,
  "total_correlated_feature_pairs": 40,
  "total_subgroup_miscalibrated_pairs": 40,
  "total_negative_control_failures": 20,
  "total_falsification_failures": 20,
  "total_stale_score_decisions": 100,
  "total_unsupported_score_decisions": 700,
  "binding_public_authority_worlds": 0
};
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "source_systems": 4,
  "published_candidate_pairs": 100,
  "published_linked_pairs": 100,
  "published_high_confidence_pairs": 100,
  "published_calibrated_coverage_pct": 100,
  "published_ambiguous_pairs": 0,
  "published_abstentions": 0,
  "published_false_match_rate": 0.0,
  "published_missed_match_rate": 0.0,
  "public_score_status": "linkage_scores_calibrated",
  "approved_use": "longitudinal_exposure_estimation"
};
const REQUIRED_REFUSAL_RULES = [
  "one_high_score_is_not_a_calibrated_match_probability",
  "one_hundred_percent_high_confidence_coverage_is_not_calibrated_confidence",
  "one_hundred_percent_calibrated_coverage_is_not_representative_independent_validation",
  "zero_published_ambiguity_is_not_complete_ambiguity_preservation_or_adjudication",
  "zero_published_abstentions_is_not_evidence_that_no_case_required_abstention",
  "zero_published_false_match_rate_is_not_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_is_not_zero_true_false_negative_linkage",
  "one_deterministic_threshold_is_not_calibrated_uncertainty_or_an_abstention_policy",
  "post_outcome_threshold_selection_is_not_precommitted_validation",
  "aggregate_calibration_is_not_subgroup_source_geography_language_identifier_quality_or_time_specific_calibration",
  "the_highest_score_is_not_one_true_match_when_competing_candidates_remain_plausible",
  "force_resolved_multi_candidate_linkage_is_not_ambiguity_resolution",
  "clerical_review_is_not_independent_when_reviewers_share_labels_rules_incentives_evidence_or_conflicts",
  "reviewer_agreement_is_not_correctness_when_shared_evidence_is_circular_or_contaminated",
  "labels_derived_from_the_linkage_rule_are_not_independent_ground_truth",
  "correlated_source_features_are_not_independent_corroboration",
  "negative_control_or_falsification_failure_cannot_be_converted_into_confidence_by_threshold_selection",
  "historical_score_assurance_is_not_current_after_feature_model_label_threshold_reviewer_population_workflow_policy_or_release_succession",
  "public_linkage_scores_calibrated_status_is_not_complete_current_representative_ambiguity_preserving_independently_adjudicated_falsified_correctable_or_authorized_evidence",
  "score_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const FALSE_CLASSIFICATIONS = [
  "one_high_score_identifies_calibrated_match_probability",
  "one_hundred_percent_high_confidence_coverage_identifies_calibrated_confidence",
  "one_hundred_percent_calibrated_coverage_identifies_representative_independent_validation",
  "zero_published_ambiguity_identifies_complete_ambiguity_preservation_and_adjudication",
  "zero_published_abstentions_identifies_no_required_abstentions",
  "zero_published_false_match_rate_identifies_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_identifies_zero_true_false_negative_linkage",
  "deterministic_threshold_identifies_calibrated_uncertainty_and_abstention",
  "post_outcome_threshold_selection_identifies_precommitted_validation",
  "aggregate_calibration_identifies_subgroup_source_geography_language_identifier_quality_and_time_calibration",
  "highest_score_identifies_one_true_match",
  "force_resolved_multi_candidate_linkage_identifies_resolved_ambiguity",
  "clerical_review_identifies_independent_adjudication",
  "reviewer_agreement_identifies_correct_ground_truth",
  "linkage_derived_labels_identify_independent_ground_truth",
  "correlated_source_features_identify_independent_corroboration",
  "failed_negative_controls_or_falsification_identify_valid_confidence_after_threshold_selection",
  "historical_score_assurance_identifies_current_assurance_after_succession",
  "public_linkage_scores_calibrated_status_identifies_complete_current_correctable_authorized_evidence",
  "score_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = "complete_linkage_score_assurance_supported_in_at_least_one_world";
const WORLD_EXPECTATIONS = Object.fromEntries([
  {
    "world_id": "complete_linkage_score_assurance",
    "description": "Complete feature, model, independent-validation, probability-calibration, threshold, abstention, ambiguity, adjudication, falsification, subgroup-error, correction, and current-lineage assurance.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "complete_linkage_score_assurance",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "uncalibrated_scores_as_probabilities",
    "description": "Raw similarity or classifier scores are treated as calibrated probabilities without valid independent calibration evidence.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": false,
      "calibration_method_current": false,
      "calibration_sample_representative": false,
      "calibration_curve_complete": false,
      "proper_score_evidence_complete": false,
      "uncertainty_bounds_complete": false,
      "miscalibrated_pairs": 50,
      "overconfident_pairs": 40,
      "underconfident_pairs": 30
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "uncalibrated_score_probability_substitution",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": false,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "post_outcome_threshold_and_abstention_collapse",
    "description": "Thresholds are selected after outcome inspection and collapse uncertainty, sensitivity, and abstention margins.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": false,
      "threshold_basis_complete": false,
      "threshold_sensitivity_complete": false,
      "abstention_policy_complete": false,
      "uncertainty_margin_preserved": false,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 50,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "post_outcome_threshold_selection_and_abstention_collapse",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": false,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "force_resolved_multi_candidate_ambiguity",
    "description": "One-to-many, many-to-one, and many-to-many ambiguity is force-resolved to the highest score.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": false,
      "multi_candidate_sets_preserved": false,
      "retained_alternatives_complete": false,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 40,
      "force_resolved_pairs": 40
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "force_resolved_multi_candidate_ambiguity",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": false,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "conflicted_clerical_adjudication",
    "description": "Clerical review is incomplete, conflicted, nonindependent, or disagreement-suppressing.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": false,
      "reviewer_independence_complete": false,
      "reviewer_conflicts_complete": false,
      "disagreement_preserved": false,
      "appeal_and_reversal_complete": false,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 30,
      "reviewer_disagreements": 20,
      "reviewer_conflicted_pairs": 15,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "incomplete_conflicted_nonindependent_adjudication",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": false,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "circular_ground_truth_and_correlated_features",
    "description": "Label leakage, circular ground truth, and correlated source features inflate apparent confidence.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": false,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 40
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": false,
      "label_leakage_audit_complete": false,
      "circularity_audit_complete": false,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 30,
      "circular_ground_truth_pairs": 25
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "label_leakage_circular_ground_truth_and_correlated_features",
    "expected_flags": {
      "complete_feature_and_model_assurance": false,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": false,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "aggregate_calibration_and_failed_controls",
    "description": "Aggregate calibration masks subgroup, source, geography, language, identifier-quality, and time-specific error while negative controls or falsification fail.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": false,
      "falsification_complete": false,
      "subgroup_calibration_complete": false,
      "source_calibration_complete": false,
      "geography_language_identifier_quality_time_calibration_complete": false,
      "false_positive_links": 30,
      "false_negative_links": 25,
      "subgroup_miscalibrated_pairs": 40,
      "negative_control_failures": 20,
      "falsification_failures": 20
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "recalibration_complete": true,
      "threshold_rollback_complete": true,
      "correction_complete": true,
      "certificate_history_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_score_decisions": 0,
      "unsupported_score_decisions": 0
    },
    "expected_mechanism": "subgroup_calibration_error_and_failed_controls",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": false,
      "current_linkage_score_lineage_assurance": true,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "stale_linkage_score_lineage",
    "description": "Historical score assurance is inherited after feature, model, label, threshold, reviewer, population, workflow, policy, or release succession.",
    "feature_model": {
      "feature_identity_complete": true,
      "feature_source_provenance_complete": true,
      "feature_transform_lineage_complete": true,
      "feature_dependence_audited": true,
      "score_model_current": true,
      "training_data_current": true,
      "validation_data_independent": true,
      "model_reproducible": true,
      "correlated_feature_pairs": 0
    },
    "calibration": {
      "raw_score_semantics_explicit": true,
      "probability_interpretation_supported": true,
      "calibration_method_current": true,
      "calibration_sample_representative": true,
      "calibration_curve_complete": true,
      "proper_score_evidence_complete": true,
      "uncertainty_bounds_complete": true,
      "miscalibrated_pairs": 0,
      "overconfident_pairs": 0,
      "underconfident_pairs": 0
    },
    "threshold_ambiguity": {
      "threshold_precommitted": true,
      "threshold_basis_complete": true,
      "threshold_sensitivity_complete": true,
      "abstention_policy_complete": true,
      "uncertainty_margin_preserved": true,
      "ambiguity_preserved": true,
      "multi_candidate_sets_preserved": true,
      "retained_alternatives_complete": true,
      "threshold_sensitive_pairs": 0,
      "hidden_ambiguous_pairs": 0,
      "force_resolved_pairs": 0
    },
    "adjudication_ground_truth": {
      "review_complete": true,
      "reviewer_independence_complete": true,
      "reviewer_conflicts_complete": true,
      "disagreement_preserved": true,
      "appeal_and_reversal_complete": true,
      "ground_truth_independent": true,
      "label_leakage_audit_complete": true,
      "circularity_audit_complete": true,
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0
    },
    "controls_subgroups": {
      "known_match_controls_complete": true,
      "known_nonmatch_controls_complete": true,
      "negative_controls_complete": true,
      "falsification_complete": true,
      "subgroup_calibration_complete": true,
      "source_calibration_complete": true,
      "geography_language_identifier_quality_time_calibration_complete": true,
      "false_positive_links": 0,
      "false_negative_links": 0,
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0
    },
    "governance": {
      "current_lineage": false,
      "monitoring_complete": false,
      "recalibration_complete": false,
      "threshold_rollback_complete": false,
      "correction_complete": false,
      "certificate_history_complete": false,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_score_decisions": 100,
      "unsupported_score_decisions": 700
    },
    "expected_mechanism": "stale_inherited_linkage_score_assurance",
    "expected_flags": {
      "complete_feature_and_model_assurance": true,
      "complete_probability_calibration_assurance": true,
      "complete_threshold_abstention_and_ambiguity_assurance": true,
      "complete_adjudication_and_ground_truth_assurance": true,
      "complete_falsification_and_subgroup_error_assurance": true,
      "current_linkage_score_lineage_assurance": false,
      "complete_linkage_score_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
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
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function deriveFlags(world) {
  const feature = object(world?.feature_model);
  const calibration = object(world?.calibration);
  const threshold = object(world?.threshold_ambiguity);
  const adjudication = object(world?.adjudication_ground_truth);
  const controls = object(world?.controls_subgroups);
  const governance = object(world?.governance);
  const completeFeature = [
    feature.feature_identity_complete,
    feature.feature_source_provenance_complete,
    feature.feature_transform_lineage_complete,
    feature.feature_dependence_audited,
    feature.score_model_current,
    feature.training_data_current,
    feature.validation_data_independent,
    feature.model_reproducible
  ].every(Boolean);
  const completeCalibration = [
    calibration.raw_score_semantics_explicit,
    calibration.probability_interpretation_supported,
    calibration.calibration_method_current,
    calibration.calibration_sample_representative,
    calibration.calibration_curve_complete,
    calibration.proper_score_evidence_complete,
    calibration.uncertainty_bounds_complete
  ].every(Boolean);
  const completeThreshold = [
    threshold.threshold_precommitted,
    threshold.threshold_basis_complete,
    threshold.threshold_sensitivity_complete,
    threshold.abstention_policy_complete,
    threshold.uncertainty_margin_preserved,
    threshold.ambiguity_preserved,
    threshold.multi_candidate_sets_preserved,
    threshold.retained_alternatives_complete
  ].every(Boolean);
  const completeAdjudication = [
    adjudication.review_complete,
    adjudication.reviewer_independence_complete,
    adjudication.reviewer_conflicts_complete,
    adjudication.disagreement_preserved,
    adjudication.appeal_and_reversal_complete,
    adjudication.ground_truth_independent,
    adjudication.label_leakage_audit_complete,
    adjudication.circularity_audit_complete
  ].every(Boolean);
  const completeControls = [
    controls.known_match_controls_complete,
    controls.known_nonmatch_controls_complete,
    controls.negative_controls_complete,
    controls.falsification_complete,
    controls.subgroup_calibration_complete,
    controls.source_calibration_complete,
    controls.geography_language_identifier_quality_time_calibration_complete
  ].every(Boolean);
  const currentLineage = [
    governance.current_lineage,
    governance.monitoring_complete,
    governance.recalibration_complete,
    governance.threshold_rollback_complete,
    governance.correction_complete,
    governance.certificate_history_complete,
    governance.public_claim_supported
  ].every(Boolean);
  return {
    complete_feature_and_model_assurance: completeFeature,
    complete_probability_calibration_assurance: completeCalibration,
    complete_threshold_abstention_and_ambiguity_assurance: completeThreshold,
    complete_adjudication_and_ground_truth_assurance: completeAdjudication,
    complete_falsification_and_subgroup_error_assurance: completeControls,
    current_linkage_score_lineage_assurance: currentLineage,
    complete_linkage_score_assurance: completeFeature && completeCalibration && completeThreshold && completeAdjudication && completeControls && currentLineage,
    binding_public_authority_supported: governance.binding_public_authority === true,
    real_world_effect_claimed: false,
    graph_effect_present: false,
    preference_change_present: false,
    manipulative_intent_inferable: false
  };
}

function mechanismFor(world, flags) {
  if (flags.complete_linkage_score_assurance) return 'complete_linkage_score_assurance';
  if (!flags.complete_probability_calibration_assurance) return 'uncalibrated_score_probability_substitution';
  if (!flags.complete_threshold_abstention_and_ambiguity_assurance) {
    if (world?.threshold_ambiguity?.force_resolved_pairs > 0) return 'force_resolved_multi_candidate_ambiguity';
    return 'post_outcome_threshold_selection_and_abstention_collapse';
  }
  if (!flags.complete_adjudication_and_ground_truth_assurance) {
    if (world?.adjudication_ground_truth?.leaked_label_pairs > 0 || world?.adjudication_ground_truth?.circular_ground_truth_pairs > 0) return 'label_leakage_circular_ground_truth_and_correlated_features';
    return 'incomplete_conflicted_nonindependent_adjudication';
  }
  if (!flags.complete_feature_and_model_assurance) return 'label_leakage_circular_ground_truth_and_correlated_features';
  if (!flags.complete_falsification_and_subgroup_error_assurance) return 'subgroup_calibration_error_and_failed_controls';
  if (!flags.current_linkage_score_lineage_assurance) return 'stale_inherited_linkage_score_assurance';
  return 'unsupported_linkage_score_assurance';
}

function custodyChain(fixture, world, flags, publicSignature, governanceSignature, mechanism) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id: `${world.world_id}:public`, event_type: 'linkage_score_publication_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'linkage_score_control_compiler', source_event_ids: [], payload: { fixture_id: fixture.fixture_id, baseline: fixture.baseline, public_status_signature_sha256: publicSignature } });
  push({ event_id: `${world.world_id}:feature`, event_type: 'feature_model_validation_and_reproducibility_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:public`], payload: world.feature_model });
  push({ event_id: `${world.world_id}:calibration`, event_type: 'score_probability_calibration_and_uncertainty_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:feature`], payload: world.calibration });
  push({ event_id: `${world.world_id}:threshold`, event_type: 'threshold_abstention_ambiguity_and_retained_alternative_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:calibration`], payload: world.threshold_ambiguity });
  push({ event_id: `${world.world_id}:adjudication`, event_type: 'clerical_adjudication_ground_truth_leakage_and_circularity_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:threshold`], payload: world.adjudication_ground_truth });
  push({ event_id: `${world.world_id}:controls`, event_type: 'negative_control_falsification_subgroup_and_error_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:adjudication`], payload: world.controls_subgroups });
  push({ event_id: `${world.world_id}:lineage`, event_type: 'score_lineage_monitoring_recalibration_correction_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:controls`], payload: world.governance });
  push({ event_id: `${world.world_id}:flags`, event_type: 'linkage_score_assurance_flags_derived', evidence_class: 'deterministic_derivation', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:lineage`], payload: flags });
  push({ event_id: `${world.world_id}:mechanism`, event_type: 'linkage_score_governance_mechanism_classified', evidence_class: 'deterministic_classification', authority: 'linkage_score_control_compiler', source_event_ids: [`${world.world_id}:flags`], payload: { mechanism, linkage_score_governance_signature_sha256: governanceSignature, graph_effect: 'none' } });
  return events;
}

const COUNT_FIELDS = [
  ['feature_model', 'correlated_feature_pairs', 'total_correlated_feature_pairs'],
  ['calibration', 'miscalibrated_pairs', 'total_miscalibrated_pairs'],
  ['calibration', 'overconfident_pairs', 'total_overconfident_pairs'],
  ['calibration', 'underconfident_pairs', 'total_underconfident_pairs'],
  ['threshold_ambiguity', 'threshold_sensitive_pairs', 'total_threshold_sensitive_pairs'],
  ['threshold_ambiguity', 'hidden_ambiguous_pairs', 'total_hidden_ambiguous_pairs'],
  ['threshold_ambiguity', 'force_resolved_pairs', 'total_force_resolved_pairs'],
  ['adjudication_ground_truth', 'unreviewed_pairs', 'total_unreviewed_pairs'],
  ['adjudication_ground_truth', 'reviewer_disagreements', 'total_reviewer_disagreements'],
  ['adjudication_ground_truth', 'reviewer_conflicted_pairs', 'total_reviewer_conflicted_pairs'],
  ['adjudication_ground_truth', 'leaked_label_pairs', 'total_leaked_label_pairs'],
  ['adjudication_ground_truth', 'circular_ground_truth_pairs', 'total_circular_ground_truth_pairs'],
  ['controls_subgroups', 'false_positive_links', 'total_false_positive_links'],
  ['controls_subgroups', 'false_negative_links', 'total_false_negative_links'],
  ['controls_subgroups', 'subgroup_miscalibrated_pairs', 'total_subgroup_miscalibrated_pairs'],
  ['controls_subgroups', 'negative_control_failures', 'total_negative_control_failures'],
  ['controls_subgroups', 'falsification_failures', 'total_falsification_failures'],
  ['governance', 'stale_score_decisions', 'total_stale_score_decisions'],
  ['governance', 'unsupported_score_decisions', 'total_unsupported_score_decisions']
];

function metricsFor(worlds) {
  const metrics = {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature_sha256)).size,
    distinct_linkage_score_governance_signatures: new Set(worlds.map(world => world.linkage_score_governance_signature_sha256)).size,
    complete_linkage_score_assurance_worlds: worlds.filter(world => world.flags.complete_linkage_score_assurance).length,
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority).length
  };
  for (const [section, field, metric] of COUNT_FIELDS) metrics[metric] = worlds.reduce((sum, world) => sum + Number(world?.[section]?.[field] ?? 0), 0);
  return Object.fromEntries(Object.keys(EXPECTED_LINKAGE_SCORE_METRICS).map(key => [key, metrics[key]]));
}

export function validatePreferenceLinkageScoreCalibrationAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_LINKAGE_SCORE_CALIBRATION_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== "same-linkage-scores-calibrated-status-different-operational-states-v1" || fixture?.issue !== 918 || fixture?.parent_program_issue !== 594) errors.push('fixture identity or issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('fixture status or graph effect mismatch');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture thesis evidence', errors);
  if (stable(fixture?.baseline) !== stable(BASELINE)) errors.push('fixture public surface mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(fixture?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('fixture refusal-rule ledger mismatch');
  const expectedClassificationKeys = [...FALSE_CLASSIFICATIONS, TRUE_CLASSIFICATION];
  if (!sameMembers(Object.keys(object(fixture?.expected_classification)), expectedClassificationKeys)) errors.push('fixture classification key ledger mismatch');
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `fixture classification.${key}`, errors);
  if (fixture?.expected_classification?.[TRUE_CLASSIFICATION] !== true) errors.push('fixture complete assurance path missing');
  const worlds = array(fixture?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('fixture world denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`unexpected world: ${worldId || '<blank>'}`); continue; }
    if (!text(world.description)) errors.push(`${worldId} description missing`);
    for (const section of ['feature_model', 'calibration', 'threshold_ambiguity', 'adjudication_ground_truth', 'controls_subgroups', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} ${section} contract mismatch`);
    if (world?.expected_mechanism !== expected.expected_mechanism) errors.push(`${worldId} mechanism contract mismatch`);
    const derived = deriveFlags(world);
    if (stable(world?.expected_flags) !== stable(derived)) errors.push(`${worldId} expected flags mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_linkage_score_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete linkage-score assurance world is required');
  return errors;
}

export function compilePreferenceLinkageScoreCalibrationAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageScoreCalibrationAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid linkage-score fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = {
      feature_model: world.feature_model,
      calibration: world.calibration,
      threshold_ambiguity: world.threshold_ambiguity,
      adjudication_ground_truth: world.adjudication_ground_truth,
      controls_subgroups: world.controls_subgroups,
      governance: world.governance
    };
    const governanceSignature = sha256(provenance);
    const mechanism = mechanismFor(world, flags);
    const chain = custodyChain(fixture, world, flags, publicSignature, governanceSignature, mechanism);
    return {
      world_id: world.world_id,
      description: world.description,
      feature_model: world.feature_model,
      calibration: world.calibration,
      threshold_ambiguity: world.threshold_ambiguity,
      adjudication_ground_truth: world.adjudication_ground_truth,
      controls_subgroups: world.controls_subgroups,
      governance: world.governance,
      flags,
      mechanism,
      public_status_signature_sha256: publicSignature,
      linkage_score_governance_signature_sha256: governanceSignature,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1).event_sha256
    };
  });
  return {
    schema_version: PREFERENCE_LINKAGE_SCORE_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_linkage_score_calibration_control_qualified',
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
  const chain = array(world?.custody_chain);
  const expectedTypes = [
    'linkage_score_publication_surface_frozen',
    'feature_model_validation_and_reproducibility_state',
    'score_probability_calibration_and_uncertainty_state',
    'threshold_abstention_ambiguity_and_retained_alternative_state',
    'clerical_adjudication_ground_truth_leakage_and_circularity_state',
    'negative_control_falsification_subgroup_and_error_state',
    'score_lineage_monitoring_recalibration_correction_and_authority_state',
    'linkage_score_assurance_flags_derived',
    'linkage_score_governance_mechanism_classified'
  ];
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

export function validatePreferenceLinkageScoreCalibrationAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_LINKAGE_SCORE_CALIBRATION_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== "same-linkage-scores-calibrated-status-different-operational-states-v1" || build?.issue !== 918 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_linkage_score_calibration_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors);
  requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceLinkageScoreCalibrationAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceLinkageScoreCalibrationAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`build unexpected world: ${worldId || '<blank>'}`); continue; }
    for (const section of ['feature_model', 'calibration', 'threshold_ambiguity', 'adjudication_ground_truth', 'controls_subgroups', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} build ${section} mismatch`);
    const derived = deriveFlags(world);
    if (stable(world?.flags) !== stable(derived)) errors.push(`${worldId} build flags mismatch`);
    if (world?.public_status_signature_sha256 !== sha256(BASELINE)) errors.push(`${worldId} public signature mismatch`);
    const provenance = { feature_model: world.feature_model, calibration: world.calibration, threshold_ambiguity: world.threshold_ambiguity, adjudication_ground_truth: world.adjudication_ground_truth, controls_subgroups: world.controls_subgroups, governance: world.governance };
    if (world?.linkage_score_governance_signature_sha256 !== sha256(provenance)) errors.push(`${worldId} governance signature mismatch`);
    if (world?.mechanism !== mechanismFor({ ...expected, ...world }, derived)) errors.push(`${worldId} mechanism mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_SCORE_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.[TRUE_CLASSIFICATION] !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceLinkageScoreCalibrationAssuranceMarkdown(build) {
  const lines = [
    '# Linkage-score calibration, threshold, abstention, ambiguity, adjudication, and error custody',
    '',
    `**Status:** ${build.status}`,
    '',
    `**Worlds:** ${build.metrics.world_count}`,
    '',
    `**Public status signatures:** ${build.metrics.distinct_public_status_signatures}`,
    '',
    `**Governance signatures:** ${build.metrics.distinct_linkage_score_governance_signatures}`,
    '',
    '> A complete-looking linkage-score publication does not identify calibrated probabilities, representative independent validation, precommitted thresholds, uncertainty-preserving abstention, ambiguity preservation, independent adjudication, falsification, subgroup calibration, current correction, or authority custody.',
    '',
    '## Deterministic burden surface',
    ''
  ];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, match probability, calibration or error estimate, exposure trajectory, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
