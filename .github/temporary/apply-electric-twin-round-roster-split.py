#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ORIGINAL_HELPER_REF = "07e04e0dc9a6e761280f96bf8bd876ba69947835"
HELPER_PATH = ".github/temporary/apply-electric-twin-round-roster-split.py"

OLD_RECEIPT = "tech-eu-electric-twin-seed-round-2026-02-12"
NEW_RECEIPT = "alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12"
COMPANY_RECEIPT = "electric-twin-seed-round-announcement-2026-02-11"

ROUND_SURFACE = "electric-twin-seed-round-2026-02-11"
INSTITUTION_SURFACE = "electric-twin-seed-round-institutional-investors-2026-02-11"
ROSTER_SURFACE = "electric-twin-investor-roster-observation-2026-02-12"

BOUNDARY_CLAIM = "electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12"

SURFACES_PATH = Path("data/ledger/surfaces.jsonl")
PARTICIPATION_PATH = Path("data/ledger/participation.jsonl")
RECEIPTS_PATH = Path("data/ledger/receipts.jsonl")
CLAIMS_PATH = Path("data/ledger/claims.jsonl")
MAP_PATH = Path("data/research/clifford-cross-corpus-public-interest-map.json")
TEST_PATH = Path("test/compiler.test.js")
VALIDATOR_PATH = Path("tools/validate-release.mjs")


def load_jsonl(path: Path) -> list[dict]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )


def participant_id(row: dict) -> str | None:
    return row.get("actor_id") or row.get("organization_id")


def require_single(rows: list[dict], key: str, value: str, label: str) -> tuple[int, dict]:
    matches = [(index, row) for index, row in enumerate(rows) if row.get(key) == value]
    if len(matches) != 1:
        raise SystemExit(f"expected one {label}, found {len(matches)}")
    return matches[0]


surfaces = load_jsonl(SURFACES_PATH)
participation = load_jsonl(PARTICIPATION_PATH)
receipts = load_jsonl(RECEIPTS_PATH)
claims = load_jsonl(CLAIMS_PATH)

if (len(surfaces), len(participation), len(receipts)) != (23, 185, 55):
    raise SystemExit(
        "current-main Electric Twin reconciliation preimage drifted: "
        f"{(len(surfaces), len(participation), len(receipts))}"
    )

receipt_ids = [row.get("receipt_id") for row in receipts]
if receipt_ids.count(OLD_RECEIPT) != 1 or NEW_RECEIPT in receipt_ids:
    raise SystemExit("receipt reconciliation preimage drifted")

round_index, round_surface = require_single(
    surfaces, "surface_id", ROUND_SURFACE, ROUND_SURFACE
)
institution_index, institution_surface = require_single(
    surfaces, "surface_id", INSTITUTION_SURFACE, INSTITUTION_SURFACE
)
if any(row.get("surface_id") == ROSTER_SURFACE for row in surfaces):
    raise SystemExit(f"unexpected existing {ROSTER_SURFACE}")

expected_current_round_ids = {
    "electric-twin",
    "marc-andreessen",
    "cal-henderson",
    "eric-salama",
    "louis-mosley",
    "tom-shinner",
}
expected_current_institution_ids = {
    "electric-twin",
    "atomico",
    "localglobe",
    "mercuri",
    "samos",
}
current_round_rows = [
    row for row in participation if row.get("surface_id") == ROUND_SURFACE
]
current_institution_rows = [
    row for row in participation if row.get("surface_id") == INSTITUTION_SURFACE
]
if (
    len(current_round_rows) != 6
    or {participant_id(row) for row in current_round_rows}
    != expected_current_round_ids
):
    raise SystemExit("current named-angel round participation drifted")
if (
    len(current_institution_rows) != 5
    or {participant_id(row) for row in current_institution_rows}
    != expected_current_institution_ids
):
    raise SystemExit("current institutional round participation drifted")

