# Dynamic preference change, composition, and measurement custody

PC-10 extends the Preference Custody laboratory from static identification failures into longitudinal change. The control holds the public headline constant while changing the mechanism beneath it.

The fixture is synthetic. It creates no graph effect, thesis evidence, named-deployment finding, causal conclusion, manipulation claim, public-authorization verdict, or inference of intent.

## Frozen observed headline

```text
baseline observed share
A = 60%
B = 40%

post-period observed share
A = 80%
B = 20%
```

All six worlds emit the same 80/20 post-period headline.

## Six mechanisms behind one shift

### Stable-panel neutral-learning conversion

The same 1,000 people remain under the same instrument. Two hundred baseline B-preferrers receive common neutral information and change their latent preference to A. Their reported choices track the changed latent state.

```text
individual conversions  200
entrants                    0
exits                       0
instrument drift            0
report-latent divergence    0
```

This world contains genuine individual preference change. The common exposure and absence of an untreated control do not identify how much of that change would have occurred otherwise.

### Stable-panel targeted-exposure conversion

The same two hundred baseline B-preferrers receive a model-selected persuasive exposure. Their latent preference and reported choice change to A.

```text
individual conversions  200
model-selected target    B_SHIFT
performative path        supported
randomized holdout       absent
```

This world preserves a bounded path from model-selected intervention to real exposure and changed latent state. The path does not establish manipulation, improper intent, public injury, or the counterfactual effect size without a valid exposure design.

### Composition replacement without individual conversion

Two hundred B-preferrers exit the observed population. Two hundred new A-preferrers enter. Every retained person keeps the same latent preference and reported choice.

```text
individual conversions    0
entrants                 200
exits                    200
post latent share A      80%
post observed share A    80%
```

The population changed. The people did not.

### Instrument drift without individual conversion

The same panel remains and every latent preference remains fixed. The wording and instrument version change. Two hundred latent B-preferrers now report A under the new instrument.

```text
individual conversions          0
instrument invariant            false
report-latent divergence      200
post latent share A            60%
post observed share A          80%
```

Panel continuity cannot rescue an untracked measurement change.

### Strategic compliance without latent conversion

The panel and instrument remain stable. A reward or reporting pressure favors answer A. Two hundred latent B-preferrers report A while retaining B.

```text
individual conversions          0
reporting pressure            true
report-latent divergence      200
post latent share A            60%
post observed share A          80%
```

Reported choice under an incentive is an observed response. It is not automatically a latent preference.

### Postprocessing and imputation without observed conversion

The panel, instrument, and latent preferences remain stable. Two hundred B responses are not directly observed and are imputed as A by postprocessing.

```text
individual conversions          0
imputed observations          200
directly observed shift         0
post latent share A            60%
published observed share A     80%
```

An imputed response is part of a measurement product. It is not a direct human observation.

## Aggregate separations

```text
worlds                                             6
distinct observed headline signatures             1
distinct latent headline signatures               2
distinct mechanism signatures                     6
worlds with individual conversion                  2
worlds without individual conversion               4
stable-panel worlds                                5
composition-change worlds                          1
instrument-drift worlds                            1
strategic-compliance worlds                        1
imputation worlds                                  1
targeted performative-path worlds                  1
binding public-authority worlds                    0
maximum observed-latent total variation          20%
```

The common aggregate shift identifies none of those mechanisms by itself.

## Longitudinal custody requirements

A real dynamic-preference claim requires a joined record of:

```text
baseline cohort identities
retained identities
entrants and exits
nonresponse and recontact history
latent transition evidence
reported response transitions
instrument and wording versions
instrument crosswalk when the measure changes
exposure assignment timing dose and eligibility
incentive coercion and strategic-reporting state
postprocessing weighting and imputation
subgroup transition matrices
counterfactual design
post-intervention outcomes
feedback reuse
current system and validation lineage
```

A panel identifier alone establishes neither latent continuity nor measurement invariance. A stable instrument alone does not identify the effects of exposure, incentives, exit, or entry.

## Performative path boundary

The targeted-exposure world supports a synthetic path inside the fixture:

```text
model-selected target
→ targeted persuasive exposure
→ retained-person latent conversion
→ changed reported choice
```

That path is stronger than an aggregate before-and-after correlation. It remains weaker than a causal effect estimate because no randomized or otherwise adequate counterfactual is preserved. It also says nothing by itself about manipulation, intent, legitimacy, or public authorization.

## Refusal rules

```text
aggregate shift ≠ individual preference change
panel continuity ≠ instrument invariance
reported choice ≠ latent preference under strategic incentives
entry and exit ≠ conversion
imputation ≠ observed human response
instrument drift ≠ population learning
targeted-exposure conversion supports a performative path, not manipulation or intent
longitudinal change requires identity, transition, instrument, exposure, and attrition custody
dynamic preference change ≠ public authorization
```

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
baseline cohort snapshot
→ instrument, exposure, and incentive state
→ identity and latent transition
→ reported-response matrix
→ postprocessing and imputation
→ aggregate headline
→ mechanism classification
→ interpretation seal
```

A mutation to cohort identity, latent transition, reported choice, instrument, exposure, incentive, imputation, headline, or classification breaks the chain.

## Run

```bash
node tools/compile-preference-dynamic-change.mjs
node tools/validate-preference-dynamic-change.mjs
node test/preference-dynamic-change.test.js
```

Generated projections:

```text
build/research/preference-dynamic-change.json
build/research/preference-dynamic-change.md
```

## Publication boundary

The admissible laboratory statement is that one observed 60-to-80 percent shift can arise from genuine conversion, targeted performative conversion, population replacement, instrument drift, strategic compliance, or imputation. A real claim of individual preference change or performative effect requires longitudinal identity, invariant or crosswalked measurement, exposure, incentive, attrition, subgroup, counterfactual, and postprocessing evidence.
