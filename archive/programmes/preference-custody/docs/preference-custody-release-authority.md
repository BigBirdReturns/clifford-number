# Release scope, notice comprehension, collective exit, and binding-authority custody

PC-20 separates notice delivery, payment, and a public `all_claims_released` status from comprehension, accessibility, meaningful exit, operative release identity, future and nonparty scope, explicit agreement, correction, durability, and authority.

The control is synthetic. It creates no graph effect, thesis evidence, notice audit, consent finding, release-enforceability opinion, coercion finding, public-authorization result, manipulation claim, legitimacy verdict, or inference of intent.

## Frozen release ledger

```text
technical correction          complete
final reference proposal      A1
public release status         all_claims_released
affected people               100
people paid                   100
amount paid                 1,800 units
reference notice              NOTICE-V1@1
reference release             RELEASE-INCIDENT-V1@1
reference scope               incident-specific existing claims
reference opt-out window      60 days
```

Every world sends and delivers notice to all 100 affected people and pays all 100 people. Those invariants do not identify comprehension, usable exit, assent, the binding release version, or authority over future and nonparticipant claims.

## Eight release systems behind one public status

### Complete accessible, comprehended, exitable narrow release

The positive world preserves plain-language and prominent material terms, complete language and accessibility coverage, verified comprehension by all 100 people, a meaningful 60-day opt-out, disclosure and comprehension of the operative narrow release, explicit agreement by all bound people, independent review, objection, appeal, correction, reformation, and complete public explanation.

```text
notice delivered                    100
notice comprehended                 100
operative release disclosed         100
operative release comprehended      100
explicit agreement                  100
nonparticipants bound                 0
future claims released              false
complete path                       true
```

### Delivered but mostly unread notice

All 100 notices are delivered, but only 25 are acknowledged and 10 are comprehended. The release binds all 100 people while the public status remains `all_claims_released`.

```text
delivery                            100
acknowledgement                      25
comprehension                        10
people lacking comprehension         90
```

Delivery is therefore distinct from receipt, attention, comprehension, accessibility, and usability.

### Material terms buried in an overloaded notice

All 100 people acknowledge the notice, but the document is not plain-language and the release and exit terms are not prominent. Only 35 people comprehend the operative terms.

```text
acknowledgement                     100
comprehension                        35
plain language                    false
material terms prominent          false
```

Formal completeness does not establish usable disclosure.

### Language and accessibility gaps

Notice is delivered to all 100 people, but language coverage reaches only 80 and accessibility coverage reaches 90. Twenty people attempt to exit and all twenty attempts fail because assistance and late review are unavailable.

```text
language coverage                    80
accessibility coverage               90
comprehension                        60
opt-out attempts                     20
successful exits                      0
failed exits                         20
```

A formally available route is not meaningful when the affected person cannot access or complete it.

### Formal opt-out with short deadline and high friction

All 100 people comprehend the notice. The route nevertheless requires a multi-step notarized mailing within seven days. Thirty people attempt to exit; five succeed and twenty-five fail.

```text
comprehension                       100
formal opt-out                     true
deadline                              7 days
attempts                             30
successes                             5
failures                             25
bound affected people                95
```

This world isolates exit effectiveness from notice comprehension.

### Approved narrow release replaced by a broader future-claims version

The notice discloses and explains `RELEASE-INCIDENT-V1@1`, while the binding instrument is `RELEASE-FUTURE-V2@2`. The binding version includes future and unknown related claims and named affiliates. No affected person receives or comprehends the operative version.

```text
approved and disclosed release     RELEASE-INCIDENT-V1@1
binding release                    RELEASE-FUTURE-V2@2
operative version disclosed          0
operative version comprehended       0
future claims included             true
version and scope drift            true
```

An approval record or notice summary does not identify the instrument that actually binds.

### Affiliates and nonparticipants bound without notice or consideration

The affected population receives and comprehends the operative release. The instrument additionally binds twenty nonparticipants and extends to affiliates, successors, and derivative claims. Those twenty people receive neither notice nor consideration, and the synthetic representative holds no authority to bind them.

