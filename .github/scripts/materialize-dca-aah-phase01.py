#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.cwd()
AS_OF = "2026-07-29"


def write_json(path: str, value) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def write_text(path: str, value: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value.rstrip() + "\n")


portfolios = [
    ("AAH-01", "Recognition Residual Registry", "Measure repeated observable output independently of conventional status metadata.", "five bounded collaborations producing independently reviewable results"),
    ("AAH-02", "Repair-Capable Partner Graph", "Measure behavior after accurate contradiction as an R&D partnership signal, not a friendship score.", "five contradiction-to-correction sequences with preserved custody and follow-through"),
    ("AAH-03", "Generalist and Translator Benchmark", "Test transfer, error correction, evidence discipline, and clean handoff across unrelated systems.", "one operator completing three unrelated valid handoffs"),
    ("AAH-04", "Personnel and Tacit-Knowledge Routing", "Track bounded movement of skill, vocabulary, customer familiarity, doctrine, and institutional access without inferring coordination.", "one source-custodied tacit-knowledge transfer packet"),
    ("AAH-05", "Community-Amplitude Arbitrage", "Use demanding adoption, rapid feedback, shared proof, and mutual amplification as non-VC capital.", "one bounded external-tool integration with reciprocal value receipt"),
    ("AAH-06", "Rejected Bidder and Non-Winner Denominator", "Recover complete eligible fields and the alternatives removed before comparison.", "one complete counterfactual market map"),
    ("AAH-07", "Failed-Path Archaeology", "Turn failed pilots, cancellations, adverse tests, postmortems, and workarounds into reusable design constraints.", "one reusable failure packet"),
    ("AAH-08", "Abandoned OSS, Stranded IP, and Displaced Maintainers", "Recover sound components only where rights, demand, integration, and bounded maintenance are demonstrated.", "one rights-cleared recovery assessment"),
    ("AAH-09", "Boring Seam Registry", "Map calibration, documentation, testing, maintenance, training, migration, interoperability, recovery, and handoff substrate.", "one seam with named buyer, dependency, and proof object"),
    ("AAH-10", "Allied and Small-State Sovereignty", "Connect host-nation mission, local capacity, disclosure, interoperability, training, custody, ownership, and exit.", "one operating-sovereignty route pack"),
    ("AAH-11", "Public Contribution and Residual Rights Ledger", "Trace public inputs and the ownership, audit, transition, recovery, and value rights retained in return.", "one public contribution ledger and ex-ante covenant"),
    ("AAH-12", "Interface and Ontology Chokepoint Map", "Map practical control in schemas, identity, transformations, permissions, workflows, registries, configuration, and accreditation.", "one interface sovereignty map"),
    ("AAH-13", "Exit and Substitution Laboratory", "Attempt controlled exit across data, schema, workflow, permissions, models, audit, integrations, training, continuity, deletion, and successor governance.", "one controlled exit drill"),
    ("AAH-14", "Independent Evidence Custody", "Preserve input, transformations, versions, thresholds, actions, overrides, rejected options, corrections, outcomes, and custody outside the gateholder.", "one signed portable action packet"),
    ("AAH-15", "Repairability Radar", "Monitor whether binding notice, pause, burden shift, reversal, remedy, substitution, co-governance, value recovery, custody, exit, and durability remain operational.", "one threshold-change alert with source custody"),
    ("AAH-16", "Institutional Locomotion Packages", "Move a bounded object through a known gate using exact requirements, prohibited claims, missing inputs, validation, and clean handoff.", "one additional valid route package"),
    ("AAH-17", "Claim-to-Proof Red-Team Audit", "Convert vendor, investor, policy, or technical claims into rules, parameters, evidence, gaps, alternatives, tests, and bounded adjudication.", "one public-source proof pack"),
    ("AAH-18", "Recognition Integrity Audit", "Test whether evaluator comprehension ceilings become applicant credibility ceilings while preserving evaluator jurisdiction and controls.", "one standing pack with attribution-symmetry tests"),
    ("AAH-19", "Public Probe and Telemetry Engine", "Route bounded audience reactions into source acquisition without treating attention or silence as motive.", "one telemetry-to-acquisition receipt"),
    ("AAH-20", "Question 4 Counterpower Pilot", "Run a low-risk real workflow with operator, affected-party standing, independent custody, stop authority, and a published success/failure contract.", "one preserved field-attempt receipt"),
    ("AAH-21", "Cognitive Attention Governor", "Preserve branches, context, thresholds, anomalies, and resumability while keeping classification and adjudication human-visible.", "one attention-saved benchmark without degraded decisions"),
    ("AAH-22", "Anti-Capture Constitution", "Require role-neutral denominators, controls, failed paths, update conditions, appeal, correction, and no status or similarity promotion.", "one adversarial audit showing the preferred theory can fail"),
]

portfolio_rows = [
    {
        "portfolio_id": portfolio_id,
        "title": title,
        "objective": objective,
        "minimum_initial_proof": proof,
        "authority": "program_route_below_evidence",
        "graph_effect": "none",
    }
    for portfolio_id, title, objective, proof in portfolios
]

master_fields = [
    "hunt_id", "surface", "domain", "jurisdiction", "protected_center",
    "selector_or_gateholder", "selection_rule", "status_signal",
    "discarded_person_option_or_capability", "observed_output", "support_received",
    "support_missing", "status_output_residual", "exclusion_or_discount_mechanism",
    "counterfactual_support_gap", "comparable_selected_object", "public_contribution",
    "private_rights", "interface_or_dependency", "custody_holder", "exit_condition",
    "acquisition_cost", "verification_cost", "integration_cost", "time_to_value",
    "buyer_or_beneficiary", "minimum_proof_object", "missing_receipt",
    "alternative_explanation", "counterevidence", "falsifier", "commercial_wedge",
    "counterpower_wedge", "field_test_route", "review_state", "graph_effect",
]

