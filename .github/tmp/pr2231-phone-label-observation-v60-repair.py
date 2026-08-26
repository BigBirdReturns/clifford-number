from pathlib import Path
import base64
import json
import os
import urllib.request

BASE_REPAIR_BLOB = "bdf77eee3ce7a04b0418bcb714ad4838695381b3"
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

library_path = Path("tools/lib/industrial-exhaust.mjs")
library = library_path.read_text()

observation_interval_anchor = r"""      if (!score) continue;

      if (first < observationGroup && last >= observationGroup) continue;
"""
observation_interval_replacement = r"""      if (!score) continue;

      // A proved observation owns only its interior restart points here. The
      // first group remains eligible for whole-span telephone scoring so an
      // intrinsically complete range-shaped phone is not suppressed merely
      // because the same spelling also satisfies the observation grammar.
      if (observationGroup < groups.length
          && first > observationGroup
          && groups[first].index < observation.end) continue;
      if (first < observationGroup && last >= observationGroup) continue;
"""

if library.count(observation_interval_anchor) != 1:
    raise SystemExit(
        "observation interval-custody anchor count="
        f"{library.count(observation_interval_anchor)}"
    )
library = library.replace(
    observation_interval_anchor,
    observation_interval_replacement,
)
library_path.write_text(library)