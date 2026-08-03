import { createHash } from 'node:crypto';

export const PREFERENCE_LINKAGE_CONFIDENCE_ADJUDICATION_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-linkage-confidence-adjudication-assurance-fixture@1';
export const PREFERENCE_LINKAGE_CONFIDENCE_ADJUDICATION_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-linkage-confidence-adjudication-assurance-build@1';

const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "source_systems": 4,
  "published_candidate_pairs": 100,
  "published_linked_pairs": 100,
  "published_linkage_coverage_pct": 100,
  "published_high_confidence_coverage_pct": 100,
  "published_ambiguous_pairs": 0,
  "published_unmatched_records": 0,
  "published_false_match_rate": 0,
  "published_missed_match_rate": 0,
  "public_confidence_status": "linkage_confidence_verified",
  "approved_use": "longitudinal_exposure_estimation"
};
const REQUIRED_REFUSAL_RULES = [
  "one_hundred_published_candidate_pairs_is_not_complete_candidate_pair_search_space",
  "one_hundred_percent_published_linkage_coverage_is_not_complete_blocking_recall_or_absence_of_hidden_missed_matches",
  "one_hundred_percent_high_confidence_coverage_is_not_calibrated_confidence",
  "zero_published_false_match_rate_is_not_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_is_not_zero_true_false_negative_linkage",
  "zero_published_ambiguous_pairs_is_not_complete_ambiguity_preservation_or_adjudication",
  "one_highest_score_is_not_one_true_match_when_competing_candidates_remain_plausible",
  "deterministic_threshold_is_not_calibrated_uncertainty_or_abstention_policy",
  "force_resolved_one_to_many_many_to_one_or_many_to_many_linkage_is_not_ambiguity_resolution",
  "clerical_review_is_not_independent_adjudication_when_reviewers_share_labels_incentives_rules_or_conflicts",
  "reviewer_agreement_is_not_correctness_when_shared_evidence_is_circular_or_contaminated",
  "training_or_validation_labels_derived_from_linkage_rule_are_not_independent_ground_truth",
  "correlated_source_features_are_not_independent_corroboration",
  "aggregate_calibration_is_not_subgroup_source_geography_or_time_specific_calibration",
  "negative_control_or_falsification_failure_cannot_be_converted_into_confidence_by_threshold_selection",
  "historical_confidence_assurance_is_not_current_after_source_rule_model_threshold_reviewer_population_workflow_policy_or_release_succession",
  "public_linkage_confidence_verified_status_is_not_complete_current_candidate_complete_calibrated_ambiguity_preserving_independently_adjudicated_falsified_correctable_or_authorized_evidence",
  "linkage_confidence_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_requires_separate_current_public_authorization_receipts"
];
const FALSE_CLASSIFICATIONS = [
  "one_hundred_published_candidate_pairs_identifies_complete_candidate_pair_search_space",
  "one_hundred_percent_linkage_coverage_identifies_complete_blocking_recall_and_zero_hidden_missed_matches",
  "one_hundred_percent_high_confidence_coverage_identifies_calibrated_confidence",
  "zero_published_false_match_rate_identifies_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_identifies_zero_true_false_negative_linkage",
  "zero_published_ambiguous_pairs_identifies_complete_ambiguity_preservation_and_adjudication",
  "highest_score_identifies_one_true_match",
  "deterministic_threshold_identifies_calibrated_uncertainty_and_abstention",
  "force_resolved_multi_candidate_linkage_identifies_resolved_ambiguity",
  "clerical_review_identifies_independent_adjudication",
  "reviewer_agreement_identifies_correct_ground_truth",
  "linkage_derived_labels_identify_independent_ground_truth",
  "correlated_source_features_identify_independent_corroboration",
  "aggregate_calibration_identifies_subgroup_source_geography_and_time_calibration",
  "failed_negative_controls_or_falsification_identify_valid_confidence_after_threshold_selection",
  "historical_confidence_assurance_identifies_current_assurance_after_succession",
  "public_linkage_confidence_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "linkage_confidence_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = 'complete_linkage_confidence_assurance_supported_in_at_least_one_world';
const WORLD_EXPECTATIONS = {
  "complete-candidate-generation-calibrated-confidence-ambiguity-adjudication-falsification-and-current-lineage-assurance": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 0,
      "stale_decisions": 0
    }
  },
  "blocking-and-search-space-truncation-omit-true-candidate-pairs": {
    "candidate_generation": {
      "omitted_candidate_pairs": 40,
      "blocking_false_negative_pairs": 30,
      "search_space_complete": false,
      "blocking_recall_validated": false,
      "alternate_blocking_test_complete": false
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "uncalibrated-match-scores-and-threshold-collapse-create-linkage-error": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 30,
      "false_negative_links": 25,
      "threshold_sensitive_pairs": 50,
      "score_calibration_complete": false,
      "abstention_policy_complete": false
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "multi-candidate-ambiguity-force-resolved-into-one-link": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 40,
      "force_resolved_pairs": 30,
      "many_to_many_links": 20,
      "retained_alternatives_complete": false
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "clerical-review-incomplete-conflicted-nonindependent-and-disagreement-suppressing": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 30,
      "reviewer_disagreements": 20,
      "reviewer_conflicted_pairs": 15,
      "independent_review_complete": false,
      "disagreement_ledger_complete": false
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "label-leakage-circular-ground-truth-and-correlated-source-features": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 30,
      "circular_ground_truth_pairs": 25,
      "correlated_feature_pairs": 40,
      "independent_ground_truth_complete": false
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "subgroup-error-negative-control-falsification-and-sensitivity-failure": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 40,
      "negative_control_failures": 20,
      "falsification_failures": 20,
      "subgroup_calibration_complete": false,
      "threshold_sensitivity_complete": false
    },
    "governance": {
      "current_lineage_complete": true,
      "correction_path_complete": true,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 0
    }
  },
  "historical-linkage-confidence-assurance-after-source-model-reviewer-and-release-succession": {
    "candidate_generation": {
      "omitted_candidate_pairs": 0,
      "blocking_false_negative_pairs": 0,
      "search_space_complete": true,
      "blocking_recall_validated": true,
      "alternate_blocking_test_complete": true
    },
    "scoring": {
      "false_positive_links": 0,
      "false_negative_links": 0,
      "threshold_sensitive_pairs": 0,
      "score_calibration_complete": true,
      "abstention_policy_complete": true
    },
    "ambiguity": {
      "ambiguous_pairs": 0,
      "force_resolved_pairs": 0,
      "many_to_many_links": 0,
      "retained_alternatives_complete": true
    },
    "adjudication": {
      "unreviewed_pairs": 0,
      "reviewer_disagreements": 0,
      "reviewer_conflicted_pairs": 0,
      "independent_review_complete": true,
      "disagreement_ledger_complete": true
    },
    "ground_truth": {
      "leaked_label_pairs": 0,
      "circular_ground_truth_pairs": 0,
      "correlated_feature_pairs": 0,
      "independent_ground_truth_complete": true
    },
    "falsification": {
      "subgroup_miscalibrated_pairs": 0,
      "negative_control_failures": 0,
      "falsification_failures": 0,
      "subgroup_calibration_complete": true,
      "threshold_sensitivity_complete": true
    },
    "governance": {
      "current_lineage_complete": false,
      "correction_path_complete": false,
      "binding_public_authority": false,
      "unsupported_decisions": 100,
      "stale_decisions": 100
    }
  }
};
const EXPECTED_WORLD_IDS = Object.keys(WORLD_EXPECTATIONS);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sum = (worlds, path) => worlds.reduce((total, world) => total + path.split('.').reduce((value, key) => value?.[key], world), 0);
const count = (worlds, predicate) => worlds.filter(predicate).length;
const sameMembers = (left, right) => stable([...new Set(array(left))].sort()) === stable([...new Set(array(right))].sort());
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };

function deriveFlags(world) {
  const candidate = object(world.candidate_generation);
  const scoring = object(world.scoring);
  const ambiguity = object(world.ambiguity);
  const adjudication = object(world.adjudication);
  const groundTruth = object(world.ground_truth);
  const falsification = object(world.falsification);
  const governance = object(world.governance);
  const flags = {
    candidate_generation_complete:
      candidate.omitted_candidate_pairs === 0 &&
      candidate.blocking_false_negative_pairs === 0 &&
      candidate.search_space_complete === true &&
      candidate.blocking_recall_validated === true &&
      candidate.alternate_blocking_test_complete === true,
    score_calibration_complete:
      scoring.false_positive_links === 0 &&
      scoring.false_negative_links === 0 &&
      scoring.threshold_sensitive_pairs === 0 &&
      scoring.score_calibration_complete === true &&
      scoring.abstention_policy_complete === true,
    ambiguity_preservation_complete:
      ambiguity.ambiguous_pairs === 0 &&
      ambiguity.force_resolved_pairs === 0 &&
      ambiguity.many_to_many_links === 0 &&
      ambiguity.retained_alternatives_complete === true,
    independent_adjudication_complete:
      adjudication.unreviewed_pairs === 0 &&
      adjudication.reviewer_conflicted_pairs === 0 &&
      adjudication.independent_review_complete === true &&
      adjudication.disagreement_ledger_complete === true,
    independent_ground_truth_complete:
      groundTruth.leaked_label_pairs === 0 &&
      groundTruth.circular_ground_truth_pairs === 0 &&
      groundTruth.correlated_feature_pairs === 0 &&
      groundTruth.independent_ground_truth_complete === true,
    falsification_complete:
      falsification.subgroup_miscalibrated_pairs === 0 &&
      falsification.negative_control_failures === 0 &&
      falsification.falsification_failures === 0 &&
      falsification.subgroup_calibration_complete === true &&
      falsification.threshold_sensitivity_complete === true,
    current_lineage_complete:
      governance.current_lineage_complete === true &&
      governance.correction_path_complete === true
  };
  flags.complete_linkage_confidence_assurance = Object.values(flags).every(Boolean);
  return flags;
}