dca = {
    "schema_version": "dca-h01-field-hypothesis@1",
    "hypothesis_id": "DCA-H01",
    "program_id": "M-05",
    "as_of": AS_OF,
    "title": "Distributed counterpower aversion and self-sealing sovereignty",
    "status": "working_field_hypothesis",
    "canonicality": "validated_branch_shadow_pending_merge",
    "source_issue": 416,
    "authority": "project_research_contract_below_constitution",
    "hypothesis": "Self-sealing sovereignty can emerge as distributed counterpower aversion: separate actors with different ideologies and local objectives repeatedly preserve the protected center's freedom from binding correction.",
    "negative_constitution": "No external contradiction may become binding unless the protected center admits it on terms the center controls.",
    "causal_sequence": [
        "status_prior", "epistemic_prior", "admissibility_rule", "narrowed_option_set",
        "institutional_conversion", "infrastructure_and_dependency",
        "retained_authority_and_value", "weakened_correction",
        "prior_status_judgment_becomes_materially_true",
    ],
    "bounded_k0_sequence": [
        "qualified_knower", "documented_contradiction", "competence_or_standing_reclassified",
        "explanation_mutated", "institutional_gate_exercised", "material_consequence",
        "feedback_source_removed", "correction_substitution_or_exit_blocked",
    ],
    "noncentralized_mechanisms": [
        {"mechanism_id": "DCA-M01", "label": "public_status_signaling"},
        {"mechanism_id": "DCA-M02", "label": "personnel_routing"},
        {"mechanism_id": "DCA-M03", "label": "compatible_interfaces"},
        {"mechanism_id": "DCA-M04", "label": "selection_effects"},
        {"mechanism_id": "DCA-M05", "label": "counterfactual_foreclosure"},
    ],
    "required_record_partitions": [
        "observed_fact", "working_interpretation", "alternative_explanation",
        "counterevidence", "missing_receipt", "mechanism_candidate",
        "field_hypothesis_contribution", "falsifier",
    ],
    "controls": [
        "ordinary disagreement without reclassification",
        "legitimate discipline and performance action",
        "strategic deception or bypass rather than comprehension failure",
        "gateholders who update correctly",
        "unsanctioned knowers who retain standing",
        "independent stays and reversals",
        "successful public or civic substitutes",
        "affected-party bodies with real authority",
        "failed attempts to remove a feedback source",
        "strong inspection with weak remedy",
        "remedy without pre-action timing",
        "institutions that preserve alternatives and publish failed paths",
    ],
    "falsifiers": [
        "unsanctioned qualified knowers retain standing after contradiction",
        "contradiction enters the authoritative record without source recoding",
        "the option set expands rather than contracts",
        "independent actors pause the gate before material consequence",
        "the burden shifts to the institution exercising power",
        "correction remedy substitution or exit occurs without absorption",
        "public capacity or a failed alternative accumulates comparable evidence",
        "affected parties gain durable co-governance",
        "residual public value is recovered or distributed",
        "correction survives leadership vendor contract and successor change",
    ],
    "permitted_terminal_dispositions": [
        "supported_as_bounded_field_mechanism", "retained_as_partial_or_domain_limited",
        "bounded_non_link", "falsified", "selection_unresolved", "source_restricted",
        "requires_named_acquisition",
    ],
    "boundaries": {
        "same_mechanism_proves_communication": False,
        "same_institutional_shape_proves_coordination": False,
        "compatible_local_incentives_prove_shared_blueprint": False,
        "personnel_movement_proves_common_purpose": False,
        "functional_integration_proves_one_legal_organization": False,
        "silence_proves_hostility_or_monitoring": False,
        "prevalence_determined": False,
        "coordination_conclusion_generated": False,
        "common_purpose_conclusion_generated": False,
        "personal_hostility_conclusion_generated": False,
        "graph_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
    },
}

aah = {
    "schema_version": "aah-00-program-contract@1",
    "program_id": "AAH-00",
    "as_of": AS_OF,
    "title": "Asymmetric Advantage Hunt",
    "status": "phase_01_grammar_materialized",
    "canonicality": "validated_branch_shadow_pending_merge",
    "source_issue": 418,
    "companion_hypothesis": "DCA-H01",
    "authority": "project_program_contract_below_constitution",
    "objective": "Recover and convert the people, knowledge, alternatives, rights, interfaces, and correction mechanisms systematically underpriced or discarded by status-dependent selectors.",
    "causal_route": [
        "status_biased_recognition", "discarded_capability_or_alternative",
        "preserved_evidence", "independent_proof", "low_cost_acquisition_or_partnership",
        "integration_into_working_system", "useful_product_or_counterpower",
        "durable_value_and_field_evidence",
    ],
    "operating_instruction": [
        "build_the_alternative_recognition_system",
        "recover_the_inventory_the_selector_discards",
        "own_the_proof_exit_custody_and_correction_layers",
        "make_paid_engagements_feed_the_lake",
        "make_public_probes_route_acquisition",
        "make_field_failure_improve_the_instrument",
    ],
    "master_hunt_record_fields": master_fields,
    "priority_formula": {
        "numerator": [
            "status_output_residual", "consequence", "evidence_availability",
            "option_set_loss", "buyer_urgency", "transferability",
        ],
        "denominator": [
            "verification_burden", "integration_cost", "legal_exposure", "false_positive_risk",
        ],
        "status_output_residual_is": "hunt_signal_only",
    },
    "portfolios": portfolio_rows,
    "commercial_products": [
        {"product_id": "ROUTE-PACK", "buyer": "individuals_small_firms_partner_governments", "output": "valid_movement_through_institutional_gate"},
        {"product_id": "PROOF-PACK", "buyer": "investors_journalists_vendors_public_buyers", "output": "claim_to_evidence_adjudication_and_test_plan"},
        {"product_id": "EXIT-PACK", "buyer": "enterprises_agencies_allies_insurers", "output": "practical_substitution_and_operating_sovereignty_audit"},
        {"product_id": "VALUE-PACK", "buyer": "public_buyers_auditors_legislators", "output": "public_contribution_and_residual_rights_ledger"},
        {"product_id": "STANDING-PACK", "buyer": "employers_funders_procurement_bodies", "output": "recognition_integrity_and_evaluator_jurisdiction_audit"},
        {"product_id": "REPAIRABILITY-RADAR", "buyer": "regulators_insurers_civil_society_strategy_teams", "output": "warning_when_binding_correction_mechanisms_disappear"},
    ],
    "convergence_train": [
        {"phase": 1, "name": "freeze_the_grammar", "status": "materialized_on_branch"},
        {"phase": 2, "name": "seed_thirty_candidates", "status": "open_zero_of_thirty"},
        {"phase": 3, "name": "produce_four_proofs", "status": "open_zero_of_four"},
        {"phase": 4, "name": "automate_only_common_substrate", "status": "not_started"},
        {"phase": 5, "name": "field_gate", "status": "not_authorized"},
    ],
    "automation_ceiling": {
        "automatable": [
            "requirements_extraction", "source_registry", "missing_input_ledger",
            "render_validation", "claim_ledger", "interface_inventory",
            "custody_receipt", "report_generation", "handoff_packaging",
        ],
        "human_visible_judgment": [
            "classification", "proof_ceiling", "acceptance", "consequence",
        ],
    },
    "closure_requirements": {
        "canonical_graph_inert_schema_and_validator": True,
        "ontology_namespace_crosswalk": True,
        "typed_candidates_required": 30,
        "typed_candidates_current": 0,
        "independently_reviewable_proofs_required": 4,
        "independently_reviewable_proofs_current": 0,
        "question_4_field_attempt_required": 1,
        "question_4_field_attempts_current": 0,
    },
    "permitted_terminal_dispositions": [
        "verified_advantage", "bounded_commercial_wedge", "bounded_counterpower_wedge",
        "control_case", "non_transferable", "rights_blocked",
        "integration_burden_exceeds_value", "false_positive", "selection_unresolved",
        "source_restricted", "requires_named_acquisition",
    ],
    "boundaries": {
        "status_output_residual_proves_hidden_genius": False,
        "attention_concentration_proves_motive": False,
        "personnel_movement_proves_coordination": False,
        "similarity_proves_common_purpose": False,
        "silence_proves_hostility": False,
        "issue_text_is_canonical_object": False,
        "public_probe_is_field_evidence": False,
        "internal_proof_is_external_adoption": False,
        "graph_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
    },
}

