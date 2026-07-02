// AXM content-addressed identity — PROVISIONAL vendored implementation.
//
// Why this exists
// ---------------
// The AXM ecosystem (axm-core / axm-genesis) derives deterministic,
// content-addressed IDs so that two independently built corpora that mention
// the same entity produce the same entity_id. Adopting that scheme in this
// Node pipeline is the precondition for cross-case joins, a union graph, and
// dark-network deltas across cases (see README "Generalization").
//
// What is authoritative vs. what is provisional here
// --------------------------------------------------
// AUTHORITATIVE (fully specified in axm-core IDENTITY.md, reproduced exactly):
//   The hash ENVELOPE — "All _b32_id hashes: SHA-256 of UTF-8 input, first 15
//   bytes, base32 lowercase no padding, type prefix." `b32Id()` implements
//   precisely this and is safe to rely on.
//
// PROVISIONAL (NOT verifiable from the four in-scope repos):
//   The exact INPUT SERIALIZATION for entity_id / claim_id — how (namespace,
//   label) and (subj, pred, obj, obj_type) are joined into the bytes fed to
//   the envelope — lives in axm-genesis (`axm_verify.identity`), which is out
//   of scope here and is a git-only dependency. axm-core forbids
//   reimplementing it ("Genesis owns identity, forge delegates" — INV-7/27),
//   and the local forge `make_entity_id` is explicitly a non-canonical
//   working ID. So `entityId()` / `claimId()` below use a DOCUMENTED,
//   BEST-EFFORT serialization that MUST be reconciled byte-for-byte against
//   axm-genesis `axm_verify.identity.recompute_entity_id` /
//   `recompute_claim_id` before any ID produced here is used as a
//   cross-system join key. Until then these IDs are stable and useful WITHIN
//   this repo, but are not guaranteed to equal genesis-sealed IDs.
//
// This module is intentionally NOT wired into any generated artifact yet.
import { createHash } from 'node:crypto';

// RFC 4648 base32, lowercased. 15 bytes = 120 bits = exactly 24 chars, so no
// padding is ever required — which is why the spec fixes 15 bytes.
const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32LowerNoPad(bytes) {
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

// AUTHORITATIVE envelope (IDENTITY.md): SHA-256(utf8) → first 15 bytes →
// base32 lowercase no padding → "<prefix>_" + digest.
export function b32Id(prefix, input) {
  const digest = createHash('sha256').update(input, 'utf8').digest().subarray(0, 15);
  return `${prefix}_${base32LowerNoPad(digest)}`;
}

// PROVISIONAL serialization — see header. Reconcile against axm-genesis
// before using as a cross-system join key.
export function entityId(namespace, label) {
  return b32Id('e', `${namespace}${String(label).trim().toLowerCase()}`);
}

export function claimId(subjId, predicate, obj, objType) {
  return b32Id('c', [subjId, String(predicate).trim().toLowerCase(), String(obj), objType].join(''));
}

export const _internal = { base32LowerNoPad };
