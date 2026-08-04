# SSC RD-03 Wave 03 — lifecycle and recovery fixed protocol

`RD-03-C05` now has an immutable five-instrument, fifty-five-cell intake design. This surface freezes what may be requested and classified; it does not execute acquisition or close the class.

```text
frozen instruments:                 5
executed/disbursed parent units:    1
conditional pre-close parent units: 4
required fields per instrument:    11
required field cells:              55

exact predeclared routes:           18
fixed candidate-census routes:      25
total routes:                       43
maximum attempts per route:          1
result-spawned requests:             0
acquisition attempts:                0
terminal fields:                     0
class state:                still_open
```

The protocol reuses, without reopening, the terminal `RD-03-C04` negotiated-term receipt and its exact five-instrument membership. Its exact routes preserve the existing official, SEC filing, SEC submission-index, and SEC company-facts planes. Five fixed search terms are applied to each frozen instrument in content-neutral order:

```text
financial close
disbursement
amendment waiver
default cure
repayment recovery
```

Search results are candidate census rows only. No result URL may be followed or admitted by this protocol. Transport success does not establish lifecycle truth, and a failed or unrecovered route does not establish event absence.

The fifty-five field slots preserve these distinctions:

```text
conditional commitment ≠ financial close
financial close ≠ cash disbursement
executed loan ≠ full draw
scheduled interest ≠ observed payment
outstanding obligation ≠ default
maturity ≠ principal repayment
companion equity or warrant ≠ loan recovery
no public record recovered ≠ event absence
five named instruments ≠ complete OSC cohort
```

## Permanent intake-design surface

```text
data/project/ssc-residual-wave03/seeds/RD-03-C05.json
data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/field-matrix-contract.json
data/intake/status-sovereignty-rd-wave03-rd03-lifecycle-recovery/fixed-protocol-package.json
schemas/status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.schema.json
tools/build-status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.mjs
tools/validate-status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.mjs
test/status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.test.js
.github/workflows/status-sovereignty-rd-wave03-rd03-lifecycle-recovery-intake.yml
```

The builder derives the protocol from the immutable Wave-03 constitution, the exact seed and field-matrix contract, the Wave-01 lifecycle object, and the merged Wave-02 RD-03 terminal matrix, receipt, and closure. The validator refuses denominator changes, row substitution, route drift, result-spawned requests, acquisition-state inflation, class closure, and all unsupported authority escalation. The adversarial suite refuses 97 mutations.

## Authority boundary

```text
outside-human dependency:       false
external contacts / reviews:    0 / 0
complete lifecycle observed:    false
public recovery observed:       false
favoritism / extraction:        false / false
coordination / common purpose:  false / false
reviewed-disposition change:    false
publication / adoption / graph: none / none / none
```

The next lawful step is one checksum-bound execution of the forty-three frozen routes, followed by terminal field classification and a separate class-closure decision.
