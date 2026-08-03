import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const STAGE1 = process.env.STAGE1_ROOT;
const OUT = path.join(ROOT, 'rd01-legal-entity-terminal-census-v1');
const RESEARCH_HEAD = '72e657baa024e0e90cca5bfc532f8350fe6bca60';
const STAGE1_ARTIFACT_ID = 8866039696;
const STAGE1_ARTIFACT_ZIP_SHA256 = 'ac81681b0f080715326bf7b4d8bc8225e7f69d52c0b2b4e73b9f57dc90c335aa';
const STAGE1_MANIFEST_SHA256 = '5061d7ddaa9060d952b468a4514f201151f57daebf0261f2d042c8d1b4360daa';
const PROBE_V2_ARTIFACT_ID = 8866497265;
const PROBE_V2_ARTIFACT_ZIP_SHA256 = 'b95f1f190eec24eceffc281a9044f596055117c0d56a21225fc6cf5484811c3a';
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const CONCURRENCY = 6;
const ROUTE_DELAY_MS = 100;
const USER_AGENT = 'BigBirdReturns-clifford-number RD-01 terminal legal-entity census (https://github.com/BigBirdReturns/clifford-number)';
const ENDPOINT = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FIELDS = ['Recipient Name','Recipient UEI','recipient_id','Recipient Location','Award ID','generated_internal_id'];
const AWARD_GROUPS = {
  contracts: ['A','B','C','D'],
  idvs: ['IDV_A','IDV_B','IDV_B_A','IDV_B_B','IDV_B_C','IDV_C','IDV_D','IDV_E'],
  loans: ['07','08','F003','F004'],
  grants: ['02','03','04','05','F001','F002'],
  other_financial_assistance: ['06','10','F006','F007'],
  direct_payments: ['09','11','-1','F005','F008','F009','F010']
};

if (!STAGE1) throw new Error('STAGE1_ROOT is required');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeJson = (p, value) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n'); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);

