import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  DENSE_ACTOR_ROWS,
  TIMELINE_CLUSTER_SLOTS,
  TIMELINE_DESKTOP_METRICS,
  TIMELINE_MAX_LANES,
  TIMELINE_MODEL_SCHEMA,
  TIMELINE_PHONE_METRICS,
  TIMELINE_STAGE_BUDGETS,
  buildTimelineModel,
  defaultTimelineDomain,
  defaultTimelineLanes,
  entityLaneLayout,
  entityTimelineSummary,
  filterTimelineRows,
  layoutTimeline,
  rowInWindow,
  rowPrecision,
  timelineDay
} from '../src/visual-aperture-timeline.mjs';
import { dayIndex, isoFromDayIndex } from '../src/visual-aperture-core.mjs';

const surfaceGraph = JSON.parse(readFileSync('build/surface-graph.json', 'utf8'));
const hopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const source = readFileSync('src/visual-aperture-timeline.mjs', 'utf8');

// --- day helpers (core.mjs owns the day index; social-field.js's ecologyDay is not duplicated)
assert.equal(dayIndex('1970-01-02'), 1);
assert.equal(isoFromDayIndex(dayIndex('2026-08-12')), '2026-08-12');
assert.equal(isoFromDayIndex(timelineDay('2016')), '2016-01-01');
assert.equal(isoFromDayIndex(timelineDay('2016', true)), '2016-12-31');
assert.equal(isoFromDayIndex(timelineDay('2024-02', true)), '2024-02-29');
assert.equal(timelineDay(''), null);
assert.equal(timelineDay(null), null);
assert.equal(timelineDay('2024-02-31'), null);
assert.equal(rowPrecision('2016', '2016'), 'year');
assert.equal(rowPrecision('2024-02', '2024-02'), 'month');
assert.equal(rowPrecision('2025-06-13', ''), 'open');
assert.equal(rowPrecision('2025-06-13', null), 'open');
assert.equal(rowPrecision('', '2025-06-13'), 'undated');
assert.equal(rowPrecision('2025-06-13', '2025-06-13'), 'day');

