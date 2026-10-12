---
number: 44
kind: issue
title: "Research fan-out: Metric and benchmark governance for synthetic populations"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:32:41Z
closed_at: 2026-08-11T17:25:54Z
url: https://github.com/BigBirdReturns/clifford-number/issues/44
comments: 4
body_sha256: 77aafaac0feb22fe337e9c0457aa66f8f8c2e20e75a08b862f80d5a4aedf4891
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #44: Research fan-out: Metric and benchmark governance for synthetic populations

## Body (verbatim)

<!-- BEGIN BODY #44 bytes=2881 sha256=77aafaac0feb22fe337e9c0457aa66f8f8c2e20e75a08b862f80d5a4aedf4891 -->
## Research-batch contract

- `batch_id`: `substrate/metric-benchmark-governance`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: evaluation-method and scientific-claims corpus
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** How are synthetic-population accuracy metrics, benchmarks, holdouts, baselines, subgroup slices, uncertainty, leakage controls, and headline percentages designed, governed, and reproduced across vendors?

**Selection unit:** one metric definition, benchmark dataset, evaluation question, holdout rule, model version, baseline, subgroup result, error distribution, replication, correction, or marketing claim.

**Selection universe:** every public quantitative validation claim made by the frozen vendor cohort and matched academic methods, captured with page version and date before comparative scoring.

## Task packet

1. Freeze every headline number and its exact claim scope, metric, sample, geography, question format, model version, date, and publisher.
2. Recover or reimplement metric definitions only where public specifications permit; mark proprietary or ambiguous rules as non-reproducible from public material.
3. Record holdout construction, evaluator access, temporal cutoff, training-data leakage controls, answer-option effects, post-processing, weighting, and aggregation.
4. Require ordinary baselines, human-panel reliability, simple demographic models, prior distributions, and calibration checks where appropriate.
5. Report per-question, subgroup, tail, and failure-case results rather than relying on aggregate agreement.
6. Run blind or preregistered replications and preserve successful, failed, and inconclusive outcomes without imputing intent.

## Source families

- vendor methodology pages and technical papers
- academic benchmarks and repositories
- conference and journal supplements
- professional research standards
- independent replication materials

## Predicate and inference boundary

**Allowed predicates:** `metric_defined_as`, `vendor_reported_score`, `holdout_constructed_as`, `baseline_outperformed`, `subgroup_error_reported`, `replication_succeeded`, `replication_failed`.

**Forbidden inferences:** headline percentage predicts individuals; distribution agreement proves causal understanding; proprietary metric is invalid by definition; failed replication proves fraud; one benchmark validates every market.

## Acceptance

A versioned metric registry, claim ledger, reproducibility classification, baseline comparison, and blind-replication protocol covering the full vendor denominator.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #44 -->

## Comments (4)

### Comment 1 of 4: BigBirdReturns, 2026-07-19T16:12:51Z (id 5016432343)

https://github.com/BigBirdReturns/clifford-number/issues/44#issuecomment-5016432343 . updated 2026-07-19T16:12:51Z . author_association OWNER . body sha256 `9cfe557d9075426558716d0adf0f7ea980a912e7ca5e0b751d29ea38d3ea0f5c`

<!-- BEGIN COMMENT 5016432343 bytes=2762 sha256=9cfe557d9075426558716d0adf0f7ea980a912e7ca5e0b751d29ea38d3ea0f5c -->
## First-pass findings receipt — one metric reproduced; headline benchmark remains publicly non-reproducible

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### 1. Smallest real metric path exercised

I froze Electric Twin's 2026-02-11 accuracy page and reimplemented the only metric whose public description was sufficient for a basic calculation: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences

The page defines 1-MAE as mean absolute difference between predicted and actual response proportions, subtracted from 1. A local arithmetic check using actual `[0.5,0.3,0.2]` and predicted `[0.4,0.4,0.2]` produced:

```json
{"MAE":0.066666666666666666,"OneMinusMAE":0.93333333333333335}
```

This reproduces the stated 1-MAE rule for a toy distribution; it does **not** reproduce Electric Twin's score.

### 2. Frozen claim ledger

| Claim | Public scope on page | Reproducibility from public material |
|---|---|---|
| 95.5% 1-MAE | vendor evaluation | metric rule described; benchmark data unavailable |
| 92% NDAM | vendor evaluation | normalisation purpose described, but no complete equation recovered |
| ~94% NDAM “same question twice” | human-noise comparator | underlying waves/sample unavailable |
| ~96% 1-MAE across eight traditional methods | opt-in, river, Prolific, MTurk and others | aggregation/baseline data unavailable |
| 11,000 unique personas | UK and US | dataset/question/subgroup ledger unavailable |
| average 20% NDAM improvement since launch | continuous evaluation; persona construction, post-processing, models changed | model/version series unavailable |

