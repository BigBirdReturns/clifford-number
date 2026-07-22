# Structured reporter reports

A structured reporter report is a finite public projection of a compiled evidence case. It makes the reporting logic visible without writing a narrative, generating a conclusion, or creating a second factual ledger.

The source contract is `reporter-briefing@2`. A case opts in with `cases/<case-id>/briefing.json` and matching `case.briefing` metadata. The project-level transition rules are documented in [`report-waterline.md`](report-waterline.md).

## Publication sequence

```text
case receipts, claims, events, and candidate-only trails
→ compiled evidence case
→ claim-, event-, and trail-referenced report specification
→ deterministic structured HTML report
→ compiled report manifest
→ review queue
→ project report frontier
→ Pages, mobile, evidence-dialog, and portable-case verification
```

The compiled case is primary truth. The report, graph, table, route, frontier, and export are projections. None may become an independent truth store.

## Reader sequence

Every report presents the same analytical surfaces in the same order:

1. **Working proposition and evidence boundary.** The question being tested and the strongest interpretation the opened record does not support.
2. **Categorical orientation.** Selected decision threads placed in a three-by-three typology. Placement is ordinal editorial orientation, never an interval score.
3. **Decision sequence.** Canonical case events arranged across case-defined analytical lanes.
4. **Evidence matrix.** One row per decision thread and one column per required evidence dimension. A cell contains canonical claim references, an explicit record target, or a declared not-applicable state.
5. **Counterweights.** Competitive alternatives, lost paths, adjudicatory controls, shared-risk comparators, ordinary mechanisms, or other records that prevent a one-directional reading.
6. **Reporting queue.** Prioritized custodians, records, routes, date windows, decision tests, and optional links to candidate-only case trails.
7. **Claim register and receipt index.** Every referenced factual claim, qualification, status, temporal context, and public source link.

This sequence exposes the story spine, paper gap, alternative explanations, and next reporting move without converting those structures into narrative prose.

## Hard rules

1. Factual report content resolves to canonical case claims or canonical case events. The compiler supplies exact claim prose, qualification state, status, event context, and receipts.
2. Every canonical case claim is preserved in the compiled case and public catalog. A claim that is not attached to an event remains an explicitly **unsequenced canonical claim**; the report may reference it but may not invent chronology.
3. Editorial material may label dimensions, define record targets, group controls, and sequence reporting work. It cannot create claims, findings, topology edges, scores, probabilities, or conclusions.
4. A records roadmap may be a canonical claim reference or an editorial target with explicit text and qualification. Editorial targets do not enter the claim register as factual assertions.
5. Orientation uses exactly three named levels per dimension. Continuous coordinates are prohibited unless a future schema introduces a documented codebook and review contract.
6. Every decision thread has exactly one evidence-matrix cell for every declared column. A cell must contain claim references, an open-record target, or `not_applicable`; blanks are invalid.
7. An open-record cell means decisive evidence is not established in the opened case. It is not evidence that the record, communication, or event does not exist.
8. Counterweights are mandatory. A report cannot display only evidence consistent with its working proposition.
9. Every reporting-queue item names target threads, custodians, records, routes, date window, and decision test. A queue item may reference case trail IDs only when each trail is graph-inert and can promote no further than `candidate_only`.
10. Intake-only trails cannot be consumed directly by a report. They must first enter a typed, receipted case ledger.
11. A trail is a bounded search path, not a claim. Trail status or recurrence cannot create a finding, sequence event, graph edge, conclusion, or publication approval.
12. `graph_effect` is always `none`, and `conclusion_generated` is always `false`.
13. A verified claim keeps its public receipt. A review-required claim remains visibly review-required. Mixed evidence stays mixed.
14. A claim lacking its own qualification may inherit the case boundary or disclaimer so it is never shown without a limit. Every inherited qualification is recorded and blocks approval pending independent claim-level review.
15. Every report-referenced unsequenced claim is recorded and blocks approval pending independent temporal or representational review.
16. Publication history is append-only by version. The current version and status must match the latest history entry. An approved report requires a named independent reviewer and review date.
17. The portable standalone contains the compiled evidence case but suppresses links to external report pages.

