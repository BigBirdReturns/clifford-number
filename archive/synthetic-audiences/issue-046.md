---
number: 46
kind: issue
title: "Research fan-out: Foundation-model, cloud, and subprocessor dependence"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:33:06Z
closed_at: 2026-08-11T18:44:38Z
url: https://github.com/BigBirdReturns/clifford-number/issues/46
comments: 4
body_sha256: f818d1cfe510a2c516a6cc7be4712cbf4d5a249ed6e99bec06cbd5f9bfcb7e8a
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #46: Research fan-out: Foundation-model, cloud, and subprocessor dependence

## Body (verbatim)

<!-- BEGIN BODY #46 bytes=2950 sha256=f818d1cfe510a2c516a6cc7be4712cbf4d5a249ed6e99bec06cbd5f9bfcb7e8a -->
## Research-batch contract

- `batch_id`: `substrate/model-cloud-subprocessor-dependence`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: technical supply-chain, custody, and version-drift case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** Which upstream language models, cloud providers, data platforms, analytics services, security vendors, and subprocessors make synthetic-population products possible, and how do model changes alter validated behaviour, custody, jurisdiction, and customer claims?

**Selection unit:** one model provider, model version, cloud region, subprocessor, data flow, security certification, contract term, incident, vendor change, validation rerun, or customer deployment.

**Selection universe:** all subprocessors, infrastructure providers, model references, security documents, and technical dependencies publicly disclosed by the frozen vendor cohort, with undisclosed dependencies held as gaps.

## Task packet

1. Archive subprocessor lists, security pages, data-processing addenda, status pages, architecture descriptions, and model-provider statements over time.
2. Map customer data and prompt flows by provider, region, retention, training use, encryption, access, logging, and deletion claims.
3. Record upstream model names and versions where disclosed and identify switches, fallbacks, ensembles, fine-tunes, or vendor abstraction layers.
4. Test whether published validation is rerun after upstream model, prompt, persona, retrieval, or post-processing changes.
5. Track incidents, outages, security certifications, audit scope, penetration tests, and customer notification duties.
6. Compare vendor portability, concentration, lock-in, sovereign-hosting, and classified-environment claims under the same supply-chain predicates.

## Source families

- subprocessor and security pages
- data-processing agreements and trust centres
- cloud and model-provider documentation
- status and incident reports
- certification and audit statements

## Predicate and inference boundary

**Allowed predicates:** `uses_cloud_provider`, `uses_model_provider`, `subprocessor_added`, `data_region_claimed`, `validation_rerun_after_change`, `incident_disclosed`, `certified_under`.

**Forbidden inferences:** cloud logo proves data flow; certification covers every product control; upstream model determines every output; undisclosed provider proves concealment; model change necessarily invalidates all prior results.

## Acceptance

A versioned technical supply-chain map with data custody, model-version, validation-drift, security, and incident fields, including explicit undisclosed dependencies.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #46 -->

## Comments (4)

### Comment 1 of 4: BigBirdReturns, 2026-07-19T16:12:11Z (id 5016429997)

https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016429997 . updated 2026-07-19T16:12:11Z . author_association OWNER . body sha256 `666fbc326297e15166a3f2584c543ddbc1240b6fddff6d43cc531b254b9141f7`

<!-- BEGIN COMMENT 5016429997 bytes=4271 sha256=666fbc326297e15166a3f2584c543ddbc1240b6fddff6d43cc531b254b9141f7 -->
## First pass: disclosed custody claims outrun named dependency disclosure

Parent: #30  
Captured: 2026-07-19  
Graph effect: **none**

### Baseline action

Applied #46's supply-chain predicates to the seed vendor (Electric Twin) and two publicly recoverable Gartner-cohort comparators (Verve and Stravito). Searched public privacy, security, trust, AI-method, and buyer-disclosure pages for named model providers, cloud regions, subprocessors, data flows, retention, training use, certifications, model versions, and validation reruns.

Because #38 has not frozen the 33-vendor denominator, this is a **three-vendor probe, not cohort coverage**.

### Observed supply-chain surface

| Vendor | Public artifact | What is actually disclosed | What remains undisclosed |
|---|---|---|---|
| Electric Twin | Website privacy policy and product FAQ | Personal data may be shared with unnamed service providers; vendor says it does not sell/rent personal data; product page says customer research data constrains broader underlying models and every new audience is benchmarked | model/provider names, model versions, cloud provider, region, subprocessor list, prompt/response retention, training-use terms, deletion mechanics, certification scope, version-change log |
| Verve | VIPS FAQ and ESOMAR-20 response | API-only inference; private per-client instances; aggregated/anonymised inputs by default; no external-model training on client data; encryption, deletion, logging, ISO 27001 claim; model-configuration events and versioned release notes are mentioned | external model provider names/versions, hosting provider/regions, dated subprocessor list, certificate/audit scope, named model-change event paired with before/after validation |
| Stravito | Public site and trust/AI pages recovered by search | ISO 27001 and SOC 2 Type II marks/claims; Assistant says it works from client-owned data and cites sources | no public subprocessor list, provider/version/region map, prompt retention terms, or validation-rerun record recovered in this pass |