function mechanismFor(world, flags) {
  if (flags.complete_linkage_confidence_assurance) return 'complete_linkage_confidence_ambiguity_adjudication_falsification_assurance';
  if (world.candidate_generation.omitted_candidate_pairs > 0) return 'candidate_pair_blocking_search_space_truncation';
  if (world.scoring.false_positive_links > 0 || world.scoring.false_negative_links > 0) return 'uncalibrated_score_threshold_collapse';
  if (world.ambiguity.force_resolved_pairs > 0) return 'multi_candidate_ambiguity_force_resolution';
  if (world.adjudication.unreviewed_pairs > 0 || world.adjudication.reviewer_conflicted_pairs > 0) return 'clerical_review_independence_conflict_and_disagreement_failure';
  if (world.ground_truth.leaked_label_pairs > 0 || world.ground_truth.circular_ground_truth_pairs > 0) return 'label_leakage_circular_ground_truth_and_correlated_features';
  if (world.falsification.negative_control_failures > 0 || world.falsification.falsification_failures > 0) return 'subgroup_calibration_negative_control_and_falsification_failure';
  return 'historical_confidence_assurance_after_succession';
}

function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function custodyChain(fixture, world, flags, publicSignature, provenanceSignature, mechanism) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  const id = fixture.fixture_id;
  const worldId = world.world_id;
  push({ event_id: `${id}:${worldId}:public`, event_type: 'linkage_confidence_publication_surface_frozen', evidence_class: 'synthetic_public_claim', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [], payload: { baseline: fixture.baseline, public_status_signature_sha256: publicSignature } });
  push({ event_id: `${id}:${worldId}:candidate`, event_type: 'candidate_generation_blocking_and_search_space_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:public`], payload: { candidate_generation: world.candidate_generation } });
  push({ event_id: `${id}:${worldId}:score`, event_type: 'linkage_score_calibration_threshold_and_abstention_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:candidate`], payload: { scoring: world.scoring } });
  push({ event_id: `${id}:${worldId}:ambiguity`, event_type: 'ambiguity_force_resolution_and_retained_alternatives_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:score`], payload: { ambiguity: world.ambiguity } });
  push({ event_id: `${id}:${worldId}:adjudication`, event_type: 'clerical_review_independence_disagreement_and_conflict_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:ambiguity`], payload: { adjudication: world.adjudication } });
  push({ event_id: `${id}:${worldId}:ground-truth`, event_type: 'ground_truth_label_leakage_circularity_and_source_dependence_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:adjudication`], payload: { ground_truth: world.ground_truth } });
  push({ event_id: `${id}:${worldId}:falsification`, event_type: 'negative_control_falsification_subgroup_and_threshold_sensitivity_state', evidence_class: 'synthetic_operational_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:ground-truth`], payload: { falsification: world.falsification } });
  push({ event_id: `${id}:${worldId}:governance`, event_type: 'lineage_correction_monitoring_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:falsification`], payload: { governance: world.governance } });
  push({ event_id: `${id}:${worldId}:flags`, event_type: 'linkage_confidence_assurance_flags_derived', evidence_class: 'deterministic_derived_state', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:governance`], payload: { flags, provenance_signature_sha256: provenanceSignature } });
  push({ event_id: `${id}:${worldId}:mechanism`, event_type: 'linkage_confidence_governance_mechanism_classified', evidence_class: 'synthetic_control_classification', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${id}:${worldId}:flags`], payload: { mechanism, graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

function metricsFor(worlds) {
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature_sha256)).size,
    distinct_linkage_confidence_governance_signatures: new Set(worlds.map(world => world.linkage_confidence_governance_signature_sha256)).size,
    complete_linkage_confidence_assurance_worlds: count(worlds, world => world.flags.complete_linkage_confidence_assurance),
    candidate_generation_failure_worlds: count(worlds, world => !world.flags.candidate_generation_complete),
    score_calibration_failure_worlds: count(worlds, world => !world.flags.score_calibration_complete),
    ambiguity_force_resolution_worlds: count(worlds, world => !world.flags.ambiguity_preservation_complete),
    adjudication_failure_worlds: count(worlds, world => !world.flags.independent_adjudication_complete),
    ground_truth_failure_worlds: count(worlds, world => !world.flags.independent_ground_truth_complete),
    falsification_failure_worlds: count(worlds, world => !world.flags.falsification_complete),
    stale_lineage_worlds: count(worlds, world => !world.flags.current_lineage_complete),
    candidate_generation_complete_worlds: count(worlds, world => world.flags.candidate_generation_complete),
    score_calibration_complete_worlds: count(worlds, world => world.flags.score_calibration_complete),
    ambiguity_preservation_complete_worlds: count(worlds, world => world.flags.ambiguity_preservation_complete),
    independent_adjudication_complete_worlds: count(worlds, world => world.flags.independent_adjudication_complete),
    independent_ground_truth_complete_worlds: count(worlds, world => world.flags.independent_ground_truth_complete),
    falsification_complete_worlds: count(worlds, world => world.flags.falsification_complete),
    current_lineage_complete_worlds: count(worlds, world => world.flags.current_lineage_complete),
    total_omitted_candidate_pairs: sum(worlds, 'candidate_generation.omitted_candidate_pairs'),
    total_blocking_false_negative_pairs: sum(worlds, 'candidate_generation.blocking_false_negative_pairs'),
    total_false_positive_links: sum(worlds, 'scoring.false_positive_links'),
    total_false_negative_links: sum(worlds, 'scoring.false_negative_links'),
    total_threshold_sensitive_pairs: sum(worlds, 'scoring.threshold_sensitive_pairs'),
    total_ambiguous_pairs: sum(worlds, 'ambiguity.ambiguous_pairs'),
    total_force_resolved_pairs: sum(worlds, 'ambiguity.force_resolved_pairs'),
    total_many_to_many_links: sum(worlds, 'ambiguity.many_to_many_links'),
    total_unreviewed_pairs: sum(worlds, 'adjudication.unreviewed_pairs'),
    total_reviewer_disagreements: sum(worlds, 'adjudication.reviewer_disagreements'),
    total_reviewer_conflicted_pairs: sum(worlds, 'adjudication.reviewer_conflicted_pairs'),
    total_leaked_label_pairs: sum(worlds, 'ground_truth.leaked_label_pairs'),
    total_circular_ground_truth_pairs: sum(worlds, 'ground_truth.circular_ground_truth_pairs'),
    total_correlated_feature_pairs: sum(worlds, 'ground_truth.correlated_feature_pairs'),
    total_subgroup_miscalibrated_pairs: sum(worlds, 'falsification.subgroup_miscalibrated_pairs'),
    total_negative_control_failures: sum(worlds, 'falsification.negative_control_failures'),
    total_falsification_failures: sum(worlds, 'falsification.falsification_failures'),
    total_stale_confidence_decisions: sum(worlds, 'governance.stale_decisions'),
    total_unsupported_confidence_decisions: sum(worlds, 'governance.unsupported_decisions'),
    binding_public_authority_worlds: count(worlds, world => world.governance.binding_public_authority === true)
  };
}

export const EXPECTED_LINKAGE_CONFIDENCE_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_linkage_confidence_governance_signatures: 8,
  complete_linkage_confidence_assurance_worlds: 1,
  candidate_generation_failure_worlds: 1,
  score_calibration_failure_worlds: 1,
  ambiguity_force_resolution_worlds: 1,
  adjudication_failure_worlds: 1,
  ground_truth_failure_worlds: 1,
  falsification_failure_worlds: 1,
  stale_lineage_worlds: 1,
  candidate_generation_complete_worlds: 7,
  score_calibration_complete_worlds: 7,
  ambiguity_preservation_complete_worlds: 7,
  independent_adjudication_complete_worlds: 7,
  independent_ground_truth_complete_worlds: 7,
  falsification_complete_worlds: 7,
  current_lineage_complete_worlds: 7,
  total_omitted_candidate_pairs: 40,
  total_blocking_false_negative_pairs: 30,
  total_false_positive_links: 30,
  total_false_negative_links: 25,
  total_threshold_sensitive_pairs: 50,
  total_ambiguous_pairs: 40,
  total_force_resolved_pairs: 30,
  total_many_to_many_links: 20,
  total_unreviewed_pairs: 30,
  total_reviewer_disagreements: 20,
  total_reviewer_conflicted_pairs: 15,
  total_leaked_label_pairs: 30,
  total_circular_ground_truth_pairs: 25,
  total_correlated_feature_pairs: 40,
  total_subgroup_miscalibrated_pairs: 40,
  total_negative_control_failures: 20,
  total_falsification_failures: 20,
  total_stale_confidence_decisions: 100,
  total_unsupported_confidence_decisions: 700,
  binding_public_authority_worlds: 0
};

export function validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_LINKAGE_CONFIDENCE_ADJUDICATION_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-linkage-confidence-verified-status-different-operational-states-v1' || fixture?.issue !== 881 || fixture?.parent_program_issue !== 594) errors.push('fixture identity or issue lineage mismatch');
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
    for (const section of ['candidate_generation', 'scoring', 'ambiguity', 'adjudication', 'ground_truth', 'falsification', 'governance']) {
      if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} ${section} contract mismatch`);
    }
    const derived = deriveFlags(world);
    if (stable(world?.expected_flags) !== stable(derived)) errors.push(`${worldId} expected flags mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_linkage_confidence_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete linkage-confidence assurance world is required');
  return errors;
}

export function compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid linkage-confidence fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = { candidate_generation: world.candidate_generation, scoring: world.scoring, ambiguity: world.ambiguity, adjudication: world.adjudication, ground_truth: world.ground_truth, falsification: world.falsification, governance: world.governance };
    const provenanceSignature = sha256(provenance);
    const mechanism = mechanismFor(world, flags);
    const chain = custodyChain(fixture, world, flags, publicSignature, provenanceSignature, mechanism);
    return {
      world_id: world.world_id,
      description: world.description,
      candidate_generation: world.candidate_generation,
      scoring: world.scoring,
      ambiguity: world.ambiguity,
      adjudication: world.adjudication,
      ground_truth: world.ground_truth,
      falsification: world.falsification,
      governance: world.governance,
      flags,
      mechanism,
      public_status_signature_sha256: publicSignature,
      linkage_confidence_governance_signature_sha256: provenanceSignature,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1).event_sha256
    };
  });
  return {
    schema_version: PREFERENCE_LINKAGE_CONFIDENCE_ADJUDICATION_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_linkage_confidence_adjudication_control_qualified',
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
    'linkage_confidence_publication_surface_frozen',
    'candidate_generation_blocking_and_search_space_state',
    'linkage_score_calibration_threshold_and_abstention_state',
    'ambiguity_force_resolution_and_retained_alternatives_state',
    'clerical_review_independence_disagreement_and_conflict_state',
    'ground_truth_label_leakage_circularity_and_source_dependence_state',
    'negative_control_falsification_subgroup_and_threshold_sensitivity_state',
    'lineage_correction_monitoring_and_authority_state',
    'linkage_confidence_assurance_flags_derived',
    'linkage_confidence_governance_mechanism_classified'
  ];
  if (chain.length !== expectedTypes.length) errors.push(`${world?.world_id} custody chain length mismatch`);
  let previous = null;
  const seen = new Set();
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

export function validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_LINKAGE_CONFIDENCE_ADJUDICATION_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== 'same-linkage-confidence-verified-status-different-operational-states-v1' || build?.issue !== 881 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_linkage_confidence_adjudication_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors);
  requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`build unexpected world: ${worldId || '<blank>'}`); continue; }
    for (const section of ['candidate_generation', 'scoring', 'ambiguity', 'adjudication', 'ground_truth', 'falsification', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} build ${section} mismatch`);
    const derived = deriveFlags(world);
    if (stable(world?.flags) !== stable(derived)) errors.push(`${worldId} build flags mismatch`);
    if (world?.public_status_signature_sha256 !== sha256(BASELINE)) errors.push(`${worldId} public signature mismatch`);
    const provenance = { candidate_generation: world.candidate_generation, scoring: world.scoring, ambiguity: world.ambiguity, adjudication: world.adjudication, ground_truth: world.ground_truth, falsification: world.falsification, governance: world.governance };
    if (world?.linkage_confidence_governance_signature_sha256 !== sha256(provenance)) errors.push(`${worldId} provenance signature mismatch`);
    if (world?.mechanism !== mechanismFor(world, derived)) errors.push(`${worldId} mechanism mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_CONFIDENCE_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.[TRUE_CLASSIFICATION] !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceLinkageConfidenceAdjudicationAssuranceMarkdown(build) {
  const lines = [
    '# Cross-source linkage confidence, ambiguity adjudication, and falsification custody',
    '',
    `**Status:** ${build.status}`,
    '',
    `**Worlds:** ${build.metrics.world_count}`,
    '',
    `**Public status signatures:** ${build.metrics.distinct_public_status_signatures}`,
    '',
    `**Governance signatures:** ${build.metrics.distinct_linkage_confidence_governance_signatures}`,
    '',
    '> A complete-looking confidence publication does not identify complete candidate generation, calibrated scores, preserved ambiguity, independent adjudication, independent ground truth, falsification, subgroup calibration, correction, or authority custody.',
    '',
    '## Deterministic burden surface',
    ''
  ];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, match probability, subgroup error estimate, exposure trajectory, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
