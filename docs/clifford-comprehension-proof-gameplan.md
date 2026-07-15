# Clifford Comprehension Proof Gameplan

Status: Phase-0 implementation plan. This document defines the first constrained comprehension harness and does not authorize newsroom mode or a public editorial route.

## Objective

The first proof target is the Dialog Society membership surface. The route must help an assessor understand what the roster establishes while preventing the roster from becoming a pathfinding surface. The route terminates with the exact result `bounded structural context; no pairwise hop.` and produces no alternative connection language.

The actors are the route builder, the independent assessor, the human adjudicator, the Dialog roster participants represented in the canonical ledger, and the maintainers responsible for evidence classes. The mechanism is a frozen route contract, deterministic ledger selection, pre-exposure prediction, constrained presentation, machine classification, and separate human adjudication.

## Route boundary

The route reads only the `dialog-society-membership` surface and the receipt metadata explicitly named by its contract. It may display bounded surface metadata, receipt metadata, and the terminal result. It may not invoke pathfinding, change a Clifford Number, emit printable output, produce newsroom narration, generate quotable narrative paragraphs, state a generalized connection, or link itself into the public interface.

Selection is deterministic. The route uses every actor participation on the source surface and orders the records lexicographically by actor identifier, participation type, and role. There is no randomness and no manual override. This makes selection bias visible and reproducible rather than leaving the route builder free to choose a persuasive subset.

## Evidence controls

The Dialog surface remains non-hop. The route contract checks the canonical surface and fails if `hop_eligible` changes from `false`. The contract also checks two load-bearing receipts independently: `wired-dialog-leak` must remain `reported`, and `dialog-directory-extract` must remain `primary_public`. Their coexistence does not collapse them into a single evidence class.

The initial neighboring-hop and control audit is empty by design. The route neither invokes nor summarizes another hop, score, control, or path. If a later iteration references any neighboring object, the contract must list that object and the implementation must record its evidence class before the route is evaluated again.

## Session protocol

Before exposure, the assessor records the expected terminal semantic class and timestamps the prediction. The assessor then declares whether they built the route, saw it previously, accessed an answer key, or coordinated with the builder. Any positive contamination declaration or missing pre-exposure prediction makes the packet inadmissible.

After exposure, the session records the exact terminal result and whether the presentation produced a path, score delta, printable artifact, newsroom narration, quotable narrative, generalized connection, pairwise hop, neighboring hop reference, or neighboring control reference. The semantic assessment records whether the assessor distinguished context from adjacency and rejected unsupported inferences about attendance, agreement, and wrongdoing.

The validator returns one of four states. Complete admissible packets become `READY_FOR_ADJUDICATION`; explicit semantic or capability violations become `FAIL`; unresolved admissible packets become `INCONCLUSIVE`; contaminated or procedurally defective packets become `INADMISSIBLE`. The validator never returns `PASS`.

## Regression fixtures

The positive fixture proves that a complete, uncontaminated packet reaches `READY_FOR_ADJUDICATION` without receiving a pass. The contamination fixture proves that prior exposure overrides an otherwise correct answer and produces `INADMISSIBLE`. The missing-prediction fixture proves that post hoc interpretation cannot enter the evidence set. The semantic-failure fixture proves that a roster-derived path, score change, or generalized connection produces `FAIL`. The inconclusive fixture proves that unresolved semantic fields do not become success by default.

The regression test also mutates the route contract and ledger in memory. It verifies that enabling pathfinding, adding a neighboring hop, changing the WIRED evidence class, leaking a path into a valid packet, or claiming automatic `PASS` is rejected deterministically.

## Acceptance criteria

The harness is complete when the route contract validates against the current ledger, the session validator classifies every fixture as declared, `npm run validate:comprehension` returns `READY_FOR_ADJUDICATION` for the positive fixture, the full test suite includes the comprehension regression test, and no public application or generated editorial artifact changes.

The implementation remains a harness until a separate governance decision authorizes another exposure surface. A public-facing route would require a recorded evidence-upgrade audit for every neighboring hop or control it references and either satisfaction of the existing phase gate or a written Section 8 amendment with a fixture demonstrating the revised acceptance criterion.

The controlling question is whether the route proves comprehension of a limitation without using the prohibited inference as the explanation that teaches the limitation.
