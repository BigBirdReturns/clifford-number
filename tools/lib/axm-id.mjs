// AXM content-addressed identity.
//
// The active identity functions now reproduce the commit-pinned AXM Genesis
// v1 implementation exactly. The retired provisional functions remain
// available under explicit `legacy*` names so persisted e_/c_ identifiers can
// be resolved and superseded without being deleted or silently reinterpreted.
import {
  AXM_GENESIS_V1_SCHEME,
  canonicalizeGenesisV1,
  recomputeGenesisClaimId,
  recomputeGenesisEntityId
} from './axm-genesis-identity-v1.mjs';
import { createHash } from 'node:crypto';

const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function legacyBase32LowerNoPad(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

// Retired v0-style envelope: SHA-256(UTF-8), first 15 bytes, base32 lowercase,
// unversioned one-letter prefix. It is compatibility-only, never the active
// identity scheme and never cross-case join authority.
export function legacyB32Id(prefix, input) {
  const digest = createHash('sha256').update(input, 'utf8').digest().subarray(0, 15);
  return `${prefix}_${legacyBase32LowerNoPad(digest)}`;
}

export function legacyEntityId(namespace, label) {
  return legacyB32Id('e', `${namespace}${String(label).trim().toLowerCase()}`);
}

export function legacyClaimId(subjectId, predicate, object, objectType) {
  return legacyB32Id('c', [subjectId, String(predicate).trim().toLowerCase(), String(object), objectType].join(''));
}

// Backward-compatible export for callers that deliberately test or inspect
// the retired envelope. New identity code must use entityId()/claimId().
export const b32Id = legacyB32Id;

// Active, externally reconciled AXM Genesis v1 identities.
export function entityId(namespace, label) {
  return recomputeGenesisEntityId(namespace, label);
}

export function claimId(subjectId, predicate, object, objectType) {
  return recomputeGenesisClaimId(subjectId, predicate, object, objectType);
}

export const ACTIVE_IDENTITY_SCHEME = Object.freeze({
  ...AXM_GENESIS_V1_SCHEME,
  status: 'reconciled_genesis_v1',
  active_projection_migrated: true,
  legacy_provisional_ids_resolvable: true,
  cross_case_join_authorized: false
});

export { canonicalizeGenesisV1 };

export const _internal = Object.freeze({
  base32LowerNoPad: legacyBase32LowerNoPad,
  legacyBase32LowerNoPad
});
