# PC-29 — saturation, general-equilibrium, and interference-robust policy custody

## Status

This is a synthetic Preference Custody control. It has no graph effect, consumes no thesis evidence, creates no real-world causal, equilibrium, market, or welfare conclusion, and confers no public authority.

## Frozen publication surface

All eight worlds preserve:

```text
operative release               RELEASE-INCIDENT-V1@1
observed markets                10
observed units                 100
public equilibrium status       equilibrium_adjusted
reported direct effect          0.20
reported equilibrium effect     0.18
reported welfare gain           0.15
published price change          0.00
published capacity change       0.00
published replications             2
approved use                    systemwide_release_policy
```

This surface does not identify a valid untreated-system counterfactual, unsaturated markets, sufficient capacity, complete queue and denial denominators, stable service quality, price or availability feedback, unanticipated behavior, absence of gaming or provider adaptation, bounded substitution and harm transfer, a unique policy-relevant equilibrium, explicit welfare incidence, independent replication, current scale lineage, correction, or authority.

## Eight governance worlds

1. Complete market counterfactual, capacity, price, substitution, welfare, independent replication, correction, and current-lineage assurance.
2. Universal saturation without an untreated system counterfactual.
3. Capacity constraints, queues, rationing, denial, and quality deterioration.
4. Price, availability, affordability, demand, and uptake feedback.
5. Strategic anticipation, gaming, compliance adaptation, and provider response.
6. Substitution, displacement, crowd-out, rebound, and harm transfer.
7. Multiple equilibria, path-dependent favorable selection, and unpublished welfare weights.
8. Pilot partial-equilibrium extrapolation after scale, supplier, policy, population, and workflow succession.

Only the first world satisfies complete equilibrium assurance. Each negative world preserves the same public `equilibrium_adjusted` surface while failing a distinct system-governance mechanism.

## Deterministic aggregate

```text
worlds                                         8
public-status signatures                      1
equilibrium-governance signatures             8
complete equilibrium-assurance worlds         1

saturated units                             100
capacity-constrained units                    60
queued units                                  40
rationed units                                30
denied units                                  20
quality-deteriorated units                    30
price-exposed units                           60
affordability-shifted units                   40
demand-shifted units                          40
uptake-shifted units                          30
anticipating units                            50
gaming units                                  30
compliance-adapted units                      30
provider-response units                       40
substituted units                             50
displaced units                               40
crowd-out units                               30
rebound units                                 20
harm-shifted units                            40
cross-market exposures                       100
intertemporal exposures                       40
path-dependent units                          60
stale scale decisions                        100
unsupported equilibrium decisions            700
binding public-authority worlds                0
```

## Custody chain

Each world emits a ten-event SHA-256 chain:

```text
public equilibrium surface
→ market counterfactual and saturation
→ capacity, queue, rationing, access, and quality
→ price, availability, affordability, demand, and uptake
→ strategic anticipation, gaming, compliance, and provider response
→ substitution, displacement, rebound, and harm transfer
→ equilibrium multiplicity, path selection, and welfare incidence
→ replication, scale lineage, analysis, correction, and authority
→ derived assurance flags
→ mechanism classification
```

## Refusal boundary

The control enforces, among other separations:

```text
universal rollout ≠ untreated system counterfactual
observed untreated units ≠ untreated markets under saturation
zero published capacity change ≠ unconstrained capacity
completed service ≠ eligible or attempted service denominator
zero published price change ≠ zero affordability or availability feedback
stable uptake ≠ absence of demand adaptation
pre-policy behavior ≠ unanticipated post-announcement behavior
compliance ≠ absence of gaming or provider response
within-market gain ≠ system welfare after substitution or harm transfer
one solved equilibrium ≠ unique policy-relevant equilibrium
favorable initialization ≠ equilibrium identification
aggregate welfare gain ≠ explicit weights, incidence, or absence of harmed groups
replication count ≠ independent equivalent replication
pilot partial equilibrium ≠ current systemwide assurance after scale succession
equilibrium_adjusted ≠ complete, current, correctable, publicly authorized evidence
```

An equilibrium-assurance failure does not prove coercion, manipulation, discrimination, breach, misconduct, coordination, common purpose, or intent. A real systemwide policy claim still requires complete market, counterfactual, saturation, capacity, access, price, availability, response, substitution, equilibrium, welfare, replication, succession, correction, durability, and authority custody.

## Commands

```bash
node tools/compile-preference-equilibrium-assurance.mjs
node tools/validate-preference-equilibrium-assurance.mjs
node test/preference-equilibrium-assurance.test.js
```

The compiler writes deterministic JSON and Markdown projections under `build/research/`.
