#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadWave01ReviewContext, validateWave01Review } from '../tools/validate-status-sovereignty-wave-01-review.mjs';
const clean=loadWave01ReviewContext(); assert.deepEqual(validateWave01Review(clean),[],'clean maintainer review must validate');
const clone=()=>Object.fromEntries(Object.entries(clean).map(([k,v])=>[k,typeof v==='string'?v:structuredClone(v)]));
const mutations=[
 ['review identity',(c)=>{c.review.review_id='OTHER'},'Review identity'],
 ['review count inflated',(c)=>{c.review.counts.maintainer_reviewed=15},'Review count maintainer_reviewed'],
 ['second party self-awarded',(c)=>{c.review.counts.second_party_reviewed=14},'Review count second_party_reviewed'],
 ['adjudication self-awarded',(c)=>{c.review.counts.adjudicated=14},'Review count adjudicated'],
 ['complete compact invented',(c)=>{c.review.counts.supported_bounded_compact=1},'Review count supported_bounded_compact'],
 ['row removed',(c)=>{c.review.reviewed_observations.pop()},'Review row count'],
 ['row duplicated',(c)=>{c.review.reviewed_observations[1].observation_id=c.review.reviewed_observations[0].observation_id},'Review row order'],
 ['disposition changed silently',(c)=>{c.review.reviewed_observations[0].reviewed_disposition='supported_bounded_compact'},'disposition drift'],
 ['change flag invented',(c)=>{c.review.reviewed_observations[0].disposition_changed=true},'disposition change'],
 ['wave review erased',(c)=>{c.wave.observations[0].review_state='unreviewed'},'wave review state'],
 ['complete compact row invented',(c)=>{c.review.reviewed_observations[0].complete_compact_supported=true},'complete compact self-awarded'],
 ['second-party row invented',(c)=>{c.review.reviewed_observations[0].second_party_review_state='complete'},'second-party state'],
 ['gate removed',(c)=>{c.review.reviewed_observations[0].four_gate_assessment.pop()},'four-gate count'],
 ['gate state invalid',(c)=>{c.review.reviewed_observations[0].four_gate_assessment[0].state='proven'},'gate state invalid'],
 ['all gates laundered',(c)=>{c.review.reviewed_observations[0].four_gate_assessment.forEach(g=>g.state='supported_bounded')},'complete compact laundered'],
 ['effective control erased',(c)=>{c.review.reviewed_observations[5].control_class=null},'effective-counterpower controls'],
 ['open acquisition removed',(c)=>{c.review.open_acquisition_obligations.pop()},'open acquisition count'],
 ['publication cleared',(c)=>{c.review.current_result.publication_status='public'},'Review publication state'],
 ['graph effect created',(c)=>{c.review.current_result.graph_effect='edge'},'Review graph result'],
 ['compact review erased',(c)=>{c.compact.current_state.maintainer_reviewed_observations=0},'Compact reviewed count'],
 ['fanout review inflated',(c)=>{c.fanout.counts.maintainer_reviewed_records=15},'Fanout reviewed count'],
 ['source review conflated',(c)=>{c.registry.boundaries.field_source_review_is_maintainer_review=true},'Registry source/review separation'],
 ['manifest drift',(c)=>{c.manifest.combined_sha256='f'.repeat(64)},'Review exact-byte manifest'],
 ['public report drift',(c)=>{c.publicReport.counts.maintainer_reviewed=0},'Review build/public report drift']
];
for(const[name,mutate,expected]of mutations){const c=clone();mutate(c);const e=validateWave01Review(c);assert(e.some(x=>x.includes(expected)),`${name}: expected ${expected}; observed ${JSON.stringify(e)}`)}
console.log(`status-sovereignty-wave-01-review.test: ${mutations.length} adversarial mutations PASS`);
