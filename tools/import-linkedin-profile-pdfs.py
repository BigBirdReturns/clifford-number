#!/usr/bin/env python3
"""Preserve LinkedIn-generated profile PDFs as private discovery receipts."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import unicodedata
from urllib.parse import urlsplit, urlunsplit

try:
    from pypdf import PdfReader
except ImportError as error:  # pragma: no cover - exercised by the wrapper failure path
    raise SystemExit("Missing dependency: install pypdf in the selected Python environment") from error


ROOT = Path(__file__).resolve().parents[1]
INVISIBLE = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
PDF_DATE = re.compile(
    r"^D:(?P<year>\d{4})(?P<month>\d{2})?(?P<day>\d{2})?"
    r"(?P<hour>\d{2})?(?P<minute>\d{2})?(?P<second>\d{2})?"
    r"(?P<zone>Z|[+-]\d{2}'?\d{2}'?)?$"
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import LinkedIn-generated profile PDFs into private, non-graphing intake."
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        action="append",
        dest="inputs",
        help="Directory containing saved profile PDFs; repeat to merge archives",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/local/linkedin-profile-captures.jsonl"),
        help="Private JSONL manifest path (default: data/local/linkedin-profile-captures.jsonl)",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("data/local/linkedin-profile-captures/raw"),
        help="Private content-addressed PDF copy directory",
    )
    parser.add_argument(
        "--existing-manifest",
        action="append",
        type=Path,
        default=[],
        help="Additional private capture manifest to merge before inspecting inputs",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace the output manifest instead of merging its existing rows",
    )
    parser.add_argument(
        "--no-copy-raw",
        action="store_true",
        help="Index source PDFs without creating private content-addressed copies",
    )
    return parser.parse_args()


def resolved(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", INVISIBLE.sub("", str(value or ""))).strip()


def parse_pdf_date(value: object) -> dt.datetime | None:
    raw = clean(value)
    match = PDF_DATE.match(raw)
    if not match:
        return None
    fields = match.groupdict()
    zone = fields["zone"]
    timezone = dt.timezone.utc
    if zone and zone != "Z":
        sign = 1 if zone[0] == "+" else -1
        digits = re.sub(r"\D", "", zone[1:])
        timezone = dt.timezone(sign * dt.timedelta(hours=int(digits[:2]), minutes=int(digits[2:4])))
    return dt.datetime(
        int(fields["year"]),
        int(fields["month"] or 1),
        int(fields["day"] or 1),
        int(fields["hour"] or 0),
        int(fields["minute"] or 0),
        int(fields["second"] or 0),
        tzinfo=timezone,
    ).astimezone(dt.timezone.utc)


def canonical_linkedin_url(reader: PdfReader) -> str | None:
    urls: list[str] = []
    for page in reader.pages:
        for reference in page.get("/Annots", []):
            annotation = reference.get_object()
            action = annotation.get("/A")
            uri = clean(action.get("/URI")) if action else ""
            if "linkedin.com/in/" in uri.lower() or "linkedin.com/company/" in uri.lower():
                urls.append(uri)
    if not urls:
        return None
    parts = urlsplit(urls[0])
    path = re.sub(r"/+$", "", parts.path)
    return urlunsplit((parts.scheme or "https", parts.netloc.lower(), path, "", ""))


def displayed_name(reader: PdfReader) -> tuple[str | None, float | None]:
    fragments: list[tuple[float, str]] = []

    def visitor(text, _cm, _tm, _font, size):
        value = clean(text)
        if value:
            fragments.append((float(size or 0), value))

    reader.pages[0].extract_text(visitor_text=visitor)
    if not fragments:
        return None, None
    largest = max(size for size, _ in fragments)
    candidates = []
    for size, value in fragments:
        if abs(size - largest) < 0.01 and value not in candidates:
            candidates.append(value)
    return clean(" ".join(candidates)) or None, largest


def series_id(profile_url: str | None, name: str | None) -> str:
    key = profile_url or unicodedata.normalize("NFKC", clean(name)).casefold()
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    return f"liseries_{digest}"


def inspect_pdf(source: Path, input_root: Path, imported_at: str, raw_dir: Path | None) -> dict:
    payload = source.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    capture_id = f"liprof_{digest[:24]}"
    reader = PdfReader(source)
    name, name_font_size = displayed_name(reader)
    profile_url = canonical_linkedin_url(reader)
    pdf_date_raw = clean((reader.metadata or {}).get("/CreationDate"))
    pdf_date = parse_pdf_date(pdf_date_raw)
    mtime = dt.datetime.fromtimestamp(source.stat().st_mtime, dt.timezone.utc)
    observed = pdf_date or mtime
    raw_copy = None
    if raw_dir is not None:
        raw_dir.mkdir(parents=True, exist_ok=True)
        destination = raw_dir / f"{capture_id}.pdf"
        if not destination.exists() or hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            temporary = destination.with_suffix(".pdf.tmp")
            shutil.copyfile(source, temporary)
            os.replace(temporary, destination)
        raw_copy = destination.relative_to(ROOT).as_posix() if destination.is_relative_to(ROOT) else str(destination)

    return {
        "schema_version": "linkedin-profile-capture@1",
        "capture_id": capture_id,
        "series_id": series_id(profile_url, name),
        "source_platform": "linkedin",
        "source_class": "user_preserved_profile_pdf",
        "observation_mode": "retrospective_archive",
        "observed_at": observed.isoformat().replace("+00:00", "Z"),
        "observed_at_source": "pdf_metadata_creation_date" if pdf_date else "filesystem_last_write_time",
        "subject": {
            "entity_type": "person",
            "label": name,
            "profile_url": profile_url,
            "extraction": "machine_extracted_from_pdf_visual_layer",
        },
        "observation": (
            f"A LinkedIn-generated profile PDF displayed {name or 'an unresolved profile'} at capture time. "
            "This records what the profile displayed; it does not independently verify every profile claim, "
            "identity match, relationship, motive, or coordination."
        ),
        "evidence_layer": "documented_fact",
        # This row proves that a profile artifact was captured. Any later role
        # or biography claims extracted from its contents must be separate
        # self_claimed records.
        "evidence_state": "observed",
        "causal_status": "not_established",
        "source_availability": "private_local_artifact",
        "provenance": {
            "archive_file": source.relative_to(input_root).as_posix(),
            "source_sha256": digest,
            "byte_length": len(payload),
            "page_count": len(reader.pages),
            "pdf_creation_date_raw": pdf_date_raw or None,
            "filesystem_last_write_utc": mtime.isoformat().replace("+00:00", "Z"),
            "timestamp_delta_seconds": abs((pdf_date - mtime).total_seconds()) if pdf_date else None,
            "name_font_size": name_font_size,
            "raw_copy": raw_copy,
            "imported_at": imported_at,
        },
        "publication_status": "private_intake",
        "graph_effect": "none",
        "verification_status": "machine_proposed_unverified",
    }


def main() -> int:
    args = arguments()
    input_roots = [path.resolve() for path in args.inputs]
    for input_root in input_roots:
        if not input_root.is_dir():
            raise SystemExit(f"--input must be a directory: {input_root}")
    output = resolved(args.output).resolve()
    raw_dir = None if args.no_copy_raw else resolved(args.raw_dir).resolve()
    imported_at = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    sources = sorted(
        ((source, input_root) for input_root in input_roots for source in input_root.rglob("*.pdf")),
        key=lambda pair: pair[0].as_posix().casefold(),
    )
    rows_by_hash: dict[str, dict] = {}
    errors: list[str] = []
    existing_manifests = [resolved(path).resolve() for path in args.existing_manifest]
    if output.exists() and not args.replace and output not in existing_manifests:
        existing_manifests.append(output)
    existing_rows = 0
    for manifest in existing_manifests:
        if not manifest.is_file():
            raise SystemExit(f"--existing-manifest must be a JSONL file: {manifest}")
        for line_number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
                digest = row["provenance"]["source_sha256"]
                if not re.fullmatch(r"[0-9a-f]{64}", digest):
                    raise ValueError("invalid source_sha256")
                rows_by_hash.setdefault(digest, row)
                existing_rows += 1
            except Exception as error:
                raise SystemExit(f"Invalid existing manifest row {manifest}:{line_number}: {error}") from error
    existing_distinct = len(rows_by_hash)
    for source, input_root in sources:
        try:
            row = inspect_pdf(source, input_root, imported_at, raw_dir)
            rows_by_hash.setdefault(row["provenance"]["source_sha256"], row)
        except Exception as error:  # preserve a bounded failure list without halting other captures
            errors.append(f"{source.relative_to(input_root).as_posix()}: {error}")

    rows = sorted(rows_by_hash.values(), key=lambda row: (row["observed_at"], row["capture_id"]))
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    os.replace(temporary, output)

    subjects = {row["series_id"] for row in rows}
    earliest = rows[0]["observed_at"] if rows else "n/a"
    latest = rows[-1]["observed_at"] if rows else "n/a"
    print(f"LinkedIn profile-PDF intake: {len(rows)} distinct capture(s), {len(subjects)} profile series")
    print(f"  observed range: {earliest} through {latest}")
    print(
        f"  source PDFs: {len(sources)} across {len(input_roots)} input root(s); "
        f"new distinct captures: {len(rows) - existing_distinct}"
    )
    if existing_manifests:
        print(
            f"  existing manifest rows: {existing_rows} across {len(existing_manifests)} manifest(s); "
            f"distinct captures retained: {existing_distinct}"
        )
    print(f"  private manifest: {output}")
    if raw_dir is not None:
        print(f"  private raw copies: {raw_dir}")
    if errors:
        print(f"  extraction errors: {len(errors)}", file=sys.stderr)
        for error in errors:
            print(f"    {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
