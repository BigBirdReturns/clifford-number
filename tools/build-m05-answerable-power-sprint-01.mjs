#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const sources=read('data/intake/m05-answerable-power-sprint-01-sources.json');
const triad=read('data/project/m05-answerable-power-sprint-01-triad.json');
const benchmark=read('data/project/m05-answerable-power-benchmark-wave-01.json');
const cadence=read('data/project/m05-answerable-power-sprint-cadence.json');
const sourceHealth=read('data/project/m05-answerable-power-sprint-01-source-health.json');

const report={
  schema_version:'m05-answerable-power-sprint-report@1',
  program_id:'M-05',
  sprint_id:'M05-SPRINT-01',
  generated_from:[
    'data/intake/m05-answerable-power-sprint-01-sources.json',
    'data/project/m05-answerable-power-sprint-01-triad.json',
    'data/project/m05-answerable-power-benchmark-wave-01.json',
    'data/project/m05-answerable-power-sprint-cadence.json',
    'data/project/m05-answerable-power-sprint-01-source-health.json'
  ],
  counts:{
    sources:sources.sources.length,
    triad_packets:triad.packets.length,
    standalone_packets:triad.counts.standalone,
    overlap_packets:triad.counts.overlap,
    benchmark_cases:benchmark.cases.length,
    benchmark_domains:benchmark.counts.domains,
    benchmark_jurisdictions:benchmark.counts.jurisdictions,
    sprint_legs:cadence.sprint_legs.length,
    polls_selected:sourceHealth.basis.polls_selected,
    polls_succeeded:sourceHealth.basis.polls_succeeded,
    polls_failed:sourceHealth.basis.polls_failed
  },
  triad,
  benchmark,
  cadence,
  source_health:sourceHealth,
  boundaries:{
    promotes_to:'candidate_only',
    graph_effect:'none',
    conclusion_generated:false,
    estate_completion_claimed:false,
    pairwise_overlap_proves_triadic_common_purpose:false,
    formal_control_proves_effective_power:false,
    sprint_output_proves_project_completion:false
  }
};

write('reports/core-thesis/answerable-power/sprint-01.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const packetRows=triad.packets.map((row)=>`<tr><td><code>${esc(row.packet_id)}</code></td><td>${esc(row.title)}</td><td><code>${esc(row.disposition)}</code></td><td>${esc(row.maximum_ceiling)}</td></tr>`).join('');
const caseRows=benchmark.cases.map((row)=>`<tr><td><code>${esc(row.case_id)}</code></td><td>${esc(row.title)}</td><td>${esc(row.domain)}</td><td>${esc(row.jurisdiction)}</td><td><code>${esc(row.highest_observed_level)}</code></td></tr>`).join('');
const legRows=cadence.sprint_legs.map((row)=>`<tr><td><code>${esc(row.leg_id)}</code></td><td>${esc(row.name)}</td><td>${esc(row.contract)}</td></tr>`).join('');
const failureRows=sourceHealth.failure_taxonomy.map((row)=>`<tr><td><code>${esc(row.failure_class)}</code></td><td>${row.count}</td><td>${esc(row.primary_surface)}</td><td>${esc(row.repair)}</td></tr>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Sprint 01</title><style>body{font:16px/1.55 system-ui;max-width:1320px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric,article,table,pre{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,article,pre{padding:15px}.metric b{display:block;font-size:1.8rem}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}.boundary{border-left:5px solid #8a2c24}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Sprint 01 · Triad, counterpower, and source health</h1><p class="state">BOUNDED SPRINT · CANDIDATE-ONLY</p><div class="metrics"><div class="metric"><b>${report.counts.sources}</b>sources</div><div class="metric"><b>${report.counts.triad_packets}</b>triad packets</div><div class="metric"><b>${report.counts.benchmark_cases}</b>answer cases</div><div class="metric"><b>${report.counts.benchmark_domains}</b>domains</div><div class="metric"><b>${report.counts.benchmark_jurisdictions}</b>jurisdictions</div><div class="metric"><b>${report.counts.polls_succeeded}/${report.counts.polls_selected}</b>source-health baseline</div></div><h2>Triad packets</h2><table><tr><th>ID</th><th>Story</th><th>Disposition</th><th>Ceiling</th></tr>${packetRows}</table><h2>Triad guardrail</h2><pre>${esc(JSON.stringify(triad.triad_guardrail,null,2))}</pre><h2>Answerable-power benchmark</h2><table><tr><th>ID</th><th>Case</th><th>Domain</th><th>Jurisdiction</th><th>Highest observed</th></tr>${caseRows}</table><h2>Cross-domain result</h2><pre>${esc(JSON.stringify(benchmark.cross_domain_assessment,null,2))}</pre><h2>Sprint legs</h2><table><tr><th>Leg</th><th>Name</th><th>Contract</th></tr>${legRows}</table><h2>Source-health repair</h2><table><tr><th>Failure</th><th>Count</th><th>Surface</th><th>Repair</th></tr>${failureRows}</table><h2>Boundary</h2><pre class="boundary">${esc(JSON.stringify(report.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/sprint-01.html',html+'\n');
console.log(`build-m05-answerable-power-sprint-01: ${report.counts.sources} sources, ${report.counts.triad_packets} packets, ${report.counts.benchmark_cases} cases`);
