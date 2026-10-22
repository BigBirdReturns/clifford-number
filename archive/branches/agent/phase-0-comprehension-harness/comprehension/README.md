# Phase-0 Comprehension Harness

This directory contains an isolated protocol for testing whether an independent assessor understands that the Dialog Society roster is bounded structural context and cannot create a pairwise Clifford Number hop. It is not a public route, a newsroom surface, a printable product, or a redesign of the existing application.

The route contract is `routes/dialog-structural-context.json`. It freezes the source surface, the exact terminal result, deterministic selection, blocked capabilities, empty neighboring-hop and control audit, evidence-class requirements, and permitted validator states. The terminal result is `bounded structural context; no pairwise hop.`

The session fixtures exercise every validator state. `session-ready-for-adjudication.json` is admissible and complete. `session-contaminated.json` and `session-missing-prediction.json` are inadmissible. `session-semantic-failure.json` fails because it converts the roster into a path and score change. `session-inconclusive.json` is admissible but lacks enough resolved semantic evidence.

Run the positive packet through the command-line validator:

```bash
npm run validate:comprehension
```

Validate another packet directly:

```bash
node tools/validate-comprehension-session.mjs path/to/session-packet.json
```

Require a packet to reach the adjudication queue:

```bash
node tools/validate-comprehension-session.mjs path/to/session-packet.json --require-ready
```

The validator checks the route against the canonical ledger before classifying a packet. It fails the route if the Dialog surface becomes hop-eligible, if `wired-dialog-leak` is no longer `reported`, if `dialog-directory-extract` is no longer `primary_public`, if a blocked capability is enabled, or if the neighboring audit becomes non-empty without a contract change.

A valid output has `automatic_pass: false`. `READY_FOR_ADJUDICATION` means only that a human adjudicator may review the session. The validator does not decide that independent comprehension has been proven.
