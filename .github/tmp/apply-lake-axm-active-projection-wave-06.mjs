#!/usr/bin/env node
import fs from 'node:fs';

const changedPaths = new Set();

function replaceSection(file, startMarker, endMarker, replacement) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${file}: missing Wave 06 start marker ${JSON.stringify(startMarker)}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${file}: missing Wave 06 end marker ${JSON.stringify(endMarker)}`);
  const duplicate = source.indexOf(startMarker, start + startMarker.length);
  if (duplicate >= 0 && duplicate < end) throw new Error(`${file}: duplicate Wave 06 start marker before end marker`);
  fs.writeFileSync(file, `${source.slice(0, start)}${replacement}${source.slice(end)}`);
  changedPaths.add(file);
}

replaceSection(
  'tools/validate-release.mjs',
  '// Temporal identity layer (provisional AXM ids).',
  '// Full-database migration is required, not optional.',
  `// Temporal identity layer (AXM Genesis v1 active projection). Recompute the
// complete layer from canonical sources, require exact agreement, preserve the
// retired IDs as predecessor aliases, and keep cross-case joins disabled until
// a separate multi-case join acceptance test authorizes them.
{
  const identity = readJson('build/axm-identity.json');
  assert(identity.scheme?.status === 'reconciled_genesis_v1', 'axm-identity scheme.status must be reconciled_genesis_v1');
  assert(identity.scheme?.version === 'axm-genesis-v1', 'axm-identity scheme.version must be axm-genesis-v1');
  assert(identity.scheme?.external_commit === '411ef40e6cfc3ecb97ac3e256c8151be678347c8', 'axm-identity Genesis commit pin drift');
  assert(identity.scheme?.active_projection_migrated === true, 'axm-identity active migration marker missing');
  assert(identity.scheme?.legacy_provisional_ids_resolvable === true, 'axm-identity legacy resolver marker missing');
  assert(identity.scheme?.active_projection_quarantined === false, 'migrated axm-identity must not remain quarantined');
  assert(identity.scheme?.external_axm_gate_complete === true, 'external AXM reconciliation gate must be complete');
  assert(identity.scheme?.cross_case_join_authorized === false, 'cross-case joins remain disabled pending multi-case acceptance');
  assert(identity.scheme?.namespace === readJson('cases.json').default_case_id, \`axm-identity namespace \${identity.scheme?.namespace} does not match the default case id\`);
  const recomputed = buildIdentityLayer({
    namespace: readJson('cases.json').default_case_id,
    actors: data.actors,
    organizations: data.organizations,
    surfaces: data.surfaces,
    participation: data.participation,
    aliases: data.aliases,
  });
  assert(JSON.stringify({ scheme: identity.scheme, entities: identity.entities, claims: identity.claims }) === JSON.stringify(recomputed),
    'build/axm-identity.json does not match the Genesis v1 identity layer recomputed from the ledger — rebuild (npm run build:hops)');

  const entityByLocal = new Map(identity.entities.map(entity => [entity.local_id, entity]));
  const currentEntityTokens = new Set();
  const legacyEntityTokens = new Set();
  for (const entity of identity.entities) {
    assert(/^e1_[a-z2-7]{52}$/.test(entity.axm_entity_id), \`entity \${entity.local_id} has malformed Genesis id \${entity.axm_entity_id}\`);
    assert(/^e_[a-z2-7]{24}$/.test(entity.legacy_provisional_entity_id), \`entity \${entity.local_id} has malformed legacy id \${entity.legacy_provisional_entity_id}\`);
    assert(entity.axm_entity_id !== entity.legacy_provisional_entity_id, \`entity \${entity.local_id} did not migrate\`);
    for (const token of [entity.axm_entity_id, ...(entity.alias_axm_ids ?? [])]) {
      assert(/^e1_[a-z2-7]{52}$/.test(token), \`entity \${entity.local_id} has malformed Genesis alias \${token}\`);
      assert(!currentEntityTokens.has(token), \`duplicate Genesis entity token \${token}\`);
      currentEntityTokens.add(token);
    }
    for (const token of [entity.legacy_provisional_entity_id, ...(entity.legacy_provisional_alias_ids ?? [])]) {
      assert(/^e_[a-z2-7]{24}$/.test(token), \`entity \${entity.local_id} has malformed legacy alias \${token}\`);
      assert(!legacyEntityTokens.has(token), \`duplicate legacy entity token \${token}\`);
      legacyEntityTokens.add(token);
    }
  }

  const currentClaims = new Set();
  const legacyClaims = new Set();
  for (const claim of identity.claims) {
    assert(/^c1_[a-z2-7]{52}$/.test(claim.claim_id), \`claim \${claim.claim_id} is malformed\`);
    assert(/^c_[a-z2-7]{24}$/.test(claim.legacy_provisional_claim_id), \`claim \${claim.claim_id} has malformed legacy predecessor\`);
    assert(claim.claim_id !== claim.legacy_provisional_claim_id, \`claim \${claim.claim_id} did not migrate\`);
    assert(!currentClaims.has(claim.claim_id), \`duplicate Genesis claim \${claim.claim_id}\`);
    assert(!legacyClaims.has(claim.legacy_provisional_claim_id), \`duplicate legacy claim predecessor \${claim.legacy_provisional_claim_id}\`);
    currentClaims.add(claim.claim_id);
    legacyClaims.add(claim.legacy_provisional_claim_id);
    const subject = entityByLocal.get(claim.subj_local_id);
    const object = entityByLocal.get(claim.obj_local_id);
    assert(subject && object, \`claim \${claim.claim_id} lacks migrated endpoint entities\`);
    assert(claim.subj === subject?.axm_entity_id && claim.obj === object?.axm_entity_id, \`claim \${claim.claim_id} current endpoints drift\`);
    assert(claim.legacy_provisional_subj === subject?.legacy_provisional_entity_id && claim.legacy_provisional_obj === object?.legacy_provisional_entity_id,
      \`claim \${claim.claim_id} legacy endpoints drift\`);
    assert(claim.windows.length > 0, \`claim \${claim.claim_id} carries no temporal windows\`);
    for (const window of claim.windows) {
      assert(window.dated === Boolean(window.valid_from || window.valid_until), \`claim \${claim.claim_id} window dated flag disagrees with its bounds\`);
    }
  }
  const pairs = new Set(identity.claims.map(claim => \`\${claim.subj}||\${claim.obj}\`));
  assert(pairs.size === identity.claims.length, 'duplicate (subj, obj) participates_in claims — stints must be windows on one claim');
}

`
);

replaceSection(
  'BUILD-INSTRUCTIONS.md',
  '2.1 **AXM identity reconciliation.**',
  '2.2 **Surface-type audit for density.**',
  `2.1 **AXM identity reconciliation — completed 2026-07-29.** The repository
pins \`BigBirdReturns/axm-genesis\` commit
\`411ef40e6cfc3ecb97ac3e256c8151be678347c8\`, preserves the exact Genesis v1
identity fixture at \`data/project/axm-genesis-v1-identity-vectors.json\`, and
records identical Python/Node runtime output in
\`data/project/axm-genesis-v1-runtime-attestation.json\`. The active
\`build/axm-identity.json\` projection now uses full-digest, versioned
\`e1_\`/\`c1_\` IDs. Every retired \`e_\`/\`c_\` token remains an explicit,
resolvable predecessor in
\`data/project/lake-axm-active-identity-registry-wave-06.jsonl\`. This closes
the external reproducibility and active-migration gate; it does **not** prove
real-world identity. Cross-case joins remain disabled until a separate
multi-case acceptance fixture proves namespace, alias, and claim behavior
without changing any source evidence or graph semantics.

`
);

replaceSection(
  'README.md',
  '## Temporal identity layer (provisional)',
  '## Estate frontier and game trails',
  `## Temporal identity layer (AXM Genesis v1)

\`tools/lib/axm-id.mjs\` now delegates active identity to the commit-pinned AXM Genesis v1 rules: NFC normalization, ASCII-only lowering, frozen whitespace handling, NUL-separated preimages, full 32-byte SHA-256 digests, and versioned \`e1_\` / \`c1_\` prefixes. The cross-runtime fixture and attestation are committed under \`data/project/\`; the exact 176-entity and 164-claim predecessor map is in \`build/axm-identity-genesis-v1-migration.json\`.

\`tools/lib/axm-identity.mjs\` materializes the reconciled active projection in \`build/axm-identity.json\`:

- **Entities.** Every canonical actor, organization, and surface carries a current Genesis v1 \`axm_entity_id\`, plus its retired \`legacy_provisional_entity_id\`. Current and legacy alias-derived IDs remain attached to the same local registry object.
- **Time-qualified claims.** Each participation pair carries a current \`c1_\` claim and a retired \`legacy_provisional_claim_id\`. Temporal windows, roles, evidence classes, receipts, local IDs, and hop semantics are unchanged.
- **Append-preserving migration.** \`data/project/lake-axm-active-identity-registry-wave-06.jsonl\` records every one-to-one predecessor/successor transition. Old IDs resolve; they do not remain current and do not merge entities.
- **Honesty markers.** The external AXM gate is complete and the active projection is no longer quarantined. Real-world identity is still not inferred from matching labels, and cross-case joins remain disabled pending a separate multi-case acceptance fixture.

\`query:hops --from\` / \`--to\` accept local IDs, current Genesis IDs, and retired predecessor IDs:

\`\`\`bash
npm run query:hops -- --from e1_36m7cjmqzlwdou4gr37cqy7jnckjsr6behzpbfmp7zphwzfynx7a  # Dr. Ben Warner
npm run query:hops -- --from e_gkmzucjlt7bu6i3s2nmqddmm                              # retired predecessor
\`\`\`

`
);

replaceSection(
  'tools/query-hops.mjs',
  '// --from/--to also accept a provisional AXM entity id',
  "import { readJson } from './lib/ledger.mjs';",
  `// --from/--to also accept a current AXM Genesis v1 entity id (e1_…) or a
// retired provisional predecessor (e_…). Both resolve to the local registry
// actor before traversal; only the e1_ identifier remains current.
`
);

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  'data/project/lake-axm-active-identity-registry-wave-06.jsonl',
  'data/project/lake-axm-active-projection-wave-06.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  'build/lake-actions/axm-active-projection-wave-06.json',
  'build/lake-actions/axm-active-projection-wave-06-reconciliation.json',
  'reports/lake-axm-active-projection-wave-06.md',
  'reports/lake-axm-active-projection-wave-06-reconciliation.md',
  '.github/tmp/lake-axm-active-projection-wave-06-trigger.json',
  '.github/tmp/apply-lake-axm-active-projection-wave-06.mjs',
  '.github/tmp/lake-axm-active-projection-wave-06-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
lakePolicy.boundaries.axm_active_projection_migration_proves_entity_identity = false;
lakePolicy.boundaries.axm_genesis_identifier_authorizes_cross_case_join = false;
fs.writeFileSync(lakePolicyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);
changedPaths.add(lakePolicyPath);

fs.writeFileSync('.github/tmp/lake-axm-active-projection-wave-06-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-axm-active-projection-wave-06-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 06 active-projection carrier applied: ${changedPaths.size} checked source paths`);