Sources:
- Electric Twin privacy policy: https://www.electrictwin.com/privacy-policy
- Electric Twin product/validation claims: https://www.electrictwin.com/
- Verve VIPS FAQ: https://www.addverve.com/inspiration/faqs-verve-intelligent-personas-simulations-vips/
- Verve ESOMAR-20 response: https://www.addverve.com/inspiration/verve-answers-esomars-20-questions-for-ai-based-service-buyers-january-2026/
- Stravito: https://www.stravito.com/

### Predicate results

- `uses_model_provider`: **unresolved for all three**. Generic references to LLMs, API inference, or AI do not identify a provider.
- `uses_cloud_provider`: **unresolved for all three**. Trust marks and private-instance language do not identify custody or region.
- `data_region_claimed`: **not recovered**.
- `certified_under`: Verve and Stravito make public ISO 27001 claims; Stravito also displays SOC 2 Type II. These are vendor statements, not proof that every synthetic-persona control is in audit scope.
- `validation_rerun_after_change`: **not established**. Verve describes model-config logging/versioned fixes, and Electric Twin describes ongoing benchmarking, but neither public artifact pairs a named upstream version change with before/after validation results.
- `subprocessor_added` / `incident_disclosed`: no versioned public evidence recovered.

### Nearest boundary

The nearest missing artifact is not another inferred architecture diagram. It is a dated vendor-controlled dependency record: subprocessor list or DPA plus provider/model/version/change notice. Without that, cloud logos, generic “API-only” language, or certification marks cannot become data-flow edges.

### Next same-path run

1. Freeze #38's vendor denominator.
2. For every vendor, capture dated privacy/DPA/trust/subprocessor documents and archive their versions.
3. Request or recover audit-scope and model/provider schedules where public access allows.
4. Select one real model/provider change and test for an accompanying validation rerun.
5. Record vendors with no public disclosure as `undisclosed`, not `none`.

Acceptance remains **incomplete**: this probe establishes a disclosure gap and a reusable source path, not a versioned cohort supply-chain map.
<!-- END COMMENT 5016429997 -->

### Comment 2 of 4: BigBirdReturns, 2026-07-19T16:47:49Z (id 5016549280)

https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016549280 . updated 2026-07-19T16:47:49Z . author_association OWNER . body sha256 `fe8372c78c4fd6a9f6e8c088ce56d11a9f68a6b0c51274270afd78e0d0555a6a`

<!-- BEGIN COMMENT 5016549280 bytes=3481 sha256=fe8372c78c4fd6a9f6e8c088ce56d11a9f68a6b0c51274270afd78e0d0555a6a -->
## Second pass: named providers and retention rules replace generic dependency claims

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### Baseline action

Reran the first receipt's missing-dependency path against two additional public cohort vendors, requiring vendor-controlled customer/security artifacts rather than cloud logos or third-party architecture guesses.

### 1. Yabble — model and cloud providers identified

Yabble's vendor-authored security article (2023-07-28):

https://www.yabble.com/blog/5-data-security-questions-you-should-ask-your-ai-provider?hs_amp=true

Observed fields:

- Yabble says its AI solutions use **OpenAI** large-language models through an API and that it has an enterprise agreement with OpenAI.
- It says OpenAI does not use Yabble-customer API data to train OpenAI models or improve OpenAI's service.
- It says imported data is stored with Yabble, not OpenAI.
- It identifies **AWS** as an infrastructure partner.
- It describes multi-tenant operation with logical partitioning, encryption at rest and in transit, backups, and retention/deletion policies.
- It explicitly warns that its technology does not scrub imported data for personal information and asks customers to de-identify uploads.

This resolves `uses_model_provider = OpenAI` and `uses_cloud_provider = AWS` as dated vendor claims, plus a no-upstream-training and storage-custody claim. It does **not** resolve model/version, AWS services/regions, subprocessor schedule, exact retention duration, or an executed customer contract. Current product FAQs continue to state that platform data is not passed to OpenAI for model training: https://www.yabble.com/faq-yabble

### 2. CulturePulse ARES — named service providers and bounded deletion behavior

