# Counter-Selector Wave 40 — cross-host registry migration and application continuation

## Result

Wave 40 records one bounded documented checkpoint-image registry migration route and one distinct cross-host checkpoint-archive application-continuation receipt. The route and receipt are separate package variants and do not combine into one completed handoff.

```text
documented checkpoint-image registry migration routes     1
registry push route surfaces                              1
different-system pull surfaces                            1
restore-from-pulled-image surfaces                        1
cross-host archive application continuations              1
runtime-mismatch refusal surfaces                         2

observed registry round-trip receipts                     0
public fixed checkpoint-digest receipts                   0
clean-destination operation surfaces                      0
package-inventory recipient acknowledgments               0
complete portable operational handoffs                    0
person supports / contacts / graph effects            0 / 0 / 0
adversarial mutations                                    329
exact-contract tamper cases                               8
```

## Documented registry route

The checkpoint-image control documents this route:

```text
source container checkpointed into OCI image
→ image pushed to registry
→ image pulled on a different system
→ restore requested from pulled image
```

This is a documented route, not an observed round-trip receipt. No literal fixed digest is retained as the public checkpoint receipt, and no application-specific output is asserted from the pulled image.

## Cross-host archive continuation

The separate archive control observes application state on the source host, transfers a checkpoint archive to another host, restores it there, and observes the next application state. The destination still requires the original base image separately. This is real cross-host application continuation, but it is not the registry checkpoint-image variant.

## Compatibility boundary

Checkpoint metadata records runtime compatibility information, and restore refuses materially incompatible runtime state unless explicit override is used. That fail-closed boundary does not amount to a complete dependency inventory or rollback receipt.

## Current answer

```text
Is a checkpoint-image registry migration route documented?       yes
Was the registry round trip observed in one receipt?              no
Was application continuation observed across hosts?               yes
Was that continuation from the registry image variant?            no
Is a clean destination proved?                                    no
Is a literal public fixed checkpoint digest retained?             no
Did a recipient acknowledge an itemized package inventory?        no
Has a complete portable operational handoff been found?           no
Did any person gain support, contact, ranking, or graph effect?    no
```

## Next frontier

Seek one fixed-digest checkpoint image that is actually pushed and acquired by a demonstrably clean destination, restores application-specific state from that exact digest, carries an integrity-bound inventory of internal entries and external dependencies, receives explicit recipient acknowledgment, supports rollback or safe decline, and is reproduced by an external independent party. Do not borrow the Podman archive output receipt into the registry-image route.
