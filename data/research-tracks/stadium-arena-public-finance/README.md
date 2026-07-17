# Research track: Stadium / arena public-finance capture

**Axis:** `place-formation`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `arcadia-field-autopsy`

## Question

Where a stadium or arena was built with public financing, who captured the surrounding land uplift and the ancillary development rights, and how was the public cost structured?

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
| `municipal-bond-agenda` | Municipal bond / council agenda records | photonic · ScreenGhost | new |
| `team-ownership-entity` | Team / venue ownership entity filings | structured · direct | reuse |
| `county-recorder-deeds` | Ancillary parcel deed chronology | photonic · ScreenGhost | new |
| `cafr-financials` | Municipal CAFR / financial disclosures for the subsidy | photonic · ScreenGhost | new |

**3 photonic** (no-API portals → ScreenGhost) · **1 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Publicly financed venues in scope (league/era slice).
- **Source:** Municipal bond records + venue financing databases
- **Rule:** All venues in slice scored.

## Coverage seed (all `not_searched` until executed)

- [ ] venue list per slice
- [ ] public-cost structure per venue
- [ ] ancillary development rights per venue
- [ ] owner control chain

## Retrieval tiering (Tier-Bench)

Tier-Bench measured that work separates on **settled-vs-derived, not difficulty** — and that line is the `candidate_only` boundary. So the heavy lifting is cheap:

| rung | model | work |
|---|---|---|
| settled | `haiku` | photonic extraction (screen->JSON), structured parse, denominator enumeration… |
| derivation-with-a-check | `sonnet` | stage disposition (does a search close a trail), recurring-intermediary resolution, plain-language coverage notes… |
| derived | `fable+human` | candidate->finding promotion, forbidden-inference gate, coincidence-vs-structure adjudication… |

Escalation is **effort-first**: start on Haiku, escalate only when the validation surface actually fails. Retrieval has `graph_effect: none`, so the cheap rungs are epistemically safe — only Fable+human may promote a candidate.

## Custody

Seals into **axm-genesis** as `place-formation-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
