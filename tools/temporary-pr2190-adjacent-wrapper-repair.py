from pathlib import Path
from textwrap import dedent

library_path = Path('tools/lib/industrial-exhaust.mjs')
library = library_path.read_text(encoding='utf-8')

old_pattern_tail = r'(?:\s*[)）])?(?=$|'
new_pattern_tail = r'(?:\s*[)）])*(?=$|'
if library.count(old_pattern_tail) != 1:
    raise RuntimeError(
        f'phone-span trailing-wrapper pattern count was {library.count(old_pattern_tail)}, expected 1'
    )
library = library.replace(old_pattern_tail, new_pattern_tail, 1)

old_helper = dedent(r'''


function findOwnedNarrativePhoneWrapper(candidate, input, offset, contactOffset) {
  if (!/[+＋]/u.test(input[contactOffset] ?? '')) return null;

  let openerIndex = contactOffset - 1;
  while (openerIndex >= 0 && /\s/u.test(input[openerIndex])) openerIndex -= 1;
  if (!/[（(]/u.test(input[openerIndex] ?? '')) return null;

  let depth = 1;
  const candidateEnd = offset + candidate.length;
  for (let index = contactOffset; index < candidateEnd; index += 1) {
    const normalized = input[index].normalize('NFKC');
    if (normalized === '(') depth += 1;
    else if (normalized === ')') {
      depth -= 1;
      if (depth === 0) {
        return {
          closeIndex: index - offset,
          closer: input[index]
        };
      }
      if (depth < 0) return null;
    }
  }
  return null;
}
''').rstrip()

new_helper = dedent(r'''

function unmatchedOpeningParenthesisDepth(value) {
  let depth = 0;
  for (const character of value) {
    const normalized = character.normalize('NFKC');
    if (normalized === '(') depth += 1;
    else if (normalized === ')' && depth > 0) depth -= 1;
  }
  return depth;
}

function stripUnownedLeadingPhoneClosers(value, availableOuterOpeners) {
  let preservedClosers = 0;
  let cursor = 0;
  let prefix = '';
  while (cursor < value.length) {
    const character = value[cursor];
    const normalized = character.normalize('NFKC');
    if (/\s/u.test(character)) {
      prefix += character;
      cursor += 1;
      continue;
    }
    if (normalized !== ')') break;
    if (preservedClosers < availableOuterOpeners) {
      prefix += character;
      preservedClosers += 1;
    }
    cursor += 1;
  }
  return `${prefix}${value.slice(cursor)}`;
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
  if (!adjacentOpeners) return null;

  const availableOuterOpeners = unmatchedOpeningParenthesisDepth(
    input.slice(0, firstOpenerIndex)
  );
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
''').rstrip()

if library.count(old_helper) != 1:
    raise RuntimeError(f'old wrapper helper count was {library.count(old_helper)}, expected 1')
library = library.replace(old_helper, new_helper, 1)

old_callback = dedent(r'''
    if (ownedWrapper) {
      const phoneCandidate = candidate.slice(0, ownedWrapper.closeIndex);
      const afterWrapper = candidate.slice(
        ownedWrapper.closeIndex + ownedWrapper.closer.length
      );
      const redactedPhone = redactPhoneSubspans(
        phoneCandidate,
        prefix,
        `${ownedWrapper.closer}${afterWrapper}${suffix}`,
        allowInitialGroup
      );
      if (redactedPhone !== phoneCandidate) {
        const redactedAfter = redactPhoneSubspans(
          afterWrapper,
          `${prefix}${redactedPhone}${ownedWrapper.closer}`,
          suffix,
          true
        );
        return `${redactedPhone}${ownedWrapper.closer}${redactedAfter}`;
      }
    }
''').rstrip()

new_callback = dedent(r'''
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
        allowInitialGroup
      );
      if (redactedPhone !== phoneCandidate) {
        const redactedAfter = redactPhoneSubspans(
          afterWrapper,
          `${prefix}${redactedPhone}${ownedWrapper.closers}`,
          suffix,
          true
        );
        return `${redactedPhone}${ownedWrapper.closers}${redactedAfter}`;
      }
    }
''').rstrip()

if library.count(old_callback) != 1:
    raise RuntimeError(f'old wrapper callback count was {library.count(old_callback)}, expected 1')
library = library.replace(old_callback, new_callback, 1)
library_path.write_text(library, encoding='utf-8')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
marker = "\nconsole.log('industrial-exhaust tests passed');"
sentinel = 'surplus terminal wrapper closers must be removed after preserving every adjacent owned wrapper'
if sentinel not in tests:
    if tests.count(marker) != 1:
        raise RuntimeError(f'test trailer marker count was {tests.count(marker)}, expected 1')
    block = dedent(r'''

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
    ''')
    tests = tests.replace(marker, f'{block}{marker}', 1)
test_path.write_text(tests, encoding='utf-8')

print('PR 2190 adjacent-wrapper repair applied')
