# APC-01 A1 support lifecycle

## Purpose

Sprint 08 governs what happens **after** an A1 entry is proposed or approved. Initial external reproduction and adjudication are not permanent immunity. An A1 claim remains valid only while its evidence, independence, signatures, challenge process, scope, expiry, and required exit or substitution route remain supported.

The lifecycle is append-preserving:

```text
active
  → challenged
  → suspended
  → revoked
  → expired
  → restoration_pending
  → restored
  → superseded
```

No transition deletes the prior entry, challenge, incident, decision, dissent, or evidence locator. The current state is an added transaction over retained history.

## Public and protected challenge routes

A public challenge publishes the challenger identity, signed statement, evidence locators, digests, target entry, category, materiality, and requested action.

A protected challenge keeps the raw identity outside the public repository. A separate protected-identity custodian must verify it and publish a signed custody attestation, identity digest, scope, and retention commitment. The public docket must not expose the protected identity. An unreceipted private route cannot silently alter an A1 state.

Neither route proves the challenge. Both create evidence that must remain visible and be adjudicated under the separated independence and evidence roles created in Sprint 07.

## Automatic support loss

Twelve frozen triggers cover byte mismatch, inaccessible evidence, invalid signatures, reviewer disqualification, expiry, unresolved material challenge, append-law failure, unreviewed material change, newly disclosed conflict, retaliation or challenge suppression, binding legal order, and loss of a required exit or substitution route.

A recorded trigger may be false. The system therefore distinguishes:

```text
trigger report
≠ trigger truth

trigger report
→ public incident
→ mandatory interim lifecycle proposal
→ separated adjudication
→ append-preserving registry transaction, if approved
```

The project, vendor, operator, adopter, and registry custodian may not self-clear a trigger.

## Suspension, revocation, expiry, and supersession

Suspension is the safe interim state when material support is absent or a challenge cannot be resolved before harm. Revocation is a final externally adjudicated finding that the bounded A1 support claim is materially invalid or captured. Expiry occurs when the validity envelope lapses. Supersession ends the prior scope when a material reference or successor-system change requires a new evaluation.

An unsupported entry may not continue to be represented as active merely because a final review has not finished.

## Restoration

Restoration is never automatic. A correction or renewal package must include:

1. the prior adverse state and all retained challenges, incidents, decisions, and dissent;
2. evidence that the cause of support loss was corrected;
3. renewed independence and evidence decisions by different people and different legal entities;
4. an elapsed public challenge window of at least fourteen days;
5. zero unresolved material blocker or dissent;
6. successor compatibility and scope evidence;
7. a new bounded expiry;
8. a ministerial, append-preserving registry transaction.

A structurally valid restoration proposal is not restoration. Only the external adjudication and registry path may support that claim.

## Current verified state

```text
A1 registry entries:                 0
public challenges:                   0
protected challenge attestations:    0
support incidents:                   0
suspensions:                         0
revocations:                         0
expiries:                            0
restorations:                        0
maximum verified adoption level:    A0
real-person pilot authorized:       false
```

The lifecycle protocol is complete. No lifecycle event or A1 entry has been observed.
