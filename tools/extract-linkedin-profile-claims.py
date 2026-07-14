#!/usr/bin/env python3
"""Extract privacy-projected, self-claimed roles from preserved LinkedIn PDFs."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SPACE = re.compile(r"\s+")
PAGE_FOOTER = re.compile(r"^Page\s+\d+\s+of\s+\d+$", re.IGNORECASE)
MONTH = (
    r"January|February|March|April|May|June|July|August|September|October|November|December|"
    r"Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec"
)
DATE_VALUE = rf"(?:(?:{MONTH})\s+)?\d{{4}}"
DATE_RANGE = re.compile(
    rf"^(?P<start>{DATE_VALUE})\s*[-\u2013\u2014]\s*(?P<end>Present|{DATE_VALUE})"
    r"(?:\s*\([^)]*\))?$",
    re.IGNORECASE,
)
SECTION_ENDS = {
    "education",
    "licenses & certifications",
    "licenses and certifications",
    "volunteer experience",
    "publications",
    "projects",
    "honors & awards",
    "honors and awards",
    "languages",
    "recommendations received",
}
BLOCKED_LABELS = {
    "contact",
    "top skills",
    "summary",
    "experience",
}
EMAIL = re.compile(r"\b[^\s@]+@[^\s@]+\.[^\s@]+\b")
PHONE = re.compile(r"(?:\+?\d[\d .()\-]{7,}\d)")
DURATION_ONLY = re.compile(
    r"^(?=\S)(?:(?:less than|about)\s+)?(?:(?:\d+)\s+years?)?(?:\s*(?:\d+)\s+months?)?$",
    re.IGNORECASE,
)
DESCRIPTION_START = re.compile(
    r"^(responsible|working|worked|managed|led|designed|developed|provided|supported|created|built|"
    r"collaborat|timely|key insight|overview|along with|produced|generated|performed|performing|establish)",
    re.IGNORECASE,
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract self-claimed role tuples from a private LinkedIn profile-PDF manifest."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/local/linkedin-profile-captures.jsonl"),
        help="Profile-capture manifest (default: data/local/linkedin-profile-captures.jsonl)",
    )
    parser.add_argument(
        "--artifact-root",
        type=Path,
        default=ROOT,
        help="Root used to resolve provenance.raw_copy paths (default: repository root)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/local/linkedin-profile-role-claims.jsonl"),
        help="Private output JSONL path",
    )
    parser.add_argument("--self-test", action="store_true", help=argparse.SUPPRESS)
    return parser.parse_args()


def resolved(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def clean(value: object) -> str:
    return SPACE.sub(" ", str(value or "").replace("\u200b", "")).strip()


def safe_public_label(value: str) -> bool:
    label = clean(value)
    return bool(
        label
        and label.casefold() not in BLOCKED_LABELS
        and not EMAIL.search(label)
        and not PHONE.search(label)
        and "linkedin.com/" not in label.casefold()
        and len(label) <= 240
    )


def iso_month(value: str, *, end: bool = False) -> str | None:
    cleaned = clean(value)
    if cleaned.casefold() == "present":
        return None
    for pattern in ("%B %Y", "%b %Y", "%Y"):
        try:
            parsed = dt.datetime.strptime(cleaned, pattern)
            if pattern == "%Y" and end:
                return f"{parsed.year:04d}-12-31"
            if end:
                next_month = (parsed.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
                return (next_month - dt.timedelta(days=1)).date().isoformat()
            return parsed.date().replace(day=1).isoformat()
        except ValueError:
            continue
    return None


def normalized_lines(reader: Any) -> list[tuple[int, str]]:
    output: list[tuple[int, str]] = []
    for page_number, page in enumerate(reader.pages, start=1):
        for raw in (page.extract_text() or "").splitlines():
            line = clean(raw)
            if line and not PAGE_FOOTER.match(line):
                output.append((page_number, line))
    return output


def experience_lines(lines: list[tuple[int, str]]) -> list[tuple[int, str]]:
    start = next((i for i, (_, value) in enumerate(lines) if value.casefold() == "experience"), None)
    if start is None:
        return []
    result: list[tuple[int, str]] = []
    for page_number, value in lines[start + 1 :]:
        if value.casefold() in SECTION_ENDS:
            break
        result.append((page_number, value))
    return result


def role_candidates(lines: list[tuple[int, str]]) -> list[dict]:
    candidates: list[dict] = []
    active_group: str | None = None
    for index, (page_number, value) in enumerate(lines):
        match = DATE_RANGE.match(value)
        if not match or index < 2:
            continue
        title = lines[index - 1][1]
        preceding = lines[index - 2][1]
        if not safe_public_label(title):
            continue
        if DURATION_ONLY.match(preceding) and index >= 3 and safe_public_label(lines[index - 3][1]):
            organization = lines[index - 3][1]
            active_group = organization
        elif active_group and not looks_like_organization(preceding):
            organization = active_group
        else:
            organization = preceding
            active_group = None
        if not safe_public_label(organization) or organization.casefold() == title.casefold():
            continue
        candidates.append(
            {
                "organization": organization,
                "title": title,
                "stated_start_raw": match.group("start"),
                "stated_end_raw": match.group("end"),
                "stated_start": iso_month(match.group("start")),
                "stated_end": iso_month(match.group("end"), end=True),
                "source_page": page_number,
            }
        )
    return candidates


def looks_like_organization(value: str) -> bool:
    label = clean(value)
    if not safe_public_label(label) or DESCRIPTION_START.match(label) or label.endswith((":", ";")):
        return False
    if re.search(r"\b(inc|llc|ltd|limited|corp|corporation|company|group|university|department|agency|"
                 r"ministry|foundation|institute|systems|technologies|solutions|partners|ventures)\b", label, re.I):
        return True
    words = [word for word in re.split(r"\s+", label) if re.search(r"[A-Za-z]", word)]
    if not words:
        return False
    titled = sum(bool(re.match(r"^[A-Z0-9&][A-Za-z0-9&'./()\-]*$", word)) for word in words)
    return titled / len(words) >= 0.65


def self_test() -> int:
    fixture = [
        (1, "Simple Company LLC"),
        (1, "Director of Programs"),
        (1, "January 2020 - March 2022 (2 years 3 months)"),
        (1, "Description text that is deliberately not retained."),
        (1, "Grouped Systems"),
        (1, "6 years 2 months"),
        (1, "Program Manager"),
        (1, "April 2022 - Present (4 years)"),
        (2, "Responsible for a portfolio of programs"),
        (2, "Senior Analyst"),
        (2, "May 2020 - March 2022 (1 year 11 months)"),
        (2, "Next Organization Inc."),
        (2, "Advisor"),
        (2, "2018 - 2020 (2 years)"),
    ]
    roles = role_candidates(fixture)
    expected = [
        ("Simple Company LLC", "Director of Programs"),
        ("Grouped Systems", "Program Manager"),
        ("Grouped Systems", "Senior Analyst"),
        ("Next Organization Inc.", "Advisor"),
    ]
    actual = [(row["organization"], row["title"]) for row in roles]
    if actual != expected:
        print(f"self-test failed: {actual!r}", file=sys.stderr)
        return 1
    print("extract-linkedin-profile-claims.py: self-test OK")
    return 0


def claim_row(capture: dict, candidate: dict) -> dict:
    subject = capture.get("subject") or {}
    provenance = capture.get("provenance") or {}
    key = "\0".join(
        [
            str(capture.get("capture_id") or ""),
            str(candidate["organization"]),
            str(candidate["title"]),
            str(candidate["stated_start_raw"]),
            str(candidate["stated_end_raw"]),
        ]
    )
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    return {
        "schema_version": "linkedin-profile-role-claim@1",
        "claim_id": f"lirole_{digest}",
        "capture_id": capture.get("capture_id"),
        "series_id": capture.get("series_id"),
        "source_platform": "linkedin",
        "source_class": "user_preserved_profile_pdf",
        "observed_at": capture.get("observed_at"),
        "subject": {
            "entity_type": "person",
            "label": subject.get("label"),
            "profile_url": subject.get("profile_url"),
        },
        "predicate": "self_claimed_role_at",
        "object": {
            "entity_type": "organization",
            "label": candidate["organization"],
        },
        "role_title": candidate["title"],
        "stated_interval": {
            "start_raw": candidate["stated_start_raw"],
            "end_raw": candidate["stated_end_raw"],
            "start": candidate["stated_start"],
            "end": candidate["stated_end"],
            "open_ended": candidate["stated_end_raw"].casefold() == "present",
        },
        "evidence_state": "self_claimed",
        "verification_status": "machine_extracted_pending_review",
        "graph_effect": "none",
        "claim_scope": (
            "The preserved LinkedIn-generated PDF displayed this role tuple at capture time. "
            "It does not independently verify the underlying employment, legal identity, control, "
            "ownership, transaction, influence, coordination, or wrongdoing."
        ),
        "provenance": {
            "source_sha256": provenance.get("source_sha256"),
            "source_page": candidate["source_page"],
            "raw_copy": provenance.get("raw_copy"),
        },
        "privacy_projection": {
            "retained": ["displayed_name", "profile_url", "organization", "role_title", "stated_interval"],
            "excluded": ["phone", "email", "street_address", "narrative_description", "skills"],
        },
        "receipt_eligibility": {
            "eligible_roles": ["self_claimed_identity", "self_claimed_role", "self_claimed_affiliation"],
            "ineligible_roles": ["independent_identity", "beneficial_ownership", "transaction", "wrongdoing"],
        },
    }


def main() -> int:
    args = arguments()
    if args.self_test:
        return self_test()
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise SystemExit("Missing dependency: install pypdf in the selected Python environment") from error
    input_path = resolved(args.input).resolve()
    artifact_root = args.artifact_root.resolve()
    output_path = resolved(args.output).resolve()
    if not input_path.is_file():
        raise SystemExit(f"Input manifest not found: {input_path}")

    captures = [json.loads(line) for line in input_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    rows: list[dict] = []
    failures: list[dict] = []
    for capture in captures:
        raw_copy = Path(str((capture.get("provenance") or {}).get("raw_copy") or ""))
        pdf_path = raw_copy if raw_copy.is_absolute() else artifact_root / raw_copy
        try:
            reader = PdfReader(pdf_path)
            candidates = role_candidates(experience_lines(normalized_lines(reader)))
            if not candidates:
                failures.append({"capture_id": capture.get("capture_id"), "reason": "no_role_tuple_extracted"})
            rows.extend(claim_row(capture, candidate) for candidate in candidates)
        except Exception as error:
            failures.append({"capture_id": capture.get("capture_id"), "reason": clean(error)[:240]})

    rows.sort(key=lambda row: (str(row["observed_at"]), str(row["claim_id"])))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    os.replace(temporary, output_path)

    print(f"LinkedIn profile role extraction: {len(rows)} role claim(s) from {len(captures)} capture(s)")
    print(f"  profile series: {len({row['series_id'] for row in rows})}")
    print(f"  organizations: {len({row['object']['label'].casefold() for row in rows})}")
    print(f"  private output: {output_path}")
    print(f"  captures requiring review: {len(failures)}")
    for failure in failures[:20]:
        print(f"    {failure['capture_id']}: {failure['reason']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
