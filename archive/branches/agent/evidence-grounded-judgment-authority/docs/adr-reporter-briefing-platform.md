# ADR: Case-first structured reporter reports and publication waterline

**Status:** accepted

## Context

The first reporter-briefing contract made factual drift difficult: report prose resolved to canonical case claims, qualifications remained attached, review state stayed visible, and no report could change the graph or generate a conclusion.

`reporter-briefing@2` then made the investigation itself visible through categorical orientation, canonical event sequence, a complete evidence-and-gap matrix, mandatory counterweights, an executable reporting queue, and a claim register. It removed unsupported continuous coordinates and replaced a one-off Anduril aperture with a reusable report grammar.

Completion of that layer exposed the next architectural question: how do evidence trails, older case ledgers, legacy projections, structured reports, and independent review relate without creating a parallel status system or allowing work to skip required transitions?

The product must make the story and the state of the work visible without writing the story, inventing chronology, scoring subjects, or treating automation as editorial approval.

## Decision

The site's primary publication unit remains a compiled evidence case. A graph, structured report, table, route, frontier, or export is a projection of that case or of the bounded-surface compiler; none is an independent truth store.

The project adopts this explicit transition law:

```text
intake trail or legacy projection
→ typed case ledger
→ structured report
→ independent review
→ approved publication
```

`build/report-frontier.json` records the highest demonstrated transition and the next allowed transition for each case or trail program. The frontier is a transition ledger, not a score, ranking, recommendation, or substantive judgment.

`reporter-briefing@2` keeps its fixed structured-report grammar:

```text
working proposition and boundary
→ categorical three-by-three orientation
→ canonical multi-lane decision sequence
→ complete evidence-and-gap matrix
→ visible counterweights
→ prioritized reporting queue
→ canonical claim register and receipt index
```

Factual text is rendered from claim and event references. Editorial fields may orient the reader, identify missing decisive records, and specify collection work, but they have `graph_effect: none` and cannot create a finding or conclusion.

Categorical placement is deliberately coarse. Exact numeric coordinates are rejected because they suggest interval measurement without a validated codebook, independent coding, and adjudication process.

Every matrix row must have one cell for every evidence dimension. Every cell must contain canonical claim references, an explicit open-record target, or a not-applicable declaration. Counterweights are required so the report cannot silently become a confirmation display.

## Complete claim custody

Compiled cases must preserve every canonical claim, not only claims already attached to events.

A claim can therefore be:

- **sequenced**, with canonical event context; or
- **unsequenced**, preserved in the case and public catalog but not assigned to a dated event.

A report may reference an unsequenced claim in its matrix, controls, or claim register. It may not place that claim in the decision sequence or invent a temporal context. Every report-referenced unsequenced claim is recorded in the manifest and blocks approval pending independent review.

## Qualification inheritance

A claim-specific qualification is preferred. When an older canonical claim lacks one, the compiler may inherit the case boundary or disclaimer so the claim is never displayed without an interpretation limit.

Inheritance is a custody fallback, not editorial completion. Every inherited qualification is recorded in the manifest and blocks approval until an independent reviewer confirms or supplies a claim-level qualification.

## Trail-to-workplan seam

An evidence trail is a bounded search object, not a claim.

A report workplan may reference a trail only when the trail:

- exists in the compiled case;
- has `graph_effect: none`; and
- can promote no further than `candidate_only`.

The report preserves the trail ID and status alongside the corresponding collection action. A trail cannot create a claim, event, graph edge, conclusion, or publication state. Intake-only trail programs must first cross into a typed, receipted case ledger.

## Editorial records roadmaps

A report may identify the documents that would prove or defeat a stronger theory even when the case does not contain a synthetic “records needed” claim. Such a target must be explicitly editorial and carry a qualification stating that it is a reporting roadmap, not a factual finding.

Editorial records targets do not enter the canonical claim set.

## Independent review boundary

Automation may verify:

- deterministic compilation;
- claim, event, receipt, and trail reconciliation;
- publication-history consistency;
- approval refusals;
- Pages and portable behavior;
- desktop and mobile structure; and
- evidence-dialog and source-link behavior.

Automation may not supply independent review. Approval still requires a named reviewer, review date, resolved report-referenced review-required claims, reviewed inherited qualifications, reviewed unsequenced claims, and append-only publication history.

## Consequences

- A reporter can see the investigation's shape, chronology, evidentiary holes, alternative explanations, candidate-only searches, and next records moves without reading the entire case ledger.
- A report and its evidence case cannot silently diverge on claims, dates, status, qualifications, receipts, or trail provenance.
- Claims no longer disappear merely because they lack an event assignment; their unsequenced state remains visible and reviewable.
- Absence is represented as an open record target, not converted into evidence of absence.
- Review-required material remains visibly review-required instead of being flattened into a polished story.
- The graph remains a topology and verification projection, not the default narrative and not an influence or risk score.
- Cross-case synthesis must consume typed claims, events, reviewed relations, and explicit transition states, never prose similarity or trail recurrence alone.
- Future report templates may change visual styling, but all use the same claim, event, receipt, history, trail, counterweight, matrix, frontier, and review contracts.
- Cases too thin for a report and legacy projections not yet migrated remain visibly below the waterline rather than being auto-upgraded.

## Rejected alternatives

- **Hand-written narrative plus citations:** rejected because it duplicates factual prose, hides selection decisions, and can drift from the ledger.
- **Continuous two-axis coordinates without a codebook:** rejected because exact positions imply unsupported measurement precision.
- **One large network graph as the report:** rejected because topology is poor at showing chronology, evidence gaps, alternative explanations, and collection order simultaneously.
- **Generic AI chat front door:** rejected because it can synthesize beyond the opened record and requires the reader to trust an opaque intermediary.
- **Evidence matrix without counterweights:** rejected because a structurally complete table can still be directionally biased.
- **Discarding claims without event assignments:** rejected because case custody must not depend on presentation readiness.
- **Converting every claim into a synthetic event:** rejected because doing so would invent chronology and erase the distinction between standing interpretation, dated observation, and event.
- **Letting intake trails feed reports directly:** rejected because search paths must cross the typed case-ledger evidence boundary before they can be represented as claims. Verified subsets may still support a bounded provisional report while unresolved trails remain explicit workplan inputs.
- **Treating workflow success as independent corroboration:** rejected because integrity automation proves reproducibility, not external corroboration. It does not prevent the project from making a bounded judgment from the evidence it has.
- **Automatically converting event sequence, matrix cells, or trails into graph edges:** rejected because temporal order, institutional adjacency, shared subject matter, or search recurrence does not establish bounded co-participation or causation.

## Migration and proof

The Anduril access-and-ownership case is the prototype `reporter-briefing@2` report. Its evidence case, claim statuses, receipts, graph effect, and conclusion boundary were not promoted by the migration.

The Arcadia Formation is the second proof. It applies the same report law to a different domain: place formation, public infrastructure, planning, assessment governance, parcel ownership, project approvals, and comparative controls. Its candidate-only evidence trails remain workplan inputs, not findings. The report remains `review_required` for independent clearance while its verified subset supports a bounded working judgment; inherited qualifications and unsequenced claims travel as scope limits rather than permission gates.

Together the two reports establish the current project waterline at **structured report plus bounded working judgment**. The next evidence action is **provisional publication and adversarial challenge**. Independent review may raise, lower, or overturn confidence and may satisfy the independently cleared label; it is not permission to judge.
