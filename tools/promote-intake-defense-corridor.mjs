#!/usr/bin/env node
// Promote the US defense-capital corridor intake trees into a ledger staging lane.
//
// Reads (never writes) three intake trees:
//   A  data/intake/person-centered-defense-routers/
//   B  data/intake/austin-israel-defense-corridor/
//   C  data/intake/natsec100-pathways/chunk1/
// and writes data/ledger/staging/defense-corridor/{surfaces,participation,receipts}.jsonl,
// {actors,organizations}.json, gaps.jsonl and summary.json. tools/merge-staging.mjs appends the
// lane into data/ledger and the canonical registries.
//
// Admission rule (the project's own): a row enters the ledger only when it cites at least one
// receipt that (1) resolves to a public source URL, (2) is not marked unavailable/unresolved, and
// (3) satisfies the live receipt contract enforced by test/receipt-contract.test.js (an archive
// reference that resolves: an in-repo extract under receipts/ whose SHA-256 matches, or a Wayback
// snapshot of the source URL; plus a non-empty `limits` statement). Citations to receipts that fail
// are dropped from the row; a row left with no admissible citation goes to gaps.jsonl with the
// reason and the would-be ledger rows, so a rerun after archiving promotes it unchanged.
// Undated historical rows are refused; present-tense observations (a cap table, a portfolio page,
// an advisory listing) are dated by the receipt's retrieval date and say so.
//
// Deterministic: no clock, no network. Run: node tools/promote-intake-defense-corridor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { checkReceiptContract } from './lib/receipt-contract.mjs';

const A = 'data/intake/person-centered-defense-routers';
const B = 'data/intake/austin-israel-defense-corridor';
const C = 'data/intake/natsec100-pathways/chunk1';
const OUT = 'data/ledger/staging/defense-corridor';
const LANE = 'defense-corridor';

const kebab = s => slug(String(s ?? '').replace(/_/g, '-'));
const uniq = xs => [...new Set(xs)];
const EC_RANK = { official: 1, primary_public: 2, reported: 3 };
const strongest = classes => classes.filter(Boolean).sort((a, b) => (EC_RANK[a] ?? 9) - (EC_RANK[b] ?? 9))[0] ?? 'reported';

