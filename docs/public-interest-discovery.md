# Public-interest discovery spine

Status: bounded discovery architecture. This document creates research lanes,
not a dossier, accusation, or guilt graph. Every generated item begins with
`graph_effect: none`.

The initial lanes are the Epstein public corpus, Trump
public/private/capital/office crossings, and Panama Papers/offshore entity
topology. They are joined by exact predicates and resolved entities, never by a
generic `associated_with` edge.

```text
source artifact
  -> bounded observation or attributed claim
  -> predicate-specific entity resolution
  -> time-compatible institutional/capital crossing
  -> corroboration, dispute, or legal disposition
```

The checked-in queue is
`data/research/public-interest-discovery-seeds.jsonl`. It contains eight
bounded queries per lane. `npm run fanout` turns each seed into an internal,
non-graphing research packet while preserving its allowed predicates,
forbidden inferences, source family, and privacy rule.

## 1. Epstein: reconstruct several networks, not one association list

The [DOJ Epstein Library](https://www.justice.gov/epstein/doj-disclosures)
contains court records and the large EFTA production. DOJ says the combined
release approaches 3.5 million pages, 2,000 videos, and 180,000 images gathered
from multiple cases and investigations. DOJ also warns that the production can
contain fake or false material submitted by members of the public. An EFTA ID
therefore establishes government collection and publication, not the truth or
authentication of every item. See the
[release notice](https://www.justice.gov/opa/pr/department-justice-publishes-35-million-responsive-pages-compliance-epstein-files).

The corpus should be separated into at least these maps:

- travel: one written passenger token per aircraft leg;
- contacts: one page-bounded contact-book entry, with contact details removed;
- communications: email headers, textual mentions, calls, and messages kept
  distinct;
- meetings: proposed, scheduled, and corroborated attendance are separate;
- finance: accounts, transfers, compliance alerts, institutional findings,
  and penalties;
- institutions: gifts, visits, appointments, introductions, approvals, and
  internal reviews;
- justice: reports, investigations, non-prosecution agreements, charges,
  pleas, convictions, dismissals, settlements, and sentences;
- claims: every allegation, denial, contradiction, corroboration, and
  disposition as a reified object.

The bounded benchmark materials are DOJ's
[Phase One release](https://www.justice.gov/opa/pr/attorney-general-pamela-bondi-releases-first-phase-declassified-epstein-files),
which links flight logs and a redacted contact book, and the addressable court
records in the DOJ library. A flight-log name does not establish boarding with
certainty, trip purpose, destination activity, knowledge, or wrongdoing. A
contact-book entry does not establish that contact occurred.

High-value institutional and capital crossings include the
[New York DFS Deutsche Bank consent order](https://www.dfs.ny.gov/system/files/documents/2020/07/ea20200706_deutsche_bank_consent_order.pdf),
the USVI v. JPMorgan docket, the [MIT fact-finding archive](https://web.mit.edu/fact2020/),
Harvard's institutional review, and Apollo's SEC filings. Their findings,
admissions, attributed allegations, and legal dispositions remain separate.

### Epstein identity and evidence hazards

- Handwritten logs contain initials, misspellings, ditto marks, and ambiguous
  passenger/crew layouts.
- Contact books mix people, households, assistants, firms, and stale details.
- A calendar entry can be a proposal rather than an attended meeting.
- Forwarded email and quoted text do not establish who authored each sentence.
- Duplicate files released by DOJ, Congress, courts, and media are repeated
  custody, not independent corroboration.
- Artifact date, event date, and public release date must travel separately.
- Jane Doe identifiers must never be merged across cases without an explicit
  public court crosswalk, and the project must not attempt deanonymization.

## 2. Trump: separate the person, offices, campaigns, trusts, and entities

The minimum identity spine keeps these node families distinct:

- Donald J. Trump as a person;
- the 45th and 47th presidential offices;
- presidential candidate `P80001571`;
- campaign, joint-fundraising, and PAC committees, including `C00580100`,
  `C00618371`, `C00618389`, and `C00762591`;
- the Donald J. Trump Revocable Trust;
- each operating, payroll, property, licensing, and digital-asset entity;
- Trump Media & Technology Group, SEC CIK `0001849635`;
- the Donald J. Trump Foundation.

A finding, transaction, conviction, liability judgment, or settlement attached
to a company, foundation, committee, employee, or co-defendant does not
silently become a predicate on Trump personally.

The first machine-readable crossings are:

1. **Campaign to business:** query the
   [FEC candidate and committee records](https://www.fec.gov/data/candidate/p80001571/)
   and Schedule B disbursements, then resolve recipients against exact legal
   entities in certified financial disclosures.
2. **Government to property:** join USAspending award identifiers, GSA leases,
   Secret Service records, and inspector-general findings to exact property
   entities. Obligation, outlay, ceiling, refund, lodging charge, and lease
   payment are different amount stages.
3. **Foreign state to property:** normalize the congressional staff report
   based on Mazars records by payer, country, state-entity status, property,
   date, and amount. The report is an attributed congressional finding, not a
   judicial judgment.
4. **Trust to public company:** use SEC accession numbers to map TMTG ownership,
   trust transfers, officers, directors, related-party transactions, SPAC
   actors, lenders, and enforcement events.
5. **Private crypto interest to public policy:** independently date certified
   OGE disclosures, token and product events, executive orders, agency actions,
   and institutional purchases. Ordering and overlap are not causation.
6. **Legal status:** preserve defendant, count or cause, instrument, finding or
   verdict, judgment, remedy, appeal, vacatur, affirmance, dismissal, and
   current disposition separately.

Primary gateways include the
[OpenFEC API](https://api.open.fec.gov/developers/),
[SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces),
[USAspending API](https://api.usaspending.gov/docs/), OGE disclosures,
LDA filings, FARA registrations, GovInfo, official court reporters, and PACER
or RECAP copies keyed to authoritative docket identifiers.

### Trump-Epstein predicate firewall

The lane preserves distinct records for logged flight-leg names, documented
event co-presence, public self-description, self-claimed estrangement, property
employment, sworn testimony, proposed calls or visits, subpoena production,
and explicit negative testimony. DOJ document
[EFTA00028716](https://www.justice.gov/epstein/files/DataSet%208/EFTA00028716.pdf)
is a bounded flight-record lead, not a criminal finding.

No combination of social acquaintance, co-presence, flight notation, property
employment, or witness mention automatically establishes participation in
Epstein's crimes.

## 3. Panama Papers: begin with the service-provider machinery

The [ICIJ Offshore Leaks download](https://offshoreleaks.icij.org/pages/database)
provides CSV and Neo4j versions of a graph containing entities, officers,
intermediaries, addresses, and relationships across several leak datasets. It
does not provide the underlying bank accounts, emails, or financial
transactions. Inclusion does not imply illegal conduct.

```text
person or company
  -> beneficial owner / officer / shareholder / nominee role
  -> offshore entity
  -> jurisdiction + registered address
  -> intermediary: bank / lawyer / incorporator / registered agent
```

The first expansion therefore ranks intermediary and registered-address hubs
by degree, jurisdiction diversity, and active-year span. Degree is a routing
signal, not a wrongdoing score. Every entity is then validated against an
official registry before a person-level conclusion.

Join keys, strongest first:

1. jurisdiction plus official registration number;
2. LEI, Companies House or overseas-entity ID, SEC CIK, or OFAC UID;
3. exact name, jurisdiction, and incorporation date;
4. former name plus registered-agent history;
5. address, temporal overlap, and one independent identifier;
6. person name plus two lawful distinguishing attributes.

ICIJ documents name variations, duplicate nodes, incomplete beneficiary
identifiers, nominee roles, and registered-agent addresses in its
[FAQ](https://offshoreleaks.icij.org/pages/faq) and
[schema](https://offshoreleaks.icij.org/schema/oldb). `ICIJ node_id` is
snapshot-local and must not become a universal identity key.

The enforcement overlay begins with official instruments such as the
[2018 SDNY indictment](https://www.justice.gov/d9/press-releases/attachments/2018/12/04/ramses_owens_et_al_indictment_0.pdf),
then records later pleas, convictions, acquittals, dismissals, and sentences as
their own procedural events. One defendant's disposition does not transfer to
other officers, intermediaries, or clients.

### Trump-Panama predicate firewall

ICIJ contains entities named for units in the Trump Ocean Club development,
including [Trump Ocean Club Unit 2710, Inc.](https://offshoreleaks.icij.org/nodes/10051325).
That record does not list Donald Trump as its officer or beneficial owner. A
project or brand reference must not become shell-company ownership.

Licensor, developer, manager, broker, unit owner, company officer,
intermediary, and beneficial owner are different predicates. Any allegation of
money laundering requires a source attached to a specified owner, purchaser,
transaction, investigation, or adjudicated case.

## 4. Cross-corpus routing

The three lanes become useful together only after predicate and identity
validation:

- Epstein entity -> bank or institution -> regulatory/court finding;
- validated offshore entity -> officer/intermediary -> public office,
  contracting, lobbying, campaign finance, sanctions, or registered asset;
- Trump committee/office/trust/business -> exact transaction or filing ->
  counterparty entity;
- public actor -> exact Epstein artifact predicate -> separately validated
  institutional or capital role.

Cross-corpus name matching produces candidates only. Registration numbers,
case numbers, committee IDs, SEC CIKs, accession numbers, award IDs, and dated
source pages produce reviewable joins. Every join remains reversible and
source-addressable.

## 5. Publication and privacy boundary

- Preserve public-role facts, public money, regulated filings, court status,
  and public-interest institutional decisions.
- Do not retain or republish passport numbers, bank-account numbers,
  signatures, private email or phone data, home addresses, full birth dates,
  victim identities, intimate questionnaire material, or protected witnesses.
- Reify allegations and denials; never flatten them into factual narration.
- Preserve source disappearance, contradiction, and non-results.
- A score ranks review priority. It is not a probability of guilt.
- A source seed, motif match, or cross-corpus candidate cannot create a
  Clifford hop without separate human promotion under the normal receipt
  rules.

