#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib/ledger.mjs';

export const ESTATE_APERTURE_HTML = 'estates/index.html';
export const ESTATE_APERTURE_STANDALONE = 'dist/Clifford-Estate-Aperture-standalone.html';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function escapeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderEstateAperture({ write = true } = {}) {
  const data = readJson('estates/data.json');
  const template = read('src/estate-aperture-template.html');
  const css = read('src/estate-aperture.css').trim();
  const runtime = read('src/estate-aperture-runtime.js').trim();
  if (!template.includes('{{ESTATE_APERTURE_STYLE}}') || !template.includes('{{ESTATE_APERTURE_DATA}}') || !template.includes('{{ESTATE_APERTURE_RUNTIME}}')) {
    throw new Error('estate aperture template lacks one or more required tokens');
  }
  const html = template
    .replace('{{ESTATE_APERTURE_STYLE}}', `<style>\n${css}\n</style>`)
    .replace('{{ESTATE_APERTURE_DATA}}', `<script id="estate-data" type="application/json">${escapeInlineJson(data)}</script>`)
    .replace('{{ESTATE_APERTURE_RUNTIME}}', `<script>\n${runtime}\n</script>`)
    .replace('<body>', '<body data-estate-aperture-schema="estate-aperture-data@1" data-graph-effect="none" data-conclusion-generated="false">');

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/type="application\/json"/.test(match[0]))
    .map(match => match[1]);
  for (const [index, script] of scripts.entries()) {
    try { new Function(script); } catch (error) {
      throw new Error(`estate aperture inline script ${index + 1} does not parse: ${error.message}`, { cause: error });
    }
  }

  if (write) {
    const output = path.join(root, ESTATE_APERTURE_HTML);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, html);
  }
  return { data, html, output_path: ESTATE_APERTURE_HTML };
}

export function buildEstateApertureStandalone() {
  const rendered = renderEstateAperture({ write: true });
  const output = path.join(root, ESTATE_APERTURE_STANDALONE);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, rendered.html);
  return { ...rendered, standalone_path: ESTATE_APERTURE_STANDALONE };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rendered = renderEstateAperture();
  console.log(`estate aperture: ${rendered.output_path} (${rendered.data.estates.length} estates, ${rendered.data.manifest.counts.tasks} tasks)`);
}
