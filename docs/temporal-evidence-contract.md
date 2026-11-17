# Temporal evidence contract

A retrieval date is valid observation time. It does not establish the beginning or end of an employment relationship, or the occurrence of an undated repost. Source records remain immutable.

The default timeline preserves the existing recorded-date view, with explicit `time_basis: recorded`, source `date_basis` and limits, and observation-specific wording. The model API also accepts `buildTimelineModel(surfaceGraph, hopGraph, {timeBasis: "occurrence"})`. That projection keeps the same rows, receipts, evidence classes and hop decisions, but leaves unsupported event times unplaced and retains year-only precision. It does not manufacture a retrieval time, endpoint, identity link or approved hop.

Every derived row retains original source times and separate occurrence times. A consumer selecting historical event or tenure time must explicitly select the occurrence projection. Unknown occurrence time remains unknown; absence from a dated interval is not proof of nonparticipation. The UI recorded-date view remains backward-compatible and labels observations as observations. Adding an interactive axis selector is a separate UI activation, not claimed by this patch.

`node test/temporal-placement.test.js` exercises the helper's finite conventions. `node test/temporal-evidence-boundary.test.js` exercises both projections against the retained graph and verifies that the source graph is unchanged. The full existing timeline suite remains in force. This private branch has not been publicly deployed.
