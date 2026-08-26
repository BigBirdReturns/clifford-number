from pathlib import Path
import base64
import json
import os
import urllib.request


BASE_REPAIR_BLOB = "3c770cf1256df94da9a262f4ca81b61dff770e85"
BASE_REPAIR_URL = (
    "https://api.github.com/repos/BigBirdReturns/clifford-number/git/blobs/"
    f"{BASE_REPAIR_BLOB}"
)

request = urllib.request.Request(
    BASE_REPAIR_URL,
    headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
        "X-GitHub-Api-Version": "2022-11-28",
    },
)
with urllib.request.urlopen(request) as response:
    payload = json.load(response)

if payload.get("sha") != BASE_REPAIR_BLOB:
    raise SystemExit(
        f"base repair blob mismatch: {payload.get('sha')} != {BASE_REPAIR_BLOB}"
    )

base_repair = base64.b64decode(payload["content"]).decode("utf-8")
exec(
    compile(base_repair, f"github-blob:{BASE_REPAIR_BLOB}", "exec"),
    {"__name__": "__main__"},
)


def replace_once(text, anchor, replacement, label):
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(anchor, replacement)


library_path = Path("tools/lib/industrial-exhaust.mjs")
library = library_path.read_text()

helper_anchor = r"""function independentPhoneStartAfterObservation(
  candidate,
  groups,
  observation,
  externalPrefix,
  externalSuffix,
  indeterminatePhoneContext,
  explicitPhoneLabelContext = false
) {
"""

helper_increment = r"""function validatedLabelledRangePhoneInterval(
  candidate,
  groups,
  first,
  nextObservation,
  externalPrefix
) {
  const debug = candidate.includes('90 people');
  if (!nextObservation || first + 1 >= groups.length) {
    if (debug) console.log(JSON.stringify({
      debug: 'labelled-range-helper-precondition',
      first,
      groupCount: groups.length,
      nextObservation: nextObservation?.[0] ?? null
    }));
    return null;
  }
  const normalizedObservation = nextObservation[0]
    .normalize('NFKC')
    .trim();
  if (!/^\d{1,9}\s*[-–—]\s*\d{1,9}$/u.test(
    normalizedObservation
  )) {
    if (debug) console.log(JSON.stringify({
      debug: 'labelled-range-helper-shape',
      first,
      normalizedObservation
    }));
    return null;
  }

  const observationSource = candidate.slice(groups[first].index);
  const observationEnd = groups[first].index + sourceEndForNormalizedPrefix(
    observationSource,
    nextObservation[0].length
  );
  const secondEnd = groups[first + 1].index
    + groups[first + 1][0].length;
  if (secondEnd > observationEnd) {
    if (debug) console.log(JSON.stringify({
      debug: 'labelled-range-helper-second-end',
      first,
      observationEnd,
      secondEnd
    }));
    return null;
  }
  if (first + 2 < groups.length
      && groups[first + 2].index < observationEnd) {
    if (debug) console.log(JSON.stringify({
      debug: 'labelled-range-helper-third-group',
      first,
      observationEnd,
      thirdStart: groups[first + 2].index
    }));
    return null;
  }

  const bounds = phoneWindowBounds(candidate, groups, first, first + 1);
  const prefix = `${externalPrefix}${candidate.slice(0, bounds.start)}`;
  const score = phoneCandidateScore(
    candidate.slice(bounds.start, bounds.end),
    prefix,
    true
  );
  if (debug) console.log(JSON.stringify({
    debug: 'labelled-range-helper-score',
    first,
    nextObservation: nextObservation[0],
    normalizedObservation,
    observationEnd,
    secondEnd,
    bounds,
    slice: candidate.slice(bounds.start, bounds.end),
    prefixTail: prefix.slice(-96),
    score
  }));
  if (!score) return null;
  return bounds;
}

"""

library = replace_once(
    library,
    helper_anchor,
    helper_increment + helper_anchor,
    "labelled-range-helper",
)

observation_anchor = r"""    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (nextObservation) {
"""

observation_replacement = r"""    const nextObservation = numericObservationMatch(
      remainingCandidate,
      externalSuffix
    );
    if (candidate.includes('90 people')) console.log(JSON.stringify({
      debug: 'labelled-range-call',
      first,
      explicitPhoneLabelContext,
      remainingCandidate,
      nextObservation: nextObservation?.[0] ?? null
    }));
    const labelledRangeInterval = explicitPhoneLabelContext
      ? validatedLabelledRangePhoneInterval(
          candidate,
          groups,
          first,
          nextObservation,
          externalPrefix
        )
      : null;
    if (labelledRangeInterval) {
      return {
        ...labelledRangeInterval,
        suppressRemainderIndeterminatePhoneContext: suppressAfterBoundary
      };
    }
    if (nextObservation) {
"""

library = replace_once(
    library,
    observation_anchor,
    observation_replacement,
    "labelled-range-precedence",
)
library_path.write_text(library)
