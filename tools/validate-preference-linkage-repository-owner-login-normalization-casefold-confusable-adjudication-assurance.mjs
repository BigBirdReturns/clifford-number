import { readFileSync } from 'node:fs';
import { validateBuild, validateFixture } from './lib/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.json';

let fixture;
try {
  fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
} catch (error) {
  console.error(`- PC-62 fixture could not be read: ${error.message}`);
  process.exit(1);
}
const fixtureErrors = validateFixture(fixture);
if (fixtureErrors.length) {
  console.error(fixtureErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
let build;
try {
  build = JSON.parse(readFileSync(buildPath, 'utf8'));
} catch (error) {
  console.error(`- PC-62 build could not be read: ${error.message}`);
  process.exit(1);
}
const errors = validateBuild(build, fixture);
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`validated ${fixture.fixture_id}`);
