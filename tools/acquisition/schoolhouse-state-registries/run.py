#!/usr/bin/env python3
"""Acquire a bounded School.House state-registry candidate set.

The completed IRS pass left the public School.House brand without an admitted
legal entity or EIN. This runner advances the exact next transition without
turning a name match into an identity join:

* bounded Florida Sunbiz entity-name and FEI searches;
* bounded Florida Sunbiz fictitious-name searches;
* bounded Florida FDACS Check-A-Charity searches;
* official Florida bulk-data metadata custody; and
* North Carolina business and charity access-policy custody.

North Carolina's public interactive search pages expressly prohibit automated
or scripted searches. This runner therefore records that boundary and does not
circumvent it. It preserves no street addresses, contact details, officer
names, private records, or private messages. Any match remains a registry
candidate only.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

USER_AGENT = (
    "CliffordNumber-SchoolHouse-State-Registry/1.0 "
    "219768509+BigBirdReturns@users.noreply.github.com"
)

PUBLIC_NAME = "School.House"
PUBLIC_FOUNDED_YEAR = 2023
PUBLIC_LOCATION_CLAIMS = ["Tampa Bay", "Fayetteville"]

NAME_QUERIES = [
    "SCHOOLHOUSE",
    "SCHOOL HOUSE",
    "SCHOOL.HOUSE",
    "SCHOOLHOUSE 1776",
    "SCHOOL HOUSE 1776",
]

IRS_CANDIDATE_EINS = [
    "392087548",
    "392669585",
    "412488892",
    "414418282",
    "994246029",
]

SUNBIZ_CORPORATION_SEARCH = (
    "https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults"
)
SUNBIZ_FICTITIOUS_FORM = "https://dos.sunbiz.org/ficinam.html"
FDACS_CHARITY_SEARCH = (
    "https://csapp.fdacs.gov/CSPublicApp/CheckACharity/CheckACharity.aspx"
)

METADATA_ROUTES = [
    {
        "route_id": "fl-sunbiz-quarterly-data-metadata",
        "jurisdiction": "Florida",
        "source_family": "fl_sunbiz_bulk_metadata",
        "url": "https://dos.fl.gov/sunbiz/other-services/data-downloads/quarterly-data/",
        "terminal_state": "captured_metadata",
    },
    {
        "route_id": "fl-sunbiz-corporate-file-definitions",
        "jurisdiction": "Florida",
        "source_family": "fl_sunbiz_bulk_metadata",
        "url": "https://dos.sunbiz.org/data-definitions/cor.html",
        "terminal_state": "captured_metadata",
    },
    {
        "route_id": "nc-sos-business-search-policy",
        "jurisdiction": "North Carolina",
        "source_family": "nc_sos_business_registry_policy",
        "url": "https://www.sosnc.gov/online_services/search/Business_Registration_Results",
        "terminal_state": "automation_not_permitted",
        "required_phrase": "Automated or scripted searches",
    },
    {
        "route_id": "nc-sos-charity-search-policy",
        "jurisdiction": "North Carolina",
        "source_family": "nc_sos_charity_registry_policy",
        "url": "https://www.sosnc.gov/online_services/search/Charities_Results",
        "terminal_state": "automation_not_permitted",
        "required_phrase": "Automated or scripted searches",
    },
    {
        "route_id": "nc-sos-data-subscription-metadata",
        "jurisdiction": "North Carolina",
        "source_family": "nc_sos_bulk_data_metadata",
        "url": "https://www.sosnc.gov/online_services/data_subscriptions/uniform_commercial_about_the_data",
        "terminal_state": "captured_metadata",
    },
    {
        "route_id": "nc-sos-reports-listings-metadata",
        "jurisdiction": "North Carolina",
        "source_family": "nc_sos_reports_metadata",
        "url": "https://www.sosnc.gov/divisions/business_registration/reports_and_listings",
        "terminal_state": "captured_metadata",
    },
]

TERMINAL_ROUTE_STATES = {
    "automation_not_permitted",
    "captured_and_parsed",
    "captured_metadata",
    "captured_no_candidates",
    "form_discovery_only",
    "source_unavailable_after_search",
}

FORBIDDEN_CANDIDATE_KEY_FRAGMENTS = {
    "address",
    "email",
    "phone",
    "contact",
    "officer_name",
    "registered_agent_name",
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


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compact(value: Any) -> str:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )


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


def candidate_id(prefix: str, *parts: Any) -> str:
    payload = "\x1f".join(normalize_space(part) for part in parts)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]
    return f"{prefix}-{digest}"


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
        timeout: int = 120,
        referer: str | None = None,
    ) -> FetchResponse:
        encoded = None
        if form is not None:
            encoded = urllib.parse.urlencode(form).encode("utf-8")
        last_error: str | None = None
        last_body = b""
        last_status: int | None = None
        last_headers: dict[str, str] = {}
        final_url = url
        for attempt in range(1, self.retries + 1):
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/json,text/plain,*/*",
                "Accept-Encoding": "identity",
                "Connection": "close",
            }
            if referer:
                headers["Referer"] = referer
            request = urllib.request.Request(
                url,
                data=encoded,
                headers=headers,
                method=method,
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
                final_url = exc.geturl()
                last_error = f"HTTPError: {exc.code} {exc.reason}"
                retryable = exc.code in {408, 425, 429, 500, 502, 503, 504}
                if not retryable:
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

    def handle_data(self, data: str) -> None:
        text = normalize_space(data)
        if text:
            self.parts.append(text)

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag.lower() in {"br", "p", "div", "tr", "li", "h1", "h2", "h3"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"p", "div", "tr", "li", "h1", "h2", "h3"}:
            self.parts.append("\n")


def html_text(body: bytes) -> str:
    parser = TextParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    text = " ".join(parser.parts)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[dict[str, Any]]] = []
        self.current_row: list[dict[str, Any]] | None = None
        self.current_cell: dict[str, Any] | None = None
        self.current_link: dict[str, str] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        tag = tag.lower()
        attr = {key.lower(): value or "" for key, value in attrs}
        if tag == "tr":
            self.current_row = []
        elif tag in {"td", "th"} and self.current_row is not None:
            self.current_cell = {"parts": [], "links": []}
        elif tag == "a" and self.current_cell is not None:
            self.current_link = {"href": attr.get("href", ""), "parts": []}
        elif tag == "br" and self.current_cell is not None:
            self.current_cell["parts"].append(" ")

    def handle_data(self, data: str) -> None:
        if self.current_cell is not None:
            self.current_cell["parts"].append(data)
        if self.current_link is not None:
            self.current_link["parts"].append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "a" and self.current_link is not None:
            self.current_link["text"] = normalize_space(
                "".join(self.current_link.pop("parts"))
            )
            if self.current_cell is not None:
                self.current_cell["links"].append(self.current_link)
            self.current_link = None
        elif tag in {"td", "th"} and self.current_cell is not None:
            cell = {
                "text": normalize_space("".join(self.current_cell["parts"])),
                "links": self.current_cell["links"],
            }
            if self.current_row is not None:
                self.current_row.append(cell)
            self.current_cell = None
        elif tag == "tr" and self.current_row is not None:
            if any(cell.get("text") or cell.get("links") for cell in self.current_row):
                self.rows.append(self.current_row)
            self.current_row = None


class FormParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.forms: list[dict[str, Any]] = []
        self.current: dict[str, Any] | None = None
        self.current_button: dict[str, str] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        tag = tag.lower()
        attr = {key.lower(): value or "" for key, value in attrs}
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
            self.current_button = {
                "name": attr.get("name", ""),
                "id": attr.get("id", ""),
                "type": attr.get("type", "submit").lower(),
                "value": attr.get("value", ""),
                "text": "",
            }

    def handle_data(self, data: str) -> None:
        if self.current_button is not None:
            self.current_button["text"] += data

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "button" and self.current_button is not None:
            self.current_button["text"] = normalize_space(
                self.current_button["text"]
            )
            if self.current is not None:
                self.current["buttons"].append(self.current_button)
            self.current_button = None
        elif tag == "form" and self.current is not None:
            self.forms.append(self.current)
            self.current = None


def parse_tables(body: bytes) -> list[list[dict[str, Any]]]:
    parser = TableParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    return parser.rows


def parse_forms(body: bytes) -> list[dict[str, Any]]:
    parser = FormParser()
    parser.feed(body.decode("utf-8", errors="replace"))
    return parser.forms


def route_base(
    *,
    route_id: str,
    source_family: str,
    jurisdiction: str,
    url: str,
    query_type: str,
    query: str | None,
) -> dict[str, Any]:
    return {
        "route_id": route_id,
        "source_family": source_family,
        "jurisdiction": jurisdiction,
        "query_type": query_type,
        "query": query,
        "requested_url": url,
        "retrieved_at": utc_now(),
        "state": "not_attempted",
        "raw_source_retained": False,
        "street_address_retained": False,
        "contact_details_retained": False,
        "officer_names_retained": False,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def apply_response_receipt(route: dict[str, Any], response: FetchResponse) -> None:
    route.update(
        {
            "http_status": response.status,
            "response_bytes": len(response.body),
            "response_sha256": sha256_bytes(response.body),
            "content_type": response.headers.get("content-type"),
            "attempts": response.attempts,
            "final_url": response.final_url,
        }
    )
    if response.error:
        route["error"] = response.error


def document_number(text: str) -> str | None:
    matches = re.findall(r"\b[A-Z][A-Z0-9]{5,15}\b", text.upper())
    for match in matches:
        if any(char.isdigit() for char in match) and len(match) >= 7:
            return match
    return None


def status_from_cells(cells: list[str]) -> str | None:
    for cell in cells:
        value = normalize_space(cell).upper()
        if value in {"ACTIVE", "INACTIVE", "A", "I"}:
            return value
    return None


def extract_sunbiz_list_candidates(
    body: bytes,
    *,
    route: dict[str, Any],
) -> list[dict[str, Any]]:
    text = html_text(body)
    if "Filing Information" in text and "Document Number" in text:
        detail = parse_sunbiz_detail(body, route["final_url"])
        if detail:
            detail.update(
                {
                    "candidate_id": candidate_id(
                        "fl-registry",
                        route["route_id"],
                        detail.get("document_number"),
                        detail.get("legal_name"),
                    ),
                    "route_id": route["route_id"],
                    "source_family": route["source_family"],
                    "jurisdiction": "Florida",
                    "query_type": route["query_type"],
                    "query": route["query"],
                    "identity_state": "registry_candidate_not_admitted",
                    "street_address_retained": False,
                    "contact_details_retained": False,
                    "officer_names_retained": False,
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )
            return [detail]

    candidates: list[dict[str, Any]] = []
    for row_index, row in enumerate(parse_tables(body), start=1):
        cells = [normalize_space(cell["text"]) for cell in row]
        links = [link for cell in row for link in cell.get("links", [])]
        detail_link = next(
            (
                link
                for link in links
                if "SearchResultDetail" in link.get("href", "")
            ),
            None,
        )
        if not detail_link:
            continue
        name = normalize_space(detail_link.get("text")) or (cells[0] if cells else "")
        if not name:
            continue
        joined = " | ".join(cells)
        doc = document_number(joined + " " + detail_link.get("href", ""))
        detail_url = urllib.parse.urljoin(route["final_url"], detail_link["href"])
        candidates.append(
            {
                "candidate_id": candidate_id(
                    "fl-registry", route["route_id"], doc, name, row_index
                ),
                "route_id": route["route_id"],
                "source_family": route["source_family"],
                "jurisdiction": "Florida",
                "query_type": route["query_type"],
                "query": route["query"],
                "legal_name": name,
                "normalized_name": normalize_name(name),
                "document_number": doc,
                "registration_number": None,
                "status": status_from_cells(cells),
                "filing_type": None,
                "date_filed": None,
                "fei_ein": None,
                "principal_city": None,
                "principal_state": None,
                "officer_count": None,
                "detail_url": detail_url,
                "source_row_index": row_index,
                "identity_state": "registry_candidate_not_admitted",
                "street_address_retained": False,
                "contact_details_retained": False,
                "officer_names_retained": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return candidates


def line_after(text: str, label: str) -> str | None:
    match = re.search(
        rf"(?:^|\n){re.escape(label)}\s+([^\n]+)", text, flags=re.IGNORECASE
    )
    return normalize_space(match.group(1)) if match else None


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


def city_state_from_principal(text: str) -> tuple[str | None, str | None]:
    lines = section_lines(
        text,
        "Principal Address",
        [
            "Mailing Address",
            "Registered Agent Name & Address",
            "Officer/Director Detail",
            "Authorized Person(s) Detail",
            "Annual Reports",
        ],
    )
    for line in reversed(lines):
        match = re.search(
            r"^(.+?),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?(?:\s+.*)?$",
            line.upper(),
        )
        if match:
            return normalize_space(match.group(1)), match.group(2)
    return None, None


def parse_sunbiz_detail(body: bytes, source_url: str) -> dict[str, Any] | None:
    text = html_text(body)
    if "Filing Information" not in text:
        return None
    lines = [normalize_space(line) for line in text.splitlines() if normalize_space(line)]
    filing_index = next(
        (index for index, line in enumerate(lines) if line == "Filing Information"),
        None,
    )
    legal_name = None
    filing_type = None
    if filing_index is not None:
        preceding = [
            line
            for line in lines[max(0, filing_index - 5) : filing_index]
            if not line.lower().startswith("detail by")
        ]
        if preceding:
            legal_name = preceding[-1]
        if len(preceding) >= 2:
            filing_type = preceding[-2]
    joined = "\n".join(lines)
    doc_match = re.search(r"Document Number\s+([A-Z0-9]+)", joined, re.I)
    fei_match = re.search(r"FEI/EIN Number\s+([A-Z0-9\-]+)", joined, re.I)
    date_match = re.search(r"Date Filed\s+([0-9/\-]+)", joined, re.I)
    state_match = re.search(r"\bState\s+([A-Z]{2})\b", joined, re.I)
    status_match = re.search(r"\bStatus\s+([A-Z /-]+?)(?:\s+Last Event|\n|$)", joined, re.I)
    city, state = city_state_from_principal(joined)
    officer_section = section_lines(
        joined,
        "Officer/Director Detail Name & Address",
        ["Annual Reports", "Document Images"],
    )
    if not officer_section:
        officer_section = section_lines(
            joined,
            "Authorized Person(s) Detail Name & Address",
            ["Annual Reports", "Document Images"],
        )
    officer_count = sum(1 for line in officer_section if line.startswith("Title"))
    return {
        "legal_name": legal_name,
        "normalized_name": normalize_name(legal_name),
        "document_number": doc_match.group(1) if doc_match else None,
        "registration_number": None,
        "status": normalize_space(status_match.group(1)) if status_match else None,
        "filing_type": filing_type,
        "date_filed": date_match.group(1) if date_match else None,
        "fei_ein": normalize_ein(fei_match.group(1)) if fei_match else None,
        "principal_city": city,
        "principal_state": state or (state_match.group(1).upper() if state_match else None),
        "officer_count": officer_count,
        "detail_url": source_url,
    }


def merge_candidate_detail(
    candidate: dict[str, Any], detail: dict[str, Any]
) -> dict[str, Any]:
    merged = dict(candidate)
    for key, value in detail.items():
        if value is not None and (merged.get(key) is None or key in {"legal_name", "normalized_name"}):
            merged[key] = value
    return merged


def select_form(forms: list[dict[str, Any]], preferred_fragments: list[str]) -> dict[str, Any] | None:
    scored: list[tuple[int, dict[str, Any]]] = []
    for form in forms:
        score = 0
        for item in form.get("inputs", []):
            haystack = f"{item.get('name', '')} {item.get('id', '')}".lower()
            if item.get("type") in {"text", "search", ""}:
                score += 1
            if any(fragment.lower() in haystack for fragment in preferred_fragments):
                score += 10
        if score:
            scored.append((score, form))
    return max(scored, key=lambda item: item[0])[1] if scored else None


def build_form_payload(
    form: dict[str, Any], query: str, preferred_fragments: list[str]
) -> tuple[dict[str, str], str | None]:
    payload: dict[str, str] = {}
    query_field: str | None = None
    text_inputs = []
    for item in form.get("inputs", []):
        name = item.get("name") or ""
        if not name:
            continue
        input_type = (item.get("type") or "text").lower()
        if input_type == "hidden":
            payload[name] = item.get("value") or ""
        elif input_type in {"text", "search", ""}:
            text_inputs.append(item)
    for item in text_inputs:
        haystack = f"{item.get('name', '')} {item.get('id', '')}".lower()
        if any(fragment.lower() in haystack for fragment in preferred_fragments):
            query_field = item.get("name")
            break
    if query_field is None and text_inputs:
        query_field = text_inputs[0].get("name")
    if query_field:
        payload[query_field] = query
    submit_added = False
    for item in form.get("inputs", []):
        if (item.get("type") or "").lower() in {"submit", "button"}:
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
            if name and ("search" in value.lower() or not submit_added):
                payload[name] = value
                submit_added = True
                if "search" in value.lower():
                    break
    return payload, query_field


def extract_generic_name_candidates(
    body: bytes,
    *,
    route: dict[str, Any],
    prefix: str,
) -> list[dict[str, Any]]:
    query_norm = normalize_name(route.get("query"))
    query_tokens = [token for token in query_norm.split() if token]
    candidates: list[dict[str, Any]] = []
    for row_index, row in enumerate(parse_tables(body), start=1):
        cells = [normalize_space(cell["text"]) for cell in row]
        nonempty = [cell for cell in cells if cell]
        if not nonempty:
            continue
        row_norm = normalize_name(" ".join(nonempty))
        if query_tokens and not all(token in row_norm for token in query_tokens[:2]):
            continue
        links = [link for cell in row for link in cell.get("links", [])]
        candidate_name = next(
            (
                normalize_space(link.get("text"))
                for link in links
                if normalize_space(link.get("text"))
                and any(token in normalize_name(link.get("text")) for token in query_tokens)
            ),
            None,
        )
        if not candidate_name:
            candidate_name = next(
                (
                    cell
                    for cell in nonempty
                    if any(token in normalize_name(cell) for token in query_tokens)
                ),
                nonempty[0],
            )
        detail_link = next(
            (link.get("href") for link in links if link.get("href")), None
        )
        joined = " | ".join(nonempty)
        reg = document_number(joined)
        candidates.append(
            {
                "candidate_id": candidate_id(
                    prefix, route["route_id"], reg, candidate_name, row_index
                ),
                "route_id": route["route_id"],
                "source_family": route["source_family"],
                "jurisdiction": route["jurisdiction"],
                "query_type": route["query_type"],
                "query": route["query"],
                "legal_name": candidate_name,
                "normalized_name": normalize_name(candidate_name),
                "document_number": None,
                "registration_number": reg,
                "status": status_from_cells(nonempty),
                "filing_type": None,
                "date_filed": None,
                "fei_ein": None,
                "principal_city": None,
                "principal_state": None,
                "officer_count": None,
                "detail_url": (
                    urllib.parse.urljoin(route["final_url"], detail_link)
                    if detail_link
                    else None
                ),
                "source_row_index": row_index,
                "identity_state": "registry_candidate_not_admitted",
                "street_address_retained": False,
                "contact_details_retained": False,
                "officer_names_retained": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )
    return candidates


def validate_candidate(candidate: dict[str, Any]) -> None:
    for key in candidate:
        lower = key.lower()
        if any(fragment in lower for fragment in FORBIDDEN_CANDIDATE_KEY_FRAGMENTS):
            if key not in {
                "street_address_retained",
                "contact_details_retained",
                "officer_names_retained",
            }:
                raise RuntimeError(f"forbidden candidate field retained: {key}")
    if candidate.get("street_address_retained") is not False:
        raise RuntimeError("street-address retention boundary failed")
    if candidate.get("contact_details_retained") is not False:
        raise RuntimeError("contact-detail retention boundary failed")
    if candidate.get("officer_names_retained") is not False:
        raise RuntimeError("officer-name retention boundary failed")


def fetch_metadata_routes(
    fetcher: Fetcher,
    routes: list[dict[str, Any]],
) -> None:
    for spec in METADATA_ROUTES:
        route = route_base(
            route_id=spec["route_id"],
            source_family=spec["source_family"],
            jurisdiction=spec["jurisdiction"],
            url=spec["url"],
            query_type="metadata_or_policy",
            query=None,
        )
        print(f"acquiring metadata {route['route_id']}", flush=True)
        response = fetcher.request(spec["url"])
        apply_response_receipt(route, response)
        if response.ok:
            text = html_text(response.body)
            required = spec.get("required_phrase")
            if required and required.lower() not in text.lower():
                route["state"] = "captured_metadata"
                route["policy_phrase_detected"] = False
                route["intended_terminal_state"] = spec["terminal_state"]
            else:
                route["state"] = spec["terminal_state"]
                route["policy_phrase_detected"] = bool(required)
            route["candidate_rows"] = 0
            route["text_excerpt_sha256"] = sha256_bytes(
                normalize_space(text)[:4000].encode("utf-8")
            )
        else:
            route["state"] = "source_unavailable_after_search"
            route["candidate_rows"] = 0
        routes.append(route)


def acquire_sunbiz_corporations(
    fetcher: Fetcher,
    routes: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    for query in NAME_QUERIES:
        url = (
            f"{SUNBIZ_CORPORATION_SEARCH}?"
            + urllib.parse.urlencode(
                {"inquiryType": "EntityName", "searchTerm": query}
            )
        )
        route = route_base(
            route_id=candidate_id("route-fl-corp-name", query),
            source_family="fl_sunbiz_corporation",
            jurisdiction="Florida",
            url=url,
            query_type="entity_name",
            query=query,
        )
        print(f"searching Florida corporations by name: {query}", flush=True)
        response = fetcher.request(url)
        apply_response_receipt(route, response)
        route_candidates: list[dict[str, Any]] = []
        if response.ok:
            route_candidates = extract_sunbiz_list_candidates(response.body, route=route)
            route["state"] = (
                "captured_and_parsed" if route_candidates else "captured_no_candidates"
            )
        else:
            route["state"] = "source_unavailable_after_search"
        route["candidate_rows"] = len(route_candidates)
        routes.append(route)
        candidates.extend(route_candidates)

    for ein in IRS_CANDIDATE_EINS:
        url = (
            f"{SUNBIZ_CORPORATION_SEARCH}?"
            + urllib.parse.urlencode(
                {"inquiryType": "FeiNumber", "searchTerm": ein}
            )
        )
        route = route_base(
            route_id=candidate_id("route-fl-corp-fei", ein),
            source_family="fl_sunbiz_corporation",
            jurisdiction="Florida",
            url=url,
            query_type="fei_ein",
            query=ein,
        )
        print(f"searching Florida corporations by FEI: {ein}", flush=True)
        response = fetcher.request(url)
        apply_response_receipt(route, response)
        route_candidates = []
        if response.ok:
            route_candidates = extract_sunbiz_list_candidates(response.body, route=route)
            for candidate in route_candidates:
                if not candidate.get("fei_ein"):
                    candidate["fei_ein"] = ein
                    candidate["fei_match_basis"] = "query_key_only_pending_detail"
            route["state"] = (
                "captured_and_parsed" if route_candidates else "captured_no_candidates"
            )
        else:
            route["state"] = "source_unavailable_after_search"
        route["candidate_rows"] = len(route_candidates)
        routes.append(route)
        candidates.extend(route_candidates)


def enrich_sunbiz_details(
    fetcher: Fetcher,
    candidates: list[dict[str, Any]],
    *,
    max_details: int,
) -> None:
    seen_urls: set[str] = set()
    enriched = 0
    for index, candidate in enumerate(list(candidates)):
        if enriched >= max_details:
            break
        if candidate.get("source_family") != "fl_sunbiz_corporation":
            continue
        url = candidate.get("detail_url")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        response = fetcher.request(url, referer=candidate.get("detail_url"))
        candidate["detail_http_status"] = response.status
        candidate["detail_response_bytes"] = len(response.body)
        candidate["detail_response_sha256"] = sha256_bytes(response.body)
        if response.ok:
            detail = parse_sunbiz_detail(response.body, response.final_url)
            if detail:
                candidates[index] = merge_candidate_detail(candidate, detail)
                candidates[index]["detail_state"] = "captured_and_parsed"
            else:
                candidate["detail_state"] = "captured_unparsed"
        else:
            candidate["detail_state"] = "source_unavailable_after_search"
            candidate["detail_error"] = response.error
        enriched += 1


def acquire_fictitious_names(
    fetcher: Fetcher,
    routes: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    form_response = fetcher.request(SUNBIZ_FICTITIOUS_FORM)
    form = None
    if form_response.ok:
        form = select_form(parse_forms(form_response.body), ["name", "fictitious"])
    for query in NAME_QUERIES:
        route = route_base(
            route_id=candidate_id("route-fl-fictitious", query),
            source_family="fl_sunbiz_fictitious_name",
            jurisdiction="Florida",
            url=SUNBIZ_FICTITIOUS_FORM,
            query_type="fictitious_name",
            query=query,
        )
        route_candidates: list[dict[str, Any]] = []
        response: FetchResponse | None = None
        if form:
            payload, query_field = build_form_payload(
                form, query, ["name", "fictitious"]
            )
            action = urllib.parse.urljoin(
                SUNBIZ_FICTITIOUS_FORM, form.get("action") or SUNBIZ_FICTITIOUS_FORM
            )
            route["form_action"] = action
            route["form_method"] = form.get("method")
            route["query_field_resolved"] = bool(query_field)
            if query_field:
                response = fetcher.request(
                    action,
                    method=form.get("method") or "POST",
                    form=payload,
                    referer=SUNBIZ_FICTITIOUS_FORM,
                )
        if response is None or not response.ok:
            fallback_url = (
                "https://dos.sunbiz.org/scripts/ficiname.exe?"
                + urllib.parse.urlencode({"action": "Search", "name": query})
            )
            fallback_response = fetcher.request(
                fallback_url, referer=SUNBIZ_FICTITIOUS_FORM
            )
            if response is None or fallback_response.ok:
                response = fallback_response
                route["requested_url"] = fallback_url
        if response is not None:
            apply_response_receipt(route, response)
            if response.ok:
                route_candidates = extract_generic_name_candidates(
                    response.body, route=route, prefix="fl-fictitious"
                )
                route["state"] = (
                    "captured_and_parsed"
                    if route_candidates
                    else "captured_no_candidates"
                )
            else:
                route["state"] = "source_unavailable_after_search"
        else:
            route["state"] = "form_discovery_only"
            route["form_count"] = len(parse_forms(form_response.body)) if form_response.ok else 0
        route["candidate_rows"] = len(route_candidates)
        routes.append(route)
        candidates.extend(route_candidates)


def acquire_fdacs_charities(
    fetcher: Fetcher,
    routes: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    get_response = fetcher.request(FDACS_CHARITY_SEARCH)
    forms = parse_forms(get_response.body) if get_response.ok else []
    form = select_form(forms, ["business", "charity", "organization"])
    for query in NAME_QUERIES:
        route = route_base(
            route_id=candidate_id("route-fl-charity", query),
            source_family="fl_fdacs_charity_registry",
            jurisdiction="Florida",
            url=FDACS_CHARITY_SEARCH,
            query_type="organization_name",
            query=query,
        )
        route["form_count"] = len(forms)
        route_candidates: list[dict[str, Any]] = []
        if not get_response.ok:
            apply_response_receipt(route, get_response)
            route["state"] = "source_unavailable_after_search"
        elif not form:
            apply_response_receipt(route, get_response)
            route["state"] = "form_discovery_only"
        else:
            payload, query_field = build_form_payload(
                form, query, ["business", "charity", "organization"]
            )
            action = urllib.parse.urljoin(
                FDACS_CHARITY_SEARCH, form.get("action") or FDACS_CHARITY_SEARCH
            )
            route["form_action"] = action
            route["form_method"] = form.get("method")
            route["query_field_resolved"] = bool(query_field)
            if not query_field:
                apply_response_receipt(route, get_response)
                route["state"] = "form_discovery_only"
            else:
                response = fetcher.request(
                    action,
                    method=form.get("method") or "POST",
                    form=payload,
                    referer=FDACS_CHARITY_SEARCH,
                )
                apply_response_receipt(route, response)
                if response.ok:
                    route_candidates = extract_generic_name_candidates(
                        response.body, route=route, prefix="fl-charity"
                    )
                    route["state"] = (
                        "captured_and_parsed"
                        if route_candidates
                        else "captured_no_candidates"
                    )
                else:
                    route["state"] = "source_unavailable_after_search"
        route["candidate_rows"] = len(route_candidates)
        routes.append(route)
        candidates.extend(route_candidates)


def dedupe_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[tuple[Any, ...], dict[str, Any]] = {}
    for candidate in candidates:
        key = (
            candidate.get("source_family"),
            candidate.get("document_number")
            or candidate.get("registration_number")
            or candidate.get("detail_url")
            or candidate.get("candidate_id"),
            candidate.get("normalized_name"),
        )
        if key not in merged:
            merged[key] = candidate
            merged[key]["supporting_route_ids"] = [candidate["route_id"]]
        else:
            existing = merged[key]
            if candidate["route_id"] not in existing["supporting_route_ids"]:
                existing["supporting_route_ids"].append(candidate["route_id"])
            for field, value in candidate.items():
                if existing.get(field) is None and value is not None:
                    existing[field] = value
    result = list(merged.values())
    result.sort(
        key=lambda row: (
            row.get("source_family") or "",
            row.get("normalized_name") or "",
            row.get("document_number") or row.get("registration_number") or "",
        )
    )
    for candidate in result:
        candidate["supporting_route_ids"].sort()
        validate_candidate(candidate)
    return result


def build_manifest(output: Path) -> None:
    rows = []
    for file in sorted(output.rglob("*")):
        if not file.is_file() or file.name in {"artifact-manifest.json", "SHA256SUMS"}:
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
            "schema_version": "schoolhouse-state-registry-artifact-manifest@1",
            "generated_at": utc_now(),
            "files": rows,
            "file_count": len(rows),
            "raw_source_files_retained": 0,
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "private_support_rows": 0,
            "outside_human_dependency": False,
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
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--sleep-seconds", type=float, default=0.35)
    parser.add_argument("--max-detail-pages", type=int, default=30)
    parser.add_argument(
        "--user-agent",
        default=os.environ.get("STATE_REGISTRY_USER_AGENT", USER_AGENT),
    )
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    started_at = utc_now()
    fetcher = Fetcher(args.user_agent, args.retries, args.sleep_seconds)
    routes: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    acquire_sunbiz_corporations(fetcher, routes, candidates)
    enrich_sunbiz_details(
        fetcher, candidates, max_details=max(0, args.max_detail_pages)
    )
    acquire_fictitious_names(fetcher, routes, candidates)
    acquire_fdacs_charities(fetcher, routes, candidates)
    fetch_metadata_routes(fetcher, routes)

    candidates = dedupe_candidates(candidates)
    route_states = Counter(route["state"] for route in routes)
    source_counts = Counter(candidate["source_family"] for candidate in candidates)
    exact_public_names = {
        "SCHOOLHOUSE",
        "SCHOOL HOUSE",
        "SCHOOLHOUSE 1776",
        "SCHOOL HOUSE 1776",
    }
    exact_name_candidates = [
        candidate
        for candidate in candidates
        if candidate.get("normalized_name") in exact_public_names
    ]
    exact_ein_candidates = [
        candidate
        for candidate in candidates
        if candidate.get("fei_ein") in set(IRS_CANDIDATE_EINS)
    ]
    post_2023_candidates = [
        candidate
        for candidate in candidates
        if str(candidate.get("date_filed") or "").endswith(("2023", "2024", "2025", "2026"))
        or str(candidate.get("date_filed") or "").startswith(("2023", "2024", "2025", "2026"))
    ]

    all_routes_terminal = all(
        route.get("state") in TERMINAL_ROUTE_STATES for route in routes
    )
    florida_query_routes = [
        route
        for route in routes
        if route["jurisdiction"] == "Florida"
        and route["query_type"] != "metadata_or_policy"
    ]
    florida_captured_routes = [
        route
        for route in florida_query_routes
        if route["state"]
        in {"captured_and_parsed", "captured_no_candidates", "form_discovery_only"}
    ]

    adjudication = {
        "schema_version": "schoolhouse-state-registry-adjudication@1",
        "as_of": utc_now(),
        "public_source_claims_used_for_adjudication": {
            "public_name": PUBLIC_NAME,
            "organization_type_claim": "501(c)(3) nonprofit / public charity",
            "founded_claim": PUBLIC_FOUNDED_YEAR,
            "location_claims": PUBLIC_LOCATION_CLAIMS,
            "boundary": "A registry name, public brand, founding-year claim, or broad location alone does not establish legal identity.",
        },
        "route_denominator": {
            "declared_routes": len(routes),
            "terminal_routes": sum(
                1 for route in routes if route["state"] in TERMINAL_ROUTE_STATES
            ),
            "route_state_counts": dict(sorted(route_states.items())),
            "florida_query_routes": len(florida_query_routes),
            "florida_captured_routes": len(florida_captured_routes),
            "north_carolina_automated_queries_executed": 0,
        },
        "candidate_denominator": {
            "candidate_rows": len(candidates),
            "source_family_counts": dict(sorted(source_counts.items())),
            "exact_public_name_candidate_rows": len(exact_name_candidates),
            "irs_ein_query_candidate_rows": len(exact_ein_candidates),
            "post_2023_candidate_rows": len(post_2023_candidates),
        },
        "exact_public_name_candidates": [
            {
                "candidate_id": candidate["candidate_id"],
                "source_family": candidate["source_family"],
                "legal_name": candidate.get("legal_name"),
                "document_number": candidate.get("document_number"),
                "registration_number": candidate.get("registration_number"),
                "status": candidate.get("status"),
                "date_filed": candidate.get("date_filed"),
                "fei_ein": candidate.get("fei_ein"),
                "principal_city": candidate.get("principal_city"),
                "principal_state": candidate.get("principal_state"),
                "disposition": "candidate_not_admitted_pending_cross_registry_identity_test",
            }
            for candidate in exact_name_candidates
        ],
        "irs_ein_query_candidates": [
            {
                "candidate_id": candidate["candidate_id"],
                "source_family": candidate["source_family"],
                "legal_name": candidate.get("legal_name"),
                "document_number": candidate.get("document_number"),
                "status": candidate.get("status"),
                "date_filed": candidate.get("date_filed"),
                "fei_ein": candidate.get("fei_ein"),
                "principal_city": candidate.get("principal_city"),
                "principal_state": candidate.get("principal_state"),
                "disposition": "candidate_not_admitted_pending_name_timeline_location_alignment",
            }
            for candidate in exact_ein_candidates
        ],
        "north_carolina_boundary": {
            "automated_queries_executed": 0,
            "reason": "The official North Carolina business and charity search pages state that automated or scripted searches are not permitted. The runner preserves that access-policy state and does not circumvent it.",
            "next_lawful_surfaces": [
                "official downloadable reports and listings",
                "official data-subscription metadata and any credential-free public extract",
                "distinct official filings or indexed record pages",
            ],
        },
        "identity_decision": {
            "state": "registry_candidates_not_admitted",
            "admitted_legal_name": None,
            "admitted_ein": None,
            "reason": "This acquisition stage preserves state-registry candidates and access-policy custody only. Admission requires an identifier-grade cross-registry match across legal name or DBA, EIN where present, formation date, location, and the public School.House brand.",
            "negative_existence_claim_created": False,
        },
        "privacy": {
            "street_address_rows_retained": 0,
            "contact_detail_rows_retained": 0,
            "officer_name_rows_retained": 0,
            "private_support_rows": 0,
        },
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    summary = {
        "schema_version": "schoolhouse-state-registry-summary@1",
        "started_at": started_at,
        "completed_at": utc_now(),
        "route_count": len(routes),
        "terminal_route_count": sum(
            1 for route in routes if route["state"] in TERMINAL_ROUTE_STATES
        ),
        "all_routes_terminal": all_routes_terminal,
        "route_state_counts": dict(sorted(route_states.items())),
        "florida_query_route_count": len(florida_query_routes),
        "florida_captured_route_count": len(florida_captured_routes),
        "north_carolina_automated_queries_executed": 0,
        "candidate_rows": len(candidates),
        "source_family_candidate_counts": dict(sorted(source_counts.items())),
        "exact_public_name_candidate_rows": len(exact_name_candidates),
        "irs_ein_query_candidate_rows": len(exact_ein_candidates),
        "registry_identity_admitted": False,
        "negative_existence_claim_created": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "officer_name_rows_retained": 0,
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
        "schema_version": "schoolhouse-state-registry-acquisition-receipt@1",
        "generated_at": utc_now(),
        "route_count": len(routes),
        "terminal_route_count": summary["terminal_route_count"],
        "all_routes_terminal": all_routes_terminal,
        "candidate_rows": len(candidates),
        "registry_identity_admitted": False,
        "negative_existence_claim_created": False,
        "north_carolina_automation_boundary_respected": True,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "officer_name_rows_retained": 0,
        "private_support_rows": 0,
        "outside_human_dependency": False,
        "raw_source_files_retained": 0,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }

    write_jsonl(output / "source-routes.jsonl", routes)
    write_jsonl(output / "registry-candidates.jsonl", candidates)
    write_json(output / "adjudication.json", adjudication)
    write_json(output / "summary.json", summary)
    write_json(output / "acquisition-receipt.json", receipt)
    build_manifest(output)

    print(json.dumps(summary, sort_keys=True), flush=True)

    expected_routes = len(NAME_QUERIES) * 3 + len(IRS_CANDIDATE_EINS) + len(METADATA_ROUTES)
    if len(routes) != expected_routes:
        print(
            f"expected {expected_routes} routes, observed {len(routes)}",
            file=sys.stderr,
        )
        return 2
    if not all_routes_terminal:
        print("one or more routes lack terminal custody", file=sys.stderr)
        return 3
    if not florida_captured_routes:
        print("no Florida query route reached a captured terminal state", file=sys.stderr)
        return 4
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
