# Performative synthetic constituency fixture

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It tests one narrow identification failure: an institution can change the observed distribution of engagement by changing exposure while every person's underlying preference remains fixed.

The fixture is intentionally synthetic. It creates no claim about Electric Twin, News UK, Dentsu, any vendor, any publisher, or any real population. Its `graph_effect` is `none`, it does not count toward thesis evidence, and its generated projection carries the interpretation contract from the source fixture.

## What it proves

For a population with fixed preferences `A=60%` and `B=40%`, exposing A to 90% of the population and B to 10% produces raw click shares of approximately `A=93.10%` and `B=6.90%` under the fixture's response rule. Training the next exposure policy on those raw shares pushes the apparent A preference above 95% even though the latent population remains 60/40.

When the exposure propensities are preserved, inverse-propensity correction recovers the frozen 60/40 distribution in both rounds. This establishes the refusal rules:

```text
not exposed ≠ rejected
no click ≠ negative preference
raw engagement share ≠ population preference
```

The fixture does not claim that inverse-propensity correction resolves all real-world confounding. It shows why exposure state is a minimum evidentiary requirement before engagement is narrated as preference.

## Run

```bash
node tools/compile-performative-synthetic-constituency.mjs
node tools/validate-performative-synthetic-constituency.mjs
node test/performative-synthetic-constituency.test.js
```

Generated projections:

```text
build/research/performative-synthetic-constituency-fixture.json
build/research/performative-synthetic-constituency-fixture.md
```

## Acceptance boundary

A future real-world case must preserve the model and version, question and complete option set, synthetic output, institutional disposition, rejected alternatives, exposure policy, eligible population, assignment mechanism, untreated or alternate-treatment evidence where causal language is used, post-intervention outcomes, and every later model or policy update using those outcomes.

Without those records, the result remains `preference_identification_unavailable`. A successful campaign, product, or engagement outcome is not by itself evidence that the institution discovered an independent preference rather than measuring behavior conditional on the environment it selected.
