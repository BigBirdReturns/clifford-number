#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const write=(rel,value)=>{const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value)};

const methodology=read('data/project/m05-answerable-power-methodology.json');
const registry=read('data/project/m05-answerable-power-story-registry.json');
const fanout=read('data/project/m05-answerable-power-fanout.json');

const report={
  schema_version:'m05-answerable-power-report@1',
  generated_from:[
    'data/project/m05-answerable-power-methodology.json',
    'data/project/m05-answerable-power-story-registry.json',
    'data/project/m05-answerable-power-fanout.json'
  ],
  counts:{
    stories:registry.stories.length,
    lanes:fanout.lanes.length,
    ...registry.counts
  },
  story_modes:methodology.story_modes,
  power_answer_ladder:methodology.power_answer_ladder,
  works_standard:methodology.works_standard,
  stories:registry.stories,
  lanes:fanout.lanes,
  boundaries:methodology.boundaries
};
write('reports/core-thesis/answerable-power/data.json',JSON.stringify(report,null,2)+'\n');

const esc=(value)=>String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const storyRows=registry.stories.map((story)=>`<tr><td><code>${esc(story.story_id)}</code></td><td>${esc(story.title)}</td><td><code>${esc(story.mode)}</code></td><td>${esc(story.maximum_ceiling)}</td></tr>`).join('');
const ladder=methodology.power_answer_ladder.map((row)=>`<article><h3>${esc(row.level)} · ${esc(row.name)}</h3><p>${esc(row.test)}</p></article>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M-05 Answerable Power</title><style>body{font:16px/1.55 system-ui;max-width:1280px;margin:36px auto;padding:0 22px;background:#ece9df;color:#171717}code,pre{font-family:ui-monospace,SFMono-Regular,monospace}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}article,table,pre{background:#fffdf7;border:1px solid #c9c1b2;border-radius:12px}article,pre{padding:15px}table{border-collapse:collapse;width:100%;overflow:hidden}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.state{font-weight:800;color:#08783e}</style></head><body><p><b>CLIFFORD NUMBER · M-05</b></p><h1>Story Ecology and Answerable Power</h1><p class="state">CANDIDATE CROSS-ESTATE PROGRAM</p><h2>Governing question</h2><p>${esc(methodology.governing_question)}</p><h2>Power-answer ladder</h2><div class="grid">${ladder}</div><h2>Initial story registry</h2><table><tr><th>ID</th><th>Story</th><th>Mode</th><th>Ceiling</th></tr>${storyRows}</table><h2>Boundary</h2><pre>${esc(JSON.stringify(methodology.boundaries,null,2))}</pre></body></html>`;
write('reports/core-thesis/answerable-power/index.html',html+'\n');
console.log(`build-m05-answerable-power: ${registry.stories.length} stories, ${fanout.lanes.length} lanes`);
