#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = "dialog-society-membership"
DIRECTORY = "dialog-public-directory-exposure-2026-06-16"
LEADERSHIP = "dialog-leadership-role-observations-2026-06-16"
INVITATION = "dialog-matt-clifford-invitation-nonattendance-2026-06-16"
BOUNDARY_CLAIM = "dialog-matt-clifford-peter-thiel-boundary-2026-06-16"
OBSERVED_AT = "2026-06-16"
CAPTURED_AT = "2026-08-12"
EXPECTED_OFFICERS = {
    "peter-thiel": "Co-founder",
    "auren-hoffman": "Co-founder & Chairman",
    "raffi-grinberg": "Executive Director",
}


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "\n".join(json.dumps(row, separators=(",", ":"), ensure_ascii=False) for row in rows) + "\n",
        encoding="utf-8",
    )


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_source_state() -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    surfaces = load_jsonl(ROOT / "data/ledger/surfaces.jsonl")
    participation = load_jsonl(ROOT / "data/ledger/participation.jsonl")
    receipts = load_jsonl(ROOT / "data/ledger/receipts.jsonl")
    claims = load_jsonl(ROOT / "data/ledger/claims.jsonl")

    old_surfaces = [row for row in surfaces if row.get("surface_id") == OLD]
    if len(old_surfaces) != 1:
        raise SystemExit(f"expected one legacy Dialog surface, observed {len(old_surfaces)}")
    for surface_id in (DIRECTORY, LEADERSHIP, INVITATION):
        if any(row.get("surface_id") == surface_id for row in surfaces):
            raise SystemExit(f"replacement surface already exists: {surface_id}")

    rows = [row for row in participation if row.get("surface_id") == OLD]
    listings = [row for row in rows if row.get("participation_type") == "listed_in_directory"]
    officers = [row for row in rows if row.get("participation_type") == "society_officer"]
    if len(rows) != 116 or len(listings) != 113 or len(officers) != 3:
        raise SystemExit(
            f"unexpected Dialog denominator: total={len(rows)} listings={len(listings)} officers={len(officers)}"
        )
    officer_roles = {row.get("actor_id"): row.get("role") for row in officers}
    if officer_roles != EXPECTED_OFFICERS:
        raise SystemExit(f"unexpected Dialog officer rows: {officer_roles}")
    if not any(row.get("actor_id") == "matt-clifford" for row in listings):
        raise SystemExit("Matt Clifford directory listing is missing")

    receipt_ids = [row.get("receipt_id") for row in receipts]
    for receipt_id in ("wired-dialog-leak", "wired-dialog-misconfig", "dialog-directory-extract", "dialog-human-layer"):
        if receipt_ids.count(receipt_id) != 1:
            raise SystemExit(f"unexpected receipt count for {receipt_id}: {receipt_ids.count(receipt_id)}")
    if any(row.get("claim_id") == BOUNDARY_CLAIM for row in claims):
        raise SystemExit("Dialog boundary claim already exists")
    return surfaces, participation, receipts, claims


