# AXM cross-case acceptance Wave 07

Source fingerprint: `67e4912fa381a3ebd2dd9964cd428049396a16e7562053b8806acccb54cd2488`

## Result

The synthetic fixture authorizes one narrow operation: an explicit, source-custodied, unambiguous, same-namespace identity assertion may produce a graph-inert identity bridge. Same-label recurrence, alias recurrence, namespace mismatch, ambiguity, missing custody, temporal overlap, and bounded-surface overlap do not independently authorize a graph relation or hop.

```text
fixture cases:                                 3
join assertions:                              5
accepted explicit assertions:                  1
rejected assertions:                           4
unasserted same-label controls:                1
temporal claim controls:                       2
hop positive-control edges:                    1
hop rejected surfaces:                         2
hop rejected temporal pairs:                   1
decision registry rows:                        9
decision projection rows:                      9
explicit identity resolution authorized:       true
automatic cross-case join authorized:          false
cross-case graph join authorized:              false
cross-case hop creation authorized:            false
active projection broad join flag:             false
decisions requiring human permission:          0
```

## Authorized scope

`explicit_source_custodied_graph_inert_identity_resolution_only`

The accepted bridge does not merge source entities. It records a reversible identity-resolution decision with both source-custody records and the assertion custody. Every rejected control remains in the same registry and generated decision index.

## Boundary

This synthetic acceptance result does not prove any real-world identity or relationship. Production rows must independently satisfy the same custody, namespace, explicit-assertion, and unambiguous-token requirements. Automatic same-label joins and all graph/hop creation remain disabled.
