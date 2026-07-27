#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateAdoptionPackage } from '../tools/m05-adoption-conformance.mjs';

const clone=(value)=>JSON.parse(JSON.stringify(value));

const base={
  schema_version:'apc-adoption-package@1',
  package_id:'TEST-A0',
  claim:{requested_level:'A0',as_of:'2026-07-27',deployment_mode:'published_reference'},
  independence:{self_attested:false,external_attestors:[]},
  reviews:{
    legal:{status:'not_observed'},
    privacy:{status:'not_observed'},
    ethics:{status:'not_observed'}
  },
  affected_party:{
    approval_status:'not_observed',
    selection_independent:false,
    institution_or_vendor_controls_majority:false,
    nonretaliation_protection:false,
    direct_r1_r4_waiver_allowed:false
  },
  deployment:{
    mode:'published_reference',
    real_person_data:false,
    adverse_action_authority:false,
    recommendation_authority:false,
    influence_allowed:false,
    staff_consultation_allowed:false,
    entry_gate_approved:false,
    material_update_since_approval:false,
    update_reapproved:false,
    emergency_authority:{enabled:false}
  },
  stop_authority:{
    independent:false,
    can_bind_operator:false,
    can_bind_vendor:false,
    complete_evidence_access:false
  },
  evidence:{
    custodian:'public_repository',
    vendor_exclusive:false,
    integrity_receipts:[]
  },
  evaluation:{
    preregistered:false,
    metrics_frozen:false,
    denominators_frozen:false,
    stop_thresholds_frozen:false,
    results_seen_before_freeze:false
  },
  successor:{
    inheritance_required:true,
    observed_inheritance:false,
    post_change_reapproved:false
  },
  registry:{
    expires_at:'2027-01-27',
    re_review_date:'2026-10-27',
    open_blockers:['no external reproduction']
  },
  observations:{
    independent_reproduction:false,
    independent_review:false,
    lawful_shadow_period:false,
    shadow_adverse_action_boundary_preserved:false,
    prospective_parallel_operation:false,
    parallel_adverse_action_boundary_preserved:false,
    comparator_and_failure_denominator_complete:false,
    rights_bearing_use:false,
    rights_receipts_complete:false,
    binding_stop_or_remedy_observed:false,
    open_harm_denominator:false,
    turnover_survived:false,
    successor_system_survived:false
  }
};

const a0=evaluateAdoptionPackage(base);
assert.equal(a0.conformant,true);
assert.equal(a0.requested_level,'A0');
assert.equal(a0.computed_maximum_level,'A0');
assert.equal(a0.errors.length,0);
assert.equal(a0.truthfulness_determined,false);

const selfAttested=clone(base);
selfAttested.package_id='TEST-SELF';
selfAttested.claim.requested_level='A1';
selfAttested.independence.self_attested=true;
selfAttested.independence.external_attestors=[{
  attestor_id:'operator',
  relationship_disclosure:'operator',
  signed_at:'2026-07-27',
  evidence_uri:'urn:test:self',
  self:true
}];
selfAttested.observations.independent_reproduction=true;
const rejectedSelf=evaluateAdoptionPackage(selfAttested);
assert.equal(rejectedSelf.conformant,false);
assert(rejectedSelf.errors.some((row)=>row.code==='SELF-ATTESTED-INDEPENDENCE'));
assert(rejectedSelf.errors.some((row)=>row.code==='NO-EXTERNAL-ATTESTOR'));

const a3=clone(base);
a3.package_id='TEST-A3';
a3.claim={requested_level:'A3',as_of:'2026-07-27',deployment_mode:'no_adverse_shadow'};
a3.independence.external_attestors=[{
  attestor_id:'external-reviewer-01',
  relationship_disclosure:'No operator, vendor, customer, funder, procurement, litigation, or contingent-compensation relationship.',
  signed_at:'2026-07-26',
  evidence_uri:'urn:test:attestation',
  self:false
}];
for(const kind of ['legal','privacy','ethics']){
  a3.reviews[kind]={
    status:'approved',
    authority:`external-${kind}-authority`,
    evidence_uri:`urn:test:${kind}`,
    expires_at:'2027-01-27'
  };
}
a3.affected_party={
  approval_status:'approved',
  selection_independent:true,
  institution_or_vendor_controls_majority:false,
  body_id:'affected-party-body-01',
  approval_evidence_uri:'urn:test:affected-party',
  nonretaliation_protection:true,
  direct_r1_r4_waiver_allowed:false
};
Object.assign(a3.deployment,{
  mode:'no_adverse_shadow',
  real_person_data:true,
  adverse_action_authority:false,
  recommendation_authority:false,
  influence_allowed:false,
  staff_consultation_allowed:false,
  entry_gate_approved:true
});
a3.stop_authority={
  independent:true,
  can_bind_operator:true,
  can_bind_vendor:true,
  complete_evidence_access:true,
  evidence_uri:'urn:test:stop'
};
a3.evaluation={
  preregistered:true,
  metrics_frozen:true,
  denominators_frozen:true,
  stop_thresholds_frozen:true,
  results_seen_before_freeze:false,
  preregistration_uri:'urn:test:preregistration'
};
Object.assign(a3.observations,{
  independent_reproduction:true,
  independent_review:true,
  lawful_shadow_period:true,
  shadow_adverse_action_boundary_preserved:true
});
const acceptedA3=evaluateAdoptionPackage(a3);
assert.equal(acceptedA3.conformant,true);
assert.equal(acceptedA3.computed_maximum_level,'A3');
assert.equal(acceptedA3.errors.length,0);
assert.equal(acceptedA3.truthfulness_determined,false);

const adverseShadow=clone(a3);
adverseShadow.package_id='TEST-ADVERSE-SHADOW';
adverseShadow.deployment.adverse_action_authority=true;
const rejectedShadow=evaluateAdoptionPackage(adverseShadow);
assert.equal(rejectedShadow.conformant,false);
assert(rejectedShadow.errors.some((row)=>row.code==='ADVERSE-AUTHORITY-IN-NO-ADVERSE-MODE'));

const unsupportedA6=clone(base);
unsupportedA6.package_id='TEST-A6';
unsupportedA6.claim.requested_level='A6';
const rejectedA6=evaluateAdoptionPackage(unsupportedA6);
assert.equal(rejectedA6.conformant,false);
assert.equal(rejectedA6.computed_maximum_level,'A0');
assert(rejectedA6.errors.some((row)=>row.code==='UNSUPPORTED-LEVEL'));
assert(rejectedA6.errors.some((row)=>row.code==='SUCCESSOR-INHERITANCE'));

const stale=clone(a3);
stale.package_id='TEST-STALE';
stale.reviews.legal.expires_at='2026-07-26';
const rejectedStale=evaluateAdoptionPackage(stale);
assert.equal(rejectedStale.conformant,false);
assert(rejectedStale.errors.some((row)=>row.code==='REVIEWS-NOT-CURRENT'));

console.log('m05-adoption-conformance.test: OK');
