# Research track: Tax-increment-financing district value capture

**Axis:** `place-formation`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `arcadia-field-autopsy`

## Question

Within a TIF district, whose parcels captured the increment-funded uplift, and were they positioned before the district was drawn?

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
| `municipal-tif-ordinance` | Municipal TIF ordinance / redevelopment agenda | photonic · ScreenGhost | new |
| `county-assessor-roll` | County assessor increment / assessed-value roll | structured · GhostBox | new |
| `county-recorder-deeds` | Deed chronology inside district boundary | photonic · ScreenGhost | new |
| `official-crawl` | Official-record crawler for district terms | structured · direct | reuse |

**2 photonic** (no-API portals → ScreenGhost) · **2 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Adopted TIF districts in the jurisdiction slice.
- **Source:** Municipal TIF ordinances + state TIF registries
- **Rule:** All districts enumerated.

## Coverage seed (all `not_searched` until executed)

- [ ] district-boundary list
- [ ] increment allocation per district
- [ ] pre-adoption ownership inside boundary
- [ ] developer entitlement dates

## Custody

Seals into **axm-genesis** as `place-formation-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
