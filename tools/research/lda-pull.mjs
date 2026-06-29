#!/usr/bin/env node
import fs from 'node:fs';

const API_KEY = process.env.LDA_API_KEY;
const BASE = process.env.LDA_API_BASE ?? 'https://lda.senate.gov/api/v1';
const clients = (process.argv.slice(2).length ? process.argv.slice(2) : ['Palantir', 'SpaceX', 'Meta', 'Google', 'Walmart']);

if (!API_KEY) {
  console.error('Set LDA_API_KEY before running.');
  process.exit(2);
}

async function getJson(url, params = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') target.searchParams.set(key, value);
  }
  const response = await fetch(target, { headers: { Authorization: `Token ${API_KEY}` } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

async function filingsFor(clientName) {
  let url = `${BASE}/filings/`;
  const rows = [];
  let params = { client_name: clientName };
  while (url) {
    const page = await getJson(url, params);
    rows.push(...(page.results ?? []));
    url = page.next;
    params = {};
    if (url) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return rows;
}

const output = {};
for (const client of clients) {
  console.error(`Pulling LDA filings for ${client}...`);
  output[client] = await filingsFor(client);
}

fs.writeFileSync('lda-filings.json', `${JSON.stringify(output, null, 2)}\n`);
console.error('Wrote lda-filings.json');
