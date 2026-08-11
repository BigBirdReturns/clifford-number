from pathlib import Path
import hashlib
import json
import sys


OLD_SURFACE_ID = "electric-twin-funding-surface-2023-2026"
SEED_SURFACE_ID = "electric-twin-seed-round-2026-02-11"
DIRECTOR_SURFACE_ID = "electric-twin-ben-blume-director-appointment-2025-09-12"


def read_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path, rows):
    Path(path).write_text(
        "\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in rows) + "\n",
        encoding="utf-8",
    )


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one occurrence, found {count}")
    return text.replace(old, new, 1)


def write_receipt_extract(path, content):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n", encoding="utf-8")
    return "sha256:" + hashlib.sha256(target.read_bytes()).hexdigest()


def mutate():
    electric_extract_path = "receipts/topology/electric-twin-seed-round-announcement-2026-02-11.md"
    tech_eu_extract_path = "receipts/topology/tech-eu-electric-twin-seed-round-2026-02-12.md"
    companies_house_extract_path = "receipts/topology/companies-house-electric-twin-ben-blume-director-2025-09-12.md"

    electric_hash = write_receipt_extract(
        electric_extract_path,
        """
# Electric Twin funding announcement, 11 February 2026

- Source URL: https://www.electrictwin.com/blog/electric-twin-announcing-14m-in-funding
- Publisher: Electric Twin
- Author: Alex Cooper, CEO and co-founder
- Source publication date: 2026-02-11
- Event date used by the topology: 2026-02-11
- Retrieved: 2026-08-11
- Evidence class: primary public statement

## Source-bounded observations

Electric Twin publicly announced total funding of $14 million. The company described a $10 million round led by Atomico, with participation from LocalGlobe, Mercuri, and Marc Andreessen. It described that round as following a previously undisclosed $4 million pre-seed.

## Boundaries

This is primary evidence for what Electric Twin announced. It does not independently establish the transaction closing date, security class, cash received, shareholder allocation, governance rights, or board rights. The source does not date the previously undisclosed pre-seed or identify its participants. That pre-seed therefore creates no dated actor-to-actor hop in this transaction. Participation in the announced round does not prove acquaintance, coordination, ideological alignment, common control, or involvement in company decisions.
        """,
    )
    tech_eu_hash = write_receipt_extract(
        tech_eu_extract_path,
        """
# Tech.eu report on the Electric Twin funding round, 12 February 2026

- Source URL: https://tech.eu/2026/02/12/electric-twin-expands-ai-audience-platform-with-14m-round/
- Publisher: Tech.eu
- Author: Tamara Djurickovic
- Source publication date: 2026-02-12
- Event date used by the topology: 2026-02-11
- Retrieved: 2026-08-11
- Evidence class: reported

## Source-bounded observations

Tech.eu reported that Electric Twin had raised $14 million in total, including a $10 million round led by Atomico. It named LocalGlobe, Mercuri, and Samos Investments as participating funds and named Marc Andreessen, Cal Henderson, Eric Salama, Tom Shinner, and Louis Mosley as angel investors.

## Boundaries

This report supplies the complete named participant list used for reported participation rows. It is not a company filing and does not establish closing mechanics, security rights, beneficial ownership, board nomination rights, or the timing and participants of the previously undisclosed pre-seed. The report was published one day after the company announcement. Its publication date is preserved separately from the 11 February announcement event.
        """,
    )
    companies_house_hash = write_receipt_extract(
        companies_house_extract_path,
        """
# Companies House officer record for Ben Blume at Electric Twin Ltd

- Source URL: https://find-and-update.company-information.service.gov.uk/company/15173006/officers
- Publisher: Companies House
- Company: ELECTRIC TWIN LTD
- Company number: 15173006
- Event date: 2025-09-12
- Retrieved: 2026-08-11
- Evidence class: official

## Source-bounded observations

The Companies House officer page lists Benjamin Adam Blume as an active director of Electric Twin Ltd and records his appointment date as 12 September 2025.

## Boundaries

The officer register establishes the filed directorship and appointment date. It does not state which investor proposed the appointment or establish observer rights, veto rights, information rights, shareholder rights, compensation, participation in every company decision, or any relationship between Ben Blume and the investors named in the later funding announcement.
        """,
    )

    new_receipts = [
        {
            "receipt_id": "electric-twin-seed-round-announcement-2026-02-11",
            "label": "Electric Twin — $14m funding announcement (11 Feb 2026 structured extract)",
            "source_type": "primary_public_extract",
            "evidence_class": "primary_public",
            "path": electric_extract_path,
            "source_url": "https://www.electrictwin.com/blog/electric-twin-announcing-14m-in-funding",
            "publisher": "Electric Twin",
            "author": "Alex Cooper",
            "source_published_at": "2026-02-11",
            "event_date": "2026-02-11",
            "retrieved_at": "2026-08-11",
            "notes": "Source-native company announcement for the $10m round, the named lead and participants, and the separately disclosed but undated $4m pre-seed. It does not establish closing mechanics or governance rights.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": electric_hash,
                "captured": "2026-08-11",
                "checked": "2026-08-11",
                "note": "Hash covers the in-repo structured extract; source_url preserves the public company page.",
            },
        },
        {
            "receipt_id": "tech-eu-electric-twin-seed-round-2026-02-12",
            "label": "Tech.eu — Electric Twin expands AI audience platform with $14M round (12 Feb 2026 structured extract)",
            "source_type": "journalism_source_extract",
            "evidence_class": "reported",
            "path": tech_eu_extract_path,
            "source_url": "https://tech.eu/2026/02/12/electric-twin-expands-ai-audience-platform-with-14m-round/",
            "publisher": "Tech.eu",
            "author": "Tamara Djurickovic",
            "source_published_at": "2026-02-12",
            "event_date": "2026-02-11",
            "retrieved_at": "2026-08-11",
            "notes": "Reported source for Samos Investments and the complete named angel list. Its publication date remains separate from the company announcement event date.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": tech_eu_hash,
                "captured": "2026-08-11",
                "checked": "2026-08-11",
                "note": "Hash covers the in-repo structured extract; source_url preserves the public article.",
            },
        },
        {
            "receipt_id": "companies-house-electric-twin-ben-blume-director-2025-09-12",
            "label": "Companies House — Ben Blume director appointment at Electric Twin Ltd (12 Sep 2025 structured extract)",
            "source_type": "official_source_extract",
            "evidence_class": "official",
            "path": companies_house_extract_path,
            "source_url": "https://find-and-update.company-information.service.gov.uk/company/15173006/officers",
            "publisher": "Companies House",
            "event_date": "2025-09-12",
            "retrieved_at": "2026-08-11",
            "notes": "Official officer-register evidence for the appointment date. It does not establish investor nomination, shareholder rights, board powers, or involvement in every company decision.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": companies_house_hash,
                "captured": "2026-08-11",
                "checked": "2026-08-11",
                "note": "Hash covers the in-repo structured extract; source_url preserves the official officer page.",
            },
        },
    ]

    receipts = read_jsonl("data/ledger/receipts.jsonl")
    existing_receipt_ids = {row["receipt_id"] for row in receipts}
    collisions = existing_receipt_ids.intersection(row["receipt_id"] for row in new_receipts)
    if collisions:
        raise SystemExit(f"receipt IDs already exist: {sorted(collisions)}")
    receipts.extend(new_receipts)
    write_jsonl("data/ledger/receipts.jsonl", receipts)

    seed_surface = {
        "surface_id": SEED_SURFACE_ID,
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
        "receipt_ids": [
            "electric-twin-seed-round-announcement-2026-02-11",
            "tech-eu-electric-twin-seed-round-2026-02-12",
        ],
        "notes": "One-day public financing-announcement surface. The company post supports Atomico, LocalGlobe, Mercuri, and Marc Andreessen; Tech.eu reports Samos Investments and angels Cal Henderson, Eric Salama, Tom Shinner, and Louis Mosley. The previously undisclosed $4m pre-seed has no date or participant list in these receipts and creates no separate hop. Co-investment does not establish acquaintance, coordination, ideological alignment, shared control, board rights, or participation in company decisions.",
    }
    director_surface = {
        "surface_id": DIRECTOR_SURFACE_ID,
        "surface_label": "Electric Twin appointment of Ben Blume as director, 12 September 2025",
        "surface_type": "board_advisory_surface",
        "secondary_surface_types": ["surface_factory_capital_layer"],
        "hop_eligible": False,
        "scorable": True,
        "status": "source_native_officer_appointment",
        "bounded_by": [
            "Companies House officer register for Electric Twin Ltd",
            "filed appointment date of 12 September 2025",
            "director appointment kept separate from the later funding announcement",
        ],
        "time_start": "2025-09-12",
        "time_end": "2025-09-12",
        "receipt_ids": ["companies-house-electric-twin-ben-blume-director-2025-09-12"],
        "notes": "Official one-day officer-appointment surface. It records Ben Blume's directorship without inferring which investor proposed the appointment, any observer, veto, information, or shareholder rights, participation in every decision, or a relationship with the investors named in the later funding announcement.",
    }

    surfaces = read_jsonl("data/ledger/surfaces.jsonl")
    if any(row.get("surface_id") in {SEED_SURFACE_ID, DIRECTOR_SURFACE_ID} for row in surfaces):
        raise SystemExit("new Electric Twin surface IDs already exist")
    surfaces_out = []
    replaced = 0
    for row in surfaces:
        if row.get("surface_id") == OLD_SURFACE_ID:
            surfaces_out.extend([seed_surface, director_surface])
            replaced += 1
        else:
            surfaces_out.append(row)
    if replaced != 1:
        raise SystemExit(f"expected one legacy Electric Twin funding surface, found {replaced}")
    write_jsonl("data/ledger/surfaces.jsonl", surfaces_out)

    official_receipt = ["electric-twin-seed-round-announcement-2026-02-11"]
    reported_receipt = ["tech-eu-electric-twin-seed-round-2026-02-12"]
    seed_participation = [
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "electric-twin",
            "role": "company announcing the seed round",
            "participation_type": "company",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "primary_public",
            "receipt_ids": official_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "atomico",
            "role": "lead investor named by the company",
            "participation_type": "investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "primary_public",
            "receipt_ids": official_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "localglobe",
            "role": "participating investor named by the company",
            "participation_type": "investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "primary_public",
            "receipt_ids": official_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "mercuri",
            "role": "participating investor named by the company",
            "participation_type": "investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "primary_public",
            "receipt_ids": official_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "samos",
            "role": "participating investor reported by Tech.eu",
            "participation_type": "investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "reported",
            "receipt_ids": reported_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "marc-andreessen",
            "role": "angel investor named by the company",
            "participation_type": "angel_investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "primary_public",
            "receipt_ids": official_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "cal-henderson",
            "role": "angel investor reported by Tech.eu",
            "participation_type": "angel_investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "reported",
            "receipt_ids": reported_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "eric-salama",
            "role": "angel investor reported by Tech.eu",
            "participation_type": "angel_investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "reported",
            "receipt_ids": reported_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "tom-shinner",
            "role": "angel investor reported by Tech.eu",
            "participation_type": "angel_investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "reported",
            "receipt_ids": reported_receipt,
        },
        {
            "surface_id": SEED_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "louis-mosley",
            "role": "angel investor reported by Tech.eu",
            "participation_type": "angel_investor",
            "time_start": "2026-02-11",
            "time_end": "2026-02-11",
            "evidence_class": "reported",
            "receipt_ids": reported_receipt,
        },
    ]
    director_participation = [
        {
            "surface_id": DIRECTOR_SURFACE_ID,
            "participant_type": "actor",
            "actor_id": "ben-blume",
            "role": "Director appointed on 12 September 2025",
            "participation_type": "director",
            "time_start": "2025-09-12",
            "time_end": "2025-09-12",
            "evidence_class": "official",
            "receipt_ids": ["companies-house-electric-twin-ben-blume-director-2025-09-12"],
        },
        {
            "surface_id": DIRECTOR_SURFACE_ID,
            "participant_type": "organization",
            "organization_id": "electric-twin",
            "role": "company whose officer register records the appointment",
            "participation_type": "company",
            "time_start": "2025-09-12",
            "time_end": "2025-09-12",
            "evidence_class": "official",
            "receipt_ids": ["companies-house-electric-twin-ben-blume-director-2025-09-12"],
        },
    ]

    participation = read_jsonl("data/ledger/participation.jsonl")
    participation_out = []
    inserted = False
    removed = 0
    for row in participation:
        if row.get("surface_id") == OLD_SURFACE_ID:
            removed += 1
            if not inserted:
                participation_out.extend(seed_participation)
                participation_out.extend(director_participation)
                inserted = True
            continue
        if row.get("surface_id") in {SEED_SURFACE_ID, DIRECTOR_SURFACE_ID}:
            raise SystemExit("new Electric Twin participation rows already exist")
        participation_out.append(row)
    if not inserted or removed == 0:
        raise SystemExit("legacy Electric Twin funding participation rows are missing")
    write_jsonl("data/ledger/participation.jsonl", participation_out)

    actors_doc = read_json("data/canonical/actors.json")
    actor_ids = {row["id"] for row in actors_doc["actors"]}
    for actor in [
        {"id": "eric-salama", "label": "Eric Salama", "kind": "person"},
        {"id": "ben-blume", "label": "Ben Blume", "kind": "person"},
    ]:
        if actor["id"] in actor_ids:
            raise SystemExit(f"actor ID already exists: {actor['id']}")
        actors_doc["actors"].append(actor)
        actor_ids.add(actor["id"])
    write_json("data/canonical/actors.json", actors_doc)

    validate_path = Path("tools/validate-release.mjs")
    validate_release = validate_path.read_text(encoding="utf-8")
    old_factory_fixture = """for (const sid of ['electric-twin-founder-2023', 'electric-twin-ethics-board-2026', 'electric-twin-funding-surface-2023-2026', 'electric-twin-newsuk-synthetic-audience', 'gartner-synthetic-population-category-2026']) {
  assert(et?.surfaces.includes(sid), `Electric Twin missing factory surface ${sid}`);
}"""
    new_factory_fixture = """for (const sid of ['electric-twin-founder-2023', 'electric-twin-ethics-board-2026', 'electric-twin-seed-round-2026-02-11', 'electric-twin-ben-blume-director-appointment-2025-09-12', 'electric-twin-newsuk-synthetic-audience', 'gartner-synthetic-population-category-2026']) {
  assert(et?.surfaces.includes(sid), `Electric Twin missing factory surface ${sid}`);
}"""
    validate_release = replace_once(
        validate_release,
        old_factory_fixture,
        new_factory_fixture,
        "Electric Twin surface-factory release fixture",
    )
    validate_path.write_text(validate_release, encoding="utf-8")

    compiler_path = Path("test/compiler.test.js")
    compiler = compiler_path.read_text(encoding="utf-8")
    marker = "// The Strategic Defence Review lifecycle is split so commissioning authority cannot become year-long co-work."
    regression = """// The Electric Twin capital layer is a dated financing-announcement surface, not a 2023-2026 relationship span.
assert.equal(surf('electric-twin-funding-surface-2023-2026'), undefined,
  'the legacy multi-year funding surface must be retired');
const electricTwinSeed = surf('electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinSeed, 'the source-native Electric Twin seed-round surface must compile');
assert.equal(electricTwinSeed.surface_label, 'Electric Twin $10m seed round announcement, 11 February 2026');
assert.equal(electricTwinSeed.hop_eligible, true);
assert.deepEqual(electricTwinSeed.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'tech-eu-electric-twin-seed-round-2026-02-12'
]);
assert.ok(!electricTwinSeed.receipt_ids.includes('master-doc-v3'),
  'the funding surface must no longer rest on the master-summary receipt');

const electricTwinSeedActors = electricTwinSeed.participants
  .filter(part => part.participant_type === 'actor')
  .map(part => part.actor_id)
  .sort();
assert.deepEqual(electricTwinSeedActors, [
  'cal-henderson',
  'eric-salama',
  'louis-mosley',
  'marc-andreessen',
  'tom-shinner'
]);
const electricTwinSeedOrgs = electricTwinSeed.participants
  .filter(part => part.participant_type === 'organization')
  .map(part => part.organization_id)
  .sort();
assert.deepEqual(electricTwinSeedOrgs, ['atomico', 'electric-twin', 'localglobe', 'mercuri', 'samos']);
const seedParticipant = id => electricTwinSeed.participants.find(part =>
  part.actor_id === id || part.organization_id === id);
for (const id of ['electric-twin', 'atomico', 'localglobe', 'mercuri', 'marc-andreessen']) {
  assert.equal(seedParticipant(id).evidence_class, 'primary_public', `${id} must retain company-source evidence`);
}
for (const id of ['samos', 'cal-henderson', 'eric-salama', 'tom-shinner', 'louis-mosley']) {
  assert.equal(seedParticipant(id).evidence_class, 'reported', `${id} must remain reported`);
}

const electricTwinAnnouncementReceipt = receipt('electric-twin-seed-round-announcement-2026-02-11');
const techEuFundingReceipt = receipt('tech-eu-electric-twin-seed-round-2026-02-12');
assert.equal(electricTwinAnnouncementReceipt.path,
  'receipts/topology/electric-twin-seed-round-announcement-2026-02-11.md');
assert.equal(electricTwinAnnouncementReceipt.source_published_at, '2026-02-11');
assert.equal(electricTwinAnnouncementReceipt.event_date, '2026-02-11');
assert.equal(techEuFundingReceipt.source_published_at, '2026-02-12');
assert.equal(techEuFundingReceipt.event_date, '2026-02-11',
  'the reporting date must remain separate from the announcement event date');

const andreessenSalama = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'eric-salama|marc-andreessen');
assert.ok(andreessenSalama, 'the reported angels must share the bounded announced round');
const electricTwinFundingBasis = andreessenSalama.surfaces.find(basis =>
  basis.surface_id === 'electric-twin-seed-round-2026-02-11');
assert.ok(electricTwinFundingBasis);
assert.equal(electricTwinFundingBasis.evidence_class, 'reported');
assert.equal(electricTwinFundingBasis.valid_from, '2026-02-11');
assert.equal(electricTwinFundingBasis.valid_until, '2026-02-11');
assert.deepEqual(electricTwinFundingBasis.receipt_ids, [
  'electric-twin-seed-round-announcement-2026-02-11',
  'tech-eu-electric-twin-seed-round-2026-02-12'
]);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-10' }).number, null,
  'the funding announcement must not backdate investor adjacency');
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-11' }).number, 1);
assert.equal(shortestPath(topology, 'marc-andreessen', 'eric-salama', { asOf: '2026-02-12' }).number, null,
  'a one-day announcement surface must not become an ongoing relationship');

const benBlumeAppointment = surf('electric-twin-ben-blume-director-appointment-2025-09-12');
assert.ok(benBlumeAppointment, 'the official Ben Blume officer appointment must compile separately');
assert.equal(benBlumeAppointment.hop_eligible, false);
assert.deepEqual(
  benBlumeAppointment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id),
  ['ben-blume']
);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === benBlumeAppointment.surface_id)),
  'a single-actor officer appointment must never manufacture pairwise adjacency');
const benBlumeReceipt = receipt('companies-house-electric-twin-ben-blume-director-2025-09-12');
assert.equal(benBlumeReceipt.event_date, '2025-09-12');
assert.equal(benBlumeReceipt.evidence_class, 'official');

// The previously undisclosed $4m pre-seed remains undated and has no promoted participant surface.
assert.ok(!surface.surfaces.some(row => /pre.?seed/i.test(row.surface_id)),
  'the undated pre-seed disclosure must not be promoted into a dated surface');

"""
    compiler = replace_once(compiler, marker, regression + marker, "Electric Twin funding regression insertion")
    compiler_path.write_text(compiler, encoding="utf-8")


