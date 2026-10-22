---
number: 35
kind: issue
title: "Research fan-out: Validator-to-adviser scientific legitimacy market"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:28:23Z
closed_at: 2026-08-11T18:43:01Z
url: https://github.com/BigBirdReturns/clifford-number/issues/35
comments: 3
body_sha256: 06b3d7dd29b9695a7d525ff8679cc20407f9fc9d01a837325a5815832ebe14e8
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #35: Research fan-out: Validator-to-adviser scientific legitimacy market

## Body (verbatim)

<!-- BEGIN BODY #35 bytes=3523 sha256=06b3d7dd29b9695a7d525ff8679cc20407f9fc9d01a837325a5815832ebe14e8 -->
## Research-batch contract

- `batch_id`: `legitimacy/validator-adviser-market`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: scientific-authority and vendor-governance cohort case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** How do synthetic-population and adjacent AI vendors use academics and researchers as validators, advisers, chief scientists, co-authors, directors, investors, or public credibility carriers, and what independence is actually disclosed at the time of each claim?

**Selection unit:** one public validation claim, evaluator, advisory appointment, scientific title, consultancy, corporate directorship, publication, grant, compensation disclosure, or replication.

**Selection universe:** the complete recoverable vendor cohort from the frozen Gartner synthetic-population category plus matched adjacent vendors, with every public validation claim and named evaluator captured before role overlap is assessed.

The target is an institutional practice, not the character or presumed integrity of any scientist. The same disclosure and replication battery applies whether a result supports, weakens, or leaves a vendor claim unresolved.

## Task packet

1. Freeze the vendor and validation-claim denominator, including page versions, publication dates, claimed metrics, and named evaluators.
2. Build role chronologies for every evaluator across vendor, academic, nonprofit, corporate, investor, and board positions.
3. Record who selected data, holdouts, metrics, prompts, post-processing, baselines, publication language, and release timing when disclosed.
4. Classify validation as unaffiliated replication, paid evaluation, advisory work, internal research, collaborative study, testimonial, or unresolved.
5. Test the same disclosure and replication battery across all vendors, including those with no visible academic validator.
6. Preserve successful independent replication, ordinary advisory relationships, and absence of role conflict as positive controls.

## Source families

- vendor technical and marketing materials
- academic profiles and publication metadata
- company registries and conflict disclosures
- preprints, repositories, supplements, and conference records
- institutional research-integrity and consulting disclosures

## Predicate and inference boundary

**Allowed predicates:** `credited_as_validator`, `adviser_to`, `chief_scientist_of`, `coauthor_of`, `director_of`, `compensation_disclosed`, `replication_completed`.

**Forbidden inferences:** role overlap proves falsification; academic title proves independence; vendor funding invalidates results automatically; later role retroactively changes earlier status; missing disclosure proves hidden compensation.

Co-presence is never coordination. Any publication language must state the evaluator's documented role at the relevant date and distinguish vendor-reported validation from unaffiliated replication.

## Acceptance

A claim-by-claim validation ledger with evaluator role at the relevant date, protocol control, compensation state where public, reproducibility status, and matched-vendor comparison.

Promotion requires a human-reviewed candidate packet and the repository's selection, consumption, receipt, temporal, privacy, and release gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #35 -->

## Comments (3)

### Comment 1 of 3: BigBirdReturns, 2026-07-19T16:12:52Z (id 5016432386)

https://github.com/BigBirdReturns/clifford-number/issues/35#issuecomment-5016432386 . updated 2026-07-19T16:12:52Z . author_association OWNER . body sha256 `972bf77844ee2ffb3e19ed7063749a79b9c9f03107f01d11c69599482cb4c961`

<!-- BEGIN COMMENT 5016432386 bytes=3289 sha256=972bf77844ee2ffb3e19ed7063749a79b9c9f03107f01d11c69599482cb4c961 -->
## First bounded evidence receipt: Electric Twin validation claim and role disclosure

**Parent:** #30  
**Captured:** 2026-07-19  
**Status:** research intake only; `graph_effect: none`

### Baseline action

Followed one vendor claim to a named evaluator, institutional profile and disclosed study:

