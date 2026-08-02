from __future__ import annotations

import time
from typing import Any

from .ssc_rd04_a04_classify import apply_aliases, classify_candidate, eligible_candidate_map, reconcile_a02_source
from .ssc_rd04_a04_common import A02_ROOT, A03_ROOT, DIMS, STATES, flatten_rows, read_json, route_id

EXECUTION_ID = "SSC-RD04-SNAP-A04"
ISSUE = 690
PARENT_HEAD = "a516a05ee137233e93542a5e9886f0acada4f33b"


def load_inputs() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    delta = read_json(A03_ROOT / "source-delta.json")
    candidates = []
    for index, row in enumerate(sorted(delta["new_official_domain_route_candidates"], key=lambda item: item["url"]), start=1):
        candidate = dict(row)
        candidate["candidate_id"] = route_id(index)
        candidates.append(candidate)
    sources = flatten_rows(A02_ROOT.glob("sources-*.json"))
    states = flatten_rows(A02_ROOT.glob("states-*.json"))
    if len(candidates) != 59:
        raise ValueError(f"expected 59 A03 candidates, observed {len(candidates)}")
    if len(sources) != 53:
        raise ValueError(f"expected 53 A02 sources, observed {len(sources)}")
    if len(states) != 50:
        raise ValueError(f"expected 50 state rows, observed {len(states)}")
    if [row["state"] for row in states] != list(STATES):
        raise ValueError("A02 state order drifted from frozen USPS universe")
    return candidates, sources, states


