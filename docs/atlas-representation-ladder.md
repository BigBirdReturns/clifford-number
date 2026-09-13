# The atlas representation ladder

Status: adopted design note (2026-07-20). Governs the topology explorer's atlas
rendering. BUILD-INSTRUCTIONS.md Section 1 remains constitutionally superior:
nothing here may change hop counts, hop eligibility, dense-surface exclusions,
or evidence semantics. This document changes only *representation*.

## Diagnosis

The atlas has the correct evidence model and the wrong scale behavior. It
manually anchors a few nodes, assigns the rest to keyword clusters, spreads
them around cluster centers, sizes nodes by degree, renders every relationship
as a line, and treats zoom as a pure `viewBox` change. Zooming never changes
what an object *means* or how it is represented. The hairball is structural,
not cosmetic.

The fix is a **representation ladder**: a different honest projection of the
corpus at each scale, while selection, route, time slice, and evidentiary chain
stay continuous across scales.

## Scale hierarchy

| Scale    | Primary visible objects                                           | Question answered                                       |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Corpus   | Cases, jurisdictions, research tracks, major structural corridors  | Where is the documented machinery concentrated?         |
| Machine  | Surface factories, institutional clusters, recurring surface types | Which institutions repeatedly produce bounded surfaces? |
| Surface  | One bounded surface, its organizations, participant groups, dates  | What specific object creates this adjacency?            |
| Route    | Selected actors, intervening surfaces, accepted and rejected steps | How are these two actors defensibly connected?          |
| Evidence | Roles, claims, receipts, archive health, temporal precision        | What exactly supports this statement?                   |

Mapping: cases are regions; surface factories are systems; bounded surfaces
are stations and encounter spaces; actors are ships; organizations are
infrastructure and containers; participations are the actual local
connections; multi-stage chains are shipping corridors; claims and receipts
are telemetry and inspection records. This follows the compiler's own
ontology: organizations cannot create hops; a surface is the bounded object;
a hop is derived from actors sharing one during a valid window.

## The representational inversion

Close range stops drawing actor-to-actor edges as primary geometry. The
display grammar becomes:

```text
Actor → Participation → Surface ← Participation ← Actor
```

Actors stay circles or screen-space brackets. Surfaces become diamonds or
compact surface cards. Organizations become containers or background
infrastructure. A direct actor-to-actor hop line may remain as a computed
route abstraction, but selecting it must expand it into the surface that
permits the hop. (The small route renderer already does this — circles for
actors, distinct glyphs for shared bounded surfaces; the full atlas inherits
that grammar.)

This also solves the implication problem: a direct line between two people
reads as a relationship claim even when the assertion is only shared presence
on a bounded public object. A visible intervening surface makes the mechanism
unavoidable.

## Per-level requirements

### 1. Corpus (whole-atlas)

- No individual people by default; cases, declared research universes, major
  surface factories, typed structural corridors.
- Node area encodes a declared quantity (e.g. bounded-surface count), never a
  suspiciousness surrogate. Degree is removed as the default salience measure;
  it may remain a *displayed statistic*.
- Ribbons encode counts of actual surfaces or typed transitions, never
  manufactured pairwise relationships.
- People appear only when searched, selected, pinned, or on an active route.
- Evidence composition may appear as a compact ring or histogram on the
  aggregate object. Every aggregate names its denominator.

### 2. Machine (cluster)

- A case opens into its surface factories and recurring surface types. An
  organization renders as a containing system listing the bounded objects it
  generated (founder/officer, funding, customer/vendor, advisory, policy
  participation surfaces) — each separately inspectable.
- Recurring typed sequences (policy authorship → appointment → procurement →
  investment → deployment) render as a **structural corridor overlay**,
  visually distinct from Clifford hops, because multi-stage chains may contain
  no actor co-presence and have no Clifford Number effect.

### 3. Surface

- A surface is a bounded visual container: label, window, eligibility,
  documented participant count, evidence composition.
- Actors inside render as fixed-size screen-space brackets; selecting one
  reveals the exact participation role and source basis.
