# Project stable-ground supersession · SG-2026-07-29-02

## Purpose

Preserve `SG-2026-07-29-01` as the historical pre-DCA checkpoint and append a successor after `DCA-H01` became a canonical AT-2 field-hypothesis object.

```text
SG-2026-07-29-01
  merge c810cc741b23062b7eb3d026a46404e138e93eda
  DCA named but noncanonical

SG-2026-07-29-02
  triggered by af26b797ded7e11fc102f0935f71a9282e976090
  DCA object canonical; prevalence execution still zero
```

## What changed

Only the project-state authority ledger changed:

- `DCA-H01` is now canonical at AT-2;
- its five mechanisms, twelve strata, twelve frozen queries, controls, alternatives, falsifiers, schema, report, and release custody exist on `main`;
- six execution waves are open;
- no DCA query has been role-neutrally executed;
- no prevalence, actor edge, motive, coordination, common-purpose, publication, field, or adoption result exists.

## What did not change

```text
K0 query battery:                   8 / 9
M-05 canonical story count:            14
last canonical story:             M05-S14
M05-S15:                       reserved by PR #410
external reproduction receipts:         0
A1 registry entries:                     0
A3/A4/A5 observations:              0/0/0
maximum verified adoption:              A0
real-person pilot authorized:        false
works standard met:                  false
project complete:                    false
```

## Fan-out state

```text
FAN-01  PR #410             POOF/main reconciliation
FAN-02  PR #405             K0-Q02 completion
FAN-03  DCA-H01/#422-#427   canonical protocol; execution zero
FAN-04  PR #382             publication safety
FAN-05  PR #386/lake stack  branch shadow
FAN-06  #360/#364/#411-414  external zero-state campaign
```

## Authority boundary

```text
canonical DCA object ≠ supported DCA prevalence
open wave issues ≠ query execution
seed-control recovery ≠ role-neutral denominator
same mechanism ≠ communication or coordination
successful control ≠ universal transfer
checkpoint ≠ empirical truth
```

## Change control

The next successor is required when any of the following becomes canonical:

- PR #410 changes M-05 story or lane counts;
- PR #405 completes K0-Q02;
- a DCA wave records executed queries or terminal zero results;
- publication safety or lake state changes;
- external adoption exceeds A0;
- the works standard changes.

Corrections remain append-preserving supersessions. SG-01 is not rewritten.
