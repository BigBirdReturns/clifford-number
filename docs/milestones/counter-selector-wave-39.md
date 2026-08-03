# Counter-Selector Wave 39 — digest-selected restore and dependency replay

## Result

Wave 39 records the first bounded checkpoint control in which the destination request selects the checkpoint image by repository digest, after the source container and pod have been removed, and starts a restored successor in a new pod.

```text
repoDigest-selected checkpoint restore surfaces       1
repoDigest-selected successor-operation joins         1
new-pod successor-operation surfaces                  2
application-specific continuation surfaces            1
explicit external dependency-replay surfaces           1
checkpoint package-inspection surfaces                 1
registry push routes                                   1

public fixed checkpoint-digest receipts                0
registry round-trip restore receipts                    0
package-inventory recipient acknowledgments            0
hidden-predecessor-state-free surfaces                  0
clean-destination operation surfaces                    0
external independent reviews                           0
complete portable operational handoffs                 0
person supports / contacts / graph effects          0 / 0 / 0
adversarial mutations                                162
```

## Positive control

CRI-O's exact integration route performs:

```text
running source container
→ checkpoint archive
→ source container removed
→ source pod removed
→ checkpoint OCI image committed
→ image repoDigest resolved
→ new pod created with repoDigest as ImageSpec
→ restored container created
→ restored container started
```

Canonical classification:

```text
repo_digest_selected_checkpoint_image
restored_into_new_pod
with_external_dependency_state
```

## What moved

Wave 38 established content-addressed package-to-operation. Wave 39 moves the exact selector into the destination request. The runtime does not merely know that the image is content-addressed; the create request itself names the dynamically resolved repository digest.

CRI-O also preserves `RootfsImageRef` where available, preventing a later mutable tag from silently pulling a different base image.

## What remains open

The repoDigest test does not retain a literal checkpoint digest as a permanent public receipt, push or pull the image through a registry, prove a clean host, or assert application-specific output. The new pod remains in the same environment. The outer OCI graph does not itemize every checkpoint entry, and no recipient signs a complete operational inventory.

The separate archive test proves prior logs remain and new lines appear after restore. It also fails closed when required bind mounts are omitted and succeeds after they are re-declared. Those are real application and dependency-replay receipts, but they belong to a non-content-addressed archive variant and cannot be borrowed into the repoDigest control.

`checkpointctl` adds package inspection and a documented registry-push route. Its builder adds the archive as an image layer and extracts selected annotations; it does not produce a downstream restore receipt or recipient-acknowledged per-entry manifest.

## Current answer

```text
Did exact package selection reach the destination request?          Yes.

Was a repository digest used rather than only a tag?                Yes.

Is one literal checkpoint digest retained in the public receipt?    No.

Were the source container and source pod removed first?             Yes.

Was the successor created and started in a new pod?                 Yes.

Does new pod mean clean host or independent recipient?              No.

Is the base rootfs identity pinned when available?                  Yes.

Does that make the package self-contained?                          No.

Did one archive control preserve prior output and grow logs?        Yes.

Did missing bind mounts fail closed before replay?                  Yes.

Can those archive facts be borrowed into the digest control?        No.

Can checkpointctl inspect and build a registry-pushable image?      Yes.

Does that route include pushed-digest restore and operation?        No.

Has a complete portable operational handoff been found?             No.

Did any person gain support, contact, ranking, profile,
promotion, field-test eligibility, or graph effect?                 No.
```

## Next frontier

One fixed-digest checkpoint image must be pushed and acquired by a demonstrably clean destination, carry an itemized integrity-bound inventory of every package entry and external obligation, receive explicit recipient acknowledgment, demonstrate application-specific continuation from that exact digest with rollback or safe decline, and be reproduced by an external independent party.
