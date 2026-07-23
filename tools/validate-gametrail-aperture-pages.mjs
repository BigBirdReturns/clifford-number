#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';

function fail(message) { throw new Error(`validate-gametrail-aperture-pages: ${message}`); }
function validateHtml(file, data) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) fail(`${file} is missing`);
  const html = fs.readFileSync(full, 'utf8');
  for (const token of ['Game-Trail Aperture', 'id="gametrail-data"', 'data-graph-effect="none"', 'data-conclusion-generated="false"', 'Origin estate', 'Directed estate matrix', 'Export bounded JSON', '10 prepared frontier estates']) {
    if (!html.includes(token)) fail(`${file} lacks ${token}`);
  }
  if (/<script\s+[^>]*src=/i.test(html) || /<link\s+[^>]*rel=["']stylesheet/i.test(html)) fail(`${file} is not self-contained`);
  if (/\{\{GAMETRAIL_(?:STYLE|DATA|RUNTIME)\}\}/.test(html)) fail(`${file} retains template tokens`);
  const match = html.match(/<script id="gametrail-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) fail(`${file} lacks embedded data`);
  const embedded = JSON.parse(match[1]);
  if (embedded.fingerprint !== data.fingerprint) fail(`${file} embedded fingerprint diverged`);
  if (embedded.manifest.counts.total_compiled_trails !== 308 || embedded.estates.length !== 24) fail(`${file} embedded counts diverged`);
  if (embedded.frontier_surveys?.length !== 10 || embedded.manifest.counts.frontier_survey_route_uses !== 68) fail(`${file} embedded frontier survey counts diverged`);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter(row => !/type="application\/json"/.test(row[0]));
  for (const [index, row] of scripts.entries()) {
    try { new Function(row[1]); } catch (error) { fail(`${file} script ${index + 1} does not parse: ${error.message}`); }
  }
  return html.length;
}

try {
  const data = readJson('gametrails/data.json');
  if (data.schema_version !== 'estate-game-trail-public-data@2') fail('public data schema mismatch');
  if (data.manifest.schema_version !== 'estate-game-trail-manifest@2') fail('manifest schema mismatch');
  if (data.manifest.counts.estates !== 24 || data.manifest.counts.frontier_estates !== 10) fail('estate counts diverged');
  if (data.manifest.counts.legacy_preserved_trails !== 35 || data.manifest.counts.total_compiled_trails !== 308) fail('trail counts diverged');
  if (data.frontier_surveys.length !== 10 || data.manifest.counts.frontier_survey_route_uses !== 68) fail('frontier survey counts diverged');
  if (data.frontier_surveys.some(survey => survey.preparation_state.raw_records_acquired !== 0 || survey.status !== 'surveyed_and_prepared')) fail('frontier survey boundary diverged');
  if (data.manifest.counts.legacy_trail_estate_evaluations !== 840) fail('legacy evaluation count diverged');
  if (data.overlap_matrix.rows.length !== 24 || data.overlap_matrix.directed_overlap_pairs.length !== 302) fail('overlap matrix diverged');
  if (data.interpretation_contract.graph_effect !== 'none' || data.interpretation_contract.conclusion_generated !== false) fail('interpretation boundary diverged');
  const pageBytes = validateHtml('gametrails/index.html', data);
  let standaloneBytes = null;
  if (fs.existsSync(path.join(root, 'dist/Clifford-Game-Trail-Aperture-standalone.html'))) standaloneBytes = validateHtml('dist/Clifford-Game-Trail-Aperture-standalone.html', data);
  console.log(`validate-gametrail-aperture-pages: OK (${pageBytes} page bytes${standaloneBytes ? `, ${standaloneBytes} standalone bytes` : ''})`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
