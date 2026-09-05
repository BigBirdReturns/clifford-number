import assert from 'node:assert/strict';
import { buildIdentityLayer, resolveLocalId, PARTICIPATES_IN } from '../tools/lib/axm-identity.mjs';
import { entityId, claimId, legacyEntityId } from '../tools/lib/axm-id.mjs';

const fixture = () => ({
  namespace: 'test-case',
  actors: [
    { id: 'ada', label: 'Ada Lovelace' },
    { id: 'charles', label: 'Charles Babbage' },
  ],
  organizations: [{ id: 'rs', label: 'Royal Society' }],
  surfaces: [
    { surface_id: 'engine-委', surface_label: 'Analytical Engine Committee' },
    { surface_id: 'salon', surface_label: 'Somerville Salon' },
  ],
  participation: [
    { surface_id: 'engine-委', participant_type: 'actor', actor_id: 'ada', role: 'translator', time_start: '1842', time_end: '1843', evidence_class: 'official', receipt_ids: ['r1'] },
    { surface_id: 'engine-委', participant_type: 'actor', actor_id: 'charles', time_start: '1837', time_end: '1843-10', receipt_ids: ['r2'] },
    { surface_id: 'engine-委', participant_type: 'organization', organization_id: 'rs', receipt_ids: ['r3'] },
    // second stint of the same participant on the same surface
    { surface_id: 'salon', participant_type: 'actor', actor_id: 'ada', time_start: '1833', time_end: '1834', receipt_ids: ['r4'] },
    { surface_id: 'salon', participant_type: 'actor', actor_id: 'ada', time_start: '1839', receipt_ids: ['r5'] },
  ],
  aliases: [
    { alias: 'Countess of Lovelace', canonical_id: 'ada', kind: 'actor' },
    { alias: 'ada lovelace', canonical_id: 'ada', kind: 'actor' }, // derives the canonical id itself
    { alias: 'Unknown Person', canonical_id: 'not-in-registry', kind: 'actor' },
  ],
});

const layer = buildIdentityLayer(fixture());

// Deterministic: same ledger, same layer, byte for byte.
assert.deepEqual(layer, buildIdentityLayer(fixture()), 'identity layer must be deterministic');

// Reconciliation state travels with the artifact.
assert.equal(layer.scheme.status, 'reconciled');
assert.equal(layer.scheme.namespace, 'test-case');

// Entities cover actors, organizations, and surfaces, ids composed exactly
// from the vendored envelope.
assert.equal(layer.entities.length, 5);
const ada = layer.entities.find(e => e.local_id === 'ada');
assert.equal(ada.axm_entity_id, entityId('test-case', 'Ada Lovelace'));
assert.equal(ada.kind, 'actor');

// Alias-derived ids attach to the canonical entity; an alias equal to the
// label adds nothing; an alias with no registry entry is skipped.
assert.deepEqual(ada.alias_axm_ids, [entityId('test-case', 'Countess of Lovelace')]);

// Participation becomes time-qualified claims: one claim per (subj, obj),
// stints as windows, windows sorted by valid_from.
const salonClaim = layer.claims.find(c => c.subj_local_id === 'ada' && c.obj_local_id === 'salon');
assert.equal(salonClaim.claim_id, claimId(ada.axm_entity_id, PARTICIPATES_IN, entityId('test-case', 'Somerville Salon'), 'entity'));
assert.equal(salonClaim.windows.length, 2, 'two stints must be two windows on one claim');
assert.deepEqual(salonClaim.windows.map(w => w.valid_from), ['1833-01-01', '1839-01-01']);
assert.deepEqual(salonClaim.windows.map(w => w.valid_until), ['1834-12-31', null]);
assert.ok(salonClaim.windows.every(w => w.dated));

// Claim identity is time-stable: changing a window must not change the claim id.
const shifted = fixture();
shifted.participation[0].time_start = '1840';
const shiftedLayer = buildIdentityLayer(shifted);
const engineClaim = l => l.claims.find(c => c.subj_local_id === 'ada' && c.obj_local_id === 'engine-委');
assert.equal(engineClaim(layer).claim_id, engineClaim(shiftedLayer).claim_id, 'claim id must not depend on temporal windows');
assert.notEqual(engineClaim(layer).windows[0].valid_from, engineClaim(shiftedLayer).windows[0].valid_from);

// An undated participation is dated:false with open bounds — "we do not know
// when", preserved rather than invented.
const rsClaim = layer.claims.find(c => c.subj_local_id === 'rs');
assert.deepEqual(rsClaim.windows, [{ valid_from: null, valid_until: null, dated: false, role: null, evidence_class: null, receipt_ids: ['r3'] }]);

// Label collisions (case/whitespace-insensitive) are a data error, not a merge.
const clash = fixture();
clash.organizations.push({ id: 'ada-org', label: '  ADA LOVELACE ' });
assert.throws(() => buildIdentityLayer(clash), /collision/);

// resolveLocalId: local ids pass through; canonical and alias-derived AXM ids
// resolve; unknown AXM ids pass through untouched.
assert.equal(resolveLocalId(layer, 'ada'), 'ada');
assert.equal(resolveLocalId(layer, ada.axm_entity_id), 'ada');
assert.equal(resolveLocalId(layer, entityId('test-case', 'Countess of Lovelace')), 'ada');
assert.equal(resolveLocalId(layer, 'e_aaaaaaaaaaaaaaaaaaaaaaaa'), 'e_aaaaaaaaaaaaaaaaaaaaaaaa');

// GOLDEN pin for the whole layer under the RECONCILED genesis scheme
// (see axm-id.test.js and the shared reconciliation fixture): any drift in
// the serialization shows up here.
assert.match(ada.axm_entity_id, /^e1_[a-z2-7]{52}$/);
assert.match(salonClaim.claim_id, /^c1_[a-z2-7]{52}$/);
assert.equal(ada.axm_entity_id, 'e1_vqj4adj5zfa43l75q3lngtlxf6646enrpakuw3jtripg6yfbfceq');
assert.equal(salonClaim.claim_id, 'c1_2gieyzzglt2m5znxz474eh6xjvtp752jxb3sqflcsvabmgjywy3q');

// Existing case-local query handles survive the identity migration.
assert.equal(resolveLocalId(layer, legacyEntityId('test-case', 'Ada Lovelace')), 'ada');
assert.equal(resolveLocalId(layer, legacyEntityId('test-case', 'Countess of Lovelace')), 'ada');
// Legacy Unicode lowercasing can collapse names that the reference distinguishes.
const legacyCollision = fixture();
legacyCollision.actors.push({ id: 'upper-sharp-s', label: '\u1e9e' }, { id: 'lower-sharp-s', label: '\u00df' });
const collisionLayer = buildIdentityLayer(legacyCollision);
const ambiguousToken = legacyEntityId('test-case', '\u1e9e');
assert.equal(ambiguousToken, legacyEntityId('test-case', '\u00df'));
assert.equal(resolveLocalId(collisionLayer, ambiguousToken), ambiguousToken, 'ambiguous legacy handles must remain unresolved');
assert.equal(resolveLocalId(collisionLayer, entityId('test-case', '\u1e9e')), 'upper-sharp-s');
assert.equal(resolveLocalId(collisionLayer, entityId('test-case', '\u00df')), 'lower-sharp-s');

console.log('axm-identity.test: OK');
