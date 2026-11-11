#!/usr/bin/env node
// SEC Form D lane: the Form D and D/A notices that tie to organisations and people the ledger
// already holds (owner decision 2026-11-10, "Yes, one pass"). Archive the filings, then stage rows.
//
//   node tools/promote-intake-sec-form-d.mjs --fetch [--refresh] [--from-cache <dir>]
//   node tools/promote-intake-sec-form-d.mjs            (promote; deterministic, offline)
//
// The targets are data/intake/sec-form-d/sec-form-d-targets.json: one entry per filing (accession,
// CIK, filing date, issuer, the ledger organisation it ties to with match exact or family, and the
// ledger people named on it as related persons). Nothing outside that list is entered.
//
// --fetch archives each target's primary_doc.xml under receipts/sec-form-d/, hashing the stored
// file with the receipt contract's canonical hash, and writes one record per filing to
// data/ledger/staging/sec-form-d/archived-receipts.jsonl. Requests carry the project's declared SEC
// User-Agent (the same SEC_UA as tools/promote-intake-capital-factory.mjs) and are paced to about one
// per second. --from-cache <dir> takes <dir>/<accession>.xml, fetched earlier from the same public
// URL with the same User-Agent, as the fetched body instead of requesting it again; the receipt
// still records the public URL and hashes the stored copy. A filing already archived with a matching
// hash is not refetched unless --refresh. Retrieval days are the operator's local calendar day.
//
// Promote mode reads only the intake, that manifest and the archived copies, and writes the lane's
// surfaces.jsonl, participation.jsonl, receipts.jsonl, actors.json, organizations.json, gaps.jsonl
// and summary.json. tools/merge-staging.mjs appends the lane into data/ledger and the registries.
//
// One surface per filing, sec-form-d-<accession>, in the shape of the Capital Factory lane's Form D
// surfaces (status official_form_d_notice, dated by the SEC filing date, everything else parsed from
// the archived XML). Rows:
//   - the issuer: on the ledger organisation when the target's match is exact (role says how it is
//     filed); when the match is family the issuer is its own entity (minted fund or company, as the
//     Capital Factory lane decides) and the ledger organisation gets a name-based link row;
//   - each ledger person the target names: a related-person row on that ledger actor, admitted only
//     when the archived XML lists that related person, with a note when the filed name differs.
// Nobody else gets a row: other related persons, related entities and signers are named in the
// surface note only. Every surface is hop_eligible false (entered_2026_11_10_pending_hop_review):
// no Clifford number moves until a reader reviews these filings.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readJson, readJsonl, writeJson, writeJsonl, slug } from './lib/ledger.mjs';
import { canonicalReceiptHash } from './lib/receipt-archival.mjs';
import { checkReceiptContract, MIN_LIMITS_LENGTH } from './lib/receipt-contract.mjs';

const LANE = 'sec-form-d';
const TOOL = 'tools/promote-intake-sec-form-d.mjs';
const INTAKE = 'data/intake/sec-form-d/sec-form-d-targets.json';
const STORE = 'receipts/sec-form-d';
const OUT = 'data/ledger/staging/sec-form-d';
const MANIFEST = `${OUT}/archived-receipts.jsonl`;
const SEC_UA = process.env.SEC_UA ?? 'clifford-number-research/1.0 public-records research noreply@clifford-number.invalid';
const TIMEOUT_S = 30;
const ENTERED = '2026-11-10';
const HOP_REFUSAL = 'entered_2026_11_10_pending_hop_review';
const LIMITS = 'A Form D is a notice of an exempt securities offering filed by the issuer; it reports the offering amount, amount sold, related persons and signer as of filing, is not reviewed by the SEC for accuracy, and does not show investors, investment terms, portfolio holdings or later events.';

const intake = readJson(INTAKE);
const targets = [...intake.filings].sort((a, b) => a.filed.localeCompare(b.filed) || a.accession.localeCompare(b.accession));
const receiptIdOf = t => `sec-form-d-${t.accession}`;
const urlOf = t => `https://www.sec.gov/Archives/edgar/data/${String(Number(t.cik))}/${t.accession.replace(/-/g, '')}/primary_doc.xml`;
const readManifest = () => new Map((fs.existsSync(path.join(root, MANIFEST)) ? readJsonl(MANIFEST) : []).map(r => [r.receipt_id, r]));
const localDay = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const isoUtc = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

