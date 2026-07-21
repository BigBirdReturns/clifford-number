# Visual aperture scale baseline

Phase 4 begins with measurement, not optimization.

The integrated aperture already constrains SVG cardinality at each semantic level and keeps dense Surface mode inside a fixed bracket budget. Map surface/evidence mode and long Route mode did not have equivalent row or path windows. This tranche records those costs before pagination, virtualization, caching, indexing, or fallback decisions are made.

## Fixture law

The deterministic adversarial fixture contains:

- 5,000 synthetic actors;
- 1,200 bounded surfaces;
- 14,592 participation rows;
- one 5,000-actor context-only roster;
- 1,000 admitted hop edges on separate bounded surfaces;
- a fixed seven-family vocabulary;
- zero hop bases and zero pairwise edges from the dense roster.

Every identifier begins with `synthetic-`. The fixture contains no real person, institution, source assertion, or inferred relationship. Its `graph_effect` is `none` outside the fixture itself.

## Measured result

The baseline was recorded on a four-logical-CPU GitHub-hosted Linux runner. Timings are environment-specific and are not universal guarantees.

### Core projection work

On the adversarial fixture, every measured pure operation remained inexpensive relative to the browser costs:

| Operation | Median | p95 |
|---|---:|---:|
| Family summarisation | 6.6 ms | 21.1 ms |
| Aggregate corridors | 7.3 ms | 16.0 ms |
| Surface-type grouping | 1.0 ms | 2.6 ms |
| Dense-surface ordering | 0.7 ms | 1.0 ms |
| Dense-role grouping | 3.6 ms | 5.2 ms |
| Bracket-budget selection | 10.5 ms | 10.9 ms |
| Filtered 1,000-step path search | 4.4 ms | 5.1 ms |
| Blocked-route diagnostics | 2.7 ms | 3.2 ms |

These measurements do not justify a projection-index, adjacency-cache, Web Worker, or canvas rewrite in the next tranche.

### Map surface and evidence levels

The SVG stayed bounded at 18 actor brackets in surface level and 12 in evidence level. The overview did not:

- surface-level interaction: approximately 946 ms;
- evidence-level interaction: approximately 1,112 ms;
- overview rows at both levels: 5,000;
- DOM nodes after the exercised desktop sequence: approximately 199,000;
- longest recorded long task: approximately 847 ms.

The bottleneck is the full-roster table repaint, not the semantic SVG.

### Adversarial route

A deterministic 1,000-step path produced:

- 1,000 route-step nodes;
- 1,001 route actor nodes;
- 1,000 overview rows;
- a 317,088 px stage minimum width;
- approximately 626 ms render time;
- a longest recorded long task of approximately 442 ms.

The full path was computed in about 5 ms p95. The unbounded route presentation is the measured problem.

### Dense Surface mode

The already-budgeted Surface mode preserved its contract:

- 18 default actor brackets and rows;
- 36 maximum actor brackets and rows;
- zero participant-to-participant lines;
- approximately 64 ms to increase the budget to 36;
- approximately 65 ms for a one-row search;
- no mobile horizontal overflow;
- reduced-motion media state matched;
- mobile inspector sheet opened;
- zero console errors and zero page errors.

## Measurement programs

`tools/measure-visual-aperture-scale.mjs` records median and p95 timings plus output cardinality for pure projections.

`tools/measure-visual-aperture-browser.cjs` runs the real public application in Chromium and records semantic levels, dense Surface mode, desktop, mobile, reduced motion, long tasks, DOM counters, and errors.

`tools/measure-visual-aperture-route-browser.cjs` separately exercises the complete 1,000-step path so a one-step smoke test cannot conceal unbounded route rendering.

All three browser intercepts are limited to the compiled aperture artifacts:

- `build/surface-graph.json`;
- `build/hop-graph.json`;
- `build/receipt-graph.json`.

## Outputs

The focused workflow uploads:

```text
build/metrics/visual-aperture-scale.json
build/metrics/visual-aperture-scale.md
build/metrics/visual-aperture-browser.json
build/metrics/visual-aperture-browser.md
build/metrics/visual-aperture-route-browser.json
build/metrics/visual-aperture-route-browser.md
build/metrics/visual-aperture-evidence-baseline.png
build/metrics/visual-aperture-surface-budget.png
```

Run-specific timings remain artifacts. Deterministic fixture code and structural regressions remain in the repository, and the fixture test is part of the ordinary `npm test` release gate.

## What follows

Phase 4b is specified in issue #72. It must:

- page overview rows at 25, 50, or 100 rows, with 50 as the default;
- render no more than 24 route steps and 25 route actors at once while retaining the complete path;
- carry page and route-window state in exact-view URLs;
- keep every row and route step reachable and receipt-addressable;
- enforce structural and Chromium budgets derived from this baseline.

Projection caches, adjacency caches, Web Workers, canvas rendering, and legacy-fallback retirement are explicitly deferred because the measurements do not currently justify them.

## Constitutional boundary

Scale work changes display and consumption behavior only. It does not alter canonical identity, ledgers, hop eligibility, hop derivation, evidence classes, temporal rules, publication status, or graph effect.

Pagination is not deletion. Windowing is not path truncation. A corridor remains context. A hop remains a shared bounded surface. A synthetic scale fixture is not evidence. A dense roster never becomes an all-to-all graph.
