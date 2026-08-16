#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDir = path.resolve(repoRoot, process.env.M04G_GDELT_OUTPUT_DIR || 'build/m04g-gdelt-global-tide-probe-v1');
fs.mkdirSync(outputDir, { recursive: true });

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const registryPath = path.join(repoRoot, 'data/project/m04g-global-circulation-polls.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const gdeltRoutes = registry.polls
  .filter(route => route.enabled !== false && /api\.gdeltproject\.org/i.test(route.request?.url || ''))
  .sort((a, b) => a.poll_id.localeCompare(b.poll_id));

if (gdeltRoutes.length !== 12) {
  throw new Error(`expected 12 preserved GDELT routes, found ${gdeltRoutes.length}`);
}

const basinTerms = {
  'G01-GLOBAL-MULTILATERAL': ['united nations', 'world bank', 'multilateral', 'global'],
  'G02-NORTH-AMERICA': ['north america', 'united states', 'canada', 'mexico'],
  'G03-LATIN-AMERICA-CARIBBEAN': ['latin america', 'caribbean', 'brazil', 'argentina', 'chile', 'colombia', 'peru'],
  'G04-EU-CONTINENTAL': ['european union', 'germany', 'france', 'italy', 'spain', 'europe'],
  'G05-UK-IRELAND-NORDICS': ['united kingdom', 'ireland', 'sweden', 'norway', 'denmark', 'finland', 'iceland'],
  'G06-EASTERN-EUROPE-EURASIA': ['eastern europe', 'eurasia', 'ukraine', 'russia', 'poland', 'kazakhstan'],
  'G07-MENA': ['middle east', 'north africa', 'israel', 'saudi', 'egypt', 'emirates', 'iran', 'morocco'],
  'G08-SUB-SAHARAN-AFRICA': ['sub-saharan africa', 'nigeria', 'kenya', 'south africa', 'ethiopia', 'ghana'],
  'G09-SOUTH-ASIA': ['south asia', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal'],
  'G10-EAST-ASIA': ['east asia', 'china', 'japan', 'south korea', 'taiwan', 'mongolia'],
  'G11-SOUTHEAST-ASIA': ['southeast asia', 'asean', 'indonesia', 'singapore', 'malaysia', 'thailand', 'philippines', 'vietnam'],
  'G12-OCEANIA-PACIFIC': ['oceania', 'pacific', 'australia', 'new zealand', 'fiji', 'papua new guinea'],
};

const queryTerms = [
  '"United Nations"',
  '"North America"',
  '"Latin America"',
  '"European Union"',
  '"United Kingdom"',
  '"Eastern Europe"',
  '"Middle East"',
  '"Sub-Saharan Africa"',
  '"South Asia"',
  '"East Asia"',
  '"Southeast Asia"',
  'Oceania',
];
const tideUrl = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
tideUrl.searchParams.set('query', `(${queryTerms.join(' OR ')})`);
tideUrl.searchParams.set('mode', 'artlist');
tideUrl.searchParams.set('format', 'json');
tideUrl.searchParams.set('maxrecords', '250');
tideUrl.searchParams.set('sort', 'datedesc');

const startedAt = new Date().toISOString();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(new Error('global tide timeout after 45000ms')), 45000);
let status = null;
let finalUrl = tideUrl.toString();
let responseHeaders = {};
let responseBody = Buffer.alloc(0);
let responseError = null;
let parsed = null;
let parseError = null;

try {
  const response = await fetch(tideUrl, {
    method: 'GET',
    redirect: 'follow',
    signal: controller.signal,
    headers: {
      'accept': 'application/json,*/*;q=0.1',
      'user-agent': 'CliffordNumber-M04G-GDELT-Tide-Probe/1.0 (+https://github.com/BigBirdReturns/clifford-number)',
    },
  });
  status = response.status;
  finalUrl = response.url || finalUrl;
  responseHeaders = Object.fromEntries(response.headers);
  responseBody = Buffer.from(await response.arrayBuffer());
  if (responseBody.length > 2_097_152) {
    throw new Error(`global tide exceeded 2097152 bytes: ${responseBody.length}`);
  }
  try {
    parsed = JSON.parse(responseBody.toString('utf8'));
  } catch (error) {
    parseError = String(error?.message || error);
  }
} catch (error) {
  responseError = String(error?.message || error);
} finally {
  clearTimeout(timer);
}

const responseSha256 = responseBody.length ? sha256(responseBody) : null;
if (responseBody.length) fs.writeFileSync(path.join(outputDir, 'global-tide-response.bin'), responseBody);

const articles = Array.isArray(parsed?.articles) ? parsed.articles : [];
const articleText = article => [
  article?.title,
  article?.url,
  article?.domain,
  article?.sourcecountry,
  article?.language,
].filter(Boolean).join(' ').toLowerCase();

const transportHealthy = status === 200 && responseBody.length > 0 && parsed && !parseError && Array.isArray(parsed.articles);
const projections = gdeltRoutes.map(route => {
  const terms = basinTerms[route.basin_id] || [];
  const selected = articles.filter(article => {
    const haystack = articleText(article);
    return terms.some(term => haystack.includes(term));
  }).slice(0, 25).map(article => ({
    title: article.title || null,
    url: article.url || null,
    domain: article.domain || null,
    sourcecountry: article.sourcecountry || null,
    language: article.language || null,
    seendate: article.seendate || null,
  }));
  const originalQuery = new URL(route.request.url).searchParams.get('query');
  const projection = {
    schema_version: 'm04g-gdelt-global-tide-projection@1',
    tide_id: 'GDELT-GLOBAL-SERIAL',
    route_id: route.poll_id,
    basin_id: route.basin_id,
    original_query: originalQuery,
    original_route_url: route.request.url,
    global_tide_url: tideUrl.toString(),
    global_tide_response_sha256: responseSha256,
    global_article_count: articles.length,
    routing_terms: terms,
    routing_rule: 'case-insensitive term match across title, URL, domain, source country, and language',
    selected_article_count: selected.length,
    articles: selected,
  };
  const bytes = Buffer.from(`${JSON.stringify(projection, null, 2)}\n`, 'utf8');
  const outputName = `${route.poll_id}.json`;
  fs.writeFileSync(path.join(outputDir, outputName), bytes);
  return {
    route_id: route.poll_id,
    basin_id: route.basin_id,
    original_query: originalQuery,
    selected_article_count: selected.length,
    projection_bytes: bytes.length,
    projection_sha256: sha256(bytes),
    route_success: Boolean(transportHealthy),
    content_success: Boolean(transportHealthy && bytes.length > 0),
    semantic_projection_nonempty: selected.length > 0,
    output_file: outputName,
  };
});

const routeSuccesses = projections.filter(row => row.route_success).length;
const contentSuccesses = projections.filter(row => row.content_success).length;
const semanticNonempty = projections.filter(row => row.semantic_projection_nonempty).length;
const candidateAuthorized = Boolean(
  transportHealthy &&
  responseSha256 &&
  gdeltRoutes.length === 12 &&
  routeSuccesses === 12 &&
  contentSuccesses === 12
);

const authorizationReasons = [];
if (!transportHealthy) authorizationReasons.push('the single GDELT response was not a parseable HTTP 200 JSON article list');
if (!responseSha256) authorizationReasons.push('the global tide response has no content hash');
if (gdeltRoutes.length !== 12) authorizationReasons.push(`the preserved GDELT route denominator is ${gdeltRoutes.length}, not 12`);
if (routeSuccesses !== 12) authorizationReasons.push(`only ${routeSuccesses}/12 route projections are transport-healthy`);
if (contentSuccesses !== 12) authorizationReasons.push(`only ${contentSuccesses}/12 route projections contain bounded content`);
if (candidateAuthorized) authorizationReasons.push('one hash-bound network response produced twelve deterministic route projections without changing route identity or basin assignment');

const ledger = {
  schema_version: 'm04g-gdelt-global-tide-probe@1',
  generated_at: new Date().toISOString(),
  started_at: startedAt,
  repository_product_files_modified: false,
  canonical_candidate_written: false,
  network_request_count: 1,
  network_retry_count: 0,
  tide_id: 'GDELT-GLOBAL-SERIAL',
  tide_url: tideUrl.toString(),
  response: {
    status,
    final_url: finalUrl,
    headers: responseHeaders,
    bytes: responseBody.length,
    sha256: responseSha256,
    error: responseError,
    parse_error: parseError,
    article_count: articles.length,
  },
  preserved_gdelt_routes: gdeltRoutes.length,
  route_successes: routeSuccesses,
  content_successes: contentSuccesses,
  semantic_projections_nonempty: semanticNonempty,
  semantic_projection_is_admission_requirement: false,
  candidate_authorized: candidateAuthorized,
  candidate_authorization_reasons: authorizationReasons,
  boundaries: {
    denominator_changed: false,
    route_ids_changed: false,
    basin_assignments_changed: false,
    metadata_counted_as_content: false,
    source_health_proves_evidentiary_sufficiency: false,
    source_health_proves_answer_effectiveness: false,
  },
  projections,
};
fs.writeFileSync(path.join(outputDir, 'ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'ledger.sha256'), `${sha256(Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`))}  ledger.json\n`);
console.log(JSON.stringify({
  candidate_authorized: ledger.candidate_authorized,
  response_status: status,
  response_bytes: responseBody.length,
  response_sha256: responseSha256,
  article_count: articles.length,
  route_successes: routeSuccesses,
  content_successes: contentSuccesses,
  semantic_projections_nonempty: semanticNonempty,
}, null, 2));
