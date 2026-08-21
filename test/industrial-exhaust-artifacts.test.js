import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertAllowedArtifactUrl,
  buildArtifactAlerts,
  buildHydrationCandidates,
  extractHtmlArtifact,
  mergeArtifactProjection,
  mergeDiscoveryRecords,
  parseHtmlLinkIndex,
  selectHydrationCandidates,
  validateArtifactConfig,
  writeArtifactReceipt
} from '../tools/lib/industrial-exhaust-artifacts.mjs';
import { matchWatchTerms } from '../tools/lib/industrial-exhaust.mjs';

const config = validateArtifactConfig({
  schema_version: 1,
  lane: 'first_party_industrial_exhaust_artifact_hydration',
  graph_effect: 'none',
  promotion_authority: false,
  canonical_mutation_authorized: false,
  indexes: [{
    id: 'dentsu_global_news_sitemap',
    publisher: 'dentsu global website',
    publisher_resolution: 'brand_surface_not_legal_entity',
    surface: 'Global news-release sitemap',
    index_url: 'https://www.dentsu.com/sitemap',
    index_format: 'html_link_index',
    include_path_prefixes: ['/news-releases/'],
    enabled: true,
    source_class: 'first_party_corporate_publication',
    graph_effect: 'none'
  }],
  hydration: {
    allowed_hosts: ['www.dentsu.com', 'www.dentsu.co.jp'],
    default_limit: 50,
    max_bytes: 6000000,
    max_normalized_chars: 60000,
    request_delay_ms: 0
  }
});

const watchConfig = {
  schema_version: 1,
  terms: [
    { id: 'evidenza', patterns: ['Evidenza'] },
    { id: 'generative_audiences', patterns: ['Generative Audiences'] },
    { id: 'b2b', patterns: ['B2B'] },
    { id: 'intent_data', patterns: ['intent data'] },
    { id: 'tsuyoshi_george_komuro', patterns: ['Tsuyoshi George Komuro', '小室'] }
  ]
};

const indexHtml = `<!doctype html><html><head><title>dentsu sitemap</title></head><body>
<a href="/news-releases/dentsu-partners-with-evidenza-to-integrate-synthetic-audiences-into-next-gen-media-planning">Dentsu Partners With Evidenza To Integrate Synthetic Audiences</a>
<a href="https://www.dentsu.com/news-releases/dentsu-launches-generative-audiences-ai-powered-growth-intelligence-that-thinks-like-consumers?utm_source=rss">Dentsu Launches Generative Audiences</a>
<a href="/news-releases/dentsu-launches-generative-audiences-ai-powered-growth-intelligence-that-thinks-like-consumers">Dentsu Launches Generative Audiences duplicate</a>
<a href="/blog/not-in-scope">Unrelated blog</a>
<a href="https://outside.example/news-releases/not-owned">Outside host</a>
</body></html>`;
const parsedIndex = parseHtmlLinkIndex(indexHtml, config.indexes[0]);
assert.equal(parsedIndex.item_count, 2);
assert.equal(parsedIndex.items[0].canonical_url.startsWith('https://www.dentsu.com/news-releases/'), true);
assert.equal(new Set(parsedIndex.items.map(item => item.source_record_key)).size, 2);

const firstMerge = mergeDiscoveryRecords({
  records: [],
  source: config.indexes[0],
  parsedIndex,
  capturedAt: '2026-08-17T00:00:00.000Z',
  indexReceiptPath: 'receipts/index.json'
});
assert.equal(firstMerge.added.length, 2);
const secondMerge = mergeDiscoveryRecords({
  records: firstMerge.records,
  source: config.indexes[0],
  parsedIndex,
  capturedAt: '2026-08-18T00:00:00.000Z',
  indexReceiptPath: 'receipts/index.json'
});
assert.equal(secondMerge.added.length, 0);

