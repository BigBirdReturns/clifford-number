# Report waterline

**Status:** current

The report waterline is the highest publication transition demonstrated by deterministic repository artifacts. It is a capability boundary, not a quality score, confidence score, priority ranking, or judgment about a subject.

The current transition law is:

```text
intake trail or legacy projection
→ typed case ledger
→ structured report
→ independent review
→ approved publication
```

A transition may add a new projection or review state. It may not silently promote factual status, causal status, graph effect, or publication approval.

## Current waterline

The project currently demonstrates the **structured report** stage in more than one domain:

- **Anduril access and ownership** proves the contract on procurement, institutional access, technical-stack ownership, formal government gates, and counterweights.
- **The Arcadia Formation** proves the same contract on place formation, public infrastructure, planning, assessment governance, parcel ownership, project approvals, and comparative controls.

Both reports remain `review_required`. The next project-wide transition is therefore **independent review**, not more polished presentation.

Other material remains below that waterline for explicit reasons:

- a typed case with no verified claims requires an evidence upgrade before report specification;
- a legacy graph projection requires migration into a canonical case ledger;
- an intake trail program requires claim, receipt, event, and boundary promotion before a report may consume it.

`build/report-frontier.json` records these states and transitions without assigning a score or rank.

## Custody states

The project preserves several different objects that must not impersonate one another.

### Evidence trail

A trail is a bounded search path. It records a question, query family, custodian, source route, status, and stopping rule.

A case trail may be linked to a report workplan only when:

- `graph_effect` is `none`;
- `promotes_to` is absent or `candidate_only`; and
- the trail is already in the compiled case ledger.

A trail does not create a claim, finding, chronology, graph edge, conclusion, or publication status.

### Canonical claim

A claim is a typed assertion with evidence state, causal status, receipts, and a qualification or case-wide interpretation boundary.

Every canonical claim is preserved in the compiled case, whether or not it has been attached to a dated event. The public catalog also preserves every canonical claim.

### Unsequenced canonical claim

An unsequenced claim is valid case custody that has not been assigned to a canonical event. It is not discarded, and the report may reference it in the evidence matrix, controls, or claim register.

It must remain visibly labeled as an unsequenced case claim. A report containing one is not approval-ready until independent review either:

- assigns the claim to an appropriate event;
- confirms that an undated or standing claim is the correct representation; or
- removes the claim from the report projection.

The compiler records `unsequenced_claim_ids`, and the review queue adds an explicit blocker.

### Canonical event

An event supplies the case-defined temporal context for one or more claims. Report decision sequences may reference only canonical events. The report cannot invent a date or convert an unsequenced claim into chronology.

### Structured report

A structured report is a deterministic projection containing:

1. a working proposition and evidence boundary;
2. categorical orientation;
3. a canonical event sequence;
4. a complete evidence-and-gap matrix;
5. mandatory counterweights;
6. an executable reporting queue;
7. a canonical claim register; and
8. a public receipt index.

It may expose the story spine, evidence gaps, and next reporting moves. It may not write a narrative conclusion or change the graph.

### Independent review

Independent review is a publication transition, not a CI result. Automation can prove integrity, reconciliation, rendering, and refusal behavior. It cannot supply the reviewer.

Approval requires:

- a named independent reviewer;
- a review date;
- publication history consistent with the current version and status;
- resolution of report-referenced review-required claims;
- explicit review of any case-wide inherited qualifications; and
- resolution of any report-referenced unsequenced claims.

## Inherited qualifications

Some older case claims do not yet carry a claim-specific qualification. The compiler may inherit the case boundary or disclaimer so the claim is never presented without a limit.

Inherited qualification is custody preservation, not approval. The manifest records every affected claim, and the review queue blocks approval until a reviewer supplies or confirms an appropriate claim-level boundary.

## Editorial records targets

A report may state which documents would prove or defeat a stronger theory without creating a canonical claim. An editorial records target must carry:

- explicit target text; and
- an explicit qualification that the target is a reporting roadmap rather than a factual finding.

This permits a report to remain operational even when the case ledger does not contain a synthetic “records needed” claim.

## Project frontier

The report-frontier compiler reconciles:

- native case ledgers;
- legacy projections admitted to the public case interface;
- compiled structured reports;
- review-queue blockers;
- case trails;
- intake evidence-trail programs; and
- report workplan links.

For each case it records:

- current custody or publication stage;
- next allowed transition;
- claim and receipt counts;
- trail counts and report-linked trails;
- report state and version; and
- explicit blockers.

For each trail program it records:

- current stage;
- next allowed transition;
- terminal and non-terminal counts;
- report-workplan linkage; and
- the boundary preventing trail-to-finding promotion.

The frontier never recommends a subject by score. Its purpose is to prevent work from skipping required transitions.

## What this unlocks

Completion of the structured-report layer unlocks the following work naturally:

1. **Cross-domain report replication.** A second report can use the same evidentiary law without copying the first report's subject matter or visual argument.
2. **Executable collection from visible gaps.** Matrix cells and workplan items can point to bounded case trails while preserving candidate-only status.
3. **Independent-review operations.** The review queue can distinguish ordinary review-required claims from inherited qualifications, unsequenced claims, missing reviewer identity, and missing review date.
4. **Project-level transition planning.** The frontier can show which cases need evidence upgrades, which projections need migration, which reports need review, and which trails need closure.
5. **Controlled later synthesis.** Cross-case synthesis may begin only after it consumes typed claims, reviewed relations, and explicit transition states. Prose similarity or trail recurrence remains insufficient.

## Commands

```bash
npm run compile
npm run build:report-frontier
npm run validate:report-frontier
node test/reporter-briefing.test.js
node tools/validate-reporter-briefing-pages.mjs
npm run release:check
```

The standard `npm run compile` sequence rebuilds cases, reports, the public catalog, and the report frontier in dependency order.

## Non-negotiable boundaries

- A trail is not a claim.
- A canonical claim is not necessarily a dated event.
- Sequence is not causation.
- An open matrix cell is not evidence of absence.
- A structured report is not an approved publication.
- CI success is not independent review.
- A report workplan has `graph_effect: none`.
- The report frontier is not a score or ranking.