def write_receipt_extracts(listing_ids: list[str]) -> tuple[str, str]:
    topology = ROOT / "receipts/topology"
    topology.mkdir(parents=True, exist_ok=True)

    wired_text = """# WIRED Dialog directory exposure and role report — 16 June 2026

## Source

- Public URL: `https://www.wired.com/story/leak-exposes-members-of-peter-thiels-secretive-dialog-society`
- Publisher: WIRED
- Published: 16 June 2026
- Retrieved for canonical reconciliation: 12 August 2026

## Reported observations

The report describes Peter Thiel as a Dialog co-founder, Auren Hoffman as co-founder and chairman, and Raffi Grinberg as executive director. It reports that a publicly exposed Dialog web directory contained names and role labels with different semantics rather than a verified attendance ledger.

The report also records Matt Clifford's statement that he had been invited to Dialog and had not attended. That statement supports an invitation and non-attendance boundary. It does not support membership, attendance, a meeting with Peter Thiel or another listed person, agreement, influence, coordination, motive, wrongdoing, common purpose, or causation.

## Evidentiary use

This receipt supports exact-date public observations of the three reported leadership roles and Matt Clifford's reported invitation/non-attendance statement. It also supports refusing to treat a directory listing as attendance or pairwise co-participation.

## Limits

The article is journalism. It does not supply appointment dates or complete tenure intervals for the reported officers, a complete event-attendance ledger, private communications, or a basis for converting all exposed names into one actor-to-actor surface.
"""

    directory_lines = "\n".join(f"- `{actor_id}`" for actor_id in sorted(listing_ids))
    directory_text = f"""# Dialog public-directory extract — observed through 16 June 2026

## Source

- Public route: `https://dialog.org/`
- Source class: publicly exposed directory source preserved in the canonical ledger
- Observation date used by this reconciliation: 16 June 2026
- Directory-listing rows: {len(listing_ids)}
- Reported leadership-role rows excluded from this listing denominator: 3

## Preserved listing identities

{directory_lines}

## Evidentiary use

This extract freezes the 113 source-addressed `listed_in_directory` identities already present in the canonical ledger before the legacy composite is split. It preserves a public-directory observation only. Matt Clifford is one of the listed identities.

## Limits

A directory listing is not proof of membership, attendance, a meeting, contact, agreement, endorsement, coordination, influence, motive, wrongdoing, common purpose, or causation. The listing denominator is too dense and semantically mixed to create pairwise actor adjacency. Reported leadership roles and Matt Clifford's invitation/non-attendance statement are preserved as separate propositions.
"""

    wired_path = topology / "wired-dialog-leak-2026-06-16.md"
    directory_path = topology / "dialog-directory-extract-2026-06-16.md"
    wired_path.write_text(wired_text, encoding="utf-8")
    directory_path.write_text(directory_text, encoding="utf-8")
    return sha256_text(wired_text), sha256_text(directory_text)


def replace_surfaces(surfaces: list[dict]) -> None:
    path = ROOT / "data/ledger/surfaces.jsonl"
    index = next(i for i, row in enumerate(surfaces) if row.get("surface_id") == OLD)
    directory_surface = {
        "surface_id": DIRECTORY,
        "surface_label": "Dialog public-directory exposure, 16 June 2026",
        "surface_type": "directory_roster_surface",
        "secondary_surface_types": ["governance_continuity_surface"],
        "hop_eligible": False,
        "hop_refusal_reason": "dense_directory_listing_not_shared_participation",
        "scorable": True,
        "status": "split_to_exact_date_directory_listing_observation",
        "bounded_by": [
            "16 June 2026 WIRED report on the exposed Dialog directory",
            "113 rows typed as listed_in_directory",
            "reported leadership roles separated from directory-listing semantics",
            "Matt Clifford invitation and non-attendance preserved separately",
        ],
        "time_start": OBSERVED_AT,
        "time_end": OBSERVED_AT,
        "evidence_class": "primary_public",
        "receipt_ids": ["dialog-directory-extract", "wired-dialog-leak", "wired-dialog-misconfig"],
        "notes": "Exact-date public-directory observation. The 113-name roster is dense and semantically insufficient for pairwise topology. Listing does not establish membership, attendance, contact, agreement, endorsement, influence, coordination, motive, wrongdoing, common purpose, or causation.",
    }
    leadership_surface = {
        "surface_id": LEADERSHIP,
        "surface_label": "Dialog reported leadership-role observations, 16 June 2026",
        "surface_type": "founder_officer_surface",
        "secondary_surface_types": ["governance_continuity_surface"],
        "hop_eligible": False,
        "hop_refusal_reason": "reported_role_observations_not_shared_event",
        "scorable": True,
        "status": "split_to_reported_role_observations",
        "bounded_by": [
            "16 June 2026 WIRED publication",
            "Peter Thiel reported as co-founder",
            "Auren Hoffman reported as co-founder and chairman",
            "Raffi Grinberg reported as executive director",
            "no appointment dates or bounded shared event supplied",
        ],
        "time_start": OBSERVED_AT,
        "time_end": OBSERVED_AT,
        "evidence_class": "reported",
        "receipt_ids": ["wired-dialog-leak"],
        "notes": "One-day journalism observation of three differently described organizational roles. It does not establish a same-day appointment event, continuous overlap, attendance, contact, agreement, influence, coordination, motive, wrongdoing, common purpose, or causation, so it creates no actor adjacency.",
    }
    invitation_surface = {
        "surface_id": INVITATION,
        "surface_label": "Matt Clifford reported Dialog invitation and non-attendance, 16 June 2026",
        "surface_type": "directory_roster_surface",
        "secondary_surface_types": ["governance_continuity_surface"],
        "hop_eligible": False,
        "hop_refusal_reason": "invitation_without_attendance_or_membership",
        "scorable": True,
        "status": "reported_invitation_nonattendance_boundary",
        "bounded_by": [
            "16 June 2026 WIRED report",
            "Matt Clifford statement that he had been invited",
            "Matt Clifford statement that he had not attended",
            "no second actor participant identified on an attended event",
        ],
        "time_start": OBSERVED_AT,
        "time_end": OBSERVED_AT,
        "evidence_class": "reported",
        "receipt_ids": ["wired-dialog-leak"],
        "notes": "Single-actor invitation and non-attendance observation. It expressly refuses membership or attendance inference and cannot connect Matt Clifford to Peter Thiel or another listed person through Dialog.",
    }
    surfaces[index:index + 1] = [directory_surface, leadership_surface, invitation_surface]
    write_jsonl(path, surfaces)


