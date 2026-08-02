import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractCorpus,
  loadRules,
  validateRules
} from '../tools/ssc-rd04-a07-order-candidate-extractor.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const RULES = path.join(ROOT, 'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/candidate-extraction-rules.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'a07-extractor-test-'));
const source = path.join(temp, 'source');
const output = path.join(temp, 'ledger.json');

const sharedText = [
  'The county is ordered to restore CalFresh benefits of $125 for January 2026.',
  'A compliance report is required.'
].join('\n');

function writeDocument({
  directory,
  identity,
  decisionId,
  registryIds,
  text,
  dispositions,
  agencies
}) {
  const documentDirectory = path.join(source, directory);
  fs.mkdirSync(documentDirectory, { recursive: true });
  const bytes = Buffer.from(text, 'utf8');
  fs.writeFileSync(path.join(documentDirectory, 'decision.txt'), bytes);
  fs.writeFileSync(path.join(documentDirectory, 'fetch.json'), `${JSON.stringify({
    document_identity: identity,
    document_identity_sha256: sha256(Buffer.from(identity, 'utf8')),
    decision_id: decisionId,
    registry_ids: registryIds,
    registry_row_count: registryIds.length,
    registry_dispositions: dispositions,
    responsible_agencies: agencies,
    extracted_text_path: 'decision.txt',
    extracted_text_bytes: bytes.length,
    extracted_text_sha256: sha256(bytes),
    terminal_state: 'exact_pdf_and_text_recovered'
  }, null, 2)}\n`);
}

writeDocument({
  directory: 'shard-00/doc-a',
  identity: 'current-decision:100',
  decisionId: '100',
  registryIds: ['1000'],
  text: sharedText,
  dispositions: ['Grant'],
  agencies: ['Alpha County']
});
writeDocument({
  directory: 'shard-00/doc-b',
  identity: 'current-decision:101',
  decisionId: '101',
  registryIds: ['1001'],
  text: sharedText,
  dispositions: ['Denial'],
  agencies: ['Beta County']
});
writeDocument({
  directory: 'shard-01/doc-c',
  identity: 'current-decision:102',
  decisionId: '102',
  registryIds: ['1002', '1003'],
  text: 'This matter is remanded for a new hearing and further determination.',
  dispositions: ['Dismissal'],
  agencies: ['Gamma County']
});
writeDocument({
  directory: 'shard-01/doc-d',
  identity: 'current-decision:103',
  decisionId: '103',
  registryIds: ['1004'],
  text: 'The appeal is denied and the prior calculation is affirmed.',
  dispositions: ['Denial'],
  agencies: ['Delta County']
});
writeDocument({
  directory: 'shard-02/doc-e',
  identity: 'current-decision:104',
  decisionId: '104',
  registryIds: ['1005'],
  text: 'The record references $50 for January 2026 without directing any action.',
  dispositions: ['Partial Grant'],
  agencies: ['Epsilon County']
});

const loaded = loadRules(RULES);
const ruleErrors = validateRules(loaded.rules);
if (ruleErrors.length) throw new Error(`rules failed: ${ruleErrors.join('\n')}`);

const ledger = extractCorpus({
  sourceRoot: source,
  rulesPath: RULES,
  mode: 'test',
  expectedDocuments: 5,
  outputPath: output
});

if (!fs.existsSync(output)) throw new Error('output ledger was not written');
if (ledger.population.documents_processed !== 5) throw new Error('document denominator failed');
if (ledger.population.registry_rows_represented !== 6) throw new Error('registry-row denominator failed');
if (ledger.population.population_complete !== false) throw new Error('test population was promoted to complete');
if (ledger.counts.candidate_documents !== 3) throw new Error(`candidate count ${ledger.counts.candidate_documents}`);
if (ledger.counts.negative_documents !== 2) throw new Error(`negative count ${ledger.counts.negative_documents}`);
if (ledger.counts.support_only_documents !== 1) throw new Error(`support-only count ${ledger.counts.support_only_documents}`);
if (ledger.documents.length !== 5) throw new Error('negative documents were discarded');

const byId = new Map(ledger.documents.map((row) => [row.document_identity, row]));
const a = byId.get('current-decision:100');
const b = byId.get('current-decision:101');
const c = byId.get('current-decision:102');
const d = byId.get('current-decision:103');
const e = byId.get('current-decision:104');