// ---------------------------------------------------------------- canonical state
// Rows this lane already merged (source/intake_source) are not "existing state": a rerun after a
// merge restages them identically and merge-staging skips them as already present.
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const densityMax = readJson('data/canonical/surface-types.json').density_policy.max_hop_actor_count;
const ledgerSurfaceIds = new Set(readJsonl('data/ledger/surfaces.jsonl').filter(s => ![A, B, C].includes(s.intake_source)).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(r => [r.receipt_id, JSON.stringify(r)]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const canonOrgByLabel = new Map(canonOrgs.map(o => [norm(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorByLabel = new Map(canonActors.map(a => [norm(a.label), a]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
// Canonical aliases (e.g. "Anduril" -> anduril-industries) resolve before any new id is minted.
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));
const actorAlias = new Map(canonAliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

// ---------------------------------------------------------------- receipts
// Evidence-class vocabulary of the ledger: official | primary_public | reported.
function mapEvidence(ec) {
  switch (ec) {
    case 'official': case 'official_record': return 'official';
    case 'primary_public': case 'observed': case 'company_reported': case 'investor_reported': return 'primary_public';
    default: return 'reported'; // reported, credible_reported, self_claimed, counterpart_reported, ...
  }
}

const intakeReceipts = new Map(); // intake receipt id -> { candidate, problems }
function registerReceipt(intakeId, candidate, upstreamProblems) {
  if (intakeReceipts.has(intakeId)) {
    const prev = intakeReceipts.get(intakeId);
    if (prev.candidate.source_url || !candidate.source_url) return; // keep the first resolvable copy
  }
  const problems = [...upstreamProblems];
  if (!candidate.source_url) problems.push('no_source_url');
  if (problems.length === 0) {
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
  }
  // An id already in the ledger is fine when it is this same receipt (a rerun after merge); a different row is a collision.
  if (ledgerReceipts.has(candidate.receipt_id) && ledgerReceipts.get(candidate.receipt_id) !== JSON.stringify(candidate)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  intakeReceipts.set(intakeId, { candidate, problems });
}

for (const r of readJsonl(`${C}/receipts.jsonl`)) {
  const id = `natsec100-pathways-${r.receipt_id.toLowerCase()}`;
  registerReceipt(r.receipt_id, {
    receipt_id: id,
    label: r.title,
    source_type: r.source_type,
    evidence_class: mapEvidence(r.evidence_class),
    path: r.path ?? r.url,
    source_url: r.url,
    retrieved_at: r.accessed_date,
    notes: [r.notes, r.quoted_or_line_reference ? `Locator: ${r.quoted_or_line_reference}` : null].filter(Boolean).join(' '),
    ...(r.limitations ? { limits: r.limitations } : {}),
    archive: r.archive,
    intake_source: C,
    intake_receipt_id: r.receipt_id,
  }, []);
}
// Archive records written by tools/archive-intake-receipts.mjs (one per intake receipt, per lane).
// An archived record supplies the in-repo copy or Wayback snapshot, the capture date and `limits`;
// a failed record carries the reason the receipt stays refused.
const archived = new Map();
for (const [lane, dir] of [['A', A], ['B', B]]) {
  for (const a of readJsonl(`${OUT}/archived-receipts-${lane}.jsonl`, { optional: true })) archived.set(`${dir}|${a.intake_receipt_id}`, a);
}
for (const dir of [A, B]) {
  for (const r of readJsonl(`${dir}/receipts.jsonl`)) {
    const upstream = [];
    const arc = archived.get(`${dir}|${r.receipt_id}`);
    const isArchived = arc?.status === 'archived' && arc.source_url === r.locator_url;
    if (r.status && /unresolved|unavailable/.test(r.status)) upstream.push(`intake_status_${r.status}`);
    if (r.unavailable_after_search) upstream.push('intake_unavailable_after_search');
    // A byte capture made by the archive tool closes the intake's missing-capture flag.
    if (r.hash_status && /unresolved/.test(r.hash_status) && !isArchived) upstream.push(`intake_hash_status_${r.hash_status}`);
    if (arc?.status === 'failed' && r.locator_url) upstream.push(`archive_attempt_failed: ${arc.reason}`);
    if (isArchived) {
      registerReceipt(r.receipt_id, {
        receipt_id: kebab(r.receipt_id),
        label: r.note ? r.note.slice(0, 160) : r.receipt_id,
        source_type: 'intake_source_locator',
        evidence_class: mapEvidence(r.evidence_class),
        path: arc.path,
        source_url: r.locator_url,
        retrieved_at: arc.retrieved_at,
        ...(arc.content_sha256 ? { content_sha256: arc.content_sha256, content_type: arc.content_type, content_bytes: arc.content_bytes } : {}),
        intake_retrieved_at: r.retrieved_at ?? null,
        ...(r.content_sha256 ? { intake_content_sha256: r.content_sha256 } : {}),
        notes: `${r.note ?? ''} Archived ${arc.retrieved_at} by tools/archive-intake-receipts.mjs; the intake observation was made ${r.retrieved_at ?? 'on an unrecorded date'}, and dated rows use the archive date because that is what the custody copy shows.`.trim(),
        limits: r.limits ?? arc.limits,
        archive: arc.archive,
        intake_source: dir,
        intake_receipt_id: r.receipt_id,
      }, upstream);
      continue;
    }
    registerReceipt(r.receipt_id, {
      receipt_id: kebab(r.receipt_id),
      label: r.note ? r.note.slice(0, 160) : r.receipt_id,
      source_type: 'intake_source_locator',
      evidence_class: mapEvidence(r.evidence_class),
      path: r.locator_url || undefined,
      source_url: r.locator_url || undefined,
      retrieved_at: r.retrieved_at,
      ...(r.content_sha256 ? { content_sha256: r.content_sha256 } : {}),
      notes: r.note ?? '',
      ...(r.limits ? { limits: r.limits } : {}),
      ...(r.archive ? { archive: r.archive } : {}),
      intake_source: dir,
      intake_receipt_id: r.receipt_id,
    }, upstream);
  }
}

const citedReceipts = new Map(); // ledger receipt id -> candidate (only receipts a promoted row cites)
function resolveReceipts(ids) {
  const ok = [];
  const failures = [];
  for (const id of ids ?? []) {
    const rec = intakeReceipts.get(id);
    if (!rec) failures.push({ receipt_id: id, problems: ['not_in_intake_receipts'] });
    else if (rec.problems.length) failures.push({ receipt_id: id, problems: rec.problems });
    else ok.push(rec.candidate);
  }
  return { ok, failures };
}
function refusalReason(failures) {
  if (!failures.length) return 'no_receipt_cited';
  const all = failures.flatMap(f => f.problems);
  if (all.some(p => p.startsWith('receipt_contract_archive') || p.startsWith('archive_attempt_failed'))) return 'receipt_archive_unresolved';
  if (all.some(p => p.startsWith('receipt_contract_limits'))) return 'receipt_limits_missing';
  if (all.some(p => p.startsWith('intake_status') || p === 'no_source_url')) return 'receipt_unresolved_no_source_url';
  if (all.some(p => p.startsWith('intake_hash_status'))) return 'receipt_unresolved_no_byte_capture';
  if (all.some(p => p === 'not_in_intake_receipts')) return 'receipt_not_in_intake_receipts';
  return 'receipt_not_admissible';
}

// ---------------------------------------------------------------- accounting
const summary = {};
const gaps = [];
function tally(source, table) {
  const key = `${source}:${table}`;
  summary[key] ??= { read: 0, promoted_rows: 0, folded: 0, refused: 0, refusal_reasons: {} };
  return summary[key];
}
function refuse(source, table, rowKey, reason, detail = {}) {
  const t = tally(source, table);
  t.refused += 1;
  t.refusal_reasons[reason] = (t.refusal_reasons[reason] ?? 0) + 1;
  gaps.push({ lane: LANE, source, table, row_key: rowKey, reason, ...detail });
}

// ---------------------------------------------------------------- staged entities
const surfaces = new Map();
const participation = [];
const partKeys = new Set();
const newOrgs = new Map();
const newActors = new Map();

// An id names one entity. A label that resolves to a person (canonical or
// newly staged) is never minted as an organization: on 2026-10-23 a portfolio
// listing turned the person joshua-baer into a company of the same id.
function actorIdFor(label, extra = {}) {
  const hit = canonActorByLabel.get(norm(label));
  if (hit) return hit.id;
  if (actorAlias.has(norm(label))) return actorAlias.get(norm(label));
  const id = extra.id ?? kebab(label);
  return canonActorById.has(id) || newActors.has(id) ? id : null;
}
function ensureOrg(label, kind, extra = {}) {
  const hit = canonOrgByLabel.get(norm(label));
  if (hit) return hit.id;
  if (orgAlias.has(norm(label))) return orgAlias.get(norm(label));
  const id = extra.id ?? kebab(label);
  if (canonOrgById.has(id)) return id;
  if (canonActorById.has(id) || newActors.has(id)) {
    throw new Error(`refusing to mint organization ${id}: the id already names an actor; route the row to the actor`);
  }
  if (!newOrgs.has(id)) newOrgs.set(id, { id, label, kind, source: LANE, ...(extra.fields ?? {}) });
  return id;
}
// A listed name on a roster page: an organization that already exists keeps the
// row; otherwise a name that is a person goes to the actor; otherwise mint.
function listedParticipant(label, kind, actorRole, orgRole) {
  const existingOrg = canonOrgByLabel.has(norm(label)) || orgAlias.has(norm(label)) || canonOrgById.has(kebab(label)) || newOrgs.has(kebab(label));
  const actorId = existingOrg ? null : actorIdFor(label);
  return actorId
    ? { participant_type: 'actor', actor_id: actorId, role: actorRole }
    : { participant_type: 'organization', organization_id: ensureOrg(label, kind), role: orgRole };
}
function ensureActor(label, extra = {}) {
  const hit = canonActorByLabel.get(norm(label));
  if (hit) return hit.id;
  if (actorAlias.has(norm(label))) return actorAlias.get(norm(label));
  const id = extra.id ?? kebab(label);
  if (canonActorById.has(id)) return id;
  if (!newActors.has(id)) newActors.set(id, { id, label, kind: 'person', source: LANE, ...(extra.fields ?? {}) });
  return id;
}

function stageSurface(s) {
  if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type}`);
  if (ledgerSurfaceIds.has(s.surface_id)) throw new Error(`surface id collides with ledger: ${s.surface_id}`);
  if (!surfaces.has(s.surface_id)) surfaces.set(s.surface_id, { ...s, receipt_ids: [...s.receipt_ids] });
  else {
    const cur = surfaces.get(s.surface_id);
    cur.receipt_ids = uniq([...cur.receipt_ids, ...s.receipt_ids]);
  }
  return surfaces.get(s.surface_id);
}
function stagePart(p) {
  const pid = p.actor_id ?? p.organization_id;
  const key = `${p.surface_id}|${pid}|${p.participation_type}`;
  if (partKeys.has(key)) return false;
  partKeys.add(key);
  participation.push(p);
  const s = surfaces.get(p.surface_id);
  s.receipt_ids = uniq([...s.receipt_ids, ...p.receipt_ids]);
  return true;
}
function cite(cands) {
  for (const c of cands) citedReceipts.set(c.receipt_id, c);
  return cands.map(c => c.receipt_id);
}

// A pending row: fully mapped, admitted only if its receipts resolve.
function admit({ source, table, rowKey, receiptIds, build }) {
  tally(source, table).read += 1;
  const { ok, failures } = resolveReceipts(receiptIds);
  if (!ok.length) {
    let candidate = null;
    try { candidate = build({ ids: (receiptIds ?? []).map(kebab), ec: 'reported', dryRun: true }); } catch { candidate = null; }
    refuse(source, table, rowKey, refusalReason(failures), { receipt_failures: failures, candidate });
    return false;
  }
  const out = build({ ids: cite(ok), ec: strongest(ok.map(r => r.evidence_class)), dryRun: false, dropped: failures });
  if (out && out.refuse) {
    refuse(source, table, rowKey, out.refuse, { candidate: out.candidate ?? null });
    return false;
  }
  tally(source, table).promoted_rows += 1;
  return true;
}
function fold(source, table, n = 1) {
  const t = tally(source, table);
  t.read += n;
  t.folded += n;
}

// Builder helper: dry runs return the would-be rows instead of staging them.
function emit(dryRun, surface, parts) {
  if (dryRun) return { surface, participation: parts };
  stageSurface(surface);
  for (const p of parts) stagePart(p);
  return null;
}


// A listing row is admitted only when the archived copy actually shows the listed name: the custody
// copy, not the intake note, is what a reader can check. Wayback-only receipts cannot be read offline
// and are taken as the contract allows.
const copyText = new Map();
function archivedCopyText(receipt) {
  if (receipt?.archive?.method !== 'in_repo_content_hash' || !/\.(html?|json|txt|md|xml)$/i.test(receipt.path ?? '')) return null;
  if (!copyText.has(receipt.path)) {
    const raw = fs.readFileSync(path.join(root, receipt.path), 'utf8')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:amp|#0*38);/gi, '&').replace(/&(?:#0*39|apos|rsquo|#8217);/gi, "'").replace(/&nbsp;/gi, ' ');
    copyText.set(receipt.path, norm(raw));
  }
  return copyText.get(receipt.path);
}
function nameShownInArchive(ids, name) {
  const texts = ids.map(id => citedReceipts.get(id)).map(archivedCopyText);
  if (texts.every(t => t === null)) return true;
  return texts.some(t => t !== null && t.includes(norm(name)));
}

function awardRecord(ids) {
  for (const id of ids) {
    const r = citedReceipts.get(id);
    if (r?.archive?.method === 'in_repo_content_hash' && /\/r-usaspending-[^/]+\.json$/.test(r.path ?? '')) {
      return JSON.parse(fs.readFileSync(path.join(root, r.path), 'utf8'));
    }
  }
  return null;
}
function retrievedAt(ids) {
  for (const id of ids ?? []) {
    const r = intakeReceipts.get(id);
    if (r?.candidate.retrieved_at) return r.candidate.retrieved_at;
  }
  return null;
}
const usd = n => (n == null ? null : `$${Number(n).toLocaleString('en-US')}`);

// =============================================================== C: NatSec100 pathways (chunk 1)
const cCompanies = new Map(readJsonl(`${C}/companies.jsonl`).map(c => [c.company_id, c]));
const cSurfaces = new Map(readJsonl(`${C}/surfaces.jsonl`).map(s => [s.surface_id, s]));
const companyOrg = cid => {
  const c = cCompanies.get(cid);
  if (!c) throw new Error(`unknown NatSec100 company ${cid}`);
  return ensureOrg(c.canonical_name, 'company', { id: kebab(cid), fields: { source_company_id: cid } });
};
const SVDG = ensureOrg('Silicon Valley Defense Group', 'nonprofit', { fields: { aliases: ['SVDG'] } });

const YEAR = {
  2023: { sid: 'S_NS23', date: '2023-07-04', dateNote: 'Published 4 July 2023 (data through April 2023).' },
  2024: { sid: 'S_NS24', date: '2024-07-01', dateNote: 'Month-only publication date (July 2024); recorded as 2024-07-01, day not established.' },
  2025: { sid: 'S_NS25', date: '2025-07-01', dateNote: 'Month-only publication date (July 2025); recorded as 2025-07-01, day not established. Partial roster: the official table is image-rendered and only 42 of 100 entries were recovered from receipted secondary tables.' },
  2026: { sid: 'S_NS26', date: '2026-05-26', dateNote: 'Published 26 May 2026. First edition with an eligibility gate of at least one U.S. government contract by 31 December 2025 and Pryzm contracting data as a ranking input.' },
};
const yearSurfaceId = y => `natsec100-${y}-list`;
function yearSurface(year, ids, ec) {
  const meta = YEAR[year];
  const src = cSurfaces.get(meta.sid);
  return {
    surface_id: yearSurfaceId(year),
    surface_label: `NatSec100 ${year} list`,
    surface_type: 'directory_roster_surface',
    secondary_surface_types: ['category_formation_surface', 'defence_industrial_surface'],
    hop_eligible: false,
    hop_refusal_reason: 'organization_only_ranked_list',
    scorable: true,
    status: year === 2025 ? 'published_ranked_list_partial_roster' : 'published_ranked_list',
    bounded_by: [`Silicon Valley Defense Group NatSec100 ${year} edition`, 'published rank table as receipted'],
    time_start: meta.date,
    time_end: meta.date,
    evidence_class: ec,
    receipt_ids: ids,
    intake_source: C,
    intake_surface_id: meta.sid,
    notes: `${src?.description ?? ''} ${meta.dateNote} A ranked list is a published validation fact about companies only: it names no people, creates no actor hop, and does not establish procurement, endorsement, investment, coordination, or influence.`.trim(),
  };
}
// The SVDG operator row on each year list rides on the surface's own receipts.
for (const year of [2023, 2024, 2025, 2026]) {
  const src = cSurfaces.get(YEAR[year].sid);
  admit({
    source: 'C', table: 'surfaces', rowKey: YEAR[year].sid, receiptIds: src.receipt_ids,
    build: ({ ids, ec, dryRun }) => emit(dryRun, yearSurface(year, ids, ec), [{
      surface_id: yearSurfaceId(year), participant_type: 'organization', organization_id: SVDG,
      role: `Publisher and operator of the NatSec100 ${year} ranking`, participation_type: 'list_operator',
      time_start: YEAR[year].date, time_end: YEAR[year].date, evidence_class: ec, receipt_ids: ids,
      notes: 'Operator of the ranking surface; publication only.',
    }]),
  });
}

for (const cy of readJsonl(`${C}/company_years.jsonl`)) {
  const year = cy.year;
  admit({
    source: 'C', table: 'company_years', rowKey: `${cy.company_id}@${year}`, receiptIds: cy.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      const notes = [
        cy.company_name_as_reported !== cCompanies.get(cy.company_id)?.canonical_name ? `Listed as "${cy.company_name_as_reported}".` : null,
        cy.capital_raised_metric_if_reported ? `Capital as reported by the list: ${cy.capital_raised_metric_if_reported}.` : null,
        cy.hq_city ? `HQ as reported: ${cy.hq_city}, ${cy.hq_state_or_country}.` : null,
        cy.rank == null ? 'Rank not recovered for this partial edition; inclusion only.' : null,
        `Confidence: ${cy.confidence}.`,
      ].filter(Boolean).join(' ');
      return emit(dryRun, yearSurface(year, [], 'official'), [{
        surface_id: yearSurfaceId(year), participant_type: 'organization', organization_id: companyOrg(cy.company_id),
        role: cy.rank == null ? 'listed (rank not recovered)' : `ranked ${cy.rank}`,
        participation_type: cy.rank == null ? 'listed_entry' : 'ranked_list_entry',
        time_start: YEAR[year].date, time_end: YEAR[year].date, evidence_class: ec, receipt_ids: ids, notes,
      }]);
    },
  });
}

function parseCounterparty(notes) {
  const m = /transacted with (.+?)(?: \(| per )/.exec(notes ?? '');
  return m ? m[1].trim() : null;
}
function isoFromPartial(d) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return { date: d, note: null };
  if (/^\d{4}-\d{2}$/.test(d)) return { date: `${d}-01`, note: `Month-only date (${d}); recorded as ${d}-01, day not established.` };
  if (/^\d{4}$/.test(d)) return { date: `${d}-01-01`, note: `Year-only date (${d}); recorded as ${d}-01-01.` };
  return null;
}
const byCompanyName = new Map([...cCompanies.values()].map(c => [norm(c.canonical_name), c.company_id]));
const orgForName = name => (byCompanyName.has(norm(name)) ? companyOrg(byCompanyName.get(norm(name))) : ensureOrg(name, 'company'));

for (const ev of readJsonl(`${C}/conversion_events.jsonl`)) {
  const key = ev.event_id;
  if (/^S_NS2\d$/.test(ev.target_surface) && ['public_natsec_validation', 'procurement_gate'].includes(ev.conversion_function)) {
    fold('C', 'conversion_events'); // inclusion events mirror company_years one-for-one
    continue;
  }
  const company = cCompanies.get(ev.company_id);
  if (ev.conversion_function === 'acquisition_exit' || ev.conversion_function === 'ipo_exit') {
    const d = isoFromPartial(ev.date);
    if (!d) { tally('C', 'conversion_events').read += 1; refuse('C', 'conversion_events', key, 'undated'); continue; }
    const counterparty = ev.conversion_function === 'acquisition_exit' ? parseCounterparty(ev.notes) : null;
    const kindLabel = ev.conversion_function === 'ipo_exit'
      ? (/filed/i.test(ev.notes) ? 'IPO filing' : 'IPO')
      : (counterparty ? `transaction with ${counterparty}` : 'acquisition');
    const sid = `natsec100-exit-${kebab(ev.company_id)}-${counterparty ? `${kebab(counterparty)}-` : ''}${d.date}`;
    admit({
      source: 'C', table: 'conversion_events', rowKey: key, receiptIds: ev.receipt_ids,
      build: ({ ids, ec, dryRun }) => {
        const parts = [{
          surface_id: sid, participant_type: 'organization', organization_id: companyOrg(ev.company_id),
          role: ev.conversion_function === 'ipo_exit' ? `${kindLabel} subject` : 'acquired or transacting company',
          participation_type: ev.conversion_function === 'ipo_exit' ? 'public_listing_subject' : 'exit_subject',
          time_start: d.date, time_end: d.date, evidence_class: ec, receipt_ids: ids, notes: ev.notes,
        }];
        if (counterparty) {
          const cp = counterparty.split(' (')[0];
          parts.push({
            surface_id: sid, participant_type: 'organization', organization_id: orgForName(cp),
            role: 'acquirer or transaction counterparty as named in the 2026 NatSec100 exits table',
            participation_type: 'exit_counterparty', time_start: d.date, time_end: d.date,
            evidence_class: ec, receipt_ids: ids,
          });
        }
        return emit(dryRun, {
          surface_id: sid,
          surface_label: `${company.canonical_name} ${kindLabel}, ${d.date} (per 2026 NatSec100 report)`,
          surface_type: 'employment_investment_surface',
          secondary_surface_types: ['defence_industrial_surface'],
          hop_eligible: false,
          hop_refusal_reason: 'organization_only_capital_exit',
          scorable: true,
          status: 'reported_capital_exit_event',
          bounded_by: ['2026 NatSec100 report exits and IPO tables'],
          time_start: d.date, time_end: d.date, evidence_class: ec, receipt_ids: ids,
          intake_source: C, intake_event_id: key,
          notes: [ev.notes, d.note, `Competing explanations: ${ev.competing_explanations}`, ev.forbidden_inferences].filter(Boolean).join(' '),
        }, parts);
      },
    });
    continue;
  }
  if (ev.conversion_function === 'methodology_exit') {
    const d = isoFromPartial(ev.date);
    const sid = `natsec100-2026-methodology-exit-${kebab(ev.company_id)}`;
    admit({
      source: 'C', table: 'conversion_events', rowKey: key, receiptIds: ev.receipt_ids,
      build: ({ ids, ec, dryRun }) => emit(dryRun, {
        surface_id: sid,
        surface_label: `${company.canonical_name} removed from the NatSec100 2026 list under the eligibility rule, ${ev.date}`,
        surface_type: 'directory_roster_surface',
        secondary_surface_types: ['category_formation_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_list_methodology_exit', scorable: true,
        status: 'list_methodology_exit', bounded_by: ['2026 NatSec100 report methodology section'],
        time_start: d.date, time_end: d.date, evidence_class: ec, receipt_ids: ids, intake_source: C, intake_event_id: key,
        notes: [ev.notes, d.note, `Competing explanations: ${ev.competing_explanations}`].filter(Boolean).join(' '),
      }, [
        { surface_id: sid, participant_type: 'organization', organization_id: companyOrg(ev.company_id), role: 'company removed from the list', participation_type: 'list_methodology_exit_subject', time_start: d.date, time_end: d.date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: SVDG, role: 'list operator applying the eligibility rule', participation_type: 'list_operator', time_start: d.date, time_end: d.date, evidence_class: ec, receipt_ids: ids },
      ]),
    });
    continue;
  }
  if (ev.conversion_function === 'government_award') {
    const contract = /Contract (FA\d{4}-\d{2}-[A-Z]-\d{4})/.exec(ev.notes)?.[1] ?? null;
    const actionDate = /action date (\d{4}-\d{2}-\d{2})/.exec(ev.notes)?.[1] ?? null;
    const usaTotal = /USAspending: \$[\d,]+ base-and-all-options value and \$([\d,]+) total obligation/.exec(ev.notes)?.[1];
    const annObl = /\$([\d,]+) obligated at award/.exec(ev.notes)?.[1];
    const rounded = /obligation: \$([\d.]+)M/.exec(ev.notes)?.[1];
    const programme = /Air Force, ([^.]+)\./.exec(ev.notes)?.[1] ?? null;
    let amount = null;
    let amountBasis = null;
    if (usaTotal) { amount = Number(usaTotal.replace(/,/g, '')); amountBasis = 'USAspending total obligation (source-native; announcement reports a different obligated-at-award figure, kept in notes)'; }
    else if (rounded) { amount = Math.round(Number(rounded) * 1e6); amountBasis = 'FY2025 Air Force obligation as rounded in trade-press summary of SVDG/Pryzm data; not verified against USAspending'; }
    const time = actionDate ? { start: actionDate, end: actionDate, note: null }
      : (ev.date === 'FY2025' ? { start: '2024-10-01', end: '2025-09-30', note: 'Fiscal-year-only date (FY2025): recorded as the federal fiscal year 2024-10-01 to 2025-09-30; the award action date is not established by the cited receipt.' } : null);
    if (!time) { tally('C', 'conversion_events').read += 1; refuse('C', 'conversion_events', key, 'undated'); continue; }
    const sid = contract ? `us-air-force-award-${kebab(contract)}-${kebab(ev.company_id)}` : `us-air-force-fy2025-award-${kebab(ev.company_id)}`;
    admit({
      source: 'C', table: 'conversion_events', rowKey: key, receiptIds: ev.receipt_ids,
      build: ({ ids, ec, dryRun }) => {
        const AF = ensureOrg('U.S. Air Force', 'military', { id: 'us-air-force' });
        const money = amount != null ? ` ${usd(amount)} (${amountBasis}).` : '';
        return emit(dryRun, {
          surface_id: sid,
          surface_label: `U.S. Air Force award to ${company.canonical_name}${programme ? `, ${programme}` : ''}${contract ? ` (${contract})` : ''}, ${actionDate ?? 'FY2025'}`,
          surface_type: 'procurement_contract_surface',
          secondary_surface_types: ['defence_industrial_surface'],
          hop_eligible: false, hop_refusal_reason: 'organization_only_procurement_instrument', scorable: true,
          status: contract ? 'official_award_record' : 'reported_award_line_item',
          bounded_by: contract ? ['Department of War contract announcement', 'USAspending award record', 'SBIR.gov identity bridge'] : ['Trade-press summary of SVDG/Pryzm FY2025 award data'],
          time_start: time.start, time_end: time.end, evidence_class: ec, receipt_ids: ids, intake_source: C, intake_event_id: key,
          ...(amount != null ? { funding_amount_usd: amount, funding_amount_basis: amountBasis } : {}),
          notes: [`${ev.notes}${money}`, time.note, `Confidence: ${ev.confidence}.`, `Competing explanations: ${ev.competing_explanations}`, 'An obligation is not an outlay, payment, revenue, or a finding of influence.'].filter(Boolean).join(' '),
        }, [
          { surface_id: sid, participant_type: 'organization', organization_id: AF, role: 'buyer (awarding service)', participation_type: 'buyer', time_start: time.start, time_end: time.end, evidence_class: ec, receipt_ids: ids },
          { surface_id: sid, participant_type: 'organization', organization_id: companyOrg(ev.company_id), role: 'supplier (award recipient)', participation_type: 'supplier', time_start: time.start, time_end: time.end, evidence_class: ec, receipt_ids: ids, ...(amount != null ? { funding_amount_usd: amount } : {}), notes: amountBasis ?? undefined },
        ]);
      },
    });
    continue;
  }
  tally('C', 'conversion_events').read += 1;
  refuse('C', 'conversion_events', key, `unmapped_conversion_function_${ev.conversion_function}`);
}
for (const a of readJsonl(`${C}/actors.jsonl`)) {
  tally('C', 'actors').read += 1;
  if (a.actor_id === 'A001') { tally('C', 'actors').promoted_rows += 1; continue; } // SVDG: list operator org above
  refuse('C', 'actors', a.actor_id, 'role_summary_is_analysis_not_a_dated_participation_row', { label: a.name });
}

// =============================================================== A: person-centered defense routers
const aActors = new Map(readJsonl(`${A}/actors.jsonl`).map(a => [a.actor_id, a]));
const aVehicles = new Map(readJsonl(`${A}/vehicles.jsonl`).map(v => [v.vehicle_id, v]));
const personId = pid => {
  const a = aActors.get(pid);
  const label = a?.label ?? pid.replace(/^person:/, '').replace(/-/g, ' ');
  return ensureActor(label, { id: kebab(pid.replace(/^person:/, '')) });
};
const vehicleOrg = vid => {
  const v = aVehicles.get(vid);
  return ensureOrg(v?.label ?? vid.replace(/^vehicle:/, ''), v?.kind === 'venture_fund' ? 'fund' : (v?.kind ?? 'fund'));
};
const obsNote = date => `Observation dated by the receipt's retrieval date (${date}); the underlying event date is not established by the source.`;

for (const g of readJsonl(`${A}/government-awards.jsonl`)) {
  const rowKey = g.award_id ?? g.org;
  if (g.identity_state !== 'resolved' || !g.award_id) {
    tally('A', 'government-awards').read += 1;
    refuse('A', 'government-awards', rowKey, `award_identity_${g.identity_state ?? 'missing'}`);
    continue;
  }
  const date = retrievedAt(g.receipt_ids);
  const sid = `procurement-award-${kebab(g.award_id)}`;
  admit({
    source: 'A', table: 'government-awards', rowKey, receiptIds: g.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      const agency = ensureOrg(g.awarding_agency, 'agency');
      const supplier = ensureOrg(g.org, 'company', { fields: { legal_name: g.recipient_legal_name, uei: g.uei } });
      // Figures come from the archived award record when one is in custody: amounts move as the
      // award is modified, and the ledger must carry what the cited copy shows.
      const rec = awardRecord(ids);
      const fig = rec
        ? { obligated: rec.total_obligation ?? null, ceiling: rec.base_and_all_options ?? null, outlay: rec.total_outlay ?? null }
        : { obligated: g.obligated_usd, ceiling: g.contract_ceiling_usd, outlay: g.outlay_usd };
      const drift = rec && (fig.obligated !== g.obligated_usd || fig.ceiling !== g.contract_ceiling_usd || fig.outlay !== g.outlay_usd)
        ? ` Intake figures (as recorded by the intake: ceiling ${usd(g.contract_ceiling_usd)}; obligated ${usd(g.obligated_usd)}; outlay ${usd(g.outlay_usd) ?? 'not reported'}) differ from the archived record and are superseded by it.`
        : '';
      const money = `ceiling ${usd(fig.ceiling)}; obligated ${usd(fig.obligated)}; outlay ${usd(fig.outlay) ?? 'not reported'}${rec ? ' (archived USAspending award record)' : ''}`;
      return emit(dryRun, {
        surface_id: sid, surface_label: `${g.awarding_agency} award ${g.award_id} to ${g.org}`,
        surface_type: 'procurement_contract_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_procurement_instrument', scorable: true,
        status: 'official_award_record', bounded_by: ['USAspending award record'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: A,
        funding_amount_usd: fig.obligated, contract_ceiling_usd: fig.ceiling, outlay_usd: fig.outlay,
        notes: `${g.program_or_vehicle}. ${money}.${drift} ${g.note} ${obsNote(date)}`,
      }, [
        { surface_id: sid, participant_type: 'organization', organization_id: agency, role: 'buyer (awarding agency)', participation_type: 'buyer', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: supplier, role: `supplier (${g.recipient_type})`, participation_type: 'supplier', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids, funding_amount_usd: fig.obligated, notes: money },
      ]);
    },
  });
}

for (const e of readJsonl(`${A}/co-investor-edges.jsonl`)) {
  const date = retrievedAt(e.receipt_ids);
  const sid = `cap-table-as-reported-${kebab(e.company)}`;
  admit({
    source: 'A', table: 'co-investor-edges', rowKey: e.company, receiptIds: e.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      const co = ensureOrg(e.company, 'company');
      return emit(dryRun, {
        surface_id: sid, surface_label: `${e.company} cap table as reported, ${date}`,
        surface_type: 'employment_investment_surface', secondary_surface_types: ['surface_factory_capital_layer', 'defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_cap_table_observation', scorable: true,
        status: 'reported_cap_table_observation', bounded_by: ['fund portfolio census'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: A,
        notes: `${e.fund_count} funds list ${e.company} in their portfolios. ${e.forbidden_inference} ${obsNote(date)}`,
      }, [
        { surface_id: sid, participant_type: 'organization', organization_id: co, role: 'portfolio company', participation_type: 'company', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        ...e.funds.map(f => ({ surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(f, 'fund'), role: 'investor (portfolio listing)', participation_type: 'investor', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids })),
      ]);
    },
  });
}

for (const r of readJsonl(`${A}/funding-rounds.jsonl`)) {
  const date = retrievedAt(r.receipt_ids);
  const sid = `funding-round-${kebab(r.company)}-${kebab(r.round)}`;
  admit({
    source: 'A', table: 'funding-rounds', rowKey: `${r.company}:${r.round}`, receiptIds: r.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      return emit(dryRun, {
        surface_id: sid, surface_label: `${r.company} ${r.round} as reported`,
        surface_type: 'employment_investment_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_funding_round', scorable: true,
        status: 'reported_funding_round', bounded_by: ['round announcement'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: A,
        round_size_usd: r.round_size_usd, cumulative_usd: r.cumulative_usd, valuation_usd: r.valuation_usd,
        notes: `Round ${usd(r.round_size_usd)}; cumulative ${usd(r.cumulative_usd) ?? 'not reported'}; valuation ${usd(r.valuation_usd) ?? 'not reported'}. ${r.financial_type_note} ${obsNote(date)}`,
      }, [
        { surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(r.company, 'company'), role: 'company raising', participation_type: 'company', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids, funding_amount_usd: r.round_size_usd },
        ...(r.lead ? [{ surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(r.lead, 'fund'), role: 'lead investor', participation_type: 'investor', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids }] : []),
      ]);
    },
  });
}

for (const x of readJsonl(`${A}/exits.jsonl`)) {
  const date = retrievedAt(x.receipt_ids);
  const sid = `exit-as-reported-${kebab(x.company)}`;
  admit({
    source: 'A', table: 'exits', rowKey: x.company, receiptIds: x.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      return emit(dryRun, {
        surface_id: sid, surface_label: `${x.company} ${x.exit_type} as reported (${x.detail})`,
        surface_type: 'employment_investment_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_capital_exit', scorable: true,
        status: 'reported_capital_exit_event', bounded_by: ['self-published portfolio exits list'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: A,
        notes: `${x.note} ${obsNote(date)}`,
      }, [{ surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(x.company, 'company'), role: `${x.exit_type} subject`, participation_type: 'exit_subject', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids }]);
    },
  });
}

for (const e of readJsonl(`${A}/advisory-edges.jsonl`)) {
  const date = retrievedAt(e.receipt_ids);
  const sid = `advisory-${kebab(e.actor_id.replace(/^person:/, ''))}-${kebab(e.company)}`;
  admit({
    source: 'A', table: 'advisory-edges', rowKey: `${e.actor_id}:${e.company}`, receiptIds: e.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      return emit(dryRun, {
        surface_id: sid, surface_label: `${aActors.get(e.actor_id)?.label ?? e.actor_id} as ${e.advisory_role.replace(/_/g, ' ')} to ${e.company}, as represented ${date}`,
        surface_type: 'board_advisory_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'single_actor_advisory_context_only', scorable: true,
        status: `advisory_role_${e.evidence_state}`, bounded_by: ['self-published biography'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: A,
        notes: `Counterpart status: ${e.counterpart_status}. ${obsNote(date)}`,
      }, [
        { surface_id: sid, participant_type: 'actor', actor_id: personId(e.actor_id), role: e.advisory_role.replace(/_/g, ' '), participation_type: 'advisory_role_observation', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(e.company, 'company'), role: 'company advised', participation_type: 'company_advisory_context', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
      ]);
    },
  });
}

for (const r of readJsonl(`${A}/professional-roles.jsonl`)) {
  const rowKey = `${r.actor_id}:${r.org}:${r.sequence}`;
  admit({
    source: 'A', table: 'professional-roles', rowKey, receiptIds: r.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!r.dated || !r.time_start) return { refuse: 'undated_historical_role' };
      const sid = `role-${kebab(r.actor_id.replace(/^person:/, ''))}-${kebab(r.org)}`;
      const gov = /department|agency|army|navy|air force|dod|government|office/i.test(r.org);
      return emit(dryRun, {
        surface_id: sid, surface_label: `${aActors.get(r.actor_id)?.label ?? r.actor_id} — ${r.title}, ${r.org}`,
        surface_type: gov ? 'government_advisory_surface' : 'employment_investment_surface', secondary_surface_types: [],
        hop_eligible: false, hop_refusal_reason: 'single_actor_role_observation', scorable: true, status: `role_${r.evidence_state}`,
        bounded_by: ['self-published biography'], time_start: r.time_start, time_end: r.time_end ?? r.time_start,
        evidence_class: ec, receipt_ids: ids, intake_source: A, notes: '',
      }, [{ surface_id: sid, participant_type: 'actor', actor_id: personId(r.actor_id), role: r.title, participation_type: r.role_type, time_start: r.time_start, time_end: r.time_end ?? r.time_start, evidence_class: ec, receipt_ids: ids }]);
    },
  });
}

for (const v of readJsonl(`${A}/vehicles.jsonl`)) {
  const date = retrievedAt(v.receipt_ids);
  admit({
    source: 'A', table: 'vehicles', rowKey: v.vehicle_id, receiptIds: v.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!v.controller) return { refuse: 'no_controller_named' };
      if (!date) return { refuse: 'undated' };
      const sid = `vehicle-control-${kebab(v.vehicle_id.replace(/^vehicle:/, ''))}`;
      return emit(dryRun, {
        surface_id: sid, surface_label: `${v.label} (${v.kind.replace(/_/g, ' ')}) controlled by ${aActors.get(v.controller)?.label ?? v.controller}, as represented ${date}`,
        surface_type: 'founder_officer_surface', secondary_surface_types: ['surface_factory_capital_layer'],
        hop_eligible: false, hop_refusal_reason: 'single_actor_vehicle_control_observation', scorable: true, status: `vehicle_control_${v.evidence_state}`,
        bounded_by: ['vehicle public page'], time_start: date, time_end: date, date_basis: 'record_retrieval_date',
        evidence_class: ec, receipt_ids: ids, intake_source: A, notes: `${v.note ?? ''} ${obsNote(date)}`.trim(),
      }, [
        { surface_id: sid, participant_type: 'actor', actor_id: personId(v.controller), role: 'controller', participation_type: 'vehicle_controller', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: vehicleOrg(v.vehicle_id), role: v.kind.replace(/_/g, ' '), participation_type: 'capital_vehicle', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
      ]);
    },
  });
}

const portfolioByActor = new Map();
for (const e of readJsonl(`${A}/portfolio-edges.jsonl`)) {
  const k = `${e.actor_id}|${e.vehicle_id}|${e.first_observed}`;
  if (!portfolioByActor.has(k)) portfolioByActor.set(k, []);
  portfolioByActor.get(k).push(e);
}
for (const [k, edges] of portfolioByActor) {
  const [actorId, vehicleId, date] = k.split('|');
  const sid = `portfolio-as-represented-${kebab(vehicleId.replace(/^vehicle:/, ''))}-${date}`;
  for (const e of edges) {
    admit({
      source: 'A', table: 'portfolio-edges', rowKey: `${vehicleId}:${e.company_name_as_listed}`, receiptIds: e.receipt_ids,
      build: ({ ids, ec, dryRun }) => (!dryRun && !nameShownInArchive(ids, e.company_name_as_listed)) ? { refuse: 'company_name_not_in_archived_copy' } : emit(dryRun, {
        surface_id: sid, surface_label: `${aVehicles.get(vehicleId)?.label ?? vehicleId} portfolio as represented, ${date}`,
        surface_type: 'employment_investment_surface', secondary_surface_types: ['surface_factory_capital_layer'],
        hop_eligible: false, hop_refusal_reason: 'single_actor_portfolio_listing', scorable: true, status: 'self_represented_portfolio_listing',
        bounded_by: ['self-published portfolio page'], time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids, intake_source: A,
        notes: `${e.note} A listed investment is not equity terms, control, or a priced round.`,
      }, [
        { surface_id: sid, participant_type: 'actor', actor_id: personId(actorId), role: 'investor (self-represented)', participation_type: 'angel_investor', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(e.company_name_as_listed, 'company'), role: 'listed portfolio company', participation_type: 'company', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
      ]),
    });
  }
}
for (const a of aActors.values()) {
  admit({
    source: 'A', table: 'actors', rowKey: a.actor_id, receiptIds: a.receipt_ids,
    build: ({ dryRun }) => { if (!dryRun) personId(a.actor_id); return dryRun ? { actor: { id: kebab(a.actor_id.replace(/^person:/, '')), label: a.label, kind: 'person' } } : null; },
  });
}

// =============================================================== B: Austin–Israel defense corridor
const bOrgs = new Map(readJsonl(`${B}/organizations.jsonl`).map(o => [o.org_id, o]));
const bActors = new Map(readJsonl(`${B}/actors.jsonl`).map(a => [a.actor_id, a]));
const bOrg = oid => ensureOrg(bOrgs.get(oid)?.label ?? oid.replace(/^org-/, ''), 'organization');

for (const j of readJsonl(`${B}/confirmed-joins.jsonl`)) {
  // NatSec100 side is the per-year list surface built from C.company_years; the co-listing adds no
  // new NatSec100 participation. The fund/accelerator side is the portfolio-page surface below.
  fold('B', 'confirmed-joins');
}

const cfEdges = readJsonl(`${B}/portfolio-edges.jsonl`);
const cfByFund = new Map();
for (const e of cfEdges) {
  if (!e.company_name_as_listed) {
    tally('B', 'portfolio-edges').read += 1;
    refuse('B', 'portfolio-edges', `${e.from_org_id}:${e.predicate}`, 'no_company_named', { note: e.note });
    continue;
  }
  if (!cfByFund.has(e.from_org_id)) cfByFund.set(e.from_org_id, []);
  cfByFund.get(e.from_org_id).push(e);
}
for (const [fundId, edges] of cfByFund) {
  for (const e of edges) {
    const date = retrievedAt(e.receipt_ids);
    const fundLabel = bOrgs.get(fundId)?.label ?? fundId;
    const sid = `${kebab(fundLabel)}-portfolio-page-${date}`;
    admit({
      source: 'B', table: 'portfolio-edges', rowKey: `${fundId}:${e.company_name_as_listed}`, receiptIds: e.receipt_ids,
      build: ({ ids, ec, dryRun }) => {
        if (!date) return { refuse: 'undated' };
        if (!dryRun && !nameShownInArchive(ids, e.company_name_as_listed)) return { refuse: 'company_name_not_in_archived_copy' };
        return emit(dryRun, {
          surface_id: sid, surface_label: `${fundLabel} portfolio page, ${date}`,
          surface_type: 'directory_roster_surface', secondary_surface_types: ['surface_factory_capital_layer'],
          hop_eligible: false, hop_refusal_reason: 'dense_roster_density_policy', scorable: true, status: 'public_portfolio_listing',
          bounded_by: ['public portfolio page'], time_start: date, time_end: date, date_basis: 'record_retrieval_date',
          evidence_class: ec, receipt_ids: ids, intake_source: B, notes: `${e.note} ${obsNote(date)}`,
        }, [
          { surface_id: sid, participant_type: 'organization', organization_id: bOrg(fundId), role: 'portfolio publisher', participation_type: 'portfolio_publisher', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
          { surface_id: sid, ...listedParticipant(e.company_name_as_listed, 'company', `listed on the ${fundLabel} portfolio page`, 'listed'), participation_type: 'listed_portfolio_company', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        ]);
      },
    });
  }
}

for (const g of readJsonl(`${B}/government-surfaces.jsonl`)) {
  const date = retrievedAt(g.receipt_ids);
  const sid = `partnership-claim-${kebab(g.org_id.replace(/^org-/, ''))}-${kebab(g.surface)}`;
  admit({
    source: 'B', table: 'government-surfaces', rowKey: `${g.org_id}:${g.surface}`, receiptIds: g.receipt_ids,
    build: ({ ids, dryRun }) => {
      if (!date) return { refuse: 'undated' };
      const ec = 'reported'; // independent_corroboration_state self_claimed -> reported
      return emit(dryRun, {
        surface_id: sid, surface_label: `${bOrgs.get(g.org_id)?.label ?? g.org_id} claimed partnership with ${g.surface}, as stated ${date}`,
        surface_type: 'customer_vendor_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: false, hop_refusal_reason: 'organization_only_self_claimed_partnership', scorable: true,
        status: g.independent_corroboration_state, bounded_by: ['claimant own site or press'], time_start: date, time_end: date,
        date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: B,
        notes: `${g.note ?? ''} Self-claimed; no counterpart confirmation. ${obsNote(date)}`.trim(),
      }, [
        { surface_id: sid, participant_type: 'organization', organization_id: bOrg(g.org_id), role: 'claimant', participation_type: 'self_claimed_partner', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
        { surface_id: sid, participant_type: 'organization', organization_id: ensureOrg(g.surface, 'agency'), role: 'named counterpart (unconfirmed)', participation_type: 'claimed_counterpart', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids },
      ]);
    },
  });
}

for (const p of readJsonl(`${B}/professional-claims.jsonl`)) {
  const date = retrievedAt(p.receipt_ids);
  admit({
    source: 'B', table: 'professional-claims', rowKey: p.claim_id, receiptIds: p.receipt_ids,
    build: ({ ids, ec, dryRun }) => {
      if (!p.org_id) return { refuse: 'no_organization_named' };
      if (!date) return { refuse: 'undated' };
      const actor = bActors.get(p.actor_id);
      const sid = `${kebab(bOrgs.get(p.org_id)?.label ?? p.org_id)}-team-page-${date}`;
      return emit(dryRun, {
        surface_id: sid, surface_label: `${bOrgs.get(p.org_id)?.label ?? p.org_id} publicly represented team, ${date}`,
        surface_type: 'founder_officer_surface', secondary_surface_types: ['defence_industrial_surface'],
        hop_eligible: true, scorable: true, status: 'publicly_represented_roles', bounded_by: ['organization own site or named press'],
        time_start: date, time_end: date, date_basis: 'record_retrieval_date', evidence_class: ec, receipt_ids: ids, intake_source: B,
        notes: `Roles as publicly represented on one dated page. ${obsNote(date)}`,
      }, [{ surface_id: sid, participant_type: 'actor', actor_id: ensureActor(actor?.label ?? p.actor_id), role: p.role_title, participation_type: 'publicly_represented_role', time_start: date, time_end: date, evidence_class: ec, receipt_ids: ids }]);
    },
  });
}
for (const a of bActors.values()) {
  admit({ source: 'B', table: 'actors', rowKey: a.actor_id, receiptIds: a.receipt_ids, build: ({ dryRun }) => (dryRun ? { actor: { label: a.label } } : (ensureActor(a.label), null)) });
}
for (const o of bOrgs.values()) {
  admit({ source: 'B', table: 'organizations', rowKey: o.org_id, receiptIds: o.receipt_ids ?? [], build: ({ dryRun }) => (dryRun ? { organization: { label: o.label } } : (bOrg(o.org_id), null)) });
}
tally('B', 'motifs').read = readJsonl(`${B}/motifs.jsonl`).length; // analysis, never promoted (by direction)

// =============================================================== hop eligibility (post-staging)
for (const s of surfaces.values()) {
  const parts = participation.filter(p => p.surface_id === s.surface_id);
  const actors = uniq(parts.filter(p => p.participant_type === 'actor').map(p => p.actor_id));
  s.roster_entry_count = parts.length;
  if (actors.length >= densityMax + 1) { s.hop_eligible = false; s.hop_refusal_reason = 'dense_roster_density_policy'; continue; }
  if (s.hop_refusal_reason === 'dense_roster_density_policy') continue; // dense organization roster by construction
  const byDate = new Map();
  for (const p of parts.filter(p => p.participant_type === 'actor')) {
    if (!byDate.has(p.time_start)) byDate.set(p.time_start, new Set());
    byDate.get(p.time_start).add(p.actor_id);
  }
  const shared = [...byDate.values()].some(set => set.size >= 2);
  // A reported-only basis needs an upgrade-attempt disposition before it can be an accepted hop
  // (tools/lib/reported-hop-evidence-upgrades.mjs); this tool does not write dispositions, so the
  // surface stays non-hop until the owner records one.
  if (shared && s.evidence_class === 'reported') { s.hop_eligible = false; s.hop_refusal_reason = 'reported_evidence_without_upgrade_disposition'; }
  else if (shared) { s.hop_eligible = true; delete s.hop_refusal_reason; }
  else {
    s.hop_eligible = false;
    if (!s.hop_refusal_reason) s.hop_refusal_reason = actors.length === 0 ? 'organization_only_evidence' : 'single_actor_context_only';
    if (actors.length === 0 && !s.hop_refusal_reason.startsWith('organization_only')) s.hop_refusal_reason = 'organization_only_evidence';
  }
}

// =============================================================== write
const orderedSurfaces = [...surfaces.values()].map(s => {
  const { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, hop_refusal_reason, scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest } = s;
  return { surface_id, surface_label, surface_type, secondary_surface_types, hop_eligible, ...(hop_refusal_reason ? { hop_refusal_reason } : {}), scorable, status, bounded_by, time_start, time_end, evidence_class, receipt_ids, notes, ...rest };
});
const usedReceiptIds = new Set([...orderedSurfaces.flatMap(s => s.receipt_ids), ...participation.flatMap(p => p.receipt_ids)]);
const receipts = [...citedReceipts.values()].filter(r => usedReceiptIds.has(r.receipt_id));
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const usedActorIds = new Set(participation.map(p => p.actor_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id));
const actorsOut = [...newActors.values()].filter(a => usedActorIds.has(a.id));

const fundingTotal = participation.reduce((n, p) => n + (p.funding_amount_usd ?? 0), 0);
writeJsonl(`${OUT}/surfaces.jsonl`, orderedSurfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: actorsOut });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
const receiptStatus = {};
for (const [id, r] of intakeReceipts) {
  const k = r.problems.length ? refusalReason([{ problems: r.problems }]) : 'admissible';
  receiptStatus[k] = (receiptStatus[k] ?? 0) + 1;
}
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: 'tools/promote-intake-defense-corridor.mjs',
  sources: { A, B, C },
  admission_rule: 'A row is promoted only when at least one cited receipt has a public source URL, is not marked unavailable or unresolved, and satisfies the live receipt contract (resolving archive reference plus limits). Otherwise the row is written to gaps.jsonl with its would-be ledger rows.',
  tables: Object.fromEntries(Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))),
  intake_receipt_status: receiptStatus,
  staged: {
    surfaces: orderedSurfaces.length,
    participation: participation.length,
    receipts: receipts.length,
    new_actors: actorsOut.length,
    new_organizations: orgsOut.length,
    gaps: gaps.length,
    funding_amount_usd_total: fundingTotal,
  },
});
console.log(`promote-intake-defense-corridor: ${orderedSurfaces.length} surfaces, ${participation.length} participation rows, ${receipts.length} receipts, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${gaps.length} gaps; funding_amount_usd total ${fundingTotal}.`);
