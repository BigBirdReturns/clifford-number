#!/usr/bin/env node
// Amplification chain lane: the lines of the chain behind NIK's (@ns123abc) chart of 13 November 2026
// ("509 accounts with 8.5M followers amplified both posts", "Jacob Coxon 2.0 btw"), which set Will DePue's
// checkpoint result of 12 November 2026 beside Jacob Coxon's resignation thread of 9 September 2026,
// traced on the owner's words of 12 November 2026 ("do it?": continue the proof) and entered on his
// answer of 13 November 2026 ("Yes, enter them"). Archive the source pages, then stage rows.
//
//   node tools/promote-intake-amplification-chain.mjs --fetch [--refresh] [--only <receipt_id>]
//   node tools/promote-intake-amplification-chain.mjs            (promote; deterministic, offline)
//
// The intake is data/intake/amplification-chain/amplification-chain.json, drafted from the supervising
// session's entry plan of 13 November 2026 in the Bitter Struggle lane's shape: pages[] (one per source
// page, each with the new surfaces it supports and their participants, each participant with the
// `shown` words), a page's source_class (official, first_party or reported), one reported status with
// evidence class reported, and a participant's own time_start and/or time_end where the source states
// them. Lines the evidence supports but this pass does not enter are the candidate graph of the research
// batch, contributions/inbox/research-batches/2026-11-13-amplification-chain/, not ledger rows.
//
// X posts are a new source for the ledger. Each is archived through its api.fxtwitter.com JSON mirror
// URL as its source_url, as a first_party capture (the author's own post); the receipt's notes and the
// surface's limits say that the copy is the mirror's JSON as served on the retrieval day. A repost has
// no public time, so the two reposts are captured from the reposter's timeline JSON, which also holds
// unrelated posts.
//
// --fetch archives each source page once under receipts/amplification-chain/ with the receipt contract's
// canonical hash and writes one record per page to
// data/ledger/staging/amplification-chain/archived-receipts.jsonl, with the shared machinery
// (tools/lib/intake-page-lane.mjs): a page the ledger already holds an in-repo copy of is not archived
// again (its receipt is reused); requests are paced per host; a page whose host refuses a direct fetch
// is taken from its closest Wayback snapshot.
//
// Promote mode is offline and deterministic and applies the lens-hunt lane's admission rule:
//   - a participant is admitted only when the archived copy of the page shows its `shown` words (text
//     compared with markup stripped, entities decoded, whitespace collapsed and curly quotes folded,
//     ignoring letter case, as whole words);
//   - a surface is admitted only when the intake gives it a date (where the entry plan says to take the
//     page's date and the page states none, the date is null and the surface is gapped, not guessed), its
//     receipt satisfies the live receipt contract, at least one participant is admitted, and it is not a
//     second copy of an event the ledger already holds (every admitted person already on one ledger
//     surface with the same dates);
//   - everything refused goes to gaps.jsonl with the reason and the would-be rows.
// A participant with a null ledger_id resolves against the canonical actors, organisations, their
// aliases and the alias registry, as the lens-hunt lane resolves, or is minted. The organisations this
// pass may mint are listed below (MINT_ORGS) with the aliases they are known by, each checked against
// the ledger first; any other unresolved organisation stops the run. Every minted person carries a
// short plain.who / plain.why_here (PLAIN) drawn only from that person's surfaces, in the sources' own
// words. Labels that resolve to an existing record are listed in summary.json for a reader to confirm.
// Every new surface is hop_eligible false (entered_2026_11_13_pending_hop_review): there is no
// hop-bases ruling for this lane, so none is required or read.
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';
import {
  splitUrls, urlKey, isSec, heldPageCopies, createPageArchiver,
  kebab, uniq, norm, entityKey, fold, readArchivedText, showsWords,
} from './lib/intake-page-lane.mjs';

