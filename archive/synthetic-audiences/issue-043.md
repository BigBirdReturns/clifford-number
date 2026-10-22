---
number: 43
kind: issue
title: "Research fan-out: Synthetic-data lineage, consent, and anonymisation"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:32:28Z
closed_at: 2026-08-11T18:44:23Z
url: https://github.com/BigBirdReturns/clifford-number/issues/43
comments: 4
body_sha256: cf44c526aa1518c865dc1e3b38f929b9052b445cb0dc24227f0f1980adbfac83
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #43: Research fan-out: Synthetic-data lineage, consent, and anonymisation

## Body (verbatim)

<!-- BEGIN BODY #43 bytes=3078 sha256=cf44c526aa1518c865dc1e3b38f929b9052b445cb0dc24227f0f1980adbfac83 -->
## Research-batch contract

- `batch_id`: `substrate/data-lineage-consent-anonymisation`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: data-governance, privacy, and derivative-processing case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** What personal, panel, survey, behavioural, first-party, public, licensed, inferred, and model-generated data feed synthetic populations, under what lawful and contractual authority, and when do resulting personas or distributions remain personal, re-identifiable, or group-sensitive?

**Selection unit:** one dataset, data source, controller or processor statement, lawful basis, consent term, licence, retention rule, anonymisation test, re-identification assessment, data-sharing agreement, regulator finding, or deployment.

**Selection universe:** every data source and processing claim disclosed by the frozen vendor and deployment cohort, plus public privacy notices and regulatory records; undisclosed inputs remain gaps rather than inferred data flows.

## Task packet

1. Inventory data classes, source organisations, collection context, jurisdictions, dates, and stated processing purposes for each vendor and deployment.
2. Resolve controller, joint-controller, processor, subprocessor, licensee, and independent-controller claims without substituting marketing language for legal role.
3. Trace consent, lawful basis, purpose compatibility, retention, deletion, access, objection, opt-out, and data-subject rights.
4. Record anonymisation, differential privacy, aggregation, red-teaming, membership-inference, attribute-inference, singling-out, and small-group risk tests where disclosed.
5. Separate data used to train a foundation model, construct personas, calibrate distributions, validate outputs, or operate a customer instance.
6. Compare vendor practice against ICO, EDPB, FTC, state privacy, and professional research standards in the relevant jurisdiction.

## Source families

- privacy notices and data-processing addenda
- customer and panel-provider terms
- regulator guidance and enforcement
- technical documentation and security audits
- data-broker, panel, and licensing disclosures

## Predicate and inference boundary

**Allowed predicates:** `processed_dataset`, `controller_for`, `processor_for`, `licensed_from`, `consent_obtained_for`, `anonymisation_tested`, `retained_until`, `opt_out_available`.

**Forbidden inferences:** synthetic means anonymous; public data means unrestricted use; aggregation eliminates group harm; privacy notice proves practice; lack of disclosure proves unlawful processing.

## Acceptance

A dataset-to-output lineage graph with legal-role, purpose, retention, rights, and re-identification fields, plus explicit gaps and regulator-standard comparisons.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #43 -->

## Comments (4)

### Comment 1 of 4: BigBirdReturns, 2026-07-19T16:12:47Z (id 5016432121)

https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016432121 . updated 2026-07-19T16:12:47Z . author_association OWNER . body sha256 `b61d283b358a77cec40591d936dc4a512bfcf3290dd740899520e8bab2acaf7a`

<!-- BEGIN COMMENT 5016432121 bytes=3363 sha256=b61d283b358a77cec40591d936dc4a512bfcf3290dd740899520e8bab2acaf7a -->
## First-pass findings receipt — one real dataset-to-output path exposes unresolved legal-role fields

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### 1. Smallest real lineage path exercised

I traced one disclosed Electric Twin deployment from source classes to synthetic output, then compared that shape with Electric Twin's privacy notice and current ICO guidance.