const articleHtml = `<!doctype html><html><head>
<title>Dentsu B2B</title><meta property="article:published_time" content="2024-08-26T07:00:00Z">
<meta name="description" content="Dentsu B2B intent data service">
</head><body>
<header>Electric Twin navigation decoy</header>
<main><h1>Marketing For Growth B2B</h1><p>Tsuyoshi George Komuro leads work using intent data.</p>
<p>Business contact: george@example.com, +81 3 1234 5678.</p></main>
<footer>Evidenza footer decoy</footer>
</body></html>`;
const projection = extractHtmlArtifact(articleHtml, 'https://www.dentsu.co.jp/en/news/release/2024/0826-010767.html');
assert.equal(projection.title, 'Marketing For Growth B2B');
assert.match(projection.normalized_text, /Tsuyoshi George Komuro/u);
assert.match(projection.normalized_text, /intent data/u);
assert.doesNotMatch(projection.normalized_text, /Electric Twin/u);
assert.doesNotMatch(projection.normalized_text, /Evidenza/u);
assert.doesNotMatch(projection.normalized_text, /george@example\.com/u);
assert.doesNotMatch(projection.description, /george@example\.com/u);
assert.match(projection.normalized_text, /\[contact omitted\]/u);
assert.throws(
  () => extractHtmlArtifact('<html><head><title>Just a moment...</title></head><body><div class="cf-chl-test">Enable JavaScript and cookies to continue</div></body></html>', 'https://www.dentsu.com/news-releases/challenge'),
  /access-control challenge/u
);
assert.equal(projection.published_at, '2024-08-26T07:00:00.000Z');
assert.deepEqual(matchWatchTerms({ title: projection.title, summary: projection.normalized_text }, watchConfig), [
  'b2b', 'intent_data', 'tsuyoshi_george_komuro'
]);

const discoveryCandidates = buildHydrationCandidates({
  baseAlerts: [{
    observation_id: 'xobs_b2b', source_id: 'dentsu_inc_en_news', publisher: 'Dentsu Inc.',
    title: 'Marketing For Growth B2B', canonical_url: 'https://www.dentsu.co.jp/en/news/release/2024/0826-010767.html',
    matched_terms: ['b2b']
  }],
  discoveryRecords: firstMerge.records,
  watchConfig
});
assert.equal(discoveryCandidates.length, 3);
assert.equal(discoveryCandidates[0].seed_matched_terms.some(term => ['evidenza', 'generative_audiences'].includes(term)), true);

const candidate = discoveryCandidates.find(item => item.canonical_url.includes('0826-010767'));
const artifactMerge = mergeArtifactProjection({
  artifacts: [],
  candidate,
  sourceProjection: projection,
  capturedAt: '2026-08-17T00:00:00.000Z',
  bodyReceiptPath: 'receipts/article.json',
  bodySha256: 'a'.repeat(64),
  responseHeaders: { content_type: 'text/html', etag: 'x', last_modified: null, watch_config: watchConfig }
});
assert.ok(artifactMerge.added);
assert.deepEqual(artifactMerge.added.matched_terms, ['b2b', 'intent_data', 'tsuyoshi_george_komuro']);
assert.equal(artifactMerge.added.graph_effect, 'none');
assert.equal(artifactMerge.added.canonical_mutation_authorized, false);
const unchangedMerge = mergeArtifactProjection({
  artifacts: artifactMerge.artifacts,
  candidate,
  sourceProjection: projection,
  capturedAt: '2026-08-18T00:00:00.000Z',
  bodyReceiptPath: 'receipts/article.json',
  bodySha256: 'a'.repeat(64),
  responseHeaders: { content_type: 'text/html', etag: 'x', last_modified: null, watch_config: watchConfig }
});
assert.equal(unchangedMerge.added, null);
assert.equal(unchangedMerge.artifacts.length, 1);

