# SSC RD-04 A07 · Public compliance, issuance, and restoration receipt census

Issue: #741  
Parent lane: #620  
Parent wave: #615  
Completed parent: A06 issue #721 and PR #732  
Frozen base: `d1597233110715e58e76e3b50b6792c226d9f7e8`

## Purpose

A07 executes A06’s nonblocking handoff without reopening the CalFresh Decision Registry denominator and without contacting claimants, representatives, counties, agencies, reviewers, or any other outside participant.

The object is not another favorable-decision sample. It asks whether the frozen public universe contains a **separate official receipt** for county compliance, implementation, benefit issuance, restoration amount, restoration date, State Hearings Division approval or correction, or residual harm.

```text
legal duty to comply
≠ submitted compliance report
≠ SHD approval of compliance
≠ actual benefit issuance
≠ complete restoration
≠ timely material recovery
```

## Frozen parent denominator

```text
A06 interval:                       07/01/2025–06/30/2026
registry rows:                      12,282
unique registryId values:           12,282
unique current decision documents:  11,672
exact PDF documents:                11,672
exact text documents:               11,672
missing or non-PDF documents:            0
row-to-document links:              12,282
shared-document groups:                530
maximum rows per document:                7
content-neutral parent shards:             64
```

Every A06 row and document remains in scope. A07 may not select a disposition, county, claimant, issue, order, amount, or narrative because it appears favorable, provocative, famous, easy to find, or rhetorically useful.

## Execution order

The execution order was frozen before document inspection:

1. Reconstruct the complete A06 metadata and exact-text denominator from merged custody.
2. Process all 11,672 texts in ascending document identity with one versioned, content-neutral extraction dictionary.
3. Preserve every positive and negative extraction result before selecting any follow-up query.
4. Reconcile all 58 California counties to the official state county-office master and census each county’s official public surfaces in alphabetical order.
5. Search official adjudicative or enforcement surfaces only when an exact A06 identifier or an unambiguous county-date-decision identity authorizes the join.
6. Retain official county or state aggregates as controls only; never convert them into case trajectories.

## Required public-receipt chain

```text
A06 decision identity
→ ordered relief
→ county compliance report or equivalent official receipt
→ implementation action
→ issuance or restoration amount
→ issuance or restoration date
→ SHD approval or corrective instruction
→ later complaint, correction, or residual harm
```

A chain may terminate at any link. Every missing link remains an explicit null. An order to restore is not a restoration receipt, a report is not an issuance receipt, and absence of a public receipt is not evidence of noncompliance.

## Initial official-source acquisition complete

The first frozen nine-source transaction completed on workflow run `30736660191` and published only exact source-custody paths in product commit:

```text
d1ae04f1504d725609a4177b31f1b0c35c170502
```

```text
frozen official targets:                9
terminal source receipts:               9
exact responses preserved:              9
successful official bodies:             8
bounded unavailable receipts:           1
semantic classifications complete:      0
case-level public receipts:              0
case-level implementation joins:         0
```

The eight successful bodies are the predeclared CDSS State Hearings, hearing-request, regulations-index, manual-letter, county-office, CalFresh dashboard, CalFresh data-table, and Los Angeles ASH-001 policy surfaces. Each retains the ordered request, response headers, redirects, status, exact body, byte count, SHA-256, and timestamp.

The predeclared Los Angeles ASH-008 URL received two bounded `503` responses and remains `source_unavailable`. That state is a transport receipt, not evidence that the policy does not exist and not evidence of county noncompliance.

Exact response custody is not semantic classification, case compliance, implementation, restoration, timeliness, prevalence, or a finding that the source is current, complete, or controlling.

## MPP 22-078 locator correction

The exact preserved CDSS regulations index establishes that Division 22 belongs to the **Confidentiality, Fraud, Civil Rights, and State Hearings Manual**. The initial Social Service Standards manual-letter target therefore remains preserved as an honest locator attempt but is not represented as the MPP 22-078 authority.

The next authority transaction must recover and checksum the exact current and historical Division 22 source from the corrected official manual route. Until that transaction completes:

```text
exact MPP 22-078 custody:             pending
rule-version chronology:              pending
rule proves case compliance:             no
rule proves issuance:                    no
rule proves restoration:                 no
```

## Content-neutral extraction pilot complete

The extraction dictionary was frozen before parent-text access:

```text
dictionary version: a07-order-candidate-v1
patterns:                              19
rules SHA-256:
0c3825e76582d464ad62cdeafa8df42faaf70a7e297813f85ffd1e899f99ba29
```

One content-neutral A06 shard assigned by `SHA-256(document_identity) mod 64` was used to prove transport and extraction mechanics. Shard `00` was not selected by county, disposition, issue, amount, narrative, claimant, or expected result.

```text
workflow run:                       30736912580
permanent pilot product:
a916d86382c9faa4f5e915399ca6ecb3b6c2be0d
artifact:                             8829896177
artifact digest:
26cf6e9f532a1f7f475ad7595b315d0c251b2e462a098475b960595d60ec94e1

exact documents reconciled:                 192
registry rows reconciled:                    212
candidate-state documents:                  131
support-only negative documents:             50
all negative documents retained:             61
total rule matches:                       13,860
population complete:                         no
follow-up authorized:                        no
```

The 131 candidate states are predeclared text-rule matches, not adjudicated findings that relief was ordered. Amount and period matches are support fields and do not create candidate status. The pilot preserves every negative document and every negative field state.

```text
rule match proves ordered relief:             no
rule match proves implementation:             no
rule match proves separate compliance receipt:no
rule change authorized by pilot result:       no
case follow-up authorized:                    no
```

## Frozen source universe

```text
1  merged A06 registry and exact-document custody
2  official state rule, form, process, and authentication-boundary surfaces
3  complete 58-county official public-source census
4  official adjudicative and enforcement surfaces with exact lawful identity
5  official aggregate controls retained separately
```

## Source-state taxonomy

```text
exact_public_case_receipt
public_official_aggregate_only
public_policy_only
public_decision_only
authenticated_or_claimant_only
public_index_without_retrievable_record
zero_result_with_exact_query_receipt
source_restricted
source_unavailable
malformed_or_conflicting
```

A zero-result receipt preserves the exact query and returned body. A restricted or claimant-only record is not converted into an absent record.

## Current authoritative state

The immutable `core.json` remains the phase-zero authorization snapshot. Current execution state is separately bound in `progress.json` so completed custody is not erased and the original constitution is not rewritten after results.

```text
constitution frozen:                    yes
parent denominator reopened:             no
selection rules changed after results:    no

official source receipts:                 9 / 9
successful official bodies:               8
bounded unavailable receipts:             1
semantic classifications complete:        0

content-neutral pilot shards:              1 / 64
pilot documents processed:               192
full-population documents processed:       0 / 11,672
full-population registry rows represented: 0 / 12,282
full population complete:                  no

county agency roots materialized:          0 / 58
counties censused:                         0 / 58
county selection authorized:               no

exact public case receipts:                0
case-level implementation joins:           0
complete restoration chains:               0
remedy-timeliness observations:             0
residual classes closed:                    0
reviewed dispositions changed:              0
external contacts:                          0
external reviews:                           0
graph effect:                             none
publication effect:                       none
adoption effect:                          none
```

## Authority boundary

A07 may establish the public availability, restriction, absence-after-exact-search, or exact content of official compliance and restoration records. It may establish a case-level implementation link only when a separately public official receipt and an exact A06 identity support that link.

A07 may not promote a decision order into implementation, a policy into execution, an aggregate into a claimant trajectory, one county into prevalence, unequal results into motive or racial hierarchy, or parallel institutional behavior into coordination or common purpose.

A justified result of zero exact public joins is a valid completed census. It is not a finding that counties failed to comply.

## Next bounded moves

1. Materialize all 58 county agency roots from the exact preserved CDSS county-office body.
2. Recover exact current and historical MPP 22-078 authority from the corrected Confidentiality, Fraud, Civil Rights, and State Hearings manual route.
3. Execute all 64 content-neutral parent shards and reconcile all 11,672 documents and 12,282 row links before any case follow-up.

No county or case follow-up may begin before those denominators are terminal.