- Electric Twin says Times ExplorAItion uses stripped-back subscriber behaviour, reader panels, engagement data, and PAMCo data, feeds them into its modelling platform, and “none of it uses personal data”: https://www.electrictwin.com/blog/the-times-announces-its-new-synthetic-audience-tool-built-on-electric-twin
- Electric Twin's methodology separately says it uses real survey data plus first- and third-party datasets; its evaluation data is private and held out: https://www.electrictwin.com/blog/how-accurate-are-synthetic-audiences
- Its privacy policy (effective 2023-11-14) covers website/service-user data supplied through subscriptions/forms/correspondence plus automatically collected technical data: https://www.electrictwin.com/privacy-policy
- ICO guidance says synthetic data requires real data to generate and may involve processing personal information; pseudonymised data remains personal data: https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/privacy-enhancing-technologies-1-0.pdf and https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/

### 2. Exact source shape preserved

| Stage | Disclosed input/output | Fields still absent from public material |
|---|---|---|
| construction | subscriber behaviour; reader panels; engagement; PAMCo | source organisations beyond PAMCo/News UK, dates, row/unit shape, transformation steps |
| broader vendor method | first- and third-party datasets; real survey data | licences, lawful bases, controller/processor allocation, retention |
| evaluation | private held-out questions/data | evaluator access, deletion schedule, membership/attribute-inference testing |
| output | synthetic Times audience segments | anonymisation test and risk assessment supporting “no personal data” |

The public privacy notice provides data-subject rights and broad retention language, but this pass did not recover a DPA or notice section that allocates controller, processor, joint-controller, subprocessor, or independent-controller roles for customer research datasets. The deployment statement “none of it uses personal data” is preserved as a **publisher/vendor claim**, not upgraded to `anonymisation_tested`.

### 3. Nearest boundary

The missing boundary is the customer-data contract/DPA and its technical anonymisation assessment: controller roles, purposes, lawful basis, licence authority, retention/deletion, rights handling, and singling-out/linkability/inference tests. ICO guidance prevents the shortcut “synthetic means anonymous”; it does not itself determine the status of this deployment.

### 4. Rerun status

The public path reproduces the four named source classes and the no-personal-data claim, but not the legal or technical proof needed to classify that claim. The full dataset-to-output lineage graph and regulator comparison remain incomplete.
<!-- END COMMENT 5016432121 -->

### Comment 2 of 4: BigBirdReturns, 2026-07-19T16:47:45Z (id 5016549101)

https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016549101 . updated 2026-07-19T16:47:45Z . author_association OWNER . body sha256 `c49e6701194d7d85d4746642698f8a914ef787b331478b351b7a0dce77a7345d`

<!-- BEGIN COMMENT 5016549101 bytes=3414 sha256=c49e6701194d7d85d4746642698f8a914ef787b331478b351b7a0dce77a7345d -->
## Second pass: DPA and API-policy artifacts resolve legal-role and deletion fields

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### Baseline action

Reran the nearest missing-artifact path from the first receipt: search the public cohort surface for an actual DPA or customer-facing policy that allocates roles and governs customer inputs. This recovered two vendor-controlled artifacts outside the Electric Twin deployment probe.

### 1. Aaru DPA — resolved contract fields

Aaru publishes a Data Processing Agreement effective 2025-04-24:

https://aaru.com/policies/data-processing

Observed fields:

- Aaru is the **Data Processor** and the customer is the **Data Controller** for personal data processed in connection with the Services Agreement.
- Processing may include storage, access, analysis, and deletion, for the purpose of fulfilling that agreement.
- Covered people may include employees, customers, users, and others whose data is provided; covered data may include names, emails, contact data, IP addresses, and other identifiers.
- Aaru may not engage a subprocessor without the controller's prior written consent, and an approved subprocessor must receive equivalent obligations.
- Personal data may not be transferred outside the EEA without Chapter V safeguards.
- At termination, the controller chooses deletion or return; existing copies must be deleted unless law requires storage.
- The controller has audit/inspection rights.

This supports `processor_for`, purpose, rights-assistance, transfer-condition, subprocessor-authorisation, and termination-deletion fields **at the DPA level**. It does not name subprocessors, hosting regions, datasets used to build agents, or an anonymisation test, and the public page does not prove how a specific customer project was configured.

### 2. Qloo API privacy policy — resolved input-to-model-use path

