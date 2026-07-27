#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const generatedFrom=[
  'data/project/m05-answerable-power-sprint-05-plan.json',
  'data/project/m05-answerable-power-sprint-05-leg-01-conformance.json',
  'data/project/m05-answerable-power-sprint-05-leg-02-threat-model.json',
  'data/project/m05-answerable-power-sprint-05-leg-03-entry-gate.json',
  'data/project/m05-answerable-power-sprint-05-leg-04-governance.json',
  'data/project/m05-answerable-power-sprint-05-leg-05-candidate-landscape.json',
  'data/project/m05-answerable-power-sprint-05-leg-06-preregistration.json',
  'data/project/m05-answerable-power-sprint-05-leg-07-registry.json'
];
const documents=Object.fromEntries(generatedFrom.map((rel)=>[rel,read(rel)]));
const [plan,l1,l2,l3,l4,l5,l6,l7]=generatedFrom.map((rel)=>documents[rel]);
const fingerprints=Object.fromEntries(generatedFrom.map((rel)=>[
  rel,
  crypto.createHash('sha256').update(JSON.stringify(documents[rel])).digest('hex')
]));
const combinedFingerprint=crypto.createHash('sha256').update(JSON.stringify(fingerprints)).digest('hex');
const scenarioCounts=l4.synthetic_scenarios.reduce((acc,row)=>{acc[row.expected_outcome]=(acc[row.expected_outcome]||0)+1;return acc},{});
const attackCounts=l2.attack_classes.reduce((acc,row)=>{const key=row.machine_detectable?'machine_detectable':'human_investigation_required';acc[key]=(acc[key]||0)+1;return acc},{});

