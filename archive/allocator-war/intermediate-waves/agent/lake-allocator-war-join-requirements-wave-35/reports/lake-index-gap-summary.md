# Lake index gap summary

Source fingerprint: `a647e9ba8e1b1a5052261b2aa848b263dab188ab5e0749ad5d87bd9c70f94644`

## Finding

The current Git tree is physically censused, but the evidence lake is not semantically indexed or known. Of 1571 evidence-bearing files, 0 (0.0%) are not reachable from any detected index, 0 (0.0%) have no inbound repository reference, and 0 (0.0%) have no detected program owner.

## By evidence role

| Role | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| generated_artifact | 605 | 605 | 0 | 0 |
| repository_root | 201 | 201 | 0 | 0 |
| project_governance | 197 | 197 | 0 | 0 |
| documentation | 155 | 155 | 0 | 0 |
| intake | 141 | 141 | 0 | 0 |
| report_product | 120 | 120 | 0 | 0 |
| research_record | 48 | 48 | 0 | 0 |
| case_source | 43 | 43 | 0 | 0 |
| receipt_artifact | 32 | 32 | 0 | 0 |
| canonical_registry | 12 | 12 | 0 | 0 |
| canonical_ledger | 5 | 5 | 0 | 0 |
| estate_projection | 3 | 3 | 0 | 0 |

## By repository cluster

| Cluster | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| build/estate-game-trails | 313 | 313 | 0 | 0 |
| data/project | 197 | 197 | 0 | 0 |
| build/core-thesis | 184 | 184 | 0 | 0 |
| data/intake | 141 | 141 | 0 | 0 |
| reports/core-thesis | 96 | 96 | 0 | 0 |
| data/acquisition | 92 | 92 | 0 | 0 |
| docs/milestones | 81 | 81 | 0 | 0 |
| data/research-tracks | 52 | 52 | 0 | 0 |
| data/research | 48 | 48 | 0 | 0 |
| data/estates | 43 | 43 | 0 | 0 |
| build/lake-actions | 39 | 39 | 0 | 0 |
| docs/methods | 25 | 25 | 0 | 0 |
| cases/arcadia-field-autopsy | 21 | 21 | 0 | 0 |
| receipts/crawl | 19 | 19 | 0 | 0 |
| build/estate-closures | 15 | 15 | 0 | 0 |

## First repair queues

### P0 — integrity breaks

```text
parse errors:                   0
undefined receipt references:   0
projection IDs without source:  0
missing repository path tokens: 202
```

### P1 — exact orphan evidence

| Cluster | Orphan paths |
|---|---:|


### P2 — unowned evidence

0 evidence-bearing files have no detected program owner. Ownership here means a declared program ID or an inbound reference from a program-bearing file; it does not mean that every unowned file is erroneous.

### P3 — index and publication gaps

```text
not reachable from any detected index: 0
not reachable from authoritative roots: 0
not reachable from public roots: 1141
case IDs absent from public catalog: 26
```

### P4 — open branch shadow

| Open PR | Branch-only paths |
|---|---:|
| #672 SSC-RD04 A02: complete neutral fifty-state SNAP source-availability score | 70 |
| #488 Converge production publication and preserve pre-assemblage origins | 25 |
| #660 SSC: reconcile and validate residual-denominator Wave 01 | 24 |
| #493 Temporary SG-06 historical carrier export | 21 |
| #491 Temporary final SG-06 export | 20 |
| #386 Make evidence-grounded judgments without a human-permission gate | 18 |
| #494 Temporary PR 484 exact-head export | 18 |
| #490 Temporary current SG-06 transport export | 17 |
| #403 Measure the production cross-case identity denominator | 16 |
| #487 Temporary PR 483 bundle export | 14 |
| #404 Recover exact source-bound cross-case mention recurrence | 11 |
| #362 Stage biological Omega control-surface research program | 9 |
| #527 Execute Counter-Selector Wave 08 Batch 02 blind review | 9 |
| #680 Seal PC-14 provenance attack and recovery custody | 9 |
| #50 Stage synthetic-population research program | 8 |
| #675 TEMP: execute SSC RD-04 A02 materializer | 8 |
| #664 Seal complete matched synthetic-human study admission | 7 |
| #380 Build root Evidence Desk publication estate from WebsiteIQ audit | 6 |
| #679 Seed Counter-Selector Wave 26 observability pivot | 5 |
| #378 Run WebsiteIQ baseline audit before website remediation | 4 |

### P5 — history and semantics

The current census does not index closed branches, abandoned refs, deleted paths, prior object versions, or the full commit history. It also does not resolve whether repeated identifiers denote the same entity or whether a mechanically detected owner is the correct semantic owner.

## Boundary

Priority is an indexing and integrity queue, not a claim ranking. An orphan can be important, duplicative, obsolete, generated, or intentionally isolated. Each requires a disposition rather than automatic promotion or deletion.
