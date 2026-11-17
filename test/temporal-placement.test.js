import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {resolveTemporalPlacement: r} = await import(pathToFileURL(process.argv[2] || 'src/visual-aperture-timeline.mjs').href);
const fields=['time_start','time_end','source_time_start','source_time_end','date_basis','temporal_semantics','observed_on','observation_start','observation_end','related_post_on'].sort();
let count=0;function test(label, fn){fn();count++;}
function check(b,s,e,expected){let orig=structuredClone(b);let out=r(b,s,e);assert.deepEqual(b,orig);assert.deepEqual(Object.keys(out).sort(),fields);for(const [k,v] of Object.entries(expected))assert.deepEqual(out[k],v, k);return out;}
test('retrieval point',()=>check({date_basis:'retrieval_day_of_undated_self_reported_profile'},'2026-11-13','2026-11-13',{time_start:null,time_end:null,observed_on:'2026-11-13',observation_start:'2026-11-13',temporal_semantics:'observation'}));
test('retrieval range',()=>check({date_basis:'RETRIEVED BETWEEN READS'},'2026-11-12','2026-11-14',{time_start:null,time_end:null,observed_on:null,observation_end:'2026-11-14'}));
test('source preservation',()=>check({date_basis:'record_retrieval_date; the page carries no date for the roles'},'2026-11-16','2026-11-16',{date_basis:'record_retrieval_date; the page carries no date for the roles',source_time_start:'2026-11-16',related_post_on:null}));
test('repost',()=>check({date_basis:'day_of_quoted_post; repost time not public'},'2026-11-12','2026-11-12',{time_start:null,time_end:null,related_post_on:'2026-11-12',observed_on:null,temporal_semantics:'unknown_event'}));
test('repost without original',()=>check({date_basis:'repost_time_unknown'},'2026-11-12','2026-11-14',{related_post_on:null,observation_start:null,time_start:null,time_end:null}));
test('hyphens',()=>check({date_basis:'original-post day; repost time NOT-PUBLIC'},'2026-09-09','2026-09-09',{related_post_on:'2026-09-09',time_start:null}));
test('year precision',()=>check({date_basis:'year_only_as_self_reported; 1 January is a placeholder'},'2023-01-01','2026-01-01',{time_start:'2023',time_end:'2026',source_time_start:'2023-01-01',observed_on:null,temporal_semantics:'year_precision'}));
test('year-only month',()=>check({date_basis:'YEAR-PRECISION'},'2024-11','2025',{time_start:'2024',time_end:'2025'}));
test('year incomplete',()=>check({date_basis:'year_only'},'2023-01-01',null,{time_start:'2023',time_end:null}));
test('year invalid',()=>check({date_basis:'year_only'},'2023q','2026-01-01 trailing',{time_start:null,time_end:null}));
test('exact post',()=>check({date_basis:'post_timestamp_as_published'},'2026-11-13','2026-11-13',{time_start:'2026-11-13',time_end:'2026-11-13',temporal_semantics:'recorded',observed_on:null}));
test('missing convention',()=>check({},'2016','2016',{time_start:'2016',time_end:'2016',date_basis:null,temporal_semantics:'recorded'}));
test('no evidence',()=>check({},undefined,undefined,{time_start:null,time_end:null,source_time_start:null,source_time_end:null}));
test('year precedence',()=>check({date_basis:'year_only; retrieved today; repost unknown'},'2023-01-01','2026-01-01',{temporal_semantics:'year_precision',time_start:'2023',observed_on:null}));
test('repost precedence',()=>check({date_basis:'retrieval day; repost unknown; original_post'},'2026-11-12','2026-11-13',{temporal_semantics:'unknown_event',time_start:null,observed_on:null,related_post_on:'2026-11-12'}));
test('metadata nonmutation',()=>check({date_basis:'retrieval_day',receipt_ids:['keep'],hop_eligible:false,limits:'keep'},'2026-11-13','2026-11-13',{observed_on:'2026-11-13'}));
test('empty dates',()=>check({date_basis:'retrieval_day'},'','',{time_start:null,time_end:null,source_time_start:null,source_time_end:null,observed_on:null}));
test('null metadata',()=>check({date_basis:7},'2026-01-01',null,{date_basis:null,time_start:'2026-01-01',time_end:null}));
console.log(JSON.stringify({state:'PASS',cases:count}));
