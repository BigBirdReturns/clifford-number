# Research track: OGE-278 senior-appointee revolving-door routers

**Axis:** `person-router`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `person-centered-defense-routers`

## Question

Among senior executive-branch appointees (OGE-278 filers) in scope, who pairs a prior government role with an investing/advisory vehicle that touches a federal award surface — as a discovery-routing signal, never an allegation?

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
| `oge-278-index` | OGE Form-278 disclosure index + filings | photonic · ScreenGhost | reuse |
| `fec-contributions` | FEC individual/committee contributions | structured · direct | reuse |
| `sec-formd-vehicles` | SEC Form-D for the filer's disclosed vehicles | structured · direct | reuse |
| `usaspending-awards` | USAspending awards to disclosed entities | structured · GhostBox | new |
| `linkedin-roles` | LinkedIn role-crossing capture | photonic · ScreenGhost | reuse |

**2 photonic** (no-API portals → ScreenGhost) · **3 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Enumerated OGE-278 filers for the department/term slice.
- **Source:** OGE 278 disclosure index
- **Rule:** All filers in slice scored; below-threshold retained.

## Coverage seed (all `not_searched` until executed)

- [ ] OGE-278 filer list per slice
- [ ] disclosed vehicles per filer
- [ ] award surface per vehicle
- [ ] role chronology per filer

## Custody

Seals into **axm-genesis** as `person-router-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
