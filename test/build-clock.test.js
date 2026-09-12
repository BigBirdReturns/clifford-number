import assert from 'node:assert/strict';
import { buildTimestamp, parseSourceEpoch, sourceEpoch, validateBuildClock } from '../tools/lib/build-clock.mjs';

const clock = {
  schema_version: 'clifford-build-clock@1',
  source_date_epoch: '1234567890',
  timestamp: '2009-02-13T23:31:30.000Z',
  not_evidence_date: true
};
assert.equal(parseSourceEpoch('0'), 0);
assert.equal(parseSourceEpoch('253402300799'), 253402300799);
for (const value of ['', '-1', '1.5', '1e3', '+1', ' 1', '1\n', 'Infinity', '253402300800', null, undefined, 1]) {
  assert.throws(() => parseSourceEpoch(value), /SOURCE_DATE_EPOCH/u);
}
assert.equal(validateBuildClock(clock).epoch, 1234567890);
assert.equal(sourceEpoch({ env: {}, clock }), 1234567890);
assert.equal(sourceEpoch({ env: { SOURCE_DATE_EPOCH: '1234567890' }, clock }), 1234567890);
assert.equal(buildTimestamp({ env: {}, clock }), '2009-02-13T23:31:30.000Z');
assert.equal(buildTimestamp({ env: {}, clock }), '2009-02-13T23:31:30.000Z');
assert.throws(() => sourceEpoch({ env: { SOURCE_DATE_EPOCH: '1234567891' }, clock }), /does not match admitted/u);
assert.throws(() => validateBuildClock({ ...clock, timestamp: '2009-02-13T23:31:31.000Z' }), /timestamp mismatch/u);
assert.throws(() => validateBuildClock({ ...clock, not_evidence_date: false }), /not_evidence_date/u);
console.log('build-clock.test: OK (admitted, repeated, matching override, mismatch and malformed clocks)');