crosswalk = {
    "schema_version": "dca-aah-ontology-crosswalk@1",
    "crosswalk_id": "DCA-AAH-XW-01",
    "as_of": AS_OF,
    "status": "phase_01_frozen",
    "canonicality": "validated_branch_shadow_pending_merge",
    "prerequisite_line": {
        "poof_clifford_ecology": "present_and_reconciled_on_branch",
        "k0_q02": "executed_as_ninth_frozen_template_on_branch",
        "canonical_main_claimed": False,
    },
    "object_families": [
        {"family_id": "K0", "namespace": "K0-*", "authority": "canonical_graph_inert_epistemic_layer", "role": "bounded contradiction_to_gate observations", "may_create_actor_edge": False},
        {"family_id": "CLIFFORD", "namespace": "existing_claim_event_receipt_surface_ids", "authority": "evidence_authority", "role": "source custody identities claims events review and bounded surfaces", "may_create_actor_edge": "only_under_existing_clifford_law"},
        {"family_id": "POOF", "namespace": "POOF-*", "authority": "projection_and_publication_below_evidence", "role": "sequence interpretation comprehension audit and graph_inert referral", "may_create_actor_edge": False},
        {"family_id": "REAL_STEEL", "namespace": "existing_fixture_ids", "authority": "known_positive_boundary_fixture", "role": "mechanism fixtures_not_prevalence_denominator", "may_create_actor_edge": False},
        {"family_id": "ANSWERABLE_POWER", "namespace": "M05-* and F0-F7", "authority": "constitutional_method_and_field_program", "role": "inspection pause reversal remedy substitution governance exit and durability", "may_create_actor_edge": False},
        {"family_id": "ESTATE", "namespace": "existing_estate_and_custody_ids", "authority": "custody_coverage_and_routing", "role": "denominator acquisition source custody waterline and semantic ownership", "may_create_actor_edge": False},
        {"family_id": "DCA", "namespace": "DCA-*", "authority": "working_field_hypothesis_below_constitution", "role": "role_neutral_recurring_mechanism_and_falsifier records", "may_create_actor_edge": False},
        {"family_id": "AAH", "namespace": "AAH-*", "authority": "program_route_below_evidence", "role": "discarded_inventory hunt proof exit custody correction and commercial routing", "may_create_actor_edge": False},
    ],
    "typed_transactions": [
        {"from": "K0", "to": "DCA", "transaction": "bounded_mechanism_candidate", "effect": "graph_none", "required": ["source_ids", "alternative_explanations", "counterevidence", "falsifier"]},
        {"from": "CLIFFORD", "to": "DCA", "transaction": "source_custodied_observation", "effect": "no_authority_transfer_beyond_receipt", "required": ["source_ids", "review_state"]},
        {"from": "POOF", "to": "DCA", "transaction": "graph_inert_referral", "effect": "challenge_routes_inward_only", "required": ["referral_id", "graph_effect_none"]},
        {"from": "REAL_STEEL", "to": "DCA", "transaction": "known_positive_fixture", "effect": "boundary_fixture_not_denominator", "required": ["fixture_id", "non_prevalence_boundary"]},
        {"from": "ANSWERABLE_POWER", "to": "DCA", "transaction": "correction_topology_and_falsifier", "effect": "positive_control_or_field_attack", "required": ["timing", "standing", "binding_effect", "durability"]},
        {"from": "ESTATE", "to": "AAH", "transaction": "named_acquisition_route", "effect": "routing_only", "required": ["custody_holder", "missing_receipt", "next_action"]},
        {"from": "DCA", "to": "AAH", "transaction": "discarded_inventory_hunt_signal", "effect": "reaction_routes_search_not_motive", "required": ["alternative_explanation", "counterevidence", "falsifier"]},
        {"from": "AAH", "to": "CLIFFORD", "transaction": "ordinary_review_referral", "effect": "no_backward_fact_write", "required": ["minimum_proof_object", "source_ids", "graph_effect_none"]},
        {"from": "AAH", "to": "ANSWERABLE_POWER", "transaction": "proof_or_field_test_route", "effect": "no_adoption_without_observed_binding_correction", "required": ["field_test_route", "affected_party_standing", "custody", "stop_authority"]},
    ],
    "identifier_law": [
        "preserve_original_source_identifiers",
        "never_reuse_actor_or_organization_ids_for_hypothesis_or_hunt_objects",
        "DCA_records_use_DCA_R_prefix",
        "AAH_hunts_use_AAH_H_prefix",
        "cross_system_links_are_typed_references_not_graph_edges",
        "unresolved_identity_remains_explicit",
    ],
    "forbidden_promotions": [
        "same_mechanism_to_communication",
        "same_shape_to_coordination",
        "compatible_interface_to_common_purpose",
        "personnel_movement_to_collective_intent",
        "status_output_residual_to_hidden_genius",
        "attention_or_silence_to_motive_hostility_monitoring_or_suppression",
        "POOF_prose_to_Clifford_evidence",
        "AAH_hunt_signal_to_finding",
        "internal_proof_to_external_adoption",
        "issue_text_to_canonical_object",
    ],
    "authority_flow": {
        "evidence_moves_outward": True,
        "challenges_move_inward_as_referrals": True,
        "publication_writes_facts_backward": False,
        "graph_effect": "none",
    },
}

