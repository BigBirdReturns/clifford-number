# M-04C.H0 · Explicit research-track mappings

The first orbital mapping pass replaces inherited-only routing for every currently declared research-track membership with a checked-in object-level mapping.

```text
10 research tracks
29 estate memberships
29 explicit research-track mappings
0 research-track memberships left inherited-only
```

## Basis

Each mapping is grounded only in:

- the track's own `research-track-harness@1` question, scan, denominator, source adapters, coverage discipline, and epistemic contract; and
- the checked-in primary/related estate assignment in `data/estates/track-map.jsonl`.

The pass does not claim that a search was executed, a crossing exists, a public-private conversion occurred, or any actor coordinated, influenced, captured, profited improperly, or committed wrongdoing. Most harnesses remain `status: scaffold`, and their coverage seeds remain `not_searched`.

## Mapped tracks

- Opportunity Zone value-capture formation
- Transit station-area TOD formation sweep
- CHIPS-Act fab and data-center siting formation
- Stadium and arena public-finance capture
- Tax-increment-financing district value capture
- OGE-278 senior-appointee revolving-door routers
- Defense-tech accelerator and fund roster routers
- Regulatory revolving-door routers
- Congressional disclosure and federal money-stream crossings
- State officeholder land and contract crossings

## Conversion grammar

The pass maps the questions the harnesses are designed to test:

```text
bounded denominator and option set
→ public designation, appointment, approval, contract, or subsidy
→ ownership, vehicle, land, governance, or control architecture
→ money, capital, value, or residual-rights question
→ explicit nulls, unsuccessful paths, ethics, adjudication, recovery, and controls
```

Place-formation tracks also preserve planning and agenda formation where the harness explicitly asks about plans, entitlement, designation, public commitment, and intermediary governance. Person-router and disclosure-crossing tracks preserve personnel-routing, exact entity, temporal, ethics, and null-control questions without treating routing scores or exact overlaps as allegations.

## Regression

The estate-lens audit regression now derives the expected research-track membership set directly from `data/estates/track-map.jsonl` and refuses:

- any declared track membership that is not `explicit_mapped`;
- duplicate mapping IDs;
- duplicate estate/object mapping keys;
- a research-track mapping without the exact harness and track-map basis;
- graph effects or generated conclusions.

## Next pass

The next H0 orbit maps the twenty declared estate slices and their 53 primary/related memberships. Those rows require slice-specific phase and conversion-stage review rather than automatic inheritance from the parent track.

```text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
```