CulturePulse's ARES privacy policy, last updated 2024-04-01:

https://ares.culturepulse.ai/assets/Privacy%20Policy-Clh7ouHz.pdf

Observed fields:

- Named providers are **Amazon Web Services** for data storage and processing, **Hotjar** for website usage monitoring, and **Stripe** for payments.
- The policy says all ARES personal data is stored on AWS servers.
- A verified deletion request for personal or contractual-engagement data is to be completed within 30 days unless infeasible.
- General relationship data may be retained while the relationship exists and generally seven years afterward for stated business/legal purposes.
- Draft policy information submitted to the ARES Message Resonance function is described as not retained.
- Anonymised or aggregated personal information may be used to train machine-learning or AI models during the engagement.

This resolves named-provider, provider-purpose, general-retention, deletion-request, and one function-specific non-retention field. It does **not** identify AWS region/account boundary, model provider/version, backup-deletion timing, audit scope, or a versioned subprocessor-change event.

### Nearest remaining boundary and rerun result

The previous `uses_model_provider` / `uses_cloud_provider` gap is now narrower for these vendors. The next real boundary is a dated subprocessor schedule or executed DPA with regions and change notices, plus one named model/version change paired with before/after validation.

Acceptance remains incomplete: these are two bounded vendor custody paths, not a frozen-cohort supply-chain map, and no dependency edge was inferred beyond the vendors' own disclosures.
<!-- END COMMENT 5016549280 -->

### Comment 3 of 4: BigBirdReturns, 2026-07-19T17:08:55Z (id 5016630066)

https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016630066 . updated 2026-07-19T17:08:55Z . author_association OWNER . body sha256 `1a224298f9ba12c6b35b7fe5a2d5059ea8c5575689d889db3a7a437eead5bc50`

<!-- BEGIN COMMENT 5016630066 bytes=3689 sha256=1a224298f9ba12c6b35b7fe5a2d5059ea8c5575689d889db3a7a437eead5bc50 -->
## Third pass: one named, regioned, versioned multi-model supply chain is now public

Parent: #30  
Builds on: https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016549280  
Captured: 2026-07-19  
State: `graph_effect: none`; vendor-authored disclosure, not an independently observed runtime trace.

### Baseline action

Reran the missing subprocessor/model/version path against Synthetic Users' connected public architecture, subprocessor list, DPA, risk register, and retention history.

Sources:

- Architecture, last updated 2025-03-11: https://legal.syntheticusers.com/ai/system-architecture
- Subprocessor/data-flow list: https://legal.syntheticusers.com/data-management/subprocessors-data-flow
- DPA, last updated March 2025: https://legal.syntheticusers.com/data-management/data-processing-addendum
- Third-party risk policy v2.0, effective 2026-03-25: https://legal.syntheticusers.com/risk-management/third-party-risk-management
- Retention policy v1.2, updated 2026-03-25: https://legal.syntheticusers.com/data-management/user-data-deletion-retention-policy

### Named supply-chain surface

The public documents identify:

- hosting: AWS, Render, and Vercel;
- claimed AWS customer-data regions: US, EU (Ireland/Germany), UK, and Canada;
- generative providers: OpenAI, Anthropic, Google, Meta, and Mistral;
- model families: GPT-4 class, Claude, Gemini, Llama, and Mistral;
- additional core services including Firebase authentication, Postmark email, PaperTrail logging, and Klazify company enrichment.

The architecture says full prompts can contain persona definitions, questions, conversation history, and retrieved customer-document segments. It claims provider API agreements prohibit training and limit retention, while noting that provider-specific retention policies are assessed. Model selection and version management are handled by the orchestration layer and are not customer-configurable.

### Version/change evidence

The third-party risk policy has an observed change history: v1.0 dated 2025-01-07 and v2.0 dated 2026-03-25. Version 2.0 says it added a full 19-vendor register and formal HIGH/MEDIUM/LOW classification. AWS, Render, OpenAI, Anthropic, and Google/Gemini are listed as HIGH-risk vendors with annual review.

The DPA requires notice before an additional subprocessor is engaged and gives customers 14 days to object. The public subprocessor page, however, exposes no dated add/remove history, so `subprocessor_added` is still not established as an event.

For upstream model changes, the architecture states a process of evaluation, staged rollout, regression monitoring, documentation, and rollback. It does **not** identify a concrete model-version switch or publish paired before/after quality, safety, or bias results. Therefore `validation_rerun_after_change` remains unresolved: a control description is not a completed rerun receipt.

### Retention/custody detail

