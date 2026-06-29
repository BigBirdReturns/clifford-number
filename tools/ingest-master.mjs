#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root, slug, writeJson, writeJsonl } from './lib/ledger.mjs';

const masterPath = path.join(root, 'docs/clifford-number-master.md');
const text = fs.readFileSync(masterPath, 'utf8');
const lines = text.split(/\r?\n/);

const SUBJECT_COLS = new Set(['subject', 'person', 'company', 'organization', 'org', 'entity', 'funder', 'field', 'investor']);
const OBJECT_COLS = ['object', 'value', 'role', 'type', 'client', 'company', 'org', 'funder', 'ef description', 'umbrella'];
const EVIDENCE_COLS = ['evidence class', 'evidence_class', 'evidence'];
const SOURCE_COLS = ['source', 'sources'];
const DATE_COLS = ['date', 'period', 'gov tenure', 'launch'];

function stripFormatting(s) {
  return String(s ?? '').replace(/`/g, '').replace(/\*\*/g, '').trim();
}

function normaliseHeader(s) {
  return stripFormatting(s).toLowerCase().replace(/[`*]/g, '').trim();
}

function cells(line) {
  return line.split('|').slice(1, -1).map(c => stripFormatting(c));
}

function classify(row) {
  const joined = `${row.subject} ${row.predicate} ${row.object}`.toLowerCase();
  const surfaceWords = /(board|advisory|advisor|appointed|commissioned|roster|directory|cohort|founder|co-founded|director|officer|funder|investor|contract|procurement|grant|programme|program|summit|taskforce|working group|filing|customer|client|vendor|surface|council|committee)/i;
  const contextWords = /(recommends|doctrine|note|description|purpose|umbrella|category|type|portfolio-value|funding|offers|created-from)/i;
  const participationWords = /(chair|member|director|adviser|advisor|investor|employee|founder|co-founded|role-at|listed-in-directory|attended|appointed|commissioned|authored|contracted|awarded|CEO|CTO)/i;

  if (!row.predicate || !row.object) return 'needs_review';
  if (row.predicate.startsWith('table-row:')) {
    const text = `${row.subject} ${row.object}`.toLowerCase();
    if (/source|receipt|publisher|url|journalism|official|primary_public/.test(text)) return 'receipt_candidate';
    if (/person|civilian role|company|investor|funder|participant|board|director|member|role|organization|cohort|directory/.test(text)) return 'surface_candidate';
    return 'context_only';
  }
  if (participationWords.test(joined)) return 'participation_claim';
  if (surfaceWords.test(joined)) return 'surface_candidate';
  if (contextWords.test(joined)) return 'context_only';
  if (/^[A-Z][a-z]+/.test(row.subject)) return 'actor_claim';
  return 'organization_claim';
}

let sectionSubject = '';
let currentPart = '';
let headers = null;
let rowCount = 0;
const claims = [];
const review = [];
const bucketCounts = {};

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();

  const h2 = line.match(/^##\s+(.+)$/);
  if (h2) {
    currentPart = stripFormatting(h2[1]);
    if (!/^Part\s+\d+/i.test(currentPart)) sectionSubject = currentPart;
    headers = null;
    continue;
  }

  const h3 = line.match(/^###\s+(.+)$/);
  if (h3) {
    sectionSubject = stripFormatting(h3[1]).replace(/\s*—\s*(Consolidated\s+)?(Org|Document)\s+Node\s*$/i, '').trim();
    headers = null;
    continue;
  }

  if (!line.startsWith('|')) { headers = null; continue; }
  if (/^\|[\s\-|:]+\|$/.test(line)) continue;

  const rowCells = cells(line);
  if (!headers) {
    headers = rowCells.map(normaliseHeader);
    continue;
  }

  const idx = name => headers.indexOf(name);
  const get = names => {
    for (const name of names) {
      const j = idx(name);
      if (j !== -1 && rowCells[j]) return rowCells[j];
    }
    return '';
  };

  const hasPredicate = idx('predicate') !== -1;
  let predicate = hasPredicate ? get(['predicate']) : '';

  let subject = get([...SUBJECT_COLS]) || sectionSubject;
  let object = get(OBJECT_COLS);
  const evidenceClass = get(EVIDENCE_COLS) || 'unspecified';
  const source = get(SOURCE_COLS);
  const date = get(DATE_COLS);

  // Non-predicate tables still belong in the migration universe. They become
  // table_context or candidate rows rather than disappearing from review.
  if (!hasPredicate) {
    const firstHeader = headers[0] || 'row';
    const firstValue = rowCells[0] || sectionSubject || currentPart || 'row';
    subject = get([...SUBJECT_COLS]) || sectionSubject || firstValue;
    predicate = `table-row:${firstHeader}`;
    object = headers.map((h, j) => `${h}=${rowCells[j] ?? ''}`).join('; ');
  }

  if (!subject || !predicate || !object) {
    review.push({ line: i + 1, part: currentPart, section: sectionSubject, reason: 'missing_subject_predicate_or_object', raw });
    continue;
  }

  const row = {
    claim_id: `master-${String(++rowCount).padStart(4, '0')}-${slug(subject).slice(0, 30)}-${slug(predicate).slice(0, 24)}-${slug(object).slice(0, 30)}`,
    source_doc: 'docs/clifford-number-master.md',
    source_line: i + 1,
    part: currentPart,
    section: sectionSubject,
    subject,
    predicate,
    object,
    date,
    evidence_class: evidenceClass.toLowerCase().replace(/\s+/g, '_'),
    source,
    text: `${subject} ${predicate} ${object}`,
  };
  row.classification = classify(row);
  bucketCounts[row.classification] = (bucketCounts[row.classification] ?? 0) + 1;
  claims.push(row);
}

writeJsonl('build/migrated-claims.jsonl', claims);
writeJson('build/migration-summary.json', {
  generated: new Date().toISOString(),
  master: 'docs/clifford-number-master.md',
  total_rows: claims.length,
  bucket_counts: bucketCounts,
  review_rows: review.length,
});

const byBucket = new Map();
for (const claim of claims) {
  if (!byBucket.has(claim.classification)) byBucket.set(claim.classification, []);
  byBucket.get(claim.classification).push(claim);
}

const md = [
  '# Migration Review',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This file is generated from `docs/clifford-number-master.md`. It is not graph data. It is the review queue for moving existing claims into the surface-hop ledgers.',
  '',
  '## Bucket Counts',
  '',
  '| Bucket | Count |',
  '|---|---:|',
  ...Object.entries(bucketCounts).sort().map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Review Rows',
  '',
  review.length ? review.map(r => `- line ${r.line}: ${r.reason} — ${r.raw}`).join('\n') : '_None_',
  '',
  '## Surface Candidates and Participation Claims',
  '',
  ...['surface_candidate', 'participation_claim', 'receipt_candidate', 'context_only', 'actor_claim', 'organization_claim'].flatMap(bucket => {
    const rows = (byBucket.get(bucket) ?? []).slice(0, 80);
    return [
      `### ${bucket}`,
      '',
      rows.length ? rows.map(c => `- L${c.source_line}: **${c.subject}** \`${c.predicate}\` ${c.object} (${c.evidence_class || 'unspecified'})`).join('\n') : '_None_',
      (byBucket.get(bucket)?.length ?? 0) > rows.length ? `\n_Only first ${rows.length} shown of ${byBucket.get(bucket).length}._` : '',
      '',
    ];
  })
].join('\n');

fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/migration-review.md'), md + '\n');
console.log(`ingest-master: ${claims.length} rows classified from master doc.`);
console.log(`review: ${review.length} malformed/unparsed rows.`);
