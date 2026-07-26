#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const methodology = readJson('data/project/m04g-evidence-hydrology-methodology.json');
const catchmentsDoc = readJson('data/project/m04g-evidence-hydrology-catchments.json');
const sourcesDoc = readJson('data/intake/m04g-evidence-hydrology-sources-01.json');
const pollsDoc = readJson('data/project/m04g-evidence-hydrology-pilot-polls.json');
const fanoutDoc = readJson('data/project/m04g-evidence-hydrology-fanout.json');
const governed = { methodology, catchmentsDoc, sourcesDoc, pollsDoc, fanoutDoc };
const sourceFingerprint = crypto.createHash('sha256').update(JSON.stringify(governed)).digest('hex');

const sources = sourcesDoc.sources;
const byClass = Object.fromEntries(Object.keys(methodology.hydrology_classes).map((name) => [name, 0]));
const byAutomation = {};
const byAuthority = {};
const byCatchment = Object.fromEntries(catchmentsDoc.catchments.map((row) => [row.catchment_id, 0]));
for (const source of sources) {
  byClass[source.hydrology_class] += 1;
  byAutomation[source.automation_state] = (byAutomation[source.automation_state] ?? 0) + 1;
  byAuthority[source.authority_tier] = (byAuthority[source.authority_tier] ?? 0) + 1;
  for (const catchment of source.catchments) byCatchment[catchment] += 1;
}
const pilotByClass = {};
for (const poll of pollsDoc.polls) pilotByClass[poll.hydrology_class] = (pilotByClass[poll.hydrology_class] ?? 0) + 1;

const report = {
  schema: 'm04g-evidence-hydrology-report@1',
  report_id: 'M04G-EH-REPORT-001',
  as_of: methodology.as_of,
  program_id: methodology.program_id,
  title: methodology.title,
  source_fingerprint: sourceFingerprint,
  counts: {
    catchments: catchmentsDoc.catchments.length,
    sources: sources.length,
    by_hydrology_class: byClass,
    by_authority: byAuthority,
    by_automation_state: byAutomation,
    pilot_polls: pollsDoc.polls.length,
    pilot_polls_by_class: pilotByClass,
    fanout_lanes: fanoutDoc.lanes.length,
    existing_estate_programs: 4,
  },
  hydrology_classes: methodology.hydrology_classes,
  estuary_rule: methodology.estuary_rule,
  storage_law: methodology.storage_law,
  promotion_law: methodology.promotion_law,
  catchments: catchmentsDoc.catchments.map((catchment) => ({
    ...catchment,
    source_count: byCatchment[catchment.catchment_id],
  })),
  sources,
  pilot_polls: pollsDoc.polls,
  fanout: fanoutDoc.lanes,
  connected_estates: [
    { program: 'M-04B', role: 'organism tests, organs, theaters, bridges, falsifiers, and non-links' },
    { program: 'M-04F', role: 'epistemic jurisdiction, burden, custody, counterfactual, voice, remedy, and waterline' },
    { program: 'F20-F46', role: 'Flock-like federated sensing, alert, action, evidence, exit, and benefit lanes' },
    { program: 'Pattern-to-Proof', role: 'temporal freeze, decomposition, nulls, acquisition contracts, and reconciliation' },
  ],
  current_ceiling: {
    status: 'candidate_cross_estate',
    system_claim: 'retained_candidate_only',
    inland_sea_is_complete: false,
    reason: 'Continuous source hydrology increases recall and freshness but does not close exact identities, deployments, thresholds, consequences, rights, counterfactuals, or remedies without human adjudication.',
  },
  boundaries: methodology.boundaries,
};

