# Lake index census

Source fingerprint: `bbba27ead67e75dcc8eca04f4e4e689994f2b05553b3e92d090e9bbc12acd4ac`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1293 | 100.0% |
| Reachable from declared authoritative roots | 1141 | 88.2% |
| Reachable from any detected index or manifest | 1149 | 88.9% |
| Reachable from current public entry roots | 235 | 18.2% |
| Exact orphan evidence files with no inbound repository reference | 106 | 8.2% |
| Evidence files with no detected program owner | 533 | 41.2% |

## Object and receipt census

```text
distinct machine-addressable IDs:       12121
local-only identifier values observed:   1131
local-only identifier occurrences:       7863
unindexed machine-addressable IDs:      8841
divergent identifier projections:       1748
source IDs without a projection:         5018
projection IDs without a source object:  1759
receipt IDs:                             350
undefined receipt references:            0
unused receipt definitions:              49
receipt locator tokens:                   11
receipt content-hash tokens:              30
inline receipt-use IDs:                   224
program IDs:                             17
case IDs:                                27
case IDs absent from public catalog:      23
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              18
changed paths across open pull requests:  271
branch-only paths observed:               133
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
