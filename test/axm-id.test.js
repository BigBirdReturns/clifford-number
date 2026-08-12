import assert from 'node:assert/strict';
import { b32Id, entityId, claimId, _internal } from '../tools/lib/axm-id.mjs';

// base32 alphabet + no-padding envelope. 15 bytes → 24 chars exactly.
assert.equal(_internal.base32LowerNoPad(Buffer.from([])), '');
assert.equal(_internal.base32LowerNoPad(Buffer.from([0x00])), 'aa');
assert.equal(_internal.base32LowerNoPad(Buffer.from([0xff])), '74');
// "foobar" RFC 4648 base32 is MZXW6YTBOI (upper); lowercased here.
assert.equal(_internal.base32LowerNoPad(Buffer.from('foobar', 'utf8')), 'mzxw6ytboi');

// Envelope shape: "<prefix>_" + 24 base32 chars (120 bits / 5).
const id = b32Id('e', 'ben warner');
assert.match(id, /^e_[a-z2-7]{24}$/, 'entity id must be prefix + 24 base32 chars, no padding');

// GOLDEN self-consistency fixtures. These pin the envelope + this repo's
// provisional serialization so any drift is caught. They are NOT claimed to
// equal axm-genesis sealed IDs — see tools/lib/axm-id.mjs header.
assert.equal(b32Id('e', 'ben warner'), 'e_k5ki4qe57qegkr37d7fmvlm3');
assert.equal(entityId('uk-ai-policy', 'Ben Warner'), 'e_cxoy37udrurtowdj47suemrw');
assert.equal(entityId('uk-ai-policy', 'ben warner'), entityId('uk-ai-policy', '  Ben Warner  '),
  'entity id must be case- and whitespace-insensitive on the label');
assert.notEqual(entityId('uk-ai-policy', 'Ben Warner'), entityId('other-case', 'Ben Warner'),
  'namespace must affect the entity id');
assert.equal(
  claimId('e_cxoy37udrurtowdj47suemrw', 'participates_in', 'ben-warner-no10-digital-data-role-observation-2020-2021', 'entity'),
  'c_csbi35yszweri27ktn36f2y4');

console.log('axm-id.test: OK');
