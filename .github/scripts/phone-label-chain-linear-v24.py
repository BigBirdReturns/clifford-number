from __future__ import annotations

from pathlib import Path
import sys


def replace_once(
    text: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
    label: str,
) -> str:
    count = text.count(start_marker)
    if count != 1:
        raise RuntimeError(f"{label} start anchor count: {count}")
    start = text.index(start_marker)
    end_count = text.count(end_marker, start)
    if end_count != 1:
        raise RuntimeError(f"{label} end anchor count: {end_count}")
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]


def patch_library(path: Path) -> None:
    text = path.read_text(encoding="utf-8")

    label_classifier_replacement = r"""const MAX_PHONE_LABEL_CONTEXT_CHARS = 16 * 1024;
const MAX_IDENTIFIER_LABEL_CHAIN_LABELS = 4096;
const TRUNCATED_PHONE_LABEL_CONTEXT = '\u0000phone-label-context-truncated\u0000';
const LABEL_SEPARATOR_CHARACTER_PATTERN = /[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const SUBSTANTIVE_LABEL_SEPARATOR_CHARACTER_PATTERN = /[,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]/u;
const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\(\[\{（［【]/u;

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

function hasUrlTokenPrefixContextAt(normalizedPrefix, end) {
  const boundedEnd = Math.min(Math.max(0, end), normalizedPrefix.length);
  const tokenStart = nonWhitespaceTokenStart(normalizedPrefix, boundedEnd);
  return hasUrlTokenPrefixContext(
    normalizedPrefix.slice(tokenStart, boundedEnd)
  );
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
  end = normalizedPrefix.length
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
    absoluteMatchIndex
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
  let identifierMatch = explicitIdentifierLabelMatchAt(
    normalizedPrefix,
    cursor
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
      cursor
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
  if (normalizedPrefix.startsWith(TRUNCATED_PHONE_LABEL_CONTEXT)) return true;
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
"""
    text = replace_once(
        text,
        "function hasUrlTokenPrefixContext(normalizedPrefix) {\n",
        "\nfunction hasPhoneLabelPrefix(prefix) {\n",
        label_classifier_replacement,
        "linear label classifier",
    )

    prefix_context_replacement = r"""function identifierContextNeedsExpansion(normalizedPrefix) {
  const identifierChain = trailingIdentifierLabelChain(normalizedPrefix);
  return identifierChain.sawIdentifierLabel
    && (identifierChain.overflow || identifierChain.start <= 48);
}

function redactionPrefixContext(input, offset) {
  const preceding = input.slice(0, offset);
  const boundedStart = Math.max(0, preceding.length - 64);
  const boundedTokenStart = nonWhitespaceTokenStart(preceding, boundedStart);
  const currentTokenWithTrailingSpace = preceding.match(/\S+\s*$/u)?.[0] ?? '';
  const tokenStart = currentTokenWithTrailingSpace
    ? preceding.length - currentTokenWithTrailingSpace.length
    : preceding.length;
  let contextStart = Math.min(boundedTokenStart, tokenStart);
  let scanEnd = tokenStart;
  let normalizedToken = currentTokenWithTrailingSpace
    .normalize('NFKC')
    .trim();
  while (/^(?:\(|\[|\{|（|［|【)+$/u.test(normalizedToken) && scanEnd > 0) {
    const priorTokenWithTrailingSpace = preceding
      .slice(0, scanEnd)
      .match(/\S+\s*$/u)?.[0] ?? '';
    if (!priorTokenWithTrailingSpace) break;
    scanEnd -= priorTokenWithTrailingSpace.length;
    contextStart = Math.min(contextStart, scanEnd);
    normalizedToken = priorTokenWithTrailingSpace
      .normalize('NFKC')
      .trim();
  }

  let context = preceding.slice(contextStart);
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
    )) {
      return `${TRUNCATED_PHONE_LABEL_CONTEXT}${context}`;
    }
  }

  return context;
}
"""
    text = replace_once(
        text,
        "function needsEarlierPhoneLabelContextToken(normalizedPrefix) {\n",
        "\nfunction identifierProtectedPrefixEnd(candidate, groups, externalSuffix) {\n",
        prefix_context_replacement,
        "bounded linear prefix context",
    )

    path.write_text(text, encoding="utf-8")


def patch_test(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "\nfor (const [wrappedPhoneLabelThenIdentifier, preservedPrefix, leakedDigits] of [\n"
    if text.count(marker) != 1:
        raise RuntimeError(
            f"linear label regression anchor count: {text.count(marker)}"
        )

    insertion = r"""
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
"""
    text = text.replace(marker, insertion + marker, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: phone-label-chain-linear-v24.py LIBRARY TEST")
    patch_library(Path(sys.argv[1]))
    patch_test(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
