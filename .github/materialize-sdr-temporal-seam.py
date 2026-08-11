from pathlib import Path
import json
import sys


def read_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def write_jsonl(path, rows):
    Path(path).write_text("\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in rows) + "\n")


def read_json(path):
    return json.loads(Path(path).read_text())


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one occurrence, found {count}")
    return text.replace(old, new, 1)


def mutate():
    terms_receipt = {
        "receipt_id": "gov-sdr-terms-of-reference",
        "label": "GOV.UK — Strategic Defence Review 2024-2025: terms of reference (17 Jul 2024)",
        "source_type": "official_reference",
        "evidence_class": "official",
        "path": "https://www.gov.uk/government/publications/strategic-defence-review-2024-2025-terms-of-reference/strategic-defence-review-2024-2025-terms-of-reference",
        "publisher": "Ministry of Defence",
        "source_published_at": "2024-07-17",
        "event_date": "2024-07-17",
        "retrieved_at": "2026-08-11",
        "notes": "The official terms record that the Prime Minister launched the Review on 16 July 2024 and, in the document published on 17 July, identify the Defence Secretary oversight role, the three external Reviewers, the Ministry of Defence secretariat, and the intended reporting route. The dated hop rests on the bounded 17 July terms-and-commission record, not on presumed continuous Prime Minister participation in the later workstream.",
        "archive": {
            "method": "internet_archive",
            "ref": "http://web.archive.org/web/20260516210401/https://www.gov.uk/government/publications/strategic-defence-review-2024-2025-terms-of-reference/strategic-defence-review-2024-2025-terms-of-reference",
            "captured": "20260516210401",
            "checked": "2026-07-06",
        },
    }
    publication_receipt = {
        "receipt_id": "gov-sdr-2025-publication",
        "label": "GOV.UK — The Strategic Defence Review 2025: Making Britain Safer (2 Jun 2025)",
        "source_type": "official_reference",
        "evidence_class": "official",
        "path": "https://www.gov.uk/government/publications/the-strategic-defence-review-2025-making-britain-safer-secure-at-home-strong-abroad",
        "publisher": "Ministry of Defence",
        "source_published_at": "2025-06-02",
        "source_updated_at": "2025-07-08",
        "event_date": "2025-06-02",
        "retrieved_at": "2026-08-11",
        "notes": "Official publication landing page for the final Strategic Defence Review report. It supplies the 2 June 2025 endpoint for the reviewer workstream and separately records later page updates. It does not by itself establish a dated Prime Minister reception, response, meeting, or continuous participation in the review work.",
        "archive": {
            "method": "internet_archive",
            "ref": "http://web.archive.org/web/20260703190844/https://www.gov.uk/government/publications/the-strategic-defence-review-2025-making-britain-safer-secure-at-home-strong-abroad",
            "captured": "20260703190844",
            "checked": "2026-07-06",
        },
    }

    replacements = {row["receipt_id"]: row for row in [terms_receipt, publication_receipt]}
    seen = set()
    receipts_out = []
    for row in read_jsonl("data/ledger/receipts.jsonl"):
        receipt_id = row.get("receipt_id")
        if receipt_id in replacements:
            receipts_out.append(replacements[receipt_id])
            seen.add(receipt_id)
        else:
            receipts_out.append(row)
    if seen != set(replacements):
        raise SystemExit(f"SDR receipt rows missing: {set(replacements) - seen}")
    write_jsonl("data/ledger/receipts.jsonl", receipts_out)

    development_surface = {
        "surface_id": "strategic-defence-review-development-2024-2025",
        "surface_label": "Strategic Defence Review external-reviewer workstream, 2024-2025",
        "surface_type": "policy_document_surface",
        "secondary_surface_types": ["defence_industrial_surface", "government_advisory_surface"],
        "hop_eligible": False,
        "scorable": True,
        "status": "split_from_lifecycle_composite",
        "bounded_by": [
            "17 July 2024 official terms naming the three external Reviewers and oversight arrangements",
            "Ministry of Defence secretariat and Defence Review Team workstream",
            "2 June 2025 final-report publication endpoint",
        ],
        "time_start": "2024-07-17",
        "time_end": "2025-06-02",
        "receipt_ids": ["gov-sdr-terms-of-reference", "gov-sdr-2025-publication"],
        "notes": "Non-hop workstream for the external Reviewers, Defence Secretary oversight, and Ministry of Defence support. The terms require progress and final reporting to senior officeholders, but report recipients and commissioning authority are not silently converted into continuous shared participation or actor adjacency.",
    }
    terms_surface = {
        "surface_id": "strategic-defence-review-2024-2025",
        "surface_label": "Strategic Defence Review terms and commission, 17 July 2024",
        "surface_type": "policy_document_surface",
        "secondary_surface_types": ["defence_industrial_surface", "government_advisory_surface"],
        "hop_eligible": True,
        "scorable": True,
        "status": "split_and_temporally_bounded_from_official_record",
        "bounded_by": [
            "17 July 2024 official terms of reference",
            "Prime Minister launch and commissioning authority stated in the terms",
            "three external Reviewers and Defence Secretary oversight named in the same bounded record",
        ],
        "time_start": "2024-07-17",
        "time_end": "2024-07-17",
        "receipt_ids": ["gov-sdr-terms-of-reference"],
        "notes": "One-day official terms-and-commission surface linking the Prime Minister, Defence Secretary, and three named external Reviewers through the published policy record. It does not establish a private meeting, conversation, agreement outside the stated review arrangements, continuous co-work, influence, motive, wrongdoing, coordination, common purpose, or causation.",
    }

    surfaces_out = []
    replaced = False
    for row in read_jsonl("data/ledger/surfaces.jsonl"):
        if row.get("surface_id") == terms_surface["surface_id"]:
            surfaces_out.extend([development_surface, terms_surface])
            replaced = True
        elif row.get("surface_id") != development_surface["surface_id"]:
            surfaces_out.append(row)
    if not replaced:
        raise SystemExit("Strategic Defence Review lifecycle surface is missing")
    write_jsonl("data/ledger/surfaces.jsonl", surfaces_out)

    development_receipts = ["gov-sdr-terms-of-reference", "gov-sdr-2025-publication"]
    sdr_participation = []
    for actor_id, role, participation_type in [
        ("george-robertson", "Lead external Reviewer (Lord Robertson of Port Ellen)", "government_adviser"),
        ("richard-barrons", "External Reviewer (General Sir Richard Barrons)", "government_adviser"),
        ("fiona-hill", "External Reviewer (Dr Fiona Hill CMG)", "government_adviser"),
        ("john-healey", "Defence Secretary overseeing the Review", "government_official"),
    ]:
        sdr_participation.append({
            "surface_id": development_surface["surface_id"],
            "participant_type": "actor",
            "actor_id": actor_id,
            "role": role,
            "participation_type": participation_type,
            "time_start": "2024-07-17",
            "time_end": "2025-06-02",
            "evidence_class": "official",
            "receipt_ids": development_receipts,
        })
    sdr_participation.append({
        "surface_id": development_surface["surface_id"],
        "participant_type": "organization",
        "organization_id": "mod",
        "role": "Secretariat and Defence Review Team host",
        "participation_type": "policy_department",
        "time_start": "2024-07-17",
        "time_end": "2025-06-02",
        "evidence_class": "official",
        "receipt_ids": development_receipts,
    })

    for actor_id, role, participation_type in [
        ("keir-starmer", "Prime Minister — launch and commissioning authority stated in the terms", "government_official"),
        ("john-healey", "Defence Secretary commissioned to oversee the Review", "government_official"),
        ("george-robertson", "Lead external Reviewer named in the terms", "government_adviser"),
        ("richard-barrons", "External Reviewer named in the terms", "government_adviser"),
        ("fiona-hill", "External Reviewer named in the terms", "government_adviser"),
    ]:
        sdr_participation.append({
            "surface_id": terms_surface["surface_id"],
            "participant_type": "actor",
            "actor_id": actor_id,
            "role": role,
            "participation_type": participation_type,
            "time_start": "2024-07-17",
            "time_end": "2024-07-17",
            "evidence_class": "official",
            "receipt_ids": ["gov-sdr-terms-of-reference"],
        })
    sdr_participation.append({
        "surface_id": terms_surface["surface_id"],
        "participant_type": "organization",
        "organization_id": "mod",
        "role": "Publishing department and review secretariat",
        "participation_type": "policy_department",
        "time_start": "2024-07-17",
        "time_end": "2024-07-17",
        "evidence_class": "official",
        "receipt_ids": ["gov-sdr-terms-of-reference"],
    })

    participation_out = []
    inserted = False
    for row in read_jsonl("data/ledger/participation.jsonl"):
        if row.get("surface_id") in {development_surface["surface_id"], terms_surface["surface_id"]}:
            if not inserted:
                participation_out.extend(sdr_participation)
                inserted = True
            continue
        participation_out.append(row)
    if not inserted:
        raise SystemExit("Strategic Defence Review participation rows are missing")
    write_jsonl("data/ledger/participation.jsonl", participation_out)

    compiler_path = Path("test/compiler.test.js")
    compiler = compiler_path.read_text()
    marker = "// Disjoint dated participations on the same surface must NOT hop."
    sdr_test = """// The Strategic Defence Review lifecycle is split so commissioning authority cannot become year-long co-work.
const sdrDevelopment = surf('strategic-defence-review-development-2024-2025');
assert.ok(sdrDevelopment, 'the external-reviewer workstream must be compiled');
assert.equal(sdrDevelopment.hop_eligible, false, 'the review workstream must remain context only');
assert.deepEqual(sdrDevelopment.receipt_ids, ['gov-sdr-terms-of-reference', 'gov-sdr-2025-publication']);
assert.ok(!hop.edges.some(edge => edge.surfaces.some(basis => basis.surface_id === sdrDevelopment.surface_id)),
  'the review workstream must never create actor adjacency');
assert.deepEqual(
  sdrDevelopment.participants.filter(part => part.participant_type === 'actor').map(part => part.actor_id).sort(),
  ['fiona-hill', 'george-robertson', 'john-healey', 'richard-barrons']
);

const sdrTermsReceipt = receipt('gov-sdr-terms-of-reference');
const sdrPublicationReceipt = receipt('gov-sdr-2025-publication');
assert.equal(sdrTermsReceipt.source_published_at, '2024-07-17');
assert.equal(sdrTermsReceipt.event_date, '2024-07-17');
assert.equal(sdrPublicationReceipt.source_published_at, '2025-06-02');
assert.equal(sdrPublicationReceipt.source_updated_at, '2025-07-08');
assert.equal(sdrPublicationReceipt.event_date, '2025-06-02');

const starmerBarrons = hop.edges.find(edge =>
  [edge.actor_a, edge.actor_b].sort().join('|') === 'keir-starmer|richard-barrons');
assert.ok(starmerBarrons, 'Keir Starmer and Richard Barrons must connect on the bounded terms record');
const sdrTermsBasis = starmerBarrons.surfaces.find(basis => basis.surface_id === 'strategic-defence-review-2024-2025');
assert.ok(sdrTermsBasis, 'the Starmer/Barrons edge must name the terms-and-commission surface');
assert.equal(sdrTermsBasis.surface_label, 'Strategic Defence Review terms and commission, 17 July 2024');
assert.equal(sdrTermsBasis.evidence_class, 'official');
assert.equal(sdrTermsBasis.valid_from, '2024-07-17');
assert.equal(sdrTermsBasis.valid_until, '2024-07-17');
assert.deepEqual(sdrTermsBasis.receipt_ids, ['gov-sdr-terms-of-reference']);
const activeSdrTermsBasis = date => starmerBarrons.surfaces.filter(basis =>
  basis.surface_id === 'strategic-defence-review-2024-2025'
    && basis.valid_from <= date
    && basis.valid_until >= date);
assert.equal(activeSdrTermsBasis('2024-07-16').length, 0, 'the terms record must not backdate a direct hop to the launch date');
assert.equal(activeSdrTermsBasis('2024-07-17').length, 1, 'the terms record supports the direct hop only on its publication date');
assert.equal(activeSdrTermsBasis('2025-06-02').length, 0, 'final-report publication must not manufacture a later Prime Minister hop');
assert.equal(shortestPath(topology, 'keir-starmer', 'richard-barrons', { asOf: '2024-07-17' }).number, 1);

"""
    compiler = replace_once(compiler, marker, sdr_test + marker, "SDR temporal regression insertion")
    compiler_path.write_text(compiler)

    coverage = read_json("data/research/corpus-coverage.json")
    lane = next(row for row in coverage["lanes"] if row["lane_id"] == "ai-policy-public-private-topology")
    metric = next(row for row in lane["metrics"] if row["metric_id"] == "bounded_surfaces")
    metric["observed"] = len(surfaces_out)
    write_json("data/research/corpus-coverage.json", coverage)


def reconcile():
    surfaces = read_jsonl("data/ledger/surfaces.jsonl")
    participations = read_jsonl("data/ledger/participation.jsonl")
    receipts = read_jsonl("data/ledger/receipts.jsonl")
    hop = read_json("build/hop-graph.json")
    scout_count = len(read_json("build/scout-report.json")["findings"])

    cross = read_json("data/research/clifford-cross-corpus-public-interest-map.json")
    cross["inventory"]["canonical"].update({
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
        raise SystemExit("usage: materialize-sdr-temporal-seam.py mutate|reconcile")
    {"mutate": mutate, "reconcile": reconcile}[sys.argv[1]]()
