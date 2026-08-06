import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture, renderPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceMarkdown } from './lib/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-source-review-reproducible-build-artifact-provenance-execution-attestation-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n'); writeFileSync(markdownPath, renderPreferenceLinkageSourceReviewReproducibleBuildArtifactProvenanceExecutionAttestationAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