const transportOnlyMerge = mergeArtifactProjection({
  artifacts: artifactMerge.artifacts,
  candidate,
  sourceProjection: projection,
  capturedAt: '2026-08-18T12:00:00.000Z',
  bodyReceiptPath: 'receipts/article-transport-churn.json',
  bodySha256: 'b'.repeat(64),
  responseHeaders: {
    content_type: 'text/html',
    etag: 'transport-only-change',
    last_modified: 'Tue, 18 Aug 2026 12:00:00 GMT',
    final_url: candidate.canonical_url,
    redirect_chain: [],
    watch_config: watchConfig
  }
});
assert.equal(transportOnlyMerge.added, null, 'transport-only HTML churn must not create a semantic revision');
assert.equal(transportOnlyMerge.artifacts.length, 1);
assert.equal(transportOnlyMerge.unchanged.artifact_id, artifactMerge.added.artifact_id);

const legacyProjectionArtifact = {
  ...artifactMerge.added,
  projection_sha256: 'f'.repeat(64)
};
const legacyTransportOnlyMerge = mergeArtifactProjection({
  artifacts: [legacyProjectionArtifact],
  candidate,
  sourceProjection: projection,
  capturedAt: '2026-08-18T13:00:00.000Z',
  bodyReceiptPath: 'receipts/article-legacy-transport-churn.json',
  bodySha256: 'c'.repeat(64),
  responseHeaders: {
    content_type: 'text/html; charset=utf-8',
    etag: 'legacy-transport-only-change',
    last_modified: null,
    final_url: candidate.canonical_url,
    redirect_chain: [],
    watch_config: watchConfig
  }
});
assert.equal(
  legacyTransportOnlyMerge.added,
  null,
  'legacy body-bound projection hashes must migrate without one synthetic revision'
);

const changedText = `${projection.normalized_text} A substantive publisher statement changed.`;
const semanticChangeMerge = mergeArtifactProjection({
  artifacts: artifactMerge.artifacts,
  candidate,
  sourceProjection: {
    ...projection,
    normalized_text: changedText,
    normalized_text_sha256: crypto.createHash('sha256').update(changedText).digest('hex')
  },
  capturedAt: '2026-08-18T14:00:00.000Z',
  bodyReceiptPath: 'receipts/article-semantic-change.json',
  bodySha256: 'd'.repeat(64),
  responseHeaders: {
    content_type: 'text/html',
    etag: 'semantic-change',
    last_modified: null,
    final_url: candidate.canonical_url,
    redirect_chain: [],
    watch_config: watchConfig
  }
});
assert.ok(semanticChangeMerge.added, 'changed normalized content must create a revision');
assert.equal(semanticChangeMerge.added.revision_number, 2);

const pdfCandidate = {
  ...candidate,
  canonical_url: 'https://www.dentsu.com/news-releases/binary-release.pdf'
};
const pdfProjection = {
  title: 'Binary release',
  description: '',
  normalized_text: '',
  normalized_text_sha256: null,
  published_at: null
};
const firstPdfMerge = mergeArtifactProjection({
  artifacts: [],
  candidate: pdfCandidate,
  sourceProjection: pdfProjection,
  capturedAt: '2026-08-18T15:00:00.000Z',
  bodyReceiptPath: 'receipts/binary-release-a.json',
  bodySha256: 'a'.repeat(64),
  responseHeaders: { content_type: 'application/pdf', watch_config: watchConfig }
});
const samePdfMerge = mergeArtifactProjection({
  artifacts: firstPdfMerge.artifacts,
  candidate: pdfCandidate,
  sourceProjection: pdfProjection,
  capturedAt: '2026-08-18T15:30:00.000Z',
  bodyReceiptPath: 'receipts/binary-release-a-again.json',
  bodySha256: 'a'.repeat(64),
  responseHeaders: { content_type: 'application/pdf; version=1.7', etag: 'new-transport', watch_config: watchConfig }
});
assert.equal(samePdfMerge.added, null, 'an unchanged opaque PDF body must deduplicate');
const changedPdfMerge = mergeArtifactProjection({
  artifacts: firstPdfMerge.artifacts,
  candidate: pdfCandidate,
  sourceProjection: pdfProjection,
  capturedAt: '2026-08-18T16:00:00.000Z',
  bodyReceiptPath: 'receipts/binary-release-b.json',
  bodySha256: 'b'.repeat(64),
  responseHeaders: { content_type: 'application/pdf', watch_config: watchConfig }
});
assert.ok(changedPdfMerge.added, 'an unparsed PDF body change must remain revision-significant');
assert.equal(changedPdfMerge.added.revision_number, 2);

