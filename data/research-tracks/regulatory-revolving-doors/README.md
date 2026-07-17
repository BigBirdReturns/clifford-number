# Research track: Regulatory revolving-door routers (non-defense surfaces)

**Axis:** `person-router`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `person-centered-defense-routers`

## Question

Applying the router predicates to non-defense regulatory surfaces (e.g. FDA↔pharma, FCC↔telecom, FAA↔aviation): who moves between the regulator and the regulated with a capital or advisory vehicle in between?

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
| `agency-leadership-roster` | Agency leadership / advisory-committee rosters | photonic · ScreenGhost | new |
| `ethics-disclosures` | Agency ethics / recusal / 278 disclosures | photonic · ScreenGhost | reuse |
| `sec-formd-vehicles` | SEC Form-D for disclosed vehicles | structured · direct | reuse |
| `linkedin-roles` | LinkedIn role-crossing capture | photonic · ScreenGhost | reuse |

**3 photonic** (no-API portals → ScreenGhost) · **1 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Senior officials of the agency in the term slice + named industry counterparts.
- **Source:** Agency leadership rosters + ethics disclosures
- **Rule:** Full official roster scored; industry side is candidate_only.

## Coverage seed (all `not_searched` until executed)

- [ ] agency roster per slice
- [ ] post-tenure industry roles
- [ ] vehicles per person
- [ ] regulated-surface touch per vehicle

## Custody

Seals into **axm-genesis** as `person-router-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
