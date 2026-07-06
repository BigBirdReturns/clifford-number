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

// Load a single case. Cases share canonical vocabularies but own their ledgers
// and registries (BUILD-INSTRUCTIONS 5.1). A case config carries:
//   registries_dir — dir holding actors.json + organizations.json (and an
//     OPTIONAL aliases.json; a case may instead carry per-row "aliases" arrays).
//   ledger_dir — dir holding receipts / surfaces / participation (.jsonl) plus
//     OPTIONAL claims / chains.
// Shared vocabulary (surface-types.json incl. density_rule, predicates.json) is
// ALWAYS read from data/canonical, regardless of case.
export function loadCase(caseCfg) {
  if (!caseCfg?.registries_dir || !caseCfg?.ledger_dir) {
    throw new Error(`case ${caseCfg?.id ?? '?'} is missing registries_dir/ledger_dir`);
  }
  const reg = caseCfg.registries_dir;
  const led = caseCfg.ledger_dir;

  const actors = readJson(path.join(reg, 'actors.json')).actors;
  const organizations = readJson(path.join(reg, 'organizations.json')).organizations;
  const aliasPath = path.join(reg, 'aliases.json');
  const aliases = fs.existsSync(path.join(root, aliasPath)) ? readJson(aliasPath).aliases : [];

  // Shared canonical vocabulary — always from data/canonical.
  const predicates = readJson('data/canonical/predicates.json').predicates;
  const surfaceTypeRegistry = readJson('data/canonical/surface-types.json');
  const surfaceTypes = surfaceTypeRegistry.surface_types;
  const densityRule = surfaceTypeRegistry.density_rule ?? null;

  const receipts = readJsonl(path.join(led, 'receipts.jsonl'));
  const claims = readJsonl(path.join(led, 'claims.jsonl'), { optional: true });
  const surfaces = readJsonl(path.join(led, 'surfaces.jsonl'));
  const participation = readJsonl(path.join(led, 'participation.jsonl'));
  const chains = readJsonl(path.join(led, 'chains.jsonl'), { optional: true });

  return { actors, organizations, aliases, predicates, surfaceTypes, densityRule, receipts, claims, surfaces, participation, chains };
}

// Backwards-compatible loader for existing callers: the UK default case.
export function loadAll() {
  return loadCase({ id: 'uk-ai-policy', registries_dir: 'data/canonical', ledger_dir: 'data/ledger' });
}

// Read cases.json and return the case list with the default case first. Only
// cases that own a ledger (registries_dir + ledger_dir) are pipeline cases;
// shell cases (e.g. the template) are skipped.
export function loadCases() {
  const cfg = readJson('cases.json');
  const defaultId = cfg.default_case_id;
  const cases = (cfg.cases ?? []).filter(c => c.registries_dir && c.ledger_dir);
  cases.sort((a, b) => (a.id === defaultId ? -1 : b.id === defaultId ? 1 : 0));
  return { defaultId, cases };
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
