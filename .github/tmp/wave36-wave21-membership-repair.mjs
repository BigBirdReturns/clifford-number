#!/usr/bin/env node
import fs from 'node:fs';

const validatorPath = 'tools/validate-lake-allocator-war-wave-21.mjs';
const testPath = 'test/lake-allocator-war-wave-21.test.js';

let validator = fs.readFileSync(validatorPath, 'utf8');
const oldSetup = `  const wave36Policy = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json');
  const wave36Plan = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json');
  const { sourcePaths: wave36SourcePaths, permanentPaths: wave36PermanentPaths } = wave36PathContract(wave36Policy, wave36Plan);
  const errors = validateArtifacts({ policy, observations, waterline, estates, programs, receipt, projection, reconciliation, wave36Policy, wave36Plan });
`;
const newSetup = `  const wave36Policy = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json');
  const wave36Plan = readJson(root, 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json');
  const {
    sourcePaths: wave36SourcePaths,
    snapshotPaths: wave36SnapshotPaths,
    permanentPaths: wave36PermanentPaths
  } = wave36PathContract(wave36Policy, wave36Plan);
  const errors = validateArtifacts({ policy, observations, waterline, estates, programs, receipt, projection, reconciliation, wave36Policy, wave36Plan });
  const wave36MembershipSourcePaths = wave36SourcePaths.filter(relative => fs.existsSync(full(root, relative)));
  const wave36CaptureLedgerExists = fs.existsSync(full(root, wave36Policy.paths.capture_ledger));
  if (wave36CaptureLedgerExists) {
    const wave36Captures = readJsonl(root, wave36Policy.paths.capture_ledger);
    const captureBySourceRef = new Map(wave36Captures.map(row => [row.source_ref, row]));
    const snapshotSpecByPath = new Map(wave36Plan.source_specs.map(row => [row.storage_path, row]));
    const snapshotPathSet = new Set(wave36SnapshotPaths);
    for (const relative of wave36SourcePaths) {
      if (fs.existsSync(full(root, relative))) continue;
      if (!snapshotPathSet.has(relative)) {
        fail(errors, \\`\${relative}: missing permanent Wave 36 source path\\`);
        continue;
      }
      const spec = snapshotSpecByPath.get(relative);
      const capture = spec ? captureBySourceRef.get(spec.source_ref) : null;
      if (!spec || !capture) {
        fail(errors, \\`\${relative}: missing Wave 36 failed-capture custody\\`);
        continue;
      }
      if (spec.required_success !== false || capture.required_success !== false) {
        fail(errors, \\`\${relative}: required Wave 36 snapshot is absent\\`);
      }
      if (capture.response_ok !== false) fail(errors, \\`\${relative}: absent snapshot claims a successful response\\`);
      if (capture.response_body_path !== null || capture.response_body_bytes !== 0 || capture.response_body_sha256 !== null) {
        fail(errors, \\`\${relative}: absent snapshot claims retained response bytes\\`);
      }
      if (!['request_failed', 'response_refused_too_large'].includes(capture.capture_state)) {
        fail(errors, \\`\${relative}: absent snapshot has unsupported capture state \${capture.capture_state}\\`);
      }
    }
  }
`;
if (validator.includes(oldSetup)) validator = validator.replace(oldSetup, newSetup);
else if (!validator.includes('const wave36MembershipSourcePaths = wave36SourcePaths.filter')) throw new Error('Wave 21 validator setup drifted');

const oldMembershipLoop = `      for (const relative of wave36SourcePaths) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, \\`\${relative}: wrong Wave 36 source basin\\`);`;
const newMembershipLoop = `      for (const relative of wave36MembershipSourcePaths) if (byPath.get(relative)?.basin_id !== 'allocator-war-source') fail(errors, \\`\${relative}: wrong Wave 36 source basin\\`);`;
if (validator.includes(oldMembershipLoop)) validator = validator.replace(oldMembershipLoop, newMembershipLoop);
else if (!validator.includes(newMembershipLoop)) throw new Error('Wave 21 membership loop drifted');
fs.writeFileSync(validatorPath, validator);

let test = fs.readFileSync(testPath, 'utf8');
const oldImport = `import { validateArtifacts } from '../tools/validate-lake-allocator-war-wave-21.mjs';`;
const newImport = `import { validateArtifacts, validateRepository } from '../tools/validate-lake-allocator-war-wave-21.mjs';`;
if (test.includes(oldImport)) test = test.replace(oldImport, newImport);
else if (!test.includes(newImport)) throw new Error('Wave 21 test import drifted');

const marker = `// LAW36-OPTIONAL-MISSING-SNAPSHOT-CUSTODY: basin membership covers existing files; the capture ledger covers lawful request failures.`;
const addition = `

${marker}
const wave36PolicyPath = 'data/project/lake-allocator-war-public-acquisition-wave-36-policy.json';
const wave36PlanPath = 'data/project/lake-allocator-war-public-acquisition-wave-36-plan.json';
if (fs.existsSync(wave36PolicyPath) && fs.existsSync(wave36PlanPath)) {
  const wave36Policy = readJson(wave36PolicyPath);
  if (fs.existsSync(wave36Policy.paths.capture_ledger) && fs.existsSync('build/lake-index/basin-membership.jsonl')) {
    const wave36Plan = readJson(wave36PlanPath);
    const captures = readJsonl(wave36Policy.paths.capture_ledger);
    const captureBySourceRef = new Map(captures.map(row => [row.source_ref, row]));
    const absent = wave36Plan.source_specs.filter(spec => !fs.existsSync(spec.storage_path));
    for (const spec of absent) {
      const capture = captureBySourceRef.get(spec.source_ref);
      assert.ok(capture, \\`\${spec.storage_path}: absent snapshot lacks capture-ledger custody\\`);
      assert.equal(spec.required_success, false, \\`\${spec.storage_path}: required source cannot be absent\\`);
      assert.equal(capture.required_success, false, \\`\${spec.storage_path}: required capture cannot be absent\\`);
      assert.equal(capture.response_ok, false, \\`\${spec.storage_path}: absent snapshot claims response success\\`);
      assert.equal(capture.response_body_path, null, \\`\${spec.storage_path}: absent snapshot claims a retained body path\\`);
      assert.equal(capture.response_body_bytes, 0, \\`\${spec.storage_path}: absent snapshot claims retained bytes\\`);
      assert.equal(capture.response_body_sha256, null, \\`\${spec.storage_path}: absent snapshot claims a body digest\\`);
      assert.ok(['request_failed', 'response_refused_too_large'].includes(capture.capture_state), \\`\${spec.storage_path}: unsupported absent capture state \${capture.capture_state}\\`);
    }
    const bodyless = captures.filter(row => row.response_body_path === null);
    assert.equal(absent.length, bodyless.length, 'planned absent snapshots and bodyless capture rows must be one-to-one');
    assert.doesNotThrow(() => validateRepository(process.cwd()), 'Wave 21 compatibility validator must accept receipted optional snapshot absences');
  }
}
`;
if (!test.includes(marker)) test = `${test.trimEnd()}${addition}\n`;
fs.writeFileSync(testPath, test);

console.log('Wave 36 Wave 21 membership repair staged');
console.log('  existing snapshot membership: required');
console.log('  absent optional snapshot custody: capture ledger');
console.log('  required or unexplained absent snapshots: rejected');
