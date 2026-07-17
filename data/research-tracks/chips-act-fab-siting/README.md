# Research track: CHIPS-Act fab / data-center siting formation

**Axis:** `place-formation`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `arcadia-field-autopsy`, `person-centered-defense-routers`

## Question

Where federal semiconductor or data-center subsidy de-risked a site, who assembled the land and secured the incentives, and in what order relative to the public award?

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
| `commerce-chips-awards` | Commerce CHIPS award announcements | structured · direct | new |
| `usaspending-awards` | USAspending prime/sub awards to the recipient | structured · GhostBox | new |
| `state-incentive-register` | State incentive / abatement agreements | photonic · ScreenGhost | new |
| `county-recorder-deeds` | County recorder land-assembly chronology | photonic · ScreenGhost | new |

**2 photonic** (no-API portals → ScreenGhost) · **2 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Announced CHIPS/data-center subsidy sites in scope.
- **Source:** Commerce CHIPS award announcements + state incentive registers
- **Rule:** All announced sites enumerated.

## Coverage seed (all `not_searched` until executed)

- [ ] announced-site list
- [ ] land-assembly chronology per site
- [ ] incentive package terms per site
- [ ] recipient corporate control

## Custody

Seals into **axm-genesis** as `place-formation-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
