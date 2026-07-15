# Independent Comprehension Evidence Standard

Status: Phase-0 protocol document. This standard is subordinate to `BUILD-INSTRUCTIONS.md` and does not amend the release phases, the constitutional invariants, or the evidence classes used by the canonical ledgers.

## Purpose

This standard defines when a comprehension session may be used as evidence that a reader understood a constrained Clifford Number output. The object under test is comprehension of a route contract, not the truth of the underlying source material and not the editorial quality of a public product. A session must show that an independent assessor can distinguish bounded structural context from a pairwise hop without receiving a hidden explanation from the builder.

A validator may establish that a packet is admissible, complete, and ready for human adjudication. It must never award an automatic `PASS`. Human adjudication remains a separate act because comprehension evidence depends on the assessor's response, the testing conditions, and the interpretation of semantic errors.

## Evidence ledger

The evidence tier is protocol-level operational evidence. The venue is an isolated Phase-0 comprehension session. The target is the assessor's understanding of the route's inference boundary. The upside is a reproducible record that the output communicates its intended limitation. The downside is that a well-formed packet can still conceal coaching, prior exposure, or shallow pattern matching. The principal failure mode is treating validator compliance as proof of independent comprehension.

Four evidence layers must remain distinct. Source evidence establishes the facts displayed by the route and retains the canonical receipt classes. Implementation evidence establishes that prohibited capabilities are blocked in code and contract. Session evidence records the prediction, exposure, response, and contamination declarations. Adjudication evidence records a human finding after reviewing the admissible packet. No layer substitutes for another.

## Admissibility conditions

A session is admissible only when the route contract is frozen before exposure, the assessor records a prediction before seeing the route output, and the assessor declares whether they built the route, saw the answer key, reviewed the route previously, or coordinated with the builder. A missing prediction, a prediction recorded after exposure began, an undeclared independence field, or a positive contamination flag makes the packet `INADMISSIBLE`.

The prediction is not a guess about whether the assessor will succeed. It is a pre-exposure statement of the terminal semantic class the route is expected to communicate. For the first Dialog route, that class is bounded structural context with no pairwise hop. Recording this before exposure prevents the expected interpretation from being retrofitted to the observed answer.

## Semantic conditions

A semantically successful response must preserve the route's exact terminal result and demonstrate all of the following distinctions: roster membership is context rather than a path; roster membership cannot create, complete, shorten, or imply a pairwise hop; membership does not establish attendance at a particular event; membership does not establish agreement, coordination, motive, or wrongdoing; and no neighboring hop or control is silently imported into the explanation.

A response that produces a path, changes a Clifford score, states a generalized connection, or converts roster membership into pairwise adjacency is `FAIL`. A response that avoids those errors but leaves one or more required distinctions unresolved is `INCONCLUSIVE`. A response that satisfies the admissibility and semantic completeness gates is `READY_FOR_ADJUDICATION`.

## Validator states

`READY_FOR_ADJUDICATION` means the packet is admissible and semantically complete enough for a human reviewer to decide the evidentiary finding. It is not a pass result. `FAIL` means the admissible session contains a prohibited output or an explicit semantic error. `INCONCLUSIVE` means the session is admissible but the response is incomplete, unavailable, or too uncertain to support a finding. `INADMISSIBLE` means the protocol conditions do not permit the session to be considered, regardless of the apparent answer.

The validator must set `automatic_pass` to `false` for every state. A packet that attempts to assert `PASS` is itself inadmissible because it collapses protocol validation and adjudication into one machine decision.

## Deterministic selection and neighboring evidence

Every route must declare how its displayed records are selected and ordered. Randomness, discretionary curation after prediction, and undisclosed manual overrides are prohibited. The declaration must be sufficient for another maintainer to reconstruct the same input from the same ledger state.

Every route must also declare the neighboring hops and controls it references. An empty audit is valid when the route displays only its source surface, its own receipts, and its terminal result. The empty audit must be explicit. This prevents a non-hop route from borrowing persuasive force from adjacent weak or reported hops without recording that dependency.

## Dialog evidence classes

The first route is bound to `dialog-society-membership`, which must remain `hop_eligible: false`. The WIRED roster reporting remains `reported`. The public directory extract remains `primary_public`. A route contract that upgrades, merges, or obscures either evidence class fails validation. The route may display both receipts while preserving their distinct evidentiary roles.

## Phase boundary

This protocol authorizes a local or limited comprehension harness only. It does not authorize a public editorial route, printable artifact, newsroom narration, quotable paragraph, generalized connection output, or public UI linkage. A public-facing route requires the governing phase conditions to be satisfied or an explicit amendment under Section 8 of `BUILD-INSTRUCTIONS.md`, with rationale and a fixture for the changed acceptance criterion.

## Required record

A retained session packet must contain a stable session identifier, route and contract versions, the pre-exposure prediction and timestamps, independence and contamination declarations, the captured presentation behavior, the semantic assessment, and the completeness declaration. The packet may contain fixture metadata for regression testing, but fixture expectations do not participate in classification.

The controlling question is whether an independent assessor understood the bounded context and the no-hop boundary under conditions that prevent the builder from supplying the answer after the fact.
