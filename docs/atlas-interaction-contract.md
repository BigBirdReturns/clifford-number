# Atlas interaction contract

Status: design contract (RODOH spec form — see the axm-world
`GAMEPLAY_SCREEN_REDESIGN_SPEC.md` for the parent doctrine). Not code.
Companion to `atlas-representation-ladder.md` and its legibility addendum;
this contract governs *interaction feel and self-explanation*.

Audience, in order: the implementing agent (execute without inventing
interaction logic) → the operator (reject drift) → future agents.

Bar for the whole surface: **the 1am reader lands cold and makes it through
their first three minutes — sees the machinery, opens a cluster, reads one
route, opens one receipt — without a tutorial, a manual, or a single moment
of "what just happened."** Teach by doing. Never patch unclear state with
tutorial copy.

Target feel, in order — the reader should be able to say: *I see where the
documented machinery is concentrated. I opened a cluster and it became its
contents. I found a specific bounded surface. I checked two people and read
the route. I opened the exact receipt behind one step.* Every region below
exists to make exactly one of those true.

---

## 1. Camera

**Purpose.** Continuous, predictable movement through the scale ladder.

**Unique decision enabled.** None — the camera makes no decision; it must
never *feel* like it's making one.

**Keep**
- viewBox camera, semantic bands, hysteresis, pan/drag.

**Delete**
- Center-anchored wheel zoom.
- Hard remount at level boundaries (the "brutal transition").

**Rebuild**
- **Cursor-anchored zoom.** Wheel (and trackpad pinch via ctrl+wheel) zooms
  toward the pointer: the world point under the cursor stays under the
  cursor. The +/− buttons zoom toward the view center (their anchor is the
  button metaphor, not the pointer).
- **Level cross-fade.** On a semantic level change, the outgoing layer fades
  out while the incoming layer fades in (≤250ms, opacity only; instant under
  prefers-reduced-motion). The selected object, if it exists in both
  representations, must be visually continuous — same anchor position, halo
  preserved across the fade.
- **Aggregates open, not swap.** Zooming into a corpus aggregate ring should
  read as the ring giving way to its contents around the same anchor — the
  incoming machine-level objects for that cluster appear centered where the
  ring was.

**Acceptance checks**
- [ ] Wheel-zoom at a corner: the world coordinate under the pointer before
      and after differs by <2 world units.
- [ ] A level transition changes layer opacity over time (or instantly under
      reduced motion) — never a same-frame swap.
- [ ] window.scrollY unchanged across any zoom or level change (regression).

## 2. Corpus view self-explanation

**Purpose.** The opening screen answers "where is the documented machinery
concentrated" — and explains its own encodings without being asked.

**Unique decision enabled.** Which cluster do I open?

**Keep**
- Ring aggregates, named metrics, evidence arcs, full-canvas anchors.

**Delete**
- Unlabeled encodings: the dotted arc ring, line colors, and spacing
  currently mean nothing to a cold reader.
- The stray unexplained glyph(s) floating near aggregates (e.g. the orphan
  diamond by Dialog) — find what renders it; either integrate it into the
  aggregate's own presentation with a label, or suppress it at corpus level.
- The corridor's unreadable fly-speck label.

