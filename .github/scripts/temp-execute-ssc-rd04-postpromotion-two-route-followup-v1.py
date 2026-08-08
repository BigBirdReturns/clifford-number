#!/usr/bin/env python3
"""Execute the frozen two-route North Dakota RD-04 follow-up protocol.

This file is temporary carrier infrastructure. It can only read the exact repository-owned
protocol and exact current promotion state. It performs at most two logical GET attempts and
at most two physical HTTP requests, counting same-host redirects against the same budget.
Every result is transport custody only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]

CANONICAL_PARENT = "048e9d13a2555d8e6fabdbee5f45aea858f919b7"
PROTOCOL_PATH = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/"
    "selected-followup-protocol.json"
)
FIELD_ADJUDICATIONS_PATH = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication/"
    "field-adjudications.json"
)
MATRIX_PATH = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/"
    "promoted-partial-field-matrix.json"
)
PROMOTION_SUMMARY_PATH = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-four-cell-promotion/"
    "promotion-summary.json"
)

EXPECTED_GIT_BLOBS = {
    PROTOCOL_PATH.as_posix(): "7bbafd8f8c6c915442770ebbeca85b37afba8047",
    FIELD_ADJUDICATIONS_PATH.as_posix(): "522ec8503299c0458d45f43f23512c8ff90ac0f2",
    MATRIX_PATH.as_posix(): "66896190dd575f9867f1e121d845acfb4d27f56f",
    PROMOTION_SUMMARY_PATH.as_posix(): "5e0adc541a22c9b0bf4cd8a059bf083e08831a15",
}

EXPECTED_ROUTES = [
    {
        "route_ordinal": 1,
        "route_id": "RD04-W03-PPN-ND-FU-001",
        "requested_url": "https://www.nd.gov/dhs/policymanuals/SNAP/Content/Release%20Log.htm",
        "expected_host": "www.nd.gov",
        "target_decision_id": "RD04-PPN-ND-OPERATIVE-STATE-IMPLEMENTATION-AUTHORITY-AND-VERSION",
        "target_field_ids": ["operative_state_implementation_authority_and_version"],
        "held_disposition": "no_relevant_support_hold_open",
    },
    {
        "route_ordinal": 2,
        "route_id": "RD04-W03-PPN-ND-FU-002",
        "requested_url": (
            "https://www.nd.gov/dhs/policymanuals/SNAP/Content/History/"
            "403%20Geographic%20Waiver/403%20History%20Log.htm"
        ),
        "expected_host": "www.nd.gov",
        "target_decision_id": "RD04-PPN-ND-ABAWD-OR-WORK-REQUIREMENT-WAIVER-STATE-AND-GOVERNING-PERIOD",
        "target_field_ids": ["abawd_or_work_requirement_waiver_state_and_governing_period"],
        "held_disposition": "temporal_or_scope_ambiguity_hold_open",
    },
]

USER_AGENT = (
    "BigBirdReturns-clifford-number-RD04-two-route-followup/1.0 "
    "(bounded repository research custody; contact through GitHub)"
)
PHYSICAL_REQUEST_BUDGET = 2
LOGICAL_ATTEMPT_BUDGET = 2


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def normalize_url(raw: str) -> str:
    parsed = urllib.parse.urlsplit(raw.strip())
    scheme = parsed.scheme.lower()
    hostname = (parsed.hostname or "").lower()
    port = parsed.port
    netloc = hostname
    if port and not (
        (scheme == "https" and port == 443) or (scheme == "http" and port == 80)
    ):
        netloc = f"{hostname}:{port}"
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return urllib.parse.urlunsplit((scheme, netloc, path, parsed.query, ""))


def repository_head(root: pathlib.Path) -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip()


def repository_parent(root: pathlib.Path) -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD^"], cwd=root, text=True
    ).strip()


def load_json_bound(root: pathlib.Path, relative: pathlib.Path) -> tuple[dict[str, Any], dict[str, Any]]:
    payload = (root / relative).read_bytes()
    actual_blob = git_blob_sha(payload)
    expected_blob = EXPECTED_GIT_BLOBS[relative.as_posix()]
    if actual_blob != expected_blob:
        raise ValueError(
            f"Git blob drift for {relative.as_posix()}: {actual_blob} != {expected_blob}"
        )
    return json.loads(payload), {
        "path": relative.as_posix(),
        "bytes": len(payload),
        "sha256": sha256(payload),
        "git_blob": actual_blob,
    }


def find_decision(field_adjudications: dict[str, Any], decision_id: str) -> dict[str, Any]:
    matches = [
        decision
        for decision in field_adjudications["decisions"]
        if decision["decision_id"] == decision_id
    ]
    if len(matches) != 1:
        raise ValueError(f"decision denominator differs for {decision_id}")
    return matches[0]


def find_row(matrix: dict[str, Any], unit_id: str) -> dict[str, Any]:
    matches = [row for row in matrix["rows"] if row["unit_id"] == unit_id]
    if len(matches) != 1:
        raise ValueError(f"matrix row denominator differs for {unit_id}")
    return matches[0]


def find_cell(row: dict[str, Any], field_id: str) -> dict[str, Any]:
    matches = [cell for cell in row["cells"] if cell["field_id"] == field_id]
    if len(matches) != 1:
        raise ValueError(f"matrix cell denominator differs for {row['unit_id']}:{field_id}")
    return matches[0]


def load_and_validate_inputs(root: pathlib.Path = ROOT) -> tuple[
    dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], list[dict[str, Any]]
]:
    resolved = root.resolve()
    if resolved != ROOT.resolve():
        raise ValueError("repository root override refused")

    protocol, protocol_ledger = load_json_bound(root, PROTOCOL_PATH)
    field_adjudications, field_ledger = load_json_bound(root, FIELD_ADJUDICATIONS_PATH)
    matrix, matrix_ledger = load_json_bound(root, MATRIX_PATH)
    promotion_summary, promotion_summary_ledger = load_json_bound(
        root, PROMOTION_SUMMARY_PATH
    )
    input_ledger = [
        protocol_ledger,
        field_ledger,
        matrix_ledger,
        promotion_summary_ledger,
    ]

    if protocol["schema_version"] != "ssc-rd04-postpromotion-five-route-adjudication@1":
        raise ValueError("follow-up protocol schema version differs")
    if protocol["object_type"] != "selected_followup_protocol":
        raise ValueError("follow-up protocol object type differs")
    if protocol["fixed_route_count"] != 2 or len(protocol["routes"]) != 2:
        raise ValueError("follow-up route denominator differs from two")
    if protocol["maximum_attempts_per_route"] != 1:
        raise ValueError("route-attempt ceiling differs from one")
    if protocol["maximum_total_requests_in_later_separate_execution"] != 2:
        raise ValueError("logical request ceiling differs from two")
    if protocol["parallel_workers"] != 1:
        raise ValueError("follow-up execution must remain sequential")
    if protocol["result_spawned_requests"] != 0:
        raise ValueError("result-spawned requests are enabled")
    if protocol["authority_boundary"] != {
        "adoption_effect": "none",
        "class_closed": False,
        "common_purpose_effect": "none",
        "complete_compact_effect": "none",
        "coordination_effect": "none",
        "cumulative_ledger_effect": "none",
        "discrimination_effect": "none",
        "external_contacts": 0,
        "external_reviews": 0,
        "field_classifications_created": 0,
        "field_terminalizations_created": 0,
        "graph_effect": "none",
        "matrix_updates": 0,
        "national_prevalence_effect": "none",
        "outside_human_dependency": False,
        "publication_effect": "none",
        "racial_order_effect": "none",
        "row_state_mutations": 0,
        "source_admissions_created": 0,
        "source_requests_executed_by_adjudication": 0,
    }:
        raise ValueError("follow-up authority boundary differs")

    matrix_counts = matrix["counts"]
    expected_counts = {
        "materialized_cells": 450,
        "terminal_cells": 226,
        "still_open_cells": 224,
        "terminal_substantive_cells": 116,
        "still_open_substantive_cells": 184,
        "terminal_units": 10,
        "class_closed": False,
    }
    for key, expected in expected_counts.items():
        if matrix_counts[key] != expected:
            raise ValueError(f"current matrix count differs: {key}")

    current_result = promotion_summary["current_result"]
    if current_result["promotion_adjudication_complete"] is not True:
        raise ValueError("four-cell promotion is not complete")
    if current_result["held_north_dakota_cells_remaining"] != 2:
        raise ValueError("North Dakota held-cell denominator differs")
    if current_result["class_closed"] is not False:
        raise ValueError("RD-04 class unexpectedly closed")
    if promotion_summary["next_bounded_operation"] != (
        "execute or otherwise adjudicate the already-selected two-route North Dakota "
        "follow-up protocol only in a separate request-bounded transaction; no follow-up "
        "result may create automatic source, field, row, class, publication, adoption, "
        "or graph authority"
    ):
        raise ValueError("next bounded operation differs")

    nd_row = find_row(matrix, "US-STATE-ND")
    if nd_row["row_state"] != "still_open":
        raise ValueError("North Dakota row is not open")

    route_ids: set[str] = set()
    normalized_urls: set[str] = set()
    held_decisions: list[dict[str, Any]] = []
    for expected, route in zip(EXPECTED_ROUTES, protocol["routes"], strict=True):
        for key in (
            "route_ordinal",
            "route_id",
            "expected_host",
            "target_decision_id",
            "target_field_ids",
        ):
            if route[key] != expected[key]:
                raise ValueError(f"route binding differs for {expected['route_id']}:{key}")
        if route["requested_url"] != expected["requested_url"]:
            raise ValueError(f"requested URL differs for {expected['route_id']}")
        normalized = normalize_url(route["requested_url"])
        if normalized != route["normalized_url"]:
            raise ValueError(f"normalized URL differs for {expected['route_id']}")
        if sha256(normalized.encode("utf-8")) != route["url_sha256"]:
            raise ValueError(f"URL digest differs for {expected['route_id']}")
        if route["normalized_url_sha256"] != route["url_sha256"]:
            raise ValueError(f"normalized URL digest differs for {expected['route_id']}")
        parsed = urllib.parse.urlsplit(normalized)
        if parsed.scheme != "https" or parsed.hostname != expected["expected_host"]:
            raise ValueError(f"route scheme or host differs for {expected['route_id']}")
        if route["request_method"] != "GET":
            raise ValueError(f"route method differs for {expected['route_id']}")
        if route["maximum_attempts"] != 1:
            raise ValueError(f"route attempt ceiling differs for {expected['route_id']}")
        if route["maximum_redirects"] > 4:
            raise ValueError(f"route redirect ceiling widened for {expected['route_id']}")
        if route["maximum_body_bytes"] > 33_554_432:
            raise ValueError(f"route body ceiling widened for {expected['route_id']}")
        if route["result_spawned_requests"] != 0:
            raise ValueError(f"route spawned request capability for {expected['route_id']}")
        if any(
            route[key]
            for key in (
                "cross_host_redirects_allowed",
                "automatic_source_admission",
                "automatic_field_classification",
                "automatic_row_terminalization",
                "automatic_class_closure",
                "outside_human_dependency",
            )
        ):
            raise ValueError(f"route authority boundary differs for {expected['route_id']}")
        if route["route_id"] in route_ids or normalized in normalized_urls:
            raise ValueError("duplicate follow-up route")
        route_ids.add(route["route_id"])
        normalized_urls.add(normalized)

        decision = find_decision(field_adjudications, expected["target_decision_id"])
        if decision["disposition"] != expected["held_disposition"]:
            raise ValueError(f"held disposition differs for {expected['target_decision_id']}")
        if decision["promotion_candidate"] is not False:
            raise ValueError(f"held decision became promotion candidate: {expected['target_decision_id']}")
        if decision["field_id"] != expected["target_field_ids"][0]:
            raise ValueError(f"held field differs for {expected['target_decision_id']}")
        if decision["selected_followup_route_ids"] != [expected["route_id"]]:
            raise ValueError(f"held route selection differs for {expected['target_decision_id']}")
        if decision["row_state_effect"] != "none":
            raise ValueError(f"held row-state boundary differs for {expected['target_decision_id']}")

        cell = find_cell(nd_row, expected["target_field_ids"][0])
        if cell["state"] != "still_open" or cell["terminal"] is not False:
            raise ValueError(
                f"target cell is no longer open: US-STATE-ND:{expected['target_field_ids'][0]}"
            )

        held_decisions.append(
            {
                "decision_id": decision["decision_id"],
                "field_id": decision["field_id"],
                "disposition": decision["disposition"],
                "selected_followup_route_ids": decision["selected_followup_route_ids"],
                "current_cell_sha256": sha256(canonical_json(cell)),
                "current_cell_state": cell["state"],
                "current_cell_terminal": cell["terminal"],
            }
        )

    return protocol, field_adjudications, matrix, promotion_summary, input_ledger


@dataclass
class RedirectRefused(Exception):
    target_url: str
    reason: str


@dataclass
class RequestBudgetExceeded(Exception):
    maximum: int
    used: int


class RequestBudget:
    def __init__(self, maximum: int) -> None:
        self.maximum = maximum
        self.used = 0
        self.events: list[dict[str, Any]] = []

    def consume(self, route_id: str, request_kind: str, url: str) -> None:
        if self.used >= self.maximum:
            raise RequestBudgetExceeded(self.maximum, self.used)
        self.used += 1
        self.events.append(
            {
                "physical_request_ordinal": self.used,
                "route_id": route_id,
                "request_kind": request_kind,
                "url": normalize_url(url),
            }
        )


class FixedHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(
        self,
        route_id: str,
        allowed_host: str,
        maximum_redirects: int,
        budget: RequestBudget,
    ) -> None:
        super().__init__()
        self.route_id = route_id
        self.allowed_host = allowed_host
        self.maximum_redirects = maximum_redirects
        self.budget = budget
        self.redirects: list[dict[str, Any]] = []

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        normalized = normalize_url(urllib.parse.urljoin(req.full_url, newurl))
        parsed = urllib.parse.urlsplit(normalized)
        if parsed.scheme != "https":
            raise RedirectRefused(normalized, "non_https_redirect")
        if parsed.hostname != self.allowed_host:
            raise RedirectRefused(normalized, "cross_host_redirect")
        if len(self.redirects) >= self.maximum_redirects:
            raise RedirectRefused(normalized, "maximum_redirects_exceeded")
        self.budget.consume(self.route_id, "redirect", normalized)
        self.redirects.append(
            {
                "status": int(code),
                "from_url": normalize_url(req.full_url),
                "to_url": normalized,
            }
        )
        return super().redirect_request(req, fp, code, msg, headers, normalized)


def read_limited(response: Any, maximum_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = response.read(min(65_536, maximum_bytes + 1 - total))
        if not chunk:
            return b"".join(chunks)
        chunks.append(chunk)
        total += len(chunk)
        if total > maximum_bytes:
            raise OverflowError("body limit exceeded")


def initial_result(route: dict[str, Any]) -> dict[str, Any]:
    return {
        "route_ordinal": route["route_ordinal"],
        "route_id": route["route_id"],
        "postal_code": route["postal_code"],
        "route_category": route["route_category"],
        "requested_url": route["normalized_url"],
        "expected_host": route["expected_host"],
        "target_decision_id": route["target_decision_id"],
        "target_field_ids": route["target_field_ids"],
        "attempts": 0,
        "physical_request_count": 0,
        "redirect_chain": [],
        "final_url": None,
        "terminal_state": None,
        "http_status": None,
        "content_type": None,
        "body_path": None,
        "body_bytes": 0,
        "body_sha256": None,
        "headers_path": None,
        "headers_sha256": None,
        "receipt_path": None,
        "receipt_preimage_sha256": None,
        "error": None,
        "source_admission_effect": "none",
        "field_classification_effect": "none",
        "field_terminalization_effect": "none",
        "matrix_effect": "none",
        "row_state_effect": "none",
        "class_effect": "none",
        "cumulative_ledger_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "result_spawned_requests": 0,
        "outside_human_dependency": False,
    }


def write_route_receipt(
    result: dict[str, Any], route_dir: pathlib.Path, output: pathlib.Path
) -> None:
    receipt_path = route_dir / "receipt.json"
    result["receipt_path"] = receipt_path.relative_to(output).as_posix()
    result["receipt_preimage_sha256"] = None
    result["receipt_preimage_sha256"] = sha256(canonical_json(result))
    receipt_path.write_bytes(canonical_json(result))


def execute_route(
    route: dict[str, Any], output: pathlib.Path, budget: RequestBudget
) -> dict[str, Any]:
    route_id = route["route_id"]
    request_url = route["normalized_url"]
    route_dir = output / "routes" / route_id
    route_dir.mkdir(parents=True, exist_ok=True)
    result = initial_result(route)
    budget_before = budget.used

    try:
        budget.consume(route_id, "initial", request_url)
        result["attempts"] = 1
    except RequestBudgetExceeded as error:
        result["terminal_state"] = "terminal_request_budget_exhausted"
        result["error"] = f"physical request budget exhausted: {error.used}/{error.maximum}"
        write_route_receipt(result, route_dir, output)
        return result

    redirect_handler = FixedHostRedirectHandler(
        route_id, route["expected_host"], route["maximum_redirects"], budget
    )
    opener = urllib.request.build_opener(redirect_handler)
    request = urllib.request.Request(
        request_url,
        method="GET",
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Cache-Control": "no-cache",
        },
    )

    try:
        with opener.open(request, timeout=45) as response:
            result["http_status"] = int(response.status)
            result["final_url"] = normalize_url(response.geturl())
            final = urllib.parse.urlsplit(result["final_url"])
            if final.scheme != "https" or final.hostname != route["expected_host"]:
                raise RedirectRefused(result["final_url"], "final_url_boundary")
            result["content_type"] = response.headers.get("Content-Type")
            result["redirect_chain"] = redirect_handler.redirects
            body = read_limited(response, route["maximum_body_bytes"])
            headers = "".join(f"{key}: {value}\n" for key, value in response.headers.items())
            headers_path = route_dir / "headers.txt"
            headers_path.write_text(headers, encoding="utf-8")
            result["headers_path"] = headers_path.relative_to(output).as_posix()
            result["headers_sha256"] = sha256(headers_path.read_bytes())
            if body:
                body_path = route_dir / "body.bin"
                body_path.write_bytes(body)
                result["body_path"] = body_path.relative_to(output).as_posix()
                result["body_bytes"] = len(body)
                result["body_sha256"] = sha256(body)
            result["terminal_state"] = (
                "terminal_http_success_body_captured"
                if 200 <= response.status < 300 and body
                else "terminal_http_success_no_body"
                if 200 <= response.status < 300
                else "terminal_http_non_success"
            )
    except RedirectRefused as error:
        result["terminal_state"] = {
            "non_https_redirect": "terminal_non_https_redirect_refused",
            "cross_host_redirect": "terminal_cross_host_redirect_refused",
            "maximum_redirects_exceeded": "terminal_maximum_redirects_refused",
            "final_url_boundary": "terminal_final_url_boundary_refused",
        }.get(error.reason, "terminal_redirect_refused")
        result["error"] = f"{error.reason} refused: {error.target_url}"
        result["redirect_chain"] = redirect_handler.redirects
    except RequestBudgetExceeded as error:
        result["terminal_state"] = "terminal_request_budget_exhausted"
        result["error"] = f"physical request budget exhausted: {error.used}/{error.maximum}"
        result["redirect_chain"] = redirect_handler.redirects
    except OverflowError as error:
        result["terminal_state"] = "terminal_body_limit_exceeded"
        result["error"] = str(error)
        result["redirect_chain"] = redirect_handler.redirects
    except urllib.error.HTTPError as error:
        result["http_status"] = int(error.code)
        result["final_url"] = normalize_url(error.geturl())
        result["content_type"] = error.headers.get("Content-Type")
        result["redirect_chain"] = redirect_handler.redirects
        headers = "".join(f"{key}: {value}\n" for key, value in error.headers.items())
        headers_path = route_dir / "headers.txt"
        headers_path.write_text(headers, encoding="utf-8")
        result["headers_path"] = headers_path.relative_to(output).as_posix()
        result["headers_sha256"] = sha256(headers_path.read_bytes())
        try:
            body = read_limited(error, route["maximum_body_bytes"])
        except OverflowError:
            result["terminal_state"] = "terminal_body_limit_exceeded"
            result["error"] = "body limit exceeded"
        else:
            if body:
                body_path = route_dir / "body.bin"
                body_path.write_bytes(body)
                result["body_path"] = body_path.relative_to(output).as_posix()
                result["body_bytes"] = len(body)
                result["body_sha256"] = sha256(body)
            result["terminal_state"] = "terminal_http_non_success"
            result["error"] = f"HTTP {error.code}"
    except Exception as error:
        result["terminal_state"] = "terminal_transport_error"
        result["error"] = f"{type(error).__name__}: {error}"
        result["redirect_chain"] = redirect_handler.redirects

    result["physical_request_count"] = budget.used - budget_before
    write_route_receipt(result, route_dir, output)
    return result


def write_receipt_file_ledger(
    output: pathlib.Path, results: list[dict[str, Any]]
) -> dict[str, Any]:
    entries = []
    for result in results:
        path = output / result["receipt_path"]
        payload = path.read_bytes()
        entries.append(
            {
                "route_id": result["route_id"],
                "receipt_path": result["receipt_path"],
                "receipt_bytes": len(payload),
                "receipt_sha256": sha256(payload),
                "receipt_preimage_sha256": result["receipt_preimage_sha256"],
            }
        )
    ledger = {
        "schema_version": "ssc-rd04-postpromotion-two-route-followup-receipt-ledger@1",
        "hash_semantics": (
            "receipt_sha256 authenticates final retained receipt bytes; "
            "receipt_preimage_sha256 authenticates the canonical receipt with "
            "receipt_preimage_sha256 set to null"
        ),
        "entries": entries,
    }
    (output / "receipt-file-ledger.json").write_bytes(canonical_json(ledger))
    return ledger


def write_checksums(output: pathlib.Path) -> None:
    rows: list[str] = []
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(rows) + "\n", encoding="utf-8")


def execution_plan(protocol: dict[str, Any], held_decisions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schema_version": "ssc-rd04-postpromotion-two-route-followup-execution-plan@1",
        "canonical_parent": CANONICAL_PARENT,
        "fixed_route_count": protocol["fixed_route_count"],
        "maximum_logical_route_attempts": LOGICAL_ATTEMPT_BUDGET,
        "maximum_physical_requests_including_redirects": PHYSICAL_REQUEST_BUDGET,
        "parallel_workers": 1,
        "route_ids": [route["route_id"] for route in protocol["routes"]],
        "target_decision_ids": [route["target_decision_id"] for route in protocol["routes"]],
        "target_field_ids": [route["target_field_ids"] for route in protocol["routes"]],
        "held_decisions": held_decisions,
        "source_admission_effect": "none",
        "field_classification_effect": "none",
        "field_terminalization_effect": "none",
        "matrix_effect": "none",
        "row_state_effect": "none",
        "class_effect": "none",
        "cumulative_ledger_effect": "none",
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "outside_human_dependency": False,
    }


def reconstruct_held_decisions(
    protocol: dict[str, Any], field_adjudications: dict[str, Any], matrix: dict[str, Any]
) -> list[dict[str, Any]]:
    nd_row = find_row(matrix, "US-STATE-ND")
    held = []
    for expected, route in zip(EXPECTED_ROUTES, protocol["routes"], strict=True):
        decision = find_decision(field_adjudications, route["target_decision_id"])
        cell = find_cell(nd_row, route["target_field_ids"][0])
        held.append(
            {
                "decision_id": decision["decision_id"],
                "field_id": decision["field_id"],
                "disposition": decision["disposition"],
                "selected_followup_route_ids": decision["selected_followup_route_ids"],
                "current_cell_sha256": sha256(canonical_json(cell)),
                "current_cell_state": cell["state"],
                "current_cell_terminal": cell["terminal"],
            }
        )
    return held


def run_self_test() -> None:
    protocol, field_adjudications, matrix, _, _ = load_and_validate_inputs()
    held = reconstruct_held_decisions(protocol, field_adjudications, matrix)
    assert len(held) == 2
    budget = RequestBudget(2)
    budget.consume("r1", "initial", "https://www.nd.gov/a")
    budget.consume("r2", "initial", "https://www.nd.gov/b")
    try:
        budget.consume("r3", "initial", "https://www.nd.gov/c")
    except RequestBudgetExceeded:
        pass
    else:
        raise AssertionError("physical request budget widened")
    request = urllib.request.Request("https://www.nd.gov/a")
    handler = FixedHostRedirectHandler("r1", "www.nd.gov", 4, RequestBudget(2))
    try:
        handler.redirect_request(
            request, None, 302, "Found", {}, "https://example.com/escape"
        )
    except RedirectRefused as error:
        assert error.reason == "cross_host_redirect"
    else:
        raise AssertionError("cross-host redirect accepted")
    with tempfile.TemporaryDirectory() as tmp:
        output = pathlib.Path(tmp)
        route = protocol["routes"][0]
        route_dir = output / "routes" / route["route_id"]
        route_dir.mkdir(parents=True)
        result = initial_result(route)
        result["terminal_state"] = "terminal_request_budget_exhausted"
        write_route_receipt(result, route_dir, output)
        ledger = write_receipt_file_ledger(output, [result])
        receipt = (output / result["receipt_path"]).read_bytes()
        assert ledger["entries"][0]["receipt_sha256"] == sha256(receipt)
        assert ledger["entries"][0]["receipt_preimage_sha256"] == result[
            "receipt_preimage_sha256"
        ]
    print("rd04_two_route_followup_self_test=pass controls=6")


def run_execution(output: pathlib.Path) -> int:
    if os.environ.get("EXECUTE_RD04_POSTPROMOTION_FOLLOWUP") != "YES":
        raise SystemExit(
            "execution refused: set EXECUTE_RD04_POSTPROMOTION_FOLLOWUP=YES "
            "inside the dedicated never-merge carrier"
        )
    if output.exists():
        raise SystemExit(f"output already exists: {output}")
    output.mkdir(parents=True)

    protocol, field_adjudications, matrix, promotion_summary, input_ledger = (
        load_and_validate_inputs()
    )
    held_decisions = reconstruct_held_decisions(protocol, field_adjudications, matrix)
    plan = execution_plan(protocol, held_decisions)

    (output / "protocol-snapshot.json").write_bytes(canonical_json(protocol))
    (output / "input-ledger.json").write_bytes(canonical_json(input_ledger))
    (output / "execution-plan.json").write_bytes(canonical_json(plan))
    (output / "carrier-head.txt").write_text(repository_head(ROOT) + "\n", encoding="utf-8")
    (output / "carrier-parent.txt").write_text(
        repository_parent(ROOT) + "\n", encoding="utf-8"
    )
    (output / "canonical-parent.txt").write_text(CANONICAL_PARENT + "\n", encoding="utf-8")

    budget = RequestBudget(PHYSICAL_REQUEST_BUDGET)
    results = [execute_route(route, output, budget) for route in protocol["routes"]]
    write_receipt_file_ledger(output, results)

    terminal_ids = [result["route_id"] for result in results if result["terminal_state"]]
    logical_attempts_used = sum(result["attempts"] for result in results)
    state_counts = Counter(result["terminal_state"] for result in results)
    total_body_bytes = sum(result["body_bytes"] for result in results)

    receipt = {
        "schema_version": "ssc-rd04-postpromotion-two-route-followup-execution-receipt@1",
        "canonical_parent": CANONICAL_PARENT,
        "carrier_head": repository_head(ROOT),
        "carrier_parent": repository_parent(ROOT),
        "fixed_route_count": 2,
        "captured_route_ids": [result["route_id"] for result in results],
        "terminal_route_ids": terminal_ids,
        "logical_attempt_budget": LOGICAL_ATTEMPT_BUDGET,
        "logical_attempts_used": logical_attempts_used,
        "physical_request_budget": PHYSICAL_REQUEST_BUDGET,
        "physical_requests_used": budget.used,
        "physical_request_events": budget.events,
        "receipt_file_ledger_path": "receipt-file-ledger.json",
        "results": results,
        "result_spawned_requests": 0,
        "automatic_source_admissions": 0,
        "automatic_field_classifications": 0,
        "automatic_field_terminalizations": 0,
        "automatic_matrix_updates": 0,
        "automatic_row_terminalizations": 0,
        "automatic_class_closures": 0,
        "cumulative_ledger_effect": "none",
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    (output / "route-results.json").write_bytes(canonical_json(results))
    (output / "execution-receipt.json").write_bytes(canonical_json(receipt))

    qualified = (
        terminal_ids == [route["route_id"] for route in protocol["routes"]]
        and logical_attempts_used == LOGICAL_ATTEMPT_BUDGET
        and all(result["attempts"] == 1 for result in results)
        and budget.used <= PHYSICAL_REQUEST_BUDGET
    )
    summary = {
        "schema_version": "ssc-rd04-postpromotion-two-route-followup-transport-summary@1",
        "canonical_parent": CANONICAL_PARENT,
        "fixed_routes": 2,
        "logical_source_requests_executed": logical_attempts_used,
        "physical_http_requests_executed": budget.used,
        "terminal_routes": len(terminal_ids),
        "terminal_state_counts": dict(sorted(state_counts.items())),
        "captured_body_bytes": total_body_bytes,
        "qualified_transport_completion": qualified,
        "result_spawned_requests": 0,
        "source_admissions": 0,
        "field_classifications": 0,
        "field_terminalizations": 0,
        "matrix_updates": 0,
        "row_state_mutations": 0,
        "class_closed": False,
        "cumulative_ledger_effect": "none",
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "held_north_dakota_cells_preserved": promotion_summary["current_result"][
            "held_north_dakota_cells_remaining"
        ],
    }
    (output / "transport-summary.json").write_bytes(canonical_json(summary))
    (output / "completion.json").write_bytes(
        canonical_json(
            {
                "stage": "complete" if qualified else "partial_or_failed_closed",
                "exit_code": 0 if qualified else 2,
                "qualified_transport_completion": qualified,
                "terminal_route_ids": terminal_ids,
                "logical_attempts_used": logical_attempts_used,
                "physical_requests_used": budget.used,
            }
        )
    )
    (output / "BOUNDARY").write_text(
        "\n".join(
            [
                f"logical_source_requests_executed={logical_attempts_used}",
                f"physical_http_requests_executed={budget.used}",
                f"terminal_routes={len(terminal_ids)}",
                "result_spawned_requests=0",
                "source_admissions=0",
                "field_classifications=0",
                "field_terminalizations=0",
                "matrix_updates=0",
                "row_state_mutations=0",
                "class_closed=false",
                "cumulative_ledger_effect=none",
                "outside_human_dependency=false",
                "publication_effect=none",
                "adoption_effect=none",
                "graph_effect=none",
                f"qualified_transport_completion={str(qualified).lower()}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    write_checksums(output)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if qualified else 2


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--execute", action="store_true")
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    protocol, field_adjudications, matrix, _, _ = load_and_validate_inputs()
    held = reconstruct_held_decisions(protocol, field_adjudications, matrix)
    if args.dry_run:
        print(json.dumps(execution_plan(protocol, held), indent=2, sort_keys=True))
        return 0

    if args.output is None:
        parser.error("--output is required with --execute")
    return run_execution(args.output.resolve())


if __name__ == "__main__":
    sys.exit(main())
