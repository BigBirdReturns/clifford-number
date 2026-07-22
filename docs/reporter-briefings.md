# Structured reporter reports

A structured reporter report is a finite public projection of a compiled evidence case. It makes the reporting logic visible without writing a narrative, generating a conclusion, or creating a second factual ledger.

The source contract is `reporter-briefing@2`. A case opts in with `cases/<case-id>/briefing.json` and matching `case.briefing` metadata.

## Publication sequence

```text
case receipts, claims, and events
→ compiled evidence case
→ claim- and event-referenced report specification
→ deterministic structured HTML report
→ compiled report manifest
→ review queue
→ Pages, mobile, evidence-dialog, and portable-case verification
```

The compiled case is primary truth. The report, graph, table, route, and export are projections. None may become an independent truth store.

## Reader sequence

Every report presents the same analytical surfaces in the same order:

1. **Working proposition and evidence boundary.** The question being tested and the strongest interpretation the opened record does not support.
2. **Categorical orientation.** Selected decision threads placed in a three-by-three typology. Placement is ordinal editorial orientation, never an interval score.
3. **Decision sequence.** Canonical case events arranged across capability, access or policy signal, formal gate or commitment, and counterweight lanes.
4. **Evidence matrix.** One row per decision thread and one column per required evidence dimension. A cell contains canonical claim references, an explicit record target, or a declared not-applicable state.
5. **Counterweights.** Competitive alternatives, lost paths, adjudicatory controls, shared-risk comparators, or other records that prevent a one-directional reading.
6. **Reporting queue.** Prioritized custodians, records, routes, date windows, and a decision test for each acquisition step.
7. **Claim register and receipt index.** Every referenced factual claim, qualification, status, date, and public source link.

This sequence exposes the story spine, the paper gap, and the next reporting move without converting those structures into narrative prose.

## Hard rules

1. Factual report content resolves to canonical case claims or canonical case events. The compiler supplies exact claim prose, qualifications, status, event label, and event date.
2. Editorial material may label dimensions, define record targets, group controls, and sequence reporting work. It cannot create claims, findings, topology edges, scores, probabilities, or conclusions.
3. Orientation uses exactly three named levels per dimension. Continuous coordinates are prohibited unless a future schema introduces a documented codebook and review contract.
4. Every decision thread has exactly one evidence-matrix cell for every declared column. A cell must contain claim references, an open-record target, or `not_applicable`; blanks are invalid.
5. An open-record cell means the decisive evidence is not established in the opened case. It is not evidence that the record, communication, or event does not exist.
6. Counterweights are mandatory. A report cannot display only evidence consistent with its working proposition.
7. Every reporting-queue item names its target threads, custodians, records, routes, date window, and decision test. Queue entries have `graph_effect: none` and do not change case status.
8. `graph_effect` is always `none`, and `conclusion_generated` is always `false`.
9. A verified claim keeps its public receipt. A review-required claim remains visibly review-required. Mixed evidence stays mixed.
10. Publication history is append-only by version. The current version and status must match the latest history entry. An approved report requires a named independent reviewer and review date.
11. The portable standalone contains the compiled evidence case but suppresses links to external report pages.

## Generated artifacts

```text
briefs/<case-id>.html
build/briefings/<case-id>.json
build/briefings/index.json
build/review/reporter-briefing-queue.json
```

The per-report manifest records:

- all referenced claim, receipt, and event IDs;
- categorical placements;
- sequence lanes and event status;
- matrix cell state and open-record targets;
- counterweight groups and reporting-queue scope;
- status counts, output routes, graph effect, and conclusion boundary; and
- SHA-256 digests of the source specification, compiled case, and emitted HTML.

The review queue explains why a report is not approval-ready without promoting it, changing its evidence, or impersonating human review.

## Method boundary

The report combines several familiar disciplines without pretending they are one score:

- provenance-aware claims and receipts provide traceability;
- event sequence makes temporal order visible;
- categorical typology provides bounded orientation;
- an evidence-and-gap matrix exposes coverage and missing decisive records;
- counterweights preserve rival explanations and negative cases; and
- the reporting queue turns unresolved cells into a collection plan.

These are presentation and investigation structures. They do not, by themselves, establish causation, influence, control, wrongdoing, or procurement illegality.

## Adding another report

1. Compile and review the case ledger first.
2. Define a finite set of decision threads rather than trying to display the whole case at once.
3. Add `briefing.json` with a stable route, proposition, boundary, categorical orientation, canonical event sequence, complete evidence matrix, counterweights, reporting queue, publication history, and records target.
4. Run `npm run compile` and `node test/reporter-briefing.test.js`.
5. Build Pages and standalone output, then run `npm run validate:pages` and `node tools/validate-reporter-briefing-pages.mjs`.
6. Run the `Reporter briefing publication contract` workflow. It verifies desktop and mobile structure, claim and receipt counts, the evidence dialog, public links, and portable-case behavior in Chromium.

Do not copy prose from a dossier into a report and cite the dossier as a substitute for underlying records. Dossiers remain intake and synthesis artifacts. Public factual content must resolve to case claims and receipts; editorial structures must remain visibly non-factual.
