import { readFileSync } from 'node:fs';
import {
  validatePreferenceAcquisitionRequest,
  validatePreferenceAcquisitionRequestBuild
} from './lib/preference-acquisition-request.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/acquisition/newsuk-matched-method-request.json';
const requestPath = process.argv[3] ?? 'docs/requests/newsuk-times-exploraition-nucleus-panel-protocol-request.md';
const buildPath = process.argv[4] ?? 'build/research/preference-acquisition/newsuk-matched-method-request.json';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const requestMarkdown = readFileSync(requestPath, 'utf8');
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceAcquisitionRequest(packet, requestMarkdown).map(error => `source: ${error}`),
  ...validatePreferenceAcquisitionRequestBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('News UK matched-method acquisition packet: PASS');
}
