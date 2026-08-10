import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compileManifest, loadPreferenceCustodyV57SourceBundle, renderMarkdown, validateManifest } from './lib/preference-custody-manifest-v58.mjs';
const manifestPath=process.argv[2]??'data/research/preference-custody/control-manifest-v58.json'; const jsonPath=process.argv[3]??'build/research/preference-custody-laboratory-floor-v58.json'; const markdownPath=process.argv[4]??'build/research/preference-custody-laboratory-floor-v58.md';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
let manifest; try {manifest=load(manifestPath);} catch(e) {console.error(`- Preference Custody v58 manifest could not be read: ${e.message}`);process.exit(1);}
const manifestErrors=validateManifest(manifest); if (manifestErrors.length) {console.error(manifestErrors.map(e=>`- ${e}`).join('\n'));process.exit(1);}
if (!existsSync('build/research/preference-custody-laboratory-floor-v57.json')) execFileSync(process.execPath,['tools/compile-preference-custody-manifest-v57.mjs'],{stdio:'inherit'});
if (!existsSync('build/research/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.json')) execFileSync(process.execPath,['tools/compile-preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.mjs'],{stdio:'inherit'});
const baseBuild=load('build/research/preference-custody-laboratory-floor-v57.json'); const targetBuild=load('build/research/preference-linkage-repository-owner-login-normalization-alias-case-location-pair-assurance.json'); const targetFixture=load(manifest.extension_control.source_fixture_path); const baseSources=loadPreferenceCustodyV57SourceBundle(load);
let build; try {build=compileManifest(manifest,baseBuild,targetBuild,targetFixture,baseSources);} catch(e) {console.error(`- Preference Custody v58 deterministic compile failed: ${e.message}`);process.exit(1);}
mkdirSync(dirname(jsonPath),{recursive:true});mkdirSync(dirname(markdownPath),{recursive:true});writeFileSync(jsonPath,JSON.stringify(build,null,2)+'\n');writeFileSync(markdownPath,renderMarkdown(build));console.log(`compiled ${manifest.manifest_id} -> ${jsonPath}, ${markdownPath}`);
