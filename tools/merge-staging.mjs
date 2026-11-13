#!/usr/bin/env node
// Merge ledger staging lanes into the canonical ledger and registries, idempotently.
//
// Each lane is a directory data/ledger/staging/<lane>/ holding any of
//   surfaces.jsonl, participation.jsonl, receipts.jsonl, actors.json, organizations.json
// Rows are appended in lane order (lanes sorted by name) to
//   data/ledger/{surfaces,participation,receipts}.jsonl
// and new entities to data/canonical/{actors,organizations}.json.
//
// Guarantees:
//   - ids already present are skipped (surface_id, receipt_id, actor/organization id; participation
//     by surface_id + participant id + participation_type + time_start); existing rows and their
//     bytes are never modified, only appended after;
//   - a lane is merged only when it passes preflight against the combined ledger: known surface
//     types, every reference resolvable (surface, actor, organization, receipt), required fields
//     present, and every new receipt satisfying the live receipt contract. A failing lane is
//     skipped whole and the run exits non-zero;
//   - re-running is a no-op.
//
// Usage: node tools/merge-staging.mjs [--lane <name> ...] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl } from './lib/ledger.mjs';
import { checkReceiptContract, formatReceiptContractError } from './lib/receipt-contract.mjs';

const args = process.argv.slice(2);
const onlyLanes = [];
let dryRun = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--lane') onlyLanes.push(args[++i]);
  else if (args[i] === '--dry-run') dryRun = true;
  else { console.error(`merge-staging: unknown argument ${args[i]}`); process.exit(2); }
}

const STAGING = 'data/ledger/staging';
const stagingDir = path.join(root, STAGING);
const lanes = fs.existsSync(stagingDir)
  ? fs.readdirSync(stagingDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()
  : [];
for (const l of onlyLanes) if (!lanes.includes(l)) { console.error(`merge-staging: no staging lane ${l}`); process.exit(2); }
const selected = onlyLanes.length ? lanes.filter(l => onlyLanes.includes(l)) : lanes;

// ---------------------------------------------------------------- current state
const ledger = {
  surfaces: readJsonl('data/ledger/surfaces.jsonl'),
  participation: readJsonl('data/ledger/participation.jsonl'),
  receipts: readJsonl('data/ledger/receipts.jsonl'),
};
const actors = readJson('data/canonical/actors.json').actors;
const organizations = readJson('data/canonical/organizations.json').organizations;
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));

const partKey = p => `${p.surface_id}|${p.participant_type}|${p.actor_id ?? p.organization_id}|${p.participation_type}|${p.time_start}`;
const ids = {
  surfaces: new Set(ledger.surfaces.map(s => s.surface_id)),
  participation: new Set(ledger.participation.map(partKey)),
  receipts: new Set(ledger.receipts.map(r => r.receipt_id)),
  actors: new Set(actors.map(a => a.id)),
  organizations: new Set(organizations.map(o => o.id)),
};
const keyOf = {
  surfaces: s => s.surface_id,
  participation: partKey,
  receipts: r => r.receipt_id,
  actors: a => a.id,
  organizations: o => o.id,
};

