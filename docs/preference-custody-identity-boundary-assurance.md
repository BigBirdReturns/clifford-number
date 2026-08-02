# PC-33 — identity resolution, entity-boundary, and network-frame custody

## Status

This is a synthetic Preference Custody control. It has no graph effect, consumes no thesis evidence, creates no named-network or real-world conclusion, and confers no public authority.

## Frozen publication surface

All eight worlds preserve:

```text
operative release                  RELEASE-INCIDENT-V1@1
observed nodes                     100
resolved identities                100
published identity coverage        100%
published duplicates                 0
published unresolved identities      0
published external nodes             0
public identity status             identity_verified
declared operational boundary      complete
published node-count stability     stable
approved use                       topology_exposure_estimation
```

The frozen surface is deliberately insufficient. It does not identify one-to-one record-to-entity mapping, alias and namespace reconciliation, false merges, false splits, identifier recycling, temporal succession, operational population boundaries, external bridge entities, eligibility, administrative-to-operational frame alignment, membership currency, denominator drift, correction, or public authority.

## Eight provenance worlds

1. Complete one-to-one identity, entity-boundary, frame, population, and current-membership custody.
2. Alias collision and false entity merge.
3. Record fragmentation and false entity split.
4. Identifier recycling, succession, and temporal identity collision.
5. Boundary truncation with omitted external bridging entities.
6. Ineligible proxy, service, household, or institutional nodes included as target entities.
7. Administrative frame misaligned with the operative communication and exposure system.
8. Dynamic membership churn and denominator drift under a frozen public node count.

Only the first world satisfies complete identity-boundary assurance. The other seven preserve the same public `identity_verified` surface while failing a distinct provenance mechanism.

## Deterministic aggregate

```text
worlds                                               8
public-status signatures                            1
identity-boundary provenance signatures             8
complete identity-boundary assurance worlds         1

one-to-one identity-complete worlds                 6
temporal-identity-complete worlds                   7
boundary-coverage-complete worlds                   7
frame-alignment-complete worlds                     7
eligibility-complete worlds                         7
membership-current worlds                           7
denominator-valid worlds                            5
current identity-boundary lineage worlds            6

false merged entities                              20
false split entities                               20
recycled identifiers                               15
omitted external entities                          30
omitted bridge entities                            15
ineligible included entities                       25
frame-misclassified entities                       40
entered entities                                   20
exited entities                                    15
churned entities                                   35
stale memberships                                  35
denominator drift                                  35
unsupported identity-boundary decisions           700
binding public-authority worlds                     0
```

## Custody chain

Each world emits a nine-event SHA-256 chain:

```text
public identity-and-boundary surface
→ record, namespace, alias, and crosswalk state
→ entity-resolution merge, split, and confidence state
→ temporal identity, identifier recycling, and succession state
→ entity boundary, operational frame, and bridge state
→ population eligibility, membership, and denominator state
→ identity-boundary-membership lineage state
→ correction, appeal, certificate, and authority state
→ provenance classification
```

The chain makes record identity, entity mapping, temporal succession, boundary, frame, membership, denominator, correction, and interpretation machine-addressable and tamper-evident.

## Refusal boundary

The control enforces, among other separations:

```text
100 resolved records ≠ 100 true entities
100% identity coverage ≠ one-to-one entity resolution
stable node count ≠ stable entity identity or membership
zero published duplicates ≠ zero false merges
zero published unresolved identities ≠ zero false splits or recycled identifiers
declared operational boundary ≠ observed operative system boundary
administrative roster ≠ communication, exposure, market, household, or institutional population
included node ≠ eligible target entity
omitted external node ≠ irrelevant entity
current identifier ≠ persistent entity across succession
frozen denominator ≠ current population under entry, exit, churn, or role change
identity_verified ≠ complete, one-to-one, boundary-valid, frame-valid, current, correctable, publicly authorized evidence
```

An identity or boundary failure does not prove coercion, manipulation, discrimination, breach, misconduct, coordination, common purpose, or intent. A real identity-resolved network claim still requires complete record, namespace, alias, entity, temporal, succession, boundary, frame, eligibility, membership, denominator, correction, durability, and authority custody.

## Commands

```bash
node tools/compile-preference-identity-boundary-assurance.mjs
node tools/validate-preference-identity-boundary-assurance.mjs
node test/preference-identity-boundary-assurance.test.js
```

The compiler writes deterministic JSON and Markdown projections under `build/research/`.
