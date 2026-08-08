import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProduct, assertProduct } from './build-status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(n)=>JSON.parse(fs.readFileSync(path.join(ROOT,"data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-next-adjudication",n),'utf8'));
const noAuthority=(x,label)=>{assert.equal(x.outside_human_dependency,false,`${label} outside-human`);assert.equal(x.publication_effect,'none',`${label} publication`);assert.equal(x.adoption_effect,'none',`${label} adoption`);assert.equal(x.graph_effect,'none',`${label} graph`);};
export function validateProduct(root=ROOT){
 const manifest=assertProduct(root); const capture=read('capture-custody.json'), sources=read('source-adjudications.json'), fields=read('field-adjudications.json'), promotion=read('promotion-candidate-protocol.json'), summary=read('adjudication-summary.json'), index=read('index.json');
 assert.equal(manifest.permanent_path_count,13); assert.equal(manifest.reviewed_source_admissions,4); assert.equal(manifest.promotion_candidates,4); assert.equal(manifest.held_open_cells,2); assert.equal(manifest.matrix_updates,0);
 assert.equal(capture.counts.fixed_routes,5); assert.equal(capture.counts.source_requests_executed,5); assert.equal(capture.routes.length,5); assert.equal(capture.artifact.archive_sha256,'9b828cef364b156cc995409e445d5a1250c981127d21b841d56b05ef14b036e3');
 assert.equal(sources.decisions.length,5); assert.equal(sources.decisions.filter(x=>x.source_admitted_for_narrow_scope).length,4); assert.equal(sources.decisions.find(x=>x.route_id==='RD04-W03-PPN-ND-001').source_admitted_for_narrow_scope,false);
 const nd2=sources.decisions.find(x=>x.route_id==='RD04-W03-PPN-ND-002'); assert.deepEqual(nd2.excluded_cross_field_ids,['operative_state_implementation_authority_and_version']);
 assert.equal(fields.decisions.length,6); assert.equal(fields.decisions.filter(x=>x.promotion_candidate).length,4); assert.equal(fields.decisions.filter(x=>!x.promotion_candidate).length,2); assert.equal(fields.counts.matrix_updates,0);
 const ndAuthority=fields.decisions.find(x=>x.decision_id.includes('ND-OPERATIVE')); assert.equal(ndAuthority.disposition,'no_relevant_support_hold_open');
 const ndWaiver=fields.decisions.find(x=>x.decision_id.includes('ND-ABAWD')); assert.equal(ndWaiver.disposition,'temporal_or_scope_ambiguity_hold_open'); assert.equal(ndWaiver.observed_support.historical_period_end,'2025-10-31'); assert.equal(ndWaiver.observed_support.section_effective_date,'2025-11-01');
 assert.equal(promotion.candidate_count,4); assert.equal(new Set(promotion.candidates.map(x=>x.promotion_candidate_id)).size,4); for(const c of promotion.candidates){assert.equal(c.promotion_status,'candidate_only');assert.equal(c.matrix_update_authority,false);}
 assert.equal(summary.frontier_after_adjudication.terminal_cells,222); assert.equal(summary.frontier_after_adjudication.open_substantive_cells,188); assert.equal(summary.frontier_after_adjudication.class_closed,false);
 for(const x of [manifest,capture.authority_boundary,sources.authority_boundary,fields.authority_boundary,promotion.authority_boundary,summary.authority_boundary,index]) noAuthority(x,'object');
 return {ok:true,routes:5,reviewedSourceAdmissions:4,promotionCandidates:4,heldOpenCells:2,matrixUpdates:0};
}
if(import.meta.url===new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(validateProduct(),null,2));
