# SSC-RD04 acquisition 02 · provisional fifty-state SNAP source-catalogue score

Parent lane: #620
Parent wave: #615
Acquisition issue: #666
Validated parent: PR #660 at `54f0450ef6c238b175e5a217aff5e8253e0d9940`

## Corrected result

The package deterministically scores the recovered official-source catalogue for the frozen fifty-state universe. It does **not** represent the declared per-state searches as independently reproduced because per-query execution and result receipts were not preserved.

```text
states scored from catalogue:          50
score dimensions:                       8
maximum possible score:                16
official-source receipts:              53
fixed search slots declared:          200
query/result receipts preserved:        0
independent search reproduction:       no
selection gate complete:               no
```

The provisional catalogue frontier is:

```text
CA  California   12 / 16
CT  Connecticut  12 / 16
KS  Kansas       12 / 16
KY  Kentucky     12 / 16
WA  Washington   12 / 16
```

The computed set is a five-way tie over the recovered catalogue. California remains a defensible provisional deep-dive state because it belongs to that tied catalogue frontier, not because it receives incumbency weight or wins a substantive tie-breaker. No final highest-coverage state is selected.

## Complete catalogue-score distribution

```text
12  CA CT KS KY WA
 9  CO GA OR
 8  DE MN NM
 7  AZ ID IA MO VA
 6  IL MA MS NV RI TN VT WV
 5  AR FL IN ME MD ND OH OK SC SD TX WI
 4  AL AK HI LA MI MT NE NH NJ NY NC PA UT WY
```

The scores measure the official sources retained in this package. They do not establish that every declared query was executed, and they do not measure policy quality, legal validity, generosity, administrative competence, remedy effectiveness, discrimination, or national representativeness.

## Bounded evidence distinctions

- Every positive dimension score is tied to a source ID with state and dimension scope.
- A zero means no qualifying source is present in the current catalogue, not that no rule, record, remedy, or outcome exists.
- Nevada alone has `D4=2` because an official source preserves a bounded loss-and-restoration episode involving approximately 43,000 people. The episode is not a complete sanction or restoration denominator.
- Seventeen states have `D7=2` from measured FNS state-specific evaluations. Program descriptions alone do not qualify.
- No state has `D8=2`; the common FNS household-characteristics source remains an aggregate baseline.
- The missing per-query logs prevent the catalogue frontier from becoming a completed selection gate.

## Terminal receipt

```text
requires_additional_acquisition
```

The next terminal path is either:

```text
recover and preserve all 200 state-query/result receipts
or
enter a separately reviewed alternative selection protocol that does not rely on unpreserved searches
```

This acquisition closes no residual evidence class and changes no reviewed disposition.

## Authority ceiling

```text
residual classes closed:       0
reviewed dispositions changed: 0
complete-compact findings:     0
racial-order findings:         0
prevalence findings:           0
coordination findings:         0
common-purpose findings:       0
graph effects:                 0
publication effects:           0
```

## Modular exact-byte custody

The fifty-state ledger and 53-source catalogue are retained in ordered, closed shards. The builder recombines those shards, proves the same state universe and provisional five-way catalogue frontier, and emits a compact noindex projection that keeps the open search-custody boundary visible. Sharding changes storage only; it creates no search receipt, selection authority, residual closure, graph effect, or publication effect.
