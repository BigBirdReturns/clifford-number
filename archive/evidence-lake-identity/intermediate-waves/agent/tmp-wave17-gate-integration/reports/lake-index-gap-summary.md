# Lake index gap summary

Source fingerprint: `7b3756f276fca047849f7adc2ef5a7f68ea823d9c660064c2cea61fbeca0d0db`

## Finding

The current Git tree is physically censused, but the evidence lake is not semantically indexed or known. Of 1367 evidence-bearing files, 0 (0.0%) are not reachable from any detected index, 0 (0.0%) have no inbound repository reference, and 0 (0.0%) have no detected program owner.

## By evidence role

| Role | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| generated_artifact | 581 | 581 | 0 | 0 |
| project_governance | 160 | 160 | 0 | 0 |
| intake | 141 | 141 | 0 | 0 |
| documentation | 123 | 123 | 0 | 0 |
| repository_root | 109 | 109 | 0 | 0 |
| report_product | 101 | 101 | 0 | 0 |
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
| build/core-thesis | 184 | 184 | 0 | 0 |
| data/project | 160 | 160 | 0 | 0 |
| data/intake | 141 | 141 | 0 | 0 |
| reports/core-thesis | 96 | 96 | 0 | 0 |
| docs/milestones | 65 | 65 | 0 | 0 |
| data/research-tracks | 52 | 52 | 0 | 0 |
| data/research | 48 | 48 | 0 | 0 |
| data/estates | 43 | 43 | 0 | 0 |
| cases/arcadia-field-autopsy | 21 | 21 | 0 | 0 |
| receipts/crawl | 19 | 19 | 0 | 0 |
| build/estate-closures | 15 | 15 | 0 | 0 |
| build/lake-actions | 15 | 15 | 0 | 0 |
| data/canonical | 12 | 12 | 0 | 0 |
| build/estate-frontier | 11 | 11 | 0 | 0 |

## First repair queues

### P0 — integrity breaks

```text
parse errors:                   0
undefined receipt references:   0
projection IDs without source:  0
missing repository path tokens: 169
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
not reachable from public roots: 1123
case IDs absent from public catalog: 26
```

### P4 — open branch shadow

| Open PR | Branch-only paths |
|---|---:|
| #386 Make evidence-grounded judgments without a human-permission gate | 18 |
| #405 Execute K0 role-neutral denominator Wave 08 | 18 |
| #403 Measure the production cross-case identity denominator | 16 |
| #450 Enforce status-aware publication allowlist and admit POOF as staged | 13 |
| #404 Recover exact source-bound cross-case mention recurrence | 11 |
| #362 Stage biological Omega control-surface research program | 9 |
| #50 Stage synthetic-population research program | 8 |
| #380 Build root Evidence Desk publication estate from WebsiteIQ audit | 6 |
| #378 Run WebsiteIQ baseline audit before website remediation | 4 |
| #211 Map every case and report membership across the estates | 2 |
| #379 Run corrected WebsiteIQ landing-path audit | 2 |
| #458 Adjudicate the residual evidence-lake frontier | 1 |

### P5 — history and semantics

The current census does not index closed branches, abandoned refs, deleted paths, prior object versions, or the full commit history. It also does not resolve whether repeated identifiers denote the same entity or whether a mechanically detected owner is the correct semantic owner.

## Boundary

Priority is an indexing and integrity queue, not a claim ranking. An orphan can be important, duplicative, obsolete, generated, or intentionally isolated. Each requires a disposition rather than automatic promotion or deletion.
