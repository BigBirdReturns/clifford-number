import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

export const PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_FIXTURE_SCHEMA_VERSION = "preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance-fixture@1";
export const PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_BUILD_SCHEMA_VERSION = "preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance-build@1";
export const COMPLETE_REPOSITORY_OWNER_ID_TRANSFER_LINEAGE_ASSURANCE_CLASSIFICATION = "complete_repository_owner_id_transfer_lineage_assurance";

const EXPECTED_FIXTURE_ID = "same-linkage-owner-repository-transfer-status-different-immutable-identity-states-v1";
const EXPECTED_FIXTURE_SNAPSHOT_SHA256 = "85cdec50e64b699ee3439ba5ea5c4b669639b74eb045f5ab2080cd07b5433b29";
const EXPECTED_FIXTURE_LITERAL = Object.freeze({"baseline":{"approved_use":"longitudinal_exposure_estimation","operative_release":"RELEASE-INCIDENT-V1@1","public_immutable_owner_id_status":"immutable_owner_id_verified","public_immutable_repository_id_status":"immutable_repository_id_verified","public_owner_status":"repository_owner_verified","public_repository_status":"repository_identity_verified","public_transfer_lineage_status":"transfer_lineage_verified","published_candidate_pairs":100,"published_empirical_coverage":0.95,"published_interval_bearing_pairs":100,"published_interval_misses":5,"published_matching_repository_replays":10,"published_mean_interval_width":0.02,"published_nominal_coverage":0.95,"published_repository_replays":10},"captured_at":"2026-08-08","counts_toward_thesis_evidence":false,"expected_classification":{"binding_public_authority_present":false,"complete_repository_owner_id_transfer_lineage_assurance_supported_in_at_least_one_world":true,"graph_effect_present":false,"matching_repository_replays_establish_current_transfer_assurance":false,"one_owner_login_identifies_immutable_owner":false,"one_owner_numeric_id_identifies_durable_repository_ownership":false,"one_reachable_commit_identifies_complete_repository_continuity":false,"one_redirect_identifies_complete_namespace_continuity":false,"one_repository_id_identifies_complete_repository_identity":false,"one_successor_url_identifies_complete_transfer_lineage":false,"one_transfer_event_identifies_complete_current_lineage":false,"ownership_established":false,"public_immutable_owner_id_badge_identifies_durable_owner":false,"public_immutable_repository_id_badge_identifies_complete_repository":false,"public_owner_badge_identifies_immutable_owner":false,"public_transfer_lineage_badge_identifies_complete_transfer":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false},"fixture_id":"same-linkage-owner-repository-transfer-status-different-immutable-identity-states-v1","graph_effect":"none","interpretation_contract":{"copy_ready_caveat":"Verified-looking owner, immutable-ID, repository-ID, and transfer-lineage badges do not establish immutable owner or repository identity, exact transfer-event parties and time, redirect and namespace continuity, correction, or current lineage.","what_this_is":"A synthetic immutable owner, immutable repository, transfer-event, redirect, namespace-continuity, correction, and current-lineage control separating one complete-looking public surface from eight incompatible custody states.","what_this_is_not":"A real ownership finding, repository review, source audit, release audit, artifact verification, security finding, interval-validity finding, causal effect, graph fact, allegation, or public-authority verdict."},"issue":1534,"parent_program_issue":594,"required_refusal_rules":["one_owner_login_is_not_immutable_owner_numeric_and_node_identity","one_owner_numeric_id_is_not_durable_repository_ownership_or_transfer_lineage_custody","one_repository_numeric_id_is_not_repository_node_id_canonical_name_owner_repository_pairing_and_transfer_event_custody","one_successor_url_is_not_predecessor_successor_owner_identity_timestamp_redirect_and_namespace_continuity","one_transfer_event_is_not_predecessor_owner_successor_owner_actor_system_receipt_timestamp_correction_and_current_lineage","one_redirect_is_not_canonical_api_clone_redirect_chain_custody","one_reachable_commit_is_not_ref_object_issue_pull_request_release_fork_network_and_protection_policy_continuity","matching_repository_replays_are_not_exact_immutable_owner_id_repository_id_transfer_event_namespace_and_current_lineage","historical_transfer_assurance_is_not_current_after_owner_repository_transfer_namespace_policy_correction_release_or_use_succession","repository_transfer_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_intent_ownership_or_security_compromise","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_repository_transfer_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_or_institutional_performance_estimates"],"schema_version":"preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance-fixture@1","status":"synthetic_repository_owner_id_transfer_lineage_control","worlds":[{"description":"Immutable owner and repository IDs, transfer event, predecessor and successor, timestamp, redirects, namespaces, continuity, correction, and current lineage are complete.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":true,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":true},"expected_mechanism":"complete_repository_owner_id_transfer_lineage_assurance","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":0},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"complete_repository_owner_id_transfer_lineage_assurance"},{"description":"Owner login is preserved publicly while immutable owner numeric or node identity, owner state, profile location, or rename lineage is substituted or incomplete.","expected_flags":{"complete_owner_identity":false,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":true},"expected_mechanism":"owner_login_or_immutable_owner_id_substitution","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":false,"owner_api_url_bound":false,"owner_immutable_numeric_id_bound":false,"owner_login_bound":false,"owner_login_or_immutable_owner_id_substitutions":100,"owner_node_id_bound":false,"owner_predecessor_login_bound":false,"owner_profile_url_bound":false,"owner_rename_lineage_bound":false,"owner_rename_timestamp_bound":false,"owner_successor_login_bound":false,"owner_type_bound":false},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"owner_login_or_immutable_owner_id_substitution"},{"description":"Owner identity is preserved while immutable repository numeric or node identity, canonical name, database consistency, or owner/repository pairing is substituted or incomplete.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":false,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":true},"expected_mechanism":"repository_id_or_owner_repository_pair_substitution","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":false,"repository_canonical_name_at_review_bound":false,"repository_created_at_bound":false,"repository_database_id_consistency_bound":false,"repository_full_name_at_review_bound":false,"repository_id_or_owner_repository_pair_substitutions":90,"repository_node_id_bound":false,"repository_numeric_id_bound":false},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"repository_id_or_owner_repository_pair_substitution"},{"description":"The transfer badge is preserved while transfer-event identity, predecessor owner, successor owner, or actor/system receipt differs.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":false,"current_repository_transfer_lineage":true},"expected_mechanism":"transfer_event_predecessor_or_successor_gap","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":false,"predecessor_owner_login_bound":false,"successor_owner_immutable_id_bound":false,"successor_owner_login_bound":false,"transfer_actor_or_system_receipt_bound":false,"transfer_event_bound":false,"transfer_event_predecessor_successor_gaps":80},"world_id":"transfer_event_predecessor_or_successor_gap"},{"description":"A successor repository is reachable while transfer time, predecessor/successor full names, canonical/API redirects, or clone-remote redirects are incomplete.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":false,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":true},"expected_mechanism":"transfer_timestamp_or_redirect_chain_gap","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":false,"canonical_redirect_bound":false,"clone_remote_redirect_bound":false,"predecessor_full_name_bound":false,"successor_full_name_bound":false,"transfer_timestamp_bound":false,"transfer_timestamp_or_redirect_chain_gaps":70},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"transfer_timestamp_or_redirect_chain_gap"},{"description":"Owner and repository IDs are preserved while ref, object, issue, pull-request, release, fork-network, visibility, or repository-state continuity is unbound.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":false,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":true},"expected_mechanism":"repository_namespace_or_state_continuity_gap","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":true,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":false,"fork_network_continuity_bound":false,"issue_pr_release_namespace_preserved":false,"object_namespace_preserved":false,"ref_namespace_preserved":false,"ref_object_issue_pr_release_continuity_gaps":60,"visibility_state_continuity_bound":false},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"repository_namespace_or_state_continuity_gap"},{"description":"Transfer history is preserved while default branch, tag/release binding, review-time commit reachability, advertised objects, protection policy, correction, or current lineage differs.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":false},"expected_mechanism":"correction_or_current_lineage_gap","lineage":{"advertised_object_presence_bound":false,"appeal_defined":true,"approved_continuity_lineage_current":false,"approved_correction_lineage_current":true,"approved_namespace_lineage_current":true,"approved_owner_identity_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_identity_lineage_current":true,"approved_transfer_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":false,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":50,"default_branch_identity_continuity_bound":false,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":false,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"review_time_commit_reachability_bound":false,"rollback_defined":true,"stale_repository_transfer_decisions":0,"tag_release_binding_continuity_bound":false,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":0,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"correction_or_current_lineage_gap"},{"description":"Historical owner/repository-ID and transfer assurance is inherited after owner, repository, transfer, namespace, policy, correction, release, or use succession.","expected_flags":{"complete_owner_identity":true,"complete_redirect_namespace_identity":true,"complete_repository_identity":true,"complete_repository_namespace_continuity":true,"complete_repository_owner_id_transfer_lineage_assurance":false,"complete_transfer_event_identity":true,"current_repository_transfer_lineage":false},"expected_mechanism":"stale_inherited_owner_repository_transfer_assurance","lineage":{"advertised_object_presence_bound":true,"appeal_defined":true,"approved_continuity_lineage_current":false,"approved_correction_lineage_current":false,"approved_namespace_lineage_current":false,"approved_owner_identity_lineage_current":false,"approved_policy_lineage_current":false,"approved_release_lineage_current":false,"approved_repository_identity_lineage_current":false,"approved_transfer_lineage_current":false,"approved_use_lineage_current":false,"assurance_current":false,"binding_public_authority":false,"continuity_invalidation_defined":true,"correction_defined":true,"correction_or_current_lineage_gaps":0,"default_branch_identity_continuity_bound":true,"durability_defined":true,"namespace_invalidation_defined":true,"owner_identity_invalidation_defined":true,"policy_invalidation_defined":true,"protection_policy_identity_bound":true,"quarantine_defined":true,"repository_identity_invalidation_defined":true,"republication_defined":true,"rereview_defined":false,"review_time_commit_reachability_bound":true,"rollback_defined":true,"stale_repository_transfer_decisions":100,"tag_release_binding_continuity_bound":true,"transfer_invalidation_defined":true,"unreconciled_identity_decisions":40,"unsupported_repository_transfer_decisions":100},"owner_identity":{"owner_account_state_bound":true,"owner_api_url_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_login_or_immutable_owner_id_substitutions":0,"owner_node_id_bound":true,"owner_predecessor_login_bound":true,"owner_profile_url_bound":true,"owner_rename_lineage_bound":true,"owner_rename_timestamp_bound":true,"owner_successor_login_bound":true,"owner_type_bound":true},"redirect_namespace":{"api_redirect_bound":true,"canonical_redirect_bound":true,"clone_remote_redirect_bound":true,"predecessor_full_name_bound":true,"successor_full_name_bound":true,"transfer_timestamp_bound":true,"transfer_timestamp_or_redirect_chain_gaps":0},"repository_continuity":{"archived_disabled_template_state_continuity_bound":true,"fork_network_continuity_bound":true,"issue_pr_release_namespace_preserved":true,"object_namespace_preserved":true,"ref_namespace_preserved":true,"ref_object_issue_pr_release_continuity_gaps":0,"visibility_state_continuity_bound":true},"repository_identity":{"owner_repository_id_pair_bound":true,"repository_canonical_name_at_review_bound":true,"repository_created_at_bound":true,"repository_database_id_consistency_bound":true,"repository_full_name_at_review_bound":true,"repository_id_or_owner_repository_pair_substitutions":0,"repository_node_id_bound":true,"repository_numeric_id_bound":true},"transfer_event":{"predecessor_owner_immutable_id_bound":true,"predecessor_owner_login_bound":true,"successor_owner_immutable_id_bound":true,"successor_owner_login_bound":true,"transfer_actor_or_system_receipt_bound":true,"transfer_event_bound":true,"transfer_event_predecessor_successor_gaps":0},"world_id":"stale_inherited_owner_repository_transfer_assurance"}]});

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_repository_status","public_owner_status","public_immutable_owner_id_status","public_immutable_repository_id_status","public_transfer_lineage_status","published_repository_replays","published_matching_repository_replays","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_CLASSIFICATION_KEYS = Object.freeze(["public_owner_badge_identifies_immutable_owner","public_immutable_owner_id_badge_identifies_durable_owner","public_immutable_repository_id_badge_identifies_complete_repository","public_transfer_lineage_badge_identifies_complete_transfer","one_owner_login_identifies_immutable_owner","one_owner_numeric_id_identifies_durable_repository_ownership","one_repository_id_identifies_complete_repository_identity","one_successor_url_identifies_complete_transfer_lineage","one_transfer_event_identifies_complete_current_lineage","one_redirect_identifies_complete_namespace_continuity","one_reachable_commit_identifies_complete_repository_continuity","matching_repository_replays_establish_current_transfer_assurance","published_coverage_establishes_real_world_effect","ownership_established","security_compromise_established","graph_effect_present","binding_public_authority_present","complete_repository_owner_id_transfer_lineage_assurance_supported_in_at_least_one_world"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","owner_identity","repository_identity","transfer_event","redirect_namespace","repository_continuity","lineage","expected_mechanism","expected_flags"]);
const SECTION_KEYS = Object.freeze({"owner_identity":["owner_login_bound","owner_immutable_numeric_id_bound","owner_node_id_bound","owner_type_bound","owner_account_state_bound","owner_profile_url_bound","owner_api_url_bound","owner_rename_lineage_bound","owner_predecessor_login_bound","owner_successor_login_bound","owner_rename_timestamp_bound","owner_login_or_immutable_owner_id_substitutions"],"repository_identity":["repository_numeric_id_bound","repository_node_id_bound","repository_database_id_consistency_bound","repository_canonical_name_at_review_bound","repository_full_name_at_review_bound","owner_repository_id_pair_bound","repository_created_at_bound","repository_id_or_owner_repository_pair_substitutions"],"transfer_event":["transfer_event_bound","predecessor_owner_login_bound","predecessor_owner_immutable_id_bound","successor_owner_login_bound","successor_owner_immutable_id_bound","transfer_actor_or_system_receipt_bound","transfer_event_predecessor_successor_gaps"],"redirect_namespace":["transfer_timestamp_bound","predecessor_full_name_bound","successor_full_name_bound","canonical_redirect_bound","api_redirect_bound","clone_remote_redirect_bound","transfer_timestamp_or_redirect_chain_gaps"],"repository_continuity":["ref_namespace_preserved","object_namespace_preserved","issue_pr_release_namespace_preserved","fork_network_continuity_bound","visibility_state_continuity_bound","archived_disabled_template_state_continuity_bound","ref_object_issue_pr_release_continuity_gaps"],"lineage":["default_branch_identity_continuity_bound","tag_release_binding_continuity_bound","review_time_commit_reachability_bound","advertised_object_presence_bound","protection_policy_identity_bound","assurance_current","approved_owner_identity_lineage_current","approved_repository_identity_lineage_current","approved_transfer_lineage_current","approved_namespace_lineage_current","approved_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","owner_identity_invalidation_defined","repository_identity_invalidation_defined","transfer_invalidation_defined","namespace_invalidation_defined","continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined","binding_public_authority","correction_or_current_lineage_gaps","unreconciled_identity_decisions","stale_repository_transfer_decisions","unsupported_repository_transfer_decisions"]});
const SECTION_BOOLEAN_KEYS = Object.freeze({"owner_identity":["owner_login_bound","owner_immutable_numeric_id_bound","owner_node_id_bound","owner_type_bound","owner_account_state_bound","owner_profile_url_bound","owner_api_url_bound","owner_rename_lineage_bound","owner_predecessor_login_bound","owner_successor_login_bound","owner_rename_timestamp_bound"],"repository_identity":["repository_numeric_id_bound","repository_node_id_bound","repository_database_id_consistency_bound","repository_canonical_name_at_review_bound","repository_full_name_at_review_bound","owner_repository_id_pair_bound","repository_created_at_bound"],"transfer_event":["transfer_event_bound","predecessor_owner_login_bound","predecessor_owner_immutable_id_bound","successor_owner_login_bound","successor_owner_immutable_id_bound","transfer_actor_or_system_receipt_bound"],"redirect_namespace":["transfer_timestamp_bound","predecessor_full_name_bound","successor_full_name_bound","canonical_redirect_bound","api_redirect_bound","clone_remote_redirect_bound"],"repository_continuity":["ref_namespace_preserved","object_namespace_preserved","issue_pr_release_namespace_preserved","fork_network_continuity_bound","visibility_state_continuity_bound","archived_disabled_template_state_continuity_bound"],"lineage":["default_branch_identity_continuity_bound","tag_release_binding_continuity_bound","review_time_commit_reachability_bound","advertised_object_presence_bound","protection_policy_identity_bound","assurance_current","approved_owner_identity_lineage_current","approved_repository_identity_lineage_current","approved_transfer_lineage_current","approved_namespace_lineage_current","approved_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","owner_identity_invalidation_defined","repository_identity_invalidation_defined","transfer_invalidation_defined","namespace_invalidation_defined","continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined","binding_public_authority"]});
const WORLD_IDS = Object.freeze(["complete_repository_owner_id_transfer_lineage_assurance","owner_login_or_immutable_owner_id_substitution","repository_id_or_owner_repository_pair_substitution","transfer_event_predecessor_or_successor_gap","transfer_timestamp_or_redirect_chain_gap","repository_namespace_or_state_continuity_gap","correction_or_current_lineage_gap","stale_inherited_owner_repository_transfer_assurance"]);
const WORLD_MECHANISMS = Object.freeze({"complete_repository_owner_id_transfer_lineage_assurance":"complete_repository_owner_id_transfer_lineage_assurance","owner_login_or_immutable_owner_id_substitution":"owner_login_or_immutable_owner_id_substitution","repository_id_or_owner_repository_pair_substitution":"repository_id_or_owner_repository_pair_substitution","transfer_event_predecessor_or_successor_gap":"transfer_event_predecessor_or_successor_gap","transfer_timestamp_or_redirect_chain_gap":"transfer_timestamp_or_redirect_chain_gap","repository_namespace_or_state_continuity_gap":"repository_namespace_or_state_continuity_gap","correction_or_current_lineage_gap":"correction_or_current_lineage_gap","stale_inherited_owner_repository_transfer_assurance":"stale_inherited_owner_repository_transfer_assurance"});

export const REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_REFUSAL_RULES = Object.freeze(["one_owner_login_is_not_immutable_owner_numeric_and_node_identity","one_owner_numeric_id_is_not_durable_repository_ownership_or_transfer_lineage_custody","one_repository_numeric_id_is_not_repository_node_id_canonical_name_owner_repository_pairing_and_transfer_event_custody","one_successor_url_is_not_predecessor_successor_owner_identity_timestamp_redirect_and_namespace_continuity","one_transfer_event_is_not_predecessor_owner_successor_owner_actor_system_receipt_timestamp_correction_and_current_lineage","one_redirect_is_not_canonical_api_clone_redirect_chain_custody","one_reachable_commit_is_not_ref_object_issue_pull_request_release_fork_network_and_protection_policy_continuity","matching_repository_replays_are_not_exact_immutable_owner_id_repository_id_transfer_event_namespace_and_current_lineage","historical_transfer_assurance_is_not_current_after_owner_repository_transfer_namespace_policy_correction_release_or_use_succession","repository_transfer_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_intent_ownership_or_security_compromise","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_repository_transfer_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_or_institutional_performance_estimates"]);
export const LINKAGE_REPOSITORY_OWNER_ID_TRANSFER_LINEAGE_ASSURANCE_FALSE_CLASSIFICATIONS = Object.freeze({"public_owner_badge_identifies_immutable_owner":false,"public_immutable_owner_id_badge_identifies_durable_owner":false,"public_immutable_repository_id_badge_identifies_complete_repository":false,"public_transfer_lineage_badge_identifies_complete_transfer":false,"one_owner_login_identifies_immutable_owner":false,"one_owner_numeric_id_identifies_durable_repository_ownership":false,"one_repository_id_identifies_complete_repository_identity":false,"one_successor_url_identifies_complete_transfer_lineage":false,"one_transfer_event_identifies_complete_current_lineage":false,"one_redirect_identifies_complete_namespace_continuity":false,"one_reachable_commit_identifies_complete_repository_continuity":false,"matching_repository_replays_establish_current_transfer_assurance":false,"published_coverage_establishes_real_world_effect":false,"ownership_established":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false});
export const EXPECTED_LINKAGE_REPOSITORY_OWNER_ID_TRANSFER_LINEAGE_ASSURANCE_METRICS = Object.freeze({"worlds":8,"public_owner_repository_id_transfer_signatures":1,"repository_transfer_governance_signatures":8,"complete_transfer_lineage_assurance_worlds":1,"owner_login_or_immutable_owner_id_substitutions":100,"repository_id_or_owner_repository_pair_substitutions":90,"transfer_event_predecessor_successor_gaps":80,"transfer_timestamp_or_redirect_chain_gaps":70,"ref_object_issue_pr_release_continuity_gaps":60,"correction_or_current_lineage_gaps":50,"unreconciled_identity_decisions":40,"stale_repository_transfer_decisions":100,"unsupported_repository_transfer_decisions":700,"binding_public_authority_worlds":0});

const BUILD_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","conclusion_generated","real_world_evidence_state","fixture_snapshot_sha256","baseline","baseline_snapshot_sha256","public_signature_count","world_count","repository_transfer_governance_signature_count","complete_assurance_world_count","worlds","metrics","classification","required_refusal_rules","custody_chain","custody_chain_head_sha256","interpretation_contract"]);
const COMPILED_WORLD_KEYS = Object.freeze(["world_id","description","owner_identity","repository_identity","transfer_event","redirect_namespace","repository_continuity","lineage","expected_mechanism","flags","numeric_burden","public_signature_sha256","repository_transfer_governance_signature_sha256"]);
const FLAG_KEYS = Object.freeze(["complete_owner_identity","complete_repository_identity","complete_transfer_event_identity","complete_redirect_namespace_identity","complete_repository_namespace_continuity","current_repository_transfer_lineage","complete_repository_owner_id_transfer_lineage_assurance"]);
const BURDEN_LOCATIONS = Object.freeze({"owner_login_or_immutable_owner_id_substitutions":["owner_identity","owner_login_or_immutable_owner_id_substitutions"],"repository_id_or_owner_repository_pair_substitutions":["repository_identity","repository_id_or_owner_repository_pair_substitutions"],"transfer_event_predecessor_successor_gaps":["transfer_event","transfer_event_predecessor_successor_gaps"],"transfer_timestamp_or_redirect_chain_gaps":["redirect_namespace","transfer_timestamp_or_redirect_chain_gaps"],"ref_object_issue_pr_release_continuity_gaps":["repository_continuity","ref_object_issue_pr_release_continuity_gaps"],"correction_or_current_lineage_gaps":["lineage","correction_or_current_lineage_gaps"],"unreconciled_identity_decisions":["lineage","unreconciled_identity_decisions"],"stale_repository_transfer_decisions":["lineage","stale_repository_transfer_decisions"],"unsupported_repository_transfer_decisions":["lineage","unsupported_repository_transfer_decisions"]});

const record = value => {
  try {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !nodeTypes.isProxy(value);
  } catch {
    return false;
  }
};
const array = value => {
  try {
    return Array.isArray(value) && !nodeTypes.isProxy(value) ? value : [];
  } catch {
    return [];
  }
};
const text = value => String(value ?? '').trim();
const canonical = value =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
      : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const nonNegativeInteger = value => Number.isInteger(value) && value >= 0 && !Object.is(value, -0);
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function requireExactKeys(value, expected, label, errors) {
  if (!record(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  let keys;
  try { keys = Object.keys(value); }
  catch (error) { errors.push(`${label} keys could not be inspected: ${error.message}`); return; }
  if (stable(keys.sort()) !== stable([...expected].sort())) errors.push(`${label} keys mismatch`);
}

const NON_JSON_EXOTIC_TYPE_CHECKS = Object.freeze([
  'isAnyArrayBuffer','isArgumentsObject','isArrayBufferView','isBoxedPrimitive','isCryptoKey',
  'isDate','isExternal','isGeneratorObject','isKeyObject','isMap','isMapIterator',
  'isModuleNamespaceObject','isNativeError','isPromise','isRegExp','isSet','isSetIterator',
  'isWeakMap','isWeakSet'
]);

function brandCall(value, constructorName, property, mode = 'getter') {
  const C = globalThis[constructorName];
  if (typeof C !== 'function') return false;
  const descriptor = Object.getOwnPropertyDescriptor(C.prototype, property);
  try {
    if (mode === 'getter' && typeof descriptor?.get === 'function') { descriptor.get.call(value); return true; }
    if (mode === 'method' && typeof C.prototype[property] === 'function') { C.prototype[property].call(value, '__pc57_brand_probe__'); return true; }
  } catch { return false; }
  return false;
}

function nonJsonExoticKind(value) {
  for (const name of NON_JSON_EXOTIC_TYPE_CHECKS) {
    const predicate = nodeTypes[name];
    if (typeof predicate !== 'function') continue;
    try { if (predicate(value)) return name; } catch { return `${name}_uninspectable`; }
  }
  const checks = [
    ['AbortController','signal','getter'],['AbortSignal','aborted','getter'],
    ['URL','href','getter'],['URLSearchParams','append','method'],['Blob','size','getter'],
    ['Request','url','getter'],['Response','status','getter'],['Headers','get','method'],
    ['FormData','get','method']
  ];
  for (const [name, property, mode] of checks) if (brandCall(value, name, property, mode)) return name;
  return null;
}

function inspectCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push(`${label} contains a non-finite number`);
    else if (Object.is(value, -0)) errors.push(`${label} contains negative zero`);
    return;
  }
  if (typeof value !== 'object') { errors.push(`${label} contains unsupported ${typeof value}`); return; }
  try { if (nodeTypes.isProxy(value)) { errors.push(`${label} contains a proxy object`); return; } }
  catch { errors.push(`${label} proxy state is uninspectable`); return; }
  const exotic = nonJsonExoticKind(value);
  if (exotic !== null) { errors.push(`${label} contains a non-JSON exotic object (${exotic})`); return; }
  if (seen.has(value)) { errors.push(`${label} contains a cycle or repeated object identity`); return; }
  seen.add(value);
  let proto;
  let keys;
  try { proto = Object.getPrototypeOf(value); keys = Reflect.ownKeys(value); }
  catch (error) { errors.push(`${label} cannot be inspected: ${error.message}`); return; }
  const isArray = Array.isArray(value);
  let length = null;
  if (isArray) {
    if (proto !== Array.prototype) errors.push(`${label} array prototype must be canonical`);
    try { length = value.length; } catch (error) { errors.push(`${label} array length cannot be read: ${error.message}`); return; }
    if (!Number.isSafeInteger(length) || length < 0) errors.push(`${label} array length is invalid`);
    const numericKeys = keys.filter(key => typeof key === 'string' && key !== 'length' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < length);
    if (numericKeys.length !== length) errors.push(`${label} contains a sparse array hole`);
  } else if (proto !== Object.prototype) errors.push(`${label} object prototype must be canonical`);
  for (const key of keys) {
    if (isArray && key === 'length') continue;
    if (isArray && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length)) {
      errors.push(`${label} contains an undeclared array property ${String(key)}`); continue;
    }
    if (typeof key !== 'string') { errors.push(`${label} contains a symbol key`); continue; }
    let descriptor;
    try { descriptor = Object.getOwnPropertyDescriptor(value, key); }
    catch (error) { errors.push(`${label} descriptor ${key} cannot be read: ${error.message}`); continue; }
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(`${label} property ${key} must be an enumerable data property`); continue;
    }
    inspectCanonicalJsonTree(descriptor.value, `${label}.${key}`, errors, seen);
  }
}

function validateStructuredCloneShape(original, cloned, label, errors, seen = new WeakSet()) {
  if (original === null || typeof original !== 'object') return;
  if (seen.has(original)) return;
  seen.add(original);
  const isArray = Array.isArray(original);
  if (cloned === null || typeof cloned !== 'object' || Array.isArray(cloned) !== isArray) {
    errors.push(`${label} is not preserved as a canonical JSON container by structured cloning`); return;
  }
  if (Object.getPrototypeOf(cloned) !== (isArray ? Array.prototype : Object.prototype)) {
    errors.push(`${label} contains a structured-clone-visible non-JSON exotic object`); return;
  }
  for (const key of Reflect.ownKeys(original)) {
    if (isArray && key === 'length') continue;
    if (typeof key !== 'string') continue;
    const source = Object.getOwnPropertyDescriptor(original, key);
    if (!source || !('value' in source)) continue;
    const target = Object.getOwnPropertyDescriptor(cloned, key);
    if (!target || !('value' in target)) { errors.push(`${label}.${key} is not preserved by structured cloning`); continue; }
    validateStructuredCloneShape(source.value, target.value, `${label}.${key}`, errors, seen);
  }
}

function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  const start = errors.length;
  inspectCanonicalJsonTree(value, label, errors, seen);
  if (errors.length !== start) return;
  let cloned;
  try { cloned = structuredClone(value); }
  catch (error) { errors.push(`${label} cannot be structured-cloned as canonical JSON: ${error.message}`); return; }
  validateStructuredCloneShape(value, cloned, label, errors);
}

