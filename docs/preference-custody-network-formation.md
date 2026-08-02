# Network dependence and collective preference-formation custody

PC-11 extends Preference Custody from individual longitudinal change into dependence among people, institutions, and ranking surfaces. The control holds the population, identities, network version, instrument, baseline latent state, and final surfaced majority constant while changing the mechanism that generates the observation.

The fixture is synthetic. It creates no graph effect, thesis evidence, named-platform contagion finding, real-world causal conclusion, collective-deliberation claim, manipulation claim, public-authorization verdict, or inference of intent.

## Frozen state

```text
population                 1,000 retained people
network                    network-v1
instrument                 instrument-v1
baseline latent A share    60%
baseline public A report   60%
baseline public A action   60%
post surfaced A share      80%
```

All six worlds preserve the same identities, node-group counts, directed edge classes, homophily index, network version, instrument version, wording hash, and 80/20 surfaced headline.

## Six mechanisms behind one surfaced majority

### Independent private-evidence conversion

Two hundred baseline B-preferrers receive independent person-level evidence favoring A. Their latent preference, public report, and public action change to A. Peer links remain present but do no explanatory work.

```text
latent conversions             200
private-source conversions      200
peer-mediated conversions         0
common-source conversions         0
```

Removing the private evidence returns the surface to 60/40.

### Peer-cascade latent conversion

Fifty B-seed people receive private evidence and convert in round zero. Their converted state reaches 150 B-peer people through the frozen `B_SEED → B_PEER` edge class in round one. The second group then changes latent preference, report, and action.

```text
private seed conversions         50
peer-mediated conversions       150
total latent conversions        200
```

Removing the seed-to-peer edges leaves only the 50 seed conversions and produces a 65/35 surface.

This world supports a bounded peer-influence path because source identity, temporal order, target identities, and the edge class are preserved. It does not establish the counterfactual effect of every edge, manipulation, collective deliberation, or public authority.

### Common-broadcast latent conversion

The same 200 people convert after receiving one institutional broadcast. No peer round occurs. The final latent and public states match the cascade world, but the dependence structure is common-source correlation rather than peer transmission.

```text
common-source conversions       200
peer-mediated conversions         0
```

Removing the broadcast returns the surface to 60/40 although the network remains unchanged.

### Pluralistic conformity without latent conversion

Two hundred B-preferrers observe a perceived local A majority and report A under reputational pressure. Their latent preference and public action remain B.

```text
latent conversions                  0
report-latent divergence          200
action-latent divergence            0
population report A share          80%
population action A share          60%
```

Private anonymous reporting returns the surface to 60/40. The observed public norm therefore differs from the private distribution.

### Coordination action without latent conversion

Two hundred B-preferrers continue to prefer and report B but take action A because the payoff depends on coordinating with the expected network majority.

```text
latent conversions                  0
report-latent divergence            0
action-latent divergence          200
population report A share          60%
population action A share          80%
```

Removing the coordination payoff returns action to 60/40. Coordinated behavior is an equilibrium action, not automatically a private preference.

### Algorithmic visibility amplification

Every person retains the baseline latent preference, report, and action. The ranking surface applies visibility weights of 4.0 to A content and 1.5 to B content. The underlying public report remains 60/40 while the surfaced sample becomes 80/20.

```text
latent A share                      60%
public-report A share               60%
public-action A share               60%
surfaced A share                    80%
latent conversions                   0
report or action divergence          0
```

Uniform visibility weights return the surfaced distribution to 60/40.

## Aggregate separations

```text
worlds                                           6
distinct surfaced headlines                     1
distinct latent headlines                       2
distinct report headlines                       2
distinct action headlines                       2
distinct mechanisms                             6
worlds with latent conversion                   3
worlds without latent conversion                3
independent-conversion worlds                   1
peer-mediated conversion worlds                 1
common-source conversion worlds                 1
report-latent divergence worlds                 1
action-latent divergence worlds                 1
ranking-amplification worlds                    1
network-mediated response worlds                3
collective-deliberation worlds                  0
stable-identity worlds                          6
stable-network-version worlds                   6
stable-instrument worlds                        6
binding public-authority worlds                 0
maximum surfaced-latent separation             20%
maximum surfaced-report separation             20%
```

The final surfaced majority identifies none of these mechanisms by itself.

## Source-separation requirements

A real peer-influence claim must separate at least four candidate sources:

```text
preexisting similarity or homophily
independent private evidence
common institutional or media exposure
ordered peer exposure through a preserved network
```

Correlated change after a common broadcast is not peer contagion. Similar neighbors choosing the same option is not contagion without a temporal exposure path. A cascade after network rewiring cannot inherit an earlier graph receipt without a lineage diff.

## Private, public, and surfaced states

PC-11 preserves three individual states and one observation product:

```text
latent preference
public report
public action
ranked or sampled surface
```

Those objects can diverge under reputational pressure, coordination incentives, or ranking. A public report may conceal a private belief. A coordinated action may be instrumentally rational while contradicting private preference. A ranked surface may differ from every person-level state.

## Collective formation boundary

Peer cascade, conformity, and coordination are network-mediated response mechanisms. None is classified as collective deliberation because the fixture does not preserve reciprocal reason exchange, attributed proposal formation, amendment, group disposition, ratification, or binding consequence.

```text
cascade ≠ deliberation
conformity ≠ consent
coordination ≠ agreement
surfaced majority ≠ public authorization
```

PC-07 and PC-08 continue to control agenda formation and collective bargaining. PC-11 controls the dependence structure behind observed alignment.

## Refusal rules

```text
final majority ≠ independent preference distribution
correlated change ≠ peer influence without source separation
homophily ≠ contagion
common broadcast ≠ network cascade
public action ≠ latent preference under coordination incentives
public report ≠ private belief under conformity pressure
surfaced content share ≠ population report share
engagement cascade ≠ collective deliberation or public authorization
network influence path ≠ manipulation or intent
```

## Real-case promotion boundary

A real network-mediated preference claim requires:

```text
person-level temporal identity
network version and graph hash
edge direction weight and timing
network succession and rewiring history
baseline similarity and homophily
private evidence and common-source exposures
seed selection rule
peer exposure order and dose
latent report and action transitions
ranking sampling and visibility logs
global local and surfaced denominators
source-removal edge-shuffle or other valid counterfactual
subgroup network position and burden
feedback reuse
current model metric policy and validation lineage
```

A network path can support a causal design only when the exposure source and timing are identifiable and the counterfactual addresses homophily, common exposure, interference, and graph change.

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
baseline identity network and instrument snapshot
→ private common and social source state
→ peer exposure and transition rounds
→ latent report and action state
→ ranking sampling and surface state
→ network or source counterfactual
→ mechanism classification
→ interpretation seal
```

Mutating the graph, source, round order, private-public state, ranking weight, surface, counterfactual, or mechanism breaks the chain.

## Run

```bash
node tools/compile-preference-network-formation.mjs
node tools/validate-preference-network-formation.mjs
node test/preference-network-formation.test.js
```

Generated projections:

```text
build/research/preference-network-formation.json
build/research/preference-network-formation.md
```

## Publication boundary

The admissible laboratory statement is that one surfaced 80 percent majority can arise from independent conversion, peer-mediated conversion, common-source conversion, conformity, coordination, or ranking amplification. A real claim of peer contagion, collective preference formation, or network-mediated performative effect requires identity, graph, source, timing, private-public, visibility, interference, and counterfactual custody.
