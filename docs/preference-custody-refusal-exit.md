# Preference custody, strategic refusal, and exit

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It tests whether a normalized post-intervention share can distinguish genuine preference conversion from selective exit or strategic nonresponse.

## Frozen baseline

```text
A first choice: 600
B first choice: 400
population: 1,000
```

The institution selects A and reports normalized observed share among retained or responding people.

Every candidate world produces the same headline:

```text
A: 80%
B: 20%
```

The underlying worlds differ.

### Genuine conversion

Two hundred B-preferrers convert to A. Nobody exits or withholds response.

```text
post-transition A: 800
post-transition B: 200
observed total: 1,000
```

### Selective exit

Preferences do not change. Two hundred fifty B-preferrers exit.

```text
post-transition A: 600
post-transition B: 400
observed A: 600
observed B: 150
exit: 250
observed total: 750
```

### Strategic silence

Preferences do not change. Two hundred fifty B-preferrers remain in the population but withhold response.

```text
post-transition A: 600
post-transition B: 400
observed A: 600
observed B: 150
nonresponse: 250
observed total: 750
```

The normalized 80/20 headline is therefore compatible with preference change, selective exit, and strategic silence. The headline does not identify which process occurred.

## Custody chain

Each world emits a hash-linked chain:

```text
baseline population
→ institutional intervention
→ post-intervention disposition
→ full observation
→ lossy headline aggregation
→ interpretation sealed
```

The full observation records preference transitions, exit, nonresponse, observed counts, and the original population denominator. The headline event is explicitly classified as a lossy aggregate. It cannot inherit the authority of the full observation or baseline population.

## Refusal rules

```text
retained sample ≠ original population
exit ≠ preference conversion
nonresponse ≠ indifference
churn ≠ negative preference without reason
normalized share requires denominator and attrition
post-intervention active share ≠ public authorization
organized refusal ≠ missing data
```

## Run

```bash
node tools/compile-preference-attrition.mjs
node tools/validate-preference-attrition.mjs
node test/preference-attrition.test.js
```

Generated projections:

```text
build/research/preference-attrition-refusal.json
build/research/preference-attrition-refusal.md
```

## Evidence boundary

This fixture creates no claim about Electric Twin, News UK, Dentsu, any vendor, any publisher, or any real population. It creates no preference-change finding, refusal finding, manipulation claim, intent inference, graph effect, or thesis evidence.

A real workflow needs baseline population membership, complete post-intervention disposition accounting, exit and churn reasons, response eligibility and contact state, denominator history, recontact evidence, subgroup attrition, and burden distribution before a normalized retained share can be narrated as population support.
