#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.resolve(root, 'build/source-acquisition/icij-offshoreleaks');
const archivePath = path.join(outputDir, 'full-oldb.LATEST.zip');
const extractedDir = path.join(outputDir, 'extracted');
const url = 'https://offshoreleaks-data.icij.org/offshoreleaks/csv/full-oldb.LATEST.zip';
const expectedSha256 = 'a2e37e8b878c12fb8f946d4e85026a4ae9026dc866b1aa925730bc1b50e52914';
const expectedFiles = ['GENERATED_ON_20250331.txt','nodes-entities.csv','nodes-officers.csv','nodes-addresses.csv','nodes-intermediaries.csv','nodes-others.csv','relationships.csv'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(archivePath)) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`ICIJ archive acquisition failed: HTTP ${response.status}`);
  fs.writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));
}
const bytes = fs.readFileSync(archivePath);
const observedSha256 = sha256(bytes);
if (observedSha256 !== expectedSha256) throw new Error(`ICIJ archive hash mismatch: ${observedSha256}`);
fs.mkdirSync(extractedDir, { recursive: true });
const extraction = spawnSync('tar', ['-xf', archivePath, '-C', extractedDir], { encoding: 'utf8' });
if (extraction.status !== 0) throw new Error(`ICIJ archive extraction failed: ${extraction.stderr || extraction.stdout}`);
for (const file of expectedFiles) if (!fs.existsSync(path.join(extractedDir, file))) throw new Error(`ICIJ archive missing expected file: ${file}`);
const receipt = {
  schema_version: 'icij-offshoreleaks-acquisition@1', source_url: url,
  bytes: bytes.length, sha256: observedSha256, expected_files: expectedFiles,
  archive_last_modified: '2025-03-31T09:28:02Z', archive_etag: '529434ea34b8dab98debc51200978f35-9',
  graph_effect: 'none',
};
fs.writeFileSync(path.join(outputDir, 'acquisition.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`acquire-icij-offshoreleaks: OK (${bytes.length} bytes; ${expectedFiles.length} files)`);
