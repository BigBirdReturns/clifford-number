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

console.log('industrial-exhaust tests passed');
