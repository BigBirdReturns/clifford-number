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

console.log('industrial-exhaust tests passed');
