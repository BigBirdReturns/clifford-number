from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
A02_ROOT = ROOT / "data/intake/status-sovereignty-rd04-snap-source-availability-a02"
A03_ROOT = ROOT / "data/intake/status-sovereignty-rd04-snap-search-replay-a03"
A04_ROOT = ROOT / "data/intake/status-sovereignty-rd04-snap-route-adjudication-a04"
BUILD_ROOT = ROOT / "build/core-thesis/status-sovereignty/rd04-snap-route-adjudication-a04"
REPORT_ROOT = ROOT / "reports/core-thesis/status-sovereignty/rd04-snap-route-adjudication-a04"
MANIFEST_PATH = ROOT / "data/project/status-sovereignty-rd04-snap-route-adjudication-a04-release-manifest.json"

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming",
}
DIMS = [f"D{i}" for i in range(1, 9)]

# Query slots are the only route by which an A03 candidate can be considered for a dimension.
QUERY_DIMENSIONS = {
    "Q1": {"D1", "D2", "D3"},
    "Q2": {"D5", "D6"},
    "Q3": {"D4", "D6"},
    "Q4": {"D7", "D8"},
}

SNAP_PATTERNS = [
    r"\bsnap\b",
    r"supplemental nutrition assistance",
    r"food stamp",
    r"food assistance",
    r"calfresh",
]
DIMENSION_PATTERNS = {
    "D1": [r"\bmanual\b", r"\bpolicy\b", r"\bpolicies\b", r"regulation", r"rule", r"revision", r"version", r"effective date"],
    "D2": [r"waiver", r"exempt", r"exception", r"work requirement", r"\babawd\b", r"time limit"],
    "D3": [r"screen", r"verification", r"verify", r"referral", r"eligibility procedure", r"assessment"],
    "D4": [r"sanction", r"disqualif", r"benefit loss", r"termination", r"restor", r"reinstat", r"\bcount\b", r"\bnumber of\b"],
    "D5": [r"fair hearing", r"administrative hearing", r"appeal", r"hearing decision", r"docket", r"reversal"],
    "D6": [r"notice", r"continued benefits", r"aid pending", r"pending appeal", r"restor", r"reinstat", r"repayment"],
    "D7": [r"employment", r"earnings", r"food security", r"evaluation", r"outcome", r"impact study", r"participant results"],
    "D8": [r"demographic", r"race", r"ethnic", r"age", r"disabil", r"household characteristics", r"gender"],
}

WRONG_PROGRAM_PATH_TERMS = {
    "tourism", "visit", "park", "parks", "corporation", "corp.", "/corp", "/sos",
    "secretary of state", "business services", "about-minnesota", "about-wyoming",
    "about-california", "welcome-iowa", "visitors/about", "explore-maryland",
    "texas-by-texas", "south-fontana-park",
}

# Exact state-root hints used to reject obvious wrong-state search results.
HOST_STATE_HINTS = {
    "alabama.gov": "AL", "alaska.gov": "AK", "az.gov": "AZ", "arkansas.gov": "AR",
    "ca.gov": "CA", "colorado.gov": "CO", "ct.gov": "CT", "delaware.gov": "DE",
    "myflorida.gov": "FL", "georgia.gov": "GA", "ehawaii.gov": "HI", "idaho.gov": "ID",
    "illinois.gov": "IL", "in.gov": "IN", "iowa.gov": "IA", "kansas.gov": "KS",
    "kentucky.gov": "KY", "louisiana.gov": "LA", "maine.gov": "ME", "maryland.gov": "MD",
    "mass.gov": "MA", "state.ma.us": "MA", "michigan.gov": "MI", "mn.gov": "MN",
    "mississippi.gov": "MS", "mo.gov": "MO", "mt.gov": "MT", "nebraska.gov": "NE",
    "nv.gov": "NV", "nh.gov": "NH", "nj.gov": "NJ", "nm.gov": "NM", "ny.gov": "NY",
    "nc.gov": "NC", "nd.gov": "ND", "ohio.gov": "OH", "oklahoma.gov": "OK",
    "oregon.gov": "OR", "pa.gov": "PA", "ri.gov": "RI", "sc.gov": "SC", "sd.gov": "SD",
    "tn.gov": "TN", "texas.gov": "TX", "utah.gov": "UT", "vermont.gov": "VT",
    "virginia.gov": "VA", "wa.gov": "WA", "wv.gov": "WV", "wisconsin.gov": "WI",
    "wyo.gov": "WY", "dc.gov": "DC", "fontanaca.gov": "CA",
}

OFFICIAL_EXACT_HOSTS = {
    "usa.gov", "www.usa.gov", "congress.gov", "www.congress.gov", "govinfo.gov",
    "www.govinfo.gov", "codes.ohio.gov", "www.myflfamilies.com",
}


def stable_json(value: Any) -> str:
    return json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(stable_json(value), encoding="utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def normalize_host(value: str) -> str:
    host = (urlparse(value).hostname or value or "").lower().rstrip(".")
    return host


def is_official_host(host: str) -> bool:
    host = normalize_host(host)
    return host in OFFICIAL_EXACT_HOSTS or host.endswith(".gov") or host.endswith(".mil")


def host_state_hint(host: str) -> str | None:
    host = normalize_host(host)
    best: tuple[int, str] | None = None
    for suffix, code in HOST_STATE_HINTS.items():
        if host == suffix or host.endswith("." + suffix):
            candidate = (len(suffix), code)
            if best is None or candidate[0] > best[0]:
                best = candidate
    return best[1] if best else None


def candidate_query_states(queries: Iterable[str]) -> list[str]:
    states = sorted({str(q).split("-", 1)[0] for q in queries})
    return [s for s in states if s in STATES]


def candidate_query_dimensions(queries: Iterable[str]) -> set[str]:
    result: set[str] = set()
    for query in queries:
        parts = str(query).split("-")
        if len(parts) >= 2:
            result |= QUERY_DIMENSIONS.get(parts[1], set())
    return result


def contains_pattern(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def clean_text(value: str) -> str:
    value = value.replace("\x00", " ")
    value = re.sub(r"[\t\r ]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def flatten_rows(paths: Iterable[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(paths):
        data = read_json(path)
        rows.extend(data.get("rows", []))
    return rows


def route_id(index: int) -> str:
    return f"A03C-{index:03d}"


def path_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def all_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file())


def exact_manifest(paths: Iterable[Path], *, execution_id: str, issue: int) -> dict[str, Any]:
    entries = []
    for path in sorted(set(paths), key=lambda p: path_rel(p)):
        data = path.read_bytes()
        entries.append({"path": path_rel(path), "bytes": len(data), "sha256": sha256_bytes(data)})
    combined = sha256_bytes("".join(f"{e['path']}\0{e['sha256']}\0{e['bytes']}\n" for e in entries).encode())
    return {
        "schema_version": "ssc-rd04-a04-release-manifest@1",
        "execution_id": execution_id,
        "issue": issue,
        "hash_mode": "sha256_exact_bytes",
        "scope_ordered": True,
        "self_included": False,
        "entries": entries,
        "combined_sha256": combined,
        "boundaries": {
            "exact_bytes_prove_source_truth": False,
            "manifest_proves_policy_quality": False,
            "manifest_closes_residual_class": False,
            "manifest_changes_reviewed_disposition": False,
            "manifest_authorizes_graph_effect": False,
            "manifest_authorizes_publication": False,
            "graph_effect": "none",
            "publication_effect": "none",
        },
    }
