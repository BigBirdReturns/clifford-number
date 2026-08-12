#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

OLD_RECEIPT = "tech-eu-electric-twin-seed-round-2026-02-12"
NEW_RECEIPT = "alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12"
ROUND_SURFACE = "electric-twin-seed-round-2026-02-11"
ROSTER_SURFACE = "electric-twin-investor-roster-observation-2026-02-12"
NEW_RECEIPT_PATH = Path("receipts/topology/alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12.md")
OLD_RECEIPT_PATH = Path("receipts/topology/tech-eu-electric-twin-seed-round-2026-02-12.md")


def load_jsonl(path: str) -> list[dict]:
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: str, rows: list[dict]) -> None:
    Path(path).write_text(
        "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows),
        encoding="utf-8",
    )


def participant_id(row: dict) -> str | None:
    return row.get("actor_id") or row.get("organization_id")


receipt_markdown = """# Alex Cooper investor-roster observation, 12 February 2026

- Source URL: https://www.linkedin.com/posts/alex-cooper-electrictwin_we-started-electric-twin-because-understanding-activity-7427643696898158594-shbo
- Publisher: Alex Cooper
- Author role: Electric Twin co-founder and CEO
- Source publication date: 2026-02-12
- LinkedIn activity ID: 7427643696898158594
- Activity timestamp: 2026-02-12T09:24:16.287Z
- Observation date used by the topology: 2026-02-12
- Retrieved: 2026-08-12
- Evidence class: primary public statement

## Source-bounded observations

Alex Cooper announced $14 million in investment across two funding rounds, including a latest $10 million raise led by Atomico after a $4 million pre-seed. In the same first-party post he thanked Electric Twin's investors, naming Atomico, LocalGlobe, Mercuri, and Samos Investments, and named Marc Andreessen, Cal Henderson, Eric Salama, Tom Shinner, and Louis Mosley as angels.

## Boundaries

This receipt supports a dated first-party observation that Electric Twin publicly identified those funds and angels as its investors on 12 February 2026. It does not allocate every named investor between the $4 million pre-seed and the $10 million round. It does not establish investment date, transaction closing, security class, amount allocated to any participant, beneficial ownership, governance rights, board rights, acquaintance, coordination, ideological alignment, common control, or participation in company decisions. Round-specific participation remains confined to sources that expressly assign a participant to that round.
"""
NEW_RECEIPT_PATH.parent.mkdir(parents=True, exist_ok=True)
if NEW_RECEIPT_PATH.exists():
    raise SystemExit(f"unexpected pre-existing receipt file: {NEW_RECEIPT_PATH}")
if not OLD_RECEIPT_PATH.exists():
    raise SystemExit(f"missing superseded receipt file: {OLD_RECEIPT_PATH}")
NEW_RECEIPT_PATH.write_text(receipt_markdown, encoding="utf-8")
OLD_RECEIPT_PATH.unlink()
receipt_sha256 = hashlib.sha256(receipt_markdown.encode("utf-8")).hexdigest()

receipts = load_jsonl("data/ledger/receipts.jsonl")
old_indexes = [i for i, row in enumerate(receipts) if row.get("receipt_id") == OLD_RECEIPT]
if len(old_indexes) != 1:
    raise SystemExit(f"expected one {OLD_RECEIPT} ledger row, found {len(old_indexes)}")
if any(row.get("receipt_id") == NEW_RECEIPT for row in receipts):
    raise SystemExit(f"unexpected existing {NEW_RECEIPT} ledger row")