const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));
function projectWorld(world) {
  return {
    world_id: world.world_id,
    description: world.description,
    ...Object.fromEntries(Object.entries(SECTION_KEYS).map(([section, keys]) => [section, pick(world[section], keys)])),
    expected_mechanism: world.expected_mechanism,
    expected_flags: pick(world.expected_flags, FLAG_KEYS)
  };
}

export function projectPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture) {
  return {
    schema_version: fixture.schema_version,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: fixture.status,
    graph_effect: fixture.graph_effect,
    counts_toward_thesis_evidence: fixture.counts_toward_thesis_evidence,
    baseline: pick(fixture.baseline, EXPECTED_BASELINE_KEYS),
    interpretation_contract: pick(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS),
    required_refusal_rules: [...fixture.required_refusal_rules],
    expected_classification: pick(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS),
    worlds: fixture.worlds.map(projectWorld)
  };
}

export const preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot = fixture => sha256(projectPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture));

function sectionComplete(section, keys) { return keys.every(key => section[key] === true); }

export function classifyPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceWorld(world) {
  const complete_owner_identity = sectionComplete(world.owner_identity, SECTION_BOOLEAN_KEYS.owner_identity);
  const complete_repository_identity = sectionComplete(world.repository_identity, SECTION_BOOLEAN_KEYS.repository_identity);
  const complete_transfer_event_identity = sectionComplete(world.transfer_event, SECTION_BOOLEAN_KEYS.transfer_event);
  const complete_redirect_namespace_identity = sectionComplete(world.redirect_namespace, SECTION_BOOLEAN_KEYS.redirect_namespace);
  const complete_repository_namespace_continuity = sectionComplete(world.repository_continuity, SECTION_BOOLEAN_KEYS.repository_continuity);
  const current_repository_transfer_lineage = sectionComplete(
    world.lineage,
    SECTION_BOOLEAN_KEYS.lineage.filter(key => key !== 'binding_public_authority')
  );
  return {
    complete_owner_identity,
    complete_repository_identity,
    complete_transfer_event_identity,
    complete_redirect_namespace_identity,
    complete_repository_namespace_continuity,
    current_repository_transfer_lineage,
    ["complete_repository_owner_id_transfer_lineage_assurance"]:
      complete_owner_identity &&
      complete_repository_identity &&
      complete_transfer_event_identity &&
      complete_redirect_namespace_identity &&
      complete_repository_namespace_continuity &&
      current_repository_transfer_lineage &&
      world.lineage.binding_public_authority === false
  };
}

