#!/usr/bin/env node
// Lens-hunt official lane: the official and first-party records found by the lens hunt of
// 10 November 2026, entered in one pass on the owner's decision of that day ("Yes, one pass").
// Archive the source pages, then stage rows.
//
//   node tools/promote-intake-lens-hunt-official.mjs --fetch [--refresh] [--only <receipt_id>]
//   node tools/promote-intake-lens-hunt-official.mjs            (promote; deterministic, offline)
//
// The intake is data/intake/lens-hunt-official/lens-hunt-official.json, machine-drafted from
// contributions/inbox/research-batches/2026-11-10-lens-hunt/leads.jsonl and checked by the
// supervising session: pages[] (one per source page, each with the new surfaces it supports and
// their participants) and roster[] (organisation rows for three surfaces the ledger already holds).
//
// --fetch archives each source page once under receipts/lens-hunt/, hashing the stored file with the
// receipt contract's canonical hash, and writes one record per page to
// data/ledger/staging/lens-hunt-official/archived-receipts.jsonl. A page the ledger already holds a
// stored copy of (an in-repo copy of the page itself, not a written .md extract) is not archived
// again: its ledger receipt is reused. SEC pages carry the project's declared SEC User-Agent (the
// same SEC_UA as tools/promote-intake-capital-factory.mjs); other hosts get a browser User-Agent.
// Requests are paced per host (about one per second; eight seconds for the Wayback Machine). A page
// that refuses a direct fetch is taken from its closest Wayback snapshot (the snapshot body is
// stored in-repo and its URL kept as wayback_ref). A PDF gets a pdftotext extract beside it
// (receipts/lens-hunt/<name>.txt), as tools/promote-intake-conventions.mjs does, so names can be
// checked offline; the PDF is the receipt. Retrieval days are the operator's local calendar day.
//
// Promote mode is offline and deterministic and applies the project's admission rule mechanically:
//   - a participant is admitted only when the archived copy of a cited receipt shows its `shown`
//     words: text compared with markup stripped, entities decoded, whitespace collapsed and curly
//     quotes folded, ignoring letter case, as whole words (no letter or digit on either side);
//   - a surface is admitted only when its receipt satisfies the live receipt contract and at least
//     one participant is admitted, and it is not a second copy of an event the ledger already holds
//     (every admitted person already on one ledger surface with the same dates);
//   - everything refused goes to gaps.jsonl with the reason and the would-be rows. A PDF whose text
//     cannot be read offline is refused as unread.
// New surfaces take the drafted fields as given. Every one is hop_eligible false
// (entered_2026_11_10_pending_hop_review): no Clifford number moves until a reader reviews it.
// Roster blocks append organisation rows to existing ledger surfaces, in the shape of the
// organisation rows those surfaces already hold; existing rows are never modified. A roster row
// that would change how its existing surface is treated goes to gaps instead (see ROSTER below).
// A block with `enter_on` names the surface its rows go on instead: an addendum surface this lane
// creates from the same page (the techUK roundtable roster, whose curated surface is pinned).
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';
import {
  SEC_UA, splitUrls, urlKey, isSec, heldPageCopies, createPageArchiver,
  kebab, uniq, norm, entityKey, decodeEntities, stripMarkup, fold, plain, showsWords, readArchivedText,
} from './lib/intake-page-lane.mjs';

const LANE = 'lens-hunt-official';
const TOOL = 'tools/promote-intake-lens-hunt-official.mjs';
const INTAKE = 'data/intake/lens-hunt-official/lens-hunt-official.json';
const STORE = 'receipts/lens-hunt';
const OUT = 'data/ledger/staging/lens-hunt-official';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const TIMEOUT_S = 60;
const ENTERED = '2026-11-10';
const HOP_REFUSAL = 'entered_2026_11_10_pending_hop_review';
const DRAFTED_SENTENCE = 'Drafted by machine from the lens hunt of 10 November 2026 and admitted on the archived page showing the names, pending a reader.';