const routingOnlyCandidate = {
  ...candidate,
  seed_matched_terms: [...candidate.seed_matched_terms, 'evidenza'],
  linked_records: [...candidate.linked_records, { record_type: 'index_discovery', record_id: 'xdiscover_new' }]
};
const routingOnlyMerge = mergeArtifactProjection({
  artifacts: artifactMerge.artifacts,
  candidate: routingOnlyCandidate,
  sourceProjection: projection,
  capturedAt: '2026-08-19T00:00:00.000Z',
  bodyReceiptPath: 'receipts/article.json',
  bodySha256: 'a'.repeat(64),
  responseHeaders: { content_type: 'text/html', etag: 'x', last_modified: null, watch_config: watchConfig }
});
assert.equal(routingOnlyMerge.added, null);
assert.equal(routingOnlyMerge.artifacts.length, 1);

const alerts = buildArtifactAlerts(artifactMerge.artifacts, { watchConfig, candidates: discoveryCandidates });
assert.equal(alerts.length, 1);
assert.equal(alerts[0].match_scope, 'hydrated_publisher_artifact');
assert.equal(alerts[0].promotion_authority, false);
assert.ok(alerts[0].forbidden_inferences.some(item => item.includes('actor or relationship edge')));
const expandedWatchConfig = {
  ...watchConfig,
  terms: [...watchConfig.terms, { id: 'leadership_copy', patterns: ['leads work'] }]
};
const rematchedAlerts = buildArtifactAlerts(artifactMerge.artifacts, {
  watchConfig: expandedWatchConfig,
  candidates: discoveryCandidates
});
assert.ok(rematchedAlerts[0].artifact_matched_terms.includes('leadership_copy'));
const retiredSeedArtifact = {
  ...artifactMerge.added,
  title: 'No current watch match',
  normalized_text: 'The current registry does not match this body.',
  seed_matched_terms: ['retired_term'],
  artifact_matched_terms: [],
  matched_terms: ['retired_term']
};
const currentRegistryAlerts = buildArtifactAlerts([retiredSeedArtifact], {
  watchConfig: {
    schema_version: 1,
    terms: [{ id: 'current_term', patterns: ['current phrase'] }]
  },
  candidates: []
});
assert.deepEqual(currentRegistryAlerts, []);
const historicalRegistryAlerts = buildArtifactAlerts([retiredSeedArtifact]);
assert.deepEqual(historicalRegistryAlerts[0].seed_matched_terms, ['retired_term']);

const fairnessCandidates = [
  { canonical_url: 'https://www.dentsu.com/news-releases/already-seen' },
  { canonical_url: 'https://www.dentsu.com/news-releases/new-one' },
  { canonical_url: 'https://www.dentsu.com/news-releases/new-two' }
];
const fairSelection = selectHydrationCandidates(fairnessCandidates, {
  pages: { 'https://www.dentsu.com/news-releases/already-seen': { last_status: 'ok' } }
}, 2);
assert.deepEqual(fairSelection.map(row => row.canonical_url), [
  'https://www.dentsu.com/news-releases/new-one',
  'https://www.dentsu.com/news-releases/new-two'
]);

const rotatingCandidates = [
  { canonical_url: 'https://www.dentsu.com/news-releases/success-one' },
  { canonical_url: 'https://www.dentsu.com/news-releases/success-two' },
  { canonical_url: 'https://www.dentsu.com/news-releases/success-three' }
];
const rotatingSuccessSelection = selectHydrationCandidates(rotatingCandidates, {
  pages: {
    'https://www.dentsu.com/news-releases/success-one': { last_status: 'ok', last_checked_at: '2026-08-18T03:00:00.000Z' },
    'https://www.dentsu.com/news-releases/success-two': { last_status: 'ok', last_checked_at: '2026-08-18T02:00:00.000Z' },
    'https://www.dentsu.com/news-releases/success-three': { last_status: 'ok', last_checked_at: '2026-08-18T01:00:00.000Z' }
  }
}, 2);
assert.deepEqual(rotatingSuccessSelection.map(row => row.canonical_url), [
  'https://www.dentsu.com/news-releases/success-three',
  'https://www.dentsu.com/news-releases/success-two'
]);

