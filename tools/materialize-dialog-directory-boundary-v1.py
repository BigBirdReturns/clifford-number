#!/usr/bin/env python3
"""Apply the bounded Dialog source transaction and run the canonical release gate."""

from __future__ import annotations

from pathlib import Path
import subprocess
import sys

SOURCE_COMMIT = "17b15fe2149c0db5e25dbd81c0c9f8edc285aaad"
SOURCE_PATH = "tools/materialize-dialog-directory-boundary-v1.py"
OLD = "dialog-society-membership"
DIRECTORY = "dialog-public-directory-exposure-2026-06-16"
STALE_COUNT = "11" + "3"
CURRENT_COUNT = "11" + "2"


def lines(*rows: str) -> str:
    return "\n".join(rows) + "\n"


def replace_once(text: str, old: str, new: str, *, seam: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one {seam} seam, observed {count}")
    return text.replace(old, new, 1)


def annotation_escape(value: str) -> str:
    return value.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def run_checked(label: str, command: list[str]) -> None:
    print(f"\n===== {label} =====", flush=True)
    result = subprocess.run(command, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout, end="" if result.stdout.endswith("\n") else "\n")
    if result.stderr:
        print(result.stderr, end="" if result.stderr.endswith("\n") else "\n", file=sys.stderr)
    if result.returncode:
        detail = (result.stdout + "\n" + result.stderr).strip()
        tail = detail[-20000:] if detail else f"exit code {result.returncode} with no output"
        message = f"{label} failed: {' '.join(command)}\n{tail}"
        print(f"::error title=Dialog transaction::{annotation_escape(message)}")
        raise SystemExit(result.returncode)


def recover_and_patch_materializer() -> Path:
    text = subprocess.check_output(
        ["git", "show", f"{SOURCE_COMMIT}:{SOURCE_PATH}"],
        text=True,
    )
    stale_count = text.count(STALE_COUNT)
    if stale_count != 9:
        raise SystemExit(f"unexpected stale directory-count occurrences: {stale_count}")
    text = text.replace(STALE_COUNT, CURRENT_COUNT)

    text = replace_once(
        text,
        lines(
            '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]',
            '    if len(rows) != 116 or len(listings) != 112 or len(officers) != 3:',
            '        raise SystemExit(',
            '            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} officers={len(officers)}"',
            '        )',
        ),
        lines(
            '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]',
            '    organizations = [row for row in rows if row.get("participant_type") == "organization"]',
            '    if len(rows) != 116 or len(listings) != 112 or len(officers) != 3 or len(organizations) != 1:',
            '        raise SystemExit(',
            '            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} "',
            '            f"officers={len(officers)} organizations={len(organizations)}"',
            '        )',
        ),
        seam="source-denominator",
    )
    text = replace_once(
        text,
        lines(
            '    if officer_roles != EXPECTED_OFFICERS:',
            '        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")',
            '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):',
        ),
        lines(
            '    if officer_roles != EXPECTED_OFFICERS:',
            '        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")',
            '    if [row.get("organization_id") for row in organizations] != ["dialog"]:',
            '        raise SystemExit(f"unexpected Dialog organization rows: {organizations}")',
            '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):',
        ),
        seam="organization-denominator",
    )
    text = replace_once(
        text,
        lines(
            '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]',
            '    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)',
        ),
        lines(
            '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]',
            '    organization_rows = [row for row in old_rows if row.get("participant_type") == "organization"]',
            '    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)',
        ),
        seam="organization-extraction",
    )
    text = replace_once(
        text,
        lines('    invitation_row = {'),
        lines(
            '    new_organization_rows = []',
            '    for source in organization_rows:',
            '        row = dict(source)',
            '        row["surface_id"] = DIRECTORY',
            '        row["role"] = "Dialog organization named as the public-directory host"',
            '        row["participation_type"] = "organization_context"',
            '        row["time_start"] = OBSERVED_AT',
            '        row["time_end"] = OBSERVED_AT',
            '        row["evidence_class"] = "primary_public"',
            '        row["receipt_ids"] = ["dialog-directory-extract", "wired-dialog-leak"]',
            '        row["notes"] = "Organization context only; Dialog cannot occupy an actor endpoint."',
            '        new_organization_rows.append(row)',
            '',
            '    invitation_row = {',
        ),
        seam="organization-rewrite",
    )
    text = replace_once(
        text,
        lines('    retained[first:first] = new_listing_rows + new_officer_rows + [invitation_row]'),
        lines(
            '    retained[first:first] = (',
            '        new_listing_rows + new_organization_rows + new_officer_rows + [invitation_row]',
            '    )',
        ),
        seam="organization-insertion",
    )

    target = Path(SOURCE_PATH)
    target.write_text(text, encoding="utf-8")
    return target


def update_density_regression() -> None:
    path = Path("test/density.test.js")
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "const dialog = data.surfaces.find(s => s.surface_id === 'dialog-society-membership');",
        "const dialog = data.surfaces.find(s => s.surface_id === 'dialog-public-directory-exposure-2026-06-16');",
        seam="density-surface-id",
    )
    text = replace_once(
        text,
        "assert.equal(dialog.hop_eligible, false, 'the 115-person Dialog roster must remain non-hop');",
        "assert.equal(dialog.hop_eligible, false, 'the 112-actor Dialog public directory must remain non-hop');",
        seam="density-message",
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    materializer = recover_and_patch_materializer()
    run_checked("bounded Dialog source transaction", [sys.executable, str(materializer)])
    update_density_regression()
    run_checked("complete repository release gate", ["npm", "run", "release:check"])


if __name__ == "__main__":
    main()
