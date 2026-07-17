# chunk2 — Capital Factory × NatSec100 overlap (intake)

Deterministic co-listing pass: **837 Capital Factory public-portfolio companies ×
196 NatSec100 companies → 12 co-listings**, one receipt per edge, dual-state on
every edge. Read **`analysis.md`** first — it leads with what joined, what did not,
and what changed.

Same discipline as the rest of the repo: **topology, not accusation.** A co-listing
is the intersection of two independent public surfaces; it is never a claim of CF
equity, routing, or coordination.

## Files

| file | contents |
|---|---|
| `analysis.md` | narrative: joined / not-joined / receipt changes / honest boundary |
| `cf_portfolio_universe.txt` | 837 CF portfolio slugs (the pinned universe) |
| `source_manifest.json` | CF source: url, accessed date, page + universe sha256, denominators |
| `overlap_cf_natsec100.jsonl` | 12 edges, each with `discovery_admission_state` **and** `independent_corroboration_state`, `competing_explanations`, `forbidden_inferences` |
| `corroboration_overlay.json` | hand-authored, search-sourced corroboration (kept out of the deterministic match) |
| `receipts.jsonl` | RCF01 (pinned CF index) + RCF02/RCF03 (corroboration) |
| `receipt_audit_seed.jsonl` | all 18 distinct seed `r-*` IDs with an honest resolution status |
| `build-cf-overlap.mjs` | regenerates the overlap deterministically |
| `validate-chunk2.mjs` | enforces the acceptance conditions (exit 0 = pass) |

## Reproduce

```
node build-cf-overlap.mjs     # 837 × 196 → 12
node validate-chunk2.mjs      # acceptance checks
```

## Dual-state model

- **discovery_admission_state** — what a source *admits/publishes*. Here:
  `cf_public_portfolio_index` (the slug is on CF's own `/portfolio` page, `RCF01`).
- **independent_corroboration_state** — whether an *independent* source confirms it:
  `corroborated` (4: ICON, Saronic, Firefly, Venus) or `cf_listing_only` (8).

Keeping these separate is the whole point: a preserved observation ("CF lists X")
and an established fact ("X is a corroborated CF portfolio company") are never
conflated, and neither implies CF equity.

## Not run this pass (by design)

Silent Ventures, Jackson Moses / Silent Capital, DIU, AFWERX, SBIR/STTR, and
USAspending overlaps remain unrun. No rows were promoted to a canonical ledger.
