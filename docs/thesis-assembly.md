# Thesis assembly: propositions, counterevidence, and receipts

The Clifford Number can map topology without producing an argument. A thesis requires a second discipline: it must state what is being tested, what would weaken or falsify it, which ordinary explanations remain plausible, which case universes were searched, and how every factual sentence resolves to receipts.

This layer is deliberately separate from the actor/surface graph. It has `graph_effect: none` and cannot create a hop, score, canonical claim, or conclusion.

## Research object

The current program tests whether public records support a bounded thesis about **synthetic populations, state transfer, and modelled publics**: whether synthetic-population and synthetic-audience systems are becoming an infrastructural layer across public and private decision processes through recurring pathways of state-to-market continuity, legitimacy, deployment, technical substrate, and capital—and where modelled publics supplement or replace observed people.

That wording is provisional. The system must be equally capable of producing a supported human argument, a weakened or contested argument, or an inconclusive thesis.

## Files

- `data/research/theses/<thesis-id>.json` — the working thesis, case index, propositions, falsifiers, alternatives, denominator requirements, chapter plan, and review gates.
- `data/research/thesis-evidence/<thesis-id>.json` — proposition-scoped packets and declared gaps.
- `data/research/thesis-reviews/<thesis-id>.json` — independent selection, methods, claim, synthesis, and release review records.
- `build/thesis/<thesis-id>.json` — deterministic compiled assembly state.
- `build/thesis/<thesis-id>.md` — a working dossier containing questions, counts, falsifiers, alternatives, gaps, and review states. It is not publication-ready prose.

## Evidence relations

Every packet has exactly one relation:

- `supports` — a reviewed, receipted observation that bears positively on one proposition.
- `weakens` — a reviewed, receipted observation that reduces the proposition’s scope or plausibility.
- `contradicts` — a reviewed, receipted observation incompatible with the proposition as written.
- `context` — useful factual or structural context that does not count as support.
- `coverage` — source availability, denominator progress, or attrition; never support.
- `null_result` — a bounded query outcome. It requires the exact query scope and source status and cannot be narrated as universal absence.

Support, contradiction, context, and coverage are never collapsed into one score.

## Machine ceiling

The compiler can assign only:

- `open_no_evidence_packets`
- `collecting_evidence`
- `contested_pending_human_synthesis`
- `eligible_for_human_synthesis`

It cannot emit `supported`, `proved`, `confirmed thesis`, or a bottom-line verdict. “Eligible” means only that the declared packet-count, case-diversity, source-diversity, challenge-evidence, review, and selection gates have been satisfied sufficiently for a human to write and defend an argument.

## Packet requirements

A support, weakening, or contradiction packet must carry:

- a stable packet ID;
- thesis, proposition, and case IDs;
- a factual summary;
- source paths and source families;
- receipt IDs resolvable in the repository ledger;
- evidence class;
- human review status;
- dated bounds whenever the statement is temporal;
- allowed language and forbidden inference where scope could be misread;
- `graph_effect: none`.

A case contract or GitHub issue is not an evidence packet. A topology path is not an evidence packet. A generated export is not an evidence packet.

## Falsification and ordinary explanations

Every proposition declares:

- at least one falsifier;
- at least one alternative explanation;
- denominator and comparator requirements;
- forbidden inferences;
- minimum distinct case and source-family thresholds;
- whether counterevidence or a bounded null test is required.

A proposition with only supporting packets cannot become synthesis-eligible. The compiler requires challenge material because a thesis that never records contrary evidence is not auditable.

## Cross-case synthesis

The infrastructure proposition is a meta-proposition. It cannot activate because the same actor, institution, vendor, adviser, or investor recurs in several cases. It depends on independently compiled propositions whose own denominators, receipts, temporal rules, ordinary controls, and review gates have been satisfied.

Cross-case recurrence remains structural context. It does not create an actor-to-actor hop and does not prove coordination, common control, motive, or causation.

## Review

CI proves only that the declared contracts are internally consistent and reproducible. It is not independent review.

The thesis requires distinct reviews of:

1. selection and comparator universes;
2. methods and source attrition;
3. claim-level packet wording and receipt roles;
4. cross-case synthesis and alternative explanations;
5. the final release.

An author cannot be represented as the independent reviewer of their own declaration. Adverse, contested, pending, and inconclusive review states remain visible.

## Commands

```text
npm run compile:thesis
npm run validate:thesis
node test/thesis-assembly.test.js
```

The compiler is deterministic by default: `generated_at` derives from the evidence registry’s `captured_at`. Set `CLIFFORD_THESIS_GENERATED_AT` only when a controlled release needs a different reproducible timestamp.

## Current state

The initial synthetic-population thesis contains eighteen case contracts and six propositions but zero promoted evidence packets and zero independent reviews. Its correct machine state is `assembly_open_no_evidence_packets`. That is a progress statement about the repository, not evidence that the thesis is true or false.
