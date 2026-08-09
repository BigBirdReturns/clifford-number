import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {ROOT,SLUG,OUTPUT_DIR,PERMANENT_PATHS,assert} from '../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.mjs';
const validator=`tools/validate-${SLUG}.mjs`;
const predecessor='data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promoted-partial-field-matrix.json';
function editJson(root,relative,fn){const p=path.join(root,relative);const o=JSON.parse(fs.readFileSync(p,'utf8'));fn(o);fs.writeFileSync(p,`${JSON.stringify(o,null,2)}\n`);}
function mutate(fn){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rd04-nd-exact-approval-'));try{for(const p of PERMANENT_PATHS){const src=path.join(ROOT,p),dst=path.join(tmp,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}fs.mkdirSync(path.dirname(path.join(tmp,predecessor)),{recursive:true});fs.copyFileSync(path.join(ROOT,predecessor),path.join(tmp,predecessor));fn(tmp);const r=spawnSync(process.execPath,[path.join(tmp,validator)],{env:{...process.env,RD04_ROOT:tmp},encoding:'utf8'});assert(r.status!==0,`mutation was accepted: ${r.stdout} ${r.stderr}`);}finally{fs.rmSync(tmp,{recursive:true,force:true});}}
const baseline=spawnSync(process.execPath,[path.join(ROOT,validator)],{encoding:'utf8'});assert(baseline.status===0,`baseline validation failed: ${baseline.stdout} ${baseline.stderr}`);
const cases=[
 r=>editJson(r,`${OUTPUT_DIR}/promoted-partial-field-matrix.json`,o=>{o.rows[0].cells[0].authority_effect='mutated';}),
 r=>editJson(r,`${OUTPUT_DIR}/promoted-partial-field-matrix.json`,o=>{const nd=o.rows.find(x=>x.unit_id==='US-STATE-ND');nd.cells.find(x=>x.field_id==='abawd_or_work_requirement_waiver_state_and_governing_period').state='not_publicly_recovered';}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-input-custody.json`,o=>{o.publication_parent_lease.expected_tree='0'.repeat(40);}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-input-custody.json`,o=>{o.source_custody.embedded_pdf.data_base64='A'+o.source_custody.embedded_pdf.data_base64.slice(1);}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-input-custody.json`,o=>{o.source_custody.body_sha256='0'.repeat(64);}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-input-custody.json`,o=>{o.page_complete_review.page_count=4;}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-decisions.json`,o=>{o.decisions[0].bounded_finding.approved_areas[0]='Burleigh County';}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-decisions.json`,o=>{o.decisions[0].bounded_finding.governing_period.expiration_date='2027-06-30';}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-decisions.json`,o=>{o.decision_count=1;}),
 r=>editJson(r,`${OUTPUT_DIR}/cell-transition-ledger.json`,o=>{o.counts.matrix_updates=1;}),
 r=>editJson(r,`${OUTPUT_DIR}/remaining-open-field-census.json`,o=>{o.counts.terminal_units=10;}),
 r=>editJson(r,`${OUTPUT_DIR}/terminalization-summary.json`,o=>{o.transition.class_closed_after=true;}),
 r=>editJson(r,`${OUTPUT_DIR}/index.json`,o=>{o.counts.pdf_pages_reviewed=4;}),
 r=>editJson(r,`${OUTPUT_DIR}/product-manifest.json`,o=>{o.permanent_path_count=15;}),
 r=>editJson(r,`${OUTPUT_DIR}/product-manifest.json`,o=>{o.combined_sha256='0'.repeat(64);}),
 r=>{fs.appendFileSync(path.join(r,`.github/workflows/${SLUG}.yml`),'\npermissions:\n  contents: write\n');},
 r=>{fs.appendFileSync(path.join(r,'docs/milestones/ssc-rd-wave03-rd04-postpromotion-nd-fy2025-waiver-approval-terminalization.md'),'\nunauthorized drift\n');},
 r=>{fs.unlinkSync(path.join(r,`${OUTPUT_DIR}/index.json`));},
 r=>{const p=path.join(r,predecessor);const b=fs.readFileSync(p);b[100]^=1;fs.writeFileSync(p,b);},
 r=>{fs.appendFileSync(path.join(r,`tools/build-${SLUG}.mjs`),'\n// drift\n');},
 r=>{fs.appendFileSync(path.join(r,`tools/validate-${SLUG}.mjs`),'\n// drift\n');},
];
for(const c of cases)mutate(c);
console.log(`rd04_nd_fy2025_waiver_approval_terminalization_adversarial=pass mutations=${cases.length}`);
