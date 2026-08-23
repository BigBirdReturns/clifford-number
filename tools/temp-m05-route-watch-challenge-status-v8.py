#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one target, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()

    library_path = root / "tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs"
    library = library_path.read_text()
    library = replace_once(
        library,
        """    const challengePage=response.ok&&body.length>0&&isChallengePage(body,headers);
    const metadataOnly=response.ok&&!challengePage&&body.length===0;
    const status=response.ok?(challengePage?'challenge_page':(metadataOnly?'metadata_only':'content_retrieved')):'http_failure';
""",
        """    const challengePage=body.length>0&&isChallengePage(body,headers);
    const metadataOnly=response.ok&&!challengePage&&body.length===0;
    const status=challengePage?'challenge_page':(response.ok?(metadataOnly?'metadata_only':'content_retrieved'):'http_failure');
""",
        "runtime non-2xx challenge classification",
    )
    library = replace_once(
        library,
        "      assert(row.status_code>=200&&row.status_code<=299,`${label} challenge_page requires a 2xx status`);\n",
        "      assert(row.status_code>=200&&!(row.status_code>=300&&row.status_code<=399),`${label} challenge_page requires a nonredirect HTTP status`);\n",
        "challenge status coherence",
    )
    library_path.write_text(library)

    test_path = root / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    test = test_path.read_text()
    addition = r"""

{
  const lane=contract.lanes[0];
  const route=lane.routes[0];
  const challenge='<html><head><title>Attention Required</title></head><body>Cloudflare Ray ID 1234567890</body></html>';
  const observation=await fetchOfficialRoute(lane,route,contract,{fetchImpl:async()=>successResponse(challenge,503),clock});
  assert.equal(observation.status,'challenge_page');
  assert.equal(observation.status_code,503);
  assert.equal(observation.route_success,false);
  assert.equal(observation.content_success,false);
  assert.equal(observation.reason,'challenge_page_detected');
  assert(observation.body_bytes>0);
  validateReceipt(await runRouteWatch(contract,{
    observedAtMs:Date.parse('2026-08-22T00:00:00Z'),
    fetchImpl:async()=>successResponse(challenge,503),
    sleepImpl:noSleep,
    clock
  }),contract);
}
"""
    test = replace_once(
        test,
        "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        addition + "\nconsole.log('m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test: OK');\n",
        "non-2xx challenge regression",
    )
    test_path.write_text(test)


if __name__ == "__main__":
    main()
