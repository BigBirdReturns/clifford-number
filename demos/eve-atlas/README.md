# EVE-style visualization demonstrations

This directory contains three isolated display prototypes for The Clifford Number. They are projections over the existing compiled artifacts and do not modify canonical identity, hop derivation, evidence classes, temporal rules, publication status, or graph effect.

## Demonstrations

1. **Semantic zoom atlas.** The representation changes from corpus-level surface families to surface types, bounded surfaces, and exact participation rows. Selection persists across levels.
2. **Tactical route.** A filtered shortest-path query renders every actor-to-actor step through the named bounded surface that permits it. Evidence-floor and time controls can block the route without changing the underlying Clifford Number definition.
3. **Dense-surface overview.** Large rosters remain bounded containers. Role groups, a fixed bracket budget, search, evidence filters, dates, and pinned actors replace all-to-all adjacency.

## Run

From the repository root:

```bash
npm run compile
npm run serve
```

Then open:

```text
http://localhost:8080/demos/eve-atlas/
```

When compiled artifacts are unavailable, the page falls back to an embedded fixture so the interaction design can still be reviewed. The fixture is visibly labeled and has no publication meaning.

## Files

- `index.html`: accessible shell and the three panels.
- `styles.css`: shared visual grammar for aggregates, surfaces, actor brackets, routes, evidence states, and overview tables.
- `demo-core.mjs`: pure projection, filtering, pathfinding, temporal, density, and budgeting functions.
- `sample-data.mjs`: an explicitly non-canonical fallback fixture.
- `app.mjs`: browser rendering and interaction.

The core control question is whether each primitive helps the reader identify the bounded object, participating actors, valid period, evidence floor, and inference limit without asserting anything the ledgers do not.
