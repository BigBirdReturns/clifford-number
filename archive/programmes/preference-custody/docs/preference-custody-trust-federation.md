# Cross-organizational trust federation, revocation, and recovery custody

PC-15 separates a public `recovered` label, vendor revocation, local rollback, clean replay, and reference-correct result from federation-wide propagation and consequence. The control holds the incident, public 80/20 A-family headline, claimed A1 proposal, clean replacement artifact, federation epoch, and six-organization topology constant while changing revocation delivery, acknowledgement, enforcement, cache state, authority, replay access, tenant coverage, notification, remedy, and residual exposure.

The fixture is synthetic. It creates no graph effect, thesis evidence, named-vendor failure, contractual-breach finding, security verdict, misconduct conclusion, public-authorization verdict, legitimacy finding, or inference of intent.

## Frozen federation

```text
ORG-VENDOR       artifact origin and signer authority
ORG-CLOUD        model, hosting, and artifact-serving provider
ORG-CUSTOMER     consequential decision and implementation owner
ORG-AUDITOR      independent validation and trust-list consumer
ORG-DOWNSTREAM   secondary tenant or integration customer
ORG-PUBLIC       affected-party notification, challenge, and remedy interface

public family headline          A=80%, B=20%
public incident status          recovered
reference-correct proposal      A1
clean replacement artifact      EVIDENCE-SET-V3
current federation epoch        FED-EPOCH-3
```

## Eight federation states behind one public claim

### Complete federated recovery

Every required organization receives and acknowledges the revocation. Every technical holder enforces it, moves to the current trust epoch, purges or replaces the compromised artifact, replays clean inputs, and passes validation. The affected-public interface receives complete notification and remedy coverage. Residual exposure is zero.

This is the fixture’s one complete recovery control.

### Vendor revocation with stale customer cache

The vendor, cloud, auditor, and downstream tenant recover. The customer receives the revocation but does not acknowledge or enforce it. Its stale cache retains the compromised artifact and remains active for 200 people.

```text
revocation delivered
≠ acknowledged
≠ enforced
≠ cache purged
```

### Customer recovery while the cloud route continues

The customer receives, enforces, and replays the clean artifact. The cloud route never receives the revocation and continues serving the compromised artifact to 150 people. A local recovery therefore does not establish upstream service recovery.

### Auditor trust-list lag

Operational holders move to the current artifact and trust epoch. The auditor’s trust-list update is delayed for six hours. It retains the compromised object and emits stale validation affecting 100 cases.

```text
operational recovery
≠ current validation estate
```

### Technical capability without contractual authority

The customer receives and acknowledges the revocation and has technical capability to stop, quarantine, and replay. Its contract does not authorize the stop. A0 remains active for 200 people.

```text
technical access
≠ contractual authority
```

### Technical recovery without notification or remedy

Every artifact holder recovers and validates the clean state. The public interface does not receive the incident notice, challenge route, or remedy. Residual technical exposure is zero, but federation recovery is incomplete because affected-party rights did not propagate.

### Source-restricted downstream abstention

The downstream organization receives, acknowledges, and enforces the revocation. It purges the compromised object but cannot access the clean replay inputs. It blocks service rather than inventing a successful replay.

Source restriction is a bounded evidence and availability state. Safe abstention is a valid terminal result.

### Primary tenant recovery with secondary-tenant exposure

The vendor, cloud, primary customer, and auditor recover. The revocation scope omits the secondary tenant. Its stale cache retains the compromised artifact and remains active for 100 people. The public notice and remedy cover only the primary population.

```text
primary-tenant recovery
≠ secondary-tenant recovery
```

## Aggregate separations