Qloo's privacy policy, effective 2025-01-01:

https://www.qloo.com/legal/privacy-policy

Observed fields:

- Qloo describes itself as a processor acting on a customer/controller's instructions for customer data.
- It says customers must pre-anonymise API inputs and that it does not accept PII through API calls.
- API inputs are entity arrays and attributes; Qloo says it may incorporate anonymised entity associations into its machine-learning models to refine later output.
- It says it does not share individual customer arrays or clusters with other customers; output consists of generalized probabilistic inferences.
- Separate website/account data is governed differently: Qloo is controller, describes cross-border processing including the United States, and gives some retention periods.

This is a disclosed **vendor policy path**, not proof that customer input satisfies GDPR anonymisation or that Qloo cannot re-identify it.

### Nearest remaining boundary and rerun result

The retry materially narrows #43's blocker. Legal role and termination-deletion are no longer wholly undisclosed for Aaru; Qloo's API-input/model-use path is also publicly stated. The remaining acceptance boundary is deployment-specific: executed customer terms, named data sources/licences, actual subprocessor schedule and regions, project retention configuration, and technical singling-out/linkability/inference tests.

Acceptance remains incomplete; no inferred lineage edges were added.
<!-- END COMMENT 5016549101 -->

### Comment 3 of 4: BigBirdReturns, 2026-07-19T17:08:50Z (id 5016629781)

https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016629781 . updated 2026-07-19T17:08:50Z . author_association OWNER . body sha256 `475b9361882a87029d7e7f928a393952880c912a9e8ee7a09a0804794872e305`

<!-- BEGIN COMMENT 5016629781 bytes=3807 sha256=475b9361882a87029d7e7f928a393952880c912a9e8ee7a09a0804794872e305 -->
## Third pass: a controller-to-LLM path is public, with material scope and retention tensions

Parent: #30  
Builds on: https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016549101  
Captured: 2026-07-19  
State: `graph_effect: none`; vendor-authored policy evidence, not observed runtime behavior.

### Baseline action

Reran the missing deployment-lineage path against Synthetic Users' public DPA, architecture, subprocessor, and versioned retention artifacts.

Sources:

- DPA, last updated March 2025: https://legal.syntheticusers.com/data-management/data-processing-addendum
- AI system architecture, last updated 2025-03-11: https://legal.syntheticusers.com/ai/system-architecture
- Subprocessors and data flow: https://legal.syntheticusers.com/data-management/subprocessors-data-flow
- Retention policy v1.2, updated 2026-03-25: https://legal.syntheticusers.com/data-management/user-data-deletion-retention-policy

### Explicit lineage recovered

At the contract/policy level:

1. The customer is controller and Synthetic Users is processor for customer personal data.
2. A researcher can supply study configuration, audience parameters, questions, conversation history, and uploaded documents.
3. Uploaded documents are parsed into a RAG index; retrieved segments, persona definitions, questions, and conversation history are inserted into prompts.
4. Prompts and context may be sent to OpenAI, Anthropic, Google, Meta, or Mistral through a multi-model orchestration layer.
5. The architecture says outputs are processed and stored in a regional database; customer data is claimed to reside in regional AWS locations for the US, EU, UK, or Canada.
6. The public DPA authorizes listed subprocessors, provides a 14-day objection period for additions, applies transfer safeguards, and requires deletion or return when processing is no longer required.

This resolves a genuine `processor_for` and `processed_dataset` policy path for one cohort vendor. It does not prove a specific customer's configuration or that the public policy matches execution.

### Retention fields and unresolved contradictions

Retention policy v1.2 states:

- prompt inputs: session duration, not persistently stored;
- model outputs: session duration, not persistently stored beyond session logs;
- RAG embeddings: active-contract duration, deletion within 30 days of termination;
- prompt/response metadata logs: 90-day rolling retention;
- third-party LLM data: governed by provider DPA and claimed not retained beyond the API response;
- deleted data in backups: maximum 90-day rotation;
- valid deletion requests: completion within 30 days.

Two public-document tensions prevent a clean lineage classification:

