# The Clifford Number

**Not conspiracy. Topology.**

The Clifford Number is a public graph experiment that maps evidenced institutional adjacency across UK AI policy, founder networks, consultancy pathways, procurement pathways, and public-sector operating layers.

It works like an Erdős number or Bacon number. Enter a name. The app returns the shortest evidenced path to the Clifford policy machine, plus the receipts for every hop.

This is an AXM Labs topology experiment, not AXM core. AXM core is execution provenance and constraint analysis. This repo borrows the method for a public civic graph: typed claims, sourced edges, confidence classes, scout findings, and redaction discipline.

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
npm run compile
npm run check
npm run serve
```

Then open `http://localhost:8080`.

The app is static. The browser reads `graph.json`, searches nodes, and computes the shortest evidenced path to the target node.

## First-release architecture

The release architecture has two separate tools with different authority.

`tools/compile-master.mjs` is the compiler. It rebuilds `graph.json` from `data/graph.base.json` and `docs/clifford-number-master.md`. It does not read yesterday's `graph.json` as input, so removed or corrected master-doc rows disappear on the next compile.

`tools/scout-graph.mjs` is the scout. It attacks the compiled graph and writes candidate findings to `findings/scout-inbox/`. It never edits the master doc and never writes graph data. Scout findings always have `graph_effect: none`.

For the full release gate:

```bash
npm run release:check
```

That compiles, validates, runs tests, and generates a scout run.

## Ingest more research

Approved research goes into `docs/clifford-number-master.md` as typed-edge table rows. Then run:

```bash
npm run compile
npm run scout
```

If a node does not connect to the Clifford spine, that is not automatically a bug. It means the master doc does not yet contain an explicit sourced path. Add the bridge only when you have the actual sourced row.

Do not hand-edit generated graph output as the source of truth. `graph.json` is release data. The master doc is the ledger.

## Contribute research

Contributions are welcome as candidate research packets, not direct graph edits.

Use `contributions/templates/candidate-edge.md`, place the completed file in `contributions/inbox/`, and include sources. The maintainer screens incoming material and moves accepted rows into `docs/clifford-number-master.md`.

Read `CONTRIBUTING.md` and `docs/research-intake.md` before submitting.

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

Legacy import and promote tools remain in the repo for reference, but the first-release path is `npm run compile`, not promotion from an import queue.

## Repo layout

```txt
clifford-number/
  index.html                         # Static GitHub Pages app
  styles.css                         # Visual language
  app.js                             # Browser UI
  graph.json                         # Generated public release graph
  cases.json                         # Browser/MCP case manifest
  data/
    graph.base.json                  # Stable base graph used by compiler
    canonical/
      aliases.json                   # Explicit label alias mappings
      entities.json                  # Explicit entity metadata and type overrides
    scout/
      corridors.json                 # Scout corridor seeds
  docs/
    clifford-number-master.md        # Authoritative research ledger
    release-architecture.md
    research-intake.md
    methodology.md
    redaction-policy.md
    mcp.md
    definitions.md
    edge-schema.md
  contributions/
    inbox/                           # Candidate research packets
    templates/candidate-edge.md
  findings/
    scout-inbox/                     # Generated scout findings
  build/
    compile-report.md                # Generated compiler report
    compile-report.json
    unresolved.json
  src/
    graph.js                         # Search and shortest-path logic
    scoring.js                       # Path score and confidence labels
    evidence.js                      # Evidence taxonomy and redaction guard
    validate.js                      # Schema and safety validation
  test/
    graph.test.js                    # Node test suite
  receipts/
    dialog-human-layer.md
    uk-ai-policy-seed.md
  tools/
    compile-master.mjs               # Clerk compiler
    scout-graph.mjs                  # Analyst scout
    add-edge.mjs
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

## Redaction rule

The public graph may include public professional roles and institutional relationships. It may not include private contact data, intimate questionnaire answers, raw registrant records, psychological claims, or private-person targeting.

The graph is supposed to be funny because the topology is obvious. It is not supposed to be reckless.

## Publication rule

Every edge should survive this question:

```txt
Can every laugh survive a receipts click?
```

If not, cut the edge or mark it `open` until the receipt is ready.
