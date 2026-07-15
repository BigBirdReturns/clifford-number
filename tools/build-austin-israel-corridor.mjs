#!/usr/bin/env node
// Build the portable Austin–Israel defense-corridor intake. Every edge carries a DUAL state:
//   discovery_admission_state    — is the observable claim preserved? (a source represents it)
//   independent_corroboration_state ∈ source_explicit | independently_corroborated | self_claimed |
//     name_match_only | not_searched | source_unavailable | reported | receipt_unresolved |
//     no_source_explicit_join_observed_on_searched_surfaces
// Israel linkage is only ever from explicit self-identification / official company history — never
// from a name. Institutional arms are separate nodes. All-pairs inflation is collapsed to distinct
// institutional overlaps. graph_effect: none throughout.
//
// This pass (2026-07-14, recovery increment onto codex/public-interest-discovery) additionally:
//  - EXECUTES Lane B (Austin–Israel cohort) with source-explicit members (no longer not_searched).
//  - Resolves 3 of Stratos's logos-only portfolio companies via press (still not exhaustive).
//  - Integrates Pallas (Advisors / Ventures / Foundation as separate arms) and runs Pallas×NatSec100.
//  - Runs Silent Ventures × NatSec100.
//  - Relabels the CF↔Stratos test from a proven "rejected" to
//    no_source_explicit_join_observed_on_searched_surfaces (absence on searched surfaces != disproof).
//  - Ports the second-tier corroboration for 4 CF×NatSec co-listings (ICON/Saronic/Firefly/Venus)
//    and the portfolio-listing != equity-investment distinction.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/intake/austin-israel-defense-corridor');
const N = path.join(root, 'data/intake/natsec100-pathways');
fs.mkdirSync(dir, { recursive: true });
const readJsonl = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)) : [];
const writeJsonl = (f, rows) => fs.writeFileSync(path.join(dir, f), rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const core = s => norm(s).split(' ').filter(t => t && !['inc', 'llc', 'corp', 'technologies', 'technology', 'co', 'the', 'company', 'systems', 'labs', 'group', 'ai'].includes(t)).join(' ');
const idify = s => norm(s).replace(/ /g, '-');
const G = 'none';

// ---- source-addressed receipts (RESOLVED this pass) ----
const cfUniverse = JSON.parse(fs.readFileSync(path.join(dir, 'capital-factory-portfolio-universe.json'), 'utf8'));
const resolvedReceipts = [
  { receipt_id: 'r-capital-factory-portfolio-2026', evidence_class: 'primary_public', locator_url: 'https://www.capitalfactory.com/portfolio', retrieved_at: '2026-07-14', content_sha256: cfUniverse.source_sha256, note: 'Capital Factory public portfolio page (837 listed company names).' },
  // Stratos — hash now pinned (was null in the prior pass; the hashing gap is closed).
  { receipt_id: 'r-stratos-official-site-2026', evidence_class: 'primary_public', locator_url: 'https://www.stratos-vc.com/', retrieved_at: '2026-07-14', content_sha256: '50e4b4a437ff7fc0ba9721bfaae962d2518357d1c7c00936854664dffa4d072d', note: 'Stratos Ventures official site — primary source for team + self-represented gov partners; portfolio is logos-only.' },
  { receipt_id: 'r-stratos-jpost-2026', evidence_class: 'reported', locator_url: 'https://www.jpost.com/defense-and-tech/article-900382', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Stratos debuts as US-Israeli defense-tech fund with $50m.' },
  { receipt_id: 'r-stratos-refreshmiami-2026', evidence_class: 'reported', locator_url: 'https://refreshmiami.com/news/stratos-ventures-launches-with-50m-and-a-plan-to-help-make-miami-a-defense-tech-gateway/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Stratos + The LAB Miami; Miami defense-tech gateway.' },
  { receipt_id: 'r-stratos-ctech-portfolio-2026', evidence_class: 'reported', locator_url: 'https://www.calcalistech.com/ctechnews/article/r14hmskzzg', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press (CTech): names Stratos portfolio companies Particle, Tenna, Skapion; 5 backed / 15-20 planned.' },
  // Pallas (three arms)
  { receipt_id: 'r-pallas-advisors-site-2026', evidence_class: 'primary_public', locator_url: 'https://www.pallasadvisors.com/', retrieved_at: '2026-07-14', content_sha256: '6256da902a5cc98e977d6c481bd1fc7f5124bed764c9557c496345fae3e119eb', note: 'Pallas Advisors site — advisory arm; founders Sally Donnelly & Tony DeMartino (ex-OSD/CENTCOM), founded 2018.' },
  { receipt_id: 'r-pallas-ventures-site-2026', evidence_class: 'primary_public', locator_url: 'https://www.pallasadvisors.com/ventures', retrieved_at: '2026-07-14', content_sha256: '47a59ef90239ee64f8f9c4facea307154fbcff092ae60cf5bb90470b8bb14aec', note: 'Pallas Ventures page — investment arm; names portfolio (Morpheus Space, Calypso AI, Rebellion Defense, Interos, Second Front, Hermeus) + a Pallas Foundation nav item.' },
  // Lane B
  { receipt_id: 'r-traysar-newsroom-2026', evidence_class: 'primary_public', locator_url: 'https://www.traysar.com/news/traysar-emerges-to-take-warfare-underground', retrieved_at: '2026-07-14', content_sha256: '1d8712e04e05fc454fed993ef38e48fe301fe41dd55be58b604b93b70039d1cc', note: 'Traysar newsroom — subterranean defense; founders Soffer/Katz/Adin (explicit Israeli-military/origin self-identification).' },
  { receipt_id: 'r-traysar-prnewswire-2026', evidence_class: 'reported', locator_url: 'https://www.prnewswire.com/news-releases/traysar-raises-25m-seed-emerges-from-stealth-at-reindustrialize-as-the-worlds-first-subterranean-defense-tech-company-302802698.html', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Traysar $25M seed LED BY Silent Ventures; Austin, TX HQ.' },
  { receipt_id: 'r-traysar-jpost-2026', evidence_class: 'reported', locator_url: 'https://www.jpost.com/defense-and-tech/article-901212', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Traysar (Austin CEO Yadin Soffer; Israeli-US); Anduril founders among investors.' },
  { receipt_id: 'r-texasventurepartners-toi-2026', evidence_class: 'reported', locator_url: 'https://www.timesofisrael.com/new-50-million-texas-fund-to-scout-for-battle-tested-israeli-defense-tech/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Press: Texas Venture Partners, $50M Austin fund for Israeli defense-tech; leads Tal Shmueli (Israeli-born, ex-IDF) & Lorne Abony.' },
  { receipt_id: 'r-silentventures-site-2026', evidence_class: 'reported', locator_url: 'https://silentvc.com/', retrieved_at: '2026-07-14', content_sha256: null, note: 'Silent Ventures (Dallas, TX; founder Jackson Moses) — early-stage defense/deep-tech; portfolio incl. Traysar, Firestorm, Hadrian, Armada.' },
  // bf26860 port: independent corroboration for 4 CF×NatSec co-listings + ICON disambiguation
  { receipt_id: 'r-icon-cf-startup-2026', evidence_class: 'reported', locator_url: 'https://capitalfactory.com/startup/icon/', retrieved_at: '2026-07-14', content_sha256: null, note: 'CF dedicated ICON page + press (3dprint.com/316367, axios.com Austin 2022-04-05): ICON = Austin construction 3D-printing, DoD contracts since 2019 — disambiguates the generic-word homonym.' },
  { receipt_id: 'r-cf-natsec-press-corroboration-2026', evidence_class: 'reported', locator_url: 'https://www.capitalfactory.com/portfolio', retrieved_at: '2026-07-14', content_sha256: cfUniverse.source_sha256, note: 'Independent press corroborates Saronic (ASVs), Firefly Aerospace (Nasdaq FLY), Venus Aerospace (hypersonics) as genuine CF portfolio companies, beyond bare index listing.' },
  // Deep dives: CHAOS Industries, Raft, Overland AI
  { receipt_id: 'r-chaos-valor-2026', evidence_class: 'primary_public', locator_url: 'https://www.chaosinc.com/news/chaos-industries-raises-510-million-led-by-valor-equity-partners-to-accelerate-next-generation-defense-systems', retrieved_at: '2026-07-14', content_sha256: 'bc4ced1c0671ae9108e6f761900eb1f3a30d68b035754ac7dd386aa216b430ae', note: 'CHAOS Industries (LA; founded 2022; Coherent Distributed Networks): Series D $510M led by Valor Equity Partners; investors incl. 8VC, Accel; ~$1B total.' },
  { receipt_id: 'r-raft-mission-2026', evidence_class: 'primary_public', locator_url: 'https://teamraft.com/mission/', retrieved_at: '2026-07-14', content_sha256: 'f319edadbc62e4dde07595f3df7d47c5df14a45028b54a0c58067217b4a054fa', note: 'Raft (McLean, VA; founded 2018; founder Shubhi Mishra): defense data/AI; $60M from Washington Harbour Partners (2024); $349M USSOCOM IDIQ; Space RCO.' },
  { receipt_id: 'r-overland-8vc-2026', evidence_class: 'primary_public', locator_url: 'https://www.overland.ai/news/overland-ai-raises-100-million-to-scale-ground-autonomy-with-u-s-armed-forces', retrieved_at: '2026-07-14', content_sha256: 'e001f894d34e9c690eb24d4f40b602219056db151cb62a3a34ad52b66ac9627b', note: 'Overland AI (Seattle; founded 2022, UW spinout; TERRAIN-AI ground autonomy): $100M led by 8VC with Valor Equity Partners, Point72 Ventures; ~$142M total.' },
];
const resolvedIds = new Set(resolvedReceipts.map(r => r.receipt_id));

// ---- receipt AUDIT: every r-* reference across ALL natsec100 seed files (both fields) resolves or is demoted ----
// Scan now includes seed/myth_to_market_scores.jsonl (all four seed files) for the full 22-ID denominator.
const referenced = new Set();
for (const f of ['seed/claims.jsonl', 'seed/actors.jsonl', 'seed/conversion_events.jsonl', 'seed/myth_to_market_scores.jsonl', 'chunk1/company_years.jsonl', 'chunk1/conversion_events.jsonl']) {
  for (const row of readJsonl(path.join(N, f))) {
    for (const m of JSON.stringify(row).matchAll(/"receipt_ids?"\s*:\s*(\[[^\]]*\]|"[^"]*")/g)) {
      for (const idm of m[1].matchAll(/"([^"]+)"/g)) for (const id of idm[1].split(';')) if (id.startsWith('r-')) referenced.add(id);
    }
  }
}
const receipts = [...resolvedReceipts];
const demoted = [];
for (const id of [...referenced].sort()) {
  if (resolvedIds.has(id)) continue;
  demoted.push(id);
  receipts.push({ receipt_id: id, evidence_class: null, locator_url: null, content_sha256: null, status: 'receipt_unresolved', note: 'Referenced by natsec100 seed claims; no source-addressable receipt record exists. A string containing a receipt ID is not a receipt.' });
}
writeJsonl('receipts.jsonl', receipts);

// ---- organizations (institutional arms are SEPARATE functional nodes) ----
const organizations = [
  { org_id: 'org-capital-factory', label: 'Capital Factory', node_function: 'geographic_convening_and_commercialization_router', hq: 'Austin, TX', receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-capital-factory-texas-fund', label: 'Capital Factory Texas Fund', node_function: 'fund_arm_of_capital_factory', receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Separate fund node; not merged into the accelerator.', graph_effect: G },
  { org_id: 'org-natsec100', label: 'NatSec100', node_function: 'validation_and_ranking_surface', publisher: 'Silicon Valley Defense Group (SVDG)', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-stratos-ventures', label: 'Stratos Ventures', node_function: 'cross_border_capital_and_market_access_router', hq: 'Migdal Paz, Tel Aviv, Israel', us_office: '2750 NW 3rd Ave, Suite 24, Miami, FL 33127', receipt_ids: ['r-stratos-official-site-2026', 'r-stratos-jpost-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-lab-miami', label: 'The LAB Miami', node_function: 'stratos_strategic_partner_convening', receipt_ids: ['r-stratos-refreshmiami-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', graph_effect: G },
  // Pallas — three arms, each a separate node
  { org_id: 'org-pallas-advisors', label: 'Pallas Advisors', node_function: 'washington_national_security_advisory_router', hq: 'Washington, DC', founded: 2018, receipt_ids: ['r-pallas-advisors-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Advisory arm; founders Sally Donnelly & Tony DeMartino (ex-OSD/CENTCOM).', graph_effect: G },
  { org_id: 'org-pallas-ventures', label: 'Pallas Ventures', node_function: 'investment_arm_of_pallas', founded: 2020, receipt_ids: ['r-pallas-ventures-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Investment arm; separate node from the advisory firm.', graph_effect: G },
  { org_id: 'org-pallas-foundation', label: 'Pallas Foundation', node_function: 'third_arm_of_pallas', receipt_ids: ['r-pallas-ventures-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_unavailable', note: 'Named in Pallas site navigation as a distinct arm; no substantive detail page acquired this pass.', graph_effect: G },
  // Lane B nodes
  { org_id: 'org-texas-venture-partners', label: 'Texas Venture Partners', node_function: 'austin_israeli_defensetech_capital_router', hq: 'Austin, TX', receipt_ids: ['r-texasventurepartners-toi-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Austin-based $50M fund explicitly mandated for Israeli defense-tech; the Austin-resident counterpart to Stratos (which is Tel Aviv/Miami).', graph_effect: G },
  { org_id: 'org-traysar', label: 'Traysar', node_function: 'austin_israel_linked_defense_company', hq: 'Austin, TX', receipt_ids: ['r-traysar-newsroom-2026', 'r-traysar-prnewswire-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Subterranean defense; Austin-HQ; founders explicitly Israeli-military/origin (self-identified, not name-inferred).', graph_effect: G },
  { org_id: 'org-silent-ventures', label: 'Silent Ventures', node_function: 'defense_deeptech_venture_router', hq: 'Dallas, TX', receipt_ids: ['r-silentventures-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', note: 'Founder Jackson Moses; led Traysar seed — the edge that ties Lane B into the corridor.', graph_effect: G },
  { org_id: 'org-elbit-systems-of-america', label: 'Elbit Systems of America', node_function: 'israeli_parent_us_defense_subsidiary', hq: 'Fort Worth, TX', receipt_ids: ['r-texasventurepartners-toi-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', note: 'Texas (Fort Worth), NOT Austin — recorded to keep the Austin cohort boundary honest.', graph_effect: G },
  { org_id: 'org-pallas', label: 'Pallas (unspecified arm)', node_function: 'deprecated_alias', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Prior-pass placeholder now superseded by the three explicit Pallas arms above.', graph_effect: G },
  // Deep-dive company nodes (general defense-tech; NOT Austin–Israel — kept out of Lane B)
  { org_id: 'org-chaos-industries', label: 'CHAOS Industries', node_function: 'defense_sensing_and_networks_company', hq: 'Los Angeles, CA', founded: 2022, receipt_ids: ['r-chaos-valor-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-raft', label: 'Raft', node_function: 'defense_data_and_ai_company', hq: 'McLean, VA', founded: 2018, receipt_ids: ['r-raft-mission-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { org_id: 'org-overland-ai', label: 'Overland AI', node_function: 'ground_autonomy_defense_company', hq: 'Seattle, WA', founded: 2022, receipt_ids: ['r-overland-8vc-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  ...['DIU', 'AFWERX', 'DARPA', 'Army Futures Command', 'NATO DIANA', 'Israeli MOD'].map(x => ({ org_id: `org-${idify(x)}`, label: x, node_function: 'public_private_acquisition_or_defense_surface', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G })),
];
writeJsonl('organizations.jsonl', organizations);

// ---- actors (all from official sites/press; Israeli linkage only from explicit self/press identification) ----
const stratosTeam = [
  ['Rotem (Yehuda) Kakon', 'Co-Founder & General Partner', 'org-stratos-ventures', null],
  ['Aviad Grinfeld', 'Co-Founder & General Partner', 'org-stratos-ventures', null],
  ['Daniel Fouzailov', 'General Partner', 'org-stratos-ventures', null],
  ['LTG (Ret.) Michael Barbero', 'Partner; President, SAAB USA', 'org-stratos-ventures', null],
  ['Steve Braverman', 'Partner; Founder & Co-Chairman of Pathstone', 'org-stratos-ventures', null],
  ['David Braverman', 'Partner; co-founder, Saichel Capital Management family office', 'org-stratos-ventures', null],
  ['Theo Williams', 'Partner; former Head of Portfolio Development, Salesforce Ventures', 'org-stratos-ventures', null],
  ['Israel Biran', 'Partner; Israeli Air Force veteran', 'org-stratos-ventures', 'explicit: Israeli Air Force veteran (self-represented on Stratos site)'],
  ['Doron Landau', 'Partner; space-tech entrepreneur', 'org-stratos-ventures', null],
];
const pallasTeam = [
  ['Sally Donnelly', 'Founding Partner (ex-Senior Advisor to the SecDef; ex-Director, CENTCOM Washington Office)', 'org-pallas-advisors'],
  ['Tony DeMartino', 'Founding Partner (ex-Office of the Secretary of Defense)', 'org-pallas-advisors'],
  ['Richard Spencer', 'Managing Director', 'org-pallas-ventures'],
];
const tvpTeam = [
  ['Tal Shmueli', 'Lead (Israeli-born; former IDF Special Forces; former LinkedIn executive)', 'org-texas-venture-partners', 'explicit: Israeli-born, former IDF (press-reported)'],
  ['Lorne Abony', 'Lead', 'org-texas-venture-partners', null],
];
const traysarTeam = [
  ['Yadin Soffer', 'Co-Founder & CEO (Austin resident; moved to the US from Israel)', 'org-traysar', 'explicit: moved to US from Israel (press-reported)'],
  ['Asher Katz', 'Co-Founder (served in an Israeli military tunnel-detection unit)', 'org-traysar', 'explicit: Israeli military service, self/press-identified'],
  ['Gilad Adin', 'Co-Founder (former Israeli military and foreign-affairs advisor)', 'org-traysar', 'explicit: former Israeli military/foreign-affairs advisor (press-reported)'],
];
const mk = (label, title, org, receipt, israel_linkage_basis) => ({ actor_id: `act-${idify(label)}`, label, org_id: org, stated_title: title, israel_linkage_basis: israel_linkage_basis ?? null, receipt_ids: receipt, discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Publicly represented on the org\'s own site or in named press (self/press representation).', graph_effect: G });
const actors = [
  { actor_id: 'act-joshua-baer', label: 'Joshua Baer', affiliation: 'Capital Factory (founder, per natsec100 seed)', israel_linkage_basis: null, receipt_ids: ['r-baer-profile-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'receipt_unresolved', note: 'Seed asserts founder role via r-baer-profile-2026, which has no source-addressable receipt. Nothing is inferred about this person.', graph_effect: G },
  { actor_id: 'act-jackson-moses', label: 'Jackson Moses', org_id: 'org-silent-ventures', stated_title: 'Founder, Silent Ventures', israel_linkage_basis: null, receipt_ids: ['r-silentventures-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', note: 'Founder of Silent Ventures per firm site/press.', graph_effect: G },
  ...stratosTeam.map(([l, t, o, b]) => mk(l, t, o, ['r-stratos-official-site-2026'], b)),
  ...pallasTeam.map(([l, t, o]) => mk(l, t, o, [o === 'org-pallas-ventures' ? 'r-pallas-ventures-site-2026' : 'r-pallas-advisors-site-2026'], null)),
  ...tvpTeam.map(([l, t, o, b]) => mk(l, t, o, ['r-texasventurepartners-toi-2026'], b)),
  ...traysarTeam.map(([l, t, o, b]) => mk(l, t, o, ['r-traysar-newsroom-2026', 'r-traysar-prnewswire-2026'], b)),
];
writeJsonl('actors.jsonl', actors);

// ---- professional claims ----
writeJsonl('professional-claims.jsonl', actors.map(a => ({ claim_id: `pc-${a.actor_id}`, actor_id: a.actor_id, predicate: 'publicly_represented_role_at', role_title: a.stated_title ?? a.affiliation ?? null, org_id: a.org_id ?? null, israel_linkage_basis: a.israel_linkage_basis ?? null, receipt_ids: a.receipt_ids, discovery_admission_state: a.discovery_admission_state, independent_corroboration_state: a.independent_corroboration_state, graph_effect: G })));

// ---- portfolio edges ----
const cf = cfUniverse;
const stratosNamed = ['Particle', 'Tenna', 'Skapion']; // press-named (CTech); 3 of ~5 backed
const pallasNamed = ['Morpheus Space', 'Calypso AI', 'Rebellion Defense', 'Interos', 'Second Front', 'Hermeus'];
writeJsonl('portfolio-edges.jsonl', [
  ...cf.company_names.map(n => ({ from_org_id: 'org-capital-factory', predicate: 'publicly_lists_portfolio_company', company_name_as_listed: n, receipt_ids: ['r-capital-factory-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Listed on CF public portfolio page. Listing is NOT identity resolution and NOT evidence of a priced equity investment.', graph_effect: G })),
  ...stratosNamed.map(n => ({ from_org_id: 'org-stratos-ventures', predicate: 'press_named_portfolio_company', company_name_as_listed: n, receipt_ids: ['r-stratos-ctech-portfolio-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', note: 'Named in press as a Stratos portfolio company; site itself shows portfolio only as logos.', graph_effect: G })),
  { from_org_id: 'org-stratos-ventures', predicate: 'portfolio_remainder', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_unavailable', note: 'Beyond the 3 press-named companies, the Stratos site portfolio is logos-only and not OCR-promoted; ~2 of 5 backed remain unnamed.', graph_effect: G },
  ...pallasNamed.map(n => ({ from_org_id: 'org-pallas-ventures', predicate: 'publicly_lists_portfolio_company', company_name_as_listed: n, receipt_ids: ['r-pallas-ventures-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Named on the Pallas Ventures page.', graph_effect: G })),
]);

// ---- government surfaces ----
writeJsonl('government-surfaces.jsonl', [
  ...['Israeli MOD', 'U.S. DoD', 'NATO DIANA'].map(s => ({ org_id: 'org-stratos-ventures', predicate: 'claims_active_partnership_with', surface: s, receipt_ids: ['r-stratos-official-site-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'self_claimed', note: 'Stated on Stratos own site; no counterpart (MOD/DoD/DIANA) confirmation found.', graph_effect: G })),
  { org_id: 'org-stratos-ventures', predicate: 'claims_partner_access_to', surface: 'U.S. CENTCOM / Port of Miami (via The LAB Miami)', receipt_ids: ['r-stratos-refreshmiami-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'self_claimed', graph_effect: G },
  { org_id: 'org-capital-factory', predicate: 'claimed_surface_via_seed', surface: 'DIU / AFWERX', receipt_ids: ['r-diu-capitalfactory-2025', 'r-capitalfactory-government-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'receipt_unresolved', graph_effect: G },
]);

// ---- Lane B: Austin–Israel cohort (EXECUTED this pass; source-explicit members only) ----
const austinIsraelCohort = [
  { member_id: 'cohort-traysar', org_id: 'org-traysar', label: 'Traysar', hq: 'Austin, TX', linkage_basis: 'Founders self/press-identified: Soffer (moved to US from Israel), Katz (Israeli military tunnel-detection unit), Adin (former Israeli military/foreign-affairs advisor). NOT inferred from any name.', silent_ventures_backed: true, receipt_ids: ['r-traysar-newsroom-2026', 'r-traysar-prnewswire-2026', 'r-traysar-jpost-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
  { member_id: 'cohort-texas-venture-partners', org_id: 'org-texas-venture-partners', label: 'Texas Venture Partners', hq: 'Austin, TX', linkage_basis: 'Austin fund with an explicit Israeli-defense-tech mandate; lead Tal Shmueli press-identified as Israeli-born, ex-IDF. Institutional (fund) member, not a product company.', receipt_ids: ['r-texasventurepartners-toi-2026'], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
];
const austinIsraelExcluded = [
  { org_id: 'org-elbit-systems-of-america', label: 'Elbit Systems of America', reason: 'Israeli-parent US defense subsidiary, but HQ is Fort Worth, TX — not Austin. Excluded from the Austin cohort to keep the geographic boundary honest.', discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', graph_effect: G },
  { org_id: 'org-stratos-ventures', label: 'Stratos Ventures', reason: 'Israel-explicit, but Tel Aviv HQ + Miami office; routes US access through Miami/The LAB, not Austin. Not an Austin cohort member.', discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', graph_effect: G },
];
writeJsonl('austin-israel-cohort.jsonl', [...austinIsraelCohort, ...austinIsraelExcluded.map(x => ({ ...x, membership: 'excluded' }))]);

// ---- THE OVERLAPS, ACTUALLY RUN ----
const ns = readJsonl(path.join(N, 'chunk1/companies.jsonl'));
const nsByCore = new Map();
for (const c of ns) for (const nm of [c.canonical_name, ...(c.aliases ?? [])]) { const k = core(nm); if (k) nsByCore.set(k, c); }
// bf26860 second-tier corroboration overlay, keyed by NatSec100 core
const cfCorroborated = {
  'icon': { receipt: 'r-icon-cf-startup-2026', basis: 'CF dedicated /startup/icon page + independent press (3dprint, axios); homonym disambiguated to Austin construction-3D-printing ICON with DoD contracts.' },
  'saronic': { receipt: 'r-cf-natsec-press-corroboration-2026', basis: 'Press corroborates Saronic (autonomous surface vessels) as a genuine CF portfolio company.' },
  'firefly aerospace': { receipt: 'r-cf-natsec-press-corroboration-2026', basis: 'Press corroborates Firefly Aerospace (Nasdaq FLY) as a genuine CF portfolio company.' },
  'venus aerospace': { receipt: 'r-cf-natsec-press-corroboration-2026', basis: 'Press corroborates Venus Aerospace (hypersonics) as a genuine CF portfolio company.' },
};

const cfByCore = new Map();
for (const n of cf.company_names) { const k = core(n); if (k && !cfByCore.has(k)) cfByCore.set(k, n); }
const confirmed = [], rejected = [], candidates = [];
for (const [k, cfName] of cfByCore) {
  if (nsByCore.has(k)) {
    const corr = cfCorroborated[k];
    const rec = { join_id: `join-cf-ns-${k.replace(/ /g, '-')}`, kind: 'capital_factory_x_natsec100_co_listing', cf_name: cfName, natsec100_name: nsByCore.get(k).canonical_name, natsec100_years: nsByCore.get(k).natsec100_years_documented, receipt_ids: ['r-capital-factory-portfolio-2026', ...(nsByCore.get(k).receipt_ids ?? []), ...(corr ? [corr.receipt] : [])], discovery_admission_state: 'admitted', independent_corroboration_state: corr ? 'independently_corroborated' : 'source_explicit', corroboration_basis: corr ? corr.basis : 'named on two independent curated public lists (CF portfolio + NatSec100)', portfolio_listing_is_not_equity_investment: true, note: 'Co-listing, NOT legal-identity resolution, ownership, or a priced-investment finding.', graph_effect: G };
    confirmed.push(rec); candidates.push({ ...rec, state: rec.independent_corroboration_state });
  }
}
// rejected fuzzy: CF name whose first core token equals a NatSec100 first token but not a full-core match
const nsFirst = new Map(); for (const [k, c] of nsByCore) { const t = k.split(' ')[0]; if (t && !nsFirst.has(t)) nsFirst.set(t, c); }
for (const [k, cfName] of cfByCore) {
  if (nsByCore.has(k)) continue;
  const t = k.split(' ')[0];
  if (t && nsFirst.has(t)) {
    const rec = { join_id: `reject-cf-ns-${k.replace(/ /g, '-')}`, kind: 'capital_factory_x_natsec100_name_only', cf_name: cfName, natsec100_near: nsFirst.get(t).canonical_name, reason: 'shared leading token without full normalized-core match', discovery_admission_state: 'admitted', independent_corroboration_state: 'name_match_only', disposition: 'rejected', graph_effect: G };
    rejected.push(rec); candidates.push({ ...rec, state: 'rejected_name_match_only' });
  }
}

// Pallas Ventures × NatSec100 (source-explicit co-listings)
const pallasNs = [];
for (const p of pallasNamed) {
  const k = core(p);
  if (nsByCore.has(k)) {
    const rec = { join_id: `join-pallas-ns-${k.replace(/ /g, '-')}`, kind: 'pallas_ventures_x_natsec100_co_listing', pallas_name: p, natsec100_name: nsByCore.get(k).canonical_name, natsec100_years: nsByCore.get(k).natsec100_years_documented, receipt_ids: ['r-pallas-ventures-site-2026', ...(nsByCore.get(k).receipt_ids ?? [])], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', corroboration_basis: 'named on Pallas Ventures portfolio page AND ranked on NatSec100', note: 'Co-listing across a DC advisory-fund portfolio and the NatSec100 surface.', graph_effect: G };
    pallasNs.push(rec); confirmed.push(rec); candidates.push({ ...rec, state: 'source_explicit' });
  }
}

// Silent Ventures × NatSec100 (reported tier; Silent portfolio from firm site/press, not a hash-pinned list)
const silentPortfolio = ['Aeon Industrial', 'Armada AI', 'Dirac', 'Dominion Dynamics', 'Erebor Bank', 'Firestorm', 'Fulcrum Autonomy', 'Furientis', 'Gallatin AI', 'Hadrian', 'Haxion AI', 'Ironstead', 'Sandtable', 'Supply Energetics', 'Swarm Aero', 'Swarmbotics AI', 'Terra Industries', 'Traysar'];
const silentNs = [];
for (const s of silentPortfolio) {
  const k = core(s);
  if (nsByCore.has(k)) {
    const identity_unconfirmed = k === 'armada'; // generic token; same-name risk
    const rec = { join_id: `join-silent-ns-${k.replace(/ /g, '-')}`, kind: 'silent_ventures_x_natsec100_co_listing', silent_name: s, natsec100_name: nsByCore.get(k).canonical_name, natsec100_years: nsByCore.get(k).natsec100_years_documented, receipt_ids: ['r-silentventures-site-2026', ...(nsByCore.get(k).receipt_ids ?? [])], discovery_admission_state: 'admitted', independent_corroboration_state: identity_unconfirmed ? 'name_match_only' : 'reported', identity_unconfirmed, note: identity_unconfirmed ? 'Generic token "Armada"; entity identity not confirmed against NatSec100 Armada — kept as name_match_only.' : 'Silent Ventures portfolio company also ranked on NatSec100 (portfolio list is firm-site/press, not hash-pinned).', graph_effect: G };
    silentNs.push(rec); candidates.push({ ...rec, state: rec.independent_corroboration_state });
    if (!identity_unconfirmed) confirmed.push(rec);
  }
}

// cross-router joins
const crossJoins = [
  // CF↔Stratos: relabeled. Absence of a found edge on searched surfaces is NOT a proven negative.
  { join_id: 'join-cf-stratos', kind: 'capital_factory_x_stratos', tested: true, searched_surfaces: ['stratos-vc.com', 'CTech/jpost/refreshmiami press', 'capitalfactory.com/portfolio'], discovery_admission_state: 'admitted', independent_corroboration_state: 'no_source_explicit_join_observed_on_searched_surfaces', disposition: 'no_source_explicit_join_observed_on_searched_surfaces', reason: 'On the surfaces searched, no source-explicit edge appears: Stratos (Tel Aviv HQ + Miami office, The LAB Miami partner) makes no mention of Austin or Capital Factory. This is absence-of-observed-edge on searched surfaces, NOT a proven absence of any relationship.', receipt_ids: ['r-stratos-official-site-2026', 'r-stratos-refreshmiami-2026', 'r-capital-factory-portfolio-2026'], graph_effect: G },
  // Traysar ties Lane B into the corridor via Silent Ventures (source-explicit)
  { join_id: 'join-traysar-silent-ventures', kind: 'traysar_x_silent_ventures', tested: true, discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', disposition: 'confirmed', reason: 'Silent Ventures led Traysar\'s $25M seed (press). Connects the Austin–Israel cohort to the existing Silent Ventures / Jackson Moses node.', receipt_ids: ['r-traysar-prnewswire-2026', 'r-silentventures-site-2026'], graph_effect: G },
  { join_id: 'join-stratos-natsec100', kind: 'stratos_x_natsec100', tested: true, discovery_admission_state: 'admitted', independent_corroboration_state: 'no_source_explicit_join_observed_on_searched_surfaces', disposition: 'no_source_explicit_join_observed_on_searched_surfaces', reason: '3 press-named Stratos companies (Particle, Tenna, Skapion) do not match any NatSec100 core; remaining portfolio is logos-only. No co-listing observed on searched surfaces.', receipt_ids: ['r-stratos-ctech-portfolio-2026'], graph_effect: G },
  { join_id: 'join-cf-pallas', kind: 'capital_factory_x_pallas', tested: true, discovery_admission_state: 'admitted', independent_corroboration_state: 'no_source_explicit_join_observed_on_searched_surfaces', disposition: 'no_source_explicit_join_observed_on_searched_surfaces', reason: 'No Pallas Ventures named portfolio company appears in the CF 837-company universe on searched surfaces.', receipt_ids: ['r-pallas-ventures-site-2026', 'r-capital-factory-portfolio-2026'], graph_effect: G },
  { join_id: 'join-stratos-pallas', kind: 'stratos_x_pallas', tested: false, discovery_admission_state: 'not_admitted', independent_corroboration_state: 'not_searched', disposition: 'not_searched', graph_effect: G },
];
candidates.push(...crossJoins);

// ---- deep dives: CHAOS Industries, Raft, Overland AI (source-addressed; NatSec100 co-listing + shared-investor topology) ----
const deepDiveDefs = [
  { org_id: 'org-chaos-industries', label: 'CHAOS Industries', natsec_lookup: 'CHAOS Industries', hq: 'Los Angeles, CA', founded: 2022, sector: 'coherent distributed networks / sensing', funding: '~$1B total; Series D $510M led by Valor Equity Partners', investors: ['Valor Equity Partners', '8VC', 'Accel'], receipt: 'r-chaos-valor-2026' },
  { org_id: 'org-raft', label: 'Raft', natsec_lookup: 'Raft', hq: 'McLean, VA', founded: 2018, sector: 'defense data + AI (RDP / RAIMS)', funding: '$60M from Washington Harbour Partners (2024); $349M USSOCOM IDIQ', investors: ['Washington Harbour Partners'], receipt: 'r-raft-mission-2026' },
  { org_id: 'org-overland-ai', label: 'Overland AI', natsec_lookup: 'Overland AI', hq: 'Seattle, WA', founded: 2022, sector: 'ground autonomy (TERRAIN-AI)', funding: '~$142M total; $100M led by 8VC (2026)', investors: ['8VC', 'Valor Equity Partners', 'Point72 Ventures'], receipt: 'r-overland-8vc-2026' },
];
const deepDives = [];
for (const d of deepDiveDefs) {
  const k = core(d.natsec_lookup);
  const nsHit = nsByCore.get(k);
  deepDives.push({
    deepdive_id: `dd-${idify(d.label)}`, org_id: d.org_id, label: d.label, hq: d.hq, founded: d.founded, sector: d.sector, funding: d.funding, investors: d.investors,
    natsec100_member: !!nsHit, natsec100_name: nsHit ? nsHit.canonical_name : null, natsec100_years: nsHit ? nsHit.natsec100_years_documented : null,
    capital_factory_listed: cfByCore.has(k),
    austin_israel_relevance: 'none — general US defense-tech; not Austin-HQ and no Israeli-linkage claim (kept OUT of Lane B).',
    receipt_ids: [d.receipt, ...(nsHit ? (nsHit.receipt_ids ?? []) : [])],
    discovery_admission_state: 'admitted', independent_corroboration_state: nsHit ? 'source_explicit' : 'reported',
    note: 'NatSec100 membership is a source_explicit co-listing (chunk1 official receipts). Funding/investors are press-reported. Presence and co-investment are graph facts, never coordination claims.',
    graph_effect: G,
  });
  if (nsHit) {
    const rec = { join_id: `join-deepdive-ns-${k.replace(/ /g, '-')}`, kind: 'deepdive_x_natsec100_co_listing', company: d.label, natsec100_name: nsHit.canonical_name, natsec100_years: nsHit.natsec100_years_documented, receipt_ids: [d.receipt, ...(nsHit.receipt_ids ?? [])], discovery_admission_state: 'admitted', independent_corroboration_state: 'source_explicit', note: 'Deep-dive company ranked on NatSec100.', graph_effect: G };
    confirmed.push(rec); candidates.push({ ...rec, state: 'source_explicit' });
  }
}
writeJsonl('deep-dives.jsonl', deepDives);
// shared-investor topology across deep dives (reported tier; co-investment is NOT coordination)
const investorIndex = new Map();
for (const d of deepDiveDefs) for (const inv of d.investors) { if (!investorIndex.has(inv)) investorIndex.set(inv, []); investorIndex.get(inv).push(d.label); }
const sharedInvestors = [...investorIndex].filter(([, cos]) => cos.length > 1).map(([inv, cos]) => ({ investor: inv, co_invested_deepdives: cos, receipt_ids: cos.map(c => deepDiveDefs.find(d => d.label === c).receipt), discovery_admission_state: 'admitted', independent_corroboration_state: 'reported', forbidden_inference: 'Shared investor across two companies is NOT coordination, control, or a relationship between the companies.', graph_effect: G }));

writeJsonl('join-candidates.jsonl', candidates);
writeJsonl('confirmed-joins.jsonl', confirmed);
writeJsonl('rejected-joins.jsonl', [...rejected, ...crossJoins.filter(j => j.disposition === 'rejected' || String(j.disposition).startsWith('no_source_explicit'))]);

// ---- coverage gaps ----
writeJsonl('coverage-gaps.jsonl', [
  { gap_id: 'gap-stratos-portfolio', state: 'source_unavailable', detail: 'Stratos portfolio: 3 companies (Particle, Tenna, Skapion) now press-named; the remaining ~2 of 5 backed are logos-only on stratos-vc.com and not OCR-promoted. Visual image review still required for full resolution.', graph_effect: G },
  { gap_id: 'gap-stratos-gov-corroboration', state: 'not_searched', detail: 'Stratos MOD/DoD/NATO-DIANA partnerships remain self-claimed; independent counterpart confirmation not searched.', graph_effect: G },
  { gap_id: 'gap-austin-israel-cohort', state: 'searched_nonexhaustive', detail: 'Lane B EXECUTED this pass: 2 source-explicit Austin members recorded (Traysar; Texas Venture Partners). A 5W Research report cites 80+ Israeli tech companies entering Texas since 2020 — a full census was NOT run; additional members likely exist. Israel linkage recorded only from explicit self/press identification, never a name.', graph_effect: G },
  { gap_id: 'gap-pallas-foundation', state: 'source_unavailable', detail: 'Pallas Foundation is named as a distinct arm in site navigation; no detail page acquired this pass.', graph_effect: G },
  { gap_id: 'gap-silent-portfolio-hash', state: 'source_unavailable', detail: 'Silent Ventures portfolio taken from firm site/press, not a hash-pinned list; Silent×NatSec co-listings are reported-tier, and "Armada" is name_match_only pending identity confirmation.', graph_effect: G },
  { gap_id: 'gap-unresolved-receipts', state: 'receipt_unresolved', detail: `${demoted.length} natsec100 seed receipt references (of 22 distinct seed r-* ids; 1 resolved = r-capital-factory-portfolio-2026) have no source-addressable record and were demoted.`, unresolved_receipt_ids: demoted, graph_effect: G },
]);

// ---- motifs (by DISTINCT institutions/people, never Cartesian pairs) ----
writeJsonl('motifs.jsonl', [
  { motif_id: 'capital_to_accelerator_to_validation', pattern: 'Capital Factory portfolio company also ranked on the NatSec100 validation surface', distinct_companies: confirmed.filter(c => c.kind === 'capital_factory_x_natsec100_co_listing').length, companies: confirmed.filter(c => c.kind === 'capital_factory_x_natsec100_co_listing').map(c => c.natsec100_name), independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'dc_advisory_fund_to_validation', pattern: 'Pallas Ventures (DC advisory-linked fund) portfolio company also ranked on NatSec100', distinct_companies: pallasNs.length, companies: pallasNs.map(c => c.natsec100_name), independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'defense_venture_to_validation', pattern: 'Silent Ventures portfolio company also ranked on NatSec100', distinct_companies: silentNs.filter(s => !s.identity_unconfirmed).length, companies: silentNs.filter(s => !s.identity_unconfirmed).map(c => c.natsec100_name), independent_corroboration_state: 'reported', graph_effect: G },
  { motif_id: 'austin_israel_defense_company', pattern: 'Austin-headquartered defense company with explicitly self/press-identified Israeli-founder linkage', distinct_companies: 1, companies: ['Traysar'], independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'israeli_defensetech_capital_routers', pattern: 'Israeli-defense-tech capital routers into the US market', distinct_institutions: 2, institutions: ['Stratos Ventures (Tel Aviv/Miami, self-claimed gov access)', 'Texas Venture Partners (Austin)'], independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'public_service_to_adviser_fund', pattern: 'Retired senior US national-security figure as fund partner', distinct_people: 3, people: ['LTG (Ret.) Michael Barbero (President, SAAB USA) — Stratos', 'Sally Donnelly (ex-Sr Advisor SecDef) — Pallas', 'Tony DeMartino (ex-OSD) — Pallas'], independent_corroboration_state: 'source_explicit', graph_effect: G },
  { motif_id: 'shared_investor_across_deepdives', pattern: 'Same investor named in the funding of two deep-dive NatSec100 companies (co-investment topology, NOT coordination)', shared: sharedInvestors.map(s => ({ investor: s.investor, companies: s.co_invested_deepdives })), independent_corroboration_state: 'reported', forbidden_inference: 'Shared investor != coordination or relationship between the funded companies.', graph_effect: G },
]);

// ---- manifest ----
const cfNsConfirmed = confirmed.filter(c => c.kind === 'capital_factory_x_natsec100_co_listing');
const manifest = {
  schema_version: 'austin-israel-defense-corridor@2',
  built_at: '2026-07-14',
  purpose: 'Portable, source-addressed intake of the Austin / Capital Factory, Austin–Israel (Lane B), Stratos, Pallas, and Silent Ventures corridors, joined to NatSec100 only where source-explicit. Discovery admission is separate from independent corroboration. Recovery increment: Lane B executed, Stratos portfolio partly resolved, Pallas integrated, CF↔Stratos relabeled from proven-rejection to absence-on-searched-surfaces.',
  counts: {
    receipts_total: receipts.length, receipts_resolved: resolvedReceipts.length, receipts_unresolved: demoted.length,
    seed_receipt_denominator: [...referenced].length,
    organizations: organizations.length, actors: actors.length,
    capital_factory_portfolio_universe: cf.distinct_company_names,
    natsec100_universe: ns.length,
    cf_natsec100_confirmed_colistings: cfNsConfirmed.length,
    cf_natsec100_independently_corroborated: cfNsConfirmed.filter(c => c.independent_corroboration_state === 'independently_corroborated').length,
    cf_natsec100_rejected_name_only: rejected.length,
    pallas_ventures_natsec100_colistings: pallasNs.length,
    silent_ventures_natsec100_colistings: silentNs.filter(s => !s.identity_unconfirmed).length,
    austin_israel_cohort_members: austinIsraelCohort.length,
    stratos_portfolio_press_named: stratosNamed.length,
    deep_dives: deepDives.length,
    deep_dives_natsec100_members: deepDives.filter(d => d.natsec100_member).length,
    shared_investors_across_deepdives: sharedInvestors.length,
    cross_router_joins_no_edge_observed: crossJoins.filter(j => String(j.disposition).startsWith('no_source_explicit')).length,
    cross_router_joins_confirmed: crossJoins.filter(j => j.disposition === 'confirmed').length,
    cross_router_joins_not_searched: crossJoins.filter(j => j.disposition === 'not_searched').length,
  },
  key_findings: [
    `Capital Factory overlap: ${cf.distinct_company_names} CF portfolio companies x ${ns.length} NatSec100 -> ${cfNsConfirmed.length} co-listings (${cfNsConfirmed.filter(c => c.independent_corroboration_state === 'independently_corroborated').length} independently corroborated: ICON/Saronic/Firefly/Venus). Portfolio listing is NOT equity investment.`,
    `Lane B (Austin–Israel) EXECUTED: ${austinIsraelCohort.length} source-explicit Austin members (Traysar; Texas Venture Partners). Traysar ties in via Silent Ventures-led seed. No linkage inferred from any name.`,
    `Pallas integrated as three arms (Advisors/Ventures/Foundation); Pallas Ventures x NatSec100 -> ${pallasNs.length} co-listings.`,
    `Silent Ventures x NatSec100 -> ${silentNs.filter(s => !s.identity_unconfirmed).length} co-listings (Armada held as name_match_only).`,
    'CF<->Stratos: relabeled to no_source_explicit_join_observed_on_searched_surfaces (absence on searched surfaces is not a proven negative).',
    `Deep dives: CHAOS Industries, Raft, Overland AI — all ${deepDives.filter(d => d.natsec100_member).length}/3 NatSec100 members; shared investors (8VC, Valor) span CHAOS+Overland (co-investment != coordination).`,
    `Receipt audit: ${resolvedReceipts.length} resolved (4 now with content_sha256), ${demoted.length} demoted; seed denominator ${[...referenced].length} distinct r-* ids across all seed files + both fields.`,
  ],
  dual_state_model: { discovery_admission_states: ['admitted', 'not_admitted'], independent_corroboration_states: ['source_explicit', 'independently_corroborated', 'self_claimed', 'name_match_only', 'reported', 'not_searched', 'source_unavailable', 'receipt_unresolved', 'no_source_explicit_join_observed_on_searched_surfaces'] },
  evidence_limit: 'Self-authored profiles/company pages establish only that an actor/org publicly represented a role or relationship — never legal identity, transaction, ownership, coordination, influence, or wrongdoing.',
  graph_effect: G,
};
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`corridor@2: CF ${cf.distinct_company_names}x NatSec ${ns.length} -> ${cfNsConfirmed.length} co-listings (${manifest.counts.cf_natsec100_independently_corroborated} corroborated); Pallas×NS ${pallasNs.length}; Silent×NS ${silentNs.filter(s=>!s.identity_unconfirmed).length}; Lane B ${austinIsraelCohort.length} members; receipts ${resolvedReceipts.length} resolved/${demoted.length} unresolved; CF<->Stratos: no edge observed`);