```text
worlds                                      8
distinct public headlines                  1
distinct public status signatures          1
distinct federation states                 8
complete federated recovery worlds         1
incomplete recovery worlds                 7
contradicted recovered claims              7
stale-cache worlds                         4
continued-serving worlds                   4
trust-list-lag worlds                      1
contractual-authority-gap worlds           1
notification-remedy-gap worlds             2
source-restricted abstention worlds        1
secondary-tenant-exposure worlds           1
full revocation delivery worlds            4
full acknowledgement worlds                3
full enforcement worlds                    3
technical-recovery-complete worlds         2
public-rights-complete worlds              6
residual-exposure worlds                   5
zero-residual incomplete worlds            2
reference-correct customer worlds          6
total residual exposure                  750
maximum single-world residual exposure   200
binding public-authority worlds            0
```

## Federation recovery is a joined transaction

A complete real recovery requires each organization to preserve its own state and the transitions connecting them:

```text
revocation issued
→ delivered to each required organization
→ acknowledged
→ enforced
→ trust epoch advanced
→ cache purged or replaced
→ compromised route stopped
→ clean inputs made available
→ replay completed
→ validation passed
→ service restarted or safely abstained
→ affected parties notified
→ challenge and remedy opened
→ residual exposure closed or preserved
```

One successful step cannot stand in for the entire transaction.

## Trust, cache, service, and authority are separate

The fixture preserves several states that are often collapsed into a single “revoked” or “recovered” label:

```text
message delivery
acknowledgement
enforcement
trust-list epoch
cache contents
artifact service state
technical authority
contractual authority
replay eligibility
validation result
implementation state
notification and remedy scope
```

A vendor can revoke while a customer cache remains stale. A customer can roll back while a cloud route continues. A trust list can update without purging a cache. A technical operator can have the ability but not the authority to stop implementation.

## Public recovered status and rights

The public label remains `recovered` in every world. Seven worlds still have an unresolved artifact, authority, tenant, availability, notification, remedy, or residual-exposure state.

```text
public recovered status
≠ federation-wide technical recovery
≠ complete notification
≠ complete remedy
≠ residual-exposure closure
```

## Real-case promotion boundary

A real federation-recovery claim requires:

```text
organization identity, role, jurisdiction, and contract
federation topology and artifact-distribution edges
incident and compromised-artifact identity
revocation issuer, scope, timestamp, version, and authority
revocation delivery and acknowledgement receipts
trust root, trust-list epoch, signer status, and cache inventory by organization
quarantine, rollback, replay, validation, and restart state by holder
clean-input access and source-restriction state
technical and contractual stop authority
primary, secondary, and multi-tenant coverage
notification, challenge, remedy, and acknowledgement state
residual exposure population and duration
cross-organizational correction and restart receipts
split-brain, abstention, and unresolved states
```

## Custody chain

Each world emits a SHA-256 hash-linked chain:

```text
federation topology, roles, trust, and reference snapshot
→ public recovered claim
→ revocation scope and restart receipts
→ organization trust, cache, authority, recovery, and rights states
→ delivery, acknowledgement, and enforcement resolution
→ technical replay, contract, notification, remedy, and tenant resolution
→ federation consequence
→ mechanism classification
→ interpretation seal
```

Mutating an organization, topology edge, scope, delivery, acknowledgement, enforcement, trust epoch, cache, authority, replay, validation, notification, remedy, residual exposure, consequence, or classification breaks the chain.

## Run

```bash
node tools/compile-preference-trust-federation.mjs
node tools/validate-preference-trust-federation.mjs
node test/preference-trust-federation.test.js
```

Generated projections:

```text
build/research/preference-trust-federation.json
build/research/preference-trust-federation.md
```

## Publication boundary

The admissible laboratory statement is that one public recovered status and 80 percent A-family headline can coexist with complete federation, stale caches, continued serving, trust-list lag, authority gaps, missing remedy, source-restricted abstention, or secondary-tenant exposure. A real federation-recovery claim requires complete organization, topology, trust, propagation, cache, replay, contract, rights, tenant, exposure, consequence, and authority custody.
