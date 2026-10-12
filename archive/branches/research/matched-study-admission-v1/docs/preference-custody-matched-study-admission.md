# Matched synthetic-human study admission laboratory v1

This laboratory defines the evidence required to move from public architecture or capability into HV-03, one executed matched synthetic-human study with complete receipts.

The fixtures are synthetic. They create no graph effect, thesis evidence, real company study, universal validation claim, product ranking, causal conclusion, public-authorization verdict, legitimacy finding, or inference of manipulative intent.

## Admission states

```text
complete_matched_execution
bounded_matched_execution_missing_noncritical_context
partial_noncomparable_execution
architecture_or_capability_only
confidential_or_source_restricted
negative_control_no_matched_study
contradicted_or_failed_reconciliation
inadmissible
```

The contract can return no complete study. Confidentiality, an explicit no-study result, contradiction, and failed reconciliation are preserved as valid evidence states rather than erased.

## Evidence matrix

A study packet carries 21 evidence fields across four classes.

### Critical comparability

```text
study identity
synthetic system identity
human method identity
instrument match
population match
assignment and timing
response distributions
uncertainty
missingness
subgroup slices
metric definition
predeclared threshold
```

### Critical execution

```text
predeclared reconciliation rule
decision disposition
feedback-reuse state
current system lineage
```

### Critical governance

```text
participant rights
explicit public-authority state
```

### Bounded context

```text
decision receipt
participant remedy
optional geography reviewer and raw-data context
```

A packet can preserve a comparable study while remaining bounded for publication if the operational receipt or participant-remedy context is absent. It cannot receive complete admission when the instrument, population, uncertainty, reconciliation, decision, or lineage is non-comparable.

## Fixture controls

### Complete positive admission

The complete fixture preserves matched questions, options, population, timing, distributions, uncertainty, missingness, subgroups, a predeclared total-variation threshold, reconciliation, final decision, feedback state, exact runtime and policy lineage, participant rights, an explicit nonbinding public-authority state, and a decision receipt.

The synthetic and human distributions differ by one percentage point, below the predeclared five-point threshold. The result is admitted as bounded agreement for that study only.

### Same topline, different instrument

Both methods produce 80/20. The synthetic question measures appeal while the human instrument measures purchase intent. Identical percentages do not create matched evidence when the question, options, order, and hashes differ.

### Same question, different population

The synthetic result represents subscribers aged 18 to 34. The human sample represents all adults. Without a declared population crosswalk, the aggregate comparison remains non-comparable even when the question wording matches.

### Missing uncertainty and subgroups

The topline distributions appear close, but uncertainty, missingness, and subgroup slices are absent. The packet cannot establish the precision or distributional shape of the agreement.

### Comparable result without a decision receipt

The synthetic and human evidence is comparable and the institutional disposition is reported. The implementation receipt is absent. The study remains bounded because agreement does not establish operational consequence by narration alone.

### Human contradiction and block

The synthetic method predicts 80 percent support for A. The live panel records 45 percent. A predeclared rule blocks the synthetic recommendation, the human evidence triggers the block, and the decision receipt preserves the consequence.

This is a valid negative study. The contradiction and block remain evidence rather than being recoded as missing data or a failed product narrative.

### Stale validation lineage

The current runtime, prompt, postprocessor, metric, and policy differ from the validated configuration. Close synthetic and human distributions do not transfer the old validation badge without a succession receipt.

### Architecture only

A product advertises configurable human validation but no study is executed. The packet remains architecture or capability evidence.

### Source restricted

A provider reports a paired execution but withholds instruments, populations, results, thresholds, and disposition. The packet remains source restricted. Confidentiality is neither validation nor invalidity.

### Explicit no-study control

The institution states that the synthetic and human products operate in parallel and no paired study exists. This is a valid negative control, not evidence of method failure.

### Inadmissible packet

A source packet contains invalid dates, negative sample sizes, distributions above 100 percent, and a negative threshold. The source is preserved and classified as inadmissible rather than silently repaired.

### Material discrepancy without a predeclared rule

A 15-point total-variation discrepancy is accepted through a post hoc discussion. The packet cannot be narrated as validation success because the threshold and reconciliation rule were not predeclared.

## Aggregate laboratory

```text
studies                                            13
complete matched executions                        1
bounded matched executions                         2
partial or non-comparable executions                4
architecture-only packets                          1
source-restricted packets                           1
explicit no-study controls                          1
contradicted or failed-reconciliation packets       2
inadmissible packets                                1
comparability-complete packets                      5
operational human-override receipts                 1
binding public-authority packets                    0
human-to-model feedback updates                     0
```

The laboratory deliberately contains more failures and bounded states than positive admissions. A useful admission contract must preserve refusal and negative evidence at least as reliably as success.

## Custody

Each study emits a SHA-256 hash-linked chain:

```text
study identity recorded
→ synthetic system recorded
→ human method instrument and assignment recorded
→ results recorded
→ comparison resolved
→ reconciliation decision and feedback recorded
→ lineage rights and authority recorded
→ admission state resolved
→ interpretation sealed
```

Changing a distribution, threshold, decision, lineage field, or admission state breaks the chain.

## Required real-study packet

A real HV-03 admission requires:

```text
named or anonymized study and decision object
exact synthetic runtime model prompt retrieval and postprocessing
human method sample eligibility weighting geography and timing
matched question wording options order and instrument hashes
population crosswalk and assignment rule
question-level synthetic and human distributions
uncertainty missingness and subgroup slices
executable metric and predeclared threshold
predeclared discrepancy and reconciliation rule
attributed decision owner final disposition and implementation receipt
human override consequence or explicit absence
human-to-model feedback reuse or explicit refusal
current metric policy benchmark and succession lineage
participant disclosure correction withdrawal complaint and remedy
explicit binding or nonbinding public-authority state
```

A complete packet can still produce a negative result. Completeness governs evidentiary admission, while agreement or contradiction governs the study outcome.

## Run

```bash
node tools/compile-preference-matched-study-admission.mjs
node tools/validate-preference-matched-study-admission.mjs
node test/preference-matched-study-admission.test.js
```

Generated projections:

```text
build/research/preference-custody/matched-study-admission.json
build/research/preference-custody/matched-study-admission.md
```

## Publication boundary

Passing the contract establishes only that one study packet is sufficiently complete and comparable under its declared method. It does not establish universal model validity, product superiority, causal effect, participant consent to downstream objectives, fair value allocation, or binding public authorization.
