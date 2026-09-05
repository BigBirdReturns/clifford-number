// AXM content-addressed identity — RECONCILED against axm-genesis.
//
// CN-P0-1 (BUILD-INSTRUCTIONS.md §2.1): this file reproduces axm-genesis
// `axm_verify.identity` byte-for-byte — spec/v1 §10. The shared fixture
// `test/fixtures/axm-identity-reconciliation.json` is committed byte-identically
// to both repositories (genesis: `tests/vectors/identity-reconciliation-clifford.json`)
// and both implementations must reproduce every id in it. Any change here that
// is not first a genesis spec change is a defect.
//
// The scheme (spec/v1 §10):
//   id = prefix + base32lower( SHA-256( preimage_utf8 ) )
// over the FULL 32-byte digest (never truncated): exactly 52 base32 chars
// after the versioned prefix (e1_ / c1_ / p1_ / s1_).
//
// canonicalize() (spec §10.1, frozen):
//   1. NFC-normalize.
//   2. ASCII-only lowercasing (A-Z → a-z; deliberately NOT full casefold —
//      ß, İ, ẞ, ı survive unchanged).
//   3. Strip Unicode category-Cc control characters (tab and newline are Cc:
//      removed here, never treated as whitespace).
//   4. Collapse runs of the frozen whitespace set to one ASCII space; trim.
//   NUL input is illegal (NUL is the preimage field separator).
//
// The legacy 15-byte truncated envelope (`b32Id`) remains only for
// pre-reconciliation callers inside this repo and produces ids that are NOT
// genesis ids; do not use it for any cross-system join.
import { createHash } from 'node:crypto';

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

// The frozen whitespace set WS (spec §10.1): the non-Cc Unicode whitespace
// characters, enumerated so canonicalize() is independent of future Unicode
// changes. Mirrors axm_verify.identity._WS exactly.
const WS = new Set([
  ' ', '\u00a0', '\u1680',
  '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006',
  '\u2007', '\u2008', '\u2009', '\u200a',
  '\u2028', '\u2029', '\u202f', '\u205f', '\u3000',
]);

// ASCII-only lowering: A-Z → a-z, nothing else. Never String.prototype
// .toLowerCase(), which also lowers non-ASCII (İ → i̇) and breaks parity.
function asciiLower(text) {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0);
    out += (c >= 0x41 && c <= 0x5a) ? String.fromCodePoint(c + 0x20) : ch;
  }
  return out;
}

// Unicode category Cc is exactly C0 ∪ DEL ∪ C1: U+0000–U+001F, U+007F–U+009F.
function isCc(ch) {
  const c = ch.codePointAt(0);
  return c <= 0x1f || (c >= 0x7f && c <= 0x9f);
}

// Frozen text canonicalization (spec §10.1). Mirrors
// axm_verify.identity.canonicalize byte-for-byte.
export function canonicalize(text) {
  const s = String(text);
  if (s.includes('\x00')) {
    throw new Error('Input contains illegal NUL byte');
  }
  let t = s.normalize('NFC');
  t = asciiLower(t);
  let stripped = '';
  for (const ch of t) if (!isCc(ch)) stripped += ch;
  let out = '';
  let inWs = false;
  for (const ch of stripped) {
    if (WS.has(ch)) {
      inWs = true;
      continue;
    }
    if (inWs && out) out += ' ';
    inWs = false;
    out += ch;
  }
  return out;
}

function deriveId(prefix, preimage) {
  const digest = createHash('sha256').update(preimage, 'utf8').digest();
  return prefix + base32LowerNoPad(digest);
}

// entity_id = e1_ + b32(SHA-256(canon(namespace) || 0x00 || canon(label))).
export function entityId(namespace, label) {
  return deriveId('e1_', canonicalize(namespace) + '\x00' + canonicalize(String(label)));
}

// claim_id over subject-id, canonical predicate, object_type, object value.
// The object value is the entity_id verbatim when object_type is "entity",
// otherwise the canonicalized literal. Preimage field order and separators
// mirror axm_verify.identity.recompute_claim_id exactly.
export function claimId(subjId, predicate, obj, objType) {
  const objValue = objType === 'entity' ? String(obj) : canonicalize(String(obj));
  return deriveId(
    'c1_',
    subjId + '\x00' + canonicalize(String(predicate)) + '\x00' + objType + '\x00' + objValue,
  );
}

// LEGACY pre-reconciliation envelope (axm-core IDENTITY.md 15-byte truncation).
// Kept only so historical in-repo artifacts remain reproducible; NOT a genesis
// id and never a cross-system join key.
export function legacyEntityId(namespace, label) {
  // Historical, case-local query token only; never a reconciled identity.
  return b32Id('e', `${namespace}\u001f${String(label).trim().toLowerCase()}`);
}

export function b32Id(prefix, input) {
  const digest = createHash('sha256').update(input, 'utf8').digest().subarray(0, 15);
  return `${prefix}_${base32LowerNoPad(digest)}`;
}

export const _internal = { base32LowerNoPad, asciiLower, isCc, canonicalize };
