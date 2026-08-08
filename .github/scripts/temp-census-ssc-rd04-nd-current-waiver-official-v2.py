from __future__ import annotations

import hashlib
import io
import json
import re
import sys
import time
from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

OUT = Path(sys.argv[1])
BODY_DIR = OUT / "bodies"
TEXT_DIR = OUT / "text"
BODY_DIR.mkdir(parents=True, exist_ok=True)
TEXT_DIR.mkdir(parents=True, exist_ok=True)

MAX_BODY_BYTES = 12_000_000
MAX_EXPANSION = 60
MAX_REDIRECTS = 5
REDIRECT_CODES = {301, 302, 303, 307, 308}
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 "
    "ssc-rd04-official-census/2.0"
)
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/pdf,application/xml,text/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "Cache-Control": "no-cache",
    }
)

ALLOWED_HOSTS = {
    "hhs.nd.gov",
    "www.hhs.nd.gov",
    "nd.gov",
    "www.nd.gov",
    "fns.usda.gov",
    "www.fns.usda.gov",
    "usda.gov",
    "www.usda.gov",
}
URL_KEYWORDS = (
    "abawd",
    "waiver",
    "time-limit",
    "time_limit",
    "work-require",
    "snap",
    "stay-enrolled",
    "stay_enrolled",
    "obbb",
    "able-bodied",
    "able_bodied",
)
OBSERVATION_TERMS = (
    "north dakota",
    "june 30, 2026",
    "july 1, 2026",
    "rolette county",
    "turtle mountain",
    "waiver expiration",
    "time limit waiver",
    "three months in a 36-month",
    "3 months in a 36-month",
    "october 1, 2025",
    "november 1, 2025",
    "effective immediately",
    "original expiration date",
)
SEEDS = [
    "https://www.hhs.nd.gov/stay-enrolled",
    "https://www.hhs.nd.gov/applyforhelp/snap",
    "https://www.hhs.nd.gov/applyforhelp",
    "https://www.hhs.nd.gov/search?search_api_fulltext=ABAWD",
    "https://www.hhs.nd.gov/search?search_api_fulltext=SNAP%20waiver",
    "https://www.hhs.nd.gov/sitemap.xml",
    "https://www.hhs.nd.gov/",
    "https://www.fns.usda.gov/snap/abawd/waivers",
    "https://www.fns.usda.gov/snap/abawd",
    "https://www.fns.usda.gov/snap/statewide-able-bodied-adults-without-dependent-waivers-effective-immediately-eligible-states",
    "https://www.fns.usda.gov/snap/obbb-implementation",
    "https://www.fns.usda.gov/search?search_api_fulltext=North%20Dakota%20ABAWD",
    "https://www.fns.usda.gov/search?search_api_fulltext=time%20limit%20waiver",
    "https://www.fns.usda.gov/sitemap.xml",
    "https://www.fns.usda.gov/sitemap_index.xml",
]


def canonicalize(raw: str, base: str | None = None) -> str | None:
    raw = (raw or "").strip()
    if not raw or raw.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    absolute = urljoin(base or "", raw)
    parts = urlsplit(absolute)
    if parts.scheme not in {"http", "https"}:
        return None
    host = (parts.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        return None
    query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)))
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    return urlunsplit(("https", parts.netloc.lower(), path, query, ""))


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_slug(url: str) -> str:
    digest = hashlib.sha256(url.encode()).hexdigest()[:16]
    path = re.sub(r"[^a-zA-Z0-9]+", "-", urlsplit(url).path).strip("-")[-80:]
    return f"{digest}-{path or 'root'}"


