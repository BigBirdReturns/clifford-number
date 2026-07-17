#!/usr/bin/env python3
"""SEC EDGAR full-text-search adapter (structured, cheap-tier).

Why this exists: EDGAR full-text search is a structured JSON API, but it returns
403 to clients that omit a descriptive User-Agent (per SEC's automated-access
policy). WebFetch omits one, so the surface *looked* photonic. It is not — a
single UA header reclassifies it back to structured/direct, which means a cheap
retrieval-tier subagent (Haiku) can drive it via Bash. This closes the
"photonic not delegable to Haiku" tiering gap for EDGAR specifically.

Usage:
  python tools/adapters/sec-edgar-fts.py --q "qualified opportunity fund" \
      --forms D --start 2018-01-01 --end 2018-12-31 [--limit 20] [--json]

Set SEC_UA to override the User-Agent (SEC asks for a descriptive string with a
contact). Default is a project string with no personal data.
"""
import argparse, json, os, sys, urllib.parse, urllib.request

EFTS = "https://efts.sec.gov/LATEST/search-index"
DEFAULT_UA = "clifford-number-research/1.0 (public-interest research adapter; contact via project repo)"


def search(q, forms=None, start=None, end=None, limit=20):
    params = {"q": f'"{q}"'}
    if forms:
        params["forms"] = forms
    if start:
        params["startdt"] = start
    if end:
        params["enddt"] = end
    url = EFTS + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": os.environ.get("SEC_UA", DEFAULT_UA),
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    hits = data.get("hits", {})
    total = hits.get("total", {}).get("value", 0)
    rows = []
    for h in hits.get("hits", [])[:limit]:
        s = h.get("_source", {})
        rows.append({
            "entity": (s.get("display_names") or [""])[0],
            "cik": (s.get("ciks") or [""])[0],
            "form": s.get("form", ""),
            "file_date": s.get("file_date", ""),
            "state": (s.get("biz_states") or [""])[0],
            "accession": s.get("adsh", ""),
        })
    return {"query_url": url, "total": total, "rows": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--q", required=True, help="exact phrase to match in filing text")
    ap.add_argument("--forms", default=None, help="comma-separated form types, e.g. D")
    ap.add_argument("--start", default=None, help="YYYY-MM-DD")
    ap.add_argument("--end", default=None, help="YYYY-MM-DD")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--json", action="store_true", help="emit raw JSON")
    a = ap.parse_args()
    try:
        res = search(a.q, a.forms, a.start, a.end, a.limit)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr)
        sys.exit(2)
    if a.json:
        print(json.dumps(res, indent=2))
        return
    print(f"total_hits={res['total']}  (window {a.start or '*'}..{a.end or '*'}, forms={a.forms or '*'})")
    for r in res["rows"]:
        print(f"  {r['file_date']}  {r['form']:<4}  {r['state']:<3}  {r['entity']}  (CIK {r['cik']})")


if __name__ == "__main__":
    main()
