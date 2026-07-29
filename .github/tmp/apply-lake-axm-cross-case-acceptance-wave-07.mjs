#!/usr/bin/env node
import fs from 'node:fs';

const changedPaths = new Set();

function replaceSection(file, startMarker, endMarker, replacement) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${file}: missing Wave 07 start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${file}: missing Wave 07 end marker ${JSON.stringify(endMarker)}`);
  fs.writeFileSync(file, `${source.slice(0, start)}${replacement}${source.slice(end)}`);
  changedPaths.add(file);
}

replaceSection(
  'BUILD-INSTRUCTIONS.md',
  '2.1 **AXM identity reconciliation — completed 2026-07-29.**',
  '2.2 **Surface-type audit for density.**',
  `2.1 **AXM identity and bounded cross-case resolution — completed 2026-07-29.**
The repository pins \`BigBirdReturns/axm-genesis\` commit
\`411ef40e6cfc3ecb97ac3e256c8151be678347c8\`, preserves the exact Genesis v1
identity fixture at \`data/project/axm-genesis-v1-identity-vectors.json\`, and
records identical Python/Node runtime output in
\`data/project/axm-genesis-v1-runtime-attestation.json\`. The active
\`build/axm-identity.json\` projection uses full-digest, versioned \`e1_\`/\`c1_\`
IDs, and every retired \`e_\`/\`c_\` token remains a resolvable predecessor in
\`data/project/lake-axm-active-identity-registry-wave-06.jsonl\`.

The synthetic multi-case fixture in
\`data/project/lake-axm-cross-case-acceptance-wave-07-fixture.json\` authorizes
one narrower lane: **explicit, source-custodied, graph-inert cross-case identity
resolution**. A conforming bridge requires source custody on both local records,
a separately custodied same-entity assertion, the same identity namespace, and
an unambiguous overlap between canonical or declared-alias AXM tokens. Accepted
and rejected decisions travel together in
\`data/project/lake-axm-cross-case-join-registry-wave-07.jsonl\`.

Automatic same-label joins remain prohibited. Different namespaces do not join.
Ambiguous aliases and missing custody are rejected. An accepted bridge does not
merge source entities, create a relationship, enter the hop graph, or authorize
a cross-case graph edge. The broad active-projection
\`cross_case_join_authorized\` flag therefore remains \`false\`; the authorized
scope is exactly
\`explicit_source_custodied_graph_inert_identity_resolution_only\`.

`
);

replaceSection(
  'README.md',
  '## Temporal identity layer (AXM Genesis v1)',
  '## Estate frontier and game trails',
  `## Temporal identity layer (AXM Genesis v1)

\`tools/lib/axm-id.mjs\` delegates active identity to the commit-pinned AXM Genesis v1 rules: NFC normalization, ASCII-only lowering, frozen whitespace handling, NUL-separated preimages, full 32-byte SHA-256 digests, and versioned \`e1_\` / \`c1_\` prefixes. The cross-runtime fixture and attestation are committed under \`data/project/\`; the exact 176-entity and 164-claim predecessor map is in \`build/axm-identity-genesis-v1-migration.json\`.

\`tools/lib/axm-identity.mjs\` materializes the reconciled active projection in \`build/axm-identity.json\`:

- **Entities.** Every canonical actor, organization, and surface carries a current Genesis v1 \`axm_entity_id\`, plus its retired \`legacy_provisional_entity_id\`. Current and legacy alias-derived IDs remain attached to the same local registry object.
- **Time-qualified claims.** Each participation pair carries a current \`c1_\` claim and a retired \`legacy_provisional_claim_id\`. Temporal windows, roles, evidence classes, receipts, local IDs, and hop semantics are unchanged.
- **Append-preserving migration.** \`data/project/lake-axm-active-identity-registry-wave-06.jsonl\` records every one-to-one predecessor/successor transition. Old IDs resolve; they do not remain current and do not merge entities.

### Explicit cross-case identity resolution

\`tools/lib/axm-cross-case-join.mjs\` implements one graph-inert resolution lane proved by the Wave 07 synthetic fixture. A bridge is accepted only when both local records carry source custody, a separate same-entity assertion carries its own custody, both records use the same identity namespace, and their canonical or declared-alias token overlap is unambiguous. The complete accepted/rejected decision ledger is \`data/project/lake-axm-cross-case-join-registry-wave-07.jsonl\`.

This lane does not create a graph edge or hop, does not merge source entities, and does not treat matching labels as proof. Automatic same-label joins, different-namespace joins, ambiguous aliases, missing-custody assertions, cross-case graph joins, and cross-case hop creation remain prohibited. The broad active projection flag remains \`cross_case_join_authorized: false\`; the accepted scope is \`explicit_source_custodied_graph_inert_identity_resolution_only\`.

\`query:hops --from\` / \`--to\` accept local IDs, current Genesis IDs, and retired predecessor IDs:

\`\`\`bash
npm run query:hops -- --from e1_36m7cjmqzlwdou4gr37cqy7jnckjsr6behzpbfmp7zphwzfynx7a  # Dr. Ben Warner
npm run query:hops -- --from e_gkmzucjlt7bu6i3s2nmqddmm                              # retired predecessor
\`\`\`

`
);

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  'data/project/lake-axm-cross-case-acceptance-wave-07-fixture.json',
  'data/project/lake-axm-cross-case-join-registry-wave-07.jsonl',
  'data/project/lake-axm-cross-case-acceptance-wave-07.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  'build/lake-actions/axm-cross-case-acceptance-wave-07.json',
  'build/lake-actions/axm-cross-case-acceptance-wave-07-reconciliation.json',
  'reports/lake-axm-cross-case-acceptance-wave-07.md',
  'reports/lake-axm-cross-case-acceptance-wave-07-reconciliation.md',
  '.github/tmp/lake-axm-cross-case-acceptance-wave-07-trigger.json',
  '.github/tmp/apply-lake-axm-cross-case-acceptance-wave-07.mjs',
  '.github/tmp/lake-axm-cross-case-acceptance-wave-07-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
lakePolicy.boundaries.axm_cross_case_fixture_proves_real_world_identity = false;
lakePolicy.boundaries.axm_explicit_identity_resolution_creates_graph_relation = false;
lakePolicy.boundaries.axm_automatic_same_label_join_authorized = false;
fs.writeFileSync(lakePolicyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);
changedPaths.add(lakePolicyPath);

changedPaths.add('.github/tmp/lake-axm-cross-case-acceptance-wave-07-source-paths.json');
fs.writeFileSync('.github/tmp/lake-axm-cross-case-acceptance-wave-07-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-axm-cross-case-acceptance-wave-07-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 07 documentation and lake policy carrier applied: ${changedPaths.size} paths`);
