#!/usr/bin/env node
// UK ministerial meetings lane: the published returns of ministers' meetings with external
// organisations and individuals, entered where a meeting row connects things the ledger already
// holds (owner decision 2026-11-12, "Yes, hunt them", to "Hunt UK official records next, to balance
// the fund notices?"). Archive the returns, then stage rows. Modelled on
// tools/promote-intake-lens-hunt-official.mjs, whose page-text comparison is copied below (that lane
// runs on import, so its helpers are not importable).
//
//   node tools/promote-intake-uk-ministerial-meetings.mjs --fetch [--refresh] [--from-cache <dir>]
//   node tools/promote-intake-uk-ministerial-meetings.mjs            (promote; deterministic, offline)
//
// The intake is data/intake/uk-ministerial-meetings/uk-ministerial-meetings.json, drafted by the
// supervising session from the 717 returns GOV.UK departments published since 2019: pages[] (one per
// return, a CSV on assets.publishing.service.gov.uk, with one drafted surface and its participant
// entries), the selection rule, the supervisor's rulings and the research hands' identity verdicts
// (only "same" calls are in the intake). Every ledger_id already exists: nothing is minted.
//
// --fetch archives each return once under receipts/uk-ministerial-meetings/, hashing the stored file
// with the receipt contract's canonical hash, and writes one record per return to
// data/ledger/staging/uk-ministerial-meetings/archived-receipts.jsonl. Requests carry the project's
// declared research User-Agent and are paced to about one per second. --from-cache <dir> takes
// <dir>/<media id>.csv, fetched earlier from the same public URL with the same User-Agent, as the
// fetched body; the receipt still records the public URL and hashes the stored copy. A CSV is text,
// so no extract is kept. Retrieval days are the operator's local calendar day.
//
// Promote mode is offline and deterministic:
//   - one surface per return, as drafted, dated by the drafted date and date_end; its id is the drafted
//     id with any run of hyphens collapsed, the form tools/build-graph.mjs gives surface node ids;
//   - one participation row per participant entry, dated by that entry's own date, with the drafted
//     role and participation type, evidence class official, citing the return's receipt;
//   - an attendee or host row is admitted only when the archived CSV shows its `shown` words (the
//     lens-hunt comparison: markup stripped, entities decoded, whitespace collapsed, curly quotes
//     folded, letter case ignored, whole words only);
//   - a register_publisher row has no shown words: it is admitted when its organisation is the
//     ledger organisation the rulings give for the page's publisher and the surface has at least one
//     other admitted row;
//   - a surface with no admitted attendee or host row, or whose receipt fails the live receipt
//     contract, goes to gaps whole; so does a second copy of an event the ledger holds (every admitted
//     person already on one ledger surface with the same dates), as in the lens-hunt lane;
//   - the same participant twice on one surface with the same type and day goes to gaps (the merge
//     key would collide).
// Every surface is hop_eligible false (entered_2026_11_12_pending_hop_review): a register lists
// meetings; it is not shared participation between the organisations listed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANE = 'uk-ministerial-meetings';
const TOOL = 'tools/promote-intake-uk-ministerial-meetings.mjs';
const INTAKE = 'data/intake/uk-ministerial-meetings/uk-ministerial-meetings.json';
const STORE = 'receipts/uk-ministerial-meetings';
const OUT = 'data/ledger/staging/uk-ministerial-meetings';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const RESEARCH_UA = process.env.RESEARCH_UA ?? 'clifford-number-research/1.0 public-records research noreply@clifford-number.invalid';
const ASSET_HOST = 'assets.publishing.service.gov.uk';
const TIMEOUT_S = 120;
const ENTERED = '2026-11-12';
const HOP_REFUSAL = 'entered_2026_11_12_pending_hop_review';
const DECISION = { date: ENTERED, decided_by: 'owner', question: 'Hunt UK official records next, to balance the fund notices?', words: 'Yes, hunt them' };
const DRAFTED_SENTENCE = 'Drafted by machine from the UK ministers\' meetings returns on 12 November 2026, each register string judged against the ledger entity by a research hand, and admitted on the archived return showing the words, pending a reader.';
const CONTENT_TYPE = 'text/csv';

