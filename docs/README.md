# Clifford Number Documentation

This index separates the current surface-hop product from research plans and superseded edge-model material. Start with the reading path that matches what you are trying to do.

## Authority and source of truth

When documents disagree, use this order:

1. [`BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) is the governing document. Its constitutional invariants outrank convenience and generated output.
2. Canonical registries under [`data/canonical/`](../data/canonical/) control identities and vocabularies.
3. Source ledgers under [`data/ledger/`](../data/ledger/) preserve claims, surfaces, participation, receipts, and chains.
4. Case ledgers under [`cases/`](../cases/) preserve every canonical case claim, receipts, events, relations, optional candidate-only trails, and publication metadata.
5. Artifacts under [`build/`](../build/) and [`briefs/`](../briefs/) are generated, disposable views of those sources.
6. The web app is a read-only presentation layer over compiled artifacts.

Current Clifford Numbers come from bounded surfaces and participation rows compiled into `build/hop-graph.json`. The root `graph.json`, the older case JSON, and generic node-edge documents are legacy material; they do not define current Clifford Numbers.

## Readers and reporters

Read these first:

- [`evidence-model.md`](evidence-model.md) — the whole knowledge model: receipts, evidence layers, source attrition, discovery topology, and known-positive motifs.
- [`methodology.md`](methodology.md) — what creates a hop, how dates work, evidence boundaries, density discipline, and publication behavior.
- [`reporter-briefings.md`](reporter-briefings.md) — structured, non-narrative case reports whose factual text is compiled from canonical claims and events and whose workplans may expose candidate-only case trails.
- [`report-waterline.md`](report-waterline.md) — the current transition law from intake or projection through case ledger, structured report, independent review, and approved publication.
- [`estates.md`](estates.md) — durable domain corpora, estate slices, fog classes, and the bounded acquisition law.
- [`milestones/estate-aperture-v1.md`](milestones/estate-aperture-v1.md) — the completed fourteen-estate pass and the four-level Estate Aperture waterline.
- [`milestones/estate-frontier-game-trails-v1.md`](milestones/estate-frontier-game-trails-v1.md) — ten prepared frontier estates and the complete twenty-four-estate Game-Trail Aperture pass.
- [`definitions.md`](definitions.md) — the current vocabulary in one place.
- [`redaction-policy.md`](redaction-policy.md) — public-role-only scope and material the project excludes.
- [`plain-language.md`](plain-language.md) — how narration is generated without adding facts.

The essential reading rules are: a hop means documented shared context on a bounded surface, nothing more; and **no hop does not mean no relationship**. Co-presence is never coordination, a missing live source does not erase a preserved observation, and absence from the corpus is not proof of absence. The hop graph is a conservative projection of a larger, typed evidence model.

For reports, a trail is not a claim, a canonical claim is not necessarily a dated event, an open matrix cell is not evidence of absence, and a structured report is not an approved publication.

## Researchers and contributors

- [`research-intake.md`](research-intake.md) — the candidate-surface packet and promotion path.
- [`field-autopsy.md`](field-autopsy.md) — place-centered case bundles that re-derive an untrusted conversation's claims, plus formation signatures and evidence trails.
- [`research-fanout.md`](research-fanout.md) — exhaustive scan-to-batch orchestration and its safety boundary.
- [`estates.md`](estates.md) — the macro-estate registry, source-route fan-out, bounded closure states, and candidate-only handoffs.
- [`public-interest-discovery.md`](public-interest-discovery.md) — the bounded Epstein, Trump, and Panama Papers source/crossing spine.
- [`corpus-selection.md`](corpus-selection.md) — constitutional lane-selection symmetry and measured corpus coverage.
- [`consumption-contract.md`](consumption-contract.md) — copy-ready interpretation caveats and adversarial neutral-universe review.
- [`officeholder-cohort.md`](officeholder-cohort.md) — the office-defined 1979-present presidential cohort and frozen role-neutral crossing battery.
- [`axm-instrument-architecture.md`](axm-instrument-architecture.md) — how Clifford sits as a layer-2 instrument in the AXM sovereign-evidence stack, the custody/intake seams, the "conform late" principle, and the ten parallel research-track harnesses.
- [`poof-clifford-ecology.md`](poof-clifford-ecology.md) — constitutional one-way evidence and challenge flow joining POOF, K0, REAL STEEL, Steel Mirror, newsroom onboarding, publication audits, and machine interfaces without creating a second factual ledger.
- [`tiered-research-methodology.md`](tiered-research-methodology.md) — the validated operating procedure for running a research-track harness: the Haiku→Sonnet→Fable+human pipeline, the nine measured routing rules (crate+framing dominate model choice; try a UA fetcher before ScreenGhost; web-only is the costly last resort), and the rederivable-telemetry standard.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution expectations and examples.
- [`../contributions/templates/candidate-surface.md`](../contributions/templates/candidate-surface.md) — submission template.
- [`redaction-policy.md`](redaction-policy.md) — required exclusions and listing caveats.
- [`research-gap-audit.md`](research-gap-audit.md) — operator-oriented source gaps and pull plan; not a publication claim.
- [`update-sweep.md`](update-sweep.md) — generated or operator review material whose snapshot date must be checked before use.

A candidate is a research question. It may preserve a non-hop fact, pattern, sequence, attrition event, or hypothesis without affecting a Clifford Number. It has no verified graph effect until it passes the applicable canonical, receipt, participation, temporal, density, causal-language, and release review.

## Maintainers and developers

- [`../BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) — governing invariants and phased acceptance criteria.
- [`release-architecture.md`](release-architecture.md) — current ledger-to-build architecture.
- [`reporter-briefings.md`](reporter-briefings.md) — the `reporter-briefing@2` source, compiler, manifest, review-queue, Pages, browser, trail, and unsequenced-claim contracts.
- [`report-waterline.md`](report-waterline.md) — the project-level report frontier and allowed promotion transitions.
- [`estates.md`](estates.md) — the estate compiler, source-route registry, closure compiler, and Estate Aperture projection.
- [`adr-reporter-briefing-platform.md`](adr-reporter-briefing-platform.md) — architectural decision that cases are primary truth and reports, graphs, frontiers, routes, and tables are projections.
- [`plain-language.md`](plain-language.md) — narration contract and flags.
- [`methods/reported-hop-evidence-upgrade.md`](methods/reported-hop-evidence-upgrade.md) — the Phase 0 §2.4 gate requiring a source-bounded upgrade disposition for every accepted `reported` hop basis.
- [`self-assembling-architecture.md`](self-assembling-architecture.md) — proposed future intake architecture; it does not override the current compiler law.
- [`design-system.md`](design-system.md) — interface design guidance.
- [`mcp.md`](mcp.md) — legacy MCP implementation notes; verify package scripts and current graph inputs before relying on them.

