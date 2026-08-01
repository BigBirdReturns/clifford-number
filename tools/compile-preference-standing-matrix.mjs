import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceRealCase } from './lib/preference-real-case.mjs';
import { compilePreferenceHumanCompanion } from './lib/preference-human-companion.mjs';
import { compilePreferenceHybridArchitecture } from './lib/preference-hybrid-architecture.mjs';
import { compileRepresentationCustodyPacket } from './lib/preference-representation-custody.mjs';
import {
  compileStandingMatrix,
  renderStandingMatrixMarkdown
} from './lib/preference-standing-matrix.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/representation-validation-authority-matrix.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-real-cases/representation-validation-authority-matrix.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-real-cases/representation-validation-authority-matrix.md';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson(manifestPath);
const compiledSources = {
  'times-exploraition-public-admission-v1': compilePreferenceRealCase(
    readJson('data/research/preference-custody/real-cases/times-exploraition-admission.json')
  ),
  'newsuk-nucleus-human-companion-v1': compilePreferenceHumanCompanion(
    readJson('data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json')
  ),
  'yougov-parallax-hybrid-architecture-v1': compilePreferenceHybridArchitecture(
    readJson('data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json')
  ),
  'twineo-originalvoices-representation-custody-v1': compileRepresentationCustodyPacket(
    readJson('data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json')
  )
};

const compiled = compileStandingMatrix(manifest, compiledSources);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderStandingMatrixMarkdown(compiled));
console.log(`compiled ${compiled.matrix_id} -> ${jsonPath}, ${markdownPath}`);
