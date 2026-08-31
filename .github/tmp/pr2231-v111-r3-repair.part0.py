#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one exact match, found {count}")
    return text.replace(old, new, 1)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: repair-pr2231-v111-r3-five-findings.py <worktree> <receipt>")
    root = Path(sys.argv[1]).resolve()
    receipt_path = Path(sys.argv[2]).resolve()
    lib_path = root / "tools/lib/industrial-exhaust.mjs"
    test_path = root / "test/industrial-exhaust.test.js"
    lib = lib_path.read_text()
    tests = test_path.read_text()

    lib = once(lib,
'''  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length || groups[0].index !== 0) return null;
  const interval = validatedIntrinsicPhoneContinuation(candidate, groups, 0);
''',
'''  const groups = leadingDigitGroups(
    candidate,
    MAX_PHONE_DIGIT_GROUPS + 1
  );
  if (!groups.length || groups[0].index !== 0) return null;
  const interval = validatedIntrinsicPhoneContinuation(candidate, groups, 0);
''', "bounded intrinsic phone census")

    lib = once(lib,
'''  const sourceStart = groups[0].index;
  const source = candidate.slice(sourceStart);
  const boundedSource = boundedObservationSource(source);
  const contextual = `${boundedSource.normalize('NFKC')}${externalSuffix
    .normalize('NFKC')
    .slice(0, 64)}`;
''',
'''  const sourceStart = groups[0].index;
  const source = candidate.slice(sourceStart);
  const { contextual } = boundedObservationContext(source, externalSuffix);
''', "leading complete-source context")

    lib = once(lib,
'''function boundedObservationSource(source) {
  return source.length > MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    ? source.slice(0, MAX_NUMERIC_OBSERVATION_SOURCE_CHARS)
    : source;
}

function numericObservationMatch(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
''',
'''function boundedObservationSource(source) {
  return source.length > MAX_NUMERIC_OBSERVATION_SOURCE_CHARS
    ? source.slice(0, MAX_NUMERIC_OBSERVATION_SOURCE_CHARS)
    : source;
}

function boundedObservationContext(source, externalSuffix = '') {
  const sourceComplete = source.length <= MAX_NUMERIC_OBSERVATION_SOURCE_CHARS;
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${sourceComplete
    ? externalSuffix.normalize('NFKC').slice(0, 64)
    : ''}`;
  return { boundedSource, contextual, sourceComplete };
}

function leadingDigitGroups(source, limit) {
  const groups = [];
  for (const group of source.matchAll(DIGIT_RUN_PATTERN)) {
    groups.push(group);
    if (groups.length >= limit) break;
  }
  return groups;
}

function numericObservationMatch(source, externalSuffix = '') {
  const { contextual } = boundedObservationContext(source, externalSuffix);
''', "bounded observation helper")

    lib = once(lib,
'''  const completePeriodDate = completeDayFirstPeriodDateMatch(contextual);
  if (completePeriodDate) return completePeriodDate;

  if (/^\\d{1,9}\\.\\d{1,6}\\./u.test(contextual)
''',
'''  const completePeriodDate = completeDayFirstPeriodDateMatch(contextual);
  if (completePeriodDate) return completePeriodDate;

  const groupedScalarInteger = /^\\d{1,3}(?:,\\d{3})+(?=[.．]\\d)/u.exec(
    contextual
  );
  if (groupedScalarInteger
      && completeIntrinsicPhoneAfterObservationBoundary(
        contextual.slice(groupedScalarInteger[0].length)
      )) return groupedScalarInteger;

  if (/^\\d{1,9}\\.\\d{1,6}\\./u.test(contextual)
''', "grouped scalar boundary")

    lib = once(lib,
'''function isWeakBareRangeObservation(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
''',
'''function isWeakBareRangeObservation(source, externalSuffix = '') {
  const { contextual } = boundedObservationContext(source, externalSuffix);
''', "weak range complete-source context")

    lib = once(lib,
'''    const observation = numericObservationMatch(source);
    if (observation && !isWeakBareRangeObservation(source)) {
      observationEnd = Math.max(
        observationEnd,
        group.index + sourceEndForNormalizedPrefix(
          source,
          observation[0].length
        )
      );
    }
''',
'''    const observation = numericObservationMatch(source);
    const observationSourceEnd = observation
      ? sourceEndForNormalizedPrefix(source, observation[0].length)
      : 0;
    const weakObservation = Boolean(
      observation && isWeakBareRangeObservation(source)
    );
    const weakObservationPrecedesIntrinsicPhone = Boolean(
      weakObservation
        && completeIntrinsicPhoneAfterObservationBoundary(
          source.slice(observationSourceEnd)
        )
    );
    if (observation
        && (!weakObservation || weakObservationPrecedesIntrinsicPhone)) {
      observationEnd = Math.max(
        observationEnd,
        group.index + observationSourceEnd
      );
    }
''', "weak range frontier")

    lib = once(lib,
'''function crossCallbackObservationMatch(source, externalSuffix = '') {
  const boundedSource = boundedObservationSource(source);
  const normalizedSource = boundedSource.normalize('NFKC');
  const contextual = `${normalizedSource}${externalSuffix.normalize('NFKC').slice(0, 64)}`;
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  const ordinaryMatch = numericObservationMatch(boundedSource, externalSuffix);
''',
'''function crossCallbackObservationMatch(source, externalSuffix = '') {
  const { contextual } = boundedObservationContext(source, externalSuffix);
  const unitMatch = NUMERIC_OBSERVATION_PATTERN.exec(contextual);
  const ordinaryMatch = numericObservationMatch(source, externalSuffix);
''', "cross-callback complete-source context")

    lib = once(lib,
'''function initialIntrinsicPhoneDashTransition(
  candidate,
  groups,
  externalSuffix
) {
  let strongestInitialPhone = null;
  const lastLimit = Math.min(
    groups.length - 1,
    MAX_PHONE_DIGIT_GROUPS - 1
  );
''',
'''function initialIntrinsicPhoneDashTransition(
  candidate,
  groups,
  externalSuffix
) {
  let strongestInitialPhone = null;
  const boundedInitialPhone = validatedIntrinsicPhoneContinuation(
    candidate,
    groups,
    0
  );
  let lastLimit = Math.min(
    groups.length - 1,
    MAX_PHONE_DIGIT_GROUPS - 1
  );
  if (boundedInitialPhone) {
    let boundedLast = -1;
    for (let index = 0; index < groups.length; index += 1) {
      const groupEnd = groups[index].index + groups[index][0].length;
      if (groupEnd > boundedInitialPhone.end) break;
      boundedLast = index;
    }
    if (boundedLast >= 0) lastLimit = Math.min(lastLimit, boundedLast);
  }
''', "initial phone terminal bound")

    lib = once(lib,
'''    const nextSource = next < groups.length
      ? candidate.slice(groups[next].index, groups[next].index + MAX_NUMERIC_OBSERVATION_SOURCE_CHARS)
      : '';
''',
'''    const nextSource = next < groups.length
      ? candidate.slice(groups[next].index)
      : '';
''', "untruncated competing source")

    worklist = '''let activePhoneRedactionWork = null;