const intake = readJson(INTAKE);
const pages = intake.pages.filter(p => (p.surfaces ?? []).length);
const localDay = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const isoUtc = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

// One receipt per return: the asset URL's media id and file name.
function sourceOf(page) {
  const x = new URL(page.source_url);
  const segs = x.pathname.split('/').filter(Boolean);
  if (x.hostname !== ASSET_HOST || segs[0] !== 'media' || !/^[0-9a-f]{24}$/.test(segs[1] ?? '')) throw new Error(`not a GOV.UK asset URL: ${page.source_url}`);
  const file = decodeURIComponent(segs.at(-1));
  const stem = slug(file.replace(/\.[a-z0-9]{2,5}$/i, ''));
  return {
    url: page.source_url, mediaId: segs[1], file,
    id: `ukmm-${segs[1]}-${stem}`.slice(0, 96).replace(/-+$/, ''),
    rel: `${STORE}/${`${segs[1]}-${stem}`.slice(0, 96).replace(/-+$/, '')}.csv`,
  };
}
const sources = pages.map(p => ({ page: p, ...sourceOf(p) }));
{
  const ids = sources.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error('two returns derive the same receipt id');
}
const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const CACHE = args.includes('--from-cache') ? args[args.indexOf('--from-cache') + 1] : null;
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let lastHit = 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uk-ministerial-meetings-'));
  const curl = url => {
    const wait = lastHit + 1100 - Date.now();
    if (wait > 0) sleep(wait);
    lastHit = Date.now();
    const body = path.join(tmp, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    try {
      const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(TIMEOUT_S), '-A', RESEARCH_UA,
        '-H', 'Accept: text/csv,text/plain;q=0.9,*/*;q=0.5', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
    }
  };
  const notCsv = bytes => {
    if (bytes.length < 20) return 'empty_or_truncated_body';
    if (/^\s*</.test(bytes.subarray(0, 200).toString('utf8').replace(/^﻿/, ''))) return 'markup_not_csv';
    return null;
  };
  const manifest = readManifest();
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  let fetched = 0; let cached = 0; let kept = 0;
  for (const src of sources) {
    const limits = src.page.surfaces[0]?.limits;
    if (!limits || limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${src.id}`);
    const prev = manifest.get(src.id);
    if (!REFRESH && prev?.status === 'archived' && fs.existsSync(path.join(root, prev.path))
        && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) { kept += 1; continue; }
    const base = { receipt_id: src.id, source_url: src.url, fetch_url: src.url };
    let bytes; let status = null; let contentType = CONTENT_TYPE; let finalUrl = src.url; let at; let via;
    const cacheFile = CACHE ? path.join(CACHE, `${src.mediaId}.csv`) : null;
    if (cacheFile && fs.existsSync(cacheFile)) {
      bytes = fs.readFileSync(cacheFile);
      at = fs.statSync(cacheFile).mtime;
      via = 'cache';
    } else {
      const res = curl(src.url);
      at = new Date();
      if (!res.ok || res.status >= 400) {
        manifest.set(src.id, { ...base, attempted_at: isoUtc(at), status: 'failed', reason: res.ok ? `http_${res.status}` : `fetch_error: ${res.error}`, http_status: res.status ?? null });
        console.log(`failed   ${src.id}`);
        continue;
      }
      ({ bytes, status, finalUrl } = res);
      contentType = res.contentType || contentType;
      via = 'fetch';
    }
    const why = notCsv(bytes);
    if (why) {
      manifest.set(src.id, { ...base, attempted_at: isoUtc(at), status: 'failed', reason: why, http_status: status });
      console.log(`failed   ${src.id} ${why}`);
      continue;
    }
    fs.writeFileSync(path.join(root, src.rel), bytes);
    const sha = canonicalReceiptHash(path.join(root, src.rel));
    const day = localDay(at);
    manifest.set(src.id, {
      ...base, attempted_at: isoUtc(at), status: 'archived', path: src.rel, retrieved_at: day, retrieved_at_utc: isoUtc(at), http_status: status,
      final_url: finalUrl, content_type: contentType, content_bytes: bytes.length, content_sha256: sha,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: day, checked: day, fetched_url: src.url, content_type: contentType, bytes: bytes.length,
        note: via === 'cache'
          ? 'Body fetched from the public URL with the project\'s declared research User-Agent and taken as the fetched body; hash covers the in-repository copy (text line endings normalised to LF for hashing).'
          : 'Hash covers the in-repository copy of the source body as fetched with the project\'s declared research User-Agent (text line endings normalised to LF for hashing).',
      },
    });
    if (via === 'cache') cached += 1; else fetched += 1;
  }
  writeJsonl(MANIFEST, [...manifest.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id)));
  fs.rmSync(tmp, { recursive: true, force: true });
  const all = [...manifest.values()];
  console.log(`fetch: ${fetched} fetched, ${cached} from cache, ${kept} kept; ${all.filter(r => r.status === 'archived').length} archived, ${all.filter(r => r.status === 'failed').length} failed; wrote ${MANIFEST}`);
}

const argv = process.argv.slice(2);
if (argv.includes('--fetch')) { fetchMode(argv); process.exit(0); }

// =============================================================== promote mode
const uniq = xs => [...new Set(xs)];

// Copied from tools/promote-intake-lens-hunt-official.mjs (the same whole-word comparison).
// ---------------------------------------------------------------- page text
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
  lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', ndash: '–', mdash: '—', hellip: '…', middot: '·', bull: '•',
  copy: '©', reg: '®', trade: '™', eacute: 'é', Eacute: 'É', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä',
  aring: 'å', atilde: 'ã', oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø', uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï', ccedil: 'ç', ntilde: 'ñ', szlig: 'ß', Ouml: 'Ö', Uuml: 'Ü', Auml: 'Ä',
};
const decodeEntities = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
  if (e[0] === '#') {
    const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  }
  return Object.hasOwn(NAMED, e) ? NAMED[e] : m;
});
const stripMarkup = html => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
const fold = s => s.replace(/[‘’‚‛′`]/g, "'").replace(/[“”„‟″]/g, '"').replace(/[  -   　]/g, ' ').replace(/[­​-‍﻿]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const plain = s => fold(decodeEntities(stripMarkup(s)));
const isWordChar = c => /[\p{L}\p{N}]/u.test(c ?? '');
function showsWords(text, words) {
  const needle = fold(decodeEntities(String(words ?? '')));
  if (!needle) return false;
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) {
    const before = i > 0 ? text[i - 1] : '';
    const after = text[i + needle.length] ?? '';
    if (!(isWordChar(needle[0]) && isWordChar(before)) && !(isWordChar(needle.at(-1)) && isWordChar(after))) return true;
  }
  return false;
}

// ---------------------------------------------------------------- canonical state
const canonActorIds = new Set(readJson('data/canonical/actors.json').actors.map(a => a.id));
const canonOrgIds = new Set(readJson('data/canonical/organizations.json').organizations.map(o => o.id));
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const ledgerSurfaces = readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE);
const ledgerSurfaceById = new Map(ledgerSurfaces.map(s => [s.surface_id, s]));
const ledgerParts = readJsonl('data/ledger/participation.jsonl').filter(p => ledgerSurfaceById.has(p.surface_id));
const actorsBySurface = new Map();
for (const p of ledgerParts) if (p.actor_id) {
  if (!actorsBySurface.has(p.surface_id)) actorsBySurface.set(p.surface_id, new Set());
  actorsBySurface.get(p.surface_id).add(p.actor_id);
}
const ledgerReceiptIds = new Set(readJsonl('data/ledger/receipts.jsonl').filter(r => r.intake_source !== LANE).map(r => r.receipt_id));
const departmentOrg = intake.rulings?.department_org ?? {};

