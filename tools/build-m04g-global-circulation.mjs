#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (rel, value) => { const p=path.join(root,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(value,null,2)+'\n'); };
const methodology = read('data/project/m04g-global-circulation-methodology.json');
const basinsDoc = read('data/project/m04g-global-circulation-basins.json');
const currentsDoc = read('data/project/m04g-global-circulation-currents.json');
const sourcesDoc = read('data/intake/m04g-global-circulation-sources-01.json');
const pollsDoc = read('data/project/m04g-global-circulation-polls.json');
const fanoutDoc = read('data/project/m04g-global-circulation-fanout.json');
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());
const hash = crypto.createHash('sha256').update(JSON.stringify({methodology,basins:basinsDoc.basins,currents:currentsDoc.currents,sources:sourcesDoc.sources,polls:pollsDoc.polls,lanes:fanoutDoc.lanes})).digest('hex');
const byClass = {};
const hosts = new Map();
for (const source of sourcesDoc.sources) {
  byClass[source.hydrology_class] = (byClass[source.hydrology_class] ?? 0) + 1;
  const host = new URL(source.entry_url).host;
  hosts.set(host, (hosts.get(host) ?? 0) + 1);
}
const basinRows = basinsDoc.basins.map((basin) => {
  const routes = sourcesDoc.sources.filter((row) => row.basin_id === basin.basin_id);
  const polls = pollsDoc.polls.filter((row) => row.basin_id === basin.basin_id);
  const classes = Object.fromEntries(['ocean_discovery','freshwater_authoritative','tributary_direct_voice','aquifer_archival_or_restricted'].map((name) => [name, routes.filter((row)=>row.hydrology_class===name).length]));
  return {
    basin_id: basin.basin_id,
    label: basin.label,
    arc: basin.arc,
    languages: basin.languages,
    route_count: routes.length,
    poll_count: polls.length,
    classes,
    unique_hosts: new Set(routes.map((row)=>new URL(row.entry_url).host)).size,
    direct_voice_routes: classes.tributary_direct_voice,
    coverage_ok: routes.length === 16 && polls.length === 8 && Object.values(classes).every((value)=>value>0),
  };
});
const sortedHosts = [...hosts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
const report = {
  schema:'m04g-global-circulation-report@1',
  program_id: methodology.program_id,
  as_of: methodology.as_of,
  fingerprint: hash,
  counts:{
    basins:basinsDoc.basins.length,
    currents:currentsDoc.currents.length,
    sources:sourcesDoc.sources.length,
    polls:pollsDoc.polls.length,
    lanes:fanoutDoc.lanes.length,
    by_class:byClass,
    unique_hosts:hosts.size,
  },
  source_diversity:{
    route_to_host_ratio:Number((hosts.size/sourcesDoc.sources.length).toFixed(4)),
    max_host_route_count:sortedHosts[0]?.[1] ?? 0,
    max_host_share:Number(((sortedHosts[0]?.[1] ?? 0)/sourcesDoc.sources.length).toFixed(4)),
    top_hosts:sortedHosts.slice(0,20).map(([host,count])=>({host,count})),
  },
  basins:basinRows,
  currents:currentsDoc.currents,
  fanout:fanoutDoc.lanes,
  coverage_gaps: basinRows.filter((row)=>!row.coverage_ok),
  boundaries: methodology.boundaries,
};
write('build/core-thesis/global-circulation/data.json', report);
write('reports/core-thesis/global-circulation/data.json', report);
const rows = basinRows.map((row)=>`<tr><td><code>${row.basin_id}</code></td><td>${row.label}</td><td>${row.route_count}</td><td>${row.poll_count}</td><td>${row.unique_hosts}</td><td>${row.coverage_ok?'PASS':'GAP'}</td></tr>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-04G global circulation</title><style>body{font:16px/1.5 system-ui;max-width:1320px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric,table,pre{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}.metric,pre{padding:15px}.metric b{display:block;font-size:1.9rem}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><p><b>CLIFFORD NUMBER · M-04G</b></p><h1>Global evidence circulation</h1><div class="metrics"><div class="metric"><b>${report.counts.basins}</b>basins</div><div class="metric"><b>${report.counts.currents}</b>currents</div><div class="metric"><b>${report.counts.sources}</b>routes</div><div class="metric"><b>${report.counts.polls}</b>polls</div><div class="metric"><b>${report.counts.unique_hosts}</b>hosts</div><div class="metric"><b>${report.source_diversity.max_host_share}</b>max host share</div></div><h2>Basin coverage</h2><table><tr><th>Basin</th><th>Label</th><th>Routes</th><th>Polls</th><th>Hosts</th><th>Coverage</th></tr>${rows}</table><h2>Boundaries</h2><pre>${JSON.stringify(report.boundaries,null,2)}</pre></body></html>`;
const htmlPath=path.join(root,'reports/core-thesis/global-circulation/index.html'); fs.mkdirSync(path.dirname(htmlPath),{recursive:true}); fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify(report.counts,null,2));
console.log('build-m04g-global-circulation: OK');
