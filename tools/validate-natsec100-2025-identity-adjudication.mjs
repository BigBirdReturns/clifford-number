#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.join(HERE, '..');

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function readJsonl(p) { return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => { try { return JSON.parse(line); } catch (e) { fail(`${p}:${i + 1}: ${e.message}`); } }); }
function normalizeName(value) { return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
function normalizeWebsite(value) {
  let raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  raw = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  return raw;
}
function gitBlobSha(buffer) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}
function sha256Json(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function parseArgs(argv) {
  const out = { root: DEFAULT_ROOT, json: false, fixture: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') out.root = path.resolve(argv[++i]);
    else if (argv[i] === '--json') out.json = true;
    else if (argv[i] === '--fixture') out.fixture = true;
    else fail(`unknown argument: ${argv[i]}`);
  }
  return out;
}
function buildIndexes(registry) {
  const byWebsite = new Map();
  const byName = new Map();
  for (const company of registry) {
    const website = normalizeWebsite(company.website);
    if (website) { if (!byWebsite.has(website)) byWebsite.set(website, []); byWebsite.get(website).push(company); }
    for (const value of [company.canonical_name, ...(Array.isArray(company.aliases) ? company.aliases : [])]) {
      const key = normalizeName(value);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      if (!byName.get(key).includes(company)) byName.get(key).push(company);
    }
  }
  return { byWebsite, byName };
}
function resolveSource(source, indexes) {
  const web = indexes.byWebsite.get(normalizeWebsite(source.website)) ?? [];
  const name = indexes.byName.get(normalizeName(source.company_name_as_reported)) ?? [];
  assert(web.length <= 1, `ambiguous website resolution at rank ${source.rank}`);
  assert(name.length <= 1, `ambiguous name resolution at rank ${source.rank}`);
  if (web.length === 1 && name.length === 1 && web[0].company_id !== name[0].company_id) fail(`identity conflict at rank ${source.rank}`);
  return web[0] ?? name[0] ?? null;
}
function host(url) { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
function validate(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const base = path.join(root, 'data', 'intake', 'natsec100-pathways', 'chunk1');
  const rosterPath = path.join(base, 'roster-2025-official-visual-recovery.jsonl');
  const registryPath = path.join(base, 'companies.jsonl');
  const summaryPath = path.join(base, 'roster-2025-identity-adjudication.json');
  const rowsPath = path.join(base, 'roster-2025-identity-adjudication.jsonl');
  const summary = readJson(summaryPath);
  const rows = readJsonl(rowsPath);
  const rosterBytes = fs.readFileSync(rosterPath);
  const registryBytes = fs.readFileSync(registryPath);
  const roster = readJsonl(rosterPath);
  const registry = readJsonl(registryPath);

  assert(summary.schema_version === 'natsec100-2025-identity-adjudication@1', 'wrong adjudication schema');
  assert(summary.status === 'complete_bounded_identity_adjudication_candidate_not_promoted', 'wrong adjudication status');
  assert(summary.source.main_commit === '0b93ed2ab9741813b71e34b765bd17cd91533685', 'wrong source main lease');
  assert(summary.source.source_receipt_id === 'R003', 'wrong source receipt');
  if (!options.fixture) {
    assert(gitBlobSha(rosterBytes) === summary.source.roster_git_blob, 'roster Git blob drift');
    assert(gitBlobSha(registryBytes) === summary.source.registry_git_blob, 'registry Git blob drift');
  }
  assert(roster.length === summary.denominator.source_rows, 'source-row denominator drift');
  assert(registry.length === summary.denominator.registry_rows, 'registry-row denominator drift');

  const indexes = buildIndexes(registry);
  const unresolved = roster.filter((source) => !resolveSource(source, indexes));
  const unresolvedRanks = unresolved.map((row) => row.rank);
  assert(unresolved.length === summary.denominator.unresolved_source_rows, 'unresolved-source denominator drift');
  assert(JSON.stringify(unresolvedRanks) === JSON.stringify(summary.denominator.expected_unresolved_ranks), 'unresolved-rank population drift');
  assert(roster.length - unresolved.length === summary.denominator.deterministic_existing_matches, 'deterministic-match denominator drift');
  const unresolvedTuples = unresolved.map((r) => ({ rank:r.rank, name:r.company_name_as_reported, website:r.website }));
  assert(`sha256:${sha256Json(unresolvedTuples)}` === summary.denominator.unresolved_tuple_sha256, 'unresolved tuple hash drift');

  assert(rows.length === unresolved.length, 'adjudication row count does not cover unresolved population');
  const byRank = new Map();
  const proposedIds = new Set();
  const allowed = new Set(['new_registry_candidate_exact_brand_domain','new_registry_candidate_successor_brand','existing_registry_alias_website_update']);
  const counts = Object.fromEntries([...allowed].map((k) => [k, 0]));
  for (const row of rows) {
    const rank = row?.source?.rank;
    assert(Number.isInteger(rank) && !byRank.has(rank), `duplicate or malformed adjudication rank ${rank}`);
    byRank.set(rank, row);
    assert(allowed.has(row.disposition), `unsupported disposition at rank ${rank}`);
    counts[row.disposition] += 1;
    const source = unresolved.find((item) => item.rank === rank);
    assert(source, `invented adjudication rank ${rank}`);
    for (const key of ['company_name_as_reported','website','source_page','source_receipt_id']) assert(row.source[key] === source[key], `source tuple drift at rank ${rank}: ${key}`);
    assert(row.state.receipt_admission_state === 'external_identity_source_not_yet_admitted_as_receipt', `receipt boundary changed at rank ${rank}`);
    assert(row.state.promotion_state === 'adjudicated_identity_candidate_not_promoted', `silent promotion at rank ${rank}`);
    for (const key of ['company_registry_effect','company_year_effect','graph_effect','actor_hop_effect']) assert(row.state[key] === 'none', `${key} broadened at rank ${rank}`);
    for (const key of ['ranking_membership_only']) assert(row.boundaries[key] === true, `ranking boundary missing at rank ${rank}`);
    for (const key of ['procurement_established','investment_established','operational_impact_established','ownership_established','control_established','coordination_established','actor_contact_established']) assert(row.boundaries[key] === false, `${key} improperly asserted at rank ${rank}`);
    assert(Array.isArray(row.evidence) && row.evidence.length >= 1, `missing identity evidence at rank ${rank}`);
    const hostSet = new Set(row.expected_evidence_hosts ?? []);
    assert(hostSet.size >= 1, `missing evidence-host boundary at rank ${rank}`);
    for (const item of row.evidence) {
      assert(['first_party_company_identity','issuer_press_release','current_official_site','current_official_redirect','first_party_legal_notice'].includes(item.source_class), `unsupported evidence class at rank ${rank}`);
      assert(item.retrieved_at === '2026-09-06', `unleased retrieval date at rank ${rank}`);
      assert(hostSet.has(host(item.url)), `evidence host outside row boundary at rank ${rank}`);
      assert(typeof item.supports === 'string' && item.supports.length > 20, `missing bounded support statement at rank ${rank}`);
    }
    const target = row.target;
    assert(target.identity_scope === 'brand_domain_record', `identity scope drift at rank ${rank}`);
    assert(target.legal_entity_resolution === 'outside_this_bounded_adjudication', `legal-entity overclaim at rank ${rank}`);
    assert(normalizeWebsite(target.source_domain) === normalizeWebsite(source.website), `source-domain drift at rank ${rank}`);
    if (row.disposition === 'existing_registry_alias_website_update') {
      assert(target.proposed_company_id === null, `existing amendment creates new ID at rank ${rank}`);
      const existing = registry.find((c) => c.company_id === target.existing_company_id);
      assert(existing, `missing existing registry target at rank ${rank}`);
      assert(Array.isArray(target.aliases) && target.aliases.length >= 1, `existing amendment lacks alias at rank ${rank}`);
      const revised = registry.map((c) => c.company_id === existing.company_id ? { ...c, aliases:[...(c.aliases ?? []), ...target.aliases], website:`www.${target.current_domain}` } : c);
      const resolved = resolveSource(source, buildIndexes(revised));
      assert(resolved?.company_id === existing.company_id, `proposed existing amendment does not resolve rank ${rank}`);
    } else {
      assert(target.existing_company_id === null, `new candidate targets existing ID at rank ${rank}`);
      assert(typeof target.proposed_company_id === 'string' && target.proposed_company_id.length > 1, `missing proposed ID at rank ${rank}`);
      assert(!registry.some((c) => c.company_id === target.proposed_company_id), `proposed ID already exists at rank ${rank}`);
      assert(!proposedIds.has(target.proposed_company_id), `duplicate proposed ID at rank ${rank}`);
      proposedIds.add(target.proposed_company_id);
      if (row.disposition === 'new_registry_candidate_exact_brand_domain') {
        assert(normalizeName(target.canonical_name) === normalizeName(source.company_name_as_reported), `exact candidate name drift at rank ${rank}`);
        assert(normalizeWebsite(target.current_domain) === normalizeWebsite(source.website), `exact candidate domain drift at rank ${rank}`);
      } else {
        assert(normalizeName(target.canonical_name) !== normalizeName(source.company_name_as_reported), `successor candidate did not change brand at rank ${rank}`);
        assert(normalizeWebsite(target.current_domain) !== normalizeWebsite(source.website), `successor candidate did not change domain at rank ${rank}`);
        assert(target.aliases.map(normalizeName).includes(normalizeName(source.company_name_as_reported)), `successor candidate does not retain source brand at rank ${rank}`);
        assert(row.evidence.length >= 2, `successor continuity lacks two-source custody at rank ${rank}`);
      }
    }
  }
  for (const unresolvedRow of unresolved) assert(byRank.has(unresolvedRow.rank), `uncovered unresolved rank ${unresolvedRow.rank}`);
  for (const [kind, count] of Object.entries(counts)) assert(count === summary.denominator[kind], `${kind} count drift`);
  assert(summary.denominator.canonical_promotions === 0, 'summary claims canonical promotion');
  for (const key of ['company_registry_effect','company_year_effect','graph_effect','actor_hop_effect','publication_effect']) assert(summary.scope[key] === 'none', `summary scope broadened: ${key}`);
  return { source_rows:roster.length, registry_rows:registry.length, deterministic_existing_matches:roster.length-unresolved.length, unresolved_source_rows:unresolved.length, dispositions:counts, unresolved_tuple_sha256:summary.denominator.unresolved_tuple_sha256 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = validate(args);
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`natsec100-2025-identity-adjudication: PASS (${result.deterministic_existing_matches} deterministic matches, ${result.unresolved_source_rows} adjudicated candidates, 0 promotions)`);
  } catch (error) {
    console.error(`natsec100-2025-identity-adjudication: FAIL: ${error.message}`);
    process.exit(1);
  }
}
export { validate, normalizeName, normalizeWebsite, gitBlobSha };
