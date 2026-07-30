# Lake index census

Source fingerprint: `2e902a5d96b84f86b86b6d353966bdad8e721ceabfd93ffeb8cffb8592ae279c`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1352 | 100.0% |
| Reachable from declared authoritative roots | 1198 | 88.6% |
| Reachable from any detected index or manifest | 1206 | 89.2% |
| Reachable from current public entry roots | 242 | 17.9% |
| Exact orphan evidence files with no inbound repository reference | 106 | 7.8% |
| Evidence files with no detected program owner | 593 | 43.9% |

## Object and receipt census

```text
distinct machine-addressable IDs:       15222
local-only identifier values observed:   1152
local-only identifier occurrences:       8072
unindexed machine-addressable IDs:      8198
divergent identifier projections:       2977
source IDs without a projection:         5612
projection IDs without a source object:  1967
receipt IDs:                             350
undefined receipt references:            0
unused receipt definitions:              49
receipt locator tokens:                   11
receipt content-hash tokens:              30
inline receipt-use IDs:                   224
program IDs:                             17
case IDs:                                30
case IDs absent from public catalog:      26
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              33
changed paths across open pull requests:  539
branch-only paths observed:               183
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
