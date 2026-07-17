# Research track: State officeholder × land / contract crossings

**Axis:** `disclosure-crossing`  ·  **Status:** scaffold (declared, not wired)  ·  **Derived from:** `oge-fec-overlap`, `arcadia-field-autopsy`

## Question

At the state level, which legislators or agency heads have disclosed entities that overlap state contracts or land actions, and did the disclosure precede or follow the action?

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
| `state-legislative-roster` | State legislature / agency roster | structured · direct | new |
| `state-ethics-disclosure` | State ethics / financial-disclosure portal | photonic · ScreenGhost | new |
| `state-sos-registry` | State Secretary-of-State business registry | photonic · ScreenGhost | reuse |
| `county-recorder-deeds` | County recorder land actions | photonic · ScreenGhost | new |
| `state-procurement` | State procurement / contract awards | photonic · ScreenGhost | new |

**4 photonic** (no-API portals → ScreenGhost) · **1 structured** (bulk/API → GhostBox or direct). Photonic adapters are the marginal cost of each new jurisdiction; structured ones mostly reuse existing tools.

## Denominator discipline

- **Universe:** The legislature/agency roster for the state and term in scope.
- **Source:** State legislative roster + agency leadership
- **Rule:** Full roster enumerated per state; per-state adapters required.

## Coverage seed (all `not_searched` until executed)

- [ ] state roster per term
- [ ] disclosed entities per officeholder
- [ ] state contract/land overlap per entity
- [ ] temporal order per overlap

## Retrieval tiering (Tier-Bench)

Tier-Bench measured that work separates on **settled-vs-derived, not difficulty** — and that line is the `candidate_only` boundary. So the heavy lifting is cheap:

| rung | model | work |
|---|---|---|
| settled | `haiku` | photonic extraction (screen->JSON), structured parse, denominator enumeration… |
| derivation-with-a-check | `sonnet` | entity resolution, exact-overlap join, temporal screen… |
| derived | `fable+human` | candidate->finding promotion, forbidden-inference gate, coincidence-vs-structure adjudication… |

Escalation is **effort-first**: start on Haiku, escalate only when the validation surface actually fails. Retrieval has `graph_effect: none`, so the cheap rungs are epistemically safe — only Fable+human may promote a candidate.

## Custody

Seals into **axm-genesis** as `crossing-shard@1`, feeding the **field-autopsy** publication layer. Status: **declared_not_wired**.

> A track corpus is custody-ready when every admitted candidate's receipts compile into a genesis shard that passes `axm-verify` DETACHED (bytes + out-of-band key only). Until then receipts remain receipt-v2 provenance, honestly labeled.

## Next step

Wire the photonic adapters first (they gate everything), enumerate the denominator, then run the spine/scan as bounded `candidate_only` searches. Nothing promotes without a receipt and a human review decision.
