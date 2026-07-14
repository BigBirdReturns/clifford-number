#!/usr/bin/env node
// Build the person-centered defense-technology router map.
// Router = a person who publicly performs several observable cross-institution functions
// (multiple vehicles; selects/advises companies; sources deals; connects capital stages;
//  operator->investor transition; connects companies to government/validation surfaces).
// "Purpose" = publicly stated or structurally observable function. NO private intent, coordination,
// influence, or wrongdoing is inferred. Evidence state is per-predicate. graph_effect: none.
//
// Deterministic: overlaps are computed from committed universes (sources/jackson-portfolio.json,
// data/intake/natsec100-pathways/chunk1, the corridor CF/Pallas universes). Source-addressed facts
// gathered by live fetch/search (2026-07-14) are encoded inline with their receipts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/intake/person-centered-defense-routers');
const N = path.join(root, 'data/intake/natsec100-pathways');
const CORRIDOR = path.join(root, 'data/intake/austin-israel-defense-corridor');
fs.mkdirSync(dir, { recursive: true });
const readJsonl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : [];
const writeJsonl = (f, rows) => fs.writeFileSync(path.join(dir, f), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const core = s => norm(s).split(' ').filter(t => t && !['inc', 'llc', 'corp', 'technologies', 'technology', 'co', 'the', 'company', 'systems', 'labs', 'group', 'ai', 'space'].includes(t)).join(' ');
const G = 'none';

// ---------- receipts (resolved with content_sha256 where fetched; press = reported) ----------
const receipts = [
  { receipt_id: 'r-jacksonmoses-about-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/about', retrieved_at: '2026-07-14', content_sha256: 'b6a77c2f513fcdd5dbc2840e2419f493df19784cc834876a3c1e01117b892f7f', note: 'Jackson Moses bio: Cisco->LinkedIn->Lynda->Spectrum AI (Chairman/CEO, acq ActiveFence)->MainStreet (VP Partnerships, acq Employer.com)->Silent Ventures->Silent Capital; senior advisor to Castelion/Privateer/Long Wall/Thor Dynamics; deal sourcer for 8VC/Founders Fund/a16z/Bessemer/Lightspeed/NEA. REPAIRS the previously-unresolved r-jacksonmoses-about-2026.' },
  { receipt_id: 'r-jacksonmoses-portfolio-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/portfolio', retrieved_at: '2026-07-14', content_sha256: '14ef4499820cb619cb35df46fc2ded5e761b627544adf58c832bb5d60cd213d5', note: '61 named portfolio companies + exits (Voyager IPO VOYG; MainStreet, Spectrum AI, GameOn, Capiche, Daylight, Steady State acq; several shut down).' },
  { receipt_id: 'r-jacksonmoses-silentcapital-2026', evidence_class: 'primary_public', locator_url: 'https://www.jacksonmoses.com/silent-capital', retrieved_at: '2026-07-14', content_sha256: 'a9a1119282347663ec7a4d53e1a2464f019eeeb84c49fa067d490c58e454be61', note: 'Silent Capital: private syndicate, SEC Reg D 506(b), fully owned & managed by Jackson Moses; invitation-only.' },
  { receipt_id: 'r-silent-home-2026', evidence_class: 'primary_public', locator_url: 'https://silentvc.com/', retrieved_at: '2026-07-14', content_sha256: '47d26f1a93433a2947cd9d61643c5118c54bdeb03507533970b4904f5ef2e0a7', note: 'Silent Ventures site (Dallas, TX; early-stage aerospace/defense/national security). REPAIRS the previously-unresolved r-silent-home-2026.' },
  { receipt_id: 'r-silentcapital-vc-2026', evidence_class: 'primary_public', locator_url: 'https://silentcapital.vc/', retrieved_at: '2026-07-14', content_sha256: '484173060f2615fbe1e8bc7531e38d22e157701f2402930cd429dcf0ca2ef640', note: 'Silent Capital syndicate site.' },
  { receipt_id: 'r-8vc-lonsdale-2026', evidence_class: 'primary_public', locator_url: 'https://8vc.com/team/joe-lonsdale', retrieved_at: '2026-07-14', content_sha256: null, note: 'Joe Lonsdale: Founder & Managing Partner 8VC (~$6B AUM); cofounded Palantir, Addepar, OpenGov, Epirus; founded Cicero Institute (2016).' },
  { receipt_id: 'r-foundersfund-stephens-2026', evidence_class: 'primary_public', locator_url: 'https://foundersfund.com/team/trae-stephens', retrieved_at: '2026-07-14', content_sha256: null, note: 'Trae Stephens: Partner, Founders Fund (2014, gov/defense mandate); cofounder & exec chairman Anduril; board Flexport; backed Gecko Robotics, Varda.' },
  { receipt_id: 'r-a16z-boyle-2026', evidence_class: 'primary_public', locator_url: 'https://a16z.com/author/katherine-boyle/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Katherine Boyle: GP a16z, cofounder American Dynamism; boards Apex Space & Hadrian; board observer Saronic & Castelion; ex-General Catalyst (Anduril, Vannevar seed).' },
  { receipt_id: 'r-capitalfactory-about-2026', evidence_class: 'primary_public', locator_url: 'https://capitalfactory.com/about', retrieved_at: '2026-07-14', content_sha256: null, note: 'Joshua Baer founded Capital Factory (2009); multiple funds; 800+ investments; launched STATION Austin nonprofit (2026).' },
  { receipt_id: 'r-baer-texasmonthly-2026', evidence_class: 'reported', locator_url: 'https://www.texasmonthly.com/news-politics/joshua-baer-capital-factory-austin/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Joshua Baer (Capital Factory founder) died June 2026; STATION Austin carries the mission forward. Node preserved regardless of page availability.' },
  // reused corridor receipts (already committed, source-addressed)
  { receipt_id: 'r-traysar-prnewswire-2026', evidence_class: 'reported', locator_url: 'https://www.prnewswire.com/news-releases/traysar-raises-25m-seed-emerges-from-stealth-at-reindustrialize-as-the-worlds-first-subterranean-defense-tech-company-302802698.html', retrieved_at: '2026-07-14', content_sha256: null, note: 'Traysar $25M seed led by Silent Ventures; co-investors Lux Capital, Anduril founders, Erebor founders, etc.' },
  { receipt_id: 'r-raft-ussocom-2026', evidence_class: 'reported', locator_url: 'https://www.govconwire.com/articles/raft-ussocom-contract-ai-data-delivery', retrieved_at: '2026-07-14', content_sha256: null, note: 'Raft $349M USSOCOM IDIQ (contract CEILING, not spend); Space RCO $600k task under a $1B IDIQ.' },
  { receipt_id: 'r-natsec100-chunk1-2026', evidence_class: 'official', locator_url: 'https://natsec100.org/', retrieved_at: '2026-07-14', content_sha256: null, note: 'NatSec100 roster (chunk1 committed receipts R001-R016 back the 196-company universe used for overlaps).' },
];
// receipts referenced but NOT resolvable this pass -> demoted (documented, never silently dropped)
const demotedRefs = [
  { receipt_id: 'r-linkedin-jacksonmoses-2026', reason: 'LinkedIn is authentication-gated; not fetchable by this pipeline.', attempted: ['https://www.linkedin.com/in/ (auth wall)'] },
  { receipt_id: 'r-wellfound-jacksonmoses-2026', reason: 'Not located after search this pass.', attempted: ['web search: wellfound jackson moses'] },
  { receipt_id: 'r-jacksonmoses-dates-2026', reason: 'About page gives roles WITHOUT dates; operator->investor chronology is ordered but undated.', attempted: ['jacksonmoses.com/about (no dates present)'] },
];
for (const d of demotedRefs) receipts.push({ receipt_id: d.receipt_id, evidence_class: null, locator_url: null, content_sha256: null, status: 'receipt_unresolved', unavailable_after_search: d.attempted, note: `receipt_unresolved: ${d.reason}` });
writeJsonl('receipts.jsonl', receipts);
const R = id => id; // readability

// ---------- actors (person nodes; canonical, alias-preserving) ----------
const actors = [
  { actor_id: 'person:jackson-moses', canonical: true, label: 'Jackson Moses', aliases: ['Jackson Moses'], stable_ids: { site: 'jacksonmoses.com' }, receipt_ids: ['r-jacksonmoses-about-2026', 'r-silent-home-2026', 'r-jacksonmoses-silentcapital-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Canonical router node. Do not delete on page loss; change evidence_state instead.', graph_effect: G },
  { actor_id: 'person:joe-lonsdale', canonical: true, label: 'Joe Lonsdale', aliases: ['Joseph Lonsdale'], receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:trae-stephens', canonical: true, label: 'Trae Stephens', aliases: [], receipt_ids: ['r-foundersfund-stephens-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:katherine-boyle', canonical: true, label: 'Katherine Boyle', aliases: [], receipt_ids: ['r-a16z-boyle-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:joshua-baer', canonical: true, label: 'Joshua Baer', aliases: [], stable_ids: {}, receipt_ids: ['r-capitalfactory-about-2026', 'r-baer-texasmonthly-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Capital Factory founder; died June 2026 (press). Node preserved; some personal surfaces now unavailable_after_search.', graph_effect: G },
  { actor_id: 'person:sally-donnelly', canonical: true, label: 'Sally Donnelly', aliases: [], receipt_ids: ['r-pallas-advisors-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:tony-demartino', canonical: true, label: 'Tony DeMartino', aliases: ['Anthony DeMartino'], receipt_ids: ['r-pallas-advisors-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:richard-spencer', canonical: true, label: 'Richard Spencer', aliases: [], receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', note: 'Named Managing Director on Pallas Ventures page (title only from source).', graph_effect: G },
  { actor_id: 'person:rotem-kakon', canonical: true, label: 'Rotem (Yehuda) Kakon', aliases: [], receipt_ids: ['r-stratos-official-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:aviad-grinfeld', canonical: true, label: 'Aviad Grinfeld', aliases: [], receipt_ids: ['r-stratos-official-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:daniel-fouzailov', canonical: true, label: 'Daniel Fouzailov', aliases: [], receipt_ids: ['r-stratos-official-site-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
  { actor_id: 'person:tal-shmueli', canonical: true, label: 'Tal Shmueli', aliases: [], receipt_ids: ['r-texasventurepartners-toi-2026'], evidence_state: 'observed', discovery_admission_state: 'admitted', graph_effect: G },
];
writeJsonl('actors.jsonl', actors);

// ---------- vehicles (funds/syndicates/mgmt-cos/foundations; NEVER merged) ----------
const vehicles = [
  { vehicle_id: 'vehicle:silent-ventures', label: 'Silent Ventures', kind: 'venture_fund', controller: 'person:jackson-moses', hq: 'Dallas, TX', receipt_ids: ['r-silent-home-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:silent-capital', label: 'Silent Capital', kind: 'private_syndicate_506b', controller: 'person:jackson-moses', receipt_ids: ['r-jacksonmoses-silentcapital-2026', 'r-silentcapital-vc-2026'], evidence_state: 'observed', note: 'Distinct SEC 506(b) syndicate; NOT the same node as Silent Ventures.', graph_effect: G },
  { vehicle_id: 'vehicle:jackson-personal-investing', label: 'Jackson Moses personal investment surface', kind: 'personal_portfolio', controller: 'person:jackson-moses', receipt_ids: ['r-jacksonmoses-portfolio-2026'], evidence_state: 'observed', note: 'The jacksonmoses.com/portfolio surface; kept distinct from the two funds pending per-company attribution.', graph_effect: G },
  { vehicle_id: 'vehicle:8vc', label: '8VC', kind: 'venture_fund', controller: 'person:joe-lonsdale', hq: 'Austin, TX', receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:cicero-institute', label: 'Cicero Institute', kind: 'policy_foundation', controller: 'person:joe-lonsdale', receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', note: 'Lonsdale policy/convening surface; separate from 8VC.', graph_effect: G },
  { vehicle_id: 'vehicle:founders-fund', label: 'Founders Fund', kind: 'venture_fund', receipt_ids: ['r-foundersfund-stephens-2026'], evidence_state: 'observed', note: 'Trae Stephens is a partner (not sole controller).', graph_effect: G },
  { vehicle_id: 'vehicle:a16z-american-dynamism', label: 'a16z American Dynamism', kind: 'venture_practice', receipt_ids: ['r-a16z-boyle-2026'], evidence_state: 'observed', note: 'Katherine Boyle cofounded this a16z practice.', graph_effect: G },
  { vehicle_id: 'vehicle:capital-factory', label: 'Capital Factory (+ funds)', kind: 'accelerator_and_funds', controller: 'person:joshua-baer', hq: 'Austin, TX', receipt_ids: ['r-capitalfactory-about-2026', 'r-capital-factory-portfolio-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:station-austin', label: 'STATION Austin', kind: 'nonprofit_convening', controller: 'person:joshua-baer', receipt_ids: ['r-capitalfactory-about-2026', 'r-baer-texasmonthly-2026'], evidence_state: 'observed', note: 'Capital Factory nonprofit arm; separate node.', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-advisors', label: 'Pallas Advisors', kind: 'advisory_firm', receipt_ids: ['r-pallas-advisors-site-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-ventures', label: 'Pallas Ventures', kind: 'venture_fund', receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:pallas-foundation', label: 'Pallas Foundation', kind: 'foundation', receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'unavailable_after_search', note: 'Nav-named; no detail page acquired.', graph_effect: G },
  { vehicle_id: 'vehicle:stratos-ventures', label: 'Stratos Ventures', kind: 'venture_fund', receipt_ids: ['r-stratos-official-site-2026'], evidence_state: 'observed', graph_effect: G },
  { vehicle_id: 'vehicle:texas-venture-partners', label: 'Texas Venture Partners', kind: 'venture_fund', receipt_ids: ['r-texasventurepartners-toi-2026'], evidence_state: 'observed', graph_effect: G },
];
writeJsonl('vehicles.jsonl', vehicles);

// ---------- professional roles (dated where sourced; Jackson chronology ordered/undated) ----------
const roles = [
  ['person:jackson-moses', 'Cisco', 'Market Research Analyst', 'employee', 1, null],
  ['person:jackson-moses', 'LinkedIn', 'Customer operations / executive recruiting', 'employee', 2, null],
  ['person:jackson-moses', 'Lynda.com', 'Sales', 'employee', 3, null],
  ['person:jackson-moses', 'Spectrum AI / Spectrum Labs', 'Chairman & CEO (founder)', 'founder', 4, 'Acquired by ActiveFence.'],
  ['person:jackson-moses', 'MainStreet', 'VP of Partnerships (founder)', 'founder', 5, 'Acquired by Employer.com.'],
  ['person:jackson-moses', 'Silent Ventures', 'Founder & Managing Partner', 'fund_manager', 6, null],
  ['person:jackson-moses', 'Silent Capital', 'Founder & Manager', 'fund_manager', 7, null],
  ['person:joe-lonsdale', 'Palantir Technologies', 'Co-founder', 'founder', 1, null],
  ['person:joe-lonsdale', 'Addepar', 'Co-founder', 'founder', 2, null],
  ['person:joe-lonsdale', 'OpenGov', 'Co-founder', 'founder', 3, null],
  ['person:joe-lonsdale', '8VC', 'Founder & Managing Partner', 'fund_manager', 4, null],
  ['person:trae-stephens', 'Palantir Technologies', 'Early employee', 'employee', 1, null],
  ['person:trae-stephens', 'Founders Fund', 'Partner', 'fund_manager', 2, 'Gov/defense mandate since 2014.'],
  ['person:trae-stephens', 'Anduril Industries', 'Co-founder & Executive Chairman', 'founder', 3, null],
  ['person:katherine-boyle', 'The Washington Post', 'Reporter', 'employee', 1, null],
  ['person:katherine-boyle', 'General Catalyst', 'Partner (seed practice)', 'investor', 2, 'Seed rounds incl. Anduril, Vannevar Labs.'],
  ['person:katherine-boyle', 'a16z American Dynamism', 'General Partner / cofounder of practice', 'fund_manager', 3, null],
  ['person:joshua-baer', 'Capital Factory', 'Founder', 'founder', 1, 'Founded 2009; died June 2026 (press).'],
  ['person:sally-donnelly', 'Office of the Secretary of Defense', 'Senior Advisor to the SecDef', 'government', 1, null],
  ['person:sally-donnelly', 'Pallas Advisors', 'Founding Partner', 'founder', 2, null],
  ['person:tony-demartino', 'Office of the Secretary of Defense', 'Senior official', 'government', 1, null],
  ['person:tony-demartino', 'Pallas Advisors', 'Founding Partner', 'founder', 2, null],
];
writeJsonl('professional-roles.jsonl', roles.map(([a, org, title, roletype, seq, note]) => ({ actor_id: a, org, title, role_type: roletype, sequence: seq, dated: false, note: note ?? null, receipt_ids: actors.find(x => x.actor_id === a).receipt_ids, evidence_state: 'self_claimed', discovery_admission_state: 'admitted', graph_effect: G })));

// ---------- portfolio universes (per vehicle; reproducible) ----------
const jmPortfolio = JSON.parse(fs.readFileSync(path.join(dir, 'sources/jackson-portfolio.json'), 'utf8'));
writeJsonl('portfolio-edges.jsonl', jmPortfolio.company_names.map(n => ({ vehicle_id: 'vehicle:jackson-personal-investing', actor_id: 'person:jackson-moses', predicate: 'publicly_lists_investment_in', company_name_as_listed: n, first_observed: '2026-07-14', receipt_ids: ['r-jacksonmoses-portfolio-2026'], evidence_state: 'self_claimed', discovery_admission_state: 'admitted', note: 'On jacksonmoses.com/portfolio; investment predicate self-represented, not equity terms.', graph_effect: G })));

// ---------- advisory edges (self_claimed unless counterpart-corroborated) ----------
const advisory = [
  ['person:jackson-moses', 'Castelion', 'senior_advisor', 'self_claimed', 'r-jacksonmoses-about-2026', 'Boyle (a16z) is board-observer at Castelion — separate person; not a counterpart confirmation of Jackson.'],
  ['person:jackson-moses', 'Privateer', 'senior_advisor', 'self_claimed', 'r-jacksonmoses-about-2026', null],
  ['person:jackson-moses', 'Long Wall', 'senior_advisor', 'self_claimed', 'r-jacksonmoses-about-2026', null],
  ['person:jackson-moses', 'Thor Dynamics', 'senior_advisor', 'self_claimed', 'r-jacksonmoses-about-2026', null],
  ['person:katherine-boyle', 'Apex Space', 'board_member', 'counterpart_reported', 'r-a16z-boyle-2026', 'a16z bio states board seat.'],
  ['person:katherine-boyle', 'Hadrian', 'board_member', 'counterpart_reported', 'r-a16z-boyle-2026', null],
  ['person:katherine-boyle', 'Saronic', 'board_observer', 'counterpart_reported', 'r-a16z-boyle-2026', null],
  ['person:katherine-boyle', 'Castelion', 'board_observer', 'counterpart_reported', 'r-a16z-boyle-2026', null],
  ['person:trae-stephens', 'Anduril Industries', 'executive_chairman', 'counterpart_reported', 'r-foundersfund-stephens-2026', null],
  ['person:trae-stephens', 'Flexport', 'board_member', 'counterpart_reported', 'r-foundersfund-stephens-2026', null],
];
writeJsonl('advisory-edges.jsonl', advisory.map(([a, co, role, st, rc, note]) => ({ actor_id: a, company: co, advisory_role: role, counterpart_status: st === 'counterpart_reported' ? 'counterpart_reported' : 'counterpart_not_found_on_searched_surfaces', receipt_ids: [rc], evidence_state: st, discovery_admission_state: 'admitted', note: note ?? null, graph_effect: G })));

// ---------- deal-sourcing / venture-partner claims (distinct predicates; self_claimed, counterpart searched) ----------
const sourcing = [
  ['person:jackson-moses', 'vehicle:8vc', 'sourced_deal_for'], ['person:jackson-moses', 'vehicle:founders-fund', 'sourced_deal_for'],
  ['person:jackson-moses', 'a16z', 'sourced_deal_for'], ['person:jackson-moses', 'Bessemer', 'sourced_deal_for'],
  ['person:jackson-moses', 'Lightspeed', 'sourced_deal_for'], ['person:jackson-moses', 'NEA', 'sourced_deal_for'],
  ['person:jackson-moses', 'family offices / defense primes / university endowments', 'sourced_deal_for'],
  ['person:jackson-moses', 'several large firms', 'venture_partner_at'],
];
writeJsonl('deal-sourcing-claims.jsonl', sourcing.map(([a, cp, pred]) => ({ actor_id: a, counterparty: cp, predicate: pred, receipt_ids: ['r-jacksonmoses-about-2026'], evidence_state: 'self_claimed', counterpart_status: 'counterpart_not_found_on_searched_surfaces', discovery_admission_state: 'admitted', note: 'Self-authored on jacksonmoses.com/about; no counterpart fund page corroborated the specific sourcing/partner relationship on searched surfaces.', graph_effect: G })));

// ---------- funding rounds (financial types kept SEPARATE) ----------
const funding = [
  { company: 'CHAOS Industries', round: 'Series D', round_size_usd: 510_000_000, cumulative_usd: 1_000_000_000, valuation_usd: 4_500_000_000, lead: 'Valor Equity Partners', receipt_ids: ['r-chaos-valor-2026'], evidence_state: 'reported' },
  { company: 'Overland AI', round: 'Series B', round_size_usd: 100_000_000, cumulative_usd: 142_000_000, valuation_usd: null, lead: '8VC', receipt_ids: ['r-overland-8vc-2026'], evidence_state: 'reported' },
  { company: 'Raft', round: 'Growth', round_size_usd: 60_000_000, cumulative_usd: null, valuation_usd: null, lead: 'Washington Harbour Partners', receipt_ids: ['r-raft-mission-2026'], evidence_state: 'reported' },
  { company: 'Traysar', round: 'Seed', round_size_usd: 25_000_000, cumulative_usd: null, valuation_usd: null, lead: 'Silent Ventures', receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported' },
];
writeJsonl('funding-rounds.jsonl', funding.map(f => ({ ...f, financial_type_note: 'round_size, cumulative, and valuation are DISTINCT; none is revenue, spend, or a contract figure.', discovery_admission_state: 'admitted', graph_effect: G })));

// ---------- co-investor edges (reported; co-investment != coordination) ----------
const coInvest = [
  { company: 'Traysar', investors: ['Silent Ventures', 'Lux Capital', 'Ora Global', 'Anduril founders (angels)', 'Erebor founders (angels)', 'NeverLift VC', 'Entree Capital'], receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported' },
  { company: 'CHAOS Industries', investors: ['Valor Equity Partners', '8VC', 'Accel'], receipt_ids: ['r-chaos-valor-2026'], evidence_state: 'reported' },
  { company: 'Overland AI', investors: ['8VC', 'Valor Equity Partners', 'Point72 Ventures'], receipt_ids: ['r-overland-8vc-2026'], evidence_state: 'reported' },
];
writeJsonl('co-investor-edges.jsonl', coInvest.map(c => ({ ...c, forbidden_inference: 'Shared cap-table presence is NOT coordination, control, or a relationship between investors.', discovery_admission_state: 'admitted', graph_effect: G })));

// ---------- government programs + awards (CEILING vs OBLIGATION vs OUTLAY strictly separated) ----------
writeJsonl('government-programs.jsonl', [
  { org: 'Raft', program: 'USSOCOM (edge-to-enterprise data/AI)', identifier_status: 'not_resolved', award_ids_searched: ['USAspending (not resolved this pass)'], receipt_ids: ['r-raft-ussocom-2026'], evidence_state: 'reported', discovery_admission_state: 'admitted', graph_effect: G },
  { org: 'Raft', program: 'Space Rapid Capabilities Office (Space RCO)', identifier_status: 'not_resolved', receipt_ids: ['r-raft-ussocom-2026'], evidence_state: 'reported', discovery_admission_state: 'admitted', graph_effect: G },
]);
writeJsonl('government-awards.jsonl', [
  { org: 'Raft', vehicle_type: 'IDIQ', contract_ceiling_usd: 349_000_000, obligated_usd: null, outlay_usd: null, agency: 'USSOCOM', award_id: null, uei: null, cage: null, receipt_ids: ['r-raft-ussocom-2026'], evidence_state: 'reported', note: 'IDIQ CEILING only. NOT spend, revenue, obligation, or payment. Obligated/outlay unresolved (USAspending not queried this pass).', discovery_admission_state: 'admitted', graph_effect: G },
  { org: 'Raft', vehicle_type: 'IDIQ task order', contract_ceiling_usd: 600_000, obligated_usd: null, outlay_usd: null, agency: 'Space RCO', note: 'Task under a larger ~$1B IDIQ ceiling; ceiling of the umbrella is not this order.', award_id: null, receipt_ids: ['r-raft-ussocom-2026'], evidence_state: 'reported', discovery_admission_state: 'admitted', graph_effect: G },
]);

// ---------- validation surfaces + overlaps (the joins ACTUALLY RUN) ----------
const nsByCore = new Map();
for (const c of readJsonl(path.join(N, 'chunk1/companies.jsonl'))) for (const nm of [c.canonical_name, ...(c.aliases ?? [])]) { const k = core(nm); if (k) nsByCore.set(k, c); }
const cfUniverse = JSON.parse(fs.readFileSync(path.join(CORRIDOR, 'capital-factory-portfolio-universe.json'), 'utf8'));
const cfByCore = new Set(cfUniverse.company_names.map(core));
const pallasByCore = new Set(['Morpheus Space', 'Calypso AI', 'Rebellion Defense', 'Interos', 'Second Front', 'Hermeus'].map(core));

const validation = [], rejected = [];
for (const nm of jmPortfolio.company_names) {
  const k = core(nm);
  const ns = nsByCore.get(k);
  const identityUnconfirmed = k === 'armada';
  if (ns) {
    if (identityUnconfirmed) { rejected.push({ join_id: `reject-jm-ns-${k.replace(/ /g, '-')}`, kind: 'jackson_x_natsec100_name_only', jackson_company: nm, natsec100_near: ns.canonical_name, reason: 'generic token "Armada"; entity identity unconfirmed', evidence_state: 'name_match_only', discovery_admission_state: 'admitted', disposition: 'rejected', graph_effect: G }); continue; }
    validation.push({ join_id: `join-jm-ns-${k.replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_natsec100', jackson_company: nm, natsec100_name: ns.canonical_name, natsec100_years: ns.natsec100_years_documented, surfaces: ['jackson-portfolio', 'NatSec100'], receipt_ids: ['r-jacksonmoses-portfolio-2026', ...(ns.receipt_ids ?? [])], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', note: 'Co-listing: Jackson-portfolio company also NatSec100-ranked. Not an ownership/coordination claim.', graph_effect: G });
  }
}
const jmCf = jmPortfolio.company_names.filter(n => cfByCore.has(core(n)));
const jmPallas = jmPortfolio.company_names.filter(n => pallasByCore.has(core(n)));
writeJsonl('validation-surfaces.jsonl', [
  ...validation,
  ...jmCf.map(n => ({ join_id: `join-jm-cf-${core(n).replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_capital_factory', jackson_company: n, surfaces: ['jackson-portfolio', 'capital-factory'], receipt_ids: ['r-jacksonmoses-portfolio-2026', 'r-capital-factory-portfolio-2026'], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', graph_effect: G })),
  ...jmPallas.map(n => ({ join_id: `join-jm-pallas-${core(n).replace(/ /g, '-')}`, kind: 'jackson_portfolio_x_pallas_ventures', jackson_company: n, surfaces: ['jackson-portfolio', 'pallas-ventures'], receipt_ids: ['r-jacksonmoses-portfolio-2026', 'r-pallas-ventures-site-2026'], evidence_state: 'source_explicit', discovery_admission_state: 'admitted', graph_effect: G })),
]);

// ---------- follow-on capital + exits ----------
writeJsonl('follow-on-capital.jsonl', [
  { company: 'Traysar', early: 'Silent Ventures (seed lead)', follow_on: 'Lux Capital + angels in same round', predicate: 'follow_on_investor', receipt_ids: ['r-traysar-prnewswire-2026'], evidence_state: 'reported', discovery_admission_state: 'admitted', graph_effect: G },
]);
const exits = [
  ['Voyager Technologies', 'IPO', 'NYSE: VOYG', 'r-jacksonmoses-portfolio-2026'],
  ['MainStreet', 'acquired', 'Employer.com', 'r-jacksonmoses-about-2026'],
  ['Spectrum AI', 'acquired', 'ActiveFence', 'r-jacksonmoses-about-2026'],
  ['GameOn', 'acquired', 'Victory Games (subsequently IPO)', 'r-jacksonmoses-portfolio-2026'],
  ['Capiche', 'acquired', 'Vendr', 'r-jacksonmoses-portfolio-2026'],
  ['Daylight', 'acquired', 'Atlas', 'r-jacksonmoses-portfolio-2026'],
];
writeJsonl('exits.jsonl', exits.map(([co, type, detail, rc]) => ({ company: co, exit_type: type, detail, exit_value_usd: null, receipt_ids: [rc], evidence_state: 'self_claimed', note: 'Exit type stated on Jackson surfaces; exit VALUE not disclosed and not conflated with funding/valuation.', discovery_admission_state: 'admitted', graph_effect: G })));

// ---------- router signatures (8 predicates; score = discovery-routing, NOT suspicion) ----------
// Each signature is a boolean with its source basis. Threshold for admission: >= 3.
const SIG = ['multiple_vehicles', 'advises_multiple_companies', 'cross_fund_deal_sourcing', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'connects_capital_to_government_surface', 'convening_fellowship_foundation', 'multi_stage_same_company'];
const candidateData = {
  'person:jackson-moses': { sigs: ['multiple_vehicles', 'advises_multiple_companies', 'cross_fund_deal_sourcing', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'multi_stage_same_company'], basis: 'Silent Ventures + Silent Capital + personal surface; 4 advisory roles; sources for 6+ funds; Spectrum/MainStreet founder->investor; portfolio spans NatSec100/CF/Pallas; Traysar seed->follow-on.', receipts: ['r-jacksonmoses-about-2026', 'r-jacksonmoses-portfolio-2026', 'r-jacksonmoses-silentcapital-2026'] },
  'person:joe-lonsdale': { sigs: ['multiple_vehicles', 'advises_multiple_companies', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'connects_capital_to_government_surface', 'convening_fellowship_foundation'], basis: '8VC + Cicero Institute; founded Palantir/Addepar/OpenGov/Epirus; OpenGov + Palantir are government surfaces; Cicero is a policy foundation.', receipts: ['r-8vc-lonsdale-2026'] },
  'person:trae-stephens': { sigs: ['multiple_vehicles', 'advises_multiple_companies', 'operator_to_investor', 'connects_capital_to_government_surface', 'multi_stage_same_company'], basis: 'Founders Fund partner + Anduril exec chairman; boards Flexport; gov/defense mandate; Anduril formation->follow-on.', receipts: ['r-foundersfund-stephens-2026'] },
  'person:katherine-boyle': { sigs: ['multiple_vehicles', 'advises_multiple_companies', 'operator_to_investor', 'connects_multiple_portfolio_surfaces', 'multi_stage_same_company'], basis: 'General Catalyst -> a16z American Dynamism; boards/observer at Apex/Hadrian/Saronic/Castelion; seed->growth across firms.', receipts: ['r-a16z-boyle-2026'] },
  'person:joshua-baer': { sigs: ['multiple_vehicles', 'advises_multiple_companies', 'connects_capital_to_government_surface', 'convening_fellowship_foundation', 'connects_multiple_portfolio_surfaces'], basis: 'Capital Factory + multiple funds + STATION Austin nonprofit; 800+ investments; CF government/defense programming.', receipts: ['r-capitalfactory-about-2026', 'r-baer-texasmonthly-2026'] },
  'person:sally-donnelly': { sigs: ['multiple_vehicles', 'operator_to_investor', 'connects_capital_to_government_surface'], basis: 'Pallas Advisors + Pallas Ventures (+ Foundation); ex-Senior Advisor to SecDef; public-service->capital.', receipts: ['r-pallas-advisors-site-2026', 'r-pallas-ventures-site-2026'] },
  'person:tony-demartino': { sigs: ['multiple_vehicles', 'operator_to_investor', 'connects_capital_to_government_surface'], basis: 'Pallas Advisors + Ventures; ex-OSD; public-service->capital.', receipts: ['r-pallas-advisors-site-2026'] },
  'person:richard-spencer': { sigs: ['operator_to_investor', 'connects_capital_to_government_surface'], basis: 'Pallas Ventures Managing Director (title only from source). Below threshold on searched surfaces.', receipts: ['r-pallas-ventures-site-2026'] },
  'person:rotem-kakon': { sigs: ['multiple_vehicles', 'connects_capital_to_government_surface'], basis: 'Stratos Ventures co-founder/GP; gov-access claims are self_claimed. Below threshold on searched surfaces.', receipts: ['r-stratos-official-site-2026'] },
  'person:aviad-grinfeld': { sigs: ['multiple_vehicles', 'connects_capital_to_government_surface'], basis: 'Stratos co-founder/GP. Below threshold on searched surfaces.', receipts: ['r-stratos-official-site-2026'] },
  'person:daniel-fouzailov': { sigs: ['connects_capital_to_government_surface'], basis: 'Stratos GP. Below threshold on searched surfaces.', receipts: ['r-stratos-official-site-2026'] },
  'person:tal-shmueli': { sigs: ['multiple_vehicles', 'connects_capital_to_government_surface', 'operator_to_investor'], basis: 'Texas Venture Partners lead; Israeli-defense-tech capital router into Austin; ex-operator (IDF/LinkedIn) -> investor.', receipts: ['r-texasventurepartners-toi-2026'] },
};
const THRESHOLD = 3;
const signatures = [], candidatesOut = [];
for (const a of actors) {
  const cd = candidateData[a.actor_id] ?? { sigs: [], basis: 'no signature predicates observed on searched surfaces', receipts: a.receipt_ids };
  const present = SIG.filter(s => cd.sigs.includes(s));
  const score = present.length;
  const admitted = score >= THRESHOLD;
  signatures.push({ actor_id: a.actor_id, label: a.label, signatures_present: present, routing_score: score, threshold: THRESHOLD, admitted, basis: cd.basis, receipt_ids: cd.receipts, note: 'routing_score is a DISCOVERY-ROUTING score, never a suspicion/influence/wrongdoing score.', discovery_admission_state: 'admitted', evidence_state: 'observed', graph_effect: G });
  candidatesOut.push({ actor_id: a.actor_id, label: a.label, routing_score: score, disposition: admitted ? 'admitted_router' : 'below_threshold', receipt_ids: cd.receipts, discovery_admission_state: 'admitted', graph_effect: G });
}
writeJsonl('router-signatures.jsonl', signatures);
writeJsonl('router-candidates.jsonl', candidatesOut);
const admittedRouters = signatures.filter(s => s.admitted);

// ---------- game trails (2 hops) for every admitted router + preserved frontier ----------
const trails = [], frontier = [];
for (const r of admittedRouters) {
  const a = r.actor_id;
  if (a === 'person:jackson-moses') {
    trails.push({ trail_id: 'trail-jm-1', hops: ['person:jackson-moses', 'vehicle:silent-ventures', 'Traysar', 'Lux Capital (co-investor)'], terminates: 'two_hop_boundary', surfaces_reached: ['company', 'co-investor'], receipt_ids: ['r-silent-home-2026', 'r-traysar-prnewswire-2026'], evidence_state: 'reported', graph_effect: G });
    trails.push({ trail_id: 'trail-jm-2', hops: ['person:jackson-moses', 'vehicle:jackson-personal-investing', 'Saronic', 'NatSec100 (2024-2026)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-jacksonmoses-portfolio-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: 'trail-jm-3', hops: ['person:jackson-moses', 'advisory:Castelion', 'Katherine Boyle (a16z board-observer, separate person)', 'a16z American Dynamism'], terminates: 'no_source_explicit_next_edge', surfaces_reached: ['company', 'co-adviser'], receipt_ids: ['r-jacksonmoses-about-2026', 'r-a16z-boyle-2026'], evidence_state: 'observed', note: 'Jackson (self_claimed advisor) and Boyle (counterpart_reported observer) both attach to Castelion — a shared-company node, NOT a Jackson<->Boyle relationship.', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-jm-sourcing', from: 'person:jackson-moses', next: 'counterpart-confirm 8VC/Founders Fund/a16z sourcing claims', state: 'not_searched', note: 'Each fund page must be checked for Jackson attribution.', graph_effect: G });
  } else if (a === 'person:joe-lonsdale') {
    trails.push({ trail_id: 'trail-jl-1', hops: ['person:joe-lonsdale', 'vehicle:8vc', 'Overland AI', 'NatSec100 (2025-2026)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-8vc-lonsdale-2026', 'r-overland-8vc-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: 'trail-jl-2', hops: ['person:joe-lonsdale', 'founder:OpenGov', 'US government budgeting surface', 'procurement/gov market'], terminates: 'government_surface_reached', surfaces_reached: ['company', 'government'], receipt_ids: ['r-8vc-lonsdale-2026'], evidence_state: 'observed', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-jl-8vc-portfolio', from: 'vehicle:8vc', next: 'enumerate full 8VC defense portfolio for NatSec100/gov overlaps', state: 'not_searched', graph_effect: G });
  } else if (a === 'person:trae-stephens') {
    trails.push({ trail_id: 'trail-ts-1', hops: ['person:trae-stephens', 'vehicle:founders-fund', 'Anduril Industries', 'NatSec100 (2023-2026)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-foundersfund-stephens-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: 'trail-ts-2', hops: ['person:trae-stephens', 'founder:Anduril', 'US DoD programs', 'procurement surface'], terminates: 'government_surface_reached', surfaces_reached: ['company', 'government'], receipt_ids: ['r-foundersfund-stephens-2026'], evidence_state: 'observed', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-ts-ff-portfolio', from: 'vehicle:founders-fund', next: 'enumerate Founders Fund defense portfolio (Gecko, Varda, ...) for overlaps', state: 'not_searched', graph_effect: G });
  } else if (a === 'person:katherine-boyle') {
    trails.push({ trail_id: 'trail-kb-1', hops: ['person:katherine-boyle', 'vehicle:a16z-american-dynamism', 'Hadrian', 'NatSec100 (2024-2026)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-a16z-boyle-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: 'trail-kb-2', hops: ['person:katherine-boyle', 'board-observer:Saronic', 'Capital Factory (Saronic co-listed)', 'NatSec100'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'accelerator', 'validation'], receipt_ids: ['r-a16z-boyle-2026', 'r-capital-factory-portfolio-2026'], evidence_state: 'source_explicit', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-kb-ad-portfolio', from: 'vehicle:a16z-american-dynamism', next: 'enumerate American Dynamism portfolio for overlaps', state: 'not_searched', graph_effect: G });
  } else if (a === 'person:joshua-baer') {
    trails.push({ trail_id: 'trail-jb-1', hops: ['person:joshua-baer', 'vehicle:capital-factory', 'Saronic', 'NatSec100 (2024-2026)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-capitalfactory-about-2026', 'r-capital-factory-portfolio-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: 'trail-jb-2', hops: ['person:joshua-baer', 'vehicle:station-austin', 'convening surface', 'Austin defense-tech ecosystem'], terminates: 'two_hop_boundary', surfaces_reached: ['convening'], receipt_ids: ['r-baer-texasmonthly-2026'], evidence_state: 'reported', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-jb-station', from: 'vehicle:station-austin', next: 'inventory STATION Austin programs/fellows (node preserved despite Baer death)', state: 'unavailable_after_search', note: 'Some Baer personal surfaces now unavailable; node preserved.', graph_effect: G });
  } else if (a === 'person:sally-donnelly' || a === 'person:tony-demartino') {
    const who = a === 'person:sally-donnelly' ? 'sd' : 'td';
    trails.push({ trail_id: `trail-${who}-1`, hops: [a, 'vehicle:pallas-ventures', 'Morpheus Space', 'NatSec100 (2023)'], terminates: 'validation_surface_reached', surfaces_reached: ['company', 'validation'], receipt_ids: ['r-pallas-ventures-site-2026'], evidence_state: 'source_explicit', graph_effect: G });
    trails.push({ trail_id: `trail-${who}-2`, hops: [a, 'gov:Office of the Secretary of Defense', 'vehicle:pallas-advisors', 'procurement/advisory surface'], terminates: 'government_surface_reached', surfaces_reached: ['government', 'advisory'], receipt_ids: ['r-pallas-advisors-site-2026'], evidence_state: 'observed', note: 'Public-service -> advisory/fund transition (Pallas).', graph_effect: G });
    frontier.push({ frontier_id: `frontier-${who}-pallas`, from: 'vehicle:pallas-ventures', next: 'enumerate full Pallas Ventures portfolio for gov-award overlaps', state: 'not_searched', graph_effect: G });
  } else if (a === 'person:tal-shmueli') {
    trails.push({ trail_id: 'trail-tsh-1', hops: ['person:tal-shmueli', 'vehicle:texas-venture-partners', 'Israeli defense-tech portfolio (Austin)', 'US defense market'], terminates: 'two_hop_boundary', surfaces_reached: ['fund', 'market'], receipt_ids: ['r-texasventurepartners-toi-2026'], evidence_state: 'reported', graph_effect: G });
    trails.push({ trail_id: 'trail-tsh-2', hops: ['person:tal-shmueli', 'operator:IDF/LinkedIn', 'vehicle:texas-venture-partners', 'capital allocation'], terminates: 'no_source_explicit_next_edge', surfaces_reached: ['fund'], receipt_ids: ['r-texasventurepartners-toi-2026'], evidence_state: 'reported', note: 'Operator -> investor transition; portfolio not yet named on searched surfaces.', graph_effect: G });
    frontier.push({ frontier_id: 'frontier-tsh-tvp', from: 'vehicle:texas-venture-partners', next: 'resolve TVP portfolio company names (not on searched surfaces this pass)', state: 'source_unavailable', graph_effect: G });
  }
}
writeJsonl('game-trails.jsonl', trails);
writeJsonl('trail-frontier.jsonl', frontier);

// ---------- rejected joins ----------
writeJsonl('rejected-joins.jsonl', rejected);

// ---------- coverage gaps (blocked sources documented with url/timestamp/query/alternatives) ----------
writeJsonl('coverage-gaps.jsonl', [
  { gap_id: 'gap-jackson-linkedin', state: 'unavailable_after_search', url: 'https://www.linkedin.com/in/ (jackson moses)', timestamp: '2026-07-14', query: 'jackson moses linkedin', attempted_alternatives: ['jacksonmoses.com/about (used instead)'], detail: 'LinkedIn auth-gated; chronology taken from the about page (undated).', graph_effect: G },
  { gap_id: 'gap-jackson-dates', state: 'unavailable_after_search', detail: 'jacksonmoses.com/about lists roles WITHOUT dates; operator->investor chronology is ordered, not dated.', timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-sourcing-counterparts', state: 'not_searched', detail: 'Jackson deal-sourcing claims (8VC/Founders Fund/a16z/Bessemer/Lightspeed/NEA) not yet counterpart-confirmed on each fund surface; recorded self_claimed with counterpart_not_found.', graph_effect: G },
  { gap_id: 'gap-government-award-ids', state: 'not_searched', detail: 'USAspending/FPDS/SBIR award IDs, obligated and outlay amounts not resolved this pass; only reported contract CEILINGS recorded.', timestamp: '2026-07-14', graph_effect: G },
  { gap_id: 'gap-fund-portfolio-census', state: 'not_searched', detail: 'Full portfolios of 8VC / Founders Fund / a16z AD / Silent Ventures beyond the committed Jackson universe not enumerated; frontier preserved for continuation.', graph_effect: G },
  { gap_id: 'gap-roster-expansion', state: 'searched_nonexhaustive', detail: '12 candidates from committed source-addressed rosters processed with a denominator; broader roster expansion (Shield/Lux/DCVC/IQT team pages, full LinkedIn projection) not exhaustively enumerated.', graph_effect: G },
]);

// ---------- manifest ----------
const manifest = {
  schema_version: 'person-centered-defense-routers@1',
  built_at: '2026-07-14',
  purpose: 'Source-addressed map of person-centered defense-technology routers, canonical-first on Jackson Moses. A router performs several publicly-observable cross-institution functions. Evidence state is per-predicate; discovery admission is separate from corroboration; graph_effect: none. No private intent, coordination, influence, or wrongdoing is inferred.',
  counts: {
    actors: actors.length, vehicles: vehicles.length,
    router_candidates_denominator: candidatesOut.length,
    admitted_routers: admittedRouters.length,
    below_threshold: candidatesOut.filter(c => c.disposition === 'below_threshold').length,
    jackson_portfolio_universe: jmPortfolio.distinct_company_names,
    jackson_x_natsec100: validation.length,
    jackson_x_capital_factory: jmCf.length,
    jackson_x_pallas_ventures: jmPallas.length,
    advisory_edges: advisory.length,
    deal_sourcing_claims: sourcing.length,
    game_trails: trails.length,
    trail_frontier_open: frontier.length,
    receipts_total: receipts.length,
    receipts_resolved: receipts.filter(r => /^https?:\/\//.test(r.locator_url ?? '')).length,
    receipts_unresolved: receipts.filter(r => r.status === 'receipt_unresolved').length,
    rejected_name_only: rejected.length,
  },
  admitted_router_ids: admittedRouters.map(r => r.actor_id),
  evidence_states: ['observed', 'self_claimed', 'counterpart_reported', 'official_record', 'independently_corroborated', 'inferred', 'disputed', 'name_match_only', 'unavailable_after_search', 'not_searched'],
  financial_types_kept_separate: ['announced_funding', 'round_size', 'cumulative_funding', 'valuation', 'fund_size', 'check_size', 'contract_ceiling', 'obligated_amount', 'outlay_payment', 'revenue', 'exit_value'],
  evidence_limit: 'A self-authored page establishes that the person publicly represented a role/relationship — never the counterpart\'s agreement, legal control, transaction, influence, coordination, or wrongdoing. Uncertainty changes the edge label, not the observation.',
  graph_effect: G,
};
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`person-routers: ${actors.length} actors, ${admittedRouters.length} admitted routers / ${candidatesOut.length} candidates; Jackson portfolio ${jmPortfolio.distinct_company_names} -> NatSec100 ${validation.length}, CF ${jmCf.length}, Pallas ${jmPallas.length}; ${trails.length} game-trails; receipts ${manifest.counts.receipts_resolved} resolved / ${manifest.counts.receipts_unresolved} unresolved`);
