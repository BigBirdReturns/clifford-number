# ADR: Case-first structured reporter reports

**Status:** accepted

## Context

The first reporter-briefing contract made factual drift difficult: report prose resolved to canonical case claims, qualifications remained attached, review state stayed visible, and no report could change the graph or generate a conclusion.

That contract still left too much of the investigation implicit. A reader could see selected claim cards and a two-axis map, but not the full event order, the distribution of evidence and gaps, the counterexamples, or the exact reporting sequence. Continuous zero-to-one-hundred coordinates also implied a measurement precision the case did not possess.

The product must make the story visible to a reporter without writing the story for the reporter.

## Decision

The site's primary publication unit remains a compiled evidence case. A graph, structured report, table, route, or export is a projection of that case or of the bounded-surface compiler; none is an independent truth store.

`reporter-briefing@2` replaces the free-positioned briefing aperture with a fixed structured-report grammar:

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

## Consequences

- A reporter can see the investigation's shape, chronology, evidentiary holes, alternative explanations, and next records moves without reading the entire case ledger.
- A report and its evidence case cannot silently diverge on claims, dates, status, qualifications, or receipts.
- Absence is represented as an open record target, not converted into evidence of absence.
- Review-required material remains visibly review-required instead of being flattened into a polished story.
- The graph remains a topology and verification projection, not the default narrative and not an influence or risk score.
- Cross-case synthesis must consume typed claims, events, and reviewed relations, never prose similarity alone.
- Future report templates may change visual styling, but all use the same claim, event, receipt, history, counterweight, matrix, and review contracts.

## Rejected alternatives

- **Hand-written narrative plus citations:** rejected because it duplicates factual prose, hides selection decisions, and can drift from the ledger.
- **Continuous two-axis coordinates without a codebook:** rejected because exact positions imply unsupported measurement precision.
- **One large network graph as the report:** rejected because topology is poor at showing chronology, evidence gaps, alternative explanations, and collection order simultaneously.
- **Generic AI chat front door:** rejected because it can synthesize beyond the opened record and requires the reader to trust an opaque intermediary.
- **Evidence matrix without counterweights:** rejected because a structurally complete table can still be directionally biased.
- **Automatically converting event sequence or matrix cells into graph edges:** rejected because temporal order, institutional adjacency, or shared subject matter does not establish bounded co-participation or causation.

## Migration

The Anduril access-and-ownership case is the prototype `reporter-briefing@2` report. Its source version advances to `2.0.0`; the evidence case, claim statuses, receipts, graph effect, and conclusion boundary are not promoted by the migration.
