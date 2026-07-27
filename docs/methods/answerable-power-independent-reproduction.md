# Independent reproduction and A1 intake

Sprint 06 freezes the audited Sprint 05 reference at commit `ce8f4194019cf75cc2b66436efbeebdfd43f9951` and exact-byte bundle `9084e2fe8e4a951fd667c71b9be58475a1b8fc463ab25c885fd98891d39747ad`.

The governing distinction is:

```text
structurally valid receipt
≠ independent reproducer
≠ truthful evidence
≠ A1 registry approval
```

## Clean-room rule

A reproducer must use a fresh independently provisioned workspace, the exact frozen commit, public source and dependency material, no project-supplied artifacts, and the complete command sequence in the protocol. Project CI, maintainers, reference contributors, vendors, operators, assessed adopters, customers, and bots cannot serve as the independent reproducer.

## Machine boundary

`node tools/m05-independent-reproduction.mjs <receipt.json> --as-of YYYY-MM-DD` checks structure, dates, exact reference identity, disqualifying relationships, command completion, deterministic rebuild, custody, and signature fields. It always reports that actual independence and evidence truth remain undetermined.

## Human boundary

A1 requires two separate human determinations: independence/conflict review and evidence/reproduction review. The registry remains append-preserving. Receipt expiry, evidence disappearance, hash mismatch, conflict discovery, or material false statement revokes current support without erasing history.

## Intake safety

The GitHub issue form accepts only public links and non-sensitive metadata. Do not submit personal data, credentials, sealed records, private keys, or confidential evidence. Submission starts review only; it does not award A1.
