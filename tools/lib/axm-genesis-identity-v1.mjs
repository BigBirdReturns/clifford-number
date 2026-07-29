import { createHash } from 'node:crypto';

const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const FROZEN_WHITESPACE = new Set([
  '\u0020', '\u00a0', '\u1680',
  '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200a',
  '\u2028', '\u2029', '\u202f', '\u205f', '\u3000'
]);

export const AXM_GENESIS_V1_SCHEME = Object.freeze({
  version: 'axm-genesis-v1',
  status: 'pinned_reference_implementation',
  external_repository: 'BigBirdReturns/axm-genesis',
  external_commit: '411ef40e6cfc3ecb97ac3e256c8151be678347c8',
  identity_module_path: 'src/axm_verify/identity.py',
  fixture_path: 'tests/vectors/identity.json',
  digest: 'full_32_byte_sha256',
  encoding: 'rfc4648_base32_lowercase_no_padding',
  prefixes: Object.freeze({ entity: 'e1_', claim: 'c1_', provenance: 'p1_', span: 's1_' })
});

export function base32LowerNoPad(bytes) {
  let bits = 0;
  let buffer = 0;
  let out = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32_ALPHABET[(buffer >>> bits) & 31];
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function canonicalizeGenesisV1(text) {
  const input = String(text);
  if (input.includes('\0')) throw new Error('Input contains illegal NUL byte');
  const normalized = input.normalize('NFC').replace(/[A-Z]/g, character => character.toLowerCase());
  const withoutControls = normalized.replace(/\p{Cc}/gu, '');
  const out = [];
  let inWhitespace = false;
  for (const character of withoutControls) {
    if (FROZEN_WHITESPACE.has(character)) {
      inWhitespace = true;
      continue;
    }
    if (inWhitespace && out.length > 0) out.push(' ');
    inWhitespace = false;
    out.push(character);
  }
  return out.join('');
}

function deriveId(prefix, preimage) {
  const digest = createHash('sha256').update(preimage, 'utf8').digest();
  return `${prefix}${base32LowerNoPad(digest)}`;
}

export function recomputeGenesisEntityId(namespace, label) {
  return deriveId('e1_', `${canonicalizeGenesisV1(namespace)}\0${canonicalizeGenesisV1(label)}`);
}

export function recomputeGenesisClaimId(subject, predicate, object, objectType) {
  const canonicalPredicate = canonicalizeGenesisV1(predicate);
  const objectValue = objectType === 'entity' ? String(object) : canonicalizeGenesisV1(object);
  return deriveId('c1_', `${subject}\0${canonicalPredicate}\0${objectType}\0${objectValue}`);
}

export function deriveGenesisProvenanceId(claimId, sourceHash, byteStart, byteEnd) {
  return deriveId('p1_', `${claimId}\0${sourceHash}\0${byteStart}\0${byteEnd}`);
}

export function deriveGenesisSpanId(sourceHash, byteStart, byteEnd, text) {
  return deriveId('s1_', `${sourceHash}\0${byteStart}\0${byteEnd}\0${text}`);
}

export const _internal = Object.freeze({
  FROZEN_WHITESPACE,
  deriveId
});
