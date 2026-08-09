import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

export const PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_FIXTURE_SCHEMA_VERSION = "preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance-fixture@1";
export const PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_BUILD_SCHEMA_VERSION = "preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance-build@1";
export const COMPLETE_REPOSITORY_OWNER_LOGIN_ID_STATE_RENAME_ASSURANCE_CLASSIFICATION = "complete_repository_owner_login_id_state_rename_assurance";

const EXPECTED_FIXTURE_ID = "same-linkage-owner-login-id-state-rename-status-different-owner-identity-states-v1";
const EXPECTED_FIXTURE_SNAPSHOT_SHA256 = "9ad19c6c9c16469792c0d6a0e1e80f0d25e0c98832a4a56590d07925f051c772";
const EXPECTED_FIXTURE_LITERAL = Object.freeze({"baseline":{"approved_use":"longitudinal_exposure_estimation","operative_release":"RELEASE-INCIDENT-V1@1","public_immutable_owner_id_status":"immutable_owner_id_verified","public_owner_account_status":"owner_account_current","public_owner_rename_lineage_status":"owner_rename_lineage_verified","public_owner_status":"repository_owner_verified","public_repository_status":"repository_identity_verified","published_candidate_pairs":100,"published_empirical_coverage":0.95,"published_interval_bearing_pairs":100,"published_interval_misses":5,"published_matching_repository_replays":10,"published_mean_interval_width":0.02,"published_nominal_coverage":0.95,"published_repository_replays":10},"captured_at":"2026-08-08","counts_toward_thesis_evidence":false,"expected_classification":{"binding_public_authority_present":false,"complete_repository_owner_login_id_state_rename_assurance_supported_in_at_least_one_world":true,"graph_effect_present":false,"matching_repository_replays_establish_current_owner_assurance":false,"one_account_badge_identifies_complete_account_state":false,"one_owner_login_identifies_immutable_owner":false,"one_owner_numeric_id_identifies_complete_owner":false,"one_reachable_profile_identifies_complete_owner_location":false,"one_rename_redirect_identifies_complete_owner_rename":false,"one_repository_owner_login_identifies_complete_repository_continuity":false,"ownership_established":false,"public_immutable_owner_id_badge_identifies_complete_owner":false,"public_owner_account_badge_identifies_complete_account_state":false,"public_owner_badge_identifies_immutable_owner":false,"public_owner_rename_badge_identifies_complete_rename":false,"published_coverage_establishes_real_world_effect":false,"security_compromise_established":false},"fixture_id":"same-linkage-owner-login-id-state-rename-status-different-owner-identity-states-v1","graph_effect":"none","interpretation_contract":{"copy_ready_caveat":"Verified-looking owner-login, immutable-ID, account-state, and rename-lineage badges do not establish immutable owner identity, exact account state, owner-rename parties and time, repository continuity, correction, or current lineage.","what_this_is":"A synthetic owner-login, immutable-owner-ID, account-state, owner-rename, repository-continuity, correction, and current-lineage control separating one complete-looking public surface from eight incompatible custody states.","what_this_is_not":"A real ownership finding, repository review, source audit, release audit, artifact verification, security finding, interval-validity finding, causal effect, graph fact, allegation, or public-authority verdict."},"issue":1592,"parent_program_issue":594,"required_refusal_rules":["one_owner_login_is_not_immutable_owner_numeric_and_node_identity","one_owner_numeric_id_is_not_owner_node_id_database_id_consistency_type_account_state_locations_and_rename_custody","one_reachable_profile_is_not_canonical_profile_api_location_normalization_redirect_account_state_and_lineage_custody","one_current_account_badge_is_not_active_suspended_deleted_and_site_admin_state_custody","one_rename_redirect_is_not_owner_rename_event_predecessor_successor_timestamp_actor_receipt_and_correction_custody","one_current_owner_surface_is_not_predecessor_successor_profile_and_api_redirect_chain_custody","one_repository_owner_login_is_not_immutable_owner_repository_pairing_transfer_fork_network_branch_release_commit_object_and_protection_continuity","matching_repository_replays_are_not_exact_owner_login_immutable_id_account_state_rename_event_repository_pairing_and_current_lineage","historical_owner_assurance_is_not_current_after_owner_account_rename_repository_transfer_namespace_policy_correction_release_or_use_succession","owner_identity_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_intent_ownership_or_security_compromise","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_owner_identity_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_or_institutional_performance_estimates"],"schema_version":"preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance-fixture@1","status":"synthetic_repository_owner_login_id_state_rename_control","worlds":[{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Complete owner login, immutable IDs, account state, locations, rename event, predecessor and successor, repository continuity, correction, and current lineage are complete.","expected_flags":{"complete_account_state":true,"complete_owner_identity":true,"complete_owner_location":true,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":true,"current_owner_identity_lineage":true},"expected_mechanism":"complete_repository_owner_login_id_state_rename_assurance","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":0},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"complete_repository_owner_login_id_state_rename_assurance"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Immutable owner IDs are preserved while owner login, canonical profile, or API location is substituted or incomplete.","expected_flags":{"complete_account_state":true,"complete_owner_identity":false,"complete_owner_location":false,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"owner_login_profile_or_api_substitution","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":false,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":false,"canonical_profile_url_bound":false,"owner_login_profile_api_substitutions":100,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":false},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"owner_login_profile_or_api_substitution"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Owner login and locations are preserved while immutable owner numeric or node identity is substituted or incomplete.","expected_flags":{"complete_account_state":true,"complete_owner_identity":false,"complete_owner_location":true,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"immutable_owner_id_substitution","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":90,"owner_database_id_consistency_bound":false,"owner_immutable_numeric_id_bound":false,"owner_login_bound":true,"owner_node_id_bound":false,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"immutable_owner_id_substitution"},{"account_state":{"account_state_bound":false,"avatar_url_bound":false,"created_at_bound":false,"deleted_or_ghost_state_bound":false,"owner_type_account_state_gaps":80,"site_admin_state_bound":false,"suspended_state_bound":false,"updated_at_bound":false},"description":"Owner login and immutable IDs are preserved while owner type, active or suspended state, deletion or ghost state, site-admin state, avatar, or timestamps differ.","expected_flags":{"complete_account_state":false,"complete_owner_identity":false,"complete_owner_location":true,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"owner_type_or_account_state_gap","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":false},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"owner_type_or_account_state_gap"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Rename badge is preserved while owner-rename event identity, predecessor login, successor login, timestamp, or actor or system receipt differs.","expected_flags":{"complete_account_state":true,"complete_owner_identity":true,"complete_owner_location":true,"complete_owner_rename_identity":false,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"owner_rename_event_predecessor_or_successor_gap","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":false,"owner_rename_event_predecessor_successor_gaps":70,"predecessor_api_url_bound":true,"predecessor_login_bound":false,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":false,"rename_correction_lineage_bound":false,"rename_timestamp_bound":false,"successor_api_url_bound":true,"successor_login_bound":false,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"owner_rename_event_predecessor_or_successor_gap"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Owner-rename event is preserved while predecessor and successor profile or API locations, canonical redirects, or API redirects are incomplete.","expected_flags":{"complete_account_state":true,"complete_owner_identity":true,"complete_owner_location":false,"complete_owner_rename_identity":false,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"profile_or_api_redirect_chain_gap","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":false,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":60,"profile_redirect_chain_bound":false,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":false,"canonical_redirect_continuity_bound":false,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":false,"predecessor_login_bound":true,"predecessor_profile_url_bound":false,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":false,"successor_login_bound":true,"successor_profile_url_bound":false},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"profile_or_api_redirect_chain_gap"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Owner identity and rename history are preserved while repository-owner pairing, repository locations, transfer, fork network, state, branch, release, review-time commit, object namespace, or protection continuity is incomplete.","expected_flags":{"complete_account_state":true,"complete_owner_identity":true,"complete_owner_location":true,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":false,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":true},"expected_mechanism":"repository_owner_or_transfer_continuity_gap","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":true,"approved_correction_lineage_current":true,"approved_owner_id_lineage_current":true,"approved_owner_location_lineage_current":true,"approved_owner_login_lineage_current":true,"approved_owner_rename_lineage_current":true,"approved_policy_lineage_current":true,"approved_release_lineage_current":true,"approved_repository_continuity_lineage_current":true,"approved_use_lineage_current":true,"assurance_current":true,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":true,"rollback_defined":true,"stale_owner_identity_decisions":0,"unreconciled_owner_identity_decisions":0,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":false,"repository_api_url_continuity_bound":false,"repository_archived_disabled_template_state_continuity_bound":false,"repository_canonical_url_continuity_bound":false,"repository_clone_remote_continuity_bound":false,"repository_default_branch_identity_continuity_bound":false,"repository_fork_network_continuity_bound":false,"repository_full_name_continuity_bound":false,"repository_numeric_id_continuity_bound":false,"repository_owner_immutable_id_pair_bound":false,"repository_owner_login_pair_bound":false,"repository_owner_node_id_pair_bound":false,"repository_owner_transfer_continuity_gaps":50,"repository_protection_policy_continuity_bound":false,"repository_review_time_commit_reachability_bound":false,"repository_tag_release_binding_continuity_bound":false,"repository_transfer_lineage_continuity_bound":false,"repository_visibility_state_continuity_bound":false},"world_id":"repository_owner_or_transfer_continuity_gap"},{"account_state":{"account_state_bound":true,"avatar_url_bound":true,"created_at_bound":true,"deleted_or_ghost_state_bound":true,"owner_type_account_state_gaps":0,"site_admin_state_bound":true,"suspended_state_bound":true,"updated_at_bound":true},"description":"Historical owner-login, immutable-ID, account-state, and rename assurance is inherited after owner, account, rename, repository, transfer, namespace, policy, correction, release, or use succession.","expected_flags":{"complete_account_state":true,"complete_owner_identity":true,"complete_owner_location":true,"complete_owner_rename_identity":true,"complete_repository_owner_continuity":true,"complete_repository_owner_login_id_state_rename_assurance":false,"current_owner_identity_lineage":false},"expected_mechanism":"stale_inherited_owner_identity_assurance","lineage":{"account_state_invalidation_defined":true,"appeal_defined":true,"approved_account_state_lineage_current":false,"approved_correction_lineage_current":false,"approved_owner_id_lineage_current":false,"approved_owner_location_lineage_current":false,"approved_owner_login_lineage_current":false,"approved_owner_rename_lineage_current":false,"approved_policy_lineage_current":false,"approved_release_lineage_current":false,"approved_repository_continuity_lineage_current":false,"approved_use_lineage_current":false,"assurance_current":false,"binding_public_authority":false,"correction_defined":true,"durability_defined":true,"owner_id_invalidation_defined":true,"owner_location_invalidation_defined":true,"owner_login_invalidation_defined":true,"owner_rename_invalidation_defined":true,"policy_invalidation_defined":true,"quarantine_defined":true,"repository_continuity_invalidation_defined":true,"republication_defined":true,"rereview_defined":false,"rollback_defined":true,"stale_owner_identity_decisions":100,"unreconciled_owner_identity_decisions":40,"unsupported_owner_identity_decisions":100},"owner_identity":{"immutable_owner_id_substitutions":0,"owner_database_id_consistency_bound":true,"owner_immutable_numeric_id_bound":true,"owner_login_bound":true,"owner_node_id_bound":true,"owner_type_bound":true},"owner_location":{"api_redirect_chain_bound":true,"api_url_bound":true,"canonical_profile_url_bound":true,"owner_login_profile_api_substitutions":0,"profile_api_redirect_chain_gaps":0,"profile_redirect_chain_bound":true,"url_normalization_bound":true},"owner_rename":{"api_redirect_continuity_bound":true,"canonical_redirect_continuity_bound":true,"owner_rename_event_bound":true,"owner_rename_event_predecessor_successor_gaps":0,"predecessor_api_url_bound":true,"predecessor_login_bound":true,"predecessor_profile_url_bound":true,"rename_actor_or_system_receipt_bound":true,"rename_correction_lineage_bound":true,"rename_timestamp_bound":true,"successor_api_url_bound":true,"successor_login_bound":true,"successor_profile_url_bound":true},"repository_continuity":{"repository_advertised_object_namespace_continuity_bound":true,"repository_api_url_continuity_bound":true,"repository_archived_disabled_template_state_continuity_bound":true,"repository_canonical_url_continuity_bound":true,"repository_clone_remote_continuity_bound":true,"repository_default_branch_identity_continuity_bound":true,"repository_fork_network_continuity_bound":true,"repository_full_name_continuity_bound":true,"repository_numeric_id_continuity_bound":true,"repository_owner_immutable_id_pair_bound":true,"repository_owner_login_pair_bound":true,"repository_owner_node_id_pair_bound":true,"repository_owner_transfer_continuity_gaps":0,"repository_protection_policy_continuity_bound":true,"repository_review_time_commit_reachability_bound":true,"repository_tag_release_binding_continuity_bound":true,"repository_transfer_lineage_continuity_bound":true,"repository_visibility_state_continuity_bound":true},"world_id":"stale_inherited_owner_identity_assurance"}]});

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","baseline","interpretation_contract","required_refusal_rules","expected_classification","worlds"]);
const EXPECTED_BASELINE_KEYS = Object.freeze(["operative_release","published_candidate_pairs","published_interval_bearing_pairs","published_nominal_coverage","published_empirical_coverage","published_interval_misses","published_mean_interval_width","public_repository_status","public_owner_status","public_immutable_owner_id_status","public_owner_account_status","public_owner_rename_lineage_status","published_repository_replays","published_matching_repository_replays","approved_use"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_CLASSIFICATION_KEYS = Object.freeze(["public_owner_badge_identifies_immutable_owner","public_immutable_owner_id_badge_identifies_complete_owner","public_owner_account_badge_identifies_complete_account_state","public_owner_rename_badge_identifies_complete_rename","one_owner_login_identifies_immutable_owner","one_owner_numeric_id_identifies_complete_owner","one_reachable_profile_identifies_complete_owner_location","one_account_badge_identifies_complete_account_state","one_rename_redirect_identifies_complete_owner_rename","one_repository_owner_login_identifies_complete_repository_continuity","matching_repository_replays_establish_current_owner_assurance","published_coverage_establishes_real_world_effect","ownership_established","security_compromise_established","graph_effect_present","binding_public_authority_present","complete_repository_owner_login_id_state_rename_assurance_supported_in_at_least_one_world"]);
const EXPECTED_WORLD_KEYS = Object.freeze(["world_id","description","owner_identity","account_state","owner_location","owner_rename","repository_continuity","lineage","expected_mechanism","expected_flags"]);
const SECTION_KEYS = Object.freeze({"owner_identity":["owner_login_bound","owner_immutable_numeric_id_bound","owner_node_id_bound","owner_database_id_consistency_bound","owner_type_bound","immutable_owner_id_substitutions"],"account_state":["account_state_bound","suspended_state_bound","deleted_or_ghost_state_bound","site_admin_state_bound","avatar_url_bound","created_at_bound","updated_at_bound","owner_type_account_state_gaps"],"owner_location":["canonical_profile_url_bound","api_url_bound","url_normalization_bound","profile_redirect_chain_bound","api_redirect_chain_bound","owner_login_profile_api_substitutions","profile_api_redirect_chain_gaps"],"owner_rename":["owner_rename_event_bound","predecessor_login_bound","successor_login_bound","rename_timestamp_bound","rename_actor_or_system_receipt_bound","predecessor_profile_url_bound","successor_profile_url_bound","predecessor_api_url_bound","successor_api_url_bound","canonical_redirect_continuity_bound","api_redirect_continuity_bound","rename_correction_lineage_bound","owner_rename_event_predecessor_successor_gaps"],"repository_continuity":["repository_owner_login_pair_bound","repository_owner_immutable_id_pair_bound","repository_owner_node_id_pair_bound","repository_numeric_id_continuity_bound","repository_full_name_continuity_bound","repository_canonical_url_continuity_bound","repository_api_url_continuity_bound","repository_clone_remote_continuity_bound","repository_transfer_lineage_continuity_bound","repository_fork_network_continuity_bound","repository_visibility_state_continuity_bound","repository_archived_disabled_template_state_continuity_bound","repository_default_branch_identity_continuity_bound","repository_tag_release_binding_continuity_bound","repository_review_time_commit_reachability_bound","repository_advertised_object_namespace_continuity_bound","repository_protection_policy_continuity_bound","repository_owner_transfer_continuity_gaps"],"lineage":["assurance_current","approved_owner_login_lineage_current","approved_owner_id_lineage_current","approved_account_state_lineage_current","approved_owner_location_lineage_current","approved_owner_rename_lineage_current","approved_repository_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","owner_login_invalidation_defined","owner_id_invalidation_defined","account_state_invalidation_defined","owner_location_invalidation_defined","owner_rename_invalidation_defined","repository_continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined","binding_public_authority","unreconciled_owner_identity_decisions","stale_owner_identity_decisions","unsupported_owner_identity_decisions"]});
const SECTION_BOOLEAN_KEYS = Object.freeze({"owner_identity":["owner_login_bound","owner_immutable_numeric_id_bound","owner_node_id_bound","owner_database_id_consistency_bound","owner_type_bound"],"account_state":["account_state_bound","suspended_state_bound","deleted_or_ghost_state_bound","site_admin_state_bound","avatar_url_bound","created_at_bound","updated_at_bound"],"owner_location":["canonical_profile_url_bound","api_url_bound","url_normalization_bound","profile_redirect_chain_bound","api_redirect_chain_bound"],"owner_rename":["owner_rename_event_bound","predecessor_login_bound","successor_login_bound","rename_timestamp_bound","rename_actor_or_system_receipt_bound","predecessor_profile_url_bound","successor_profile_url_bound","predecessor_api_url_bound","successor_api_url_bound","canonical_redirect_continuity_bound","api_redirect_continuity_bound","rename_correction_lineage_bound"],"repository_continuity":["repository_owner_login_pair_bound","repository_owner_immutable_id_pair_bound","repository_owner_node_id_pair_bound","repository_numeric_id_continuity_bound","repository_full_name_continuity_bound","repository_canonical_url_continuity_bound","repository_api_url_continuity_bound","repository_clone_remote_continuity_bound","repository_transfer_lineage_continuity_bound","repository_fork_network_continuity_bound","repository_visibility_state_continuity_bound","repository_archived_disabled_template_state_continuity_bound","repository_default_branch_identity_continuity_bound","repository_tag_release_binding_continuity_bound","repository_review_time_commit_reachability_bound","repository_advertised_object_namespace_continuity_bound","repository_protection_policy_continuity_bound"],"lineage":["assurance_current","approved_owner_login_lineage_current","approved_owner_id_lineage_current","approved_account_state_lineage_current","approved_owner_location_lineage_current","approved_owner_rename_lineage_current","approved_repository_continuity_lineage_current","approved_policy_lineage_current","approved_correction_lineage_current","approved_release_lineage_current","approved_use_lineage_current","owner_login_invalidation_defined","owner_id_invalidation_defined","account_state_invalidation_defined","owner_location_invalidation_defined","owner_rename_invalidation_defined","repository_continuity_invalidation_defined","policy_invalidation_defined","quarantine_defined","correction_defined","rollback_defined","rereview_defined","republication_defined","appeal_defined","durability_defined","binding_public_authority"]});
const WORLD_IDS = Object.freeze(["complete_repository_owner_login_id_state_rename_assurance","owner_login_profile_or_api_substitution","immutable_owner_id_substitution","owner_type_or_account_state_gap","owner_rename_event_predecessor_or_successor_gap","profile_or_api_redirect_chain_gap","repository_owner_or_transfer_continuity_gap","stale_inherited_owner_identity_assurance"]);
const WORLD_MECHANISMS = Object.freeze({"complete_repository_owner_login_id_state_rename_assurance":"complete_repository_owner_login_id_state_rename_assurance","owner_login_profile_or_api_substitution":"owner_login_profile_or_api_substitution","immutable_owner_id_substitution":"immutable_owner_id_substitution","owner_type_or_account_state_gap":"owner_type_or_account_state_gap","owner_rename_event_predecessor_or_successor_gap":"owner_rename_event_predecessor_or_successor_gap","profile_or_api_redirect_chain_gap":"profile_or_api_redirect_chain_gap","repository_owner_or_transfer_continuity_gap":"repository_owner_or_transfer_continuity_gap","stale_inherited_owner_identity_assurance":"stale_inherited_owner_identity_assurance"});

export const REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_REFUSAL_RULES = Object.freeze(["one_owner_login_is_not_immutable_owner_numeric_and_node_identity","one_owner_numeric_id_is_not_owner_node_id_database_id_consistency_type_account_state_locations_and_rename_custody","one_reachable_profile_is_not_canonical_profile_api_location_normalization_redirect_account_state_and_lineage_custody","one_current_account_badge_is_not_active_suspended_deleted_and_site_admin_state_custody","one_rename_redirect_is_not_owner_rename_event_predecessor_successor_timestamp_actor_receipt_and_correction_custody","one_current_owner_surface_is_not_predecessor_successor_profile_and_api_redirect_chain_custody","one_repository_owner_login_is_not_immutable_owner_repository_pairing_transfer_fork_network_branch_release_commit_object_and_protection_continuity","matching_repository_replays_are_not_exact_owner_login_immutable_id_account_state_rename_event_repository_pairing_and_current_lineage","historical_owner_assurance_is_not_current_after_owner_account_rename_repository_transfer_namespace_policy_correction_release_or_use_succession","owner_identity_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_intent_ownership_or_security_compromise","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_owner_identity_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_or_institutional_performance_estimates"]);
export const LINKAGE_REPOSITORY_OWNER_LOGIN_ID_STATE_RENAME_ASSURANCE_FALSE_CLASSIFICATIONS = Object.freeze({"public_owner_badge_identifies_immutable_owner":false,"public_immutable_owner_id_badge_identifies_complete_owner":false,"public_owner_account_badge_identifies_complete_account_state":false,"public_owner_rename_badge_identifies_complete_rename":false,"one_owner_login_identifies_immutable_owner":false,"one_owner_numeric_id_identifies_complete_owner":false,"one_reachable_profile_identifies_complete_owner_location":false,"one_account_badge_identifies_complete_account_state":false,"one_rename_redirect_identifies_complete_owner_rename":false,"one_repository_owner_login_identifies_complete_repository_continuity":false,"matching_repository_replays_establish_current_owner_assurance":false,"published_coverage_establishes_real_world_effect":false,"ownership_established":false,"security_compromise_established":false,"graph_effect_present":false,"binding_public_authority_present":false});
export const EXPECTED_LINKAGE_REPOSITORY_OWNER_LOGIN_ID_STATE_RENAME_ASSURANCE_METRICS = Object.freeze({"worlds":8,"public_owner_login_id_state_rename_signatures":1,"owner_identity_governance_signatures":8,"complete_owner_identity_assurance_worlds":1,"owner_login_profile_api_substitutions":100,"immutable_owner_id_substitutions":90,"owner_type_account_state_gaps":80,"owner_rename_event_predecessor_successor_gaps":70,"profile_api_redirect_chain_gaps":60,"repository_owner_transfer_continuity_gaps":50,"unreconciled_owner_identity_decisions":40,"stale_owner_identity_decisions":100,"unsupported_owner_identity_decisions":700,"binding_public_authority_worlds":0});

const BUILD_KEYS = Object.freeze(["schema_version","fixture_id","issue","parent_program_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","conclusion_generated","real_world_evidence_state","fixture_snapshot_sha256","baseline","baseline_snapshot_sha256","public_signature_count","world_count","owner_identity_governance_signature_count","complete_assurance_world_count","worlds","metrics","classification","required_refusal_rules","custody_chain","custody_chain_head_sha256","interpretation_contract"]);
const COMPILED_WORLD_KEYS = Object.freeze(["world_id","description","owner_identity","account_state","owner_location","owner_rename","repository_continuity","lineage","expected_mechanism","flags","numeric_burden","public_signature_sha256","owner_identity_governance_signature_sha256"]);
const FLAG_KEYS = Object.freeze(["complete_owner_identity","complete_account_state","complete_owner_location","complete_owner_rename_identity","complete_repository_owner_continuity","current_owner_identity_lineage","complete_repository_owner_login_id_state_rename_assurance"]);
const BURDEN_LOCATIONS = Object.freeze({"owner_login_profile_api_substitutions":["owner_location","owner_login_profile_api_substitutions"],"immutable_owner_id_substitutions":["owner_identity","immutable_owner_id_substitutions"],"owner_type_account_state_gaps":["account_state","owner_type_account_state_gaps"],"owner_rename_event_predecessor_successor_gaps":["owner_rename","owner_rename_event_predecessor_successor_gaps"],"profile_api_redirect_chain_gaps":["owner_location","profile_api_redirect_chain_gaps"],"repository_owner_transfer_continuity_gaps":["repository_continuity","repository_owner_transfer_continuity_gaps"],"unreconciled_owner_identity_decisions":["lineage","unreconciled_owner_identity_decisions"],"stale_owner_identity_decisions":["lineage","stale_owner_identity_decisions"],"unsupported_owner_identity_decisions":["lineage","unsupported_owner_identity_decisions"]});

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
    if (mode === 'method' && typeof C.prototype[property] === 'function') { C.prototype[property].call(value, '__pc58_brand_probe__'); return true; }
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

export function projectPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture) {
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

export const preferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixtureSnapshot = fixture => sha256(projectPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture));

function sectionComplete(section, keys) { return keys.every(key => section[key] === true); }

export function classifyPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceWorld(world) {
  const complete_owner_identity = sectionComplete(world.owner_identity, SECTION_BOOLEAN_KEYS.owner_identity);
  const complete_account_state = sectionComplete(world.account_state, SECTION_BOOLEAN_KEYS.account_state);
  const complete_owner_location = sectionComplete(world.owner_location, SECTION_BOOLEAN_KEYS.owner_location);
  const complete_owner_rename_identity = sectionComplete(world.owner_rename, SECTION_BOOLEAN_KEYS.owner_rename);
  const complete_repository_owner_continuity = sectionComplete(world.repository_continuity, SECTION_BOOLEAN_KEYS.repository_continuity);
  const current_owner_identity_lineage = sectionComplete(
    world.lineage,
    SECTION_BOOLEAN_KEYS.lineage.filter(key => key !== 'binding_public_authority')
  );
  return {
    complete_owner_identity,
    complete_account_state,
    complete_owner_location,
    complete_owner_rename_identity,
    complete_repository_owner_continuity,
    current_owner_identity_lineage,
    ["complete_repository_owner_login_id_state_rename_assurance"]:
      complete_owner_identity &&
      complete_account_state &&
      complete_owner_location &&
      complete_owner_rename_identity &&
      complete_repository_owner_continuity &&
      current_owner_identity_lineage &&
      world.lineage.binding_public_authority === false
  };
}

function numericBurden(world) {
  return Object.fromEntries(Object.entries(BURDEN_LOCATIONS).map(([name, [section, field]]) => [name, world[section][field]]));
}
function computeMetrics(worlds) {
  const metrics = {
    worlds: worlds.length,
    public_owner_login_id_state_rename_signatures: new Set(worlds.map(world => world.public_signature_sha256)).size,
    owner_identity_governance_signatures: new Set(worlds.map(world => world.owner_identity_governance_signature_sha256)).size,
    complete_owner_identity_assurance_worlds: worlds.filter(world => world.flags["complete_repository_owner_login_id_state_rename_assurance"]).length
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
    { event_index: 1, event_id: `${fixture.fixture_id}:fixture`, event_type: 'fixture_frozen', authority: 'preference_custody_pc58_analyst', evidence_class: 'candidate_inference', source_event_ids: [], payload: { fixture_snapshot_sha256: preferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixtureSnapshot(fixture), graph_effect: 'none' } },
    { event_index: 2, event_id: `${fixture.fixture_id}:public`, event_type: 'public_surface_bound', authority: 'preference_custody_pc58_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:fixture`], payload: { baseline_snapshot_sha256: sha256(fixture.baseline), public_signature_count: metrics.public_owner_login_id_state_rename_signatures } },
    { event_index: 3, event_id: `${fixture.fixture_id}:worlds`, event_type: 'incompatible_owner_identity_worlds_separated', authority: 'preference_custody_pc58_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:public`], payload: { world_count: worlds.length, owner_identity_governance_signature_count: metrics.owner_identity_governance_signatures, complete_assurance_world_count: metrics.complete_owner_identity_assurance_worlds } },
    { event_index: 4, event_id: `${fixture.fixture_id}:burdens`, event_type: 'owner_identity_burdens_reconciled', authority: 'preference_custody_pc58_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:worlds`], payload: { metrics: canonical(metrics), binding_public_authority_worlds: metrics.binding_public_authority_worlds } },
    { event_index: 5, event_id: `${fixture.fixture_id}:interpretation`, event_type: 'interpretation_sealed', authority: 'preference_custody_pc58_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${fixture.fixture_id}:burdens`], payload: { classification: canonical(classification), interpretation_contract: canonical(fixture.interpretation_contract), real_world_evidence_state: 'none' } }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture) {
  const errors = [];
  validateCanonicalJsonTree(fixture, 'PC-58 fixture', errors);
  if (errors.length) return unique(errors);
  if (!record(fixture)) return ['PC-58 fixture must be an object'];
  requireExactKeys(fixture, EXPECTED_TOP_LEVEL_KEYS, 'PC-58 fixture', errors);
  for (const field of ['baseline','interpretation_contract','expected_classification']) if (!record(fixture[field])) errors.push(`PC-58 fixture ${field} must be an object`);
  for (const field of ['required_refusal_rules','worlds']) if (!Array.isArray(fixture[field])) errors.push(`PC-58 fixture ${field} must be an array`);
  if (Array.isArray(fixture.worlds) && fixture.worlds.some(world => !record(world))) errors.push('PC-58 fixture worlds must contain objects');
  if (errors.length) return unique(errors);
  requireExactKeys(fixture.baseline, EXPECTED_BASELINE_KEYS, 'PC-58 baseline', errors);
  requireExactKeys(fixture.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'PC-58 interpretation contract', errors);
  requireExactKeys(fixture.expected_classification, EXPECTED_CLASSIFICATION_KEYS, 'PC-58 expected classification', errors);
  if (errors.length) return unique(errors);
  if (fixture.schema_version !== PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_FIXTURE_SCHEMA_VERSION || fixture.fixture_id !== EXPECTED_FIXTURE_ID || fixture.issue !== 1592 || fixture.parent_program_issue !== 594) errors.push('PC-58 identity binding mismatch');
  if (fixture.captured_at !== "2026-08-08" || !isoDate(fixture.captured_at)) errors.push('PC-58 capture date mismatch');
  if (fixture.status !== 'synthetic_repository_owner_login_id_state_rename_control' || fixture.graph_effect !== 'none' || fixture.counts_toward_thesis_evidence !== false) errors.push('PC-58 authority/status mismatch');
  if (stable(fixture.baseline) !== stable(EXPECTED_FIXTURE_LITERAL.baseline)) errors.push('PC-58 baseline mismatch');
  if (stable(fixture.interpretation_contract) !== stable(EXPECTED_FIXTURE_LITERAL.interpretation_contract)) errors.push('PC-58 interpretation mismatch');
  if (stable(fixture.required_refusal_rules) !== stable(REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_REFUSAL_RULES)) errors.push('PC-58 refusal-rule ledger mismatch');
  if (stable(fixture.expected_classification) !== stable(EXPECTED_FIXTURE_LITERAL.expected_classification)) errors.push('PC-58 classification contract mismatch');
  if (fixture.worlds.length !== WORLD_IDS.length) errors.push('PC-58 must contain exactly eight worlds');
  const ids = fixture.worlds.map(world => world.world_id);
  if (stable(ids) !== stable(WORLD_IDS)) errors.push('PC-58 world order or identity mismatch');
  for (const world of fixture.worlds) {
    requireExactKeys(world, EXPECTED_WORLD_KEYS, `PC-58 world ${world.world_id}`, errors);
    let valid = true;
    for (const [section, keys] of Object.entries(SECTION_KEYS)) {
      if (!record(world[section])) { errors.push(`PC-58 world ${world.world_id} ${section} must be an object`); valid = false; continue; }
      requireExactKeys(world[section], keys, `PC-58 world ${world.world_id} ${section}`, errors);
      for (const key of SECTION_BOOLEAN_KEYS[section]) if (typeof world[section][key] !== 'boolean') errors.push(`PC-58 world ${world.world_id} ${section}.${key} must be boolean`);
    }
    if (!record(world.expected_flags)) { errors.push(`PC-58 world ${world.world_id} expected_flags must be an object`); valid = false; }
    else {
      requireExactKeys(world.expected_flags, FLAG_KEYS, `PC-58 world ${world.world_id} expected flags`, errors);
      for (const key of FLAG_KEYS) if (typeof world.expected_flags[key] !== 'boolean') errors.push(`PC-58 world ${world.world_id} flag ${key} must be boolean`);
    }
    for (const [name, [section, field]] of Object.entries(BURDEN_LOCATIONS)) if (!nonNegativeInteger(world[section]?.[field])) errors.push(`PC-58 world ${world.world_id} burden ${name} must be a non-negative integer`);
    if (world.expected_mechanism !== WORLD_MECHANISMS[world.world_id]) errors.push(`PC-58 world ${world.world_id} mechanism mismatch`);
    if (valid && stable(classifyPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceWorld(world)) !== stable(world.expected_flags)) errors.push(`PC-58 world ${world.world_id} flag mismatch`);
  }
  if (errors.length) return unique(errors);
  const snapshot = preferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixtureSnapshot(fixture);
  if (snapshot !== EXPECTED_FIXTURE_SNAPSHOT_SHA256 || stable(fixture) !== stable(EXPECTED_FIXTURE_LITERAL)) errors.push(`PC-58 fixture snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

export function compilePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture) {
  const errors = validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture);
  if (errors.length) throw new Error(errors.join('\n'));
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(world => {
    const projected = projectWorld(world);
    const flags = classifyPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceWorld(projected);
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
      owner_identity_governance_signature_sha256: sha256(governance)
    };
  });
  const metrics = computeMetrics(worlds);
  const classification = canonical(fixture.expected_classification);
  const chain = custodyChain(fixture, worlds, metrics, classification);
  return {
    schema_version: PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_repository_owner_login_id_state_rename_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    fixture_snapshot_sha256: preferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixtureSnapshot(fixture),
    baseline: canonical(fixture.baseline),
    baseline_snapshot_sha256: publicSignature,
    public_signature_count: new Set(worlds.map(world => world.public_signature_sha256)).size,
    world_count: worlds.length,
    owner_identity_governance_signature_count: new Set(worlds.map(world => world.owner_identity_governance_signature_sha256)).size,
    complete_assurance_world_count: worlds.filter(world => world.flags["complete_repository_owner_login_id_state_rename_assurance"]).length,
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
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('PC-58 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('PC-58 custody events must be objects'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.event_index !== index + 1) errors.push(`PC-58 custody event ${index} index mismatch`);
    if (event.previous_event_sha256 !== previous) errors.push(`PC-58 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`PC-58 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-58 custody chain head mismatch');
}

export function validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceBuild(build, fixture) {
  const errors = [];
  validateCanonicalJsonTree(build, 'PC-58 build', errors);
  if (errors.length) return unique(errors);
  if (!record(build)) return ['PC-58 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'PC-58 build', errors);
  for (const field of ['worlds','required_refusal_rules','custody_chain']) if (!Array.isArray(build[field])) errors.push(`PC-58 build ${field} must be an array`);
  for (const field of ['baseline','metrics','classification','interpretation_contract']) if (!record(build[field])) errors.push(`PC-58 build ${field} must be an object`);
  if (Array.isArray(build.worlds) && build.worlds.some(world => !record(world))) errors.push('PC-58 compiled worlds must be objects');
  if (errors.length) return unique(errors);
  for (const world of build.worlds) requireExactKeys(world, COMPILED_WORLD_KEYS, `PC-58 compiled world ${world.world_id}`, errors);
  const fixtureErrors = validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture);
  errors.push(...fixtureErrors);
  if (fixtureErrors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture); }
  catch (error) { return [`PC-58 deterministic compile failed: ${error.message}`]; }
  if (stable(build) !== stable(expected)) errors.push('PC-58 build differs from deterministic compilation');
  if (stable(build.metrics) !== stable(EXPECTED_LINKAGE_REPOSITORY_OWNER_LOGIN_ID_STATE_RENAME_ASSURANCE_METRICS)) errors.push('PC-58 metrics mismatch');
  if (build.world_count !== 8 || build.complete_assurance_world_count !== 1 || build.public_signature_count !== 1 || build.owner_identity_governance_signature_count !== 8) errors.push('PC-58 build denominator mismatch');
  if (stable(build.classification) !== stable(EXPECTED_FIXTURE_LITERAL.expected_classification)) errors.push('PC-58 build classification mismatch');
  validateCustodyChain(build, errors);
  return unique(errors);
}

export function renderPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceMarkdown(build) {
  const metricLines = Object.entries(build.metrics).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const worldLines = build.worlds.map(world => `| ${world.world_id} | ${world.expected_mechanism} | ${world.flags["complete_repository_owner_login_id_state_rename_assurance"] ? 'complete' : 'refused'} | ${Object.values(world.numeric_burden).reduce((sum, value) => sum + value, 0)} |`).join('\n');
  return `# PC-58 owner login, immutable owner ID, account state, and owner-rename custody

Synthetic control only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

## Metrics

| Metric | Value |
| --- | ---: |
${metricLines}

## Eight incompatible worlds

| World | Mechanism | Complete assurance | Numeric burden |
| --- | --- | --- | ---: |
${worldLines}

Only one synthetic world satisfies complete owner-login, immutable-owner-ID, account-state, owner-location, owner-rename, repository-continuity, correction, and current-lineage custody. Public badges remain nonproof of a real ownership, review, security, validity, or authority conclusion.
`;
}
