from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Iterable

from .ssc_rd04_a04_common import (
    DIMENSION_PATTERNS,
    SNAP_PATTERNS,
    STATES,
    WRONG_PROGRAM_PATH_TERMS,
    candidate_query_dimensions,
    candidate_query_states,
    contains_pattern,
    host_state_hint,
    normalize_host,
)

BLOCK_SPLIT = re.compile(r"\n+")


def _state_mentions(text: str) -> set[str]:
    lowered = text.lower()
    return {code for code, name in STATES.items() if re.search(rf"\b{re.escape(name.lower())}\b", lowered)}


def _path_wrong_program(url: str, title: str | None, text: str | None) -> bool:
    probe = " ".join([url.lower(), (title or "").lower(), (text or "")[:1200].lower()])
    return any(term in probe for term in WRONG_PROGRAM_PATH_TERMS)


def _matching_snippets(text: str, dim: str, *, max_snippets: int = 3) -> list[dict[str, Any]]:
    snippets: list[dict[str, Any]] = []
    blocks = [re.sub(r"\s+", " ", block).strip() for block in BLOCK_SPLIT.split(text or "")]
    blocks = [block for block in blocks if block]
    for index, block in enumerate(blocks, start=1):
        if len(block) > 1600:
            block = block[:1600]
        if contains_pattern(block, SNAP_PATTERNS) and contains_pattern(block, DIMENSION_PATTERNS[dim]):
            snippets.append({
                "locator": f"text-block-{index}",
                "text": block[:700],
                "text_truncated": len(block) > 700,
            })
            if len(snippets) >= max_snippets:
                break
    return snippets


def classify_candidate(candidate: dict[str, Any], fetch: dict[str, Any]) -> dict[str, Any]:
    queries = list(candidate.get("queries", []))
    query_states = candidate_query_states(queries)
    allowed_dims = candidate_query_dimensions(queries)
    final_url = str(fetch.get("final_url") or candidate["url"])
    final_host = normalize_host(fetch.get("final_host") or final_url)
    host_hint = host_state_hint(final_host)
    text = fetch.get("text") or ""
    title = fetch.get("page_title") or ""
    mentions = _state_mentions("\n".join([title, text[:20000]]))
    snap_relevant = contains_pattern("\n".join([title, text]), SNAP_PATTERNS)
    page_state_match = bool(set(query_states) & mentions) or (host_hint in query_states)
    clearly_wrong_state = host_hint is not None and host_hint not in query_states
    wrong_program = _path_wrong_program(final_url, title, text)

    supporting: dict[str, list[dict[str, Any]]] = {}
    for dim in sorted(allowed_dims):
        matches = _matching_snippets(text, dim)
        if matches:
            supporting[dim] = matches

    if not fetch.get("accessible"):
        disposition = "official_page_unavailable_after_bounded_retry"
    elif not fetch.get("official_after_redirects"):
        disposition = "not_official_after_page_review"
    elif clearly_wrong_state:
        disposition = "official_wrong_state"
    elif fetch.get("parse_state") in {"pdf", "binary"} or fetch.get("text") is None:
        disposition = "official_binary_or_unparsed_content"
    elif wrong_program:
        disposition = "official_wrong_program"
    elif not snap_relevant:
        disposition = "official_route_only_generic"
    elif not page_state_match:
        disposition = "official_wrong_state"
    elif not supporting:
        disposition = "official_snap_page_no_dimension_support"
    else:
        disposition = "official_relevant_support"

    if disposition != "official_relevant_support":
        supporting = {}

    limitations = [
        "Search rank and query-slot appearance do not establish source authority.",
        "Official-domain status does not establish SNAP or dimension relevance.",
        "Automated A04 triage may add at most provisional level-one support to a previously zero cell.",
        "No A03 candidate may create level-two support or remove an A02 baseline source.",
    ]
    if disposition != "official_relevant_support":
        limitations.append("This disposition creates no score change.")

    return {
        "candidate_id": candidate["candidate_id"],
        "candidate_url": candidate["url"],
        "candidate_domain": candidate.get("domain"),
        "first_result_id": candidate.get("first_result_id"),
        "queries": queries,
        "query_states": query_states,
        "query_dimension_ceiling": sorted(allowed_dims),
        "fetch": {k: v for k, v in fetch.items() if k != "text"},
        "state_scope_inferred": sorted(set(query_states) & mentions) or ([host_hint] if host_hint in query_states else []),
        "host_state_hint": host_hint,
        "page_state_mentions": sorted(mentions),
        "state_relevance": "matched" if page_state_match and not clearly_wrong_state else "wrong_or_unrecovered",
        "official_domain_basis": "official_after_redirects" if fetch.get("official_after_redirects") else "not_official_after_redirects",
        "snap_program_relevance": snap_relevant,
        "dimension_relevance": sorted(supporting),
        "supporting_passages": supporting,
        "limitations": limitations,
        "duplicate_or_alias_of": None,
        "pre_alias_disposition": disposition,
        "terminal_disposition": disposition,
        "score_eligible": disposition == "official_relevant_support",
    }


