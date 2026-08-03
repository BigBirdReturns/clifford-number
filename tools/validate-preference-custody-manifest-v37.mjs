import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV37, validatePreferenceCustodyManifestV37Build } from './lib/preference-custody-manifest-v37.mjs';
const manifest = JSON.parse(readFileSync(process.argv[2] ?? 'data/research/preference-custody/control-manifest-v37.json', 'utf8'));
const build = JSON.parse(readFileSync(process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v37.json', 'utf8'));
const errors = [...validatePreferenceCustodyManifestV37(manifest), ...validatePreferenceCustodyManifestV37Build(build)];
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log(`validated ${build.manifest_id}: ${build.control_count} controls, ${build.composition.added_promotion_requirement_count} added requirements`);