dca_registry = {
    "schema_version": "dca-recurrence-registry@1",
    "hypothesis_id": "DCA-H01",
    "as_of": AS_OF,
    "status": "zero_state_open_denominator",
    "records": [],
    "counts": {"records": 0, "included_field_recurrences": 0, "controls": 0, "falsified": 0},
    "boundaries": {"prevalence_determined": False, "graph_effect": "none", "publication_effect": "none"},
}

aah_registry = {
    "schema_version": "aah-hunt-registry@1",
    "program_id": "AAH-00",
    "as_of": AS_OF,
    "status": "zero_state_phase_02_open",
    "records": [],
    "denominator": {"target": 30, "current": 0, "complete": False},
    "proofs": {"target": 4, "current": 0, "complete": False},
    "field_attempts": {"target": 1, "current": 0, "authorized": False},
    "boundaries": {"graph_effect": "none", "publication_effect": "none", "adoption_effect": "none"},
}

seed_classes = [
    ("AAH-SEED-01", "status_output_mismatch", 5, ["AAH-01", "AAH-03", "AAH-18"]),
    ("AAH-SEED-02", "repair_capable_partner", 5, ["AAH-02", "AAH-05"]),
    ("AAH-SEED-03", "rejected_or_forgotten_alternative", 5, ["AAH-06", "AAH-07", "AAH-08", "AAH-09"]),
    ("AAH-SEED-04", "public_contribution_gap", 5, ["AAH-11"]),
    ("AAH-SEED-05", "interface_or_exit_chokepoint", 5, ["AAH-10", "AAH-12", "AAH-13", "AAH-14"]),
    ("AAH-SEED-06", "repairability_threshold_event", 5, ["AAH-15", "AAH-20", "AAH-22"]),
]

seed_denominator = {
    "schema_version": "aah-seed-denominator@1",
    "program_id": "AAH-00",
    "as_of": AS_OF,
    "status": "frozen_target_zero_state",
    "target_total": 30,
    "current_total": 0,
    "classes": [
        {
            "seed_class_id": class_id,
            "label": label,
            "target": target,
            "current": 0,
            "portfolio_routes": routes,
            "candidate_ids": [],
            "required_controls": ["comparable_control", "explicit_reason_candidate_may_be_wrong", "alternative_explanation", "counterevidence", "falsifier"],
        }
        for class_id, label, target, routes in seed_classes
    ],
    "counting_law": [
        "slot_is_not_candidate",
        "query_hit_is_not_candidate",
        "attention_is_not_evidence",
        "candidate_requires_typed_record_and_source_route",
        "no_candidate_counts_twice_across_seed_classes",
    ],
    "graph_effect": "none",
}

write_json("data/project/dca-h01-field-hypothesis.json", dca)
write_json("data/project/aah-00-program-contract.json", aah)
write_json("data/project/dca-aah-ontology-crosswalk.json", crosswalk)
write_json("data/project/dca-recurrence-registry.json", dca_registry)
write_json("data/project/aah-hunt-registry.json", aah_registry)
write_json("data/project/aah-seed-denominator.json", seed_denominator)

string_or_null = {"type": ["string", "null"]}
number_or_null = {"type": ["number", "null"]}
array_strings = {"type": "array", "items": {"type": "string"}}

dca_schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://clifford-number.invalid/schemas/dca-field-record.schema.json",
    "title": "Distributed counterpower aversion field record",
    "type": "object",
    "additionalProperties": False,
    "required": [
        "record_id", "case_id", "domain", "jurisdiction", "protected_center", "bounded_gate",
        "status_prior", "epistemic_prior", "qualified_knower_or_alternative", "contradiction",
        "reclassification", "explanation_mutation", "option_set_effect", "conversion_instrument",
        "infrastructure_effect", "dependency_effect", "residual_authority_or_value",
        "correction_topology", "status_signal", "personnel_router", "compatible_interface",
        "selection_effect", "counterfactual_foreclosure", "observed_fact", "working_interpretation",
        "alternative_explanations", "counterevidence", "matched_control", "falsifier", "missing_receipt",
        "mechanism_candidate", "field_hypothesis_contribution", "source_ids", "confidence", "review_state",
        "graph_effect"
    ],
    "properties": {
        "record_id": {"type": "string", "pattern": "^DCA-R[0-9]{4,}$"},
        "case_id": {"type": "string", "minLength": 1},
        "domain": {"type": "string", "minLength": 1},
        "jurisdiction": {"type": "string", "minLength": 1},
        "protected_center": string_or_null,
        "bounded_gate": {"type": "string", "minLength": 1},
        "status_prior": string_or_null,
        "epistemic_prior": string_or_null,
        "qualified_knower_or_alternative": string_or_null,
        "contradiction": string_or_null,
        "reclassification": string_or_null,
        "explanation_mutation": string_or_null,
        "option_set_effect": string_or_null,
        "conversion_instrument": string_or_null,
        "infrastructure_effect": string_or_null,
        "dependency_effect": string_or_null,
        "residual_authority_or_value": string_or_null,
        "correction_topology": string_or_null,
        "status_signal": string_or_null,
        "personnel_router": string_or_null,
        "compatible_interface": string_or_null,
        "selection_effect": string_or_null,
        "counterfactual_foreclosure": string_or_null,
        "observed_fact": array_strings,
        "working_interpretation": array_strings,
        "alternative_explanations": array_strings,
        "counterevidence": array_strings,
        "matched_control": string_or_null,
        "falsifier": array_strings,
        "missing_receipt": array_strings,
        "mechanism_candidate": {"type": "array", "items": {"enum": ["public_status_signaling", "personnel_routing", "compatible_interfaces", "selection_effects", "counterfactual_foreclosure"]}},
        "field_hypothesis_contribution": {"enum": ["supports", "weakens", "falsifies", "control", "unresolved"]},
        "source_ids": array_strings,
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "review_state": {"enum": ["discovery", "source_routed", "evidence_sufficient", "bounded_non_link", "falsified", "selection_unresolved", "source_restricted", "requires_named_acquisition"]},
        "graph_effect": {"const": "none"},
    },
}

