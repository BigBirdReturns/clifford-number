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

    phone_label_replacement = r"""function phoneLabelMatchWithProvenance(normalizedPrefix) {
  const windowStart = Math.max(0, normalizedPrefix.length - 48);
  const window = normalizedPrefix.slice(windowStart);
  const match = window.match(PHONE_LABEL_PATTERN);
  if (!match || match.index == null) return match;

  const absoluteMatchIndex = windowStart + match.index;
  if (hasUrlTokenPrefixContext(
    normalizedPrefix.slice(0, absoluteMatchIndex)
  )) return null;

  match.absoluteIndex = absoluteMatchIndex;
  return match;
}

function hasPhoneLabelPrefixNormalized(normalizedPrefix) {
  if (phoneLabelMatchWithProvenance(normalizedPrefix)) return true;

  let identifierMatch = explicitIdentifierLabelMatch(normalizedPrefix);
  let identifierIsStandaloneId = false;
  let substantiveSeparator = false;

  while (identifierMatch?.absoluteIndex != null) {
    identifierIsStandaloneId ||= /^id(?=$|[^\p{L}\p{N}_])/iu.test(
      identifierMatch[0]
    );

    const beforeIdentifierRaw = normalizedPrefix.slice(
      0,
      identifierMatch.absoluteIndex
    );
    substantiveSeparator ||= /[,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]\s*$/u.test(
      beforeIdentifierRaw
    );
    const beforeIdentifier = beforeIdentifierRaw
      .replace(/[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]+$/gu, ' ');
    const phoneLabelMatch = phoneLabelMatchWithProvenance(beforeIdentifier);
    if (phoneLabelMatch) {
      const ambiguousBareContact = /(?:^|\b)contact\s*$/iu.test(
        phoneLabelMatch[0]
      );
      return identifierIsStandaloneId
        || !ambiguousBareContact
        || substantiveSeparator;
    }

    normalizedPrefix = beforeIdentifier;
    identifierMatch = explicitIdentifierLabelMatch(normalizedPrefix);
  }

  return false;
}
"""
    text = replace_once(
        text,
        "function hasPhoneLabelPrefixNormalized(normalizedPrefix) {\n",
        "\nfunction hasPhoneLabelPrefix(prefix) {\n",
        phone_label_replacement,
        "phone-label URL provenance",
    )

    prefix_context_replacement = r"""function needsEarlierPhoneLabelContextToken(normalizedPrefix) {
  let identifierMatch = explicitIdentifierLabelMatch(normalizedPrefix);
  let sawIdentifierLabel = false;

  while (identifierMatch?.absoluteIndex != null) {
    sawIdentifierLabel = true;
    const beforeIdentifierRaw = normalizedPrefix.slice(
      0,
      identifierMatch.absoluteIndex
    );
    const beforeIdentifier = beforeIdentifierRaw
      .replace(/[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]+$/gu, ' ');
    if (PHONE_LABEL_PATTERN.test(beforeIdentifier.slice(-48))) return false;

    normalizedPrefix = beforeIdentifier;
    identifierMatch = explicitIdentifierLabelMatch(normalizedPrefix);
  }

  return sawIdentifierLabel && !/\S/u.test(
    normalizedPrefix.replace(
      /[\s,;:·•|\/\\\-‐‑‒–—―−(\[｛{（［【]+$/gu,
      ''
    )
  );
}

function redactionPrefixContext(input, offset) {
  const preceding = input.slice(0, offset);
  const boundedStart = Math.max(0, preceding.length - 64);
  const boundedTokenStart = preceding
    .slice(0, boundedStart)
    .match(/\S*$/u)?.index ?? boundedStart;
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

  while (contextStart > 0 && needsEarlierPhoneLabelContextToken(
    preceding.slice(contextStart).normalize('NFKC')
  )) {
    const priorTokenWithTrailingSpace = preceding
      .slice(0, contextStart)
      .match(/\S+\s*$/u)?.[0] ?? '';
    if (!priorTokenWithTrailingSpace) break;
    contextStart -= priorTokenWithTrailingSpace.length;
  }

  return preceding.slice(contextStart);
}
"""
    text = replace_once(
        text,
        "function redactionPrefixContext(input, offset) {\n",
        "\nfunction identifierProtectedPrefixEnd(candidate, groups, externalSuffix) {\n",
        prefix_context_replacement,
        "token-aligned redaction prefix context",
    )

    path.write_text(text, encoding="utf-8")


def patch_test(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "\nfor (const [wrappedPhoneLabelThenIdentifier, preservedPrefix, leakedDigits] of [\n"
    if text.count(marker) != 1:
        raise RuntimeError(
            f"URL phone-label regression anchor count: {text.count(marker)}"
        )

    insertion = r"""
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
"""
    text = text.replace(marker, insertion + marker, 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: phone-label-url-provenance-v23.py LIBRARY TEST")
    patch_library(Path(sys.argv[1]))
    patch_test(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
