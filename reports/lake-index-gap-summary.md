# Lake index gap summary

Source fingerprint: `b178819c1100628cf6cd6cc73e5fd384aee4ada28b4229308409d08d0cd2e429`

## Finding

The current Git tree is physically censused, but the evidence lake is not semantically indexed or known. Of 1266 evidence-bearing files, 770 (60.8%) are not reachable from any detected index, 372 (29.4%) have no inbound repository reference, and 1096 (86.6%) have no detected program owner.

## By evidence role

| Role | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| generated_artifact | 556 | 101 | 171 | 549 |
| intake | 141 | 78 | 53 | 127 |
| documentation | 123 | 45 | 55 | 103 |
| repository_root | 109 | 45 | 40 | 109 |
| report_product | 97 | 41 | 24 | 63 |
| project_governance | 95 | 69 | 1 | 13 |
| research_record | 48 | 48 | 0 | 35 |
| case_source | 36 | 11 | 25 | 36 |
| receipt_artifact | 32 | 31 | 1 | 32 |
| canonical_registry | 12 | 12 | 0 | 12 |
| canonical_ledger | 5 | 5 | 0 | 5 |
| estate_projection | 3 | 3 | 0 | 3 |

## By repository cluster

| Cluster | Files | Index-reachable | Exact orphans | No program owner |
|---|---:|---:|---:|---:|
| build/estate-game-trails | 313 | 35 | 0 | 313 |
| build/core-thesis | 184 | 9 | 169 | 178 |
| data/intake | 141 | 78 | 53 | 127 |
| reports/core-thesis | 96 | 40 | 24 | 62 |
| data/project | 95 | 69 | 1 | 13 |
| docs/milestones | 65 | 19 | 37 | 49 |
| data/research-tracks | 52 | 12 | 39 | 52 |
| data/research | 48 | 48 | 0 | 35 |
| data/estates | 43 | 21 | 0 | 43 |
| cases/arcadia-field-autopsy | 21 | 6 | 15 | 21 |
| receipts/crawl | 19 | 19 | 0 | 19 |
| build/estate-closures | 15 | 15 | 0 | 15 |
| data/canonical | 12 | 12 | 0 | 12 |
| build/estate-frontier | 11 | 11 | 0 | 11 |
| receipts/thesis-state-market | 11 | 11 | 0 | 11 |

## First repair queues

### P0 — integrity breaks

```text
parse errors:                   0
undefined receipt references:   41
projection IDs without source:  3686
missing repository path tokens: 71
```

### P1 — exact orphan evidence

| Cluster | Orphan paths |
|---|---:|
| build/core-thesis | 169 |
| data/intake | 53 |
| data/research-tracks | 39 |
| docs/milestones | 37 |
| reports/core-thesis | 24 |
| cases/arcadia-field-autopsy | 15 |
| cases/anduril-access-ownership | 5 |
| cases/field-autopsy-03 | 5 |
| docs/public-site-handoff | 4 |
| build/briefings | 2 |
| contributions/inbox | 1 |
| data/crawl | 1 |
| data/project | 1 |
| docs/anduril-reporter-aperture.md | 1 |
| docs/aperture-kit.md | 1 |

### P2 — unowned evidence

1096 evidence-bearing files have no detected program owner. Ownership here means a declared program ID or an inbound reference from a program-bearing file; it does not mean that every unowned file is erroneous.

### P3 — index and publication gaps

```text
not reachable from any detected index: 770
not reachable from authoritative roots: 926
not reachable from public roots: 1031
case IDs absent from public catalog: 23
```

### P4 — open branch shadow

| Open PR | Branch-only paths |
|---|---:|
| #365 Build M-05 Sprint 08 A1 support lifecycle | 29 |
| #382 Harden release integrity after top-to-bottom adversarial review | 22 |
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
