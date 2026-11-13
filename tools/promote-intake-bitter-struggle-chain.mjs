#!/usr/bin/env node
// Bitter Struggle chain lane: the lines of the chain behind Matt Clifford's repost of Tantum Collins's
// announcement of "The Bitter Struggle" (Ben Buchanan and Tantum Collins, Crown, 10 November 2026),
// entered on the owner's words of 12 November 2026 ("prove the methodology", then "Trace it") and the
// review he pasted ("an updated, queryable Clifford Number with admitted edges, preserved provenance,
// temporal constraints, and a separate candidate graph"). Archive the source pages, then stage rows.
//
//   node tools/promote-intake-bitter-struggle-chain.mjs --fetch [--refresh] [--only <receipt_id>]
//   node tools/promote-intake-bitter-struggle-chain.mjs            (promote; deterministic, offline)
//
// The intake is data/intake/bitter-struggle-chain/bitter-struggle-chain.json, drafted and read by the
// supervising session on 12 November 2026: pages[] in the shape of the lens-hunt intake (one per source
// page, each with the new surfaces it supports and their participants, each participant with the
// `shown` words), with three additions its rulings explain: a page's source_class (register, official,
// first_party or reported); three reported statuses with evidence class reported; and a participant's
// own time_start and/or time_end, the dates the source states for that person's role, which the
// participation row carries (otherwise the row takes the surface dates). Lines the evidence supports
// but this pass does not enter are the candidate graph of the research batch,
// contributions/inbox/research-batches/2026-11-12-bitter-struggle-chain/, not ledger rows.
//
// --fetch archives each source page once under receipts/bitter-struggle/ with the receipt contract's
// canonical hash and writes one record per page to
// data/ledger/staging/bitter-struggle-chain/archived-receipts.jsonl, with the lens-hunt lane's machinery
// (tools/lib/intake-page-lane.mjs): a page the ledger already holds an in-repo copy of is not archived
// again (its receipt is reused); requests are paced per host; a page whose host refuses a direct fetch
// is taken from its closest Wayback snapshot; the one PDF (the OSTP staff list) gets a pdftotext extract
// beside it so names can be checked offline.
//
// Promote mode is offline and deterministic and applies the lens-hunt lane's admission rule:
//   - a participant is admitted only when the archived copy of the page shows its `shown` words (text
//     compared with markup stripped, entities decoded, whitespace collapsed and curly quotes folded,
//     ignoring letter case, as whole words);
//   - a surface is admitted only when its receipt satisfies the live receipt contract, at least one
//     participant is admitted, and it is not a second copy of an event the ledger already holds (every
//     admitted person already on one ledger surface with the same dates);
//   - everything refused goes to gaps.jsonl with the reason and the would-be rows.
// A participant with a null ledger_id resolves against the canonical actors, organisations, their
// aliases and the alias registry, as the lens-hunt lane resolves, or is minted. The organisations this
// pass may mint are listed below (MINT_ORGS) with the aliases they are known by, each checked against
// the ledger first; any other unresolved organisation stops the run. Every minted person carries a
// short plain.who / plain.why_here (PLAIN) drawn from the surface it enters on. Labels that resolve to
// an existing record are listed in summary.json for a reader to confirm.
// Every new surface is hop_eligible false (entered_2026_11_12_pending_hop_review): no Clifford number
// moves in this pass; which surfaces become hop bases is the owner's decision.
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';
import {
  splitUrls, urlKey, isSec, heldPageCopies, createPageArchiver,
  kebab, uniq, norm, entityKey, fold, readArchivedText, showsWords,
} from './lib/intake-page-lane.mjs';

