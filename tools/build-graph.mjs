// Adds the master-document layers that the Dialog import does not cover:
// Detachment 201, missing CEO/founder nodes, nonprofit officers, sovereign
// capital chain, procurement surfaces, and the umbrella context map.
//
// Idempotent by id and by from->to:type, so it is safe to re-run. It does NOT
// re-import the 113-row Dialog directory (already present) and it does not
// touch existing edges. Writes both graph.json and cases/uk-ai-policy.json so
// every reader (tests, update-sweep, MCP, browser) sees the same graph.
//
// Run: `npm run build`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const graphPath = path.join(root, 'graph.json');
const casePath = path.join(root, 'cases', 'uk-ai-policy.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

const nodeIds = new Set(graph.nodes.map((n) => n.id));
const sourceIds = new Set(graph.sources.map((s) => s.id));
const edgeKeys = new Set(graph.edges.map((e) => `${e.from}->${e.to}:${e.type}`));

const slug = (name) =>
  name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function addSource(s) { if (!sourceIds.has(s.id)) { graph.sources.push(s); sourceIds.add(s.id); } return s.id; }
function addNode(n) { if (!nodeIds.has(n.id)) { graph.nodes.push({ privacy: 'public-role-only', ...n }); nodeIds.add(n.id); } return n.id; }
function addEdge(e) {
  const key = `${e.from}->${e.to}:${e.type}`;
  if (edgeKeys.has(key)) return;
  if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) throw new Error(`edge references missing node: ${key}`);
  graph.edges.push({ weight: 1, notes: '', ...e, id: e.id ?? `e-${slug(key)}` });
  edgeKeys.add(key);
}

// --- Sources (canonical official/outlet locations; labels carry specifics) ---
const S = {
  army: addSource({ id: 's-army-det201', label: 'US Army Public Affairs — Detachment 201, Executive Innovation Corps (launch 13 Jun 2025; second cohort 10 Jun 2026)', url: 'https://www.army.mil/', publisher: 'U.S. Army', source_type: 'official' }),
  pub: addSource({ id: 's-public-record', label: 'Public corporate / biographical record (company sites, proxy statements, official org pages)', url: 'https://www.sec.gov/edgar', publisher: 'Various primary public', source_type: 'primary_public' }),
  reuters: addSource({ id: 's-reuters-procurement', label: 'Reuters — defense procurement & capital reporting (Maven, Affinity, OpenAI DoD, Oklo, PsiQuantum)', url: 'https://www.reuters.com/', publisher: 'Reuters', source_type: 'reported' }),
  propublica: addSource({ id: 's-propublica', label: 'ProPublica Nonprofit Explorer — IRS 990 filings', url: 'https://projects.propublica.org/nonprofits/', publisher: 'ProPublica / IRS', source_type: 'primary_public' }),
  pif: addSource({ id: 's-pif-sanabil', label: 'Saudi PIF & Sanabil Investments — fund and portfolio disclosures', url: 'https://www.pif.gov.sa/', publisher: 'Saudi PIF / Sanabil', source_type: 'primary_public' }),
  ec: addSource({ id: 's-ec-kallas', label: 'European Commission — College of Commissioners, Kaja Kallas portfolio', url: 'https://commission.europa.eu/', publisher: 'European Commission', source_type: 'official' })
};