receipts[old_indexes[0]] = {
    "receipt_id": NEW_RECEIPT,
    "label": "Alex Cooper — Electric Twin investor roster observation (12 Feb 2026)",
    "source_type": "first_party_founder_investor_roster_extract",
    "evidence_class": "primary_public",
    "path": str(NEW_RECEIPT_PATH),
    "source_url": "https://www.linkedin.com/posts/alex-cooper-electrictwin_we-started-electric-twin-because-understanding-activity-7427643696898158594-shbo",
    "publisher": "Alex Cooper",
    "author": "Alex Cooper",
    "author_role": "Electric Twin co-founder and CEO",
    "source_published_at": "2026-02-12",
    "event_date": "2026-02-12",
    "date_basis": "linkedin_activity_id_timestamp",
    "linkedin_activity_id": "7427643696898158594",
    "activity_timestamp_utc": "2026-02-12T09:24:16.287Z",
    "named_funds": ["Atomico", "LocalGlobe", "Mercuri", "Samos Investments"],
    "named_angels": ["Marc Andreessen", "Cal Henderson", "Eric Salama", "Tom Shinner", "Louis Mosley"],
    "retrieved_at": "2026-08-12",
    "notes": "First-party dated investor-roster observation. The post discusses $14m across two rounds but does not allocate every named investor between the $4m pre-seed and the $10m round; round-specific participation is therefore preserved separately.",
    "archive": {
        "method": "in_repo_content_hash",
        "ref": f"sha256:{receipt_sha256}",
        "captured": "2026-08-12",
        "checked": "2026-08-12",
        "note": "Hash covers the in-repo structured extract; the public LinkedIn route, activity ID, and timestamp basis are preserved.",
    },
}
write_jsonl("data/ledger/receipts.jsonl", receipts)

surfaces = load_jsonl("data/ledger/surfaces.jsonl")
round_indexes = [i for i, row in enumerate(surfaces) if row.get("surface_id") == ROUND_SURFACE]
if len(round_indexes) != 1:
    raise SystemExit(f"expected one {ROUND_SURFACE} surface, found {len(round_indexes)}")
if any(row.get("surface_id") == ROSTER_SURFACE for row in surfaces):
    raise SystemExit(f"unexpected existing {ROSTER_SURFACE} surface")
round_index = round_indexes[0]
round_surface = surfaces[round_index]
expected_old_receipts = [
    "electric-twin-seed-round-announcement-2026-02-11",
    OLD_RECEIPT,
]
if round_surface.get("receipt_ids") != expected_old_receipts:
    raise SystemExit(f"round receipt preimage drifted: {round_surface.get('receipt_ids')}")
round_surface.update({
    "hop_eligible": False,
    "hop_refusal_reason": "single_named_actor_on_round_specific_source",
    "status": "first_party_round_source_single_actor_refusal",
    "bounded_by": [
        "11 February 2026 Electric Twin company announcement",
        "$10m round expressly led by Atomico with participation from LocalGlobe, Mercuri, and Marc Andreessen",
        "only Marc Andreessen is a named actor on the round-specific source; organizations do not create actor hops",
        "$4m pre-seed remains separate and has no participant allocation in the company article",
    ],
    "receipt_ids": ["electric-twin-seed-round-announcement-2026-02-11"],
    "evidence_class": "primary_public",
    "notes": "Round-specific first-party financing surface. The company article expressly assigns Atomico, LocalGlobe, Mercuri, and Marc Andreessen to the $10m round. It names only one actor, so it is an explicit non-hop refusal. It does not establish closing mechanics, allocations, ownership, governance rights, coordination, or the participants in the separate $4m pre-seed.",
})
roster_surface = {
    "surface_id": ROSTER_SURFACE,
    "surface_label": "Electric Twin first-party investor roster observation, 12 February 2026",
    "surface_type": "employment_investment_surface",
    "secondary_surface_types": ["directory_roster_surface", "surface_factory_capital_layer"],
    "hop_eligible": True,
    "scorable": True,
    "status": "density_reviewed_first_party_five_actor_roster",
    "bounded_by": [
        "12 February 2026 Alex Cooper first-party LinkedIn post",
        "four named funds and five named angels publicly identified as Electric Twin investors",
        "five distinct actors, below the canonical maximum of nineteen actors for a hop-eligible surface",
        "the source does not allocate every named investor between the $4m pre-seed and the $10m round",
    ],
    "time_start": "2026-02-12",
    "time_end": "2026-02-12",
    "evidence_class": "primary_public",
    "receipt_ids": [NEW_RECEIPT],
    "notes": "One-day first-party investor-roster observation. The shared surface proves only that Electric Twin's co-founder publicly identified the five actors as angel investors on this date. It does not prove that every actor joined the same funding round, invested at the same time, knew one another, coordinated, shared an ideology, exercised common control, held governance rights, or participated in company decisions.",
}
surfaces.insert(round_index + 1, roster_surface)
write_jsonl("data/ledger/surfaces.jsonl", surfaces)

