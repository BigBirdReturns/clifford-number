import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const file=JSON.parse(read('meetings/events.json'));
const page=read('meetings/index.html');
const home=read('index.html');
const policy=JSON.parse(read('data/project/publication-allowlist.json'));

assert.equal(file.schema,'clifford-public-meeting-leads@1');
assert.equal(file.as_of,'2026-11-02');
assert.equal(file.contract_join,'none_established');
assert.ok(file.events.length>=8,'meeting list must offer actual comparable events');
const ids=new Set();
const reference=file.events.filter(x=>x.anchor);
assert.equal(reference.length,1,'one explicit source reference');
assert.equal(reference[0].id,'bvvc-schoolhouse-assembly-2026');
for(const e of file.events){
 assert.match(e.id,/^[a-z0-9-]+$/);
 assert.ok(!ids.has(e.id),'duplicate event id: '+e.id);ids.add(e.id);
 assert.ok(!Number.isNaN(Date.parse(e.start+'T00:00:00Z')),'date: '+e.id);
 assert.ok(e.dates&&e.place&&e.title&&e.established&&e.unknown,'evidence content: '+e.id);
 assert.ok(Array.isArray(e.roles)&&e.roles.length>0);
 assert.ok(Array.isArray(e.organizers)&&e.organizers.length>0);
 assert.ok(Array.isArray(e.named_participants));
 assert.ok(['announced','reported_held'].includes(e.state),'event state: '+e.id);
 assert.ok(['roundtable','founder-showcase','matchmaking'].includes(e.kind),'event kind: '+e.id);
 if(e.start>file.as_of)assert.equal(e.state,'announced','future event must not be reported held');
 if(e.state==='reported_held')assert.ok(e.start<=file.as_of,'held event date must have elapsed');
 assert.ok(Array.isArray(e.sources)&&e.sources.length>0,'at least one source: '+e.id);
 for(const src of e.sources){
  const u=new URL(src.url);
  assert.equal(u.protocol,'https:','HTTPS source: '+e.id);
  assert.ok(src.label&&src.class,'typed provenance: '+e.id);
  assert.ok(['luma.com','masschallenge.org','www.siliconvalleydefense.org'].includes(u.hostname),'unexpected publisher: '+u.hostname);
 }
 assert.ok(!('award' in e)&&!('funding' in e)&&!('hop' in e),'no unsourced joined claims');
}
for(const name of ['meetings/index.html','meetings/events.json']){
 assert.ok(policy.paths.includes(name),'publication policy includes '+name);
 assert.ok(fs.statSync(path.join(root,name)).isFile());
}
assert.deepEqual(policy.paths,[...policy.paths].sort());
assert.match(home,/href="meetings\/"/);
assert.match(home,/id="visitor-banner"[^>]*>/);
assert.match(home,/Find the other meetings/);
assert.match(read('tools/build-standalone.mjs'),/clifford-number\/meetings\//,'offline standalone links intentionally to published event index');
assert.match(page,/id="event-search"/);
assert.match(page,/id="event-state"/);
assert.match(page,/id="event-kind"/);
assert.match(page,/href="events.json"/);
assert.match(page,/No complete historical coverage|no claim of complete historical coverage/i);
const script=page.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'meeting search module');
new vm.Script('(async()=>{'+script+'})()',{filename:'meeting-index-inline.mjs'});
assert.ok(!script.includes('innerHTML'),'source cards must be built without HTML injection');
console.log('meeting-index: '+file.events.length+' source-addressed events, 1 anchor, '+(file.events.length-1)+' comparable meetings; contract joins held; UI wiring PASS');
