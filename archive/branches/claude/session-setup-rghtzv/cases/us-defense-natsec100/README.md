# US Defense-Tech: NatSec100 Corridor (case ledger)

Case directory for BUILD-INSTRUCTIONS gate 3.1 (US defense-tech / NatSec100
corridor). This is the ledger-quartet form of the NatSec100 ranking surface:
four dated ranking editions (2023-2026), the companies ranked on them, and the
receipt-backed operators, sponsors, and methodology partners of the ranking.

Topology, not accusation. Ranking inclusion is a graph fact and a public
validation event; it is never a coordination, favoritism, or wrongdoing claim.
Every row traces to a receipt a stranger can check (constitution 1.1).

## Provenance

- Converted **2026-07-06** from `data/intake/natsec100-pathways/chunk1/`
  (strict-sequencing steps 1-2: roster ingestion + base tables).
- Source coverage, failed retrievals, OCR resolutions, and QC confirmations
  are recorded in `data/intake/natsec100-pathways/chunk1/delta_report_chunk1.md`
  (the source delta report). The intake copy is retained unchanged as provenance.
- Loader wiring is a separate leg. Until wired, this directory is inert:
  nothing in `tools/`, `data/ledger/`, or `cases.json` references it, and
  `npm run check` does not read it.

## Layout

| file | rows | contents |
|---|---|---|
| `registries/organizations.json` | 208 | 196 ranked companies + 12 `A###` ranking-org actors (operators, sponsors, methodology/data partners, top-investor funds) |
| `registries/actors.json` | 0 | natural persons only; chunk 1 delivered no person actor rows (all 12 `A###` are organizations; e.g. Mike Keating appears only inside SVDG's `role_summary`, not as an actor row) |
| `ledger/surfaces.jsonl` | 4 | the four NatSec100 editions as dated `ranking_surface` rows |
| `ledger/participation.jsonl` | 358 | 342 `ranking_inclusion` rows (one per company-year) + 16 operator/sponsor/partner rows |
| `ledger/receipts.jsonl` | 16 | `R001`-`R016`, case-scoped, each with its archive block preserved |
| `tables/companies.jsonl` | 196 | verbatim copy from intake (native case table) |
| `tables/conversion_events.jsonl` | 367 | verbatim copy from intake (native case table) |

`surface_type: ranking_surface` is a new canonical vocabulary entry added to
`data/canonical/surface-types.json` in the same change (the only canonical file
touched). It is `hop_eligible_default: false`, `scorable: true`.

## Driver decisions

**(a) The seed batch was NOT converted.** `data/intake/natsec100-pathways/seed/`
(the Capital Factory / Silent Ventures / SVDG hand-curated pass) stays in intake.
Its `claims.jsonl` references receipts under the `r-*` id prefix pattern (e.g.
`r-baer-profile-2026`, `r-svdg-press-release-2026`), but **no `receipts.jsonl`
was ever delivered for the seed batch** — the seed directory contains no receipt
file at all. The seed claims cite **18 distinct `r-*` receipt ids** that do not
exist. Per constitution 1.1 (no edge without a receipt), the seed batch cannot
be promoted until those receipts arrive; it remains in intake as provenance.
Chunk 1's receipts are the `R###` set and are fully self-resolving, so chunk 1
converts cleanly on its own.

**(b) `conversion_events` is kept as a native case table**, not folded into a
claims ledger. Each event carries `competing_explanations` and
`forbidden_inferences` fields (the topology-not-accusation discipline) that have
no home in the subject-predicate-object claims schema. Rather than drop those
fields, the table is preserved verbatim as a case-local artifact; the 342
programmatic inclusion events mirror the `ranking_inclusion` participation rows,
and the remaining 25 (documented M&A exits, IPO/filings, one SpaceX methodology
exit, five medium-confidence FY25 Air Force line items) stay as source records.

**(c) Ranking editions are non-hop by density discipline** (constitution 1.7).
A 100-name ranking is a scorable, context-visible surface, never a silent hop
machine: two companies co-listed on NatSec100 share no bounded coordination
surface. All four editions are `hop_eligible: false`. The operator/sponsor/
partner rows record who runs and underwrites the ranking (SVDG, J.P. Morgan,
Franklin Templeton, Balyasny, Pryzm); hop eligibility of any small-N, dated
portfolio/advisory surface is deferred to the chunk-2 overlap pass.

### Publication-date precision

Edition `time_start`/`time_end` are set to the edition publication date at the
precision the receipts support (an edition is a point-in-time published artifact,
so start = end):

| edition | date | basis |
|---|---|---|
| 2023 | `2023-07-04` | day precision (intake surface: "published Jul 4 2023"; R001) |
| 2024 | `2024-07` | month precision only (intake surface: "published Jul 2024") |
| 2025 | `2025-07` | month precision only; the R003 PDF filename encodes `20250706` but that is an upload/generation stamp, not asserted as the publication day — precision widened, never invented (constitution 1.3) |
| 2026 | `2026-05-26` | day precision (R007 press release "May 26, 2026") |

## Acceptance counts (verified programmatically)

Reproduces the chunk-1 delta counts (BUILD-INSTRUCTIONS 3.1).

| check | expected | actual |
|---|---|---|
| `ranking_inclusion` participation rows | 342 | 342 |
| — by edition (2023 / 2024 / 2025 / 2026) | 100 / 100 / 42 / 100 | 100 / 100 / 42 / 100 |
| rank continuity 1-100 (2023 / 2024 / 2026) | continuous | continuous |
| 2025 partial rows carrying `confidence` | 42 | 42 |
| operator/sponsor/partner participation rows | — | 16 (operator 4, sponsor 3, methodology 8, data 1) |
| participation rows total | — | 358 |
| organizations registry | 196 companies + 12 `A###` | 208 |
| receipts (all with archive block) | 16 | 16 |
| surfaces (all `ranking_surface`, `hop_eligible: false`) | 4 | 4 |
| unique companies | 196 | 196 (194 with company-year rows; Armis & GoTenna are 2026-exit-table records with no roster row) |
| unresolved receipt refs (participation + surfaces) | 0 | 0 |

## Known open items (carried from the chunk-1 delta report)

- 2025 roster incomplete: 58 companies unidentified; the 42 recovered rows must
  never be used as a denominator. Recovery deferred to chunk 2.
- RRAI -> Forterra identity link held at medium confidence pending a rebrand receipt.
- Armis and GoTenna appear only in the 2026 exits table; membership year unconfirmed.
- All overlap tables (Silent Ventures, Capital Factory, Jackson Moses, DIU,
  AFWERX, SBIR/STTR, USAspending): not yet run, by design.