The normal release gate is:

```bash
npm run release:check
```

Generated files under `build/` and `briefs/` must not be edited by hand.

## Evidence and stewardship

- [`evidence-model.md`](evidence-model.md) — receipts as provenance objects and the five evidence layers.
- [`durability-plan.md`](durability-plan.md) — archival threats, receipt durability, mirrors, and long-term cold-copy goals. Its audit counts are a dated snapshot, not live metrics.
- [`master-v3-import-gate.md`](master-v3-import-gate.md) — why the master research document does not automatically enter the public graph.
- [`research-gap-audit.md`](research-gap-audit.md) — known evidence gaps and source-upgrade work.
- [`redaction-policy.md`](redaction-policy.md) — privacy boundary for collection and publication.

Receipts are the evidentiary asset. They include preserved archived or vanished material, transactions, dated observations, independent reporting, and reproducible derivations—not only currently live official pages. A generated score or attractive path cannot substitute for receipted inputs, but non-hop evidence must not be discarded merely because it cannot create an actor adjacency or because it has not yet been attached to a dated event.

## Current, planning, and legacy status

### Current model

These documents describe the bounded surface-hop and case-publication release:

- [`evidence-model.md`](evidence-model.md)
- [`methodology.md`](methodology.md)
- [`definitions.md`](definitions.md)
- [`release-architecture.md`](release-architecture.md)
- [`reporter-briefings.md`](reporter-briefings.md)
- [`report-waterline.md`](report-waterline.md)
- [`adr-reporter-briefing-platform.md`](adr-reporter-briefing-platform.md)
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

Legacy material can preserve useful sourced facts, but it must pass the current promotion process before it can affect a surface-hop release or skip directly into a structured report.

## Minimum interpretation checklist

Before publishing or sharing a result, confirm:

- the evidence layer and allowed language are explicit;
- every hop names a bounded surface;
- both actor participation rows are visible;
- the relevant date windows overlap;
- evidence class and receipts are shown;
- dense roster logic has not silently collapsed the path;
- listing, registration, and attendance remain distinct;
- source attrition is preserved without inferring a remover or motive;
- motif matches remain discovery leads rather than guilt claims;
- report facts resolve to canonical case claims and retain a claim-specific or visibly inherited qualification;
- every report-referenced unsequenced claim is identified and blocked from approval pending review;
- every report-linked trail is graph-inert, candidate-only, and already in the case ledger;
- a structured report remains distinct from independent review and approved publication; and
- the output states that shared context is not influence, coordination, or wrongdoing.
