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

console.log('industrial-exhaust tests passed');
