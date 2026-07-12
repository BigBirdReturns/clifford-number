# Methodology

The Clifford Number is the length of the shortest evidenced actor-to-actor path from a public actor to the case anchor, currently Matt Clifford. Each hop must be created by two actors participating in the same named, bounded surface. The web app's Claims Desk can apply the same rule between any two actors in the compiled case.

This document describes the current surface-hop model. The constitutional invariants in [`BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) govern whenever another document or generated artifact disagrees with it.

## What creates a hop

A hop has one basis: a shared bounded surface.

A bounded surface is a specific, auditable object such as a named board, appointment record, policy document, funding round, contract, programme, filing, event, or dated roster. It has a defined scope, participant rows, roles, dates where the record provides them, and receipt IDs.

A broad institution is not a hop. No. 10, Cabinet Office, DSIT, ARIA, News UK, Faculty, Electric Twin, or any other organization can be a venue or organization in the case, but it creates no actor adjacency by itself. A named surface inside it may do so if it passes the same evidence, temporal, and density rules as every other surface.

The compiler derives an actor hop only when all of the following exist:

1. a surface marked as hop-eligible;
2. a participation row for each actor on that surface;
3. receipt IDs supporting the surface and participations;
4. a valid overlap window, when the hop is used in a time-sliced query; and
5. no release invariant that disqualifies the surface.

Co-presence is never coordination. A shared surface does not establish contact, influence, agreement, intent, endorsement, guilt, or wrongdoing.

## Source-of-truth pipeline

The current product is compiled from source ledgers:

```text
data/ledger/claims.jsonl
data/ledger/surfaces.jsonl
data/ledger/participation.jsonl
data/ledger/receipts.jsonl
data/ledger/chains.jsonl
```

Canonical registries under `data/canonical/` control identities, aliases, predicates, and surface-type vocabulary. Ambiguity is resolved there, never in generated output.

The compiler produces disposable artifacts under `build/`, including the surface, hop, receipt, and score graphs. The app reads those generated artifacts. Neither the app nor a generated JSON file is a source of truth, and generated files must not be edited by hand.

The older generic node-edge graph is retained for legacy context. It does not define current Clifford Numbers. See [`docs/README.md`](README.md) for the status of legacy material.

## Temporal rule

A hop is not timeless. Its validity window is the intersection of:

- the surface window;
- the first actor's participation window; and
- the second actor's participation window.

Dates may have year, month, or day precision. A year widens to that full calendar year; a month widens to that full calendar month. Precision is widened, never invented.

If two dated participations on one surface do not overlap, that surface creates no hop between those actors. The compiler records such cases in `rejected_hop_pairs` so the refusal is reviewable rather than silently discarded.

An undated participation can support all-time topology, but it cannot support an `as of` answer. A partially dated or surface-only window must remain visibly qualified in narration and evidence views.

## Receipts and evidence

No hop basis, participation, claim, or editorial profile sentence may stand without receipt IDs. A receipt identifies material a stranger can check and records its evidence class and provenance.

Evidence classes describe the kind of support, not the importance of the person or surface. Official records, primary public material, reported material, derived inferences, editorial judgment, and open questions must remain distinguishable. A derived or judgment row must never be presented as a primary-source fact, and local analysis cannot replace a public receipt for a publication-critical claim.

Receipt support also has boundaries:

- a directory listing proves that a name appeared in that directory;
- registration proves registration, not attendance;
- attendance proves attendance, not agreement or coordination;
- an appointment proves the named public role for the documented period; and
- absence from this corpus means only that the project has not documented the connection.

When a source cannot be resolved, archived, or rechecked, that limitation belongs with the receipt and must travel into reader-facing output. It must not be hidden by a score or confident summary.

## Density discipline

The information value of a shared surface falls as its population grows. Surface types declare hop eligibility, and large rosters, directories, cohorts, and rankings must never become silent all-to-all hop machines.

Roster-class surfaces enter as non-hop surfaces until explicitly reviewed. A dense surface may remain useful for context, scoring, or discovery without changing Clifford Numbers. If a release uses a population-weighted eligibility rule, that rule must be explicit, reproducible, and covered by a fixture proving that a large list does not collapse the graph's discriminating power.

## Scores, recurrence, and chains

The Clifford Number measures only shortest actor-hop distance. It does not measure wrongdoing, influence, importance, ideology, or intent.

Surface-type recurrence and multi-stage chains are separate analytical objects. They can describe repeated surface logic or a sequence of documented stages without creating an actor hop. Scores derived from those objects describe position within this corpus only; they are not probabilities and must not be read as guilt by association.

## Query and publication behavior

The app searches actors, organizations, surfaces, chains, and clearly marked intake candidates from compiled artifacts. A candidate is a research question, not a graph claim.

For a connection result, publication-ready narration should identify:

- both actors and their documented roles;
- every shared surface used by the selected path;
- the overlap window and temporal precision;
- the evidence class and receipt IDs for each hop; and
- the standing forbidden-inference note.

If no valid path exists, the result is "not documented in this corpus," not proof that no relationship exists. If the compiler rejects a tempting surface because dates do not overlap, that refusal should be shown where practical.

## Intake and release workflow

Contributions propose candidate surfaces rather than generic associations. A proposed surface does not create a hop automatically.

1. Screen the candidate and its inference boundaries.
2. Resolve actors and organizations through canonical registries.
3. Add checkable receipts.
4. Add the bounded surface and participation rows.
5. Add supporting claims where needed.
6. Review hop eligibility, temporal overlap, and density.
7. Run `npm run release:check` before publication.

The release check is the minimum gate, not permission to overstate what a source proves. Human review remains responsible for evidence interpretation and public-language discipline.
