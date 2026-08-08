import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceLinkageRepositoryCommitParentMergeTopologyTreePathModeBlobDiffIdentityAssuranceFixture, renderPreferenceLinkageRepositoryCommitParentMergeTopologyTreePathModeBlobDiffIdentityAssuranceMarkdown } from './lib/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.mjs';
const fixturePath=process.argv[2]??'data/research/preference-custody/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.fixture.json';
const jsonPath=process.argv[3]??'build/research/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.json';
const markdownPath=process.argv[4]??'build/research/preference-linkage-repository-commit-parent-merge-topology-tree-path-mode-blob-diff-identity-assurance.md';
let fixture;try{fixture=JSON.parse(readFileSync(fixturePath,'utf8'));}catch(error){console.error(`PC-54 fixture could not be read: ${error.message}`);process.exit(1);}
let compiled;try{compiled=compilePreferenceLinkageRepositoryCommitParentMergeTopologyTreePathModeBlobDiffIdentityAssuranceFixture(fixture);}catch(error){console.error(error.message);process.exit(1);}
mkdirSync(dirname(jsonPath),{recursive:true});mkdirSync(dirname(markdownPath),{recursive:true});writeFileSync(jsonPath,JSON.stringify(compiled,null,2)+'\n');writeFileSync(markdownPath,renderPreferenceLinkageRepositoryCommitParentMergeTopologyTreePathModeBlobDiffIdentityAssuranceMarkdown(compiled));console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
