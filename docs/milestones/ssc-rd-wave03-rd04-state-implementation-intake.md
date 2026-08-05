# SSC RD Wave 03 · RD-04 fifty-state implementation intake

Parent Wave 03: #1013  
Child class issue: #1017  
Class: `RD-04-C02`

## Purpose

This intake freezes the exact source-census operation for the already declared
fifty-state SNAP implementation, waiver, discretionary-exemption, and screening
class. It does not execute acquisition, classify a state-policy field, close the
class, or modify the cumulative residual-denominator ledger.

## Exact denominator

```text
state rows:                         50
state order:                       AL through WY
District of Columbia rows:          0
territorial rows:                   0
required fields per state:          9
required matrix cells:            450
materialized terminal cells:        0
class state:               still_open
```

The historical seed and field matrix are retained byte-for-byte:

```text
seed Git blob:
bf60cadae4d0f586646dd18366431614628adb1e

field-matrix Git blob:
5b2f094adbd860ac3e28161de0bfd00f67b2db8d
```

## Fixed request surface

The request set is frozen before execution:

```text
shared exact official FNS routes:       4
state exact FNS directory routes:      50
state candidate-census routes:        150
                                       ---
fixed routes:                         204

query classes per state:
implementation / waiver / screening

maximum attempts per route:             1
maximum parallel workers:               8
maximum candidate rows per query:      10
maximum candidate rows overall:      1500
result-spawned requests:                 0
```

The four shared exact routes cover the federal state-directory universe, the
state-options report, the cross-state fitness-for-work study, and the current
federal work-requirement surface. Each state then receives one exact FNS
directory request and three separately typed candidate searches.

```text
route-ledger bytes:                  61,068
route-ledger SHA-256:
7b8b6ac12ad73d9d3c0f65ea4fe672ca50e3bdfb24b6abdf6cccfbae9ea40eb6
```

The builder derives those values from the exact route rows. The committed
protocol and product manifest must reproduce them byte-for-byte.

## Reused custody

The intake consumes, without reopening or rewriting:

```text
Wave-03 constitution:
dc47681a9ad43e1c64c86e3d823dbb7c203a18c2

current 9-closed / 33-open Wave-03 ledger:
2374980372d98e7f9ca68fe373d25c9bb812c374

RD-04 Wave-02 terminal version-history merge:
7b21d1f2b0606a5550b9c26fadc0cb465ba88b7e

bounded California remedy acquisition:
346e6881e68f85bbf204911b7915b4d5869efd2d
```

The inherited federal, California, and Wave-02 sources remain source identity
and chronology custody. They are not silently promoted into current state
practice for all fifty rows. California remains one bounded deep-dive state,
not a highest-coverage or national-prevalence finding.

## Execution boundary

The bounded runner preserves every request, response body, header block,
transport result, route receipt, RSS candidate row, execution receipt, summary,
and content-addressed artifact manifest. Candidate rows remain unadmitted and
may not spawn requests in this transaction.

```text
candidate row -> admitted source:                         false
federal rule -> state implementation:                     false
waiver authority -> requested, approved, or current:      false
exemption authority -> observed use:                      false
screening rule -> uniform staff practice:                 false
missing public state record -> no policy or practice:     false
state source census -> person-level outcome:               false
fifty states -> district and territorial denominator:     false
automatic field closure:                                  false
automatic class closure:                                  false
```

A separate adjudication must terminally classify the captured candidate
denominator before any exact-source follow-up or field-level classification.

## Permanent product

The intake product contains eleven permanent paths:

```text
standing read-only workflow:             1
seed and field-matrix custody:           2
fixed protocol and product manifest:     2
closed schema:                           1
deterministic builder:                   1
repository validator:                    1
adversarial suite:                       1
bounded acquisition runner:              1
milestone:                               1
```

No trigger, carrier, controller, raw response artifact, contact, review, or
write-capable permanent workflow belongs in the product.

## Authority ceiling

```text
outside-human dependency:              false
external contacts / reviews:           0 / 0
reviewed-disposition change:           false
unlawful-discrimination finding:       false
racial-hierarchy finding:              false
national-prevalence finding:           false
coordination / common purpose:         false / false
complete-compact finding:              false
publication / adoption / graph:        none / none / none
```

This intake does not change the canonical `33 open / 9 closed` ledger. RD-04-C02
remains open until every one of the 450 declared fields is terminally typed.