// --- the module is pure: no DOM, no fetch, no scores, no temporal_envelope
assert.doesNotMatch(source, /\b(?:document|window|globalThis|navigator|localStorage)\.[A-Za-z_$]|\bfetch\s*\(|\bimport\s*\(/, 'no DOM, no fetch, no dynamic import');
assert.equal((source.match(/^import\s/gm) ?? []).length, 1, 'exactly one import statement, on one line, for the flattener');
assert.doesNotMatch(source, /\.temporal_envelope/, 'hop columns come from bases, never from the edge envelope');
assert.doesNotMatch(source, /machine_score|factory_score|deniability|laundry_score|recurrence_score|Structural context index|Factory Score/);
assert.doesNotMatch(source, /data-ap-time-pair/);

// --- real-data model (SPEC j, fix d)
const model = buildTimelineModel(surfaceGraph, hopGraph);
assert.equal(model.schema_version, TIMELINE_MODEL_SCHEMA);
assert.equal(TIMELINE_MODEL_SCHEMA, 'clifford-timeline-model@1');
assert.equal(model.derived, true);
assert.equal(model.graph_effect, 'none');
assert.equal(DENSE_ACTOR_ROWS, 20);
assert.equal(TIMELINE_MAX_LANES, 18, 'the named-lane cap, default and pinned (owner decision 2026-10-23)');
assert.equal(TIMELINE_CLUSTER_SLOTS, 6);

assert.equal(model.counts.rows, 12234); // 2026-11-13 amplification chain: 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4894 -> 6190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion: 286 -> 3,118
assert.equal(model.counts.actor_rows, 3288); // 2026-11-13 amplification chain: 3,263 -> 3,288. 2026-11-12 UK meetings, second intake: 3,050 -> 3,263. 2026-11-12 Bitter Struggle chain: 2,985 -> 3,050. 2026-11-12 UK ministerial meetings: 2,658 -> 2,985. 2026-11-10 hand-judged Form D filings: 2,139 -> 2,658. 2026-11-10 Form D data sets: 1408 -> 2139. 2026-11-10 follow-up: 1399 -> 1408. 2026-11-10 one-pass entry: 1313 -> 1399. 2026-11-10 lens-hunt promotion: 1300 -> 1313. 2026-10-23 final re-pin: 1340 -> 1300. 2026-10-23 five-lane merge: 959 -> 1,340. 2026-10-23 promotion: 200 -> 959 (958 + the Capital Factory listing of joshua-baer, routed to the actor)
assert.equal(model.counts.organization_rows, 8946); // 2026-11-13 amplification chain: 8,927 -> 8,946. 2026-11-12 UK meetings, second intake: 8,561 -> 8,927. 2026-11-12 UK contract awards: 5,764 -> 8,561. 2026-11-12 Bitter Struggle chain: 5,698 -> 5,764. 2026-11-12 UK ministerial meetings: 4,585 -> 5,698. 2026-11-10 hand-judged Form D filings: 4,051 -> 4,585. 2026-11-10 Form D data sets: 3486 -> 4051. 2026-11-10 follow-up: 3356 -> 3486. 2026-11-10 one-pass entry: 3117 -> 3356. 2026-11-10 lens-hunt promotion: 3111 -> 3117. 2026-10-23 five-lane merge: 2,159 -> 3,111. 2026-10-23 promotion: 86 -> 2,159
assert.deepEqual(model.counts.kinds, { day: 10495, span: 1423, year: 2, open: 314, undated: 0 }); // 2026-11-13 amplification chain: day 10,451 -> 10,495. 2026-11-12 UK meetings, second intake: day 9,872 -> 10,451. 2026-11-12 UK contract awards: day 7,075 -> 9,872. 2026-11-12 Bitter Struggle chain: day 6,956 -> 7,075, span 1,411 -> 1,423. 2026-11-12 UK ministerial meetings: day 5,516 -> 6,956. 2026-11-10 hand-judged Form D filings: day 4,463 -> 5,516. 2026-11-10 Form D data sets: day 3,167 -> 4,463 (every Form D row is dated to its filing day). 2026-11-10 follow-up: day 3,028 -> 3,167. 2026-11-10 one-pass entry: day 2,781 -> 3,028, span 1,333 -> 1,411 (the 78 summit-roster rows span 1-2 November 2023). 2026-11-10 lens-hunt promotion: day 2,762 -> 2,781.  2026-10-23 final re-pin: day 2,799 -> 2,762, span 1,335 -> 1,333, open 315 -> 314 (40 merged Form D person rows).  2026-10-23 five-lane merge: day 1,643 -> 2,799, span 1,158 -> 1,335. 2026-10-23 promotion
assert.deepEqual(model.counts.actor_kinds, { day: 2456, span: 675, year: 1, open: 156, undated: 0 }); // 2026-11-13 amplification chain: day 2,431 -> 2,456. 2026-11-12 UK meetings, second intake: day 2,218 -> 2,431. 2026-11-12 Bitter Struggle chain: day 2,158 -> 2,218, span 670 -> 675. 2026-11-12 UK ministerial meetings: day 1,831 -> 2,158. 2026-11-10 hand-judged Form D filings: day 1,312 -> 1,831. 2026-11-10 Form D data sets: day 581 -> 1,312. 2026-11-10 follow-up: day 572 -> 581. 2026-11-10 one-pass entry: day 486 -> 572. 2026-11-10 lens-hunt promotion: day 473 -> 486.  2026-10-23 final re-pin: day 510 -> 473, span 672 -> 670, open 157 -> 156.  2026-10-23 five-lane merge: day 225 -> 510, span 576 -> 672. 2026-10-23 promotion
assert.deepEqual(model.counts.organization_kinds, { day: 8039, span: 748, year: 1, open: 158, undated: 0 }); // 2026-11-13 amplification chain: day 8,020 -> 8,039. 2026-11-12 UK meetings, second intake: day 7,654 -> 8,020. 2026-11-12 UK contract awards: day 4,857 -> 7,654. 2026-11-12 Bitter Struggle chain: day 4,798 -> 4,857, span 741 -> 748. 2026-11-12 UK ministerial meetings: day 3,685 -> 4,798. 2026-11-10 hand-judged Form D filings: day 3,151 -> 3,685. 2026-11-10 Form D data sets: day 2,586 -> 3,151. 2026-11-10 follow-up: day 2,456 -> 2,586. 2026-11-10 one-pass entry: day 2,295 -> 2,456, span 663 -> 741. 2026-11-10 lens-hunt promotion: day 2,289 -> 2,295.  2026-10-23 five-lane merge: day 1,418 -> 2,289, span 582 -> 663. 2026-10-23 promotion
assert.equal(model.counts.hop_bases, 335); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 329 -> 335 (the six roster pairs). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 318 -> 329 (ten Inherent pairs and the co-authorship pair). 2026-11-10 lens-hunt promotion: 300 -> 318. 2026-10-23 final re-pin: 339 -> 300. 2026-10-23 five-lane merge: 135 -> 339. 2026-10-23 promotion: 95 -> 135
assert.equal(model.hopBases.length, 335); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 329 -> 335. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 318 -> 329. 2026-11-10 lens-hunt promotion: 300 -> 318. 2026-10-23 final re-pin: 339 -> 300. 2026-10-23 five-lane merge: 135 -> 339. 2026-10-23 promotion
assert.equal(model.counts.hop_day_surfaces, 66, '335 bases group into 66 (day, surface) objects'); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 65 -> 66 (the roster on 2026-11-13). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 63 -> 65 (the two ruled surfaces). 2026-11-10 lens-hunt promotion: 59 -> 63. 2026-10-23 final re-pin: 64 -> 59. 2026-10-23 five-lane merge: 22 -> 64. 2026-10-23 promotion: 19 -> 22
assert.equal(model.hopDays.size, 66); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 65 -> 66. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 63 -> 65. 2026-11-10 lens-hunt promotion: 59 -> 63. 2026-10-23 final re-pin: 64 -> 59. 2026-10-23 five-lane merge: 22 -> 64. 2026-10-23 promotion
assert.equal(model.counts.hop_days, 48, 'over 48 distinct days'); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 47 -> 48 (2026-11-13). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 45 -> 47 (2026-05-31 and 2026-11-10). 2026-11-10 lens-hunt promotion: 41 -> 45. 2026-10-23 final re-pin: 42 -> 41. 2026-10-23 five-lane merge: 19 -> 42. 2026-10-23 promotion: 18 -> 19
assert.equal(model.counts.hop_bases_by_year['2025'], 62, 'fix (d): 62 bases dated 2025'); // 2026-11-10 lens-hunt promotion: 61 -> 62. 2026-10-23 final re-pin: 66 -> 61. 2026-10-23 five-lane merge: 28 -> 66
assert.equal(model.counts.dense_surfaces, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2 (rndf-2023-programme-roster)
assert.equal(model.counts.dense_rows, 231); // 2026-11-12 UK ministerial meetings: 142 -> 231. 2026-10-23 five-lane merge: 113 -> 142 (+29 rndf-2023 roster rows)
assert.equal(model.counts.refusal_reasons, 3782); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 3,783 -> 3,782. 2026-11-13 amplification chain: 3,765 -> 3,783. 2026-11-12 UK meetings, second intake: 3,694 -> 3,765. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 3,696 -> 3,694. 2026-11-12 UK contract awards: 2,308 -> 3,696. 2026-11-12 Bitter Struggle chain: 2,277 -> 2,308. 2026-11-12 UK ministerial meetings: 2,199 -> 2,277. 2026-11-10 hand-judged Form D filings: 1,683 -> 2,199. 2026-11-10 Form D data sets: 1,245 -> 1,683. 2026-11-10 follow-up: 1244 -> 1245. 2026-11-10 one-pass entry: 1097 -> 1244. 2026-11-10 lens-hunt promotion: 1096 -> 1097. 2026-10-23 final re-pin: 1091 -> 1096. 2026-10-23 five-lane merge: 836 -> 1,091. 2026-10-23 promotion: 35 -> 836
assert.equal(model.counts.refusal_reasons_unrecorded, 5);
assert.equal(model.counts.surfaces_without_evidence_class, 10);
// 2026-10-23 promotion: three LinkedIn role surfaces were folded from two role entries
// each, so one person and one organization hold two dated rows on the same surface. The
// model already disambiguates such rows with a ::2 suffix (see buildTimelineModel); the
// rule kept is that every row has a unique key, and every key is the base key or the base
// key plus that suffix. Old assertion: duplicate_keys === 0 and every key is the base key.
// 2026-10-23 five-lane merge: the list grows from the three folded LinkedIn role surfaces to 42 surfaces. The
// capital-factory lane records a Form D related person who also signed the filing as two rows (related person,
// signer) on the same SEC Form D surface, and the conventions lane lists two people twice on the 2024 and 2025
// a16z American Dynamism programme rosters. The kept rule is unchanged: every key is the base key or base::2.
// 2026-10-23 final re-pin: the list shrinks from 42 to 5 surfaces. The 37 SEC Form D surfaces are gone: the ledger now
// holds one row per person per surface (related-person and signer roles merged, 2026-10-23). The rule is unchanged.
// 2026-11-12 UK ministerial meetings (supervisor ruling 2026-11-12): a ministers' meetings return holds one row per
// meeting, so an entity can have many rows on one return; the model suffixes them ::2, ::3 and so on. The key rule
// is generalised from base or base::2 to base or base::n for n of 2 or more, and the exact list adds the 40 returns
// that hold repeat rows. Nothing else in the assertion is loosened.
// 2026-11-12 UK meetings, second intake: the list adds the 43 second-intake meeting surfaces that hold repeat rows for one
// entity (the key rule and its supervisor ruling of 2026-11-12 are unchanged).
const FOLDED_ROLE_SURFACES = [
  'a16z-american-dynamism-summit-2024-programme-roster',
  'a16z-american-dynamism-summit-2025-programme-roster',
  'jason-schwab-conklin-and-de-decker-president-jssi-advisory-services-linkedin-2018-2019',
  'quay-barnett-anduril-industries-general-manager-warfighter-systems-linkedin-2024-present',
  'seth-price-hotelquickly-ltd-head-of-nodejs-development-linkedin-2015-2015',
  'uk-ministerial-meetings-beis-ministerial-meetings-april-to-june-2022-633463b5',
  'uk-ministerial-meetings-cabinet-office-ministerial-meetings-april-to-june-2026-6ab540e5',
  'uk-ministerial-meetings-cabinet-office-ministerial-meetings-january-to-march-2026-6a3e3663',
  'uk-ministerial-meetings-cabinet-office-ministerial-meetings-july-to-september-2025-6a219df9',
  'uk-ministerial-meetings-cabinet-office-ministers-meetings-october-to-december-2025-69c29a18',
  'uk-ministerial-meetings-cabinet-office-ministers-meetings-october-to-december-2025-69c29a18-further-meetings',
  'uk-ministerial-meetings-dbts-ministerial-meetings-april-to-june-2026-6ab271a3',
  'uk-ministerial-meetings-dbts-ministerial-meetings-january-to-march-2026-6a4d1395',
  'uk-ministerial-meetings-dbts-ministerial-meetings-october-to-december-2025-69d7ab8f',
  'uk-ministerial-meetings-dcms-ministerial-meetings-1-july-to-30-september-2025-69414cce',
  'uk-ministerial-meetings-dcms-ministerial-meetings-1-july-to-30-september-2025-69414cce-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2023-655cac7d',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2023-655cac7d-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2024-672397ef',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2024-672397ef-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2025-68cd4c94',
  'uk-ministerial-meetings-dsit-ministerial-meetings-april-to-june-2025-68cd4c94-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2024-6696693b',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2024-6696693b-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2025-688c722c',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2025-688c722c-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2026-6a3e3cbe',
  'uk-ministerial-meetings-dsit-ministerial-meetings-january-to-march-2026-6a3e3cbe-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2023-65a7a23f',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2023-65a7a23f-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2024-679b6625',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2024-679b6625-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2025-6936dac1',
  'uk-ministerial-meetings-dsit-ministerial-meetings-july-to-september-2025-6936dac1-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2023-65e7227b',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2023-65e7227b-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2024-67e54145',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2024-67e54145-further-meetings',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2025-6a0cb7c5',
  'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2025-6a0cb7c5-further-meetings',
  'uk-ministerial-meetings-hmt-ministerial-meetings-july-to-september-2024-679b464d',
  'uk-ministerial-meetings-hmt-ministers-meetings-1-january-to-31-march-2020-5f219762',
  'uk-ministerial-meetings-hmt-ministers-meetings-1-july-to-30-september-2019-5e3d8700',
  'uk-ministerial-meetings-hmt-ministers-meetings-5f998f6b',
  'uk-ministerial-meetings-hmt-ministers-meetings-5f9998d2',
  'uk-ministerial-meetings-hmt-ministers-meetings-60940817',
  'uk-ministerial-meetings-hmt-ministers-meetings-60f14c61',
  'uk-ministerial-meetings-hmt-ministers-meetings-62447cfd',
  'uk-ministerial-meetings-hmt-ministers-meetings-624592ac',
  'uk-ministerial-meetings-hmt-ministers-meetings-654a62b7',
  'uk-ministerial-meetings-hmt-ministers-meetings-65cb78fd',
  'uk-ministerial-meetings-hmt-ministers-meetings-april-to-june-2022-63359d7c',
  'uk-ministerial-meetings-hmt-ministers-meetings-january-to-march-2022-62d024c0',
  'uk-ministerial-meetings-hmts-ministerial-meetings-april-to-june-2025-68d50fe0',
  'uk-ministerial-meetings-hmts-ministerial-meetings-april-to-june-2025-68d50fe0-further-meetings',
  'uk-ministerial-meetings-hmts-ministerial-meetings-january-to-march-2025-68bae311',
  'uk-ministerial-meetings-hmts-ministerial-meetings-july-to-september-2025-69414470',
  'uk-ministerial-meetings-hmts-ministerial-meetings-july-to-september-2025-69414470-further-meetings',
  'uk-ministerial-meetings-hmts-ministerial-meetings-october-to-december-2024-685a87ad',
  'uk-ministerial-meetings-hmts-ministerial-meetings-october-to-december-2024-685a87ad-further-meetings',
  'uk-ministerial-meetings-hmts-ministerial-meetings-october-to-december-2025-69bd3123',
  'uk-ministerial-meetings-home-office-s-ministerial-meetings-april-to-june-2023-652fdded',
  'uk-ministerial-meetings-home-office-s-ministerial-meetings-january-to-march-2023-64b7d11a',
  'uk-ministerial-meetings-home-office-s-ministerial-meetings-january-to-march-2024-66c48bf9',
  'uk-ministerial-meetings-home-office-s-ministerial-meetings-october-to-december-2023-65fc2414',
  'uk-ministerial-meetings-home-office-s-ministerial-meetings-october-to-december-2023-65fc2414-further-meetings',
  'uk-ministerial-meetings-meetings-july-september-2019-5e299d86',
  'uk-ministerial-meetings-mhclg-ministerial-meetings-october-to-december-2018-5c94bc41',
  'uk-ministerial-meetings-ministerial-meetings-july-to-september-2019-5e2987fb',
  'uk-ministerial-meetings-mod-s-ministerial-meetings-july-to-september-2025-693ff9ec',
  'uk-ministerial-meetings-rt-hon-liz-truss-mp-and-rt-hon-rishi-sunak-mp-meetings-october-to-dece-6423f3ac',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-april-to-june-2023-6530fa12',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-april-to-june-2024-66f66969-further-meetings',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-january-to-march-2023-64b7fb13',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-january-to-march-2024-66b62b7f',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-july-to-september-2023-657ad119',
  'uk-ministerial-meetings-rt-hon-rishi-sunak-mp-meetings-october-to-december-2023-65faf9fc',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-april-to-june-2025-68d54fb8',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-january-to-march-2025-685d5305',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-january-to-march-2026-6a3e3656',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-july-to-september-2025-69958c31',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-october-to-december-2024-67e56857',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-october-to-december-2024-67e56857-further-meetings',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-meetings-october-to-december-2025-69c299db',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-ministerial-meetings-april-to-june-2-6ab5213d',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-ministerial-meetings-april-to-june-2-6ab5213d-further-meetings',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-rt-hon-rishi-sunak-mp-meetings-july-679b77de',
  'uk-ministerial-meetings-rt-hon-sir-keir-starmer-kcb-kc-mp-rt-hon-rishi-sunak-mp-meetings-july-679b77de-further-meetings',
];
assert.equal(model.counts.duplicate_keys, 831); // 2026-11-12 UK meetings, second intake: 580 -> 831. 2026-11-12 UK ministerial meetings: 5 -> 580. 2026-10-23 final re-pin: 45 -> 5. 2026-10-23 five-lane merge: 6 -> 45 (see FOLDED_ROLE_SURFACES). 2026-10-23 promotion: 0 -> 6 (one actor and one organization row on each folded surface)
assert.equal(model.rowsByKey.size, 12234, 'row key surface_id::participant_type::entity_id[::n] is unique'); // 2026-11-13 amplification chain: 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion: 286 -> 3,118
const baseRowKey = row => `${row.surface_id}::${row.participant_type}::${row.entity_id}`;
assert.ok(model.rows.every(row => row.key === baseRowKey(row) || (row.key.startsWith(`${baseRowKey(row)}::`) && /^(?:[2-9]|[1-9][0-9]+)$/.test(row.key.slice(baseRowKey(row).length + 2))))); // 2026-11-12 UK ministerial meetings (supervisor ruling): base or base::n, n of 2 or more (was base or base::2).
assert.deepEqual([...new Set(model.rows.filter(row => row.key !== baseRowKey(row)).map(row => row.surface_id))].sort(), FOLDED_ROLE_SURFACES,
  'only the listed surfaces carry a suffixed key'); // 2026-10-23 five-lane merge: was 'only the three folded role surfaces'
assert.ok(model.rows.every(row => Array.isArray(row.receipt_ids) && row.receipt_ids.length > 0), 'every row keeps its receipts');
assert.ok(model.rows.every(row => typeof row.evidence_class === 'string'), 'every row keeps its evidence class');
assert.ok(model.hopBases.every(basis => basis.day != null && basis.end_day === basis.day), 'every basis is a dated single day');
assert.deepEqual(model.range, { // 2026-11-13 amplification chain: range 1982-05-01..2026-11-10 -> 1982-05-01..2026-11-13 (end of record 2026-11-10 -> 2026-11-13: NIK's quote-post, and Encode's team page and DePue's about page dated by the retrieval day). 2026-11-12 Bitter Struggle chain: range 1982-05-01..2026-10-23 -> 1982-05-01..2026-11-10 (end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface). 2026-10-23 promotion: range 2016-01-01..2026-08-12 -> 1982-05-01..2026-10-23
  first_day: '1982-05-01', last_day: '2026-11-13',
  first_day_index: dayIndex('1982-05-01'), last_day_index: dayIndex('2026-11-13'),
  distinct_start_days: 1825, // 2026-11-13 amplification chain: 1820 -> 1825. 2026-11-12 UK meetings, second intake: 1756 -> 1820. 2026-11-12 UK contract awards: 1428 -> 1756. 2026-11-12 Bitter Struggle chain: 1417 -> 1428. 2026-11-12 UK ministerial meetings: 1153 -> 1417. 2026-11-10 hand-judged Form D filings: 952 -> 1153. 2026-11-10 Form D data sets: 662 -> 952. 2026-11-10 follow-up: 661 -> 662. 2026-11-10 one-pass entry: 542 -> 661. 2026-11-10 lens-hunt promotion: 534 -> 542. 2026-10-23 five-lane merge: 339 -> 534
  years_with_rows: ['1982', '1983', '1984', '1986', '1988', '1989', '1990', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
    '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015',
    '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
});
assert.equal(model.lanes.actor.size, 512); // 2026-11-13 amplification chain: 504 -> 512. 2026-11-12 Bitter Struggle chain: 456 -> 504. 2026-11-12 UK ministerial meetings: 455 -> 456. 2026-11-10 follow-up: 446 -> 455. 2026-11-10 one-pass entry: 398 -> 446. 2026-11-10 lens-hunt promotion: 391 -> 398. 2026-10-23 five-lane merge: 279 -> 391. 2026-10-23 promotion: 163 -> 279
assert.equal(model.lanes.organization.size, 2449); // 2026-11-13 amplification chain: 2,440 -> 2,449. 2026-11-12 Bitter Struggle chain: 2,431 -> 2,440. 2026-11-10 hand-judged Form D filings: 2,190 -> 2,431. 2026-11-10 Form D data sets: 1,911 -> 2,190. 2026-11-10 follow-up: 1807 -> 1911. 2026-11-10 one-pass entry: 1705 -> 1807. 2026-11-10 lens-hunt promotion: 1703 -> 1705. 2026-10-23 five-lane merge: 1,521 -> 1,703. 2026-10-23 promotion: 27 -> 1,521
assert.equal(model.lanes.type.size, 17); // 2026-11-12 Bitter Struggle chain: 16 -> 17. 2026-10-23 five-lane merge: 14 -> 16 surface types
assert.equal(model.lanes.surface.size, 3848); // 2026-11-13 amplification chain: 3,830 -> 3,848. 2026-11-12 UK meetings, second intake: 3,759 -> 3,830. 2026-11-12 UK contract awards: 2,371 -> 3,759. 2026-11-12 Bitter Struggle chain: 2,340 -> 2,371. 2026-11-12 UK ministerial meetings: 2,262 -> 2,340. 2026-11-10 hand-judged Form D filings: 1,746 -> 2,262. 2026-11-10 Form D data sets: 1,308 -> 1,746. 2026-11-10 follow-up: 1307 -> 1308. 2026-11-10 one-pass entry: 1160 -> 1307. 2026-11-10 lens-hunt promotion: 1155 -> 1160. 2026-10-23 five-lane merge: 858 -> 1,155. 2026-10-23 promotion: 54 -> 858

// Year precision and the one open-ended row are handled as the design says.
const yearRows = model.rows.filter(row => row.kind === 'year');
assert.deepEqual(yearRows.map(row => row.entity_id).sort(), ['dominic-cummings', 'vote-leave']);
for (const row of yearRows) {
  assert.equal(row.precision, 'year');
  assert.equal(isoFromDayIndex(row.start_day), '2016-01-01');
  assert.equal(isoFromDayIndex(row.end_day), '2016-12-31');
}
// 2026-10-23 promotion: 315 open-ended rows (LinkedIn roles stated "Present"); the
// detachment-201 / us-army row is still the first and is checked as before.
const openRow = model.rows.find(row => row.kind === 'open');
assert.equal(model.rows.filter(row => row.kind === 'open').length, 314); // 2026-10-23 final re-pin: 315 -> 314. 2026-10-23 promotion
assert.ok(model.rows.filter(row => row.kind === 'open').every(row => row.end_day === null && row.precision === 'open'));
assert.equal(openRow.key, 'detachment-201-program-context-2025::organization::us-army');
assert.equal(openRow.precision, 'open');
assert.equal(openRow.end_day, null);
assert.equal(openRow.time_end, '');

// Refusal reasons: ledger reason wins, the compiler's generic reason is marked unrecorded.
assert.deepEqual(model.refusalReasons.get('ben-warner-no10-digital-data-role-observation-2020-2021'), { reason: 'broad_institution_context_only', reason_recorded: true });
assert.deepEqual(model.refusalReasons.get('electric-twin-ben-warner-director-tenure-2023-09-28'), { reason: 'surface_not_hop_eligible', reason_recorded: false });
const unrecordedRow = model.rowsByKey.get('electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner');
assert.equal(unrecordedRow.reason_recorded, false);
assert.equal(unrecordedRow.surface_hop_eligible, false);
assert.equal(unrecordedRow.kind, 'span');

// Ben Warner lane (fix d: electric-twin 6; 7 official and 3 primary_public).
// 2026-10-23 five-lane merge: two synthetic-constituency rows (2025-07-07 reported, 2026-07-29 primary public):
// 10 -> 12 rows, electric-twin 6 -> 7, no-10 2 -> 3, day kinds 8 -> 10.
const benWarner = model.lanes.actor.get('ben-warner');
assert.equal(benWarner.row_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(benWarner.surface_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(benWarner.hop_eligible_surface_count, 8); // 2026-11-10 lens-hunt promotion: 6 -> 8.
assert.equal(benWarner.first_day, '2018-01-24');
assert.equal(benWarner.last_day, '2026-08-11');
assert.deepEqual(benWarner.evidence_counts, { official: 12, primary_public: 4, reported: 1 }); // 2026-11-10 lens-hunt promotion: official 7 -> 12 (four SAGE rows, the UKSA panel row).  2026-10-23 five-lane merge: was { official: 7, primary_public: 3 }
assert.equal(benWarner.co_organization_counts['electric-twin'], 7); // 2026-10-23 five-lane merge: 6 -> 7
assert.equal(benWarner.co_organization_counts['no-10'], 3); // 2026-10-23 five-lane merge: 2 -> 3
assert.equal(benWarner.hop_basis_count, 18); // 2026-11-10 lens-hunt promotion: 12 -> 18.
assert.deepEqual(benWarner.kind_counts, { day: 15, span: 2 }); // 2026-11-10 lens-hunt promotion: day 10 -> 15.  2026-10-23 five-lane merge: day 8 -> 10
assert.deepEqual(
  benWarner.rows.map(row => `${row.kind}:${row.time_start}..${row.time_end}`),
  ['day:2018-01-24..2018-01-24', 'day:2020-03-08..2020-03-08', 'span:2020-03-13..2021-05-13', 'day:2020-03-18..2020-03-18', 'day:2020-10-22..2020-10-22',
    'day:2020-12-03..2020-12-03', 'day:2021-01-07..2021-01-07', 'day:2023-06-09..2023-06-09', 'span:2023-09-28..2026-08-11',
    'day:2023-09-28..2023-09-28', 'day:2025-07-07..2025-07-07', 'day:2025-08-05..2025-08-05', 'day:2025-09-12..2025-09-12', 'day:2025-09-27..2025-09-27',
    'day:2026-02-11..2026-02-11', 'day:2026-07-08..2026-07-08', 'day:2026-07-29..2026-07-29']
); // 2026-11-10 lens-hunt promotion: + the four SAGE meeting days and the 2023-06-09 UKSA panel announcement. 2026-10-23 five-lane merge: + day:2025-07-07 and day:2026-07-29
const electricTwin = model.lanes.organization.get('electric-twin');
assert.equal(electricTwin.row_count, 22); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(electricTwin.kind_counts.span, 5, 'fix (d): electric-twin 5 spans');
assert.equal(electricTwin.first_day, '2023-09-28');
assert.equal(electricTwin.last_day, '2026-08-12');

// The Dialog roster: exactly one dense object, 112 listed names, 2 documented elsewhere.
// Narrowed 2026-10-23 five-lane merge: the Reagan National Defense Forum 2023 programme roster (22 listed,
// 29 rows) is now a second dense object and sorts first. Old: model.dense.length === 1 and dialog = model.dense[0].
// New: model.dense.length === 2 and the Dialog block is found by its surface id; the Dialog assertions below are unchanged in scope.
assert.equal(model.dense.length, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3.
assert.deepEqual(model.dense.map(block => block.surface_id), ['rndf-2023-programme-roster', 'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2025-6a0cb7c5', 'dialog-public-directory-exposure-2026-06-16']); // 2026-11-12 UK ministerial meetings: the DSIT return for October to December 2025 (89 rows) is dense and joins as a contained block.
const dialog = model.dense.find(block => block.surface_id === 'dialog-public-directory-exposure-2026-06-16');
assert.equal(dialog.surface_id, 'dialog-public-directory-exposure-2026-06-16');
assert.equal(dialog.listed_count, 112);
assert.equal(dialog.row_count, 113);
assert.equal(dialog.member_keys.length, 113);
assert.equal(dialog.iso_day, '2026-06-16');
assert.deepEqual(dialog.evidence_counts, { primary_public: 112, reported: 1 });
assert.equal(dialog.refusal_reason, 'dense_directory_listing_not_shared_participation');
assert.equal(dialog.hop_eligible, false);
assert.equal(dialog.receipt_ids.length, 3);
assert.deepEqual(dialog.elsewhere.map(entry => [entry.actor_id, entry.other_surface_count]), [['karen-karniol-tambour', 131], ['joe-lonsdale', 112], ['mike-novogratz', 108], ['henry-kravis', 42], ['elon-musk', 41], ['matt-clifford', 23], ['chamath-palihapitiya', 16], ['scott-bessent', 15], ['matt-cohler', 13], ['reid-hoffman', 9], ['tom-tugendhat', 8], ['wes-moore', 8], ['eric-schmidt', 7], ['severin-hacker', 5], ['thasunda-brown-duckett', 5], ['adam-grant', 4], ['immad-akhund', 4], ['mario-schlosser', 4], ['scott-stephenson', 4], ['shivon-zilis', 4], ['adam-d-angelo', 3], ['jim-himes', 3], ['jonathan-haidt', 3], ['jonathan-ross', 3], ['cesar-carvalho', 2], ['garry-kasparov', 2], ['strauss-zelnick', 2], ['tyler-cowen', 2], ['wences-casares', 2], ['atul-gawande', 1], ['dan-driscoll', 1], ['jared-kushner', 1], ['jens-spahn', 1], ['joseph-gordon-levitt', 1], ['kim-scott', 1], ['lawrence-summers', 1], ['pete-shadbolt', 1], ['scott-belsky', 1], ['scott-cook', 1], ['stan-mcchrystal', 1]]); // 2026-11-12 UK meetings, second intake: the same 40 names; Tom Tugendhat 5 -> 8 rows elsewhere, so he moves ahead of Wes Moore.  2026-11-12 Bitter Struggle chain: matt-clifford 18 -> 23 (five new surfaces: the Inherent advisory role, the Action Plan lead-reviewer term, the AISI Advisory Board, and the reported Anthropic appointment and ARIA exit). 2026-11-12 UK ministerial meetings: was the 33 names above it; seven listed people join with meeting rows (eric-schmidt, tom-tugendhat, jonathan-haidt, garry-kasparov, atul-gawande, jens-spahn, stan-mcchrystal), and Matt Clifford, Reid Hoffman and Wes Moore gain rows. 2026-11-10 hand-judged Form D filings: was the 21 names above it; twelve listed people join with hand-judged Form D rows (Karen Karniol-Tambour, Mike Novogratz, Henry Kravis, Scott Bessent and eight more) and Elon Musk, Matt Cohler, Wes Moore and Joe Lonsdale gain rows. 2026-11-10 Form D data sets: was [['joe-lonsdale', 13], ['matt-clifford', 12], ['jim-himes', 3], ['tyler-cowen', 2], ['wes-moore', 2], ['dan-driscoll', 1]]; the data-set filings add rows for Joe Lonsdale, Matt Clifford (Entrepreneur First funds) and fifteen listed people who join the list. 2026-11-10 one-pass entry: was [['matt-clifford', 12], ['joe-lonsdale', 9], ...]; Joe Lonsdale gains four 8VC Form D filings. 2026-10-23 five-lane merge: was [['matt-clifford', 8], ['jim-himes', 3], ['joe-lonsdale', 2], ['dan-driscoll', 1]]. 2026-10-23 promotion: + jim-himes, joe-lonsdale
assert.equal(dialog.nowhere_else_count, 72); // 2026-11-12 UK ministerial meetings: 79 -> 72. 2026-11-10 hand-judged Form D filings: 91 -> 79. 2026-11-10 Form D data sets: 106 -> 91. 2026-10-23 five-lane merge: 108 -> 106. 2026-10-23 promotion: 110 -> 108

// --- default lanes (owner decision 2026-10-23: the 18 with the most dated rows; shown by first day then label)
const actorLanes = defaultTimelineLanes(model, 'actor');
// Updated 2026-10-23 (owner decision). Before: every actor on two or more surfaces had a
// default lane (15 at 2.1.0, 117 after the promotion). Now: the default People lanes are the
// TIMELINE_MAX_LANES (18) people with the most dated rows, ties by label, drawn in the
// first-day-then-label order (fix a); everyone else sits in one "Other people (N)" strip.
const denseSurfaceIds = new Set(model.dense.map(block => block.surface_id));
const datedRowCount = lane => lane.rows.filter(row => row.start_day != null && !(lane.kind === 'actor' && denseSurfaceIds.has(row.surface_id))).length;
const topByDatedRows = laneMap => [...laneMap.values()].filter(lane => datedRowCount(lane) > 0)
  // 2026-10-23 (owner): hop-bearing lanes rank first, then hop-eligible surfaces, then dated rows, then label.
  .sort((a, b) => (b.hop_basis_count ?? 0) - (a.hop_basis_count ?? 0) || (b.hop_eligible_surface_count ?? 0) - (a.hop_eligible_surface_count ?? 0) || datedRowCount(b) - datedRowCount(a) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
  .slice(0, TIMELINE_MAX_LANES).map(lane => lane.id).sort();
assert.equal(actorLanes.lanes.length, 18, 'the default People view shows 18 named lanes');
assert.deepEqual(actorLanes.lanes.map(lane => lane.id).sort(), topByDatedRows(model.lanes.actor), 'the 18 people ranked hop bases first, then dated rows, ties by label');
for (let index = 1; index < actorLanes.lanes.length; index += 1) {
  const [a, b] = [actorLanes.lanes[index - 1], actorLanes.lanes[index]];
  assert.ok(a.first_day_index < b.first_day_index || (a.first_day_index === b.first_day_index && !(b.label < a.label)), `lanes order by first day, then label: ${a.id} before ${b.id}`);
}
const PINNED_LANES_DESKTOP_LIMIT = 680; // 2026-11-12: raised from 660 by the supervising session with the Bitter Struggle chain pass, and from 640 with the UK ministerial meetings pass; not owner decisions (see the pinned-lanes check).
const ORIGINAL_DEFAULT_LANES = ['dominic-cummings', 'ben-warner', 'marc-warner', 'saul-klein', 'matt-clifford', 'simon-case', 'alex-cooper',
  'fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons', 'rich-drake', 'michael-muthukrishna', 'dan-driscoll'];
assert.equal(actorLanes.lanes.reduce((sum, lane) => sum + lane.row_count, 0), 319, '319 rows on the 18 named lanes'); // 2026-11-12 Bitter Struggle chain: 314 -> 319 (the same 18 people; Matt Clifford +5). 2026-11-12 UK ministerial meetings: 307 -> 314 (the same 18 people; John Healey +5 meeting rows, Matt Clifford +2). 2026-11-10 hand-judged Form D filings: 294 -> 307 (the same 18 people; Steve Braverman +12 hand-judged Form D rows, Joe Lonsdale +1). 2026-11-10 Form D data sets: 177 -> 294 (by the unchanged ranking, Steve Braverman, now with four rows, takes Doron Landau's slot; Joe Lonsdale +98 Form D rows, Matt Clifford +4, Katherine Boyle +4, Joshua Baer +3, David Braverman +3, Horacio Rozanski +2). 2026-11-10 one-pass entry: 164 -> 177 (the same 18 people; Horacio Rozanski +8 Form D rows, Joe Lonsdale +4, Heidi Shyu +1). 2026-11-10 lens-hunt promotion: 159 -> 164. 2026-10-23 final re-pin: 198 -> 159. 2026-10-23 five-lane merge: 40 -> 198 // 2026-10-23: hop-first ranking (row-count ranking gave 236; 2.1.0: 52 rows on 15)
assert.equal(actorLanes.strip.row_count, 2818, 'every other actor row outside the dense blocks'); // 2026-11-13 amplification chain: 2,793 -> 2,818. 2026-11-12 UK meetings, second intake: 2,580 -> 2,793. 2026-11-12 Bitter Struggle chain: 2,520 -> 2,580. 2026-11-12 UK ministerial meetings: 2,224 -> 2,520. 2026-11-10 hand-judged Form D filings: 1,718 -> 2,224. 2026-11-10 Form D data sets: 1,104 -> 1,718. 2026-11-10 follow-up: 1095 -> 1104. 2026-11-10 one-pass entry: 1022 -> 1095. 2026-11-10 lens-hunt promotion: 1014 -> 1022. 2026-10-23 final re-pin: 1017 -> 1014. 2026-10-23 five-lane merge: 808 -> 1,017 // 2.1.0: 38 single-surface rows // 2026-10-23 hop-first default lanes: 611 -> 808
assert.equal(actorLanes.strip.entity_count, 422); // 2026-11-13 amplification chain: 414 -> 422. 2026-11-12 Bitter Struggle chain: 366 -> 414. 2026-11-12 UK ministerial meetings: 358 -> 366. 2026-11-10 hand-judged Form D filings: 346 -> 358. 2026-11-10 Form D data sets: 331 -> 346. 2026-11-10 follow-up: 322 -> 331. 2026-11-10 one-pass entry: 274 -> 322. 2026-11-10 lens-hunt promotion: 267 -> 274. 2026-10-23 five-lane merge: 153 -> 267
assert.equal(actorLanes.strip.label, 'Other people (422)'); // 2026-11-13 amplification chain: 414 -> 422 (the 8 people minted for the chain). 2026-11-12 Bitter Struggle chain: Other people (366) -> Other people (414). 2026-11-12 UK ministerial meetings: Other people (358) -> Other people (366). 2026-11-10 hand-judged Form D filings: Other people (346) -> Other people (358). 2026-11-10 Form D data sets: Other people (331) -> Other people (346). 2026-11-10 follow-up: Other people (322) -> Other people (331). 2026-11-10 one-pass entry: Other people (274) -> Other people (322). 2026-11-10 lens-hunt promotion: Other people (267) -> Other people (274). 2026-10-23 five-lane merge: 153 -> 267
assert.equal(actorLanes.strip.single_surface_only, false);
assert.equal(actorLanes.blocks.length, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2
const organizationLanes = defaultTimelineLanes(model, 'organization');
// Owner decision 2026-10-23: the same 18-lane cap and dated-row ranking for Organizations.
assert.equal(organizationLanes.lanes.length, 18); // 2.1.0: 14 multi-surface organizations
assert.deepEqual(organizationLanes.lanes.map(lane => lane.id).sort(), topByDatedRows(model.lanes.organization));
assert.equal(organizationLanes.lanes.reduce((sum, lane) => sum + lane.row_count, 0), 981); // 2026-11-12 UK meetings, second intake: 978 -> 981. 2026-11-12 UK contract awards: 583 -> 978. 2026-11-12 Bitter Struggle chain: 575 -> 583. 2026-11-12 UK ministerial meetings: 539 -> 575. 2026-11-10 Form D data sets: 431 -> 539. 2026-11-10 follow-up: 430 -> 431. 2026-11-10 one-pass entry: 413 -> 430. 2026-10-23 five-lane merge: 197 -> 413 // 2.1.0: 73 // 2026-10-23 hop-first default lanes: 274 -> 197
assert.equal(organizationLanes.strip.row_count, 7965, 'every other organization row'); // 2026-11-13 amplification chain: 7,946 -> 7,965. 2026-11-12 UK meetings, second intake: 7,583 -> 7,946. 2026-11-12 UK contract awards: 5,181 -> 7,583. 2026-11-12 Bitter Struggle chain: 5,123 -> 5,181. 2026-11-12 UK ministerial meetings: 4,046 -> 5,123. 2026-11-10 hand-judged Form D filings: 3,512 -> 4,046. 2026-11-10 Form D data sets: 3,055 -> 3,512. 2026-11-10 follow-up: 2926 -> 3055. 2026-11-10 one-pass entry: 2704 -> 2926. 2026-11-10 lens-hunt promotion: 2698 -> 2704. 2026-10-23 five-lane merge: 1,962 -> 2,698 // 2.1.0: 13 single-surface rows // 2026-10-23 hop-first default lanes: 1885 -> 1962
assert.equal(organizationLanes.strip.label, `Other organizations (${organizationLanes.strip.entity_count})`);
assert.equal(organizationLanes.strip.entity_count, 2431); // 2026-11-13 amplification chain: 2,422 -> 2,431. 2026-11-12 Bitter Struggle chain: 2,413 -> 2,422. 2026-11-10 hand-judged Form D filings: 2,172 -> 2,413. 2026-11-10 Form D data sets: 1,893 -> 2,172. 2026-11-10 follow-up: 1789 -> 1893. 2026-11-10 one-pass entry: 1687 -> 1789. 2026-11-10 lens-hunt promotion: 1685 -> 1687. 2026-10-23 five-lane merge: 1,503 -> 1,685
assert.equal(organizationLanes.blocks.length, 0);
assert.equal(defaultTimelineLanes(model, 'organization', { order: 'surface_count' }).lanes[0].id, 'mod'); // 2026-11-12 UK contract awards: capital-factory -> mod. 2026-10-23 five-lane merge: anduril-industries -> capital-factory. 2026-10-23 promotion: electric-twin -> anduril-industries (39 surfaces)
const typeLanes = defaultTimelineLanes(model, 'type');
assert.equal(typeLanes.lanes.length, 17, 'all 17 surface types fit under the 18-lane cap'); // 2026-11-12 Bitter Struggle chain: 16 -> 17 (governance_continuity_surface: the ACOBA and DSIT business appointment records). 2026-10-23 five-lane merge: 14 -> 16
assert.equal(typeLanes.lanes.reduce((sum, lane) => sum + lane.row_count, 0), 3848, 'type lanes hold surfaces, not participation rows'); // 2026-11-13 amplification chain: 3,830 -> 3,848. 2026-11-12 UK meetings, second intake: 3,759 -> 3,830. 2026-11-12 UK contract awards: 2,371 -> 3,759. 2026-11-12 Bitter Struggle chain: 2,340 -> 2,371. 2026-11-12 UK ministerial meetings: 2,262 -> 2,340. 2026-11-10 hand-judged Form D filings: 1,746 -> 2,262. 2026-11-10 Form D data sets: 1,308 -> 1,746. 2026-11-10 follow-up: 1307 -> 1308. 2026-11-10 one-pass entry: 1160 -> 1307. 2026-11-10 lens-hunt promotion: 1155 -> 1160. 2026-10-23 five-lane merge: 858 -> 1,155. 2026-10-23 promotion: 54 -> 858
assert.equal(typeLanes.strip.row_count, 0);
const pinnedLanes = defaultTimelineLanes(model, 'actor', { laneIds: ['ben-warner', 'nobody', 'marc-warner', 'ben-warner'] });
assert.deepEqual(pinnedLanes.lanes.map(lane => lane.id), ['ben-warner', 'marc-warner']);
assert.equal(pinnedLanes.pinned, true);
assert.equal(pinnedLanes.strip.row_count, 3288 - 17 - 5 - 112 - 22 - 24, 'the strip holds every other actor row; dense rows stay in the block unless the actor has a lane'); // 2026-11-13 amplification chain: 3,263 -> 3,288 actor rows; the lane and block rows taken off are unchanged. 2026-11-12 UK meetings, second intake: 3,050 -> 3,263 actor rows; the lane and block rows taken off are unchanged. 2026-11-12 Bitter Struggle chain: 2,985 -> 3,050 actor rows; the lane and block rows taken off are unchanged. 2026-11-12 UK ministerial meetings: 2,985 actor rows, less the 17 and 5 rows on the Ben Warner and Marc Warner lanes and the 112, 22 and 24 actor rows the Dialog, rndf-2023 and DSIT October to December 2025 blocks hold (was 2,658 - 17 - 3 - 112 - 23). 2026-11-10 hand-judged Form D filings: 2,139 -> 2,658 actor rows. 2026-11-10 Form D data sets: 1,408 -> 2,139 actor rows. 2026-11-10 follow-up: 1,399 -> 1,408 actor rows. 2026-11-10 one-pass entry: 1,313 -> 1,399 actor rows. 2026-11-10 lens-hunt promotion: 1,300 -> 1,313 actor rows, Ben Warner 12 -> 17 rows, Marc Warner 2 -> 3 (SAGE 17).  2026-10-23 final re-pin: 1,340 -> 1,300 actor rows (40 merged Form D person rows).  2026-10-23 five-lane merge: 959 - 10 - 2 - 112 -> 1,340 - 12 - 2 - 112 - 23 (Ben Warner 12 rows; the rndf-2023 block holds 23 actor rows). 2026-10-23 promotion: 200 -> 959 actor rows
assert.equal(defaultTimelineLanes(model, 'actor', { laneIds: [...model.lanes.actor.keys()].slice(0, 20) }).lanes.length, 18, 'at most 18 named lanes');
// 2026-10-23 promotion: the default list is no longer 15, so the "one more drops none" check
// runs on the original 15 defaults it was written for.
assert.equal(defaultTimelineLanes(model, 'actor', { laneIds: ['auren-hoffman', ...ORIGINAL_DEFAULT_LANES] }).lanes.length, 16, 'adding one lane to the 15 defaults drops none of them');

// --- default domain by row share
assert.deepEqual(defaultTimelineDomain(model, 690), { from: '2019-01-01', to: '2026-12-13', from_day: dayIndex('2019-01-01'), to_day: dayIndex('2026-12-13'), auto: true, share: 0.867, threshold: 0.85 }); // 2026-11-13 amplification chain: to 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record 2026-11-10 -> 2026-11-13); share unchanged. 2026-11-12 UK meetings, second intake: share 0.860 -> 0.867; the domain is unchanged. 2026-11-12 UK contract awards: 2017-01-01 (share 0.853) -> 2019-01-01 (share 0.860): the award rows, all dated 2019 to 2026, lift the share kept from 2019 over the 0.85 threshold, so the automatic domain opens two years later; the domain rule is unchanged. 2026-11-12 Bitter Struggle chain: to 2026-11-22 -> 2026-12-10 (end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface), share 0.851 -> 0.853. 2026-11-12 UK ministerial meetings: 2015-01-01 (share 0.864) -> 2017-01-01 (share 0.851): the meeting rows, nearly all dated 2023 to 2026, lift the share kept from 2017 over the 0.85 threshold, so the automatic domain opens two years later; the domain rule is unchanged. 2026-11-10 hand-judged Form D filings: 2016-01-01 (share 0.850) -> 2015-01-01 (share 0.864): the hand-judged filings add rows dated before 2016, so the share kept from 2016 falls to 0.845, under the 0.85 threshold, and the automatic domain opens a year earlier; the domain rule is unchanged. 2026-11-10 Form D data sets: 2017-01-01 (share 0.85) -> 2016-01-01 (share 0.850): the data-set filings add rows dated 2009 to 2016, so the share kept from 2017 falls to 0.826, under the 0.85 threshold, and the automatic domain opens a year earlier; the domain rule is unchanged. 2026-11-10 follow-up: 2016-01-01 (share 0.863) -> 2017-01-01 (share 0.85): the 139 new rows, 130 of them on 17 October 2023, lift the share kept from 2017 to the 0.85 threshold, so the automatic domain opens a year later. 2026-10-23 five-lane merge: 2013-01-01 (share 0.858) -> 2016-01-01 (share 0.863). 2026-10-23 promotion: 2023-01-01..2026-09-11 -> 2013-01-01..2026-11-22
assert.equal(defaultTimelineDomain(model, 880).from, '2019-01-01'); // 2026-11-12 UK contract awards: 2017 -> 2019 (the automatic domain, as at 690). 2026-11-12 UK ministerial meetings: 2015 -> 2017 (the automatic domain, as at 690). 2026-11-10 hand-judged Form D filings: 2016 -> 2015 (the automatic domain, as at 690). 2026-11-10 Form D data sets: 2017 -> 2016 (the automatic domain, as at 690). 2026-11-10 follow-up: 2016 -> 2017 (the automatic domain, as at 690). 2026-10-23 five-lane merge: 2013 -> 2016. 2026-10-23 promotion
assert.deepEqual(defaultTimelineDomain(model, 216), { from: '2023-01-01', to: '2026-12-13', from_day: dayIndex('2023-01-01'), to_day: dayIndex('2026-12-13'), auto: true, share: 0.719, threshold: 0.7 }); // 2026-11-13 amplification chain: to 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record), share 0.718 -> 0.719; the phone domain still opens 2023-01-01. 2026-11-12 UK meetings, second intake: share 0.721 -> 0.718; the phone domain is unchanged. 2026-11-12 UK contract awards: 2022-01-01 (share 0.709) -> 2023-01-01 (share 0.721): the share kept from 2023 rises over the 0.7 threshold, so the phone domain opens a year later; the rule is unchanged. 2026-11-12 Bitter Struggle chain: to 2026-11-22 -> 2026-12-10, share 0.705 -> 0.709. 2026-11-12 UK ministerial meetings: 2021-01-01 (share 0.707) -> 2022-01-01 (share 0.705): the share kept from 2022 rises over the 0.7 threshold, so the phone domain opens a year later; the rule is unchanged. 2026-11-10 hand-judged Form D filings: share 0.717 -> 0.707; the phone domain is unchanged. 2026-11-10 Form D data sets: 2022-01-01 (share 0.72) -> 2021-01-01 (share 0.717): the share kept from 2022 falls to 0.665, under the 0.7 threshold, so the phone domain opens a year earlier; the rule is unchanged. 2026-11-10 follow-up: share 0.712 -> 0.72; the phone domain is unchanged. 2026-11-10 one-pass entry: share 0.714 -> 0.712; the domain is unchanged. 2026-11-10 lens-hunt promotion: share 0.715 -> 0.714. 2026-10-23 five-lane merge: 2020-01-01 (share 0.729) -> 2022-01-01 (share 0.715). 2026-10-23 promotion: 2025-01-01 -> 2020-01-01

// --- filters
assert.equal(filterTimelineRows(model.rows, { hop: 'hop' }).length + filterTimelineRows(model.rows, { hop: 'context' }).length, 12234); // 2026-11-13 amplification chain: 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion
assert.ok(filterTimelineRows(model.rows, { hop: 'hop' }).every(row => row.surface_hop_eligible));
assert.ok(filterTimelineRows(model.rows, { evidenceFloor: 'official' }).every(row => row.evidence_class === 'official'));
assert.equal(filterTimelineRows(model.rows, { evidenceFloor: 'official' }).length, 8926); // 2026-11-13 amplification chain: 8,920 -> 8,926. 2026-11-12 UK meetings, second intake: 8,341 -> 8,920. 2026-11-12 UK contract awards: 5,544 -> 8,341. 2026-11-12 Bitter Struggle chain: 5,476 -> 5,544. 2026-11-12 UK ministerial meetings: 4,036 -> 5,476. 2026-11-10 hand-judged Form D filings: 2,983 -> 4,036. 2026-11-10 Form D data sets: 1,687 -> 2,983. 2026-11-10 follow-up: 1548 -> 1687. 2026-11-10 one-pass entry: 1226 -> 1548. 2026-11-10 lens-hunt promotion: 1207 -> 1226. 2026-10-23 final re-pin: 1244 -> 1207. 2026-10-23 five-lane merge: 542 -> 1,244. 2026-10-23 promotion: 136 -> 542

// --- layout: desktop (690 and 880 plot widths) and phone (216)
function checkColumns(layout) {
  const laneById = new Map(layout.lanes.map(lane => [lane.id, lane]));
  const markByKey = new Map(layout.marks.map(mark => [mark.key, mark]));
  for (const column of layout.columns) {
    assert.ok(column.segments.length >= 1);
    assert.ok(column.basis_count >= 1);
    assert.ok(column.receipt_ids.length >= 1);
    assert.equal(column.hop_eligible, true);
    for (const key of column.mark_keys) assert.equal(markByKey.get(key).surface_id, column.surface_id, 'a column touches marks of ONE surface only');
    for (const segment of column.segments) {
      const lane = laneById.get(segment.laneId);
      assert.notEqual(lane.kind, 'block');
      for (const key of segment.mark_keys) {
        const mark = markByKey.get(key);
        assert.equal(mark.laneId, segment.laneId);
        assert.equal(mark.surface_id, column.surface_id);
        assert.ok(mark.y >= segment.y1 && mark.y + mark.h <= segment.y2);
        assert.ok(column.actor_ids.includes(mark.entity_id), 'a segment touches only people on that surface');
      }
      if (lane.kind === 'entity') assert.ok(column.actor_ids.includes(lane.entity_id), 'no column touches a lane whose actor is not on that surface');
    }
    const expectedKeys = layout.marks
      .filter(mark => mark.surface_id === column.surface_id && mark.start_day <= column.day && (mark.kind === 'open' || (mark.end_day ?? mark.start_day) >= column.day))
      .map(mark => mark.key).sort();
    assert.deepEqual([...column.mark_keys].sort(), expectedKeys, 'every drawn mark of that surface on that day is touched, and nothing else');
  }
}
function checkMarks(layout, minWidth) {
  for (const mark of layout.marks) {
    assert.ok(mark.w >= minWidth, `mark ${mark.key} width ${mark.w}`);
    assert.ok(mark.x >= layout.plotLeft - 1e-9 && mark.x + mark.w <= layout.plotLeft + layout.plotWidth + layout.metrics.slotOffset * 2 + layout.metrics.markWidth + 1e-9, `mark ${mark.key} inside the plot`);
    assert.ok(model.rowsByKey.has(mark.key), 'every mark is one ledger row');
    assert.ok(typeof mark.evidence_class === 'string');
    assert.ok(typeof mark.hop_eligible === 'boolean');
    assert.ok(mark.receipt_ids.length >= 1);
    assert.ok(mark.surface_id);
    assert.ok(mark.slot < mark.stack && mark.stack <= TIMELINE_CLUSTER_SLOTS);
    const lane = layout.lanes.find(candidate => candidate.id === mark.laneId);
    assert.ok(mark.y >= lane.y && mark.y + mark.h <= lane.y + lane.height, 'a mark stays inside its lane');
  }
  assert.equal(new Set(layout.marks.map(mark => mark.key)).size, layout.marks.length, 'no row is drawn twice');
  for (const lane of layout.lanes) {
    const ticks = layout.marks.filter(mark => mark.laneId === lane.id && mark.kind === 'day').sort((a, b) => a.x - b.x);
    for (let index = 1; index < ticks.length; index += 1) {
      if (ticks[index].clusterId === ticks[index - 1].clusterId) continue;
      assert.ok(ticks[index].x - ticks[index - 1].x >= layout.metrics.markWidth, `unstacked ticks never overlap: ${ticks[index - 1].key} / ${ticks[index].key}`);
    }
  }
  assert.ok(!('lines' in layout));
}
// Counts name their denominator and every filter says what it hid: each
// candidate row of the grouping is drawn once (mark, +N or block member) or
// sits in exactly one hidden list.
function checkAccounting(layout, sourceModel = model) {
  const c = layout.counts;
  assert.equal(c.rows_in_view + c.filtered + c.pre_domain + c.post_domain + c.undated, c.candidate_rows, 'in view + hidden = candidate rows');
  assert.equal(c.candidate_rows + c.rows_outside_grouping, c.total_rows, 'candidates + rows outside the grouping = the denominator');
  assert.ok(c.in_window <= c.rows_in_view);
  if (!layout.window.active) assert.equal(c.in_window, c.rows_in_view);
  assert.ok(c.pre_domain_overlapping <= c.pre_domain, 'overlapping rows are a subset of the pre-domain rows');
  const viewKeys = new Set([
    ...layout.marks.map(mark => mark.key),
    ...layout.aggregates.flatMap(aggregate => aggregate.hidden_keys),
    ...layout.blocks.flatMap(block => block.visible_member_keys)
  ]);
  assert.equal(viewKeys.size, c.rows_in_view, 'rows in view are unique row keys, never a mark plus a block member twice');
  const hiddenLists = ['filtered', 'pre_domain', 'post_domain', 'undated'];
  const hiddenKeys = hiddenLists.flatMap(name => layout.hidden[name]);
  assert.equal(new Set(hiddenKeys).size, hiddenKeys.length, 'hidden lists are unique and disjoint');
  for (const key of hiddenKeys) assert.ok(!viewKeys.has(key), `${key} is hidden and drawn at once`);
  for (const key of layout.hidden.pre_domain_overlapping) assert.ok(layout.hidden.pre_domain.includes(key));
  assert.equal(c.filtered, layout.hidden.filtered.length);
  assert.equal(c.pre_domain, layout.hidden.pre_domain.length);
  assert.equal(c.post_domain, layout.hidden.post_domain.length);
  assert.equal(c.undated, layout.hidden.undated.length);
  for (const block of layout.blocks) {
    assert.ok(block.visible_row_count >= 1, 'a block is drawn only when at least one member passes the filters');
    assert.equal(block.visible_member_keys.length, block.visible_row_count);
    assert.equal(block.visible_row_count + block.filtered_count, block.row_count);
    const members = block.member_keys.map(key => sourceModel.rowsByKey.get(key));
    assert.deepEqual(filterTimelineRows(members, layout.filters).map(row => row.key).sort(), [...block.visible_member_keys].sort(), 'block members pass the same filters as every other row');
    for (const key of block.filtered_member_keys) assert.ok(layout.hidden.filtered.includes(key) || viewKeys.has(key), 'a dropped member is listed as filtered unless its own lane draws it');
    assert.ok(block.in_window_count <= block.visible_row_count);
  }
  for (const aggregate of layout.aggregates) {
    assert.equal(Object.values(aggregate.evidence_counts).reduce((sum, value) => sum + value, 0), aggregate.count, 'a +N carries the evidence classes of the rows it hides');
    assert.ok(aggregate.hop_eligible_count <= aggregate.count);
    assert.ok(aggregate.in_window_count <= aggregate.count);
  }
  for (const column of layout.columns) {
    assert.deepEqual([...new Set(column.pairs.flatMap(pair => [pair.actor_a, pair.actor_b]))].sort(), column.actor_ids, 'column actors are the actors of the bases that pass the floor');
    assert.equal(Object.values(column.evidence_counts).reduce((sum, value) => sum + value, 0), column.basis_count);
    assert.ok(column.basis_count <= column.total_basis_count);
  }
}

// Updated 2026-10-23 (owner decision on default lanes). The default People view is the
// 18 people with the most dated rows. To keep SPEC (j) (28px entity lanes, the 650px
// stage budget) with 18 lanes, an unpinned view stacks at most two marks per cluster and
// folds the rest into the +N aggregate. Today none of the 18 shares a hop surface on a
// drawn mark, so the default view draws no column; the column, SDR and Warner rules are
// checked on the 2.1.0 default lanes pinned (ORIGINAL_DEFAULT_LANES), which keep six slots.
const DEFAULT_DESKTOP = { 690: { marks: 153, aggregates: 16, dialogMarks: 2 }, 880: { marks: 161, aggregates: 17, dialogMarks: 2 } }; // 2026-11-12 UK contract awards: 690 154/19/1 -> 153/16/2, 880 174/16/2 -> 161/17/2 (the automatic domain opens on 2019-01-01, so earlier rows fall before it; the same 18 default people, who hold no award rows). 2026-11-12 Bitter Struggle chain: 690 154/17/2 -> 154/19/1, 880 171/15/2 -> 174/16/2 (the automatic domain now ends 2026-12-10 and Matt Clifford gains five rows; at 690 the joe-lonsdale Dialog mark folds into +N again). 2026-11-12 UK ministerial meetings: 690 161/14/1 -> 154/17/2, 880 175/19/2 -> 171/15/2 (the automatic domain opens on 2017-01-01, John Healey and Matt Clifford gain meeting rows, and a third block lane holds the DSIT return for October to December 2025). 2026-11-10 hand-judged Form D filings: dialogMarks pins the personal Dialog marks per width (at 690 Joe Lonsdale's Dialog row now folds into a +N cluster beside his 2026 Form D rows). 2026-11-10 hand-judged Form D filings: 690 148/17 -> 161/14, 880 166/18 -> 175/19 (the automatic domain opens on 2015-01-01, and Steve Braverman gains twelve rows). 2026-11-10 Form D data sets: 690 113/10 -> 148/17, 880 119/12 -> 166/18 (the automatic domain opens on 2016-01-01 again, Steve Braverman takes Doron Landau's lane, and the default people gain Form D rows). 2026-11-10 follow-up: 690 120/10 -> 113/10, 880 125/11 -> 119/12 (the automatic domain now opens on 2017-01-01). 2026-11-10 one-pass entry: 690 115 -> 120 marks, 880 120 -> 125 (new Form D rows on the default people). 2026-11-10 lens-hunt promotion: 690 112/9 -> 115/10, 880 117/10 -> 120/11.  2026-10-23 final re-pin: 690 134/13 -> 112/9, 880 140/14 -> 117/10 (merged Form D rows, year-only a16z 2022 sessions now non-hop, overlapping-tick clusters folded).  2026-10-23 five-lane merge: 690 44/2 -> 134/13, 880 55/7 -> 140/14 // 2026-10-23 hop-first default lanes: 690 147/12, 880 169/18
for (const plotWidth of [690, 880]) {
  const layout = layoutTimeline(model, { plotWidth });
  assert.equal(layout.by, 'actor');
  assert.equal(layout.domain.from, '2019-01-01'); // 2026-11-12 UK contract awards: 2017-01-01 -> 2019-01-01. 2026-11-12 UK ministerial meetings: 2015-01-01 -> 2017-01-01. 2026-11-10 hand-judged Form D filings: 2016-01-01 -> 2015-01-01. 2026-11-10 Form D data sets: 2017-01-01 -> 2016-01-01. 2026-11-10 follow-up: 2016-01-01 -> 2017-01-01 (the automatic domain). 2026-10-23 five-lane merge: 2013-01-01 -> 2016-01-01. 2026-10-23 promotion: 2023-01-01 -> 2013-01-01
  assert.equal(layout.domain.to, '2026-12-13'); // 2026-11-13 amplification chain: 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record 2026-11-10 -> 2026-11-13). 2026-11-12 Bitter Struggle chain: 2026-11-22 -> 2026-12-10 (the automatic domain end follows the end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface). 2026-10-23 promotion: 2026-09-11 -> 2026-11-22
  assert.equal(layout.domain.auto, true);
  assert.equal(layout.counts.named_lanes, 18); // 2.1.0: 15
  assert.equal(layout.counts.strip_rows, 2818); // 2026-11-13 amplification chain: 2,793 -> 2,818. 2026-11-12 UK meetings, second intake: 2,580 -> 2,793. 2026-11-12 Bitter Struggle chain: 2,520 -> 2,580. 2026-11-12 UK ministerial meetings: 2,224 -> 2,520. 2026-11-10 hand-judged Form D filings: 1,718 -> 2,224. 2026-11-10 Form D data sets: 1,104 -> 1,718. 2026-11-10 follow-up: 1095 -> 1104. 2026-11-10 one-pass entry: 1022 -> 1095. 2026-11-10 lens-hunt promotion: 1014 -> 1022. 2026-10-23 final re-pin: 1017 -> 1014. 2026-10-23 five-lane merge: 808 -> 1,017 // 2.1.0: 38 // 2026-10-23 hop-first default lanes: 611 -> 808
  assert.equal(layout.counts.marks, DEFAULT_DESKTOP[plotWidth].marks, 'desktop: lane + strip marks');
  assert.equal(layout.counts.blocks, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2 (rndf-2023 roster block)
  assert.equal(layout.counts.aggregates, DEFAULT_DESKTOP[plotWidth].aggregates);
  assert.equal(layout.counts.drawn, DEFAULT_DESKTOP[plotWidth].marks + 3 + DEFAULT_DESKTOP[plotWidth].aggregates, `marks + blocks + aggregates at plot width ${plotWidth}`); // 2026-11-12 UK ministerial meetings: + 2 blocks -> + 3 blocks (the DSIT return for October to December 2025). 2026-10-23 five-lane merge: + 1 block -> + 2 blocks
  assert.ok(layout.counts.columns > 0, 'the default people share drawn hop bases (hop-first ranking, 2026-10-23)');
  assert.equal(layout.counts.pre_domain, 808); // 2026-11-12 UK meetings, second intake: 806 -> 808. 2026-11-12 UK contract awards: 656 -> 806. 2026-11-12 UK ministerial meetings: 497 -> 656. 2026-11-10 hand-judged Form D filings: 476 -> 497. 2026-11-10 Form D data sets: 357 -> 476. 2026-11-10 follow-up: 315 -> 357. 2026-11-10 one-pass entry: 305 -> 315. 2026-10-23 final re-pin: 310 -> 305. 2026-10-23 five-lane merge: 221 -> 310. 2026-10-23 promotion: 11 -> 221
  assert.equal(layout.counts.post_domain, 0);
  assert.equal(layout.counts.undated, 0);
  assert.equal(layout.counts.filtered, 0);
  assert.equal(layout.counts.total_rows, 12234); // 2026-11-13 amplification chain: 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion: 286 -> 3,118
  assert.equal(layout.counts.candidate_rows, 3361, '3,288 actor rows plus the organization rows carried by the three blocks'); // 2026-11-13 amplification chain: 3,336 -> 3,361. 2026-11-12 UK meetings, second intake: 3,123 -> 3,336. 2026-11-12 Bitter Struggle chain: 3,058 -> 3,123. 2026-11-12 UK ministerial meetings: 2,666 -> 3,058. 2026-11-10 hand-judged Form D filings: 2,147 -> 2,666. 2026-11-10 Form D data sets: 1,416 -> 2,147. 2026-11-10 follow-up: 1407 -> 1416. 2026-11-10 one-pass entry: 1321 -> 1407. 2026-11-10 lens-hunt promotion: 1308 -> 1321. 2026-10-23 final re-pin: 1348 -> 1308. 2026-10-23 five-lane merge: 960 -> 1,348 (Dialog 1 + rndf-2023 7 organization rows). 2026-10-23 promotion: 201 -> 960
  assert.equal(layout.counts.rows_outside_grouping, 8873, 'the other organization rows are not part of a People view'); // 2026-11-13 amplification chain: 8,854 -> 8,873. 2026-11-12 UK meetings, second intake: 8,488 -> 8,854. 2026-11-12 UK contract awards: 5,691 -> 8,488. 2026-11-12 Bitter Struggle chain: 5,625 -> 5,691. 2026-11-12 UK ministerial meetings: 4,577 -> 5,625. 2026-11-10 hand-judged Form D filings: 4,043 -> 4,577. 2026-11-10 Form D data sets: 3,478 -> 4,043. 2026-11-10 follow-up: 3348 -> 3478. 2026-11-10 one-pass entry: 3109 -> 3348. 2026-11-10 lens-hunt promotion: 3103 -> 3109. 2026-10-23 five-lane merge: 2,158 -> 3,103. 2026-10-23 promotion: 85 -> 2,158
  assert.equal(layout.counts.rows_in_view, 2553, 'marks + aggregated rows + 231 block members, each row counted once'); // 2026-11-13 amplification chain: 2,528 -> 2,553. 2026-11-12 UK meetings, second intake: 2,317 -> 2,528. 2026-11-12 UK contract awards: 2,467 -> 2,317. 2026-11-12 Bitter Struggle chain: 2,402 -> 2,467. 2026-11-12 UK ministerial meetings: 2,169 -> 2,402. 2026-11-10 hand-judged Form D filings: 1,671 -> 2,169. 2026-11-10 Form D data sets: 1,059 -> 1,671. 2026-11-10 follow-up: 1092 -> 1059. 2026-11-10 one-pass entry: 1016 -> 1092. 2026-11-10 lens-hunt promotion: 1003 -> 1016. 2026-10-23 final re-pin: 1038 -> 1003. 2026-10-23 five-lane merge: 739 -> 1,038. 2026-10-23 promotion: 190 -> 739
  assert.equal(layout.counts.in_window, 2553); // 2026-11-13 amplification chain: 2,528 -> 2,553. 2026-11-12 UK meetings, second intake: 2,317 -> 2,528. 2026-11-12 UK contract awards: 2,467 -> 2,317. 2026-11-12 Bitter Struggle chain: 2,402 -> 2,467. 2026-11-12 UK ministerial meetings: 2,169 -> 2,402. 2026-11-10 hand-judged Form D filings: 1,671 -> 2,169. 2026-11-10 Form D data sets: 1,059 -> 1,671. 2026-11-10 follow-up: 1092 -> 1059. 2026-11-10 one-pass entry: 1016 -> 1092. 2026-11-10 lens-hunt promotion: 1003 -> 1016. 2026-10-23 final re-pin: 1038 -> 1003. 2026-10-23 five-lane merge: 739 -> 1,038
  assert.equal(layout.counts.block_visible_rows, 231); // 2026-11-12 UK ministerial meetings: 142 -> 231. 2026-10-23 five-lane merge: 113 -> 142
  // Narrowed 2026-10-23: was an exact one-key list (Simon Case's 2020-2024 tenure). With the
  // domain now starting 2013-01-01 that tenure is inside the domain; the rule is checked on
  // every flagged key instead: it began before the domain and is still active inside it.
  for (const key of layout.hidden.pre_domain_overlapping) {
    const row = model.rowsByKey.get(key);
    assert.ok(row.start_day < layout.domain.from_day && (row.end_day == null || row.end_day >= layout.domain.from_day),
      `${key}: a tenure span that began before the domain and is active inside it is flagged, not called pre-domain`);
  }
  assert.equal(layout.counts.pre_domain_overlapping, 94); // 2026-11-12 UK contract awards: 87 -> 94. 2026-11-12 UK ministerial meetings: 75 -> 87. 2026-11-10 hand-judged Form D filings: 78 -> 75. 2026-11-10 Form D data sets: 87 -> 78. 2026-11-10 follow-up: 78 -> 87. 2026-10-23 five-lane merge: 71 -> 78. 2026-10-23 promotion: 1 -> 71
  assert.equal(layout.counts.max_named_stack, 2, 'the default view never grows a lane');
  assert.equal(layout.counts.max_strip_stack, 2);
  checkAccounting(layout);
  assert.equal(layout.lanes.length, 22, '18 named + strip + three blocks'); // 2026-11-12 UK ministerial meetings: 21 -> 22. 2026-10-23 five-lane merge: 20 -> 21
  assert.equal(layout.lanes.find(lane => lane.kind === 'strip').height, 28);
  assert.equal(layout.lanes.find(lane => lane.kind === 'strip').label, 'Other people (422)'); // 2026-11-13 amplification chain: 414 -> 422 (the 8 people minted for the chain). 2026-11-12 Bitter Struggle chain: Other people (366) -> Other people (414). 2026-11-12 UK ministerial meetings: Other people (358) -> Other people (366). 2026-11-10 hand-judged Form D filings: Other people (346) -> Other people (358). 2026-11-10 Form D data sets: Other people (331) -> Other people (346). 2026-11-10 follow-up: Other people (322) -> Other people (331). 2026-11-10 one-pass entry: Other people (274) -> Other people (322). 2026-11-10 lens-hunt promotion: Other people (267) -> Other people (274). 2026-10-23 five-lane merge: 153 -> 267
  assert.equal(layout.lanes.find(lane => lane.kind === 'block').height, 32);
  assert.ok(layout.lanes.filter(lane => lane.kind === 'entity').every(lane => lane.height === 28), 'every entity lane is 28px');
  assert.equal(layout.height, 18 * 28 + 28 + 32 + 32 + 32); // 2026-11-12 UK ministerial meetings: + a third 32px block lane, the DSIT return for October to December 2025 (628px, within the 640px budget; was 596px). 2026-10-23 five-lane merge: + a second 32px block lane (596px; was 564px)
  // 2026-10-23 final repair round: the desktop stage budget was raised 574px (650 - 36 - 40) -> 640px by owner
  // decision (two dense roster blocks, Dialog and the rndf-2023 programme, are correct). 596px fits.
  assert.equal(TIMELINE_STAGE_BUDGETS.desktop, 640);
  assert.ok(layout.height <= TIMELINE_STAGE_BUDGETS.desktop, 'the default desktop stage fits the 640px budget');
  assert.deepEqual(layout.axisTicks.filter(tick => tick.kind === 'year').map(tick => tick.label), Array.from({ length: 8 }, (_, index) => String(2019 + index))); // 2026-11-12 UK contract awards: 2017..2026 (10) -> 2019..2026 (8), the automatic domain. 2026-11-12 UK ministerial meetings: 2015..2026 (12) -> 2017..2026 (10), the automatic domain. 2026-11-10 hand-judged Form D filings: 2016..2026 (11) -> 2015..2026 (12), the automatic domain. 2026-11-10 Form D data sets: 2017..2026 (10) -> 2016..2026 (11), the automatic domain. 2026-11-10 follow-up: 2016..2026 (11) -> 2017..2026 (10), the automatic domain. 2026-10-23 five-lane merge: 2013..2026 (14) -> 2016..2026 (11)
  checkMarks(layout, 4);
  checkColumns(layout);
  // Narrowed 2026-10-23 five-lane merge: was layout.blocks[0]; the rndf-2023 roster block now sorts first, so the
  // Dialog block is found by its surface id. The Dialog block assertions are unchanged in scope.
  assert.deepEqual(layout.blocks.map(entry => entry.surface_id), ['rndf-2023-programme-roster', 'uk-ministerial-meetings-dsit-ministerial-meetings-october-to-december-2025-6a0cb7c5', dialog.surface_id]); // 2026-11-12 UK ministerial meetings: the DSIT return for October to December 2025 joins as a block.
  const block = layout.blocks.find(entry => entry.surface_id === dialog.surface_id);
  assert.equal(block.listed_count, 112);
  assert.equal(block.surface_id, dialog.surface_id);
  assert.equal(block.member_keys.length, 113);
  assert.equal(block.visible_row_count, 113);
  assert.equal(block.visible_listed_count, 112);
  assert.equal(block.filtered_count, 0);
  assert.equal(block.hop_eligible, false);
  assert.equal(layout.lanes.find(lane => lane.id === `block:${dialog.surface_id}`).visible_row_count, 113); // 2026-10-23 five-lane merge: the Dialog block lane by id (was the first block lane)
  assert.deepEqual(block.elsewhere.map(entry => entry.actor_id), ['karen-karniol-tambour', 'joe-lonsdale', 'mike-novogratz', 'henry-kravis', 'elon-musk', 'matt-clifford', 'chamath-palihapitiya', 'scott-bessent', 'matt-cohler', 'reid-hoffman', 'tom-tugendhat', 'wes-moore', 'eric-schmidt', 'severin-hacker', 'thasunda-brown-duckett', 'adam-grant', 'immad-akhund', 'mario-schlosser', 'scott-stephenson', 'shivon-zilis', 'adam-d-angelo', 'jim-himes', 'jonathan-haidt', 'jonathan-ross', 'cesar-carvalho', 'garry-kasparov', 'strauss-zelnick', 'tyler-cowen', 'wences-casares', 'atul-gawande', 'dan-driscoll', 'jared-kushner', 'jens-spahn', 'joseph-gordon-levitt', 'kim-scott', 'lawrence-summers', 'pete-shadbolt', 'scott-belsky', 'scott-cook', 'stan-mcchrystal']); // 2026-11-12 UK meetings, second intake: the same 40 names; Tom Tugendhat 5 -> 8 rows elsewhere, so he moves ahead of Wes Moore.  2026-11-12 UK ministerial meetings: seven listed people join with meeting rows. 2026-11-10 hand-judged Form D filings: twelve listed people join with hand-judged Form D rows. 2026-11-10 Form D data sets: was ['joe-lonsdale', 'matt-clifford', 'jim-himes', 'tyler-cowen', 'wes-moore', 'dan-driscoll']; fifteen listed people join with data-set Form D rows, ordered by other-surface count as before. 2026-11-10 one-pass entry: joe-lonsdale (13 other surfaces) now ahead of matt-clifford (12). 2026-10-23 five-lane merge: was ['matt-clifford', 'jim-himes', 'joe-lonsdale', 'dan-driscoll']
  assert.equal(layout.marks.filter(mark => mark.surface_id === dialog.surface_id).length, DEFAULT_DESKTOP[plotWidth].dialogMarks, 'of the documented-elsewhere names only matt-clifford and joe-lonsdale have default lanes: two personal Dialog marks, one at 690 where the joe-lonsdale mark folds into +N'); // 2026-11-10 hand-judged Form D filings: 2 -> 1 at 690, 2 at 880 (the count now differs by width, so it is pinned per width). 2026-10-23 five-lane merge: 1 -> 2 (joe-lonsdale now has a default lane). 2026-10-23 hop-first default lanes: 0 -> 1
  assert.equal(layout.overview.ticks.filter(tick => tick.kind === 'row').length, 12234); // 2026-11-13 amplification chain: 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451
  assert.equal(layout.overview.ticks.filter(tick => tick.kind === 'hop').length, 66); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 65 -> 66. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 63 -> 65. 2026-11-10 lens-hunt promotion: 59 -> 63. 2026-10-23 final re-pin: 64 -> 59. 2026-10-23 five-lane merge: 22 -> 64
  assert.equal(layout.overview.ticks.filter(tick => tick.kind === 'dense').length, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2
  assert.equal(layout.overview.from, '1982-05-01');
  assert.equal(layout.overview.to, '2026-12-13'); // 2026-11-13 amplification chain: 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record 2026-11-10 -> 2026-11-13). 2026-11-12 Bitter Struggle chain: 2026-11-22 -> 2026-12-10 (the automatic domain end follows the end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface).

  // The 2.1.0 default lanes, pinned: six slots, columns, the SDR column and the Warner day.
  const original = layoutTimeline(model, { plotWidth, laneIds: ORIGINAL_DEFAULT_LANES });
  assert.equal(original.counts.named_lanes, 15);
  const ORIGINAL_COLUMNS = { 690: 21, 880: 21 }; // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 20 -> 21 at both widths (the Inherent seed round, 2026-05-31, is a hop column on Matt Clifford's lane). 2026-11-12 UK contract awards: 22 -> 20 at both widths (the 2018-01-24 and 2018-07-05 hop bases fall before the 2019-01-01 domain). 2026-11-10 hand-judged Form D filings: 880 23 -> 22 (the automatic domain now opens on 2015-01-01; on the compressed scale the 2023-12-02 hop base folds into a +N cluster at 880, as it already did at 690, so its column is not drawn). 2026-11-10 lens-hunt promotion: 18 / 19 -> 22 / 23 (SAGE 17 on 2020-03-18, the UKSA panel on 2023-06-09, the joint summit appointment on 2023-08-10, the AI Growth Zones launch on 2025-04-30).  2026-10-23 five-lane merge: 16 at both widths -> 18 / 19 (London Tech Week 2026-06-08 and 2026-06-09; at 880 the rndf-2023 panel 2 column on 2023-12-02 is also drawn)
  assert.equal(original.counts.columns, ORIGINAL_COLUMNS[plotWidth], `${ORIGINAL_COLUMNS[plotWidth]} columns on the 15 pinned lanes at plot width ${plotWidth}`);
  assert.equal(original.counts.candidate_rows, 3361); // 2026-11-13 amplification chain: 3,336 -> 3,361. 2026-11-12 UK meetings, second intake: 3,123 -> 3,336. 2026-11-12 Bitter Struggle chain: 3,058 -> 3,123. 2026-11-12 UK ministerial meetings: 2,666 -> 3,058. 2026-11-10 hand-judged Form D filings: 2,147 -> 2,666. 2026-11-10 Form D data sets: 1,416 -> 2,147. 2026-11-10 follow-up: 1407 -> 1416. 2026-11-10 one-pass entry: 1321 -> 1407. 2026-11-10 lens-hunt promotion: 1308 -> 1321. 2026-10-23 final re-pin: 1348 -> 1308. 2026-10-23 five-lane merge: 960 -> 1,348
  assert.equal(original.counts.rows_in_view, 2553); // 2026-11-13 amplification chain: 2,528 -> 2,553. 2026-11-12 UK meetings, second intake: 2,317 -> 2,528. 2026-11-12 UK contract awards: 2,467 -> 2,317. 2026-11-12 Bitter Struggle chain: 2,402 -> 2,467. 2026-11-12 UK ministerial meetings: 2,169 -> 2,402. 2026-11-10 hand-judged Form D filings: 1,671 -> 2,169. 2026-11-10 Form D data sets: 1,059 -> 1,671. 2026-11-10 follow-up: 1092 -> 1059. 2026-11-10 one-pass entry: 1016 -> 1092. 2026-11-10 lens-hunt promotion: 1003 -> 1016. 2026-10-23 final re-pin: 1038 -> 1003. 2026-10-23 five-lane merge: 739 -> 1,038
  checkAccounting(original);
  checkMarks(original, 4);
  checkColumns(original);
  assert.equal(original.height, { 690: 10 * 28 + 38 + 38 + 38 + 38 + 68 + 68 + 32 * 3, 880: 12 * 28 + 38 + 38 + 68 + 68 + 32 * 3 }[plotWidth], 'Ben Warner and Matt Clifford stack three marks (38px), as do Simon Case and Richard Barrons at 690; Keir Starmer six (68px); the strip keeps six slots; three block lanes'); // 2026-11-12 UK contract awards: 674px -> 664px at 690 and 654px -> 644px at 880 (the automatic domain opens on 2019-01-01, so Matt Clifford's lane stacks three marks, not four, and Simon Case's no longer stacks three at 880). 2026-11-12 Bitter Struggle chain: 654px -> 674px at 690 and 644px -> 654px at 880 (Matt Clifford's lane stacks his five new rows: the AISI Advisory Board from 3 November 2023, the Action Plan lead-reviewer term, the Inherent advisory role, and the reported Anthropic appointment and ARIA exit). 2026-11-12 UK ministerial meetings: 572px -> 654px at 690 and 644px at 880 (Keir Starmer's lane now stacks six marks with his meeting rows, Richard Barrons's three at 690, and a third block lane holds the DSIT return for October to December 2025). 2026-11-10 lens-hunt promotion: Ben Warner's lane now stacks three marks too (562 -> 572px).  2026-10-23 five-lane merge: + a second 32px block lane (530 -> 562px)
  // The pinned-lanes limit is 680px: raised 2026-11-12 from 660px by the supervising session with the Bitter Struggle chain pass (measured 674px at 690 wide and 654px at 880, because Matt Clifford's lane stacks four marks with his five new rows); this is not an owner decision and was flagged to the owner the same day. It was raised 2026-11-12 from 640px by the supervising session with the UK ministerial meetings pass (measured 654 at 690 wide, 644 at 880, 540 on phone: Keir Starmer's lane stacks six marks and a DSIT return is drawn as a third roster block); this is not an owner decision and was flagged to the owner the same day. The default desktop and Organizations stages keep the 640px budget.
  assert.ok(original.height <= PINNED_LANES_DESKTOP_LIMIT, 'the 15 pinned lanes still fit the 680px pinned-lanes limit'); // 2026-11-12 Bitter Struggle chain: 660 -> 680px (supervising session, not an owner decision). 2026-11-12 UK ministerial meetings: 640 -> 660px (supervising session, not an owner decision). 2026-10-23 final repair round: 574 -> 640px (owner decision)
  assert.deepEqual(original.columns.map(column => column.iso_day), [
    '2020-03-08', '2020-03-18', '2023-06-09', '2023-08-10', '2023-09-07', '2023-09-28', '2024-07-17', '2024-07-31', '2024-10-10',
    '2025-01-13', '2025-03-06', '2025-04-30', '2025-08-05', '2025-12-08', '2026-02-11', '2026-04-27', '2026-05-31', '2026-06-08', '2026-06-09', '2026-06-10', '2026-07-08'
  ]); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): + 2026-05-31 (the Inherent seed round). 2026-11-12 UK contract awards: - 2018-01-24 and 2018-07-05 (before the 2019-01-01 domain). 2026-11-10 hand-judged Form D filings: the 880-only 2023-12-02 column is no longer drawn (see ORIGINAL_COLUMNS). 2026-11-10 lens-hunt promotion: + 2020-03-18, 2023-06-09, 2023-08-10 and 2025-04-30.  2026-10-23 five-lane merge: + 2026-06-08 and 2026-06-09 (London Tech Week sessions); + 2023-12-02 at 880
  const sdr = original.columns.find(column => column.iso_day === '2024-07-17');
  assert.equal(sdr.surface_id, 'strategic-defence-review-2024-2025');
  assert.equal(sdr.basis_count, 10);
  assert.deepEqual(sdr.actor_ids, ['fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons']);
  assert.deepEqual(sdr.segments.map(segment => segment.laneId), ['fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons'], 'per-lane segments (fix b)');
  // Narrowed 2026-10-23 five-lane merge: was original.blocks[0]; the Dialog block is found by surface id (rndf-2023 now sorts first).
  assert.deepEqual(original.blocks.find(entry => entry.surface_id === dialog.surface_id).elsewhere.map(entry => entry.actor_id), ['karen-karniol-tambour', 'joe-lonsdale', 'mike-novogratz', 'henry-kravis', 'elon-musk', 'matt-clifford', 'chamath-palihapitiya', 'scott-bessent', 'matt-cohler', 'reid-hoffman', 'tom-tugendhat', 'wes-moore', 'eric-schmidt', 'severin-hacker', 'thasunda-brown-duckett', 'adam-grant', 'immad-akhund', 'mario-schlosser', 'scott-stephenson', 'shivon-zilis', 'adam-d-angelo', 'jim-himes', 'jonathan-haidt', 'jonathan-ross', 'cesar-carvalho', 'garry-kasparov', 'strauss-zelnick', 'tyler-cowen', 'wences-casares', 'atul-gawande', 'dan-driscoll', 'jared-kushner', 'jens-spahn', 'joseph-gordon-levitt', 'kim-scott', 'lawrence-summers', 'pete-shadbolt', 'scott-belsky', 'scott-cook', 'stan-mcchrystal']); // 2026-11-12 UK meetings, second intake: the same 40 names; Tom Tugendhat 5 -> 8 rows elsewhere, so he moves ahead of Wes Moore.  2026-11-12 UK ministerial meetings: seven listed people join with meeting rows. 2026-11-10 hand-judged Form D filings: twelve listed people join with hand-judged Form D rows. 2026-11-10 Form D data sets: was ['joe-lonsdale', 'matt-clifford', 'jim-himes', 'tyler-cowen', 'wes-moore', 'dan-driscoll']; fifteen listed people join with data-set Form D rows. 2026-11-10 one-pass entry: joe-lonsdale (13 other surfaces) now ahead of matt-clifford (12). 2026-10-23 five-lane merge: was ['matt-clifford', 'jim-himes', 'joe-lonsdale', 'dan-driscoll']
  assert.equal(original.marks.filter(mark => mark.surface_id === dialog.surface_id).length, 2, 'only the two cross-referenced people with lanes get personal Dialog marks');
  assert.ok(original.marks.filter(mark => mark.surface_id === dialog.surface_id).every(mark => ['matt-clifford', 'dan-driscoll'].includes(mark.entity_id)));
  // Same-day different-surface marks shift by the slot offset so each column stays over its own marks.
  const warnerDay = original.marks.filter(mark => mark.entity_id === 'ben-warner' && mark.iso_start === '2023-09-28').sort((a, b) => a.surface_id < b.surface_id ? -1 : 1);
  assert.equal(warnerDay.length, 2);
  assert.equal(warnerDay[1].x - warnerDay[0].x, TIMELINE_DESKTOP_METRICS.slotOffset);
  assert.equal(warnerDay[0].clusterId, warnerDay[1].clusterId, 'the tick and the span starting on one day stack');
  assert.notEqual(warnerDay[0].slot, warnerDay[1].slot);
}

const phone = layoutTimeline(model, { plotWidth: 216, ...TIMELINE_PHONE_METRICS });
assert.equal(phone.domain.from, '2023-01-01'); // 2026-11-12 UK contract awards: 2022-01-01 -> 2023-01-01. 2026-11-12 UK ministerial meetings: 2021-01-01 -> 2022-01-01. 2026-11-10 Form D data sets: 2022-01-01 -> 2021-01-01. 2026-10-23 five-lane merge: 2020-01-01 -> 2022-01-01. 2026-10-23 promotion: 2025-01-01 -> 2020-01-01
assert.equal(phone.domain.to, '2026-12-13'); // 2026-11-13 amplification chain: 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record 2026-11-10 -> 2026-11-13). 2026-11-12 Bitter Struggle chain: 2026-11-22 -> 2026-12-10 (the automatic domain end follows the end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface).
assert.equal(phone.counts.named_lanes, 18);
assert.equal(phone.counts.marks, 104); // 2026-11-12 UK contract awards: 94 -> 104. 2026-11-12 Bitter Struggle chain: 93 -> 94. 2026-11-12 UK ministerial meetings: 92 -> 93. 2026-11-10 Form D data sets: 77 -> 92. 2026-11-10 one-pass entry: 76 -> 77. 2026-11-10 lens-hunt promotion: 75 -> 76. 2026-10-23 final re-pin: 92 -> 75. 2026-10-23 five-lane merge: 39 -> 92 // 2026-10-23 hop-first default lanes: 85 -> 39
assert.equal(phone.counts.blocks, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2
assert.equal(phone.counts.aggregates, 14); // 2026-11-12 UK contract awards: 12 -> 14. 2026-11-12 Bitter Struggle chain: 13 -> 12. 2026-11-12 UK ministerial meetings: 14 -> 13. 2026-11-10 hand-judged Form D filings: 12 -> 14. 2026-11-10 Form D data sets: 9 -> 12. 2026-10-23 final re-pin: 12 -> 9. 2026-10-23 five-lane merge: 1 -> 12 // 2026-10-23 hop-first default lanes: 9 -> 1
assert.equal(phone.counts.drawn, 121, 'SPEC (j): 104 marks + 3 blocks + 14 aggregates on phone'); // 2026-11-12 UK contract awards: 109 -> 121. 2026-11-12 UK ministerial meetings: 108 -> 109. 2026-11-10 hand-judged Form D filings: 106 -> 108. 2026-11-10 Form D data sets: 88 -> 106. 2026-11-10 one-pass entry: 87 -> 88. 2026-11-10 lens-hunt promotion: 86 -> 87. 2026-10-23 final re-pin: 106 -> 86. 2026-10-23 five-lane merge: 41 -> 106 // 2026-10-23 hop-first default lanes: 95 -> 41
assert.equal(phone.counts.columns, 27); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 26 -> 27 (the Inherent seed round, 2026-05-31, is a hop column on Matt Clifford's lane). 2026-11-12 UK contract awards: 25 -> 26. 2026-11-12 Bitter Struggle chain: 26 -> 25. 2026-11-10 lens-hunt promotion: 23 -> 26. 2026-10-23 final re-pin: 29 -> 23. 2026-10-23 five-lane merge: 13 -> 29 // 2026-10-23 hop-first default lanes: 0 -> 13
assert.equal(phone.counts.pre_domain, 1528); // 2026-11-12 UK meetings, second intake: 1,453 -> 1,528. 2026-11-12 UK contract awards: 1,244 -> 1,453. 2026-11-12 UK ministerial meetings: 1,039 -> 1,244. 2026-11-10 hand-judged Form D filings: 860 -> 1,039. 2026-11-10 Form D data sets: 605 -> 860. 2026-11-10 one-pass entry: 580 -> 605. 2026-11-10 lens-hunt promotion: 575 -> 580. 2026-10-23 final re-pin: 589 -> 575. 2026-10-23 five-lane merge: 424 -> 589
assert.equal(phone.counts.pre_domain_overlapping, 132); // 2026-11-12 UK contract awards: 115 -> 132. 2026-11-12 UK ministerial meetings: 116 -> 115. 2026-11-10 Form D data sets: 115 -> 116. 2026-10-23 five-lane merge: 99 -> 115
assert.equal(phone.counts.rows_in_view, 1833); // 2026-11-13 amplification chain: 1,808 -> 1,833. 2026-11-12 UK meetings, second intake: 1,670 -> 1,808. 2026-11-12 UK contract awards: 1,879 -> 1,670. 2026-11-12 Bitter Struggle chain: 1,814 -> 1,879. 2026-11-12 UK ministerial meetings: 1,627 -> 1,814. 2026-11-10 hand-judged Form D filings: 1,287 -> 1,627. 2026-11-10 Form D data sets: 811 -> 1,287. 2026-11-10 follow-up: 802 -> 811. 2026-11-10 one-pass entry: 741 -> 802. 2026-11-10 lens-hunt promotion: 733 -> 741. 2026-10-23 final re-pin: 759 -> 733. 2026-10-23 five-lane merge: 536 -> 759
assert.equal(phone.counts.candidate_rows, 3361); // 2026-11-13 amplification chain: 3,336 -> 3,361. 2026-11-12 UK meetings, second intake: 3,123 -> 3,336. 2026-11-12 Bitter Struggle chain: 3,058 -> 3,123. 2026-11-12 UK ministerial meetings: 2,666 -> 3,058. 2026-11-10 hand-judged Form D filings: 2,147 -> 2,666. 2026-11-10 Form D data sets: 1,416 -> 2,147. 2026-11-10 follow-up: 1407 -> 1416. 2026-11-10 one-pass entry: 1321 -> 1407. 2026-11-10 lens-hunt promotion: 1308 -> 1321. 2026-10-23 final re-pin: 1348 -> 1308. 2026-10-23 five-lane merge: 960 -> 1,348
checkAccounting(phone);
assert.ok(phone.lanes.filter(lane => lane.kind !== 'block').every(lane => lane.height === 24), 'phone lanes never grow in the default view');
assert.equal(phone.lanes.find(lane => lane.kind === 'block').height, 28);
assert.equal(phone.height, 18 * 24 + 24 + 28 + 28 + 28); // 2026-11-12 UK ministerial meetings: + a third 28px block lane, the DSIT return for October to December 2025 (512 -> 540px). 2026-10-23 five-lane merge: + a second 28px block lane (484 -> 512px)
// 2026-10-23 final repair round (owner decision): the phone stage budget was raised from 446px
// (510 - 30 - 34), which could not hold 18 lanes at 24px plus the strip and two block lanes
// (512px, 66px over), to 520px. The default phone stage now fits without inner scrolling.
// Phone budget 520px -> 550px, raised 2026-11-12 by the supervising session with the UK ministerial meetings pass (measured 654 at 690 wide, 644 at 880, 540 on phone: Keir Starmer's lane stacks six marks and a DSIT return is drawn as a third roster block); this is not an owner decision and was flagged to the owner the same day.
assert.equal(TIMELINE_STAGE_BUDGETS.phone, 550);
assert.ok(phone.height <= TIMELINE_STAGE_BUDGETS.phone, 'the default phone stage fits the 550px budget');
checkMarks(phone, 3);
checkColumns(phone);
const phoneOriginal = layoutTimeline(model, { plotWidth: 216, laneIds: ORIGINAL_DEFAULT_LANES, ...TIMELINE_PHONE_METRICS });
assert.equal(phoneOriginal.counts.columns, 19); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 18 -> 19 (the Inherent seed round, 2026-05-31, is a hop column on Matt Clifford's lane). 2026-11-10 lens-hunt promotion: 15 -> 18. 2026-10-23 final re-pin: 17 -> 15. 2026-10-23 five-lane merge: 14 -> 17
checkAccounting(phoneOriginal);
checkMarks(phoneOriginal, 3);
checkColumns(phoneOriginal);
// Narrowed 2026-10-23: the 2020-2026 phone domain puts 15 days at about 1.3px, so the two
// Warner September rows can no longer sit more than 2px apart; they stack in one cluster,
// which is the rule's purpose (never overlapping).
const warnerSeptember = phoneOriginal.marks.filter(mark => mark.entity_id === 'ben-warner' && ['2025-09-12', '2025-09-27'].includes(mark.iso_start));
assert.equal(warnerSeptember.length, 2);
assert.equal(warnerSeptember[0].clusterId, warnerSeptember[1].clusterId, 'the +3px surface offset would make them overlap, so they stack instead');
assert.notEqual(warnerSeptember[0].slot, warnerSeptember[1].slot);
const driscollJune = phoneOriginal.marks.filter(mark => mark.entity_id === 'dan-driscoll').sort((a, b) => a.x - b.x);
assert.ok(driscollJune.length >= 2);
for (let index = 1; index < driscollJune.length; index += 1) {
  assert.ok(driscollJune[index].x - driscollJune[index - 1].x >= TIMELINE_PHONE_METRICS.markWidth || driscollJune[index - 1].clusterId === driscollJune[index].clusterId,
    'days apart at 216px: either side by side without overlap or stacked, never overlapping');
}

// Organizations and surface types never gain a column; the type view hatches the unrecorded classes.
// Re-pinned 2026-10-23 to the promoted ledger and the 18-lane default (owner decision).
const organizationLayout = layoutTimeline(model, { by: 'organization', plotWidth: 690 });
assert.equal(organizationLayout.counts.named_lanes, 18); // 2.1.0: 14
assert.equal(organizationLayout.counts.strip_rows, 7965); // 2026-11-13 amplification chain: 7,946 -> 7,965. 2026-11-12 UK meetings, second intake: 7,583 -> 7,946. 2026-11-12 UK contract awards: 5,181 -> 7,583. 2026-11-12 Bitter Struggle chain: 5,123 -> 5,181. 2026-11-12 UK ministerial meetings: 4,046 -> 5,123. 2026-11-10 hand-judged Form D filings: 3,512 -> 4,046. 2026-11-10 Form D data sets: 3,055 -> 3,512. 2026-11-10 follow-up: 2926 -> 3055. 2026-11-10 one-pass entry: 2704 -> 2926. 2026-11-10 lens-hunt promotion: 2698 -> 2704. 2026-10-23 five-lane merge: 1,962 -> 2,698 // 2.1.0: 13 // 2026-10-23 hop-first default lanes: 1885 -> 1962
assert.equal(organizationLayout.counts.columns, 0);
assert.equal(organizationLayout.counts.blocks, 0);
assert.equal(organizationLayout.counts.marks + organizationLayout.counts.aggregated_rows + organizationLayout.counts.pre_domain, 8946); // 2026-11-13 amplification chain: 8,927 -> 8,946. 2026-11-12 UK meetings, second intake: 8,561 -> 8,927. 2026-11-12 UK contract awards: 5,764 -> 8,561. 2026-11-12 Bitter Struggle chain: 5,698 -> 5,764. 2026-11-12 UK ministerial meetings: 4,585 -> 5,698. 2026-11-10 hand-judged Form D filings: 4,051 -> 4,585. 2026-11-10 Form D data sets: 3,486 -> 4,051. 2026-11-10 follow-up: 3356 -> 3486. 2026-11-10 one-pass entry: 3117 -> 3356. 2026-11-10 lens-hunt promotion: 3111 -> 3117. 2026-10-23 five-lane merge: 2,159 -> 3,111. 2.1.0: 86
assert.equal(organizationLayout.counts.candidate_rows, 8946); // 2026-11-13 amplification chain: 8,927 -> 8,946. 2026-11-12 UK meetings, second intake: 8,561 -> 8,927. 2026-11-12 UK contract awards: 5,764 -> 8,561. 2026-11-12 Bitter Struggle chain: 5,698 -> 5,764. 2026-11-12 UK ministerial meetings: 4,585 -> 5,698. 2026-11-10 hand-judged Form D filings: 4,051 -> 4,585. 2026-11-10 Form D data sets: 3,486 -> 4,051. 2026-11-10 follow-up: 3356 -> 3486. 2026-11-10 one-pass entry: 3117 -> 3356. 2026-11-10 lens-hunt promotion: 3111 -> 3117. 2026-10-23 five-lane merge: 2,159 -> 3,111
assert.equal(organizationLayout.counts.rows_outside_grouping, 3288, 'actor rows are not part of an Organizations view'); // 2026-11-13 amplification chain: 3,263 -> 3,288. 2026-11-12 UK meetings, second intake: 3,050 -> 3,263. 2026-11-12 Bitter Struggle chain: 2,985 -> 3,050. 2026-11-12 UK ministerial meetings: 2,658 -> 2,985. 2026-11-10 hand-judged Form D filings: 2,139 -> 2,658. 2026-11-10 Form D data sets: 1,408 -> 2,139. 2026-11-10 follow-up: 1399 -> 1408. 2026-11-10 one-pass entry: 1313 -> 1399. 2026-11-10 lens-hunt promotion: 1300 -> 1313. 2026-10-23 final re-pin: 1340 -> 1300. 2026-10-23 five-lane merge: 959 -> 1,340. 2.1.0: 200
// Narrowed 2026-10-23: was the exact one-key list (Simon Case at the Cabinet Office); the rule is checked per key.
assert.equal(organizationLayout.hidden.pre_domain_overlapping.length, 95); // 2026-11-12 UK contract awards: 87 -> 95. 2026-11-12 UK ministerial meetings: 75 -> 87. 2026-11-10 hand-judged Form D filings: 78 -> 75. 2026-11-10 Form D data sets: 87 -> 78. 2026-11-10 follow-up: 78 -> 87. 2026-10-23 five-lane merge: 71 -> 78
for (const key of organizationLayout.hidden.pre_domain_overlapping) {
  const row = model.rowsByKey.get(key);
  assert.ok(row.start_day < organizationLayout.domain.from_day && (row.end_day == null || row.end_day >= organizationLayout.domain.from_day));
}
assert.ok(organizationLayout.lanes.every(lane => lane.height === 28), 'the default Organizations view never grows a lane');
assert.ok(organizationLayout.height <= TIMELINE_STAGE_BUDGETS.desktop, 'the default Organizations stage fits the desktop budget'); // 2026-10-23 final repair round: 574 -> 640px (owner decision)
checkMarks(organizationLayout, 4);
checkAccounting(organizationLayout);
// 2026-10-23 final repair round: overlapping-tick clustering fix. The 2026-05-08 Form D tick (drawn +5px by the
// same-day surface offset) and the 2026-06-17 leadership tick sat 1.93px apart in two clusters, because a row was
// only compared with the last x of the current cluster. Marks within the fold threshold now share one cluster.
{
  const cfKeys = ['sec-form-d-0002117419-26-000002::organization::capital-factory', 'capital-factory-leadership-as-reported-2026-06-17::organization::capital-factory'];
  const cfClusters = organizationLayout.clusters.filter(cluster => cfKeys.some(key => cluster.mark_keys.includes(key) || cluster.hidden_keys.includes(key)));
  assert.equal(cfClusters.length, 1, 'the two Capital Factory rows 1.93px apart fold into one cluster');
  for (const cluster of organizationLayout.clusters) {
    const xs = organizationLayout.marks.filter(mark => mark.clusterId === cluster.id).map(mark => mark.x);
    for (const other of organizationLayout.clusters) {
      if (other === cluster || other.laneId !== cluster.laneId) continue;
      const otherXs = organizationLayout.marks.filter(mark => mark.clusterId === other.id && mark.kind === 'day').map(mark => mark.x);
      for (const x of xs) for (const y of otherXs) assert.ok(Math.abs(x - y) >= organizationLayout.metrics.clusterGap || organizationLayout.marks.find(mark => mark.x === x && mark.clusterId === cluster.id).kind !== 'day', `${cluster.id} / ${other.id}: no two clusters within the fold threshold`);
    }
  }
}
const typeLayout = layoutTimeline(model, { by: 'type', plotWidth: 690, domainFrom: '2016-01-01', domainTo: '2026-09-11' });
assert.equal(typeLayout.counts.named_lanes, 17); // 2026-11-12 Bitter Struggle chain: 16 -> 17. 2026-10-23 five-lane merge: 14 -> 16
assert.equal(typeLayout.counts.marks, 152); // 2026-11-12 UK meetings, second intake: 153 -> 152. 2026-11-12 UK contract awards: 195 -> 153. 2026-11-12 Bitter Struggle chain: 185 -> 195. 2026-11-12 UK ministerial meetings: 187 -> 185. 2026-11-10 hand-judged Form D filings: 192 -> 187. 2026-11-10 Form D data sets: 195 -> 192. 2026-11-10 one-pass entry: 208 -> 195. 2026-11-10 lens-hunt promotion: 212 -> 208. 2026-10-23 final re-pin: 214 -> 212. 2026-10-23 five-lane merge: 147 -> 214. 2.1.0: 54
assert.equal(typeLayout.counts.total_rows, 3848, 'the surface-type view counts surfaces'); // 2026-11-13 amplification chain: 3,830 -> 3,848. 2026-11-12 UK meetings, second intake: 3,759 -> 3,830. 2026-11-12 UK contract awards: 2,371 -> 3,759. 2026-11-12 Bitter Struggle chain: 2,340 -> 2,371. 2026-11-12 UK ministerial meetings: 2,262 -> 2,340. 2026-11-10 hand-judged Form D filings: 1,746 -> 2,262. 2026-11-10 Form D data sets: 1,308 -> 1,746. 2026-11-10 follow-up: 1307 -> 1308. 2026-11-10 one-pass entry: 1160 -> 1307. 2026-11-10 lens-hunt promotion: 1155 -> 1160. 2026-10-23 five-lane merge: 858 -> 1,155. 2.1.0: 54
assert.equal(typeLayout.counts.rows_in_view, 3190); // 2026-11-13 amplification chain: 3,183 -> 3,190. 2026-11-12 UK meetings, second intake: 3,112 -> 3,183. 2026-11-12 UK contract awards: 1,753 -> 3,112. 2026-11-12 Bitter Struggle chain: 1,725 -> 1,753. 2026-11-12 UK ministerial meetings: 1,647 -> 1,725. 2026-11-10 hand-judged Form D filings: 1,224 -> 1,647. 2026-11-10 Form D data sets: 896 -> 1,224. 2026-11-10 follow-up: 895 -> 896. 2026-11-10 one-pass entry: 782 -> 895. 2026-11-10 lens-hunt promotion: 772 -> 782. 2026-10-23 five-lane merge: 516 -> 772
assert.equal(typeLayout.counts.marks + typeLayout.counts.aggregated_rows, typeLayout.counts.rows_in_view);
checkAccounting(typeLayout);
assert.equal(typeLayout.counts.columns, 0);
assert.equal(typeLayout.marks.filter(mark => !mark.evidence_recorded).length, 4); // 2026-11-12 UK contract awards: 1 -> 4. 2026-10-23 five-lane merge: 3 -> 1 (the rest now sit in +N aggregates). 2.1.0: 10
assert.ok(typeLayout.marks.filter(mark => !mark.evidence_recorded).every(mark => mark.evidence_class === null));
assert.ok(typeLayout.marks.every(mark => mark.key.startsWith('surface::')));

// The People-view rules below were written for the 2.1.0 default lanes; they run on those
// 15 lanes pinned (six slots), re-pinned 2026-10-23 to the promoted ledger.
const pinnedOriginal = extra => layoutTimeline(model, { plotWidth: 690, laneIds: ORIGINAL_DEFAULT_LANES, ...extra });
// Full range: the marc-warner|saul-klein edge yields two columns and nothing spans the gap between them.
const fullRange = pinnedOriginal({ domainFrom: '2016-01-01', domainTo: '2026-09-11' });
assert.equal(fullRange.counts.columns, 23); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 22 -> 23 (the Inherent seed round, 2026-05-31, is a hop column on Matt Clifford's lane). 2026-11-10 lens-hunt promotion: 18 -> 22. 2026-10-23 five-lane merge: 16 -> 18. 2.1.0: 19
assert.equal(fullRange.counts.pre_domain, 567); // 2026-11-10 hand-judged Form D filings: 476 -> 567. 2026-11-10 Form D data sets: 315 -> 476. 2026-11-10 one-pass entry: 305 -> 315. 2026-10-23 final re-pin: 310 -> 305. 2026-10-23 five-lane merge: 289 -> 310. 2.1.0: 0 (LinkedIn rows start from 1982)
const faculty = fullRange.columns.filter(column => column.actor_ids.includes('marc-warner') && column.actor_ids.includes('saul-klein'));
assert.deepEqual(faculty.map(column => column.iso_day), ['2018-01-24', '2024-10-10']);
assert.ok(fullRange.marks.filter(mark => ['marc-warner', 'saul-klein'].includes(mark.entity_id)).every(mark => mark.kind === 'day'), 'no mark spans 2019-2023 for them');
const yearMark = fullRange.marks.find(mark => mark.key === 'vote-leave-data-science-2016::actor::dominic-cummings');
assert.equal(yearMark.kind, 'year');
assert.equal(yearMark.iso_start, '2016-01-01');
assert.equal(yearMark.iso_end, '2016-12-31');
assert.ok(yearMark.w > 60, 'a year-precision row is a bar across the whole year, not a tick');
const openMarks = organizationLayout.marks.filter(mark => mark.kind === 'open');
assert.ok(openMarks.length >= 1);
// Narrowed 2026-10-23 five-lane merge: was openMarks[0] with entity 'united-states-army'. The United States Army
// no longer has a default Organizations lane (its open row sits in the strip), and the first open mark is now a
// Booz Allen Hamilton role from 2025-08-01 (62.9px). The rule (an open-ended row runs to the domain edge) is
// checked on the open mark that starts earliest: Anduril Industries from 2017-06-01.
const openMark = [...openMarks].sort((a, b) => (a.iso_start < b.iso_start ? -1 : a.iso_start > b.iso_start ? 1 : 0))[0];
assert.equal(openMark.entity_id, 'anduril-industries'); // 2026-10-23 five-lane merge: united-states-army -> anduril-industries (earliest open mark). 2.1.0: us-army
assert.equal(openMark.clipped_end, true);
assert.ok(openMark.w > 100, 'the open-ended row runs to the domain edge');
for (const mark of [...openMarks, ...layoutTimeline(model, { plotWidth: 690 }).marks.filter(item => item.kind === 'open')]) {
  assert.ok(mark.x + mark.w <= organizationLayout.plotLeft + organizationLayout.plotWidth + 1e-9 || mark.w === TIMELINE_DESKTOP_METRICS.markWidth,
    `open-ended ${mark.key} is clamped to the axis end`);
}
assert.ok(fullRange.counts.aggregates >= 1, 'at 0.18 px/day the strip clusters past six slots and collapses into +N');
assert.equal(fullRange.counts.marks + fullRange.counts.aggregated_rows, 2481, 'collapsed rows are still counted'); // 2026-11-13 amplification chain: 2,475 -> 2,481. 2026-11-12 UK meetings, second intake: 2,262 -> 2,475. 2026-11-12 Bitter Struggle chain: 2,206 -> 2,262. 2026-11-12 UK ministerial meetings: 1,903 -> 2,206. 2026-11-10 hand-judged Form D filings: 1,477 -> 1,903. 2026-11-10 Form D data sets: 912 -> 1,477. 2026-11-10 follow-up: 903 -> 912. 2026-11-10 one-pass entry: 827 -> 903. 2026-11-10 lens-hunt promotion: 814 -> 827. 2026-10-23 final re-pin: 845 -> 814. 2026-10-23 five-lane merge: 526 -> 845. 2.1.0: 52 + 38
assert.equal(fullRange.counts.rows_in_view, 2710); // 2026-11-13 amplification chain: 2,704 -> 2,710. 2026-11-12 UK meetings, second intake: 2,491 -> 2,704. 2026-11-12 Bitter Struggle chain: 2,435 -> 2,491. 2026-11-12 UK ministerial meetings: 2,043 -> 2,435. 2026-11-10 hand-judged Form D filings: 1,617 -> 2,043. 2026-11-10 Form D data sets: 1,052 -> 1,617. 2026-11-10 follow-up: 1043 -> 1052. 2026-11-10 one-pass entry: 967 -> 1043. 2026-11-10 lens-hunt promotion: 954 -> 967. 2026-10-23 final re-pin: 985 -> 954. 2026-10-23 five-lane merge: 637 -> 985. 2.1.0: 201
assert.equal(fullRange.counts.pre_domain_overlapping, 78); // 2.1.0: 0
checkAccounting(fullRange);

// Window (fix e): out-of-window marks are dimmed, never removed; status counts name the denominator.
const windowed = pinnedOriginal({ windowFrom: '2025-01-01', windowTo: '2025-12-31' });
assert.equal(windowed.window.active, true);
assert.equal(windowed.counts.marks, 113, 'the window removes nothing'); // 2026-11-12 UK meetings, second intake: 122 -> 113. 2026-11-12 UK contract awards: 124 -> 122. 2026-11-12 Bitter Struggle chain: 114 -> 124. 2026-11-12 UK ministerial meetings: 83 -> 114. 2026-11-10 hand-judged Form D filings: 82 -> 83. 2026-11-10 follow-up: 83 -> 82. 2026-11-10 lens-hunt promotion: 77 -> 83. 2026-10-23 five-lane merge: 67 -> 77. 2.1.0: 79
assert.equal(windowed.counts.marks, pinnedOriginal({}).counts.marks);
assert.equal(windowed.marks.filter(mark => mark.in_window).length, 41); // 2026-11-12 UK meetings, second intake: 46 -> 41. 2026-11-12 Bitter Struggle chain: 39 -> 46. 2026-11-12 UK ministerial meetings: 27 -> 39. 2026-10-23 five-lane merge: 23 -> 27
assert.equal(windowed.marks.filter(mark => !mark.in_window).length, 72); // 2026-11-12 UK meetings, second intake: 76 -> 72. 2026-11-12 UK contract awards: 78 -> 76. 2026-11-12 Bitter Struggle chain: 75 -> 78. 2026-11-12 UK ministerial meetings: 56 -> 75. 2026-11-10 hand-judged Form D filings: 55 -> 56. 2026-11-10 follow-up: 56 -> 55. 2026-11-10 lens-hunt promotion: 50 -> 56. 2026-10-23 five-lane merge: 44 -> 50
assert.equal(windowed.counts.in_window, 742); // 2026-11-13 amplification chain: 741 -> 742. 2026-11-12 UK meetings, second intake: 695 -> 741. 2026-11-12 UK contract awards: 702 -> 695. 2026-11-12 Bitter Struggle chain: 684 -> 702. 2026-11-12 UK ministerial meetings: 478 -> 684. 2026-11-10 hand-judged Form D filings: 399 -> 478. 2026-11-10 Form D data sets: 317 -> 399. 2026-11-10 follow-up: 310 -> 317. 2026-11-10 one-pass entry: 297 -> 310. 2026-11-10 lens-hunt promotion: 296 -> 297. 2026-10-23 final re-pin: 303 -> 296. 2026-10-23 five-lane merge: 233 -> 303
assert.equal(windowed.counts.rows_in_view, 2553); // 2026-11-13 amplification chain: 2,528 -> 2,553. 2026-11-12 UK meetings, second intake: 2,317 -> 2,528. 2026-11-12 UK contract awards: 2,467 -> 2,317. 2026-11-12 Bitter Struggle chain: 2,402 -> 2,467. 2026-11-12 UK ministerial meetings: 2,169 -> 2,402. 2026-11-10 hand-judged Form D filings: 1,671 -> 2,169. 2026-11-10 Form D data sets: 1,059 -> 1,671. 2026-11-10 follow-up: 1092 -> 1059. 2026-11-10 one-pass entry: 1016 -> 1092. 2026-11-10 lens-hunt promotion: 1003 -> 1016. 2026-10-23 final re-pin: 1038 -> 1003. 2026-10-23 five-lane merge: 739 -> 1,038
assert.equal(windowed.blocks[0].in_window, false);
assert.equal(windowed.blocks[0].in_window_count, 0);
checkAccounting(windowed);
assert.ok(windowed.marks.find(mark => mark.key === 'electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner').in_window, 'a span covering the window is in it');
assert.equal(layoutTimeline(model, { plotWidth: 690 }).window.active, false);

// Hop and evidence filters remove rows and say how many: the dense block's
// members go through the same filters and are counted when they drop.
const dialogMemberKeys = [...dialog.member_keys].sort();
const hopOnly = pinnedOriginal({ hop: 'hop' });
assert.ok(hopOnly.marks.every(mark => mark.hop_eligible));
assert.equal(hopOnly.counts.columns, 35); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 34 -> 35 (the Inherent seed round, 2026-05-31, is a hop column on Matt Clifford's lane). 2026-11-12 UK contract awards: 37 -> 34. 2026-11-12 UK ministerial meetings: 38 -> 37. 2026-11-10 Form D data sets: 37 -> 38. 2026-11-10 follow-up: 38 -> 37. 2026-11-10 lens-hunt promotion: 34 -> 38. 2026-10-23 final re-pin: 35 -> 34. 2026-10-23 five-lane merge: 21 -> 35
assert.equal(hopOnly.counts.blocks, 0, 'the Dialog roster is context-only');
assert.equal(hopOnly.counts.marks, 99); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 98 -> 99 (Matt Clifford's Inherent seed round mark moves from context to hop). 2026-11-12 UK contract awards: 102 -> 98. 2026-11-12 UK ministerial meetings: 99 -> 102. 2026-11-10 hand-judged Form D filings: 101 -> 99. 2026-11-10 Form D data sets: 102 -> 101. 2026-11-10 follow-up: 101 -> 102. 2026-11-10 lens-hunt promotion: 92 -> 101. 2026-10-23 final re-pin: 99 -> 92. 2026-10-23 five-lane merge: 69 -> 99
assert.equal(hopOnly.counts.rows_in_view, 191); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 187 -> 191 (the four person rows of the roster). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 180 -> 187 (the seven person rows of the two ruled surfaces, five on the Inherent seed round and two on the co-authorship, move from context to hop). 2026-11-12 UK contract awards: 187 -> 180. 2026-11-12 UK ministerial meetings: 190 -> 187. 2026-11-10 Form D data sets: 187 -> 190. 2026-11-10 follow-up: 190 -> 187. 2026-11-10 lens-hunt promotion: 178 -> 190. 2026-10-23 final re-pin: 202 -> 178. 2026-10-23 five-lane merge: 78 -> 202
assert.equal(hopOnly.counts.filtered, 3144); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 3,148 -> 3,144. 2026-11-13 amplification chain: 3,123 -> 3,148. 2026-11-12 UK meetings, second intake: 2,910 -> 3,123. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 2,917 -> 2,910. 2026-11-12 Bitter Struggle chain: 2,852 -> 2,917. 2026-11-12 UK ministerial meetings: 2,460 -> 2,852. 2026-11-10 hand-judged Form D filings: 1,941 -> 2,460. 2026-11-10 Form D data sets: 1,210 -> 1,941. 2026-11-10 follow-up: 1201 -> 1210. 2026-11-10 one-pass entry: 1115 -> 1201. 2026-11-10 lens-hunt promotion: 1114 -> 1115. 2026-10-23 final re-pin: 1126 -> 1114. 2026-10-23 five-lane merge: 882 -> 1,126
assert.equal(hopOnly.counts.pre_domain, 26); // 2026-11-12 UK contract awards: 19 -> 26. 2026-11-12 UK ministerial meetings: 16 -> 19. 2026-11-10 Form D data sets: 19 -> 16. 2026-11-10 follow-up: 16 -> 19. 2026-10-23 final re-pin: 20 -> 16. 2026-10-23 five-lane merge: 0 -> 20 (hop-eligible rows before the 2016 domain start)
assert.ok(dialogMemberKeys.every(key => hopOnly.hidden.filtered.includes(key)), 'every roster member the hop filter hides is listed');
checkAccounting(hopOnly);
const contextOnly = pinnedOriginal({ hop: 'context' });
assert.ok(contextOnly.marks.every(mark => !mark.hop_eligible));
assert.equal(contextOnly.counts.columns, 0);
assert.equal(contextOnly.counts.blocks, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2
assert.equal(contextOnly.counts.marks, 78); // 2026-11-12 UK meetings, second intake: 88 -> 78. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 89 -> 88 (Matt Clifford's Inherent seed round mark moves from context to hop). 2026-11-12 UK contract awards: 87 -> 89. 2026-11-12 Bitter Struggle chain: 78 -> 87. 2026-11-12 UK ministerial meetings: 46 -> 78. 2026-11-10 hand-judged Form D filings: 45 -> 46. 2026-11-10 follow-up: 46 -> 45. 2026-11-10 lens-hunt promotion: 45 -> 46. 2026-10-23 five-lane merge: 37 -> 45
assert.equal(contextOnly.counts.rows_in_view, 2362); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 2,366 -> 2,362. 2026-11-13 amplification chain: 2,341 -> 2,366. 2026-11-12 UK meetings, second intake: 2,130 -> 2,341. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 2,137 -> 2,130. 2026-11-12 UK contract awards: 2,280 -> 2,137. 2026-11-12 Bitter Struggle chain: 2,215 -> 2,280. 2026-11-12 UK ministerial meetings: 1,979 -> 2,215. 2026-11-10 hand-judged Form D filings: 1,481 -> 1,979. 2026-11-10 Form D data sets: 872 -> 1,481. 2026-11-10 follow-up: 902 -> 872. 2026-11-10 one-pass entry: 826 -> 902. 2026-11-10 lens-hunt promotion: 825 -> 826. 2026-10-23 final re-pin: 836 -> 825. 2026-10-23 five-lane merge: 661 -> 836
assert.equal(contextOnly.counts.filtered, 217); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 213 -> 217. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 206 -> 213. 2026-11-10 lens-hunt promotion: 194 -> 206. 2026-10-23 final re-pin: 222 -> 194. 2026-10-23 five-lane merge: 78 -> 222
checkAccounting(contextOnly);
assert.equal(hopOnly.counts.filtered + contextOnly.counts.filtered, 3361, 'hop and context filters partition the People view'); // 2026-11-13 amplification chain: 3,336 -> 3,361. 2026-11-12 UK meetings, second intake: 3,123 -> 3,336. 2026-11-12 Bitter Struggle chain: 3,058 -> 3,123. 2026-11-12 UK ministerial meetings: 2,666 -> 3,058. 2026-11-10 hand-judged Form D filings: 2,147 -> 2,666. 2026-11-10 Form D data sets: 1,416 -> 2,147. 2026-11-10 follow-up: 1407 -> 1416. 2026-11-10 one-pass entry: 1321 -> 1407. 2026-11-10 lens-hunt promotion: 1308 -> 1321. 2026-10-23 final re-pin: 1348 -> 1308. 2026-10-23 five-lane merge: 960 -> 1,348
const officialOnly = pinnedOriginal({ evidenceFloor: 'official' });
assert.ok(officialOnly.marks.every(mark => mark.evidence_class === 'official'));
// Narrowed 2026-10-23 five-lane merge. Old: officialOnly.counts.columns < pinnedOriginal({}).counts.columns. With
// the merged rows the unfiltered strip folds many same-day marks into +N, which hides their columns (18 drawn), while
// the official floor empties the strip enough to draw 22, so the drawn-column count is no longer a proxy for the rule.
// New: the rule is checked on the bases themselves: the hop-only view draws non-official bases, and the official floor
// draws fewer bases than the hop-only view (91 < 200 today), every one of them official (checked below).
const drawnBases = layout => layout.columns.reduce((sum, column) => sum + column.basis_count, 0);
assert.ok(hopOnly.columns.some(column => column.pairs.some(pair => pair.evidence_class !== 'official')) && drawnBases(officialOnly) < drawnBases(hopOnly), 'primary_public bases drop below the official floor');
assert.equal(officialOnly.counts.columns, 15); // 2026-11-12 UK contract awards: 17 -> 15. 2026-11-10 hand-judged Form D filings: 18 -> 17. 2026-11-10 Form D data sets: 25 -> 18. 2026-11-10 lens-hunt promotion: 23 -> 25. 2026-10-23 final re-pin: 22 -> 23. 2026-10-23 five-lane merge: 14 -> 22
assert.equal(officialOnly.counts.blocks, 1, 'no Dialog row is official (112 primary_public, 1 reported), so its block is not drawn; the official DSIT return block is'); // 2026-11-12 UK ministerial meetings: 0 -> 1.
assert.equal(officialOnly.counts.marks, 97); // 2026-11-12 UK meetings, second intake: 117 -> 97. 2026-11-12 UK contract awards: 133 -> 117. 2026-11-12 Bitter Struggle chain: 126 -> 133. 2026-11-12 UK ministerial meetings: 103 -> 126. 2026-11-10 hand-judged Form D filings: 125 -> 103. 2026-11-10 Form D data sets: 163 -> 125. 2026-11-10 follow-up: 162 -> 163. 2026-11-10 one-pass entry: 148 -> 162. 2026-11-10 lens-hunt promotion: 143 -> 148. 2026-10-23 final re-pin: 162 -> 143. 2026-10-23 five-lane merge: 69 -> 162
assert.equal(officialOnly.counts.rows_in_view, 1769); // 2026-11-13 amplification chain: 1,766 -> 1,769. 2026-11-12 UK meetings, second intake: 1,555 -> 1,766. 2026-11-12 UK contract awards: 1,635 -> 1,555. 2026-11-12 Bitter Struggle chain: 1,609 -> 1,635. 2026-11-12 UK ministerial meetings: 1,313 -> 1,609. 2026-11-10 hand-judged Form D filings: 840 -> 1,313. 2026-11-10 Form D data sets: 266 -> 840. 2026-11-10 follow-up: 261 -> 266. 2026-11-10 one-pass entry: 187 -> 261. 2026-11-10 lens-hunt promotion: 174 -> 187. 2026-10-23 final re-pin: 207 -> 174. 2026-10-23 five-lane merge: 69 -> 207
assert.equal(officialOnly.counts.filtered, 1181); // 2026-11-13 amplification chain: 1,159 -> 1,181. 2026-11-12 Bitter Struggle chain: 1,120 -> 1,159. 2026-11-10 one-pass entry: 1118 -> 1120. 2026-10-23 final re-pin: 1121 -> 1118. 2026-10-23 five-lane merge: 891 -> 1,121
assert.equal(officialOnly.counts.pre_domain, 411); // 2026-11-12 UK meetings, second intake: 409 -> 411. 2026-11-12 UK contract awards: 329 -> 409. 2026-11-12 UK ministerial meetings: 233 -> 329. 2026-11-10 hand-judged Form D filings: 187 -> 233. 2026-11-10 Form D data sets: 30 -> 187. 2026-11-10 follow-up: 26 -> 30. 2026-11-10 one-pass entry: 16 -> 26. 2026-10-23 final re-pin: 20 -> 16. 2026-10-23 five-lane merge: 0 -> 20
assert.ok(dialogMemberKeys.every(key => officialOnly.hidden.filtered.includes(key)), 'every roster member below the floor is listed');
assert.ok(!officialOnly.marks.some(mark => mark.surface_id === dialog.surface_id));
checkAccounting(officialOnly);
for (const column of officialOnly.columns) assert.ok(column.pairs.every(pair => pair.evidence_class === 'official'));
const primaryPublic = pinnedOriginal({ evidenceFloor: 'primary_public' });
assert.equal(primaryPublic.counts.blocks, 3); // 2026-11-12 UK ministerial meetings: 2 -> 3. 2026-10-23 five-lane merge: 1 -> 2
// Narrowed 2026-10-23 five-lane merge: was primaryPublic.blocks[0]; the Dialog block is now found by surface id (rndf-2023 sorts first).
const primaryDialog = primaryPublic.blocks.find(entry => entry.surface_id === dialog.surface_id);
assert.equal(primaryDialog.visible_row_count, 112, 'the one reported row drops below the primary_public floor');
assert.equal(primaryDialog.visible_listed_count, 111, 'that row is a listed name; the organization row is primary_public');
assert.equal(primaryDialog.filtered_count, 1);
assert.deepEqual(primaryDialog.filtered_member_keys, [`${dialog.surface_id}::actor::alexus-grynkewich`]);
assert.ok(primaryPublic.hidden.filtered.includes(`${dialog.surface_id}::actor::alexus-grynkewich`));
assert.equal(primaryPublic.counts.filtered, 788); // 2026-11-13 amplification chain: 787 -> 788. 2026-11-12 Bitter Struggle chain: 784 -> 787. 2026-10-23 final re-pin: 787 -> 784. 2026-10-23 five-lane merge: 731 -> 787
assert.equal(primaryPublic.counts.rows_in_view, 2159); // 2026-11-13 amplification chain: 2,135 -> 2,159. 2026-11-12 UK meetings, second intake: 1,924 -> 2,135. 2026-11-12 UK contract awards: 2,005 -> 1,924. 2026-11-12 Bitter Struggle chain: 1,943 -> 2,005. 2026-11-12 UK ministerial meetings: 1,649 -> 1,943. 2026-11-10 hand-judged Form D filings: 1,176 -> 1,649. 2026-11-10 Form D data sets: 600 -> 1,176. 2026-11-10 follow-up: 597 -> 600. 2026-11-10 one-pass entry: 521 -> 597. 2026-11-10 lens-hunt promotion: 508 -> 521. 2026-10-23 final re-pin: 541 -> 508. 2026-10-23 five-lane merge: 229 -> 541
checkAccounting(primaryPublic);
// A year chip puts the roster day outside the domain: its rows are listed as post-domain, not lost.
const year2024 = pinnedOriginal({ domainFrom: '2024-01-01', domainTo: '2024-12-31' });
assert.equal(year2024.counts.blocks, 0);
assert.equal(year2024.counts.marks, 100); // 2026-11-12 UK meetings, second intake: 105 -> 100. 2026-11-12 Bitter Struggle chain: 109 -> 105. 2026-11-12 UK ministerial meetings: 75 -> 109. 2026-11-10 hand-judged Form D filings: 82 -> 75. 2026-11-10 Form D data sets: 78 -> 82. 2026-11-10 one-pass entry: 70 -> 78. 2026-10-23 final re-pin: 73 -> 70. 2026-10-23 five-lane merge: 54 -> 73
assert.equal(year2024.counts.columns, 4); // 2026-11-12 UK ministerial meetings: 5 -> 4. 2026-11-10 hand-judged Form D filings: 7 -> 5. 2026-10-23 five-lane merge: 3 -> 7
assert.equal(year2024.counts.pre_domain, 1830); // 2026-11-12 UK meetings, second intake: 1,723 -> 1,830. 2026-11-12 Bitter Struggle chain: 1,702 -> 1,723. 2026-11-12 UK ministerial meetings: 1,648 -> 1,702. 2026-11-10 hand-judged Form D filings: 1,338 -> 1,648. 2026-11-10 Form D data sets: 840 -> 1,338. 2026-11-10 one-pass entry: 806 -> 840. 2026-11-10 lens-hunt promotion: 794 -> 806. 2026-10-23 final re-pin: 811 -> 794. 2026-10-23 five-lane merge: 625 -> 811
assert.equal(year2024.counts.post_domain, 1148); // 2026-11-13 amplification chain: 1,124 -> 1,148. 2026-11-12 UK meetings, second intake: 1,048 -> 1,124. 2026-11-12 Bitter Struggle chain: 1,006 -> 1,048. 2026-11-12 UK ministerial meetings: 766 -> 1,006. 2026-11-10 hand-judged Form D filings: 616 -> 766. 2026-11-10 Form D data sets: 441 -> 616. 2026-11-10 follow-up: 432 -> 441. 2026-11-10 one-pass entry: 394 -> 432. 2026-11-10 lens-hunt promotion: 393 -> 394. 2026-10-23 final re-pin: 409 -> 393. 2026-10-23 five-lane merge: 281 -> 409
assert.ok(dialogMemberKeys.every(key => year2024.hidden.post_domain.includes(key)));
assert.equal(year2024.hidden.pre_domain_overlapping.length, 141); // 2026-11-12 Bitter Struggle chain: 140 -> 141.
// 2026-11-12 Bitter Struggle chain: + Matt Clifford's AISI Advisory Board membership (from 3 November 2023, last observed 12 February 2025).
assert.deepEqual(year2024.hidden.pre_domain_overlapping.filter(key => ORIGINAL_DEFAULT_LANES.some(id => key.endsWith(`::actor::${id}`))), [
  'electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner',
  'matt-clifford-aisi-advisory-board-member-2023-11-03::actor::matt-clifford',
  'simon-case-uk-government-cabinet-secretary-linkedin-2020-2024::actor::simon-case',
  'simon-case-cabinet-secretary-2020-2024::actor::simon-case',
  'electric-twin-alex-cooper-director-tenure-2023-09-28::actor::alex-cooper'
], 'spans of the named lanes active in 2024 that began earlier are flagged for the status text');
checkAccounting(year2024);
const pinnedLayout = layoutTimeline(model, { plotWidth: 690, laneIds: ['ben-warner'], hop: 'hop', evidenceFloor: 'official' });
assert.equal(pinnedLayout.counts.candidate_rows, 3361, 'pinned lanes: the strip carries every other actor row, the blocks their rosters'); // 2026-11-13 amplification chain: 3,336 -> 3,361. 2026-11-12 UK meetings, second intake: 3,123 -> 3,336. 2026-11-12 Bitter Struggle chain: 3,058 -> 3,123. 2026-11-12 UK ministerial meetings: 2,666 -> 3,058. 2026-11-10 hand-judged Form D filings: 2,147 -> 2,666. 2026-11-10 Form D data sets: 1,416 -> 2,147. 2026-11-10 follow-up: 1407 -> 1416. 2026-11-10 one-pass entry: 1321 -> 1407. 2026-11-10 lens-hunt promotion: 1308 -> 1321. 2026-10-23 final re-pin: 1348 -> 1308. 2026-10-23 five-lane merge: 960 -> 1,348
checkAccounting(pinnedLayout);

// --- entity summaries and the single-lane layout the entity pages reuse
const summary = entityTimelineSummary(model, 'actor', 'ben-warner');
assert.equal(summary.row_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(summary.surface_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(summary.hop_eligible_surface_count, 8); // 2026-11-10 lens-hunt promotion: 6 -> 8.
assert.equal(summary.context_surface_count, 9); // 2026-11-10 lens-hunt promotion: 6 -> 9. 2026-10-23 five-lane merge: 4 -> 6
assert.equal(summary.rows[0].time_start, '2018-01-24');
assert.equal(summary.rows.at(-1).time_start, '2026-07-29', 'rows are date-sorted, not ledger-ordered'); // 2026-10-23 five-lane merge: 2026-07-08 -> 2026-07-29
assert.equal(summary.receipt_ids.length, 24); // 2026-11-10 lens-hunt promotion: 17 -> 24. 2026-10-23 five-lane merge: 14 -> 17
assert.equal(entityTimelineSummary(model, 'actor', 'nobody'), null);
assert.equal(entityTimelineSummary(model, 'organization', 'electric-twin').kind_counts.span, 5);
assert.equal(entityTimelineSummary(model, 'surface', dialog.surface_id).row_count, 113);
const lane = entityLaneLayout(model, 'actor', 'ben-warner', { plotWidth: 600 });
assert.equal(lane.lanes.length, 1);
assert.equal(lane.counts.marks, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(lane.counts.columns, 0);
assert.equal(lane.counts.blocks, 0);
assert.equal(lane.domain.from, '1982-05-01'); // 2026-10-23 promotion: the record now starts 1982-05-01 (was 2016-01-01)
assert.equal(lane.domain.to, '2026-12-13'); // 2026-11-13 amplification chain: 2026-12-10 -> 2026-12-13 (the automatic domain end follows the end of record 2026-11-10 -> 2026-11-13). 2026-11-12 Bitter Struggle chain: 2026-11-22 -> 2026-12-10 (the automatic domain end follows the end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface). 2026-10-23 promotion: was 2026-09-11
assert.equal(lane.height, 48, 'over the 44-year record the Warner rows stack higher'); // 2026-10-23 five-lane merge: 38 -> 48 (was 'stack three high'). 2026-10-23 promotion: was 28
checkAccounting(lane);
assert.equal(lane.counts.candidate_rows, 17, 'a single-lane layout considers that lane only'); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
const orgLane = entityLaneLayout(model, 'organization', 'electric-twin', { plotWidth: 600 });
assert.equal(orgLane.counts.marks + orgLane.counts.aggregated_rows, 22, 'at 0.15 px/day the 2026 rows chain past six slots into a +N aggregate'); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(orgLane.counts.rows_in_view, 22); // 2026-10-23 five-lane merge: 18 -> 22
checkAccounting(orgLane);
assert.equal(orgLane.marks.filter(mark => mark.kind === 'span').length, 4); // 2026-10-23 five-lane merge: 5 -> 4 (one of the five spans now sits in the +N aggregate)
assert.equal(entityLaneLayout(model, 'organization', 'electric-twin', { plotWidth: 1400, domainFrom: '2023-01-01' }).counts.marks, 22, 'wide enough, every row is its own mark'); // 2026-10-23 five-lane merge: 18 -> 22 // 2026-10-23: the full record now starts 1982, so the domain is set to 2023
const dialogLane = entityLaneLayout(model, 'surface', dialog.surface_id, { plotWidth: 600 });
assert.equal(dialogLane.lanes.length, 1);
assert.equal(dialogLane.counts.marks, TIMELINE_CLUSTER_SLOTS - 1, '113 rows on one day: five drawn, the rest collapse into +N');
assert.equal(dialogLane.counts.aggregates, 1);
assert.equal(dialogLane.aggregates[0].count, 113 - (TIMELINE_CLUSTER_SLOTS - 1));
assert.equal(dialogLane.counts.marks + dialogLane.counts.aggregated_rows, 113);
assert.equal(dialogLane.counts.rows_in_view, 113);
assert.deepEqual(dialogLane.aggregates[0].evidence_counts, { primary_public: 108 }, 'the +N says which evidence classes it hides');
assert.ok(dialogLane.marks.some(mark => mark.evidence_class === 'reported'), 'the one reported row sorts into the drawn slots by key');
checkAccounting(dialogLane);
assert.equal(dialogLane.lanes[0].height, 8 + 10 * TIMELINE_CLUSTER_SLOTS);

// --- synthetic fixture: undated, month, open, year, dense and two surfaces on one day
const fixtureActors = ['a', 'b', 'c', 'd', ...Array.from({ length: 21 }, (_, index) => `r${index + 1}`)].map(id => ({ id, label: id.toUpperCase() }));
const participant = (surface_id, actor_id, time_start, time_end, evidence_class = 'official') => ({ surface_id, participant_type: 'actor', actor_id, role: 'Member', participation_type: 'member', time_start, time_end, evidence_class, receipt_ids: [`r-${surface_id}`] });
const fixture = {
  actors: fixtureActors,
  organizations: [{ id: 'org', label: 'Org' }],
  surfaces: [
    { surface_id: 's-day', surface_label: 'Day surface', surface_type: 'board_surface', hop_eligible: true, time_start: '2024-05-01', time_end: '2024-05-01', receipt_ids: ['r-s-day'],
      participants: [participant('s-day', 'a', '2024-05-01', '2024-05-01'), participant('s-day', 'b', '2024-05-01', '2024-05-01'), { surface_id: 's-day', participant_type: 'organization', organization_id: 'org', role: 'Venue', participation_type: 'venue', time_start: '2024-05-01', time_end: '2024-05-01', evidence_class: 'official', receipt_ids: [] }] },
    { surface_id: 's-same-day', surface_label: 'Second surface, same day', surface_type: 'capital_surface', hop_eligible: false, hop_refusal_reason: 'organization_only_evidence', time_start: '2024-05-01', time_end: '2024-05-01', receipt_ids: ['r-s-same-day'],
      participants: [participant('s-same-day', 'a', '2024-05-01', '2024-05-01', 'primary_public'), participant('s-same-day', 'c', '2024-05-01', '2024-05-01', 'primary_public')] },
    { surface_id: 's-undated', surface_label: 'Undated surface', surface_type: 'forum_surface', hop_eligible: false, time_start: null, time_end: null, receipt_ids: ['r-s-undated'],
      participants: [participant('s-undated', 'b', null, null, 'reported')] },
    { surface_id: 's-month', surface_label: 'Month surface', surface_type: 'forum_surface', hop_eligible: false, time_start: '2024-02', time_end: '2024-02', receipt_ids: ['r-s-month'],
      participants: [participant('s-month', 'c', '2024-02', '2024-02')] },
    { surface_id: 's-open', surface_label: 'Open surface', surface_type: 'forum_surface', hop_eligible: false, time_start: '2024-09-01', time_end: '', receipt_ids: ['r-s-open'],
      participants: [participant('s-open', 'd', '2024-09-01', '')] },
    { surface_id: 's-year', surface_label: 'Year surface', surface_type: 'campaign_surface', hop_eligible: false, time_start: '2023', time_end: '2023', receipt_ids: ['r-s-year'],
      participants: [participant('s-year', 'd', '2023', '2023')] },
    { surface_id: 's-dense', surface_label: 'Dense roster', surface_type: 'directory_roster_surface', hop_eligible: false, hop_refusal_reason: 'dense_directory_listing_not_shared_participation', time_start: '2024-11-11', time_end: '2024-11-11', receipt_ids: ['r-s-dense'],
      participants: [participant('s-dense', 'a', '2024-11-11', '2024-11-11', 'primary_public'), ...Array.from({ length: 21 }, (_, index) => participant('s-dense', `r${index + 1}`, '2024-11-11', '2024-11-11', 'primary_public'))] }
  ]
};
const fixtureHops = {
  edges: [{ actor_a: 'a', actor_b: 'b', temporal_envelope: { valid_from: '1999-01-01', valid_until: '2099-12-31' }, surfaces: [{ surface_id: 's-day', surface_label: 'Day surface', surface_type: 'board_surface', actor_a_role: 'Member', actor_b_role: 'Member', evidence_class: 'official', valid_from: '2024-05-01', valid_until: '2024-05-01', temporal_status: 'dated', receipt_ids: ['r-s-day'] }] }],
  rejected_hop_surfaces: [{ surface_id: 's-same-day', reason: 'organization_only_evidence' }, { surface_id: 's-undated', reason: 'surface_not_hop_eligible' }, { surface_id: 's-dense', reason: 'dense_directory_listing_not_shared_participation' }]
};
const fixtureModel = buildTimelineModel(fixture, fixtureHops);
assert.deepEqual(fixtureModel.counts.kinds, { day: 27, span: 1, year: 1, open: 1, undated: 1 });
const undated = fixtureModel.rowsByKey.get('s-undated::actor::b');
assert.equal(undated.kind, 'undated');
assert.equal(undated.precision, 'undated');
assert.equal(undated.start_day, null);
assert.equal(rowInWindow(undated, dayIndex('2030-01-01'), dayIndex('2030-12-31')), true, 'undated rows are never sliced');
const month = fixtureModel.rowsByKey.get('s-month::actor::c');
assert.equal(month.kind, 'span');
assert.equal(month.precision, 'month');
assert.equal(isoFromDayIndex(month.start_day), '2024-02-01');
assert.equal(isoFromDayIndex(month.end_day), '2024-02-29');
assert.equal(fixtureModel.dense.length, 1);
assert.equal(fixtureModel.dense[0].listed_count, 22);
assert.deepEqual(fixtureModel.dense[0].elsewhere.map(entry => entry.actor_id), ['a']);
assert.equal(fixtureModel.dense[0].nowhere_else_count, 21);
assert.deepEqual(fixtureModel.refusalReasons.get('s-undated'), { reason: 'surface_not_hop_eligible', reason_recorded: false });
assert.equal(fixtureModel.range.first_day, '2023-01-01');
const fixtureLayout = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2023-01-01', domainTo: '2025-01-01' });
assert.deepEqual(fixtureLayout.lanes.filter(lane => lane.kind === 'entity').map(lane => lane.entity_id), ['d', 'c', 'a', 'b'], 'first day then label');
assert.deepEqual(fixtureLayout.hidden.undated, ['s-undated::actor::b'], 'undated rows are listed, never positioned');
assert.ok(!fixtureLayout.marks.some(mark => mark.key === 's-undated::actor::b'));
assert.equal(fixtureLayout.counts.undated, 1);
assert.equal(fixtureLayout.counts.blocks, 1);
assert.equal(fixtureLayout.blocks[0].listed_count, 22);
assert.equal(fixtureLayout.marks.filter(mark => mark.surface_id === 's-dense').length, 1, 'only the cross-referenced person gets a personal mark');
assert.equal(fixtureLayout.marks.filter(mark => mark.surface_id === 's-dense')[0].entity_id, 'a');
assert.ok(!fixtureLayout.marks.some(mark => /^r\d+$/.test(mark.entity_id)), 'roster-only names are never drawn individually');
assert.equal(fixtureLayout.counts.columns, 1);
assert.deepEqual(fixtureLayout.columns[0].segments.map(segment => segment.laneId).sort(), ['a', 'b']);
assert.ok(!fixtureLayout.columns[0].segments.some(segment => segment.laneId === 'c'), 'c shares the day on another surface and is not touched');
const sameDay = fixtureLayout.marks.filter(mark => mark.entity_id === 'a' && mark.iso_start === '2024-05-01').sort((x, y) => x.surface_id < y.surface_id ? -1 : 1);
assert.equal(sameDay[1].x - sameDay[0].x, TIMELINE_DESKTOP_METRICS.slotOffset);
assert.equal(fixtureLayout.columns[0].x, sameDay[0].x, 'the column stands over its own surface marks');
assert.equal(fixtureLayout.marks.find(mark => mark.key === 's-open::actor::d').clipped_end, true);
assert.equal(fixtureLayout.marks.find(mark => mark.key === 's-year::actor::d').kind, 'year');
assert.equal(fixtureLayout.counts.total_rows, 31);
assert.equal(fixtureLayout.counts.candidate_rows, 30, '30 actor rows; the venue organization row is outside the People view');
assert.equal(fixtureLayout.counts.rows_in_view, 29, '8 marks + 22 block members with a\'s dense row counted once');
assert.equal(fixtureLayout.counts.rows_outside_grouping, 1);
checkAccounting(fixtureLayout, fixtureModel);
const fixtureOfficial = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2023-01-01', domainTo: '2025-01-01', evidenceFloor: 'official' });
assert.equal(fixtureOfficial.counts.blocks, 0, 'a roster with no member at the floor is not drawn');
assert.equal(fixtureOfficial.counts.filtered, 25, '22 roster rows + the two primary_public rows on the same-day surface + the reported undated row (filters run before placement)');
assert.equal(fixtureOfficial.counts.undated, 0);
assert.ok(fixtureModel.dense[0].member_keys.every(key => fixtureOfficial.hidden.filtered.includes(key)));
assert.equal(fixtureOfficial.counts.rows_in_view, 5);
checkAccounting(fixtureOfficial, fixtureModel);
const fixtureEarly = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2024-06-01', domainTo: '2024-10-01' });
assert.equal(fixtureEarly.counts.blocks, 0, 'the roster day is after the domain');
assert.ok(fixtureModel.dense[0].member_keys.every(key => fixtureEarly.hidden.post_domain.includes(key)), 'its members are listed as post-domain');
assert.deepEqual(fixtureEarly.hidden.pre_domain_overlapping, [], 'the year bar ended in 2023 and the day rows are single days');
checkAccounting(fixtureEarly, fixtureModel);
assert.equal(layoutTimeline(fixtureModel, { plotWidth: 400, laneIds: ['b'] }).lanes.filter(lane => lane.kind === 'entity').length, 1);

// --- the standalone flattening (tools/build-standalone.mjs): core then timeline, imports stripped
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
assert.match(standaloneBuilder, /'src\/visual-aperture-timeline\.mjs'/, 'the module is in apertureModuleFiles');
assert.match(standaloneBuilder, /isolateModule\(source\)/, 'import-bearing modules go through isolateModule');
function isolateModule(moduleSource) {
  const exportedNames = [...moduleSource.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  const body = moduleSource.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}
const records = ['src/visual-aperture-core.mjs', 'src/visual-aperture-timeline.mjs'].map(file => {
  const moduleSource = readFileSync(file, 'utf8');
  const names = [...moduleSource.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  const body = /^import\s/m.test(moduleSource) ? `const { ${names.join(', ')} } = ${isolateModule(moduleSource)};` : moduleSource.replace(/^export\s+/gm, '');
  return { names, body };
});
const bundle = records.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
assert.doesNotMatch(bundle, /^import\s/m, 'no import statement survives into the classic script');
assert.doesNotThrow(() => new Function(bundle));
const context = vm.createContext({});
vm.runInContext(`${bundle}\nglobalThis.__result = (() => { const m = buildTimelineModel(SURFACE_GRAPH, HOP_GRAPH); const l = layoutTimeline(m, { plotWidth: 690 }); return { rows: m.counts.rows, drawn: l.counts.drawn, columns: l.counts.columns }; })();`.replace('SURFACE_GRAPH', JSON.stringify(surfaceGraph)).replace('HOP_GRAPH', JSON.stringify(hopGraph)), context);
assert.deepEqual(JSON.parse(JSON.stringify(context.__result)), { rows: 12234, drawn: 172, columns: 30 }, 'the flattened module works from globalThis like the live page'); // 2026-11-13 amplification chain: rows 12,190 -> 12,234. 2026-11-12 UK meetings, second intake: rows 11,611 -> 12,190. 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): columns 29 -> 30. 2026-11-12 UK contract awards: rows 8,814 -> 11,611, drawn 176 -> 172. 2026-11-12 Bitter Struggle chain: rows 8,683 -> 8,814, drawn 174 -> 176, columns 31 -> 29. 2026-11-12 UK ministerial meetings: rows 7,243 -> 8,683, drawn 177 -> 174. 2026-11-10 hand-judged Form D filings: rows 6,190 -> 7,243, drawn 167 -> 177. 2026-11-10 Form D data sets: rows 4,894 -> 6,190, drawn 125 -> 167. 2026-11-10 follow-up: { rows: 4755, drawn: 132, columns: 31 } -> { rows: 4894, drawn: 125, columns: 31 } (the automatic domain opens on 2017-01-01). 2026-11-10 one-pass entry: { rows: 4430, drawn: 127, columns: 31 } -> { rows: 4755, drawn: 132, columns: 31 }. 2026-11-10 lens-hunt promotion: { rows: 4411, drawn: 123, columns: 28 } -> { rows: 4430, drawn: 127, columns: 31 }.  2026-10-23 final re-pin: { rows: 4451, drawn: 149, columns: 35 } -> { rows: 4411, drawn: 123, columns: 28 }.  2026-10-23 five-lane merge: { rows: 3118, drawn: 47, columns: 15 } -> { rows: 4451, drawn: 149, columns: 35 } // 2026-10-23: 18-lane default // 2026-10-23 hop-first default lanes: drawn 160 -> 47, columns 0 -> 15

// --- registration
const allowlist = JSON.parse(readFileSync('data/project/publication-allowlist.json', 'utf8'));
assert.ok(allowlist.paths.includes('src/visual-aperture-timeline.mjs'), 'the module is a public file');
assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts.test, /node test\/visual-aperture-timeline\.test\.js/);

console.log(`visual-aperture-timeline.test.js: OK (${model.counts.rows} rows: day ${model.counts.kinds.day} / span ${model.counts.kinds.span} / year ${model.counts.kinds.year} / open ${model.counts.kinds.open} / undated ${model.counts.kinds.undated}; ${model.counts.hop_bases} bases → ${model.counts.hop_day_surfaces} (day, surface) objects on ${model.counts.hop_days} days; ${actorLanes.lanes.length} lanes + ${actorLanes.strip.row_count} strip + ${actorLanes.blocks.length} block; default desktop ${DEFAULT_DESKTOP[690].marks} marks, phone ${phone.counts.marks}; 15 pinned 2.1.0 lanes 16 columns; dense ${dialog.listed_count} names, ${dialog.elsewhere.length} elsewhere; ${model.range.distinct_start_days} distinct start days)`);