const LANE = 'bitter-struggle-chain';
const TOOL = 'tools/promote-intake-bitter-struggle-chain.mjs';
const INTAKE = 'data/intake/bitter-struggle-chain/bitter-struggle-chain.json';
const BATCH = 'contributions/inbox/research-batches/2026-11-12-bitter-struggle-chain/';
const STORE = 'receipts/bitter-struggle';
const OUT = 'data/ledger/staging/bitter-struggle-chain';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const ID_PREFIX = 'bsc-';
const TIMEOUT_S = 60;
const HOP_REFUSAL = 'entered_2026_11_12_pending_hop_review';
const DRAFTED_SENTENCE = 'Drafted and read by the supervising session on 12 November 2026 in the trace of the Bitter Struggle chain, and admitted on the archived page showing the names, pending a reader.';

// A page's source class gives its receipt's source type and the evidence class its surfaces must carry.
const SOURCE_CLASS = {
  register: { source_type: 'official_public_register', evidence_class: 'official' },
  official: { source_type: 'official_public_record', evidence_class: 'official' },
  first_party: { source_type: 'first_party_publication', evidence_class: 'primary_public' },
  reported: { source_type: 'press_report', evidence_class: 'reported' },
};

// ---------------------------------------------------------------- organisations this pass may mint
// Keyed by the intake label. Each is minted only when neither its label nor any alias names an existing
// organisation (canonical label, an organisation's own aliases, or data/canonical/aliases.json).
const MINT_ORGS = {
  'Inherent Laboratories Ltd': { id: 'inherent-laboratories-ltd', label: 'Inherent Laboratories Ltd', kind: 'company', company_number: '16968849', aliases: ['Inherent'] },
  'Index Ventures': { id: 'index-ventures', label: 'Index Ventures', kind: 'fund', aliases: [] },
  Crown: { id: 'crown-penguin-random-house-imprint', label: 'Crown (Penguin Random House imprint)', kind: 'company', aliases: ['Crown'] },
  'U.S. AI Safety Institute': { id: 'us-ai-safety-institute', label: 'U.S. AI Safety Institute', kind: 'agency', aliases: ['US AISI', 'CAISI', 'Center for AI Standards and Innovation'] },
  'National Institute of Standards and Technology': { id: 'national-institute-of-standards-and-technology', label: 'National Institute of Standards and Technology', kind: 'agency', aliases: ['NIST'] },
  'Office of Science and Technology Policy': { id: 'office-of-science-and-technology-policy', label: 'Office of Science and Technology Policy', kind: 'office', aliases: ['OSTP'] },
  'Advisory Committee on Business Appointments': { id: 'advisory-committee-on-business-appointments', label: 'Advisory Committee on Business Appointments', kind: 'public_body', aliases: ['ACOBA'] },
  'US General Services Administration': { id: 'us-general-services-administration', label: 'US General Services Administration', kind: 'agency', aliases: ['GSA'] },
  'Anthropic Long-Term Benefit Trust': { id: 'anthropic-long-term-benefit-trust', label: 'Anthropic Long-Term Benefit Trust', kind: 'organization', aliases: ['Long-Term Benefit Trust'] },
};

