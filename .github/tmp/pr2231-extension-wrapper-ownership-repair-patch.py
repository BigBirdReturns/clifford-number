from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust.mjs")
text = PATH.read_text()

old_shortcut = """      const normalizedSuffix = externalSuffix.normalize('NFKC').slice(0, 64);
      if (PHONE_EXTENSION_SUFFIX_PATTERN.test(normalizedSuffix)) return groups.length;
      const minimumPriorDigits = 7;
"""
new_shortcut = """      const normalizedSuffix = externalSuffix.normalize('NFKC').slice(0, 64);
      const minimumPriorDigits = 7;
"""

if text.count(old_shortcut) != 1:
    raise SystemExit(f"extension shortcut replacement count={text.count(old_shortcut)}")
text = text.replace(old_shortcut, new_shortcut)

old_transition = r'''function independentPhoneStartAfterObservation(
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
'''

new_transition = r'''function observationParenthesisBoundaryState(value, priorDepth = 0) {
  let priorOpeners = priorDepth;
  let separatorOpeners = 0;
  let ownedClosers = 0;

  for (const character of value) {
    const normalized = character.normalize('NFKC');
    if (normalized === '(') {
      separatorOpeners += 1;
      continue;
    }
    if (normalized !== ')') continue;
    if (separatorOpeners > 0) {
      separatorOpeners -= 1;
      continue;
    }
    if (priorOpeners > 0) {
      priorOpeners -= 1;
      ownedClosers += 1;
    }
  }

  return {
    depth: priorOpeners + separatorOpeners,
    unmatchedSeparatorOpeners: separatorOpeners,
    ownedClosers
  };
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
  const observationRegionStart = observation.group > 0
    ? groups[observation.group - 1].index + groups[observation.group - 1][0].length
    : 0;
  let wrapperDepth = observationParenthesisBoundaryState(
    candidate.slice(observationRegionStart, observationEnd)
  ).depth;
  let wrapperCursor = observationEnd;

  for (let first = observation.group; first < groups.length; first += 1) {
    if (groups[first].index < observationEnd) continue;
    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const groupStart = groups[first].index;
    const separator = candidate.slice(previousEnd, groupStart);
    const normalizedSeparator = separator.normalize('NFKC');
    const boundaryStart = Math.max(wrapperCursor, previousEnd);
    const boundaryState = observationParenthesisBoundaryState(
      candidate.slice(boundaryStart, groupStart),
      wrapperDepth
    );
    const opensObservationWrapper = boundaryState.unmatchedSeparatorOpeners > 0
      || /[\[\{［【]/u.test(normalizedSeparator);
    const closesOwnedObservationWrapper = boundaryState.ownedClosers > 0
      && CLOSING_OBSERVATION_WRAPPER_PATTERN.test(normalizedSeparator);
    if (!/[\s/／.．]/u.test(separator)
        && !opensObservationWrapper
        && !closesOwnedObservationWrapper) {
      wrapperDepth = boundaryState.depth;
      wrapperCursor = groupStart + groups[first][0].length;
      continue;
    }

    const remainingCandidate = candidate.slice(groupStart);
    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
      observationEnd = groupStart + sourceEndForNormalizedPrefix(
        remainingCandidate,
        nextObservation[0].length
      );
      wrapperDepth = observationParenthesisBoundaryState(
        candidate.slice(groupStart, observationEnd),
        boundaryState.depth
      ).depth;
      wrapperCursor = observationEnd;
      continue;
    }

    const interval = validatedIndependentPhoneInterval(
      candidate, groups, first, externalPrefix, externalSuffix, indeterminatePhoneContext
    );
    if (interval) return interval;
    wrapperDepth = boundaryState.depth;
    wrapperCursor = groupStart + groups[first][0].length;
  }
  return null;
}
'''

if text.count(old_transition) != 1:
    raise SystemExit(f"observation transition replacement count={text.count(old_transition)}")
text = text.replace(old_transition, new_transition)
PATH.write_text(text)