review_states = [
    "discovery", "source_routed", "evidence_sufficient", "verified_advantage",
    "bounded_commercial_wedge", "bounded_counterpower_wedge", "control_case",
    "non_transferable", "rights_blocked", "integration_burden_exceeds_value",
    "false_positive", "selection_unresolved", "source_restricted", "requires_named_acquisition",
]

aah_properties = {
    "hunt_id": {"type": "string", "pattern": "^AAH-H[0-9]{4,}$"},
    "surface": {"type": "string", "minLength": 1},
    "domain": {"type": "string", "minLength": 1},
    "jurisdiction": {"type": "string", "minLength": 1},
    "protected_center": string_or_null,
    "selector_or_gateholder": string_or_null,
    "selection_rule": string_or_null,
    "status_signal": string_or_null,
    "discarded_person_option_or_capability": {"type": "string", "minLength": 1},
    "observed_output": array_strings,
    "support_received": array_strings,
    "support_missing": array_strings,
    "status_output_residual": {"type": ["number", "null"], "description": "Routing signal only; not a finding of hidden genius."},
    "exclusion_or_discount_mechanism": string_or_null,
    "counterfactual_support_gap": string_or_null,
    "comparable_selected_object": string_or_null,
    "public_contribution": array_strings,
    "private_rights": array_strings,
    "interface_or_dependency": array_strings,
    "custody_holder": string_or_null,
    "exit_condition": string_or_null,
    "acquisition_cost": number_or_null,
    "verification_cost": number_or_null,
    "integration_cost": number_or_null,
    "time_to_value": number_or_null,
    "buyer_or_beneficiary": array_strings,
    "minimum_proof_object": string_or_null,
    "missing_receipt": array_strings,
    "alternative_explanation": array_strings,
    "counterevidence": array_strings,
    "falsifier": array_strings,
    "commercial_wedge": string_or_null,
    "counterpower_wedge": string_or_null,
    "field_test_route": string_or_null,
    "source_ids": array_strings,
    "comparable_control": string_or_null,
    "reason_candidate_may_be_wrong": {"type": "string", "minLength": 1},
    "review_state": {"enum": review_states},
    "graph_effect": {"const": "none"},
}

aah_schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://clifford-number.invalid/schemas/aah-hunt-record.schema.json",
    "title": "Asymmetric Advantage Hunt record",
    "type": "object",
    "additionalProperties": False,
    "required": list(aah_properties.keys()),
    "properties": aah_properties,
}

write_json("schemas/dca-field-record.schema.json", dca_schema)
write_json("schemas/aah-hunt-record.schema.json", aah_schema)

write_text("docs/methods/dca-aah-ontology-and-hunt-law.md", f"""# DCA and AAH ontology and hunt law

As of {AS_OF}, this method freezes the graph-inert seam between the distributed-counterpower-aversion field hypothesis and the Asymmetric Advantage Hunt.

## Governing direction

```text
Clifford evidence authority moves outward into bounded interpretation.
Challenges and hunt results move inward only as typed referrals.
Neither DCA nor AAH writes facts backward into evidence authority.
```

DCA asks whether a recurring role-neutral architecture preserves a protected center's freedom from binding correction. AAH asks which people, alternatives, rights, interfaces, failed paths, custody mechanisms, and repair surfaces become underpriced or discarded by those selectors. The first is a falsifiable field hypothesis. The second is an acquisition, proof, exit, custody, correction, and product program. Neither is an actor map.

## Admission law

A DCA record must separate observed fact, interpretation, alternative explanation, counterevidence, missing receipt, mechanism candidate, contribution, and falsifier. An AAH record must carry a comparable control, an explicit reason it may be wrong, a minimum proof object, and a source route. Empty acquisition slots do not count as candidates.

## Prohibited conversions

```text
same mechanism != communication
same shape != coordination
compatible interface != common purpose
personnel movement != collective intent
status-output residual != hidden genius
attention or silence != motive, hostility, monitoring, or suppression
internal proof != external adoption
```

## Phase-one result

The schemas, namespace crosswalk, disposition vocabulary, scoring factors, zero-state registries, and thirty-slot denominator are frozen. Phase two remains zero of thirty. Phase three remains zero of four proofs. No Question 4 field attempt is authorized by this materialization.

```text
graph effect: none
publication effect: none
adoption effect: none
```
""")

write_text("docs/milestones/dca-aah-phase-01.md", f"""# DCA-H01 and AAH-00 Phase 01

Phase 01 materializes the ontology and hunt grammar after the POOF/Sprint 09 reconciliation and the ninth K0 query-template execution on the same branch line.

## Frozen products

- DCA-H01 field-hypothesis contract and zero-state recurrence registry
- AAH-00 program contract and twenty-two portfolio routes
- graph-inert DCA/AAH ontology and namespace crosswalk
- DCA and AAH record schemas
- six-class, thirty-candidate target denominator with zero candidates counted
- deterministic builder, validator, adversarial tests, report, workflow, and exact-byte release manifest

## Exact state

```text
DCA recurrence records:             0
AAH typed candidates:               0 / 30
independently reviewable proofs:     0 / 4
Question 4 field attempts:           0 / 1
real-person adverse action:          prohibited
canonical main claimed:              false
graph effect:                        none
publication effect:                  none
adoption effect:                     none
```

The branch may reason and route reversible acquisition without an unspecified human-permission gate. It may not claim prevalence, coordination, motive, hostility, suppression, publication clearance, adoption, or external effect.
""")

