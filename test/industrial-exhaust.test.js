import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildAlerts,
  canonicalizeUrl,
  cleanText,
  classifyEventHints,
  mergeFeedItems,
  parseFeed,
  readBoundedUtf8Body,
  readJson,
  redactContactData,
  validateRegistry,
  validateWatchTerms,
  writeFeedReceipt
} from '../tools/lib/industrial-exhaust.mjs';

const source = {
  id: 'dentsu_test_feed',
  publisher: 'Dentsu Inc.',
  surface: 'Test releases',
  feed_url: 'https://example.test/news.xml',
  source_class: 'first_party_corporate_publication',
  enabled: true,
  graph_effect: 'none'
};

const watch = validateWatchTerms({
  schema_version: 1,
  terms: [
    { id: 'evidenza', patterns: ['Evidenza'] },
    { id: 'synthetic_audience', patterns: ['synthetic audience'] },
    { id: 'b2b', patterns: ['B2B'] }
  ]
});

const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Dentsu test releases</title><lastBuildDate>Tue, 14 Jul 2026 08:00:00 GMT</lastBuildDate>
<item><title>Dentsu partners with Evidenza on synthetic audiences</title><link>http://example.test/releases/1?utm_source=rss&amp;b=2&amp;a=1#top</link><guid isPermaLink="false">release-1</guid><pubDate>Mon, 13 Jul 2026 08:00:00 GMT</pubDate><description><![CDATA[Uses B2B planning. Contact jane@example.test or +81 3 1234 5678.]]></description></item>
<item><title>Unexpected new operating capability</title><link>https://example.test/releases/2</link><guid>release-2</guid><pubDate>Tue, 14 Jul 2026 08:00:00 GMT</pubDate><description>No configured watch term is required for capture.</description></item>
</channel></rss>`;

const parsed = parseFeed(rss, source);
assert.equal(parsed.item_count, 2, 'RSS intake must capture all entries, not only watch-term matches');
assert.equal(parsed.items[0].canonical_url, 'https://example.test/releases/1?a=1&b=2');
assert.match(parsed.items[0].summary, /\[contact omitted\]/u);
assert.doesNotMatch(parsed.items[0].summary, /example\.test|1234/u);

const firstMerge = mergeFeedItems({
  observations: [], source, parsedFeed: parsed, capturedAt: '2026-07-14T09:00:00.000Z',
  feedReceiptPath: `receipts/exhaust/${source.id}/${parsed.feed_sha256}.json`
});
assert.equal(firstMerge.added.length, 2);
for (const observation of firstMerge.observations) {
  assert.equal(observation.source_class, 'first_party_corporate_publication');
  assert.equal(observation.evidence_class, 'first_party_attributed_statement');
  assert.equal(observation.graph_effect, 'none');
  assert.equal(observation.promotion_authority, false);
  assert.equal(observation.canonical_mutation_authorized, false);
  assert.equal('viewer' in observation, false);
  assert.equal('motive' in observation, false);
}

const unchangedMerge = mergeFeedItems({
  observations: firstMerge.observations, source, parsedFeed: parsed, capturedAt: '2026-07-15T09:00:00.000Z',
  feedReceiptPath: `receipts/exhaust/${source.id}/${parsed.feed_sha256}.json`
});
assert.equal(unchangedMerge.added.length, 0, 'unchanged entries must deduplicate');

const revisedRss = rss.replace('Uses B2B planning.', 'Uses B2B planning and media activation.');
const revised = parseFeed(revisedRss, source);
const revisionMerge = mergeFeedItems({
  observations: firstMerge.observations, source, parsedFeed: revised, capturedAt: '2026-07-16T09:00:00.000Z',
  feedReceiptPath: `receipts/exhaust/${source.id}/${revised.feed_sha256}.json`
});
assert.equal(revisionMerge.added.length, 1);
assert.equal(revisionMerge.added[0].revision_number, 2);
assert.equal(revisionMerge.added[0].revision_of, firstMerge.observations.find(item => item.source_record_id === 'release-1').observation_id);

const initialReleaseObservation = firstMerge.observations.find(item => item.source_record_id === 'release-1');
const revertedMerge = mergeFeedItems({
  observations: revisionMerge.observations,
  source,
  parsedFeed: parsed,
  capturedAt: '2026-07-17T09:00:00.000Z',
  feedReceiptPath: `receipts/exhaust/${source.id}/${parsed.feed_sha256}.json`
});
assert.equal(revertedMerge.added.length, 1, 'A → B → A must append a new observation occurrence');
const revertedObservation = revertedMerge.added[0];
assert.equal(revertedObservation.content_sha256, initialReleaseObservation.content_sha256);
assert.notEqual(
  revertedObservation.observation_id,
  initialReleaseObservation.observation_id,
  'reverted feed content must not reuse the first occurrence identifier'
);
assert.equal(revertedObservation.revision_of, revisionMerge.added[0].observation_id);
assert.equal(revertedObservation.revision_number, 3);

const repeatedRevisionMerge = mergeFeedItems({
  observations: revertedMerge.observations,
  source,
  parsedFeed: revised,
  capturedAt: '2026-07-18T09:00:00.000Z',
  feedReceiptPath: `receipts/exhaust/${source.id}/${revised.feed_sha256}.json`
});
assert.equal(repeatedRevisionMerge.added.length, 1, 'A → B → A → B must append a fourth occurrence');
const repeatedRevision = repeatedRevisionMerge.added[0];
assert.equal(repeatedRevision.content_sha256, revisionMerge.added[0].content_sha256);
assert.notEqual(
  repeatedRevision.observation_id,
  revisionMerge.added[0].observation_id,
  'repeated revised content must not reuse the earlier revised occurrence identifier'
);
assert.equal(repeatedRevision.revision_of, revertedObservation.observation_id);
assert.equal(repeatedRevision.revision_number, 4);
assert.equal(
  new Set(repeatedRevisionMerge.observations
    .filter(item => item.source_record_id === 'release-1')
    .map(item => item.observation_id)).size,
  4,
  'every feed revision occurrence must retain a unique identifier'
);

const alerts = buildAlerts(revisionMerge.observations, watch);
assert.equal(alerts.length, 1, 'unmatched entries remain captured without becoming alerts');
assert.deepEqual(alerts[0].matched_terms, ['b2b', 'evidenza', 'synthetic_audience']);
assert.equal(alerts[0].revision_number, 2, 'alerts must point to the latest revision only');
assert.ok(alerts[0].event_hints.includes('partnership_vendor'));
assert.ok(alerts[0].event_hints.includes('dataset_input') === false);
assert.equal(alerts[0].graph_effect, 'none');
assert.equal(alerts[0].canonical_mutation_authorized, false);

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom feed</title>
<entry><id>tag:example.test,2026:3</id><title>AI For Growth update</title><link rel="alternate" href="https://example.test/atom/3?utm_campaign=x"/><published>2026-07-17T10:30:00Z</published><summary type="html">&lt;p&gt;Simulation update&lt;/p&gt;</summary></entry></feed>`;
const atomParsed = parseFeed(atom, source);
assert.equal(atomParsed.item_count, 1);
assert.equal(atomParsed.items[0].canonical_url, 'https://example.test/atom/3');
assert.equal(atomParsed.items[0].summary, 'Simulation update');

const rdf = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>RDF feed</title></channel><item rdf:about="https://example.test/rdf/4"><title>Leadership appointment</title><link>https://example.test/rdf/4</link><dc:date>2026-07-18T00:00:00Z</dc:date><description>President appointed</description></item></rdf:RDF>`;
const rdfParsed = parseFeed(rdf, source);
assert.equal(rdfParsed.item_count, 1);
assert.equal(rdfParsed.items[0].published_at, '2026-07-18T00:00:00.000Z');
assert.ok(classifyEventHints(rdfParsed.items[0]).includes('leadership_role'));

assert.equal(canonicalizeUrl('http://Example.TEST/a?utm_medium=rss&z=2&a=1#frag', source.feed_url), 'https://example.test/a?a=1&z=2');
assert.equal(
  canonicalizeUrl('https://www.dentsu.co.jp/en/news/release/2026/0817020000.html', source.feed_url),
  'https://www.dentsu.co.jp/en/news/release/2026/0817020000.html'
);
const numericIdentityRss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Numeric identities</title>
<item><title>First</title><link>https://www.dentsu.co.jp/en/news/release/2026/0817020000.html</link><guid>0817020000</guid></item>
<item><title>Second</title><link>https://www.dentsu.co.jp/en/news/release/2026/0817010000.html</link><guid>0817010000</guid></item>
</channel></rss>`;
const numericIdentityParsed = parseFeed(numericIdentityRss, source);
assert.equal(numericIdentityParsed.item_count, 2);
assert.deepEqual(
  numericIdentityParsed.items.map(item => item.source_record_id).sort(),
  ['0817010000', '0817020000']
);
assert.equal(new Set(numericIdentityParsed.items.map(item => item.source_record_key)).size, 2);

const metricRedaction = redactContactData(
  'Dentsu reported 123456789 impressions and 987654321 yen on 2026-08-17. Tel: 03 6216 5111. International: +81 3 6216 5111.'
);
assert.match(metricRedaction, /123456789 impressions/u);
assert.match(metricRedaction, /987654321 yen/u);
assert.match(metricRedaction, /2026-08-17/u);
assert.equal((metricRedaction.match(/\[contact omitted\]/gu) ?? []).length, 2);
assert.equal(
  cleanText('<p>2026-08-17</p><p>03-6216-5111</p><p>090-1234-5678</p>'),
  '2026-08-17 [contact omitted] [contact omitted]',
  'dates and adjacent phone spans must be segmented independently after HTML cleanup'
);
assert.equal(redactContactData('(03) 6216 5111'), '[contact omitted]');
for (const twoGroupDomestic of ['03-62165111', '050-12345678', '030 12345678']) {
  assert.equal(
    redactContactData(twoGroupDomestic),
    '[contact omitted]',
    'two-group domestic telephone formats must be redacted at clean token boundaries'
  );
}

for (const compactDomestic of [
  '0362168041',
  '05012345678',
  '06012345678',
  '07012345678',
  '08012345678',
  '09012345678',
  '０６０１２３４５６７８',
  '０９０１２３４５６７８'
]) {
  assert.equal(
    redactContactData(compactDomestic),
    '[contact omitted]',
    'compact domestic telephone numbers must be redacted at clean token boundaries'
  );
}

for (const labelledCompactIdentifier of [
  'GUID: 06012345678',
  'GUID: 09012345678',
  'release id 0817020000',
  'reference 0362168041',
  '管理番号：０６０１２３４５６７８',
  '管理番号：０９０１２３４５６７８'
]) {
  assert.equal(
    redactContactData(labelledCompactIdentifier),
    labelledCompactIdentifier,
    'explicit English and Japanese identifier labels must protect compact numeric identifiers'
  );
}
for (const labelledCompactPhone of ['Phone: 06012345678', 'Phone: 09012345678']) {
  assert.equal(
    redactContactData(labelledCompactPhone),
    'Phone: [contact omitted]',
    'phone labels must continue to redact compact domestic numbers'
  );
}
for (const labelledIdentifier of [
  'ID: 09012345678',
  'ＩＤ：０９０１２３４５６７８',
  'GUID: 03-6216-8041',
  'reference: +81 3 6216 5111',
  'reference: +1 212 555 1234',
  'ID: +44 (0)20 7123 4567',
  '管理番号：03-6216-8041',
  '識別子：+81 3 6216 5111'
]) {
  assert.equal(
    redactContactData(labelledIdentifier),
    labelledIdentifier,
    'explicit identifier labels must protect every phone-shaped candidate and subspan'
  );
}
for (const [labelledPhone, expected] of [
  ['Phone: ID: 09012345678', 'Phone: ID: [contact omitted]'],
  ['Phone ID: 09012345678', 'Phone ID: [contact omitted]'],
  ['電話番号 ＩＤ：０９０１２３４５６７８', '電話番号 ＩＤ：[contact omitted]']
]) {
  assert.equal(
    redactContactData(labelledPhone),
    expected,
    'an affirmative phone label must override a trailing identifier label'
  );
}
assert.equal(
  redactContactData('ID: 09012345678 Phone: 03-6216-8041'),
  'ID: 09012345678 Phone: [contact omitted]',
  'identifier protection must not suppress a later independently labelled phone'
);

for (const [identifierThenPhone, expected] of [
  ['ID: 09012345678 / 03-6216-8041', 'ID: 09012345678 / [contact omitted]'],
  ['reference: 09012345678 03-6216-8041', 'reference: 09012345678 [contact omitted]'],
  ['ID: 03-6216-8041 090-1234-5678', 'ID: 03-6216-8041 [contact omitted]'],
  ['ID: 01 42 68 53 00 03 62 16 80 41', 'ID: 01 42 68 53 00 [contact omitted]'],
  ['reference: +1 212 555 1234 03-6216-8041', 'reference: +1 212 555 1234 [contact omitted]'],
  ['ID: +44 (0)20 7123 4567 03-6216-8041', 'ID: +44 (0)20 7123 4567 [contact omitted]'],
  ['ID: 09012345678 +81 90 1234 5678', 'ID: 09012345678 [contact omitted]']
]) {
  assert.equal(
    redactContactData(identifierThenPhone),
    expected,
    'identifier protection must end after the first phone-shaped value in one scanner span'
  );
}

for (const [unscoredIdentifierThenPhone, expected] of [
  ['ID: 12345678 / 03-6216-8041', 'ID: 12345678 / [contact omitted]'],
  ['ID: 12345678. 03-6216-8041', 'ID: 12345678. [contact omitted]'],
  ['ID: 12345678 / +81 3 6216 5111', 'ID: 12345678 / [contact omitted]'],
  ['ID: 12345678; 03-6216-8041', 'ID: 12345678; [contact omitted]'],
  ['ID: 12345678 Phone: 03-6216-8041', 'ID: 12345678 Phone: [contact omitted]']
]) {
  assert.equal(
    redactContactData(unscoredIdentifierThenPhone),
    expected,
    'an unscored numeric identifier must not protect a later independently complete phone'
  );
}
for (const [reviewBoundaryInput, expected] of [
  [
    'ID: 09012345678 / (03) 6216 8041',
    'ID: 09012345678 / [contact omitted]'
  ],
  [
    'ＩＤ：０９０１２３４５６７８／（０３） ６２１６ ８０４１',
    'ＩＤ：０９０１２３４５６７８／[contact omitted]'
  ],
  [
    'ID: 01 42 68 53 00 / (03) 6216 8041',
    'ID: 01 42 68 53 00 / [contact omitted]'
  ],
  [
    'ID: 12345678 03-6216-8041',
    'ID: 12345678 [contact omitted]'
  ],
  [
    'ID: 12345678 (03) 6216 8041',
    'ID: 12345678 [contact omitted]'
  ],
  [
    'ID: 09012345678 (03) 6216 8041',
    'ID: 09012345678 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(reviewBoundaryInput),
    expected,
    'validated boundaries must be selected before a later phone group can extend identifier scope'
  );
}
for (const unsplitWhitespaceIdentifier of [
  'ID: 1 212 555 1234',
  'ID: 999 212 555 1234',
  'ID: 12345678 87654321'
]) {
  assert.equal(
    redactContactData(unsplitWhitespaceIdentifier),
    unsplitWhitespaceIdentifier,
    'whitespace alone must not split a complete or insufficiently bounded numeric identifier'
  );
}

for (const [groupedUnscoredIdentifierThenPhone, expected] of [
  [
    'ID: 1234 5678 03-6216-8041',
    'ID: 1234 5678 [contact omitted]'
  ],
  [
    'ID: 123-45678 090-1234-5678',
    'ID: 123-45678 [contact omitted]'
  ],
  [
    'ＩＤ：１２３４ ５６７８ ０３－６２１６－８０４１',
    'ＩＤ：１２３４ ５６７８ [contact omitted]'
  ],
  [
    'ID: 1234 5678 (03) 6216 8041',
    'ID: 1234 5678 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(groupedUnscoredIdentifierThenPhone),
    expected,
    'grouped unscored identifiers must end before an independently valid phone suffix'
  );
}

for (const nestedIdentifierWrapper of [
  'ID: [(+81 3 6216 5111)]',
  'ID: [ (+81 3 6216 5111)]',
  'ＩＤ：（（＋８１ ３ ６２１６ ５１１１））'
]) {
  assert.equal(
    redactContactData(nestedIdentifierWrapper),
    nestedIdentifierWrapper,
    'a sequence of accepted opening wrappers must remain in explicit identifier context'
  );
}

const nestedPhoneLabelRedaction = redactContactData(
  'Phone: ID: [(+81 3 6216 5111)]'
);
assert.match(
  nestedPhoneLabelRedaction,
  /\[contact omitted\]/u,
  'nested identifier wrappers must not suppress an affirmative phone-label override'
);
assert.doesNotMatch(
  nestedPhoneLabelRedaction.normalize('NFKC'),
  /81362165111/u,
  'phone-labelled nested values must not survive redaction'
);

const nestedWrapperUrlSegment = 'a'.repeat(140);
const nestedWrapperUrlPrefix = `https://example.test/${nestedWrapperUrlSegment}/id: [`;
const nestedWrapperUrlRedaction = redactContactData(
  `${nestedWrapperUrlPrefix}(+81 3 6216 5111)]`
);
assert.ok(
  nestedWrapperUrlRedaction.startsWith(nestedWrapperUrlPrefix),
  'nested wrapper support must preserve the complete preceding URL token'
);
assert.match(
  nestedWrapperUrlRedaction,
  /\[contact omitted\]/u,
  'a URL-embedded identifier label must not protect a nested wrapped phone after whitespace'
);
assert.doesNotMatch(
  nestedWrapperUrlRedaction.normalize('NFKC'),
  /81362165111/u,
  'URL-adjacent nested wrapped phones must not survive redaction'
);

