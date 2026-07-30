#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const outputRoot = 'reports/core-thesis/poof-clifford-ecology';
export const manifestPath = 'data/project/poof-clifford-ecology-release-manifest.json';

export const releaseScope = [
  '.github/workflows/poof-clifford-ecology.yml',
  'CORE-THESIS.md',
  'docs/README.md',
  'data/project/core-thesis.json',
  'data/project/m05-answerable-power-methodology.json',
  'data/project/m05-answerable-power-story-registry.json',
  'data/project/m05-answerable-power-fanout.json',
  'data/project/poof-clifford-ecology-contract.json',
  'data/project/poof-clifford-projection-contracts.json',
  'data/project/poof-clifford-integration-map.json',
  'data/project/poof-clifford-object-registry.json',
  'data/project/poof-clifford-aperture.json',
  'data/project/poof-clifford-constitutional-change-log.json',
  'schemas/poof-projection-manifest.schema.json',
  'schemas/poof-referral-packet.schema.json',
  'schemas/poof-comprehension-receipt.schema.json',
  'schemas/poof-publication-audit-receipt.schema.json',
  'schemas/poof-right-of-reply.schema.json',
  'test/fixtures/poof-projection-manifest.fixture.json',
  'test/fixtures/poof-referral-packet.fixture.json',
  'test/fixtures/poof-comprehension-receipt.fixture.json',
  'test/fixtures/poof-publication-audit-receipt.fixture.json',
  'test/fixtures/poof-right-of-reply.fixture.json',
  'docs/poof-clifford-ecology.md',
  'docs/methods/poof-projection-referral-law.md',
  'docs/methods/poof-operational-effect-and-amendment-law.md',
  'docs/milestones/m05-poof-clifford-ecology.md',
  'tools/build-poof-clifford-ecology.mjs',
  'tools/validate-poof-clifford-ecology.mjs',
  'tools/build-core-thesis.mjs',
  'tools/validate-core-thesis.mjs',
  'tools/validate-m05-answerable-power.mjs',
  'tools/validate-k0-epistemic-admissibility.mjs',
  'data/project/k0-epistemic-admissibility-release-manifest.json',
  'reports/core-thesis/answerable-power/k0.json',
  'reports/core-thesis/answerable-power/k0.html',
  'test/poof-clifford-ecology.test.js',
  'test/poof-clifford-ecology-browser.test.js',
  'test/core-thesis.test.js',
  'test/m05-answerable-power.test.js',
  'package.json',
  'build/core-thesis/manifest.json',
  'build/core-thesis/data.json',
  'reports/core-thesis/data.json',
  'reports/core-thesis/index.html',
  'reports/core-thesis/answerable-power/data.json',
  'reports/core-thesis/answerable-power/index.html',
  `${outputRoot}/index.html`,
  `${outputRoot}/report/index.html`,
  `${outputRoot}/reader-file/index.html`,
  `${outputRoot}/examination/index.html`,
  `${outputRoot}/estate/index.html`,
  `${outputRoot}/newsroom/index.html`,
  `${outputRoot}/methods/index.html`,
  `${outputRoot}/machine/index.html`,
  `${outputRoot}/audit/index.html`,
  `${outputRoot}/assets/site.css`,
  `${outputRoot}/assets/site.js`,
  `${outputRoot}/data.json`,
  `${outputRoot}/openapi.json`,
  `${outputRoot}/mcp-server-card.json`,
  `${outputRoot}/agent-skills.json`,
  `${outputRoot}/llms.txt`,
  `${outputRoot}/sitemap.xml`,
  `${outputRoot}/robots.txt`,
  `${outputRoot}/projection-manifest.json`
];

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function write(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}

