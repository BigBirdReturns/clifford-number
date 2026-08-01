# Deliberative reason exchange, vote, and summary custody

PC-12 separates a published collective disposition from the communicative and decision process beneath it. The control holds participant identities, instrument, agenda family, baseline private preference, and the final published majority constant while changing how participants receive information, exchange reasons, vote, bargain, conform, and are summarized.

The fixture is synthetic. It creates no graph effect, thesis evidence, named-institution deliberation finding, consensus finding, collective-agreement finding, manipulation claim, public-authorization verdict, or inference of intent.

## Frozen state

```text
population                    1,000 retained participants
baseline private A share      60%
baseline public A vote        60%
published post-process A      80%
instrument                    instrument-v1
agenda family                 A versus B
ballot rule                   one person, one vote
```

All six worlds publish the same 80/20 disposition.

## Six processes behind one published majority

### Independent private-evidence conversion

Two hundred B-preferrers review independent evidence and privately convert to A. No communication event occurs. Their private preference and ballot move together.

```text
private conversions              200
reciprocal exchanges               0
reason-uptake events                0
amendments                          0
deliberative process               false
```

Removing the private evidence restores 60/40.

### Reciprocal reason exchange with amendment and uptake

B_SHIFT challenges A0 with a burden claim and cites evidence. A_CORE responds with safeguard evidence. The response is incorporated into A1, and B_SHIFT endorses the amended proposal. Private preference and ballot move together.

```text
challenge                           1
responsive answer                   1
evidence-bearing events             3
reason-uptake events                2
adopted amendment                   1
private conversions              200
```

This is the fixture’s one qualified deliberative process. It preserves speaker, recipient, round, speech act, claim, evidence, target, response, uptake, proposal lineage, private transition, ballot, and final disposition.

It remains nonbinding public evidence. Reason-responsive deliberation does not by itself confer public authorization.

### One-way expert briefing

An expert presents evidence favoring A. Two hundred participants privately convert and vote A. Participants do not challenge, respond, amend, or demonstrate reason uptake through a reciprocal process.

```text
information exposure              true
private conversions                200
reciprocal exchange                  0
deliberative process               false
```

A one-way briefing can change preferences. It is not reciprocal deliberation.

### Public conformity vote without private conversion

A visible straw poll announces a strong A majority. Under a public roll call, two hundred private B-preferrers vote A while retaining B.

```text
private A share                    60%
ballot A share                     80%
vote-private divergence            200
```

Replacing the public roll call with a private ballot restores 60/40.

### Strategic logroll without focal-preference conversion

Two hundred B-preferrers receive a binding side concession on an external issue in exchange for voting A0. Their focal private preference remains B while their ballot moves to A.

```text
private A share                    60%
ballot A share                     80%
strategic vote-private divergence  200
side agreements                      1
```

Removing the side agreement restores 60/40. The vote records package strategy, not focal-preference conversion. PC-08 continues to govern whether the broader package constitutes a negotiated collective agreement.

### Facilitator or model summary distortion

The private preference and actual ballot remain 60/40. A model-assisted summary reclassifies two hundred conditional B objections as A support, publishing 80/20.

```text
private A share                    60%
ballot A share                     60%
published A share                  80%
summary-ballot divergence           200
```

Publishing the exact ballot and permitting summary appeal restores 60/40.

## Aggregate separations

```text
worlds                                             6
distinct published dispositions                   1
distinct private-preference signatures            2
distinct ballot signatures                        2
distinct process signatures                       6
worlds with private conversion                    3
worlds without private conversion                 3
worlds with reciprocal reason exchange            1
worlds with reason uptake                         1
worlds with amendment uptake                      1
worlds with one-way briefing                      1
worlds with vote-private divergence               2
worlds with strategic logroll                     1
worlds with summary-ballot divergence             1
worlds with qualified deliberative process        1
reason-responsive collective-position worlds      1
binding public-authority worlds                   0
maximum published-private separation             20%
maximum published-ballot separation              20%
```

The published majority identifies none of these process mechanisms by itself.

## What qualifies deliberation in the fixture

The reciprocal world passes only because it preserves the following joined transaction:

```text
attributed challenge
→ evidence-bearing response
→ explicit uptake
→ versioned amendment
→ changed private position
→ ballot aligned with the changed position
→ exact publication of the ballot
```

Speaking time alone is insufficient. Transcript presence alone is insufficient. A response with no uptake is insufficient. An amendment with no private or collective disposition is insufficient.

## Ballot, summary, and consensus

PC-12 preserves three different collective objects:

```text
private participant preference
public ballot
published institutional summary
```

A public ballot may diverge from private preference under conformity or strategic exchange. A published summary may diverge from both. A majority ballot is a disposition under a rule; it is not automatically consensus. Consensus would require a stronger and explicitly defined agreement state rather than the absence of recorded dissent.

## Deliberation and authority

The reciprocal world demonstrates reason-responsive preference formation. It does not grant the process authority over implementation, the institutional objective, affected nonparticipants, appeal, or remedy.

```text
reason exchange ≠ binding authority
reason uptake ≠ public authorization
amendment ≠ collective agreement without disposition and enforcement
majority vote ≠ consensus
```

PC-06 governs public standing and objective control. PC-07 governs agenda authority. PC-08 governs bargaining and package agreement. PC-12 governs the provenance of reason exchange, private change, ballot, and summary.

## Real-case promotion boundary

A real deliberative-preference claim requires:

```text
participant identity and eligibility
speaking challenge response and amendment rights
complete transcript or structured turn ledger
speaker recipient round and timing
claim and evidence provenance
challenge-response links
reason-uptake or rejection state
proposal and amendment versions
private pre- and post-process preference
public ballot and ballot secrecy state
quorum threshold and disposition rule
social reputational and strategic incentives
side agreements and package conditions
facilitator prompt policy and summary rules
summary-to-ballot fidelity and appeal
process counterfactual or comparison condition
implementation consequence and authority state
```

A summary generated after the fact cannot substitute for the ballot or turn ledger. A ballot cannot substitute for private preference. A transcript cannot substitute for reason uptake.

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
baseline identity preference agenda and rights snapshot
→ turn claim evidence challenge response and uptake ledger
→ proposal amendment and side-agreement versions
→ post-process private preference state
→ public ballot state
→ facilitator summary and published disposition
→ process counterfactual
→ mechanism classification
→ interpretation seal
```

Mutating a turn, claim, evidence item, target, uptake state, proposal version, private transition, vote, summary adjustment, counterfactual, or classification breaks the chain.

## Run

```bash
node tools/compile-preference-deliberative-formation.mjs
node tools/validate-preference-deliberative-formation.mjs
node test/preference-deliberative-formation.test.js
```

Generated projections:

```text
build/research/preference-deliberative-formation.json
build/research/preference-deliberative-formation.md
```

## Publication boundary

The admissible laboratory statement is that one published 80 percent disposition can arise from independent conversion, reciprocal reason exchange, one-way briefing, public conformity, strategic logroll, or summary distortion. A real reason-responsive collective-preference claim requires participant, turn, claim, evidence, challenge, response, uptake, amendment, private-preference, ballot, summary, counterfactual, consequence, and authority custody.
