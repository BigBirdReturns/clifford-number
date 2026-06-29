#!/usr/bin/env node
/**
 * compile-master.mjs — THE COMPILER (clerk)
 *
 * Rebuilds graph.json from data/graph.base.json + docs/clifford-number-master.md.
 * It does not continue from yesterday's graph.json, so deleted or corrected master
 * rows disappear on the next compile.
 *
 * Authority: none. It turns explicit rows into graph data and nothing else.
 *
 * Allowed:
 *   - Parse explicit typed-edge table rows from the master doc.
 *   - Apply explicit aliases from data/canonical/aliases.json.
 *   - Apply explicit entity metadata from data/canonical/entities.json.
 *   - Write a reproducible graph.json and build reports.
 *
 * Forbidden:
 *   - Inferring connections not in the doc.
 *   - Creating bridge edges.
 *   - Judging evidence quality.
 *   - Promoting or withholding rows by model preference.
 *   - Treating graph.json as source input.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, '..');

const masterPath = process.argv[2] ?? path.join(root, 'docs/clifford-number-master.md');
const outputPath = process.argv[3] ?? path.join(root, 'graph.json');
const basePath = process.env.CLIFFORD_BASE_GRAPH ?? path.join(root, 'data/graph.base.json');
const aliasesPath = path.join(root, 'data/canonical/aliases.json');
const entitiesPath = path.join(root, 'data/canonical/entities.json');
const reportMdPath = path.join(root, 'build/compile-report.md');
const reportJsonPath = path.join(root, 'build/compile-report.json');
const unresolvedPath = path.join(root, 'build/unresolved.json');

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const aliases = readJson(aliasesPath, {});
const entities = readJson(entitiesPath, {});

const HEADER_SUFFIXES = [
  /\s*—\s*(Consolidated\s+)?Org(\s+Node)?\s*$/i,
  /\s*—\s*Document\s+Node\s*$/i,
  /\s*—\s*Separate\s+Research\s+Thread\s*$/i,
  /\s*\((Org|Document|Programme|Program)\s*(node)?\)\s*$/i,
];

function cleanCell(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\\\|/g, '¦')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHeaderSuffix(label) {
  let s = cleanCell(label).replace(/^`|`$/g, '').trim();
  for (const re of HEADER_SUFFIXES) s = s.replace(re, '').trim();
  return s;
}

function canonicalLabel(raw) {
  let label = stripHeaderSuffix(raw);
  if (Object.hasOwn(aliases, label)) label = aliases[label];
  return stripHeaderSuffix(label);
}

function toSlug(label) {
  return canonicalLabel(label)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[`'"()]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function hashId(parts, n = 10) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, n);
}

function edgeId(subject, predicate, object) {
  const from = toSlug(subject).slice(0, 24);
  const pred = toSlug(predicate).slice(0, 24);
  const to = toSlug(object).slice(0, 24);
  return `e-${from}-${pred}-${to}-${hashId([subject, predicate, object])}`;
}

const EVIDENCE_MAP = {
  official: 'confirmed',
  confirmed: 'confirmed',
  primary_public: 'primary_public',
  primary: 'primary_public',
  reported: 'reported',
  journalism: 'reported',
  derived: 'derived',
  judgment: 'judgment',
  open: 'open',
};

function normaliseKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

function mapEvidence(raw) {
  return EVIDENCE_MAP[normaliseKey(raw)] ?? null;
}

function mapStatus(predicate, dateOrStatus = '') {
  const p = String(predicate ?? '').toLowerCase();
  const s = String(dateOrStatus ?? '').toLowerCase();
  if (/\bappointed\b|\bcommissioned\b/.test(p)) return 'appointed';
  if (/\blisted\b/.test(p)) return 'listed';
  if (/\battended\b/.test(p)) return 'attended';
  if (/\bcontracted\b|\bawarded\b/.test(p)) return 'contracted';
  if (/\bpublished\b|\bauthored\b|\bco-authored\b/.test(p)) return 'published';
  if (/\bfounded\b|\bco-founded\b|\bchair-of\b|\bceo-of\b|\brole-at\b/.test(p)) return 'public-role';
  if (/\bregistered\b/.test(p)) return 'registered';
  if (/present|current|ongoing|\d{4}/.test(s)) return 'public-role';
  return 'reported';
}

const BANNED_PATTERNS = [
  /\bemail\b/i, /\bphone\b/i, /\bbirthdate\b/i, /\bmobile\b/i,
  /\bemergency\b/i, /\bdietary\b/i, /sex life/i, /\bmatchmaking\b/i,
  /looking for love/i, /political leaning/i, /home city/i,
  /\baddress\b/i, /\btoken\b/i, /assistant email/i, /personal email/i,
  /private email/i, /whatsapp/i, /telegram/i, /\bpassport\b/i, /\bssn\b/i,
  /national insurance/i, /bank account/i, /raw registrant/i, /questionnaire/i,
];

function bannedHit(value) {
  const hit = BANNED_PATTERNS.find(re => re.test(value));
  return hit ? String(hit) : null;
}

const SUBJECT_COLS = new Set(['subject', 'person', 'funder', 'entity', 'field']);
const PREDICATE_COL = 'predicate';

function parseCols(row) {
  return row.split('|').slice(1, -1).map(c => cleanCell(c).toLowerCase().replace(/[`*]/g, ''));
}

function cellsFromRow(row) {
  return row.split('|').slice(1, -1).map(c => cleanCell(c).replace(/¦/g, '|'));
}

function parseRows(text) {
  const lines = text.split('\n');
  const output = [];
  const skipped = [];
  let sectionSubject = null;
  let defaultEvidence = null;
  let cols = null;
  let inTable = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNumber = idx + 1;
    const l = lines[idx].trim();

    const evidenceDefault = l.match(/Evidence class:\*\*\s*`?([A-Za-z_ -]+)`?/i);
    if (evidenceDefault) defaultEvidence = evidenceDefault[1].trim();

    const h3 = l.match(/^###\s+(.+)$/);
    if (h3) {
      sectionSubject = canonicalLabel(h3[1]);
      defaultEvidence = null;
      cols = null;
      inTable = false;
      continue;
    }

    const h2 = l.match(/^##\s+(.+)$/);
    if (h2) {
      if (!/^Part\s+\d+/i.test(h2[1])) sectionSubject = canonicalLabel(h2[1]);
      defaultEvidence = null;
      cols = null;
      inTable = false;
      continue;
    }

    if (!l.startsWith('|')) {
      cols = null;
      inTable = false;
      continue;
    }
    if (/^\|[\s\-|]+\|$/.test(l)) continue;

    const cells = cellsFromRow(l);
    if (!cols) {
      cols = parseCols(l);
      inTable = true;
      continue;
    }
    if (!inTable) continue;

    const hasSubjectCol = cols.some(c => SUBJECT_COLS.has(c));
    const hasPredicateCol = cols.includes(PREDICATE_COL);
    if (!hasPredicateCol) continue;

    const get = (...names) => {
      for (const n of names) {
        const i = cols.indexOf(n);
        if (i !== -1 && cells[i]) return cells[i].trim();
      }
      return '';
    };

    let subject, predicate, object, evidenceRaw, source, dateOrStatus;
    if (cols.includes('person') && cols.includes('fund') && hasPredicateCol) {
      // Capital-layer table: | Fund | Person | Predicate | Notes |
      subject = get('person');
      predicate = get('predicate');
      object = get('fund');
      evidenceRaw = get('evidence class', 'evidence_class', 'evidence') || defaultEvidence || '';
      source = get('source', 'sources', 'notes');
      dateOrStatus = get('date', 'period', 'status');
    } else if (hasSubjectCol) {
      subject = get(...SUBJECT_COLS) || sectionSubject || '';
      predicate = get('predicate');
      object = get('object', 'value', 'type', 'role');
      evidenceRaw = get('evidence class', 'evidence_class', 'evidence') || defaultEvidence || '';
      source = get('source', 'sources', 'notes');
      dateOrStatus = get('date', 'period', 'status');
      if (!object && sectionSubject && cols.includes('person')) object = sectionSubject;
    } else {
      subject = sectionSubject || '';
      predicate = get('predicate');
      object = get('object', 'value');
      evidenceRaw = get('evidence class', 'evidence_class') || defaultEvidence || '';
      source = get('source', 'sources', 'notes');
      dateOrStatus = get('date', 'period', 'status');
    }

    if (!subject || !predicate || !object) {
      skipped.push({ line: lineNumber, reason: 'missing-subject-predicate-or-object', row: l });
      continue;
    }

    const serialised = [subject, predicate, object, evidenceRaw, source].join(' ');
    const privateHit = bannedHit(serialised);
    if (privateHit) {
      skipped.push({ line: lineNumber, reason: 'private-field-guard', hit: privateHit, row: l });
      continue;
    }

    const evidenceClass = mapEvidence(evidenceRaw);
    if (!evidenceClass) {
      skipped.push({ line: lineNumber, reason: 'unmapped-evidence-class', evidence: evidenceRaw, row: l });
      continue;
    }
    if (evidenceClass === 'open') {
      skipped.push({ line: lineNumber, reason: 'open-row-not-published', evidence: evidenceRaw, row: l });
      continue;
    }

    output.push({
      line: lineNumber,
      subject_raw: subject,
      object_raw: object,
      subject: canonicalLabel(subject),
      predicate: cleanCell(predicate).replace(/`/g, ''),
      object: canonicalLabel(object),
      evidence_class: evidenceClass,
      status: mapStatus(predicate, dateOrStatus),
      source: source || '',
      date_or_status: dateOrStatus || '',
      raw: l,
    });
  }

  return { rows: output, skipped };
}

const baseGraph = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const graph = JSON.parse(JSON.stringify(baseGraph));
const nodeById = new Map((graph.nodes ?? []).map(n => [n.id, n]));
const edgeIdSet = new Set((graph.edges ?? []).map(e => e.id));

const MASTER_SOURCE_ID = 'clifford-number-master';
if (!graph.sources.find(s => s.id === MASTER_SOURCE_ID)) {
  graph.sources.push({
    id: MASTER_SOURCE_ID,
    label: 'Clifford Number Master Research Document',
    url: 'https://github.com/BigBirdReturns/clifford-number/blob/main/docs/clifford-number-master.md',
    publisher: 'Sandhu Consulting Group / AXM',
    source_type: 'primary_public',
    notes: 'Consolidated master database. Each claim is typed, sourced, and evidence-classed by hand before compilation.',
  });
}

function entityMeta(label) {
  return entities[canonicalLabel(label)] ?? {};
}

function ensureNode(label) {
  const canonical = canonicalLabel(label);
  const id = toSlug(canonical);
  const meta = entityMeta(canonical);
  if (!nodeById.has(id)) {
    const node = {
      id,
      label: canonical,
      type: meta.type ?? 'entity',
      description: meta.description ?? '',
      aliases: Array.isArray(meta.aliases) ? [...meta.aliases] : [],
      tags: Array.isArray(meta.tags) ? [...meta.tags] : [],
      privacy: 'public-role-only',
    };
    graph.nodes.push(node);
    nodeById.set(id, node);
    report.added_nodes.push({ id, label: canonical, type: node.type });
  } else if (meta.type && nodeById.get(id).type === 'entity') {
    nodeById.get(id).type = meta.type;
  }
  return id;
}

const report = {
  generated: new Date().toISOString(),
  base_graph: basePath,
  master: masterPath,
  output: outputPath,
  parsed_rows: 0,
  added_nodes: [],
  added_edges: [],
  duplicate_rows: [],
  skipped_rows: [],
};

const text = fs.readFileSync(masterPath, 'utf8');
const parsed = parseRows(text);
report.parsed_rows = parsed.rows.length;
report.skipped_rows.push(...parsed.skipped);

for (const row of parsed.rows) {
  const fromId = ensureNode(row.subject);
  const toId = ensureNode(row.object);
  const eId = edgeId(row.subject, row.predicate, row.object);

  if (edgeIdSet.has(eId)) {
    report.duplicate_rows.push({ line: row.line, edge_id: eId, subject: row.subject, predicate: row.predicate, object: row.object });
    continue;
  }

  const edge = {
    id: eId,
    from: fromId,
    to: toId,
    type: 'relation',
    claim: `${row.subject} ${row.predicate} ${row.object}`,
    source_ids: [MASTER_SOURCE_ID],
    evidence_class: row.evidence_class,
    status: row.status,
    weight: row.evidence_class === 'confirmed' || row.evidence_class === 'primary_public' ? 1 : 2,
    notes: [
      row.source ? `Source: ${row.source}` : '',
      row.date_or_status ? `Date/status: ${row.date_or_status}` : '',
      row.subject_raw !== row.subject ? `Canonical subject: ${row.subject_raw} → ${row.subject}` : '',
      row.object_raw !== row.object ? `Canonical object: ${row.object_raw} → ${row.object}` : '',
      `Master line: ${row.line}`,
    ].filter(Boolean).join(' | '),
  };

  graph.edges.push(edge);
  edgeIdSet.add(eId);
  report.added_edges.push({ id: eId, line: row.line, from: row.subject, predicate: row.predicate, to: row.object, evidence_class: row.evidence_class });
}

fs.mkdirSync(path.dirname(reportMdPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2) + '\n');
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + '\n');

const unresolved = {
  generated: report.generated,
  note: 'Compiler-level unresolved report. Scout performs graph-analysis findings separately.',
  skipped_rows: report.skipped_rows,
  duplicate_rows: report.duplicate_rows,
};
fs.writeFileSync(unresolvedPath, JSON.stringify(unresolved, null, 2) + '\n');

const reportMd = [
  '# Compile Report',
  '',
  `**Generated:** ${report.generated}`,
  `**Base graph:** \`${path.relative(root, basePath)}\``,
  `**Master:** \`${path.relative(root, masterPath)}\``,
  `**Output:** \`${path.relative(root, outputPath)}\``,
  '',
  '## Summary',
  '',
  '| Item | Count |',
  '|---|---:|',
  `| Parsed publishable rows | ${report.parsed_rows} |`,
  `| Nodes added | ${report.added_nodes.length} |`,
  `| Edges added | ${report.added_edges.length} |`,
  `| Duplicate rows | ${report.duplicate_rows.length} |`,
  `| Skipped rows | ${report.skipped_rows.length} |`,
  `| Graph total nodes | ${graph.nodes.length} |`,
  `| Graph total edges | ${graph.edges.length} |`,
  '',
  '## Skipped Rows',
  '',
  report.skipped_rows.length
    ? report.skipped_rows.slice(0, 200).map(r => `- line ${r.line}: ${r.reason}${r.evidence ? ` (${r.evidence})` : ''}`).join('\n')
    : '_None_',
  '',
  '## Added Nodes',
  '',
  report.added_nodes.length
    ? report.added_nodes.map(n => `- \`${n.id}\` — ${n.label} (${n.type})`).join('\n')
    : '_None_',
  '',
  '## Added Edges',
  '',
  report.added_edges.length
    ? report.added_edges.map(e => `- \`${e.id}\`  \n  line ${e.line}: ${e.from} **${e.predicate}** ${e.to} *(${e.evidence_class})*`).join('\n')
    : '_None_',
].join('\n');

fs.writeFileSync(reportMdPath, reportMd + '\n');

console.log(`compile: ${report.parsed_rows} parsed, +${report.added_nodes.length} nodes, +${report.added_edges.length} edges, ${report.duplicate_rows.length} duplicates, ${report.skipped_rows.length} skipped.`);
console.log(`graph.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.sources.length} sources.`);
console.log(`report: ${path.relative(root, reportMdPath)}`);
