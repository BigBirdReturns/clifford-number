#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadTargetedAcquisitionContext, validateTargetedAcquisition } from '../tools/validate-status-sovereignty-wave-01-targeted-acquisition.mjs';
const clean=loadTargetedAcquisitionContext(); assert.deepEqual(validateTargetedAcquisition(clean),[],'clean targeted acquisition must validate');
const clone=()=>Object.fromEntries(Object.entries(clean).map(([k,v])=>[k,typeof v==='string'?v:structuredClone(v)]));
const mutations=[
 ['identity',(c)=>{c.acquisition.acquisition_id='OTHER'},'Acquisition identity'],
 ['authority',(c)=>{c.acquisition.authority_contract.authority='adjudication'},'Acquisition authority'],
 ['close authority',(c)=>{c.acquisition.authority_contract.may_close_obligation_without_complete_required_record=true},'may_close_obligation'],
 ['obligation count',(c)=>{c.acquisition.counts.obligations=2},'Acquisition count obligations'],
 ['closed invented',(c)=>{c.acquisition.counts.closed=1},'Acquisition count closed'],
 ['complete compact invented',(c)=>{c.acquisition.counts.complete_compact_findings=1},'Acquisition count complete_compact_findings'],
 ['row removed',(c)=>{c.acquisition.obligations.pop()},'Acquisition obligation count'],
 ['order drift',(c)=>{c.acquisition.obligations.reverse()},'Acquisition obligation order'],
 ['parent obligation removed',(c)=>{c.review.open_acquisition_obligations.pop()},'parent review obligation missing'],
 ['status closed',(c)=>{c.acquisition.obligations[0].status='closed'},'obligation status'],
 ['absence erased',(c)=>{c.acquisition.obligations[0].remaining_absences=[]},'remaining absences erased'],
 ['disposition changed',(c)=>{c.acquisition.obligations[0].disposition_effect='supported_bounded_compact'},'disposition_effect'],
 ['orphan source',(c)=>{c.acquisition.obligations[0].source_ids=['MISSING']},'orphan acquisition source'],
 ['roster truncated',(c)=>{c.acquisition.obligations[0].recovered.selected_roster.pop()},'NatSec selected roster count'],
 ['roster duplicated',(c)=>{c.acquisition.obligations[0].recovered.selected_roster[1].name='Anduril'},'NatSec selected roster uniqueness'],
 ['rank drift',(c)=>{c.acquisition.obligations[0].recovered.selected_roster[10].rank=99},'NatSec rank denominator'],
 ['weights invented',(c)=>{c.acquisition.obligations[0].recovered.exact_weights_disclosed=true},'NatSec exact weights'],
 ['SBIC applications inflated',(c)=>{c.acquisition.obligations[1].recovered.formal_applications_as_of_2024_10_22=23},'SBIC formal_applications'],
 ['SBIC withheld erased',(c)=>{c.acquisition.obligations[1].recovered.withheld_first_cohort=0},'SBIC withheld_first_cohort'],
 ['OSC applicant minimum changed',(c)=>{c.acquisition.obligations[2].recovered.applications_minimum=201},'OSC applicant minimum'],
 ['OSC instrument removed',(c)=>{c.acquisition.obligations[2].recovered.named_instruments.pop()},'OSC named instrument count'],
 ['OSC aggregate falsely complete',(c)=>{c.acquisition.obligations[2].recovered.named_subset_exhausts_reported_fy26_aggregate=true},'OSC aggregate completeness'],
 ['source count drift',(c)=>{c.sources.counts.official_primary=12},'Acquisition official source count'],
 ['source hash drift',(c)=>{c.sources.records[0].retrieval.normalized_fact_record_sha256='f'.repeat(64)},'normalized fact hash'],
 ['publication cleared',(c)=>{c.acquisition.current_result.publication_status='public'},'Acquisition current result'],
 ['racial finding invented',(c)=>{c.acquisition.current_result.racial_order_finding_generated=true},'Acquisition current result'],
 ['manifest drift',(c)=>{c.manifest.combined_sha256='f'.repeat(64)},'Acquisition exact-byte manifest'],
 ['public report drift',(c)=>{c.publicReport.counts.closed=1},'Acquisition build/public report drift']
];
for(const[name,mutate,expected]of mutations){const c=clone();mutate(c);const e=validateTargetedAcquisition(c);assert(e.some(x=>x.includes(expected)),`${name}: expected ${expected}; observed ${JSON.stringify(e)}`)}
console.log(`status-sovereignty-wave-01-targeted-acquisition.test: ${mutations.length} adversarial mutations PASS`);
