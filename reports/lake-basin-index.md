# Evidence Lake Basin Index

This report partitions the current tracked lake census into declared semantic basins. It distinguishes canonical sources, research sources, intake, receipts, generated projections, reports, governance history, tooling, and public runtime. Basin assignment is an indexing obligation, not evidence truth or publication clearance.

## Current assignment

```text
source rows:                         1856
semantic basins:                    30
classified without default:         1794
unclassified paths:                 62
evidence-bearing files:             1266
evidence files with registry owner: 1257
evidence files previously unowned:  1266
exact orphan evidence files:        770
gap rows:                           206
```

## Basin waterline

| Basin | Role | Files | Evidence | Index reachable | Exact orphans | Previously unowned | Entrypoints present |
|---|---|---:|---:|---:|---:|---:|---|
| estate-game-trail-products | generated_projection | 313 | 313 | 35 | 278 | 313 | yes |
| core-thesis-build-products | generated_projection | 184 | 184 | 9 | 175 | 184 | no |
| intake-custody | intake_only | 142 | 142 | 78 | 64 | 142 | yes |
| core-thesis-report-products | report_projection | 96 | 96 | 40 | 56 | 96 | yes |
| project-governance | project_governance | 95 | 95 | 69 | 26 | 95 | yes |
| milestone-governance | governance_history | 65 | 65 | 19 | 46 | 65 | yes |
| documentation | documentation | 58 | 58 | 26 | 32 | 58 | yes |
| research-tracks | research_program_source | 52 | 52 | 12 | 40 | 52 | yes |
| research-records | research_source | 48 | 48 | 48 | 0 | 48 | yes |
| estate-source-data | estate_source | 43 | 43 | 21 | 22 | 43 | yes |
| case-sources | case_source | 36 | 36 | 11 | 25 | 36 | yes |
| receipt-artifacts | receipt_artifact | 32 | 32 | 31 | 1 | 32 | yes |
| general-build-products | generated_projection | 25 | 25 | 25 | 0 | 25 | yes |
| estate-closure-products | generated_projection | 15 | 15 | 15 | 0 | 15 | yes |
| canonical-registries | canonical_registry | 12 | 12 | 12 | 0 | 12 | yes |
| estate-frontier-products | generated_projection | 11 | 11 | 11 | 0 | 11 | yes |
| unclassified-current-tree | unclassified | 62 | 9 | 10 | 45 | 62 | yes |
| crawl-state | crawler_state | 6 | 6 | 5 | 1 | 6 | yes |
| briefing-products | report_projection | 5 | 5 | 3 | 2 | 5 | yes |
| canonical-ledgers | canonical_ledger | 5 | 5 | 5 | 0 | 5 | yes |
| case-build-products | generated_projection | 5 | 5 | 5 | 0 | 5 | yes |
| estate-public-products | public_projection | 3 | 3 | 3 | 0 | 3 | yes |
| legacy-history | historical_legacy | 3 | 3 | 2 | 1 | 3 | yes |
| gametrail-public-products | public_projection | 2 | 2 | 2 | 0 | 2 | yes |
| general-report-products | report_projection | 1 | 1 | 1 | 0 | 1 | yes |
| toolchain | tooling | 261 | 0 | 191 | 21 | 261 | yes |
| regressions | test_fixture | 146 | 0 | 105 | 8 | 146 | yes |
| automation | automation | 73 | 0 | 26 | 44 | 73 | yes |
| public-runtime | public_runtime | 52 | 0 | 39 | 12 | 52 | yes |
| repository-root-governance | repository_governance | 5 | 0 | 5 | 0 | 5 | yes |

## Gap classes

| Gap type | Count |
|---|---:|
| source_record_without_authoritative_reachability | 88 |
| unclassified_path | 62 |
| public_reachability_requires_authorization_review | 55 |
| missing_authoritative_entrypoint | 1 |

## Honest terminal state

```text
current-tree path assignment complete: false
current-tree semantic index complete:   false
historical Git objects indexed:         false
open-PR shadow merged into corpus:       false
independent semantic review complete:    false
```

The registry intentionally preserves missing entrypoints, source-orphan gaps, public-boundary conflicts, and unclassified paths. Generated products remain projections of declared source basins rather than independent evidence.
