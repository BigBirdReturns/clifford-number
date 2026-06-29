# Contributing to The Clifford Number

This project accepts research contributions as candidate evidence, not as direct graph edits. The public graph is compiled from the maintainer-approved master doc. Contributors should not edit `graph.json`, `data/graph.base.json`, generated build reports, or app code unless the pull request is explicitly about tooling.

## What to submit

Submit one of three things:

1. A candidate edge: one sourced relationship between two public actors, institutions, documents, programs, companies, or events.
2. A source correction: a better receipt, changed evidence class, redaction concern, or broken link.
3. A topology question: a cluster, island, alias collision, or missing corridor that should be checked before it becomes an edge.

Use `contributions/templates/candidate-edge.md` and place your completed file in `contributions/inbox/`. Name it like this:

```text
contributions/inbox/2026-06-29-electric-twin-candidate.md
```

The maintainer will screen contributions, decide what fits, and move accepted material into `docs/clifford-number-master.md`. That is the only research ledger the compiler treats as authoritative.

## Required format for candidate edges

Use a markdown table with this shape:

```markdown
| Subject | Predicate | Object | Date / Status | Evidence Class | Source | Notes |
|---|---|---|---|---|---|---|
| Person or org | `predicate-name` | Person, org, document, event, or program | 2026 or current | reported | URL or citation description | Why this edge matters |
```

Use one row per proposed edge. Keep the relationship narrow. Do not collapse a whole argument into one edge.

## Evidence classes

Use `official` for government, regulator, court, company filing, procurement, or other primary institutional records.

Use `primary_public` for direct public source material, public directories, company pages, profile pages, public rosters, public source HTML, or public documents.

Use `reported` for journalism, public reporting, interviews, or credible secondary accounts.

Use `derived` only when the ingredients are sourced but the edge is analytical. Derived edges should explain exactly what has been inferred.

Use `judgment` for classification, not for a standalone factual claim.

Use `open` when the row is a placeholder, unresolved, disputed, not sourced enough, or not ready for publication. `open` rows are allowed in research drafts but are not published into the live graph.

## Privacy and safety rule

Do not submit private contact details, personal addresses, raw registrant records, intimate questionnaire data, family details, medical or psychological claims, private emails, phone numbers, or private-person targeting material. The graph is public-role-only.

A public listing is not proof of attendance. Attendance is not proof of agreement. Proximity is not proof of wrongdoing. Use the narrowest status the source supports.

## Local checks

After editing the master doc or tooling, run:

```bash
npm run release:check
```

For research-only review, run:

```bash
npm run compile
npm run scout
```

`npm run compile` rebuilds `graph.json` from `data/graph.base.json` and `docs/clifford-number-master.md`. `npm run scout` writes candidate findings to `findings/scout-inbox/` and never changes the graph.

## Maintainer merge rule

A contribution is merged only when the maintainer decides it belongs in the master doc. The compiler does not decide what matters. The scout does not decide what matters. Contributors do not get direct write access to the published graph by changing generated files.