def replace_participation(participation: list[dict]) -> list[str]:
    path = ROOT / "data/ledger/participation.jsonl"
    old_rows = [row for row in participation if row.get("surface_id") == OLD]
    listing_rows = [row for row in old_rows if row.get("participation_type") == "listed_in_directory"]
    officer_rows = [row for row in old_rows if row.get("participation_type") == "society_officer"]
    first = next(i for i, row in enumerate(participation) if row.get("surface_id") == OLD)
    retained = [row for row in participation if row.get("surface_id") != OLD]

    new_listing_rows = []
    for source in listing_rows:
        row = dict(source)
        row["surface_id"] = DIRECTORY
        row["time_start"] = OBSERVED_AT
        row["time_end"] = OBSERVED_AT
        row["receipt_ids"] = ["dialog-directory-extract", "wired-dialog-leak"]
        row["notes"] = "Public-directory listing observation only; it does not establish membership, attendance, or pairwise co-participation."
        new_listing_rows.append(row)

    new_officer_rows = []
    for source in officer_rows:
        row = dict(source)
        row["surface_id"] = LEADERSHIP
        row["time_start"] = OBSERVED_AT
        row["time_end"] = OBSERVED_AT
        row["evidence_class"] = "reported"
        row["receipt_ids"] = ["wired-dialog-leak"]
        row["notes"] = "Reported role observation on the publication date; no appointment date, tenure interval, shared event, or interpersonal contact is inferred."
        new_officer_rows.append(row)

    invitation_row = {
        "surface_id": INVITATION,
        "participant_type": "actor",
        "actor_id": "matt-clifford",
        "role": "Reported invitee who stated that he had not attended",
        "participation_type": "reported_invitation_nonattendance_observation",
        "time_start": OBSERVED_AT,
        "time_end": OBSERVED_AT,
        "evidence_class": "reported",
        "receipt_ids": ["wired-dialog-leak"],
        "notes": "Invitation and non-attendance are preserved without converting the statement into membership, attendance, contact, or a shared event.",
    }
    retained[first:first] = new_listing_rows + new_officer_rows + [invitation_row]
    write_jsonl(path, retained)
    return sorted(row["actor_id"] for row in listing_rows)


