#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const writeJson = (p, value) => {
  const target = path.join(root, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const writeText = (p, value) => {
  const target = path.join(root, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value.endsWith('\n') ? value : `${value}\n`);
};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};
const fingerprint = (value) => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const countsBy = (rows, key) => Object.fromEntries([...rows.reduce((m, row) => m.set(row[key], (m.get(row[key]) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));

const program = read('data/project/security-state-organism-program.json');
const registry = read('data/project/security-state-entity-registry.json');
const routes = read('data/intake/security-state-organism-source-routes.json');
const alignment = read('data/project/security-state-estate-alignment.json');
const work = read('data/project/security-state-work-packages.json');
const evidence = read('data/intake/security-state-organism-evidence-intake.json');

const entityById = new Map(registry.entities.map((x) => [x.entity_id, x]));
const estateById = new Map(alignment.estates.map((x) => [x.estate_id, x]));
const routeById = new Map(routes.routes.map((x) => [x.route_id, x]));
const evidenceById = new Map(evidence.records.map((x) => [x.evidence_id, x]));
const packageById = new Map(work.packages.map((x) => [x.package_id, x]));
const label = (id) => program.organ_types.find((x) => x.organ_id === id)?.label
  ?? program.lineage_stages.find((x) => x.stage_id === id)?.label
  ?? program.organism_tests.find((x) => x.test_id === id)?.label
  ?? program.theaters.find((x) => x.theater_id === id)?.label
  ?? entityById.get(id)?.label
  ?? estateById.get(id)?.label
  ?? id;

const base = 'build/core-thesis/security-state-organism';
const publicBase = 'reports/core-thesis/security-state-organism';
fs.rmSync(path.join(root, base), { recursive: true, force: true });
fs.rmSync(path.join(root, publicBase), { recursive: true, force: true });

for (const packet of work.packages) {
  const targetRows = [
    ...packet.estate_ids.map((id) => ['Estate', id]),
    ...packet.entity_ids.map((id) => ['Entity', id]),
    ...packet.organ_ids.map((id) => ['Organ', id]),
    ...packet.lineage_stage_ids.map((id) => ['Lineage stage', id]),
    ...packet.theater_ids.map((id) => ['Theater', id]),
    ...packet.test_ids.map((id) => ['Organism test', id]),
  ];
  const evidenceRows = packet.evidence_record_ids.map((id) => evidenceById.get(id)).filter(Boolean);
  const sourceRows = packet.source_route_ids.map((id) => routeById.get(id)).filter(Boolean);
  const md = [
    `# ${packet.title}`,
    '',
    `- Package: \`${packet.package_id}\``,
    `- Class: \`${packet.package_class}\``,
    `- Priority: \`${packet.priority}\``,
    `- Routing: \`${packet.routing.status}\``,
    `- Synthetic assignment: \`${packet.routing.synthetic_assignment}\``,
    '',
    '## Priority basis',
    '',
    packet.priority_basis,
    '',
    '## Proof question',
    '',
    packet.proof_question,
    '',
    '## Explicit targets',
    '',
    ...(targetRows.length ? targetRows.map(([kind, id]) => `- ${kind}: \`${id}\` — ${label(id)}`) : ['- None selected. The target remains unresolved at this layer.']),
    '',
    '## Required records',
    '',
    ...packet.required_records.map((x) => `- ${x}`),
    '',
    '## Required outputs',
    '',
    ...packet.required_outputs.map((x) => `- ${x}`),
    '',
    '## Source routes',
    '',
    ...(sourceRows.length ? sourceRows.map((x) => `- \`${x.route_id}\` — ${x.label} · \`${x.locator_status}\`${x.url ? ` · ${x.url}` : ' · locator unresolved'}`) : ['- No source route has been selected.']),
    '',
    '## Source-bounded evidence intake',
    '',
    ...(evidenceRows.length ? evidenceRows.flatMap((x) => [
      `### ${x.evidence_id} · ${x.source_title}`,
      '',
      `- Source: ${x.source_url}`,
      `- Status: \`${x.evidence_status}\``,
      `- Observation: ${x.observation}`,
      `- Supports: ${x.supports.join('; ')}`,
      `- Does not support: ${x.does_not_support.join('; ')}`,
      `- Next acquisition: ${x.next_acquisition}`,
      '',
    ]) : ['- No evidence record is attached.']),
    '',
    '## Falsifier',
    '',
    packet.falsifier,
    '',
    '## Allowed terminal states',
    '',
    ...packet.terminal_states.map((x) => `- \`${x}\``),
    '',
    '```text',
    'promotes_to: candidate_only',
    'graph_effect: none',
    'conclusion_generated: false',
    'estate_completion_claimed: false',
    'synthetic_assignment: false',
    '```',
  ].join('\n');
  writeText(`${base}/packets/${packet.package_id}.md`, md);
}

const estateIssueNumbers = {
  'ai-data-compute-infrastructure-estate': 102,
  'dialog-estate': 103,
  'energy-utilities-critical-infrastructure-estate': 104,
  'higher-education-research-commercialization-estate': 105,
  'intellectual-property-standards-data-rights-estate': 106,
  'judicial-administrative-adjudication-estate': 107,
  'labor-immigration-workforce-mobility-estate': 108,
  'local-development-estate': 109,
  'offshore-beneficial-ownership-estate': 110,
  'philanthropy-nonprofit-policy-estate': 111,
  'professional-services-intermediaries-estate': 112,
  'public-interest-crossing-estate': 113,
  'public-money-industrial-policy-estate': 114,
  'real-property-title-debt-estate': 115,
  'regulatory-markets-estate': 116,
  'sanctions-export-controls-foreign-investment-estate': 117,
  'state-municipal-authority-estate': 118,
  'transatlantic-defense-innovation-estate': 119,
  'uk-defense-estate': 120,
  'uk-state-market-estate': 121,
  'us-defense-estate': 122,
  'us-executive-appointments-ethics-estate': 123,
  'us-legislative-political-finance-estate': 124,
  'venture-capital-corporate-control-estate': 125,
};

const issueGroups = [{
  issue_id: 'MASTER',
  issue_class: 'master',
  title: '[M-04B] Make the security-state organism thesis earn promotion',
  package_ids: work.packages.map((x) => x.package_id),
  purpose: 'Coordinate the complete adversarial evidence program without treating packet count or deterministic publication as evidence.',
}];
for (const organ of program.organ_types) issueGroups.push({ issue_id: `ORGAN-${organ.organ_id}`, issue_class: 'organ', title: `[M-04B organ] ${organ.label}`, package_ids: [`ORG-${organ.organ_id}`], purpose: organ.function });
for (const test of program.organism_tests) issueGroups.push({ issue_id: `TEST-${test.test_id}`, issue_class: 'organism_test', title: `[M-04B test] ${test.label}`, package_ids: [`TST-${test.test_id}`], purpose: test.proof });
for (const theater of program.theaters) issueGroups.push({ issue_id: `THEATER-${theater.theater_id}`, issue_class: 'theater', title: `[M-04B theater] ${theater.label}`, package_ids: [`THR-${theater.theater_id}`], purpose: theater.role_under_test });
for (const packet of work.packages.filter((x) => x.package_class === 'cross_estate_bridge')) issueGroups.push({ issue_id: `BRIDGE-${packet.package_id}`, issue_class: 'bridge', title: `[M-04B bridge] ${packet.title}`, package_ids: [packet.package_id], purpose: packet.proof_question });

const clusters = [
  ['PALANTIR', ['palantir-technologies-inc', 'palantir-fedstart', 'peter-thiel', 'alex-karp', 'trae-stephens']],
  ['ANDURIL', ['anduril-industries-inc', 'anduril-lattice', 'palmer-luckey', 'brian-schimpf', 'trae-stephens']],
  ['SPACEXAI', ['spacex', 'starlink-services-llc', 'starshield', 'spacexai', 'x-corp', 'tesla-inc', 'the-boring-company']],
  ['EREBOR', ['erebor-bank-na', 'palmer-luckey', 'joe-lonsdale', 'peter-thiel', 'eight-partners-vc-llc']],
  ['TRAYSAR', ['traysar-inc', 'traysar-industries-ltd', 'silent-ventures', 'lux-capital', 'israel-mod-ddrd', 'israel-sibat', 'israel-deca']],
  ['CAPITAL', ['founders-fund', 'eight-partners-vc-llc', 'andreessen-horowitz', 'american-dynamism', 'silent-ventures', 'silent-capital', 'lux-capital', 'alias-bvc', 'alias-a17']],
  ['SELECTION', ['silicon-valley-defense-group', 'natsec100', 'defense-innovation-unit', 'in-q-tel']],
  ['ISRAEL', ['israel-mod-ddrd', 'israel-sibat', 'israel-deca', 'idf-unit-8200', 'israel-c4i-cyber-directorate', 'israel-population-immigration-authority']],
  ['US-BORDER', ['us-dhs-cbp', 'us-ice', 'palantir-technologies-inc']],
  ['PEOPLE', ['palmer-luckey', 'trae-stephens', 'joe-lonsdale', 'peter-thiel', 'alex-karp', 'brian-schimpf']],
  ['ALIASES', ['alias-bvc', 'alias-a17', 'silent-capital', 'silent-ventures', 'traysar-industries-ltd']],
  ['COUNTERPOWER', []],
];
for (const [clusterId, ids] of clusters) {
  const entityPackageIds = ids.map((id) => `ENT-${id}`).filter((id) => packageById.has(id));
  const packageIds = clusterId === 'COUNTERPOWER'
    ? ['ORG-O15-counterpower', 'BRG-14', 'TST-T8-coercion-extraction']
    : entityPackageIds;
  issueGroups.push({
    issue_id: `CLUSTER-${clusterId}`,
    issue_class: 'cluster_index',
    title: `[M-04B cluster] ${clusterId.replaceAll('-', ' ')}`,
    package_ids: packageIds,
    purpose: 'Index related proof packets for coordinated review. Cluster membership is not evidence of common design, coordination, control, or organism membership.',
  });
}

const counts = {
  packages: work.packages.length,
  package_classes: countsBy(work.packages, 'package_class'),
  priorities: countsBy(work.packages, 'priority'),
  routing_statuses: countsBy(work.packages.map((x) => ({ routing_status: x.routing.status })), 'routing_status'),
  evidence_linked_packages: work.packages.filter((x) => x.evidence_record_ids.length).length,
  evidence_records: evidence.records.length,
  entities: registry.entities.length,
  entity_resolution_states: countsBy(registry.entities, 'resolution_state'),
  source_routes: routes.routes.length,
  source_route_states: countsBy(routes.routes, 'locator_status'),
  estates: alignment.estates.length,
  organs: program.organ_types.length,
  lineage_stages: program.lineage_stages.length,
  organism_tests: program.organism_tests.length,
  theaters: program.theaters.length,
  issue_groups: issueGroups.length,
  estate_handoffs: Object.keys(estateIssueNumbers).length,
};
const sourceFingerprint = fingerprint({ program, registry, routes, alignment, work, evidence });
const manifest = {
  schema_version: 'security-state-organism-manifest@2',
  program_id: program.program_id,
  as_of: program.as_of,
  source_fingerprint: sourceFingerprint,
  counts,
  boundaries: program.boundaries,
};
const issuePlan = {
  schema_version: 'security-state-organism-issue-plan@2',
  program_id: program.program_id,
  source_fingerprint: sourceFingerprint,
  issues: issueGroups,
  estate_handoffs: Object.entries(estateIssueNumbers).map(([estate_id, issue_number]) => ({ estate_id, issue_number, package_id: `EST-${estate_id}` })),
  boundaries: program.boundaries,
};
writeJson(`${base}/manifest.json`, manifest);
writeJson(`${base}/fanout.json`, { schema_version: 'security-state-organism-fanout@2', program_id: program.program_id, source_fingerprint: sourceFingerprint, counts, packages: work.packages, boundaries: program.boundaries });
writeJson(`${base}/issue-plan.json`, issuePlan);

const publicData = {
  schema_version: 'security-state-organism-public@2',
  source_fingerprint: sourceFingerprint,
  program,
  counts,
  entities: registry.entities,
  estates: alignment.estates,
  routes: routes.routes,
  packages: work.packages,
  evidence: evidence.records,
};
writeJson(`${publicBase}/data.json`, publicData);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Security-state organism evidence program</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#181713;background:#f5f1e7}*{box-sizing:border-box}body{margin:0}.shell{max-width:1600px;margin:auto;padding:28px}.eyebrow{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}.boundary{border-left:5px solid #222;padding:14px;background:#fff;margin:20px 0}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.card{background:#fff;border:1px solid #d8d0c0;border-radius:12px;padding:14px}.card strong{display:block;font-size:1.7rem}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}input,select{padding:9px;font:inherit;border:1px solid #a79f91;background:#fff}.table{overflow:auto;background:#fff;border:1px solid #d8d0c0;border-radius:12px;max-height:72vh}table{border-collapse:collapse;width:100%;font-size:.82rem}th,td{padding:9px;border-bottom:1px solid #eee7da;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#eee7da;z-index:1}.pill{display:inline-block;border:1px solid #aaa;border-radius:99px;padding:2px 7px;margin:1px;font-size:.72rem}.unresolved{font-weight:700}.muted{color:#69645b}code{white-space:nowrap}</style></head>
<body><main class="shell"><div class="eyebrow">Core thesis · M-04B · source fingerprint ${escapeHtml(sourceFingerprint)}</div><h1>Security-state organism evidence program</h1><p>${escapeHtml(program.working_proposition)}</p><section class="boundary"><strong>Proof program, not finding.</strong> ${escapeHtml(program.strongest_claim_under_test)} Every package remains candidate-only and graph-inert.</section><div class="metrics" id="metrics"></div><div class="controls"><input id="query" placeholder="Search packets and evidence"><select id="class"><option value="">All classes</option></select><select id="routing"><option value="">All routing states</option></select><select id="priority"><option value="">All priorities</option></select></div><p id="status"></p><div class="table"><table><thead><tr><th>Packet</th><th>Class</th><th>Routing</th><th>Targets</th><th>Evidence</th><th>Question</th><th>Falsifier</th></tr></thead><tbody id="rows"></tbody></table></div></main>
<script>
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const $=(s)=>document.querySelector(s);let D;const lookup=(id)=>D.entities.find(x=>x.entity_id===id)?.label||D.estates.find(x=>x.estate_id===id)?.label||D.program.organ_types.find(x=>x.organ_id===id)?.label||D.program.lineage_stages.find(x=>x.stage_id===id)?.label||D.program.theaters.find(x=>x.theater_id===id)?.label||id;const pills=(a)=>a.map(x=>'<span class="pill">'+esc(lookup(x))+'</span>').join(' ');function render(){const q=$('#query').value.toLowerCase(),cl=$('#class').value,rt=$('#routing').value,pr=$('#priority').value;let rows=D.packages.filter(x=>(!cl||x.package_class===cl)&&(!rt||x.routing.status===rt)&&(!pr||x.priority===pr)&&(!q||JSON.stringify(x).toLowerCase().includes(q)||x.evidence_record_ids.some(id=>JSON.stringify(D.evidence.find(e=>e.evidence_id===id)||{}).toLowerCase().includes(q))));$('#status').textContent=rows.length+' of '+D.packages.length+' packets';$('#rows').innerHTML=rows.map(x=>{const targets=[...x.estate_ids,...x.entity_ids,...x.organ_ids,...x.lineage_stage_ids,...x.theater_ids,...x.test_ids];return '<tr><td><b>'+esc(x.title)+'</b><br><code>'+esc(x.package_id)+'</code><br><span class="muted">'+esc(x.priority)+'</span></td><td>'+esc(x.package_class)+'</td><td class="'+(x.routing.status.includes('unresolved')?'unresolved':'')+'">'+esc(x.routing.status)+'<br><span class="muted">synthetic: '+esc(x.routing.synthetic_assignment)+'</span></td><td>'+(targets.length?pills(targets):'<span class="unresolved">unresolved</span>')+'</td><td>'+x.evidence_record_ids.map(id=>'<span class="pill">'+esc(id)+'</span>').join(' ')+'</td><td>'+esc(x.proof_question)+'</td><td>'+esc(x.falsifier)+'</td></tr>'}).join('')}
fetch('data.json').then(r=>r.json()).then(d=>{D=d;const metrics=[['Packets',d.counts.packages],['Evidence records',d.counts.evidence_records],['Entities',d.counts.entities],['Routes',d.counts.source_routes],['Unresolved locators',d.counts.source_route_states.unresolved_locator||0],['Estates',d.counts.estates],['Issue lanes',d.counts.issue_groups],['Estate handoffs',d.counts.estate_handoffs]];$('#metrics').innerHTML=metrics.map(x=>'<div class="card">'+esc(x[0])+'<strong>'+esc(x[1])+'</strong></div>').join('');for(const [id,values] of [['class',[...new Set(d.packages.map(x=>x.package_class))]],['routing',[...new Set(d.packages.map(x=>x.routing.status))]],['priority',[...new Set(d.packages.map(x=>x.priority))]]])for(const value of values.sort()){const o=document.createElement('option');o.value=value;o.textContent=value;$('#'+id).append(o)}for(const id of ['query','class','routing','priority'])$('#'+id).addEventListener('input',render);render()}).catch(err=>{$('#status').textContent='Failed to load evidence program: '+err.message});
</script></body></html>`;
writeText(`${publicBase}/index.html`, html);
console.log(JSON.stringify({ ok: true, source_fingerprint: sourceFingerprint, counts }, null, 2));
