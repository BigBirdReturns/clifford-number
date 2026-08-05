#!/usr/bin/env python3
"""Resolve the exact Florida corporate denominator behind School.House candidates.

The current lake contains two bounded candidate planes that require exact
corporate follow-up:

* fifteen unique Florida owner charter numbers attached to the complete
  School.House phrase census over the quarterly fictitious-name file; and
* two Florida document numbers returned by the strict exact-FEI search for IRS
  candidate EIN 39-2669585.

This runner submits only those seventeen exact document numbers to the official
Florida Division of Corporations search surface. It retains legal name,
document number, entity type, status, filed date, FEI/EIN, principal city and
state, and officer count. It drops street addresses, registered-agent names,
officer names, contact details, document images, private records, and private
messages.

Resolving an owner charter or an IRS candidate does not identify BVVC's public
School.House brand. Every public-brand join remains explicitly unadmitted.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

DEFAULT_USER_AGENT = (
    "CliffordNumber-SchoolHouse-FL-Corporate-Resolution/1.0 "
    "219768509+BigBirdReturns@users.noreply.github.com"
)

CORPORATE_SEARCH_BASE = (
    "https://search.sunbiz.org/Inquiry/CorporationSearch"
)
BY_DOCUMENT_NUMBER = f"{CORPORATE_SEARCH_BASE}/ByDocumentNumber"
MAGNOLIA_EIN = "392669585"
MAGNOLIA_DOCUMENTS = {"N25000006947", "L25000047895"}

TERMINAL_STATES = {
    "resolved_exact_document",
    "document_not_found",
    "detail_unparsed",
    "document_mismatch",
    "source_unavailable_after_search",
}


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_name(value: Any) -> str:
    text = normalize_space(value).upper().replace("&", " AND ")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return normalize_space(text)


def normalize_ein(value: Any) -> str | None:
    digits = re.sub(r"\D", "", str(value or ""))
    return digits if len(digits) == 9 else None


def normalize_document(value: Any) -> str | None:
    text = re.sub(r"[^A-Z0-9]", "", str(value or "").upper())
    return text or None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compact(value: Any) -> str:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"{path}:{number}: {exc}") from exc
    return rows


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def stable_id(prefix: str, *values: Any) -> str:
    payload = "\x1f".join(normalize_space(value) for value in values)
    return f"{prefix}-{sha256_bytes(payload.encode('utf-8'))[:20]}"


@dataclass
class FetchResponse:
    ok: bool
    status: int | None
    body: bytes
    headers: dict[str, str]
    error: str | None
    attempts: int
    final_url: str


class Fetcher:
    def __init__(self, user_agent: str, retries: int, sleep_seconds: float) -> None:
        self.user_agent = user_agent
        self.retries = retries
        self.sleep_seconds = sleep_seconds
        self.request_count = 0
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor()
        )

    def request(
        self,
        url: str,
        *,
        method: str = "GET",
        form: dict[str, str] | None = None,
        referer: str | None = None,
        timeout: int = 45,
    ) -> FetchResponse:
        data = (
            urllib.parse.urlencode(form).encode("utf-8")
            if form is not None
            else None
        )
        last_status: int | None = None
        last_body = b""
        last_headers: dict[str, str] = {}
        last_error: str | None = None
        final_url = url
        for attempt in range(1, self.retries + 1):
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,text/plain,*/*",
                "Accept-Encoding": "identity",
                "Connection": "close",
            }
            if referer:
                headers["Referer"] = referer
            request = urllib.request.Request(
                url, data=data, headers=headers, method=method
            )
            try:
                with self.opener.open(request, timeout=timeout) as response:
                    body = response.read()
                    status = int(getattr(response, "status", 200))
                    response_headers = {
                        key.lower(): value for key, value in response.headers.items()
                    }
                    final_url = response.geturl()
                    self.request_count += 1
                    time.sleep(self.sleep_seconds)
                    return FetchResponse(
                        ok=200 <= status < 400,
                        status=status,
                        body=body,
                        headers=response_headers,
                        error=None,
                        attempts=attempt,
                        final_url=final_url,
                    )
            except urllib.error.HTTPError as exc:
                last_status = exc.code
                try:
                    last_body = exc.read()
                except Exception:
                    last_body = b""
                last_headers = {
                    key.lower(): value for key, value in exc.headers.items()
                }
                last_error = f"HTTPError: {exc.code} {exc.reason}"
                final_url = exc.geturl()
                if exc.code not in {408, 425, 429, 500, 502, 503, 504}:
                    break
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = f"{type(exc).__name__}: {exc}"
            if attempt < self.retries:
                delay = min(20.0, 1.5 * (2 ** (attempt - 1)))
                print(
                    f"attempt {attempt}/{self.retries} failed for {url}: "
                    f"{last_error}; sleep {delay:.1f}s",
                    file=sys.stderr,
                    flush=True,
                )
                time.sleep(delay)
        return FetchResponse(
            ok=False,
            status=last_status,
            body=last_body,
            headers=last_headers,
            error=last_error or "request_failed",
            attempts=self.retries,
            final_url=final_url,
        )


class TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag.lower() in {
            "br",
            "p",
            "div",
            "tr",
            "li",
            "h1",
            "h2",
            "h3",
            "section",
        }:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {
            "p",
            "div",
            "tr",
            "li",
            "h1",
            "h2",
            "h3",
            "section",
        }:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if data:
            self.parts.append(data)


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[dict[str, str]] = []
        self.current: dict[str, Any] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag.lower() != "a":
            return
        attr = {key.lower(): value or "" for key, value in attrs}
        self.current = {"href": attr.get("href", ""), "parts": []}

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current["parts"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self.current is not None:
            self.links.append(
                {
                    "href": self.current["href"],
                    "text": normalize_space("".join(self.current["parts"])),
                }
            )
            self.current = None


class FormParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.forms: list[dict[str, Any]] = []
        self.current: dict[str, Any] | None = None
        self.button: dict[str, Any] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attr = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "form":
            self.current = {
                "action": attr.get("action", ""),
                "method": attr.get("method", "get").upper(),
                "inputs": [],
                "buttons": [],
            }
        elif tag == "input" and self.current is not None:
            self.current["inputs"].append(
                {
                    "name": attr.get("name", ""),
                    "id": attr.get("id", ""),
                    "type": attr.get("type", "text").lower(),
                    "value": attr.get("value", ""),
                }
            )
        elif tag == "button" and self.current is not None:
            self.button = {
                "name": attr.get("name", ""),
                "id": attr.get("id", ""),
                "type": attr.get("type", "submit").lower(),
                "value": attr.get("value", ""),
                "parts": [],
            }

    def handle_data(self, data: str) -> None:
        if self.button is not None:
            self.button["parts"].append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "button" and self.button is not None:
            self.button["text"] = normalize_space(
                "".join(self.button.pop("parts"))
            )
            if self.current is not None:
                self.current["buttons"].append(self.button)
            self.button = None
        elif tag == "form" and self.current is not None:
            self.forms.append(self.current)
            self.current = None


def html_text(body: bytes) -> str:
    parser = TextParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    text = "".join(parser.parts)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def links(body: bytes) -> list[dict[str, str]]:
    parser = LinkParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    return parser.links


def forms(body: bytes) -> list[dict[str, Any]]:
    parser = FormParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    return parser.forms


def section_lines(text: str, start: str, end_labels: list[str]) -> list[str]:
    lines = [normalize_space(line) for line in text.splitlines() if normalize_space(line)]
    start_index = next(
        (index for index, line in enumerate(lines) if line.lower() == start.lower()),
        None,
    )
    if start_index is None:
        return []
    end_index = len(lines)
    for index in range(start_index + 1, len(lines)):
        if any(lines[index].lower() == label.lower() for label in end_labels):
            end_index = index
            break
    return lines[start_index + 1 : end_index]


def parse_city_state(text: str) -> tuple[str | None, str | None]:
    principal = section_lines(
        text,
        "Principal Address",
        [
            "Mailing Address",
            "Registered Agent Name & Address",
            "Officer/Director Detail Name & Address",
            "Authorized Person(s) Detail Name & Address",
            "Annual Reports",
            "Document Images",
        ],
    )
    for line in reversed(principal):
        match = re.search(
            r"^(.+?),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?(?:\s+.*)?$",
            line.upper(),
        )
        if match:
            return normalize_space(match.group(1)), match.group(2)
    return None, None


def parse_detail(body: bytes, source_url: str) -> dict[str, Any] | None:
    text = html_text(body)
    if "Filing Information" not in text or "Document Number" not in text:
        return None
    lines = [normalize_space(line) for line in text.splitlines() if normalize_space(line)]
    filing_index = next(
        (index for index, line in enumerate(lines) if line == "Filing Information"),
        None,
    )
    legal_name = None
    entity_type = None
    if filing_index is not None:
        preceding = []
        for line in lines[max(0, filing_index - 8) : filing_index]:
            if line.lower().startswith("detail by"):
                continue
            if line in {
                "Florida Department of State",
                "Division of Corporations",
            }:
                continue
            preceding.append(line)
        if preceding:
            legal_name = preceding[-1]
        if len(preceding) >= 2:
            entity_type = preceding[-2]
    joined = "\n".join(lines)
    document_match = re.search(r"Document Number\s+([A-Z0-9]+)", joined, re.I)
    fei_match = re.search(r"FEI/EIN Number\s+([A-Z0-9\-]+)", joined, re.I)
    date_match = re.search(r"Date Filed\s+([0-9/\-]+)", joined, re.I)
    state_match = re.search(r"\bState\s+([A-Z]{2})\b", joined, re.I)
    status_match = re.search(
        r"\bStatus\s+([A-Z /-]+?)(?:\s+Last Event|\n|$)",
        joined,
        re.I,
    )
    city, principal_state = parse_city_state(joined)
    officer_lines = section_lines(
        joined,
        "Officer/Director Detail Name & Address",
        ["Annual Reports", "Document Images"],
    )
    if not officer_lines:
        officer_lines = section_lines(
            joined,
            "Authorized Person(s) Detail Name & Address",
            ["Annual Reports", "Document Images"],
        )
    officer_count = sum(1 for line in officer_lines if line.startswith("Title"))
    fei_raw = normalize_space(fei_match.group(1)) if fei_match else None
    return {
        "source_url": source_url,
        "legal_name_as_recorded": legal_name,
        "normalized_legal_name": normalize_name(legal_name),
        "document_number": (
            normalize_document(document_match.group(1)) if document_match else None
        ),
        "entity_type": entity_type,
        "status": normalize_space(status_match.group(1)) if status_match else None,
        "date_filed": date_match.group(1) if date_match else None,
        "state": state_match.group(1).upper() if state_match else None,
        "fei_ein": normalize_ein(fei_raw),
        "fei_field_state": (
            "present" if normalize_ein(fei_raw) else "none_or_unresolved"
        ),
        "principal_city": city,
        "principal_state": principal_state,
        "officer_count": officer_count,
        "street_address_retained": False,
        "contact_details_retained": False,
        "registered_agent_name_retained": False,
        "officer_names_retained": False,
        "document_images_retained": False,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def select_document_form(page: bytes) -> dict[str, Any] | None:
    scored: list[tuple[int, dict[str, Any]]] = []
    for form in forms(page):
        score = 0
        for item in form.get("inputs", []):
            haystack = f"{item.get('name', '')} {item.get('id', '')}".lower()
            if item.get("type") in {"text", "search", ""}:
                score += 2
            if "document" in haystack or "search" in haystack:
                score += 10
        if score:
            scored.append((score, form))
    return max(scored, key=lambda pair: pair[0])[1] if scored else None


def form_request(
    form: dict[str, Any], document_number: str
) -> tuple[str, str, dict[str, str]]:
    payload: dict[str, str] = {}
    text_fields: list[dict[str, str]] = []
    for item in form.get("inputs", []):
        name = item.get("name") or ""
        if not name:
            continue
        input_type = (item.get("type") or "text").lower()
        if input_type == "hidden":
            payload[name] = item.get("value") or ""
        elif input_type in {"text", "search", ""}:
            text_fields.append(item)
    query_field = None
    for item in text_fields:
        haystack = f"{item.get('name', '')} {item.get('id', '')}".lower()
        if "document" in haystack or "search" in haystack:
            query_field = item.get("name")
            break
    if query_field is None and text_fields:
        query_field = text_fields[0].get("name")
    if not query_field:
        raise RuntimeError("document-number form query field unresolved")
    payload[query_field] = document_number
    submit_added = False
    for item in form.get("inputs", []):
        if (item.get("type") or "").lower() not in {"submit", "button"}:
            continue
        name = item.get("name") or ""
        value = item.get("value") or ""
        if name and ("search" in value.lower() or not submit_added):
            payload[name] = value or "Search"
            submit_added = True
            if "search" in value.lower():
                break
    if not submit_added:
        for button in form.get("buttons", []):
            name = button.get("name") or ""
            value = button.get("value") or button.get("text") or "Search"
            if name:
                payload[name] = value
                break
    action = urllib.parse.urljoin(BY_DOCUMENT_NUMBER, form.get("action") or "")
    method = form.get("method") or "POST"
    return action, method, payload


def exact_detail_link(body: bytes, base_url: str, document_number: str) -> str | None:
    expected = normalize_document(document_number)
    candidates = []
    for link in links(body):
        href = link.get("href") or ""
        if "SearchResultDetail" not in href:
            continue
        resolved = urllib.parse.urljoin(base_url, href)
        haystack = normalize_document(
            f"{link.get('text', '')} {href}"
        ) or ""
        score = 2 if expected and expected in haystack else 1
        candidates.append((score, resolved))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def fetch_document(
    fetcher: Fetcher,
    document_number: str,
    form: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    expected = normalize_document(document_number)
    route: dict[str, Any] = {
        "route_id": stable_id("fl-corporate-document", expected),
        "jurisdiction": "Florida",
        "source_family": "fl_sunbiz_corporate_detail",
        "query_type": "exact_document_number",
        "query": expected,
        "state": "not_attempted",
        "retrieved_at": utc_now(),
        "transport_attempts": [],
        "raw_source_retained": False,
        "street_address_retained": False,
        "contact_details_retained": False,
        "registered_agent_name_retained": False,
        "officer_names_retained": False,
        "document_images_retained": False,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "negative_existence_claim_permitted": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    responses: list[tuple[str, FetchResponse]] = []

    path_url = (
        f"{CORPORATE_SEARCH_BASE}/SearchResults/DocumentNumber/"
        f"{urllib.parse.quote(expected or '', safe='')}/Page1"
    )
    response = fetcher.request(path_url)
    responses.append(("path_document_search", response))

    if not response.ok:
        query_url = (
            f"{CORPORATE_SEARCH_BASE}/SearchResults?"
            + urllib.parse.urlencode(
                {"inquiryType": "DocumentNumber", "searchTerm": expected or ""}
            )
        )
        query_response = fetcher.request(query_url, referer=BY_DOCUMENT_NUMBER)
        responses.append(("query_document_search", query_response))
        if query_response.ok:
            response = query_response

    if not response.ok and form is not None:
        try:
            action, method, payload = form_request(form, expected or "")
            form_response = fetcher.request(
                action,
                method=method,
                form=payload,
                referer=BY_DOCUMENT_NUMBER,
            )
            responses.append(("form_document_search", form_response))
            if form_response.ok:
                response = form_response
        except Exception as exc:
            route["form_error"] = f"{type(exc).__name__}: {exc}"

    for variant, item in responses:
        route["transport_attempts"].append(
            {
                "variant": variant,
                "requested_url": item.final_url,
                "http_status": item.status,
                "bytes": len(item.body),
                "sha256": sha256_bytes(item.body),
                "attempts": item.attempts,
                "error": item.error,
            }
        )

    if not response.ok:
        route["state"] = "source_unavailable_after_search"
        route["terminal_http_status"] = response.status
        route["terminal_error"] = response.error
        return route, None

    search_text = html_text(response.body)
    route["search_result_url"] = response.final_url
    route["search_result_bytes"] = len(response.body)
    route["search_result_sha256"] = sha256_bytes(response.body)
    route["search_http_status"] = response.status

    detail = parse_detail(response.body, response.final_url)
    detail_response = response
    detail_url = response.final_url
    if detail is None:
        if "Record Not Found" in search_text:
            route["state"] = "document_not_found"
            return route, None
        link = exact_detail_link(response.body, response.final_url, expected or "")
        if not link:
            route["state"] = "detail_unparsed"
            route["detail_link_resolved"] = False
            return route, None
        detail_url = link
        detail_response = fetcher.request(link, referer=response.final_url)
        route["detail_link_resolved"] = True
        route["detail_url"] = link
        route["detail_http_status"] = detail_response.status
        route["detail_bytes"] = len(detail_response.body)
        route["detail_sha256"] = sha256_bytes(detail_response.body)
        route["detail_attempts"] = detail_response.attempts
        if not detail_response.ok:
            route["state"] = "source_unavailable_after_search"
            route["terminal_http_status"] = detail_response.status
            route["terminal_error"] = detail_response.error
            return route, None
        detail = parse_detail(detail_response.body, detail_response.final_url)

    if detail is None:
        route["state"] = "detail_unparsed"
        return route, None

    actual = normalize_document(detail.get("document_number"))
    route["detail_url"] = detail_url
    route["detail_http_status"] = detail_response.status
    route["detail_bytes"] = len(detail_response.body)
    route["detail_sha256"] = sha256_bytes(detail_response.body)
    route["detail_attempts"] = detail_response.attempts
    route["resolved_document_number"] = actual
    if actual != expected:
        route["state"] = "document_mismatch"
        route["expected_document_number"] = expected
        return route, detail
    route["state"] = "resolved_exact_document"
    return route, detail


def build_input_denominator(
    fictitious_rows: list[dict[str, Any]],
    irs_rows: list[dict[str, Any]],
    exact_fei_rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    contexts: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in fictitious_rows:
        for owner in candidate.get("owners", []):
            document = normalize_document(owner.get("owner_charter_number"))
            if not document:
                continue
            contexts[document].append(
                {
                    "context_type": "fictitious_name_owner_charter",
                    "fictitious_candidate_id": candidate.get("candidate_id"),
                    "fictitious_document_number": candidate.get("document_number"),
                    "fictitious_name_as_recorded": candidate.get(
                        "fictitious_name_as_recorded"
                    ),
                    "fictitious_city": candidate.get("city"),
                    "fictitious_state": candidate.get("state"),
                    "fictitious_filing_date": candidate.get("filing_date"),
                    "owner_name_as_recorded": owner.get("owner_name_as_recorded"),
                    "owner_charter_number": document,
                    "owner_fei": normalize_ein(owner.get("owner_fei")),
                    "public_tampa_bay_city_match": bool(
                        candidate.get("public_tampa_bay_city_match")
                    ),
                    "identity_admitted": False,
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )

    irs_magnolia = [row for row in irs_rows if row.get("ein") == MAGNOLIA_EIN]
    if len(irs_magnolia) != 1:
        raise RuntimeError(
            f"expected one IRS EO BMF row for {MAGNOLIA_EIN}, got {len(irs_magnolia)}"
        )
    irs_row = irs_magnolia[0]

    exact = [
        row
        for row in exact_fei_rows
        if row.get("query_type") == "fei_ein"
        and normalize_ein(row.get("query")) == MAGNOLIA_EIN
    ]
    exact_documents = {
        normalize_document(row.get("document_number")) for row in exact
    }
    exact_documents.discard(None)
    if exact_documents != MAGNOLIA_DOCUMENTS:
        raise RuntimeError(
            f"exact-FEI document denominator drift: {sorted(exact_documents)}"
        )
    for document in sorted(exact_documents):
        matching_names = sorted(
            {
                normalize_space(row.get("legal_name"))
                for row in exact
                if normalize_document(row.get("document_number")) == document
                and normalize_space(row.get("legal_name"))
            }
        )
        contexts[document].append(
            {
                "context_type": "irs_candidate_exact_fei_search_result",
                "irs_candidate_row_id": irs_row.get("candidate_row_id"),
                "irs_ein": MAGNOLIA_EIN,
                "irs_legal_name_as_recorded": irs_row.get("legal_name_as_recorded"),
                "irs_city": irs_row.get("city"),
                "irs_state": irs_row.get("state"),
                "irs_ruling_date": irs_row.get("ruling_date"),
                "exact_fei_search_names": matching_names,
                "exact_fei_search_document_number": document,
                "identity_admitted": False,
                "public_schoolhouse_brand_join_state": "not_established",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    owner_documents = {
        document
        for document, rows in contexts.items()
        if any(row["context_type"] == "fictitious_name_owner_charter" for row in rows)
    }
    if len(owner_documents) != 15:
        raise RuntimeError(
            f"expected 15 unique owner charter numbers, got {len(owner_documents)}"
        )
    if len(contexts) != 17:
        raise RuntimeError(
            f"expected 17 exact corporate documents, got {len(contexts)}"
        )

    denominator = []
    for document in sorted(contexts):
        context_rows = contexts[document]
        denominator.append(
            {
                "document_number": document,
                "context_count": len(context_rows),
                "context_types": sorted(
                    {row["context_type"] for row in context_rows}
                ),
                "expected_owner_feis": sorted(
                    {
                        row["owner_fei"]
                        for row in context_rows
                        if row.get("owner_fei")
                    }
                ),
                "expected_owner_names": sorted(
                    {
                        row["owner_name_as_recorded"]
                        for row in context_rows
                        if row.get("owner_name_as_recorded")
                    }
                ),
                "expected_irs_eins": sorted(
                    {
                        row["irs_ein"]
                        for row in context_rows
                        if row.get("irs_ein")
                    }
                ),
                "public_schoolhouse_brand_join_state": "not_established",
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return denominator, contexts


def classify_record(
    document: str,
    detail: dict[str, Any] | None,
    contexts: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if detail is None:
        return None
    expected_owner_feis = sorted(
        {row["owner_fei"] for row in contexts if row.get("owner_fei")}
    )
    expected_owner_names = sorted(
        {
            row["owner_name_as_recorded"]
            for row in contexts
            if row.get("owner_name_as_recorded")
        }
    )
    expected_irs_eins = sorted(
        {row["irs_ein"] for row in contexts if row.get("irs_ein")}
    )
    actual_fei = normalize_ein(detail.get("fei_ein"))
    if expected_owner_feis:
        owner_fei_alignment = (
            "exact"
            if actual_fei in expected_owner_feis
            else "detail_reports_no_fei"
            if actual_fei is None
            else "conflict"
        )
    else:
        owner_fei_alignment = "not_applicable"
    if expected_owner_names:
        actual_name = normalize_name(detail.get("legal_name_as_recorded"))
        normalized_expected = {normalize_name(name) for name in expected_owner_names}
        owner_name_alignment = (
            "exact_normalized"
            if actual_name in normalized_expected
            else "current_name_differs_from_fictitious_owner_name"
        )
    else:
        owner_name_alignment = "not_applicable"
    if expected_irs_eins:
        irs_ein_alignment = (
            "exact"
            if actual_fei in expected_irs_eins
            else "detail_reports_no_fei"
            if actual_fei is None
            else "conflict"
        )
    else:
        irs_ein_alignment = "not_applicable"
    if document == "N25000006947" and irs_ein_alignment == "exact":
        irs_candidate_resolution_state = "identifier_grade_irs_candidate_identity_resolved"
    elif document == "L25000047895" and irs_ein_alignment != "exact":
        irs_candidate_resolution_state = "exact_fei_search_result_not_confirmed_by_detail"
    elif expected_irs_eins:
        irs_candidate_resolution_state = "irs_candidate_identity_not_resolved"
    else:
        irs_candidate_resolution_state = "not_applicable"
    return {
        "record_id": f"fl-corporate:{document}",
        "document_number": document,
        "legal_name_as_recorded": detail.get("legal_name_as_recorded"),
        "normalized_legal_name": detail.get("normalized_legal_name"),
        "entity_type": detail.get("entity_type"),
        "status": detail.get("status"),
        "date_filed": detail.get("date_filed"),
        "state": detail.get("state"),
        "fei_ein": actual_fei,
        "fei_field_state": detail.get("fei_field_state"),
        "principal_city": detail.get("principal_city"),
        "principal_state": detail.get("principal_state"),
        "officer_count": detail.get("officer_count"),
        "source_url": detail.get("source_url"),
        "context_count": len(contexts),
        "context_types": sorted({row["context_type"] for row in contexts}),
        "expected_owner_feis": expected_owner_feis,
        "expected_owner_names": expected_owner_names,
        "expected_irs_eins": expected_irs_eins,
        "owner_fei_alignment": owner_fei_alignment,
        "owner_name_alignment": owner_name_alignment,
        "irs_ein_alignment": irs_ein_alignment,
        "irs_candidate_resolution_state": irs_candidate_resolution_state,
        "public_schoolhouse_brand_join_state": "not_established",
        "identity_state": "corporate_record_resolved_public_brand_not_admitted",
        "street_address_retained": False,
        "contact_details_retained": False,
        "registered_agent_name_retained": False,
        "officer_names_retained": False,
        "document_images_retained": False,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def build_manifest(output: Path) -> None:
    rows = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {
            "artifact-manifest.json",
            "SHA256SUMS",
        }:
            continue
        body = file.read_bytes()
        rows.append(
            {
                "path": file.relative_to(output).as_posix(),
                "bytes": len(body),
                "sha256": sha256_bytes(body),
            }
        )
    write_json(
        output / "artifact-manifest.json",
        {
            "schema_version": "schoolhouse-fl-corporate-resolution-artifact-manifest@1",
            "generated_at": utc_now(),
            "file_count": len(rows),
            "files": rows,
            "raw_source_files_retained": 0,
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "document_image_rows_retained": 0,
            "private_support_rows": 0,
            "outside_human_dependency": False,
            "publication_effect": "none",
            "adoption_effect": "none",
            "graph_effect": "none",
            "promotes_to": "candidate_only",
        },
    )
    lines = []
    for file in sorted(output.rglob("*")):
        if file.is_file() and file.name != "SHA256SUMS":
            lines.append(
                f"{sha256_bytes(file.read_bytes())}  "
                f"{file.relative_to(output).as_posix()}"
            )
    (output / "SHA256SUMS").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--lake-dir", required=True, type=Path)
    parser.add_argument("--exact-fei-artifact", required=True, type=Path)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--sleep-seconds", type=float, default=0.65)
    parser.add_argument(
        "--user-agent",
        default=os.environ.get("SUNBIZ_USER_AGENT", DEFAULT_USER_AGENT),
    )
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    lake = args.lake_dir.resolve()
    exact_artifact = args.exact_fei_artifact.resolve()
    fictitious_path = lake / "schoolhouse-fl-fictitious-candidates.jsonl"
    irs_path = lake / "schoolhouse-irs-candidates-eo-bmf.jsonl"
    exact_path = exact_artifact / "registry-candidates.jsonl"
    for required in [fictitious_path, irs_path, exact_path]:
        if not required.exists():
            raise RuntimeError(f"required input missing: {required}")

    started_at = utc_now()
    fictitious_rows = read_jsonl(fictitious_path)
    irs_rows = read_jsonl(irs_path)
    exact_fei_rows = read_jsonl(exact_path)
    denominator, contexts = build_input_denominator(
        fictitious_rows, irs_rows, exact_fei_rows
    )

    fetcher = Fetcher(args.user_agent, args.retries, args.sleep_seconds)
    form_page = fetcher.request(BY_DOCUMENT_NUMBER)
    document_form = select_document_form(form_page.body) if form_page.ok else None
    form_receipt = {
        "requested_url": BY_DOCUMENT_NUMBER,
        "http_status": form_page.status,
        "bytes": len(form_page.body),
        "sha256": sha256_bytes(form_page.body),
        "attempts": form_page.attempts,
        "error": form_page.error,
        "form_resolved": document_form is not None,
    }

    routes: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []
    for item in denominator:
        document = item["document_number"]
        print(f"resolving Florida document {document}", flush=True)
        route, detail = fetch_document(fetcher, document, document_form)
        route["context_count"] = item["context_count"]
        route["context_types"] = item["context_types"]
        route["expected_owner_feis"] = item["expected_owner_feis"]
        route["expected_irs_eins"] = item["expected_irs_eins"]
        routes.append(route)
        record = classify_record(document, detail, contexts[document])
        if route["state"] == "resolved_exact_document" and record is None:
            raise RuntimeError(f"resolved route lacks record: {document}")
        if record is not None:
            record["route_id"] = route["route_id"]
            record["source_sha256"] = route.get("detail_sha256")
            records.append(record)

    route_states = Counter(route["state"] for route in routes)
    resolved_documents = {
        record["document_number"] for record in records
    }
    owner_documents = {
        item["document_number"]
        for item in denominator
        if "fictitious_name_owner_charter" in item["context_types"]
    }
    resolved_owner_documents = owner_documents & resolved_documents
    unresolved_owner_documents = sorted(owner_documents - resolved_documents)
    magnolia_records = {
        record["document_number"]: record
        for record in records
        if record["document_number"] in MAGNOLIA_DOCUMENTS
    }
    nonprofit = magnolia_records.get("N25000006947")
    llc = magnolia_records.get("L25000047895")
    nonprofit_confirmed = bool(
        nonprofit
        and nonprofit.get("irs_ein_alignment") == "exact"
        and nonprofit.get("principal_city") == "VERO BEACH"
        and nonprofit.get("principal_state") == "FL"
    )
    llc_detail_rejects_fei = bool(
        llc and llc.get("irs_ein_alignment") == "detail_reports_no_fei"
    )

    input_denominator = {
        "schema_version": "schoolhouse-fl-corporate-resolution-input@1",
        "generated_at": utc_now(),
        "fictitious_candidate_rows": len(fictitious_rows),
        "unique_owner_charter_numbers": len(owner_documents),
        "magnolia_exact_fei_document_numbers": sorted(MAGNOLIA_DOCUMENTS),
        "declared_document_numbers": len(denominator),
        "document_rows": denominator,
        "exact_fei_artifact": {
            "workflow_run_id": 30975237852,
            "artifact_id": 8918041117,
            "artifact_digest": "sha256:1066e00ddff9b55f0e976abaa1212429c726ac8507d31691e163bbaee73a4316",
            "state": "strict_terminal_candidate_census_detail_denominator_incomplete",
        },
        "public_schoolhouse_brand_join_state": "not_established",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    adjudication = {
        "schema_version": "schoolhouse-fl-corporate-resolution-adjudication@1",
        "as_of": utc_now(),
        "input_denominator": {
            "declared_document_numbers": len(denominator),
            "fictitious_owner_charter_numbers": len(owner_documents),
            "magnolia_exact_fei_document_numbers": len(MAGNOLIA_DOCUMENTS),
        },
        "route_denominator": {
            "declared_routes": len(routes),
            "terminal_routes": sum(
                1 for route in routes if route["state"] in TERMINAL_STATES
            ),
            "resolved_exact_documents": len(resolved_documents),
            "route_state_counts": dict(sorted(route_states.items())),
        },
        "fictitious_owner_resolution": {
            "declared_owner_charter_numbers": len(owner_documents),
            "resolved_owner_charter_numbers": len(resolved_owner_documents),
            "unresolved_owner_charter_numbers": unresolved_owner_documents,
            "public_schoolhouse_brand_join_state": "not_established",
            "boundary": "Resolving an owner charter identifies the corporate owner of a phrase-matched fictitious name. It does not identify BVVC's public School.House brand.",
        },
        "irs_candidate_resolution": {
            "irs_candidate_ein": MAGNOLIA_EIN,
            "irs_candidate_legal_name": "THE MAGNOLIA SCHOOLHOUSE INC",
            "irs_candidate_city": "VERO BEACH",
            "nonprofit_document_number": "N25000006947",
            "nonprofit_identifier_grade_resolution": nonprofit_confirmed,
            "nonprofit_record_id": nonprofit.get("record_id") if nonprofit else None,
            "llc_document_number": "L25000047895",
            "llc_detail_rejects_exact_fei": llc_detail_rejects_fei,
            "llc_record_id": llc.get("record_id") if llc else None,
            "public_schoolhouse_brand_join_state": "not_established",
            "boundary": "Resolving the IRS candidate to a Florida nonprofit does not identify that nonprofit as BVVC's public School.House. The public name, 2023 founding claim, and Tampa Bay or Fayetteville surfaces remain unjoined.",
        },
        "public_schoolhouse_identity_decision": {
            "state": "unresolved_no_florida_corporate_identity_admitted",
            "admitted_document_number": None,
            "admitted_legal_name": None,
            "admitted_ein": None,
            "negative_existence_claim_created": False,
        },
        "privacy": {
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "registered_agent_name_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "document_image_rows_retained": 0,
            "private_support_rows": 0,
        },
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    all_routes_terminal = all(
        route["state"] in TERMINAL_STATES for route in routes
    )
    summary = {
        "schema_version": "schoolhouse-fl-corporate-resolution-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "declared_document_numbers": len(denominator),
        "fictitious_owner_charter_numbers": len(owner_documents),
        "magnolia_exact_fei_document_numbers": len(MAGNOLIA_DOCUMENTS),
        "route_count": len(routes),
        "terminal_route_count": sum(
            1 for route in routes if route["state"] in TERMINAL_STATES
        ),
        "all_routes_terminal": all_routes_terminal,
        "route_state_counts": dict(sorted(route_states.items())),
        "resolved_exact_documents": len(resolved_documents),
        "resolved_owner_charter_numbers": len(resolved_owner_documents),
        "unresolved_owner_charter_numbers": len(unresolved_owner_documents),
        "corporate_record_rows": len(records),
        "magnolia_nonprofit_identifier_grade_resolution": nonprofit_confirmed,
        "magnolia_llc_detail_rejects_exact_fei": llc_detail_rejects_fei,
        "public_schoolhouse_identity_admitted": False,
        "negative_existence_claim_created": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "registered_agent_name_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "document_image_rows_retained": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "request_count": fetcher.request_count,
        "raw_source_files_retained": 0,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }
    receipt = {
        "schema_version": "schoolhouse-fl-corporate-resolution-acquisition-receipt@1",
        "generated_at": utc_now(),
        "input_denominator_sha256": sha256_bytes(
            compact(input_denominator).encode("utf-8")
        ),
        "route_count": len(routes),
        "terminal_route_count": summary["terminal_route_count"],
        "all_routes_terminal": all_routes_terminal,
        "resolved_exact_documents": len(resolved_documents),
        "resolved_owner_charter_numbers": len(resolved_owner_documents),
        "magnolia_nonprofit_identifier_grade_resolution": nonprofit_confirmed,
        "magnolia_llc_detail_rejects_exact_fei": llc_detail_rejects_fei,
        "public_schoolhouse_identity_admitted": False,
        "negative_existence_claim_created": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "registered_agent_name_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "document_image_rows_retained": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_json(output / "input-denominator.json", input_denominator)
    write_json(output / "search-form-receipt.json", form_receipt)
    write_jsonl(output / "source-routes.jsonl", routes)
    write_jsonl(output / "corporate-records.jsonl", records)
    write_json(output / "cross-registry-adjudication.json", adjudication)
    write_json(output / "summary.json", summary)
    write_json(output / "acquisition-receipt.json", receipt)
    build_manifest(output)
    print(json.dumps(summary, sort_keys=True), flush=True)

    if len(denominator) != 17 or len(owner_documents) != 15:
        return 2
    if len(routes) != 17 or not all_routes_terminal:
        return 3
    if not nonprofit_confirmed or not llc_detail_rejects_fei:
        return 4
    if len(resolved_owner_documents) < 12:
        return 5
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
