#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
import json
import os
import pathlib
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

PACKAGE_REL = "data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/fixed-protocol-package.json"
EXPECTED_PACKAGE_SHA256 = "882e9543516378fd50861784c7efd36764dfee47bd8c01ee8e9fad0c0fa06ba5"
EXPECTED_SCHEMA = "ssc-rd-wave03-rd03-lifecycle-recovery-fixed-protocol@1"
EXPECTED_CLASS = "RD-03-C05"
EXPECTED_ROUTES = 43
EXPECTED_EXACT = 18
EXPECTED_CANDIDATE = 25
USER_AGENT = "clifford-number-rd03-wave03-fixed-capture/1.0 (+public-record research; no contact)"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: pathlib.Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_json(path: pathlib.Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: pathlib.Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_text(node: ET.Element, name: str) -> str | None:
    child = node.find(name)
    if child is None or child.text is None:
        return None
    value = html.unescape(child.text).strip()
    return value or None


def parse_rss(body: pathlib.Path, route: dict, predeclared_hosts: set[str], depth: int) -> tuple[list[dict], str | None]:
    if not body.exists() or body.stat().st_size == 0:
        return [], "empty_body"
    try:
        root = ET.fromstring(body.read_bytes())
    except Exception as exc:  # typed parse failure, not protocol failure
        return [], f"xml_parse_error:{type(exc).__name__}:{exc}"

    rows: list[dict] = []
    for ordinal, item in enumerate(root.findall(".//item")[:depth], start=1):
        link = safe_text(item, "link")
        title = safe_text(item, "title")
        description = safe_text(item, "description")
        pub_date = safe_text(item, "pubDate")
        host = (urlparse(link).hostname or "").lower() if link else ""
        identity_material = f"{route['route_id']}\n{ordinal}\n{link or ''}".encode()
        rows.append(
            {
                "candidate_id": f"rd03w03_candidate_{sha256_bytes(identity_material)[:24]}",
                "route_id": route["route_id"],
                "route_ordinal": route["route_ordinal"],
                "candidate_ordinal": ordinal,
                "instrument_ids": route["instrument_ids"],
                "search_term": route.get("search_term"),
                "title": title,
                "url": link,
                "host": host,
                "description": description,
                "published_at": pub_date,
                "host_matches_predeclared_exact_route": host in predeclared_hosts,
                "admission_state": "candidate_census_only_not_admitted_source",
                "admitted_as_evidence": False,
                "automatic_followup_executed": False,
            }
        )
    return rows, None


def run_route(route: dict, out: pathlib.Path, contract: dict, predeclared_hosts: set[str]) -> dict:
    ordinal = int(route["route_ordinal"])
    route_id = route["route_id"]
    route_dir = out / "routes" / f"{ordinal:03d}-{route_id}" / "attempt-1"
    route_dir.mkdir(parents=True, exist_ok=False)

    request_path = route_dir / "request.json"
    headers_path = route_dir / "headers.txt"
    body_path = route_dir / "body.bin"
    stderr_path = route_dir / "curl-stderr.txt"
    curl_meta_path = route_dir / "curl-meta.json"
    attempt_path = route_dir / "attempt.json"
    candidate_path = route_dir / "candidate-census.json"
    source_receipt_path = route_dir.parent / "source-receipt.json"

    started_at = now()
    request = {
        "schema_version": "ssc-rd03-wave03-fixed-capture-request@1",
        "route_ordinal": ordinal,
        "route_id": route_id,
        "route_type": route["route_type"],
        "request_url": route["request_url"],
        "purpose": route["purpose"],
        "instrument_ids": route["instrument_ids"],
        "search_term": route.get("search_term"),
        "admission_state": route["admission_state"],
        "maximum_attempts": route["maximum_attempts"],
        "automatic_result_followups": route["automatic_result_followups"],
        "attempt_number": 1,
        "method": "GET",
        "user_agent": USER_AGENT,
        "started_at": started_at,
    }
    write_json(request_path, request)

    timeout_seconds = max(1, int(contract["timeout_ms"]) // 1000)
    maximum_body_bytes = int(contract["maximum_body_bytes"])
    accept = "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1" if route["route_type"] == "fixed_candidate_query_bing_rss" else "text/html, application/xhtml+xml, application/pdf;q=0.9, application/json;q=0.8, */*;q=0.1"

    cmd = [
        "curl",
        "--location",
        "--silent",
        "--show-error",
        "--connect-timeout",
        "15",
        "--max-time",
        str(timeout_seconds),
        "--max-filesize",
        str(maximum_body_bytes),
        "--user-agent",
        USER_AGENT,
        "--header",
        f"Accept: {accept}",
        "--dump-header",
        str(headers_path),
        "--output",
        str(body_path),
        "--stderr",
        str(stderr_path),
        "--write-out",
        "%{json}",
        route["request_url"],
    ]

    completed = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=False)
    completed_at = now()
    if not headers_path.exists():
        headers_path.write_bytes(b"")
    if not body_path.exists():
        body_path.write_bytes(b"")
    if not stderr_path.exists():
        stderr_path.write_bytes(b"")

    raw_meta = completed.stdout.strip()
    try:
        curl_meta = json.loads(raw_meta) if raw_meta else {}
        if not isinstance(curl_meta, dict):
            raise TypeError("curl metadata is not an object")
    except Exception as exc:
        curl_meta = {
            "metadata_parse_error": f"{type(exc).__name__}:{exc}",
            "raw_stdout": raw_meta,
        }
    curl_meta["curl_exit_code"] = completed.returncode
    write_json(curl_meta_path, curl_meta)

    response_code = int(curl_meta.get("response_code") or curl_meta.get("http_code") or 0)
    transport_success = completed.returncode == 0
    http_success = transport_success and 200 <= response_code < 400
    if not transport_success:
        terminal_transport_state = "bounded_transport_failure"
    elif http_success:
        terminal_transport_state = "transport_success"
    else:
        terminal_transport_state = "bounded_http_non_success"

    candidates: list[dict] = []
    candidate_parse_error: str | None = None
    if route["route_type"] == "fixed_candidate_query_bing_rss" and http_success:
        candidates, candidate_parse_error = parse_rss(
            body_path,
            route,
            predeclared_hosts,
            int(contract["bing_result_depth"]),
        )
    write_json(
        candidate_path,
        {
            "schema_version": "ssc-rd03-wave03-fixed-candidate-census@1",
            "route_id": route_id,
            "candidate_rows": candidates,
            "candidate_count": len(candidates),
            "parse_error": candidate_parse_error,
            "result_spawned_requests": 0,
            "admitted_candidate_sources": 0,
        },
    )

    body_bytes = body_path.stat().st_size
    attempt = {
        "schema_version": "ssc-rd03-wave03-fixed-capture-attempt@1",
        "route_ordinal": ordinal,
        "route_id": route_id,
        "attempt_number": 1,
        "started_at": started_at,
        "completed_at": completed_at,
        "curl_exit_code": completed.returncode,
        "response_code": response_code,
        "url_effective": curl_meta.get("url_effective"),
        "content_type": curl_meta.get("content_type"),
        "size_download": curl_meta.get("size_download"),
        "body_bytes": body_bytes,
        "body_within_maximum": body_bytes <= maximum_body_bytes,
        "transport_success": transport_success,
        "http_success": http_success,
        "terminal_transport_state": terminal_transport_state,
        "candidate_count": len(candidates),
        "candidate_parse_error": candidate_parse_error,
        "automatic_result_followups": 0,
        "result_spawned_requests": 0,
    }
    write_json(attempt_path, attempt)

    source_receipt = {
        "schema_version": "ssc-rd03-wave03-fixed-source-receipt@1",
        "route_ordinal": ordinal,
        "route_id": route_id,
        "route_type": route["route_type"],
        "request_url": route["request_url"],
        "purpose": route["purpose"],
        "instrument_ids": route["instrument_ids"],
        "search_term": route.get("search_term"),
        "admission_state": route["admission_state"],
        "attempts": 1,
        "terminal_transport_state": terminal_transport_state,
        "curl_exit_code": completed.returncode,
        "response_code": response_code,
        "body_bytes": body_bytes,
        "candidate_count": len(candidates),
        "admitted_as_evidence": route["route_type"] == "exact_predeclared_get" and http_success,
        "candidate_results_admitted_as_evidence": 0,
        "automatic_result_followups": 0,
        "result_spawned_requests": 0,
        "files": {
            "request": {"path": str(request_path.relative_to(out)), "bytes": request_path.stat().st_size, "sha256": sha256_file(request_path)},
            "headers": {"path": str(headers_path.relative_to(out)), "bytes": headers_path.stat().st_size, "sha256": sha256_file(headers_path)},
            "body": {"path": str(body_path.relative_to(out)), "bytes": body_path.stat().st_size, "sha256": sha256_file(body_path)},
            "stderr": {"path": str(stderr_path.relative_to(out)), "bytes": stderr_path.stat().st_size, "sha256": sha256_file(stderr_path)},
            "curl_meta": {"path": str(curl_meta_path.relative_to(out)), "bytes": curl_meta_path.stat().st_size, "sha256": sha256_file(curl_meta_path)},
            "attempt": {"path": str(attempt_path.relative_to(out)), "bytes": attempt_path.stat().st_size, "sha256": sha256_file(attempt_path)},
            "candidate_census": {"path": str(candidate_path.relative_to(out)), "bytes": candidate_path.stat().st_size, "sha256": sha256_file(candidate_path)},
        },
    }
    write_json(source_receipt_path, source_receipt)

    return {
        "route": route,
        "attempt": attempt,
        "source_receipt": source_receipt,
        "candidates": candidates,
        "candidate_parse_error": candidate_parse_error,
    }


def validate_package(package: dict, package_sha256: str) -> None:
    if package_sha256 != EXPECTED_PACKAGE_SHA256:
        raise RuntimeError(f"fixed protocol SHA changed: {package_sha256}")
    if package.get("schema_version") != EXPECTED_SCHEMA:
        raise RuntimeError("fixed protocol schema changed")
    if package.get("wave_id") != "SSC-RD-W03" or package.get("lane_id") != "RD-03" or package.get("class_id") != EXPECTED_CLASS or package.get("issue") != 1016:
        raise RuntimeError("fixed protocol identity changed")
    routes = package.get("routes")
    if not isinstance(routes, list) or len(routes) != EXPECTED_ROUTES:
        raise RuntimeError("fixed route denominator changed")
    route_ids = [row.get("route_id") for row in routes]
    if len(set(route_ids)) != EXPECTED_ROUTES:
        raise RuntimeError("fixed route IDs are not unique")
    exact = sum(row.get("route_type") == "exact_predeclared_get" for row in routes)
    candidate = sum(row.get("route_type") == "fixed_candidate_query_bing_rss" for row in routes)
    if (exact, candidate) != (EXPECTED_EXACT, EXPECTED_CANDIDATE):
        raise RuntimeError("fixed route type denominator changed")
    for ordinal, row in enumerate(routes, start=1):
        row["route_ordinal"] = ordinal
        if row.get("maximum_attempts") != 1:
            raise RuntimeError(f"{row.get('route_id')}: maximum attempts changed")
        if row.get("automatic_result_followups") != 0:
            raise RuntimeError(f"{row.get('route_id')}: automatic followups changed")
    contract = package.get("transport_contract") or {}
    required_contract = {
        "maximum_attempts_per_route": 1,
        "timeout_ms": 30000,
        "maximum_body_bytes": 10485760,
        "concurrency": 4,
        "bing_result_depth": 10,
        "result_spawned_requests": 0,
        "automatic_second_pass_authorized": False,
        "external_contacts": 0,
        "external_reviews": 0,
        "outside_human_dependency": False,
    }
    for key, expected in required_contract.items():
        if contract.get(key) != expected:
            raise RuntimeError(f"transport contract {key} changed")


def build_manifest(out: pathlib.Path) -> dict:
    entries = []
    for file_path in sorted(p for p in out.rglob("*") if p.is_file() and p.name not in {"manifest.json", "manifest.sha256"}):
        entries.append(
            {
                "path": str(file_path.relative_to(out)),
                "bytes": file_path.stat().st_size,
                "sha256": sha256_file(file_path),
            }
        )
    digest_material = "".join(f"{row['path']}\0{row['bytes']}\0{row['sha256']}\n" for row in entries).encode()
    return {
        "schema_version": "ssc-rd03-wave03-fixed-capture-manifest@1",
        "entry_count": len(entries),
        "entries": entries,
        "combined_sha256": sha256_bytes(digest_material),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--target-head", required=True)
    args = parser.parse_args()

    repo = pathlib.Path(args.repo).resolve()
    out = pathlib.Path(args.out).resolve()
    if out.exists():
        raise RuntimeError(f"output already exists: {out}")
    out.mkdir(parents=True)

    package_path = repo / PACKAGE_REL
    package_bytes = package_path.read_bytes()
    package_sha256 = sha256_bytes(package_bytes)
    package = json.loads(package_bytes)
    validate_package(package, package_sha256)

    routes = package["routes"]
    contract = package["transport_contract"]
    predeclared_hosts = {
        (urlparse(row["request_url"]).hostname or "").lower()
        for row in routes
        if row["route_type"] == "exact_predeclared_get"
    }

    write_json(
        out / "protocol-binding.json",
        {
            "schema_version": "ssc-rd03-wave03-fixed-capture-protocol-binding@1",
            "target_head": args.target_head,
            "package_path": PACKAGE_REL,
            "package_bytes": len(package_bytes),
            "package_sha256": package_sha256,
            "route_count": EXPECTED_ROUTES,
            "exact_predeclared_routes": EXPECTED_EXACT,
            "candidate_census_routes": EXPECTED_CANDIDATE,
            "transport_contract": contract,
            "outside_human_dependency": False,
            "external_contacts": 0,
            "external_reviews": 0,
        },
    )

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=int(contract["concurrency"])) as executor:
        futures = [executor.submit(run_route, route, out, contract, predeclared_hosts) for route in routes]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    results.sort(key=lambda row: row["route"]["route_ordinal"])

    all_candidates = [candidate for result in results for candidate in result["candidates"]]
    unique_candidate_urls = sorted({row["url"] for row in all_candidates if row.get("url")})
    candidate_host_counts: dict[str, int] = {}
    for row in all_candidates:
        host = row.get("host") or ""
        candidate_host_counts[host] = candidate_host_counts.get(host, 0) + 1

    write_json(
        out / "candidate-census.json",
        {
            "schema_version": "ssc-rd03-wave03-fixed-candidate-census-index@1",
            "candidate_rows": all_candidates,
            "candidate_row_count": len(all_candidates),
            "unique_candidate_urls": len(unique_candidate_urls),
            "candidate_host_counts": dict(sorted(candidate_host_counts.items())),
            "candidate_parse_failures": sum(result["candidate_parse_error"] is not None for result in results),
            "admitted_candidate_sources": 0,
            "result_spawned_requests": 0,
        },
    )

    route_index = []
    for result in results:
        route = result["route"]
        attempt = result["attempt"]
        route_index.append(
            {
                "route_ordinal": route["route_ordinal"],
                "route_id": route["route_id"],
                "route_type": route["route_type"],
                "instrument_ids": route["instrument_ids"],
                "terminal_transport_state": attempt["terminal_transport_state"],
                "curl_exit_code": attempt["curl_exit_code"],
                "response_code": attempt["response_code"],
                "body_bytes": attempt["body_bytes"],
                "candidate_count": attempt["candidate_count"],
                "source_receipt_path": f"routes/{route['route_ordinal']:03d}-{route['route_id']}/source-receipt.json",
            }
        )
    write_json(
        out / "capture-index.json",
        {
            "schema_version": "ssc-rd03-wave03-fixed-capture-index@1",
            "routes": route_index,
            "route_count": len(route_index),
        },
    )

    counts = {
        "fixed_routes": len(results),
        "request_attempts": len(results),
        "exact_predeclared_routes": sum(r["route"]["route_type"] == "exact_predeclared_get" for r in results),
        "candidate_census_routes": sum(r["route"]["route_type"] == "fixed_candidate_query_bing_rss" for r in results),
        "transport_successes": sum(r["attempt"]["transport_success"] for r in results),
        "http_successes": sum(r["attempt"]["http_success"] for r in results),
        "bounded_http_non_successes": sum(r["attempt"]["terminal_transport_state"] == "bounded_http_non_success" for r in results),
        "bounded_transport_failures": sum(r["attempt"]["terminal_transport_state"] == "bounded_transport_failure" for r in results),
        "candidate_rows": len(all_candidates),
        "unique_candidate_urls": len(unique_candidate_urls),
        "candidate_parse_failures": sum(r["candidate_parse_error"] is not None for r in results),
        "admitted_candidate_sources": 0,
        "result_spawned_requests": 0,
        "external_contacts": 0,
        "external_reviews": 0,
    }
    receipt = {
        "schema_version": "ssc-rd03-wave03-fixed-capture-execution-receipt@1",
        "wave_id": "SSC-RD-W03",
        "lane_id": "RD-03",
        "class_id": EXPECTED_CLASS,
        "issue": 1016,
        "target_head": args.target_head,
        "package_path": PACKAGE_REL,
        "package_sha256": package_sha256,
        "protocol_complete": True,
        "class_closed": False,
        "counts": counts,
        "authority": {
            "outside_human_dependency": False,
            "external_contacts": 0,
            "external_reviews": 0,
            "reviewed_disposition_changed": False,
            "favoritism_finding": False,
            "extraction_finding": False,
            "public_recovery_finding": False,
            "coordination_finding": False,
            "common_purpose_finding": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
        },
        "boundaries": {
            "http_success_is_admitted_evidence_for_candidate_query": False,
            "candidate_result_is_admitted_source": False,
            "missing_public_record_is_event_absence": False,
            "five_named_instruments_are_complete_osc_cohort": False,
            "capture_receipt_is_class_closure": False,
        },
    }
    write_json(out / "execution-receipt.json", receipt)

    if counts["fixed_routes"] != EXPECTED_ROUTES or counts["request_attempts"] != EXPECTED_ROUTES:
        raise RuntimeError("capture route/attempt denominator changed")
    if counts["exact_predeclared_routes"] != EXPECTED_EXACT or counts["candidate_census_routes"] != EXPECTED_CANDIDATE:
        raise RuntimeError("capture route type denominator changed")
    if counts["admitted_candidate_sources"] != 0 or counts["result_spawned_requests"] != 0:
        raise RuntimeError("candidate admission or followup boundary changed")
    if any(row["source_receipt"]["attempts"] != 1 for row in results):
        raise RuntimeError("one-attempt custody changed")
    if any(row["source_receipt"]["files"]["body"]["bytes"] > int(contract["maximum_body_bytes"]) for row in results):
        raise RuntimeError("maximum body size exceeded")

    manifest = build_manifest(out)
    write_json(out / "manifest.json", manifest)
    (out / "manifest.sha256").write_text(f"{sha256_file(out / 'manifest.json')}  manifest.json\n", encoding="utf-8")

    print(json.dumps(receipt, indent=2, sort_keys=True))
    print(f"capture manifest entries: {manifest['entry_count']}")
    print(f"capture manifest combined SHA-256: {manifest['combined_sha256']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"fatal: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise
