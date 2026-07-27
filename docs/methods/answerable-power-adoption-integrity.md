# Answerable Power adoption integrity

## Purpose

APC-01 is not adopted because an institution says it is adopted. Sprint 05 separates a published constitutional reference from independent reproduction, affected-party approval, lawful shadow or parallel operation, observed rights-bearing use, and durable adoption.

```text
A0  published reference
A1  independently reproduced
A2  independently reviewed and approved by affected parties
A3  lawful no-adverse shadow mode
A4  prospective parallel operation without adverse-action authority
A5  observed rights-bearing use
A6  durable adoption surviving turnover and successor systems
```

The repository computes the highest structurally eligible level from submitted evidence. It never treats `requested_level` as authoritative.

## Reconstruction boundary

The Sprint 05 package was materialized from a source-bounded operator handoff. The connected repository did not contain the named prior Sprint 05 files or terminal receipts when this branch was created.

The permanent record therefore says:

```text
handoff used as a design and state source: true
historical repository merge inferred: false
historical terminal receipts independently verified: false
bytes and validation produced on this branch: inspectable
```

This prevents an unpushed execution narrative from becoming repository history merely through repetition.

## Conformance CLI

Run:

```bash
node tools/m05-adoption-conformance.mjs path/to/adoption-package.json
```

The input must use `apc-adoption-package@1`. The CLI returns:

```text
conformant
requested_level
computed_maximum_level
errors
warnings
machine_verifiable_only
truthfulness_determined
```

Exit status `0` means the package is structurally conformant at or below the computed level. Exit status `2` means the package is nonconformant. Exit status `64` means the input could not be read or parsed.

The CLI rejects, among other conditions:

```text
self-attested independence
missing or stale legal, privacy, or ethics review
real-person data without the entry gate
adverse authority disguised as shadow or parallel mode
unbounded emergency power
exclusive vendor evidence custody
missing affected-party approval
unfrozen preregistration
silent material updates
missing successor inheritance
unsupported A1–A6 claims
```

A valid manifest is not necessarily a true manifest. Cryptographic integrity, complete fields, and named reviewers cannot establish factual truth, actual independence, absence of capture, nonretaliation, effective remedy, practical exit, or realized and fairly distributed value.

## Threat model

The frozen threat denominator contains twenty attack classes:

```text
12 machine-detectable structural failures
8 independent-human-investigation questions
```

Machine checks can detect documented contradictions, missing objects, expired evidence, hidden authority fields, denominator drift, and absent inheritance. They cannot reliably determine whether an apparently independent reviewer is captured, whether representatives are intimidated, whether a remedy works, whether an exit is practical, or whether evidence is fabricated.

## Real-person entry

A0 publication does not authorize real-person data or a pilot.

The entry gate requires thirteen separate approval and operating surfaces covering jurisdictional authority, research and ethics classification, privacy, minimization and deletion, security, accessibility and language, notice and nonretaliation, affected-party governance, independent stop and remedy, vendor controls, evidence preservation, a strict no-adverse boundary, and suspension, exit, and successor rules.

The repository can identify absent, expired, or inconsistent objects. It cannot issue legal, ethics, privacy, security, human-subjects, affected-party, or institutional approval.

## Affected-party governance

The synthetic governance constitution freezes:

```text
8 constitutional roles
14 formation rules
14 machine-tested properties
12 synthetic scenarios
```

The scenario denominator is:

```text
1 conformant
9 blocked
2 mandatory pause
```

The direct R1–R4 floor is immutable. A representative body can add protection but cannot waive timely notice, evidence access and correction, automatic pause and institutional proof, or binding remedy.

## Candidate landscape

The candidate denominator contains seven surfaces. Only Homes for Ukraine Share is recorded as an exact operating system. The other six remain policy, registry, legal, or institutional surfaces until a specific deployment, operator, affected population, decision mode, evidence custodian, and stop authority are selected.

No candidate records outreach, institutional willingness, external approval, affected-party approval, or eligibility for a real-person pilot.

## Preregistered evaluation

The evaluation template freezes fifteen metric families before an institution or vendor can inspect pilot results:

```text
notice
evidence access
contest
pause
correction
institutional proof
false positives and false negatives
remedy
service continuity
represented-person burden
capture, conflict, and retaliation
fallback and exit
public capacity
value realization and distribution
successor regression
```

Each metric retains its denominator and missingness. Failed, excluded, withdrawn, harmed, unreachable, missing, overridden, bypassed, and stopped cases remain visible.

The template also freezes eight constitutional stop events. A deployment-specific preregistration must add numeric or categorical performance and harm thresholds before A3. The template itself is not a pilot preregistration.

## Registry reconciliation

The adoption registry is append-only in meaning: a new reconciliation preserves the prior level, evidence fingerprint, blockers, reasons, and timestamp.

Every level requires all lower levels. Evidence expires. Material changes trigger re-review. A successor cannot inherit an adoption claim without inheriting the constitution and passing post-change review.

The current registry result is:

```text
A0 achieved: true
A1–A6 observed: false
works standard met: false
project complete: false
```

## Validation

Run:

```bash
node tools/build-m05-answerable-power-sprint-05.mjs
node tools/validate-m05-answerable-power-sprint-05.mjs
node test/m05-answerable-power-sprint-05.test.js
node test/m05-adoption-conformance.test.js
```

The builder emits deterministic JSON and HTML reports. The validator freezes counts, names, negative claims, the A0 ceiling, source fingerprints, and the reconstruction boundary.
