# Answerable Power A1 adjudication

Sprint 06 created the external reproduction receipt path. Sprint 07 closes the next capture surface: a receipt cannot become A1 merely because the project names reviewers or merges a registry patch.

## Constitutional sequence

```text
external receipt
→ structural validation
→ public reviewer-pool snapshot and recorded selection
→ separate independence decision
→ separate evidence decision
→ minimum fourteen-day public challenge window
→ zero unresolved blockers or dissent
→ ministerial append-preserving registry transaction
```

The independence and evidence adjudicators must be different people and different legal entities. Maintainers, reference contributors, the reproducer, vendors, operators, customers, adopters, project bots, success-fee reviewers, and evidence preparers are disqualified from substantive adjudication.

A maintainer may act only as registry custodian. The custodian can verify exact mechanical correspondence but cannot change dispositions, blockers, dissent, challenges, evidence references, or signatures.

## Structural tool

```bash
node tools/m05-a1-adjudication.mjs transaction.json --as-of YYYY-MM-DD
```

A successful result means only `eligible_for_registry_proposal: true`. It does not establish actual independence, evidence truth, absence of suppression, external adjudication, A1, or real-world effectiveness.

## Current state

```text
eligible adjudicators enrolled: 0
external independence decisions: 0
external evidence decisions: 0
eligible registry transactions: 0
A1 observed: false
maximum verified adoption level: A0
```
