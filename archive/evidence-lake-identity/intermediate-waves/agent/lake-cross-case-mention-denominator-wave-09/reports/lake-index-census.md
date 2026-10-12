# Lake index census

Source fingerprint: `9a962d022fe8ee4512ba803757f295498d3b8db42104fe6ab3a46938bad496b3`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1310 | 100.0% |
| Reachable from declared authoritative roots | 1155 | 88.2% |
| Reachable from any detected index or manifest | 1163 | 88.8% |
| Reachable from current public entry roots | 241 | 18.4% |
| Exact orphan evidence files with no inbound repository reference | 106 | 8.1% |
| Evidence files with no detected program owner | 551 | 42.1% |

## Object and receipt census

```text
distinct machine-addressable IDs:       13498
local-only identifier values observed:   1131
local-only identifier occurrences:       7863
unindexed machine-addressable IDs:      8206
divergent identifier projections:       1751
source IDs without a projection:         6026
projection IDs without a source object:  1403
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
open pull requests observed:              27
changed paths across open pull requests:  394
branch-only paths observed:               180
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.
