# The Clifford Number

**Not conspiracy. Topology.**

The Clifford Number is a small public graph experiment that maps evidenced institutional adjacency across UK AI policy, founder networks, consultancy pathways, procurement pathways, and public-sector operating layers.

It works like an Erdős number or Bacon number. Enter a name. The app returns the shortest evidenced path to the Clifford policy machine, plus the receipts for every hop.

This is an AXM Labs topology experiment, not AXM core. AXM core is execution provenance and constraint analysis. This repo borrows the method for a public civic graph: typed claims, sourced edges, confidence classes, and redaction discipline.

No wrongdoing is alleged. No private personal data is used. No intimate leaked data is reproduced. A name in a leaked or reported directory is not treated as proof of attendance. Listed, registered, and attended remain separate states.

## Demo copy

```txt
The Clifford Number

Seven degrees of UK AI state capture, with receipts.

Enter a name. Get the shortest evidenced path to the Clifford policy machine.

Not conspiracy. Topology.
```

## Quick start

```bash
npm run check
npm run serve
```

Then open `http://localhost:8080`.

No build step is required for local development. The GitHub Pages workflow validates the graph, assembles a static `dist/` artifact with `index.html`, `app.js`, `styles.css`, `graph.json`, `src/`, `assets/`, `docs/`, and `receipts/`, then deploys it. After the Pages action succeeds, open the Pages URL, type a name, and the browser computes the path from the deployed `graph.json`.

## MCP tool server

You can expose the graph to MCP-capable LLM hosts with the bundled stdio server:

```bash
npm run mcp
```

The server provides `clifford_number`, `search_clifford_nodes`, and `get_clifford_node` tools. It does not make the graph available to every LLM by itself; the LLM host must support MCP and be configured to launch this server. See `docs/mcp.md` for client configuration examples.


## Case manifest and update gates

The static app can load multiple public graph cases through `cases.json`. The default case is the UK AI policy graph; `cases/template.json` is a safe shell for future public-interest topology maps.

Use the update sweep to generate an audit report of evidence classes, statuses, watchlist items, and edges that need stronger notes:

```bash
npm run sweep
```

Use the v3 master importer only as a queue generator. It does not mutate `graph.json`; it sorts candidate rows into ready, review, verify, hold, and reject buckets before any public promotion:

```bash
npm run import:master:v3 -- path/to/clifford-number-master-v3.md data/import-queues/master-v3.import-queue.json
```

## Repo layout

```txt
clifford-number/
  index.html              # Static GitHub Pages app
  styles.css              # Visual language
  app.js                  # Browser UI
  graph.json              # Public seed graph
  cases.json              # Browser/MCP case manifest
  src/
    graph.js              # Search and shortest-path logic
    scoring.js            # Path score and confidence labels
    evidence.js           # Evidence taxonomy and redaction guard
    validate.js           # Schema and safety validation
  test/
    graph.test.js         # Node test suite
  cases/
    uk-ai-policy.json     # Same seed graph, saved as case data
    template.json         # Reusable safe case shell
  docs/
    methodology.md
    redaction-policy.md
    mcp.md
    definitions.md
    edge-schema.md
  receipts/
    dialog-human-layer.md
    uk-ai-policy-seed.md
  tools/
    add-edge.mjs
    import-dialog-public-directory.mjs
    import-master-v3.mjs
    update-sweep.mjs
```

## Evidence classes

`confirmed` means primary source or tier-one reporting supports the claim directly.

`primary_public` means public source material, such as a public directory extract or source HTML, supports the claim directly.

`reported` means credible reporting or a public profile supports the claim, but the repo has not independently confirmed the primary record.

`derived` means the ingredients are sourced and the edge is an analytic inference from structure.

`judgment` means the edge is an interpretive classification. It can help the map, but it is not a standalone factual claim.

`open` means the edge is not publication-ready.

## Edge statuses

`listed` means a name appears in a directory or list. It does not prove attendance, agreement, knowledge, guilt, or wrongdoing.

`registered` means a person or organization is reported as registered. It is still separate from attendance.

`attended` means a source says the person attended.

`appointed`, `published`, `contracted`, and `public-role` mean the edge is tied to a public institutional role or record.

## Add a node and edge

Use the helper script:

```bash
node tools/add-edge.mjs graph.json \
  --from new-person \
  --from-label "New Person" \
  --from-type person \
  --to matt-clifford \
  --type public-collaboration \
  --claim "Short sourced claim." \
  --source gov-ai-action-plan \
  --evidence reported \
  --status reported
```

Then run:

```bash
npm run check
```

## Redaction rule

The public graph may include public professional roles and institutional relationships. It may not include private contact data, intimate questionnaire answers, raw registrant records, psychological claims, or private-person targeting.

The graph is supposed to be funny because the topology is obvious. It is not supposed to be reckless.

## Publication rule

Every edge should survive this question:

```txt
Can every laugh survive a receipts click?
```

If not, cut the edge or mark it `open` until the receipt is ready.
