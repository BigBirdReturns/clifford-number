#!/usr/bin/env python3
"""Validate the frozen RD-04 postpromotion route denominator.

The five-route network capture has already occurred under artifact custody. This program keeps
its dry-run and self-test surfaces, but canonical execution is blocked unless a later reviewed
contract explicitly reauthorizes transport. The runner is bound to the repository-owned route
ledger and contract by SHA-256 and accepts no root override.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

REPOSITORY_ROOT = pathlib.Path(__file__).resolve().parents[3]
PRODUCT_DIR = pathlib.Path(
    "data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol"
)
ROUTE_LEDGER = PRODUCT_DIR / "route-ledger.json"
QUERY_CONTRACT = PRODUCT_DIR / "route-query-contract.json"
EXPECTED_ROUTE_LEDGER_SHA256 = "b2b0527a99f1bb79dc16827a7907b0948813e5644cb69a53d030d63a53de226e"
EXPECTED_QUERY_CONTRACT_SHA256 = "1660096b25de7159aaa16e04722ac95d851ad716065ff1e3134fed2ea553c84b"
USER_AGENT = (
    "BigBirdReturns-clifford-number-RD04-postpromotion-route-capture/2.0 "
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
            raise urllib.error.URLError("maximum redirects exceeded")
        self.budget.consume(self.route_id, "redirect", normalized)
        self.redirects.append(
            {
                "status": code,
                "from_url": normalize_url(req.full_url),
                "to_url": normalized,
            }
        )
        return super().redirect_request(req, fp, code, msg, headers, normalized)


def load_protocol(
    root: pathlib.Path = REPOSITORY_ROOT,
    *,
    enforce_repository_root: bool = True,
) -> tuple[dict[str, Any], dict[str, Any]]:
    resolved = root.resolve()
    if enforce_repository_root and resolved != REPOSITORY_ROOT:
        raise ValueError("protocol root override refused")
    ledger_bytes = (resolved / ROUTE_LEDGER).read_bytes()
    contract_bytes = (resolved / QUERY_CONTRACT).read_bytes()
    if sha256(ledger_bytes) != EXPECTED_ROUTE_LEDGER_SHA256:
        raise ValueError("route ledger SHA-256 differs from the frozen denominator")
    if sha256(contract_bytes) != EXPECTED_QUERY_CONTRACT_SHA256:
        raise ValueError("route contract SHA-256 differs from the reviewed control surface")
    ledger = json.loads(ledger_bytes)
    contract = json.loads(contract_bytes)
    if ledger["fixed_route_count"] != 5 or len(ledger["routes"]) != 5:
        raise ValueError("route denominator differs from five")
    if contract["fixed_route_count"] != 5:
        raise ValueError("contract denominator differs from five")
    if contract["maximum_logical_route_attempts"] != 5:
        raise ValueError("logical route-attempt ceiling differs from five")
    if contract["maximum_total_requests"] != 5:
        raise ValueError("physical request ceiling differs from five")
    if contract["maximum_physical_requests"] != 5:
        raise ValueError("physical request budget differs from five")
    if contract["maximum_total_request_semantics"] != "physical_http_requests_including_redirects":
        raise ValueError("request-budget semantics differ")
    if contract["redirects_consume_total_request_budget"] is not True:
        raise ValueError("redirect request accounting disabled")
    if contract["redirect_target_scheme"] != "https":
        raise ValueError("redirect scheme policy differs")
    if contract["maximum_attempts_per_route"] != 1:
        raise ValueError("attempt ceiling differs from one")
    if contract["parallel_workers"] != 1:
        raise ValueError("execution must remain sequential")
    if contract["result_spawned_requests"] != 0:
        raise ValueError("result-spawned requests must remain zero")
    if contract["runner_root_override_allowed"] is not False:
        raise ValueError("runner root override enabled")
    if contract["protocol_input_sha256_binding"] is not True:
        raise ValueError("protocol input binding disabled")
    if contract["receipt_preimage_field"] != "receipt_preimage_sha256":
        raise ValueError("receipt preimage field differs")
    if contract["final_receipt_ledger_path"] != "receipt-file-ledger.json":
        raise ValueError("final receipt ledger path differs")
    if contract["final_receipt_sha256_embedded"] is not False:
        raise ValueError("self-referential final receipt hash enabled")
    if contract["additional_execution_authorized"] is not False:
        raise ValueError("additional execution authority enabled")
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


def initial_result(route: dict[str, Any]) -> dict[str, Any]:
    return {
        "route_ordinal": route["route_ordinal"],
        "route_id": route["route_id"],
        "postal_code": route["postal_code"],
        "requested_url": route["normalized_url"],
        "expected_host": route["expected_host"],
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
        "receipt_path": None,
        "receipt_preimage_sha256": None,
        "error": None,
        "source_admission_effect": "none",
        "field_classification_effect": "none",
        "row_state_effect": "none",
        "class_effect": "none",
        "result_spawned_requests": 0,
        "outside_human_dependency": False,
    }


def write_route_receipt(result: dict[str, Any], route_dir: pathlib.Path, output: pathlib.Path) -> None:
    receipt_path = route_dir / "receipt.json"
    result["receipt_path"] = receipt_path.relative_to(output).as_posix()
    result["receipt_preimage_sha256"] = None
    result["receipt_preimage_sha256"] = sha256(canonical_json(result))
    receipt_path.write_bytes(canonical_json(result))


def execute_route(
    route: dict[str, Any],
    output: pathlib.Path,
    budget: RequestBudget,
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
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
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
            headers_path.write_text(headers)
            result["headers_path"] = headers_path.relative_to(output).as_posix()
            if body:
                body_path = route_dir / "body.bin"
                body_path.write_bytes(body)
                result["body_path"] = body_path.relative_to(output).as_posix()
                result["body_bytes"] = len(body)
                result["body_sha256"] = sha256(body)
                result["terminal_state"] = (
                    "terminal_http_success_body_captured"
                    if 200 <= response.status < 300
                    else "terminal_http_non_success"
                )
            else:
                result["terminal_state"] = (
                    "terminal_http_success_no_body"
                    if 200 <= response.status < 300
                    else "terminal_http_non_success"
                )
    except RedirectRefused as error:
        result["terminal_state"] = (
            "terminal_non_https_redirect_refused"
            if error.reason == "non_https_redirect"
            else "terminal_cross_host_redirect_refused"
        )
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

    result["physical_request_count"] = budget.used - budget_before
    write_route_receipt(result, route_dir, output)
    return result


def write_receipt_file_ledger(output: pathlib.Path, results: list[dict[str, Any]]) -> dict[str, Any]:
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
        "schema_version": "ssc-rd04-postpromotion-next-receipt-file-ledger@1",
        "hash_semantics": "receipt_sha256 authenticates final retained receipt bytes; receipt_preimage_sha256 authenticates the canonical receipt with receipt_preimage_sha256 set to null",
        "entries": entries,
    }
    (output / "receipt-file-ledger.json").write_bytes(canonical_json(ledger))
    return ledger


def write_checksums(output: pathlib.Path) -> None:
    rows: list[str] = []
    for path in sorted(output.rglob("*")):
        if path.is_file() and path.name != "SHA256SUMS":
            rows.append(f"{sha256(path.read_bytes())}  {path.relative_to(output).as_posix()}")
    (output / "SHA256SUMS").write_text("\n".join(rows) + "\n")


def run_self_test() -> None:
    load_protocol()
    with tempfile.TemporaryDirectory() as tmp:
        temp_root = pathlib.Path(tmp)
        temp_product = temp_root / PRODUCT_DIR
        temp_product.mkdir(parents=True)
        temp_product.joinpath("route-ledger.json").write_bytes((REPOSITORY_ROOT / ROUTE_LEDGER).read_bytes())
        temp_product.joinpath("route-query-contract.json").write_bytes((REPOSITORY_ROOT / QUERY_CONTRACT).read_bytes())
        try:
            load_protocol(temp_root)
        except ValueError as error:
            assert "root override" in str(error)
        else:
            raise AssertionError("root override was accepted")
        tampered = bytearray(temp_product.joinpath("route-ledger.json").read_bytes())
        tampered[-2] ^= 1
        temp_product.joinpath("route-ledger.json").write_bytes(tampered)
        try:
            load_protocol(temp_root, enforce_repository_root=False)
        except ValueError as error:
            assert "ledger SHA-256" in str(error)
        else:
            raise AssertionError("tampered ledger was accepted")

    route = json.loads((REPOSITORY_ROOT / ROUTE_LEDGER).read_text())["routes"][0]
    request = urllib.request.Request(route["normalized_url"])
    budget = RequestBudget(1)
    budget.consume(route["route_id"], "initial", route["normalized_url"])
    handler = FixedHostRedirectHandler(route["route_id"], route["expected_host"], 4, budget)
    try:
        handler.redirect_request(request, None, 302, "Found", {}, route["normalized_url"] + "?redirect=1")
    except RequestBudgetExceeded:
        pass
    else:
        raise AssertionError("redirect escaped physical request budget")

    handler = FixedHostRedirectHandler(route["route_id"], route["expected_host"], 4, RequestBudget(5))
    try:
        handler.redirect_request(request, None, 302, "Found", {}, route["normalized_url"].replace("https:", "http:"))
    except RedirectRefused as error:
        assert error.reason == "non_https_redirect"
    else:
        raise AssertionError("HTTPS downgrade was accepted")

    with tempfile.TemporaryDirectory() as tmp:
        output = pathlib.Path(tmp)
        route_dir = output / "routes" / route["route_id"]
        route_dir.mkdir(parents=True)
        result = initial_result(route)
        result["terminal_state"] = "terminal_request_budget_exhausted"
        write_route_receipt(result, route_dir, output)
        ledger = write_receipt_file_ledger(output, [result])
        receipt = (output / result["receipt_path"]).read_bytes()
        assert ledger["entries"][0]["receipt_sha256"] == sha256(receipt)
        assert ledger["entries"][0]["receipt_preimage_sha256"] == result["receipt_preimage_sha256"]
        assert ledger["entries"][0]["receipt_sha256"] != result["receipt_preimage_sha256"]
    print("rd04_postpromotion_runner_self_test=pass controls=5")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--execute", action="store_true")
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    ledger, contract = load_protocol()
    if args.dry_run:
        print(
            json.dumps(
                {
                    "schema_version": "ssc-rd04-postpromotion-next-execution-plan@2",
                    "fixed_route_count": ledger["fixed_route_count"],
                    "maximum_logical_route_attempts": contract["maximum_logical_route_attempts"],
                    "maximum_physical_requests": contract["maximum_physical_requests"],
                    "maximum_total_request_semantics": contract["maximum_total_request_semantics"],
                    "route_ids": [route["route_id"] for route in ledger["routes"]],
                    "additional_execution_authorized": contract["additional_execution_authorized"],
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

    if contract["additional_execution_authorized"] is not True:
        raise SystemExit(
            "execution refused: the canonical five-route capture already exists and additional transport is not authorized"
        )
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
    budget = RequestBudget(contract["maximum_physical_requests"])
    results = [execute_route(route, output, budget) for route in ledger["routes"]]
    terminal_ids = [result["route_id"] for result in results if result["terminal_state"]]
    write_receipt_file_ledger(output, results)
    receipt = {
        "schema_version": "ssc-rd04-postpromotion-next-execution-receipt@2",
        "fixed_route_count": ledger["fixed_route_count"],
        "captured_route_ids": [result["route_id"] for result in results],
        "terminal_route_ids": terminal_ids,
        "physical_request_budget": budget.maximum,
        "physical_requests_used": budget.used,
        "physical_request_events": budget.events,
        "receipt_file_ledger_path": "receipt-file-ledger.json",
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
    print(f"execution_terminal_routes={len(terminal_ids)} physical_requests={budget.used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
