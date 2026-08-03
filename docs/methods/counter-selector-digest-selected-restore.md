# Counter-Selector method: digest-selected checkpoint restore

## Question

When does a checkpoint package become an operational handoff rather than merely an inspectable archive, a content-addressed image, or a successful restore?

Wave 39 isolates a narrower transition than Wave 38:

```text
checkpoint package exists
→ exact repository digest is selected by the destination request
→ source container and pod are gone
→ a successor is created and started in a new pod
```

That is a real package-selection-to-operation join. It is not yet a complete portable operational handoff.

## Exact selector gate

The positive control must show all of the following on one package instance:

1. the source workload is checkpointed;
2. the source container and source pod are removed;
3. one OCI checkpoint image is committed;
4. the runtime resolves the image to a repository digest;
5. the destination request uses that digest as its image selector;
6. a new pod is created;
7. the restored successor is created and started.

A tag-only request does not clear the exact-selector gate. A runtime-computed digest clears selection custody but does not create a fixed public digest receipt unless the literal value is retained.

## Dependency replay gate

A portable handoff must distinguish package contents from destination obligations. CRI-O exposes one useful refusal rule:

```text
checkpoint expects host bind mounts
+
destination create request omits them
→ restore creation fails
```

Re-declaring those host paths makes the dependency visible. It does not move the paths, credentials, content, or authority into the package.

Likewise, preserving `RootfsImageRef` prevents a changed mutable tag from silently selecting a different base image. It still leaves the rootfs image as an external dependency.

## Inspection and transport route

`checkpointctl show` and `inspect` expose operational checkpoint structure, including container identity, source image, runtime, network, process tree, memory, and rootfs-diff information. `checkpointctl build` adds the archive to a scratch image, copies selected checkpoint metadata into annotations, commits the image, and documents a `buildah push` route.

This advances inspectability and transport readiness. It does not establish:

```text
one per-entry digest and semantic-role inventory
one retained pushed digest
one receiving runtime
one restore from the pushed instance
one recipient inventory acknowledgment
one successor operation receipt
```

## Non-combinability

```text
CRI-O repoDigest-selected new-pod start
+
CRI-O archive log continuation and mount replay
+
checkpointctl inspection and registry push route
+
Podman content-addressed operation
+
E2B same-PID continuity
+
Cargo portable proof
≠
one complete portable operational handoff
```

The digest control does not inherit application-output assertions from the archive control. The archive control does not inherit content addressing from the OCI image. The checkpointctl route does not inherit a downstream restore from CRI-O. Parent-wave controls do not supply missing components to a new package instance.

## Complete-hand-off requirement

A complete positive must join one fixed package digest to:

```text
complete per-entry operational inventory
recipient acknowledgment
rootfs, runtime, kernel, cgroup, network, storage, volume, mount,
credential, authority, decision, deadline, and rollback custody
clean-destination acquisition
application-specific successor operation
registry transport when claimed
external independent reproduction
```

## Authority ceiling

No control in this wave authorizes contact, collaboration, field testing, promotion, ranking, public identity profiling, person support, or graph effects. Missing external reproduction remains an evidence absence, not a task assigned to the project owner.
