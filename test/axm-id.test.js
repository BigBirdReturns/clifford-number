import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACTIVE_IDENTITY_SCHEME,
  _internal,
  b32Id,
  canonicalizeGenesisV1,
  claimId,
  entityId,
  legacyB32Id,
  legacyClaimId,
  legacyEntityId
} from '../tools/lib/axm-id.mjs';

const vectors = JSON.parse(fs.readFileSync('data/project/axm-genesis-v1-identity-vectors.json', 'utf8'));
const migration = JSON.parse(fs.readFileSync('build/axm-identity-genesis-v1-migration.json', 'utf8'));

// Retired envelope remains exactly reproducible for predecessor resolution.
assert.equal(_internal.base32LowerNoPad(Buffer.from([])), '');
assert.equal(_internal.base32LowerNoPad(Buffer.from([0x00])), 'aa');
assert.equal(_internal.base32LowerNoPad(Buffer.from([0xff])), '74');
assert.equal(_internal.base32LowerNoPad(Buffer.from('foobar', 'utf8')), 'mzxw6ytboi');
assert.equal(b32Id, legacyB32Id);
assert.equal(legacyB32Id('e', 'ben warner'), 'e_k5ki4qe57qegkr37d7fmvlm3');
assert.equal(legacyEntityId('uk-ai-policy', 'Ben Warner'), 'e_cxoy37udrurtowdj47suemrw');
assert.equal(legacyEntityId('uk-ai-policy', 'ben warner'), legacyEntityId('uk-ai-policy', '  Ben Warner  '));
assert.equal(
  legacyClaimId('e_cxoy37udrurtowdj47suemrw', 'participates_in', 'e_tyfowx7pih45jemixgdnd35e', 'entity'),
  'c_iz2he7hy4hy2jlyc4dp4pcgs'
);

// Active functions reproduce the pinned Genesis v1 fixture.
for (const item of vectors.canonicalization.filter(item => Object.hasOwn(item, 'expected'))) {
  assert.equal(canonicalizeGenesisV1(item.input), item.expected);
}
for (const item of vectors.canonicalization.filter(item => Object.hasOwn(item, 'expected_error'))) {
  assert.throws(() => canonicalizeGenesisV1(item.input), /NUL/);
}
for (const item of vectors.entity_ids) {
  assert.equal(entityId(item.namespace, item.label), item.expected_id);
  assert.match(item.expected_id, /^e1_[a-z2-7]{52}$/);
}
for (const item of vectors.claim_ids) {
  assert.equal(claimId(item.subject, item.predicate, item.object, item.object_type), item.expected_id);
  assert.match(item.expected_id, /^c1_[a-z2-7]{52}$/);
}

const ben = migration.entity_migrations.find(item => item.local_id === 'ben-warner');
assert.ok(ben);
assert.equal(entityId(migration.namespace, ben.label), ben.genesis_v1_entity_id);
assert.equal(legacyEntityId(migration.namespace, ben.label), ben.legacy_provisional_entity_id);
assert.notEqual(ben.genesis_v1_entity_id, ben.legacy_provisional_entity_id);

const firstClaim = migration.claim_migrations[0];
assert.equal(
  claimId(firstClaim.genesis_v1_subject_id, firstClaim.predicate, firstClaim.genesis_v1_object_id, firstClaim.object_type),
  firstClaim.genesis_v1_claim_id
);
assert.equal(
  legacyClaimId(firstClaim.legacy_provisional_subject_id, firstClaim.predicate, firstClaim.legacy_provisional_object_id, firstClaim.object_type),
  firstClaim.legacy_provisional_claim_id
);

assert.equal(ACTIVE_IDENTITY_SCHEME.status, 'reconciled_genesis_v1');
assert.equal(ACTIVE_IDENTITY_SCHEME.external_commit, '411ef40e6cfc3ecb97ac3e256c8151be678347c8');
assert.equal(ACTIVE_IDENTITY_SCHEME.active_projection_migrated, true);
assert.equal(ACTIVE_IDENTITY_SCHEME.legacy_provisional_ids_resolvable, true);
assert.equal(ACTIVE_IDENTITY_SCHEME.cross_case_join_authorized, false);

console.log('axm-id.test: OK (Genesis v1 active; retired IDs reproducible)');