participation = load_jsonl("data/ledger/participation.jsonl")
round_rows = [row for row in participation if row.get("surface_id") == ROUND_SURFACE]
expected_round_ids = {
    "electric-twin", "atomico", "localglobe", "mercuri", "samos",
    "marc-andreessen", "cal-henderson", "eric-salama", "tom-shinner", "louis-mosley",
}
if len(round_rows) != 10 or {participant_id(row) for row in round_rows} != expected_round_ids:
    raise SystemExit("seed-round participation preimage drifted")
round_keep_ids = {"electric-twin", "atomico", "localglobe", "mercuri", "marc-andreessen"}
round_keep = [row for row in round_rows if participant_id(row) in round_keep_ids]
if len(round_keep) != 5:
    raise SystemExit("round-specific participant filter drifted")

roster_order = [
    ("organization", "electric-twin"),
    ("organization", "atomico"),
    ("organization", "localglobe"),
    ("organization", "mercuri"),
    ("organization", "samos"),
    ("actor", "marc-andreessen"),
    ("actor", "cal-henderson"),
    ("actor", "eric-salama"),
    ("actor", "tom-shinner"),
    ("actor", "louis-mosley"),
]
roster_rows = []
for participant_type, pid in roster_order:
    if participant_type == "organization":
        role = "company whose co-founder published the investor roster" if pid == "electric-twin" else "investor named by Electric Twin co-founder in dated investor roster"
        row = {
            "surface_id": ROSTER_SURFACE,
            "participant_type": "organization",
            "organization_id": pid,
            "role": role,
            "participation_type": "company" if pid == "electric-twin" else "investor_roster_observation",
        }
    else:
        row = {
            "surface_id": ROSTER_SURFACE,
            "participant_type": "actor",
            "actor_id": pid,
            "role": "angel investor named by Electric Twin co-founder in dated investor roster",
            "participation_type": "angel_investor_roster_observation",
        }
    row.update({
        "time_start": "2026-02-12",
        "time_end": "2026-02-12",
        "evidence_class": "primary_public",
        "receipt_ids": [NEW_RECEIPT],
        "notes": "Exact one-day first-party roster observation. The source does not allocate every named investor to the same round and does not establish investment date, amount, ownership, governance rights, acquaintance, coordination, or a continuing relationship.",
    })
    roster_rows.append(row)

first_round_index = next(i for i, row in enumerate(participation) if row.get("surface_id") == ROUND_SURFACE)
last_round_index = max(i for i, row in enumerate(participation) if row.get("surface_id") == ROUND_SURFACE)
if last_round_index - first_round_index + 1 != 10:
    raise SystemExit("seed-round participation rows are no longer contiguous")
participation = participation[:first_round_index] + round_keep + roster_rows + participation[last_round_index + 1:]
if len(participation) != 189:
    raise SystemExit(f"participation cardinality drifted: {len(participation)}")
write_jsonl("data/ledger/participation.jsonl", participation)

map_path = Path("data/research/clifford-cross-corpus-public-interest-map.json")
public_map = json.loads(map_path.read_text(encoding="utf-8"))
canonical_inventory = public_map.get("inventory", {}).get("canonical", {})
expected_inventory = {
    "actors": 139,
    "organizations": 25,
    "surfaces": 22,
    "participations": 184,
    "receipts": 55,
    "compiled_hop_edges": 27,
}
if canonical_inventory != expected_inventory:
    raise SystemExit(f"cross-corpus inventory preimage drifted: {canonical_inventory}")