Retention policy v1.2 adds bounded claims: session-only prompt/output content, 90-day metadata logs, embeddings retained through the active contract and deleted within 30 days of termination, and backup purging within 90 days. These are policy statements; no runtime deletion test or provider-side artifact was recovered.

### Nearest boundary

The next same-path run needs one dated subprocessor add/remove notice or one named model-version change tied to an actual evaluation artifact and rollout verdict. Model families, policies, and change procedures do not substitute for that event.

Acceptance remains incomplete, but this vendor now supplies the first connected named-provider, region, risk-tier, retention, and change-control map in the lane.
<!-- END COMMENT 5016630066 -->

### Comment 4 of 4: BigBirdReturns, 2026-07-19T17:23:32Z (id 5016677053)

https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016677053 . updated 2026-07-19T17:23:32Z . author_association OWNER . body sha256 `a35b0c22716b0964e46029a4d81d8b78af1c2202d24d0ecdd7c4cd68afc90614`

<!-- BEGIN COMMENT 5016677053 bytes=4317 sha256=a35b0c22716b0964e46029a4d81d8b78af1c2202d24d0ecdd7c4cd68afc90614 -->
## Fourth pass: the declared model stack grew, but its validation receipt did not travel with it

Parent: #30  
Builds on: https://github.com/BigBirdReturns/clifford-number/issues/46#issuecomment-5016630066  
Captured: 2026-07-19  
State: `graph_effect: none`; before/current vendor-authored architecture comparison, not an observed production trace.

### Baseline action

Compared the dated legal architecture with Synthetic Users' current public “updated architecture” and prompt-control description.

Primary artifacts:

- legal architecture, last updated 2025-03-11: https://legal.syntheticusers.com/ai/system-architecture
- current updated architecture: https://www.syntheticusers.com/science-posts/synthetic-users-system-architecture-the-brain-version
- current prompt-platform description: https://www.syntheticusers.com/science-posts/self-improving-prompts-synthetic-users
- current public subprocessor list: https://legal.syntheticusers.com/data-management/subprocessors-data-flow

### Before/current architecture change

The March 11, 2025 legal document names five provider/model families: OpenAI/GPT-4 class, Anthropic/Claude, Google/Gemini, Meta/Llama, and Mistral. It says the orchestration layer manages versions and promises evaluation, staged rollout, regression monitoring, documentation, and rollback for model changes.

The current vendor page calls itself an “updated architecture” and says the model layer “has grown.” It now names:

- the prior GPT, Claude, Gemini, Llama, and Mistral families;
- **Hermes**;
- an in-house **SU Persona Adapter** trained through verbal-feedback distillation and routed into the ensemble.

It also describes a Critic whose feedback triggers runtime re-asks and is used to update both the adapter and the personality core. This materially changes the disclosed system boundary: the stack is no longer described solely as routing among external frontier-model families.

The current prompt-platform article separately acknowledges that, before the new control plane, more than 100 prompts had model/provider/temperature/fallback configuration spread across database rows, memories, and Slack threads, while changes were judged from small hand-picked samples. It says the replacement system now pins production versions, records change histories, scores daily samples of recent usage, alerts below threshold, and requires human approval before an agent proposal is deployed.

### What is and is not evidenced

This is evidence of a **declared architecture/control-plane change**. It is not yet evidence of a named upstream model-version change:

- the current science pages expose no publication/version identifier and were captured as current on 2026-07-19;
- “Hermes” is a model-family label, not a disclosed provider, endpoint, version, region, or DPA path;
- the in-house adapter is not represented in the current external-subprocessor list, which is expected if it is internal, but its training/evaluation custody is not separately enumerated there;
- the screenshots in the prompt-platform article are explicitly mock data;
- no actual before/after prompt score, model quality/bias/safety result, failed regression, rollout decision, rollback, or customer change notice is public in these artifacts.

The legal architecture and subprocessor documents still expose the 2025 five-provider grouping and no dated add/remove history. That creates documentation lag across public surfaces, not proof that notice or DPA obligations were breached.

### Warranty/continuity boundary

No product warranty promises accuracy continuity across model/provider/prompt changes in these artifacts. The change-control claim is procedural (“we evaluate”), and the prompt platform supplies a mechanism description, not a completed evaluation receipt.

**F-19 model drift/warranty remains on hold.** This pass finds a concrete declared architecture expansion, but promotion still requires a named before/after upstream version or configuration change paired with an accuracy/warranty claim and an actual rerun result.

Nearest next artifact: a production model/prompt change record naming old/new version, deployment date, frozen evaluator/cohort, before/after result, acceptance threshold, rollout/rollback verdict, and any customer warranty or notice effect.
<!-- END COMMENT 5016677053 -->