for (const [lateParenthesizedPhone, expected] of [
  [
    'ID: 1234567 / (123) 4567',
    'ID: 1234567 / [contact omitted]'
  ],
  [
    'ID: 1234567/(123)4567',
    'ID: 1234567/[contact omitted]'
  ],
  [
    'ＩＤ：１２３４５６７／（１２３）４５６７',
    'ＩＤ：１２３４５６７／[contact omitted]'
  ],
  [
    'ID: 1234567.(123)4567',
    'ID: 1234567.[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(lateParenthesizedPhone),
    expected,
    'a validated later-phone boundary must be selected before whole-span scoring'
  );
}

for (const [barePeriodIdentifierThenPhone, expected] of [
  [
    'ID: 12345678.03.6216.8041',
    'ID: 12345678.[contact omitted]'
  ],
  [
    'ＩＤ：１２３４５６７８．０３．６２１６．８０４１',
    'ＩＤ：１２３４５６７８．[contact omitted]'
  ],
  [
    'ID: 12345678.212.555.1234',
    'ID: 12345678.[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(barePeriodIdentifierThenPhone),
    expected,
    'a bare ASCII or fullwidth period must permit an independently valid phone suffix'
  );
}

for (const unsplitBoundaryGuard of [
  'ID: 1234567 / 7654321',
  'ID: 12345678.87654321',
  'ID: 03.6216.8041',
  'ID: 1.212.555.1234',
  'ＩＤ：１．２１２．５５５．１２３４'
]) {
  assert.equal(
    redactContactData(unsplitBoundaryGuard),
    unsplitBoundaryGuard,
    'boundary punctuation must not split an invalid suffix or a complete period-formatted identifier'
  );
}

for (const [firstValidIdentifierBoundary, expected] of [
  [
    'ID: 1234567 / (123) 4567 / (234) 5678',
    'ID: 1234567 / [contact omitted] / [contact omitted]'
  ],
  [
    'ID: 1234567/(123)4567/(234)5678',
    'ID: 1234567/[contact omitted]/[contact omitted]'
  ],
  [
    'ＩＤ：１２３４５６７／（１２３）４５６７／（２３４）５６７８',
    'ＩＤ：１２３４５６７／[contact omitted]／[contact omitted]'
  ],
  [
    'ID: 1234567.(123)4567.(234)5678',
    'ID: 1234567.[contact omitted].[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(firstValidIdentifierBoundary),
    expected,
    'identifier protection must end at the first independently valid later-phone boundary'
  );
}

for (const completeGroupedIdentifier of [
  'ID: +1 212 555 1234',
  'reference: +1 212 555 1234',
  'ID: +44 (0)20 7123 4567',
  'ID: (+81 3 6216 5111)',
  'ＩＤ：（＋８１ ３ ６２１６ ５１１１）'
]) {
  assert.equal(
    redactContactData(completeGroupedIdentifier),
    completeGroupedIdentifier,
    'a complete grouped identifier must not be split at an internally phone-shaped suffix'
  );
}

for (const [urlPathLabel, expected] of [
  ['https://example.test/id: 09012345678', 'https://example.test/id: [contact omitted]'],
  ['https://example.test/reference: +81 3 6216 5111', 'https://example.test/reference: [contact omitted]'],
  ['example.test/id: 03-6216-8041', 'example.test/id: [contact omitted]']
]) {
  assert.equal(
    redactContactData(urlPathLabel),
    expected,
    'an identifier word embedded in a URL token must not protect a later phone after whitespace'
  );
}

const longIdentifierUrlSegment = 'a'.repeat(140);
for (const [longUrlPathLabel, expected] of [
  [
    `https://example.test/${longIdentifierUrlSegment}/id: 09012345678`,
    `https://example.test/${longIdentifierUrlSegment}/id: [contact omitted]`
  ],
  [
    `//example.test/${longIdentifierUrlSegment}/reference: +81 3 6216 5111`,
    `//example.test/${longIdentifierUrlSegment}/reference: [contact omitted]`
  ],
  [
    `example.test/${longIdentifierUrlSegment}/id: 03-6216-8041`,
    `example.test/${longIdentifierUrlSegment}/id: [contact omitted]`
  ],
  [
    `192.0.2.1/${longIdentifierUrlSegment}/reference: 090-1234-5678`,
    `192.0.2.1/${longIdentifierUrlSegment}/reference: [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(longUrlPathLabel),
    expected,
    'a long URL token must retain URL provenance when rejecting an embedded identifier label'
  );
}

const finalBoundaryLongUrlSegment = 'a'.repeat(140);
for (const [finalBoundaryInput, expected] of [
  ['ID: 12345678/03-6216-8041', 'ID: 12345678/[contact omitted]'],
  ['ＩＤ：１２３４５６７８／０３－６２１６－８０４１', 'ＩＤ：１２３４５６７８／[contact omitted]'],
  ['ID: 12345678/87654321', 'ID: 12345678/87654321'],
  [
    `https://example.test/${finalBoundaryLongUrlSegment}/reference: (+81 3 6216 5111)`,
    `https://example.test/${finalBoundaryLongUrlSegment}/reference: ([contact omitted])`
  ],
  [
    `//example.test/${finalBoundaryLongUrlSegment}/id: （＋８１ ３ ６２１６ ５１１１）`,
    `//example.test/${finalBoundaryLongUrlSegment}/id: （[contact omitted]）`
  ]
]) {
  assert.equal(
    redactContactData(finalBoundaryInput),
    expected,
    'final identifier boundaries must preserve the identifier and redact only an independent phone'
  );
}

for (const wrappedIdentifier of [
  'ID: (+81 3 6216 5111)',
  'ＩＤ：（＋８１ ３ ６２１６ ５１１１）'
]) {
  assert.equal(
    redactContactData(wrappedIdentifier),
    wrappedIdentifier,
    'an opening wrapper after an identifier label must remain in identifier context'
  );
}

for (const punctuatedPhoneId of [
  'Phone: (ID: 09012345678)',
  'Phone / ID: 09012345678',
  'Phone-ID: 09012345678',
  'Phone/ID: 09012345678',
  '電話番号／ＩＤ：０９０１２３４５６７８'
]) {
  const redacted = redactContactData(punctuatedPhoneId);
  assert.match(
    redacted,
    /\[contact omitted\]/u,
    'separator punctuation must not suppress a phone-label override before standalone ID'
  );
  assert.doesNotMatch(
    redacted.normalize('NFKC'),
    /09012345678/u,
    'phone-labelled values must not survive redaction'
  );
}

for (const [phoneLabelThenIdentifier, expected] of [
  [
    'Phone: reference: +81 3 6216 5111',
    'Phone: reference: [contact omitted]'
  ],
  [
    'Phone / GUID: 09012345678',
    'Phone / GUID: [contact omitted]'
  ],
  [
    'Phone: record id: 03-6216-8041',
    'Phone: record id: [contact omitted]'
  ],
  [
    'contact: reference: +81 3 6216 5111',
    'contact: reference: [contact omitted]'
  ],
  [
    'contact number reference: +81 3 6216 5111',
    'contact number reference: [contact omitted]'
  ],
  [
    '電話番号／管理番号：０９０１２３４５６７８',
    '電話番号／管理番号：[contact omitted]'
  ],
  [
    'Phone / GUID / record id: 09012345678',
    'Phone / GUID / record id: [contact omitted]'
  ],
  [
    'Phone GUID record id: 03-6216-8041',
    'Phone GUID record id: [contact omitted]'
  ],
  [
    'contact: GUID / record id: +81 3 6216 5111',
    'contact: GUID / record id: [contact omitted]'
  ],
  [
    'contact number GUID reference: 09012345678',
    'contact number GUID reference: [contact omitted]'
  ],
  [
    'contact ID reference: 09012345678',
    'contact ID reference: [contact omitted]'
  ],
  [
    '電話番号／管理番号／参照番号：０９０１２３４５６７８',
    '電話番号／管理番号／参照番号：[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(phoneLabelThenIdentifier),
    expected,
    'phone authority must traverse the complete trailing identifier-label chain'
  );
}

const longPhoneLabelUrlSegment = 'a'.repeat(140);
const longPhoneLabelIdentifierChain = `${'GUID '.repeat(40)}record id: `;
for (const urlEmbeddedPhoneLabelIdentifier of [
  'https://example.test/phone GUID: 09012345678',
  `https://example.test/${longPhoneLabelUrlSegment}/mobile record id: +81 3 6216 5111`,
  '//example.test/tel reference: 03-6216-8041',
  'example.test/fax identifier: 09012345678',
  '192.0.2.1/contact ID reference: 09012345678',
  'www.example.test/phone (GUID: 09012345678)',
  'https://example.test/path?kind=phone GUID: 09012345678',
  'https://example.test/path#fax reference: 03-6216-8041',
  `https://example.test/${longPhoneLabelUrlSegment}/phone ${longPhoneLabelIdentifierChain}09012345678`
]) {
  assert.equal(
    redactContactData(urlEmbeddedPhoneLabelIdentifier),
    urlEmbeddedPhoneLabelIdentifier,
    'a phone-label word embedded in a URL token must not override an explicit identifier label'
  );
}

for (const [narrativePhoneLabelAfterUrl, expected] of [
  [
    'https://example.test/path Phone GUID: 09012345678',
    'https://example.test/path Phone GUID: [contact omitted]'
  ],
  [
    `https://example.test/${longPhoneLabelUrlSegment}/ Mobile record id: +81 3 6216 5111`,
    `https://example.test/${longPhoneLabelUrlSegment}/ Mobile record id: [contact omitted]`
  ],
  [
    '//example.test/path Fax reference: 03-6216-8041',
    '//example.test/path Fax reference: [contact omitted]'
  ],
  [
    'example.test/path Tel GUID: 09012345678',
    'example.test/path Tel GUID: [contact omitted]'
  ],
  [
    `https://example.test/${longPhoneLabelUrlSegment}/ Mobile ${longPhoneLabelIdentifierChain}+81 3 6216 5111`,
    `https://example.test/${longPhoneLabelUrlSegment}/ Mobile ${longPhoneLabelIdentifierChain}[contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(narrativePhoneLabelAfterUrl),
    expected,
    'URL provenance must end at whitespace before a genuine narrative phone label'
  );
}

const thousandIdentifierLabelChain = 'GUID '.repeat(1000);
for (const narrativePhoneLabel of [
  'Phone number',
  'Telephone number',
  'Mobile number',
  'Phone number is'
]) {
  const input = `${narrativePhoneLabel} ${thousandIdentifierLabelChain}record id: 09012345678`;
  assert.equal(
    redactContactData(input),
    `${narrativePhoneLabel} ${thousandIdentifierLabelChain}record id: [contact omitted]`,
    'multi-token phone-label authority must survive a long identifier-label chain'
  );
}

const nonPhoneThousandLabelChain = `Archive ${thousandIdentifierLabelChain}record id: 09012345678`;
assert.equal(
  redactContactData(nonPhoneThousandLabelChain),
  nonPhoneThousandLabelChain,
  'linear long-chain recovery must not invent telephone authority'
);

const overflowIdentifierLabelChain = 'GUID '.repeat(4000);
const overflowPhoneLabelChain = `Phone ${overflowIdentifierLabelChain}record id: 09012345678`;
assert.equal(
  redactContactData(overflowPhoneLabelChain),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted]`,
  'identifier-label context beyond the firm bound must fail conservatively to redaction'
);

for (const overflowObservationTail of [
  '2026 people',
  '2026-08-17',
  '12:30',
  '3.14',
  '10-20 people'
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${overflowObservationTail}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${overflowObservationTail}`,
    'bounded context must preserve a strong numeric observation after the redacted phone'
  );
}

for (const [overflowObservation, laterPhone] of [
  ['2026 people', '03-6216-8041'],
  ['2026-08-17', '03-6216-8041'],
  ['12:30', '(03) 6216 8041'],
  ['3.14', '(03) 6216 8041'],
  ['10-20 people', '+81 3 6216 5111']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${overflowObservation} ${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${overflowObservation} [contact omitted]`,
    'a proven observation boundary must survive recursion to a later independent phone'
  );
}

for (const [overflowObservation, separator, laterPhone] of [
  ['2026-08-17', '.', '03-6216-8041'],
  ['3.14', '.', '03-6216-8041'],
  ['２０２６－０８－１７', '．', '０３－６２１６－８０４１'],
  ['2026-08-17', '.', '1 212 555 1234']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${overflowObservation}${separator}${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${overflowObservation}${separator}[contact omitted]`,
    'period boundaries after proven observations must reach the complete later phone'
  );
}

for (const [prefix, observation, separator, laterPhone] of [
  ['ID: 09012345678', '2026-08-17', '.', '1 212 555 1234'],
  ['Phone: 09012345678', '2026-08-17', ' ', '01 42 68 53 00'],
  ['Phone: 09012345678', '2026.08.17', '.', '03 62 16 80 41'],
  ['ＩＤ：０９０１２３４５６７８', '２０２６－０８－１７', '．', '１ ２１２ ５５５ １２３４']
]) {
  const input = `${prefix} ${observation}${separator}${laterPhone}`;
  const redactedPrefix = prefix.startsWith('Phone:')
    ? 'Phone: [contact omitted]'
    : prefix;
  assert.equal(
    redactContactData(input),
    `${redactedPrefix} ${observation}${separator}[contact omitted]`,
    'post-observation intervals must retain the exact validated phone start and end'
  );
}

for (const terminalObservation of [
  '90 people',
  '3.14',
  '12:30',
  '10-20 people',
  '2027-09-18'
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 01 42 68 53 00 ${terminalObservation}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 [contact omitted] ${terminalObservation}`,
    'a candidate-specific observation cap must bound the exact later-phone interval'
  );
}

const sequentialObservationPhones = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17 01 42 68 53 00 90 people +81 3 6216 5111`;
assert.equal(
  redactContactData(sequentialObservationPhones),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17 [contact omitted] 90 people [contact omitted]`,
  'sequential observation/phone transitions must retain each exact interval'
);

for (const [observations, laterPhone] of [
  ['2026-08-17 2027-09-18', '03-6216-8041'],
  ['2026-08-17 12:30', '+81 3 6216 5111'],
  ['3.14 90 people', '(03) 6216 8041'],
  ['２０２６－０８－１７ ２０２７－０９－１８', '０３－６２１６－８０４１']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations} ${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations} [contact omitted]`,
    'each complete consecutive observation must be skipped before validating a later phone'
  );
}

for (const [observations, laterPhone] of [
  ['2026-08-17(3.14)', '03-6216-8041'],
  ['2026-08-17(12:30)', '+81 3 6216 5111'],
  ['3.14((2027-09-18))', '(03) 6216 8041'],
  ['２０２６－０８－１７（３．１４）', '０３－６２１６－８０４１']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations} ${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations} [contact omitted]`,
    'an accepted opening wrapper must advance complete observation custody before phone validation'
  );
}

for (const [observations, laterPhone] of [
  ['2026-08-17(3.14)', '03-6216-8041'],
  ['2026-08-17(12:30)', '03-6216-8041'],
  ['3.14((2027-09-18))', '1 212 555 1234'],
  ['２０２６－０８－１７（３．１４）', '０３－６２１６－８０４１'],
  ['2026-08-17(12:30)', '+81 3 6216 5111']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations}${laterPhone}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations}[contact omitted]`,
    'closing wrappers after complete observations must reach the later phone interval'
  );
}

const closingWrapperObservationTail = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14)90 people`;
assert.equal(
  redactContactData(closingWrapperObservationTail),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14)90 people`,
  'closing-wrapper admission must defer to a complete later numeric observation'
);

for (const [observations, laterPhone, extension, expectedExtension] of [
  ['2026-08-17(3.14)', '03-6216-8041', ' ext 55', ' ext [contact omitted]'],
  ['2026-08-17(12:30)', '+81 3 6216 5111', ' #1234', ' #[contact omitted]'],
  ['3.14((2027-09-18))', '(03) 6216 8041', '内線1234', '内線[contact omitted]'],
  ['２０２６－０８－１７（３．１４）', '０３－６２１６－８０４１', '内線１２３４', '内線[contact omitted]']
]) {
  const input = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 ${observations} ${laterPhone}${extension}`;
  assert.equal(
    redactContactData(input),
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] ${observations} [contact omitted]${expectedExtension}`,
    'extension authority must follow complete observation custody and exact later-phone validation'
  );
}

const extensionYearEndingPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14) +882 13 123 456 2026 #1234`;
assert.equal(
  redactContactData(extensionYearEndingPhone),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14) [contact omitted] #[contact omitted]`,
  'observation custody must not truncate a structurally valid year-ending phone before its extension'
);

for (const [unmatchedTail, expectedTail] of [
  ['2026-08-17-)12345678', '2026-08-17-)12345678'],
  ['2026-08-17-) 12345678', '2026-08-17-) 12345678'],
  ['２０２６－０８－１７－）１２３４５６７８', '２０２６－０８－１７－）１２３４５６７８']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 ${unmatchedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] ${expectedTail}`,
    'an unmatched closing wrapper may not invent a later telephone boundary'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17-) 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 ２０２６－０８－１７－） ０３－６２１６－８０４１',
    'Phone: [contact omitted] ２０２６－０８－１７－） [contact omitted]'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(3.14] +81 3 6216 5111`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17(3.14] [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an unowned closer may not veto independent evidence for a complete later phone'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17-) 050-12345678',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 03-62165111',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ],
  [
    'Phone: 09012345678 ２０２６－０８－１７－） ０５０－１２３４５６７８',
    'Phone: [contact omitted] ２０２６－０８－１７－） [contact omitted]'
  ],
  [
    `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 050-12345678`,
    `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted]`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an intrinsically complete range-shaped phone must outrank an overlapping observation spelling'
  );
}

for (const observationTail of [
  '10-20 people',
  '2027-09-18',
  '3.14'
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) ${observationTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) ${observationTail}`,
    'intrinsic-phone precedence must preserve genuine numeric observations'
  );
}

for (const contaminatedTail of [
  '03.6216.12345678',
  '０３．６２１６．１２３４５６７８'
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) ${contaminatedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) ${contaminatedTail}`,
    'invalid-closer suppression must survive every observation restart'
  );
}

for (const [attachedCloser, attachedTail] of [
  [')', '03.6216.12345678'],
  [']', '03.6216.12345678'],
  ['）', '０３．６２１６．１２３４５６７８'],
  ['］', '０３．６２１６．１２３４５６７８']
]) {
  const input = `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17${attachedCloser}${attachedTail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17${attachedCloser}${attachedTail}`,
    'invalid-closer suppression must be acquired before an ineligible transition exits'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 2026-08-17)03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)[contact omitted]'
  ],
  [
    'Phone: ０９０１２３４５６７８ ２０２６－０８－１７）０３－６２１６－８０４１',
    'Phone: [contact omitted] ２０２６－０８－１７）[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an attached invalid closer must still admit an intrinsically complete phone'
  );
}

for (const [tail, expectedTail] of [
  ['12345678', '12345678'],
  ['03.6216.12345678', '03.6216.12345678'],
  ['０３．６２１６．１２３４５６７８', '０３．６２１６．１２３４５６７８']
]) {
  const input =
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17-) 03-6216-8041 ${tail}`;
  assert.equal(
    redactContactData(input),
    `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17-) [contact omitted] ${expectedTail}`,
    'invalid-closer suppression must persist through every recursive suffix scan'
  );
}

assert.equal(
  redactContactData(
    `Archive ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17)12345678`
  ),
  `Archive ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17)12345678`,
  'an attached invalid closer must not grant phone authority to a bare numeric tail'
);

for (const [name, input, expected] of [
  [
    'split-four-four',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 5678`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 5678`
  ],
  [
    'split-six-two',
    `Archive ${overflowIdentifierLabelChain}(record id: 123456) 78`,
    `Archive ${overflowIdentifierLabelChain}(record id: 123456) 78`
  ],
  [
    'first-seven-tail-one',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234567) 8`,
    `Archive ${overflowIdentifierLabelChain}(record id: [contact omitted]) 8`
  ],
  [
    'fullwidth-split-four-four',
    `Archive ${overflowIdentifierLabelChain}（record id: １２３４） ５６７８`,
    `Archive ${overflowIdentifierLabelChain}（record id: １２３４） ５６７８`
  ],
  [
    'intrinsic-after-short-prefix',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 050-12345678`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) [contact omitted]`
  ],
  [
    'observation-after-short-prefix',
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 2027-09-18`,
    `Archive ${overflowIdentifierLabelChain}(record id: 1234) 2027-09-18`
  ],
  [
    'two-intrinsic-segments',
    `Archive ${overflowIdentifierLabelChain}(record id: 050-12345678) 03-6216-8041`,
    `Archive ${overflowIdentifierLabelChain}(record id: [contact omitted]) [contact omitted]`
  ],
  [
    'explicit-phone-label-crossing',
    'Phone: (1234) 5678',
    'Phone: [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a removed closer may be suppressed only by context-free interval evidence`
  );
}

for (const [name, input, expectedRedactions, expectedTail] of [
  [
    'ascii-bare-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 12345678`,
    2,
    ' 12345678'
  ],
  [
    'ascii-dotted-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 03.6216.12345678`,
    2,
    ' 03.6216.12345678'
  ],
  [
    'fullwidth-bare-tail',
    `Archive ${overflowIdentifierLabelChain}（record id: ０９０１２３４５６７８ ２０２６－０８－１７－）０３－６２１６－８０４１） １２３４５６７８`,
    2,
    ' １２３４５６７８'
  ],
  [
    'post-wrapper-intrinsic-phone',
    `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 050-12345678`,
    3,
    ' [contact omitted]'
  ],
  [
    'plus-wrapper-bare-tail',
    `Archive ${overflowIdentifierLabelChain}(record id: +81 3 6216 5111 2026-08-17-)03-6216-8041) 12345678`,
    2,
    ' 12345678'
  ]
]) {
  const actual = redactContactData(input);
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    expectedRedactions,
    `${name}: an outer-wrapper boundary must not restore overflow authority`
  );
  assert.ok(
    actual.endsWith(expectedTail),
    `${name}: the post-wrapper suffix must retain only independently proved telephone ranges`
  );
  assert.match(
    actual,
    /2026-08-17-|２０２６－０８－１７－/u,
    `${name}: the complete pre-boundary observation must remain intact`
  );
}

const ownedWrapperObservationTail =
  `Archive ${overflowIdentifierLabelChain}(record id: 09012345678 2026-08-17-)03-6216-8041) 2027-09-18`;
const ownedWrapperObservationActual = redactContactData(
  ownedWrapperObservationTail
);
assert.equal(
  (ownedWrapperObservationActual.match(/\[contact omitted\]/gu) ?? []).length,
  2,
  'a strong observation after an outer wrapper must not be promoted as contact data'
);
assert.ok(
  ownedWrapperObservationActual.endsWith(' 2027-09-18'),
  'the post-wrapper date must remain byte-for-byte intact'
);

const attachedParenthesizedPhone = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026-08-17(03) 6216 8041`;
assert.equal(
  redactContactData(attachedParenthesizedPhone),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted] 2026-08-17[contact omitted]`,
  'an opening wrapper that begins a genuine phone must retain exact telephone interval custody'
);

const overflowAmbiguousContinuation = `Phone ${overflowIdentifierLabelChain}record id: 09012345678 2026`;
assert.equal(
  redactContactData(overflowAmbiguousContinuation),
  `Phone ${overflowIdentifierLabelChain}record id: [contact omitted]`,
  'a bare numeric continuation must remain inside conservative bounded-context redaction'
);

for (const trailingDotUrlPhoneLabelIdentifier of [
  'example.test./path/phone GUID: 09012345678',
  '192.0.2.1./path/mobile record id: +81 3 6216 5111'
]) {
  assert.equal(
    redactContactData(trailingDotUrlPhoneLabelIdentifier),
    trailingDotUrlPhoneLabelIdentifier,
    'a phone-label word inside a trailing-dot bare host token must not override an identifier label'
  );
}

