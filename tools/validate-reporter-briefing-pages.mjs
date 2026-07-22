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
const count = (value, pattern) => [...value.matchAll(pattern)].length;
const attributeValues = (value, attribute) => [...value.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(match => match[1]);

const fail = message => {
  console.error(`validate-reporter-briefing-pages failed: ${message}`);
  process.exit(1);
};

for (const file of [
  'build/briefings/index.json',
  'build/review/reporter-briefing-queue.json',
  'build/public-catalog.json',
  'build/report-frontier.json',
  'Clifford-Number-standalone.html'
]) if (!exists(file)) fail(`missing ${file}`);

const index = readJson('build/briefings/index.json');
const queue = readJson('build/review/reporter-briefing-queue.json');
const catalog = readJson('build/public-catalog.json');
const frontier = readJson('build/report-frontier.json');
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

if (frontier.schema_version !== 'report-frontier@1'
  || frontier.graph_effect !== 'none'
  || frontier.conclusion_generated !== false
  || frontier.waterline?.stage !== 'structured_report'
  || frontier.waterline?.next_transition !== 'independent_review') fail('report frontier is missing or misstates the demonstrated publication waterline');

const catalogById = new Map((catalog.cases ?? []).map(item => [item.case_id, item]));
const queueById = new Map(queue.queue.map(item => [item.briefing_id, item]));
let totalClaims = 0;
let totalVerified = 0;
let totalReviewRequired = 0;
let totalInheritedQualifications = 0;
let totalUnsequencedClaims = 0;
let totalSourceTrails = 0;
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

  if (manifest.schema_version !== 'compiled-reporter-briefing@2'
    || manifest.briefing_id !== entry.briefing_id
    || manifest.case_id !== entry.case_id
    || manifest.output_path !== entry.output_path
    || manifest.case_href !== entry.case_href
    || manifest.graph_effect !== 'none'
    || manifest.conclusion_generated !== false) fail(`${entry.briefing_id} manifest identity or inference boundary is invalid`);

  if (caseItem.presentation !== 'reporter_briefing'
    || caseItem.briefing?.schema_version !== 'reporter-briefing@2'
    || caseItem.briefing?.version !== manifest.publication?.version
    || caseItem.briefing?.href !== entry.output_path
    || caseItem.briefing?.source !== `cases/${entry.case_id}/briefing.json`
    || caseItem.status !== manifest.publication?.status) fail(`${entry.briefing_id} case and briefing metadata diverged`);

  if (catalogItem?.briefing?.href !== entry.output_path
    || catalogItem?.briefing?.version !== manifest.publication?.version
    || catalogItem?.briefing?.schema_version !== 'reporter-briefing@2'
    || catalogItem?.presentation !== 'reporter_briefing') fail(`${entry.briefing_id} is not discoverable through the public catalog`);

  if (!queueItem
    || queueItem.case_id !== entry.case_id
    || queueItem.publication_status !== manifest.publication?.status
    || queueItem.graph_effect !== 'none') fail(`${entry.briefing_id} review queue entry is missing or inconsistent`);

  if (manifest.publication?.status === 'approved'
    && (!manifest.publication?.reviewer || !manifest.publication?.reviewed_at || queueItem.eligible_for_approval !== true)) fail(`${entry.briefing_id} is approved without completed review metadata`);
  if (manifest.publication?.status !== 'approved' && queueItem.eligible_for_approval === true) fail(`${entry.briefing_id} is approval-eligible while publication remains ${manifest.publication?.status}`);
  if ((manifest.counts?.inherited_qualifications ?? 0) > 0
    && !queueItem.blocking_reasons.includes(`${manifest.counts.inherited_qualifications}_qualifications_inherited_from_case_boundary`)) fail(`${entry.briefing_id} inherited qualifications are absent from the approval blockers`);
  if ((manifest.counts?.unsequenced_claims ?? 0) > 0
    && !queueItem.blocking_reasons.includes(`${manifest.counts.unsequenced_claims}_unsequenced_case_claims`)) fail(`${entry.briefing_id} unsequenced claims are absent from the approval blockers`);

  if (!html.includes('name="clifford-briefing-schema" content="reporter-briefing@2"')
    || !html.includes(`name="clifford-briefing-version" content="${escapeHtml(manifest.publication.version)}"`)
    || !html.includes(`data-briefing-id="${escapeHtml(entry.briefing_id)}"`)
    || !html.includes('data-briefing-schema="reporter-briefing@2"')
    || !html.includes('data-graph-effect="none"')
    || !html.includes(`href="${escapeHtml(entry.case_href)}"`)) fail(`${entry.briefing_id} public HTML lacks its route, version, schema, or graph boundary`);

  if (count(html, /class="thread-pin"[^>]*data-x-level=/g) !== manifest.counts?.threads) fail(`${entry.briefing_id} categorical orientation count diverged`);
  if (count(html, /<tr data-event-id=/g) !== manifest.counts?.sequence_events) fail(`${entry.briefing_id} sequence count diverged`);
  if (count(html, /<tr id="thread-[^"]+" data-thread-id=/g) !== manifest.counts?.threads) fail(`${entry.briefing_id} matrix thread count diverged`);
  if (count(html, /class="matrix-cell"/g) !== manifest.counts?.matrix_cells) fail(`${entry.briefing_id} matrix cell count diverged`);
  if (count(html, /data-control-id=/g) !== manifest.counts?.controls) fail(`${entry.briefing_id} counterweight count diverged`);
  if (count(html, /data-work-id=/g) !== manifest.counts?.workplan_items) fail(`${entry.briefing_id} workplan count diverged`);
  if (count(html, /<tr id="claim-/g) !== manifest.counts?.claims) fail(`${entry.briefing_id} claim register count diverged`);
  if (new Set(attributeValues(html, 'data-trail-id')).size !== manifest.counts?.source_trails) fail(`${entry.briefing_id} source-trail count diverged`);
  if (/style="[^"]*(?:left|top):/.test(html)) fail(`${entry.briefing_id} renders unsupported continuous coordinates`);

  if (sha256(html) !== manifest.integrity?.html_sha256) fail(`${entry.briefing_id} HTML digest does not match its manifest`);
  if (!/^[a-f0-9]{64}$/.test(manifest.integrity?.source_sha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(manifest.integrity?.case_sha256 ?? '')) fail(`${entry.briefing_id} source or case digest is malformed`);

  const claimRows = Array.isArray(caseItem.claims) && caseItem.claims.length > 0
    ? caseItem.claims
    : (caseItem.events ?? []).flatMap(event => event.claims ?? []);
  const claimById = new Map(claimRows.map(claim => [claim.claim_id, claim]));
  const eventById = new Map((caseItem.events ?? []).map(event => [event.event_id, event]));
  const trailById = new Map((caseItem.trails ?? []).map(trail => [trail.trail_id, trail]));
  const caseUnsequenced = new Set(caseItem.unsequenced_claim_ids ?? []);
  for (const item of manifest.sequence ?? []) {
    const event = eventById.get(item.event_id);
    if (!event) fail(`${entry.briefing_id} sequence references missing event ${item.event_id}`);
    if (!html.includes(escapeHtml(event.label)) || !html.includes(escapeHtml(event.occurred_at))) fail(`${entry.briefing_id} sequence omits canonical event ${item.event_id}`);
  }
  for (const claimId of manifest.claim_ids ?? []) {
    const claim = claimById.get(claimId);
    if (!claim) fail(`${entry.briefing_id} references missing claim ${claimId}`);
    if (!html.includes(escapeHtml(claim.plain))) fail(`${entry.briefing_id} does not render canonical claim text ${claimId}`);
    const qualification = claim.qualification || caseItem.boundary || caseItem.disclaimer;
    if (!qualification || !html.includes(escapeHtml(qualification))) fail(`${entry.briefing_id} omits qualification or case-wide boundary for ${claimId}`);
  }
  if ((manifest.inherited_qualification_claim_ids ?? []).length !== manifest.counts?.inherited_qualifications) fail(`${entry.briefing_id} inherited qualification count diverged`);
  for (const claimId of manifest.inherited_qualification_claim_ids ?? []) {
    const claim = claimById.get(claimId);
    if (!claim || claim.qualification) fail(`${entry.briefing_id} incorrectly marks ${claimId} as inheriting a case boundary`);
  }
  if ((manifest.unsequenced_claim_ids ?? []).length !== manifest.counts?.unsequenced_claims) fail(`${entry.briefing_id} unsequenced claim count diverged`);
  for (const claimId of manifest.unsequenced_claim_ids ?? []) {
    if (!(manifest.claim_ids ?? []).includes(claimId)) fail(`${entry.briefing_id} marks unreferenced claim ${claimId} as unsequenced`);
    if (!caseUnsequenced.has(claimId)) fail(`${entry.briefing_id} marks sequenced claim ${claimId} as unsequenced`);
  }
  for (const claimId of manifest.claim_ids ?? []) {
    if (caseUnsequenced.has(claimId) !== (manifest.unsequenced_claim_ids ?? []).includes(claimId)) fail(`${entry.briefing_id} does not reconcile unsequenced custody for ${claimId}`);
  }
  if ((manifest.source_trail_ids ?? []).length !== manifest.counts?.source_trails) fail(`${entry.briefing_id} source trail manifest count diverged`);
  for (const trailId of manifest.source_trail_ids ?? []) {
    const trail = trailById.get(trailId);
    if (!trail) fail(`${entry.briefing_id} references missing source trail ${trailId}`);
    if (trail.graph_effect !== 'none' || (trail.promotes_to && trail.promotes_to !== 'candidate_only')) fail(`${entry.briefing_id} references trail ${trailId} beyond the candidate-only boundary`);
    if (!html.includes(`data-trail-id="${escapeHtml(trailId)}"`)) fail(`${entry.briefing_id} omits source trail ${trailId} from the rendered workplan`);
  }

  const publicLinks = count(html, /<a\b[^>]*href="https:\/\//g);
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
  totalInheritedQualifications += manifest.counts?.inherited_qualifications ?? 0;
  totalUnsequencedClaims += manifest.counts?.unsequenced_claims ?? 0;
  totalSourceTrails += manifest.counts?.source_trails ?? 0;
  totalPublicReceipts += manifest.counts?.public_receipts ?? 0;
}

if (index.counts?.briefings !== index.briefings.length
  || index.counts?.claims !== totalClaims
  || index.counts?.verified_claims !== totalVerified
  || index.counts?.review_required_claims !== totalReviewRequired
  || index.counts?.inherited_qualifications !== totalInheritedQualifications
  || index.counts?.unsequenced_claims !== totalUnsequencedClaims
  || index.counts?.source_trails !== totalSourceTrails
  || index.counts?.public_receipts !== totalPublicReceipts) fail('briefing index totals do not reconcile');

if (queue.totals?.briefings !== queue.queue.length
  || queue.totals?.approved !== queue.queue.filter(item => item.publication_status === 'approved').length
  || queue.totals?.review_required !== queue.queue.filter(item => item.publication_status === 'review_required').length
  || queue.totals?.eligible_for_approval !== queue.queue.filter(item => item.eligible_for_approval).length) fail('review queue totals do not reconcile');

console.log(`validate-reporter-briefing-pages: OK (${index.briefings.length} briefings, ${totalClaims} claims, ${totalUnsequencedClaims} unsequenced claims, ${totalSourceTrails} source trails, ${totalPublicReceipts} public receipts)`);