// ---------------------------------------------------------------- roster shapes
// The organisation rows each existing surface already holds, by surface. The techUK roundtable is the
// Clifford-Anduril boundary surface: tools/validate-release.mjs and test/compiler.test.js pin its
// organisation set to Anduril Industries and DSIT, so appending the rest of the meeting's roster
// would change how that surface is treated; its roster rows go to gaps instead.
const ROSTER = {
  'dsit-matt-clifford-ai-investor-roundtable-2023-10-25': {
    role: 'named organization in the official AI roundtable discussion row', participation_type: 'organization_roster_entry',
    note: () => 'The official row names the organization, not a natural-person representative.',
  },
  'dsit-techuk-anduril-ai-safety-roundtable-2023-10-17': {
    refuse: 'existing_surface_organization_set_pinned_by_release_contract',
    refuse_detail: 'tools/validate-release.mjs and test/compiler.test.js pin this surface\'s organisation set to anduril-industries and dsit (the Clifford-Anduril boundary); further roster organisations would change how it is treated.',
  },
  // Follow-up 2026-11-10: the intake's techUK roster block enters on the addendum this lane creates from
  // the same register page (enter_on), in the shape of the curated surface's organisation rows.
  'dsit-techuk-anduril-ai-safety-roundtable-2023-10-17-further-names': {
    role: 'named organization in the official techUK AI Safety Summit roundtable row', participation_type: 'organization_roster_entry',
    note: () => 'The official row names the organization, not a natural-person representative.',
  },
  'uk-ai-safety-summit-2023-confirmed-attendees-programme-roster': {
    role: 'confirmed attending organisation', participation_type: 'listed_programme_organization',
    note: (shown, section) => (section ? `Listed as "${shown}" under "${section}".` : `Listed as "${shown}".`),
  },
};

const intake = readJson(INTAKE);
const pages = intake.pages.filter(p => (p.surfaces ?? []).length);

const ledgerReceiptsAll = readJsonl('data/ledger/receipts.jsonl');
const heldCopies = heldPageCopies(ledgerReceiptsAll, LANE);

