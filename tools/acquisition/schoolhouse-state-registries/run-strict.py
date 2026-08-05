#!/usr/bin/env python3
"""Strict semantic repair for the School.House state-registry acquisition.

Attempt one established terminal route custody but exposed two parser defects:
Sunbiz FEI searches return ordered result windows rather than exact-only rows,
and generic query matching admitted results that omitted numeric query tokens.
This wrapper keeps the original bounded acquisition and privacy controls while
requiring exact FEI equality, query-complete name matching, typed Sunbiz table
columns, and identifier extraction from official detail links.
"""

from __future__ import annotations

import importlib.util
import re
import urllib.parse
from pathlib import Path
from typing import Any

RUNNER = Path(__file__).with_name("run.py")
SPEC = importlib.util.spec_from_file_location("schoolhouse_state_registry", RUNNER)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"unable to load runner: {RUNNER}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def canonical_name(value: Any) -> str:
    normalized = MODULE.normalize_name(value)
    normalized = re.sub(r"\bSCHOOL\s+HOUSE\b", "SCHOOLHOUSE", normalized)
    return MODULE.normalize_space(normalized)


def query_tokens(value: Any) -> list[str]:
    return [token for token in canonical_name(value).split() if token]


def query_complete_match(name: Any, query: Any) -> bool:
    candidate = canonical_name(name)
    return bool(candidate) and all(token in candidate.split() for token in query_tokens(query))


def result_detail_link(row: list[dict[str, Any]], base_url: str) -> str | None:
    for cell in row:
        for link in cell.get("links", []):
            href = link.get("href") or ""
            if "SearchResultDetail" in href:
                return urllib.parse.urljoin(base_url, href)
    return None


def base_candidate(
    route: dict[str, Any],
    *,
    name: str,
    document_number: str | None,
    registration_number: str | None,
    status: str | None,
    detail_url: str | None,
    row_index: int,
    fei_ein: str | None = None,
) -> dict[str, Any]:
    return {
        "candidate_id": MODULE.candidate_id(
            "fl-registry-strict",
            route["route_id"],
            document_number or registration_number,
            name,
            row_index,
        ),
        "route_id": route["route_id"],
        "source_family": route["source_family"],
        "jurisdiction": route["jurisdiction"],
        "query_type": route["query_type"],
        "query": route["query"],
        "legal_name": MODULE.normalize_space(name),
        "normalized_name": MODULE.normalize_name(name),
        "document_number": document_number,
        "registration_number": registration_number,
        "status": status,
        "filing_type": None,
        "date_filed": None,
        "fei_ein": fei_ein,
        "principal_city": None,
        "principal_state": None,
        "officer_count": None,
        "detail_url": detail_url,
        "source_row_index": row_index,
        "semantic_parser": "strict_typed_table_v2",
        "identity_state": "registry_candidate_not_admitted",
        "street_address_retained": False,
        "contact_details_retained": False,
        "officer_names_retained": False,
        "graph_effect": "none",
        "promotes_to": "candidate_only",
    }


def extract_sunbiz_list_candidates(
    body: bytes,
    *,
    route: dict[str, Any],
) -> list[dict[str, Any]]:
    text = MODULE.html_text(body)
    if "Filing Information" in text and "Document Number" in text:
        detail = MODULE.parse_sunbiz_detail(body, route["final_url"])
        if not detail:
            return []
        if route["query_type"] == "fei_ein":
            if detail.get("fei_ein") != MODULE.normalize_ein(route["query"]):
                return []
        elif not query_complete_match(detail.get("legal_name"), route["query"]):
            return []
        candidate = base_candidate(
            route,
            name=detail.get("legal_name") or "",
            document_number=detail.get("document_number"),
            registration_number=None,
            status=detail.get("status"),
            detail_url=route["final_url"],
            row_index=1,
            fei_ein=detail.get("fei_ein"),
        )
        return [MODULE.merge_candidate_detail(candidate, detail)]

    candidates: list[dict[str, Any]] = []
    for row_index, row in enumerate(MODULE.parse_tables(body), start=1):
        cells = [MODULE.normalize_space(cell.get("text")) for cell in row]
        cells = [cell for cell in cells if cell]
        if len(cells) < 3:
            continue
        detail_url = result_detail_link(row, route["final_url"])
        if not detail_url:
            continue

        if route["query_type"] == "fei_ein":
            # Official FEI table columns: FEI/EIN, Document Number, Corporate Name.
            fei = MODULE.normalize_ein(cells[0])
            exact_query = MODULE.normalize_ein(route["query"])
            if not fei or fei != exact_query:
                continue
            document = MODULE.document_number(cells[1]) or cells[1]
            name = cells[2]
            if not name or name.isdigit():
                continue
            candidates.append(
                base_candidate(
                    route,
                    name=name,
                    document_number=document,
                    registration_number=None,
                    status=None,
                    detail_url=detail_url,
                    row_index=row_index,
                    fei_ein=fei,
                )
            )
            continue

        # Official entity-name table columns: Corporate Name, Document Number, Status.
        name = cells[0]
        document = MODULE.document_number(cells[1]) or cells[1]
        status = cells[2]
        if not query_complete_match(name, route["query"]):
            continue
        candidates.append(
            base_candidate(
                route,
                name=name,
                document_number=document,
                registration_number=None,
                status=status,
                detail_url=detail_url,
                row_index=row_index,
            )
        )
    return candidates


