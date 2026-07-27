# Answerable Power adoption integrity

## Current authority

Sprint 05 has been audited start to finish. The authoritative structural package is `apc-adoption-package@2`; the original v1 conformance surface is retained only as history and may not support an A1–A6 promotion. The verified ceiling remains **A0**.

```text
A0  published reference
A1  independently reproduced
A2  independently reviewed and approved by affected parties
A3  lawful no-adverse shadow mode
A4  prospective parallel operation without adverse-action authority
A5  observed rights-bearing use
A6  durable adoption surviving turnover and successor systems
```

## Audit correction

The start-to-finish review found eight material defects in v1: open blockers were ignored; boolean observations could promote levels; technical review was omitted; claim and deployment modes could disagree; receipts lacked complete date, expiry, independence, and scope checks; hashes were semantic rather than exact-byte; candidate records lacked source locators; and the registry fingerprint was a placeholder.

The v2 package corrects each defect without adding external evidence or promoting the ceiling.

## Exact-byte custody

`tools/build-m05-answerable-power-sprint-05.mjs` writes an ordered release manifest containing the SHA-256 and byte length of every governed source, CLI, and method document. The manifest does not include itself or generated reports. Its combined SHA-256 is resolved into the generated registry report. Exact bytes establish custody, not factual truth.

## Evidence-computed levels

The CLI never accepts `requested_level`, a boolean, or a narrative assertion as proof. A1–A6 observations require dated evidence URIs and a scope fingerprint matching `claim.scope_fingerprint`. Attestors, four review types, entry-gate authority, stop authority, preregistration, updates, and successor instruments must be current and scope-bound.

Open blockers are structured. Each open blocker caps the computed level below its `first_affected_level`. A request at or above that level fails.

## Candidate source boundary

Every candidate now carries official source locators and explicit support limits. Homes for Ukraine Share is the only exact operating system in the denominator and is linked to existing repository source records. The other candidates remain policy, legal, registry, or institutional surfaces until one exact deployment and authority chain are selected. Source presence does not establish adoption suitability or willingness.

## Run

```bash
node tools/m05-adoption-conformance.mjs path/to/adoption-package.json
node tools/build-m05-answerable-power-sprint-05.mjs
node tools/validate-m05-answerable-power-sprint-05.mjs
node test/m05-adoption-conformance.test.js
node test/m05-answerable-power-sprint-05.test.js
```

A conformant result remains machine-verifiable only and always reports `truthfulness_determined: false`.
