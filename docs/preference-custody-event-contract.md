# Preference custody event contract

A preference observation is not a free-standing scalar. It is an event inside a chain of authored options, exposure, behavior, interpretation, and later use.

The initial contract used by the option-set starvation fixture preserves five event classes:

```text
population_snapshot
option_set_authored
population_exposed
behavior_observed
interpretation_sealed
```

Every event records:

- a stable event ID;
- event type and evidence class;
- attributed authority;
- source-event IDs;
- complete payload for that stage;
- the prior event hash;
- its own SHA-256 over canonical event bytes.

## Authority separation

`population_snapshot` is the fixture's synthetic ground truth. It does not exist in a normal deployment unless directly elicited or otherwise independently established.

`option_set_authored` records the institutional intervention. It preserves offered options, excluded options, and the declared behavior assumed when a first choice is unavailable.

`population_exposed` records who could encounter the options and under which assignment rule.

`behavior_observed` records choices and nonresponse as intervention-conditioned observations. It cannot silently inherit the authority of the population snapshot.

`interpretation_sealed` records the narrow claim admitted from the observation and the promotions explicitly refused. It is an attributed candidate interpretation, not the record itself.

## Forbidden promotions

An observation generated under a restricted option set cannot be promoted without additional evidence into:

```text
full_population_preference_distribution
public_authorization
preference_change
manipulative_intent
```

The event contract does not declare those conclusions impossible. It requires them to arrive through a separate, receipted identification path rather than through relabeling of the behavioral observation.

## Real deployment minimum

A conforming real-world packet needs the complete considered option set, the options actually offered, eligibility and exposure state, assignment mechanism, instrument and interface, nonresponse semantics, rejected and unexposed alternatives, observed outcomes, institutional interpretation, decision authority, counterfactual evidence, and later reuse in ranking, targeting, validation, or retraining.

A missing stage remains missing. It cannot be reconstructed by treating the next available event as though it carried the authority of the absent one.
