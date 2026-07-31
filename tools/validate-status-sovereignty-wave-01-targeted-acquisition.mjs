#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTargetedAcquisitionManifest } from './build-status-sovereignty-wave-01-targeted-acquisition.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const hashFacts = (facts) => crypto.createHash('sha256').update(`${JSON.stringify(facts, null, 2)}\n`).digest('hex');

export function loadTargetedAcquisitionContext() {
  return {
    acquisition: read('data/research/status-sovereignty-wave-01-targeted-acquisition.json'),
    sources: read('data/research/status-sovereignty-wave-01-targeted-acquisition-source-receipts.json'),
    review: read('data/research/status-sovereignty-wave-01-maintainer-review.json'),
    schema: read('schemas/status-sovereignty-targeted-acquisition.schema.json'),
    manifest: read('data/project/status-sovereignty-wave-01-targeted-acquisition-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/wave-01-targeted-acquisition/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/wave-01-targeted-acquisition/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/wave-01-targeted-acquisition/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/wave-01-targeted-acquisition/index.html'), 'utf8')
  };
}

export function validateTargetedAcquisition(c = loadTargetedAcquisitionContext()) {
  const e = [];
  const eq = (a,b,l) => { if (a !== b) e.push(`${l}: expected ${JSON.stringify(b)}, observed ${JSON.stringify(a)}`); };
  const check = (x,l) => { if (!x) e.push(l); };
  const { acquisition:a, sources:s, review:r, schema, manifest, buildManifest, buildReport, publicReport, html } = c;
  eq(a.schema_version,'status-sovereignty-targeted-acquisition@1','Acquisition schema');
  eq(a.acquisition_id,'SSC-W01-TA01','Acquisition identity'); eq(a.parent_review_id,'SSC-W01-MR01','Acquisition parent review');
  eq(a.status,'complete_targeted_acquisition_three_obligations_partially_repaired_all_open','Acquisition status');
  eq(a.authority_contract?.authority,'targeted_source_acquisition_not_review_or_adjudication','Acquisition authority');
  for (const key of ['may_change_reviewed_disposition','may_close_obligation_without_complete_required_record','may_self_award_second_party_review','may_self_award_adjudication','may_clear_publication','may_create_graph_effect']) eq(a.authority_contract?.[key],false,`Acquisition authority ${key}`);
  const fixed={obligations:3,partially_repaired_open:3,closed:0,source_records:12,natsec_selected_roster:100,natsec_explicit_assessed_nonselections:2,sbicct_formal_applications_as_of_2024_10_22:22,sbicct_approved_as_of_2024_10_22:13,sbicct_first_cohort:18,sbicct_publicly_named_first_cohort:17,sbicct_withheld_first_cohort:1,sbicct_fully_licensed_as_of_2025_01_17:7,osc_applications_minimum:200,osc_requested_usd:8900000000,osc_initial_capacity_usd:984000000,osc_planned_successful_applicants_approximate:10,osc_named_borrowers:5,osc_named_instruments:5,osc_executed_loans:1,osc_conditional_commitments:4,osc_named_amounts_usd:2075000000,reviewed_disposition_changes:0,second_party_reviews:0,adjudications:0,complete_compact_findings:0,racial_order_findings:0,prevalence_findings:0,coordination_findings:0,common_purpose_findings:0,personal_hostility_findings:0,graph_effects:0,publication_clearances:0};
  for (const [k,v] of Object.entries(fixed)) eq(a.counts?.[k],v,`Acquisition count ${k}`);
  eq(a.obligations?.length,3,'Acquisition obligation count');
  eq(JSON.stringify(a.obligations?.map(x=>x.observation_id)),JSON.stringify(['SSC-OBS-0007','SSC-OBS-0008','SSC-OBS-0009']),'Acquisition obligation order');
  const reviewById = new Map(r.open_acquisition_obligations.map(x=>[x.observation_id,x]));
  const sourceIds = new Set(s.records.map(x=>x.source_id));
  for (const row of a.obligations) {
    const prior=reviewById.get(row.observation_id); check(Boolean(prior),`${row.observation_id}: parent review obligation missing`); if(!prior) continue;
    eq(row.lane_id,prior.lane_id,`${row.observation_id}: lane drift`); eq(row.prior_disposition,'requires_additional_acquisition',`${row.observation_id}: prior disposition`); eq(row.maintainer_review_state,'maintainer_reviewed',`${row.observation_id}: review state`); eq(row.status,'partially_repaired_open',`${row.observation_id}: obligation status`);
    check(Array.isArray(row.remaining_absences)&&row.remaining_absences.length>0,`${row.observation_id}: remaining absences erased`);
    check(row.source_ids.every(id=>sourceIds.has(id)),`${row.observation_id}: orphan acquisition source`);
    for (const effect of ['disposition_effect','review_effect','second_party_effect','publication_effect','graph_effect']) eq(row[effect],'none',`${row.observation_id}: ${effect}`);
  }
  const natsec=a.obligations?.[0]?.recovered ?? {}; eq(natsec.selected_roster?.length,100,'NatSec selected roster count'); eq(new Set(natsec.selected_roster?.map(x=>x.name)).size,100,'NatSec selected roster uniqueness'); eq(JSON.stringify(natsec.selected_roster?.map(x=>x.rank)),JSON.stringify(Array.from({length:100},(_,i)=>i+1)),'NatSec rank denominator'); eq(natsec.selected_roster?.[0]?.name,'Anduril','NatSec first selected row'); eq(natsec.selected_roster?.[99]?.name,'Harmonic','NatSec final selected row'); eq(natsec.exact_weights_disclosed,false,'NatSec exact weights'); eq(natsec.explicit_assessed_nonselections?.length,2,'NatSec assessed nonselection count');
  const sbic=a.obligations?.[1]?.recovered ?? {}; for (const [k,v] of Object.entries({formal_applications_as_of_2024_10_22:22,approved_as_of_2024_10_22:13,first_cohort_as_of_2025_01_17:18,publicly_named_first_cohort:17,withheld_first_cohort:1,fully_licensed_as_of_2025_01_17:7,funds_expressing_interest_minimum:100})) eq(sbic[k],v,`SBIC ${k}`);
  const osc=a.obligations?.[2]?.recovered ?? {}; eq(osc.applications_minimum,200,'OSC applicant minimum'); eq(osc.requested_usd,8900000000,'OSC requested amount'); eq(osc.initial_capacity_usd,984000000,'OSC initial capacity'); eq(osc.named_instruments?.length,5,'OSC named instrument count'); eq(osc.named_instruments?.reduce((n,x)=>n+x.amount_usd,0),2075000000,'OSC named amount sum'); eq(osc.named_instruments?.filter(x=>x.state==='executed_direct_loan').length,1,'OSC executed loan count'); eq(osc.named_instruments?.filter(x=>x.state==='conditional_loan_commitment').length,4,'OSC conditional count'); eq(osc.named_subset_exhausts_reported_fy26_aggregate,false,'OSC aggregate completeness');
  eq(s.schema_version,'status-sovereignty-targeted-acquisition-source-receipts@1','Acquisition source schema'); eq(s.records?.length,12,'Acquisition source row count'); eq(s.counts?.official_primary,11,'Acquisition official source count'); eq(s.counts?.first_party_selector,1,'Acquisition first-party count'); eq(s.counts?.source_bytes_preserved,0,'Acquisition source bytes'); check(new Set(s.records.map(x=>x.source_id)).size===12,'Acquisition source IDs duplicate');
  for (const src of s.records) { eq(src.retrieval?.source_bytes_preserved,false,`${src.source_id}: source-byte boundary`); eq(src.retrieval?.normalized_fact_record_sha256,hashFacts(src.normalized_fact_record),`${src.source_id}: normalized fact hash`); check(src.limitations?.length>0,`${src.source_id}: limitations missing`); }
  eq(schema.properties?.acquisition_id?.const,'SSC-W01-TA01','Acquisition schema identity');
  const result={targeted_acquisition_complete:true,obligations_partially_repaired:3,obligations_closed:0,reviewed_dispositions_changed:0,second_party_review_complete:false,adjudication_complete:false,complete_compact_findings:0,prevalence_finding_generated:false,racial_order_finding_generated:false,coordination_finding_generated:false,common_purpose_finding_generated:false,personal_hostility_finding_generated:false,publication_status:'blocked_pending_second_party_review_and_still_open_denominators',graph_effect:'none'};
  eq(JSON.stringify(a.current_result),JSON.stringify(result),'Acquisition current result');
  for (const [k,v] of Object.entries(a.boundaries??{})) { if(k==='graph_effect') eq(v,'none',`Acquisition boundary ${k}`); else eq(v,false,`Acquisition boundary ${k}`); }
  const expected=computeTargetedAcquisitionManifest(); eq(manifest.combined_sha256,expected.combined_sha256,'Acquisition exact-byte manifest'); eq(JSON.stringify(manifest.entries),JSON.stringify(expected.entries),'Acquisition manifest entries'); eq(JSON.stringify(buildManifest),JSON.stringify(manifest),'Acquisition build manifest drift'); eq(JSON.stringify(buildReport),JSON.stringify(publicReport),'Acquisition build/public report drift'); eq(buildReport.release_manifest?.combined_sha256,manifest.combined_sha256,'Acquisition report release digest'); check(html.includes('3/3 STILL OPEN'),'Acquisition HTML open-denominator boundary missing'); check(html.includes(manifest.combined_sha256),'Acquisition HTML release digest missing');
  return e;
}

function main(){const errors=validateTargetedAcquisition();if(errors.length){console.error(`validate-status-sovereignty-wave-01-targeted-acquisition: ${errors.length} error(s)`);for(const error of errors)console.error(`- ${error}`);process.exit(1)}console.log('validate-status-sovereignty-wave-01-targeted-acquisition: PASS')}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
