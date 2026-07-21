# ADR: Case-first reporter briefing platform

**Status:** accepted

## Decision

The site's primary publication unit is a compiled evidence case. A graph, finite briefing, table, route, or export is a projection of that case or of the bounded-surface compiler; none is an independent truth store.

Reporter briefings are generated from claim references. Editorial copy may orient the reader and name records targets, but factual thread copy is rendered from the canonical case claims. Review state, correction history, and output integrity are compiled alongside the public HTML.

## Consequences

- The site can serve a nontechnical reader without making that reader learn the research apparatus.
- A briefing and its evidence case cannot silently diverge on dates, amounts, status, or qualification.
- Review-required material remains visible as review-required instead of being flattened into a polished narrative.
- The graph remains a topology and verification projection, not the default narrative and not an influence or risk score.
- Cross-case synthesis must consume typed claims and reviewed relations, never prose similarity alone.
- Future briefing templates may change visual grammar, but all use the same claim, receipt, history, and review contracts.

## Rejected alternatives

- Hand-maintained HTML briefing plus separate evidence case: rejected because factual prose can drift.
- Generic AI chat front door: rejected because it can synthesize beyond the opened record and requires the reader to trust an opaque intermediary.
- Automatically converting case relations into graph edges: rejected because temporal or institutional sequence does not establish shared bounded participation or causation.
