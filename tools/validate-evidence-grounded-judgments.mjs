#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const bytes = relative => fs.readFileSync(full(relative));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const safeArray = value => Array.isArray(value) ? value : [];
const failures = [];
const fail = message => failures.push(message);

const charterPath = 'BUILD-INSTRUCTIONS.md';
const charterBytes = bytes(charterPath);
let charter = '';
try {
  charter = new TextDecoder('utf-8', { fatal: true }).decode(charterBytes);
} catch (error) {
  fail(`governing charter is not valid UTF-8: ${error.message}`);
}
for (let index = 0; index < charterBytes.length; index++) {
  const byte = charterBytes[index];
  if (byte < 0x20 && ![0x09, 0x0a, 0x0d].includes(byte)) {
    fail(`governing charter contains forbidden control byte 0x${byte.toString(16).padStart(2, '0')} at offset ${index}`);
    break;
  }
}
if (!charter.includes('1.12 **Judgment authority cannot be outsourced.**')) fail('BUILD-INSTRUCTIONS 1.12 judgment-authority invariant missing');
if (!charter.includes('`validate:judgments` fails on outsourced permission')) fail('BUILD-INSTRUCTIONS does not name the judgment gate');
if (charter.includes('then a human gate')) fail('legacy contribution human gate remains in the governing charter');
if (charter.includes('requires human sign-off')) fail('legacy intake human sign-off gate remains in the governing charter');
if (!charter.includes('Not dependent on an unspecified future human')) fail('governing anti-goal against outsourced permission missing');

const policy = read('data/project/evidence-grounded-judgment-authority.json');
const ledger = read('build/evidence-grounded-judgments.json');
const selection = read('data/canonical/corpus-selection.json');
const fieldAudit = read('data/research/k0-field-audit.json');
const seedEvents = read('data/intake/k0-ceiling-conversion-seed-events.json');
const reportFrontier = fs.existsSync(full('build/report-frontier.json')) ? read('build/report-frontier.json') : null;
const seedById = new Map(safeArray(seedEvents.events).map(row => [row.event_id, row]));

if (policy.schema_version !== 'evidence-grounded-judgment-authority@1') fail('judgment authority schema drift');
if (policy.constitutional_rule?.no_magic_human_veto !== true) fail('no-magic-human-veto rule missing');
if (policy.constitutional_rule?.independent_review_is_evidence_not_permission !== true) fail('independent-review role drift');
if (policy.constitutional_rule?.absence_of_independent_review_alone_can_block_judgment !== false) fail('review absence may not block judgment');
if (policy.constitutional_rule?.absence_of_independent_review_alone_can_block_bounded_execution !== false) fail('review absence may not block bounded execution');
if (policy.blocker_law?.forbidden_sole_blockers?.length < 4) fail('forbidden human-veto blockers missing');
if (policy.boundaries?.graph_effect !== 'none') fail('policy graph boundary drift');

if (ledger.schema_version !== 'evidence-grounded-judgment-ledger@1') fail('judgment ledger schema drift');
if (ledger.authority_id !== policy.authority_id) fail('judgment authority linkage drift');
if (ledger.summary?.decisions_requiring_human_permission !== 0) fail('a decision still requires human permission');
if (ledger.summary?.independent_review_is_evidence_not_permission !== true) fail('summary review rule drift');
if (ledger.boundaries?.judgment_ledger_proves_evidence_truth !== false) fail('truth boundary missing');
if (ledger.boundaries?.working_judgment_is_clearance !== false) fail('clearance boundary missing');
if (ledger.boundaries?.common_purpose_conclusion_generated !== false || ledger.boundaries?.graph_effect !== 'none') fail('judgment boundary drift');

const manifestFingerprint = sha256(safeArray(ledger.input_manifest).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join(''));
if (manifestFingerprint !== ledger.source_fingerprint_sha256) fail('judgment source fingerprint mismatch');
for (const row of safeArray(ledger.input_manifest)) {
  if (!fs.existsSync(full(row.path))) {
    fail(`missing judgment input ${row.path}`);
    continue;
  }
  const data = bytes(row.path);
  if (data.length !== row.bytes || sha256(data) !== row.sha256) fail(`judgment input drift ${row.path}`);
}

