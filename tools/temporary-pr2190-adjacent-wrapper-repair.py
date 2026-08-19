from pathlib import Path
from textwrap import dedent

library_path = Path('tools/lib/industrial-exhaust.mjs')
library = library_path.read_text(encoding='utf-8')

old_pattern_tail = r'(?:\s*[)）])?(?=$|'
new_pattern_tail = r'(?:\s*[)）])*(?=$|'
pattern_count = library.count(old_pattern_tail)
print(f'phone-span trailing-wrapper pattern count: {pattern_count}')
if pattern_count != 1:
    raise RuntimeError(
        f'phone-span trailing-wrapper pattern count was {pattern_count}, expected 1'
    )
library = library.replace(old_pattern_tail, new_pattern_tail, 1)

helper_start = library.find('function findOwnedNarrativePhoneWrapper(')
helper_end = library.find('\nexport function redactContactData(value) {', helper_start)
print(f'wrapper helper anchors: start={helper_start}, end={helper_end}')
if helper_start < 0 or helper_end < 0:
    raise RuntimeError('wrapper helper structural anchors were not found')
old_helper = library[helper_start:helper_end]
if 'ownedWrapper' in old_helper or 'closeIndex' not in old_helper or 'closer:' not in old_helper:
    raise RuntimeError('wrapper helper structural slice did not match the reviewed baseline')

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
library = f'{library[:helper_start]}{new_helper}\n{library[helper_end:]}'

callback_anchor = library.find('    const ownedWrapper = findOwnedNarrativePhoneWrapper(')
callback_start = library.find('    if (ownedWrapper) {', callback_anchor)
callback_end = library.find(
    '    return redactPhoneSubspans(candidate, prefix, suffix, allowInitialGroup);',
    callback_start
)
print(
    'wrapper callback anchors: '
    f'anchor={callback_anchor}, start={callback_start}, end={callback_end}'
)
if callback_anchor < 0 or callback_start < 0 or callback_end < 0:
    raise RuntimeError('wrapper callback structural anchors were not found')
old_callback = library[callback_start:callback_end]
if 'ownedWrapper.closer' not in old_callback or 'redactPhoneSubspans' not in old_callback:
    raise RuntimeError('wrapper callback structural slice did not match the reviewed baseline')

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
library = f'{library[:callback_start]}{new_callback}\n{library[callback_end:]}'
library_path.write_text(library, encoding='utf-8')
print('library repair applied')

test_path = Path('test/industrial-exhaust.test.js')
tests = test_path.read_text(encoding='utf-8')
marker = "\nconsole.log('industrial-exhaust tests passed');"
sentinel = 'surplus terminal wrapper closers must be removed after preserving every adjacent owned wrapper'
if sentinel not in tests:
    marker_count = tests.count(marker)
    print(f'test trailer marker count: {marker_count}')
    if marker_count != 1:
        raise RuntimeError(f'test trailer marker count was {marker_count}, expected 1')
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
    print('regression fixtures inserted')
else:
    print('regression fixtures already present')

print('PR 2190 adjacent-wrapper repair applied')
