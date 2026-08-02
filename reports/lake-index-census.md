# Lake index census

Source fingerprint: `a647e9ba8e1b1a5052261b2aa848b263dab188ab5e0749ad5d87bd9c70f94644`

## The six waterlines

| Waterline | Count | Share of evidence files |
|---|---:|---:|
| Tracked evidence-bearing files physically present | 1571 | 100.0% |
| Reachable from declared authoritative roots | 1571 | 100.0% |
| Reachable from any detected index or manifest | 1571 | 100.0% |
| Reachable from current public entry roots | 430 | 27.4% |
| Exact orphan evidence files with no inbound repository reference | 0 | 0.0% |
| Evidence files with no detected program owner | 0 | 0.0% |

## Object and receipt census

```text
distinct machine-addressable IDs:       26109
local-only identifier values observed:   1280
local-only identifier occurrences:       8199
unindexed machine-addressable IDs:      0
unindexed IDs without topology decision:0
divergent identifier projections:       3438
divergent projections unadjudicated:    68
source IDs without a projection:         5613
source-only IDs unadjudicated:           0
projection IDs without a source object:  0
identifier topology decisions:           10613
generator-contract actions:              411
receipt IDs:                             350
undefined receipt references:            0
unused receipt definitions:              49
receipt locator tokens:                   11
receipt content-hash tokens:              30
inline receipt-use IDs:                   224
program IDs:                             22
case IDs:                                30
case IDs absent from public catalog:      26
report IDs:                              5
```

## Branch-shadow census

```text
open pull requests observed:              48
changed paths across open pull requests:  742
branch-only paths observed:               284
```

Open-PR paths are a shadow inventory only. They are not merged corpus, evidence truth, or publication state.

## Interpretation

This census proves only that every currently tracked path in scope has a deterministic metadata row and that machine-readable references were extracted under the checked-in policy. It does **not** prove that the lake is semantically complete, that every object has been correctly classified, that historical Git objects are indexed, that open-branch content has been adjudicated, or that any claim is true or publication-cleared.

The actionable gap queues are in `build/lake-index-gaps.json`; the complete path inventory is in `build/lake-index.json`; and identifier, receipt, program, case, and report projections are in `build/lake-object-index.json`.

<!-- WAVE19-GENERATOR-CONTRACTS:START -->
## Generator contracts — Wave 19

```text
raw generator actions:       411
open generator actions:      0
active generator contracts:  18
registered variants:         1907
action-to-contract links:    462
review required to decide:   false
graph effect:                none
```

The raw Wave 18 action denominator remains visible. Wave 19 closes those actions through named exact-path and projection-family serialization contracts; it does not force valid cross-family projections into byte equality or infer identity, truth, publication status, or graph semantics.
<!-- WAVE19-GENERATOR-CONTRACTS:END -->
