# Lake index census

Source fingerprint: `bdfeecd002f455467adfc7583e04a96fa4c86109af1c9b5b2740a5f2c53360ba`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1277 | 100.0% |
| Reachable from declared authoritative roots | 1110 | 86.9% |
| Reachable from any detected index or manifest | 1118 | 87.5% |
| Reachable from current public entry roots | 235 | 18.4% |
| Exact orphan evidence files with no inbound repository reference | 124 | 9.7% |
| Evidence files with no detected program owner | 517 | 40.5% |

## Object and receipt census

```text
distinct machine-addressable IDs:       12777
unindexed machine-addressable IDs:      10703
divergent identifier projections:       3405
source IDs without a projection:         4904
projection IDs without a source object:  4351
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
open pull requests observed:              16
changed paths across open pull requests:  235
branch-only paths observed:               131
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
