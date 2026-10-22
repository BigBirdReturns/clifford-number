# Preference custody and option-set starvation

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It extends the exposure-confounding control by sealing the option set itself.

A population can prefer an option that the institution never offers. Later behavior can then be narrated as preference even though the missing option had no opportunity to generate evidence. The fixture holds one population fixed while changing only what happens when a first choice is unavailable.

## Frozen population

```text
A first choice: 400
B first choice: 300
C first choice: 300
```

Only A and B are offered.

In the fallback scenario, C-preferrers select B because C is unavailable:

```text
A observed choices: 400
B observed choices: 600
C observation state: unoffered
```

B therefore receives 60 percent of observed choices although only 30 percent of the population held B as its first choice.

In the abstention scenario, C-preferrers make no selection:

```text
A observed choices: 400
B observed choices: 300
nonresponse: 300
C observation state: unoffered
```

Among recorded choices, A now appears to hold 57.14 percent and B 42.86 percent. The population did not change between scenarios. The interface and unavailable-option behavior changed the observable evidence.

## Custody rule

The compiler emits a hash-linked event chain for each scenario:

```text
population snapshot
→ option set authored
→ population exposed
→ behavior observed
→ interpretation sealed
```

The chain keeps the population, institutional intervention, observation, and candidate interpretation as separate attributable events. Tampering with a later observation breaks the chain. An interpretation event may describe behavior among offered options, but it cannot promote the observation into a complete first-choice distribution, public authorization, preference change, or manipulative intent.

## Refusal rules

```text
unoffered option ≠ rejected option
choice among offered options ≠ latent preference
fallback selection ≠ first choice
nonresponse ≠ negative preference
synthetic prediction ≠ public authorization
intervention-conditioned observation requires option-set provenance
```

## Run

```bash
node tools/compile-preference-custody.mjs
node tools/validate-preference-custody.mjs
node test/preference-custody.test.js
```

Generated projections:

```text
build/research/preference-custody-option-set-fixture.json
build/research/preference-custody-option-set-fixture.md
```

## Evidence boundary

This is a deterministic synthetic control. It creates no claim about Electric Twin, News UK, Dentsu, any vendor, any publisher, or any real population. Its `graph_effect` is `none`, it does not count toward thesis evidence, and it cannot be consumed as evidence of preference manipulation or intent.

A real-world workflow cannot identify population preference from choice behavior unless it preserves the complete option set, excluded and rejected alternatives, exposure and eligibility state, unavailable-option behavior, nonresponse semantics, counterfactual opportunities, institutional decision authority, and every later reuse of the resulting observations.
