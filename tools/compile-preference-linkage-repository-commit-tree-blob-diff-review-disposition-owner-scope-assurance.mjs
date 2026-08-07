import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceFixture, renderPreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceMarkdown } from './lib/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.mjs';
const fixturePath=process.argv[2]??'data/research/preference-custody/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.fixture.json';
const jsonPath=process.argv[3]??'build/research/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.json';
const markdownPath=process.argv[4]??'build/research/preference-linkage-repository-commit-tree-blob-diff-review-disposition-owner-scope-assurance.md';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
let compiled;try{compiled=compilePreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceFixture(fixture);}catch(error){console.error(error.message);process.exit(1);}
mkdirSync(dirname(jsonPath),{recursive:true});mkdirSync(dirname(markdownPath),{recursive:true});
writeFileSync(jsonPath,JSON.stringify(compiled,null,2)+'\n');writeFileSync(markdownPath,renderPreferenceLinkageRepositoryCommitTreeBlobDiffReviewDispositionOwnerScopeAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
