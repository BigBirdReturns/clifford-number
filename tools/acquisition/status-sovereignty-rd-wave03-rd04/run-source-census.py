#!/usr/bin/env python3
"""Execute the fixed RD-04 Wave-03 204-route source census.

The runner preserves transport and candidate custody only. It never admits a
candidate as evidence, classifies a state-policy field, or closes RD-04-C02.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[3]
if not (ROOT / "package.json").is_file():
    raise RuntimeError(f"repository root resolution failed: {ROOT}")

BASE = ROOT / "data/intake/status-sovereignty-rd-wave03-rd04-state-implementation"
PROTOCOL_PATH = BASE / "source-census-protocol.json"
MATRIX_PATH = BASE / "field-matrix-contract.json"
SEED_PATH = ROOT / "data/project/ssc-residual-wave03/seeds/RD-04-C02.json"

EXPECTED_ROUTES = 204
EXPECTED_EXACT_ROUTES = 54
EXPECTED_CANDIDATE_ROUTES = 150
EXPECTED_STATE_ROWS = 50
MAXIMUM_CANDIDATES = 1500


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def allowed_host(host: str, suffix: str) -> bool:
    host = host.lower().rstrip(".")
    suffix = suffix.lower().rstrip(".")
    return host == suffix or host.endswith("." + suffix)


def clean_text(value: str | None, maximum: int = 4000) -> str:
    if not value:
        return ""
    value = html.unescape(value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value[:maximum]


def validate_protocol(protocol: dict[str, Any]) -> dict[str, int]:
    if protocol.get("schema_version") != "ssc-rd-wave03-rd04-state-implementation-source-census-protocol@1":
        raise RuntimeError("protocol schema changed")
    if (protocol.get("wave_id"), protocol.get("lane_id"), protocol.get("class_id"), protocol.get("issue")) != (
        "SSC-RD-W03",
        "RD-04",
        "RD-04-C02",
        1017,
    ):
        raise RuntimeError("protocol identity changed")

    routes = protocol.get("routes")
    if not isinstance(routes, list) or len(routes) != EXPECTED_ROUTES:
        raise RuntimeError(f"route denominator changed: {len(routes) if isinstance(routes, list) else 'not-list'}")
    route_ids = [str(route.get("route_id", "")) for route in routes]
    if len(set(route_ids)) != EXPECTED_ROUTES or any(not route_id for route_id in route_ids):
        raise RuntimeError("route IDs must be nonempty and unique")

    exact = [route for route in routes if route.get("route_type") == "exact_official_get"]
    candidates = [route for route in routes if route.get("route_type") == "candidate_census_rss"]
    if len(exact) != EXPECTED_EXACT_ROUTES or len(candidates) != EXPECTED_CANDIDATE_ROUTES:
        raise RuntimeError("exact/candidate route counts changed")
    if any(route.get("maximum_attempts") != 1 for route in routes):
        raise RuntimeError("route attempt ceiling changed")
    if any(route.get("candidate_rows_are_admitted_sources") is not False for route in routes):
        raise RuntimeError("candidate admission boundary changed")
    if any(route.get("result_spawned_requests") != 0 for route in routes):
        raise RuntimeError("result-spawned request boundary changed")
    if any(route.get("maximum_candidate_rows") != 10 for route in candidates):
        raise RuntimeError("candidate row ceiling changed")
    if any(not str(route.get("requested_url", "")).startswith("https://") for route in routes):
        raise RuntimeError("non-HTTPS route found")
    if any(not route.get("allowed_final_host_suffix") for route in routes):
        raise RuntimeError("route host boundary missing")

    denominator = protocol.get("denominator", {})
    expected_denominator = {
        "state_rows": 50,
        "district_of_columbia_rows": 0,
        "territorial_rows": 0,
        "required_fields_per_state": 9,
        "required_cells": 450,
        "shared_exact_official_routes": 4,
        "state_exact_directory_routes": 50,
        "candidate_query_classes_per_state": 3,
        "candidate_census_routes": 150,
        "fixed_routes": 204,
        "maximum_candidate_rows": 1500,
    }
    if denominator != expected_denominator:
        raise RuntimeError("protocol denominator changed")

    execution = protocol.get("execution_contract", {})
    if execution.get("maximum_attempts_per_route") != 1 or execution.get("maximum_parallel_workers") != 8:
        raise RuntimeError("execution ceiling changed")
    for key in (
        "candidate_rows_are_admitted_sources",
        "candidate_followup_without_separate_protocol",
        "federal_rule_is_state_implementation",
        "waiver_authority_is_requested_approved_or_current_waiver",
        "exemption_authority_is_observed_use",
        "screening_rule_is_uniform_staff_practice",
        "missing_state_record_is_no_policy_or_practice",
        "automatic_field_closure",
        "automatic_class_closure",
    ):
        if execution.get(key) is not False:
            raise RuntimeError(f"execution boundary changed: {key}")
    if execution.get("result_spawned_requests") != 0:
        raise RuntimeError("execution result-spawned requests changed")

    matrix = json.loads(MATRIX_PATH.read_text(encoding="utf-8"))
    if len(matrix.get("units", [])) != EXPECTED_STATE_ROWS or matrix.get("expansion_contract", {}).get("required_cells") != 450:
        raise RuntimeError("matrix denominator changed")
    if matrix.get("current_counts", {}).get("class_closed") is not False:
        raise RuntimeError("matrix class state changed")

    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if seed.get("class_id") != "RD-04-C02" or seed.get("class_closed") is not False:
        raise RuntimeError("seed class boundary changed")

    return {
        "routes": len(routes),
        "exact_routes": len(exact),
        "candidate_routes": len(candidates),
        "state_rows": len(matrix["units"]),
    }


def parse_rss_candidates(route: dict[str, Any], body: bytes) -> tuple[list[dict[str, Any]], str | None]:
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        return [], str(exc)

    rows: list[dict[str, Any]] = []
    for ordinal, item in enumerate(root.findall(".//item")[: int(route["maximum_candidate_rows"])], start=1):
        link = clean_text(item.findtext("link"), maximum=8000)
        title = clean_text(item.findtext("title"))
        description = clean_text(item.findtext("description"))
        published = clean_text(item.findtext("pubDate"), maximum=500)
        if not link:
            continue
        candidate_id = sha256(f"{route['route_id']}\0{link}".encode("utf-8"))
        rows.append(
            {
                "candidate_id": candidate_id,
                "route_id": route["route_id"],
                "unit_ordinal": route["unit_ordinal"],
                "unit_id": route["unit_id"],
                "postal_code": route["postal_code"],
                "state_name": route["state_name"],
                "query_class": route["query_class"],
                "candidate_ordinal_within_route": ordinal,
                "title": title,
                "url": link,
                "snippet": description,
                "published_text": published,
                "admitted_source": False,
                "state_implementation_observed": False,
                "result_spawned_requests": 0,
            }
        )
    return rows, None


def execute_route(route_ordinal: int, route: dict[str, Any], output: pathlib.Path) -> dict[str, Any]:
    route_dir = output / "routes" / route["route_id"]
    route_dir.mkdir(parents=True, exist_ok=False)
    write_json(route_dir / "request.json", {"route_ordinal": route_ordinal, **route})

    headers_path = route_dir / "headers.txt"
    body_path = route_dir / "body.bin"
    stderr_path = route_dir / "stderr.txt"
    curl_path = route_dir / "curl.json"
    writeout = (
        '{"http_status":%{http_code},"final_url":"%{url_effective}",'
        '"content_type":"%{content_type}","size_download":%{size_download},'
        '"num_redirects":%{num_redirects},"time_total":%{time_total}}'
    )
    command = [
        "curl",
        "--location",
        "--silent",
        "--show-error",
        "--compressed",
        "--connect-timeout",
        "20",
        "--max-time",
        "120",
        "--retry",
        "0",
        "--max-filesize",
        str(route["maximum_body_bytes"]),
        "--dump-header",
        str(headers_path),
        "--output",
        str(body_path),
        "--write-out",
        writeout,
        "--user-agent",
        "clifford-number-rd04-wave03-source-census/1.0",
        route["requested_url"],
    ]
    try:
        completed = subprocess.run(command, text=True, capture_output=True, check=False, timeout=135)
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        stdout = exc.stdout or ""
        stderr = (exc.stderr or "") + "\nsubprocess timeout"
    stderr_path.write_text(stderr, encoding="utf-8")

    metadata: dict[str, Any] = {}
    if stdout.strip():
        try:
            metadata = json.loads(stdout)
        except json.JSONDecodeError:
            metadata = {"parse_error": stdout[:4000]}
    write_json(curl_path, {"exit_code": exit_code, "metadata": metadata})

    body = body_path.read_bytes() if body_path.exists() else b""
    headers = headers_path.read_bytes() if headers_path.exists() else b""
    final_url = str(metadata.get("final_url") or route["requested_url"])
    final_host = (urllib.parse.urlparse(final_url).hostname or "").lower()
    final_host_allowed = allowed_host(final_host, route["allowed_final_host_suffix"])
    status = int(metadata.get("http_status") or 0)
    content_type = str(metadata.get("content_type") or "")

    candidates: list[dict[str, Any]] = []
    rss_parse_error: str | None = None
    if exit_code != 0:
        terminal_state = "terminal_transport_failure"
    elif status != 200:
        terminal_state = "terminal_http_non_success"
    elif not final_host_allowed:
        terminal_state = "terminal_disallowed_final_host"
    elif route["route_type"] == "candidate_census_rss":
        candidates, rss_parse_error = parse_rss_candidates(route, body)
        terminal_state = "http_success_rss_candidate_census_captured" if rss_parse_error is None else "terminal_rss_parse_failure"
    else:
        terminal_state = "http_success_exact_surface_captured"

    write_json(route_dir / "candidates.json", {"route_id": route["route_id"], "candidates": candidates})
    receipt = {
        "schema_version": "ssc-rd04-wave03-source-census-route-receipt@1",
        "route_ordinal": route_ordinal,
        "route_id": route["route_id"],
        "route_type": route["route_type"],
        "scope": route["scope"],
        "unit_ordinal": route.get("unit_ordinal"),
        "unit_id": route.get("unit_id"),
        "postal_code": route.get("postal_code"),
        "state_name": route.get("state_name"),
        "query_class": route.get("query_class"),
        "requested_url": route["requested_url"],
        "curl_exit": exit_code,
        "http_status": status,
        "final_url": final_url,
        "final_host": final_host,
        "final_host_allowed": final_host_allowed,
        "content_type": content_type,
        "body_bytes": len(body),
        "body_sha256": sha256(body),
        "headers_sha256": sha256(headers),
        "candidate_rows": len(candidates),
        "rss_parse_error": rss_parse_error,
        "terminal_route_state": terminal_state,
        "admitted_sources": 0,
        "state_implementation_fields_classified": 0,
        "result_spawned_requests": 0,
    }
    write_json(route_dir / "receipt.json", receipt)
    return {"receipt": receipt, "candidates": candidates}


def build_manifest(output: pathlib.Path) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    for file_path in sorted(path for path in output.rglob("*") if path.is_file() and path.name != "manifest.json"):
        data = file_path.read_bytes()
        entries.append(
            {
                "path": file_path.relative_to(output).as_posix(),
                "bytes": len(data),
                "sha256": sha256(data),
            }
        )
    combined = "".join(f"{row['path']}\0{row['bytes']}\0{row['sha256']}\0" for row in entries).encode("utf-8")
    manifest = {
        "schema_version": "ssc-rd04-wave03-source-census-artifact-manifest@1",
        "entry_count": len(entries),
        "combined_sha256": sha256(combined),
        "entries": entries,
    }
    write_json(output / "manifest.json", manifest)
    return manifest


def validate_only(protocol: dict[str, Any]) -> int:
    counts = validate_protocol(protocol)
    print(
        json.dumps(
            {
                "status": "valid",
                "class_id": "RD-04-C02",
                **counts,
                "required_cells": 450,
                "automatic_source_admissions": 0,
                "automatic_field_closures": 0,
                "class_closed": False,
            },
            indent=2,
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="artifact output directory")
    parser.add_argument("--validate-only", action="store_true", help="validate the frozen plan without network requests")
    args = parser.parse_args()

    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    validate_protocol(protocol)
    if args.validate_only:
        return validate_only(protocol)
    if not args.output:
        parser.error("--output is required unless --validate-only is used")

    output = pathlib.Path(args.output).resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    inputs = output / "inputs"
    inputs.mkdir()
    shutil.copy2(PROTOCOL_PATH, inputs / PROTOCOL_PATH.name)
    shutil.copy2(MATRIX_PATH, inputs / MATRIX_PATH.name)
    shutil.copy2(SEED_PATH, inputs / SEED_PATH.name)

    routes: list[dict[str, Any]] = protocol["routes"]
    write_json(
        output / "plan.json",
        {
            "schema_version": "ssc-rd04-wave03-source-census-plan@1",
            "wave_id": "SSC-RD-W03",
            "lane_id": "RD-04",
            "class_id": "RD-04-C02",
            "issue": 1017,
            "state_rows": 50,
            "required_cells": 450,
            "routes": routes,
            "candidate_rows_are_admitted_sources": False,
            "result_spawned_requests": 0,
            "automatic_field_closure": False,
            "automatic_class_closure": False,
        },
    )

    route_inputs = [(ordinal, route, output) for ordinal, route in enumerate(routes, start=1)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=protocol["execution_contract"]["maximum_parallel_workers"]) as pool:
        results = list(pool.map(lambda values: execute_route(*values), route_inputs))

    results.sort(key=lambda row: row["receipt"]["route_ordinal"])
    receipts = [row["receipt"] for row in results]
    candidates = [candidate for row in results for candidate in row["candidates"]]
    candidates.sort(key=lambda row: (row["route_id"], row["candidate_ordinal_within_route"], row["candidate_id"]))

    write_json(
        output / "route-results.json",
        {"schema_version": "ssc-rd04-wave03-source-census-route-results@1", "routes": receipts},
    )
    write_json(
        output / "candidate-index.json",
        {
            "schema_version": "ssc-rd04-wave03-source-census-candidate-index@1",
            "candidate_rows": len(candidates),
            "admitted_sources": 0,
            "result_spawned_requests": 0,
            "candidates": candidates,
        },
    )

    state_counts: dict[str, int] = {}
    for receipt in receipts:
        state = receipt["terminal_route_state"]
        state_counts[state] = state_counts.get(state, 0) + 1
    summary = {
        "schema_version": "ssc-rd04-wave03-source-census-summary@1",
        "wave_id": "SSC-RD-W03",
        "lane_id": "RD-04",
        "class_id": "RD-04-C02",
        "issue": 1017,
        "terminal_capture_state": "fixed_204_route_source_census_executed_candidate_adjudication_pending",
        "counts": {
            "state_rows": 50,
            "required_cells": 450,
            "fixed_routes": 204,
            "route_attempts": 204,
            "terminal_routes": len(receipts),
            "route_state_counts": state_counts,
            "candidate_rows": len(candidates),
            "maximum_candidate_rows": MAXIMUM_CANDIDATES,
            "admitted_sources": 0,
            "state_implementation_fields_classified": 0,
            "result_spawned_requests": 0,
            "external_contacts": 0,
            "external_reviews": 0,
        },
        "current_result": {
            "source_census_execution_complete": len(receipts) == EXPECTED_ROUTES,
            "candidate_adjudication_complete": False,
            "field_matrix_terminal": False,
            "class_state": "still_open",
            "class_closed": False,
            "outside_human_dependency": False,
            "project_blocking": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        },
        "next_bounded_operation": "terminally adjudicate the captured candidate denominator before any exact-source follow-up or field classification",
    }
    write_json(output / "summary.json", summary)
    write_json(
        output / "execution-receipt.json",
        {
            "schema_version": "ssc-rd04-wave03-source-census-execution@1",
            "workflow_run": int(os.getenv("GITHUB_RUN_ID", "0")),
            "workflow_attempt": int(os.getenv("GITHUB_RUN_ATTEMPT", "0")),
            "head": os.getenv("GITHUB_SHA", ""),
            "protocol_sha256": sha256(PROTOCOL_PATH.read_bytes()),
            "fixed_routes": EXPECTED_ROUTES,
            "terminal_routes": len(receipts),
            "candidate_rows": len(candidates),
            "admitted_sources": 0,
            "state_implementation_fields_classified": 0,
            "result_spawned_requests": 0,
            "class_closed": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        },
    )
    build_manifest(output)

    if len(receipts) != EXPECTED_ROUTES:
        raise RuntimeError(f"terminal route denominator {len(receipts)}/{EXPECTED_ROUTES}")
    if len(candidates) > MAXIMUM_CANDIDATES:
        raise RuntimeError(f"candidate row ceiling exceeded: {len(candidates)}/{MAXIMUM_CANDIDATES}")
    if any(
        receipt["admitted_sources"] != 0
        or receipt["state_implementation_fields_classified"] != 0
        or receipt["result_spawned_requests"] != 0
        for receipt in receipts
    ):
        raise RuntimeError("capture authority violation")

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
