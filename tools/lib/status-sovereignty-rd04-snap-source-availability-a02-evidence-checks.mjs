import fs from 'node:fs';
import path from 'node:path';
import { DIMS,TOP,D7_STATES,EXPECTED_TOTALS } from './status-sovereignty-rd04-snap-source-availability-a02-constants.mjs';
import { computeManifest,buildSummary,blobSha1 } from './status-sovereignty-rd04-snap-source-availability-a02-io.mjs';
const stable=v=>JSON.stringify(v);const officialHost=h=>h.endsWith('.gov')||h==='codes.ohio.gov'||h==='www.myflfamilies.com';
export function checkEvidence(c,errors,{skipGenerated=false}={}){
 const ok=(cond,msg)=>{if(!cond)errors.push(msg);};const eq=(a,b,msg)=>ok(stable(a)===stable(b),`${msg}: expected ${stable(b)}, observed ${stable(a)}`);
 const sourceById=new Map(c.sources.map(s=>[s.source_id,s]));
 for(const s of c.sources){ok(/^https:\/\//.test(s.url),`${s.source_id}: source URL must be HTTPS`);try{ok(officialHost(new URL(s.url).hostname),`${s.source_id}: non-official host`);}catch{errors.push(`${s.source_id}: invalid URL`);}ok(s.support&&s.limitations,`${s.source_id}: source boundary incomplete`);}
 const totals=[];
 for(const row of c.states){
  eq(row.fixed_search_slots_declared,4,`${row.state} declared search slots`);eq(row.search_execution_receipts_preserved,0,`${row.state} preserved search receipts`);eq(row.search_execution_custody,'query_and_result_receipts_not_preserved',`${row.state} search execution custody`);eq(row.source_catalogue_scoring_status,'scored_from_recovered_official_source_catalogue',`${row.state} catalogue scoring status`);eq(row.search_absence_semantics,'not_recovered_in_current_catalogue_not_record_absence',`${row.state} search absence semantics`);
  let total=0;
  for(const dim of DIMS){const score=row.dimension_scores[dim],evidence=row.dimension_evidence[dim];ok(Number.isInteger(score)&&score>=0&&score<=2,`${row.state} ${dim} score outside 0..2`);ok(Array.isArray(evidence),`${row.state} ${dim} evidence missing`);if(score>0)ok(evidence.length>0,`${row.state} ${dim} positive score lacks evidence`);if(score===0)ok(evidence.length===0,`${row.state} ${dim} zero score carries evidence`);for(const id of evidence){const s=sourceById.get(id);ok(Boolean(s),`${row.state} ${dim} unknown source ${id}`);if(s){const scope=s.state_scope==='all_50_states'||s.state_scope.includes(row.state);ok(scope,`${row.state} ${dim} source scope mismatch ${id}`);ok(s.dimensions.includes(dim),`${row.state} ${dim} source dimension mismatch ${id}`);}}total+=score;}
  eq(row.total_score,total,`${row.state} total score`);eq(total,EXPECTED_TOTALS[row.state],`${row.state} frozen total`);eq(row.missing_dimensions,DIMS.filter(d=>row.dimension_scores[d]===0),`${row.state} missing dimensions`);eq(row.not_full_dimensions,DIMS.filter(d=>row.dimension_scores[d]<2),`${row.state} not-full dimensions`);totals.push(total);
 }
 const maximum=Math.max(...totals),top=c.states.filter(r=>r.total_score===maximum).map(r=>r.state);eq(maximum,12,'Recomputed provisional maximum score');eq(top,TOP,'Recomputed provisional tied frontier');
 const rejected=c.states.filter(r=>!TOP.includes(r.state)).map(r=>({state:r.state,total_score:r.total_score,reason:'below_tied_highest_coverage_score',missing_dimensions:r.missing_dimensions,not_full_dimensions:r.not_full_dimensions}));eq(c.selection.rejected_shortlist,rejected,'Computed rejected shortlist');
 const d4=c.states.filter(r=>r.dimension_scores.D4===2).map(r=>r.state);eq(d4,['NV'],'Observed sanction/restoration count custody');const nv=c.states.find(r=>r.state==='NV');ok(nv.dimension_evidence.D4.includes('NV-RESTORE'),'Nevada restoration receipt missing');
 const d7=c.states.filter(r=>r.dimension_scores.D7===2).map(r=>r.state);eq(d7,D7_STATES,'Measured outcome state set');ok(!c.states.some(r=>r.dimension_scores.D8===2),'No state may receive D8 level two');
 const coverage={};for(const dim of DIMS){coverage[dim]={score_0:c.states.filter(r=>r.dimension_scores[dim]===0).length,score_1:c.states.filter(r=>r.dimension_scores[dim]===1).length,score_2:c.states.filter(r=>r.dimension_scores[dim]===2).length};}eq(c.core.dimension_coverage,coverage,'Dimension coverage');
 ok(c.core.current_result.fifty_state_source_availability_selection_gate_complete===false,'Missing query receipts cannot complete selection gate');ok(c.selection.selection_gate_complete===false,'Provisional catalogue score cannot become final selection');
 if(process.env.SKIP_PARENT_EXACT!=='1'){const parentBytes=fs.readFileSync(path.join(c.root,c.core.parent_acquisition_path));eq(blobSha1(parentBytes),c.core.parent_acquisition_git_blob_sha1,'Parent acquisition exact bytes');}
 if(!skipGenerated){
  const computed=computeManifest(c.root);eq(c.manifest,computed,'Exact-byte release manifest');eq(c.buildManifest,c.manifest,'Build manifest drift');const summary=buildSummary(c,c.manifest);eq(c.buildSummary,summary,'Build summary drift');eq(c.reportSummary,summary,'Report summary drift');ok(c.html.includes('noindex,nofollow'),'HTML noindex boundary missing');ok(c.html.includes('CA CT KS KY WA PROVISIONALLY TIED'),'HTML provisional tied-set boundary missing');ok(c.html.includes('SELECTION GATE OPEN'),'HTML selection-gate boundary missing');ok(c.html.includes('QUERY RECEIPTS: 0/200 PRESERVED'),'HTML search-custody boundary missing');ok(c.html.includes(c.manifest.combined_sha256),'HTML manifest digest missing');
 }
}
