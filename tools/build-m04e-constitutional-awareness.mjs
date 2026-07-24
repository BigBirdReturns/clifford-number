#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const write = (rel, value) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const writeJson = (rel, value) => write(rel, `${JSON.stringify(value, null, 2)}\n`);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const methodologyPath = 'data/project/m04e-constitutional-awareness-methodology.json';
const wavePath = 'data/intake/m04e-constitutional-awareness-estate-wave-01.json';
const estatePath = 'data/project/m04e-constitutional-awareness-estate.json';
const methodologyText = read(methodologyPath);
const waveText = read(wavePath);
const estateText = read(estatePath);
const methodology = JSON.parse(methodologyText);
const wave = JSON.parse(waveText);
const estate = JSON.parse(estateText);

const subjects = new Map(wave.subjects.map(item => [item.subject_id, item]));
const sources = new Map(wave.source_registry.map(item => [item.source_id, item]));
const classes = new Map(methodology.class_catalog.map(item => [item.class_id, item]));
const positions = new Map(methodology.axes.constitutional_position.map(item => [item.position_id, item]));
const awareness = new Map(methodology.axes.awareness_level.map(item => [item.awareness_id, item]));
const orientations = new Map(methodology.axes.orientation.map(item => [item.orientation_id, item]));
const powers = new Map(methodology.axes.effective_power_level.map(item => [item.power_id, item]));
const materials = new Map(methodology.axes.material_relation.map(item => [item.material_id, item]));

const records = wave.records.map(record => ({
  ...record,
  subject_rows: record.subject_ids.map(id => subjects.get(id)),
  source_rows: record.source_ids.map(id => sources.get(id)),
  classification: {
    ...record.classification,
    class_rows: record.classification.class_ids.map(id => classes.get(id)),
    position_rows: record.classification.constitutional_position_ids.map(id => positions.get(id)),
    awareness_row: awareness.get(record.classification.awareness_id),
    orientation_row: orientations.get(record.classification.orientation_id),
    power_row: powers.get(record.classification.effective_power_id),
    material_rows: record.classification.material_relation_ids.map(id => materials.get(id)),
  },
}));

const fingerprint = hash([methodologyText, waveText, estateText].join('\n---\n'));
const report = {
  schema_version: 'm04e-constitutional-awareness-report@1',
  report_id: 'M04E-CAR-001',
  as_of: estate.as_of,
  estate_id: estate.estate_id,
  source_fingerprint: fingerprint,
  source_files: [methodologyPath, wavePath, estatePath],
  counts: estate.counts,
  current_ceiling: estate.current_ceiling,
  most_informative_results: estate.most_informative_results,
  required_layers: estate.required_layers,
  next_sequence: estate.next_sequence,
  methodology: {
    unit_of_analysis: methodology.unit_of_analysis,
    research_question: methodology.research_question,
    assignment_law: methodology.assignment_law,
    axes: methodology.axes,
    class_catalog: methodology.class_catalog,
  },
  systems: estate.system_chains,
  subjects: wave.subjects,
  sources: wave.source_registry,
  records,
  boundaries: estate.boundaries,
};

writeJson('build/core-thesis/constitutional-awareness/manifest.json', {
  schema_version: 'm04e-constitutional-awareness-build@1',
  estate_id: estate.estate_id,
  as_of: estate.as_of,
  source_fingerprint: fingerprint,
  counts: estate.counts,
  report_paths: [
    'reports/core-thesis/constitutional-awareness/data.json',
    'reports/core-thesis/constitutional-awareness/index.html',
  ],
  source_files: report.source_files,
  boundaries: estate.boundaries,
});
writeJson('build/core-thesis/constitutional-awareness/class-matrix.json', {
  schema_version: 'm04e-class-matrix@1',
  estate_id: estate.estate_id,
  axes: methodology.axes,
  classes: methodology.class_catalog,
  records: wave.records.map(record => ({
    record_id: record.record_id,
    subject_ids: record.subject_ids,
    system_scope: record.system_scope,
    classification: record.classification,
    disposition: record.disposition,
  })),
  boundaries: estate.boundaries,
});
writeJson('reports/core-thesis/constitutional-awareness/data.json', report);

