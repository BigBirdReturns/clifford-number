import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const d=JSON.parse(read('meetings/events.json'));
const html=read('meetings/index.html');
const originalIds=['bvvc-schoolhouse-assembly-2026','masschallenge-dual-use-2026','svdg-advanced-manufacturing-2026','svdg-oceans-blue-2026','svdg-horizon-2026','svdg-evercore-2026','svdg-natsec100-2026','army-fuze-capital-2026','missions-markets-natsec100-2025'];
const sourceId=url=>'src-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,16);
const states=['announced','reported_held','officially_recorded','selection_record'];
const roles=['presenter','exhibitor','company_participant','announced_presenter','announced_speaker','speaker','judge','named_participant','selected_participant','represented_institution','listed_organization','listed_individual','minister','supporting_institution'];
const moneyKinds=['reported_event_contracts','reported_named_event_award','prior_research_funding','later_programme_prizes','potential_follow_on_funding','offered_investment_prize','investment_ask_average'];
function dateValid(s,precision){assert.equal(typeof s,'string');assert.match(s,precision==='day'?/^\d{4}-\d{2}-\d{2}$/:precision==='month'?/^\d{4}-\d{2}$/:/^\d{4}$/);const full=s+(precision==='year'?'-01-01':precision==='month'?'-01':'');assert.equal(new Date(full+'T00:00:00Z').toISOString().slice(0,10),full,'calendar-valid date');}
function validate(x){
 assert.equal(x.schema,'clifford-public-meeting-leads@2');dateValid(x.as_of,'day');assert.equal(x.as_of_timezone,'America/Los_Angeles');assert.equal(x.coverage.census_complete,false);
 assert.ok(Array.isArray(x.events)&&x.events.length>=40,'coverage regression floor, not a census');assert.ok(x.coverage.historical_scope_start<=1991);assert.ok(x.coverage.known_gaps.length>=3);
 const register=new Map();for(const s of x.source_register){const u=new URL(s.url);assert.equal(u.protocol,'https:');assert.ok(!u.username&&!u.password);assert.equal(s.source_id,sourceId(s.url));assert.ok(!register.has(s.source_id));register.set(s.source_id,s);assert.ok(!Number.isNaN(Date.parse(s.retrieved_at)));if(s.status==='captured'){assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.bytes>0);assert.match(s.text_sha256,/^[a-f0-9]{64}$/)}else{assert.ok(s.access_note);assert.ok(!s.sha256||s.status==='insufficient_content'||s.status==='access_challenge')}}
 const ids=new Set(),used=new Set(),families=new Map();let participantCount=0;
 for(const e of x.events){
  assert.match(e.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(e.id));ids.add(e.id);assert.ok(e.title&&e.established&&e.unknown&&e.why_comparable&&e.date_basis);assert.ok(['day','month','year'].includes(e.date_precision));dateValid(e.start,e.date_precision);if(e.end){dateValid(e.end,'day');assert.ok(e.end>=e.start)}assert.equal(e.year,Number(e.start.slice(0,4)));assert.ok(states.includes(e.state));assert.ok(['reference','direct','related'].includes(e.fit));assert.ok(['founder-showcase','matchmaking','roundtable','conference'].includes(e.kind));assert.equal(e.graph_effect,'none');assert.equal(e.roster_complete,false);assert.ok(e.organizers.length>0);
  if(e.start>x.as_of)assert.equal(e.state,'announced','future records must remain announced');
  const lifecycle=e.state==='announced'?(e.start>x.as_of?'upcoming_announced':'past_announcement_unconfirmed'):e.state;assert.equal(e.lifecycle,lifecycle,'elapsed date does not establish occurrence');
  assert.ok(e.sources.length>0);const refs=new Set();for(const s of e.sources){assert.equal(s.source_id,sourceId(s.url));assert.ok(register.has(s.source_id));assert.ok(s.label&&s.class&&s.supports);assert.ok(register.get(s.source_id).status==='captured'||register.get(s.source_id).review_route==='public_web_reader','event needs a reviewed source route');refs.add(s.source_id);used.add(s.source_id)}
  const official=e.sources.some(s=>s.class.startsWith('official'));assert.equal(e.evidence_tier,official?'official_record':'first_party_report');
  for(const p of e.participants){assert.ok(p.name&&roles.includes(p.role));assert.ok(refs.has(p.source_id));assert.ok(['official_record','organizer_report','announced','participant_recollection'].includes(p.basis));if(p.role.startsWith('announced'))assert.equal(p.basis,'announced');participantCount++}
  for(const f of e.financial_evidence){assert.ok(moneyKinds.includes(f.kind));assert.ok(f.summary&&refs.has(f.source_id));assert.ok(['USD','GBP','EUR'].includes(f.currency));assert.ok(f.amount===null||(Number.isFinite(f.amount)&&f.amount>=0));assert.equal(f.award_identifier,null,'this edition admits no verified award-ID joins');assert.equal(f.independently_reconciled,false);if(f.kind.startsWith('reported_event')||f.kind==='reported_named_event_award'){assert.ok(official);assert.notEqual(e.state,'announced')}}
  const financial=e.financial_evidence.some(f=>['reported_event_contracts','reported_named_event_award'].includes(f.kind))?'reported_event_awards':e.financial_evidence.length?'other_financial_context':'not_established';assert.equal(e.financial_state,financial);
  if(!families.has(e.family))families.set(e.family,[]);families.get(e.family).push(e);
 }
 for(const id of originalIds)assert.ok(ids.has(id),'preserve public event bookmark '+id);
 assert.equal(x.events.filter(e=>e.anchor).length,1);assert.equal(x.events.find(e=>e.anchor).id,originalIds[0]);assert.equal(x.summary.events,x.events.length);assert.equal(x.summary.comparisons,x.events.length-1);assert.equal(x.summary.participant_rows,participantCount);assert.equal(x.summary.sources_used,used.size);assert.equal(x.summary.families,families.size);assert.ok(families.size>=12);
 assert.ok((families.get('Silicon Valley Defense Group')?.length||0)/x.events.length<0.5,'avoid a single-organizer index');
 for(const s of register.values())assert.equal(s.used_in_events,used.has(s.source_id));
 assert.equal(x.summary.source_routes_inspected,register.size);assert.equal(x.summary.native_captures,[...register.values()].filter(s=>s.status==='captured').length);assert.equal(x.summary.native_access_holds,register.size-x.summary.native_captures);assert.equal(x.coverage.observed_min_year,Math.min(...x.events.map(e=>e.year)));assert.equal(x.coverage.observed_max_year,Math.max(...x.events.map(e=>e.year)));
 assert.equal(x.coverage.families.length,families.size);for(const f of x.coverage.families){assert.equal(f.complete,false);assert.equal(f.events,families.get(f.family).length);assert.deepEqual(f.observed_years,[...new Set(families.get(f.family).map(e=>e.year))].sort())}
 return true;
}
validate(d);
const byId=new Map(d.events.map(e=>[e.id,e]));
assert.equal(byId.get('dasa-investment-showcase-2023').date_precision,'year');
assert.equal(byId.get('dasa-investment-showcase-2021').date_precision,'month');
assert.equal(byId.get('dasa-investment-showcase-2025').lifecycle,'past_announcement_unconfirmed');
assert.equal(byId.get('svdg-tariff-salon-2025').lifecycle,'past_announcement_unconfirmed');
assert.equal(byId.get('new-north-summit-2027').participants.length,0,'do not import previous edition speakers into a future event');
assert.notEqual(byId.get('dsit-techuk-ai-safety-2023').start,byId.get('dsit-ai-investor-roundtable-2023').start);
assert.ok(!byId.get('dsit-techuk-ai-safety-2023').participants.some(p=>p.name==='Matt Clifford'));
assert.ok(!byId.get('dsit-ai-investor-roundtable-2023').participants.some(p=>p.name==='Anduril Industries'));
assert.equal(byId.get('air-force-teo-pitch-day-2019').financial_evidence[0].amount,13324425+2288000);
assert.equal(byId.get('air-force-pitch-day-2019').financial_evidence[0].amount,8750000);
assert.match(byId.get('air-force-pitch-day-2019').unknown,/reconcile/);
assert.equal(byId.get('fed-supernova-2021').financial_evidence[0].kind,'offered_investment_prize');
assert.equal(byId.get('nato-defence-industry-forum-2026').financial_evidence.length,0,'do not promote group historical capital to an event award');
const mutations=[
 ['future held',x=>{const e=x.events.find(e=>e.id==='new-north-summit-2027');e.state='reported_held';e.lifecycle='reported_held'}],
 ['impossible date',x=>{x.events[0].start='2026-02-31'}],
 ['wrong precision',x=>{x.events[0].date_precision='year'}],
 ['duplicate ID',x=>{x.events[1].id=x.events[0].id}],
 ['unsafe source URL',x=>{x.events[0].sources[0].url='javascript:alert(1)'}],
 ['broken participant provenance',x=>{x.events.find(e=>e.participants.length).participants[0].source_id='src-absent'}],
 ['unsupported graph promotion',x=>{x.events[0].graph_effect='accepted_hop'}],
 ['false census',x=>{x.coverage.census_complete=true}],
 ['false full roster',x=>{x.events[0].roster_complete=true}],
 ['false country count aside event total',x=>{x.summary.events++}],
 ['missing source record',x=>{x.source_register=x.source_register.filter(s=>s.source_id!==x.events[0].sources[0].source_id)}],
 ['future event award',x=>{const e=x.events[0];e.financial_evidence=[{kind:'reported_event_contracts',amount:1,currency:'USD',summary:'invented',source_id:e.sources[0].source_id,award_identifier:null,independently_reconciled:false}]}],
 ['false award identity',x=>{x.events.find(e=>e.financial_evidence.length).financial_evidence[0].award_identifier='unverified'}],
 ['unreviewed source',x=>{const s=x.source_register.find(s=>s.source_id===x.events[0].sources[0].source_id);s.status='unavailable';s.review_route='unreviewed';s.access_note='held';s.sha256=null}],
 ['inflated source statistics',x=>{x.summary.sources_used++}],
 ['invented event state',x=>{x.events[0].state='assumed_completed'}]
];
for(const [name,change]of mutations){const clone=structuredClone(d);change(clone);assert.throws(()=>validate(clone),undefined,name)}
for(const id of ['event-search','event-state','event-kind','event-family','event-country','event-year','event-fit','event-finance','event-grade','event-sort','comparison','source-register','coverage','export-json','export-csv','reset-filters','share-search','event-table'])assert.ok(html.includes(`id="${id}"`),id);
assert.match(html,/textContent/);assert.ok(!html.includes('innerHTML'));assert.match(html,/URLSearchParams/);assert.match(html,/Clipboard|clipboard/);assert.match(html,/no automatic|not an exhaustive|not a resolved/);assert.match(html,/prefers-reduced-motion/);
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);new vm.Script('(async()=>{'+script+'})()',{filename:'meeting-index.mjs'});
const policy=JSON.parse(read('data/project/publication-allowlist.json'));for(const p of ['meetings/index.html','meetings/events.json'])assert.ok(policy.paths.includes(p));
assert.match(read('index.html'),/href="meetings\/"/);assert.match(read('tools/build-standalone.mjs'),/clifford-number\/meetings\//);
console.log(`meeting-index: ${d.events.length} events; ${d.summary.families} groups; ${d.summary.sources_used} supporting sources; ${mutations.length} adversarial mutations rejected; source-state, date, award and provenance boundaries PASS`);