```text
affected population                 100
bound population                    120
nonparticipants bound                20
consideration-covered population    100
nonparticipant binding authority  false
```

Representation of one population does not create authority over another.

### Payment acceptance treated as assent

All 100 people receive payment. Only 50 comprehend the release, ten attempted exits fail, and no person gives explicit agreement. Payment acceptance is nevertheless treated as assent.

```text
people paid                         100
comprehension                        50
explicit agreements                   0
failed exits                         10
payment treated as assent          true
```

Payment and informed release remain separate objects.

## Aggregate separations

```text
worlds                                             8
distinct public-status signatures                 1
distinct release-authority signatures             8
complete notice-exit-release worlds               1
delivery-without-comprehension worlds             4
notice-overload worlds                            1
accessibility-failure worlds                      1
meaningful-exit-failure worlds                    5
release-scope-drift worlds                        2
future-claim-release worlds                       2
nonparticipant-binding worlds                    1
payment-as-consent worlds                         1
approved-binding-version-mismatch worlds          2
complete independent-review-and-correction worlds 1
notice-comprehension-complete worlds              4
full-notice-delivery worlds                       8
full-affected-payment worlds                      8
total people lacking notice comprehension       245
total failed opt-out attempts                    55
total nonparticipants bound                      20
binding public-authority worlds                   0
```

## Notice custody

A real notice claim must preserve more than a sent or delivered count:

```text
notice identity, version, content hash, and operative release cross-reference
send, delivery, failure, acknowledgement, and assistance receipts
plain-language and material-term prominence state
language and accessibility coverage
comprehension instrument, administration, result, and denominator
person-level notice version and operative release version
```

## Exit custody

A meaningful exit claim requires:

```text
formal route and deadline
extension, waiver, and late-review rules
assistance and accessibility
attempt, success, failure, abandonment, and reason
friction, required steps, authentication, mailing, and cost
person-level exclusion and later binding state
```

The existence of a route is not evidence that the route worked.

## Release custody

The operative release requires separate custody for:

```text
approved, disclosed, executed, and binding identity and version
operative text and content hash
covered claim categories and time horizon
future, unknown, affiliate, successor, derivative, and nonparty scope
consideration-covered population
person-level disclosure, comprehension, agreement, payment, exit, and binding state
scope drift, version drift, severability, reformation, reopen, and correction
```

## Agreement and authority

PC-20 distinguishes:

```text
payment
acknowledgement
comprehension
explicit agreement
non-opt-out
binding legal or institutional treatment
public authorization
```

No item silently substitutes for another. Even the positive synthetic world does not create binding public authority.

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
affected population, payment, reference notice, release, and public status
→ notice delivery, acknowledgement, comprehension, language, and accessibility
→ formal and meaningful exit
→ approved, disclosed, binding, future, nonparty, and assent release state
→ review, objection, appeal, correction, reformation, and authority
→ comprehension, failed-exit, and nonparticipant-binding consequence
→ release-authority classification
→ interpretation seal
```

Mutating a notice count, accessibility field, exit receipt, release version, scope, agreement count, nonparticipant denominator, governance state, classification, or chain link breaks validation or the custody hash.

## Run

```bash
node tools/compile-preference-release-authority.mjs
node tools/validate-preference-release-authority.mjs
node test/preference-release-authority.test.js
```

Generated projections:

```text
build/research/preference-release-authority.json
build/research/preference-release-authority.md
```

## Publication boundary

The admissible laboratory statement is that one complete technical correction, one A1 state, one public `all_claims_released` status, one 100-person affected population, payment to every person, and one 1,800-unit beneficiary total can coexist with complete informed notice and exit, unread notice, overloaded terms, accessibility gaps, unusable opt-out, binding-version drift, future and nonparticipant scope, or payment-as-assent. A real release claim requires complete population, notice, comprehension, accessibility, exit, operative release, future and nonparty scope, assent, payment, representation, binding, correction, durability, and authority custody.
