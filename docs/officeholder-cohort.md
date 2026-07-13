# Presidential officeholder cohort

Status: proposed, source-complete selection universe with source-resolved FEC
candidate and authorized presidential campaign-committee identifiers. Discovery
and intake are active; review and source limitations label the resulting rows
instead of stopping the work. This document replaces the target-first construction previously used
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

## Honest state and active routes

- The official FEC candidate profiles now source-resolve all eight cohort
  members to one presidential candidate ID each and enumerate 37 authorized
  presidential campaign committee IDs. The intake is checked in at
  `data/research/openfec-presidential-identifiers.json`; it remains
  `source_resolved_pending_canonical_promotion` and has no graph effect.
- OpenFEC is live and documents programmatic access, but its public documentation
  distinguishes `DEMO_KEY` from a provisioned key. No cohort-wide API Schedule B
  transaction query has run, so API coverage remains `0 / 37` committees.
  This does not block intake: the FEC's official no-key database dumps contain
  Schedule A, B, and E plus committee history from 1975 forward, and official
  no-key operating-expenditure cycle files provide a narrower route from 2003
  forward. The API is an efficient paginated route, not the evidence gate.
- Electronic campaign-finance, disclosure, spending, registry, and policy
  coverage attenuates for earlier administrations. A modern member's richer
  digital footprint cannot be ranked against an older member without a
  source-family coverage matrix.
- The OpenFEC candidate-search resolver is retained as a discovery tool, but a
  live trial showed why it cannot adjudicate identity: exact-name searches can
  return false positives and miss historical records. Official profile IDs now
  anchor the Schedule B adapter; canonical identity and beneficial-interest
  entity resolution still do not exist.
- A genuinely independent challenger has not reviewed the replacement boundary.
  That keeps the lane `pending_second_party` and prevents it from being called
  independently cleared. It does not prevent source discovery, preservation,
  extraction, rejected matches, nulls, or analysis from being recorded with
  their actual review status.

The source-route matrix at
`data/research/presidential-disclosure-source-coverage.json` applies four
official source families across all eight members (32 explicit member/source
cells). It records the FEC no-key routes, OGE's online and retention windows,
and NARA archive routing. A missing current OGE record is therefore preserved
as a retention or archive-search state, never silently converted into “no
interest existed.”

The first no-key live acquisition is preserved at
`data/research/fec-bulk-oppexp-2004-manifest.json`. The official 2004 file was
25,734,364 bytes compressed and 168,173,606 bytes extracted; the extracted file
hash is pinned. A complete scan of 954,706 source rows retained 27,862 reported
itemization rows from six George W. Bush committees. Of those rows, 26,115 came
from reports marked `A`, 1,746 from reports marked `N`, and one from a report
marked `T`. The indicator describes the containing report; it is not a duplicate-
row label. All 27,862 committee/report-year/report-type/transaction-ID keys are
distinct in this filtered projection, none spans multiple file numbers, and no
same-file key is repeated. This refutes the proposed “94% duplicates” or “16x
overcount” interpretation while still refusing to call itemizations unique
underlying payments. The matrix reports zero normalized beneficial-interest
rows and zero crossings.

Accordingly, the design layer is complete—eight members and five predicates—and
the official identifier spine is present—eight candidate IDs and 37 authorized
committee IDs. API Schedule B queries remain zero, but no-key bulk transaction
intake is now nonzero: one cycle, six committees, 27,862 reported itemization
rows with an explicit report-amendment audit. Normalized disclosure rows and crossing matches remain
zero. Identifiers and source availability do not narrate beneficial-interest
ingestion.

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

Run the bounded Schedule B intake with a provisioned key:

```bash
FEC_API_KEY=... npm run ingest:openfec-disbursements
```

The default queries one page for every one of the 37 authorized presidential
campaign committees. It preserves source pagination and labels incomplete
ranges `bounded_partial`, keeps public filing payee text and transaction fields
needed for later entity review, and drops street, city, state, ZIP, employer,
occupation, and contact fields. Output is disposable under
`build/openfec-schedule-b/`. No row becomes a crossing until a later review
resolves the payee, attaches a contemporaneous beneficial-interest source, and
passes the predicate's time-overlap test.

## Gate

```bash
npm run validate:officeholder
```

The validator fails if a member or official identifier disappears, a predicate
becomes member-specific or target-shaped, the named discovery seed gains
selection power, AI assistance is represented as independent clearance,
historical coverage or Schedule B credential gaps disappear, or the 8/37
identifier spine is narrated as live transaction ingestion.

The disclosure source gate is separate and executable:

```bash
npm run validate:disclosures
```

It fails if either pending review or a missing API key is rewritten as a reason
to stop discovery, if any source family silently drops a cohort member, if an
invalid coverage state appears, or if planned availability is narrated as
ingested documents or crossings.