## Generated artifacts

```text
briefs/<case-id>.html
build/briefings/<case-id>.json
build/briefings/index.json
build/review/reporter-briefing-queue.json
build/report-frontier.json
```

The per-report manifest records:

- all referenced claim, receipt, event, and source-trail IDs;
- categorical placements;
- sequence lanes and event status;
- matrix cell state and open-record targets;
- counterweight groups and reporting-queue scope;
- inherited qualification and unsequenced-claim custody;
- status counts, output routes, graph effect, and conclusion boundary; and
- SHA-256 digests of the source specification, compiled case, and emitted HTML.

The review queue explains why a report is not approval-ready without promoting it, changing its evidence, or impersonating human review. Blockers can include:

- publication status remains `review_required`;
- report-referenced claims remain review-required;
- qualifications are inherited from the case boundary;
- report-referenced claims are not attached to canonical events;
- independent reviewer identity is missing; or
- review date is missing.

The report frontier reconciles reports with native cases, legacy projections, case trails, and intake trail programs. It records the next allowed transition without scoring or ranking subjects.

## Claim custody and temporal context

A canonical claim can occupy one of two temporal states:

- **Sequenced:** attached to a canonical event with a case-defined label and period.
- **Unsequenced:** preserved in the case and catalog without an event assignment.

Unsequenced claims remain available to the evidence matrix, counterweights, claim register, and receipt index. They display an explicit unsequenced context and cannot be inserted into the decision sequence. Approval requires a reviewer to confirm an event assignment, approve an undated or standing representation, or remove the claim from the report projection.

## Trail-to-workplan seam

A report workplan may link to a case trail so the visible paper gap and the bounded search operation remain connected.

The compiler refuses a trail link when:

- the trail does not exist in the compiled case;
- `graph_effect` is not `none`; or
- `promotes_to` exceeds `candidate_only`.

The manifest and HTML preserve every linked trail ID and status. The trail remains a search object; the workplan remains editorial; neither changes the evidence case.

## Method boundary

The report combines several familiar disciplines without pretending they are one score:

- provenance-aware claims and receipts provide traceability;
- event sequence makes temporal order visible;
- categorical typology provides bounded orientation;
- an evidence-and-gap matrix exposes coverage and missing decisive records;
- counterweights preserve rival explanations and negative cases;
- bounded trails make search operations inspectable; and
- the reporting queue turns unresolved cells into a collection plan.

These are presentation and investigation structures. They do not, by themselves, establish causation, influence, control, wrongdoing, procurement illegality, coordinated development, or a master plan.

## Adding another report

1. Compile and review the case ledger first, including every canonical claim, receipt, event, relation, and optional case trail.
2. Use `build/report-frontier.json` to confirm that the next allowed transition is `structured_report_specification`, not evidence upgrade or case-ledger migration.
3. Define a finite set of decision threads rather than trying to display the whole case at once.
4. Add `briefing.json` with a stable route, proposition, boundary, categorical orientation, canonical event sequence, complete evidence matrix, counterweights, reporting queue, publication history, and records target.
5. Link workplan items only to appropriate case trails. Do not copy intake trail IDs directly into a report.
6. Run `npm run compile`, `node test/reporter-briefing.test.js`, and `node test/report-frontier.test.js`.
7. Build Pages and standalone output, then run `npm run validate:pages` and `node tools/validate-reporter-briefing-pages.mjs`.
8. Run the `Reporter briefing publication contract` workflow. It verifies desktop and mobile structure, claim and receipt counts, trail reconciliation, evidence-dialog behavior, public links, and portable-case behavior in Chromium.

Do not copy prose from a dossier into a report and cite the dossier as a substitute for underlying records. Dossiers remain intake and synthesis artifacts. Public factual content must resolve to case claims and receipts; editorial structures and search trails must remain visibly non-factual.
