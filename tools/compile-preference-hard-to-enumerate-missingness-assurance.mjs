import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceHardToEnumerateMissingnessAssuranceFixture, renderPreferenceHardToEnumerateMissingnessAssuranceMarkdown } from './lib/preference-hard-to-enumerate-missingness-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/hard-to-enumerate-missingness-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-hard-to-enumerate-missingness-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-hard-to-enumerate-missingness-assurance.md';
const compiled = compilePreferenceHardToEnumerateMissingnessAssuranceFixture(JSON.parse(readFileSync(fixturePath,'utf8')));
mkdirSync(dirname(jsonPath),{recursive:true}); mkdirSync(dirname(markdownPath),{recursive:true});
writeFileSync(jsonPath,`${JSON.stringify(compiled,null,2)}
`); writeFileSync(markdownPath,renderPreferenceHardToEnumerateMissingnessAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
