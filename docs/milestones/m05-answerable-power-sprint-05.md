# M-05 Sprint 05 — audited adoption integrity

## Result

Sprint 05 is complete as a hardened **A0 reference package**, not as an external adoption. A start-to-finish audit reviewed the handoff, merged source records, CLI, builder, validators, tests, generated reports, and exact-head pull-request checks.

```text
legacy package:       apc-adoption-package@1
authoritative package: apc-adoption-package@2
verified ceiling:     A0
external reproduction: not observed
real-person authority: not observed
project complete:      false
```

## Corrected defects

```text
open blockers ignored
boolean-only promotion
incomplete review set
claim/deployment mode mismatch
stale, unsigned, or cross-scope receipts
semantic rather than exact-byte hashes
source-bounded candidate claims without source locators
placeholder registry fingerprint
```

All eight are corrected in v2. No correction supplies the external evidence required for A1.

## Permanent surface

```text
7 adoption levels
7 Sprint 05 legs
18 conformance rejection rules
24 attack classes: 16 machine / 8 human
13 real-person entry-gate sections
12 governance scenarios
7 candidate surfaces with official locators
15 telemetry families
8 constitutional stop thresholds
20 registry fields
12 reconciliation rules
1 exact-byte release manifest
1 start-to-finish audit ledger
```

## Exact boundary

```text
A0 achieved: true
A1–A6 observed: false
works standard met: false
project complete: false
```
