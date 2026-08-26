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
const PHONE_EXTENSION_SUFFIX_PATTERN = /^\s*[,;:()（）.．。\-–—]*(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?|内線(?:番号)?\s*[:：#＃]?|[#＃])\s*(?:[（(]\s*)?[0-9０-９]/iu;
const FORMATTED_NUMERIC_OBSERVATION_PATTERN = /^(?:\d{1,9}\.\d{1,6}|\d{1,3}(?:,\d{3})+(?:\.\d{1,6})?|\d{1,3},\d{1,2}|\d{1,9}\s*[-–—]\s*\d{1,9}|\d{1,2}:\d{2}(?::\d{2})?)(?=$|[^0-9])/u;
const NUMERIC_OBSERVATION_PATTERN = /^\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?(?:\s*[-–—]\s*\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?)?\s*(?:(?:people|persons?|users?|customers?|employees?|impressions?|views?|visits?|clicks?|downloads?|yen|dollars?|pounds?|euros?|percent(?:age)?|million|billion|thousand|points?|basis points?|countries|markets|offices|stores|years?|months?|days?|hours?)(?=$|[^\p{L}\p{N}])|(?:人|名|件|回|円|社|国|地域|市場|拠点|店舗|%|％))/iu;
const PHONE_LABEL_PATTERN = /(?:(?:^|\b)(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)\s*(?:number\s*)?(?:is\s*)?[:.]?\s*|(?:電話(?:番号)?|携帯(?:電話)?|ファックス|連絡先|お問い合わせ先)\s*[:.]?\s*)$/iu;
const EXPLICIT_IDENTIFIER_LABEL_PATTERN = /(?:(?:^|\b)(?:id|guid|identifier|reference|revision|release(?:\s+id)?|record(?:\s+id)?|receipt|sha(?:-?256)?|hash|ticket|case|invoice|order|code)|(?:識別子|参照(?:番号)?|管理番号|受付番号|注文番号|案件番号|コード))\s*[:：=#＃-]?\s*(?:(?:\(|\[|\{|（|［|【)\s*)*$/iu;
const DATE_LIKE_PATTERN = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/u;
const DATE_OBSERVATION_PATTERN = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?=$|[^0-9])/u;
const DIGIT_RUN_PATTERN = /[0-9０-９]+/gu;
const MAX_PHONE_DIGIT_GROUPS = 17;

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
const MAX_IDENTIFIER_LABEL_CHAIN_LABELS = 4096;
const LABEL_SEPARATOR_CHARACTER_PATTERN = /[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const SUBSTANTIVE_LABEL_SEPARATOR_CHARACTER_PATTERN = /[,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\(\[\{（［【]/u;
const CLOSING_OBSERVATION_WRAPPER_PATTERN = /[)）]/u;

function hasUrlTokenPrefixContext(normalizedPrefix) {
  return /(?:(?:https?:)?\/\/|www\.|(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,}|xn--[\p{L}\p{N}-]{2,})(?=\.?[:/?#])|(?:\d{1,3}\.){3}\d{1,3}(?=\.?[:/?#]))[^\s]*$/iu.test(
    normalizedPrefix
  );
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
  if (identifierChain.overflow) return true;

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

function phoneCandidateScore(candidate, prefix, indeterminatePhoneContext = false) {
  const normalized = candidate.trim().normalize('NFKC');
  const normalizedPrefix = prefix.normalize('NFKC');
  const digits = normalized.replace(/\D/gu, '');
  if (DATE_LIKE_PATTERN.test(normalized)) return 0;

  const pluses = normalized.match(/\+/gu) ?? [];
  if (pluses.length > 1 || (pluses.length === 1 && !normalized.startsWith('+'))) return 0;

  const groups = normalizedDigitGroups(normalized);
  if (!groups.length || groups.length > MAX_PHONE_DIGIT_GROUPS) return 0;

  const accessPrefixCandidates = internationalAccessPrefixCandidates(normalized);
  const accessPrefixDigits = internationalAccessPrefixLength(normalized);
  if (normalized.startsWith('+') && !/^[1-9]/u.test(digits)) return 0;
  if (!normalized.startsWith('+') && accessPrefixCandidates.length && !accessPrefixDigits) return 0;

  const labelled = indeterminatePhoneContext
    || hasPhoneLabelPrefixNormalized(normalizedPrefix);
  const numericUrlContext = hasUrlTokenPrefixContext(normalizedPrefix);
  if (numericUrlContext) return 0;
  const international = isInternationalPhoneCandidate(normalized);
  const parenthesized = /\(\s*\d{1,5}\s*\)/u.test(normalized);
  const explicitIdentifierContext = hasExplicitIdentifierPrefixNormalized(normalizedPrefix);
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

function numericObservationMatch(source, externalSuffix = '') {
  const normalizedSource = source.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  if (/^\d{1,9}\.\d{1,6}\./u.test(contextual)
      && !/^\d{4}\./u.test(contextual)) {
    return FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  }
  const dateMatch = DATE_OBSERVATION_PATTERN.exec(contextual);
  if (dateMatch) return dateMatch;
  const formattedMatch = FORMATTED_NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  if (formattedMatch
      && !/^[./-]\d/u.test(contextual.slice(formattedMatch[0].length))) {
    return formattedMatch;
  }
  return NUMERIC_OBSERVATION_PATTERN.exec(contextual);
}

function trailingObservationGroup(
  candidate,
  groups,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext = false
) {
      const normalizedSuffix = externalSuffix.normalize('NFKC').slice(0, 64);
      if (PHONE_EXTENSION_SUFFIX_PATTERN.test(normalizedSuffix)) return groups.length;
      const minimumPriorDigits = 7;
      const extensionContext = /(?:\b(?:ext(?:ension)?|x)\s*[.:#]?\s*|内線(?:番号)?\s*[:#]?\s*|[#])$/iu.test(
        externalPrefix.normalize('NFKC').slice(-48)
      );

      for (let index = 1; index < groups.length && index <= MAX_PHONE_DIGIT_GROUPS; index += 1) {
        const start = groups[index].index;
        const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
        const separator = candidate.slice(previousEnd, start);
        const normalizedSeparator = separator.normalize('NFKC');
        if (!/\s/u.test(separator) && !/[.!?。！？]/u.test(normalizedSeparator)) continue;

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
        const observationMatch = numericObservationMatch(
          candidate.slice(start).trimStart(),
          normalizedSuffix
        );
        if (observationMatch) {
          const observationSource = candidate.slice(start).trimStart();
          return {
            group: index,
            end: start + sourceEndForNormalizedPrefix(observationSource, observationMatch[0].length)
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
  const preceding = input.slice(0, offset);
  const boundedStart = Math.max(0, preceding.length - 64);
  const boundedTokenStart = nonWhitespaceTokenStart(preceding, boundedStart);
  const currentToken = previousNonWhitespaceTokenBounds(preceding);
  const tokenStart = currentToken?.start ?? preceding.length;
  let contextStart = Math.min(boundedTokenStart, tokenStart);
  let scanStart = tokenStart;
  let normalizedToken = currentToken
    ? preceding.slice(currentToken.start, currentToken.end).normalize('NFKC')
    : '';

  while (/^(?:\(|\[|\{|（|［|【)+$/u.test(normalizedToken) && scanStart > 0) {
    const priorToken = previousNonWhitespaceTokenBounds(preceding, scanStart);
    if (!priorToken) break;
    scanStart = priorToken.start;
    contextStart = Math.min(contextStart, priorToken.start);
    normalizedToken = preceding
      .slice(priorToken.start, priorToken.end)
      .normalize('NFKC');
  }

  let context = preceding.slice(contextStart);
  let indeterminate = false;
  if (contextStart > 0 && identifierContextNeedsExpansion(
    context.normalize('NFKC')
  )) {
    const boundedExpandedStart = Math.max(
      0,
      preceding.length - MAX_PHONE_LABEL_CONTEXT_CHARS
    );
    const expandedStart = nonWhitespaceTokenStart(
      preceding,
      boundedExpandedStart
    );
    contextStart = Math.min(contextStart, expandedStart);
    context = preceding.slice(contextStart);

    if (contextStart > 0 && identifierContextNeedsExpansion(
      context.normalize('NFKC')
    )) indeterminate = true;
  }

  return { text: context, indeterminate };
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

function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext
) {
  let observationEnd = observation.end;
  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const normalizedSeparator = separator.normalize('NFKC');
    if (!/[\s/／.．]/u.test(separator)
        && !OPENING_IDENTIFIER_WRAPPER_PATTERN.test(normalizedSeparator)
        && !CLOSING_OBSERVATION_WRAPPER_PATTERN.test(normalizedSeparator)) {
      continue;
    }

    const remainingCandidate = candidate.slice(groups[first].index);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
      observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      continue;
    }

    const interval = validatedIndependentPhoneInterval(
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
    if (interval) return interval;
  }
  return null;
}

function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false
) {
  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
  const phoneLabelContext = indeterminatePhoneContext
    || hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);
  if (hasExplicitIdentifierPrefixNormalized(normalizedExternalPrefix) && !phoneLabelContext) {
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
          indeterminatePhoneContext
        );
        if (laterPhone) {
          const remainder = laterPhone.end < candidate.length
            ? phoneRedactionRanges(
                candidate.slice(laterPhone.end),
                `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
                externalSuffix,
                true,
                indeterminatePhoneContext
              ).map(range => ({
                start: range.start + laterPhone.end,
                end: range.end + laterPhone.end
              }))
            : [];
          return [laterPhone, ...remainder];
        }
      }
    }
    const protectedEnd = identifierProtectedPrefixEnd(candidate, groups, externalSuffix);
    return phoneRedactionRanges(
      candidate.slice(protectedEnd),
      `${externalPrefix}${candidate.slice(0, protectedEnd)}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    ).map(range => ({
      start: range.start + protectedEnd,
      end: range.end + protectedEnd
    }));
  }

  let observation = trailingObservationGroup(
    candidate,
    groups,
    externalPrefix,
    externalSuffix,
    indeterminatePhoneContext
  );
  const leadingObservationMatch = numericObservationMatch(candidate, externalSuffix);
  if (leadingObservationMatch) {
    observation = {
      group: 0,
      end: sourceEndForNormalizedPrefix(candidate, leadingObservationMatch[0].length)
    };
  }
  const observationGroup = observation.group;
  const normalizedCandidate = candidate.trim().normalize('NFKC');
  const wholeSpanIsAffirmative = isInternationalPhoneCandidate(normalizedCandidate)
    || phoneLabelContext;
  if (!allowInitialGroup && isInternationalPhoneCandidate(normalizedCandidate)) {
    return redactAttachedInternationalSuffixRanges(
      candidate,
      groups,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext
    );
  }
  if (observationGroup === 0 && observation.end < candidate.length) {
    const laterPhone = independentPhoneStartAfterObservation(
      candidate,
      groups,
      observation,
      externalPrefix,
      externalSuffix,
      indeterminatePhoneContext
    );
    if (laterPhone) {
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, laterPhone.start)}[contact omitted]`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [laterPhone, ...remainderRanges];
    }
  }
  if (wholeSpanIsAffirmative && allowInitialGroup && observationGroup > 0) {
    const { start, end } = phoneWindowBounds(candidate, groups, 0, observationGroup - 1);
    const completePhoneSpan = candidate.slice(start, end);
    if (phoneCandidateScore(
      completePhoneSpan,
      `${externalPrefix}${candidate.slice(0, start)}`,
      indeterminatePhoneContext
    )) {
      const laterPhone = observationGroup < groups.length
        ? independentPhoneStartAfterObservation(
            candidate,
            groups,
            observation,
            externalPrefix,
            externalSuffix,
            indeterminatePhoneContext
          )
        : null;
      if (!laterPhone) return [{ start, end }];
      const preservedObservation = candidate.slice(end, laterPhone.start);
      const remainderRanges = laterPhone.end < candidate.length
        ? phoneRedactionRanges(
            candidate.slice(laterPhone.end),
            `${externalPrefix}${candidate.slice(0, start)}[contact omitted]${preservedObservation}`,
            externalSuffix,
            true,
            indeterminatePhoneContext
          ).map(range => ({
            start: range.start + laterPhone.end,
            end: range.end + laterPhone.end
          }))
        : [];
      return [{ start, end }, laterPhone, ...remainderRanges];
    }
  }

  const intervals = Array.from({ length: groups.length }, () => []);
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
      let score = phoneCandidateScore(
        slice,
        `${externalPrefix}${candidate.slice(0, start)}`,
        indeterminatePhoneContext
      );
      if (!score) continue;

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
  indeterminatePhoneContext = false
) {
  return renderPhoneRedactionRanges(
    candidate,
    phoneRedactionRanges(
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext
    )
  );
}




function unmatchedOpeningParenthesisDepth(value) {
  let depth = 0;
  for (const character of value) {
    const normalized = character.normalize('NFKC');
    if (normalized === '(') depth += 1;
    else if (normalized === ')' && depth > 0) depth -= 1;
  }
  return depth;
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

function currentNarrativeParenthesisContext(value) {
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
  return value.slice(contextStart);
}

function redactPhoneCandidateAcrossOwnedOuterClosers(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup,
  narrativeContext,
  indeterminatePhoneContext = false
) {
  const availableOuterOpeners = unmatchedOpeningParenthesisDepth(narrativeContext);
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
  const ranges = phoneRedactionRanges(
    sanitizedCandidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext
  );
  if (!ranges.length) return null;

  const mappedRanges = ranges.map(range => ({
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
  return output === candidate ? null : output;
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

function findOwnedNarrativePhoneWrapper(candidate, input, offset, contactOffset) {
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
  const availableOuterOpeners = unmatchedOpeningParenthesisDepth(
    currentNarrativeParenthesisContext(input.slice(0, firstOpenerIndex))
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

export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[contact omitted]');
  const phoneRedacted = emailRedacted.replace(PHONE_SPAN_PATTERN, (candidate, offset, input) => {
    const firstContactCharacter = candidate.search(/[+＋(（0-9０-９]/u);
    const contactOffset = offset + Math.max(0, firstContactCharacter);
    const prefixContext = redactionPrefixContext(input, contactOffset);
    const prefix = prefixContext.text;
    const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
    const adjacentCharacter = Array.from(input.slice(0, contactOffset)).at(-1) ?? '';
    const allowInitialGroup = prefixContext.indeterminate
      || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
      || hasPhoneLabelPrefix(prefix);
    const ownedWrapper = findOwnedNarrativePhoneWrapper(
      candidate,
      input,
      offset,
      contactOffset
    );

if (ownedWrapper) {
  const phoneCandidate = candidate.slice(0, ownedWrapper.closeIndex);
  const afterWrapper = stripUnownedLeadingPhoneClosers(
    candidate.slice(ownedWrapper.closeEnd),
    ownedWrapper.availableOuterOpeners
  );
  const redactedPhone = redactPhoneSubspans(
    phoneCandidate,
    prefix,
    `${ownedWrapper.closers}${afterWrapper}${suffix}`,
    allowInitialGroup,
    prefixContext.indeterminate
  );
  if (redactedPhone !== phoneCandidate) {
    const redactedAfter = redactPhoneSubspans(
      afterWrapper,
      `${prefix}${redactedPhone}${ownedWrapper.closers}`,
      suffix,
      true,
      prefixContext.indeterminate
    );
    return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;
  }
}
    if (!/[+＋]/u.test(input[contactOffset] ?? '')) {
      const outerCloserRedaction = redactPhoneCandidateAcrossOwnedOuterClosers(
        candidate,
        prefix,
        suffix,
        allowInitialGroup,
        currentNarrativeParenthesisContext(input.slice(0, contactOffset)),
        prefixContext.indeterminate
      );
      if (outerCloserRedaction !== null) return outerCloserRedaction;
    }
    return redactPhoneSubspans(
      candidate,
      prefix,
      suffix,
      allowInitialGroup,
      prefixContext.indeterminate
    );
  });
  return phoneRedacted.replace(PHONE_EXTENSION_PATTERN, (candidate, marker, offset, input) =>
    redactPhoneExtensionCandidate(candidate, marker, offset, input));
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
