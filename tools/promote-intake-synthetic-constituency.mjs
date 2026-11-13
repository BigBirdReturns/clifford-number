#!/usr/bin/env node
// Promote the synthetic-constituency research intake into a ledger staging lane.
//
//   node tools/promote-intake-synthetic-constituency.mjs              # promote (deterministic, offline)
//   node tools/promote-intake-synthetic-constituency.mjs --archive    # capture receipts first (network)
//        [--refresh] [--no-save] [--only <receipt id>]
//
// Reads (never writes) the hand-compiled intake
//   data/ledger/staging/synthetic-constituency/intake.json   (receipts + surfaces)
// and writes data/ledger/staging/synthetic-constituency/{surfaces,participation,receipts}.jsonl,
// {actors,organizations}.json, gaps.jsonl and summary.json in the shapes of
// tools/promote-intake-defense-corridor.mjs. tools/merge-staging.mjs appends the lane.
//
// --archive mode follows tools/archive-intake-receipts.mjs: curl with a browser-like User-Agent,
// 30 s timeout, about one request per second per host; error statuses, login walls and bot
// challenges are refused; the body is stored under receipts/synthetic-constituency/<id>.<ext>,
// hashed with the contract's canonical hash, dated (retrieved_at, UTC) and, failing that, a
// Wayback snapshot is looked up (and requested unless --no-save). LinkedIn is never fetched.
// Results go to archived-receipts.jsonl in the lane directory.
//
// Admission rule (the project's own): a row enters the ledger only when it cites at least one
// receipt that resolves to a public source URL and satisfies the live receipt contract
// (tools/lib/receipt-contract.mjs: an archive reference that resolves plus a `limits` sentence).
// A surface may also name `archive_must_show` phrases: when every cited receipt is an in-repo
// text capture, at least one capture must contain each phrase, so the row says only what the
// custody copy shows. Rows that fail go to gaps.jsonl with the reason and the would-be rows, so a
// rerun after archiving promotes them unchanged. Existing ledger receipts may be cited by id.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { checkReceiptContract } from './lib/receipt-contract.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';

const LANE = 'synthetic-constituency';
const OUT = `data/ledger/staging/${LANE}`;
const INTAKE = `${OUT}/intake.json`;
const STORE = `receipts/${LANE}`;
const ARCHIVED = `${OUT}/archived-receipts.jsonl`;

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const intake = readJson(INTAKE);
const uniq = xs => [...new Set(xs)];
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

