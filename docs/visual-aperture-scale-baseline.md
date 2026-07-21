# Visual aperture scale baseline

Phase 4 begins with measurement, not optimization.

The integrated aperture already constrains SVG cardinality at each semantic level and keeps dense Surface mode inside a fixed bracket budget. Map evidence mode, however, still serializes every participation row for the selected bounded surface into the evidence overview. This tranche records that behavior and its cost before any pagination, virtualization, cache, index, or fallback decision is made.

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

## Pure measurements

`tools/measure-visual-aperture-scale.mjs` records environment-specific median and p95 timings plus output cardinality for:

- family summarisation;
- aggregate corridor computation;
- surface-type grouping;
- dense-surface ordering;
- dense-role grouping;
- bracket-budget selection;
- filtered shortest-path search;
- blocked-route diagnostics.

Timing output belongs in workflow artifacts. It is not committed as canonical data and is not a universal performance guarantee.

## Browser measurements

`tools/measure-visual-aperture-browser.cjs` runs the real public application in Chromium and intercepts only the three compiled aperture artifacts:

- `build/surface-graph.json`;
- `build/hop-graph.json`;
- `build/receipt-graph.json`.

It records:

- mount and interaction durations;
- semantic-level SVG cardinality;
- semantic-level overview row cardinality;
- dense Surface bracket and row budgets;
- proof of zero participant-to-participant lines on the dense roster;
- route rendering against a one-step synthetic path;
- long tasks and DOM counters;
- desktop behavior;
- mobile behavior;
- reduced-motion behavior;
- console and page errors.

The current Map evidence overview is expected to report the full 5,000-row roster. That is a measured baseline defect, not an accepted final budget.

## Outputs

The focused workflow uploads:

```text
build/metrics/visual-aperture-scale.json
build/metrics/visual-aperture-scale.md
build/metrics/visual-aperture-browser.json
build/metrics/visual-aperture-browser.md
build/metrics/visual-aperture-evidence-baseline.png
build/metrics/visual-aperture-surface-budget.png
```

Run-specific timings remain artifacts. Deterministic fixture code and structural regressions remain in the repository.

## What follows

Phase 4b must derive explicit budgets from the baseline, then implement only the changes justified by those measurements. Likely candidates include bounded overview pagination or virtualization, one-time projection indexes, cached hop adjacency, and explicit failure-state reporting. None is pre-approved by this baseline.

The legacy atlas fallback is not retired here. Retirement requires a separate compatibility and performance record.

## Constitutional boundary

Scale work changes display and consumption behavior only. It does not alter canonical identity, ledgers, hop eligibility, hop derivation, evidence classes, temporal rules, publication status, or graph effect.

A corridor remains context. A hop remains a shared bounded surface. A synthetic scale fixture is not evidence. A dense roster never becomes an all-to-all graph.
