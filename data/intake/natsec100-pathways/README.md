# NatSec100 Pathways Database (intake stage)

## Conversion status

- **`chunk1/` converted to `cases/us-defense-natsec100/` on 2026-07-06**
  (BUILD-INSTRUCTIONS gate 3.1a): receipts, surfaces, company_years, companies,
  conversion_events, and the receipt-backed operator/sponsor/partner actors are
  now in ledger-quartet form under the case directory. This intake copy is
  retained unchanged as provenance.
- **`seed/` is blocked and stays in intake.** Its `claims.jsonl` cites 18
  distinct `r-*` receipt ids, but no `receipts.jsonl` was ever delivered for the
  seed batch. Per constitution 1.1 it cannot be promoted until those receipts
  arrive.

US defense-tech ecosystem dataset centered on the SVDG NatSec100 ranking
surface and the Capital Factory / Silent Ventures / Jackson Moses routing
layer. Intake stage: receipt-backed base tables only. No overlap analysis has
been run, no rows have been promoted to the canonical hop-surface ledger, and
no company ledgers or scores beyond the three explicitly-insufficient seed
scores exist yet.

Same discipline as the rest of the repo: topology, not accusation. Every
conversion event carries `competing_explanations` and `forbidden_inferences`;
multi-surface presence is a graph fact, never a coordination claim.

## Layout

### `seed/` — Capital Factory / Silent Ventures / SVDG seed pass

| file | rows | contents |
|---|---|---|
| `actors.jsonl` | 80 | seed actor registry (`person:` / `org:` / `company:` / `surface:` ids) |
| `claims.jsonl` | 66 | reviewed subject-predicate-object claims with evidence class, receipt id, `ui_weight`, and `failure_mode` where a claim needs a caveat |
| `conversion_events.jsonl` | 14 | `conv-*` myth-to-market conversion events |
| `myth_to_market_scores.jsonl` | 3 | scoring pass; most dimensions deliberately `insufficient_evidence` |

Hygiene applied on ingest (2026-07-06): the delivered file carried three
duplicate `actor_id` lines. Byte-identical duplicates of `company:hadrian` and
`company:firefly-aerospace` were dropped. Two differing `org:svdg` rows
(`nonprofit_ecosystem_node` vs `nonprofit` + alias) were merged into one row,
`type: nonprofit`, `aliases: ["SVDG"]`, matching how chunk 1 records SVDG.
Nothing else was edited.

### `chunk1/` — NatSec100 roster ingestion (strict-sequencing steps 1-2)

| file | rows | contents |
|---|---|---|
| `companies.jsonl` | 196 | unique companies across all ingested rosters, alias-reconciled |
| `company_years.jsonl` | 342 | company-year roster rows (2023: 100, 2024: 100, 2025: 42 partial, 2026: 100) |
| `receipts.jsonl` | 16 | `R###` receipts (official PDFs, edition pages, press corroboration) |
| `conversion_events.jsonl` | 367 | `CE####` events: 342 programmatic inclusion events + documented exits, IPO filings, one methodology exit, 5 medium-confidence FY25 Air Force line items |
| `surfaces.jsonl` | 4 | the four NatSec100 editions (`S_NS23`-`S_NS26`); only 2026 is procurement-gated |
| `actors.jsonl` | 12 | `A###` receipt-backed operators/sponsors/methodology partners |
| `delta_report_chunk1.md` | — | coverage, failed retrievals, OCR resolutions, rejected hypotheses, QC confirmations |

Verified on ingest: every JSONL line parses; 2023/2024/2026 each have exactly
100 rows with rank continuity 1-100; 2025 is explicitly partial (42 rows, 27
ranked) and must never be used as a denominator; all `receipt_ids`,
`company_id`s, and `operator_actor_id`s resolve within the chunk; no duplicate
`company_id` or `event_id`.

## Known open items (from the chunk 1 delta report)

- 2025 roster incomplete: 58 companies unidentified. Recovery paths: Wayback
  snapshots of the 2025 companies widget, 2025 inclusion press releases.
- RRAI -> Forterra identity link held at medium confidence pending a rebrand
  receipt.
- Armis and GoTenna appear only in the 2026 exits table; membership year
  unconfirmed.
- Validation / credential / narrative event tables: candidates flagged, none
  created.
- All overlap tables (Silent Ventures, Capital Factory, Jackson Moses, DIU,
  AFWERX, SBIR/STTR, USAspending): not yet run, by design.

## Relationship between the two batches

The seed pass and chunk 1 use different id schemes (`org:svdg` vs `A001`;
`conv-*` vs `CE####`) and overlap in subject matter (e.g. the 14 seed
conversion events are the hand-curated ancestors of chunk 1's programmatic
pass). They are kept as delivered; reconciliation into a single id space is
part of the promotion step, not intake.

## Next chunk (per the delta report)

Chunk 2: (a) close the 2025 roster; (b) deterministic overlap pass against
Silent Ventures, then Capital Factory, then Jackson Moses / Silent Capital,
one receipt per portfolio edge. The five FY25 Air Force line items (Sierra
Space, X-Bow, JetZero, Dataminr, Castelion) are the cheapest confidence
upgrades: each should resolve against USAspending in one query.
