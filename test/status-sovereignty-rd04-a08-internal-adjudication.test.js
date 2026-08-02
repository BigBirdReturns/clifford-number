#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateA08
} from '../tools/validate-status-sovereignty-rd04-a08-internal-adjudication.mjs';
import {
  a08Paths,
  MANIFEST_SCOPE
} from '../tools/build-status-sovereignty-rd04-a08-internal-adjudication.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const positive = validateA08(ROOT);
if (positive.length) throw new Error(`positive A08 corpus failed:\n${positive.join('\n')}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rd04-a08-test-'));
const copy = (rel) => {
  const source = path.join(ROOT, rel);
  const target = path.join(temp, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};
for (const rel of [...MANIFEST_SCOPE, a08Paths.manifest, a08Paths.parentCore, a08Paths.parentManifest]) copy(rel);

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(temp, rel), 'utf8'));
const writeJson = (rel, value) => fs.writeFileSync(path.join(temp, rel), `${JSON.stringify(value, null, 2)}\n`);
const readText = (rel) => fs.readFileSync(path.join(temp, rel), 'utf8');
const writeText = (rel, value) => fs.writeFileSync(path.join(temp, rel), value);

const J = a08Paths.receipt;
const C = a08Paths.core;
const A = a08Paths.adjudications;
const S = a08Paths.supported;
const R = a08Paths.rejected;
const F = a08Paths.failures;
const N = a08Paths.controls;
const SC = a08Paths.schema;
const M = a08Paths.manifest;
const P = a08Paths.parentCore;
const PM = a08Paths.parentManifest;
const H = a08Paths.report;
const D = a08Paths.milestone;
const W = a08Paths.workflow;

const jsonCases = [
  ['parent execution drift', P, (row) => { row.execution_id = 'OTHER'; }, 'A07 parent execution'],
  ['parent candidate inflation', P, (row) => { row.counts.same_shn_explicit_language_candidates = 1; }, 'A07 same-SHN candidate denominator'],
  ['parent official candidate inflation', P, (row) => { row.counts.official_case_joined_machine_candidates = 1; }, 'A07 official candidate denominator'],
  ['parent route drift', P, (row) => { row.counts.official_selected_urls = 346; }, 'A07 frozen selected URL denominator'],
  ['parent absence laundering', P, (row) => { row.current_result.missing_public_receipt_is_noncompliance = true; }, 'A07 missing-public-material boundary'],
  ['parent manifest drift', PM, (row) => { row.combined_sha256 = '0'.repeat(64); }, 'A07 parent release manifest'],

  ['receipt schema drift', J, (row) => { row.schema_version = 'bad'; }, 'receipt schema'],
  ['receipt status drift', J, (row) => { row.status = 'failure'; }, 'receipt status'],
  ['receipt parent opening', J, (row) => { row.parent.unreviewed = true; }, 'receipt parent closed shape'],
  ['receipt merge drift', J, (row) => { row.parent.a07_merge = '0'.repeat(40); }, 'receipt A07 merge'],
  ['receipt proof drift', J, (row) => { row.parent.a07_postmerge_proof_run = 1; }, 'receipt A07 proof run'],
  ['receipt workflow drift', J, (row) => { row.execution.workflow_run = 1; }, 'A08 execution run'],
  ['receipt adjudicator drift', J, (row) => { row.execution.adjudicator_git_blob_sha1 = '0'.repeat(40); }, 'A08 adjudicator blob'],
  ['receipt artifact drift', J, (row) => { row.execution.artifact_id = 1; }, 'A08 artifact id'],
  ['receipt candidate inflation', J, (row) => { row.counts.total_machine_candidates = 1; }, 'receipt zero count total_machine_candidates'],
  ['receipt adjudication inflation', J, (row) => { row.counts.adjudicated_candidates = 1; }, 'receipt zero count adjudicated_candidates'],
  ['receipt supported inflation', J, (row) => { row.counts.internally_supported_public_completed_action_receipts = 1; }, 'receipt zero count internally_supported_public_completed_action_receipts'],
  ['receipt restoration inflation', J, (row) => { row.counts.internally_supported_public_restoration_receipts = 1; }, 'receipt zero count internally_supported_public_restoration_receipts'],
  ['receipt control failure', J, (row) => { row.counts.negative_control_failures = 1; }, 'receipt zero count negative_control_failures'],
  ['receipt external contact', J, (row) => { row.counts.external_contacts = 1; }, 'receipt zero count external_contacts'],
  ['receipt missing-public laundering', J, (row) => { row.boundaries.missing_public_material_is_noncompliance = true; }, 'deterministic core projection'],
  ['receipt two-rule weakening', J, (row) => { row.boundaries.internally_supported_receipt_requires_exact_source_and_two_independent_rules = false; }, 'deterministic core projection'],

  ['adjudication injection', A, (row) => { row.push({candidate_id:'invented'}); }, 'adjudications ledger denominator'],
  ['supported injection', S, (row) => { row.push({receipt_id:'invented'}); }, 'supported receipt denominator'],
  ['rejected injection', R, (row) => { row.push({candidate_id:'invented'}); }, 'rejected or unresolved denominator'],
  ['failure injection', F, (row) => { row.push({message:'invented'}); }, 'failure ledger denominator'],
  ['control removal', N, (row) => { row.pop(); }, 'negative-control ledger denominator'],
  ['control identity drift', N, (row) => { row[0].control_id = 'OTHER'; }, 'negative-control identities'],
  ['control pass reversal', N, (row) => { row[1].pass = false; }, 'A08-NC-02 pass state'],
  ['control expected drift', N, (row) => { row[2].observed = 'completed_action'; }, 'A08-NC-03 expected result'],

  ['core candidate inflation', C, (row) => { row.candidate_denominator.admitted_machine_candidates = 1; }, 'deterministic core projection'],
  ['core refresh completion inflation', C, (row) => { row.public_source_refresh.complete = true; }, 'deterministic core projection'],
  ['core implementation inflation', C, (row) => { row.current_result.verified_implementation_supported = true; }, 'deterministic core projection'],
  ['core residual closure', C, (row) => { row.current_result.residual_class_closed = true; }, 'deterministic core projection'],
  ['core external review', C, (row) => { row.authority.external_reviews = 1; }, 'deterministic core projection'],
  ['core graph effect', C, (row) => { row.authority.graph_effect = 'add'; }, 'deterministic core projection'],

  ['schema opening', SC, (row) => { row.additionalProperties = true; }, 'schema top-level closed shape'],
  ['schema candidate weakening', SC, (row) => { row.properties.candidate_denominator.properties.admitted_machine_candidates.const = 1; }, 'schema candidate ceiling'],
  ['schema supported weakening', SC, (row) => { row.properties.adjudication.properties.internally_supported_public_completed_action_receipts.const = 1; }, 'schema supported receipt ceiling'],
  ['schema refresh inflation', SC, (row) => { row.properties.public_source_refresh.properties.complete.const = true; }, 'schema refresh boundary'],
  ['schema contact inflation', SC, (row) => { row.properties.authority.properties.external_contacts.const = 1; }, 'schema external contact ceiling'],
  ['schema absence laundering', SC, (row) => { row.properties.boundaries.properties.missing_public_material_is_noncompliance.const = true; }, 'schema absence semantics'],

  ['manifest path removal', M, (row) => { row.entries.pop(); }, 'exact-byte release manifest'],
  ['manifest digest drift', M, (row) => { row.combined_sha256 = '0'.repeat(64); }, 'exact-byte release manifest'],
  ['manifest self inclusion', M, (row) => { row.self_included = true; }, 'exact-byte release manifest']
];

for (const [name, rel, mutate, expected] of jsonCases) {
  const original = readJson(rel);
  const changed = structuredClone(original);
  mutate(changed);
  writeJson(rel, changed);
  const errors = validateA08(temp);
  writeJson(rel, original);
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors.slice(0, 20))}`);
  }
}

