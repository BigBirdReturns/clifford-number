# Counter-Selector cross-host registry method

## Purpose

Adjudicate one bounded Podman checkpoint-image route that joins registry push, different-system pull, and restore commands, one distinct cross-host checkpoint-archive procedure that demonstrates application state continuation, and one compatibility/refusal control, without combining package variants or converting documentation into an observed same-package registry handoff.

## Same-object rule

A completion component may be credited only when it belongs to the same package instance, destination, authority state, dependency inventory, successor operation, and review chain. Documentation, package variants, systems, recipients, and operations may not lend missing components to one another.

## Required component order

- `same_object_identity`
- `checkpoint_package_identity`
- `exact_package_selector`
- `package_content_addressing`
- `internal_inventory_and_entry_integrity`
- `outgoing_and_incoming_roles`
- `destination_boundary`
- `authority_and_credentials`
- `dependencies_and_access`
- `open_decisions_and_deadlines`
- `rollback_safe_decline_and_failure_containment`
- `recipient_or_successor_acknowledgment`
- `successor_operation_from_package`
- `independent_verification`

## Adjudicated controls

## CS-W40-RM-01 — same-system documented checkpoint-image registry migration route

**System:** Podman checkpoint image push, different-system pull, and restore route

**Classification:** `same_system_documented_checkpoint_image_registry_migration_route_without_observed_round_trip_or_application_receipt`

### Positive findings

- Podman defines a checkpoint OCI image that can use standard registry infrastructure.
- The same documented route includes checkpoint-image creation, push, different-system pull, and restore commands.
- OCI distribution permits manifest retrieval by digest or tag and preserves manifest bytes.
- Checkpoint-image annotations expose selected source-environment metadata.
- The destination command restores from the pulled checkpoint-image reference.

### Known limits

- No public receipt retains the literal checkpoint digest used by the destination restore.
- No observed push response, pull digest, or restore log joins the complete route.
- A different-system command is not evidence of a clean or fresh destination.
- The example does not observe application-specific continuation after the pulled image is restored.
- The OCI image graph is not an itemized inventory of every checkpoint file and external dependency.
- Registry login does not transfer or acknowledge complete authority and credential custody.
- No rollback or safe-decline operation is demonstrated.
- No named recipient acknowledges the package inventory.
- No external independent reproduction exists.
- The documented route cannot borrow the archive control's cross-host application output.

### Source custody

- `CS-W40-S01` — Podman, “Podman checkpoint image creation and different-system registry migration contract” (checkpoint_image_registry_migration_contract).
- `CS-W40-S02` — CRIU project, “Podman checkpoint-image registry push, pull, and restore command route” (concrete_registry_migration_command_route).
- `CS-W40-S03` — Podman, “Podman restore from checkpoint image contract” (checkpoint_image_restore_contract).
- `CS-W40-S04` — Open Container Initiative, “OCI Distribution Specification v1.1.1” (registry_push_pull_and_digest_reference_contract).
- `CS-W40-S05` — Open Container Initiative, “OCI content descriptor contract” (content_digest_and_size_binding_contract).

## CS-W40-RM-02 — cross-host checkpoint-archive application continuation

**System:** Red Hat Podman archive migration procedure

**Classification:** `cross_host_archive_application_continuation_with_external_base_image_dependency_without_content_addressed_registry_package`

### Positive findings

- The source and destination hosts are explicitly distinct.
- One exported archive is transferred and supplied to restore on the destination host.
- Application output advances from 0 and 1 before checkpoint to 2 after destination restore.
- The destination successor therefore continues state rather than restarting the counter at zero.
- A runtime mismatch is specified to abort rather than silently substitute an incompatible runtime.

### Known limits

- The archive is not selected by a public fixed digest.
- The procedure uses direct file transfer rather than a registry push and pull.
- The destination base image is an external dependency and may require separate transfer.
- Different host does not prove a clean or hidden-state-free destination.
- No itemized archive-entry inventory is acknowledged by a recipient.
- No authority, credential, access, or decision ledger accompanies the archive.
- Runtime refusal is not a complete rollback or safe-decline protocol.
- The operation receipt may not be borrowed into the checkpoint-image registry route.
- No external independent party reproduces the complete chain.
- No complete operational handoff is established.

### Source custody

- `CS-W40-S06` — Red Hat, “Container migration with Podman on RHEL” (cross_host_application_continuation_procedure).
- `CS-W40-S07` — Podman, “Podman checkpoint archive export contract” (cross_system_checkpoint_archive_contract).
- `CS-W40-S08` — Podman, “Podman checkpoint archive import and runtime compatibility refusal” (cross_host_archive_restore_and_runtime_refusal_contract).

## CS-W40-RM-03 — checkpoint compatibility metadata and fail-closed runtime boundary

**System:** Podman checkpoint annotations and restore compatibility controls

**Classification:** `checkpoint_compatibility_metadata_and_fail_closed_runtime_boundary_without_complete_dependency_inventory`

### Positive findings

- Checkpoint images expose selected source-container and host-environment metadata.
- Rootfs image identity is recorded for dependency reconstruction.
- Restore requires compatibility-sensitive options for TCP state and file locks.
- A runtime mismatch aborts rather than silently proceeding.
- The destination's need for the original base image is explicit.

### Known limits

- Selected annotations are not a complete dependency and access inventory.
- Runtime mismatch refusal does not prove all required compatibility checks.
- The original base image remains external to the checkpoint state package.
- No authority or credential ledger is carried.
- No package inventory is acknowledged by a recipient.
- No clean-destination receipt exists.
- No public fixed checkpoint digest receipt exists.
- No application continuation is independently observed in this control.
- No rollback or safe-decline protocol is complete.
- No external independent reproduction exists.

### Source custody

- `CS-W40-S09` — Podman, “Podman checkpoint-image source-environment annotations” (checkpoint_compatibility_metadata_contract).
- `CS-W40-S10` — Podman, “Podman fail-closed restore compatibility contract” (runtime_and_restore_option_refusal_contract).
- `CS-W40-S11` — Red Hat, “RHEL Podman destination-image and compatibility prerequisites” (destination_dependency_replay_contract).

## Non-combinability

```text
documented checkpoint-image push/pull/restore route
+ cross-host checkpoint-archive application continuation
+ compatibility metadata and fail-closed runtime refusal
≠ one observed fixed-digest clean-destination operational handoff
```

## Authority ceiling

This method authorizes no external contact, outside-human dependency, physical action, local-machine action, artifact transfer by the project owner, field test, person ranking, public identity profile, promotion, or graph effect. Missing external or physical evidence remains unproven and does not become a user task.

## Next action

Seek one fixed-digest checkpoint image that is actually pushed and acquired by a demonstrably clean destination, restores application-specific state from that exact digest, carries an integrity-bound inventory of internal entries and external dependencies, receives explicit recipient acknowledgment, supports rollback or safe decline, and is reproduced by an external independent party. Do not borrow the Podman archive output receipt into the registry-image route.
