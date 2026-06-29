import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const __dir = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(__dir, '../..');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

export function writeJson(file, data) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
}

export function readJsonl(file, { optional = false } = {}) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    if (optional) return [];
    throw new Error(`missing JSONL file: ${file}`);
  }
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    try {
      out.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`${file}:${i + 1}: invalid JSONL: ${err.message}`);
    }
  }
  return out;
}

export function writeJsonl(file, rows) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}

export function slug(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[`'"()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function uniq(arr) {
  return [...new Set(arr)];
}

export function combinations(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]]);
  }
  return out;
}

export function indexBy(rows, key) {
  const m = new Map();
  for (const row of rows) {
    if (m.has(row[key])) throw new Error(`duplicate ${key}: ${row[key]}`);
    m.set(row[key], row);
  }
  return m;
}

export function loadAll() {
  const actors = readJson('data/canonical/actors.json').actors;
  const organizations = readJson('data/canonical/organizations.json').organizations;
  const aliases = readJson('data/canonical/aliases.json').aliases;
  const predicates = readJson('data/canonical/predicates.json').predicates;
  const surfaceTypes = readJson('data/canonical/surface-types.json').surface_types;
  const receipts = readJsonl('data/ledger/receipts.jsonl');
  const claims = readJsonl('data/ledger/claims.jsonl', { optional: true });
  const surfaces = readJsonl('data/ledger/surfaces.jsonl');
  const participation = readJsonl('data/ledger/participation.jsonl');
  return { actors, organizations, aliases, predicates, surfaceTypes, receipts, claims, surfaces, participation };
}

export function evidenceWeight(evidenceClass) {
  switch (evidenceClass) {
    case 'official': return 1;
    case 'primary_public': return 1.25;
    case 'reported': return 2;
    case 'derived': return 3;
    case 'judgment': return 4;
    case 'open': return 5;
    default: return 4;
  }
}
