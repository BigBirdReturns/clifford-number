from __future__ import annotations

from pathlib import Path
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label} anchor count: {count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    if text.count(start) != 1:
        raise RuntimeError(f"{label} start count: {text.count(start)}")
    begin = text.index(start)
    if text.count(end, begin) != 1:
        raise RuntimeError(f"{label} end count: {text.count(end, begin)}")
    finish = text.index(end, begin)
    return text[:begin] + replacement + text[finish:]


def patch_library(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "const TRUNCATED_PHONE_LABEL_CONTEXT = '\\u0000phone-label-context-truncated\\u0000';\n",
        "",
        "remove string sentinel",
    )

    indexed_matchers = r"""function nonWhitespaceTokenStart(value, end = value.length) {
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

"""
    text = replace_between(
        text,
        "function nonWhitespaceTokenStart(value, end = value.length) {\n",
        "function explicitIdentifierLabelMatch(normalizedPrefix) {\n",
        indexed_matchers,
        "indexed matchers",
    )

    old_chain = r"""function trailingIdentifierLabelChain(normalizedPrefix) {
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
"""
    new_chain = old_chain.replace(
        "  let labels = 0;\n",
        "  let labels = 0;\n  const urlTokenCache = { start: -1, end: -1, urlContext: null };\n",
    ).replace(
        "    normalizedPrefix,\n    cursor\n  );",
        "    normalizedPrefix,\n    cursor,\n    urlTokenCache\n  );",
        1,
    ).replace(
        "      normalizedPrefix,\n      cursor\n    );",
        "      normalizedPrefix,\n      cursor,\n      urlTokenCache\n    );",
        1,
    )
    text = replace_once(text, old_chain, new_chain, "URL-cache label chain")
    text = replace_once(
        text,
        "  if (normalizedPrefix.startsWith(TRUNCATED_PHONE_LABEL_CONTEXT)) return true;\n",
        "",
        "remove sentinel authority",
    )
    text = replace_once(
        text,
        "function phoneCandidateScore(candidate, prefix) {\n",
        "function phoneCandidateScore(candidate, prefix, indeterminatePhoneContext = false) {\n",
        "score state parameter",
    )
    text = replace_once(
        text,
        "  const labelled = hasPhoneLabelPrefixNormalized(normalizedPrefix);\n",
        "  const labelled = indeterminatePhoneContext\n    || hasPhoneLabelPrefixNormalized(normalizedPrefix);\n",
        "score state authority",
    )

    old_can_start = r"""function canStartIndependentPhone(candidate, groups, first, externalPrefix) {
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
"""
    new_can_start = old_can_start.replace(
        "function canStartIndependentPhone(candidate, groups, first, externalPrefix) {",
        "function canStartIndependentPhone(\n  candidate,\n  groups,\n  first,\n  externalPrefix,\n  indeterminatePhoneContext = false\n) {",
    ).replace(
        "if (phoneCandidateScore(slice, `${externalPrefix}${candidate.slice(0, start)}`)) return true;",
        "if (phoneCandidateScore(\n      slice,\n      `${externalPrefix}${candidate.slice(0, start)}`,\n      indeterminatePhoneContext\n    )) return true;",
    )
    text = replace_once(text, old_can_start, new_can_start, "independent phone state")

    old_attached = r"""function redactAttachedInternationalSuffixRanges(
  candidate,
  groups,
  externalPrefix,
  externalSuffix
) {
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

    const suffixRanges = phoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true
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
"""
    new_attached = old_attached.replace(
        "  externalSuffix\n) {",
        "  externalSuffix,\n  indeterminatePhoneContext = false\n) {",
    ).replace(
        "if (!canStartIndependentPhone(candidate, groups, index, externalPrefix)) continue;",
        "if (!canStartIndependentPhone(\n      candidate,\n      groups,\n      index,\n      externalPrefix,\n      indeterminatePhoneContext\n    )) continue;",
    ).replace(
        "const prefixScore = phoneCandidateScore(protectedPrefix.trimEnd(), externalPrefix);",
        "const prefixScore = phoneCandidateScore(\n      protectedPrefix.trimEnd(),\n      externalPrefix,\n      indeterminatePhoneContext\n    );",
    ).replace(
        "      externalSuffix,\n      true\n    );",
        "      externalSuffix,\n      true,\n      indeterminatePhoneContext\n    );",
    )
    text = replace_once(text, old_attached, new_attached, "attached suffix state")

    new_prefix_context = r"""function redactionPrefixContext(input, offset) {
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
"""
    text = replace_between(
        text,
        "function redactionPrefixContext(input, offset) {\n",
        "\nfunction identifierProtectedPrefixEnd(candidate, groups, externalSuffix) {\n",
        new_prefix_context,
        "indexed prefix context",
    )

    text = replace_once(
        text,
        "  allowInitialGroup = true\n) {\n  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];",
        "  allowInitialGroup = true,\n  indeterminatePhoneContext = false\n) {\n  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];",
        "range state parameter",
    )
    text = replace_once(
        text,
        "  const phoneLabelContext = hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);\n",
        "  const phoneLabelContext = indeterminatePhoneContext\n    || hasPhoneLabelPrefixNormalized(normalizedExternalPrefix);\n",
        "range state authority",
    )
    text = replace_once(
        text,
        "      externalSuffix,\n      true\n    ).map(range => ({\n      start: range.start + protectedEnd,",
        "      externalSuffix,\n      true,\n      indeterminatePhoneContext\n    ).map(range => ({\n      start: range.start + protectedEnd,",
        "identifier recursion state",
    )
    text = replace_once(
        text,
        "      externalPrefix,\n      externalSuffix\n    );\n  }\n  if (wholeSpanIsAffirmative",
        "      externalPrefix,\n      externalSuffix,\n      indeterminatePhoneContext\n    );\n  }\n  if (wholeSpanIsAffirmative",
        "attached call state",
    )
    text = replace_once(
        text,
        "      completePhoneSpan,\n      `${externalPrefix}${candidate.slice(0, start)}`\n    )) {",
        "      completePhoneSpan,\n      `${externalPrefix}${candidate.slice(0, start)}`,\n      indeterminatePhoneContext\n    )) {",
        "complete score state",
    )
    text = replace_once(
        text,
        "        externalSuffix,\n        true\n      ).map(range => ({\n        start: range.start + end,",
        "        externalSuffix,\n        true,\n        indeterminatePhoneContext\n      ).map(range => ({\n        start: range.start + end,",
        "remainder recursion state",
    )
    text = replace_once(
        text,
        "        slice,\n        `${externalPrefix}${candidate.slice(0, start)}`\n      );",
        "        slice,\n        `${externalPrefix}${candidate.slice(0, start)}`,\n        indeterminatePhoneContext\n      );",
        "interval score state",
    )

    old_subspans = r"""function redactPhoneSubspans(candidate, externalPrefix, externalSuffix, allowInitialGroup = true) {
  return renderPhoneRedactionRanges(
    candidate,
    phoneRedactionRanges(
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup
    )
  );
}
"""
    new_subspans = r"""function redactPhoneSubspans(
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
"""
    text = replace_once(text, old_subspans, new_subspans, "subspan state")

    text = replace_once(
        text,
        "  allowInitialGroup,\n  narrativeContext\n) {",
        "  allowInitialGroup,\n  narrativeContext,\n  indeterminatePhoneContext = false\n) {",
        "outer closer state parameter",
    )
    text = replace_once(
        text,
        "    externalSuffix,\n    allowInitialGroup\n  );\n  if (!ranges.length) return null;",
        "    externalSuffix,\n    allowInitialGroup,\n    indeterminatePhoneContext\n  );\n  if (!ranges.length) return null;",
        "outer closer range state",
    )

    text = replace_once(
        text,
        "    const prefix = redactionPrefixContext(input, contactOffset);\n",
        "    const prefixContext = redactionPrefixContext(input, contactOffset);\n    const prefix = prefixContext.text;\n",
        "top-level context object",
    )
    text = replace_once(
        text,
        "    const allowInitialGroup = !/[\\p{L}\\p{N}]/u.test(adjacentCharacter) || hasPhoneLabelPrefix(prefix);\n",
        "    const allowInitialGroup = prefixContext.indeterminate\n      || !/[\\p{L}\\p{N}]/u.test(adjacentCharacter)\n      || hasPhoneLabelPrefix(prefix);\n",
        "top-level state allowance",
    )
    text = replace_once(
        text,
        "    allowInitialGroup\n  );\n  if (redactedPhone !== phoneCandidate) {",
        "    allowInitialGroup,\n    prefixContext.indeterminate\n  );\n  if (redactedPhone !== phoneCandidate) {",
        "owned wrapper first state",
    )
    text = replace_once(
        text,
        "      suffix,\n      true\n    );\n    return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;",
        "      suffix,\n      true,\n      prefixContext.indeterminate\n    );\n    return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;",
        "owned wrapper second state",
    )
    text = replace_once(
        text,
        "        currentNarrativeParenthesisContext(input.slice(0, contactOffset))\n      );",
        "        currentNarrativeParenthesisContext(input.slice(0, contactOffset)),\n        prefixContext.indeterminate\n      );",
        "outer closer call state",
    )
    text = replace_once(
        text,
        "    return redactPhoneSubspans(candidate, prefix, suffix, allowInitialGroup);\n",
        "    return redactPhoneSubspans(\n      candidate,\n      prefix,\n      suffix,\n      allowInitialGroup,\n      prefixContext.indeterminate\n    );\n",
        "final subspan state",
    )

    path.write_text(text, encoding="utf-8")


def patch_test(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "\nfor (const [wrappedPhoneLabelThenIdentifier, preservedPrefix, leakedDigits] of [\n"
    if text.count(marker) != 1:
        raise RuntimeError(f"test anchor count: {text.count(marker)}")
    insertion = r"""
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
"""
    path.write_text(text.replace(marker, insertion + marker, 1), encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: phone-label-context-state-v25.py LIBRARY TEST")
    patch_library(Path(sys.argv[1]))
    patch_test(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