const report={
  schema_version:'m05-answerable-power-sprint-05-report@1',
  program_id:plan.program_id,
  sprint_id:plan.sprint_id,
  title:plan.title,
  status:plan.status,
  as_of:plan.as_of,
  generated_from:generatedFrom,
  fingerprints,
  combined_fingerprint:combinedFingerprint,
  counts:{
    adoption_levels:plan.adoption_ladder.length,
    legs:plan.leg_registry.length,
    conformance_rejection_rules:l1.machine_rejection_rules.length,
    attack_classes:l2.attack_classes.length,
    machine_detectable_attacks:attackCounts.machine_detectable||0,
    human_investigation_attacks:attackCounts.human_investigation_required||0,
    entry_gate_sections:l3.gate_sections.length,
    governance_roles:l4.constitutional_roles.length,
    governance_formation_rules:l4.formation_rules.length,
    governance_properties:l4.machine_tested_properties.length,
    governance_scenarios:l4.synthetic_scenarios.length,
    governance_scenario_counts:scenarioCounts,
    candidate_surfaces:l5.candidates.length,
    exact_operating_systems:l5.candidates.filter((row)=>row.exact_system_state==='exact_operating_system_bounded').length,
    metric_families:l6.metric_families.length,
    constitutional_stop_thresholds:l6.constitutional_stop_thresholds.length,
    registry_entries:l7.registry.length,
    reconciliation_rules:l7.reconciliation_rules.length
  },
  governing_problem:plan.governing_problem,
  governing_purpose:plan.governing_purpose,
  reconstruction_receipt:plan.reconstruction_receipt,
  adoption_ladder:plan.adoption_ladder,
  leg_registry:plan.leg_registry,
  conformance:l1,
  threat_model:l2,
  entry_gate:l3,
  governance:l4,
  candidate_landscape:l5,
  preregistration:l6,
  adoption_registry:l7,
  current_state:plan.current_state,
  current_adoption_result:l7.current_result,
  boundaries:plan.boundaries
};
write('reports/core-thesis/answerable-power/sprint-05.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const ladderRows=plan.adoption_ladder.map((row)=>`<tr><td><code>${esc(row.level)}</code></td><td>${esc(row.name)}</td><td>${esc(row.test)}</td><td>${esc(row.forbidden_shortcut)}</td></tr>`).join('');
const legRows=plan.leg_registry.map((row)=>`<tr><td><code>${esc(row.leg_id)}</code></td><td>${esc(row.name)}</td><td>${row.protocol_complete?'complete':'open'}</td><td>${row.external_effect_observed?'observed':'not observed'}</td></tr>`).join('');
const attackRows=l2.attack_classes.map((row)=>`<tr><td><code>${esc(row.attack_id)}</code></td><td>${esc(row.name)}</td><td>${row.machine_detectable?'machine flag':'human investigation'}</td><td>${esc(row.description)}</td></tr>`).join('');
const candidateRows=l5.candidates.map((row)=>`<tr><td><code>${esc(row.candidate_id)}</code></td><td>${esc(row.label)}</td><td>${esc(row.jurisdiction)}</td><td>${esc(row.exact_system_state)}</td><td>${esc(row.affected_party_body)}</td><td>${esc(row.independent_stop_authority)}</td></tr>`).join('');
const metricRows=l6.metric_families.map((row)=>`<tr><td><code>${esc(row.metric_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.purpose)}</td><td>${esc(row.denominator)}</td></tr>`).join('');
const resultRows=Object.entries(l7.current_result).map(([key,value])=>`<tr><td><code>${esc(key)}</code></td><td>${esc(value)}</td></tr>`).join('');

const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 05 · Adoption Integrity</title><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,.box,table{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,.box{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#a43a00}.boundary{border-left:5px solid #8a2c24}.receipt{border-left:5px solid #765b00}</style></head><body><p><b>CLIFFORD NUMBER · M-05 · SPRINT 05</b></p><h1>Adoption integrity and anti-counterfeit adoption</h1><p class="state">VERIFIED CEILING: A0 · NO EXTERNAL ADOPTION OBSERVED</p><div class="metrics"><div class="metric"><b>${report.counts.adoption_levels}</b>adoption levels</div><div class="metric"><b>${report.counts.attack_classes}</b>attack classes</div><div class="metric"><b>${report.counts.entry_gate_sections}</b>entry-gate sections</div><div class="metric"><b>${report.counts.governance_scenarios}</b>governance scenarios</div><div class="metric"><b>${report.counts.candidate_surfaces}</b>candidate surfaces</div><div class="metric"><b>${report.counts.metric_families}</b>telemetry families</div></div><h2>Reconstruction receipt</h2><pre class="box receipt">${esc(JSON.stringify(plan.reconstruction_receipt,null,2))}</pre><h2>Adoption ladder</h2><table><tr><th>Level</th><th>Name</th><th>Evidence test</th><th>Forbidden shortcut</th></tr>${ladderRows}</table><h2>Sprint legs</h2><table><tr><th>Leg</th><th>Surface</th><th>Protocol</th><th>External effect</th></tr>${legRows}</table><h2>Adoption threat model</h2><table><tr><th>ID</th><th>Attack</th><th>Detection</th><th>Description</th></tr>${attackRows}</table><h2>Real-person entry gate</h2><pre class="box">${esc(JSON.stringify(l3.entry_decision,null,2))}</pre><h2>Governance denominator</h2><pre class="box">${esc(JSON.stringify(l4.scenario_denominator,null,2))}</pre><h2>Candidate landscape</h2><table><tr><th>ID</th><th>Candidate</th><th>Jurisdiction</th><th>Exact-system state</th><th>Affected-party body</th><th>Stop authority</th></tr>${candidateRows}</table><h2>Preregistered telemetry</h2><table><tr><th>ID</th><th>Metric family</th><th>Purpose</th><th>Denominator</th></tr>${metricRows}</table><h2>Adoption registry result</h2><table><tr><th>Field</th><th>Value</th></tr>${resultRows}</table><h2>Boundary</h2><pre class="box boundary">${esc(JSON.stringify(plan.boundaries,null,2))}</pre><p><code>combined fingerprint: ${esc(combinedFingerprint)}</code></p></body></html>`;
write('reports/core-thesis/answerable-power/sprint-05.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-05: ${report.counts.legs} legs, ${report.counts.attack_classes} attacks, ${report.counts.metric_families} metric families, ceiling ${l7.current_result.maximum_verified_adoption_level}`);
