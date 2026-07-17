#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const resolve = location => path.isAbsolute(location) ? location : path.join(root, location);
const readJsonl = location => {
  const file = resolve(location);
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
    : [];
};
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalized = value => clean(value).normalize('NFKC').toLocaleLowerCase('en-US');
const digest = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
const increment = (object, key, amount = 1) => { object[key] = (object[key] ?? 0) + amount; };
const range = rows => ({
  first_observed: rows.map(row => row.observed_at).sort()[0] ?? null,
  last_observed: rows.map(row => row.observed_at).sort().at(-1) ?? null,
});

const attention = readJsonl(process.env.LINKEDIN_ATTENTION_PATH ?? 'data/local/linkedin-attention.jsonl');
const captures = readJsonl(
  process.env.LINKEDIN_PROFILE_CAPTURES_PATH ?? 'data/local/linkedin-profile-captures.jsonl',
);
const output = resolve(process.env.LINKEDIN_HEATMAP_PATH ?? 'data/local/linkedin-attention-heatmap.json');

const categories = {};
const monthly = new Map();
for (const row of attention) {
  increment(categories, row.category);
  const month = row.observed_at.slice(0, 7);
  if (!monthly.has(month)) monthly.set(month, { month, total: 0, categories: {} });
  const point = monthly.get(month);
  point.total += 1;
  increment(point.categories, row.category);
}

const byTarget = new Map();
for (const row of attention.filter(item => /^https?:\/\//i.test(item.url ?? ''))) {
  const key = clean(row.url);
  if (!byTarget.has(key)) byTarget.set(key, []);
  byTarget.get(key).push(row);
}
const targetHotspots = [...byTarget].map(([url, rows]) => {
  const byCategory = {};
  for (const row of rows) increment(byCategory, row.category);
  return {
    target_id: `litarget_${digest(url)}`,
    url,
    observation_count: rows.length,
    categories: byCategory,
    ...range(rows),
    source_observation_ids: rows.map(row => row.attention_id).sort(),
    graph_effect: 'none',
  };
}).sort((a, b) => b.observation_count - a.observation_count || a.target_id.localeCompare(b.target_id));

const queries = new Map();
for (const row of attention.filter(item => item.category === 'search_queries' && clean(item.activity_summary))) {
  const key = normalized(row.activity_summary);
  if (!queries.has(key)) queries.set(key, []);
  queries.get(key).push(row);
}
const queryHotspots = [...queries].map(([key, rows]) => ({
  query_id: `liquery_${digest(key)}`,
  query: clean(rows[0].activity_summary),
  observation_count: rows.length,
  ...range(rows),
  source_observation_ids: rows.map(row => row.attention_id).sort(),
  publication_status: 'private_intake',
  graph_effect: 'none',
})).sort((a, b) => b.observation_count - a.observation_count || a.query_id.localeCompare(b.query_id));

const capturesBySeries = new Map();
for (const capture of captures) {
  if (!capturesBySeries.has(capture.series_id)) capturesBySeries.set(capture.series_id, []);
  capturesBySeries.get(capture.series_id).push(capture);
}
const profiles = [...capturesBySeries].map(([seriesId, rows]) => {
  const label = clean(rows.find(row => clean(row.subject?.label))?.subject?.label);
  const exactMatches = attention.filter(row => normalized(row.activity_summary) === normalized(label));
  return {
    series_id: seriesId,
    label,
    profile_url: rows.find(row => clean(row.subject?.profile_url))?.subject?.profile_url ?? null,
    capture_count: rows.length,
    ...range(rows),
    capture_ids: rows.map(row => row.capture_id).sort(),
    attention_match: {
      match_basis: 'exact_normalized_activity_summary',
      observation_count: exactMatches.length,
      source_observation_ids: exactMatches.map(row => row.attention_id).sort(),
    },
    publication_status: 'private_intake',
    graph_effect: 'none',
  };
}).sort((a, b) => b.capture_count - a.capture_count || a.series_id.localeCompare(b.series_id));

const heatmap = {
  schema_version: 'linkedin-attention-heatmap@1',
  generated_at: new Date().toISOString(),
  source_counts: {
    attention_observations: attention.length,
    profile_captures: captures.length,
    distinct_target_urls: targetHotspots.length,
    distinct_queries: queryHotspots.length,
    profile_series: profiles.length,
  },
  coverage: range([...attention, ...captures]),
  categories,
  monthly_activity: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
  target_hotspots: targetHotspots,
  query_hotspots: queryHotspots,
  profile_series: profiles,
  interpretation: {
    target_frequency: 'Counts only the researcher actions preserved in this archive. It is an attention scaffold, not a platform-wide popularity or relationship measure.',
    profile_capture: 'A capture records what a LinkedIn-generated PDF displayed at that time; it does not independently verify its biographical claims.',
    exact_name_match: 'An exact normalized text match is a discovery join only and may require identity resolution.',
  },
  publication_status: 'private_intake',
  graph_effect: 'none',
  verification_status: 'machine_proposed_unverified',
};

fs.mkdirSync(path.dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
fs.writeFileSync(temporary, `${JSON.stringify(heatmap, null, 2)}\n`);
fs.renameSync(temporary, output);
console.log(`LinkedIn attention heatmap: ${attention.length} observations, ${targetHotspots.length} URL targets`);
console.log(`  ${queryHotspots.length} query clusters; ${profiles.length} profile series from ${captures.length} captures`);
console.log(`  private output: ${path.relative(root, output) || output}`);