builder = r'''import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const writeJson = (p, value) => {
  const target = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const RELEASE_PATHS = [
  '.github/workflows/dca-aah-program.yml',
  'data/project/dca-h01-field-hypothesis.json',
  'data/project/aah-00-program-contract.json',
  'data/project/dca-aah-ontology-crosswalk.json',
  'data/project/dca-recurrence-registry.json',
  'data/project/aah-hunt-registry.json',
  'data/project/aah-seed-denominator.json',
  'schemas/dca-field-record.schema.json',
  'schemas/aah-hunt-record.schema.json',
  'docs/methods/dca-aah-ontology-and-hunt-law.md',
  'docs/milestones/dca-aah-phase-01.md',
  'tools/build-dca-aah-program.mjs',
  'tools/validate-dca-aah-program.mjs',
  'test/dca-aah-program.test.js',
  'reports/core-thesis/dca-aah/data.json',
  'reports/core-thesis/dca-aah/index.html',
  'package.json',
  'docs/README.md'
];

export function buildDcaAahProgram() {
  const dca = readJson('data/project/dca-h01-field-hypothesis.json');
  const aah = readJson('data/project/aah-00-program-contract.json');
  const crosswalk = readJson('data/project/dca-aah-ontology-crosswalk.json');
  const dcaRegistry = readJson('data/project/dca-recurrence-registry.json');
  const aahRegistry = readJson('data/project/aah-hunt-registry.json');
  const seeds = readJson('data/project/aah-seed-denominator.json');
  const data = {
    schema_version: 'dca-aah-program-report@1',
    as_of: dca.as_of,
    status: 'validated_branch_shadow_pending_merge',
    dca,
    aah,
    crosswalk,
    registries: { dca: dcaRegistry, aah: aahRegistry },
    seed_denominator: seeds,
    counts: {
      dca_records: dcaRegistry.records.length,
      aah_candidates: aahRegistry.records.length,
      aah_candidate_target: seeds.target_total,
      portfolios: aah.portfolios.length,
      typed_transactions: crosswalk.typed_transactions.length,
      forbidden_promotions: crosswalk.forbidden_promotions.length
    },
    boundaries: {
      canonical_main_claimed: false,
      external_effect_claimed: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  writeJson('reports/core-thesis/dca-aah/data.json', data);
  const portfolioRows = aah.portfolios.map((row) => `<tr><td><code>${escapeHtml(row.portfolio_id)}</code></td><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.minimum_initial_proof)}</td></tr>`).join('');
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DCA-H01 and AAH-00</title><style>body{font-family:system-ui,sans-serif;max-width:76rem;margin:0 auto;padding:2rem;line-height:1.5}code,pre{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.55rem;text-align:left;vertical-align:top}.boundary{border-left:.35rem solid currentColor;padding-left:1rem}</style></head><body><main><h1>DCA-H01 and AAH-00</h1><p class="boundary"><strong>Authority ceiling:</strong> validated branch shadow; graph, publication, and adoption effects are none.</p><h2>Phase state</h2><pre>DCA recurrences: ${data.counts.dca_records}\nAAH candidates: ${data.counts.aah_candidates} / ${data.counts.aah_candidate_target}\nproofs: ${aah.closure_requirements.independently_reviewable_proofs_current} / ${aah.closure_requirements.independently_reviewable_proofs_required}\nfield attempts: ${aah.closure_requirements.question_4_field_attempts_current} / ${aah.closure_requirements.question_4_field_attempt_required}</pre><h2>Governing hypothesis</h2><p>${escapeHtml(dca.hypothesis)}</p><h2>Hunt objective</h2><p>${escapeHtml(aah.objective)}</p><h2>Portfolio routes</h2><table><thead><tr><th>ID</th><th>Route</th><th>Initial proof</th></tr></thead><tbody>${portfolioRows}</tbody></table><h2>Non-conversion law</h2><ul>${crosswalk.forbidden_promotions.map((x) => `<li><code>${escapeHtml(x)}</code></li>`).join('')}</ul><p>Machine-readable state: <a href="data.json">data.json</a>. Exact-byte custody: <a href="release-manifest.json">release-manifest.json</a>.</p></main></body></html>\n`;
  fs.mkdirSync(path.join(ROOT, 'reports/core-thesis/dca-aah'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports/core-thesis/dca-aah/index.html'), html);
  const entries = RELEASE_PATHS.map((p) => {
    const bytes = fs.readFileSync(path.join(ROOT, p));
    return { path: p, sha256: sha256(bytes), bytes: bytes.length };
  });
  const combined_sha256 = sha256(Buffer.from(entries.map((e) => `${e.path}\0${e.sha256}\n`).join('')));
  const manifest = {
    schema_version: 'dca-aah-program-release-manifest@1',
    program_ids: ['DCA-H01', 'AAH-00'],
    as_of: dca.as_of,
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256,
    boundaries: {
      exact_bytes_prove_source_truth: false,
      release_manifest_makes_branch_canonical: false,
      release_manifest_proves_external_effect: false,
      graph_effect: 'none'
    }
  };
  writeJson('data/project/dca-aah-program-release-manifest.json', manifest);
  writeJson('reports/core-thesis/dca-aah/release-manifest.json', manifest);
  return { data, manifest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { data, manifest } = buildDcaAahProgram();
  console.log(`build-dca-aah-program: OK (${data.counts.portfolios} portfolios, ${data.counts.aah_candidates}/${data.counts.aah_candidate_target} candidates, ${manifest.combined_sha256})`);
}
'''

