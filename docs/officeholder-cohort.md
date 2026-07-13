# Presidential officeholder cohort

Status: proposed, source-complete selection universe; live record ingestion is
blocked. This document replaces the target-first construction previously used
by the `trump-office-business-capital` discovery lane.

## Verdict on the prior universe

The prior lane failed two adversarial boundary attacks.

First, its universe began with one named person's candidate, committee, trust,
business, issuer, property, and policy identifiers. Literal execution therefore
enumerated the target and the target's counterparties. Its comparator existed
only as a sentence saying the same rule *would* apply elsewhere.

Second, several crossing descriptions were reverse-engineered from known
target-specific assets and policy topics. Running identical text against other
officeholders would still manufacture structural nulls because the predicate,
not the evidence, selected the expected outlier.

The failed attacks are preserved in
`data/research/selection-adversarial-reviews.json`. They were produced with AI
red-team assistance and do not satisfy the independent second-party clearance
requirement. The lane remains `pending_second_party` and publication-blocked.

## Replacement universe

The universe is now the office, not the person:

> Include every distinct person whose service as President of the United
> States intersects 1979-01-01 through the dated capture, without regard to
> party, wealth, business structure, allegation volume, or expected result.

The dated 2026-07-13 snapshot contains eight people: Jimmy Carter, Ronald
Reagan, George H. W. Bush, Bill Clinton, George W. Bush, Barack Obama, Donald
Trump, and Joe Biden. Donald Trump enters once as a person with two service
windows. Membership is enumerated before candidate, committee, business,
property, issuer, payment, or policy identifiers are resolved.

The roster and service dates use the
[National Archives' official presidents table](https://www.archives.gov/research/census/presidents).
The 1979 boundary is tied to the
[Office of Government Ethics' history of the Ethics in Government Act](https://www.oge.gov/web/oge.nsf/about_our-history),
not to a target's biography. Current presidential-candidate disclosure duties
are addressable in [5 U.S.C. § 13103](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title5-section13103).

The canonical, machine-readable roster is
`data/canonical/us-presidential-officeholder-cohort.json`.

## Frozen comparator battery

The five types are frozen before live entity queries:

1. A controlled committee disburses to an entity in which the member has a
   contemporaneous disclosed beneficial interest.
2. A federal agency records a payment to such an entity.
3. A foreign-state-controlled payer is documented paying such an entity.
4. The member reports equity in a public issuer during presidential service.
5. A disclosed private interest precedes a later official act in the same
   bounded domain.

Every type has identifier, evidence, temporal, allowed-language, and forbidden-
inference requirements in
`data/canonical/officeholder-crossing-predicates.json`. Every predicate applies
to every cohort member. Positive, null, unavailable, rejected, and source-
failure outcomes must all survive.

This battery can describe an observed difference. It cannot turn mention,
payment, equity, chronology, or an outlier into illegality, self-dealing,
causation, motive, or policy exchange without the additional evidence and legal
status those claims require.

## Honest blockers

- OpenFEC is live and documents programmatic access, but its public documentation
  distinguishes `DEMO_KEY` from a provisioned key and states the normal key's
  hourly allowance. The eight-member live resolution battery remains at zero
  until `FEC_API_KEY` is provisioned.
- Electronic campaign-finance, disclosure, spending, registry, and policy
  coverage attenuates for earlier administrations. A modern member's richer
  digital footprint cannot be ranked against an older member without a
  source-family coverage matrix.
- The OpenFEC candidate-search resolver now exists and is fixture-tested. The
  cohort-wide canonical identity and entity resolver does not exist yet.
- A genuinely independent challenger has not reviewed the replacement boundary.

Accordingly, the design layer is complete—eight members and five predicates—
while live cohort candidate resolutions remain `0 / 8`. Potential and design do
not narrate ingestion.

Run the live candidate search with a provisioned key:

```bash
FEC_API_KEY=... npm run resolve:openfec
```

For a non-release connectivity trial only, `npm run resolve:openfec --
--allow-demo-key` uses OpenFEC's shared demo credential. Both modes query every
cohort member sequentially, retry `429` and `503` responses, preserve source
failures and nulls, strip credentials from saved URLs, attach the consumption
contract, and write disposable results to `build/openfec-cohort/`. Candidate
search records remain unresolved intake; they are not crossings or canonical
identity assertions.

## Gate

```bash
npm run validate:officeholder
```

The validator fails if a member disappears, a predicate becomes member-specific
or target-shaped, the named discovery seed gains selection power, AI assistance
is represented as independent clearance, historical coverage or API-key gaps
disappear, or zero live resolutions are narrated as completed cohort work.
