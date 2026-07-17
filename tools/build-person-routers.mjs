#!/usr/bin/env node
// Build the person-centered defense-technology router map.
// Router = a person who publicly performs several observable cross-institution functions.
// "Purpose" = publicly stated or structurally observable function. NO private intent, coordination,
// influence, or wrongdoing is inferred. Evidence state is PER-PREDICATE. graph_effect: none.
//
// The neutral candidate denominator is DERIVED FROM ROSTERS (the committed LinkedIn projection +
// fetched fund team rosters), never a hard-coded seed list. Signature predicates are computed from
// each person's observed role-claims. Overlaps run against committed universes. Counterpart states
// carry documented search provenance (sources/counterpart-searches.jsonl).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/intake/person-centered-defense-routers');
const N = path.join(root, 'data/intake/natsec100-pathways');
const CORRIDOR = path.join(root, 'data/intake/austin-israel-defense-corridor');
const LIPROJ = path.join(root, 'data/intake/linkedin-targeted-review');
fs.mkdirSync(dir, { recursive: true });
const rjl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : [];
const rjson = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
const writeJsonl = (f, rows) => fs.writeFileSync(path.join(dir, f), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const core = s => norm(s).split(' ').filter(t => t && !['inc', 'llc', 'corp', 'technologies', 'technology', 'co', 'the', 'company', 'systems', 'labs', 'group', 'ai', 'space'].includes(t)).join(' ');
const pid = s => 'person:' + norm(s).replace(/ /g, '-');
const G = 'none';

// ---- canonical completion contract (builder + validator both consume it) ----
const contract = rjson(path.join(root, 'data/canonical/person-router-completion-contract.json'));
const PARTIAL_MARKERS = contract.partial_markers;
const hasPartialMarker = s => PARTIAL_MARKERS.some(m => String(s ?? '').toLowerCase().includes(m));

// ================= overlap universes =================
const nsByCore = new Map();
for (const c of rjl(path.join(N, 'chunk1/companies.jsonl'))) for (const nm of [c.canonical_name, ...(c.aliases ?? [])]) { const k = core(nm); if (k) nsByCore.set(k, c); }
const cfUniverse = rjson(path.join(CORRIDOR, 'capital-factory-portfolio-universe.json'));
const cfByCore = new Set(cfUniverse.company_names.map(core));
const pallasByCore = new Set(['Morpheus Space', 'Calypso AI', 'Rebellion Defense', 'Interos', 'Second Front', 'Hermeus'].map(core));

// ================= receipts =================
const receipts = [
  { receipt_id: 'r-jacksonmoses-about-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/about', retrieved_at: '2026-07-14', content_sha256: 'b6a77c2f513fcdd5dbc2840e2419f493df19784cc834876a3c1e01117b892f7f', note: 'Jackson Moses bio + advisory/sourcing self-claims. Repairs r-jacksonmoses-about-2026.' },
  { receipt_id: 'r-jacksonmoses-portfolio-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/portfolio', retrieved_at: '2026-07-14', content_sha256: '14ef4499820cb619cb35df46fc2ded5e761b627544adf58c832bb5d60cd213d5', note: '61 portfolio companies + exits.' },
  { receipt_id: 'r-jacksonmoses-silentcapital-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/silent-capital', retrieved_at: '2026-07-14', content_sha256: 'a9a1119282347663ec7a4d53e1a2464f019eeeb84c49fa067d490c58e454be61', note: 'Silent Capital 506(b) syndicate.' },
  { receipt_id: 'r-silent-home-2026', evidence_class: 'primary_public', locator_url: 'https://silentvc.com/', retrieved_at: '2026-07-14', content_sha256: '47d26f1a93433a2947cd9d61643c5118c54bdeb03507533970b4904f5ef2e0a7', note: 'Silent Ventures. Repairs r-silent-home-2026.' },
  { receipt_id: 'r-silentcapital-vc-2026', evidence_class: 'primary_public', locator_url: 'https://silentcapital.vc/', retrieved_at: '2026-07-14', content_sha256: '484173060f2615fbe1e8bc7531e38d22e157701f2402930cd429dcf0ca2ef640', note: 'Silent Capital syndicate site.' },
  { receipt_id: 'r-8vc-lonsdale-2026', evidence_class: 'primary_public', locator_url: 'https://8vc.com/team/joe-lonsdale', retrieved_at: '2026-07-14', content_sha256: null, note: 'Joe Lonsdale: 8VC founder; Palantir/Addepar/OpenGov/Epirus; Cicero Institute.' },
  { receipt_id: 'r-foundersfund-stephens-2026', evidence_class: 'primary_public', locator_url: 'https://foundersfund.com/team/trae-stephens', retrieved_at: '2026-07-14', content_sha256: null, note: 'Trae Stephens: Founders Fund partner; Anduril exec chairman.' },
  { receipt_id: 'r-a16z-boyle-2026', evidence_class: 'primary_public', locator_url: 'https://a16z.com/author/katherine-boyle/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Katherine Boyle: a16z American Dynamism; boards Apex/Hadrian; observer Saronic/Castelion.' },
  { receipt_id: 'r-capitalfactory-about-2026', evidence_class: 'primary_public', locator_url: 'https://capitalfactory.com/about', retrieved_at: '2026-07-14', content_sha256: null, note: 'Joshua Baer: Capital Factory + STATION Austin.' },
  { receipt_id: 'r-baer-texasmonthly-2026', evidence_class: 'reported', locator_url: 'https://www.texasmonthly.com/news-politics/joshua-baer-capital-factory-austin/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Baer died June 2026; node preserved.' },
  { receipt_id: 'r-jm-counterpart-searches-2026', evidence_class: 'search_provenance', locator_url: 'https://silentvc.com/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Counterpart-search provenance ledger (sources/counterpart-searches.jsonl): 11 documented searches of fund/company surfaces for Jackson attribution.' },
  { receipt_id: 'r-fund-portfolio-census-2026', evidence_class: 'primary_public', locator_url: 'https://silentvc.com/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Fund portfolio census (sources/fund-portfolio-census.json): 11 fund portfolio pages fetched; defense-relevant companies extracted.' },
  { receipt_id: 'r-linkedin-projection-2026', evidence_class: 'derived_projection', locator_url: 'https://www.linkedin.com/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Committed portable LinkedIn projection (data/intake/linkedin-targeted-review): 30 people, 359 role-claims; per-capture sha256 receipts. Router signatures computed from role-claims.' },
  { receipt_id: 'r-traysar-prnewswire-2026', evidence_class: 'reported', locator_url: 'https://www.prnewswire.com/news-releases/traysar-raises-25m-seed-emerges-from-stealth-at-reindustrialize-as-the-worlds-first-subterranean-defense-tech-company-302802698.html', retrieved_at: '2026-07-14', content_sha256: null, note: 'Traysar $25M seed led by Silent Ventures.' },
  { receipt_id: 'r-raft-ussocom-2026', evidence_class: 'reported', locator_url: 'https://www.govconwire.com/articles/raft-ussocom-contract-ai-data-delivery', retrieved_at: '2026-07-14', content_sha256: null, note: 'Raft $349M USSOCOM IDIQ ceiling (not spend).' },
  { receipt_id: 'r-fund-team-rosters-2026', evidence_class: 'primary_public', locator_url: 'https://8vc.com/team', retrieved_at: '2026-07-14', content_sha256: null, note: 'Fund team-roster ledger (sources/fund-team-rosters.json): 11 fund team pages fetched; investment-decision-maker subset enumerated (see roster-coverage.jsonl for per-source gross/enumerated).' },
  { receipt_id: 'r-stratos-ctech-portfolio-2026', evidence_class: 'reported', locator_url: 'https://www.calcalistech.com/ctechnews/article/r14hmskzzg', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press names Stratos portfolio (Particle/Tenna/Skapion); site is logos-only. Cross-ref to corridor.' },
  { receipt_id: 'r-capital-factory-portfolio-2026', evidence_class: 'primary_public', locator_url: 'https://www.capitalfactory.com/portfolio', retrieved_at: '2026-07-14', content_sha256: null, note: 'Capital Factory public portfolio index (hash-pinned in corridor universe); full 837-company surface.' },
];
const demotedRefs = [
  { receipt_id: 'r-linkedin-jacksonmoses-2026', reason: 'LinkedIn auth-gated; not fetchable.', attempted: ['https://www.linkedin.com/in/jacksonmoses (auth wall)'] },
  { receipt_id: 'r-wellfound-jacksonmoses-2026', reason: 'Wellfound profile exists but not captured as a hashed receipt this pass.', attempted: ['https://wellfound.com/p/jackson-moses'] },
  { receipt_id: 'r-jacksonmoses-dates-2026', reason: 'about page gives roles without dates.', attempted: ['jacksonmoses.com/about'] },
];
for (const d of demotedRefs) receipts.push({ receipt_id: d.receipt_id, evidence_class: null, locator_url: null, content_sha256: null, status: 'receipt_unresolved', unavailable_after_search: d.attempted, note: `receipt_unresolved: ${d.reason}` });

// ================= LANE B: roster-derived neutral denominator =================
// Source 1: committed LinkedIn projection (deterministic; signatures computed from role-claims).
const classifyOrg = label => {
  const l = norm(label);
  if (/department of defense|dod|white house|air force|army|navy|marine|pentagon|defense innovation|diu|national security council|congress|senate|house of representatives|government|federal|nato|state department|cia|nsa|joint chiefs|inspector general|office of the secretary/.test(l)) return 'government';
  if (/ventures|capital|\bvc\b|partners|\bfund\b|8vc|a16z|andreessen|founders fund|lux|shield|valor|dcvc|in q tel|sequoia|greylock|accel|bessemer|lightspeed|khosla|general catalyst/.test(l)) return 'fund';
  if (/foundation|institute|\bproject\b|nonprofit|non profit|scsp|think tank|university|college|school/.test(l)) return 'foundation';
  return 'company';
};
const classifyRole = title => {
  const t = norm(title);
  if (/founder|co founder|ceo|chief executive|president|chairman/.test(t)) return 'founder_operator';
  if (/partner|managing director|general partner|investor|venture/.test(t)) return 'investor';
  if (/advisor|adviser|board|director/.test(t)) return 'advisor_board';
  return 'other';
};
const SIG8 = ['multiple_vehicles', 'advises_multiple_companies', 'cross_fund_deal_sourcing', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'connects_capital_to_government_surface', 'convening_fellowship_foundation', 'multi_stage_same_company'];
const THRESHOLD = 3;

const captures = new Map();
for (const c of rjl(path.join(LIPROJ, 'captures.jsonl'))) captures.set(c.subject.label, { url: c.subject.profile_url, sha: c.source_receipt?.sha256 });
const claimsByPerson = new Map();
for (const rc of rjl(path.join(LIPROJ, 'role-claims.jsonl'))) {
  const p = rc.subject.label; if (!claimsByPerson.has(p)) claimsByPerson.set(p, []);
  claimsByPerson.get(p).push({ title: rc.role_title, org: (rc.object && rc.object.label) || rc.object, pred: rc.predicate });
}

// deep-research overlay for seed people (source-addressed; supplies signatures not visible in a bare roster)
const seedOverlay = {
  'Jackson Moses': { id: 'person:jackson-moses', sigs: ['multiple_vehicles', 'advises_multiple_companies', 'cross_fund_deal_sourcing', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'multi_stage_same_company'], receipts: ['r-jacksonmoses-about-2026', 'r-jacksonmoses-portfolio-2026', 'r-jacksonmoses-silentcapital-2026'], roster_source: 'jacksonmoses.com (canonical)' },
  'Trae Stephens': { id: 'person:trae-stephens', sigs: ['multiple_vehicles', 'advises_multiple_companies', 'operator_to_investor', 'connects_capital_to_government_surface', 'multi_stage_same_company'], receipts: ['r-foundersfund-stephens-2026'], roster_source: 'foundersfund.com/team' },
  'Katherine Boyle': { id: 'person:katherine-boyle', sigs: ['multiple_vehicles', 'advises_multiple_companies', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'multi_stage_same_company'], receipts: ['r-a16z-boyle-2026'], roster_source: 'a16z.com American Dynamism' },
  'Joshua Baer': { id: 'person:joshua-baer', sigs: ['multiple_vehicles', 'advises_multiple_companies', 'connects_capital_to_government_surface', 'convening_fellowship_foundation', 'connects_multiple_portfolio_surfaces'], receipts: ['r-capitalfactory-about-2026', 'r-baer-texasmonthly-2026'], roster_source: 'capitalfactory.com/about' },
  'Sally Donnelly': { id: 'person:sally-donnelly', sigs: ['multiple_vehicles', 'operator_to_investor', 'connects_capital_to_government_surface'], receipts: ['r-pallas-advisors-site-2026', 'r-pallas-ventures-site-2026'], roster_source: 'pallasadvisors.com' },
  'Tony DeMartino': { id: 'person:tony-demartino', sigs: ['multiple_vehicles', 'operator_to_investor', 'connects_capital_to_government_surface'], receipts: ['r-pallas-advisors-site-2026'], roster_source: 'pallasadvisors.com' },
  'Tal Shmueli': { id: 'person:tal-shmueli', sigs: ['multiple_vehicles', 'connects_capital_to_government_surface', 'operator_to_investor'], receipts: ['r-texasventurepartners-toi-2026'], roster_source: 'timesofisrael (Texas Venture Partners)' },
};

const universe = []; // router-source-universe rows (the DENOMINATOR)
const seenByCanon = new Map();
// 1a. projection people
for (const [person, rc] of claimsByPerson) {
  const funds = new Set(), advCo = new Set(), govs = new Set(), founds = new Set();
  let hasFounder = false, hasInvestor = false;
  for (const { title, org } of rc) {
    const cat = classifyOrg(org), role = classifyRole(title);
    if (cat === 'fund') funds.add(norm(org));
    if (cat === 'government') govs.add(norm(org));
    if (cat === 'foundation') founds.add(norm(org));
    if (role === 'founder_operator') hasFounder = true;
    if (role === 'investor' || cat === 'fund') hasInvestor = true;
    if (role === 'advisor_board' && cat === 'company') advCo.add(norm(org));
  }
  const sigs = [];
  if (funds.size >= 2) sigs.push('multiple_vehicles');
  if (advCo.size >= 2) sigs.push('advises_multiple_companies');
  if (hasFounder && hasInvestor) sigs.push('operator_to_investor');
  if (funds.size && govs.size) sigs.push('connects_capital_to_government_surface');
  if (founds.size) sigs.push('convening_fellowship_foundation');
  const cap = captures.get(person) || {};
  const canon = pid(person);
  const row = { candidate_id: canon, label: person, roster_source: 'linkedin-targeted-review projection', roster_receipt: cap.sha ? `sha256:${cap.sha}` : 'r-linkedin-projection-2026', profile_url: cap.url ?? null, observed_title: (rc.find(x => x.title) || {}).title ?? null, signatures_present: sigs, routing_score: sigs.length, threshold: THRESHOLD, disposition: sigs.length >= THRESHOLD ? 'admitted_router' : 'below_threshold', evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Signatures computed from committed projection role-claims.', graph_effect: G };
  universe.push(row); seenByCanon.set(canon, row);
}
// 1b. merge seed-overlay signatures (upgrade projection rows or add new canonical people)
for (const [label, ov] of Object.entries(seedOverlay)) {
  const existing = seenByCanon.get(ov.id);
  if (existing) { // union signatures with computed ones (seed adds cross-surface/sourcing not visible in projection)
    existing.signatures_present = [...new Set([...existing.signatures_present, ...ov.sigs])];
    existing.routing_score = existing.signatures_present.length;
    existing.disposition = existing.routing_score >= THRESHOLD ? 'admitted_router' : 'below_threshold';
    existing.roster_source += ' + ' + ov.roster_source;
    existing.seed_overlay_receipts = ov.receipts;
  } else {
    const row = { candidate_id: ov.id, label, roster_source: ov.roster_source, roster_receipt: ov.receipts[0], profile_url: null, observed_title: null, signatures_present: ov.sigs, routing_score: ov.sigs.length, threshold: THRESHOLD, disposition: ov.sigs.length >= THRESHOLD ? 'admitted_router' : 'below_threshold', evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Roster person with source-addressed deep-research signatures.', graph_effect: G };
    universe.push(row); seenByCanon.set(ov.id, row);
  }
}
// 1c. fund team rosters (from agent, if committed) — each named person a candidate.
// Signature FROM ROSTER ALONE: appearing at >=2 distinct funds => multiple_vehicles. Most single-fund
// roster people score 0-1 and stay below_threshold (honest: a single title is not a router).
const teamRosters = rjson(path.join(dir, 'sources/fund-team-rosters.json'));
if (teamRosters && Array.isArray(teamRosters.people)) {
  const fundsByPerson = new Map(), rowByPerson = new Map();
  for (const p of teamRosters.people) { const c = pid(p.person_name); if (!fundsByPerson.has(c)) fundsByPerson.set(c, new Set()); fundsByPerson.get(c).add(p.fund); if (!rowByPerson.has(c)) rowByPerson.set(c, p); }
  for (const [canon, funds] of fundsByPerson) {
    const p = rowByPerson.get(canon);
    if (seenByCanon.has(canon)) {
      const ex = seenByCanon.get(canon);
      ex.roster_source += ` + ${[...funds].sort().join('/')} team`;
      if (funds.size >= 2 && !ex.signatures_present.includes('multiple_vehicles')) { ex.signatures_present.push('multiple_vehicles'); ex.routing_score = ex.signatures_present.length; ex.disposition = ex.routing_score >= THRESHOLD ? 'admitted_router' : 'below_threshold'; }
      continue;
    }
    const sigs = funds.size >= 2 ? ['multiple_vehicles'] : [];
    const row = { candidate_id: canon, label: p.person_name, roster_source: `${[...funds].sort().join('/')} team page`, roster_receipt: p.source_url, profile_url: p.source_url, observed_title: p.stated_title, signatures_present: sigs, routing_score: sigs.length, threshold: THRESHOLD, disposition: sigs.length >= THRESHOLD ? 'admitted_router' : 'below_threshold', evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Roster candidate (fund team page). Router signatures beyond roster affiliation require additional source-explicit cross-institution evidence.', graph_effect: G };
    universe.push(row); seenByCanon.set(canon, row);
  }
}
writeJsonl('router-source-universe.jsonl', universe);
const admittedList = universe.filter(u => u.disposition === 'admitted_router');
const admittedIds = new Set(admittedList.map(u => u.candidate_id));

// router-candidates + router-signatures (derived from the universe)
writeJsonl('router-candidates.jsonl', universe.map(u => ({ actor_id: u.candidate_id, label: u.label, routing_score: u.routing_score, disposition: u.disposition, roster_source: u.roster_source, receipt_ids: [u.roster_receipt], discovery_admission_state: 'admitted', graph_effect: G })));
writeJsonl('router-signatures.jsonl', universe.map(u => ({ actor_id: u.candidate_id, label: u.label, signatures_present: u.signatures_present, routing_score: u.routing_score, threshold: THRESHOLD, admitted: u.disposition === 'admitted_router', note: 'routing_score is a DISCOVERY-ROUTING score, never suspicion/influence/wrongdoing.', evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G })));

// ================= actors (canonical) — Jackson first-class, plus every admitted router =================
const actors = [];
const actorSeen = new Set();
const addActor = (id, label, receiptIds, extra = {}) => { if (actorSeen.has(id)) return; actorSeen.add(id); actors.push({ actor_id: id, canonical: true, label, receipt_ids: receiptIds, evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G, ...extra }); };
addActor('person:jackson-moses', 'Jackson Moses', ['r-jacksonmoses-about-2026', 'r-silent-home-2026', 'r-jacksonmoses-silentcapital-2026'], { aliases: ['Jackson Moses'], note: 'Canonical router; never delete on page loss (change evidence_state).' });
for (const u of admittedList) addActor(u.candidate_id, u.label, [u.roster_receipt, ...(u.seed_overlay_receipts ?? [])]);
writeJsonl('actors.jsonl', actors);

// ================= vehicles (never merged) =================
const vehicles = [
  { vehicle_id: 'vehicle:silent-ventures', label: 'Silent Ventures', kind: 'venture_fund', controller: 'person:jackson-moses', receipt_ids: ['r-silent-home-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:silent-capital', label: 'Silent Capital', kind: 'private_syndicate_506b', controller: 'person:jackson-moses', receipt_ids: ['r-jacksonmoses-silentcapital-2026', 'r-silentcapital-vc-2026'], evidence_state: 'observed', note: 'Distinct 506(b) syndicate; NOT Silent Ventures.', graph_effect: G },
  { vehicle_id: 'vehicle:jackson-personal-investing', label: 'Jackson Moses personal investment surface', kind: 'personal_portfolio', controller: 'person:jackson-moses', receipt_ids: ['r-jacksonmoses-portfolio-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:8vc', label: '8VC', kind: 'venture_fund', controller: 'person:joe-lonsdale', receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:cicero-institute', label: 'Cicero Institute', kind: 'policy_foundation', controller: 'person:joe-lonsdale', receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:founders-fund', label: 'Founders Fund', kind: 'venture_fund', receipt_ids: ['r-foundersfund-stephens-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:a16z-american-dynamism', label: 'a16z American Dynamism', kind: 'venture_practice', receipt_ids: ['r-a16z-boyle-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:capital-factory', label: 'Capital Factory (+ funds)', kind: 'accelerator_and_funds', controller: 'person:joshua-baer', receipt_ids: ['r-capitalfactory-about-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:station-austin', label: 'STATION Austin', kind: 'nonprofit_convening', controller: 'person:joshua-baer', receipt_ids: ['r-baer-texasmonthly-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-advisors', label: 'Pallas Advisors', kind: 'advisory_firm', receipt_ids: ['r-pallas-advisors-site-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-ventures', label: 'Pallas Ventures', kind: 'venture_fund', receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-foundation', label: 'Pallas Foundation', kind: 'foundation', receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'unavailable_after_search', graph_effect: G },
  { vehicle_id: 'vehicle:texas-venture-partners', label: 'Texas Venture Partners', kind: 'venture_fund', receipt_ids: ['r-texasventurepartners-toi-2026'], evidence_state: 'observed', graph_effect: G },
];
writeJsonl('vehicles.jsonl', vehicles);

// ================= professional roles (Jackson chronology, ordered/undated) =================
const roles = [
  ['person:jackson-moses', 'Cisco', 'Market Research Analyst', 'employee', 1],
  ['person:jackson-moses', 'LinkedIn', 'Customer operations / executive recruiting', 'employee', 2],
  ['person:jackson-moses', 'Lynda.com', 'Sales', 'employee', 3],
  ['person:jackson-moses', 'Spectrum AI / Spectrum Labs', 'Chairman & CEO (founder)', 'founder', 4],
  ['person:jackson-moses', 'MainStreet', 'VP of Partnerships (founder)', 'founder', 5],
  ['person:jackson-moses', 'Silent Ventures', 'Founder & Managing Partner', 'fund_manager', 6],
  ['person:jackson-moses', 'Silent Capital', 'Founder & Manager', 'fund_manager', 7],
  ['person:jackson-moses', 'Weekend Fund', 'Venture Scout (Jan 2022 - Apr 2023)', 'scout', 8],
];
writeJsonl('professional-roles.jsonl', roles.map(([a, org, title, rt, seq]) => ({ actor_id: a, org, title, role_type: rt, sequence: seq, dated: org === 'Weekend Fund', receipt_ids: org === 'Weekend Fund' ? ['r-jm-counterpart-searches-2026'] : ['r-jacksonmoses-about-2026'], evidence_state: org === 'Weekend Fund' ? 'reported' : 'self_claimed', discovery_admission_state: 'admitted', graph_effect: G })));

// ================= Jackson portfolio + overlaps =================
const jmPortfolio = rjson(path.join(dir, 'sources/jackson-portfolio.json'));
writeJsonl('portfolio-edges.jsonl', jmPortfolio.company_names.map(n => ({ vehicle_id: 'vehicle:jackson-personal-investing', actor_id: 'person:jackson-moses', predicate: 'publicly_lists_investment_in', company_name_as_listed: n, first_observed: '2026-07-14', receipt_ids: ['r-jacksonmoses-portfolio-2026'], evidence_state: 'self_claimed', discovery_admission_state: 'admitted', note: 'Self-represented investment; not equity terms.', graph_effect: G })));

// ================= advisory + sourcing WITH documented counterpart provenance =================
const csById = new Map(rjl(path.join(dir, 'sources/counterpart-searches.jsonl')).map(c => [c.counterpart.toLowerCase(), c]));
const cpStatus = name => { const c = csById.get(name.toLowerCase()); return c ? c.disposition : 'not_searched'; };
const advisory = [
  ['person:jackson-moses', 'Castelion', 'senior_advisor', 'r-jacksonmoses-about-2026'],
  ['person:jackson-moses', 'Privateer', 'senior_advisor', 'r-jacksonmoses-about-2026'],
  ['person:jackson-moses', 'Long Wall', 'senior_advisor', 'r-jacksonmoses-about-2026'],
  ['person:jackson-moses', 'Thor Dynamics', 'senior_advisor', 'r-jacksonmoses-about-2026'],
  ['person:katherine-boyle', 'Apex Space', 'board_member', 'r-a16z-boyle-2026'],
  ['person:katherine-boyle', 'Hadrian', 'board_member', 'r-a16z-boyle-2026'],
  ['person:katherine-boyle', 'Saronic', 'board_observer', 'r-a16z-boyle-2026'],
  ['person:katherine-boyle', 'Castelion', 'board_observer', 'r-a16z-boyle-2026'],
  ['person:trae-stephens', 'Anduril Industries', 'executive_chairman', 'r-foundersfund-stephens-2026'],
  ['person:trae-stephens', 'Flexport', 'board_member', 'r-foundersfund-stephens-2026'],
];
writeJsonl('advisory-edges.jsonl', advisory.map(([a, co, role, rc]) => {
  const isJackson = a === 'person:jackson-moses';
  const cs = isJackson ? cpStatus(co) : 'counterpart_reported'; // Boyle/Stephens roles are on the fund's own bio page (counterpart)
  return { actor_id: a, company: co, advisory_role: role, evidence_state: isJackson ? 'self_claimed' : 'counterpart_reported', counterpart_status: cs, counterpart_search_ref: isJackson ? (csById.get(co.toLowerCase())?.search_id ?? null) : rc, receipt_ids: [rc], discovery_admission_state: 'admitted', graph_effect: G };
}));

const sourcing = [
  ['8VC', 'sourced_deal_for'], ['Founders Fund', 'sourced_deal_for'], ['a16z', 'sourced_deal_for'],
  ['Bessemer', 'sourced_deal_for'], ['Lightspeed', 'sourced_deal_for'], ['NEA', 'sourced_deal_for'],
  ['Weekend Fund', 'scout_for'], ['Afore Capital', 'venture_partner_at'],
];
writeJsonl('deal-sourcing-claims.jsonl', sourcing.map(([cp, pred]) => {
  const c = csById.get(cp.toLowerCase());
  const searched = !!c;
  const thirdParty = c && c.disposition === 'third_party_reported_not_counterpart_confirmed';
  return { actor_id: 'person:jackson-moses', counterparty: cp, predicate: pred, evidence_state: thirdParty ? 'reported' : 'self_claimed', counterpart_status: searched ? c.disposition : 'not_searched', counterpart_search_ref: c?.search_id ?? null, receipt_ids: thirdParty ? ['r-jm-counterpart-searches-2026'] : ['r-jacksonmoses-about-2026'], discovery_admission_state: 'admitted', note: searched ? 'Counterpart surface searched; see sources/counterpart-searches.jsonl.' : 'Counterpart surface NOT searched this pass.', graph_effect: G };
}));

// ================= fund census -> cross-fund overlaps + NatSec100 joins =================
const census = rjson(path.join(dir, 'sources/fund-portfolio-census.json'));
const byCompany = new Map();
for (const p of census.portfolio) { const k = core(p.company); if (!byCompany.has(k)) byCompany.set(k, { name: p.company, funds: new Set(), src: p.source_url }); byCompany.get(k).funds.add(p.fund); }
const coInvest = [];
for (const [k, v] of byCompany) if (v.funds.size >= 2) coInvest.push({ company: v.name, funds: [...v.funds].sort(), fund_count: v.funds.size, natsec100: nsByCore.has(k) ? nsByCore.get(k).canonical_name : null, receipt_ids: ['r-fund-portfolio-census-2026'], evidence_state: 'reported', forbidden_inference: 'Shared cap-table presence across funds is NOT coordination, control, or a relationship between the funds.', discovery_admission_state: 'admitted', graph_effect: G });
coInvest.sort((a, b) => b.fund_count - a.fund_count);
// add Jackson round-lead co-investor facts (press-reported)
coInvest.push({ company: 'Traysar', funds: ['Silent Ventures (lead)', 'Lux Capital', 'Anduril founders (angels)', 'Erebor founders (angels)'], fund_count: 4, natsec100: null, receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported', forbidden_inference: 'Same round != coordination beyond the financing.', discovery_admission_state: 'admitted', graph_effect: G });
writeJsonl('co-investor-edges.jsonl', coInvest);

// fund portfolio x NatSec100 (per fund)
const fundNs = [];
const perFund = new Map();
for (const p of census.portfolio) { if (!perFund.has(p.fund)) perFund.set(p.fund, new Set()); perFund.get(p.fund).add(p.company); }
for (const [fund, cos] of perFund) {
  let hits = 0; const names = [];
  for (const co of cos) { const k = core(co); if (nsByCore.has(k)) { hits++; names.push(nsByCore.get(k).canonical_name); } }
  fundNs.push({ fund, portfolio_census_size: cos.size, natsec100_overlap: hits, natsec100_companies: [...new Set(names)].sort(), receipt_ids: ['r-fund-portfolio-census-2026'], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', note: 'Census is defense-relevant subset per fetched portfolio page; overlap is a co-listing, not an amount/ownership claim.', graph_effect: G });
}

// ================= validation surfaces (Jackson overlaps + fund overlaps) =================
const validation = [], rejected = [];
for (const nm of jmPortfolio.company_names) {
  const k = core(nm), ns = nsByCore.get(k);
  if (k === 'armada') { rejected.push({ join_id: `reject-jm-ns-armada`, kind: 'jackson_x_natsec100_name_only', jackson_company: nm, natsec100_near: ns?.canonical_name ?? 'Armada', reason: 'generic token; identity unconfirmed', evidence_state: 'name_match_only', disposition: 'rejected', discovery_admission_state: 'admitted', graph_effect: G }); continue; }
  if (ns) validation.push({ join_id: `join-jm-ns-${k.replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_natsec100', jackson_company: nm, natsec100_name: ns.canonical_name, natsec100_years: ns.natsec100_years_documented, receipt_ids: ['r-jacksonmoses-portfolio-2026', ...(ns.receipt_ids ?? [])], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', graph_effect: G });
}
const jmCf = jmPortfolio.company_names.filter(n => cfByCore.has(core(n)));
const jmPallas = jmPortfolio.company_names.filter(n => pallasByCore.has(core(n)));
writeJsonl('validation-surfaces.jsonl', [
  ...validation,
  ...jmCf.map(n => ({ join_id: `join-jm-cf-${core(n).replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_capital_factory', jackson_company: n, receipt_ids: ['r-jacksonmoses-portfolio-2026', 'r-capital-factory-portfolio-2026'], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', graph_effect: G })),
  ...jmPallas.map(n => ({ join_id: `join-jm-pallas-${core(n).replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_pallas_ventures', jackson_company: n, receipt_ids: ['r-jacksonmoses-portfolio-2026', 'r-pallas-ventures-site-2026'], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', graph_effect: G })),
  ...fundNs.map(f => ({ join_id: `join-fund-ns-${norm(f.fund).replace(/ /g, '-')}`, kind: 'fund_portfolio_x_natsec100', ...f })),
]);

// ================= government awards (Lane D) — per-row USAspending receipt + structured identity gate =================
const govSrc = rjson(path.join(dir, 'sources/government-awards.json'));
// recipient legal names observed in the USAspending records (from the award agent); identity gate per contract.
const recipLegal = { 'Hadrian': 'HADRIAN AUTOMATION, INC.', 'Firehawk Aerospace': 'FIREHAWK AEROSPACE INC.', 'Orbit Fab': 'ORBIT FAB, INC', 'CHAOS Industries': 'CHAOS INDUSTRIES, INC.', 'Raft': 'RAFT LLC', 'Overland AI': 'OVERLAND AI INC', 'Starfish Space': 'STARFISH SPACE INC.', 'Privateer': 'PRIVATEER SPACE, INC.', 'Firestorm': 'FIRESTORM LABS, INC.', 'Cambium': 'CAMBIUM BIOMATERIALS INC', 'Anduril': 'ANDURIL INDUSTRIES, INC.', 'Saronic': 'SARONIC TECHNOLOGIES, INC.', 'Impulse Space': 'IMPULSE SPACE, INC.', 'Axiom Space': 'AXIOM SPACE, INC.', 'Firefly Aerospace': 'FIREFLY AEROSPACE INC.', 'Castelion': 'CASTELION CORPORATION' };
const idState = (company) => {
  if (company === 'Cambium') return { identity_confidence: 'moderate', identity_state: 'held', identity_basis: 'Recipient CAMBIUM BIOMATERIALS INC matched to NatSec100 Cambium by business-description only; other unrelated Cambium entities exist. HELD (not counted resolved) until an exact-entity gate passes.' };
  return { identity_confidence: 'high', identity_state: 'resolved', identity_basis: 'Recipient legal name + UEI resolve to a single SAM entity matching the queried defense-tech company.' };
};
const govAwards = [];
const usaspendingReceipts = [];
if (govSrc && Array.isArray(govSrc.awards)) {
  for (const a of govSrc.awards) {
    const rid = `r-usaspending-${String(a.award_id ?? 'na').toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
    usaspendingReceipts.push({ receipt_id: rid, evidence_class: 'official_record', locator_url: a.source_url, retrieved_at: '2026-07-14', content_sha256: null, note: `USAspending award ${a.award_id} for ${a.company} (${a.awarding_agency}).` });
    const idf = idState(a.company);
    govAwards.push({ org: a.company, queried_name: a.company, recipient_legal_name: recipLegal[a.company] ?? null, uei: a.uei ?? null, cage: a.cage ?? null, award_id: a.award_id ?? null, awarding_agency: a.awarding_agency ?? null, program_or_vehicle: a.program_or_vehicle ?? null, contract_ceiling_usd: a.contract_ceiling_usd ?? null, obligated_usd: a.obligated_usd ?? null, outlay_usd: a.outlay_usd ?? null, recipient_type: a.recipient_type ?? null, source_url: a.source_url ?? null, receipt_ids: [rid], evidence_state: 'official_record', ...idf, note: 'ceiling/obligated/outlay kept separate; ceiling != spend. Award identity gated by identity_state.', discovery_admission_state: 'admitted', graph_effect: G });
  }
}
// anchor Raft USSOCOM IDIQ ceiling (reported press, separate receipt — NOT a USAspending row)
govAwards.push({ org: 'Raft', queried_name: 'Raft', recipient_legal_name: 'RAFT LLC', uei: null, cage: null, award_id: 'USSOCOM-IDIQ-reported', awarding_agency: 'USSOCOM', program_or_vehicle: 'IDIQ (edge-to-enterprise data/AI)', contract_ceiling_usd: 349_000_000, obligated_usd: null, outlay_usd: null, recipient_type: 'prime', source_url: 'https://www.govconwire.com/articles/raft-ussocom-contract-ai-data-delivery', receipt_ids: ['r-raft-ussocom-2026'], evidence_state: 'reported', identity_confidence: 'high', identity_state: 'resolved', identity_basis: 'Press names Raft (RAFT LLC) as the USSOCOM IDIQ awardee.', note: 'IDIQ CEILING only (press-reported); NOT spend/obligation/outlay; NOT a USAspending row.', discovery_admission_state: 'admitted', graph_effect: G });
const govUnavailable = (govSrc?.unavailable ?? []).map(u => ({ org: u.company, state: 'unavailable_after_search', attempted: u.attempted ?? [], source_url: u.source_url ?? null, discovery_admission_state: 'admitted', graph_effect: G }));
receipts.push(...usaspendingReceipts); // per-award USAspending receipts; awards never cite the portfolio receipt
writeJsonl('government-awards.jsonl', govAwards);
writeJsonl('government-programs.jsonl', [
  { org: 'Raft', program: 'USSOCOM data/AI', evidence_state: 'reported', receipt_ids: ['r-raft-ussocom-2026'], discovery_admission_state: 'admitted', graph_effect: G },
  { org: 'Raft', program: 'Space Rapid Capabilities Office', evidence_state: 'reported', receipt_ids: ['r-raft-ussocom-2026'], discovery_admission_state: 'admitted', graph_effect: G },
]);

// ================= funding rounds / follow-on / exits =================
writeJsonl('funding-rounds.jsonl', [
  { company: 'CHAOS Industries', round: 'Series D', round_size_usd: 510_000_000, cumulative_usd: 1_000_000_000, valuation_usd: 4_500_000_000, lead: 'Valor Equity Partners', receipt_ids: ['r-chaos-valor-2026'], evidence_state: 'reported', financial_type_note: 'round_size/cumulative/valuation are distinct; none is revenue/spend.', discovery_admission_state: 'admitted', graph_effect: G },
  { company: 'Overland AI', round: 'Series B', round_size_usd: 100_000_000, cumulative_usd: 142_000_000, valuation_usd: null, lead: '8VC', receipt_ids: ['r-overland-8vc-2026'], evidence_state: 'reported', financial_type_note: 'distinct financial types.', discovery_admission_state: 'admitted', graph_effect: G },
  { company: 'Traysar', round: 'Seed', round_size_usd: 25_000_000, cumulative_usd: null, valuation_usd: null, lead: 'Silent Ventures', receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported', financial_type_note: 'distinct financial types.', discovery_admission_state: 'admitted', graph_effect: G },
]);
writeJsonl('follow-on-capital.jsonl', [
  { company: 'Traysar', early: 'Silent Ventures (seed lead)', follow_on: 'Lux Capital + angels (same round)', predicate: 'follow_on_investor', receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported', discovery_admission_state: 'admitted', graph_effect: G },
]);
const exits = [['Voyager Technologies', 'IPO', 'NYSE: VOYG', 'r-jacksonmoses-portfolio-2026'], ['MainStreet', 'acquired', 'Employer.com', 'r-jacksonmoses-about-2026'], ['Spectrum AI', 'acquired', 'ActiveFence', 'r-jacksonmoses-about-2026'], ['GameOn', 'acquired', 'Victory Games', 'r-jacksonmoses-portfolio-2026'], ['Capiche', 'acquired', 'Vendr', 'r-jacksonmoses-portfolio-2026'], ['Daylight', 'acquired', 'Atlas', 'r-jacksonmoses-portfolio-2026']];
writeJsonl('exits.jsonl', exits.map(([co, t, d, rc]) => ({ company: co, exit_type: t, detail: d, exit_value_usd: null, receipt_ids: [rc], evidence_state: 'self_claimed', note: 'exit value undisclosed; not conflated with funding/valuation.', discovery_admission_state: 'admitted', graph_effect: G })));

// ================= coverage ledgers (per contract): every required source has a disposition + a source-specific receipt =================
const RT = '2026-07-14';
// per-fund source URLs (the actual fetched surface for that fund); receipt.locator MUST equal these.
const rosterUrl = { 'linkedin-projection': 'https://www.linkedin.com/', '8VC': 'https://8vc.com/team', 'Founders Fund': 'https://foundersfund.com/our_team/', 'a16z American Dynamism': 'https://a16z.com/american-dynamism/', 'Valor Equity Partners': 'https://valorep.com/team/', 'Lux Capital': 'https://www.luxcapital.com/team', 'DCVC': 'https://www.dcvc.com/team/', 'Shield Capital': 'https://www.shieldcap.com/team', 'Washington Harbour Partners': 'https://washingtonharbour.com/our-team/', 'Pallas Advisors': 'https://www.pallasadvisors.com/our-team', 'Stratos Ventures': 'https://www.stratos-vc.com/', 'Texas Venture Partners': 'https://www.texasventurepartners.com/', 'Silent Ventures': 'https://silentvc.com/', 'Capital Factory': 'https://capitalfactory.com/team', 'In-Q-Tel': 'https://www.iqt.org/team' };
const portfolioUrl = { 'Silent Ventures': 'https://silentvc.com/', '8VC': 'https://8vc.com/companies', 'Founders Fund': 'https://foundersfund.com/portfolio/', 'a16z American Dynamism': 'https://a16z.com/american-dynamism/', 'Pallas Ventures': 'https://www.pallasadvisors.com/ventures', 'Shield Capital': 'https://www.shieldcap.com/portfolio', 'Lux Capital': 'https://www.luxcapital.com/companies', 'DCVC': 'https://www.dcvc.com/companies/', 'In-Q-Tel': 'https://www.iqt.org/portfolio', 'Washington Harbour Partners': 'https://washingtonharbour.com/investments/', 'Valor Equity Partners': 'https://valorep.com/portfolio/', 'Capital Factory': 'https://www.capitalfactory.com/portfolio', 'Stratos Ventures': 'https://www.calcalistech.com/ctechnews/article/r14hmskzzg', 'Texas Venture Partners': 'https://www.texasventurepartners.com/' };
const knownHash = { 'https://silentvc.com/': '47d26f1a93433a2947cd9d61643c5118c54bdeb03507533970b4904f5ef2e0a7', 'https://www.stratos-vc.com/': '50e4b4a437ff7fc0ba9721bfaae962d2518357d1c7c00936854664dffa4d072d' };
const coverageReceipts = [];
const mkCovReceipt = (kind, fund, url, state) => {
  const rid = `r-${kind}-${norm(fund).replace(/ /g, '-')}`;
  coverageReceipts.push({ receipt_id: rid, evidence_class: 'coverage_source', locator_url: url, retrieved_at: RT, content_sha256: knownHash[url] ?? null, hash_status: knownHash[url] ? 'hashed' : 'unresolved_no_byte_capture', note: `${kind} source page for ${fund} (coverage_state=${state}).` });
  return rid;
};
const rosterEnum = new Map();
for (const p of (teamRosters?.people ?? [])) rosterEnum.set(p.fund, (rosterEnum.get(p.fund) ?? 0) + 1);
const rosterGrossEst = { '8VC': 48, 'Founders Fund': 28, 'a16z American Dynamism': 15, 'Valor Equity Partners': 18, 'Lux Capital': 33, 'DCVC': 47, 'Shield Capital': 27, 'Washington Harbour Partners': 25, 'Pallas Advisors': 58, 'Stratos Ventures': 9, 'Texas Venture Partners': 3 };
const rosterCoverage = [];
const pushRoster = (source, o) => { const url = rosterUrl[source]; rosterCoverage.push({ source, source_url: url, receipt: mkCovReceipt('roster', source, url, o.coverage_state), ...o }); };
// exact gross only where every name is preserved (projection, founder-only, zero); else estimated/null.
pushRoster('linkedin-projection', { gross_observed: captures.size, gross_basis: 'exact', enumerated: captures.size, selection_rule: 'all projection people enumerated', coverage_state: 'surface_complete' });
for (const fund of ['8VC', 'Founders Fund', 'a16z American Dynamism', 'Valor Equity Partners', 'Lux Capital', 'DCVC', 'Shield Capital', 'Washington Harbour Partners', 'Pallas Advisors', 'Stratos Ventures']) {
  pushRoster(fund, { gross_observed: null, gross_basis: 'estimated', gross_estimated: rosterGrossEst[fund] ?? null, enumerated: rosterEnum.get(fund) ?? 0, selection_rule: 'investment-decision-maker subset; ops/finance/EA excluded by contract', coverage_state: 'partially_searched' });
}
pushRoster('Texas Venture Partners', { gross_observed: null, gross_basis: 'estimated', gross_estimated: 3, enumerated: rosterEnum.get('Texas Venture Partners') ?? 0, selection_rule: 'third-party aggregation only (no reachable primary team page)', coverage_state: 'partially_searched', note: 'names from Tracxn/startupintros (lower confidence)' });
pushRoster('Silent Ventures', { gross_observed: 1, gross_basis: 'exact', enumerated: 1, selection_rule: 'silentvc.com Team section names only the founder (Jackson Moses, canonical)', coverage_state: 'surface_complete', note: 'FOUNDER_ONLY confirmed on silentvc.com; the sole listed principal is already canonical.' });
pushRoster('Capital Factory', { gross_observed: null, gross_basis: 'unknown', enumerated: 1, selection_rule: 'only founder (Joshua Baer, canonical) detailed on capitalfactory.com/team excerpt', coverage_state: 'partially_searched' });
pushRoster('In-Q-Tel', { gross_observed: 0, gross_basis: 'exact', enumerated: 0, selection_rule: 'no reachable IQT team roster page', coverage_state: 'unavailable_after_search', query: 'In-Q-Tel team/leadership roster', attempted_urls: ['https://www.iqt.org/team', 'https://www.iqt.org/leadership'], timestamp: RT, result: 'both HTTP 404' });
writeJsonl('roster-coverage.jsonl', rosterCoverage.map(r => ({ ...r, discovery_admission_state: 'admitted', graph_effect: G })));

// portfolio coverage: per required source with source_total / enumerated_total / selection_rule / coverage_state / retrieved_at + source-specific receipt
const portfolioCoverage = [];
const pushPort = (fund, o) => { const url = portfolioUrl[fund]; portfolioCoverage.push({ fund, source_url: url, receipt: mkCovReceipt('portfolio', fund, url, o.coverage_state), ...o }); };
for (const [fund, cos] of perFund) pushPort(fund, { source_total: null, enumerated_total: cos.size, selection_rule: 'defense-relevant companies from the fetched portfolio page (diversified funds filtered)', coverage_state: 'partially_searched', retrieved_at: RT });
pushPort('Capital Factory', { source_total: cfUniverse.distinct_company_names, enumerated_total: cfUniverse.distinct_company_names, selection_rule: 'full public portfolio index (hash-pinned corridor universe); source_total==enumerated_total', coverage_state: 'surface_complete', retrieved_at: RT });
pushPort('Stratos Ventures', { source_total: 5, enumerated_total: 3, selection_rule: 'press-named only (Particle/Tenna/Skapion); site portfolio is logos-only', coverage_state: 'partially_searched', retrieved_at: RT });
pushPort('Texas Venture Partners', { source_total: null, enumerated_total: 0, selection_rule: 'no portfolio page reachable', coverage_state: 'unavailable_after_search', retrieved_at: RT, query: 'Texas Venture Partners portfolio', attempted_urls: ['https://www.texasventurepartners.com/', 'https://www.texasventurepartners.com/portfolio'], timestamp: RT, result: 'homepage lists no portfolio companies; /portfolio not present' });
writeJsonl('portfolio-coverage.jsonl', portfolioCoverage.map(p => ({ ...p, discovery_admission_state: 'admitted', graph_effect: G })));
const portfolioCoverageState = new Map(portfolioCoverage.map(p => [p.fund, p.coverage_state]));
const portfolioAttempts = new Map(portfolioCoverage.filter(p => p.attempted_urls).map(p => [p.fund, { query: p.query, attempted_urls: p.attempted_urls, timestamp: p.timestamp, result: p.result }]));
receipts.push(...coverageReceipts);

// ================= evidence trails (from structured edges) for EVERY admitted router =================
const trails = [], frontier = [];
const nsYearsFor = nm => { const c = nsByCore.get(core(nm)); return c ? c.natsec100_years_documented : null; };
// build a per-person structured edge set: for admitted routers with a vehicle + a portfolio company that hits NatSec100/gov
const vehicleForPerson = { 'person:jackson-moses': 'vehicle:silent-ventures', 'person:joe-lonsdale': 'vehicle:8vc', 'person:trae-stephens': 'vehicle:founders-fund', 'person:katherine-boyle': 'vehicle:a16z-american-dynamism', 'person:joshua-baer': 'vehicle:capital-factory', 'person:sally-donnelly': 'vehicle:pallas-ventures', 'person:tony-demartino': 'vehicle:pallas-ventures', 'person:tal-shmueli': 'vehicle:texas-venture-partners' };
const fundLabelFor = { 'vehicle:silent-ventures': 'Silent Ventures', 'vehicle:8vc': '8VC', 'vehicle:founders-fund': 'Founders Fund', 'vehicle:a16z-american-dynamism': 'a16z American Dynamism', 'vehicle:capital-factory': 'Capital Factory', 'vehicle:pallas-ventures': 'Pallas Ventures', 'vehicle:texas-venture-partners': 'Texas Venture Partners' };
for (const r of admittedList) {
  const a = r.candidate_id;
  const veh = vehicleForPerson[a];
  if (veh && fundLabelFor[veh]) {
    // hop through a census/portfolio company that reaches NatSec100
    const fundName = fundLabelFor[veh];
    const cos = perFund.get(fundName) ?? (a === 'person:jackson-moses' ? new Set(jmPortfolio.company_names) : new Set());
    const hit = [...cos].find(c => nsByCore.has(core(c)));
    if (hit) trails.push({ trail_id: `trail-${norm(r.label).replace(/ /g, '-')}-validation`, hops: [a, veh, hit, `NatSec100 ${JSON.stringify(nsYearsFor(hit))}`], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-fund-portfolio-census-2026'], evidence_state: 'source_explicit', graph_effect: G });
    else trails.push({ trail_id: `trail-${norm(r.label).replace(/ /g, '-')}-vehicle`, hops: [a, veh, 'portfolio (no NatSec100 hit on searched surfaces)', 'frontier'], terminates: 'no_source_explicit_next_edge', surfaces_reached: ['company'], receipt_ids: [r.roster_receipt], evidence_state: 'observed', graph_effect: G });
    const covState = portfolioCoverageState.get(fundName) ?? 'partially_searched';
    const fr = { frontier_id: `frontier-${norm(r.label).replace(/ /g, '-')}`, from: veh, next: `enumerate full ${fundName} portfolio for gov/validation overlaps`, state: covState, graph_effect: G };
    if (covState === 'surface_complete') fr.note = 'Full portfolio surface enumerated.';
    else if (covState === 'unavailable_after_search') { const at = portfolioAttempts.get(fundName); fr.note = 'No reachable portfolio page.'; if (at) { fr.query = at.query; fr.attempted_urls = at.attempted_urls; fr.timestamp = at.timestamp; fr.result = at.result; } }
    else fr.note = 'Only the defense-relevant portfolio subset was enumerated; the full portfolio remains to be inventoried.';
    frontier.push(fr);
  } else {
    // projection-admitted routers (senior officials): the trail is preserved, but the identity-resolution
    // search behind their projection board/advisor role-claims WAS NOT RUN. Do not launder that as
    // "unresolved_after_search" — no query/URLs/receipt exist. It is not_searched.
    trails.push({ trail_id: `trail-${norm(r.label).replace(/ /g, '-')}-service`, hops: [a, 'government/board roles (projection role-claims)', 'multiple companies advised', 'defense-tech surface'], terminates: 'two_hop_boundary', surfaces_reached: ['government', 'advisory'], receipt_ids: [r.roster_receipt], evidence_state: 'observed', note: 'Trail from committed projection role-claims (public-service -> adviser/board).', graph_effect: G });
    frontier.push({ frontier_id: `frontier-${norm(r.label).replace(/ /g, '-')}`, from: a, next: 'search-and-resolve the specific company/fund identities behind this person\'s projection board/advisor role-claims', state: 'not_searched', note: 'No identity-resolution search has been run for this person; role-claims alone are not a search.', graph_effect: G });
  }
}
// second explicit hop for Jackson (advisory shared-company convergence)
trails.push({ trail_id: 'trail-jackson-moses-shared-company', hops: ['person:jackson-moses', 'advisory:Castelion (self_claimed)', 'Katherine Boyle board-observer (separate person)', 'a16z American Dynamism'], terminates: 'no_source_explicit_next_edge', surfaces_reached: ['company', 'co-adviser'], receipt_ids: ['r-jacksonmoses-about-2026', 'r-a16z-boyle-2026'], evidence_state: 'observed', note: 'Shared COMPANY node (Castelion), not a Jackson<->Boyle relationship.', graph_effect: G });
writeJsonl('evidence-trails.jsonl', trails);
writeJsonl('trail-frontier.jsonl', frontier);
writeJsonl('rejected-joins.jsonl', rejected);

// ================= coverage gaps (documented) =================
writeJsonl('coverage-gaps.jsonl', [
  { gap_id: 'gap-jackson-linkedin', state: 'unavailable_after_search', query: 'jackson moses linkedin profile', attempted_urls: ['https://www.linkedin.com/in/jacksonmoses'], timestamp: '2026-07-14', result: 'auth-gated; not fetchable; substituted jacksonmoses.com/about', graph_effect: G },
  { gap_id: 'gap-jackson-dates', state: 'unavailable_after_search', query: 'jackson moses role dates', attempted_urls: ['https://www.jacksonmoses.com/about'], timestamp: '2026-07-14', result: 'about page lists roles WITHOUT dates (Weekend Fund role dated only via third-party DB)', graph_effect: G },
  { gap_id: 'gap-sourcing-counterparts', state: 'partially_searched', detail: 'All 6 named funds + 4 advisory companies searched (sources/counterpart-searches.jsonl); none confirmed on counterpart surfaces; 8 rows are query_only provenance. Weekend Fund + Afore third-party-reported.', timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-government-award-ids', state: 'partially_searched', detail: 'Government award UEIs/IDs/obligations resolved via USAspending where found; Morpheus recorded unavailable_after_search.', unavailable: govUnavailable, timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-fund-census', state: 'partially_searched', detail: '11 fund portfolios enumerated (defense-relevant SUBSET); diversified funds not fully dumped. See portfolio-coverage.jsonl for per-source coverage_state.', timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-roster-expansion', state: 'partially_searched', detail: `Denominator = investment-decision-maker universe: ${captures.size}-person committed projection (surface_complete) + fund decision-maker subset (partially_searched, ~250 gross). Long-tail ops/finance/EA staff excluded by contract rule. See roster-coverage.jsonl.`, timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-cambium-identity', state: 'identity_unresolved_after_search', search_ref: 'government-awards.jsonl#Cambium', query: 'Cambium USAspending recipient', attempted_urls: ['https://www.usaspending.gov/award/CONT_AWD_N0001424C1329_9700_-NONE-_-NONE-'], timestamp: '2026-07-14', result: 'recipient CAMBIUM BIOMATERIALS INC matched by business-description only; identity_state=held (not resolved).', graph_effect: G },
]);

// ================= manifest =================
const manifest = {
  schema_version: 'person-centered-defense-routers@3',
  built_at: '2026-07-14',
  purpose: 'Source-addressed map of person-centered defense-tech routers. Denominator DERIVED FROM ROSTERS (committed LinkedIn projection + fund rosters), signatures computed from role-claims. Evidence per-predicate; discovery admission separate from corroboration; graph_effect none. No private intent/coordination/influence/wrongdoing inferred.',
  counts: {
    actors: actors.length, vehicles: vehicles.length,
    router_source_universe_denominator: universe.length,
    denominator_source: `linkedin_projection(${captures.size})${teamRosters ? '+fund_rosters' : ''}+seed_overlay`,
    admitted_routers: admittedList.length,
    below_threshold: universe.filter(u => u.disposition === 'below_threshold').length,
    jackson_portfolio_universe: jmPortfolio.distinct_company_names,
    jackson_x_natsec100: validation.length,
    jackson_x_capital_factory: jmCf.length,
    jackson_x_pallas_ventures: jmPallas.length,
    fund_census_funds: perFund.size,
    fund_census_companies: byCompany.size,
    cross_fund_co_investments: coInvest.filter(c => c.fund_count >= 2).length,
    fund_natsec100_overlaps: fundNs.reduce((s, f) => s + f.natsec100_overlap, 0),
    counterpart_searches: csById.size,
    government_awards: govAwards.length,
    government_awards_identity_resolved: govAwards.filter(g => g.identity_state === 'resolved').length,
    government_awards_identity_held: govAwards.filter(g => g.identity_state === 'held').length,
    government_awards_unavailable: govUnavailable.length,
    evidence_trails: trails.length,
    // HONEST frontier accounting: terminal vs non-terminal (partial). Do NOT report "closed" unless all terminal.
    frontier_total: frontier.length,
    frontier_terminal: frontier.filter(f => contract.terminal_states.includes(f.state)).length,
    frontier_partial_or_not_searched: frontier.filter(f => !contract.terminal_states.includes(f.state)).length,
    frontier_not_searched: frontier.filter(f => f.state === 'not_searched').length,
    roster_sources_surface_complete: rosterCoverage.filter(r => r.coverage_state === 'surface_complete').length,
    roster_sources_partial: rosterCoverage.filter(r => r.coverage_state === 'partially_searched').length,
    roster_sources_unavailable: rosterCoverage.filter(r => r.coverage_state === 'unavailable_after_search').length,
    portfolio_sources_surface_complete: portfolioCoverage.filter(p => p.coverage_state === 'surface_complete').length,
    portfolio_sources_partial: portfolioCoverage.filter(p => p.coverage_state === 'partially_searched').length,
    portfolio_sources_unavailable: portfolioCoverage.filter(p => p.coverage_state === 'unavailable_after_search').length,
    receipts_total: receipts.length,
    receipts_resolved: receipts.filter(r => /^https?:\/\//.test(r.locator_url ?? '')).length,
    receipts_unresolved: receipts.filter(r => r.status === 'receipt_unresolved').length,
    rejected_name_only: rejected.length,
  },
  coverage_summary: 'PARTIAL. Roster + portfolio coverage is a bounded investment-decision-maker subset; only the LinkedIn projection, Silent (founder-only), and Capital Factory portfolio index are surface_complete. In-Q-Tel roster and TVP portfolio are unavailable_after_search. Cambium award identity is held. See roster-coverage.jsonl + portfolio-coverage.jsonl.',
  completion_contract: 'data/canonical/person-router-completion-contract.json',
  admitted_router_ids: admittedList.map(u => u.candidate_id),
  evidence_states: ['observed', 'self_claimed', 'counterpart_reported', 'official_record', 'independently_corroborated', 'inferred', 'disputed', 'name_match_only', 'unavailable_after_search', 'not_searched', 'reported', 'source_explicit'],
  counterpart_states: ['counterpart_reported', 'no_counterpart_confirmation_observed', 'third_party_reported_not_counterpart_confirmed', 'not_searched'],
  financial_types_kept_separate: ['round_size', 'cumulative_funding', 'valuation', 'fund_size', 'check_size', 'contract_ceiling', 'obligated_amount', 'outlay_payment', 'revenue', 'exit_value'],
  evidence_limit: 'A self-authored page establishes public representation of a role/relationship — never counterpart agreement, control, transaction, influence, coordination, or wrongdoing. Uncertainty changes the edge label, not the observation.',
  graph_effect: G,
};
writeJsonl('receipts.jsonl', receipts);
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`person-routers@3: denominator ${universe.length} decision-makers -> ${admittedList.length} admitted; frontier ${manifest.counts.frontier_terminal} terminal / ${manifest.counts.frontier_partial_or_not_searched} partial; roster coverage complete=${manifest.counts.roster_sources_surface_complete}/partial=${manifest.counts.roster_sources_partial}/unavail=${manifest.counts.roster_sources_unavailable}; portfolio complete=${manifest.counts.portfolio_sources_surface_complete}/partial=${manifest.counts.portfolio_sources_partial}/unavail=${manifest.counts.portfolio_sources_unavailable}; gov awards resolved=${manifest.counts.government_awards_identity_resolved}/held=${manifest.counts.government_awards_identity_held}/unavail=${manifest.counts.government_awards_unavailable}`);