const options = (items, idKey, labelKey = idKey) => items.map(item => `<option value="${esc(item[idKey])}">${esc(item[labelKey] ?? item[idKey])}</option>`).join('');
const systemCards = estate.system_chains.map(system => {
  const rows = Object.entries(system.coverage).map(([layer, state]) => `<tr><th>${esc(layer.replaceAll('_', ' '))}</th><td>${esc(state)}</td></tr>`).join('');
  return `<details class="system"><summary>${esc(system.system_id)}</summary><table>${rows}</table></details>`;
}).join('');
const classCards = methodology.class_catalog.map(item => `<article class="class-card"><h3>${esc(item.class_id)}</h3><p>${esc(item.assignability)}</p><p><b>Positions:</b> ${item.default_positions.map(esc).join(' · ')}</p><p><b>Awareness:</b> ${item.awareness_range.map(esc).join(' · ')}</p><p><b>Orientation:</b> ${item.orientation_range.map(esc).join(' · ')}</p></article>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Constitutional class, awareness, and counterpower</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#181714;background:#f1eee5;--panel:#fffdf7;--ink:#181714;--muted:#69645a;--line:#cfc8b8;--accent:#8a2c24}*{box-sizing:border-box}body{margin:0}.shell{max-width:1580px;margin:auto;padding:28px}.kicker{font:700 12px ui-monospace,SFMono-Regular,monospace;letter-spacing:.14em;text-transform:uppercase}.lede{max-width:1050px;font-size:1.12rem;line-height:1.6}.boundary{border-left:5px solid var(--accent);padding:14px 18px;background:var(--panel);margin:24px 0}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin:24px 0}.metric,.panel,.class-card,.system{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:15px}.metric strong{display:block;font-size:2rem}.metric span{color:var(--muted)}.controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:20px 0}.controls input,.controls select{width:100%;padding:9px 10px;border:1px solid #aaa;border-radius:8px;background:#fff;font:inherit}.table-wrap{overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px}table{border-collapse:collapse;width:100%;font-size:.84rem}th,td{border-bottom:1px solid #e9e4d9;padding:8px 9px;text-align:left;vertical-align:top}thead th{position:sticky;top:0;background:#e9e4d9;z-index:1}.pill{display:inline-block;border:1px solid #bdb5a4;border-radius:999px;padding:2px 7px;margin:1px;font-size:.73rem;background:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.class-card p{font-size:.86rem;color:var(--muted)}details summary{cursor:pointer;font-weight:700}.system table{margin-top:12px}.system th{width:42%}.warning{color:var(--accent);font-weight:800}.hidden{display:none!important}@media(max-width:700px){.shell{padding:16px}table{font-size:.75rem}}
</style></head><body><main class="shell">
<p class="kicker">M-04E · candidate cross-estate</p><h1>Constitutional class, awareness, and counterpower</h1>
<p class="lede">This view separates five dimensions that ordinary network maps collapse: constitutional position, demonstrated awareness, orientation, material relation, and effective power. Its unit is <code>${esc(methodology.unit_of_analysis)}</code>. A position is not a mental state; criticism is not counterpower; resource contribution is not sovereignty.</p>
<div class="boundary"><b>Current result:</b> ${esc(estate.current_ceiling.constitutional_form)}. <span class="warning">Represented-subject records with direct subject voice: ${estate.counts.represented_records_with_direct_subject_voice}.</span> Missing voice is a custody deficit, never proof of ignorance, passivity, or consent.</div>
<section class="metrics" id="metrics"></section>
<section class="panel"><h2>What the first pass learned</h2><ul>${estate.most_informative_results.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
<h2>Six bounded system cross-sections</h2><div class="grid">${systemCards}</div>
<h2>Record explorer</h2>
<div class="controls"><input id="q" placeholder="Search proposition, system, subject…"><select id="class"><option value="">All classes</option>${options(methodology.class_catalog,'class_id')}</select><select id="position"><option value="">All positions</option>${options(methodology.axes.constitutional_position,'position_id')}</select><select id="awareness"><option value="">All awareness states</option>${options(methodology.axes.awareness_level,'awareness_id')}</select><select id="orientation"><option value="">All orientations</option>${options(methodology.axes.orientation,'orientation_id')}</select><select id="power"><option value="">All power levels</option>${options(methodology.axes.effective_power_level,'power_id')}</select><select id="disposition"><option value="">All dispositions</option>${[...new Set(wave.records.map(x=>x.disposition))].sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
<div class="table-wrap"><table><thead><tr><th>Record</th><th>System / proposition</th><th>Subjects</th><th>Class</th><th>Position</th><th>Awareness / orientation / power</th><th>Material relation</th><th>Voice</th><th>Disposition</th></tr></thead><tbody id="rows"></tbody></table></div>
<h2>Class catalog</h2><div class="grid">${classCards}</div>
<h2>Next acquisition sequence</h2><ol>${estate.next_sequence.map(x=>`<li><code>${esc(x)}</code></li>`).join('')}</ol>
<div class="boundary"><code>promotes_to: candidate_only · graph_effect: none · conclusion_generated: false · estate_completion_claimed: false</code></div>
</main><script>
const REPORT=${JSON.stringify(report).replaceAll('<','\\u003c')};
const $=id=>document.getElementById(id);const pills=xs=>(xs||[]).map(x=>'<span class="pill">'+x+'</span>').join('');
const metricRows=[['Records',REPORT.counts.records],['Subjects',REPORT.counts.subjects],['Sources',REPORT.counts.sources],['Systems',REPORT.counts.systems],['Represented records',REPORT.counts.represented_records],['Direct represented voice',REPORT.counts.represented_records_with_direct_subject_voice]];
$('metrics').innerHTML=metricRows.map(([k,v])=>'<div class="metric"><strong>'+v+'</strong><span>'+k+'</span></div>').join('');
function render(){const q=$('q').value.toLowerCase(),c=$('class').value,p=$('position').value,a=$('awareness').value,o=$('orientation').value,pw=$('power').value,d=$('disposition').value;const rows=REPORT.records.filter(r=>{const blob=JSON.stringify(r).toLowerCase();return(!q||blob.includes(q))&&(!c||r.classification.class_ids.includes(c))&&(!p||r.classification.constitutional_position_ids.includes(p))&&(!a||r.classification.awareness_id===a)&&(!o||r.classification.orientation_id===o)&&(!pw||r.classification.effective_power_id===pw)&&(!d||r.disposition===d)});$('rows').innerHTML=rows.map(r=>'<tr><td><code>'+r.record_id+'</code></td><td><b>'+r.system_scope+'</b><br>'+r.proposition+'</td><td>'+r.subject_rows.map(x=>x?.label||'missing').join('<br>')+'</td><td>'+pills(r.classification.class_ids)+'</td><td>'+pills(r.classification.constitutional_position_ids)+'</td><td>'+pills([r.classification.awareness_id,r.classification.orientation_id,r.classification.effective_power_id])+'</td><td>'+pills(r.classification.material_relation_ids)+'</td><td>'+r.classification.voice_basis+'</td><td><code>'+r.disposition+'</code></td></tr>').join('')}
['q','class','position','awareness','orientation','power','disposition'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',render));render();
</script></body></html>`;
write('reports/core-thesis/constitutional-awareness/index.html', html);
console.log(`m04e build: ${records.length} records, ${wave.subjects.length} subjects, ${wave.source_registry.length} sources; ${fingerprint.slice(0, 12)}`);
