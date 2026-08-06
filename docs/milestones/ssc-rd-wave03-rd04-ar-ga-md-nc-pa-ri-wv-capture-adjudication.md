# SSC RD Wave 03 — RD-04 seven-state minimum-frontier capture adjudication

This product terminally adjudicates the bounded thirty-route capture produced by the canonical RD-04 minimum-frontier protocol for Arkansas, Georgia, Maryland, North Carolina, Pennsylvania, Rhode Island, and West Virginia.

## Canonical custody

```text
RD-04 issue                                      #1017
Wave-03 issue                                    #1013
canonical predecessor merge
9d9f9522fbc2909611033370044e9748a29b3cf7
canonical predecessor product
 ec8a45f4acd2c8f1c1b6a40837fb46373f7670a4
canonical predecessor tree
104a107946636f86a3a56dec8f243063a80329b9
predecessor matrix SHA-256
6df9c4a1c4f46debe339c9997c11124f0308cea6e57decac6f75cd9111468375

minimum-frontier protocol PR                         #1263
minimum-frontier protocol merge
e3cf2a53d5209557183a340752df83d38ab83994
minimum-frontier protocol product
4155cdb9f35802e76e754151fbf6f8c6f9145ef0

capture trigger PR                                  #1265
capture trigger head
5a484cbb1f364486978aab8027a678549204959e
capture workflow run                          31088884667
capture artifact                                  8962608866
capture artifact ZIP SHA-256
ee4f043f536778c151030c0ad206669afd84d4a8db3f01930c1b9fcac33d2ad6
```

The trigger was never merged. The artifact contains one terminal receipt for every frozen route and no result-spawned request.

## Route adjudication

```text
fixed routes                                      30
terminal route adjudications                      30
terminal source admissions                        22
content-insufficient routes                        2
HTTP non-success routes                            2
disallowed-final-host routes                       2
other transport-failure routes                     2
result-spawned requests                            0
```

A route admission establishes only that the captured official response can support the exact target cells named in its custody record. It does not automatically classify a field, terminalize a row, close RD-04-C02, establish national prevalence, or create a graph edge.

The four captured PDF state plans for Georgia, Maryland, Rhode Island, and West Virginia received bounded visual review of selected pages. The review confirms only the cited form fields, checked boxes, tables, and approval markers. It does not retain contact details or extend a claim beyond the selected pages.

## Field adjudication

The protocol froze three predecessor-open substantive fields for each state:

1. operative state implementation authority and version;
2. ABAWD or work-requirement waiver state and governing period; and
3. verification evidence and staff-discretion surface.

The adjudication produces:

```text
target substantive cells                          21
observed terminal decisions                       14
not-publicly-recovered terminal decisions          7
row-state decisions                                0
class closures                                      0
```

Each state receives an observed authority decision and an observed verification/discretion decision. Each state’s waiver cell is terminally classified `not_publicly_recovered`: the fixed corpus did not recover a current FNS-approved waiver instrument with complete covered geography and governing start and end dates. A planning estimate, general statement that waivers exist, failed route, or absent response is not converted into a no-waiver finding.

The bounded state findings are:

- **Arkansas:** current DHS SNAP time-limit pages and work-hour/good-cause evidence surface observed; complete current waiver instrument and period not recovered.
- **Georgia:** current DFCS ABAWD period and November 2025 implementation surface observed; eligibility screening, Georgia Gateway documentation, and good-cause determination surface observed; complete current waiver instrument and period not recovered.
- **Maryland:** current SNAP Manual sections 106 and 408, November 2025 implementation, verification, and E&E good-cause surface observed; complete current waiver instrument and period not recovered.
- **North Carolina:** current FNS 260/265 policy surface and December 2025 implementation observed; caseworker screening, ten-day verification, alternative evidence, and good-cause surface observed; complete current waiver instrument and period not recovered.
- **Pennsylvania:** current DHS work/reporting toolkit and staged 2025 implementation observed; renewal verification and COMPASS document-upload surface observed; complete current waiver instrument and period not recovered.
- **Rhode Island:** current March 2026 requirements, form revisions, verification checklist, case-file documentation, and provider-determination surface observed; complete current waiver instrument and period not recovered.
- **West Virginia:** approved FFY 2026 plan and Income Maintenance Manual authority surface observed; eligibility-worker good-cause, ten-day verification, provider-determination, and system-verification surface observed; complete current waiver instrument and period not recovered.

These are bounded official-record observations, not findings of uniform frontline execution or person-level outcomes.

## Canonical matrix transition

```text
terminal cells before                         190 / 450
newly terminalized substantive cells           21 / 21
terminal cells after                          211 / 450
still-open cells after                        239 / 450
terminal substantive cells after              108 / 300
still-open substantive cells after            192 / 300
terminal state rows after                        3 / 50
open state rows after                           47 / 50
rows ready for separate row-state step           7
terminal units after                              3
RD-04-C02 closed                              false
```

The seven derivative row-state cells remain open. Each target row is exactly eight-of-nine terminal and carries the typed gap `row_remains_open_pending_separate_row_state_adjudication_after_8_of_9_required_fields_terminal`. A separate deterministic transaction may adjudicate those seven cells. This product is not authorized to do so.

## Qualification and authority ceiling

The package is deterministic and self-checking:

```text
permanent paths                                  18
permanent data files                             12
closed-schema JSON objects                       11
adversarial mutations refused                   663
outside-human dependency                      false
external contacts / reviews                   0 / 0
cumulative-ledger effect                       none
publication / adoption / graph          none / none / none
```

No national-prevalence, discrimination, racial-order, coordination, common-purpose, or complete-compact finding is created. No stranger, external reviewer, or physical action is required for the next bounded operation.
