# Definitions

These definitions describe the current bounded surface-hop model. [`BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) is governing; [`methodology.md`](methodology.md) explains how the terms work together.

## Actor

A public person represented in the canonical actor registry. Only actors can be endpoints of Clifford Number hops.

## Organization

A public institution, company, office, department, forum, or other organization represented in the canonical organization registry. An organization can participate in or contain surfaces, but it does not create an actor-to-actor hop by itself.

## Case anchor

The actor against whom a case's default Clifford Numbers are computed. The current compiled case uses Matt Clifford. A two-person query may use another actor as its destination without changing the hop rule.

## Clifford Number

The number of actor-to-actor hops in the shortest evidenced path from an actor to the case anchor. The anchor has Clifford Number 0. `N/A` or `null` means that no valid path has been documented in the compiled corpus; it does not prove that no relationship exists.

## Surface

A named object that bounds participation: for example, a board, appointment record, policy document, funding round, contract, programme, filing, event, or dated roster. A surface records its type, scope, dates, receipts, eligibility, and participant rows.

## Bounded surface

A surface whose scope is specific enough that a stranger can identify what the object is, who is documented on it, during what period, and from which receipts. A broad institution, sector, policy area, or general social proximity is not bounded.

## Participation

A ledger row linking an actor or organization to a surface with a documented role, participation type, dates where available, evidence class, and receipt IDs. Participation language must not claim more than the receipt proves.

## Hop basis

One shared, hop-eligible surface that supports adjacency between two actors. A basis includes the actors' roles, evidence class, receipts, temporal status, and the intersection of the relevant date windows.

## Hop

An actor-to-actor adjacency derived from at least one valid hop basis. A hop asserts documented shared context only. It does not assert contact, influence, coordination, agreement, endorsement, guilt, or wrongdoing.

## Path

An ordered sequence of actor hops. A shortest path has the fewest valid hops under the selected all-time or time-sliced query. Equal-length paths may differ in evidence quality or legibility without changing the Clifford Number.

## Claim

A discrete sourced fact preserved in the claims ledger. Claims support research and narration, but claims do not create Clifford Number hops directly; hops are generated from surfaces and participation rows.

## Receipt

A record identifying the material that supports a claim, surface, participation, or editorial profile sentence. It includes a source label, provenance, evidence class, path or URL, and archival information where available. A receipt ID without resolvable underlying evidence is a documented limitation, not complete verification.

## Evidence class

A label describing the kind of source support carried by a ledger row, such as official, primary public, reported, derived, judgment, or open. Evidence class is not a probability and does not erase source-specific caveats. The exact class and its receipt must travel with publication-critical output.

## Validity window

The period during which a participation or hop basis is documented to be valid. A hop basis uses the intersection of the surface window and both actors' participation windows.

## Temporal precision

The precision supplied by the source: year, month, or day. A year or month is widened to the full period it names. Missing precision is never invented.

## Undated participation

A participation for which the source does not provide a usable date. It may appear in all-time topology but cannot support a time-sliced query.

## Rejected hop pair

Two actors who are documented on the same surface but whose dated participation windows do not overlap. The compiler records the rejected pair and creates no hop through that surface.

## Hop-eligible

A surface classification permitting actor hops when all receipt, participation, temporal, and density requirements are met. The flag is necessary but not sufficient: release invariants can still disqualify a basis.

## Scorable non-hop surface

A bounded surface that can contribute to recurrence, chain, or contextual analysis but cannot create Clifford Number hops.

## Context-only surface

A surface retained to explain the case without creating hops or being treated as a direct relationship claim.

## Scout or intake candidate

A possible surface exposed for research review. It has no graph effect until receipts, canonical identities, participation rows, and eligibility have passed the promotion process.

## Dense surface

A surface with enough participants that all-to-all actor adjacency would have low individual signal or collapse the graph's discriminating power. Large rosters, directories, cohorts, and rankings are non-hop by default until explicitly reviewed under the density rule.

## Surface factory

An organization that repeatedly produces distinct bounded surfaces. The organization itself is not a hop; each qualifying board, round, programme, contract, or other bounded object is evaluated separately.

## Surface-type recurrence

The appearance of the same documented surface logic across multiple bounded surfaces. Recurrence is a pattern signal independent of the Clifford Number and does not create a hop by itself.

## Multi-stage chain

An analytical sequence of documented stages, such as policy creation, procurement, personnel movement, and commercial deployment. A chain can describe structural position without actor co-presence and therefore can have no Clifford Number effect.

## Listed

A source says a name appeared on a list or directory. This does not by itself prove attendance, membership, contact, endorsement, agreement, knowledge, guilt, or wrongdoing.

## Registered

A source says a person or organization registered for an event. Registration does not prove attendance.

## Attended

A source says a person or organization attended a bounded event. Attendance does not prove contact with every other attendee, coordination, endorsement, or agreement.

## Derived

An inference produced from sourced facts rather than stated directly by a source. It must be labeled, traceable, reversible, and kept distinct from primary-source fact.

## Legacy edge graph

The superseded generic node-edge model retained for research history and limited search continuity. Its nodes and edges do not define current surface-hop Clifford Numbers.
