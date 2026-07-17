# Research track: Transit station-area TOD formation sweep

**Axis:** `place-formation`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `arcadia-field-autopsy`

## Question

Across a list of transit station areas under joint-development / SB375-style policy, which reproduce the Arcadia formation stages, and where did private positioning precede public activation?

## What this harness carries

This is one instantiation of the repeatable pattern. It ships the four things every track needs:

1. **Signature / spine** — the portable discovery shape (`harness.json` → `scan`).
2. **Source adapters** — the non-portable acquisition cost, split by intake layer.
3. **Epistemic contract** — `graph_effect: none`, `promotes_to: candidate_only`.
4. **Custody target** — where admitted candidates seal into `axm-genesis` (layer 0).

## Source adapters — the acquisition cost

The signature is free to move; the acquisition is not. These are the adapters this track needs:

| adapter | surface | intake | status |
|---|---|---|---|
| `transit-jd-inventory` | Transit agency joint-development / station inventory | structured · GhostBox | new |
| `municipal-planning-portal` | Municipal general-plan / zoning / housing-element portals | photonic · ScreenGhost | new |
| `county-recorder-deeds` | County recorder deed chronology | photonic · ScreenGhost | new |
| `official-crawl` | Scheduled official-record crawler for the place terms | structured · direct | reuse |

**2 photonic** (no-API portals → ScreenGhost) · **2 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Enumerated station areas on the corridors in scope.
- **Source:** Transit agency joint-development inventory + station opening dates
- **Rule:** Every station in the corridor list is scored; none cherry-picked.

## Coverage seed (all `not_searched` until executed)

- [ ] station-area list per corridor
- [ ] adopted plan dates per station
- [ ] BID/assessment vehicle per downtown
- [ ] pre-opening acquisition per station

## Custody

Seals into **axm-genesis** as `place-formation-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