const LANE = 'amplification-chain';
const TOOL = 'tools/promote-intake-amplification-chain.mjs';
const INTAKE = 'data/intake/amplification-chain/amplification-chain.json';
const BATCH = 'contributions/inbox/research-batches/2026-11-13-amplification-chain/';
const STORE = 'receipts/amplification-chain';
const OUT = 'data/ledger/staging/amplification-chain';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const ID_PREFIX = 'amp-';
const TIMEOUT_S = 60;
const HOP_REFUSAL = 'entered_2026_11_13_pending_hop_review';
const DRAFTED_SENTENCE = 'Drafted by the supervising session on 13 November 2026 in the trace of the DePue and Coxon amplification chain, and admitted on the archived page showing the names, pending a reader.';
const isMirror = u => new URL(u).hostname.toLowerCase() === 'api.fxtwitter.com';
const MIRROR_NOTE = ' The stored copy is the fxtwitter mirror\'s JSON of the X post (or, for a repost, of the reposter\'s timeline) as served on the retrieval day, captured as the author\'s own post.';

// A page's source class gives its receipt's source type and the evidence class its surfaces must carry.
const SOURCE_CLASS = {
  official: { source_type: 'official_public_record', evidence_class: 'official' },
  first_party: { source_type: 'first_party_publication', evidence_class: 'primary_public' },
  reported: { source_type: 'press_report', evidence_class: 'reported' },
};

// ---------------------------------------------------------------- organisations this pass may mint
// Keyed by the intake label. Each is minted only when neither its label nor any alias names an existing
// organisation (canonical label, an organisation's own aliases, or data/canonical/aliases.json).
const MINT_ORGS = {
  'Encode AI': { id: 'encode-ai', label: 'Encode AI', kind: 'organization', aliases: ['Encode', 'Encode Justice', 'Encode AI Corporation', 'Encode Action'] },
  'Encode Research Foundation': { id: 'encode-research-foundation', label: 'Encode Research Foundation', kind: 'organization', aliases: [] },
  'Unemployment Labs': { id: 'unemployment-labs', label: 'Unemployment Labs', kind: 'organization', aliases: [] },
  Macrogrants: { id: 'macrogrants', label: 'Macrogrants', kind: 'organization', aliases: ['macrogrants.com'] },
  'FTI Consulting': { id: 'fti-consulting', label: 'FTI Consulting', kind: 'company', aliases: ['FTI'] },
  'New York City Council': { id: 'new-york-city-council', label: 'New York City Council', kind: 'public_body', aliases: ['NYC Council'] },
  'Survival and Flourishing Fund': { id: 'survival-and-flourishing-fund', label: 'Survival and Flourishing Fund', kind: 'fund', aliases: ['SFF'] },
  'Common Sense Media': { id: 'common-sense-media', label: 'Common Sense Media', kind: 'organization', aliases: [] },
  Fairplay: { id: 'fairplay', label: 'Fairplay', kind: 'organization', aliases: [] },
  "Young People's Alliance": { id: 'young-peoples-alliance', label: "Young People's Alliance", kind: 'organization', aliases: [] },
};

