# Counter-Selector Wave 38 — package-to-operation join

## Result

Wave 38 records the first bounded same-object control that joins a content-addressed portable checkpoint package to observed successor operation.

```text
content-addressed checkpoint-image surfaces       1
content-addressed package→operation joins         1
same-object successor-operation surfaces          3
application-specific continuation surfaces        2
package inventory recipient acknowledgments       0
hidden-predecessor-state-free surfaces             0
external independent reviews                       0
complete portable operational handoffs             0
complete direct person handoffs                     0
person supports / contacts / graph effects      0 / 0 / 0
adversarial mutations                            162
```

## Positive control

Podman creates one OCI checkpoint image whose configuration and layer are content-addressed by the OCI manifest. The source container is removed. The restore path imports the image and creates a running successor under the original name and ID constraints.

Canonical classification:

```text
content_addressed_oci_checkpoint_image
with_restored_successor_operation
and_hidden_base_image_dependency
```

## Why the complete gate remains open

The package lacks an itemized internal operational manifest and recipient inventory acknowledgment. Import can continue past unavailable copied entries, restore initially checks only for CRIU `inventory.img`, and the destination pulls the original rootfs image if absent. Runtime, CRIU, kernel, cgroup, network, storage, volume, authority, credential, decision, and rollback state is not one acknowledged package inventory.

The exact OCI-image test observes running state but not application-specific output. The separate export/import test observes service response, output growth, and volume transfer, but that stronger receipt belongs to a non-content-addressed tar archive. Cross-variant borrowing is forbidden.

## Current answer

```text
Did the package→operation gate move?                         Yes.

Does one same object now join a content-addressed
portable checkpoint image to successor operation?           Yes — Podman.

Was the source container removed before restore?             Yes.

Does the OCI manifest bind the outer package bytes?          Yes.

Does it itemize every internal operational entry?            No.

Did the recipient acknowledge an exact inventory?            No.

Is the destination free of hidden predecessor state?         No — the base rootfs
                                                              image is pulled or
                                                              otherwise required.

Does the exact OCI-image receipt prove application-
specific continuation?                                       No — running state only.

Does a separate Podman archive receipt prove service,
output, and volume continuation?                              Yes.

Can that archive receipt be borrowed into the OCI image?     No.

Has a complete portable operational handoff been found?      No.

Did any person gain support, contact authority, ranking,
profile, promotion, or graph effect?                          No.
```

## Next frontier

One exact checkpoint package must carry or integrity-bind every operational entry and dependency, receive an exact inventory acknowledgment, restore from a clean destination without hidden predecessor state, demonstrate application-specific continuation and rollback or safe decline, and be reproduced by an external independent verifier.

<!-- current-main integration qualification pulse; removed in the next commit -->
