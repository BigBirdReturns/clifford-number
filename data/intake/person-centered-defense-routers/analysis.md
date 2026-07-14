# Person-centered defense-technology routers — analysis (@3, completion-vocabulary correction)

**This map is PARTIAL, and now says so structurally.** The @2 pass converted partial coverage into
"closed" via permissive labels; this correction introduces a canonical completion contract
(`data/canonical/person-router-completion-contract.json`) with a real terminal/non-terminal state
vocabulary, per-source coverage ledgers, USAspending-specific award receipts, and an identity gate.

## What remains PARTIAL (lead)
- **Frontier: 11 terminal / 6 partial** — NOT "17 closed." The 6 fund-portfolio frontiers (Silent,
  8VC, Founders Fund, a16z AD, Pallas ×2) are `partially_searched` (defense-relevant subset only).
- **Roster coverage** (`roster-coverage.jsonl`): 2 `surface_complete` (LinkedIn projection; Silent =
  founder-only), 12 `partially_searched` (fund decision-maker subsets; ~250 gross vs enumerated),
  1 `unavailable_after_search` (In-Q-Tel team page — /team + /leadership both 404).
- **Portfolio coverage** (`portfolio-coverage.jsonl`): 1 `surface_complete` (Capital Factory 837-company
  hash-pinned index), 12 `partially_searched` (defense-relevant subsets), 1 `unavailable_after_search`
  (Texas Venture Partners — no reachable portfolio page).
- **Government-award identity**: 16 `resolved`, **1 held** (Cambium — matched by business description
  only; NOT counted resolved), 1 `unavailable_after_search` (Morpheus Space).
- **Counterpart provenance**: 8 of 11 rows are `provenance_quality: query_only_no_counterpart_page_captured`
  (documented query/inspected_urls/timestamp, but no captured counterpart page). Only 8VC and Founders
  Fund were domain-scoped-inspected; Weekend Fund/Afore are third-party-DB.

## Denominator — the "investment-decision-maker universe" (bounded, defined)
**100 candidates** (`router-source-universe.jsonl`), per the contract's denominator_rule: the full
LinkedIn projection (30, surface_complete) + fund **decision-makers** (partners/founders/GPs/MDs/
principals/advisors) + seed overlay. Ops/finance/legal/IR/EA staff are **excluded by contract rule**.
This is NOT the ~250 gross roster; each roster source records gross_observed vs enumerated.

## Admitted routers (17; unchanged research, ≥3/8 signatures)
Jackson Moses (6); Heidi Shyu, Trae Stephens, Katherine Boyle, Joshua Baer (5); Will Roper, Raj Shah,
Michael A. Brown, Lauren Knausenberger (4); Christopher Kirchhoff, Kevin Weil, Laura Gilbert, Doug
Beck, Joe Lonsdale, Sally Donnelly, Tony DeMartino, Tal Shmueli (3). **9 were not in the seed** —
surfaced by the computed test from projection role-claims. Score = discovery-routing, never suspicion.

## Jackson counterpart searches (provenance upgraded)
All in `sources/counterpart-searches.jsonl` with query + `inspected_urls` + timestamp + `result_status`
+ `provenance_quality`. Every sourcing/advisory claim traces only to Jackson's own surfaces →
`no_counterpart_confirmation_observed`; Weekend Fund + Afore Capital → `third_party_reported_not_counterpart_confirmed`.

## Fund portfolio overlaps (unchanged; now coverage-stated)
Fund×NatSec100: Silent 11, Washington Harbour/Valor/Pallas/8VC 5, Founders Fund/a16z 4, Lux 3, DCVC 2.
Cross-fund co-investment (co-listing, not coordination): Anduril in 8 funds, Hadrian/Impulse in 5.
Jackson's 61-company portfolio → 14 NatSec100 / 5 Capital Factory / 1 Pallas.

## Government awards (Lane D) — receipts + identity fields fixed
Every award now cites its own **`r-usaspending-<award_id>`** receipt (locator = the usaspending.gov
award page); **none cites the portfolio receipt**. Each row carries `queried_name`,
`recipient_legal_name`, `uei`, `identity_confidence`, `identity_basis`, `identity_state`. Ceilings ≠
obligations ≠ outlays (Firefly $113.5M/$112.8M/$76.6M; Axiom $449M/$392M/$269M). Raft $349M USSOCOM
IDIQ is a press-reported **ceiling**, kept separate from its $60.8M USAspending Cloud CITI award.

## Honest terminal accounting
Complete (surface_complete): 2 roster + 1 portfolio sources. Partial: 12 roster + 12 portfolio + 6
frontiers. Unavailable_after_search: In-Q-Tel roster, TVP portfolio, Morpheus award. Identity-held:
Cambium. Not_searched: 0 (every required source has a disposition). Nothing here is called "closed."

Reproduce: `npm run build:routers && npm run validate:routers && node test/person-routers.test.js`.
