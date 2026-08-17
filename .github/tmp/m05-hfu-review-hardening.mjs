#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const candidatePath=path.join(
  root,
  'data/project/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.json'
);
const libraryPath=path.join(
  root,
  'tools/lib/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.mjs'
);
const validatorPath=path.join(
  root,
  'tools/validate-m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.mjs'
);
const testPath=path.join(
  root,
  'test/m05-answerable-power-sprint-03-leg-07-hfu-share-exit-receipt-candidate.test.js'
);

const replaceOnce=(text,needle,replacement,label)=>{
  const first=text.indexOf(needle);
  const last=text.lastIndexOf(needle);
  if(first<0||first!==last){
    throw new Error(`${label}: expected exactly one replacement anchor`);
  }
  return `${text.slice(0,first)}${replacement}${text.slice(first+needle.length)}`;
};

const candidateBytes=fs.readFileSync(candidatePath);
const candidate=JSON.parse(candidateBytes.toString('utf8'));
const candidateJsonSha256=crypto
  .createHash('sha256')
  .update(JSON.stringify(candidate))
  .digest('hex');
const candidateSha256=crypto.createHash('sha256').update(candidateBytes).digest('hex');
const candidateGitBlobSha=crypto
  .createHash('sha1')
  .update(Buffer.from(`blob ${candidateBytes.length}\0`,'utf8'))
  .update(candidateBytes)
  .digest('hex');

let library=fs.readFileSync(libraryPath,'utf8');
if(!library.includes('HFU_SHARE_CANDIDATE_JSON_SHA256')){
  library=replaceOnce(
    library,
    "import {\n  ANSWER_DIMENSIONS,",
    "import crypto from 'node:crypto';\nimport {\n  ANSWER_DIMENSIONS,",
    'library crypto import'
  );
  library=replaceOnce(
    library,
    "export const HFU_SHARE_JURISDICTION='UK';\n",
    `export const HFU_SHARE_JURISDICTION='UK';\nexport const HFU_SHARE_CANDIDATE_JSON_SHA256='${candidateJsonSha256}';\n`,
    'library semantic digest constant'
  );
  library=replaceOnce(
    library,
    "const clone=(value)=>JSON.parse(JSON.stringify(value));\n",
    "const clone=(value)=>JSON.parse(JSON.stringify(value));\nconst digest=(value)=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');\n",
    'library digest helper'
  );
  library=replaceOnce(
    library,
    "  check(\n    candidate?.status==='repository_content_candidate_frozen',\n    'HFU candidate status drift'\n  );\n  check(text(candidate?.title,50)&&text(candidate?.question,140),",
    "  check(\n    candidate?.status==='repository_content_candidate_frozen',\n    'HFU candidate status drift'\n  );\n  check(\n    digest(candidate)===HFU_SHARE_CANDIDATE_JSON_SHA256,\n    'HFU candidate exact-object custody drift'\n  );\n  check(text(candidate?.title,50)&&text(candidate?.question,140),",
    'library exact-object guard'
  );
}else if(!library.includes(`HFU_SHARE_CANDIDATE_JSON_SHA256='${candidateJsonSha256}'`)){
  throw new Error('library semantic digest does not match the frozen candidate');
}
fs.writeFileSync(libraryPath,library,'utf8');

let validator=fs.readFileSync(validatorPath,'utf8');
if(!validator.includes('EXPECTED_HFU_CANDIDATE_GIT_BLOB_SHA')){
  validator=replaceOnce(
    validator,
    "const sha256=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');\n\n",
    `const sha256=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');\n\nconst EXPECTED_HFU_CANDIDATE_GIT_BLOB_SHA='${candidateGitBlobSha}';\nconst EXPECTED_HFU_CANDIDATE_SHA256='${candidateSha256}';\n\n`,
    'validator raw custody constants'
  );
  validator=replaceOnce(
    validator,
    "const contractFile=read(PATHS.contract);\n\nconst dependencyBlobShas={",
    "const contractFile=read(PATHS.contract);\n\nconst candidateGitBlobSha=gitBlobSha(candidateFile.bytes);\nconst candidateSha256Digest=sha256(candidateFile.bytes);\nif(\n  candidateGitBlobSha!==EXPECTED_HFU_CANDIDATE_GIT_BLOB_SHA||\n  candidateSha256Digest!==EXPECTED_HFU_CANDIDATE_SHA256\n){\n  console.error('HFU Share exit receipt candidate raw-byte custody drift');\n  process.exit(1);\n}\n\nconst dependencyBlobShas={",
    'validator raw custody gate'
  );
  validator=replaceOnce(
    validator,
    '  candidate_git_blob_sha:gitBlobSha(candidateFile.bytes),\n  candidate_sha256:sha256(candidateFile.bytes),',
    '  candidate_git_blob_sha:candidateGitBlobSha,\n  candidate_sha256:candidateSha256Digest,',
    'validator custody output'
  );
}else if(
  !validator.includes(`EXPECTED_HFU_CANDIDATE_GIT_BLOB_SHA='${candidateGitBlobSha}'`)||
  !validator.includes(`EXPECTED_HFU_CANDIDATE_SHA256='${candidateSha256}'`)
){
  throw new Error('validator raw custody constants do not match the frozen candidate');
}
fs.writeFileSync(validatorPath,validator,'utf8');

let test=fs.readFileSync(testPath,'utf8');
if(!test.includes('same-host source substitution')){
  test=replaceOnce(
    test,
    "assertMutationFails((row)=>{row.bindings.external_service_repository.changelog_blob_sha='0'.repeat(40);},\n  'external repository changelog blob drift');\n\n",
    "assertMutationFails((row)=>{row.bindings.external_service_repository.changelog_blob_sha='0'.repeat(40);},\n  'external repository changelog blob drift');\nassertMutationFails((row)=>{\n  row.receipt.sources[0].url='https://www.nao.org.uk/reports/substituted';\n},'same-host source substitution');\nassertMutationFails((row)=>{\n  row.receipt.sources[0].locator[0]+=' Substantive locator drift.';\n},'substantive locator drift');\nassertMutationFails((row)=>{\n  row.bindings.real_receipt_audit.pull_request=999999;\n},'binding metadata drift');\nassertMutationFails((row)=>{\n  delete row.expected_state.hfu_durability;\n},'expected-state field deletion');\nassertMutationFails((row)=>{\n  row.receipt.assessment.upside+=' Unreviewed widening.';\n},'assessment drift');\n\n",
    'test exact-object mutations'
  );
  test=replaceOnce(
    test,
    '  custody_mutations:5,\n',
    '  custody_mutations:11,\n  exact_object_guard_mutations:5,\n',
    'test mutation summary'
  );
}
fs.writeFileSync(testPath,test,'utf8');

console.log(JSON.stringify({
  status:'patched',
  candidate_json_sha256:candidateJsonSha256,
  candidate_git_blob_sha:candidateGitBlobSha,
  candidate_sha256:candidateSha256,
  changed_paths:[
    path.relative(root,libraryPath),
    path.relative(root,validatorPath),
    path.relative(root,testPath)
  ]
},null,2));