**Rebuild**
- **Every aggregate is a sentence.** Ring + name + named metric stays; add a
  quiet second line naming the evidence arc ("evidence mix: mostly primary
  public" — derived from the composition, worded, not a bare palette).
- **Corridor as a labeled object.** The corridor band gets a readable
  screen-space label chip ("Structural corridor — no hop effect") placed by
  the collision system, and a hover/selection state that opens its detail in
  the inspector panel like any other object.
- **Region washes.** Faint, labeled background zones (policy / capital /
  defense / technology) behind the aggregates so *spacing means territory*.
  The washes persist into the machine level (see §3).
- **Hover = meaning.** Hovering any encoded element (arc segment, ring,
  corridor, wash) shows a one-line explanation chip naming the encoding and
  its value. No encoding on screen without a name reachable by hover.

**Acceptance checks**
- [ ] Every visible encoded channel (shape, arc, dash, wash, band) has
      either a visible label or a hover chip naming it.
- [ ] No glyph renders at corpus level that is not an aggregate, corridor,
      wash, or bypass (selected/searched/pinned) object.

## 3. Continuity into machine level

**Purpose.** The machine level must read as *inside the constellation you
opened* — not a different product.

**Unique decision enabled.** Which institution or bounded surface do I
inspect?

**Keep**
- Container boxes for surface factories; docked surface diamonds; shape
  grammar; label collision.

**Delete**
- The visual discontinuity: corpus theme (rings, washes, dark calm) giving
  way to raw overlapping-graphs edge soup.

**Rebuild**
- **Washes persist.** The corpus region washes remain visible (fainter) at
  machine level, so the reader always knows which territory they're in.
- **Edges arrive banded, not raw.** At machine level, individual edges
  render only for the selection neighborhood; everything else aggregates
  into a few thick translucent inter-cluster bands (count-labeled, like the
  corridor treatment). Raw per-edge rendering is a surface/evidence-level
  privilege.
- **The opened cluster is primary.** Objects belonging to the cluster whose
  ring the camera entered render at full strength; other clusters' objects
  render dimmed until the camera crosses into their territory.

**Acceptance checks**
- [ ] At machine level with nothing selected, individual edge count on
      screen is ≤ 30; the rest is bands with named counts.
- [ ] Region washes visible at both corpus and machine levels (opacity may
      differ).

## 4. Close range: locality and selection

**Purpose.** Surface/evidence levels show *the local neighborhood*, and what
is selected is unmistakable.

**Unique decision enabled.** Which exact object do I open the record for?

**Keep**
- Bipartite actor→surface→actor grammar; roster containers; screen-space ink.

**Delete**
- Through-traffic: edges crossing the viewport between two off-screen
  endpoints (the full-zoom "line soup that connects nothing visible").
- The current whisper-quiet selection state.

**Rebuild**
- **Edge locality.** At surface/evidence levels, render an edge only if at
  least one endpoint is inside (or near) the viewport; edges to off-screen
  partners fade to short directional stubs with a count chip ("4 more edges
  →" at the viewport rim, or on the node).
- **Unmistakable selection.** Selected object gets a high-contrast halo +
  connected-edge highlight + a persistent floating name chip; everything
  non-adjacent drops opacity. Selection must be findable in a screenshot at
  arm's length. Same treatment across all levels and both modes.

**Acceptance checks**
- [ ] At evidence level, zero rendered edges have both endpoints off-screen.
- [ ] Selection state changes the rendered appearance of ≥ the selected
      glyph, its edges, and the background dim — verified by class/attr
      assertions.

## 5. Record inspector provenance

**Purpose.** Opening a claim/receipt is the *consequence* of a map decision —
it must visibly come from the thing clicked, in the same world.

**Unique decision enabled.** None — this is a reading surface. Its job is to
never cost the reader their place.

**Keep**
- The inspector's content discipline (claim text, qualification,
  inference-boundary language, receipts).

**Delete**
- The full-bleed white sheet with no visual relationship to the dark map
  ("BAM in your face").

**Rebuild**
- **Dark-theme the inspector** to the explorer's palette. The map must stay
  partially visible behind/beside it (side sheet or anchored panel, not a
  full viewport takeover at desktop widths).
- **Breadcrumb provenance.** The inspector header names the path that opened
  it: mode → object → edge/claim (e.g. "Research network → Dialog →
  Peter Thiel co-founder claim"), each crumb clickable to return.
- **Origin anchoring.** On open, the panel animates from the click origin
  (scale/fade from the glyph's screen position; instant under
  reduced-motion). On close, the originating glyph is still selected, still
  haloed, camera unmoved.

**Acceptance checks**
- [ ] Inspector open: map still visible at ≥30% of viewport width (desktop).
- [ ] Inspector header contains the originating object's name.
- [ ] Close returns to an unchanged camera with the origin object selected.

## 6. First three minutes

**Purpose.** Orient the cold reader inside the shell without occupying the
map.

**Unique decision enabled.** None.

**Rebuild**
- A one-line orientation strip in fixed document flow above the atlas (not
  overlaying it): "Each ring is a cluster of documented links — scroll to
  open one. Check any two people below." Dismissible; auto-backgrounds
  permanently (localStorage) once the reader zooms or selects — playing *is*
  dismissal.
- The strip's copy never explains what good design should already show; if a
  tester needs the strip to understand a region, fix the region (visual
  contract rule: no tutorial copy patching unclear state).

**Acceptance checks**
- [ ] Strip lives in document flow; overlaps nothing.
- [ ] Zooming or selecting hides it without an explicit close click.

## 7. Explicit non-goals

- No new data semantics: hop counts, evidence classes, temporal rules,
  publication status are untouchable.
- No new dependencies, no canvas/WebGL migration in this pass.
- No icon redesign — the shape grammar from the legibility addendum is
  frozen.
- Honesty invariants (named denominators, dense-surface containment, bypass
  sets, canonical-Clifford labeling) may not be weakened by any interaction
  change.
