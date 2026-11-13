#!/usr/bin/env node
// UK contract awards lane: Contracts Finder award notices whose buyer and a named supplier are both
// organisations the ledger already holds (owner decision 2026-11-12, "Yes, fetch them", to "Fetch
// Contracts Finder's daily notice files since 2023, about 1.7 GB?"). Archive each notice's release,
// then stage rows. Modelled on tools/promote-intake-uk-ministerial-meetings.mjs, with the award
// shapes of tools/promote-intake-uk-public-money.mjs (award surfaces, buyer and supplier rows, money
// fields, receipt limits).
//
//   node tools/promote-intake-uk-contract-awards.mjs --fetch --from-cache <dir> [--refresh]
//   node tools/promote-intake-uk-contract-awards.mjs            (promote; deterministic, offline)
//
// The intake is data/intake/uk-contract-awards/uk-contract-awards.json, drafted by the supervising
// session from Contracts Finder's daily notice files of 1 January 2023 to 11 November 2026: notices[]
// (one per award notice, with one drafted surface and its participant entries), the selection rule,
// the supervisor's rulings and the research hands' identity verdicts (only "same" calls are in the
// intake). Every ledger_id already exists: nothing is minted.
//
// Each notice rests on its published open-data release (OCDS JSON), of one of two kinds:
//   - fetched_release: the release as fetched from its release URL with the project's declared research
//     User-Agent; source_url is the release URL;
//   - rebuilt_from_daily_file: the release rebuilt from its row in the newest Contracts Finder daily
//     notice file carrying it (the daily files flatten each release into one CSV row whose column names
//     are its JSON paths; un-flattening that row gives the release, with every value kept as the CSV
//     gives it, so amounts are strings); source_url is that daily file.
// --fetch archives each release once under receipts/uk-contract-awards/ from <dir>/<cached_file>, as the
// fetched body, hashing the stored file with the receipt contract's canonical hash; it does not refetch
// (Contracts Finder answers about five requests a minute from one address). The daily files themselves
// stay out of the repository. Retrieval days are the operator's local calendar day.
//
// Promote mode is offline and deterministic:
//   - one surface per notice, as drafted, dated by the drafted date and date_end; a label that repeats
//     another gets its notice id, since labels derive the AXM entity id;
//   - one participation row per participant entry, dated by that entry's own date, with the drafted role
//     and participation type, evidence class official, citing the notice's receipt; a drafted amount goes
//     on the row with the note that a contract value is not an outlay;
//   - a buyer row is admitted when releases[0].buyer.name in the archived release equals its shown name;
//     a supplier or framework_supplier row when an award dated the row's date (the first ten characters
//     of awards[].date) names a supplier equal to its shown name, and a drafted amount equals that
//     award's value.amount in GBP, compared as numbers;
//   - a surface without an admitted buyer row and an admitted supplier row goes to gaps whole.
// Every surface is hop_eligible false (entered_2026_11_12_pending_hop_review): organisation-only records.
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl, writeJson, writeJsonl } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANE = 'uk-contract-awards';
const TOOL = 'tools/promote-intake-uk-contract-awards.mjs';
const INTAKE = 'data/intake/uk-contract-awards/uk-contract-awards.json';
const STORE = 'receipts/uk-contract-awards';
const OUT = 'data/ledger/staging/uk-contract-awards';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const ENTERED = '2026-11-12';
const HOP_REFUSAL = 'entered_2026_11_12_pending_hop_review';
const DECISION = { date: ENTERED, decided_by: 'owner', question: 'Fetch Contracts Finder\'s daily notice files since 2023, about 1.7 GB?', words: 'Yes, fetch them' };
const MONEY_NOTE = 'Total value of contract on the award notice; not an outlay.';
const CONTENT_TYPE = 'application/json';
const KINDS = ['fetched_release', 'rebuilt_from_daily_file'];
const TYPES = ['buyer', 'supplier', 'framework_supplier'];

