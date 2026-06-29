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

async function secFetch(url, accept = 'application/atom+xml,application/json,text/xml') {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
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
  })).filter((entry) => entry.cik || entry.accession || entry.title);
}

async function submissionsFor(cik) {
  const padded = cik.padStart(10, '0');
  const text = await secFetch(`https://data.sec.gov/submissions/CIK${padded}.json`, 'application/json');
  const data = JSON.parse(text);
  const recent = data.filings?.recent ?? {};
  const forms = recent.form ?? [];
  return {
    cik: padded,
    entityName: data.name,
    formD: forms.map((form, index) => ({
      form,
      accessionNumber: recent.accessionNumber?.[index],
      filingDate: recent.filingDate?.[index],
      reportDate: recent.reportDate?.[index],
      primaryDocument: recent.primaryDocument?.[index]
    })).filter((filing) => filing.form === 'D' || filing.form === 'D/A')
  };
}

const output = {};
const ciks = new Set();
for (const target of targets) {
  const url = new URL('https://www.sec.gov/cgi-bin/browse-edgar');
  url.search = new URLSearchParams({ action: 'getcompany', company: target, type: 'D', owner: 'include', count: '100', output: 'atom' });
  console.error(`Searching browse-edgar Form D feed for ${target}...`);
  const candidates = parseEntries(await secFetch(url));
  candidates.forEach((entry) => { if (entry.cik) ciks.add(entry.cik); });
  output[target] = { browseEdgarUrl: url.toString(), candidates };
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const submissions = {};
for (const cik of ciks) {
  console.error(`Fetching submissions for CIK ${cik}...`);
  submissions[cik] = await submissionsFor(cik);
  await new Promise((resolve) => setTimeout(resolve, 150));
}

fs.writeFileSync('sec-formd-candidates.json', `${JSON.stringify({ targets: output, submissions }, null, 2)}\n`);
console.error('Wrote sec-formd-candidates.json');
