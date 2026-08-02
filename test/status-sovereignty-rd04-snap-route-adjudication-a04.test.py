#!/usr/bin/env python3
from __future__ import annotations

import copy
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "tools/validate-status-sovereignty-rd04-snap-route-adjudication-a04.py"
spec = importlib.util.spec_from_file_location("a04_validator", VALIDATOR_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load A04 validator")
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)

read_json = validator.read_json
A04_ROOT = validator.A04_ROOT


def corpus():
    return {
        "core": read_json(A04_ROOT / "core.json"),
        "routes": read_json(A04_ROOT / "route-adjudications.json"),
        "sources": read_json(A04_ROOT / "a02-source-reconciliations.json"),
        "decisions": read_json(A04_ROOT / "decision-matrix.json"),
        "scores": read_json(A04_ROOT / "state-scores.json"),
    }


def errors(value):
    return validator.validate_semantics(value["core"], value["routes"], value["sources"], value["decisions"], value["scores"])


def expect_failure(name, data, fragment):
    observed = errors(data)
    if not observed:
        raise AssertionError(f"{name}: mutation was accepted")
    if fragment and not any(fragment in message for message in observed):
        raise AssertionError(f"{name}: expected {fragment!r}, observed {observed}")


base = corpus()
valid_errors = errors(base)
if valid_errors:
    raise AssertionError(f"valid A04 corpus failed: {valid_errors}")

cases = []
value = copy.deepcopy(base); value["routes"]["rows"].pop(); cases.append(("missing route", value, "route count"))
value = copy.deepcopy(base); value["routes"]["rows"][0]["terminal_disposition"] = "promoted"; cases.append(("invalid route disposition", value, "invalid terminal disposition"))
value = copy.deepcopy(base); value["routes"]["rows"][0]["score_eligible"] = True; value["routes"]["rows"][0]["dimension_relevance"] = []; cases.append(("supportless eligible route", value, "eligible route lacks passage support"))
value = copy.deepcopy(base); value["routes"]["rows"][0]["terminal_disposition"] = "duplicate_or_redirect_alias"; value["routes"]["rows"][0]["duplicate_or_alias_of"] = "A03C-999"; cases.append(("dangling alias", value, "invalid alias target"))
value = copy.deepcopy(base); value["sources"]["rows"][0]["source_removal_authorized"] = True; cases.append(("A02 source removal", value, "source removal"))
value = copy.deepcopy(base); value["sources"]["rows"][0]["baseline_score_preserved"] = False; cases.append(("A02 baseline downgrade", value, "baseline preservation"))
value = copy.deepcopy(base); value["decisions"]["rows"].pop(); cases.append(("missing decision", value, "decision count"))
value = copy.deepcopy(base); value["decisions"]["rows"][0]["new_score"] = max(0, value["decisions"]["rows"][0]["prior_score"] - 1); cases.append(("score downgrade", value, "score downgrade"))
value = copy.deepcopy(base); target = next(row for row in value["decisions"]["rows"] if row["prior_score"] == 0); target["new_score"] = 2; target["score_change"] = 2; target["new_adjudicated_candidate_ids"] = [value["routes"]["rows"][0]["candidate_id"]]; cases.append(("automated level two", value, "0→1 ceiling"))
value = copy.deepcopy(base); target = next(row for row in value["decisions"]["rows"] if row["prior_score"] == 0); target["new_score"] = 1; target["score_change"] = 1; target["new_adjudicated_candidate_ids"] = []; cases.append(("increase without candidate", value, "lacks adjudicated candidate"))
value = copy.deepcopy(base); target = value["decisions"]["rows"][0]; target["new_adjudicated_candidate_ids"] = ["A03C-999"]; cases.append(("unchanged score with candidate", value, "unchanged score carries"))
value = copy.deepcopy(base); value["scores"]["rows"][0], value["scores"]["rows"][1] = value["scores"]["rows"][1], value["scores"]["rows"][0]; cases.append(("state order drift", value, "frozen state order"))
value = copy.deepcopy(base); value["scores"]["selection"]["highest_coverage_set"] = ["AL"]; cases.append(("top set drift", value, "highest-coverage set"))
value = copy.deepcopy(base); value["scores"]["selection"]["substantive_tiebreaker"] = "fame"; cases.append(("substantive tiebreaker", value, "substantive tiebreaker"))
value = copy.deepcopy(base); value["scores"]["selection"]["final_selected_state"] = "CT"; cases.append(("California retention drift", value, "predeclared California retention"))
value = copy.deepcopy(base); value["core"]["counts"]["residual_classes_closed"] = 1; cases.append(("residual closure", value, "residual_classes_closed"))
value = copy.deepcopy(base); value["core"]["current_result"]["graph_effect"] = "changed"; cases.append(("graph effect", value, "graph effect"))
value = copy.deepcopy(base); value["core"]["current_result"]["publication_effect"] = "changed"; cases.append(("publication effect", value, "publication effect"))
value = copy.deepcopy(base); value["core"]["current_result"]["terminal_state"] = "bounded_nested_superiority_chain"; cases.append(("terminal promotion", value, "terminal receipt"))
value = copy.deepcopy(base); value["core"]["current_result"]["selection_gate_complete"] = False; cases.append(("selection gate rollback", value, "selection gate completion"))
value = copy.deepcopy(base); value["core"]["current_result"]["reviewed_disposition_changed"] = True; cases.append(("reviewed disposition", value, "reviewed disposition"))
value = copy.deepcopy(base); key = next(k for k in value["core"]["boundaries"] if k != "graph_effect"); value["core"]["boundaries"][key] = True; cases.append(("boundary escalation", value, f"boundary {key}"))
value = copy.deepcopy(base); value["core"]["counts"]["route_source_reconciliations"] = 111; cases.append(("reconciliation count drift", value, "core reconciliation count"))
value = copy.deepcopy(base); value["decisions"]["rows"][1]["decision_id"] = value["decisions"]["rows"][0]["decision_id"]; cases.append(("duplicate decision identity", value, "decision identity uniqueness"))

for name, data, fragment in cases:
    expect_failure(name, data, fragment)

print(f"A04 fixtures: 1 positive + {len(cases)} adversarial refusals passed")
