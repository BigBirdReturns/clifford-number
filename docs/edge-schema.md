# Edge schema

Each edge in `graph.json` follows this shape:

```json
{
  "id": "e-example",
  "from": "source-node-id",
  "to": "target-node-id",
  "type": "public-role-link",
  "claim": "Short sourced claim.",
  "source_ids": ["source-id"],
  "evidence_class": "reported",
  "status": "listed",
  "weight": 1,
  "notes": "Optional caution or boundary note."
}
```

## Required fields

`id` must be unique.

`from` and `to` must match node IDs.

`type` should classify the relationship, not dramatize it.

`claim` must be short and auditable.

`source_ids` must reference existing sources in `graph.json`.

`evidence_class` must be one of `confirmed`, `primary_public`, `reported`, `derived`, `judgment`, or `open`.

`status` must be one of `published`, `reported`, `listed`, `registered`, `attended`, `appointed`, `contracted`, `derived`, or `public-role`.

## Direction

The browser computes undirected shortest paths by default because institutional adjacency often matters both ways. The source and target direction still matters for readability.

Example:

```json
{
  "from": "peter-thiel",
  "to": "dialog",
  "type": "co-founder"
}
```

The app may traverse from Dialog to Peter Thiel during pathfinding, but the receipt still reads as Peter Thiel co-founded Dialog.