The page says held-out evaluation data is private and not on the internet, evaluation questions are excluded from persona creation, and post-processing/model inputs have changed over time. Those are useful method disclosures, but they also identify the public-reproduction boundary. No per-question distribution, subgroup slice, tail result, temporal cutoff, full model version, or downloadable benchmark was recovered.

### 3. Nearest boundary

Before comparative scoring, the programme needs the exact NDAM equation, frozen question/answer-option ledger, distributions or executable evaluator, model and post-processing versions, temporal cutoffs, and the eight-method baseline construction. Without these, `vendor_reported_score` is supportable; `replication_succeeded`, `baseline_outperformed`, and subgroup claims are not.

### 4. Rerun status

The same toy input deterministically returns 0.933333 for 1-MAE. The vendor's 95.5%/92% headline scores cannot be rerun from current public artifacts. Acceptance remains open; this is a reproducibility classification, not a validity verdict.
<!-- END COMMENT 5016432343 -->

### Comment 2 of 4: BigBirdReturns, 2026-07-19T16:50:48Z (id 5016560679)

https://github.com/BigBirdReturns/clifford-number/issues/44#issuecomment-5016560679 . updated 2026-07-19T16:50:48Z . author_association OWNER . body sha256 `7667cffaf05e8657f3b5bcbbb27dfdaf20305717bcb6e1498e495cd1795fc86b`

<!-- BEGIN COMMENT 5016560679 bytes=2556 sha256=7667cffaf05e8657f3b5bcbbb27dfdaf20305717bcb6e1498e495cd1795fc86b -->
## Second-pass receipt: candidate NDAM equation derived, tested, and kept non-authoritative

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** `graph_effect: none`; no vendor score reproduced

### Baseline action

Started only from the vendor's public statements that:

1. `1-MAE = 1 - (1/k) Σ|pᵢ-qᵢ|`;
2. the worst three-option 1-MAE score is 1/3;
3. NDAM normalises the score to 0–1 regardless of option count.

Source: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences

For normalized categorical distributions, `Σ|p-q| ≤ 2`. If NDAM is the **linear rescaling** of 1-MAE from its option-count-dependent floor `1-2/k` to `[0,1]`, algebra yields the candidate:

```text
NDAM_candidate
= [(1 - L1/k) - (1 - 2/k)] / [1 - (1 - 2/k)]
= 1 - L1/2
= Σ min(pᵢ,qᵢ)
```

That is the complement of total-variation distance / distribution overlap.

### Executed checks

A local arithmetic run produced:

| case | 1-MAE | candidate NDAM | overlap |
|---|---:|---:|---:|
| binary disjoint | 0 | 0 | 0 |
| three-option disjoint | 0.333333 | 0 | 0 |
| p=[.5,.3,.2], q=[.4,.4,.2] | 0.933333 | 0.9 | 0.9 |

The identity `1-L1/2 = Σmin(p,q)` held in all three tests, and the candidate removes the option-count floor exactly.

### Inference boundary

This is a **mathematically consistent candidate**, not `metric_defined_as` for Electric Twin. The public page does not state that the normalisation is linear, publish an equation, or expose evaluator code. Other transforms could also map the endpoints to 0 and 1. Therefore the 92% score remains `vendor_reported_score`, not a reproduced result.

### Current professional disclosure floor

AAPOR's final **Revised June 2026** Code now requires sufficient information for independent review and verification, including exact instruments/response options, population decision rules, AI-sample generation, languages, dates, human-response counts, weighting, limitations, AI task, and human oversight: https://aapor.org/standards-and-ethics/

That standard makes the missing equation and benchmark fields operationally precise; it does not prove noncompliance or invalidate a proprietary metric.

### Nearest boundary

Vendor confirmation or executable evaluator for the exact NDAM equation, followed by frozen per-question distributions, answer-option counts, aggregation weights, subgroup/tail tables, model/post-processing versions, and the eight-method baseline. Only then can the 92% and ~94% human-noise comparator be rerun.

No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016560679 -->

### Comment 3 of 4: BigBirdReturns, 2026-07-19T17:12:07Z (id 5016640407)

