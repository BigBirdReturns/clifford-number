// AXM content-addressed identity — canonical genesis derivation.
//
// Why this exists
// ---------------
// The AXM ecosystem (axm-core / axm-genesis) derives deterministic,
// content-addressed IDs so that two independently built corpora that mention
// the same entity produce the same entity_id. Adopting that scheme in this
// Node pipeline is the precondition for cross-case joins, a union graph, and
// dark-network deltas across cases (see README "Temporal identity layer").
//
// Provenance of this port
// -----------------------
// This is the AXM Genesis v1 identifier derivation (genesis spec section 10),
// no longer a provisional best effort. It was reconciled byte-for-byte against
// the reference kernel `axm_verify.identity` and pinned by the shared vector
// file test/vectors/identity.json (source: axm-genesis commit a73335d,
// sha256 0104c9492c41a16f19e893f2d7be3b24f79456b49325a55c1885c6324fcc171e).
// test/axm-id-conformance.test.js asserts every vector in that file; any drift
// from the canonical derivation fails the suite.
//
// The derivation (spec section 10)
// --------------------------------
// canonicalize(text):
//   1. reject NUL (it is the preimage field separator);
//   2. NFC-normalize;
//   3. ASCII-only lowercasing (A-Z -> a-z; deliberately NOT toLowerCase, which
//      would wrongly lower non-ASCII letters such as U+0130 İ);
//   4. strip Unicode category-Cc control characters (tabs/newlines included);
//   5. collapse runs of the frozen whitespace set to one ASCII space and trim.
//
// id = prefix + base32lower( SHA-256( preimage_utf8 ) ) over the FULL 32-byte
// digest (never truncated), RFC 4648 alphabet, no padding -> exactly 52 base32
// characters after the versioned prefix (e1_ / c1_).
//
//   entity_id = e1_ + b32( SHA-256( canon(namespace) 00 canon(label) ) )
//   claim_id  = c1_ + b32( SHA-256( subject 00 canon(pred) 00 objType 00 objVal ) )
//
// where objVal is the object verbatim when objType === "entity", else canon(obj).
import { createHash } from 'node:crypto';

// RFC 4648 base32 alphabet, lowercased. The full 32-byte SHA-256 digest encodes
// to 52 characters (256 bits / 5, rounded up), so no padding is ever emitted.
const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

// NUL is the preimage field separator: it must never appear inside a field.
const NUL = String.fromCharCode(0);

// The frozen whitespace set WS (spec section 10.1): the non-Cc Unicode
// whitespace characters, enumerated by code point so canonicalize() is
// independent of future Unicode changes and of source-file encoding. Tabs and
// newlines are category Cc and are removed before this set is applied.
const _WS = new Set([
  0x0020, 0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
].map(cp => String.fromCodePoint(cp)));

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

// Frozen text canonicalization (spec section 10.1). Ported from
// axm_verify.identity.canonicalize; see test/axm-id-conformance.test.js.
export function canonicalize(text) {
  const s = String(text);
  if (s.includes(NUL)) throw new Error('Input contains illegal NUL byte');
  let t = s.normalize('NFC');
  // ASCII-only lowercasing: map A-Z to a-z and nothing else.
  t = t.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
  // Strip Unicode category-Cc control characters (tabs, newlines, BEL, ...).
  t = t.replace(/\p{Cc}/gu, '');
  // Collapse frozen-set whitespace runs to a single ASCII space; a run at the
  // start emits no leading space (out is still empty), and a trailing run emits
  // no space because no non-WS char follows it — so the result is also trimmed.
  let out = '';
  let inWs = false;
  for (const c of t) {
    if (_WS.has(c)) { inWs = true; continue; }
    if (inWs && out) out += ' ';
    inWs = false;
    out += c;
  }
  return out;
}

// prefix + base32lower(SHA-256(preimage)) over the full 32-byte digest.
function deriveId(prefix, preimage) {
  const digest = createHash('sha256').update(preimage, 'utf8').digest();
  return prefix + base32LowerNoPad(digest);
}

// The versioned hash envelope, exposed for callers that need a raw derivation.
// `prefix` is the full versioned prefix including its separator, e.g. "e1_".
export function b32Id(prefix, input) {
  return deriveId(prefix, input);
}

// entity_id = e1_ + b32(SHA-256(canon(namespace) 00 canon(label))).
export function entityId(namespace, label) {
  return deriveId('e1_', canonicalize(namespace) + NUL + canonicalize(label));
}

// claim_id over subject-id, canonical predicate, object_type, and object value.
// NOTE the field order: object_type precedes the object value. The object value
// is the entity_id verbatim when object_type is "entity", else canon(object).
export function claimId(subjId, predicate, obj, objType) {
  const objValue = objType === 'entity' ? String(obj) : canonicalize(obj);
  return deriveId('c1_', subjId + NUL + canonicalize(predicate) + NUL + objType + NUL + objValue);
}

export const _internal = { base32LowerNoPad, canonicalize };