// =============================================================== --archive
if (args.includes('--archive')) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
  const REFRESH = args.includes('--refresh');
  const SAVE = !args.includes('--no-save');
  const ONLY = opt('--only');
  const lastHit = new Map();
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const pace = (url, gap = 1100) => {
    const host = new URL(url).host;
    const wait = (lastHit.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) sleep(wait);
    lastHit.set(host, Date.now());
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-sc-'));
  const curl = (url, { accept, timeout = 30, gap } = {}) => {
    pace(url, gap);
    const body = path.join(tmp, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    try {
      const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(timeout), '-A', UA,
        '-H', `Accept: ${accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,application/json;q=0.8,*/*;q=0.7'}`,
        '-H', 'Accept-Language: en-GB,en;q=0.9', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
    }
  };
  const isLinkedIn = url => /(^|\.)linkedin\.com$/i.test(new URL(url).hostname);
  const extFor = (ct, url) => {
    const c = ct.toLowerCase();
    if (c.includes('pdf')) return 'pdf';
    if (c.includes('json')) return 'json';
    if (c.includes('html')) return 'html';
    if (c.includes('xml')) return 'xml';
    if (c.startsWith('text/')) return 'txt';
    return /\.pdf(?:$|\?)/i.test(new URL(url).pathname) ? 'pdf' : 'bin';
  };
  const blocked = (res, url) => {
    if (!res.ok) return `fetch_error: ${res.error}`;
    if (res.status === 401 || res.status === 403) return `http_${res.status}_refused`;
    if (res.status === 429) return 'http_429_rate_limited';
    if (res.status >= 400) return `http_${res.status}`;
    if (res.bytes.length < 200) return 'empty_or_truncated_body';
    const head = res.bytes.subarray(0, 20000).toString('utf8');
    if (/<title>\s*(Just a moment|Attention Required|Access denied|Request Rejected)/i.test(head)
        || /cf-browser-verification|challenge-platform\/h\/[bg]\/orchestrate|_Incapsula_Resource|px-captcha/i.test(head)) return 'bot_challenge';
    if (/linkedin\.com\/(authwall|login)/i.test(res.finalUrl ?? '')) return 'login_wall';
    // A deep link that lands on a site root is a removed page, not the cited source.
    try { if (new URL(url).pathname.length > 1 && new URL(res.finalUrl).pathname === '/') return 'redirected_to_site_root'; } catch { /* keep */ }
    return null;
  };
  // The availability API rate-limits hard (HTTP 429); the CDX index answers the same question.
  const wayback = url => {
    const res = curl(`http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&filter=statuscode:200&limit=-1`, { accept: 'application/json', timeout: 40, gap: 3000 });
    if (!res.ok || res.status !== 200) return { checked: false, error: res.error ?? `http_${res.status}` };
    try {
      const rows = JSON.parse(res.bytes.toString('utf8') || '[]');
      return rows.length > 1 ? { checked: true, timestamp: rows[rows.length - 1][1], via: 'cdx' } : { checked: true, timestamp: null, via: 'cdx' };
    } catch (e) { return { checked: false, error: `bad_json: ${e.message}` }; }
  };
  const waybackSave = url => {
    const res = curl(`https://web.archive.org/save/${url}`, { timeout: 120, gap: 6000 });
    if (!res.ok) return { requested: true, error: res.error };
    const m = /web\.archive\.org\/web\/(\d{14})\//.exec(res.finalUrl ?? '');
    return res.status < 400 && m ? { requested: true, timestamp: m[1] } : { requested: true, error: `http_${res.status}` };
  };
  const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const prior = new Map(readJsonl(ARCHIVED, { optional: true }).map(r => [r.receipt_id, r]));
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  const out = [];
  for (const r of intake.receipts) {
    const prev = prior.get(r.id);
    if (ONLY && r.id !== ONLY) { if (prev) out.push(prev); continue; }
    if (!REFRESH && prev?.status === 'archived' && (prev.archive.method === 'internet_archive'
        || (fs.existsSync(path.join(root, prev.path)) && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref))) {
      out.push(prev); continue;
    }
    const rec = { receipt_id: r.id, source_url: r.url, attempted: true };
    let capture = null;
    if (isLinkedIn(r.url)) rec.fetch = { skipped: true, reason: 'login_wall' };
    else {
      const res = curl(r.url);
      const why = blocked(res, r.url);
      rec.fetch = { status: res.status ?? null, final_url: res.finalUrl ?? null, content_type: res.contentType ?? null, ...(why ? { refused: why } : {}) };
      if (!why) {
        const rel = `${STORE}/${slug(r.id)}.${extFor(res.contentType, res.finalUrl || r.url)}`;
        fs.writeFileSync(path.join(root, rel), res.bytes);
        capture = { path: rel, sha256: canonicalReceiptHash(path.join(root, rel)), bytes: res.bytes.length, content_type: res.contentType, final_url: res.finalUrl, at: now() };
      }
    }
    const wb = wayback(r.url);
    rec.wayback = wb;
    if (!capture && !wb.timestamp && SAVE && !isLinkedIn(r.url)) {
      rec.wayback.save = waybackSave(r.url);
      if (rec.wayback.save.timestamp) rec.wayback.timestamp = rec.wayback.save.timestamp;
    }
    const wbRef = rec.wayback.timestamp ? `http://web.archive.org/web/${rec.wayback.timestamp}/${r.url}` : null;
    // Direct fetch refused but a snapshot exists: keep an in-repo copy of the snapshot's original
    // bytes (id_ form) so the custody copy can be read offline; the Wayback ref stays on the row.
    if (!capture && wbRef && !isLinkedIn(r.url)) {
      const snapUrl = `http://web.archive.org/web/${rec.wayback.timestamp}id_/${r.url}`;
      const res = curl(snapUrl, { gap: 3000, timeout: 60 });
      const why = res.ok && res.status < 400 && res.bytes.length >= 200 ? null : (res.error ?? `http_${res.status}`);
      rec.snapshot_fetch = { url: snapUrl, status: res.status ?? null, ...(why ? { refused: why } : {}) };
      if (!why) {
        const rel = `${STORE}/${slug(r.id)}.${extFor(res.contentType, r.url)}`;
        fs.writeFileSync(path.join(root, rel), res.bytes);
        capture = { path: rel, sha256: canonicalReceiptHash(path.join(root, rel)), bytes: res.bytes.length, content_type: res.contentType, final_url: snapUrl, at: now(), from_wayback: rec.wayback.timestamp };
      }
    }
    if (capture) {
      const day = capture.at.slice(0, 10); // capture date; a Wayback-sourced copy also records the snapshot timestamp
      Object.assign(rec, {
        status: 'archived', path: capture.path, retrieved_at: day, retrieved_at_utc: capture.at,
        content_type: capture.content_type, content_bytes: capture.bytes, content_sha256: capture.sha256,
        archive: { method: 'in_repo_content_hash', ref: `sha256:${capture.sha256}`, captured: day, checked: day, fetched_url: r.url,
          final_url: capture.final_url, content_type: capture.content_type, bytes: capture.bytes, ...(wbRef ? { wayback_ref: wbRef } : {}),
          note: capture.from_wayback
            ? `Direct fetch refused (${rec.fetch?.reason ?? rec.fetch?.refused}); hash covers the in-repository copy of the Wayback snapshot ${capture.from_wayback} of the source URL, original bytes (id_ form).`
            : 'Hash covers the in-repository copy of the source body as fetched; markup, scripts and later page changes are not normalized.' },
      });
    } else if (wbRef) {
      const ts = rec.wayback.timestamp;
      Object.assign(rec, { status: 'archived', path: r.url, retrieved_at: `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`,
        archive: { method: 'internet_archive', ref: wbRef, captured: ts, checked: now().slice(0, 10),
          note: rec.fetch?.reason || rec.fetch?.refused ? `Direct fetch refused (${rec.fetch.reason ?? rec.fetch.refused}); the Wayback snapshot is the archive.` : 'Wayback snapshot of the source URL.' } });
    } else {
      rec.status = 'failed';
      rec.reason = `${rec.fetch?.reason ?? rec.fetch?.refused ?? 'no_capture'}; ${wb.checked ? 'no_wayback_snapshot' : `wayback_check_failed (${wb.error})`}`;
    }
    out.push(rec);
    console.log(`${rec.status.padEnd(8)} ${r.id} ${rec.archive?.method ?? rec.reason}${rec.content_bytes ? ` ${rec.content_bytes}B` : ''}`);
  }
  writeJsonl(ARCHIVED, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  const n = f => out.filter(f).length;
  console.log(`archive: ${out.length} receipts; in-repo ${n(r => r.archive?.method === 'in_repo_content_hash')}, wayback-only ${n(r => r.archive?.method === 'internet_archive')}, failed ${n(r => r.status === 'failed')}`);
  if (!args.includes('--promote')) process.exit(0);
}

// =============================================================== canonical state
// Rows this lane already merged are not "existing state": a rerun after merge restages them identically.
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const ledgerSurfaces = readJsonl('data/ledger/surfaces.jsonl');
const ledgerSurfaceIds = new Set(ledgerSurfaces.filter(s => s.intake_source !== INTAKE).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, r]));
const canonOrgByLabel = new Map(canonOrgs.map(o => [norm(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorByLabel = new Map(canonActors.map(a => [norm(a.label), a]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));
const actorAlias = new Map(canonAliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

// =============================================================== receipts
const archived = new Map(readJsonl(ARCHIVED, { optional: true }).map(a => [a.receipt_id, a]));
const receiptState = new Map(); // id -> { candidate, problems, existing }
for (const r of intake.receipts) {
  const arc = archived.get(r.id);
  const problems = [];
  let candidate = {
    receipt_id: r.id, label: r.label, source_type: 'research_intake_source', evidence_class: r.evidence_class,
    path: r.url, source_url: r.url, ...(r.secondary_url ? { secondary_source_url: r.secondary_url } : {}),
    publisher: r.publisher, ...(r.published ? { source_published_at: r.published } : {}),
    limits: r.limits, intake_source: INTAKE,
  };
  if (r.refuse) problems.push(`intake_refused: ${r.refuse}`);
  else if (!arc) problems.push('archive_not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      ...candidate, path: arc.path, retrieved_at: arc.retrieved_at,
      ...(arc.content_sha256 ? { content_sha256: arc.content_sha256, content_type: arc.content_type, content_bytes: arc.content_bytes } : {}),
      notes: `Captured ${arc.retrieved_at} by tools/promote-intake-synthetic-constituency.mjs --archive.${r.published ? ` Source dated ${r.published}.` : ' The source date is taken from the row that cites it, or from the capture date where the row says so.'}`,
      archive: arc.archive,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
  }
  if (ledgerReceipts.has(r.id) && JSON.stringify(ledgerReceipts.get(r.id)) !== JSON.stringify(candidate)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  receiptState.set(r.id, { candidate, problems });
}
function resolveReceipts(ids) {
  const ok = []; const failures = [];
  for (const id of ids ?? []) {
    const st = receiptState.get(id);
    if (st) { if (st.problems.length) failures.push({ receipt_id: id, problems: st.problems }); else ok.push({ ...st.candidate, _new: true }); continue; }
    const led = ledgerReceipts.get(id);
    if (led) { const { errors } = checkReceiptContract([led], { root }); if (errors.length) failures.push({ receipt_id: id, problems: errors.map(e => e.message) }); else ok.push(led); continue; }
    failures.push({ receipt_id: id, problems: ['not_in_intake_or_ledger_receipts'] });
  }
  return { ok, failures };
}
function refusalReason(failures) {
  if (!failures.length) return 'no_receipt_cited';
  const all = failures.flatMap(f => f.problems);
  if (all.some(p => p.startsWith('intake_refused'))) return 'receipt_refused_by_intake';
  if (all.some(p => /archive/.test(p))) return 'receipt_archive_unresolved';
  if (all.some(p => p.startsWith('receipt_contract_limits'))) return 'receipt_limits_missing';
  if (all.some(p => p.startsWith('not_in_'))) return 'receipt_unknown';
  return 'receipt_not_admissible';
}
const EC_RANK = { official: 1, primary_public: 2, reported: 3 };
const strongest = cs => cs.filter(Boolean).sort((a, b) => (EC_RANK[a] ?? 9) - (EC_RANK[b] ?? 9))[0] ?? 'reported';

// Archived text of an in-repo capture, tags stripped and normalized, for archive_must_show checks.
const copyText = new Map();
function archivedText(rc) {
  if (rc?.archive?.method !== 'in_repo_content_hash' || !/\.(html?|json|txt|md|xml)$/i.test(rc.path ?? '')) return null;
  if (!copyText.has(rc.path)) {
    const raw = fs.readFileSync(path.join(root, rc.path), 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, m => (/"(?:articleBody|description|text)"/.test(m) ? m : ' '))
      .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&(?:amp);/gi, '&').replace(/&(?:apos|rsquo|lsquo);/gi, "'").replace(/&(?:quot|ldquo|rdquo);/gi, '"').replace(/&(?:nbsp|mdash|ndash|hellip);/gi, ' ')
      .replace(/\\u0026/g, '&').replace(/\\u2019/g, "'");
    copyText.set(rc.path, norm(raw));
  }
  return copyText.get(rc.path);
}
function missingPhrases(receipts, phrases) {
  const texts = receipts.map(archivedText);
  if (texts.every(t => t === null)) return [];
  return (phrases ?? []).filter(ph => !texts.some(t => t !== null && t.includes(norm(ph))));
}

// =============================================================== entities
const newOrgs = new Map();
const newActors = new Map();
function orgId(p) {
  if (p.id && (canonOrgById.has(p.id) || newOrgs.has(p.id))) return p.id;
  const hit = canonOrgByLabel.get(norm(p.label));
  if (hit) return hit.id;
  if (orgAlias.has(norm(p.label))) return orgAlias.get(norm(p.label));
  const id = p.id ?? slug(p.label);
  if (canonOrgById.has(id)) return id;
  if (canonActorById.has(id) || newActors.has(id)) throw new Error(`refusing to mint organization ${id}: the id already names an actor`);
  if (!newOrgs.has(id)) newOrgs.set(id, { id, label: p.label, kind: p.kind ?? 'company', source: LANE, ...(p.fields ?? {}) });
  return id;
}
function actorId(p) {
  if (p.id && (canonActorById.has(p.id) || newActors.has(p.id))) return p.id;
  const hit = canonActorByLabel.get(norm(p.label));
  if (hit) return hit.id;
  if (actorAlias.has(norm(p.label))) return actorAlias.get(norm(p.label));
  const id = p.id ?? slug(p.label);
  if (canonActorById.has(id)) return id;
  if (canonOrgById.has(id) || newOrgs.has(id)) throw new Error(`refusing to mint actor ${id}: the id already names an organization`);
  if (!newActors.has(id)) newActors.set(id, { id, label: p.label, kind: 'person', source: LANE, ...(p.fields ?? {}) });
  return id;
}

// =============================================================== surfaces
const summary = {};
const gaps = [];
const surfaces = [];
const participation = [];
const cited = new Map();
const tally = t => (summary[t] ??= { read: 0, promoted_rows: 0, refused: 0, refusal_reasons: {} });

for (const s of intake.surfaces ?? []) {
  const t = tally(s.table ?? 'surfaces');
  t.read += 1;
  if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type} on ${s.surface_id}`);
  for (const x of s.secondary_surface_types ?? []) if (!surfaceTypes.has(x)) throw new Error(`unknown secondary type ${x} on ${s.surface_id}`);
  if (ledgerSurfaceIds.has(s.surface_id)) throw new Error(`surface id collides with ledger: ${s.surface_id}`);
  const refuse = (reason, detail = {}) => {
    t.refused += 1;
    t.refusal_reasons[reason] = (t.refusal_reasons[reason] ?? 0) + 1;
    gaps.push({ lane: LANE, table: s.table ?? 'surfaces', row_key: s.surface_id, reason, ...detail, candidate: { surface_id: s.surface_id, surface_label: s.surface_label, receipt_ids: s.receipt_ids } });
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.time_start ?? ''))) { refuse('undated'); continue; }
  const { ok, failures } = resolveReceipts(s.receipt_ids);
  if (!ok.length) { refuse(refusalReason(failures), { receipt_failures: failures }); continue; }
  const missing = missingPhrases(ok.filter(r => r._new), s.archive_must_show);
  if (missing.length) { refuse('claim_not_in_archived_copy', { missing_phrases: missing }); continue; }
  const ids = ok.map(r => r.receipt_id);
  for (const r of ok) if (r._new) { const { _new, ...rest } = r; cited.set(r.receipt_id, rest); }
  const ec = s.evidence_class ?? strongest(ok.map(r => r.evidence_class));
  const time_end = s.time_end ?? s.time_start;
  const parts = s.participants.map(p => {
    const base = p.participant_type === 'actor'
      ? { participant_type: 'actor', actor_id: actorId(p) }
      : { participant_type: 'organization', organization_id: orgId(p) };
    return { surface_id: s.surface_id, ...base, role: p.role, participation_type: p.participation_type,
      time_start: s.time_start, time_end, evidence_class: p.evidence_class ?? ec, receipt_ids: ids, ...(p.notes ? { notes: p.notes } : {}) };
  });
  const actorsOn = uniq(parts.filter(p => p.participant_type === 'actor').map(p => p.actor_id));
  surfaces.push({
    surface_id: s.surface_id, surface_label: s.surface_label, surface_type: s.surface_type,
    secondary_surface_types: s.secondary_surface_types ?? [], hop_eligible: false,
    hop_refusal_reason: s.hop_refusal_reason ?? (actorsOn.length === 0 ? 'organization_only_evidence' : actorsOn.length === 1 ? 'single_actor_context_only' : (ec === 'reported' ? 'reported_evidence_without_upgrade_disposition' : 'synthetic_constituency_lane_context_only')),
    scorable: true, status: s.status, bounded_by: s.bounded_by ?? [], time_start: s.time_start, time_end,
    ...(s.date_basis ? { date_basis: s.date_basis } : {}), evidence_class: ec, receipt_ids: ids,
    notes: s.notes, ...(s.acceptance_boundary ? { acceptance_boundary: s.acceptance_boundary } : {}),
    roster_entry_count: parts.length, intake_source: INTAKE,
  });
  participation.push(...parts);
  t.promoted_rows += 1;
}

// =============================================================== write
const usedIds = new Set([...surfaces.flatMap(s => s.receipt_ids)]);
const receipts = [...cited.values()].filter(r => usedIds.has(r.receipt_id)).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const usedOrg = new Set(participation.map(p => p.organization_id).filter(Boolean));
const usedActor = new Set(participation.map(p => p.actor_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrg.has(o.id));
const actorsOut = [...newActors.values()].filter(a => usedActor.has(a.id));
writeJsonl(`${OUT}/surfaces.jsonl`, surfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: actorsOut });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const receiptStatus = {};
for (const st of receiptState.values()) {
  const k = st.problems.length ? refusalReason([{ problems: st.problems }]) : 'admissible';
  receiptStatus[k] = (receiptStatus[k] ?? 0) + 1;
}
const byType = {};
for (const s of surfaces) byType[s.surface_type] = (byType[s.surface_type] ?? 0) + 1;
const bySecondary = {};
for (const s of surfaces) for (const x of s.secondary_surface_types) bySecondary[x] = (bySecondary[x] ?? 0) + 1;
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: 'tools/promote-intake-synthetic-constituency.mjs',
  sources: { intake: INTAKE, archive_records: ARCHIVED },
  admission_rule: 'A row is promoted only when at least one cited receipt has a public source URL and satisfies the live receipt contract (resolving archive reference plus limits), and every archive_must_show phrase appears in an in-repo capture it cites. Otherwise the row is written to gaps.jsonl.',
  tables: summary,
  intake_receipt_status: receiptStatus,
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length,
    new_actors: actorsOut.length, new_organizations: orgsOut.length, gaps: gaps.length,
    surfaces_by_type: Object.fromEntries(Object.entries(byType).sort()),
    surfaces_by_secondary_type: Object.fromEntries(Object.entries(bySecondary).sort()),
  },
});
console.log(`promote-intake-synthetic-constituency: ${surfaces.length} surfaces, ${participation.length} participation rows, ${receipts.length} receipts, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${gaps.length} gaps.`);
