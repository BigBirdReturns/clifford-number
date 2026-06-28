# MCP Server

The repo includes a local Model Context Protocol (MCP) stdio server so MCP-capable clients can query the public Clifford graph as tools.

## Run locally

```bash
npm run mcp
```

The server reads `graph.json` by default. Set `CLIFFORD_GRAPH_PATH=/absolute/path/to/graph.json` to point at another graph file.

## Tools

### `clifford_number`

Input:

```json
{ "query": "Elizabeth Blackburn" }
```

Returns the matched public node, whether a sourced path exists, the Clifford Number, path text, evidence confidence, weakest evidence class, hops, claims, notes, and sources. If no node matches, it returns `adjacent: false` and explicitly says the tool cannot claim adjacency.

### `search_clifford_nodes`

Input:

```json
{ "query": "OpenAI", "limit": 5 }
```

Returns matching public graph nodes.

### `get_clifford_node`

Input:

```json
{ "query": "matt-clifford" }
```

Returns a single public graph node by label, alias, or ID.

## Client configuration example

Use the package from a checkout:

```json
{
  "mcpServers": {
    "clifford-number": {
      "command": "node",
      "args": ["/absolute/path/to/clifford-number/src/mcp-server.js"]
    }
  }
}
```

Or use the npm binary from the repository root:

```json
{
  "mcpServers": {
    "clifford-number": {
      "command": "npm",
      "args": ["run", "mcp"]
    }
  }
}
```

## Important boundary

This does not make the graph available to every LLM automatically. It works in MCP-capable hosts that let you configure a stdio MCP server. The model can then call the listed tools through that host.