validator = r'''import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RELEASE_PATHS } from './build-dca-aah-program.mjs';

const ROOT = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (values) => new Set(values).size === values.length;

export function validateDcaRecord(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'DCA record must be an object');
  assert(/^DCA-R[0-9]{4,}$/.test(record.record_id || ''), 'invalid DCA record_id');
  for (const field of ['observed_fact','working_interpretation','alternative_explanations','counterevidence','falsifier','missing_receipt','source_ids']) assert(Array.isArray(record[field]), `DCA ${field} must be an array`);
  assert(record.alternative_explanations.length > 0, 'DCA record requires an alternative explanation');
  assert(record.falsifier.length > 0, 'DCA record requires a falsifier');
  assert(record.graph_effect === 'none', 'DCA graph effect must be none');
  assert(Number.isFinite(record.confidence) && record.confidence >= 0 && record.confidence <= 1, 'DCA confidence out of range');
  return true;
}

export function validateAahRecord(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'AAH record must be an object');
  assert(/^AAH-H[0-9]{4,}$/.test(record.hunt_id || ''), 'invalid AAH hunt_id');
  for (const field of ['observed_output','support_received','support_missing','public_contribution','private_rights','interface_or_dependency','buyer_or_beneficiary','missing_receipt','alternative_explanation','counterevidence','falsifier','source_ids']) assert(Array.isArray(record[field]), `AAH ${field} must be an array`);
  assert(record.alternative_explanation.length > 0, 'AAH record requires an alternative explanation');
  assert(record.falsifier.length > 0, 'AAH record requires a falsifier');
  assert(typeof record.reason_candidate_may_be_wrong === 'string' && record.reason_candidate_may_be_wrong.trim(), 'AAH record requires an explicit reason it may be wrong');
  assert(Object.hasOwn(record, 'comparable_control'), 'AAH record requires a comparable control field');
  assert(record.graph_effect === 'none', 'AAH graph effect must be none');
  return true;
}

export function validateProgramState({ dca, aah, crosswalk, dcaRegistry, aahRegistry, seeds }) {
  assert(dca.hypothesis_id === 'DCA-H01', 'wrong DCA hypothesis id');
  assert(aah.program_id === 'AAH-00', 'wrong AAH program id');
  assert(dca.boundaries.graph_effect === 'none' && aah.boundaries.graph_effect === 'none', 'program graph effect must be none');
  assert(dca.boundaries.coordination_conclusion_generated === false, 'DCA may not generate a coordination conclusion');
  assert(dca.boundaries.common_purpose_conclusion_generated === false, 'DCA may not generate a common-purpose conclusion');
  assert(aah.boundaries.silence_proves_hostility === false, 'AAH may not infer hostility from silence');
  assert(aah.boundaries.status_output_residual_proves_hidden_genius === false, 'status-output residual is only a routing signal');
  assert(aah.portfolios.length === 22, `expected 22 AAH portfolios, found ${aah.portfolios.length}`);
  assert(unique(aah.portfolios.map((p) => p.portfolio_id)), 'duplicate AAH portfolio id');
  assert(aah.master_hunt_record_fields.includes('alternative_explanation') && aah.master_hunt_record_fields.includes('counterevidence') && aah.master_hunt_record_fields.includes('falsifier'), 'AAH master record omits adversarial fields');
  assert(crosswalk.authority_flow.evidence_moves_outward === true, 'evidence must move outward');
  assert(crosswalk.authority_flow.challenges_move_inward_as_referrals === true, 'challenges must move inward as referrals');
  assert(crosswalk.authority_flow.publication_writes_facts_backward === false, 'publication may not write facts backward');
  assert(crosswalk.object_families.every((f) => f.family_id === 'CLIFFORD' || f.may_create_actor_edge === false), 'non-Clifford family may not create actor edges');
  assert(crosswalk.forbidden_promotions.length >= 10, 'forbidden-promotion denominator incomplete');
  assert(seeds.target_total === 30 && seeds.classes.length === 6, 'AAH seed denominator must be six classes and thirty targets');
  assert(seeds.classes.reduce((sum, row) => sum + row.target, 0) === 30, 'AAH seed class targets do not sum to thirty');
  assert(seeds.current_total === aahRegistry.records.length, 'AAH current count does not match registry');
  assert(aahRegistry.denominator.target === 30 && aahRegistry.denominator.current === aahRegistry.records.length, 'AAH denominator drift');
  assert(dcaRegistry.counts.records === dcaRegistry.records.length, 'DCA registry count drift');
  assert(unique(dcaRegistry.records.map((r) => r.record_id)), 'duplicate DCA record id');
  assert(unique(aahRegistry.records.map((r) => r.hunt_id)), 'duplicate AAH hunt id');
  dcaRegistry.records.forEach(validateDcaRecord);
  aahRegistry.records.forEach(validateAahRecord);
  return true;
}

export function validateReleaseManifest(manifest) {
  assert(manifest.self_included === false, 'release manifest must be self-excluding');
  assert(manifest.entries.length === RELEASE_PATHS.length, 'release path denominator drift');
  assert(manifest.entries.map((e) => e.path).join('\n') === RELEASE_PATHS.join('\n'), 'release path order drift');
  for (const entry of manifest.entries) {
    const bytes = fs.readFileSync(path.join(ROOT, entry.path));
    assert(bytes.length === entry.bytes, `byte count drift: ${entry.path}`);
    assert(sha256(bytes) === entry.sha256, `sha256 drift: ${entry.path}`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((e) => `${e.path}\0${e.sha256}\n`).join('')));
  assert(combined === manifest.combined_sha256, 'combined release digest drift');
  assert(manifest.boundaries.graph_effect === 'none', 'release graph effect must be none');
  return true;
}

export function validateDcaAahProgram() {
  const state = {
    dca: readJson('data/project/dca-h01-field-hypothesis.json'),
    aah: readJson('data/project/aah-00-program-contract.json'),
    crosswalk: readJson('data/project/dca-aah-ontology-crosswalk.json'),
    dcaRegistry: readJson('data/project/dca-recurrence-registry.json'),
    aahRegistry: readJson('data/project/aah-hunt-registry.json'),
    seeds: readJson('data/project/aah-seed-denominator.json')
  };
  validateProgramState(state);
  const dcaSchema = readJson('schemas/dca-field-record.schema.json');
  const aahSchema = readJson('schemas/aah-hunt-record.schema.json');
  assert(dcaSchema.properties.graph_effect.const === 'none', 'DCA schema graph ceiling drift');
  assert(aahSchema.properties.graph_effect.const === 'none', 'AAH schema graph ceiling drift');
  assert(aahSchema.required.includes('comparable_control') && aahSchema.required.includes('reason_candidate_may_be_wrong'), 'AAH schema missing control fields');
  const report = readJson('reports/core-thesis/dca-aah/data.json');
  assert(report.counts.aah_candidates === state.aahRegistry.records.length, 'report candidate count drift');
  assert(report.boundaries.canonical_main_claimed === false, 'branch report may not claim canonical main');
  const manifest = readJson('data/project/dca-aah-program-release-manifest.json');
  validateReleaseManifest(manifest);
  const reportManifest = readJson('reports/core-thesis/dca-aah/release-manifest.json');
  assert(JSON.stringify(reportManifest) === JSON.stringify(manifest), 'report release manifest is not exact copy');
  return { portfolios: state.aah.portfolios.length, candidates: state.aahRegistry.records.length, target: state.seeds.target_total, digest: manifest.combined_sha256 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateDcaAahProgram();
  console.log(`validate-dca-aah-program: OK (${result.portfolios} portfolios, ${result.candidates}/${result.target} candidates, ${result.digest})`);
}
'''

