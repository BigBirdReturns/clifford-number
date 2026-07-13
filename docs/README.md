# Clifford Number Documentation

This index separates the current surface-hop product from research plans and superseded edge-model material. Start with the reading path that matches what you are trying to do.

## Authority and source of truth

When documents disagree, use this order:

1. [`BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) is the governing document. Its constitutional invariants outrank convenience and generated output.
2. Canonical registries under [`data/canonical/`](../data/canonical/) control identities and vocabularies.
3. Source ledgers under [`data/ledger/`](../data/ledger/) preserve claims, surfaces, participation, receipts, and chains.
4. Artifacts under [`build/`](../build/) are generated, disposable views of those sources.
5. The web app is a read-only presentation layer over compiled artifacts.

Current Clifford Numbers come from bounded surfaces and participation rows compiled into `build/hop-graph.json`. The root `graph.json`, the older case JSON, and generic node-edge documents are legacy material; they do not define current Clifford Numbers.

## Readers and reporters

Read these first:

- [`methodology.md`](methodology.md) — what creates a hop, how dates work, evidence boundaries, density discipline, and publication behavior.
- [`definitions.md`](definitions.md) — the current vocabulary in one place.
- [`redaction-policy.md`](redaction-policy.md) — public-role-only scope and material the project excludes.
- [`plain-language.md`](plain-language.md) — how narration is generated without adding facts.

The essential reading rule is: a hop means documented shared context on a bounded surface, nothing more. Co-presence is never coordination, and absence from the corpus is not proof of absence.

## Researchers and contributors

- [`research-intake.md`](research-intake.md) — the candidate-surface packet and promotion path.
- [`public-interest-discovery.md`](public-interest-discovery.md) — bounded Epstein, Trump, and Panama Papers source/crossing lanes.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution expectations and examples.
- [`../contributions/templates/candidate-surface.md`](../contributions/templates/candidate-surface.md) — submission template.
- [`redaction-policy.md`](redaction-policy.md) — required exclusions and listing caveats.
- [`research-gap-audit.md`](research-gap-audit.md) — operator-oriented source gaps and pull plan; not a publication claim.
- [`update-sweep.md`](update-sweep.md) — generated or operator review material whose snapshot date must be checked before use.

A candidate is a research question. It has no graph effect until it passes canonical, receipt, participation, temporal, density, and release review.

## Maintainers and developers

- [`../BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) — governing invariants and phased acceptance criteria.
- [`release-architecture.md`](release-architecture.md) — current ledger-to-build architecture.
- [`plain-language.md`](plain-language.md) — narration contract and flags.
- [`self-assembling-architecture.md`](self-assembling-architecture.md) — proposed future intake architecture; it does not override the current compiler law.
- [`design-system.md`](design-system.md) — interface design guidance.
- [`mcp.md`](mcp.md) — legacy MCP implementation notes; verify package scripts and current graph inputs before relying on them.

The normal release gate is:

```bash
npm run release:check
```

Generated files under `build/` must not be edited by hand.

## Evidence and stewardship

- [`durability-plan.md`](durability-plan.md) — archival threats, receipt durability, mirrors, and long-term cold-copy goals. Its audit counts are a dated snapshot, not live metrics.
- [`master-v3-import-gate.md`](master-v3-import-gate.md) — why the master research document does not automatically enter the public graph.
- [`research-gap-audit.md`](research-gap-audit.md) — known evidence gaps and source-upgrade work.
- [`redaction-policy.md`](redaction-policy.md) — privacy boundary for collection and publication.

Receipts are the evidentiary asset. A generated score, attractive path, or local analysis note cannot substitute for source material a stranger can check.

## Current, planning, and legacy status

### Current model

These documents describe the bounded surface-hop release:

- [`methodology.md`](methodology.md)
- [`definitions.md`](definitions.md)
- [`release-architecture.md`](release-architecture.md)
- [`plain-language.md`](plain-language.md)
- [`research-intake.md`](research-intake.md)
- [`redaction-policy.md`](redaction-policy.md)

### Plans and dated operational notes

These are useful but may describe future work or a point-in-time audit:

- [`self-assembling-architecture.md`](self-assembling-architecture.md)
- [`durability-plan.md`](durability-plan.md)
- [`research-gap-audit.md`](research-gap-audit.md)
- [`update-sweep.md`](update-sweep.md)

Check each document's date and status before treating it as current behavior.

### Legacy or superseded model

- [`edge-schema.md`](edge-schema.md) documents the generic `graph.json` edge shape.
- [`mcp.md`](mcp.md) describes the legacy graph-backed MCP server.
- [`clifford-number-master.md`](clifford-number-master.md) is a pre-import research master, not the hop graph.
- [`../cases/uk-ai-policy.json`](../cases/uk-ai-policy.json) and [`../graph.json`](../graph.json) belong to the older node-edge representation.
- [`../legacy/`](../legacy/) preserves additional superseded artifacts.

Legacy material can preserve useful sourced facts, but it must pass the current promotion process before it can affect a surface-hop release.

## Minimum interpretation checklist

Before publishing or sharing a result, confirm:

- every hop names a bounded surface;
- both actor participation rows are visible;
- the relevant date windows overlap;
- evidence class and receipts are shown;
- dense roster logic has not silently collapsed the path;
- listing, registration, and attendance remain distinct; and
- the output states that shared context is not influence, coordination, or wrongdoing.
