#!/usr/bin/env python3
import hashlib
import json
import os
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path.cwd()
EXPECTED_MAIN = "e499eaeeb6bcdf64b76f0440c10e79ea1c064c4a"
AWARD_ID = "CONT_AWD_FA930025C6015_9700_-NONE-_-NONE-"
PIID = "FA930025C6015"
UEI = "MD76AJXHCMQ5"
RECIPIENT = "X-BOW LAUNCH SYSTEMS INC"
PROGRAMME = "ADVANCED INTEGRATED MOTOR MANUFACTURING"
ACCESSED = "2026-09-08"
CUSTODY = pathlib.Path("receipts/natsec100/ce0364-xbow-20260908")
EVENTS = pathlib.Path("data/intake/natsec100-pathways/chunk1/conversion_events.jsonl")
RECEIPTS = pathlib.Path("data/intake/natsec100-pathways/chunk1/receipts.jsonl")
TEST = pathlib.Path("test/natsec100-award-control.test.js")
ADJUDICATION = pathlib.Path("data/research/natsec100-x-bow-award-adjudication.json")

ENDPOINTS = {
    "award": f"https://api.usaspending.gov/api/v2/awards/{AWARD_ID}/",
    "count": f"https://api.usaspending.gov/api/v2/awards/count/transaction/{AWARD_ID}/",
    "updated": "https://api.usaspending.gov/api/v2/awards/last_updated/",
    "transactions": "https://api.usaspending.gov/api/v2/transactions/",
}
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "CliffordNumber-CE0364-Materializer/1.0 (+https://github.com/BigBirdReturns/clifford-number/issues/2625)",
}


