# YouGov Parallax hybrid-architecture positive control

This packet records a bounded real-world positive control for Preference Custody. YouGov Parallax publicly connects AI twin simulation to configurable surveys of live panelists and explicitly distinguishes methodology verification from finding-specific validation.

The packet creates no graph effect, thesis evidence, reproduced matched-study result, subgroup-parity finding, public-authorization finding, product-safety verdict, performance-superiority conclusion, causal-effect claim, or inference of manipulative intent.

## Confirmed product architecture

YouGov publicly describes two connected layers:

```text
AI twin simulation
→ rapid exploration across questions and audiences

live panel validation
→ surveys testing all results, selected findings, or new follow-up questions
```

The validation population may be configured as:

```text
a subset of the panel members whose twins were used
a fresh general-population sample
a targeted audience
```

Sample size, turnaround time, validation depth, and audience breadth are configurable. YouGov advertises rapid validation options with results in as little as 30 minutes.

## Verification and validation

YouGov defines two different objects:

```text
verification
Does the twin methodology reproduce the response of the real panel member represented?

validation
Does a client-specific simulated finding hold when the question is put to live panelists?
```

That distinction is materially useful. A system-level benchmark cannot silently stand in for validation of every later research finding, and a finding-specific human check cannot silently prove the entire twin methodology.

## Public-demo and replacement boundaries

The public Parallax demo exposes the simulation layer. YouGov says demo results are not automatically validated by live people. Full enterprise access offers configurable validation.

YouGov also states that Parallax is intended for custom and ad hoc research and is not designed to replace tracking studies, which require consistent real-world measurement over time.

The bounded positive is therefore:

```text
integrated hybrid product architecture: confirmed
live human validation capability: confirmed
verification-validation distinction: confirmed
public demo automatically validated: false
tracking-study replacement: false
```

## Execution boundary

Public product materials do not provide one complete executed study with:

```text
matched synthetic and human instruments
sample construction and eligibility
question-level response distributions
uncertainty and subgroup errors
disagreement and reconciliation
human override consequence
final decision disposition
human-to-twin feedback update
deployment-specific runtime and metric lineage
participant correction or remedy
```

The correct execution state remains:

```text
one fully reproduced matched study: not established
study-level discrepancy handling: not established
human override: not established
binding public authority: not established
independent performance superiority: not established
```

## Preference Custody relations

### PC-01: exposure-policy confounding

The architecture makes a live-human validation gate available before deployment. A specific intervention, exposure assignment, counterfactual, post-deployment outcome, and feedback-reuse chain are not publicly recovered.

### PC-03: observational equivalence

The architecture explicitly separates method verification from finding validation and permits live responses to test simulated findings. No complete matched result or competing-mechanism analysis is public.

### PC-05: subgroup response capacity and burden

Narrower, broader, and targeted validation samples are configurable. Configurability does not establish legitimate group definitions, subgroup parity, adaptation burden, or remedy in a particular study.

### PC-06: standing and objective-control authority

Live panel responses are human evidence. Public materials do not establish binding objective amendment, suspension, veto, appeal, remedy, or implementation authority for panelists.

### PC-09: model, metric, policy, and validation succession

The public architecture distinguishes verification and validation and discloses that the demo is simulation-only. It does not publish the deployment-specific runtime, prompt, retrieval, postprocessing, metric code, benchmark distributions, action policy, consequence test, revalidation crosswalk, or rollback history for one study.

## Custody

The compiler emits a SHA-256 hash-linked chain:

```text
product surface recorded
→ simulation layer recorded
→ human validation layer recorded
→ verification-validation distinction recorded
→ bounded architecture classification
→ interpretation sealed
```

This prevents available human validation from being promoted into proof that every output was validated or that a particular study was executed correctly.

## Run

```bash
node tools/compile-preference-hybrid-architecture.mjs
node tools/validate-preference-hybrid-architecture.mjs
node test/preference-hybrid-architecture.test.js
```

Generated projections:

```text
build/research/preference-real-cases/yougov-parallax-hybrid-architecture.json
build/research/preference-real-cases/yougov-parallax-hybrid-architecture.md
```

## Publication boundary

The admissible statement is that YouGov Parallax publicly integrates AI twin simulation with configurable live-panel validation, distinguishes methodology verification from finding validation, discloses that its public demo is not automatically human-validated, and does not present itself as a replacement for tracking studies. The packet does not establish that every enterprise result is validated, that one matched study has been independently reproduced, that human findings can override a decision, or that survey participants possess binding public authority.
