#!/usr/bin/env node
/**
 * promote-queue.mjs
 * Reads master doc, runs the import parser, and promotes ALL ready + review
 * rows into graph.json. Idempotent — skips rows already in the graph.
 * Runs automatically in CI before build.
 *
 * Usage: node tools/promote-queue.mjs [master.md] [graph.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, '..');

const masterPath = process.argv[2] ?? path.join(root, 'docs/clifford-number-master.md');
const graphPath  = process.argv[3] ?? path.join(root, 'graph.json');

// ── helpers ──────────────────────────────────────────────────────────────────

function slug(str) {
  return str.toLowerCase()
    .replace(/[`'"()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function nodeId(label) { return slug(label); }
function edgeId(from, predicate, to) { return `e-${slug(from)}-${slug(predicate)}-${slug(to)}`.slice(0, 80); }

function inferNodeType(label, predicate) {
  const l = label.toLowerCase();
  if (/\b(ltd|llc|inc|plc|corp|institute|foundation|agency|fund|group|ventures?|capital|partners?|labs?)\b/.test(l)) return 'organisation';
  if (/^(uk|us|eu|nato|dsit|aria|aisi|gchq|cia|fbi|dod|nsa)\b/i.test(label)) return 'organisation';
  if (/plan|action|document|report|act\b/.test(l)) return 'document';
  if (/\b(unit|zone|programme|program|initiative)\b/.test(l)) return 'programme';
  return 'person';
}

function inferStatus(predicate, date) {
  const p = predicate.toLowerCase();
  if (/appointed|commissioned/.test(p)) return 'appointed';
  if (/listed/.test(p)) return 'listed';
  if (/attended/.test(p)) return 'attended';
  if (/contracted|awarded/.test(p)) return 'contracted';
  if (/published|authored/.test(p)) return 'published';
  if (/founded|co-founded/.test(p)) return 'public-role';
  return 'reported';
}

// ── parse master doc ──────────────────────────────────────────────────────────

const EVIDENCE_MAP = {
  official: 'confirmed', confirmed: 'confirmed',
  primary_public: 'primary_public', primary: 'primary_public',
  reported: 'reported',
  derived: 'derived',
  judgment: 'judgment',
  open: 'open',
};

const BANNED = [/\bemail\b/i,/\bphone\b/i,/\bbirthdate\b/i,/\bmobile\b/i,/\bemergency\b/i,/\bdietary\b/i,/sex life/i,/\bmatchmaking\b/i,/looking for love/i,/political leaning/i,/home city/i,/\baddress\b/i,/\btoken\b/i,/assistant email/i];

const SUBJECT_HEADERS = new Set(['subject','person','funder','entity','field']);
const PREDICATE_HEADERS = new Set(['predicate']);

function parseColumns(row) {
  return row.split('|').slice(1,-1).map(c => c.trim().toLowerCase().replace(/[`*]/g,''));
}

function extractRows(text) {
  const lines = text.split('\n');
  const results = [];
  let subject = null;
  let cols = null;
  let rows = [];
  let inTable = false;

  for (const line of lines) {
    const l = line.trim();
    const h3 = l.match(/^###\s+(.+)$/);
    if (h3) { subject = h3[1].trim(); inTable=false; cols=null; rows=[]; continue; }
    const h2 = l.match(/^##\s+(.+)$/);
    if (h2) { if (!/^Part\s+\d+/i.test(h2[1])) subject = h2[1].trim(); inTable=false; cols=null; rows=[]; continue; }

    if (!l.startsWith('|')) {
      if (inTable && rows.length) { results.push({subject, cols, rows}); rows=[]; cols=null; inTable=false; }
      continue;
    }
    if (/^\|[\s\-|]+\|$/.test(l)) continue;
    if (!cols) { cols=parseColumns(l); inTable=true; continue; }
    rows.push(l.split('|').slice(1,-1).map(c=>c.trim()));
  }
  if (inTable && rows.length) results.push({subject, cols, rows});
  return results;
}

function rowToEdge(subject, cols, cells) {
  const get = names => { for (const n of names) { const i=cols.indexOf(n); if (i!==-1 && cells[i]) return cells[i]; } return ''; };
  const hasSubject = cols.some(c=>SUBJECT_HEADERS.has(c));
  const hasPredicate = cols.some(c=>PREDICATE_HEADERS.has(c));
  if (!hasPredicate) return null;

  let edgeSubject, predicate, object, evidence, date, source;
  if (hasSubject) {
    edgeSubject = get([...SUBJECT_HEADERS]) || subject;
    predicate = get(['predicate']);
    object = get(['object','value','type','role']);
    evidence = get(['evidence class','evidence_class','evidence']);
    date = get(['date','period','status']);
    source = get(['source','sources']);
  } else {
    edgeSubject = subject;
    predicate = get(['predicate']);
    object = get(['object','value']);
    evidence = get(['evidence class','evidence_class']);
    date = get(['date','period','status']);
    source = get(['source','sources']);
  }

  if (!predicate || !object) return null;
  const serialized = [edgeSubject,predicate,object,evidence,source].join(' ');
  if (BANNED.some(p=>p.test(serialized))) return null;

  const evidenceClass = EVIDENCE_MAP[evidence.toLowerCase().replace(/\s/g,'_')] ?? null;
  if (!evidenceClass || evidenceClass === 'open') return null;

  return { subject: edgeSubject, predicate, object, evidence_class: evidenceClass, date, source };
}

// ── load graph ────────────────────────────────────────────────────────────────

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const existingNodeIds = new Set(graph.nodes.map(n=>n.id));
const existingEdgeIds = new Set(graph.edges.map(e=>e.id));

// Fallback source for master-doc-derived rows
const MASTER_SOURCE_ID = 'clifford-number-master';
if (!graph.sources.find(s=>s.id===MASTER_SOURCE_ID)) {
  graph.sources.push({
    id: MASTER_SOURCE_ID,
    label: 'Clifford Number Master Research Document',
    url: 'https://github.com/BigBirdReturns/clifford-number/blob/main/docs/clifford-number-master.md',
    publisher: 'Sandhu Consulting Group / AXM',
    source_type: 'primary_public',
    notes: 'Consolidated master database. Each claim typed, sourced, and evidence-classed before import.'
  });
}

// ── promote ───────────────────────────────────────────────────────────────────

const text = fs.readFileSync(masterPath, 'utf8');
const tables = extractRows(text);

let addedNodes = 0, addedEdges = 0, skipped = 0;

for (const {subject, cols, rows} of tables) {
  for (const cells of rows) {
    const row = rowToEdge(subject, cols, cells);
    if (!row) { skipped++; continue; }

    const fromId = nodeId(row.subject);
    const toId   = nodeId(row.object);
    const eId    = edgeId(row.subject, row.predicate, row.object);

    // Add from-node if missing
    if (!existingNodeIds.has(fromId)) {
      graph.nodes.push({
        id: fromId,
        label: row.subject.replace(/\s*\(.*?\)\s*/g,'').trim(),
        type: inferNodeType(row.subject, row.predicate),
        description: '',
        aliases: [],
        tags: [],
        privacy: 'public-role-only'
      });
      existingNodeIds.add(fromId);
      addedNodes++;
    }

    // Add to-node if missing
    if (!existingNodeIds.has(toId)) {
      graph.nodes.push({
        id: toId,
        label: row.object.replace(/\s*\(.*?\)\s*/g,'').trim(),
        type: inferNodeType(row.object, row.predicate),
        description: '',
        aliases: [],
        tags: [],
        privacy: 'public-role-only'
      });
      existingNodeIds.add(toId);
      addedNodes++;
    }

    // Add edge if missing
    if (!existingEdgeIds.has(eId)) {
      graph.edges.push({
        id: eId,
        from: fromId,
        to: toId,
        type: 'relation',
        claim: `${row.subject} ${row.predicate} ${row.object}`.replace(/`/g,''),
        source_ids: [MASTER_SOURCE_ID],
        evidence_class: row.evidence_class,
        status: inferStatus(row.predicate, row.date),
        weight: row.evidence_class === 'confirmed' ? 1 : row.evidence_class === 'primary_public' ? 1 : 2,
        notes: row.source ? `Source: ${row.source}` : ''
      });
      existingEdgeIds.add(eId);
      addedEdges++;
    } else {
      skipped++;
    }
  }
}

fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2) + '\n');
console.log(`promote-queue: +${addedNodes} nodes, +${addedEdges} edges, ${skipped} skipped.`);
console.log(`graph.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.sources.length} sources.`);