for (const [trailingDotUrlIdentifierLabelPhone, expected] of [
  [
    'example.test./path/id: 09012345678',
    'example.test./path/id: [contact omitted]'
  ],
  [
    '192.0.2.1./path/reference: +81 3 6216 5111',
    '192.0.2.1./path/reference: [contact omitted]'
  ],
  [
    'example.test./path Phone GUID: 09012345678',
    'example.test./path Phone GUID: [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(trailingDotUrlIdentifierLabelPhone),
    expected,
    'trailing-dot host provenance must end at whitespace before narrative labels'
  );
}

for (const [labelledObservationPhone, expected] of [
  [
    'Phone: 09012345678 2026-08-17 555-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'Phone: (09012345678) 2026-08-17 555-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'Mobile number: 2125551234 2026-08-17 555-1212',
    'Mobile number: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'Phone / GUID / record id: 09012345678 2026-08-17 555-1212',
    'Phone / GUID / record id: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ５５５－１２１２',
    '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted]'
  ],
  [
    'Phone: 09012345678 2026-08-17 555-1212 90 people',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] 90 people'
  ],
  [
    'Phone: 09012345678 2026-08-17 555-1212 ext 55',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] ext [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(labelledObservationPhone),
    expected,
    'established phone-label authority must survive preserved observations'
  );
}

for (const [observationControl, expected] of [
  [
    'Phone: 09012345678 2026-08-17 10-20 people',
    'Phone: [contact omitted] 2026-08-17 10-20 people'
  ],
  [
    'Phone: 09012345678 2026-08-17 2027-09-18',
    'Phone: [contact omitted] 2026-08-17 2027-09-18'
  ],
  [
    'Phone: 09012345678 2026-08-17 3.14',
    'Phone: [contact omitted] 2026-08-17 3.14'
  ],
  [
    'Phone: 09012345678 2026-08-17 12:30',
    'Phone: [contact omitted] 2026-08-17 12:30'
  ],
  [
    'Archive 09012345678 2026-08-17 555-1212',
    'Archive [contact omitted] 2026-08-17 555-1212'
  ],
  [
    'Phone: 09012345678 2026-08-17)555-1212',
    'Phone: [contact omitted] 2026-08-17)555-1212'
  ],
  [
    'Phone: 09012345678 2026-08-17-) 555-1212',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(observationControl),
    expected,
    'phone-label custody must not steal observations or grant invalid closers authority'
  );
}

for (const [recursiveLabelCase, input, expected] of [
  [
    'two later local phones',
    'Phone: 09012345678 2026-08-17 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'three later local phones',
    'Phone: 09012345678 2026-08-17 555-1212 555-3434 555-5656',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted] [contact omitted]'
  ],
  [
    'wrapped initial phone',
    'Phone: (09012345678) 2026-08-17 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'repeated identifier-label chain',
    'Phone / GUID / record id: 09012345678 2026-08-17 555-1212 555-3434',
    'Phone / GUID / record id: [contact omitted] 2026-08-17 [contact omitted] [contact omitted]'
  ],
  [
    'fullwidth recursive locals',
    '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ ５５５－１２１２ ５５５－３４３４',
    '電話番号：[contact omitted] ２０２６－０８－１７ [contact omitted] [contact omitted]'
  ],
  [
    'second complete observation',
    'Phone: 09012345678 2026-08-17 555-1212 2027-09-18 555-3434',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] 2027-09-18 [contact omitted]'
  ],
  [
    'invalid closer suppression',
    'Phone: 09012345678 2026-08-17-) 555-1212 555-3434',
    'Phone: [contact omitted] 2026-08-17-) [contact omitted] [contact omitted]'
  ],
  [
    'extension after recursive local',
    'Phone: 09012345678 2026-08-17 555-1212 555-3434 ext 55',
    'Phone: [contact omitted] 2026-08-17 [contact omitted] [contact omitted] ext [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${recursiveLabelCase}: explicit phone-label authority must survive same-candidate recursion`
  );
}

for (const [strongObservationCase, input, expected] of [
  [
    'long unit-labelled count',
    'Phone: 09012345678 2026-08-17 12345678 people',
    'Phone: [contact omitted] 2026-08-17 12345678 people'
  ],
  [
    'unit-bearing long range',
    'Phone: 09012345678 2026-08-17 1234-5678 people',
    'Phone: [contact omitted] 2026-08-17 1234-5678 people'
  ],
  [
    'long decimal',
    'Phone: 09012345678 2026-08-17 1234.5678',
    'Phone: [contact omitted] 2026-08-17 1234.5678'
  ],
  [
    'long percentage',
    'Phone: 09012345678 2026-08-17 12345678 percent',
    'Phone: [contact omitted] 2026-08-17 12345678 percent'
  ],
  [
    'fullwidth unit-bearing range',
    '電話番号：０９０１２３４５６７８ ２０２６－０８－１７ １２３４－５６７８人',
    '電話番号：[contact omitted] ２０２６－０８－１７ １２３４－５６７８人'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${strongObservationCase}: strong observation custody must precede label-authorized scoring`
  );
}

assert.equal(
  redactContactData('Phone: 09012345678 2026-08-17 555-1212'),
  'Phone: [contact omitted] 2026-08-17 [contact omitted]',
  'a weak bare range governed by an explicit phone label must still redact'
);
assert.equal(
  redactContactData('Phone: 09012345678 2026-08-17 050-12345678'),
  'Phone: [contact omitted] 2026-08-17 [contact omitted]',
  'an intrinsically complete range-shaped phone must retain intrinsic precedence'
);
assert.equal(
  redactContactData('Archive 09012345678 2026-08-17 555-1212 555-3434'),
  'Archive [contact omitted] 2026-08-17 555-1212 555-3434',
  'same-candidate recursive label state must not be invented for an unlabelled suffix'
);

const literalTruncationSentinel = '\u0000phone-label-context-truncated\u0000 GUID: 09012345678';
assert.equal(
  redactContactData(literalTruncationSentinel),
  literalTruncationSentinel,
  'literal input must not impersonate bounded-context state'
);

const detachedWrapperCount = 8000;
const detachedWrapperPrefix = '( '.repeat(detachedWrapperCount);
const detachedWrapperSuffix = ')'.repeat(detachedWrapperCount);
const deeplyDetachedIdentifier = `ID: ${detachedWrapperPrefix}09012345678${detachedWrapperSuffix}`;
assert.equal(
  redactContactData(deeplyDetachedIdentifier),
  deeplyDetachedIdentifier,
  'detached wrapper traversal must remain linear and preserve identifier authority'
);

const slashIdentifierLabelChain = 'GUID/'.repeat(1000);
assert.equal(
  redactContactData(`Phone/${slashIdentifierLabelChain}record id: 09012345678`),
  `Phone/${slashIdentifierLabelChain}record id: [contact omitted]`,
  'unspaced identifier-label chains must retain telephone authority without rescanning one token'
);
assert.equal(
  redactContactData(`Archive/${slashIdentifierLabelChain}record id: 09012345678`),
  `Archive/${slashIdentifierLabelChain}record id: 09012345678`,
  'unspaced identifier-label chains must not invent telephone authority'
);
assert.equal(
  redactContactData(`https://example.test/${slashIdentifierLabelChain}id: 09012345678`),
  `https://example.test/${slashIdentifierLabelChain}id: [contact omitted]`,
  'a long unspaced URL token must not lend identifier-label authority'
);

for (const [wrappedPhoneLabelThenIdentifier, preservedPrefix, leakedDigits] of [
  [
    'Phone: (record id: 03-6216-8041)',
    'Phone: (record id: ',
    '0362168041'
  ],
  [
    '電話番号：（参照番号：＋８１ ３ ６２１６ ５１１１）',
    '電話番号：（参照番号：',
    '81362165111'
  ]
]) {
  const redacted = redactContactData(wrappedPhoneLabelThenIdentifier);
  assert.ok(
    redacted.startsWith(preservedPrefix),
    'a wrapped identifier label must remain outside the telephone redaction range'
  );
  assert.match(
    redacted,
    /\[contact omitted\]/u,
    'wrappers must not suppress affirmative phone-label authority'
  );
  assert.ok(
    !redacted.normalize('NFKC').replace(/\D/gu, '').includes(leakedDigits),
    'a phone-labelled wrapped value must not survive redaction'
  );
}

for (const ambiguousContactIdentifier of [
  'contact identifier: 09012345678',
  'contact reference: +81 3 6216 5111',
  'contact identifier reference: 09012345678',
  'contact GUID record id: +81 3 6216 5111'
]) {
  assert.equal(
    redactContactData(ambiguousContactIdentifier),
    ambiguousContactIdentifier,
    'bare unpunctuated contact must remain ambiguous across an identifier-label chain'
  );
}

const longIdentifierWrapperCount = 126;
for (const longWrappedIdentifier of [
  `ID: ${'('.repeat(longIdentifierWrapperCount)}09012345678${')'.repeat(longIdentifierWrapperCount)}`,
  `ＩＤ：${'（'.repeat(longIdentifierWrapperCount)}＋８１ ３ ６２１６ ５１１１${'）'.repeat(longIdentifierWrapperCount)}`
]) {
  assert.equal(
    redactContactData(longWrappedIdentifier),
    longWrappedIdentifier,
    'accepted wrapper depth must not discard explicit identifier-label provenance'
  );
}

const longUrlWrapperPrefix = `https://example.test/${'a'.repeat(140)}/id: `;
const longUrlWrappedPhone = `${longUrlWrapperPrefix}${'('.repeat(longIdentifierWrapperCount)}09012345678${')'.repeat(longIdentifierWrapperCount)}`;
const longUrlWrappedRedaction = redactContactData(longUrlWrappedPhone);
assert.ok(
  longUrlWrappedRedaction.startsWith(longUrlWrapperPrefix),
  'long wrappers must not erase the retained URL token'
);
assert.match(
  longUrlWrappedRedaction,
  /\[contact omitted\]/u,
  'a URL-embedded identifier label must not protect a later long-wrapped phone'
);
assert.doesNotMatch(
  longUrlWrappedRedaction.normalize('NFKC'),
  /09012345678/u,
  'the long-wrapped phone after a URL token must not survive redaction'
);

for (const compactNumericIdentifier of [
  '1234567890',
  '00012345678',
  '2026081701',
  'release09012345678',
  'GUID0362168041'
]) {
  assert.equal(
    redactContactData(compactNumericIdentifier),
    compactNumericIdentifier,
    'non-domestic or attached compact numeric identifiers must remain intact'
  );
}
for (const multiGroupDomestic of [
  '01 42 68 53 00',
  '01 42 68 53',
  '０１ ４２ ６８ ５３ ００'
]) {
  assert.equal(
    redactContactData(multiGroupDomestic),
    '[contact omitted]',
    'four-or-more-group domestic telephone formats must be redacted at clean token boundaries'
  );
}
assert.equal(
  redactContactData('01 2026 08 17'),
  '01 2026 08 17',
  'a spaced numeric sequence containing a year must not be treated as a pair-grouped domestic phone'
);
for (const numericUrl of [
  'https://example.test/01/42/68/53/00',
  'www.example.test/03/6216/5111',
  'https://example.test/+44/20/7123/4567'
]) {
  assert.equal(
    redactContactData(numericUrl),
    numericUrl,
    'numeric URL paths must remain intact rather than being classified as telephone spans'
  );
}
assert.equal(
  redactContactData('https://example.test/ 01 42 68 53 00'),
  'https://example.test/ [contact omitted]',
  'URL protection must end at whitespace so a later independent phone is still redacted'
);
for (const longNumericUrl of [
  `https://example.test/${'long-segment/'.repeat(12)}01/42/68/53/00`,
  `www.example.test/${'long-segment/'.repeat(12)}03/6216/5111`,
  `https://example.test/${'long-segment/'.repeat(12)}+44/20/7123/4567`
]) {
  assert.equal(
    redactContactData(longNumericUrl),
    longNumericUrl,
    'numeric URL paths must remain intact when the scheme is more than 64 characters behind the candidate'
  );
}

for (const implicitNumericUrl of [
  'example.test/01/42/68/53/00',
  '//example.test/03/6216/5111',
  '192.0.2.1/01/42/68/53/00',
  `example.test/${'long-segment/'.repeat(12)}01/42/68/53/00`
]) {
  assert.equal(
    redactContactData(implicitNumericUrl),
    implicitNumericUrl,
    'bare-domain, scheme-relative, IP-host, and long implicit URL paths must remain intact'
  );
}
assert.equal(redactContactData('電話番号：０３６２１６８０４１'), '電話番号：[contact omitted]');
assert.equal(redactContactData('電話番号03-6216-8041'), '電話番号[contact omitted]');
assert.equal(redactContactData('携帯電話090-1234-5678'), '携帯電話[contact omitted]');
assert.equal(
  redactContactData('referenceA03-6216-8041'),
  'referenceA03-6216-8041',
  'phone-like identifiers joined to an unrelated label must remain intact'
);
assert.equal(
  redactContactData('referenceA1 03-6216-8041'),
  'referenceA1 [contact omitted]',
  'an attached identifier must not suppress a later independently bounded phone number'
);
assert.equal(
  redactContactData('GUID2026-08-17-03-6216-8041'),
  'GUID2026-08-17-03-6216-8041',
  'hyphenated identifier suffixes must not be reclassified as independently bounded phone numbers'
);
assert.equal(redactContactData('＋８１ ３ ６２１６ ５１１１'), '[contact omitted]');
assert.equal(redactContactData('Tel: + 81 3 6216 5111'), 'Tel: [contact omitted]');
assert.equal(redactContactData('＋ ８１ ３ ６２１６ ５１１１'), '[contact omitted]');
assert.equal(redactContactData('+33 1 42 68 53 00'), '[contact omitted]');
assert.equal(redactContactData('+44 (0)20 7123 4567'), '[contact omitted]');
assert.equal(redactContactData('+33 (0)1 42 68 53 00'), '[contact omitted]');
assert.equal(
  redactContactData('+44 (0)20 7123 4567 90 people'),
  '[contact omitted] 90 people',
  'an international trunk prefix must not cause the final phone group to be truncated or absorb a metric'
);
assert.equal(
  redactContactData('+33 (0)1 42 68 53 00 2026-08-17'),
  '[contact omitted] 2026-08-17',
  'a terminal 00 phone group must not become a second access prefix that absorbs a following date'
);
assert.equal(
  redactContactData('+882 13 123 456 2026'),
  '[contact omitted]',
  'a plausible maximum-length international number ending in a year-like group must remain fully redacted'
);
assert.equal(
  redactContactData('+81 3 6216 5111 90 people'),
  '[contact omitted] 90 people',
  'a trailing numeric metric must not be absorbed into the phone span'
);
assert.equal(
  redactContactData('+672 12345 12:30'),
  '[contact omitted] 12:30',
  'a short valid international span must stop before a formatted numeric observation'
);
for (const trailingObservation of [
  '123 people', '1234 impressions', '3.14', '1,234', '10-20', '12:30', '2026-08-17'
]) {
  assert.equal(
    redactContactData(`+81 3 6216 5111 ${trailingObservation}`),
    `[contact omitted] ${trailingObservation}`,
    'phone redaction must stop before an adjacent three- or four-digit observation'
  );
}
assert.equal(
  redactContactData('0081-3-6216-5111'),
  '[contact omitted]',
  'an international access prefix must be excluded from effective phone-length scoring'
);
for (const regionalAccessNumber of [
  '011 44 20 7123 4567',
  '010 44 20 7123 4567',
  '0011 44 20 7123 4567'
]) {
  assert.equal(
    redactContactData(regionalAccessNumber),
    '[contact omitted]',
    'regional international access prefixes must establish an affirmative phone span'
  );
}
assert.equal(
  redactContactData('011 672 (0) 12345 12:30'),
  '[contact omitted] 12:30',
  'a short access-prefixed phone must not be truncated when a formatted observation follows'
);
assert.equal(
  redactContactData('0011 672 (0) 12345 x123456789'),
  '[contact omitted] x[contact omitted]',
  'an access-prefixed phone and long extension must be redacted as complete spans'
);
assert.equal(
  redactContactData('+81 3 6216 5111 +81 90 1234 5678'),
  '[contact omitted] [contact omitted]',
  'adjacent international telephone numbers must be segmented independently'
);
for (const completeInternational of [
  '+86 138 0013 8000',
  '+882 13 123 456 7890',
  '+1 2 3 4 5 6 7 8',
  '+1 2 3 4 5 6 7 8 9 0 1 2 3 4 5',
  '00 882 13 123 456 7890',
  '00 44123 456 7890',
  '+44 (0)123 456 7890 123',
  '00 44 (0)123 456 7890 123',
  '+49 (0)30 / 1234-5678',
  '+1 212 555 2026'
]) {
  assert.equal(
    redactContactData(completeInternational),
    '[contact omitted]',
    'complete international spans must not be truncated to a shorter target length'
  );
}
assert.equal(
  redactContactData('電話番号03-6216-8041内線1234'),
  '電話番号[contact omitted]内線[contact omitted]',
  'compact Japanese phone and extension digits must both be redacted'
);
assert.equal(
  redactContactData('Tel:+86 138 0013 8000x123'),
  'Tel:[contact omitted]x[contact omitted]',
  'an attached extension marker must not suppress the final phone group or expose extension digits'
);
assert.equal(
  redactContactData('Tel:+86 138 0013 8000x123456789'),
  'Tel:[contact omitted]x[contact omitted]',
  'a long extension must be redacted as one complete span rather than leaking its final digits'
);
assert.equal(
  redactContactData('電話番号03-6216-8041内線１２３－４５６'),
  '電話番号[contact omitted]内線[contact omitted]',
  'a fullwidth grouped extension must be redacted as one complete span'
);
assert.equal(
  redactContactData('Tel:+1 212 555 2026 #1234'),
  'Tel:[contact omitted] #[contact omitted]',
  'a hash-marked extension must be redacted even without an extension word'
);
assert.equal(
  redactContactData('Tel: +882 13 123 456 2026 #1234'),
  'Tel: [contact omitted] #[contact omitted]',
  'an extension marker must disambiguate a year-like final phone group as part of the contact span'
);
assert.equal(
  redactContactData('+86 138 0013 8000担当'),
  '[contact omitted]担当',
  'Japanese narrative text attached after a number must not force truncation of the phone span'
);

assert.equal(
  redactContactData('+672 1234 90 people'),
  '[contact omitted] 90 people',
  'seven-digit international numbers must stop before a unit-labelled observation'
);
assert.equal(
  redactContactData('+672 1234 12:30'),
  '[contact omitted] 12:30',
  'seven-digit international numbers must stop before a formatted observation'
);
assert.equal(
  redactContactData('+672 1234 2026-08-17'),
  '[contact omitted] 2026-08-17',
  'seven-digit international numbers must stop before an adjacent date'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234 5678'),
  'Tel: [contact omitted] ext [contact omitted]',
  'whitespace-grouped extension digits must be redacted as one marked extension'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext. (1234 5678)'),
  'Tel: [contact omitted] ext. ([contact omitted])',
  'parenthesized grouped extension digits must be fully redacted'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567. Ext. 1234'),
  'Tel: [contact omitted]. Ext. [contact omitted]',
  'an explicit extension marker must retain authority across an ASCII sentence dot'
);
assert.equal(
  redactContactData('電話番号03-6216-8041．内線１２３４'),
  '電話番号[contact omitted]．内線[contact omitted]',
  'a Japanese extension marker must retain authority across a fullwidth sentence dot'
);
assert.equal(
  redactContactData('電話番号03-6216-8041。内線１２３４'),
  '電話番号[contact omitted]。内線[contact omitted]',
  'a Japanese extension marker must retain authority across an ideographic full stop'
);
assert.equal(
  redactContactData('電話番号03-6216-8041内線（１２３４ ５６７８）'),
  '電話番号[contact omitted]内線（[contact omitted]）',
  'fullwidth-parenthesized grouped extension digits must be fully redacted'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234 5678 90 people'),
  'Tel: [contact omitted] ext [contact omitted] 90 people',
  'marked extension redaction must stop before a following unit-labelled observation'
);
for (const attachedInternationalIdentifier of [
  'referenceA+81 3 6216 5111',
  'referenceA+1 212 555 1234',
  'revisionA0081-3-6216-5111'
]) {
  assert.equal(
    redactContactData(attachedInternationalIdentifier),
    attachedInternationalIdentifier,
    'international-looking identifiers attached to unrelated labels must remain intact'
  );
}

assert.equal(
  redactContactData('Contact +672 1234. 2026 results improved.'),
  'Contact [contact omitted]. 2026 results improved.',
  'a sentence-separated year after a seven-digit international phone must remain intact'
);
assert.equal(
  redactContactData('Contact +81 3 6216 5111. 90 attendees joined.'),
  'Contact [contact omitted]. 90 attendees joined.',
  'sentence-separated numeric prose after a phone must remain intact regardless of its noun'
);
assert.equal(
  redactContactData('Contact +81 3 6216 5111. (90) attendees joined.'),
  'Contact [contact omitted]. (90) attendees joined.',
  'parenthesized sentence-separated numeric prose after a phone must remain intact'
);
assert.equal(
  redactContactData('Contact +81 3 6216 5111. -42 attendees joined.'),
  'Contact [contact omitted]. -42 attendees joined.',
  'signed sentence-separated numeric prose after a phone must remain intact'
);
assert.equal(
  redactContactData('Contact +81 3 6216 5111. (+42) attendees joined.'),
  'Contact [contact omitted]. (+42) attendees joined.',
  'parenthesized signed numeric prose after a phone must remain intact'
);

for (const acceptedDashSign of ['‐', '‑', '‒']) {
  assert.equal(
    redactContactData(`Contact +81 3 6216 5111. ${acceptedDashSign}４２ attendees joined.`),
    `Contact [contact omitted]. ${acceptedDashSign}４２ attendees joined.`,
    'every dash accepted by the scanner must also be accepted as a numeric-tail sign'
  );
  assert.equal(
    redactContactData(`Tel: +44 20 7123 4567 ext 1234. (${acceptedDashSign}４２) attendees joined.`),
    `Tel: [contact omitted] ext [contact omitted]. (${acceptedDashSign}４２) attendees joined.`,
    'parenthesized numeric prose must preserve every dash accepted by the extension scanner'
  );
}

assert.equal(
  redactContactData('Tel: +44 20 7123. 4567 office hours apply.'),
  'Tel: [contact omitted] office hours apply.',
  'narrative text after a four-digit dotted phone group must not expose that group'
);
assert.equal(
  redactContactData('Tel: +49 30 1234. 567 office hours apply.'),
  'Tel: [contact omitted] office hours apply.',
  'narrative text after a three-digit dotted phone group must not expose that group'
);
assert.equal(
  redactContactData('Tel: +33 1 42 68 53. 00 office hours apply.'),
  'Tel: [contact omitted] office hours apply.',
  'narrative text after a two-digit pair-group phone ending must not expose that group'
);
assert.equal(
  redactContactData('Tel: +33 1 42 68 53. 00'),
  'Tel: [contact omitted]',
  'a two-digit dotted pair-group ending must remain in the phone span'
);
assert.equal(
  redactContactData('Contact +33 1 42 68 53. 00 people attended.'),
  'Contact [contact omitted]. 00 people attended.',
  'strong unit-labelled evidence must override a two-digit dotted pair-group tie-break'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. 5678 is the extension.'),
  'Tel: [contact omitted] ext [contact omitted] is the extension.',
  'narrative text after a dotted extension group must not expose that group'
);
assert.equal(
  redactContactData('Contact +44 20 7123. 4567 people attended.'),
  'Contact [contact omitted]. 4567 people attended.',
  'strong unit-labelled observation evidence must override the dotted-contact tie-break'
);
assert.equal(
  redactContactData('Tel: +44 20 7123. 4567'),
  'Tel: [contact omitted]',
  'a dotted international phone group without narrative continuation must remain in the phone span'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234 5678. 2026 results improved.'),
  'Tel: [contact omitted] ext [contact omitted]. 2026 results improved.',
  'a sentence-separated year after a grouped extension must remain intact'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. 42 attendees joined.'),
  'Tel: [contact omitted] ext [contact omitted]. 42 attendees joined.',
  'sentence-separated numeric prose after an extension must remain intact regardless of its noun'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. (42) attendees joined.'),
  'Tel: [contact omitted] ext [contact omitted]. (42) attendees joined.',
  'parenthesized sentence-separated numeric prose after an extension must remain intact'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. −42 attendees joined.'),
  'Tel: [contact omitted] ext [contact omitted]. −42 attendees joined.',
  'Unicode-signed numeric prose after an extension must remain intact'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. （－４２） attendees joined.'),
  'Tel: [contact omitted] ext [contact omitted]. （－４２） attendees joined.',
  'fullwidth parenthesized signed numeric prose after an extension must remain intact'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. 5678'),
  'Tel: [contact omitted] ext [contact omitted]',
  'a dotted grouped extension without narrative continuation must remain in the extension span'
);
assert.equal(
  redactContactData('Contact +672 1234. (2026) results improved.'),
  'Contact [contact omitted]. (2026) results improved.',
  'a parenthesized sentence-separated year after a short phone must remain intact'
);
assert.equal(
  redactContactData('Contact +672 1234. （2026） results improved.'),
  'Contact [contact omitted]. （2026） results improved.',
  'a fullwidth-parenthesized sentence-separated year must remain intact'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234 5678. (2026) results improved.'),
  'Tel: [contact omitted] ext [contact omitted]. (2026) results improved.',
  'a parenthesized sentence-separated year after a grouped extension must remain intact'
);
assert.equal(
  redactContactData('Contact +672 1234 (2026) results improved.'),
  'Contact [contact omitted] results improved.',
  'without a narrative boundary, a year-like terminal group remains part of the contact span'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 1234. (2026) results improved.'),
  'Tel: [contact omitted] ext [contact omitted]. (2026) results improved.',
  'a single-group extension must preserve a sentence-separated parenthesized year'
);
for (const [input, expected] of [
  [
    'referenceA+81 3 6216 5111 (03) 6216 5111',
    'referenceA+81 3 6216 5111 [contact omitted]'
  ],
  [
    'referenceA+81 3 6216 5111 03-6216-8041',
    'referenceA+81 3 6216 5111 [contact omitted]'
  ],
  [
    'referenceB+81 3 0037 0053 (03) 0071 0089',
    'referenceB+81 3 0037 0053 [contact omitted]'
  ],
  [
    'referenceC+81 3 0074 0106 03-0142-0178',
    'referenceC+81 3 0074 0106 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an attached international-looking identifier must remain intact while a later phone is redacted'
  );
}
assert.equal(
  redactContactData('+81 3 6216 5111 03-6216-8041'),
  '[contact omitted] [contact omitted]',
  'an affirmative phone shortcut must rescan and redact a later domestic phone'
);
assert.equal(
  redactContactData('+81 3 6216 5111 03-6216-8041 090-1234-5678'),
  '[contact omitted] [contact omitted] [contact omitted]',
  'recursive suffix classification must redact every independently affirmative phone'
);
for (const completeYearEndingPhone of [
  '+86 138 0013 2026',
  '+358 100 0000 2000',
  '+62 812 34 5678 2026',
  '+81 3 6216 5111 2026'
]) {
  assert.equal(
    redactContactData(completeYearEndingPhone),
    '[contact omitted]',
    'a plausible complete phone ending in a year-like group must remain fully redacted'
  );
}

const numericMetricRss = value => `<?xml version="1.0"?><rss version="2.0"><channel><title>Metric revisions</title>
<item><title>Audience metric</title><link>https://example.test/releases/metric</link><guid>metric-release</guid><description>Dentsu measured ${value} people. Contact +81 3 6216 5111.</description></item>
</channel></rss>`;
const firstMetric = parseFeed(numericMetricRss('123456789'), source).items[0];
const secondMetric = parseFeed(numericMetricRss('987654321'), source).items[0];
assert.match(firstMetric.summary, /123456789 people/u);
assert.match(secondMetric.summary, /987654321 people/u);
assert.notEqual(firstMetric.content_sha256, secondMetric.content_sha256, 'numeric metric revisions must remain distinguishable');

const encoder = new TextEncoder();
function responseFromChunks(chunks, tracker = {}) {
  let index = 0;
  return {
    body: {
      getReader() {
        return {
          async read() {
            tracker.reads = (tracker.reads ?? 0) + 1;
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
          async cancel() {
            tracker.cancelled = true;
          },
          releaseLock() {
            tracker.released = true;
          }
        };
      }
    }
  };
}

const utf8Body = encoder.encode('A€B');
assert.equal(
  await readBoundedUtf8Body(responseFromChunks([utf8Body.slice(0, 2), utf8Body.slice(2)]), utf8Body.byteLength),
  'A€B',
  'incremental decoding must preserve split UTF-8 code points'
);
const boundedTracker = {};
await assert.rejects(
  readBoundedUtf8Body(responseFromChunks([
    encoder.encode('1234'), encoder.encode('5678'), encoder.encode('must-not-be-read')
  ], boundedTracker), 6),
  /body exceeds 6 bytes/u
);
assert.equal(boundedTracker.reads, 2, 'the reader must stop immediately after the limit-crossing chunk');
assert.equal(boundedTracker.cancelled, true, 'the oversized response stream must be cancelled');
assert.equal(boundedTracker.released, true, 'the response reader lock must be released');

assert.equal(cleanText('<p>Hello&nbsp;world</p>'), 'Hello world');
assert.throws(() => validateRegistry({
  schema_version: 1,
  sources: [{ ...source, feed_url: 'http://example.test/news.xml' }]
}), /must use https/u);
assert.throws(() => validateRegistry({ schema_version: 1, sources: [source, source] }), /duplicate source id/u);

const repoRoot = path.resolve(import.meta.dirname, '..');
const actualRegistry = validateRegistry(readJson(path.join(repoRoot, 'data/exhaust/sources.json'), null));
assert.deepEqual(actualRegistry.sources.map(item => item.id), [
  'dentsu_inc_en_news', 'dentsu_inc_jp_news',
  'dentsu_group_en_releases', 'dentsu_group_jp_releases',
  'dentsu_group_en_ir', 'dentsu_group_jp_ir'
]);
for (const item of actualRegistry.sources) {
  assert.equal(item.source_class, 'first_party_corporate_publication');
  assert.equal(item.graph_effect, 'none');
}
validateWatchTerms(readJson(path.join(repoRoot, 'data/exhaust/watch-terms.json'), null));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'industrial-exhaust-'));
const receiptOne = writeFeedReceipt({
  rootDir: tempRoot, source, parsedFeed: parsed, xml: rss, capturedAt: '2026-07-14T09:00:00.000Z',
  responseHeaders: { content_type: 'application/rss+xml', etag: '"one"' }
});
const receiptTwo = writeFeedReceipt({
  rootDir: tempRoot, source, parsedFeed: parsed, xml: rss, capturedAt: '2026-07-15T09:00:00.000Z',
  responseHeaders: { content_type: 'application/rss+xml', etag: '"two"' }
});
assert.equal(receiptOne, receiptTwo, 'same immutable feed body must resolve to one receipt');
const receipt = JSON.parse(fs.readFileSync(path.join(tempRoot, receiptOne), 'utf8'));
assert.equal(receipt.body, rss);
assert.equal(receipt.feed_sha256, parsed.feed_sha256);
assert.equal(receipt.graph_effect, 'none');
assert.equal(receipt.canonical_mutation_authorized, false);
fs.rmSync(tempRoot, { recursive: true, force: true });


for (const [input, expected] of [
  ['Call 03-6216-5111', 'Call [contact omitted]'],
  ['Call 09012345678', 'Call [contact omitted]'],
  ['Phone: 03 6216 5111 or 090-1234-5678', 'Phone: [contact omitted] or [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'phone eligibility must be evaluated at the actual first phone marker rather than leading matched whitespace'
  );
}
assert.equal(
  redactContactData('release09012345678'),
  'release09012345678',
  'a compact phone-shaped identifier attached to prose must remain intact'
);
assert.equal(
  redactContactData('Contact +33 1 42 68 53. (00) attendees joined.'),
  'Contact [contact omitted]. (00) attendees joined.',
  'parenthesized narrative evidence must override dotted pair-group continuation'
);
assert.equal(
  redactContactData('Contact +33 1 42 68 53．（００） attendees joined.'),
  'Contact [contact omitted]．（００） attendees joined.',
  'fullwidth parenthesized narrative evidence must override dotted pair-group continuation'
);
assert.equal(
  redactContactData('Tel: +44 20 7123 4567 ext 12 34 56 78. (00) attendees joined.'),
  'Tel: [contact omitted] ext [contact omitted]. (00) attendees joined.',
  'parenthesized narrative evidence must remain outside a dotted pair-group extension'
);
assert.equal(
  redactContactData('Contact +33 1 42 68 53. (00)'),
  'Contact [contact omitted]',
  'a parenthesized two-digit tail without narrative continuation may remain contact formatting'
);


assert.equal(
  redactContactData('Phone (+81 3 6216 5111)'),
  'Phone ([contact omitted])',
  'plus-prefixed phones inside narrative parentheses must retain balanced ASCII wrappers'
);
assert.equal(
  redactContactData('電話（＋８１ ３ ６２１６ ５１１１）'),
  '電話（[contact omitted]）',
  'plus-prefixed phones inside narrative parentheses must retain balanced fullwidth wrappers'
);
assert.equal(
  redactContactData('Phone (+44 (0)20 7123 4567)'),
  'Phone ([contact omitted])',
  'an outer narrative wrapper must remain balanced around a phone with an internal trunk wrapper'
);


for (const [input, expected] of [
  ['Phone +81 3 6216 5111)', 'Phone [contact omitted]'],
  ['電話＋８１ ３ ６２１６ ５１１１）', '電話[contact omitted]'],
  ['Phone +81) 3 6216 (5111)', 'Phone [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an unmatched phone-format closer without an adjacent narrative opener must not be restored'
  );
}

for (const observation of ['90 people', '2026-08-17', '12:30', '3.14']) {
  assert.equal(
    redactContactData(`Phone (+81 3 6216 5111) ${observation}`),
    `Phone ([contact omitted]) ${observation}`,
    'an owned narrative close must be preserved before a numeric observation'
  );
}

assert.equal(
  redactContactData('電話（＋８１ ３ ６２１６ ５１１１） ９０ people'),
  '電話（[contact omitted]） ９０ people',
  'fullwidth narrative wrappers must remain balanced before a numeric observation'
);
assert.equal(
  redactContactData('Phone ( +81 3 6216 5111 )'),
  'Phone ( [contact omitted] )',
  'whitespace between a narrative opener and the plus marker must be preserved'
);
assert.equal(
  redactContactData('Phone ((+81 3 6216 5111))'),
  'Phone (([contact omitted]))',
  'nested narrative wrappers must remain balanced'
);
assert.equal(
  redactContactData('Phone (+44 (0)20 7123 4567) 90 people'),
  'Phone ([contact omitted]) 90 people',
  'an owned wrapper must remain balanced around internal trunk notation and a trailing observation'
);
assert.equal(
  redactContactData('Phone (+81 3 6216 5111). Ext. 1234'),
  'Phone ([contact omitted]). Ext. [contact omitted]',
  'marked extensions after a balanced wrapper must still be redacted'
);
assert.equal(
  redactContactData('Phone (+81 3 6216 5111) or 090-1234-5678'),
  'Phone ([contact omitted]) or [contact omitted]',
  'a later independently bounded phone must still be redacted after wrapper preservation'
);
assert.equal(
  redactContactData('referenceA+81 3 6216 5111)'),
  'referenceA+81 3 6216 5111)',
  'an unchanged attached identifier must retain its original punctuation without synthetic restoration'
);


for (const [input, expected] of [
  ['Phone (+81 3 6216 5111))', 'Phone ([contact omitted])'],
  ['電話（＋８１ ３ ６２１６ ５１１１））', '電話（[contact omitted]）'],
  ['Phone ((+81 3 6216 5111)))', 'Phone (([contact omitted]))'],
  ['Phone (((+44 (0)20 7123 4567))))', 'Phone ((([contact omitted])))']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'surplus terminal wrapper closers must be removed after preserving every adjacent owned wrapper'
  );
}

for (const [input, expected] of [
  ['Context (Phone (+81 3 6216 5111))', 'Context (Phone ([contact omitted]))'],
  ['Context (Phone (+81 3 6216 5111)))', 'Context (Phone ([contact omitted]))'],
  ['Phone (+81 3 6216 5111)) 90 people', 'Phone ([contact omitted]) 90 people'],
  [
    'Context (Phone (+81 3 6216 5111)) 90 people',
    'Context (Phone ([contact omitted])) 90 people'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'outer context closers and numeric observations must survive surplus-wrapper cleanup'
  );
}



for (const [input, expected] of [
  [
    'Context (Phone: +81 3 6216 5111)',
    'Context (Phone: [contact omitted])'
  ],
  [
    'Context (Phone: +81 3 6216 5111))',
    'Context (Phone: [contact omitted])'
  ],
  [
    'Context ((Phone: +81 3 6216 5111)))',
    'Context ((Phone: [contact omitted]))'
  ],
  [
    '文脈（電話：＋８１ ３ ６２１６ ５１１１）',
    '文脈（電話：[contact omitted]）'
  ],
  [
    '文脈（電話：＋８１ ３ ６２１６ ５１１１））',
    '文脈（電話：[contact omitted]）'
  ],
  [
    'Context (Phone: +44 (0)20 7123 4567))',
    'Context (Phone: [contact omitted])'
  ],
  [
    'Context (Phone: (+81 3 6216 5111)))',
    'Context (Phone: ([contact omitted]))'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'non-adjacent narrative openers must retain only their owned terminal closers'
  );
}

for (const [input, expected] of [
  [
    'Context (Phone: +81 3 6216 5111)) 90 people',
    'Context (Phone: [contact omitted]) 90 people'
  ],
  [
    'Context (Phone: +81 3 6216 5111)). Ext. 1234',
    'Context (Phone: [contact omitted]). Ext. [contact omitted]'
  ],
  [
    'Context (Phone: +81 3 6216 5111)) or 090-1234-5678',
    'Context (Phone: [contact omitted]) or [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'non-adjacent wrapper cleanup must preserve independently classified suffix evidence'
  );
}

assert.equal(
  redactContactData('Phone: +81 3 6216 5111))'),
  'Phone: [contact omitted]',
  'ownerless terminal closers must still be discarded'
);
assert.equal(
  redactContactData('Context (referenceA+81 3 6216 5111))'),
  'Context (referenceA+81 3 6216 5111))',
  'outer context must not weaken attached-identifier protection'
);



for (const [input, expected] of [
  [
    'Broken ( sentence. Phone: +81 3 6216 5111)',
    'Broken ( sentence. Phone: [contact omitted]'
  ],
  [
    'Broken ( sentence. +81 3 6216 5111)',
    'Broken ( sentence. [contact omitted]'
  ],
  [
    'Broken ( paragraph\n\nPhone: +81 3 6216 5111)',
    'Broken ( paragraph\n\nPhone: [contact omitted]'
  ],
  [
    'Broken ( paragraph\r\n \r\nPhone: +81 3 6216 5111)',
    'Broken ( paragraph\r\n \r\nPhone: [contact omitted]'
  ],
  [
    '壊れた（文。 電話：＋８１ ３ ６２１６ ５１１１）',
    '壊れた（文。 電話：[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'wrapper ownership must not cross narrative context boundaries'
  );
}

for (const [input, expected] of [
  [
    'Context (Tel. +81 3 6216 5111)',
    'Context (Tel. [contact omitted])'
  ],
  [
    'Context (Phone No. +81 3 6216 5111)',
    'Context (Phone No. [contact omitted])'
  ],
  [
    'Context (Phone: +81 3 6216 5111)',
    'Context (Phone: [contact omitted])'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'current-context label punctuation must not sever legitimate outer ownership'
  );
}



for (const [input, expected] of [
  [
    '壊れた（文。電話：＋８１ ３ ６２１６ ５１１１）',
    '壊れた（文。電話：[contact omitted]'
  ],
  [
    '壊れた（文！電話：＋８１ ３ ６２１６ ５１１１）',
    '壊れた（文！電話：[contact omitted]'
  ],
  [
    '壊れた（文？電話：＋８１ ３ ６２１６ ５１１１）',
    '壊れた（文？電話：[contact omitted]'
  ],
  [
    'Broken (What?Phone: +81 3 6216 5111)',
    'Broken (What?Phone: [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unspaced sentence terminators must reset wrapper ownership'
  );
}

for (const labelWord of ['contact', 'phone', 'fax', 'mobile']) {
  assert.equal(
    redactContactData(`Broken (Use another ${labelWord}. Phone: +81 3 6216 5111)`),
    `Broken (Use another ${labelWord}. Phone: [contact omitted]`,
    'ordinary label words at sentence end must not suppress a real boundary'
  );
}

for (const abbreviation of ['U.S.', 'U.K.', 'a.m.', 'p.m.', 'Ph.D.', 'e.g.']) {
  assert.equal(
    redactContactData(`Context (${abbreviation} Phone: +81 3 6216 5111)`),
    `Context (${abbreviation} Phone: [contact omitted])`,
    'common multi-period abbreviations must remain in the current wrapper context'
  );
}

for (const label of ['Tel.', 'Telephone.', 'Phone.', 'Mobile.', 'Cell.', 'Fax.', 'Contact.']) {
  assert.equal(
    redactContactData(`Context (${label} +81 3 6216 5111)`),
    `Context (${label} [contact omitted])`,
    'an immediately adjacent label period must remain part of the current context'
  );
}


for (const labelWord of ['contact', 'phone', 'fax', 'mobile']) {
  assert.equal(
    redactContactData(`Broken (Use another ${labelWord}. +81 3 6216 5111)`),
    `Broken (Use another ${labelWord}. [contact omitted]`,
    'a phone-label suffix inside ordinary prose must not bridge a sentence boundary'
  );
  assert.equal(
    redactContactData(`Broken（Use another ${labelWord}． ＋８１ ３ ６２１６ ５１１１）`),
    `Broken（Use another ${labelWord}． [contact omitted]`,
    'fullwidth sentence punctuation must not turn a prose suffix into a local telephone label'
  );
}

for (const [domain, fullwidthDomain] of [
  ['example.com', 'example．com'],
  ['foo.bar', 'foo．bar'],
  ['a.co', 'a．co']
]) {
  assert.equal(
    redactContactData(`Broken (Visit ${domain}. Phone: +81 3 6216 5111)`),
    `Broken (Visit ${domain}. Phone: [contact omitted]`,
    'a dotted domain must not be treated as a narrative abbreviation'
  );
  assert.equal(
    redactContactData(`Broken（Visit ${fullwidthDomain}． Phone: ＋８１ ３ ６２１６ ５１１１）`),
    `Broken（Visit ${fullwidthDomain}． Phone: [contact omitted]`,
    'a fullwidth dotted domain must not bridge a genuine sentence boundary'
  );
}

for (const abbreviation of ['Dr.', 'Mr.', 'Prof.', 'Inc.', 'U.S.', 'U.K.', 'a.m.', 'p.m.', 'Ph.D.', 'e.g.']) {
  assert.equal(
    redactContactData(`Context (${abbreviation} Phone: +81 3 6216 5111)`),
    `Context (${abbreviation} Phone: [contact omitted])`,
    'leading wrapper punctuation must not hide a genuine narrative abbreviation'
  );
}

for (const label of ['Tel.', 'Telephone.', 'Phone.', 'Mobile.', 'Cell.', 'Fax.', 'Contact.', 'Phone No.']) {
  assert.equal(
    redactContactData(`Context (${label} +81 3 6216 5111)`),
    `Context (${label} [contact omitted])`,
    'an exact local telephone label may retain its current wrapper context'
  );
}

for (const [input, expected] of [
  [
    'Context（Dr． Phone: ＋８１ ３ ６２１６ ５１１１）',
    'Context（Dr． Phone: [contact omitted]）'
  ],
  [
    'Context（Ｕ．Ｓ． Phone: ＋８１ ３ ６２１６ ５１１１）',
    'Context（Ｕ．Ｓ． Phone: [contact omitted]）'
  ],
  [
    'Context（Phone． ＋８１ ３ ６２１６ ５１１１）',
    'Context（Phone． [contact omitted]）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'fullwidth wrapper and period forms must preserve only genuine abbreviations or isolated labels'
  );
}

assert.equal(
  redactContactData('Context (\nPhone. +81 3 6216 5111)'),
  'Context (\nPhone. [contact omitted])',
  'a telephone label after a structural line break may retain the current wrapper context'
);

for (const [input, expected] of [
  [
    'Context (Tel. No. +81 3 6216 5111)',
    'Context (Tel. No. [contact omitted])'
  ],
  [
    'Context (Phone. No. +81 3 6216 5111)',
    'Context (Phone. No. [contact omitted])'
  ],
  [
    'Context（Tel． No． ＋８１ ３ ６２１６ ５１１１）',
    'Context（Tel． No． [contact omitted]）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'periods inside an isolated compound telephone label must retain current wrapper ownership'
  );
}

for (const [input, expected] of [
  [
    'Broken (He moved to the U.S. Phone: +81 3 6216 5111)',
    'Broken (He moved to the U.S. Phone: [contact omitted]'
  ],
  [
    'Broken (I said no. Phone: +81 3 6216 5111)',
    'Broken (I said no. Phone: [contact omitted]'
  ],
  [
    'Broken (He said “stop.” Phone: +81 3 6216 5111)',
    'Broken (He said “stop.” Phone: [contact omitted]'
  ],
  [
    'Broken（He said 「stop．」Phone: ＋８１ ３ ６２１６ ５１１１）',
    'Broken（He said 「stop．」Phone: [contact omitted]'
  ],
  [
    'Broken (Visit a.b. Phone: +81 3 6216 5111)',
    'Broken (Visit a.b. Phone: [contact omitted]'
  ],
  [
    'Broken（Visit a．b． Phone: ＋８１ ３ ６２１６ ５１１１）',
    'Broken（Visit a．b． Phone: [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'sentence-final abbreviations, quoted periods, and domain-context dotted tokens must reset wrapper ownership'
  );
}

for (const [input, expected] of [
  [
    'Context (U.S. Phone: +81 3 6216 5111)',
    'Context (U.S. Phone: [contact omitted])'
  ],
  [
    'Context (Dr. Smith Phone: +81 3 6216 5111)',
    'Context (Dr. Smith Phone: [contact omitted])'
  ],
  [
    'Context (Acme Inc. Phone: +81 3 6216 5111)',
    'Context (Acme Inc. Phone: [contact omitted])'
  ],
  [
    'Context (Ph.D. Phone: +81 3 6216 5111)',
    'Context (Ph.D. Phone: [contact omitted])'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'genuine continuing abbreviations must retain current wrapper ownership'
  );
}


for (const [input, expected] of [
  ['Broken (He moved to the U.S. +81 3 6216 5111)', 'Broken (He moved to the U.S. [contact omitted]'],
  ['Broken (I said no. +81 3 6216 5111)', 'Broken (I said no. [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． ＋８１ ３ ６２１６ ５１１１）', 'Broken（He moved to the Ｕ．Ｓ． [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a sentence-final abbreviation must reset wrapper ownership before an unlabeled phone'
  );
}

assert.equal(
  redactContactData('Context (U.S. +81 3 6216 5111)'),
  'Context (U.S. [contact omitted])',
  'an abbreviation at the current structural start must remain inside its legitimate wrapper'
);

for (const [input, expected] of [
  ['Broken (URL: a.b. Phone: +81 3 6216 5111)', 'Broken (URL: a.b. Phone: [contact omitted]'],
  ['Broken (domain=a.b. Phone: +81 3 6216 5111)', 'Broken (domain=a.b. Phone: [contact omitted]'],
  ['Broken（URL： a．b． Phone: ＋８１ ３ ６２１６ ５１１１）', 'Broken（URL： a．b． Phone: [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'punctuated explicit domain markers must keep dotted tokens out of abbreviation treatment'
  );
}

for (const [input, expected] of [
  ['壊れた（彼は「止まれ．」電話：＋８１ ３ ６２１６ ５１１１）', '壊れた（彼は「止まれ．」電話：[contact omitted]'],
  ['壊れた（彼は「止まれ．」携帯電話：＋８１ ９０ １２３４ ５６７８）', '壊れた（彼は「止まれ．」携帯電話：[contact omitted]'],
  ['壊れた（彼は「止まれ．」連絡先：＋８１ ３ ６２１６ ５１１１）', '壊れた（彼は「止まれ．」連絡先：[contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a quoted Japanese sentence-final period must reset ownership before a Japanese phone label'
  );
}


for (const [input, expected] of [
  [
    'Broken (He moved to the U.S.+81 3 6216 5111)',
    'Broken (He moved to the U.S.[contact omitted]'
  ],
  [
    'Broken (I said no.+81 3 6216 5111)',
    'Broken (I said no.[contact omitted]'
  ],
  [
    'Broken (Ask Dr.+81 3 6216 5111)',
    'Broken (Ask Dr.[contact omitted]'
  ],
  [
    'Broken（He moved to the Ｕ．Ｓ．＋８１ ３ ６２１６ ５１１１）',
    'Broken（He moved to the Ｕ．Ｓ．[contact omitted]'
  ],
  [
    '壊れた（彼は「止まれ．」＋８１ ３ ６２１６ ５１１１）',
    '壊れた（彼は「止まれ．」[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a period touching an unlabeled phone must still reset ownership when it ends the preceding sentence'
  );
}

for (const [input, expected] of [
  [
    'Context (U.S.+81 3 6216 5111)',
    'Context (U.S.[contact omitted])'
  ],
  [
    'Context (Phone No.+81 3 6216 5111)',
    'Context (Phone No.[contact omitted])'
  ],
  [
    'Context (Tel. No.+81 3 6216 5111)',
    'Context (Tel. No.[contact omitted])'
  ],
  [
    'Context（Ｕ．Ｓ．＋８１ ３ ６２１６ ５１１１）',
    'Context（Ｕ．Ｓ．[contact omitted]）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an abbreviation or isolated compound label at the current structural start must retain its owned closer'
  );
}


for (const [input, expected] of [
  ['Broken (He moved to the U.S. Then call +81 3 6216 5111)', 'Broken (He moved to the U.S. Then call [contact omitted]'],
  ['Broken (I said no. Please call +81 3 6216 5111)', 'Broken (I said no. Please call [contact omitted]'],
  ['Broken (At 9 a.m. However contact +81 3 6216 5111)', 'Broken (At 9 a.m. However contact [contact omitted]'],
  ['Broken (He moved to the U.S. I called +81 3 6216 5111)', 'Broken (He moved to the U.S. I called [contact omitted]'],
  ['Broken (He moved to the U.S. I CALLED +81 3 6216 5111)', 'Broken (He moved to the U.S. I CALLED [contact omitted]'],
  ["Broken (He moved to the U.S. I'm calling +81 3 6216 5111)", "Broken (He moved to the U.S. I'm calling [contact omitted]"],
  ['Broken (He moved to the U.S. I’ve called +81 3 6216 5111)', 'Broken (He moved to the U.S. I’ve called [contact omitted]'],
  ['Broken (He moved to the U.S. We called +81 3 6216 5111)', 'Broken (He moved to the U.S. We called [contact omitted]'],
  ['Broken (He moved to the U.S. We are calling +81 3 6216 5111)', 'Broken (He moved to the U.S. We are calling [contact omitted]'],
  ["Broken (He moved to the U.S. We've called +81 3 6216 5111)", "Broken (He moved to the U.S. We've called [contact omitted]"],
  ['Broken (He moved to the U.S. WE ARE CALLING +81 3 6216 5111)', 'Broken (He moved to the U.S. WE ARE CALLING [contact omitted]'],
  ['Broken (He moved to the U.S. He called +81 3 6216 5111)', 'Broken (He moved to the U.S. He called [contact omitted]'],
  ['Broken (He moved to the U.S. They will call +81 3 6216 5111)', 'Broken (He moved to the U.S. They will call [contact omitted]'],
  ['Broken (He moved to the U.S. This works at +81 3 6216 5111)', 'Broken (He moved to the U.S. This works at [contact omitted]'],
  ['Broken (He moved to the U.S. Those are available at +81 3 6216 5111)', 'Broken (He moved to the U.S. Those are available at [contact omitted]'],
  ['Broken (He moved to the U.S. IT IS AVAILABLE AT +81 3 6216 5111)', 'Broken (He moved to the U.S. IT IS AVAILABLE AT [contact omitted]'],
  ["Broken (He moved to the U.S. IT'S AVAILABLE AT +81 3 6216 5111)", "Broken (He moved to the U.S. IT'S AVAILABLE AT [contact omitted]"],
  ['Broken (He moved to the U.S. THIS COMPANY CALLED +81 3 6216 5111)', 'Broken (He moved to the U.S. THIS COMPANY CALLED [contact omitted]'],
  ['Broken (He moved to the U.S. WE CARE +81 3 6216 5111)', 'Broken (He moved to the U.S. WE CARE [contact omitted]'],
  ['Broken (He moved to the U.S. WE CALLED THE COMPANY +81 3 6216 5111)', 'Broken (He moved to the U.S. WE CALLED THE COMPANY [contact omitted]'],
  ['Broken (He moved to the U.S. THEY CONTACTED OUR FOUNDATION +81 3 6216 5111)', 'Broken (He moved to the U.S. THEY CONTACTED OUR FOUNDATION [contact omitted]'],
  ['Broken (He moved to the U.S. WE WILL CALL THE COMPANY +81 3 6216 5111)', 'Broken (He moved to the U.S. WE WILL CALL THE COMPANY [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． ＷＥ ＣＡＬＬＥＤ ＴＨＥ ＣＯＭＰＡＮＹ ＋８１ ３ ６２１６ ５１１１）', 'Broken（He moved to the Ｕ．Ｓ． ＷＥ ＣＡＬＬＥＤ ＴＨＥ ＣＯＭＰＡＮＹ [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a grammatical fresh-sentence lead after an abbreviation must reset wrapper ownership'
  );
}

for (const [input, expected] of [
  ['Context (U.S. Treasury Phone: +81 3 6216 5111)', 'Context (U.S. Treasury Phone: [contact omitted])'],
  ['Context (Acme Inc. Contact Center Phone: +81 3 6216 5111)', 'Context (Acme Inc. Contact Center Phone: [contact omitted])'],
  ['Context (Acme Inc. Call Center Phone: +81 3 6216 5111)', 'Context (Acme Inc. Call Center Phone: [contact omitted])'],
  ['Context (U.S. Open Phone: +81 3 6216 5111)', 'Context (U.S. Open Phone: [contact omitted])'],
  ['Context (U.S. I Corps Phone: +1 253 477 8777)', 'Context (U.S. I Corps Phone: [contact omitted])'],
  ['Context (U.S. I Army Phone: +1 703 695 0640)', 'Context (U.S. I Army Phone: [contact omitted])'],
  ['Context (U.S. IT Department Phone: +1 253 477 8777)', 'Context (U.S. IT Department Phone: [contact omitted])'],
  ['Context (U.S. IT Services Phone: +1 253 477 8777)', 'Context (U.S. IT Services Phone: [contact omitted])'],
  ['Context (Acme Inc. We Care Center Phone: +1 253 477 8777)', 'Context (Acme Inc. We Care Center Phone: [contact omitted])'],
  ['Context (U.S. We the People Foundation Phone: +1 253 477 8777)', 'Context (U.S. We the People Foundation Phone: [contact omitted])'],
  ['Context (U.S. She Leads Africa Phone: +1 253 477 8777)', 'Context (U.S. She Leads Africa Phone: [contact omitted])'],
  ['Context (U.S. This Is Us Foundation Phone: +1 253 477 8777)', 'Context (U.S. This Is Us Foundation Phone: [contact omitted])'],
  ['Context (U.S. Please Touch Museum Phone: +1 253 477 8777)', 'Context (U.S. Please Touch Museum Phone: [contact omitted])'],
  ['Context (Acme Inc. You & Me Foundation Phone: +1 253 477 8777)', 'Context (Acme Inc. You & Me Foundation Phone: [contact omitted])'],
  ['Context (Acme Inc. WE CARE CENTER Phone: +1 253 477 8777)', 'Context (Acme Inc. WE CARE CENTER Phone: [contact omitted])'],
  ['Context (U.S. THEY Department Phone: +1 253 477 8777)', 'Context (U.S. THEY Department Phone: [contact omitted])'],
  ['Context（Ｕ．Ｓ． ＩＴ Department Phone: ＋１ ２５３ ４７７ ８７７７）', 'Context（Ｕ．Ｓ． ＩＴ Department Phone: [contact omitted]）'],
  ['Context（Acme Inc． Ｗｅ Ｃａｒｅ Ｃｅｎｔｅｒ Phone: ＋１ ２５３ ４７７ ８７７７）', 'Context（Acme Inc． Ｗｅ Ｃａｒｅ Ｃｅｎｔｅｒ Phone: [contact omitted]）']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'named entities and institutional continuations must retain their owned closer'
  );
}


for (const [input, expected] of [
  [
    'Broken (He moved to the U.S. THIS IS THE FOUNDATION +81 3 6216 5111)',
    'Broken (He moved to the U.S. THIS IS THE FOUNDATION [contact omitted]'
  ],
  [
    'Broken (He moved to the U.S. WE SUPPORT THE FOUNDATION +81 3 6216 5111)',
    'Broken (He moved to the U.S. WE SUPPORT THE FOUNDATION [contact omitted]'
  ],
  [
    'Broken（He moved to the Ｕ．Ｓ． ＴＨＩＳ ＩＳ ＴＨＥ ＦＯＵＮＤＡＴＩＯＮ ＋８１ ３ ６２１６ ５１１１）',
    'Broken（He moved to the Ｕ．Ｓ． ＴＨＩＳ ＩＳ ＴＨＥ ＦＯＵＮＤＡＴＩＯＮ [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unlabelled all-caps pronoun clauses must outrank institutional suffixes'
  );
}

for (const [input, expected] of [
  [
    "Context (U.S. It's a Small World Foundation Phone: +1 253 477 8777)",
    "Context (U.S. It's a Small World Foundation Phone: [contact omitted])"
  ],
  [
    'Context (U.S. We Can Do It Foundation Phone: +1 253 477 8777)',
    'Context (U.S. We Can Do It Foundation Phone: [contact omitted])'
  ],
  [
    'Context (U.S. WE CAN DO IT FOUNDATION Phone: +1 253 477 8777)',
    'Context (U.S. WE CAN DO IT FOUNDATION Phone: [contact omitted])'
  ],
  [
    'Context（Ｕ．Ｓ． Ｗｅ Ｃａｎ Ｄｏ Ｉｔ Ｆｏｕｎｄａｔｉｏｎ Phone: ＋１ ２５３ ４７７ ８７７７）',
    'Context（Ｕ．Ｓ． Ｗｅ Ｃａｎ Ｄｏ Ｉｔ Ｆｏｕｎｄａｔｉｏｎ Phone: [contact omitted]）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'labelled title-cased and all-caps institutions must retain their owned closer'
  );
}


for (const [input, expected] of [
  [
    'Broken (He moved to the U.S. HE CALLS ACME COMPANY +81 3 6216 5111)',
    'Broken (He moved to the U.S. HE CALLS ACME COMPANY [contact omitted]'
  ],
  [
    'Broken (He moved to the U.S. THEY CONTACT ACME FOUNDATION +81 3 6216 5111)',
    'Broken (He moved to the U.S. THEY CONTACT ACME FOUNDATION [contact omitted]'
  ],
  [
    'Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＣＯＮＴＡＣＴ ＡＣＭＥ ＦＯＵＮＤＡＴＩＯＮ ＋８１ ３ ６２１６ ５１１１）',
    'Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＣＯＮＴＡＣＴ ＡＣＭＥ ＦＯＵＮＤＡＴＩＯＮ [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'present finite pronoun clauses must outrank institutional suffixes'
  );
}

for (const [input, expected] of [
  [
    'Context (U.S. WE CARE FOUNDATION Phone #: +1 253 477 8777)',
    'Context (U.S. WE CARE FOUNDATION Phone #: [contact omitted])'
  ],
  [
    'Context (U.S. Phone #: +1 253 477 8777)',
    'Context (U.S. Phone #: [contact omitted])'
  ],
  [
    'Context（Ｕ．Ｓ． ＷＥ ＣＡＲＥ ＦＯＵＮＤＡＴＩＯＮ Ｐｈｏｎｅ ＃： ＋１ ２５３ ４７７ ８７７７）',
    'Context（Ｕ．Ｓ． ＷＥ ＣＡＲＥ ＦＯＵＮＤＡＴＩＯＮ Ｐｈｏｎｅ ＃： [contact omitted]）'
  ],
  [
    'Context（Ｕ．Ｓ． Ｐｈｏｎｅ ＃： ＋１ ２５３ ４７７ ８７７７）',
    'Context（Ｕ．Ｓ． Ｐｈｏｎｅ ＃： [contact omitted]）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'hash-style telephone labels must provide affirmative wrapper ownership evidence'
  );
}


for (const [input, expected] of [
  ['Context (U.S. We Care Foundation - Phone: +1 253 477 8777)', 'Context (U.S. We Care Foundation - Phone: [contact omitted])'],
  ['Context (U.S. We Care Foundation — Phone: +1 253 477 8777)', 'Context (U.S. We Care Foundation — Phone: [contact omitted])'],
  ['Context (U.S. We Care Foundation | Phone #: +1 253 477 8777)', 'Context (U.S. We Care Foundation | Phone #: [contact omitted])'],
  ['Context (U.S. We Care Foundation / Contact: +1 253 477 8777)', 'Context (U.S. We Care Foundation / Contact: [contact omitted])'],
  ['Context（Ｕ．Ｓ． Ｗｅ Ｃａｒｅ Ｆｏｕｎｄａｔｉｏｎ ｜ Ｐｈｏｎｅ ＃： ＋１ ２５３ ４７７ ８７７７）', 'Context（Ｕ．Ｓ． Ｗｅ Ｃａｒｅ Ｆｏｕｎｄａｔｉｏｎ ｜ Ｐｈｏｎｅ ＃： [contact omitted]）']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'terminal phone-label delimiters must remain outside title classification'
  );
}

for (const [input, expected] of [
  ['Context (U.S. She Leads Africa +1 253 477 8777)', 'Context (U.S. She Leads Africa [contact omitted])'],
  ['Context (U.S. This Is Us +1 253 477 8777)', 'Context (U.S. This Is Us [contact omitted])'],
  ['Context（Ｕ．Ｓ． Ｓｈｅ Ｌｅａｄｓ Ａｆｒｉｃａ ＋１ ２５３ ４７７ ８７７７）', 'Context（Ｕ．Ｓ． Ｓｈｅ Ｌｅａｄｓ Ａｆｒｉｃａ [contact omitted]）'],
  ['Context (U.S. WE CARE CENTER +1 253 477 8777)', 'Context (U.S. WE CARE CENTER [contact omitted])'],
  ['Context (U.S. WE CALL CENTER +1 253 477 8777)', 'Context (U.S. WE CALL CENTER [contact omitted])'],
  ['Context (U.S. THIS CALL CENTER +1 253 477 8777)', 'Context (U.S. THIS CALL CENTER [contact omitted])'],
  ['Context (U.S. WE THE PEOPLE FOUNDATION +1 253 477 8777)', 'Context (U.S. WE THE PEOPLE FOUNDATION [contact omitted])'],
  ['Context (U.S. IT DEPARTMENT +1 253 477 8777)', 'Context (U.S. IT DEPARTMENT [contact omitted])']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unlabelled title-shaped institutions must retain their owned closer'
  );
}

for (const [input, expected] of [
  ['Broken (He moved to the U.S. He visited the company +1 253 477 8777)', 'Broken (He moved to the U.S. He visited the company [contact omitted]'],
  ['Broken (He moved to the U.S. HE VISITED THE COMPANY +1 253 477 8777)', 'Broken (He moved to the U.S. HE VISITED THE COMPANY [contact omitted]'],
  ['Broken (He moved to the U.S. HE VISITS ACME COMPANY +1 253 477 8777)', 'Broken (He moved to the U.S. HE VISITS ACME COMPANY [contact omitted]'],
  ['Broken (He moved to the U.S. THEY VISIT ACME FOUNDATION +1 253 477 8777)', 'Broken (He moved to the U.S. THEY VISIT ACME FOUNDATION [contact omitted]'],
  ['Broken (He moved to the U.S. WE WILL VISIT ACME COMPANY +1 253 477 8777)', 'Broken (He moved to the U.S. WE WILL VISIT ACME COMPANY [contact omitted]'],
  ['Broken (He moved to the U.S. WE SUPPORT ACME FOUNDATION +1 253 477 8777)', 'Broken (He moved to the U.S. WE SUPPORT ACME FOUNDATION [contact omitted]'],
  ['Broken (He moved to the U.S. WE BUILD THE SYSTEMS +1 253 477 8777)', 'Broken (He moved to the U.S. WE BUILD THE SYSTEMS [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． ＨＥ ＶＩＳＩＴＥＤ ＴＨＥ ＣＯＭＰＡＮＹ ＋１ ２５３ ４７７ ８７７７）', 'Broken（He moved to the Ｕ．Ｓ． ＨＥ ＶＩＳＩＴＥＤ ＴＨＥ ＣＯＭＰＡＮＹ [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'ordinary predicates outside the bounded lexicon must reset wrapper ownership'
  );
}

assert.equal(
  redactContactData('Context (U.S. We Care Foundation - Phone: +1 253 477 8777)'),
  'Context (U.S. We Care Foundation - Phone: [contact omitted])',
  'delimiter-aware labels and structural clause evidence must preserve wrapper ownership'
);


for (const [input, expected] of [
  ['Broken (He moved to the U.S. THEY PURCHASE TICKETS +1 253 477 8777)', 'Broken (He moved to the U.S. THEY PURCHASE TICKETS [contact omitted]'],
  ['Broken (He moved to the U.S. WE ACQUIRE ASSETS +1 253 477 8777)', 'Broken (He moved to the U.S. WE ACQUIRE ASSETS [contact omitted]'],
  ['Broken (He moved to the U.S. YOU PURCHASE THE TICKETS +1 253 477 8777)', 'Broken (He moved to the U.S. YOU PURCHASE THE TICKETS [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＰＵＲＣＨＡＳＥ ＴＩＣＫＥＴＳ ＋１ ２５３ ４７７ ８７７７）', 'Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＰＵＲＣＨＡＳＥ ＴＩＣＫＥＴＳ [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'plural-subject base-form predicates must reset wrapper ownership'
  );
}

for (const [input, expected] of [
  ['Broken (He moved to the U.S. He Visited The Company +1 253 477 8777)', 'Broken (He moved to the U.S. He Visited The Company [contact omitted]'],
  ['Broken (He moved to the U.S. She Leads The Foundation +1 253 477 8777)', 'Broken (He moved to the U.S. She Leads The Foundation [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． Ｈｅ Ｖｉｓｉｔｅｄ Ｔｈｅ Ｃｏｍｐａｎｙ ＋１ ２５３ ４７７ ８７７７）', 'Broken（He moved to the Ｕ．Ｓ． Ｈｅ Ｖｉｓｉｔｅｄ Ｔｈｅ Ｃｏｍｐａｎｙ [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unlabelled title-case object clauses must outrank institutional suffixes'
  );
}

for (const [input, expected] of [
  ['Context (U.S. This Is Us Foundation +1 253 477 8777)', 'Context (U.S. This Is Us Foundation [contact omitted])'],
  ['Context (U.S. We Care Center +1 253 477 8777)', 'Context (U.S. We Care Center [contact omitted])'],
  ['Context (U.S. He Visited The Company Phone: +1 253 477 8777)', 'Context (U.S. He Visited The Company Phone: [contact omitted])'],
  ['Context (U.S. THEY PURCHASE TICKETS FOUNDATION Phone: +1 253 477 8777)', 'Context (U.S. THEY PURCHASE TICKETS FOUNDATION Phone: [contact omitted])']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'title-shaped or terminally labelled institutions must remain protected'
  );
}


for (const [input, expected] of [
  ['Broken (He moved to the U.S. THEY SING SONGS +1 253 477 8777)', 'Broken (He moved to the U.S. THEY SING SONGS [contact omitted]'],
  ['Broken (He moved to the U.S. WE BRING SUPPLIES +1 253 477 8777)', 'Broken (He moved to the U.S. WE BRING SUPPLIES [contact omitted]'],
  ['Broken (He moved to the U.S. YOU SWING THE BAT +1 253 477 8777)', 'Broken (He moved to the U.S. YOU SWING THE BAT [contact omitted]'],
  ['Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＳＩＮＧ ＳＯＮＧＳ ＋１ ２５３ ４７７ ８７７７）', 'Broken（He moved to the Ｕ．Ｓ． ＴＨＥＹ ＳＩＮＧ ＳＯＮＧＳ [contact omitted]']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'lexical base verbs ending in ing must reset wrapper ownership'
  );
}

for (const [input, expected] of [
  ['Context (U.S. WE INSPIRE YOUNG PEOPLE FOUNDATION +1 253 477 8777)', 'Context (U.S. WE INSPIRE YOUNG PEOPLE FOUNDATION [contact omitted])'],
  ['Context (U.S. WE INSPIRE PEOPLE FOUNDATION +1 253 477 8777)', 'Context (U.S. WE INSPIRE PEOPLE FOUNDATION [contact omitted])'],
  ['Context (U.S. THEY PURCHASING TICKETS FOUNDATION +1 253 477 8777)', 'Context (U.S. THEY PURCHASING TICKETS FOUNDATION [contact omitted])'],
  ['Context（Ｕ．Ｓ． ＷＥ ＩＮＳＰＩＲＥ ＹＯＵＮＧ ＰＥＯＰＬＥ ＦＯＵＮＤＡＴＩＯＮ ＋１ ２５３ ４７７ ８７７７）', 'Context（Ｕ．Ｓ． ＷＥ ＩＮＳＰＩＲＥ ＹＯＵＮＧ ＰＥＯＰＬＥ ＦＯＵＮＤＡＴＩＯＮ [contact omitted]）']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'unbounded plural morphology must not override institutional title evidence'
  );
}

for (const [input, expected] of [
  ['Context (U.S. We Are The World Foundation +1 253 477 8777)', 'Context (U.S. We Are The World Foundation [contact omitted])'],
  ['Context (U.S. WE ARE THE WORLD FOUNDATION +1 253 477 8777)', 'Context (U.S. WE ARE THE WORLD FOUNDATION [contact omitted])'],
  ['Context（Ｕ．Ｓ． Ｗｅ Ａｒｅ Ｔｈｅ Ｗｏｒｌｄ Ｆｏｕｎｄａｔｉｏｎ ＋１ ２５３ ４７７ ８７７７）', 'Context（Ｕ．Ｓ． Ｗｅ Ａｒｅ Ｔｈｅ Ｗｏｒｌｄ Ｆｏｕｎｄａｔｉｏｎ [contact omitted]）']
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'copular title-shaped institutions must retain their owned closer'
  );
}

// period abbreviation classification must remain lexical and context-bounded


for (const [input, expected] of [
  [
    'Context (Phone: (03) ) 6216 5111',
    'Context (Phone: [contact omitted])'
  ],
  [
    '文脈（電話：（０３） ） ６２１６ ５１１１',
    '文脈（電話：[contact omitted]）'
  ],
  [
    'Outer (Context (Phone: (03) ) 6216 5111)',
    'Outer (Context (Phone: [contact omitted]))'
  ],
  [
    '外側（文脈（電話：（０３） ） ６２１６ ５１１１）',
    '外側（文脈（電話：[contact omitted]））'
  ],
  [
    'Context (Phone: (03) )) 6216 5111',
    'Context (Phone: [contact omitted])'
  ],
  [
    'Context (Phone: (03) ) 6216 5111 090-1234-5678',
    'Context (Phone: [contact omitted]) [contact omitted]'
  ],
  [
    'Context (Phone: (03) ) 6216 5111 90 people',
    'Context (Phone: [contact omitted]) 90 people'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'domestic phones crossing owned outer closers must preserve canonical balance'
  );
}

for (const [input, expected] of [
  ['Phone: (03) ) 6216 5111', 'Phone: [contact omitted]'],
  ['電話：（０３） ） ６２１６ ５１１１', '電話：[contact omitted]'],
  [
    'Context ((Phone: 03 6216 5111 ) )',
    'Context ((Phone: [contact omitted] ) )'
  ],
  [
    '文脈（（電話：０３ ６２１６ ５１１１ ） ）',
    '文脈（（電話：[contact omitted] ） ）'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'ownerless domestic closers must remain omitted while retained wrapper spacing stays source-faithful'
  );
}


for (const [input, expected] of [
  [
    'Phone: ((03) 6216 5111)',
    'Phone: ([contact omitted])'
  ],
  [
    '電話：（（０３） ６２１６ ５１１１）',
    '電話：（[contact omitted]）'
  ],
  [
    'Context (Phone: ((03) 6216 5111))',
    'Context (Phone: ([contact omitted]))'
  ],
  [
    '文脈（電話：（（０３） ６２１６ ５１１１））',
    '文脈（電話：（[contact omitted]））'
  ],
  [
    'Context (Phone: 03 6216 5111) )',
    'Context (Phone: [contact omitted])'
  ],
  [
    '文脈（電話：０３ ６２１６ ５１１１） ）',
    '文脈（電話：[contact omitted]）'
  ],
  [
    'Context (Phone: 03 6216 5111) ) 90 people',
    'Context (Phone: [contact omitted]) 90 people'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'nested domestic candidate wrappers and surplus-close spacing must remain structural'
  );
}


for (const [input, expected] of [
  [
    'Context (Phone: 03-6216-8041)090-1234-5678',
    'Context (Phone: [contact omitted])[contact omitted]'
  ],
  [
    '文脈（電話：０３－６２１６－８０４１）０９０－１２３４－５６７８',
    '文脈（電話：[contact omitted]）[contact omitted]'
  ],
  [
    'Outer (Context (Phone: 03-6216-8041)090-1234-5678)',
    'Outer (Context (Phone: [contact omitted])[contact omitted])'
  ],
  [
    'Context (Phone: (03) )6216-8041)090-1234-5678',
    'Context (Phone: [contact omitted])[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a removed structural closer must remain a classification boundary between adjacent phones'
  );
}

for (const [crossCallbackCase, input, expected] of [
  [
    'formatted time with seconds',
    'Phone: 09012345678 12:30:45 555-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'formatted time without seconds',
    'Phone: 09012345678 12:30 555-1212',
    'Phone: [contact omitted] 12:30 [contact omitted]'
  ],
  [
    'unit count after a date',
    'Mobile number: 09012345678 2026-08-17 90 people 666-1212',
    'Mobile number: [contact omitted] 2026-08-17 90 people [contact omitted]'
  ],
  [
    'long unit count after a date',
    'Phone: 09012345678 2026-08-17 12345678 people 555-1212',
    'Phone: [contact omitted] 2026-08-17 12345678 people [contact omitted]'
  ],
  [
    'unit-bearing range',
    'Phone: 09012345678 1234-5678 people 555-1212',
    'Phone: [contact omitted] 1234-5678 people [contact omitted]'
  ],
  [
    'unit-bearing decimal',
    'Phone: 09012345678 1234.5678 people 555-1212',
    'Phone: [contact omitted] 1234.5678 people [contact omitted]'
  ],
  [
    'two local phones after one bridged time',
    'Phone: 09012345678 12:30:45 555-1212 555-3434',
    'Phone: [contact omitted] 12:30:45 [contact omitted] [contact omitted]'
  ],
  [
    'parenthesized local phone after one bridged time',
    'Phone: 09012345678 12:30:45 (555-1212)',
    'Phone: [contact omitted] 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth labelled time bridge',
    '電話：０９０１２３４５６７８ １２：３０：４５ ５５５－１２１２',
    '電話：[contact omitted] １２：３０：４５ [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `a source-proved ${crossCallbackCase} must carry the established phone label only to the next callback`
  );
}

for (const [crossCallbackRefusal, input, expected] of [
  [
    'unlabelled sequence',
    'Archive 09012345678 12:30:45 555-1212',
    'Archive [contact omitted] 12:30:45 555-1212'
  ],
  [
    'ordinary narrative conjunction',
    'Phone: 09012345678 and 555-1212',
    'Phone: [contact omitted] and 555-1212'
  ],
  [
    'redacted phone digits reused as a count',
    'Phone: 09012345678 people 555-1212',
    'Phone: [contact omitted] people 555-1212'
  ],
  [
    'date component reused as a count',
    'Phone: 09012345678 2026-08-17 people 555-1212',
    'Phone: [contact omitted] 2026-08-17 people 555-1212'
  ],
  [
    'newline inside a possible unit observation',
    'Phone: 09012345678 90\npeople 555-1212',
    'Phone: [contact omitted] 90\npeople 555-1212'
  ],
  [
    'sentence boundary after a complete unit observation',
    'Phone: 09012345678 90 people. 555-1212',
    'Phone: [contact omitted] 90 people. 555-1212'
  ],
  [
    'semicolon after a complete unit observation',
    'Phone: 09012345678 90 people; 555-1212',
    'Phone: [contact omitted] 90 people; 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `cross-callback phone-label authority must refuse ${crossCallbackRefusal}`
  );
}

for (const [wrappedBridgeCase, input, expected] of [
  [
    'ASCII narrative wrapper before formatted time',
    '(Phone: 09012345678) 12:30:45 555-1212',
    '(Phone: [contact omitted]) 12:30:45 [contact omitted]'
  ],
  [
    'plus-prefixed narrative wrapper before formatted time',
    '(Phone: +81 90 1234 5678) 12:30:45 555-1212',
    '(Phone: [contact omitted]) 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth narrative wrapper before formatted time',
    '（電話：０９０１２３４５６７８） １２：３０：４５ ５５５－１２１２',
    '（電話：[contact omitted]） １２：３０：４５ [contact omitted]'
  ],
  [
    'ASCII narrative wrapper before unit observation',
    '(Phone: 09012345678) 90 people 555-1212',
    '(Phone: [contact omitted]) 90 people [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `a ${wrappedBridgeCase} must retain exact first-phone range custody for the next callback`
  );
}

for (const [wrappedBridgeRefusal, input, expected] of [
  [
    'fresh sentence',
    '(Phone: 09012345678). 12:30:45 555-1212',
    '(Phone: [contact omitted]). 12:30:45 555-1212'
  ],
  [
    'fresh sentence period before an owned closer',
    'Context (Phone: 09012345678.) 12:30:45 555-1212',
    'Context (Phone: [contact omitted].) 12:30:45 555-1212'
  ],
  [
    'fresh sentence period before nested owned closers',
    'Context ((Phone: 09012345678.)) 12:30:45 555-1212',
    'Context ((Phone: [contact omitted].)) 12:30:45 555-1212'
  ],
  [
    'fullwidth fresh sentence period before an owned closer',
    '文脈（電話：０９０１２３４５６７８．） １２：３０：４５ ５５５－１２１２',
    '文脈（電話：[contact omitted]．） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'unlabelled wrapper',
    '(Archive 09012345678) 12:30:45 555-1212',
    '(Archive [contact omitted]) 12:30:45 555-1212'
  ],
  [
    'narrative conjunction',
    '(Phone: 09012345678) and 555-1212',
    '(Phone: [contact omitted]) and 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `wrapped cross-callback label custody must refuse ${wrappedBridgeRefusal}`
  );
}

assert.equal(
  redactContactData('Phone: ((09012345678)) 12:30:45 555-1212'),
  'Phone: ([contact omitted]) 12:30:45 [contact omitted]',
  'a nested value wrapper must not terminate phone-label authority before a cross-callback time bridge'
);

for (const [nestedLabelWrapperCase, input, observation, firstDigits, laterDigits] of [
  [
    'plus-prefixed phone',
    'Phone: (+81 90 1234 5678) 12:30:45 555-1212',
    '12:30:45',
    '819012345678',
    '5551212'
  ],
  [
    'fullwidth plus-prefixed phone',
    '電話：（＋８１ ９０ １２３４ ５６７８） １２：３０：４５ ５５５－１２１２',
    '12:30:45',
    '819012345678',
    '5551212'
  ],
  [
    'unit observation',
    'Phone: ((09012345678)) 90 people 555-1212',
    '90 people',
    '09012345678',
    '5551212'
  ]
]) {
  const actual = redactContactData(input);
  const normalizedActual = actual.normalize('NFKC');
  assert.ok(
    normalizedActual.includes(observation),
    `${nestedLabelWrapperCase}: the complete observation must remain source-faithful`
  );
  assert.ok(
    !normalizedActual.replace(/\D/gu, '').includes(firstDigits),
    `${nestedLabelWrapperCase}: the first labelled phone must not survive`
  );
  assert.ok(
    !normalizedActual.replace(/\D/gu, '').includes(laterDigits),
    `${nestedLabelWrapperCase}: the later phone must inherit only the proved label lease`
  );
  assert.ok(
    (actual.match(/\[contact omitted\]/gu) ?? []).length >= 2,
    `${nestedLabelWrapperCase}: both governed phones must redact`
  );
}

for (const [nestedLabelWrapperRefusal, input, observation, laterDigits] of [
  [
    'closed square wrapper boundary',
    'Phone: [((09012345678))] 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'URL-embedded phone word',
    'https://example.test/phone: ((09012345678)) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'unlabelled nested wrapper',
    'Archive ((09012345678)) 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ],
  [
    'fresh sentence after nested wrapper',
    'Phone: ((09012345678)). 12:30:45 555-1212',
    '12:30:45',
    '5551212'
  ]
]) {
  const actual = redactContactData(input);
  const normalizedActual = actual.normalize('NFKC');
  assert.ok(
    normalizedActual.includes(observation),
    `${nestedLabelWrapperRefusal}: the observation must remain intact`
  );
  assert.ok(
    normalizedActual.replace(/\D/gu, '').includes(laterDigits),
    `${nestedLabelWrapperRefusal}: refused authority must leave the later local number unchanged`
  );
  assert.equal(
    (actual.match(/\[contact omitted\]/gu) ?? []).length,
    1,
    `${nestedLabelWrapperRefusal}: refusal must redact only the intrinsically valid first phone`
  );
}

for (const [wrappedObservationName, input] of [
  [
    'nested ISO date',
    'Phone: ((2026-08-17)) 12:30:45 555-1212'
  ],
  [
    'fullwidth nested ISO date',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'nested long decimal',
    'Phone: ((1234567.890123)) 12:30:45 555-1212'
  ],
  [
    'nested unit observation',
    'Phone: ((90 people)) 12:30:45 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    input,
    `${wrappedObservationName}: a wrapped strong observation must keep exclusive custody and mint no phone-label lease`
  );
}

assert.equal(
  redactContactData('Phone: ((03-62165111)) 12:30:45 555-1212'),
  'Phone: ([contact omitted]) 12:30:45 [contact omitted]',
  'a weak range-shaped domestic phone must retain its intrinsic telephone route before wrapped label authority is minted'
);

for (const [name, input, expected] of [
  [
    'nested phone-shaped unit observation',
    'Phone: ((03-62165111 people)) 12:30:45 555-1212',
    'Phone: ((03-62165111 people)) 12:30:45 555-1212'
  ],
  [
    'fullwidth nested phone-shaped unit observation',
    '電話：（（０３－６２１６５１１１ 人）） １２：３０：４５ ５５５－１２１２',
    '電話：（（０３－６２１６５１１１ 人）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'label-dependent closer-spanning range with bare tail',
    'Phone: (555-1212)12345678',
    'Phone: [contact omitted]12345678'
  ],
  [
    'fullwidth label-dependent closer-spanning range with bare tail',
    '電話：（５５５－１２１２）１２３４５６７８',
    '電話：[contact omitted]１２３４５６７８'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: wrapper or closer geometry must not lend telephone authority to an independently classified numeric tail`
  );
}

for (const [name, input, expected] of [
  [
    'labelled weak local before intrinsic grouped phone',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'wrapped labelled weak local before intrinsic grouped phone',
    'Phone: (555-1212) 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'fullwidth wrapped labelled weak local before intrinsic grouped phone',
    '電話：（５５５－１２１２） ０３－６２１６－８０４１',
    '電話：[contact omitted] [contact omitted]'
  ],
  [
    'square-wrapped phone-shaped unit observation',
    'Phone: [03-62165111 people] 12:30:45 555-1212',
    'Phone: [03-62165111 people] 12:30:45 555-1212'
  ],
  [
    'brace-wrapped phone-shaped unit observation',
    'Phone: {03-62165111 people} 12:30:45 555-1212',
    'Phone: {03-62165111 people} 12:30:45 555-1212'
  ],
  [
    'Japanese-wrapped phone-shaped unit observation',
    'Phone: 【03-62165111 people】 12:30:45 555-1212',
    'Phone: 【03-62165111 people】 12:30:45 555-1212'
  ],
  [
    'fullwidth square-wrapped phone-shaped unit observation',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２',
    '電話：［０３－６２１６５１１１ 人］ １２：３０：４５ ５５５－１２１２'
  ],
  [
    'sentence boundary expires a possible later callback bridge',
    'Phone: 09012345678. 2026-08-17 12:30:45 555-1212',
    'Phone: [contact omitted]. 2026-08-17 12:30:45 555-1212'
  ],
  [
    'a bridged phone cannot renew the explicit-label lease',
    'Phone: 09012345678 12:30:45 555-1212 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45 [contact omitted] 13:40:50 666-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: phone authority, observation custody, and callback leases must remain disjoint`
  );
}

for (const [name, input, expected] of [
  [
    'intrinsic weak-range domestic phone before a later phone',
    '050-12345678 03-6216-8041',
    '[contact omitted] [contact omitted]'
  ],
  [
    'intrinsic compact range-shaped phone before a later phone',
    '03-62165111 09012345678',
    '[contact omitted] [contact omitted]'
  ],
  [
    'fullwidth intrinsic weak-range phone before a later phone',
    '０５０－１２３４５６７８ ０３－６２１６－８０４１',
    '[contact omitted] [contact omitted]'
  ],
  [
    'labelled strong unwrapped hyphen-date observations',
    'Phone: 2026-08-17 2027-09-18',
    'Phone: 2026-08-17 2027-09-18'
  ],
  [
    'labelled strong unwrapped slash-date observations',
    'Phone: 2026/08/17 2027/09/18',
    'Phone: 2026/08/17 2027/09/18'
  ],
  [
    'labelled strong unwrapped period-date observations',
    'Phone: 2026.08.17 2027.09.18',
    'Phone: 2026.08.17 2027.09.18'
  ],
  [
    'fullwidth labelled strong unwrapped observations',
    '電話：２０２６－０８－１７ ２０２７－０９－１８',
    '電話：２０２６－０８－１７ ２０２７－０９－１８'
  ],
  [
    'identifier-period suffix remains independently classifiable',
    'ID: 12345678.03.6216.8041',
    'ID: 12345678.[contact omitted]'
  ],
  [
    'unlabelled ambiguous weak range remains an observation',
    '10-20 03-6216-8041',
    '10-20 [contact omitted]'
  ],
  [
    'unlabelled local weak range remains unclassified',
    '555-1212 03-6216-8041',
    '555-1212 [contact omitted]'
  ],
  [
    'labelled weak local remains telephone-eligible',
    'Phone: 555-1212 03-6216-8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'unwrapped unit-bearing observation retains custody under a label',
    'Phone: 03-62165111 people 03-6216-8041',
    'Phone: 03-62165111 people [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic telephone proof must demote only a weak range while explicit label authority must not consume a complete strong observation`
  );
}

for (const [name, input, expected] of [
  [
    'labelled dotted domestic phone outranks decimal-prefix observation',
    'Phone: 03.6216.8041',
    'Phone: [contact omitted]'
  ],
  [
    'labelled dotted mobile phone outranks decimal-prefix observation',
    'Phone: 090.1234.5678',
    'Phone: [contact omitted]'
  ],
  [
    'fullwidth labelled dotted domestic phone',
    '電話：０３．６２１６．８０４１',
    '電話：[contact omitted]'
  ],
  [
    'fullwidth labelled dotted mobile phone',
    '電話：０９０．１２３４．５６７８',
    '電話：[contact omitted]'
  ],
  [
    'unlabelled dotted domestic phone remains intrinsically eligible',
    '03.6216.8041',
    '[contact omitted]'
  ],
  [
    'labelled decimal observation retains custody',
    'Phone: 3.1415',
    'Phone: 3.1415'
  ],
  [
    'labelled period-date observation retains custody',
    'Phone: 2026.08.17',
    'Phone: 2026.08.17'
  ],
  [
    'labelled unit-bearing phone-shaped observation retains custody',
    'Phone: 03-62165111 people',
    'Phone: 03-62165111 people'
  ],
  [
    'inherited label admits an attached wrapped grouped phone after time',
    'Phone: 09012345678 12:30:45(03-6216-8041)',
    'Phone: [contact omitted] 12:30:45[contact omitted]'
  ],
  [
    'fullwidth inherited label admits attached wrapped grouped phone',
    '電話：０９０１２３４５６７８ １２：３０：４５（０３－６２１６－８０４１）',
    '電話：[contact omitted] １２：３０：４５[contact omitted]'
  ],
  [
    'inherited label admits an attached wrapped weak local phone',
    'Phone: 09012345678 12:30:45(555-1212)',
    'Phone: [contact omitted] 12:30:45[contact omitted]'
  ],
  [
    'bridged attached-wrapper use does not renew the one-use label lease',
    'Phone: 09012345678 12:30:45(03-6216-8041) 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45[contact omitted] 13:40:50 666-1212'
  ],
  [
    'unproved alphanumeric adjacency cannot inherit phone-label authority',
    'A(03-6216-8041)',
    'A(03-6216-8041)'
  ],
  [
    'intervening letter blocks the cross-callback label bridge',
    'Phone: 09012345678 12:30:45A(03-6216-8041)',
    'Phone: [contact omitted] 12:30:45A(03-6216-8041)'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: intrinsic full-source telephone proof and inherited callback authority must remain separately bounded`
  );
}


const repeatedObservationCount = 1200;
const repeatedObservationBridgeInput =
  `Phone: 09012345678 ${'1.1 '.repeat(repeatedObservationCount)}12:30 555-1212`;
const repeatedObservationBridgeStart = performance.now();
const repeatedObservationBridgeOutput = redactContactData(
  repeatedObservationBridgeInput
);
const repeatedObservationBridgeElapsed =
  performance.now() - repeatedObservationBridgeStart;
assert.equal(
  repeatedObservationBridgeOutput,
  `Phone: [contact omitted] ${'1.1 '.repeat(repeatedObservationCount)}12:30 [contact omitted]`,
  'one-pass observation custody must preserve every decimal while carrying the label to the later local phone'
);
assert.ok(
  repeatedObservationBridgeElapsed < 5000,
  `repeated observation bridge must remain bounded; elapsed=${repeatedObservationBridgeElapsed.toFixed(1)}ms`
);
for (const [name, input, expected] of [
  [
    'consecutive observations still skip internal digit seeds',
    'Phone: 09012345678 2026-08-17 12:30:45 555-1212',
    'Phone: [contact omitted] 2026-08-17 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth observation bridge retains source geometry',
    '電話：０９０１２３４５６７８ ３．１４ １２：３０：４５ ５５５－１２１２',
    '電話：[contact omitted] ３．１４ １２：３０：４５ [contact omitted]'
  ],
  [
    'a sentence boundary still terminates the label before repeated observations',
    `Phone: 09012345678. ${'1.1 '.repeat(20)}12:30 555-1212`,
    `Phone: [contact omitted]. ${'1.1 '.repeat(20)}12:30 555-1212`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the monotone observation frontier must not widen cross-callback authority`
  );
}

for (const [name, input, expected] of [
  [
    'inherited label enters an ASCII square wrapper after time',
    'Phone: 09012345678 12:30:45[555-1212]',
    'Phone: [contact omitted] 12:30:45[[contact omitted]]'
  ],
  [
    'inherited label enters a fullwidth square wrapper after time',
    '電話：０９０１２３４５６７８ １２：３０：４５［５５５－１２１２］',
    '電話：[contact omitted] １２：３０：４５［[contact omitted]］'
  ],
  [
    'inherited label enters an ASCII brace wrapper after time',
    'Phone: 09012345678 12:30:45{555-1212}',
    'Phone: [contact omitted] 12:30:45{[contact omitted]}'
  ],
  [
    'inherited label enters a fullwidth brace wrapper after time',
    '電話：０９０１２３４５６７８ １２：３０：４５｛５５５－１２１２｝',
    '電話：[contact omitted] １２：３０：４５｛[contact omitted]｝'
  ],
  [
    'inherited label enters a corner wrapper after time',
    'Phone: 09012345678 12:30:45【555-1212】',
    'Phone: [contact omitted] 12:30:45【[contact omitted]】'
  ],
  [
    'inherited label traverses nested accepted openers',
    'Phone: 09012345678 12:30:45[{555-1212}]',
    'Phone: [contact omitted] 12:30:45[{[contact omitted]}]'
  ],
  [
    'accepted external wrapper retains a plus-prefixed phone',
    'Phone: 09012345678 12:30:45[+1 212 555 1234]',
    'Phone: [contact omitted] 12:30:45[[contact omitted]]'
  ],
  [
    'accepted external wrapper consumes but does not renew the one-use lease',
    'Phone: 09012345678 12:30:45[555-1212] 13:40:50 666-1212',
    'Phone: [contact omitted] 12:30:45[[contact omitted]] 13:40:50 666-1212'
  ],
  [
    'strong date inside an accepted external wrapper retains observation custody',
    'Phone: 09012345678 12:30:45[2027-09-18]',
    'Phone: [contact omitted] 12:30:45[2027-09-18]'
  ],
  [
    'unit-bearing range inside an accepted external wrapper retains observation custody',
    'Phone: 09012345678 12:30:45[555-1212 people]',
    'Phone: [contact omitted] 12:30:45[555-1212 people]'
  ],
  [
    'fresh sentence refuses external-wrapper inheritance',
    'Phone: 09012345678. 12:30:45[555-1212]',
    'Phone: [contact omitted]. 12:30:45[555-1212]'
  ],
  [
    'unlabelled source refuses external-wrapper inheritance',
    'Archive 09012345678 12:30:45[555-1212]',
    'Archive [contact omitted] 12:30:45[555-1212]'
  ],
  [
    'intervening letter refuses external-wrapper inheritance',
    'Phone: 09012345678 12:30:45A[555-1212]',
    'Phone: [contact omitted] 12:30:45A[555-1212]'
  ],
  [
    'a closer without an accepted opener cannot enter the bridge',
    'Phone: 09012345678 12:30:45]555-1212[',
    'Phone: [contact omitted] 12:30:45]555-1212['
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a date',
    'Phone: 03.6216.8041 2026-08-17',
    'Phone: [contact omitted] 2026-08-17'
  ],
  [
    'fullwidth labelled dotted domestic phone remains intrinsic before a date',
    '電話：０３．６２１６．８０４１ ２０２６－０８－１７',
    '電話：[contact omitted] ２０２６－０８－１７'
  ],
  [
    'labelled dotted mobile phone remains intrinsic before a time',
    'Phone: 090.1234.5678 12:30:45',
    'Phone: [contact omitted] 12:30:45'
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a decimal',
    'Phone: 03.6216.8041 3.1415',
    'Phone: [contact omitted] 3.1415'
  ],
  [
    'labelled dotted domestic phone remains intrinsic before a unit count',
    'Phone: 03.6216.8041 90 people',
    'Phone: [contact omitted] 90 people'
  ],
  [
    'unlabelled dotted domestic phone remains intrinsic before a date',
    '03.6216.8041 2026-08-17',
    '[contact omitted] 2026-08-17'
  ],
  [
    'identifier-labelled dotted value retains identifier custody',
    'ID: 03.6216.8041 2026-08-17',
    'ID: 03.6216.8041 2026-08-17'
  ],
  [
    'leading decimal and date remain observations',
    'Phone: 3.1415 2026-08-17',
    'Phone: 3.1415 2026-08-17'
  ],
  [
    'period-date remains an observation before an intrinsic dotted phone',
    'Phone: 2026.08.17 03.6216.8041',
    'Phone: 2026.08.17 [contact omitted]'
  ],
  [
    'dotted phone retains authority through a date to one later weak local phone',
    'Phone: 03.6216.8041 2026-08-17 555-1212',
    'Phone: [contact omitted] 2026-08-17 [contact omitted]'
  ],
  [
    'dotted phone extension remains separately redacted',
    'Phone: 03.6216.8041 ext 55',
    'Phone: [contact omitted] ext [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: accepted-wrapper entry and intrinsic-phone precedence must retain separate proof obligations`
  );
}

const crawlerRuntimeSource = fs.readFileSync(
  new URL('../tools/crawl-industrial-exhaust.mjs', import.meta.url),
  'utf8'
);
assert.match(
  crawlerRuntimeSource,
  /last_status: 'not_modified',\s+last_error: null,\s+new_observation_count: 0/u,
  'a 304 response must reset the current-run observation count'
);
assert.match(
  crawlerRuntimeSource,
  /last_status: 'error',\s+last_error: error\.message,\s+new_observation_count: 0/u,
  'an acquisition error must reset the current-run observation count'
);


for (const [input, expected] of [
  [
    'Archive 03-6216-8041-3.14',
    'Archive [contact omitted]-3.14'
  ],
  [
    'Archive ０３－６２１６－８０４１－３．１４',
    'Archive [contact omitted]－３．１４'
  ],
  [
    'Archive 03-6216-8041–3.14',
    'Archive [contact omitted]–3.14'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'an invalid synthetic date beginning inside a phone must not suppress the complete phone interval'
  );
}

for (const [input, expected] of [
  [
    'Phone: 09012345678 03.6216.8041',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    'Phone: 09012345678 050.1234.5678',
    'Phone: [contact omitted] [contact omitted]'
  ],
  [
    '電話番号：０９０１２３４５６７８ ０３．６２１６．８０４１',
    '電話番号：[contact omitted] [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a complete intrinsic dotted phone must win before a decimal observation can claim its prefix'
  );
}

for (const [input, expected] of [
  [
    'Archive +81 3 6216 8041–3.14',
    'Archive [contact omitted]–3.14'
  ],
  [
    'Archive +81 3 6216 8041—3.14',
    'Archive [contact omitted]—3.14'
  ],
  [
    'Archive ＋８１ ３ ６２１６ ８０４１—３．１４',
    'Archive [contact omitted]—３．１４'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'a complete formatted observation after a dash must terminate the preceding intrinsic phone'
  );
}

for (const calendarControl of [
  'Archive 2024-02-29',
  'Archive 29-02-2024',
  'Archive 03.04.2026'
]) {
  assert.equal(
    redactContactData(calendarControl),
    calendarControl,
    'valid calendar observations must retain observation custody'
  );
}


for (const [input, expected] of [
  [
    'https://user@example.test/03-6216-8041',
    'https://user@example.test/03-6216-8041'
  ],
  [
    '<https://user@example.test/03-6216-8041>',
    '<https://user@example.test/03-6216-8041>'
  ],
  [
    'URL:https://example.test/user@example.org/03-6216-8041',
    'URL:https://example.test/user@example.org/03-6216-8041'
  ],
  [
    '//user@example.test/03-6216-8041',
    '//user@example.test/03-6216-8041'
  ],
  [
    'example.test/user@example.org/03-6216-8041',
    'example.test/user@example.org/03-6216-8041'
  ],
  [
    'ID: 1.42.68.53.00/user@example.test',
    'ID: 1.42.68.53.00/[contact omitted]'
  ],
  [
    'Contact user@example.test or 03-6216-8041',
    'Contact [contact omitted] or [contact omitted]'
  ],
  [
    'mailto:user@example.test',
    'mailto:[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    'email-shaped text inside a proved direct URL must retain URL custody without protecting ordinary email or dotted-identifier text'
  );
}

{
  const repetitions = 400;
  const input = `Archive ${'123,456/03-6216-8041 '.repeat(repetitions)}`;
  const originalNormalize = String.prototype.normalize;
  const originalArrayFrom = Array.from;
  let singleCharacterNormalizations = 0;
  let arrayFromStringCharacters = 0;
  try {
    String.prototype.normalize = function instrumentedNormalize(...args) {
      if (this.length === 1) singleCharacterNormalizations += 1;
      return originalNormalize.apply(this, args);
    };
    Array.from = function instrumentedArrayFrom(value, ...args) {
      if (typeof value === 'string') arrayFromStringCharacters += value.length;
      return originalArrayFrom.call(this, value, ...args);
    };

    const output = redactContactData(input);
    assert.equal(
      output.match(/\[contact omitted\]/gu)?.length,
      repetitions,
      'every independently complete phone in the alternating scalar sequence must redact'
    );
  } finally {
    String.prototype.normalize = originalNormalize;
    Array.from = originalArrayFrom;
  }

  assert.ok(
    singleCharacterNormalizations < repetitions * 100,
    `narrative-wrapper custody must be indexed once rather than rescanned per callback: ${singleCharacterNormalizations}`
  );
  assert.equal(
    arrayFromStringCharacters,
    0,
    'adjacent-character inspection must not materialize every growing callback prefix'
  );
}

console.log('industrial-exhaust tests passed');

// PR2231 attached-observation invalid-closer regressions
for (const [name, input, expected] of [
  [
    'ASCII decimal attached after an invalid closer',
    'Phone: 09012345678 2026-08-17)3.14 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)3.14 [contact omitted]'
  ],
  [
    'ASCII date attached after a mismatched closer',
    'Phone: 09012345678 2026-08-17]2027-09-18 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17]2027-09-18 [contact omitted]'
  ],
  [
    'fullwidth decimal attached after an invalid closer',
    '電話：０９０１２３４５６７８ ２０２６－０８－１７）３．１４ ０３－６２１６－８０４１',
    '電話：[contact omitted] ２０２６－０８－１７）３．１４ [contact omitted]'
  ],
  [
    'unlabelled attached observation cannot mint weak-phone authority',
    'Archive 09012345678 2026-08-17)3.14 555-1212',
    'Archive [contact omitted] 2026-08-17)3.14 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a complete attached observation must claim its source interval before any interior restart`
  );
}

// PR2231 complete observation interval custody regressions
for (const [name, input, expected] of [
  [
    'ordinary unit observation outranks an intrinsic numeric prefix after a date',
    'Archive 2026-08-17 03-62165111 people',
    'Archive 2026-08-17 03-62165111 people'
  ],
  [
    'ordinary unit observation remains intact between two phones',
    'Phone: 09012345678 2026-08-17 03-62165111 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17 03-62165111 people [contact omitted]'
  ],
  [
    'fullwidth ordinary unit observation outranks an intrinsic numeric prefix',
    '資料 ２０２６－０８－１７ ０３－６２１６５１１１ 人',
    '資料 ２０２６－０８－１７ ０３－６２１６５１１１ 人'
  ],
  [
    'ordinary intrinsic phone remains eligible without a unit suffix',
    'Archive 2026-08-17 03-62165111',
    'Archive 2026-08-17 [contact omitted]'
  ],
  [
    'unit observation outranks an intrinsic numeric prefix after an invalid closer',
    'Phone: 09012345678 2026-08-17)03-62165111 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17)03-62165111 people [contact omitted]'
  ],
  [
    'fullwidth unit observation outranks an intrinsic prefix after an invalid closer',
    '電話：０９０１２３４５６７８ ２０２６－０８－１７）０３－６２１６５１１１ 人 ０３－６２１６－８０４１',
    '電話：[contact omitted] ２０２６－０８－１７）０３－６２１６５１１１ 人 [contact omitted]'
  ],
  [
    'decimal unit observation owns its first group across a mismatched callback boundary',
    'Phone: 09012345678 2026-08-17]03.621651 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17]03.621651 people [contact omitted]'
  ],
  [
    'nonleading ISO date is excluded from interior phone optimization',
    'Phone: 12:30:45 2026-08-17 555-1212',
    'Phone: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'unlabelled nonleading date is excluded from interior phone optimization',
    'Archive 12:30:45 2026-08-17 555-1212',
    'Archive 12:30:45 2026-08-17 555-1212'
  ],
  [
    'identifier context cannot donate a nonleading date group to a phone',
    'ID: 12:30:45 2026-08-17 555-1212',
    'ID: 12:30:45 2026-08-17 555-1212'
  ],
  [
    'leading labelled date remains intact before a weak local phone',
    'Phone: 2026-08-17 555-1212',
    'Phone: 2026-08-17 [contact omitted]'
  ],
  [
    'day-first date remains intact before a disjoint domestic phone',
    'Archive 12:30:45 17/08/2026 03-6216-8041',
    'Archive 12:30:45 17/08/2026 [contact omitted]'
  ],
  [
    'period date remains intact before a disjoint dotted phone',
    'Archive 12:30:45 17.08.2026 03.6216.8041',
    'Archive 12:30:45 17.08.2026 [contact omitted]'
  ],
  [
    'fullwidth period date remains intact before a disjoint dotted phone',
    '電話：１２：３０：４５ ２０２６．０８．１７ ０３．６２１６．８０４１',
    '電話：１２：３０：４５ ２０２６．０８．１７ [contact omitted]'
  ],
  [
    'intrinsic dotted phone before a date retains precedence',
    'Phone: 03.6216.8041 2026-08-17',
    'Phone: [contact omitted] 2026-08-17'
  ],
  [
    'consecutive complete dates remain intact before a disjoint phone',
    'Archive 12:30:45 2026-08-17 2027-09-18 03-6216-8041',
    'Archive 12:30:45 2026-08-17 2027-09-18 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete observations and disjoint telephone intervals must retain exact source custody`
  );
}

// PR2231 period-date precedence regressions
for (const [name, input, expected] of [
  [
    'day-first dotted date after a labelled phone retains all three groups',
    'Phone: 03-6216-8041 17.08.2026 03-6216-8041',
    'Phone: [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'fullwidth day-first dotted date retains all three groups',
    '電話：０３－６２１６－８０４１ １７．０８．２０２６ ０３－６２１６－８０４１',
    '電話：[contact omitted] １７．０８．２０２６ [contact omitted]'
  ],
  [
    'unlabelled day-first dotted date retains all three groups',
    'Archive 03-6216-8041 17.08.2026 03-6216-8041',
    'Archive [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'identifier custody ends before a later dotted date and independent phone',
    'ID: 03-6216-8041 17.08.2026 03-6216-8041',
    'ID: 03-6216-8041 17.08.2026 [contact omitted]'
  ],
  [
    'short-year day-first dotted date remains complete',
    'Phone: 03-6216-8041 17.08.26 03-6216-8041',
    'Phone: [contact omitted] 17.08.26 [contact omitted]'
  ],
  [
    'attached period after a complete dotted date reaches the next phone',
    'Phone: 03-6216-8041 17.08.2026.03-6216-8041',
    'Phone: [contact omitted] 17.08.2026.[contact omitted]'
  ],
  [
    'year-first dotted date retains established custody',
    'Phone: 03-6216-8041 2026.08.17 03-6216-8041',
    'Phone: [contact omitted] 2026.08.17 [contact omitted]'
  ],
  [
    'decimal followed by a dotted phone remains a decimal then a phone',
    'Phone: 03-6216-8041 3.14.03-6216-8041',
    'Phone: [contact omitted] 3.14.[contact omitted]'
  ],
  [
    'decimal with a calendar-valid fractional group retains a domestic phone',
    'Phone: 03-6216-8041 3.12.03-6216-8041',
    'Phone: [contact omitted] 3.12.[contact omitted]'
  ],
  [
    'decimal with a calendar-valid fractional group retains a mobile phone',
    'Phone: 03-6216-8041 3.12.090-1234-5678',
    'Phone: [contact omitted] 3.12.[contact omitted]'
  ],
  [
    'fullwidth decimal does not absorb the following phone prefix as a short year',
    '電話：０３－６２１６－８０４１ ３．１２．０９０－１２３４－５６７８',
    '電話：[contact omitted] ３．１２．[contact omitted]'
  ],
  [
    'short-year continuation stops before a later unit observation',
    'Archive 3.12.03 62-16 20 people',
    'Archive 3.12.03 62-16 20 people'
  ],
  [
    'fullwidth short-year continuation stops before a later unit observation',
    '資料 ３．１２．０３ ６２－１６ ２０人',
    '資料 ３．１２．０３ ６２－１６ ２０人'
  ],
  [
    'short-year continuation stops before a later formatted time',
    'Archive 3.12.03 62-16 12:30:45',
    'Archive 3.12.03 62-16 12:30:45'
  ],
  [
    'short-year continuation stops before a later decimal',
    'Archive 3.12.03 62-16 3.14',
    'Archive 3.12.03 62-16 3.14'
  ],
  [
    'short-year continuation stops before a later date',
    'Archive 3.12.03 62-16 2026-08-17',
    'Archive 3.12.03 62-16 2026-08-17'
  ],
  [
    'short-year continuation stops before a wrapped unit observation',
    'Archive 3.12.03 62-16 (20 people)',
    'Archive 3.12.03 62-16 (20 people)'
  ],
  [
    'short-year continuation stops before an attached slash date',
    'Archive 3.12.03/20-08-17',
    'Archive 3.12.03/20-08-17'
  ],
  [
    'short-year continuation stops before an attached period date',
    'Archive 3.12.03.20.08.17',
    'Archive 3.12.03.20.08.17'
  ],
  [
    'short-year continuation stops before an attached dash date',
    'Archive 3.12.03-20-08-17',
    'Archive 3.12.03-20-08-17'
  ],
  [
    'fullwidth short-year continuation stops before an attached slash date',
    '資料 ３．１２．０３／２０－０８－１７',
    '資料 ３．１２．０３／２０－０８－１７'
  ],
  [
    'dotted phone continuation remains intrinsic across period separators',
    'Archive 3.12.03.6216.8041',
    'Archive 3.12.[contact omitted]'
  ],
  [
    'short-year domestic phone remains intrinsic before an extension',
    'Phone: 3.12.03-6216-8041 ext 55',
    'Phone: 3.12.[contact omitted] ext [contact omitted]'
  ],
  [
    'short-year mobile phone remains intrinsic before a hash extension',
    'Phone: 3.12.090-1234-5678 #1234',
    'Phone: 3.12.[contact omitted] #[contact omitted]'
  ],
  [
    'fullwidth short-year phone remains intrinsic before a Japanese extension',
    '電話：３．１２．０３－６２１６－８０４１ 内線５５',
    '電話：３．１２．[contact omitted] 内線[contact omitted]'
  ],
  [
    'short-year dotted phone remains intrinsic before an extension',
    'Phone: 3.12.03.6216.8041 extension 55',
    'Phone: 3.12.[contact omitted] extension [contact omitted]'
  ],
  [
    'short-year nonphone date tail remains outside extension authority',
    'Archive 3.12.03-20-26 ext 55',
    'Archive 3.12.03-20-26 ext 55'
  ],
  [
    'intrinsic dotted phone still outranks an overlapping decimal prefix',
    'Phone: 03.6216.8041 17.08.2026 03.6216.8041',
    'Phone: [contact omitted] 17.08.2026 [contact omitted]'
  ],
  [
    'consecutive day-first dotted dates remain complete before a later phone',
    'Phone: 03-6216-8041 17.08.2026 18.09.2027 03-6216-8041',
    'Phone: [contact omitted] 17.08.2026 18.09.2027 [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete dotted dates must precede decimal-prefix classification`
  );
}


// PR2231 dash-boundary telephone admission regressions
for (const [name, input, expected] of [
  [
    'ASCII dash after a short-year date admits a disjoint domestic phone',
    'Phone: 09012345678 3.12.03-03-6216-8041',
    'Phone: [contact omitted] 3.12.03-[contact omitted]'
  ],
  [
    'ASCII dash after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17-03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-[contact omitted]'
  ],
  [
    'fullwidth dash after a short-year date admits a disjoint domestic phone',
    '電話：０９０１２３４５６７８ ３．１２．０３－０３－６２１６－８０４１',
    '電話：[contact omitted] ３．１２．０３－[contact omitted]'
  ],
  [
    'hyphen after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17‐03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‐[contact omitted]'
  ],
  [
    'nonbreaking hyphen after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17‑03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‑[contact omitted]'
  ],
  [
    'figure dash after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17‒03-6216-8041',
    'Phone: [contact omitted] 2026-08-17‒[contact omitted]'
  ],
  [
    'en dash after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17–03-6216-8041',
    'Phone: [contact omitted] 2026-08-17–[contact omitted]'
  ],
  [
    'em dash after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17—03-6216-8041',
    'Phone: [contact omitted] 2026-08-17—[contact omitted]'
  ],
  [
    'minus sign after an ISO date admits a disjoint domestic phone',
    'Phone: 09012345678 2026-08-17−03-6216-8041',
    'Phone: [contact omitted] 2026-08-17−[contact omitted]'
  ],
  [
    'dash-separated complete unit observation retains source custody',
    'Phone: 09012345678 2026-08-17-03-62165111 people 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-03-62165111 people [contact omitted]'
  ],
  [
    'dash-separated subsequent date retains source custody',
    'Phone: 09012345678 2026-08-17-2027-09-18 03-6216-8041',
    'Phone: [contact omitted] 2026-08-17-2027-09-18 [contact omitted]'
  ],
  [
    'unlabelled bare tail gains no authority from a dash boundary',
    'Archive 09012345678 2026-08-17-12345678',
    'Archive [contact omitted] 2026-08-17-12345678'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: accepted dash boundaries must preserve complete observations before validating a disjoint telephone interval`
  );
}

// PR2231 formatted-observation dash and identifier-overflow custody regressions
for (const [name, input, expected] of [
  [
    'labelled formatted time admits an attached intrinsic domestic phone',
    'Phone: 09012345678 12:30:45-03-6216-8041',
    'Phone: [contact omitted] 12:30:45-[contact omitted]'
  ],
  [
    'unlabelled formatted time admits only an attached intrinsic domestic phone',
    'Archive 09012345678 12:30:45-03-6216-8041',
    'Archive [contact omitted] 12:30:45-[contact omitted]'
  ],
  [
    'minute-formatted time admits an attached intrinsic domestic phone',
    'Phone: 09012345678 12:30-03-6216-8041',
    'Phone: [contact omitted] 12:30-[contact omitted]'
  ],
  [
    'fullwidth formatted time admits an attached intrinsic domestic phone',
    '電話：０９０１２３４５６７８ １２：３０：４５－０３－６２１６－８０４１',
    '電話：[contact omitted] １２：３０：４５－[contact omitted]'
  ],
  [
    'unlabelled weak local range does not become a dash-boundary phone',
    'Archive 09012345678 12:30:45-555-1212',
    'Archive [contact omitted] 12:30:45-555-1212'
  ],
  [
    'unlabelled bare numeric tail does not become a dash-boundary phone',
    'Archive 09012345678 12:30:45-12345678',
    'Archive [contact omitted] 12:30:45-12345678'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a dash after a complete formatted observation must carry only source-proved telephone geometry`
  );
}

for (const labelCount of [4096, 4097]) {
  const input = `Archive ${'ID '.repeat(labelCount)}09012345678`;
  assert.equal(
    redactContactData(input),
    input,
    `${labelCount} terminal identifier labels must remain protective rather than minting telephone authority at the scan cap`
  );
}


// PR2231 cumulative exact-state and bounded-probe regressions v92
for (const [name, input, expected] of [
  [
    'unlabelled decimal admits a dash-following intrinsic domestic phone',
    'Archive 09012345678 3.14-03-6216-8041',
    'Archive [contact omitted] 3.14-[contact omitted]'
  ],
  [
    'fullwidth decimal admits a dash-following intrinsic domestic phone',
    '記録 ０９０１２３４５６７８ ３．１４－０３－６２１６－８０４１',
    '記録 [contact omitted] ３．１４－[contact omitted]'
  ],
  [
    'dash bridge retains a North American country code with spaces',
    'Archive 09012345678 12:30:45-1 212 555 1234',
    'Archive [contact omitted] 12:30:45-[contact omitted]'
  ],
  [
    'dash bridge retains a North American country code with hyphens',
    'Archive 09012345678 12:30-1-212-555-1234',
    'Archive [contact omitted] 12:30-[contact omitted]'
  ],
  [
    'dash bridge retains a North American country code with periods',
    'Archive 09012345678 12:30:45-1.212.555.1234',
    'Archive [contact omitted] 12:30:45-[contact omitted]'
  ],
  [
    'fullwidth dash bridge retains the complete North American interval',
    '記録 ０９０１２３４５６７８ １２：３０：４５－１ ２１２ ５５５ １２３４',
    '記録 [contact omitted] １２：３０：４５－[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete observation custody must hand one exact disjoint phone interval to rendering`
  );
}

for (const [name, label, count] of [
  ['short identifier labels beyond 16 KiB', 'ID ', 6000],
  ['long identifier labels beyond 16 KiB', 'identifier ', 5000]
]) {
  const input = `Archive ${label.repeat(count)}09012345678`;
  assert.equal(
    redactContactData(input),
    input,
    `${name}: exhausted provenance must remain identifier-protective rather than affirmative phone authority`
  );
}

{
  const input = `Phone ${'GUID '.repeat(4000)}record id: 09012345678`;
  assert.equal(
    redactContactData(input),
    `Phone ${'GUID '.repeat(4000)}record id: [contact omitted]`,
    'bounded provenance must still recover an actually present phone label within the 4,096-label parser ceiling'
  );
}

{
  const observationCount = 6000;
  const observations = '1.1 '.repeat(observationCount);
  const input = `Phone: 09012345678 ${observations}12:30 555-1212`;
  const expected = `Phone: [contact omitted] ${observations}12:30 [contact omitted]`;
  const started = Date.now();
  const actual = redactContactData(input);
  const elapsed = Date.now() - started;
  assert.equal(
    actual,
    expected,
    'the monotone observation frontier must preserve every decimal and the final label-authorized local phone'
  );
  assert.ok(
    elapsed < 4000,
    `6,000 observation groups must remain within the bounded runtime envelope; observed ${elapsed} ms`
  );
}


// PR2231 V104 complete day-first date interval-finality regressions
for (const [name, input, expected] of [
  [
    'international phone terminates before an en-dash day-first dotted date',
    'Archive +81 3 6216 8041–17.08.2026',
    'Archive [contact omitted]–17.08.2026'
  ],
  [
    'labelled international phone terminates before an em-dash day-first slash date',
    'Phone: +81 3 6216 8041—17/08/2026',
    'Phone: [contact omitted]—17/08/2026'
  ],
  [
    'domestic phone terminates before a hyphen day-first date',
    'Archive 03-6216-8041-17-08-2026',
    'Archive [contact omitted]-17-08-2026'
  ],
  [
    'fullwidth phone terminates before a fullwidth day-first dotted date',
    '電話：＋８１ ３ ６２１６ ８０４１－１７．０８．２０２６',
    '電話：[contact omitted]－１７．０８．２０２６'
  ],
  [
    'dash-owned decimal remains outside the preceding international phone',
    'Archive +81 3 6216 8041–3.14',
    'Archive [contact omitted]–3.14'
  ],
  [
    'standalone day-first dotted date remains source-faithful',
    'Archive 17.08.2026',
    'Archive 17.08.2026'
  ],
  [
    'intrinsic dotted domestic phone remains eligible',
    'Archive 03.6216.8041',
    'Archive [contact omitted]'
  ]
]) {
  assert.equal(redactContactData(input), expected, name);
}

// PR2231 V106 observation-to-phone and dash-partition custody regressions
for (const [name, input, expected] of [
  [
    'slash after a complete decimal exposes an intrinsic domestic phone',
    'Archive 3.14/03-6216-8041',
    'Archive 3.14/[contact omitted]'
  ],
  [
    'fullwidth slash after a complete decimal exposes an intrinsic domestic phone',
    '記録 ３．１４／０３－６２１６－８０４１',
    '記録 ３．１４／[contact omitted]'
  ],
  [
    'slash after a complete decimal exposes an intrinsic mobile phone',
    'Archive 3.14/090-1234-5678',
    'Archive 3.14/[contact omitted]'
  ],
  [
    'complete bare range retains custody before a dash-local domestic phone',
    'Archive 62-16-03-6216-8041',
    'Archive 62-16-[contact omitted]'
  ],
  [
    'fullwidth bare range retains custody before a dash-local domestic phone',
    '記録 ６２－１６－０３－６２１６－８０４１',
    '記録 ６２－１６－[contact omitted]'
  ],
  [
    'complete bare range retains custody before a dotted intrinsic phone',
    'Archive 62-16-03.6216.8041',
    'Archive 62-16-[contact omitted]'
  ],
  [
    'international phone terminates before a dash-attached complete time',
    'Archive +81 3 6216 8041–12:30:45',
    'Archive [contact omitted]–12:30:45'
  ],
  [
    'fullwidth international phone terminates before a complete time',
    '記録 ＋８１ ３ ６２１６ ８０４１－１２：３０：４５',
    '記録 [contact omitted]－１２：３０：４５'
  ],
  [
    'international phone terminates before a dash-attached unit count',
    'Archive +81 3 6216 8041–17 people',
    'Archive [contact omitted]–17 people'
  ],
  [
    'international phone terminates before a dash-attached unit range',
    'Archive +81 3 6216 8041–17-20 people',
    'Archive [contact omitted]–17-20 people'
  ],
  [
    'international phone retains exact custody before a dotted phone',
    'Archive +81 3 6216 8041–03.6216.8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'fullwidth international and dotted phones retain disjoint exact intervals',
    '記録 ＋８１ ３ ６２１６ ８０４１－０３．６２１６．８０４１',
    '記録 [contact omitted]－[contact omitted]'
  ],
  [
    'international phone retains exact custody before a parenthesized phone',
    'Archive +81 3 6216 8041–(03) 6216 8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'domestic phone terminates before a dash-attached complete time',
    'Archive 03-6216-8041–12:30:45',
    'Archive [contact omitted]–12:30:45'
  ],
  [
    'international phone and later domestic phone remain disjoint around a unit observation',
    'Archive +81 3 6216 8041–17 people 03-6216-8041',
    'Archive [contact omitted]–17 people [contact omitted]'
  ],
  [
    'dotted second phone remains exact before a later complete date',
    'Archive +81 3 6216 8041–03.6216.8041 2026-08-17',
    'Archive [contact omitted]–[contact omitted] 2026-08-17'
  ],
  [
    'valid mixed-separator short date does not become decimal-to-phone custody',
    'Archive 3.12/03-6216-8041',
    'Archive 3.12/03-6216-8041'
  ],
  [
    'IPv4 URL path remains outside observation-to-phone custody',
    '192.0.2.1/01/42/68/53/00',
    '192.0.2.1/01/42/68/53/00'
  ],
  [
    'terminal weak bare range remains an observation rather than a phone',
    'Archive 62-16',
    'Archive 62-16'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: each complete observation and independently proved phone must retain its exact source interval`
  );
}


// PR2231 V110 callback-complete scalar observation regressions
for (const [name, input, expected] of [
  ['two-digit terminal group','Archive +33 1 42 68 53 00–2026 people','Archive [contact omitted]–2026 people'],
  ['fullwidth terminal group','記録 ＋３３ １ ４２ ６８ ５３ ００－２０２６ 人','記録 [contact omitted]－２０２６ 人'],
  ['access-prefix terminal group','Archive 00 33 1 42 68 53 00–2026 people','Archive [contact omitted]–2026 people'],
  ['three-digit terminal group','Archive +33 1 42 68 530–2026 people','Archive [contact omitted]–2026 people'],
  ['short Japanese terminal group','Archive +81 3 6216 80–2026 people','Archive [contact omitted]–2026 people'],
  ['later domestic phone','Archive +33 1 42 68 53 00–2026 people 03-6216-8041','Archive [contact omitted]–2026 people [contact omitted]'],
  ['alternate scalar unit','Archive +33 1 42 68 53 00–2026 impressions','Archive [contact omitted]–2026 impressions'],
  ['unit range control','Archive +81 3 6216 8041–17-20 people','Archive [contact omitted]–17-20 people'],
  ['day-first date control','Archive +81 3 6216 8041–17.08.2026','Archive [contact omitted]–17.08.2026'],
  ['year-first date control','Archive +33 1 42 68 53 00–2026-08-17','Archive [contact omitted]–2026-08-17'],
  ['dotted second phone control','Archive +81 3 6216 8041–03.6216.8041','Archive [contact omitted]–[contact omitted]']
]) assert.equal(redactContactData(input),expected,`${name}: exact source custody`);


// PR2231 callback-local observation frontier regressions
for (const [name, input, expected] of [
  [
    'minute-formatted time remains intact before an attached domestic phone',
    'Archive 12:30-03-6216-8041',
    'Archive 12:30-[contact omitted]'
  ],
  [
    'second-formatted time remains intact before an attached domestic phone',
    'Archive 12:30:45-03-6216-8041',
    'Archive 12:30:45-[contact omitted]'
  ],
  [
    'fullwidth minute-formatted time retains exact callback custody',
    '資料 １２：３０－０３－６２１６－８０４１',
    '資料 １２：３０－[contact omitted]'
  ],
  [
    'minute-formatted time can hand a slash-local intrinsic phone its interval',
    'Archive 12:30/03-6216-8041',
    'Archive 12:30/[contact omitted]'
  ],
  [
    'nonleading decimal keeps custody before a slash-local phone',
    'Phone: 09012345678 3.14/03-6216-8041',
    'Phone: [contact omitted] 3.14/[contact omitted]'
  ],
  [
    'unlabelled nonleading decimal keeps custody before a slash-local phone',
    'Archive 09012345678 3.14/03-6216-8041',
    'Archive [contact omitted] 3.14/[contact omitted]'
  ],
  [
    'weak bare range keeps custody before a dash-local intrinsic phone',
    'Archive 62-16-03-6216-8041',
    'Archive 62-16-[contact omitted]'
  ],
  [
    'fullwidth weak range keeps custody before a fullwidth dash-local phone',
    '資料 ６２－１６－０３－６２１６－８０４１',
    '資料 ６２－１６－[contact omitted]'
  ],
  [
    'invalid slash-local bare tail gains no telephone authority',
    'Phone: 09012345678 3.14/12345678',
    'Phone: [contact omitted] 3.14/12345678'
  ],
  [
    'weak range followed by a bare tail remains unchanged',
    'Archive 62-16-12345678',
    'Archive 62-16-12345678'
  ],
  [
    'minute-formatted time before a date remains a pure observation sequence',
    'Archive 12:30-2026-08-17',
    'Archive 12:30-2026-08-17'
  ],
  [
    'current terminal-group scalar observation remains source-faithful',
    'Archive +33 1 42 68 53 00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'current terminal-group unit range remains source-faithful',
    'Archive +33 1 42 68 53 00–17-20 people',
    'Archive [contact omitted]–17-20 people'
  ],
  [
    'short-terminal international phone ends before a complete time',
    'Archive +33 1 42 68 53 00–12:30:45',
    'Archive [contact omitted]–12:30:45'
  ],
  [
    'short-terminal international phone ends before a dotted phone',
    'Archive +33 1 42 68 53 00–03.6216.8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'fullwidth short-terminal phone ends before a unit range',
    '資料 ＋３３ １ ４２ ６８ ５３ ００－１７－２０ people',
    '資料 [contact omitted]－１７－２０ people'
  ],
  [
    'absolute URL numeric path remains outside contact classification',
    'https://example.test/01/42/68/53/00',
    'https://example.test/01/42/68/53/00'
  ],
  [
    'bare-domain numeric path remains outside contact classification',
    'example.test/01/42/68/53/00',
    'example.test/01/42/68/53/00'
  ],
  [
    'scheme-relative numeric path remains outside contact classification',
    '//example.test/03/6216/5111',
    '//example.test/03/6216/5111'
  ],
  [
    'IP-host numeric path remains outside contact classification',
    '192.0.2.1/01/42/68/53/00',
    '192.0.2.1/01/42/68/53/00'
  ],
  [
    'long URL token retains provenance beyond the ordinary context window',
    `example.test/${'long-segment/'.repeat(12)}01/42/68/53/00`,
    `example.test/${'long-segment/'.repeat(12)}01/42/68/53/00`
  ],
  [
    'whitespace after a URL token terminates URL custody before a phone',
    'https://example.test/ 01 42 68 53 00',
    'https://example.test/ [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: complete time, decimal, and weak-range observations must terminate before one independently proved suffix phone`
  );
}


// PR2231 separator-independent initial-phone finality regressions
for (const [name, input, expected] of [
  [
    'slash-grouped international phone retains its terminal group before a scalar',
    'Archive +33 1/42/68/53/00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'slash-grouped international phone retains its terminal group before a unit range',
    'Archive +33 1/42/68/53/00–17-20 people',
    'Archive [contact omitted]–17-20 people'
  ],
  [
    'slash-grouped international phone ends before a complete time',
    'Archive +33 1/42/68/53/00–12:30:45',
    'Archive [contact omitted]–12:30:45'
  ],
  [
    'slash-grouped international phone ends before a later domestic phone',
    'Archive +33 1/42/68/53/00–03-6216-8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'slash-grouped international phone ends before a later dotted phone',
    'Archive +33 1/42/68/53/00–03.6216.8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'hyphen-grouped international phone ends at a distinct typographic dash',
    'Archive +33 1-42-68-53-00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'hyphen-grouped international phone preserves a following unit range',
    'Archive +33 1-42-68-53-00–17-20 people',
    'Archive [contact omitted]–17-20 people'
  ],
  [
    'hyphen-grouped international phone ends before a later domestic phone',
    'Archive +33 1-42-68-53-00–03-6216-8041',
    'Archive [contact omitted]–[contact omitted]'
  ],
  [
    'period-grouped international phone ends before a scalar',
    'Archive +33 1.42.68.53.00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'period-grouped international phone ends before a complete time',
    'Archive +33 1.42.68.53.00–12:30:45',
    'Archive [contact omitted]–12:30:45'
  ],
  [
    'fullwidth slash-grouped international phone retains exact terminal geometry',
    '資料 ＋３３ １／４２／６８／５３／００－０３－６２１６－８０４１',
    '資料 [contact omitted]－[contact omitted]'
  ],
  [
    'fullwidth slash-grouped international phone preserves a unit range',
    '資料 ＋３３ １／４２／６８／５３／００－１７－２０ people',
    '資料 [contact omitted]－１７－２０ people'
  ],
  [
    'access-prefix slash-grouped phone retains its terminal group before a scalar',
    'Archive 00 33 1/42/68/53/00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'space-grouped current scalar finality remains unchanged',
    'Archive +33 1 42 68 53 00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'varying horizontal whitespace retains the prior terminal-group contract',
    'Archive +33 1  42 68  53 00–2026 people',
    'Archive [contact omitted]–2026 people'
  ],
  [
    'same-glyph hyphen ambiguity gains no new partition authority',
    'Archive +33 1-42-68-53-00-2026 people',
    'Archive [contact omitted] people'
  ],
  [
    'mixed day-first short date refusal remains unchanged',
    'Archive 3.12/03-6216-8041',
    'Archive 3.12/03-6216-8041'
  ],
  [
    'slash-grouped terminal phone without a unit gains no new boundary',
    'Archive +33 1/42/68/53/00–17-20',
    'Archive [contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the dash partition must preserve both independently proved source objects`
  );
}



// PR2231 slash-attached dotted international finality regressions
for (const [name, input, expected] of [
  [
    'labelled dotted international phone ends before a decimal through slash partition',
    'Phone: +33 1.42.68.53.00/3.14',
    'Phone: [contact omitted]/3.14'
  ],
  [
    'unlabelled dotted international phone ends before a decimal through slash partition',
    'Archive +33 1.42.68.53.00/3.14',
    'Archive [contact omitted]/3.14'
  ],
  [
    'dotted international phone ends before a scalar unit observation',
    'Archive +33 1.42.68.53.00/2026 people',
    'Archive [contact omitted]/2026 people'
  ],
  [
    'dotted international phone ends before a complete unit range',
    'Archive +33 1.42.68.53.00/17-20 people',
    'Archive [contact omitted]/17-20 people'
  ],
  [
    'dotted international phone ends before a complete date',
    'Archive +33 1.42.68.53.00/2026-08-17',
    'Archive [contact omitted]/2026-08-17'
  ],
  [
    'dotted international phone ends before a complete time',
    'Archive +33 1.42.68.53.00/12:30:45',
    'Archive [contact omitted]/12:30:45'
  ],
  [
    'dotted international phone ends before a later domestic phone',
    'Archive +33 1.42.68.53.00/03-6216-8041',
    'Archive [contact omitted]/[contact omitted]'
  ],
  [
    'dotted international phone ends before a later dotted phone',
    'Archive +33 1.42.68.53.00/03.6216.8041',
    'Archive [contact omitted]/[contact omitted]'
  ],
  [
    'access-prefix dotted international phone retains exact finality',
    'Archive 0033 1.42.68.53.00/2026 people',
    'Archive [contact omitted]/2026 people'
  ],
  [
    'Japanese dotted international phone ends before a later domestic phone',
    'Archive +81 3.6216.80.41/03-6216-8041',
    'Archive [contact omitted]/[contact omitted]'
  ],
  [
    'fullwidth dotted international phone ends before a fullwidth decimal',
    '資料 ＋３３ １．４２．６８．５３．００／３．１４',
    '資料 [contact omitted]／３．１４'
  ],
  [
    'fullwidth dotted international phone ends before a scalar unit observation',
    '資料 ＋３３ １．４２．６８．５３．００／２０２６ 人',
    '資料 [contact omitted]／２０２６ 人'
  ],
  [
    'fullwidth dotted international phone ends before a later domestic phone',
    '資料 ＋３３ １．４２．６８．５３．００／０３－６２１６－８０４１',
    '資料 [contact omitted]／[contact omitted]'
  ],
  [
    'ASCII dotted phone accepts a fullwidth slash boundary only through exact partition proof',
    'Archive +33 1.42.68.53.00／03-6216-8041',
    'Archive [contact omitted]／[contact omitted]'
  ],
  [
    'absolute URL-like IP path remains outside contact classification',
    'Visit https://192.0.2.1/03-6216-8041',
    'Visit https://192.0.2.1/03-6216-8041'
  ],
  [
    'bare IP path remains outside contact classification',
    'Visit 192.0.2.1/3.14',
    'Visit 192.0.2.1/3.14'
  ],
  [
    'bare-domain path remains outside contact classification',
    'Visit example.test/03-6216-8041',
    'Visit example.test/03-6216-8041'
  ],
  [
    'space after a URL token ends URL custody before a genuine dotted phone',
    'Visit https://example.test/ +33 1.42.68.53.00/3.14',
    'Visit https://example.test/ [contact omitted]/3.14'
  ],
  [
    'same-glyph hyphen partition refusal remains unchanged',
    'Archive +33 1-42-68-53-00-2026 people',
    'Archive [contact omitted] people'
  ],
  [
    'slash partition without a proved competing object gains no authority',
    'Archive +33 1.42.68.53.00/17-20',
    'Archive +33 1.42.68.53.00/17-20'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: URL provenance may be bypassed only by two exact independently proved source objects`
  );
}

// PR2231 V115 identifier-first partition custody and iterative remainder transport
for (const [name, input, expected] of [
  [
    'identifier custody precedes dotted-phone slash partitioning',
    'ID: +33 1.42.68.53.00 / 03-6216-8041',
    'ID: +33 1.42.68.53.00 / [contact omitted]'
  ],
  [
    'identifier-owned dotted value remains intact before a decimal observation',
    'ID: +33 1.42.68.53.00/3.14',
    'ID: +33 1.42.68.53.00/3.14'
  ],
  [
    'reference custody preserves its initial value before a fullwidth suffix phone',
    'reference: +33 1.42.68.53.00 / ０３－６２１６－８０４１',
    'reference: +33 1.42.68.53.00 / [contact omitted]'
  ],
  [
    'identifier custody is separator-parity complete for a dash suffix phone',
    'ID: +33 1.42.68.53.00 - 03-6216-8041',
    'ID: +33 1.42.68.53.00 - [contact omitted]'
  ],
  [
    'identifier custody is NFKC-complete for a fullwidth slash and suffix phone',
    'ＩＤ： ＋３３ １．４２．６８．５３．００／０３－６２１６－８０４１',
    'ＩＤ： ＋３３ １．４２．６８．５３．００／[contact omitted]'
  ],
  [
    'ASCII identifier labels retain custody across a fullwidth slash',
    'Reference: +33 1.42.68.53.00／03-6216-8041',
    'Reference: +33 1.42.68.53.00／[contact omitted]'
  ],
  [
    'identifier custody survives an intervening decimal before a later phone',
    'ID: +33 1.42.68.53.00/3.14/03-6216-8041',
    'ID: +33 1.42.68.53.00/3.14/[contact omitted]'
  ],
  [
    'identifier custody survives an intervening scalar before a later phone',
    'ID: +33 1.42.68.53.00/2026 people/03-6216-8041',
    'ID: +33 1.42.68.53.00/2026 people/[contact omitted]'
  ],
  [
    'identifier-owned dotted value remains intact before a scalar observation',
    'ID: +33 1.42.68.53.00/2026 people',
    'ID: +33 1.42.68.53.00/2026 people'
  ],
  [
    'explicit phone authority still overrides an intervening identifier label',
    'Phone: ID: +33 1.42.68.53.00 / 03-6216-8041',
    'Phone: ID: [contact omitted] / [contact omitted]'
  ],
  [
    'ordinary dotted-phone slash partitioning remains affirmative without identifier provenance',
    'Archive +33 1.42.68.53.00/03-6216-8041',
    'Archive [contact omitted]/[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: a neutral separator cannot preempt explicit identifier or phone-label provenance`
  );
}

{
  const transitionCount = 2200;
  const input = `Archive ${'3.14/03-6216-8041 '.repeat(transitionCount)}`;
  const expected = `Archive ${'3.14/[contact omitted] '.repeat(transitionCount)}`;
  const started = Date.now();
  const actual = redactContactData(input);
  const elapsed = Date.now() - started;
  assert.equal(
    actual,
    expected,
    '2,200 observation-to-phone transitions must retain exact ranges without recursive remainder transport'
  );
  assert.ok(
    elapsed < 30_000,
    `2,200 iterative transitions must remain inside the bounded execution envelope; observed ${elapsed} ms`
  );
}


// PR2231 V116 identifier progression, callback-local URL provenance, and linear entry-token custody
for (const [name, input, expected] of [
  [
    'compact identifier custody advances across an ISO date to a disjoint phone',
    'ID: 09012345678/2026-08-17-03-6216-8041',
    'ID: 09012345678/2026-08-17-[contact omitted]'
  ],
  [
    'compact identifier custody advances across a decimal to a disjoint phone',
    'ID: 09012345678/3.14/03-6216-8041',
    'ID: 09012345678/3.14/[contact omitted]'
  ],
  [
    'compact identifier custody refuses a weak range without a proved transition',
    'ID: 09012345678/62-16-03-6216-8041',
    'ID: 09012345678/62-16-03-6216-8041'
  ],
  [
    'compact identifier custody advances across a unit observation to a disjoint phone',
    'ID: 09012345678/2026 people/03-6216-8041',
    'ID: 09012345678/2026 people/[contact omitted]'
  ],
  [
    'compact identifier custody refuses a bare tail after a complete date',
    'ID: 09012345678/2026-08-17-12345678',
    'ID: 09012345678/2026-08-17-12345678'
  ],
  [
    'dotted identifier suffix cannot mint IPv4 URL custody over an international phone',
    'ID: +33 1.42.68.53.00/+81 3 6216 5111',
    'ID: +33 1.42.68.53.00/[contact omitted]'
  ],
  [
    'dotted identifier suffix retains the complete North American interval',
    'ID: +33 1.42.68.53.00/+1 212 555 1234',
    'ID: +33 1.42.68.53.00/[contact omitted]'
  ],
  [
    'dotted identifier custody survives an intervening observation before a later international phone',
    'ID: +33 1.42.68.53.00/3.14/+81 3 6216 5111',
    'ID: +33 1.42.68.53.00/3.14/[contact omitted]'
  ],
  [
    'fullwidth dotted identifier suffix cannot mint URL custody',
    'Ｒｅｆｅｒｅｎｃｅ： ＋３３ １．４２．６８．５３．００／＋８１ ３ ６２１６ ５１１１',
    'Ｒｅｆｅｒｅｎｃｅ： ＋３３ １．４２．６８．５３．００／[contact omitted]'
  ],
  [
    'genuine IPv4 URL custody remains terminal-token anchored',
    'Visit 192.0.2.1/+81 3 6216 5111',
    'Visit 192.0.2.1/+81 3 6216 5111'
  ],
  [
    'genuine absolute URL custody remains terminal-token anchored',
    'Visit https://example.test/+81 3 6216 5111',
    'Visit https://example.test/+81 3 6216 5111'
  ],
  [
    'genuine bare-domain URL custody remains terminal-token anchored',
    'Visit example.test/+81 3 6216 5111',
    'Visit example.test/+81 3 6216 5111'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: identifier, URL, observation, and telephone intervals must retain independent source custody`
  );
}

// PR2231 V117 grouped-identifier progression and compact-transition resource safety
for (const [name, input, expected] of [
  [
    'grouped identifier custody advances across an ISO date to a disjoint phone',
    'ID: 1234 5678/2026-08-17-03-6216-8041',
    'ID: 1234 5678/2026-08-17-[contact omitted]'
  ],
  [
    'hyphen-grouped identifier custody advances across a decimal to a disjoint phone',
    'ID: 123-45678/3.14-03-6216-8041',
    'ID: 123-45678/3.14-[contact omitted]'
  ],
  [
    'grouped identifier custody advances across a callback-split time to a disjoint phone',
    'ID: 1234 5678/12:30:45-03-6216-8041',
    'ID: 1234 5678/12:30:45-[contact omitted]'
  ],
  [
    'grouped identifier custody advances across a complete unit observation',
    'ID: 1234 5678/2026 people-03-6216-8041',
    'ID: 1234 5678/2026 people-[contact omitted]'
  ],
  [
    'grouped identifier custody advances across a complete unit range',
    'ID: 1234 5678/17-20 people-03-6216-8041',
    'ID: 1234 5678/17-20 people-[contact omitted]'
  ],
  [
    'fullwidth grouped identifier custody advances across a date to a disjoint phone',
    'ＩＤ：１２３４ ５６７８／２０２６－０８－１７－０３－６２１６－８０４１',
    'ＩＤ：１２３４ ５６７８／２０２６－０８－１７－[contact omitted]'
  ],
  [
    'grouped identifier custody refuses a bare numeric suffix after a complete date',
    'ID: 1234 5678/2026-08-17-12345678',
    'ID: 1234 5678/2026-08-17-12345678'
  ],
  [
    'grouped identifier custody refuses progression without a complete observation',
    'ID: 1234 5678/03-6216-8041',
    'ID: 1234 5678/[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the identifier owns only its exact initial value and a later interval requires independent source proof`
  );
}

{
  const transitionCount = 4000;
  const sourcePair = '09012345678/2026-08-17-03-6216-8041 ';
  const expectedPair = '[contact omitted]/2026-08-17-[contact omitted] ';
  const input = `Archive ${sourcePair.repeat(transitionCount)}`;
  const expected = `Archive ${expectedPair.repeat(transitionCount)}`;
  const started = Date.now();
  const actual = redactContactData(input);
  const elapsed = Date.now() - started;
  assert.equal(
    actual,
    expected,
    '4,000 compact-phone/date/phone transitions must preserve every exact interval under iterative transport'
  );
  assert.ok(
    elapsed < 20_000,
    `4,000 compact transitions must avoid shrinking-remainder normalization; observed ${elapsed} ms`
  );
}


// PR2231 V118 identifier-partition observation finality
for (const [name, input, expected] of [
  [
    'hyphen-grouped identifier preserves a decimal before a parenthesized phone',
    'ID: 123-45678/3.14/(03) 6216 8041',
    'ID: 123-45678/3.14/[contact omitted]'
  ],
  [
    'hyphen-grouped identifier preserves an ISO date before a parenthesized phone',
    'ID: 123-45678/2026-08-17/(03) 6216 8041',
    'ID: 123-45678/2026-08-17/[contact omitted]'
  ],
  [
    'space-grouped identifier preserves a unit observation before a parenthesized phone',
    'ID: 1234 5678/2026 people/(03) 6216 8041',
    'ID: 1234 5678/2026 people/[contact omitted]'
  ],
  [
    'fullwidth grouped identifier preserves a decimal before a parenthesized phone',
    'ＩＤ：１２３－４５６７８／３．１４／（０３） ６２１６ ８０４１',
    'ＩＤ：１２３－４５６７８／３．１４／[contact omitted]'
  ],
  [
    'direct parenthesized phone remains independently redactable after an identifier',
    'ID: 123-45678/(03) 6216 8041',
    'ID: 123-45678/[contact omitted]'
  ],
  [
    'bare numeric tail gains no authority through an intervening decimal',
    'ID: 123-45678/3.14/12345678',
    'ID: 123-45678/3.14/12345678'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: identifier custody must end before a complete observation and only a disjoint validated phone may enter rendering`
  );
}

// PR2231 V120 weak-range custody and V121 owned-closer progression
for (const [name, input, expected] of [
  [
    'identifier preserves a weak range before a slash-separated parenthesized phone',
    'ID: 123-45678/62-16/(03) 6216 8041',
    'ID: 123-45678/62-16/[contact omitted]'
  ],
  [
    'identifier preserves a weak range before a slash-separated domestic phone',
    'ID: 123-45678/62-16/03-6216-8041',
    'ID: 123-45678/62-16/[contact omitted]'
  ],
  [
    'fullwidth identifier preserves a weak range before a disjoint phone',
    'ＩＤ：１２３－４５６７８／６２－１６／（０３） ６２１６ ８０４１',
    'ＩＤ：１２３－４５６７８／６２－１６／[contact omitted]'
  ],
  [
    'owned parenthesis closes a weak range before a dash-local phone',
    'ID: 123-45678/(62-16)-03-6216-8041',
    'ID: 123-45678/(62-16)-[contact omitted]'
  ],
  [
    'nested owned parentheses close a weak range before a dash-local phone',
    'ID: 123-45678/((62-16))-03-6216-8041',
    'ID: 123-45678/((62-16))-[contact omitted]'
  ],
  [
    'an owned closer alone makes the weak range and later phone source-distinct',
    'ID: 123-45678/(62-16)03-6216-8041',
    'ID: 123-45678/(62-16)[contact omitted]'
  ],
  [
    'fullwidth owned parenthesis closes a weak range before a dash-local phone',
    'ＩＤ：１２３－４５６７８／（６２－１６）－０３－６２１６－８０４１',
    'ＩＤ：１２３－４５６７８／（６２－１６）－[contact omitted]'
  ],
  [
    'an owned square closer preserves the weak range before a later phone',
    'ID: 123-45678/[62-16]-03-6216-8041',
    'ID: 123-45678/[62-16]-[contact omitted]'
  ],
  [
    'an owned brace closer preserves the weak range before a later phone',
    'ID: 123-45678/{62-16}-03-6216-8041',
    'ID: 123-45678/{62-16}-[contact omitted]'
  ],
  [
    'an owned corner-bracket closer preserves the weak range before a later phone',
    'ID: 123-45678/【62-16】-03-6216-8041',
    'ID: 123-45678/【62-16】-[contact omitted]'
  ],
  [
    'an unowned closer cannot create weak-range progression authority',
    'ID: 123-45678/62-16)-03-6216-8041',
    'ID: 123-45678/62-16)-03-6216-8041'
  ],
  [
    'an unowned closer alone cannot create weak-range progression authority',
    'ID: 123-45678/62-16)03-6216-8041',
    'ID: 123-45678/62-16)03-6216-8041'
  ],
  [
    'a surplus unowned closer cannot create weak-range progression authority',
    'ID: 123-45678/(62-16))-03-6216-8041',
    'ID: 123-45678/(62-16))-03-6216-8041'
  ],
  [
    'an owned closer cannot authorize a bare numeric tail',
    'ID: 123-45678/(62-16)-12345678',
    'ID: 123-45678/(62-16)-12345678'
  ],
  [
    'same-glyph dash continuation remains a refusal after a weak range',
    'ID: 09012345678/62-16-03-6216-8041',
    'ID: 09012345678/62-16-03-6216-8041'
  ],
  [
    'weak range does not authorize a slash-separated bare numeric tail',
    'ID: 123-45678/62-16/12345678',
    'ID: 123-45678/62-16/12345678'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: weak observation custody must end at its exact source endpoint and cannot grant telephone authority`
  );
}


// PR2231 V122 approved URL origin and bounded same-token callback context
for (const [name, input, expected] of [
  [
    'mailto-like malformed scheme grants neither email nor numeric-path URL custody',
    'mailto://user@example.test/03-6216-8041',
    'mailto://[contact omitted]/[contact omitted]'
  ],
  [
    'ftp scheme grants neither email nor numeric-path URL custody',
    'ftp://user@example.test/03-6216-8041',
    'ftp://[contact omitted]/[contact omitted]'
  ],
  [
    'unknown scheme cannot lend scheme-relative custody from its interior slashes',
    'bogus://user@example.test/03-6216-8041',
    'bogus://[contact omitted]/[contact omitted]'
  ],
  [
    'malformed scheme without embedded email still exposes the numeric path to redaction',
    'mailto://example.test/03-6216-8041',
    'mailto://example.test/[contact omitted]'
  ],
  [
    'approved HTTPS URL retains direct token custody',
    'https://alice@example.com/03-6216-8041',
    'https://alice@example.com/03-6216-8041'
  ],
  [
    'boundary-anchored scheme-relative URL retains direct token custody',
    '//alice@example.com/03-6216-8041',
    '//alice@example.com/03-6216-8041'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: URL custody must begin at an approved complete origin rather than interior slashes`
  );
}

{
  const transitionCount = 400;
  const input = `Archive ${'03-6216-8041🙂'.repeat(transitionCount)}`;
  const originalNormalize = String.prototype.normalize;
  let normalizedCharacters = 0;
  let actual;
  try {
    String.prototype.normalize = function countedNormalize(form) {
      normalizedCharacters += String(this).length;
      return originalNormalize.call(this, form);
    };
    actual = redactContactData(input);
  } finally {
    String.prototype.normalize = originalNormalize;
  }
  assert.equal(
    actual.match(/\[contact omitted\]/gu)?.length,
    transitionCount,
    'every phone callback inside one non-whitespace token must still redact exactly once'
  );
  assert.ok(
    normalizedCharacters < 2_000_000,
    `400 same-token callbacks must use bounded indexed context instead of rescanning the growing token; normalized ${normalizedCharacters} source characters`
  );
}


// PR2231 V123 token-anchored URL origins and indexed callback authority
for (const wrapper of ['!', '"', '“', '>', ']', ')', '。']) {
  const malformed = `${wrapper}mailto://example.test/03-6216-8041`;
  assert.equal(
    redactContactData(malformed),
    `${wrapper}mailto://example.test/[contact omitted]`,
    'token-leading wrappers must not hide an unsupported scheme or grant its interior slashes URL custody'
  );

  const longPath = 'a'.repeat(140);
  const approved = `${wrapper}https://example.test/${longPath}/03-6216-8041`;
  assert.equal(
    redactContactData(approved),
    approved,
    'token-leading wrappers must retain indexed custody for a genuine long HTTPS URL'
  );
}

for (const approvedWrappedUrl of [
  '!//example.test/03-6216-8041',
  '“example.test/03-6216-8041',
  ']192.0.2.1/03-6216-8041',
  'URL:https://example.test/user@example.org/03-6216-8041'
]) {
  assert.equal(
    redactContactData(approvedWrappedUrl),
    approvedWrappedUrl,
    'scheme-relative, bare-domain, IPv4, and established URL-introducer forms must retain source-faithful custody'
  );
}

assert.equal(
  redactContactData('!mailto://user@example.test/03-6216-8041'),
  '!mailto://[contact omitted]/[contact omitted]',
  'a wrapped unsupported scheme must redact both independently proved email and telephone material'
);
assert.equal(
  redactContactData('!+81 3 6216 5111'),
  '![contact omitted]',
  'a token-leading wrapper must not consume the plus marker of an international telephone as URL punctuation'
);

{
  const normalizeWork = transitionCount => {
    const input = `https://example.com/${'03-6216-8041🙂'.repeat(transitionCount)}`;
    const originalNormalize = String.prototype.normalize;
    let normalizedCharacters = 0;
    let actual;
    try {
      String.prototype.normalize = function countedNormalize(form) {
        normalizedCharacters += String(this).length;
        return originalNormalize.call(this, form);
      };
      actual = redactContactData(input);
    } finally {
      String.prototype.normalize = originalNormalize;
    }
    assert.equal(
      actual,
      input,
      'every numeric callback inside an approved URL token must retain exact source bytes'
    );
    return normalizedCharacters;
  };

  const work200 = normalizeWork(200);
  const work400 = normalizeWork(400);
  const work800 = normalizeWork(800);
  assert.ok(
    work400 < work200 * 2.3 && work800 < work400 * 2.3,
    `approved-URL callback provenance must consume indexed authority rather than a growing source prefix; normalized ${work200}/${work400}/${work800} characters`
  );
  assert.ok(
    work800 < 120_000,
    `800 approved-URL callbacks must remain bounded after the one-token census; normalized ${work800} source characters`
  );
}


// PR2231 V124 punctuation-free narrative-prefix fast path
{
  const narrativePrefixSliceWork = transitionCount => {
    const input = `Archive (${'03-6216-8041🙂'.repeat(transitionCount)}`;
    const originalSlice = String.prototype.slice;
    let prefixCharacters = 0;
    let prefixSlices = 0;
    let actual;
    try {
      String.prototype.slice = function countedSlice(start, end) {
        const source = String(this);
        if (source === input
            && start === 0
            && Number.isInteger(end)
            && end > 0
            && new Error().stack.includes('currentNarrativeParenthesisDepth')) {
          prefixSlices += 1;
          prefixCharacters += Math.min(source.length, end);
        }
        return originalSlice.call(this, start, end);
      };
      actual = redactContactData(input);
    } finally {
      String.prototype.slice = originalSlice;
    }
    assert.equal(
      actual.match(/\[contact omitted\]/gu)?.length,
      transitionCount,
      'every callback after one unmatched opener must retain its telephone redaction'
    );
    return { prefixCharacters, prefixSlices };
  };

  const work200 = narrativePrefixSliceWork(200);
  const work400 = narrativePrefixSliceWork(400);
  const work800 = narrativePrefixSliceWork(800);
  const work1600 = narrativePrefixSliceWork(1600);
  assert.deepEqual(
    [work200.prefixSlices, work400.prefixSlices, work800.prefixSlices, work1600.prefixSlices],
    [0, 0, 0, 0],
    'punctuation-free callbacks must use indexed source depth without slicing any growing narrative prefix'
  );
  assert.equal(
    work200.prefixCharacters + work400.prefixCharacters
      + work800.prefixCharacters + work1600.prefixCharacters,
    0,
    'the punctuation-free fast path must perform zero cumulative source-prefix copying'
  );
}

for (const [input, expected] of [
  ['Phone: 03-6216-8041//03-6216-8041', 'Phone: [contact omitted]//[contact omitted]'],
  ['Archive 03-6216-8041//03-6216-8041', 'Archive [contact omitted]//[contact omitted]'],
  ['電話番号：０３－６２１６－８０４１／／０９０－１２３４－５６７８', '電話番号：[contact omitted]／／[contact omitted]'],
  ['https://example.test/03-6216-8041//03-6216-8041', 'https://example.test/03-6216-8041//03-6216-8041'],
  ['//example.test/03-6216-8041//03-6216-8041', '//example.test/03-6216-8041//03-6216-8041'],
  ['Archive +33 1.42.68.53.00/17-20', 'Archive +33 1.42.68.53.00/17-20'],
  ['ID: 09012345678//03-6216-8041', 'ID: 09012345678//[contact omitted]'],
  ['Phone: ID: 09012345678//03-6216-8041', 'Phone: ID: [contact omitted]//[contact omitted]']
]) {
  assert.equal(redactContactData(input), expected, 'neutral interior double slashes must not mint URL custody while anchored URLs and numeric-path refusals remain intact');
}

// PR2231 V126 candidate-atomic weak-range wrapper custody
for (const [name, input, expected] of [
  [
    'unowned square closer cannot split identifier weak-range custody',
    'ID: 123-45678/62-16]-03-6216-8041',
    'ID: 123-45678/62-16]-03-6216-8041'
  ],
  [
    'mismatched square closer cannot split parenthesis ownership',
    'ID: 123-45678/(62-16]-03-6216-8041',
    'ID: 123-45678/(62-16]-03-6216-8041'
  ],
  [
    'surplus square closer cannot mint a fresh telephone callback',
    'ID: 123-45678/[62-16]]-03-6216-8041',
    'ID: 123-45678/[62-16]]-03-6216-8041'
  ],
  [
    'unowned brace closer cannot split identifier weak-range custody',
    'ID: 123-45678/62-16}-03-6216-8041',
    'ID: 123-45678/62-16}-03-6216-8041'
  ],
  [
    'unowned corner closer cannot split Japanese identifier custody',
    '管理番号：１２３－４５６７８／６２－１６】－０３－６２１６－８０４１',
    '管理番号：１２３－４５６７８／６２－１６】－０３－６２１６－８０４１'
  ],
  [
    'punctuation before an owned parenthesis invalidates the boundary',
    'ID: 123-45678/(62-16-)-03-6216-8041',
    'ID: 123-45678/(62-16-)-03-6216-8041'
  ],
  [
    'period before an owned parenthesis invalidates the boundary',
    'ID: 123-45678/(62-16.)-03-6216-8041',
    'ID: 123-45678/(62-16.)-03-6216-8041'
  ],
  [
    'slash before an owned square closer invalidates the boundary',
    'ID: 123-45678/[62-16/]-03-6216-8041',
    'ID: 123-45678/[62-16/]-03-6216-8041'
  ],
  [
    'punctuation between nested owned closers invalidates LIFO custody',
    'ID: 123-45678/([62-16]-)-03-6216-8041',
    'ID: 123-45678/([62-16]-)-03-6216-8041'
  ],
  [
    'an invalid closer cannot borrow a later slash boundary',
    'ID: 123-45678/[62-16]]/03-6216-8041',
    'ID: 123-45678/[62-16]]/03-6216-8041'
  ],
  [
    'clean square ownership retains the later telephone interval',
    'ID: 123-45678/[62-16]-03-6216-8041',
    'ID: 123-45678/[62-16]-[contact omitted]'
  ],
  [
    'clean brace ownership retains the later telephone interval',
    'ID: 123-45678/{62-16}-03-6216-8041',
    'ID: 123-45678/{62-16}-[contact omitted]'
  ],
  [
    'clean corner ownership retains the later telephone interval',
    'ID: 123-45678/【62-16】-03-6216-8041',
    'ID: 123-45678/【62-16】-[contact omitted]'
  ],
  [
    'clean nested mixed wrappers close in LIFO order',
    'ID: 123-45678/([{62-16}])-03-6216-8041',
    'ID: 123-45678/([{62-16}])-[contact omitted]'
  ],
  [
    'spacing before the first owned closer remains admissible',
    'ID: 123-45678/(62-16 )-03-6216-8041',
    'ID: 123-45678/(62-16 )-[contact omitted]'
  ],
  [
    'fullwidth clean wrapper ownership retains the later phone',
    'ＩＤ：１２３－４５６７８／［６２－１６］－０３－６２１６－８０４１',
    'ＩＤ：１２３－４５６７８／［６２－１６］－[contact omitted]'
  ],
  [
    'strong wrapped observation replays the predecessor scanner',
    'Archive [2026-08-17]-03-6216-8041',
    'Archive [2026-08-17]-[contact omitted]'
  ],
  [
    'non-identifier invalid closer retains predecessor telephone behavior',
    'Archive 62-16]-03-6216-8041',
    'Archive 62-16]-[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: wrapper punctuation must remain in one exact source-custody decision`
  );
}

// PR2231 V126 candidate-relative approved URL origin custody
for (const [name, input, expected] of [
  [
    'HTTPS origin after an equals sign cannot protect a preceding labelled phone',
    'Phone: 03-6216-8041=https://example.test/03-6216-8041',
    'Phone: [contact omitted]=https://example.test/03-6216-8041'
  ],
  [
    'HTTPS origin after a semicolon cannot protect a preceding unlabelled phone',
    'Archive 03-6216-8041;https://example.test/03-6216-8041',
    'Archive [contact omitted];https://example.test/03-6216-8041'
  ],
  [
    'HTTPS origin after a pipe cannot protect a preceding labelled phone',
    'Phone: 03-6216-8041|https://example.test/x',
    'Phone: [contact omitted]|https://example.test/x'
  ],
  [
    'scheme-relative origin after a colon cannot protect a preceding phone',
    'Phone: 03-6216-8041://03-6216-8041',
    'Phone: [contact omitted]://03-6216-8041'
  ],
  [
    'scheme-relative origin after a semicolon cannot protect a preceding phone',
    'Phone: 03-6216-8041;//03-6216-8041',
    'Phone: [contact omitted];//03-6216-8041'
  ],
  [
    'scheme-relative host after an equals sign retains only suffix custody',
    'Phone: 03-6216-8041=//example.test/03-6216-8041',
    'Phone: [contact omitted]=//example.test/03-6216-8041'
  ],
  [
    'scheme-relative host after a comma retains only suffix custody',
    'Phone: 03-6216-8041,//example.test/03-6216-8041',
    'Phone: [contact omitted],//example.test/03-6216-8041'
  ],
  [
    'wrapped HTTPS origin retains only suffix custody',
    'Phone: 03-6216-8041<https://example.test/03-6216-8041',
    'Phone: [contact omitted]<https://example.test/03-6216-8041'
  ],
  [
    'quoted HTTPS origin retains only suffix custody',
    'Phone: 03-6216-8041="https://example.test/03-6216-8041',
    'Phone: [contact omitted]="https://example.test/03-6216-8041'
  ],
  [
    'fullwidth approved origin retains exact source coordinates',
    '電話番号：０３－６２１６－８０４１＝ｈｔｔｐｓ：／／ｅｘａｍｐｌｅ．ｔｅｓｔ／０３－６２１６－８０４１',
    '電話番号：[contact omitted]＝ｈｔｔｐｓ：／／ｅｘａｍｐｌｅ．ｔｅｓｔ／０３－６２１６－８０４１'
  ],
  [
    'legacy URL introducer remains approved at its exact origin',
    'URL:https://example.test/03-6216-8041',
    'URL:https://example.test/03-6216-8041'
  ],
  [
    'token-leading wrapper still preserves a complete approved origin',
    '!https://example.test/03-6216-8041',
    '!https://example.test/03-6216-8041'
  ],
  [
    'boundary-anchored scheme-relative URL remains protected',
    '//example.test/03-6216-8041',
    '//example.test/03-6216-8041'
  ],
  [
    'identifier custody remains intact before a later approved URL',
    'ID: 09012345678=https://example.test/03-6216-8041',
    'ID: 09012345678=https://example.test/03-6216-8041'
  ],
  [
    'telephone label still overrides identifier custody before a later URL',
    'Phone: ID: 09012345678=https://example.test/03-6216-8041',
    'Phone: ID: [contact omitted]=https://example.test/03-6216-8041'
  ],
  [
    'bare-domain origin after an equals sign retains only suffix custody',
    'Phone: 03-6216-8041=example.test/03-6216-8041',
    'Phone: [contact omitted]=example.test/03-6216-8041'
  ],
  [
    'IPv4 origin after an equals sign retains only suffix custody',
    'Phone: 03-6216-8041=192.0.2.1/03-6216-8041',
    'Phone: [contact omitted]=192.0.2.1/03-6216-8041'
  ],
  [
    'embedded email inside a later approved URL keeps URL-local custody',
    'Phone: 03-6216-8041=https://alice@example.com/03-6216-8041',
    'Phone: [contact omitted]=https://alice@example.com/03-6216-8041'
  ],
  [
    'unsupported scheme grants no custody before or after its origin',
    'Phone: 03-6216-8041=mailto://example.test/03-6216-8041',
    'Phone: [contact omitted]=mailto://example.test/[contact omitted]'
  ],
  [
    'country-code phone before a later URL retains its complete redaction interval',
    'Phone: +1 212 555 1234=https://example.test/03-6216-8041',
    'Phone: [contact omitted]=https://example.test/03-6216-8041'
  ],
  [
    'V125 neutral interior double slash repair remains cumulative',
    'Phone: 03-6216-8041//03-6216-8041',
    'Phone: [contact omitted]//[contact omitted]'
  ],
  [
    'numeric IPv4-like path refusal remains cumulative',
    'Archive +33 1.42.68.53.00/17-20',
    'Archive +33 1.42.68.53.00/17-20'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: approved URL authority must begin at the exact indexed source origin`
  );
}


// PR2231 V128 later-phone opener custody and indexed embedded-email URL bounds
for (const [name, input, expected] of [
  [
    'square-wrapped later phone retains its opener after a clean weak-range closer',
    'ID: 123-45678/[62-16]-[03-6216-8041]',
    'ID: 123-45678/[62-16]-[[contact omitted]]'
  ],
  [
    'brace-wrapped later phone retains its opener after a clean weak-range closer',
    'ID: 123-45678/[62-16]-{03-6216-8041}',
    'ID: 123-45678/[62-16]-{[contact omitted]}'
  ],
  [
    'corner-wrapped later phone retains its opener after a clean weak-range closer',
    'ID: 123-45678/[62-16]-【03-6216-8041】',
    'ID: 123-45678/[62-16]-【[contact omitted]】'
  ],
  [
    'fullwidth square-wrapped later phone retains its exact source wrapper',
    'ＩＤ：１２３－４５６７８／［６２－１６］－［０３－６２１６－８０４１］',
    'ＩＤ：１２３－４５６７８／［６２－１６］－［[contact omitted]］'
  ],
  [
    'wrapped bare tail gains no telephone authority after a clean weak range',
    'ID: 123-45678/[62-16]-[12345678]',
    'ID: 123-45678/[62-16]-[12345678]'
  ],
  [
    'dirty weak-range suffix cannot borrow a later phone wrapper',
    'ID: 123-45678/[62-16-]-[03-6216-8041]',
    'ID: 123-45678/[62-16-]-[03-6216-8041]'
  ],
  [
    'mismatched weak-range closer cannot borrow a later phone wrapper',
    'ID: 123-45678/(62-16]-[03-6216-8041]',
    'ID: 123-45678/(62-16]-[03-6216-8041]'
  ],
  [
    'surplus weak-range closer cannot borrow a later phone wrapper',
    'ID: 123-45678/[62-16]]-[03-6216-8041]',
    'ID: 123-45678/[62-16]]-[03-6216-8041]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the clean observation closer must stop before the external opener owned by the validated later phone`
  );
}

{
  const shrinkingPrefix = 'ｶﾞ'.repeat(20);
  const input = `https://example.test/${shrinkingPrefix}alice@example.com/03-6216-8041`;
  assert.equal(
    redactContactData(input),
    input,
    'embedded-email URL custody must compare approved-origin and email bounds in original source coordinates'
  );
}

assert.equal(
  redactContactData('alice@example.com=https://example.test/03-6216-8041'),
  '[contact omitted]=https://example.test/03-6216-8041',
  'an email before the indexed URL origin must not inherit suffix URL custody'
);

{
  const repetitions = 1000;
  const input = `https://example.test/${'a@b.com/'.repeat(repetitions)}03-6216-8041`;
  const originalNormalize = String.prototype.normalize;
  let normalizedCharacters = 0;
  let actual;
  try {
    String.prototype.normalize = function countedNormalize(form) {
      normalizedCharacters += String(this).length;
      return originalNormalize.call(this, form);
    };
    actual = redactContactData(input);
  } finally {
    String.prototype.normalize = originalNormalize;
  }
  assert.equal(
    actual,
    input,
    'every embedded email and numeric path inside one approved URL token must retain exact source bytes'
  );
  assert.ok(
    normalizedCharacters < input.length * 30,
    `embedded-email callbacks must reuse one token-boundary and origin index; normalized ${normalizedCharacters} characters for ${input.length} source characters`
  );
}


// PR2231 V129 malformed-scheme and whole-segment NFKC origin custody
for (const [name, input, expected] of [
  [
    'approved-looking interior scheme cannot be parsed as a bare-host TLD',
    'Phone: 03-6216-8041.https://example.test/03-6216-8041',
    'Phone: [contact omitted].https://example.test/[contact omitted]'
  ],
  [
    'unsupported interior scheme cannot be parsed as a bare-host TLD',
    'Phone: 03-6216-8041.mailto://example.test/03-6216-8041',
    'Phone: [contact omitted].mailto://example.test/[contact omitted]'
  ],
  [
    'bare-domain port custody remains approved',
    'example.test:443/03-6216-8041',
    'example.test:443/03-6216-8041'
  ],
  [
    'IPv4 port custody remains approved',
    '192.0.2.1:443/03-6216-8041',
    '192.0.2.1:443/03-6216-8041'
  ],
  [
    'bare-domain pseudo-scheme cannot retain a numeric path',
    'example.test://03-6216-8041',
    'example.test://[contact omitted]'
  ],
  [
    'IPv4 pseudo-scheme cannot retain a numeric path',
    '192.0.2.1://03-6216-8041',
    '192.0.2.1://[contact omitted]'
  ],
  [
    'candidate-relative HTTPS origin remains approved after an equals boundary',
    'Phone: 03-6216-8041=https://example.test/03-6216-8041',
    'Phone: [contact omitted]=https://example.test/03-6216-8041'
  ],
  [
    'candidate-relative scheme-relative origin remains approved after a semicolon boundary',
    'Phone: 03-6216-8041;//03-6216-8041',
    'Phone: [contact omitted];//03-6216-8041'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: only an approved URL origin or numeric host port may acquire URL custody`
  );
}

// PR2231 V130 earliest complete URL-origin precedence
for (const [name, input] of [
  [
    'bare-domain origin outranks a later unsupported-looking path substring',
    'example.test/path/bogus://x/03-6216-8041'
  ],
  [
    'www origin outranks a later unsupported-looking path substring',
    'www.example.test/path/mailto://x/03-6216-8041'
  ],
  [
    'IPv4 origin outranks a later unsupported-looking path substring',
    '192.0.2.1/path/ftp://x/03-6216-8041'
  ],
  [
    'boundary-anchored scheme-relative origin outranks later path syntax',
    '//example.test/path/bogus://x/03-6216-8041'
  ],
  [
    'legacy URL introducer retains the earlier bare-host origin',
    'URL:example.test/path/bogus://x/03-6216-8041'
  ],
  [
    'quoted legacy URL introducer retains the earlier bare-host origin',
    'URL:"example.test/path/bogus://x/03-6216-8041'
  ],
  [
    'root-dot and numeric-port origin outranks later path syntax',
    'example.test.:443/path/bogus://x/03-6216-8041'
  ],
  [
    'wrapped approved origin retains exact source bytes',
    '[example.test/path/bogus://x/03-6216-8041]'
  ],
  [
    'fullwidth approved origin retains exact source bytes',
    'ｅｘａｍｐｌｅ．ｔｅｓｔ／path／bogus：／／x／０３－６２１６－８０４１'
  ]
]) {
  assert.equal(
    redactContactData(input),
    input,
    `${name}: later path text cannot revoke URL custody established at the earliest complete origin`
  );
}

for (const [name, input, expected] of [
  [
    'host pseudo-scheme remains unsupported',
    'example.test://03-6216-8041',
    'example.test://[contact omitted]'
  ],
  [
    'IPv4 pseudo-scheme remains unsupported',
    '192.0.2.1://03-6216-8041',
    '192.0.2.1://[contact omitted]'
  ],
  [
    'interior approved-looking scheme remains unsupported before any valid origin',
    'Phone: 03-6216-8041.https://example.test/03-6216-8041',
    'Phone: [contact omitted].https://example.test/[contact omitted]'
  ],
  [
    'host-only phone-shaped prefix does not acquire new URL custody',
    'Phone: 03-6216-8041.example.test',
    'Phone: [contact omitted].example.test'
  ],
  [
    'earlier unsupported scheme outranks a later approved origin',
    'mailto://example.test/03-6216-8041=https://example.test/03-6216-8041',
    'mailto://example.test/[contact omitted]=https://example.test/[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: unsupported syntax must still win when it begins before the first complete approved origin`
  );
}

{
  const repetitions = 1000;
  const input = `example.test/path/${'bogus://x/'.repeat(repetitions)}03-6216-8041`;
  const originalNormalize = String.prototype.normalize;
  let normalizedCharacters = 0;
  let actual;
  try {
    String.prototype.normalize = function countedNormalize(form) {
      normalizedCharacters += String(this).length;
      return originalNormalize.call(this, form);
    };
    actual = redactContactData(input);
  } finally {
    String.prototype.normalize = originalNormalize;
  }
  assert.equal(
    actual,
    input,
    'an approved leading host must retain custody across every later path substring'
  );
  assert.ok(
    normalizedCharacters < input.length * 20,
    `earliest-origin classification must not reparse every later path delimiter; normalized ${normalizedCharacters} characters for ${input.length} source characters`
  );
}

for (const [name, contraction] of [
  ['halfwidth katakana voiced pair', 'ｶﾞ'],
  ['Kannada vowel-sign pair', '\u0CC6\u0CD5']
]) {
  const prefix = contraction.repeat(15);
  const input = `${prefix}:03-6216-8041=https://example.test/03-6216-8041`;
  assert.equal(
    redactContactData(input),
    `${prefix}:[contact omitted]=https://example.test/03-6216-8041`,
    `${name}: grapheme-segment NFKC mapping must not move a later URL origin backward across a phone`
  );
}


// PR2231 V129 quoted legacy URL-origin boundary
for (const [name, input, expected] of [
  [
    'curly-quoted HTTPS origin after a source delimiter retains suffix custody',
    'Phone: 03-6216-8041=“https://example.test/03-6216-8041',
    'Phone: [contact omitted]=“https://example.test/03-6216-8041'
  ],
  [
    'single-quoted HTTPS origin after a source delimiter retains suffix custody',
    "Phone: 03-6216-8041='https://example.test/03-6216-8041",
    "Phone: [contact omitted]='https://example.test/03-6216-8041"
  ],
  [
    'quoted unsupported scheme grants no numeric-path custody',
    'Phone: 03-6216-8041="mailto://example.test/03-6216-8041',
    'Phone: [contact omitted]="mailto://example.test/[contact omitted]'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: quote wrappers may carry an approved HTTP origin only from an established source delimiter`
  );
}

// PR2231 V131 explicit phone-label precedence over ambiguous bare-host prefixes
for (const [name, input, expected] of [
  [
    'hyphenated labelled phone defeats a bare-host interpretation at the indexed origin',
    'Phone: 03-6216-8041.example.test/03-6216-8041',
    'Phone: [contact omitted].example.test/03-6216-8041'
  ],
  [
    'compact labelled phone defeats a bare-host interpretation at the indexed origin',
    'Phone: 0362168041.example.test/03-6216-8041',
    'Phone: [contact omitted].example.test/03-6216-8041'
  ],
  [
    'dotted labelled phone defeats the complete phone-shaped host prefix',
    'Phone: 03.6216.8041.example.test/03-6216-8041',
    'Phone: [contact omitted].example.test/03-6216-8041'
  ],
  [
    'dotted UK phone retains the domain suffix after its exact interval',
    'Phone: 020.7946.0958.example.test/03-6216-8041',
    'Phone: [contact omitted].example.test/03-6216-8041'
  ],
  [
    'numeric subdomain remains protected after the exact labelled phone interval',
    'Phone: 03-6216-8041.2026.example.test/03-6216-8041',
    'Phone: [contact omitted].2026.example.test/03-6216-8041'
  ],
  [
    'bare-host port and path custody resumes after the labelled phone interval',
    'Phone: 03-6216-8041.example.test:443/03-6216-8041',
    'Phone: [contact omitted].example.test:443/03-6216-8041'
  ],
  [
    'fullwidth labelled phone retains source-exact domain and path custody',
    '電話番号：０３－６２１６－８０４１．ｅｘａｍｐｌｅ．ｔｅｓｔ／０３－６２１６－８０４１',
    '電話番号：[contact omitted]．ｅｘａｍｐｌｅ．ｔｅｓｔ／０３－６２１６－８０４１'
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: explicit telephone-label provenance owns only the exact leading telephone interval`
  );
}

for (const [name, input] of [
  [
    'unlabelled genuine bare host retains complete URL custody',
    '03-6216-8041.example.test/03-6216-8041'
  ],
  [
    'identifier-labelled genuine bare host retains complete URL custody',
    'ID: 03-6216-8041.example.test/03-6216-8041'
  ],
  [
    'telephone label cannot revoke an IPv4 origin with no domain suffix',
    'Phone: 192.0.2.1/03-6216-8041'
  ],
  [
    'telephone label cannot revoke an absolute HTTPS origin',
    'Phone: https://example.test/03-6216-8041'
  ],
  [
    'telephone label cannot revoke a scheme-relative origin',
    'Phone: //example.test/03-6216-8041'
  ],
  [
    'telephone label cannot convert a complete calendar date into a phone',
    'Phone: 2026-08-17.example.test/03-6216-8041'
  ]
]) {
  assert.equal(
    redactContactData(input),
    input,
    `${name}: only one exact phone interval at an ambiguous bare-host prefix may override URL custody`
  );
}

assert.equal(
  redactContactData('Phone: 03-6216-8041.example.test'),
  'Phone: [contact omitted].example.test',
  'host-only phone-shaped text must retain the established refusal without manufacturing URL custody'
);
