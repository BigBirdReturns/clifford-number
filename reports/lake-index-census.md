# Lake index census

Source fingerprint: `678a9fe9552e21b480ed32e5501d3621a6ef6ecd7c5f87939685f9a1738de1d8`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1373 | 100.0% |
| Reachable from declared authoritative roots | 1373 | 100.0% |
| Reachable from any detected index or manifest | 1373 | 100.0% |
| Reachable from current public entry roots | 244 | 17.8% |
| Exact orphan evidence files with no inbound repository reference | 0 | 0.0% |
| Evidence files with no detected program owner | 0 | 0.0% |

## Object and receipt census

```text
distinct machine-addressable IDs:       25994
local-only identifier values observed:   1152
local-only identifier occurrences:       8071
unindexed machine-addressable IDs:      0
unindexed IDs without topology decision:0
divergent identifier projections:       3370
divergent projections unadjudicated:    0
source IDs without a projection:         5612
source-only IDs unadjudicated:           0
projection IDs without a source object:  0
identifier topology decisions:           10612
generator-contract actions:              411
receipt IDs:                             350
undefined receipt references:            0
unused receipt definitions:              49
receipt locator tokens:                   11
receipt content-hash tokens:              30
inline receipt-use IDs:                   224
program IDs:                             19
case IDs:                                30
case IDs absent from public catalog:      26
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              28
changed paths across open pull requests:  452
branch-only paths observed:               84
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