const suffixTokens = new Set([
  'INC','INCORPORATED','CORP','CORPORATION','CO','COMPANY','LLC','LTD','LIMITED','PLC','LP','LLP','PC','PLLC','PBC',
  'GMBH','AG','SA','SAS','BV','NV','PTY','PTE','KG','OY','AB','AS','SPA','SRL','SRO','SL','SC','PRIVATE','PUBLIC',
  'BENEFIT','HOLDINGS','HOLDING'
]);
function normalizeBase(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/L\.\s*L\.\s*C\.?/g, ' LLC ')
    .replace(/L\.\s*P\.?/g, ' LP ')
    .replace(/P\.\s*B\.\s*C\.?/g, ' PBC ')
    .replace(/&/g, ' AND ')
    .replace(/['’`]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^THE\s+/, '');
}
function canonicalName(input) {
  const tokens = normalizeBase(input).split(' ').filter(Boolean);
  while (tokens.length > 1 && suffixTokens.has(tokens.at(-1))) tokens.pop();
  return tokens.join(' ');
}
function rawNameKey(input) {
  return normalizeBase(input);
}
function hasRecognizedSuffix(input) {
  const tokens = normalizeBase(input).split(' ').filter(Boolean);
  return tokens.some((token, index) => index >= Math.max(1, tokens.length - 4) && suffixTokens.has(token));
}
function scoreName(display, candidate) {
  const d = canonicalName(display);
  const c = canonicalName(candidate);
  if (!d || !c) return { score: 0, reason: 'empty_normalized_name' };
  if (c === d) return { score: 100, reason: 'exact_canonical_name' };
  if (c.startsWith(`${d} `)) return { score: 92, reason: 'candidate_extends_display_name' };
  if (d.startsWith(`${c} `)) return { score: 88, reason: 'display_extends_candidate_name' };
  const dt = new Set(d.split(' '));
  const ct = new Set(c.split(' '));
  if (dt.size > 1 && ct.size > 1) {
    const intersection = [...dt].filter((t) => ct.has(t)).length;
    const union = new Set([...dt, ...ct]).size || 1;
    const jaccard = intersection / union;
    if (jaccard >= 0.8) return { score: 86, reason: 'multi_token_jaccard_0_8' };
    if (jaccard >= 0.65) return { score: Math.round(jaccard * 80), reason: 'multi_token_jaccard_0_65' };
  }
  return { score: 0, reason: 'no_admitted_name_relation' };
}
function headersBytes(response) {
  return Buffer.from([...response.headers.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}: ${v}`).join('\n') + '\n');
}
function stage1ManifestMap() {
  const manifest = readJson(path.join(STAGE1, 'manifest.json'));
  if (manifest.combined_sha256 !== STAGE1_MANIFEST_SHA256) throw new Error('stage1 manifest digest mismatch');
  return new Map(manifest.files.map((entry) => [entry.path, entry]));
}
const stage1Files = stage1ManifestMap();
const stage1Input = readJson(path.join(STAGE1, 'input-receipt.json'));
if (stage1Input.research_head !== RESEARCH_HEAD || stage1Input.rows !== 102) throw new Error('stage1 input boundary mismatch');
const stage1Rows = readJson(path.join(STAGE1, 'row-index.json'));
if (!Array.isArray(stage1Rows) || stage1Rows.length !== 102) throw new Error('stage1 row denominator mismatch');

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);
const protocol = {
  schema_version: 'ssc-rd01-wave02-terminal-legal-entity-protocol@1',
  wave_id: 'SSC-RD-W02',
  class_id: 'RD-01-C03',
  issue: 786,
  research_head: RESEARCH_HEAD,
  denominator: { rows: 102, membership_frozen_before_requests: true, silent_row_removal_allowed: false },
  prior_custody: {
    stage1_artifact_id: STAGE1_ARTIFACT_ID,
    stage1_artifact_zip_sha256: STAGE1_ARTIFACT_ZIP_SHA256,
    stage1_manifest_combined_sha256: STAGE1_MANIFEST_SHA256,
    homogeneous_route_probe_artifact_id: PROBE_V2_ARTIFACT_ID,
    homogeneous_route_probe_artifact_zip_sha256: PROBE_V2_ARTIFACT_ZIP_SHA256
  },
  stage2_routes: {
    endpoint: ENDPOINT,
    groups: AWARD_GROUPS,
    requested_fields: FIELDS,
    routes_per_row: Object.keys(AWARD_GROUPS).length,
    fixed_routes: stage1Rows.length * Object.keys(AWARD_GROUPS).length,
    result_spawned_requests: 0,
    maximum_attempts_per_route: MAX_ATTEMPTS,
    timeout_ms: REQUEST_TIMEOUT_MS,
    maximum_body_bytes: MAX_BODY_BYTES,
    concurrency: CONCURRENCY
  },
  name_rules: {
    exact_canonical_name: 100,
    candidate_extends_display_name: 92,
    display_extends_candidate_name: 88,
    multi_token_jaccard_floor: 0.8,
    high_candidate_floor: 88,
    near_candidate_floor: 75,
    name_only_autocomplete_is_resolution: false,
    award_frequency_is_identity_proof: false,
    one_token_resolution_requires_autocomplete_support_and_strong_identifier: true
  },
  permitted_terminal_row_states: ['exact_legal_entity_resolved','bounded_brand_to_entity_resolution','identity_source_restricted','identity_source_unavailable','identity_ambiguous'],
  boundaries: {
    display_label_is_legal_entity: false,
    lexical_score_is_resolution: false,
    federal_award_recipient_is_common_control: false,
    legal_entity_resolution_is_selector_causation: false,
    legal_entity_resolution_is_superiority: false,
    legal_entity_resolution_is_coordination_or_common_purpose: false,
    external_contacts: 0,
    external_reviews: 0,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  }
};
writeJson(path.join(OUT, 'protocol.json'), protocol);

const routes = [];
for (const row of stage1Rows) {
  for (const [awardGroup, awardTypeCodes] of Object.entries(AWARD_GROUPS)) {
    routes.push({ row_id: row.row_id, display_name: row.published_display_name, award_group: awardGroup, award_type_codes: awardTypeCodes });
  }
}
writeJson(path.join(OUT, 'route-universe.json'), {
  schema_version: 'ssc-rd01-wave02-terminal-route-universe@1',
  rows: stage1Rows.length,
  routes: routes.length,
  frozen_before_requests: true,
  result_spawned_requests: 0,
  route_keys: routes.map((r) => `${r.row_id}:${r.award_group}`)
});

async function captureRoute(route) {
  const routeDir = path.join(OUT, 'routes', safe(route.row_id), route.award_group);
  ensureDir(routeDir);
  const requestObject = {
    subawards: false,
    limit: 25,
    page: 1,
    filters: { award_type_codes: route.award_type_codes, recipient_search_text: [route.display_name] },
    fields: FIELDS
  };
  const requestBytes = Buffer.from(JSON.stringify(requestObject));
  fs.writeFileSync(path.join(routeDir, 'request.json'), requestBytes);
  const attempts = [];
  let terminal = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const attemptDir = path.join(routeDir, `attempt-${attempt}`);
    ensureDir(attemptDir);
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    let receipt;
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: requestBytes,
        redirect: 'follow',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      const body = Buffer.from(await response.arrayBuffer());
      const headers = headersBytes(response);
      fs.writeFileSync(path.join(attemptDir, 'headers.txt'), headers);
      if (body.length <= MAX_BODY_BYTES) fs.writeFileSync(path.join(attemptDir, 'body.bin'), body);
      receipt = {
        attempt,
        started_at: startedAt,
        elapsed_ms: Date.now() - startedMs,
        requested_url: ENDPOINT,
        final_url: response.url,
        http_status: response.status,
        content_type: response.headers.get('content-type'),
        request_sha256: sha256(requestBytes),
        response_headers_path: path.relative(OUT, path.join(attemptDir, 'headers.txt')).replaceAll('\\','/'),
        response_headers_bytes: headers.length,
        response_headers_sha256: sha256(headers),
        response_body_path: body.length <= MAX_BODY_BYTES ? path.relative(OUT, path.join(attemptDir, 'body.bin')).replaceAll('\\','/') : null,
        response_body_bytes: body.length,
        response_body_sha256: sha256(body),
        terminal_state: body.length > MAX_BODY_BYTES ? 'body_exceeded_fixed_limit' : response.ok ? 'http_success' : 'terminal_http_non_success',
        exact_body_retained: body.length <= MAX_BODY_BYTES
      };
    } catch (error) {
      const errorBytes = Buffer.from(`${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n`);
      fs.writeFileSync(path.join(attemptDir, 'error.txt'), errorBytes);
      receipt = {
        attempt,
        started_at: startedAt,
        elapsed_ms: Date.now() - startedMs,
        requested_url: ENDPOINT,
        request_sha256: sha256(requestBytes),
        error_path: path.relative(OUT, path.join(attemptDir, 'error.txt')).replaceAll('\\','/'),
        error_sha256: sha256(errorBytes),
        terminal_state: attempt === MAX_ATTEMPTS ? 'transport_failure' : 'retryable_transport_failure',
        exact_body_retained: false
      };
    }
    writeJson(path.join(attemptDir, 'receipt.json'), receipt);
    attempts.push(receipt);
    terminal = receipt;
    if (['http_success','terminal_http_non_success','body_exceeded_fixed_limit'].includes(receipt.terminal_state)) break;
    if (attempt < MAX_ATTEMPTS) await sleep(750);
  }
  const routeReceipt = {
    schema_version: 'ssc-rd01-wave02-route-receipt@1',
    row_id: route.row_id,
    display_name: route.display_name,
    award_group: route.award_group,
    award_type_codes: route.award_type_codes,
    request_path: path.relative(OUT, path.join(routeDir, 'request.json')).replaceAll('\\','/'),
    maximum_attempts: MAX_ATTEMPTS,
    attempts,
    terminal_attempt: terminal.attempt,
    terminal_state: terminal.terminal_state,
    exact_body_retained: terminal.exact_body_retained
  };
  writeJson(path.join(routeDir, 'route-receipt.json'), routeReceipt);
  await sleep(ROUTE_DELAY_MS);
  return routeReceipt;
}

const routeReceipts = new Array(routes.length);
let cursor = 0;
async function worker(workerId) {
  while (true) {
    const index = cursor++;
    if (index >= routes.length) return;
    const route = routes[index];
    const receipt = await captureRoute(route);
    routeReceipts[index] = receipt;
    if ((index + 1) % 25 === 0 || receipt.terminal_state !== 'http_success') {
      console.log(`[worker ${workerId}] ${index + 1}/${routes.length} ${route.row_id}:${route.award_group} ${receipt.terminal_state}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, index) => worker(index + 1)));

function parseStage1Body(rowId, source) {
  const rel = `rows/${rowId}/${source}/attempt-1/body.bin`;
  const entry = stage1Files.get(rel);
  if (!entry) return { parsed: null, evidence: null };
  const full = path.join(STAGE1, rel);
  try {
    return { parsed: JSON.parse(fs.readFileSync(full, 'utf8')), evidence: { artifact_id: STAGE1_ARTIFACT_ID, path: rel, bytes: entry.bytes, sha256: entry.sha256 } };
  } catch {
    return { parsed: null, evidence: { artifact_id: STAGE1_ARTIFACT_ID, path: rel, bytes: entry.bytes, sha256: entry.sha256 } };
  }
}
function parseRouteBody(receipt) {
  const terminal = receipt.attempts.find((attempt) => attempt.attempt === receipt.terminal_attempt);
  if (!terminal?.response_body_path || terminal.terminal_state !== 'http_success') return { parsed: null, evidence: terminal ?? null };
  try { return { parsed: JSON.parse(fs.readFileSync(path.join(OUT, terminal.response_body_path), 'utf8')), evidence: terminal }; }
  catch { return { parsed: null, evidence: terminal }; }
}
function newGroup(rowId, legalName) {
  return {
    candidate_id: `RD01-${sha256(Buffer.from(`${rowId}\0${canonicalName(legalName)}`)).slice(0, 20)}`,
    legal_name_variants: new Set([legalName]),
    canonical_legal_name: canonicalName(legalName),
    raw_name_keys: new Set([rawNameKey(legalName)]),
    sources: new Set(),
    autocomplete_names: new Set(),
    identifiers: { uei: new Set(), recipient_id: new Set(), lei: new Set(), registered_as: new Set() },
    jurisdictions: new Set(),
    locations: new Map(),
    award_groups: new Set(),
    award_result_rows_observed: 0,
    gleif_entity_statuses: new Set(),
    gleif_registration_statuses: new Set(),
    gleif_corroboration_levels: new Set(),
    evidence: []
  };
}
function addEvidence(group, evidence) {
  const key = `${evidence.source}:${evidence.path}:${evidence.sha256 ?? ''}`;
  if (!group.evidence.some((item) => `${item.source}:${item.path}:${item.sha256 ?? ''}` === key)) group.evidence.push(evidence);
}
function addLocation(group, location) {
  if (!location || typeof location !== 'object') return;
  const compact = {
    country_code: location.location_country_code ?? null,
    country_name: location.country_name ?? null,
    state_code: location.state_code ?? null,
    state_name: location.state_name ?? null,
    city_name: location.city_name ?? null,
    zip5: location.zip5 ?? null
  };
  const key = JSON.stringify(compact);
  group.locations.set(key, compact);
  if (compact.country_code) group.jurisdictions.add(compact.state_code ? `${compact.country_code}-${compact.state_code}` : compact.country_code);
}
function groupToJson(group, displayName) {
  const scoreResult = scoreName(displayName, group.canonical_legal_name);
  const sources = [...group.sources].sort();
  const identifiers = {
    uei: [...group.identifiers.uei].sort(),
    recipient_id: [...group.identifiers.recipient_id].sort(),
    lei: [...group.identifiers.lei].sort(),
    registered_as: [...group.identifiers.registered_as].sort()
  };
  const strongIdentifiers = identifiers.uei.length + identifiers.lei.length;
  return {
    candidate_id: group.candidate_id,
    legal_name_variants: [...group.legal_name_variants].sort(),
    canonical_legal_name: group.canonical_legal_name,
    sources,
    cross_source_corroboration: sources.includes('usaspending_award') && sources.includes('gleif'),
    autocomplete_support: sources.includes('usaspending_autocomplete'),
    identifiers,
    has_authoritative_identifier: strongIdentifiers > 0 || identifiers.recipient_id.length > 0,
    strong_identifier_count: strongIdentifiers,
    jurisdictions: [...group.jurisdictions].sort(),
    locations: [...group.locations.values()].sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))).slice(0, 10),
    award_groups: [...group.award_groups].sort(),
    award_result_rows_observed: group.award_result_rows_observed,
    gleif_entity_statuses: [...group.gleif_entity_statuses].sort(),
    gleif_registration_statuses: [...group.gleif_registration_statuses].sort(),
    gleif_corroboration_levels: [...group.gleif_corroboration_levels].sort(),
    recognized_legal_suffix_observed: [...group.legal_name_variants].some(hasRecognizedSuffix),
    name_score: scoreResult.score,
    name_score_reason: scoreResult.reason,
    evidence: group.evidence.sort((a,b) => `${a.source}:${a.path}`.localeCompare(`${b.source}:${b.path}`))
  };
}

