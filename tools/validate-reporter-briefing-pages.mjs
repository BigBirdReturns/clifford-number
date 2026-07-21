#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(destination, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const exists = file => fs.existsSync(path.join(destination, file));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

const fail = message => {
  console.error(`validate-reporter-briefing-pages failed: ${message}`);
  process.exit(1);
};

for (const file of [
  'build/briefings/index.json',
  'build/review/reporter-briefing-queue.json',
  'build/public-catalog.json',
  'Clifford-Number-standalone.html'
]) if (!exists(file)) fail(`missing ${file}`);

const index = readJson('build/briefings/index.json');
const queue = readJson('build/review/reporter-briefing-queue.json');
const catalog = readJson('build/public-catalog.json');
const standalone = read('Clifford-Number-standalone.html');

if (index.schema_version !== 'reporter-briefing-index@1'
  || index.graph_effect !== 'none'
  || index.conclusion_generated !== false
  || !Array.isArray(index.briefings)
  || index.briefings.length === 0) fail('briefing index is missing or exceeds its publication boundary');

if (queue.schema_version !== 'reporter-briefing-review-queue@1'
  || queue.graph_effect !== 'none'
  || queue.conclusion_generated !== false
  || !Array.isArray(queue.queue)) fail('review queue is missing or exceeds its boundary');

const catalogById = new Map((catalog.cases ?? []).map(item => [item.case_id, item]));
const queueById = new Map(queue.queue.map(item => [item.briefing_id, item]));
let totalClaims = 0;
let totalVerified = 0;
let totalReviewRequired = 0;
let totalPublicReceipts = 0;

for (const entry of index.briefings) {
  const manifestPath = `build/briefings/${entry.briefing_id}.json`;
  const casePath = `build/cases/${entry.case_id}.json`;
  for (const file of [manifestPath, casePath, entry.output_path]) if (!exists(file)) fail(`${entry.briefing_id} is missing ${file}`);

  const manifest = readJson(manifestPath);
  const caseItem = readJson(casePath);
  const html = read(entry.output_path);
  const queueItem = queueById.get(entry.briefing_id);
  const catalogItem = catalogById.get(entry.case_id);

  if (manifest.schema_version !== 'compiled-reporter-briefing@1'
    || manifest.briefing_id !== entry.briefing_id
    || manifest.case_id !== entry.case_id
    || manifest.output_path !== entry.output_path
    || manifest.case_href !== entry.case_href
    || manifest.graph_effect !== 'none'
    || manifest.conclusion_generated !== false) fail(`${entry.briefing_id} manifest identity or inference boundary is invalid`);

  if (caseItem.presentation !== 'reporter_briefing'
    || caseItem.briefing?.schema_version !== 'reporter-briefing@1'
    || caseItem.briefing?.version !== manifest.publication?.version
    || caseItem.briefing?.href !== entry.output_path
    || caseItem.briefing?.source !== `cases/${entry.case_id}/briefing.json`
    || caseItem.status !== manifest.publication?.status) fail(`${entry.briefing_id} case and briefing metadata diverged`);

  if (catalogItem?.briefing?.href !== entry.output_path
    || catalogItem?.briefing?.version !== manifest.publication?.version
    || catalogItem?.presentation !== 'reporter_briefing') fail(`${entry.briefing_id} is not discoverable through the public catalog`);

  if (!queueItem
    || queueItem.case_id !== entry.case_id
    || queueItem.publication_status !== manifest.publication?.status
    || queueItem.graph_effect !== 'none') fail(`${entry.briefing_id} review queue entry is missing or inconsistent`);

  if (manifest.publication?.status === 'approved'
    && (!manifest.publication?.reviewer || !manifest.publication?.reviewed_at || queueItem.eligible_for_approval !== true)) fail(`${entry.briefing_id} is approved without completed review metadata`);
  if (manifest.publication?.status !== 'approved' && queueItem.eligible_for_approval === true) fail(`${entry.briefing_id} is approval-eligible while publication remains ${manifest.publication?.status}`);

  if (!html.includes(`name="clifford-briefing-schema" content="reporter-briefing@1"`)
    || !html.includes(`name="clifford-briefing-version" content="${escapeHtml(manifest.publication.version)}"`)
    || !html.includes(`data-briefing-id="${escapeHtml(entry.briefing_id)}"`)
    || !html.includes('data-graph-effect="none"')
    || !html.includes(`href="${escapeHtml(entry.case_href)}"`)) fail(`${entry.briefing_id} public HTML lacks its route, version, or graph boundary`);

  if (sha256(html) !== manifest.integrity?.html_sha256) fail(`${entry.briefing_id} HTML digest does not match its manifest`);
  if (!/^[a-f0-9]{64}$/.test(manifest.integrity?.source_sha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(manifest.integrity?.case_sha256 ?? '')) fail(`${entry.briefing_id} source or case digest is malformed`);

  const claimById = new Map((caseItem.events ?? []).flatMap(event => (event.claims ?? []).map(claim => [claim.claim_id, claim])));
  for (const claimId of manifest.claim_ids ?? []) {
    const claim = claimById.get(claimId);
    if (!claim) fail(`${entry.briefing_id} references missing claim ${claimId}`);
    if (!html.includes(escapeHtml(claim.plain))) fail(`${entry.briefing_id} does not render canonical claim text ${claimId}`);
    if (!claim.qualification || !html.includes(escapeHtml(claim.qualification))) fail(`${entry.briefing_id} omits qualification for ${claimId}`);
  }

  const publicLinks = [...html.matchAll(/<a\b[^>]*href="https:\/\//g)].length;
  if (publicLinks !== manifest.counts?.public_receipts) fail(`${entry.briefing_id} exposes ${publicLinks} public links but manifest records ${manifest.counts?.public_receipts}`);
  if ((manifest.public_receipt_ids ?? []).some(id => !(manifest.receipt_ids ?? []).includes(id))) fail(`${entry.briefing_id} public receipt set is not a subset of receipt custody`);
  for (const privateId of (manifest.receipt_ids ?? []).filter(id => !(manifest.public_receipt_ids ?? []).includes(id))) {
    if (html.includes(privateId)) fail(`${entry.briefing_id} exposes private provenance receipt ${privateId}`);
  }

  if (!standalone.includes(`"case_id":"${entry.case_id}"`)
    || !standalone.includes(escapeHtml(caseItem.title))) fail(`${entry.briefing_id} evidence case is absent from the portable release`);

  totalClaims += manifest.counts?.claims ?? 0;
  totalVerified += manifest.counts?.verified_claims ?? 0;
  totalReviewRequired += manifest.counts?.review_required_claims ?? 0;
  totalPublicReceipts += manifest.counts?.public_receipts ?? 0;
}

if (index.counts?.briefings !== index.briefings.length
  || index.counts?.claims !== totalClaims
  || index.counts?.verified_claims !== totalVerified
  || index.counts?.review_required_claims !== totalReviewRequired
  || index.counts?.public_receipts !== totalPublicReceipts) fail('briefing index totals do not reconcile');

if (queue.totals?.briefings !== queue.queue.length
  || queue.totals?.approved !== queue.queue.filter(item => item.publication_status === 'approved').length
  || queue.totals?.review_required !== queue.queue.filter(item => item.publication_status === 'review_required').length
  || queue.totals?.eligible_for_approval !== queue.queue.filter(item => item.eligible_for_approval).length) fail('review queue totals do not reconcile');

console.log(`validate-reporter-briefing-pages: OK (${index.briefings.length} briefings, ${totalClaims} claims, ${totalPublicReceipts} public receipts)`);
