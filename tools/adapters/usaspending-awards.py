#!/usr/bin/env python3
"""USAspending.gov award adapter (structured, cheap-tier, no API key).

Enumerates federal awards for a recipient via the open USAspending v2 API. Free,
JSON, no auth — a UA header is polite but not required. Contracts and IDVs are
separate award-type families; this queries both.

Usage:
  python tools/adapters/usaspending-awards.py --recipient "Anduril" [--limit 100] [--json]
"""
import argparse, json, ssl, sys, time, urllib.request

BASE = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
UA = "clifford-number-research/1.0 (public-interest research adapter)"
CONTRACT = ["A", "B", "C", "D"]
IDV = ["IDV_A", "IDV_B", "IDV_C", "IDV_D", "IDV_E"]
FIELDS = ["Award ID", "Recipient Name", "Awarding Agency", "Awarding Sub Agency",
          "Award Amount", "Start Date", "End Date", "Award Type", "generated_internal_id"]
# --insecure uses an unverified TLS context. Needed only behind a TLS-intercepting
# egress proxy (self-signed CA not in the trust store). Safe here: public data,
# read-only, no credentials ever sent. Off by default.
CTX = None


def post(body):
    req = urllib.request.Request(BASE, data=json.dumps(body).encode(),
        headers={"User-Agent": UA, "Content-Type": "application/json", "Accept": "application/json"},
        method="POST")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90, context=CTX) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 * (attempt + 1)); continue
            raise


def query(recipient, types, limit):
    out, page = [], 1
    while True:
        body = {"filters": {"recipient_search_text": [recipient], "award_type_codes": types},
                "fields": FIELDS, "page": page, "limit": min(limit, 100),
                "sort": "Award Amount", "order": "desc"}
        d = post(body)
        out.extend(d.get("results", []))
        if not d.get("page_metadata", {}).get("hasNext") or len(out) >= limit:
            break
        page += 1
    return out[:limit]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--recipient", required=True)
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--insecure", action="store_true", help="unverified TLS (behind a MITM proxy; public data only)")
    a = ap.parse_args()
    global CTX
    if a.insecure:
        CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
    try:
        contracts = query(a.recipient, CONTRACT, a.limit)
        idvs = query(a.recipient, IDV, a.limit)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}\n{e.read().decode('utf8','replace')[:400]}", file=sys.stderr)
        sys.exit(2)
    res = {"recipient": a.recipient, "contract_count": len(contracts), "idv_count": len(idvs),
           "contracts": contracts, "idvs": idvs}
    if a.json:
        print(json.dumps(res, indent=2)); return
    for label, rows in (("IDV / VEHICLES", idvs), ("CONTRACTS / ORDERS", contracts)):
        print(f"\n=== {label} ({len(rows)}) ===")
        for r in rows:
            amt = r.get("Award Amount") or 0
            print(f"  {str(r.get('Award ID','')):<22} ${amt:>16,.0f}  {r.get('Award Type',''):<26} "
                  f"{(r.get('Awarding Sub Agency') or r.get('Awarding Agency') or '')[:34]:<34} "
                  f"{r.get('Start Date','')}..{r.get('End Date','')}")


if __name__ == "__main__":
    main()
