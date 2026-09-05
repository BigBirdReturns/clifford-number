// AXM identity projection reconciled against axm-genesis spec/v1 section 10.
// The shared fixture pins reference commit 74db57b32ca5c02c7d340aa6caa25df993818667.
// Entities and aliases use case-qualified namespace/label identities.
// Participation becomes time-stable claims with separately retained windows,
// roles, evidence classes, and receipt IDs. Matching IDs do not establish
// equivalence across different case namespaces or add actor hops.
import { entityId, claimId, legacyEntityId } from './axm-id.mjs';
import { windowOf } from './temporal.mjs';

export const PARTICIPATES_IN = 'participates_in';

export const SCHEME = Object.freeze({
  status: 'reconciled',
  legacy_query_tokens: 'historical e_ tokens resolve only to a unique local entity; never cross-case identity authority',
  envelope: 'sha256 full 32-byte digest, base32 lowercase no padding, versioned prefix e1_/c1_ (axm-genesis spec/v1 section 10)',
  serialization: 'reconciled byte-for-byte against axm-genesis axm_verify.identity (CN-P0-1); shared fixture committed to both repositories',
  temporal: 'axm temporal@1: valid_from / valid_until, ISO 8601, null = open end; windows qualify claims, they are not part of claim identity',
});

function claimWindow(row) {
  const w = windowOf(row);
  return {
    valid_from: w.valid_from,
    valid_until: w.valid_until,
    dated: w.dated,
    role: row.role ?? null,
    evidence_class: row.evidence_class ?? null,
    receipt_ids: row.receipt_ids ?? [],
  };
}

export function buildIdentityLayer({ namespace, actors, organizations, surfaces, participation, aliases = [] }) {
  if (!namespace) throw new Error('identity layer requires a namespace');

  const entities = [];
  const byLocalId = new Map();
  const byAxmId = new Map();

  function addEntity(localId, kind, label) {
    const axmId = entityId(namespace, label);
    const clash = byAxmId.get(axmId);
    if (clash && clash.local_id !== localId) {
      throw new Error(`axm entity id collision: ${clash.local_id} and ${localId} both derive ${axmId} (label ${JSON.stringify(label)})`);
    }
    const entity = { local_id: localId, kind, label, axm_entity_id: axmId, alias_axm_ids: [], legacy_axm_ids: [legacyEntityId(namespace, label)] };
    entities.push(entity);
    byLocalId.set(localId, entity);
    byAxmId.set(axmId, entity);
    return entity;
  }

  for (const a of actors) addEntity(a.id, 'actor', a.label);
  for (const o of organizations) addEntity(o.id, 'organization', o.label);
  for (const s of surfaces) addEntity(s.surface_id, 'surface', s.surface_label);

  // Alias-derived ids join to the canonical entity. An alias whose derived id
  // collides with a different entity's id is the same data error as above.
  for (const alias of aliases) {
    const entity = byLocalId.get(alias.canonical_id);
    if (!entity) continue; // legacy-graph aliases have no canonical registry entry
    const legacyId = legacyEntityId(namespace, alias.alias);
    if (!entity.legacy_axm_ids.includes(legacyId)) entity.legacy_axm_ids.push(legacyId);
    const aliasId = entityId(namespace, alias.alias);
    if (aliasId === entity.axm_entity_id) continue;
    const clash = byAxmId.get(aliasId);
    if (clash && clash.local_id !== entity.local_id) {
      throw new Error(`axm alias id collision: alias ${JSON.stringify(alias.alias)} of ${entity.local_id} derives ${clash.local_id}'s id ${aliasId}`);
    }
    if (!entity.alias_axm_ids.includes(aliasId)) entity.alias_axm_ids.push(aliasId);
    byAxmId.set(aliasId, entity);
  }

  // One claim per (participant, surface); stints become windows on the claim.
  const claimById = new Map();
  for (const row of participation) {
    const subjLocal = row.participant_type === 'actor' ? row.actor_id : row.organization_id;
    const subj = byLocalId.get(subjLocal);
    const obj = byLocalId.get(row.surface_id);
    if (!subj) throw new Error(`participation references unknown participant ${subjLocal}`);
    if (!obj) throw new Error(`participation references unknown surface ${row.surface_id}`);
    const id = claimId(subj.axm_entity_id, PARTICIPATES_IN, obj.axm_entity_id, 'entity');
    if (!claimById.has(id)) {
      claimById.set(id, {
        claim_id: id,
        subj: subj.axm_entity_id,
        subj_local_id: subj.local_id,
        predicate: PARTICIPATES_IN,
        obj: obj.axm_entity_id,
        obj_local_id: obj.local_id,
        obj_type: 'entity',
        windows: [],
      });
    }
    claimById.get(id).windows.push(claimWindow(row));
  }

  const claims = [...claimById.values()];
  for (const c of claims) {
    c.windows.sort((a, b) => String(a.valid_from ?? '').localeCompare(String(b.valid_from ?? '')));
  }
  claims.sort((a, b) => a.claim_id.localeCompare(b.claim_id));
  entities.sort((a, b) => a.local_id.localeCompare(b.local_id));

  return { scheme: { ...SCHEME, namespace }, entities, claims };
}

// Resolve a --from/--to style token: a local id passes through; an AXM
// entity id (canonical or alias-derived, reconciled e1_ or legacy e_ shape)
// resolves to its local id.
export function resolveLocalId(identity, token) {
  if (!/^(?:e1_[a-z2-7]{52}|e_[a-z2-7]{24})$/.test(token)) return token;
  const matches = identity.entities.filter(e => e.axm_entity_id === token
    || e.alias_axm_ids.includes(token) || (e.legacy_axm_ids ?? []).includes(token));
  // Never resolve an ambiguous legacy token by array order.
  return matches.length === 1 ? matches[0].local_id : token;
}
