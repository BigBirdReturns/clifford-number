# Research Intake Guide

Use this guide when adding new material to the database.

## Step 1: Capture the candidate

Put outside contributions or your own raw candidate notes into `contributions/inbox/` first when they are not ready for the master doc. Use the template. Keep each proposed edge narrow.

## Step 2: Screen the edge

Ask five questions:

1. Who are the actors?
2. What exact public relationship is being claimed?
3. What source supports that exact relationship?
4. Is this personnel, policy, funding, governance, advisory, access, document, or topology context?
5. Does this create a path, explain a corridor, or only create an island for later work?

## Step 3: Move accepted rows into the master doc

Accepted rows go into `docs/clifford-number-master.md`. Use a typed-edge table with `Subject`, `Predicate`, `Object`, `Date / Status`, `Evidence Class`, `Source`, and optional notes when useful.

## Step 4: Compile

```bash
npm run compile
```

This rebuilds `graph.json` from the clean base and master doc. The compiler does not infer missing bridge edges.

## Step 5: Scout

```bash
npm run scout
```

Review `findings/scout-inbox/`. The scout is allowed to say what looks missing, duplicated, aliased, or structurally interesting. Scout output is not graph data.

## Step 6: Release check

```bash
npm run release:check
```

This compiles, validates, runs tests, and generates a scout run.