round_surface.update(
    {
        "surface_label": "Electric Twin $10m seed round announcement, 11 February 2026",
        "surface_type": "employment_investment_surface",
        "secondary_surface_types": ["surface_factory_capital_layer"],
        "hop_eligible": True,
        "scorable": True,
        "status": "rebounded_to_source_native_seed_round",
        "bounded_by": [
            "11 February 2026 Electric Twin company announcement",
            "12 February 2026 Tech.eu report for the complete named participant list",
            "$10m seed round kept separate from the undated previously undisclosed $4m pre-seed",
        ],
        "time_start": "2026-02-11",
        "time_end": "2026-02-11",
        "receipt_ids": [COMPANY_RECEIPT, OLD_RECEIPT],
        "notes": (
            "One-day public financing-announcement surface. The company post supports "
            "Atomico, LocalGlobe, Mercuri, and Marc Andreessen; Tech.eu reports Samos "
            "Investments and angels Cal Henderson, Eric Salama, Tom Shinner, and Louis "
            "Mosley. The previously undisclosed $4m pre-seed has no date or participant "
            "list in these receipts and creates no separate hop. Co-investment does not "
            "establish acquaintance, coordination, ideological alignment, shared control, "
            "board rights, or participation in company decisions."
        ),
    }
)
round_surface.pop("hop_refusal_reason", None)
round_surface.pop("evidence_class", None)
surfaces = [
    row for row in surfaces if row.get("surface_id") != INSTITUTION_SURFACE
]
if len(surfaces) != 22:
    raise SystemExit(f"surface normalization cardinality drifted: {len(surfaces)}")
write_jsonl(SURFACES_PATH, surfaces)

round_by_id = {participant_id(row): dict(row) for row in current_round_rows}
institution_by_id = {
    participant_id(row): dict(row) for row in current_institution_rows
}
preimage_order = [
    "electric-twin",
    "atomico",
    "localglobe",
    "mercuri",
    "samos",
    "marc-andreessen",
    "cal-henderson",
    "eric-salama",
    "tom-shinner",
    "louis-mosley",
]
preimage_rows: list[dict] = []
for pid in preimage_order:
    if pid == "electric-twin" or pid in {
        "marc-andreessen",
        "cal-henderson",
        "eric-salama",
        "tom-shinner",
        "louis-mosley",
    }:
        row = round_by_id[pid]
    else:
        row = institution_by_id[pid]
    row["surface_id"] = ROUND_SURFACE
    if pid == "electric-twin":
        row["role"] = "company announcing the seed round"
        row["participation_type"] = "company"
        row["evidence_class"] = "primary_public"
        row["receipt_ids"] = [COMPANY_RECEIPT]
        row.pop("notes", None)
    preimage_rows.append(row)

affected_indexes = [
    index
    for index, row in enumerate(participation)
    if row.get("surface_id") in {ROUND_SURFACE, INSTITUTION_SURFACE}
]
if len(affected_indexes) != 11:
    raise SystemExit("current Electric Twin participation block cardinality drifted")
first_affected = min(affected_indexes)
last_affected = max(affected_indexes)
if last_affected - first_affected + 1 != len(affected_indexes):
    raise SystemExit("current Electric Twin participation rows are no longer contiguous")
participation = (
    participation[:first_affected]
    + preimage_rows
    + participation[last_affected + 1 :]
)
if len(participation) != 184:
    raise SystemExit(f"participation normalization cardinality drifted: {len(participation)}")
write_jsonl(PARTICIPATION_PATH, participation)

public_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
canonical_inventory = public_map.get("inventory", {}).get("canonical", {})
expected_current_inventory = {
    "actors": 139,
    "organizations": 25,
    "surfaces": 23,
    "participations": 185,
    "receipts": 55,
    "compiled_hop_edges": 27,
}
if canonical_inventory != expected_current_inventory:
    raise SystemExit(f"current cross-corpus inventory drifted: {canonical_inventory}")
