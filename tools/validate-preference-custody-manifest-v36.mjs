import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV36, validatePreferenceCustodyManifestV36Build } from './lib/preference-custody-manifest-v36.mjs';
const manifest=JSON.parse(readFileSync(process.argv[2]??'data/research/preference-custody/control-manifest-v36.json','utf8'));
const build=JSON.parse(readFileSync(process.argv[3]??'build/research/preference-custody-laboratory-floor-v36.json','utf8'));
const errors=[...validatePreferenceCustodyManifestV36(manifest),...validatePreferenceCustodyManifestV36Build(build)];
if(errors.length){console.error(errors.map(e=>`- ${e}`).join('\n'));process.exit(1);}console.log(`validated ${build.manifest_id}: ${build.control_count} controls, ${build.composition.added_promotion_requirement_count} added requirements`);
