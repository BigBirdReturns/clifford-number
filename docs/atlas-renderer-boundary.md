# Atlas renderer boundary

Status: current (rewritten 2026-10-22 for release line 2.1.0; the 2026-09-14 text described the 1.3.0 field and is in git history).

The explorer has three deliberately separate layers. The evidence compiler is authoritative; the projections are disposable, derived in the browser; the renderers are replaceable.

```text
compiled artifacts → projection (pure model) → renderer
```

## Compiled artifacts

`build/surface-graph.json`, `build/hop-graph.json`, `build/receipt-graph.json` and `graph.json`, produced by `tools/` from the ledgers. `app.js` loads them once and hands them to the aperture on `globalThis.__cliffordPublicData`; the aperture fetches only when no handoff is present (and reads the embedded copies in a standalone). No renderer reads a ledger, a receipt file or anything else directly, and no renderer may create a graph fact or change what a hop means.

## Projections

Pure modules with no DOM and no fetch. Each is deterministic over the artifacts and carries its own honesty rules:

- `src/visual-aperture-timeline.mjs`: the ledger timeline. Rows (one per participation row), hop bases as (day, surface) objects, lanes, the dense-roster block, the domain, filters, the window, and `layoutTimeline()`, whose output is geometry plus the row keys, evidence classes, hop eligibility and receipt ids every mark and column carries. Its accounting identity (rows in view + filtered + before and after the domain + undated = candidate rows) is asserted in its tests.
- `src/social-field.js`: the Explore field. Nodes with their documented counts (`size_count` is the one count that sizes a node), links one for one with the sourced edges of `graph.json`, a ledger index that keys all 286 participation rows to the field and names why a row is not drawn (`privacy_guard`, `dense_roster_contained`, `unresolved`), the dated activity events, and the time-window helpers. Repeated co-surface counts never become links. There is no composite heat.
- `src/visual-aperture-core.mjs`: surface families and corridors, the filtered shortest route, blocked-route diagnostics, the roster budget, evidence floors, the shared day index. `state.mjs`, `workspace.mjs`, `export.mjs` and `windowing.mjs` carry the address, saved-view, export and paging contracts.

## Renderers

| Mode | Renderer | Where |
|---|---|---|
| Timeline | SVG, from `layoutTimeline()` | `src/visual-aperture-timeline-runtime.js` |
| Explore | Three.js field (`src/atlas-webgl.js`, over `vendor/`) at all four depth levels when WebGL is available; the SVG scenes of parts 3 to 6 when it is not (`supportsWebGlAtlas()` false, or the renderer throws) | `src/visual-aperture-social-field-runtime.js` |
| Route | SVG scene of actor → bounded surface → actor steps, windowed at 24 steps | `src/visual-aperture-part-7.js`, `visual-aperture-bounded-runtime.js` |
| Roster | SVG roster container with a bracket budget | `src/visual-aperture-part-7.js`, `visual-aperture-bounded-runtime.js` |

The GPU adapter owns Three.js geometry, arcs, picking, orbit controls and camera motion. It consumes the field projection and nothing else; the projection, not the render engine, owns layout identity (seeded positions; the force simulation runs zero ticks). It renders node size and halo from `size_count`, arc colour from evidence class, and dims by depth and by time window. Its loops run only while the stage intersects the viewport, the document is visible and the field is the active stage. Selecting an arc hands the whole link back to the runtime, which opens the participation row or the catalogued claim.

## Rules every renderer obeys

- Every mark is one ledger row; a hop basis is a surface object (a column, a diamond, a step card), never a line between two people.
- A dense roster (20 or more actor rows) is one contained object with its count wherever a mode draws it: one block on the Timeline, one roster container in Roster mode, and in the Explore inspector a row that reads "drawn as one contained roster object, not as an arc". A member documented on other surfaces keeps its own lane or node, and its roster row is drawn as one mark there, counted once.
- Undated rows are listed, never placed on an axis or time-sliced.
- Evidence class and receipt ids stay attached to every mark, column and step.
- No composite score drives a visual channel; counts name their denominator.
- Changing zoom, depth, window or mode never changes a hop count or what a hop means. The aperture's route search was audited against the compiler's `shortest_paths` and against the route projections on 21-22 October 2026; the audit script is not in the repository, so its figures are not restated here. The committed fixture tests pin the evidence-floor and as-of filters.

## Standalone

`tools/build-standalone.mjs` inlines the explorer: the six model modules flattened onto one scope (the timeline model, which imports core, is isolated so its `import` line is stripped), the 18 classic runtime files in loader order, the eight stylesheets and the embedded JSON. It excludes `src/atlas-webgl.js`, `src/social-field.js` and `vendor/`, so the standalone's Explore tab uses the SVG scenes and it embeds no GPU library. At this release the explorer standalone is 4,479,060 bytes with 21 embedded records, under the 5,000,000-byte budget in the publication allowlist.

## What is not settled here

The Explore tab ships two copies of Three.js (the vendored 0.186.0 module and the copy inside the vendored 3d-force-graph bundle); the runtime files are loaded one at a time rather than bundled; the aperture has no translatable strings. These are recorded as open in [the 2.1.0 note](releases/2.1.0.md#what-is-not-claimed).
