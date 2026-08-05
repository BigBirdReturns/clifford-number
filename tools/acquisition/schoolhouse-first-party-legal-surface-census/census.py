#!/usr/bin/env python3
"""Census bounded first-party School.House legal and governance surfaces.

This execution-only runner starts from five fixed public roots, follows only
query-free HTTPS routes on school.house to depth two under a 120-route cap, and
retains route custody, same-host links, privacy-minimized form mechanics,
sanitized organization structured data, legal-governance term counts, exact
candidate phrases, and external host/path leads. It never submits a search,
form, application, account action, payment, upload, contact request, or private
material. Raw HTML, visible full text, hidden values, email addresses, telephone
numbers, and street addresses are discarded.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, deque
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = "schoolhouse-first-party-legal-surface-census@1"
USER_AGENT = "CliffordNumber-SchoolHouse-LegalSurfaceCensus/1.0"
MAX_TOTAL_ROUTES = 120
MAX_DEPTH = 2
MAX_TEXT_BODY_BYTES = 4 * 1024 * 1024
MAX_FILE_SAMPLE_BYTES = 64 * 1024
REQUEST_TIMEOUT_SECONDS = 75
FOLLOW_HOSTS = {"school.house", "www.school.house"}
FIXED_CONNECT_HOST = "connect.bv.vc"
ALLOWED_REDIRECT_HOSTS = FOLLOW_HOSTS | {FIXED_CONNECT_HOST}
ROOT_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "root-schoolhouse-home",
        "root_id": "root-schoolhouse-home",
        "url": "https://school.house/",
        "surface": "schoolhouse_home",
    },
    {
        "route_id": "root-schoolhouse-faculty",
        "root_id": "root-schoolhouse-faculty",
        "url": "https://school.house/faculty/",
        "surface": "schoolhouse_faculty",
    },
    {
        "route_id": "root-schoolhouse-robots",
        "root_id": "root-schoolhouse-robots",
        "url": "https://school.house/robots.txt",
        "surface": "robots_reference",
    },
    {
        "route_id": "root-schoolhouse-sitemap",
        "root_id": "root-schoolhouse-sitemap",
        "url": "https://school.house/sitemap.xml",
        "surface": "sitemap_reference",
    },
    {
        "route_id": "root-schoolhouse-connect",
        "root_id": "root-schoolhouse-connect",
        "url": "https://connect.bv.vc/schoolhouse",
        "surface": "bvvc_schoolhouse_connect",
    },
]

LEGAL_TERMS = {
    "nonprofit": r"\bnon[-\s]?profit\b",
    "public_charity": r"\bpublic\s+charit(?:y|ies)\b",
    "501c3": r"\b501\s*\(\s*c\s*\)\s*\(\s*3\s*\)\b",
    "tax_exempt": r"\btax[-\s]+exempt\b",
    "employer_identification_number": r"\bemployer\s+identification\s+number\b",
    "ein": r"\bein\b",
    "fiscal_sponsor": r"\bfiscal\s+sponsor(?:ship)?\b",
    "board": r"\bboard\b",
    "officer": r"\bofficers?\b",
    "director": r"\bdirectors?\b",
    "governance": r"\bgovernance\b",
    "bylaws": r"\bbylaws?\b",
    "articles_of_incorporation": r"\barticles?\s+of\s+incorporation\b",
    "foundation": r"\bfoundation\b",
    "association": r"\bassociation\b",
    "corporation": r"\bcorporation\b",
    "incorporated": r"\bincorporated\b",
    "limited_liability_company": r"\blimited\s+liability\s+company\b",
    "llc": r"\bL\.?L\.?C\.?\b",
    "form_990": r"\bform\s+990(?:[-\s]?[A-Z]{1,2})?\b",
    "grant": r"\bgrants?\b",
    "funding": r"\bfunding\b",
    "related_party": r"\brelated[-\s]+part(?:y|ies)\b",
    "charitable_solicitation": r"\bcharitable\s+solicitation\b",
    "registration": r"\bregistration\b",
    "donor": r"\bdonors?\b",
    "annual_report": r"\bannual\s+reports?\b",
}
SUBJECT_TERMS = {
    "school_dot_house": r"\bschool\s*\.\s*house\b",
    "schoolhouse": r"\bschoolhouse\b",
    "bravo_victor": r"\bbravo\s+victor\b",
    "bvvc": r"\bbvvc\b",
}
LEGAL_PATTERNS = {key: re.compile(value, re.IGNORECASE) for key, value in LEGAL_TERMS.items()}
SUBJECT_PATTERNS = {key: re.compile(value, re.IGNORECASE) for key, value in SUBJECT_TERMS.items()}
LEGAL_RELEVANCE = re.compile(
    r"(?:legal|govern|board|officer|director|bylaw|incorpor|nonprofit|charit|501|tax[-_ ]?exempt|"
    r"fiscal|sponsor|foundation|association|corporation|llc|ein|grant|fund|donor|annual[-_ ]?report|"
    r"privacy|terms|about|mission|support|donat|partner|faculty|team|contact)",
    re.IGNORECASE,
)
LEGAL_NAME_PATTERN = re.compile(
    r"\bSchool\s*\.?\s*House\b(?:\s*,?\s*(?:Inc(?:orporated)?\.?|L\.?L\.?C\.?|"
    r"Foundation|Association|Corporation|Corp\.?|Ltd\.?|Limited))",
    re.IGNORECASE,
)
SCHOOLHOUSE_LEGAL_CONTEXT_PATTERN = re.compile(
    r"\bSchool\s*\.?\s*House\b.{0,180}?\b(?:501\s*\(\s*c\s*\)\s*\(\s*3\s*\)|"
    r"non[-\s]?profit|public\s+charit(?:y|ies)|tax[-\s]+exempt|fiscal\s+sponsor(?:ship)?|"
    r"incorporated|foundation|association|corporation|L\.?L\.?C\.?)\b",
    re.IGNORECASE,
)
COPYRIGHT_PATTERN = re.compile(r"(?:©|\bcopyright\b)\s*(?:\d{4}(?:\s*[-–]\s*\d{4})?\s*)?[^|•\n]{1,140}", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)\d{3}[\s.\-]?\d{4}(?!\d)")
STREET_PATTERN = re.compile(
    r"\b\d{1,6}\s+(?:[A-Z0-9.'\-]+\s+){1,6}(?:Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|"
    r"Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Highway|Hwy\.?|Way)\b",
    re.IGNORECASE,
)
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
SKIP_PATH_PATTERN = re.compile(
    r"/(?:wp-admin|wp-login|login|log-in|sign-in|signin|signup|sign-up|account|checkout|cart|"
    r"payment|payments|upload|uploads|api|graphql)(?:/|$)",
    re.IGNORECASE,
)
SKIP_SUFFIXES = {
    ".7z", ".avi", ".bmp", ".css", ".eot", ".exe", ".gif", ".ico", ".jpeg", ".jpg",
    ".js", ".m4a", ".mov", ".mp3", ".mp4", ".mpeg", ".ogg", ".png", ".rar", ".svg",
    ".tar", ".tif", ".tiff", ".ttf", ".wav", ".webm", ".webp", ".woff", ".woff2", ".xz",
}
FILE_SUFFIXES = {".csv", ".doc", ".docx", ".json", ".pdf", ".txt", ".xls", ".xlsx", ".xml", ".zip"}
ORGANIZATION_TYPES = {
    "Organization", "Corporation", "NGO", "NonprofitOrganization", "EducationalOrganization",
    "CollegeOrUniversity", "GovernmentOrganization", "WebSite",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(compact(row) + "\n")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def scrub_public_phrase(value: Any, limit: int = 240) -> str | None:
    text = normalize_space(value)
    if not text:
        return None
    text = EMAIL_PATTERN.sub("[email omitted]", text)
    text = PHONE_PATTERN.sub("[phone omitted]", text)
    text = URL_PATTERN.sub("[url omitted]", text)
    if STREET_PATTERN.search(text):
        return None
    return text[:limit]


def normalize_url(base_url: str, href: str) -> dict[str, Any] | None:
    href = normalize_space(href)
    if not href or href.startswith(("#", "javascript:", "mailto:", "tel:", "data:")):
        return None
    absolute = urllib.parse.urljoin(base_url, href)
    parsed = urllib.parse.urlsplit(absolute)
    if parsed.scheme.lower() not in {"http", "https"}:
        return None
    host = (parsed.hostname or "").lower()
    path = parsed.path or "/"
    no_query = urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, "", ""))
    return {
        "absolute_url": urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, "")),
        "url_without_query": no_query,
        "scheme": parsed.scheme.lower(),
        "host": host,
        "path": path,
        "query_present": bool(parsed.query),
    }


def route_receipt_id(route_id: str) -> str:
    return f"r-schoolhouse-first-party-legal-surface-{route_id}-2026-08-05"


def path_suffix(url: str) -> str:
    try:
        return Path(urllib.parse.urlsplit(url).path).suffix.lower()
    except Exception:
        return ""


def follow_eligible(link: dict[str, Any]) -> bool:
    if link["scheme"] != "https" or link["host"] not in FOLLOW_HOSTS or link["query_present"]:
        return False
    path = link["path"]
    if SKIP_PATH_PATTERN.search(path):
        return False
    suffix = Path(path).suffix.lower()
    if suffix in SKIP_SUFFIXES:
        return False
    return True


def legal_relevant(link: dict[str, Any], anchor_text: str | None) -> bool:
    return bool(LEGAL_RELEVANCE.search(f"{link['path']} {anchor_text or ''}"))


def term_counts(text: str, patterns: dict[str, re.Pattern[str]]) -> dict[str, int]:
    return {key: sum(1 for _ in pattern.finditer(text)) for key, pattern in patterns.items()}


class StrictRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = 6

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> urllib.request.Request | None:
        absolute = urllib.parse.urljoin(req.full_url, newurl)
        parsed = urllib.parse.urlsplit(absolute)
        if parsed.scheme.lower() != "https" or (parsed.hostname or "").lower() not in ALLOWED_REDIRECT_HOSTS:
            raise urllib.error.URLError(f"redirect outside allowed HTTPS host family: {absolute}")
        return super().redirect_request(req, fp, code, msg, headers, absolute)


class SurfaceParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.title_depth = 0
        self.title_parts: list[str] = []
        self.text_parts: list[str] = []
        self.footer_depth = 0
        self.footer_parts: list[str] = []
        self.skip_depth = 0
        self.anchors: list[dict[str, Any]] = []
        self.current_anchor: dict[str, Any] | None = None
        self.forms: list[dict[str, Any]] = []
        self.current_form: dict[str, Any] | None = None
        self.meta: dict[str, str] = {}
        self.canonical_urls: list[str] = []
        self.ldjson_depth = 0
        self.ldjson_parts: list[str] = []
        self.ldjson_blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        values = {key.lower(): value for key, value in attrs}
        if tag == "title":
            self.title_depth += 1
        if tag in {"style", "noscript", "template"}:
            self.skip_depth += 1
        elif tag == "script":
            script_type = normalize_space(values.get("type")).lower()
            if script_type == "application/ld+json":
                self.ldjson_depth += 1
            else:
                self.skip_depth += 1
        elif tag == "footer":
            self.footer_depth += 1
        elif tag == "a":
            href = values.get("href") or ""
            if href:
                self.current_anchor = {"href": href, "text_parts": [], "rel": normalize_space(values.get("rel")) or None}
        elif tag == "form":
            self.current_form = {
                "form_index": len(self.forms) + 1,
                "method": normalize_space(values.get("method") or "GET").upper(),
                "action_raw": values.get("action") or self.base_url,
                "id": normalize_space(values.get("id")) or None,
                "name": normalize_space(values.get("name")) or None,
                "controls": [],
                "hidden_control_count": 0,
            }
            self.forms.append(self.current_form)
        elif tag in {"input", "select", "textarea", "button"} and self.current_form is not None:
            control_type = normalize_space(values.get("type") or tag).lower()
            if control_type == "hidden":
                self.current_form["hidden_control_count"] += 1
            else:
                self.current_form["controls"].append(
                    {
                        "tag": tag,
                        "type": control_type,
                        "name": normalize_space(values.get("name"))[:120] or None,
                        "id": normalize_space(values.get("id"))[:120] or None,
                        "required": "required" in values,
                    }
                )
        elif tag == "meta":
            key = normalize_space(values.get("name") or values.get("property")).lower()
            content = normalize_space(values.get("content"))
            if key in {"description", "og:title", "og:description", "og:site_name", "application-name"} and content:
                sanitized = scrub_public_phrase(content, 300)
                if sanitized:
                    self.meta[key] = sanitized
        elif tag == "link":
            rel = normalize_space(values.get("rel")).lower()
            href = values.get("href") or ""
            if "canonical" in rel and href:
                self.canonical_urls.append(href)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title" and self.title_depth:
            self.title_depth -= 1
        if tag in {"style", "noscript", "template"} and self.skip_depth:
            self.skip_depth -= 1
        elif tag == "script":
            if self.ldjson_depth:
                self.ldjson_depth -= 1
                block = "".join(self.ldjson_parts).strip()
                if block:
                    self.ldjson_blocks.append(block)
                self.ldjson_parts = []
            elif self.skip_depth:
                self.skip_depth -= 1
        elif tag == "footer" and self.footer_depth:
            self.footer_depth -= 1
        elif tag == "a" and self.current_anchor is not None:
            anchor = dict(self.current_anchor)
            anchor["text"] = scrub_public_phrase(" ".join(anchor.pop("text_parts")), 180)
            self.anchors.append(anchor)
            self.current_anchor = None
        elif tag == "form":
            self.current_form = None

    def handle_data(self, data: str) -> None:
        if self.ldjson_depth:
            self.ldjson_parts.append(data)
            return
        if self.skip_depth:
            return
        if self.title_depth:
            self.title_parts.append(data)
        if self.current_anchor is not None:
            self.current_anchor["text_parts"].append(data)
        normalized = normalize_space(data)
        if normalized:
            self.text_parts.append(normalized)
            if self.footer_depth:
                self.footer_parts.append(normalized)

    def result(self) -> dict[str, Any]:
        return {
            "title": scrub_public_phrase(" ".join(self.title_parts), 300),
            "visible_text": normalize_space(" ".join(self.text_parts)),
            "footer_text": normalize_space(" ".join(self.footer_parts)),
            "anchors": self.anchors,
            "forms": self.forms,
            "meta": self.meta,
            "canonical_urls": self.canonical_urls,
            "ldjson_blocks": self.ldjson_blocks,
        }


def iter_json_nodes(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from iter_json_nodes(item)
    elif isinstance(value, list):
        for item in value:
            yield from iter_json_nodes(item)


def json_types(value: Any) -> set[str]:
    if isinstance(value, str):
        return {value}
    if isinstance(value, list):
        return {str(item) for item in value if isinstance(item, str)}
    return set()


def organization_name(value: Any) -> str | None:
    if isinstance(value, str):
        return scrub_public_phrase(value, 240)
    if isinstance(value, dict):
        return scrub_public_phrase(value.get("legalName") or value.get("name"), 240)
    return None


def sanitize_structured_node(node: dict[str, Any]) -> dict[str, Any] | None:
    types = json_types(node.get("@type"))
    if not (types & ORGANIZATION_TYPES):
        return None
    row: dict[str, Any] = {
        "types": sorted(types),
        "name": scrub_public_phrase(node.get("name"), 240),
        "legal_name": scrub_public_phrase(node.get("legalName"), 240),
        "alternate_name": scrub_public_phrase(node.get("alternateName"), 240),
        "founding_date": scrub_public_phrase(node.get("foundingDate"), 80),
        "tax_id": scrub_public_phrase(node.get("taxID"), 80),
        "nonprofit_status": scrub_public_phrase(node.get("nonprofitStatus"), 160),
        "parent_organization_name": organization_name(node.get("parentOrganization")),
        "url": None,
        "same_as_hosts": [],
    }
    url = node.get("url")
    if isinstance(url, str):
        normalized = normalize_url("https://school.house/", url)
        if normalized:
            row["url"] = normalized["url_without_query"]
    same_as = node.get("sameAs")
    values = [same_as] if isinstance(same_as, str) else same_as if isinstance(same_as, list) else []
    hosts = set()
    for item in values:
        if isinstance(item, str):
            try:
                host = (urllib.parse.urlsplit(item).hostname or "").lower()
                if host:
                    hosts.add(host)
            except Exception:
                pass
    row["same_as_hosts"] = sorted(hosts)
    if not any(row.get(key) for key in ["name", "legal_name", "alternate_name", "founding_date", "tax_id", "nonprofit_status", "parent_organization_name", "url", "same_as_hosts"]):
        return None
    row["address_retained"] = False
    row["email_retained"] = False
    row["telephone_retained"] = False
    row["person_names_retained"] = False
    return row


def candidate_rows(route: dict[str, Any], text: str, footer_text: str, structured_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add(candidate_class: str, value: Any, evidence_location: str) -> None:
        sanitized = scrub_public_phrase(value, 260)
        if not sanitized:
            return
        key = (candidate_class, sanitized.casefold())
        if key in seen:
            return
        seen.add(key)
        candidates.append(
            {
                "candidate_id": f"{route['route_id']}-candidate-{len(candidates) + 1:03d}",
                "route_id": route["route_id"],
                "receipt_id": route["receipt_id"],
                "source_url": route["requested_url"],
                "candidate_class": candidate_class,
                "candidate_value": sanitized,
                "evidence_location": evidence_location,
                "identifier_grade": False,
                "registry_grade": False,
                "legal_entity_join_state": "candidate_only_unadjudicated",
                "identity_admitted": False,
                "negative_existence_claim_created": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
        )

    normalized_text = normalize_space(text)
    for match in LEGAL_NAME_PATTERN.finditer(normalized_text):
        add("explicit_schoolhouse_legal_name_candidate", match.group(0), "visible_text_pattern")
    for match in SCHOOLHOUSE_LEGAL_CONTEXT_PATTERN.finditer(normalized_text):
        add("schoolhouse_legal_status_phrase", match.group(0), "visible_text_pattern")
    for match in COPYRIGHT_PATTERN.finditer(normalize_space(footer_text)):
        add("footer_copyright_entity_phrase", match.group(0), "footer")
    for row in structured_rows:
        for field in ["legal_name", "name", "alternate_name", "parent_organization_name", "tax_id", "nonprofit_status"]:
            if row.get(field):
                candidate_class = "structured_data_tax_id_candidate" if field == "tax_id" else f"structured_data_{field}_candidate"
                add(candidate_class, row[field], "json_ld")
    return candidates


def external_route_class(host: str, path: str, anchor_text: str | None) -> str:
    material = f"{host} {path} {anchor_text or ''}".lower()
    if any(term in material for term in ["linkedin.com", "facebook.com", "instagram.com", "youtube.com", "x.com", "twitter.com"]):
        return "public_social_platform"
    if any(term in material for term in ["stripe", "paypal", "checkout", "donate", "payment"]):
        return "donation_or_payment_surface_not_fetched"
    if any(term in material for term in ["irs.gov", "sec.gov", "sos", "secretary", "registry", "charit"]):
        return "potential_official_or_registry_lead"
    if any(term in material for term in ["privacy", "terms", "legal"]):
        return "legal_policy_lead"
    return "external_public_link_not_fetched"


def read_response(response: Any, limit: int) -> tuple[bytes, bool]:
    data = response.read(limit + 1)
    if len(data) > limit:
        return data[:limit], False
    return data, True


def discover_from_xml(text: str, base_url: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return rows
    for element in root.iter():
        if element.tag.lower().endswith("loc") and element.text:
            rows.append({"href": element.text.strip(), "text": None, "discovery_class": "xml_loc"})
    return rows


def discover_from_robots(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key.strip().lower() == "sitemap" and value.strip():
            rows.append({"href": value.strip(), "text": "Sitemap", "discovery_class": "robots_sitemap"})
    return rows


def fetch_route(route: dict[str, Any]) -> dict[str, Any]:
    url = route["requested_url"]
    suffix = path_suffix(url)
    file_target = suffix in FILE_SUFFIXES and suffix not in {".html", ".htm", ".xml", ".txt", ".json"}
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
        "Accept": "text/html,application/xhtml+xml,application/xml,text/xml,text/plain,application/json,application/pdf;q=0.8,*/*;q=0.1",
    }
    if file_target:
        headers["Range"] = f"bytes=0-{MAX_FILE_SAMPLE_BYTES - 1}"
    request = urllib.request.Request(url, method="GET", headers=headers)
    opener = urllib.request.build_opener(StrictRedirectHandler())
    base = {
        **route,
        "request_method": "GET",
        "request_attempts": 1,
        "range_requested": file_target,
        "query_submitted": False,
        "form_submitted": False,
        "application_submitted": False,
        "account_action_submitted": False,
        "payment_action_submitted": False,
        "upload_submitted": False,
        "contact_request_submitted": False,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "visible_text_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
        "promotes_to": "candidate_only",
        "started_at": utc_now(),
    }
    try:
        with opener.open(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            status = int(getattr(response, "status", response.getcode()))
            final_url = response.geturl()
            parsed_final = urllib.parse.urlsplit(final_url)
            final_host = (parsed_final.hostname or "").lower()
            if parsed_final.scheme.lower() != "https" or final_host not in ALLOWED_REDIRECT_HOSTS:
                raise urllib.error.URLError(f"final URL outside allowed HTTPS host family: {final_url}")
            content_type = str(response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
            textual = content_type in {
                "text/html", "application/xhtml+xml", "application/xml", "text/xml", "text/plain",
                "application/json", "application/ld+json",
            } or suffix in {"", ".html", ".htm", ".xml", ".txt", ".json"}
            limit = MAX_TEXT_BODY_BYTES if textual else MAX_FILE_SAMPLE_BYTES
            body, complete = read_response(response, limit)
            if textual and not complete:
                state = "oversized_text_body_guarded"
            elif content_type in {"text/html", "application/xhtml+xml"} or body.lstrip().lower().startswith((b"<!doctype html", b"<html")):
                state = "accessible_html"
            elif content_type in {"application/xml", "text/xml"} or suffix == ".xml":
                state = "accessible_xml"
            elif content_type == "text/plain" or suffix == ".txt":
                state = "accessible_text"
            elif content_type in {"application/json", "application/ld+json"} or suffix == ".json":
                state = "accessible_json"
            else:
                state = "accessible_file_sample"
            return {
                **base,
                "state": state,
                "status": status,
                "final_url": urllib.parse.urlunsplit((parsed_final.scheme.lower(), parsed_final.netloc.lower(), parsed_final.path or "/", "", "")),
                "final_host": final_host,
                "content_type": content_type or None,
                "content_length_header": normalize_space(response.headers.get("Content-Length")) or None,
                "content_range_header": normalize_space(response.headers.get("Content-Range")) or None,
                "captured_bytes": len(body),
                "captured_sha256": sha256_bytes(body),
                "complete_body_hash_claimed": bool(complete and textual),
                "body": body,
                "completed_at": utc_now(),
            }
    except urllib.error.HTTPError as exc:
        return {
            **base,
            "state": "http_error",
            "status": exc.code,
            "final_url": normalize_url(url, exc.geturl())["url_without_query"] if normalize_url(url, exc.geturl()) else None,
            "final_host": (urllib.parse.urlsplit(exc.geturl()).hostname or "").lower(),
            "error_class": type(exc).__name__,
            "error_reason_sha256": sha256_bytes(str(exc.reason).encode("utf-8", errors="replace")),
            "captured_bytes": 0,
            "captured_sha256": None,
            "complete_body_hash_claimed": False,
            "body": b"",
            "completed_at": utc_now(),
        }
    except Exception as exc:
        state = "timeout" if isinstance(exc, TimeoutError) or "timed out" in str(exc).lower() else "transport_error"
        return {
            **base,
            "state": state,
            "status": None,
            "final_url": None,
            "final_host": None,
            "error_class": type(exc).__name__,
            "error_message_sha256": sha256_bytes(str(exc).encode("utf-8", errors="replace")),
            "captured_bytes": 0,
            "captured_sha256": None,
            "complete_body_hash_claimed": False,
            "body": b"",
            "completed_at": utc_now(),
        }


def build_artifact(out_dir: Path) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    queue: deque[dict[str, Any]] = deque()
    seen_urls: set[str] = set()
    scheduled_urls: set[str] = set()
    for root in ROOT_ROUTES:
        normalized = normalize_url(root["url"], root["url"])
        assert normalized is not None
        row = {
            **root,
            "requested_url": normalized["url_without_query"],
            "source_route_id": None,
            "depth": 0,
            "receipt_id": route_receipt_id(root["route_id"]),
        }
        queue.append(row)
        scheduled_urls.add(row["requested_url"])

    route_results: list[dict[str, Any]] = []
    html_surfaces: list[dict[str, Any]] = []
    structured_data_rows: list[dict[str, Any]] = []
    candidate_result_rows: list[dict[str, Any]] = []
    form_rows: list[dict[str, Any]] = []
    discovered_rows: list[dict[str, Any]] = []
    external_rows: list[dict[str, Any]] = []
    follow_counter = 0
    cap_exhausted = False

    while queue and len(route_results) < MAX_TOTAL_ROUTES:
        route = queue.popleft()
        if route["requested_url"] in seen_urls:
            continue
        seen_urls.add(route["requested_url"])
        fetched = fetch_route(route)
        body = fetched.pop("body")
        route_results.append(fetched)
        route_discoveries: list[dict[str, Any]] = []

        if fetched["state"] == "accessible_html":
            text = body.decode("utf-8", errors="replace")
            parser = SurfaceParser(fetched.get("final_url") or route["requested_url"])
            parser.feed(text)
            parsed = parser.result()
            legal_counts = term_counts(parsed["visible_text"], LEGAL_PATTERNS)
            subject_counts = term_counts(parsed["visible_text"], SUBJECT_PATTERNS)
            route_structured: list[dict[str, Any]] = []
            json_ld_parse_errors = 0
            for block_index, block in enumerate(parsed["ldjson_blocks"], start=1):
                try:
                    value = json.loads(block)
                except (json.JSONDecodeError, TypeError):
                    json_ld_parse_errors += 1
                    continue
                for node in iter_json_nodes(value):
                    sanitized = sanitize_structured_node(node)
                    if not sanitized:
                        continue
                    row = {
                        "structured_data_id": f"{route['route_id']}-structured-{len(route_structured) + 1:03d}",
                        "route_id": route["route_id"],
                        "receipt_id": route["receipt_id"],
                        "source_url": route["requested_url"],
                        "block_index": block_index,
                        **sanitized,
                        "identity_admitted": False,
                        "outside_human_dependency": False,
                        "graph_effect": "none",
                        "promotes_to": "candidate_only",
                    }
                    route_structured.append(row)
                    structured_data_rows.append(row)
            route_candidates = candidate_rows(route, parsed["visible_text"], parsed["footer_text"], route_structured)
            candidate_result_rows.extend(route_candidates)
            html_surfaces.append(
                {
                    "route_id": route["route_id"],
                    "receipt_id": route["receipt_id"],
                    "source_url": route["requested_url"],
                    "title": parsed["title"],
                    "meta": parsed["meta"],
                    "visible_text_chars_screened": len(parsed["visible_text"]),
                    "legal_term_counts": legal_counts,
                    "legal_term_total_hits": sum(legal_counts.values()),
                    "subject_term_counts": subject_counts,
                    "subject_term_total_hits": sum(subject_counts.values()),
                    "form_rows": len(parsed["forms"]),
                    "structured_data_rows": len(route_structured),
                    "legal_governance_candidate_rows": len(route_candidates),
                    "json_ld_parse_errors": json_ld_parse_errors,
                    "raw_html_retained": False,
                    "visible_text_retained": False,
                    "footer_text_retained": False,
                    "street_address_rows_retained": 0,
                    "contact_detail_rows_retained": 0,
                    "private_support_rows": 0,
                    "identity_admitted": False,
                    "outside_human_dependency": False,
                    "graph_effect": "none",
                    "promotes_to": "candidate_only",
                }
            )
            for form in parsed["forms"]:
                action = normalize_url(fetched.get("final_url") or route["requested_url"], form.pop("action_raw"))
                control_types = Counter(control["type"] for control in form["controls"])
                named_controls = sorted(
                    {
                        value
                        for control in form["controls"]
                        for value in [control.get("name")]
                        if value and not EMAIL_PATTERN.search(value) and not PHONE_PATTERN.search(value)
                    }
                )[:80]
                form_rows.append(
                    {
                        "form_id": f"{route['route_id']}-form-{form['form_index']:03d}",
                        "route_id": route["route_id"],
                        "receipt_id": route["receipt_id"],
                        "source_url": route["requested_url"],
                        "form_index": form["form_index"],
                        "method": form["method"],
                        "id": form["id"],
                        "name": form["name"],
                        "action_host": action["host"] if action else None,
                        "action_path": action["path"] if action else None,
                        "action_query_present": action["query_present"] if action else False,
                        "action_same_schoolhouse_host": action["host"] in FOLLOW_HOSTS if action else False,
                        "control_type_counts": dict(sorted(control_types.items())),
                        "named_controls": named_controls,
                        "hidden_control_count": form["hidden_control_count"],
                        "hidden_values_retained": False,
                        "control_values_retained": False,
                        "query_submitted": False,
                        "form_submitted": False,
                        "identity_admitted": False,
                        "outside_human_dependency": False,
                        "graph_effect": "none",
                        "promotes_to": "candidate_only",
                    }
                )
            for anchor in parsed["anchors"]:
                route_discoveries.append({**anchor, "discovery_class": "html_anchor"})
            for canonical in parsed["canonical_urls"]:
                route_discoveries.append({"href": canonical, "text": "Canonical", "discovery_class": "html_canonical"})
        elif fetched["state"] == "accessible_xml":
            text = body.decode("utf-8", errors="replace")
            route_discoveries.extend(discover_from_xml(text, fetched.get("final_url") or route["requested_url"]))
        elif fetched["state"] == "accessible_text":
            text = body.decode("utf-8", errors="replace")
            route_discoveries.extend(discover_from_robots(text))

        normalized_discoveries: dict[tuple[str, str], dict[str, Any]] = {}
        for item in route_discoveries:
            normalized = normalize_url(fetched.get("final_url") or route["requested_url"], item.get("href") or "")
            if not normalized:
                continue
            anchor_text = scrub_public_phrase(item.get("text"), 180)
            key = (normalized["absolute_url"], item.get("discovery_class") or "unknown")
            if key in normalized_discoveries:
                continue
            eligible = follow_eligible(normalized)
            relevant = legal_relevant(normalized, anchor_text)
            row = {
                "discovery_id": f"{route['route_id']}-link-{len(normalized_discoveries) + 1:04d}",
                "source_route_id": route["route_id"],
                "source_receipt_id": route["receipt_id"],
                "source_url": route["requested_url"],
                "discovery_class": item.get("discovery_class") or "unknown",
                "href": normalized["absolute_url"],
                "href_without_query": normalized["url_without_query"],
                "scheme": normalized["scheme"],
                "host": normalized["host"],
                "path": normalized["path"],
                "query_present": normalized["query_present"],
                "query_value_retained": False,
                "anchor_text": anchor_text,
                "same_schoolhouse_host": normalized["host"] in FOLLOW_HOSTS,
                "fixed_connect_host": normalized["host"] == FIXED_CONNECT_HOST,
                "eligible_follow": eligible,
                "legal_governance_relevant": relevant,
                "query_submission_required": False,
                "identity_admitted": False,
                "outside_human_dependency": False,
                "graph_effect": "none",
                "promotes_to": "candidate_only",
            }
            normalized_discoveries[key] = row
            discovered_rows.append(row)
            if normalized["host"] not in FOLLOW_HOSTS:
                external_rows.append(
                    {
                        "external_link_id": f"{route['route_id']}-external-{len(external_rows) + 1:05d}",
                        "source_route_id": route["route_id"],
                        "source_receipt_id": route["receipt_id"],
                        "source_url": route["requested_url"],
                        "host": normalized["host"],
                        "path": normalized["path"],
                        "scheme": normalized["scheme"],
                        "query_present": normalized["query_present"],
                        "query_value_retained": False,
                        "anchor_text": anchor_text,
                        "legal_governance_relevant": relevant,
                        "route_class": external_route_class(normalized["host"], normalized["path"], anchor_text),
                        "fetched": False,
                        "query_submitted": False,
                        "identity_admitted": False,
                        "outside_human_dependency": False,
                        "graph_effect": "none",
                        "promotes_to": "candidate_only",
                    }
                )

        if route["depth"] < MAX_DEPTH:
            follow_candidates = [row for row in normalized_discoveries.values() if row["eligible_follow"]]
            follow_candidates.sort(key=lambda row: (not row["legal_governance_relevant"], row["href_without_query"]))
            for link in follow_candidates:
                target = link["href_without_query"]
                if target in seen_urls or target in scheduled_urls:
                    continue
                if len(seen_urls) + len(queue) >= MAX_TOTAL_ROUTES:
                    cap_exhausted = True
                    break
                follow_counter += 1
                next_route = {
                    "route_id": f"follow-{follow_counter:03d}",
                    "root_id": route["root_id"],
                    "surface": "schoolhouse_same_host_static_follow",
                    "requested_url": target,
                    "source_route_id": route["route_id"],
                    "depth": route["depth"] + 1,
                    "receipt_id": route_receipt_id(f"follow-{follow_counter:03d}"),
                }
                queue.append(next_route)
                scheduled_urls.add(target)

    if queue:
        cap_exhausted = True

    root_ids = {row["route_id"] for row in ROOT_ROUTES}
    root_results = [row for row in route_results if row["route_id"] in root_ids]
    followed_results = [row for row in route_results if row["route_id"] not in root_ids]
    terminal_states = Counter(row["state"] for row in route_results)
    status_counts = Counter(str(row["status"]) if row["status"] is not None else "none" for row in route_results)
    unique_discovered_urls = {row["href"] for row in discovered_rows}
    unique_external_hosts = {row["host"] for row in external_rows if row["host"]}
    legal_total_hits = sum(row["legal_term_total_hits"] for row in html_surfaces)
    subject_total_hits = sum(row["subject_term_total_hits"] for row in html_surfaces)

    write_jsonl(out_dir / "root-route-results.jsonl", root_results)
    write_jsonl(out_dir / "followed-route-results.jsonl", followed_results)
    write_jsonl(out_dir / "discovered-links.jsonl", discovered_rows)
    write_jsonl(out_dir / "html-surfaces.jsonl", html_surfaces)
    write_jsonl(out_dir / "structured-data.jsonl", structured_data_rows)
    write_jsonl(out_dir / "legal-governance-candidates.jsonl", candidate_result_rows)
    write_jsonl(out_dir / "external-link-inventory.jsonl", external_rows)
    write_jsonl(out_dir / "form-metadata.jsonl", form_rows)

    summary = {
        "schema_version": SCHEMA_VERSION,
        "as_of": "2026-08-05",
        "declared_root_routes": len(ROOT_ROUTES),
        "terminal_root_routes": len(root_results),
        "followed_routes": len(followed_results),
        "terminal_route_rows": len(route_results),
        "all_routes_terminal": len(route_results) == len(root_results) + len(followed_results),
        "maximum_total_routes": MAX_TOTAL_ROUTES,
        "maximum_depth": MAX_DEPTH,
        "route_cap_exhausted": cap_exhausted,
        "deepest_followed_depth": max((row["depth"] for row in route_results), default=0),
        "discovered_link_rows": len(discovered_rows),
        "unique_discovered_links": len(unique_discovered_urls),
        "same_schoolhouse_host_link_rows": sum(1 for row in discovered_rows if row["same_schoolhouse_host"]),
        "legal_governance_relevant_link_rows": sum(1 for row in discovered_rows if row["legal_governance_relevant"]),
        "external_link_rows": len(external_rows),
        "unique_external_hosts": len(unique_external_hosts),
        "html_surface_rows": len(html_surfaces),
        "structured_data_rows": len(structured_data_rows),
        "legal_governance_candidate_rows": len(candidate_result_rows),
        "explicit_schoolhouse_legal_name_candidate_rows": sum(1 for row in candidate_result_rows if row["candidate_class"] == "explicit_schoolhouse_legal_name_candidate"),
        "schoolhouse_legal_status_phrase_rows": sum(1 for row in candidate_result_rows if row["candidate_class"] == "schoolhouse_legal_status_phrase"),
        "footer_copyright_candidate_rows": sum(1 for row in candidate_result_rows if row["candidate_class"] == "footer_copyright_entity_phrase"),
        "legal_term_total_hits": legal_total_hits,
        "subject_term_hit_rows": sum(1 for row in html_surfaces if row["subject_term_total_hits"] > 0),
        "subject_term_total_hits": subject_total_hits,
        "form_rows": len(form_rows),
        "terminal_states": dict(sorted(terminal_states.items())),
        "http_statuses": dict(sorted(status_counts.items())),
        "search_submissions": 0,
        "form_submissions": 0,
        "application_submissions": 0,
        "account_actions": 0,
        "payment_actions": 0,
        "upload_actions": 0,
        "contact_requests": 0,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "visible_text_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    write_json(out_dir / "summary.json", summary)

    route_policy = {
        "schema_version": "schoolhouse-first-party-legal-surface-policy@1",
        "fixed_roots": ROOT_ROUTES,
        "allowed_follow_hosts": sorted(FOLLOW_HOSTS),
        "fixed_connect_url_only": "https://connect.bv.vc/schoolhouse",
        "maximum_total_routes": MAX_TOTAL_ROUTES,
        "maximum_depth": MAX_DEPTH,
        "maximum_text_body_bytes": MAX_TEXT_BODY_BYTES,
        "maximum_file_sample_bytes": MAX_FILE_SAMPLE_BYTES,
        "request_methods": ["GET"],
        "query_string_routes_followed": 0,
        "external_links_fetched": 0,
        "forbidden_actions": [
            "interactive search or query submission",
            "form, application, account, payment, upload, or contact submission",
            "broad connect.bv.vc crawl",
            "external-link fetch before a separate fixed allowlist",
            "raw HTML, visible full text, hidden values, contact details, or street-address retention",
            "identity admission from first-party wording, metadata, footer text, or structured data alone",
        ],
        "candidate_boundary": "First-party legal-status language, footer entities, JSON-LD names, tax IDs, and external registry leads remain candidate-only. Registry-grade identifier, time, place, organization-class, and brand convergence is still required.",
        "search_submissions": 0,
        "source_rows_acquired": 0,
        "raw_source_retained": False,
        "visible_text_retained": False,
        "hidden_form_values_retained": False,
        "street_address_rows_retained": 0,
        "contact_detail_rows_retained": 0,
        "private_support_rows": 0,
        "identity_admitted": False,
        "negative_existence_claim_created": False,
        "outside_human_dependency": False,
        "publication_effect": "none",
        "adoption_effect": "none",
        "graph_effect": "none",
    }
    write_json(out_dir / "route-policy.json", route_policy)

    artifact_files = [
        "root-route-results.jsonl",
        "followed-route-results.jsonl",
        "discovered-links.jsonl",
        "html-surfaces.jsonl",
        "structured-data.jsonl",
        "legal-governance-candidates.jsonl",
        "external-link-inventory.jsonl",
        "form-metadata.jsonl",
        "summary.json",
        "route-policy.json",
    ]
    artifact_manifest = {
        "schema_version": "schoolhouse-first-party-legal-surface-artifact-manifest@1",
        "created_at": utc_now(),
        "files": {
            name: {"bytes": (out_dir / name).stat().st_size, "sha256": sha256_file(out_dir / name)}
            for name in artifact_files
        },
        "terminal_route_rows": len(route_results),
        "legal_governance_candidate_rows": len(candidate_result_rows),
        "outside_human_dependency": False,
        "graph_effect": "none",
    }
    write_json(out_dir / "artifact-manifest.json", artifact_manifest)
    checksum_files = artifact_files + ["artifact-manifest.json"]
    with (out_dir / "SHA256SUMS").open("w", encoding="utf-8", newline="\n") as handle:
        for name in checksum_files:
            handle.write(f"{sha256_file(out_dir / name)}  {name}\n")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    summary = build_artifact(args.out)
    print(json.dumps(summary, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
