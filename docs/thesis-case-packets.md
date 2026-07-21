# Thesis case packets: from source intake to admissible evidence

A thesis proposition cannot consume a GitHub issue, a source URL, or a topology path directly. The case-packet layer is the controlled boundary between research discovery and the evidence registry.

## Three distinct states

### Case contract

A declared research question, selection unit, denominator, source plan, privacy rule, forbidden inferences, and acceptance test. A contract is research architecture, not evidence.

### Case-intake packet

A source-addressable collection of observations opened for one bounded case. It may preserve intended analytical relations such as `supports`, `weakens`, `contradicts`, `context`, `coverage`, and `null_result`, but those relations remain **inadmissible intake** until repository receipts and human review are complete.

### Promoted thesis evidence packet

A separately approved proposition-scoped packet carrying repository receipt IDs, reviewed wording, temporal bounds, source roles, selection state, allowed language, and forbidden inference. Promotion is a distinct human action; the intake compiler cannot perform it.

## Why relation and admissibility are separate

An official source may clearly document a public role, a later appointment, a merger, or a regulatory breach before the repository has ingested a durable receipt. The observation's intended relation can be recorded immediately without pretending it is already admissible thesis evidence.

The compiler therefore records both:

- `relation`: how the observation would bear on a proposition if admitted;
- `promotion_status`: whether it can currently leave intake.

The thesis evidence registry sees the existence of the case packet only as `coverage` until a separate promotion action occurs.

## Required packet structure

Each packet declares:

- thesis, case, issue, and proposition IDs;
- selection unit and selection basis;
- denominator status and promotion blockers;
- public source metadata and source-custody state;
- observations with predicate, factual statement, dates, sources, intended relation, allowed language, and forbidden inferences;
- a positive anchor;
- weakening, contradiction, or a bounded null;
- a graph-inert case disposition;
- a copy-ready interpretation caveat.

## Evidence-bearing observations

`supports`, `weakens`, and `contradicts` are evidence-bearing relations. An observation cannot become promotion-ready unless it has:

- at least one receipt ID resolvable in `data/ledger/receipts.jsonl`;
- claim-level `human_reviewed` or `independently_reviewed` status;
- complete source metadata;
- temporal bounds whenever the factual statement is temporal;
- allowed language and explicit forbidden inferences.

Even when all of those are present, the intake validator rejects self-promotion. A separate promotion workflow must create the thesis evidence packet.

## Bounded null results

A `null_result` must state:

- the exact source and query scope;
- the source availability or completeness state;
- the period through which the search was performed;
- language that remains bounded to that search.

It cannot say that no relationship exists, that an event never occurred, or that the source search proves universal absence.

## Later compliance records

A later breach, correction, enforcement action, or compliance event cannot silently rewrite an earlier appointment or decision. Such an observation must be marked `non_retroactive: true` and explicitly forbid retroactive inference.

The Samantha Jones intake demonstrates this rule. The 18 June 2026 consolidated Business Appointment Rules breach concerns Carnall Farrar, Newmarket, Huma, and System C. It is preserved as later context with the Commission's mitigating statements and cannot be used to characterize the separate CeraCare commission as a reward, steering event, or breach.

## Collaboration is not succession

The 10DS/i.AI packet preserves:

- separate unit creation;
- the named GDS, CDDO, and i.AI transfer into DSIT;
- the later new-GDS merger descriptions;
- collaboration among CDDO, 10DS, and i.AI;
- the absence of a source-explicit 10DS-to-i.AI succession in the bounded source set.

Collaboration, similar remit, departmental co-location, and common policy context do not establish transfer of staff, budget, assets, programmes, or mandate.

## Current state

The initial state-market intake contains two cases:

1. `state-market-no10-pandemic-data-diaspora`
2. `state-market-central-government-ai-unit-succession`

Both contain official positive anchors and challenge material. Both have zero repository receipts, incomplete denominators, and no claim-level human review. Correct output is therefore:

```text
case packets: 2
eligible for evidence promotion: 0
emitted thesis evidence packets: 0
graph effect: none
```

## Commands

```text
npm run compile:case-packets
npm run validate:case-packets
node test/thesis-case-packet.test.js
```

Generated files:

- `build/thesis/case-packets/<case-id>.json`
- `build/thesis/case-packets/<case-id>.md`
- `build/thesis/case-packet-index.json`
- `build/thesis/case-packet-index.md`
