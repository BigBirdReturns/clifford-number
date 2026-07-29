#!/usr/bin/env node
import fs from 'node:fs';

const changedPaths = [];

function replaceExact(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${file}: expected one migration target, found ${occurrences}`);
  fs.writeFileSync(file, source.replace(before, after));
  changedPaths.push(file);
}

replaceExact(
  'tools/build-public-catalog.mjs',
  `  const projectedUkAiCase = compileUkAiPolicyCase();\n\n  const cases = [projectedUkAiCase, ...(caseIndex.cases ?? []).filter(entry => entry.case_id !== UK_AI_CASE_ID)].map(entry => {\n`,
  `  const nativeUkAiCase = (caseIndex.cases ?? []).find(entry => entry.case_id === UK_AI_CASE_ID);\n  const projectedUkAiCase = nativeUkAiCase ?? compileUkAiPolicyCase();\n\n  const cases = [projectedUkAiCase, ...(caseIndex.cases ?? []).filter(entry => entry.case_id !== UK_AI_CASE_ID)].map(entry => {\n`
);

replaceExact(
  'test/report-frontier.test.js',
  `const ukAi = byCase.get('uk-ai-policy');\nassert.ok(ukAi);\nassert.equal(ukAi.case_state, 'legacy_projection');\nassert.equal(ukAi.current_stage, 'intake_or_projection');\nassert.equal(ukAi.next_transition, 'case_ledger_migration');\nassert.ok(ukAi.blockers.includes('canonical_case_ledger_missing'));\n`,
  `const ukAi = byCase.get('uk-ai-policy');\nassert.ok(ukAi);\nassert.equal(ukAi.case_state, 'case_ledger');\nassert.equal(ukAi.current_stage, 'case_ledger');\nassert.equal(ukAi.next_transition, 'structured_report_specification');\nassert.ok(ukAi.blockers.includes('187_claims_review_required'));\nassert.ok(ukAi.blockers.includes('structured_report_not_declared'));\nassert.ok(!ukAi.blockers.includes('canonical_case_ledger_missing'));\n`
);

fs.writeFileSync('.github/tmp/lake-native-source-wave-03-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-native-source-wave-03-source-paths@1',
  changed_paths: changedPaths.sort()
}, null, 2)}\n`);
console.log(`Wave 03 source migration carrier applied: ${changedPaths.length} source paths`);
