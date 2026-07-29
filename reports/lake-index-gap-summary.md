# Lake index gap summary

Source fingerprint: `9bcc66912dbf59461db1cd62034722643e59094b39d6504de88334032442ff9b`

## Finding

The current Git tree is physically censused, but the evidence lake is not semantically indexed or known. Of 1320 evidence-bearing files, 146 (11.1%) are not reachable from any detected index, 106 (8.0%) have no inbound repository reference, and 561 (42.5%) have no detected program owner.

## By evidence role

| Role | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| generated_artifact | 565 | 565 | 0 | 65 |
| intake | 141 | 120 | 19 | 107 |
| project_governance | 132 | 127 | 0 | 39 |
| documentation | 123 | 51 | 55 | 101 |
| repository_root | 109 | 80 | 28 | 61 |
| report_product | 98 | 83 | 0 | 61 |
| research_record | 48 | 48 | 0 | 31 |
| case_source | 43 | 42 | 1 | 40 |
| receipt_artifact | 32 | 31 | 1 | 32 |
| canonical_registry | 12 | 12 | 0 | 12 |
| canonical_ledger | 5 | 5 | 0 | 2 |
| estate_projection | 3 | 3 | 0 | 3 |

## By repository cluster

| Cluster | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| build/estate-game-trails | 313 | 313 | 0 | 5 |
| build/core-thesis | 184 | 184 | 0 | 0 |
| data/intake | 141 | 120 | 19 | 107 |
| data/project | 132 | 127 | 0 | 39 |
| reports/core-thesis | 96 | 81 | 0 | 59 |
| docs/milestones | 65 | 19 | 37 | 49 |
| data/research-tracks | 52 | 25 | 27 | 42 |
| data/research | 48 | 48 | 0 | 31 |
| data/estates | 43 | 42 | 0 | 5 |
| cases/arcadia-field-autopsy | 21 | 20 | 1 | 20 |
| receipts/crawl | 19 | 19 | 0 | 19 |
| build/estate-closures | 15 | 15 | 0 | 15 |
| data/canonical | 12 | 12 | 0 | 12 |
| build/estate-frontier | 11 | 11 | 0 | 11 |
| receipts/thesis-state-market | 11 | 11 | 0 | 11 |

## First repair queues

### P0 — integrity breaks

```text
parse errors:                   0
undefined receipt references:   0
projection IDs without source:  1403
missing repository path tokens: 150
```

### P1 — exact orphan evidence

| Cluster | Orphan paths |
|---|---:|
| docs/milestones | 37 |
| data/research-tracks | 27 |
| data/intake | 19 |
| docs/public-site-handoff | 4 |
| cases/arcadia-field-autopsy | 1 |
| contributions/inbox | 1 |
| data/crawl | 1 |
| docs/anduril-reporter-aperture.md | 1 |
| docs/aperture-kit.md | 1 |
| docs/clifford-thiel-trump-wrap-up.md | 1 |
| docs/consumption-contract.md | 1 |
| docs/corpus-selection.md | 1 |
| docs/design-system.md | 1 |
| docs/edge-schema.md | 1 |
| docs/field-autopsy.md | 1 |

### P2 — unowned evidence

561 evidence-bearing files have no detected program owner. Ownership here means a declared program ID or an inbound reference from a program-bearing file; it does not mean that every unowned file is erroneous.

### P3 — index and publication gaps

```text
not reachable from any detected index: 146
not reachable from authoritative roots: 154
not reachable from public roots: 1080
case IDs absent from public catalog: 26
```

### P4 — open branch shadow

| Open PR | Branch-only paths |
|---|---:|
| #365 Build M-05 Sprint 08 A1 support lifecycle | 29 |
| #382 Harden release integrity after top-to-bottom adversarial review | 22 |
| #386 Make evidence-grounded judgments without a human-permission gate | 18 |
| #245 Close the seven M-04F vertical joins | 9 |
| #362 Stage biological Omega control-surface research program | 9 |
| #50 Stage synthetic-population research program | 8 |
| #28 Add Phase-0 Dialog comprehension harness | 7 |
| #380 Build root Evidence Desk publication estate from WebsiteIQ audit | 6 |
| #378 Run WebsiteIQ baseline audit before website remediation | 4 |
| #198 Execute M-04B decisive acquisition wave 02 | 3 |
| #211 Map every case and report membership across the estates | 2 |
| #379 Run corrected WebsiteIQ landing-path audit | 2 |
| #356 Reconcile the observed M-04G source ecology v2 orbit | 1 |

### P5 — history and semantics

The current census does not index closed branches, abandoned refs, deleted paths, prior object versions, or the full commit history. It also does not resolve whether repeated identifiers denote the same entity or whether a mechanically detected owner is the correct semantic owner.

## Boundary

Priority is an indexing and integrity queue, not a claim ranking. An orphan can be important, duplicative, obsolete, generated, or intentionally isolated. Each requires a disposition rather than automatic promotion or deletion.
