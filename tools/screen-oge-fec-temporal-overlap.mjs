#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { classifyTemporalCandidate, sha256 } from './lib/oge-fec-temporal-screen.mjs';

const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = process.cwd();
const input = path.resolve(root, arg('input', 'build/oge-fec-overlap/fec-oppexp-cohort-local-20260713-r2/overlap-candidates.jsonl'));
const outputDir = path.resolve(root, arg('output-dir', 'build/oge-fec-temporal-screen/fec-oppexp-cohort-local-20260713-r2'));
const durableArg = arg('durable-output', '');
const durable = durableArg ? path.resolve(root, durableArg) : null;
fs.mkdirSync(outputDir, { recursive: true });

const inputBytes = fs.readFileSync(input);
const rows = [];
const counts = { overlapping: 0, non_overlapping: 0, temporally_unknown: 0 };
const stream = readline.createInterface({ input: fs.createReadStream(input), crlfDelay: Infinity });
for await (const line of stream) {
  if (!line.trim()) continue;
  const row = classifyTemporalCandidate(JSON.parse(line));
  counts[row.temporal_relation] += 1;
  rows.push(row);
}
const output = path.join(outputDir, 'temporal-dispositions.jsonl');
fs.writeFileSync(output, `${rows.map(JSON.stringify).join('\n')}${rows.length ? '\n' : ''}`);
const outputBytes = fs.readFileSync(output);
const manifest = {
  schema_version: 'oge-fec-temporal-screen-manifest@1',
  input: { path: path.basename(input), bytes: inputBytes.length, sha256: sha256(inputBytes) },
  output: { path: path.basename(output), bytes: outputBytes.length, sha256: sha256(outputBytes) },
  candidate_pairs_screened: rows.length,
  dispositions: counts,
  identity_review_queue: counts.overlapping,
  crossing_matches: 0,
  interpretation: 'Only lexical candidates with strict bounded date overlap can proceed to legal-entity identity review. Overlap would still not establish identity, beneficial ownership, payment semantics, causation, or wrongdoing.',
  verification_status: 'machine_generated_unreviewed',
  graph_effect: 'none',
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
if (durable) {
  fs.mkdirSync(path.dirname(durable), { recursive: true });
  fs.writeFileSync(durable, `${JSON.stringify({ ...manifest, durable_artifact: true, dispositions_artifact: `${path.relative(root, output).replaceAll('\\', '/')} (gitignored; hash-pinned above)` }, null, 2)}\n`);
}
console.log(`oge-fec-temporal-screen: OK (${rows.length} screened; ${counts.overlapping} overlapping, ${counts.non_overlapping} non-overlapping, ${counts.temporally_unknown} unknown)`);
