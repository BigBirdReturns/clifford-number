#!/usr/bin/env node
import fs from 'node:fs';

const USER_AGENT = process.env.SEC_USER_AGENT ?? 'clifford-number research contact@example.com';
const targets = process.argv.slice(2).length ? process.argv.slice(2) : [
  '8VC',
  'Ribbit Capital',
  'Greylock Partners',
  'Fortress Investment',
  'Benchmark Capital',
  'Social Capital',
  'Affinity Partners'
];

async function secFetch(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/atom+xml,application/json,text/xml' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.text();
}

function parseEntries(atom) {
  return [...atom.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(([entry]) => ({
    title: entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '',
    cik: entry.match(/<cik>(.*?)<\/cik>/)?.[1]?.trim() ?? '',
    accession: entry.match(/accession-number=(.*?)(&|\")/)?.[1]?.trim() ?? '',
    updated: entry.match(/<updated>(.*?)<\/updated>/)?.[1]?.trim() ?? '',
    link: entry.match(/<link rel="alternate" type="text\/html" href="(.*?)"/)?.[1]?.trim() ?? ''
  }));
}

const output = {};
for (const target of targets) {
  const url = new URL('https://www.sec.gov/cgi-bin/browse-edgar');
  url.search = new URLSearchParams({ action: 'getcompany', company: target, type: 'D', owner: 'include', count: '100', output: 'atom' });
  console.error(`Searching Form D filings for ${target}...`);
  output[target] = parseEntries(await secFetch(url));
  await new Promise((resolve) => setTimeout(resolve, 150));
}

fs.writeFileSync('sec-formd-candidates.json', `${JSON.stringify(output, null, 2)}\n`);
console.error('Wrote sec-formd-candidates.json');