const intake = readJson(INTAKE);
const notices = intake.notices;
const localDay = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const isoUtc = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const sources = notices.map(n => {
  if (!/^[0-9a-f-]{36}$/.test(n.notice_id)) throw new Error(`unexpected notice id ${n.notice_id}`);
  if (!KINDS.includes(n.source_kind)) throw new Error(`${n.notice_id}: unknown source_kind ${n.source_kind}`);
  return { notice: n, id: `ukca-${n.notice_id}`, rel: `${STORE}/${n.notice_id}.json` };
});
{
  const ids = sources.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error('two notices derive the same receipt id');
}
const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const CACHE = args.includes('--from-cache') ? args[args.indexOf('--from-cache') + 1] : null;
  if (!CACHE) throw new Error('--fetch needs --from-cache <dir>: this lane archives the cached releases and does not refetch');
  const manifest = readManifest();
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  let cached = 0; let kept = 0;
  for (const src of sources) {
    const n = src.notice;
    const limits = n.surfaces[0]?.limits;
    if (!limits || limits.length < MIN_LIMITS_LENGTH) throw new Error(`limits too short for ${src.id}`);
    const prev = manifest.get(src.id);
    if (!REFRESH && prev?.status === 'archived' && fs.existsSync(path.join(root, prev.path))
        && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) { kept += 1; continue; }
    const base = { receipt_id: src.id, source_url: n.source_url, fetch_url: n.source_kind === 'fetched_release' ? n.release_url : n.source_url };
    const cacheFile = path.join(CACHE, n.cached_file);
    if (!fs.existsSync(cacheFile)) {
      manifest.set(src.id, { ...base, status: 'failed', reason: 'not_in_cache' });
      console.log(`failed   ${src.id} not_in_cache`);
      continue;
    }
    const bytes = fs.readFileSync(cacheFile);
    const at = fs.statSync(cacheFile).mtime;
    let release = null;
    try { release = JSON.parse(bytes.toString('utf8'))?.releases?.[0] ?? null; } catch { release = null; }
    if (!release) {
      manifest.set(src.id, { ...base, attempted_at: isoUtc(at), status: 'failed', reason: 'not_an_ocds_release_package' });
      console.log(`failed   ${src.id} not_an_ocds_release_package`);
      continue;
    }
    fs.writeFileSync(path.join(root, src.rel), bytes);
    const sha = canonicalReceiptHash(path.join(root, src.rel));
    const day = localDay(at);
    manifest.set(src.id, {
      ...base, attempted_at: isoUtc(at), status: 'archived', source_kind: n.source_kind, path: src.rel, retrieved_at: day, retrieved_at_utc: isoUtc(at),
      content_type: CONTENT_TYPE, content_bytes: bytes.length, content_sha256: sha,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: day, checked: day, fetched_url: base.fetch_url, content_type: CONTENT_TYPE, bytes: bytes.length,
        note: n.source_kind === 'fetched_release'
          ? 'Release fetched from its public release URL with the project\'s declared research User-Agent and taken as the fetched body; hash covers the in-repository copy.'
          : `Release rebuilt from row ${n.daily_file_row} of the Contracts Finder daily notice file ${n.daily_file} (the source URL) by un-flattening its JSON-path columns, with every value kept as the CSV gives it; hash covers the in-repository copy.`,
      },
    });
    cached += 1;
  }
  writeJsonl(MANIFEST, [...manifest.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id)));
  const all = [...manifest.values()];
  console.log(`fetch: ${cached} from cache, ${kept} kept; ${all.filter(r => r.status === 'archived').length} archived, ${all.filter(r => r.status === 'failed').length} failed; wrote ${MANIFEST}`);
}

const argv = process.argv.slice(2);
if (argv.includes('--fetch')) { fetchMode(argv); process.exit(0); }

// =============================================================== promote mode
const canonOrgIds = new Set(readJson('data/canonical/organizations.json').organizations.map(o => o.id));
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const ledgerSurfaces = readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE);
const ledgerSurfaceIds = new Set(ledgerSurfaces.map(s => s.surface_id));
const ledgerNoticeIds = new Set(ledgerSurfaces.map(s => s.contracts_finder_notice_id).filter(Boolean));
const ledgerReceiptIds = new Set(readJsonl('data/ledger/receipts.jsonl').filter(r => r.intake_source !== LANE).map(r => r.receipt_id));

