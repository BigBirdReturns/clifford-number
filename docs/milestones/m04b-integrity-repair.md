# M-04B integrity repair receipt

This change replaces the failed transport-dependent M-04B implementation with a canonical-source-first program.

## Closed seams

- required inputs are committed and available in a clean checkout;
- entity organ and estate keys have one canonical schema;
- all top-level, packet, estate, and evidence boundaries share the same constitutional flags;
- source routes have explicit locator states and no generic placeholder URL;
- positional, modulo, round-robin, and count-balancing assignment is prohibited;
- all 15 lineage and theater packets without source-selected targets remain explicitly unresolved;
- all 24 estate packets are unranked and derive only from the explicit registry;
- nine opened-source observations are attached bidirectionally to 27 packets;
- generated products are rebuilt and byte-compared for deterministic drift;
- issue mutation occurs only after validation on a push to `main`.

The repair changes infrastructure and research custody. It does not promote any organism proposition.

## Live-dispatch hardening

The dispatcher is internally restricted to a GitHub Actions `push` on `refs/heads/main`; workflow configuration is not the sole write barrier. API writes are serialized with retry and backoff. Existing v1 issue markers and estate-handoff markers are migrated in place, and ambiguous duplicate current/legacy markers fail closed rather than producing another lane.

## Final acceptance target

The merge candidate carries source fingerprint `750a64c1de3c8b17b299ab251374338563e74f3a57ac0b66fda186b938e49e42`, 121 bounded packets, 61 issue groups, 24 estate handoffs, 82 source routes, and nine source-bounded evidence records. It contains no temporary M-04B or lineage carrier. Live mutation remains downstream of exact-head validation after merge to `main`.
