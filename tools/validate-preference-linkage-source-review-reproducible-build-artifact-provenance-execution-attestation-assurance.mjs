import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild, validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture } from './lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const fixtureErrors = validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture);
if (fixtureErrors.length) { console.error(fixtureErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = validatePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceBuild(build, fixture);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('validated PC-51 source review, reproducible build, artifact provenance, and execution-attestation fixture and build');