// ---------------------------------------------------------------- people this pass may mint
// Keyed by the intake label: who the record says the person is, and why the person is in the ledger,
// from the surfaces named in `on` (their receipts are the plain record's receipt_ids). Worded as the
// sources word it: a quote-post or a repost is not payment, and no motive is stated.
const NIK_QUOTE = 'nik-ns123abc-quote-post-of-will-depue-2026-11-13';
const CALVIN_RESULT = 'nathan-calvin-quote-post-of-will-depue-result-2026-11-12';
const CALVIN_FUND = 'nathan-calvin-quote-post-of-will-depue-fundraising-2026-11-12';
const CALVIN_COXON = 'nathan-calvin-quote-post-of-jacob-coxon-2026-09-09';
const REVANUR_REPOST = 'sneha-revanur-repost-of-will-depue-2026-11-12';
const KOKOTAJLO_REPOST = 'daniel-kokotajlo-repost-of-will-depue-2026-11-12';
const TEAM = 'encode-ai-team-roster-2026-11-13';
const TEAM_WHY = 'Listed on Encode\'s team page as read on 13 November 2026, with Sneha Revanur as Founder & President and Nathan Calvin as Chief Strategy Officer; a team page gives no start dates.';
const PLAIN = {
  'NIK (@ns123abc)': { on: [NIK_QUOTE],
    who: 'A pseudonymous X account, @ns123abc (display name NIK), that states no affiliation; the record does not identify its owner.',
    why_here: 'Quote-posted Will DePue\'s post at 03:02:01 UTC on 13 November 2026 with the words "Jacob Coxon 2.0 btw" and a chart of accounts it says engaged with both DePue\'s post and Jacob Coxon\'s resignation thread; a quote-post shows the account shared and commented on the post, not the chart\'s claims.' },
  'Will DePue': { on: ['unemployment-labs-checkpoint-forensics-report-2026-11-12', 'unemployment-labs-subsidiary-of-macrogrants-will-depue-2026-11-12', 'will-depue-self-reported-openai-role-2026-11-13', NIK_QUOTE, CALVIN_RESULT, CALVIN_FUND, REVANUR_REPOST, KOKOTAJLO_REPOST],
    who: 'Author of the checkpoint-forensics report published by Unemployment Labs on 12 November 2026; by his own profile, three years at OpenAI (the residency, Sora and post-training), leaving in 2026.',
    why_here: 'His report, and his post describing Unemployment Labs as a subsidiary of Macrogrants, a 501c3 pending non-profit raising $5M, are his own records. Nathan Calvin quote-posted his result 16m17s after it and quote-posted his Unemployment Labs post, Daniel Kokotajlo reposted the result, and NIK quote-posted it on 13 November; quote-posts and reposts show sharing, not any other tie.' },
  'Nathan Calvin': { on: [CALVIN_COXON, CALVIN_RESULT, CALVIN_FUND, 'sb-53-sponsor-encode-ai-nathan-calvin-2025-09-29', TEAM],
    who: 'Chief Strategy Officer of Encode AI on its team page as read on 13 November 2026; quoted as its general counsel and VP of State Affairs when SB 53 was signed on 29 September 2025.',
    why_here: 'Quote-posted Jacob Coxon\'s resignation thread 6m06s after it on 9 September 2026 ("Extremely powerful and urgent thread"), and Will DePue\'s result 16m17s after it and DePue\'s Unemployment Labs post on 12 November 2026; a quote-post shows that he shared and commented on the post, not coordination.' },
  'Sneha Revanur': { on: ['sb-1047-co-sponsor-encode-justice-sneha-revanur-2024-02-08', TEAM],
    who: 'Founder & President of Encode AI on its team page as read on 13 November 2026; quoted as president and founder of Encode Justice, a co-sponsor of SB 1047, on 8 February 2024.',
    why_here: 'Named on Encode\'s team page and quoted in Senator Wiener\'s release introducing SB 1047, which lists Encode Justice among its sponsors; neither page shows the terms of a sponsorship or any payment.' },
  'Daniel Kokotajlo': { on: [KOKOTAJLO_REPOST],
    who: 'The holder of the X account @DKokotajlo, whose timeline carries a repost of Will DePue\'s post of 12 November 2026.',
    why_here: 'Reposted Will DePue\'s checkpoint result of 12 November 2026, as his timeline shows; X gives no time for a repost, and a repost shows sharing, not any other tie.' },
  'Jacob Coxon': { on: ['jacob-coxon-resignation-post-openai-anthropic-2026-09-09', CALVIN_COXON, 'jacob-coxon-group-chat-retweets-reported-2026-09-11', 'fti-consulting-from-unknown-to-viral-report-2026-11-09', 'nyc-council-ai-risk-hearing-jacob-coxon-witness-2026-10-05'],
    who: 'Former pretraining researcher at OpenAI and Anthropic, who announced his resignation from Anthropic on X at 00:04:29 UTC on 9 September 2026 (8 September US time).',
    why_here: 'He told The Washington Post that after posting he got a group chat of about 10 people, including Encode\'s founder, to retweet it; Nathan Calvin quote-posted it 6m06s after it; FTI Consulting\'s analysis of 9 November 2026, with no client or funder disclosed, finds at medium confidence a pattern consistent with coordinated amplification by aligned advocacy efforts and the author genuine; he was a witness at the New York City Council\'s AI-risk hearing on 5 October 2026.' },
  'Sunny Gandhi': { on: [TEAM], who: 'Co-Executive Director of Encode AI, as its team page lists the role on 13 November 2026.', why_here: TEAM_WHY },
  'Adam Billen': { on: [TEAM], who: 'Co-Executive Director of Encode AI, as its team page lists the role on 13 November 2026.', why_here: TEAM_WHY },
  'Jaan Tallinn': { on: ['sff-2025-recommendation-encode-ai-jaan-tallinn', 'sff-2024-recommendation-encode-justice-jaan-tallinn'],
    who: 'The listed source of funds for the Survival and Flourishing Fund\'s recommendations to Encode in 2024 and 2025.',
    why_here: 'SFF\'s tables list $50,000 to Encode Justice via March On Foundation (2024) and $516,000 to Encode AI Corporation (2025), each funded by Jaan Tallinn; neither page dates the grant within the year.' },
};

