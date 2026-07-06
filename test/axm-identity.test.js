import assert from 'node:assert/strict';
import { buildIdentityLayer, resolveLocalId, PARTICIPATES_IN } from '../tools/lib/axm-identity.mjs';
import { entityId, claimId } from '../tools/lib/axm-id.mjs';

const fixture = () => ({
  caseId: 'test-case',
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

// Reconciliation marker travels with the artifact; the namespace is now
// kind-based, not case-scoped. The case id survives only as an informational field.
assert.equal(layer.scheme.status, 'reconciled');
assert.equal(layer.scheme.case, 'test-case');
assert.ok(/kind-based/.test(layer.scheme.namespace_convention), 'scheme must declare the kind-based namespace convention');
assert.equal(layer.scheme.namespace, undefined, 'no case-scoped namespace under kind-based identity');

// Entities cover actors, organizations, and surfaces, ids composed exactly
// from the genesis section 10 derivation over (kind, label).
assert.equal(layer.entities.length, 5);
const ada = layer.entities.find(e => e.local_id === 'ada');
assert.equal(ada.axm_entity_id, entityId('actor', 'Ada Lovelace'));
assert.equal(ada.kind, 'actor');

// Alias-derived ids attach to the canonical entity, derived from the entity's
// kind; an alias equal to the label adds nothing; an alias with no registry
// entry is skipped.
assert.deepEqual(ada.alias_axm_ids, [entityId('actor', 'Countess of Lovelace')]);

// Participation becomes time-qualified claims: one claim per (subj, obj),
// stints as windows, windows sorted by valid_from.
const salonClaim = layer.claims.find(c => c.subj_local_id === 'ada' && c.obj_local_id === 'salon');
assert.equal(salonClaim.claim_id, claimId(ada.axm_entity_id, PARTICIPATES_IN, entityId('surface', 'Somerville Salon'), 'entity'));
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

// Label collisions WITHIN A KIND (case/whitespace-insensitive) are a data
// error, not a merge. (Across kinds they do not collide — a person and an org
// with the same label are distinct by construction under kind-based ids.)
const clash = fixture();
clash.actors.push({ id: 'ada-clone', label: '  ADA LOVELACE ' });
assert.throws(() => buildIdentityLayer(clash), /collision/);

// Cross-kind same-label does NOT collide: kind is the namespace.
const crossKind = fixture();
crossKind.organizations.push({ id: 'ada-org', label: 'Ada Lovelace' });
const crossLayer = buildIdentityLayer(crossKind);
assert.notEqual(
  crossLayer.entities.find(e => e.local_id === 'ada').axm_entity_id,
  crossLayer.entities.find(e => e.local_id === 'ada-org').axm_entity_id,
  'a person and an organization with the same label get different kind-based ids');

// resolveLocalId: local ids pass through; canonical and alias-derived AXM ids
// resolve; unknown AXM ids pass through untouched.
assert.equal(resolveLocalId(layer, 'ada'), 'ada');
assert.equal(resolveLocalId(layer, ada.axm_entity_id), 'ada');
assert.equal(resolveLocalId(layer, entityId('actor', 'Countess of Lovelace')), 'ada');
const unknownId = 'e1_' + 'a'.repeat(52);
assert.equal(resolveLocalId(layer, unknownId), unknownId);

// GOLDEN self-consistency pin for the whole layer (see axm-id.test.js for the
// envelope pins): any drift in the genesis section 10 derivation shows up here.
assert.equal(ada.axm_entity_id, 'e1_mfqtnyf3dpg2aanuuehob2lrsunu5rb2pznpu3gdshu6kqtvg3ra');
assert.equal(salonClaim.claim_id, 'c1_cyvmnje2jcgi6srqqwdhfl4zi4ua2gnp67267hffkzdf5o7qqiwq');

console.log('axm-identity.test: OK');
