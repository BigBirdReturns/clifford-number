# Lake index census

Source fingerprint: `57b1875c3073af6993cd320566ba835d9d53be68aaebd0e1c1f681f1b890b42a`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1266 | 100.0% |
| Reachable from declared authoritative roots | 340 | 26.9% |
| Reachable from any detected index or manifest | 496 | 39.2% |
| Reachable from current public entry roots | 235 | 18.6% |
| Exact orphan evidence files with no inbound repository reference | 372 | 29.4% |
| Evidence files with no detected program owner | 1096 | 86.6% |

## Object and receipt census

```text
distinct machine-addressable IDs:       11972
unindexed machine-addressable IDs:      10031
divergent identifier projections:       3366
source IDs without a projection:         4854
projection IDs without a source object:  3686
receipt IDs:                             382
undefined receipt references:            41
unused receipt definitions:              50
program IDs:                             15
case IDs:                                27
case IDs absent from public catalog:      23
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              13
changed paths across open pull requests:  123
branch-only paths observed:               102
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
