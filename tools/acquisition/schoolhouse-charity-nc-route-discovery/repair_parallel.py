#!/usr/bin/env python3
"""Parallelize the bounded route discovery and shorten transport waits."""

from __future__ import annotations

import argparse
from pathlib import Path

IMPORT_ANCHOR = "from collections import Counter\n"
IMPORT_REPLACEMENT = "from collections import Counter\nfrom concurrent.futures import ThreadPoolExecutor, as_completed\n"
ROOT_START = "        for route in ROOT_ROUTES:\n"
ROOT_END = "        unique_discovered: dict[str, dict[str, Any]] = {}\n"
FOLLOW_START = "        for link in selected:\n"
FOLLOW_END = "    root_by_id = {row[\"route_id\"]: row for row in root_receipts}\n"

ROOT_REPLACEMENT = '''        def probe_root(route: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
            print(f"root probe {route['route_id']} {route['url']}", flush=True)
            receipt, body = run_curl(route["url"], "GET_HTML", route["route_id"], temp_root)
            row = {
                "schema_version": "schoolhouse-charity-route-receipt@1",
                **route,
                **receipt,
                "query_submitted": False,
                "source_rows_acquired": 0,
                "raw_source_retained": False,
                "hidden_form_values_retained": False,
                "street_address_rows_retained": 0,
                "contact_detail_rows_retained": 0,
                "private_support_rows": 0,
                "identity_admitted": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
                "probed_at": utc_now(),
            }
            page: dict[str, Any] | None = None
            forms: list[dict[str, Any]] = []
            links: list[dict[str, Any]] = []
            if receipt["state"] == "accessible_html" and body:
                page, forms = sanitize_surface_metadata(route["route_id"], receipt["effective_url"], body)
                for anchor in page["anchors"]:
                    if not relevant_link(anchor):
                        continue
                    links.append(
                        {
                            "source_route_id": route["route_id"],
                            "source_url": receipt["effective_url"],
                            "href": anchor["href"],
                            "anchor_text": anchor.get("text") or None,
                            "official_host": True,
                            "relevant": True,
                            "query_submission_required": False,
                            "follow_state": "queued",
                            "graph_effect": "none",
                            "promotes_to": "candidate_only",
                        }
                    )
            return row, page, forms, links

        root_results: dict[str, tuple[dict[str, Any], dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]] = {}
        with ThreadPoolExecutor(max_workers=min(8, len(ROOT_ROUTES))) as executor:
            futures = {executor.submit(probe_root, route): route["route_id"] for route in ROOT_ROUTES}
            for future in as_completed(futures):
                root_results[futures[future]] = future.result()
        for route in ROOT_ROUTES:
            row, page, forms, links = root_results[route["route_id"]]
            root_receipts.append(row)
            if page is not None:
                page_rows.append(page)
            form_rows.extend(forms)
            discovered_link_rows.extend(links)

        unique_discovered: dict[str, dict[str, Any]] = {}
'''

FOLLOW_REPLACEMENT = '''        def probe_follow(link: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any] | None, list[dict[str, Any]]]:
            url = link["href"]
            suffix = Path(urllib.parse.urlsplit(url).path).suffix.lower()
            method = "GET_RANGE" if suffix in FILE_SUFFIXES else "GET_HTML"
            request_id = route_id_for_url(url)
            print(f"follow probe {request_id} {url}", flush=True)
            receipt, body = run_curl(url, method, request_id, temp_root)
            hostname = (urllib.parse.urlsplit(url).hostname or "").lower()
            followed = {
                "schema_version": "schoolhouse-charity-route-receipt@1",
                "route_id": request_id,
                "parent_route_id": link["source_route_id"],
                "jurisdiction": "Florida" if hostname.endswith(".fdacs.gov") or hostname == "fdacs.gov" else "North Carolina",
                "surface": "discovered_official_file" if method == "GET_RANGE" else "discovered_official_page",
                **receipt,
                "query_submitted": False,
                "source_rows_acquired": 0,
                "raw_source_retained": False,
                "hidden_form_values_retained": False,
                "street_address_rows_retained": 0,
                "contact_detail_rows_retained": 0,
                "private_support_rows": 0,
                "identity_admitted": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
                "probed_at": utc_now(),
            }
            page: dict[str, Any] | None = None
            forms: list[dict[str, Any]] = []
            if receipt["state"] == "accessible_html" and body:
                page, forms = sanitize_surface_metadata(request_id, receipt["effective_url"], body)
            return followed, page, forms

        follow_results: dict[str, tuple[dict[str, Any], dict[str, Any] | None, list[dict[str, Any]]]] = {}
        if selected:
            with ThreadPoolExecutor(max_workers=min(8, len(selected))) as executor:
                futures = {executor.submit(probe_follow, link): link["href"] for link in selected}
                for future in as_completed(futures):
                    follow_results[futures[future]] = future.result()
        for link in selected:
            followed, page, forms = follow_results[link["href"]]
            followed_receipts.append(followed)
            if page is not None:
                page_rows.append(page)
            form_rows.extend(forms)

    root_by_id = {row["route_id"]: row for row in root_receipts}
'''


def replace_region(source: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start_count = source.count(start_marker)
    end_count = source.count(end_marker)
    if start_count != 1 or end_count != 1:
        raise RuntimeError(f"{label}: expected one start and end marker, found {start_count}/{end_count}")
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    return source[:start] + replacement + source[end + len(end_marker):]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    args = parser.parse_args()
    target = args.target.resolve()
    source = target.read_text(encoding="utf-8")

    if source.count(IMPORT_ANCHOR) != 1:
        raise RuntimeError("concurrent-futures import anchor drift")
    source = source.replace(IMPORT_ANCHOR, IMPORT_REPLACEMENT)
    source = source.replace("MAX_DISCOVERED_FOLLOWS = 40", "MAX_DISCOVERED_FOLLOWS = 24")
    source = source.replace('"--max-time",\n        "60",', '"--max-time",\n        "30",')
    source = source.replace('"--retry",\n        "2",', '"--retry",\n        "1",')
    source = source.replace("timeout=75,", "timeout=45,")
    source = replace_region(source, ROOT_START, ROOT_END, ROOT_REPLACEMENT, "root probe loop")
    source = replace_region(source, FOLLOW_START, FOLLOW_END, FOLLOW_REPLACEMENT, "follow probe loop")

    for stale in (
        ROOT_START,
        FOLLOW_START,
        "MAX_DISCOVERED_FOLLOWS = 40",
        '"--max-time",\n        "60",',
        '"--retry",\n        "2",',
        "timeout=75,",
    ):
        if stale in source:
            raise RuntimeError(f"stale sequential or long-wait fixture survived: {stale!r}")
    target.write_text(source, encoding="utf-8")
    print(f"parallelized bounded route discovery in {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