def update_receipts(receipts: list[dict], wired_hash: str, directory_hash: str) -> None:
    path = ROOT / "data/ledger/receipts.jsonl"
    out = []
    for row in receipts:
        receipt_id = row.get("receipt_id")
        if receipt_id == "dialog-human-layer":
            continue
        if receipt_id == "wired-dialog-leak":
            row = {
                "receipt_id": "wired-dialog-leak",
                "label": "WIRED — Dialog directory exposure, reported roles, and Clifford non-attendance (16 Jun 2026)",
                "source_type": "journalism_source_extract",
                "evidence_class": "reported",
                "path": "receipts/topology/wired-dialog-leak-2026-06-16.md",
                "source_url": "https://www.wired.com/story/leak-exposes-members-of-peter-thiels-secretive-dialog-society",
                "publisher": "WIRED",
                "source_published_at": OBSERVED_AT,
                "event_date": OBSERVED_AT,
                "reported_role_actor_ids": ["peter-thiel", "auren-hoffman", "raffi-grinberg"],
                "matt_clifford_reported_invited": True,
                "matt_clifford_reported_never_attended": True,
                "retrieved_at": CAPTURED_AT,
                "notes": "Journalism extract supporting the reported leadership roles and Matt Clifford invitation/non-attendance boundary. It does not establish membership, attendance, interpersonal contact, agreement, influence, or coordination.",
                "archive": {
                    "method": "in_repo_content_hash",
                    "ref": f"sha256:{wired_hash}",
                    "captured": CAPTURED_AT,
                    "checked": CAPTURED_AT,
                    "note": "Hash covers the in-repository structured extract; source_url preserves the public article route.",
                },
            }
        elif receipt_id == "dialog-directory-extract":
            row = {
                "receipt_id": "dialog-directory-extract",
                "label": "Dialog — public-directory listing extract observed through 16 Jun 2026",
                "source_type": "primary_public_directory_extract",
                "evidence_class": "primary_public",
                "path": "receipts/topology/dialog-directory-extract-2026-06-16.md",
                "source_url": "https://dialog.org/",
                "publisher": "Dialog",
                "source_observed_at": OBSERVED_AT,
                "event_date": OBSERVED_AT,
                "directory_listing_count": 113,
                "reported_role_rows_excluded": 3,
                "retrieved_at": CAPTURED_AT,
                "notes": "Hash-bound extract of the source-addressed directory rows already preserved in the canonical ledger. Listing semantics do not establish membership, attendance, or pairwise participation.",
                "archive": {
                    "method": "in_repo_content_hash",
                    "ref": f"sha256:{directory_hash}",
                    "captured": CAPTURED_AT,
                    "checked": CAPTURED_AT,
                    "note": "Hash covers the in-repository roster extract; source_url preserves the public directory route.",
                },
            }
        out.append(row)
    write_jsonl(path, out)


def append_claim(claims: list[dict]) -> None:
    claims.append({
        "claim_id": BOUNDARY_CLAIM,
        "text": "The exposed Dialog directory lists Matt Clifford and WIRED reports Peter Thiel as a co-founder, but the same reporting records Clifford's statement that he had been invited and had not attended. The compiler therefore refuses to use Dialog as a Matt Clifford–Peter Thiel hop.",
        "receipt_ids": ["dialog-directory-extract", "wired-dialog-leak", "wired-dialog-misconfig"],
        "evidence_class": "judgment",
        "actor_ids": ["matt-clifford", "peter-thiel"],
        "organization_ids": ["dialog"],
        "surface_ids": [DIRECTORY, LEADERSHIP, INVITATION],
        "date": OBSERVED_AT,
        "limits": "This records directory, reported-role, invitation, and non-attendance propositions. It does not prove that Matt Clifford was never a member, that he had no other contact with Peter Thiel or another listed person, or that no undisclosed Dialog event occurred.",
    })
    write_jsonl(ROOT / "data/ledger/claims.jsonl", claims)


