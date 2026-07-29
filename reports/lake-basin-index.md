# Evidence Lake Basin Index

This report partitions the current tracked lake census into declared semantic basins. It distinguishes canonical sources, research sources, intake, receipts, generated projections, reports, governance history, tooling, and public runtime. Basin assignment is an indexing obligation, not evidence truth or publication clearance.

## Current assignment

```text
source rows:                         1884
semantic basins:                    37
classified without default:         1884
unclassified paths:                 0
evidence-bearing files:             1280
evidence files with registry owner: 1280
evidence files previously unowned:  1280
exact orphan evidence files:        142
gap rows:                           80
```

## Basin waterline

| Basin | Role | Files | Evidence | Index reachable | Exact orphans | Previously unowned | Entrypoints present |
|---|---|---:|---:|---:|---:|---:|---|
| estate-game-trail-products | generated_projection | 313 | 313 | 313 | 0 | 313 | yes |
| core-thesis-build-products | generated_projection | 185 | 185 | 185 | 0 | 185 | yes |
| intake-custody | intake_only | 142 | 142 | 120 | 22 | 142 | yes |
| project-governance | project_governance | 102 | 102 | 101 | 1 | 102 | yes |
| core-thesis-report-products | report_projection | 96 | 96 | 81 | 15 | 96 | yes |
| milestone-governance | governance_history | 65 | 65 | 19 | 46 | 65 | yes |
| documentation | documentation | 58 | 58 | 32 | 26 | 58 | yes |
| research-tracks | research_program_source | 52 | 52 | 25 | 27 | 52 | yes |
| research-records | research_source | 48 | 48 | 48 | 0 | 48 | yes |
| estate-source-data | estate_source | 43 | 43 | 42 | 1 | 43 | yes |
| case-sources | case_source | 36 | 36 | 35 | 1 | 36 | yes |
| receipt-artifacts | receipt_artifact | 32 | 32 | 31 | 1 | 32 | yes |
| general-build-products | generated_projection | 25 | 25 | 25 | 0 | 25 | yes |
| estate-closure-products | generated_projection | 15 | 15 | 15 | 0 | 15 | yes |
| canonical-registries | canonical_registry | 12 | 12 | 12 | 0 | 12 | yes |
| estate-frontier-products | generated_projection | 11 | 11 | 11 | 0 | 11 | yes |
| residual-current-tree | residual_current_tree_path | 51 | 8 | 51 | 0 | 51 | yes |
| crawl-state | crawler_state | 6 | 6 | 5 | 1 | 6 | yes |
| lake-action-products | operational_decision_projection | 6 | 6 | 6 | 0 | 6 | yes |
| briefing-products | report_projection | 5 | 5 | 5 | 0 | 5 | yes |
| canonical-ledgers | canonical_ledger | 5 | 5 | 5 | 0 | 5 | yes |
| case-build-products | generated_projection | 5 | 5 | 5 | 0 | 5 | yes |
| estate-public-products | public_projection | 3 | 3 | 3 | 0 | 3 | yes |
| legacy-history | historical_legacy | 3 | 3 | 2 | 1 | 3 | yes |
| gametrail-public-products | public_projection | 2 | 2 | 2 | 0 | 2 | yes |
| contribution-pipeline | contribution_source_or_template | 1 | 1 | 1 | 0 | 1 | yes |
| general-report-products | report_projection | 1 | 1 | 1 | 0 | 1 | yes |
| toolchain | tooling | 269 | 0 | 205 | 21 | 269 | yes |
| regressions | test_fixture | 149 | 0 | 111 | 6 | 149 | yes |
| automation | automation | 59 | 0 | 28 | 28 | 59 | yes |
| public-runtime | public_runtime | 52 | 0 | 41 | 10 | 52 | yes |
| temporary-transport | temporary_transport | 17 | 0 | 1 | 16 | 17 | yes |
| comprehension-protocol | method_and_fixture | 8 | 0 | 8 | 0 | 8 | yes |
| repository-root-governance | repository_governance | 5 | 0 | 5 | 0 | 5 | yes |
| repository-config | repository_configuration_or_governance | 1 | 0 | 1 | 0 | 1 | yes |
| root-legacy-artifact | legacy_or_configuration_artifact | 1 | 0 | 1 | 0 | 1 | yes |
| unclassified-current-tree | unclassified | 0 | 0 | 0 | 0 | 0 | yes |

## Gap classes

| Gap type | Count |
|---|---:|
| public_reachability_requires_authorization_review | 50 |
| source_record_without_authoritative_reachability | 30 |

## Honest terminal state

```text
current-tree path assignment complete: true
current-tree semantic index complete:   false
historical Git objects indexed:         false
open-PR shadow merged into corpus:       false
independent semantic review complete:    false
```

The registry intentionally preserves missing entrypoints, source-orphan gaps, public-boundary conflicts, and unclassified paths. Generated products remain projections of declared source basins rather than independent evidence.