canonical_inventory["surfaces"] = 23
canonical_inventory["participations"] = 189
map_path.write_text(json.dumps(public_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

test_path = Path("test/compiler.test.js")
test_text = test_path.read_text(encoding="utf-8")
start_marker = "// The Electric Twin capital layer is a dated financing-announcement surface, not a 2023-2026 relationship span.\n"
end_marker = "const benBlumeAppointment = surf('electric-twin-ben-blume-director-appointment-2025-09-12');\n"
if test_text.count(start_marker) != 1 or test_text.count(end_marker) != 1:
    raise SystemExit("compiler test Electric Twin block markers drifted")
start = test_text.index(start_marker)
end = test_text.index(end_marker)
replacement = """// Electric Twin round-specific evidence and the dated investor roster remain separate objects.
assert.equal(surf('electric-twin-funding-surface-2023-2026'), undefined,
  'the legacy multi-year funding surface must be retired');
const electricTwinSeed = surf('electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinSeed, 'the source-native Electric Twin $10m round surface must compile');
assert.equal(electricTwinSeed.surface_label, 'Electric Twin $10m seed round announcement, 11 February 2026');
assert.equal(electricTwinSeed.hop_eligible, false);
assert.equal(electricTwinSeed.hop_refusal_reason, 'single_named_actor_on_round_specific_source');
assert.deepEqual(electricTwinSeed.receipt_ids,
  ['electric-twin-seed-round-announcement-2026-02-11']);
assert.deepEqual(
  electricTwinSeed.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['marc-andreessen'],
  'the round-specific source names only one actor participant');
assert.deepEqual(
  electricTwinSeed.participants.filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id).sort(),
  ['atomico', 'electric-twin', 'localglobe', 'mercuri']);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === electricTwinSeed.surface_id)),
  'a round-specific surface with one actor must never manufacture actor adjacency');

const electricTwinInvestorRoster = surf('electric-twin-investor-roster-observation-2026-02-12');
assert.ok(electricTwinInvestorRoster, 'the first-party Electric Twin investor roster must compile');
assert.equal(electricTwinInvestorRoster.surface_label,
  'Electric Twin first-party investor roster observation, 12 February 2026');
assert.equal(electricTwinInvestorRoster.surface_type, 'employment_investment_surface');
assert.deepEqual(electricTwinInvestorRoster.secondary_surface_types,
  ['directory_roster_surface', 'surface_factory_capital_layer']);
assert.equal(electricTwinInvestorRoster.hop_eligible, true);
assert.equal(electricTwinInvestorRoster.time_start, '2026-02-12');
assert.equal(electricTwinInvestorRoster.time_end, '2026-02-12');
assert.deepEqual(electricTwinInvestorRoster.receipt_ids,
  ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']);
const rosterActors = electricTwinInvestorRoster.participants
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)
  .sort();
assert.deepEqual(rosterActors,
  ['cal-henderson', 'eric-salama', 'louis-mosley', 'marc-andreessen', 'tom-shinner']);
assert.equal(rosterActors.length, 5,
  'the explicitly reviewed roster must remain below the nineteen-actor density ceiling');
assert.deepEqual(
  electricTwinInvestorRoster.participants.filter(part => part.participant_type === 'organization')
    .map(part => part.organization_id).sort(),
  ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos']);
for (const part of electricTwinInvestorRoster.participants) {
  assert.equal(part.evidence_class, 'primary_public');
  assert.deepEqual(part.receipt_ids,
    ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']);
}

const electricTwinAnnouncementReceipt = receipt('electric-twin-seed-round-announcement-2026-02-11');
const founderRosterReceipt = receipt('alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12');
assert.equal(electricTwinAnnouncementReceipt.path,
  'receipts/topology/electric-twin-seed-round-announcement-2026-02-11.md');
assert.equal(electricTwinAnnouncementReceipt.source_published_at, '2026-02-11');
assert.equal(electricTwinAnnouncementReceipt.event_date, '2026-02-11');
assert.ok(founderRosterReceipt, 'the first-party investor-roster receipt must exist');
assert.equal(founderRosterReceipt.path,
  'receipts/topology/alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12.md');
assert.equal(founderRosterReceipt.evidence_class, 'primary_public');
assert.equal(founderRosterReceipt.source_published_at, '2026-02-12');
assert.equal(founderRosterReceipt.event_date, '2026-02-12');
assert.equal(founderRosterReceipt.linkedin_activity_id, '7427643696898158594');
assert.equal(founderRosterReceipt.activity_timestamp_utc, '2026-02-12T09:24:16.287Z');
assert.deepEqual(founderRosterReceipt.named_funds,
  ['Atomico', 'LocalGlobe', 'Mercuri', 'Samos Investments']);
assert.deepEqual(founderRosterReceipt.named_angels,
  ['Marc Andreessen', 'Cal Henderson', 'Eric Salama', 'Tom Shinner', 'Louis Mosley']);
assert.equal(receipt('tech-eu-electric-twin-seed-round-2026-02-12'), undefined,
  'the superseded journalism receipt must be retired');

const andreessenSalama = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'eric-salama|marc-andreessen');
assert.ok(andreessenSalama, 'the five-actor dated investor roster must create the bounded actor pair');
const electricTwinRosterBasis = andreessenSalama.surfaces.find(basis =>
  basis.surface_id === electricTwinInvestorRoster.surface_id);
assert.ok(electricTwinRosterBasis);
assert.equal(electricTwinRosterBasis.evidence_class, 'primary_public');
assert.equal(electricTwinRosterBasis.valid_from, '2026-02-12');
assert.equal(electricTwinRosterBasis.valid_until, '2026-02-12');
assert.deepEqual(electricTwinRosterBasis.receipt_ids,
  ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']);
const electricTwinRosterBases = hop.edges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === electricTwinInvestorRoster.surface_id);
assert.equal(electricTwinRosterBases.length, 10,
  'five named angel investors must compile to exactly ten pairwise roster bases');
for (const basis of electricTwinRosterBases) {
  assert.equal(basis.evidence_class, 'primary_public');
  assert.deepEqual(basis.receipt_ids,
    ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']);
}
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-11' }).number, null,
  'the investor roster must not be backdated to the company round article');
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-12' }).number, 1);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-13' }).number, null,
  'a one-day roster observation must not become an ongoing relationship');

"""
test_text = test_text[:start] + replacement + test_text[end:]
test_path.write_text(test_text, encoding="utf-8")

validator_path = Path("tools/validate-release.mjs")
validator_text = validator_path.read_text(encoding="utf-8")
marker = "// Regression fixture 1: Ben Warner.\n"
if validator_text.count(marker) != 1:
    raise SystemExit("validate-release insertion marker drifted")
validator_gate = """// Electric Twin's round-specific source and first-party investor roster are
// separate bounded objects. The roster is explicitly density-reviewed, while
// the $10m round remains a single-actor refusal.
const electricTwinRound = surfaceById.get('electric-twin-seed-round-2026-02-11');
assert(electricTwinRound, 'Electric Twin $10m round surface is missing');
assert(electricTwinRound?.hop_eligible === false,
  'Electric Twin $10m round must remain non-hop with one named actor');
assert(electricTwinRound?.hop_refusal_reason === 'single_named_actor_on_round_specific_source',
  'Electric Twin $10m round refusal reason is stale');
assert(sameIdSet(electricTwinRound?.receipt_ids,
  ['electric-twin-seed-round-announcement-2026-02-11']),
  'Electric Twin $10m round receipts are stale');
const electricTwinRoundActors = (electricTwinRound?.participants ?? [])
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id);
assert(JSON.stringify(electricTwinRoundActors) === JSON.stringify(['marc-andreessen']),
  'Electric Twin $10m round must contain exactly one named actor');
assert(!hopGraph.edges.some(edge => edge.surfaces.some(basis =>
  basis.surface_id === 'electric-twin-seed-round-2026-02-11')),
  'Electric Twin $10m round created an actor hop despite the single-actor refusal');

const electricTwinRoster = surfaceById.get('electric-twin-investor-roster-observation-2026-02-12');
assert(electricTwinRoster, 'Electric Twin first-party investor roster is missing');
assert(electricTwinRoster?.hop_eligible === true,
  'Electric Twin first-party investor roster must remain hop eligible after explicit review');
assert(electricTwinRoster?.surface_type === 'employment_investment_surface',
  'Electric Twin investor roster primary type is stale');
assert(sameIdSet(electricTwinRoster?.secondary_surface_types,
  ['directory_roster_surface', 'surface_factory_capital_layer']),
  'Electric Twin investor roster secondary types are stale');
assert(electricTwinRoster?.time_start === '2026-02-12' && electricTwinRoster?.time_end === '2026-02-12',
  'Electric Twin investor roster must remain a one-day 12 February observation');
assert(sameIdSet(electricTwinRoster?.receipt_ids,
  ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']),
  'Electric Twin investor roster receipts are stale');
const electricTwinRosterDensity = assessHopDensity(
  electricTwinRoster,
  electricTwinRoster?.participants ?? [],
  data.densityPolicy,
);
assert(electricTwinRosterDensity.actor_count === 5,
  'Electric Twin investor roster actor count must remain five');
assert(electricTwinRosterDensity.max_hop_actor_count === 19,
  'Electric Twin investor roster density ceiling is stale');
assert(electricTwinRosterDensity.exceeds_limit === false,
  'Electric Twin investor roster exceeds the canonical density ceiling');
const electricTwinRosterParts = sourcePartsBySurface.get(
  'electric-twin-investor-roster-observation-2026-02-12') ?? [];
assert(electricTwinRosterParts.length === 10,
  'Electric Twin investor roster must contain five organizations and five actors');
for (const participantId of [
  'electric-twin', 'atomico', 'localglobe', 'mercuri', 'samos',
  'marc-andreessen', 'cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley',
]) {
  const participant = electricTwinRosterParts.find(part =>
    part.actor_id === participantId || part.organization_id === participantId);
  assert(participant, `Electric Twin investor-roster participant ${participantId} is missing`);
  assert(participant?.evidence_class === 'primary_public',
    `Electric Twin investor-roster participant ${participantId} must carry first-party evidence`);
  assert(sameIdSet(participant?.receipt_ids,
    ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']),
    `Electric Twin investor-roster participant ${participantId} receipts are stale`);
}
const electricTwinRosterReceipt =
  receiptById.get('alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12');
assert(electricTwinRosterReceipt,
  'Electric Twin first-party investor-roster receipt is missing');
assert(electricTwinRosterReceipt?.evidence_class === 'primary_public',
  'Electric Twin investor-roster receipt must be primary public');
assert(electricTwinRosterReceipt?.source_published_at === '2026-02-12',
  'Electric Twin investor-roster source date is stale');
assert(electricTwinRosterReceipt?.event_date === '2026-02-12',
  'Electric Twin investor-roster observation date is stale');
assert(electricTwinRosterReceipt?.linkedin_activity_id === '7427643696898158594',
  'Electric Twin investor-roster activity ID is stale');
assert(!receiptById.has('tech-eu-electric-twin-seed-round-2026-02-12'),
  'superseded Tech.eu funding receipt remains canonical');
const electricTwinRosterBases = hopGraph.edges
  .flatMap(edge => edge.surfaces)
  .filter(basis => basis.surface_id === 'electric-twin-investor-roster-observation-2026-02-12');
assert(electricTwinRosterBases.length === 10,
  'Electric Twin investor roster must compile exactly ten actor-pair bases');
for (const basis of electricTwinRosterBases) {
  assert(basis.evidence_class === 'primary_public',
    'Electric Twin investor-roster hop basis remains below first-party evidence');
  assert(sameIdSet(basis.receipt_ids,
    ['alex-cooper-linkedin-electric-twin-investor-roster-2026-02-12']),
    'Electric Twin investor-roster hop basis receipts are stale');
  assert(basis.valid_from === '2026-02-12' && basis.valid_until === '2026-02-12',
    'Electric Twin investor-roster hop basis window is stale');
}

"""
validator_text = validator_text.replace(marker, validator_gate + marker)
validator_path.write_text(validator_text, encoding="utf-8")

for path in [
    "data/ledger/receipts.jsonl",
    "data/ledger/surfaces.jsonl",
    "data/ledger/participation.jsonl",
    "test/compiler.test.js",
    "tools/validate-release.mjs",
]:
    text = Path(path).read_text(encoding="utf-8")
    if OLD_RECEIPT in text:
        raise SystemExit(f"superseded receipt remains in authored file: {path}")

print(json.dumps({
    "receipt_sha256": receipt_sha256,
    "source_receipts": len(receipts),
    "source_surfaces": len(surfaces),
    "source_participations": len(participation),
    "round_actor_count": 1,
    "roster_actor_count": 5,
}, sort_keys=True))
