# Austin–Israel defense corridor — what joined, what did not, what changed

**Recovery increment (2026-07-14, corridor@2).** This pass executes the lanes the prior pass left
open (Lane B, Stratos portfolio, Pallas), runs new overlaps, relabels the CF↔Stratos test, and
folds in three requested deep dives. Every edge still carries a dual state and `graph_effect: none`.

## What joined
- **Capital Factory ↔ NatSec100.** 837 CF public-portfolio companies × 196 NatSec100 →
  **12 co-listings** (Firefly, Firehawk, ICON, Orbit Fab, Phantom Space, RED 6, Saronic, Slingshot,
  SpaceX, Venus, Voyager, X-Bow). **4 are now `independently_corroborated`** beyond bare co-listing —
  **ICON, Saronic, Firefly, Venus** — with **ICON's generic-word homonym disambiguated** to the
  Austin construction-3D-printing company (DoD contracts). Portfolio-index listing is explicitly
  **not** equity investment (`portfolio_listing_is_not_equity_investment: true`).
- **Lane B (Austin–Israel) — EXECUTED.** Two `source_explicit` Austin members:
  **Traysar** (subterranean defense; founders self/press-identified as Israeli-military/origin —
  never name-inferred; **Silent Ventures-led** $25M seed) and **Texas Venture Partners** (Austin
  $50M fund with an explicit Israeli-defense-tech mandate; lead Tal Shmueli, ex-IDF). Traysar's
  Silent Ventures edge ties Lane B into the existing corridor.
- **Pallas — integrated as three separate arms.** Pallas Advisors (advisory, 2018, Donnelly +
  DeMartino, ex-OSD/CENTCOM), Pallas Ventures (2020), and Pallas Foundation (nav-named). **Pallas
  Ventures × NatSec100 → 5 co-listings** (Morpheus Space, Rebellion Defense, Interos, Second Front
  Systems, Hermeus).
- **Silent Ventures × NatSec100 → 2** (Firestorm, Hadrian; **Armada held as `name_match_only`** —
  generic token, identity unconfirmed).
- **Deep dives — CHAOS Industries, Raft, Overland AI.** All **3 are NatSec100 members**
  (`source_explicit`); none are in the CF universe. Shared-investor topology: **8VC and Valor Equity
  co-invest in CHAOS and Overland** — recorded as co-investment, with the explicit forbidden
  inference that shared investor ≠ coordination.
- **Stratos portfolio — partly resolved.** 3 companies now **press-named** (Particle, Tenna,
  Skapion) via CTech, upgrading part of the logos-only gap from `source_unavailable` to `reported`.

## What did NOT join
- **Capital Factory ↔ Stratos — relabeled.** No longer a proven "rejected"; now
  **`no_source_explicit_join_observed_on_searched_surfaces`**: on the surfaces searched
  (stratos-vc.com, CTech/jpost/refreshmiami, capitalfactory.com), no source-explicit edge appears —
  Stratos is Tel Aviv + Miami and never mentions Austin/CF. Absence on searched surfaces is **not**
  a proof of no relationship.
- **Stratos ↔ NatSec100** — the 3 press-named companies match no NatSec100 core; remainder logos-only.
- **Pallas ↔ Capital Factory** — no Pallas Ventures company in the CF 837-universe on searched surfaces.
- **Stratos government partnerships** (Israeli MOD / U.S. DoD / NATO DIANA) — `self_claimed` only.

## What changed in the map
- Receipt integrity: **17 receipts resolved** (up from 4), **4 now carry a `content_sha256`**
  (Stratos, Pallas ×2, Traysar) — closing the prior hashing gap the critique flagged. The seed
  denominator is stated explicitly as **22 distinct `r-*` ids** across all seed files + both fields;
  **21 demoted** to `receipt_unresolved` (the one resolved is `r-capital-factory-portfolio-2026`).
- CF↔Stratos moved from proven-rejection to absence-on-searched-surfaces.
- Lane B moved from `not_searched` to `searched_nonexhaustive` (2 members recorded; a 5W Research
  report cites 80+ Israeli tech firms entering Texas since 2020 — full census not run).

## Motifs (by distinct institutions/people, not pair counts)
- `capital → accelerator → validation`: **12** distinct CF∩NatSec100 companies.
- `dc advisory fund → validation`: **5** Pallas Ventures companies on NatSec100.
- `austin–israel defense company`: **1** (Traysar).
- `israeli defense-tech capital routers`: **2** (Stratos [Tel Aviv/Miami], Texas Venture Partners [Austin]).
- `public service → adviser/fund`: **3** people (Barbero → Stratos; Donnelly, DeMartino → Pallas).
- `shared investor across deep dives`: co-investment topology only (8VC, Valor), never coordination.

## Direct vs inferred
Every edge is separately countable by `independent_corroboration_state`. Source-explicit: the 12 CF
co-listings, 5 Pallas×NatSec, 3 deep-dive×NatSec, 2 Lane B members, Stratos/Pallas team rosters.
Independently corroborated: 4 CF edges. Reported: Silent×NatSec (2), Stratos press-named portfolio,
shared-investor edges. Self-claimed: Stratos gov partnerships. name_match_only: Armada, 15 CF
fuzzy near-matches. No-edge-observed: CF↔Stratos, Stratos↔NatSec100, CF↔Pallas. Unavailable/
not-searched: Stratos portfolio remainder, Pallas Foundation detail, Stratos-gov corroboration.
Nothing self-claimed, name-matched, no-edge-observed, or unresolved is counted as established.
