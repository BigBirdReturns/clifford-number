# Evidence Desk root publication estate

Status: staged publication architecture. This document governs a reader-facing site layer and creates no canonical claim, relationship, score, graph effect, or conclusion.

## Why this estate exists

The WebsiteIQ baseline exposed a deployment-level failure before it exposed a content-level failure. An origin-oriented auditor reached the GitHub Pages account root and received a 404 because the actual project was available only under a repository pathname. A cold reader, crawler, agent, or external evaluator should not need prior knowledge of a project subpath to discover the work.

The remediation is a dedicated publication origin whose root is useful by itself. The existing Clifford Number application remains the evidence backend. The publication estate must not become a second factual ledger.

## Product boundary

The publication layer performs five jobs:

1. It presents one bounded public-interest question before introducing internal ontology.
2. It shows the minimum supportable story, strongest evidence boundary, strongest counterweight, and exact next record.
3. It offers reporter, editor, and machine entry routes.
4. It exposes method, privacy, correction, audit, and interpretation contracts as first-class pages.
5. It hands deeper inspection to the canonical Clifford backend.

The publication layer may group and explain canonical material. It may not create facts, chronology, influence, intent, wrongdoing, or approval state absent from the underlying evidence case.

## Reader sequence

```text
recognizable question
→ minimum supportable story
→ evidence boundary
→ strongest counterweight
→ next record
→ complete evidence backend
```

The order is deliberate. A cold reader should be able to determine whether a story is alive before learning the full Clifford vocabulary.

## Required routes

- `/` provides cold-reader orientation and three role-based entry paths.
- `/stories/` contains finite decision files rather than actor profiles.
- `/newsroom/` launches the evidence-operation proving ground.
- `/methods/` translates project terms into newsroom operations.
- `/trust/` states limitations, privacy, correction, and editorial-control rules.
- `/audit/` preserves the WebsiteIQ report, targeting correction, and remediation ledger.
- `/evidence/` identifies the canonical backend and the projection boundary.

## Machine discovery

The root release ships `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD, Open Graph metadata, a web manifest, and stable JSON route, story, and audit records. These surfaces describe the publication contract. They do not promote backend candidates into claims.

## Deployment

The intended origin is `https://evidence.axm.tools`, deployed through Cloudflare Pages Direct Upload. The upload artifact must contain `index.html` at the ZIP root. Deployment acceptance requires successful retrieval of `/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/audit/`, and `/data/site.json` before the custom domain is treated as live.

## Re-audit law

WebsiteIQ must be run again against the deployed root after the target window resets. The re-audit report remains external evidence and must be preserved with its target URL, capture time, report bytes, service limitations, and any score definitions. A successful static build cannot be narrated as a successful WebsiteIQ re-audit.
