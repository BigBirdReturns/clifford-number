# Lake index census

Source fingerprint: `8abacfca8edb31a588de86b5b54870813991b068a3370309dbfb554778263c0e`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1367 | 100.0% |
| Reachable from declared authoritative roots | 1367 | 100.0% |
| Reachable from any detected index or manifest | 1367 | 100.0% |
| Reachable from current public entry roots | 244 | 17.8% |
| Exact orphan evidence files with no inbound repository reference | 0 | 0.0% |
| Evidence files with no detected program owner | 0 | 0.0% |

## Object and receipt census

```text
distinct machine-addressable IDs:       15381
local-only identifier values observed:   1152
local-only identifier occurrences:       8071
unindexed machine-addressable IDs:      6661
divergent identifier projections:       3129
source IDs without a projection:         5612
projection IDs without a source object:  0
receipt IDs:                             350
undefined receipt references:            0
unused receipt definitions:              49
receipt locator tokens:                   11
receipt content-hash tokens:              30
inline receipt-use IDs:                   224
program IDs:                             18
case IDs:                                30
case IDs absent from public catalog:      26
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              27
changed paths across open pull requests:  445
branch-only paths observed:               91
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