const SURFACE_REQUIRED = ['surface_id', 'surface_label', 'surface_type', 'time_start', 'evidence_class', 'receipt_ids'];
const PART_REQUIRED = ['surface_id', 'participant_type', 'role', 'participation_type', 'time_start', 'evidence_class', 'receipt_ids'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function readLane(lane) {
  const dir = `${STAGING}/${lane}`;
  const opt = f => fs.existsSync(path.join(root, dir, f));
  return {
    surfaces: opt('surfaces.jsonl') ? readJsonl(`${dir}/surfaces.jsonl`) : [],
    participation: opt('participation.jsonl') ? readJsonl(`${dir}/participation.jsonl`) : [],
    receipts: opt('receipts.jsonl') ? readJsonl(`${dir}/receipts.jsonl`) : [],
    actors: opt('actors.json') ? readJson(`${dir}/actors.json`).actors ?? [] : [],
    organizations: opt('organizations.json') ? readJson(`${dir}/organizations.json`).organizations ?? [] : [],
  };
}

function newRows(kind, rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = keyOf[kind](r);
    if (ids[kind].has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function preflight(lane, add) {
  const errors = [];
  const has = (kind, id) => ids[kind].has(id) || add[kind].some(r => keyOf[kind](r) === id);
  const receiptOk = id => has('receipts', id);
  for (const s of add.surfaces) {
    for (const f of SURFACE_REQUIRED) if (s[f] === undefined || s[f] === null || s[f] === '') errors.push(`surface ${s.surface_id}: missing ${f}`);
    if (!surfaceTypes.has(s.surface_type)) errors.push(`surface ${s.surface_id}: unknown surface_type ${s.surface_type}`);
    for (const t of s.secondary_surface_types ?? []) if (!surfaceTypes.has(t)) errors.push(`surface ${s.surface_id}: unknown secondary type ${t}`);
    if (!ISO.test(String(s.time_start))) errors.push(`surface ${s.surface_id}: time_start not ISO`);
    if (typeof s.hop_eligible !== 'boolean') errors.push(`surface ${s.surface_id}: hop_eligible must be boolean`);
    if (s.hop_eligible === false && !s.hop_refusal_reason) errors.push(`surface ${s.surface_id}: hop_eligible false without hop_refusal_reason`);
    if (!(s.receipt_ids ?? []).length) errors.push(`surface ${s.surface_id}: no receipt_ids`);
    for (const r of s.receipt_ids ?? []) if (!receiptOk(r)) errors.push(`surface ${s.surface_id}: missing receipt ${r}`);
  }
  for (const p of add.participation) {
    const pid = p.actor_id ?? p.organization_id;
    for (const f of PART_REQUIRED) if (p[f] === undefined || p[f] === null || p[f] === '') errors.push(`participation ${p.surface_id}/${pid}: missing ${f}`);
    if (!has('surfaces', p.surface_id)) errors.push(`participation ${p.surface_id}/${pid}: missing surface`);
    if (p.participant_type === 'actor' && !has('actors', p.actor_id)) errors.push(`participation ${p.surface_id}: missing actor ${p.actor_id}`);
    else if (p.participant_type === 'organization' && !has('organizations', p.organization_id)) errors.push(`participation ${p.surface_id}: missing organization ${p.organization_id}`);
    else if (!['actor', 'organization'].includes(p.participant_type)) errors.push(`participation ${p.surface_id}: bad participant_type ${p.participant_type}`);
    if (!ISO.test(String(p.time_start))) errors.push(`participation ${p.surface_id}/${pid}: time_start not ISO`);
    if (!(p.receipt_ids ?? []).length) errors.push(`participation ${p.surface_id}/${pid}: no receipt_ids`);
    for (const r of p.receipt_ids ?? []) if (!receiptOk(r)) errors.push(`participation ${p.surface_id}/${pid}: missing receipt ${r}`);
  }
  for (const a of add.actors) if (!a.id || !a.label || a.kind !== 'person') errors.push(`actor ${a.id}: needs id, label, kind person`);
  for (const o of add.organizations) if (!o.id || !o.label || !o.kind) errors.push(`organization ${o.id}: needs id, label, kind`);
  const contract = checkReceiptContract(add.receipts, { root });
  for (const e of contract.errors) errors.push(formatReceiptContractError(e));
  return errors;
}

// ---------------------------------------------------------------- byte-preserving writers
function appendJsonl(file, rows) {
  if (!rows.length) return;
  const full = path.join(root, file);
  const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sep = text.length && !text.endsWith('\n') ? eol : '';
  fs.appendFileSync(full, sep + rows.map(r => JSON.stringify(r)).join(eol) + eol);
}

// Insert entries before the closing bracket of the single top-level array, keeping every existing
// byte and the file's own indentation and line endings.
function appendToRegistry(file, key, entries) {
  if (!entries.length) return;
  const full = path.join(root, file);
  const text = fs.readFileSync(full, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const unit = (/\n( +)"/.exec(text)?.[1]) ?? '  ';
  const close = text.lastIndexOf(']');
  if (close < 0 || !text.includes(`"${key}"`)) throw new Error(`${file}: cannot locate ${key} array`);
  const head = text.slice(0, close).replace(/\s+$/, '');
  const tail = text.slice(close);
  const empty = head.endsWith('[');
  const indent = unit + unit;
  const body = entries.map(e => JSON.stringify(e, null, unit.length).split('\n').map(l => indent + l).join(eol)).join(`,${eol}`);
  const closeIndent = /\n( *)\]/.exec(text.slice(close - 40))?.[1] ?? unit;
  const next = `${head}${empty ? '' : ','}${eol}${body}${eol}${closeIndent}${tail}`;
  JSON.parse(next); // must stay valid JSON
  fs.writeFileSync(full, next);
}

// ---------------------------------------------------------------- run
const report = [];
let failed = false;
for (const lane of selected) {
  const staged = readLane(lane);
  const add = Object.fromEntries(Object.keys(staged).map(k => [k, newRows(k, staged[k])]));
  const errors = preflight(lane, add);
  const counts = Object.fromEntries(Object.keys(add).map(k => [k, { staged: staged[k].length, appended: errors.length ? 0 : add[k].length, skipped_existing: staged[k].length - add[k].length }]));
  if (errors.length) {
    failed = true;
    report.push({ lane, merged: false, errors: errors.slice(0, 50), error_count: errors.length, counts });
    continue;
  }
  if (!dryRun) {
    appendJsonl('data/ledger/receipts.jsonl', add.receipts);
    appendToRegistry('data/canonical/actors.json', 'actors', add.actors);
    appendToRegistry('data/canonical/organizations.json', 'organizations', add.organizations);
    appendJsonl('data/ledger/surfaces.jsonl', add.surfaces);
    appendJsonl('data/ledger/participation.jsonl', add.participation);
  }
  for (const k of Object.keys(add)) for (const r of add[k]) ids[k].add(keyOf[k](r));
  report.push({ lane, merged: !dryRun, dry_run: dryRun, counts });
}

for (const r of report) {
  const c = Object.entries(r.counts).map(([k, v]) => `${k} +${v.appended} (${v.skipped_existing} already present)`).join(', ');
  console.log(`merge-staging: lane ${r.lane}: ${r.merged ? 'merged' : (r.dry_run ? 'dry-run' : 'REFUSED')} — ${c}`);
  for (const e of r.errors ?? []) console.error(`  - ${e}`);
  if (r.error_count > 50) console.error(`  ... ${r.error_count - 50} more`);
}
if (!selected.length) console.log('merge-staging: no staging lanes');
process.exit(failed ? 1 : 0);
