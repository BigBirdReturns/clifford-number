#!/usr/bin/env node
/**
 * import-master-v4.mjs
 * Parser for the v4 master document format where subject is the section heading,
 * not an explicit column. Handles both:
 *   - Anchor-node tables: | Predicate | Object | Date | Evidence Class | Source | UI Weight |
 *   - Explicit-subject tables: | Subject | Predicate | Object | Evidence Class | Source |
 */
import fs from 'node:fs';
import path from 'node:path';

const [input, output = 'data/import-queues/master-v4.import-queue.json'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node tools/import-master-v4.mjs <master.md> [output.json]');
  process.exit(1);
}

const EVIDENCE_MAP = {
  official: 'confirmed', confirmed: 'confirmed',
  primary_public: 'primary_public', primary: 'primary_public',
  reported: 'reported',
  derived: 'derived',
  judgment: 'judgment',
  open: 'open',
};

const STATUS_MAP = {
  listed: 'listed', registered: 'registered', attended: 'attended',
  appointed: 'appointed', contracted: 'contracted', reported: 'reported',
  published: 'published', derived: 'derived',
  'public-role': 'public-role', public_role: 'public-role',
  current: 'public-role', present: 'public-role',
};

const BANNED = [
  /\bemail\b/i, /\bphone\b/i, /\bbirthdate\b/i, /\bmobile\b/i,
  /\bemergency\b/i, /\bdietary\b/i, /sex life/i, /\bmatchmaking\b/i,
  /looking for love/i, /political leaning/i, /home city/i,
  /\baddress\b/i, /\btoken\b/i, /assistant email/i,
];

// Header column labels that tell us which format this table uses
const SUBJECT_HEADERS = new Set(['subject', 'person', 'funder', 'entity', 'field']);
const PREDICATE_HEADERS = new Set(['predicate']);

function parseColumns(headerRow) {
  return headerRow.split('|').slice(1, -1).map(c => c.trim().toLowerCase().replace(/[`*]/g, ''));
}

function extractTables(text) {
  const lines = text.split('\n');
  const results = [];
  let currentSubject = null;
  let tableLines = [];
  let headerCols = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track section headings as implied subject
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      currentSubject = h3[1].trim();
      inTable = false;
      headerCols = null;
      tableLines = [];
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      // h2 resets subject only if it's a named entity, not a Part heading
      if (!/^Part\s+\d+/i.test(h2[1])) currentSubject = h2[1].trim();
      inTable = false;
      headerCols = null;
      tableLines = [];
      continue;
    }

    if (!line.startsWith('|')) {
      if (inTable && tableLines.length) {
        results.push({ subject: currentSubject, cols: headerCols, rows: tableLines });
        tableLines = [];
        headerCols = null;
        inTable = false;
      }
      continue;
    }

    // Separator row
    if (/^\|[\s\-|]+\|$/.test(line)) continue;

    // Header row — first pipe row before separator
    if (!headerCols) {
      headerCols = parseColumns(line);
      inTable = true;
      continue;
    }

    // Data row
    tableLines.push(line.split('|').slice(1, -1).map(c => c.trim()));
  }
  if (inTable && tableLines.length) {
    results.push({ subject: currentSubject, cols: headerCols, rows: tableLines });
  }
  return results;
}

function rowToEdge(subject, cols, cells) {
  const get = (names) => {
    for (const n of names) {
      const idx = cols.indexOf(n);
      if (idx !== -1 && cells[idx]) return cells[idx];
    }
    return '';
  };

  const hasSubjectCol = cols.some(c => SUBJECT_HEADERS.has(c));
  const hasPredicateCol = cols.some(c => PREDICATE_HEADERS.has(c));

  let edgeSubject, predicate, object, evidence, status, source;

  if (hasSubjectCol && hasPredicateCol) {
    // Explicit subject table
    edgeSubject = get([...SUBJECT_HEADERS]) || subject;
    predicate = get(['predicate']);
    object = get(['object', 'value', 'type', 'role']);
    evidence = get(['evidence class', 'evidence_class', 'evidence']);
    status = get(['status', 'date', 'period']) || 'reported';
    source = get(['source', 'sources']);
  } else if (hasPredicateCol) {
    // Anchor-node: | Predicate | Object | Date | Evidence Class | Source | ...
    edgeSubject = subject;
    predicate = get(['predicate']);
    object = get(['object', 'value']);
    evidence = get(['evidence class', 'evidence_class']);
    status = get(['date', 'period', 'status']) || 'reported';
    source = get(['source', 'sources']);
  } else {
    // Unknown format — skip
    return null;
  }

  if (!predicate || !object) return null;

  return {
    raw: cells.join(' | '),
    subject: edgeSubject,
    predicate,
    object,
    evidence: evidence || '',
    status: status || 'reported',
    source,
  };
}

const text = fs.readFileSync(input, 'utf8');
const tables = extractTables(text);

const queue = {
  generated: new Date().toISOString(),
  input: path.resolve(input),
  ready: [], review: [], verify: [], hold: [], reject: [],
};

for (const { subject, cols, rows } of tables) {
  for (const cells of rows) {
    const edge = rowToEdge(subject, cols, cells);
    if (!edge) continue;

    const serialized = JSON.stringify(edge);
    if (BANNED.some(p => p.test(serialized))) {
      queue.reject.push({ edge, reason: 'private-field-guard' });
      continue;
    }

    const evidence = EVIDENCE_MAP[edge.evidence.toLowerCase().replace(/\s/g, '_')] ?? null;
    // Derive status from date/period field heuristically
    let status = STATUS_MAP[edge.status.toLowerCase().replace(/[-\s]/g, '_')] ?? null;
    if (!status) {
      const s = edge.status.toLowerCase();
      if (/present|current|ongoing/.test(s)) status = 'public-role';
      else if (/\d{4}/.test(s)) status = 'public-role';
      else if (s === '—' || s === '-' || s === '') status = 'reported';
      else status = 'reported';
    }

    const item = { ...edge, evidence_class: evidence, status };

    if (!evidence || evidence === 'open') {
      queue.hold.push({ item, reason: 'open-or-unmapped' });
    } else if (['confirmed', 'primary_public'].includes(evidence)) {
      queue.ready.push(item);
    } else if (evidence === 'reported') {
      queue.review.push(item);
    } else if (['derived', 'judgment'].includes(evidence)) {
      queue.verify.push(item);
    } else {
      queue.hold.push({ item, reason: 'needs-human-review' });
    }
  }
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Wrote ${output}:`);
console.log(`  ready:  ${queue.ready.length}`);
console.log(`  review: ${queue.review.length}`);
console.log(`  verify: ${queue.verify.length}`);
console.log(`  hold:   ${queue.hold.length}`);
console.log(`  reject: ${queue.reject.length}`);