def invariant(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def stable_json(value):
    return (json.dumps(value, sort_keys=True, indent=2) + "\n").encode("utf-8")


def canonical_text_hash(data):
    text = data.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
    return sha256(text.encode("utf-8"))


def norm(value):
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def clean_headers(headers):
    output = {}
    for key, value in headers.items():
        if key.lower() == "set-cookie":
            output[key.lower()] = {"redacted": True, "sha256": sha256(value.encode("utf-8"))}
        else:
            output[key.lower()] = value
    return output


def fetch(name, url, method="GET", body=None):
    data = None if body is None else body.encode("utf-8")
    headers = dict(HEADERS)
    if data is not None:
        headers["Content-Type"] = "application/json"
    last = None
    for attempt in range(1, 5):
        started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        try:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read()
                status = response.status
                final_url = response.geturl()
                response_headers = dict(response.headers.items())
            completed = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            receipt = {
                "name": name,
                "method": method,
                "url": url,
                "request_headers": headers,
                "request_body": body,
                "request_body_bytes": len(data or b""),
                "request_body_sha256": None if data is None else sha256(data),
                "started_at": started,
                "completed_at": completed,
                "attempt": attempt,
                "status": status,
                "final_url": final_url,
                "response_headers": clean_headers(response_headers),
                "response_bytes": len(raw),
                "response_sha256": sha256(raw),
            }
            return raw, receipt
        except Exception as error:
            last = error
            if attempt < 4:
                time.sleep(0.75 * (2 ** (attempt - 1)))
    raise last


def write_bytes(path, data):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def source_entry(path, receipt):
    data = (ROOT / path).read_bytes()
    return {
        "path": path.as_posix(),
        "bytes": len(data),
        "sha256": sha256(data),
        "request_receipt": receipt,
    }


def main():
    award_raw, award_receipt = fetch("usaspending-award-detail.json", ENDPOINTS["award"])
    count_raw, count_receipt = fetch("usaspending-transaction-count.json", ENDPOINTS["count"])
    updated_raw, updated_receipt = fetch("usaspending-last-updated.json", ENDPOINTS["updated"])
    award = json.loads(award_raw)
    count = json.loads(count_raw)
    updated = json.loads(updated_raw)

    invariant(award["generated_unique_award_id"] == AWARD_ID, "generated award ID drift")
    invariant(norm(award["piid"]) == PIID, "PIID drift")
    invariant(norm(award["recipient"]["recipient_name"]) == norm(RECIPIENT), "recipient name drift")
    invariant(award["recipient"]["recipient_uei"] == UEI, "recipient UEI drift")
    invariant(award["description"].upper() == PROGRAMME, "programme drift")
    invariant(award["date_signed"] == "2025-09-25", "signed date drift")
    invariant(abs(award["total_obligation"] - 129494248) < .005, "total obligation drift")
    invariant(abs(award["base_and_all_options"] - 199303198) < .005, "potential value drift")
    invariant(isinstance(count["transactions"], int) and count["transactions"] > 0, "invalid transaction count")
    invariant(isinstance(updated["last_updated"], str) and updated["last_updated"], "invalid source update date")

    transaction_pages = []
    transaction_receipts = []
    page = 1
    while True:
        body = json.dumps({
            "award_id": AWARD_ID,
            "page": page,
            "sort": "action_date",
            "order": "asc",
            "limit": 5000,
        }, separators=(",", ":"))
        raw, receipt = fetch(
            f"usaspending-transactions-page-{page:04d}.json",
            ENDPOINTS["transactions"],
            "POST",
            body,
        )
        parsed = json.loads(raw)
        invariant(parsed["page_metadata"]["page"] == page, f"transaction page {page} mismatch")
        invariant(isinstance(parsed["results"], list), f"transaction page {page} has no results array")
        transaction_pages.append((raw, parsed))
        transaction_receipts.append(receipt)
        if not parsed["page_metadata"]["hasNext"]:
            invariant(parsed["page_metadata"]["next"] is None, "terminal transaction page has next pointer")
            break
        invariant(parsed["page_metadata"]["next"] == page + 1, "transaction next pointer drift")
        page += 1
        invariant(page <= 1000, "transaction pagination exceeded bound")

    rows = [row for _, page_data in transaction_pages for row in page_data["results"]]
    invariant(len(rows) == count["transactions"], "transaction count endpoint does not equal retained population")
    seen = set()
    obligation_sum = 0.0
    actions = []
    for row in rows:
        invariant(isinstance(row["id"], str) and row["id"] and row["id"] not in seen, "invalid or duplicate transaction ID")
        seen.add(row["id"])
        invariant(re.fullmatch(r"\d{4}-\d{2}-\d{2}", row["action_date"]), "invalid action date")
        value = row.get("federal_action_obligation")
        invariant(value is None or isinstance(value, (int, float)), "invalid action obligation")
        obligation_sum += value or 0.0
        actions.append({
            "id": row["id"],
            "type": row.get("type"),
            "type_description": row.get("type_description"),
            "modification_number": row.get("modification_number"),
            "action_date": row["action_date"],
            "action_type": row.get("action_type"),
            "action_type_description": row.get("action_type_description"),
            "federal_action_obligation": value,
            "description": row.get("description"),
        })
    invariant(abs(obligation_sum - award["total_obligation"]) < .005, "transaction obligations do not sum to award total")
    invariant(len(actions) == 1, f"expected one transaction, observed {len(actions)}")
    invariant(actions[0]["modification_number"] == "0", "sole transaction is not initial modification 0")
    invariant(actions[0]["action_date"] == "2025-09-25", "sole transaction action date drift")
    invariant(abs(actions[0]["federal_action_obligation"] - 129494248) < .005, "sole transaction obligation drift")

    potential_delta = award["base_and_all_options"] - 191303197
    obligation_delta = award["total_obligation"] - 121494248
    invariant(abs(potential_delta - 8000001) < .005, "potential-value delta drift")
    invariant(abs(obligation_delta - 8000000) < .005, "obligation delta drift")
    invariant(potential_delta != obligation_delta, "source differences were incorrectly collapsed")

    raw_files = [
        ("usaspending-award-detail.json", award_raw, award_receipt),
        ("usaspending-transaction-count.json", count_raw, count_receipt),
        ("usaspending-last-updated.json", updated_raw, updated_receipt),
    ]
    for index, (raw, _) in enumerate(transaction_pages, start=1):
        raw_files.append((f"usaspending-transactions-page-{index:04d}.json", raw, transaction_receipts[index - 1]))

    for name, raw, receipt in raw_files:
        write_bytes(CUSTODY / name, raw)
        write_bytes(CUSTODY / f"{name}.request.json", stable_json(receipt))

    dow_extract = f"""# Official contract-announcement extract: X-Bow FA9300-25-C-6015

```text
source_url: https://www.war.gov/News/Contracts/Contract/Article/4316486/contracts-for-sep-26-2025/
publisher: U.S. Department of War contract announcements
source_title: Contracts For Sep. 26, 2025
source_date: 2025-09-26
retrieved_at: {ACCESSED}
source_lines_reviewed: 263-267
```

## Source-supported fields

```text
recipient: X-Bow Launch Systems Inc.
recipient_location: Albuquerque, New Mexico
award_form: firm-fixed-price
announced_contract_value_usd: 191303197
programme: Advanced Integrated Motor Manufacturing
work_description: design, build, and demonstration of advanced solid rocket motor propellant manufacturing capability
expected_completion: 2029-04-30
competition_route: competitive open broad agency announcement
fund_context: Foreign Military Sales
obligated_at_award_usd: 121494248
contracting_activity: Air Force Test Center, Edwards Air Force Base, California
contract_id: FA9300-25-C-6015
broad_agency_announcement: FA9300-20-S-0001
```

## Interpretation boundary

This structured extract preserves the official award announcement and its field meanings. It does not establish the later USAspending cumulative obligation or potential value, explain either source difference, or prove that a later contract modification occurred.
"""
    sbir_extract = f"""# Official federal identity extract: X-Bow Launch Systems Inc.

```text
source_url: https://www.sbir.gov/portfolio/1220395
publisher: U.S. Small Business Administration, SBIR/STTR Portfolio
source_title: Company — X-BOW LAUNCH SYSTEMS INC
retrieved_at: {ACCESSED}
source_lines_reviewed: 69-85
```

## Source-supported fields

```text
legal_recipient_name: X-BOW LAUNCH SYSTEMS INC
address: 6200 UPTOWN BLVD NE SUITE 200, ALBUQUERQUE, NM 87110, USA
official_company_website: https://www.xbowsystems.com/
website_domain: xbowsystems.com
uei: MD76AJXHCMQ5
```

## Identity bridge

The official 2025 NatSec100 row identifies `X-Bow Systems` at `xbowsystems.com`. This official federal company profile identifies the federal recipient legal name, links the same domain, and supplies UEI `MD76AJXHCMQ5`. The bridge establishes brand/domain-to-federal-recipient identity for this bounded adjudication. It does not establish contract amount, ownership, control, coordination, intent, or wrongdoing.
"""
    write_bytes(CUSTODY / "department-of-war-announcement-extract.md", dow_extract.encode("utf-8"))
    write_bytes(CUSTODY / "sbir-identity-extract.md", sbir_extract.encode("utf-8"))

    source_entries = []
    for name, _, receipt in raw_files:
        source_entries.append(source_entry(CUSTODY / name, receipt))
        request_path = CUSTODY / f"{name}.request.json"
        request_data = (ROOT / request_path).read_bytes()
        source_entries.append({
            "path": request_path.as_posix(),
            "bytes": len(request_data),
            "sha256": sha256(request_data),
            "role": "request_and_response_metadata",
        })

    source_manifest = {
        "schema_version": "ce0364-usaspending-source-manifest@1",
        "repository_base": EXPECTED_MAIN,
        "acquired_at": award_receipt["completed_at"],
        "source_last_updated": updated["last_updated"],
        "award_id": AWARD_ID,
        "piid": "FA9300-25-C-6015",
        "recipient_name": RECIPIENT,
        "recipient_uei": UEI,
        "endpoints": ENDPOINTS,
        "files": source_entries,
        "award_fields": {
            "date_signed": award["date_signed"],
            "description": award["description"],
            "total_obligation": award["total_obligation"],
            "base_exercised_options": award["base_exercised_options"],
            "base_and_all_options": award["base_and_all_options"],
            "awarding_agency": award["awarding_agency"],
            "funding_agency": award["funding_agency"],
            "period_of_performance": award["period_of_performance"],
            "latest_transaction_contract_data": award["latest_transaction_contract_data"],
        },
        "transaction_population": {
            "count_endpoint": count["transactions"],
            "retained_count": len(actions),
            "page_count": len(transaction_pages),
            "obligation_sum": obligation_sum,
            "actions": actions,
        },
        "verification": {
            "pagination_complete": True,
            "count_matches_retained_population": True,
            "action_obligations_equal_award_total": True,
            "one_initial_action_only": True,
            "later_modification_observed": False,
        },
    }
    manifest_path = CUSTODY / "usaspending-source-manifest.json"
    write_bytes(manifest_path, stable_json(source_manifest))

    adjudication = {
        "schema_version": "natsec100-ce0364-x-bow-adjudication@2",
        "status": "source_specific_values_preserved_cause_unresolved",
        "as_of": ACCESSED,
        "issue_number": 2625,
        "event_id": "CE0364",
        "company_id": "x_bow_systems",
        "contract": {
            "piid": "FA9300-25-C-6015",
            "generated_unique_award_id": AWARD_ID,
            "programme": "Advanced Integrated Motor Manufacturing",
        },
        "identity_bridge": {
            "status": "resolved_for_bounded_brand_domain_to_uei_join",
            "natsec100_source_name": "X-Bow Systems",
            "natsec100_source_domain": "xbowsystems.com",
            "federal_recipient_name": RECIPIENT,
            "federal_recipient_uei": UEI,
            "official_identity_receipt_id": "R018",
            "legal_entity_scope": "federal_recipient_identity",
            "does_not_establish": ["ownership", "control", "coordination", "intent", "wrongdoing"],
        },
        "announcement_record": {
            "receipt_id": "R017",
            "source_date": "2025-09-26",
            "announced_contract_value": 191303197,
            "obligated_at_award": 121494248,
            "obligation_context": "Foreign Military Sales funds",
            "expected_completion": "2029-04-30",
            "contracting_activity": "Air Force Test Center",
        },
        "usa_spending_record": {
            "receipt_id": "R019",
            "source_last_updated": updated["last_updated"],
            "date_signed": award["date_signed"],
            "total_obligation": award["total_obligation"],
            "base_exercised_options": award["base_exercised_options"],
            "base_and_all_options": award["base_and_all_options"],
            "period_of_performance": award["period_of_performance"],
            "foreign_funding_description": award["latest_transaction_contract_data"].get("foreign_funding_description"),
            "source_manifest": manifest_path.as_posix(),
        },
        "transaction_population": {
            "count": len(actions),
            "obligation_sum": obligation_sum,
            "actions": actions,
            "later_action_observed": False,
            "later_modification_observed": False,
            "finding": "The complete source-native population contains one initial transaction, modification 0, dated 2025-09-25, obligating $129,494,248. No later transaction exists in the retained population.",
        },
        "reconciliation": {
            "potential_value_delta": potential_delta,
            "obligation_delta": obligation_delta,
            "deltas_are_equal": False,
            "cause": "unresolved",
            "finding": "The sole source-native action already carries the later USAspending obligation amount. The transaction history therefore does not support a later-modification explanation for the difference from the award announcement.",
            "additional_source_differences": {
                "announcement_expected_completion": "2029-04-30",
                "usa_spending_potential_end_date": award["period_of_performance"].get("potential_end_date"),
                "announcement_fund_context": "Foreign Military Sales funds",
                "usa_spending_foreign_funding_description": award["latest_transaction_contract_data"].get("foreign_funding_description"),
            },
            "prohibited_cause_inferences": [
                "post-award modification",
                "publisher typographical error",
                "upstream correction",
                "field-semantics conversion",
                "source-data error",
            ],
        },
        "receipt_ids": ["R010", "R017", "R018", "R019"],
        "disposition": {
            "event_confidence": "medium",
            "graph_effect": "none",
            "causal_status": "not_established",
            "wrongdoing": "not_established",
            "coordination": "not_established",
            "canonical_amount_collapse_permitted": False,
        },
    }
    write_bytes(ADJUDICATION, stable_json(adjudication))

    events_file = ROOT / EVENTS
    event_lines = events_file.read_text(encoding="utf-8").splitlines()
    parsed_events = [json.loads(line) for line in event_lines if line.strip()]
    indexes = [index for index, row in enumerate(parsed_events) if row.get("event_id") == "CE0364"]
    invariant(indexes == [363], f"CE0364 denominator drift: {indexes}")
    old_event = parsed_events[indexes[0]]
    invariant(old_event.get("receipt_ids") == ["R010"], "CE0364 receipt denominator drift")
    invariant(old_event.get("confidence") == "medium", "CE0364 confidence drift")
    replacement_event = {
        "event_id": "CE0364",
        "company_id": "x_bow_systems",
        "target_surface": "us_air_force_contracting",
        "date": "FY2025",
        "conversion_function": "government_award",
        "receipt_ids": ["R010", "R017", "R018", "R019"],
        "confidence": "medium",
        "competing_explanations": "The official award announcement and source-native USAspending record identify the same recipient, UEI, programme, and contract, but report distinct value, obligation, completion, and foreign-funding fields. The complete USAspending population contains one initial action and no later modification; the cause of the source differences remains unresolved.",
        "forbidden_inferences": "Multi-surface presence and ranking inclusion are graph facts only; no inference of coordination, favoritism, motive, wrongdoing, or a source-conflict cause.",
        "notes": "Contract FA9300-25-C-6015. Official announcement: $191,303,197 firm-fixed value and $121,494,248 obligated at award. USAspending: $199,303,198 base-and-all-options value and $129,494,248 total obligation from one initial transaction (modification 0, action date 2025-09-25). Preserve source-specific field meanings; do not publish one rounded obligation total.",
    }
    event_lines[indexes[0]] = json.dumps(replacement_event, ensure_ascii=False)
    events_file.write_text("\n".join(event_lines) + "\n", encoding="utf-8")

    receipts_file = ROOT / RECEIPTS
    receipts_text = receipts_file.read_text(encoding="utf-8")
    receipts = [json.loads(line) for line in receipts_text.splitlines() if line.strip()]
    existing_ids = {row.get("receipt_id") for row in receipts}
    invariant(not ({"R017", "R018", "R019"} & existing_ids), "CE0364 receipt IDs already exist")
    dow_path = CUSTODY / "department-of-war-announcement-extract.md"
    sbir_path = CUSTODY / "sbir-identity-extract.md"
    manifest_data = (ROOT / manifest_path).read_bytes()
    new_receipts = [
        {
            "receipt_id": "R017",
            "source_type": "official_source_extract",
            "title": "U.S. Department of War — Contracts For Sep. 26, 2025, X-Bow award",
            "url": "https://www.war.gov/News/Contracts/Contract/Article/4316486/contracts-for-sep-26-2025/",
            "path": dow_path.as_posix(),
            "accessed_date": ACCESSED,
            "quoted_or_line_reference": "Official contract page lines 263-267: X-Bow Launch Systems Inc.; Advanced Integrated Motor Manufacturing; $191,303,197 firm-fixed award; $121,494,248 in Foreign Military Sales funds obligated at award; FA9300-25-C-6015.",
            "evidence_class": "official",
            "notes": "Establishes the award-date announcement and its source-specific fields.",
            "limitations": "Does not explain the different cumulative obligation, potential value, completion date, or foreign-funding field later reported by USAspending.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": f"sha256:{canonical_text_hash((ROOT / dow_path).read_bytes())}",
                "captured": ACCESSED,
                "checked": ACCESSED,
                "note": "Hash covers the in-repository structured extract; the exact official live source URL and reviewed line range are preserved in the extract.",
            },
        },
        {
            "receipt_id": "R018",
            "source_type": "official_source_extract",
            "title": "SBIR.gov — X-BOW LAUNCH SYSTEMS INC company profile",
            "url": "https://www.sbir.gov/portfolio/1220395",
            "path": sbir_path.as_posix(),
            "accessed_date": ACCESSED,
            "quoted_or_line_reference": "Official company profile lines 75-85: X-BOW LAUNCH SYSTEMS INC; website xbowsystems.com; UEI MD76AJXHCMQ5.",
            "evidence_class": "official",
            "notes": "Binds the NatSec100 source domain to the source-native federal recipient name and UEI.",
            "limitations": "Identity bridge only; does not establish this contract's amount, action history, ownership, control, coordination, or intent.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": f"sha256:{canonical_text_hash((ROOT / sbir_path).read_bytes())}",
                "captured": ACCESSED,
                "checked": ACCESSED,
                "note": "Hash covers the in-repository structured extract; the exact official live source URL and reviewed line range are preserved in the extract.",
            },
        },
        {
            "receipt_id": "R019",
            "source_type": "official_api_record_set",
            "title": "USAspending.gov — FA9300-25-C-6015 award detail and complete transaction population",
            "url": ENDPOINTS["award"],
            "transaction_count_url": ENDPOINTS["count"],
            "transaction_population_url": ENDPOINTS["transactions"],
            "source_last_updated_url": ENDPOINTS["updated"],
            "path": manifest_path.as_posix(),
            "accessed_date": ACCESSED,
            "quoted_or_line_reference": "X-BOW LAUNCH SYSTEMS INC; UEI MD76AJXHCMQ5; $199,303,198 base-and-all-options value; $129,494,248 total obligation; one complete retained transaction, modification 0, dated 2025-09-25, obligating $129,494,248.",
            "evidence_class": "official",
            "notes": "Manifest checksum-binds the exact award-detail, transaction-count, last-updated, complete paged transaction responses, and request metadata.",
            "limitations": "The source-native record does not explain its differences from the award announcement; arithmetic alone cannot assign a cause.",
            "archive": {
                "method": "in_repo_content_hash",
                "ref": f"sha256:{canonical_text_hash(manifest_data)}",
                "captured": ACCESSED,
                "checked": ACCESSED,
                "note": "Hash covers the in-repository source manifest, which checksum-binds every retained USAspending response and request receipt.",
            },
        },
    ]
    appended = "".join(json.dumps(row, separators=(",", ":"), ensure_ascii=False) + "\n" for row in new_receipts)
    receipts_file.write_text(receipts_text.rstrip("\n") + "\n" + appended, encoding="utf-8")

    marker = "CE0364-XBOW-SOURCE-CONFLICT-V2"
    test_path = ROOT / TEST
    test_text = test_path.read_text(encoding="utf-8")
    invariant(marker not in test_text, "CE0364 test block already present")
    test_block = f'''\n\n// {marker}\nconst ce0364Events = fs.readFileSync(\n  'data/intake/natsec100-pathways/chunk1/conversion_events.jsonl',\n  'utf8',\n).trim().split('\\n').map((line) => JSON.parse(line));\nconst ce0364Receipts = fs.readFileSync(\n  'data/intake/natsec100-pathways/chunk1/receipts.jsonl',\n  'utf8',\n).trim().split('\\n').map((line) => JSON.parse(line));\nconst ce0364Adjudication = JSON.parse(\n  fs.readFileSync('data/research/natsec100-x-bow-award-adjudication.json', 'utf8'),\n);\n\ntest('CE0364 preserves source-specific award fields and refuses a fabricated modification', () => {{\n  const event = ce0364Events.find((row) => row.event_id === 'CE0364');\n  assert.ok(event);\n  assert.equal(event.company_id, 'x_bow_systems');\n  assert.equal(event.confidence, 'medium');\n  assert.deepEqual(event.receipt_ids, ['R010', 'R017', 'R018', 'R019']);\n  assert.ok(!event.notes.includes('FY25 Air Force obligation: $129M'));\n\n  assert.equal(ce0364Adjudication.contract.piid, 'FA9300-25-C-6015');\n  assert.equal(ce0364Adjudication.identity_bridge.federal_recipient_uei, 'MD76AJXHCMQ5');\n  assert.equal(ce0364Adjudication.announcement_record.announced_contract_value, 191303197);\n  assert.equal(ce0364Adjudication.announcement_record.obligated_at_award, 121494248);\n  assert.equal(ce0364Adjudication.usa_spending_record.base_and_all_options, 199303198);\n  assert.equal(ce0364Adjudication.usa_spending_record.total_obligation, 129494248);\n  assert.equal(ce0364Adjudication.reconciliation.potential_value_delta, 8000001);\n  assert.equal(ce0364Adjudication.reconciliation.obligation_delta, 8000000);\n  assert.equal(ce0364Adjudication.reconciliation.deltas_are_equal, false);\n  assert.equal(ce0364Adjudication.reconciliation.cause, 'unresolved');\n  assert.equal(ce0364Adjudication.transaction_population.count, 1);\n  assert.equal(ce0364Adjudication.transaction_population.actions[0].modification_number, '0');\n  assert.equal(ce0364Adjudication.transaction_population.actions[0].action_date, '2025-09-25');\n  assert.equal(ce0364Adjudication.transaction_population.actions[0].federal_action_obligation, 129494248);\n  assert.equal(ce0364Adjudication.transaction_population.later_action_observed, false);\n  assert.equal(ce0364Adjudication.transaction_population.later_modification_observed, false);\n  assert.equal(ce0364Adjudication.disposition.canonical_amount_collapse_permitted, false);\n  assert.equal(ce0364Adjudication.disposition.graph_effect, 'none');\n\n  for (const receiptId of ['R017', 'R018', 'R019']) {{\n    const receipt = ce0364Receipts.find((row) => row.receipt_id === receiptId);\n    assert.ok(receipt, `missing receipt ${{receiptId}}`);\n    assert.equal(receipt.archive.method, 'in_repo_content_hash');\n    assert.match(receipt.archive.ref, /^sha256:[0-9a-f]{{64}}$/);\n    assert.ok(receipt.path.startsWith('receipts/natsec100/ce0364-xbow-20260908/'));\n  }}\n}});\n'''
    test_path.write_text(test_text.rstrip() + test_block, encoding="utf-8")

    intended_paths = [
        EVENTS.as_posix(),
        RECEIPTS.as_posix(),
        ADJUDICATION.as_posix(),
        TEST.as_posix(),
        dow_path.as_posix(),
        sbir_path.as_posix(),
        manifest_path.as_posix(),
    ] + [(CUSTODY / name).as_posix() for name, _, _ in raw_files] + [
        (CUSTODY / f"{name}.request.json").as_posix() for name, _, _ in raw_files
    ]
    record = {
        "schema_version": "ce0364-product-materialization@1",
        "base_commit": EXPECTED_MAIN,
        "issue_number": 2625,
        "product_branch": os.environ.get("PRODUCT_BRANCH"),
        "intended_paths": sorted(intended_paths),
        "source_last_updated": updated["last_updated"],
        "source_response_hashes": {name: sha256(raw) for name, raw, _ in raw_files},
        "transaction_count": len(actions),
        "transaction_obligation_sum": obligation_sum,
        "potential_value_delta": potential_delta,
        "obligation_delta": obligation_delta,
        "cause": "unresolved",
        "graph_effect": "none",
    }
    write_bytes(CUSTODY / "materialization-record.json", stable_json(record))

    print(json.dumps({
        "status": "candidate_materialized",
        "source_last_updated": updated["last_updated"],
        "transaction_count": len(actions),
        "transaction_obligation_sum": obligation_sum,
        "potential_value_delta": potential_delta,
        "obligation_delta": obligation_delta,
        "cause": "unresolved",
        "intended_path_count": len(intended_paths) + 1,
    }, indent=2))


if __name__ == "__main__":
    main()
