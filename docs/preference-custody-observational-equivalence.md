# Preference custody and observational equivalence

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It tests the next identification boundary after exposure and option-set custody: identical aggregate behavior can be produced by materially different latent preferences and response mechanisms.

## Shared observation

Every candidate world produces:

```text
A observed choices: 600
B observed choices: 400
nonresponse: 0
```

The three latent worlds are:

```text
World 1: A=60%, B=40%, C=0%
World 2: A=30%, B=40%, C=30%; C falls back to A
World 3: A=60%, B=10%, C=30%; C falls back to B
```

Each pair of latent distributions is separated by total-variation distance 0.30. All three worlds have the same observation signature.

The 60/40 behavioral result therefore does not identify a 60/40 first-choice distribution. It is also compatible with substantial demand for an unavailable option and different fallback mechanisms.

## Identification result

```text
same behavior ≠ same preference
behavioral fit ≠ identified mechanism
aggregate choice ≠ unavailable-option demand
predictive agreement ≠ public authorization
```

The fixture does not claim that one of the three candidate worlds is the true interpretation of any real deployment. It proves that aggregate behavior alone cannot choose among them.

## Required additional evidence

Disambiguation requires evidence outside the shared aggregate observation, such as:

- direct first-choice elicitation;
- randomized expansion of the option set;
- ranked or sequential-choice instruments;
- counterfactual exposure to excluded options;
- an identified fallback and nonresponse model.

A model can match observed behavior perfectly while remaining wrong about why the behavior occurred, which unoffered options were wanted, or whether the represented people authorize the intervention.

## Custody

Each candidate world has its own hash-linked event chain:

```text
population snapshot
→ option set authored
→ behavior observed
```

The distinct population and mechanism events produce different world hashes. The identical observed payload produces one shared observation signature. The build therefore preserves both facts at once: several causal worlds remain compatible with the same behavioral record.

## Run

```bash
node tools/compile-preference-equifinality.mjs
node tools/validate-preference-equifinality.mjs
node test/preference-equifinality.test.js
```

Generated projections:

```text
build/research/preference-observational-equivalence.json
build/research/preference-observational-equivalence.md
```

## Evidence boundary

This fixture creates no graph effect, thesis evidence, real-world causal claim, preference-change claim, or intent inference. It does not establish that Electric Twin, News UK, Dentsu, any vendor, or any named deployment concealed a preference or used an invalid model.

A real-world system needs intervention provenance and a design that can discriminate among competing explanations. High predictive agreement against behavior observed under one option set is a fit result. It is not an identified explanation of the public.
