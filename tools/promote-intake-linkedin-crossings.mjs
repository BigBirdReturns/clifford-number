#!/usr/bin/env node
/**
 * promote-intake-linkedin-crossings.mjs
 *
 * Stages LinkedIn role crossings (a public-employer role and a private role on
 * the same self-reported profile) into data/ledger/staging/linkedin-crossings/.
 * It does NOT merge into data/ledger.
 *
 * Inputs, in order of preference:
 *   - FULL set: data/intake/linkedin-targeted-review/full/linkedin-role-crossing-candidates.jsonl
 *     and .../full/linkedin-profile-role-claims.jsonl, with capture rows from
 *     receipts/linkedin-profile-captures/captures.jsonl (the in-repo PDF receipts).
 *   - Fallback: the 430-row review projection in data/intake/linkedin-targeted-review/.
 *
 * Every receipt resolves to the in-repo LinkedIn-generated profile PDF under
 * receipts/linkedin-profile-captures/raw/ (archive.method in_repo_content_hash,
 * SHA-256 of the file). Owner decision 2026-10-23: captured LinkedIn profiles are
 * public information and go into the repository as receipts; the owner's own
 * attention log (data/local/linkedin-attention*.jsonl) stays private and is never read here.
 *
 * Every staged row is a self-reported profile observation (evidence_class "reported").
 * Gates, applied in order, first failing gate recorded:
 *   1. publication_status   - review_projection, or private_intake captures cleared by the
 *                             2026-10-23 owner decision; held / redacted / do_not_publish etc. refused.
 *   2. receipt_roles        - both self_claimed_public_role and self_claimed_private_role.
 *   3. identity             - full displayed name (not a surname initial) + linkedin.com/in URL.
 *   4. receipt_source_url   - claims and capture exist; capture has a profile URL.
 *   5. receipt_archive      - the capture PDF is in the repo and its SHA-256 matches the capture row.
 *   6. review_warning       - a warning on either claim/capture whose disposition rejects it.
 *   7. extraction_quality   - organization/title field is a date, location, sentence fragment,
 *                             merged layout fields, truncated or shifted title, or not an organization.
 *   8. role_classification  - explicit public-employer allowlist (US departments, armed services,
 *                             Congress and its committees, federal agencies, NSC, White House,
 *                             UK MOD / No. 10 / departments, RAF ...). Everything else is private.
 *                             Exactly one side must be public. The private side is refused when it
 *                             is still visibly a public-sector body outside the allowlist (foreign or
 *                             state government, embassy, state university) or carries a government title.
 *   9. temporal_order       - start dates present and the order is decidable (not a same-year tie
 *                             with a year-only date).
 * Direction: public role starts first -> "public_to_private"; private role starts first ->
 * "private_to_public". Each also carries a temporal_state (sequence vs concurrent).
 * Repeated captures of the same profile yield the same crossing more than once; those are
 * collapsed onto the latest capture and counted, not refused.
 *
 * Usage: node tools/promote-intake-linkedin-crossings.mjs
 * Deterministic: output depends only on the intake files, the receipts and canonical registries.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intakeRel = 'data/intake/linkedin-targeted-review';
const intakeDir = path.join(root, intakeRel);
const fullDir = path.join(intakeDir, 'full');
const receiptsRel = 'receipts/linkedin-profile-captures';
const receiptsDir = path.join(root, receiptsRel);
const outDir = path.join(root, 'data/ledger/staging/linkedin-crossings');

const OWNER_DECISION = 'Owner decision 2026-10-23: captured LinkedIn profiles are public information and go into the repository as receipts; the only private material is the owner\'s own attention log (data/local/linkedin-attention*.jsonl), which stays out of the repo.';
const RECEIPT_LIMITS = 'A LinkedIn profile export is self-reported by the subject at capture time; it does not verify employment, dates or titles against official records, and does not establish influence, a procurement role, coordination or wrongdoing. The live profile may have changed since capture.';

const readJsonlAt = file => fs.readFileSync(file, 'utf8')
  .split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
const readJsonl = file => readJsonlAt(path.join(intakeDir, file));
const sha256Buf = buf => crypto.createHash('sha256').update(buf).digest('hex');
const sha256File = file => sha256Buf(fs.readFileSync(file));

// ── inputs ───────────────────────────────────────────────────────────────────
const fullCandidatesFile = path.join(fullDir, 'linkedin-role-crossing-candidates.jsonl');
const fullClaimsFile = path.join(fullDir, 'linkedin-profile-role-claims.jsonl');
const receiptCapturesFile = path.join(receiptsDir, 'captures.jsonl');
const useFull = fs.existsSync(fullCandidatesFile) && fs.existsSync(fullClaimsFile) && fs.existsSync(receiptCapturesFile);

const projectionCrossings = readJsonl('crossing-candidates.jsonl');
const projectionClaims = readJsonl('role-claims.jsonl');
const projectionCaptures = readJsonl('captures.jsonl');
const warnings = readJsonl('review-warnings.jsonl');
const visualNotes = readJsonl('visual-review-notes.jsonl');
const coverageGaps = readJsonl('coverage-gaps.jsonl');
const canonicalActors = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/actors.json'), 'utf8')).actors;
const canonicalOrgs = JSON.parse(fs.readFileSync(path.join(root, 'data/canonical/organizations.json'), 'utf8')).organizations;
const canonicalActorIds = new Set(canonicalActors.map(a => a.id));
const canonicalOrgIds = new Set(canonicalOrgs.map(o => o.id));

// Uniform capture shape: { capture_id, series_id, observed_at, observed_at_source, profile_url, label, sha256, page_count, byte_length, publication_status }
function normCapture(c) {
  const prov = c.provenance ?? c.source_receipt ?? {};
  return {
    capture_id: c.capture_id,
    series_id: c.series_id,
    observed_at: c.observed_at,
    observed_at_source: c.observed_at_source,
    profile_url: c.subject?.profile_url ?? null,
    label: c.subject?.label ?? null,
    sha256: prov.source_sha256 ?? prov.sha256 ?? null,
    page_count: prov.page_count ?? null,
    byte_length: prov.byte_length ?? null,
    publication_status: c.publication_status ?? 'review_projection',
  };
}
const captureRows = useFull ? readJsonlAt(receiptCapturesFile) : projectionCaptures;
const captureById = new Map(captureRows.map(c => [c.capture_id, normCapture(c)]));
// Projection captures fill anything the receipt manifest lacks (the projection is a subset).
for (const c of projectionCaptures) if (!captureById.has(c.capture_id)) captureById.set(c.capture_id, normCapture(c));

const claims = useFull ? readJsonlAt(fullClaimsFile) : projectionClaims;
const claimById = new Map(claims.map(c => [c.claim_id, {
  claim_id: c.claim_id,
  capture_id: c.capture_id,
  source_page: c.provenance?.source_page ?? c.source_receipt?.source_page ?? null,
}]));

const projectionIds = new Set(projectionCrossings.map(r => r.candidate_id));
const rawCrossings = useFull ? readJsonlAt(fullCandidatesFile) : projectionCrossings;
const crossings = rawCrossings.map(r => {
  const capIds = r.source_capture_ids
    ?? [claimById.get(r.public_role?.claim_id)?.capture_id, claimById.get(r.private_role?.claim_id)?.capture_id].filter(Boolean);
  const caps = [...new Set(capIds)].map(id => captureById.get(id)).filter(Boolean);
  return {
    ...r,
    source_capture_ids: [...new Set(capIds)],
    publication_status: r.publication_status ?? (caps.length ? caps[0].publication_status : null),
    in_review_projection: projectionIds.has(r.candidate_id),
  };
});

// ── helpers ──────────────────────────────────────────────────────────────────
const slug = s => String(s).toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’`".()]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// private_intake is the capture-manifest status; the 2026-10-23 owner decision clears it for in-repo receipts.
const PROMOTABLE_PUBLICATION_STATUSES = new Set(['review_projection', 'private_intake']);
const REJECTING_DISPOSITIONS = new Set(['requires_source_or_independent_public_review']);
const REQUIRED_RECEIPT_ROLES = ['self_claimed_public_role', 'self_claimed_private_role'];

function cleanPersonLabel(label) {
  // Strip trailing credential segments (", Ph.D.", ", MS", ", MBV", ", Global MBA"); keep generational suffixes (", Jr.").
  let s = label.trim();
  for (let i = 0; i < 3; i += 1) {
    const next = s.replace(/,\s*(Ph\.?D\.?|(Global |Executive )?MBA|P\.?E\.?|J\.?D\.?|PMP|CFA|CPA|M\.?D\.?|Esq\.?|[A-Z]{2,5})\s*$/, '').trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

// Organization normalization: obvious aliases of the same institution share an id.
const ORG_ALIASES = [
  [/^(u\.?s\.? army|us army|united states army|us army \(.*\)|u\.s army)$/i, 'united-states-army', 'United States Army', 'military'],
  [/^(united states army reserve|u\.?s\.? army reserve|us army reserve)$/i, 'united-states-army-reserve', 'United States Army Reserve', 'military'],
  [/^(us air force|u\.?s\.? air force|united states air force|usaf)$/i, 'united-states-air-force', 'United States Air Force', 'military'],
  [/^(us navy|u\.?s\.? navy|united states navy|us navy \(o\d\))$/i, 'united-states-navy', 'United States Navy', 'military'],
  [/^(us marine corps|u\.?s\.? marine corps|united states marine corps|usmc)$/i, 'united-states-marine-corps', 'United States Marine Corps', 'military'],
  [/^(u\.?s\.? coast guard|united states coast guard|uscg)$/i, 'united-states-coast-guard', 'United States Coast Guard', 'military'],
  [/^(united states department of defense|u\.?s\.? department of defense|us department of defense|department of defense|dept\.? of defense|dod)$/i, 'us-department-of-defense', 'US Department of Defense', 'agency'],
  [/^(united states department of the navy|department of the navy)$/i, 'us-department-of-the-navy', 'US Department of the Navy', 'agency'],
  [/^(united states department of the air force|department of the air force)$/i, 'us-department-of-the-air-force', 'US Department of the Air Force', 'agency'],
  [/^(u\.?s\.? department of state|united states department of state|us department of state|department of state)$/i, 'us-department-of-state', 'US Department of State', 'agency'],
  [/^(u\.?s\.? department of homeland security|united states department of homeland security|department of homeland security|dhs)$/i, 'us-department-of-homeland-security', 'US Department of Homeland Security', 'agency'],
  [/^(defense advanced research projects agency \(darpa\)|darpa\.?|defense advanced research projects agency)$/i, 'darpa', 'DARPA', 'agency'],
  [/^(defense innovation unit \(diu\)|defense innovation unit|diu)$/i, 'defense-innovation-unit', 'Defense Innovation Unit', 'agency'],
  [/^(u\.?s\.? senate committee on armed services|united states senate committee on armed services|senate armed services committee|u\.?s senate committee on armed services)$/i, 'us-senate-armed-services-committee', 'US Senate Committee on Armed Services', 'public_body'],
  [/^(the white house)$/i, 'the-white-house', 'The White House', 'office'],
  [/^(the joint staff|joint staff)$/i, 'joint-staff', 'The Joint Staff', 'military'],
  [/^(uk ministry of defence|ministry of defence|mod|uk mod)$/i, 'uk-ministry-of-defence', 'UK Ministry of Defence', 'agency'],
  [/^(nasa|nasa - national aeronautics and space administration|national aeronautics and space administration)$/i, 'nasa', 'NASA', 'agency'],
  [/^mckinsey & (company|co\.)$/i, 'mckinsey-and-company', 'McKinsey & Company', 'company'],
  [/^ren+ais+ance strategic advisors$/i, 'renaissance-strategic-advisors', 'Renaissance Strategic Advisors', 'company'],
  [/^openai$/i, 'openai', 'OpenAI', 'company'],
];

// ── classification: explicit public-employer allowlist ──────────────────────
// A match (and no NOT_PUBLIC_EMPLOYER match) makes the organization a public employer.
// Everything else is private. Each entry: [pattern, group used in reporting].
const PUBLIC_EMPLOYER_ALLOWLIST = [
  // US executive departments and the Pentagon
  [/\b(u\.?\s?s\.?|us|united states)\b.{0,6}\bdepartment of\b/i, 'US executive department'],
  [/^(the )?(department|dept\.?) of (defense|state|energy|homeland security|justice|commerce|the treasury|treasury|the army|the navy|the air force|veterans affairs|transportation|health and human services|labor|agriculture|the interior|education|housing and urban development)\b/i, 'US executive department'],
  [/\b(dod|pentagon|osd)\b/i, 'US Department of Defense'],
  [/\boffice of the (secretary|under secretary|assistant secretary|deputy secretary|chief of naval operations|director of national intelligence|vice president)\b/i, 'US executive office'],
  [/^(office of the )?comptroller\b/i, 'US Department of Defense'],
  // Armed services, their reserves, commands, units and laboratories
  [/\b(u\.?\s?s\.?|us|united states)\s*(army|navy|air force|marine corps|coast guard|space force)\b/i, 'US armed services'],
  [/^(army|air force|navy|naval|marine corps|space force)\b/i, 'US armed services'],
  [/\b(army|air) national guard\b|\busaf\b|\busmc\b|\bnavalx\b|\bafwerx\b|\bdaf\b/i, 'US armed services'],
  [/\b(navsea|navair|spawar|opnav|tradoc|inscom|socom|centcom|indopacom|eucom|africom|northcom|southcom|stratcom|transcom|cybercom|spacecom|marsoc|afsoc|jsoc)\b/i, 'US armed services'],
  [/\b(joint special operations|special operations|air mobility|air education and training|air combat|central|indo-pacific|pacific|european|africa|northern|southern|strategic|transportation|cyber|space|futures|materiel|training and doctrine) command\b/i, 'US armed services'],
  [/^\d+(st|nd|rd|th)\b.*\b(division|divison|brigade|regiment|battalion|squadron|wing|group|fleet|airborne)\b/i, 'US armed services'],
  [/\bjoint (staff|chiefs)\b|\bunited states forces\b|\bprogram executive office\b|\bpeo\b|\bnational training center\b|\bnaval (postgraduate|research|surface warfare|undersea warfare|information warfare)\b/i, 'US armed services'],
  // Federal agencies, commissions and advisory boards
  [/\b(darpa|arpa-h|iarpa|diu|disa|dtra|dla|dcma|dtsa|nro|nga|cia|odni|fbi|nasa|nsf|nist|noaa|faa|fcc|ftc|usaid|gao|cbo|cisa|jaic|cdao|nscai)\b/i, 'US federal agency'],
  [/\b(defense advanced research projects|advanced research projects agency|defense innovation unit|missile defense agency|national reconnaissance office|national geospatial-intelligence agency|national security agency|central intelligence agency|defense intelligence agency|defense information systems agency|defense threat reduction agency|defense logistics agency|defense contract management agency|defense technology security administration|director of national intelligence|national aeronautics and space administration|government accountability office|congressional budget office|congressional research service|special inspector general|defense science board|scientific advisory board|national security commission on artificial intelligence|accident investigation board|joint artificial intelligence center|chief digital and (artificial intelligence|ai) office|u\.?s\.? digital service|cybersecurity and infrastructure security agency|homeland security|department of defense education activity|federal bureau of investigation)\b/i, 'US federal agency'],
  [/^united states federal government$/i, 'US federal government'],
  [/\b(general accounting office|peace corps|business transformation agency|office of strategic capital|technology modernization fund|irregular warfare center|asia pacific center for security studies|rdecom|ussocom|usmtm|headquarters air force|joint base\b|combined joint task force|task force \d+|special forces|airborne corps|recruiting (bn|battalion)|\d+(st|nd|rd|th) air force|(u\.?s\.?|us) \w+ fleet)\b/i, 'US armed services / agency'],
  [/\bair force\b|\byokota\b|\bramstein\b|\bkadena\b|^usn$|^(hc|ht|hsc|hs|vf|vfa|vaq|vp|hmla|hmm|vmfa|vmm)-?\s?\d+\b|\b\d+ (naval air squadron|nas)\b|\bhhc\b|\bcav\b|\bmarines\b/i, 'US / UK armed services'],
  [/\bhm revenue (and|&) customs\b|\buk trade (and|&) investment\b|\bukti\b|\broyal marines\b|\bjoint helicopter command\b|\bpjhq\b/i, 'UK government department'],
  // White House and NSC
  [/\bwhite house\b|\bexecutive office of the president\b|\bnational security council\b|\boffice of management and budget\b|\boffice of science and technology policy\b|\bpresidential innovation fellows\b/i, 'White House / NSC'],
  // Congress
  [/\b(united states|u\.?\s?s\.?|us) senate\b|^senate\b|\bhouse of representatives\b|\b(united states|u\.?\s?s\.?|us) congress\b|^congress\b/i, 'US Congress'],
  [/^house (armed services|appropriations|intelligence|foreign affairs|homeland security|oversight|energy|budget|science)/i, 'US Congress'],
  [/\boffice of (congressman|congresswoman|senator|representative|rep\.?|sen\.?)\b/i, 'US Congress'],
  [/\b(u\.?\s?s\.?|united states) embassy\b|\bembassy of the united states\b/i, 'US executive department'],
  // United Kingdom
  [/\bministry of defence\b|\b(uk )?mod\b|\bhm treasury\b|\bcabinet office\b|\bhome office\b|\bforeign,? commonwealth (and|&) development office\b|\bforeign (and|&) commonwealth office\b|\bfcdo\b|\bdepartment for (science|business|digital|international trade|education|transport|work|environment|levelling|energy|culture)/i, 'UK government department'],
  [/\b10 downing street\b|\bnumber 10\b|\bno\.? ?10\b|\bprime minister'?s office\b|\b(uk|hm|her majesty'?s|his majesty'?s) government\b/i, 'UK No. 10 / government'],
  [/\broyal air force\b|\(raf\)|^raf\b|\broyal navy\b|\bbritish army\b|\bgchq\b|\bdstl\b|\bdefence science and technology laboratory\b|\buk parliament\b|\bhouse of commons\b|\bhouse of lords\b|\buk ai (safety|security) institute\b/i, 'UK armed services / Parliament'],
];
// Names that look governmental but are campaigns, companies or membership associations.
const NOT_PUBLIC_EMPLOYER = /(\bfor (congress|senate|president|governor)\b|\bgovernment (solutions|systems|services|affairs)\b|\bbloomberg government\b|\b(inc|llc|ltd|corp|corporation|plc|gmbh|l\.?p\.?)\b\.?|\bfederal credit union\b|\bassociation of the united states army\b|\bausa\b|\bnavy league\b|\bair force association\b|\bfoundation\b|\balumni\b|\bacademy of\b|\bcompany\b)/i;
// Public-sector bodies outside the allowlist: never accepted as a "private" destination.
const PUBLIC_SECTOR_OUTSIDE_ALLOWLIST = /(\bgovernment\b|\bministry\b|\bministère\b|\bparliament\b|\barmed forces\b|\bforces armées\b|\bembassy\b|\bambassade\b|\bconsulate\b|\bstate of \w|\bcommonwealth of\b|\bcity of\b|\bcounty\b|\bmunicipal|\bstate department of\b|\bdepartment of transportation\b|\bpolice\b|\bpublic schools?\b|\bnational guard\b|\bstate university\b|\buniversity of (california|texas|michigan|virginia|maryland|washington|florida|georgia|colorado)\b|\bgeorgia (institute of technology|tech research institute)\b|\bair base\b|\bafb\b|\bnaval station\b|\bfederal\b|\bbundeswehr\b|\bnato\b|\bunited nations\b|\beuropean (commission|union|parliament)\b|\bcity council\b|\bstate park\b|^[A-Z][a-z]+( [A-Z][a-z]+)? department of\b|^hrh\b|\broyal household\b|\bfor (congress|senate|president|governor)\b|\bcamp [A-Z][a-z]+\b|\buc (berkeley|davis|san diego|los angeles|irvine)\b)/i;
const POLITICAL_CAMPAIGN = /\bfor (congress|senate|president|governor|mayor|assembly)\b|\bcampaign\b|\bvictory fund\b|\bpac\b/i;
const GOV_TITLE = /(\b(under|assistant|deputy) secretary\b|\bsecretary of (the )?(army|navy|air force|defense|state)\b|\bambassador\b|\bmember of congress\b|\bu\.?s\.? senator\b|\bcongressman\b|\bcongresswoman\b)/i;

function publicGroup(org) {
  const s = String(org ?? '').trim();
  if (!s || NOT_PUBLIC_EMPLOYER.test(s)) return null;
  for (const [re, group] of PUBLIC_EMPLOYER_ALLOWLIST) if (re.test(s)) return group;
  return null;
}

const TITLE_WORD_ORG = /^(vp|svp|evp|vice president|director|principal|assistant|deputy|intern|chief|head|senior|executive|program manager|project manager|manager|environmental|unit safety|intelligence information)\b/i;
const NOT_SPECIFIC = /^(institute|self-employed|self employed|united states of america|acquisition|government|federal government|military|consulting|consultant|freelance|retired|confidential|stealth|stealth startup|stealth mode|various|independent|independent consultant|national security|defense startup|dc|southern california|violence|human capital|united states \w{1,3})$/i;
const US_STATES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Korea|Italy|Germany|Japan';
const LOCATION_SUFFIX = new RegExp(`,\\s*(${US_STATES})$`, 'i');

function orgQualityFault(org) {
  const s = String(org ?? '').trim();
  if (!s) return 'empty_organization';
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\b.*\d{4}/i.test(s)) return 'date_in_organization_field';
  if (/\d{4}\s*\.?$/.test(s) && !/[a-z]{3,}.*[a-z]{3,}.*\d{4}/i.test(s.replace(/\d{4}\.?$/, ''))) return 'date_in_organization_field';
  if (/\b(metro area|area)$/i.test(s) || /,\s*[A-Z]{2}(\s+\d{5})?$/.test(s) || /,\s*united states$/i.test(s)) return 'location_in_organization_field';
  if (LOCATION_SUFFIX.test(s)) return 'location_in_organization_field';
  if (/[|;:◆•]/.test(s) || /^[^A-Za-z0-9"'(]/.test(s)) return 'merged_layout_fields_in_organization_field';
  if (/\s[-–]$/.test(s)) return 'truncated_organization_field';
  if (/^[a-z]/.test(s) && !/^(e|i)[A-Z]/.test(s)) return 'sentence_fragment_in_organization_field';
  if (/\.$/.test(s) && !/\b(inc|co|corp|ltd|llc|jr|l\.p|s\.a)\.$/i.test(s) && !/^darpa\.$/i.test(s)) return 'sentence_fragment_in_organization_field';
  if (TITLE_WORD_ORG.test(s) && !publicGroup(s)) return 'role_title_shifted_into_organization_field';
  if (/\b(officer|manager|specialist|analyst|representative|coordinator)\b/i.test(s) && !publicGroup(s)) return 'role_title_shifted_into_organization_field';
  const opens = (s.match(/\(/g) ?? []).length, closes = (s.match(/\)/g) ?? []).length;
  if (/(\bof the|\bfor the|\band|\bof|\bfor|\bthe|,)$/i.test(s) || opens !== closes) return 'truncated_organization_field';
  if (NOT_SPECIFIC.test(s)) return 'not_a_specific_organization';
  if (/,\s*(consultant)$/i.test(s)) return 'self_named_consultancy_not_an_organization';
  return null;
}

function titleQualityFault(t) {
  const s = String(t ?? '').trim();
  const opens = (s.match(/\(/g) ?? []).length, closes = (s.match(/\)/g) ?? []).length;
  if (!s || /^[a-z)&,]/.test(s) || opens !== closes) return 'truncated_or_shifted_title_field';
  return null;
}

function normalizeOrg(rawOrg) {
  const s = rawOrg.trim().replace(/\.$/, (m) => (/^DARPA\.$/i.test(rawOrg.trim()) ? '' : m));
  for (const [re, id, label, kind] of ORG_ALIASES) if (re.test(s)) return { id, label, kind };
  return { id: slug(s), label: s, kind: null };
}

function publicOrgKind(label) {
  if (/\b(army|navy|naval|air force|reserve|marine|station|command|division|brigade|raf|royal)\b/i.test(label)) return 'military';
  if (/\b(committee|senate|house|congress|parliament)\b/i.test(label)) return 'public_body';
  if (/\b(white house|national security council|office of the secretary|no\.? ?10|downing)\b/i.test(label)) return 'office';
  return 'agency';
}
function privateOrgKind(label) {
  if (/\b(capital|ventures?|partners|acquisition corp)\b/i.test(label)) return 'fund';
  if (/\b(trust|foundation|center|centre|council|association|institute|project|initiative|network|society|international usa|conservancy|academies|consortia)\b/i.test(label)) return 'nonprofit';
  if (/\b(university|college|laboratory|lab$)\b/i.test(label)) return 'organization';
  return 'company';
}

function privateSurfaceType(title) {
  return /(board|advis|trustee|council|fellow|committee|member|commissioner)/i.test(title)
    ? 'board_advisory_surface' : 'employment_investment_surface';
}

const yearOnly = raw => /^\d{4}$/.test(String(raw ?? '').trim());
const isPresent = raw => /^present$/i.test(String(raw ?? '').trim());

function intervalFields(iv) {
  const notes = [];
  let start = iv.start ?? null;
  let end = iv.end ?? null;
  if (yearOnly(iv.start_raw)) { start = `${iv.start_raw.trim()}-01-01`; notes.push(`start stated as year only (${iv.start_raw.trim()}); time_start set to ${start}`); }
  if (yearOnly(iv.end_raw)) { end = `${iv.end_raw.trim()}-12-31`; notes.push(`end stated as year only (${iv.end_raw.trim()}); time_end set to ${end}`); }
  if (iv.open_ended || isPresent(iv.end_raw)) { end = null; notes.push('end stated as "Present" at capture; time_end left open'); }
  return { start, end, notes };
}
const yearLabel = (iv) => {
  const s = String(iv.start_raw ?? '').match(/\d{4}/)?.[0] ?? '?';
  const e = iv.open_ended || isPresent(iv.end_raw) ? 'present' : (String(iv.end_raw ?? '').match(/\d{4}/)?.[0] ?? '?');
  return [s, e];
};
const ivEnd = iv => (iv.open_ended || isPresent(iv.end_raw) ? null : iv.end ?? null);

// ── warnings index ───────────────────────────────────────────────────────────
const rejectedClaims = new Map();
const rejectedCaptures = new Map();
for (const w of warnings) {
  if (!REJECTING_DISPOSITIONS.has(w.disposition)) continue;
  if (w.claim_id) rejectedClaims.set(w.claim_id, w);
  for (const id of w.claim_ids ?? []) rejectedClaims.set(id, w);
  if (!w.claim_id && !w.claim_ids) rejectedCaptures.set(w.capture_id, w);
}

// ── receipt archive check (once per capture) ─────────────────────────────────
const archiveStatus = new Map();
function captureArchive(cap) {
  if (archiveStatus.has(cap.capture_id)) return archiveStatus.get(cap.capture_id);
  const rel = `${receiptsRel}/raw/${cap.capture_id}.pdf`;
  const full = path.join(root, rel);
  let status;
  if (!fs.existsSync(full)) status = { ok: false, detail: `missing ${rel}` };
  else {
    const buf = fs.readFileSync(full);
    const actual = sha256Buf(buf);
    status = actual === cap.sha256
      ? { ok: true, path: rel, sha256: actual, bytes: buf.length }
      : { ok: false, detail: `${rel} hashes to ${actual}, capture row says ${cap.sha256}` };
  }
  archiveStatus.set(cap.capture_id, status);
  return status;
}

// ── gate evaluation ──────────────────────────────────────────────────────────
function evaluate(row) {
  if (!PROMOTABLE_PUBLICATION_STATUSES.has(row.publication_status)) return { reason: 'publication_status', detail: row.publication_status };
  const rrs = row.receipt_roles_satisfied ?? [];
  if (!REQUIRED_RECEIPT_ROLES.every(r => rrs.includes(r))) return { reason: 'receipt_roles', detail: rrs.join(',') };

  const label = cleanPersonLabel(row.subject?.label ?? '');
  const url = row.subject?.profile_url ?? '';
  const tokens = label.split(/\s+/).filter(Boolean);
  if (row.subject?.entity_type !== 'person' || tokens.length < 2 || /^[A-Z]\.?$/.test(tokens.at(-1)) || !/^https:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[^/?#]+\/?$/.test(url)) {
    return { reason: 'identity', detail: `${row.subject?.label} ${url}`.trim() };
  }

  const pubClaim = claimById.get(row.public_role?.claim_id);
  const privClaim = claimById.get(row.private_role?.claim_id);
  const caps = row.source_capture_ids.map(id => captureById.get(id));
  if (!pubClaim || !privClaim || !caps.length || caps.some(c => !c || !c.profile_url)) {
    return { reason: 'receipt_source_url', detail: 'missing claim or capture with profile URL' };
  }
  if (caps.length > 1) return { reason: 'receipt_source_url', detail: `roles come from different captures: ${row.source_capture_ids.join(', ')}` };
  const capture = caps[0];
  const archive = captureArchive(capture);
  if (!archive.ok) return { reason: 'receipt_archive', detail: archive.detail };

  for (const cid of [row.public_role.claim_id, row.private_role.claim_id]) {
    if (rejectedClaims.has(cid)) return { reason: 'review_warning', detail: `${rejectedClaims.get(cid).warning_type} on ${cid}` };
  }
  if (rejectedCaptures.has(capture.capture_id)) return { reason: 'review_warning', detail: `${rejectedCaptures.get(capture.capture_id).warning_type} on ${capture.capture_id}` };

  for (const [slot, role] of [['first', row.public_role], ['second', row.private_role]]) {
    const f = orgQualityFault(role.organization);
    if (f) return { reason: 'extraction_quality', detail: `org "${role.organization}": ${f}` };
    const t = titleQualityFault(role.title);
    if (t) return { reason: 'extraction_quality', detail: `title "${String(role.title ?? '').trim()}": ${t}` };
    void slot;
  }

  // Reclassify both sides against the allowlist; the machine's slot labels are not trusted.
  const gA = publicGroup(row.public_role.organization);
  const gB = publicGroup(row.private_role.organization);
  if (gA && gB) return { reason: 'role_classification', detail: `both roles are public employers: "${row.public_role.organization}" / "${row.private_role.organization}"` };
  if (!gA && !gB) return { reason: 'role_classification', detail: `neither role is an allowlisted public employer: "${row.public_role.organization}" / "${row.private_role.organization}"` };
  const swapped = !gA;
  const pub = swapped ? row.private_role : row.public_role;
  const priv = swapped ? row.public_role : row.private_role;
  const group = gA ?? gB;
  if (PUBLIC_SECTOR_OUTSIDE_ALLOWLIST.test(priv.organization) && !NOT_PUBLIC_EMPLOYER.test(priv.organization)) {
    return { reason: 'role_classification', detail: `private side is a public-sector body outside the allowlist: "${priv.organization}"` };
  }
  if (POLITICAL_CAMPAIGN.test(priv.organization)) return { reason: 'role_classification', detail: `private side is a political campaign, not a private-sector employer: "${priv.organization}"` };
  const surname = tokens.at(-1).toLowerCase();
  if (surname.length >= 4 && priv.organization.toLowerCase().includes(surname) && /\b(inc|llc|consulting|associates|advisors|advisory|group|ltd|company|journal)\b/i.test(priv.organization)) {
    return { reason: 'extraction_quality', detail: `private org "${priv.organization}": self_named_consultancy_not_an_organization` };
  }
  if (GOV_TITLE.test(priv.title)) return { reason: 'role_classification', detail: `private-side title is a government office: "${priv.title}" at "${priv.organization}"` };

  const ps = pub.stated_interval?.start;
  const vs = priv.stated_interval?.start;
  if (!ps || !vs) return { reason: 'temporal_order', detail: 'start date missing' };
  const sameYear = ps.slice(0, 4) === vs.slice(0, 4);
  if (sameYear && (yearOnly(pub.stated_interval.start_raw) || yearOnly(priv.stated_interval.start_raw)) && ps !== vs) {
    return { reason: 'temporal_order', detail: `order undecidable: both start in ${ps.slice(0, 4)} and one start is year-only` };
  }
  if (sameYear && ps === vs && (yearOnly(pub.stated_interval.start_raw) || yearOnly(priv.stated_interval.start_raw))) {
    return { reason: 'temporal_order', detail: `order undecidable: both start in ${ps.slice(0, 4)} and one start is year-only` };
  }
  let direction, temporal;
  if (vs >= ps) {
    direction = 'public_to_private';
    const pe = ivEnd(pub.stated_interval);
    temporal = pe && vs > pe ? 'public_to_private_sequence' : 'concurrent_public_and_private_roles';
  } else {
    direction = 'private_to_public';
    const ve = ivEnd(priv.stated_interval);
    temporal = ve && ps > ve ? 'private_to_public_sequence' : 'concurrent_public_and_private_roles';
  }
  return { reason: null, label, direction, temporal, capture, archive, pub, priv, swapped, group };
}

// ── build ────────────────────────────────────────────────────────────────────
const refusals = [];
const passed = [];
for (const row of [...crossings].sort((a, b) => a.candidate_id.localeCompare(b.candidate_id))) {
  const r = evaluate(row);
  if (r.reason) refusals.push({ candidate_id: row.candidate_id, subject: row.subject?.label, reason: r.reason, detail: r.detail, in_review_projection: row.in_review_projection });
  else passed.push({ row, ...r });
}

// Collapse the same crossing observed in repeated captures (or duplicated extraction) onto the latest capture.
const roleKey = r => [r.organization.trim().toLowerCase(), String(r.title).trim().toLowerCase(), r.stated_interval.start].join('|');
const byKey = new Map();
for (const p of passed) {
  const key = [p.row.subject.profile_url.replace(/\/$/, '').toLowerCase(), roleKey(p.pub), roleKey(p.priv)].join('#');
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(p);
}
const promoted = [];
const collapsed = [];
for (const group of byKey.values()) {
  group.sort((a, b) => b.capture.observed_at.localeCompare(a.capture.observed_at) || a.row.candidate_id.localeCompare(b.row.candidate_id));
  const [keep, ...rest] = group;
  keep.also_observed = rest.map(r => ({ candidate_id: r.row.candidate_id, capture_id: r.capture.capture_id, observed_at: r.capture.observed_at }));
  promoted.push(keep);
  for (const r of rest) collapsed.push({ candidate_id: r.row.candidate_id, kept_candidate_id: keep.row.candidate_id });
}
promoted.sort((a, b) => a.row.candidate_id.localeCompare(b.row.candidate_id));

const actors = new Map();
const actorIdByUrl = new Map();
const orgs = new Map();
const surfaces = new Map();
const participation = new Map();
const receipts = new Map();
const receiptIdByCapture = new Map();
const surfaceIdTaken = new Map();

function actorIdFor(label, url) {
  const key = url.replace(/\/$/, '').toLowerCase();
  if (actorIdByUrl.has(key)) return actorIdByUrl.get(key);
  let id = slug(label);
  const taken = [...actorIdByUrl.entries()].find(([, v]) => v === id);
  if (taken) id = `${id}-${slug(key.split('/in/')[1] ?? key).slice(0, 24)}`;
  actorIdByUrl.set(key, id);
  return id;
}

function ensureOrg(rawOrg, side) {
  const n = normalizeOrg(rawOrg);
  if (!orgs.has(n.id)) {
    const kind = n.kind ?? (side === 'public' ? publicOrgKind(n.label) : privateOrgKind(n.label));
    orgs.set(n.id, {
      id: n.id,
      label: n.label,
      kind,
      sector: side,
      existing_canonical_id: canonicalOrgIds.has(n.id),
      source: 'linkedin-profile-captures',
      canonical_status: 'staged_pending_merge',
      graph_effect: 'none',
      notes: `Named as ${side === 'public' ? 'a public employer (explicit allowlist)' : 'a private organization (not on the public-employer allowlist)'} in self-reported LinkedIn role entries. Label is as displayed on the profile${n.label !== rawOrg ? `; variant spellings normalized (e.g. "${rawOrg}")` : ''}.`,
      raw_labels: [],
    });
  }
  const o = orgs.get(n.id);
  if (!o.raw_labels.includes(rawOrg)) o.raw_labels.push(rawOrg);
  if (o.sector !== side) o.sector = 'mixed';
  return o;
}

function ensureReceipt(capture, archive, actorId, actorLabel) {
  if (receiptIdByCapture.has(capture.capture_id)) return receiptIdByCapture.get(capture.capture_id);
  const date = capture.observed_at.slice(0, 10);
  let id = `linkedin-profile-capture-${actorId}-${date}`;
  if (receipts.has(id)) id = `${id}-${capture.capture_id.slice(-6)}`;
  const visual = visualNotes.filter(v => v.capture_id === capture.capture_id).map(v => v.note_id);
  receipts.set(id, {
    receipt_id: id,
    label: `LinkedIn — ${actorLabel} self-reported profile PDF, role entries as displayed (captured ${date})`,
    source_type: 'self_reported_profile_capture',
    evidence_class: 'reported',
    path: archive.path,
    source_url: capture.profile_url,
    publisher: 'LinkedIn (content self-reported by the profile holder)',
    source_observed_at: capture.observed_at,
    date_basis: capture.observed_at_source,
    retrieved_at: date,
    capture_id: capture.capture_id,
    series_id: capture.series_id,
    source_pdf_sha256: archive.sha256,
    source_pdf_pages: capture.page_count,
    source_pdf_bytes: archive.bytes,
    visual_review_note_ids: visual,
    notes: `LinkedIn-generated profile PDF for ${actorLabel}, captured ${date}, archived in the repository at ${archive.path} (manifest ${receiptsRel}/captures.jsonl). Role tuples (organization, title, stated interval) were machine-extracted with page addresses.${visual.length ? ' A single model visual spot check reviewed part of this capture.' : ''} Archived as a public receipt under the 2026-10-23 owner decision (docs/linkedin-profile-receipts.md).`,
    limits: RECEIPT_LIMITS,
    archive: {
      method: 'in_repo_content_hash',
      ref: `sha256:${archive.sha256}`,
      captured: date,
    },
  });
  receiptIdByCapture.set(capture.capture_id, id);
  return id;
}

function addRoleSurface({ actorId, actorLabel, side, role, receiptId }) {
  const org = ensureOrg(role.organization, side);
  const claim = claimById.get(role.claim_id);
  const iv = role.stated_interval;
  const { start, end, notes: ivNotes } = intervalFields(iv);
  const [sy, ey] = yearLabel(iv);
  let sid = `${actorId}-${org.id}-${slug(role.title).slice(0, 48).replace(/-+$/, '')}-linkedin-${sy}-${ey}`;
  const prior = surfaceIdTaken.get(sid);
  if (prior && prior !== role.claim_id) sid = `${sid}-${role.claim_id.slice(-6)}`;
  surfaceIdTaken.set(sid, role.claim_id);
  if (!surfaces.has(sid)) {
    const type = side === 'public' ? 'government_advisory_surface' : privateSurfaceType(role.title);
    surfaces.set(sid, {
      surface_id: sid,
      surface_label: `${actorLabel}: ${role.organization} role observation (LinkedIn), ${sy}–${ey}`,
      surface_type: type,
      secondary_surface_types: [],
      hop_eligible: false,
      hop_refusal_reason: 'single_actor_self_reported_role_observation',
      scorable: true,
      status: 'self_reported_role_observation_pending_review',
      bounded_by: [`LinkedIn profile capture ${claim.capture_id}${claim.source_page ? ` (page ${claim.source_page})` : ''}`, `stated interval "${iv.start_raw} – ${iv.end_raw}"`],
      time_start: start,
      time_end: end,
      evidence_class: 'reported',
      receipt_ids: [receiptId],
      notes: [`Single-actor ${side} role observation from a self-reported LinkedIn profile: "${role.title}" at ${role.organization}.`, ...ivNotes, 'Dates are as stated on the profile, not an official appointment or tenure finding. The observation creates no actor adjacency.'].join(' '),
      source_claim_id: role.claim_id,
    });
    participation.set(`${sid}#actor`, {
      surface_id: sid,
      participant_type: 'actor',
      actor_id: actorId,
      role: role.title,
      participation_type: side === 'public' ? 'government_role_observation' : (type === 'board_advisory_surface' ? 'board_advisory_role_observation' : 'employee_role_observation'),
      time_start: start,
      time_end: end,
      evidence_class: 'reported',
      receipt_ids: [receiptId],
      notes: `Self-reported on LinkedIn (claim ${role.claim_id}).${ivNotes.length ? ' ' + ivNotes.join('; ') + '.' : ''}`,
    });
    participation.set(`${sid}#org`, {
      surface_id: sid,
      participant_type: 'organization',
      organization_id: org.id,
      role: side === 'public' ? 'Public employer named in the self-reported role entry' : 'Private organization named in the self-reported role entry',
      participation_type: 'institution_context',
      time_start: start,
      time_end: end,
      evidence_class: 'reported',
      receipt_ids: [receiptId],
      notes: 'Institution named by the profile holder. Context only; a broad institution creates no actor hops.',
    });
  }
  return { sid, org };
}

const crossingIndex = [];
for (const p of promoted) {
  const { row, label, direction, temporal, capture, archive, pub, priv, swapped, group } = p;
  const actorId = actorIdFor(label, row.subject.profile_url);
  const receiptId = ensureReceipt(capture, archive, actorId, label);
  const pubS = addRoleSurface({ actorId, actorLabel: label, side: 'public', role: pub, receiptId });
  const privS = addRoleSurface({ actorId, actorLabel: label, side: 'private', role: priv, receiptId });
  if (!actors.has(actorId)) actors.set(actorId, { actorId, label, url: row.subject.profile_url, receiptIds: new Set(), crossings: [] });
  const a = actors.get(actorId);
  a.receiptIds.add(receiptId);
  const c = {
    candidate_id: row.candidate_id,
    actor_id: actorId,
    direction,
    temporal_state: temporal,
    machine_slots_swapped: swapped,
    public_employer_group: group,
    public_surface_id: pubS.sid,
    private_surface_id: privS.sid,
    public_organization_id: pubS.org.id,
    private_organization_id: privS.org.id,
    public_title: pub.title,
    public_organization: pub.organization,
    public_years: yearLabel(pub.stated_interval),
    public_start: pub.stated_interval.start,
    public_end: ivEnd(pub.stated_interval),
    private_title: priv.title,
    private_organization: priv.organization,
    private_years: yearLabel(priv.stated_interval),
    private_start: priv.stated_interval.start,
    private_end: ivEnd(priv.stated_interval),
    observed_at: capture.observed_at.slice(0, 10),
    receipt_id: receiptId,
    in_review_projection: row.in_review_projection,
    also_observed: p.also_observed,
    forbidden_inferences: row.forbidden_inferences,
  };
  a.crossings.push(c);
  crossingIndex.push(c);
}

const fmtYears = ([s, e]) => (s === e ? s : `${s}–${e}`);
function oneLine(c) {
  const pubPart = `${c.public_title} at ${c.public_organization} ${fmtYears(c.public_years)}`;
  const privPart = `${c.private_title} at ${c.private_organization} ${fmtYears(c.private_years)}`;
  const seq = c.temporal_state !== 'concurrent_public_and_private_roles';
  return c.direction === 'public_to_private'
    ? `${pubPart}, ${seq ? 'later' : 'while also'} ${privPart}`
    : `${privPart}, ${seq ? 'later' : 'while also'} ${pubPart}`;
}

// Most direct move per actor: the sequence with the shortest gap between the two roles.
function gap(c) {
  if (c.direction === 'public_to_private') return c.public_end ? Date.parse(c.private_start) - Date.parse(c.public_end) : Infinity;
  return c.private_end ? Date.parse(c.public_start) - Date.parse(c.private_end) : Infinity;
}
function headline(a) {
  const seq = a.crossings.filter(c => c.temporal_state !== 'concurrent_public_and_private_roles');
  const pool = seq.length ? seq : a.crossings;
  return [...pool].sort((x, y) => gap(x) - gap(y) || x.candidate_id.localeCompare(y.candidate_id))[0];
}

const actorRows = [...actors.values()].sort((x, y) => x.actorId.localeCompare(y.actorId)).map(a => {
  const h = headline(a);
  const pubOrgs = [...new Set(a.crossings.map(c => c.public_organization))];
  const privOrgs = [...new Set(a.crossings.map(c => c.private_organization))];
  return {
    id: a.actorId,
    label: a.label,
    kind: 'person',
    existing_canonical_id: canonicalActorIds.has(a.actorId),
    profile_url: a.url,
    plain: {
      who: `${oneLine(h)}, per LinkedIn profile captured ${h.observed_at}.`,
      why_here: `Self-reported LinkedIn roles place ${a.label} at ${pubOrgs.length} public employer${pubOrgs.length === 1 ? '' : 's'} (${pubOrgs.join('; ')}) and ${privOrgs.length} private organization${privOrgs.length === 1 ? '' : 's'} (${privOrgs.join('; ')}). These are timestamped self-claims; they do not by themselves establish influence, a procurement role, coordination, or wrongdoing.`,
      receipt_ids: [...a.receiptIds].sort(),
    },
    directions: [...new Set(a.crossings.map(c => c.direction))].sort(),
    source: 'linkedin-profile-captures',
    canonical_status: 'staged_pending_merge',
    graph_effect: 'none',
    identity_status: 'self_presented_profile_identity',
  };
});

// ── gaps ─────────────────────────────────────────────────────────────────────
const gaps = [
  ...coverageGaps.map(g => ({ gap_type: 'acquisition_coverage_gap', subject: g.name ?? g.subject?.label ?? null, detail: g })),
  ...warnings.filter(w => w.warning_type === 'zero_machine_crossings_for_selected_profile')
    .map(w => ({ gap_type: 'zero_detector_crossings', subject: captureById.get(w.capture_id)?.label ?? null, profile_url: w.profile_url, detail: w.disposition })),
  ...refusals.map(r => ({ gap_type: 'refused_crossing', candidate_id: r.candidate_id, subject: r.subject, reason: r.reason, detail: r.detail })),
];

// ── counts ───────────────────────────────────────────────────────────────────
const tally = (arr, f) => Object.fromEntries(Object.entries(arr.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
const distinctPeopleBy = (key, list = crossingIndex) => {
  const m = new Map();
  for (const c of list) { const k = orgs.get(c[key]).label; if (!m.has(k)) m.set(k, { people: new Set(), crossings: 0 }); const e = m.get(k); e.people.add(c.actor_id); e.crossings += 1; }
  return Object.fromEntries([...m.entries()].map(([k, e]) => [k, { people: e.people.size, crossings: e.crossings }]).sort((a, b) => b[1].people - a[1].people || b[1].crossings - a[1].crossings || a[0].localeCompare(b[0])));
};

const inputFiles = useFull
  ? { [`${intakeRel}/full/linkedin-role-crossing-candidates.jsonl`]: fullCandidatesFile, [`${intakeRel}/full/linkedin-profile-role-claims.jsonl`]: fullClaimsFile, [`${receiptsRel}/captures.jsonl`]: receiptCapturesFile }
  : {};
for (const f of ['crossing-candidates.jsonl', 'role-claims.jsonl', 'captures.jsonl', 'review-warnings.jsonl', 'visual-review-notes.jsonl', 'coverage-gaps.jsonl']) inputFiles[`${intakeRel}/${f}`] = path.join(intakeDir, f);

const summary = {
  schema_version: 'linkedin-crossings-staging@2',
  source: useFull ? `${intakeRel}/full (full private candidate set) + ${receiptsRel}` : `${intakeRel} (430-row review projection)`,
  input_set: useFull ? 'full' : 'review_projection',
  source_file_sha256: Object.fromEntries(Object.entries(inputFiles).map(([k, f]) => [k, sha256File(f)])),
  status: 'staged_not_merged',
  evidence_class: 'reported',
  owner_decision: OWNER_DECISION,
  gates: ['publication_status', 'receipt_roles', 'identity', 'receipt_source_url', 'receipt_archive', 'review_warning', 'extraction_quality', 'role_classification', 'temporal_order'],
  publication_status_decision: 'review_projection rows and private_intake capture rows are promotable to STAGING: the 2026-10-23 owner decision makes captured LinkedIn profiles public receipts. Any other status (held, redacted, do_not_publish ...) is refused. The merge owner decides publication.',
  classification_rule: 'Explicit public-employer allowlist (US executive departments, armed services and their commands and units, Congress and its committees and member offices, federal agencies and advisory boards, NSC and White House, UK MOD / No. 10 / departments / RAF / Parliament). Everything else is private. Exactly one side must be allowlisted; the private side is refused if it is still a public-sector body outside the allowlist or carries a government title. The candidate generator\'s public/private slots are ignored.',
  counts: {
    rows_read: crossings.length,
    rows_in_review_projection: crossings.filter(r => r.in_review_projection).length,
    passed_gates: passed.length,
    collapsed_repeat_observations: collapsed.length,
    promoted_crossings: promoted.length,
    refused_crossings: refusals.length,
    refused_by_reason: tally(refusals, r => r.reason),
    promoted_by_direction: tally(crossingIndex, c => c.direction),
    promoted_by_temporal_state: tally(crossingIndex, c => c.temporal_state),
    promoted_with_machine_slots_swapped: crossingIndex.filter(c => c.machine_slots_swapped).length,
    promoted_from_review_projection: crossingIndex.filter(c => c.in_review_projection).length,
    actors: actorRows.length,
    actors_already_canonical: actorRows.filter(a => a.existing_canonical_id).map(a => a.id),
    organizations: orgs.size,
    surfaces: surfaces.size,
    participation_rows: participation.size,
    receipts: receipts.size,
    gaps: gaps.length,
  },
  promoted_by_actor: tally(crossingIndex, c => c.actor_id),
  promoted_by_public_employer_group: tally(crossingIndex, c => c.public_employer_group),
  refused_by_subject: tally(refusals, r => r.subject),
  refused_detail_samples: Object.fromEntries(Object.keys(tally(refusals, r => r.reason)).map(k => [k, tally(refusals.filter(r => r.reason === k), r => r.detail.replace(/"[^"]*"/g, m => m).slice(0, 160))]).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).slice(0, 15))])),
  public_employers: distinctPeopleBy('public_organization_id'),
  private_organizations: distinctPeopleBy('private_organization_id'),
  private_destinations_public_to_private: distinctPeopleBy('private_organization_id', crossingIndex.filter(c => c.direction === 'public_to_private')),
  private_origins_private_to_public: distinctPeopleBy('private_organization_id', crossingIndex.filter(c => c.direction === 'private_to_public')),
  promoted_crossings: crossingIndex.map(c => ({ candidate_id: c.candidate_id, actor_id: c.actor_id, direction: c.direction, temporal_state: c.temporal_state, public_surface_id: c.public_surface_id, private_surface_id: c.private_surface_id, receipt_id: c.receipt_id, also_observed: c.also_observed, line: `${actors.get(c.actor_id).label}: ${oneLine(c)}` })),
  collapsed_repeat_observations: collapsed,
  forbidden_inferences: ['crossing_proves_influence', 'crossing_proves_procurement_role', 'crossing_proves_coordination', 'crossing_proves_wrongdoing'],
};

// ── write ────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true });
const writeJsonl = (name, rows) => fs.writeFileSync(path.join(outDir, name), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
const bySurface = (a, b) => a.surface_id.localeCompare(b.surface_id);
writeJsonl('surfaces.jsonl', [...surfaces.values()].sort(bySurface));
writeJsonl('participation.jsonl', [...participation.values()].sort((a, b) => bySurface(a, b) || a.participant_type.localeCompare(b.participant_type)));
writeJsonl('receipts.jsonl', [...receipts.values()].sort((a, b) => a.receipt_id.localeCompare(b.receipt_id)));
writeJsonl('gaps.jsonl', gaps);
fs.writeFileSync(path.join(outDir, 'actors.json'), JSON.stringify({ actors: actorRows }, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'organizations.json'), JSON.stringify({ organizations: [...orgs.values()].sort((a, b) => a.id.localeCompare(b.id)).map(o => ({ ...o, raw_labels: o.raw_labels.sort() })) }, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

console.log(JSON.stringify({ input_set: summary.input_set, ...summary.counts }, null, 2));