// ---------------------------------------------------------------- receipts
const manifest = readManifest();
const receiptState = new Map(); // receipt id -> { candidate, problems, release }
for (const src of sources) {
  const n = src.notice;
  const s = n.surfaces[0];
  const arc = manifest.get(src.id);
  const problems = [];
  let candidate = null;
  if (!arc) problems.push('not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      receipt_id: src.id,
      label: `Contracts Finder notice ${n.notice_id}`,
      source_type: 'official_contract_award_notice',
      evidence_class: 'official',
      publisher: n.publisher,
      ...(n.source_published ? { source_published_at: n.source_published } : {}),
      path: arc.path,
      source_url: n.source_url,
      secondary_source_url: n.notice_page,
      ...(n.release_url !== n.source_url ? { tertiary_source_url: n.release_url } : {}),
      retrieved_at: arc.retrieved_at,
      content_sha256: arc.content_sha256,
      content_type: arc.content_type,
      content_bytes: arc.content_bytes,
      notes: n.source_kind === 'fetched_release'
        ? `Archived ${arc.retrieved_at} by ${TOOL} --fetch.`
        : `Archived ${arc.retrieved_at} by ${TOOL} --fetch; rebuilt from row ${n.daily_file_row} of daily file ${n.daily_file}, values kept as the CSV gives them.`,
      limits: s.limits,
      // The archive shape of tools/promote-intake-uk-public-money.mjs receipts; the manifest keeps the full record.
      archive: { method: arc.archive.method, ref: arc.archive.ref, captured: arc.archive.captured },
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    if (ledgerReceiptIds.has(src.id)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  receiptState.set(src.id, { candidate: problems.length ? null : candidate, problems, ...(problems.length ? {} : { release: JSON.parse(fs.readFileSync(path.join(root, candidate.path), 'utf8')).releases[0] }) });
}

// ---------------------------------------------------------------- accounting and staging
const gaps = [];
const byType = () => Object.fromEntries(TYPES.map(t => [t, 0]));
const counts = {
  notices_read: notices.length, surfaces_entered: 0, surfaces_refused: 0,
  participants_read: 0, participants_admitted: 0, participants_refused: 0,
  read_by_type: byType(), admitted_by_type: byType(), refused_by_type: byType(),
  rows_with_amount: 0,
};
const gap = (table, rowKey, reason, detail = {}) => gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
const surfaces = [];
const participation = [];
const cited = new Map();
// Surface labels derive the AXM entity id, so they must be unique: a drafted label that repeats another in
// this lane or the ledger (an issuer can publish two notices of the same title on the same day) gets the
// notice id, as the SEC Form D lane does with accessions.
const labelCount = new Map();
for (const n of notices) labelCount.set(n.surfaces[0].label.toLowerCase(), (labelCount.get(n.surfaces[0].label.toLowerCase()) ?? 0) + 1);
const takenLabels = new Set(ledgerSurfaces.map(s => String(s.surface_label).toLowerCase()));
const labelOf = s => (labelCount.get(s.label.toLowerCase()) > 1 || takenLabels.has(s.label.toLowerCase()) ? `${s.label} (notice ${s.contracts_finder_notice_id})` : s.label);
// Field order as tools/promote-intake-uk-public-money.mjs writes its award rows.
const P = (sid, day, ids, rest) => ({ surface_id: sid, ...rest, time_start: day, time_end: day, evidence_class: 'official', receipt_ids: ids });

for (const src of sources) {
  const n = src.notice;
  if (n.surfaces.length !== 1) throw new Error(`${src.id}: one surface per notice, got ${n.surfaces.length}`);
  const s = n.surfaces[0];
  const sid = s.surface_id;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(sid)) throw new Error(`${sid}: surface id is not slug-normal`);
  if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type}`);
  counts.participants_read += s.participants.length;
  for (const p of s.participants) {
    if (!TYPES.includes(p.participation_type)) throw new Error(`${sid}: unknown participation type ${p.participation_type}`);
    if (p.kind !== 'organization' || !canonOrgIds.has(p.ledger_id)) throw new Error(`${sid}: ${p.kind} ${p.ledger_id} is not a canonical organisation (this lane mints nothing)`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date)) || p.date < s.date || p.date > (s.date_end ?? s.date)) throw new Error(`${sid}: ${p.ledger_id} dated ${p.date} outside ${s.date}..${s.date_end}`);
    counts.read_by_type[p.participation_type] += 1;
  }
  const wouldBe = { surface: { surface_id: sid, surface_label: s.label, time_start: s.date, contracts_finder_notice_id: s.contracts_finder_notice_id }, participation: s.participants.map(p => ({ organization_id: p.ledger_id, participation_type: p.participation_type, shown: p.shown, date: p.date, ...(p.funding_amount_gbp != null ? { funding_amount_gbp: p.funding_amount_gbp } : {}) })) };
  const refuseAll = (reason, detail) => {
    counts.surfaces_refused += 1;
    counts.participants_refused += s.participants.length;
    for (const p of s.participants) counts.refused_by_type[p.participation_type] += 1;
    gap('surfaces', sid, reason, { ...detail, candidate: wouldBe });
  };
  if (ledgerSurfaceIds.has(sid)) { refuseAll('surface_id_already_in_ledger', {}); continue; }
  if (ledgerNoticeIds.has(s.contracts_finder_notice_id)) { refuseAll('notice_already_in_ledger', {}); continue; }
  const st = receiptState.get(src.id);
  if (st.problems.length) {
    refuseAll(st.problems.some(x => x.startsWith('archive_attempt_failed') || x === 'not_attempted') ? 'receipt_archive_unresolved' : 'receipt_not_admissible',
      { receipt_failures: [{ receipt_id: src.id, problems: st.problems }], source_url: n.source_url });
    continue;
  }
  const r = st.release;
  const rows = [];
  const refused = [];
  const seen = new Set();
  for (const p of s.participants) {
    const rowKey = `${sid}:${p.ledger_id}:${p.participation_type}:${p.date}`;
    let reason = null;
    if (p.participation_type === 'buyer') {
      if (r.buyer?.name !== p.shown) reason = 'buyer_name_not_in_archived_release';
    } else {
      const awards = (r.awards ?? []).filter(a => String(a.date ?? '').slice(0, 10) === p.date && (a.suppliers ?? []).some(x => x.name === p.shown));
      if (!awards.length) reason = 'supplier_not_on_an_award_of_that_date_in_archived_release';
      else if (p.funding_amount_gbp != null && !awards.some(a => a.value?.currency === 'GBP' && Number(a.value?.amount) === Number(p.funding_amount_gbp))) reason = 'amount_not_the_award_value_in_archived_release';
    }
    const key = `${p.ledger_id}|${p.participation_type}|${p.date}`;
    if (!reason && seen.has(key)) reason = 'same_organisation_same_type_same_day_twice_on_surface';
    if (reason) {
      refused.push(p);
      gap('participation', rowKey, reason, { receipts: [src.id], shown_as: p.shown, ...(p.funding_amount_gbp != null ? { funding_amount_gbp: p.funding_amount_gbp } : {}) });
      continue;
    }
    seen.add(key);
    rows.push(P(sid, p.date, [src.id], {
      participant_type: 'organization', organization_id: p.ledger_id, role: p.role, participation_type: p.participation_type,
      ...(p.funding_amount_gbp != null ? { funding_amount_gbp: p.funding_amount_gbp, notes: MONEY_NOTE } : {}),
    }));
  }
  const hasBuyer = rows.some(x => x.participation_type === 'buyer');
  const hasSupplier = rows.some(x => x.participation_type !== 'buyer');
  if (!hasBuyer || !hasSupplier) {
    refuseAll(!hasBuyer ? 'no_admitted_buyer_row' : 'no_admitted_supplier_row', { receipts: [src.id] });
    continue;
  }
  cited.set(src.id, st.candidate);
  // Field order as tools/promote-intake-uk-public-money.mjs writes its award surfaces.
  surfaces.push({
    surface_id: sid,
    surface_label: labelOf(s),
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
    ...(s.funding_amount_gbp != null ? { funding_amount_gbp: s.funding_amount_gbp, funding_amount_basis: s.funding_amount_basis } : {}),
    contract_reference: s.contract_reference,
    contracts_finder_notice_id: s.contracts_finder_notice_id,
    date_basis: s.date_basis,
    intake_source: LANE,
    notes: s.notes,
  });
  participation.push(...rows);
  counts.surfaces_entered += 1;
  counts.participants_admitted += rows.length;
  counts.participants_refused += refused.length;
  for (const x of rows) counts.admitted_by_type[x.participation_type] += 1;
  for (const p of refused) counts.refused_by_type[p.participation_type] += 1;
  counts.rows_with_amount += rows.filter(x => x.funding_amount_gbp != null).length;
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
  const keys = participation.map(p => `${p.surface_id}|${p.participant_type}|${p.organization_id}|${p.participation_type}|${p.time_start}`);
  if (new Set(keys).size !== keys.length) throw new Error('two staged rows share a merge key');
}
const fundingTotal = Math.round(participation.reduce((t, p) => t + (p.funding_amount_gbp ?? 0), 0) * 100) / 100;

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
    manifest: MANIFEST, store: STORE, notices: sources.length,
    by_kind: Object.fromEntries(KINDS.map(k => [k, sources.filter(s => s.notice.source_kind === k).length])),
    archived: [...manifest.values()].filter(r => r.status === 'archived').length,
    failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
  },
  admission_rule: 'One surface per Contracts Finder award notice, dated by the drafted award date; one row per participant entry, dated by its own date. A buyer row is admitted when the archived release\'s buyer name equals its shown name; a supplier or framework_supplier row when an award of that date in the archived release names a supplier equal to its shown name, and a drafted amount equals that award\'s value in GBP. A surface without an admitted buyer row and an admitted supplier row goes to gaps. Nothing is minted. Every surface is hop_eligible false pending a reader: these are organisation-only records.',
  money: { funding_amount_gbp: 'Value of the award on a single-supplier Contracts Finder notice (a contract value or ceiling, not money paid). Framework places carry no amount.', funding_amount_gbp_total: fundingTotal },
  counts,
  gap_reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length,
    new_actors: 0, new_organizations: 0, gaps: gaps.length, hop_eligible_surfaces: 0,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-uk-contract-awards: ${surfaces.length} surfaces (0 hop-eligible), ${participation.length} participation rows, ${receipts.length} receipts, 0 actors, 0 organizations staged; ${gaps.length} gaps; funding_amount_gbp total ${fundingTotal}.`);
