# Person-centered defense-technology routers — analysis (@2, recovery increment)

This increment closes the falsely-completed search states from @1: the denominator is now
**roster-derived**, counterpart states carry **documented search provenance**, fund censuses and
government awards were **actually run**, and the trail frontier is **closed**.

## 1. Full roster denominator by source
**100 candidates** (`router-source-universe.jsonl`), derived from committed/fetched rosters — NOT the
12-name seed list:
- **LinkedIn projection** (committed, `data/intake/linkedin-targeted-review`): **30 people**, signatures
  computed from 359 role-claims; each backed by a per-capture sha256 receipt.
- **Fund team rosters** (fetched from 11 primary team pages): 8VC, Founders Fund, a16z American
  Dynamism, Valor, Lux, DCVC, Shield, Washington Harbour, Pallas, Stratos, (Texas Venture Partners
  third-party, flagged) — investment-decision-maker subset enumerated; ~250 gross recorded as
  `searched_nonexhaustive`.
- **Seed overlay**: the 12 prompt names get source-addressed deep-research signatures merged in.

## 2. Admitted routers and scores (≥3 of 8 signatures)
**17 admitted** — including **9 the seed did NOT name**, surfaced purely by the computed test:
Jackson Moses (6); **Heidi Shyu** (5), Trae Stephens (5), Katherine Boyle (5), Joshua Baer (5);
**Will Roper** (4), **Raj Shah** (4), **Michael A. Brown** (4), **Lauren Knausenberger** (4);
**Christopher Kirchhoff** (3), **Kevin Weil** (3), **Dr. Laura Gilbert** (3), **Doug Beck** (3),
Joe Lonsdale (3), Sally Donnelly (3), Tony DeMartino (3), Tal Shmueli (3). 83 below threshold
(recorded, not discarded). The score is a **discovery-routing** score, never suspicion/influence.

## 3. Jackson counterpart-search results (the @1 contradiction, fixed)
All 10 counterpart surfaces + 1 new lead were **actually searched** with provenance
(`sources/counterpart-searches.jsonl`; query, domain, timestamp, result):
- **Sourcing** (8VC, Founders Fund, a16z, Bessemer, Lightspeed, NEA): every claim traces only to
  Jackson's own surfaces (jacksonmoses.com; Crunchbase/vcsheet mirror it). 8VC and Founders Fund team
  pages were inspected and do **not** name him → **`no_counterpart_confirmation_observed`**.
- **Advisory** (Castelion, Privateer, Long Wall, Thor Dynamics): asserted only on Jackson's surfaces;
  no counterpart page found → **`no_counterpart_confirmation_observed`**. (Boyle is separately a
  Castelion board-observer — a different person, not a Jackson confirmation.)
- **New third-party lead**: a dated **Weekend Fund** venture-scout role (Jan 2022–Apr 2023) and an
  **Afore Capital** venture-partner role appear in third-party databases (Signal/NFX, Crunchbase) →
  **`third_party_reported_not_counterpart_confirmed`** (aggregators, not the fund's own page).
No row is `counterpart_not_found` without provenance; none is both `not_searched` and found — the
validator now prohibits both.

## 4. Fund portfolio denominators and NatSec100 overlaps
`sources/fund-portfolio-census.json` (11 fund portfolio pages fetched; defense-relevant subset):
Silent Ventures 23→**11** NatSec100; Washington Harbour 5→**5**; Valor 5→**5**; Pallas Ventures 5→**5**;
8VC 8→**5**; Founders Fund 6→**4**; a16z American Dynamism 6→**4**; Lux 4→**3**; DCVC 3→**2**;
Shield 2→1; In-Q-Tel 2→1. **Cross-fund co-investment** (co-listing, NOT coordination): **Anduril in
8 funds**, Hadrian and Impulse Space in 5 each, Saronic/Epirus/Firestorm/SpaceX/Palantir in 2+.
Jackson's own 61-company portfolio → 14 NatSec100 / 5 Capital Factory / 1 Pallas.

## 5. Government-award results (Lane D — ceilings ≠ obligations ≠ outlays)
`sources/government-awards.json`, live from USAspending.gov: **16 of 17 companies resolved** to a real
prime award with a confirmed **UEI** and award ID; ceiling/obligated/outlay recorded **separately**
(e.g. Firefly ceiling $113.5M / obligated $112.8M / outlay $76.6M; Axiom $449M / $391.7M / $269M).
Honest caveats preserved: **Saronic**'s only USAspending record is a **$500** order (larger work
likely OTA outside FPDS — not its footprint); **Cambium** identity is moderate-confidence; **CAGE**
codes null (API doesn't expose them — not fabricated); **Morpheus Space** `unavailable_after_search`
(documented attempts). The Raft **$349M USSOCOM IDIQ is a CEILING**, kept distinct from its separate
$60.8M-ceiling Cloud CITI award.

## 6. Closed-frontier disposition
All **17 frontier rows** are closed — **0 remain `not_searched`**. Dispositions: `surface_reached`
(fund-portfolio census processed), `identity_unresolved_after_search` (projection board/advisor roles
whose company identities weren't resolved), `source_unavailable` (TVP portfolio names).

## 7. Remaining unavailable / unresolved (labeled, not hidden)
- Jackson LinkedIn (auth-gated) and role **dates** (absent on source; Weekend Fund role dated via 3rd-party DB).
- Full long-tail fund portfolios beyond the defense subset; ~250 gross roster people vs the
  decision-maker subset enumerated (`searched_nonexhaustive`).
- Morpheus Space federal award; CAGE codes; Cambium exact identity.
- Some projection admits (e.g. "Raj S." vs Shield's "Raj Shah", "Michael A. Brown" vs Shield's
  "Michael Brown") are likely the same person but are **kept separate** rather than force-merged — an
  identity join is a claim, and this mission does not fabricate one.

Reproduce: `npm run build:routers && npm run validate:routers && node test/person-routers.test.js`.
