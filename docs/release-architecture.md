# Release Architecture

The first-release architecture separates the research ledger, compiler, scout, and public app.

## Authority model

`docs/clifford-number-master.md` is the research ledger. It is the only place approved research rows live.

`data/graph.base.json` is the base seed graph. It contains the stable hand-built graph that existed before the master-doc compiler layer.

`tools/compile-master.mjs` is the clerk. It rebuilds `graph.json` from `data/graph.base.json` plus the master doc. It does not read yesterday's `graph.json` as input. If a row is removed from the master doc, the generated edge disappears on the next compile.

`tools/scout-graph.mjs` is the analyst. It reads the graph and produces candidate findings in `findings/scout-inbox/`. It never writes graph data and every finding has `graph_effect: none`.

`graph.json` is generated release data for the app. It should be reproducible from the base graph and master doc.

## Normal workflow

```bash
npm run compile
npm run scout
npm run check
```

For the full release gate:

```bash
npm run release:check
```

## Ingesting more research

Add approved rows to `docs/clifford-number-master.md` using typed-edge tables. Then run `npm run compile`. If the new nodes do not connect to the Clifford spine, run `npm run scout` and inspect `findings/scout-inbox/` for islands, alias collisions, corridor gaps, and source questions.

Do not patch paths into the compiler. If a bridge exists, write the bridge as a sourced row in the master doc. If a bridge does not exist yet, the node should remain an island.

## Contributor intake

External contributions go into `contributions/inbox/` using `contributions/templates/candidate-edge.md`. They are not graph data until the maintainer screens them and moves accepted rows into the master doc.
