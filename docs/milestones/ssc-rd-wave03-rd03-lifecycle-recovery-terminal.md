# SSC residual-denominator Wave 03 · RD-03 lifecycle and public-recovery chronology closure

Issue: **#1016**  
Permanent product PR: **#1057**  
Class: **`RD-03-C05`**  
Terminal state: **`bounded_source_restricted`**

## Exact obligation

This transaction closes only the frozen class:

```text
commitment, closing, draw, disbursement, amendment, waiver,
default, cure, repayment, and recovery chronology
```

The denominator remains the same five named Office of Strategic Capital instruments inherited from the parent custody:

```text
OSC-MP-MATERIALS-150M
OSC-VULCAN-620M
OSC-REELEMENT-80M
OSC-PHOENIX-500M
OSC-ENERGY-FUELS-725M
```

They are a bounded five-instrument set, not a complete OSC cohort. Later announcements do not replace, widen, or silently reorder the denominator.

## Executed protocol

The permanent intake merged as `f9327072a4856d514aa2e9f99479a2038f592bf6`. Its fixed protocol predeclared 43 routes:

```text
exact official or regulatory GET routes: 18
fixed candidate-census routes:            25
maximum attempts per route:                1
result-spawned requests:                    0
```

The protocol executed in workflow run `30940153705`. Raw custody is retained in artifact `8904843651`:

```text
artifact ZIP SHA-256:
d4720bd97ff9b8abc15c088b824174ab0314904cc16f8d7420bcd117241a36a5

artifact manifest entries: 348
artifact manifest combined SHA-256:
86a8906c7eb9bebd13a6f8ec1a9101e980cedaadff50dbfa28df8f13a3756b21
```

The permanent capture receipt binds every request identity, response state, body digest, header digest, typed attempt, candidate census, and source receipt.

## Capture result

```text
fixed routes:                 43 / 43
route attempts:               43
transport completions:        43
transport failures:            0

HTTP successes:               31
HTTP 403 restrictions:        12

successful exact endpoints:    6
restricted exact endpoints:   12
candidate-census successes:   25
candidate parse failures:      0

candidate rows:              250
unique candidate URLs:        10
admitted candidate sources:    0
result-spawned requests:        0
```

The six successful exact endpoints were SEC submissions and company-facts APIs for MP Materials, American Resources/ReElement, and Energy Fuels. Those endpoints establish current regulatory-source custody. They are not substituted for the restricted filing bodies and do not constitute complete amendment, payment, default, repayment, or recovery chronologies.

All 250 candidate rows collapsed to ten generic Microsoft or Office service URLs. None was an OSC lifecycle source. No candidate URL was admitted or followed.

## Terminal matrix

The class requires eleven fields for each of five instruments. All 55 cells are materialized and terminally typed:

```text
observed:                    23
conditional_term_only:       4
source_restricted:           28

source_unavailable_after_fixed_protocol: 0
not_publicly_recovered:                  0
not_applicable_by_instrument_state:      0

terminal cells:             55 / 55
terminal instruments:        5 / 5
```

### MP Materials

The parent evidence remains materially different from the four conditional commitments:

```text
executed direct loan:             observed
financial close and execution:    observed
cash proceeds received:           observed
principal:                        $150 million
interest rate:                    5.38% annually
first scheduled cash interest:    2025-10-15
maturity:                         2037-08-01
outstanding at 2025-12-31:        $150 million
outstanding at 2026-03-31:        $150 million
```

The terminal matrix does **not** convert the scheduled interest term into an observed payment. It does not convert the outstanding balance into default, repayment failure, or public recovery. Amendment and waiver, default and cure, actual interest-payment, and principal-repayment chronologies remain `source_restricted` after the fixed protocol.

The wider preferred-stock, warrant, price-protection, and offtake rights remain separate from the OSC loan. They are not counted as loan repayment or public recovery.

### Vulcan, ReElement, Phoenix Tailings, and Energy Fuels

Each remains a distinct conditional pre-close instrument:

```text
conditional commitment ceiling: observed as a conditional term
financial close:                source_restricted
executed agreement:             source_restricted
cash disbursement:              source_restricted
amendment or waiver:            source_restricted
default, cure, or enforcement:  source_restricted
interest-payment chronology:    source_restricted
principal-repayment chronology: source_restricted
```

The terminal public state is `conditional_commitment_exposure_unresolved`. That is not a claim that the financing never closed, funded, paid, defaulted, cured, repaid, or recovered. Phoenix Tailings' exact governing date also remains source-restricted rather than invented.

## Why the class closes as bounded source restriction

The fixed protocol is complete. Every predeclared route received one typed attempt. The twelve primary official or filing pages were HTTP-restricted; the six successful regulatory APIs and the zero-admission candidate census did not recover substitute lifecycle evidence. Every required field therefore has a terminal evidentiary state even though the underlying real-world chronology is not asserted to be complete.

This closure means:

```text
bounded acquisition obligation complete: yes
all 55 fields terminally typed:           yes
class RD-03-C05 closed:                   yes
underlying event absence established:     no
complete OSC cohort established:          no
public recovery established:              no
```

## Residual-denominator effect

The prior Wave-03 closure is `RD-01-C06`, which moved the residual atlas from six closed classes to seven. Promotion of this class has the following narrow accounting effect:

```text
canonical residual classes: 42
closed before:               7
open before:                35
closed after:                8
open after:                 34

Wave-03 selected attempts terminal after promotion: 2 / 6
Wave-03 complete:                              false
```

This does not close RD-02, RD-04, RD-05, or RD-06 and does not complete the wave.

## Authority ceiling

```text
outside-human dependency:       false
external contacts:              0
external reviews:               0
reviewed disposition changed:   false
favoritism finding:             false
extraction finding:             false
public-recovery finding:        false
coordination finding:           false
common-purpose finding:         false
publication effect:             none
adoption effect:                none
graph effect:                   none
```

No borrower, agency, outside reviewer, or physical-world action is required. Public-record limits are carried as terminal source restrictions rather than converted into a human gate or a substantive allegation.

## Permanent product

```text
data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/capture-execution-receipt.json
data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/terminal-field-matrix.json
data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/summary.json
data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/class-receipt.json
data/research/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/manifest.json
data/project/ssc-residual-wave03/closures/RD-03-C05.json
schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery.schema.json
tools/build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs
tools/validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery.mjs
test/status-sovereignty-rd-wave03-rd03-lifecycle-recovery.test.js
docs/milestones/ssc-rd-wave03-rd03-lifecycle-recovery-terminal.md
.github/workflows/status-sovereignty-rd-wave03-rd03-lifecycle-recovery.yml
```

The builder deterministically reconstructs the terminal matrix, summary, class receipt, exact-byte product manifest, closure reference, and closed schema. The repository validator checks capture custody, route identities, state arithmetic, parent bindings, manifest bytes, residual-atlas arithmetic, and authority ceilings. The adversarial suite refuses mutations across all 43 route receipts, every one of the 55 terminal cells, and every permanent closure surface.