- the architecture says researchers can review stored interview transcripts and reports, while the retention table says model outputs are not persistently stored beyond session logs;
- the DPA describes the service purpose as access to a “customer service platform” and lists customer-service data, whereas the architecture describes a synthetic research platform handling study documents and interview content.

These may be drafting or category distinctions, but the public sources do not reconcile them. The exact persistent transcript/report store and whether study content is fully represented by the DPA remain unresolved.

### Nearest boundary

The next required artifact is a product-specific data schedule or executed customer DPA that distinguishes account data, study configuration, documents/embeddings, prompt payloads, transcripts, reports, logs, backups, and provider copies. Technical deletion and singling-out/linkability tests remain absent.

Acceptance remains incomplete; no legal-role or anonymisation inference extends beyond the vendor's published documents.
<!-- END COMMENT 5016629781 -->

### Comment 4 of 4: BigBirdReturns, 2026-07-19T17:22:56Z (id 5016675086)

https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016675086 . updated 2026-07-19T17:22:56Z . author_association OWNER . body sha256 `7b8ccf7ce8dc19a1b4fd3c8210477810233e8a27721029b2b2d4200dae8b50b8`

<!-- BEGIN COMMENT 5016675086 bytes=3362 sha256=7b8ccf7ce8dc19a1b4fd3c8210477810233e8a27721029b2b2d4200dae8b50b8 -->
## Fourth pass: dated AI-custody policy changes are real; enforcement still is not public

Parent: #30  
Builds on: https://github.com/BigBirdReturns/clifford-number/issues/43#issuecomment-5016629781  
Captured: 2026-07-19  
State: `graph_effect: none`; vendor-authored change histories and status telemetry, not observed policy execution.

### Baseline action

Reran the change-event boundary against Synthetic Users' versioned retention and incident-response documents, then checked its public operational history.

Primary artifacts:

- retention/deletion policy v1.2: https://legal.syntheticusers.com/data-management/user-data-deletion-retention-policy
- incident-response plan v1.2: https://legal.syntheticusers.com/security-policies/incident-response-plan
- public status page: https://status.syntheticusers.com/

### Two dated change events

The retention policy records a real version transition:

- v1.1 — March 2024, initial release;
- v1.2 — March 25, 2026, adding version metadata and a new AI/GenAI section covering embeddings, RAG data, model-interaction logs, evaluation/fine-tuning data, and decommissioning alignment, with the change history tying the expansion to JPMC SCA controls.

The new section states session-duration retention for prompt inputs and outputs, 90-day rolling metadata logs, RAG embeddings for the active contract plus deletion within 30 days of termination, evaluation/fine-tuning data through active use, and provider custody governed by DPAs.

The incident-response plan separately records:

- v1.1 — July 16, 2025, initial release;
- v1.2 — March 25, 2026, expanding scope to AI/GenAI incidents and JPMC client-notification obligations.

The new scope explicitly names prompt injection, leakage through model outputs, model misuse, abnormal model behaviour, and third-party LLM-provider events.

These are **policy change events**, not merely current disclosures. They show that AI-specific custody and incident categories were added after the original policies.

### Enforcement and correction boundary

The public status page, last updated July 17, 2026, reports 100% uptime for the home page and platform API across its displayed 90-day window. That is bounded availability telemetry only. It cannot establish that:

- no security, privacy, quality, or model-behaviour incident occurred;
- deletion completed within the stated deadlines;
- a provider honored its retention terms;
- an AI incident was investigated, corrected, reported, or enforced.

No public deletion confirmation, AI incident report/postmortem, customer correction record, regulator action, or policy non-compliance disposition was recovered in this pass. The March 2026 revisions therefore improve the auditable policy timeline but do not resolve the runtime tensions recorded in the prior receipt.

### Frontier verdict

**F-13 incidents/AUP enforcement remains on hold.** The dated policy expansion supplies a better positive policy anchor, but the promotion boundary requires an actual public incident/enforcement/correction record or a source-complete policy denominator. A strengthened incident plan is not an incident response receipt.

Nearest next artifact: one vendor/customer/regulator-authored incident or correction record that names the affected system, event date, observed impact, remediation, and closure/enforcement state.
<!-- END COMMENT 5016675086 -->

