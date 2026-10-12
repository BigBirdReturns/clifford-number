---
number: 45
kind: issue
title: "Research fan-out: Cross-cultural and multilingual extrapolation"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:32:54Z
closed_at: 2026-08-11T18:44:31Z
url: https://github.com/BigBirdReturns/clifford-number/issues/45
comments: 3
body_sha256: fe25cb4bf1cb89b1fa7e96b009303987a34256108726db284e51ef2732d34a90
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #45: Research fan-out: Cross-cultural and multilingual extrapolation

## Body (verbatim)

<!-- BEGIN BODY #45 bytes=2845 sha256=fe25cb4bf1cb89b1fa7e96b009303987a34256108726db284e51ef2732d34a90 -->
## Research-batch contract

- `batch_id`: `substrate/cross-cultural-extrapolation`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: geographic generalisation and coverage case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** What evidence supports synthetic-population claims across countries, languages, minority groups, political systems, and culturally distinct markets, and where do vendors abstain, localise, or silently extrapolate?

**Selection unit:** one claimed country, language, population, dataset, validation result, local partner, translation process, cultural adaptation, abstention, deployment, or documented failure.

**Selection universe:** every country and language claimed, evaluated, or deployed across the frozen vendor cohort, compared against the smaller set with public validation evidence.

## Task packet

1. Freeze claimed geographic and language coverage by page version, date, product tier, and whether the claim means availability, evaluation, or customer activity.
2. Map underlying data availability, sample provenance, language-model support, translation, local weighting, local experts, and recency.
3. Record country-level and subgroup validation, uncertainty, calibration, failure, abstention, and unsupported-market warnings.
4. Test culturally sensitive questions, political attitudes, minority populations, dialects, low-resource languages, and rapidly changing events under preregistered protocols.
5. Compare claimed coverage with actual customer, partner, or public-sector deployment and regulatory restrictions.
6. Preserve broad-coverage marketing claims without interpreting them as equal accuracy across markets.

## Source families

- vendor coverage and methodology materials
- country-level case studies and customer announcements
- academic cross-cultural benchmarks
- language and dataset documentation
- local regulator and research-industry standards

## Predicate and inference boundary

**Allowed predicates:** `available_in_country`, `supports_language`, `validated_in_population`, `localised_with`, `abstained_for_market`, `country_level_error_reported`.

**Forbidden inferences:** availability proves accuracy; English-language validation transfers automatically; one national sample represents all subgroups; customer presence proves cultural validity; missing local validation proves failure.

## Acceptance

A country-language coverage matrix separating availability, data support, validation, deployment, localisation, uncertainty, and abstention for every vendor.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #45 -->

## Comments (3)

### Comment 1 of 3: BigBirdReturns, 2026-07-19T16:12:55Z (id 5016432548)

https://github.com/BigBirdReturns/clifford-number/issues/45#issuecomment-5016432548 . updated 2026-07-19T16:12:55Z . author_association OWNER . body sha256 `ae2815e7d2d37fe0981e589da637bdb5309e3ed87204f6ea91b103375fdf7ed2`

<!-- BEGIN COMMENT 5016432548 bytes=2665 sha256=ae2815e7d2d37fe0981e589da637bdb5309e3ed87204f6ea91b103375fdf7ed2 -->
## First-pass findings receipt — coverage claim and detailed validation scope diverge

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### 1. Smallest real coverage path exercised

I compared Electric Twin's live coverage headline with its detailed validation-method page rather than treating availability as accuracy.

- The current homepage states **“50k evals across 155 countries, continuously benchmarked”**: https://www.electrictwin.com/
- The 2026-02-11 accuracy page states its accuracy evaluations use **11,000 unique personas spanning UK and US populations**: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences
- The FAQ says international and hard-to-reach audiences can be constructed **with appropriate seed data**, but does not enumerate languages or validated markets: https://www.electrictwin.com/faq

### 2. Provisional country-language record