if (a.rule_match_fingerprint !== b.rule_match_fingerprint) {
  throw new Error('identical text produced disposition-dependent extraction');
}
if (!a.candidate_signal_fields.includes('explicit_order_or_directed_action')) throw new Error('directive match absent');
if (!a.candidate_signal_fields.includes('restoration_or_retroactive_benefit_language')) throw new Error('restoration match absent');
if (!a.candidate_signal_fields.includes('compliance_report_language')) throw new Error('compliance-language match absent');
if (!a.support_match_fields.includes('stated_amount_if_any')) throw new Error('amount support absent');
if (!a.support_match_fields.includes('stated_period_if_any')) throw new Error('period support absent');
if (!c.candidate_signal_fields.includes('remand_or_rehearing_language')) throw new Error('remand match absent');
if (d.candidate_state !== 'no_predeclared_rule_match') throw new Error('negative document promoted');
if (e.candidate_state !== 'no_predeclared_rule_match' || e.support_match_fields.length !== 2) {
  throw new Error('support-only document became a candidate');
}

for (const document of ledger.documents) {
  if (Object.keys(document.fields).length !== 7) throw new Error('negative field state not preserved');
  if (document.follow_up_authorized !== false) throw new Error('follow-up authority inflated');
  if (document.ordered_relief_observed !== false) throw new Error('ordered relief inferred from rule match');
  if (document.implementation_observed !== false) throw new Error('implementation inferred');
  if (document.separate_public_compliance_receipt_observed !== false) throw new Error('compliance receipt inferred');
  if (document.complete_restoration_observed !== false) throw new Error('restoration inferred');
  if (document.remedy_timeliness_observed !== false) throw new Error('timeliness inferred');
}
if (ledger.authority.follow_up_selection_authorized !== false) throw new Error('ledger follow-up authority inflated');
if (ledger.authority.graph_effect !== 'none') throw new Error('graph effect inflated');
if (ledger.boundaries.disposition_used_for_matching !== false) throw new Error('disposition boundary reversed');
if (ledger.boundaries.negative_documents_discarded !== false) throw new Error('negative custody boundary reversed');

const docDText = path.join(source, 'shard-01/doc-d/decision.txt');
const originalD = fs.readFileSync(docDText);
fs.writeFileSync(docDText, 'mutated');
let hashRefused = false;
try {
  extractCorpus({ sourceRoot: source, rulesPath: RULES, mode: 'test', expectedDocuments: 5 });
} catch (error) {
  hashRefused = error.message.includes('source text hash mismatch');
}
if (!hashRefused) throw new Error('source-text hash mutation was not refused');
fs.writeFileSync(docDText, originalD);

let denominatorRefused = false;
try {
  extractCorpus({ sourceRoot: source, rulesPath: RULES, mode: 'test', expectedDocuments: 4 });
} catch (error) {
  denominatorRefused = error.message.includes('document denominator mismatch');
}
if (!denominatorRefused) throw new Error('document denominator mutation was not refused');

let fullRefused = false;
try {
  extractCorpus({ sourceRoot: source, rulesPath: RULES, mode: 'full', expectedDocuments: 5 });
} catch (error) {
  fullRefused = error.message.includes('full extraction requires 11672');
}
if (!fullRefused) throw new Error('partial corpus was promoted to a full run');

const weakened = structuredClone(loaded.rules);
weakened.selection_boundaries.disposition_used_for_matching = true;
if (!validateRules(weakened).some((error) => error.includes('selection boundary disposition_used_for_matching'))) {
  throw new Error('disposition-selector mutation was not refused');
}
const positiveOnly = structuredClone(loaded.rules);
positiveOnly.population_contract.negative_documents_preserved = false;
if (!validateRules(positiveOnly).some((error) => error.includes('negative document custody'))) {
  throw new Error('negative-custody mutation was not refused');
}
const ruleShopping = structuredClone(loaded.rules);
ruleShopping.selection_boundaries.query_expansion_after_result_inspection = true;
if (!validateRules(ruleShopping).some((error) => error.includes('selection boundary query_expansion_after_result_inspection'))) {
  throw new Error('post-result rule shopping was not refused');
}
const outcomePattern = structuredClone(loaded.rules);
outcomePattern.text_rules[0].patterns[0].regex = '\\bgrant\\b';
if (!validateRules(outcomePattern).some((error) => error.includes('forbidden selector token'))) {
  throw new Error('outcome-selected pattern was not refused');
}

fs.rmSync(temp, { recursive: true, force: true });
console.log('ssc-rd04-a07-order-candidate-extractor.test: 5 synthetic documents + 8 adversarial controls PASS');
