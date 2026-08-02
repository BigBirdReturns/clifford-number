#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.ssc_rd04_a04_common import A04_ROOT, BUILD_ROOT, DIMS, MANIFEST_PATH, REPORT_ROOT, ROOT, STATES, exact_manifest, read_json, sha256_file
from lib.ssc_rd04_a04_model import EXECUTION_ID, ISSUE

_BUILD_PATH = ROOT / "tools/build-status-sovereignty-rd04-snap-route-adjudication-a04.py"
_spec = importlib.util.spec_from_file_location("a04_builder", _BUILD_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError("cannot load A04 builder")
_builder = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_builder)
manifest_inputs = _builder.manifest_inputs

ROUTE_TERMINAL = {
    "official_relevant_support",
    "official_route_only_generic",
    "official_wrong_state",
    "official_wrong_program",
    "official_page_unavailable_after_bounded_retry",
    "official_binary_or_unparsed_content",
    "official_snap_page_no_dimension_support",
    "duplicate_or_redirect_alias",
    "not_official_after_page_review",
}
SOURCE_TERMINAL = {
    "exact_alias_to_a03_route",
    "official_page_unavailable_after_bounded_retry",
    "not_official_after_page_review",
    "official_binary_or_unparsed_content",
    "accessible_official_content_rechecked",
}


def _eq(actual: Any, expected: Any, label: str, errors: list[str]) -> None:
    if actual != expected:
        errors.append(f"{label}: expected {expected!r}, observed {actual!r}")


def _zero_authority(core: dict[str, Any], errors: list[str]) -> None:
    counts = core["counts"]
    for key in (
        "residual_classes_closed", "reviewed_disposition_changes", "complete_compact_findings",
        "racial_order_findings", "prevalence_findings", "coordination_findings",
        "common_purpose_findings", "graph_effects", "publication_effects",
    ):
        _eq(counts[key], 0, f"authority count {key}", errors)
    result = core["current_result"]
    _eq(result["residual_class_closure"], False, "residual closure", errors)
    _eq(result["reviewed_disposition_changed"], False, "reviewed disposition", errors)
    _eq(result["graph_effect"], "none", "graph effect", errors)
    _eq(result["publication_effect"], "none", "publication effect", errors)
    for key, value in core["boundaries"].items():
        if key == "graph_effect":
            _eq(value, "none", f"boundary {key}", errors)
        else:
            _eq(value, False, f"boundary {key}", errors)