function relHref(fromRoute, toRoute) {
  const fromDir = fromRoute === '/' ? '.' : fromRoute.replace(/^\//, '').replace(/\/$/, '');
  const toDir = toRoute === '/' ? '.' : toRoute.replace(/^\//, '').replace(/\/$/, '');
  let relative = path.posix.relative(fromDir, toDir);
  if (!relative) return './index.html';
  return `${relative}/index.html`;
}

function routeFile(route) {
  if (route === '/') return 'index.html';
  return `${route.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
}

function pills(values) {
  return `<div class="pills">${values.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join('')}</div>`;
}

function list(values) {
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`;
}

const css = `:root{color-scheme:light;--ink:#111b22;--muted:#52626e;--paper:#f3f6f7;--panel:#fff;--line:#cbd5da;--navy:#06364b;--teal:#0d6c70;--amber:#a94c09;--danger:#8a2e22;--ok:#17603c;--shadow:0 14px 42px rgba(17,27,34,.08);--radius:18px;--max:1180px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;overflow-wrap:anywhere;background:var(--paper);color:var(--ink);font:16px/1.58 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--navy);text-underline-offset:.18em}a:hover{text-decoration-thickness:2px}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #e4a52d;outline-offset:3px}.skip{position:absolute;top:-6rem;left:1rem;z-index:99;padding:.75rem 1rem;background:var(--ink);color:#fff}.skip:focus{top:1rem}.wrap{max-width:var(--max);margin:auto;padding:0 1.25rem}.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}.top .wrap{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:1rem}.brand{color:var(--ink);text-decoration:none;font-weight:900;letter-spacing:-.02em}.nav{display:flex;flex-wrap:wrap;gap:.15rem;list-style:none;margin:0;padding:0}.nav a{display:block;padding:.45rem .62rem;border-radius:999px;text-decoration:none;font-size:.86rem;font-weight:780}.nav a[aria-current=page],.nav a:hover{background:#e6eef1}.hero{padding:clamp(3.5rem,8vw,7.5rem) 0 3.8rem;background:linear-gradient(145deg,#fff 0,#edf5f6 62%,#e3ecef 100%);border-bottom:1px solid var(--line)}.eyebrow{text-transform:uppercase;letter-spacing:.11em;color:var(--amber);font-size:.75rem;font-weight:900}h1,h2,h3{line-height:1.13;letter-spacing:-.035em}h1{font-size:clamp(2.65rem,7vw,5.8rem);max-width:1040px;margin:.45rem 0 1.15rem}h2{font-size:clamp(1.75rem,4vw,3rem);margin-top:0}h3{font-size:1.22rem}.lede{max-width:850px;color:var(--muted);font-size:clamp(1.08rem,2.1vw,1.35rem)}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.6rem}.button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:.72rem 1rem;border:1px solid var(--navy);border-radius:11px;text-decoration:none;font-weight:850;background:#fff}.button.primary{background:var(--navy);color:#fff}.section{padding:clamp(2.7rem,6vw,5.2rem) 0}.section+.section{border-top:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:1rem}.card{min-width:0;grid-column:span 4;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow)}.card.wide{grid-column:span 6}.card.full{grid-column:1/-1}.card p,.muted{color:var(--muted)}.card h3:first-child{margin-top:0}.pills{display:flex;flex-wrap:wrap;gap:.35rem;margin:.6rem 0}.pill{display:inline-block;max-width:100%;overflow-wrap:anywhere;word-break:break-word;border:1px solid var(--line);border-radius:999px;padding:.22rem .55rem;background:#f7fafb;font-size:.74rem;font-weight:820}.status{font-weight:850}.status.blocked{color:var(--danger)}.status.open{color:var(--amber)}.status.safe{color:var(--ok)}.law{font-size:clamp(1.35rem,3vw,2rem);line-height:1.35;border-left:6px solid var(--teal);padding:1.2rem 1.4rem;background:#fff;border-radius:0 var(--radius) var(--radius) 0}.flow{display:grid;grid-template-columns:repeat(5,1fr);gap:.65rem;align-items:stretch}.flow>div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem}.flow .arrow{display:none}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}.table{width:100%;border-collapse:collapse;min-width:780px}.table th,.table td{text-align:left;vertical-align:top;padding:.78rem;border-bottom:1px solid var(--line)}.table th{background:#e9f0f2;font-size:.82rem}.notice{background:#fff5e8;border:1px solid #e8bc8b;border-radius:var(--radius);padding:1rem 1.15rem}.boundary{background:#101a20;color:#f3f6f7;border-radius:var(--radius);padding:1.4rem}.boundary a{color:#b7e8ee}.boundary code{color:#b7e8ee}.object{border-left:5px solid var(--navy)}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}code{overflow-wrap:anywhere;word-break:break-word}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#101a20;color:#f5f7f8;padding:1rem;border-radius:13px}.field{display:grid;gap:.35rem;margin-bottom:1rem}.field label{font-weight:820}.field input,.field textarea,.field select{width:100%;padding:.72rem;border:1px solid #9baab3;border-radius:9px;background:#fff;color:var(--ink);font:inherit}.field textarea{min-height:110px}.checks{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}.check{display:flex;gap:.5rem;align-items:flex-start;background:#f8fafb;border:1px solid var(--line);border-radius:10px;padding:.7rem}.result{margin-top:1rem;padding:1rem;border-radius:12px;background:#e8f5ef;border:1px solid #9dc7b1}.result[hidden]{display:none}.search{width:100%;max-width:520px;padding:.75rem;border:1px solid #9baab3;border-radius:10px;font:inherit;margin:0 0 1.25rem}.footer{background:#101a20;color:#f5f7f8;padding:3rem 0;margin-top:2rem}.footer a{color:#c3edf0}.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:1.5rem}.small{font-size:.86rem}.route-tree{font-size:.92rem}.route-tree li{margin:.35rem 0}@media(max-width:900px){.top{position:static}.top .wrap{flex-direction:column;align-items:flex-start;padding-top:.85rem;padding-bottom:.85rem}.card,.card.wide{grid-column:1/-1}.flow{grid-template-columns:1fr 1fr}.footer-grid{grid-template-columns:1fr}}@media(max-width:560px){h1{font-size:2.7rem}.flow,.checks{grid-template-columns:1fr}.nav a{font-size:.8rem;padding:.38rem .42rem}.actions{display:grid}.button{width:100%}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}@media print{.top,.actions,.interactive,.footer{display:none!important}body{background:#fff}.card,.flow>div{box-shadow:none}}`;

const js = `(() => {\n  const key = 'poof-reader-file-v1';\n  const q = (s, r=document) => r.querySelector(s);\n  const qa = (s, r=document) => [...r.querySelectorAll(s)];\n  const download = (name, value) => { const blob = new Blob([JSON.stringify(value, null, 2) + '\\n'], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };\n  const readForm = () => {\n    const form = q('#reader-form'); if (!form) return null;\n    return { schema_version:'poof-reader-file-local@1', role:q('#reader-role')?.value || '', objective:q('#reader-objective')?.value || '', threshold:q('#reader-threshold')?.value || '', notes:q('#reader-notes')?.value || '', operations:Object.fromEntries(qa('[data-operation]').map(el => [el.dataset.operation, el.checked])), local_only:true, inferred_motive:false };\n  };\n  const fillForm = value => { if (!value) return; const set=(id,v)=>{const el=q(id);if(el)el.value=v||''}; set('#reader-role',value.role);set('#reader-objective',value.objective);set('#reader-threshold',value.threshold);set('#reader-notes',value.notes); for(const el of qa('[data-operation]')) el.checked=Boolean(value.operations?.[el.dataset.operation]); };\n  const form = q('#reader-form'); if (form) { try { fillForm(JSON.parse(localStorage.getItem(key) || 'null')); } catch {} q('#reader-save')?.addEventListener('click', () => { localStorage.setItem(key, JSON.stringify(readForm())); const r=q('#reader-result'); r.hidden=false; r.textContent='Saved locally in this browser. No network request was made.'; }); q('#reader-export')?.addEventListener('click', () => download('poof-reader-file.json', readForm())); q('#reader-erase')?.addEventListener('click', () => { localStorage.removeItem(key); form.reset(); const r=q('#reader-result'); r.hidden=false; r.textContent='Local Reader File erased.'; }); }\n  const pg = q('#proving-ground'); if (pg) q('#prove')?.addEventListener('click', () => { const expected={claim:'bounded',receipt:'limited',counterweight:'preserve',candidate:'candidate'}; const operations={}; let correct=0; for(const [name,answer] of Object.entries(expected)){const chosen=q('[name="'+name+'"]:checked')?.value || ''; const ok=chosen===answer; operations[name]=ok?'demonstrated':'not_demonstrated'; if(ok)correct++;} const result=correct===4?'transfer_verified':'not_verified'; const receipt={schema_version:'poof-comprehension-receipt@1',receipt_id:'POOF-COMP-LOCAL-'+Date.now(),issued_at:new Date().toISOString(),participant_class:'general_reader',operations:{supportable_claim:operations.claim,receipt_boundary:operations.receipt,counterweight:operations.counterweight,next_record:'not_tested',selection_defense:'not_tested',temporal_honesty:'not_tested',candidate_status:operations.candidate,editorial_ownership:'not_tested'},transfer_case:'generic changed-case fixture',result,interpretation_contract:{does_prove:'The recorded operations were or were not demonstrated in this local exercise.',does_not_prove:'This does not establish agreement, retention, publication readiness, or underlying case truth.'},canonical_write:false,effect_contract:{evidence:'none',graph:'none',review_queue:'advisory_candidate',publication:'advisory_only',visibility:'none',ranking:'none',custody:'reader_local_or_voluntary_export'},graph_effect:'none'}; const el=q('#proof-result'); el.hidden=false; el.innerHTML='<strong>'+result.replaceAll('_',' ')+'</strong><p>'+correct+' of 4 tested operations demonstrated. The receipt stays local unless you export it.</p>'; q('#proof-export').hidden=false; q('#proof-export').onclick=()=>download('poof-comprehension-receipt.json',receipt); });\n  const ref = q('#referral-form'); if (ref) q('#referral-export')?.addEventListener('click', () => { const val=id=>q(id)?.value.trim()||''; const packet={schema_version:'poof-referral-packet@1',referral_id:'POOF-REF-LOCAL-'+Date.now(),source_jurisdiction:'Examination',exact_proposition:val('#ref-proposition'),current_evidence_ceiling:val('#ref-ceiling'),required_record_or_test:val('#ref-record'),lawful_acquisition_route:val('#ref-route'),responsible_custodian:val('#ref-custodian'),consequence_if_unresolved:val('#ref-consequence'),privacy_boundary:val('#ref-privacy'),status:'open',promotes_to:'candidate_only',effect_contract:{evidence:'none',graph:'none',review_queue:'opens_intake_review',publication:'separate_decision_required',visibility:'none',ranking:'none',custody:'intake_append_only'},graph_effect:'none'}; download('poof-referral-packet.json',packet); });\n  const search=q('#site-search'); if(search){const items=qa('[data-filter-item]'); search.addEventListener('input',()=>{const text=search.value.trim().toLowerCase();for(const item of items)item.hidden=Boolean(text&&!item.dataset.filterItem.includes(text));});}\n})();`;

function shell({ data, route, title, description, body }) {
  const nav = data.aperture.routes.map((item) => `<li><a href="${escapeHtml(relHref(route, item.path))}"${item.path === route ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a></li>`).join('');
  const rootLink = relHref(route, '/');
  const assetPrefix = route === '/' ? '' : '../'.repeat(route.replace(/^\//, '').replace(/\/$/, '').split('/').length);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | POOF × Clifford Ecology</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#06364b"><link rel="stylesheet" href="${assetPrefix}assets/site.css"></head><body><a class="skip" href="#content">Skip to content</a><header class="top"><div class="wrap"><a class="brand" href="${escapeHtml(rootLink)}">POOF × Clifford Ecology</a><nav aria-label="Primary"><ul class="nav">${nav}</ul></nav></div></header><main id="content">${body}</main><footer class="footer"><div class="wrap footer-grid"><div><strong>POOF × Clifford Ecology</strong><p>Evidence authority moves outward. Challenges move inward.</p></div><div><a href="${escapeHtml(relHref(route, '/methods/'))}">Projection and referral law</a><br><a href="${escapeHtml(relHref(route, '/audit/'))}">Release state</a></div><div><a href="${assetPrefix}data.json">Static data</a><br><a href="${assetPrefix}llms.txt">llms.txt</a></div></div></footer><script src="${assetPrefix}assets/site.js"></script></body></html>`;
}

function hero(eyebrow, title, lede, actions = '') {
  return `<section class="hero"><div class="wrap"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(lede)}</p>${actions}</div></section>`;
}

function renderRoutes(data) {
  const r8 = data.reportContracts.find((row) => row.report_type_id.startsWith('R8-'));
  const r9 = data.reportContracts.find((row) => row.report_type_id.startsWith('R9-'));
  const rootActions = data.aperture.entry_actions.map((label, index) => `<a class="button ${index === 0 ? 'primary' : ''}" href="${escapeHtml([relHref('/', '/report/'), relHref('/', '/estate/'), relHref('/', '/newsroom/'), relHref('/', '/examination/'), relHref('/', '/methods/'), relHref('/', '/examination/'), relHref('/', '/machine/')][index])}">${escapeHtml(label)}</a>`).join('');
  const jurisdictionCards = data.contract.jurisdictions.map((row) => `<article class="card" data-filter-item="${escapeHtml(`${row.label} ${row.function} ${row.may} ${row.may_not}`.toLowerCase())}"><p class="eyebrow">${escapeHtml(row.jurisdiction_id)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.function)}</p><p><strong>May:</strong> ${escapeHtml(row.may)}</p><p><strong>May not:</strong> ${escapeHtml(row.may_not)}</p></article>`).join('');
  const authority = data.contract.authority_stack.map((row) => `<div><p class="eyebrow">${escapeHtml(row.level)}</p><h3>${escapeHtml(row.label)}</h3><p>${escapeHtml(row.authority)}</p></div>`).join('');
  const objectCards = data.objects.objects.map((row) => `<article class="card object"><p class="eyebrow">${escapeHtml(row.object_id)}</p><h3>${escapeHtml(row.schema_version)}</h3><p>${escapeHtml(row.authority)}</p>${pills([`canonical write: ${row.canonical_write}`, `graph effect: ${row.graph_effect}`, `review queue: ${row.effect_contract.review_queue}`, `publication: ${row.effect_contract.publication}`, `custody: ${row.effect_contract.custody}`])}</article>`).join('');
  const rootBody = `${hero('Constitutional publication system', data.contract.governing_law.statement, 'Clifford determines what the evidence can carry. POOF determines how a reader must confront it. The Examination preserves what neither can yet resolve.', `<div class="actions">${rootActions}</div>`)}<section class="section"><div class="wrap"><p class="law">${escapeHtml(data.contract.governing_law.statement)}</p></div></section><section class="section"><div class="wrap"><h2>Four jurisdictions, one evidence authority</h2><p class="muted">POOF is not a second factual ledger. Each jurisdiction receives only the authority needed for its work.</p><input class="search" id="site-search" type="search" placeholder="Filter jurisdictions and objects" aria-label="Filter jurisdictions and objects"><div class="grid">${jurisdictionCards}${objectCards}</div></div></section><section class="section"><div class="wrap"><h2>Authority and challenge flow</h2><div class="flow">${authority}</div><div class="notice"><strong>Reverse writes are prohibited.</strong> A passage, reader state, audit score, onboarding result, or machine summary can open a referral. It cannot become evidence by repetition.</div></div></section><section class="section"><div class="wrap"><h2>Two new report contracts</h2><div class="grid"><article class="card wide"><p class="eyebrow">${escapeHtml(r8.report_type_id)}</p><h3>${escapeHtml(r8.label)}</h3><p>${escapeHtml(r8.question)}</p></article><article class="card wide"><p class="eyebrow">${escapeHtml(r9.report_type_id)}</p><h3>${escapeHtml(r9.label)}</h3><p>${escapeHtml(r9.question)}</p></article></div></div></section><section class="section"><div class="wrap"><div class="boundary"><h2>Current release boundary</h2><p><span class="status blocked">Staged, nonpublic aperture.</span> The generated site may be reviewed locally or as a workflow artifact. It may not be represented as deployed or independently audited.</p><p><code>graph_effect: none</code> · <code>conclusion_generated: false</code> · <code>project_complete: false</code></p></div></div></section>`;

  const reportRows = data.integration.report_map.map((row) => `<tr><td><code>${escapeHtml(row.integration_id)}</code></td><td>${escapeHtml(row.placement)}</td><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.purpose)}</td><td>${row.clifford_objects.map((x) => `<code>${escapeHtml(x)}</code>`).join('<br>')}</td></tr>`).join('');
  const reportBody = `${hero('POOF jurisdiction 1', 'Report', 'The linear argument is stable, but its authority remains source-addressed and bounded by projection manifests.')}<section class="section"><div class="wrap"><h2>Manuscript integration map</h2><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Placement</th><th>Label</th><th>Function</th><th>Clifford objects</th></tr></thead><tbody>${reportRows}</tbody></table></div></div></section><section class="section"><div class="wrap"><h2>R8 and R9 panels</h2><div class="grid"><article class="card wide"><p class="eyebrow">R8 · REAL STEEL</p><h3>${escapeHtml(r8.label)}</h3>${list(r8.required_panels)}</article><article class="card wide"><p class="eyebrow">R9 · Steel Mirror</p><h3>${escapeHtml(r9.label)}</h3>${list(r9.required_panels)}</article></div></div></section><section class="section"><div class="wrap"><h2>Inference and comparison firewalls</h2><div class="grid"><article class="card wide"><h3>R8 claim classes</h3>${list(data.projectionBindings.inference_firewalls['R8-epistemic-admissibility-ceiling-conversion'].claim_classes.map((row) => `${row.class_id}: ${row.definition}`))}</article><article class="card wide"><h3>R9 lawful outcomes</h3>${list(data.projectionBindings.inference_firewalls['R9-two-tier-constitution-safeguard-allocation'].permitted_outcomes)}</article></div></div></section><section class="section"><div class="wrap"><div class="notice"><strong>Mapped does not mean edited.</strong> This release records exact insertion and appendix contracts. It does not claim that the private POOF manuscript has been rewritten or publicly distributed.</div></div></section>`;

  const operationLabels = ['supportable_claim','receipt_boundary','counterweight','next_record','selection_defense','temporal_honesty','candidate_status','editorial_ownership'];
  const readerBody = `${hero('POOF jurisdiction 2', 'Reader File', 'A local, erasable record of the reader’s declared role, objective, threshold, route, inspected objects, and teach-back.')}<section class="section interactive"><div class="wrap"><h2>Declare your reading constitution</h2><form id="reader-form" class="grid"><div class="card wide"><div class="field"><label for="reader-role">Role</label><select id="reader-role"><option value="">Choose or describe below</option><option>Reporter</option><option>Editor</option><option>Researcher</option><option>Subject or affected person</option><option>General reader</option></select></div><div class="field"><label for="reader-objective">Objective</label><textarea id="reader-objective" placeholder="What are you trying to decide or understand?"></textarea></div><div class="field"><label for="reader-threshold">Evidence threshold</label><textarea id="reader-threshold" placeholder="What would justify belief, publication, action, or refusal?"></textarea></div><div class="field"><label for="reader-notes">Notes and route changes</label><textarea id="reader-notes"></textarea></div></div><div class="card wide"><h3>Evidence operations inspected</h3><div class="checks">${operationLabels.map((name) => `<label class="check"><input type="checkbox" data-operation="${name}"><span>${escapeHtml(name.replaceAll('_',' '))}</span></label>`).join('')}</div><div class="actions"><button class="button primary" id="reader-save" type="button">Save locally</button><button class="button" id="reader-export" type="button">Export JSON</button><button class="button" id="reader-erase" type="button">Erase</button></div><p id="reader-result" class="result" hidden></p></div></form></div></section><section class="section"><div class="wrap"><h2>Reader File law</h2><div class="grid">${data.integration.reader_file_map.map((row) => `<article class="card"><p class="eyebrow">${escapeHtml(row.integration_id)}</p><h3>${escapeHtml(row.label)}</h3><pre>${escapeHtml(JSON.stringify(row, null, 2))}</pre></article>`).join('')}</div></div></section>`;

  const examinationCards = data.integration.examination_map.map((row) => `<article class="card wide"><p class="eyebrow">${escapeHtml(row.proceeding_id)}</p><h3>${escapeHtml(row.title)}</h3><p><strong>Examiners:</strong> ${escapeHtml(row.examiners.join(', '))}</p><p><strong>Evidence:</strong></p>${list(row.evidence)}<p><strong>Failure route:</strong> ${escapeHtml(row.failure_route)}</p></article>`).join('');
  const examBody = `${hero('POOF jurisdiction 3', 'Examination', 'External disciplines, subject responses, counterevidence, and publication audits can compel a question to reopen without becoming facts by declaration.')}<section class="section"><div class="wrap"><h2>Proceedings 13 through 16</h2><div class="grid">${examinationCards}</div></div></section><section class="section interactive"><div class="wrap"><h2>Prepare a graph-inert referral</h2><p class="muted">This form exports a local packet. It does not submit, publish, or write to canonical data.</p><form id="referral-form" class="grid"><div class="card wide">${[['ref-proposition','Exact proposition'],['ref-ceiling','Current evidence ceiling'],['ref-record','Required record or test'],['ref-route','Lawful acquisition route']].map(([id,label]) => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}"></textarea></div>`).join('')}</div><div class="card wide">${[['ref-custodian','Responsible custodian'],['ref-consequence','Consequence if unresolved'],['ref-privacy','Privacy boundary']].map(([id,label]) => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}"></textarea></div>`).join('')}<button class="button primary" type="button" id="referral-export">Export referral packet</button></div></form></div></section>`;

  const estateBody = `${hero('POOF jurisdiction 4', 'Estate', 'Durable custody for artifacts, versions, conflicts, notices, corrections, counterfactuals, audits, and exit drills.')}<section class="section"><div class="wrap"><h2>Estate routes</h2><div class="grid">${data.integration.estate_map.map((row) => `<article class="card"><h3>${escapeHtml(row.route)}</h3><p>${escapeHtml(row.custody)}</p></article>`).join('')}</div></div></section><section class="section"><div class="wrap"><h2>Release custody</h2><div class="grid"><article class="card wide"><h3>Source authority</h3><p>Clifford canonical evidence and review state remain authoritative. The POOF manuscript source is held by exact hash for structural mapping and is not redistributed in this release.</p>${pills([data.contract.poof_source_custody.sha256, `${data.contract.poof_source_custody.bytes} bytes`, `${data.contract.poof_source_custody.chapters} chapters`])}</article><article class="card wide"><h3>Version law</h3><p>Every release preserves its source commit, generated hashes, interpretation contracts, accepted ceilings, external-audit state, and correction history. A new release never silently rewrites an old one.</p></article></div></div></section>`;

  const newsroomBody = `${hero('Newsroom entry', 'Prove the method by using it', 'A reporter owns the frame and conclusion. The ecology supplies evidence, selection defense, counterweights, open records, and a reproducible custody trail.')}<section class="section"><div class="wrap"><h2>Source relationship contract</h2><div class="grid"><article class="card"><h3>Editorial ownership</h3><p>The reporter may reject the project’s working interpretation and still use the evidence successfully.</p></article><article class="card"><h3>Evidence service</h3><p>The packet states the minimum supportable story, maximum contingent story, decisive receipts, counterweight, legal posture, and next reporting work.</p></article><article class="card"><h3>Attribution</h3><p>Public records remain public records. Attribution is requested only for original analysis, software, and unpublished reporting supplied under agreed terms.</p></article></div></div></section><section class="section interactive"><div class="wrap"><h2>Four-operation proving ground</h2><p class="muted">Generic fixture. No real person or case is being adjudicated.</p><div id="proving-ground" class="grid"><div class="card wide"><fieldset><legend><strong>1. The record supports a bounded procedural fact but not motive. What may be written?</strong></legend><label class="check"><input type="radio" name="claim" value="bounded">The bounded procedural fact with its limitation.</label><label class="check"><input type="radio" name="claim" value="motive">The actor intended the entire downstream result.</label></fieldset><fieldset><legend><strong>2. A receipt proves a name appeared in a directory. What does it establish?</strong></legend><label class="check"><input type="radio" name="receipt" value="limited">Directory appearance only.</label><label class="check"><input type="radio" name="receipt" value="coordination">Coordination with everyone listed.</label></fieldset></div><div class="card wide"><fieldset><legend><strong>3. What should happen to the strongest counterweight?</strong></legend><label class="check"><input type="radio" name="counterweight" value="preserve">Preserve it early and let it constrain the story.</label><label class="check"><input type="radio" name="counterweight" value="hide">Omit it until after publication.</label></fieldset><fieldset><legend><strong>4. An unresolved lead has no promotion record. What is it?</strong></legend><label class="check"><input type="radio" name="candidate" value="candidate">A candidate or reporting question.</label><label class="check"><input type="radio" name="candidate" value="finding">A finding.</label></fieldset><div class="actions"><button class="button primary" id="prove" type="button">Check transfer</button><button class="button" id="proof-export" type="button" hidden>Export receipt</button></div><div id="proof-result" class="result" hidden></div></div></div></div></section>`;

  const methodsBody = `${hero('Constitution and method', 'Projection is not promotion', 'The ecology adds public usability, reciprocal challenge, and machine access while leaving evidentiary authority in Clifford.')}<section class="section"><div class="wrap"><h2>One-way law</h2><p class="law">${escapeHtml(data.contract.governing_law.statement)}</p><div class="grid"><article class="card wide"><h3>Evidence authority moves outward</h3>${list(data.contract.governing_law.evidence_outward)}</article><article class="card wide"><h3>Challenges move inward</h3>${list(data.contract.governing_law.challenge_inward)}</article><article class="card full"><h3>Prohibited transformations</h3>${list(data.contract.governing_law.no_reverse_authority)}</article></div></div></section><section class="section"><div class="wrap"><h2>Operational-effect constitution</h2><p class="law">${escapeHtml(data.contract.operational_effect_law.statement)}</p><div class="grid">${data.objects.objects.map((row) => `<article class="card wide"><p class="eyebrow">${escapeHtml(row.object_id)}</p><h3>${escapeHtml(row.schema_version)}</h3>${list(Object.entries(row.effect_contract).map(([key,value]) => `${key}: ${value}`))}</article>`).join('')}</div></div></section><section class="section"><div class="wrap"><h2>Constitutional amendment law</h2><p>${escapeHtml(data.contract.constitutional_amendment_law.statement)}</p>${list(data.contract.constitutional_amendment_law.required_fields)}<p><strong>Change receipts:</strong> ${escapeHtml(String(data.constitutionalChanges.changes.length))}</p></div></section><section class="section"><div class="wrap"><h2>Five transaction schemas</h2><div class="grid">${objectCards}</div></div></section><section class="section"><div class="wrap"><h2>Hard refusals</h2><pre>POOF prose ≠ canonical fact\nreader reaction ≠ finding\nWebsiteIQ score ≠ substantive truth\nsuccessful onboarding ≠ endorsement\nREAL STEEL fixture ≠ neutral denominator\nSteel Mirror differential ≠ bad faith\nMCP narration ≠ evidence</pre></div></section>`;

  const toolRows = data.machine.mcp.tools.map((row) => `<tr><td><code>${escapeHtml(row.name)}</code></td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.authority)}</td></tr>`).join('');
  const machineBody = `${hero('Machine entry', 'Read-only, source-addressed, qualification-preserving', 'The release ships inspectable OpenAPI, MCP, agent-skill, llms, sitemap, and static-data contracts without pretending a live service exists.')}<section class="section"><div class="wrap"><div class="notice"><strong>Implementation status:</strong> contract only, not deployed. No endpoint in this artifact accepts canonical writes.</div><h2>Future MCP tool contract</h2><div class="table-wrap"><table class="table"><thead><tr><th>Tool</th><th>Purpose</th><th>Authority</th></tr></thead><tbody>${toolRows}</tbody></table></div><div class="actions"><a class="button" href="../openapi.json">OpenAPI</a><a class="button" href="../mcp-server-card.json">MCP card</a><a class="button" href="../agent-skills.json">Agent skills</a><a class="button" href="../llms.txt">llms.txt</a></div></div></section>`;

  const auditBody = `${hero('Release and audit', 'A built aperture is not a deployed or approved publication', 'This route exposes the source commit, exact release boundaries, external dependencies, and the audit work that must occur after a real public deployment.')}<section class="section"><div class="wrap"><h2>Current state</h2><div class="grid"><article class="card wide"><h3>Built now</h3>${list(['ecology constitution','R8 and R9','M05-S15 and A18','five object schemas','static review aperture','OpenAPI and MCP contracts','deterministic manifest','validator and adversarial tests'])}</article><article class="card wide"><h3>Still open</h3>${list(['public publication allowlist','real origin deployment','external WebsiteIQ re-audit','human cold-reader sessions','external second-party review','right-of-reply transactions','substantive referral adjudication'])}</article><article class="card full"><h3>Base custody</h3><p><code>${escapeHtml(data.contract.source_repository.base_commit)}</code></p><p>POOF source hash: <code>${escapeHtml(data.contract.poof_source_custody.sha256)}</code></p></article></div></div></section><section class="section"><div class="wrap"><div class="boundary"><h2>Interpretation boundary</h2>${list(Object.entries(data.contract.boundaries).map(([key, value]) => `${key}: ${value}`))}</div></div></section>`;

  return new Map([
    ['/', shell({ data, route: '/', title: 'Ecology', description: data.contract.governing_law.statement, body: rootBody })],
    ['/report/', shell({ data, route: '/report/', title: 'Report', description: 'POOF manuscript integration and report projection contracts.', body: reportBody })],
    ['/reader-file/', shell({ data, route: '/reader-file/', title: 'Reader File', description: 'Local, erasable reader constitution and comprehension record.', body: readerBody })],
    ['/examination/', shell({ data, route: '/examination/', title: 'Examination', description: 'External proceedings and graph-inert referral preparation.', body: examBody })],
    ['/estate/', shell({ data, route: '/estate/', title: 'Estate', description: 'Durable artifact, version, correction, and release custody.', body: estateBody })],
    ['/newsroom/', shell({ data, route: '/newsroom/', title: 'Newsroom', description: 'Evidence-operation onboarding and source relationship contract.', body: newsroomBody })],
    ['/methods/', shell({ data, route: '/methods/', title: 'Method', description: 'One-way projection and referral law.', body: methodsBody })],
    ['/machine/', shell({ data, route: '/machine/', title: 'Machine', description: 'Static read-only machine interface contracts.', body: machineBody })],
    ['/audit/', shell({ data, route: '/audit/', title: 'Audit', description: 'Release state, accepted ceilings, and external audit requirements.', body: auditBody })]
  ]);
}

function buildMachineContracts(data) {
  const base = data.contract.publication_state.public_root_target;
  const effectContract = { evidence:'none', graph:'none', review_queue:'none', publication:'none', visibility:'none', ranking:'none', custody:'none' };
  const openapi = {
    openapi: '3.1.0',
    info: { title: 'POOF × Clifford Ecology static query contract', version: '1.0.0', description: 'Contract-only read interface. No live API is deployed by this release.' },
    servers: [],
    paths: {
      '/data.json': { get: { summary: 'Retrieve the complete static ecology data product', responses: { 200: { description: 'Static JSON artifact' } } } },
      '/projection-manifest.json': { get: { summary: 'Retrieve the projection manifest', responses: { 200: { description: 'Projection custody and interpretation contract' } } } },
      '/release-manifest.json': { get: { summary: 'Retrieve the exact-byte release manifest', responses: { 200: { description: 'Release custody' } } } },
      '/openapi.json': { get: { summary: 'Retrieve this contract', responses: { 200: { description: 'OpenAPI document' } } } }
    },
    'x-implementation-status': 'contract_only_not_deployed',
    'x-canonical-write': false,
    'x-graph-effect': 'none',
    'x-effect-contract': effectContract
  };
  const tools = [
    { name: 'get_ecology_contract', description: 'Return the one-way authority, jurisdiction, object, and release law.', authority: 'methodological projection only' },
    { name: 'get_report_contract', description: 'Return R8 or R9 from the core-thesis contract with panels and boundaries.', authority: 'core-thesis report contract' },
    { name: 'get_projection_manifest', description: 'Return source release, object IDs, qualification, review state, and artifact hash.', authority: 'projection custody only' },
    { name: 'get_examination_proceeding', description: 'Return a POOF proceeding and its referral route.', authority: 'open question and test contract only' },
    { name: 'get_release_manifest', description: 'Return exact-byte release custody.', authority: 'reproducibility, not factual truth' },
    { name: 'prepare_referral_template', description: 'Return a blank graph-inert referral packet without writing it.', authority: 'candidate-only template' }
  ];
  const mcp = {
    schema_version: 'mcp-server-card@1',
    name: 'POOF × Clifford Ecology',
    description: 'Read-only, source-addressed ecology query contract.',
    version: '1.0.0',
    implementation_status: 'contract_only_not_deployed',
    transport: null,
    endpoint: null,
    tools,
    canonical_write: false,
    graph_effect: 'none',
    effect_contract: effectContract,
    interpretation_contract: 'Tool output may summarize only from source-addressed projections and must retain qualification, review state, and release custody.'
  };
  const skills = {
    schema_version: 'agent-skills-index@1',
    implementation_status: 'contract_only_not_deployed',
    skills: [
      { id: 'inspect-one-decision', label: 'Inspect one bounded decision', inputs: ['projection_id'], output: 'source-addressed decision file' },
      { id: 'test-one-claim', label: 'Test one claim against receipts and counterweights', inputs: ['claim_id'], output: 'evidence boundary and open records' },
      { id: 'prepare-one-referral', label: 'Prepare a graph-inert referral', inputs: ['exact proposition','current ceiling','required record'], output: 'poof-referral-packet@1' }
    ],
    writes_to_canonical: false,
    effect_contract: effectContract
  };
  const llms = `# POOF × Clifford Ecology\n\nStatus: staged review aperture, not a deployed public service.\n\nGoverning law: ${data.contract.governing_law.statement}\n\nCanonical evidence authority remains in Clifford. This site is a generated publication projection. Do not infer coordination from co-presence, promote a candidate to a finding, use later evidence to establish earlier knowledge, treat source failure as absence, or detach an interpretation boundary.\n\nPrimary static resources:\n- ${base}data.json\n- ${base}projection-manifest.json\n- ${base}release-manifest.json\n- ${base}openapi.json\n- ${base}mcp-server-card.json\n\nA machine interface contract is present. No live MCP or API endpoint is deployed by this release.\n`;
  return { openapi, mcp, skills, llms, tools };
}

export function computeReleaseManifest(root = moduleRoot) {
  const entries = releaseScope.map((relative) => {
    const data = fs.readFileSync(path.join(root, relative));
    return { path: relative, sha256: sha256(data), bytes: data.length };
  });
  return {
    schema_version: 'poof-clifford-ecology-release-manifest@1',
    ecology_id: 'poof-clifford-constitutional-publication-ecology',
    as_of: '2026-07-29',
    source_base_commit: 'fdc13faf46e9a4ea273d7dce3d656b8e36d21844',
    hash_mode: 'sha256_exact_bytes',
    scope_ordered: true,
    self_included: false,
    entries,
    combined_sha256: sha256(entries.map((row) => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')),
    boundaries: {
      exact_bytes_prove_substantive_truth: false,
      generated_site_proves_deployment: false,
      projection_manifest_proves_independent_review: false,
      machine_contract_proves_live_service: false,
      graph_effect: 'none',
      project_complete: false
    }
  };
}

export function buildPoofCliffordEcology({ root = moduleRoot, writeFiles = true } = {}) {
  const contract = readJson(root, 'data/project/poof-clifford-ecology-contract.json');
  const projectionBindings = readJson(root, 'data/project/poof-clifford-projection-contracts.json');
  const integration = readJson(root, 'data/project/poof-clifford-integration-map.json');
  const objects = readJson(root, 'data/project/poof-clifford-object-registry.json');
  const aperture = readJson(root, 'data/project/poof-clifford-aperture.json');
  const constitutionalChanges = readJson(root, 'data/project/poof-clifford-constitutional-change-log.json');
  const core = readJson(root, 'data/project/core-thesis.json');
  const storyRegistry = readJson(root, 'data/project/m05-answerable-power-story-registry.json');
  const fanout = readJson(root, 'data/project/m05-answerable-power-fanout.json');
  const k0 = readJson(root, 'data/project/k0-epistemic-admissibility-methodology.json');
  const reportContracts = core.report_contracts.filter((row) => projectionBindings.report_type_ids.includes(row.report_type_id));
  const machine = buildMachineContracts({ contract, aperture });
  const data = {
    schema_version: 'poof-clifford-ecology-data@1',
    contract,
    projectionBindings,
    integration,
    objects,
    aperture,
    constitutionalChanges,
    reportContracts,
    crosswalk: {
      k0: { layer_id: k0.layer_id, definition: k0.definition, story_id: k0.ecosystem_wiring.story_id },
      steel_mirror: storyRegistry.stories.find((row) => row.story_id === 'M05-S15'),
      steel_mirror_lane: fanout.lanes.find((row) => row.lane_id === 'A18')
    },
    machine: { openapi: machine.openapi, mcp: machine.mcp, skills: machine.skills },
    counts: {
      jurisdictions: contract.jurisdictions.length,
      transaction_objects: objects.objects.length,
      report_contracts: reportContracts.length,
      report_integrations: integration.report_map.length,
      reader_file_surfaces: integration.reader_file_map.length,
      examination_proceedings: integration.examination_map.length,
      estate_routes: integration.estate_map.length,
      aperture_routes: aperture.routes.length
    },
    boundaries: contract.boundaries
  };

  if (!writeFiles) return { data, machine };
  const out = path.join(root, outputRoot);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
  write(root, `${outputRoot}/assets/site.css`, `${css}\n`);
  write(root, `${outputRoot}/assets/site.js`, `${js}\n`);
  write(root, `${outputRoot}/data.json`, stable(data));
  const routes = renderRoutes(data);
  for (const [route, html] of routes) write(root, `${outputRoot}/${routeFile(route)}`, html);
  write(root, `${outputRoot}/openapi.json`, stable(machine.openapi));
  write(root, `${outputRoot}/mcp-server-card.json`, stable(machine.mcp));
  write(root, `${outputRoot}/agent-skills.json`, stable(machine.skills));
  write(root, `${outputRoot}/llms.txt`, machine.llms);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${aperture.routes.map((row) => `  <url><loc>${escapeHtml(`${aperture.publication.target_origin.replace(/\/$/, '')}${row.path}`)}</loc><lastmod>${contract.as_of}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  write(root, `${outputRoot}/sitemap.xml`, sitemap);
  write(root, `${outputRoot}/robots.txt`, 'User-agent: *\nDisallow: /\n');
  const indexBytes = fs.readFileSync(path.join(out, 'index.html'));
  const projectionManifest = {
    schema_version: 'poof-projection-manifest@1',
    projection_id: 'POOF-PROJ-ECOLOGY-001',
    projection_kind: 'examination_exhibit',
    source_release: `clifford-number@${contract.source_repository.base_commit}`,
    source_commit: contract.source_repository.base_commit,
    source_objects: { claim_ids: [], event_ids: [], receipt_ids: [] },
    selection_contract: {
      bounded_universe_ref: 'data/project/poof-clifford-ecology-contract.json#jurisdictions-and-transaction-objects',
      candidate_set_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      candidate_set_hash_mode: 'sha256_stable_source_object_ids',
      candidate_count: 0,
      included_count: 0,
      inclusion_rule: 'Include the complete staged methodological architecture and no substantive case proposition.',
      exclusion_rule: 'Exclude canonical case assertions and private manuscript prose from this architecture-only exhibit.',
      ordering_rule: 'Render the declared route, jurisdiction, object, and report-contract order deterministically.',
      truncation_rule: 'Do not truncate the declared methodological architecture.',
      missingness_statement: 'No substantive candidate evidence universe is asserted by this architecture-only projection.',
      counterevidence_ids: [],
      null_result_policy: 'publish_explicit_null',
      override_receipt_ids: [],
      compression_disclosure: 'This release compresses repository methodology into a review aperture; it does not compress or adjudicate a substantive case universe.'
    },
    qualification_state: 'open_record',
    review_state: 'review_required',
    generated_artifact: { path: `${outputRoot}/index.html`, sha256: sha256(indexBytes) },
    interpretation_contract: {
      what_this_is: 'A deterministic methodological and publication-architecture projection joining POOF jurisdictions to Clifford evidence and referral law.',
      what_this_is_not: 'A substantive case finding, approved public edition, deployed service, independent review, or canonical evidence source.'
    },
    effect_contract: { evidence:'none', graph:'none', review_queue:'none', publication:'binds_projection_custody', visibility:'none', ranking:'none', custody:'release_attached' },
    graph_effect: 'none'
  };
  write(root, `${outputRoot}/projection-manifest.json`, stable(projectionManifest));
  const manifest = computeReleaseManifest(root);
  write(root, manifestPath, stable(manifest));
  write(root, `${outputRoot}/release-manifest.json`, stable(manifest));
  return { data, machine, projectionManifest, manifest, routes: [...routes.keys()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildPoofCliffordEcology();
  console.log(`build-poof-clifford-ecology: ${result.data.counts.aperture_routes} routes, ${result.data.counts.transaction_objects} transaction objects, ${result.data.counts.report_contracts} report contracts`);
}
