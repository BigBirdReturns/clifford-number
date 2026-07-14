# Field-autopsy case bundles

A field autopsy is a place-centered case that starts from an UNTRUSTED
conversation or prototype artifact, preserves what that artifact expressed,
and independently re-derives, corrects, or rejects its factual claims. The
first bundle is `cases/arcadia-field-autopsy/`.

A field-autopsy case is a normal `case-ledger@1` case (see
[case-ledger.md](case-ledger.md)) — `case.json`, `receipts.jsonl`,
`claims.jsonl`, `events.jsonl`, `relations.jsonl`, `beacons.jsonl` — plus an
extension bundle validated by `tools/lib/field-autopsy.mjs`:

- `intake.json` + `intake-artifact.md`: the received conversation-intake
  record. It `establishes: "expression_only"`. The bytes actually received
  are hashed and preserved; a relayed inventory is not mislabeled as an exact
  transcript. Intake provenance records what was attributed to the source,
  never an external fact.
- `observations.jsonl`: the field-observations ledger. Every observation the
  source expressed, preserved with `graph_effect: none` and a disposition
  (`confirmed`, `corrected`, `rejected`, `unresolved`, `interpretive`).
- `hypotheses.jsonl`: the hypothesis ledger. Interpretive material stays
  `evidence_state: interpretive_hypothesis`, `graph_effect: none`, preserved
  and searchable forever. Preserving a hypothesis never manufactures its
  conclusion.
- `entities.jsonl`: actors, organizations, government bodies, parcels/sites,
  infrastructure and geological systems, professional roles, projects, and
  governance vehicles. Every named person carries a resolving public receipt
  or is demoted to `unresolved: true`. Every role carries a time window and a
  control regime — "connected to the place" is not a predicate.
- `edges.jsonl`: typed edges. Coordination-class edges demand a material
  basis (contract, deed/filing, registration, governance record, official
  publication, source-explicit statement) and `official_record` or
  `corroborated` evidence. Alignment, spatial correlation, or temporal
  coincidence can only ever be context.
- `searches.jsonl`: the search ledger. Exact query, domain or database, the
  URLs or record identifiers actually inspected, timestamp, result, and the
  alternatives attempted.
- New web receipts use `provenance_contract: "receipt-v2"`, carry exact
  `search_ids`, and declare `durability_status` as `captured`, `archived`, or
  `url_only`. A captured receipt requires a content hash; an archived receipt
  requires an archive locator. Duplicate source locators are invalid. Legacy
  receipts remain visible provenance debt until upgraded rather than being
  silently described as captured.
- `coverage.jsonl`: coverage gaps. `unavailable_after_search` and
  `partially_searched` require search provenance; `not_searched` is an honest
  default. Partial surfaces are never labeled complete; absence of evidence is
  a coverage result, not proof of absence.
- `rejected-joins.jsonl`: identity joins the compiler refused, preserved.
- `contradictions.jsonl`: every confirmation, correction, and rejection of
  the source's claims, pointing back to the preserved observations. Corrected
  material never disappears from the record.
- `chronology.json`: the temporal control map. Successive control regimes are
  never collapsed into one network; every event and role names its regime.
- `trails.jsonl` + `frontier.json`: game trails generated from formation
  signatures, and the open frontier. Trails are bounded candidate searches
  with `graph_effect: none` that can only ever promote to candidates.
  Terminal trail states contain no continuation language, cite structured
  searches whose results are terminal, and agree with the frontier in both
  directions.
- `analysis.md`: the human-readable autopsy.

## Evidence states

`observed`, `self_claimed`, `reported`, `official_record`, `corroborated`,
`inferred`, `interpretive_hypothesis`, `disputed`, `unavailable_after_search`,
`not_searched`, `partially_searched`.

These extend — they do not replace — the case-ledger claim vocabulary. Claims
still carry `claim_status`, `causal_status`, and receipts under the
[case-ledger contract](case-ledger.md); `evidence_state` records how the
underlying fact is known, and `claim_kind` separates `external_fact` claims
(which require non-conversation receipts) from `expression` claims (which
cite the intake).

## Formation signatures

`data/signatures/formation-signatures.json` holds reusable place-centered
discovery shapes (spine stages plus optional signals).
`tools/lib/formation-signature.mjs` expands a signature over a place into
bounded candidate searches. A signature match licenses questions, never
conclusions: no coordination, wrongdoing, geomancy, or identity inference may
be derived from a match, and generated candidates can never enter a ledger
without a separate reviewed change. `npm run fanout` consumes every open or
in-progress field-autopsy trail plus the neutral target universe in
`data/research/place-formation-targets.jsonl`; the validator independently
recomputes the expected tasks and fails on missing trails, extra targets,
query drift, or any finding field on a candidate.

## Prohibited inferences

The validator fails any graph-effective row typed with occult, ethnic,
racial, conspiracy, mastermind, or wrongful-coordination semantics. Cultural
practices (for example feng shui traditions in a regional real-estate market)
are recorded as reported market behavior with named public receipts, never as
group coordination. Identity-adjacent aggregation stays banned per
BUILD-INSTRUCTIONS 1.6.
