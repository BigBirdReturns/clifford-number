#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { stableJson } from './lib/openfec-cohort.mjs';
import { normalizeBulkOperatingExpenditure, operatingExpenditureUrl, parseOperatingExpenditureLine } from './lib/fec-bulk-oppexp.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(`--${flag}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = process.cwd();
const input = value('input');
const cycle = Number(value('cycle'));
const identifiersFile = path.resolve(root, value('identifiers', 'data/research/openfec-presidential-identifiers.json'));
const outputDir = path.resolve(root, value('output', 'build/fec-bulk-oppexp'));

if (!input || !Number.isInteger(cycle)) {
  console.error('Usage: npm run ingest:fec-bulk-disbursements -- --cycle 2020 --input PATH_TO_EXTRACTED_OPPEXP_FILE');
  console.error('Official no-key files: https://www.fec.gov/data/browse-data/?tab=bulk-data');
  process.exit(2);
}

const inputFile = path.resolve(root, input);
if (!fs.existsSync(inputFile)) throw new Error(`input file does not exist: ${inputFile}`);
const sourceUrl = operatingExpenditureUrl(cycle);
const identifiers = JSON.parse(fs.readFileSync(identifiersFile, 'utf8'));
const committees = new Map(identifiers.identities.flatMap(identity => identity.authorized_committees.map(committee => [committee.committee_id, {
  cohort_id: identifiers.cohort_id,
  person_id: identity.person_id,
  person_name: identity.person_name,
  candidate_id: identity.candidate_id,
  committee_name: committee.name,
}])));

async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

const sourceSha256 = await hashFile(inputFile);
fs.mkdirSync(outputDir, { recursive: true });
const recordsFile = path.join(outputDir, 'records.jsonl');
fs.writeFileSync(recordsFile, '');
let sourceRows = 0;
let matchedRows = 0;
const committeesObserved = new Set();
const stream = readline.createInterface({ input: fs.createReadStream(inputFile), crlfDelay: Infinity });
for await (const line of stream) {
  sourceRows += 1;
  if (!line.trim()) continue;
  const row = parseOperatingExpenditureLine(line);
  const committee = committees.get(row.CMTE_ID);
  if (!committee) continue;
  const normalized = normalizeBulkOperatingExpenditure(row, {
    ...committee,
    source_url: sourceUrl,
    source_sha256: sourceSha256,
    source_line: sourceRows,
  });
  fs.appendFileSync(recordsFile, `${stableJson(normalized)}\n`);
  matchedRows += 1;
  committeesObserved.add(row.CMTE_ID);
}

const manifest = {
  schema_version: 'fec-bulk-operating-expenditure-manifest@1',
  cohort_id: identifiers.cohort_id,
  cycle,
  official_source_url: sourceUrl,
  access_mode: 'public_bulk_download_no_api_key',
  input_file: path.basename(inputFile),
  source_sha256: sourceSha256,
  source_rows_scanned: sourceRows,
  matched_records_observed: matchedRows,
  cohort_committees_observed: [...committeesObserved].sort(),
  cohort_committees_expected_across_all_cycles: committees.size,
  coverage_status: 'one_cycle_file_complete_input_scan',
  interpretation: 'This manifest covers one supplied official FEC cycle file. It does not establish complete Schedule B coverage across other cycles, resolve payee identity, or establish beneficial ownership.',
  consumption: identifiers.consumption,
  graph_effect: 'none',
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`FEC bulk operating expenditures: ${sourceRows} source row(s), ${matchedRows} cohort record(s), ${committeesObserved.size} committee(s)`);
console.log(`output: ${path.relative(root, outputDir).replaceAll('\\', '/')}`);
