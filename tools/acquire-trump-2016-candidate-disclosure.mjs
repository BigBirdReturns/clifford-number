#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './lib/trump-2016-candidate-disclosure.mjs';

const root = process.cwd();
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const sourceUrl = arg('url', 'https://s3.documentcloud.org/documents/2838696/Trump-2016-Financial-Disclosure.pdf');
const output = path.resolve(root, arg('output', 'build/trump-2016-candidate-disclosure/raw/Trump-2016-Financial-Disclosure.pdf'));
const expectedSha256 = arg('expected-sha256', '58c604ad776a4bb085bfabb65f8d848b57486e4aa5718d0dafc85aa810450db6');

const response = await fetch(sourceUrl, {
  headers: { 'User-Agent': 'clifford-number public-record research contact=repository-owner' },
  redirect: 'follow',
});
if (!response.ok) throw new Error(`candidate disclosure acquisition failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const observedSha256 = sha256(bytes);
if (observedSha256 !== expectedSha256) {
  throw new Error(`candidate disclosure hash mismatch: expected ${expectedSha256}, observed ${observedSha256}`);
}
if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('candidate disclosure response is not a PDF');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, bytes);
console.log(`acquire-trump-2016-candidate-disclosure: OK (${bytes.length} bytes; sha256 ${observedSha256})`);
