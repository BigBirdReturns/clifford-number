#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const frontierPath = path.join(destination, 'build', 'report-frontier.json');
const htmlPath = path.join(destination, 'reports', 'index.html');
const fail = message => {
  console.error(`validate-report-frontier-pages failed: ${message}`);
  process.exit(1);
};
const read = file => fs.readFileSync(file, 'utf8');
const attributes = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]+)"`, 'g'))].map(match => match[1]);

if (!fs.existsSync(frontierPath)) fail('missing dist/build/report-frontier.json');
if (!fs.existsSync(htmlPath)) fail('missing dist/reports/index.html');

const frontier = JSON.parse(read(frontierPath));
const html = read(htmlPath);

if (frontier.schema_version !== 'report-frontier@1'
  || frontier.graph_effect !== 'none'
  || frontier.conclusion_generated !== false) fail('frontier JSON exceeds its inference boundary');
if (!html.includes('data-report-frontier-schema="report-frontier@1"')
  || !html.includes('data-graph-effect="none"')
  || !html.includes('data-conclusion-generated="false"')) fail('frontier HTML lacks schema or inference-boundary attributes');
if (html.includes('href="undefined"')) fail('frontier HTML contains an undefined route');

const caseIds = attributes(html, 'data-case-id');
const programIds = attributes(html, 'data-program-id');
const trailIds = attributes(html, 'data-trail-id');
const stageIds = attributes(html, 'data-stage');
const expectedTrailIds = (frontier.trail_programs ?? []).flatMap(program => (program.trails ?? []).map(trail => trail.trail_id));

if (caseIds.length !== frontier.cases.length || new Set(caseIds).size !== caseIds.length) fail('case row count or identity diverged');
if (programIds.length !== frontier.trail_programs.length || new Set(programIds).size !== programIds.length) fail('trail-program count or identity diverged');
if (trailIds.length !== expectedTrailIds.length || new Set(trailIds).size !== trailIds.length) fail('case-trail row count or identity diverged');
if (stageIds.length !== frontier.transition_order.length || new Set(stageIds).size !== stageIds.length) fail('transition-stage count or identity diverged');

for (const stage of frontier.transition_order) {
  if (!stageIds.includes(stage)) fail(`missing transition stage ${stage}`);
}
for (const item of frontier.cases) {
  if (!caseIds.includes(item.case_id)) fail(`missing case row ${item.case_id}`);
  if (!html.includes(`data-case-id="${item.case_id}" data-current-stage="${item.current_stage}"`)) fail(`case ${item.case_id} stage diverged`);
  if (!html.includes(`href="../#case/${item.case_id}"`)) fail(`case ${item.case_id} lacks its public route`);
  if (item.report_id && !html.includes(`href="../briefs/${item.report_id}.html"`)) fail(`case ${item.case_id} lacks its report route`);
}
for (const program of frontier.trail_programs) {
  if (!programIds.includes(program.program_id)) fail(`missing trail program ${program.program_id}`);
}
for (const trailId of expectedTrailIds) {
  if (!trailIds.includes(trailId)) fail(`missing case trail ${trailId}`);
}

const active = [...html.matchAll(/class="stage active" data-stage="([^"]+)"/g)].map(match => match[1]);
if (active.length !== 1 || active[0] !== frontier.waterline.stage) fail('active waterline stage diverged');
if (!html.includes(frontier.waterline.definition)) fail('waterline definition is absent');
if (/(?:guilt|corruption|motive|influence|risk|probability)_score/i.test(html)) fail('frontier HTML contains a prohibited person-judgment score');
if (/\branking\s*:/i.test(html)) fail('frontier HTML contains ranking output');

console.log(`validate-report-frontier-pages: OK (${caseIds.length} cases, ${programIds.length} trail programs, ${trailIds.length} case trails, waterline ${frontier.waterline.stage})`);
