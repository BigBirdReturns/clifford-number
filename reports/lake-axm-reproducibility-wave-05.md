# AXM Genesis v1 reproducibility Wave 05

Source fingerprint: `4c3c099e3a4d8ee5d61321c9cc0d9e9d91dcfb7557dd79b53353ab0eb191e9fa`

## Result

The pinned Node implementation reproduces the AXM Genesis v1 identity fixture and the pinned Python reference runtime. The current Clifford Number projection is not compatible with Genesis v1: it uses the retired truncated, unversioned scheme. A complete one-to-one migration map now exists, but this wave does not silently rewrite the active IDs or authorize cross-case joins.

```text
external repository:                   BigBirdReturns/axm-genesis
external commit:                       411ef40e6cfc3ecb97ac3e256c8151be678347c8
fixture bytes equal:                   true
Python / Node runtime outputs equal:   true
canonicalization vectors:              20
entity-ID vectors:                     12
claim-ID vectors:                      3
entity migrations mapped:              176
claim migrations mapped:               164
migration map one-to-one:              true
active projection migrated:            false
cross-case join authorized:            false
decisions requiring human permission:  0
```

## Boundary

Reference-runtime parity closes the ambiguity about the target algorithm. It does not mutate the current projection, prove that two labels denote the same real-world entity, establish evidence truth, or create graph edges. The active migration remains a separate append-preserving execution wave.
