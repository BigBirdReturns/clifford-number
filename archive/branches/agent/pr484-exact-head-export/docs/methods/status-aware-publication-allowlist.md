# Status-aware publication allowlist

The repository publishes by a positive, default-deny plan.

`data/project/publication-plan.json` classifies exact public source files, catalog status guards, generated public outputs, held surfaces, and forbidden destination paths. `tools/lib/publication-manifest.mjs` resolves only those entries and their classified local dependencies. It emits `dist/publication-manifest.json` with exact hashes and refuses any unclassified file in the artifact.

No repository directory is copied recursively merely because it exists.

## POOF admission

The POOF × Clifford aperture is admitted to publication custody as:

```text
status: staged_nonpublic
GitHub Pages: forbidden
target origin: https://evidence.axm.tools/poof/
```

Admission means the repository knows the surface, release manifest, target origin, and current hold. It does not mean the aperture is deployed, indexable, independently audited, or approved for publication.

## Retired generic graph

`graph.json` and `legacy/` remain internal compiler and compatibility inputs. They are not public route products. The public atlas renders only actor-to-actor hops admitted by bounded shared surfaces and compatible dates.

## Catalog law

A public catalog collection must declare a status accepted by its catalog guard. An unknown or blocked status fails the release rather than silently publishing or silently disappearing.

## Release proof

The final Pages artifact must satisfy all of the following:

- every file appears in the exact-byte publication manifest;
- every source file traces to an explicit public entry or classified local dependency;
- generated outputs are named in advance;
- held and forbidden paths are absent;
- the retired generic graph is neither copied nor requested by the browser;
- the staged POOF route returns 404 on the GitHub Pages artifact;
- the public artifact rebuilds deterministically.

## Deterministic public metadata

Five declared JSON projections normalize only their top-level compiler `generated` timestamp to the plan date. The rule is explicit, exact-path bounded, and publication-only; it does not change graph, receipt, score, finding, or evidence authority. The standalone bundle embeds the normalized public JSON bytes from `dist/`.
