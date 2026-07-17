#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeEntityUrl, filingHistoryUrl, buildRegistryIntake } from './lib/ny-registry-entity-intake.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const input = path.resolve(root, arg('input', 'build/oge-fec-embedded-name/fec-oppexp-cohort-local-20260713-r2/embedded-name-candidates.jsonl'));
const outputDir = path.resolve(root, arg('output-dir', 'build/ny-registry-embedded-entities'));
const durableOutput = arg('durable-output', '');
const nameToken = arg('name-token', 'TRUMP').toUpperCase();
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const inputBytes = fs.readFileSync(input);
const allEmbedded = inputBytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const embedded = allEmbedded.filter(row => row?.match?.matched_tokens?.includes(nameToken));
const names = [...new Set(embedded.map(row => row?.match?.normalized_fec_payee_name).filter(Boolean))].sort();
const headers = { 'User-Agent': 'clifford-number public-record research contact=repository-owner', Accept: 'application/json' };
const activeUrl = activeEntityUrl(names);
const activeResponse = await fetch(activeUrl, { headers });
if (!activeResponse.ok) throw new Error(`NY active-entity query failed: ${activeResponse.status}`);
const activeText = await activeResponse.text();
const activeRows = JSON.parse(activeText);
const ids = [...new Set(activeRows.map(row => Number(row.dos_id)).filter(Number.isFinite))];
let filingsText = '[]';
let filings = [];
let filingsUrl = null;
if (ids.length) {
  filingsUrl = filingHistoryUrl(ids);
  const filingsResponse = await fetch(filingsUrl, { headers });
  if (!filingsResponse.ok) throw new Error(`NY filing-history query failed: ${filingsResponse.status}`);
  filingsText = await filingsResponse.text();
  filings = JSON.parse(filingsText);
}
const intake = buildRegistryIntake(activeRows, filings, embedded);
const intakeText = intake.map(row => JSON.stringify(row)).join('\n') + (intake.length ? '\n' : '');
const filingsOut = filings.map(row => JSON.stringify(row)).join('\n') + (filings.length ? '\n' : '');
fs.writeFileSync(path.join(outputDir, 'registry-entity-intake.jsonl'), intakeText);
fs.writeFileSync(path.join(outputDir, 'registry-filing-history.jsonl'), filingsOut);
const manifest = {
  schema_version: 'ny-registry-embedded-entity-manifest@1',
  input: { path: path.basename(input), bytes: inputBytes.length, sha256: sha256(inputBytes) },
  source: {
    provider: 'New York State Department of State via data.ny.gov',
    active_dataset_id: 'n9v6-gdp6',
    filing_history_dataset_id: '63wc-4exh',
    active_query_url: activeUrl.toString(),
    filing_history_query_url: filingsUrl?.toString() ?? null,
    active_response_sha256: sha256(activeText),
    filing_history_response_sha256: sha256(filingsText),
    retrieved_at: new Date().toISOString(),
    access_mode: 'official_public_no_key_api',
  },
  names_queried: names.length,
  candidate_rows_in_input: allEmbedded.length,
  candidate_rows_selected_by_token: embedded.length,
  selection_token: nameToken,
  exact_active_registry_matches: intake.length,
  filing_history_records: filings.length,
  outputs: {
    intake: { path: 'registry-entity-intake.jsonl', bytes: Buffer.byteLength(intakeText), sha256: sha256(intakeText) },
    filings: { path: 'registry-filing-history.jsonl', bytes: Buffer.byteLength(filingsOut), sha256: sha256(filingsOut) },
  },
  interpretation: 'An official registry identifier resolves a registry node. It does not by itself prove that an FEC payee label is that node, beneficial ownership, continuous activity, payment semantics, or wrongdoing.',
  verification_status: 'official_responses_hash_pinned_identity_links_unresolved',
  graph_effect: 'none',
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestText);
if (durableOutput) {
  const target = path.resolve(root, durableOutput);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, manifestText);
}
console.log(`ny-registry-embedded-entities: ${intake.length}/${names.length} exact registry nodes; ${filings.length} filing records`);
