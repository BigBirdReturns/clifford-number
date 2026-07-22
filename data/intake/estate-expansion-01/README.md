# Estate expansion 01 — close the first pass, then widen the controls

This package does two different jobs without collapsing them into a finding.

```text
first ten raw estates
→ close every incomplete layer to an acquired surface, a bounded partial state, or a complete denominator
→ preserve the residual fog
→ add ten controls selected for marginal information gain
→ typed case-ledger promotion only after evidence and human review
```

Everything remains:

```text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
```

## What “finish” means here

The original first-ten snapshot contained 48 layers below `surface_complete`, including 40 marked `not_searched`.
This expansion does **not** rewrite that historical snapshot. `completion.json` is an append-only closure overlay.

A layer is closed for this investigation pass only when it now has one of these states:

- `surface_complete` — the named, bounded denominator or source surface was fully enumerated;
- `partially_searched` — a real source surface was acquired and the residual unknown plus next acquisition step are explicit;
- `unavailable_after_search` — permitted only with structured search provenance.

No original incomplete layer may remain `not_searched` in the overlay. This is collection-state completion, not factual or editorial approval.

The single denominator newly closed to full enumeration is NATO DIANA’s 2026 cohort: **150 companies across ten challenge areas**. The expensive residue is now company identity, leadership, capital, award, and cross-roster joining.

## Fog triage

The corpus distinguishes three fog classes:

1. **Missing denominator.** The universe is incomplete, so recurrence and nulls cannot be interpreted.
2. **Missing legal instrument.** Announcements exist, but risk allocation, land control, milestones, defaults, or payment terms remain hidden.
3. **Missing transaction or identity join.** Source systems exist, but the same legal entity or person has not been independently resolved across them.

The second cohort favors same-system, longitudinal, chamber, and cross-jurisdiction controls. Its order is operational, never a merit, influence, suspicion, or subject ranking.

## Second cohort

| Position | Estate | Track | Control type |
|---:|---|---|---|
| 1 | `nato-diana-2025-cohort` | defense accelerator rosters | longitudinal |
| 2 | `expo-crenshaw-joint-development` | transit TOD | same agency |
| 3 | `the-78-chicago-tif` | TIF value capture | same city / same meeting |
| 4 | `us-house-119th-disclosures` | congressional disclosures | chamber |
| 5 | `ftc-commissioner-router-2021-2026` | regulatory revolving doors | small regulator |
| 6 | `doe-edf-leadership-portfolio` | OGE/PAS routers | government-capital office |
| 7 | `micron-clay-chips-cluster` | CHIPS siting | cross-state program |
| 8 | `nashville-east-bank-stadium-district` | stadium finance | ancillary land |
| 9 | `baltimore-peninsula-public-incentive-stack` | Opportunity Zone formation | adjacent public-program stack |
| 10 | `california-high-speed-rail-land-contracts` | state land/contracts | transaction-rich state authority |

## Files

- `completion.json` — one closure overlay for every first-ten estate and every previously incomplete layer.
- `next-ten.json` — ten new raw estates, one for each declared research-track harness.
- `triage.json` — categorical fog frontier and operational work order.
- `sources.jsonl` — new official or primary-public source registry; old source IDs resolve through `data/intake/next-ten-estates/sources.jsonl`.
- `manifest.json` — deterministic counts and SHA-256 custody, emitted by the builder.

## Build and validate

```bash
node tools/build-estate-expansion.mjs
node tools/validate-estate-expansion.mjs
node test/estate-expansion.test.js
```

The validator fails if:

- any original incomplete layer lacks exactly one closure;
- a closure remains `not_searched`;
- a partial state lacks its residual fog and next step;
- a complete denominator does not reconcile;
- a source ID does not resolve;
- the second cohort does not cover every declared harness exactly once;
- a candidate object gains a score, rank, verdict, finding, claim status, graph effect, causal conclusion, or publication approval;
- deterministic hashes or logical-record counts diverge.

## Boundaries

A source route is not the underlying transaction. A complete roster is not an identity join. A signed authorization is not necessarily an executed agreement. A topline award is not an obligation or outlay. A crossing is not influence, coordination, wrongdoing, or causation.
