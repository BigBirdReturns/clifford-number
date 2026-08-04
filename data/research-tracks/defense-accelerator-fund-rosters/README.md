# Research track: Defense-tech accelerator & fund roster routers (beyond Capital Factory)

**Axis:** `person-router`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `person-centered-defense-routers`, `austin-israel-defense-corridor`

## Question

Extending the existing router scan past Capital Factory: across additional defense-tech fund and accelerator rosters, who clears the routing threshold on public records?

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
| `fund-team-rosters` | Fund / accelerator team & cohort pages | photonic · ScreenGhost | reuse |
| `sec-formd-funds` | SEC Form-D for the funds' vehicles | structured · direct | reuse |
| `usaspending-portfolio` | USAspending awards to portfolio companies | structured · GhostBox | new |
| `sbir-awards` | SBIR/STTR award records | structured · direct | new |

**1 photonic** (no-API portals → ScreenGhost) · **3 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** Team rosters of the funds/accelerators in scope (e.g. American Dynamism, Founders Fund defense, In-Q-Tel, DIU/AFWERX cohorts).
- **Source:** Fund team pages + accelerator cohort lists
- **Rule:** Full roster is the denominator; only surface-complete rosters count toward it.

## Coverage seed (all `not_searched` until executed)

- [ ] roster per fund (surface_complete vs partial)
- [ ] vehicles per person
- [ ] portfolio-company award surface
- [ ] cross-fund co-investment edges

## Retrieval tiering (Tier-Bench)

Tier-Bench measured that work separates on **settled-vs-derived, not difficulty** — and that line is the `candidate_only` boundary. So the heavy lifting is cheap:

| rung | model | work |
|---|---|---|
| settled | `haiku` | photonic extraction (screen->JSON), structured parse, denominator enumeration… |
| derivation-with-a-check | `sonnet` | predicate-threshold evaluation, entity resolution, plain-language coverage notes… |
| derived | `fable+human` | candidate->finding promotion, forbidden-inference gate, coincidence-vs-structure adjudication… |

Escalation is **effort-first**: start on Haiku, escalate only when the validation surface actually fails. Retrieval has `graph_effect: none`, so the cheap rungs are epistemically safe — only Fable+human may promote a candidate.

## Custody

Seals into **axm-genesis** as `person-router-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Current bounded intake

- [`BVVC defense-capital intake`](../../intake/bvvc-defense-capital/README.md) freezes 27 current leadership labels and 30 current Portfolio Universe labels, admits selected public-role profiles, a partial SEC vehicle plane, and four transaction-specific observations. It remains `candidate_only` with `graph_effect: none`.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
