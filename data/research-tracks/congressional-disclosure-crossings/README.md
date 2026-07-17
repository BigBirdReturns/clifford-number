# Research track: Congressional disclosure × federal money-stream crossings

**Axis:** `disclosure-crossing`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `oge-fec-overlap`, `us-presidential-officeholder-cohort`

## Question

Generalizing the OGE-FEC overlap engine to the full legislative cohort: which members' disclosed entities exactly overlap a federal money stream, and in what temporal order relative to their votes/tenure?

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
| `member-roster` | House/Senate membership roster per term | structured · direct | new |
| `periodic-transaction-reports` | House/Senate PTR + annual financial disclosures | photonic · ScreenGhost | new |
| `usaspending-awards` | USAspending awards to disclosed entities | structured · GhostBox | new |
| `fec-contributions` | FEC contributions to/from member committees | structured · direct | reuse |
| `overlap-temporal-screen` | Exact-overlap + temporal-screen join | structured · direct | reuse |

**1 photonic** (no-API portals → ScreenGhost) · **4 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** The full chamber roster for the term slice.
- **Source:** House/Senate membership rosters
- **Rule:** Every member enumerated; a null crossing is a recorded result.

## Coverage seed (all `not_searched` until executed)

- [ ] chamber roster per term
- [ ] disclosed entities per member
- [ ] award overlaps per entity
- [ ] temporal order per overlap

## Custody

Seals into **axm-genesis** as `crossing-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
