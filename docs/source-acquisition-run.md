# Presidential lane: source acquisition run

This run turns declared source coverage into reproducible, hash-pinned evidence for the neutral
eight-president cohort's campaign/business lane. It now includes acquisition, custody,
machine-extracted disclosure intake, and unresolved payee inventory. It makes **no resolved
beneficial-ownership finding and no crossing**; every derived record remains non-graphing.

## What ran

- **FEC operating-expenditure cycle files (no-key bulk):** every completed cycle 2004–2024 for the
  37 resolved authorized committees. `tools/acquire-fec-oppexp-cohort.mjs` enumerates each cycle by
  confirming the documented FEC bulk pattern against the live server (HEAD, recording the resolved
  URL + bytes), downloads, hashes the zip and extracted file, stream-scans with a committee-**ID**
  filter (never name search), runs the corrected amendment audit, normalizes retained rows
  (privacy-projected), and checkpoints per cycle / per 10k rows.
- **OGE public disclosures:** the reproducible OGE intake acquired 26 hashed disclosure PDFs (Trump, Biden — the two
  members inside OGE's current online window). The other six presidents are outside the online
  retention window and are routed to NARA as `archive_locator_required`, never "no record." Three
  Trump candidate reports are `blocked_requires_request` (OGE "201 Request" form; no request sent).
  The 26 PDFs were independently re-downloaded and hash-checked, then parsed into 5,945
  source-addressable intake rows; 551 parse/privacy rejections remain explicit. Of 1,716
  transaction rows, 400 dates and 1,107 transaction-type strings remain OCR-ambiguous; their raw
  text stays preserved, but ambiguous dates receive no temporal interval.
- **NARA catalog enumeration:** the durable artifact contains 57 catalog search hits and one
  separately counted blocked request. These are unresolved search hits, not verified disclosure
  locators. A prior ignored run reported 94 queries and one hashed item, but emitted neither the
  complete query ledger nor the artifact receipt; those figures are preserved only as
  `not_durably_reproducible` historical claims and no longer count as custody.

## Durable, reproducible artifacts (in the repo)

- `data/research/fec-bulk-oppexp-cohort-manifest.json` — per-cycle resolved URLs, zip/extracted
  bytes + SHA-256, source rows scanned, matched rows, amendment audit, per-person/per-committee
  counts. 11 cycles, 588,535 matched reported rows. 2004 is re-derived identically (954,706 /
  27,862) and cross-checked against the frozen 2004 manifest.
- `data/research/oge-disclosure-locators.json` — OGE custody index (URLs + hashes + coverage
  states only; no holdings, no private fields).
- `data/research/oge-beneficial-interest-manifest.json` — 26 source documents, 1,662 pages,
  5,945 machine-extracted intake rows, 551 explicit normalization rejections, and hash-pinned
  ignored outputs. Reported text is self-claimed and unresolved.
- `data/research/fec-payee-inventory-manifest.json` — all 588,535 normalized FEC rows projected
  into 46,926 unresolved name-based payee candidates, with input/output hashes and the missing
  address discriminator recorded for every row.
- `data/research/oge-fec-overlap-manifest.json` — a bounded lexical candidate pass over 5,945 OGE
  rows and 46,926 FEC payee candidates. It emits 1,172 unresolved candidate pairs across 221
  interests while preserving 5,721 no-candidate outcomes and all source/output hashes.
- `data/research/oge-fec-temporal-screen-manifest.json` — baseline disposition ledger for all 1,172
  lexical pairs: 0 definitely overlapping, 132 definitely non-overlapping, and 1,040 temporally
  unknown. The source-page visual correction layer then moves 45 OCR-damaged pairs to non-overlap,
  producing the current 0 / 177 / 995 frontier. Zero pairs are eligible for legal-entity review.
- `data/research/nara-disclosure-locators.json` — conservative unresolved catalog search hits;
  zero durable hash-bearing NARA artifacts.
- `tools/lib/entity-resolution.mjs` — resolution + temporal-join + crossing-gate primitives.
- `tools/lib/acquisition-state.mjs` — resume / enumeration / zero-result classification.

Raw and normalized FEC/OGE caches live under `build/` and remain git-ignored. The checked-in FEC
and OGE acquisition programs reproduce them from the recorded URLs, hashes, parser versions, and
committee-ID filter. The current NARA artifact is intentionally not described as end-to-end
reproducible because the former ignored query ledger and claimed hash-bearing artifact were lost.

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

`tools/lib/entity-resolution.mjs` never merges on name alone: identity resolves only with a valid,
receipted official identifier or at least two independent strong provenance chains; shared registered-agent / coworking /
mass-registration addresses and generic vendor names are weak signals. Parent/subsidiary,
property/owner, brand/licensee, trust/beneficiary, operator/owner are typed relationships, not
aliases. A crossing candidate requires a receipted itemization, a resolved committee and payee, a
separately receipted interest with an explicit holder scope, a required typed predicate, manifest
membership for both source hashes, and definite temporal overlap. Possible or unknown overlap
remains held. It emits a bounded candidate with `graph_effect: none` and an explicit
"does not establish intent/legality/control/coordination/enrichment/wrongdoing." Crossings today: 0.
The temporal screen and visual audit account for every lexical candidate: 0 overlap, 177
non-overlap, and 995 structurally undated unknown pairs. None enters identity review; unknown timing
is preserved as uncertainty rather than silently promoted to a match or demoted to absence.

## Predicate #1 frozen; predicate #2 (government→property) started symmetrically

**Campaign→business (predicate 1) is frozen as an honest source-limited v1** in
`data/research/campaign-to-business-v1-result.json`: every record was assembled (588,535 FEC
itemizations, 46,926 payee candidates, the 2016 disclosure listing three Trump LLCs as filer
interests contemporaneous with FEC windows), yet 0 resolved identities and 0 crossings — because the
**current OGE 278 evidence** carries no per-entity holding interval, aggregate FEC bounds cannot
establish event overlap, and name equality is not identity. This is a limit of the current evidence,
**not** a claim that no relationship exists; other contemporaneous records could reopen it.

**Government→property (predicate 2) now runs symmetrically across all eight presidents** via the
no-key USAspending award API (`tools/acquire-gov-property-awards.mjs`,
`data/research/government-to-property-manifest.json`). Identical query logic per member; members
without registry-resolved disclosed businesses are recorded as a coverage gap, not a null finding.
Result: 6 NY-registry-resolved Trump entities → 0 contract awards; the operating-property names
(Mar-a-Lago, Trump National Golf Club, Old Post Office, Trump International Hotel) → 0; and the
entire "TRUMP" federal-contract recipient universe is unrelated firms (TRUMPF, TRUMPLER) — a live
demonstration that name search alone is a trap. 0 resolved identities, 0 crossings.

This is a **scope limit of contract-award itemization, not a universal claim**: documented
federal-property spending (protective-detail lodging, event costs) is largely purchase-card /
below-threshold / non-contract and would require GSA lease records, inspector-general reports,
purchase-card releases, or House Oversight compilations to establish bounded relationships. Those
remain open source routes. `pending_second_party` labels clearance/publication only; it did not
block this discovery or intake.

## Portfolio calibration: synthetic discrimination and real source positives

The crossing core is now structurally shared: the FEC/OGE wrapper delegates to
`tools/lib/generic-crossing.mjs` while retaining its itemization, interest, holder-scope, predicate,
manifest, and temporal preconditions. Receipt roles are explicit, so a corpus cannot satisfy a
multi-source predicate with one convenient receipt. Calendar-invalid and reversed intervals remain
unknown rather than being normalized into a pass.

Three controls now distinguish different claims about the instrument:

- **FA-03** remains a synthetic evidence-discrimination control: blind 5/5 held; counterfactual
  receipted 2/5 passed. It proves the gate responds to evidence but is not a real-world positive.
- **ICIJ Panama Papers bulk data** is the first real public-dataset reported-relation positive. The
  hash-pinned 73,043,531-byte archive yielded 559,600 Panama nodes and 674,102 typed relationships.
  The deterministic first dated `officer_of` row passed with source-native node IDs, three required
  receipt roles, and temporal overlap. The pass establishes what ICIJ's dataset reports; it does not
  independently verify the leaked record or imply illegality.
- **NatSec100/USAspending** upgraded the five frozen FY2025 award leads to 31 official award rows
  across all five companies. A source-native Department of Defense→UEI award edge passed. None of
  the five summarized trade-press amount/program pairs was exactly verified by these award rows,
  and NatSec100-name→UEI identity remains held because no shared identifier has been acquired.

`data/research/portfolio-provenance.json` states the enterprise frame directly: this is a
deliberately curated public-interest portfolio using a reusable method, not a random sample or a
claim of neutral arrival. FEC ran first because it was the first tractable no-key bulk source.
Pending human review blocks promotion of concrete claims; it does not block discovery or intake,
and pending status may not be narrated as completed rigor.
