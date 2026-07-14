# Austin–Israel defense corridor — what joined, what did not, what changed

## What joined
- **Capital Factory ↔ NatSec100 (the overlap that was never run, now run).** 837 companies listed
  on Capital Factory's own public portfolio page × 196 NatSec100 companies →
  **12 exact-normalized-core co-listings**, `source_explicit` (both are independent curated public
  lists naming the same company): **Firefly Aerospace, Firehawk Aerospace, ICON, Orbit Fab, Phantom
  Space, RED 6, Saronic, Slingshot Aerospace, SpaceX, Venus Aerospace, Voyager Space, X-Bow
  Systems.** Co-listing is *not* legal-identity resolution or an ownership/relationship finding.
- **Stratos Ventures as a multi-node system**, from its own site + press: 3 general partners
  (Kakon, Grinfeld, Fouzailov) and 6 named partners — including **LTG (Ret.) Michael Barbero,
  President of SAAB USA** — offices in **Tel Aviv (HQ) and Miami**, and a strategic partnership with
  **The LAB Miami**. All `source_explicit` (Stratos's self-representation).

## What did NOT join
- **Capital Factory ↔ Stratos: REJECTED — no source-explicit edge.** Stratos is Tel Aviv + Miami,
  routes US access through The LAB Miami, and never mentions Austin or Capital Factory. The premise
  that these two corridors connect is **not supported**; the edge was tested and rejected, not
  manufactured.
- **Stratos ↔ NatSec100: not joinable.** Stratos's portfolio is logos-only; it cannot be tested
  against NatSec100 without visual review (`source_unavailable`).
- **Austin–Israel cohort (Lane B): not searched.** No members are asserted. The only Israel-explicit
  node found (Stratos) is Miami/Tel Aviv, not Austin. No Israel linkage was inferred from any name.
- **Stratos government partnerships (Israeli MOD / U.S. DoD / NATO DIANA): self-claimed only.**
  Stated on Stratos's own site; no counterpart (MOD/DoD/DIANA) corroboration was searched or found.
- **Pallas:** named in scope, no source acquired (`not_searched`).

## What changed in the map
- The Capital Factory overlap moved from README's *"not yet run, by design"* to a real result with
  an honest denominator (837 × 196 → 12).
- Receipt integrity repaired: **4 receipts resolved** (Capital Factory portfolio page hash-pinned;
  Stratos site + 2 press), **21 seed `r-*` references demoted** to `receipt_unresolved`.
- Stratos entered the map for the first time — as a **separate Miami/Tel-Aviv router**, explicitly
  *not* wired to Austin.
- 15 fuzzy CF↔NatSec100 name-only near-matches were rejected with their reason, not admitted.

## Motifs (by distinct institutions/people, not pair counts)
- `capital → accelerator → validation`: **12 distinct companies** on both CF portfolio and NatSec100.
- `israeli fund → US market access`: **1 institution** (Stratos, self-claimed via The LAB Miami).
- `public service → adviser/fund`: **1 person** (LTG (Ret.) Barbero, SAAB USA → Stratos partner).

## Direct vs inferred
Every edge is separately countable by `independent_corroboration_state`. Direct/source-explicit:
the 12 co-listings, Stratos team roster, CF portfolio memberships. Self-claimed: Stratos gov
partnerships. Rejected: CF↔Stratos, 15 name-only. Unavailable/not-searched: Stratos portfolio,
Austin-Israel cohort, Pallas. Nothing self-claimed or rejected is counted as established.
