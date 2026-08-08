#!/usr/bin/env python3
"""Execute the frozen RD-04 postpromotion route denominator exactly once.

The canonical protocol product does not execute this program. A separate never-merge
carrier must pass --execute and set EXECUTE_RD04_POSTPROMOTION_NEXT=YES.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

PRODUCT_DIR = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol"
)
ROUTE_LEDGER = PRODUCT_DIR / "route-ledger.json"
QUERY_CONTRACT = PRODUCT_DIR / "route-query-contract.json"
USER_AGENT = (
    "BigBirdReturns-clifford-number-RD04-postpromotion-route-capture/1.0 "
    "(repository research custody; contact through GitHub)"
)


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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


@dataclass
class RedirectRefused(Exception):
    target_url: str


class FixedHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_host: str, maximum_redirects: int) -> None:
        super().__init__()
        self.allowed_host = allowed_host
        self.maximum_redirects = maximum_redirects
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
        host = urllib.parse.urlsplit(normalized).hostname
        if host != self.allowed_host:
            raise RedirectRefused(normalized)
        if len(self.redirects) >= self.maximum_redirects:
            raise urllib.error.URLError("maximum redirects exceeded")
        self.redirects.append(
            {
                "status": code,
                "from_url": normalize_url(req.full_url),
                "to_url": normalized,
            }
        )
        return super().redirect_request(req, fp, code, msg, headers, normalized)


def load_protocol(root: pathlib.Path) -> tuple[dict[str, Any], dict[str, Any]]:
    ledger = json.loads((root / ROUTE_LEDGER).read_text())
    contract = json.loads((root / QUERY_CONTRACT).read_text())
    if ledger["fixed_route_count"] != 5 or len(ledger["routes"]) != 5:
        raise ValueError("route denominator differs from five")
    if contract["fixed_route_count"] != 5:
        raise ValueError("contract denominator differs from five")
    if contract["maximum_total_requests"] != 5:
        raise ValueError("request ceiling differs from route denominator")
    if contract["maximum_attempts_per_route"] != 1:
        raise ValueError("attempt ceiling differs from one")
    if contract["parallel_workers"] != 1:
        raise ValueError("execution must remain sequential")
    if contract["result_spawned_requests"] != 0:
        raise ValueError("result-spawned requests must remain zero")
    if any(
        contract[key]
        for key in (
            "cross_host_redirects_allowed",
            "credentials_allowed",
            "cookies_allowed",
            "browser_state_allowed",
            "form_submissions_allowed",
        )
    ):
        raise ValueError("prohibited transport capability enabled")

    route_ids: set[str] = set()
    route_urls: set[str] = set()
    allowed_hosts = set(contract["allowed_initial_hosts"])
    for ordinal, route in enumerate(ledger["routes"], start=1):
        if route["route_ordinal"] != ordinal:
            raise ValueError("route ordinal drift")
        if route["route_id"] in route_ids:
            raise ValueError("duplicate route ID")
        route_ids.add(route["route_id"])
        normalized = normalize_url(route["requested_url"])
        if normalized != route["normalized_url"]:
            raise ValueError(f"route normalization drift: {route['route_id']}")
        if sha256(normalized.encode()) != route["url_sha256"]:
            raise ValueError(f"route digest drift: {route['route_id']}")
        if normalized in route_urls:
            raise ValueError("duplicate normalized route")
        route_urls.add(normalized)
        parsed = urllib.parse.urlsplit(normalized)
        if parsed.scheme != "https":
            raise ValueError("non-HTTPS route")
        if parsed.hostname != route["expected_host"]:
            raise ValueError("expected-host drift")
        if parsed.hostname not in allowed_hosts:
            raise ValueError("route host outside contract")
        if route["request_method"] != "GET":
            raise ValueError("non-GET route")
        if route["maximum_attempts"] != 1:
            raise ValueError("route attempt ceiling differs")
        if route["result_spawned_requests"] != 0:
            raise ValueError("route spawned request capability")
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
            raise ValueError("route authority or redirect boundary differs")
    return ledger, contract


def read_limited(response: Any, maximum_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = response.read(min(65536, maximum_bytes + 1 - total))
        if not chunk:
            return b"".join(chunks)
        chunks.append(chunk)
        total += len(chunk)
        if total > maximum_bytes:
            raise OverflowError("body limit exceeded")


def execute_route(route: dict[str, Any], output: pathlib.Path) -> dict[str, Any]:
    route_id = route["route_id"]
    request_url = route["normalized_url"]
    route_dir = output / "routes" / route_id
    route_dir.mkdir(parents=True, exist_ok=True)
    redirect_handler = FixedHostRedirectHandler(
        route["expected_host"], route["maximum_redirects"]
    )
    opener = urllib.request.build_opener(redirect_handler)
    request = urllib.request.Request(
        request_url,
        method="GET",
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    result: dict[str, Any] = {
        "route_ordinal": route["route_ordinal"],
        "route_id": route_id,
        "postal_code": route["postal_code"],
        "requested_url": request_url,
        "expected_host": route["expected_host"],
        "attempts": 1,
        "redirect_chain": [],
        "final_url": None,
        "terminal_state": None,
        "http_status": None,
        "content_type": None,
        "body_path": None,
        "body_bytes": 0,
        "body_sha256": None,
        "headers_path": None,
        "response_receipt_sha256": None,
        "error": None,
        "source_admission_effect": "none",
        "field_classification_effect": "none",
        "row_state_effect": "none",
        "class_effect": "none",
        "result_spawned_requests": 0,
        "outside_human_dependency": False,
    }
    try:
        with opener.open(request, timeout=45) as response:
            result["http_status"] = int(response.status)
            result["final_url"] = normalize_url(response.geturl())
            result["content_type"] = response.headers.get("Content-Type")
            result["redirect_chain"] = redirect_handler.redirects
            body = read_limited(response, route["maximum_body_bytes"])
            headers = "".join(f"{key}: {value}\n" for key, value in response.headers.items())
            headers_path = route_dir / "headers.txt"
            headers_path.write_text(headers)
            result["headers_path"] = headers_path.relative_to(output).as_posix()
            if body:
                body_path = route_dir / "body.bin"
                body_path.write_bytes(body)
                result["body_path"] = body_path.relative_to(output).as_posix()
                result["body_bytes"] = len(body)
                result["body_sha256"] = sha256(body)
                if 200 <= response.status < 300:
                    result["terminal_state"] = "terminal_http_success_body_captured"
                else:
                    result["terminal_state"] = "terminal_http_non_success"
            elif 200 <= response.status < 300:
                result["terminal_state"] = "terminal_http_success_no_body"
            else:
                result["terminal_state"] = "terminal_http_non_success"
    except RedirectRefused as error:
        result["terminal_state"] = "terminal_cross_host_redirect_refused"
        result["error"] = f"cross-host redirect refused: {error.target_url}"
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
    except Exception as error:  # transport custody must preserve the typed failure
        result["terminal_state"] = "terminal_transport_error"
        result["error"] = f"{type(error).__name__}: {error}"
        result["redirect_chain"] = redirect_handler.redirects

    receipt_path = route_dir / "receipt.json"
    receipt_bytes = canonical_json(result)
    receipt_path.write_bytes(receipt_bytes)
    result["response_receipt_sha256"] = sha256(receipt_bytes)
    receipt_path.write_bytes(canonical_json(result))
    return result


def write_checksums(output: pathlib.Path) -> None:
    rows: list[str] = []
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(rows) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path("."))
    parser.add_argument("--output", type=pathlib.Path)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.execute == args.dry_run:
        parser.error("choose exactly one of --execute or --dry-run")

    root = args.root.resolve()
    ledger, contract = load_protocol(root)
    if args.dry_run:
        print(
            json.dumps(
                {
                    "schema_version": "ssc-rd04-postpromotion-next-execution-plan@1",
                    "fixed_route_count": ledger["fixed_route_count"],
                    "maximum_total_requests": contract["maximum_total_requests"],
                    "route_ids": [route["route_id"] for route in ledger["routes"]],
                    "source_admission_effect": "none",
                    "field_classification_effect": "none",
                    "row_state_effect": "none",
                    "class_effect": "none",
                },
                indent=2,
                sort_keys=True,
            )
        )
        return 0

    if os.environ.get("EXECUTE_RD04_POSTPROMOTION_NEXT") != "YES":
        raise SystemExit(
            "execution refused: set EXECUTE_RD04_POSTPROMOTION_NEXT=YES in a separate never-merge carrier"
        )
    if args.output is None:
        parser.error("--output is required with --execute")

    output = args.output.resolve()
    if output.exists():
        raise SystemExit(f"output already exists: {output}")
    output.mkdir(parents=True)
    results = [execute_route(route, output) for route in ledger["routes"]]
    terminal_ids = [result["route_id"] for result in results if result["terminal_state"]]
    receipt = {
        "schema_version": "ssc-rd04-postpromotion-next-execution-receipt@1",
        "fixed_route_count": ledger["fixed_route_count"],
        "captured_route_ids": [result["route_id"] for result in results],
        "terminal_route_ids": terminal_ids,
        "results": results,
        "result_spawned_requests": 0,
        "automatic_source_admissions": 0,
        "automatic_field_classifications": 0,
        "automatic_row_terminalizations": 0,
        "automatic_class_closures": 0,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    (output / "route-results.json").write_bytes(canonical_json(results))
    (output / "execution-receipt.json").write_bytes(canonical_json(receipt))
    write_checksums(output)
    if len(terminal_ids) != ledger["fixed_route_count"]:
        raise SystemExit("not every route reached a terminal transport state")
    print(f"execution_terminal_routes={len(terminal_ids)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
