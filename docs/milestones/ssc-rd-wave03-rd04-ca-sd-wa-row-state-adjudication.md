# SSC RD Wave 03 · RD-04 California, South Dakota, and Washington row-state adjudication

This transaction terminalizes only the row-level public-record obligation for the three state rows whose eight evidence-bearing fields were already terminal in canonical PR #1252.

```text
predecessor capture-adjudication PR:   #1252
predecessor product commit:            888c75054dd8d082150e1883c44d2239597065f5
predecessor product tree:              1664393f0f054e6749096893f315bbafdf08dff5
predecessor merge commit:              fc4864a32b9469313c18095e86192716a4fa1b6e
predecessor matrix SHA-256:
c31824ea077386bec92083de33c58dd39c08196abce928cfa6a388682a23f4cd
```

## Exact transition

```text
target rows:                          CA / SD / WA
evidence-bearing fields terminal:     8 / 8 per row
row-state cells before:               0 terminal / 3 open
row-state cells after:                3 terminal / 0 open

terminal cells before / after:        187 / 190
still-open cells after:               260
terminal substantive fields after:     87
still-open substantive fields after:  213
terminal state rows after:              3 / 50
class closed:                         false
cumulative-ledger effect:             none
```

Each row is classified `terminal_fixed_public_record_obligation_complete`. This means the declared fixed public-record obligation for that state row has terminal source or typed-gap custody. It does not mean that every underlying policy, practice, implementation act, waiver event, exemption use, staff decision, or person-level outcome is publicly known.

No evidence-bearing field is changed. The product copies all eight predecessor fields byte-for-byte and terminalizes only `field_and_row_terminal_state`.

## Refused inferences

```text
row completion
≠ complete state implementation truth

typed source gap
≠ event, policy, practice, or implementation absence

three terminal state rows
≠ national prevalence
≠ discrimination or racial order
≠ coordination or common purpose
≠ complete compact
≠ RD-04-C02 closure
```

```text
outside-human dependency:             false
external contacts / reviews:          0 / 0
reviewed-disposition changes:          0
publication / adoption / graph:       none / none / none
```

The next bounded operation remains acquisition and adjudication of the 213 open substantive state fields, followed by row-state terminalization only when another row reaches eight terminal evidence-bearing fields.
