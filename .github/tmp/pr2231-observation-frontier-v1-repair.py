from pathlib import Path

LIBRARY = Path('tools/lib/industrial-exhaust.mjs')
TEST = Path('test/industrial-exhaust.test.js')

library = LIBRARY.read_text()
old_helper = '''function seedFallsInsideEarlierObservation(
  candidate,
  groups,
  seed,
  minimumStart
) {
  const seedEnd = seed.index + seed[0].length;
  for (const group of groups) {
    if (group.index < minimumStart || group.index >= seed.index) continue;
    const source = candidate.slice(group.index);
    const observation = numericObservationMatch(source);
    if (!observation) continue;
    const observationEnd = group.index + sourceEndForNormalizedPrefix(
      source,
      observation[0].length
    );
    if (observationEnd >= seedEnd) return true;
  }
  return false;
}

'''
if library.count(old_helper) != 1:
    raise SystemExit('expected one seedFallsInsideEarlierObservation helper')
library = library.replace(old_helper, '')

old_loop = '''  for (const seed of groups) {
    const seedRange = {
      start: seed.index,
      end: seed.index + seed[0].length
    };
    if (seedRange.start < lastRedactedEnd) continue;
    if (rangeOverlapsAny(seedRange, lease.ranges)) continue;
    if (seedFallsInsideEarlierObservation(
      lease.candidate,
      groups,
      seed,
      lastRedactedEnd
    )) continue;
'''
new_loop = '''  // Track the furthest source endpoint claimed by observations that start at
  // earlier digit groups. Each group is parsed at most once, so adversarial
  // observation trains cannot repeatedly rescan every preceding suffix.
  let earlierObservationEnd = lastRedactedEnd;
  for (const seed of groups) {
    const seedRange = {
      start: seed.index,
      end: seed.index + seed[0].length
    };
    const fallsInsideEarlierObservation = earlierObservationEnd >= seedRange.end;
    if (seedRange.start >= lastRedactedEnd) {
      const localSource = lease.candidate.slice(seed.index);
      const localObservation = numericObservationMatch(localSource);
      if (localObservation) {
        earlierObservationEnd = Math.max(
          earlierObservationEnd,
          seed.index + sourceEndForNormalizedPrefix(
            localSource,
            localObservation[0].length
          )
        );
      }
    }
    if (seedRange.start < lastRedactedEnd) continue;
    if (rangeOverlapsAny(seedRange, lease.ranges)) continue;
    if (fallsInsideEarlierObservation) continue;
'''
if library.count(old_loop) != 1:
    raise SystemExit('expected one repeated observation bridge loop')
library = library.replace(old_loop, new_loop)
LIBRARY.write_text(library)

test = TEST.read_text()
marker = "\nconst crawlerRuntimeSource = fs.readFileSync(\n"
if test.count(marker) != 1:
    raise SystemExit('expected one crawler runtime test marker')
block = r'''

const repeatedObservationCount = 1200;
const repeatedObservationBridgeInput =
  `Phone: 09012345678 ${'1.1 '.repeat(repeatedObservationCount)}12:30 555-1212`;
const repeatedObservationBridgeStart = performance.now();
const repeatedObservationBridgeOutput = redactContactData(
  repeatedObservationBridgeInput
);
const repeatedObservationBridgeElapsed =
  performance.now() - repeatedObservationBridgeStart;
assert.equal(
  repeatedObservationBridgeOutput,
  `Phone: [contact omitted] ${'1.1 '.repeat(repeatedObservationCount)}12:30 [contact omitted]`,
  'one-pass observation custody must preserve every decimal while carrying the label to the later local phone'
);
assert.ok(
  repeatedObservationBridgeElapsed < 5000,
  `repeated observation bridge must remain bounded; elapsed=${repeatedObservationBridgeElapsed.toFixed(1)}ms`
);
for (const [name, input, expected] of [
  [
    'consecutive observations still skip internal digit seeds',
    'Phone: 09012345678 2026-08-17 12:30:45 555-1212',
    'Phone: [contact omitted] 2026-08-17 12:30:45 [contact omitted]'
  ],
  [
    'fullwidth observation bridge retains source geometry',
    '電話：０９０１２３４５６７８ ３．１４ １２：３０：４５ ５５５－１２１２',
    '電話：[contact omitted] ３．１４ １２：３０：４５ [contact omitted]'
  ],
  [
    'a sentence boundary still terminates the label before repeated observations',
    `Phone: 09012345678. ${'1.1 '.repeat(20)}12:30 555-1212`,
    `Phone: [contact omitted]. ${'1.1 '.repeat(20)}12:30 555-1212`
  ]
]) {
  assert.equal(
    redactContactData(input),
    expected,
    `${name}: the monotone observation frontier must not widen cross-callback authority`
  );
}
'''
test = test.replace(marker, block + marker)
TEST.write_text(test)
