#!/usr/bin/env python3
"""Maryland property deed adapter (structured, cheap-tier, no API key).

The county-recorder "deed layer" is often assumed photonic (per-county JS viewers).
For Maryland it is not: SDAT real-property data — parcel address, transfer date, and
consideration — is a Socrata open-data API. This adapter queries it by street/zip so a
cheap retrieval tier can pull pre-designation acquisition dates directly. (Owner names
are redacted from the open set; tie parcels to an owner via a separate reporting/SDAT
source.) Validated 2026-07-17 against the Port Covington / Sagamore assemblage.

  python tools/adapters/md-property-deeds.py --streets DICKMAN CROMWELL --zip 21230 \
      [--min-price 1000000] [--dataset qfyw-ryt6] [--json]

--insecure: unverified TLS for MITM-proxy environments (public data, read-only).
"""
import argparse, json, ssl, sys, urllib.parse, urllib.request

BASE = "https://opendata.maryland.gov/resource/{ds}.json"
UA = "clifford-number-research/1.0 (public-interest research adapter)"
F = {"acct": "account_id_mdp_field_acctid",
     "num": "premise_address_number_mdp_field_premsnum_sdat_field_20",
     "st": "premise_address_name_mdp_field_premsnam_sdat_field_23",
     "zip": "premise_address_zip_code_mdp_field_premzip_sdat_field_26",
     "xfer": "sales_segment_1_transfer_date_yyyy_mm_dd_mdp_field_tradate_sdat_field_89",
     "price": "sales_segment_1_consideration_mdp_field_considr1_sdat_field_90"}
CTX = None


def query(dataset, streets, zip_, min_price, limit):
    sel = ",".join(f"{c} as {a}" for a, c in F.items())
    conds = []
    if streets:
        conds.append(f"{F['st']} in({','.join(chr(39)+s.upper()+chr(39) for s in streets)})")
    if zip_:
        conds.append(f"{F['zip']}='{zip_}'")
    if min_price:
        conds.append(f"{F['price']} > {int(min_price)}")
    q = {"$select": sel, "$order": f"{F['price']} DESC", "$limit": str(limit)}
    if conds:
        q["$where"] = " AND ".join(conds)
    url = BASE.format(ds=dataset) + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        return url, json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--streets", nargs="*", default=[])
    ap.add_argument("--zip", default=None)
    ap.add_argument("--min-price", type=int, default=0)
    ap.add_argument("--dataset", default="qfyw-ryt6", help="Socrata dataset id (default Baltimore City Property)")
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--insecure", action="store_true", help="unverified TLS (MITM proxy; public data only)")
    a = ap.parse_args()
    global CTX
    if a.insecure:
        CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
    try:
        url, rows = query(a.dataset, a.streets, a.zip, a.min_price, a.limit)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr); sys.exit(2)
    if a.json:
        print(json.dumps({"query_url": url, "rows": rows}, indent=2)); return
    print(f"{len(rows)} parcels (deed transfer date · consideration):")
    for x in rows:
        try: price = f"${float(x.get('price',0)):,.0f}"
        except Exception: price = str(x.get('price'))
        print(f"  {x.get('xfer',''):<12} {price:>16}  {x.get('num','')} {x.get('st','')} {x.get('zip','')}")


if __name__ == "__main__":
    main()