https://github.com/BigBirdReturns/clifford-number/issues/44#issuecomment-5016640407 . updated 2026-07-19T17:12:07Z . author_association OWNER . body sha256 `483df98926392ca5ad4f3a38286f311e16f3a992460141db43f749f75a5fc5d7`

<!-- BEGIN COMMENT 5016640407 bytes=2232 sha256=483df98926392ca5ad4f3a38286f311e16f3a992460141db43f749f75a5fc5d7 -->
## Third-pass receipt: vendor-public NDAM retrieval surface closed

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** `graph_effect: none`; no vendor score reproduced

### Baseline path

Enumerated every URL in Electric Twin's public sitemap and inspected the canonical accuracy article for evaluator, code, data, white-paper, or download links:

- sitemap: https://www.electrictwin.com/sitemap.xml
- public accuracy route: https://www.electrictwin.com/accuracy
- canonical article: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences

### Observed artifact

The sitemap currently contains 18 URLs. Only the canonical accuracy article contains `NDAM` / “Normalised Distribution Accuracy” text. The `/accuracy` route returns a permanent redirect to that same article.

The article continues to provide these vendor-authored constraints:

- NDAM ranges from 0 to 1;
- 0 means completely wrong and 1 means a perfect match;
- it removes 1-MAE's answer-option-count floor;
- Electric Twin uses it internally and reports 92%.

But the article's outbound-link surface does not expose an NDAM equation, implementation, evaluator endpoint, white paper, benchmark download, or per-question input/output ledger. The only accuracy-related link recovered from the article points back to its own accuracy route.

### Retrieval verdict

This materially narrows the nearest public-source blocker: there is no second vendor-public definition to reconcile on the current sitemap. The derived identity

```text
1 - ||p-q||₁ / 2 = Σ min(pᵢ,qᵢ)
```

remains a mathematically consistent **candidate**, not Electric Twin's authoritative definition. A sitemap search cannot rule out private, unlinked, deleted, or future material, so this is retrieval closure for the current public site—not proof that no evaluator exists internally.

### Nearest boundary

Vendor publication of the exact equation or executable evaluator, followed by frozen per-question distributions, answer-option counts, aggregation weights, model/post-processing versions, and the human-repeat comparator inputs. Until then, 92% remains `vendor_reported_score`, not `replication_succeeded`.

No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016640407 -->

### Comment 4 of 4: BigBirdReturns, 2026-08-01T13:56:36Z (id 5151733338)

https://github.com/BigBirdReturns/clifford-number/issues/44#issuecomment-5151733338 . updated 2026-08-01T13:56:36Z . author_association OWNER . body sha256 `f8323fac2f2f2239824d70a940ec4c8463ab9614b132a65ad8e95cd032d4d9a6`

<!-- BEGIN COMMENT 5151733338 bytes=2132 sha256=f8323fac2f2f2239824d70a940ec4c8463ab9614b132a65ad8e95cd032d4d9a6 -->
## Metric boundary extension: predictive agreement does not test performative validity

The metric programme now has an explicit successor dependency in #594.

The current findings remain exact: the public 1-MAE rule can be exercised on toy distributions; the vendor's 95.5% and 92% headline scores cannot be reproduced from public benchmark artifacts; the candidate NDAM equation remains non-authoritative. None of those dispositions changes here.

A second boundary is now recorded. Even a fully reproduced static held-out score would answer only whether synthetic and observed response distributions matched under the frozen questions, options, population construction, and evaluation window. It would not establish any of the following:

- that deployment leaves the target population or its option set unchanged;
- that post-deployment clicks, retention, purchase, ratings, or survey answers are exogenous;
- that aggregate agreement preserves minority preferences or collective diversity;
- that a stable model-induced equilibrium is beneficial to the represented population;
- that prediction confers consent or authorizes the intervention.

Primary technical anchors are Perdomo et al., *Performative Prediction* (ICML 2020), Brown et al., *Performative Prediction in a Stateful World* (AISTATS 2022), Miller et al., *Outside the Echo Chamber* (ICML 2021), and Tsoy et al., *On the Impact of Performative Risk Minimization* (ICML 2025). They establish the general mechanism by which model-guided decisions can change the distribution later used for evaluation. They do not establish a performative effect in any named deployment.

Accordingly, future benchmark packets need two distinct verdict families:

```text
static predictive validity
performative intervention validity
```

The first requires frozen questions, distributions, metric code, model version, subgroup slices, and baselines. The second additionally requires the selected intervention, real exposure policy, counterfactual assignment, post-intervention outcomes, distributional effects, and feedback reuse. Passing the first cannot imply passing the second.
<!-- END COMMENT 5151733338 -->