function numericBurden(world) {
  return Object.fromEntries(Object.entries(BURDEN_LOCATIONS).map(([name, [section, field]]) => [name, world[section][field]]));
}
function computeMetrics(worlds) {
  const metrics = {
    worlds: worlds.length,
    public_owner_repository_id_transfer_signatures: new Set(worlds.map(world => world.public_signature_sha256)).size,
    repository_transfer_governance_signatures: new Set(worlds.map(world => world.repository_transfer_governance_signature_sha256)).size,
    complete_transfer_lineage_assurance_worlds: worlds.filter(world => world.flags["complete_repository_owner_id_transfer_lineage_assurance"]).length
  };
  for (const name of Object.keys(BURDEN_LOCATIONS)) metrics[name] = worlds.reduce((sum, world) => sum + world.numeric_burden[name], 0);
  metrics.binding_public_authority_worlds = worlds.filter(world => world.lineage.binding_public_authority).length;
  return metrics;
}
function seal(event, previous_event_sha256) {
  const unsigned = { ...canonical(event), previous_event_sha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}
function custodyChain(fixture, worlds, metrics, classification) {
  const events = [
    { event_index: 1, event_id: `${fixture.fixture_id}:fixture`, event_type: 'fixture_frozen', authority: 'preference_custody_pc57_analyst', evidence_class: 'candidate_inference', source_event_ids: [], payload: { fixture_snapshot_sha256: preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot(fixture), graph_effect: 'none' } },
    { event_index: 2, event_id: `${fixture.fixture_id}:public`, event_type: 'public_surface_bound', authority: 'preference_custody_pc57_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:fixture`], payload: { baseline_snapshot_sha256: sha256(fixture.baseline), public_signature_count: metrics.public_owner_repository_id_transfer_signatures } },
    { event_index: 3, event_id: `${fixture.fixture_id}:worlds`, event_type: 'incompatible_repository_transfer_worlds_separated', authority: 'preference_custody_pc57_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:public`], payload: { world_count: worlds.length, repository_transfer_governance_signature_count: metrics.repository_transfer_governance_signatures, complete_assurance_world_count: metrics.complete_transfer_lineage_assurance_worlds } },
    { event_index: 4, event_id: `${fixture.fixture_id}:burdens`, event_type: 'repository_transfer_burdens_reconciled', authority: 'preference_custody_pc57_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:worlds`], payload: { metrics: canonical(metrics), binding_public_authority_worlds: metrics.binding_public_authority_worlds } },
    { event_index: 5, event_id: `${fixture.fixture_id}:interpretation`, event_type: 'interpretation_sealed', authority: 'preference_custody_pc57_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:burdens`], payload: { classification: canonical(classification), interpretation_contract: canonical(fixture.interpretation_contract), real_world_evidence_state: 'none' } }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture) {
  const errors = [];
  validateCanonicalJsonTree(fixture, 'PC-57 fixture', errors);
  if (errors.length) return unique(errors);
  if (!record(fixture)) return ['PC-57 fixture must be an object'];
  requireExactKeys(fixture, EXPECTED_TOP_LEVEL_KEYS, 'PC-57 fixture', errors);
  for (const field of ['baseline','interpretation_contract','expected_classification']) if (!record(fixture[field])) errors.push(`PC-57 fixture ${field} must be an object`);
  for (const field of ['required_refusal_rules','worlds']) if (!Array.isArray(fixture[field])) errors.push(`PC-57 fixture ${field} must be an array`);
  if (Array.isArray(fixture.worlds) && fixture.worlds.some(world => !record(world))) errors.push('PC-57 fixture worlds must contain objects');
  if (errors.length) return unique(errors);
  requireExactKeys(fixture.baseline, EXPECTED_BASELINE_KEYS, 'PC-57 baseline', errors);
  requireExactKeys(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'PC-57 interpretation contract', errors);
  requireExactKeys(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS, 'PC-57 expected classification', errors);
  if (errors.length) return unique(errors);
  if (fixture.schema_version !== PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_FIXTURE_SCHEMA_VERSION || fixture.fixture_id !== EXPECTED_FIXTURE_ID || fixture.issue !== 1534 || fixture.parent_program_issue !== 594) errors.push('PC-57 identity binding mismatch');
  if (fixture.captured_at !== "2026-08-08" || !isoDate(fixture.captured_at)) errors.push('PC-57 capture date mismatch');
  if (fixture.status !== 'synthetic_repository_owner_id_transfer_lineage_control' || fixture.graph_effect !== 'none' || fixture.counts_toward_thesis_evidence !== false) errors.push('PC-57 authority/status mismatch');
  if (stable(fixture.baseline) !== stable(EXPECTED_FIXTURE_LITERAL.baseline)) errors.push('PC-57 baseline mismatch');
  if (stable(fixture.interpretation_contract) !== stable(EXPECTED_FIXTURE_LITERAL.interpretation_contract)) errors.push('PC-57 interpretation mismatch');
  if (stable(fixture.required_refusal_rules) !== stable(REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_REFUSAL_RULES)) errors.push('PC-57 refusal-rule ledger mismatch');
  if (stable(fixture.expected_classification) !== stable(EXPECTED_FIXTURE_LITERAL.expected_classification)) errors.push('PC-57 classification contract mismatch');
  if (fixture.worlds.length !== WORLD_IDS.length) errors.push('PC-57 must contain exactly eight worlds');
  const ids = fixture.worlds.map(world => world.world_id);
  if (stable(ids) !== stable(WORLD_IDS)) errors.push('PC-57 world order or identity mismatch');
  for (const world of fixture.worlds) {
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `PC-57 world ${world.world_id}`, errors);
    let valid = true;
    for (const [section, keys] of Object.entries(SECTION_KEYS)) {
      if (!record(world[section])) { errors.push(`PC-57 world ${world.world_id} ${section} must be an object`); valid = false; continue; }
      requireExactKeys(world[section], keys, `PC-57 world ${world.world_id} ${section}`, errors);
      for (const key of SECTION_BOOLEAN_KEYS[section]) if (typeof world[section][key] !== 'boolean') errors.push(`PC-57 world ${world.world_id} ${section}.${key} must be boolean`);
    }
    if (!record(world.expected_flags)) { errors.push(`PC-57 world ${world.world_id} expected_flags must be an object`); valid = false; }
    else {
      requireExactKeys(world.expected_flags, FLAG_KEYS, `PC-57 world ${world.world_id} expected flags`, errors);
      for (const key of FLAG_KEYS) if (typeof world.expected_flags[key] !== 'boolean') errors.push(`PC-57 world ${world.world_id} flag ${key} must be boolean`);
    }
    for (const [name, [section, field]] of Object.entries(BURDEN_LOCATIONS)) if (!nonNegativeInteger(world[section]?.[field])) errors.push(`PC-57 world ${world.world_id} burden ${name} must be a non-negative integer`);
    if (world.expected_mechanism !== WORLD_MECHANISMS[world.world_id]) errors.push(`PC-57 world ${world.world_id} mechanism mismatch`);
    if (valid && stable(classifyPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceWorld(world)) !== stable(world.expected_flags)) errors.push(`PC-57 world ${world.world_id} flag mismatch`);
  }
  if (errors.length) return unique(errors);
  const snapshot = preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot(fixture);
  if (snapshot !== EXPECTED_FIXTURE_SNAPSHOT_SHA256 || stable(fixture) !== stable(EXPECTED_FIXTURE_LITERAL)) errors.push(`PC-57 fixture snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

export function compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture);
  if (errors.length) throw new Error(errors.join('\n'));
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(world => {
    const projected = projectWorld(world);
    const flags = classifyPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceWorld(projected);
    const numeric_burden = numericBurden(projected);
    const governance = Object.fromEntries(Object.keys(SECTION_KEYS).map(section => [section, projected[section]]));
    return {
      world_id: projected.world_id,
      description: projected.description,
      ...Object.fromEntries(Object.keys(SECTION_KEYS).map(section => [section, canonical(projected[section])])),
      expected_mechanism: projected.expected_mechanism,
      flags,
      numeric_burden,
      public_signature_sha256: publicSignature,
      repository_transfer_governance_signature_sha256: sha256(governance)
    };
  });
  const metrics = computeMetrics(worlds);
  const classification = canonical(fixture.expected_classification);
  const chain = custodyChain(fixture, worlds, metrics, classification);
  return {
    schema_version: PREFERENCE_LINKAGE_REPOSITORY_OWNER_IMMUTABLE_OWNER_ID_REPOSITORY_ID_TRANSFER_LINEAGE_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_repository_owner_id_transfer_lineage_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    fixture_snapshot_sha256: preferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixtureSnapshot(fixture),
    baseline: canonical(fixture.baseline),
    baseline_snapshot_sha256: publicSignature,
    public_signature_count: new Set(worlds.map(world => world.public_signature_sha256)).size,
    world_count: worlds.length,
    repository_transfer_governance_signature_count: new Set(worlds.map(world => world.repository_transfer_governance_signature_sha256)).size,
    complete_assurance_world_count: worlds.filter(world => world.flags["complete_repository_owner_id_transfer_lineage_assurance"]).length,
    worlds,
    metrics,
    classification,
    required_refusal_rules: [...fixture.required_refusal_rules],
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
    interpretation_contract: canonical(fixture.interpretation_contract)
  };
}

function validateCustodyChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('PC-57 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('PC-57 custody events must be objects'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.event_index !== index + 1) errors.push(`PC-57 custody event ${index} index mismatch`);
    if (event.previous_event_sha256 !== previous) errors.push(`PC-57 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`PC-57 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-57 custody chain head mismatch');
}

export function validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceBuild(build, fixture) {
  const errors = [];
  validateCanonicalJsonTree(build, 'PC-57 build', errors);
  if (errors.length) return unique(errors);
  if (!record(build)) return ['PC-57 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'PC-57 build', errors);
  for (const field of ['worlds','required_refusal_rules','custody_chain']) if (!Array.isArray(build[field])) errors.push(`PC-57 build ${field} must be an array`);
  for (const field of ['baseline','metrics','classification','interpretation_contract']) if (!record(build[field])) errors.push(`PC-57 build ${field} must be an object`);
  if (Array.isArray(build.worlds) && build.worlds.some(world => !record(world))) errors.push('PC-57 compiled worlds must be objects');
  if (errors.length) return unique(errors);
  for (const world of build.worlds) requireExactKeys(world, COMPILED_WORLD_KEYS, `PC-57 compiled world ${world.world_id}`, errors);
  const fixtureErrors = validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture);
  errors.push(...fixtureErrors);
  if (fixtureErrors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture); }
  catch (error) { return [`PC-57 deterministic compile failed: ${error.message}`]; }
  if (stable(build) !== stable(expected)) errors.push('PC-57 build differs from deterministic compilation');
  if (stable(build.metrics) !== stable(EXPECTED_LINKAGE_REPOSITORY_OWNER_ID_TRANSFER_LINEAGE_ASSURANCE_METRICS)) errors.push('PC-57 metrics mismatch');
  if (build.world_count !== 8 || build.complete_assurance_world_count !== 1 || build.public_signature_count !== 1 || build.repository_transfer_governance_signature_count !== 8) errors.push('PC-57 build denominator mismatch');
  if (stable(build.classification) !== stable(EXPECTED_FIXTURE_LITERAL.expected_classification)) errors.push('PC-57 build classification mismatch');
  validateCustodyChain(build, errors);
  return unique(errors);
}

export function renderPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceMarkdown(build) {
  const metricLines = Object.entries(build.metrics).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const worldLines = build.worlds.map(world => `| ${world.world_id} | ${world.expected_mechanism} | ${world.flags["complete_repository_owner_id_transfer_lineage_assurance"] ? 'complete' : 'refused'} | ${Object.values(world.numeric_burden).reduce((sum, value) => sum + value, 0)} |`).join('\n');
  return `# PC-57 immutable owner, repository, and transfer-lineage custody

Synthetic control only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

## Metrics

| Metric | Value |
| --- | ---: |
${metricLines}

## Eight incompatible worlds

| World | Mechanism | Complete assurance | Numeric burden |
| --- | --- | --- | ---: |
${worldLines}

Only one synthetic world satisfies complete immutable-owner, immutable-repository, transfer-event, redirect, namespace-continuity, correction, and current-lineage custody. Public badges remain nonproof of a real ownership, review, security, validity, or authority conclusion.
`;
}
