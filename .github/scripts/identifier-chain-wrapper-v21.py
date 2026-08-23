from __future__ import annotations

from pathlib import Path
import sys


def replace_once(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
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
    replacement = r"""function explicitIdentifierLabelMatch(normalizedPrefix) {
  const wrapperMatch = normalizedPrefix.match(
    /(?:(?:\(|\[|\{|（|［|【)\s*)+$/u
  );
  const labelEnd = wrapperMatch?.index ?? normalizedPrefix.length;
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
  if (hasUrlTokenPrefixContext(
    normalizedPrefix.slice(0, absoluteMatchIndex)
  )) return null;

  match.absoluteIndex = absoluteMatchIndex;
  return match;
}

function hasExplicitIdentifierPrefixNormalized(normalizedPrefix) {
  return Boolean(explicitIdentifierLabelMatch(normalizedPrefix));
}

function hasPhoneLabelPrefixNormalized(normalizedPrefix) {
  if (PHONE_LABEL_PATTERN.test(normalizedPrefix.slice(-48))) return true;

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
    const phoneLabelMatch = beforeIdentifier.slice(-48).match(
      PHONE_LABEL_PATTERN
    );
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
        "function explicitIdentifierLabelMatch(normalizedPrefix) {\n",
        "\nfunction hasPhoneLabelPrefix(prefix) {\n",
        replacement,
        "identifier-chain",
    )
    path.write_text(text, encoding="utf-8")


def patch_test(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    replacement = r"""for (const [phoneLabelThenIdentifier, expected] of [
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
"""
    text = replace_once(
        text,
        "for (const [phoneLabelThenIdentifier, expected] of [\n",
        "\nfor (const compactNumericIdentifier of [\n",
        replacement,
        "identifier-chain regression",
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: identifier-chain-wrapper-v21.py LIBRARY TEST")
    patch_library(Path(sys.argv[1]))
    patch_test(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
