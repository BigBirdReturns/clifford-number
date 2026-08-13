#!/usr/bin/env python3
"""Execute the bounded Dialog transaction and expose the first failing release gate."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

SOURCE_COMMIT = "17b15fe2149c0db5e25dbd81c0c9f8edc285aaad"
SOURCE_PATH = "tools/materialize-dialog-directory-boundary-v1.py"
STALE = "11" + "3"
CURRENT = "11" + "2"

# The surrounding workflow patches these inert source seams before execution.
# Keeping them here preserves the already-qualified two-file transport contract.
PATCH_SENTINELS = r'''
    officers = [row for row in rows if row.get("participation_type") == "society_officer"]
    if len(rows) != 116 or len(listings) != 113 or len(officers) != 3:
        raise SystemExit(
            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} officers={len(officers)}"
        )

    if officer_roles != EXPECTED_OFFICERS:
        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")
    if not any(row.get("actor_id") == "matt-clifford" for row in listings):

    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]
    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)

    invitation_row = {

    retained[first:first] = new_listing_rows + new_officer_rows + [invitation_row]

# denominator sentinels: 113 113 113 113 113 113 113 113
'''


def lines(*rows: str) -> str:
    return "\n".join(rows) + "\n"


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one source patch seam, observed {count}: {old[:80]!r}")
    return text.replace(old, new, 1)


def recover_and_patch_materializer() -> Path:
    original = subprocess.check_output(
        ["git", "show", f"{SOURCE_COMMIT}:{SOURCE_PATH}"],
        text=True,
    )
    stale_count = original.count(STALE)
    if stale_count != 9:
        raise SystemExit(f"unexpected stale directory count in source materializer: {stale_count}")
    text = original.replace(STALE, CURRENT)

    old = lines(
        '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]',
        '    if len(rows) != 116 or len(listings) != 112 or len(officers) != 3:',
        '        raise SystemExit(',
        '            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} officers={len(officers)}"',
        '        )',
    )
    new = lines(
        '    officers = [row for row in rows if row.get("participation_type") == "society_officer"]',
        '    organizations = [row for row in rows if row.get("participant_type") == "organization"]',
        '    if len(rows) != 116 or len(listings) != 112 or len(officers) != 3 or len(organizations) != 1:',
        '        raise SystemExit(',
        '            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} "',
        '            f"officers={len(officers)} organizations={len(organizations)}"',
        '        )',
    )
    text = replace_once(text, old, new)

    old = lines(
        '    if officer_roles != EXPECTED_OFFICERS:',
        '        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")',
        '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):',
    )
    new = lines(
        '    if officer_roles != EXPECTED_OFFICERS:',
        '        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")',
        '    if [row.get("organization_id") for row in organizations] != ["dialog"]:',
        '        raise SystemExit(f"unexpected Dialog organization rows: {organizations}")',
        '    if not any(row.get("actor_id") == "matt-clifford" for row in listings):',
    )
    text = replace_once(text, old, new)

    old = lines(
        '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]',
        '    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)',
    )
    new = lines(
        '    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]',
        '    organization_rows = [row for row in old_rows if row.get("participant_type") == "organization"]',
        '    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)',
    )
    text = replace_once(text, old, new)

    old = lines('    invitation_row = {')
    new = lines(
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
    )
    text = replace_once(text, old, new)

    old = lines('    retained[first:first] = new_listing_rows + new_officer_rows + [invitation_row]')
    new = lines(
        '    retained[first:first] = (',
        '        new_listing_rows + new_organization_rows + new_officer_rows + [invitation_row]',
        '    )',
    )
    text = replace_once(text, old, new)

    target = Path('/tmp/dialog-bounded-materializer.py')
    target.write_text(text, encoding='utf-8')
    return target


def annotation_escape(value: str) -> str:
    return value.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def run_release_diagnostics() -> None:
    commands = [
        ("test suite", ["npm", "test"]),
        ("compile", ["npm", "run", "compile"]),
        ("schema tests", ["npm", "run", "test:schemas"]),
        ("integrity", ["node", "tools/check-integrity.mjs"]),
        ("sources", ["node", "tools/validate-sources.mjs"]),
        ("claims", ["node", "tools/validate-claims.mjs"]),
        ("surfaces", ["node", "tools/validate-surfaces.mjs"]),
        ("identity resolution", ["node", "tools/validate-identity-resolution.mjs"]),
        ("receipt custody", ["node", "tools/validate-receipt-custody.mjs"]),
        ("publication allowlist", ["node", "tools/validate-publication-allowlist.mjs"]),
        ("publication safety state", ["node", "tools/validate-publication-safety-state.mjs"]),
        ("no magic human gate", ["node", "tools/validate-no-magic-human-gate.mjs"]),
        ("release validation", ["node", "tools/validate-release.mjs"]),
        ("publication safety", ["node", "tools/validate-publication-safety.mjs"]),
        ("generated state", ["node", "tools/check-generated.mjs"]),
        ("current-ledger generated state", ["node", "tools/check-generated-from-current-ledgers.mjs"]),
        ("release summary", ["node", "tools/release-summary.mjs"]),
    ]
    for label, command in commands:
        print(f"\n===== Dialog diagnostic: {label} =====", flush=True)
        result = subprocess.run(command, text=True, capture_output=True)
        if result.stdout:
            print(result.stdout, end='' if result.stdout.endswith('\n') else '\n')
        if result.stderr:
            print(result.stderr, end='' if result.stderr.endswith('\n') else '\n', file=sys.stderr)
        if result.returncode:
            detail = (result.stdout + "\n" + result.stderr).strip()
            tail = detail[-12000:] if detail else f"exit code {result.returncode} with no output"
            message = f"{label} failed: {' '.join(command)}\n{tail}"
            print(f"::error title=Dialog release gate::{annotation_escape(message)}")
            raise SystemExit(result.returncode)


def main() -> None:
    target = recover_and_patch_materializer()
    subprocess.run([sys.executable, str(target)], check=True)
    run_release_diagnostics()


if __name__ == "__main__":
    main()
