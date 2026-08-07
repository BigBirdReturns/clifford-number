#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path

PROTOCOL = Path('data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol') / 'route-discovery-protocol.json'

def main() -> int:
    parser=argparse.ArgumentParser(description='Plan the bounded RD-04 official-route discovery transaction.')
    parser.add_argument('--execute', action='store_true', help='refused: execution requires a separate checksum-bound acquisition transaction')
    parser.add_argument('--json', action='store_true')
    args=parser.parse_args()
    protocol=json.loads(PROTOCOL.read_text())
    if args.execute:
        raise SystemExit('execution_refused: this permanent tool is plan-only; create a separate bounded acquisition carrier')
    plan={
        'schema_version':'ssc-rd04-next-frontier-route-discovery-plan@1',
        'obligation_count':protocol['obligation_count'],
        'maximum_total_discovery_requests':protocol['maximum_total_discovery_requests'],
        'maximum_total_candidate_urls':protocol['maximum_total_candidate_urls'],
        'source_requests_executed':0,
        'automatic_source_admission':False,
        'automatic_field_classification':False,
        'outside_human_dependency':False,
        'obligations':protocol['obligations'],
    }
    if args.json: print(json.dumps(plan,indent=2))
    else:
        print(f"obligations={plan['obligation_count']} max_requests={plan['maximum_total_discovery_requests']} max_candidates={plan['maximum_total_candidate_urls']}")
    return 0
if __name__=='__main__': raise SystemExit(main())
