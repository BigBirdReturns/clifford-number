import assert from 'node:assert/strict';
import {triage,analyze} from '../tools/integrity-triage.mjs';
const sample={id:'x',cohort_id:'schoolhouse-2024',member_id:'t-1',roster_label:'Tern AI',
 recipient_name:'EASTERN AIRLINES LLC',recipient_uei:'A',award_id:'FA',source_receipt:{sha256:'0'.repeat(64),path:'sample.json'},
 amount_kind:'USAspending API Award Amount (no payment or ceiling inference)',source_award_amount:'100'};
const falseMatch=triage(sample);assert.equal(falseMatch.lexical_grade,'lexically_inconsistent_search_hit');assert.equal(falseMatch.graph_effect,'none');
assert.equal(falseMatch.identity_disposition,'unresolved');
const exact=triage({...sample,recipient_name:'TERN AI INC.'});assert.equal(exact.lexical_grade,'lexically_exact_candidate');
const prefix=triage({...sample,roster_label:'Canopy Aerospace',recipient_name:'CANOPY AEROSPACE TECHNOLOGIES INC.'});assert.equal(prefix.lexical_grade,'lexically_prefix_candidate');
const ambiguous=triage({...sample,roster_label:'Firestorm',recipient_name:'FIRESTORM LABS INC.'});assert.equal(ambiguous.lexical_grade,'single_token_ambiguous');
const falseUEI=triage({...sample,roster_label:'CX2',recipient_name:'FEA ADVISORS LLC',recipient_uei:'CX22BZTAW656'});assert.equal(falseUEI.lexical_grade,'lexically_inconsistent_search_hit');
const pure=triage({...sample,roster_label:'AstroForge',recipient_name:'ASTROFORGE, INC.'});assert.equal(pure.lexical_grade,'lexically_exact_candidate');
assert.equal(pure.independent_review,'not_performed');
console.log('integrity-triage.test: PASS (token collisions, exact/prefix candidates, no name-to-identity promotion)');
