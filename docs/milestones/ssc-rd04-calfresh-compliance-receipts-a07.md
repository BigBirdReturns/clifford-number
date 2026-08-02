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
```

Every A06 row and document remains in scope. A07 may not select a disposition, county, claimant, issue, order, amount, or narrative because it appears favorable, provocative, famous, easy to find, or rhetorically useful.

## Execution order

The execution order is frozen before document inspection:

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

## Frozen source universe

```text
1  merged A06 registry and exact-document custody
2  official state rule, form, process, and authentication-boundary surfaces
3  complete 58-county official public-source census
4  official adjudicative and enforcement surfaces with exact lawful identity
5  official aggregate controls retained separately
```

The initial ledger contains only parent custody and predeclared official targets. No new source is represented as fetched, preserved, or dispositive until exact request, response, headers, body, byte count, and SHA-256 custody exist in the branch.

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

## Current state

```text
constitution frozen:                  yes
parent denominator reopened:           no
new source bytes preserved:             0
parent documents processed:             0 / 11,672
ordered-relief candidates:              0
counties censused:                       0 / 58
exact public search receipts:            0
exact public case receipts:              0
case-level implementation joins:         0
complete restoration chains:             0
remedy-timeliness observations:           0
residual classes closed:                  0
reviewed dispositions changed:            0
external contacts:                        0
external reviews:                         0
graph effect:                           none
publication effect:                     none
adoption effect:                        none
```

## Authority boundary

A07 may establish the public availability, restriction, absence-after-exact-search, or exact content of official compliance and restoration records. It may establish a case-level implementation link only when a separately public official receipt and an exact A06 identity support that link.

A07 may not promote a decision order into implementation, a policy into execution, an aggregate into a claimant trajectory, one county into prevalence, unequal results into motive or racial hierarchy, or parallel institutional behavior into coordination or common purpose.

A justified result of zero exact public joins is a valid completed census. It is not a finding that counties failed to comply.

## Next bounded move

Acquire exact custody of the state rule and process surfaces, resolve the official current and historical MPP 22-078 text, materialize the 58-county agency-root denominator, and build the complete A06 text-extraction ledger. No county or case follow-up may begin before those denominators are terminal.