// ---------------------------------------------------------------- receipts
const manifest = readManifest();
const receiptState = new Map(); // receipt id -> { candidate, problems, text }
for (const src of sources) {
  const { page } = src;
  const surface = page.surfaces[0];
  const arc = manifest.get(src.id);
  const problems = [];
  let candidate = null;
  if (!arc) problems.push('not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      receipt_id: src.id,
      label: `${page.publication.title} (${src.file})`,
      source_type: 'official_public_register',
      evidence_class: surface.evidence_class,
      publisher: page.publisher,
      ...(page.source_published ? { source_published_at: page.source_published } : {}),
      path: arc.path,
      source_url: src.url,
      retrieved_at: arc.retrieved_at,
      content_sha256: arc.content_sha256,
      content_type: arc.content_type,
      content_bytes: arc.content_bytes,
      notes: `Archived ${arc.retrieved_at} by ${TOOL} --fetch. Published on GOV.UK in "${page.publication.title}" (${page.publication.url}).`,
      limits: surface.limits,
      archive: arc.archive,
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    if (ledgerReceiptIds.has(src.id)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  receiptState.set(src.id, { candidate: problems.length ? null : candidate, problems, ...(problems.length ? {} : { text: plain(fs.readFileSync(path.join(root, candidate.path), 'utf8')) }) });
}

// ---------------------------------------------------------------- accounting and staging
const gaps = [];
const TYPES = ['ministerial_meeting_attendee', 'ministerial_meeting_host', 'register_publisher'];
const byType = () => Object.fromEntries(TYPES.map(t => [t, 0]));
const counts = {
  pages_read: pages.length, surfaces_read: 0, surfaces_entered: 0, surfaces_refused: 0, surface_ids_normalised: 0,
  participants_read: 0, participants_admitted: 0, participants_refused: 0,
  read_by_type: byType(), admitted_by_type: byType(), refused_by_type: byType(),
};
const surfaceIdOf = s => String(s.surface_id).replace(/-{2,}/g, '-');
const gap = (table, rowKey, reason, detail = {}) => gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
const surfaces = [];
const participation = [];
const cited = new Map();

for (const src of sources) {
  const { page } = src;
  if (page.surfaces.length !== 1) throw new Error(`${src.id}: one surface per return, got ${page.surfaces.length}`);
  const s = page.surfaces[0];
  // The drafted id, with any run of hyphens collapsed as tools/build-graph.mjs slugs surface node ids, so the
  // Field finds the surface node (one drafted id ends "july--679b77de").
  const sid = surfaceIdOf(s);
  if (sid !== s.surface_id) counts.surface_ids_normalised += 1;
  counts.surfaces_read += 1;
  counts.participants_read += s.participants.length;
  for (const p of s.participants) {
    if (!TYPES.includes(p.participation_type)) throw new Error(`${sid}: unknown participation type ${p.participation_type}`);
    counts.read_by_type[p.participation_type] += 1;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date)) || p.date < s.date || p.date > (s.date_end ?? s.date)) throw new Error(`${sid}: ${p.ledger_id} dated ${p.date} outside ${s.date}..${s.date_end}`);
    if (p.kind === 'actor' ? !canonActorIds.has(p.ledger_id) : p.kind === 'organization' ? !canonOrgIds.has(p.ledger_id) : true) {
      throw new Error(`${sid}: ${p.kind} ${p.ledger_id} is not in the canonical registry (this lane mints nothing)`);
    }
  }
  const wouldBe = { surface: { surface_id: sid, surface_label: s.label, status: s.status, time_start: s.date, time_end: s.date_end }, participation: s.participants.map(p => ({ kind: p.kind, ledger_id: p.ledger_id, label: p.label, role: p.role, participation_type: p.participation_type, shown: p.shown, date: p.date })) };
  const refuseAll = (reason, detail) => {
    counts.surfaces_refused += 1;
    counts.participants_refused += s.participants.length;
    for (const p of s.participants) counts.refused_by_type[p.participation_type] += 1;
    gap('surfaces', sid, reason, { ...detail, candidate: wouldBe });
  };
  if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type}`);
  if (ledgerSurfaceById.has(sid)) { refuseAll('surface_id_already_in_ledger', {}); continue; }
  const st = receiptState.get(src.id);
  if (st.problems.length) {
    refuseAll(st.problems.some(x => x.startsWith('archive_attempt_failed') || x === 'not_attempted') ? 'receipt_archive_unresolved' : 'receipt_not_admissible',
      { receipt_failures: [{ receipt_id: src.id, problems: st.problems }], source_url: src.url });
    continue;
  }
  const rows = [];
  const refused = [];
  const seen = new Set();
  const publisherEntries = [];
  for (const p of s.participants) {
    const rowKey = `${sid}:${p.ledger_id}:${p.participation_type}:${p.date}`;
    if (p.participation_type === 'register_publisher') { publisherEntries.push({ p, rowKey }); continue; }
    if (!showsWords(st.text, p.shown)) {
      refused.push(p);
      gap('participation', rowKey, 'shown_words_not_on_archived_page', { receipts: [src.id], shown_as: p.shown });
      continue;
    }
    const key = `${p.kind}|${p.ledger_id}|${p.participation_type}|${p.date}`;
    if (seen.has(key)) {
      refused.push(p);
      gap('participation', rowKey, 'same_participant_same_type_same_day_twice_on_surface', { receipts: [src.id], shown_as: p.shown });
      continue;
    }
    seen.add(key);
    rows.push({
      surface_id: sid,
      participant_type: p.kind,
      ...(p.kind === 'actor' ? { actor_id: p.ledger_id } : { organization_id: p.ledger_id }),
      role: p.role,
      participation_type: p.participation_type,
      time_start: p.date,
      time_end: p.date,
      evidence_class: 'official',
      receipt_ids: [src.id],
      ...(fold(p.shown) !== fold(p.label) ? { notes: `Shown in the archived return as "${p.shown}".` } : {}),
    });
  }
  if (!rows.length) {
    counts.surfaces_refused += 1;
    counts.participants_refused += s.participants.length;
    for (const p of s.participants) counts.refused_by_type[p.participation_type] += 1;
    gap('surfaces', sid, 'no_attendee_or_host_admitted', { receipts: [src.id], candidate: wouldBe });
    continue;
  }
  // The publisher row rests on the page itself: the organisation the rulings give for its publisher.
  for (const { p, rowKey } of publisherEntries) {
    const expected = departmentOrg[page.publisher];
    if (p.kind !== 'organization' || p.ledger_id !== expected) {
      refused.push(p);
      gap('participation', rowKey, 'publisher_row_not_the_page_publisher', { receipts: [src.id], publisher: page.publisher, expected_organization_id: expected ?? null });
      continue;
    }
    const key = `${p.kind}|${p.ledger_id}|${p.participation_type}|${p.date}`;
    if (seen.has(key)) { refused.push(p); gap('participation', rowKey, 'same_participant_same_type_same_day_twice_on_surface', { receipts: [src.id] }); continue; }
    seen.add(key);
    rows.push({
      surface_id: sid,
      participant_type: 'organization',
      organization_id: p.ledger_id,
      role: p.role,
      participation_type: p.participation_type,
      time_start: p.date,
      time_end: p.date,
      evidence_class: 'official',
      receipt_ids: [src.id],
      notes: `The return is published by ${page.publisher} on GOV.UK.`,
    });
  }
  // One copy per event, as in the lens-hunt lane (a Form D notice filed the same day is not an event copy).
  const admittedActors = uniq(rows.filter(r => r.actor_id).map(r => r.actor_id));
  const sameEvent = admittedActors.length ? ledgerSurfaces.filter(o => o.intake_source !== 'sec-form-d' && o.time_start === s.date && (o.time_end ?? o.time_start) === (s.date_end ?? s.date)
    && admittedActors.every(a => (actorsBySurface.get(o.surface_id) ?? new Set()).has(a))).map(o => o.surface_id).sort() : [];
  if (sameEvent.length) { refuseAll('event_already_in_ledger', { existing_surface_ids: sameEvent, receipts: [src.id] }); continue; }
  cited.set(src.id, st.candidate);
  surfaces.push({
    surface_id: sid,
    surface_label: s.label,
    surface_type: s.surface_type,
    secondary_surface_types: [],
    hop_eligible: false,
    hop_refusal_reason: HOP_REFUSAL,
    scorable: true,
    status: s.status,
    bounded_by: s.bounded_by,
    time_start: s.date,
    time_end: s.date_end ?? s.date,
    evidence_class: s.evidence_class,
    receipt_ids: [src.id],
    notes: `${s.notes.trim()} ${DRAFTED_SENTENCE}`,
    date_basis: s.date_basis,
    limits: s.limits,
    intake_source: LANE,
    roster_entry_count: rows.length,
  });
  participation.push(...rows);
  counts.surfaces_entered += 1;
  counts.participants_admitted += rows.length;
  counts.participants_refused += refused.length;
  for (const r of rows) counts.admitted_by_type[r.participation_type] += 1;
  for (const p of refused) counts.refused_by_type[p.participation_type] += 1;
}

// =============================================================== write
surfaces.sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id));
const order = new Map(surfaces.map((s, i) => [s.surface_id, i]));
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const receipts = [...cited.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const { errors: contractErrors } = checkReceiptContract(receipts, { root });
if (contractErrors.length) throw new Error(`staged receipts fail the receipt contract: ${contractErrors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);
if (surfaces.some(s => s.hop_eligible !== false)) throw new Error('every surface of this lane must be hop_eligible false');
{
  const keys = participation.map(p => `${p.surface_id}|${p.participant_type}|${p.actor_id ?? p.organization_id}|${p.participation_type}|${p.time_start}`);
  if (new Set(keys).size !== keys.length) throw new Error('two staged rows share a merge key');
}

