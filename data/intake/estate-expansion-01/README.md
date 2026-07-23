# Estate-slice expansion 01 — close the first pass, then widen the controls

> **Ontology correction.** This package contains **estate slices**, not macro estates. Its historical `estate_id` fields remain unchanged for reproducibility. `data/estates/` supplies the parent Dialog, defense, development, state, regulatory, capital, public-money, offshore, and public-interest estates.

This package does two different jobs without collapsing them into a finding.

```text
first ten raw estate slices
→ close every incomplete layer to an acquired surface, a bounded partial state, or a complete denominator
→ preserve the residual fog
→ add ten control slices selected for marginal information gain
→ map every slice into a durable domain estate
→ typed case-ledger promotion only after evidence and human review
```

Everything remains:

```text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
```

## What “finish” means here

The original first-slice snapshot contained 48 layers below `surface_complete`, including 40 marked `not_searched`.
This expansion does **not** rewrite that historical snapshot. `completion.json` is an append-only closure overlay.

A layer is closed for this investigation pass only when it now has one of these states:

- `surface_complete` — the named, bounded denominator or source surface was fully enumerated;
- `partially_searched` — a real source surface was acquired and the residual unknown plus next acquisition step are explicit;
- `unavailable_after_search` — permitted only with structured search provenance.

No original incomplete layer may remain `not_searched` in the overlay. This is collection-state completion for a slice, not completion of its parent estate and not factual or editorial approval.

The single denominator newly closed to full enumeration is NATO DIANA’s 2026 cohort: **150 companies across ten challenge areas**. That is a completed slice surface inside the transatlantic defense-innovation estate. The expensive residue is legal company identity, leadership, capital, awards, cross-year recurrence, and null-preserving joins.

## Fog triage

The slice corpus distinguishes three immediate fog classes:

1. **Missing denominator.** The bounded slice universe is incomplete, so recurrence and nulls cannot be interpreted.
2. **Missing legal instrument.** Announcements exist, but risk allocation, land control, milestones, defaults, or payment terms remain hidden.
3. **Missing transaction or identity join.** Source systems exist, but the same legal entity or person has not been independently resolved across them.

The macro-estate layer adds source-family coverage, cross-slice denominators, custody attrition, temporal order, and cross-estate join rules.

## Second control cohort

| Position | Slice | Track | Control type | Primary macro estate |
|---:|---|---|---|---|
| 1 | `nato-diana-2025-cohort` | defense accelerator rosters | longitudinal | transatlantic defense innovation |
| 2 | `expo-crenshaw-joint-development` | transit TOD | same agency | local development |
| 3 | `the-78-chicago-tif` | TIF value capture | same city / same meeting | local development |
| 4 | `us-house-119th-disclosures` | congressional disclosures | chamber | U.S. legislative and political finance |
| 5 | `ftc-commissioner-router-2021-2026` | regulatory revolving doors | small regulator | regulatory markets |
| 6 | `doe-edf-leadership-portfolio` | OGE/PAS routers | government-capital office | U.S. executive appointments and ethics |
| 7 | `micron-clay-chips-cluster` | CHIPS siting | cross-state program | public money and industrial policy |
| 8 | `nashville-east-bank-stadium-district` | stadium finance | ancillary land | local development |
| 9 | `baltimore-peninsula-public-incentive-stack` | Opportunity Zone formation | adjacent public-program stack | local development |
| 10 | `california-high-speed-rail-land-contracts` | state land/contracts | transaction-rich state authority | state and municipal authorities |

The order is operational, never a merit, influence, suspicion, or subject ranking.

## Files

- `completion.json` — one closure overlay for every first-batch slice and every previously incomplete layer.
- `next-ten.json` — ten new raw control slices, one for each declared research-track harness.
- `triage.json` — categorical slice-level fog frontier and operational work order.
- `sources.jsonl` — new official or primary-public source registry; old source IDs resolve through `data/intake/next-ten-estates/sources.jsonl`.
- `manifest.json` — deterministic counts and SHA-256 custody, emitted by the builder.

## Build and validate

```bash
node tools/build-estate-expansion.mjs
node tools/validate-estate-expansion.mjs
node test/estate-expansion.test.js
node tools/build-estates.mjs
```

The validator fails if any original incomplete layer lacks exactly one closure, a closure remains `not_searched`, a partial state lacks residual fog and a next step, a source ID does not resolve, the control cohort does not cover every declared harness exactly once, or candidate material gains a score, verdict, finding, graph effect, causal conclusion, or publication approval.

The macro-estate compiler separately fails if a case, track, or historical slice is unmapped or mapped to more than one primary estate.

## Boundaries

A source route is not the underlying transaction. A complete roster is not an identity join. A signed authorization is not necessarily an executed agreement. A topline award is not an obligation or outlay. A crossing is not influence, coordination, wrongdoing, or causation. A completed slice is not a completed estate.