def extract_generic_name_candidates(
    body: bytes,
    *,
    route: dict[str, Any],
    prefix: str,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for row_index, row in enumerate(MODULE.parse_tables(body), start=1):
        cells = [MODULE.normalize_space(cell.get("text")) for cell in row]
        cells = [cell for cell in cells if cell]
        if not cells:
            continue
        links = [link for cell in row for link in cell.get("links", [])]
        detail = next((link for link in links if link.get("href")), None)
        linked_names = [
            MODULE.normalize_space(link.get("text"))
            for link in links
            if MODULE.normalize_space(link.get("text"))
        ]
        possible_names = linked_names + cells
        name = next(
            (value for value in possible_names if query_complete_match(value, route["query"])),
            None,
        )
        if not name:
            continue
        detail_url = (
            urllib.parse.urljoin(route["final_url"], detail.get("href"))
            if detail
            else None
        )
        registration_number = None
        if detail_url:
            parsed = urllib.parse.urlparse(detail_url)
            params = urllib.parse.parse_qs(parsed.query)
            registration_number = MODULE.normalize_space(
                (params.get("docnum") or params.get("rdocnum") or [None])[0]
            ) or None
        if not registration_number:
            registration_number = MODULE.document_number(" | ".join(cells))
        candidate = base_candidate(
            route,
            name=name,
            document_number=None,
            registration_number=registration_number,
            status=MODULE.status_from_cells(cells),
            detail_url=detail_url,
            row_index=row_index,
        )
        candidate["candidate_id"] = MODULE.candidate_id(
            prefix,
            route["route_id"],
            registration_number,
            name,
            row_index,
        )
        candidates.append(candidate)
    return candidates


def search_url(kind: str, term: str) -> str:
    encoded = urllib.parse.quote(term, safe="")
    return (
        "https://search.sunbiz.org/Inquiry/CorporationSearch/"
        f"SearchResults/{kind}/{encoded}/Page1"
    )


def acquire_sunbiz_corporations(
    fetcher: Any,
    routes: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    query_specs = [
        ("entity_name", query, "EntityName", "route-fl-corp-name")
        for query in MODULE.NAME_QUERIES
    ] + [
        ("fei_ein", ein, "FeiNumber", "route-fl-corp-fei")
        for ein in MODULE.IRS_CANDIDATE_EINS
    ]
    for query_type, query, kind, prefix in query_specs:
        url = search_url(kind, query)
        route = MODULE.route_base(
            route_id=MODULE.candidate_id(prefix, query),
            source_family="fl_sunbiz_corporation",
            jurisdiction="Florida",
            url=url,
            query_type=query_type,
            query=query,
        )
        route["transport_variant"] = "typed_path_page1"
        print(f"searching Florida {query_type}: {query}", flush=True)
        response = fetcher.request(url)
        if not response.ok:
            fallback = (
                f"{MODULE.SUNBIZ_CORPORATION_SEARCH}?"
                + urllib.parse.urlencode(
                    {
                        "inquiryType": kind,
                        "searchTerm": query,
                    }
                )
            )
            fallback_response = fetcher.request(fallback)
            if fallback_response.ok:
                response = fallback_response
                route["requested_url"] = fallback
                route["transport_variant"] = "query_string_fallback"
            else:
                route["fallback_http_status"] = fallback_response.status
                route["fallback_error"] = fallback_response.error
        MODULE.apply_response_receipt(route, response)
        route_candidates: list[dict[str, Any]] = []
        if response.ok:
            route_candidates = extract_sunbiz_list_candidates(response.body, route=route)
            route["state"] = (
                "captured_and_parsed" if route_candidates else "captured_no_candidates"
            )
        else:
            route["state"] = "source_unavailable_after_search"
        route["candidate_rows"] = len(route_candidates)
        route["semantic_filter"] = (
            "exact_fei_equality" if query_type == "fei_ein" else "all_query_tokens_in_legal_name"
        )
        routes.append(route)
        candidates.extend(route_candidates)


class CappedFetcher(MODULE.Fetcher):
    def request(
        self,
        url: str,
        *,
        method: str = "GET",
        form: dict[str, str] | None = None,
        timeout: int = 35,
        referer: str | None = None,
    ) -> Any:
        return super().request(
            url,
            method=method,
            form=form,
            timeout=min(timeout, 35),
            referer=referer,
        )


MODULE.extract_sunbiz_list_candidates = extract_sunbiz_list_candidates
MODULE.extract_generic_name_candidates = extract_generic_name_candidates
MODULE.acquire_sunbiz_corporations = acquire_sunbiz_corporations
MODULE.Fetcher = CappedFetcher

if __name__ == "__main__":
    raise SystemExit(MODULE.main())
