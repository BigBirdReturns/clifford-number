# Atlas renderer boundary

The Atlas has three deliberately separate layers. The evidence compiler remains authoritative; the visual field is a disposable projection; the browser renderer is replaceable.

`network model → social-field projection → renderer adapter`

The network model owns nodes, sourced edges, bounded surfaces, hop eligibility, claims, and receipts. A renderer may not create graph facts or change Clifford Number semantics.

`src/social-field.js` converts the current Research model into deterministic visual state: spherical coordinates, local reinforcement heat, evidence weights, and display links. Its links are a one-for-one projection of source edges. Repeated co-surface counts may influence heat but never become actor-to-actor links.

`src/atlas-webgl.js` is the current GPU adapter. It owns Three.js geometry, curved shell arcs, orbit controls, animated particles, highlighting, picking, and camera motion. It consumes the projection and does not inspect ledgers or receipts directly. The projection—not the render engine—owns layout identity.

The current Visual Aperture uses the GPU field only for the whole-corpus Map view. Machine, surface, evidence, Route, and Surface modes retain the exact semantic SVG views. If WebGL is unavailable, the corpus Map also remains on SVG. Portable standalone output deliberately stays on that SVG path and does not embed the GPU libraries.