const intake = readJson(INTAKE);
const pages = intake.pages.filter(p => (p.surfaces ?? []).length);
const ledgerReceiptsAll = readJsonl('data/ledger/receipts.jsonl');
const heldCopies = heldPageCopies(ledgerReceiptsAll, LANE);

// One source per distinct page URL the intake names, in intake order.
// A mirror URL keeps its whole path (account and status, or account and timeline), so two timelines
// do not derive the same id from their shared last segment.
function receiptIdFor(u) {
  const x = new URL(u);
  const host = x.hostname.toLowerCase().replace(/^www\./, '');
  const segs = x.pathname.split('/').filter(Boolean);
  const stem = isMirror(u) ? segs.join('-') : (segs.at(-1) ?? '').replace(/\.[a-z0-9]{2,5}$/i, '');
  return `${ID_PREFIX}${slug(`${host}-${stem}${x.search ? `-${x.search.slice(1)}` : ''}`)}`.slice(0, 96).replace(/-+$/, '');
}
const sources = new Map(); // urlKey -> source
for (const page of pages) {
  const cls = SOURCE_CLASS[page.source_class];
  if (!cls) throw new Error(`${page.group_id}: unknown source_class ${page.source_class}`);
  for (const s of page.surfaces) {
    if (s.evidence_class !== cls.evidence_class) throw new Error(`${s.surface_id}: evidence class ${s.evidence_class} does not match its page's source class ${page.source_class}`);
  }
  for (const u of splitUrls(page.source_url)) {
    const k = urlKey(u);
    if (sources.has(k)) continue;
    const reuse = heldCopies.get(k) ?? [];
    sources.set(k, {
      key: k, url: u, sec: isSec(u), reuse,
      id: reuse.length ? null : receiptIdFor(u),
      publisher: page.publisher,
      published: page.source_published ?? null,
      ec: cls.evidence_class,
      source_type: cls.source_type,
      label: `${page.publisher}: ${page.surfaces[0].label}`,
      limits: page.surfaces[0].limits,
    });
  }
}
{
  const ids = [...sources.values()].map(s => s.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('two source pages derive the same receipt id');
}
const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const archiver = createPageArchiver({ tmpPrefix: 'amplification-chain-archive-', timeoutS: TIMEOUT_S });
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
    manifest.set(src.id, archiver.archive(src, { store: STORE, name: src.id.slice(ID_PREFIX.length) }));
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
const ledgerParts = readJsonl('data/ledger/participation.jsonl');
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
// An organisation is also known by its own aliases (as SVDG, IQT and Data Collective are) and by the
// alias registry's organisation rows.
const orgAlias = new Map([
  ...canonOrgs.flatMap(o => (o.aliases ?? []).map(a => [entityKey(a), o.id])),
  ...canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [entityKey(x.alias), x.canonical_id]),
]);
const actorAlias = new Map(canonAliases.filter(x => x.kind === 'actor' && canonActorById.has(x.canonical_id)).map(x => [norm(x.alias), x.canonical_id]));