canonical_inventory["surfaces"] = 22
canonical_inventory["participations"] = 184
MAP_PATH.write_text(
    json.dumps(public_map, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

test_text = TEST_PATH.read_text(encoding="utf-8")
current_test_start = "// LocalGlobe organization-endpoint refusal regression.\n"
current_test_end = "for (const retiredScratchReceipt of [\n"
if test_text.count(current_test_start) != 1 or test_text.count(current_test_end) != 1:
    raise SystemExit("current-main Electric Twin regression markers drifted")
start = test_text.index(current_test_start)
end = test_text.index(current_test_end)
if start >= end:
    raise SystemExit("current-main Electric Twin regression markers are inverted")
test_text = test_text[:start] + test_text[end:]
TEST_PATH.write_text(test_text, encoding="utf-8")

source = subprocess.check_output(
    ["git", "show", f"{ORIGINAL_HELPER_REF}:{HELPER_PATH}"],
    text=True,
)

retired_test_assertion = """assert.equal(receipt('tech-eu-electric-twin-seed-round-2026-02-12'), undefined,
  'the superseded journalism receipt must be retired');
"""
retired_validator_assertion = """assert(!receiptById.has('tech-eu-electric-twin-seed-round-2026-02-12'),
  'superseded Tech.eu funding receipt remains canonical');
"""
for label, assertion in [
    ("compiler test", retired_test_assertion),
    ("release validator", retired_validator_assertion),
]:
    count = source.count(assertion)
    if count != 1:
        raise SystemExit(f"expected one stale {label} assertion, found {count}")
    source = source.replace(assertion, "")

exec(compile(source, HELPER_PATH, "exec"), {"__name__": "__main__"})

claims = load_jsonl(CLAIMS_PATH)
claim_index, _ = require_single(claims, "claim_id", BOUNDARY_CLAIM, BOUNDARY_CLAIM)
claims[claim_index] = {
    "claim_id": BOUNDARY_CLAIM,
    "text": (
        "The 11 February 2026 Electric Twin company article expressly assigns "
        "Atomico, LocalGlobe, Mercuri, and Marc Andreessen to the $10m round. "
        "Alex Cooper's 12 February first-party post identifies Atomico, LocalGlobe, "
        "Mercuri, Samos Investments, and five named angels as Electric Twin investors "
        "across two funding rounds without allocating every name to the $10m round. "
        "The compiler therefore keeps the round-specific surface non-hop with Marc "
        "Andreessen as its sole named actor, publishes the broader dated investor "
        "roster separately, and refuses to substitute Saul Klein or another "
        "LocalGlobe principal for LocalGlobe."
    ),
    "receipt_ids": [COMPANY_RECEIPT, NEW_RECEIPT],
    "evidence_class": "judgment",
    "actor_ids": [
        "saul-klein",
        "marc-andreessen",
        "cal-henderson",
        "eric-salama",
        "louis-mosley",
        "tom-shinner",
    ],
    "organization_ids": [
        "electric-twin",
        "atomico",
        "localglobe",
        "mercuri",
        "samos",
    ],
    "surface_ids": [ROUND_SURFACE, ROSTER_SURFACE],
    "date": "2026-02-12",
    "limits": (
        "This is a source-allocation and identity-boundary judgment. The first-party "
        "roster does not allocate every named investor between the $4m pre-seed and "
        "the $10m round, prove that every participant invested on the same date, or "
        "establish acquaintance, coordination, beneficial ownership, governance "
        "rights, common control, motive, wrongdoing, or the absence of other "
        "relationships."
    ),
}
write_jsonl(CLAIMS_PATH, claims)

public_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
canonical_inventory = public_map.get("inventory", {}).get("canonical", {})
expected_terminal_inventory = {
    "actors": 139,
    "organizations": 25,
    "surfaces": 23,
    "participations": 189,
    "receipts": 55,
    "compiled_hop_edges": 27,
}
if canonical_inventory != expected_terminal_inventory:
    raise SystemExit(f"terminal cross-corpus inventory drifted: {canonical_inventory}")
interpretation = public_map.get("inventory", {}).get("interpretation", "")
stale_interpretation = (
    " The canonical surface denominator now keeps the Electric Twin institutional "
    "seed-round record non-hop, preserving LocalGlobe as an organization without "
    "substituting Saul Klein or another principal."
)
interpretation = interpretation.replace(stale_interpretation, "")
replacement_interpretation = (
    " The Electric Twin denominator now separates the 11 February round-specific "
    "company article from the 12 February first-party investor-roster observation: "
    "the former is a single-actor refusal, the latter is a five-actor one-day "
    "surface, and LocalGlobe remains an organization rather than a proxy for Saul "
    "Klein or another principal."
)
if replacement_interpretation.strip() not in interpretation:
    interpretation = interpretation.rstrip() + replacement_interpretation
public_map["inventory"]["interpretation"] = interpretation
MAP_PATH.write_text(
    json.dumps(public_map, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

test_text = TEST_PATH.read_text(encoding="utf-8")
test_marker = (
    "const benBlumeAppointment = "
    "surf('electric-twin-ben-blume-director-appointment-2025-09-12');\n"
)
if test_text.count(test_marker) != 1:
    raise SystemExit("compiler test boundary-claim insertion marker drifted")
test_addendum = """assert.equal(
  surf('electric-twin-seed-round-institutional-investors-2026-02-11'),
  undefined,
  'the superseded institutional companion surface must be retired');
const electricTwinAllocationBoundaryClaim = claim(
  'electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12',
);
assert.ok(electricTwinAllocationBoundaryClaim,
  'the Electric Twin source-allocation and person-substitution boundary must remain public');
assert.deepEqual(electricTwinAllocationBoundaryClaim.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12',
]);
assert.deepEqual(electricTwinAllocationBoundaryClaim.surface_ids, [
  'electric-twin-seed-round-2026-02-11',
  'electric-twin-investor-roster-observation-2026-02-12',
]);
assert.deepEqual(
  [...electricTwinAllocationBoundaryClaim.actor_ids].sort(),
  ['cal-henderson', 'eric-salama', 'louis-mosley', 'marc-andreessen', 'saul-klein', 'tom-shinner'],
);
assert.deepEqual(
  [...electricTwinAllocationBoundaryClaim.organization_ids].sort(),
  ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos'],
);
assert.ok(!actor('saul-klein').surfaces.includes(electricTwinSeed.surface_id),
  'Saul Klein must not be substituted for LocalGlobe on the round-specific surface');
assert.ok(!actor('saul-klein').surfaces.includes(electricTwinInvestorRoster.surface_id),
  'Saul Klein must not be projected onto the dated investor-roster observation');

"""
test_text = test_text.replace(test_marker, test_addendum + test_marker)
TEST_PATH.write_text(test_text, encoding="utf-8")

validator_text = VALIDATOR_PATH.read_text(encoding="utf-8")
validator_marker = "// Regression fixture 1: Ben Warner.\n"
if validator_text.count(validator_marker) != 1:
    raise SystemExit("validate-release boundary-claim insertion marker drifted")
validator_addendum = """assert(!surfaceById.has('electric-twin-seed-round-institutional-investors-2026-02-11'),
  'superseded Electric Twin institutional companion surface remains canonical');
const electricTwinAllocationBoundaryClaim = claimById.get(
  'electric-twin-localglobe-saul-klein-actor-boundary-2026-02-12');
assert(electricTwinAllocationBoundaryClaim,
  'Electric Twin source-allocation and person-substitution boundary claim is missing');
assert(sameIdSet(electricTwinAllocationBoundaryClaim?.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12',
]), 'Electric Twin allocation-boundary claim receipts are stale');
assert(sameIdSet(electricTwinAllocationBoundaryClaim?.surface_ids, [
  'electric-twin-seed-round-2026-02-11',
  'electric-twin-investor-roster-observation-2026-02-12',
]), 'Electric Twin allocation-boundary claim surfaces are stale');
assert(sameIdSet(electricTwinAllocationBoundaryClaim?.actor_ids, [
  'saul-klein',
  'marc-andreessen',
  'cal-henderson',
  'eric-salama',
  'louis-mosley',
  'tom-shinner',
]), 'Electric Twin allocation-boundary claim actors are stale');
assert(sameIdSet(electricTwinAllocationBoundaryClaim?.organization_ids, [
  'electric-twin',
  'atomico',
  'localglobe',
  'mercuri',
  'samos',
]), 'Electric Twin allocation-boundary claim organizations are stale');

"""
validator_text = validator_text.replace(
    validator_marker, validator_addendum + validator_marker
)
VALIDATOR_PATH.write_text(validator_text, encoding="utf-8")

for path in [
    RECEIPTS_PATH,
    SURFACES_PATH,
    PARTICIPATION_PATH,
    CLAIMS_PATH,
    MAP_PATH,
    TEST_PATH,
    VALIDATOR_PATH,
]:
    if OLD_RECEIPT in path.read_text(encoding="utf-8"):
        raise SystemExit(f"superseded receipt remains in authored file: {path}")

if any(
    row.get("surface_id") == INSTITUTION_SURFACE for row in load_jsonl(SURFACES_PATH)
):
    raise SystemExit("superseded institutional companion surface remains canonical")
if any(
    row.get("surface_id") == INSTITUTION_SURFACE
    for row in load_jsonl(PARTICIPATION_PATH)
):
    raise SystemExit("superseded institutional companion participation remains canonical")

print(
    json.dumps(
        {
            "source_receipts": len(load_jsonl(RECEIPTS_PATH)),
            "source_surfaces": len(load_jsonl(SURFACES_PATH)),
            "source_participations": len(load_jsonl(PARTICIPATION_PATH)),
            "source_claims": len(load_jsonl(CLAIMS_PATH)),
            "round_actor_count": 1,
            "roster_actor_count": 5,
            "institution_companion_retired": True,
            "boundary_claim_rebound": True,
        },
        sort_keys=True,
    )
)
