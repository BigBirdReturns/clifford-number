#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';
import { loadCliffordCrossCorpusPublicInterestMap, validateCliffordCrossCorpusPublicInterestMap } from './lib/clifford-cross-corpus-public-interest-map.mjs';
import { readPublicationPolicy, listArtifactFiles, matchesHeldRule } from './lib/publication-allowlist.mjs';

const destination = path.join(root, 'dist');
const mapBundle = loadCliffordCrossCorpusPublicInterestMap();
const mapErrors = validateCliffordCrossCorpusPublicInterestMap(mapBundle);
if (mapErrors.length) throw new Error(`public map is stale or invalid: ${mapErrors.join('; ')}`);

const { policy } = readPublicationPolicy({ root });
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
let copied = 0;
for (const relativePath of policy.paths) {
  const producer = policy.generated_paths?.[relativePath];
  if (producer) {
    if (relativePath === '.nojekyll') fs.writeFileSync(path.join(destination, relativePath), '');
    continue;
  }
  const sourcePath = policy.source_overrides?.[relativePath] ?? relativePath;
  const source = path.join(root, ...sourcePath.split('/'));
  const target = path.join(destination, ...relativePath.split('/'));
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`allowlisted publication source must be a regular file: ${sourcePath}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  copied += 1;
}
const observed = listArtifactFiles(destination);
for (const relativePath of observed) {
  if (!policy.paths.includes(relativePath)) throw new Error(`builder emitted unallowlisted path ${relativePath}`);
  if ((policy.held_exact_paths ?? []).includes(relativePath)) throw new Error(`builder emitted held path ${relativePath}`);
  for (const rule of policy.held_rules ?? []) {
    if (matchesHeldRule(relativePath, rule)) throw new Error(`builder emitted path held by ${rule.kind}:${rule.value}: ${relativePath}`);
  }
}
console.log(`build-pages: copied ${copied} exact allowlisted source files; ${observed.length} pre-finalization files`);
