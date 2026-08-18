import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const EXHAUST_SCHEMA_VERSION = 1;
export const SOURCE_CLASS = 'first_party_corporate_publication';
export const GRAPH_EFFECT = 'none';

const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'mc_cid', 'mc_eid', 'msclkid', '_hsenc', '_hsmi'
]);

const PHONE_SPAN_PATTERN = /(?:[+＋](?=\s*[0-9０-９])|[（(](?=\s*[0-9０-９]))?\s*[0-9０-９][0-9０-９()./／\s\-‐‑‒–—−－．（）]{5,}[0-9０-９](?:\s*[)）])?(?=$|[^\p{L}\p{N}]|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|(?:(?:ext(?:ension)?\.?|x)\s*[.:#：＃]?\s*[0-9０-９]))/giu;
const PHONE_EXTENSION_PATTERN = /(\[contact omitted\][\s,;:()（）\-–—]*(?:(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?\s*)|(?:内線(?:番号)?\s*[:：#＃]?\s*)|(?:[#＃]\s*))(?:[（(]\s*)?)[0-9０-９]+(?:[()./／\s\-‐‑‒–—−－．（）]+[0-9０-９]+)*/giu;
const PHONE_EXTENSION_SUFFIX_PATTERN = /^\s*[,;:()（）\-–—]*(?:(?:ext(?:ension)?|x)\s*[.:#：＃]?|内線(?:番号)?\s*[:：#＃]?|[#＃])\s*(?:[（(]\s*)?[0-9０-９]/iu;
const FORMATTED_NUMERIC_OBSERVATION_PATTERN = /^(?:\d{1,9}\.\d{1,6}|\d{1,3}(?:,\d{3})+(?:\.\d{1,6})?|\d{1,3},\d{1,2}|\d{1,9}\s*[-–—]\s*\d{1,9}|\d{1,2}:\d{2}(?::\d{2})?)(?=$|[^0-9])/u;
const NUMERIC_OBSERVATION_PATTERN = /^\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?(?:\s*[-–—]\s*\d{1,9}(?:,\d{3})*(?:\.\d{1,6})?)?\s*(?:(?:people|persons?|users?|customers?|employees?|impressions?|views?|visits?|clicks?|downloads?|yen|dollars?|pounds?|euros?|percent(?:age)?|million|billion|thousand|points?|basis points?|countries|markets|offices|stores|years?|months?|days?|hours?)(?=$|[^\p{L}\p{N}])|(?:人|名|件|回|円|社|国|地域|市場|拠点|店舗|%|％))/iu;
const YEAR_LIKE_PATTERN = /^(?:19|20)\d{2}$/u;
const PHONE_LABEL_PATTERN = /(?:(?:^|\b)(?:tel(?:ephone)?|phone|mobile|cell|fax|contact)\s*(?:number\s*)?(?:is\s*)?[:.]?\s*|(?:電話(?:番号)?|携帯(?:電話)?|ファックス|連絡先|お問い合わせ先)\s*[:.]?\s*)$/iu;
const DATE_LIKE_PATTERN = /^(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/u;
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

function isSentenceSeparatedYear(value, separator) {
  return YEAR_LIKE_PATTERN.test(normalizedWrappedNumericTail(value))
    && /[.!?。！？]\s*(?:\(\s*)?$/u.test(separator.normalize('NFKC'));
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

function hasPhoneLabelPrefix(prefix) {
  return PHONE_LABEL_PATTERN.test(prefix.normalize('NFKC').slice(-48));
}

function phoneCandidateScore(candidate, prefix) {
  const normalized = candidate.trim().normalize('NFKC');
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

  const labelled = hasPhoneLabelPrefix(prefix);
  const international = isInternationalPhoneCandidate(normalized);
  const parenthesized = /\(\s*\d{1,5}\s*\)/u.test(normalized);
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
  if (domesticGrouped || northAmericanGrouped) base = Math.max(base, 550);
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

function trailingObservationGroup(candidate, groups, externalPrefix, externalSuffix) {
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
        if (!/\s/u.test(separator)) continue;

        const phonePrefix = candidate.slice(0, start).trimEnd();
        const priorDigits = phonePrefix.normalize('NFKC').replace(/\D/gu, '').length;
        const prefixScore = phoneCandidateScore(phonePrefix, externalPrefix);
        if (extensionContext) {
          if (priorDigits < 1) continue;
        } else if (priorDigits < minimumPriorDigits || !prefixScore) continue;

        const tail = candidate.slice(start).trim().normalize('NFKC');
        const normalizedTail = normalizedWrappedNumericTail(tail);
        const contextualTail = `${candidate.slice(start).trimStart()}${normalizedSuffix}`.normalize('NFKC');
        if (DATE_LIKE_PATTERN.test(normalizedTail)
            || FORMATTED_NUMERIC_OBSERVATION_PATTERN.test(contextualTail)
            || NUMERIC_OBSERVATION_PATTERN.test(contextualTail)
            || isSentenceSeparatedYear(tail, separator)) return index;
      }
      return groups.length;
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
        if (!/\s/u.test(separator)) continue;

        const tail = extension.slice(start).trim().normalize('NFKC');
        const normalizedTail = normalizedWrappedNumericTail(tail);
        const contextualTail = `${extension.slice(start).trimStart()}${normalizedSuffix}`.normalize('NFKC');
        if (isSentenceSeparatedYear(tail, separator)
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

function canStartIndependentPhone(candidate, groups, first, externalPrefix) {
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
    if (phoneCandidateScore(slice, `${externalPrefix}${candidate.slice(0, start)}`)) return true;
  }
  return false;
}

function redactAttachedInternationalSuffix(candidate, groups, externalPrefix, externalSuffix) {
  let best = null;
  for (let index = 1; index < groups.length; index += 1) {
    const previousEnd = groups[index - 1].index + groups[index - 1][0].length;
    if (!/\s/u.test(candidate.slice(previousEnd, groups[index].index))) continue;
    if (!canStartIndependentPhone(candidate, groups, index, externalPrefix)) continue;

    const { start } = phoneWindowBounds(candidate, groups, index, index);
    const protectedPrefix = candidate.slice(0, start);
    const normalizedPrefix = protectedPrefix.trim().normalize('NFKC');
    if (!isInternationalPhoneCandidate(normalizedPrefix)) continue;
    const prefixScore = phoneCandidateScore(protectedPrefix.trimEnd(), externalPrefix);
    if (!prefixScore) continue;

    const suffix = candidate.slice(start);
    const redactedSuffix = redactPhoneSubspans(
      suffix,
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true
    );
    if (redactedSuffix === suffix) continue;

    const protectedDigits = normalizedPrefix.replace(/\D/gu, '').length;
    const proposal = {
      prefixScore,
      protectedDigits,
      output: `${protectedPrefix}${redactedSuffix}`
    };
    if (!best
        || proposal.protectedDigits > best.protectedDigits
        || (proposal.protectedDigits === best.protectedDigits
          && proposal.prefixScore > best.prefixScore)) {
      best = proposal;
    }
  }
  return best?.output ?? candidate;
}

function redactPhoneSubspans(candidate, externalPrefix, externalSuffix, allowInitialGroup = true) {
  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return candidate;

  const observationGroup = trailingObservationGroup(candidate, groups, externalPrefix, externalSuffix);
  const normalizedCandidate = candidate.trim().normalize('NFKC');
  const wholeSpanIsAffirmative = isInternationalPhoneCandidate(normalizedCandidate) || hasPhoneLabelPrefix(externalPrefix);
  if (!allowInitialGroup && isInternationalPhoneCandidate(normalizedCandidate)) {
    return redactAttachedInternationalSuffix(candidate, groups, externalPrefix, externalSuffix);
  }
  if (wholeSpanIsAffirmative && allowInitialGroup && observationGroup > 0) {
    const { start, end } = phoneWindowBounds(candidate, groups, 0, observationGroup - 1);
    const completePhoneSpan = candidate.slice(start, end);
    if (phoneCandidateScore(completePhoneSpan, `${externalPrefix}${candidate.slice(0, start)}`)) {
      const remainder = candidate.slice(end);
      const redactedRemainder = redactPhoneSubspans(
        remainder,
        `${externalPrefix}${candidate.slice(0, start)}[contact omitted]`,
        externalSuffix,
        true
      );
      return `${candidate.slice(0, start)}[contact omitted]${redactedRemainder}`;
    }
  }

  const intervals = Array.from({ length: groups.length }, () => []);
  for (let first = 0; first < groups.length; first += 1) {
    if (!allowInitialGroup) {
      if (first === 0) continue;
      const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
      if (!/\s/u.test(candidate.slice(previousEnd, groups[first].index))) continue;
    }
    for (let last = first; last < groups.length && last < first + MAX_PHONE_DIGIT_GROUPS; last += 1) {
      const { start, end } = phoneWindowBounds(candidate, groups, first, last);
      const slice = candidate.slice(start, end);
      let score = phoneCandidateScore(slice, `${externalPrefix}${candidate.slice(0, start)}`);
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
      const redactedDigits = interval.slice.normalize('NFKC').replace(/\D/gu, '').length + tail.redactedDigits;
      const proposal = {
        score: interval.score + tail.score,
        redactedDigits,
        ranges: [interval, ...tail.ranges]
      };
      if (proposal.score > choice.score
          || (proposal.score === choice.score && proposal.redactedDigits < choice.redactedDigits)) {
        choice = proposal;
      }
    }
    best[index] = choice;
  }

  if (!best[0].ranges.length) return candidate;
  let cursor = 0;
  let output = '';
  for (const range of [...best[0].ranges].sort((a, b) => a.start - b.start)) {
    if (range.start < cursor) continue;
    output += candidate.slice(cursor, range.start);
    output += '[contact omitted]';
    cursor = range.end;
  }
  return `${output}${candidate.slice(cursor)}`;
}

export function redactContactData(value) {
  const emailRedacted = String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[contact omitted]');
  const phoneRedacted = emailRedacted.replace(PHONE_SPAN_PATTERN, (candidate, offset, input) => {
    const prefix = input.slice(Math.max(0, offset - 64), offset);
    const suffix = input.slice(offset + candidate.length, offset + candidate.length + 64);
    const previousCharacter = Array.from(prefix).at(-1) ?? '';
    const allowInitialGroup = !/[\p{L}\p{N}]/u.test(previousCharacter) || hasPhoneLabelPrefix(prefix);
    return redactPhoneSubspans(candidate, prefix, suffix, allowInitialGroup);
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