// --- Detachment 201 (Part 3) — official, ui 1 ---
addNode({ id: 'detachment-201', label: 'Detachment 201, Executive Innovation Corps', type: 'military-unit', description: 'U.S. Army Reserve unit (launched 13 Jun 2025) commissioning senior tech executives as part-time Lt. Colonels to advise on Army modernization: munitions supply-chain data, autonomous systems, counter-drone strategy.' });
addNode({ id: 'shyam-sankar', label: 'Shyam Sankar', type: 'person', description: 'CTO & EVP, Palantir; Army Reserve Lt. Colonel, Detachment 201.' });
addNode({ id: 'andrew-bosworth', label: 'Andrew "Boz" Bosworth', type: 'person', description: 'CTO, Meta (Reality Labs); Army Reserve Lt. Colonel, Detachment 201.' });
addNode({ id: 'kevin-weil', label: 'Kevin Weil', type: 'person', description: 'Chief Product Officer, OpenAI; Army Reserve Lt. Colonel, Detachment 201.' });
addNode({ id: 'bob-mcgrew', label: 'Bob McGrew', type: 'person', description: 'Former Chief Research Officer, OpenAI; adviser, Thinking Machines Lab; Army Reserve Lt. Colonel, Detachment 201.' });
for (const p of ['shyam-sankar', 'andrew-bosworth', 'kevin-weil', 'bob-mcgrew']) {
  addEdge({ from: p, to: 'detachment-201', type: 'commissioned-into', claim: `${p.replace(/-/g, ' ')} was named by U.S. Army Public Affairs as a commissioned member of Detachment 201.`, source_ids: [S.army], evidence_class: 'official', status: 'appointed', ui_weight: 1, notes: 'Army Reserve commission; a second institutional role alongside the civilian one.' });
}
addEdge({ from: 'shyam-sankar', to: 'palantir', type: 'cto-of', claim: 'Shyam Sankar is CTO & EVP of Palantir (Army release + Palantir proxy statement).', source_ids: [S.army, S.pub], evidence_class: 'official', status: 'public-role', ui_weight: 1 });
addEdge({ from: 'andrew-bosworth', to: 'meta-ai', type: 'cto-of', claim: 'Andrew Bosworth is CTO of Meta (Army release + Meta leadership page).', source_ids: [S.army, S.pub], evidence_class: 'official', status: 'public-role', ui_weight: 1 });
addEdge({ from: 'kevin-weil', to: 'openai', type: 'cpo-of', claim: 'Kevin Weil is Chief Product Officer of OpenAI (Army release + OpenAI announcement).', source_ids: [S.army, S.pub], evidence_class: 'official', status: 'public-role', ui_weight: 1 });
addEdge({ from: 'bob-mcgrew', to: 'openai', type: 'former-cro-of', claim: 'Bob McGrew is former Chief Research Officer of OpenAI (Army release).', source_ids: [S.army], evidence_class: 'official', status: 'public-role', ui_weight: 2 });

// --- Missing CEO / founder nodes (Part 4) ---
addNode({ id: 'oklo', label: 'Oklo', type: 'company', description: 'Advanced nuclear reactor company; DOE/NRC regulatory surface; data-center power deals.' });
addNode({ id: 'psiquantum', label: 'PsiQuantum', type: 'company', description: 'Quantum computing company; Australia/UK/US government investment; DARPA evaluation.' });
addNode({ id: 'isomorphic-labs', label: 'Isomorphic Labs', type: 'company', description: 'DeepMind-affiliated drug discovery company.' });
addNode({ id: 'spacex', label: 'SpaceX', type: 'company', description: 'Launch and satellite company; Space Force and NASA contracts.' });
addNode({ id: 'groq', label: 'Groq', type: 'company', description: 'AI inference chip company; DOE Genesis Mission participant; UK data centre.' });
addNode({ id: 'neuralink', label: 'Neuralink', type: 'company', description: 'Brain-computer interface company; FDA Breakthrough Device designation.' });
addNode({ id: 'renaissance-technologies', label: 'Renaissance Technologies', type: 'company', description: 'Quantitative hedge fund.' });
const ceos = [
  ['alex-karp', 'Alex Karp', 'CEO and co-founder, Palantir.', [['co-founded', 'palantir'], ['ceo-of', 'palantir']]],
  ['sam-altman', 'Sam Altman', 'CEO, OpenAI; former chair, Oklo.', [['ceo-of', 'openai'], ['former-chair-of', 'oklo']]],
  ['alice-bentinck', 'Alice Bentinck', 'Co-founder and CEO, Entrepreneur First; co-author with Matt Clifford.', [['co-founded', 'entrepreneur-first'], ['ceo-of', 'entrepreneur-first']]],
  ['jeremy-obrien', 'Jeremy O\'Brien', 'Co-founder and CEO, PsiQuantum.', [['co-founded', 'psiquantum'], ['ceo-of', 'psiquantum']]],
  ['jacob-dewitte', 'Jacob DeWitte', 'Co-founder, CEO and chair, Oklo.', [['co-founded', 'oklo'], ['ceo-of', 'oklo'], ['became-chair-of', 'oklo']]],
  ['demis-hassabis', 'Demis Hassabis', 'CEO, Google DeepMind; ARIA external adviser; EF investor.', [['ceo-of', 'google-deepmind'], ['external-adviser-to', 'aria'], ['investor-in', 'entrepreneur-first']]],
  ['mark-zuckerberg', 'Mark Zuckerberg', 'Founder and CEO, Meta.', [['founder-ceo-of', 'meta-ai']]],
  ['robert-mercer', 'Robert Mercer', 'Former co-CEO, Renaissance Technologies; political donor.', [['former-co-ceo-of', 'renaissance-technologies']]],
  ['max-jaderberg', 'Max Jaderberg', 'President, Isomorphic Labs; ARIA board member.', [['president-of', 'isomorphic-labs'], ['board-member-of', 'aria']]]
];
for (const [id, label, description, edges] of ceos) {
  addNode({ id, label, type: 'person', description });
  for (const [type, to] of edges) addEdge({ from: id, to, type, claim: `${label}: ${type.replace(/-/g, ' ')} ${to.replace(/-/g, ' ')} (public record).`, source_ids: [S.pub], evidence_class: 'primary_public', status: 'public-role', ui_weight: 1 });
}

