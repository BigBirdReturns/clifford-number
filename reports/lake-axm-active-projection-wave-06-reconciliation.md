# AXM active projection Wave 06 reconciliation

Source fingerprint: `ea1d2eeed49184343df162a0adc8c1a7726fa3f10cf2f3e9377362ba6d7ac222`

## Result

```text
active scheme:                              reconciled_genesis_v1
active version:                             axm-genesis-v1
external commit:                            411ef40e6cfc3ecb97ac3e256c8151be678347c8
entity IDs activated:                       176
alias IDs activated:                        21
claim IDs activated:                        164
registry rows:                              340
legacy entity tokens resolved:              197
legacy claim tokens mapped:                 164
temporal payload changes:                   0
evidence payload changes:                   0
local identifier changes:                   0
hop-graph identity fields:                  0
active projection migrated:                 true
active projection quarantined:              false
external AXM gate complete:                 true
cross-case join authorized:              false
decisions requiring human permission:       0
```

## Judgment

The active identity projection now uses the exact Genesis v1 successors proved in Wave 05. Every retired identifier remains attached to the same local object or claim as an explicit predecessor. Temporal and evidence payloads are unchanged, and identity fields remain absent from the hop graph.

## Boundary

This closes the external reproducibility and active-projection migration gate. It does not establish real-world identity, merge same-label records, change any graph edge, or authorize cross-case joins. A separate multi-case acceptance fixture remains required.