| Dimension | Public observation | Classification |
|---|---|---|
| broad coverage headline | 50k evaluations / 155 countries | vendor coverage/benchmark claim; page date/version must be frozen |
| detailed accuracy population | UK and US / 11,000 personas | public validation-method scope |
| language support | no language list recovered in these pages | unresolved |
| localisation method | customer data / “appropriate seed data” is described at a high level | method unresolved by country |
| country/subgroup error | no country-level table, uncertainty, or abstention recovered | unresolved |
| deployment | Times case is UK-specific | deployment evidence, not cross-market validation |

The 155-country and UK/US statements are preserved as two different source shapes. They are not silently reconciled. “Across 155 countries” may use a different evaluation unit than the detailed 11,000-persona study, but the pages do not expose enough common fields to determine that. It therefore cannot be converted into 155 equally validated markets, languages, or populations.

### 3. Nearest boundary

The nearest required artifact is a page-versioned 155-row country ledger showing what “eval” means, sample/data provenance, question language, translation, weighting, model version, date, country-level errors, subgroup slices, uncertainty, and abstention. Language coverage needs a separate list; country availability cannot stand in for language support.

### 4. Rerun status

The two public pages reproduce the headline/scope mismatch. They do not yield the accepted country-language matrix or cross-cultural validation. Acceptance remains open, and no inference of failure or equal global accuracy is made.
<!-- END COMMENT 5016432548 -->

### Comment 2 of 3: BigBirdReturns, 2026-07-19T16:50:53Z (id 5016561141)

https://github.com/BigBirdReturns/clifford-number/issues/45#issuecomment-5016561141 . updated 2026-07-19T16:50:53Z . author_association OWNER . body sha256 `cd09a206d3b1fd44e263669722c1011f7d1ae76a2a2c9e9a6bab4f1ed6251635`

<!-- BEGIN COMMENT 5016561141 bytes=3380 sha256=cd09a206d3b1fd44e263669722c1011f7d1ae76a2a2c9e9a6bab4f1ed6251635 -->
## Second-pass receipt: public 15-country/12-language benchmark code recovered

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** `graph_effect: none`; matched academic evidence, not vendor coverage proof

### Baseline action

Followed a matched cross-cultural benchmark from the paper to its public code at immutable commit `99e06a7cc3a084568105f37598009b239b18b858`:

- paper / COLM 2024 record: https://openreview.net/forum?id=S4ZOkV1AHl
- repository: https://github.com/louiskwoklf/llms-cultural-adaptability
- runner: https://github.com/louiskwoklf/llms-cultural-adaptability/blob/99e06a7cc3a084568105f37598009b239b18b858/scripts/experimentRunner.py
- model call: https://github.com/louiskwoklf/llms-cultural-adaptability/blob/99e06a7cc3a084568105f37598009b239b18b858/scripts/modelInteraction.py

### Exact recovered scope

The paper compares GPT-3.5 simulations with **7,286 human participants from 15 countries**. The code fixes:

- **15 countries:** Austria, France, Germany, Greece, Ireland, Israel, Italy, the Netherlands, Norway, Poland, Romania, Spain, Sweden, Switzerland, UK;
- **12 prompt languages:** Dutch, English, French, German, Greek, Hebrew, Italian, Norwegian, Polish, Romanian, Spanish, Swedish;
- model snapshot `gpt-3.5-turbo-1106`;
- `temperature=1`, `top_p=1`, `max_tokens=1`;
- a loop that runs every listed country under every listed language, i.e. a 15×12 experimental grid before participant filtering.

The reported result is a useful positive/negative control: explicitly giving country of residence improved alignment with human responses, while native-language prompting did not reliably transfer cultural fidelity and particularly reduced alignment for Greek and Hebrew.

### Replay boundary discovered in code

This is substantially more inspectable than a coverage headline, but the repository is not replay-ready as published:

- `experimentRunner.py` requires `../references/data/humanSubjects.xlsx`, which the README directs users to obtain from the Bos et al. source study;
- `modelInteraction.py` contains a blank API key and calls a retired/historical model snapshot;
- the checked-in `requirements.txt` is empty despite imports including `openai`, `pandas`, and Excel support;
- a live rerun would therefore not be comparable without the original human data, dependency lock, and archived model endpoint/output.

### Scope reconciliation

