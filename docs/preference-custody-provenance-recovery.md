# Provenance attack, quarantine, rollback, and recovery custody

PC-14 separates a correct-looking headline, file hash, signature, or eventual correct result from the provenance and recovery path that produced it. The control holds the public A-family headline at 80 percent while changing attack vector, detection timing, trust state, quarantine, rollback, replay, correction, and implementation consequence.

The fixture is synthetic. It creates no graph effect, thesis evidence, named-system incident finding, attacker attribution, product-security verdict, manipulation claim, public-authorization verdict, legitimacy finding, or inference of intent.

## Frozen reference state

```text
population                    1,000 retained participants
public family headline        A=80%, B=20%
reference-correct proposal    A1
current evidence packet       EVIDENCE-SET-V2
current semantic epoch        EPOCH-2
current trust anchor          TRUST-ROOT-V2
clean checkpoint              CHECKPOINT-CLEAN-V2
```

The public family headline remains 80/20 in every world, including the world where implementation is blocked and the world where the wrong A0 version remains active.

## Eight paths behind one headline

### Clean authenticated current evidence

The current evidence packet and retrieval context match their registered hashes, carry valid signatures from a trusted signer, belong to the current epoch, are authorized for the current run, preserve complete lineage, and pass integrity checks. The clean run selects A1 without recovery.

### Source spoofing contained before decision

A spoofed evidence packet has a registered content hash but fails signature and source-identity validation. The authenticity detector fires before a decision, the packet is quarantined with a forensic snapshot, and the clean V2 packet is replayed from the last-known-good checkpoint. A1 is selected without transient exposure or public correction.

```text
attack detected
→ quarantine
→ clean-source replay
→ A1
```

This is a qualified pre-decision containment path. It is not a rollback because no decision was committed.

### Poisoned source detected after implementation

A poisoned packet matches its registered hash and carries a valid trusted signature. The cryptographic checks therefore pass even though the content integrity is poisoned. A0 is committed and transiently implemented before a post-decision integrity signal fires.

The packet is quarantined, the compromised checkpoint is rolled back, the clean V2 packet is replayed deterministically, A1 is validated, and a correction and notification are issued.

```text
valid hash and signature
→ poisoned content
→ A0 committed and exposed
→ post-decision detection
→ quarantine and rollback
→ clean replay
→ A1 and correction
```

Recovery succeeds, but the transient exposure and bounded residual uncertainty remain first-class evidence.

### Retrieval or prompt injection recovery

The evidence packet remains clean. The assembled retrieval context is altered and is not authorized for the current decision even though its hash and signature are valid. A0 is committed, but implementation has not begun when context attestation detects the broken lineage.

The injected context is quarantined, the decision checkpoint is rolled back, the clean retrieval context is replayed, and A1 is published. Correction is required because a decision existed, while transient implementation exposure remains false.

### Hash-valid stale replay

The prior V1 packet matches its hash and carries a valid trusted signature. It is semantically stale, belongs to EPOCH-1, and is not authorized for EPOCH-2. Freshness validation blocks it before a decision.

The stale packet is quarantined and the current V2 evidence is replayed. This is the explicit control proving:

```text
cryptographic integrity
≠ semantic currency
```

### Compromised signer, revocation, and trust rotation

A packet matches its hash and carries a cryptographically valid signature. The signer credential is compromised, so signature validity does not confer authorization. A0 is committed and transiently implemented before the key-monitor alert arrives.

The signed object is quarantined, A0 is rolled back, the compromised signer is revoked, the trust anchor moves from V2 to V3, clean evidence is replayed under the recovery signer, and A1 is restored with correction and notification.

```text
valid signature
≠ uncompromised signer
≠ authorized content
```

### Detected attack without a clean recovery source

The evidence packet fails hash, signature, integrity, and lineage checks. The attack is detected and the forensic object is quarantined, but the clean source is unavailable. No replay is attempted, no proposal is selected, and implementation is blocked through explicit abstention.

```text
detection
≠ recovery

quarantine
≠ permission to continue
```

Safe abstention is a qualified terminal state rather than a failed product narrative or missing result.

### Silent undetected wrong-version activation

A compromised route supplies a packet whose hash and signature appear valid. No detector alert fires. No quarantine, rollback, replay, correction, or notification occurs. The public family headline remains 80/20 while the wrong A0 version is active.

