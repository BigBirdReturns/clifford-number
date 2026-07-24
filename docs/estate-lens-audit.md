# Estate full-lens coverage audit

## Purpose

The macro-estate registry aligns twenty-four durable corpora to the project’s working thesis. That alignment is necessary but insufficient: a case, trail, source route, slice, report, legal instrument, or acquisition step does not become mapped merely because its parent estate is mapped.

The full-lens audit therefore enumerates every known object already present in estate custody or declared acquisition infrastructure and assigns exactly one mapping state:

- `explicit_mapped` — object-specific phase, conversion-stage, and archetype mapping is checked in;
- `known_unmapped` — the object is known and can be conservatively routed, but still inherits only estate context;
- `unresolved` — the object is known, but current metadata is insufficient even for conservative routing;
- `not_applicable` — human review determined that the conversion lens does not apply.

## Current baseline

```text
24 estates
690 known object memberships
30 explicit object mappings
518 known but unmapped
142 unresolved
```

The objects include estate roots, path and logical assets, cases, research tracks, estate slices, frontier surveys, source routes, game trails, reports, fog items, and executable next acquisitions.

Counts describe mapping debt. They are not evidence-strength, importance, influence, risk, intent, or wrongdoing scores.

## Ukraine-war phase shock

`data/project/phase-shocks/ukraine-war.json` extends the 2022+ phase without rewriting the core chronology. It separates:

1. emergency improvisation and stockpile liquidation;
2. coalition rearmament and industrial catch-up;
3. battlefield-integrated market-making;
4. permanent readiness and mobilized infrastructure.

The shock lens tests industrial mobilization, battlefield adaptation, metric-to-resource conversion, commercial continuity, and the emergency-to-permanent ratchet. It does not imply that the war or underlying military need was manufactured by any actor in the corpus.

## Build products

- `build/core-thesis/estate-lens-audit-manifest.json` — project counts and estate index;
- `build/core-thesis/estate-lens-audit/estates/*.json` — one object ledger per estate;
- `build/core-thesis/estate-lens-fanout/*.md` — one continuing review packet per estate;
- `reports/core-thesis/unmapped-sections/` — public searchable projection.

## Promotion law

```text
known custody object
→ inherited estate context
→ machine-suggested review route
→ human object-level mapping
→ ordinary claim, receipt, case, report, and review gates
```

Machine suggestions never create a claim, intentionality level, graph effect, conclusion, allegation, estate-completion state, or publication approval.
