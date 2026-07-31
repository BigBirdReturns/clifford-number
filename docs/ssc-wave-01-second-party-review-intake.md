# SSC-W01 separated second-party reviewer intake

**Campaign:** `SSC-W01-SPR01`  
**Issue:** `#507`  
**Packet denominator:** fourteen exact Wave 01 review packets  
**Current valid second-party reviews:** zero  
**Publication clearance:** none  
**Graph effect:** none  
**Adoption effect:** none

This intake route exists to obtain genuinely separated, packet-specific external review. It does not expose publication-blocked evidence, replace the maintainer review, suspend project reasoning, or confer reviewer eligibility merely because somebody volunteers.

## Public nomination route

Use GitHub issue `#507` to:

1. nominate a potential reviewer;
2. declare your own interest in reviewing;
3. identify one or more packet IDs from `SSC-OBS-0001` through `SSC-OBS-0014`;
4. provide a public contact route; and
5. state any obvious authorship, employment, financial, procurement, litigation, political, institutional, or close-personal conflicts.

Do not post private contact information, held source bytes, restricted documents, or confidential third-party material in the public issue.

A nomination is only a candidate record. A title, affiliation, recommendation, invitation, nonresponse, refusal, or acceptance is not evidence of independence and does not count as review.

## Packet assignment

Before assignment, the campaign must bind:

```text
reviewer identity
current affiliation
packet-specific conflict disclosure
eligibility decision
exact packet ID
exact packet SHA-256
parent maintainer-review release SHA-256
source-access statement
```

Eligibility is packet-specific. One conflict does not make a person universally ineligible, and prestige does not establish independence.

Automatic packet ineligibility includes:

```text
packet author or material editor
maintainer or maintainer-controlled reviewer
named target or represented institution
source custodian for the packet
direct material beneficiary
material financial, employment, litigation, procurement,
  political, or close-personal interest
prior adjudicator for the same packet
insufficient identity or conflict disclosure
```

## Review receipt

A submitted receipt must include:

```text
review ID
reviewer ID and identity receipt
affiliation
packet ID and packet SHA-256
parent review release SHA-256
review timestamp
source-access statement
conflict disclosure
eligibility decision
independent four-gate assessment
recommended disposition
authority ceiling
alternatives and counterevidence retained
missing acquisitions
unresolved questions
relationship to the maintainer review
confidence and scope limits
authenticity receipt
review effect classification
publication effect: none
graph effect: none
adoption effect: none
```

The four gates must be assessed separately as `SSC-G1` through `SSC-G4`. Missing evidence must remain missing; a reviewer may not silently convert source access, institutional familiarity, or confidence into a stronger evidentiary state.

## Counting law

```text
candidate_only             != second-party review
invited                    != second-party review
nonresponse                != second-party review
refused                    != second-party review
conflict_disclosed         != second-party review
ineligible                 != second-party review
accepted                   != second-party review
submitted_unvalidated      != second-party review
valid_review               == one validated packet review
```

A valid review may affirm, recommend narrowing or expansion, identify a control or non-link, identify a new acquisition obligation, or record bounded disagreement.

A valid review does not by itself:

```text
rewrite the canonical disposition
adjudicate its own disagreement
clear publication
create a graph edge
establish prevalence, racial order, coordination,
  common purpose, or personal hostility
advance deployment or adoption
```

Canonical disposition changes require an append-preserving reconciliation transaction. Material unresolved disagreement routes to a separately eligible adjudicator.

## Evidence access

The public intake page exposes only campaign law, packet identifiers, and release digests. Publication-blocked source and report products remain in repository custody and are supplied only through a bounded, receipted packet-access transaction consistent with source restrictions.

The absence of a reviewer does not erase the project’s existing evidence and does not prevent bounded internal judgment. It prevents only the external claim that an independent second party reproduced the packet.
