import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
execFileSync(process.execPath,['tools/build-visitor-experience.mjs']);
const d=JSON.parse(read('experience/evidence.json'));
const c=JSON.parse(read('build/cases/anduril-access-ownership.json'));
const source=new Map(c.claims.map(r=>[r.claim_id,r]));
assert.equal(d.records.length,21);assert.equal(d.counts.receipts,21);assert.equal(d.excluded.length,3);
assert.equal(d.source.sha256,sha(read(d.source.path)));
for(const r of d.records){
 const native=source.get(r.claim_id);assert.ok(native);
 for(const key of ['plain','object','claim_status','evidence_class','causal_status','valid_from','valid_until'])assert.deepEqual(r[key],native[key]);
 assert.equal(r.case_status,'review_required');assert.equal(r.graph_effect,'none');assert.equal(r.publication_approval_added,false);
 assert.ok(r.qualification);assert.ok(r.receipts.every(x=>/^https?:\/\//.test(x.url)));
 assert.ok(!r.receipts.some(x=>x.receipt_id==='anduril-bundle-r3'));
}
assert.equal(source.get('clm-cbp-order-362974500').object.amount_kind,'obligated');
assert.equal(source.get('clm-army-enterprise-vehicle').object.amount_kind,'ceiling');
assert.equal(source.get('clm-usmc-competitive-ten-offers').object.offers,10);
const inbox=read('experience/review-inbox.jsonl').trim().split('\n').map(JSON.parse);
assert.equal(inbox.length,21);
for(const r of inbox){assert.equal(r.review_state,'requires_independent_review');assert.equal(r.registry_status,null);assert.equal(r.weight,null);assert.equal(r.consumer_accepted,false);assert.ok(r.qualification);}
const proof=JSON.parse(read('experience/execution-proof.json'));assert.equal(proof.public_runtime_deployed,false);
for(const f of proof.frames){for(const status of ['executed','reused','held'])assert.equal(f.summary[status],f.tasks.filter(t=>t.status===status).length);assert.ok(f.source_receipt_sha256.match(/^[a-f0-9]{64}$/));assert.ok(f.tasks.every(t=>t.model_calls===0&&t.gpu_runs===0));}
assert.deepEqual(proof.frames.map(f=>f.summary),[{executed:3,reused:0,held:0},{executed:0,reused:3,held:0},{executed:1,reused:2,held:0}]);
assert.doesNotMatch(read('experience/execution-proof.json'),/[A-Z]:[\\/]|\/mnt\/|\/home\/|\\Users\\/);
const media=JSON.parse(read('experience/assets/media-custody.json'));
for(const m of media.assets){const bytes=fs.readFileSync('experience/assets/'+m.file);assert.equal(bytes.length,m.bytes);assert.equal(sha(bytes),m.sha256);assert.ok(m.bytes<6000000);assert.equal(m.independent_final_sensory_approval_claimed,false);}
const html=read('index.html'),js=read('experience/experience.js'),css=read('experience/interface.css');
for(const id of ['hero-motion','motion-toggle','walkthrough','record-workspace','record-content','advance-step','replay-button','download-inbox','film-dialog','causal-map'])assert.ok(html.includes(`id="${id}"`),id);
assert.match(html,/muted loop playsinline preload="none"/);assert.match(html,/<dialog/);assert.match(html,/role="tablist"/);
assert.match(js,/ArrowRight/);assert.match(js,/IntersectionObserver/);assert.match(css,/prefers-reduced-motion/);
assert.doesNotMatch(js,/\.innerHTML\s*=|eval\(/);
const p=JSON.parse(read('data/project/publication-allowlist.json'));
for(const name of ['experience/evidence.json','experience/execution-proof.json','experience/interface.css','experience/experience.js','for/integrity/index.html'])assert.ok(p.paths.includes(name));
assert.ok(p.held_rules.some(r=>r.kind==='prefix'&&r.value==='data/intake/'));
assert.ok(!p.paths.some(x=>x.startsWith('data/intake/')));
assert.match(read('for/integrity/index.html'),/view=integrity#walkthrough/);
console.log('visitor-experience.test: OK (public source closure, native states, exact financial types, recorded reuse, media custody, controls and unchanged holds)');
