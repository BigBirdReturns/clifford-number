# Run report — `oz-run-2026-07-17-03` (closing the tiering gap)

**Track:** opportunity-zones-value-capture · **Date:** 2026-07-17 · **Builds on:** `oz-run-2026-07-17-02` · **Status:** gap closed; finding refined and strengthened; `candidate_only`

Run-02 flagged the one open problem: the SEC surface looked photonic (WebFetch 403) and had to be driven by the top rung, so it didn't inherit cheap-tier economics. This run closes it.

## The correction

EDGAR full-text search is **not photonic** — it's a structured JSON API that returns 403 to any client omitting a descriptive User-Agent (SEC's automated-access policy). WebFetch omits one; that's the entire reason it 403'd. A ~70-line UA-compliant fetcher (`tools/adapters/sec-edgar-fts.py`) restores direct structured access. The harness's original `structured/direct` classification of `sec-qof-regd` was right; run-02's "photonic" was a WebFetch artifact.

## The gap, closed

A **Haiku subagent drove the adapter** via Bash — 3 adapter calls, 0 errors, **~$0.07**. The "photonic not delegable to Haiku" problem is gone for EDGAR: this surface is back on the cheap tier where the harness always put it.

## The finding, strengthened

Haiku ran a broader query than run-02:
- `"qualified opportunity fund"` Form-D, 2018: **0**
- `"qualified opportunity fund"` Form-D, 2019: **16** (earliest 2019-01-04)
- `"opportunity zone"` Form-D, 2018: **22**, earliest **2018-06-21**

Even the broader phrase's earliest 2018 fund filing (**2018-06-21**) lands *one week after* the June 14, 2018 final designation. The fund-vehicle layer still entirely postdates designation — the run-02 null now rests on 22 filings instead of 10, and it was retrieved by the cheap tier.

## The generalizable lesson (for the tiering policy)

**Some surfaces that 403 a headless fetcher are "structured-behind-a-User-Agent," not truly photonic.** Try a UA-compliant fetcher *before* reaching for ScreenGhost. Truly photonic surfaces — JS-rendered portals, county recorders with viewers — still need the browser path. This narrows how often the expensive photonic route is actually required, which is a direct win for the cheap-tier share of retrieval.

## Files

- `phase6-haiku-sec-adapter.json` — adapter build, Haiku delegation telemetry, refined finding
- `tools/adapters/sec-edgar-fts.py` — the structured adapter (committed with this run)
- harness `sec-qof-regd` updated to reuse the adapter; tier confirmed `haiku`

## Net

Both halves now work on the cheap tier: run-01 proved structured retrieval on Haiku; this run reclaims a "photonic" surface back to Haiku with a small adapter. The only genuinely photonic surfaces left are the JS-rendered ones, and those remain the honest boundary of the cheap-tier economics.