def extract_pdf_text(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:
        return f"[pdf extraction failed: {type(exc).__name__}: {exc}]"


def extract_html_text_and_links(data: bytes, final_url: str) -> tuple[str, list[tuple[str, str]]]:
    soup = BeautifulSoup(data, "lxml")
    for node in soup(["script", "style", "noscript", "svg"]):
        node.decompose()
    text = "\n".join(line.strip() for line in soup.get_text("\n").splitlines() if line.strip())
    links: list[tuple[str, str]] = []
    for tag in soup.find_all("a", href=True):
        target = canonicalize(tag.get("href", ""), final_url)
        if target:
            anchor = " ".join(tag.get_text(" ", strip=True).split())
            links.append((target, anchor))
    return text, links


def extract_xml_links(data: bytes, final_url: str) -> list[tuple[str, str]]:
    text = data.decode("utf-8", errors="replace")
    links: list[tuple[str, str]] = []
    for match in re.finditer(r"<loc>\s*(.*?)\s*</loc>", text, flags=re.I | re.S):
        target = canonicalize(match.group(1), final_url)
        if target:
            links.append((target, "sitemap loc"))
    return links


def score_link(url: str, anchor: str) -> int:
    hay = f"{url} {anchor}".lower()
    score = sum(8 for term in URL_KEYWORDS if term in hay)
    if any(term in hay for term in ("north-dakota", "north_dakota", "north%20dakota")):
        score += 12
    if any(term in hay for term in ("policy", "memorandum", "guidance")):
        score += 4
    if urlsplit(url).path.lower().endswith(".pdf"):
        score += 3
    return score


def read_bounded(response: requests.Response) -> tuple[bytes, str | None]:
    length = response.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return b"", f"content-length {length} exceeds {MAX_BODY_BYTES}"
    chunks: list[bytes] = []
    total = 0
    for chunk in response.iter_content(chunk_size=65536):
        if not chunk:
            continue
        total += len(chunk)
        if total > MAX_BODY_BYTES:
            return b"", f"streamed body exceeds {MAX_BODY_BYTES}"
        chunks.append(chunk)
    return b"".join(chunks), None


@dataclass
class Receipt:
    ordinal: int
    source: str
    requested_url: str
    contacted_urls: list[str]
    contacted_hosts: list[str]
    final_url: str | None
    final_host: str | None
    status_code: int | None
    content_type: str | None
    body_bytes: int
    body_sha256: str | None
    elapsed_ms: int
    redirect_count: int
    redirect_chain: list[dict]
    physical_request_count: int
    outcome: str
    error: str | None
    body_path: str | None
    text_path: str | None
    discovered_links: int


receipts: list[Receipt] = []
link_candidates: dict[str, dict] = {}
observations: list[dict] = []
fetched: set[str] = set()
queue: deque[tuple[str, str]] = deque((canonicalize(url) or url, "fixed_seed") for url in SEEDS)


def add_candidate(url: str, anchor: str, parent: str) -> None:
    score = score_link(url, anchor)
    if score <= 0:
        return
    row = {"url": url, "anchor": anchor, "parent_url": parent, "score": score}
    current = link_candidates.get(url)
    if current is None or score > current["score"]:
        link_candidates[url] = row


def request_with_policy(url: str):
    current = url
    redirect_chain: list[dict] = []
    contacted_urls: list[str] = []
    contacted_hosts: list[str] = []
    response: requests.Response | None = None
    for hop in range(MAX_REDIRECTS + 1):
        host = (urlsplit(current).hostname or "").lower()
        if host not in ALLOWED_HOSTS:
            raise AssertionError(f"attempted contact outside allowed hosts: {host}")
        contacted_urls.append(current)
        contacted_hosts.append(host)
        response = SESSION.get(current, timeout=(15, 45), allow_redirects=False, stream=True)
        if response.status_code not in REDIRECT_CODES or not response.headers.get("location"):
            return response, current, redirect_chain, contacted_urls, contacted_hosts, None
        location = response.headers["location"]
        target_raw = urljoin(current, location)
        target_parts = urlsplit(target_raw)
        target_host = (target_parts.hostname or "").lower()
        target_allowed = target_host in ALLOWED_HOSTS and target_parts.scheme in {"http", "https"}
        row = {
            "hop": hop + 1,
            "from_url": current,
            "status_code": response.status_code,
            "location": location,
            "target_url": target_raw,
            "target_host": target_host or None,
            "target_allowed": target_allowed,
            "action": "follow_allowed_redirect" if target_allowed else "refuse_before_contact",
        }
        redirect_chain.append(row)
        response.close()
        if not target_allowed:
            return response, current, redirect_chain, contacted_urls, contacted_hosts, (
                f"redirect target outside frozen official hosts: {target_host or '[missing]'}"
            )
        target = canonicalize(target_raw)
        if target is None:
            return response, current, redirect_chain, contacted_urls, contacted_hosts, (
                "allowed-host redirect could not be canonicalized"
            )
        if hop >= MAX_REDIRECTS:
            return response, current, redirect_chain, contacted_urls, contacted_hosts, (
                f"redirect ceiling exceeded: {MAX_REDIRECTS}"
            )
        current = target
    raise AssertionError("unreachable redirect loop")


def fetch_one(url: str, source: str) -> None:
    ordinal = len(receipts) + 1
    started = time.monotonic()
    final_url = None
    final_host = None
    status = None
    ctype = None
    data = b""
    error = None
    outcome = "request_error"
    body_path = None
    text_path = None
    links: list[tuple[str, str]] = []
    redirects: list[dict] = []
    contacted_urls: list[str] = []
    contacted_hosts: list[str] = []
    response: requests.Response | None = None
    try:
        response, final_url, redirects, contacted_urls, contacted_hosts, redirect_error = request_with_policy(url)
        elapsed_ms = int((time.monotonic() - started) * 1000)
        final_host = contacted_hosts[-1] if contacted_hosts else None
        status = response.status_code if response is not None else None
        ctype = ((response.headers.get("content-type") or "").split(";", 1)[0].lower() if response else None)
        if redirect_error:
            outcome = "refused_redirect_before_external_contact"
            error = redirect_error
        else:
            data, body_error = read_bounded(response)
            if body_error:
                outcome = "refused_body_too_large"
                error = body_error
                data = b""
            else:
                outcome = "http_success" if status is not None and 200 <= status < 300 else "http_terminal_non_success"
                slug = safe_slug(final_url or url)
                suffix = ".pdf" if ctype == "application/pdf" or (final_url or url).lower().endswith(".pdf") else ".bin"
                body_file = BODY_DIR / f"{ordinal:03d}-{slug}{suffix}"
                body_file.write_bytes(data)
                body_path = str(body_file.relative_to(OUT))
                text = ""
                if ctype == "application/pdf" or suffix == ".pdf":
                    text = extract_pdf_text(data)
                elif ctype and "html" in ctype:
                    text, links = extract_html_text_and_links(data, final_url or url)
                elif (ctype and "xml" in ctype) or (final_url or url).lower().endswith(".xml"):
                    text = data.decode("utf-8", errors="replace")
                    links = extract_xml_links(data, final_url or url)
                elif ctype and ctype.startswith("text/"):
                    text = data.decode("utf-8", errors="replace")
                if text:
                    text_file = TEXT_DIR / f"{ordinal:03d}-{slug}.txt"
                    text_file.write_text(text, encoding="utf-8")
                    text_path = str(text_file.relative_to(OUT))
                    lower = text.lower()
                    hit_terms = [term for term in OBSERVATION_TERMS if term in lower]
                    if hit_terms:
                        excerpts: list[str] = []
                        lines = [line.strip() for line in text.splitlines() if line.strip()]
                        for idx, line in enumerate(lines):
                            if any(term in line.lower() for term in hit_terms):
                                excerpt = " | ".join(lines[max(0, idx - 2): min(len(lines), idx + 3)])
                                if excerpt not in excerpts:
                                    excerpts.append(excerpt[:1400])
                            if len(excerpts) >= 20:
                                break
                        observations.append({
                            "route_ordinal": ordinal,
                            "url": final_url or url,
                            "content_type": ctype,
                            "hit_terms": hit_terms,
                            "excerpts": excerpts,
                        })
                for target, anchor in links:
                    add_candidate(target, anchor, final_url or url)
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        error = f"{type(exc).__name__}: {exc}"
    finally:
        if response is not None:
            response.close()
    receipts.append(Receipt(
        ordinal=ordinal,
        source=source,
        requested_url=url,
        contacted_urls=contacted_urls,
        contacted_hosts=contacted_hosts,
        final_url=final_url,
        final_host=final_host,
        status_code=status,
        content_type=ctype,
        body_bytes=len(data),
        body_sha256=sha256(data) if data else None,
        elapsed_ms=elapsed_ms,
        redirect_count=len(redirects),
        redirect_chain=redirects,
        physical_request_count=len(contacted_urls),
        outcome=outcome,
        error=error,
        body_path=body_path,
        text_path=text_path,
        discovered_links=len(links),
    ))


while queue:
    url, source = queue.popleft()
    if url in fetched:
        continue
    fetched.add(url)
    fetch_one(url, source)

ranked = sorted(link_candidates.values(), key=lambda row: (-row["score"], row["url"]))
selected = [row for row in ranked if row["url"] not in fetched][:MAX_EXPANSION]
for row in selected:
    fetched.add(row["url"])
    fetch_one(row["url"], "same_host_keyword_expansion")

with (OUT / "query-receipts.jsonl").open("w", encoding="utf-8") as handle:
    for receipt in receipts:
        handle.write(json.dumps(asdict(receipt), sort_keys=True) + "\n")
with (OUT / "candidate-links.jsonl").open("w", encoding="utf-8") as handle:
    selected_urls = {row["url"] for row in selected}
    for row in ranked:
        value = dict(row)
        value["selected_for_fetch"] = row["url"] in selected_urls
        handle.write(json.dumps(value, sort_keys=True) + "\n")
with (OUT / "observations.jsonl").open("w", encoding="utf-8") as handle:
    for row in observations:
        handle.write(json.dumps(row, sort_keys=True) + "\n")

host_counts: dict[str, int] = {}
outcome_counts: dict[str, int] = {}
status_counts: dict[str, int] = {}
physical_requests = 0
for receipt in receipts:
    for host in receipt.contacted_hosts:
        host_counts[host] = host_counts.get(host, 0) + 1
    outcome_counts[receipt.outcome] = outcome_counts.get(receipt.outcome, 0) + 1
    status_key = str(receipt.status_code) if receipt.status_code is not None else "none"
    status_counts[status_key] = status_counts.get(status_key, 0) + 1
    physical_requests += receipt.physical_request_count

summary = {
    "schema_version": "ssc-rd04-nd-current-waiver-official-census@2",
    "state": "bounded_official_route_census_complete",
    "fixed_seed_count": len(SEEDS),
    "selected_expansion_count": len(selected),
    "total_route_count": len(receipts),
    "physical_request_count": physical_requests,
    "unique_requested_urls": len(fetched),
    "candidate_link_count": len(ranked),
    "observation_count": len(observations),
    "refused_redirect_count": sum(r.outcome == "refused_redirect_before_external_contact" for r in receipts),
    "host_counts": host_counts,
    "status_counts": status_counts,
    "outcome_counts": outcome_counts,
    "allowed_hosts": sorted(ALLOWED_HOSTS),
    "fresh_anonymous_http_sessions": 1,
    "login_or_account_attempts": 0,
    "api_key_use": 0,
    "captcha_or_waf_bypass_attempts": 0,
    "external_redirect_targets_contacted": 0,
    "external_contacts": 0,
    "outside_human_dependency": False,
    "source_admissions": 0,
    "field_terminalizations": 0,
    "matrix_updates": 0,
    "row_state_mutations": 0,
    "class_closed": False,
    "cumulative_ledger_effect": "none",
    "publication_effect": "none",
    "adoption_effect": "none",
    "graph_effect": "none",
    "interpretation_boundary": (
        "Route transport and keyword observations are locator custody only. "
        "No source is admitted and no waiver geography or period is inferred by this census."
    ),
}
(OUT / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
route_policy = {
    "schema_version": "ssc-rd04-nd-current-waiver-route-policy@2",
    "fixed_seeds": SEEDS,
    "allowed_hosts": sorted(ALLOWED_HOSTS),
    "maximum_same_host_expansion": MAX_EXPANSION,
    "maximum_redirects_per_route": MAX_REDIRECTS,
    "redirect_policy": "inspect_each_location_without_following; refuse_external_target_before_contact",
    "maximum_body_bytes": MAX_BODY_BYTES,
    "fresh_anonymous_http_sessions": 1,
    "authentication": "none",
    "outside_human_dependency": False,
}
(OUT / "route-policy.json").write_text(json.dumps(route_policy, indent=2, sort_keys=True) + "\n", encoding="utf-8")

assert len(receipts) >= len(SEEDS)
assert all(host in ALLOWED_HOSTS for receipt in receipts for host in receipt.contacted_hosts)
assert all(
    redirect["target_allowed"] or redirect["action"] == "refuse_before_contact"
    for receipt in receipts
    for redirect in receipt.redirect_chain
)
assert summary["external_redirect_targets_contacted"] == 0
assert summary["external_contacts"] == 0
assert summary["outside_human_dependency"] is False
print(json.dumps(summary, sort_keys=True))
