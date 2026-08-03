import { createHash } from 'node:crypto';

export const PREFERENCE_CANDIDATE_PAIR_BLOCKING_RECALL_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-candidate-pair-blocking-recall-assurance-fixture@1';
export const PREFERENCE_CANDIDATE_PAIR_BLOCKING_RECALL_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-candidate-pair-blocking-recall-assurance-build@1';
export const EXPECTED_CANDIDATE_SEARCH_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_candidate_search_governance_signatures": 8,
  "complete_candidate_search_assurance_worlds": 1,
  "total_eligible_pairs_omitted": 60,
  "total_source_combination_pairs_omitted": 40,
  "total_blocking_false_negatives": 35,
  "total_normalization_excluded_pairs": 30,
  "total_rare_value_pairs_omitted": 20,
  "total_partition_pruned_pairs": 45,
  "total_window_topk_pruned_pairs": 40,
  "total_candidate_cap_pruned_pairs": 40,
  "total_resource_budget_pruned_pairs": 30,
  "total_early_stopped_pairs": 25,
  "total_unreviewed_omitted_pairs": 25,
  "total_force_classified_nonmatch_pairs": 20,
  "total_alternate_search_recovered_pairs": 30,
  "total_missed_true_matches": 55,
  "total_biased_recall_audit_pairs": 40,
  "total_circular_label_audit_pairs": 30,
  "total_subgroup_recall_failures": 40,
  "total_failed_alternate_search_controls": 20,
  "total_failed_falsification_controls": 20,
  "total_stale_candidate_search_decisions": 100,
  "total_unsupported_candidate_search_decisions": 700,
  "binding_public_authority_worlds": 0
};
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "source_systems": 4,
  "source_records": 100,
  "published_eligible_pairs": 100,
  "published_candidate_pairs": 100,
  "published_blocking_recall_pct": 100,
  "published_omitted_pairs": 0,
  "published_missed_matches": 0,
  "public_candidate_search_status": "candidate_search_verified",
  "approved_use": "longitudinal_exposure_estimation"
};
const REQUIRED_REFUSAL_RULES = [
  "one_hundred_published_eligible_pairs_is_not_the_complete_eligible_cross_source_pair_universe",
  "one_hundred_published_candidate_pairs_is_not_the_complete_candidate_pair_search_space",
  "one_hundred_percent_published_blocking_recall_is_not_complete_true_blocking_recall",
  "zero_published_omitted_pairs_is_not_zero_hidden_eligible_pair_omissions",
  "zero_published_missed_matches_is_not_zero_true_missed_matches",
  "four_source_systems_is_not_complete_source_system_combination_coverage",
  "deterministic_blocking_keys_are_not_recall_preservation",
  "normalization_is_not_rare_noisy_transliterated_versioned_or_missing_identifier_coverage",
  "partition_canopy_window_or_top_k_selection_is_not_complete_candidate_recall",
  "candidate_caps_resource_budgets_cost_heuristics_or_early_stopping_are_not_admissible_pruning_without_recall_custody",
  "an_omitted_pair_ledger_is_not_complete_independent_missed_match_review",
  "force_classifying_unreviewed_omitted_pairs_as_nonmatches_is_not_adjudication",
  "aggregate_recall_is_not_subgroup_source_pair_geography_or_time_specific_recall",
  "labels_derived_from_the_candidate_rule_are_not_independent_recall_ground_truth",
  "alternate_search_recovery_is_not_complete_search_assurance_when_controls_or_falsification_fail",
  "historical_candidate_search_assurance_is_not_current_after_source_schema_rule_population_workflow_policy_or_release_succession",
  "public_candidate_search_verified_status_is_not_complete_current_correctable_or_authorized_evidence",
  "candidate_search_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const FALSE_CLASSIFICATIONS = [
  "one_hundred_published_eligible_pairs_identifies_complete_eligible_pair_universe",
  "one_hundred_published_candidate_pairs_identifies_complete_search_space",
  "one_hundred_percent_published_blocking_recall_identifies_true_blocking_recall",
  "zero_published_omitted_pairs_identifies_zero_hidden_omissions",
  "zero_published_missed_matches_identifies_zero_true_missed_matches",
  "four_source_systems_identifies_complete_source_combination_coverage",
  "deterministic_blocking_keys_identify_recall_preservation",
  "normalization_pipeline_identifies_rare_noisy_transliterated_versioned_and_missing_identifier_coverage",
  "partition_canopy_window_or_top_k_rule_identifies_complete_candidate_recall",
  "candidate_cap_budget_cost_or_early_stop_identifies_admissible_pruning",
  "omitted_pair_ledger_identifies_complete_independent_review",
  "force_classified_nonmatches_identify_adjudicated_omissions",
  "aggregate_recall_identifies_subgroup_source_pair_geography_and_time_recall",
  "candidate_rule_labels_identify_independent_recall_ground_truth",
  "alternate_search_recovery_identifies_complete_search_assurance",
  "failed_falsification_identifies_valid_search_after_rule_selection",
  "historical_candidate_search_assurance_identifies_current_assurance_after_succession",
  "public_candidate_search_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "candidate_search_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = "complete_candidate_search_assurance_supported_in_at_least_one_world";
const WORLD_EXPECTATIONS = Object.fromEntries([
  {
    "world_id": "complete_candidate_search_assurance",
    "description": "Complete eligible-pair universe, source-combination, blocking, partition, resource, recall-audit, alternate-search, correction, and current-lineage assurance.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 0,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": true,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 0
    },
    "expected_mechanism": "complete_candidate_search_assurance",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": true,
      "current_candidate_search_lineage_assurance": true,
      "complete_candidate_search_assurance": true,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "eligible_pair_universe_truncation",
    "description": "Eligible-pair denominator and source-system combinations are truncated while complete coverage is published.",
    "universe": {
      "eligible_pair_universe_complete": false,
      "source_combination_coverage_complete": false,
      "exclusion_ledger_complete": false,
      "omitted_eligible_pairs": 60,
      "omitted_source_combination_pairs": 40
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 20,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "eligible_pair_universe_and_source_combination_truncation",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": false,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "blocking_key_and_normalization_exclusion",
    "description": "Blocking keys and normalization exclude rare, noisy, transliterated, versioned, or missing identifiers.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": false,
      "normalization_complete": false,
      "rare_value_coverage_complete": false,
      "blocking_false_negatives": 35,
      "normalization_excluded_pairs": 30,
      "rare_value_pairs_omitted": 20
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 20,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "blocking_key_normalization_and_rare_value_false_negative",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": false,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "partition_window_and_topk_pruning",
    "description": "Partition, canopy, sorted-neighborhood, window, and top-k rules prune true candidate pairs.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": false,
      "window_topk_recall_complete": false,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 45,
      "window_topk_pruned_pairs": 40,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 5,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "partition_window_and_topk_recall_truncation",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": false,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "candidate_cap_budget_and_early_stop_pruning",
    "description": "Candidate caps, resource budgets, cost heuristics, and early stopping silently remove plausible pairs.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": false,
      "resource_budget_recall_complete": false,
      "early_stop_disabled_or_audited": false,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 40,
      "resource_budget_pruned_pairs": 30,
      "early_stopped_pairs": 25
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 5,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "candidate_cap_resource_budget_and_early_stop_pruning",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": false,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "omitted_pair_audit_and_force_nonmatch_failure",
    "description": "Omitted-pair and missed-match audits are incomplete, unreviewed, or force-classified as nonmatches.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": false,
      "missed_match_audit_complete": false,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 25,
      "force_classified_nonmatch_pairs": 20,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 5,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "incomplete_omitted_pair_audit_and_force_nonmatch_classification",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "biased_circular_recall_audit_and_failed_controls",
    "description": "Recall estimates use circular labels, biased samples, aggregate calibration, or failed alternate-search and falsification controls.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": true,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": false,
      "audit_sample_representative": false,
      "alternate_search_complete": false,
      "falsification_complete": false,
      "subgroup_recall_complete": false,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 30,
      "missed_true_matches": 0,
      "biased_recall_audit_pairs": 40,
      "circular_label_audit_pairs": 30,
      "subgroup_recall_failures": 40,
      "failed_alternate_search_controls": 20,
      "failed_falsification_controls": 20
    },
    "governance": {
      "current_lineage": true,
      "monitoring_complete": true,
      "correction_complete": true,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 0,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "biased_circular_recall_audit_with_failed_alternate_search_and_falsification",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": true,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": false,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
      "binding_public_authority_supported": false,
      "real_world_effect_claimed": false,
      "graph_effect_present": false,
      "preference_change_present": false,
      "manipulative_intent_inferable": false
    }
  },
  {
    "world_id": "stale_candidate_search_lineage",
    "description": "Historical candidate-search assurance is inherited after source, schema, rule, population, workflow, policy, and release succession.",
    "universe": {
      "eligible_pair_universe_complete": true,
      "source_combination_coverage_complete": true,
      "exclusion_ledger_complete": true,
      "omitted_eligible_pairs": 0,
      "omitted_source_combination_pairs": 0
    },
    "blocking": {
      "blocking_rule_current": false,
      "blocking_keys_complete": true,
      "normalization_complete": true,
      "rare_value_coverage_complete": true,
      "blocking_false_negatives": 0,
      "normalization_excluded_pairs": 0,
      "rare_value_pairs_omitted": 0
    },
    "partitioning": {
      "partition_recall_complete": true,
      "window_topk_recall_complete": true,
      "candidate_cap_recall_complete": true,
      "resource_budget_recall_complete": true,
      "early_stop_disabled_or_audited": true,
      "partition_pruned_pairs": 0,
      "window_topk_pruned_pairs": 0,
      "candidate_cap_pruned_pairs": 0,
      "resource_budget_pruned_pairs": 0,
      "early_stopped_pairs": 0
    },
    "audit": {
      "omitted_pair_audit_complete": true,
      "missed_match_audit_complete": true,
      "audit_labels_independent": true,
      "audit_sample_representative": true,
      "alternate_search_complete": true,
      "falsification_complete": true,
      "subgroup_recall_complete": true,
      "unreviewed_omitted_pairs": 0,
      "force_classified_nonmatch_pairs": 0,
      "alternate_search_recovered_pairs": 0,
      "missed_true_matches": 0,
      "biased_recall_audit_pairs": 0,
      "circular_label_audit_pairs": 0,
      "subgroup_recall_failures": 0,
      "failed_alternate_search_controls": 0,
      "failed_falsification_controls": 0
    },
    "governance": {
      "current_lineage": false,
      "monitoring_complete": false,
      "correction_complete": false,
      "public_claim_supported": false,
      "binding_public_authority": false,
      "stale_candidate_search_decisions": 100,
      "unsupported_candidate_search_decisions": 100
    },
    "expected_mechanism": "stale_candidate_search_lineage_and_inherited_assurance",
    "expected_flags": {
      "complete_eligible_pair_universe_assurance": true,
      "complete_blocking_recall_assurance": false,
      "complete_partition_and_resource_recall_assurance": true,
      "complete_missed_match_audit_and_control_assurance": true,
      "current_candidate_search_lineage_assurance": false,
      "complete_candidate_search_assurance": false,
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
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sameMembers = (left, right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
const sum = (worlds, section, key) => worlds.reduce((total, world) => total + Number(world?.[section]?.[key] ?? 0), 0);
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function deriveFlags(world) {
  const universe = object(world?.universe);
  const blocking = object(world?.blocking);
  const partitioning = object(world?.partitioning);
  const audit = object(world?.audit);
  const governance = object(world?.governance);
  const completeEligiblePairUniverse = universe.eligible_pair_universe_complete === true && universe.source_combination_coverage_complete === true && universe.exclusion_ledger_complete === true && universe.omitted_eligible_pairs === 0 && universe.omitted_source_combination_pairs === 0;
  const completeBlocking = blocking.blocking_rule_current === true && blocking.blocking_keys_complete === true && blocking.normalization_complete === true && blocking.rare_value_coverage_complete === true && blocking.blocking_false_negatives === 0 && blocking.normalization_excluded_pairs === 0 && blocking.rare_value_pairs_omitted === 0;
  const completePartition = partitioning.partition_recall_complete === true && partitioning.window_topk_recall_complete === true && partitioning.candidate_cap_recall_complete === true && partitioning.resource_budget_recall_complete === true && partitioning.early_stop_disabled_or_audited === true && partitioning.partition_pruned_pairs === 0 && partitioning.window_topk_pruned_pairs === 0 && partitioning.candidate_cap_pruned_pairs === 0 && partitioning.resource_budget_pruned_pairs === 0 && partitioning.early_stopped_pairs === 0;
  const completeAudit = audit.omitted_pair_audit_complete === true && audit.missed_match_audit_complete === true && audit.audit_labels_independent === true && audit.audit_sample_representative === true && audit.alternate_search_complete === true && audit.falsification_complete === true && audit.subgroup_recall_complete === true && audit.unreviewed_omitted_pairs === 0 && audit.force_classified_nonmatch_pairs === 0 && audit.missed_true_matches === 0 && audit.biased_recall_audit_pairs === 0 && audit.circular_label_audit_pairs === 0 && audit.subgroup_recall_failures === 0 && audit.failed_alternate_search_controls === 0 && audit.failed_falsification_controls === 0;
  const currentLineage = governance.current_lineage === true && governance.monitoring_complete === true && governance.correction_complete === true && governance.public_claim_supported === true && governance.stale_candidate_search_decisions === 0 && governance.unsupported_candidate_search_decisions === 0;
  const complete = completeEligiblePairUniverse && completeBlocking && completePartition && completeAudit && currentLineage && governance.binding_public_authority === false;
  return {
    complete_eligible_pair_universe_assurance: completeEligiblePairUniverse,
    complete_blocking_recall_assurance: completeBlocking,
    complete_partition_and_resource_recall_assurance: completePartition,
    complete_missed_match_audit_and_control_assurance: completeAudit,
    current_candidate_search_lineage_assurance: currentLineage,
    complete_candidate_search_assurance: complete,
    binding_public_authority_supported: false,
    real_world_effect_claimed: false,
    graph_effect_present: false,
    preference_change_present: false,
    manipulative_intent_inferable: false
  };
}

function mechanismFor(world, flags) {
  if (flags.complete_candidate_search_assurance) return 'complete_candidate_search_assurance';
  return text(world?.expected_mechanism);
}

function custodyChain(fixture, world, flags, publicSignature, governanceSignature, mechanism) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id: `${world.world_id}:public`, event_type: 'candidate_search_publication_surface_frozen', evidence_class: 'synthetic_public_surface', authority: 'candidate_search_control_compiler', source_event_ids: [], payload: { fixture_id: fixture.fixture_id, baseline: fixture.baseline, public_status_signature_sha256: publicSignature } });
  push({ event_id: `${world.world_id}:universe`, event_type: 'eligible_pair_universe_and_source_combination_state', evidence_class: 'synthetic_operational_state', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:public`], payload: world.universe });
  push({ event_id: `${world.world_id}:blocking`, event_type: 'blocking_key_normalization_and_rare_value_state', evidence_class: 'synthetic_operational_state', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:universe`], payload: world.blocking });
  push({ event_id: `${world.world_id}:partition`, event_type: 'partition_window_topk_cap_budget_and_early_stop_state', evidence_class: 'synthetic_operational_state', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:blocking`], payload: world.partitioning });
  push({ event_id: `${world.world_id}:audit`, event_type: 'omitted_pair_missed_match_alternate_search_and_falsification_state', evidence_class: 'synthetic_operational_state', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:partition`], payload: world.audit });
  push({ event_id: `${world.world_id}:lineage`, event_type: 'candidate_search_lineage_monitoring_correction_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:audit`], payload: world.governance });
  push({ event_id: `${world.world_id}:flags`, event_type: 'candidate_search_assurance_flags_derived', evidence_class: 'deterministic_derivation', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:lineage`], payload: flags });
  push({ event_id: `${world.world_id}:mechanism`, event_type: 'candidate_search_governance_mechanism_classified', evidence_class: 'deterministic_classification', authority: 'candidate_search_control_compiler', source_event_ids: [`${world.world_id}:flags`], payload: { mechanism, candidate_search_governance_signature_sha256: governanceSignature, graph_effect: 'none' } });
  return events;
}

function metricsFor(worlds) {
  const publicSignatures = new Set(worlds.map(world => world.public_status_signature_sha256));
  const governanceSignatures = new Set(worlds.map(world => world.candidate_search_governance_signature_sha256));
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: publicSignatures.size,
    distinct_candidate_search_governance_signatures: governanceSignatures.size,
    complete_candidate_search_assurance_worlds: worlds.filter(world => world.flags.complete_candidate_search_assurance).length,
    total_eligible_pairs_omitted: sum(worlds, 'universe', 'omitted_eligible_pairs'),
    total_source_combination_pairs_omitted: sum(worlds, 'universe', 'omitted_source_combination_pairs'),
    total_blocking_false_negatives: sum(worlds, 'blocking', 'blocking_false_negatives'),
    total_normalization_excluded_pairs: sum(worlds, 'blocking', 'normalization_excluded_pairs'),
    total_rare_value_pairs_omitted: sum(worlds, 'blocking', 'rare_value_pairs_omitted'),
    total_partition_pruned_pairs: sum(worlds, 'partitioning', 'partition_pruned_pairs'),
    total_window_topk_pruned_pairs: sum(worlds, 'partitioning', 'window_topk_pruned_pairs'),
    total_candidate_cap_pruned_pairs: sum(worlds, 'partitioning', 'candidate_cap_pruned_pairs'),
    total_resource_budget_pruned_pairs: sum(worlds, 'partitioning', 'resource_budget_pruned_pairs'),
    total_early_stopped_pairs: sum(worlds, 'partitioning', 'early_stopped_pairs'),
    total_unreviewed_omitted_pairs: sum(worlds, 'audit', 'unreviewed_omitted_pairs'),
    total_force_classified_nonmatch_pairs: sum(worlds, 'audit', 'force_classified_nonmatch_pairs'),
    total_alternate_search_recovered_pairs: sum(worlds, 'audit', 'alternate_search_recovered_pairs'),
    total_missed_true_matches: sum(worlds, 'audit', 'missed_true_matches'),
    total_biased_recall_audit_pairs: sum(worlds, 'audit', 'biased_recall_audit_pairs'),
    total_circular_label_audit_pairs: sum(worlds, 'audit', 'circular_label_audit_pairs'),
    total_subgroup_recall_failures: sum(worlds, 'audit', 'subgroup_recall_failures'),
    total_failed_alternate_search_controls: sum(worlds, 'audit', 'failed_alternate_search_controls'),
    total_failed_falsification_controls: sum(worlds, 'audit', 'failed_falsification_controls'),
    total_stale_candidate_search_decisions: sum(worlds, 'governance', 'stale_candidate_search_decisions'),
    total_unsupported_candidate_search_decisions: sum(worlds, 'governance', 'unsupported_candidate_search_decisions'),
    binding_public_authority_worlds: worlds.filter(world => world.governance.binding_public_authority === true).length
  };
}

export function validatePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_CANDIDATE_PAIR_BLOCKING_RECALL_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-candidate-search-verified-status-different-operational-states-v1' || fixture?.issue !== 907 || fixture?.parent_program_issue !== 594) errors.push('fixture identity or issue lineage mismatch');
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
    for (const section of ['universe', 'blocking', 'partitioning', 'audit', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} ${section} contract mismatch`);
    if (world?.expected_mechanism !== expected.expected_mechanism) errors.push(`${worldId} mechanism contract mismatch`);
    const derived = deriveFlags(world);
    if (stable(world?.expected_flags) !== stable(derived)) errors.push(`${worldId} expected flags mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_candidate_search_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete candidate-search assurance world is required');
  return errors;
}

export function compilePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture) {
  const errors = validatePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid candidate-search fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = { universe: world.universe, blocking: world.blocking, partitioning: world.partitioning, audit: world.audit, governance: world.governance };
    const governanceSignature = sha256(provenance);
    const mechanism = mechanismFor(world, flags);
    const chain = custodyChain(fixture, world, flags, publicSignature, governanceSignature, mechanism);
    return {
      world_id: world.world_id,
      description: world.description,
      universe: world.universe,
      blocking: world.blocking,
      partitioning: world.partitioning,
      audit: world.audit,
      governance: world.governance,
      flags,
      mechanism,
      public_status_signature_sha256: publicSignature,
      candidate_search_governance_signature_sha256: governanceSignature,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1).event_sha256
    };
  });
  return {
    schema_version: PREFERENCE_CANDIDATE_PAIR_BLOCKING_RECALL_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_candidate_pair_blocking_recall_control_qualified',
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
    'candidate_search_publication_surface_frozen',
    'eligible_pair_universe_and_source_combination_state',
    'blocking_key_normalization_and_rare_value_state',
    'partition_window_topk_cap_budget_and_early_stop_state',
    'omitted_pair_missed_match_alternate_search_and_falsification_state',
    'candidate_search_lineage_monitoring_correction_and_authority_state',
    'candidate_search_assurance_flags_derived',
    'candidate_search_governance_mechanism_classified'
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

export function validatePreferenceCandidatePairBlockingRecallAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_CANDIDATE_PAIR_BLOCKING_RECALL_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== 'same-candidate-search-verified-status-different-operational-states-v1' || build?.issue !== 907 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_candidate_pair_blocking_recall_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors);
  requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`build unexpected world: ${worldId || '<blank>'}`); continue; }
    for (const section of ['universe', 'blocking', 'partitioning', 'audit', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} build ${section} mismatch`);
    const derived = deriveFlags(world);
    if (stable(world?.flags) !== stable(derived)) errors.push(`${worldId} build flags mismatch`);
    if (world?.public_status_signature_sha256 !== sha256(BASELINE)) errors.push(`${worldId} public signature mismatch`);
    const provenance = { universe: world.universe, blocking: world.blocking, partitioning: world.partitioning, audit: world.audit, governance: world.governance };
    if (world?.candidate_search_governance_signature_sha256 !== sha256(provenance)) errors.push(`${worldId} governance signature mismatch`);
    if (world?.mechanism !== mechanismFor({ ...expected, ...world }, derived)) errors.push(`${worldId} mechanism mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_CANDIDATE_SEARCH_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.[TRUE_CLASSIFICATION] !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceCandidatePairBlockingRecallAssuranceMarkdown(build) {
  const lines = [
    '# Candidate-pair universe, blocking recall, search-space, and missed-match custody',
    '',
    `**Status:** ${build.status}`,
    '',
    `**Worlds:** ${build.metrics.world_count}`,
    '',
    `**Public status signatures:** ${build.metrics.distinct_public_status_signatures}`,
    '',
    `**Governance signatures:** ${build.metrics.distinct_candidate_search_governance_signatures}`,
    '',
    '> A complete-looking candidate-search publication does not identify a complete eligible-pair universe, blocking recall, partition recall, resource-safe pruning, independent missed-match audit, alternate-search falsification, correction, or authority custody.',
    '',
    '## Deterministic burden surface',
    ''
  ];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, candidate-pair recall estimate, match probability, exposure trajectory, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
