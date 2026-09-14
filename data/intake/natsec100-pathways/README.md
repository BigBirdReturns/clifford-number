# NatSec100 Pathways Database — Phase 1 intake frontier

This directory is the US defense-tech second-case intake. It combines the SVDG
NatSec100 ranking surfaces with the Capital Factory, Silent Ventures, and Jackson
Moses routing layer while preserving the distinction among ranking membership,
portfolio listing, investment, procurement, operational effect, and actor
contact.

The current source state is:

```text
company registry rows:                         196
historical company-year rows:                  342
2025 official source rows recovered:           100
2025 deterministic existing-registry matches:   77
2025 identity candidates adjudicated:            23
2025 identity-source routes custodied:             26
2025 identity-source body bytes:            8,754,182
2025 case receipt admissions:                       0
2025 identity promotions:                            0
2025 canonical promotions:                       0
Capital Factory public-portfolio denominator:   837
Capital Factory × NatSec100 co-listings:          12
independently corroborated co-listings:            4
CF-listing-only co-listings:                       8
canonical hop-surface promotions:                 0
```

The 342-row historical company-year file still preserves the original partial
2025 intake. The complete official 100-row transcription, its identity mapping,
and the 23-row adjudication live in separate source-scoped files. This prevents a
recovered source table from silently rewriting the company registry or the
historical intake before explicit promotion.

## Layout

### `seed/` — Capital Factory / Silent Ventures / SVDG seed pass

| file | rows | contents |
|---|---:|---|
| `actors.jsonl` | 80 | seed actor registry using the delivered person, organization, company, and surface IDs |
| `claims.jsonl` | 66 | reviewed subject-predicate-object claims with evidence class, receipt ID, UI weight, and failure modes |
| `conversion_events.jsonl` | 14 | hand-curated myth-to-market conversion candidates |
| `myth_to_market_scores.jsonl` | 3 | scoring pass whose unresolved dimensions remain `insufficient_evidence` |

The seed delivery contained three duplicate actor rows. Byte-identical duplicates
of Hadrian and Firefly Aerospace were removed; the two SVDG rows were merged into
one nonprofit record with the retained alias. No substantive claim was promoted
through that hygiene pass.

### `chunk1/` — roster, receipts, and 2025 source recovery

| file | rows | contents |
|---|---:|---|
| `companies.jsonl` | 196 | alias-reconciled intake company registry |
| `company_years.jsonl` | 342 | historical edition rows: 2023: 100, 2024: 100, 2025: 42 partial, 2026: 100 |
| `receipts.jsonl` | 19 | official reports, edition pages, and bounded corroboration |
| `conversion_events.jsonl` | 367 | edition-inclusion events plus documented exits, filings, methodology change, and held award leads |
| `surfaces.jsonl` | 4 | the 2023 through 2026 ranking editions; roster membership remains non-hop |
| `actors.jsonl` | 12 | receipt-backed operators, sponsors, and methodology partners |
| `roster-2025-official-visual-recovery.jsonl` | 100 | complete rank, reported name, website, and source-page transcription from the official image-rendered table |
| `roster-2025-official-visual-recovery.json` | 1 | recovery denominator, method, hashes, and non-promotion boundary |
| `roster-2025-identity-adjudication.jsonl` | 23 | every source row not resolved by the deterministic registry precheck |
| `roster-2025-identity-adjudication.json` | 1 | exact 77/23 denominator and candidate disposition counts |
| `roster-2025-identity-source-custody.json` | 1 | exact 26-route custody result and zero-admission boundary |

The official 2025 table is now complete at ranks 1 through 100. All 42 prior
partial rows reconcile to it; 15 prior presence-only rows now have official
ranks; 58 source rows were newly recovered. The subsequent adjudication records
19 exact brand-and-domain new-record candidates, two successor-brand candidates,
and two proposed updates to existing registry rows. A separate packet now
retains all 26 cited identity-source routes, comprising 8,754,182 response-body
bytes across 24 terminal hosts. Those records remain candidate-only: source
custody admits no case receipt, company identity, company-year row, or graph
effect by itself.

### `receipts/natsec100-2025-identity-source-custody-20260908/` — exact source custody

The source-custody packet retains all 26 external identity pages cited by the
23-row adjudication. Every route returned HTTP 200 on an allowed final host,
passed TLS verification, used identity or absent content coding, and retained a
content body, sanitized headers, transport record, and TLS leaf certificate. The
packet preserves fourteen server cookie values only as one-way hashes. Its
offline verifier binds the four current recovery and adjudication inputs, the
capture plan, the 256-entry raw-capture manifest, all retained source bodies,
and fourteen adversarial mutations.

This is custody, not admission. The packet assigns no case receipt ID and makes
no registry, company-year, graph, actor-hop, legal-succession, procurement, or
investment finding.

### `chunk2-capital-factory/` — deterministic co-listing pass

The implemented overlap compares 837 public Capital Factory portfolio slugs with
all 196 intake companies and returns 12 co-listings. Four are independently
corroborated; eight retain `cf_listing_only`. Every edge keeps discovery admission
separate from independent corroboration and states that a portfolio-index listing
does not establish equity, routing, coordination, or actor contact.

Run the standing intake regressions with:

```bash
node test/chunk2-capital-factory.test.js
```

That wrapper validates the complete 2025 source recovery, the 23-row identity
adjudication, the 26-route source-custody packet, and the Capital Factory
overlap.

## Current promotion frontier

1. Admit the 26 already-custodied identity source objects into the case receipt
   ledger with stable receipt identifiers and no change to their acquisition
   facts.
2. Apply the supported new company records and two proposed registry amendments
   through a separate explicit promotion.
3. Emit a complete 100-row 2025 company-year edition without deleting or
   rewriting the historical partial intake.
4. Compile the NatSec100 corpus under the common case contract and preserve the
   four ranking editions as dense, non-hop surfaces.
5. Run one explicitly resolved cross-case identity join and one narrated edition
   delta after the second case compiles.

Silent Ventures, Jackson Moses / Silent Capital, DIU, AFWERX, SBIR/STTR, and
USAspending overlap denominators remain outside the Capital Factory pass. Some
related router and award material exists elsewhere in the repository, but it
cannot enter this case by name reuse or subject proximity; it requires its own
identity, receipt, and promotion transition.

## Superseded intake statements

The earlier statements that the 2025 roster was missing 58 companies and that no
overlap had been run describe the July 2026 intake snapshot. The official visual
recovery and Capital Factory overlap supersede those two operational claims. The
historical source files and delta report remain preserved because they record the
actual earlier state and failed retrieval boundary.

## Interpretation boundary

```text
ranking membership proves procurement: false
ranking membership proves operational impact: false
portfolio listing proves equity: false
co-listing proves coordination: false
identity candidate proves legal succession: false
source recovery mutates the registry automatically: false
source custody admits a case receipt automatically: false
promotes_to: candidate_only
graph_effect: none
actor_hop_effect: none
project_completion_claimed: false
```
