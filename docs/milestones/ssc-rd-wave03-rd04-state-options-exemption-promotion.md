# SSC RD Wave 03 — RD-04 State Options exemption field promotion

This successor applies one exact, retained federal report page to one previously open field in the fifty-state RD-04 matrix. It does not close `RD-04-C02`.

```text
source acquisition workflow:           31055131985
source acquisition artifact:           8949949465
source artifact ZIP SHA-256:            857286d7fe2d89151e83588ccd13938bf3907cc2c880c47dc2eb73a7160a3eaf
retained-byte adjudication workflow:    31055564930
retained-byte adjudication artifact:    8950104341
adjudication artifact ZIP SHA-256:       72db2a9c3b481f59383275f2821cdb4978dd4f257cf0236f309e94214c7f45d1
empirical source requests:              1
additional empirical source requests:  0
result-spawned requests:                0
```

## Exact source observation

The 17th-edition USDA Food and Nutrition Service State Options Report is a 149-page PDF. Printed page 11 / PDF index 12 describes ABAWD discretionary exemptions under Food and Nutrition Act section 6(o)(6) and 7 CFR 273.24(g), using FFY 2024 as its reference period.

```text
fifty-state rows:                        50
reported discretionary-exemption use:   37
reported no use:                         13
excluded non-state agencies:              3
```

The District of Columbia, Guam, and the Virgin Islands remain source agencies but are excluded from the frozen fifty-state denominator.

## Matrix transition

```text
terminal cells before / after:        131 / 181
newly terminalized cells:                   50
still-open cells after:                    269
terminal substantive cells after:           81
still-open substantive cells after:        219
terminal state rows:                      0 / 50
class closed:                              false
```

Only `discretionary_exemption_authority_and_reported_state_practice` changes from `still_open` to `evidence_complete`. Every other substantive cell is byte-preserved. The still-open row-state cell is refreshed only to retain the correct unresolved-field count.

## Authority boundary

FFY 2024 reported use is not current 2026 practice. Reported no use is not proof of never-use. A federal option is not person-level implementation or outcome evidence. The 37/13 split is not promoted into a national prevalence, discrimination, racial-order, coordination, common-purpose, publication, adoption, graph, reviewed-disposition, or complete-compact finding. No outside person is required.
