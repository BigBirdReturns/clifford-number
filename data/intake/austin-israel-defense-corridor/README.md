# Austin–Israel defense-corridor intake (portable, source-addressed)

A repo-only agent can fully inspect this directory. It covers three related but **distinct**
corridors and joins them to existing NatSec100 work **only where a source-explicit edge exists**.

Every edge carries a **dual state**, because discovery and verification are separate:

- `discovery_admission_state` — `admitted` when some source represents the claim (preserved even
  when uncertain), else `not_admitted`.
- `independent_corroboration_state` — one of `source_explicit`, `independently_corroborated`,
  `self_claimed`, `name_match_only`, `rejected`, `not_searched`, `source_unavailable`.

Uncertainty changes the **label**, not whether the observable claim is preserved. A self-authored
profile or company page establishes only that an actor/org **publicly represented** a role — never
legal identity, transaction, ownership, coordination, influence, or wrongdoing. `graph_effect: none`.

## Build / validate

```
npm run build:corridor        # deterministic from the committed CF universe + NatSec100 chunk1
npm run validate:corridor
node test/austin-israel-corridor.test.js
```

Raw fetched pages live under `build/corridor/` (git-ignored); the committed
`capital-factory-portfolio-universe.json` hash-pins Capital Factory's public portfolio page so the
overlap reproduces without a re-fetch.

## Files

`manifest.json` · `receipts.jsonl` · `organizations.jsonl` · `actors.jsonl` ·
`professional-claims.jsonl` · `portfolio-edges.jsonl` · `government-surfaces.jsonl` ·
`join-candidates.jsonl` · `confirmed-joins.jsonl` · `rejected-joins.jsonl` · `coverage-gaps.jsonl` ·
`motifs.jsonl` · `capital-factory-portfolio-universe.json` · `analysis.md`

## Known boundaries (explicit)

- **Israel linkage** is only ever from explicit self-identification / official history — never a
  name, surname, ethnicity, or assumed citizenship. Lane B (Austin-headquartered Israeli-linked
  companies) was **not searched** this pass; **no members are asserted**.
- **Stratos portfolio** is shown only as logos on its site; it is **not** OCR-promoted to named
  entities (`source_unavailable`, pending visual review).
- **Joshua Baer**'s private LinkedIn captures are **not** in the portable 31-profile projection and
  were **not** inspected.
- 21 natsec100 seed receipt references have no source-addressable record and are demoted to
  `receipt_unresolved`. A string containing a receipt ID is not a receipt.
