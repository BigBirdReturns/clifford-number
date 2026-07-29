import assert from 'node:assert/strict';
import { buildIdentityLayer, resolveLocalId, PARTICIPATES_IN } from '../tools/lib/axm-identity.mjs';
import { claimId, entityId, legacyClaimId, legacyEntityId } from '../tools/lib/axm-id.mjs';

const fixture = () => ({
  namespace: 'test-case',
  actors: [
    { id: 'ada', label: 'Ada Lovelace' },
    { id: 'charles', label: 'Charles Babbage' }
  ],
  organizations: [{ id: 'rs', label: 'Royal Society' }],
  surfaces: [
    { surface_id: 'engine-委', surface_label: 'Analytical Engine Committee' },
    { surface_id: 'salon', surface_label: 'Somerville Salon' }
  ],
  participation: [
    { surface_id: 'engine-委', participant_type: 'actor', actor_id: 'ada', role: 'translator', time_start: '1842', time_end: '1843', evidence_class: 'official', receipt_ids: ['r1'] },
    { surface_id: 'engine-委', participant_type: 'actor', actor_id: 'charles', time_start: '1837', time_end: '1843-10', receipt_ids: ['r2'] },
    { surface_id: 'engine-委', participant_type: 'organization', organization_id: 'rs', receipt_ids: ['r3'] },
    { surface_id: 'salon', participant_type: 'actor', actor_id: 'ada', time_start: '1833', time_end: '1834', receipt_ids: ['r4'] },
    { surface_id: 'salon', participant_type: 'actor', actor_id: 'ada', time_start: '1839', receipt_ids: ['r5'] }
  ],
  aliases: [
    { alias: 'Countess of Lovelace', canonical_id: 'ada', kind: 'actor' },
    { alias: 'ada lovelace', canonical_id: 'ada', kind: 'actor' },
    { alias: 'Unknown Person', canonical_id: 'not-in-registry', kind: 'actor' }
  ]
});

const layer = buildIdentityLayer(fixture());
assert.deepEqual(layer, buildIdentityLayer(fixture()), 'identity layer must be deterministic');
assert.equal(layer.scheme.status, 'reconciled_genesis_v1');
assert.equal(layer.scheme.version, 'axm-genesis-v1');
assert.equal(layer.scheme.external_commit, '411ef40e6cfc3ecb97ac3e256c8151be678347c8');
assert.equal(layer.scheme.namespace, 'test-case');
assert.equal(layer.scheme.active_projection_migrated, true);
assert.equal(layer.scheme.legacy_provisional_ids_resolvable, true);
assert.equal(layer.scheme.active_projection_quarantined, false);
assert.equal(layer.scheme.external_axm_gate_complete, true);
assert.equal(layer.scheme.cross_case_join_authorized, false);

assert.equal(layer.entities.length, 5);
const ada = layer.entities.find(entity => entity.local_id === 'ada');
assert.ok(ada);
assert.equal(ada.axm_entity_id, entityId('test-case', 'Ada Lovelace'));
assert.equal(ada.legacy_provisional_entity_id, legacyEntityId('test-case', 'Ada Lovelace'));
assert.match(ada.axm_entity_id, /^e1_[a-z2-7]{52}$/);
assert.match(ada.legacy_provisional_entity_id, /^e_[a-z2-7]{24}$/);
assert.notEqual(ada.axm_entity_id, ada.legacy_provisional_entity_id);
assert.equal(ada.kind, 'actor');
assert.deepEqual(ada.alias_axm_ids, [entityId('test-case', 'Countess of Lovelace')]);
assert.deepEqual(ada.legacy_provisional_alias_ids, [legacyEntityId('test-case', 'Countess of Lovelace')]);

const salon = layer.entities.find(entity => entity.local_id === 'salon');
const salonClaim = layer.claims.find(claim => claim.subj_local_id === 'ada' && claim.obj_local_id === 'salon');
assert.ok(salon && salonClaim);
assert.equal(salonClaim.claim_id, claimId(ada.axm_entity_id, PARTICIPATES_IN, salon.axm_entity_id, 'entity'));
assert.equal(
  salonClaim.legacy_provisional_claim_id,
  legacyClaimId(ada.legacy_provisional_entity_id, PARTICIPATES_IN, salon.legacy_provisional_entity_id, 'entity')
);
assert.equal(salonClaim.subj, ada.axm_entity_id);
assert.equal(salonClaim.legacy_provisional_subj, ada.legacy_provisional_entity_id);
assert.equal(salonClaim.obj, salon.axm_entity_id);
assert.equal(salonClaim.legacy_provisional_obj, salon.legacy_provisional_entity_id);
assert.match(salonClaim.claim_id, /^c1_[a-z2-7]{52}$/);
assert.match(salonClaim.legacy_provisional_claim_id, /^c_[a-z2-7]{24}$/);
assert.notEqual(salonClaim.claim_id, salonClaim.legacy_provisional_claim_id);
assert.equal(salonClaim.windows.length, 2);
assert.deepEqual(salonClaim.windows.map(window => window.valid_from), ['1833-01-01', '1839-01-01']);
assert.deepEqual(salonClaim.windows.map(window => window.valid_until), ['1834-12-31', null]);
assert.ok(salonClaim.windows.every(window => window.dated));

const shifted = fixture();
shifted.participation[0].time_start = '1840';
const shiftedLayer = buildIdentityLayer(shifted);
const engineClaim = identity => identity.claims.find(claim => claim.subj_local_id === 'ada' && claim.obj_local_id === 'engine-委');
assert.equal(engineClaim(layer).claim_id, engineClaim(shiftedLayer).claim_id, 'claim identity must not depend on temporal windows');
assert.equal(engineClaim(layer).legacy_provisional_claim_id, engineClaim(shiftedLayer).legacy_provisional_claim_id);
assert.notEqual(engineClaim(layer).windows[0].valid_from, engineClaim(shiftedLayer).windows[0].valid_from);

const rsClaim = layer.claims.find(claim => claim.subj_local_id === 'rs');
assert.deepEqual(rsClaim.windows, [{ valid_from: null, valid_until: null, dated: false, role: null, evidence_class: null, receipt_ids: ['r3'] }]);

const clash = fixture();
clash.organizations.push({ id: 'ada-org', label: '  ADA LOVELACE ' });
assert.throws(() => buildIdentityLayer(clash), /collision/);

assert.equal(resolveLocalId(layer, 'ada'), 'ada');
assert.equal(resolveLocalId(layer, ada.axm_entity_id), 'ada');
assert.equal(resolveLocalId(layer, ada.legacy_provisional_entity_id), 'ada');
assert.equal(resolveLocalId(layer, ada.alias_axm_ids[0]), 'ada');
assert.equal(resolveLocalId(layer, ada.legacy_provisional_alias_ids[0]), 'ada');
assert.equal(resolveLocalId(layer, 'e1_' + 'a'.repeat(52)), 'e1_' + 'a'.repeat(52));
assert.equal(resolveLocalId(layer, 'e_' + 'a'.repeat(24)), 'e_' + 'a'.repeat(24));

// Historical self-consistency pins remain available only as predecessor IDs.
assert.equal(ada.legacy_provisional_entity_id, 'e_yy2jyebjgnch3csy4ww3ys6m');
assert.equal(salonClaim.legacy_provisional_claim_id, 'c_h2h5cqpashhl3mkzptiljdtd');

console.log('axm-identity.test: OK (Genesis v1 active; legacy IDs resolve)');