// ---------------------------------------------------------------- people this pass may mint
// Keyed by the intake label: who the record says the person is, and why the person is in the ledger,
// from the surfaces named in `on` (their receipts are the plain record's receipt_ids).
const READOUT = 'the official readout of the White House meeting with AI company chief executives on 4 May 2023';
const READOUT_WHY = 'A listed participant of the White House meeting with the chief executives of Anthropic, Google, Microsoft and OpenAI on 4 May 2023; a readout lists participants and topics, not what each said.';
const COUNCIL = 'anthropic-national-security-public-sector-advisory-council-2025-08-27';
const COUNCIL_WHO = 'An inaugural member of Anthropic\'s National Security and Public Sector Advisory Council, as Anthropic announced on 27 August 2025.';
const COUNCIL_WHY = 'Named in Anthropic\'s announcement of the council\'s eleven inaugural members, former senators, officials and agency heads; the announcement does not state members\' terms or compensation.';
const ENDORSE = 'bitter-struggle-printed-endorsements-2026-11-10';
const ENDORSE_WHY = 'One of six people whose praise the publisher prints for The Bitter Struggle (Ben Buchanan and Tantum Collins, Crown, 10 November 2026); a printed endorsement shows praise for the book, not any other tie to the authors.';
const WH = 'white-house-meeting-ai-ceos-2023-05-04';
const LTBT = 'anthropic-long-term-benefit-trust-initial-trustees-2023-09-19';
const INHERENT = 'inherent-seed-round-founders-and-advisor-index-ventures-2026-05-31';
const INHERENT_WHY = 'Index Ventures\' post announcing its lead of Inherent\'s $50m seed round, with Radical Ventures, names the co-founders Tantum Collins, Edward Hughes, Louis Kirsch and Kaloyan Aleksiev, and Matt Clifford as an advisor to the company.';
const PLAIN = {
  'Ben Buchanan': { on: ['bitter-struggle-co-authorship-2026-11-10', 'ostp-staff-list-ben-buchanan-2023-10-02'],
    who: 'Co-author of The Bitter Struggle (Crown, 10 November 2026), whom his publisher describes as the first White House Special Advisor for Artificial Intelligence and currently an advisor to Anthropic.',
    why_here: 'Named as co-author with Tantum Collins on the publisher\'s title page, which gives his current Anthropic advisory affiliation without dates or terms; the OSTP staff list of 2 October 2023 gives his title as Assistant Director for Cybersecurity and Artificial Intelligence.' },
  'Tantum Collins': { on: ['bitter-struggle-co-authorship-2026-11-10', 'inherent-laboratories-ltd-director-tantum-collins-2026-01-16', INHERENT],
    who: 'Co-author of The Bitter Struggle (Crown, 10 November 2026), whom his publisher describes as having served on the National Security Council after five years at Google DeepMind.',
    why_here: 'Named as co-author on the publisher\'s title page. Companies House records him as director of Inherent Laboratories Ltd from its incorporation on 16 January 2026, and Index Ventures, announcing its lead of Inherent\'s seed round on 31 May 2026, names him a co-founder and Matt Clifford an advisor to the company.' },
  'Graham Allison': { on: [ENDORSE], who: 'Douglas Dillon Professor of Government at Harvard Kennedy School, as the publisher prints his title.', why_here: ENDORSE_WHY },
  'Jake Sullivan': { on: [ENDORSE, WH], who: 'Former U.S. national security advisor, as the publisher prints his title; listed as National Security Advisor in ' + READOUT + '.',
    why_here: 'One of six people whose praise the publisher prints for The Bitter Struggle, and a listed participant of the White House meeting with the chief executives of Anthropic, Google, Microsoft and OpenAI on 4 May 2023.' },
  'Susan Rice': { on: [ENDORSE, WH], who: 'Former U.S. national security advisor and domestic policy advisor, as the publisher prints her title; listed as Domestic Policy Advisor in ' + READOUT + '.',
    why_here: 'One of six people whose praise the publisher prints for The Bitter Struggle (as Susan E. Rice), and a listed participant of the White House meeting with the chief executives of Anthropic, Google, Microsoft and OpenAI on 4 May 2023.' },
  'Tristan Harris': { on: [ENDORSE], who: 'Cofounder of the Center for Humane Technology, as the publisher prints his title.', why_here: ENDORSE_WHY },
  'Ben Rhodes': { on: [ENDORSE], who: 'Former U.S. deputy national security adviser, as the publisher prints his title.', why_here: ENDORSE_WHY },
  'Chris Miller': { on: [ENDORSE], who: 'Author of Chip War, as the publisher prints his title.', why_here: ENDORSE_WHY },
  'Edward Hughes': { on: [INHERENT], who: 'A co-founder of Inherent, as its lead investor Index Ventures names him on 31 May 2026.', why_here: INHERENT_WHY },
  'Louis Kirsch': { on: [INHERENT], who: 'A co-founder of Inherent, as its lead investor Index Ventures names him on 31 May 2026.', why_here: INHERENT_WHY },
  'Kaloyan Aleksiev': { on: [INHERENT], who: 'A co-founder of Inherent, as its lead investor Index Ventures names him on 31 May 2026.', why_here: INHERENT_WHY },
  'Daisy McGregor': { on: ['dsit-business-appointment-daisy-mcgregor-to-anthropic-2025-03-18'],
    who: 'Former DSIT Deputy Director for AI International Policy who joined Anthropic\'s External Affairs team in London, as DSIT\'s business appointment record gives it.',
    why_here: 'DSIT\'s record dates her departure from the Civil Service on 28 February 2025, fifteen days after the department signed its memorandum of understanding with Anthropic, and her new appointment from 18 March 2025, with conditions attached.' },
  'James Lowe': { on: ['dsit-business-appointment-james-lowe-to-anthropic-2025-12-02'],
    who: 'Former DSIT Head of AI Engineering who joined Anthropic as a Member of Technical Staff, as DSIT\'s business appointment record gives it.',
    why_here: 'DSIT\'s record dates his departure from the Civil Service on 1 December 2025 and his start at Anthropic the next day, with conditions attached.' },
  'Rishi Sunak': { on: ['acoba-advice-rishi-sunak-anthropic-senior-advisor-2025-10-09'],
    who: 'Former UK Prime Minister, now a paid, part-time Senior Advisor to Anthropic PBC.',
    why_here: 'ACOBA\'s advice of 9 October 2025 records the appointment and its conditions for two years from his last day in office; it records one meeting with Anthropic in office, a May 2023 roundtable that included Dario Amodei.' },
  'Liam Booth-Smith': { on: ['acoba-advice-liam-booth-smith-anthropic-external-affairs-2025-06-24'],
    who: 'Former Chief of Staff at No.10 Downing Street (Lord Booth-Smith), now in a paid, full-time External Affairs role at Anthropic PBC.',
    why_here: 'ACOBA\'s advice of 24 June 2025 records the role and its conditions; it records that he observed the then Prime Minister\'s May 2023 meeting with the chief executives of OpenAI, DeepMind and Anthropic.' },
  'Peter Kyle': { on: ['uk-anthropic-memorandum-of-understanding-ai-opportunities-2025-02-13'],
    who: 'Secretary of State for Science, Innovation and Technology, who signed the UK\'s memorandum of understanding with Anthropic for DSIT.',
    why_here: 'The GOV.UK memorandum page names him and Dario Amodei as its signatories on 13 February 2025; a memorandum states intent and commits no money.' },
  'Dario Amodei': { on: ['uk-anthropic-memorandum-of-understanding-ai-opportunities-2025-02-13', WH],
    who: 'Chief Executive of Anthropic, who signed the UK\'s memorandum of understanding on AI opportunities for the company.',
    why_here: 'Signed the memorandum for Anthropic on 13 February 2025, with Peter Kyle for DSIT, and is a listed participant of the White House meeting with AI company chief executives on 4 May 2023.' },
  'Elizabeth Kelly': { on: ['us-aisi-memoranda-anthropic-openai-2024-08-29'],
    who: 'Director of the U.S. AI Safety Institute when NIST announced the institute\'s agreements with Anthropic and OpenAI on 29 August 2024.',
    why_here: 'Quoted in NIST\'s release of the agreements, which give the institute access to the companies\' major new models before and after public release.' },
  'Kamala Harris': { on: [WH], who: 'Vice President of the United States, who convened the White House meeting with AI company chief executives on 4 May 2023.', why_here: READOUT_WHY },
  'Gina Raimondo': { on: [WH], who: `Secretary of Commerce, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Arati Prabhakar': { on: [WH], who: `Director of the Office of Science and Technology Policy, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Jeff Zients': { on: [WH], who: `White House Chief of Staff, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Bruce Reed': { on: [WH], who: `White House Deputy Chief of Staff, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Mike Donilon': { on: [WH], who: `Senior Advisor to the President, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Lael Brainard': { on: [WH], who: `Director of the National Economic Council, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Stuart Delery': { on: [WH], who: `White House Counsel, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Sam Altman': { on: [WH], who: `Chief Executive of OpenAI, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Satya Nadella': { on: [WH], who: `Chairman and Chief Executive of Microsoft, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Sundar Pichai': { on: [WH], who: `Chief Executive of Google and Alphabet, as listed in ${READOUT}.`, why_here: READOUT_WHY },
  'Roy Blunt': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'David S. Cohen': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Richard Fontaine': { on: [COUNCIL], who: `${COUNCIL_WHO.slice(0, -1)}; the announcement describes him as a member of Anthropic's Long-Term Benefit Trust.`, why_here: COUNCIL_WHY },
  'Christopher Fonzone': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Lisa E. Gordon-Hagerty': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Josh Hodges': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Jill M. Hruby': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Mike Kuiken': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Dave Luber': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Patrick M. Shanahan': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Jon Tester': { on: [COUNCIL], who: COUNCIL_WHO, why_here: COUNCIL_WHY },
  'Jason Matheny': { on: [LTBT], who: 'CEO of the RAND Corporation when Anthropic named him an initial trustee of its Long-Term Benefit Trust on 19 September 2023.',
    why_here: 'Anthropic\'s Trust page lists him among the initial trustees and records that he stepped down in December 2023.' },
  'Kanika Bahl': { on: [LTBT], who: 'CEO and President of Evidence Action when Anthropic named her an initial trustee of its Long-Term Benefit Trust on 19 September 2023.',
    why_here: 'Anthropic\'s Trust page lists her among the initial trustees and records that she stepped down in January 2026.' },
  'Neil Buddy Shah': { on: [LTBT, 'anthropic-ltbt-appoints-mariano-florentino-cuellar-2026-01-21'],
    who: 'CEO of the Clinton Health Access Initiative and Chair of Anthropic\'s Long-Term Benefit Trust.',
    why_here: 'Named an initial trustee and the Trust\'s Chair on 19 September 2023, and quoted as Chair when the Trust appointed Mariano-Florentino Cuellar on 21 January 2026.' },
  'Zach Robinson': { on: [LTBT], who: 'Interim CEO of Effective Ventures US when Anthropic named him an initial trustee of its Long-Term Benefit Trust on 19 September 2023.',
    why_here: 'Anthropic\'s Trust page lists him among the initial trustees and records that he stepped down in January 2026.' },
  'Mariano-Florentino Cuellar': { on: ['anthropic-ltbt-appoints-mariano-florentino-cuellar-2026-01-21', 'anthropic-chief-global-affairs-officer-mariano-florentino-cuellar-2026-08-04', 'matt-clifford-anthropic-managing-director-international-affairs-reported-2026-09-02'],
    who: 'Anthropic\'s Chief Global Affairs Officer from August 2026; formerly President of the Carnegie Endowment for International Peace and a trustee of Anthropic\'s Long-Term Benefit Trust.',
    why_here: 'The Trust appointed him a trustee on 21 January 2026 while he led Carnegie; Anthropic announced on 4 August 2026 that he had stepped down from the Trust to join the company, and told The Stack in September 2026 that Matt Clifford reports to him.' },
  'Chris Liddell': { on: ['anthropic-board-chris-liddell-2026-02-13'], who: 'Director of Anthropic, appointed to its board on 13 February 2026.',
    why_here: 'Anthropic\'s announcement of the board appointment; his earlier offices, as reported, are not verified here.' },
  'Ben Bernanke': { on: ['anthropic-ltbt-appoints-ben-bernanke-2026-07-09'], who: 'Former chair of the Federal Reserve, appointed a trustee of Anthropic\'s Long-Term Benefit Trust on 9 July 2026.',
    why_here: 'Anthropic\'s announcement of the Trust\'s appointment of a former Federal Reserve chair.' },
  'Pip White': { on: ['dsit-selects-anthropic-gov-uk-assistant-2026-01-27'], who: 'Anthropic\'s Head of UK, Ireland and Northern Europe, quoted in its announcement of 27 January 2026.',
    why_here: 'Quoted when Anthropic said DSIT had selected it to help build and pilot an AI assistant for GOV.UK, building on the February 2025 memorandum; no departmental award notice was found.' },
};

const intake = readJson(INTAKE);
const pages = intake.pages.filter(p => (p.surfaces ?? []).length);
const ledgerReceiptsAll = readJsonl('data/ledger/receipts.jsonl');
const heldCopies = heldPageCopies(ledgerReceiptsAll, LANE);

// One source per distinct page URL the intake names, in intake order.
function receiptIdFor(u) {
  const x = new URL(u);
  const host = x.hostname.toLowerCase().replace(/^www\./, '');
  const segs = x.pathname.split('/').filter(Boolean);
  const stem = (segs.at(-1) ?? '').replace(/\.[a-z0-9]{2,5}$/i, '');
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
  const archiver = createPageArchiver({ tmpPrefix: 'bitter-struggle-archive-', timeoutS: TIMEOUT_S });
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
      notes: `Archived ${arc.retrieved_at} by ${TOOL} --fetch for the entry of the Bitter Struggle chain.${arc.archive.wayback_ref ? ' The stored copy is a Wayback snapshot body because the source refuses automated fetches.' : ''}`,
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
      notes: `${s.notes.trim()} ${DRAFTED_SENTENCE}`,
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
if (surfaces.some(s => s.hop_eligible !== false)) throw new Error('every surface of this lane must be hop_eligible false');
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
  decision: { date: intake.decision.date, decided_by: 'owner', words: intake.decision.owner_words, pasted_review: intake.decision.owner_pasted_review },
  sources: {
    manifest: MANIFEST, store: STORE, pages: sources.size,
    archived: [...manifest.values()].filter(r => r.status === 'archived').length,
    via_wayback: [...manifest.values()].filter(r => r.status === 'archived' && r.archive?.wayback_ref).map(r => r.receipt_id),
    reused_ledger_receipts: reusedReceipts,
    failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
    not_archived: [...manifest.values()].filter(r => r.status === 'not_archived').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })),
  },
  admission_rule: 'A participant is admitted only when the archived copy of its page shows its shown words (text compared with markup stripped, entities decoded, whitespace collapsed and curly quotes folded, ignoring letter case, as whole words); a surface only when its receipt satisfies the live receipt contract, at least one participant is admitted and it is not a second copy of an event the ledger already holds (every admitted person already on one ledger surface with the same dates). A participation row carries the dates the source states for the person\'s role when the intake gives them, otherwise the surface dates. Every surface is hop_eligible false pending the owner\'s decision on hop bases. Everything refused goes to gaps.jsonl.',
  counts,
  gap_reasons: Object.fromEntries(Object.entries(reasons).sort(([a], [b]) => a.localeCompare(b))),
  resolved_to_existing_records: resolvedOut,
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length, reused_receipts: reusedReceipts.length,
    new_actors: actorsOut.length, new_organizations: orgsOut.length, gaps: gaps.length, hop_eligible_surfaces: 0,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-bitter-struggle-chain: ${surfaces.length} surfaces (0 hop-eligible), ${participation.length} participation rows, ${receipts.length} new receipts + ${reusedReceipts.length} reused, ${actorsOut.length} actors, ${orgsOut.length} organizations staged; ${resolvedOut.length} labels resolved to existing records; ${gaps.length} gaps.`);
