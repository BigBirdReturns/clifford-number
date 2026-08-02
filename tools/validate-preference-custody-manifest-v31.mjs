import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV31,
  validatePreferenceCustodyManifestV31Build
} from './lib/preference-custody-manifest-v31.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v31.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v31.json';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV31(manifest),
  ...validatePreferenceCustodyManifestV31Build(build)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(
  `validated ${build.manifest_id}: ${build.control_count} controls, ` +
  `${build.composition.added_promotion_requirement_count} added requirements`
);
