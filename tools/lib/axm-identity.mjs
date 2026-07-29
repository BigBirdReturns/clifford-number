// Temporal identity layer — AXM Genesis v1 active projection.
//
// Every actor, organization, and surface receives the commit-pinned Genesis
// v1 entity ID. Every participation becomes one time-stable `participates_in`
// claim whose stints remain temporal windows. Retired provisional identifiers
// are retained as explicit predecessor fields and resolver aliases; they are
// never deleted, treated as current IDs, or used as authority to merge entities.
import {
  ACTIVE_IDENTITY_SCHEME,
  claimId,
  entityId,
  legacyClaimId,
  legacyEntityId
} from './axm-id.mjs';
import { windowOf } from './temporal.mjs';

export const PARTICIPATES_IN = 'participates_in';

export const SCHEME = Object.freeze({
  ...ACTIVE_IDENTITY_SCHEME,
  temporal: 'axm temporal@1: valid_from / valid_until, ISO 8601, null = open end; windows qualify claims, they are not part of claim identity',
  migration_registry: 'data/project/lake-axm-active-identity-registry-wave-06.jsonl',
  migration_map: 'build/axm-identity-genesis-v1-migration.json',
  active_projection_quarantined: false,
  external_axm_gate_complete: true,
  cross_case_join_authorized: false
});

function claimWindow(row) {
  const window = windowOf(row);
  return {
    valid_from: window.valid_from,
    valid_until: window.valid_until,
    dated: window.dated,
    role: row.role ?? null,
    evidence_class: row.evidence_class ?? null,
    receipt_ids: row.receipt_ids ?? []
  };
}

export function buildIdentityLayer({ namespace, actors, organizations, surfaces, participation, aliases = [] }) {
  if (!namespace) throw new Error('identity layer requires a namespace');

  const entities = [];
  const byLocalId = new Map();
  const byCurrentId = new Map();
  const byLegacyId = new Map();

  function claimIdOwner(map, id, localId, label) {
    const clash = map.get(id);
    if (clash && clash.local_id !== localId) {
      throw new Error(`axm entity id collision: ${clash.local_id} and ${localId} both derive ${id} (label ${JSON.stringify(label)})`);
    }
  }

  function addEntity(localId, kind, label) {
    const currentId = entityId(namespace, label);
    const legacyId = legacyEntityId(namespace, label);
    claimIdOwner(byCurrentId, currentId, localId, label);
    claimIdOwner(byLegacyId, legacyId, localId, label);
    const entity = {
      local_id: localId,
      kind,
      label,
      axm_entity_id: currentId,
      legacy_provisional_entity_id: legacyId,
      alias_axm_ids: [],
      legacy_provisional_alias_ids: []
    };
    entities.push(entity);
    byLocalId.set(localId, entity);
    byCurrentId.set(currentId, entity);
    byLegacyId.set(legacyId, entity);
    return entity;
  }

  for (const actor of actors) addEntity(actor.id, 'actor', actor.label);
  for (const organization of organizations) addEntity(organization.id, 'organization', organization.label);
  for (const surface of surfaces) addEntity(surface.surface_id, 'surface', surface.surface_label);

  for (const alias of aliases) {
    const entity = byLocalId.get(alias.canonical_id);
    if (!entity) continue;

    const currentAliasId = entityId(namespace, alias.alias);
    if (currentAliasId !== entity.axm_entity_id) {
      claimIdOwner(byCurrentId, currentAliasId, entity.local_id, alias.alias);
      if (!entity.alias_axm_ids.includes(currentAliasId)) entity.alias_axm_ids.push(currentAliasId);
      byCurrentId.set(currentAliasId, entity);
    }

    const legacyAliasId = legacyEntityId(namespace, alias.alias);
    if (legacyAliasId !== entity.legacy_provisional_entity_id) {
      claimIdOwner(byLegacyId, legacyAliasId, entity.local_id, alias.alias);
      if (!entity.legacy_provisional_alias_ids.includes(legacyAliasId)) entity.legacy_provisional_alias_ids.push(legacyAliasId);
      byLegacyId.set(legacyAliasId, entity);
    }
  }

  const claimByCurrentId = new Map();
  const currentByLegacyClaimId = new Map();
  for (const row of participation) {
    const subjectLocalId = row.participant_type === 'actor' ? row.actor_id : row.organization_id;
    const subject = byLocalId.get(subjectLocalId);
    const object = byLocalId.get(row.surface_id);
    if (!subject) throw new Error(`participation references unknown participant ${subjectLocalId}`);
    if (!object) throw new Error(`participation references unknown surface ${row.surface_id}`);

    const currentClaimId = claimId(subject.axm_entity_id, PARTICIPATES_IN, object.axm_entity_id, 'entity');
    const legacyProvisionalClaimId = legacyClaimId(
      subject.legacy_provisional_entity_id,
      PARTICIPATES_IN,
      object.legacy_provisional_entity_id,
      'entity'
    );
    const priorCurrent = currentByLegacyClaimId.get(legacyProvisionalClaimId);
    if (priorCurrent && priorCurrent !== currentClaimId) {
      throw new Error(`legacy AXM claim collision: ${legacyProvisionalClaimId} maps to ${priorCurrent} and ${currentClaimId}`);
    }
    currentByLegacyClaimId.set(legacyProvisionalClaimId, currentClaimId);

    if (!claimByCurrentId.has(currentClaimId)) {
      claimByCurrentId.set(currentClaimId, {
        claim_id: currentClaimId,
        legacy_provisional_claim_id: legacyProvisionalClaimId,
        subj: subject.axm_entity_id,
        legacy_provisional_subj: subject.legacy_provisional_entity_id,
        subj_local_id: subject.local_id,
        predicate: PARTICIPATES_IN,
        obj: object.axm_entity_id,
        legacy_provisional_obj: object.legacy_provisional_entity_id,
        obj_local_id: object.local_id,
        obj_type: 'entity',
        windows: []
      });
    } else if (claimByCurrentId.get(currentClaimId).legacy_provisional_claim_id !== legacyProvisionalClaimId) {
      throw new Error(`current AXM claim ${currentClaimId} has multiple legacy predecessors`);
    }
    claimByCurrentId.get(currentClaimId).windows.push(claimWindow(row));
  }

  const claims = [...claimByCurrentId.values()];
  for (const claim of claims) {
    claim.windows.sort((left, right) => String(left.valid_from ?? '').localeCompare(String(right.valid_from ?? '')));
  }
  claims.sort((left, right) => left.claim_id.localeCompare(right.claim_id));
  for (const entity of entities) {
    entity.alias_axm_ids.sort((left, right) => left.localeCompare(right));
    entity.legacy_provisional_alias_ids.sort((left, right) => left.localeCompare(right));
  }
  entities.sort((left, right) => left.local_id.localeCompare(right.local_id));

  return { scheme: { ...SCHEME, namespace }, entities, claims };
}

// Resolve local IDs, current Genesis v1 IDs, and retired provisional IDs. A
// predecessor token resolves to the same local registry object but never
// changes the current identity stored in the active projection.
export function resolveLocalId(identity, token) {
  if (typeof token !== 'string') return token;
  if (!/^e1_[a-z2-7]{52}$/.test(token) && !/^e_[a-z2-7]{24}$/.test(token)) return token;
  const entity = (identity.entities ?? []).find(item =>
    item.axm_entity_id === token
    || item.legacy_provisional_entity_id === token
    || (item.alias_axm_ids ?? []).includes(token)
    || (item.legacy_provisional_alias_ids ?? []).includes(token));
  return entity ? entity.local_id : token;
}
