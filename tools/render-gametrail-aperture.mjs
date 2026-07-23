#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';

export const GAMETRAIL_APERTURE_HTML = 'gametrails/index.html';
export const GAMETRAIL_APERTURE_STANDALONE = 'dist/Clifford-Game-Trail-Aperture-standalone.html';

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function escapeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderGametrailAperture({ write = true } = {}) {
  const data = readJson('gametrails/data.json');
  const template = read('src/gametrail-aperture-template.html');
  const css = read('src/gametrail-aperture.css').trim();
  const runtime = read('src/gametrail-aperture-runtime.js').trim();
  for (const token of ['{{GAMETRAIL_STYLE}}', '{{GAMETRAIL_DATA}}', '{{GAMETRAIL_RUNTIME}}']) {
    if (!template.includes(token)) throw new Error(`game-trail aperture template lacks ${token}`);
  }
  const html = template
    .replace('{{GAMETRAIL_STYLE}}', () => `<style>\n${css}\n</style>`)
    .replace('{{GAMETRAIL_DATA}}', () => `<script id="gametrail-data" type="application/json">${escapeInlineJson(data)}</script>`)
    .replace('{{GAMETRAIL_RUNTIME}}', () => `<script>\n${runtime}\n</script>`)
    .replace('<body>', '<body data-gametrail-aperture-schema="estate-game-trail-public-data@2" data-graph-effect="none" data-conclusion-generated="false">');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/type="application\/json"/.test(match[0]))
    .map(match => match[1]);
  for (const [index, script] of scripts.entries()) {
    try { new Function(script); } catch (error) { throw new Error(`game-trail aperture inline script ${index + 1} does not parse: ${error.message}`, { cause: error }); }
  }
  if (write) {
    const output = path.join(root, GAMETRAIL_APERTURE_HTML);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, html);
  }
  return { data, html, output_path: GAMETRAIL_APERTURE_HTML };
}

export function buildGametrailApertureStandalone() {
  const rendered = renderGametrailAperture({ write: true });
  const output = path.join(root, GAMETRAIL_APERTURE_STANDALONE);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, rendered.html);
  return { ...rendered, standalone_path: GAMETRAIL_APERTURE_STANDALONE };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rendered = renderGametrailAperture();
  console.log(`game-trail aperture: ${rendered.output_path} (${rendered.data.manifest.counts.total_compiled_trails} trails, ${rendered.data.estates.length} estates)`);
}
