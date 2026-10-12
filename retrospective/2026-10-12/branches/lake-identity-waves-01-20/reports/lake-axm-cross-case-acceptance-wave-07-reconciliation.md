# AXM cross-case acceptance Wave 07 reconciliation

Source fingerprint: `ee0623595f3cc4dd8dbfa7b1e2094e280e994453f875306525db720291fa6eea`

## Result

```text
authorized scope:                            explicit_source_custodied_graph_inert_identity_resolution_only
fixture cases:                               3
accepted explicit assertions:                1
rejected assertions:                         4
unasserted overlap controls:                 1
temporal claim controls:                     2
hop positive-control edges:                  1
hop rejected surfaces:                       2
hop rejected temporal pairs:                 1
decision registry rows:                      9
decision projection rows:                    9
decision IDs source/projection/indexed:      9
source controls authoritative-reachable:     true
generated decision projection indexed:       true
explicit identity resolution authorized:     true
automatic cross-case join authorized:        false
cross-case graph join authorized:            false
cross-case hop creation authorized:          false
active broad join flag:                      false
synthetic bridge tokens in active hop graph: 0
decisions requiring human permission:        0
```

## Judgment

The fixture closes one narrow acceptance gate. A production identity bridge may be recorded only when an explicit same-entity assertion, source custody on both local records, assertion custody, a shared identity namespace, and an unambiguous token overlap are all present. The bridge remains graph-inert and reversible.

## Boundary

No automatic same-label or alias join is authorized. No source entity is merged. No relationship, graph edge, or hop is created. The synthetic fixture is not evidence about any real person or institution.
