#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  REPORTER_BRIEFING_INDEX_SCHEMA_VERSION,
  REPORTER_BRIEFING_REVIEW_QUEUE_SCHEMA_VERSION,
  compileReporterBriefing,
  reporterBriefingQueueEntry
} from './lib/reporter-briefing.mjs';
import { readJson, root, writeJson } from './lib/ledger.mjs';

const caseRoot = path.join(root, 'cases');
const directories = fs.readdirSync(caseRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(caseRoot, entry.name, 'briefing.json')))
  .map(entry => entry.name)
  .sort();

const manifests = [];
for (const caseId of directories) {
  const sourcePath = `cases/${caseId}/briefing.json`;
  const casePath = `build/cases/${caseId}.json`;
  if (!fs.existsSync(path.join(root, casePath))) throw new Error(`reporter briefing ${caseId} requires compiled case ${casePath}`);
  const spec = readJson(sourcePath);
  const caseItem = readJson(casePath);
  const { html, manifest } = compileReporterBriefing(spec, caseItem);
  const output = path.join(root, spec.output_path);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  writeJson(`build/briefings/${caseId}.json`, manifest);
  manifests.push(manifest);
}

writeJson('build/briefings/index.json', {
  schema_version: REPORTER_BRIEFING_INDEX_SCHEMA_VERSION,
  graph_effect: 'none',
  conclusion_generated: false,
  counts: {
    briefings: manifests.length,
    claims: manifests.reduce((total, item) => total + item.counts.claims, 0),
    verified_claims: manifests.reduce((total, item) => total + item.counts.verified_claims, 0),
    review_required_claims: manifests.reduce((total, item) => total + item.counts.review_required_claims, 0),
    public_receipts: manifests.reduce((total, item) => total + item.counts.public_receipts, 0)
  },
  briefings: manifests.map(item => ({
    briefing_id: item.briefing_id,
    case_id: item.case_id,
    title: item.title,
    version: item.publication.version,
    publication_status: item.publication.status,
    as_of: item.as_of,
    output_path: item.output_path,
    case_href: item.case_href,
    counts: item.counts,
    graph_effect: 'none'
  }))
});

const queue = manifests.map(reporterBriefingQueueEntry);
writeJson('build/review/reporter-briefing-queue.json', {
  schema_version: REPORTER_BRIEFING_REVIEW_QUEUE_SCHEMA_VERSION,
  graph_effect: 'none',
  conclusion_generated: false,
  totals: {
    briefings: queue.length,
    approved: queue.filter(item => item.publication_status === 'approved').length,
    review_required: queue.filter(item => item.publication_status === 'review_required').length,
    eligible_for_approval: queue.filter(item => item.eligible_for_approval).length
  },
  queue
});

console.log(`reporter briefings: ${manifests.length} compiled, ${queue.filter(item => item.eligible_for_approval).length} approval-ready`);