def update_public_map() -> None:
    path = ROOT / "data/research/clifford-cross-corpus-public-interest-map.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    canonical = data["inventory"]["canonical"]
    canonical["surfaces"] = len(load_jsonl(ROOT / "data/ledger/surfaces.jsonl"))
    canonical["participations"] = len(load_jsonl(ROOT / "data/ledger/participation.jsonl"))
    canonical["receipts"] = len(load_jsonl(ROOT / "data/ledger/receipts.jsonl"))
    sentence = (
        " The Dialog composite is split into an exact-date dense directory observation, three reported leadership-role observations, "
        "and Matt Clifford's reported invitation/non-attendance boundary; none creates an actor hop."
    )
    interpretation = data["inventory"]["interpretation"]
    if sentence.strip() not in interpretation:
        data["inventory"]["interpretation"] = interpretation.rstrip() + sentence
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def update_tests(wired_hash: str, directory_hash: str) -> None:
    test_path = ROOT / "test/compiler.test.js"
    test_text = test_path.read_text(encoding="utf-8")
    marker = "// Dialog directory, role, and invitation boundary regression."
    if marker in test_text:
        raise SystemExit("Dialog compiler regression already exists")
    anchor = "// LocalGlobe organization-endpoint refusal regression."
    if test_text.count(anchor) != 1:
        raise SystemExit("cannot locate unique compiler regression insertion seam")
    block = f"""// Dialog directory, role, and invitation boundary regression.
+assert.equal(surf('{OLD}'), undefined,
+  'the mixed open-ended Dialog composite must be retired');
+const dialogDirectory = surf('{DIRECTORY}');
+const dialogLeadership = surf('{LEADERSHIP}');
+const dialogInvitation = surf('{INVITATION}');
+assert.ok(dialogDirectory && dialogLeadership && dialogInvitation,
+  'all three bounded Dialog propositions must compile');
+assert.equal(dialogDirectory.hop_eligible, false);
+assert.equal(dialogDirectory.hop_refusal_reason, 'dense_directory_listing_not_shared_participation');
+assert.equal(dialogDirectory.time_start, '{OBSERVED_AT}');
+assert.equal(dialogDirectory.time_end, '{OBSERVED_AT}');
+const dialogDirectoryActors = dialogDirectory.participants
+  .filter(part => part.participant_type === 'actor')
+  .map(part => part.actor_id);
+assert.equal(dialogDirectoryActors.length, 113);
+assert.ok(dialogDirectoryActors.includes('matt-clifford'));
+assert.deepEqual(
+  dialogLeadership.participants.filter(part => part.participant_type === 'actor')
+    .map(part => part.actor_id).sort(),
+  ['auren-hoffman', 'peter-thiel', 'raffi-grinberg'],
+);
+assert.equal(dialogLeadership.hop_eligible, false);
+assert.equal(dialogLeadership.hop_refusal_reason, 'reported_role_observations_not_shared_event');
+assert.deepEqual(
+  dialogInvitation.participants.filter(part => part.participant_type === 'actor')
+    .map(part => part.actor_id),
+  ['matt-clifford'],
+);
+assert.equal(dialogInvitation.hop_eligible, false);
+assert.equal(dialogInvitation.hop_refusal_reason, 'invitation_without_attendance_or_membership');
+for (const dialogSurface of [dialogDirectory, dialogLeadership, dialogInvitation]) {{
+  assert.ok((hop.rejected_hop_surfaces ?? []).some(row =>
+    row.surface_id === dialogSurface.surface_id
+      && row.reason === dialogSurface.hop_refusal_reason));
+  assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis =>
+    basis.surface_id === dialogSurface.surface_id)));
+}}
+const dialogBoundaryClaim = claim('{BOUNDARY_CLAIM}');
+assert.ok(dialogBoundaryClaim,
+  'the Clifford/Thiel Dialog refusal must remain public');
+assert.deepEqual([...dialogBoundaryClaim.actor_ids].sort(), ['matt-clifford', 'peter-thiel']);
+assert.equal(receipt('dialog-human-layer'), undefined,
+  'the local Dialog analysis note must not remain a live canonical receipt');
+assert.equal(receipt('wired-dialog-leak').source_published_at, '{OBSERVED_AT}');
+assert.equal(receipt('wired-dialog-leak').matt_clifford_reported_invited, true);
+assert.equal(receipt('wired-dialog-leak').matt_clifford_reported_never_attended, true);
+assert.equal(receipt('wired-dialog-leak').archive.ref, 'sha256:{wired_hash}');
+assert.equal(receipt('dialog-directory-extract').directory_listing_count, 113);
+assert.equal(receipt('dialog-directory-extract').archive.ref, 'sha256:{directory_hash}');
+
+""".replace("\n+", "\n")
    test_path.write_text(test_text.replace(anchor, block + anchor, 1), encoding="utf-8")

    release_path = ROOT / "tools/validate-release.mjs"
    release_text = release_path.read_text(encoding="utf-8")
    release_marker = "// Dialog directory, role, and invitation boundary."
    if release_marker in release_text:
        raise SystemExit("Dialog release regression already exists")
    release_anchor = "// Regression fixture 1: Ben Warner."
    if release_text.count(release_anchor) != 1:
        raise SystemExit("cannot locate unique release-validator insertion seam")
    release_block = f"""// Dialog directory, role, and invitation boundary.
+assert(!surfaceById.has('{OLD}'),
+  'the mixed open-ended Dialog composite must be retired');
+const dialogDirectory = surfaceById.get('{DIRECTORY}');
+const dialogLeadership = surfaceById.get('{LEADERSHIP}');
+const dialogInvitation = surfaceById.get('{INVITATION}');
+assert(dialogDirectory && dialogLeadership && dialogInvitation,
+  'all three bounded Dialog propositions must compile');
+assert(dialogDirectory?.hop_eligible === false
+  && dialogDirectory?.hop_refusal_reason === 'dense_directory_listing_not_shared_participation',
+  'Dialog directory must expose its dense listing refusal');
+assert(dialogDirectory?.time_start === '{OBSERVED_AT}' && dialogDirectory?.time_end === '{OBSERVED_AT}',
+  'Dialog directory must be an exact-date observation');
+assert((dialogDirectory?.participants ?? []).filter(part => part.participant_type === 'actor').length === 113,
+  'Dialog directory listing denominator must remain 113');
+assert((dialogDirectory?.participants ?? []).some(part => part.actor_id === 'matt-clifford'),
+  'Matt Clifford directory listing must remain visible');
+assert(sameIdSet(
+  (dialogLeadership?.participants ?? []).filter(part => part.participant_type === 'actor')
+    .map(part => part.actor_id),
+  ['auren-hoffman', 'peter-thiel', 'raffi-grinberg'],
+), 'Dialog leadership observation must retain exactly the three reported roles');
+assert(dialogLeadership?.hop_eligible === false
+  && dialogLeadership?.hop_refusal_reason === 'reported_role_observations_not_shared_event',
+  'reported Dialog roles must not become a shared-event hop');
+assert(sameIdSet(
+  (dialogInvitation?.participants ?? []).filter(part => part.participant_type === 'actor')
+    .map(part => part.actor_id),
+  ['matt-clifford'],
+), 'Dialog invitation/non-attendance surface must contain only Matt Clifford');
+assert(dialogInvitation?.hop_eligible === false
+  && dialogInvitation?.hop_refusal_reason === 'invitation_without_attendance_or_membership',
+  'Dialog invitation must preserve the non-attendance refusal');
+for (const dialogSurface of [dialogDirectory, dialogLeadership, dialogInvitation]) {{
+  assert((hopGraph.rejected_hop_surfaces ?? []).some(row =>
+    row.surface_id === dialogSurface?.surface_id
+      && row.reason === dialogSurface?.hop_refusal_reason),
+    `Dialog refusal ${{dialogSurface?.surface_id}} must remain public`);
+  assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis =>
+    basis.surface_id === dialogSurface?.surface_id)),
+    `Dialog surface ${{dialogSurface?.surface_id}} must never become a hop basis`);
+}}
+const dialogBoundaryClaim = claimById.get('{BOUNDARY_CLAIM}');
+assert(dialogBoundaryClaim,
+  'the Clifford/Thiel Dialog boundary claim must remain canonical');
+assert(sameIdSet(dialogBoundaryClaim?.actor_ids, ['matt-clifford', 'peter-thiel']),
+  'Dialog boundary claim actor set is stale');
+assert(!receiptById.has('dialog-human-layer'),
+  'local Dialog analysis note must not remain a live canonical receipt');
+assert(receiptById.get('wired-dialog-leak')?.archive?.ref === 'sha256:{wired_hash}',
+  'WIRED Dialog extract hash is stale');
+assert(receiptById.get('dialog-directory-extract')?.archive?.ref === 'sha256:{directory_hash}',
+  'Dialog directory extract hash is stale');
+
+""".replace("\n+", "\n")
    release_path.write_text(release_text.replace(release_anchor, release_block + release_anchor, 1), encoding="utf-8")


def main() -> None:
    surfaces, participation, receipts, claims = load_source_state()
    listing_ids = sorted(
        row["actor_id"] for row in participation
        if row.get("surface_id") == OLD and row.get("participation_type") == "listed_in_directory"
    )
    wired_hash, directory_hash = write_receipt_extracts(listing_ids)
    replace_surfaces(surfaces)
    observed_listing_ids = replace_participation(participation)
    if observed_listing_ids != listing_ids:
        raise SystemExit("listing identity denominator drifted during replacement")
    update_receipts(receipts, wired_hash, directory_hash)
    append_claim(claims)
    update_public_map()
    update_tests(wired_hash, directory_hash)
    print(json.dumps({
        "old_surface": OLD,
        "replacement_surfaces": [DIRECTORY, LEADERSHIP, INVITATION],
        "directory_listings": len(listing_ids),
        "reported_roles": len(EXPECTED_OFFICERS),
        "wired_extract_sha256": wired_hash,
        "directory_extract_sha256": directory_hash,
    }, indent=2))


if __name__ == "__main__":
    main()