- Electric Twin FAQ: https://www.electrictwin.com/faq
- SSRN record, “Where You Ask Matters”: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6439338
- LSE profile: https://www.lse.ac.uk/people/michael-muthukrishna
- Vendor methodology article: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences

### Observed artifact

**Claim.** Electric Twin's FAQ says its synthetic audiences match real responses “96% of the time” and were “independently validated” by Professor Michael Muthukrishna at LSE.

**Evaluator role at relevant date.** The SSRN record for the March 2026 manuscript identifies Muthukrishna as an author and discloses that:

- Michael Muthukrishna serves as Science Advisor to Electric Twin and holds shares;
- coauthor Ben Warner is an Electric Twin co-founder and holds shares;
- Electric Twin funded the research;
- Stack Data Strategy conducted the study as an independent polling/data-collection firm commissioned by Electric Twin;
- the authors say they received no direct publication compensation beyond existing roles/shareholdings.

LSE independently confirms Muthukrishna's academic title. An academic title establishes affiliation/expertise, not independence from the vendor in this study.

**Protocol/result record.** The SSRN page reports 7,755 UK participants across seven online-source types plus an Electric Twin synthetic benchmark, LSE ethics approval 542028, and preregistration at OSF `6yqtu`. It reports that the synthetic result fell within the range of human results and that raking weights removed most cross-platform differences.

### Classification and refusal

On the present receipts this is a **vendor-funded collaborative study with disclosed adviser/equity roles**, not an unaffiliated replication. That classification does not invalidate the result and is not an allegation of misconduct. It does mean the FAQ's “independently validated” label should not be converted into the predicate `replication_completed` without a genuinely unaffiliated protocol/run.

The paper result also cannot automatically prove the separate “96%” FAQ metric: the exact metric definition, evaluation corpus, holdouts and calculation connecting that number to the paper were not recovered.

### Access/source blocker

The direct OSF `6yqtu` path did not render through the research fetch used in this pass, so its timestamp, frozen protocol, deviations and files have **not** been independently checked. SSRN reports the preregistration; that is a pointer, not completion of the reproducibility battery.

### Nearest remaining boundary

This is one claim row only. The vendor denominator still depends on #38, and the same battery must be run on vendors with validators, advisers and no named academic. Next work is to retrieve the OSF record and executable materials, reproduce the reported comparisons if data/code are available, and resolve the 96% metric separately.

No repository, canonical, or graph state changed.
<!-- END COMMENT 5016432386 -->

### Comment 2 of 3: BigBirdReturns, 2026-07-19T16:50:42Z (id 5016560244)

https://github.com/BigBirdReturns/clifford-number/issues/35#issuecomment-5016560244 . updated 2026-07-19T16:50:42Z . author_association OWNER . body sha256 `5606edbc18dd779849cd11309561074f430ca58d2546c660eed7386a618def27`

<!-- BEGIN COMMENT 5016560244 bytes=3057 sha256=5606edbc18dd779849cd11309561074f430ca58d2546c660eed7386a618def27 -->
## Second-pass receipt: OSF registration recovered and inspected

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** research intake only; `graph_effect: none`

### Baseline action

Queried the public OSF API for registration `6yqtu`, its contributors, and its registration storage:

- https://api.osf.io/v2/registrations/6yqtu/
- https://api.osf.io/v2/registrations/6yqtu/contributors/
- https://api.osf.io/v2/registrations/6yqtu/files/osfstorage/
- frozen archive pointer reported by OSF: https://archive.org/details/osf-registrations-6yqtu-v1

### Observed protocol artifact

The registration is titled **“Comparison of different survey recruitment strategies.”** OSF records creation and registration on **2025-04-25**, prior to data creation, with an embargo ending **2026-04-01**. It is now public and accepted. Michael Muthukrishna is the sole bibliographic contributor exposed by the registration API and has admin permission.

The registered protocol is explicitly **exploratory**, observational, and unblinded. It specifies:

- the same questionnaire fielded eight times across opt-in, multi-source aggregator, novel opt-in/postcode lottery, river sampling, micro-task platforms, and AI responses;
- structured variation including high-/low-quality river quotas and repeated aggregator fielding at different times;
- **1,000 participants per sampling methodology**;
- about ten sociodemographic items plus political, social, and consumer questions;
- comparison of means and variances, regression tests, distribution comparisons including **CFst** and **Earth mover**, and a multiverse/specification-curve analysis;
- p-values, with postcode-block and attention-check exclusions included as analysis variations.