const newOrgs = new Map();
const newActors = new Map();
const resolved = new Map(); // `${kind}|${label}` -> { kind, label, id, via }
function existingOrg(label) {
  const key = entityKey(label);
  if (canonOrgByKey.has(key)) return { id: canonOrgByKey.get(key).id, via: 'label' };
  if (orgAlias.has(key)) return { id: orgAlias.get(key), via: 'alias' };
  if (canonOrgById.has(kebab(label))) return { id: kebab(label), via: 'id' };
  return null;
}
function ensureOrg(label) {
  const mint = MINT_ORGS[label];
  if (mint && newOrgs.has(mint.id)) return mint.id;
  for (const name of uniq([label, ...(mint ? [mint.label, ...mint.aliases] : [])])) {
    const hit = existingOrg(name);
    if (hit) { resolved.set(`organization|${label}`, { kind: 'organization', label, id: hit.id, via: `${hit.via}: ${name}` }); return hit.id; }
  }
  if (!mint) throw new Error(`organisation "${label}" is unresolved and not in MINT_ORGS: a reader decides before it is minted`);
  if (canonOrgById.has(mint.id)) throw new Error(`refusing to mint organization ${mint.id}: the id names an existing organisation under another label`);
  if (canonActorById.has(mint.id) || newActors.has(mint.id)) throw new Error(`refusing to mint organization ${mint.id}: the id already names an actor`);
  const { aliases, ...rest } = mint;
  newOrgs.set(mint.id, { ...rest, ...(aliases.length ? { aliases } : {}), source: LANE });
  return mint.id;
}
function ensureActor(label) {
  const hit = canonActorByLabel.get(norm(label));
  const via = hit ? { id: hit.id, via: 'label' } : actorAlias.has(norm(label)) ? { id: actorAlias.get(norm(label)), via: 'alias' } : canonActorById.has(kebab(label)) ? { id: kebab(label), via: 'id' } : null;
  if (via) { resolved.set(`actor|${label}`, { kind: 'actor', label, id: via.id, via: via.via }); return via.id; }
  const id = kebab(label);
  if (canonOrgById.has(id) || newOrgs.has(id)) throw new Error(`refusing to mint actor ${id}: the id already names an organization`);
  if (!PLAIN[label]) throw new Error(`actor "${label}" would be minted without a plain record in PLAIN`);
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
      notes: `Archived ${arc.retrieved_at} by ${TOOL} --fetch for the entry of the amplification chain.${isMirror(src.url) ? MIRROR_NOTE : ''}${arc.archive.wayback_ref ? ' The stored copy is a Wayback snapshot body because the source refuses automated fetches.' : ''}`,
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
const counts = { pages_read: pages.length, surfaces_read: 0, surfaces_entered: 0, surfaces_refused: 0, participants_read: 0, participants_admitted: 0, participants_refused: 0 };
const gap = (table, rowKey, reason, detail = {}) => gaps.push({ lane: LANE, table, row_key: rowKey, reason, ...detail });
const surfaces = [];
const participation = [];
const cited = new Map();

function admitParticipant(rowKey, p, ids) {
  const readable = ids.filter(id => receiptState.get(id).text != null);
  if (!readable.length) {
    gap('participation', rowKey, 'archived_copy_unread', { receipts: ids, unread: ids.map(id => receiptState.get(id).unread), shown_as: p.shown });
    return null;
  }
  const showing = readable.filter(id => showsWords(receiptState.get(id).text, p.shown));
  if (!showing.length) {
    gap('participation', rowKey, 'shown_words_not_on_archived_page', { receipts: readable, shown_as: p.shown });
    return null;
  }
  return showing;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
for (const page of pages) {
  const ids = uniq(splitUrls(page.source_url).flatMap(u => sourceReceiptIds.get(urlKey(u)) ?? []));
  for (const s of page.surfaces) {
    counts.surfaces_read += 1;
    counts.participants_read += s.participants.length;
    const wouldBe = {
      surface: { surface_id: s.surface_id, surface_label: s.label, status: s.status, time_start: s.date, time_end: s.date_end ?? s.date },
      participation: s.participants.map(p => ({ kind: p.kind, ledger_id: p.ledger_id, label: p.label, role: p.role, participation_type: p.participation_type, shown: p.shown, ...(p.time_start ? { time_start: p.time_start } : {}), ...(p.time_end ? { time_end: p.time_end } : {}) })),
    };
    if (!surfaceTypes.has(s.surface_type)) throw new Error(`unknown surface_type ${s.surface_type}`);
    // Where the entry plan says to take the page's date and the archived page states none, the intake
    // leaves the date null: the surface is refused, never given a guessed date.
    if (s.date == null) {
      counts.surfaces_refused += 1;
      gap('surfaces', s.surface_id, 'source_states_no_date', { date_basis: s.date_basis, source_url: page.source_url, ...(s.date_note ? { note: s.date_note } : {}), candidate: wouldBe });
      continue;
    }
    if (!ISO.test(s.date) || (s.date_end != null && !ISO.test(s.date_end))) throw new Error(`${s.surface_id}: surface date is not ISO`);
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
    const surfaceEnd = s.date_end ?? s.date;
    const rows = [];
    const seen = new Set();
    for (const p of s.participants) {
      const rowKey = `${s.surface_id}:${p.label}`;
      for (const t of [p.time_start, p.time_end]) if (t !== undefined && !ISO.test(t)) throw new Error(`${rowKey}: participant date ${t} is not ISO`);
      const showing = admitParticipant(rowKey, p, okIds);
      if (!showing) { counts.participants_refused += 1; continue; }
      let pid;
      if (p.kind === 'actor') {
        if (p.ledger_id && !canonActorById.has(p.ledger_id)) throw new Error(`${rowKey}: ledger actor ${p.ledger_id} is not in data/canonical/actors.json`);
        pid = p.ledger_id ?? ensureActor(p.label);
      } else if (p.kind === 'organization') {
        if (p.ledger_id && !canonOrgById.has(p.ledger_id)) throw new Error(`${rowKey}: ledger organisation ${p.ledger_id} is not in data/canonical/organizations.json`);
        pid = p.ledger_id ?? ensureOrg(p.label);
      } else throw new Error(`${rowKey}: unknown participant kind ${p.kind}`);
      const timeStart = p.time_start ?? s.date;
      const timeEnd = p.time_end ?? surfaceEnd;
      if (timeEnd < timeStart) throw new Error(`${rowKey}: row ends before it starts`);
      const key = `${p.kind}|${pid}`;
      if (seen.has(key)) { gap('participation', rowKey, 'same_participant_twice_on_surface', { participant_id: pid }); counts.participants_refused += 1; continue; }
      seen.add(key);
      rows.push({
        surface_id: s.surface_id,
        participant_type: p.kind,
        ...(p.kind === 'actor' ? { actor_id: pid } : { organization_id: pid }),
        role: p.role,
        participation_type: p.participation_type,
        time_start: timeStart,
        time_end: timeEnd,
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
    // One copy per event, as in the lens-hunt lane: a drafted surface whose admitted people all already
    // sit together on a ledger surface with the same dates is a second copy of an event the ledger holds.
    const admittedActors = uniq(rows.filter(r => r.actor_id).map(r => r.actor_id));
    const sameEvent = admittedActors.length ? ledgerSurfaces.filter(o => o.intake_source !== 'sec-form-d' && o.time_start === s.date && (o.time_end ?? o.time_start) === surfaceEnd
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
      time_end: surfaceEnd,
      evidence_class: s.evidence_class,
      receipt_ids: used,
      notes: [s.notes.trim(), DRAFTED_SENTENCE].join(' '),
      date_basis: s.date_basis,
      limits: s.limits,
      intake_source: LANE,
      intake_group_id: page.group_id,
      roster_entry_count: rows.length,
    });
    participation.push(...rows);
    counts.surfaces_entered += 1;
  }
}

// =============================================================== write
surfaces.sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id));
const order = new Map(surfaces.map((s, i) => [s.surface_id, i]));
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const usedReceiptIds = new Set(participation.flatMap(p => p.receipt_ids));
const receipts = [...cited.entries()].filter(([id, st]) => usedReceiptIds.has(id) && !st.reused).map(([, st]) => st.candidate).sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const reusedReceipts = [...cited.entries()].filter(([id, st]) => usedReceiptIds.has(id) && st.reused).map(([id]) => id).sort();
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const usedActorIds = new Set(participation.map(p => p.actor_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
// A minted person's plain record: who the source says the person is and why the person is here, citing
// the receipts of the person's admitted rows on the surfaces it is drawn from.
const actorsOut = [...newActors.values()].filter(a => usedActorIds.has(a.id)).sort((a, b) => a.id.localeCompare(b.id)).map(a => {
  const pl = PLAIN[a.label];
  const from = participation.filter(p => p.actor_id === a.id && pl.on.includes(p.surface_id));
  const missing = pl.on.filter(sid => !from.some(p => p.surface_id === sid));
  if (missing.length) throw new Error(`plain record for ${a.id} draws on ${missing.join(', ')}, where the person has no admitted row`);
  return { ...a, plain: { who: pl.who, why_here: pl.why_here, receipt_ids: uniq(from.flatMap(p => p.receipt_ids)).sort() } };
});
const { errors: contractErrors } = checkReceiptContract(receipts, { root });
if (contractErrors.length) throw new Error(`staged receipts fail the receipt contract: ${contractErrors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);
// There is no hop-bases ruling for this lane: every surface is hop_eligible false pending hop review.
if (surfaces.some(s => s.hop_eligible !== false || s.hop_refusal_reason !== HOP_REFUSAL)) throw new Error('every surface of this lane must be hop_eligible false pending hop review');
for (const src of sources.values()) {
  for (const id of sourceReceiptIds.get(src.key)) {
    if (!usedReceiptIds.has(id) && !gaps.some(g => g.receipts?.includes(id) || g.receipt_failures?.some(f => f.receipt_id === id))) {
      const st = receiptState.get(id);
      gap('receipts', id, st?.problems.length ? 'receipt_not_admissible' : 'receipt_archived_not_cited', { ...(st?.problems.length ? { problems: st.problems } : {}), source_url: src.url });
    }
  }
}
// Labels that resolved to a record the ledger already holds, for a reader to confirm (a wrong merge is
// worse than a mint); only those on admitted rows.
const resolvedOut = [...resolved.values()].filter(r => (r.kind === 'actor' ? usedActorIds : usedOrgIds).has(r.id)).sort((a, b) => a.label.localeCompare(b.label));

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
  research_batch: BATCH,
  decision: { date: intake.decision.date, decided_by: 'owner', question: intake.decision.question, words: intake.decision.owner_words, context: intake.decision.owner_words_context },
  sources: {
    manifest: MANIFEST, store: STORE, pages: sources.size,
    archived: [...manifest.values()].filter(r => r.status === 'archived').length,
    via_wayback: [...manifest.values()].filter(r => r.status === 'archived' && r.archive?.wayback_ref).map(r => r.receipt_id),
    reused_ledger_receipts: reusedReceipts,
    failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
    not_archived: [...manifest.values()].filter(r => r.status === 'not_archived').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
  },
  admission_rule: 'A participant is admitted only when the archived copy of its page shows its shown words (text compared with markup stripped, entities decoded, whitespace collapsed and curly quotes folded, ignoring letter case, as whole words); a surface only when the intake gives it a date (a page that states none where its date is to be taken is gapped, not guessed), its receipt satisfies the live receipt contract, at least one participant is admitted and it is not a second copy of an event the ledger already holds (every admitted person already on one ledger surface with the same dates). A participation row carries the dates the source states for the person\'s role when the intake gives them, otherwise the surface dates. There is no hop-bases ruling for this lane: every surface is hop_eligible false pending hop review. Everything refused goes to gaps.jsonl.',
  counts,
  gap_reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
  resolved_to_existing_records: resolvedOut,
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length, reused_receipts: reusedReceipts.length,
    new_actors: actorsOut.length, new_organizations: orgsOut.length, gaps: gaps.length, hop_eligible_surfaces: surfaces.filter(s => s.hop_eligible).length,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-amplification-chain: ${surfaces.length} surfaces (${surfaces.filter(s => s.hop_eligible).length} hop-eligible), ${participation.length} participation rows, ${receipts.length} new receipts + ${reusedReceipts.length} reused, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${resolvedOut.length} labels resolved to existing records; ${gaps.length} gaps.`);