This benchmark supports the proposition that **country labels and prompt language are separate experimental variables** and that multilingual prompting can worsen, not merely improve, alignment. It does not validate Electric Twin's 155-country headline: different vendor, model, population, task, time, and metric. Nor do 15 countries imply 15 languages; the recovered experiment explicitly uses unequal sets.

AAPOR's final June 2026 Code independently requires disclosure of the population decision rules, geographic scope, language(s), dates, AI-generation method, and human-response basis: https://aapor.org/standards-and-ethics/

### Nearest boundary

For this benchmark: custody of the Bos human workbook, dependency/environment lock, archived prompts/outputs, and a model-substitution protocol. For the vendor cohort: separate country and language ledgers plus per-market validation, uncertainty, localisation, and abstention.

No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016561141 -->

### Comment 3 of 3: BigBirdReturns, 2026-07-19T17:12:10Z (id 5016640560)

https://github.com/BigBirdReturns/clifford-number/issues/45#issuecomment-5016640560 . updated 2026-07-19T17:12:10Z . author_association OWNER . body sha256 `86173b168f1a1032433f442e6392961306f833b8d912896730bb1a33f00ca17a`

<!-- BEGIN COMMENT 5016640560 bytes=3152 sha256=86173b168f1a1032433f442e6392961306f833b8d912896730bb1a33f00ca17a -->
## Third-pass correction: human workbook and complete generated-output matrix are in custody

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** `graph_effect: none`; repository evidence corrected, result not yet reanalysed

### Baseline path

Inspected the complete immutable tree and five-commit history at `99e06a7cc3a084568105f37598009b239b18b858`, then opened one archived output:

- tree: https://github.com/louiskwoklf/llms-cultural-adaptability/tree/99e06a7cc3a084568105f37598009b239b18b858
- source-upload commit: https://github.com/louiskwoklf/llms-cultural-adaptability/commit/29c2dcc6637e4e230155106d601f9b06f870d48c
- human workbook: https://github.com/louiskwoklf/llms-cultural-adaptability/blob/99e06a7cc3a084568105f37598009b239b18b858/references/data/humanSubjects.xlsx
- sample archived output: https://github.com/louiskwoklf/llms-cultural-adaptability/blob/99e06a7cc3a084568105f37598009b239b18b858/output/gpt-3.5-turbo-1106/masked/english/data/outputData_Austria.jsonl

### Correction to the second-pass blocker

The prior receipt said the runner requires `references/data/humanSubjects.xlsx` and described that workbook as needing retrieval from the Bos source. The immutable tree **does contain it** (515,554 bytes), together with Bos source supplements and paper files. That blocker is withdrawn.

The same tree contains:

- 782 blobs totalling 62,048,139 bytes;
- 723 files / 55,376,695 bytes under `output/`;
- 360 JSONL generated-output files;
- 360 generated XLSX output files plus the human workbook;
- source supplements `.do`, `.csv`, `.dta`, and `.docx`;
- human translations and the generation scripts.

The JSONL paths form a complete **2 condition × 12 language × 15 country** matrix: 360 unique cells, 15 countries in every condition-language cell, with no missing or duplicate cells. The inspected masked-English/Austria file contains 529 JSON records of processed response variables.

### History and remaining replay boundary

The repository has five commits, all between 2024-08-08 and 2024-08-25. Commit `29c2dcc...` added the source files and outputs; the final commit only relocated the human translations. There are no tags or releases.

This changes the reproducibility classification materially: historical model generation does **not** need to be repeated in order to reanalyse the archived outputs against the archived human workbook. However:

- `requirements.txt` is still zero bytes;
- no analysis/result/table/figure code is present in the tree;
- no locked Python/Excel/Stata/Mathematica environment is supplied;
- the JSONL files preserve processed variables, not raw API response envelopes and full request metadata;
- no tagged release binds a paper version to a repository package.

### Nearest real path

Reconstruct the paper's analysis from the archived human and generated outputs, identify the exact scripts or commands used for published tables/tests, pin the environment, and compare reproduced statistics with the paper. A fresh call to the retired model is a separate regeneration study, not a prerequisite for data reanalysis.

No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016640560 -->