const candidateRows = [];
const terminalRows = [];
for (const row of stage1Rows) {
  const groups = new Map();
  const getGroup = (name) => {
    const key = canonicalName(name);
    if (!key) return null;
    if (!groups.has(key)) groups.set(key, newGroup(row.row_id, name));
    const group = groups.get(key);
    group.legal_name_variants.add(name);
    group.raw_name_keys.add(rawNameKey(name));
    return group;
  };
  const autocomplete = parseStage1Body(row.row_id, 'usaspending');
  for (const item of autocomplete.parsed?.results ?? []) {
    if (typeof item?.recipient_name !== 'string') continue;
    const group = getGroup(item.recipient_name);
    if (!group) continue;
    group.sources.add('usaspending_autocomplete');
    group.autocomplete_names.add(item.recipient_name);
    if (item.uei) group.identifiers.uei.add(item.uei);
    if (item.duns) group.identifiers.recipient_id.add(`legacy_duns:${item.duns}`);
    if (autocomplete.evidence) addEvidence(group, { source: 'usaspending_autocomplete', ...autocomplete.evidence });
  }
  const gleif = parseStage1Body(row.row_id, 'gleif');
  for (const record of gleif.parsed?.data ?? []) {
    const entity = record?.attributes?.entity ?? {};
    const registration = record?.attributes?.registration ?? {};
    const legalName = entity?.legalName?.name;
    if (typeof legalName !== 'string') continue;
    const group = getGroup(legalName);
    if (!group) continue;
    group.sources.add('gleif');
    if (record.id) group.identifiers.lei.add(record.id);
    if (entity.registeredAs) group.identifiers.registered_as.add(entity.registeredAs);
    if (entity.jurisdiction) group.jurisdictions.add(entity.jurisdiction);
    if (entity.status) group.gleif_entity_statuses.add(entity.status);
    if (registration.status) group.gleif_registration_statuses.add(registration.status);
    if (registration.corroborationLevel) group.gleif_corroboration_levels.add(registration.corroborationLevel);
    if (gleif.evidence) addEvidence(group, { source: 'gleif', ...gleif.evidence });
  }
  const rowRouteReceipts = routeReceipts.filter((receipt) => receipt.row_id === row.row_id);
  for (const receipt of rowRouteReceipts) {
    const parsedRoute = parseRouteBody(receipt);
    for (const result of parsedRoute.parsed?.results ?? []) {
      const legalName = result?.['Recipient Name'];
      if (typeof legalName !== 'string') continue;
      const group = getGroup(legalName);
      if (!group) continue;
      group.sources.add('usaspending_award');
      if (result['Recipient UEI']) group.identifiers.uei.add(result['Recipient UEI']);
      if (result.recipient_id) group.identifiers.recipient_id.add(result.recipient_id);
      addLocation(group, result['Recipient Location']);
      group.award_groups.add(receipt.award_group);
      group.award_result_rows_observed += 1;
      if (parsedRoute.evidence?.response_body_path) {
        addEvidence(group, {
          source: 'usaspending_award',
          award_group: receipt.award_group,
          path: parsedRoute.evidence.response_body_path,
          bytes: parsedRoute.evidence.response_body_bytes,
          sha256: parsedRoute.evidence.response_body_sha256
        });
      }
    }
  }
  const candidates = [...groups.values()].map((group) => groupToJson(group, row.published_display_name))
    .sort((a,b) => b.name_score - a.name_score || Number(b.cross_source_corroboration) - Number(a.cross_source_corroboration) || b.strong_identifier_count - a.strong_identifier_count || b.award_result_rows_observed - a.award_result_rows_observed || a.canonical_legal_name.localeCompare(b.canonical_legal_name));
  const identified = candidates.filter((candidate) => candidate.has_authoritative_identifier);
  const high = identified.filter((candidate) => candidate.name_score >= 88);
  const near = identified.filter((candidate) => candidate.name_score >= 75);
  const displayTokens = canonicalName(row.published_display_name).split(' ').filter(Boolean);
  let terminalState;
  let selected = null;
  let confidence;
  let rationale;
  if (high.length === 0) {
    terminalState = 'identity_source_unavailable';
    confidence = 'bounded_no_authoritative_high_relation_candidate';
    rationale = 'The fixed GLEIF, USAspending autocomplete, and six-group award route universe produced no identifier-bearing candidate at or above the predeclared high-relation floor.';
  } else if (high.length === 1) {
    const candidate = high[0];
    const competingNear = near.filter((item) => item.candidate_id !== candidate.candidate_id);
    const oneToken = displayTokens.length === 1;
    const exactAllowed = candidate.name_score === 100 && candidate.strong_identifier_count > 0 && competingNear.length === 0 && (!oneToken || (candidate.autocomplete_support && candidate.recognized_legal_suffix_observed && (candidate.identifiers.uei.length > 0 || candidate.cross_source_corroboration)));
    const brandAllowed = candidate.name_score >= 92 && competingNear.length === 0 && candidate.autocomplete_support && (candidate.identifiers.uei.length > 0 || candidate.cross_source_corroboration) && (!oneToken || candidate.recognized_legal_suffix_observed);
    if (exactAllowed) {
      terminalState = 'exact_legal_entity_resolved';
      selected = candidate;
      confidence = 'exact_canonical_name_unique_strong_identifier';
      rationale = 'Exactly one identifier-bearing high-relation legal-name group remained, its canonical legal name exactly matched the published display name, and the one-token safeguard (where applicable) passed.';
    } else if (brandAllowed) {
      terminalState = 'bounded_brand_to_entity_resolution';
      selected = candidate;
      confidence = 'unique_prefix_brand_relation_with_authoritative_identifier';
      rationale = 'Exactly one identifier-bearing high-relation candidate remained and satisfied the predeclared autocomplete, suffix, and strong-identifier safeguards for a bounded brand-to-entity mapping.';
    } else {
      terminalState = 'identity_ambiguous';
      confidence = 'single_high_candidate_failed_resolution_safeguards';
      rationale = 'A high-relation candidate existed, but it failed one or more predeclared safeguards for exact or bounded brand resolution.';
    }
  } else {
    terminalState = 'identity_ambiguous';
    confidence = 'multiple_identifier_bearing_high_relation_candidates';
    rationale = 'More than one distinct identifier-bearing legal-name group met the predeclared high-relation floor.';
  }
  const routeStates = Object.fromEntries(Object.entries(AWARD_GROUPS).map(([group]) => {
    const receipt = rowRouteReceipts.find((item) => item.award_group === group);
    return [group, receipt?.terminal_state ?? 'missing_route_receipt'];
  }));
  candidateRows.push({
    row_id: row.row_id,
    published_display_name: row.published_display_name,
    stage1_autocomplete_result_count: autocomplete.parsed?.count ?? 0,
    stage1_gleif_result_count: Array.isArray(gleif.parsed?.data) ? gleif.parsed.data.length : 0,
    stage2_route_states: routeStates,
    candidate_groups: candidates.length,
    identifier_bearing_candidate_groups: identified.length,
    high_relation_candidate_groups: high.length,
    near_relation_candidate_groups: near.length,
    candidates
  });
  terminalRows.push({
    row_id: row.row_id,
    unit_class: row.row_id.includes('CONTROL') ? 'explicit_assessed_nonselection_or_ineligibility_row' : 'published_selected_roster_row',
    published_display_name: row.published_display_name,
    resolved_legal_entity: selected?.legal_name_variants?.[0] ?? null,
    entity_jurisdiction: selected?.jurisdictions?.[0] ?? null,
    entity_identifier_and_authoritative_source: selected ? {
      uei: selected.identifiers.uei,
      recipient_id: selected.identifiers.recipient_id,
      lei: selected.identifiers.lei,
      registered_as: selected.identifiers.registered_as,
      sources: selected.sources,
      evidence: selected.evidence
    } : null,
    parent_subsidiary_dba_or_brand_relationship: terminalState === 'exact_legal_entity_resolved'
      ? 'published display name and canonical legal name match under the fixed normalization rule; no parent or common-control conclusion is created'
      : terminalState === 'bounded_brand_to_entity_resolution'
        ? 'bounded display-name-to-legal-entity mapping only; parent, subsidiary, DBA, and common-control relations remain unproven unless separately stated'
        : null,
    identity_confidence_state: confidence,
    source_locators_and_exact_retrieval_custody: {
      stage1_artifact_id: STAGE1_ARTIFACT_ID,
      stage1_manifest_sha256: STAGE1_MANIFEST_SHA256,
      stage2_route_states: routeStates,
      stage2_candidate_evidence: selected?.evidence ?? []
    },
    unresolved_ambiguity_and_alternative_candidates: terminalState === 'identity_ambiguous'
      ? candidates.filter((candidate) => candidate.name_score >= 75).slice(0, 10).map((candidate) => ({ candidate_id: candidate.candidate_id, legal_name_variants: candidate.legal_name_variants, name_score: candidate.name_score, identifiers: candidate.identifiers, sources: candidate.sources }))
      : terminalState === 'identity_source_unavailable'
        ? { high_relation_candidates: 0, fixed_protocol_exhausted: true }
        : null,
    terminal_row_state: terminalState,
    fixed_protocol_complete: true,
    row_closed: true,
    rationale
  });
}

