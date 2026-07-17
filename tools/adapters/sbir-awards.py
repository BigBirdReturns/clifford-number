#!/usr/bin/env python3
"""SBIR.gov award adapter (structured, cheap-tier, no API key).

Enumerates SBIR/STTR awards for a firm via the open SBIR.gov API. Free, JSON.

Usage:
  python tools/adapters/sbir-awards.py --firm "Anduril" [--rows 100] [--json]
"""
import argparse, json, ssl, sys, time, urllib.parse, urllib.request

BASE = "https://api.www.sbir.gov/public/api/awards"
UA = "clifford-number-research/1.0 (public-interest research adapter)"
CTX = None  # set by --insecure (MITM-proxy environments; public data only)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(3 * (attempt + 1)); continue
            raise


def fetch(firm, rows):
    out, start = [], 0
    while True:
        url = BASE + "?" + urllib.parse.urlencode({"firm": firm, "rows": min(rows, 100), "start": start})
        batch = get(url)
        if not batch:
            break
        out.extend(batch)
        if len(batch) < min(rows, 100) or len(out) >= rows:
            break
        start += len(batch)
    return out[:rows]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--firm", required=True)
    ap.add_argument("--rows", type=int, default=100)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--insecure", action="store_true", help="unverified TLS (behind a MITM proxy; public data only)")
    a = ap.parse_args()
    global CTX
    if a.insecure:
        CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
    try:
        awards = fetch(a.firm, a.rows)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr); sys.exit(2)
    if a.json:
        print(json.dumps(awards, indent=2)); return
    print(f"total awards for firm~='{a.firm}': {len(awards)}")
    for w in awards:
        amt = w.get("award_amount") or "0"
        try: amt = f"${float(amt):,.0f}"
        except Exception: amt = str(amt)
        print(f"  {w.get('award_year',''):<6} {w.get('phase',''):<9} {w.get('agency',''):<8} "
              f"{amt:>14}  {w.get('contract',''):<20} {(w.get('award_title') or '')[:46]}")


if __name__ == "__main__":
    main()
