#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.resolve(process.env.A08_OUTPUT || path.join(root, 'a08-zero-candidate-reduction'));
const a07Root = path.join(root, 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07');
const a07ManifestPath = path.join(root, 'data/project/status-sovereignty-rd04-public-implementation-receipts-a07-release-manifest.json');
const explicitPath = path.join(a07Root, 'source-custody/candidate-receipts/explicit-language-candidates.json');
const officialPath = path.join(a07Root, 'source-custody/official-crawl/case-joined-machine-candidates.json');
const expectedRelease = 'a4be788259cd48235006d06b43271e61de625b72f2c7bb6d8663e63b82d520a3';
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (name, value) => fs.writeFileSync(path.join(output, name), stable(value));

function normalize(value) {
  return String(value ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
}

function actionContexts(text) {
  const normalized = normalize(text);
  const patterns = [
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+restored\b/gi,
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+issued\s+(?:a\s+)?(?:payment|benefits?|allotment|corrective\s+payment)\b/gi
  ];
  const disqualifiers = [
    /\b(?:appellant|claimant|plaintiff|petitioner|respondent|county|agency)\s+(?:states|stated|alleges|alleged|claims|claimed|contends|contended|argues|argued)\b/i,
    /\b(?:shall|must|should|may|will|would|could)\s+(?:be\s+)?(?:restored|reinstated|issued|paid|provided|complied)\b/i,
    /\b(?:is|was|were)\s+ordered\s+to\b/i,
    /\bif\s+(?:the\s+)?(?:county|agency|department|state)\b/i,
    /\bnot\s+(?:yet\s+)?(?:restored|reinstated|issued|paid|provided|complied)\b/i
  ];
  const rows = [];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const start = Math.max(0, match.index - 500);
      const end = Math.min(normalized.length, match.index + match[0].length + 500);
      const context = normalized.slice(start, end);
      const classes = disqualifiers
        .map((rule, index) => ({ index, hit: rule.test(context) }))
        .filter((row) => row.hit)
        .map((row) => row.index);
      rows.push({
        phrase: match[0],
        context,
        context_sha256: sha256(Buffer.from(context, 'utf8')),
        disqualified: classes.length > 0,
        disqualifier_classes: classes
      });
    }
  }
  const unique = new Map(rows.map((row) => [row.context_sha256, row]));
  return [...unique.values()].sort((a, b) => a.context_sha256.localeCompare(b.context_sha256));
}

const core = readJson(path.join(a07Root, 'core.json'));
const manifest = readJson(a07ManifestPath);
const explicit = readJson(explicitPath);
const official = readJson(officialPath);
if (core.execution_id !== 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07') throw new Error(`A07 execution ${core.execution_id}`);
if (manifest.combined_sha256 !== expectedRelease) throw new Error(`A07 release ${manifest.combined_sha256}`);
if (core.counts.same_shn_explicit_language_candidates !== 0 || core.counts.official_case_joined_machine_candidates !== 0) {
  throw new Error('A07 candidate counters are not zero');
}
if (!Array.isArray(explicit) || !Array.isArray(official)) throw new Error('A07 candidate ledgers must be arrays');
if (explicit.length !== 0 || official.length !== 0) throw new Error(`A08 zero-candidate reducer received ${explicit.length + official.length} candidates`);

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const controls = [
  'The county must restore benefits.',
  'The appellant alleges the county has restored benefits.',
  'The county has not restored benefits.',
  'If the county restores benefits, the appeal may be withdrawn.',
  'The county was ordered to issue payment.'
].map((text) => ({ text, contexts: actionContexts(`SHN 000000 ${text}`) }));
const controlFailures = controls.filter((row) => row.contexts.some((context) => !context.disqualified));
if (controlFailures.length) throw new Error(`negative-control failures ${controlFailures.length}`);

const summary = {
  schema_version: 'ssc-rd04-a08-internal-adjudication@1',
  issue_title: 'SSC RD-04 A08 · Internal adjudication and public-source refresh',
  status: 'pass',
  parent: {
    execution_id: core.execution_id,
    release_sha256: manifest.combined_sha256,
    machine_candidate_denominator: 0,
    verified_public_implementation_receipts: core.counts.verified_public_implementation_receipts,
    verified_public_restoration_receipts: core.counts.verified_public_restoration_receipts
  },
  counts: {
    same_shn_decision_candidates: 0,
    official_page_candidates: 0,
    total_machine_candidates: 0,
    adjudicated_candidates: 0,
    internally_supported_public_completed_action_receipts: 0,
    internally_supported_public_restoration_receipts: 0,
    rejected_or_unresolved_candidates: 0,
    negative_controls: controls.length,
    negative_control_failures: 0,
    source_or_structure_failures: 0,
    external_contacts: 0,
    external_reviews: 0,
    graph_effects: 0
  },
  authority: {
    internal_adjudication_is_external_review: false,
    same_shn_alone_proves_claimant_identity: false,
    official_page_string_hit_proves_case_specific_implementation: false,
    internally_supported_receipt_requires_exact_source_and_two_independent_rules: true,
    missing_public_material_is_noncompliance: false,
    project_blocking: false,
    external_contacts: 0,
    external_reviews: 0,
    graph_effect: 'none'
  },
  failures: []
};
writeJson('adjudications.json', []);
writeJson('failure-ledger.json', []);
writeJson('internally-supported-receipts.json', []);
writeJson('negative-controls.json', controls);
writeJson('rejected-or-unresolved-candidates.json', []);
writeJson('summary.json', summary);
console.log('reduce-zero-candidate-denominator: PASS — exact denominator 0, five negative controls, zero authority change');