def decision_matrix(states: list[dict[str, Any]], route_rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    eligible = eligible_candidate_map(route_rows)
    decisions: list[dict[str, Any]] = []
    score_rows: list[dict[str, Any]] = []
    for state_row in states:
        state = state_row["state"]
        new_scores: dict[str, int] = {}
        new_evidence: dict[str, list[str]] = {}
        for dim in DIMS:
            prior_score = int(state_row["dimension_scores"][dim])
            prior_sources = list(state_row["dimension_evidence"][dim])
            candidates = eligible.get((state, dim), [])
            if prior_score == 0 and candidates:
                new_score = 1
                added = candidates
                rationale = "provisional_level_one_added_from_page_adjudicated_a03_candidate"
                review_boundary = "automated A04 ceiling; no level-two support and no A02 source removal"
            else:
                new_score = prior_score
                added = []
                rationale = "baseline_unchanged"
                review_boundary = "A02 baseline preserved; candidate absence, genericity, or failure creates no downgrade"
            new_scores[dim] = new_score
            new_evidence[dim] = prior_sources + [f"A04:{candidate_id}" for candidate_id in added]
            decisions.append({
                "decision_id": f"{state}-{dim}",
                "state": state,
                "state_name": state_row["state_name"],
                "dimension": dim,
                "prior_score": prior_score,
                "prior_source_ids": prior_sources,
                "new_adjudicated_candidate_ids": added,
                "removed_source_ids": [],
                "new_score": new_score,
                "score_change": new_score - prior_score,
                "score_change_rationale": rationale,
                "review_boundary": review_boundary,
            })
        total = sum(new_scores.values())
        score_rows.append({
            "state": state,
            "state_name": state_row["state_name"],
            "prior_total": int(state_row["total_score"]),
            "new_total": total,
            "score_change": total - int(state_row["total_score"]),
            "dimension_scores": new_scores,
            "dimension_evidence": new_evidence,
            "missing_dimensions": [dim for dim in DIMS if new_scores[dim] == 0],
            "not_full_dimensions": [dim for dim in DIMS if new_scores[dim] < 2],
        })
    highest = max(row["new_total"] for row in score_rows)
    top_set = [row["state"] for row in score_rows if row["new_total"] == highest]
    if "CA" in top_set:
        selected = "CA"
        selection_status = "complete_california_retained_within_highest_coverage_set"
    elif len(top_set) == 1:
        selected = top_set[0]
        selection_status = "complete_unique_highest_coverage_state"
    else:
        selected = None
        selection_status = "complete_tied_highest_coverage_set_without_predeclared_state"
    selection = {
        "selection_gate_complete": True,
        "highest_score": highest,
        "highest_coverage_set": top_set,
        "tie_count": len(top_set),
        "california_eligible": "CA" in top_set,
        "california_uniquely_highest": top_set == ["CA"],
        "final_selected_state": selected,
        "selection_status": selection_status,
        "substantive_tiebreaker": None,
        "rejected_shortlist": [
            {"state": row["state"], "state_name": row["state_name"], "score": row["new_total"], "reason": "below_highest_coverage_score"}
            for row in score_rows if row["state"] not in top_set
        ],
    }
    return decisions, score_rows, selection


def derive_model(candidates: list[dict[str, Any]], sources: list[dict[str, Any]], states: list[dict[str, Any]], candidate_fetches: dict[str, dict[str, Any]], source_fetches: dict[str, dict[str, Any]], *, as_of: str | None = None) -> dict[str, Any]:
    route_rows = [classify_candidate(candidate, candidate_fetches[candidate["candidate_id"]]) for candidate in candidates]
    apply_aliases(route_rows)
    source_rows = [reconcile_a02_source(source, source_fetches[source["source_id"]], route_rows) for source in sources]
    decisions, score_rows, selection = decision_matrix(states, route_rows)
    dispositions: dict[str, int] = {}
    for row in route_rows:
        dispositions[row["terminal_disposition"]] = dispositions.get(row["terminal_disposition"], 0) + 1
    source_states: dict[str, int] = {}
    for row in source_rows:
        source_states[row["terminal_reconciliation"]] = source_states.get(row["terminal_reconciliation"], 0) + 1
    score_changes = [row for row in decisions if row["score_change"] != 0]
    core = {
        "schema_version": "ssc-rd04-a04-core@1",
        "execution_id": EXECUTION_ID,
        "issue": ISSUE,
        "parent_lane_issue": 620,
        "parent_wave_issue": 615,
        "parent_a02_issue": 666,
        "parent_a03_issue": 687,
        "parent_a03_head": PARENT_HEAD,
        "as_of": as_of or time.strftime("%Y-%m-%d", time.gmtime()),
        "authority": "page_level_source_relevance_and_score_custody_not_review_or_adjudication",
        "counts": {
            "a03_candidates": len(route_rows),
            "a02_sources_reconciled": len(source_rows),
            "route_source_reconciliations": len(route_rows) + len(source_rows),
            "states_recomputed": len(score_rows),
            "dimension_decisions": len(decisions),
            "score_changes": len(score_changes),
            "residual_classes_closed": 0,
            "reviewed_disposition_changes": 0,
            "complete_compact_findings": 0,
            "racial_order_findings": 0,
            "prevalence_findings": 0,
            "coordination_findings": 0,
            "common_purpose_findings": 0,
            "graph_effects": 0,
            "publication_effects": 0,
        },
        "route_dispositions": dict(sorted(dispositions.items())),
        "a02_reconciliation_states": dict(sorted(source_states.items())),
        "selection": selection,
        "current_result": {
            "terminal_state": "partial_correction_control",
            "page_adjudication_complete": True,
            "score_recomputation_complete": True,
            "selection_gate_complete": True,
            "selected_state_chain_may_proceed": selection["final_selected_state"] is not None,
            "residual_class_closure": False,
            "reviewed_disposition_changed": False,
            "graph_effect": "none",
            "publication_effect": "none",
        },
        "boundaries": {
            "official_domain_is_topical_relevance": False,
            "query_slot_is_dimension_support": False,
            "search_rank_is_source_authority": False,
            "page_fetch_failure_is_record_absence": False,
            "replay_non_return_is_a02_invalidity": False,
            "more_sources_is_better_policy": False,
            "published_procedure_is_effective_implementation": False,
            "hearing_rule_is_effective_counterpower": False,
            "restoration_rule_is_timely_restoration": False,
            "one_state_or_tied_set_is_national_prevalence": False,
            "unequal_outcome_is_racial_hierarchy_or_common_purpose": False,
            "graph_effect": "none",
        },
    }
    return {"core": core, "route_rows": route_rows, "source_rows": source_rows, "decisions": decisions, "score_rows": score_rows, "selection": selection}