// --- Procurement / state surfaces (Part 9) — reported, ui 2 ---
const procurement = [
  ['palantir', 'Pentagon Maven Smart System — prototype $480M (2024), program of record (2026); US Army enterprise agreement up to $10B/10yr; NATO Maven.'],
  ['spacex', 'Space Force Space Data Network Backbone contract ($2.29B); NASA Human Landing System contractor.'],
  ['groq', 'DOE Genesis Mission participant (Dec 2025); UK London data centre (~£100M, Jun 2025).'],
  ['psiquantum', 'Australia federal + Queensland (~A$940M), Illinois support, DARPA Quantum Benchmarking evaluation, UK R&D facility.'],
  ['oklo', 'DOE/NRC/Idaho National Laboratory regulatory surface; Switch data-center power deal.'],
  ['openai', 'ChatGPT Gov launched for US agencies; DoD contract ($200M ceiling) for frontier AI in acquisition data and cyber defense.']
];
for (const [org, claim] of procurement) {
  const sid = `${org}-state-surface`;
  addNode({ id: sid, label: `${org.replace(/-/g, ' ')} — state/procurement surface`, type: 'procurement-surface', description: claim });
  addEdge({ from: org, to: sid, type: 'procurement-record', claim, source_ids: [S.reuters], evidence_class: 'reported', status: 'contracted', ui_weight: 2 });
}
addNode({ id: 'shivon-zilis-neuralink', label: 'Neuralink directorship', type: 'procurement-surface', description: 'Shivon Zilis is a director of Neuralink; FDA Breakthrough Device designation.' });
addEdge({ from: 'shivon-zilis', to: 'neuralink', type: 'director-of', claim: 'Shivon Zilis is a director of Neuralink (public record).', source_ids: [S.pub], evidence_class: 'primary_public', status: 'public-role', ui_weight: 2 });

// --- Nonprofit officer layer (Part 10) — primary_public (990) ---
const nonprofits = [
  ['charles-koch-foundation', 'Charles Koch Foundation', '501(c)(3); 2024 expenses ~$67.9M, net assets ~$755.6M.', [['Charles Koch', 'charles-koch', 'chair-of'], ['Ryan Stowers', 'ryan-stowers', 'executive-director-of']]],
  ['berggruen-institute', 'Berggruen Institute', '501(c)(3); 2024 revenue ~$10.8M.', [['Nicolas Berggruen', 'nicolas-berggruen', 'chair-of']]],
  ['new-america', 'New America Foundation', '501(c)(3); 2024 revenue ~$37.2M.', [['Anne-Marie Slaughter', 'anne-marie-slaughter', 'ceo-of'], ['Reid Hoffman', 'reid-hoffman', 'director-of']]],
  ['adl', 'Anti-Defamation League', '501(c)(3); 2025 filing revenue ~$135.3M.', [['Jonathan Greenblatt', 'jonathan-greenblatt', 'ceo-of'], ['Yasmin Green', 'yasmin-green', 'director-of']]],
  ['mercatus-center', 'Mercatus Center', '501(c)(3); 2024 revenue ~$39.3M.', [['Tyler Cowen', 'tyler-cowen', 'board-chair-of']]],
  ['federalist-society', 'Federalist Society', '501(c)(3); FY2024 revenue ~$22.5M.', [['Leonard Leo', 'leonard-leo', 'co-chairman-of']]],
  ['americans-for-tax-reform', 'Americans for Tax Reform', '501(c)(4) advocacy entity — render separately from grantmaking foundations.', [['Grover Norquist', 'grover-norquist', 'president-of']]]
];
for (const [id, label, description, officers] of nonprofits) {
  addNode({ id, label, type: 'nonprofit', description });
  for (const [pname, pid, type] of officers) {
    const personId = nodeIds.has(slug(pname)) ? slug(pname) : pid;
    addNode({ id: personId, label: pname, type: 'person', description: `Officer of ${label}.` });
    addEdge({ from: personId, to: id, type, claim: `${pname} is ${type.replace(/-/g, ' ')} ${label} (IRS 990 / ProPublica).`, source_ids: [S.propublica], evidence_class: 'primary_public', status: 'public-role', ui_weight: 2 });
  }
}