// One source per distinct page URL the intake names, in intake order; described by the first page
// that names it.
function receiptIdFor(u) {
  const x = new URL(u);
  const host = x.hostname.toLowerCase().replace(/^www\./, '');
  const segs = x.pathname.split('/').filter(Boolean);
  const stem = (segs.at(-1) ?? '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const tail = isSec(u) ? `${segs[3] ?? ''}-${stem}` : `${stem}${x.search ? `-${x.search.slice(1)}` : ''}`;
  return `lens-${slug(`${host}-${tail}`)}`.slice(0, 96).replace(/-+$/, '');
}
const sources = new Map(); // urlKey -> source
function addSource(u, page) {
  const k = urlKey(u);
  if (sources.has(k)) return sources.get(k);
  const surface = page?.surfaces?.[0];
  const reuse = heldCopies.get(k) ?? [];
  const src = {
    key: k, url: u, sec: isSec(u), reuse,
    id: reuse.length ? null : receiptIdFor(u),
    publisher: page?.publisher ?? null,
    published: page?.source_published ?? null,
    ec: surface?.evidence_class ?? 'official',
    source_type: isSec(u) ? 'sec_edgar_record'
      : surface?.evidence_class === 'official' ? (page?.source_class === 'register' ? 'official_public_register' : 'official_public_record') : 'first_party_publication',
    label: page && surface ? `${page.publisher}: ${surface.label}` : u,
    limits: surface?.limits ?? null,
  };
  sources.set(k, src);
  return src;
}
for (const p of pages) for (const u of splitUrls(p.source_url)) addSource(u, p);
for (const r of intake.roster) for (const u of r.source_urls) addSource(u, pages.find(p => splitUrls(p.source_url).some(v => urlKey(v) === urlKey(u))));
{
  const ids = [...sources.values()].map(s => s.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('two source pages derive the same receipt id');
}
const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const archiver = createPageArchiver({ tmpPrefix: 'lens-hunt-archive-', timeoutS: TIMEOUT_S });
  const manifest = readManifest();
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  for (const src of sources.values()) {
    if (src.reuse.length) {
      manifest.set(`reuse:${src.key}`, { receipt_id: `reuse:${src.key}`, source_url: src.url, status: 'reused_ledger_receipt', reused_receipt_ids: src.reuse });
      continue;
    }
    if (ONLY && src.id !== ONLY) continue;
    const prev = manifest.get(src.id);
    if (!REFRESH && prev?.status === 'archived' && fs.existsSync(path.join(root, prev.path))
        && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) continue;
    if (!REFRESH && prev?.status === 'not_archived') continue;
    if (!src.limits || src.limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${src.id}`);
    manifest.set(src.id, archiver.archive(src, { store: STORE, name: src.id.replace(/^lens-/, '') }));
  }
  writeJsonl(MANIFEST, [...manifest.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id)));
  archiver.close();
  const all = [...manifest.values()];
  console.log(`fetch: ${all.filter(r => r.status === 'archived').length} archived, ${all.filter(r => r.status === 'reused_ledger_receipt').length} reused, ${all.filter(r => r.status === 'failed').length} failed; wrote ${MANIFEST}`);
}

const argv = process.argv.slice(2);
if (argv.includes('--fetch')) { fetchMode(argv); process.exit(0); }

// =============================================================== promote mode

// ---------------------------------------------------------------- canonical state
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const ledgerSurfaces = readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE);
const ledgerSurfaceById = new Map(ledgerSurfaces.map(s => [s.surface_id, s]));
// Rows this lane already merged (each ends with DRAFTED_SENTENCE) are not existing state, so a rerun
// after the merge restages them identically.
const ledgerParts = readJsonl('data/ledger/participation.jsonl').filter(p => !String(p.notes ?? '').endsWith(DRAFTED_SENTENCE));
const actorsBySurface = new Map();
for (const p of ledgerParts) if (p.actor_id && ledgerSurfaceById.has(p.surface_id)) {
  if (!actorsBySurface.has(p.surface_id)) actorsBySurface.set(p.surface_id, new Set());
  actorsBySurface.get(p.surface_id).add(p.actor_id);
}
const ledgerReceiptById = new Map(ledgerReceiptsAll.filter(r => r.intake_source !== LANE).map(r => [r.receipt_id, r]));
const canonOrgByKey = new Map(canonOrgs.map(o => [entityKey(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorByLabel = new Map(canonActors.map(a => [norm(a.label), a]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [entityKey(x.alias), x.canonical_id]));
const actorAlias = new Map(canonAliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

const newOrgs = new Map();
const newActors = new Map();
const newOrgByKey = new Map();
function ensureOrg(label) {
  const key = entityKey(label);
  if (canonOrgByKey.has(key)) return canonOrgByKey.get(key).id;
  if (orgAlias.has(key)) return orgAlias.get(key);
  if (newOrgByKey.has(key)) return newOrgByKey.get(key);
  const id = kebab(label);
  if (canonOrgById.has(id)) return id;
  if (canonActorById.has(id) || newActors.has(id)) throw new Error(`refusing to mint organization ${id}: the id already names an actor`);
  newOrgs.set(id, { id, label, kind: 'organization', source: LANE });
  newOrgByKey.set(key, id);
  return id;
}
function ensureActor(label) {
  const hit = canonActorByLabel.get(norm(label));
  if (hit) return hit.id;
  if (actorAlias.has(norm(label))) return actorAlias.get(norm(label));
  const id = kebab(label);
  if (canonActorById.has(id)) return id;
  if (canonOrgById.has(id) || newOrgs.has(id)) throw new Error(`refusing to mint actor ${id}: the id already names an organization`);
  if (!newActors.has(id)) newActors.set(id, { id, label, kind: 'person', source: LANE });
  return id;
}

// ---------------------------------------------------------------- receipts
const manifest = readManifest();
const receiptState = new Map(); // receipt id -> { candidate, problems, text }
const sourceReceiptIds = new Map(); // urlKey -> receipt ids
for (const src of sources.values()) {
  if (src.reuse.length) {
    sourceReceiptIds.set(src.key, src.reuse);
    for (const id of src.reuse) {
      if (receiptState.has(id)) continue;
      const r = ledgerReceiptById.get(id);
      const problems = [];
      const { errors } = checkReceiptContract([r], { root });
      for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
      receiptState.set(id, { candidate: r, reused: true, problems, ...(problems.length ? {} : readArchivedText(r)) });
    }
    continue;
  }
  sourceReceiptIds.set(src.key, [src.id]);
  const arc = manifest.get(src.id);
  // Fetched but unreadable (a scan with no text layer) and so not kept: its rows are refused as unread.
  if (arc?.status === 'not_archived' && arc.reason === 'pdf_has_no_text_layer') {
    receiptState.set(src.id, { candidate: null, reused: false, problems: [], text: null, unread: arc.reason });
    continue;
  }
  const problems = [];
  let candidate = null;
  if (!arc) problems.push('not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      receipt_id: src.id,
      label: src.label,
      source_type: src.source_type,
      evidence_class: src.ec,
      publisher: src.publisher,
      ...(src.published ? { source_published_at: src.published } : {}),
      path: arc.path,
      source_url: src.url,
      retrieved_at: arc.retrieved_at,
      content_sha256: arc.content_sha256,
      content_type: arc.content_type,
      content_bytes: arc.content_bytes,
      ...(arc.text_extract ? { text_extract: arc.text_extract } : {}),
      notes: `Archived ${arc.retrieved_at} by ${TOOL} --fetch for the one-pass entry of the lens hunt's official records.${arc.archive.wayback_ref ? ' The stored copy is a Wayback snapshot body because the source refuses automated fetches.' : ''}`,
      limits: src.limits,
      archive: arc.archive,
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    if (ledgerReceiptById.has(src.id)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  receiptState.set(src.id, { candidate: problems.length ? null : candidate, reused: false, problems, ...(problems.length || !candidate ? {} : readArchivedText(candidate)) });
}
const okReceipt = id => receiptState.get(id) && !receiptState.get(id).problems.length;

// ---------------------------------------------------------------- accounting and staging
const gaps = [];
const counts = {
  pages_read: pages.length, surfaces_read: 0, surfaces_entered: 0, surfaces_refused: 0, participants_read: 0, participants_admitted: 0, participants_refused: 0,
  roster_rows_read: 0, roster_rows_entered: 0, roster_rows_refused: 0, roster_rows_already_on_surface: 0,
};
const gap = (table, rowKey, reason, detail = {}) => gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
const surfaces = [];
const participation = [];
const cited = new Map();
const evidenceOf = ids => (ids.some(id => receiptState.get(id).candidate.evidence_class === 'official') ? 'official' : receiptState.get(ids[0]).candidate.evidence_class);

function admitParticipant(table, rowKey, p, ids) {
  const readable = ids.filter(id => receiptState.get(id).text != null);
  if (!readable.length) {
    gap(table, rowKey, 'archived_copy_unread', { receipts: ids, unread: ids.map(id => receiptState.get(id).unread), shown_as: p.shown });
    return null;
  }
  const showing = readable.filter(id => showsWords(receiptState.get(id).text, p.shown));
  if (!showing.length) {
    gap(table, rowKey, 'shown_words_not_on_archived_page', { receipts: readable, shown_as: p.shown });
    return null;
  }
  return showing;
}

// ---------------------------------------------------------------- new surfaces
for (const page of pages) {
  const ids = uniq(splitUrls(page.source_url).flatMap(u => sourceReceiptIds.get(urlKey(u)) ?? []));
  for (const s of page.surfaces) {
    counts.surfaces_read += 1;
    counts.participants_read += s.participants.length;
    const wouldBe = { surface: { surface_id: s.surface_id, surface_label: s.label, status: s.status, time_start: s.date }, participation: s.participants.map(p => ({ kind: p.kind, ledger_id: p.ledger_id, label: p.label, role: p.role, participation_type: p.participation_type, shown: p.shown })) };
    if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type}`);
    if (ledgerSurfaceById.has(s.surface_id)) {
      counts.surfaces_refused += 1;
      gap('surfaces', s.surface_id, 'surface_id_already_in_ledger', { candidate: wouldBe });
      continue;
    }
    const okIds = ids.filter(okReceipt);
    if (!okIds.length) {
      counts.surfaces_refused += 1;
      gap('surfaces', s.surface_id, ids.some(id => receiptState.get(id)?.problems.some(x => x.startsWith('archive_attempt_failed') || x === 'not_attempted')) ? 'receipt_archive_unresolved' : 'receipt_not_admissible',
        { receipt_failures: ids.map(id => ({ receipt_id: id, problems: receiptState.get(id)?.problems ?? ['unknown_receipt'] })), source_url: page.source_url, candidate: wouldBe });
      continue;
    }
    const rows = [];
    const seen = new Set();
    for (const p of s.participants) {
      const rowKey = `${s.surface_id}:${p.label}`;
      const showing = admitParticipant('participation', rowKey, p, okIds);
      if (!showing) { counts.participants_refused += 1; continue; }
      let pid;
      if (p.kind === 'actor') {
        if (p.ledger_id && !canonActorById.has(p.ledger_id)) throw new Error(`${rowKey}: ledger actor ${p.ledger_id} is not in data/canonical/actors.json`);
        pid = p.ledger_id ?? ensureActor(p.label);
      } else if (p.kind === 'organization') {
        if (p.ledger_id && !canonOrgById.has(p.ledger_id)) throw new Error(`${rowKey}: ledger organisation ${p.ledger_id} is not in data/canonical/organizations.json`);
        pid = p.ledger_id ?? ensureOrg(p.label);
      } else throw new Error(`${rowKey}: unknown participant kind ${p.kind}`);
      const key = `${p.kind}|${pid}`;
      if (seen.has(key)) { gap('participation', rowKey, 'same_participant_twice_on_surface', { participant_id: pid }); counts.participants_refused += 1; continue; }
      seen.add(key);
      rows.push({
        surface_id: s.surface_id,
        participant_type: p.kind,
        ...(p.kind === 'actor' ? { actor_id: pid } : { organization_id: pid }),
        role: p.role,
        participation_type: p.participation_type,
        time_start: s.date,
        time_end: s.date_end ?? s.date,
        evidence_class: s.evidence_class,
        receipt_ids: showing,
        ...(fold(p.shown) !== fold(p.label) ? { notes: `Shown on the archived page as "${p.shown}".` } : {}),
      });
      counts.participants_admitted += 1;
    }
    if (!rows.length) {
      counts.surfaces_refused += 1;
      gap('surfaces', s.surface_id, 'no_participant_admitted', { receipts: okIds, candidate: wouldBe });
      continue;
    }
    // One copy per event: a drafted surface whose admitted people all already sit together on a ledger
    // surface with the same dates (the same programme session or announcement under another id) is a
    // second copy of an event the ledger holds, not a new record; it would heat that event twice.
    const admittedActors = uniq(rows.filter(r => r.actor_id).map(r => r.actor_id));
    const sameEvent = admittedActors.length ? ledgerSurfaces.filter(o => o.intake_source !== 'sec-form-d' && o.time_start === s.date && (o.time_end ?? o.time_start) === (s.date_end ?? s.date)
      && admittedActors.every(a => (actorsBySurface.get(o.surface_id) ?? new Set()).has(a))).map(o => o.surface_id).sort() : [];
    if (sameEvent.length) {
      counts.surfaces_refused += 1;
      gap('surfaces', s.surface_id, 'event_already_in_ledger', { existing_surface_ids: sameEvent, receipts: okIds, candidate: wouldBe });
      continue;
    }
    const used = uniq(rows.flatMap(r => r.receipt_ids));
    for (const id of used) cited.set(id, receiptState.get(id));
    surfaces.push({
      surface_id: s.surface_id,
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
      receipt_ids: used,
      notes: `${s.notes.trim()} ${DRAFTED_SENTENCE}`,
      date_basis: s.date_basis,
      limits: s.limits,
      ...(s.addendum_to ? { addendum_to: s.addendum_to } : {}),
      intake_source: LANE,
      intake_group_id: page.group_id,
      roster_entry_count: rows.length,
    });
    participation.push(...rows);
    counts.surfaces_entered += 1;
  }
}

// ---------------------------------------------------------------- roster rows on existing surfaces
function sectionOf(receiptId, shown) {
  const st = receiptState.get(receiptId);
  if (st.candidate.text_extract || /\.pdf$/i.test(st.candidate.path)) return null;
  const html = fs.readFileSync(path.join(root, st.candidate.path), 'utf8').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const parts = html.split(/(?=<h2[\s>])/i);
  for (const part of parts) {
    const heading = /^<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(part);
    if (!heading) continue;
    if (showsWords(plain(part.slice(heading[0].length)), shown)) return decodeEntities(stripMarkup(heading[1])).replace(/\s+/g, ' ').trim();
  }
  return null;
}
const stagedSurfaceById = new Map(surfaces.map(s => [s.surface_id, s]));
for (const block of intake.roster) {
  if (!ledgerSurfaceById.has(block.existing_surface_id)) throw new Error(`roster surface ${block.existing_surface_id} is not in the ledger`);
  // enter_on: the rows go on a surface this lane staged from the same page, not on the curated one.
  const sid = block.enter_on ?? block.existing_surface_id;
  const shape = ROSTER[sid];
  if (!shape) throw new Error(`no roster shape for ${sid}`);
  const existing = block.enter_on ? stagedSurfaceById.get(sid) : ledgerSurfaceById.get(sid);
  if (!existing) {
    for (const r of block.rows) {
      counts.roster_rows_read += 1;
      counts.roster_rows_refused += 1;
      gap('roster', `${sid}:${r.label}`, 'target_surface_not_admitted', { candidate: { surface_id: sid, participant_type: 'organization', ledger_id: r.ledger_id, label: r.label, shown: r.shown } });
    }
    continue;
  }
  if (existing.hop_eligible !== false) throw new Error(`roster surface ${sid} is hop-eligible; organisation rows could change its treatment`);
  const onSurface = new Set([...ledgerParts, ...participation].filter(p => p.surface_id === sid && p.participant_type === 'organization').map(p => p.organization_id));
  const ids = uniq(block.source_urls.flatMap(u => sourceReceiptIds.get(urlKey(u)) ?? []));
  const okIds = ids.filter(okReceipt);
  for (const r of block.rows) {
    counts.roster_rows_read += 1;
    const rowKey = `${sid}:${r.label}`;
    const wouldBe = { surface_id: sid, participant_type: 'organization', ledger_id: r.ledger_id, label: r.label, shown: r.shown };
    if (r.kind !== 'organization') throw new Error(`${rowKey}: roster rows are organisation rows`);
    if (shape.refuse) { counts.roster_rows_refused += 1; gap('roster', rowKey, shape.refuse, { detail: shape.refuse_detail, candidate: wouldBe }); continue; }
    if (!okIds.length) { counts.roster_rows_refused += 1; gap('roster', rowKey, 'receipt_not_admissible', { receipt_failures: ids.map(id => ({ receipt_id: id, problems: receiptState.get(id)?.problems ?? ['unknown_receipt'] })), candidate: wouldBe }); continue; }
    const showing = admitParticipant('roster', rowKey, r, okIds);
    if (!showing) { counts.roster_rows_refused += 1; continue; }
    if (r.ledger_id && !canonOrgById.has(r.ledger_id)) throw new Error(`${rowKey}: ledger organisation ${r.ledger_id} is not in data/canonical/organizations.json`);
    const oid = r.ledger_id ?? ensureOrg(r.label);
    if (onSurface.has(oid)) { counts.roster_rows_already_on_surface += 1; gap('roster', rowKey, 'organisation_already_on_surface', { organization_id: oid }); continue; }
    onSurface.add(oid);
    for (const id of showing) cited.set(id, receiptState.get(id));
    participation.push({
      surface_id: sid,
      participant_type: 'organization',
      organization_id: oid,
      role: shape.role,
      participation_type: shape.participation_type,
      time_start: existing.time_start,
      time_end: existing.time_end ?? existing.time_start,
      evidence_class: evidenceOf(showing),
      receipt_ids: showing,
      notes: `${shape.note(r.shown, sectionOf(showing[0], r.shown))} ${DRAFTED_SENTENCE}`,
    });
    counts.roster_rows_entered += 1;
  }
}

// =============================================================== write
surfaces.sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id));
const order = new Map([...intake.roster.map((b, i) => [b.existing_surface_id, surfaces.length + i]), ...surfaces.map((s, i) => [s.surface_id, i])]);
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const usedReceiptIds = new Set(participation.flatMap(p => p.receipt_ids));
const receipts = [...cited.entries()].filter(([id, st]) => usedReceiptIds.has(id) && !st.reused).map(([, st]) => st.candidate).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const reusedReceipts = [...cited.entries()].filter(([id, st]) => usedReceiptIds.has(id) && st.reused).map(([id]) => id).sort();
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const usedActorIds = new Set(participation.map(p => p.actor_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
const actorsOut = [...newActors.values()].filter(a => usedActorIds.has(a.id)).sort((a, b) => a.id.localeCompare(b.id));
const { errors: contractErrors } = checkReceiptContract(receipts, { root });
if (contractErrors.length) throw new Error(`staged receipts fail the receipt contract: ${contractErrors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);
if (surfaces.some(s => s.hop_eligible !== false)) throw new Error('every surface of this lane must be hop_eligible false');
for (const src of sources.values()) {
  for (const id of sourceReceiptIds.get(src.key)) {
    if (!usedReceiptIds.has(id) && !gaps.some(g => g.receipts?.includes(id) || g.receipt_failures?.some(f => f.receipt_id === id))) {
      const st = receiptState.get(id);
      gap('receipts', id, st?.problems.length ? 'receipt_not_admissible' : 'receipt_archived_not_cited', { ...(st?.problems.length ? { problems: st.problems } : {}), source_url: src.url });
    }
  }
}

writeJsonl(`${OUT}/surfaces.jsonl`, surfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: actorsOut });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const reasons = {};
for (const g of gaps) reasons[`${g.table}:${g.reason}`] = (reasons[`${g.table}:${g.reason}`] ?? 0) + 1;
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: TOOL,
  intake: INTAKE,
  decision: { date: ENTERED, decided_by: 'owner', words: 'Yes, one pass' },
  sources: {
    manifest: MANIFEST, store: STORE, pages: sources.size,
    archived: [...manifest.values()].filter(r => r.status === 'archived').length,
    reused_ledger_receipts: reusedReceipts,
    failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
    not_archived: [...manifest.values()].filter(r => r.status === 'not_archived').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
  },
  admission_rule: 'A participant is admitted only when the archived copy of a cited receipt shows its shown words (text compared with markup stripped, entities decoded, whitespace collapsed and curly quotes folded, ignoring letter case, as whole words); a surface only when its receipt satisfies the live receipt contract, at least one participant is admitted and it is not a second copy of an event the ledger already holds (every admitted person already on one ledger surface with the same dates). Roster rows are organisation rows appended to existing surfaces and are refused when they would change how the surface is treated. Every surface is hop_eligible false pending a reader. Everything refused goes to gaps.jsonl.',
  counts,
  gap_reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length, reused_receipts: reusedReceipts.length,
    new_actors: actorsOut.length, new_organizations: orgsOut.length, gaps: gaps.length, hop_eligible_surfaces: 0,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-lens-hunt-official: ${surfaces.length} surfaces (0 hop-eligible), ${participation.length} participation rows (${counts.roster_rows_entered} on existing surfaces), ${receipts.length} new receipts + ${reusedReceipts.length} reused, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${gaps.length} gaps.`);
