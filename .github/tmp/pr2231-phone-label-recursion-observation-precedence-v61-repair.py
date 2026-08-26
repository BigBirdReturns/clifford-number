from pathlib import Path
import base64
import json
import os
import traceback
import urllib.request

SOURCE_REPAIR_BLOB = "243b1b2976683ba3c5d52a2509ab6e739082757a"
SOURCE_REPAIR_URL = (
    "https://api.github.com/repos/BigBirdReturns/clifford-number/git/blobs/"
    f"{SOURCE_REPAIR_BLOB}"
)

request = urllib.request.Request(
    SOURCE_REPAIR_URL,
    headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
        "X-GitHub-Api-Version": "2022-11-28",
    },
)
with urllib.request.urlopen(request) as response:
    payload = json.load(response)

if payload.get("sha") != SOURCE_REPAIR_BLOB:
    raise SystemExit(
        f"source repair blob mismatch: {payload.get('sha')} != {SOURCE_REPAIR_BLOB}"
    )

source = base64.b64decode(payload["content"]).decode("utf-8")
receipt = Path("/tmp/pr2231-v61-receipt.txt")
try:
    exec(
        compile(source, f"github-blob:{SOURCE_REPAIR_BLOB}", "exec"),
        {"__name__": "__main__"},
    )

    library_path = Path("tools/lib/industrial-exhaust.mjs")
    library = library_path.read_text(encoding="utf-8")
    anchor = '''      let score = phoneCandidateScore(
        slice,
        `${externalPrefix}${candidate.slice(0, start)}`,
        effectivePhoneScoringContext
      );
'''
    replacement = '''      // Inherited explicit-label authority governs candidate entry and bounded
      // post-observation probes. It must not label arbitrary interior starts,
      // which could outrank a marker-owning canonical telephone interval.
      let score = phoneCandidateScore(
        slice,
        `${externalPrefix}${candidate.slice(0, start)}`,
        indeterminatePhoneContext
      );
'''
    if library.count(anchor) != 1:
        raise SystemExit(
            f"ordinary optimizer authority anchor count={library.count(anchor)}"
        )
    library_path.write_text(
        library.replace(anchor, replacement, 1),
        encoding="utf-8",
    )
except BaseException as error:
    with receipt.open("a", encoding="utf-8") as handle:
        handle.write(
            f"REPAIR_EXCEPTION type={type(error).__name__} message={error}\n"
        )
        traceback.print_exc(file=handle)
    raise
