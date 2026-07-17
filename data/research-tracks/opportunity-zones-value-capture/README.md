# Research track: Opportunity Zone value-capture formation

**Axis:** `place-formation`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `arcadia-field-autopsy`

## Question

Where a 2017 federal Opportunity Zone designation de-risked private capital, who was positioned in the tract before designation, and did the capital-gains uplift concentrate in a small set of intermediaries — on public records only?

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
| `treasury-oz-tracts` | Treasury/CDFI designated OZ tract list | structured · direct | new |
| `sec-qof-regd` | SEC Reg-D / Form-D filings for Qualified Opportunity Funds | structured · direct | reuse |
| `county-recorder-deeds` | County recorder grantor/grantee deed chronology | photonic · ScreenGhost | new |
| `usaspending-tract` | USAspending / HUD assistance touching the tract | structured · GhostBox | new |

**1 photonic** (no-API portals → ScreenGhost) · **3 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** The set of designated OZ census tracts in scope (state or metro slice).
- **Source:** Treasury/CDFI OZ designated-tract list
- **Rule:** All tracts in slice enumerated; matches are candidate_only.

## Coverage seed (all `not_searched` until executed)

- [ ] designated-tract list for slice
- [ ] pre-2018 parcel ownership per tract
- [ ] QOF investor identity per tract
- [ ] post-designation assessed-value change

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
