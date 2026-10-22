# Aperture Kit

`src/aperture-kit-core.mjs` and `src/aperture-kit-state.mjs` are the neutral,
domain-independent interaction law harvested from the Clifford visual aperture:
semantic zoom with hysteresis, deterministic layout, bounded selection with
explicit pins, and exact versioned address state.

Clifford retains evidence classes, temporal route admissibility, bounded-surface
semantics, public-record caveats, and its DOM command deck. Other runtimes may
vendor the two kit modules and run `test/aperture-kit.test.js` as the conformance
vector without inheriting Clifford's research claims.

## Status (2026-10-22)

The aperture does not import the kit. `src/visual-aperture-core.mjs` carries its
own copies of the semantic-level and ring-position functions, and the two differ
in detail: the kit's modes are `map`, `trace` and `surface` with `apx_` address
keys, the aperture's are `timeline`, `map`, `route` and `surface` with `ap_` keys.
The kit modules are imported only by each other and by their test, which still
passes in `npm test`. They remain on the publication allowlist as published
source. Whether the aperture should import the kit or the kit should be retired
is an open decision; nothing in the explorer depends on either answer.