writeJson(path.join(OUT, 'candidate-index.json'), {
  schema_version: 'ssc-rd01-wave02-legal-entity-candidate-index@1',
  research_head: RESEARCH_HEAD,
  rows: candidateRows.length,
  candidate_rows: candidateRows
});
writeJson(path.join(OUT, 'terminal-classification.json'), {
  schema_version: 'ssc-rd01-wave02-legal-entity-terminal-classification@1',
  wave_id: 'SSC-RD-W02',
  class_id: 'RD-01-C03',
  issue: 786,
  research_head: RESEARCH_HEAD,
  rows: terminalRows
});

const terminalCounts = Object.fromEntries(protocol.permitted_terminal_row_states.map((state) => [state, terminalRows.filter((row) => row.terminal_row_state === state).length]));
const routeStateCounts = {};
for (const receipt of routeReceipts) routeStateCounts[receipt.terminal_state] = (routeStateCounts[receipt.terminal_state] ?? 0) + 1;
const classClosed = terminalRows.length === 102 && terminalRows.every((row) => row.fixed_protocol_complete && row.row_closed && protocol.permitted_terminal_row_states.includes(row.terminal_row_state));
const classTerminalState = terminalCounts.identity_source_unavailable > 0 || terminalCounts.identity_source_restricted > 0 || Object.keys(routeStateCounts).some((state) => state !== 'http_success') ? 'bounded_source_unavailable' : 'evidence_complete';
const summary = {
  schema_version: 'ssc-rd01-wave02-terminal-legal-entity-summary@1',
  wave_id: 'SSC-RD-W02',
  class_id: 'RD-01-C03',
  issue: 786,
  research_head: RESEARCH_HEAD,
  terminal_state: classTerminalState,
  class_closed: classClosed,
  counts: {
    frozen_rows: 102,
    terminal_rows: terminalRows.length,
    fixed_stage2_routes: routes.length,
    route_state_counts: routeStateCounts,
    ...terminalCounts,
    legal_entities_resolved: terminalCounts.exact_legal_entity_resolved + terminalCounts.bounded_brand_to_entity_resolution,
    unresolved_but_terminal_rows: terminalCounts.identity_ambiguous + terminalCounts.identity_source_unavailable + terminalCounts.identity_source_restricted,
    external_contacts: 0,
    external_reviews: 0
  },
  authority: {
    outside_human_dependency: false,
    denominator_widened: false,
    reviewed_disposition_changed: false,
    selection_causation_finding: false,
    superiority_finding: false,
    common_control_finding: false,
    coordination_finding: false,
    common_purpose_finding: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none'
  }
};
writeJson(path.join(OUT, 'summary.json'), summary);

function collectFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else files.push(full);
  }
  return files;
}
const manifestEntries = collectFiles(OUT)
  .filter((file) => !file.endsWith(`${path.sep}manifest.json`))
  .map((file) => {
    const bytes = fs.readFileSync(file);
    return { path: path.relative(OUT, file).replaceAll('\\','/'), bytes: bytes.length, sha256: sha256(bytes) };
  })
  .sort((a,b) => a.path.localeCompare(b.path));
const manifestCombined = sha256(Buffer.from(manifestEntries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('')));
writeJson(path.join(OUT, 'manifest.json'), {
  schema_version: 'ssc-rd01-wave02-terminal-legal-entity-manifest@1',
  entries: manifestEntries.length,
  combined_sha256: manifestCombined,
  files: manifestEntries
});
console.log(JSON.stringify({ ...summary, manifest_entries: manifestEntries.length, manifest_combined_sha256: manifestCombined }, null, 2));
