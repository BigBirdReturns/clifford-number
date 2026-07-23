#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { renderEstateAperture } from './render-estate-aperture.mjs';
import { root } from './lib/ledger.mjs';

const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const rendered = renderEstateAperture({ write: false });
const committedPath = path.join(root, 'estates/index.html');
check(fs.existsSync(committedPath), 'estates/index.html missing');
const committed = fs.existsSync(committedPath) ? fs.readFileSync(committedPath, 'utf8') : '';
check(committed === rendered.html, 'committed Estate Aperture HTML drifted from renderer');
check(/data-estate-aperture-schema="estate-aperture-data@1"/.test(committed), 'Estate Aperture schema marker missing');
check(/data-graph-effect="none"/.test(committed), 'Estate Aperture graph boundary missing');
check(/data-conclusion-generated="false"/.test(committed), 'Estate Aperture conclusion boundary missing');
check(/Four semantic levels/.test(committed), 'Estate Aperture semantic-level explanation missing');
check(/Closing the fan-out pass does not complete an estate/.test(committed), 'Estate Aperture completion boundary missing');
check(/id="estate-data" type="application\/json"/.test(committed), 'Estate Aperture embedded data missing');
check(!/<script[^>]+src=/.test(committed), 'Estate Aperture has an external script dependency');
check(!/<link[^>]+stylesheet/.test(committed), 'Estate Aperture has an external stylesheet dependency');
check(!/https:\/\/fonts\./.test(committed), 'Estate Aperture has an external font dependency');
check(/prefers-reduced-motion/.test(committed), 'Estate Aperture reduced-motion support missing');
check(/@media\(max-width:720px\)/.test(committed), 'Estate Aperture mobile breakpoint missing');
check(/forced-colors/.test(committed) || /high contrast/i.test(committed), 'Estate Aperture forced-colors/high-contrast support missing');
check(/estate-aperture-export@1/.test(committed), 'Estate Aperture export contract missing');
check(/exact_view_url/.test(committed), 'Estate Aperture exact-view export missing');

const dist = path.join(root, 'dist', 'estates', 'index.html');
if (fs.existsSync(path.join(root, 'dist'))) check(fs.existsSync(dist), 'Pages build did not publish Estate Aperture');

if (errors.length) {
  console.error('validate-estate-aperture-pages failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-estate-aperture-pages: OK (${rendered.data.estates.length} estates, ${rendered.data.manifest.counts.tasks} tasks)`);
