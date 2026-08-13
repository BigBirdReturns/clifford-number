#!/usr/bin/env python3
"""Apply the bounded Dialog source transaction and run the canonical release gate."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

SOURCE_COMMIT = "17b15fe2149c0db5e25dbd81c0c9f8edc285aaad"
SOURCE_PATH = "tools/materialize-dialog-directory-boundary-v1.py"
OLD = "dialog-society-membership"
DIRECTORY = "dialog-public-directory-exposure-2026-06-16"
LEADERSHIP = "dialog-leadership-role-observations-2026-06-16"
INVITATION = "dialog-matt-clifford-invitation-nonattendance-2026-06-16"
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


def update_wrap_up_validator() -> None:
    path = Path("tools/lib/clifford-thiel-trump-wrap-up.mjs")
    text = path.read_text(encoding="utf-8")
    old = lines(
        "  const dialog = surfaces.find(row => row.surface_id === 'dialog-society-membership');",
        "  if (!dialog) errors.push('Dialog surface missing');",
        "  else if (dialog.hop_eligible !== false) errors.push('Dialog dense roster must remain non-hop context');",
        "  for (const actorId of ['matt-clifford', 'peter-thiel']) {",
        "    if (!participation.some(row => row.surface_id === 'dialog-society-membership' && row.actor_id === actorId)) {",
        "      errors.push(`Dialog participation missing for ${actorId}`);",
        "    }",
        "  }",
    )
    new = lines(
        f"  const dialogDirectory = surfaces.find(row => row.surface_id === '{DIRECTORY}');",
        f"  const dialogLeadership = surfaces.find(row => row.surface_id === '{LEADERSHIP}');",
        f"  const dialogInvitation = surfaces.find(row => row.surface_id === '{INVITATION}');",
        "  if (!dialogDirectory) errors.push('Dialog directory surface missing');",
        "  else if (dialogDirectory.hop_eligible !== false) errors.push('Dialog directory must remain non-hop context');",
        "  else if (dialogDirectory.hop_refusal_reason !== 'dense_directory_listing_not_shared_participation') {",
        "    errors.push('Dialog directory must expose the dense-listing refusal');",
        "  }",
        "  if (!dialogLeadership) errors.push('Dialog leadership observation surface missing');",
        "  else if (dialogLeadership.hop_eligible !== false) errors.push('Dialog leadership roles must remain non-hop observations');",
        "  else if (dialogLeadership.hop_refusal_reason !== 'reported_role_observations_not_shared_event') {",
        "    errors.push('Dialog leadership surface must expose the shared-event refusal');",
        "  }",
        "  if (!dialogInvitation) errors.push('Dialog invitation/non-attendance surface missing');",
        "  else if (dialogInvitation.hop_eligible !== false) errors.push('Dialog invitation/non-attendance must remain non-hop');",
        "  else if (dialogInvitation.hop_refusal_reason !== 'invitation_without_attendance_or_membership') {",
        "    errors.push('Dialog invitation surface must expose the non-attendance refusal');",
        "  }",
        f"  if (!participation.some(row => row.surface_id === '{DIRECTORY}' && row.actor_id === 'matt-clifford')) {{",
        "    errors.push('Dialog directory listing missing for matt-clifford');",
        "  }",
        f"  if (!participation.some(row => row.surface_id === '{LEADERSHIP}' && row.actor_id === 'peter-thiel')) {{",
        "    errors.push('Dialog leadership observation missing for peter-thiel');",
        "  }",
        f"  if (!participation.some(row => row.surface_id === '{INVITATION}' && row.actor_id === 'matt-clifford')) {{",
        "    errors.push('Dialog invitation/non-attendance observation missing for matt-clifford');",
        "  }",
        f"  if (participation.some(row => row.surface_id === '{DIRECTORY}' && row.actor_id === 'peter-thiel')) {{",
        "    errors.push('Peter Thiel leadership role cannot be rewritten as a directory listing');",
        "  }",
        f"  const dialogOrganization = participation.find(row => row.surface_id === '{DIRECTORY}'",
        "    && row.participant_type === 'organization' && row.organization_id === 'dialog');",
        "  if (!dialogOrganization) errors.push('Dialog directory organization context missing');",
        "  else if (dialogOrganization.actor_id !== undefined && dialogOrganization.actor_id !== null) {",
        "    errors.push('Dialog organization context cannot occupy an actor endpoint');",
        "  }",
        f"  const dialogSurfaceIds = new Set(['{DIRECTORY}', '{LEADERSHIP}', '{INVITATION}']);",
        "  if ((hopGraph.edges ?? []).some(edge => edge.surfaces?.some(surface => dialogSurfaceIds.has(surface.surface_id)))) {",
        "    errors.push('Dialog refusal surfaces cannot appear on compiled hop edges');",
        "  }",
    )
    path.write_text(replace_once(text, old, new, seam="wrap-up-validator"), encoding="utf-8")


def update_wrap_up_test() -> None:
    path = Path("test/clifford-thiel-trump-wrap-up.test.js")
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        lines(
            "expectFailure('dense Dialog roster cannot become a hop', bundle => {",
            "  bundle.surfaces.find(row => row.surface_id === 'dialog-society-membership').hop_eligible = true;",
            "}, /Dialog dense roster must remain non-hop context/);",
        ),
        lines(
            "expectFailure('Dialog directory listing cannot become a hop', bundle => {",
            f"  bundle.surfaces.find(row => row.surface_id === '{DIRECTORY}').hop_eligible = true;",
            "}, /Dialog directory must remain non-hop context/);",
            "",
            "expectFailure('Dialog organization context cannot become an actor endpoint', bundle => {",
            f"  bundle.participation.find(row => row.surface_id === '{DIRECTORY}'",
            "    && row.organization_id === 'dialog').actor_id = 'peter-thiel';",
            "}, /organization context cannot occupy an actor endpoint/);",
        ),
        seam="wrap-up-test-directory",
    )
    text = replace_once(
        text,
        "  bundle.participation.push({ surface_id: 'dialog-society-membership', actor_id: 'donald-trump' });",
        f"  bundle.participation.push({{ surface_id: '{DIRECTORY}', actor_id: 'donald-trump' }});",
        seam="wrap-up-test-trump",
    )
    path.write_text(text, encoding="utf-8")


def actor_surface_counts(actor_id: str) -> tuple[int, int]:
    surfaces = {
        row["surface_id"]: row
        for row in (
            json.loads(line)
            for line in Path("data/ledger/surfaces.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
    }
    actor_surface_ids = {
        row["surface_id"]
        for row in (
            json.loads(line)
            for line in Path("data/ledger/participation.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
        if row.get("participant_type") == "actor" and row.get("actor_id") == actor_id
    }
    scorable = sum(1 for surface_id in actor_surface_ids if surfaces[surface_id].get("scorable", True) is not False)
    hop_eligible = sum(1 for surface_id in actor_surface_ids if surfaces[surface_id].get("hop_eligible") is True)
    return scorable, hop_eligible


def update_wrap_up_record() -> None:
    path = Path("data/research/clifford-thiel-trump-wrap-up.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    data["generated_at"] = "2026-08-12"

    matt_scorable, matt_hop = actor_surface_counts("matt-clifford")
    peter_scorable, peter_hop = actor_surface_counts("peter-thiel")
    matt = data["principals"]["matt-clifford"]
    matt["scorable_surface_count"] = matt_scorable
    matt["hop_eligible_surface_count"] = matt_hop
    matt["supported_summary"] = (
        "The ledger supports Clifford's official Action Plan development role, the separately bounded publication-and-response hop to Keir Starmer, "
        "and the official Faculty company overlap. His Dialog public-directory listing and separately reported invitation/non-attendance remain "
        "scorable, graph-inert observations; neither supplies a shared surface with Peter Thiel."
    )
    matt["prohibited_extension"] = (
        "Policy authorship, directory listing, or invitation without attendance does not transfer participation into unrelated procurement, capital, "
        "political, or interpersonal surfaces."
    )

    peter = data["principals"]["peter-thiel"]
    peter["corpus_role"] = "canonical actor with one reported organizational-role observation"
    peter["scorable_surface_count"] = peter_scorable
    peter["hop_eligible_surface_count"] = peter_hop
    peter["supported_summary"] = (
        "The authoritative surface ledger preserves WIRED's exact-date report that Thiel was a Dialog co-founder. Clifford appears on separate "
        "directory and invitation/non-attendance observations, so the compiled topology documents no eligible shared-surface path between them."
    )
    peter["prohibited_extension"] = (
        "A reported organizational role, Clifford's separate directory listing, sector prominence, Founders Fund affiliation, or Palantir association "
        "does not create a Clifford hop or policy/procurement coordination edge."
    )

    outcomes = {row["outcome_id"]: row for row in data["surviving_outcomes"]}
    dialog_outcome = outcomes["clifford-thiel-dialog-context"]
    dialog_outcome["evidence_layer"] = "authoritative_context_surfaces"
    dialog_outcome["status"] = "separate_observations_non_hop"
    dialog_outcome["path"] = [
        "matt-clifford",
        "Dialog public-directory listing plus reported invitation/non-attendance",
        "Dialog reported co-founder role",
        "peter-thiel",
    ]
    dialog_outcome["outcome"] = (
        "Clifford is listed in Dialog's public directory and is separately reported as an invitee who had not attended, while Thiel is separately "
        "reported as a co-founder."
    )
    dialog_outcome["interpretation_limit"] = (
        "These are different propositions on different non-hop surfaces. They do not prove membership, attendance, a shared event, bilateral contact, "
        "agreement, transaction, influence, or coordination."
    )

    trails = {row["trail_id"]: row for row in data["composite_trails"]}
    dialog_trail = trails["clifford-thiel-convening-context"]
    dialog_trail["status"] = "separate_observations_no_shared_surface"
    dialog_trail["trail"] = [
        "Clifford directory listing",
        "Clifford reported invitation and non-attendance",
        "Thiel reported co-founder role",
    ]
    dialog_trail["what_survives"] = (
        "The directory listing, invitation/non-attendance statement, and reported co-founder role remain visible as separate public observations."
    )
    dialog_trail["open_join"] = (
        "No receipted attended event, bilateral interaction, or bounded shared participation currently joins Clifford and Thiel through Dialog."
    )

    signals = {row["signal_id"]: row for row in data["signals_outside_hop_graph"]}
    density = signals["dialog-convening-density"]
    density["observations"] = [
        "Dialog's exposed public directory lists Clifford among 112 actor identities and one organization-context row.",
        "WIRED separately reports Thiel, Auren Hoffman, and Raffi Grinberg in three organizational roles and reports Clifford's statement that he had been invited and had not attended.",
    ]
    density["what_the_pattern_shows"] = (
        "The exposed directory spans policy, capital, technology, security, media, and law, but its density and mixed semantics prevent pairwise inference. "
        "The role and non-attendance observations remain visible without being converted into a convening event."
    )
    density["research_question"] = (
        "Which named, dated events or attendance records, if any, establish smaller shared-participation surfaces without treating the directory itself as one?"
    )

    trump_cluster = signals["trump-administration-adjacent-dialog-cluster"]
    trump_cluster["observations"] = [
        "Dialog directory rows include Jared Kushner, Scott Bessent, Will Scharf, Leonard Leo, and Grover Norquist in the same dense public index that lists Clifford.",
        "Thiel's co-founder role is a separate reported observation, and Donald Trump is not himself a participant in the surface ledger; the officeholder pipeline separately preserves campaign, disclosure, registry, and payee-name signals.",
    ]
    trump_cluster["what_the_pattern_shows"] = (
        "Trump-administration and conservative legal/political figures appear in the dense directory, while the compiler refuses to turn that index or Thiel's separate role observation into Donald Trump or pairwise actor edges."
    )

    evaluated = {row["path_id"]: row for row in data["evaluated_paths"]}
    dialog_path = evaluated["clifford-thiel-dialog-roster"]
    dialog_path["candidate_path"] = [
        "matt-clifford",
        DIRECTORY,
        LEADERSHIP,
        "peter-thiel",
    ]
    dialog_path["surviving_fact"] = (
        "Clifford has a public-directory listing and a separate invitation/non-attendance observation; Thiel has a separately reported co-founder-role observation."
    )
    dialog_path["reason"] = (
        "The 112-actor directory is a dense listing, the three leadership rows are reported roles rather than a shared event, and Clifford's invitation is accompanied by non-attendance. None supplies pairwise co-participation."
    )
    triple = evaluated["clifford-thiel-trump-triple"]
    triple["surviving_fact"] = (
        "The corpus supports separate public roles, separate Clifford and Thiel Dialog observations, and a Trump disclosure pipeline."
    )

    locked = data["public_interpretation_contract"]["locked_doors"]
    for index, value in enumerate(locked):
        if value.startswith("Event-level Dialog records"):
            locked[index] = "Named, dated Dialog attendance records that establish bounded shared-participation surfaces"
            break
    else:
        raise SystemExit("Dialog locked-door entry missing")

    serialized = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if OLD in serialized:
        raise SystemExit("legacy Dialog composite remains in wrap-up record")
    path.write_text(serialized, encoding="utf-8")


def update_cross_corpus_dialog_summary() -> None:
    path = Path("data/research/clifford-cross-corpus-public-interest-map.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    lane = next(row for row in data["lanes"] if row["lane_id"] == "clifford-policy-dialog-core")
    lane["what_the_data_shows"] = (
        "An official Clifford-Starmer policy hop; an official, date-bounded Clifford-Faculty company overlap through Matt Clifford, Marc Warner, and Saul Klein; "
        "a documented state-capacity and procurement program; documented Thiel-Palantir governance and Palantir state-facing outcomes; separate graph-inert Dialog "
        "observations for Clifford's directory listing and invitation/non-attendance and Thiel's reported co-founder role; and several visible structural trails with open joins."
    )
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    materializer = recover_and_patch_materializer()
    run_checked("bounded Dialog source transaction", [sys.executable, str(materializer)])
    update_density_regression()
    update_wrap_up_validator()
    update_wrap_up_test()
    update_wrap_up_record()
    update_cross_corpus_dialog_summary()
    run_checked("complete repository release gate", ["npm", "run", "release:check"])


if __name__ == "__main__":
    main()
