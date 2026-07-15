import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from '../tools/lib/ledger.mjs';
import {
  TERMINAL_RESULT,
  VALIDATOR_STATES,
  classifyComprehensionSession,
  validateRouteContract,
} from '../tools/validate-comprehension-session.mjs';

const contract = readJson('comprehension/routes/dialog-structural-context.json');
const ledger = {
  surfaces: readJsonl('data/ledger/surfaces.jsonl'),
  receipts: readJsonl('data/ledger/receipts.jsonl'),
};

const contractValidation = validateRouteContract(contract, ledger);
assert.deepEqual(contractValidation.errors, [], `route contract errors: ${contractValidation.errors.join('; ')}`);
assert.equal(contract.terminal_result, TERMINAL_RESULT);
assert.deepEqual(new Set(contract.session_requirements.allowed_validator_states), new Set(VALIDATOR_STATES));
assert.equal(contract.session_requirements.allowed_validator_states.includes('PASS'), false);

const dialog = ledger.surfaces.find(row => row.surface_id === 'dialog-society-membership');
assert.ok(dialog, 'Dialog surface must exist');
assert.equal(dialog.hop_eligible, false, 'Dialog must remain a non-hop surface');

const receiptClass = new Map(ledger.receipts.map(row => [row.receipt_id, row.evidence_class]));
assert.equal(receiptClass.get('wired-dialog-leak'), 'reported');
assert.equal(receiptClass.get('dialog-directory-extract'), 'primary_public');

const fixturesDir = path.join(root, 'comprehension/fixtures');
const fixtureNames = [
  'session-ready-for-adjudication.json',
  'session-contaminated.json',
  'session-missing-prediction.json',
  'session-semantic-failure.json',
  'session-inconclusive.json',
];

for (const fixtureName of fixtureNames) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, fixtureName), 'utf8'));
  const result = classifyComprehensionSession(fixture, contract);
  assert.equal(result.status, fixture._fixture.expected_status, `${fixtureName} classified incorrectly`);
  assert.equal(result.automatic_pass, false, `${fixtureName} must never produce automatic PASS`);
  assert.notEqual(result.status, 'PASS', `${fixtureName} produced forbidden PASS`);
}

const brokenBlocks = structuredClone(contract);
brokenBlocks.blocked_capabilities.pathfinding = false;
assert.ok(
  validateRouteContract(brokenBlocks, ledger).errors.some(error => error.includes('pathfinding')),
  'pathfinding must be a hard contract block',
);

const contaminatedAudit = structuredClone(contract);
contaminatedAudit.neighboring_hop_control_audit.referenced_hop_ids.push('example-hop');
assert.ok(
  validateRouteContract(contaminatedAudit, ledger).errors.some(error => error.includes('neighboring hop audit')),
  'neighboring-hop audit must remain empty',
);

const changedEvidence = structuredClone(ledger);
changedEvidence.receipts.find(row => row.receipt_id === 'wired-dialog-leak').evidence_class = 'primary_public';
assert.ok(
  validateRouteContract(contract, changedEvidence).errors.some(error => error.includes('wired-dialog-leak')),
  'WIRED evidence class drift must fail validation',
);

const ready = readJson('comprehension/fixtures/session-ready-for-adjudication.json');
const pathLeak = structuredClone(ready);
pathLeak.presentation.pathfinding_output = ['actor-a', 'dialog-society-membership', 'actor-b'];
assert.equal(classifyComprehensionSession(pathLeak, contract).status, 'FAIL');

const claimedPass = structuredClone(ready);
claimedPass.status = 'PASS';
assert.equal(classifyComprehensionSession(claimedPass, contract).status, 'INADMISSIBLE');

console.log('comprehension-protocol.test: OK');
