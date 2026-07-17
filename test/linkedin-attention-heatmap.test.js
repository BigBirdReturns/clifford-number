import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-linkedin-heatmap-'));
const attentionPath = path.join(fixture, 'attention.jsonl');
const capturePath = path.join(fixture, 'captures.jsonl');
const outputPath = path.join(fixture, 'heatmap.json');
const attention = [
  { attention_id: 'a1', category: 'reactions', observed_at: '2025-01-01T00:00:00Z', url: 'https://www.linkedin.com/posts/one', activity_summary: 'LIKE' },
  { attention_id: 'a2', category: 'comments', observed_at: '2025-01-02T00:00:00Z', url: 'https://www.linkedin.com/posts/one', activity_summary: 'Comment' },
  { attention_id: 'a3', category: 'search_queries', observed_at: '2025-02-01T00:00:00Z', url: null, activity_summary: 'Example Person' },
];
const captures = [
  { capture_id: 'c1', series_id: 's1', observed_at: '2025-01-03T00:00:00Z', subject: { label: 'Example Person', profile_url: 'https://www.linkedin.com/in/example-person' } },
  { capture_id: 'c2', series_id: 's1', observed_at: '2025-02-03T00:00:00Z', subject: { label: 'Example Person', profile_url: 'https://www.linkedin.com/in/example-person' } },
];
fs.writeFileSync(attentionPath, `${attention.map(row => JSON.stringify(row)).join('\n')}\n`);
fs.writeFileSync(capturePath, `${captures.map(row => JSON.stringify(row)).join('\n')}\n`);
execFileSync(process.execPath, ['tools/build-linkedin-attention-heatmap.mjs'], {
  cwd: root,
  stdio: 'pipe',
  env: {
    ...process.env,
    LINKEDIN_ATTENTION_PATH: attentionPath,
    LINKEDIN_PROFILE_CAPTURES_PATH: capturePath,
    LINKEDIN_HEATMAP_PATH: outputPath,
  },
});
const heatmap = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(heatmap.source_counts.attention_observations, 3);
assert.equal(heatmap.source_counts.distinct_target_urls, 1);
assert.equal(heatmap.target_hotspots[0].observation_count, 2);
assert.deepEqual(heatmap.target_hotspots[0].categories, { reactions: 1, comments: 1 });
assert.equal(heatmap.profile_series[0].capture_count, 2);
assert.equal(heatmap.profile_series[0].attention_match.observation_count, 1);
assert.equal(heatmap.graph_effect, 'none');
fs.rmSync(fixture, { recursive: true, force: true });
console.log('linkedin-attention-heatmap.test.js: OK');