- Dense surfaces render as roster containers (count, categorical composition,
  source status, filters) — never as a hub with undifferentiated spokes,
  never expanded into all-to-all person adjacency (constitutional rule).
  Suppressed population stays an honest aggregate ("87 other listed
  participants"), not omitted data.

### 4. Route (tactical)

- With a route active, the atlas becomes subordinate to it: active route
  bright, alternatives faint, everything unrelated strongly suppressed.
- Steps alternate actor and surface; every step displays both roles, overlap
  window, temporal precision, evidence class, receipt count, archive health,
  and whether the basis supports the current time slice.
- Route projections (all clearly labelled secondary; the minimum-hop route
  remains the Clifford Number): shortest; strongest-evidence; best-dated;
  official-only; as-of.
- Rejected hop pairs render as **blocked route segments**: two participation
  intervals approaching the surface and stopping because they do not overlap.
  "No documented connection" becomes visible evidence, not an empty screen.

### 5. Evidence inspection

- The graph recedes; the exact evidentiary object is primary: classification,
  role, bounded surface, exact claim language, source-explicit vs derived,
  date precision, archive reference and health, graph effect, mandatory
  inference boundary.
- A persistent, sortable Evidence Overview with tabs (visible objects, active
  route, surface participants, rejected steps, evidence warnings, research
  gaps). Rows stay stable under hover/keyboard/receipt-opening; filters never
  reorder the row beneath the pointer.

## Visual channel assignment

| Channel               | Meaning                                                    |
| --------------------- | ---------------------------------------------------------- |
| Shape                 | Actor, organization, surface, case, claim                  |
| Fill family           | Functional domain or case                                  |
| Line pattern          | Evidence class                                             |
| Outline treatment     | Hop-eligible, context-only, intake, rejected               |
| Archive-health marker | Healthy, warning, lost or unavailable                      |
| Opacity               | Active in current time slice vs historical context         |
| Halo                  | Search, selection, route membership, explicit user pin     |
| Count badge           | Degree / participant / surface / receipt count, metric named |

Warning effects correspond to **evidentiary distress** (missing archive,
review-required claim, source decay, temporal contradiction), never alleged
misconduct. Release-delta animation marks only actual corpus changes. All
effects settle quickly and respect the reduced-motion contract.

## Semantic zoom logic

With full width 1400 and minimum view width 260, scale is
`z = 1400 / view.width` (≈1×–5.4×). Provisional bands:

```js
function semanticLevel(scale, congestion, hasRoute) {
  if (hasRoute && scale >= 2.0) return 'route';
  if (scale < 1.35) return 'corpus';
  if (scale < 2.35) return 'machine';
  if (scale < 3.8) return 'surface';
  return 'evidence';
}
```

Thresholds need hysteresis so the scene does not flicker at a boundary:

```js
const thresholds = {
  corpusToMachine:   { enter: 1.40, exit: 1.25 },
  machineToSurface:  { enter: 2.45, exit: 2.20 },
  surfaceToEvidence: { enter: 4.00, exit: 3.60 }
};
```

Zoom alone does not control visibility. Representation is
`R(e) = f(z, q, s, t, d, g, b)`: zoom, query relevance, selection/route
state, temporal validity, local congestion, graph effect / evidence status,
and the primitive/label budget. Search matches, route members, selections,
receipt warnings, and explicit pins bypass ordinary suppression.

## Rendering architecture

SVG survives the first implementation; the bottleneck is that every edge is
mounted at every scale. Add a derived artifact:

```text
build/atlas-projection.json
{ "regions": [], "machines": [], "surface_clusters": [], "surface_nodes": [],
  "actor_brackets": [], "corridors": [], "route_index": {},
  "aggregate_metrics": {} }
```

Built by the compiler from `surface-graph.json`, `hop-graph.json`, scores,
cases, claims, and receipt health. Disposable and reproducible; never alters
canonical identity or ledger truth.

The browser renders four independent layers — aggregate, corridor, local
topology, screen-space label/selection — mounting only those relevant to the
current semantic level. Selections persist across layer changes. As the
corpus grows, dense geometry may move to Canvas/WebGL while selected objects,
labels, keyboard targets, and the inspector stay SVG/DOM.

## Stable geography

The atlas must not visually manufacture change because layout reran. Use
fixed case and domain regions; persisted anchors for major surface factories;
deterministic seeded placement for new objects; local collision adjustment
that never moves established anchors; separate delta animation for actual
corpus changes. A reader who learned where the policy, capital, defence, and
technology machinery lives finds it in roughly the same place next release.

## Implementation sequence

1. **Projection layer.** `tools/build-atlas-projection.mjs` + tests proving
   every displayed aggregate names its denominator, evidence composition,
   graph effect, and source object IDs.
2. **Semantic levels.** Keep the pan/zoom camera; `applyNetworkView()` calls
   a projection selector and mounts only the appropriate layer.
3. **Bipartite close range.** Hop lines may remain at wide scales; selecting
   or approaching one reveals the bounded surface.
4. **Permanent Evidence Overview.** Sort stability, filters, map↔table
   selection coupling.
5. **Route and temporal modes.** Accepted paths, blocked temporal paths,
   evidence floors, alternate best-supported routes.
6. **Corridors and release deltas.** Distinct multi-stage overlay; animate
   only actual additions, closures, evidence upgrades, decay.

## Legibility addendum (2026-07-20 operator review)

The first implementation carried the ladder's logic but not its look. Binding
rules from the review:

1. **Ink never magnifies.** Glyph radii, stroke widths, and font sizes are
   screen-space constants: counter-scale every one by `1/scale` on each view
   change. Zoom changes spacing and representation — never text size. A label
   that renders as a billboard at 4× is a defect.
2. **Shapes carry the ontology.** Actors are circles, organizations are
   squares, bounded surfaces are diamonds, aggregates are rings. The legend
   shows the shapes. A map where everything is a dot has no iconography and
   fails review.
3. **The corpus view fills its frame.** Aggregate area encodes the declared
   count; minimum aggregate size is large enough to read at arm's length;
   fixed region anchors spread across the full canvas; each aggregate carries
   its evidence-composition ring and a *named* metric — never a bare number.
4. **Machine level means containers.** Surface factories render as labeled
   boxes with their bounded surfaces docked inside as diamonds. If the machine
   level looks like the corpus level with more dots, it is not a machine level.
5. **No orphan numbers.** A count badge renders only on aggregates and
   containers, always with its metric named. Scattered per-node digits are
   noise and are removed.
6. **Labels obey collision.** Screen-space label boxes that overlap drop the
   lower-priority label (selection/route/search outrank statistics). The
   budget is enforced by geometry, not hope.
7. **Transitions hold still.** A level change may alter the map, never the
   page scroll position or surrounding layout height.

## Regression gate

- Changing zoom never changes the underlying count or legal meaning of hops.
- Every rendered actor-to-actor abstraction expands to a named surface basis.
- Dense surfaces never generate pairwise visual adjacency.
- Time slicing suppresses undated and non-overlapping bases exactly as the
  compiler does.

The control question for every visual primitive: **at this scale, does it
help the reader identify the bounded object, the participating actors, the
valid period, the evidence floor, and the inference limit without visually
asserting anything the ledger does not?**
