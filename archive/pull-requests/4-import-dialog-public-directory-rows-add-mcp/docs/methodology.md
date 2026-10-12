# Methodology

The Clifford Number is the shortest evidenced path from a public node to the Clifford Policy Machine.

## Workflow

1. Add only public-role nodes: people, organizations, policy documents, government offices, forums, or infrastructure layers.
2. Connect nodes with typed edges. Avoid vague predicates such as “associated with.”
3. Attach source IDs for every edge.
4. Keep `listed`, `registered`, and `attended` separate.
5. Run `npm run check` before publishing.

## Search behavior

The web app searches node labels, IDs, aliases, types, descriptions, and tags. If a name is present and connected, the app returns the shortest path to the Clifford Policy Machine. If a name is absent, the app makes no adjacency claim.

## Boundary

No wrongdoing is alleged. The graph maps public institutional topology, not intent, ideology, character, or private life.

## Recurring update sweeps

The repository includes an update sweep script for finding public-role gaps without importing private or unsourced material:

```bash
npm run sweep
```

The sweep checks that the 113-row Dialog directory import remains covered, surfaces needs-review rows from the master docs, checks configured public-role watchlist candidates in `data/update-watchlist.json`, and lists organizational/company/forum nodes that do not yet have a person edge. The scheduled GitHub Action runs this weekly and uploads `docs/update-sweep.md` as an artifact. The report is a review queue, not an automatic importer.
