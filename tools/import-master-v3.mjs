#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_MAP = {
  official: 'confirmed',
  confirmed: 'confirmed',
  primary_public: 'primary_public',
  primary: 'primary_public',
  reported: 'reported',
  derived: 'derived',
  judgment: 'judgment',
  open: 'open'
};

const STATUS_MAP = {
  listed: 'listed',
  registered: 'registered',
  attended: 'attended',
  appointed: 'appointed',
  contracted: 'contracted',
  reported: 'reported',
  published: 'published',
  derived: 'derived',
  'public-role': 'public-role',
  public_role: 'public-role'
};

const BANNED_PRIVATE_PATTERNS = [
  ['email', /\bemail\b/i],
  ['phone', /\bphone\b/i],
  ['birthdate', /\bbirthdate\b/i],
  ['mobile', /\bmobile\b/i],
  ['emergency', /\bemergency\b/i],
  ['dietary', /\bdietary\b/i],
  ['sex life', /sex life/i],
  ['matchmaking', /\bmatchmaking\b/i],
  ['looking for love', /looking for love/i],
  ['political leaning', /political leaning/i],
  ['home city', /home city/i],
  ['address', /\baddress\b/i],
  ['token', /\btoken\b/i],
  ['assistant email', /assistant email/i],
  ['verified_contact', /verified[_ -]contact/i],
  ['leaked number', /leaked number/i],
  ['voicemail', /\bvoicemail\b/i]
];

function usage() {
  console.error('Usage: node tools/import-master-v3.mjs path/to/clifford-number-master-v3.md [output.json]');
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim().replace(/<br\s*\/?/gi, ' '));
}

function isDividerRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeEvidence(value) {
  const key = String(value ?? '')
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  return EVIDENCE_MAP[key] ?? null;
}

function normalizeStatus(value) {
  const key = String(value ?? '')
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return STATUS_MAP[key] ?? null;
}

function privateFieldHit(record) {
  const serialized = JSON.stringify(record);
  const match = BANNED_PRIVATE_PATTERNS.find(([, pattern]) => pattern.test(serialized));
  return match?.[0] ?? null;
}

function gateForRow(row, sectionTitle) {
  const evidence = row.evidence_class;
  const uiWeight = Number(row.ui_weight ?? 1);
  const section = sectionTitle.toLowerCase();

  if (evidence === 'open' || uiWeight >= 4 || section.includes('cluster i')) return 'hold';
  if (section.includes('form d') || section.includes('990') || section.includes('procurement') || section.includes('nonprofit layer') || section.includes('vc and capital layer')) return 'verify-before-public';
  if (section.includes('conflict-of-interest')) return 'label-as-structural-overlap';
  if (evidence === 'derived' || evidence === 'judgment') return 'analysis-only';
  if (evidence === 'reported' || uiWeight === 3) return 'review';
  return 'ready';
}

function statusForRow(row, sectionTitle) {
  const explicitStatus = normalizeStatus(row.status ?? row.edge_status ?? row.predicate);
  if (explicitStatus) return explicitStatus;

  const section = sectionTitle.toLowerCase();
  const predicate = String(row.predicate ?? '').toLowerCase().replace(/`/g, '');

  if (predicate.includes('listed') || section.includes('dialog directory')) return 'listed';
  if (predicate.includes('registered') || section.includes('registrants')) return 'registered';
  if (predicate.includes('attended') || section.includes('delegation')) return 'attended';
  if (predicate.includes('appointed') || predicate.includes('commissioned')) return 'appointed';
  if (predicate.includes('awarded') || predicate.includes('contract')) return 'contracted';
  if (row.evidence_class === 'reported') return 'reported';
  return 'public-role';
}

function parseMaster(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let h2 = 'preamble';
  let current = { title: 'preamble', line_start: 1, rows: [] };
  sections.push(current);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      const text = heading[2].trim();
      if (heading[1] === '##') {
        h2 = text;
        current = { title: text, line_start: i + 1, rows: [] };
      } else {
        current = { title: `${h2} > ${text}`, line_start: i + 1, rows: [] };
      }
      sections.push(current);
      continue;
    }

    const cells = splitMarkdownRow(line);
    if (!cells || i + 1 >= lines.length) continue;
    const divider = splitMarkdownRow(lines[i + 1]);
    if (!divider || !isDividerRow(divider) || divider.length !== cells.length) continue;

    const headers = cells.map((header) => slug(header).replace(/-/g, '_'));
    i += 2;

    for (; i < lines.length; i += 1) {
      const rowCells = splitMarkdownRow(lines[i]);
      if (!rowCells || rowCells.length !== headers.length) {
        i -= 1;
        break;
      }
      if (isDividerRow(rowCells)) continue;
      const row = Object.fromEntries(headers.map((header, index) => [header, rowCells[index]]));
      row.line = i + 1;
      current.rows.push(row);
    }
  }

  const normalizedRows = [];
  const rejectedRows = [];
  for (const section of sections) {
    for (const row of section.rows) {
      const normalized = { ...row };
      const evidenceRaw = row.evidence_class ?? row.evidence ?? '';
      normalized.evidence_raw = evidenceRaw;
      normalized.evidence_class = normalizeEvidence(evidenceRaw) ?? 'open';
      normalized.status = statusForRow(normalized, section.title);
      normalized.ui_weight = Number(row.ui_weight ?? row.weight ?? 1);
      normalized.section = section.title;
      normalized.section_line = section.line_start;
      normalized.import_gate = gateForRow(normalized, section.title);
      normalized.id = `${slug(section.title)}-${normalized.line}`;

      const privateHit = privateFieldHit(normalized);
      if (privateHit) {
        rejectedRows.push({
          id: normalized.id,
          section: normalized.section,
          line: normalized.line,
          reason: `private-field:${privateHit}`
        });
        continue;
      }
      normalizedRows.push(normalized);
    }
  }

  const batches = new Map();
  for (const row of normalizedRows) {
    const key = row.import_gate;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(row.id);
  }

  return {
    generated: new Date().toISOString(),
    source_kind: 'clifford-number-master-v3',
    note: 'Generated import queue only. This file does not mutate graph.json and does not collapse listed, registered, and attended states.',
    evidence_map: EVIDENCE_MAP,
    totals: {
      sections: sections.filter((section) => section.title !== 'preamble').length,
      rows: normalizedRows.length,
      rejected_rows: rejectedRows.length,
      by_gate: Object.fromEntries([...batches.entries()].map(([key, rows]) => [key, rows.length]))
    },
    batches: Object.fromEntries([...batches.entries()].map(([key, rows]) => [key, rows])),
    rejected_rows: rejectedRows,
    rows: normalizedRows
  };
}

const [input, output = 'data/import-queues/master-v3.import-queue.json'] = process.argv.slice(2);
if (!input) {
  usage();
  process.exit(1);
}

const inputPath = path.resolve(input);
const markdown = fs.readFileSync(inputPath, 'utf8');
const parsed = parseMaster(markdown);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(parsed, null, 2)}\n`);
console.log(`Wrote ${parsed.totals.rows} queued rows from ${parsed.totals.sections} sections to ${output}.`);
for (const [gate, count] of Object.entries(parsed.totals.by_gate)) {
  console.log(`${gate}: ${count}`);
}
