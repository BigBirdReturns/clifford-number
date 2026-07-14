# Presidential lane: source acquisition run

This run turns declared source coverage into reproducible, hash-pinned evidence for the neutral
eight-president cohort's campaign/business lane. It is acquisition + custody + resolution
machinery; it makes **no** beneficial-interest finding and **no** crossing (both remain 0).

## What ran

- **FEC operating-expenditure cycle files (no-key bulk):** every completed cycle 2004–2024 for the
  37 resolved authorized committees. `tools/acquire-fec-oppexp-cohort.mjs` enumerates each cycle by
  confirming the documented FEC bulk pattern against the live server (HEAD, recording the resolved
  URL + bytes), downloads, hashes the zip and extracted file, stream-scans with a committee-**ID**
  filter (never name search), runs the corrected amendment audit, normalizes retained rows
  (privacy-projected), and checkpoints per cycle / per 10k rows.
- **OGE public disclosures:** `raw/oge` acquired 26 hashed disclosure PDFs (Trump, Biden — the two
  members inside OGE's current online window). The other six presidents are outside the online
  retention window and are routed to NARA as `archive_locator_required`, never "no record." Three
  Trump candidate reports are `blocked_requires_request` (OGE "201 Request" form; no request sent).
- **NARA catalog enumeration:** 94 catalog queries via the key-less catalog endpoint; one digitized
  item downloaded + hashed (G.H.W. Bush personal financial disclosure 1966–1970), plus archive
  locators for the older library-era presidents (Reagan, Clinton, Obama-era 278e) that fall outside
  OGE's online window. A NAID is a locator, not an ingested disclosure; `keyword_result_count` is a
  loose keyword denominator, not a disclosure count. On-topic nulls (e.g. Carter) are preserved with
  a drafted-but-unsent records request.

## Durable, reproducible artifacts (in the repo)

- `data/research/fec-bulk-oppexp-cohort-manifest.json` — per-cycle resolved URLs, zip/extracted
  bytes + SHA-256, source rows scanned, matched rows, amendment audit, per-person/per-committee
  counts. 11 cycles, 588,535 matched reported rows. 2004 is re-derived identically (954,706 /
  27,862) and cross-checked against the frozen 2004 manifest.
- `data/research/oge-disclosure-locators.json` — OGE custody index (URLs + hashes + coverage
  states only; no holdings, no private fields).
- `tools/lib/entity-resolution.mjs` — resolution + temporal-join + crossing-gate primitives.
- `tools/lib/acquisition-state.mjs` — resume / enumeration / zero-result classification.

Raw and normalized caches live under `build/source-acquisition/<run-id>/` (git-ignored, fully
reproducible from the recorded URL + SHA-256 + parser version + committee-ID filter).

## Invariants held

- **The 2004 reference baseline does not regress:** 954,706 scanned / 27,862 matched / distinct
  keys 27,862 / zero cross-file keys, guarded by `validate:disclosures` and re-checked here.
- **Corrected amendment semantics in every cycle:** matched rows equal distinct transaction/report
  keys; none span multiple file numbers. `AMNDT_IND` is a containing-report filing status, not a
  duplicate-row flag. Reported itemizations are **not** unique payments. No "duplicate-row" or
  "~16× overcount" reinterpretation is permitted.
- **Cross-era raw counts are not comparable as conduct:** operating-expenditure files begin in
  2004, so pre-2004 members are outside the source window, not clean.
- Every record: `graph_effect: none`, `verification_status: machine_proposed_unverified`,
  `causal_status: not_established`.

## Entity resolution + crossings

`tools/lib/entity-resolution.mjs` never merges on name alone: identity resolves only with a unique
official identifier or ≥2 independent strong anchors; shared registered-agent / coworking /
mass-registration addresses and generic vendor names are weak signals. Parent/subsidiary,
property/owner, brand/licensee, trust/beneficiary, operator/owner are typed relationships, not
aliases. A crossing candidate requires a receipted itemization, a resolved committee and payee, a
separately receipted interest with an explicit holder scope, and compatible temporal intervals
(`overlapping` / `possibly_overlapping` / `non_overlapping` / `temporally_unknown`; unknown never
becomes permanent overlap). It emits a bounded candidate with `graph_effect: none` and an explicit
"does not establish intent/legality/control/coordination/enrichment/wrongdoing." Crossings today: 0
(beneficial interests are not yet parsed from the acquired disclosure PDFs).