const rotatingFailureSelection = selectHydrationCandidates(rotatingCandidates, {
  pages: {
    'https://www.dentsu.com/news-releases/success-one': { last_status: 'error', last_checked_at: '2026-08-18T03:00:00.000Z' },
    'https://www.dentsu.com/news-releases/success-two': { last_status: 'error', last_checked_at: '2026-08-18T02:00:00.000Z' },
    'https://www.dentsu.com/news-releases/success-three': { last_status: 'error', last_checked_at: '2026-08-18T01:00:00.000Z' }
  }
}, 2);
assert.deepEqual(rotatingFailureSelection.map(row => row.canonical_url), [
  'https://www.dentsu.com/news-releases/success-three',
  'https://www.dentsu.com/news-releases/success-two'
]);

const receiptRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'industrial-exhaust-artifact-receipts-'));
try {
  const sharedBody = Buffer.from('<html><body>same body</body></html>', 'utf8');
  const sharedHash = crypto.createHash('sha256').update(sharedBody).digest('hex');
  const firstReceipt = writeArtifactReceipt({
    rootDir: receiptRoot,
    canonicalUrl: 'https://www.dentsu.com/news-releases/one',
    body: sharedBody,
    bodySha256: sharedHash,
    capturedAt: '2026-08-17T00:00:00.000Z',
    responseHeaders: { content_type: 'text/html', final_url: 'https://www.dentsu.com/news-releases/one', redirect_chain: [] }
  });
  const secondReceipt = writeArtifactReceipt({
    rootDir: receiptRoot,
    canonicalUrl: 'https://www.dentsu.com/news-releases/two',
    body: sharedBody,
    bodySha256: sharedHash,
    capturedAt: '2026-08-17T00:00:00.000Z',
    responseHeaders: { content_type: 'text/html', final_url: 'https://www.dentsu.com/news-releases/two', redirect_chain: [] }
  });
  assert.notEqual(firstReceipt, secondReceipt);
  assert.equal(JSON.parse(fs.readFileSync(path.join(receiptRoot, firstReceipt), 'utf8')).canonical_url, 'https://www.dentsu.com/news-releases/one');
  assert.equal(JSON.parse(fs.readFileSync(path.join(receiptRoot, secondReceipt), 'utf8')).canonical_url, 'https://www.dentsu.com/news-releases/two');
} finally {
  fs.rmSync(receiptRoot, { recursive: true, force: true });
}

assert.equal(
  assertAllowedArtifactUrl('https://www.dentsu.com/news-releases/example#fragment', config),
  'https://www.dentsu.com/news-releases/example'
);
assert.throws(() => assertAllowedArtifactUrl('https://example.com/news-releases/example', config), /not allowlisted/u);
assert.throws(() => assertAllowedArtifactUrl('https://www.dentsu.com:8443/news-releases/example', config), /standard HTTPS port/u);
assert.throws(() => assertAllowedArtifactUrl('https://user@www.dentsu.com/news-releases/example', config), /credentials/u);
assert.throws(() => validateArtifactConfig({ ...config, graph_effect: 'edge' }), /may not authorize/u);

const hydratorRuntimeSource = fs.readFileSync(
  new URL('../tools/hydrate-industrial-exhaust.mjs', import.meta.url),
  'utf8'
);
assert.match(
  hydratorRuntimeSource,
  /last_status: 'not_modified',\s+last_error: null,\s+new_discovery_count: 0/u,
  'a 304 index response must reset the current-run discovery count'
);
assert.match(
  hydratorRuntimeSource,
  /last_status: 'error',\s+last_error: error\.message,\s+new_discovery_count: 0/u,
  'an index acquisition error must reset the current-run discovery count'
);

console.log('industrial-exhaust artifact tests passed');