def reconcile():
    actors = read_json("data/canonical/actors.json")["actors"]
    organizations = read_json("data/canonical/organizations.json")["organizations"]
    surfaces = read_jsonl("data/ledger/surfaces.jsonl")
    participations = read_jsonl("data/ledger/participation.jsonl")
    receipts = read_jsonl("data/ledger/receipts.jsonl")
    hop = read_json("build/hop-graph.json")
    scout_count = len(read_json("build/scout-report.json")["findings"])

    coverage = read_json("data/research/corpus-coverage.json")
    lane = next(row for row in coverage["lanes"] if row["lane_id"] == "ai-policy-public-private-topology")
    metrics = {row["metric_id"]: row for row in lane["metrics"]}
    metrics["compiled_actors"]["observed"] = len(actors)
    metrics["compiled_organizations"]["observed"] = len(organizations)
    metrics["bounded_surfaces"]["observed"] = len(surfaces)
    metrics["compiled_hop_edges"]["observed"] = len(hop["edges"])
    write_json("data/research/corpus-coverage.json", coverage)

    cross = read_json("data/research/clifford-cross-corpus-public-interest-map.json")
    cross["inventory"]["canonical"].update({
        "actors": len(actors),
        "organizations": len(organizations),
        "surfaces": len(surfaces),
        "participations": len(participations),
        "receipts": len(receipts),
        "compiled_hop_edges": len(hop["edges"]),
    })

    def apply(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "scout_findings":
                    value[key] = scout_count
                else:
                    apply(child)
        elif isinstance(value, list):
            for child in value:
                apply(child)

    apply(cross)
    write_json("data/research/clifford-cross-corpus-public-interest-map.json", cross)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"mutate", "reconcile"}:
        raise SystemExit("usage: materialize-electric-twin-funding-boundary.py mutate|reconcile")
    {"mutate": mutate, "reconcile": reconcile}[sys.argv[1]]()