def validate_semantics(core: dict[str, Any], route_ledger: dict[str, Any], source_ledger: dict[str, Any], decision_ledger: dict[str, Any], score_ledger: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    routes = route_ledger.get("rows", [])
    sources = source_ledger.get("rows", [])
    decisions = decision_ledger.get("rows", [])
    scores = score_ledger.get("rows", [])

    _eq(core["schema_version"], "ssc-rd04-a04-core@1", "core schema version", errors)
    _eq(core["execution_id"], EXECUTION_ID, "execution id", errors)
    _eq(core["issue"], ISSUE, "issue", errors)
    _eq(core["parent_a03_head"], "a516a05ee137233e93542a5e9886f0acada4f33b", "parent A03 head", errors)
    _eq(core["authority"], "page_level_source_relevance_and_score_custody_not_review_or_adjudication", "authority", errors)
    _eq(len(routes), 59, "route count", errors)
    _eq(len(sources), 53, "A02 source count", errors)
    _eq(len(decisions), 400, "decision count", errors)
    _eq(len(scores), 50, "state score count", errors)
    _eq([row["state"] for row in scores], list(STATES), "frozen state order", errors)
    _eq(len({row["candidate_id"] for row in routes}), 59, "candidate identity uniqueness", errors)
    _eq(len({row["source_id"] for row in sources}), 53, "source identity uniqueness", errors)
    _eq(len({row["decision_id"] for row in decisions}), 400, "decision identity uniqueness", errors)

    route_ids = {row["candidate_id"] for row in routes}
    for row in routes:
        if row["terminal_disposition"] not in ROUTE_TERMINAL:
            errors.append(f"{row['candidate_id']}: invalid terminal disposition")
        alias = row.get("duplicate_or_alias_of")
        if row["terminal_disposition"] == "duplicate_or_redirect_alias":
            if not alias or alias not in route_ids or alias == row["candidate_id"]:
                errors.append(f"{row['candidate_id']}: invalid alias target")
        elif alias is not None:
            errors.append(f"{row['candidate_id']}: non-alias disposition carries alias target")
        if row["score_eligible"]:
            _eq(row["terminal_disposition"], "official_relevant_support", f"{row['candidate_id']} score eligibility", errors)
            if not row["dimension_relevance"] or not row["supporting_passages"]:
                errors.append(f"{row['candidate_id']}: eligible route lacks passage support")
        elif row["terminal_disposition"] != "official_relevant_support" and row["dimension_relevance"] and row["pre_alias_disposition"] != "official_relevant_support":
            errors.append(f"{row['candidate_id']}: nonrelevant route carries dimension support")
        if row["terminal_disposition"] != "official_relevant_support" and row["score_eligible"]:
            errors.append(f"{row['candidate_id']}: nonrelevant route marked score eligible")

    for row in sources:
        if row["terminal_reconciliation"] not in SOURCE_TERMINAL:
            errors.append(f"{row['source_id']}: invalid source reconciliation")
        _eq(row["baseline_score_preserved"], True, f"{row['source_id']} baseline preservation", errors)
        _eq(row["source_removal_authorized"], False, f"{row['source_id']} source removal", errors)
        if row["exact_alias_to_a03_candidate"] is not None and row["exact_alias_to_a03_candidate"] not in route_ids:
            errors.append(f"{row['source_id']}: dangling A03 alias")
        for key, value in row["boundaries"].items():
            _eq(value, False, f"{row['source_id']} boundary {key}", errors)

    decision_by_id = {row["decision_id"]: row for row in decisions}
    route_by_id = {row["candidate_id"]: row for row in routes}
    for state in STATES:
        for dim in DIMS:
            decision_id = f"{state}-{dim}"
            if decision_id not in decision_by_id:
                errors.append(f"missing decision {decision_id}")
                continue
            row = decision_by_id[decision_id]
            if row["removed_source_ids"]:
                errors.append(f"{decision_id}: A02 source removal is forbidden")
            if row["new_score"] < row["prior_score"]:
                errors.append(f"{decision_id}: score downgrade is forbidden")
            if row["new_score"] > row["prior_score"]:
                if not (row["prior_score"] == 0 and row["new_score"] == 1):
                    errors.append(f"{decision_id}: automated score change exceeds 0→1 ceiling")
                if not row["new_adjudicated_candidate_ids"]:
                    errors.append(f"{decision_id}: score increase lacks adjudicated candidate")
                for candidate_id in row["new_adjudicated_candidate_ids"]:
                    candidate = route_by_id.get(candidate_id)
                    if candidate is None or not candidate["score_eligible"] or dim not in candidate["dimension_relevance"] or state not in candidate["state_scope_inferred"]:
                        errors.append(f"{decision_id}: ineligible candidate {candidate_id}")
            elif row["new_adjudicated_candidate_ids"]:
                errors.append(f"{decision_id}: unchanged score carries added candidates")

    for row in scores:
        total = sum(row["dimension_scores"].values())
        _eq(row["new_total"], total, f"{row['state']} total", errors)
        corresponding = [decision_by_id[f"{row['state']}-{dim}"] for dim in DIMS if f"{row['state']}-{dim}" in decision_by_id]
        if len(corresponding) == 8:
            _eq({d["dimension"]: d["new_score"] for d in corresponding}, row["dimension_scores"], f"{row['state']} decision projection", errors)

    highest = max(row["new_total"] for row in scores)
    top = [row["state"] for row in scores if row["new_total"] == highest]
    selection = score_ledger["selection"]
    _eq(selection["highest_score"], highest, "highest score", errors)
    _eq(selection["highest_coverage_set"], top, "highest-coverage set", errors)
    _eq(selection["tie_count"], len(top), "tie count", errors)
    _eq(selection["california_eligible"], "CA" in top, "California eligibility", errors)
    _eq(selection["california_uniquely_highest"], top == ["CA"], "California unique-highest", errors)
    _eq(selection["substantive_tiebreaker"], None, "substantive tiebreaker", errors)
    if "CA" in top:
        _eq(selection["final_selected_state"], "CA", "predeclared California retention", errors)
    elif len(top) == 1:
        _eq(selection["final_selected_state"], top[0], "unique final selection", errors)
    else:
        _eq(selection["final_selected_state"], None, "unresolved tied selection", errors)

    _eq(core["selection"], selection, "core selection projection", errors)
    _eq(core["counts"]["a03_candidates"], 59, "core A03 count", errors)
    _eq(core["counts"]["a02_sources_reconciled"], 53, "core A02 count", errors)
    _eq(core["counts"]["route_source_reconciliations"], 112, "core reconciliation count", errors)
    _eq(core["counts"]["dimension_decisions"], 400, "core decision count", errors)
    _eq(core["counts"]["score_changes"], len([row for row in decisions if row["score_change"]]), "core score-change count", errors)
    _eq(core["current_result"]["terminal_state"], "partial_correction_control", "terminal receipt", errors)
    _eq(core["current_result"]["page_adjudication_complete"], True, "page adjudication completion", errors)
    _eq(core["current_result"]["score_recomputation_complete"], True, "score recomputation completion", errors)
    _eq(core["current_result"]["selection_gate_complete"], True, "selection gate completion", errors)
    _zero_authority(core, errors)
    return errors


def validate_file_custody() -> list[str]:
    errors: list[str] = []
    route_ledger = read_json(A04_ROOT / "route-adjudications.json")
    source_ledger = read_json(A04_ROOT / "a02-source-reconciliations.json")
    for family, rows in (("a03", route_ledger["rows"]), ("a02", source_ledger["rows"])):
        key_name = "candidate_id" if family == "a03" else "source_id"
        for row in rows:
            key = row[key_name]
            fetch = row["fetch"]
            if fetch["attempt_count"] not in {1, 2}:
                errors.append(f"{family}/{key}: attempt count outside 1..2")
            if len(fetch["attempts"]) != fetch["attempt_count"]:
                errors.append(f"{family}/{key}: attempt count mismatch")
            for index, attempt in enumerate(fetch["attempts"], start=1):
                _eq(attempt["attempt"], index, f"{family}/{key} attempt order", errors)
                for suffix in ("body", "headers"):
                    path = ROOT / attempt[f"{suffix}_path"]
                    if not path.exists():
                        errors.append(f"{family}/{key}: missing {suffix} path")
                        continue
                    _eq(path.stat().st_size, attempt[f"{suffix}_bytes"], f"{family}/{key} {suffix} bytes", errors)
                    _eq(sha256_file(path), attempt[f"{suffix}_sha256"], f"{family}/{key} {suffix} SHA-256", errors)
    return errors


def validate_manifest() -> list[str]:
    errors: list[str] = []
    stored = read_json(MANIFEST_PATH)
    computed = exact_manifest(manifest_inputs(), execution_id=EXECUTION_ID, issue=ISSUE)
    _eq(stored, computed, "release manifest", errors)
    _eq(read_json(BUILD_ROOT / "manifest.json"), stored, "build manifest", errors)
    _eq(read_json(REPORT_ROOT / "summary.json"), read_json(BUILD_ROOT / "summary.json"), "report/build summary", errors)
    html_text = (REPORT_ROOT / "index.html").read_text(encoding="utf-8")
    if "noindex,nofollow" not in html_text:
        errors.append("report missing noindex boundary")
    if stored["combined_sha256"] not in html_text:
        errors.append("report missing manifest digest")
    return errors


def validate() -> None:
    core = read_json(A04_ROOT / "core.json")
    route_ledger = read_json(A04_ROOT / "route-adjudications.json")
    source_ledger = read_json(A04_ROOT / "a02-source-reconciliations.json")
    decision_ledger = read_json(A04_ROOT / "decision-matrix.json")
    score_ledger = read_json(A04_ROOT / "state-scores.json")
    errors = validate_semantics(core, route_ledger, source_ledger, decision_ledger, score_ledger)
    errors.extend(validate_file_custody())
    errors.extend(validate_manifest())
    schema = read_json(ROOT / "schemas/status-sovereignty-rd04-snap-route-adjudication-a04.schema.json")
    if schema.get("additionalProperties") is not False:
        errors.append("A04 schema is not closed")
    if errors:
        raise SystemExit("A04 validation failed:\n- " + "\n- ".join(errors))
    print("validate A04: 59/59 routes, 53/53 A02 sources, 400/400 decisions, zero authority escalation")


if __name__ == "__main__":
    validate()