const textCases = [
  ['report robots removal', H, (text) => text.replace('noindex,nofollow,noarchive', 'index,follow'), 'held report robots boundary'],
  ['report zero statement removal', H, (text) => text.replace('zero case-joined machine candidates', 'some candidates'), 'held report zero-candidate statement'],
  ['milestone candidate inflation', D, (text) => text.replace('same-SHN decision candidates:                    0', 'same-SHN decision candidates:                    1'), 'milestone candidate denominator'],
  ['workflow write permission', W, (text) => text.replace('permissions:\n  contents: read', 'permissions:\n  contents: write'), 'workflow read-only permission'],
  ['workflow builder removal', W, (text) => text.replace(`node ${a08Paths.builder}`, 'true'), 'workflow deterministic builder'],
  ['workflow drift refusal removal', W, (text) => text.replace('git diff --exit-code', 'true'), 'workflow deterministic drift refusal']
];

for (const [name, rel, mutate, expected] of textCases) {
  const original = readText(rel);
  const changed = mutate(original);
  if (changed === original) throw new Error(`${name}: mutation did not alter source`);
  writeText(rel, changed);
  const errors = validateA08(temp);
  writeText(rel, original);
  if (!errors.some((error) => error.includes(expected))) {
    throw new Error(`${name}: expected refusal containing ${JSON.stringify(expected)}; observed ${JSON.stringify(errors.slice(0, 20))}`);
  }
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(`status-sovereignty-rd04-a08-internal-adjudication.test: 1 positive + ${jsonCases.length + textCases.length} adversarial mutations PASS`);
