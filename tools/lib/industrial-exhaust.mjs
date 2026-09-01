import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const EXHAUST_SCHEMA_VERSION = 1;
export const SOURCE_CLASS = 'first_party_corporate_publication';
export const GRAPH_EFFECT = 'none';

const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'mc_cid', 'mc_eid', 'msclkid', '_hsenc', '_hsmi'
]);

const PHONE_SPAN_PATTERN = /(?:[+＋](?=\s*[0-9０-９])|[（(](?=\s*[0-9０-９]))?\s*[0-9０-９][0-9０-９()./／\s\-‐‑‒–—−－．（）]{5,}[0-9０-９](?:\s*[)）])*(?=$|[^\p{L}\p{N}]|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|(?:(?:ext(?:ension)?\.?|x)\s*[.:#：＃]?\s*[0-9０-９]))/giu;
const PHONE_EXTENSION_PATTERN = /(\[contact omitted\][\s,;:()（）.．。\-–—]*(?:(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?\s*)|(?:内線(?:番号)?\s*[:：#＃]?\s*)|(?:[#＃]\s*))(?:[（(]\s*)?)[0-9０-９]+(?:[()./／\s\-‐‑‒–—−－．（）]+[0-9０-９]+)*/giu;
const PHONE_EXTENSION_START_PATTERN = /^\s*[,;:()（）.．。\-–—]*(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?|内線(?:番号)?\s*[:：#＃]?|[#＃])\s*(?:[（(]\s*)?[0-9０-９]/iu;
const FORMATTED_NUMERIC_OBSERVATION_PATTERN = /^(?:\d{1,9}\.\d{1,6}|\d{1,3}(?:,\d{3})+(?:\.\d{1,6})?|\d{1,3},\d{1,2}|\d{1,9}\s*[-–—]\s*\d{1,9}|\d{1,2}:\d{2}(?::\d{2})?)(?=$|[^0-9])/u;
const NUMERIC_OBSERVATION_PATTERN = /^\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?(?:\s*[-–—]\s*\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?)?\s*(?:(?:people|persons?|users?|customers?|employees?|impressions?|views?|visits?|clicks?|downloads?|yen|dollars?|pounds?|euros?|percent(?:age)?|million|billion|thousand|points?|basis points?|countries|markets|offices|stores|years?|months?|days?|hours?)(?=$|[^\p{L}\p{N}])|(?:人|名|件|回|円|社|国|地域|市場|拠点|店舗|%|％))/iu;
const PHONE_LABEL_PATTERN = /(?:(?:^|\b)(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)\s*(?:number\s*)?(?:is\s*)?[:.]?\s*|(?:電話(?:番号)?|携帯(?:電話)?|ファックス|連絡先|お問い合わせ先)\s*[:.]?\s*)$/iu;
const EXPLICIT_IDENTIFIER_LABEL_PATTERN = /(?:(?:^|\b)(?:id|guid|identifier|reference|revision|release(?:\s+id)?|record(?:\s+id)?|receipt|sha(?:-?256)?|hash|ticket|case|invoice|order|code)|(?:識別子|参照(?:番号)?|管理番号|受付番号|注文番号|案件番号|コード))\s*[:：=#＃-]?\s*(?:(?:\(|\[|\{|（|［|【)\s*)*$/iu;
const DATE_LIKE_PATTERN = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/u;
const DATE_OBSERVATION_PATTERN = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?=$|[^0-9])/u;
const DIGIT_RUN_PATTERN = /[0-9０-９]+/gu;
const MAX_PHONE_DIGIT_GROUPS = 17;
const MAX_NUMERIC_OBSERVATION_SOURCE_CHARS = 256;

const EVENT_RULES = [
  ['product_launch', /\b(launch(?:es|ed|ing)?|unveil(?:s|ed|ing)?|introduc(?:e|es|ed|ing)|release(?:s|d|ing)?|new (?:product|service|solution|platform|tool|model|capability))\b/iu],
  ['partnership_vendor', /\b(partner(?:s|ed|ing|ship)?|collaborat(?:e|es|ed|ion)|alliance|vendor|supplier|integration)\b/iu],
  ['client_customer', /\b(client|customer|advertiser|brand partner|deployment)\b/iu],
  ['leadership_role', /\b(appoint(?:s|ed|ment)?|president|chief executive|\bceo\b|managing director|executive officer|leadership|director)\b/iu],
  ['geography_rollout', /\b(global rollout|rollout|first market|launch market|international expansion|regional expansion|across markets)\b/iu],
  ['dataset_input', /\b(dataset|panel data|audience data|first-party data|third-party data|intent data|identity data|\bccs\b)\b/iu],
  ['validation_metric', /\b(validation|validate|benchmark|correlation|accuracy|holdout|confidence interval|metric|percent|percentage)\b/iu],
  ['acquisition_investment', /\b(acquir(?:e|es|ed|ing)|acquisition|invest(?:s|ed|ment)|funding|stake|divest(?:s|ed|ment))\b/iu],
  ['ir_capital', /\b(financial results|earnings|dividend|share buyback|repurchase|capital allocation|securities|investor relations|mid-term management plan)\b/iu],
  ['governance_privacy', /\b(governance|privacy|data protection|responsible ai|ethics|compliance|audit|assurance|security)\b/iu],
  ['regulatory_incident', /\b(regulator|regulatory|investigation|breach|incident|fine|sanction|enforcement|complaint)\b/iu]
];

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

export function contentId(prefix, ...parts) {
  return `${prefix}_${sha256(parts.map(part => String(part ?? '')).join('|')).slice(0, 24)}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function decodeXmlEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', copy: '©', reg: '®', trade: '™'
  };
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/giu, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
        try { return String.fromCodePoint(codePoint); } catch { return match; }
      }
      return match;
    }
    return Object.hasOwn(named, entity.toLowerCase()) ? named[entity.toLowerCase()] : match;
  });
}

function normalizedDigitGroups(value) {
  return value.normalize('NFKC').match(/\d+/gu) ?? [];
}


function normalizedWrappedNumericTail(value) {
  return value.normalize('NFKC').trim()
    .replace(/^\(\s*/u, '')
    .replace(/\s*\)$/u, '');
}

function hasNarrativeNumericContinuation(value) {
  return /^\d+(?:\s*\))?(?:\s+|(?=[\p{L}]))[\p{L}]/u.test(
    value.normalize('NFKC').trim()
  );
}

function isSentenceSeparatedNumericTail(value, separator, contextualTail) {
  return /^\d/u.test(normalizedWrappedNumericTail(value))
    && /[.!?。！？]\s*(?:[+\-‐‑‒–—−－]\s*)?(?:\(\s*(?:[+\-‐‑‒–—−－]\s*)?)?$/u.test(
      separator.normalize('NFKC')
    )
    && hasNarrativeNumericContinuation(contextualTail);
}


function isDottedContactContinuation(value, separator, groups, index, contextualTail) {
  const normalizedTail = normalizedWrappedNumericTail(value);
  const normalizedSeparator = separator.normalize('NFKC');
  if (/^(?:19|20)\d{2}$/u.test(normalizedTail)) return false;
  if (!/^(?:\s*\)\s*)?\.\s*(?:\(\s*)?$/u.test(normalizedSeparator)) return false;
  if (/\(\s*$/u.test(normalizedSeparator)
      && hasNarrativeNumericContinuation(contextualTail)) return false;
  if (/^\d{3,4}$/u.test(normalizedTail)) return true;
  if (!/^\d{2}$/u.test(normalizedTail) || index < 3) return false;
  return groups.slice(index - 3, index + 1).every(group =>
    /^\d{2}$/u.test(group[0].normalize('NFKC'))
  );
}

function internationalAccessPrefixCandidates(value) {
  const candidates = [];
  for (const prefix of ['0011', '011', '010', '00']) {
    if (!value.startsWith(prefix)) continue;
    const nextDigit = value.slice(prefix.length)
      .match(/^[\s()./／\-‐‑‒–—−－．（）]*([0-9])/u)?.[1];
    if (nextDigit && nextDigit !== '0') candidates.push(prefix.length);
  }
  return candidates;
}

function internationalAccessPrefixLength(value) {
  const digitCount = value.replace(/\D/gu, '').length;
  return internationalAccessPrefixCandidates(value).find(length => {
    const trunkPrefixDigits = hasInternationalTrunkPrefix(value, length) ? 1 : 0;
    const effectiveDigitLength = digitCount - length - trunkPrefixDigits;
    return effectiveDigitLength >= 7 && effectiveDigitLength <= 15;
  }) ?? 0;
}

function isInternationalPhoneCandidate(value) {
  return value.startsWith('+') || internationalAccessPrefixCandidates(value).length > 0;
}

function hasInternationalTrunkPrefix(value, accessPrefixDigits) {
  const remainder = value.startsWith('+') ? value.slice(1) : value.slice(accessPrefixDigits);
  return /^\s*\d{1,3}\s*\(\s*0\s*\)/u.test(remainder);
}

const MAX_PHONE_LABEL_CONTEXT_CHARS = 16 * 1024;
const MAX_PHONE_LABEL_PROVENANCE_CHARS = 64 * 1024;
const MAX_IDENTIFIER_LABEL_CHAIN_LABELS = 4096;
const LABEL_SEPARATOR_CHARACTER_PATTERN = /[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const SUBSTANTIVE_LABEL_SEPARATOR_CHARACTER_PATTERN = /[,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\(\[\{（［【]/u;
const OBSERVATION_WRAPPER_PAIRS = Object.freeze({
  '(': ')',
  '[': ']',
  '{': '}',
  '【': '】'
});
const OBSERVATION_WRAPPER_CLOSERS = new Map(
  Object.entries(OBSERVATION_WRAPPER_PAIRS).map(
    ([opener, closer]) => [closer, opener]
  )
);

function hasUrlTokenPrefixContext(normalizedPrefix) {
  // The candidate-level refusal retains the established suffix-compatible URL
  // grammar. Some accepted phone spellings resemble an IPv4 path only after
  // their first numeric component is omitted, and existing same-candidate
  // refusal controls rely on this conservative interpretation.
  const tokenStart = nonWhitespaceTokenStart(normalizedPrefix);
  const terminalToken = normalizedPrefix.slice(tokenStart);
  return /(?:(?:https?:)?\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*$/iu.test(
    terminalToken
  );
}

function hasUrlTokenBoundaryPrefixContext(normalizedPrefix) {
  // Telephone scoring needs a stronger provenance proof: a scheme or host must
  // begin at the terminal token boundary. This prevents a dotted identifier
  // such as `1.42.68.53.00/` from minting IPv4 custody from the interior suffix
  // `42.68.53.00/` when a later plus-prefixed phone enters a new callback.
  const tokenStart = nonWhitespaceTokenStart(normalizedPrefix);
  const terminalToken = normalizedPrefix.slice(tokenStart);
  return /^(?:(?:https?:)?\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*$/iu.test(
    terminalToken
  );
}

function emailMatchHasDirectUrlCustody(input, offset, length) {
  const tokenStart = nonWhitespaceTokenStart(input, offset);
  let tokenEnd = offset + length;
  while (tokenEnd < input.length && !/\s/u.test(input[tokenEnd])) tokenEnd += 1;

  const token = input.slice(tokenStart, tokenEnd).normalize('NFKC');
  const relativeStart = offset - tokenStart;
  const relativeEnd = relativeStart + length;
  const directUrlPattern = /(?:^|[<([{=:;,|])((?:(?:https?:)?\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*)/giu;
  for (const match of token.matchAll(directUrlPattern)) {
    const directUrl = match[1];
    const directUrlStart = match.index + match[0].length - directUrl.length;
    const directUrlEnd = directUrlStart + directUrl.length;
    if (directUrlStart <= relativeStart && directUrlEnd >= relativeEnd) return true;
  }
  return false;
}

function nonWhitespaceTokenStart(value, end = value.length) {
  let start = Math.min(Math.max(0, end), value.length);
  while (start > 0 && !/\s/u.test(value[start - 1])) start -= 1;
  return start;
}

function previousNonWhitespaceTokenBounds(value, end = value.length) {
  let tokenEnd = Math.min(Math.max(0, end), value.length);
  while (tokenEnd > 0 && /\s/u.test(value[tokenEnd - 1])) tokenEnd -= 1;
  if (tokenEnd <= 0) return null;
  return {
    start: nonWhitespaceTokenStart(value, tokenEnd),
    end: tokenEnd
  };
}

function previousCodePoint(value, end = value.length) {
  const boundedEnd = Math.min(Math.max(0, end), value.length);
  if (boundedEnd <= 0) return '';
  let start = boundedEnd - 1;
  const last = value.charCodeAt(start);
  if (last >= 0xdc00 && last <= 0xdfff && start > 0) {
    const prior = value.charCodeAt(start - 1);
    if (prior >= 0xd800 && prior <= 0xdbff) start -= 1;
  }
  return value.slice(start, boundedEnd);
}

function hasUrlTokenPrefixContextAt(normalizedPrefix, end, tokenCache = null) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  if (tokenCache?.urlContext === false
      && boundedEnd >= tokenCache.start
      && boundedEnd <= tokenCache.end) return false;

  const tokenStart = nonWhitespaceTokenStart(normalizedPrefix, boundedEnd);
  const urlContext = hasUrlTokenPrefixContext(
    normalizedPrefix.slice(tokenStart, boundedEnd)
  );
  if (tokenCache) {
    tokenCache.start = tokenStart;
    tokenCache.end = boundedEnd;
    tokenCache.urlContext = urlContext;
  }
  return urlContext;
}

function terminalIdentifierLabelEnd(normalizedPrefix, end) {
  let cursor = Math.min(Math.max(0, end), normalizedPrefix.length);
  let wrapperStart = cursor;
  let foundWrapper = false;

  while (cursor > 0) {
    let wrapperIndex = cursor;
    while (wrapperIndex > 0 && /\s/u.test(normalizedPrefix[wrapperIndex - 1])) {
      wrapperIndex -= 1;
    }
    if (wrapperIndex <= 0
        || !OPENING_IDENTIFIER_WRAPPER_PATTERN.test(
          normalizedPrefix[wrapperIndex - 1]
        )) break;

    foundWrapper = true;
    wrapperStart = wrapperIndex - 1;
    cursor = wrapperStart;
  }

  return foundWrapper ? wrapperStart : end;
}

function explicitIdentifierLabelMatchAt(
  normalizedPrefix,
  end = normalizedPrefix.length,
  urlTokenCache = null
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const labelEnd = terminalIdentifierLabelEnd(normalizedPrefix, boundedEnd);
  const windowStart = Math.max(0, labelEnd - 128);
  const window = normalizedPrefix.slice(windowStart, labelEnd);
  const match = window.match(EXPLICIT_IDENTIFIER_LABEL_PATTERN);
  if (!match || match.index == null) return match;

  const absoluteMatchIndex = windowStart + match.index;
  const previousCharacter = normalizedPrefix.slice(
    Math.max(0, absoluteMatchIndex - 1),
    absoluteMatchIndex
  );
  if (absoluteMatchIndex > 0
      && /[\p{L}\p{N}_]/u.test(previousCharacter)) return null;
  if (hasUrlTokenPrefixContextAt(
    normalizedPrefix,
    absoluteMatchIndex,
    urlTokenCache
  )) return null;

  match.absoluteIndex = absoluteMatchIndex;
  match.contextEnd = boundedEnd;
  return match;
}

function explicitIdentifierLabelMatch(normalizedPrefix) {
  return explicitIdentifierLabelMatchAt(normalizedPrefix);
}

function hasExplicitIdentifierPrefixNormalized(normalizedPrefix) {
  return Boolean(explicitIdentifierLabelMatchAt(normalizedPrefix));
}

function phoneLabelMatchWithProvenanceAt(
  normalizedPrefix,
  end = normalizedPrefix.length
) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const windowStart = Math.max(0, boundedEnd - 48);
  const window = normalizedPrefix.slice(windowStart, boundedEnd);
  const match = window.match(PHONE_LABEL_PATTERN);
  if (!match || match.index == null) return match;

  const absoluteMatchIndex = windowStart + match.index;
  if (hasUrlTokenPrefixContextAt(
    normalizedPrefix,
    absoluteMatchIndex
  )) return null;

  match.absoluteIndex = absoluteMatchIndex;
  return match;
}

function phoneLabelMatchWithProvenance(normalizedPrefix) {
  return phoneLabelMatchWithProvenanceAt(normalizedPrefix);
}

function trailingLabelSeparator(normalizedPrefix, end) {
  let start = Math.min(Math.max(0, end), normalizedPrefix.length);
  let substantive = false;
  while (start > 0) {
    const character = normalizedPrefix[start - 1];
    if (!LABEL_SEPARATOR_CHARACTER_PATTERN.test(character)) break;
    substantive ||= SUBSTANTIVE_LABEL_SEPARATOR_CHARACTER_PATTERN.test(
      character
    );
    start -= 1;
  }
  return { start, substantive };
}

function trailingIdentifierLabelChain(normalizedPrefix) {
  let cursor = normalizedPrefix.length;
  let sawIdentifierLabel = false;
  let identifierIsStandaloneId = false;
  let substantiveSeparator = false;
  let labels = 0;
  const urlTokenCache = { start: -1, end: -1, urlContext: null };
  let identifierMatch = explicitIdentifierLabelMatchAt(
    normalizedPrefix,
    cursor,
    urlTokenCache
  );

  while (identifierMatch?.absoluteIndex != null) {
    labels += 1;
    if (labels > MAX_IDENTIFIER_LABEL_CHAIN_LABELS) {
      return {
        sawIdentifierLabel: true,
        identifierIsStandaloneId,
        substantiveSeparator,
        start: cursor,
        overflow: true
      };
    }

    sawIdentifierLabel = true;
    identifierIsStandaloneId ||= /^id(?=$|[^\p{L}\p{N}_])/iu.test(
      identifierMatch[0]
    );

    const separator = trailingLabelSeparator(
      normalizedPrefix,
      identifierMatch.absoluteIndex
    );
    substantiveSeparator ||= separator.substantive;
    cursor = separator.start;
    identifierMatch = explicitIdentifierLabelMatchAt(
      normalizedPrefix,
      cursor,
      urlTokenCache
    );
  }

  return {
    sawIdentifierLabel,
    identifierIsStandaloneId,
    substantiveSeparator,
    start: cursor,
    overflow: false
  };
}

function hasPhoneLabelPrefixNormalized(normalizedPrefix) {
  if (phoneLabelMatchWithProvenanceAt(normalizedPrefix)) return true;

  const identifierChain = trailingIdentifierLabelChain(normalizedPrefix);
  if (!identifierChain.sawIdentifierLabel) return false;
  // Exhausting the bounded reverse scan cannot mint telephone authority. The
  // still-terminal identifier label remains protective at the scan boundary.
  if (identifierChain.overflow) return false;

  const phoneLabelMatch = phoneLabelMatchWithProvenanceAt(
    normalizedPrefix,
    identifierChain.start
  );
  if (!phoneLabelMatch) return false;

  const ambiguousBareContact = /(?:^|\b)contact\s*$/iu.test(
    phoneLabelMatch[0]
  );
  return identifierChain.identifierIsStandaloneId
    || !ambiguousBareContact
    || identifierChain.substantiveSeparator;
}

function hasPhoneLabelPrefix(prefix) {
  return hasPhoneLabelPrefixNormalized(prefix.normalize('NFKC'));
}

function hasPhoneLabelBeforeOpeningWrappers(normalizedPrefix) {
  const labelEnd = terminalIdentifierLabelEnd(
    normalizedPrefix,
    normalizedPrefix.length
  );
  return labelEnd < normalizedPrefix.length
    && hasPhoneLabelPrefixNormalized(normalizedPrefix.slice(0, labelEnd));
}

function stripMatchedObservationWrappers(value) {
  let normalized = value.normalize('NFKC').trim();
  while (normalized.length >= 2) {
    const closer = OBSERVATION_WRAPPER_PAIRS[normalized[0]];
    if (!closer || normalized.at(-1) !== closer) break;
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

function initialRangeProvesIntrinsicPhone(candidate, ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return false;
  const firstDigit = candidate.search(/[0-9０-９]/u);
  if (firstDigit < 0) return false;
  const initialRange = ranges.find(range =>
    range.start <= firstDigit && range.end > firstDigit
  );
  if (!initialRange) return false;

  const source = candidate.slice(initialRange.start, initialRange.end);
  if (!phoneCandidateScore(source, '', false)) return false;

  const unwrapped = stripMatchedObservationWrappers(source);
  const observation = crossCallbackObservationMatch(unwrapped);
  if (observation
      && observation[0].length === unwrapped.length
      && !isWeakBareRangeObservation(unwrapped)) return false;
  return true;
}

function provedWrappedPhoneLabelContext(prefix, candidate, ranges) {
  const normalizedPrefix = prefix.normalize('NFKC');
  return hasPhoneLabelBeforeOpeningWrappers(normalizedPrefix)
    && initialRangeProvesIntrinsicPhone(candidate, ranges);
}

function phoneCandidateScore(
  candidate,
  prefix,
  indeterminatePhoneContext = false,
  provenanceOverride = null
) {
  const normalized = candidate.trim().normalize('NFKC');
  const normalizedPrefix = provenanceOverride ? '' : prefix.normalize('NFKC');
  const digits = normalized.replace(/\D/gu, '');
  if (completeCalendarDateLike(normalized)) return 0;

  const pluses = normalized.match(/\+/gu) ?? [];
  if (pluses.length > 1 || (pluses.length === 1 && !normalized.startsWith('+'))) return 0;

  const groups = normalizedDigitGroups(normalized);
  if (!groups.length || groups.length > MAX_PHONE_DIGIT_GROUPS) return 0;

  const accessPrefixCandidates = internationalAccessPrefixCandidates(normalized);
  const accessPrefixDigits = internationalAccessPrefixLength(normalized);
  if (normalized.startsWith('+') && !/^[1-9]/u.test(digits)) return 0;
  if (!normalized.startsWith('+') && accessPrefixCandidates.length && !accessPrefixDigits) return 0;

  const labelled = indeterminatePhoneContext
    || (provenanceOverride
      ? provenanceOverride.phoneLabelContext
      : hasPhoneLabelPrefixNormalized(normalizedPrefix));
  const numericUrlContext = provenanceOverride
    ? provenanceOverride.urlContext
    : hasUrlTokenBoundaryPrefixContext(normalizedPrefix);
  if (numericUrlContext) return 0;
  const international = isInternationalPhoneCandidate(normalized);
  const parenthesized = /\(\s*\d{1,5}\s*\)/u.test(normalized);
  const explicitIdentifierContext = provenanceOverride
    ? provenanceOverride.identifierContext
    : hasExplicitIdentifierPrefixNormalized(normalizedPrefix);
  if (explicitIdentifierContext && !labelled) return 0;
  const compactDomestic = groups.length === 1
    && (/^0[1-9]\d{8}$/u.test(groups[0])
      || /^0(?:50|60|70|80|90)\d{8}$/u.test(groups[0]));
  const domesticPairGrouped = groups.length >= 4
      && groups.length <= 6
      && /^0\d$/u.test(groups[0])
      && groups.slice(1).every(group => /^\d{2}$/u.test(group));
    const domesticGrouped = (groups.length === 2
      && /^0\d{1,4}$/u.test(groups[0])
      && /^\d{6,8}$/u.test(groups[1]))
    || (groups.length === 3
      && /^0\d{1,4}$/u.test(groups[0])
      && /^\d{2,5}$/u.test(groups[1])
      && /^\d{3,5}$/u.test(groups[2]))
    || domesticPairGrouped;
  const northAmericanGrouped = (groups.length === 3
      && groups[0].length === 3 && groups[1].length === 3 && groups[2].length === 4)
    || (groups.length === 4 && groups[0] === '1'
      && groups[1].length === 3 && groups[2].length === 3 && groups[3].length === 4);

  let base = 0;
  if (labelled) base = Math.max(base, 700);
  if (international) base = Math.max(base, 650);
  if (parenthesized) base = Math.max(base, 600);
  if (compactDomestic || domesticGrouped || northAmericanGrouped) base = Math.max(base, 550);
  if (!base) return 0;

  const trunkPrefixDigits = hasInternationalTrunkPrefix(normalized, accessPrefixDigits) ? 1 : 0;
  const effectiveDigitLength = digits.length - accessPrefixDigits - trunkPrefixDigits;
  if (effectiveDigitLength < 7 || effectiveDigitLength > 15) return 0;
  const idealMinimum = international ? 8 : 7;
  const idealMaximum = international ? 15 : 11;
  const distanceFromBand = effectiveDigitLength < idealMinimum
    ? idealMinimum - effectiveDigitLength
    : Math.max(0, effectiveDigitLength - idealMaximum);
  const digitFit = 44 - distanceFromBand * 6;
  const lastLength = groups.at(-1).length;
  const terminalBonus = lastLength === 4 ? 12 : lastLength === 3 ? 8 : lastLength === 2 ? 4 : 0;
  return base + digitFit + terminalBonus - groups.length * 2;
}

function sourceEndForNormalizedPrefix(source, normalizedLength) {
  let sourceEnd = 0;
  let normalizedEnd = 0;
  for (const character of source) {
    if (normalizedEnd >= normalizedLength) break;
    sourceEnd += character.length;
    normalizedEnd += character.normalize('NFKC').length;
  }
  return sourceEnd;
}

function calendarDateParts(source) {
  const yearFirst = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?=$|[^0-9])/u.exec(
    source
  );
  if (yearFirst) {
    return {
      match: yearFirst,
      year: Number.parseInt(yearFirst[1], 10),
      month: Number.parseInt(yearFirst[2], 10),
      day: Number.parseInt(yearFirst[3], 10)
    };
  }

  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?=$|[^0-9])/u.exec(
    source
  );
  return dayFirst
    ? {
        match: dayFirst,
        year: Number.parseInt(dayFirst[3], 10),
        month: Number.parseInt(dayFirst[2], 10),
        day: Number.parseInt(dayFirst[1], 10)
      }
    : null;
}

function completeCalendarDateObservationMatch(source) {
  const parts = calendarDateParts(source);
  if (!parts) return null;
  if (parts.month < 1 || parts.month > 12 || parts.day < 1) return null;

  const leapYear = parts.year % 4 === 0
    && (parts.year % 100 !== 0 || parts.year % 400 === 0);
  const monthLengths = [
    0, 31, leapYear ? 29 : 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31
  ];
  return parts.day <= monthLengths[parts.month] ? parts.match : null;
}

function completeCalendarDateLike(source) {
  const match = completeCalendarDateObservationMatch(source);
  return Boolean(match && match[0].length === source.length);
}

function intrinsicPhoneContinuationLimit(candidate, groups, first, lastLimit) {
  for (let index = first + 1; index <= lastLimit; index += 1) {
    const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[index].index);
    const normalizedSeparator = separator.normalize('NFKC');
    const tail = candidate
      .slice(
        groups[index].index,
        groups[index].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
      )
      .normalize('NFKC');

    // Complete dates and unit-bearing observations are self-bounding even
    // when their leading separator is also accepted inside a phone candidate.
    // The date check is exact, so dotted telephone groups such as
    // `03.6216.8041` remain available to context-free phone validation.
    const calendarDate = completeCalendarDateObservationMatch(tail);
    if (calendarDate) {
      const currentBounds = phoneWindowBounds(
        candidate,
        groups,
        first,
        index
      );
      return phoneCandidateScore(
        candidate.slice(currentBounds.start, currentBounds.end),
        '',
        false
      )
        ? index
        : index - 1;
    }
    if (NUMERIC_OBSERVATION_PATTERN.test(tail)) return index - 1;

    const sourceBoundary = /\s/u.test(separator)
      || /[()\[\]{}:【】]/u.test(normalizedSeparator)
      || /[-‐‑‒–—−－]/u.test(normalizedSeparator);
    if (!sourceBoundary) {
      if (/^\d{1,2}:\d{2}(?::\d{2})?(?=$|[^0-9])/u.test(tail)) {
        return index - 1;
      }
      continue;
    }

    if (completeCalendarDateObservationMatch(tail)) return index - 1;
    const formatted = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(tail);
    if (formatted && !isWeakBareRangeObservation(tail)) return index - 1;
  }
  return lastLimit;
}

function validatedIntrinsicPhoneContinuation(candidate, groups, first) {
  let validatedLast = -1;
  let validatedInterval = null;
  const lastLimit = intrinsicPhoneContinuationLimit(
    candidate,
    groups,
    first,
    Math.min(groups.length - 1, first + MAX_PHONE_DIGIT_GROUPS - 1)
  );

  for (let last = first; last <= lastLimit; last += 1) {
    const bounds = phoneWindowBounds(candidate, groups, first, last);
    if (!phoneCandidateScore(
      candidate.slice(bounds.start, bounds.end),
      '',
      false
    )) continue;
    validatedLast = last;
    validatedInterval = bounds;
  }

  if (validatedLast < 0 || !validatedInterval) return null;
  if (validatedLast === groups.length - 1) return validatedInterval;

  // Once a context-free phone interval has been proved, an explicit extension
  // marker terminates that same contact. Do not make the extension digits look
  // like an unrelated group that can restore a short-year date interpretation.
  if (PHONE_EXTENSION_START_PATTERN.test(
    candidate.slice(validatedInterval.end)
  )) return validatedInterval;

  const next = validatedLast + 1;
  const tail = candidate
    .slice(
      groups[next].index,
      groups[next].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    )
    .normalize('NFKC');
  if (completeCalendarDateObservationMatch(tail)
      || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(tail)
      || NUMERIC_OBSERVATION_PATTERN.test(tail)) return validatedInterval;

  const separator = candidate.slice(
    validatedInterval.end,
    groups[next].index
  );
  return /[\s/／.．]/u.test(separator)
      && canStartIndependentPhone(candidate, groups, next, '')
    ? validatedInterval
    : null;
}

function completeIntrinsicPhoneContinuation(candidate, groups, first) {
  return Boolean(validatedIntrinsicPhoneContinuation(candidate, groups, first));
}

function completeDayFirstPeriodDateMatch(contextual) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?=$|[^0-9])/u.exec(
    contextual
  );
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  // A two- or three-digit final group can also be the true left edge of an
  // attached domestic or mobile telephone after a decimal. Preserve the date
  // interpretation only when that group does not independently begin one
  // complete telephone interval. Four-digit years remain unambiguous.
  if (match[3].length < 4) {
    const groups = [...contextual.matchAll(/\d+/gu)];
    if (groups.length > 3
        && completeIntrinsicPhoneContinuation(contextual, groups, 2)) {
      return null;
    }
  }
  return match;
}

function intrinsicPhoneIntervalAfterObservationBoundary(source) {
  const normalizedSource = boundedObservationSource(source).normalize('NFKC');
  const observationBoundary = /^(?:[\s]*)(?:[/／.．]|[-‐‑‒–—−－])\s*/u.exec(
    normalizedSource
  );
  if (!observationBoundary) return null;

  const boundarySourceEnd = sourceEndForNormalizedPrefix(
    source,
    observationBoundary[0].length
  );
  const candidate = source.slice(boundarySourceEnd);
  const normalizedCandidate = boundedObservationSource(candidate)
    .normalize('NFKC');
  if (completeCalendarDateObservationMatch(normalizedCandidate)
      || NUMERIC_OBSERVATION_PATTERN.test(normalizedCandidate)) return null;

  // Proving one immediate telephone needs at most one complete phone window
  // plus one competing phone window. Stop the global iterator after that fixed
  // census instead of rescanning every later transition in the remainder.
  const groups = [];
  const groupLimit = (MAX_PHONE_DIGIT_GROUPS * 2) + 3;
  for (const group of candidate.matchAll(DIGIT_RUN_PATTERN)) {
    groups.push(group);
    if (groups.length >= groupLimit) break;
  }
  if (!groups.length || groups[0].index !== 0) return null;
  const interval = validatedIntrinsicPhoneContinuation(candidate, groups, 0);
  return interval
    ? {
        start: boundarySourceEnd + interval.start,
        end: boundarySourceEnd + interval.end
      }
    : null;
}

function intrinsicPhoneIntervalAfterDashBoundary(source) {
  const normalizedSource = source.normalize('NFKC');
  if (!/^[-‐‑‒–—−－]/u.test(normalizedSource)) return null;
  return intrinsicPhoneIntervalAfterObservationBoundary(source);
}

function completeIntrinsicPhoneAfterObservationBoundary(source) {
  return Boolean(intrinsicPhoneIntervalAfterObservationBoundary(source));
}

function completeIntrinsicPhoneAfterDashBoundary(source) {
  return Boolean(intrinsicPhoneIntervalAfterDashBoundary(source));
}

function leadingFormattedObservationPhoneTransition(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  contextualPhoneAuthority
) {
  if (!groups.length || hasUrlTokenPrefixContext(
    externalPrefix.normalize('NFKC')
  )) return null;

  const sourceStart = groups[0].index;
  const source = candidate.slice(sourceStart);
  const boundedSource = boundedObservationSource(source);
  const contextual = `${boundedSource.normalize('NFKC')}${externalSuffix
    .normalize('NFKC')
    .slice(0, 64)}`;
  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  if (!formattedMatch) return null;

  const observationEnd = sourceStart + sourceEndForNormalizedPrefix(
    source,
    formattedMatch[0].length
  );
  if (observationEnd >= candidate.length) return null;

  // A complete calendar date outranks a shorter decimal or range prefix. This
  // keeps valid mixed-separator dates and numeric URL tokens outside the new
  // transition while allowing an invalid-month decimal such as `3.14` to own
  // its exact source before a slash-local telephone.
  const calendarDate = completeCalendarDateObservationMatch(contextual);
  if (calendarDate && calendarDate[0].length > formattedMatch[0].length) {
    return null;
  }

  const observationSource = candidate.slice(sourceStart, observationEnd);
  if (phoneCandidateScore(
    observationSource,
    `${externalPrefix}${candidate.slice(0, sourceStart)}`,
    contextualPhoneAuthority
  )) return null;

  const laterPhone = intrinsicPhoneIntervalAfterObservationBoundary(
    candidate.slice(observationEnd)
  );
  if (!laterPhone) return null;

  return {
    observation: {
      group: 0,
      end: observationEnd
    },
    laterPhone: {
      start: observationEnd + laterPhone.start,
      end: observationEnd + laterPhone.end
    }
  };
}

function callbackSplitTimeObservationPhoneTransition(
  candidate,
  groups,
  externalPrefix
) {
  if (!groups.length) return null;

  const normalizedPrefix = externalPrefix.normalize('NFKC');
  if (hasUrlTokenPrefixContext(normalizedPrefix)) return null;

  // `PHONE_SPAN_PATTERN` cannot cross a colon. When the callback begins at
  // the minute or second group of an already complete time, preserve that
  // source component before adjudicating the attached punctuation and phone.
  if (!/(?:^|[^\p{L}\p{N}])(?:[01]?\d|2[0-3]):(?:[0-5]\d:)?$/u.test(
    normalizedPrefix
  )) return null;

  const sourceStart = groups[0].index;
  const source = candidate.slice(sourceStart);
  const component = /^(?:[0-5]\d)(?=$|[^0-9])/u.exec(
    boundedObservationSource(source).normalize('NFKC')
  );
  if (!component) return null;

  const observationEnd = sourceStart + sourceEndForNormalizedPrefix(
    source,
    component[0].length
  );
  if (observationEnd >= candidate.length) return null;

  const laterPhone = intrinsicPhoneIntervalAfterObservationBoundary(
    candidate.slice(observationEnd)
  );
  if (!laterPhone) return null;

  return {
    observation: {
      group: 0,
      end: observationEnd
    },
    laterPhone: {
      start: observationEnd + laterPhone.start,
      end: observationEnd + laterPhone.end
    }
  };
}

function formattedObservationPrecedesIntrinsicPhone(
  contextual,
  formattedMatch
) {
  // A complete formatted observation keeps exact source custody when its
  // immediate slash, period, or dash suffix independently proves a telephone.
  // The separator is neutral: it neither strengthens the observation nor
  // grants telephone authority to an otherwise unproved numeric tail.
  return completeIntrinsicPhoneAfterObservationBoundary(
    contextual.slice(formattedMatch[0].length)
  );
}

function boundedObservationSource(source) {
  return source.length > MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    ? source.slice(0, MAX_NUMERIC_OBSERVATION_SOURCE_CHARS)
    : source;
}

function numericObservationMatch(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;

  // A complete calendar-shaped day-first dotted date owns all three groups
  // before the multi-dot decimal shortcut may claim only its first two. The
  // bounded day/month check preserves decimal-plus-phone spellings such as
  // `3.14.03-6216-8041`, whose second component cannot be a calendar month.
  const completePeriodDate = completeDayFirstPeriodDateMatch(contextual);
  if (completePeriodDate) return completePeriodDate;

  if (/^\d{1,9}\.\d{1,6}\./u.test(contextual)
      && !/^\d{4}\./u.test(contextual)) {
    return FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  }
  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  const dateMatch = completeCalendarDateObservationMatch(contextual);
  if (dateMatch) return dateMatch;

  if (formattedMatch
      && formattedObservationPrecedesIntrinsicPhone(
        contextual,
        formattedMatch
      )) return formattedMatch;
  const formattedContinuation = formattedMatch
    ? contextual.slice(formattedMatch[0].length)
    : '';
  if (formattedMatch && !/^[./-]\d/u.test(formattedContinuation)) {
    return formattedMatch;
  }
  return NUMERIC_OBSERVATION_PATTERN.exec(contextual);
}

function isWeakBareRangeObservation(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  if (completeCalendarDateObservationMatch(contextual)) return false;
  if (NUMERIC_OBSERVATION_PATTERN.test(contextual)) return false;

  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  return Boolean(
    formattedMatch
      && /^\d{1,9}\s*[-–—]\s*\d{1,9}(?=$|[^0-9])/u.test(formattedMatch[0])
  );
}

function completeDateObservationRanges(candidate, groups) {
  const ranges = [];
  let observationEnd = 0;
  let intrinsicPhoneEnd = 0;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (group.index < observationEnd || group.index < intrinsicPhoneEnd) continue;

    const intrinsicInterval = validatedIntrinsicPhoneContinuation(
      candidate,
      groups,
      index
    );
    if (intrinsicInterval && intrinsicInterval.end > group.index) {
      intrinsicPhoneEnd = Math.max(
        intrinsicPhoneEnd,
        intrinsicInterval.end
      );
      continue;
    }

    // Keep one monotone strong-observation frontier while collecting exact date
    // ranges. A complete decimal such as `3.14` owns its interior `14` group,
    // so that group cannot restart a synthetic `14-03-6216` date that suppresses
    // the independently valid phone following the dash.
    const source = candidate.slice(
      group.index,
      group.index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    );
    const observation = numericObservationMatch(source);
    if (observation && !isWeakBareRangeObservation(source)) {
      observationEnd = Math.max(
        observationEnd,
        group.index + sourceEndForNormalizedPrefix(
          source,
          observation[0].length
        )
      );
    }

    const match = completeCalendarDateObservationMatch(source.normalize('NFKC'));
    if (!match) continue;
    if (observation && observation[0].length < match[0].length) continue;
    const range = {
      start: group.index,
      end: group.index + sourceEndForNormalizedPrefix(source, match[0].length)
    };
    if (!rangeOverlapsAny(range, ranges)) ranges.push(range);
  }
  return ranges;
}

function trailingObservationGroup(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext = false
) {
      const normalizedSuffix = externalSuffix.normalize('NFKC').slice(0, 64);
      const minimumPriorDigits = 7;
      const extensionContext = /(?:\b(?:ext(?:ension)?|x)\s*[.:#]?\s*|内線(?:番号)?\s*[:#]?\s*|[#])$/iu.test(
        externalPrefix.normalize('NFKC').slice(-48)
      );
      let intrinsicPhoneEnd = 0;

      for (let index = 1; index < groups.length && index <= MAX_PHONE_DIGIT_GROUPS; index += 1) {
        const start = groups[index].index;
        if (start < intrinsicPhoneEnd) continue;
        const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
        const separator = candidate.slice(previousEnd, start);
        const normalizedSeparator = separator.normalize('NFKC');
        const dashCalendarBoundary = /[-‐‑‒–—−]/u.test(normalizedSeparator)
          && completeCalendarDateObservationMatch(
            candidate.slice(start).trim().normalize('NFKC')
          );
        if (!/\s/u.test(separator)
            && !/[.!?。！？]/u.test(normalizedSeparator)
            && !dashCalendarBoundary) continue;

        const phonePrefix = candidate.slice(0, start).trimEnd();
        const priorDigits = phonePrefix.normalize('NFKC').replace(/\D/gu, '').length;
        const prefixScore = phoneCandidateScore(
          phonePrefix,
          externalPrefix,
          indeterminatePhoneContext
        );
        if (extensionContext) {
          if (priorDigits < 1) continue;
        } else if (priorDigits < minimumPriorDigits || !prefixScore) continue;

        const tail = candidate.slice(start).trim().normalize('NFKC');
        const normalizedTail = normalizedWrappedNumericTail(tail);
        const contextualTail = `${candidate.slice(start).trimStart()}${normalizedSuffix}`.normalize('NFKC');
        const contactEnd = groups[index].index + groups[index][0].length;
        const dottedContactContinuation = isDottedContactContinuation(tail, separator, groups, index, contextualTail)
          && (extensionContext
            || phoneCandidateScore(
              candidate.slice(0, contactEnd),
              externalPrefix,
              indeterminatePhoneContext
            ));
        const observationSource = candidate.slice(start).trimStart();
        const observationMatch = numericObservationMatch(
          observationSource,
          normalizedSuffix
        );
        if (observationMatch) {
          const observationEnd = start + sourceEndForNormalizedPrefix(
            observationSource,
            observationMatch[0].length
          );
          const contextualObservation = `${observationSource.normalize('NFKC')}${normalizedSuffix}`;
          const dottedTelephoneObservationPrefix = /^\d{1,9}\.\d{1,6}\.\d/u.test(
            contextualObservation
          ) && !completeCalendarDateObservationMatch(contextualObservation);
          const intrinsicInterval = dottedTelephoneObservationPrefix
            ? validatedIntrinsicPhoneContinuation(candidate, groups, index)
            : null;
          if (intrinsicInterval && intrinsicInterval.end > observationEnd) {
            intrinsicPhoneEnd = Math.max(
              intrinsicPhoneEnd,
              intrinsicInterval.end
            );
            continue;
          }
          return {
            group: index,
            end: observationEnd
          };
        }
        if (!dottedContactContinuation
            && isSentenceSeparatedNumericTail(tail, separator, contextualTail)) {
          return { group: index, end: contactEnd };
        }
      }
      return { group: groups.length, end: candidate.length };
    }

function phoneWindowBounds(candidate, groups, first, last) {
  let start = groups[first].index;
  const priorEnd = first === 0 ? 0 : groups[first - 1].index + groups[first - 1][0].length;
  const before = candidate.slice(priorEnd, start);
  let marker = -1;
  for (const char of ['+', '＋', '(', '（']) marker = Math.max(marker, before.lastIndexOf(char));
  if (marker >= 0 && /^[+＋(（\s]*$/u.test(before.slice(marker))) start = priorEnd + marker;

  let end = groups[last].index + groups[last][0].length;
  while (end < candidate.length && /[)）]/u.test(candidate[end])) end += 1;
  return { start, end };
}

function redactPhoneExtensionCandidate(candidate, marker, offset, input) {
      const extension = candidate.slice(marker.length);
      const groups = [...extension.matchAll(DIGIT_RUN_PATTERN)];
      if (!groups.length) return candidate;

      const normalizedSuffix = input
        .slice(offset + candidate.length, offset + candidate.length + 64)
        .normalize('NFKC');
      let lastGroup = groups.length - 1;
      for (let index = 1; index < groups.length; index += 1) {
        const start = groups[index].index;
        const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
        const separator = extension.slice(previousEnd, start);
        const normalizedSeparator = separator.normalize('NFKC');
        if (!/\s/u.test(separator) && !/[.!?。！？]/u.test(normalizedSeparator)) continue;

        const tail = extension.slice(start).trim().normalize('NFKC');
        const normalizedTail = normalizedWrappedNumericTail(tail);
        const contextualTail = `${extension.slice(start).trimStart()}${normalizedSuffix}`.normalize('NFKC');
        const dottedExtensionContinuation = isDottedContactContinuation(tail, separator, groups, index, contextualTail);
        if ((!dottedExtensionContinuation
              && isSentenceSeparatedNumericTail(tail, separator, contextualTail))
            || DATE_LIKE_PATTERN.test(normalizedTail)
            || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(contextualTail)
            || NUMERIC_OBSERVATION_PATTERN.test(contextualTail)) {
          lastGroup = index - 1;
          break;
        }
      }

      const redactionEnd = groups[lastGroup].index + groups[lastGroup][0].length;
      return `${marker}[contact omitted]${extension.slice(redactionEnd)}`;
    }

function canStartIndependentPhone(
  candidate,
  groups,
  first,
  externalPrefix,
  indeterminatePhoneContext = false
) {
  const firstBounds = phoneWindowBounds(candidate, groups, first, first);
  const hasExplicitMarker = firstBounds.start < groups[first].index;
  let lastLimit = Math.min(groups.length - 1, first + MAX_PHONE_DIGIT_GROUPS - 1);

  if (!hasExplicitMarker) {
    for (let index = first + 1; index <= lastLimit; index += 1) {
      const bounds = phoneWindowBounds(candidate, groups, index, index);
      if (bounds.start < groups[index].index) {
        lastLimit = index - 1;
        break;
      }
    }
  }

  for (let last = first; last <= lastLimit; last += 1) {
    const { start, end } = phoneWindowBounds(candidate, groups, first, last);
    const slice = candidate.slice(start, end);
    if (phoneCandidateScore(
      slice,
      `${externalPrefix}${candidate.slice(0, start)}`,
      indeterminatePhoneContext
    )) return true;
  }
  return false;
}

function validatedIndependentPhoneInterval(
  candidate,
  groups,
  first,
  externalPrefix,
  externalSuffix = '',
  indeterminatePhoneContext = false
) {
  const firstBounds = phoneWindowBounds(candidate, groups, first, first);
  const hasExplicitMarker = firstBounds.start < groups[first].index;
  let lastLimit = Math.min(groups.length - 1, first + MAX_PHONE_DIGIT_GROUPS - 1);
  if (!hasExplicitMarker) {
    for (let index = first + 1; index <= lastLimit; index += 1) {
      if (phoneWindowBounds(candidate, groups, index, index).start < groups[index].index) {
        lastLimit = index - 1;
        break;
      }
    }
  }

  // Reuse the primary observation classifier relative to this proposed phone
  // start. This avoids treating a phone's own punctuation as an observation,
  // while still capping the exact interval before a following count/date/etc.
  const localCandidate = candidate.slice(firstBounds.start);
  const localGroups = [...localCandidate.matchAll(DIGIT_RUN_PATTERN)];
  const terminalObservation = trailingObservationGroup(
    localCandidate,
    localGroups,
    `${externalPrefix}${candidate.slice(0, firstBounds.start)}`,
    externalSuffix,
    indeterminatePhoneContext
  );
  if (terminalObservation.group < localGroups.length) {
    lastLimit = Math.min(lastLimit, first + terminalObservation.group - 1);
  }

  let validated = null;
  for (let last = first; last <= lastLimit; last += 1) {
    const bounds = phoneWindowBounds(candidate, groups, first, last);
    if (!phoneCandidateScore(
      candidate.slice(bounds.start, bounds.end),
      `${externalPrefix}${candidate.slice(0, bounds.start)}`,
      indeterminatePhoneContext
    )) continue;
    // Keep the exact marker-aware start and the longest terminal group proved
    // for this start. This interval is authoritative after this function.
    validated = bounds;
  }
  return validated;
}

function redactAttachedInternationalSuffixRanges(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext = false
) {
  let best = null;
  for (let index = 1; index < groups.length; index += 1) {
    const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
    if (!/\s/u.test(candidate.slice(previousEnd, groups[index].index))) continue;
    if (!canStartIndependentPhone(
      candidate,
      groups,
      index,
      externalPrefix,
      indeterminatePhoneContext
    )) continue;

    const { start } = phoneWindowBounds(candidate, groups, index, index);
    const protectedPrefix = candidate.slice(0, start);
    const normalizedPrefix = protectedPrefix.trim().normalize('NFKC');
    if (!isInternationalPhoneCandidate(normalizedPrefix)) continue;
    const prefixScore = phoneCandidateScore(
      protectedPrefix.trimEnd(),
      externalPrefix,
      indeterminatePhoneContext
    );
    if (!prefixScore) continue;

    const suffixRanges = phoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    );
    if (!suffixRanges.length) continue;

    const protectedDigits = normalizedPrefix.replace(/\D/gu, '').length;
    const proposal = {
      prefixScore,
      protectedDigits,
      ranges: suffixRanges.map(range => ({
        start: range.start + start,
        end: range.end + start
      }))
    };
    if (!best
        || proposal.protectedDigits > best.protectedDigits
        || (proposal.protectedDigits === best.protectedDigits
          && proposal.prefixScore > best.prefixScore)) {
      best = proposal;
    }
  }
  return best?.ranges ?? [];
}

function identifierContextNeedsExpansion(normalizedPrefix) {
  const identifierChain = trailingIdentifierLabelChain(normalizedPrefix);
  return identifierChain.sawIdentifierLabel
    && (identifierChain.overflow || identifierChain.start <= 48);
}

function redactionPrefixContext(input, offset) {
  const boundedOffset = Math.max(0, Math.min(input.length, offset));
  const boundedStart = Math.max(0, boundedOffset - 64);
  const boundedTokenStart = nonWhitespaceTokenStart(input, boundedStart);
  const currentToken = previousNonWhitespaceTokenBounds(input, boundedOffset);
  const tokenStart = currentToken?.start ?? boundedOffset;
  let contextStart = Math.min(boundedTokenStart, tokenStart);
  let scanStart = tokenStart;
  let normalizedToken = currentToken
    ? input.slice(currentToken.start, currentToken.end).normalize('NFKC')
    : '';

  while (/^(?:\(|\[|\{|（|［|【)+$/u.test(normalizedToken) && scanStart > 0) {
    const priorToken = previousNonWhitespaceTokenBounds(input, scanStart);
    if (!priorToken) break;
    scanStart = priorToken.start;
    contextStart = Math.min(contextStart, priorToken.start);
    normalizedToken = input
      .slice(priorToken.start, priorToken.end)
      .normalize('NFKC');
  }

  let context = input.slice(contextStart, boundedOffset);
  let indeterminate = false;
  let explicitPhoneLabelContext = false;
  let identifierProtectedContext = false;
  if (contextStart > 0 && identifierContextNeedsExpansion(
    context.normalize('NFKC')
  )) {
    const boundedExpandedStart = Math.max(
      0,
      boundedOffset - MAX_PHONE_LABEL_CONTEXT_CHARS
    );
    const expandedStart = nonWhitespaceTokenStart(
      input,
      boundedExpandedStart
    );
    contextStart = Math.min(contextStart, expandedStart);
    context = input.slice(contextStart, boundedOffset);

    if (contextStart > 0 && identifierContextNeedsExpansion(
      context.normalize('NFKC')
    )) {
      // A wider but still bounded provenance pass may recover a governing phone
      // label when the terminal identifier chain remains within the 4,096-label
      // parser ceiling. If that proof still overflows or begins at the retained
      // window boundary, preserve the terminal identifier instead of converting
      // uncertainty into affirmative telephone authority.
      const boundedProvenanceStart = Math.max(
        0,
        boundedOffset - MAX_PHONE_LABEL_PROVENANCE_CHARS
      );
      const provenanceStart = nonWhitespaceTokenStart(
        input,
        boundedProvenanceStart
      );
      const normalizedProvenance = input
        .slice(provenanceStart, boundedOffset)
        .normalize('NFKC');
      const provenanceChain = trailingIdentifierLabelChain(
        normalizedProvenance
      );
      const completeProvenance = !provenanceChain.overflow
        && (provenanceStart === 0 || provenanceChain.start > 48);
      if (completeProvenance
          && hasPhoneLabelPrefixNormalized(normalizedProvenance)) {
        explicitPhoneLabelContext = true;
      } else if (completeProvenance) {
        // Preserve the established conservative contract while the bounded
        // parser can still account for the complete identifier chain. Only an
        // actual parser overflow or incomplete provenance changes the default
        // to identifier protection.
        indeterminate = true;
      } else {
        identifierProtectedContext = true;
      }
    }
  }

  return {
    text: context,
    indeterminate,
    explicitPhoneLabelContext,
    identifierProtectedContext
  };
}

function identifierProtectedPrefixEnd(candidate, groups, externalSuffix) {
  const observation = trailingObservationGroup(candidate, groups, '', externalSuffix);
  const observationGroup = observation.group;
  if (observationGroup <= 0) return candidate.length;

  const completeBounds = phoneWindowBounds(
    candidate,
    groups,
    0,
    observationGroup - 1
  );
  const completeCandidate = candidate.slice(
    completeBounds.start,
    completeBounds.end
  );
  const completeScore = phoneCandidateScore(completeCandidate, '');

  // A complete identifier immediately before a proved observation owns only
  // that value. Preserve it now so the ordinary identifier-boundary scan
  // cannot absorb a group from a phone beyond the observation.
  if (completeScore && observationGroup < groups.length) return completeBounds.end;

  for (let first = 1; first < groups.length; first += 1) {
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const groupStart = groups[first].index;
    const separator = candidate.slice(previousEnd, groupStart).normalize('NFKC');
    const slashBoundary = /[\/／]/u.test(separator);
    const periodBoundary = /[.．]/u.test(separator);
    const whitespaceBoundary = /\s/u.test(separator);
    if (!slashBoundary && !periodBoundary && !whitespaceBoundary) continue;
    if (!canStartIndependentPhone(candidate, groups, first, '')) continue;

    const { start } = phoneWindowBounds(candidate, groups, first, first);
    const protectedPrefix = candidate.slice(0, start).trimEnd();
    const prefixScore = phoneCandidateScore(protectedPrefix, '');
    const protectedDigits = protectedPrefix
      .normalize('NFKC')
      .replace(/\D/gu, '')
      .length;
    if (prefixScore
        || slashBoundary
        || (periodBoundary && (!completeScore || protectedDigits >= 7))
        || (whitespaceBoundary && protectedDigits >= 7)) return start;
  }

  if (completeScore) return completeBounds.end;
  return candidate.length;
}

function trailingObservationOpeners(value) {
  const normalized = value.normalize('NFKC');
  const reversed = [];
  let cursor = normalized.length;

  while (cursor > 0) {
    while (cursor > 0 && /\s/u.test(normalized[cursor - 1])) cursor -= 1;
    if (cursor <= 0) break;
    const opener = normalized[cursor - 1];
    if (!Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, opener)) break;
    reversed.push(opener);
    cursor -= 1;
  }

  return reversed.reverse();
}

function consumeOwnedObservationClosers(separator, openers) {
  const remaining = [...openers];
  let sawClosing = false;

  for (const character of separator.normalize('NFKC')) {
    const expectedOpener = OBSERVATION_WRAPPER_CLOSERS.get(character);
    if (expectedOpener === undefined) continue;
    sawClosing = true;
    if (remaining.at(-1) !== expectedOpener) {
      return { valid: false, sawClosing: true, openers };
    }
    remaining.pop();
  }

  return { valid: true, sawClosing, openers: remaining };
}

function validatedIntrinsicPhoneInterval(
  candidate,
  groups,
  first,
  externalSuffix
) {
  const firstBounds = phoneWindowBounds(candidate, groups, first, first);
  const markerPrefix = candidate
    .slice(firstBounds.start, groups[first].index)
    .normalize('NFKC');
  const localStart = /^\+\s*$/u.test(markerPrefix)
    ? firstBounds.start
    : groups[first].index;

  // Intrinsic validation can use at most MAX_PHONE_DIGIT_GROUPS and one
  // bounded observation lookahead. Reuse the caller's group census instead of
  // rescanning the complete remaining candidate for every proposed start.
  const localGroupEnd = Math.min(
    groups.length,
    first + MAX_PHONE_DIGIT_GROUPS + 3
  );
  const localEnd = localGroupEnd < groups.length
    ? groups[localGroupEnd].index
    : candidate.length;
  const localCandidate = candidate.slice(localStart, localEnd);
  const localGroups = groups.slice(first, localGroupEnd).map(group => {
    const localGroup = [group[0]];
    localGroup.index = group.index - localStart;
    return localGroup;
  });
  if (!localGroups.length) return null;

  const localInterval = validatedIndependentPhoneInterval(
    localCandidate,
    localGroups,
    0,
    '',
    `${candidate.slice(localEnd, localEnd + 64)}${externalSuffix}`,
    false
  );
  if (!localInterval) return null;

  return {
    start: firstBounds.start < groups[first].index
      ? firstBounds.start
      : localStart + localInterval.start,
    end: localStart + localInterval.end
  };
}

function intervalSpansClosingWrapper(candidate, interval) {
  const source = candidate.slice(interval.start, interval.end).normalize('NFKC');
  return /\)(?=[^0-9]*[0-9])/u.test(source);
}

function intervalHasContextFreeCloserProof(candidate, interval) {
  return !intervalSpansClosingWrapper(candidate, interval)
    || Boolean(phoneCandidateScore(
      candidate.slice(interval.start, interval.end),
      '',
      false
    ));
}

function initialIntrinsicPhoneDashTransition(
  candidate,
  groups,
  externalSuffix
) {
  let strongestInitialPhone = null;
  const lastLimit = Math.min(
    groups.length - 1,
    MAX_PHONE_DIGIT_GROUPS - 1
  );
  for (let last = 0; last <= lastLimit; last += 1) {
    const interval = phoneWindowBounds(candidate, groups, 0, last);
    const score = phoneCandidateScore(
      candidate.slice(interval.start, interval.end),
      '',
      false
    );
    if (!score || !intervalHasContextFreeCloserProof(candidate, interval)) {
      continue;
    }
    const next = last + 1;
    const previousGroupEnd = last > 0
      ? groups[last - 1].index + groups[last - 1][0].length
      : interval.start;
    const currentGroupEnd = groups[last].index + groups[last][0].length;
    const previousSeparator = last > 0
      ? candidate.slice(previousGroupEnd, groups[last].index)
      : '';
    const nextSeparator = next < groups.length
      ? candidate.slice(currentGroupEnd, groups[next].index)
      : '';
    const nextSource = next < groups.length
      ? candidate.slice(groups[next].index, groups[next].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS)
      : '';
    const nextCompetingObservation = nextSource
      ? crossCallbackObservationMatch(nextSource, externalSuffix)
      : null;
    const nextCompetingObservationIsStrong = Boolean(
      nextCompetingObservation
        && !isWeakBareRangeObservation(nextSource, externalSuffix)
    );
    const nextIntrinsicPhone = next < groups.length
      ? validatedIntrinsicPhoneInterval(
          candidate,
          groups,
          next,
          externalSuffix
        )
      : null;
    const normalizedPreviousSeparator = previousSeparator.normalize('NFKC');
    const normalizedNextSeparator = nextSeparator.normalize('NFKC');
    const repeatedPreviousSeparator = last > 1 && Array.from(
      { length: last - 1 },
      (_, separatorIndex) => {
        const separatorStart = groups[separatorIndex].index
          + groups[separatorIndex][0].length;
        return candidate.slice(
          separatorStart,
          groups[separatorIndex + 1].index
        ).normalize('NFKC');
      }
    ).some(separator => separator === normalizedPreviousSeparator);
    const slashPartitionBoundary = /^\s*[/／]\s*$/u.test(
      normalizedNextSeparator
    );
    const dashPartitionBoundary = /^\s*[-‐‑‒–—−－]\s*$/u.test(
      normalizedNextSeparator
    );
    const compactInitialBoundary = last === 0
      && (dashPartitionBoundary || slashPartitionBoundary)
      && (nextCompetingObservationIsStrong || nextIntrinsicPhone);
    const terminalGroupProvesPartition = Boolean(
      compactInitialBoundary
        || (dashPartitionBoundary && /^[^\S\r\n]+$/u.test(previousSeparator))
        || (repeatedPreviousSeparator
          && previousSeparator.trim() !== nextSeparator.trim()
          && (dashPartitionBoundary || slashPartitionBoundary))
    );
    const terminalGroupBeforeCompetingSource = Boolean(
      next < groups.length
        && (last > 0 || compactInitialBoundary)
        && terminalGroupProvesPartition
        && (nextCompetingObservationIsStrong || nextIntrinsicPhone)
    );
    const outranksCurrent = !strongestInitialPhone
      || (terminalGroupBeforeCompetingSource
        && !strongestInitialPhone.terminalGroupBeforeCompetingSource)
      || (terminalGroupBeforeCompetingSource === strongestInitialPhone.terminalGroupBeforeCompetingSource
        && (score > strongestInitialPhone.score
          || (score === strongestInitialPhone.score
            && interval.end > strongestInitialPhone.interval.end)));
    if (outranksCurrent) {
      strongestInitialPhone = {
        interval,
        last,
        score,
        terminalGroupBeforeCompetingSource
      };
    }
  }

  if (!strongestInitialPhone
      || strongestInitialPhone.last >= groups.length - 1) return null;

  const boundaryGroup = strongestInitialPhone.last + 1;
  const previousEnd = groups[boundaryGroup - 1].index
    + groups[boundaryGroup - 1][0].length;
  const separator = candidate.slice(
    previousEnd,
    groups[boundaryGroup].index
  );
  const normalizedBoundarySeparator = separator.normalize('NFKC');
  const slashBoundary = /^\s*[/／]\s*$/u.test(normalizedBoundarySeparator);
  const dashBoundary = /^\s*[-‐‑‒–—−－]\s*$/u.test(
    normalizedBoundarySeparator
  );
  if ((!slashBoundary && !dashBoundary)
      || (slashBoundary
        && !strongestInitialPhone.terminalGroupBeforeCompetingSource)) {
    return null;
  }

  const remainingCandidate = candidate.slice(
    groups[boundaryGroup].index,
    groups[boundaryGroup].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
  );
  const competingObservation = crossCallbackObservationMatch(
    remainingCandidate,
    externalSuffix
  );
  const competingObservationIsStrong = Boolean(
    competingObservation
      && !isWeakBareRangeObservation(
        remainingCandidate,
        externalSuffix
      )
  );
  const competingObservationEnd = competingObservation
    ? groups[boundaryGroup].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        competingObservation[0].length
      )
    : groups[boundaryGroup].index;
  const competingObservationUsesExternalSuffix = Boolean(
    competingObservation
      && competingObservation[0].length
        > remainingCandidate.normalize('NFKC').length
  );

  const laterPhone = validatedIntrinsicPhoneInterval(
    candidate,
    groups,
    boundaryGroup,
    externalSuffix
  );
  const laterPhoneCoversObservation = Boolean(
    laterPhone
      && !competingObservationUsesExternalSuffix
      && laterPhone.end >= competingObservationEnd
  );
  if (laterPhone
      && (!competingObservationIsStrong
        || laterPhoneCoversObservation)
      && intervalHasContextFreeCloserProof(candidate, laterPhone)) {
    return {
      initialPhone: strongestInitialPhone.interval,
      laterPhone,
      observation: null
    };
  }

  if (competingObservationIsStrong) {
    return {
      initialPhone: strongestInitialPhone.interval,
      laterPhone: null,
      observation: {
        group: boundaryGroup,
        end: competingObservationEnd
      }
    };
  }

  return null;
}

function identifierOwnedObservationPhoneTransition(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  if (!groups.length) return null;

  // A phone-shaped identifier already carries an exact intrinsic interval.
  // A grouped, explicitly labelled identifier may be non-phone-shaped, so
  // recover its boundary from the first complete strong observation instead
  // of requiring telephone structure from the protected value itself.
  let initialIdentifier = validatedIntrinsicPhoneContinuation(
    candidate,
    groups,
    0
  );
  let observationGroup = initialIdentifier
      && initialIdentifier.start <= groups[0].index
    ? groups.findIndex(group => group.index >= initialIdentifier.end)
    : -1;
  let observationMatch = null;

  if (observationGroup > 0) {
    const observationSource = candidate.slice(
      groups[observationGroup].index,
      groups[observationGroup].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    );
    const candidateObservation = crossCallbackObservationMatch(
      observationSource,
      externalSuffix
    );
    if (candidateObservation
        && !isWeakBareRangeObservation(observationSource, externalSuffix)) {
      observationMatch = candidateObservation;
    }
  }

  if (!observationMatch) {
    initialIdentifier = null;
    observationGroup = -1;
    for (let index = 1; index < groups.length; index += 1) {
      const previousEnd = groups[index - 1].index
        + groups[index - 1][0].length;
      const boundary = candidate.slice(previousEnd, groups[index].index);
      if (!/[\s/／.．\-‐‑‒–—−－]/u.test(boundary)
          || /[\p{L}\p{N}]/u.test(boundary)) continue;

      const protectedSource = candidate.slice(0, previousEnd);
      const protectedDigits = protectedSource
        .normalize('NFKC')
        .replace(/\D/gu, '')
        .length;
      if (protectedDigits < 7) continue;

      const observationSource = candidate.slice(
        groups[index].index,
        groups[index].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
      );
      const candidateObservation = crossCallbackObservationMatch(
        observationSource,
        externalSuffix
      );
      if (!candidateObservation
          || isWeakBareRangeObservation(observationSource, externalSuffix)) {
        continue;
      }

      initialIdentifier = {
        start: phoneWindowBounds(candidate, groups, 0, 0).start,
        end: previousEnd
      };
      observationGroup = index;
      observationMatch = candidateObservation;
      break;
    }
  }

  if (!initialIdentifier || !observationMatch || observationGroup <= 0) {
    return null;
  }

  const boundary = candidate.slice(
    initialIdentifier.end,
    groups[observationGroup].index
  );
  if (!/[\s/／.．\-‐‑‒–—−－]/u.test(boundary)
      || /[\p{L}\p{N}]/u.test(boundary)) {
    return null;
  }

  const observationSource = candidate.slice(
    groups[observationGroup].index,
    groups[observationGroup].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
  );
  const observation = {
    group: observationGroup,
    end: groups[observationGroup].index + sourceEndForNormalizedPrefix(
      observationSource,
      observationMatch[0].length
    )
  };
  if (observation.end <= groups[observationGroup].index
      || observation.end >= candidate.length) {
    return null;
  }

  const laterPhone = independentPhoneStartAfterObservation(
    candidate,
    groups,
    observation,
    externalPrefix,
    externalSuffix,
    indeterminatePhoneContext,
    false
  );
  return laterPhone
    ? { initialIdentifier, observation, laterPhone }
    : null;
}

function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext,
  explicitPhoneLabelContext = false
) {
  let observationEnd = observation.end;
  let observationOpeners = trailingObservationOpeners(
    candidate.slice(0, groups[observation.group].index)
  );
  let suppressIndeterminatePhoneContext = false;
  let explicitPhoneLabelAvailable = explicitPhoneLabelContext;

  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = first === 0
      ? 0
      : groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const closingState = consumeOwnedObservationClosers(
      separator,
      observationOpeners
    );
    const invalidClosingBoundary = closingState.sawClosing
      && !closingState.valid;
    const suppressAfterBoundary = suppressIndeterminatePhoneContext
      || invalidClosingBoundary;
    suppressIndeterminatePhoneContext = suppressAfterBoundary;
    const independentSeparatorBoundary = /[\s/／.．\-‐‑‒–—−－]/u.test(separator);
    const nextOpeners = trailingObservationOpeners(separator);
    const ownedClosingBoundary = closingState.sawClosing
      && closingState.valid;
    if (ownedClosingBoundary) explicitPhoneLabelAvailable = false;
    if (invalidClosingBoundary) {
      const attachedObservationSource = candidate.slice(groups[first].index);
      const attachedObservation = crossCallbackObservationMatch(
        attachedObservationSource,
        externalSuffix
      );
      const attachedObservationIsStrong = Boolean(
        attachedObservation
          && !isWeakBareRangeObservation(
            attachedObservationSource,
            externalSuffix
          )
      );
      const attachedObservationEnd = attachedObservation
        ? groups[first].index + sourceEndForNormalizedPrefix(
            attachedObservationSource,
            attachedObservation[0].length
          )
        : groups[first].index;
      const attachedObservationUsesExternalSuffix = Boolean(
        attachedObservation
          && attachedObservation[0].length
            > attachedObservationSource.normalize('NFKC').length
      );
      const attachedIntrinsicInterval = validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        first,
        externalSuffix
      );
      const intrinsicCoversAttachedObservation = Boolean(
        attachedIntrinsicInterval
          && !attachedObservationUsesExternalSuffix
          && attachedIntrinsicInterval.end >= attachedObservationEnd
      );

      // Context-free telephone evidence wins only when it covers the complete
      // source claimed by the competing observation. A phone-shaped numeric
      // prefix cannot preempt a unit supplied by the external suffix.
      if (attachedIntrinsicInterval
          && (!attachedObservationIsStrong
            || intrinsicCoversAttachedObservation)) {
        return {
          ...attachedIntrinsicInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }

      // An invalid closer is not boundary authority, but it must not make the
      // scanner skip the first group of a complete attached observation. Claim
      // that exact source interval before any interior period, slash, or space
      // can become a new telephone start.
      if (attachedObservationIsStrong) {
        observationOpeners = [
          ...closingState.openers,
          ...nextOpeners
        ];
        observationEnd = attachedObservationEnd;
        continue;
      }
    }
    if (!independentSeparatorBoundary
        && !nextOpeners.length
        && !ownedClosingBoundary) {
      continue;
    }

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = crossCallbackObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    const weakBareRangeObservation = nextObservation
      && isWeakBareRangeObservation(remainingCandidate, externalSuffix);
    const nextObservationIsStrong = Boolean(
      nextObservation && !weakBareRangeObservation
    );
    const nextObservationEnd = nextObservation
      ? groups[first].index + sourceEndForNormalizedPrefix(
          remainingCandidate,
          nextObservation[0].length
        )
      : groups[first].index;
    const nextObservationUsesExternalSuffix = Boolean(
      nextObservation
        && nextObservation[0].length
          > remainingCandidate.normalize('NFKC').length
    );

    // Intrinsic telephone structure outranks an overlapping weak range, but a
    // phone-shaped prefix cannot preempt a complete observation that extends
    // into an externally owned unit. The same complete-source comparison used
    // after invalid closers therefore governs ordinary separators as well.
    const intrinsicInterval = validatedIntrinsicPhoneInterval(
      candidate,
      groups,
      first,
      externalSuffix
    );
    const intrinsicCoversNextObservation = Boolean(
      intrinsicInterval
        && !nextObservationUsesExternalSuffix
        && intrinsicInterval.end >= nextObservationEnd
    );
    if (intrinsicInterval
        && (!nextObservationIsStrong || intrinsicCoversNextObservation)) {
      return {
        ...intrinsicInterval,
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }

    // Complete dates, times, decimals, counts, unit-labelled values, and strong
    // ranges retain observation custody before any context-dependent telephone
    // probe. Only a bare ambiguous range may defer to an already-proved label.
    if (nextObservationIsStrong) {
      suppressIndeterminatePhoneContext = suppressAfterBoundary;
      observationOpeners = [
        ...closingState.openers,
        ...nextOpeners
      ];
      observationEnd = nextObservationEnd;
      continue;
    }

    // A telephone label proved at candidate entry remains explicit authority
    // after a preserved observation. This probe may preempt only a weak bare
    // range interpretation or a suffix for which no complete observation exists.
    if (explicitPhoneLabelAvailable) {
      const labelledInterval = validatedIndependentPhoneInterval(
        candidate,
        groups,
        first,
        externalPrefix,
        externalSuffix,
        true
      );
      if (labelledInterval
          && intervalHasContextFreeCloserProof(candidate, labelledInterval)) {
        return {
          ...labelledInterval,
          suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
        };
      }
    }

    if (nextObservation) {
      suppressIndeterminatePhoneContext = suppressAfterBoundary;
      observationOpeners = [
        ...closingState.openers,
        ...nextOpeners
      ];
      observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      continue;
    }

    suppressIndeterminatePhoneContext = suppressAfterBoundary;
    observationOpeners = closingState.openers;
    const contextualPhoneAuthority = explicitPhoneLabelAvailable
      || (!suppressIndeterminatePhoneContext && indeterminatePhoneContext);
    const interval = validatedIndependentPhoneInterval(
      candidate,
      groups,
      first,
      externalPrefix,
      externalSuffix,
      contextualPhoneAuthority
    );
    if (interval
        && (!contextualPhoneAuthority
          || intervalHasContextFreeCloserProof(candidate, interval))) {
      return {
        ...interval,
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }
  }
  return null;
}

function compactPhoneRedactionContinuationPrefix(prefix) {
  const redactionMarker = '[contact omitted]';
  const lastRedaction = prefix.lastIndexOf(redactionMarker);
  if (lastRedaction >= 0) {
    // A rendered contact marker contains whitespace and terminates URL, label,
    // and identifier-token provenance. Authority that is intentionally allowed
    // to cross that boundary is carried explicitly in the continuation state.
    return prefix.slice(lastRedaction);
  }
  if (prefix.length <= MAX_PHONE_LABEL_PROVENANCE_CHARS) return prefix;

  const boundedStart = prefix.length - MAX_PHONE_LABEL_PROVENANCE_CHARS;
  const tokenStart = nonWhitespaceTokenStart(prefix, boundedStart);
  return prefix.slice(tokenStart);
}

function shiftedDigitGroupView(allGroups, firstGroup, sourceOffset, candidate) {
  const cache = new Map();
  const localLength = Math.max(0, allGroups.length - firstGroup);
  const localGroup = index => {
    let normalizedIndex = Number(index);
    if (!Number.isInteger(normalizedIndex)) return undefined;
    if (normalizedIndex < 0) normalizedIndex += localLength;
    if (normalizedIndex < 0 || normalizedIndex >= localLength) return undefined;
    if (cache.has(normalizedIndex)) return cache.get(normalizedIndex);
    const source = allGroups[firstGroup + normalizedIndex];
    const shifted = [source[0]];
    shifted.index = source.index - sourceOffset;
    shifted.input = candidate;
    shifted.groups = source.groups;
    cache.set(normalizedIndex, shifted);
    return shifted;
  };
  const normalizeSliceIndex = (value, fallback) => {
    if (value === undefined) return fallback;
    const integer = Math.trunc(Number(value));
    if (!Number.isFinite(integer)) return integer < 0 ? 0 : localLength;
    return integer < 0
      ? Math.max(0, localLength + integer)
      : Math.min(localLength, integer);
  };

  return new Proxy([], {
    get(_target, property) {
      if (property === 'length') return localLength;
      if (property === 'at') return index => localGroup(index);
      if (property === 'slice') {
        return (start, end) => {
          const from = normalizeSliceIndex(start, 0);
          const to = normalizeSliceIndex(end, localLength);
          const result = [];
          for (let index = from; index < Math.max(from, to); index += 1) {
            result.push(localGroup(index));
          }
          return result;
        };
      }
      if (property === Symbol.iterator) {
        return function* iterator() {
          for (let index = 0; index < localLength; index += 1) {
            yield localGroup(index);
          }
        };
      }
      if (typeof property === 'string' && /^(?:0|[1-9]\d*)$/u.test(property)) {
        return localGroup(Number(property));
      }
      return Reflect.get([], property);
    }
  });
}

function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  const ranges = [];
  const sourceCandidate = candidate;
  const allGroups = [...sourceCandidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!allGroups.length) return ranges;

  // Candidate-level URL refusal is an entry decision. Compute it once from the
  // original callback source. Iterative continuation cannot mint a new URL
  // scheme or host from an interior suffix after the anchored token proof has
  // already declined at the callback boundary.
  const entryCombinedCandidate = `${externalPrefix}${sourceCandidate}`;
  const entryTrailingTokenStart = nonWhitespaceTokenStart(entryCombinedCandidate);
  const candidateEntryUrlContext = hasUrlTokenPrefixContext(
    entryCombinedCandidate.slice(entryTrailingTokenStart).normalize('NFKC')
  );

  let sourceOffset = 0;
  let firstGroup = 0;
  let state = {
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  };

  while (true) {
    const localCandidate = sourceCandidate.slice(sourceOffset);
    const localGroups = shiftedDigitGroupView(
      allGroups,
      firstGroup,
      sourceOffset,
      localCandidate
    );
    const result = phoneRedactionRangesStep(
      localCandidate,
      state.externalPrefix,
      state.externalSuffix,
      state.allowInitialGroup,
      state.indeterminatePhoneContext,
      state.inheritedExplicitPhoneLabelContext,
      localGroups,
      sourceOffset === 0 && candidateEntryUrlContext
    );
    const localRanges = Array.isArray(result) ? result : result.ranges;
    for (const range of localRanges) {
      ranges.push({
        start: range.start + sourceOffset,
        end: range.end + sourceOffset
      });
    }
    if (Array.isArray(result)) return ranges;

    const { next } = result;
    if (!next || next.offset <= 0 || next.offset > localCandidate.length) {
      return ranges;
    }
    sourceOffset += next.offset;
    while (firstGroup < allGroups.length
        && allGroups[firstGroup].index < sourceOffset) {
      firstGroup += 1;
    }
    state = {
      externalPrefix: compactPhoneRedactionContinuationPrefix(
        next.externalPrefix
      ),
      externalSuffix: next.externalSuffix,
      allowInitialGroup: next.allowInitialGroup,
      indeterminatePhoneContext: next.indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext: next.inheritedExplicitPhoneLabelContext
    };
  }
}

function phoneRedactionRangesStep(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  precomputedGroups = null,
  candidateEntryUrlContext = false
) {
  const groups = precomputedGroups ?? [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || hasPhoneLabelPrefixNormalized(
      normalizedExternalPrefix
    );
  const phoneLabelContext = indeterminatePhoneContext
    || explicitPhoneLabelContext;
  const unoverriddenIdentifierContext = hasExplicitIdentifierPrefixNormalized(
    normalizedExternalPrefix
  ) && !phoneLabelContext;
  const initialPartitionTransition = allowInitialGroup
    ? initialIntrinsicPhoneDashTransition(
        candidate,
        groups,
        externalSuffix
      )
    : null;
  if (candidateEntryUrlContext) {
    const initialPhone = initialPartitionTransition?.initialPhone ?? null;
    const nextObjectStart = initialPartitionTransition?.laterPhone?.start
      ?? (initialPartitionTransition?.observation
        ? groups[initialPartitionTransition.observation.group].index
        : -1);
    const partitionSeparator = initialPhone && nextObjectStart >= initialPhone.end
      ? candidate.slice(initialPhone.end, nextObjectStart).normalize('NFKC')
      : '';
    const candidateCreatedNumericUrlShape = Boolean(
      initialPhone
        && !hasUrlTokenPrefixContext(normalizedExternalPrefix)
        && isInternationalPhoneCandidate(
          candidate.slice(initialPhone.start, initialPhone.end)
            .trim()
            .normalize('NFKC')
        )
        && /^\s*[/／]\s*$/u.test(partitionSeparator)
    );
    if (!candidateCreatedNumericUrlShape) return [];
  }

  const effectivePhoneScoringContext = indeterminatePhoneContext
    || explicitPhoneLabelContext;

  // An identifier label owns the first independently complete value, but it
  // does not own a second telephone or any later source. Reuse the exact
  // partition proof without admitting the initial telephone interval, then
  // continue after the separately validated suffix interval. This keeps
  // ASCII and fullwidth slash or dash spellings on the same source geometry.
  // Identifier-specific progression owns a complete competing observation
// before the generic partition may interpret any of its groups as
// contact data. The accepted later interval must begin at or beyond
// the exact observation endpoint proved by the identifier path.
const identifierOwnedTransitionBeforePartition = unoverriddenIdentifierContext
  ? identifierOwnedObservationPhoneTransition(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext
    )
  : null;
if (identifierOwnedTransitionBeforePartition) {
  const { observation, laterPhone } = identifierOwnedTransitionBeforePartition;
  if (laterPhone.start < observation.end) return [];
  const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
    0,
    laterPhone.start
  )}[contact omitted]`;
  if (laterPhone.end >= candidate.length) return [laterPhone];
  return {
    ranges: [laterPhone],
    next: {
      offset: laterPhone.end,
      externalPrefix: prefixBeforeRemainder,
      externalSuffix,
      allowInitialGroup: true,
      indeterminatePhoneContext:
        laterPhone.suppressRemainderIndeterminatePhoneContext
          ? false
          : indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext: false
    }
  };
}

  if (unoverriddenIdentifierContext && initialPartitionTransition) {
    const { laterPhone, observation } = initialPartitionTransition;
    if (laterPhone) {
      const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
        0,
        laterPhone.start
      )}[contact omitted]`;
      if (laterPhone.end >= candidate.length) return [laterPhone];
      return {
        ranges: [laterPhone],
        next: {
          offset: laterPhone.end,
          externalPrefix: prefixBeforeRemainder,
          externalSuffix,
          allowInitialGroup: true,
          indeterminatePhoneContext,
          inheritedExplicitPhoneLabelContext: false
        }
      };
    }

    const postObservationPhone = observation
      && observation.end < candidate.length
      ? independentPhoneStartAfterObservation(
          candidate,
          groups,
          observation,
          externalPrefix,
          externalSuffix,
          indeterminatePhoneContext,
          false
        )
      : null;
    if (!postObservationPhone) return [];

    const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
      0,
      postObservationPhone.start
    )}[contact omitted]`;
    if (postObservationPhone.end >= candidate.length) {
      return [postObservationPhone];
    }
    return {
      ranges: [postObservationPhone],
      next: {
        offset: postObservationPhone.end,
        externalPrefix: prefixBeforeRemainder,
        externalSuffix,
        allowInitialGroup: true,
        indeterminatePhoneContext:
          postObservationPhone.suppressRemainderIndeterminatePhoneContext
            ? false
            : indeterminatePhoneContext,
        inheritedExplicitPhoneLabelContext: false
      }
    };
  }

  // A complete leading decimal or weak range may be followed by a slash or
  // dash that begins a separately intrinsic telephone. Prove both sides at the
  // source boundary before generic interval optimization can combine them.
  const leadingObservationPhoneTransition = allowInitialGroup
    ? callbackSplitTimeObservationPhoneTransition(
        candidate,
        groups,
        externalPrefix
      ) ?? leadingFormattedObservationPhoneTransition(
        candidate,
        groups,
        externalPrefix,
        externalSuffix,
        effectivePhoneScoringContext
      )
    : null;
  if (leadingObservationPhoneTransition) {
    const { laterPhone } = leadingObservationPhoneTransition;
    const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
      0,
      laterPhone.start
    )}[contact omitted]`;
    if (laterPhone.end >= candidate.length) return [laterPhone];
    return {
      ranges: [laterPhone],
      next: {
        offset: laterPhone.end,
        externalPrefix: prefixBeforeRemainder,
        externalSuffix,
        allowInitialGroup: true,
        indeterminatePhoneContext,
        inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
      }
    };
  }

  // Resolve an exact context-free telephone before a dash- or slash-attached
  // complete observation or a second independently complete telephone. The
  // partition is proved at the source boundary itself, so an observation
  // cannot begin inside
  // the terminal group of the first telephone and a later optimizer cannot
  // enlarge or shorten either validated interval.
  const initialDashTransition = unoverriddenIdentifierContext
    ? null
    : initialPartitionTransition;
  if (initialDashTransition) {
    const { initialPhone, laterPhone, observation } = initialDashTransition;
    if (laterPhone) {
      const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
        0,
        initialPhone.start
      )}[contact omitted]${candidate.slice(
        initialPhone.end,
        laterPhone.start
      )}[contact omitted]`;
      if (laterPhone.end >= candidate.length) return [initialPhone, laterPhone];
      return {
        ranges: [initialPhone, laterPhone],
        next: {
          offset: laterPhone.end,
          externalPrefix: prefixBeforeRemainder,
          externalSuffix,
          allowInitialGroup: true,
          indeterminatePhoneContext,
          inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
        }
      };
    }

    const postObservationPhone = observation
      && observation.end < candidate.length
      ? independentPhoneStartAfterObservation(
          candidate,
          groups,
          observation,
          externalPrefix,
          externalSuffix,
          indeterminatePhoneContext,
          explicitPhoneLabelContext
        )
      : null;
    if (!postObservationPhone) return [initialPhone];

    const prefixBeforeRemainder = `${externalPrefix}${candidate.slice(
      0,
      initialPhone.start
    )}[contact omitted]${candidate.slice(
      initialPhone.end,
      postObservationPhone.start
    )}[contact omitted]`;
    if (postObservationPhone.end >= candidate.length) {
      return [initialPhone, postObservationPhone];
    }
    return {
      ranges: [initialPhone, postObservationPhone],
      next: {
        offset: postObservationPhone.end,
        externalPrefix: prefixBeforeRemainder,
        externalSuffix,
        allowInitialGroup: true,
        indeterminatePhoneContext:
          postObservationPhone.suppressRemainderIndeterminatePhoneContext
            ? false
            : indeterminatePhoneContext,
        inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
      }
    };
  }

  // A context-free international telephone interval owns only the source
  // characters proved by its intrinsic grouping. When the remaining candidate
  // is exactly one dash-attached formatted observation, preserve that
  // observation instead of allowing whole-span international scoring to widen
  // the rendered redaction interval.
  const boundedInitialIntrinsicPhone = allowInitialGroup
    ? validatedIntrinsicPhoneContinuation(candidate, groups, 0)
    : null;
  const boundedInitialIntrinsicSource = boundedInitialIntrinsicPhone
    ? candidate.slice(
        boundedInitialIntrinsicPhone.start,
        boundedInitialIntrinsicPhone.end
      ).trim().normalize('NFKC')
    : '';
  const boundedInitialRemainder = boundedInitialIntrinsicPhone
    ? candidate.slice(boundedInitialIntrinsicPhone.end).normalize('NFKC')
    : '';
  if (boundedInitialIntrinsicPhone
      && boundedInitialIntrinsicPhone.end < candidate.length
      && isInternationalPhoneCandidate(boundedInitialIntrinsicSource)
      && /^[-‐‑‒–—−]\s*\d{1,9}\.\d{1,6}$/u.test(
        boundedInitialRemainder
      )) {
    return [boundedInitialIntrinsicPhone];
  }

  if (hasExplicitIdentifierPrefixNormalized(normalizedExternalPrefix) && !phoneLabelContext) {
    const identifierOwnedTransition = identifierOwnedObservationPhoneTransition(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext
    );
    if (identifierOwnedTransition) {
      const { laterPhone } = identifierOwnedTransition;
      if (laterPhone.end >= candidate.length) return [laterPhone];
      return {
        ranges: [laterPhone],
        next: {
          offset: laterPhone.end,
          externalPrefix:
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
          externalSuffix,
          allowInitialGroup: true,
          indeterminatePhoneContext:
            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext,
          inheritedExplicitPhoneLabelContext: false
        }
      };
    }

    const identifierObservation = trailingObservationGroup(
      candidate, groups, '', externalSuffix, indeterminatePhoneContext
    );
    if (identifierObservation.group > 0
        && identifierObservation.group < groups.length) {
      const identifierBounds = phoneWindowBounds(
        candidate, groups, 0, identifierObservation.group - 1
      );
      if (phoneCandidateScore(candidate.slice(identifierBounds.start, identifierBounds.end), '')) {
        const laterPhone = independentPhoneStartAfterObservation(
          candidate,
          groups,
          identifierObservation,
          externalPrefix,
          externalSuffix,
          indeterminatePhoneContext,
          explicitPhoneLabelContext
        );
        if (laterPhone) {
          if (laterPhone.end >= candidate.length) return [laterPhone];
          return {
            ranges: [laterPhone],
            next: {
              offset: laterPhone.end,
              externalPrefix:
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
              externalSuffix,
              allowInitialGroup: true,
              indeterminatePhoneContext:
                laterPhone.suppressRemainderIndeterminatePhoneContext
                  ? false
                  : indeterminatePhoneContext,
              inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
            }
          };
        }
      }
    }
    const protectedEnd = identifierProtectedPrefixEnd(candidate, groups, externalSuffix);
    if (protectedEnd >= candidate.length) return [];
    return {
      ranges: [],
      next: {
        offset: protectedEnd,
        externalPrefix: `${externalPrefix}${candidate.slice(0, protectedEnd)}`,
        externalSuffix,
        allowInitialGroup: true,
        indeterminatePhoneContext,
        inheritedExplicitPhoneLabelContext: false
      }
    };
  }

  let observation = trailingObservationGroup(
    candidate,
    groups,
    externalPrefix,
    externalSuffix,
    effectivePhoneScoringContext
  );
  const leadingObservationTrimOffset = candidate.length - candidate.trimStart().length;
  let leadingObservationOffset = leadingObservationTrimOffset;
  while (leadingObservationOffset < candidate.length) {
    const character = candidate[leadingObservationOffset];
    if (!Object.hasOwn(
      OBSERVATION_WRAPPER_PAIRS,
      character.normalize('NFKC')
    )) break;
    leadingObservationOffset += character.length;
    while (leadingObservationOffset < candidate.length
        && /\s/u.test(candidate[leadingObservationOffset])) {
      leadingObservationOffset += 1;
    }
  }
  const leadingObservationSource = candidate.slice(leadingObservationOffset);
  const leadingObservationMatch = crossCallbackObservationMatch(
    leadingObservationSource,
    externalSuffix
  );
  const externalWrapperPhoneLabelContext = hasPhoneLabelBeforeOpeningWrappers(
    normalizedExternalPrefix
  );
  const leadingObservationEnd = leadingObservationMatch
    ? leadingObservationOffset + sourceEndForNormalizedPrefix(
        leadingObservationSource,
        leadingObservationMatch[0].length
      )
    : 0;
  const leadingObservationUsesExternalSuffix = Boolean(
    leadingObservationMatch
      && leadingObservationMatch[0].length
        > leadingObservationSource.normalize('NFKC').length
  );
  const leadingIntrinsicPhoneInterval = leadingObservationMatch
      && !leadingObservationUsesExternalSuffix
    ? validatedIntrinsicPhoneInterval(
        candidate,
        groups,
        0,
        externalSuffix
      )
    : null;
  const leadingObservationIsIntrinsicPhone = Boolean(
    leadingIntrinsicPhoneInterval
      && leadingIntrinsicPhoneInterval.start <= groups[0].index
      && leadingIntrinsicPhoneInterval.end >= leadingObservationEnd
  );
  const leadingObservationOwnsInitialGroup = Boolean(
    (leadingObservationUsesExternalSuffix
      || explicitPhoneLabelContext
      || leadingObservationOffset > leadingObservationTrimOffset
      || externalWrapperPhoneLabelContext)
      && leadingObservationMatch
      && !leadingObservationIsIntrinsicPhone
      && !isWeakBareRangeObservation(leadingObservationSource, externalSuffix)
  );
  if (leadingObservationMatch && !leadingObservationIsIntrinsicPhone) {
    observation = {
      group: 0,
      end: leadingObservationEnd
    };
  }
  let demotedWeakObservation = null;
  if (observation.group < groups.length) {
    const weakObservationSource = candidate.slice(groups[observation.group].index);
    const weakObservationIsIntrinsicPhone = Boolean(phoneCandidateScore(
      candidate.slice(groups[observation.group].index, observation.end),
      '',
      false
    ));
    if ((explicitPhoneLabelContext || weakObservationIsIntrinsicPhone)
        && isWeakBareRangeObservation(weakObservationSource, externalSuffix)) {
      demotedWeakObservation = observation;
      observation = {
        group: observation.group,
        end: groups[observation.group].index
      };
    }
  }
  const observationGroup = observation.group;
  // Whole-span authority depends only on the candidate's leading marker or
  // access prefix. Normalize one bounded prefix rather than the complete
  // shrinking remainder on every iterative transition.
  const normalizedCandidatePrefix = candidate
    .slice(0, 64)
    .trimStart()
    .normalize('NFKC');
  const wholeSpanIsAffirmative = isInternationalPhoneCandidate(
    normalizedCandidatePrefix
  ) || phoneLabelContext;
  if (!allowInitialGroup && isInternationalPhoneCandidate(
    normalizedCandidatePrefix
  )) {
    return redactAttachedInternationalSuffixRanges(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      effectivePhoneScoringContext
    );
  }
  if (observationGroup === 0 && demotedWeakObservation) {
    let initialPhoneLastGroup = demotedWeakObservation.group;
    while (initialPhoneLastGroup + 1 < groups.length
        && groups[initialPhoneLastGroup + 1].index
          + groups[initialPhoneLastGroup + 1][0].length
          <= demotedWeakObservation.end) {
      initialPhoneLastGroup += 1;
    }
    const initialPhone = phoneWindowBounds(
      candidate,
      groups,
      demotedWeakObservation.group,
      initialPhoneLastGroup
    );
    const initialPhoneSource = candidate.slice(initialPhone.start, initialPhone.end);
    const initialPhoneIsValid = phoneCandidateScore(
      initialPhoneSource,
      `${externalPrefix}${candidate.slice(0, initialPhone.start)}`,
      effectivePhoneScoringContext
    ) && (!effectivePhoneScoringContext
      || intervalHasContextFreeCloserProof(candidate, initialPhone));
    if (initialPhoneIsValid) {
      const laterPhone = independentPhoneStartAfterObservation(
        candidate,
        groups,
        demotedWeakObservation,
        externalPrefix,
        externalSuffix,
        indeterminatePhoneContext,
        explicitPhoneLabelContext
      );
      if (laterPhone) {
        const prefixBeforeLaterPhone = `${externalPrefix}${candidate.slice(
          0,
          initialPhone.start
        )}[contact omitted]${candidate.slice(initialPhone.end, laterPhone.start)}`;
        if (laterPhone.end >= candidate.length) return [initialPhone, laterPhone];
        return {
          ranges: [initialPhone, laterPhone],
          next: {
            offset: laterPhone.end,
            externalPrefix: `${prefixBeforeLaterPhone}[contact omitted]`,
            externalSuffix,
            allowInitialGroup: true,
            indeterminatePhoneContext:
              laterPhone.suppressRemainderIndeterminatePhoneContext
                ? false
                : indeterminatePhoneContext,
            inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
          }
        };
      }

      const initialProbe = independentPhoneStartAfterObservation(
        candidate,
        groups,
        observation,
        externalPrefix,
        externalSuffix,
        indeterminatePhoneContext,
        explicitPhoneLabelContext
      );
      if (initialProbe
          && initialProbe.start === initialPhone.start
          && initialProbe.end === initialPhone.end) {
        if (initialPhone.end >= candidate.length) return [initialPhone];
        return {
          ranges: [initialPhone],
          next: {
            offset: initialPhone.end,
            externalPrefix: `${externalPrefix}${candidate.slice(
              0,
              initialPhone.start
            )}[contact omitted]`,
            externalSuffix,
            allowInitialGroup: true,
            indeterminatePhoneContext:
              initialProbe.suppressRemainderIndeterminatePhoneContext
                ? false
                : indeterminatePhoneContext,
            inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
          }
        };
      }
      return [initialPhone];
    }
  }
  if (observationGroup === 0 && observation.end < candidate.length) {
    const laterPhone = independentPhoneStartAfterObservation(
      candidate,
      groups,
      observation,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext,
      explicitPhoneLabelContext
    );
    if (laterPhone) {
      if (laterPhone.end >= candidate.length) return [laterPhone];
      return {
        ranges: [laterPhone],
        next: {
          offset: laterPhone.end,
          externalPrefix:
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
          externalSuffix,
          allowInitialGroup: true,
          indeterminatePhoneContext:
            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext,
          inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
        }
      };
    }

    // A leading strong observation and every complete observation traversed
    // after it now own the remainder. If the structured forward scan found no
    // later telephone, do not fall through to generic interval optimization,
    // which has no custody record for those subsequent observation ranges.
    return [];
  }
  if (wholeSpanIsAffirmative && allowInitialGroup && observationGroup > 0) {
    const { start, end } = phoneWindowBounds(candidate, groups, 0, observationGroup - 1);
    const completePhoneSpan = candidate.slice(start, end);
    if (phoneCandidateScore(
      completePhoneSpan,
      `${externalPrefix}${candidate.slice(0, start)}`,
      effectivePhoneScoringContext
    ) && (!effectivePhoneScoringContext
      || intervalHasContextFreeCloserProof(candidate, { start, end }))) {
      const laterPhone = observationGroup < groups.length
        ? independentPhoneStartAfterObservation(
            candidate,
            groups,
            observation,
            externalPrefix,
            externalSuffix,
            indeterminatePhoneContext,
            explicitPhoneLabelContext
          )
        : null;
      if (!laterPhone) return [{ start, end }];
      const preservedObservation = candidate.slice(end, laterPhone.start);
      if (laterPhone.end >= candidate.length) return [{ start, end }, laterPhone];
      return {
        ranges: [{ start, end }, laterPhone],
        next: {
          offset: laterPhone.end,
          externalPrefix:
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
          externalSuffix,
          allowInitialGroup: true,
          indeterminatePhoneContext:
            laterPhone.suppressRemainderIndeterminatePhoneContext
              ? false
              : indeterminatePhoneContext,
          inheritedExplicitPhoneLabelContext: explicitPhoneLabelContext
        }
      };
    }
  }

  const completeDateRanges = completeDateObservationRanges(candidate, groups);
  const intervals = Array.from({ length: groups.length }, () => []);
  const initialIntervalStart = phoneWindowBounds(candidate, groups, 0, 0).start;
  const initialIntervalPrefix = `${externalPrefix}${candidate.slice(
    0,
    initialIntervalStart
  )}`;
  const normalizedInitialIntervalPrefix = initialIntervalPrefix.normalize('NFKC');
  const initialIntervalProvenance = {
    phoneLabelContext: hasPhoneLabelPrefixNormalized(
      normalizedInitialIntervalPrefix
    ),
    urlContext: hasUrlTokenBoundaryPrefixContext(
      normalizedInitialIntervalPrefix
    ),
    identifierContext: hasExplicitIdentifierPrefixNormalized(
      normalizedInitialIntervalPrefix
    )
  };
  const interiorIntervalProvenance = {
    phoneLabelContext: false,
    urlContext: false,
    identifierContext: false
  };
  for (let first = 0; first < groups.length; first += 1) {
    if (!allowInitialGroup) {
      if (first === 0) continue;
      const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
      if (!/\s/u.test(candidate.slice(previousEnd, groups[first].index))) continue;
    }
    for (let last = first;
      last < groups.length && last < first + MAX_PHONE_DIGIT_GROUPS;
      last += 1) {
      const { start, end } = phoneWindowBounds(candidate, groups, first, last);
      const slice = candidate.slice(start, end);
      // Inherited explicit-label authority governs candidate entry and bounded
      // post-observation probes. It must not label arbitrary interior starts,
      // which could outrank a marker-owning canonical telephone interval.
      const intervalProvenance = first === 0
        ? initialIntervalProvenance
        : interiorIntervalProvenance;
      let score = phoneCandidateScore(
        slice,
        '',
        indeterminatePhoneContext,
        intervalProvenance
      );
      if (!score) continue;
      if (rangeOverlapsAny({ start, end }, completeDateRanges)) continue;

      const interval = { start, end };
      const contextualInterval = indeterminatePhoneContext
        || intervalProvenance.phoneLabelContext;
      if (contextualInterval
          && !intervalHasContextFreeCloserProof(candidate, interval)) {
        continue;
      }

      // A proved observation owns only its interior restart points here. The
      // first group remains eligible for whole-span telephone scoring so an
      // intrinsically complete range-shaped phone is not suppressed merely
      // because the same spelling also satisfies the observation grammar.
      if (observationGroup < groups.length
          && ((first === observationGroup && leadingObservationOwnsInitialGroup)
            || (first > observationGroup
              && groups[first].index < observation.end))) continue;
      if (first < observationGroup && last >= observationGroup) continue;
      if (last === observationGroup - 1) score += 32;
      else if (last === groups.length - 1) score += 24;
      else score -= 24;

      if (score > 0) intervals[first].push({ first, last, start, end, score, slice });
    }
  }

  const best = Array(groups.length + 1).fill(null);
  best[groups.length] = { score: 0, redactedDigits: 0, ranges: [] };
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    let choice = best[index + 1];
    for (const interval of intervals[index]) {
      const tail = best[interval.last + 1];
      const redactedDigits = interval.slice.normalize('NFKC').replace(/\D/gu, '').length
        + tail.redactedDigits;
      const proposal = {
        score: interval.score + tail.score,
        redactedDigits,
        ranges: [interval, ...tail.ranges]
      };
      if (proposal.score > choice.score
          || (proposal.score === choice.score
            && proposal.redactedDigits < choice.redactedDigits)) {
        choice = proposal;
      }
    }
    best[index] = choice;
  }

  return [...best[0].ranges]
    .sort((left, right) => left.start - right.start)
    .map(({ start, end }) => ({ start, end }));
}

function renderPhoneRedactionRanges(candidate, ranges) {
  if (!ranges.length) return candidate;
  let cursor = 0;
  let output = '';
  for (const range of ranges) {
    if (range.start < cursor) continue;
    output += candidate.slice(cursor, range.start);
    output += '[contact omitted]';
    cursor = range.end;
  }
  return `${output}${candidate.slice(cursor)}`;
}

function redactPhoneSubspans(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  return renderPhoneRedactionRanges(
    candidate,
    phoneRedactionRanges(
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext
    )
  );
}




function localNarrativeConstructTail(value) {
  const normalized = value.normalize('NFKC');
  let start = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    if (/[\r\n([{<:;|]/u.test(normalized[index])) start = index + 1;
  }
  return normalized.slice(start).trim();
}

function isIsolatedTelephoneLabelConstruct(value, contextStart, periodIndex) {
  const local = value.slice(contextStart).normalize('NFKC');
  const relativePeriodIndex = value.slice(contextStart, periodIndex).normalize('NFKC').length;
  const labelMatch = local.match(
    /(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)(?:\s*\.\s*)?(?:(?:\s+(?:number|no)(?:\s*\.\s*)?)|\s*#)?\s*$/iu
  );
  if (!labelMatch || relativePeriodIndex < labelMatch.index) return false;

  const beforeLabel = local.slice(0, labelMatch.index);
  if (!/\S/u.test(beforeLabel)) return true;
  if (/[\r\n]\s*$/u.test(beforeLabel)) return true;
  return /[([{<:;|]\s*$/u.test(beforeLabel);
}

function isDomainLikeNarrativeToken(token, prefixBeforeToken) {
  if (/^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,63}$/iu.test(token)) {
    return true;
  }
  if (!/^(?:[\p{L}\p{N}-]+\.)+[\p{L}\p{N}-]+$/u.test(token)) return false;
  return /(?:^|[\s([{<:;|])(?:visit|browse|open|see|site|website|domain|host|url|at)(?:\s*[:=#-]\s*|\s+)$/iu.test(
    prefixBeforeToken
  );
}

function isMultiPeriodNarrativeAbbreviation(token, prefixBeforeToken) {
  if (isDomainLikeNarrativeToken(token, prefixBeforeToken)) return false;
  if (/^(?:\p{L}\.)+\p{L}$/u.test(token)) return true;
  return /^(?:ph|ed|sc|th|litt)\.d$/iu.test(token);
}

function isTelephoneLabelRemainder(value) {
  return /^(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)(?:(?:\s+(?:number|no)(?:\s*\.)?)|\s*#)?\s*[:.]?\s*$/iu.test(
    value.normalize('NFKC').trim()
  );
}

function isSimpleEntityPrefix(value) {
  const local = localNarrativeConstructTail(value);
  if (!local) return false;
  const words = local.split(/\s+/u);
  if (words.length > 4) return false;
  return words.every(word =>
    /^[\p{Lu}\p{Lt}\d][\p{L}\p{N}&'’\-]*$/u.test(word)
  );
}

function isBoundedSentencePredicate(value) {
  return /^(?:am|is|are|was|were|be|been|being|have|has|had|having|will|would|shall|should|can|could|may|might|must|do|does|did|doing|say|says|said|saying|call|calls|called|calling|ask|asks|asked|asking|need|needs|needed|needing|want|wants|wanted|wanting|use|uses|used|using|see|sees|saw|seen|seeing|think|thinks|thought|thinking|move|moves|moved|moving|live|lives|lived|living|work|works|worked|working|send|sends|sent|sending|contact|contacts|contacted|contacting|email|emails|emailed|emailing|text|texts|texted|texting|dial|dials|dialed|dialing|reply|replies|replied|replying|write|writes|wrote|written|writing|read|reads|reading|find|finds|found|finding|get|gets|got|getting|care|cares|cared|caring|help|helps|helped|helping|lead|leads|led|leading|provide|provides|provided|providing|offer|offers|offered|offering|remain|remains|remained|remaining|matter|matters|mattered|mattering|seem|seems|seemed|seeming|become|becomes|became|becoming|make|makes|made|making|take|takes|took|taken|taking|give|gives|gave|given|giving|know|knows|knew|known|knowing|look|looks|looked|looking|come|comes|came|coming|go|goes|went|gone|going|keep|keeps|kept|keeping|let|lets|letting|support|supports|supported|supporting|serve|serves|served|serving|build|builds|built|building|run|runs|ran|running)$/u.test(
    value.toLocaleLowerCase('en-US')
  );
}

function isStrongFiniteSentencePredicate(value) {
  const lower = value.toLocaleLowerCase('en-US');
  if (!isBoundedSentencePredicate(lower)) return false;
  return !/^(?:be|been|being|having|doing|saying|calling|asking|needing|wanting|using|seen|seeing|thinking|moving|living|working|sending|contacting|emailing|texting|dialing|replying|written|writing|reading|finding|getting|caring|helping|leading|providing|offering|remaining|mattering|seeming|becoming|making|taken|taking|given|giving|known|knowing|looking|coming|gone|going|keeping|letting|supporting|serving|building|running)$/u.test(lower);
}

const sentenceObjectMarkerPattern = /^(?:a|an|the|my|our|your|his|her|its|their|this|that|these|those)$/u;
const sentenceAuxiliaryPattern = /^(?:am|is|are|was|were|have|has|had|will|would|shall|should|can|could|may|might|must|do|does|did)$/u;
const institutionalSuffixPattern = /^(?:academy|agency|army|association|bank|battalion|brigade|center|centre|club|collective|command|company|corp|corporation|council|department|district|division|fleet|force|foundation|fund|group|holdings|initiative|institute|institution|lab|labs|laboratory|media|museum|network|office|organization|organisation|partners|people|project|records|regiment|services|society|solutions|squadron|studio|systems|team|trust|ventures|wing|works)$/u;
const titleConnectorPattern = /^(?:a|an|and|at|by|for|from|in|of|on|the|to|with|&)$/iu;
const lexicalIngBasePredicatePattern = /^(?:bring|cling|ding|fling|ping|ring|sing|sling|spring|sting|string|swing|wing|wring)$/u;
const copularPredicatePattern = /^(?:am|is|are|was|were)$/u;
const compactNamedObjectPattern = /^(?:[\p{Lu}\p{Lt}][\p{Ll}\p{M}\p{N}&'’\-]*|[\p{Lu}\d]{2,4})$/u;

function isLikelyRegularFiniteSentencePredicate(value, lead, followingTokens) {
  const lower = value.toLocaleLowerCase('en-US');
  if (!/^\p{L}{3,}$/u.test(lower) || followingTokens.length === 0) return false;

  if (/^(?:\p{L}+ed|\p{L}*[^aeiou]ied)$/u.test(lower)) {
    return followingTokens.length >= 2
      || sentenceObjectMarkerPattern.test(followingTokens[0].toLocaleLowerCase('en-US'));
  }

  const normalizedLead = lead.toLocaleLowerCase('en-US');
  if (/^(?:he|she|this|that)$/u.test(normalizedLead)
      && /^(?:\p{L}{2,}(?:s|es)|\p{L}*[^aeiou]ies)$/u.test(lower)) {
    return followingTokens.length >= 2;
  }

  const upper = value.toLocaleUpperCase('en-US');
  const hasCase = lower !== upper;
  const ordinaryOrAllCapsToken = /\p{Ll}/u.test(value) || (hasCase && value === upper);
  if (/^(?:we|you|they|these|those)$/u.test(normalizedLead)
      && ordinaryOrAllCapsToken
      && !isBoundedSentencePredicate(value)
      && !sentenceAuxiliaryPattern.test(lower)
      && !sentenceObjectMarkerPattern.test(lower)
      && !titleConnectorPattern.test(value)
      && !institutionalSuffixPattern.test(lower)
      && !/ed$/u.test(lower)
      && (!/ing$/u.test(lower)
          || lexicalIngBasePredicatePattern.test(lower))) {
    const firstFollowing = followingTokens[0].toLocaleLowerCase('en-US');
    if (sentenceObjectMarkerPattern.test(firstFollowing)) {
      return followingTokens.length >= 2;
    }
    if (titleConnectorPattern.test(followingTokens[0])) return false;

    const finalFollowing = followingTokens.at(-1).toLocaleLowerCase('en-US');
    if (institutionalSuffixPattern.test(finalFollowing)) {
      return followingTokens.length === 2
        && !institutionalSuffixPattern.test(firstFollowing)
        && compactNamedObjectPattern.test(followingTokens[0]);
    }
    return true;
  }

  return false;
}

function isCopularInstitutionTitleShape(predicate, postPredicateTokens) {
  return copularPredicatePattern.test(predicate.toLocaleLowerCase('en-US'))
    && postPredicateTokens.length >= 3
    && sentenceObjectMarkerPattern.test(
      postPredicateTokens[0].toLocaleLowerCase('en-US')
    )
    && institutionalSuffixPattern.test(
      postPredicateTokens.at(-1).toLocaleLowerCase('en-US')
    );
}

function isTitleCasedPronounObjectClause(value) {
  const normalized = value.normalize('NFKC').trim();
  const leadMatch = normalized.match(
    /^(?:i|we|you|he|she|they|it|this|that|these|those)(?:\s+|$)/iu
  );
  if (!leadMatch) return false;

  const words = normalized.split(/\s+/u);
  const titleCasedPhrase = words.every((word, index) => {
    if (titleConnectorPattern.test(word)) return true;
    if (index === 0 && /^I$/u.test(word)) return true;
    return /^[\p{Lu}\p{Lt}][\p{Ll}\p{M}\p{N}&'’\-]*$/u.test(word);
  });
  if (!titleCasedPhrase) return false;

  const lead = leadMatch[0].trim();
  const tokens = normalized.slice(leadMatch[0].length)
    .match(/[\p{L}]+/gu)?.slice(0, 8) ?? [];
  if (tokens.length < 3) return false;

  const predicate = tokens[0];
  const postPredicateTokens = tokens.slice(1);
  if (isCopularInstitutionTitleShape(predicate, postPredicateTokens)) {
    return false;
  }
  return (isStrongFiniteSentencePredicate(predicate)
      || isLikelyRegularFiniteSentencePredicate(
        predicate,
        lead,
        postPredicateTokens
      ))
    && sentenceObjectMarkerPattern.test(
      postPredicateTokens[0].toLocaleLowerCase('en-US')
    )
    && postPredicateTokens.length >= 2;
}

function isStrongPronounClauseWithinInstitutionalPhrase(value) {
  const normalized = value.normalize('NFKC').trim();
  if (/^(?:i|we|you|he|she|they|it|this|that|these|those)['’](?:m|s|re|ve|ll|d)(?=$|[^\p{L}])/iu.test(normalized)) {
    return true;
  }

  const leadMatch = normalized.match(
    /^(?:i|we|you|he|she|they|it|this|that|these|those)(?:\s+|$)/iu
  );
  if (!leadMatch) return false;
  const lead = leadMatch[0].trim();
  const tokens = normalized.slice(leadMatch[0].length)
    .match(/[\p{L}]+/gu)?.slice(0, 8) ?? [];
  if (tokens.length === 0) return false;

  const likelyPredicate = (token, index) => {
    const followingTokens = tokens.slice(index + 1);
    return isBoundedSentencePredicate(token)
      || isLikelyRegularFiniteSentencePredicate(token, lead, followingTokens);
  };
  const predicateIndex = tokens.findIndex(likelyPredicate);

  if (predicateIndex >= 0) {
    const predicate = tokens[predicateIndex];
    const postPredicateTokens = tokens.slice(predicateIndex + 1);
    if (predicateIndex === 0
        && isCopularInstitutionTitleShape(predicate, postPredicateTokens)) {
      return false;
    }
    if (postPredicateTokens.some(token =>
      sentenceObjectMarkerPattern.test(token.toLocaleLowerCase('en-US'))
    )) return true;

    const lowerPredicate = predicate.toLocaleLowerCase('en-US');
    if (sentenceAuxiliaryPattern.test(lowerPredicate)) {
      return postPredicateTokens.some((token, index) =>
        isBoundedSentencePredicate(token)
        || isLikelyRegularFiniteSentencePredicate(
          token,
          lead,
          postPredicateTokens.slice(index + 1)
        )
      ) || postPredicateTokens.length >= 2;
    }

    if (predicateIndex > 0) return isStrongFiniteSentencePredicate(predicate);
    if (postPredicateTokens.length >= 2) return true;
  }

  return false;
}

function isLikelyNamedEntityContinuation(value) {
  const normalized = value.normalize('NFKC').trim();
  const labelMatch = normalized.match(
  /(?:^|[\s,;:·•\-‐‑‒–—―−|/\\]+)(?:(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)(?:(?:\s+(?:number|no)(?:\s*\.)?)|\s*#)?\s*[:.]?\s*|(?:電話(?:番号)?|携帯(?:電話)?|ファックス|連絡先|お問い合わせ先)\s*[:.]?\s*)$/iu
);
  const phrase = (labelMatch
    ? normalized.slice(0, labelMatch.index)
    : normalized).trim();
  if (!phrase || /[.!?。！？]/u.test(phrase)) return false;

  const words = phrase.split(/\s+/u);
  if (words.length < 2 || words.length > 10) return false;
  const connectorPattern = /^(?:a|an|and|at|by|for|from|in|of|on|the|to|with|&)$/iu;
  const nameTokenPattern = /^[\p{Lu}\p{Lt}\d][\p{L}\p{M}\p{N}&'’\-]*$/u;
  if (!words.every(word => connectorPattern.test(word) || nameTokenPattern.test(word))) {
    return false;
  }

  const suffix = words.at(-1).toLocaleLowerCase('en-US');
  const hasInstitutionalSuffix = institutionalSuffixPattern.test(suffix);
  if (hasInstitutionalSuffix) {
    const casedWords = words.filter(word => /\p{L}/u.test(word));
    const allCapsPhrase = casedWords.length > 0 && casedWords.every(word => {
      const lower = word.toLocaleLowerCase('en-US');
      const upper = word.toLocaleUpperCase('en-US');
      return lower === upper || word === upper;
    });
    // Override the suffix only for unlabelled all-caps clauses. A
    // terminal phone label and title casing are affirmative name evidence.
    if (!labelMatch
        && (isTitleCasedPronounObjectClause(phrase)
  || (allCapsPhrase
      && isStrongPronounClauseWithinInstitutionalPhrase(phrase)))) {
      return false;
    }
    return true;
  }

  const hasMixedCaseTitleToken = words.slice(1).some(word =>
  nameTokenPattern.test(word) && /\p{Ll}/u.test(word)
);
if (!labelMatch && isTitleCasedPronounObjectClause(phrase)) return false;
return words.length >= 3 && hasMixedCaseTitleToken;
}

function isPronounSentenceLead(value) {
  const normalized = value.normalize('NFKC').trimStart();
  if (/^(?:i|we|you|he|she|they|it|this|that|these|those)['’](?:m|s|re|ve|ll|d)(?=$|[^\p{L}])/iu.test(normalized)) {
    return true;
  }

  const leadMatch = normalized.match(
    /^(?:i|we|you|he|she|they|it|this|that|these|those)(?:\s+|$)/iu
  );
  if (!leadMatch) return false;
  const lead = leadMatch[0].trim();
  const followingTokens = normalized.slice(leadMatch[0].length)
    .match(/[\p{L}]+/gu)?.slice(0, 4) ?? [];
  return followingTokens.some((token, index) =>
    isBoundedSentencePredicate(token)
    || isLikelyRegularFiniteSentencePredicate(
      token,
      lead,
      followingTokens.slice(index + 1)
    )
  ) || isStrongPronounClauseWithinInstitutionalPhrase(normalized);
}

function startsFreshSentenceAfterAbbreviation(value) {
  const normalized = value.normalize('NFKC').trimStart();
  if (isLikelyNamedEntityContinuation(normalized)) return false;

  const lead = (normalized.match(/^[\p{L}]+/u)?.[0] ?? '')
    .toLocaleLowerCase('en-US');
  if (/^(?:i|we|you|he|she|they|it|this|that|these|those)$/u.test(lead)) {
    return isPronounSentenceLead(normalized);
  }
  return /^(?:then|please|afterward|meanwhile|however|therefore|otherwise|instead|finally)$/u.test(
    lead
  );
}

function isNarrativePeriodAbbreviation(value, contextStart, periodIndex, boundaryEnd) {
  if (isIsolatedTelephoneLabelConstruct(value, contextStart, periodIndex)) return true;

  const normalizedPrefix = value.slice(contextStart, periodIndex).normalize('NFKC');
  const tokenMatch = normalizedPrefix.match(/[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*$/u);
  const token = tokenMatch?.[0] ?? '';
  if (!token) return false;

  const prefixBeforeToken = normalizedPrefix.slice(0, tokenMatch.index);
  const singlePeriodAbbreviation = /^(?:no|dr|mr|mrs|ms|prof|inc|ltd|co|corp|st|vs|etc)$/iu.test(token);
  const multiPeriodAbbreviation = isMultiPeriodNarrativeAbbreviation(token, prefixBeforeToken);
  if (!singlePeriodAbbreviation && !multiPeriodAbbreviation) return false;

  const remainder = value.slice(boundaryEnd);
  const hasRemainder = /\S/u.test(remainder);
  if (hasRemainder && startsFreshSentenceAfterAbbreviation(remainder)) return false;
  if (hasRemainder && !isTelephoneLabelRemainder(remainder)) return true;

  if (!localNarrativeConstructTail(prefixBeforeToken)) return true;
  if (/^(?:inc|ltd|co|corp)$/iu.test(token) && isSimpleEntityPrefix(prefixBeforeToken)) return true;
  return false;
}

function currentNarrativeParenthesisContextStart(value) {
  let contextStart = 0;
  for (const match of value.matchAll(/\r?\n[ \t]*\r?\n/gu)) {
    contextStart = Math.max(contextStart, match.index + match[0].length);
  }

  const boundaryPattern = /[!?。！？][ \t\r\n]*|[.．](?:["'”’»›」』〟＂]*)(?:[ \t\r\n]+|$|(?=(?:(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)\b|(?:電話(?:番号)?|携帯(?:電話)?|ファックス|連絡先|お問い合わせ先))))/giu;
  for (const match of value.matchAll(boundaryPattern)) {
    const boundaryEnd = match.index + match[0].length;
    if (boundaryEnd <= contextStart) continue;
    const normalizedMark = match[0].normalize('NFKC').trimStart()[0] ?? '';
    if (normalizedMark === '.'
        && isNarrativePeriodAbbreviation(value, contextStart, match.index, boundaryEnd)) {
      continue;
    }
    contextStart = boundaryEnd;
  }
  return contextStart;
}

function createParenthesisDepthIndex(value) {
  const prefix = new Int32Array(value.length + 1);
  let hasParentheses = false;
  for (let index = 0; index < value.length; index += 1) {
    const normalized = value[index].normalize('NFKC');
    const delta = normalized === '('
      ? 1
      : normalized === ')'
        ? -1
        : 0;
    hasParentheses ||= delta !== 0;
    prefix[index + 1] = prefix[index] + delta;
  }
  if (!hasParentheses) {
    return {
      hasParentheses: false,
      depth() { return 0; }
    };
  }

  let size = 1;
  while (size < prefix.length) size <<= 1;
  const minimumTree = new Int32Array(size * 2);
  minimumTree.fill(0x7fffffff);
  for (let index = 0; index < prefix.length; index += 1) {
    minimumTree[size + index] = prefix[index];
  }
  for (let index = size - 1; index > 0; index -= 1) {
    minimumTree[index] = Math.min(
      minimumTree[index * 2],
      minimumTree[index * 2 + 1]
    );
  }

  const rangeMinimum = (start, end) => {
    let left = Math.max(0, Math.min(prefix.length, start)) + size;
    let right = Math.max(0, Math.min(prefix.length, end)) + size;
    let minimum = 0x7fffffff;
    while (left < right) {
      if (left & 1) minimum = Math.min(minimum, minimumTree[left++]);
      if (right & 1) minimum = Math.min(minimum, minimumTree[--right]);
      left >>= 1;
      right >>= 1;
    }
    return minimum;
  };

  return {
    hasParentheses: true,
    depth(start, end) {
      const boundedStart = Math.max(0, Math.min(value.length, start));
      const boundedEnd = Math.max(boundedStart, Math.min(value.length, end));
      const startBalance = prefix[boundedStart];
      const finalBalance = prefix[boundedEnd] - startBalance;
      const minimumRelative = rangeMinimum(
        boundedStart,
        boundedEnd + 1
      ) - startBalance;
      return finalBalance - Math.min(0, minimumRelative);
    }
  };
}

function currentNarrativeParenthesisDepth(value, end, parenthesisDepthIndex) {
  const boundedEnd = Math.max(0, Math.min(value.length, end));
  if (!parenthesisDepthIndex.hasParentheses
      || parenthesisDepthIndex.depth(0, boundedEnd) === 0) return 0;
  const prefix = value.slice(0, boundedEnd);
  const contextStart = currentNarrativeParenthesisContextStart(prefix);
  return parenthesisDepthIndex.depth(contextStart, boundedEnd);
}

function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  availableOuterOpeners,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false,
  returnMetadata = false
) {
  let leadingCursor = 0;
  while (leadingCursor < candidate.length && /\s/u.test(candidate[leadingCursor])) {
    leadingCursor += 1;
  }
  const leadingOpeners = [];
  while (leadingCursor < candidate.length
      && candidate[leadingCursor].normalize('NFKC') === '(') {
    leadingOpeners.push(leadingCursor);
    leadingCursor += 1;
    while (leadingCursor < candidate.length && /\s/u.test(candidate[leadingCursor])) {
      leadingCursor += 1;
    }
  }
  const structuralOpeningIndexes = new Set(leadingOpeners.slice(0, -1));
  if (!availableOuterOpeners && !structuralOpeningIndexes.size) return null;

  const openerStack = Array.from({ length: availableOuterOpeners }, () => true);
  const sanitizedCharacters = [];
  const originalIndexes = [];
  const closerEvents = [];

  for (let index = 0; index < candidate.length; index += 1) {
    const character = candidate[index];
    const normalized = character.normalize('NFKC');
    if (normalized === '(') {
      const survivesRedaction = structuralOpeningIndexes.has(index);
      openerStack.push(survivesRedaction);
      if (!survivesRedaction) {
        sanitizedCharacters.push(character);
        originalIndexes.push(index);
      }
      continue;
    }
    if (normalized === ')') {
      const openerSurvives = openerStack.pop();
      if (openerSurvives === false) {
        sanitizedCharacters.push(character);
        originalIndexes.push(index);
      } else {
        closerEvents.push({
          index,
          sanitizedIndex: sanitizedCharacters.length,
          glyph: character,
          owned: openerSurvives === true
        });
        sanitizedCharacters.push(' ');
        originalIndexes.push(index);
      }
      continue;
    }
    sanitizedCharacters.push(character);
    originalIndexes.push(index);
  }

  if (!closerEvents.some(event => event.owned)) return null;
  const sanitizedCandidate = sanitizedCharacters.join('');
  const initialRanges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  );
  // A preliminary range may use inherited bounded-context authority. Such a
  // range cannot prove that a removed narrative closer is internal to one
  // telephone, because the closer itself terminates only that inherited
  // authority. Re-prove crossing intervals without the overflow flag while
  // retaining explicit labels and intrinsic telephone structure.
  const boundaryProofRanges = phoneRedactionRanges(
    sanitizedCandidate,
    '',
    externalSuffix,
    allowInitialGroup,
    false,
    false
  );

  const boundaries = closerEvents.map(event => ({
    event,
    sanitizedIndex: event.sanitizedIndex
  })).filter(boundary => boundary.sanitizedIndex >= 0)
    .sort((left, right) => left.sanitizedIndex - right.sanitizedIndex);
  const segmentationBoundaries = boundaries.filter(boundary =>
    !boundaryProofRanges.some(range =>
      range.start < boundary.sanitizedIndex
        && range.end > boundary.sanitizedIndex
    )
  );
  let ranges = initialRanges;

  if (segmentationBoundaries.length) {
    ranges = [];
    let segmentStart = 0;
    let renderedPrefix = '';
    let segmentIndeterminatePhoneContext = indeterminatePhoneContext;

    for (let index = 0; index <= segmentationBoundaries.length; index += 1) {
      const boundary = segmentationBoundaries[index] ?? null;
      const segmentEnd = boundary?.sanitizedIndex ?? sanitizedCandidate.length;
      const segment = sanitizedCandidate.slice(segmentStart, segmentEnd);
      const localRanges = phoneRedactionRanges(
        segment,
        `${externalPrefix}${renderedPrefix}`,
        boundary
          ? `${candidate.slice(boundary.event.index)}${externalSuffix}`
          : externalSuffix,
        segmentStart === 0 ? allowInitialGroup : true,
        segmentIndeterminatePhoneContext,
        segmentStart === 0 ? inheritedExplicitPhoneLabelContext : false
      );
      ranges.push(...localRanges.map(range => ({
        ...range,
        start: range.start + segmentStart,
        end: range.end + segmentStart
      })));
      renderedPrefix += renderPhoneRedactionRanges(segment, localRanges);
      if (!boundary) break;

      // A removed closer that is not internal to a proved telephone interval
      // terminates only overflow-derived authority. Crossed closers remain in
      // the current segment so established domestic grouping is unchanged.
      renderedPrefix += boundary.event.glyph;
      segmentStart = segmentEnd + 1;
      segmentIndeterminatePhoneContext = false;
    }
  }
  const handledBySegmentation = segmentationBoundaries.length > 0;
  if (!ranges.length) {
    if (!handledBySegmentation) return null;
    return returnMetadata ? { output: candidate, ranges: [] } : candidate;
  }

  const mappedRanges = ranges.map(range => ({
    ...range,
    start: range.start < originalIndexes.length
      ? originalIndexes[range.start]
      : candidate.length,
    end: range.end > range.start
      ? originalIndexes[range.end - 1] + 1
      : (range.start < originalIndexes.length ? originalIndexes[range.start] : candidate.length)
  }));

  const consumedClosers = new Set();
  const events = mappedRanges.map(range => {
    const containedClosers = closerEvents
      .filter(event => event.index >= range.start && event.index < range.end)
      .sort((left, right) => left.index - right.index);
    let replacement = '[contact omitted]';
    let previousOwned = null;
    for (const closer of containedClosers) {
      consumedClosers.add(closer.index);
      if (!closer.owned) {
        previousOwned = null;
        continue;
      }
      if (previousOwned) {
        const between = candidate.slice(previousOwned.index + 1, closer.index);
        if (/^\s*$/u.test(between)) replacement += between;
      }
      replacement += closer.glyph;
      previousOwned = closer;
    }
    return { ...range, replacement };
  });

  for (let index = 0; index < closerEvents.length; index += 1) {
    const closer = closerEvents[index];
    if (!consumedClosers.has(closer.index) && !closer.owned) {
      let deletionStart = closer.index;
      const previousCloser = closerEvents[index - 1] ?? null;
      if (previousCloser) {
        const between = candidate.slice(previousCloser.index + 1, closer.index);
        if (/^\s*$/u.test(between)) deletionStart = previousCloser.index + 1;
      }
      for (const range of mappedRanges) {
        if (deletionStart < range.end && closer.index >= range.end) {
          deletionStart = range.end;
        }
      }
      events.push({ start: deletionStart, end: closer.index + 1, replacement: '' });
    }
  }
  events.sort((left, right) => left.start - right.start || right.end - left.end);

  let cursor = 0;
  let output = '';
  for (const event of events) {
    if (event.start < cursor) continue;
    output += candidate.slice(cursor, event.start);
    output += event.replacement;
    cursor = event.end;
  }
  output += candidate.slice(cursor);
  if (output === candidate && !handledBySegmentation) return null;
  return returnMetadata ? { output, ranges: mappedRanges } : output;
}

function stripUnownedLeadingPhoneClosers(value, availableOuterOpeners) {
  let preservedClosers = 0;
  let cursor = 0;
  let output = '';
  let pendingWhitespace = '';
  while (cursor < value.length) {
    const character = value[cursor];
    const normalized = character.normalize('NFKC');
    if (/\s/u.test(character)) {
      pendingWhitespace += character;
      cursor += 1;
      continue;
    }
    if (normalized !== ')') break;
    if (preservedClosers < availableOuterOpeners) {
      output += `${pendingWhitespace}${character}`;
      preservedClosers += 1;
    }
    pendingWhitespace = '';
    cursor += 1;
  }
  return `${output}${pendingWhitespace}${value.slice(cursor)}`;
}

function findOwnedNarrativePhoneWrapper(
  candidate,
  input,
  offset,
  contactOffset,
  parenthesisDepthIndex
) {
  if (!/[+＋]/u.test(input[contactOffset] ?? '')) return null;

  let scanIndex = contactOffset - 1;
  let adjacentOpeners = 0;
  let firstOpenerIndex = contactOffset;
  while (scanIndex >= 0) {
    while (scanIndex >= 0 && /\s/u.test(input[scanIndex])) scanIndex -= 1;
    if (!/[（(]/u.test(input[scanIndex] ?? '')) break;
    adjacentOpeners += 1;
    firstOpenerIndex = scanIndex;
    scanIndex -= 1;
  }
  const availableOuterOpeners = currentNarrativeParenthesisDepth(
    input,
    firstOpenerIndex,
    parenthesisDepthIndex
  );
  if (!adjacentOpeners && !availableOuterOpeners) return null;
  let internalDepth = 0;
  const candidateEnd = offset + candidate.length;
  for (let index = contactOffset; index < candidateEnd; index += 1) {
    const normalized = input[index].normalize('NFKC');
    if (normalized === '(') {
      internalDepth += 1;
      continue;
    }
    if (normalized !== ')') continue;
    if (internalDepth > 0) {
      internalDepth -= 1;
      continue;
    }

    const closeIndex = index - offset;
    let closeEnd = closeIndex;
    let preservedClosers = 0;
    let cursor = closeIndex;
    while (cursor < candidate.length && preservedClosers < adjacentOpeners) {
      const character = candidate[cursor];
      const normalizedCharacter = character.normalize('NFKC');
      if (normalizedCharacter === ')') {
        preservedClosers += 1;
        closeEnd = cursor + 1;
        cursor += 1;
        continue;
      }
      if (/\s/u.test(character)) {
        cursor += 1;
        continue;
      }
      break;
    }

    return {
      closeIndex,
      closeEnd,
      closers: candidate.slice(closeIndex, closeEnd),
      availableOuterOpeners
    };
  }
  return null;
}

function crossCallbackObservationMatch(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  const ordinaryMatch = numericObservationMatch(boundedSource, externalSuffix);
  if (!unitMatch) return ordinaryMatch;
  if (!ordinaryMatch || unitMatch[0].length > ordinaryMatch[0].length) {
    return unitMatch;
  }
  return ordinaryMatch;
}

function rangeOverlapsAny(range, ranges) {
  return ranges.some(existing =>
    range.start < existing.end && range.end > existing.start
  );
}

function hasFreshCrossCallbackNarrativeBoundary(value) {
  const normalized = value.normalize('NFKC');
  return /[\r\n!?。！？]/u.test(normalized)
    || /(?:^|[^0-9])\.(?:\s*[)\]}】])*\s/u.test(normalized);
}

function hasOnlyAcceptedCrossCallbackOpeners(value) {
  for (const character of value.normalize('NFKC')) {
    if (/\s/u.test(character)
        || character === '+'
        || Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, character)) continue;
    return false;
  }
  return true;
}

function advanceCrossCallbackNarrativeBoundary(state, value) {
  let { found, periodPending, previous } = state;
  if (found) return state;

  for (const character of value.normalize('NFKC')) {
    if (/[\r\n!?。！？]/u.test(character)) {
      return { found: true, periodPending: false, previous: character };
    }
    if (periodPending) {
      if (/\s/u.test(character)) {
        return { found: true, periodPending: false, previous: character };
      }
      if (/[)\]}】]/u.test(character)) {
        previous = character;
        continue;
      }
      periodPending = false;
    }
    if (character === '.' && (previous === '' || !/[0-9]/u.test(previous))) {
      periodPending = true;
    }
    previous = character;
  }

  return { found: false, periodPending, previous };
}

function crossCallbackPhoneObservationBridge(
  lease,
  candidate,
  offset,
  input
) {
  if (!lease || offset < lease.end || offset - lease.end > 64) return null;
  if (/[\r\n]/u.test(input.slice(lease.end, offset))) return null;

  const lastRedactedEnd = Math.max(...lease.ranges.map(range => range.end));
  const groups = [...lease.candidate.matchAll(DIGIT_RUN_PATTERN)];
  const sourceLimit = Math.min(
    input.length,
    offset + candidate.length + 64
  );

  // Track the furthest source endpoint claimed by observations that start at
  // earlier digit groups. Each group is parsed once against a bounded source
  // window, while sentence-boundary state advances monotonically between seeds.
  let earlierObservationEnd = lastRedactedEnd;
  let narrativeBoundaryEnd = lastRedactedEnd;
  let narrativeBoundaryState = {
    found: false,
    periodPending: false,
    previous: ''
  };
  for (const seed of groups) {
    if (seed.index > narrativeBoundaryEnd) {
      narrativeBoundaryState = advanceCrossCallbackNarrativeBoundary(
        narrativeBoundaryState,
        lease.candidate.slice(narrativeBoundaryEnd, seed.index)
      );
      narrativeBoundaryEnd = seed.index;
    }
    const seedRange = {
      start: seed.index,
      end: seed.index + seed[0].length
    };
    const fallsInsideEarlierObservation = earlierObservationEnd >= seedRange.end;
    if (seedRange.start >= lastRedactedEnd) {
      const localSource = lease.candidate.slice(
        seed.index,
        seed.index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
      );
      const localObservation = numericObservationMatch(localSource);
      if (localObservation) {
        earlierObservationEnd = Math.max(
          earlierObservationEnd,
          seed.index + sourceEndForNormalizedPrefix(
            localSource,
            localObservation[0].length
          )
        );
      }
    }
    if (seedRange.start < lastRedactedEnd) continue;
    if (rangeOverlapsAny(seedRange, lease.ranges)) continue;
    if (fallsInsideEarlierObservation) continue;

    if (narrativeBoundaryState.found) continue;

    const absoluteSeedStart = lease.offset + seed.index;
    const source = input.slice(
      absoluteSeedStart,
      Math.min(
        sourceLimit,
        absoluteSeedStart + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
      )
    );
    const observation = crossCallbackObservationMatch(source);
    if (!observation || isWeakBareRangeObservation(source)) continue;

    const absoluteObservationEnd = absoluteSeedStart
      + sourceEndForNormalizedPrefix(source, observation[0].length);
    if (absoluteObservationEnd <= lease.end
        || absoluteObservationEnd > offset + candidate.length) {
      continue;
    }

    const observationSource = input.slice(
      absoluteSeedStart,
      absoluteObservationEnd
    );
    if (/[\r\n]/u.test(observationSource)) continue;

    let currentObservationEnd = absoluteObservationEnd - offset;
    if (currentObservationEnd < 0) {
      const trailingGap = input.slice(absoluteObservationEnd, offset);
      if (/[\r\n]/u.test(trailingGap)
          || !hasOnlyAcceptedCrossCallbackOpeners(trailingGap)) {
        continue;
      }
      currentObservationEnd = 0;
    }

    const remainder = candidate.slice(currentObservationEnd);
    const firstDigit = remainder.search(/[0-9０-９]/u);
    if (firstDigit < 0) continue;
    const absoluteFirstDigit = offset + currentObservationEnd + firstDigit;
    const transition = input.slice(
      absoluteObservationEnd,
      absoluteFirstDigit
    );
    const dashPhoneSource = input.slice(
      absoluteObservationEnd,
      Math.min(
        sourceLimit,
        absoluteObservationEnd + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
      )
    );
    const intrinsicDashPhoneInterval =
      intrinsicPhoneIntervalAfterDashBoundary(dashPhoneSource);
    if (/[\r\n]/u.test(transition)
        || (!hasOnlyAcceptedCrossCallbackOpeners(transition)
          && !intrinsicDashPhoneInterval)) {
      continue;
    }

    const localSourceStart = offset + currentObservationEnd;
    const validatedPhoneInterval = intrinsicDashPhoneInterval
      ? {
          start: absoluteObservationEnd
            + intrinsicDashPhoneInterval.start
            - localSourceStart,
          end: absoluteObservationEnd
            + intrinsicDashPhoneInterval.end
            - localSourceStart
        }
      : null;
    const validatedPhoneIntervalIsLocal = Boolean(
      validatedPhoneInterval
        && validatedPhoneInterval.start >= 0
        && validatedPhoneInterval.end > validatedPhoneInterval.start
        && validatedPhoneInterval.end <= candidate.length - currentObservationEnd
    );

    return {
      currentObservationEnd,
      observationStart: absoluteSeedStart,
      observationEnd: absoluteObservationEnd,
      explicitPhoneLabelContext: Boolean(lease.explicitPhoneLabelContext),
      validatedPhoneInterval: validatedPhoneIntervalIsLocal
        ? validatedPhoneInterval
        : null
    };
  }

  return null;
}

function createCrossCallbackPhoneObservationLease(
  candidate,
  offset,
  ranges,
  explicitPhoneLabelContext
) {
  if (!ranges.length) return null;
  return {
    candidate,
    offset,
    end: offset + candidate.length,
    ranges: ranges.map(range => ({
      start: range.start,
      end: range.end
    })),
    explicitPhoneLabelContext: Boolean(explicitPhoneLabelContext)
  };
}

function redactPhoneSpanCandidate(
  candidate,
  offset,
  input,
  inheritedExplicitPhoneLabelContext = false,
  validatedInitialPhoneInterval = null,
  parenthesisDepthIndex = createParenthesisDepthIndex(input)
) {
  const firstContactCharacter = candidate.search(/[+＋(（0-9０-９]/u);
  const contactOffset = offset + Math.max(0, firstContactCharacter);
  const prefixContext = redactionPrefixContext(input, contactOffset);
  const prefix = prefixContext.text;
  const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
  const adjacentCharacter = previousCodePoint(input, contactOffset);
  const effectiveInheritedPhoneLabelContext =
    inheritedExplicitPhoneLabelContext
    || prefixContext.explicitPhoneLabelContext;
  const directExplicitPhoneLabelContext = effectiveInheritedPhoneLabelContext
    || hasPhoneLabelPrefix(prefix);
  const allowInitialGroup = prefixContext.indeterminate
    || directExplicitPhoneLabelContext
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter);

  const seededInterval = validatedInitialPhoneInterval
    && Number.isInteger(validatedInitialPhoneInterval.start)
    && Number.isInteger(validatedInitialPhoneInterval.end)
    && validatedInitialPhoneInterval.start >= 0
    && validatedInitialPhoneInterval.end > validatedInitialPhoneInterval.start
    && validatedInitialPhoneInterval.end <= candidate.length
    ? {
        start: validatedInitialPhoneInterval.start,
        end: validatedInitialPhoneInterval.end
      }
    : null;
  if (seededInterval) {
    const remainderResult = seededInterval.end < candidate.length
      ? redactPhoneSpanCandidate(
          candidate.slice(seededInterval.end),
          offset + seededInterval.end,
          input,
          directExplicitPhoneLabelContext,
          null,
          parenthesisDepthIndex
        )
      : {
          output: '',
          ranges: [],
          explicitPhoneLabelContext: false
        };
    const remainderRanges = remainderResult.ranges?.map(range => ({
      start: range.start + seededInterval.end,
      end: range.end + seededInterval.end
    })) ?? null;
    return {
      output: `${candidate.slice(0, seededInterval.start)}[contact omitted]${remainderResult.output}`,
      ranges: remainderRanges === null
        ? null
        : [seededInterval, ...remainderRanges],
      explicitPhoneLabelContext: directExplicitPhoneLabelContext
        || remainderResult.explicitPhoneLabelContext
    };
  }

  const ownedWrapper = findOwnedNarrativePhoneWrapper(
    candidate,
    input,
    offset,
    contactOffset,
    parenthesisDepthIndex
  );

  if (ownedWrapper) {
    const phoneCandidate = candidate.slice(0, ownedWrapper.closeIndex);
    const afterWrapper = stripUnownedLeadingPhoneClosers(
      candidate.slice(ownedWrapper.closeEnd),
      ownedWrapper.availableOuterOpeners
    );
    const phoneRanges = phoneRedactionRanges(
      phoneCandidate,
      prefix,
      `${ownedWrapper.closers}${afterWrapper}${suffix}`,
      allowInitialGroup,
      prefixContext.indeterminate,
      effectiveInheritedPhoneLabelContext
    );
    const redactedPhone = renderPhoneRedactionRanges(
      phoneCandidate,
      phoneRanges
    );
    if (redactedPhone !== phoneCandidate) {
      const redactedAfter = redactPhoneSubspans(
        afterWrapper,
        `${prefix}${redactedPhone}${ownedWrapper.closers}`,
        suffix,
        true,
        false
      );
      return {
        output: `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`,
        // The first-phone geometry is complete only when the wrapper suffix
        // rendered byte-for-byte. If that suffix redacted another phone, keep
        // the existing fail-closed null rather than publish partial custody.
        ranges: redactedAfter === afterWrapper ? phoneRanges : null,
        explicitPhoneLabelContext: directExplicitPhoneLabelContext
          || provedWrappedPhoneLabelContext(
            prefix,
            phoneCandidate,
            phoneRanges
          )
      };
    }
  }

  if (!/[+＋]/u.test(input[contactOffset] ?? '')) {
    const outerCloserRedaction = redactPhoneCandidateAcrossOwnedOuterClosers(
      candidate,
      prefix,
      suffix,
      allowInitialGroup,
      currentNarrativeParenthesisDepth(
        input,
        contactOffset,
        parenthesisDepthIndex
      ),
      prefixContext.indeterminate,
      effectiveInheritedPhoneLabelContext,
      true
    );
    if (outerCloserRedaction !== null) {
      return {
        output: outerCloserRedaction.output,
        ranges: outerCloserRedaction.ranges,
        explicitPhoneLabelContext: directExplicitPhoneLabelContext
          || provedWrappedPhoneLabelContext(
            prefix,
            candidate,
            outerCloserRedaction.ranges
          )
      };
    }
  }

  const ranges = phoneRedactionRanges(
    candidate,
    prefix,
    suffix,
    allowInitialGroup,
    prefixContext.indeterminate,
    effectiveInheritedPhoneLabelContext
  );
  return {
    output: renderPhoneRedactionRanges(candidate, ranges),
    ranges,
    explicitPhoneLabelContext: directExplicitPhoneLabelContext
      || provedWrappedPhoneLabelContext(prefix, candidate, ranges)
  };
}

export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
      (email, offset, input) => emailMatchHasDirectUrlCustody(
        input,
        offset,
        email.length
      ) ? email : '[contact omitted]'
    );
  let phoneObservationLease = null;
  const parenthesisDepthIndex = createParenthesisDepthIndex(emailRedacted);

  const phoneRedacted = emailRedacted.replace(
    PHONE_SPAN_PATTERN,
    (candidate, offset, input) => {
      const priorLease = phoneObservationLease;
      phoneObservationLease = null;

      const bridge = crossCallbackPhoneObservationBridge(
        priorLease,
        candidate,
        offset,
        input
      );
      const currentObservationEnd = bridge?.currentObservationEnd ?? 0;
      const preservedObservation = candidate.slice(0, currentObservationEnd);
      const localCandidate = candidate.slice(currentObservationEnd);
      const localOffset = offset + currentObservationEnd;
      const result = redactPhoneSpanCandidate(
        localCandidate,
        localOffset,
        input,
        bridge?.explicitPhoneLabelContext ?? false,
        bridge?.validatedPhoneInterval ?? null,
        parenthesisDepthIndex
      );
      const mappedRanges = result.ranges?.map(range => ({
        start: range.start + currentObservationEnd,
        end: range.end + currentObservationEnd
      })) ?? null;

      if (mappedRanges && !bridge) {
        phoneObservationLease = createCrossCallbackPhoneObservationLease(
          candidate,
          offset,
          mappedRanges,
          result.explicitPhoneLabelContext
        );
      }

      return `${preservedObservation}${result.output}`;
    }
  );

  return phoneRedacted.replace(
    PHONE_EXTENSION_PATTERN,
    (candidate, marker, offset, input) =>
      redactPhoneExtensionCandidate(candidate, marker, offset, input)
  );
}

export async function readBoundedUtf8Body(response, maxBytes) {
  const limit = Number(maxBytes);
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error('body byte limit must be a non-negative safe integer');
  if (!response?.body || typeof response.body.getReader !== 'function') throw new Error('response body is unavailable');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const pieces = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      receivedBytes += chunk.byteLength;
      if (receivedBytes > limit) {
        try { await reader.cancel(`body exceeds ${limit} bytes`); } catch {}
        throw new Error(`body exceeds ${limit} bytes`);
      }
      pieces.push(decoder.decode(chunk, { stream: true }));
    }
    pieces.push(decoder.decode());
    return pieces.join('');
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

function cleanXmlScalar(value, max = 4000) {
  const withoutCdata = String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/giu, '$1');
  const decoded = decodeXmlEntities(withoutCdata)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<(?:br|hr)\b[^>]*\/?>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ');
  return decoded.replace(/\s+/gu, ' ').trim().slice(0, max);
}

export function cleanText(value, max = 1600) {
  return redactContactData(cleanXmlScalar(value, Math.max(max * 2, max)))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, max);
}

export function canonicalizeUrl(value, baseUrl) {
  const raw = cleanXmlScalar(value, 4000);
  if (!raw) return null;
  try {
    const url = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.protocol === 'http:') url.protocol = 'https:';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const sorted = [...url.searchParams.entries()].sort(([aKey, aVal], [bKey, bVal]) =>
      aKey.localeCompare(bKey) || aVal.localeCompare(bVal));
    url.search = '';
    for (const [key, val] of sorted) url.searchParams.append(key, val);
    return url.href;
  } catch {
    return null;
  }
}

function extractElementRaw(block, localName) {
  const name = escapeRegExp(localName);
  const pattern = new RegExp(`<(?:(?:[\\w.-]+):)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${name}\\s*>`, 'iu');
  return block.match(pattern)?.[1] ?? null;
}

function extractOpenTag(block, localName) {
  const name = escapeRegExp(localName);
  return block.match(new RegExp(`<(?:(?:[\\w.-]+):)?${name}\\b([^>]*)>`, 'iu'))?.[1] ?? null;
}

function extractAttribute(attributes, name) {
  if (!attributes) return null;
  const escaped = escapeRegExp(name);
  const quoted = attributes.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'iu'));
  if (quoted) return decodeXmlEntities(quoted[2]).trim();
  const bare = attributes.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*([^\\s>]+)`, 'iu'));
  return bare ? decodeXmlEntities(bare[1]).trim() : null;
}

function extractAtomLink(block) {
  const tags = [...block.matchAll(/<(?:(?:[\w.-]+):)?link\b([^>]*)\/?\s*>/giu)];
  const candidates = tags.map(match => ({
    href: extractAttribute(match[1], 'href'),
    rel: extractAttribute(match[1], 'rel')
  })).filter(item => item.href);
  return candidates.find(item => !item.rel || item.rel.toLowerCase() === 'alternate')?.href
    ?? candidates[0]?.href
    ?? null;
}

function normalizeDate(value) {
  const raw = cleanXmlScalar(value, 200);
  if (!raw) return { iso: null, raw: null };
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp)
    ? { iso: new Date(timestamp).toISOString(), raw }
    : { iso: null, raw };
}

function splitFeedItems(xml) {
  const rssItems = [...xml.matchAll(/<(?:(?:[\w.-]+):)?item\b[^>]*>[\s\S]*?<\/(?:(?:[\w.-]+):)?item\s*>/giu)].map(match => ({
    kind: 'rss', raw: match[0]
  }));
  if (rssItems.length) return rssItems;
  return [...xml.matchAll(/<(?:(?:[\w.-]+):)?entry\b[^>]*>[\s\S]*?<\/(?:(?:[\w.-]+):)?entry\s*>/giu)].map(match => ({
    kind: 'atom', raw: match[0]
  }));
}

function normalizeItem(itemBlock, source) {
  const { raw, kind } = itemBlock;
  const title = cleanText(extractElementRaw(raw, 'title'), 500);
  const summary = cleanText(
    extractElementRaw(raw, 'encoded')
      ?? extractElementRaw(raw, 'description')
      ?? extractElementRaw(raw, 'summary')
      ?? extractElementRaw(raw, 'content'),
    1800
  );
  const rssLink = extractElementRaw(raw, 'link');
  const atomLink = kind === 'atom' ? extractAtomLink(raw) : null;
  const itemAttributes = extractOpenTag(raw, kind === 'atom' ? 'entry' : 'item');
  const rdfAbout = extractAttribute(itemAttributes, 'rdf:about') ?? extractAttribute(itemAttributes, 'about');
  const link = canonicalizeUrl(atomLink ?? rssLink ?? rdfAbout, source.feed_url);

  const guid = cleanXmlScalar(extractElementRaw(raw, 'guid') ?? extractElementRaw(raw, 'id'), 1000) || null;
  const published = normalizeDate(
    extractElementRaw(raw, 'pubDate')
      ?? extractElementRaw(raw, 'published')
      ?? extractElementRaw(raw, 'date')
  );
  const updated = normalizeDate(
    extractElementRaw(raw, 'updated')
      ?? extractElementRaw(raw, 'modified')
  );

  if (!title && !link && !guid) throw new Error(`feed item from ${source.id} lacks title, link, and identifier`);

  const identity = link ?? guid ?? sha256(`${title}|${published.raw ?? ''}`);
  const sourceRecordKey = sha256(`${source.id}|${identity}`);
  const normalizedForHash = {
    title,
    summary,
    canonical_url: link,
    guid,
    published_at: published.iso,
    published_raw: published.raw,
    updated_at: updated.iso,
    updated_raw: updated.raw
  };

  return {
    source_record_key: sourceRecordKey,
    source_record_id: guid ?? link ?? sourceRecordKey,
    canonical_url: link,
    title,
    summary,
    published_at: published.iso,
    published_raw: published.raw,
    updated_at: updated.iso,
    updated_raw: updated.raw,
    content_sha256: sha256(normalizedForHash),
    raw_item_sha256: sha256(raw),
    raw_xml: raw
  };
}

export function parseFeed(xml, source) {
  if (typeof xml !== 'string' || !xml.trim()) throw new Error(`empty feed body for ${source.id}`);
  if (Buffer.byteLength(xml, 'utf8') > Number(source.max_bytes ?? 5_000_000)) {
    throw new Error(`feed body for ${source.id} exceeds configured maximum`);
  }
  if (!/<(?:rss|feed|rdf:RDF)\b/iu.test(xml)) throw new Error(`unrecognized XML feed root for ${source.id}`);

  const blocks = splitFeedItems(xml);
  if (!blocks.length) throw new Error(`feed ${source.id} contains no RSS items or Atom entries`);

  const items = blocks.map(block => normalizeItem(block, source));
  const duplicates = new Set();
  for (const item of items) {
    if (duplicates.has(item.source_record_key)) {
      throw new Error(`feed ${source.id} repeats source record ${item.source_record_id}`);
    }
    duplicates.add(item.source_record_key);
  }

  items.sort((a, b) =>
    String(a.published_at ?? '').localeCompare(String(b.published_at ?? ''))
      || a.source_record_key.localeCompare(b.source_record_key));

  return {
    feed_title: cleanText(extractElementRaw(xml, 'title'), 500),
    feed_updated_at: normalizeDate(extractElementRaw(xml, 'lastBuildDate') ?? extractElementRaw(xml, 'updated')).iso,
    feed_sha256: sha256(xml),
    item_count: items.length,
    items
  };
}

export function validateRegistry(registry) {
  if (!registry || registry.schema_version !== EXHAUST_SCHEMA_VERSION || !Array.isArray(registry.sources)) {
    throw new Error('industrial-exhaust source registry must have schema_version 1 and sources[]');
  }
  const ids = new Set();
  const urls = new Set();
  for (const source of registry.sources) {
    if (!/^[a-z0-9][a-z0-9_-]{2,80}$/u.test(source.id ?? '')) throw new Error(`invalid source id: ${source.id}`);
    if (ids.has(source.id)) throw new Error(`duplicate source id: ${source.id}`);
    ids.add(source.id);
    let url;
    try { url = new URL(source.feed_url); } catch { throw new Error(`invalid feed URL for ${source.id}`); }
    if (url.protocol !== 'https:') throw new Error(`feed URL for ${source.id} must use https`);
    if (urls.has(url.href)) throw new Error(`duplicate feed URL: ${url.href}`);
    urls.add(url.href);
    if (source.source_class !== SOURCE_CLASS) throw new Error(`source ${source.id} must remain ${SOURCE_CLASS}`);
    if (source.graph_effect !== GRAPH_EFFECT) throw new Error(`source ${source.id} must have graph_effect none`);
    if (!source.publisher || !source.surface) throw new Error(`source ${source.id} lacks publisher or surface`);
    if (source.enabled !== true && source.enabled !== false) throw new Error(`source ${source.id} must declare enabled boolean`);
  }
  return registry;
}

export function validateWatchTerms(config) {
  if (!config || config.schema_version !== EXHAUST_SCHEMA_VERSION || !Array.isArray(config.terms)) {
    throw new Error('industrial-exhaust watch registry must have schema_version 1 and terms[]');
  }
  const ids = new Set();
  for (const term of config.terms) {
    if (!/^[a-z0-9][a-z0-9_-]{1,80}$/u.test(term.id ?? '')) throw new Error(`invalid watch-term id: ${term.id}`);
    if (ids.has(term.id)) throw new Error(`duplicate watch-term id: ${term.id}`);
    ids.add(term.id);
    if (!Array.isArray(term.patterns) || !term.patterns.length || term.patterns.some(pattern => !String(pattern).trim())) {
      throw new Error(`watch term ${term.id} must have non-empty literal patterns`);
    }
  }
  return config;
}

export function matchWatchTerms(record, config) {
  const haystack = `${record.title ?? ''}\n${record.summary ?? ''}`.normalize('NFKC').toLocaleLowerCase('en');
  return config.terms.filter(term => term.patterns.some(pattern =>
    haystack.includes(String(pattern).normalize('NFKC').toLocaleLowerCase('en'))
  )).map(term => term.id).sort();
}

export function classifyEventHints(record) {
  const text = `${record.title ?? ''}\n${record.summary ?? ''}`;
  const hints = EVENT_RULES.filter(([, pattern]) => pattern.test(text)).map(([hint]) => hint);
  return hints.length ? hints : ['unknown'];
}

function latestObservationIndex(observations) {
  const index = new Map();
  for (const observation of observations) {
    const current = index.get(observation.source_record_key);
    if (!current || Number(observation.revision_number ?? 0) > Number(current.revision_number ?? 0)) {
      index.set(observation.source_record_key, observation);
    }
  }
  return index;
}

export function mergeFeedItems({ observations, source, parsedFeed, capturedAt, feedReceiptPath }) {
  const merged = [...observations];
  const latest = latestObservationIndex(merged.filter(item => item.source_id === source.id));
  const added = [];

  for (const item of parsedFeed.items) {
    const previous = latest.get(item.source_record_key) ?? null;
    if (previous?.content_sha256 === item.content_sha256) continue;
    const revisionNumber = previous ? Number(previous.revision_number ?? 1) + 1 : 1;
    const observation = {
      schema_version: EXHAUST_SCHEMA_VERSION,
      observation_id: contentId('xobs', source.id, item.source_record_key, item.content_sha256),
      source_id: source.id,
      source_class: SOURCE_CLASS,
      publisher: source.publisher,
      surface: source.surface,
      source_feed_url: source.feed_url,
      source_record_key: item.source_record_key,
      source_record_id: item.source_record_id,
      canonical_url: item.canonical_url,
      title: item.title,
      summary: item.summary,
      published_at: item.published_at,
      published_raw: item.published_raw,
      updated_at: item.updated_at,
      updated_raw: item.updated_raw,
      captured_at: capturedAt,
      feed_receipt_path: feedReceiptPath,
      feed_sha256: parsedFeed.feed_sha256,
      raw_item_sha256: item.raw_item_sha256,
      content_sha256: item.content_sha256,
      revision_of: previous?.observation_id ?? null,
      revision_number: revisionNumber,
      evidence_class: 'first_party_attributed_statement',
      evidentiary_scope: 'publisher_publication_only',
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false
    };
    merged.push(observation);
    latest.set(item.source_record_key, observation);
    added.push(observation);
  }

  merged.sort((a, b) => a.observation_id.localeCompare(b.observation_id));
  return { observations: merged, added };
}

export function buildAlerts(observations, watchConfig) {
  const latest = latestObservationIndex(observations);
  const alerts = [];
  for (const observation of latest.values()) {
    const matched = matchWatchTerms(observation, watchConfig);
    if (!matched.length) continue;
    alerts.push({
      schema_version: EXHAUST_SCHEMA_VERSION,
      alert_id: contentId('xalert', observation.observation_id, matched.join(',')),
      observation_id: observation.observation_id,
      source_id: observation.source_id,
      publisher: observation.publisher,
      title: observation.title,
      canonical_url: observation.canonical_url,
      published_at: observation.published_at,
      revision_number: observation.revision_number,
      matched_terms: matched,
      event_hints: classifyEventHints(observation),
      evidence_class: 'first_party_attributed_statement',
      review_status: 'queued',
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false,
      forbidden_inferences: [
        'publisher statement independently proves the statement',
        'shared product category proves a commercial relationship',
        'feed omission proves withdrawal or discontinuation',
        'profile attention establishes motive or corporate direction'
      ]
    });
  }
  return alerts.sort((a, b) => a.alert_id.localeCompare(b.alert_id));
}

export function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/u).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`${filePath}:${index + 1}: ${error.message}`); }
  });
}

export function writeAtomic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, filePath);
}

export function writeJson(filePath, value) {
  writeAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeJsonl(filePath, records) {
  writeAtomic(filePath, records.length ? `${records.map(record => JSON.stringify(record)).join('\n')}\n` : '');
}

export function feedReceiptPath(rootDir, sourceId, feedHash) {
  return path.join(rootDir, 'receipts', 'exhaust', sourceId, `${feedHash}.json`);
}

export function writeFeedReceipt({ rootDir, source, parsedFeed, xml, capturedAt, responseHeaders = {} }) {
  const receiptPath = feedReceiptPath(rootDir, source.id, parsedFeed.feed_sha256);
  if (!fs.existsSync(receiptPath)) {
    writeJson(receiptPath, {
      schema_version: EXHAUST_SCHEMA_VERSION,
      receipt_type: 'first_party_feed_snapshot',
      source_id: source.id,
      source_class: SOURCE_CLASS,
      publisher: source.publisher,
      feed_url: source.feed_url,
      captured_at: capturedAt,
      feed_sha256: parsedFeed.feed_sha256,
      feed_title: parsedFeed.feed_title,
      item_count: parsedFeed.item_count,
      response_headers: {
        content_type: responseHeaders.content_type ?? null,
        etag: responseHeaders.etag ?? null,
        last_modified: responseHeaders.last_modified ?? null
      },
      body_encoding: 'utf-8',
      body: xml,
      graph_effect: GRAPH_EFFECT,
      promotion_authority: false,
      canonical_mutation_authorized: false
    });
  }
  return path.relative(rootDir, receiptPath).split(path.sep).join('/');
}

export function emptyState() {
  return {
    schema_version: EXHAUST_SCHEMA_VERSION,
    lane: 'first_party_industrial_exhaust',
    last_run_at: null,
    sources: {},
    graph_effect: GRAPH_EFFECT,
    promotion_authority: false,
    canonical_mutation_authorized: false
  };
}