def apply_aliases(rows: list[dict[str, Any]]) -> None:
    # Exact final-URL redirects and exact-body duplicates are aliases. The first sorted candidate remains canonical.
    final_url_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    body_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        attempts = row["fetch"].get("attempts", [])
        body_sha = attempts[-1].get("body_sha256") if attempts else ""
        final_url = row["fetch"].get("final_url") or row["candidate_url"]
        if row["fetch"].get("accessible"):
            final_url_groups[final_url].append(row)
            if body_sha:
                body_groups[body_sha].append(row)
    alias_map: dict[str, str] = {}
    for groups in (final_url_groups, body_groups):
        for members in groups.values():
            if len(members) < 2:
                continue
            members.sort(key=lambda row: row["candidate_id"])
            canonical = members[0]["candidate_id"]
            for alias in members[1:]:
                alias_map.setdefault(alias["candidate_id"], canonical)
    for row in rows:
        target = alias_map.get(row["candidate_id"])
        if target:
            row["duplicate_or_alias_of"] = target
            row["terminal_disposition"] = "duplicate_or_redirect_alias"
            row["score_eligible"] = False
            row["limitations"].append("Exact redirect or response-body alias; only the canonical candidate can affect a score.")


def eligible_candidate_map(rows: Iterable[dict[str, Any]]) -> dict[tuple[str, str], list[str]]:
    result: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in rows:
        if not row.get("score_eligible"):
            continue
        for state in row.get("query_states", []):
            if state not in row.get("state_scope_inferred", []):
                continue
            for dim in row.get("dimension_relevance", []):
                result[(state, dim)].append(row["candidate_id"])
    return {key: sorted(set(values)) for key, values in result.items()}


def reconcile_a02_source(source: dict[str, Any], fetch: dict[str, Any], route_rows: list[dict[str, Any]]) -> dict[str, Any]:
    exact_alias = None
    source_url = source["url"]
    final_url = fetch.get("final_url") or source_url
    for row in route_rows:
        if source_url == row["candidate_url"] or final_url == row["fetch"].get("final_url"):
            exact_alias = row["candidate_id"]
            break
    if exact_alias:
        state = "exact_alias_to_a03_route"
    elif not fetch.get("accessible"):
        state = "official_page_unavailable_after_bounded_retry"
    elif not fetch.get("official_after_redirects"):
        state = "not_official_after_page_review"
    elif fetch.get("parse_state") in {"pdf", "binary"} or fetch.get("text") is None:
        state = "official_binary_or_unparsed_content"
    else:
        state = "accessible_official_content_rechecked"
    return {
        "source_id": source["source_id"],
        "url": source_url,
        "publisher": source.get("publisher"),
        "title": source.get("title"),
        "state_scope": source.get("state_scope"),
        "dimensions": source.get("dimensions", []),
        "support": source.get("support"),
        "limitations": source.get("limitations"),
        "replay_state": "not_returned_by_frozen_replay",
        "fetch": {k: v for k, v in fetch.items() if k != "text"},
        "terminal_reconciliation": state,
        "exact_alias_to_a03_candidate": exact_alias,
        "baseline_score_preserved": True,
        "source_removal_authorized": False,
        "boundaries": {
            "replay_non_return_is_source_invalidity": False,
            "current_fetch_failure_is_record_absence": False,
            "current_fetch_failure_removes_prior_support": False,
        },
    }
