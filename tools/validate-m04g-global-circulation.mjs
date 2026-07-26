#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const fail=(message)=>{throw new Error(message)};
const methodology=read('data/project/m04g-global-circulation-methodology.json');
const basins=read('data/project/m04g-global-circulation-basins.json').basins;
const currents=read('data/project/m04g-global-circulation-currents.json').currents;
const sources=read('data/intake/m04g-global-circulation-sources-01.json').sources;
const polls=read('data/project/m04g-global-circulation-polls.json').polls;
const lanes=read('data/project/m04g-global-circulation-fanout.json').lanes;
const report=read('reports/core-thesis/global-circulation/data.json');
if (basins.length!==12) fail(`expected 12 basins, got ${basins.length}`);
if (currents.length!==8) fail(`expected 8 currents, got ${currents.length}`);
if (sources.length!==192) fail(`expected 192 sources, got ${sources.length}`);
if (polls.length!==96) fail(`expected 96 polls, got ${polls.length}`);
if (lanes.length!==20) fail(`expected 20 lanes, got ${lanes.length}`);
const unique=(rows,key)=>new Set(rows.map((row)=>row[key]));
if (unique(sources,'source_id').size!==sources.length) fail('duplicate source ids');
if (unique(polls,'poll_id').size!==polls.length) fail('duplicate poll ids');
if (unique(lanes,'lane_id').size!==lanes.length) fail('duplicate lane ids');
const sourceById=new Map(sources.map((row)=>[row.source_id,row]));
const expected={ocean_discovery:2,freshwater_authoritative:8,tributary_direct_voice:3,aquifer_archival_or_restricted:3};
for (const basin of basins) {
  const rows=sources.filter((row)=>row.basin_id===basin.basin_id);
  if (rows.length!==16) fail(`${basin.basin_id}: expected 16 sources`);
  for (const [klass,count] of Object.entries(expected)) if (rows.filter((row)=>row.hydrology_class===klass).length!==count) fail(`${basin.basin_id}: ${klass} count`);
  const basinPolls=polls.filter((row)=>row.basin_id===basin.basin_id);
  if (basinPolls.length!==8) fail(`${basin.basin_id}: expected 8 polls`);
  if (new Set(rows.map((row)=>new URL(row.entry_url).host)).size<8) fail(`${basin.basin_id}: source host monoculture`);
  if (basin.languages.length<2) fail(`${basin.basin_id}: insufficient language coverage`);
}
for (const poll of polls) {
  const source=sourceById.get(poll.source_id); if(!source) fail(`${poll.poll_id}: unknown source`);
  if (source.basin_id!==poll.basin_id) fail(`${poll.poll_id}: basin mismatch`);
  if (!['ocean_discovery','freshwater_authoritative','aquifer_archival_or_restricted'].includes(source.hydrology_class)) fail(`${poll.poll_id}: direct voice may not be automatically polled`);
  if (!poll.request.url.startsWith('https://')) fail(`${poll.poll_id}: HTTPS required`);
  if (poll.translation_policy.automatic_translation!==false) fail(`${poll.poll_id}: automatic translation must remain off`);
}
for (const source of sources) {
  if (!source.entry_url.startsWith('https://')) fail(`${source.source_id}: HTTPS required`);
  if (source.hydrology_class==='tributary_direct_voice' && source.automation_state!=='manual_privacy_review') fail(`${source.source_id}: voice boundary`);
  if (!['locator_only','candidate_only'].includes(source.promotion_ceiling)) fail(`${source.source_id}: invalid ceiling`);
}
if (report.coverage_gaps.length!==0) fail('coverage gaps remain');
if (report.counts.unique_hosts<100) fail(`expected >=100 unique hosts, got ${report.counts.unique_hosts}`);
if (report.source_diversity.max_host_share>0.08) fail(`host concentration too high: ${report.source_diversity.max_host_share}`);
for (const [key,value] of Object.entries(methodology.boundaries)) {
  if (key==='status' || key==='promotes_to' || key==='graph_effect') continue;
  if (value!==false) fail(`boundary ${key} must remain false`);
}
console.log('validate-m04g-global-circulation: OK');
