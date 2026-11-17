import assert from 'node:assert/strict';
import fs from 'node:fs';
import { periodStart, periodEnd, windowOf, intersect, intersectAll, overlapsPeriod, formatWindow, UNBOUNDED } from '../tools/lib/temporal.mjs';

// Period parsing widens to the full named period.
assert.equal(periodStart('2016'), '2016-01-01');
assert.equal(periodEnd('2016'), '2016-12-31');
assert.equal(periodStart('2019-12'), '2019-12-01');
assert.equal(periodEnd('2019-12'), '2019-12-31');
assert.equal(periodEnd('2024-02'), '2024-02-29'); // leap year
assert.equal(periodEnd('2023-02'), '2023-02-28');
assert.equal(periodEnd('2000-02'), '2000-02-29'); // divisible by 400: leap year
assert.equal(periodEnd('1900-02'), '1900-02-28'); // divisible by 100 only: not leap
assert.equal(periodStart('2021-05-17'), '2021-05-17');
assert.equal(periodEnd('2021-05-17'), '2021-05-17');
assert.equal(periodStart('2024-02-29'), '2024-02-29');
assert.equal(periodStart(''), null);
assert.equal(periodEnd(null), null);
assert.throws(() => periodStart('May 2021'), /unparseable/);
for (const invalid of ['0000', '2024-00', '2024-13', '2024-01-00', '2023-02-29', '1900-02-29', '2024-02-30', '2024-04-31']) {
  assert.throws(() => periodStart(invalid), /unparseable/, `${invalid} must be rejected as an impossible date`);
  assert.throws(() => periodEnd(invalid), /unparseable/, `${invalid} must be rejected as an impossible date`);
}

// windowOf: ledger rows at mixed precision, open ends, undated rows.
assert.deepEqual(windowOf({ time_start: '2019-12', time_end: '2021-05' }),
  { valid_from: '2019-12-01', valid_until: '2021-05-31', dated: true });
assert.deepEqual(windowOf({ time_start: '2023-09' }),
  { valid_from: '2023-09-01', valid_until: null, dated: true });
assert.deepEqual(windowOf({}), { valid_from: null, valid_until: null, dated: false });

// Intersection with open ends.
const w = (from, until, dated = true) => ({ valid_from: from, valid_until: until, dated });
assert.deepEqual(intersect(w('2015-01-01', '2019-12-31'), w('2019-12-01', '2021-05-31')),
  w('2019-12-01', '2019-12-31'));
assert.equal(intersect(w('2015-01-01', '2019-11-30'), w('2019-12-01', '2021-05-31')), null);
assert.deepEqual(intersect(w('2020-01-01', null), w(null, '2020-06-30')),
  w('2020-01-01', '2020-06-30'));
assert.deepEqual(intersect(UNBOUNDED, w('2020-01-01', null)), w('2020-01-01', null));
// Single-day touching boundary still overlaps (inclusive intervals).
assert.deepEqual(intersect(w('2016-01-01', '2016-12-31'), w('2016-12-31', '2017-06-30')),
  w('2016-12-31', '2016-12-31'));

// intersectAll: surface window bounds both participations.
assert.deepEqual(
  intersectAll([w('2015-01-01', '2019-12-31'), w('2016-01-01', null), w(null, '2018-06-30')]),
  w('2016-01-01', '2018-06-30'));
assert.equal(intersectAll([w('2015-01-01', '2015-12-31'), w('2016-01-01', null)]), null);

// overlapsPeriod: asOf a year / month / day.
assert.equal(overlapsPeriod(w('2019-12-01', '2021-05-31'), '2020'), true);
assert.equal(overlapsPeriod(w('2019-12-01', '2021-05-31'), '2022'), false);
assert.equal(overlapsPeriod(w('2019-12-01', '2021-05-31'), '2021-05'), true);
assert.equal(overlapsPeriod(w('2019-12-01', '2021-05-31'), '2021-06'), false);
assert.equal(overlapsPeriod(w('2023-09-01', null), '2026-01-15'), true);
assert.equal(overlapsPeriod(w('2023-09-01', null), '2023-08-31'), false);
assert.equal(overlapsPeriod(UNBOUNDED, '1990'), true);

assert.equal(formatWindow(w('2019-12-01', '2021-05-31')), '2019-12-01 → 2021-05-31');
assert.equal(formatWindow(w('2023-09-01', null)), '2023-09-01 → ongoing');
assert.equal(formatWindow(UNBOUNDED), 'date unknown', 'undated is not the same as ongoing');
assert.equal(formatWindow(null), 'no overlap');

// The fifteen government awards whose archived USAspending record states a signature date are dated by it,
// surface and rows alike (owner's answer of 2026-11-16, "Yes, restore them", to "Restore the 15 awards with
// their real dates before you publish?"). The reported USSOCOM award has no archived record and keeps the
// day its page was read, which the timeline labels as an observation date.
{
  const readJsonl = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const receipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, r]));
  const parts = readJsonl('data/ledger/participation.jsonl');
  const awards = readJsonl('data/ledger/surfaces.jsonl').filter(s => s.surface_type === 'procurement_contract_surface' && String(s.intake_source).endsWith('person-centered-defense-routers'));
  const signed = awards.filter(s => s.date_basis === 'award_signature_date_in_archived_usaspending_record');
  assert.equal(signed.length, 15);
  for (const s of signed) {
    const record = s.receipt_ids.map(id => receipts.get(id)?.path).find(p => /\/r-usaspending-[^/]+\.json$/.test(p ?? ''));
    const day = JSON.parse(fs.readFileSync(record, 'utf8')).date_signed;
    assert.deepEqual([s.time_start, s.time_end], [day, day], `${s.surface_id}: dated by its signature date`);
    const rows = parts.filter(p => p.surface_id === s.surface_id);
    assert.equal(rows.length, 2, `${s.surface_id}: buyer and supplier`);
    assert.ok(rows.every(p => p.time_start === day && p.time_end === day), `${s.surface_id}: rows dated by the signature date`);
  }
  assert.deepEqual(awards.filter(s => s.date_basis === 'record_retrieval_date').map(s => s.surface_id), ['procurement-award-ussocom-idiq-reported']);
}

console.log('temporal.test: OK');
