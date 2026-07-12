# Case ledger

Case ledgers turn receipted topology into timestamped, reviewable case files without making sequence look like causation.

Each case owns six source files under `cases/<case-id>/`:

- `case.json`: identity, `as_of` boundary, publication status, disclaimer, and section manifest.
- `receipts.jsonl`: public locators or immutable content hashes.
- `claims.jsonl`: plain-language atomic assertions with evidence, review, temporal, causal, and money semantics.
- `events.jsonl`: program, decision, commitment, capital, role-transition, capability, and outcome observations.
- `relations.jsonl`: typed event relationships with an explicit `causal_status`.
- `beacons.jsonl`: versioned, explainable composites whose inputs and formulas remain inspectable.

Run `npm run compile:cases` to produce disposable artifacts under `build/cases/`. The public app reads only those compiled artifacts.

## Honesty rules

Every claim carries at least one receipt. A claim cannot be `verified` when its receipts have neither a public URL nor an archive URL. A user-supplied artifact can establish what that artifact asserted, but it cannot independently verify the real-world assertion.

Money uses an explicit `amount_kind`: `requested`, `authorized`, `appropriated`, `allocated`, `obligated`, `outlaid`, `paid`, or `ceiling`. The compiler never collapses those stages into “spent.”

Every claim and relation uses one causal status:

- `source_explicit`
- `institutionally_attributed`
- `temporal_association`
- `not_established`

Beacons expose their version, input events, dimensions, formulas, evidence coverage, and prohibited interpretation. They are not guilt, corruption, motive, or influence scores.

FA-03 is deliberately shipped with zero verified input claims. It is the golden structural fixture and the review queue: replacing its artifact-only provenance with independent claim-level receipts will cause its evidence-coverage beacon to rise without changing the historical assertions or silently rewriting the case.
