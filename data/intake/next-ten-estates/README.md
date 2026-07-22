# Next ten estates — raw intake

This package populates one bounded **estate** for each of the project's ten declared research-track harnesses. An estate is a source-addressed raw-data domain with a named denominator, acquisition state, and missing-layer ledger. It is not a finding, case conclusion, graph edge, or publication.

## Transition boundary

```text
official or primary-public raw records
→ candidate-only estate intake
→ typed, receipted case ledger
→ structured report
→ independent review
→ approved publication
```

Everything in this directory has:

```text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
```

The corpus does not infer coordination, influence, intent, wrongdoing, or causation. It preserves null and incomplete coverage explicitly.

## Estate set

| # | Estate | Harness | Acquired denominator | State | Current raw state |
|---:|---|---|---:|---|---|
| 1 | `fulton-county-qoz-centennial-yards` | `opportunity-zones-value-capture` | 27/27 | `surface_complete` | denominator_acquired_anchor_partial |
| 2 | `district-noho-joint-development` | `metro-station-tod-sweep` | 1/1 | `surface_complete` | anchor_acquired_denominator_partial |
| 3 | `tsmc-arizona-chips-cluster` | `chips-act-fab-siting` | 1/1 | `surface_complete` | federal_anchor_acquired_local_layers_open |
| 4 | `new-highmark-stadium-public-finance` | `stadium-arena-public-finance` | 1/1 | `surface_complete` | official_finance_anchor_acquired_instruments_open |
| 5 | `cortland-chicago-river-tif` | `tif-district-value-capture` | 3/3 | `surface_complete` | legislation_acquired_dataset_rows_open |
| 6 | `commerce-pas-oge278-2021-2026` | `oge278-revolving-door-routers` | 12/12 | `surface_complete` | roster_acquired_disclosures_not_requested |
| 7 | `nato-diana-2026-cohort` | `defense-accelerator-fund-rosters` | 14/150 | `partially_searched` | challenge_area_acquired_full_cohort_open |
| 8 | `fda-senior-leadership-2021-2026` | `regulatory-revolving-doors` | 12/12 | `surface_complete` | initial_official_roster_acquired_term_history_open |
| 9 | `us-senate-119th-disclosures` | `congressional-disclosure-crossings` | 100/100 | `surface_complete` | full_cohort_acquired_disclosure_layers_open |
| 10 | `new-york-state-authority-land-contracts` | `state-officeholder-land-contract-crossings` | 45/45 | `surface_complete` | authority_denominator_acquired_transaction_rows_open |

The operational order follows the existing `data/research-tracks/index.json` declaration. It is not a merit score or subject ranking.

## Files

- `estates.jsonl` — one compact intake row per estate.
- `sources.jsonl` — official or primary-public source registry.
- `raw/<estate-id>.json` — acquired records and the layer-by-layer collection frontier.
- `manifest.json` — deterministic hashes, counts, track coverage, and boundaries.

## Coverage vocabulary

- `surface_complete` — the named source surface or bounded denominator was fully enumerated.
- `partially_searched` — an official surface was identified or sampled, but the named layer remains incomplete.
- `not_searched` — no executed acquisition is claimed for that layer.
- `unavailable_after_search` — permitted only with structured query, attempted locator, timestamp, and result provenance.

A complete anchor does not make the whole estate complete. For example, a final award page can be complete while deeds, incentive agreements, or disbursement records remain `not_searched`.

## Build and validate

```bash
npm run build:next-ten-estates
npm run validate:next-ten-estates
node test/next-ten-estates.test.js
```

The validator requires exactly one estate for every currently declared harness, resolves every source ID, checks denominator arithmetic, recomputes raw-file SHA-256 digests, and rejects score, ranking, verdict, finding, and graph-active fields.