This control preserves the boundary:

```text
no alert
≠ clean provenance
```

## Aggregate separations

```text
worlds                                                   8
distinct public headlines                               1
distinct final disposition classes                      3
distinct attack and recovery signatures                 8
clean executions                                        1
attack-present worlds                                   7
detected attacks                                        6
undetected attacks                                      1
pre-decision detections                                 3
post-decision detections                                3
pre-decision containment paths                         2
post-decision rollback paths                           3
successful clean replays                               5
detected but unrecoverable worlds                      1
safe abstention worlds                                 1
wrong-version-active worlds                            1
reference-correct final worlds                         6
cryptographically valid but provenance-invalid worlds  5
trust-anchor rotations                                 1
quarantines                                            6
forensic snapshots                                     6
rollbacks                                              3
corrections required                                   3
corrections issued                                     3
transient-exposure worlds                              3
residual-uncertainty worlds                            4
binding public-authority worlds                        0
```

## Cryptography, semantics, and trust are separate

The fixture separates several controls frequently collapsed into one verification badge:

```text
content hash
signature validity
signer trust
trust-anchor validity
semantic freshness
current-epoch authorization
content integrity
complete lineage
```

A hash proves equality with a registered byte sequence. It does not establish that the bytes are current, authorized, unpoisoned, or relevant to the present proposal and policy epoch. A signature proves that a credential produced a signature. It does not establish that the credential was uncompromised, that the signer retained authority, or that the signed content was permitted.

## Detection, containment, and recovery are separate transactions

PC-14 preserves the following ladder:

```text
attack or anomaly detected
→ affected object identified
→ object quarantined
→ forensic state preserved
→ committed decision rolled back where necessary
→ last-known-good state restored
→ clean inputs reconstructed
→ deterministic replay executed
→ replay result validated
→ correction and notification issued where necessary
→ residual uncertainty and consequence recorded
```

Each arrow is independently receipted. Detection alone does not establish quarantine. Quarantine does not establish rollback. Rollback does not establish clean replay. Replay does not establish validation, correction, or absence of prior consequence.

## Exact proposal and public headline

Every world publishes the same 80 percent A-family headline. The final exact state differs:

```text
A1 reference-correct and allowed
no proposal, blocked abstention
A0 wrong version active
```

Family-level stability therefore cannot prove exact proposal or implementation continuity.

## Real-case promotion boundary

A real provenance-recovery claim requires:

```text
artifact identity, bytes, content hash, and version
signature object, signer, credential, and trust-anchor state
semantic epoch, freshness, scope, and authorization
model, retrieval, prompt, tool, metric, and policy lineage
attack entry point, target, first affected object, and discovery state
detector identity, version, signal, timing, and confidence
quarantine scope and preserved forensic snapshot
last-known-good checkpoint and rollback receipt
clean-source availability and reconstruction method
replay input manifest, determinism, and output hash
replay validation and comparison receipt
signer revocation and trust-anchor rotation history
publication correction and affected-party notification
implementation exposure, rollback, and replacement consequence
residual uncertainty, abstention, or unresolved state
reopen, appeal, remedy, and authority state
```

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
baseline reference, artifact, trust, and runtime snapshot
→ attack entry and first affected artifact
→ hash, signature, trust, freshness, integrity, and lineage state
→ detector signal, timing, and confidence
→ quarantine scope and forensic snapshot
→ rollback, replay, validation, and trust succession
→ correction, notification, and implementation consequence
→ provenance-recovery classification
→ interpretation seal
```

Mutating the artifact bytes, hash state, signer, trust anchor, freshness, detector, quarantine, checkpoint, replay input, correction, final proposal, exposure, uncertainty, or classification breaks the chain.

## Run

```bash
node tools/compile-preference-provenance-recovery.mjs
node tools/validate-preference-provenance-recovery.mjs
node test/preference-provenance-recovery.test.js
```

Generated projections:

```text
build/research/preference-provenance-recovery.json
build/research/preference-provenance-recovery.md
```

## Publication boundary

The admissible laboratory statement is that one public 80 percent family headline can arise from a clean execution, pre-decision containment, several post-decision recovery paths, a detected but unrecoverable abstention, or a silent wrong-version outcome. A real recovery claim requires complete artifact, trust, freshness, detector, forensic, rollback, replay, correction, consequence, uncertainty, and authority custody.