const rows = sources.map((source) => `
<tr>
  <td><code>${escapeHtml(source.source_id)}</code></td>
  <td>${escapeHtml(source.name)}</td>
  <td><code>${escapeHtml(source.hydrology_class)}</code></td>
  <td>${escapeHtml(source.authority_tier)}</td>
  <td>${escapeHtml(source.catchments.join(' · '))}</td>
  <td>${escapeHtml(source.automation_state)}</td>
  <td><a href="${escapeHtml(source.entry_url)}">source</a></td>
</tr>`).join('');
const catchmentCards = report.catchments.map((catchment) => `
<article>
  <h3>${escapeHtml(catchment.catchment_id)} · ${escapeHtml(catchment.label)}</h3>
  <p>${escapeHtml(catchment.question)}</p>
  <p><b>${catchment.source_count}</b> registered source routes</p>
  <p><b>Required mix:</b> ${escapeHtml(catchment.required_mix.join(' · '))}</p>
</article>`).join('');
const laneRows = report.fanout.map((lane) => `
<tr><td><code>${escapeHtml(lane.lane_id)}</code></td><td>${escapeHtml(lane.title)}</td><td>${escapeHtml(lane.catchments.join(' · '))}</td><td>${escapeHtml(lane.question)}</td></tr>`).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(report.title)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17211d;background:#e9eee9}body{max-width:1500px;margin:0 auto;padding:28px}.hero,.card,article,table{background:#fbfdf9;border:1px solid #b8c7bc;border-radius:14px}.hero,.card,article{padding:18px}.hero{border-left:7px solid #235e43}.metrics,.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.metric b{display:block;font-size:2rem}.state{font-weight:800;color:#16643a}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}pre{white-space:pre-wrap;overflow:auto}.table-wrap{overflow:auto;border-radius:14px}table{width:100%;border-collapse:collapse;background:#fbfdf9}th,td{padding:9px;border-bottom:1px solid #d9e2dc;text-align:left;vertical-align:top;font-size:.92rem}th{position:sticky;top:0;background:#edf3ee}.boundary{border-left:7px solid #8d3b2f}a{color:#145f87}</style></head>
<body>
<section class="hero"><p><b>CLIFFORD NUMBER · M-04G</b></p><h1>${escapeHtml(report.title)}</h1>
<p class="state">OCEAN DISCOVERY + FRESHWATER AUTHORITY + DIRECT-VOICE TRIBUTARIES + DEEP AQUIFERS</p>
<pre>discover → poll → snapshot → hash → normalize → deduplicate
→ resolve identity → join across independent source classes
→ acquire deeper record → adjudicate → reconcile the waterline</pre></section>
<h2>Sea capacity</h2><div class="metrics">
${Object.entries({
  'catchments': report.counts.catchments,
  'source routes': report.counts.sources,
  'ocean sources': byClass.ocean_discovery,
  'freshwater streams': byClass.freshwater_authoritative,
  'direct-voice tributaries': byClass.tributary_direct_voice,
  'archival aquifers': byClass.aquifer_archival_or_restricted,
  'pilot polls': report.counts.pilot_polls,
  'live acquisition lanes': report.counts.fanout_lanes,
}).map(([label,value]) => `<div class="card metric"><b>${value}</b>${escapeHtml(label)}</div>`).join('')}
</div>
<h2>Estuary law</h2><div class="card"><p>${escapeHtml(report.estuary_rule.description)}</p><pre>${escapeHtml(JSON.stringify(report.estuary_rule,null,2))}</pre></div>
<h2>Catchments</h2><div class="grid">${catchmentCards}</div>
<h2>Source registry</h2><div class="table-wrap"><table><thead><tr><th>ID</th><th>Source</th><th>Hydrology</th><th>Authority</th><th>Catchments</th><th>Automation</th><th>Link</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Fan-out</h2><div class="table-wrap"><table><thead><tr><th>Lane</th><th>Title</th><th>Catchments</th><th>Question</th></tr></thead><tbody>${laneRows}</tbody></table></div>
<h2>Current ceiling</h2><div class="card boundary"><pre>${escapeHtml(JSON.stringify(report.current_ceiling,null,2))}</pre><pre>${escapeHtml(JSON.stringify(report.boundaries,null,2))}</pre></div>
<p><code>source_fingerprint: ${sourceFingerprint}</code></p>
</body></html>`;

const json = JSON.stringify(report, null, 2) + '\n';
write('build/core-thesis/evidence-hydrology/data.json', json);
write('reports/core-thesis/evidence-hydrology/data.json', json);
write('reports/core-thesis/evidence-hydrology/index.html', html + '\n');
console.log(JSON.stringify(report.counts, null, 2));
console.log(`source_fingerprint ${sourceFingerprint}`);
console.log('build-m04g-evidence-hydrology: OK');
