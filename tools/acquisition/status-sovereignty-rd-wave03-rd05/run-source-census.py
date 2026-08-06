#!/usr/bin/env python3
"""Execute the frozen RD-05 Wave-03 ACES source census without following candidates.

The runner captures one terminal receipt per predeclared route. RSS result links are
stored as graph-inert candidate rows and are never fetched by this program.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import dataclasses
import hashlib
import json
import os
import pathlib
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROTOCOL = ROOT / "data/intake/status-sovereignty-rd-wave03-rd05-member-participation/source-census-protocol.json"
USER_AGENT = "clifford-number-rd05-wave03-source-census/1.0 (+https://github.com/BigBirdReturns/clifford-number)"


def stable_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_bytes(path: pathlib.Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def write_json(path: pathlib.Path, value: Any) -> None:
    write_bytes(path, stable_json(value))


def safe_slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-") or "route"


def host_allowed(url: str, suffix: str) -> bool:
    host = (urllib.parse.urlparse(url).hostname or "").lower().rstrip(".")
    suffix = suffix.lower().rstrip(".")
    return host == suffix or host.endswith("." + suffix)


def headers_bytes(headers: Any) -> bytes:
    if headers is None:
        return b""
    rows = []
    for key, value in headers.items():
        rows.append(f"{key}: {value}\n")
    return "".join(rows).encode("utf-8", errors="replace")


def parse_rss_candidates(body: bytes, maximum: int, route: dict[str, Any]) -> list[dict[str, Any]]:
    if maximum <= 0 or not body:
        return []
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return []
    rows: list[dict[str, Any]] = []
    for rank, item in enumerate(root.findall(".//item"), start=1):
        title = "".join(item.findtext("title") or "").strip()
        link = "".join(item.findtext("link") or "").strip()
        description = "".join(item.findtext("description") or "").strip()
        if not link:
            continue
        rows.append(
            {
                "candidate_id": f"{route['route_id']}-C{rank:02d}",
                "route_id": route["route_id"],
                "route_ordinal": route["ordinal"],
                "result_rank": rank,
                "unit_id": route.get("unit_id"),
                "canonical_name": route.get("canonical_name"),
                "query_class": route.get("query_class"),
                "title": title,
                "url": link,
                "description": description,
                "candidate_only": True,
                "admitted_evidence_source": False,
                "followup_requested": False,
                "graph_effect": "none",
            }
        )
        if len(rows) >= maximum:
            break
    return rows


@dataclasses.dataclass(frozen=True)
class CaptureResult:
    route_id: str
    receipt: dict[str, Any]
    candidates: list[dict[str, Any]]
    manifest_rows: list[dict[str, Any]]


def capture_route(route: dict[str, Any], output: pathlib.Path) -> CaptureResult:
    route_dir = output / "routes" / safe_slug(route["route_id"])
    route_dir.mkdir(parents=True, exist_ok=True)
    request_record = {
        "route_id": route["route_id"],
        "ordinal": route["ordinal"],
        "method": "GET",
        "requested_url": route["requested_url"],
        "allowed_final_host_suffix": route["allowed_final_host_suffix"],
        "maximum_attempts": route["maximum_attempts"],
        "timeout_ms": route["timeout_ms"],
        "maximum_body_bytes": route["maximum_body_bytes"],
        "maximum_candidate_rows": route["maximum_candidate_rows"],
        "candidate_rows_are_admitted_sources": False,
        "evidence_admission_authorized": False,
        "result_spawned_requests": 0,
    }
    write_json(route_dir / "request.json", request_record)

    started = time.time()
    body = b""
    header_blob = b""
    final_url = route["requested_url"]
    http_status: int | None = None
    transport_error: str | None = None
    terminal_state = "transport_failure"
    content_type: str | None = None
    truncated = False

    request = urllib.request.Request(
        route["requested_url"],
        method="GET",
        headers={"User-Agent": USER_AGENT, "Connection": "close", "Accept": "*/*"},
    )
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=route["timeout_ms"] / 1000, context=context) as response:
            final_url = response.geturl()
            http_status = int(response.status)
            header_blob = headers_bytes(response.headers)
            content_type = response.headers.get_content_type() if response.headers else None
            limit = int(route["maximum_body_bytes"])
            body = response.read(limit + 1)
            if len(body) > limit:
                body = body[:limit]
                truncated = True
            terminal_state = "http_success" if 200 <= http_status < 300 else "http_non_success"
    except urllib.error.HTTPError as error:
        final_url = error.geturl()
        http_status = int(error.code)
        header_blob = headers_bytes(error.headers)
        content_type = error.headers.get_content_type() if error.headers else None
        limit = int(route["maximum_body_bytes"])
        try:
            body = error.read(limit + 1)
        except Exception:
            body = b""
        if len(body) > limit:
            body = body[:limit]
            truncated = True
        terminal_state = "http_non_success"
        transport_error = f"HTTPError: {error}"
    except Exception as error:  # noqa: BLE001 - typed terminal receipt is intentional
        terminal_state = "transport_failure"
        transport_error = f"{type(error).__name__}: {error}"

    host_ok = host_allowed(final_url, route["allowed_final_host_suffix"])
    if not host_ok:
        terminal_state = "redirect_host_rejected"
        body = b""

    finished = time.time()
    candidates = (
        parse_rss_candidates(body, int(route["maximum_candidate_rows"]), route)
        if route["route_type"] == "candidate_census_rss" and terminal_state == "http_success"
        else []
    )

    write_bytes(route_dir / "headers.txt", header_blob)
    write_bytes(route_dir / "body.bin", body)
    write_json(route_dir / "candidates.json", candidates)
    if transport_error:
        write_bytes(route_dir / "stderr.txt", (transport_error + "\n").encode("utf-8", errors="replace"))
    else:
        write_bytes(route_dir / "stderr.txt", b"")

    receipt = {
        "schema_version": "ssc-rd-wave03-rd05-source-route-receipt@1",
        "route_id": route["route_id"],
        "ordinal": route["ordinal"],
        "route_type": route["route_type"],
        "scope": route["scope"],
        "unit_id": route.get("unit_id"),
        "canonical_name": route.get("canonical_name"),
        "query_class": route.get("query_class"),
        "requested_url": route["requested_url"],
        "final_url": final_url,
        "allowed_final_host_suffix": route["allowed_final_host_suffix"],
        "final_host_allowed": host_ok,
        "attempts": 1,
        "terminal_state": terminal_state,
        "http_status": http_status,
        "content_type": content_type,
        "body_bytes": len(body),
        "body_sha256": sha256(body),
        "headers_bytes": len(header_blob),
        "headers_sha256": sha256(header_blob),
        "body_truncated_at_declared_limit": truncated,
        "candidate_rows": len(candidates),
        "candidate_rows_are_admitted_sources": False,
        "evidence_admission_authorized": False,
        "result_spawned_requests": 0,
        "transport_error": transport_error,
        "started_unix": started,
        "finished_unix": finished,
        "duration_ms": round((finished - started) * 1000),
        "record_absence_inferred": False,
        "member_event_absence_inferred": False,
        "graph_effect": "none",
    }
    write_json(route_dir / "receipt.json", receipt)

    manifest_rows = []
    for rel in ["request.json", "headers.txt", "body.bin", "candidates.json", "stderr.txt", "receipt.json"]:
        file_path = route_dir / rel
        data = file_path.read_bytes()
        manifest_rows.append(
            {
                "path": file_path.relative_to(output).as_posix(),
                "bytes": len(data),
                "sha256": sha256(data),
            }
        )
    return CaptureResult(route_id=route["route_id"], receipt=receipt, candidates=candidates, manifest_rows=manifest_rows)


def validate_protocol(protocol: dict[str, Any]) -> None:
    if protocol.get("schema_version") != "ssc-rd-wave03-rd05-member-participation-source-census-protocol@1":
        raise ValueError("unexpected protocol schema")
    if protocol.get("class_id") != "RD-05-C02" or protocol.get("issue") != 1018:
        raise ValueError("unexpected protocol identity")
    routes = protocol.get("fixed_routes")
    if not isinstance(routes, list) or len(routes) != 161:
        raise ValueError("fixed route denominator must be 161")
    if [row.get("ordinal") for row in routes] != list(range(1, 162)):
        raise ValueError("route ordinals changed")
    if len({row.get("route_id") for row in routes}) != 161:
        raise ValueError("duplicate route id")
    for route in routes:
        if route.get("maximum_attempts") != 1 or route.get("result_spawned_requests") != 0:
            raise ValueError(f"{route.get('route_id')}: unbounded request contract")
        if route.get("candidate_rows_are_admitted_sources") is not False:
            raise ValueError(f"{route.get('route_id')}: candidate admission escalated")
        if route.get("evidence_admission_authorized") is not False:
            raise ValueError(f"{route.get('route_id')}: evidence admission escalated")
        if route.get("route_type") not in {"exact_official_get", "candidate_census_rss"}:
            raise ValueError(f"{route.get('route_id')}: unknown route type")
    boundaries = protocol.get("boundaries", {})
    if boundaries.get("outside_human_dependency") is not False:
        raise ValueError("outside-human dependency introduced")
    if any(boundaries.get(key) != "none" for key in ("publication_effect", "adoption_effect", "graph_effect")):
        raise ValueError("authority effect introduced")


def build_plan(protocol: dict[str, Any]) -> dict[str, Any]:
    routes = protocol["fixed_routes"]
    return {
        "schema_version": "ssc-rd-wave03-rd05-source-census-plan@1",
        "class_id": "RD-05-C02",
        "issue": 1018,
        "protocol_sha256": sha256(stable_json(protocol)),
        "fixed_routes": len(routes),
        "exact_official_routes": sum(row["route_type"] == "exact_official_get" for row in routes),
        "candidate_census_routes": sum(row["route_type"] == "candidate_census_rss" for row in routes),
        "maximum_candidate_rows": sum(int(row["maximum_candidate_rows"]) for row in routes),
        "request_attempts_authorized": len(routes),
        "result_spawned_requests_authorized": 0,
        "candidate_followups_authorized": 0,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "graph_effect": "none",
        "routes": [
            {
                "ordinal": row["ordinal"],
                "route_id": row["route_id"],
                "route_type": row["route_type"],
                "unit_id": row.get("unit_id"),
                "query_class": row.get("query_class"),
                "requested_url": row["requested_url"],
            }
            for row in routes
        ],
    }


def run(protocol_path: pathlib.Path, output: pathlib.Path, dry_run: bool, workers: int) -> int:
    protocol = json.loads(protocol_path.read_text(encoding="utf-8"))
    validate_protocol(protocol)
    output.mkdir(parents=True, exist_ok=True)
    protocol_bytes = protocol_path.read_bytes()
    write_bytes(output / "inputs" / "source-census-protocol.json", protocol_bytes)
    plan = build_plan(protocol)
    write_json(output / "plan.json", plan)

    if dry_run:
        receipt = {
            "schema_version": "ssc-rd-wave03-rd05-source-census-execution-receipt@1",
            "mode": "dry_run",
            "status": "protocol_validated_acquisition_not_executed",
            "fixed_routes": 161,
            "request_attempts": 0,
            "terminal_route_receipts": 0,
            "candidate_rows": 0,
            "admitted_evidence_sources": 0,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        }
        write_json(output / "execution-receipt.json", receipt)
        return 0

    routes = protocol["fixed_routes"]
    results: list[CaptureResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(capture_route, route, output): route for route in routes}
        for future in concurrent.futures.as_completed(future_map):
            route = future_map[future]
            try:
                results.append(future.result())
            except Exception as error:  # fail closed on runner defects, not typed transport outcomes
                print(f"{route['route_id']}: runner failure: {type(error).__name__}: {error}", file=sys.stderr)
                return 1

    results.sort(key=lambda row: int(row.receipt["ordinal"]))
    route_results = [row.receipt for row in results]
    candidates = [candidate for row in results for candidate in row.candidates]
    manifest_rows = [row for result in results for row in result.manifest_rows]

    write_json(output / "route-results.json", route_results)
    write_json(output / "candidate-index.json", candidates)
    for rel in ["inputs/source-census-protocol.json", "plan.json", "route-results.json", "candidate-index.json"]:
        data = (output / rel).read_bytes()
        manifest_rows.append({"path": rel, "bytes": len(data), "sha256": sha256(data)})
    manifest_rows.sort(key=lambda row: row["path"])
    manifest = {
        "schema_version": "ssc-rd-wave03-rd05-source-census-capture-manifest@1",
        "entries": manifest_rows,
        "combined_sha256": sha256(
            "".join(f"{row['path']}\0{row['sha256']}\0{row['bytes']}\n" for row in manifest_rows).encode("utf-8")
        ),
        "candidate_rows_are_admitted_sources": False,
        "result_spawned_requests": 0,
        "graph_effect": "none",
    }
    write_json(output / "manifest.json", manifest)

    terminal_counts: dict[str, int] = {}
    for row in route_results:
        terminal_counts[row["terminal_state"]] = terminal_counts.get(row["terminal_state"], 0) + 1
    execution_receipt = {
        "schema_version": "ssc-rd-wave03-rd05-source-census-execution-receipt@1",
        "mode": "execute",
        "status": "all_fixed_routes_attempted_once",
        "fixed_routes": 161,
        "request_attempts": len(route_results),
        "terminal_route_receipts": len(route_results),
        "terminal_state_counts": terminal_counts,
        "candidate_rows": len(candidates),
        "admitted_evidence_sources": 0,
        "result_spawned_requests": 0,
        "candidate_followups": 0,
        "member_fields_materialized": 0,
        "terminal_cells": 0,
        "class_closed": False,
        "record_absence_inferred": False,
        "member_event_absence_inferred": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "capture_manifest_sha256": manifest["combined_sha256"],
    }
    write_json(output / "execution-receipt.json", execution_receipt)
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=pathlib.Path, default=DEFAULT_PROTOCOL)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--dry-run", action="store_true", help="validate the frozen protocol and emit a zero-request plan")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args(argv)
    if args.workers < 1 or args.workers > 2:
        parser.error("--workers must be 1 or 2")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        return run(args.protocol.resolve(), args.output.resolve(), args.dry_run, args.workers)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"run-source-census: {type(error).__name__}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