const requiredFields = new Set(policy.required_decision_fields);
const decisionIds = new Set();
const decisionByKey = new Map();
const forbiddenDecisionLanguage = /wait(?:ing)?[_ -]for|requires?[_ -](?:a[_ -])?(?:human|reviewer|expert)|human[_ -](?:permission|approval|signoff)|independent[_ -]review[_ -]required[_ -]to[_ -]decide/i;
for (const decision of safeArray(ledger.decisions)) {
  if (!decision.decision_id || decisionIds.has(decision.decision_id)) fail(`duplicate or missing decision id ${decision.decision_id}`);
  decisionIds.add(decision.decision_id);
  decisionByKey.set(`${decision.domain}:${decision.subject_id}`, decision);
  for (const field of requiredFields) if (!(field in decision)) fail(`${decision.decision_id}: missing ${field}`);
  if (!['J0','J1','J2','J3','J4','J5'].includes(decision.judgment_level)) fail(`${decision.decision_id}: invalid judgment level`);
  if (decision.review_dependency?.required_to_decide !== false) fail(`${decision.decision_id}: human permission gate remains`);
  if (forbiddenDecisionLanguage.test(`${decision.judgment} ${decision.action}`)) fail(`${decision.decision_id}: forbidden wait-for-human language`);
  if (decision.graph_effect !== 'none') fail(`${decision.decision_id}: judgment created graph effect`);
  if (!Array.isArray(decision.counterevidence) || !Array.isArray(decision.uncertainties)) fail(`${decision.decision_id}: counterevidence or uncertainty not explicit`);
  if (decision.reversibility?.mode !== 'append_preserving_supersession') fail(`${decision.decision_id}: reversibility law missing`);
}

for (const lane of safeArray(selection.lanes)) {
  const decision = decisionByKey.get(`selection_lane:${lane.lane_id}`);
  if (!decision) fail(`selection lane lacks operational judgment: ${lane.lane_id}`);
  else if (!['support_only','suspended','retired'].includes(lane.status) && decision.judgment_level !== 'J4') fail(`${lane.lane_id}: executable lane lacks J4 decision`);
}

let expectedK0Working = 0;
for (const audit of safeArray(fieldAudit.rows)) {
  const event = seedById.get(audit.event_id);
  const decision = decisionByKey.get(`k0_event:${audit.event_id}`);
  if (!decision) {
    fail(`K0 audit row lacks judgment: ${audit.event_id}`);
    continue;
  }
  const sourceCount = safeArray(event?.sources).length;
  const counterCount = safeArray(event?.counterevidence).length;
  const alternativeCount = safeArray(event?.alternative_explanations).length;
  const thresholdMet = audit.disposition === 'supported_for_human_review'
    && audit.ccd_chain_depth >= policy.domain_rules.k0_event.bounded_working_threshold.minimum_contiguous_ccd
    && sourceCount >= policy.domain_rules.k0_event.bounded_working_threshold.minimum_sources
    && counterCount > 0
    && alternativeCount > 0;
  const partialPrefix = audit.ccd_chain_depth >= 3;
  if (thresholdMet || partialPrefix) expectedK0Working += 1;
  if (thresholdMet && (decision.judgment_level !== 'J2' || decision.judgment !== 'bounded_ceiling_conversion_mechanism_supported')) fail(`${audit.event_id}: supported chain was not converted into a bounded working judgment`);
  if (!thresholdMet && partialPrefix && decision.judgment_level !== 'J2') fail(`${audit.event_id}: supported causal prefix was left waiting`);
  if (!thresholdMet && !partialPrefix && decision.judgment_level !== 'J1') fail(`${audit.event_id}: insufficient mechanism should remain a bounded candidate decision`);
}
if (ledger.summary?.k0_bounded_working_judgments !== expectedK0Working) fail(`K0 working-judgment count mismatch: expected ${expectedK0Working}`);
if (expectedK0Working < 6) fail('too few current K0 working judgments; the field audit evidence is not being used');

for (const item of safeArray(reportFrontier?.cases)) {
  if (!decisionByKey.has(`report:${item.case_id}`)) fail(`report frontier case lacks judgment: ${item.case_id}`);
}

const reportText = fs.readFileSync(full('reports/evidence-grounded-judgments.md'), 'utf8');
if (!reportText.includes('Independent review is evidence that can challenge, strengthen, or overturn a judgment; it is not permission to think or act.')) fail('reader-facing no-veto rule missing');
if (!reportText.includes('decisions requiring human permission: 0')) fail('reader-facing permission count missing');

if (failures.length) {
  console.error(`evidence-grounded judgment validation failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('evidence-grounded judgment validation: OK');
console.log('  governing charter: valid UTF-8, no forbidden control bytes, Section 1.12 present');
console.log(`  decisions: ${ledger.decisions.length}`);
console.log(`  K0 bounded working judgments: ${ledger.summary.k0_bounded_working_judgments}`);
console.log(`  selection operational decisions: ${ledger.summary.selection_lanes_with_operational_decisions}`);
console.log('  human permission gates: 0');
