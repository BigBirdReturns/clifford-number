# Preference custody, subgroup response capacity, and burden

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It tests whether one aggregate success rate can identify how an intervention distributes success, failure, and the cost of adapting across affected groups.

## Frozen population and headline

The synthetic population contains two equally sized groups:

```text
alpha: 500
beta: 500
```

The institution reports one aggregate result:

```text
success: 800
failure: 200
aggregate success rate: 80%
```

Every candidate world produces that same headline.

### Balanced capacity

```text
alpha: 400/500 success, cost per success 10, total burden 4,000
beta:  400/500 success, cost per success 10, total burden 4,000
subgroup success-rate gap: 0 percentage points
adaptation-cost ratio: 1×
```

### Alpha advantaged

```text
alpha: 500/500 success, cost per success 2,  total burden 1,000
beta:  300/500 success, cost per success 30, total burden 9,000
subgroup success-rate gap: 40 percentage points
adaptation-cost ratio: 15×
```

### Beta advantaged

The third world reverses the allocation. Beta receives complete success at low adaptation cost, while alpha receives 60 percent success and fifteen times the cost per successful adaptation.

The aggregate record remains 80 percent in all three worlds. It does not identify parity, concentrated failure, or concentrated burden.

## What the control proves

Aggregate performance and distributional performance are different objects. A system can improve or preserve its headline while changing which groups succeed, which groups fail, and which groups must expend more time, money, attention, risk, or institutional labor to achieve the recorded success.

Observed adaptation is also not preference. A person or group may comply because alternatives are unavailable, because refusal is expensive, because exit is impossible, or because the surrounding institution has shifted the burden of adjustment onto them. The behavioral record alone cannot distinguish willingness from capacity, constraint, or necessity.

The control therefore enforces:

```text
aggregate success ≠ subgroup parity
adaptation ≠ preference
compliance ≠ low burden
average gain ≠ cancellation of concentrated harm
high-capacity group ≠ universal population
missing group slice ≠ no disparity
distributional acceptability requires external authority
```

## Custody chain

Each candidate world emits a hash-linked chain:

```text
group population snapshot
→ institutional intervention
→ group-level outcomes
→ aggregate headline
→ interpretation sealed
```

The group-level event preserves denominator, success, failure, success rate, cost per success, and total adaptation burden for each group. The aggregate event is explicitly classified as a lossy projection and records that group slices were withheld from the headline. The interpretation event may state aggregate success under the recorded group outcomes, but it cannot promote the headline into subgroup parity, voluntary preference, low burden, distributional acceptability, public authorization, or manipulative intent.

## Evidence required in a real deployment

A real case needs more than a single aggregate score. It must preserve:

- group denominators and membership rules;
- assignment and exposure by group;
- baseline capacity, constraints, and available alternatives;
- group-level success, failure, exit, and nonresponse;
- adaptation cost and burden distribution;
- counterfactual outcomes under alternate interventions;
- affected-group contestation, suspension, and remedy rights.

The group ontology itself must also be receipted and reviewable. A missing group may reflect a legitimate privacy boundary, a poor denominator, a category the institution failed to recognize, or a population denied enough standing to require measurement. The fixture does not authorize identity-adjacent profiling or treat every possible grouping as legitimate.

## Run

```bash
node tools/compile-preference-subgroup.mjs
node tools/validate-preference-subgroup.mjs
node test/preference-subgroup.test.js
```

Generated projections:

```text
build/research/preference-subgroup-capacity.json
build/research/preference-subgroup-capacity.md
```

## Evidence boundary

This fixture creates no claim about Electric Twin, News UK, Dentsu, any vendor, any publisher, or any real population. It creates no discrimination finding, preference-change finding, manipulation claim, intent inference, graph effect, or thesis evidence.

Its qualified conclusion is narrower: one aggregate success rate can remain unchanged while the distribution of success and adaptation burden changes materially. Distributional acceptability cannot be inferred from aggregate fit because acceptability depends on affected groups possessing standing over the burden, threshold, objective, and remedy.
