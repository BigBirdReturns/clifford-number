#!/usr/bin/env python3
"""Execute the fixed RD-02 Wave-03 public-record search census.

This runner preserves candidate custody only. It does not admit search results as
sources, spawn follow-up requests, infer the withheld fund's identity, or close
RD-02-C05.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
PROTOCOL_PATH = Path("data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/search-census-protocol.json")
MATRIX_PATH = Path("data/intake/status-sovereignty-rd-wave03-rd02-portfolio-lifecycle/field-matrix-contract.json")
SEED_PATH = Path("data/project/ssc-residual-wave03/seeds/RD-02-C05.json")


def fail(message: str) -> None:
    raise RuntimeError(message)


def check(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def timestamp() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def render_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def derive_routes(protocol: dict[str, Any], matrix: dict[str, Any]) -> list[dict[str, Any]]:
    named_units = [unit for unit in matrix["units"] if unit["identity_state"] == "publicly_named"]
    routes: list[dict[str, Any]] = []
    for unit in named_units:
        for spec in protocol["query_specs"]:
            query = f'"{unit["legal_vehicle"]}" {spec["terms"]}'
            routes.append(
                {
                    "route_id": f'RD02-W03-R{unit["unit_ordinal"]:02d}-{spec["query_class"].upper()}',
                    "unit_ordinal": unit["unit_ordinal"],
                    "query_class": spec["query_class"],
                    "legal_vehicle": unit["legal_vehicle"],
                    "query": query,
                    "url": protocol["route_derivation"]["search_base_url"]
                    + urllib.parse.quote(query, safe=""),
                    "maximum_attempts": protocol["execution_contract"]["maximum_attempts_per_route"],
                    "maximum_body_bytes": protocol["execution_contract"]["maximum_body_bytes"],
                    "candidate_rows_are_admitted_sources": protocol["execution_contract"][
                        "candidate_rows_are_admitted_sources"
                    ],
                    "result_spawned_requests": protocol["execution_contract"]["result_spawned_requests"],
                }
            )
    return routes


def render_route_ledger(protocol: dict[str, Any], routes: list[dict[str, Any]]) -> bytes:
    columns = protocol["route_derivation"]["route_ledger_columns"]
    rows = ["\t".join(columns)]
    rows.extend("\t".join(render_value(route[column]) for column in columns) for route in routes)
    return ("\n".join(rows) + "\n").encode("utf-8")


def validate_inputs(protocol: dict[str, Any], matrix: dict[str, Any], seed: dict[str, Any]) -> tuple[list[dict[str, Any]], bytes]:
    check(protocol["schema_version"] == "ssc-rd-wave03-rd02-search-census-protocol@1", "protocol identity changed")
    check(protocol["class_id"] == "RD-02-C05" and protocol["issue"] == 1015, "protocol class changed")
    check(protocol["authority"] == "fixed_search_census_protocol_not_empirical_receipt", "protocol authority escalated")
    check(matrix["schema_version"] == "ssc-rd-wave03-rd02-portfolio-lifecycle-field-matrix-contract@1", "matrix identity changed")
    check(matrix["status"] == "unit_and_field_contract_frozen_acquisition_not_executed", "matrix state changed")
    check(seed["class_id"] == "RD-02-C05" and seed["class_state"] == "still_open" and seed["class_closed"] is False, "seed state changed")

    check(len(matrix["units"]) == 18, "matrix unit denominator changed")
    check([unit["unit_ordinal"] for unit in matrix["units"]] == list(range(1, 19)), "matrix unit order changed")
    named = [unit for unit in matrix["units"] if unit["identity_state"] == "publicly_named"]
    withheld = [unit for unit in matrix["units"] if unit["identity_state"] == "identity_withheld_under_policy"]
    check(len(named) == 17 and len(withheld) == 1 and withheld[0]["unit_ordinal"] == 18, "17+1 identity denominator changed")
    check(withheld[0]["legal_vehicle"] is None, "withheld legal vehicle exposed or invented")
    check(matrix["expansion_contract"]["required_cells"] == 180, "matrix cell denominator changed")
    check(matrix["current_counts"] == {"materialized_cells": 0, "terminal_cells": 0, "terminal_units": 0, "class_closed": False}, "matrix acquisition state promoted")

    custody = protocol["source_custody"]
    check(git_output("hash-object", str(SEED_PATH)) == custody["seed_git_blob"], "seed Git blob changed")
    check(git_output("hash-object", str(MATRIX_PATH)) == custody["matrix_git_blob"], "matrix Git blob changed")

    denominator = protocol["denominator"]
    check(denominator["cohort_rows"] == 18 and denominator["publicly_named_rows"] == 17, "protocol row denominator changed")
    check(denominator["identity_withheld_rows"] == 1 and denominator["withheld_row_routes"] == 0, "withheld route boundary changed")
    check(denominator["query_classes"] == 3 and denominator["fixed_routes"] == 51, "route denominator changed")

    execution = protocol["execution_contract"]
    check(execution["maximum_attempts_per_route"] == 1, "attempt ceiling changed")
    check(execution["maximum_body_bytes"] == 2_097_152, "body ceiling changed")
    check(execution["maximum_parallel_workers"] == 6, "parallelism changed")
    check(execution["candidate_rows_are_admitted_sources"] is False, "candidate admission authorized")
    check(execution["candidate_followup_without_separate_protocol"] is False, "candidate follow-up authorized")
    check(execution["result_spawned_requests"] == 0, "result-spawned requests authorized")
    check(execution["automatic_class_closure"] is False, "automatic class closure authorized")

    withheld_boundary = protocol["withheld_boundary"]
    check(withheld_boundary == {
        "unit_ordinal": 18,
        "identity_state": "identity_withheld_under_policy",
        "network_routes": 0,
        "identity_guessing": False,
        "manager_substitution": False,
        "lifecycle_inference": False,
    }, "withheld boundary changed")

    routes = derive_routes(protocol, matrix)
    check(len(routes) == 51, "exactly fifty-one routes required")
    check(len({route["route_id"] for route in routes}) == 51, "duplicate route id")
    check(all(route["unit_ordinal"] <= 17 for route in routes), "withheld row received a route")
    check(all(route["result_spawned_requests"] == 0 for route in routes), "route-spawned request authorized")
    check(all(route["candidate_rows_are_admitted_sources"] is False for route in routes), "route candidate admission authorized")

    ledger = render_route_ledger(protocol, routes)
    derivation = protocol["route_derivation"]
    check(len(ledger) == derivation["route_ledger_bytes"], "route ledger byte count mismatch")
    check(sha256_bytes(ledger) == derivation["route_ledger_sha256"], "route ledger SHA-256 mismatch")
    return routes, ledger


def parse_rss(path: Path) -> tuple[list[dict[str, Any]], str | None]:
    try:
        root = ET.fromstring(path.read_bytes())
        rows: list[dict[str, Any]] = []
        for ordinal, item in enumerate(root.findall(".//item"), start=1):
            def text(tag: str) -> str:
                node = item.find(tag)
                return (node.text or "").strip() if node is not None and node.text else ""

            url = text("link")
            if not url:
                continue
            rows.append(
                {
                    "ordinal": ordinal,
                    "title": text("title"),
                    "url": url,
                    "domain": (urllib.parse.urlparse(url).hostname or "").lower(),
                    "description": text("description")[:4000],
                    "published": text("pubDate"),
                    "candidate_only": True,
                    "admitted_source": False,
                }
            )
        return rows, None
    except Exception as error:  # noqa: BLE001 - exact parse failure is retained
        return [], f"{type(error).__name__}: {error}"


def capture_route(output: Path, protocol: dict[str, Any], route: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    route_root = output / "routes" / route["route_id"]
    attempt = route_root / "attempt-1"
    attempt.mkdir(parents=True, exist_ok=True)

    body = attempt / "body.bin"
    headers = attempt / "headers.txt"
    stderr = attempt / "curl-stderr.txt"
    started_at = timestamp()

    (attempt / "request-url.txt").write_text(route["url"] + "\n", encoding="utf-8")
    (attempt / "query.txt").write_text(route["query"] + "\n", encoding="utf-8")
    (attempt / "started-at.txt").write_text(started_at + "\n", encoding="utf-8")
    write_json(attempt / "request.json", route)

    command = [
        "curl",
        "--location",
        "--silent",
        "--show-error",
        "--connect-timeout",
        "15",
        "--max-time",
        "45",
        "--max-filesize",
        str(route["maximum_body_bytes"]),
        "--retry",
        "0",
        "--user-agent",
        protocol["execution_contract"]["user_agent"],
        "--dump-header",
        str(headers),
        "--output",
        str(body),
        "--write-out",
        "%{http_code}\t%{url_effective}\t%{content_type}\t%{size_download}",
        route["url"],
    ]
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    body.touch(exist_ok=True)
    headers.touch(exist_ok=True)
    stderr.write_text(result.stderr, encoding="utf-8")
    (attempt / "curl-exit.txt").write_text(f"{result.returncode}\n", encoding="utf-8")
    (attempt / "curl-meta.txt").write_text(result.stdout + "\n", encoding="utf-8")
    (attempt / "finished-at.txt").write_text(timestamp() + "\n", encoding="utf-8")

    parts = result.stdout.split("\t", 3)
    status = int(parts[0]) if parts and parts[0].isdigit() else 0
    final_url = parts[1] if len(parts) > 1 else None
    content_type = parts[2] if len(parts) > 2 else None
    candidates: list[dict[str, Any]] = []
    parse_error: str | None = None
    if result.returncode == 0 and status == 200:
        candidates, parse_error = parse_rss(body)

    if result.returncode != 0:
        terminal_state = "terminal_transport_failure"
    elif status != 200:
        terminal_state = "terminal_http_non_success"
    elif parse_error is not None:
        terminal_state = "http_success_rss_parse_failed"
    else:
        terminal_state = "http_success_rss_parsed"

    receipt = {
        "schema_version": "ssc-rd02-wave03-search-route-receipt@1",
        "route_id": route["route_id"],
        "unit_ordinal": route["unit_ordinal"],
        "legal_vehicle": route["legal_vehicle"],
        "query_class": route["query_class"],
        "query": route["query"],
        "request_url": route["url"],
        "curl_exit": result.returncode,
        "http_status": status,
        "final_url": final_url,
        "content_type": content_type,
        "body_bytes": body.stat().st_size,
        "body_sha256": sha256_file(body),
        "headers_bytes": headers.stat().st_size,
        "headers_sha256": sha256_file(headers),
        "candidate_rows": len(candidates),
        "parse_error": parse_error,
        "terminal_route_state": terminal_state,
        "candidate_rows_are_admitted_sources": False,
        "result_spawned_requests": 0,
    }
    write_json(route_root / "receipt.json", receipt)
    projected = [
        {
            "route_id": route["route_id"],
            "unit_ordinal": route["unit_ordinal"],
            "legal_vehicle": route["legal_vehicle"],
            "query_class": route["query_class"],
            **candidate,
        }
        for candidate in candidates
    ]
    return receipt, projected


def build_manifest(output: Path) -> dict[str, Any]:
    entries = []
    for file_path in sorted(path for path in output.rglob("*") if path.is_file() and path.name != "manifest.json"):
        entries.append(
            {
                "path": str(file_path.relative_to(output)),
                "bytes": file_path.stat().st_size,
                "sha256": sha256_file(file_path),
            }
        )
    combined_input = "\n".join(f'{entry["path"]}\t{entry["bytes"]}\t{entry["sha256"]}' for entry in entries)
    return {
        "schema_version": "ssc-rd02-wave03-search-census-manifest@1",
        "entry_count": len(entries),
        "combined_sha256": sha256_bytes(combined_input.encode("utf-8")),
        "entries": entries,
    }


def execute(output: Path) -> dict[str, Any]:
    protocol = read_json(ROOT / PROTOCOL_PATH)
    matrix = read_json(ROOT / MATRIX_PATH)
    seed = read_json(ROOT / SEED_PATH)
    routes, ledger = validate_inputs(protocol, matrix, seed)

    output.mkdir(parents=True, exist_ok=False)
    inputs = output / "inputs"
    inputs.mkdir()
    for rel in [PROTOCOL_PATH, MATRIX_PATH, SEED_PATH]:
        target = inputs / rel.name
        target.write_bytes((ROOT / rel).read_bytes())

    (output / "routes.tsv").write_bytes(ledger)
    write_json(
        output / "input-bindings.json",
        {
            "schema_version": "ssc-rd02-wave03-search-census-input-bindings@1",
            "protocol_path": str(PROTOCOL_PATH),
            "protocol_sha256": sha256_file(ROOT / PROTOCOL_PATH),
            "matrix_path": str(MATRIX_PATH),
            "matrix_git_blob": protocol["source_custody"]["matrix_git_blob"],
            "matrix_sha256": sha256_file(ROOT / MATRIX_PATH),
            "seed_path": str(SEED_PATH),
            "seed_git_blob": protocol["source_custody"]["seed_git_blob"],
            "seed_sha256": sha256_file(ROOT / SEED_PATH),
            "head": git_output("rev-parse", "HEAD"),
        },
    )
    write_json(
        output / "plan.json",
        {
            "schema_version": "ssc-rd02-wave03-search-census-plan@1",
            "frozen_before_requests": True,
            "cohort_rows": 18,
            "publicly_named_rows": 17,
            "identity_withheld_rows": 1,
            "fixed_routes": 51,
            "withheld_row_routes": 0,
            "maximum_attempts_per_route": 1,
            "maximum_body_bytes": 2_097_152,
            "maximum_parallel_workers": 6,
            "route_ledger_bytes": len(ledger),
            "route_ledger_sha256": sha256_bytes(ledger),
            "candidate_urls_admitted": 0,
            "result_spawned_requests": 0,
            "class_state": "still_open",
            "class_closed": False,
        },
    )
    write_json(
        output / "protocol-validation.json",
        {
            "schema_version": "ssc-rd02-wave03-search-census-protocol-validation@1",
            "protocol_validated": True,
            "route_ids_unique": True,
            "fixed_routes": len(routes),
            "withheld_row_routes": 0,
            "route_ledger_bytes": len(ledger),
            "route_ledger_sha256": sha256_bytes(ledger),
            "candidate_rows_are_admitted_sources": False,
            "result_spawned_requests": 0,
            "automatic_class_closure": False,
        },
    )

    results: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    workers = protocol["execution_contract"]["maximum_parallel_workers"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(capture_route, output, protocol, route): route for route in routes}
        for future in concurrent.futures.as_completed(future_map):
            receipt, projected = future.result()
            results.append(receipt)
            candidates.extend(projected)

    results.sort(key=lambda row: row["route_id"])
    candidates.sort(key=lambda row: (row["route_id"], row["ordinal"]))
    state_counts: dict[str, int] = {}
    for row in results:
        state_counts[row["terminal_route_state"]] = state_counts.get(row["terminal_route_state"], 0) + 1
    domain_counts: dict[str, int] = {}
    for row in candidates:
        domain_counts[row["domain"]] = domain_counts.get(row["domain"], 0) + 1

    unique_urls = len({row["url"] for row in candidates})
    official_rows = sum(1 for row in candidates if row["domain"].endswith(".gov"))
    check(len(results) == 51, "route execution denominator changed")
    check(sum(state_counts.values()) == 51, "not all routes reached a terminal transport state")

    write_json(
        output / "route-results.json",
        {
            "schema_version": "ssc-rd02-wave03-search-route-results@1",
            "routes": results,
            "counts": {
                "fixed_routes": 51,
                "route_attempts": len(results),
                "terminal_routes": sum(state_counts.values()),
                "state_counts": dict(sorted(state_counts.items())),
            },
        },
    )
    write_json(
        output / "candidate-index.json",
        {
            "schema_version": "ssc-rd02-wave03-search-candidate-index@1",
            "candidate_rows": candidates,
            "counts": {
                "candidate_rows": len(candidates),
                "unique_candidate_urls": unique_urls,
                "official_domain_candidate_rows": official_rows,
                "candidate_urls_admitted": 0,
                "result_spawned_requests": 0,
            },
            "domain_counts": dict(sorted(domain_counts.items())),
            "boundaries": {
                "candidate_is_admitted_source": False,
                "candidate_is_lifecycle_event": False,
                "search_silence_is_event_absence": False,
                "withheld_identity_inferred": False,
                "graph_effect": "none",
            },
        },
    )
    summary = {
        "schema_version": "ssc-rd02-wave03-search-census-summary@1",
        "wave_id": "SSC-RD-W03",
        "lane_id": "RD-02",
        "class_id": "RD-02-C05",
        "issue": 1015,
        "terminal_capture_state": "fixed_search_census_executed_candidate_adjudication_pending",
        "counts": {
            "cohort_rows": 18,
            "publicly_named_rows": 17,
            "identity_withheld_rows": 1,
            "fixed_routes": 51,
            "withheld_row_routes": 0,
            "route_attempts": len(results),
            "terminal_routes": sum(state_counts.values()),
            "route_state_counts": dict(sorted(state_counts.items())),
            "candidate_rows": len(candidates),
            "unique_candidate_urls": unique_urls,
            "official_domain_candidate_rows": official_rows,
            "candidate_urls_admitted": 0,
            "result_spawned_requests": 0,
            "external_contacts": 0,
            "external_reviews": 0,
        },
        "current_result": {
            "fixed_protocol_executed": True,
            "candidate_adjudication_complete": False,
            "followup_protocol_frozen": False,
            "field_matrix_terminal": False,
            "class_state": "still_open",
            "class_closed": False,
            "outside_human_dependency": False,
            "project_blocking": False,
            "capital_conversion_finding": False,
            "favoritism_finding": False,
            "extraction_finding": False,
            "coordination_finding": False,
            "common_purpose_finding": False,
            "complete_compact_finding": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        },
        "next_bounded_operation": "adjudicate the frozen candidate URL census and freeze exact first-party or official follow-up routes",
    }
    write_json(output / "summary.json", summary)
    write_json(
        output / "execution-receipt.json",
        {
            "schema_version": "ssc-rd02-wave03-search-census-execution@1",
            "workflow_run": int(os.environ.get("GITHUB_RUN_ID", "0")),
            "workflow_attempt": int(os.environ.get("GITHUB_RUN_ATTEMPT", "0")),
            "head": git_output("rev-parse", "HEAD"),
            "protocol_sha256": sha256_file(ROOT / PROTOCOL_PATH),
            "route_ledger_sha256": sha256_bytes(ledger),
            "fixed_routes": 51,
            "terminal_routes": sum(state_counts.values()),
            "candidate_rows": len(candidates),
            "unique_candidate_urls": unique_urls,
            "official_domain_candidate_rows": official_rows,
            "candidate_urls_admitted": 0,
            "withheld_row_routes": 0,
            "result_spawned_requests": 0,
            "outside_human_dependency": False,
            "external_contacts": 0,
            "external_reviews": 0,
            "class_closed": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        },
    )
    manifest = build_manifest(output)
    write_json(output / "manifest.json", manifest)

    result = {
        "fixed_routes": 51,
        "terminal_routes": sum(state_counts.values()),
        "route_state_counts": dict(sorted(state_counts.items())),
        "candidate_rows": len(candidates),
        "unique_candidate_urls": unique_urls,
        "official_domain_candidate_rows": official_rows,
        "candidate_urls_admitted": 0,
        "withheld_row_routes": 0,
        "result_spawned_requests": 0,
        "class_state": "still_open",
        "class_closed": False,
        "manifest_entries": manifest["entry_count"],
        "manifest_combined_sha256": manifest["combined_sha256"],
    }
    print(json.dumps(result, indent=2))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        fail(f"output already exists: {output}")
    execute(output)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - terminal receipt is emitted by caller logs
        print(f"run-search-census: {error}", file=sys.stderr)
        raise SystemExit(1)