// =============================================================== fetch mode
function fetchMode(args) {
  const REFRESH = args.includes('--refresh');
  const CACHE = args.includes('--from-cache') ? args[args.indexOf('--from-cache') + 1] : null;
  if (LIMITS.length < MIN_LIMITS_LENGTH) throw new Error('limits too short');
  const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let lastHit = 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-form-d-'));
  const curl = url => {
    const wait = lastHit + 1100 - Date.now();
    if (wait > 0) sleep(wait);
    lastHit = Date.now();
    const body = path.join(tmp, 'body');
    if (fs.existsSync(body)) fs.rmSync(body);
    try {
      const meta = execFileSync('curl', ['-sS', '-L', '--max-redirs', '10', '--max-time', String(TIMEOUT_S), '-A', SEC_UA,
        '-H', 'Accept: application/xml,text/xml;q=0.9,*/*;q=0.5', '--compressed', '-o', body, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const [status, contentType, finalUrl] = meta.split('\t');
      return { ok: true, status: Number(status), contentType: (contentType || '').trim(), finalUrl, bytes: fs.existsSync(body) ? fs.readFileSync(body) : Buffer.alloc(0) };
    } catch (err) {
      return { ok: false, error: String(err.stderr || err.message).trim().split('\n').pop().slice(0, 200) };
    }
  };
  const notFormD = bytes => {
    const head = bytes.subarray(0, 4000).toString('utf8');
    if (bytes.length < 200) return 'empty_or_truncated_body';
    if (/Undeclared Automated Tool|Request Rate Threshold Exceeded/i.test(head)) return 'sec_automated_tool_refusal';
    if (!/<edgarSubmission>/.test(bytes.toString('utf8'))) return 'not_a_form_d_xml';
    return null;
  };
  const manifest = readManifest();
  fs.mkdirSync(path.join(root, STORE), { recursive: true });
  let fetched = 0; let cached = 0; let kept = 0;
  for (const t of targets) {
    const id = receiptIdOf(t);
    const url = urlOf(t);
    const prev = manifest.get(id);
    if (!REFRESH && prev?.status === 'archived' && fs.existsSync(path.join(root, prev.path))
        && `sha256:${canonicalReceiptHash(path.join(root, prev.path))}` === prev.archive.ref) { kept += 1; continue; }
    const base = { receipt_id: id, source_url: url, fetch_url: url };
    let bytes; let status = null; let contentType = 'text/xml'; let finalUrl = url; let at; let via;
    const cacheFile = CACHE ? path.join(CACHE, `${t.accession}.xml`) : null;
    if (cacheFile && fs.existsSync(cacheFile)) {
      bytes = fs.readFileSync(cacheFile);
      at = fs.statSync(cacheFile).mtime;
      via = 'cache';
    } else {
      const res = curl(url);
      at = new Date();
      if (!res.ok || res.status >= 400) {
        manifest.set(id, { ...base, attempted_at: isoUtc(at), status: 'failed', reason: res.ok ? `http_${res.status}` : `fetch_error: ${res.error}`, http_status: res.status ?? null });
        console.log(`failed   ${id}`);
        continue;
      }
      ({ bytes, status, finalUrl } = res);
      contentType = res.contentType || contentType;
      via = 'fetch';
    }
    const why = notFormD(bytes);
    if (why) {
      manifest.set(id, { ...base, attempted_at: isoUtc(at), status: 'failed', reason: why, http_status: status });
      console.log(`failed   ${id} ${why}`);
      continue;
    }
    const rel = `${STORE}/${id}.xml`;
    fs.writeFileSync(path.join(root, rel), bytes);
    const sha = canonicalReceiptHash(path.join(root, rel));
    const day = localDay(at);
    manifest.set(id, {
      ...base, attempted_at: isoUtc(at), status: 'archived', path: rel, retrieved_at: day, retrieved_at_utc: isoUtc(at), http_status: status,
      final_url: finalUrl, content_type: contentType, content_bytes: bytes.length, content_sha256: sha,
      archive: {
        method: 'in_repo_content_hash', ref: `sha256:${sha}`, captured: day, checked: day, fetched_url: url, content_type: contentType, bytes: bytes.length,
        note: via === 'cache'
          ? 'Body fetched from the public URL with the project\'s declared SEC User-Agent and taken as the fetched body; hash covers the in-repository copy (text line endings normalised to LF for hashing).'
          : 'Hash covers the in-repository copy of the source body as fetched with the project\'s declared SEC User-Agent (text line endings normalised to LF for hashing).',
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
const kebab = s => slug(String(s ?? '').replace(/_/g, '-'));
const uniq = xs => [...new Set(xs)];
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
// Legal-form spellings vary across filings (L.L.C., LLC, L.P., LP); one entity, one id.
const entityKey = s => norm(String(s).replace(/\bL\.\s?L\.\s?C\.?/gi, 'LLC').replace(/\bL\.\s?P\.?(?=\s|$|,)/gi, 'LP').replace(/\bLtd\.?/gi, 'Ltd'));
const usd = n => (n == null ? null : `$${Number(n).toLocaleString('en-US')}`);

// ---------------------------------------------------------------- canonical state
// Rows this lane already merged are not "existing state": a rerun after a merge restages them
// identically and merge-staging skips them as already present.
const canonActors = readJson('data/canonical/actors.json').actors.filter(a => a.source !== LANE);
const canonOrgs = readJson('data/canonical/organizations.json').organizations.filter(o => o.source !== LANE);
const surfaceTypes = new Set(readJson('data/canonical/surface-types.json').surface_types.map(t => t.id));
const ledgerSurfaceIds = new Set(readJsonl('data/ledger/surfaces.jsonl').filter(s => s.intake_source !== LANE).map(s => s.surface_id));
const ledgerReceipts = new Map(readJsonl('data/ledger/receipts.jsonl').filter(r => r.intake_source !== LANE).map(r => [r.receipt_id, r]));
const canonOrgByKey = new Map(canonOrgs.map(o => [entityKey(o.label), o]));
const canonOrgById = new Map(canonOrgs.map(o => [o.id, o]));
const canonActorById = new Map(canonActors.map(a => [a.id, a]));
const canonAliases = readJson('data/canonical/aliases.json').aliases;
const orgAlias = new Map(canonAliases.filter(x => x.kind === 'organization' && canonOrgById.has(x.canonical_id)).map(x => [entityKey(x.alias), x.canonical_id]));

const newOrgs = new Map();
const newOrgByKey = new Map();
function ensureOrg(label, kind) {
  const key = entityKey(label);
  if (canonOrgByKey.has(key)) return canonOrgByKey.get(key).id;
  if (orgAlias.has(key)) return orgAlias.get(key);
  if (newOrgByKey.has(key)) return newOrgByKey.get(key);
  const id = kebab(String(label).replace(/\bL\.\s?L\.\s?C\.?/gi, 'LLC').replace(/\bL\.\s?P\.?(?=\s|$|,)/gi, 'LP'));
  if (canonOrgById.has(id)) return id;
  if (canonActorById.has(id)) throw new Error(`refusing to mint organization ${id}: the id already names an actor`);
  newOrgs.set(id, { id, label, kind, source: LANE });
  newOrgByKey.set(key, id);
  return id;
}

// ---------------------------------------------------------------- receipts
const manifest = readManifest();
const receiptState = new Map(); // receipt id -> { candidate, problems }
for (const t of targets) {
  const id = receiptIdOf(t);
  const arc = manifest.get(id);
  const problems = [];
  let candidate = null;
  if (!arc) problems.push('not_attempted');
  else if (arc.status !== 'archived') problems.push(`archive_attempt_failed: ${arc.reason}`);
  else {
    candidate = {
      receipt_id: id,
      label: `Form ${t.form} filed ${t.filed}: ${t.issuer}`,
      source_type: 'sec_edgar_record',
      evidence_class: 'official',
      publisher: 'U.S. Securities and Exchange Commission (EDGAR)',
      source_published_at: t.filed,
      path: arc.path,
      source_url: urlOf(t),
      retrieved_at: arc.retrieved_at,
      content_sha256: arc.content_sha256,
      content_type: arc.content_type,
      content_bytes: arc.content_bytes,
      notes: `Archived ${arc.retrieved_at} by ${TOOL} --fetch.`,
      limits: LIMITS,
      archive: arc.archive,
      intake_source: LANE,
    };
    const { errors } = checkReceiptContract([candidate], { root });
    for (const e of errors) problems.push(`receipt_contract_${e.check}: ${e.message}`);
    if (ledgerReceipts.has(id)) problems.push('receipt_id_collides_with_existing_ledger_receipt');
  }
  receiptState.set(id, { candidate: problems.length ? null : candidate, problems });
}

// ---------------------------------------------------------------- Form D parsing (as the Capital Factory lane)
const xmlTag = (b, tag) => (new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(b)?.[1] ?? '').trim();
const ENTITY_RE = /\b(LLC|L\.L\.C\.?|Ltd\.?|L\.?P\.?|LP|Inc\.?|Fund|Group|Management|Partners)\b/i;
const unxml = s => String(s ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function relatedName(b) {
  const first = unxml(xmlTag(b, 'firstName')).replace(/^[.*\s]+/, '');
  const middle = unxml(xmlTag(b, 'middleName'));
  const last = unxml(xmlTag(b, 'lastName')).replace(/^[.*\s]+/, '');
  const firstNA = !first || first === 'N/A';
  if (/^(LLC|L\.L\.C\.?|Ltd\.?|L\.?P\.?|Inc\.?)$/i.test(first)) return { entity: true, label: `${last.replace(/,\s*$/, '')}, ${first}` };
  const full = [firstNA ? '' : first, middle && middle !== 'N/A' ? middle : '', last].filter(Boolean).join(' ').trim();
  if (firstNA || ENTITY_RE.test(full)) return { entity: true, label: full.replace(/^[.*\s]+/, '') };
  return { entity: false, label: `${first} ${last}`, full };
}
function parseFormD(xml) {
  const issuerBlock = xmlTag(xml, 'primaryIssuer');
  const offering = xmlTag(xml, 'offeringData');
  const num = v => (/^\d+(\.\d+)?$/.test(v) ? Number(v) : null);
  return {
    form: xmlTag(xml, 'submissionType'),
    cik: xmlTag(issuerBlock, 'cik'), issuer: unxml(xmlTag(issuerBlock, 'entityName')), entityType: xmlTag(issuerBlock, 'entityType'),
    jurisdiction: xmlTag(issuerBlock, 'jurisdictionOfInc'), city: unxml(xmlTag(xmlTag(issuerBlock, 'issuerAddress'), 'city')),
    industry: xmlTag(xmlTag(offering, 'industryGroup'), 'industryGroupType'), fundType: xmlTag(xmlTag(offering, 'investmentFundInfo'), 'investmentFundType'),
    firstSale: xmlTag(xmlTag(offering, 'dateOfFirstSale'), 'value') || (/<yetToOccur>true/.test(offering) ? 'yet to occur' : null),
    offered: xmlTag(xmlTag(offering, 'offeringSalesAmounts'), 'totalOfferingAmount'), sold: num(xmlTag(xmlTag(offering, 'offeringSalesAmounts'), 'totalAmountSold')),
    investors: num(xmlTag(xmlTag(offering, 'investors'), 'totalNumberAlreadyInvested')),
    minimum: num(xmlTag(offering, 'minimumInvestmentAccepted')),
    related: [...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/g)].map(m => ({
      ...relatedName(m[1]), relationships: [...m[1].matchAll(/<relationship>([^<]*)<\/relationship>/g)].map(x => x[1]), clarification: unxml(xmlTag(m[1], 'relationshipClarification')),
    })),
    signers: uniq([...xml.matchAll(/<nameOfSigner>([^<]*)<\/nameOfSigner>[\s\S]*?<signatureTitle>([^<]*)<\/signatureTitle>[\s\S]*?<signatureDate>([^<]*)<\/signatureDate>/g)]
      .map(m => JSON.stringify([unxml(m[1]).trim(), unxml(m[2]).trim(), m[3].trim()]))).map(s => JSON.parse(s)),
  };
}

// ---------------------------------------------------------------- accounting and staging
const gaps = [];
const counts = { filings_read: 0, filings_entered: 0, filings_refused: 0, issuer_rows: 0, name_link_rows: 0, ledger_person_rows: 0, ledger_people_read: 0, ledger_people_not_shown: 0 };
const refuse = (rowKey, reason, detail = {}) => gaps.push({ lane: LANE, table: 'form_d', row_key: rowKey, reason, ...detail });
const surfaces = [];
const participation = [];
const cited = new Map();

const parsed = [];
for (const t of targets) {
  counts.filings_read += 1;
  const id = receiptIdOf(t);
  const st = receiptState.get(id);
  if (!st.candidate) {
    counts.filings_refused += 1;
    refuse(id, st.problems.some(p => p.startsWith('archive_attempt_failed') || p === 'not_attempted') ? 'receipt_archive_unresolved' : 'receipt_not_admissible',
      { receipt_failures: [{ receipt_id: id, problems: st.problems }], candidate: { accession: t.accession, issuer: t.issuer, organizations: t.organizations, ledger_people: t.ledger_people } });
    continue;
  }
  const xml = fs.readFileSync(path.join(root, st.candidate.path), 'utf8');
  const f = parseFormD(xml);
  if (String(Number(f.cik)) !== String(Number(t.cik))) throw new Error(`${id}: archived issuer CIK ${f.cik} is not the target's ${t.cik}`);
  parsed.push({ t, f, id });
}
// Amendments restate cumulative amounts sold; only the latest filing per issuer in this lane carries a
// funding figure, so lane totals do not double count an offering.
const latestByIssuer = new Map();
for (const { t, f } of parsed) latestByIssuer.set(String(Number(f.cik)), t.accession);
// Surface labels derive the AXM entity id, so they must be unique: an issuer that filed more than one
// notice of the same form on the same day (Booz Allen Hamilton Holding Corp, 24 May 2010) gets the
// accession in each label.
const baseLabel = ({ t, f }) => `${f.issuer}: SEC Form ${f.form} filed ${t.filed}`;
const labelCount = new Map();
for (const x of parsed) labelCount.set(baseLabel(x).toLowerCase(), (labelCount.get(baseLabel(x).toLowerCase()) ?? 0) + 1);
const surfaceLabel = x => (labelCount.get(baseLabel(x).toLowerCase()) > 1 ? `${baseLabel(x)} (accession ${x.t.accession})` : baseLabel(x));

for (const { t, f, id } of parsed) {
  if (ledgerSurfaceIds.has(id)) throw new Error(`surface id collides with ledger: ${id}`);
  if (t.organizations.length !== 1) throw new Error(`${id}: expected one ledger organisation, got ${t.organizations.length}`);
  const tie = t.organizations[0];
  const ledgerOrg = canonOrgById.get(tie.ledger_id);
  if (!ledgerOrg) throw new Error(`${id}: ledger organisation ${tie.ledger_id} is not in data/canonical/organizations.json`);
  const isLatest = latestByIssuer.get(String(Number(f.cik))) === t.accession;
  const kind = /pooled investment fund/i.test(f.industry) ? 'fund' : 'company';
  const offered = /^\d+$/.test(f.offered) ? Number(f.offered) : null;
  const details = [f.entityType, f.jurisdiction, f.industry, f.fundType].filter(Boolean).join('; ');
  const funding = isLatest && f.sold != null
    ? { funding_amount_usd: f.sold, notes: `Total amount sold as of this filing (latest Form D for the issuer in this lane): ${usd(f.sold)} of ${offered != null ? usd(offered) : f.offered} offered; ${f.investors ?? 'unreported'} investors.` }
    : {};
  const day = t.filed;
  // Field order as the Capital Factory lane writes its rows.
  const row = ({ participant_type, actor_id, organization_id, role, participation_type, funding_amount_usd, notes }) => ({
    surface_id: id, participant_type, ...(actor_id ? { actor_id } : { organization_id }), role, participation_type,
    time_start: day, time_end: day, evidence_class: 'official', receipt_ids: [id],
    ...(funding_amount_usd != null ? { funding_amount_usd } : {}), ...(notes ? { notes } : {}),
  });
  const parts = [];
  if (tie.match === 'exact') {
    parts.push(row({ participant_type: 'organization', organization_id: ledgerOrg.id, role: `issuer, filed as ${f.issuer}${details ? ` (${details})` : ''}`, participation_type: 'form_d_issuer', ...funding }));
    counts.issuer_rows += 1;
  } else if (tie.match === 'family') {
    if (!norm(f.issuer).includes(norm(ledgerOrg.label))) throw new Error(`${id}: family issuer ${f.issuer} does not carry the name ${ledgerOrg.label}`);
    const issuerId = ensureOrg(f.issuer, kind);
    if (issuerId === ledgerOrg.id) throw new Error(`${id}: family issuer ${f.issuer} resolves to the ledger organisation itself`);
    parts.push(row({ participant_type: 'organization', organization_id: issuerId, role: `issuer${details ? ` (${details})` : ''}`, participation_type: 'form_d_issuer', ...funding }));
    parts.push(row({ participant_type: 'organization', organization_id: ledgerOrg.id, role: `name-based link: the issuer carries the name '${ledgerOrg.label}'; the filing does not show ownership or control by ${ledgerOrg.label}`, participation_type: 'name_based_affiliation' }));
    counts.issuer_rows += 1;
    counts.name_link_rows += 1;
  } else throw new Error(`${id}: unknown organisation match ${tie.match}`);

  const persons = f.related.filter(r => !r.entity);
  const entered = [];
  for (const lp of t.ledger_people) {
    counts.ledger_people_read += 1;
    const actor = canonActorById.get(lp.ledger_id);
    if (!actor) throw new Error(`${id}: ledger person ${lp.ledger_id} is not in data/canonical/actors.json`);
    const hit = persons.find(r => [r.label, r.full].filter(Boolean).some(n => norm(n) === norm(lp.as_filed)));
    if (!hit) {
      counts.ledger_people_not_shown += 1;
      gaps.push({ lane: LANE, table: 'form_d', row_key: `${id}:${lp.ledger_id}`, reason: 'ledger_person_not_a_related_person_in_archived_filing', receipts: [id], as_filed: lp.as_filed,
        candidate: { participant_type: 'actor', actor_id: lp.ledger_id, participation_type: 'form_d_related_person' } });
      continue;
    }
    const filedAs = hit.full ?? hit.label;
    parts.push(row({ participant_type: 'actor', actor_id: actor.id, role: `related person: ${hit.relationships.join(', ')}${hit.clarification ? ` (${hit.clarification})` : ''}`, participation_type: 'form_d_related_person',
      ...(filedAs !== actor.label ? { notes: `Filed as ${filedAs}.` } : {}) }));
    entered.push(actor.label);
    counts.ledger_person_rows += 1;
  }

  const tieNote = tie.match === 'exact'
    ? `The issuer row is on the ledger organisation ${ledgerOrg.label}.`
    : `The issuer is its own entity; ${ledgerOrg.label} has a name-based link row only.`;
  const basisNote = t.basis === 'issuer_carries_ledger_company_exact_name_identity_checked'
    ? ` The tie to ${ledgerOrg.label} is the exact company name, checked against what the ledger holds on ${ENTERED}: "${t.identity_basis}"`
    : ` Entered because the filing names ${entered.length ? entered.join(' and ') : t.ledger_people.map(p => p.label).join(' and ')} beside ${ledgerOrg.label}.`;
  const signers = f.signers.map(s => `${s[0]} (${s[1]})`);
  const surface = {
    surface_id: id,
    surface_label: surfaceLabel({ t, f }),
    surface_type: 'employment_investment_surface',
    secondary_surface_types: ['surface_factory_capital_layer'],
    hop_eligible: false,
    hop_refusal_reason: HOP_REFUSAL,
    scorable: true,
    status: 'official_form_d_notice',
    bounded_by: ['SEC Form D notice of exempt offering'],
    time_start: day,
    time_end: day,
    evidence_class: 'official',
    receipt_ids: [id],
    notes: `Form ${f.form} (accession ${t.accession}) for ${f.issuer}, ${f.city || 'address not parsed'}. Offering ${offered != null ? usd(offered) : f.offered || 'not stated'}; sold ${usd(f.sold) ?? 'not stated'}; investors ${f.investors ?? 'not stated'}; first sale ${f.firstSale ?? 'not stated'}${f.minimum != null ? `; minimum investment ${usd(f.minimum)}` : ''}. Related persons: ${f.related.map(r => r.label).join('; ') || 'none'}; signed by ${signers.join(', ') || 'unknown'}. Dated by the SEC filing date. Rows were entered for the issuer and for people already in the ledger; the other related persons, related entities and signers are named in this note only. ${tieNote}${basisNote} A Form D is a notice, not a registration; amounts are cumulative for the offering and amendments restate them. Entered ${ENTERED} on the owner's one-pass decision and kept out of hops until a reader reviews it.`,
    date_basis: 'sec_filing_date',
    sec_accession: t.accession,
    issuer_cik: f.cik,
    total_offering_amount_usd: offered,
    total_amount_sold_usd: f.sold,
    investors_count: f.investors,
    date_of_first_sale: f.firstSale,
    intake_basis: t.basis,
    intake_source: LANE,
    roster_entry_count: parts.length,
  };
  if (!surfaceTypes.has(surface.surface_type)) throw new Error(`unknown surface_type ${surface.surface_type}`);
  for (const s of surface.secondary_surface_types) if (!surfaceTypes.has(s)) throw new Error(`unknown secondary surface_type ${s}`);
  surfaces.push(surface);
  participation.push(...parts);
  cited.set(id, receiptState.get(id).candidate);
  counts.filings_entered += 1;
}

// =============================================================== write
surfaces.sort((a, b) => a.time_start.localeCompare(b.time_start) || a.surface_id.localeCompare(b.surface_id));
const order = new Map(surfaces.map((s, i) => [s.surface_id, i]));
participation.sort((a, b) => order.get(a.surface_id) - order.get(b.surface_id));
const receipts = [...cited.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id));
const usedOrgIds = new Set(participation.map(p => p.organization_id).filter(Boolean));
const orgsOut = [...newOrgs.values()].filter(o => usedOrgIds.has(o.id)).sort((a, b) => a.id.localeCompare(b.id));
const { errors: contractErrors } = checkReceiptContract(receipts, { root });
if (contractErrors.length) throw new Error(`staged receipts fail the receipt contract: ${contractErrors.map(e => `${e.receipt_id} ${e.message}`).join('; ')}`);
if (surfaces.some(s => s.hop_eligible !== false)) throw new Error('every surface of this lane must be hop_eligible false');

const fundingTotal = participation.reduce((n, p) => n + (p.funding_amount_usd ?? 0), 0);
writeJsonl(`${OUT}/surfaces.jsonl`, surfaces);
writeJsonl(`${OUT}/participation.jsonl`, participation);
writeJsonl(`${OUT}/receipts.jsonl`, receipts);
writeJson(`${OUT}/actors.json`, { actors: [] });
writeJson(`${OUT}/organizations.json`, { organizations: orgsOut });
writeJsonl(`${OUT}/gaps.jsonl`, gaps);
writeJson(`${OUT}/summary.json`, {
  lane: LANE,
  tool: TOOL,
  intake: INTAKE,
  decision: { date: ENTERED, decided_by: 'owner', words: 'Yes, one pass' },
  sources: { manifest: MANIFEST, store: STORE, targets: targets.length, archived: [...manifest.values()].filter(r => r.status === 'archived').length, failed: [...manifest.values()].filter(r => r.status === 'failed').map(r => ({ receipt_id: r.receipt_id, source_url: r.source_url, reason: r.reason })) },
  admission_rule: 'A filing is entered only when its archived primary_doc.xml satisfies the live receipt contract (public source URL, in-repo archived copy whose SHA-256 matches, limits). Rows go to the issuer (on the ledger organisation when the match is exact; on the issuer itself, with a name-based link row on the ledger organisation, when the match is family) and to each targeted ledger person only when the archived XML lists that person as a related person. Nobody else gets a row. Every surface is hop_eligible false pending a reader.',
  counts,
  staged: {
    surfaces: surfaces.length, participation: participation.length, receipts: receipts.length,
    new_actors: 0, new_organizations: orgsOut.length, gaps: gaps.length,
    hop_eligible_surfaces: 0, funding_amount_usd_total: fundingTotal,
  },
  hop_refusal_reason: HOP_REFUSAL,
});
console.log(`promote-intake-sec-form-d: ${surfaces.length} surfaces (0 hop-eligible), ${participation.length} participation rows, ${receipts.length} receipts, ${orgsOut.length} organizations staged; ${gaps.length} gaps; funding_amount_usd total ${fundingTotal}.`);
