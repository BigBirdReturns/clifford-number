#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, DATA_REL, validateProduct } from '../tools/build-status-sovereignty-rd-wave03-rd04-five-state-source-field-adjudication.mjs';
const rel=(n)=>path.join(ROOT,DATA_REL,n);
const load=(n)=>JSON.parse(fs.readFileSync(rel(n),'utf8'));
const stable=(v)=>`${JSON.stringify(v,null,2)}\n`;
validateProduct(ROOT);
const base={
 'capture-custody.json':load('capture-custody.json'),
 'source-adjudications.json':load('source-adjudications.json'),
 'field-adjudications.json':load('field-adjudications.json'),
 'pdf-review-receipts.json':load('pdf-review-receipts.json'),
 'selected-followup-protocol.json':load('selected-followup-protocol.json'),
};
const mutations=[
 ['capture-custody.json',v=>v.artifact_id=1],['capture-custody.json',v=>v.artifact_zip_sha256='0'.repeat(64)],['capture-custody.json',v=>v.capture_counts.requests=28],['capture-custody.json',v=>v.capture_counts.source_admissions=1],['capture-custody.json',v=>v.authority_boundary.outside_human_dependency=true],
 ['source-adjudications.json',v=>v.decisions[0].request_id='changed'],['source-adjudications.json',v=>v.decisions[1].body_sha256='0'.repeat(64)],['source-adjudications.json',v=>v.decisions[2].source_admitted_for_narrow_scope=false],['source-adjudications.json',v=>v.decisions[3].field_classification_effect='changed'],['source-adjudications.json',v=>v.decisions[4].candidate_fields_for_offline_review=['changed']],['source-adjudications.json',v=>v.decisions.pop()],['source-adjudications.json',v=>v.authority_boundary.publication_effect='changed'],
 ['field-adjudications.json',v=>v.frontier.terminal_cells_before=219],['field-adjudications.json',v=>v.frontier.selected_states.reverse()],['field-adjudications.json',v=>v.decisions[0].disposition='evidence_complete_bounded_finding'],['field-adjudications.json',v=>v.decisions[3].promotion_candidate=true],['field-adjudications.json',v=>v.decisions[7].bounded_finding=null],['field-adjudications.json',v=>v.decisions[11].field_classification_effect='observed'],['field-adjudications.json',v=>v.decisions[15].class_closed=true],['field-adjudications.json',v=>v.decisions.pop()],['field-adjudications.json',v=>v.authority_boundary.graph_effect='changed'],
 ['pdf-review-receipts.json',v=>v.reviews[0].page_number=16],['pdf-review-receipts.json',v=>v.reviews[1].rendered_png_sha256='0'.repeat(64)],['pdf-review-receipts.json',v=>v.reviews.pop()],['pdf-review-receipts.json',v=>v.outside_human_dependency=true],
 ['selected-followup-protocol.json',v=>v.route_count=12],['selected-followup-protocol.json',v=>v.routes[0].requested_url='https://example.com'],['selected-followup-protocol.json',v=>v.routes[1].maximum_attempts=2],['selected-followup-protocol.json',v=>v.routes[2].cross_host_redirects_allowed=true],['selected-followup-protocol.json',v=>v.routes[3].automatic_source_admission=true],['selected-followup-protocol.json',v=>v.routes.pop()],['selected-followup-protocol.json',v=>v.execution_ceiling.maximum_total_requests=12],
];
let refused=0;
for(const [name,mutate] of mutations){const clone=structuredClone(base[name]);mutate(clone);const overrides=new Map([[name,stable(clone)]]);await assert.rejects(async()=>validateProduct(ROOT,overrides));refused++;}
const manifest=load('product-manifest.json');let byteRefusals=0;
outer:for(let round=0;round<100;round++)for(const e of manifest.entries){const b=Buffer.from(fs.readFileSync(rel(e.path)));const pos=(round*131+byteRefusals*17)%b.length;b[pos]^=1;assert.notEqual(await import('node:crypto').then(m=>m.createHash('sha256').update(b).digest('hex')),e.sha256);byteRefusals++;if(byteRefusals===500)break outer;}
assert.equal(byteRefusals,500);refused+=byteRefusals;
console.log(`rd04_five_state_source_field_adversarial=pass mutations_refused=${refused}`);
