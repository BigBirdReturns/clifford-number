import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compilePreferenceCustodyManifestV35, renderPreferenceCustodyManifestV35Markdown } from './lib/preference-custody-manifest-v35.mjs';
import { compilePreferenceHardToEnumerateMissingnessAssuranceFixture } from './lib/preference-hard-to-enumerate-missingness-assurance.mjs';
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const manifestPath=process.argv[2]??'data/research/preference-custody/control-manifest-v35.json';
const jsonPath=process.argv[3]??'build/research/preference-custody-laboratory-floor-v35.json';
const markdownPath=process.argv[4]??'build/research/preference-custody-laboratory-floor-v35.md';
const directory=mkdtempSync(join(tmpdir(),'preference-v35-base-'));const baseJson=join(directory,'v34.json');const baseMarkdown=join(directory,'v34.md');
const result=spawnSync(process.execPath,['tools/compile-preference-custody-manifest-v34.mjs','data/research/preference-custody/control-manifest-v34.json',baseJson,baseMarkdown],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr||result.stdout||'v34 compilation failed');
const extension=compilePreferenceHardToEnumerateMissingnessAssuranceFixture(readJson('data/research/preference-custody/hard-to-enumerate-missingness-assurance.fixture.json'));
const compiled=compilePreferenceCustodyManifestV35(readJson(manifestPath),readJson(baseJson),extension);mkdirSync(dirname(jsonPath),{recursive:true});mkdirSync(dirname(markdownPath),{recursive:true});writeFileSync(jsonPath,`${JSON.stringify(compiled,null,2)}
`);writeFileSync(markdownPath,renderPreferenceCustodyManifestV35Markdown(compiled));console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