This materially upgrades the prior “SSRN reports a preregistration” pointer into a directly inspected registration receipt.

### File/replay boundary

The same OSF record reports:

```text
has_data=false
has_analytic_code=false
has_materials=false
has_papers=false
has_supplements=false
```

The registered OSF storage inventory is empty. Therefore the timestamped protocol is recoverable, but there is no questionnaire file, frozen input data, analysis code, result table, or executable replication package in the registration to rerun.

### Classification

The registration supports `credited_as_validator` and protocol chronology. It still does **not** establish `replication_completed`: the recovered design includes AI as one comparison arm, while the SSRN disclosure still classifies the published work as vendor-funded collaboration with adviser/equity roles. Protocol registration and unaffiliated replication are separate predicates.

### Nearest boundary

Retrieve the eight fielded instruments/data snapshots, AI model and prompt version, weighting/exclusion decisions, executable CFst/Earth-mover/specification-curve code, and deviations from this April 2025 protocol. Until those artifacts exist, the study can be audited prospectively but not replayed.

No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016560244 -->

### Comment 3 of 3: BigBirdReturns, 2026-07-19T17:12:04Z (id 5016640228)

https://github.com/BigBirdReturns/clifford-number/issues/35#issuecomment-5016640228 . updated 2026-07-19T17:12:04Z . author_association OWNER . body sha256 `9396864ea6efd2af2240a90a4b587303a1923f0fbe2f97787ee8624bc05f7bcb`

<!-- BEGIN COMMENT 5016640228 bytes=2524 sha256=9396864ea6efd2af2240a90a4b587303a1923f0fbe2f97787ee8624bc05f7bcb -->
## Third-pass receipt: frozen OSF BagIt archive verified; original project remains private

**Parent:** #30  
**Captured:** 2026-07-19  
**State:** research intake only; `graph_effect: none`

### Baseline path

Followed the registration's own archival and original-node pointers:

- registration API: https://api.osf.io/v2/registrations/6yqtu/
- registration storage: https://api.osf.io/v2/registrations/6yqtu/files/osfstorage/
- registration components: https://api.osf.io/v2/registrations/6yqtu/children/
- frozen archive metadata: https://archive.org/metadata/osf-registrations-6yqtu-v1
- frozen bag: https://archive.org/download/osf-registrations-6yqtu-v1/bag.zip
- original OSF project identified by the registration log: https://api.osf.io/v2/nodes/6rfqb/

### Observed custody artifact

The Internet Archive item exposes a 92,635-byte `bag.zip`. The retrieved byte stream had SHA-256:

```text
213e8af9500db72f41d2e7d43108ec4899746c3152fee412f04abd02234d0381
```

The BagIt package reports `Bagging-Date: 2026-04-01` and contains six payload objects:

- `registration.json`
- `registration_schema.json`
- `schema_responses.json`
- `contributors.json`
- `logs.json`
- `wikis.json`

All six payloads matched the package's SHA-256 manifest. The archive is therefore a valid frozen custody object for the registration metadata and preregistered responses.

It is **not** a replication package. There is no questionnaire, input dataset, model/prompt snapshot, analysis code, or result table in the bag. The archived wiki list is empty; the public registration component list is empty; and public registration storage remains empty.

### Original-node boundary

The archived log identifies original OSF project `6rfqb`. Public requests to that node, its children, files, osfstorage, and registrations return **401 Unauthorized**. Consequently, files may or may not exist in the current private source project; the public interface cannot adjudicate that. The frozen registration itself remains file-empty.

### Rerun result and nearest boundary

The prior API observation survives a second, independent custody path: the live API and hash-verified frozen bag both expose protocol metadata but no replayable data or code. `replication_completed` remains unsupported.

The nearest boundary is an owner-authorized/public release of the original project files or a separately archived questionnaire, fielded datasets, AI inputs/outputs, deviations, and executable analysis. No repository, PR, canonical, or graph state changed.
<!-- END COMMENT 5016640228 -->