writeJsonl(`${OUT}/surfaces.jsonl`, surfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: [] });
writeJson(`${OUT}/organizations.json`, { organizations: [] });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const reasons = {};
for (const g of gaps) reasons[`${g.table}:${g.reason}`] = (reasons[`${g.table}:${g.reason}`] ?? 0) + 1;
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: TOOL,
  intake: INTAKE,
  decision: DECISION,
  selection_rule: intake.selection_rule,
  sources: {
    manifest: MANIFEST, store: STORE, returns: sources.length,
    archived: [...manifest.values()].filter(r => r.status === 'archived').length,
    failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
  },
  admission_rule: 'One surface per published return, dated by the drafted span; one row per participant entry, dated by its own meeting date. An attendee or host row is admitted only when the archived CSV shows its shown words (markup stripped, entities decoded, whitespace collapsed, curly quotes folded, letter case ignored, whole words); a register_publisher row is admitted when its organisation is the one the rulings give for the page publisher and the surface has another admitted row. A surface whose receipt fails the live receipt contract or with no admitted attendee or host row goes to gaps. Nothing is minted. Every surface is hop_eligible false pending a reader: a register lists meetings, not shared participation between the organisations listed.',
  counts,
  gap_reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length,
    new_actors: 0, new_organizations: 0, gaps: gaps.length, hop_eligible_surfaces: 0,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-uk-ministerial-meetings: ${surfaces.length} surfaces (0 hop-eligible), ${participation.length} participation rows, ${receipts.length} receipts, 0 actors, 0 organizations staged; ${gaps.length} gaps.`);
