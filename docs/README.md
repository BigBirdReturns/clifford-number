# Clifford Number Documentation

This index separates the current surface-hop product from research plans, superseded edge-model material, and the programmes that the 2.0.0 consolidation retired. Start with the reading path that matches what you are trying to do.

| If you are... | Start here |
|---|---|
| A reader or reporter | [Readers and reporters](#readers-and-reporters) |
| Proposing or checking research | [Researchers and contributors](#researchers-and-contributors) |
| Running, building or releasing the repository | [Maintainers and developers](#maintainers-and-developers) |
| Looking for older material | [Historical programmes (archived)](#historical-programmes-archived) |

## Authority and source of truth

When documents disagree, use this order:

1. [`BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) is the governing document. Its constitutional invariants outrank convenience and generated output.
2. Canonical registries under [`data/canonical/`](../data/canonical/) control identities and vocabularies.
3. Source ledgers under [`data/ledger/`](../data/ledger/) preserve claims, surfaces, participation, receipts, and chains.
4. Case ledgers under [`cases/`](../cases/) preserve every canonical case claim, receipts, events, relations, optional candidate-only trails, and publication metadata.
5. Artifacts under [`build/`](../build/) and [`briefs/`](../briefs/) are generated, disposable views of those sources.
6. The web app is a read-only presentation layer over compiled artifacts.

Current Clifford Numbers come from bounded surfaces and participation rows compiled into `build/hop-graph.json`. The root `graph.json`, the older case JSON, and generic node-edge documents are legacy material; they do not define current Clifford Numbers.

Two folders sit outside this order. [`archive/`](../archive/README.md) and [`retrospective/2026-10-12/`](../retrospective/2026-10-12/README.md) are records of past work. They are read-only, held from publication, and are not evidence. Nothing in them is a receipt or a claim.

## Readers and reporters

Read these first:

- [`../data/canonical/evidence-layers.json`](../data/canonical/evidence-layers.json) — the canonical vocabulary for evidence layers, accepted provenance forms and source lifecycle states.
- [`methodology.md`](methodology.md) — what creates a hop, how dates work, evidence boundaries, density discipline, and publication behavior.
- [`definitions.md`](definitions.md) — the current vocabulary in one place.
- [`reporter-briefings.md`](reporter-briefings.md) — structured, non-narrative case reports whose factual text is compiled from canonical claims and events and whose workplans may expose candidate-only case trails.
- [`report-waterline.md`](report-waterline.md) — the current transition law from intake or projection through case ledger, structured report, independent review, and approved publication.
- [`estates.md`](estates.md) — durable domain corpora, estate slices, fog classes, and the bounded acquisition law.
- [`milestones/phase0-foundation-lock.md`](milestones/phase0-foundation-lock.md) — the completed identity, density, narration, evidence-upgrade, and receipt-archival foundation controls.
- [`milestones/estate-aperture-v1.md`](milestones/estate-aperture-v1.md) — M-01: the completed fourteen-estate pass and the four-level Estate Aperture waterline.
- [`milestones/estate-frontier-game-trails-v1.md`](milestones/estate-frontier-game-trails-v1.md) — M-02: ten prepared frontier estates and the complete twenty-four-estate Game-Trail Aperture pass.
- [`redaction-policy.md`](redaction-policy.md) — public-role-only scope and material the project excludes.
- [`plain-language.md`](plain-language.md) — how narration is generated without adding facts.
- [`releases/2.0.0.md`](releases/2.0.0.md) — what the current release is and is not.

The essential reading rules are: a hop means documented shared context on a bounded surface, nothing more; and **no hop does not mean no relationship**. Co-presence is never coordination, a missing live source does not erase a preserved observation, and absence from the corpus is not proof of absence. The hop graph is a conservative projection of a larger, typed evidence model.

For reports, a trail is not a claim, a canonical claim is not necessarily a dated event, an open matrix cell is not evidence of absence, and a structured report is not an approved publication.

## Researchers and contributors

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — the working rules: the constitution, the receipt contract, how to add a surface, a participation row or a receipt.
- [`research-intake.md`](research-intake.md) — the candidate-surface packet and promotion path.
- [`../contributions/templates/candidate-surface.md`](../contributions/templates/candidate-surface.md) — submission template.
- [`redaction-policy.md`](redaction-policy.md) — required exclusions and listing caveats.
- [`official-record-crawler.md`](official-record-crawler.md) — the observation-first crawler contract. Crawls are started by hand and only ever open a pull request.
- [`field-autopsy.md`](field-autopsy.md) — place-centered case bundles that re-derive an untrusted conversation's claims, plus formation signatures and evidence trails.
- [`research-fanout.md`](research-fanout.md) — exhaustive scan-to-batch orchestration and its safety boundary.
- [`estates.md`](estates.md) — the macro-estate registry, source-route fan-out, bounded closure states, and candidate-only handoffs.
- [`public-interest-discovery.md`](public-interest-discovery.md) — the bounded Epstein, Trump, and Panama Papers source/crossing spine.
- [`corpus-selection.md`](corpus-selection.md) — constitutional lane-selection symmetry and measured corpus coverage.
- [`consumption-contract.md`](consumption-contract.md) — copy-ready interpretation caveats and adversarial neutral-universe review.
- [`officeholder-cohort.md`](officeholder-cohort.md) — the office-defined 1979-present presidential cohort and frozen role-neutral crossing battery.
- [`axm-instrument-architecture.md`](axm-instrument-architecture.md) — how Clifford sits as a layer-2 instrument in the AXM sovereign-evidence stack, the custody/intake seams, the "conform late" principle, and the ten parallel research-track harnesses.
- [`poof-clifford-ecology.md`](poof-clifford-ecology.md) — constitutional one-way evidence and challenge flow joining POOF, K0, REAL STEEL, Steel Mirror, newsroom onboarding, publication audits, and machine interfaces without creating a second factual ledger.
- [`tiered-research-methodology.md`](tiered-research-methodology.md) — the operating procedure for running a research-track harness: the Haiku→Sonnet→Fable+human pipeline, the nine measured routing rules (crate+framing dominate model choice; try a UA fetcher before ScreenGhost; web-only is the costly last resort), and the rederivable-telemetry standard.
- [`../data/intake/natsec100-pathways/README.md`](../data/intake/natsec100-pathways/README.md) — the second-case intake state, completed 2025 source recovery, identity-promotion frontier, and implemented Capital Factory overlap.
- [`research-gap-audit.md`](research-gap-audit.md) — operator-oriented source gaps and pull plan; not a publication claim.
- [`update-sweep.md`](update-sweep.md) — generated or operator review material whose snapshot date must be checked before use.

A candidate is a research question. It may preserve a non-hop fact, pattern, sequence, attrition event, or hypothesis without affecting a Clifford Number. It has no verified graph effect until it passes the applicable canonical, receipt, participation, temporal, density, causal-language, and release review.

## Maintainers and developers

- [`../BUILD-INSTRUCTIONS.md`](../BUILD-INSTRUCTIONS.md) — governing invariants and phased acceptance criteria.
- [`releases/2.0.0.md`](releases/2.0.0.md) — the consolidation release: what was removed, what the gate runs, what is not claimed. Earlier notes: [1.3.0](releases/1.3.0.md), [1.2.0](releases/1.2.0.md), [1.1.0](releases/1.1.0.md), [1.0.0](releases/1.0.0.md).
- [`release-architecture.md`](release-architecture.md) — current ledger-to-build architecture.
- [`reporter-briefings.md`](reporter-briefings.md) — the `reporter-briefing@2` source, compiler, manifest, review-queue, Pages, browser, trail, and unsequenced-claim contracts.
- [`report-waterline.md`](report-waterline.md) — the project-level report frontier and allowed promotion transitions.
- [`estates.md`](estates.md) — the estate compiler, source-route registry, closure compiler, and Estate Aperture projection.
- [`adr-reporter-briefing-platform.md`](adr-reporter-briefing-platform.md) — architectural decision that cases are primary truth and reports, graphs, frontiers, routes, and tables are projections.
- [`identity-reconciliation.md`](identity-reconciliation.md) — the AXM identity derivation, pinned reference fixture, and where to find current identity counts.
- [`plain-language.md`](plain-language.md) — narration contract and flags.
- [`methods/reported-hop-evidence-upgrade.md`](methods/reported-hop-evidence-upgrade.md) — the Phase 0 §2.4 gate requiring a source-bounded upgrade disposition for every accepted `reported` hop basis.
- [`retrospectives/README.md`](retrospectives/README.md) — the index of the 2026-10-12 consolidation records: what was deleted, the retrospective capture, and the archive branch.
- [`self-assembling-architecture.md`](self-assembling-architecture.md) — proposed future intake architecture; it does not override the current compiler law.
- [`design-system.md`](design-system.md) — interface design guidance.
- [`mcp.md`](mcp.md) — legacy MCP implementation notes; verify package scripts and current graph inputs before relying on them.

The release gate is one command after a clean install:

```bash
npm ci
npm test
npm run release:check
```

`ci.yml` runs it on every pull request and every push to `main`. `deploy.yml` runs it again before publishing to Pages. Three more workflows (`update-sweep.yml`, `crawl-official.yml`, `crawl-industrial-exhaust.yml`) run only when a person starts them. No workflow runs on a timer.

Files under `build/` and `briefs/` must not be edited by hand.

Some older documents name npm scripts that 2.0.0 folded into `npm run check` or removed (for example `validate:selection`, `validate:consumption`, `compile:cases`, `build:report-frontier`). The commands behind them still exist as `node tools/...` files. [The deletion record](retrospectives/2026-10-12-consolidation-deletions.md) maps every removed script to its `node` command.

## Evidence and stewardship

- [`../data/canonical/evidence-layers.json`](../data/canonical/evidence-layers.json) — receipts as provenance objects and the evidence layers.
- [`durability-plan.md`](durability-plan.md) — archival threats, receipt durability, mirrors, and long-term cold-copy goals. Its audit counts are a dated snapshot, not live metrics.
- [`master-v3-import-gate.md`](master-v3-import-gate.md) — why the master research document does not automatically enter the public graph.
- [`research-gap-audit.md`](research-gap-audit.md) — known evidence gaps and source-upgrade work.
- [`redaction-policy.md`](redaction-policy.md) — privacy boundary for collection and publication.

Receipts are the evidentiary asset. They include preserved archived or vanished material, transactions, dated observations, independent reporting, and reproducible derivations, not only currently live official pages. Every receipt must carry a source URL, a hash-matched or snapshot archive reference, and a statement of limits; `npm run validate:receipt-contract` enforces this. A generated score or attractive path cannot substitute for receipted inputs, but non-hop evidence must not be discarded merely because it cannot create an actor adjacency or because it has not yet been attached to a dated event.

## Current, planning, and legacy status

### Current model

These documents describe the bounded surface-hop and case-publication release:

- [`methodology.md`](methodology.md)
- [`definitions.md`](definitions.md)
- [`release-architecture.md`](release-architecture.md)
- [`reporter-briefings.md`](reporter-briefings.md)
- [`report-waterline.md`](report-waterline.md)
- [`adr-reporter-briefing-platform.md`](adr-reporter-briefing-platform.md)
- [`plain-language.md`](plain-language.md)
- [`research-intake.md`](research-intake.md)
- [`redaction-policy.md`](redaction-policy.md)
- [`identity-reconciliation.md`](identity-reconciliation.md)

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

## Historical programmes (archived)

Between June and September 2026 the project ran several large research programmes. In 2.0.0 their validators, build tools and workflows were removed from the release gate. Their documents were not deleted. They are listed here so that nothing in the main reading paths depends on them. Treat each as a dated record of what that programme did on its date, not as a description of current behavior and not as a finding.

Three places hold the rest of the record:

- [`../archive/README.md`](../archive/README.md) indexes research recovered from closed issues, unmerged branches and the retrospective: eight named programmes (evidence-lake identity, allocator war, synthetic audiences, Arcadia, NHS Palantir wave 09, Electric Twin SH01 filings, SNAP state matrix, NatSec100 identity custody) and `archive/branches/`, which holds 82 branches. Since 2026-10-22 its `programmes/` folder also holds the counter-selector, preference-custody and project-stable-ground files moved out of the working tree (each `archive/programmes/<name>/SOURCE.md` says what moved, what stayed and why). It is read-only and held from publication.
- [`retrospectives/README.md`](retrospectives/README.md) indexes the consolidation deletion record, the retrospective capture and the archive branch.
- [`../retrospective/2026-10-12/README.md`](../retrospective/2026-10-12/README.md) is the retrospective capture itself.

### Programmes whose validators and tools were removed in 2.0.0

- **Preference-custody laboratory** (issue #594): the 119 `preference-custody-*.md` notes (the laboratory floor v8 to v59, plus the assurance, authority, remedy and linkage notes) and the fixtures and control manifests under `data/research/preference-custody/` moved to [`../archive/programmes/preference-custody/`](../archive/programmes/preference-custody/SOURCE.md) on 2026-10-22. Entry point: [`preference-custody-laboratory-floor.md`](../archive/programmes/preference-custody/docs/preference-custody-laboratory-floor.md). The four real-case captures stay in [`../data/research/preference-custody/real-cases/`](../data/research/preference-custody/real-cases/). The laboratory's validators, tests and `tools/lib` code were removed.
- **Counter-selector**: the programme note and the wave milestones moved to [`../archive/programmes/counter-selector/`](../archive/programmes/counter-selector/SOURCE.md) on 2026-10-22, together with the programme's project JSON, wave reports and schemas ([`counter-selector-program.md`](../archive/programmes/counter-selector/docs/counter-selector-program.md); the `counter-selector-wave-*.md` milestones sit under that folder's `docs/milestones/`). Still here: every `counter-selector-*.md` under [`methods/`](methods/) and the three `counter-selector-wave-21-*` files under [`requests/`](requests/). The related allocator-war research files are in [`../archive/allocator-war/`](../archive/allocator-war/SOURCE.md).
- **Project Stable Ground**: the twelve checkpoint notes ([`project-stable-ground-alignment.md`](../archive/programmes/project-stable-ground/docs/milestones/project-stable-ground-alignment.md) and `project-stable-ground-sg02.md` to `sg12.md`), their project JSON, release manifests and reports moved to [`../archive/programmes/project-stable-ground/`](../archive/programmes/project-stable-ground/SOURCE.md) on 2026-10-22; `data/project/project-stable-ground-current.json` and `project-stable-ground-sg08.json` stay because the status-sovereignty gate reads or names them. [`project-realignment.md`](project-realignment.md) is the related planning note and stays here.
- **Status-sovereignty residual-denominator and RD-04 chains**: the residual-denominator waves (`milestones/ssc-residual-denominator-*.md`), [`milestones/ssc-six-gate-first-pass-reconciliation.md`](milestones/ssc-six-gate-first-pass-reconciliation.md), and the RD-04 SNAP state-implementation work (`milestones/ssc-rd04-*.md`, `milestones/ssc-rd-wave03-rd04-*.md` and [`milestones/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.md`](milestones/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol.md)). The status-sovereignty compact and its waves 01 and 02 are different: `npm run check` still builds and validates them (`methods/status-sovereignty-compact.md`, the `m05-status-sovereignty-*` milestones and the two `ssc-wave-0*-second-party-review-intake.md` notes).
- **M-04 wave chains**: `milestones/m04d-*.md` (fog resolution waves 01 to 08 and adversarial triage), [`milestones/m04e-constitutional-class-awareness.md`](milestones/m04e-constitutional-class-awareness.md), [`milestones/m04f-federated-sensing-action-fanout.md`](milestones/m04f-federated-sensing-action-fanout.md), `milestones/m04g-*.md`, and the methods notes [`methods/evidence-hydrology.md`](methods/evidence-hydrology.md) and [`methods/global-evidence-circulation.md`](methods/global-evidence-circulation.md).
- **School.House registry censuses**: the nine `milestones/schoolhouse-*.md` files. Their validators were removed.
- **No-magic human gate**: [`methods/no-magic-human-gate.md`](methods/no-magic-human-gate.md). Its validator, test and workflow were removed.

### Dated milestone records kept in the tree

These describe a point-in-time pass. Their own tools may still exist under `tools/`, but the release gate does not run them unless `npm run check` names them.

- [`milestones/`](milestones/): the other `ssc-*` first-pass and RD-wave notes, the M-03 and M-04A to M-04C records (`m03-*`, `m04a1-*`, `m04b-*`, `m04c-*`), the M-04F epistemic-jurisdiction and evidence-lake records (`m04f-epistemic-jurisdiction.md`, `m04f-evidence-lake-*`), the M-05 answerable-power sprints and legs (`m05-answerable-power-*`), the M-05 K0 role-neutral waves and field adjudications (`m05-k0-*`), and `m05-dca-h01-field-hypothesis.md`.
- [`methods/`](methods/): the `answerable-power-*` notes, [`methods/distributed-counterpower-aversion.md`](methods/distributed-counterpower-aversion.md), [`methods/pattern-to-proof.md`](methods/pattern-to-proof.md) and [`methods/k0-epistemic-admissibility.md`](methods/k0-epistemic-admissibility.md). The K0 epistemic-admissibility build and validator are still in `npm run check`.
- Two programmes lost their dedicated workflow but kept their validator and tests: [`milestones/allocator-war-waterline-wave-01.md`](milestones/allocator-war-waterline-wave-01.md) and [`performative-synthetic-constituency.md`](performative-synthetic-constituency.md).

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