test = r'''import assert from 'node:assert/strict';
import { validateAahRecord, validateDcaRecord, validateProgramState, validateDcaAahProgram } from '../tools/validate-dca-aah-program.mjs';

const dcaFixture = {
  record_id: 'DCA-R0001', case_id: 'fixture', domain: 'test', jurisdiction: 'test', protected_center: null,
  bounded_gate: 'fixture gate', status_prior: null, epistemic_prior: null, qualified_knower_or_alternative: null,
  contradiction: null, reclassification: null, explanation_mutation: null, option_set_effect: null,
  conversion_instrument: null, infrastructure_effect: null, dependency_effect: null,
  residual_authority_or_value: null, correction_topology: null, status_signal: null, personnel_router: null,
  compatible_interface: null, selection_effect: null, counterfactual_foreclosure: null,
  observed_fact: ['fixture fact'], working_interpretation: ['fixture interpretation'],
  alternative_explanations: ['ordinary disagreement'], counterevidence: [], matched_control: null,
  falsifier: ['standing preserved'], missing_receipt: ['gate receipt'], mechanism_candidate: [],
  field_hypothesis_contribution: 'unresolved', source_ids: ['fixture-source'], confidence: 0.2,
  review_state: 'selection_unresolved', graph_effect: 'none'
};
assert.equal(validateDcaRecord(dcaFixture), true);
assert.throws(() => validateDcaRecord({ ...dcaFixture, graph_effect: 'create_edge' }), /graph effect/);
assert.throws(() => validateDcaRecord({ ...dcaFixture, falsifier: [] }), /falsifier/);

const aahFixture = {
  hunt_id: 'AAH-H0001', surface: 'fixture', domain: 'test', jurisdiction: 'test', protected_center: null,
  selector_or_gateholder: null, selection_rule: null, status_signal: null,
  discarded_person_option_or_capability: 'fixture option', observed_output: ['bounded output'], support_received: [],
  support_missing: ['comparable support'], status_output_residual: null, exclusion_or_discount_mechanism: null,
  counterfactual_support_gap: null, comparable_selected_object: null, public_contribution: [], private_rights: [],
  interface_or_dependency: [], custody_holder: null, exit_condition: null, acquisition_cost: null,
  verification_cost: null, integration_cost: null, time_to_value: null, buyer_or_beneficiary: [],
  minimum_proof_object: null, missing_receipt: ['selector rule'], alternative_explanation: ['ordinary quality difference'],
  counterevidence: [], falsifier: ['independent test fails'], commercial_wedge: null, counterpower_wedge: null,
  field_test_route: null, source_ids: ['fixture-source'], comparable_control: null,
  reason_candidate_may_be_wrong: 'the observed output may not transfer', review_state: 'selection_unresolved', graph_effect: 'none'
};
assert.equal(validateAahRecord(aahFixture), true);
assert.throws(() => validateAahRecord({ ...aahFixture, reason_candidate_may_be_wrong: '' }), /reason it may be wrong/);
assert.throws(() => validateAahRecord({ ...aahFixture, graph_effect: 'edge' }), /graph effect/);

const full = validateDcaAahProgram();
assert.equal(full.portfolios, 22);
assert.equal(full.candidates, 0);
assert.equal(full.target, 30);

console.log('dca-aah-program.test: OK');
'''

workflow = '''name: DCA and AAH constitutional program

on:
  pull_request:
    branches: [main]
    paths:
      - 'data/project/dca-*'
      - 'data/project/aah-*'
      - 'schemas/dca-*'
      - 'schemas/aah-*'
      - 'docs/methods/dca-*'
      - 'docs/milestones/dca-*'
      - 'tools/*dca-aah*'
      - 'test/dca-aah-*'
      - 'reports/core-thesis/dca-aah/**'
      - 'package.json'
      - '.github/workflows/dca-aah-program.yml'
  push:
    branches: [main]
    paths:
      - 'data/project/dca-*'
      - 'data/project/aah-*'
      - 'schemas/dca-*'
      - 'schemas/aah-*'
      - 'docs/methods/dca-*'
      - 'docs/milestones/dca-*'
      - 'tools/*dca-aah*'
      - 'test/dca-aah-*'
      - 'reports/core-thesis/dca-aah/**'
      - 'package.json'
      - '.github/workflows/dca-aah-program.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Build, validate, and adversarially test DCA and AAH
        run: |
          node tools/build-dca-aah-program.mjs
          node tools/validate-dca-aah-program.mjs
          node test/dca-aah-program.test.js
      - name: Run complete repository release gate
        run: npm run release:check
      - name: Prove deterministic phase-one products
        run: |
          git restore --staged --worktree .
          node tools/build-dca-aah-program.mjs
          node tools/validate-dca-aah-program.mjs
          node test/dca-aah-program.test.js
          git diff --exit-code
          test -z "$(git status --porcelain)"
'''

write_text("tools/build-dca-aah-program.mjs", builder)
write_text("tools/validate-dca-aah-program.mjs", validator)
write_text("test/dca-aah-program.test.js", test)
write_text(".github/workflows/dca-aah-program.yml", workflow)

package_path = ROOT / "package.json"
package_data = json.loads(package_path.read_text())
package_data.setdefault("scripts", {})["build:dca-aah"] = "node tools/build-dca-aah-program.mjs"
package_data["scripts"]["validate:dca-aah"] = "node tools/validate-dca-aah-program.mjs"
package_data["scripts"]["test:dca-aah"] = "node test/dca-aah-program.test.js"
package_data["scripts"]["ci:dca-aah"] = "npm run build:dca-aah && npm run validate:dca-aah && npm run test:dca-aah"
package_path.write_text(json.dumps(package_data, indent=2, ensure_ascii=False) + "\n")

readme_path = ROOT / "docs/README.md"
readme = readme_path.read_text()
marker = "DCA-H01 and AAH-00 constitutional program"
if marker not in readme:
    readme = readme.rstrip() + f"\n\n- [{marker}](milestones/dca-aah-phase-01.md) — graph-inert field-hypothesis and discarded-inventory hunt grammar.\n"
    readme_path.write_text(readme)

print("materialize-dca-aah-phase01: permanent source surface written")
