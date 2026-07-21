# Reporter briefings

A reporter briefing is a finite public projection of a compiled case. It is not a second evidence ledger and it is not an AI-generated conclusion.

## Publication sequence

```text
case receipts and claims
→ compiled case
→ claim-referenced briefing specification
→ deterministic HTML briefing
→ compiled briefing manifest
→ review queue
→ Pages and portable-case verification
```

The source contract is `reporter-briefing@1`, documented in `schemas/reporter-briefing.schema.json`. A case opts in by adding `cases/<case-id>/briefing.json` and matching `case.briefing` metadata.

## Hard rules

1. Every factual briefing thread references one or more existing case claim IDs. The compiler renders the claim's exact `plain` text, status, and qualification; the briefing cannot maintain a second factual sentence that drifts away from the ledger.
2. A briefing may contain editorial orientation, ordinary-language translations, and records targets, but those elements cannot create claims, findings, topology edges, scores, or conclusions.
3. `graph_effect` is always `none`, and `conclusion_generated` is always `false`.
4. A verified claim keeps its public receipt. A review-required claim stays visibly review-required. Mixed threads remain mixed.
5. The publication history is append-only by version. The current version and status must match the latest history entry. An `approved` briefing requires a named reviewer and review date.
6. The portable standalone contains the compiled evidence case but suppresses links to external briefing pages.

## Generated artifacts

```text
briefs/<case-id>.html
build/briefings/<case-id>.json
build/briefings/index.json
build/review/reporter-briefing-queue.json
```

The per-briefing manifest records claim and receipt IDs, status counts, output routes, graph effect, and SHA-256 digests of the source specification, compiled case, and emitted HTML. The review queue records why a briefing is not approval-ready without promoting it or changing its case status.

## Reader contract

The finite briefing answers four questions in order:

1. What is the working proposition?
2. What does the opened record establish?
3. What does it not establish?
4. Which record would decide the stronger question?

The evidence case remains the source room underneath it. Every public claim can be opened to inspect dates, evidence class, causal status, qualification, and receipts.

## Adding another briefing

1. Compile and review the case ledger first.
2. Add `briefing.json` with a stable route, two orientation axes, claim-referenced threads, ordinary-language translations, publication history, and a records target.
3. Run `npm run compile` and `node test/reporter-briefing.test.js`.
4. Build Pages and standalone output and run `npm run validate:pages`.
5. Run the `Reporter briefing publication contract` workflow. It verifies desktop, mobile, the evidence dialog, public receipt links, and portable-case behavior in Chromium.

Do not copy prose from a dossier into a briefing and cite the dossier as a substitute for the underlying record. Dossiers remain intake and synthesis artifacts; factual public briefing content must resolve to case claims and receipts.