// --- Sovereign capital chain (Part 11) — the documented headline chain ---
addNode({ id: 'saudi-pif', label: 'Saudi Public Investment Fund', type: 'sovereign-fund', description: 'Saudi sovereign wealth fund; $1T+ AUM, 220+ portfolio companies.' });
addNode({ id: 'sanabil', label: 'Sanabil Investments', type: 'sovereign-fund', description: 'Wholly owned by Saudi PIF; commits $3B+/year; LP to multiple US venture funds.' });
addNode({ id: 'founders-fund', label: 'Founders Fund', type: 'capital-fund', description: 'Venture fund; Peter Thiel managing partner; Sanabil LP relationship.' });
addEdge({ from: 'sanabil', to: 'saudi-pif', type: 'wholly-owned-by', claim: 'Sanabil Investments is wholly owned by the Saudi PIF (reported).', source_ids: [S.pif, S.reuters], evidence_class: 'reported', status: 'public-role', ui_weight: 2 });
addEdge({ from: 'sanabil', to: 'founders-fund', type: 'fund-partner', claim: 'Sanabil lists Founders Fund as a fund partner (Sanabil portfolio page).', source_ids: [S.pif], evidence_class: 'primary_public', status: 'public-role', ui_weight: 2 });
addEdge({ from: 'peter-thiel', to: 'founders-fund', type: 'managing-partner-of', claim: 'Peter Thiel is managing partner of Founders Fund.', source_ids: [S.pub], evidence_class: 'primary_public', status: 'public-role', ui_weight: 2 });

// --- Non-US state layer (Part 12) ---
if (nodeIds.has('kaja-kallas')) {
  addNode({ id: 'european-commission', label: 'European Commission (College of Commissioners)', type: 'government-institution', description: 'EU executive; Kaja Kallas serves as VP / High Representative.' });
  addEdge({ from: 'kaja-kallas', to: 'european-commission', type: 'vp-and-hr-of', claim: 'Kaja Kallas is VP of the European Commission / High Representative (EC College of Commissioners).', source_ids: [S.ec], evidence_class: 'official', status: 'public-role', ui_weight: 2 });
}

// --- Umbrella context map (Part 14) — topology memberships, excluded from pathfinding ---
const umbrellas = [
  ['u01', 'U01 — Dialog / elite convening', 'Annual invitation-only retreat; 222+ registrants 2026.'],
  ['u02', 'U02 — Founder-to-state pipeline', 'Founders/investors moving into advisory, procurement, or strategic-infrastructure roles.'],
  ['u03', 'U03 — UK AI adoption doctrine', 'Action Plan: compute, data, talent, procurement, national champions.'],
  ['u05', 'U05 — Public-sector AI procurement', 'Government-as-customer; AI procurement reform.'],
  ['u06', 'U06 — Defence autonomy', 'Battlefield AI, autonomous systems, future combat doctrine.'],
  ['u08', 'U08 — Data infrastructure & identity resolution', 'Data brokerage, identity resolution, audience modelling.'],
  ['u13', 'U13 — Philanthropy / think-tank layer', '501c3/c4 funding flows, grant-to-policy pipelines.'],
  ['u14', 'U14 — Venture & frontier-tech capital', 'VC funds, sovereign wealth co-investment.'],
  ['u15', 'U15 — US Army Reserve / defense modernization', 'Formal military channel connecting tech executives to Army modernization.']
];
for (const [id, label, description] of umbrellas) addNode({ id: `umbrella-${id}`, label, type: 'umbrella', description });
const memberships = [
  ['matt-clifford', 'u03'], ['matt-clifford', 'u02'], ['aria', 'u03'], ['entrepreneur-first', 'u02'],
  ['palantir', 'u06'], ['palantir', 'u05'], ['palantir', 'u15'], ['meta-ai', 'u15'], ['openai', 'u15'],
  ['detachment-201', 'u15'], ['sanabil', 'u14'], ['founders-fund', 'u14'], ['saudi-pif', 'u14'],
  ['psiquantum', 'u06'], ['groq', 'u05'], ['dialog', 'u01'], ['charles-koch-foundation', 'u13'],
  ['new-america', 'u13'], ['federalist-society', 'u13'], ['mercatus-center', 'u13'], ['adl', 'u13']
];
for (const [entity, u] of memberships) {
  if (!nodeIds.has(entity)) continue;
  addEdge({ from: entity, to: `umbrella-${u}`, type: 'umbrella-membership', topology: true, claim: `${entity.replace(/-/g, ' ')} is grouped under ${u.toUpperCase()} as a topology context. Co-presence grouping, NOT a direct relationship claim.`, source_ids: [S.pub], evidence_class: 'derived', status: 'topology-membership', ui_weight: 2 });
}

// --- Write both the root graph and the registered UK case (kept identical) ---
graph.generated = new Date().toISOString().slice(0, 10);
const out = JSON.stringify(graph, null, 2) + '\n';
fs.writeFileSync(graphPath, out);
fs.writeFileSync(casePath, out);
console.log(`Wrote graph.json + cases/uk-ai-policy.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.sources.length} sources.`);
